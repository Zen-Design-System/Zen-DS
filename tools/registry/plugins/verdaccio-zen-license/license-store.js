'use strict';

/**
 * Reads licenses and team members from the PocketBase backend (`zen-license-management`).
 *
 * The registry signs in as a record of a dedicated auth collection (`registry_clients`): the licenses
 * collection's viewRule lets it read one license by id (it cannot list them), the team_members listRule lets it
 * list a license's members (to count seats). A developer's own PocketBase token (from the browser sign-in) finds
 * the licenses they own or belong to. Nothing here writes.
 */

// PocketBase record ids: 15 lowercase alphanumerics. Checked before the id goes into a URL path.
const RECORD_ID = /^[a-z0-9]{15}$/;

class StoreError extends Error {}

function jwtExpiry(token) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

class PocketBaseLicenseStore {
  /**
   * @param {object} options
   * @param {string} options.url PocketBase base URL, no trailing `/api`.
   * @param {string} options.email Sign-in of the registry client record.
   * @param {string} options.password
   * @param {string} [options.clientCollection] Auth collection the client signs in to.
   * @param {string} [options.licensesCollection]
   * @param {string} [options.usersCollection] Auth collection developers sign in to.
   * @param {string} [options.membersCollection] Links users to licenses (`license`, `user`).
   * @param {{active?: string, type?: string, owner?: string, maxMembers?: string}} [options.fields] Field names on the licenses collection.
   * @param {number} [options.timeoutMs]
   * @param {typeof fetch} [options.fetch]
   */
  constructor(options) {
    if (!options.url || !options.email || !options.password) {
      throw new Error('zen-license: store url, email and password are required');
    }
    this.url = options.url.replace(/\/+$/, '');
    this.email = options.email;
    this.password = options.password;
    this.clientCollection = options.clientCollection || 'registry_clients';
    this.licensesCollection = options.licensesCollection || 'licenses';
    this.usersCollection = options.usersCollection || 'users';
    this.membersCollection = options.membersCollection || 'team_members';
    this.fields = { active: 'active', type: 'type', owner: 'owner', maxMembers: 'max_members', ...options.fields };
    this.timeoutMs = options.timeoutMs || 5000;
    this.fetch = options.fetch || globalThis.fetch;
    this.token = null;
    this.tokenExpiry = 0;
    this.signingIn = null;
  }

  async request(path, init = {}) {
    let res;
    try {
      res = await this.fetch(this.url + path, { ...init, signal: AbortSignal.timeout(this.timeoutMs) });
    } catch (err) {
      throw new StoreError(`license store unreachable: ${err.message}`);
    }
    return res;
  }

  async signIn() {
    const res = await this.request(
      `/api/collections/${encodeURIComponent(this.clientCollection)}/auth-with-password`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ identity: this.email, password: this.password }),
      },
    );
    if (!res.ok) throw new StoreError(`license store sign-in failed (${res.status})`);
    const { token } = await res.json();
    this.token = token;
    this.tokenExpiry = jwtExpiry(token);
  }

  async authToken(force = false) {
    // Renew a minute before expiry; concurrent callers share one sign-in.
    if (!force && this.token && Date.now() < this.tokenExpiry - 60_000) return this.token;
    this.signingIn ??= this.signIn().finally(() => {
      this.signingIn = null;
    });
    await this.signingIn;
    return this.token;
  }

  /** GET with the client token; signs in again once if the token was refused. */
  async authorizedGet(path) {
    let res = await this.request(path, { headers: { authorization: await this.authToken() } });
    if (res.status === 401 || res.status === 403) {
      res = await this.request(path, { headers: { authorization: await this.authToken(true) } });
    }
    return res;
  }

  toLicense(record) {
    const f = this.fields;
    return {
      id: record.id,
      active: record[f.active] === true,
      type: String(record[f.type] || ''),
      owner: String(record[f.owner] || ''),
      maxMembers: Number(record[f.maxMembers]) || 0,
    };
  }

  /**
   * @param {string} id License record id.
   * @returns {Promise<null | {id: string, active: boolean, type: string, owner: string, maxMembers: number}>} null when no such license exists.
   */
  async getLicense(id) {
    if (!RECORD_ID.test(id)) return null;
    const res = await this.authorizedGet(
      `/api/collections/${encodeURIComponent(this.licensesCollection)}/records/${id}`,
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new StoreError(`license store returned ${res.status}`);
    return this.toLicense(await res.json());
  }

  /**
   * User ids of a license's team members, oldest first (the order seats are given in).
   * @param {string} licenseId
   * @returns {Promise<string[]>}
   */
  async getMembers(licenseId) {
    if (!RECORD_ID.test(licenseId)) return [];
    const filter = encodeURIComponent(`license='${licenseId}'`);
    const res = await this.authorizedGet(
      `/api/collections/${encodeURIComponent(this.membersCollection)}/records?filter=${filter}&sort=created&perPage=500&fields=user`,
    );
    if (!res.ok) throw new StoreError(`license store returned ${res.status} for team members`);
    return (await res.json()).items.map((item) => String(item.user));
  }

  /** GET with a developer's own PocketBase token (never retried with the client token). */
  async userGet(userToken, path) {
    const res = await this.request(path, { headers: { authorization: userToken } });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) throw new StoreError(`license store returned ${res.status}`);
    return res.json();
  }

  /**
   * Checks a developer's PocketBase token (from the browser sign-in) and lists the licenses they own or belong to.
   * @param {string} userToken
   * @returns {Promise<null | {id: string, email: string, providers: string[], licenseIds: string[]}>} null when the token is not valid.
   */
  async getUser(userToken) {
    if (typeof userToken !== 'string' || !userToken) return null;
    const users = encodeURIComponent(this.usersCollection);
    let res = await this.request(`/api/collections/${users}/auth-refresh`, {
      method: 'POST',
      headers: { authorization: userToken },
    });
    if (res.status === 401 || res.status === 403 || res.status === 404) return null;
    if (!res.ok) throw new StoreError(`license store returned ${res.status} on sign-in check`);
    const { token, record } = await res.json();
    if (!record || !RECORD_ID.test(record.id)) return null;
    const owned = encodeURIComponent(`${this.fields.owner}='${record.id}'`);
    const member = encodeURIComponent(`user='${record.id}'`);
    const linked = encodeURIComponent(`recordRef='${record.id}'`);
    const [licenses, members, externalAuths] = await Promise.all([
      this.userGet(token, `/api/collections/${encodeURIComponent(this.licensesCollection)}/records?filter=${owned}&perPage=100&fields=id`),
      this.userGet(token, `/api/collections/${encodeURIComponent(this.membersCollection)}/records?filter=${member}&perPage=100&fields=license`),
      // The user's own linked sign-ins (Google, …): PocketBase lets an account list its own.
      this.userGet(token, `/api/collections/_externalAuths/records?filter=${linked}&perPage=20&fields=provider`),
    ]);
    const licenseIds = [
      ...(licenses?.items || []).map((item) => String(item.id)),
      ...(members?.items || []).map((item) => String(item.license)),
    ].filter((id, i, all) => RECORD_ID.test(id) && all.indexOf(id) === i);
    const providers = (externalAuths?.items || []).map((item) => String(item.provider));
    return { id: record.id, email: String(record.email || ''), providers, licenseIds };
  }
}

module.exports = { PocketBaseLicenseStore, StoreError, RECORD_ID };

'use strict';

/**
 * Reads licenses from the PocketBase backend (`zen-license-management`).
 *
 * The registry signs in as a record of a dedicated auth collection (`registry_clients`); the licenses
 * collection's viewRule lets that collection read one license by id (it cannot list). Nothing here writes.
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
   * @param {{active?: string, type?: string}} [options.fields] Field names on the licenses collection.
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
    this.fields = { active: 'active', type: 'type', ...options.fields };
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
    return { id: record.id, active: record[this.fields.active] === true, type: String(record[this.fields.type] || '') };
  }

  /**
   * @param {string} id License record id.
   * @returns {Promise<null | {id: string, active: boolean, type: string}>} null when no such license exists.
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
}

module.exports = { PocketBaseLicenseStore, StoreError };

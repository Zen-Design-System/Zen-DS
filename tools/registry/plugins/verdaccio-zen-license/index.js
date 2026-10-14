'use strict';

/**
 * verdaccio-zen-license — Verdaccio auth + middleware plugin for the licensed Zen DS packages.
 *
 * Access is per seat. A license (`licenses` in `zen-license-management`) has `max_members` seats: its owner and
 * its team members, oldest first. Two ways in:
 *
 * - Developers: `npm login` (npm's web login). It opens a Zen sign-in page (Google only: the account must have Google linked);
 *   the registry finds the license the person owns or belongs to and issues a token only if they hold a seat.
 * - CI: `npm login --auth-type=legacy` with the license key (the license record id) as password. At most
 *   `ci_tokens_per_license` such tokens stay active; one more retires the oldest, so the key is no shared login.
 *
 * Every package request re-checks the token's license, seat or CI slot (cached `cache_seconds`): deactivating a
 * license or removing a member cuts access within that window. If PocketBase is unreachable, the last known answer
 * serves for `stale_grace_seconds` more; after that, requests fail with 503. Requests are counted per license and
 * month (developers, CI tokens, IPs, installs) for `usage-report.js`.
 *
 * The publisher key (release CI) is checked against a SHA-256 hash from the environment. Nobody can sign up.
 * Denials are returned as errors, never as `false`: Verdaccio passes a `false` on to its built-in group check,
 * which would grant access by group alone.
 */

const crypto = require('node:crypto');
const path = require('node:path');
const { PocketBaseLicenseStore, StoreError, RECORD_ID } = require('./license-store');
const { CiTokens, Usage } = require('./state');
const { loginPage, loginAsset } = require('./login-page');

const CUSTOMER_GROUP = 'zen-customer';
const PUBLISHER_GROUP = 'zen-publisher';
// Markers carried in the token's groups, for the re-check on every request.
const LICENSE_GROUP = 'zen-license:';
const USER_GROUP = 'zen-user:';
const CI_GROUP = 'zen-ci:';
const MAX_CACHE_ENTRIES = 10_000;
const LOGIN_TTL_MS = 10 * 60_000;
const MAX_PENDING_LOGINS = 1000;
const LOGGED_IN_ROLES = ['$all', '$authenticated', '@all', '@authenticated', 'all'];

const DEVELOPER_HINT = 'developers sign in with `npm login`; CI signs in once with `npm login --auth-type=legacy` and the licence key';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.statusCode = status;
  err.expose = true;
  return err;
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function sameHash(a, b) {
  const x = Buffer.from(String(a), 'utf8');
  const y = Buffer.from(String(b), 'utf8');
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function isActive(license) {
  return Boolean(license && license.active === true);
}

const marker = (groups, prefix) => (groups.find((g) => g.startsWith(prefix)) || '').slice(prefix.length);
const randomId = () => crypto.randomBytes(24).toString('base64url');

class ZenLicensePlugin {
  /**
   * @param {object} options
   * @param {{getLicense(id: string): Promise<object | null>, getMembers?(id: string): Promise<string[]>, getUser?(token: string): Promise<object | null>}} options.store
   * @param {number} [options.cacheSeconds] How long a store answer is reused (default 300).
   * @param {number} [options.staleGraceSeconds] Extra time a cached answer serves while the store is down (default 3600).
   * @param {string} [options.publisherKeyHash] SHA-256 hex of the publisher key; empty disables publishing.
   * @param {CiTokens} [options.ciTokens] Active CI tokens per license; without it, key logins are refused.
   * @param {Usage} [options.usage] Usage counter; optional.
   * @param {string} [options.storeUrl] PocketBase URL the browser sign-in page talks to.
   * @param {string} [options.publicUrl] The registry's public URL (login links); else taken from the request.
   * @param {string} [options.requiredProvider] Developers must have this sign-in linked (default 'google'; '' for any).
   * @param {object} [options.logger]
   * @param {() => number} [options.now]
   */
  constructor(options) {
    this.store = options.store;
    this.cacheMs = (options.cacheSeconds ?? 300) * 1000;
    this.graceMs = (options.staleGraceSeconds ?? 3600) * 1000;
    this.publisherKeyHash = options.publisherKeyHash || '';
    this.ciTokens = options.ciTokens || null;
    this.usage = options.usage || null;
    this.storeUrl = options.storeUrl || '';
    this.publicUrl = options.publicUrl || '';
    this.requiredProvider = options.requiredProvider ?? 'google';
    this.logger = options.logger || console;
    this.now = options.now || Date.now;
    this.cache = new Map();
    this.inflight = new Map();
    this.logins = new Map(); // loginId → { doneId, created, token?, done? }
    this.done = new Map(); // doneId → loginId
  }

  /** A store answer through the cache; serves a stale answer while the store is down. */
  async cached(cacheKey, load) {
    const entry = this.cache.get(cacheKey);
    const age = entry ? this.now() - entry.at : Infinity;
    if (age < this.cacheMs) return entry.value;
    if (!this.inflight.has(cacheKey)) {
      const pending = load()
        .then((value) => {
          // Wrong-key guesses are cached too; keep the map bounded (Maps iterate oldest first).
          if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value);
          this.cache.delete(cacheKey);
          this.cache.set(cacheKey, { value, at: this.now() });
          return value;
        })
        .finally(() => this.inflight.delete(cacheKey));
      this.inflight.set(cacheKey, pending);
    }
    try {
      return await this.inflight.get(cacheKey);
    } catch (err) {
      if (entry && age < this.cacheMs + this.graceMs) {
        this.logger.warn({ key: cacheKey, err: err.message }, 'zen-license: store error, serving cached @{key}');
        return entry.value;
      }
      throw err;
    }
  }

  lookup(id) {
    return this.cached(`license:${id}`, () => this.store.getLicense(id));
  }

  /**
   * Whether the user holds a seat on the license: the owner first, then team members oldest first, up to max_members.
   * @returns {Promise<{ok: true, license: object} | {ok: false, reason: 'inactive' | 'no-seat' | 'not-member', license?: object}>}
   */
  async seat(licenseId, userId) {
    const license = await this.lookup(licenseId);
    if (!isActive(license)) return { ok: false, reason: 'inactive', license };
    const members = await this.cached(`members:${licenseId}`, () => this.store.getMembers(licenseId));
    const people = [license.owner, ...members].filter((id, i, all) => id && all.indexOf(id) === i);
    if (!people.includes(userId)) return { ok: false, reason: 'not-member', license };
    const holders = people.slice(0, Math.max(1, license.maxMembers || 0));
    return holders.includes(userId) ? { ok: true, license } : { ok: false, reason: 'no-seat', license };
  }

  isPublisher(password) {
    return Boolean(password && this.publisherKeyHash && sameHash(sha256(password), this.publisherKeyHash));
  }

  storeFailure(err) {
    this.logger.error({ err: err.message }, 'zen-license: @{err}');
    return err instanceof StoreError
      ? httpError(503, 'license service unavailable, try again shortly')
      : httpError(500, 'license check failed');
  }

  /** Basic auth on each request (`_auth`): the publisher only. Customers use a token from `npm login`. */
  authenticate(_user, password, cb) {
    if (this.isPublisher(password)) return cb(null, [PUBLISHER_GROUP]);
    cb(httpError(401, `sign in with a token: ${DEVELOPER_HINT}`));
  }

  /** Verdaccio's own sign-up: closed. `npm login` is answered by the routes in register_middlewares. */
  adduser(_user, _password, cb) {
    cb(httpError(409, `sign-up is closed: ${DEVELOPER_HINT}`));
  }

  /** Same rule as Verdaccio's own group check, but a denial is an error. */
  groupAllows(user, pkg, action, cb) {
    const allowed = (pkg[action] || []).some((g) => g === user.name || (user.groups || []).includes(g));
    if (allowed) return true;
    cb(
      user.name
        ? httpError(403, `${user.name} may not ${action} ${pkg.name}`)
        : httpError(401, `authorization required to ${action} ${pkg.name}`),
    );
    return false;
  }

  /** Customer tokens outlive licenses, seats and CI slots: re-check them on every request (cached). */
  async checkCustomer(groups) {
    const licenseId = marker(groups, LICENSE_GROUP);
    const userId = marker(groups, USER_GROUP);
    const ciId = marker(groups, CI_GROUP);
    if (!licenseId) return httpError(403, 'license not recognised');
    if (userId) {
      const seat = await this.seat(licenseId, userId);
      if (seat.ok) return null;
      if (seat.reason === 'inactive') return httpError(403, 'license is not active');
      if (seat.reason === 'not-member') return httpError(403, 'you are no longer a member of this licence: ask its owner');
      return httpError(403, `every seat of this licence is taken (${seat.license.maxMembers}): ask its owner`);
    }
    if (ciId) {
      if (!isActive(await this.lookup(licenseId))) return httpError(403, 'license is not active');
      if (this.ciTokens && this.ciTokens.has(licenseId, ciId)) return null;
      return httpError(403, 'this CI token was replaced by a newer one: run `npm login --auth-type=legacy` again');
    }
    return httpError(403, 'this token is from an older sign-in: run `npm login` again');
  }

  allow_access(user, pkg, cb) {
    if (!this.groupAllows(user, pkg, 'access', cb)) return;
    const groups = user.groups || [];
    if (!groups.includes(CUSTOMER_GROUP)) return cb(null, true);
    this.checkCustomer(groups).then(
      (err) => (err ? cb(err) : cb(null, true)),
      (err) => cb(this.storeFailure(err)),
    );
  }

  allow_publish(user, pkg, cb) {
    if (this.groupAllows(user, pkg, 'publish', cb)) cb(null, true);
  }

  allow_unpublish(user, pkg, cb) {
    const spec = pkg.unpublish ? pkg : { ...pkg, unpublish: pkg.publish };
    if (this.groupAllows(user, spec, 'unpublish', cb)) cb(null, true);
  }

  /**
   * `npm login --auth-type=legacy`: the license key gives a CI token (or the publisher key a publisher token).
   * @returns {Promise<{groups: string[], name: string} | Error>}
   */
  async keyLogin(name, password) {
    if (this.isPublisher(password)) return { groups: [PUBLISHER_GROUP], name: 'zen-publisher' };
    const key = String(password || '');
    const license = RECORD_ID.test(key) ? await this.lookup(key) : null;
    if (!isActive(license)) {
      return httpError(401, `invalid or inactive licence key (${DEVELOPER_HINT})`);
    }
    if (!this.ciTokens) return httpError(503, 'CI sign-in is not configured');
    const { id, retired } = this.ciTokens.issue(license.id, name);
    if (retired.length) this.logger.info({ license: license.id, n: retired.length }, 'zen-license: @{n} CI token(s) of @{license} retired');
    return { groups: [CUSTOMER_GROUP, LICENSE_GROUP + license.id, CI_GROUP + id], name: `ci-${String(name || 'token').slice(0, 40)}` };
  }

  /**
   * The browser sign-in: a developer's PocketBase token → the seat they hold.
   * @returns {Promise<{groups: string[], name: string, license: object} | Error>}
   */
  async developerLogin(userToken) {
    const user = await this.store.getUser(userToken);
    if (!user) return httpError(401, 'sign-in failed: try again');
    if (this.requiredProvider && !user.providers?.includes(this.requiredProvider)) {
      return httpError(403, `sign in with ${this.requiredProvider === 'google' ? 'Google' : this.requiredProvider}: this account has no ${this.requiredProvider} sign-in linked`);
    }
    if (!user.licenseIds.length) return httpError(403, 'this account has no Zen DS licence: ask your licence owner to add you to the team');
    let refusal = null;
    for (const licenseId of user.licenseIds) {
      const seat = await this.seat(licenseId, user.id);
      if (seat.ok) {
        return {
          groups: [CUSTOMER_GROUP, LICENSE_GROUP + licenseId, USER_GROUP + user.id],
          name: user.email || user.id,
          license: seat.license,
        };
      }
      refusal ??= seat;
    }
    if (refusal.reason === 'inactive') return httpError(403, 'your licence is not active');
    return httpError(403, `every seat of your licence is taken (${refusal.license.maxMembers}): ask its owner to free one`);
  }

  /** Counts a customer's successful GET (installs = tarballs) per license and month. */
  recordUsage(req, res) {
    const groups = req.remote_user?.groups || [];
    if (!this.usage || req.method !== 'GET' || res.statusCode >= 400 || !groups.includes(CUSTOMER_GROUP)) return;
    // Caddy appends the client address last; the registry listens on loopback only, behind it.
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map((s) => s.trim()).filter(Boolean);
    this.usage.record({
      licenseId: marker(groups, LICENSE_GROUP),
      userId: marker(groups, USER_GROUP) || undefined,
      ciId: marker(groups, CI_GROUP) || undefined,
      ip: forwarded.at(-1) || req.socket?.remoteAddress,
      tarball: /\.tgz$/.test(req.path || ''),
    });
  }

  expireLogins() {
    const cutoff = this.now() - LOGIN_TTL_MS;
    for (const [loginId, login] of this.logins) {
      if (login.created < cutoff) {
        this.logins.delete(loginId);
        this.done.delete(login.doneId);
      }
    }
  }

  /** Verdaccio middleware entry: `npm login` (web and legacy) and the usage counter. */
  register_middlewares(app, auth) {
    const signOptions = auth.config?.security?.api?.jwt?.sign || { expiresIn: '365d' };
    // As Verdaccio's createRemoteUser: a Bearer token's groups are used as signed, so they carry the logged-in roles.
    const sign = (name, groups) => auth.jwtEncrypt({ name, groups: [...groups, ...LOGGED_IN_ROLES], real_groups: groups }, signOptions);
    const base = (req) => (this.publicUrl || `${req.protocol}://${req.get('host')}/`).replace(/\/*$/, '/');
    const fail = (next) => (err) => next(err instanceof Error && err.status ? err : this.storeFailure(err));

    app.use((req, res, next) => {
      res.on('finish', () => this.recordUsage(req, res));
      next();
    });

    // npm login --auth-type=legacy (PUT /-/user/org.couchdb.user:<name>[/-rev/…])
    app.put(/^\/-\/user\/org\.couchdb\.user:([^/]+)/, (req, res, next) => {
      const { name, password } = req.body || {};
      this.keyLogin(name, password).then(async (result) => {
        if (result instanceof Error) return next(result);
        res.status(201).json({ ok: `you are authenticated as '${result.name}'`, token: await sign(result.name, result.groups) });
      }, fail(next));
    });

    // npm login (web): npm posts here, opens loginUrl in the browser and polls doneUrl.
    app.post('/-/v1/login', (req, res, next) => {
      this.expireLogins();
      if (this.logins.size >= MAX_PENDING_LOGINS) return next(httpError(429, 'too many sign-ins in progress, try again shortly'));
      const loginId = randomId();
      const doneId = randomId();
      this.logins.set(loginId, { doneId, created: this.now() });
      this.done.set(doneId, loginId);
      res.status(200).json({ loginUrl: `${base(req)}-/zen/login/${loginId}`, doneUrl: `${base(req)}-/zen/done/${doneId}` });
    });

    app.get('/-/zen/done/:doneId', (req, res, next) => {
      this.expireLogins();
      const loginId = this.done.get(req.params.doneId);
      const login = loginId && this.logins.get(loginId);
      if (!login) return next(httpError(404, 'sign-in expired: run `npm login` again'));
      if (!login.token) return res.status(202).set('retry-after', '2').json({});
      this.logins.delete(loginId);
      this.done.delete(req.params.doneId);
      res.status(200).json({ token: login.token });
    });

    app.get('/-/zen/static/:file', (req, res, next) => {
      const asset = loginAsset(req.params.file);
      if (!asset) return next(httpError(404, 'not found'));
      res.status(200).set('content-type', asset.type).set('cache-control', 'public, max-age=86400').send(asset.body);
    });

    app.get('/-/zen/login/:loginId', (req, res) => {
      this.expireLogins();
      const login = this.logins.get(req.params.loginId);
      res
        .status(login ? 200 : 404)
        .set('content-type', 'text/html; charset=utf-8')
        .set('cache-control', 'no-store')
        .set('referrer-policy', 'no-referrer')
        .send(loginPage({ storeUrl: this.storeUrl, expired: !login || Boolean(login.token) }));
    });

    app.post('/-/zen/login/:loginId', (req, res, next) => {
      this.expireLogins();
      const login = this.logins.get(req.params.loginId);
      if (!login) return next(httpError(404, 'sign-in expired: run `npm login` again'));
      if (login.token) return next(httpError(409, 'this sign-in is already complete'));
      this.developerLogin(req.body?.token).then(async (result) => {
        if (result instanceof Error) return next(result);
        login.token = await sign(result.name, result.groups);
        res.status(200).json({ ok: true, name: result.name, license: result.license.type });
      }, fail(next));
    });
  }
}

let current = null;

/**
 * Verdaccio entry point, as both the auth plugin and the middleware plugin (one shared instance). config.yaml:
 *
 *   auth:
 *     zen-license:
 *       store_url: https://…pocketbasecloud.com
 *       cache_seconds: 300
 *       ci_tokens_per_license: 3
 *   middlewares:
 *     zen-license:
 *       enabled: true
 *
 * Secrets come from the environment: ZEN_LICENSE_STORE_EMAIL, ZEN_LICENSE_STORE_PASSWORD,
 * ZEN_PUBLISHER_KEY_HASH (ZEN_LICENSE_STORE_URL overrides store_url, ZEN_LICENSE_CACHE_SECONDS cache_seconds).
 * State files (CI tokens, usage) go to `state_dir`, by default the folder that holds Verdaccio's storage.
 */
function zenLicense(config, options = {}) {
  if (!config?.store_url && current) return current; // the middlewares entry: reuse the auth plugin
  const env = process.env;
  const storeUrl = env.ZEN_LICENSE_STORE_URL || config.store_url;
  const store = new PocketBaseLicenseStore({
    url: storeUrl,
    email: env.ZEN_LICENSE_STORE_EMAIL,
    password: env.ZEN_LICENSE_STORE_PASSWORD,
    clientCollection: config.client_collection,
    licensesCollection: config.licenses_collection,
    usersCollection: config.users_collection,
    membersCollection: config.members_collection,
    fields: config.fields,
  });
  const storage = options.config?.storage;
  const stateDir = config.state_dir || (storage ? path.dirname(path.resolve(storage)) : null);
  current = new ZenLicensePlugin({
    store,
    cacheSeconds: env.ZEN_LICENSE_CACHE_SECONDS ? Number(env.ZEN_LICENSE_CACHE_SECONDS) : config.cache_seconds,
    staleGraceSeconds: config.stale_grace_seconds,
    publisherKeyHash: env.ZEN_PUBLISHER_KEY_HASH,
    ciTokens: stateDir ? new CiTokens(path.join(stateDir, 'zen-ci-tokens.json'), config.ci_tokens_per_license ?? 3) : null,
    usage: stateDir ? new Usage(path.join(stateDir, 'zen-usage.json'), { flushMs: (config.usage_flush_seconds ?? 30) * 1000 }) : null,
    storeUrl: storeUrl.replace(/\/+$/, ''),
    requiredProvider: config.sign_in_provider,
    publicUrl: env.VERDACCIO_PUBLIC_URL,
    logger: options.logger,
  });
  return current;
}

module.exports = zenLicense;
module.exports.ZenLicensePlugin = ZenLicensePlugin;
module.exports.sha256 = sha256;

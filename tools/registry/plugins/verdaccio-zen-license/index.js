'use strict';

/**
 * verdaccio-zen-license — Verdaccio auth plugin for the licensed Zen DS packages.
 *
 * - A customer needs only the license key: the id of their record in the `licenses` collection of
 *   `zen-license-management`, copied from the license server (one per company). They `npm login` once with
 *   any username and the key as password. The license must have `active` set; any type (business, pro).
 * - Every package request re-checks the license (cached `cache_seconds`), so revoking a license cuts off
 *   tokens already issued within that window, without waiting for the token to expire.
 * - If PocketBase is unreachable, the last known answer is used for `stale_grace_seconds` more, so a store
 *   outage does not break customers' CI; after that, requests fail with 503.
 * - The publisher key (CI) is checked against a SHA-256 hash from the environment.
 * - Nobody can sign up: accounts come only from the license store.
 *
 * Denials are returned as errors, never as `false`: Verdaccio passes a `false` on to its built-in group
 * check, which would grant access by group alone.
 */

const crypto = require('node:crypto');
const { PocketBaseLicenseStore, StoreError } = require('./license-store');

const CUSTOMER_GROUP = 'zen-customer';
const PUBLISHER_GROUP = 'zen-publisher';
// Carries the license id in the user's groups (also inside tokens from `npm login`), for the re-check.
const LICENSE_GROUP = 'zen-license:';
const MAX_CACHE_ENTRIES = 10_000;

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

class ZenLicensePlugin {
  /**
   * @param {object} options
   * @param {{getLicense(id: string): Promise<{id: string, active: boolean} | null>}} options.store
   * @param {number} [options.cacheSeconds] How long a license answer is reused (default 300).
   * @param {number} [options.staleGraceSeconds] Extra time a cached answer serves while the store is down (default 3600).
   * @param {string} [options.publisherKeyHash] SHA-256 hex of the publisher key; empty disables publishing.
   * @param {object} [options.logger]
   * @param {() => number} [options.now]
   */
  constructor(options) {
    this.store = options.store;
    this.cacheMs = (options.cacheSeconds ?? 300) * 1000;
    this.graceMs = (options.staleGraceSeconds ?? 3600) * 1000;
    this.publisherKeyHash = options.publisherKeyHash || '';
    this.logger = options.logger || console;
    this.now = options.now || Date.now;
    this.cache = new Map();
    this.inflight = new Map();
  }

  /** License by id, through the cache; serves a stale answer while the store is down. */
  async lookup(id) {
    const cacheKey = id;
    const entry = this.cache.get(cacheKey);
    const age = entry ? this.now() - entry.at : Infinity;
    if (age < this.cacheMs) return entry.license;
    if (!this.inflight.has(cacheKey)) {
      const pending = this.store
        .getLicense(id)
        .then((license) => {
          // Wrong-key guesses are cached too; keep the map bounded (Maps iterate oldest first).
          if (this.cache.size >= MAX_CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value);
          this.cache.delete(cacheKey);
          this.cache.set(cacheKey, { license, at: this.now() });
          return license;
        })
        .finally(() => this.inflight.delete(cacheKey));
      this.inflight.set(cacheKey, pending);
    }
    try {
      return await this.inflight.get(cacheKey);
    } catch (err) {
      if (entry && age < this.cacheMs + this.graceMs) {
        this.logger.warn({ key: cacheKey, err: err.message }, 'zen-license: store error, serving cached @{key}');
        return entry.license;
      }
      throw err;
    }
  }

  /** Resolves the groups for a valid key, or null. The username is ignored. */
  async check(_user, password) {
    if (!password) return null;
    if (this.publisherKeyHash && sameHash(sha256(password), this.publisherKeyHash)) return [PUBLISHER_GROUP];
    const license = await this.lookup(password);
    return isActive(license) ? [CUSTOMER_GROUP, LICENSE_GROUP + license.id] : null;
  }

  storeFailure(err) {
    this.logger.error({ err: err.message }, 'zen-license: @{err}');
    return err instanceof StoreError
      ? httpError(503, 'license service unavailable, try again shortly')
      : httpError(500, 'license check failed');
  }

  authenticate(user, password, cb) {
    this.check(user, password).then(
      (groups) => (groups ? cb(null, groups) : cb(httpError(401, 'invalid or inactive license key'))),
      (err) => cb(this.storeFailure(err)),
    );
  }

  /** `npm login` / `npm adduser`: accepted only for existing, valid credentials (no sign-up). */
  adduser(user, password, cb) {
    this.check(user, password).then(
      (groups) => (groups ? cb(null, true) : cb(httpError(409, 'sign-up is closed: use your license key'))),
      (err) => cb(this.storeFailure(err)),
    );
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

  allow_access(user, pkg, cb) {
    if (!this.groupAllows(user, pkg, 'access', cb)) return;
    const groups = user.groups || [];
    if (!groups.includes(CUSTOMER_GROUP)) return cb(null, true);
    // Tokens from `npm login` outlive licenses: re-check the license on every request (cached).
    const id = (groups.find((g) => g.startsWith(LICENSE_GROUP)) || '').slice(LICENSE_GROUP.length);
    if (!id) return cb(httpError(403, 'license not recognised'));
    this.lookup(id).then(
      (license) => (isActive(license) ? cb(null, true) : cb(httpError(403, 'license is not active'))),
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
}

/**
 * Verdaccio entry point. config.yaml:
 *
 *   auth:
 *     zen-license:
 *       store_url: https://…pocketbasecloud.com
 *       cache_seconds: 300
 *
 * Secrets come from the environment: ZEN_LICENSE_STORE_EMAIL, ZEN_LICENSE_STORE_PASSWORD,
 * ZEN_PUBLISHER_KEY_HASH (ZEN_LICENSE_STORE_URL overrides store_url, ZEN_LICENSE_CACHE_SECONDS cache_seconds).
 */
function zenLicense(config, options = {}) {
  const env = process.env;
  const store = new PocketBaseLicenseStore({
    url: env.ZEN_LICENSE_STORE_URL || config.store_url,
    email: env.ZEN_LICENSE_STORE_EMAIL,
    password: env.ZEN_LICENSE_STORE_PASSWORD,
    clientCollection: config.client_collection,
    licensesCollection: config.licenses_collection,
    fields: config.fields,
  });
  return new ZenLicensePlugin({
    store,
    cacheSeconds: env.ZEN_LICENSE_CACHE_SECONDS ? Number(env.ZEN_LICENSE_CACHE_SECONDS) : config.cache_seconds,
    staleGraceSeconds: config.stale_grace_seconds,
    publisherKeyHash: env.ZEN_PUBLISHER_KEY_HASH,
    logger: options.logger,
  });
}

module.exports = zenLicense;
module.exports.ZenLicensePlugin = ZenLicensePlugin;
module.exports.sha256 = sha256;

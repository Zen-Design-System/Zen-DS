'use strict';

/**
 * Small JSON files the plugin keeps next to Verdaccio's storage (the backed-up volume):
 *
 * - `zen-ci-tokens.json`: the CI tokens issued per license from the company key (`npm login --auth-type=legacy`).
 *   At most `limit` stay active per license; issuing one more retires the oldest.
 * - `zen-usage.json`: per month and license, the requests and installs, and who made them (developer ids,
 *   CI token ids, client IPs). Read by `usage-report.js`.
 *
 * One Verdaccio process owns the files; writes go through a temp file and a rename.
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_IPS = 200; // per license and month: enough to spot a shared key, bounded for a scraper

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 1));
  fs.renameSync(tmp, file);
}

class CiTokens {
  /**
   * @param {string} file
   * @param {number} limit Active CI tokens per license.
   * @param {() => number} [now]
   */
  constructor(file, limit, now = Date.now) {
    this.file = file;
    this.limit = Math.max(1, limit);
    this.now = now;
    this.byLicense = readJson(file, {});
  }

  /** A new token id for the license; retires the oldest beyond the limit. */
  issue(licenseId, name) {
    const id = crypto.randomBytes(9).toString('base64url');
    const list = (this.byLicense[licenseId] ||= []);
    list.push({ id, name: String(name || '').slice(0, 64), issued: new Date(this.now()).toISOString() });
    const retired = list.splice(0, Math.max(0, list.length - this.limit));
    writeJson(this.file, this.byLicense);
    return { id, retired: retired.map((t) => t.id) };
  }

  has(licenseId, id) {
    return (this.byLicense[licenseId] || []).some((t) => t.id === id);
  }

  list(licenseId) {
    return [...(this.byLicense[licenseId] || [])];
  }
}

class Usage {
  /**
   * @param {string} file
   * @param {{now?: () => number, flushMs?: number}} [options]
   */
  constructor(file, { now = Date.now, flushMs = 30_000 } = {}) {
    this.file = file;
    this.now = now;
    this.data = readJson(file, {});
    this.dirty = false;
    if (flushMs > 0) {
      this.timer = setInterval(() => this.flush(), flushMs);
      this.timer.unref();
      process.once('exit', () => this.flush());
    }
  }

  /**
   * @param {{licenseId: string, userId?: string, ciId?: string, ip?: string, tarball?: boolean}} hit
   */
  record({ licenseId, userId, ciId, ip, tarball }) {
    const d = new Date(this.now());
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const byLicense = (this.data[month] ||= {});
    const u = (byLicense[licenseId] ||= { requests: 0, installs: 0, users: {}, ci: {}, ips: {} });
    u.requests += 1;
    if (tarball) u.installs += 1;
    if (userId) u.users[userId] = (u.users[userId] || 0) + 1;
    if (ciId) u.ci[ciId] = (u.ci[ciId] || 0) + 1;
    if (ip && (ip in u.ips || Object.keys(u.ips).length < MAX_IPS)) u.ips[ip] = (u.ips[ip] || 0) + 1;
    u.last = d.toISOString();
    this.dirty = true;
  }

  flush() {
    if (!this.dirty) return;
    try {
      writeJson(this.file, this.data);
      this.dirty = false;
    } catch {
      // Kept in memory; the next flush tries again.
    }
  }
}

module.exports = { CiTokens, Usage, readJson };

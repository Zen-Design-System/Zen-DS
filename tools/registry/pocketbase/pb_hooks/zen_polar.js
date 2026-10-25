'use strict';

/**
 * Phase 6: Polar payments → licences in `zen-license-management`. Runs inside PocketBase as a JS hook module
 * (`zen_polar.pb.js` wires the route and the users hooks to it); the pure parts also run in Node for the tests.
 *
 * Polar is the merchant of record and sends signed webhooks for every subscription change. Each
 * `subscription.*` event carries the whole subscription, so every event is handled the same way: the
 * subscription's state is copied onto one row of `billing_subscriptions` (created here, superuser-only) and onto
 * the licence that row points to. A licence is created the first time an entitled subscription has an owner:
 *   1. `metadata.reference_id` (a checkout link opened with `?reference_id=<users id>`) or the Polar customer's
 *      `external_id`, when that user exists;
 *   2. else the Zen account whose verified email is the Polar customer's email;
 *   3. else the row waits, and the licence is created when that email signs up and is verified.
 * The licence's terms come from the product's metadata in Polar: `zen_type` (business | pro), `zen_max_members`
 * (or the subscription's seats), `zen_credits`, optional `zen_reset_day`. `active` follows the status: active,
 * trialing and past_due (Polar's payment retries, at most 21 days) keep access; Polar revokes after that, and a
 * cancellation keeps access until the period ends because the status stays active until then.
 */

const COLLECTION = 'billing_subscriptions';
const ENTITLED = ['active', 'trialing', 'past_due'];
const TOLERANCE_SECONDS = 300;
const MAX_BODY_BYTES = 1 << 20;
const RECORD_ID = /^[a-z0-9]{15}$/;

// ---------------------------------------------------------------------------------------------------------------
// Bytes. PocketBase's $security.hs256 takes its key as a string, but a Standard Webhooks key is binary, so the
// HMAC is done here on byte arrays (plain arrays of 0–255).

function utf8(str) {
  const out = [];
  for (let i = 0; i < str.length; i += 1) {
    let c = str.charCodeAt(i);
    if (c >= 0xd800 && c < 0xdc00 && i + 1 < str.length) {
      const d = str.charCodeAt(i + 1);
      if (d >= 0xdc00 && d < 0xe000) {
        c = 0x10000 + ((c - 0xd800) << 10) + (d - 0xdc00);
        i += 1;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] || 0) << 8) | (bytes[i + 2] || 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? B64[n & 63] : '=';
  }
  return out;
}

function fromBase64(str) {
  const clean = str.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/]/g, '');
  const out = [];
  let buf = 0;
  let bits = 0;
  for (let i = 0; i < clean.length; i += 1) {
    buf = (buf << 6) | B64.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 255);
      buf &= (1 << bits) - 1;
    }
  }
  return out;
}

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const rotr = (x, n) => (x >>> n) | (x << (32 - n));

/** SHA-256 (FIPS 180-4) of a byte array. */
function sha256(bytes) {
  const n = bytes.length;
  const m = new Array((Math.floor((n + 8) / 64) + 1) * 64).fill(0);
  for (let i = 0; i < n; i += 1) m[i] = bytes[i];
  m[n] = 0x80;
  const hi = Math.floor(n / 0x20000000);
  const lo = (n * 8) >>> 0;
  for (let i = 0; i < 4; i += 1) {
    m[m.length - 8 + i] = (hi >>> (24 - 8 * i)) & 255;
    m[m.length - 4 + i] = (lo >>> (24 - 8 * i)) & 255;
  }
  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array(64);
  for (let off = 0; off < m.length; off += 64) {
    for (let i = 0; i < 16; i += 1) {
      const j = off + 4 * i;
      w[i] = (m[j] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, k] = h;
    for (let i = 0; i < 64; i += 1) {
      const t1 = (k + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      k = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, k].forEach((v, i) => { h[i] = (h[i] + v) | 0; });
  }
  const out = [];
  h.forEach((v) => out.push((v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255));
  return out;
}

function hmacSha256(key, message) {
  const k = key.length > 64 ? sha256(key) : key;
  const inner = [];
  const outer = [];
  for (let i = 0; i < 64; i += 1) {
    inner.push((k[i] || 0) ^ 0x36);
    outer.push((k[i] || 0) ^ 0x5c);
  }
  return sha256(outer.concat(sha256(inner.concat(message))));
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Pure: signature, terms, ordering.

/**
 * HMAC keys for a Polar webhook secret: a `whsec_…` secret made on or after 2026-09-08 is Standard Webhooks (the
 * key is the base64 after the prefix); an older one is Polar HMAC (the key is the whole string's UTF-8 bytes).
 * Both are tried, as Polar's SDKs do.
 */
function signingKeys(secret) {
  const keys = [utf8(secret)];
  if (secret.indexOf('whsec_') === 0) keys.unshift(fromBase64(secret.slice(6)));
  return keys;
}

/**
 * Checks a delivery (Standard Webhooks: `webhook-id`, `webhook-timestamp`, `webhook-signature` = space-separated
 * `v1,<base64>`). Returns '' when one signature matches and the timestamp is within 5 minutes, else the reason.
 */
function verify(headers, body, secret, nowSeconds) {
  const id = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const signature = headers['webhook-signature'];
  if (!id || !timestamp || !signature) return 'missing webhook-id, webhook-timestamp or webhook-signature';
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(nowSeconds - seconds) > TOLERANCE_SECONDS) {
    return 'webhook-timestamp is more than 5 minutes off';
  }
  const signed = utf8(`${id}.${timestamp}.${body}`);
  const given = signature.split(' ').filter((s) => s.indexOf('v1,') === 0).map((s) => s.slice(3));
  for (const key of signingKeys(secret)) {
    const expected = toBase64(hmacSha256(key, signed));
    if (given.some((g) => sameString(g, expected))) return '';
  }
  return 'signature does not match POLAR_WEBHOOK_SECRET';
}

function toInt(value) {
  const n = typeof value === 'number' ? value : parseInt(String(value || ''), 10);
  return Number.isFinite(n) ? Math.floor(n) : 0;
}

/** A sortable key for an ISO-8601 UTC time, whatever its fraction length ('' when it is not one). */
function stamp(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/.exec(String(iso || ''));
  return m ? m.slice(1, 7).join('') + (m[7] || '').padEnd(9, '0').slice(0, 9) : '';
}

const entitled = (status) => ENTITLED.indexOf(status) !== -1;

/**
 * The licence terms a subscription grants, from its product's metadata: `{ terms }` or `{ problem }` (a product
 * set up without the zen_* metadata; the licence then keeps its terms and only `active` follows).
 */
function termsOf(sub) {
  const product = sub.product || {};
  const meta = product.metadata || {};
  const where = `Polar product "${product.name || sub.product_id}"`;
  const type = String(meta.zen_type || '');
  if (type !== 'business' && type !== 'pro') return { problem: `${where}: metadata zen_type must be business or pro` };
  const maxMembers = toInt(sub.seats) > 0 ? toInt(sub.seats) : toInt(meta.zen_max_members);
  if (maxMembers < 1) return { problem: `${where}: metadata zen_max_members must be 1 or more (or sell seats)` };
  const credits = toInt(meta.zen_credits);
  if (credits < 1) return { problem: `${where}: metadata zen_credits must be 1 or more` };
  const purchase = sub.started_at || sub.created_at;
  const day = toInt(meta.zen_reset_day) || toInt(stamp(purchase).slice(6, 8)) || 1;
  return {
    terms: {
      type,
      max_members: maxMembers,
      credits_total: credits,
      reset_day: Math.min(Math.max(day, 1), 28),
      purchase_date: purchase,
    },
  };
}

/** Who should own the licence: a users id the checkout carried, and the customer's email. */
function ownerHints(sub) {
  const customer = sub.customer || {};
  const ref = String((sub.metadata && sub.metadata.reference_id) || customer.external_id || '');
  return { userId: RECORD_ID.test(ref) ? ref : '', email: String(customer.email || '').trim().toLowerCase() };
}

// ---------------------------------------------------------------------------------------------------------------
// PocketBase (only called inside the hooks).

/** Creates `billing_subscriptions` once (all rules null: superusers and these hooks only). */
function ensureCollection(app) {
  try {
    app.findCollectionByNameOrId(COLLECTION);
    return false;
  } catch (_) {}
  app.save(new Collection({
    type: 'base',
    name: COLLECTION,
    listRule: null,
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
    fields: [
      { name: 'polar_subscription_id', type: 'text', required: true },
      { name: 'status', type: 'text' },
      { name: 'customer_email', type: 'text' },
      { name: 'reference', type: 'text' },
      { name: 'product_id', type: 'text' },
      { name: 'terms', type: 'text' }, // JSON of termsOf(): what a pending row grants when its owner signs up
      { name: 'license', type: 'text' },
      { name: 'user', type: 'text' },
      { name: 'problem', type: 'text' },
      { name: 'polar_modified_at', type: 'text' },
      { name: 'created', type: 'autodate', onCreate: true },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ],
    indexes: [
      `CREATE UNIQUE INDEX idx_billing_polar_subscription ON ${COLLECTION} (polar_subscription_id)`,
      `CREATE INDEX idx_billing_pending ON ${COLLECTION} (customer_email, license)`,
    ],
  }));
  return true;
}

function findOrNull(fn) {
  try {
    return fn();
  } catch (_) {
    return null;
  }
}

function findOwner(app, hints) {
  const byId = hints.userId && findOrNull(() => app.findRecordById('users', hints.userId));
  if (byId) return byId;
  const byEmail = hints.email && findOrNull(() => app.findAuthRecordByEmail('users', hints.email));
  return byEmail && byEmail.verified() ? byEmail : null;
}

function createLicence(app, ownerId, terms, active) {
  const licence = new Record(app.findCollectionByNameOrId('licenses'));
  licence.set('owner', ownerId);
  licence.set('type', terms.type);
  licence.set('max_members', terms.max_members);
  licence.set('credits_total', terms.credits_total);
  licence.set('credits_used', 0);
  licence.set('reset_day', terms.reset_day);
  licence.set('purchase_date', terms.purchase_date);
  licence.set('active', active);
  app.save(licence);
  return licence;
}

/**
 * Applies one subscription (a webhook's `data`). Returns what happened: `{ license, pending, problem, stale }`.
 * Idempotent: a redelivery or an older event (by `modified_at`) changes nothing.
 */
function sync(app, sub) {
  ensureCollection(app);
  let result = {};
  app.runInTransaction((tx) => {
    let row = findOrNull(() => tx.findFirstRecordByData(COLLECTION, 'polar_subscription_id', sub.id));
    const modified = sub.modified_at || sub.created_at;
    if (row && stamp(modified) < stamp(row.getString('polar_modified_at'))) {
      result = { stale: true, license: row.getString('license') };
      return;
    }
    if (!row) {
      row = new Record(tx.findCollectionByNameOrId(COLLECTION));
      row.set('polar_subscription_id', sub.id);
    }
    const hints = ownerHints(sub);
    const { terms, problem } = termsOf(sub);
    const active = entitled(sub.status);
    row.set('status', sub.status);
    row.set('customer_email', hints.email);
    row.set('reference', hints.userId);
    row.set('product_id', sub.product_id || '');
    row.set('polar_modified_at', modified || '');
    row.set('problem', problem || '');
    if (terms) row.set('terms', JSON.stringify(terms));

    let licence = row.getString('license') && findOrNull(() => tx.findRecordById('licenses', row.getString('license')));
    if (licence) {
      if (terms) {
        licence.set('type', terms.type);
        licence.set('max_members', terms.max_members);
        licence.set('credits_total', terms.credits_total);
      }
      licence.set('active', active);
      tx.save(licence);
    } else if (terms && active) {
      const owner = findOwner(tx, hints);
      if (owner) {
        licence = createLicence(tx, owner.id, terms, true);
        row.set('user', owner.id);
      }
    }
    row.set('license', licence ? licence.id : '');
    tx.save(row);
    result = { license: licence ? licence.id : '', active: licence ? active : false, pending: !licence && !!terms && active };
    if (problem) result.problem = problem;
  });
  return result;
}

/** Gives a verified user the licences of the paid subscriptions that waited for their email. Returns their ids. */
function claim(app, user) {
  if (!user.verified() || !user.email()) return [];
  const rows = findOrNull(() => app.findRecordsByFilter(
    COLLECTION, "license = '' && customer_email = {:email}", 'created', 0, 0, { email: user.email().toLowerCase() },
  )) || [];
  const created = [];
  for (const row of rows) {
    if (!entitled(row.getString('status')) || !row.getString('terms')) continue;
    app.runInTransaction((tx) => {
      const licence = createLicence(tx, user.id, JSON.parse(row.getString('terms')), true);
      row.set('license', licence.id);
      row.set('user', user.id);
      tx.save(row);
      created.push(licence.id);
    });
  }
  return created;
}

/** POST /api/zen/billing/polar. */
function handleWebhook(e) {
  const secret = $os.getenv('POLAR_WEBHOOK_SECRET');
  if (!secret) return e.json(503, { message: 'POLAR_WEBHOOK_SECRET is not set on this instance' });
  const body = toString(e.request.body, MAX_BODY_BYTES);
  const header = (name) => e.request.header.get(name);
  const refused = verify(
    { 'webhook-id': header('webhook-id'), 'webhook-timestamp': header('webhook-timestamp'), 'webhook-signature': header('webhook-signature') },
    body, secret, Math.floor(Date.now() / 1000),
  );
  if (refused) {
    e.app.logger().warn('polar webhook refused', 'reason', refused);
    return e.json(401, { message: refused });
  }
  let event;
  try {
    event = JSON.parse(body);
  } catch (_) {
    return e.json(400, { message: 'body is not JSON' });
  }
  const type = String((event && event.type) || '');
  if (type.indexOf('subscription.') !== 0 || !event.data || !event.data.id) return e.json(202, { ignored: type });
  const result = sync(e.app, event.data);
  const log = e.app.logger();
  (result.problem ? log.error : log.info).call(log, 'polar webhook', 'type', type, 'subscription', event.data.id,
    'status', event.data.status, 'license', result.license || '', 'pending', !!result.pending, 'problem', result.problem || '');
  return e.json(200, result);
}

module.exports = {
  COLLECTION, utf8, toBase64, fromBase64, sha256, hmacSha256, signingKeys, verify, stamp, entitled, termsOf, ownerHints,
  ensureCollection, sync, claim, handleWebhook,
};

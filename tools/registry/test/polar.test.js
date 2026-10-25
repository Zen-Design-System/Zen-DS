'use strict';

// Phase 6, Polar webhook (pocketbase/pb_hooks): the pure parts in Node, then the hook in a real PocketBase with
// the live licence schema (fixture migrations), fed signed Standard Webhooks deliveries as Polar sends them.
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const polar = require('../pocketbase/pb_hooks/zen_polar.js');

const ROOT = path.join(__dirname, '..');
const TMP = path.join(ROOT, '.test-tmp', `polar-${process.pid}`);
const SU = { email: 'su@test.local', password: 'su-password-123' };
const SECRET = `whsec_${crypto.randomBytes(32).toString('base64')}`;
const PRO = { zen_type: 'pro', zen_max_members: '5', zen_credits: '100' };
const BUSINESS = { zen_type: 'business', zen_max_members: 10, zen_credits: 500, zen_reset_day: '15' };

const bytes = (buf) => Array.from(buf);
const now = () => Math.floor(Date.now() / 1000);

/** Signs like Polar: Standard Webhooks with the key after `whsec_` (or `legacy`: the whole string's UTF-8). */
function sign(body, { secret = SECRET, legacy = false, id = crypto.randomUUID(), timestamp = now() } = {}) {
  const key = legacy ? Buffer.from(secret, 'utf8') : Buffer.from(secret.slice(6), 'base64');
  const sig = crypto.createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64');
  return { 'webhook-id': id, 'webhook-timestamp': String(timestamp), 'webhook-signature': `v1,${sig}` };
}

/** A Polar subscription as webhooks carry it (only the fields the hook reads, plus a few it must ignore). */
function subscription(over = {}) {
  const at = over.modified_at || '2026-10-25T10:00:00.123456Z';
  return {
    id: 'sub_1', status: 'active', amount: 4900, currency: 'usd', cancel_at_period_end: false,
    created_at: '2026-10-07T09:30:00.123456Z', modified_at: at, started_at: '2026-10-07T09:30:00.123456Z',
    current_period_start: '2026-10-07T09:30:00.123456Z', current_period_end: '2026-11-07T09:30:00.123456Z',
    customer_id: 'cus_1', product_id: 'prod_pro', seats: null, metadata: {},
    customer: { id: 'cus_1', email: 'Owner@Acme.test', email_verified: true, external_id: null, name: 'Owner' },
    product: { id: 'prod_pro', name: 'Zen Pro', metadata: PRO },
    ...over,
  };
}

// ---------------------------------------------------------------------------------------------------------------

test('sha256 and HMAC match node:crypto (empty, multi-block, long keys, UTF-8)', () => {
  const inputs = ['', 'abc', 'x'.repeat(55), 'y'.repeat(56), 'z'.repeat(64), 'Zen ✓ Việt 𝕫', crypto.randomBytes(1000)];
  for (const input of inputs) {
    const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, 'utf8');
    assert.deepEqual(polar.sha256(bytes(buf)), bytes(crypto.createHash('sha256').update(buf).digest()));
    if (!Buffer.isBuffer(input)) assert.deepEqual(polar.utf8(input), bytes(buf));
    for (const key of [Buffer.alloc(0), crypto.randomBytes(32), crypto.randomBytes(100)]) {
      assert.deepEqual(polar.hmacSha256(bytes(key), bytes(buf)), bytes(crypto.createHmac('sha256', key).update(buf).digest()));
    }
  }
  for (let n = 0; n < 8; n += 1) {
    const buf = crypto.randomBytes(n * 7);
    assert.equal(polar.toBase64(bytes(buf)), buf.toString('base64'));
    assert.deepEqual(polar.fromBase64(buf.toString('base64')), bytes(buf));
  }
});

test('verify: both Polar signing schemes pass; a wrong secret, a changed body or an old timestamp do not', () => {
  const body = JSON.stringify({ type: 'subscription.active', data: subscription({ customer: { email: 'é@acme.test' } }) });
  assert.equal(polar.verify(sign(body), body, SECRET, now()), '');
  assert.equal(polar.verify(sign(body, { legacy: true }), body, SECRET, now()), '');
  const headers = sign(body);
  headers['webhook-signature'] = `v1,AAAA ${headers['webhook-signature']}`; // several signatures: any one may match
  assert.equal(polar.verify(headers, body, SECRET, now()), '');
  assert.match(polar.verify(sign(body, { secret: `whsec_${crypto.randomBytes(32).toString('base64')}` }), body, SECRET, now()), /does not match/);
  assert.match(polar.verify(sign(body), `${body} `, SECRET, now()), /does not match/);
  assert.match(polar.verify(sign(body, { timestamp: now() - 600 }), body, SECRET, now()), /5 minutes/);
  assert.match(polar.verify({}, body, SECRET, now()), /missing/);
});

test('terms come from the product metadata; seats win over zen_max_members; a bare product is a problem', () => {
  assert.deepEqual(polar.termsOf(subscription()).terms, {
    type: 'pro', max_members: 5, credits_total: 100, reset_day: 7, purchase_date: '2026-10-07T09:30:00.123456Z',
  });
  const business = polar.termsOf(subscription({ seats: 12, product: { name: 'Zen Business', metadata: BUSINESS } })).terms;
  assert.equal(business.max_members, 12);
  assert.equal(business.reset_day, 15);
  assert.equal(polar.termsOf(subscription({ started_at: '2026-01-31T00:00:00Z' })).terms.reset_day, 28);
  assert.match(polar.termsOf(subscription({ product: { name: 'Bare', metadata: {} } })).problem, /"Bare".*zen_type/);
  assert.match(polar.termsOf(subscription({ product: { name: 'P', metadata: { zen_type: 'pro', zen_max_members: 3 } } })).problem, /zen_credits/);
  assert.equal(['active', 'trialing', 'past_due'].every(polar.entitled), true);
  assert.equal(['canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused'].some(polar.entitled), false);
  assert.ok(polar.stamp('2026-10-25T10:00:00.5Z') > polar.stamp('2026-10-25T10:00:00.123456Z'));
  assert.deepEqual(polar.ownerHints(subscription({ metadata: { reference_id: 'abcdefghij12345' } })), { userId: 'abcdefghij12345', email: 'owner@acme.test' });
  assert.equal(polar.ownerHints(subscription({ metadata: { reference_id: '../../x' } })).userId, '');
});

// ---------------------------------------------------------------------------------------------------------------
// The hook in PocketBase.

const children = [];
test.after(() => {
  for (const child of children) child.kill('SIGTERM');
  fs.rmSync(TMP, { recursive: true, force: true });
});

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const run = (cmd, args) => new Promise((resolve) => execFile(cmd, args, { timeout: 60_000 }, (err, stdout, stderr) => resolve({ code: err ? 1 : 0, stdout, stderr })));

test('the hook turns Polar subscription events into licences', async (t) => {
  const { fetchPocketBase } = await import('../scripts/fetch-pocketbase.mjs');
  const pocketbase = await fetchPocketBase();
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dirs = ['--dir', path.join(TMP, 'pb_data'), '--migrationsDir', path.join(__dirname, 'pocketbase', 'pb_migrations'),
    '--hooksDir', path.join(ROOT, 'pocketbase', 'pb_hooks'), '--hooksWatch=false'];
  assert.equal((await run(pocketbase, ['superuser', 'upsert', SU.email, SU.password, ...dirs])).code, 0);
  const proc = spawn(pocketbase, ['serve', `--http=127.0.0.1:${port}`, ...dirs], {
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, POLAR_WEBHOOK_SECRET: SECRET },
  });
  let log = '';
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  children.push(proc);
  for (let i = 0; i < 100 && !(await fetch(`${base}/api/health`).then((r) => r.ok, () => false)); i += 1) {
    await new Promise((r) => setTimeout(r, 100));
  }

  const api = async (method, p, body, token = su) => {
    const res = await fetch(base + p, {
      method, headers: { 'content-type': 'application/json', ...(token ? { authorization: token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const su = (await api('POST', '/api/collections/_superusers/auth-with-password', { identity: SU.email, password: SU.password }, null)).json.token;
  const user = async (email, verified = true) => (await api('POST', '/api/collections/users/records', {
    email, password: 'user-password-123', passwordConfirm: 'user-password-123', verified,
  })).json;
  const send = async (type, data, opts = {}) => {
    const body = JSON.stringify({ type, timestamp: new Date().toISOString(), data });
    const res = await fetch(`${base}/api/zen/billing/polar`, {
      method: 'POST', headers: { 'content-type': 'application/json', ...sign(body, opts) }, body,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const licence = async (id) => (await api('GET', `/api/collections/licenses/records/${id}`)).json;
  const licencesOf = async (owner) => (await api('GET', `/api/collections/licenses/records?filter=${encodeURIComponent(`owner="${owner}"`)}`)).json.items;
  const row = async (subId) => (await api('GET', `/api/collections/billing_subscriptions/records?filter=${encodeURIComponent(`polar_subscription_id="${subId}"`)}`)).json.items[0];

  await t.test('the billing collection exists at start and only superusers can read it', async () => {
    assert.ok(row, log);
    assert.equal((await api('GET', '/api/collections/billing_subscriptions/records', null, null)).status, 403);
    const owner = await user('reader@acme.test');
    const token = (await api('POST', '/api/collections/users/auth-with-password', { identity: owner.email, password: 'user-password-123' }, null)).json.token;
    assert.equal((await api('GET', '/api/collections/billing_subscriptions/records', null, token)).status, 403);
  });

  const owner = await user('owner@acme.test');
  let licenceId;

  await t.test('a paid subscription creates one licence for the account with the customer email', async () => {
    const res = await send('subscription.created', subscription());
    assert.equal(res.status, 200, JSON.stringify(res.json) + log);
    licenceId = res.json.license;
    const lic = await licence(licenceId);
    assert.equal(lic.owner, owner.id);
    assert.equal(lic.type, 'pro');
    assert.equal(lic.max_members, 5);
    assert.equal(lic.credits_total, 100);
    assert.equal(lic.credits_used, 0);
    assert.equal(lic.reset_day, 7);
    assert.equal(lic.active, true);
    assert.match(lic.purchase_date, /^2026-10-07 09:30:00/);
    // Polar sends created, active and updated for the same purchase, and retries: still one licence.
    await send('subscription.active', subscription());
    await send('subscription.updated', subscription());
    assert.equal((await licencesOf(owner.id)).length, 1);
    assert.equal((await row('sub_1')).license, licenceId);
  });

  await t.test('an upgrade changes the terms; an older event arriving late changes nothing', async () => {
    const upgraded = subscription({ modified_at: '2026-10-26T08:00:00Z', product_id: 'prod_biz', seats: 8, product: { name: 'Zen Business', metadata: BUSINESS } });
    assert.equal((await send('subscription.updated', upgraded)).status, 200);
    let lic = await licence(licenceId);
    assert.deepEqual([lic.type, lic.max_members, lic.credits_total, lic.reset_day], ['business', 8, 500, 7]);
    const late = await send('subscription.updated', subscription({ modified_at: '2026-10-25T23:00:00Z' }));
    assert.equal(late.json.stale, true);
    lic = await licence(licenceId);
    assert.equal(lic.type, 'business');
  });

  await t.test('cancel at period end keeps access, a failed renewal keeps it, revocation removes it, renewal restores it', async () => {
    const biz = { product_id: 'prod_biz', seats: 8, product: { name: 'Zen Business', metadata: BUSINESS } };
    await send('subscription.canceled', subscription({ ...biz, modified_at: '2026-10-27T00:00:00Z', cancel_at_period_end: true }));
    assert.equal((await licence(licenceId)).active, true);
    await send('subscription.uncanceled', subscription({ ...biz, modified_at: '2026-10-28T00:00:00Z' }));
    await send('subscription.past_due', subscription({ ...biz, modified_at: '2026-11-07T10:00:00Z', status: 'past_due' }));
    assert.equal((await licence(licenceId)).active, true);
    await send('subscription.revoked', subscription({ ...biz, modified_at: '2026-11-28T10:00:00Z', status: 'canceled' }));
    assert.equal((await licence(licenceId)).active, false);
    await send('subscription.active', subscription({ ...biz, modified_at: '2026-11-29T10:00:00Z' }));
    assert.equal((await licence(licenceId)).active, true);
    assert.equal((await licencesOf(owner.id)).length, 1);
  });

  await t.test('a bad signature, a stale timestamp or a missing header is refused and changes nothing', async () => {
    const revoke = subscription({ modified_at: '2026-12-31T00:00:00Z', status: 'canceled' });
    assert.equal((await send('subscription.revoked', revoke, { secret: `whsec_${crypto.randomBytes(32).toString('base64')}` })).status, 401);
    assert.equal((await send('subscription.revoked', revoke, { timestamp: now() - 3600 })).status, 401);
    const res = await fetch(`${base}/api/zen/billing/polar`, { method: 'POST', body: JSON.stringify({ type: 'subscription.revoked', data: revoke }) });
    assert.equal(res.status, 401);
    assert.equal((await licence(licenceId)).active, true);
  });

  await t.test('other events are acknowledged and ignored; the old Polar HMAC secret format also verifies', async () => {
    const res = await send('order.paid', { id: 'ord_1' }, { legacy: true });
    assert.equal(res.status, 202);
    assert.equal(res.json.ignored, 'order.paid');
  });

  await t.test('a checkout opened with ?reference_id=<users id> gives the licence to that account', async () => {
    const other = await user('teammate@acme.test');
    const res = await send('subscription.active', subscription({ id: 'sub_ref', metadata: { reference_id: other.id } }));
    assert.equal((await licence(res.json.license)).owner, other.id);
  });

  await t.test('a buyer with no account yet: the licence waits and appears when that email signs up verified', async () => {
    const res = await send('subscription.active', subscription({ id: 'sub_new', customer: { id: 'cus_2', email: 'new@beta.test' } }));
    assert.equal(res.json.pending, true);
    assert.equal(res.json.license, '');
    // An unverified account with that email does not get it (anyone can type an email); verifying does.
    const unverified = await user('new@beta.test', false);
    assert.equal((await licencesOf(unverified.id)).length, 0);
    await api('PATCH', `/api/collections/users/records/${unverified.id}`, { verified: true });
    const mine = await licencesOf(unverified.id);
    assert.equal(mine.length, 1, log);
    assert.equal(mine[0].active, true);
    assert.equal((await row('sub_new')).license, mine[0].id);
    // Its later events update that licence.
    await send('subscription.revoked', subscription({ id: 'sub_new', status: 'canceled', modified_at: '2026-11-30T00:00:00Z', customer: { id: 'cus_2', email: 'new@beta.test' } }));
    assert.equal((await licence(mine[0].id)).active, false);
  });

  await t.test('a product without zen_* metadata is reported, not retried; no licence is made from it', async () => {
    const res = await send('subscription.active', subscription({ id: 'sub_bare', product: { name: 'Bare', metadata: {} } }));
    assert.equal(res.status, 200);
    assert.match(res.json.problem, /zen_type/);
    assert.equal(res.json.license, '');
    assert.match((await row('sub_bare')).problem, /zen_type/);
  });

  await t.test('an unpaid subscription (incomplete) makes no licence', async () => {
    const res = await send('subscription.created', subscription({ id: 'sub_incomplete', status: 'incomplete' }));
    assert.equal(res.json.license, '');
    assert.equal(res.json.pending, false);
  });
});

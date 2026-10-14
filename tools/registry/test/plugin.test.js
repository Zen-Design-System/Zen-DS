'use strict';

// Unit tests for the zen-license plugin against a fake license store and a fake clock.
// Developers hold seats (owner + team members, oldest first, up to max_members); CI signs in with the license key
// and gets one of a capped number of CI tokens.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ZenLicensePlugin, sha256 } = require('../plugins/verdaccio-zen-license');
const { StoreError } = require('../plugins/verdaccio-zen-license/license-store');
const { CiTokens, Usage } = require('../plugins/verdaccio-zen-license/state');

const KEY = 'abcdefghij12345';
const OWNER = 'owner0000000001';
const [M1, M2, M3] = ['member000000001', 'member000000002', 'member000000003'];
const PKG = { name: '@zen-ds/react', access: ['$authenticated'], publish: ['zen-publisher'] };
const quiet = { warn() {}, error() {}, info() {} };

function setup({ license = {}, members = [M1], publisherKey, ciLimit = 3 } = {}) {
  const clock = { t: Date.parse('2026-10-08T00:00:00Z') };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-license-'));
  const store = {
    calls: 0,
    down: false,
    license: { id: KEY, active: true, type: 'business', owner: OWNER, maxMembers: 2, ...license },
    members,
    users: {},
    async getLicense(id) {
      this.calls += 1;
      if (this.down) throw new StoreError('license store unreachable: ECONNREFUSED');
      return id === KEY ? this.license : null;
    },
    async getMembers(id) {
      if (this.down) throw new StoreError('license store unreachable: ECONNREFUSED');
      return id === KEY ? this.members : [];
    },
    async getUser(token) {
      if (this.down) throw new StoreError('license store unreachable: ECONNREFUSED');
      return this.users[token] || null;
    },
  };
  const plugin = new ZenLicensePlugin({
    store,
    cacheSeconds: 300,
    staleGraceSeconds: 3600,
    publisherKeyHash: publisherKey ? sha256(publisherKey) : '',
    ciTokens: new CiTokens(path.join(dir, 'ci.json'), ciLimit, () => clock.t),
    usage: new Usage(path.join(dir, 'usage.json'), { now: () => clock.t, flushMs: 0 }),
    logger: quiet,
    now: () => clock.t,
  });
  return { plugin, store, clock, dir };
}

const call = (fn, ...args) =>
  new Promise((resolve) => fn(...args, (err, value) => resolve(err ? { err } : { value })));
const access = (plugin, groups) =>
  call(plugin.allow_access.bind(plugin), { name: 'x', groups: [...groups, '$all', '$authenticated'] }, PKG);
const developer = (userId) => ['zen-customer', `zen-license:${KEY}`, `zen-user:${userId}`];
const anonymous = { name: undefined, groups: ['$all', '$anonymous'] };

test('the owner and members within max_members hold seats; a later member does not', async () => {
  const { plugin } = setup({ members: [M1, M2], license: { maxMembers: 2 } });
  assert.equal((await access(plugin, developer(OWNER))).value, true);
  assert.equal((await access(plugin, developer(M1))).value, true);
  const late = await access(plugin, developer(M2));
  assert.equal(late.err?.status, 403);
  assert.match(late.err.message, /seat/);
  assert.match((await access(plugin, developer('stranger0000001'))).err?.message, /no longer a member/);
});

test('removing a member frees the seat for the next one and cuts the removed one off once the cache expires', async () => {
  const { plugin, store, clock } = setup({ members: [M1, M2], license: { maxMembers: 2 } });
  assert.equal((await access(plugin, developer(M1))).value, true);
  store.members = [M2];
  clock.t += 301_000;
  assert.equal((await access(plugin, developer(M1))).err?.status, 403);
  assert.equal((await access(plugin, developer(M2))).value, true);
});

test('deactivating a license cuts off developer and CI tokens once the cache expires', async () => {
  const { plugin, store, clock } = setup();
  const ci = await plugin.keyLogin('build', KEY);
  assert.equal((await access(plugin, developer(OWNER))).value, true);
  assert.equal((await access(plugin, ci.groups)).value, true);
  store.license = { ...store.license, active: false };
  clock.t += 299_000; // still cached
  assert.equal((await access(plugin, developer(OWNER))).value, true);
  clock.t += 2_000; // cache expired
  assert.match((await access(plugin, developer(OWNER))).err?.message, /not active/);
  assert.match((await access(plugin, ci.groups)).err?.message, /not active/);
});

test('the licence key gives CI tokens, at most three active: a fourth retires the oldest', async () => {
  const { plugin } = setup();
  const tokens = [];
  for (const name of ['a', 'b', 'c', 'd']) tokens.push(await plugin.keyLogin(name, KEY));
  assert.ok(tokens.every((t) => Array.isArray(t.groups)));
  assert.match((await access(plugin, tokens[0].groups)).err?.message, /replaced by a newer one/);
  for (const t of tokens.slice(1)) assert.equal((await access(plugin, t.groups)).value, true);
});

test('an unknown, malformed, empty or inactive key gets no CI token', async () => {
  const { plugin } = setup();
  for (const key of ['zzzzzzzzzzzzzzz', 'abcdefghij1234', '../_superusers', 'ABCDEFGHIJ12345', '', undefined]) {
    assert.equal((await plugin.keyLogin('ci', key)).status, 401, String(key));
  }
  const inactive = setup({ license: { active: false } }).plugin;
  assert.equal((await inactive.keyLogin('ci', KEY)).status, 401);
});

test('basic auth with the licence key is refused: customers use tokens', async () => {
  const { plugin } = setup();
  const res = await call(plugin.authenticate.bind(plugin), 'zen', KEY);
  assert.equal(res.err?.status, 401);
  assert.match(res.err.message, /npm login/);
});

test('a token from before seats (license group only) or with no license group is refused', async () => {
  const { plugin } = setup();
  assert.match((await access(plugin, ['zen-customer', `zen-license:${KEY}`])).err?.message, /older sign-in/);
  assert.equal((await access(plugin, ['zen-customer'])).err?.status, 403);
});

test('anonymous requests are refused with an error, not false', async () => {
  const { plugin } = setup();
  assert.equal((await call(plugin.allow_access.bind(plugin), anonymous, PKG)).err?.status, 401);
});

test('browser sign-in: a seat holder gets developer groups; no licence or no free seat is refused', async () => {
  const { plugin, store } = setup({ members: [M1, M2], license: { maxMembers: 2 } });
  store.users = {
    'tok-owner': { id: OWNER, email: 'owner@acme.test', providers: ['google'], licenseIds: [KEY] },
    'tok-m2': { id: M2, email: 'late@acme.test', providers: ['google'], licenseIds: [KEY] },
    'tok-none': { id: M3, email: 'solo@test.local', providers: ['google'], licenseIds: [] },
    'tok-password': { id: M1, email: 'pw@acme.test', providers: [], licenseIds: [KEY] },
  };
  const ok = await plugin.developerLogin('tok-owner');
  assert.deepEqual(ok.groups, developer(OWNER));
  assert.equal(ok.name, 'owner@acme.test');
  assert.match((await plugin.developerLogin('tok-m2')).message, /every seat/);
  assert.match((await plugin.developerLogin('tok-none')).message, /no Zen DS licence/);
  assert.equal((await plugin.developerLogin('forged')).status, 401);
  const noGoogle = await plugin.developerLogin('tok-password');
  assert.equal(noGoogle.status, 403);
  assert.match(noGoogle.message, /sign in with Google/);
});

test('a store outage serves the cached answer for the grace period, then 503', async () => {
  const { plugin, store, clock } = setup();
  await access(plugin, developer(OWNER));
  store.down = true;
  clock.t += 600_000; // cache stale, inside grace
  assert.equal((await access(plugin, developer(OWNER))).value, true);
  clock.t += 3_600_000; // past grace
  assert.equal((await access(plugin, developer(OWNER))).err?.status, 503);
});

test('a store outage with nothing cached answers 503, not 401', async () => {
  const { plugin, store } = setup();
  store.down = true;
  assert.equal((await access(plugin, developer(OWNER))).err?.status, 503);
});

test('concurrent requests share one store lookup', async () => {
  const { plugin, store } = setup();
  await Promise.all(Array.from({ length: 10 }, () => access(plugin, developer(OWNER))));
  assert.equal(store.calls, 1);
});

test('wrong-key guesses do not grow the cache without bound', async () => {
  const { plugin } = setup();
  for (let i = 0; i < 10_050; i += 1) await plugin.keyLogin('ci', `guess${String(i).padStart(10, '0')}`);
  assert.ok(plugin.cache.size <= 10_000, `cache size ${plugin.cache.size}`);
});

test('only the publisher may publish; publishing is off without a key hash', async () => {
  const { plugin } = setup({ publisherKey: 'pub-secret' });
  assert.deepEqual((await call(plugin.authenticate.bind(plugin), 'zen', 'pub-secret')).value, ['zen-publisher']);
  assert.equal((await call(plugin.authenticate.bind(plugin), 'zen', 'nope')).err?.status, 401);
  const customer = { name: 'x', groups: [...developer(OWNER), '$authenticated'] };
  assert.equal((await call(plugin.allow_publish.bind(plugin), customer, PKG)).err?.status, 403);
  const publisher = { name: 'zen-publisher', groups: ['zen-publisher', '$authenticated'] };
  assert.equal((await call(plugin.allow_publish.bind(plugin), publisher, PKG)).value, true);
  assert.equal((await call(plugin.allow_unpublish.bind(plugin), customer, PKG)).err?.status, 403);

  const off = setup().plugin;
  assert.equal((await call(off.authenticate.bind(off), 'zen', '')).err?.status, 401);
});

test("Verdaccio's own sign-up is closed", async () => {
  const { plugin } = setup();
  assert.equal((await call(plugin.adduser.bind(plugin), 'zen', KEY)).err?.status, 409);
  assert.equal((await call(plugin.adduser.bind(plugin), 'newperson', 'pw')).err?.status, 409);
});

test('usage counts requests, installs, developers, CI tokens and IPs per license and month', async () => {
  const { plugin, dir } = setup();
  const ci = await plugin.keyLogin('build', KEY);
  const hit = (groups, url, ip, status = 200) =>
    plugin.recordUsage(
      { method: 'GET', path: url, headers: { 'x-forwarded-for': ip }, remote_user: { groups } },
      { statusCode: status },
    );
  hit(developer(OWNER), '/@zen-ds%2freact', '1.1.1.1');
  hit(developer(OWNER), '/@zen-ds/react/-/react-0.3.0.tgz', '1.1.1.1');
  hit(ci.groups, '/@zen-ds/react/-/react-0.3.0.tgz', '2.2.2.2');
  hit(developer(M1), '/@zen-ds%2freact', '3.3.3.3', 403); // refused: not counted
  plugin.usage.flush();
  const u = JSON.parse(fs.readFileSync(path.join(dir, 'usage.json'), 'utf8'))['2026-10'][KEY];
  assert.equal(u.requests, 3);
  assert.equal(u.installs, 2);
  assert.deepEqual(Object.keys(u.users), [OWNER]);
  assert.equal(Object.keys(u.ci).length, 1);
  assert.deepEqual(Object.keys(u.ips).sort(), ['1.1.1.1', '2.2.2.2']);
});

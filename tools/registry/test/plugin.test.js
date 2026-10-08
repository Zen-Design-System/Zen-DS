'use strict';

// Unit tests for the zen-license plugin against a fake license store and a fake clock.
// The license key is the license record id; the username is ignored.
const test = require('node:test');
const assert = require('node:assert/strict');
const { ZenLicensePlugin, sha256 } = require('../plugins/verdaccio-zen-license');
const { StoreError } = require('../plugins/verdaccio-zen-license/license-store');

const KEY = 'abcdefghij12345';
const PKG = { name: '@zen-ds/react', access: ['$authenticated'], publish: ['zen-publisher'] };
const quiet = { warn() {}, error() {}, info() {} };

function setup({ license = {}, publisherKey } = {}) {
  const clock = { t: Date.parse('2026-10-08T00:00:00Z') };
  const store = {
    calls: 0,
    down: false,
    license: { id: KEY, active: true, type: 'business', ...license },
    async getLicense(id) {
      this.calls += 1;
      if (this.down) throw new StoreError('license store unreachable: ECONNREFUSED');
      return id === KEY ? this.license : null;
    },
  };
  const plugin = new ZenLicensePlugin({
    store,
    cacheSeconds: 300,
    staleGraceSeconds: 3600,
    publisherKeyHash: publisherKey ? sha256(publisherKey) : '',
    logger: quiet,
    now: () => clock.t,
  });
  return { plugin, store, clock };
}

const call = (fn, ...args) =>
  new Promise((resolve) => fn(...args, (err, value) => resolve(err ? { err } : { value })));
const customer = { name: 'zen', groups: ['zen-customer', `zen-license:${KEY}`, '$all', '$authenticated'] };
const anonymous = { name: undefined, groups: ['$all', '$anonymous'] };
const signIn = (plugin, user, key) => call(plugin.authenticate.bind(plugin), user, key);

test('the license key alone signs in, whatever the username; business and pro alike', async () => {
  for (const type of ['business', 'pro']) {
    const { plugin } = setup({ license: { type } });
    for (const user of ['zen', 'anything', '']) {
      assert.deepEqual((await signIn(plugin, user, KEY)).value, ['zen-customer', `zen-license:${KEY}`]);
    }
  }
});

test('an unknown, malformed or empty key is refused with 401', async () => {
  const { plugin } = setup();
  for (const key of ['zzzzzzzzzzzzzzz', 'abcdefghij1234', '../_superusers', 'ABCDEFGHIJ12345', '']) {
    assert.equal((await signIn(plugin, 'zen', key)).err?.status, 401, key);
  }
});

test('an inactive license cannot sign in', async () => {
  const { plugin } = setup({ license: { active: false } });
  assert.equal((await signIn(plugin, 'zen', KEY)).err?.status, 401);
});

test('anonymous requests are refused with an error, not false', async () => {
  const { plugin } = setup();
  assert.equal((await call(plugin.allow_access.bind(plugin), anonymous, PKG)).err?.status, 401);
});

test('a customer token without a license group is refused', async () => {
  const { plugin } = setup();
  const res = await call(plugin.allow_access.bind(plugin), { name: 'zen', groups: ['zen-customer', '$authenticated'] }, PKG);
  assert.equal(res.err?.status, 403);
});

test('deactivating a license cuts off an existing token once the cache expires', async () => {
  const { plugin, store, clock } = setup();
  assert.equal((await call(plugin.allow_access.bind(plugin), customer, PKG)).value, true);
  store.license = { ...store.license, active: false };
  clock.t += 299_000; // still cached
  assert.equal((await call(plugin.allow_access.bind(plugin), customer, PKG)).value, true);
  clock.t += 2_000; // cache expired
  assert.equal((await call(plugin.allow_access.bind(plugin), customer, PKG)).err?.status, 403);
});

test('a store outage serves the cached answer for the grace period, then 503', async () => {
  const { plugin, store, clock } = setup();
  await call(plugin.allow_access.bind(plugin), customer, PKG);
  store.down = true;
  clock.t += 600_000; // cache stale, inside grace
  assert.equal((await call(plugin.allow_access.bind(plugin), customer, PKG)).value, true);
  clock.t += 3_600_000; // past grace
  assert.equal((await call(plugin.allow_access.bind(plugin), customer, PKG)).err?.status, 503);
});

test('a store outage with nothing cached answers 503, not 401', async () => {
  const { plugin, store } = setup();
  store.down = true;
  assert.equal((await signIn(plugin, 'zen', KEY)).err?.status, 503);
});

test('concurrent requests share one store lookup', async () => {
  const { plugin, store } = setup();
  await Promise.all(Array.from({ length: 10 }, () => call(plugin.allow_access.bind(plugin), customer, PKG)));
  assert.equal(store.calls, 1);
});

test('wrong-key guesses do not grow the cache without bound', async () => {
  const { plugin } = setup();
  for (let i = 0; i < 10_050; i += 1) await signIn(plugin, 'zen', `guess${String(i).padStart(10, '0')}`);
  assert.ok(plugin.cache.size <= 10_000, `cache size ${plugin.cache.size}`);
});

test('only the publisher may publish; publishing is off without a key hash', async () => {
  const { plugin } = setup({ publisherKey: 'pub-secret' });
  assert.deepEqual((await signIn(plugin, 'zen', 'pub-secret')).value, ['zen-publisher']);
  assert.equal((await signIn(plugin, 'zen', 'nope')).err?.status, 401);
  assert.equal((await call(plugin.allow_publish.bind(plugin), customer, PKG)).err?.status, 403);
  const publisher = { name: 'zen-publisher', groups: ['zen-publisher', '$authenticated'] };
  assert.equal((await call(plugin.allow_publish.bind(plugin), publisher, PKG)).value, true);
  assert.equal((await call(plugin.allow_unpublish.bind(plugin), customer, PKG)).err?.status, 403);

  const off = setup().plugin;
  assert.equal((await signIn(off, 'zen', '')).err?.status, 401);
});

test('npm login is accepted only for a valid key (no sign-up)', async () => {
  const { plugin } = setup();
  assert.equal((await call(plugin.adduser.bind(plugin), 'zen', KEY)).value, true);
  assert.equal((await call(plugin.adduser.bind(plugin), 'newperson', 'pw')).err?.status, 409);
});

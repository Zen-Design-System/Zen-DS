'use strict';

// End-to-end: a real PocketBase (license store) and a real Verdaccio running the shipped config.yaml with
// the zen-license plugin, driven by the real npm CLI. The license store runs the live schema (fixture) plus
// the registry-access migration. The gate for Phase 2: a deactivated license stops installs with a token
// issued before.
//
// ZEN_E2E_STACK=1 (`npm run test:stack`, needs Docker) runs the registry as deployed instead: the image from
// deploy/Dockerfile behind Caddy via deploy/docker-compose.yml, plus a backup → wipe → restore round trip of
// deploy/backup.sh and deploy/restore.sh against a local S3 server (rclone serve s3).
const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn, execFile } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const yaml = require('js-yaml');
const { sha256 } = require('../plugins/verdaccio-zen-license');

const ROOT = path.join(__dirname, '..');
const DEPLOY = path.join(ROOT, 'deploy');
const STACK = process.env.ZEN_E2E_STACK === '1';
const PROJECT = `zen-registry-e2e-${process.pid}`;
const TMP = path.join(ROOT, '.test-tmp', `e2e-${process.pid}`);
const CACHE_SECONDS = 2;
const PKG = '@zen-ds/e2e-fixture';
const SU = { email: 'su@test.local', password: 'su-password-123' };
const CLIENT = { email: 'registry@test.local', password: 'client-password-123' };
const PUBLISHER_KEY = 'publisher-key-e2e';
const basicAuth = (user, password) => `:_auth=${Buffer.from(`${user}:${password}`).toString('base64')}`;

const children = [];

function freePort() {
  return new Promise((resolve) => {
    const srv = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 120_000, ...opts }, (err, stdout, stderr) =>
      resolve({ code: err ? err.code ?? 1 : 0, stdout, stderr }),
    );
  });
}

function start(cmd, args, opts) {
  const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
  let log = '';
  child.stdout.on('data', (d) => (log += d));
  child.stderr.on('data', (d) => (log += d));
  child.log = () => log;
  children.push(child);
  return child;
}

async function waitFor(url, child) {
  for (let i = 0; i < 100; i += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`${url} never came up:\n${child.log()}`);
}

async function pb(base, token, method, p, body) {
  const res = await fetch(base + p, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${method} ${p} → ${res.status} ${JSON.stringify(json)}`);
  return json;
}

/** A fresh project that installs PKG from the registry with the given auth line, with no npm cache. */
async function install(registry, authLine, name) {
  const dir = path.join(TMP, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name, private: true }));
  const host = registry.replace(/^http:/, '');
  fs.writeFileSync(path.join(dir, '.npmrc'), `@zen-ds:registry=${registry}\n${host}${authLine}\n`);
  return run('npm', ['install', PKG, '--no-audit', '--no-fund', '--prefer-online', `--cache=${path.join(dir, '.npm-cache')}`], {
    cwd: dir,
    env: { ...process.env, npm_config_userconfig: path.join(dir, '.npmrc') },
  });
}

const cleanups = [];

test.after(async () => {
  for (const cleanup of cleanups.reverse()) await cleanup();
  for (const child of children) child.kill('SIGTERM');
  fs.rmSync(TMP, { recursive: true, force: true });
});

/** Starts the registry the plain way (node_modules Verdaccio). Returns its URL. */
async function startLocalRegistry(pbBase) {
  const config = yaml.load(fs.readFileSync(path.join(ROOT, 'config.yaml'), 'utf8'));
  config.storage = path.join(TMP, 'storage');
  config.plugins = path.join(ROOT, 'plugins');
  config.auth['zen-license'].cache_seconds = CACHE_SECONDS;
  config.log = { type: 'stdout', format: 'pretty', level: 'warn' };
  const configPath = path.join(TMP, 'config.yaml');
  fs.writeFileSync(configPath, yaml.dump(config));

  const regPort = await freePort();
  const registry = `http://127.0.0.1:${regPort}/`;
  const regProc = start(path.join(ROOT, 'node_modules', '.bin', 'verdaccio'), ['--config', configPath, '--listen', `127.0.0.1:${regPort}`], {
    env: {
      ...process.env,
      ZEN_LICENSE_STORE_URL: pbBase,
      ZEN_LICENSE_STORE_EMAIL: CLIENT.email,
      ZEN_LICENSE_STORE_PASSWORD: CLIENT.password,
      ZEN_PUBLISHER_KEY_HASH: sha256(PUBLISHER_KEY),
    },
  });
  await waitFor(`${registry}-/ping`, regProc);
  return registry;
}

/** The compose environment of the test stack (also what backup.sh / restore.sh run with). */
function stackEnv(extra = {}) {
  return { ...process.env, COMPOSE_PROJECT_NAME: PROJECT, ZEN_REGISTRY_ENV: path.join(TMP, 'registry.env'), ...extra };
}

/** Starts the deployed stack (image + Caddy) with docker compose. Returns its URL. */
async function startStackRegistry(pbPort) {
  const [httpPort, httpsPort] = [await freePort(), await freePort()];
  const registry = `http://localhost:${httpPort}/`;
  fs.writeFileSync(path.join(TMP, 'registry.env'), [
    `VERDACCIO_PUBLIC_URL=${registry}`,
    `ZEN_LICENSE_STORE_URL=http://host.docker.internal:${pbPort}`,
    `ZEN_LICENSE_STORE_EMAIL=${CLIENT.email}`,
    `ZEN_LICENSE_STORE_PASSWORD=${CLIENT.password}`,
    `ZEN_PUBLISHER_KEY_HASH=${sha256(PUBLISHER_KEY)}`,
    `ZEN_LICENSE_CACHE_SECONDS=${CACHE_SECONDS}`,
    '',
  ].join('\n'), { mode: 0o600 });
  // Linux Docker has no host.docker.internal by default.
  const override = path.join(TMP, 'compose.override.yml');
  fs.writeFileSync(override, 'services:\n  registry:\n    extra_hosts: ["host.docker.internal:host-gateway"]\n');
  const env = stackEnv({ REGISTRY_DOMAIN: 'http://localhost', HTTP_PORT: String(httpPort), HTTPS_PORT: String(httpsPort) });
  const compose = (...args) => run('docker', ['compose', '-f', path.join(DEPLOY, 'docker-compose.yml'), '-f', override, ...args], { cwd: DEPLOY, env, timeout: 600_000 });
  // Docker Hub drops pulls now and then: fetch the helper images up front, with retries.
  for (const image of ['caddy:2.11.7', 'verdaccio/verdaccio:6.10.5', 'rclone/rclone:1.75.1', 'alpine:3.24.2']) {
    for (let i = 0; i < 4 && (await run('docker', ['pull', '-q', image], { timeout: 300_000 })).code !== 0; i += 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  cleanups.push(() => compose('down', '-v', '--remove-orphans'));
  const up = await compose('up', '-d', '--build', '--wait');
  assert.equal(up.code, 0, up.stderr);
  for (let i = 0; i < 100; i += 1) {
    try {
      if ((await fetch(`${registry}-/ping`)).ok) return { registry, compose };
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`stack never answered on ${registry}:\n${(await compose('logs', '--no-color')).stdout}`);
}

test('license-gated registry, end to end', { timeout: 300_000 }, async (t) => {
  const { fetchPocketBase } = await import('../scripts/fetch-pocketbase.mjs');
  const pocketbase = await fetchPocketBase();
  fs.mkdirSync(TMP, { recursive: true });

  // --- license store -------------------------------------------------------------------------------
  const pbPort = await freePort();
  const pbBase = `http://127.0.0.1:${pbPort}`;
  const pbDir = ['--dir', path.join(TMP, 'pb_data'), '--migrationsDir', path.join(__dirname, 'pocketbase', 'pb_migrations')];
  assert.equal((await run(pocketbase, ['superuser', 'upsert', SU.email, SU.password, ...pbDir])).code, 0);
  // The stack's container reaches PocketBase through the host, so it listens beyond loopback there.
  const pbProc = start(pocketbase, ['serve', `--http=${STACK ? '0.0.0.0' : '127.0.0.1'}:${pbPort}`, ...pbDir]);
  await waitFor(`${pbBase}/api/health`, pbProc);
  const su = (await pb(pbBase, null, 'POST', '/api/collections/_superusers/auth-with-password', { identity: SU.email, password: SU.password })).token;
  await pb(pbBase, su, 'POST', '/api/collections/registry_clients/records', { ...CLIENT, passwordConfirm: CLIENT.password });
  const OWNER = { email: 'owner@acme.test', password: 'owner-password-123' };
  const owner = await pb(pbBase, su, 'POST', '/api/collections/users/records', { ...OWNER, passwordConfirm: OWNER.password });
  const license = await pb(pbBase, su, 'POST', '/api/collections/licenses/records', {
    owner: owner.id, type: 'pro', credits_total: 100, reset_day: 1, max_members: 5,
    purchase_date: '2026-10-01 00:00:00.000Z', active: true,
  });
  const KEY = license.id; // what the customer copies from the license server

  await t.test('licenses: the registry reads one by id, cannot list; the owner keeps access; anonymous sees nothing', async () => {
    const lic = `${pbBase}/api/collections/licenses/records`;
    assert.equal((await fetch(`${lic}/${KEY}`)).status, 404);
    assert.equal((await (await fetch(lic)).json()).totalItems ?? 0, 0);
    const client = (await pb(pbBase, null, 'POST', '/api/collections/registry_clients/auth-with-password', { identity: CLIENT.email, password: CLIENT.password })).token;
    assert.equal((await fetch(`${lic}/${KEY}`, { headers: { authorization: client } })).status, 200);
    assert.equal((await (await fetch(lic, { headers: { authorization: client } })).json()).totalItems ?? 0, 0);
    const ownerToken = (await pb(pbBase, null, 'POST', '/api/collections/users/auth-with-password', { identity: OWNER.email, password: OWNER.password })).token;
    assert.equal((await fetch(`${lic}/${KEY}`, { headers: { authorization: ownerToken } })).status, 200);
    assert.equal((await (await fetch(lic, { headers: { authorization: ownerToken } })).json()).totalItems, 1);
    // A team member reads the license; another signed-in user does not.
    const MEMBER = { email: 'member@acme.test', password: 'member-password-123' };
    const STRANGER = { email: 'stranger@test.local', password: 'stranger-password-123' };
    const member = await pb(pbBase, su, 'POST', '/api/collections/users/records', { ...MEMBER, passwordConfirm: MEMBER.password });
    await pb(pbBase, su, 'POST', '/api/collections/users/records', { ...STRANGER, passwordConfirm: STRANGER.password });
    const tokenOf = async (u) => (await pb(pbBase, null, 'POST', '/api/collections/users/auth-with-password', { identity: u.email, password: u.password })).token;
    const stranger = await tokenOf(STRANGER);
    assert.equal((await fetch(`${lic}/${KEY}`, { headers: { authorization: stranger } })).status, 404);
    await pb(pbBase, su, 'POST', '/api/collections/team_members/records', { license: KEY, user: member.id, added_by: owner.id });
    assert.equal((await fetch(`${lic}/${KEY}`, { headers: { authorization: await tokenOf(MEMBER) } })).status, 200);
    assert.equal((await fetch(`${lic}/${KEY}`, { headers: { authorization: stranger } })).status, 404);
    assert.equal((await fetch(`${lic}/${KEY}`)).status, 404);
  });

  // --- registry: the shipped config.yaml, run locally or as the deployed stack -------------------------
  const stack = STACK ? await startStackRegistry(pbPort) : null;
  const registry = stack ? stack.registry : await startLocalRegistry(pbBase);

  await t.test('the publisher publishes; a customer may not', async () => {
    const pkgDir = path.join(TMP, 'fixture');
    fs.mkdirSync(pkgDir, { recursive: true });
    fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify({ name: PKG, version: '1.0.0', main: 'index.js' }));
    fs.writeFileSync(path.join(pkgDir, 'index.js'), 'module.exports = "zen";\n');
    const publishAs = (auth) => {
      fs.writeFileSync(path.join(pkgDir, '.npmrc'), `${registry.replace(/^http:/, '')}${auth}\n`);
      return run('npm', ['publish', `--registry=${registry}`], {
        cwd: pkgDir,
        env: { ...process.env, npm_config_userconfig: path.join(pkgDir, '.npmrc') },
      });
    };
    const denied = await publishAs(basicAuth('zen', KEY));
    assert.notEqual(denied.code, 0, 'a customer must not publish');
    const ok = await publishAs(basicAuth('zen-publisher', PUBLISHER_KEY));
    assert.equal(ok.code, 0, ok.stderr);
  });

  await t.test('anonymous and wrong-key requests are refused', async () => {
    assert.equal((await fetch(`${registry}${PKG.replace('/', '%2f')}`)).status, 401);
    const bad = await fetch(`${registry}-/user/org.couchdb.user:zen`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'zen', password: 'wrong-key' }),
    });
    assert.ok(bad.status >= 400 && bad.status < 500, `wrong key login → ${bad.status}`);
    const signup = await fetch(`${registry}-/user/org.couchdb.user:newperson`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'newperson', password: 'whatever' }),
    });
    assert.ok(signup.status >= 400 && signup.status < 500, `sign-up → ${signup.status}`);
    const unknown = await fetch(`${registry}-/user/org.couchdb.user:zen`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'zen', password: 'zzzzzzzzzzzzzzz' }),
    });
    assert.ok(unknown.status >= 400 && unknown.status < 500, `unknown license login → ${unknown.status}`);
  });

  // The customer's one-time `npm login` (any username, the license key as password) does exactly this PUT.
  const npmLogin = async (username) => {
    const res = await fetch(`${registry}-/user/org.couchdb.user:${username}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: username, password: KEY }),
    });
    assert.equal(res.status, 201, await res.clone().text());
    return (await res.json()).token;
  };
  const token = await npmLogin('alice');

  await t.test('after npm login with the license key, installs work; any username', async () => {
    const withToken = await install(registry, `:_authToken=${token}`, 'install-token');
    assert.equal(withToken.code, 0, withToken.stderr);
    const other = await install(registry, `:_authToken=${await npmLogin('bob-ci')}`, 'install-token-2');
    assert.equal(other.code, 0, other.stderr);
  });

  await t.test('deactivating the license stops installs with the token issued before', async () => {
    await pb(pbBase, su, 'PATCH', `/api/collections/licenses/records/${KEY}`, { active: false });
    await new Promise((r) => setTimeout(r, (CACHE_SECONDS + 1) * 1000));
    const res = await fetch(`${registry}${PKG.replace('/', '%2f')}`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(res.status, 403);
    const withToken = await install(registry, `:_authToken=${token}`, 'install-token-revoked');
    assert.notEqual(withToken.code, 0, 'install must fail after revocation');
    assert.match(withToken.stderr, /403|not active/);
    const relogin = await fetch(`${registry}-/user/org.couchdb.user:alice`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'alice', password: KEY }),
    });
    assert.ok(relogin.status >= 400 && relogin.status < 500, `login with an inactive license → ${relogin.status}`);
  });

  await t.test('re-activating the license restores access', async () => {
    await pb(pbBase, su, 'PATCH', `/api/collections/licenses/records/${KEY}`, { active: true });
    await new Promise((r) => setTimeout(r, (CACHE_SECONDS + 1) * 1000));
    const withToken = await install(registry, `:_authToken=${token}`, 'install-token-restored');
    assert.equal(withToken.code, 0, withToken.stderr);
  });

  if (!stack) return;

  await t.test('stack: tarball links use VERDACCIO_PUBLIC_URL', async () => {
    const res = await fetch(`${registry}${PKG.replace('/', '%2f')}`, { headers: { authorization: `Bearer ${token}` } });
    const tarball = (await res.json()).versions['1.0.0'].dist.tarball;
    assert.ok(tarball.startsWith(registry), tarball);
  });

  await t.test('stack: backup → wipe → restore keeps packages and existing tokens', async () => {
    // A local S3 server on the stack's network stands in for R2.
    const network = `${PROJECT}_default`;
    const s3 = `${PROJECT}-s3`;
    const s3Dir = path.join(TMP, 's3');
    fs.mkdirSync(path.join(s3Dir, 'backups'), { recursive: true });
    cleanups.push(() => run('docker', ['rm', '-f', s3]));
    const started = await run('docker', ['run', '-d', '--name', s3, '--network', network, '-v', `${s3Dir}:/data`,
      'rclone/rclone:1.75.1', 'serve', 's3', '/data', '--addr', ':8080', '--auth-key', 'e2e-access,e2e-secret']);
    assert.equal(started.code, 0, started.stderr);
    const backupEnv = path.join(TMP, 'backup.env');
    fs.writeFileSync(backupEnv, [
      `S3_ENDPOINT=http://${s3}:8080`, 'S3_PROVIDER=Other', 'S3_BUCKET=backups',
      'S3_ACCESS_KEY_ID=e2e-access', 'S3_SECRET_ACCESS_KEY=e2e-secret', 'BACKUP_KEEP_DAYS=30', '',
    ].join('\n'), { mode: 0o600 });
    const scriptEnv = stackEnv({
      ZEN_BACKUP_ENV: backupEnv, ZEN_STORAGE_VOLUME: `${PROJECT}_storage`, ZEN_BACKUP_NETWORK: network,
    });
    await new Promise((r) => setTimeout(r, 1000)); // let rclone bind

    const backup = await run('bash', [path.join(DEPLOY, 'backup.sh')], { cwd: DEPLOY, env: scriptEnv, timeout: 300_000 });
    assert.equal(backup.code, 0, backup.stderr + backup.stdout);
    const saved = fs.readdirSync(path.join(s3Dir, 'backups', 'registry'));
    assert.equal(saved.length, 1, String(saved));

    // Lose the data: empty the storage volume.
    const wipe = await run('docker', ['run', '--rm', '-v', `${PROJECT}_storage:/data`, 'alpine:3.24.2', 'sh', '-c', 'find /data -mindepth 1 -delete']);
    assert.equal(wipe.code, 0, wipe.stderr);
    await stack.compose('restart', 'registry');
    await waitFor(`${registry}-/ping`, { log: () => '' });
    const gone = await fetch(`${registry}${PKG.replace('/', '%2f')}`, { headers: { authorization: `Bearer ${token}` } });
    assert.notEqual(gone.status, 200, 'the wipe should lose the package (and the token secret)');

    const restore = await run('bash', [path.join(DEPLOY, 'restore.sh'), 'latest'], {
      cwd: DEPLOY, env: { ...scriptEnv, COMPOSE_FILE: path.join(DEPLOY, 'docker-compose.yml') }, timeout: 300_000,
    });
    assert.equal(restore.code, 0, restore.stderr + restore.stdout);
    await waitFor(`${registry}-/ping`, { log: () => '' });
    const withToken = await install(registry, `:_authToken=${token}`, 'install-after-restore');
    assert.equal(withToken.code, 0, withToken.stderr);
  });
});

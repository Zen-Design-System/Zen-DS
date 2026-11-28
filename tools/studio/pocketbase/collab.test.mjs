// Zen Studio collaboration, GĐ 1: the API rules of pb_migrations/1795800000_studio_collab.js against a real PocketBase
// (the repo's pinned binary, tools/registry/scripts/fetch-pocketbase.mjs), never the live instance. Throwaway users and
// passwords made here, a temp data folder, 127.0.0.1 only.
// Run: node --test tools/studio/pocketbase/collab.test.mjs   (ZEN_PB_BIN=<path> for another binary; skipped without one)
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import { pocketbaseBin } from "../../registry/scripts/fetch-pocketbase.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const bin = process.env.ZEN_PB_BIN || pocketbaseBin;
const skip = existsSync(bin) ? false : `no PocketBase binary at ${bin} (node tools/registry/scripts/fetch-pocketbase.mjs fetches the pinned one)`;

const secret = () => randomBytes(12).toString("hex");
const freePort = () => new Promise((resolve) => { const server = createServer(); server.listen(0, "127.0.0.1", () => { const { port } = server.address(); server.close(() => resolve(port)); }); });
const run = (args) => new Promise((resolve) => { const child = spawn(bin, args, { stdio: "ignore" }); child.on("exit", (code) => resolve(code)); });

let base = "";
let proc = null;
let dataDir = "";
const tokens = {};

async function call(who, method, path, body) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(who && tokens[who] ? { authorization: tokens[who] } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}
const ok = (reply, what) => { assert.ok(reply.status >= 200 && reply.status < 300, `${what}: ${reply.status} ${JSON.stringify(reply.body)}`); return reply.body; };
const refused = (reply, what) => assert.ok(reply.status >= 400, `${what} should be refused, got ${reply.status} ${JSON.stringify(reply.body)}`);

const people = {};
before(async () => {
  if (skip) return;
  dataDir = mkdtempSync(join(tmpdir(), "zen-studio-collab-"));
  const dirs = ["--dir", join(dataDir, "pb_data"), "--migrationsDir", join(here, "pb_migrations")];
  const su = { email: "su@studio-collab.test", password: secret() };
  assert.equal(await run(["superuser", "upsert", su.email, su.password, ...dirs]), 0, "superuser upsert");
  const port = await freePort();
  base = `http://127.0.0.1:${port}`;
  proc = spawn(bin, ["serve", `--http=127.0.0.1:${port}`, ...dirs], { stdio: "ignore" });
  for (let tries = 0; tries < 100; tries += 1) {
    try { if ((await fetch(`${base}/api/health`)).ok) break; } catch { /* not up yet */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  tokens.su = ok(await call(null, "POST", "/api/collections/_superusers/auth-with-password", { identity: su.email, password: su.password }), "superuser sign-in").token;
  // alice and bob hold seats, carol does not.
  for (const name of ["alice", "bob", "carol"]) {
    const email = `${name}@studio-collab.test`;
    const password = secret();
    const record = ok(await call("su", "POST", "/api/collections/users/records", { email, password, passwordConfirm: password, verified: true, name }), `create ${name}`);
    people[name] = { id: record.id, email };
    tokens[name] = ok(await call(null, "POST", "/api/collections/users/auth-with-password", { identity: email, password }), `${name} signs in`).token;
  }
  for (const name of ["alice", "bob"]) ok(await call("su", "POST", "/api/collections/studio_seats/records", { email: people[name].email }), `seat for ${name}`);
});

after(() => {
  proc?.kill();
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
});

const list = async (who, collection) => (await call(who, "GET", `/api/collections/${collection}/records`)).body?.items ?? [];

test("seats: a person sees their own seat only, and cannot give themselves one", { skip }, async () => {
  assert.deepEqual((await list("alice", "studio_seats")).map((seat) => seat.email), [people.alice.email]);
  assert.deepEqual(await list("carol", "studio_seats"), []);
  refused(await call("carol", "POST", "/api/collections/studio_seats/records", { email: people.carol.email }), "carol makes herself a seat");
});

test("projects and members: the owner shares, members see, roles hold on the server", { skip }, async () => {
  refused(await call("carol", "POST", "/api/collections/studio_projects/records", { name: "No seat", owner: people.carol.id, owner_email: people.carol.email, local_id: "no-seat" }), "a project without a seat");
  refused(await call("bob", "POST", "/api/collections/studio_projects/records", { name: "For alice", owner: people.alice.id, owner_email: people.alice.email, local_id: "x" }), "a project owned by someone else");
  const project = ok(await call("alice", "POST", "/api/collections/studio_projects/records", { name: "Shop", owner: people.alice.id, owner_email: people.alice.email, local_id: "shop" }), "alice shares Shop");
  refused(await call("alice", "POST", "/api/collections/studio_projects/records", { name: "Shop", owner: people.alice.id, owner_email: people.alice.email, local_id: "shop" }), "the same local project shared twice");
  refused(await call("alice", "POST", "/api/collections/studio_projects/records", { name: "Fake", owner: people.alice.id, owner_email: people.bob.email, local_id: "fake" }), "a project under another email");
  assert.equal((await list("bob", "studio_projects")).length, 0, "bob sees nothing before the invite");
  refused(await call(null, "GET", `/api/collections/studio_projects/records/${project.id}`), "signed out");

  const bob = ok(await call("alice", "POST", "/api/collections/studio_members/records", { project: project.id, email: people.bob.email, role: "viewer", invited_by: people.alice.id }), "alice invites bob");
  assert.deepEqual((await list("bob", "studio_projects")).map((item) => item.name), ["Shop"], "bob sees Shop once invited");
  assert.equal((await list("bob", "studio_members")).length, 1, "bob sees the members");
  refused(await call("bob", "POST", "/api/collections/studio_members/records", { project: project.id, email: "dave@studio-collab.test", role: "editor" }), "a member invites");
  refused(await call("bob", "PATCH", `/api/collections/studio_members/records/${bob.id}`, { role: "editor" }), "bob makes himself an editor");
  refused(await call("bob", "PATCH", `/api/collections/studio_projects/records/${project.id}`, { name: "Mine" }), "a member renames the project");
  refused(await call("bob", "DELETE", `/api/collections/studio_projects/records/${project.id}`), "a member deletes the project");

  ok(await call("alice", "PATCH", `/api/collections/studio_members/records/${bob.id}`, { role: "editor" }), "alice makes bob an editor");
  refused(await call("alice", "PATCH", `/api/collections/studio_members/records/${bob.id}`, { email: "eve@studio-collab.test" }), "an invite moved to another email");
  refused(await call("bob", "POST", "/api/collections/studio_members/records", { project: project.id, email: "dave@studio-collab.test", role: "viewer" }), "an editor invites (owner only)");
  refused(await call("alice", "PATCH", `/api/collections/studio_projects/records/${project.id}`, { owner: people.bob.id }), "the owner gives the project away");
  ok(await call("alice", "PATCH", `/api/collections/studio_projects/records/${project.id}`, { name: "Shop 2" }), "alice renames");

  // A seatless invitee sees nothing, even invited.
  ok(await call("alice", "POST", "/api/collections/studio_members/records", { project: project.id, email: people.carol.email, role: "viewer" }), "alice invites carol");
  assert.equal((await list("carol", "studio_projects")).length, 0, "carol has no seat");
  refused(await call("alice", "POST", "/api/collections/studio_members/records", { project: project.id, email: people.bob.email, role: "viewer" }), "bob invited twice");

  // A member leaves; then the project is gone for them.
  ok(await call("bob", "DELETE", `/api/collections/studio_members/records/${bob.id}`), "bob leaves");
  assert.equal((await list("bob", "studio_projects")).length, 0, "bob no longer sees Shop");
  // Deleting the project takes its members with it.
  ok(await call("alice", "DELETE", `/api/collections/studio_projects/records/${project.id}`), "alice deletes Shop");
  assert.equal((await list("su", "studio_members")).length, 0, "its members went with it");
});

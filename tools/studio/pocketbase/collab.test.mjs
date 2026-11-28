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
  // alice, bob and dave hold seats, carol does not.
  for (const name of ["alice", "bob", "carol", "dave"]) {
    const email = `${name}@studio-collab.test`;
    const password = secret();
    const record = ok(await call("su", "POST", "/api/collections/users/records", { email, password, passwordConfirm: password, verified: true, name }), `create ${name}`);
    people[name] = { id: record.id, email };
    tokens[name] = ok(await call(null, "POST", "/api/collections/users/auth-with-password", { identity: email, password }), `${name} signs in`).token;
  }
  for (const name of ["alice", "bob", "dave"]) ok(await call("su", "POST", "/api/collections/studio_seats/records", { email: people[name].email }), `seat for ${name}`);
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

test("GĐ 2: pages, photos, comments and theme follow the roles, and an old version never overwrites a newer one", { skip }, async () => {
  const project = ok(await call("alice", "POST", "/api/collections/studio_projects/records", { name: "Book", owner: people.alice.id, owner_email: people.alice.email, local_id: "book", data: { name: "Book" } }), "alice shares Book");
  ok(await call("alice", "POST", "/api/collections/studio_members/records", { project: project.id, email: people.bob.email, role: "viewer" }), "bob, Can view");
  ok(await call("alice", "POST", "/api/collections/studio_members/records", { project: project.id, email: people.dave.email, role: "editor" }), "dave, Can edit");

  // Pages: the owner and editors write, a viewer reads only; each save names the version it was made on.
  const page = ok(await call("dave", "POST", "/api/collections/studio_pages/records", { project: project.id, page_id: "home", title: "Home", text: "v1", version: 1, updated_by: people.dave.id }), "dave makes Home");
  refused(await call("bob", "POST", "/api/collections/studio_pages/records", { project: project.id, page_id: "bob", title: "Bob", text: "x", version: 1, updated_by: people.bob.id }), "a viewer makes a page");
  refused(await call("bob", "PATCH", `/api/collections/studio_pages/records/${page.id}`, { text: "bob was here", base_version: 1, version: 2, updated_by: people.bob.id }), "a viewer saves a page");
  refused(await call("dave", "POST", "/api/collections/studio_pages/records", { project: project.id, page_id: "late", title: "Late", text: "x", version: 3, updated_by: people.dave.id }), "a new page that does not start at 1");
  refused(await call("dave", "PATCH", `/api/collections/studio_pages/records/${page.id}`, { text: "as alice", base_version: 1, version: 2, updated_by: people.alice.id }), "a save in someone else's name");
  ok(await call("dave", "PATCH", `/api/collections/studio_pages/records/${page.id}`, { text: "v2", base_version: 1, version: 2, updated_by: people.dave.id }), "dave saves on version 1");
  refused(await call("alice", "PATCH", `/api/collections/studio_pages/records/${page.id}`, { text: "alice on v1", base_version: 1, version: 2, updated_by: people.alice.id }), "alice saves on the old version 1");
  ok(await call("alice", "PATCH", `/api/collections/studio_pages/records/${page.id}`, { text: "v3", base_version: 2, version: 3, updated_by: people.alice.id }), "alice saves on version 2");
  refused(await call("dave", "PATCH", `/api/collections/studio_pages/records/${page.id}`, { page_id: "moved", base_version: 3, version: 4, updated_by: people.dave.id }), "a page moved to another id");
  assert.deepEqual((await list("bob", "studio_pages")).map((item) => [item.page_id, item.text, item.version]), [["home", "v3", 3]], "bob reads the newest");
  assert.equal((await list("carol", "studio_pages")).length, 0, "carol reads nothing");

  // Comments: every member writes them, versioned the same way.
  const thread = ok(await call("bob", "POST", "/api/collections/studio_comments/records", { project: project.id, page_id: "home", data: { threads: [] }, version: 1 }), "bob comments");
  ok(await call("dave", "PATCH", `/api/collections/studio_comments/records/${thread.id}`, { data: { threads: [1] }, base_version: 1, version: 2 }), "dave answers");
  refused(await call("bob", "PATCH", `/api/collections/studio_comments/records/${thread.id}`, { data: { threads: [] }, base_version: 1, version: 2 }), "bob's comments on the old version");
  refused(await call("carol", "POST", "/api/collections/studio_comments/records", { project: project.id, page_id: "x", data: {}, version: 1 }), "carol comments");

  // Photos: editors upload, members read.
  const upload = async (who, assetId) => {
    const form = new FormData();
    form.set("project", project.id);
    form.set("asset_id", assetId);
    form.set("file", new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), `${assetId}`);
    const response = await fetch(`${base}/api/collections/studio_assets/records`, { method: "POST", headers: { authorization: tokens[who] }, body: form });
    return { status: response.status, body: await response.json().catch(() => null) };
  };
  ok(await upload("dave", "photo-abc.png"), "dave uploads a photo");
  refused(await upload("bob", "photo-def.png"), "a viewer uploads a photo");
  refused(await upload("dave", "photo-abc.png"), "the same photo twice");
  assert.equal((await list("bob", "studio_assets")).length, 1, "bob sees the photo");

  // Theme: the owner's.
  ok(await call("alice", "PATCH", `/api/collections/studio_projects/records/${project.id}`, { data: { name: "Book", theme: "warm" } }), "alice changes the theme");
  refused(await call("dave", "PATCH", `/api/collections/studio_projects/records/${project.id}`, { data: { name: "Book", theme: "cold" } }), "an editor changes the theme");

  // Deleting for good is the owner's; an editor trashes with a save.
  refused(await call("dave", "DELETE", `/api/collections/studio_pages/records/${page.id}`), "an editor deletes a page for good");
  ok(await call("dave", "PATCH", `/api/collections/studio_pages/records/${page.id}`, { trashed: true, base_version: 3, version: 4, updated_by: people.dave.id }), "dave trashes Home");
  ok(await call("alice", "DELETE", `/api/collections/studio_pages/records/${page.id}`), "alice deletes Home");
});

// Selftest of tools/studio/projects-folder.mjs: node tools/studio/projects-folder.selftest.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { projectsFolder } from "./projects-folder.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "zen-projects-"));
const folder = projectsFolder(root);
let checks = 0;
const ok = async (fn) => { await fn(); checks += 1; };

try {
  await ok(async () => assert.deepEqual(await folder.list(), []));
  const { project, errors } = await folder.write({ id: "acme", name: "Acme", theme: { primary: { hex: "#4f46e5" }, modes: { density: "comfortable", radius: "nope" } } });
  await ok(() => assert.equal(project.theme.primary.hex, "#4F46E5"));
  await ok(() => assert.equal(errors.length, 1));
  await ok(() => assert.ok(fs.existsSync(path.join(root, ".zen-studio/projects/acme/project.json"))));
  await ok(() => assert.match(fs.readFileSync(path.join(root, ".zen-studio/projects/acme/theme.css"), "utf8"), /\[data-brand="p-acme"\]/));
  await ok(async () => assert.equal((await folder.read("acme")).project.theme.modes.density, "comfortable"));
  await ok(async () => assert.equal((await folder.list()).length, 1));
  await ok(() => assert.rejects(folder.write({ id: "../x", name: "x" }), /id/));
  await ok(() => assert.rejects(folder.read("missing"), /No project/));
  // A link is refused on the way.
  fs.mkdirSync(path.join(root, "elsewhere"));
  fs.symlinkSync(path.join(root, "elsewhere"), path.join(root, ".zen-studio/projects/linked"));
  await ok(() => assert.rejects(folder.write({ id: "linked", name: "Linked" }), /link/));
  await ok(async () => assert.equal((await folder.list()).length, 1));
  const trashed = await folder.trash("acme");
  await ok(() => assert.ok(trashed.trashed && trashed.to.startsWith(".zen-studio/trash/projects/acme-")));
  await ok(async () => assert.equal((await folder.trash("acme")).trashed, false));
  console.log(`projects-folder selftest: ${checks} checks passed`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

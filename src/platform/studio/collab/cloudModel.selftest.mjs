#!/usr/bin/env node
// Self-test of the cloud copy's rules (./cloudModel.ts, imported directly: Node strips the types), with pageModel's hash.
// Run: node src/platform/studio/collab/cloudModel.selftest.mjs
import { textHash } from "../builder/store/pageModel.ts";
import { agreedOn, canWritePages, localPageOf, localProjectOf, planCloudSync } from "./cloudModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const owner = { id: "c1", localId: "shop", access: "owner" };
const editor = { ...owner, access: "editor" };
const viewer = { ...owner, access: "viewer" };
const row = (pageId, version, extra = {}) => ({ id: `r-${pageId}`, pageId, title: pageId, version, trashed: false, ...extra });
const known = (entries) => new Map(entries.map(([id, record, version, text]) => [id, agreedOn(record, version, text, textHash)]));
const kinds = (steps) => steps.map((step) => `${step.kind}:${step.id}`);

check("owner keeps its ids", [localProjectOf(owner), localPageOf(owner, row("home", 1))], ["shop", "home"]);
check("a member's ids are the cloud's", [localProjectOf(editor), localPageOf(editor, row("home", 1))], ["shared-c1", "cloud-r-home"]);
check("who writes", [canWritePages(owner), canWritePages(editor), canWritePages(viewer)], [true, true, false]);

// A member's first sync: every live cloud page comes down, trashed ones do not.
check("first sync pulls", kinds(planCloudSync(editor, [row("home", 3), row("old", 2, { trashed: true })], [], new Map(), textHash)), ["pull:cloud-r-home"]);
// Agreed on v2; the cloud has v3, this copy is unchanged: pull.
check("cloud newer: pull", kinds(planCloudSync(owner, [row("home", 3)], [{ id: "home", text: "a", trashed: false }], known([["home", "r-home", 2, "a"]]), textHash)), ["pull:home"]);
// This copy changed, the cloud did not: push on the agreed version.
const pushed = planCloudSync(owner, [row("home", 2)], [{ id: "home", text: "b", trashed: false }], known([["home", "r-home", 2, "a"]]), textHash);
check("local newer: push", kinds(pushed), ["push:home"]);
check("push names the agreed version", pushed[0].known.version, 2);
// Both changed: conflict (the cloud's wins, this copy goes to Version history).
check("both changed: conflict", kinds(planCloudSync(owner, [row("home", 3)], [{ id: "home", text: "b", trashed: false }], known([["home", "r-home", 2, "a"]]), textHash)), ["conflict:home"]);
// A viewer's copy never goes up: a changed copy is put back.
check("a viewer is put back", kinds(planCloudSync(viewer, [row("home", 2)], [{ id: "cloud-r-home", text: "b", trashed: false }], known([["cloud-r-home", "r-home", 2, "a"]]), textHash)), ["pull:cloud-r-home"]);
// Nothing changed: nothing to do.
check("in step: nothing", planCloudSync(owner, [row("home", 2)], [{ id: "home", text: "a", trashed: false }], known([["home", "r-home", 2, "a"]]), textHash), []);
// A page made here: created in the cloud by a writer, not by a viewer.
check("new page: create", kinds(planCloudSync(owner, [], [{ id: "about", text: "x", trashed: false }], new Map(), textHash)), ["create:about"]);
check("a viewer's new page stays here", planCloudSync(viewer, [], [{ id: "mine", text: "x", trashed: false }], new Map(), textHash), []);
// Gone from the cloud after agreeing: trashed here.
check("deleted there: trash here", kinds(planCloudSync(owner, [], [{ id: "home", text: "a", trashed: false }], known([["home", "r-home", 2, "a"]]), textHash)), ["trash-local:home"]);
// Trashed there while unchanged here: trash here; trashed there while changed here: conflict.
check("trashed there", kinds(planCloudSync(owner, [row("home", 3, { trashed: true })], [{ id: "home", text: "a", trashed: false }], known([["home", "r-home", 2, "a"]]), textHash)), ["trash-local:home"]);
check("trashed there, changed here", kinds(planCloudSync(owner, [row("home", 3, { trashed: true })], [{ id: "home", text: "b", trashed: false }], known([["home", "r-home", 2, "a"]]), textHash)), ["conflict:home"]);
// Trashed here: the trash goes up as a save.
check("trashed here: push", kinds(planCloudSync(owner, [row("home", 2)], [{ id: "home", text: "a", trashed: true }], known([["home", "r-home", 2, "a"]]), textHash)), ["push:home"]);
// The same page on both sides without an agreement (a second browser): conflict, never a silent overwrite.
check("both have it, never agreed: conflict", kinds(planCloudSync(owner, [row("home", 2)], [{ id: "home", text: "a", trashed: false }], new Map(), textHash)), ["conflict:home"]);

if (failures.length) {
  console.error(`cloudModel selftest: ${failures.length} failed, ${passed} passed\n${failures.map((line) => `✗ ${line}`).join("\n")}`);
  process.exit(1);
}
console.log(`cloudModel selftest: ${passed} passed`);

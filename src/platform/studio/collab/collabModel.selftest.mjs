#!/usr/bin/env node
// Self-test of the collaboration rules the UI shares (./collabModel.ts, imported directly: Node strips the types).
// Run: node src/platform/studio/collab/collabModel.selftest.mjs
import { accessOf, effectiveRole, normalizeEmail, parseEmails, roleCeiling, shareLink, sortMembers } from "./collabModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

check("email trimmed and lower case", normalizeEmail("  Bich@Zen.Studio "), "bich@zen.studio");
check("not an email", normalizeEmail("bich@"), null);
check("several emails, once each, the rest named", parseEmails("a@x.io, B@x.io;a@x.io\nnope"), { emails: ["a@x.io", "b@x.io"], invalid: ["nope"] });

const members = [{ email: "bob@x.io", role: "viewer" }, { email: "cy@x.io", role: "editor" }];
check("the owner", accessOf("u1", members, { id: "u1", email: "al@x.io" }), "owner");
check("a viewer, by email in any case", accessOf("u1", members, { id: "u2", email: "Bob@X.io" }), "viewer");
check("an editor", accessOf("u1", members, { id: "u3", email: "cy@x.io" }), "editor");
check("not in it", accessOf("u1", members, { id: "u4", email: "dee@x.io" }), null);
check("signed out", accessOf("u1", members, null), null);

check("a viewer's ceiling", roleCeiling("viewer"), "viewer");
check("an editor's ceiling", roleCeiling("editor"), "admin");
check("not shared: the Studio's own rules", roleCeiling(null), "admin");
check("a viewer never edits", effectiveRole("admin", "viewer"), "viewer");
check("an editor may still pick Can view", effectiveRole("viewer", "admin"), "viewer");
check("an editor edits", effectiveRole("admin", "admin"), "admin");

check("share link", shareLink("https://studio.dizai.studio", "/studio.html?page=x", "abc123"), "https://studio.dizai.studio/studio.html?shared=abc123");
check("owner first, then by email", sortMembers([{ email: "z@x.io", access: "viewer" }, { email: "o@x.io", access: "owner" }, { email: "a@x.io", access: "editor" }]).map((person) => person.email), ["o@x.io", "a@x.io", "z@x.io"]);

if (failures.length) {
  console.error(`collabModel selftest: ${failures.length} failed, ${passed} passed\n${failures.map((line) => `✗ ${line}`).join("\n")}`);
  process.exit(1);
}
console.log(`collabModel selftest: ${passed} passed`);

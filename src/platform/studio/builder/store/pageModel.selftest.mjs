#!/usr/bin/env node
// Self-test of the builder PageStore's pure rules (./pageModel.ts, imported directly: Node strips the types): header
// title, ids, hash, revisions, Trash, and the sync plan with a folder mirror.
// Run: node src/platform/studio/builder/store/pageModel.selftest.mjs
import { headerTitle, idFromFileName, keepsRevision, planSync, REVISION_GAP_MS, slugOf, textHash, trashDaysLeft, trashExpired, TRASH_MS, withHeaderTitle } from "./pageModel.ts";

const failures = [];
let passed = 0;
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};

const page = (title) => `// @zen-page {"format":1,"title":${JSON.stringify(title)}}\nimport { Board } from "@zen/design-system/builder";\n`;

// Header
check("title read", headerTitle(page("Checkout")), "Checkout");
check("no header", headerTitle("export default 1;\n"), null);
check("rename keeps the rest byte for byte", withHeaderTitle(page("A"), "Thanh toán"), page("Thanh toán"));
check("rename keeps other header keys", withHeaderTitle('// @zen-page {"format":1,"title":"A","x":2}\r\nrest', "B"), '// @zen-page {"format":1,"title":"B","x":2}\r\nrest');
check("rename without a header", withHeaderTitle("abc", "B"), "abc");

// Ids
check("slug", slugOf("Đơn hàng — Checkout!"), "don-hang-checkout");
check("slug of nothing", slugOf("!!!"), "page");
check("id from file", idFromFileName("checkout.zen.tsx"), "checkout");
check("id from a .tsx", idFromFileName("cart-2.tsx"), "cart-2");
check("bad file name", idFromFileName("My Page.zen.tsx"), null);

// Hash
check("hash is stable", textHash("abc"), textHash("abc"));
check("hash differs", textHash("abc") === textHash("abd"), false);

// Revisions and Trash
const now = 10_000_000_000;
check("rename always keeps a revision", keepsRevision("rename", now, now), true);
check("first edit keeps one", keepsRevision("edit", null, now), true);
check("edit in a burst does not", keepsRevision("edit", now - 1000, now), false);
check("edit after the gap does", keepsRevision("edit", now - REVISION_GAP_MS, now), true);
check("trash not expired", trashExpired(now - TRASH_MS + 1, now), false);
check("trash expired", trashExpired(now - TRASH_MS, now), true);
check("days left", trashDaysLeft(now, now), 30);
check("days left at the end", trashDaysLeft(now - TRASH_MS - 5, now), 0);

// Sync
const M = "dev:/repo";
const h = textHash;
const kinds = (steps) => steps.map((step) => `${step.kind}:${step.id}${step.reason ? `:${step.reason}` : ""}`);
check("new in the folder is taken", kinds(planSync([], [{ id: "a", text: "A", mtime: 1 }], M)), ["take:a:new"]);
check("same text is marked", kinds(planSync([{ id: "a", text: "A" }], [{ id: "a", text: "A", mtime: 1 }], M)), ["mark:a"]);
check("same text already synced: nothing", kinds(planSync([{ id: "a", text: "A", sync: { mirror: M, hash: h("A") } }], [{ id: "a", text: "A", mtime: 1 }], M)), []);
check("folder changed", kinds(planSync([{ id: "a", text: "A", sync: { mirror: M, hash: h("A") } }], [{ id: "a", text: "A2", mtime: 1 }], M)), ["take:a:folder"]);
check("browser changed", kinds(planSync([{ id: "a", text: "A2", sync: { mirror: M, hash: h("A") } }], [{ id: "a", text: "A", mtime: 1 }], M)), ["push:a"]);
check("both changed: folder wins, conflict", kinds(planSync([{ id: "a", text: "A2", sync: { mirror: M, hash: h("A") } }], [{ id: "a", text: "A3", mtime: 1 }], M)), ["take:a:conflict"]);
check("never synced and different: conflict", kinds(planSync([{ id: "a", text: "A2" }], [{ id: "a", text: "A3", mtime: 1 }], M)), ["take:a:conflict"]);
check("only here, never synced: pushed", kinds(planSync([{ id: "a", text: "A" }], [], M)), ["push:a"]);
check("only here, synced before: removed in the folder → Trash", kinds(planSync([{ id: "a", text: "A", sync: { mirror: M, hash: h("A") } }], [], M)), ["trash-local:a"]);
check("synced with another mirror: pushed", kinds(planSync([{ id: "a", text: "A", sync: { mirror: "folder:x", hash: h("A") } }], [], M)), ["push:a"]);
check("trashed here, still in the folder", kinds(planSync([{ id: "a", text: "A", trashedAt: 5 }], [{ id: "a", text: "A", mtime: 1 }], M)), ["trash-remote:a"]);
check("trashed here, gone there: nothing", kinds(planSync([{ id: "a", text: "A", trashedAt: 5 }], [], M)), []);

if (failures.length) {
  console.error(`pageModel selftest: ${failures.length} failed, ${passed} passed\n${failures.map((line) => `✗ ${line}`).join("\n")}`);
  process.exit(1);
}
console.log(`pageModel selftest: ${passed} passed`);

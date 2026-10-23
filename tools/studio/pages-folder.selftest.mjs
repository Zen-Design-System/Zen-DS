// Selftest for pages-folder.mjs (Studio builder GĐ2 M2): list / read / write / trash in a temp root, id and link
// checks, the size limit, the dialect check before a write. Run: node tools/studio/pages-folder.selftest.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { MAX_PAGE, PAGES_DIR, pagesFolder } from "./pages-folder.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "zen-pages-"));
let passed = 0;
const test = async (name, fn) => {
  try {
    await fn();
    passed += 1;
  } catch (error) {
    console.error(`✗ ${name}\n  ${error.stack ?? error}`);
    process.exitCode = 1;
  }
};
const rejects = (promise, code) => assert.rejects(promise, (error) => error.code === code);

const folder = pagesFolder(root, { validate: (text) => (text.includes("BAD") ? [{ line: 1, message: "bad" }] : []) });
const text = '// @zen-page {"format":1,"title":"A"}\nexport default function Page() { return null; }\n';

await test("an empty root lists nothing", async () => assert.deepEqual(await folder.list(), []));
await test("write then read gives the same text, byte for byte", async () => {
  await folder.write("alpha", text);
  assert.equal((await folder.read("alpha")).text, text);
  assert.equal(fs.readFileSync(path.join(root, PAGES_DIR, "alpha.zen.tsx"), "utf8"), text);
});
await test("list returns pages with text and mtime, skipping other files", async () => {
  fs.writeFileSync(path.join(root, PAGES_DIR, "notes.txt"), "x");
  fs.writeFileSync(path.join(root, PAGES_DIR, "Bad_Name.zen.tsx"), text);
  const pages = await folder.list();
  assert.deepEqual(pages.map((page) => page.id), ["alpha"]);
  assert.equal(typeof pages[0].mtime, "number");
});
await test("bad ids are refused", async () => {
  await rejects(folder.write("../x", text), "invalid");
  await rejects(folder.read("A"), "invalid");
  await rejects(folder.write("", text), "invalid");
});
await test("an invalid page is not written", async () => {
  await rejects(folder.write("beta", "BAD"), "invalid");
  assert.equal(fs.existsSync(path.join(root, PAGES_DIR, "beta.zen.tsx")), false);
});
await test("a page over the limit is refused", async () => rejects(folder.write("big", "x".repeat(MAX_PAGE + 1)), "invalid"));
await test("a link is neither read nor written", async () => {
  const outside = path.join(root, "outside.txt");
  fs.writeFileSync(outside, "secret");
  fs.symlinkSync(outside, path.join(root, PAGES_DIR, "link.zen.tsx"));
  await rejects(folder.read("link"), "forbidden");
  await rejects(folder.write("link", text), "forbidden");
  assert.equal(fs.readFileSync(outside, "utf8"), "secret");
  assert.deepEqual((await folder.list()).map((page) => page.id), ["alpha"]);
});
await test("a missing page reads as not-found", async () => rejects(folder.read("gamma"), "not-found"));
await test("trash moves the file, never deletes it", async () => {
  const result = await folder.trash("alpha");
  assert.equal(result.trashed, true);
  assert.equal(fs.existsSync(path.join(root, PAGES_DIR, "alpha.zen.tsx")), false);
  assert.equal(fs.readFileSync(path.join(root, result.to), "utf8"), text);
  assert.equal((await folder.trash("alpha")).trashed, false);
});

// Uploaded photos in assets/ (2026-10-08): bytes kept as they are, ids checked, the size limit, never listed as pages,
// trash moves them; a missing one reads as null.
await test("photos: write then read gives the same bytes; trash moves them", async () => {
  const bytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  await folder.writeAsset("team-1a2b3c4d.png", bytes);
  assert.deepEqual(new Uint8Array(await folder.readAsset("team-1a2b3c4d.png")), bytes);
  assert.equal(await folder.readAsset("other-00000000.png"), null);
  assert.ok((await folder.list()).every((page) => page.id !== "assets"));
  assert.equal((await folder.trashAsset("team-1a2b3c4d.png")).trashed, true);
  assert.equal(await folder.readAsset("team-1a2b3c4d.png"), null);
  assert.equal(fs.readdirSync(path.join(root, ".zen-studio/trash/assets")).length, 1);
});
await test("photos: bad ids, a non-image extension and an oversized one are refused", async () => {
  await rejects(folder.writeAsset("../x.png", new Uint8Array([1])), "invalid");
  await rejects(folder.writeAsset("page.zen.tsx", new Uint8Array([1])), "invalid");
  await rejects(folder.writeAsset("big-00000000.png", new Uint8Array(5 * 1024 * 1024 + 1)), "invalid");
});

// A page's comments beside it (docs/research/studio-comments-spec-2026-10-22.md): none reads as null, a valid file is
// written and read back, an invalid one is refused, never listed as a page, and it goes to the trash with its page.
await test("comments: write then read beside the page; refused when not valid; trashed with the page", async () => {
  const comments = { format: 1, threads: [{ id: "t-1", anchor: { x: 10, y: 20 }, resolved: false, resolvedAt: 0, comments: [{ id: "c-1", author: { name: "Vu", color: "violet" }, text: "Hi", at: 1 }] }] };
  await folder.write("gamma", text);
  assert.equal(await folder.readComments("gamma"), null);
  assert.equal((await folder.writeComments("gamma", comments)).threads, 1);
  assert.deepEqual(await folder.readComments("gamma"), comments);
  assert.ok(fs.existsSync(path.join(root, PAGES_DIR, "gamma.comments.json")));
  assert.ok((await folder.list()).every((page) => !page.id.includes("comments")));
  await rejects(folder.writeComments("gamma", { format: 1, threads: [{ id: "t" }] }), "invalid");
  await rejects(folder.writeComments("../x", comments), "invalid");
  await folder.trash("gamma");
  assert.equal(await folder.readComments("gamma"), null);
  assert.ok(fs.readdirSync(path.join(root, ".zen-studio/trash")).some((name) => name.startsWith("gamma-") && name.endsWith(".comments.json")));
});
// A page's Figma bases (page-figma.mjs, P6b leftover): written and read back for another browser, an invalid file is
// refused, never listed as a page, and it goes to the trash with its page.
await test("figma bases: write then read beside the page; refused when not valid; trashed with the page", async () => {
  const doc = (title) => ({ header: { format: 1, title }, board: { id: "board", children: [] } });
  const figma = { format: 1, exports: [{ version: "a1b2c3d4e5f6", at: 1, base: doc("pull"), synced: doc("page") }] };
  await folder.write("delta", text);
  assert.equal(await folder.readFigma("delta"), null);
  assert.equal((await folder.writeFigma("delta", figma)).exports, 1);
  assert.deepEqual(await folder.readFigma("delta"), figma);
  assert.ok(fs.existsSync(path.join(root, PAGES_DIR, "delta.figma.json")));
  assert.ok((await folder.list()).every((page) => !page.id.includes("figma")));
  await rejects(folder.writeFigma("delta", { format: 1, exports: [{ version: "x" }] }), "invalid");
  await rejects(folder.writeFigma("../x", figma), "invalid");
  await folder.trash("delta");
  assert.equal(await folder.readFigma("delta"), null);
  assert.ok(fs.readdirSync(path.join(root, ".zen-studio/trash")).some((name) => name.startsWith("delta-") && name.endsWith(".figma.json")));
});

fs.rmSync(root, { recursive: true, force: true });
console.log(`pages-folder selftest: ${passed} passed${process.exitCode ? ", some failed" : ""}`);

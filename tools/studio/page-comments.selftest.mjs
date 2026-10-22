// node tools/studio/page-comments.selftest.mjs — a page's comments (page-comments.mjs): the model, the merge, the checks.
import assert from "node:assert/strict";
import { addThread, deleteComment, deleteThread, editComment, emptyComments, mergeComments, reply, resolve, validateComments, visibleThreads } from "./page-comments.mjs";

let count = 0;
const test = (name, run) => { run(); count += 1; };
const vu = { name: "Vu", color: "violet" };
const an = { name: "An", color: "cyan" };
const first = addThread(emptyComments(), { id: "t-1", anchor: { frame: "screen:home", x: 120, y: 64 }, comment: { id: "c-1", author: vu, text: "Bigger title?", at: 100 } });

test("a new thread holds its first comment and is open", () => {
  assert.equal(first.threads.length, 1);
  assert.deepEqual([first.threads[0].resolved, first.threads[0].comments.map((comment) => comment.text)], [false, ["Bigger title?"]]);
  assert.deepEqual(validateComments(first), []);
});
test("functions never change the document they are given", () => {
  const before = JSON.stringify(first);
  reply(first, "t-1", { id: "c-2", author: an, text: "Yes", at: 200 });
  resolve(first, "t-1", true, 300);
  assert.equal(JSON.stringify(first), before);
});
test("a reply, an edit, resolve and reopen", () => {
  let doc = reply(first, "t-1", { id: "c-2", author: an, text: "Yes", at: 200 });
  doc = editComment(doc, "t-1", "c-2", "Yes, Heading/1", 250);
  doc = resolve(doc, "t-1", true, 300);
  assert.deepEqual([doc.threads[0].comments.map((comment) => comment.text), doc.threads[0].resolved], [["Bigger title?", "Yes, Heading/1"], true]);
  assert.deepEqual(visibleThreads(doc), []);
  assert.equal(visibleThreads(doc, { resolved: true }).length, 1);
  assert.equal(resolve(doc, "t-1", false, 400).threads[0].resolved, false);
});
test("deleting a reply leaves a tombstone; deleting the first comment deletes the thread", () => {
  const doc = reply(first, "t-1", { id: "c-2", author: an, text: "Yes", at: 200 });
  const gone = deleteComment(doc, "t-1", "c-2", 300);
  assert.deepEqual(gone.threads[0].comments.map((comment) => [comment.id, comment.deleted ?? false, comment.text]), [["c-1", false, "Bigger title?"], ["c-2", true, ""]]);
  const thread = deleteComment(doc, "t-1", "c-1", 300);
  assert.deepEqual([thread.threads[0].deleted, visibleThreads(thread, { resolved: true }).length], [true, 0]);
});
test("merge joins two copies by id; the later change wins", () => {
  const mine = resolve(reply(first, "t-1", { id: "c-2", author: vu, text: "Mine", at: 200 }), "t-1", true, 500);
  const theirs = addThread(reply(first, "t-1", { id: "c-3", author: an, text: "Theirs", at: 210 }), { id: "t-2", anchor: { x: 10, y: 20 }, comment: { id: "c-9", author: an, text: "New", at: 220 } });
  const merged = mergeComments(mine, theirs);
  assert.deepEqual(merged.threads.map((thread) => thread.id), ["t-1", "t-2"]);
  assert.deepEqual(merged.threads[0].comments.map((comment) => comment.id), ["c-1", "c-2", "c-3"]);
  assert.equal(merged.threads[0].resolved, true);
  assert.deepEqual(mergeComments(theirs, mine), merged);
});
test("a tombstone wins over an older copy (a merge never brings a deleted comment back)", () => {
  const doc = reply(first, "t-1", { id: "c-2", author: an, text: "Yes", at: 200 });
  const deleted = deleteThread(doc, "t-1", 300);
  assert.equal(mergeComments(doc, deleted).threads[0].deleted, true);
  assert.equal(mergeComments(deleted, doc).threads[0].deleted, true);
  const edited = editComment(doc, "t-1", "c-2", "Later", 400);
  assert.equal(mergeComments(edited, deleteComment(doc, "t-1", "c-2", 350)).threads[0].comments[1].text, "Later");
});
test("validation names what is wrong", () => {
  assert.deepEqual(validateComments({ format: 2, threads: [] }), ["Comments are { format: 1, threads: [] }"]);
  const bad = { format: 1, threads: [{ id: "t", anchor: { x: "1", y: 2 }, comments: [{ id: "c", author: { name: "" }, text: "x".repeat(4001), at: 1 }] }] };
  const errors = validateComments(bad);
  assert.ok(errors.some((error) => /place/.test(error)) && errors.some((error) => /author/.test(error)) && errors.some((error) => /4000/.test(error)), errors.join(" | "));
});
test("newest thread first, by its last comment", () => {
  let doc = addThread(first, { id: "t-2", anchor: { x: 0, y: 0 }, comment: { id: "c-5", author: an, text: "Later", at: 150 } });
  assert.deepEqual(visibleThreads(doc).map((thread) => thread.id), ["t-2", "t-1"]);
  doc = reply(doc, "t-1", { id: "c-6", author: vu, text: "Bump", at: 900 });
  assert.deepEqual(visibleThreads(doc).map((thread) => thread.id), ["t-1", "t-2"]);
});

console.log(`✓ page comments selftest: ${count} checks pass.`);

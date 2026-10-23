// node tools/studio/page-figma.selftest.mjs — a page's Figma bases (page-figma.mjs): the checks, the join, the size fit.
import assert from "node:assert/strict";
import { emptyFigma, FIGMA_EXPORTS, fitFigma, joinFigma, validateFigma } from "./page-figma.mjs";

let count = 0;
const test = (name, run) => { run(); count += 1; };
const doc = (title) => ({ header: { format: 1, title }, board: { id: "board", children: [] } });
const exp = (version, at, title = version) => ({ version, at, base: doc(`${title} pull`), synced: doc(`${title} page`) });

test("an empty file is valid; a wrong shape names what it needs", () => {
  assert.deepEqual(validateFigma(emptyFigma()), []);
  assert.equal(validateFigma(null).length, 1);
  assert.equal(validateFigma({ format: 2, exports: [] }).length, 1);
  assert.match(validateFigma({ format: 1, exports: [{ version: "abc", at: 1, base: doc("x") }] })[0], /base.*synced/);
  assert.match(validateFigma({ format: 1, exports: [exp("a", 1), exp("a", 2)] })[0], /twice/);
  assert.match(validateFigma({ format: 1, exports: [{ ...exp("a", 1), version: "../x" }] })[0], /version/);
  assert.match(validateFigma({ format: 1, exports: [], pull: { base: doc("p") } })[0], /time/);
  assert.deepEqual(validateFigma({ format: 1, exports: [exp("a1", 1)], pull: { base: doc("p"), synced: doc("s"), version: "a1", at: 5 } }), []);
});
test("too many exports is refused", () => {
  const many = Array.from({ length: FIGMA_EXPORTS + 1 }, (_, i) => exp(`v${i}`, i));
  assert.match(validateFigma({ format: 1, exports: many })[0], /At most/);
});
test("join: exports from both copies by version, newest first, the later copy of one version winning", () => {
  const here = { format: 1, exports: [exp("b", 20, "here"), exp("a", 10)] };
  const folder = { format: 1, exports: [exp("c", 30), exp("b", 25, "folder")] };
  const joined = joinFigma(here, folder);
  assert.deepEqual(joined.exports.map((entry) => entry.version), ["c", "b", "a"]);
  assert.equal(joined.exports[1].base.header.title, "folder pull");
  assert.deepEqual(validateFigma(joined), []);
});
test("join keeps the five newest exports and the later pull", () => {
  const a = { format: 1, exports: [exp("v1", 1), exp("v2", 2), exp("v3", 3)], pull: { base: doc("old"), at: 5 } };
  const b = { format: 1, exports: [exp("v4", 4), exp("v5", 5), exp("v6", 6)], pull: { base: doc("new"), at: 9 } };
  const joined = joinFigma(a, b);
  assert.deepEqual(joined.exports.map((entry) => entry.version), ["v6", "v5", "v4", "v3", "v2"]);
  assert.equal(joined.pull.base.header.title, "new");
  assert.equal(joinFigma(null, a).pull.base.header.title, "old");
  assert.equal("pull" in joinFigma(emptyFigma(), emptyFigma()), false);
});
test("join never changes the copies it is given", () => {
  const a = { format: 1, exports: [exp("x", 1)] };
  const before = JSON.stringify(a);
  joinFigma(a, { format: 1, exports: [exp("x", 2)] });
  assert.equal(JSON.stringify(a), before);
});
test("fit drops the oldest exports until the file is small enough; the pull stays", () => {
  const big = { format: 1, exports: [exp("v3", 3), exp("v2", 2), exp("v1", 1)], pull: { base: doc("p"), at: 4 } };
  const one = new TextEncoder().encode(JSON.stringify({ ...big, exports: big.exports.slice(0, 1) })).length + 1;
  const fitted = fitFigma(big, one);
  assert.deepEqual(fitted.exports.map((entry) => entry.version), ["v3"]);
  assert.ok(fitted.pull);
  assert.equal(fitFigma(big, 1).exports.length, 0);
  assert.equal(fitFigma(big, 10 ** 7).exports.length, 3);
});

console.log(`✓ page figma selftest: ${count} checks pass.`);

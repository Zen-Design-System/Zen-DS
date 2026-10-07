// Figma kit self-test: node tools/figma-kit/selftest.mjs   (pure node; works on copies in a temp dir, never on the repo)
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { spawnSync } from "node:child_process";
import { paths, buildLock, compare, applyPatch, digest, keyOf, readContract, codePrefix, readLock } from "./lib.mjs";

let passed = 0;
const test = (name, fn) => { try { fn(); passed += 1; console.log(`✓ ${name}`); } catch (e) { console.log(`✗ ${name}\n  ${String(e.message).split("\n").slice(0, 6).join("\n  ")}`); process.exitCode = 1; } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "figma-kit-"));
for (const f of ["breadcrumbs.json", "chat-bubbles.json"]) fs.copyFileSync(path.join(paths.contracts, f), path.join(tmp, f));
const live = (lock, full = true) => Object.entries(lock.sets).map(([id, s]) => ({ id, n: s.name, h: s.h, ...(full ? { v: clone(s.v) } : {}) }));
const firstSetWithVariants = (dir) => { for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".json"))) { const { data } = readContract(f, dir); const e = data.find((x) => (x.variants ?? []).length >= 3); if (e) return { f, e }; } };
const paintsOf = (node, out = []) => { for (const k of ["fill", "stroke", "fx"]) for (const p of node[k] ?? []) out.push(p); for (const c of node.c ?? []) paintsOf(c, out); return out; };

test("the real contracts lock: every set and variant, deterministic", () => {
  const a = buildLock(), b = buildLock();
  assert.deepEqual(a, b);
  assert.ok(Object.keys(a.sets).length >= 90);
  assert.equal(fs.existsSync(paths.lock) ? JSON.stringify(readLock()) === JSON.stringify(a) : true, true, "contracts.lock.json is stale: run `figma-call.mjs lock`");
});
test("every contract file has a layout the patcher can write back", () => {
  for (const f of fs.readdirSync(paths.contracts).filter((n) => n.endsWith(".json"))) assert.ok(readContract(f).style, `${f} layout`);
});
test("status: the lock against itself is all unchanged (full and summary rows)", () => {
  const lock = buildLock({ dir: tmp });
  for (const full of [true, false]) assert.ok(compare(lock, live(lock, full)).every((r) => r.status === "unchanged"));
});
test("status: one changed variant is named, the others stay unchanged", () => {
  const { f, e } = firstSetWithVariants(tmp);
  const lock = buildLock({ dir: tmp });
  const changed = clone(e); changed.variants[1].spec.w += 3;
  const d = digest(changed), rows = compare(lock, [{ id: e.id, n: e.name, h: d.h, v: d.v }]);
  assert.equal(rows[0].status, "variants");
  assert.deepEqual(rows[0].changed, [keyOf(e.variants[1].vp)]);
  assert.equal(rows[0].added.length + rows[0].removed.length, 0);
  assert.ok(f);
});
test("status: an added and a removed variant", () => {
  const { e } = firstSetWithVariants(tmp), lock = buildLock({ dir: tmp });
  const x = clone(e), gone = keyOf(x.variants[0].vp);
  x.variants.shift(); x.variants.push({ vp: { ...x.variants[0].vp, State: "Brand-New" }, spec: clone(x.variants[0].spec) });
  const d = digest(x), r = compare(lock, [{ id: e.id, n: e.name, h: d.h, v: d.v }])[0];
  assert.deepEqual(r.removed, [gone]); assert.equal(r.added.length, 1);
});
test("hash is mode-independent: a resolved colour behind a bound variable never changes it", () => {
  const { e } = firstSetWithVariants(tmp), x = clone(e);
  let touched = 0;
  for (const v of x.variants) for (const p of paintsOf(v.spec)) if (typeof p.v === "string" && typeof p.c === "string") { p.c = "#123456"; touched += 1; }
  assert.ok(touched > 0, "no bound paint in the sample");
  assert.equal(digest(x).h, digest(e).h);
});
test("hash notices a re-binding, and an unbound colour change", () => {
  const { e } = firstSetWithVariants(tmp), x = clone(e), y = clone(e);
  const bound = x.variants.flatMap((v) => paintsOf(v.spec)).find((p) => typeof p.v === "string");
  assert.ok(bound); bound.v += "/Other";
  assert.notEqual(digest(x).h, digest(e).h);
  const unbound = y.variants.flatMap((v) => paintsOf(v.spec)).find((p) => typeof p.c === "string" && typeof p.v !== "string");
  if (unbound) { unbound.c = "#010203"; assert.notEqual(digest(y).h, digest(e).h); }
});
test("hash is order-independent: reordered variants are unchanged", () => {
  const { e } = firstSetWithVariants(tmp), x = clone(e); x.variants.reverse();
  assert.equal(digest(x).h, digest(e).h);
});
test("hash notices a set description change: status says meta", () => {
  const { e } = firstSetWithVariants(tmp), lock = buildLock({ dir: tmp }), x = clone(e); x.description = `${x.description ?? ""} edited`;
  const d = digest(x), r = compare(lock, [{ id: e.id, n: e.name, h: d.h, v: d.v }])[0];
  assert.equal(r.status, "meta");
});
test("patch: replace one variant, add one, remove one; layout kept; lock refreshed; status is clean afterwards", () => {
  const dir = fs.mkdtempSync(path.join(tmp, "p-"));
  for (const f of ["breadcrumbs.json", "chat-bubbles.json"]) fs.copyFileSync(path.join(paths.contracts, f), path.join(dir, f));
  const lock = buildLock({ dir });
  const { f, e } = firstSetWithVariants(dir);
  const before = fs.readFileSync(path.join(dir, f), "utf8");
  const target = clone(e), k0 = keyOf(e.variants[0].vp), k1 = keyOf(e.variants[1].vp);
  target.variants[1].spec.h += 5;
  target.variants.push({ vp: { ...e.variants[0].vp, State: "Brand-New" }, spec: clone(e.variants[0].spec) });
  const fetched = [{ ...clone(e), variants: [target.variants[1], target.variants.at(-1)] }];
  const r = applyPatch({ lock, setId: e.id, fetched, remove: [k0], dir });
  assert.deepEqual(r.summary.replaced, [k1]); assert.equal(r.summary.added.length, 1); assert.deepEqual(r.summary.removed, [k0]);
  const after = readContract(f, dir);
  assert.deepEqual(after.style, readContract(f, paths.contracts).style, "layout kept");
  assert.notEqual(fs.readFileSync(path.join(dir, f), "utf8"), before);
  const now = after.data.find((x) => x.id === e.id);
  assert.equal(now.variants.length, e.variants.length, "one replaced, one added, one removed");
  const want = clone(e); want.variants = want.variants.filter((v) => keyOf(v.vp) !== k0); want.variants[want.variants.findIndex((v) => keyOf(v.vp) === k1)] = target.variants[1]; want.variants.push(target.variants.at(-1));
  assert.equal(r.lock.sets[e.id].h, digest(want).h, "lock = digest of the patched set");
  assert.ok(compare(r.lock, [{ id: e.id, n: e.name, ...digest(want) }])[0].status === "unchanged");
});
test("patch refuses a contract layout it cannot write back", () => {
  const dir = fs.mkdtempSync(path.join(tmp, "q-")), f = "breadcrumbs.json";
  fs.writeFileSync(path.join(dir, f), JSON.stringify(readContract(f).data, null, 3));
  const lock = buildLock({ dir }), e = readContract(f, dir).data[0];
  assert.throws(() => applyPatch({ lock, setId: e.id, fetched: [e], dir }), /layout/);
});

/* the code use_figma receives really runs: a mock Figma document, executed through the printed code */
function mockFigma(color) {
  const paint = { type: "SOLID", color, opacity: 1, boundVariables: { color: { id: "V1" } } };
  const frame = (name, w) => ({ name, type: "FRAME", visible: true, x: 0, y: 0, width: w, height: 20, opacity: 1, fills: [paint], strokes: [], effects: [], boundVariables: {}, children: [{ name: "Label", type: "TEXT", visible: true, x: 4, y: 2, width: w - 8, height: 16, opacity: 1, fills: [], strokes: [], effects: [], boundVariables: {}, characters: "Text", textStyleId: "S1", fontSize: 14, fontName: { family: "Inter", style: "Regular" }, lineHeight: { unit: "AUTO" }, letterSpacing: { value: 0, unit: "PIXELS" }, textAlignHorizontal: "LEFT", textAlignVertical: "CENTER", textAutoResize: "WIDTH_AND_HEIGHT", textCase: "ORIGINAL" }] });
  const comp = (size, w) => ({ ...frame(`Size=${size}`, w), type: "COMPONENT", variantProperties: { Size: size }, description: "" });
  const set = { id: "9:1", name: "Mock/Set", type: "COMPONENT_SET", description: "d", documentationLinks: [], componentPropertyDefinitions: { Size: { type: "VARIANT", defaultValue: "S", variantOptions: ["S", "M"] } }, children: [comp("S", 40), comp("M", 60)] };
  return { mixed: Symbol("mixed"), getNodeByIdAsync: async (id) => (id === "9:1" ? set : null), getStyleByIdAsync: async () => ({ name: "Text/Body" }), variables: { getVariableByIdAsync: async () => ({ name: "Color/Mock" }) } };
}
async function runInMock(body, color) {
  const context = vm.createContext({ figma: mockFigma(color) });
  return plain(await vm.runInContext(`(async () => { ${codePrefix()}${body} })()`, context));
}
const plain = (x) => JSON.parse(JSON.stringify(x));
const asyncTest = async (name, fn) => { try { await fn(); passed += 1; console.log(`✓ ${name}`); } catch (e) { console.log(`✗ ${name}\n  ${String(e.message).split("\n").slice(0, 6).join("\n  ")}`); process.exitCode = 1; } };

await asyncTest("use_figma code: __HASHES on a mock document equals the node digest of its __RUN output, in any mode colour", async () => {
  const a = await runInMock(`return await __HASHES(["9:1"]);`, { r: 1, g: 0, b: 0, a: 1 });
  const b = await runInMock(`return await __HASHES(["9:1"]);`, { r: 0, g: 0, b: 1, a: 1 });
  assert.equal(a[0].h, b[0].h, "a different resolved colour must hash the same");
  const run = await runInMock(`await __RUN(["9:1"]); return JSON.parse(__OUTS);`, { r: 1, g: 0, b: 0, a: 1 });
  assert.deepEqual(digest(run[0]), a[0], "node and Figma-side digests agree");
  assert.deepEqual(Object.keys(a[0].v), ["Size=S", "Size=M"]);
  const flag = await runInMock(`return figma.skipInvisibleInstanceChildren;`, { r: 1, g: 0, b: 0, a: 1 });
  assert.equal(flag, false, "hidden instance children must be read, like the desktop console does");
});
await asyncTest("figma-call code hashes / fetch print code that runs and returns parts", async () => {
  const cli = (...args) => spawnSync(process.execPath, [path.join(paths.here, "figma-call.mjs"), ...args], { encoding: "utf8" });
  const { sets } = readLock(), id = Object.keys(sets)[0];
  const hashes = cli("code", "hashes", `--sets=${id}`);
  assert.equal(hashes.status, 0); assert.match(hashes.stdout, /__HASHES\(\["/);
  new (Object.getPrototypeOf(async () => {}).constructor)(hashes.stdout); // syntax check of the whole call
  const fetch = cli("code", "fetch", "--set=9:1", "--keys=Size=S");
  assert.equal(fetch.status, 0);
  const out = await runInMock(fetch.stdout.slice(codePrefix().length), { r: 1, g: 0, b: 0, a: 1 });
  assert.equal(out.parts, 1);
  const entry = JSON.parse(out.data)[0];
  assert.deepEqual(entry.variants.map((v) => keyOf(v.vp)), ["Size=S"], "only the requested variant comes back");
  const statusRun = spawnSync(process.execPath, [path.join(paths.here, "figma-call.mjs"), "status", "-"], { input: JSON.stringify(Object.entries(sets).slice(0, 3).map(([i, s]) => ({ id: i, n: s.name, h: s.h }))), encoding: "utf8" });
  assert.equal(statusRun.status, 0, statusRun.stdout);
});

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${process.exitCode ? "FAILED" : "Figma kit self-test passed"} (${passed} checks)`);

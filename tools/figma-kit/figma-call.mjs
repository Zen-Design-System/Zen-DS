#!/usr/bin/env node
// Figma kit CLI: prints the exact use_figma code, compares its answers with the contracts lock, patches contracts.
//   node tools/figma-kit/figma-call.mjs lock [--check]
//   node tools/figma-kit/figma-call.mjs code hashes (--all | --file=<contract.json> | --sets=id,id) [--full] [--chunk=20] [--call=1]
//   node tools/figma-kit/figma-call.mjs status <result.json ...> [--json]      (or pipe the result on stdin: status -)
//   node tools/figma-kit/figma-call.mjs code fetch --set=<id> (--keys="k1;k2" | --all-variants | --keys=) [--part=0]
//   node tools/figma-kit/figma-call.mjs patch --set=<id> [--file=<contract.json>] [--remove="k1;k2"] [--dry] <part0> <part1> …
import fs from "node:fs";
import { paths, PART, FILE_KEY, buildLock, readLock, writeLock, compare, applyPatch, codePrefix, kitVersion } from "./lib.mjs";

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags = Object.fromEntries(argv.filter((a) => a.startsWith("--")).map((a) => { const i = a.indexOf("="); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));
const pos = argv.slice(1).filter((a) => !a.startsWith("--") || a === "-");
const die = (msg, code = 2) => { console.error(msg); process.exit(code); };
const list = (s) => (typeof s === "string" ? s.split(";").filter(Boolean) : []);
const shq = (s) => `"${s.replace(/(["\\$`])/g, "\\$1")}"`;

function lockOrDie() {
  if (!fs.existsSync(paths.lock)) die("No contracts.lock.json yet: run `node tools/figma-kit/figma-call.mjs lock`.");
  const lock = readLock();
  if (lock.kit !== kitVersion()) die(`The lock was made by digest version ${lock.kit}, this kit is ${kitVersion()}: run \`lock\` to rebuild it.`);
  return lock;
}
const pick = (text) => { // tolerant JSON: a bare value, or the first [ … ] / { … } in a longer answer
  try { return JSON.parse(text); } catch { /* fall through */ }
  const a = text.search(/[[{]/), b = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
  if (a < 0 || b < a) die("No JSON found in the input.");
  return JSON.parse(text.slice(a, b + 1));
};
const input = (name) => (name === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(name, "utf8"));

if (cmd === "lock") {
  const lock = buildLock();
  const n = Object.keys(lock.sets).length, v = Object.values(lock.sets).reduce((s, x) => s + Object.keys(x.v).length, 0);
  const dup = Object.keys(lock.duplicates).length;
  if (flags.check) {
    const cur = fs.existsSync(paths.lock) ? readLock() : null;
    const same = cur && JSON.stringify(cur) === JSON.stringify(lock);
    console.log(same ? `✓ lock matches the contracts (${n} sets, ${v} variants)` : "✗ the lock does not match docs/figma-contracts: run `lock` after editing a contract by hand");
    process.exit(same ? 0 : 1);
  }
  writeLock(lock);
  console.log(`lock written: ${n} sets, ${v} variants${dup ? `, ${dup} id(s) in more than one file (first file kept: ${Object.entries(lock.duplicates).map(([k, f]) => `${k} → ${f[0]}`).join(", ")})` : ""}`);
} else if (cmd === "code" && argv[1] === "hashes") {
  const lock = lockOrDie();
  let ids;
  if (flags.sets) ids = list(flags.sets.replace(/,/g, ";"));
  else if (flags.file) ids = Object.entries(lock.sets).filter(([, s]) => s.file === flags.file).map(([id]) => id);
  else if (flags.all) ids = Object.keys(lock.sets);
  else die("Choose the sets: --all, --file=<contract.json> or --sets=id,id");
  if (!ids.length) die("No sets selected.");
  const size = Math.max(1, Number(flags.chunk) || 20), calls = Math.ceil(ids.length / size), i = Math.min(calls, Math.max(1, Number(flags.call) || 1));
  const chunk = ids.slice((i - 1) * size, i * size);
  const body = flags.full ? `return await __HASHES(${JSON.stringify(chunk)});` : `return (await __HASHES(${JSON.stringify(chunk)})).map(({ v, ...s }) => s);`;
  const code = `${codePrefix()}${body}\n`;
  if (flags.out) fs.writeFileSync(flags.out, code); else process.stdout.write(code);
  console.error(`# use_figma on file ${FILE_KEY}: call ${i} of ${calls}, ${chunk.length} of ${ids.length} sets${flags.full ? " (with variant hashes)" : ""}${i < calls ? `; next: --call=${i + 1}` : ""}`);
} else if (cmd === "status") {
  const lock = lockOrDie();
  if (!pos.length) die("Give the use_figma result file(s), or `-` for stdin.");
  const live = pos.flatMap((f) => { const x = pick(input(f)); return Array.isArray(x) ? x : Array.isArray(x?.result) ? x.result : [x]; });
  const rows = compare(lock, live);
  const bad = rows.filter((r) => r.status !== "unchanged");
  const unchecked = Object.keys(lock.sets).filter((id) => !live.some((r) => r.id === id));
  if (flags.json) console.log(JSON.stringify({ rows, unchecked }, null, 1));
  else {
    for (const r of rows) {
      if (r.status === "unchanged") { console.log(`  ✓ ${r.id}  ${r.name}`); continue; }
      const what = r.status === "variants" ? `${r.changed.length} changed, ${r.added.length} added, ${r.removed.length} removed` : r.status === "error" ? r.error : r.note ?? (r.status === "meta" ? "description, docs link or property definition only" : "not in the lock");
      console.log(`  ✗ ${r.id}  ${r.name}  [${r.status}] ${what}`);
      if (r.status === "variants") for (const k of [...r.changed.map((x) => `~ ${x}`), ...r.added.map((x) => `+ ${x}`), ...r.removed.map((x) => `- ${x}`)].slice(0, 12)) console.log(`        ${k}`);
      if (r.status === "variants" && r.changed.length + r.added.length + r.removed.length > 12) console.log("        …");
    }
    console.log(`${rows.length - bad.length}/${rows.length} sets match the contracts${unchecked.length ? `; ${unchecked.length} locked set(s) were not in this answer` : ""}`);
    for (const r of bad) {
      if (r.status === "variants" || r.status === "meta") console.log(`next  ${r.id}: node tools/figma-kit/figma-call.mjs code fetch --set=${r.id} --keys=${shq([...(r.changed ?? []), ...(r.added ?? [])].join(";"))}${r.removed?.length ? `   then patch with --remove=${shq(r.removed.join(";"))}` : ""}`);
      else if (r.status === "changed") console.log(`next  ${r.id}: node tools/figma-kit/figma-call.mjs code hashes --sets=${r.id} --full`);
      else if (r.status === "new") console.log(`next  ${r.id}: node tools/figma-kit/figma-call.mjs code fetch --set=${r.id} --all-variants   then patch with --file=<contract.json>`);
    }
  }
  process.exit(bad.length ? 1 : 0);
} else if (cmd === "code" && argv[1] === "fetch") {
  if (!flags.set) die("--set=<component set id> is required");
  const part = Math.max(0, Number(flags.part) || 0);
  const keys = flags["all-variants"] ? null : list(flags.keys);
  if (keys && keys.some((k) => / #\d+$/.test(k))) console.error("# warning: a ' #n' key marks a duplicate variant name in Figma; it cannot be selected by key, use --all-variants");
  const run = `await __RUN([${JSON.stringify(flags.set)}]${keys ? `, (vp) => ${JSON.stringify(keys)}.includes(__KEY(vp))` : ""});`;
  const tail = part === 0
    ? `return { parts: Math.ceil(__OUTS.length / ${PART}), len: __OUTS.length, data: __OUTS.slice(0, ${PART}) };`
    : `return { data: __OUTS.slice(${part * PART}, ${(part + 1) * PART}) };`;
  process.stdout.write(`${codePrefix()}${run}\n${tail}\n`);
  console.error(`# use_figma on file ${FILE_KEY}: set ${flags.set}${keys ? `, ${keys.length} variant(s)` : ", all variants"}, part ${part}. Part 0 also returns "parts": call again with --part=1… when parts > 1.`);
} else if (cmd === "patch") {
  const lock = lockOrDie();
  if (!flags.set) die("--set=<component set id> is required");
  if (!pos.length) die("Give the saved `data` strings of the fetch parts, in order (part 0 first).");
  const text = pos.map((f) => { const raw = input(f); try { const o = JSON.parse(raw); if (o && typeof o.data === "string") return o.data; } catch { /* a bare part */ } return raw; }).join("");
  let fetched; try { fetched = JSON.parse(text); } catch (e) { die(`The joined parts are not valid JSON (${e.message}). Missing a part, or a part was cut off?`); }
  const r = applyPatch({ lock, setId: flags.set, fetched, remove: list(flags.remove), file: typeof flags.file === "string" ? flags.file : undefined, write: !flags.dry });
  if (!flags.dry) writeLock(r.lock);
  const s = r.summary;
  console.log(`${flags.dry ? "[dry run] " : ""}${r.file}: set ${flags.set} ${s.whole ? "replaced as a whole" : `${s.replaced.length} variant(s) replaced, ${s.added.length} added, ${s.removed.length} removed`}; lock ${flags.dry ? "not " : ""}updated.`);
  console.log(`verify: node tools/figma-kit/figma-call.mjs code hashes --sets=${flags.set}  →  status  (must show ✓)`);
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n"));
  process.exit(cmd ? 2 : 0);
}

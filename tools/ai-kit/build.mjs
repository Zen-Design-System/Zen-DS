#!/usr/bin/env node
// Builds the Zen AI kit for Figma (kit.mjs) from the repo files and writes it as a zip, or checks it.
//   node tools/ai-kit/build.mjs                 → dist-pack/zen-figma-ai-kit.zip
//   node tools/ai-kit/build.mjs --out=<file>    → that file
//   node tools/ai-kit/build.mjs --check         → builds in memory and verifies the kit (exit 1 on a failure)
// The docs platform builds the same zip in the browser (src/platform/aiKit.ts, Installation › AI kit for Figma).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unzipFiles, zipFiles } from "../studio/zip.mjs";
import { buildKit, KIT_NAME, KIT_SOURCES, SKILL } from "./kit.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const check = args.includes("--check");
const out = args.find((arg) => arg.startsWith("--out="))?.slice(6) ?? path.join(root, "dist-pack", `${KIT_NAME}.zip`);

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const readJson = (file) => JSON.parse(read(file));

/** Every file under `dir` (repo-relative, "/"), recursively. */
function walk(dir) {
  const full = path.join(root, dir);
  return fs.readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir.replace(/\/$/, "")}/${entry.name}`;
    if (entry.name.startsWith(".")) return [];
    return entry.isDirectory() ? walk(rel) : [rel];
  });
}

export function readKitInputs() {
  const files = [
    ...walk(KIT_SOURCES.root),
    ...walk(KIT_SOURCES.skill),
    KIT_SOURCES.rules,
    ...KIT_SOURCES.principles,
    ...walk(KIT_SOURCES.guidelines).filter((file) => file.endsWith(".md")),
  ];
  const sources = Object.fromEntries(files.map((file) => [file, read(file)]));
  const tokenFiles = Object.fromEntries([...KIT_SOURCES.tokenFiles, "global-dimensions"].map((name) => [name, readJson(`${KIT_SOURCES.tokens}${name}.json`)]));
  return { sources, contract: readJson(KIT_SOURCES.contract), tokenFiles, styles: readJson(KIT_SOURCES.styles), textStyles: readJson(KIT_SOURCES.textStyles) };
}

const inputs = readKitInputs();
const files = buildKit(inputs);

if (!check) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, zipFiles(files));
  console.log(`✓ ${path.relative(process.cwd(), out)}: ${files.length} files, ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  process.exit(0);
}

const failures = [];
let passed = 0;
const expect = (label, ok, detail = "") => (ok ? (passed += 1) : failures.push(`${label}${detail ? `: ${detail}` : ""}`));
const kit = new Map(files.map((file) => [file.path.slice(KIT_NAME.length + 1), file.data]));
const skill = `skills/${SKILL}`;

for (const file of ["README.md", "AGENTS.md", "CLAUDE.md", "VERSION.txt", `${skill}/SKILL.md`, `${skill}/agents/openai.yaml`, `${skill}/harness/zen-figma-audit.js`, `${skill}/references/component-usage-rules.md`, `${skill}/references/figma-components.md`, `${skill}/references/figma-tokens.md`]) {
  expect(`kit has ${file}`, kit.has(file));
}
expect("CLAUDE.md is AGENTS.md", kit.get("CLAUDE.md") === kit.get("AGENTS.md"));
const guidelines = walk(KIT_SOURCES.guidelines).filter((file) => file.endsWith(".md"));
expect("every guideline is in the kit", guidelines.every((file) => kit.has(`${skill}/references/guidelines/${path.basename(file)}`)), `${guidelines.length} guidelines`);

const skillMd = kit.get(`${skill}/SKILL.md`) ?? "";
expect("SKILL.md frontmatter names the skill", new RegExp(`^---\\nname: ${SKILL}\\ndescription: .{40,}\\n---`).test(skillMd));
const mentioned = [...new Set([...skillMd.matchAll(/`((?:references|harness)\/[^`*<]+)`/g)].map((match) => match[1]))];
for (const file of mentioned) expect(`SKILL.md points at ${file}`, kit.has(`${skill}/${file}`));
for (const doc of ["README.md", "AGENTS.md"]) {
  for (const [, file] of kit.get(doc).matchAll(/`(skills\/[^`*<\s]+\.(?:md|js))`/g)) expect(`${doc} points at ${file}`, kit.has(file));
}

const audit = kit.get(`${skill}/harness/zen-figma-audit.js`) ?? "";
try {
  new (Object.getPrototypeOf(async function () {}).constructor)("figma", audit);
  passed += 1;
} catch (error) {
  failures.push(`the audit does not parse as a use_figma body: ${error.message}`);
}
expect("the audit ships with an empty ROOT_IDS", /^const ROOT_IDS = \[\];$/m.test(audit));
expect("the audit answers in ASCII", audit.includes("[\\u0080-\\uffff]"));
const auditRules = [...audit.matchAll(/report\("([a-z-]+\/[a-z-]+)"/g)].map((match) => match[1]);
const rulesDoc = kit.get(`${skill}/references/audit-rules.md`) ?? "";
for (const rule of new Set(auditRules)) {
  expect(`audit-rules.md explains ${rule}`, rulesDoc.includes(`\`${rule}\``));
  expect(`the audit header lists ${rule}`, audit.includes(`//   ${rule} `));
}

const components = kit.get(`${skill}/references/figma-components.md`) ?? "";
const sets = inputs.contract.pages.flatMap((page) => page.sets.map((set) => set.name));
expect("figma-components.md lists every set", sets.every((name) => components.includes(`### ${name} ·`)), `${sets.length} sets`);
const tokens = kit.get(`${skill}/references/figma-tokens.md`) ?? "";
for (const name of ["Color/Background/Canvas/Default", "Spacing/Gap/Medium", "Spacing/Padding/Small", "Corner-Radius/2XLarge", "Margin-Comfortable", "Heading/4", "Body/Base/Regular", "Shadow/Bottom/Level-1"]) {
  expect(`figma-tokens.md has ${name}`, tokens.includes(`\`${name}\``));
}
expect("figma-tokens.md resolves dm-N", /\| `Spacing\/Gap\/Medium` \| 16 \|/.test(tokens));

// The browser build (src/platform/aiKit.ts) must read the same sources.
const browser = read("src/platform/aiKit.ts");
for (const source of [KIT_SOURCES.root, KIT_SOURCES.skill, KIT_SOURCES.rules, ...KIT_SOURCES.principles, KIT_SOURCES.guidelines, KIT_SOURCES.contract, KIT_SOURCES.tokens, KIT_SOURCES.styles, KIT_SOURCES.textStyles]) {
  expect(`aiKit.ts reads ${source}`, browser.includes(`/${source}`));
}
for (const name of [...KIT_SOURCES.tokenFiles, "global-dimensions"]) expect(`aiKit.ts reads the ${name} tokens`, browser.includes(name));

const round = unzipFiles(zipFiles(files));
expect("the zip round-trips", round.length === files.length && round.every((file, index) => file.path === files[index].path));

if (failures.length) {
  console.error(`✗ AI kit: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ AI kit: ${passed} checks, ${files.length} files`);

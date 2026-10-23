import fs from "node:fs";
import { HIGH_CONTRAST_MODE, highContrastValues, neutralRampsOf, verifyHighContrast } from "./high-contrast.mjs";
import { SOURCE_FILES } from "./token-outputs.mjs";

const sourceDir = "tokens/source/figma";
const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith(".json")).sort();
const collections = [];
const tokens = [];

for (const file of files) {
  const json = JSON.parse(fs.readFileSync(`${sourceDir}/${file}`, "utf8"));
  const name = Object.keys(json)[0];
  const source = json[name];
  collections.push({ name, file, modes: source.modes, count: source.tokens.length });
  tokens.push(...source.tokens.map((token) => ({ ...token, collection: name })));
}

const byName = new Map();
for (const token of tokens) {
  const matches = byName.get(token.name) ?? [];
  matches.push(token);
  byName.set(token.name, matches);
}

const duplicateNames = [...byName.entries()].filter(([, matches]) => matches.length > 1);
// Old names of variables renamed in Zen Studio (`formerNames`): aliases may still write them; their CSS names stay in
// tokens.css as deprecated aliases, so they count against CSS name collisions too.
const renamed = new Map(tokens.flatMap((token) => (Array.isArray(token.formerNames) ? token.formerNames : []).filter((former) => !byName.has(former)).map((former) => [former, token.name])));
const toKebab = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
const byCssName = new Map();
for (const name of [...tokens.map((token) => token.name), ...renamed.keys()]) {
  const cssName = toKebab(name);
  const matches = byCssName.get(cssName) ?? [];
  matches.push(name);
  byCssName.set(cssName, matches);
}
const cssNameCollisions = [...byCssName.entries()].filter(([, matches]) => matches.length > 1);
const missingModes = [];
const missingAliases = [];
const invalidTypedValues = [];
const aliasPattern = /^\{(.+)\}$/;

for (const token of tokens) {
  const collection = collections.find((item) => item.name === token.collection);
  for (const mode of collection.modes) {
    if (!(mode in token.valuesByMode)) missingModes.push(`${token.name} / ${mode}`);
  }
  for (const [mode, value] of Object.entries(token.valuesByMode)) {
    const alias = typeof value === "string" ? value.match(aliasPattern)?.[1] : null;
    if (alias && !byName.has(alias) && !renamed.has(alias)) missingAliases.push(`${token.name} / ${mode} → ${alias}`);
    const valid =
      token.type === "COLOR"
        ? Boolean(alias) || (typeof value === "string" && /^#[0-9a-f]{6,8}$/i.test(value))
        : token.type === "FLOAT"
          ? Boolean(alias) || typeof value === "number"
          : token.type === "BOOLEAN"
            ? Boolean(alias) || typeof value === "boolean"
            : token.type === "STRING"
              ? Boolean(alias) || typeof value === "string"
              : false;
    if (!valid) invalidTypedValues.push(`${token.name} / ${mode} / ${token.type}`);
  }
}

const edges = new Map(
  tokens.map((token) => [
    token.name,
    Object.values(token.valuesByMode).flatMap((value) => {
      const alias = typeof value === "string" ? value.match(aliasPattern)?.[1] : null;
      return alias ? [renamed.get(alias) ?? alias] : [];
    }),
  ]),
);
const cycles = [];
const visiting = new Set();
const visited = new Set();
const visit = (name, stack) => {
  if (visiting.has(name)) {
    cycles.push([...stack.slice(stack.indexOf(name)), name]);
    return;
  }
  if (visited.has(name)) return;
  visiting.add(name);
  stack.push(name);
  for (const target of edges.get(name) ?? []) visit(target, stack);
  stack.pop();
  visiting.delete(name);
  visited.add(name);
};
for (const name of edges.keys()) visit(name, []);

// The 11 Figma exports are all there; a collection made in Zen Studio has one mode (scripts/token-outputs.mjs sourceFiles).
const missingSources = SOURCE_FILES.map(([file]) => file).filter((file) => !files.includes(file));
const created = collections.filter((collection) => !SOURCE_FILES.some(([file]) => file === collection.file));
const multiModeCreated = created.filter((collection) => collection.modes.length !== 1);
console.log(`Collections: ${collections.length - created.length}/11${created.length ? ` + ${created.length} made in Zen Studio` : ""}`);
for (const file of missingSources) console.log(`  missing Figma export: ${file}`);
for (const collection of multiModeCreated) console.log(`  ${collection.name} (${collection.file}): ${collection.modes.length} modes; a collection made in Zen Studio has one (:root)`);
console.log(`Variables: ${tokens.length}/${tokens.length} (100.00%)`);
console.log(`Duplicate names: ${duplicateNames.length}`);
console.log(`CSS name collisions: ${cssNameCollisions.length}`);
console.log(`Missing mode values: ${missingModes.length}`);
console.log(`Missing aliases: ${missingAliases.length}`);
console.log(`Alias cycles: ${cycles.length}`);
console.log(`Invalid typed values: ${invalidTypedValues.length}`);

// Zen-High-Contrast: Figma's Global Colors mode when it has one, else the values scripts/high-contrast.mjs generates.
const globalSource = JSON.parse(fs.readFileSync(`${sourceDir}/global-colors.json`, "utf8"))["Global Colors"];
const baseSource = JSON.parse(fs.readFileSync(`${sourceDir}/base-colors-project.json`, "utf8"))["Base Colors (Project)"];
const figmaHighContrast = globalSource.modes.includes(HIGH_CONTRAST_MODE);
const highContrast = figmaHighContrast
  ? new Map(globalSource.tokens.map((token) => [token.name, token.valuesByMode[HIGH_CONTRAST_MODE]]))
  : highContrastValues(globalSource, neutralRampsOf(baseSource));
const highContrastFailures = verifyHighContrast(globalSource, highContrast, neutralRampsOf(baseSource));
console.log(`${HIGH_CONTRAST_MODE} (${figmaHighContrast ? "Figma" : "generated"}): ${highContrastFailures.length} rule failure(s)`);
for (const failure of highContrastFailures.slice(0, 20)) console.log(`  ${failure}`);

if (
  missingSources.length ||
  multiModeCreated.length ||
  duplicateNames.length ||
  cssNameCollisions.length ||
  missingModes.length ||
  missingAliases.length ||
  cycles.length ||
  invalidTypedValues.length ||
  highContrastFailures.length
) {
  process.exitCode = 1;
}

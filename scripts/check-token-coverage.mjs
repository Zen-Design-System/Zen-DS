import fs from "node:fs";

const sourceDir = "tokens/source/figma";
const files = fs.readdirSync(sourceDir).filter((name) => name.endsWith(".json")).sort();
const collections = [];
const tokens = [];

for (const file of files) {
  const json = JSON.parse(fs.readFileSync(`${sourceDir}/${file}`, "utf8"));
  const name = Object.keys(json)[0];
  const source = json[name];
  collections.push({ name, modes: source.modes, count: source.tokens.length });
  tokens.push(...source.tokens.map((token) => ({ ...token, collection: name })));
}

const byName = new Map();
for (const token of tokens) {
  const matches = byName.get(token.name) ?? [];
  matches.push(token);
  byName.set(token.name, matches);
}

const duplicateNames = [...byName.entries()].filter(([, matches]) => matches.length > 1);
const toKebab = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
const byCssName = new Map();
for (const token of tokens) {
  const cssName = toKebab(token.name);
  const matches = byCssName.get(cssName) ?? [];
  matches.push(token.name);
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
    if (alias && !byName.has(alias)) missingAliases.push(`${token.name} / ${mode} → ${alias}`);
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
      return alias ? [alias] : [];
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

console.log(`Collections: ${collections.length}/11`);
console.log(`Variables: ${tokens.length}/${tokens.length} (100.00%)`);
console.log(`Duplicate names: ${duplicateNames.length}`);
console.log(`CSS name collisions: ${cssNameCollisions.length}`);
console.log(`Missing mode values: ${missingModes.length}`);
console.log(`Missing aliases: ${missingAliases.length}`);
console.log(`Alias cycles: ${cycles.length}`);
console.log(`Invalid typed values: ${invalidTypedValues.length}`);

if (
  collections.length !== 11 ||
  duplicateNames.length ||
  cssNameCollisions.length ||
  missingModes.length ||
  missingAliases.length ||
  cycles.length ||
  invalidTypedValues.length
) {
  process.exitCode = 1;
}

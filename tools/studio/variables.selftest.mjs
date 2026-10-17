// node tools/studio/variables.selftest.mjs — Figma's Local variables on the token sources (variables.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VariableEditError, aliasReaders, applyVariableOps, cssNameOf, normalizeColor, readCollection, resolveValue, variablesOf, variablesPackage } from "./variables.mjs";

let count = 0;
const test = (name, run) => { try { run(); count += 1; } catch (error) { console.error(`✗ ${name}`); throw error; } };
const refused = (run, code, pattern) => assert.throws(run, (error) => error instanceof VariableEditError && error.code === code && pattern.test(error.message));

const text = (name, modes, tokens) => `${JSON.stringify({ [name]: { modes, tokens } }, null, 2)}\n`;
const primitives = text("Global Colors", ["Zen"], [
  { name: "Light/Blue/9", type: "COLOR", valuesByMode: { Zen: "#0090FF" } },
  { name: "Light/Blue/10", type: "COLOR", valuesByMode: { Zen: "#0588F0" } },
]);
const semantic = text("Mode Colors (Semantic)", ["Light", "Dark"], [
  { name: "Color/Content/Accent/Base", type: "COLOR", valuesByMode: { Light: "{Light/Blue/9}", Dark: "{Light/Blue/10}" } },
  { name: "Color/Border/Accent/Base", type: "COLOR", valuesByMode: { Light: "{Color/Content/Accent/Base}", Dark: "#112233" } },
]);
const spacing = text("Spacing", ["Standard"], [{ name: "Spacing/Gap/Small", type: "FLOAT", valuesByMode: { Standard: 12 } }]);
const files = new Map([["tokens/source/figma/global-colors.json", primitives], ["tokens/source/figma/mode-colors-semantic.json", semantic], ["tokens/source/figma/spacing.json", spacing]]);
const context = (readers = () => []) => ({ variables: variablesOf(files), readers });

test("colours normalise as the exports write them", () => {
  assert.equal(normalizeColor("#abc"), "#AABBCC");
  assert.equal(normalizeColor("0090ff"), "#0090FF");
  assert.equal(normalizeColor("#0090FFFF"), "#0090FF");
  assert.equal(normalizeColor("#0090FF80"), "#0090FF80");
  assert.equal(normalizeColor("blue"), null);
});

test("CSS names match the build's (--zen-<kebab>)", () => {
  assert.equal(cssNameOf("Color/Content/Accent/Base"), "color-content-accent-base");
  assert.equal(cssNameOf("Spacing/Gap/XSmall"), "spacing-gap-xsmall");
  assert.equal(cssNameOf("Light/Blue-Alpha/9"), "light-blue-alpha-9");
});

test("setValue writes one mode, keeps the file's format", () => {
  const out = applyVariableOps(semantic, [{ op: "setValue", name: "Color/Border/Accent/Base", mode: "Dark", value: "#aabbcc80" }], context());
  const read = readCollection(out.text);
  assert.equal(read.tokens[1].valuesByMode.Dark, "#AABBCC80");
  assert.equal(read.tokens[1].valuesByMode.Light, "{Color/Content/Accent/Base}");
  assert.ok(out.text.endsWith("}\n") && out.text.includes('\n  "Mode Colors (Semantic)": {\n'));
  assert.deepEqual(out.changed, ["Color/Border/Accent/Base"]);
  assert.match(out.label, /Color\/Border\/Accent\/Base \(Dark\) → #AABBCC80/);
});

test("an alias: same type, written {Name}; a wrong type, a missing target and a loop are refused", () => {
  const out = applyVariableOps(semantic, [{ op: "setValue", name: "Color/Border/Accent/Base", mode: "Dark", value: { alias: "Light/Blue/10" } }], context());
  assert.equal(readCollection(out.text).tokens[1].valuesByMode.Dark, "{Light/Blue/10}");
  refused(() => applyVariableOps(semantic, [{ op: "setValue", name: "Color/Border/Accent/Base", mode: "Dark", value: { alias: "Spacing/Gap/Small" } }], context()), "invalid", /number variable/);
  refused(() => applyVariableOps(semantic, [{ op: "setValue", name: "Color/Border/Accent/Base", mode: "Dark", value: { alias: "Nope/1" } }], context()), "invalid", /no variable Nope\/1/);
  // Content/Accent/Base → Border/Accent/Base, which already reads Content/Accent/Base: a loop.
  refused(() => applyVariableOps(semantic, [{ op: "setValue", name: "Color/Content/Accent/Base", mode: "Light", value: { alias: "Color/Border/Accent/Base" } }], context()), "invalid", /loop/);
});

test("numbers, unknown modes and bad values", () => {
  const out = applyVariableOps(spacing, [{ op: "setValue", name: "Spacing/Gap/Small", mode: "Standard", value: "14" }], context());
  assert.equal(readCollection(out.text).tokens[0].valuesByMode.Standard, 14);
  refused(() => applyVariableOps(spacing, [{ op: "setValue", name: "Spacing/Gap/Small", mode: "Standard", value: "a lot" }], context()), "invalid", /not a number/);
  refused(() => applyVariableOps(spacing, [{ op: "setValue", name: "Spacing/Gap/Small", mode: "Compact", value: 4 }], context()), "invalid", /no mode Compact/);
  refused(() => applyVariableOps(spacing, [{ op: "setValue", name: "Spacing/Gap/Huge", mode: "Standard", value: 4 }], context()), "not-found", /not in Spacing/);
});

test("create: a default per mode, after its group's last variable; names unique across collections and CSS", () => {
  const out = applyVariableOps(semantic, [{ op: "create", name: "Color/Content/Accent/Strong", type: "COLOR" }], context());
  const read = readCollection(out.text);
  assert.deepEqual(read.tokens.map((token) => token.name), ["Color/Content/Accent/Base", "Color/Content/Accent/Strong", "Color/Border/Accent/Base"]);
  assert.deepEqual(read.tokens[1].valuesByMode, { Light: "#FFFFFF", Dark: "#FFFFFF" });
  refused(() => applyVariableOps(semantic, [{ op: "create", name: "Light/Blue/9", type: "COLOR" }], context()), "conflict", /already exists in Global Colors/);
  refused(() => applyVariableOps(semantic, [{ op: "create", name: "color/content/accent/base", type: "COLOR" }], context()), "conflict", /--zen-color-content-accent-base/);
  refused(() => applyVariableOps(semantic, [{ op: "create", name: "Color//Base", type: "COLOR" }], context()), "invalid", /between its/);
});

test("rename and delete are refused while something reads the variable; free ones go", () => {
  const variables = variablesOf(files);
  assert.deepEqual(aliasReaders(variables, "Color/Content/Accent/Base"), ["Color/Border/Accent/Base"]);
  const readers = (name) => aliasReaders(variables, name);
  refused(() => applyVariableOps(semantic, [{ op: "rename", name: "Color/Content/Accent/Base", to: "Color/Content/Accent/Main" }], context(readers)), "conflict", /read by Color\/Border\/Accent\/Base/);
  refused(() => applyVariableOps(semantic, [{ op: "delete", name: "Color/Content/Accent/Base" }], context(readers)), "conflict", /deleting it would break/);
  const renamed = applyVariableOps(semantic, [{ op: "rename", name: "Color/Border/Accent/Base", to: "Color/Border/Accent/Main" }], context(readers));
  assert.equal(readCollection(renamed.text).tokens[1].name, "Color/Border/Accent/Main");
  const deleted = applyVariableOps(semantic, [{ op: "delete", name: "Color/Border/Accent/Base" }], context(readers));
  assert.equal(readCollection(deleted.text).tokens.length, 1);
});

test("duplicate: '<name> copy', numbered when taken, right after the source", () => {
  const once = applyVariableOps(spacing, [{ op: "duplicate", name: "Spacing/Gap/Small" }], context());
  assert.deepEqual(readCollection(once.text).tokens.map((token) => token.name), ["Spacing/Gap/Small", "Spacing/Gap/Small copy"]);
  const twice = applyVariableOps(once.text, [{ op: "duplicate", name: "Spacing/Gap/Small" }], { variables: variablesOf(new Map([...files, ["tokens/source/figma/spacing.json", once.text]])), readers: () => [] });
  assert.deepEqual(readCollection(twice.text).tokens.map((token) => token.name), ["Spacing/Gap/Small", "Spacing/Gap/Small copy 2", "Spacing/Gap/Small copy"]);
});

test("resolveValue follows aliases into another collection's mode of that name, else its first", () => {
  const variables = variablesOf(files);
  assert.equal(resolveValue(variables, "Color/Content/Accent/Base", "Light"), "#0090FF");
  assert.equal(resolveValue(variables, "Color/Border/Accent/Base", "Light"), "#0090FF");
  assert.equal(resolveValue(variables, "Color/Border/Accent/Base", "Dark"), "#112233");
});

test("the plugin package: set, create, delete, and a rename read from a deleted + created twin", () => {
  const after = applyVariableOps(semantic, [
    { op: "setValue", name: "Color/Content/Accent/Base", mode: "Dark", value: "#FF0000" },
    { op: "rename", name: "Color/Border/Accent/Base", to: "Color/Border/Accent/Main" },
    { op: "create", name: "Color/Content/Accent/Strong", type: "COLOR" },
  ], context()).text;
  const pkg = variablesPackage(new Map([["s", semantic]]), new Map([["s", after]]));
  assert.equal(pkg.format, "zen-studio-variables");
  assert.deepEqual(pkg.changes, [
    { op: "rename", collection: "Mode Colors (Semantic)", name: "Color/Border/Accent/Main", from: "Color/Border/Accent/Base", type: "COLOR" },
    { op: "create", collection: "Mode Colors (Semantic)", name: "Color/Content/Accent/Strong", type: "COLOR", values: { Light: "#FFFFFF", Dark: "#FFFFFF" } },
    { op: "set", collection: "Mode Colors (Semantic)", name: "Color/Content/Accent/Base", type: "COLOR", values: { Dark: "#FF0000" } },
  ]);
  const gone = applyVariableOps(spacing, [{ op: "delete", name: "Spacing/Gap/Small" }], context()).text;
  assert.deepEqual(variablesPackage(new Map([["p", spacing]]), new Map([["p", gone]])).changes, [{ op: "delete", collection: "Spacing", name: "Spacing/Gap/Small", type: "FLOAT" }]);
  const aliased = applyVariableOps(semantic, [{ op: "setValue", name: "Color/Border/Accent/Base", mode: "Dark", value: { alias: "Light/Blue/9" } }], context()).text;
  assert.deepEqual(variablesPackage(new Map([["s", semantic]]), new Map([["s", aliased]])).changes[0].values, { Dark: { alias: "Light/Blue/9" } });
});

test("the repo's own token sources read, and a no-op edit gives the same text back", () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const dir = path.join(root, "tokens/source/figma");
  const texts = new Map(fs.readdirSync(dir).filter((name) => name.endsWith(".json")).map((name) => [`tokens/source/figma/${name}`, fs.readFileSync(path.join(dir, name), "utf8")]));
  const variables = variablesOf(texts);
  assert.ok(variables.size > 2000);
  const spacingText = texts.get("tokens/source/figma/spacing.json");
  const first = readCollection(spacingText).tokens[0];
  const mode = Object.keys(first.valuesByMode)[0];
  const same = applyVariableOps(spacingText, [{ op: "setValue", name: first.name, mode, value: first.valuesByMode[mode].startsWith?.("{") ? { alias: first.valuesByMode[mode].slice(1, -1) } : first.valuesByMode[mode] }], { variables, readers: () => [] });
  assert.equal(same.text, spacingText);
});

console.log(`✓ variables: ${count} checks pass`);

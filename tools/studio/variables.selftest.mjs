// node tools/studio/variables.selftest.mjs — Figma's Local variables on the token sources (variables.mjs).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NEW_COLLECTION_MODE, VariableEditError, aliasReaders, applyVariableOps, collectionFileOf, cssNameOf, normalizeColor, readCollection, resolveValue, variablesOf, variablesPackage } from "./variables.mjs";

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

test("delete is refused while something reads the variable; a rename keeps a read name as formerNames (v2); free ones go", () => {
  const variables = variablesOf(files);
  assert.deepEqual(aliasReaders(variables, "Color/Content/Accent/Base"), ["Color/Border/Accent/Base"]);
  const readers = (name) => aliasReaders(variables, name);
  refused(() => applyVariableOps(semantic, [{ op: "delete", name: "Color/Content/Accent/Base" }], context(readers)), "conflict", /deleting it would break/);
  // v2 (user 2026-10-23): renamed while aliased → the old name stays; code reading the Figma name by quotes refuses it.
  const kept = applyVariableOps(semantic, [{ op: "rename", name: "Color/Content/Accent/Base", to: "Color/Content/Accent/Main" }], context(readers));
  const main = readCollection(kept.text).tokens[0];
  assert.deepEqual([main.name, main.formerNames], ["Color/Content/Accent/Main", ["Color/Content/Accent/Base"]]);
  refused(() => applyVariableOps(semantic, [{ op: "rename", name: "Color/Content/Accent/Base", to: "Color/Content/Accent/Main" }], { ...context(readers), nameReaders: () => ["components/Link/Link.tsx"] }), "conflict", /by its name: renaming it would break/);
  // The old name still resolves and still has its readers; another variable may not take it; renaming back frees it.
  const after = variablesOf(new Map([...files, ["tokens/source/figma/mode-colors-semantic.json", kept.text]]));
  assert.equal(resolveValue(after, "Color/Content/Accent/Base", "Light"), "#0090FF");
  assert.deepEqual(aliasReaders(after, "Color/Content/Accent/Main"), ["Color/Border/Accent/Base"]);
  refused(() => applyVariableOps(kept.text, [{ op: "rename", name: "Color/Border/Accent/Base", to: "Color/Content/Accent/Base" }], { variables: after, readers: () => [] }), "conflict", /old name of Color\/Content\/Accent\/Main/);
  const back = applyVariableOps(kept.text, [{ op: "rename", name: "Color/Content/Accent/Main", to: "Color/Content/Accent/Base" }], { variables: after, readers: () => [] });
  assert.deepEqual(Object.keys(readCollection(back.text).tokens[0]), ["name", "type", "valuesByMode"]);
  // The plugin sees a rename (twin), formerNames being repo-only.
  assert.deepEqual(variablesPackage(new Map([["s", semantic]]), new Map([["s", kept.text]])).changes.map((change) => [change.op, change.from, change.name]), [["rename", "Color/Content/Accent/Base", "Color/Content/Accent/Main"]]);
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
    { op: "rename", collection: "Mode Colors (Semantic)", name: "Color/Border/Accent/Main", from: "Color/Border/Accent/Base", type: "COLOR", codeSyntax: { WEB: "var(--zen-color-border-accent-main)" } },
    { op: "create", collection: "Mode Colors (Semantic)", name: "Color/Content/Accent/Strong", type: "COLOR", values: { Light: "#FFFFFF", Dark: "#FFFFFF" }, codeSyntax: { WEB: "var(--zen-color-content-accent-strong)" }, description: "", scopes: ["ALL_SCOPES"], hiddenFromPublishing: false },
    { op: "set", collection: "Mode Colors (Semantic)", name: "Color/Content/Accent/Base", type: "COLOR", values: { Dark: "#FF0000" } },
  ]);
  const gone = applyVariableOps(spacing, [{ op: "delete", name: "Spacing/Gap/Small" }], context()).text;
  assert.deepEqual(variablesPackage(new Map([["p", spacing]]), new Map([["p", gone]])).changes, [{ op: "delete", collection: "Spacing", name: "Spacing/Gap/Small", type: "FLOAT" }]);
  const aliased = applyVariableOps(semantic, [{ op: "setValue", name: "Color/Border/Accent/Base", mode: "Dark", value: { alias: "Light/Blue/9" } }], context()).text;
  assert.deepEqual(variablesPackage(new Map([["s", semantic]]), new Map([["s", aliased]])).changes[0].values, { Dark: { alias: "Light/Blue/9" } });
});

test("Edit variable (v2): description, scopes by type, hidden from publishing; written in the plugin's field order", () => {
  const edited = applyVariableOps(semantic, [{ op: "meta", name: "Color/Content/Accent/Base", description: "  Links and accents  ", scopes: ["TEXT_FILL", "STROKE_COLOR", "TEXT_FILL"], hiddenFromPublishing: true }], context());
  const token = readCollection(edited.text).tokens[0];
  assert.deepEqual(Object.keys(token), ["name", "type", "valuesByMode", "scopes", "description", "hiddenFromPublishing"]);
  assert.deepEqual([token.description, token.scopes, token.hiddenFromPublishing, edited.label], ["Links and accents", ["TEXT_FILL", "STROKE_COLOR"], true, "Edit variable Color/Content/Accent/Base"]);
  refused(() => applyVariableOps(semantic, [{ op: "meta", name: "Color/Content/Accent/Base", scopes: ["GAP"] }], context()), "invalid", /is a colour: it has no scope GAP/);
  // Clearing: an empty description, ALL_SCOPES and false write nothing; an empty list hides it from every picker.
  const cleared = applyVariableOps(edited.text, [{ op: "meta", name: "Color/Content/Accent/Base", description: "", scopes: ["ALL_SCOPES"], hiddenFromPublishing: false }], context());
  assert.deepEqual(Object.keys(readCollection(cleared.text).tokens[0]), ["name", "type", "valuesByMode"]);
  assert.deepEqual(readCollection(applyVariableOps(semantic, [{ op: "meta", name: "Color/Content/Accent/Base", scopes: [] }], context()).text).tokens[0].scopes, []);
  // The package: a meta change with the three fields as they are now; a duplicate keeps them.
  const pkg = variablesPackage(new Map([["s", semantic]]), new Map([["s", edited.text]]));
  assert.deepEqual(pkg.changes, [{ op: "meta", collection: "Mode Colors (Semantic)", name: "Color/Content/Accent/Base", type: "COLOR", description: "Links and accents", scopes: ["TEXT_FILL", "STROKE_COLOR"], hiddenFromPublishing: true }]);
  const twin = applyVariableOps(edited.text, [{ op: "duplicate", name: "Color/Content/Accent/Base" }], context());
  assert.equal(readCollection(twin.text).tokens[1].description, "Links and accents");
  // A collection's own fields stay where they were.
  const hidden = `${JSON.stringify({ Spacing: { hiddenFromPublishing: true, modes: ["Standard"], tokens: [{ name: "Spacing/Gap/Small", type: "FLOAT", valuesByMode: { Standard: 12 } }] } }, null, 2)}\n`;
  const kept = applyVariableOps(hidden, [{ op: "setValue", name: "Spacing/Gap/Small", mode: "Standard", value: 14 }], context()).text;
  assert.deepEqual(Object.keys(JSON.parse(kept).Spacing), ["hiddenFromPublishing", "modes", "tokens"]);
});

test("modes (v2): add (first mode's values, Figma's Mode N), duplicate beside, rename, delete; refused while used; axis collections only", () => {
  const added = applyVariableOps(semantic, [{ op: "addMode" }], context());
  const read = readCollection(added.text);
  assert.deepEqual([read.modes, read.tokens[0].valuesByMode["Mode 3"], added.label], [["Light", "Dark", "Mode 3"], "{Light/Blue/9}", "Add mode Mode 3"]);
  const twin = readCollection(applyVariableOps(semantic, [{ op: "addMode", from: "Light" }], context()).text);
  assert.deepEqual(twin.modes, ["Light", "Light copy", "Dark"]);
  assert.deepEqual(Object.keys(twin.tokens[0].valuesByMode), ["Light", "Light copy", "Dark"]);
  refused(() => applyVariableOps(semantic, [{ op: "addMode", name: "dark" }], context()), "conflict", /would be dark in code, as Dark is already/);
  const renamed = readCollection(applyVariableOps(added.text, [{ op: "renameMode", mode: "Mode 3", to: "Dim" }], context()).text);
  assert.deepEqual([renamed.modes, Object.keys(renamed.tokens[1].valuesByMode)], [["Light", "Dark", "Dim"], ["Light", "Dark", "Dim"]]);
  const used = { ...context(), modeReaders: (collection, mode) => (mode === "Dark" ? ["components/Provider/provider.css"] : []) };
  refused(() => applyVariableOps(semantic, [{ op: "deleteMode", mode: "Dark" }], used), "conflict", /Dark is used by components\/Provider\/provider.css: deleting it/);
  refused(() => applyVariableOps(semantic, [{ op: "renameMode", mode: "Dark", to: "Night" }], used), "conflict", /renaming it would break/);
  // A case-only rename keeps the code id: allowed while used.
  assert.deepEqual(readCollection(applyVariableOps(semantic, [{ op: "renameMode", mode: "Dark", to: "DARK" }], used).text).modes, ["Light", "DARK"]);
  const gone = readCollection(applyVariableOps(semantic, [{ op: "deleteMode", mode: "Dark" }], context()).text);
  assert.deepEqual([gone.modes, Object.keys(gone.tokens[0].valuesByMode)], [["Light"], ["Light"]]);
  refused(() => applyVariableOps(spacing, [{ op: "addMode" }], context()), "invalid", /not a ZenProvider mode/);
  // The plugin package: renameMode / addMode / deleteMode, the new mode's values as set changes.
  const pkg = variablesPackage(new Map([["s", semantic]]), new Map([["s", applyVariableOps(semantic, [{ op: "renameMode", mode: "Dark", to: "Night" }, { op: "addMode", name: "Dim", from: "Light" }], context()).text]]));
  assert.deepEqual(pkg.changes.filter((change) => /Mode$/.test(change.op)), [{ op: "renameMode", collection: "Mode Colors (Semantic)", mode: "Night", from: "Dark" }, { op: "addMode", collection: "Mode Colors (Semantic)", mode: "Dim" }]);
  assert.ok(pkg.changes.filter((change) => change.op === "set").every((change) => Object.keys(change.values).join() === "Dim"), "only the new mode's values are sets (the renamed one kept them)");
});

test("createCollection (user 2026-10-23, one mode): a new file's text, its name checked; then its variables; the package creates it first", () => {
  const collections = [...files].map(([file, body]) => ({ file, name: readCollection(body).name }));
  const made = applyVariableOps("", [{ op: "createCollection", name: "  Brand   Extras ", layer: "primitive", purpose: " Partner  palettes " }], { ...context(), collections });
  assert.deepEqual([JSON.parse(made.text), made.label, made.changed, collectionFileOf("Brand Extras"), NEW_COLLECTION_MODE], [{ "Brand Extras": { layer: "primitive", purpose: "Partner palettes", modes: ["Mode 1"], tokens: [] } }, "Create collection Brand Extras", [], "tokens/source/figma/brand-extras.json", "Mode 1"]);
  assert.equal(JSON.parse(applyVariableOps("", [{ op: "createCollection", name: "Plain" }], { ...context(), collections }).text).Plain.layer, "semantic", "the docs' group defaults to Semantic");
  refused(() => applyVariableOps("", [{ op: "createCollection", name: "Odd", layer: "theme" }], { ...context(), collections }), "invalid", /group is primitive, semantic, component, layout/);
  assert.ok(made.text.endsWith("}\n"), "written as the exports are (two spaces, a final newline)");
  // With a first variable in the same edit: one label, the variable in the one mode.
  const withGap = applyVariableOps("", [{ op: "createCollection", name: "Extras" }, { op: "create", name: "Extras/Gap", type: "FLOAT" }], { ...context(), collections });
  assert.deepEqual([readCollection(withGap.text).tokens, withGap.label], [[{ name: "Extras/Gap", type: "FLOAT", valuesByMode: { "Mode 1": 0 } }], "Create collection Extras"]);
  // Rename (Figma's collection menu): a collection made here, its file kept; the 11 Figma exports are refused.
  const extras = [...collections, { file: "tokens/source/figma/extras.json", name: "Extras" }];
  const renamed = applyVariableOps(withGap.text, [{ op: "renameCollection", to: "Partner Extras" }], { ...context(), collections: extras, file: "tokens/source/figma/extras.json" });
  assert.deepEqual([Object.keys(JSON.parse(renamed.text)), readCollection(renamed.text).tokens.length, renamed.label], [["Partner Extras"], 1, "Rename collection Extras → Partner Extras"]);
  assert.equal(applyVariableOps(withGap.text, [{ op: "renameCollection", to: "extras" }], { ...context(), collections: extras, file: "tokens/source/figma/extras.json" }).label, "Rename collection Extras → extras", "a case-only rename keeps its own file");
  refused(() => applyVariableOps(withGap.text, [{ op: "renameCollection", to: "Spacing" }], { ...context(), collections: extras, file: "tokens/source/figma/extras.json" }), "conflict", /Spacing already exists/);
  refused(() => applyVariableOps(spacing, [{ op: "renameCollection", to: "Gaps" }], { ...context(), collections: extras, file: "tokens/source/figma/spacing.json", fixed: true }), "invalid", /one of the 11 Figma exports/);
  refused(() => applyVariableOps("", [{ op: "createCollection", name: "spacing" }], { ...context(), collections }), "conflict", /Spacing already exists/);
  refused(() => applyVariableOps("", [{ op: "createCollection", name: "Global  colors!" }], { ...context(), collections: [{ file: "tokens/source/figma/global-colors.json", name: "Primitives" }] }), "conflict", /would be tokens\/source\/figma\/global-colors.json, the file of Primitives/);
  refused(() => applyVariableOps("", [{ op: "createCollection", name: " - " }], { ...context(), collections }), "invalid", /needs a letter or a digit/);
  refused(() => applyVariableOps(spacing, [{ op: "createCollection", name: "Extras" }], { ...context(), collections }), "invalid", /makes a new file/);
  refused(() => applyVariableOps(spacing, [{ op: "create", name: "A/B", type: "FLOAT" }, { op: "createCollection", name: "Extras" }], { ...context(), collections }), "invalid", /comes first/);
  // Saved, Figma has not got it (its base is null, "no file"): Create collection, then its variables.
  const pkg = variablesPackage(new Map([["tokens/source/figma/extras.json", null]]), new Map([["tokens/source/figma/extras.json", withGap.text]]));
  assert.deepEqual(pkg.changes.map((change) => [change.op, change.collection, change.modes ?? change.name]), [["createCollection", "Extras", ["Mode 1"]], ["create", "Extras", "Extras/Gap"]]);
  // Renamed in its file: renameCollection first; deleted (the file gone): deleteCollection last.
  const twice = variablesPackage(new Map([["tokens/source/figma/extras.json", withGap.text], ["tokens/source/figma/old.json", made.text]]), new Map([["tokens/source/figma/extras.json", renamed.text]]));
  assert.deepEqual(twice.changes.map((change) => [change.op, change.collection, change.from]), [["renameCollection", "Partner Extras", "Extras"], ["deleteCollection", "Brand Extras", undefined]]);
  // A file Figma never had and that is gone again: nothing.
  assert.deepEqual(variablesPackage(new Map([["tokens/source/figma/extras.json", null]]), new Map()).changes, []);
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

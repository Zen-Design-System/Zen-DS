// node src/platform/studio/variables/variablesModel.selftest.mjs — the Variables window's rows and values.
import assert from "node:assert/strict";
import { aliasOptions, colorParts, colorWith, groupsOf, indexOf, newName, resolved, rowsOf } from "./variablesModel.ts";

let count = 0;
const test = (name, run) => { try { run(); count += 1; } catch (error) { console.error(`✗ ${name}`); throw error; } };

const global = { file: "g", name: "Global Colors", modes: ["Zen"], tokens: [
  { name: "Light/Blue/9", type: "COLOR", valuesByMode: { Zen: "#0F73FF" } },
  { name: "Light/Blue/10", type: "COLOR", valuesByMode: { Zen: "#0D66E5" } },
] };
const semantic = { file: "s", name: "Mode Colors (Semantic)", modes: ["Light", "Dark"], tokens: [
  { name: "Color/Content/Accent/Base", type: "COLOR", valuesByMode: { Light: "{Light/Blue/9}", Dark: "{Light/Blue/10}" } },
  { name: "Color/Content/Accent/Light", type: "COLOR", valuesByMode: { Light: "{Color/Content/Accent/Base}", Dark: "#11223380" } },
  { name: "Color/Border/Accent/Base", type: "COLOR", valuesByMode: { Light: "#000000", Dark: "#FFFFFF" } },
  { name: "Spacing/Gap", type: "FLOAT", valuesByMode: { Light: 8, Dark: 8 } },
] };
const index = indexOf([global, semantic]);

test("groups as Figma's tree, depth first, with counts", () => {
  assert.deepEqual(groupsOf(semantic).map((node) => `${"  ".repeat(node.depth)}${node.label} ${node.count}`), [
    "Color 3", "  Content 2", "    Accent 2", "  Border 1", "    Accent 1", "Spacing 1",
  ]);
});

test("rows: a header before each group, filtered by group, words and type", () => {
  const rows = (options) => rowsOf(semantic, options).map((row) => (row.kind === "group" ? `# ${row.path}` : row.variable.name));
  assert.deepEqual(rows(), ["# Color/Content/Accent", "Color/Content/Accent/Base", "Color/Content/Accent/Light", "# Color/Border/Accent", "Color/Border/Accent/Base", "# Spacing", "Spacing/Gap"]);
  assert.deepEqual(rows({ group: "Color/Border" }), ["# Color/Border/Accent", "Color/Border/Accent/Base"]);
  assert.deepEqual(rows({ query: "accent lig" }), ["# Color/Content/Accent", "Color/Content/Accent/Light"]);
  assert.deepEqual(rows({ type: "FLOAT" }), ["# Spacing", "Spacing/Gap"]);
});

test("rows go group by group, one header each, whatever order the file writes them in", () => {
  const brand = { file: "b", name: "Base Colors", modes: ["Zen"], tokens: ["Light/Brand/1", "Light/Brand-Alpha/1", "Light/Brand/2", "Light/Brand/3", "Light/Brand-Alpha/2", "Dark/Brand/1"].map((name) => ({ name, type: "COLOR", valuesByMode: { Zen: "#FFFFFF" } })) };
  const rows = rowsOf(brand).map((row) => (row.kind === "group" ? `# ${row.path}` : row.variable.name));
  assert.deepEqual(rows, ["# Light/Brand", "Light/Brand/1", "Light/Brand/2", "Light/Brand/3", "# Light/Brand-Alpha", "Light/Brand-Alpha/1", "Light/Brand-Alpha/2", "# Dark/Brand", "Dark/Brand/1"]);
});

test("values resolve through aliases, into another collection's first mode", () => {
  assert.equal(resolved(index, "Color/Content/Accent/Light", "Light"), "#0F73FF");
  assert.equal(resolved(index, "Color/Content/Accent/Base", "Dark"), "#0D66E5");
  assert.equal(resolved(index, "Color/Content/Accent/Light", "Dark"), "#11223380");
});

test("colours split into hex and opacity, and back in the file's spelling", () => {
  assert.deepEqual(colorParts("#11223380"), { hex: "#112233", alpha: 50 });
  assert.deepEqual(colorParts("#0f73ff"), { hex: "#0F73FF", alpha: 100 });
  assert.equal(colorParts("{Light/Blue/9}"), null);
  assert.equal(colorWith("#112233", 50), "#11223380");
  assert.equal(colorWith("0f73ff", 100), "#0F73FF");
  assert.equal(colorWith("#000000", 0), "#00000000");
});

test("new names are free in the group", () => {
  assert.equal(newName("Color/Content", "COLOR", new Set()), "Color/Content/New colour");
  assert.equal(newName("", "FLOAT", new Set(["New number"])), "New number 2");
});

test("alias options: same type, never itself or a variable that reads it", () => {
  const names = aliasOptions(index, "COLOR", "Color/Content/Accent/Base").map((entry) => entry.variable.name);
  assert.ok(names.includes("Light/Blue/9") && names.includes("Color/Border/Accent/Base"));
  assert.ok(!names.includes("Color/Content/Accent/Base"), "itself");
  assert.ok(!names.includes("Color/Content/Accent/Light"), "Light reads Base: aliasing it would loop");
  assert.ok(!names.includes("Spacing/Gap"), "another type");
});

console.log(`✓ variables model: ${count} checks pass`);

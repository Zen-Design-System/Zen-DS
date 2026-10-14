#!/usr/bin/env node
// The AI UI catalog: what a model may compose at run time, as data a validator can check (docs/ai-ui/README.md).
//
//   node tools/ai-ui/build-catalog.mjs           write docs/ai-ui/{catalog.json, catalog.index.json, spec.schema.json, composer-rules.md}
//   node tools/ai-ui/build-catalog.mjs --check   exit 1 when any of them is out of date (CI, `npm run ai-ui:check`)
//
// Sources (never edited here): docs/api/*.json (props, types; react-docgen through scripts/build-api.mjs),
// docs/guidelines/index.json (public components, purpose / use / avoid / do / don't / harness rules), docs/figma-contracts
// and tools/figma-contract/suites (which components a Figma parity suite verifies), AGENTS.consumer.md §3 (the rules
// that go wrong most often), and the decisions in catalog.config.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUTO_BIND_PROPS, BINDING_ALIASES, CHROME_COMPONENTS, EXCLUDED_PROP_NAMES, EXCLUDED_TYPE_RE, HTML_ATTRIBUTES, STATUS_OVERRIDES } from "./catalog.config.mjs";
import { typeSchema } from "./types.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = path.join(root, "docs/ai-ui");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

/* ── sources ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const packageJson = readJson("package.json");
const guidelines = readJson("docs/guidelines/index.json").components;
const api = fs.readdirSync(path.join(root, "docs/api")).filter((f) => f.endsWith(".json")).map((f) => readJson(`docs/api/${f}`));

/** Public components: the ones a guideline lists under `props` (parts such as DatePickerItem are not), with their slug. */
const slugOf = new Map();
for (const g of guidelines) for (const name of Object.keys(g.props ?? {})) if (!slugOf.has(name)) slugOf.set(name, g.slug);

/** Components the Figma parity suites and captures cover, by component folder (heuristic on file names; README). */
function verifiedFolders() {
  const folders = fs.readdirSync(path.join(root, "src/components"), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  const byToken = new Map(folders.map((f) => [f.toLowerCase(), f]));
  const alias = { radio: "RadioButton", datepicker: "DatePicker", avatarstack: "Avatar", cells: "Table", bubbles: "Chat", icon: "Button", text: "Button", main: "Button", flat: "Button", overlay: "Button", primitives: "Input", heading: "Input", search: "Search", bunk: "Popover", manual: "Popover", item: "Popover", content: "Popover", mark: "Checkbox", advanced: "Chip", normal: "Chip", number: "Chip", trailing: "Chip" };
  const names = [
    ...fs.readdirSync(path.join(root, "docs/figma-contracts")).filter((f) => f.endsWith(".json") && !/^(component-properties|layer-renames|nested-layers)/.test(f)).map((f) => f.replace(/\.json$/, "")),
    ...(fs.existsSync(path.join(root, "tools/figma-contract/suites")) ? fs.readdirSync(path.join(root, "tools/figma-contract/suites")).filter((f) => f.endsWith(".mjs") && !f.startsWith("_")).map((f) => f.replace(/\.mjs$/, "")) : []),
  ];
  const verified = new Set();
  for (const name of names) {
    const tokens = name.split("-").filter((t) => !/^\d+$/.test(t));
    for (let i = 0; i < tokens.length; i++) {
      const pair = tokens[i + 1] ? byToken.get(`${tokens[i]}${tokens[i + 1]}`) : undefined;
      const folder = pair ?? alias[tokens[i]] ?? byToken.get(tokens[i]);
      if (folder) verified.add(folder);
    }
  }
  return verified;
}

/* ── one component ───────────────────────────────────────────────────────────────────────────────────────────────── */

const firstSentence = (text) => {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const cut = clean.search(/\.(\s|$)/);
  return (cut > 0 && cut < 180 ? clean.slice(0, cut + 1) : clean.slice(0, 180)).trim();
};
const parseDefault = (text) => {
  if (text === null || text === undefined) return undefined;
  try { return JSON.parse(text); } catch { return /^[\w-]+$/.test(text) ? text : undefined; }
};
const capital = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function componentEntry(component, file, slug, defs, verified) {
  const ctx = { types: file.types ?? {}, file: path.join(root, component.file), defs, root };
  const folder = component.file.split("/")[2];
  const props = {};
  const excluded = [];
  const actions = [];
  for (const prop of component.props) {
    if (prop.deprecated) { excluded.push(`${prop.name} (deprecated: ${prop.deprecated})`); continue; }
    if (EXCLUDED_PROP_NAMES.has(prop.name)) { excluded.push(`${prop.name} (not for a generated UI)`); continue; }
    if (EXCLUDED_TYPE_RE.test(prop.type) && !/ReactElement|ReactNode/.test(prop.type)) { excluded.push(`${prop.name} (${prop.type.slice(0, 40)})`); continue; }
    const schema = typeSchema(prop.type, ctx);
    if (schema === null) { excluded.push(`${prop.name} (${prop.type.replace(/\s+/g, " ").slice(0, 60)})`); continue; }
    const entry = { ...schema };
    if (prop.required) entry["x-required"] = true;
    const fallback = parseDefault(prop.default);
    if (fallback !== undefined) entry.default = fallback;
    const description = firstSentence(prop.description);
    if (description) entry.description = description;
    props[prop.name] = entry;
    if (schema["x-kind"] === "action") actions.push(prop.name);
  }
  const extendsText = component.extends ?? "";
  const omitted = new Set([...extendsText.matchAll(/Omit<[^,]+,\s*([^>]+)>/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((k) => k[1])));
  for (const group of HTML_ATTRIBUTES) {
    if (!group.when.test(extendsText)) continue;
    for (const [name, schema] of Object.entries(group.props)) if (!props[name] && !omitted.has(name) && !EXCLUDED_PROP_NAMES.has(name)) props[name] = { ...schema, "x-html": true };
  }
  // `value` / `defaultValue` (and `checked`) are HTML attributes react-docgen leaves out: a handler `on<X>Change` whose
  // first parameter is JSON names the prop it controls, so the pair is written out (API convention, AGENTS.md §B).
  for (const [handler, schema] of Object.entries(props)) {
    const m = schema["x-kind"] === "action" && /^on([A-Z]\w*)Change$/.exec(handler);
    if (!m || !schema.params?.[0]?.json) continue;
    const prop = m[1].charAt(0).toLowerCase() + m[1].slice(1);
    const aliased = Object.entries(BINDING_ALIASES).find(([, h]) => h === handler)?.[0] ?? prop;
    if (props[aliased] || !AUTO_BIND_PROPS.has(aliased)) continue;
    const valueSchema = typeSchema(schema.params[0].type, ctx) ?? { type: "string" };
    props[aliased] = { ...valueSchema, description: `Controlled value (pairs with ${handler}).`, "x-synthesized": true };
    if (!props[`default${capital(aliased)}`]) props[`default${capital(aliased)}`] = { ...valueSchema, description: `Initial value when uncontrolled.`, "x-synthesized": true };
  }
  // Controlled pairs: `value` + `onValueChange`, `open` + `onOpenChange`… (the renderer binds them to shared state).
  const bindings = [];
  for (const name of Object.keys(props)) {
    if (props[name]["x-kind"] === "action") continue;
    const handler = BINDING_ALIASES[name] ?? `on${capital(name)}Change`;
    if (props[handler]?.["x-kind"] === "action") bindings.push({ prop: name, handler, ...(AUTO_BIND_PROPS.has(name) ? { auto: true } : {}), ...(props[`default${capital(name)}`] ? { initial: `default${capital(name)}` } : {}) });
  }
  const status = STATUS_OVERRIDES[component.name] ?? (verified.has(folder) ? "verified" : "stable");
  const guideline = guidelines.find((g) => g.slug === slug);
  return {
    name: component.name,
    slug,
    folder,
    status,
    ...(CHROME_COMPONENTS.has(component.name) ? { chrome: true } : {}),
    import: guideline?.import ?? `import { ${component.name} } from "@zen-ds/react";`,
    purpose: guideline?.purpose ?? "",
    use: guideline?.use ?? [],
    avoid: guideline?.avoid ?? [],
    description: firstSentence(component.description),
    props,
    requiredActions: actions.filter((name) => props[name]["x-required"]),
    bindings,
    excluded,
  };
}

/* ── the catalog ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export function buildCatalog() {
  const verified = verifiedFolders();
  const defs = {};
  const components = {};
  const seen = new Set();
  for (const file of api) {
    for (const component of file.components) {
      const slug = slugOf.get(component.name);
      if (!slug || seen.has(component.name)) continue; // DateField is documented twice (input + date-picker)
      seen.add(component.name);
      components[component.name] = componentEntry(component, file, slug, defs, verified);
    }
  }
  const guidelineRules = Object.fromEntries(guidelines.filter((g) => Object.keys(g.props ?? {}).length).map((g) => [g.slug, { title: g.title, file: g.file, do: g.do ?? [], dont: g.dont ?? [], rules: g.rules ?? [] }]));
  const ordered = Object.fromEntries(Object.entries(components).sort(([a], [b]) => a.localeCompare(b)));
  return {
    $comment: "Generated by tools/ai-ui/build-catalog.mjs from docs/api, docs/guidelines/index.json and the Figma contracts. Do not edit; decisions live in tools/ai-ui/catalog.config.mjs.",
    version: packageJson.version,
    spec: { format: "zen-ui-spec", version: 1, markers: ["$ref", "$state", "$action", "$map", "pending"] },
    statuses: { stable: "documented in docs/api and a guideline, smoke- and conformance-tested", verified: "stable, and a Figma parity suite covers its folder", experimental: "kept out of a runtime catalog unless asked for" },
    excludedPropNames: [...EXCLUDED_PROP_NAMES].sort(),
    components: ordered,
    guidelines: guidelineRules,
    $defs: Object.fromEntries(Object.entries(defs).sort(([a], [b]) => a.localeCompare(b))),
  };
}

/** Tier 1 for prompts: enough to pick a component (purpose / use / avoid) and know its prop names; tier 2 is the entry in catalog.json. */
export function buildIndex(catalog) {
  return {
    $comment: "Generated with catalog.json: one line per component to choose by purpose, with its prop names (tier 1 of a prompt). Read the component's entry in catalog.json (use / avoid, props with types and defaults, bindings; Do / Don't under guidelines[slug]) once chosen.",
    version: catalog.version,
    components: Object.values(catalog.components).map((c) => ({
      name: c.name, status: c.status, ...(c.chrome ? { chrome: true } : {}), purpose: c.purpose,
      props: Object.entries(c.props).map(([name, schema]) => `${name}${schema["x-required"] ? "" : "?"}`).join(" "),
    })),
  };
}

/** One component's props in short form (`level?: primary|accent|…`), for a prompt that already picked it. */
export function compactProps(entry, catalog) {
  return Object.entries(entry.props).map(([name, schema]) => `${name}${schema["x-required"] ? "" : "?"}: ${compactType(schema, catalog)}`);
}

function compactType(schema, catalog, depth = 0) {
  if (!schema || depth > 3) return "any";
  if (schema.$ref) return schema.$ref.split("/").pop();
  if (schema["x-kind"] === "action") return `action(${(schema.params ?? []).map((p) => `${p.name}: ${p.type}`).join(", ")})`;
  if (schema["x-kind"] === "node") return schema["x-icon"] ? "icon|node" : "node";
  if (schema["x-kind"] === "element") return "element";
  if (schema["x-kind"] === "icon") return "icon";
  if (schema["x-kind"] === "date") return "date";
  if (schema.enum) return schema.enum.map((v) => (typeof v === "string" ? v : JSON.stringify(v))).join("|");
  if (schema.anyOf) return schema.anyOf.map((s) => compactType(s, catalog, depth + 1)).join(" | ");
  if (schema.type === "array") return `${compactType(schema.items, catalog, depth + 1)}[]`;
  if (schema.type === "object") return schema.properties ? `{ ${Object.keys(schema.properties).join(", ")} }` : "object";
  if (schema.type) return schema.type;
  return "any";
}

/** JSON Schema (draft 2020-12) of a spec document: for Ajv, Zod or another tool; src/ai-ui/validate.mjs reads catalog.json instead. */
export function buildSpecSchema(catalog) {
  const names = Object.keys(catalog.components);
  const marker = (key, value) => ({ type: "object", properties: { [key]: value }, required: [key], additionalProperties: true });
  const value = { $ref: "#/$defs/value" };
  const componentSchemas = {};
  for (const [name, c] of Object.entries(catalog.components)) {
    const properties = {};
    for (const [prop, schema] of Object.entries(c.props)) {
      const { "x-required": _required, default: _default, description, ...rest } = schema;
      properties[prop] = { anyOf: [stripX(rest), { $ref: "#/$defs/marker" }], ...(description ? { description } : {}) };
    }
    componentSchemas[name] = {
      type: "object",
      properties: {
        type: { const: name },
        id: { type: "string" },
        pending: { type: "boolean" },
        props: { type: "object", properties, required: Object.entries(c.props).filter(([, s]) => s["x-required"] && s["x-kind"] !== "action").map(([k]) => k), additionalProperties: false },
        children: { type: "array", items: { $ref: "#/$defs/child" } },
      },
      required: ["type"],
      additionalProperties: false,
    };
  }
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://zen-ds.dev/ai-ui/spec.schema.json",
    title: "Zen UI spec",
    description: "A UI a model composes from the Zen DS catalog: a tree of component nodes with JSON props. Markers: {\"$ref\": \"path\"} reads data, {\"$state\": \"path\"} binds shared state, {\"$action\": \"name\", \"args\": {}} names an action, {\"$map\": \"path\", \"as\": \"item\", \"node\": {…}} repeats a node per item.",
    type: "object",
    properties: { version: { const: 1 }, root: { $ref: "#/$defs/node" }, data: { type: "object" }, state: { type: "object" } },
    required: ["version", "root"],
    additionalProperties: false,
    $defs: {
      node: { oneOf: names.map((name) => ({ $ref: `#/$defs/components/${name}` })) },
      child: { anyOf: [{ type: "string" }, { type: "number" }, { $ref: "#/$defs/node" }, marker("$ref", { type: "string" }), marker("$state", { type: "string" }), { $ref: "#/$defs/map" }, marker("$pending", { enum: ["text", "heading", "shape"] })] },
      map: { type: "object", properties: { $map: { type: "string" }, as: { type: "string" }, node: { $ref: "#/$defs/node" } }, required: ["$map", "as", "node"], additionalProperties: false },
      marker: { anyOf: [marker("$ref", { type: "string" }), marker("$state", { type: "string" }), { type: "object", properties: { $action: { type: "string" }, args: { type: "object" } }, required: ["$action"], additionalProperties: false }, { $ref: "#/$defs/node" }] },
      value,
      components: componentSchemas,
      ...Object.fromEntries(Object.entries(catalog.$defs).map(([name, schema]) => [name, stripX(schema)])),
    },
  };
}

/** Standard JSON Schema for the x-kind markers (a validator without Zen knowledge still accepts the right shapes). */
function stripX(schema) {
  if (Array.isArray(schema)) return schema.map(stripX);
  if (!schema || typeof schema !== "object") return schema;
  const out = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "x-kind") {
      if (value === "node") Object.assign(out, { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }, { $ref: "#/$defs/node" }, { type: "array", items: { $ref: "#/$defs/child" } }] });
      else if (value === "element") Object.assign(out, { $ref: "#/$defs/node" });
      else if (value === "icon") Object.assign(out, { type: "string", pattern: "^icon-" });
      else if (value === "date") Object.assign(out, { type: "string", format: "date-time" });
      else if (value === "action") Object.assign(out, { type: "object", properties: { $action: { type: "string" }, args: { type: "object" } }, required: ["$action"] });
      continue;
    }
    if (key === "x-nullable") { out.nullable = true; continue; }
    if (key === "x-icon" || key === "x-values" || key === "x-required" || key === "x-synthesized" || key === "x-html" || key === "params") continue;
    out[key] = typeof value === "object" ? stripX(value) : value;
  }
  return out;
}

/* ── composer rules (the prompt pack) ────────────────────────────────────────────────────────────────────────────── */

export function buildComposerRules(catalog) {
  const consumer = read("AGENTS.consumer.md");
  const section = consumer.slice(consumer.indexOf("## 3."), consumer.indexOf("## 4."));
  const rules = section.split("\n").filter((line) => /^\d+\.\s/.test(line) || /^\s{3,}\S/.test(line)).join("\n").replace(/^\s{3,}/gm, "   ");
  const lines = [
    "<!-- Generated by tools/ai-ui/build-catalog.mjs from AGENTS.consumer.md §3 and docs/guidelines/index.json. Do not edit. -->",
    "# Composer rules — Zen UI spec",
    "",
    "Put this file in the system prompt of the model that composes UI specs, with `catalog.index.json`; fetch a component's",
    "entry in `catalog.json` when it is chosen. The spec is validated (`validateSpec`) and linted (`lintSpec`) before it renders:",
    "a rejected spec comes back with the error paths and hints, fix those and resend.",
    "",
    "## The spec",
    "",
    "- One JSON document: `{ \"version\": 1, \"root\": <node>, \"data\"?: {…}, \"state\"?: {…} }`.",
    "- A node: `{ \"type\": \"<component>\", \"id\"?: \"<unique>\", \"props\"?: {…}, \"children\"?: [ … ] }`. Children are strings, nodes,",
    "  `{ \"$ref\": \"path\" }` (text from data), `{ \"$map\": \"path\", \"as\": \"item\", \"node\": {…} }` (one node per item) or",
    "  `{ \"$pending\": \"text\" | \"heading\" | \"shape\" }` (a Skeleton while content loads).",
    "- Prop values are JSON of the prop's type. `{ \"$ref\": \"slots\" }` reads `data.slots`; inside a `$map`, `{ \"$ref\": \"item.label\" }`",
    "  reads the item. `{ \"$state\": \"when.time\" }` binds a prop to shared state (what the person picks is visible to the",
    "  conversation). `{ \"$action\": \"book\", \"args\": { \"time\": { \"$state\": \"when.time\" } } }` names an action for a handler prop",
    "  (`onClick`, `onSubmit`, `primaryAction.onClick`); `$event` in args passes the handler's value.",
    "- Built-in actions: `setState` (`{ \"$action\": \"setState\", \"path\": \"…\", \"value\": … }`), `open` / `close` (an overlay node by",
    "  `id`), `toast`, `navigate`, `link`. Every other name reaches the app's tool of that name.",
    "- Only components and props in the catalog. No `className`, `style`, colours, pixel values or CSS: every look comes from",
    "  the component's own props and tokens. Give an `id` to every node a person can interact with.",
    "- Data comes from `data` (the app fetched it): never write the values a tool should return. An action a person cannot",
    "  undo (pay, delete, send) opens a `Dialog` whose `primaryAction` carries the `$action`.",
    "- A chat column is narrow: one column (`Stack`), `Grid` only with `stackBelow`; a `Table` of at most 4 columns; no page",
    "  chrome (`AppShell`, `Sidebar`, `TopNavigation`, `PageHeader`, `DashboardHeader`).",
    "",
    "## Rules that go wrong most often (AGENTS.consumer.md §3)",
    "",
    rules,
    "",
    "## Per component",
    "",
    "The Do / Don't of each component and the ids of the harness rules that check it are in `catalog.json` under",
    "`guidelines[<slug>]`; add the chosen components' lists to the prompt with their props (`compactProps`).",
    "",
  ];
  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

/* ── write / check ───────────────────────────────────────────────────────────────────────────────────────────────── */

export function outputs() {
  const catalog = buildCatalog();
  return {
    "catalog.json": `${JSON.stringify(catalog, null, 2)}\n`,
    "catalog.index.json": `${JSON.stringify(buildIndex(catalog), null, 2)}\n`,
    "spec.schema.json": `${JSON.stringify(buildSpecSchema(catalog), null, 2)}\n`,
    "composer-rules.md": buildComposerRules(catalog),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = outputs();
  if (process.argv.includes("--check")) {
    const stale = Object.entries(files).filter(([name, text]) => { try { return fs.readFileSync(path.join(OUT, name), "utf8") !== text; } catch { return true; } }).map(([name]) => name);
    if (stale.length) { console.error(`✗ docs/ai-ui is stale: ${stale.join(", ")}. Run npm run ai-ui:build.`); process.exitCode = 1; }
    else console.log(`✓ docs/ai-ui up to date (${Object.keys(JSON.parse(files["catalog.json"]).components).length} components)`);
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(OUT, name), text);
    const catalog = JSON.parse(files["catalog.json"]);
    const sizes = Object.entries(files).map(([name, text]) => `${name} ${(Buffer.byteLength(text) / 1024).toFixed(0)} KB`).join(" · ");
    console.log(`✓ ${Object.keys(catalog.components).length} components, ${Object.keys(catalog.$defs).length} shared types → docs/ai-ui (${sizes})`);
  }
}

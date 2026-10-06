#!/usr/bin/env node
// Zen Studio: Figma component properties → the Properties panel's groups (WP-E of
// docs/research/studio-builder-plan-2026-10-05.md). Joins the Figma read (docs/figma-contracts/component-properties.json),
// the mapping (tools/studio/figma-props.map.mjs) and the code API (src/platform/api.generated.json), then writes
// src/platform/studio/inspector/figmaProps.generated.ts: per component, its Figma properties in Figma order with their
// labels and option names, and the Figma booleans that stand for a prop's presence.
//
//   node tools/studio/figma-props-build.mjs           write it; report what is unmapped or drifted (exit 1 on errors)
//   node tools/studio/figma-props-build.mjs --check   exit 1 when the generated file is stale or anything drifted
//
// Re-reading Figma: tools/studio/figma-props-read.js is the read-only use_figma script (one call per ❖ page); put its
// results into component-properties.json and run this script: it names every new, renamed or removed property.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FIGMA_PROPS } from "./figma-props.map.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "src/platform/studio/inspector/figmaProps.generated.ts";
const check = process.argv.includes("--check");

const figma = JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/component-properties.json"), "utf8"));
const sets = new Map(figma.pages.flatMap((page) => page.sets.map((set) => [set.name, set])));
const api = JSON.parse(fs.readFileSync(path.join(root, "src/platform/api.generated.json"), "utf8"));
const codeProps = new Map();
for (const entries of Object.values(api)) for (const entry of entries) if (!codeProps.has(entry.name)) codeProps.set(entry.name, new Map(entry.props.map((prop) => [prop.name, String(prop.type ?? "")])));

const SHORT = { "2xsmall": "2xs", xsmall: "xs", small: "sm", medium: "md", large: "lg", xlarge: "xl", "2xlarge": "2xl", "3xlarge": "3xl" };
/** "Danger Subtle" → danger-subtle, "Medium (Base)" → medium, "XLarge" → xlarge. */
const normal = (option) => option.replace(/\(base\)/i, "").trim().toLowerCase().replace(/\s+/g, "-");
const literals = (type) => new Set([...type.matchAll(/"([^"]+)"/g)].map((match) => match[1]));

const errors = [];
const notes = [];
const out = {};

for (const [component, spec] of Object.entries(FIGMA_PROPS)) {
  const own = codeProps.get(component);
  if (!own) { errors.push(`${component}: not in api.generated.json`); continue; }
  const setNames = Object.keys(spec.sets);
  const found = setNames.map((name) => sets.get(name));
  const missing = setNames.filter((name, index) => !found[index]);
  if (missing.length) { errors.push(`${component}: Figma set(s) not found: ${missing.join(", ")}`); continue; }
  // Every property of the sets, in the primary set's order, then the others' new ones.
  const figmaProps = [];
  for (const set of found) for (const prop of set.props) if (!figmaProps.some((other) => other.name === prop.name)) figmaProps.push({ ...prop, options: [...(prop.options ?? [])] });
  for (const set of found) for (const prop of set.props) {
    const merged = figmaProps.find((other) => other.name === prop.name);
    for (const option of prop.options ?? []) if (!merged.options.includes(option)) merged.options.push(option);
  }
  const entry = { figma: found[0].id, own: [], toggles: [] };
  if (spec.setProp) {
    const type = own.get(spec.setProp);
    if (type === undefined) errors.push(`${component}: set prop "${spec.setProp}" is not a code prop`);
    const options = {};
    for (const [name, value] of Object.entries(spec.sets)) {
      if (!literals(type ?? "").has(value)) errors.push(`${component}: ${spec.setProp}="${value}" (set ${name}) is not a value of ${spec.setProp}`);
      options[name] = value;
    }
    entry.own.push({ prop: spec.setProp, type: "SET", options });
  }
  for (const prop of figmaProps) {
    const mapping = spec.props[prop.name];
    if (mapping === undefined) { errors.push(`${component}: Figma property "${prop.name}" (${prop.type}) is not mapped`); continue; }
    if (mapping.skip) continue;
    if (mapping.toggle) {
      if (!own.has(mapping.toggle)) errors.push(`${component}: toggle "${prop.name}" → "${mapping.toggle}" is not a code prop`);
      if (prop.type !== "BOOLEAN") notes.push(`${component}: "${prop.name}" is a ${prop.type}, mapped as a toggle`);
      entry.toggles.push({ label: prop.name, prop: mapping.toggle, on: mapping.on ?? "" });
      continue;
    }
    const codeProp = typeof mapping === "string" ? mapping : mapping.prop;
    const type = own.get(codeProp);
    if (type === undefined) { errors.push(`${component}: "${prop.name}" → "${codeProp}" is not a code prop`); continue; }
    const row = { prop: codeProp, label: prop.name, type: prop.type };
    if (prop.type === "VARIANT" && mapping.bool) {
      if (!/\bboolean\b/.test(type)) errors.push(`${component}: "${prop.name}" → "${codeProp}" is not boolean (${type.slice(0, 60)})`);
      row.options = Object.fromEntries(prop.options.map((option) => [option, /^(yes|true)$/i.test(option) ? "true" : "false"]));
    } else if (prop.type === "VARIANT") {
      const allowed = mapping.trust ? new Set() : literals(type);
      const options = {};
      for (const option of prop.options) {
        let value = mapping.values?.[option] ?? normal(option);
        if (allowed.size && !allowed.has(value) && SHORT[value] && allowed.has(SHORT[value])) value = SHORT[value];
        if (allowed.size && !allowed.has(value)) { errors.push(`${component}: ${prop.name}="${option}" → "${value}" is not a value of ${codeProp}`); continue; }
        options[option] = value;
      }
      if (prop.options.length > 1 || allowed.size) row.options = options;
    }
    // Two Figma properties on one code prop (Badge Leading-Icon-Src + a boolean): one row, the first label.
    if (!entry.own.some((other) => other.prop === codeProp)) entry.own.push(row);
  }
  out[component] = entry;
}

const header = `// Generated by tools/studio/figma-props-build.mjs from docs/figma-contracts/component-properties.json (Figma ${figma.file},\n// read ${figma.read}) and tools/studio/figma-props.map.mjs. Do not edit: change the map and run the script.\n`;
const body = `${header}
/** A component's Figma properties for the Studio's Properties panel (inspector/propGroups.ts). */
export type FigmaPropsEntry = {
  /** The Figma component set the order and names follow (the first of its sets). */
  figma: string;
  /** Its properties in Figma order: the code prop, the Figma name and property type ("SET": which of its Figma sets),
   *  and Figma option name → code value. */
  own: ReadonlyArray<{ prop: string; label?: string; type: string; options?: Readonly<Record<string, string>> }>;
  /** Figma booleans that show a layer: on writes \`on\` ("slot": the content-slot picker), off removes the prop. */
  toggles: ReadonlyArray<{ label: string; prop: string; on: string }>;
};

export const FIGMA_PROPS: Readonly<Record<string, FigmaPropsEntry>> = ${JSON.stringify(out, null, 2)};
`;

const target = path.join(root, OUT);
const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : null;
const counts = `${Object.keys(out).length} components, ${Object.values(out).reduce((n, entry) => n + entry.own.length, 0)} props, ${Object.values(out).reduce((n, entry) => n + entry.toggles.length, 0)} toggles`;
for (const note of notes) console.log(`  · ${note}`);
for (const error of errors) console.log(`  ✗ ${error}`);
if (check) {
  if (current !== body) { console.log(`✗ ${OUT} is stale: run node tools/studio/figma-props-build.mjs`); process.exit(1); }
  if (errors.length) process.exit(1);
  console.log(`✓ Figma props in sync (${counts})`);
} else {
  if (current !== body) fs.writeFileSync(target, body);
  console.log(`${errors.length ? "✗" : "✓"} ${OUT}: ${counts}${errors.length ? `, ${errors.length} error(s)` : ""}`);
  if (errors.length) process.exit(1);
}

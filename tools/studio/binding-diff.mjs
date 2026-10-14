#!/usr/bin/env node
// Zen Studio: Figma changed a binding → the CSS that follows it (core rebuild Q5(1), spec
// docs/research/studio-figma-push-spec-2026-10-12.md §3.3). After a Figma re-capture (tools/figma-kit: `code fetch`,
// `patch`) the contracts in docs/figma-contracts hold Figma's new bindings; this compares them with the last commit's
// (or `--base=<ref>`) layer by layer — `bv` fields (gap, padding, height, radius…) and paint variables (fill, stroke,
// text) — and proposes, for each change, the component stylesheet declaration that reads the old variable: the same
// declaration reading the new one. Nothing is written without a choice: the Studio lists the proposals in the Main
// component frame (ticked when certain), the CLI writes the ticked ones with --apply. A declaration is found by the old
// variable's CSS name in the component's own stylesheets, the property the field drives (or a component variable, whose
// name says nothing), and the variant's values in its selector when several read the same variable.
//
//   node tools/studio/binding-diff.mjs [--base=HEAD] [--json] [--apply]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postcss from "postcss";
import { definedTokens, editDeclaration, isComponentCss } from "./css-edit.mjs";
import { LONG_TO_SHORT } from "./figma-steps.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** A Figma variable's CSS name (tools/figma-contract/check.mjs cssVar, scripts/build-tokens.mjs cssName). */
export const cssVar = (name) => `--zen-${String(name).replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;

/** The CSS properties a Figma field drives (a custom property always may: its name says nothing). */
const FIELD_PROPS = {
  itemSpacing: ["gap", "row-gap", "column-gap"],
  counterAxisSpacing: ["gap", "row-gap", "column-gap"],
  paddingLeft: ["padding", "padding-left", "padding-inline", "padding-inline-start"],
  paddingRight: ["padding", "padding-right", "padding-inline", "padding-inline-end"],
  paddingTop: ["padding", "padding-top", "padding-block", "padding-block-start"],
  paddingBottom: ["padding", "padding-bottom", "padding-block", "padding-block-end"],
  width: ["width", "min-width", "max-width", "inline-size", "flex-basis"],
  height: ["height", "min-height", "max-height", "block-size"],
  minWidth: ["min-width"], maxWidth: ["max-width"], minHeight: ["min-height"], maxHeight: ["max-height"],
  topLeftRadius: ["border-radius", "border-top-left-radius", "border-start-start-radius"],
  topRightRadius: ["border-radius", "border-top-right-radius", "border-start-end-radius"],
  bottomLeftRadius: ["border-radius", "border-bottom-left-radius", "border-end-start-radius"],
  bottomRightRadius: ["border-radius", "border-bottom-right-radius", "border-end-end-radius"],
  strokeWeight: ["border-width", "outline-width", "border"],
  fill: ["background", "background-color", "fill"],
  stroke: ["border-color", "outline-color", "border", "outline", "box-shadow", "stroke"],
  textFill: ["color", "fill"],
  opacity: ["opacity"],
};

/** Every binding of a contract's sets: key `set|variant|layer path|field` → { set, variant, layer, field, variable }. */
export function bindingsOf(sets) {
  const out = new Map();
  for (const set of sets ?? []) {
    if (!set?.id || !Array.isArray(set.variants)) continue;
    for (const variant of set.variants) {
      const name = variant.spec?.n ?? Object.entries(variant.vp ?? {}).map(([key, value]) => `${key}=${value}`).join(", ");
      const add = (layer, field, variable) => {
        if (typeof variable !== "string" || !variable) return;
        out.set(`${set.id}|${name}|${layer}|${field}`, { set: { id: set.id, name: set.name }, variant: name, values: variant.vp ?? {}, layer, field, variable });
      };
      const walk = (node, trail) => {
        if (!node || typeof node !== "object") return;
        const layer = trail.join("/");
        for (const [field, variable] of Object.entries(node.bv ?? {})) add(layer, field, variable);
        const paint = (paints) => (paints ?? []).find((item) => item && typeof item.v === "string")?.v;
        if (node.t === "TEXT") add(layer, "textFill", paint(node.fill));
        else add(layer, "fill", paint(node.fill));
        add(layer, "stroke", paint(node.stroke));
        // Siblings that share a name are told apart by their order.
        const seen = new Map();
        for (const child of node.c ?? []) {
          const count = seen.get(child.n) ?? 0;
          seen.set(child.n, count + 1);
          walk(child, [...trail, count ? `${child.n}[${count}]` : child.n]);
        }
      };
      walk(variant.spec, []);
    }
  }
  return out;
}

/** What Figma changed between two captures: a variable swapped for another on the same layer and field. */
export function bindingChanges(beforeSets, afterSets) {
  const before = bindingsOf(beforeSets);
  const after = bindingsOf(afterSets);
  const changes = [];
  for (const [key, now] of after) {
    const then = before.get(key);
    if (then && then.variable !== now.variable) changes.push({ ...now, from: then.variable, to: now.variable });
    else if (!then) changes.push({ ...now, from: null, to: now.variable });
  }
  for (const [key, then] of before) if (!after.has(key)) changes.push({ ...then, from: then.variable, to: null });
  return changes;
}

/** "Medium (Base)" → "medium": a variant value as a selector writes it (sizes also short: "XLarge" → "xl"). */
const valueToken = (value) => String(value).replace(/\s*\(.*?\)\s*/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
const valueTokens = (value) => { const token = valueToken(value); return LONG_TO_SHORT[token] ? [token, LONG_TO_SHORT[token]] : [token]; };

/** The rule's selector and the @media it sits in. */
function placeOf(decl) {
  let media = "";
  for (let node = decl.parent?.parent; node; node = node.parent) if (node.type === "atrule" && node.name === "media") { media = node.params; break; }
  return { selector: decl.parent?.selector ?? "", media };
}

/**
 * Proposals for the changes: `cssFiles` (repo-relative path → text) the component stylesheets, `folderOf(set)` the
 * component folder of a set (null: look in every stylesheet), `tokens` the CSS names the design system defines.
 * Each: { id, file, selector, media, prop, from, to, status: "ready" | "manual" | "token-missing", ticked, because }.
 */
export function proposals(changes, { cssFiles, folderOf = () => null, tokens = new Set() }) {
  const parsed = new Map();
  const parse = (file) => {
    if (!parsed.has(file)) {
      try { parsed.set(file, postcss.parse(cssFiles.get(file))); } catch { parsed.set(file, null); }
    }
    return parsed.get(file);
  };
  const out = new Map();
  for (const change of changes) {
    if (!change.from || !change.to) continue;
    const from = cssVar(change.from);
    const to = cssVar(change.to);
    const folder = folderOf(change.set);
    const files = [...cssFiles.keys()].filter((file) => !folder || file.startsWith(`src/components/${folder}/`));
    const candidates = [];
    for (const file of files) {
      const tree = parse(file);
      tree?.walkDecls((decl) => {
        if (!decl.value.includes(`var(${from})`)) return;
        if (!decl.prop.startsWith("--") && !(FIELD_PROPS[change.field] ?? []).includes(decl.prop)) return;
        candidates.push({ file, decl, ...placeOf(decl) });
      });
    }
    const values = new Set(Object.values(change.values ?? {}).flatMap(valueTokens));
    const fits = (selector) => {
      const attrs = [...selector.matchAll(/\[data-[\w-]+="([^"]+)"\]/g)].map((match) => valueToken(match[1]));
      return attrs.length > 0 && attrs.every((value) => values.has(value));
    };
    const fitting = candidates.filter((candidate) => fits(candidate.selector));
    for (const candidate of candidates) {
      const exact = candidate.decl.value.trim() === `var(${from})`;
      const status = !tokens.has(to) && tokens.size ? "token-missing" : exact ? "ready" : "manual";
      const certain = candidates.length === 1 || (fitting.length > 0 && fitting.includes(candidate));
      const id = `${candidate.file}|${candidate.media}|${candidate.selector}|${candidate.decl.prop}|${to}`;
      const because = { set: change.set.name, variant: change.variant, layer: change.layer || "(the component)", field: change.field, from: change.from, to: change.to };
      const known = out.get(id);
      if (known) { known.because.push(because); known.ticked ||= status === "ready" && certain; continue; }
      out.set(id, { id, file: candidate.file, selector: candidate.selector, media: candidate.media, prop: candidate.decl.prop, value: candidate.decl.value.trim(), from: `var(${from})`, to: `var(${to})`, status, ticked: status === "ready" && certain, because: [because] });
    }
  }
  return [...out.values()];
}

/** The ticked ready proposals written into `cssFiles` (each through css-edit's guarded edit); returns the changed files. */
export function applyProposals(cssFiles, chosen, tokens) {
  const next = new Map();
  for (const proposal of chosen) {
    if (proposal.status !== "ready") continue;
    const css = next.get(proposal.file) ?? cssFiles.get(proposal.file);
    next.set(proposal.file, editDeclaration(css, { selector: proposal.selector, media: proposal.media, prop: proposal.prop, value: proposal.to }, tokens).css);
  }
  return next;
}

/* ── the repo ────────────────────────────────────────────────────────────────────────────────────────────────────── */

const contractFiles = () => fs.readdirSync(path.join(root, "docs/figma-contracts")).filter((name) => name.endsWith(".json") && name !== "component-properties.json");
const setsIn = (text) => { try { const data = JSON.parse(text); return Array.isArray(data) ? data : []; } catch { return []; } };

/** Every component stylesheet (path → text) and the token names the design system defines. */
export function repoStyles() {
  const cssFiles = new Map();
  const texts = [];
  for (const name of fs.readdirSync(path.join(root, "src/styles")).filter((file) => file.endsWith(".css"))) texts.push(fs.readFileSync(path.join(root, "src/styles", name), "utf8"));
  for (const folder of fs.readdirSync(path.join(root, "src/components"), { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    for (const name of fs.readdirSync(path.join(root, "src/components", folder.name)).filter((file) => file.endsWith(".css"))) {
      const rel = `src/components/${folder.name}/${name}`;
      const text = fs.readFileSync(path.join(root, rel), "utf8");
      texts.push(text);
      // Only a library stylesheet is proposed for (css-edit's rule: not stories or demo CSS).
      if (isComponentCss(rel)) cssFiles.set(rel, text);
    }
  }
  return { cssFiles, tokens: definedTokens(texts) };
}

/** A set's component folder: its code component (FIGMA_PROPS) and the folder whose source exports it. */
async function folderIndex() {
  const { FIGMA_PROPS } = await import(pathToFileURL(path.join(root, "src/platform/studio/inspector/figmaProps.generated.ts")).href);
  const contract = JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/component-properties.json"), "utf8"));
  const idByName = new Map(contract.pages.flatMap((page) => page.sets ?? []).map((set) => [set.name, set.id]));
  const componentOfSet = new Map();
  for (const [code, entry] of Object.entries(FIGMA_PROPS)) {
    componentOfSet.set(entry.figma, code);
    for (const item of entry.own.filter((own) => own.type === "SET")) for (const name of Object.keys(item.options ?? {})) componentOfSet.set(idByName.get(name) ?? name, code);
  }
  const folderOfComponent = new Map();
  for (const folder of fs.readdirSync(path.join(root, "src/components"), { withFileTypes: true })) {
    if (!folder.isDirectory() || folder.name.startsWith("_")) continue;
    for (const name of fs.readdirSync(path.join(root, "src/components", folder.name)).filter((file) => file.endsWith(".tsx") && !file.includes(".stories"))) {
      const text = fs.readFileSync(path.join(root, "src/components", folder.name, name), "utf8");
      for (const match of text.matchAll(/export (?:function|const) ([A-Z]\w*)/g)) if (!folderOfComponent.has(match[1])) folderOfComponent.set(match[1], folder.name);
    }
  }
  return (set) => folderOfComponent.get(componentOfSet.get(set.id) ?? componentOfSet.get(set.name)) ?? null;
}

/** The changes since `base` (a git ref) and their proposals, from the working copy's contracts and stylesheets. */
export async function repoBindingDiff({ base = "HEAD" } = {}) {
  const changes = [];
  for (const file of contractFiles()) {
    const rel = `docs/figma-contracts/${file}`;
    let before = "";
    try { before = execFileSync("git", ["show", `${base}:${rel}`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "ignore"] }); } catch { continue; }
    const after = fs.readFileSync(path.join(root, rel), "utf8");
    if (before === after) continue;
    changes.push(...bindingChanges(setsIn(before), setsIn(after)).map((change) => ({ ...change, contract: file })));
  }
  const { cssFiles, tokens } = repoStyles();
  const folderOf = await folderIndex();
  return { base, changes, proposals: proposals(changes, { cssFiles, folderOf, tokens }), cssFiles, tokens };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const base = process.argv.find((arg) => arg.startsWith("--base="))?.slice(7) ?? "HEAD";
  const { changes, proposals: found, cssFiles, tokens } = await repoBindingDiff({ base });
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ base, changes: changes.length, proposals: found }, null, 2));
  } else {
    console.log(`${changes.length} binding change(s) in Figma since ${base}; ${found.length} CSS proposal(s)`);
    for (const item of found) console.log(`${item.ticked ? "✓" : item.status === "ready" ? "?" : "✗"} ${item.file} ${item.media ? `@media ${item.media} ` : ""}${item.selector} { ${item.prop}: ${item.from} → ${item.to} } (${item.status}; ${item.because.map((why) => `${why.set} ${why.variant} ${why.layer}.${why.field}`).join("; ")})`);
    const unplaced = changes.filter((change) => change.from && change.to && !found.some((item) => item.because.some((why) => why.set === change.set.name && why.variant === change.variant && why.layer === (change.layer || "(the component)") && why.field === change.field)));
    if (unplaced.length) console.log(`${unplaced.length} change(s) with no declaration reading the old variable (the CSS may compute it): ${unplaced.slice(0, 5).map((change) => `${change.set.name} ${change.variant} ${change.layer}.${change.field} ${change.from} → ${change.to}`).join("; ")}`);
  }
  if (process.argv.includes("--apply")) {
    const written = applyProposals(cssFiles, found.filter((item) => item.ticked), tokens);
    for (const [file, css] of written) fs.writeFileSync(path.join(root, file), css);
    console.log(`wrote ${written.size} stylesheet(s): ${[...written.keys()].join(", ") || "none"}`);
  }
}

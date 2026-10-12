// Zen Studio: a component's token edit, saved, as the re-binding Figma needs (core rebuild Q5(2), spec
// docs/research/studio-figma-push-spec-2026-10-12.md §3.4). The save's stylesheet before and after give the
// declarations that now read another token (`var(--zen-a)` → `var(--zen-b)`); the component's contracts give the Figma
// layers bound to the variable whose CSS name is `--zen-a`, in the variants the declaration's selector covers; the token
// sources give the Figma name of `--zen-b`. The result is a package the Zen plugin's Import from Studio applies to the
// component masters (rebind: licensed), so Figma binds what the code now reads.
//
//   changedTokens(before, after) → [{ selector, media, prop, from, to }]        (CSS names)
//   rebindChanges({ changes, sets, figmaNames }) → { rebind: [...], notes }
//   repoRebind({ root, file, before, after }) → { pkg | null, notes }           (the repo's contracts and tokens)
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import postcss from "postcss";
import { bindingsOf, cssVar } from "./binding-diff.mjs";
import { LONG_TO_SHORT } from "./figma-steps.mjs";

const tokenOf = (value) => /^var\(\s*(--zen-[a-z0-9-]+)\s*\)$/.exec(String(value).trim())?.[1] ?? null;

/** Declarations of `before` and `after` (selector, @media, property) that read one token in both, and another now. */
export function changedTokens(before, after) {
  const read = (css) => {
    const out = new Map();
    let root;
    try { root = postcss.parse(css); } catch { return out; }
    root.walkDecls((decl) => {
      const token = tokenOf(decl.value);
      if (!token) return;
      let media = "";
      for (let node = decl.parent?.parent; node; node = node.parent) if (node.type === "atrule" && node.name === "media") { media = node.params; break; }
      out.set(`${decl.parent?.selector ?? ""}|${media}|${decl.prop}`, { selector: decl.parent?.selector ?? "", media, prop: decl.prop, token });
    });
    return out;
  };
  const then = read(before);
  const now = read(after);
  const changes = [];
  for (const [key, next] of now) {
    const prior = then.get(key);
    if (prior && prior.token !== next.token) changes.push({ selector: next.selector, media: next.media, prop: next.prop, from: prior.token, to: next.token });
  }
  return changes;
}

const valueTokens = (value) => {
  const token = String(value).replace(/\s*\(.*?\)\s*/g, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return LONG_TO_SHORT[token] ? [token, LONG_TO_SHORT[token]] : [token];
};

/**
 * The Figma re-bindings for token changes: each layer field of `sets` (the component's contract sets) bound to the
 * variable whose CSS name is the change's old token, in a variant the selector covers (its `[data-…="v"]` values among
 * the variant's; a selector without any covers every variant), re-bound to the Figma variable of the new token
 * (`figmaNames`: CSS name → Figma name).
 */
export function rebindChanges({ changes, sets, figmaNames }) {
  const bindings = [...bindingsOf(sets).values()];
  const rebind = [];
  const notes = [];
  const seen = new Set();
  for (const change of changes) {
    const to = figmaNames.get(change.to);
    if (!to) { notes.push(`${change.prop} in ${change.selector}: ${change.to} is no Figma variable (a code-only token): Figma keeps its binding`); continue; }
    const attrs = [...change.selector.matchAll(/\[data-[\w-]+="([^"]+)"\]/g)].map((match) => match[1].toLowerCase());
    const covers = (binding) => attrs.every((value) => Object.values(binding.values ?? {}).some((figma) => valueTokens(figma).includes(value)));
    const hit = bindings.filter((binding) => cssVar(binding.variable) === change.from && covers(binding));
    if (!hit.length) { notes.push(`${change.prop} in ${change.selector}: no Figma layer of the component is bound to ${change.from}`); continue; }
    for (const binding of hit) {
      const key = `${binding.set.id}|${binding.variant}|${binding.layer}|${binding.field}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rebind.push({ set: binding.set, variant: binding.variant, layer: binding.layer, field: binding.field, from: binding.variable, to });
    }
  }
  return { rebind, notes };
}

/** CSS name → Figma name of every variable in tokens/source/figma (the collections Figma's file holds). */
export function figmaNamesOf(root) {
  const names = new Map();
  const dir = path.join(root, "tokens/source/figma");
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith(".json"))) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
    for (const collection of Object.values(data)) for (const token of collection?.tokens ?? []) if (typeof token.name === "string") names.set(cssVar(token.name), token.name);
  }
  return names;
}

/** The contract sets of the component a stylesheet belongs to (its folder's components, by their Figma sets). */
async function setsOfStylesheet(root, file) {
  const folder = file.split("/")[2];
  const components = new Set();
  for (const name of fs.readdirSync(path.join(root, "src/components", folder)).filter((entry) => entry.endsWith(".tsx") && !entry.includes(".stories"))) {
    for (const match of fs.readFileSync(path.join(root, "src/components", folder, name), "utf8").matchAll(/export (?:function|const) ([A-Z]\w*)/g)) components.add(match[1]);
  }
  const { FIGMA_PROPS } = await import(pathToFileURL(path.join(root, "src/platform/studio/inspector/figmaProps.generated.ts")).href);
  const wanted = new Set();
  for (const component of components) {
    const entry = FIGMA_PROPS[component];
    if (!entry) continue;
    wanted.add(entry.figma);
    for (const item of entry.own.filter((own) => own.type === "SET")) for (const name of Object.keys(item.options ?? {})) wanted.add(name);
  }
  const sets = [];
  const dir = path.join(root, "docs/figma-contracts");
  for (const name of fs.readdirSync(dir).filter((entry) => entry.endsWith(".json") && entry !== "component-properties.json")) {
    let data;
    try { data = JSON.parse(fs.readFileSync(path.join(dir, name), "utf8")); } catch { continue; }
    for (const set of Array.isArray(data) ? data : []) if (set?.id && (wanted.has(set.id) || wanted.has(set.name))) sets.push(set);
  }
  return sets;
}

/** The rebind package of a saved stylesheet (null: no token change Figma binds), and what it could not carry. */
export async function repoRebind({ root, file, before, after }) {
  const changes = changedTokens(before, after);
  if (!changes.length) return { pkg: null, notes: [] };
  const sets = await setsOfStylesheet(root, file);
  if (!sets.length) return { pkg: null, notes: [`${file}: no Figma contract for its component (nothing to re-bind)`] };
  const { rebind, notes } = rebindChanges({ changes, sets, figmaNames: figmaNamesOf(root) });
  const component = sets[0].name.split("/")[0];
  return { pkg: rebind.length ? { format: "zen-studio-rebind", version: 1, component, file, changes: rebind } : null, notes };
}

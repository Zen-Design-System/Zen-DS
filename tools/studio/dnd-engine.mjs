// The builder-page engine as the browser runs it (builder/localApi.ts localEdit: editDoc → applyOps with the
// browser's options), the Assets items as a builder page writes them (edit/assets/assets.ts codeOf), and a seed helper:
// shared by the drag-and-drop matrix (dnd-matrix.mjs) and the browser drags (e2e/scenarios/dnd.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dataFieldEdit } from "./data-source.mjs";
import { eachElement, parsePage } from "./dialect.mjs";
import { docFromText, editDoc } from "./doc.mjs";
import { applyOps, sha1 } from "./jsx-source.mjs";
import { requiredFromApi } from "./slots.mjs";

export const root = fileURLToPath(new URL("../../", import.meta.url));
const { PALETTE, builderCode } = await import(path.join(root, "src/platform/studio/slots/palette.ts"));
const { typographyStyles } = await import(path.join(root, "src/tokens/typography.generated.ts")).catch(() => ({ typographyStyles: {} }));

/* ── the engine as the browser runs it ──────────────────────────────────────────────────────────────────────────── */

/** The Zen components a page may use: every name the component folders export (src/index.ts › export *). */
function zenNames() {
  const names = new Set();
  const index = fs.readFileSync(path.join(root, "src/index.ts"), "utf8");
  const scan = (file, seen = new Set()) => {
    if (seen.has(file) || !fs.existsSync(file)) return;
    seen.add(file);
    const text = fs.readFileSync(file, "utf8");
    for (const match of text.matchAll(/export\s*\{([^}]*)\}/g)) for (const part of match[1].split(",")) {
      const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/).pop()?.trim();
      if (name && /^[A-Z]/.test(name) && !/^type\s/.test(part.trim())) names.add(name);
    }
    for (const match of text.matchAll(/export\s+(?:function|const|class)\s+([A-Z]\w*)/g)) names.add(match[1]);
    for (const match of text.matchAll(/export\s+\*\s+from\s+"(\.[^"]+)"/g)) {
      const base = path.resolve(path.dirname(file), match[1]);
      for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) scan(base + ext, seen);
    }
  };
  for (const match of index.matchAll(/export\s+\*\s+from\s+"(\.\/components\/[^"]+)"/g)) {
    const base = path.join(root, "src", match[1]);
    for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx"]) scan(base + ext);
  }
  return names;
}

export const components = zenNames();
const api = JSON.parse(fs.readFileSync(path.join(root, "src/platform/api.generated.json"), "utf8"));
export const { requiredProps, childless } = requiredFromApi(api);
const engineOptions = { componentModules: new Map([...components].map((name) => [name, name])), requiredChildren: new Set(), requiredProps, childless, typographyKeys: Object.keys(typographyStyles) };

let docs = new Map();
/** Forgets the parsed documents (one seed's texts at a time keep the cache small). */
export const resetDocs = () => { docs = new Map(); };
/** One edit as the browser makes it: { text } or { error, code }, or { crash } when the engine throws. */
export function edit(text, file, request) {
  let doc = docs.get(text);
  if (!doc) {
    doc = docFromText(text, { components }).doc;
    docs.set(text, doc);
  }
  if (!doc) return { error: "the seed page does not read", code: "invalid" };
  const options = { ...engineOptions, file, hash: sha1(text) };
  try {
    const edited = editDoc(doc, text, { file, hash: sha1(text), ...request }, { components, applyOps, dataFieldEdit, sha1, options });
    return "error" in edited ? { error: edited.error, code: edited.code } : { text: edited.text };
  } catch (error) {
    return { crash: String(error?.stack ?? error) };
  }
}

/* ── Assets items as a builder page writes them (edit/assets/assets.ts codeOf) ──────────────────────────────────── */

const context = { host: "Stack", slot: { component: "Stack", prop: "children", name: "Children", kind: "layout" }, headingLevel: 4, mobile: true, uid: "dnd" };
export const items = PALETTE.map((item) => {
  let code = null;
  try {
    code = item.builder ? item.builder(context) : item.state?.length ? null : builderCode(item.build(context));
  } catch (error) {
    return { id: item.id, label: item.label, group: item.group, root: item.root, code: null, crash: String(error) };
  }
  return { id: item.id, label: item.label, group: item.group, root: item.root, code };
});

/* ── seed pages ─────────────────────────────────────────────────────────────────────────────────────────────────── */

export const FILE = "local:dnd-matrix.zen.tsx";
/** Inserts `code` as the last child of the first element named `name` (the seed builds itself through the engine). */
export function grow(text, name, code, nth = 0) {
  const found = [];
  eachElement(parsePage(text, { components }).board, (node) => { if (node.name === name) found.push(node); });
  const host = found[nth];
  if (!host) throw new Error(`seed: no <${name}> #${nth}`);
  const result = edit(text, FILE, { loc: host.loc, name, ops: [{ op: "insertChild", code }] });
  if (!result.text) throw new Error(`seed: ${code.slice(0, 40)} into ${name}: ${result.error ?? result.crash}`);
  return result.text;
}
export const codeOfItem = (id) => items.find((item) => item.id === id)?.code;
/** A seed's first layer: the line a new Screen held before walk W-56 (2026-10-30), kept as content so the E2E pages built
 *  on it (their layer order, their first Text) stay as they were. */
export const withStarter = (text) => grow(text, "Stack", '<Text tone="base">Start building here: add components from Assets.</Text>');

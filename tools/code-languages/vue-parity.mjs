#!/usr/bin/env node
// DOM and API parity of the Vue port (Code view P3, plan docs/research/code-languages-plan-2026-10-03.md §3.C).
//
// Every Vue component in platforms/vue has a `<Name>.parity.ts` fixture (platforms/vue/parity.ts says its shape). For
// each component the harness renders every case twice — with react-dom/server and with Vue's server renderer — and
// compares the normalised HTML (comments, attribute order, class order, style spacing and generated ids do not count;
// tags, attributes, classes, styles and text do). Besides the fixture's own cases it renders one case per member of
// every union prop and one per non-default boolean, read from the props docs (src/platform/api.generated.json).
// It also checks the API: every React prop is a Vue prop, an emit (`onRemove` → `remove`) or a slot, or the fixture
// says why not; the Vue component declares no prop React lacks (ports never invent props).
//
// A component is ready for the Code view when its API matches and every case renders the same DOM. `--write` records the
// ready list in platforms/vue/code-language.json, which the Code view's status manifest reads (guidelines:build); without
// it the run fails when that file is out of date (a component broke, or one became ready unrecorded).
//
//   npm run vue:parity [-- --write] [-- --only=Badge,Button] [-- --verbose]
//   node tools/code-languages/vue-parity.mjs --react-snapshot=<file>   React's HTML of every case, before a refactor
//   node tools/code-languages/vue-parity.mjs --react-compare=<file>    …and after: React must render the same
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(path.join(root, "package.json"));
const esbuild = require("esbuild");

const argv = process.argv.slice(2);
const flag = (name) => argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const WRITE = argv.includes("--write");
const VERBOSE = argv.includes("--verbose");
const ONLY = flag("only")?.split(",").filter(Boolean);
const SNAPSHOT = flag("react-snapshot");
const COMPARE = flag("react-compare");

const VUE_DIR = path.join(root, "platforms/vue");
const STATUS_FILE = path.join(VUE_DIR, "code-language.json");
const rel = (file) => path.relative(root, file).split(path.sep).join("/");
const walk = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)])) : []);

/* ── bundle: both libraries, both renderers and the fixtures, for Node ─────────────────────────────────────────────── */

const fixtureFiles = walk(path.join(VUE_DIR, "src")).filter((file) => file.endsWith(".parity.ts")).sort();
const vueEntry = path.join(VUE_DIR, "src/index.ts");
const cacheDir = path.join(root, "node_modules/.cache/zen-vue-parity");
fs.mkdirSync(cacheDir, { recursive: true });
// One pair of files per run: several runs (agents porting different components) may overlap.
const entryFile = path.join(cacheDir, `entry-${process.pid}.ts`);
const outFile = path.join(cacheDir, `bundle-${process.pid}.mjs`);
const lit = (file) => JSON.stringify(file.split(path.sep).join("/"));
fs.writeFileSync(entryFile, [
  `export * as zenReact from ${lit(path.join(root, "src/index.ts"))};`,
  fs.existsSync(vueEntry) && !SNAPSHOT ? `export * as zenVue from ${lit(vueEntry)};` : "export const zenVue = {};",
  ...fixtureFiles.map((file, index) => `import fixture${index} from ${lit(file)};`),
  `export const fixtures = [${fixtureFiles.map((file, index) => `[${JSON.stringify(rel(file))}, fixture${index}]`).join(", ")}];`,
  "",
].join("\n"));
await esbuild.build({
  entryPoints: [entryFile],
  outfile: outFile,
  bundle: true,
  platform: "node",
  format: "esm",
  jsx: "automatic",
  // Icon/core.ts registers the core icons for its side effect; package.json's sideEffects names only its dist path.
  ignoreAnnotations: true,
  // The libraries stay external, so both sides render with the one React and the one Vue Node loads.
  external: ["react", "react-dom", "react/*", "react-dom/*", "vue", "vue/*", "@vue/*"],
  alias: { "@zen-ds/core": path.join(root, "src/core/index.ts") },
  loader: { ".css": "empty", ".webp": "dataurl", ".png": "dataurl", ".jpg": "dataurl", ".svg": "dataurl", ".mp4": "file", ".woff2": "file", ".json": "json" },
  define: { "import.meta.env.DEV": "false" },
  absWorkingDir: root,
  logLevel: "error",
});
const lib = await import(`${pathToFileURL(outFile).href}?t=${Date.now()}`);
fs.rmSync(entryFile, { force: true });
fs.rmSync(outFile, { force: true });
const React = await import("react");
const { renderToString: renderReact } = await import("react-dom/server");
const Vue = await import("vue");
const { renderToString: renderVue } = await import("vue/server-renderer");
const api = JSON.parse(fs.readFileSync(path.join(root, "src/platform/api.generated.json"), "utf8"));
const waves = JSON.parse(fs.readFileSync(path.join(VUE_DIR, "waves.json"), "utf8"));

/** Props docs by component name (the first page that documents it). */
const propsOf = new Map();
for (const entries of Object.values(api)) for (const component of entries) if (!propsOf.has(component.name)) propsOf.set(component.name, component.props);

/* ── HTML → a canonical, indented text ─────────────────────────────────────────────────────────────────────────────── */

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (text) => text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (match, code) => (code[0] === "#" ? String.fromCodePoint(code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)) : ENTITIES[code] ?? match));

function parseHtml(html) {
  const top = { tag: "#root", attrs: [], children: [] };
  const stack = [top];
  const current = () => stack[stack.length - 1];
  let i = 0;
  while (i < html.length) {
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i + 4);
      i = end < 0 ? html.length : end + 3;
      continue;
    }
    if (html[i] === "<" && html[i + 1] === "/") {
      const end = html.indexOf(">", i);
      const tag = html.slice(i + 2, end).trim();
      for (let k = stack.length - 1; k > 0; k -= 1) if (stack[k].tag === tag) { stack.length = k; break; }
      i = end + 1;
      continue;
    }
    if (html[i] === "<" && /[A-Za-z]/.test(html[i + 1] ?? "")) {
      let j = i + 1;
      while (j < html.length && !/[\s/>]/.test(html[j])) j += 1;
      const node = { tag: html.slice(i + 1, j), attrs: [], children: [] };
      let selfClosing = false;
      for (;;) {
        while (/\s/.test(html[j])) j += 1;
        if (html[j] === ">") { j += 1; break; }
        if (html.startsWith("/>", j)) { selfClosing = true; j += 2; break; }
        let k = j;
        while (k < html.length && !/[\s=/>]/.test(html[k])) k += 1;
        const name = html.slice(j, k);
        let value = "";
        j = k;
        while (/\s/.test(html[j])) j += 1;
        if (html[j] === "=") {
          j += 1;
          while (/\s/.test(html[j])) j += 1;
          const quote = html[j];
          if (quote === '"' || quote === "'") {
            const end = html.indexOf(quote, j + 1);
            value = html.slice(j + 1, end);
            j = end + 1;
          } else {
            let e = j;
            while (e < html.length && !/[\s>]/.test(html[e])) e += 1;
            value = html.slice(j, e);
            j = e;
          }
        } else if (!name) {
          j += 1; // a stray character: skip it
          continue;
        }
        node.attrs.push([name, decode(value)]);
      }
      current().children.push(node);
      if (!selfClosing && !VOID.has(node.tag.toLowerCase())) stack.push(node);
      i = j;
      continue;
    }
    const next = html.indexOf("<", i + (html[i] === "<" ? 1 : 0));
    const text = decode(html.slice(i, next < 0 ? html.length : next));
    const siblings = current().children;
    if (typeof siblings[siblings.length - 1] === "string") siblings[siblings.length - 1] += text;
    else siblings.push(text);
    i = next < 0 ? html.length : next;
  }
  return top;
}

/** `a:b; c:d(e;f)` → ["a:b", "c:d(e;f)"]: declarations split at top-level semicolons, spacing trimmed. */
function styleDeclarations(style) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= style.length; i += 1) {
    const char = style[i];
    if (char === "(") depth += 1;
    else if (char === ")") depth -= 1;
    else if ((char === ";" && depth === 0) || i === style.length) {
      const declaration = style.slice(start, i).trim();
      start = i + 1;
      if (!declaration) continue;
      const colon = declaration.indexOf(":");
      const name = declaration.slice(0, colon).trim();
      out.push(`${name.startsWith("--") ? name : name.toLowerCase()}:${declaration.slice(colon + 1).trim()}`);
    }
  }
  return out;
}

const REFERENCE_ATTRS = new Set(["for", "aria-labelledby", "aria-describedby", "aria-controls", "aria-owns", "aria-activedescendant", "aria-details", "aria-errormessage", "headers", "list", "form"]);

/** React's useId («r1», _r_1_) and Vue's (v-0) differ: ids become #1, #2… in document order, references follow. */
function canonicalIds(tree) {
  const ids = new Map();
  const collect = (node) => {
    if (typeof node === "string") return;
    for (const [name, value] of node.attrs) if (name === "id" && !ids.has(value)) ids.set(value, `#${ids.size + 1}`);
    node.children.forEach(collect);
  };
  collect(tree);
  const map = (value) => ids.get(value) ?? value;
  const rewrite = (node) => {
    if (typeof node === "string") return;
    node.attrs = node.attrs.map(([name, value]) => {
      if (name === "id") return [name, map(value)];
      if (REFERENCE_ATTRS.has(name)) return [name, value.split(/\s+/).filter(Boolean).map(map).join(" ")];
      let out = value.replace(/url\(\s*['"]?#([^)'"]+)['"]?\s*\)/g, (_m, id) => `url(${ids.has(id) ? ids.get(id) : `#${id}`})`);
      if ((name === "href" || name === "xlink:href") && out.startsWith("#") && ids.has(out.slice(1))) out = ids.get(out.slice(1));
      return [name, out];
    });
    node.children.forEach(rewrite);
  };
  rewrite(tree);
}

function serialize(node, depth = 0, lines = []) {
  const pad = "  ".repeat(depth);
  if (typeof node === "string") {
    if (node) lines.push(`${pad}${JSON.stringify(node)}`);
    return lines;
  }
  if (node.tag === "#root") {
    node.children.forEach((child) => serialize(child, depth, lines));
    return lines;
  }
  const attrs = node.attrs
    .map(([name, value]) => {
      if (name === "class") return [name, value.split(/\s+/).filter(Boolean).sort().join(" ")];
      if (name === "style") return [name, styleDeclarations(value).join("; ")];
      return [name, value];
    })
    .filter(([name, value]) => !((name === "class" || name === "style") && !value))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, value]) => ` ${name}=${JSON.stringify(value)}`)
    .join("");
  lines.push(`${pad}<${node.tag}${attrs}>`);
  node.children.forEach((child) => serialize(child, depth + 1, lines));
  return lines;
}

export function canonicalHtml(html) {
  const tree = parseHtml(html);
  canonicalIds(tree);
  return serialize(tree).join("\n");
}

/* ── cases: the fixture's, plus the props docs' unions and booleans ────────────────────────────────────────────────── */

const IGNORED = new Set(["ref", "key", "className", "style", "children", "overrides"]);
const MATRIX_ICON = "icon-plus-line";

/** The string literals of a union type (`"sm" | "md"`), or null when it has other members. */
function unionMembers(type) {
  const parts = type.split("|").map((part) => part.trim()).filter((part) => part && part !== "undefined");
  if (!parts.length || !parts.every((part) => /^"[^"]*"$/.test(part))) return null;
  return parts.map((part) => part.slice(1, -1));
}

const label = (props) => Object.entries(props).filter(([key]) => key !== "$label").map(([key, value]) => `${key}=${typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value)?.slice(0, 40)}`).join(" ") || "base";

function casesFor(name, entry) {
  const base = entry.base ?? {};
  const out = [{ ...base, $label: base.$label ?? "base" }];
  const skip = new Set(entry.skip ?? []);
  for (const prop of propsOf.get(name) ?? []) {
    if (IGNORED.has(prop.name) || prop.deprecated || /^on[A-Z]/.test(prop.name) || skip.has(prop.name)) continue;
    const members = unionMembers(prop.type);
    if (members) for (const value of members) out.push({ ...base, [prop.name]: value, $label: label({ [prop.name]: value }) });
    else if (prop.type === "boolean") {
      const value = prop.default !== "true";
      out.push({ ...base, [prop.name]: value, $label: label({ [prop.name]: value }) });
    } else if (/\bIconName\b/.test(prop.type) && !(prop.name in base)) out.push({ ...base, [prop.name]: MATRIX_ICON, $label: label({ [prop.name]: MATRIX_ICON }) });
  }
  for (const extra of entry.cases ?? []) out.push({ ...base, ...extra, $label: extra.$label ?? label(extra) });
  return out;
}

/* ── rendering ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

const isNode = (value) => value !== null && typeof value === "object" && !Array.isArray(value) && typeof value.$ === "string";
// A list of nodes and text is content (a slot in Vue) once it holds a node; a list of only strings or numbers is a value
// (Box's hideOn: ["mobile"]).
const isNodeList = (value) => Array.isArray(value) && value.some(isNode) && value.every((item) => isNode(item) || typeof item === "string" || typeof item === "number");
const splitProps = ({ $label: _label, children, ...props }) => ({ props, children });

function reactNode(node, key) {
  if (!isNode(node)) return node;
  const { $: type, children, ...props } = node;
  const Component = /^[A-Z]/.test(type) ? lib.zenReact[type] : type;
  if (!Component) throw new Error(`React: no component "${type}"`);
  const list = children === undefined ? [] : Array.isArray(children) ? children : [children];
  return React.createElement(Component, { ...reactProps(props), key }, ...list.map((child, index) => reactNode(child, index)));
}
/** The fixtures write HTML's `class` (Vue's spelling); React takes it as className. */
function reactProps(props) {
  return Object.fromEntries(Object.entries(props).map(([key, value]) => [key === "class" ? "className" : key, isNode(value) ? reactNode(value) : isNodeList(value) ? value.map((item, index) => reactNode(item, index)) : value]));
}
function renderReactCase(Component, testCase) {
  const { props, children } = splitProps(testCase);
  const list = children === undefined ? [] : Array.isArray(children) ? children : [children];
  // React 19's server render puts a `<link rel="preload" as="image">` before markup holding an <img>: a hint for the
  // document's head, not part of the component (a client render never draws it).
  return renderReact(React.createElement(Component, reactProps(props), ...list.map((child, index) => reactNode(child, index)))).replace(/<link rel="preload" as="image"[^>]*\/?>/g, "");
}

/** A slot as compiled templates pass it: a function returning vnodes (text becomes a text vnode). */
const vueSlot = (content) => () => (Array.isArray(content) ? content : [content]).map(vueNode);
function vueNode(node) {
  if (typeof node === "string" || typeof node === "number") return Vue.createTextVNode(String(node));
  const { $: type, children, ...props } = node;
  const Component = /^[A-Z]/.test(type) ? lib.zenVue[type] : type;
  if (!Component) throw new Error(`Vue: no component "${type}"`);
  const { attrs, slots } = vueProps(props);
  if (typeof Component === "string") return Vue.h(Component, attrs, children === undefined ? undefined : (Array.isArray(children) ? children : [children]).map(vueNode));
  if (children !== undefined) slots.default = vueSlot(children);
  return Vue.h(Component, attrs, slots);
}
/** Node values become slots of the prop's name; everything else stays a prop. */
function vueProps(props) {
  const attrs = {};
  const slots = {};
  for (const [key, value] of Object.entries(props)) {
    if (isNode(value) || isNodeList(value)) slots[key] = vueSlot(value);
    else attrs[key] = value;
  }
  return { attrs, slots };
}
async function renderVueCase(Component, testCase) {
  const { props, children } = splitProps(testCase);
  const { attrs, slots } = vueProps(props);
  if (children !== undefined) slots.default = vueSlot(children);
  const warnings = [];
  const app = Vue.createSSRApp({ render: () => Vue.h(Component, attrs, slots) });
  app.config.warnHandler = (message) => warnings.push(message);
  return { html: await renderVue(app), warnings };
}

/* ── API parity ────────────────────────────────────────────────────────────────────────────────────────────────────── */

const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
const declared = (option) => (Array.isArray(option) ? option : option ? Object.keys(option) : []);

function apiProblems(name, entry, VueComponent) {
  const problems = [];
  const reactProps = propsOf.get(name) ?? [];
  const vueProps = new Set(declared(VueComponent.props));
  const emits = new Set(declared(VueComponent.emits));
  const slots = new Set(entry.slots ?? []);
  const notPorted = entry.notPorted ?? {};
  for (const prop of reactProps) {
    // aria-* and data-* props (Stepper's aria-label) are attributes in Vue too: the root reads them from attrs.
    if (IGNORED.has(prop.name) || prop.deprecated || notPorted[prop.name] || /^(aria|data)-/.test(prop.name)) continue;
    if (vueProps.has(prop.name) || slots.has(prop.name)) continue;
    if (/^on[A-Z]/.test(prop.name) && (emits.has(lowerFirst(prop.name.slice(2))) || vueProps.has(prop.name))) continue;
    problems.push(`React prop "${prop.name}" has no Vue prop, emit or slot`);
  }
  const known = new Set([...reactProps, ...(entry.inherits ?? []).flatMap((base) => propsOf.get(base) ?? [])].map((prop) => prop.name));
  for (const prop of vueProps) if (!known.has(prop)) problems.push(`Vue prop "${prop}" is not a React prop (ports never invent props)`);
  for (const slot of slots) if (!known.has(slot)) problems.push(`slot "${slot}" is not a React prop`);
  return problems;
}

/* ── run ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const entries = [];
for (const [file, spec] of lib.fixtures) for (const [name, entry] of Object.entries(spec)) if (!ONLY || ONLY.includes(name)) entries.push({ file, name, entry });
entries.sort((a, b) => a.name.localeCompare(b.name));

if (SNAPSHOT || COMPARE) {
  // React only: proves a refactor that moved logic into src/core left React's HTML as it was.
  const snapshot = {};
  for (const { name, entry } of entries) for (const testCase of casesFor(name, entry)) snapshot[`${name} · ${testCase.$label}`] = canonicalHtml(renderReactCase(lib.zenReact[name], testCase));
  if (SNAPSHOT) {
    fs.writeFileSync(SNAPSHOT, `${JSON.stringify(snapshot, null, 1)}\n`);
    console.log(`React snapshot: ${Object.keys(snapshot).length} cases → ${SNAPSHOT}`);
    process.exit(0);
  }
  const before = JSON.parse(fs.readFileSync(COMPARE, "utf8"));
  const changed = Object.keys(before).filter((key) => key in snapshot && before[key] !== snapshot[key]);
  const missing = Object.keys(before).filter((key) => !(key in snapshot));
  console.log(`React compare: ${Object.keys(before).length - changed.length - missing.length}/${Object.keys(before).length} cases unchanged${missing.length ? `, ${missing.length} no longer rendered` : ""}`);
  for (const key of changed.slice(0, 5)) console.log(`  ✗ ${key}\n${firstDifference(before[key], snapshot[key])}`);
  process.exit(changed.length || missing.length ? 1 : 0);
}

function firstDifference(expected, actual) {
  const a = expected.split("\n");
  const b = actual.split("\n");
  let index = 0;
  while (index < a.length && a[index] === b[index]) index += 1;
  const from = Math.max(0, index - 2);
  const show = (lines) => lines.slice(from, index + 3).map((line, offset) => `      ${from + offset === index ? "→" : " "} ${line}`).join("\n");
  return `    React:\n${show(a)}\n    Vue:\n${show(b)}`;
}

let failed = 0;
let caseCount = 0;
const ready = [];
const lines = [];
/** The type names @zen-ds/vue exports (read from its source: types leave no trace at run time). demo.ts for Vue keeps these. */
function vueTypes() {
  const names = new Set();
  for (const file of walk(path.join(VUE_DIR, "src")).filter((file) => file.endsWith(".ts") && !file.endsWith(".parity.ts"))) {
    const source = fs.readFileSync(file, "utf8");
    for (const match of source.matchAll(/^export (?:type|interface) (\w+)/gm)) names.add(match[1]);
    for (const list of source.matchAll(/^export (?:type )?\{([^}]*)\}/gm)) for (const match of list[1].matchAll(/\btype (\w+)(?:\s+as\s+(\w+))?/g)) names.add(match[2] ?? match[1]);
  }
  return [...names].sort();
}
/** What the Vue emitter (src/platform/code/vue.ts) needs to know of each ready component. */
const apiOf = {};
const NODE_TYPE = /\b(ReactNode|ReactElement|JSX\.Element)\b/;
function componentApi(name, entry, VueComponent) {
  const docs = propsOf.get(name) ?? [];
  const slots = new Set(entry.slots ?? []);
  for (const prop of docs) if (prop.name !== "children" && NODE_TYPE.test(prop.type) && !prop.deprecated && !entry.notPorted?.[prop.name]) slots.add(prop.name);
  return { props: declared(VueComponent.props), emits: declared(VueComponent.emits), slots: [...slots].sort(), react: docs.map((prop) => prop.name) };
}
for (const { file, name, entry } of entries) {
  const ReactComponent = lib.zenReact[name];
  const VueComponent = lib.zenVue[name];
  if (!ReactComponent) { lines.push(`  ✗ ${name}: React exports no "${name}" (${file})`); failed += 1; continue; }
  if (!VueComponent) { lines.push(`  ✗ ${name}: the Vue package exports no "${name}" (${file})`); failed += 1; continue; }
  const problems = apiProblems(name, entry, VueComponent);
  const cases = casesFor(name, entry);
  let matched = 0;
  const differences = [];
  for (const testCase of cases) {
    caseCount += 1;
    let expected;
    let actual;
    let warnings = [];
    try {
      expected = canonicalHtml(renderReactCase(ReactComponent, testCase));
      const vue = await renderVueCase(VueComponent, testCase);
      actual = canonicalHtml(vue.html);
      warnings = vue.warnings;
    } catch (error) {
      differences.push(`    case ${testCase.$label}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (expected === actual && !warnings.length) matched += 1;
    else differences.push(`    case ${testCase.$label}${warnings.length ? ` — Vue warned: ${warnings[0]}` : ""}${expected === actual ? "" : `\n${firstDifference(expected, actual)}`}`);
  }
  const ok = !problems.length && matched === cases.length;
  if (ok) {
    ready.push(name);
    apiOf[name] = componentApi(name, entry, VueComponent);
  } else failed += 1;
  const ported = Object.entries(entry.notPorted ?? {}).map(([prop, why]) => `${prop} (${why})`);
  lines.push(`  ${ok ? "✓" : "✗"} ${name}: ${matched}/${cases.length} cases${ported.length && VERBOSE ? ` · not ported: ${ported.join("; ")}` : ""}`);
  for (const problem of problems) lines.push(`    API: ${problem}`);
  for (const difference of differences.slice(0, VERBOSE ? differences.length : 2)) lines.push(difference);
  if (!VERBOSE && differences.length > 2) lines.push(`    … ${differences.length - 2} more (--verbose)`);
}

console.log(`Vue parity (plan §3.C): ${entries.length} components, ${caseCount} cases`);
console.log(lines.join("\n"));
const waits = waves.waits ?? {};
for (const [wave, folders] of Object.entries(waves).filter(([key]) => /^W\d/.test(key))) {
  const all = Object.values(folders).flat();
  // A component that renders a later wave's component counts once that one is ported.
  const names = all.filter((name) => !waits[name] || ready.includes(name));
  const waiting = all.filter((name) => !names.includes(name));
  const done = names.filter((name) => ready.includes(name));
  console.log(`${wave}: ${done.length}/${names.length} components ready${done.length < names.length ? ` (not yet: ${names.filter((name) => !ready.includes(name)).join(", ")})` : ""}${waiting.length ? `; waiting: ${waiting.map((name) => `${name} for ${waits[name].split(":")[0]}`).join(", ")}` : ""}`);
}

if (!ONLY) {
  // One line per component, so a port that changes one component changes one line.
  const text = [
    "{",
    `  "$comment": "Written by tools/code-languages/vue-parity.mjs --write: the Vue components whose API and DOM match React (the Code view's status manifest reads ready/markup), what @zen-ds/vue exports, and each ready component's props, emits and slots (the Vue emitter reads them).",`,
    `  "ready": ${JSON.stringify([...ready].sort())},`,
    '  "markup": [],',
    `  "exports": ${JSON.stringify(Object.keys(lib.zenVue).sort())},`,
    `  "types": ${JSON.stringify(vueTypes())},`,
    '  "components": {',
    Object.keys(apiOf).sort().map((name) => `    ${JSON.stringify(name)}: ${JSON.stringify(apiOf[name])}`).join(",\n"),
    "  }",
    "}",
    "",
  ].join("\n");
  const current = fs.existsSync(STATUS_FILE) ? fs.readFileSync(STATUS_FILE, "utf8") : "";
  if (WRITE) {
    if (text !== current) fs.writeFileSync(STATUS_FILE, text);
    console.log(`${rel(STATUS_FILE)}: ${ready.length} ready${text === current ? " (unchanged)" : " (written; run npm run guidelines:build)"}`);
  } else if (text !== current) {
    const listed = current ? JSON.parse(current).ready ?? [] : [];
    const broke = listed.filter((name) => !ready.includes(name));
    const added = ready.filter((name) => !listed.includes(name));
    console.error(`${rel(STATUS_FILE)} is out of date${broke.length ? `: no longer matching ${broke.join(", ")}` : ""}${added.length ? `${broke.length ? ";" : ":"} newly matching ${added.join(", ")}` : ""}. Fix the port, or run npm run vue:parity -- --write.`);
    process.exit(1);
  }
}
process.exit(failed && !WRITE ? 1 : 0);

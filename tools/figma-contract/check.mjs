/*
 * Figma contract checker.
 *
 *   node tools/figma-contract/check.mjs <suite.mjs> [--only=<substring>] [--json=<out>]
 *
 * A suite exports { contract, kind, cases(variant) → props | null, map: [...] }.
 * `contract` is a JSON file extracted from Figma with the Plugin API (see README.md):
 * every variant carries the node tree with sizes, auto-layout, paints and their
 * bound variables, effects/effect styles and text styles.
 *
 * For every variant × mode the checker renders the production React component,
 * then compares each mapped Figma layer with its DOM element:
 *   - geometry: width / height / offset from the component root (covers padding + gap)
 *   - fill, stroke (colour + weight), radius, opacity
 *   - effect style → resolved `--zen-style-*-shadow`
 *   - text style → resolved `.zen-type-*` class values, plus text colour
 * Bound variables are resolved through a probe element in the same DOM context,
 * so the binding itself is verified (in every mode), not only the light-mode value.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../..");
const args = Object.fromEntries(process.argv.slice(3).map((arg) => arg.replace(/^--/, "").split("=")));
const suitePath = path.resolve(process.argv[2]);
const suite = (await import(pathToFileURL(suitePath))).default;

// esbuild + Playwright: use the repo's node_modules when present, else global installs.
const globalRoot = execFileSync("npm", ["root", "-g"]).toString().trim();
const load = (candidates) => {
  for (const candidate of candidates) {
    try { return createRequire(path.join(repo, "noop.js"))(candidate); } catch { /* next */ }
  }
  throw new Error(`Cannot load any of: ${candidates.join(", ")}`);
};
const esbuild = load(["esbuild", path.join(globalRoot, "esbuild"), path.join(globalRoot, "tsx/node_modules/esbuild")]);
const { chromium } = load(["playwright", "@playwright/test", path.join(globalRoot, "playwright")]);

const contract = JSON.parse(fs.readFileSync(path.resolve(repo, suite.contract), "utf8"));
const set = contract.find((entry) => entry.id === suite.setId || entry.name === suite.setName);
if (!set) throw new Error(`Set ${suite.setId ?? suite.setName} not found in ${suite.contract}`);

const modes = suite.modes ?? [
  { theme: "light", componentTheme: "neutral-s1" },
  { theme: "dark", componentTheme: "brand-s1" },
];

// ---------- build harness ----------
const outDir = path.join(repo, "tools/figma-contract/.out");
fs.mkdirSync(outDir, { recursive: true });
await esbuild.build({
  entryPoints: [path.join(here, "harness.tsx")],
  bundle: true,
  outfile: path.join(outDir, "harness.js"),
  loader: { ".svg": "dataurl", ".png": "dataurl", ".woff2": "dataurl", ".woff": "dataurl", ".otf": "dataurl", ".ttf": "dataurl" },
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"development"' },
  logLevel: "error",
});

const variants = (set.variants ?? [{ vp: {}, spec: set.spec }]).filter((variant) => {
  const key = JSON.stringify(variant.vp);
  return !args.only || key.includes(args.only);
});
const caseList = [];
for (const variant of variants) {
  const produced = suite.cases(variant.vp, variant);
  if (produced === null) continue;
  for (const props of Array.isArray(produced) ? produced : [produced]) caseList.push({ id: `c${caseList.length}`, kind: suite.kind, props, variant });
}

const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="harness.css"><style>*,*::before,*::after{transition:none!important;animation:none!important}</style></head>
<body><div id="root"></div><script>window.__CASES=${JSON.stringify(caseList.map(({ id, kind, props }) => ({ id, kind, props })))}</script><script src="harness.js"></script></body></html>`;
fs.writeFileSync(path.join(outDir, "index.html"), html);

// ---------- Figma helpers ----------
const findPath = (root, route) => {
  if (!route) return { node: root, x: 0, y: 0 };
  let node = root;
  let x = 0;
  let y = 0;
  const direct = (root.c ?? []).some((child) => route.split("|").includes(child.n));
  const parts = route.includes(" > ") ? route.split(" > ") : direct ? [route] : route.split("/");
  for (const part of parts) {
    const [nameText, indexText] = part.split("#");
    const names = nameText.split("|");
    const matches = (node.c ?? []).filter((child) => names.includes(child.n));
    const child = matches[Number(indexText ?? 0)];
    if (!child) return null;
    x += child.x ?? 0;
    y += child.y ?? 0;
    node = child;
  }
  return { node, x, y };
};
const cssVar = (name) => `--zen-${name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}`;
const visiblePaint = (paints) => (paints ?? []).find((paint) => !paint.hidden);
const styleToken = (name) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

// ---------- run ----------
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
await page.goto(pathToFileURL(path.join(outDir, "index.html")).href);
await page.waitForSelector("[data-case]");
await page.evaluate(() => document.fonts.ready);

const results = [];
for (const mode of modes) {
  await page.evaluate(({ theme, componentTheme }) => {
    const html = document.documentElement;
    html.dataset.brand = "zen";
    html.dataset.theme = theme;
    html.dataset.componentTheme = componentTheme;
    html.dataset.density = "compact";
    html.dataset.radius = "rounded";
    html.dataset.emphasis = "medium";
    html.dataset.typography = "dashboard";
  }, mode);
  for (const item of caseList) {
    const spec = item.variant.spec;
    const checks = [];
    for (const entry of suite.map) {
      if (entry.when && !entry.when(item.variant.vp, item.props)) continue;
      const figma = findPath(spec, entry.figma);
      if (!figma) { checks.push({ layer: entry.figma, prop: "exists", figma: "missing in Figma", dom: "-", ok: false }); continue; }
      const node = figma.node;
      if (node.hidden && !entry.forceVisible) {
        const present = await page.evaluate(({ id, sel }) => {
          const el = document.querySelector(`[data-case="${id}"] ${sel.split("::")[0]}`);
          if (!el) return false;
          const pseudo = sel.includes("::") ? "::" + sel.split("::")[1] : null;
          const cs = getComputedStyle(el, pseudo);
          return pseudo ? cs.content !== "none" && cs.display !== "none" : cs.display !== "none" && cs.visibility !== "hidden";
        }, { id: item.id, sel: entry.dom });
        checks.push({ layer: entry.figma, prop: "hidden", figma: "hidden", dom: present ? "visible" : "hidden", ok: !present });
        continue;
      }
      const want = {
        w: node.w, h: node.h, x: figma.x, y: figma.y,
        fill: visiblePaint(node.fill), stroke: visiblePaint(node.stroke), sw: node.sw, sa: node.sa,
        r: node.r, bvR: node.bv?.topLeftRadius, op: node.op,
        fxStyle: node.fxStyle, ts: node.ts, textFill: node.t === "TEXT" ? visiblePaint(node.fill) : null,
      };
      const got = await page.evaluate(({ id, sel, want, entry, cssVars, styleTokens }) => {
        const root = document.querySelector(`[data-case="${id}"]`);
        const rootEl = entry.root ? root.querySelector(entry.root) : root.firstElementChild;
        const [base, pseudoName] = sel.split("::");
        const el = base === ":root" ? rootEl : root.querySelector(base);
        if (!rootEl) return { missing: true };
        if (!el) return { missing: true };
        const pseudo = pseudoName ? "::" + pseudoName : null;
        const cs = getComputedStyle(el, pseudo);
        const probe = (prop, value) => {
          const p = document.createElement("div");
          p.style.position = "absolute";
          p.style.setProperty(prop, value);
          (el.parentElement ?? el).appendChild(p);
          const out = getComputedStyle(p).getPropertyValue(prop);
          p.remove();
          return out;
        };
        const rr = rootEl.getBoundingClientRect();
        let rect = el.getBoundingClientRect();
        if (pseudo) {
          const px = (v) => parseFloat(v) || 0;
          const left = rect.left + px(cs.left), top = rect.top + px(cs.top);
          const extraX = cs.boxSizing === "border-box" ? 0 : px(cs.borderLeftWidth) + px(cs.borderRightWidth) + px(cs.paddingLeft) + px(cs.paddingRight);
          const extraY = cs.boxSizing === "border-box" ? 0 : px(cs.borderTopWidth) + px(cs.borderBottomWidth) + px(cs.paddingTop) + px(cs.paddingBottom);
          const width = cs.width !== "auto" ? px(cs.width) + extraX : rect.width - px(cs.left) - px(cs.right);
          const height = cs.height !== "auto" ? px(cs.height) + extraY : rect.height - px(cs.top) - px(cs.bottom);
          rect = { left, top, width, height };
        }
        const colorOf = (paint) => {
          if (!paint) return null;
          if (paint.v) return probe("color", `var(${cssVars[paint.v]})`) || `UNDEFINED ${cssVars[paint.v]}`;
          if (paint.c) return probe("color", paint.c);
          return paint.t;
        };
        const out = {};
        const need = entry.check;
        if (need.includes("size")) { out.w = [want.w, +rect.width.toFixed(2)]; out.h = [want.h, +rect.height.toFixed(2)]; }
        if (need.includes("h")) out.h = [want.h, +rect.height.toFixed(2)];
        if (need.includes("w")) out.w = [want.w, +rect.width.toFixed(2)];
        if (need.includes("pos") || need.includes("x")) out.x = [want.x, +(rect.left - rr.left).toFixed(2)];
        if (need.includes("pos") || need.includes("y")) out.y = [want.y, +(rect.top - rr.top).toFixed(2)];
        if (need.includes("fill")) {
          const expected = want.fill ? colorOf(want.fill) : "rgba(0, 0, 0, 0)";
          const actual = entry.fillVia === "color" ? cs.color : entry.fillVia === "fill" ? cs.fill : cs.backgroundColor;
          out.fill = [expected + (want.fill?.v ? `  [${want.fill.v}]` : ""), actual];
        }
        if (need.includes("stroke")) {
          const expected = want.stroke ? `${want.sw}px ${colorOf(want.stroke)}` : "none";
          let actual = "none";
          const via = entry.strokeVia ?? "border";
          if (via === "border" && parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none") actual = `${parseFloat(cs.borderTopWidth)}px ${cs.borderTopColor}`;
          if (via === "after" || via === "before") {
            const ps = getComputedStyle(el, "::" + via);
            if (ps.content !== "none" && parseFloat(ps.borderTopWidth) > 0) actual = `${parseFloat(ps.borderTopWidth)}px ${ps.borderTopColor}`;
          }
          if (via === "outline" && cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) actual = `${parseFloat(cs.outlineWidth)}px ${cs.outlineColor}`;
          if (via === "shadow") {
            const m = cs.boxShadow.match(/(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px/);
            if (m) actual = `${parseFloat(m[2])}px ${m[1]}`;
          }
          if (actual !== "none" && /rgba\(0, 0, 0, 0\)$/.test(actual)) actual = "none (transparent)";
          out.stroke = [expected + (want.stroke?.v ? `  [${want.stroke.v}]` : "") + (want.sa ? ` ${want.sa}` : ""), actual];
        }
        if (need.includes("radius")) {
          const expected = want.bvR ? probe("width", `var(${cssVars[want.bvR]})`) : `${want.r ?? 0}px`;
          out.r = [expected + (want.bvR ? `  [${want.bvR}]` : ""), cs.borderTopLeftRadius];
        }
        if (need.includes("fx")) {
          const expected = want.fxStyle ? probe("box-shadow", `var(--zen-style-${styleTokens[want.fxStyle]}-shadow)`) : "none";
          out.fx = [expected + (want.fxStyle ? `  [${want.fxStyle}]` : ""), cs.boxShadow];
        }
        if (need.includes("text")) {
          const p = document.createElement("span");
          p.className = `zen-type-${styleTokens[want.ts]}`;
          (el.parentElement ?? el).appendChild(p);
          const ps = getComputedStyle(p);
          const pick = (s) => `${s.fontFamily.split(",")[0]} ${s.fontWeight} ${s.fontSize}/${s.lineHeight} ls=${s.letterSpacing} ${s.textTransform}`;
          out.text = [pick(ps) + `  [${want.ts}]`, pick(cs)];
          p.remove();
          out.color = [colorOf(want.textFill) + (want.textFill?.v ? `  [${want.textFill.v}]` : ""), cs.color];
        }
        if (need.includes("opacity")) out.op = [String(want.op ?? 1), cs.opacity];
        return out;
      }, {
        id: item.id, sel: entry.dom, want, entry: { check: entry.check, fillVia: entry.fillVia, strokeVia: entry.strokeVia, root: entry.root ?? suite.root },
        cssVars: Object.fromEntries([want.fill?.v, want.stroke?.v, want.textFill?.v, want.bvR].filter(Boolean).map((name) => [name, cssVar(name)])),
        styleTokens: Object.fromEntries([want.fxStyle, want.ts].filter(Boolean).map((name) => [name, styleToken(name)])),
      });
      if (got.missing) { checks.push({ layer: entry.figma, prop: "exists", figma: "present", dom: `missing ${entry.dom}`, ok: false }); continue; }
      for (const [prop, [expected, actual]] of Object.entries(got)) {
        const tolerance = entry.tolerance ?? 0.5;
        let ok;
        const norm = (value) => String(value).split("  [")[0].trim().replace(/rgba\(\d+, \d+, \d+, 0\)/g, "transparent");
        if (typeof expected === "number") ok = Math.abs(expected - actual) <= tolerance;
        else ok = norm(expected) === norm(actual) || (expected === "none" && String(actual).startsWith("none"));
        if (prop === "r" && !ok) {
          const e = parseFloat(expected); const a = parseFloat(actual);
          ok = e >= 999 && a >= 999; // "rounded" pill tokens
        }
        checks.push({ layer: entry.figma || "(root)", dom: entry.dom, prop, figma: expected, actual, ok });
      }
    }
    results.push({ mode: `${mode.theme}/${mode.componentTheme}`, variant: item.variant.vp, props: item.props, checks });
  }
}
await browser.close();

// ---------- report ----------
let failures = 0;
let total = 0;
const lines = [];
const known = [];
const isKnown = (result, check) => (suite.figmaExceptions ?? []).find((item) =>
  item.layer === check.layer && item.prop === check.prop && Object.entries(item.vp).every(([key, value]) => result.variant[key] === value));
for (const result of results) {
  for (const check of result.checks) {
    const exception = !check.ok && isKnown(result, check);
    if (exception) { check.ok = true; known.push(`  ! [${result.mode}] ${JSON.stringify(result.variant)} ${check.layer}.${check.prop}: ${exception.note}`); }
  }
  const bad = result.checks.filter((check) => !check.ok);
  total += result.checks.length;
  failures += bad.length;
  if (!bad.length) continue;
  lines.push(`\n[${result.mode}] ${JSON.stringify(result.variant)}`);
  for (const check of bad) lines.push(`  ✗ ${check.layer} → ${check.dom ?? ""} .${check.prop}: figma=${check.figma} | code=${check.actual ?? check.dom}`);
}
console.log(lines.join("\n"));
if (known.length) console.log(`\nKnown Figma inconsistencies (code follows the consistent rule):\n${[...new Set(known)].join("\n")}`);
console.log(`\n${set.name}: ${total - failures}/${total} checks match across ${caseList.length} variants × ${modes.length} modes.`);
if (args.json) fs.writeFileSync(args.json, JSON.stringify(results, null, 1));
process.exitCode = failures ? 1 : 0;

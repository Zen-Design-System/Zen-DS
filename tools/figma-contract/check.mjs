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
// One folder per run: the gate runs several suites at once, and a shared harness.js / index.html let a suite load
// another suite's cases (or a half-written bundle). --keep leaves the folder for debugging.
const outDir = path.join(repo, "tools/figma-contract/.out", `${path.basename(suitePath, ".mjs")}-${process.pid}`);
fs.mkdirSync(outDir, { recursive: true });
if (!("keep" in args)) process.on("exit", () => fs.rmSync(outDir, { recursive: true, force: true }));
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
  // A layer under a hidden one is hidden too, for suites that ask (`inheritHidden`: a chart's Hover off hides its
  // Tooltip-Anchor, not the Tooltip in it).
  let hidden = false;
  const direct = (root.c ?? []).some((child) => route.split("|").includes(child.n));
  const parts = route.includes(" > ") ? route.split(" > ") : direct ? [route] : route.split("/");
  for (const part of parts) {
    const [nameText, indexText] = part.split("#");
    const names = nameText.split("|");
    // `*` matches any child (a layer named by its own text, as a chart's tick label).
    const matches = (node.c ?? []).filter((child) => names.includes(child.n) || names.includes("*"));
    const child = matches[Number(indexText ?? 0)];
    if (!child) return null;
    x += child.x ?? 0;
    y += child.y ?? 0;
    hidden ||= Boolean(child.hidden);
    node = child;
  }
  return { node, x, y, hidden };
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
  // A mode may set `radius` (Corner Radius mode) so radius bindings are verified where the tokens differ per size;
  // Figma geometry is Compact, so density stays fixed.
  await page.evaluate(({ theme, componentTheme, radius }) => {
    const html = document.documentElement;
    html.dataset.brand = "zen";
    html.dataset.theme = theme;
    html.dataset.componentTheme = componentTheme;
    html.dataset.density = "compact";
    html.dataset.radius = radius ?? "rounded";
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
      const origin = entry.figmaRoot ? findPath(spec, entry.figmaRoot) : null;
      if (entry.figmaRoot && !origin) { checks.push({ layer: entry.figmaRoot, prop: "exists", figma: "missing in Figma", dom: "-", ok: false }); continue; }
      if ((node.hidden || (suite.inheritHidden && figma.hidden)) && !entry.forceVisible) {
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
        // `figmaRoot` (with `root`, its DOM pair): offsets from that layer instead of the component, so a plot's insides
        // compare to its own frame when a lane above it differs.
        w: node.w, h: node.h, x: figma.x - (origin?.x ?? 0), y: figma.y - (origin?.y ?? 0), rootW: (origin?.node ?? spec).w,
        fill: visiblePaint(node.fill), stroke: visiblePaint(node.stroke), sw: node.sw, sa: node.sa,
        r: node.r, bvR: node.bv?.topLeftRadius, op: node.op,
        // Mixed corners: Figma's [top-left, top-right, bottom-right, bottom-left] and each corner's own binding.
        bvRs: Array.isArray(node.r) ? ["topLeftRadius", "topRightRadius", "bottomRightRadius", "bottomLeftRadius"].map((corner) => node.bv?.[corner] ?? null) : null,
        fills: (node.fill ?? []).filter((paint) => !paint.hidden), image: (node.fill ?? []).some((paint) => paint.t === "IMAGE" && !paint.hidden),
        minW: node.minW, maxW: node.maxW, minH: node.minH, dash: node.dash,
        fxStyle: node.fxStyle, ts: node.ts, textFill: node.t === "TEXT" ? visiblePaint(node.fill) : null,
        // Figma applies shadow spread only on rectangles/ellipses or on filled frames that clip content.
        spreadApplies: ["RECTANGLE", "ELLIPSE"].includes(node.t) || (Boolean(node.clip) && Boolean(visiblePaint(node.fill))),
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
          // Linear gradients (Button/Overlay's 1px ring) compare as their colour stops, top → bottom.
          if (paint.t === "GRADIENT_LINEAR" && paint.stops) return `linear-gradient(${paint.stops.map((stop) => `${probe("color", stop.c)} ${+(stop.p * 100).toFixed(2)}%`).join(", ")})`;
          return paint.t;
        };
        const out = {};
        const need = entry.check;
        if (need.includes("size")) { out.w = [want.w, +rect.width.toFixed(2)]; out.h = [want.h, +rect.height.toFixed(2)]; }
        if (need.includes("h")) out.h = [want.h, +rect.height.toFixed(2)];
        if (need.includes("w")) out.w = [want.w, +rect.width.toFixed(2)];
        if (need.includes("pos") || need.includes("x")) out.x = [want.x, +(rect.left - rr.left).toFixed(2)];
        if (need.includes("pos") || need.includes("y")) out.y = [want.y, +(rect.top - rr.top).toFixed(2)];
        // The end edge, for a FILL layer whose start follows a text-hugging sibling (its x and w vary with the font).
        if (need.includes("right")) out.right = [want.x + want.w, +((rect.right ?? rect.left + rect.width) - rr.left).toFixed(2)];
        // The centre, for a layer whose box differs from the element's but whose middle must match (a chart's axis label
        // centred in a grid row Figma sizes to the row, where code's box hugs the line).
        // The same in % of the root's width (`figmaRoot` and its DOM pair): a row whose width follows text-hugging
        // neighbours (it differs by a pixel or two between font rasterisers) still places its marks proportionally.
        const pct = (value, of) => +((value / of) * 100).toFixed(2);
        if (need.includes("xr")) out.xr = [pct(want.x, want.rootW), pct(rect.left - rr.left, rr.width)];
        if (need.includes("wr")) out.wr = [pct(want.w, want.rootW), pct(rect.width, rr.width)];
        if (need.includes("cxr")) out.cxr = [pct(want.x + want.w / 2, want.rootW), pct(rect.left + rect.width / 2 - rr.left, rr.width)];
        if (need.includes("cx")) out.cx = [+(want.x + want.w / 2).toFixed(2), +(rect.left + rect.width / 2 - rr.left).toFixed(2)];
        if (need.includes("cy")) out.cy = [+(want.y + want.h / 2).toFixed(2), +(rect.top + rect.height / 2 - rr.top).toFixed(2)];
        if (need.includes("fill")) {
          const expected = want.fill ? colorOf(want.fill) : "rgba(0, 0, 0, 0)";
          // "stroke": a Figma fill that code draws as an SVG stroke (a gauge's value arc).
          const actual = entry.fillVia === "color" ? cs.color : entry.fillVia === "fill" ? cs.fill : entry.fillVia === "stroke" ? cs.stroke : entry.fillVia === "caret" ? cs.caretColor : cs.backgroundColor;
          out.fill = [expected + (want.fill?.v ? `  [${want.fill.v}]` : ""), actual];
          // "gradient": an SVG shape painted by a <linearGradient> (a chart's area fade). Each stop compares through its
          // bound variable, and the paint's opacity with the shape's fill-opacity.
          if (entry.fillVia === "gradient") {
            const paint = want.fill;
            const round = (value) => +Number(value).toFixed(2);
            const stops = (paint?.stops ?? []).map((stop) => `${stop.v ? probe("color", `var(${cssVars[stop.v]})`) : probe("color", stop.c)} ${round(stop.p * 100)}%`);
            const wanted = paint ? `linear-gradient(${stops.join(", ")}) @${round(paint.op ?? 1)}` : "none";
            const ref = cs.fill.match(/url\("?#([^")]+)"?\)/);
            const gradient = ref && document.getElementById(ref[1]);
            const got = gradient
              ? `linear-gradient(${Array.from(gradient.querySelectorAll("stop")).map((stop) => `${getComputedStyle(stop).stopColor} ${round(parseFloat(stop.getAttribute("offset")) * 100)}%`).join(", ")}) @${round(cs.fillOpacity)}`
              : cs.fill;
            out.fill = [wanted + (paint?.stops ? `  [${paint.stops.map((stop) => stop.v ?? stop.c).join(" → ")}]` : ""), got];
          }
        }
        if (need.includes("fills")) {
          // Figma paints its fills list in order, the last on top. Code: background-color at the bottom, then the
          // background-image layers (CSS lists the top one first); a solid overlay is a one-colour gradient.
          const paintOf = (paint) => (paint.t === "SOLID" ? colorOf(paint) : paint.t === "IMAGE" ? "image" : colorOf(paint));
          const expected = want.fills.length ? want.fills.map(paintOf).join(" | ") : "none";
          const layers = [];
          let depth = 0, start = 0;
          const images = cs.backgroundImage === "none" ? "" : cs.backgroundImage;
          for (let i = 0; i <= images.length; i += 1) {
            const ch = images[i];
            if (ch === "(") depth += 1;
            else if (ch === ")") depth -= 1;
            else if ((ch === "," && depth === 0) || i === images.length) { if (images.slice(start, i).trim() && images.slice(start, i).trim() !== "none") layers.push(images.slice(start, i).trim()); start = i + 1; }
          }
          const layerPaint = (layer) => {
            if (/^url\(/.test(layer)) return "image";
            const stops = layer.match(/^linear-gradient\((.*)\)$/)?.[1].split(/,(?![^(]*\))/).map((part) => part.trim().replace(/\s+\d+(\.\d+)?%$/, "")).filter((part) => !/^(to |\d+deg)/.test(part));
            return stops && stops.length && stops.every((stop) => stop === stops[0]) ? stops[0] : layer;
          };
          const stack = [...(/rgba\(\d+, \d+, \d+, 0\)/.test(cs.backgroundColor) ? [] : [cs.backgroundColor]), ...layers.reverse().map(layerPaint)];
          out.fills = [expected + (want.fills.some((paint) => paint.v) ? `  [${want.fills.map((paint) => paint.v ?? paint.c ?? paint.t).join(" | ")}]` : ""), stack.length ? stack.join(" | ") : "none"];
        }
        // image: a Figma IMAGE fill is a picture in code (an <img>, itself or inside, or a background url()).
        if (need.includes("image")) {
          const picture = el.tagName === "IMG" || Boolean(el.querySelector?.("img")) || /url\(/.test(cs.backgroundImage);
          out.image = [want.image ? "image" : "none", picture ? "image" : "none"];
        }
        // minw / maxw / minh: Figma's min and max width and min height (auto layout), against the computed CSS.
        const px = (value) => (value === undefined || value === null ? null : `${+Number(value).toFixed(2)}px`);
        const cssSize = (value, none) => (value === "auto" || value === "none" || value === "0px" ? none : `${+parseFloat(value).toFixed(2)}px`);
        if (need.includes("minw")) out.minw = [px(want.minW) ?? "none", cssSize(cs.minWidth, "none")];
        if (need.includes("maxw")) out.maxw = [px(want.maxW) ?? "none", cssSize(cs.maxWidth, "none")];
        if (need.includes("minh")) out.minh = [px(want.minH) ?? "none", cssSize(cs.minHeight, "none")];
        // dash: a dashed Figma stroke. An SVG shape's stroke-dasharray (times dashScale for shapes in viewBox units), else
        // a dashed border (CSS cannot set the dash lengths, so only the style compares).
        if (need.includes("dash")) {
          const svg = el instanceof SVGElement;
          const scale = entry.dashScale ?? 1;
          const expected = !want.dash ? "none" : svg ? want.dash.map((n) => +(n).toFixed(2)).join(" ") : "dashed";
          const actual = svg
            ? (cs.strokeDasharray === "none" ? "none" : cs.strokeDasharray.split(/[,\s]+/).filter(Boolean).map((n) => +(parseFloat(n) * scale).toFixed(2)).join(" "))
            : cs.borderTopStyle === "dashed" || cs.borderBottomStyle === "dashed" || cs.borderLeftStyle === "dashed" || cs.outlineStyle === "dashed" ? "dashed" : "none";
          out.dash = [expected, actual];
        }
        if (need.includes("stroke")) {
          // Per-side weights ([top, right, bottom, left]: a one-sided stroke) compare the side's weight.
          const sideIndex = { top: 0, right: 1, bottom: 2, left: 3 }[entry.strokeSide ?? "top"];
          const weight = Array.isArray(want.sw) ? want.sw[sideIndex] : want.sw;
          const expected = want.stroke ? `${weight}px ${colorOf(want.stroke)}` : "none";
          let actual = "none";
          const via = entry.strokeVia ?? "border";
          // strokeSide: the border side that draws a one-sided stroke (a vertical rule drawn by border-left); default top.
          const side = { top: "Top", left: "Left", bottom: "Bottom", right: "Right" }[entry.strokeSide ?? "top"];
          if (via === "border" && parseFloat(cs[`border${side}Width`]) > 0 && cs[`border${side}Style`] !== "none") actual = `${parseFloat(cs[`border${side}Width`])}px ${cs[`border${side}Color`]}`;
          if (via === "after" || via === "before") {
            const ps = getComputedStyle(el, "::" + via);
            if (ps.content !== "none" && parseFloat(ps[`border${side}Width`]) > 0) actual = `${parseFloat(ps[`border${side}Width`])}px ${ps[`border${side}Color`]}`;
          }
          // "svg": an SVG shape's own stroke (a chart's line, ring or tick); its width in CSS px, as Figma's stroke weight.
          if (via === "svg" && cs.stroke !== "none" && parseFloat(cs.strokeWidth) > 0) actual = `${+(parseFloat(cs.strokeWidth) * (entry.strokeScale ?? 1)).toFixed(2)}px ${cs.stroke}`;
          if (via === "outline" && cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) actual = `${parseFloat(cs.outlineWidth)}px ${cs.outlineColor}`;
          if (via === "shadow") {
            const m = cs.boxShadow.match(/(rgba?\([^)]*\))\s+0px\s+0px\s+0px\s+([\d.]+)px/);
            if (m) actual = `${parseFloat(m[2])}px ${m[1]}`;
          }
          // "inset": an INSIDE stroke drawn as an inset box-shadow, an edge (0 -2px 0 0 inset: the bottom side, offset away
          // from it) or a spread ring (0 0 0 1px inset: every side).
          if (via === "inset") {
            const side = entry.strokeSide ?? "top";
            for (const layer of cs.boxShadow.split(/,(?![^(]*\))/).map((part) => part.trim()).filter((part) => /\binset\b/.test(part))) {
              const color = layer.match(/rgba?\([^)]*\)/)?.[0];
              const [x, y, blur, spread] = (layer.replace(/rgba?\([^)]*\)/, "").match(/-?[\d.]+px/g) ?? []).map(parseFloat);
              const edge = { top: y > 0 && !x, bottom: y < 0 && !x, left: x > 0 && !y, right: x < 0 && !y }[side];
              if (!blur && !spread && edge) { actual = `${Math.abs(x || y)}px ${color}`; break; }
              if (!blur && !x && !y && spread > 0) { actual = `${spread}px ${color}`; break; }
            }
          }
          // "mask": a ring painted by a masked ::after (padding = stroke width, background = the paint), for gradient strokes.
          if (via === "mask") {
            const ps = getComputedStyle(el, "::after");
            if (ps.content !== "none" && ps.display !== "none" && parseFloat(ps.paddingTop) > 0) {
              const paint = ps.backgroundImage !== "none" ? ps.backgroundImage.replace(/^linear-gradient\((?:180deg|to bottom), /, "linear-gradient(") : ps.backgroundColor;
              actual = `${parseFloat(ps.paddingTop)}px ${paint}`;
            }
          }
          if (actual !== "none" && /rgba\(0, 0, 0, 0\)$/.test(actual)) actual = "none (transparent)";
          out.stroke = [expected + (want.stroke?.v ? `  [${want.stroke.v}]` : "") + (want.sa ? `  [${want.sa}]` : ""), actual];
        }
        if (need.includes("radius")) {
          if (Array.isArray(want.r)) {
            // Mixed corners (a chat bubble's tail, a range's end day): top-left, top-right, bottom-right, bottom-left.
            const expected = want.r.map((r, i) => (want.bvRs?.[i] ? probe("width", `var(${cssVars[want.bvRs[i]]})`) : `${r}px`)).join(" ");
            const actual = ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map((corner) => cs[`border${corner}Radius`]).join(" ");
            out.r = [expected + (want.bvRs?.some(Boolean) ? `  [${want.bvRs.map((name) => name ?? "-").join(" · ")}]` : ""), actual];
          } else {
            const expected = want.bvR ? probe("width", `var(${cssVars[want.bvR]})`) : `${want.r ?? 0}px`;
            out.r = [expected + (want.bvR ? `  [${want.bvR}]` : ""), cs.borderTopLeftRadius];
          }
        }
        if (need.includes("fx")) {
          const base = `--zen-style-${styleTokens[want.fxStyle]}-shadow`;
          const unclipped = !want.spreadApplies && getComputedStyle(document.documentElement).getPropertyValue(`${base}-unclipped`).trim();
          const expected = want.fxStyle ? probe("box-shadow", `var(${unclipped ? `${base}-unclipped` : base})`) : "none";
          // fxIgnoreInset: components that paint their stroke as an inset ring in the same box-shadow list (Button) compare
          // only the outer shadows; fully transparent zero shadows ("0 0 #0000" placeholders) count as none.
          // fxIgnoreRing: a stroke drawn as a spread ring in the same list (0 0 0 Npx, Toggle-Button's dot) is not a shadow.
          const outer = (value) => {
            if ((!entry.fxIgnoreInset && !entry.fxIgnoreRing) || value === "none") return value;
            const layers = value.split(/,(?![^(]*\))/).map((layer) => layer.trim())
              .filter((layer) => !(entry.fxIgnoreInset && /\binset\b/.test(layer)) && !/^rgba\(\d+, \d+, \d+, 0\)(\s+0px)+$/.test(layer))
              .filter((layer) => !(entry.fxIgnoreRing && /^rgba?\([^)]*\)\s+0px\s+0px\s+0px\s+[\d.]+px$/.test(layer)));
            return layers.length ? layers.join(", ") : "none";
          };
          out.fx = [outer(expected) + (want.fxStyle ? `  [${want.fxStyle}${unclipped ? ", spread ignored: no clip" : ""}]` : ""), outer(cs.boxShadow)];
          // fxBackdrop: the effect style's BACKGROUND_BLUR (`--zen-style-*-backdrop-filter`) must be on the element, and only then.
          if (entry.fxBackdrop) {
            const blur = want.fxStyle ? getComputedStyle(document.documentElement).getPropertyValue(`--zen-style-${styleTokens[want.fxStyle]}-backdrop-filter`).trim() : "";
            out.blur = [(blur ? probe("backdrop-filter", blur) : "none") + (want.fxStyle ? `  [${want.fxStyle}]` : ""), cs.backdropFilter];
          }
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
        // Figma stores opacity as a float (0.47999998927116394 for 48%): both sides compare to three decimals.
        const op3 = (value) => String(Math.round(Number(value) * 1000) / 1000);
        if (need.includes("opacity")) out.op = [op3(want.op ?? 1), op3(cs.opacity)];
        return out;
      }, {
        id: item.id, sel: entry.dom, want, entry: { check: entry.check, fillVia: entry.fillVia, strokeVia: entry.strokeVia, strokeSide: entry.strokeSide, strokeScale: entry.strokeScale, fxIgnoreInset: entry.fxIgnoreInset, fxIgnoreRing: entry.fxIgnoreRing, fxBackdrop: entry.fxBackdrop, dashScale: entry.dashScale, root: entry.root ?? suite.root },
        cssVars: Object.fromEntries([want.fill?.v, want.stroke?.v, want.textFill?.v, want.bvR, ...(want.bvRs ?? []), ...want.fills.map((paint) => paint.v), ...(want.fill?.stops ?? []).map((stop) => stop.v)].filter(Boolean).map((name) => [name, cssVar(name)])),
        styleTokens: Object.fromEntries([want.fxStyle, want.ts].filter(Boolean).map((name) => [name, styleToken(name)])),
      });
      if (got.missing) { checks.push({ layer: entry.figma, prop: "exists", figma: "present", dom: `missing ${entry.dom}`, ok: false }); continue; }
      for (const [prop, [expected, actual]] of Object.entries(got)) {
        const tolerance = entry.tolerance ?? 0.5;
        let ok;
        const norm = (value) => String(value).split("  [")[0].trim().replace(/rgba\(\d+, \d+, \d+, 0\)/g, "transparent");
        if (typeof expected === "number") ok = Math.abs(expected - actual) <= tolerance;
        else ok = norm(expected) === norm(actual) || (norm(expected) === "none" && String(actual).startsWith("none"));
        if (prop === "r" && !ok) {
          // "rounded" pill tokens (1000px vs a computed 9999px), corner by corner for mixed corners.
          const es = norm(expected).split(" ").map(parseFloat); const as = String(actual).split(" ").map(parseFloat);
          ok = es.length === as.length && es.every((e, i) => e === as[i] || (e >= 999 && as[i] >= 999));
        }
        checks.push({ layer: entry.figma || "(root)", dom: entry.dom, prop, figma: expected, actual, ok });
      }
    }
    results.push({ mode: `${mode.theme}/${mode.componentTheme}${mode.radius ? `/${mode.radius}` : ""}`, variant: item.variant.vp, props: item.props, checks });
  }
}
await browser.close();

// ---------- report ----------
let failures = 0;
let total = 0;
const lines = [];
const known = [];
// An exception may pin `code` (the value code deliberately renders instead), so a later drift still fails: a string
// matches exactly, a number within 0.05px (a geometry code derives, as a bar's width from its column).
const pinned = (code, actual) => (typeof code === "number" ? Math.abs(Number(actual) - code) <= 0.05 : String(actual) === code);
const isKnown = (result, check) => (suite.figmaExceptions ?? []).find((item) =>
  item.layer === check.layer && item.prop === check.prop && Object.entries(item.vp).every(([key, value]) => result.variant[key] === value)
  && (item.code === undefined || pinned(item.code, check.actual)));
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

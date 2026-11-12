#!/usr/bin/env node
/**
 * HTML + CSS parity (plan docs/research/code-languages-plan-2026-10-03.md §3.B; P2's "done"): a playground's HTML
 * snippet, pasted into a plain page that loads only the package's dist/styles.css and dist/reset.css with the modes
 * the snippet names on <html>, must draw exactly what React draws. For each playground panel it screenshots the React
 * preview row, writes the snippet (code/html.ts, the same function the Code view runs, with its stylesheet links
 * pointed at dist/) into a plain page inside a box like the row (width, padding, alignment, background), screenshots
 * that, and compares the two with visual-diff's compare: 0 changed panels is parity.
 *
 *   node tools/code-languages/html-parity.mjs [--isolated | --url=…] [--pages=badge,button] [--out=<dir>] [--write]
 *
 * Needs dist/ (npm run build:lib). Default pages: those of the stateless components (they gate). --write records the
 * HTML status the Code view reads (tools/code-languages/html.json; npm run guidelines:build turns it into the
 * manifest): a stateless component is ready once every specimen it appears in matches; an overlay surface (drawn in
 * the portal, outside the specimen) is not available; every other component is markup only.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");
const argv = process.argv.slice(2);
const opt = (name, fallback) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const flag = (name) => argv.includes(`--${name}`);

/** Stateless component folders (plan §1, hooks and listeners counted 2026-10-03): their HTML is the whole component. */
export const STATELESS = ["AlertBanner", "Avatar", "Badge", "Button", "ColorSelector", "Divider", "DockIcon", "EmptyState", "FileIcon", "Icon", "InlineMessage", "Layout", "Link", "ListItem", "MetricWidget", "Motion", "PageHeader", "Portal", "Progress", "Skeleton", "Stepper", "Text", "VisuallyHidden"];
/**
 * Folders that are only an overlay surface, drawn in the overlay portal outside the specimen (nothing in place while
 * closed): HTML has nothing faithful to show. Menu, Popover and Tooltip keep their trigger in place, so their closed
 * markup is HTML's (markup only).
 */
export const OVERLAYS = ["BottomSheet", "Dialog", "SidePanel", "Toast"];

/** Export name → its component folder, from each folder's index.ts. */
function exportsByFolder() {
  const out = new Map();
  for (const folder of fs.readdirSync(path.join(root, "src/components"))) {
    const index = path.join(root, "src/components", folder, "index.ts");
    if (!fs.existsSync(index)) continue;
    const text = fs.readFileSync(index, "utf8");
    for (const match of text.matchAll(/\b([A-Z][A-Za-z0-9]*)\b/g)) if (!out.has(match[1])) out.set(match[1], folder);
  }
  return out;
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, "src/platform/code-languages.generated.json"), "utf8")).components;
const folderOf = exportsByFolder();
const names = Object.keys(manifest);
const statelessNames = names.filter((name) => STATELESS.includes(folderOf.get(name)));
const FREEZE_CSS = "*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; transition-duration: 0s !important; transition-delay: 0s !important; caret-color: transparent !important; }";

async function main() {
  const dist = path.join(root, "dist");
  if (!fs.existsSync(path.join(dist, "styles.css"))) { console.error("✗ dist/styles.css is missing: run npm run build:lib first."); process.exit(2); }
  const out = path.resolve(opt("out", path.join(root, ".qa/html-parity")));
  fs.rmSync(out, { recursive: true, force: true });
  const pageIds = opt("pages") ? String(opt("pages")).split(",").filter(Boolean) : [...new Set(statelessNames.map((name) => manifest[name].slug))];
  const { toolServer } = await import(new URL("../qa/isolated-server.mjs", import.meta.url).href);
  const server = await toolServer(root, { url: opt("url"), isolated: flag("isolated"), tool: "html-parity" });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1512, height: 1000 }, reducedMotion: "reduce" });
  const panels = [];
  const problems = [];
  try {
    for (const id of pageIds) {
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${server.base}/?page=${id}&ui=classic`, { waitUntil: "load" });
      await page.addStyleTag({ content: FREEZE_CSS });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(600);
      const count = await page.locator(".platform-component-preview").count();
      let taken = 0;
      for (let i = 0; i < count; i += 1) {
        const preview = page.locator(".platform-component-preview").nth(i);
        const row = preview.locator(".platform-example-row").first();
        if (!(await row.count()) || !(await row.isVisible())) continue;
        await row.scrollIntoViewIfNeeded();
        // The snippet as the Code view writes it, the React code beside it, and each specimen element's box: its
        // place on the page (sub-pixel included), its margin box and what shows behind it.
        const read = await preview.evaluate(async (element) => {
          const { htmlSnippet, isLibraryClass, modesAt, SNIPPET_SKIP } = await import("/src/platform/code/html.ts");
          const target = element.querySelector(".platform-example-row");
          const react = [...element.querySelectorAll(".platform-code .studio-code__text")].map((line) => line.textContent).join("\n");
          const behind = (node) => { for (let at = node; at; at = at.parentElement) { const color = getComputedStyle(at).backgroundColor; if (color && color !== "rgba(0, 0, 0, 0)" && color !== "transparent") return color; } return "white"; };
          // Docs chrome inside the specimen is not in the snippet: it leaves the React side first.
          for (const chrome of target.querySelectorAll(`[${SNIPPET_SKIP}]`)) chrome.style.display = "none";
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const roots = [...target.children].filter((child) => !child.hasAttribute(SNIPPET_SKIP));
          const boxes = roots.map((child) => {
            const rect = child.getBoundingClientRect();
            const style = getComputedStyle(child);
            const margin = ["top", "right", "bottom", "left"].map((side) => Number.parseFloat(style.getPropertyValue(`margin-${side}`)) || 0);
            return { left: rect.left + window.scrollX - margin[3], top: rect.top + window.scrollY - margin[0], width: rect.width + margin[1] + margin[3], height: rect.height + margin[0] + margin[2], border: [rect.width, rect.height], background: behind(target) };
          });
          // The snippet before the harness touches the page (sizes, markers).
          const snippet = htmlSnippet(target, { markupOnly: false });
          // Then the docs' decoration of the specimen (a "current size" outline) leaves too: the snippet has only the
          // library's classes. Each root keeps its measured size, so the row does not lay its elements out again.
          roots.forEach((child, index) => Object.assign(child.style, { width: `${boxes[index].border[0]}px`, height: `${boxes[index].border[1]}px`, boxSizing: "border-box", flex: "none" }));
          for (const node of target.querySelectorAll("[class]")) for (const token of [...node.classList]) if (!isLibraryClass(token)) node.classList.remove(token);
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          roots.forEach((child, index) => child.setAttribute("data-parity-root", String(index)));
          // The text the specimen inherits (the docs set text-rendering, the app's reset another): the plain page
          // takes the same, so only the snippet is compared, not the two pages' base styles.
          const inherited = ["color", "font-family", "font-size", "font-weight", "font-style", "line-height", "letter-spacing", "word-spacing", "text-rendering", "-webkit-font-smoothing", "font-feature-settings", "font-variation-settings", "font-optical-sizing", "font-kerning", "font-synthesis", "text-transform", "direction"];
          const base = getComputedStyle(target.parentElement ?? target);
          return { snippet, modes: modesAt(target), react, boxes, inherit: inherited.map((key) => [key, base.getPropertyValue(key)]) };
        });
        const stem = `${id}/${String(i).padStart(2, "0")}`;
        for (const side of ["react", "html"]) fs.mkdirSync(path.join(out, side, id), { recursive: true });
        // An element with no box (a live region, a hidden input) draws nothing to compare.
        const drawn = read.boxes.map((box) => box.width > 0 && box.height > 0);
        for (let k = 0; k < read.boxes.length; k += 1) {
          if (!drawn[k]) continue;
          const root = preview.locator(`[data-parity-root="${k}"]`);
          await root.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
          await root.screenshot({ path: path.join(out, "react", `${stem}-${k}.png`), animations: "disabled", caret: "hide", timeout: 10000 }).catch((error) => errors.push(`${stem}-${k} (React): ${error.message.split("\n")[0]}`));
        }
        // The snippet pasted as it is (its stylesheet links pointed at dist/); each top-level element then sits in a
        // box at its React place and size, so the docs' layout around it plays no part.
        const pasted = read.snippet.replaceAll("/node_modules/@zen-ds/react/dist/", `${pathToFileURL(dist).href}/`);
        const modes = read.modes.map(([key, value]) => `${key}="${value}"`).join(" ");
        const plain = `<!doctype html>\n<html lang="en" ${modes}>\n<head>\n<meta charset="utf-8">\n<style>body { margin: 0; min-height: 100vh; } .parity-box { position: absolute; display: grid; }</style>\n</head>\n<body>\n<div class="parity-host">\n${pasted}\n</div>\n</body>\n</html>\n`;
        const file = path.join(out, "pages", `${id}-${String(i).padStart(2, "0")}.html`);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, plain);
        const plainPage = await context.newPage();
        await plainPage.goto(pathToFileURL(file).href, { waitUntil: "load" });
        await plainPage.addStyleTag({ content: FREEZE_CSS });
        const placed = await plainPage.evaluate(({ boxes, inherit }) => {
          for (const [key, value] of inherit) if (value) document.documentElement.style.setProperty(key, value);
          const host = document.querySelector(".parity-host");
          const roots = [...host.children].filter((child) => child.localName !== "link");
          document.body.style.height = `${Math.max(...boxes.map((box) => box.top + box.height)) + 100}px`;
          // A box's last pixel column or row is part background when its size is fractional: the same one as the docs'.
          for (const node of [document.documentElement, document.body]) node.style.background = boxes[0]?.background ?? "white";
          roots.forEach((child, index) => {
            const box = document.createElement("div");
            box.className = "parity-box";
            const at = boxes[index] ?? boxes[0];
            Object.assign(box.style, { left: `${at.left}px`, top: `${at.top}px`, width: `${at.width}px`, height: `${at.height}px`, background: at.background });
            child.replaceWith(box);
            box.append(child);
            child.setAttribute("data-parity-root", String(index));
          });
          return roots.length;
        }, { boxes: read.boxes, inherit: read.inherit });
        await plainPage.evaluate(() => document.fonts.ready);
        for (let k = 0; k < Math.min(placed, read.boxes.length); k += 1) {
          if (!drawn[k]) continue;
          const root = plainPage.locator(`[data-parity-root="${k}"]`);
          await root.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
          await root.screenshot({ path: path.join(out, "html", `${stem}-${k}.png`), animations: "disabled", caret: "hide", timeout: 10000 }).catch((error) => errors.push(`${stem}-${k} (HTML): ${error.message.split("\n")[0]}`));
        }
        await plainPage.close();
        if (placed !== read.boxes.length) errors.push(`${stem}: the snippet has ${placed} top-level element(s), the specimen ${read.boxes.length}`);
        const used = [...new Set([...read.react.matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map((match) => match[1]).filter((tag) => manifest[tag]))];
        for (let k = 0; k < read.boxes.length; k += 1) if (drawn[k]) panels.push({ id, index: i, name: `${stem}-${k}.png`, components: used });
        taken += 1;
      }
      console.log(`${errors.length ? "✗" : "·"} ${id}: ${taken} panel(s)${errors.length ? `  ${errors.slice(0, 2).join(" | ")}` : ""}`);
      problems.push(...errors.map((error) => `${id}: ${error}`));
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  // The comparison itself is visual-diff's: identical PNGs, or a pixel count and the sheets. A channel one level off
  // does not count: two documents round an anti-aliased edge over a different compositing path (AvatarStack's last
  // avatar, 2026-11-13); a real difference (colour, size, place) is many levels.
  const compare = spawnSync(process.execPath, [path.join(root, "tools/platform-audit/visual-diff.mjs"), "compare", path.join(out, "react"), path.join(out, "html"), `--sheets=${path.join(out, "sheets")}`, "--tolerance=1"], { encoding: "utf8" });
  process.stdout.write(compare.stdout);
  const changed = new Set([...compare.stdout.matchAll(/^✗ (?:changed|missing)\s+(\S+)/gm)].map((match) => match[1]));
  for (const panel of panels) panel.match = !changed.has(panel.name);
  const failing = panels.filter((panel) => !panel.match);
  if (problems.length) console.log(`\n✗ ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
  console.log(`\nHTML parity: ${panels.length - failing.length}/${panels.length} panels match React${failing.length ? ` · sheets in ${path.relative(root, path.join(out, "sheets"))}` : ""}`);

  if (flag("write") && opt("pages")) { console.error("✗ --write needs every stateless page: leave out --pages."); process.exit(2); }
  if (flag("write")) {
    const seen = new Map();
    for (const panel of panels) for (const name of panel.components) seen.set(name, (seen.get(name) ?? true) && panel.match);
    const ready = statelessNames.filter((name) => seen.get(name) === true).sort();
    const markup = names.filter((name) => !ready.includes(name) && !OVERLAYS.includes(folderOf.get(name))).sort();
    const status = { $comment: "Written by tools/code-languages/html-parity.mjs --write: the Code view's HTML status (ready: stateless and every specimen matches React in a plain page with dist/styles.css; markup: static markup, behaviour needs JavaScript; overlays are left out). npm run guidelines:build reads it.", ready, markup };
    fs.writeFileSync(path.join(root, "tools/code-languages/html.json"), `${JSON.stringify(status, null, 2)}\n`);
    console.log(`Wrote tools/code-languages/html.json: ${ready.length} ready, ${markup.length} markup only. Run npm run guidelines:build.`);
  }
  process.exit(failing.length || problems.length ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) await main();

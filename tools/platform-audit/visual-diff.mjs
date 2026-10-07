#!/usr/bin/env node
/**
 * Visual regression for the Codebase Platform (Playwright): screenshots every playground panel and example card of every
 * page, then compares two captures pixel by pixel. Run it around refactors that must not change the UI — API renames,
 * attribute renames, default fixes — and look at the sheets it writes for every changed card.
 *
 *   node tools/platform-audit/visual-diff.mjs capture <dir> [--url=http://localhost:5173] [--pages=a,b] [--widths=1512,390] [--dark]
 *   node tools/platform-audit/visual-diff.mjs compare <before-dir> <after-dir> [--sheets=<dir>] [--tolerance=0]
 *
 * capture: animations and transitions are frozen (reduced motion + an injected stylesheet), videos are paused at 0 and
 *          fonts/images are awaited, so two captures of an unchanged page are byte-identical.
 * compare: byte-equal files are equal; otherwise both PNGs are decoded in the browser and compared per pixel (a channel
 *          difference above --tolerance counts). Exit 1 when a card changed, disappeared or changed size.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");

const argv = process.argv.slice(2);
const opt = (name, fallback) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const flag = (name) => argv.includes(`--${name}`);
const [command, ...positional] = argv.filter((a) => !a.startsWith("--"));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 60) || "card";
const sha = (buffer) => crypto.createHash("sha1").update(buffer).digest("hex");

/** Same page list as audit.mjs: fixed pages, componentNavigation and the app-layer pages. */
function allPages() {
  const src = fs.readFileSync(path.join(root, "src/platform/PlatformApp.tsx"), "utf8");
  const nav = src.slice(src.indexOf("const componentNavigation"), src.indexOf("];", src.indexOf("const componentNavigation")));
  const ids = [...nav.matchAll(/id:\s*"([\w-]+)"/g)].map((m) => m[1]);
  const typesFile = path.join(root, "src/platform/appLayer/types.ts");
  const appLayer = fs.existsSync(typesFile) ? fs.readFileSync(typesFile, "utf8").match(/appLayerPageIds\s*=\s*\[([^\]]*)\]/)?.[1] ?? "" : "";
  const layerIds = [...appLayer.matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
  return ["overviews", "installation", "design-tokens", "typography", "iconography", ...[...new Set([...ids, ...layerIds])].sort()];
}

const FREEZE_CSS = `*, *::before, *::after { animation-duration: 0s !important; animation-delay: 0s !important; animation-iteration-count: 1 !important;
  transition-duration: 0s !important; transition-delay: 0s !important; caret-color: transparent !important; }`;

async function capture(dir) {
  const base = String(opt("url", "http://localhost:5173")).replace(/\/$/, "");
  const pages = opt("pages") ? String(opt("pages")).split(",") : allPages();
  const widths = String(opt("widths", "1512,390")).split(",").map(Number);
  const dark = flag("dark");
  fs.mkdirSync(dir, { recursive: true });
  const manifest = { url: base, dark, widths, taken: new Date().toISOString(), cards: {} };
  const browser = await chromium.launch();
  let total = 0;
  try {
    for (const width of widths) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, colorScheme: dark ? "dark" : "light", reducedMotion: "reduce" });
      for (const id of pages) {
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        try {
          await page.goto(`${base}/?page=${id}`, { waitUntil: "load" });
          await page.addStyleTag({ content: FREEZE_CSS });
          await page.waitForTimeout(700);
          if (dark) { await page.getByRole("button", { name: "Dark mode" }).first().click().catch(() => undefined); await page.waitForTimeout(250); }
          await page.evaluate(async () => {
            document.querySelectorAll("video").forEach((v) => { v.pause(); v.currentTime = 0; });
            // Off-screen loading="lazy" images never load on their own; make them eager and cap the wait.
            document.querySelectorAll("img[loading='lazy']").forEach((img) => { img.loading = "eager"; });
            const settle = Promise.all([document.fonts.ready, ...[...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.addEventListener("load", r, { once: true }); img.addEventListener("error", r, { once: true }); })))]);
            await Promise.race([settle, new Promise((r) => setTimeout(r, 4000))]);
          });
          const targets = page.locator(".platform-example-panel, .pe-card, .platform-example");
          const count = await targets.count();
          const seen = new Map();
          for (let i = 0; i < count; i += 1) {
            const target = targets.nth(i);
            if (!(await target.isVisible())) continue;
            const heading = (await target.locator("h2, h3, h4").first().textContent({ timeout: 200 }).catch(() => null)) ?? (i === 0 ? "playground" : `panel-${i}`);
            let name = slug(heading);
            seen.set(name, (seen.get(name) ?? 0) + 1);
            if (seen.get(name) > 1) name = `${name}-${seen.get(name)}`;
            const rel = path.join(id, `${width}${dark ? "-dark" : ""}`, `${String(i).padStart(2, "0")}-${name}.png`);
            fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
            try {
              await target.scrollIntoViewIfNeeded({ timeout: 5000 });
              await target.screenshot({ path: path.join(dir, rel), animations: "disabled", caret: "hide", timeout: 15000 });
              manifest.cards[rel] = { page: id, width, title: heading.trim() };
              total += 1;
            } catch (error) {
              errors.push(`${rel}: ${error.message.split("\n")[0]}`);
            }
          }
          console.log(`${errors.length ? "✗" : "✓"} ${id}@${width}${dark ? "-dark" : ""}  ${count} panels${errors.length ? `  page errors: ${errors.slice(0, 2).join(" | ")}` : ""}`);
        } catch (error) {
          console.log(`✗ ${id}@${width}  ${error.message.split("\n")[0]}`);
        } finally {
          await page.close();
        }
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`\nCaptured ${total} panels into ${dir}`);
}

function listPngs(dir) {
  const out = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith(".png")) out.push(path.relative(dir, p)); } };
  walk(dir);
  return out.sort();
}

async function compare(before, after) {
  const tolerance = Number(opt("tolerance", 0));
  const sheets = opt("sheets") ? path.resolve(opt("sheets")) : null;
  const a = new Set(listPngs(before));
  const b = new Set(listPngs(after));
  const result = { same: 0, changed: [], missing: [...a].filter((f) => !b.has(f)), added: [...b].filter((f) => !a.has(f)) };
  const candidates = [...a].filter((f) => b.has(f));
  const differing = [];
  for (const file of candidates) {
    const x = fs.readFileSync(path.join(before, file));
    const y = fs.readFileSync(path.join(after, file));
    if (sha(x) === sha(y)) result.same += 1; else differing.push(file);
  }
  if (differing.length) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    await page.setContent("<canvas></canvas>");
    for (const file of differing) {
      const toUrl = (dir) => `data:image/png;base64,${fs.readFileSync(path.join(dir, file)).toString("base64")}`;
      const diff = await page.evaluate(async ({ left, right, tolerance }) => {
        const load = (src) => new Promise((resolve) => { const img = new Image(); img.onload = () => resolve(img); img.src = src; });
        const [p, q] = await Promise.all([load(left), load(right)]);
        if (p.width !== q.width || p.height !== q.height) return { size: [`${p.width}×${p.height}`, `${q.width}×${q.height}`] };
        const read = (img) => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); return g.getImageData(0, 0, img.width, img.height).data; };
        const da = read(p); const db = read(q);
        let pixels = 0; let x0 = Infinity; let y0 = Infinity; let x1 = -1; let y1 = -1;
        for (let i = 0; i < da.length; i += 4) {
          if (Math.abs(da[i] - db[i]) > tolerance || Math.abs(da[i + 1] - db[i + 1]) > tolerance || Math.abs(da[i + 2] - db[i + 2]) > tolerance || Math.abs(da[i + 3] - db[i + 3]) > tolerance) {
            pixels += 1; const n = i / 4; const x = n % p.width; const y = Math.floor(n / p.width);
            x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
          }
        }
        return { pixels, box: pixels ? [x0, y0, x1, y1] : null, total: p.width * p.height };
      }, { left: toUrl(before), right: toUrl(after), tolerance });
      if (!diff.size && diff.pixels === 0) { result.same += 1; continue; }
      result.changed.push({ file, ...diff });
      if (sheets) {
        const out = path.join(sheets, file.replace(/[\\/]/g, "__"));
        fs.mkdirSync(path.dirname(out), { recursive: true });
        const sheet = await browser.newPage({ viewport: { width: 1800, height: 800 } });
        await sheet.setContent(`<body style="margin:0;background:#ddd;font:600 13px system-ui"><div style="display:flex;gap:12px;padding:12px;align-items:flex-start;width:max-content">
          <figure style="margin:0"><figcaption>before</figcaption><img style="display:block;max-width:860px;border:1px solid #bbb" src="${toUrl(before)}"></figure>
          <figure style="margin:0"><figcaption>after</figcaption><img style="display:block;max-width:860px;border:1px solid #bbb" src="${toUrl(after)}"></figure></div></body>`);
        await sheet.locator("body > div").screenshot({ path: out });
        await sheet.close();
      }
    }
    await browser.close();
  }
  for (const c of result.changed) console.log(`✗ changed  ${c.file}  ${c.size ? `size ${c.size.join(" → ")}` : `${c.pixels} px (${((c.pixels / c.total) * 100).toFixed(2)}%) in box ${c.box.join(",")}`}`);
  for (const f of result.missing) console.log(`✗ missing  ${f}`);
  for (const f of result.added) console.log(`+ new      ${f}`);
  console.log(`\n${result.same} identical · ${result.changed.length} changed · ${result.missing.length} missing · ${result.added.length} new${sheets && result.changed.length ? ` · sheets in ${sheets}` : ""}`);
  process.exit(result.changed.length || result.missing.length ? 1 : 0);
}

if (command === "capture" && positional[0]) await capture(path.resolve(positional[0]));
else if (command === "compare" && positional.length === 2) await compare(path.resolve(positional[0]), path.resolve(positional[1]));
else {
  console.error("usage: visual-diff.mjs capture <dir> [--url=…] [--pages=a,b] [--widths=1512,390] [--dark]\n       visual-diff.mjs compare <before> <after> [--sheets=<dir>] [--tolerance=0]");
  process.exit(2);
}

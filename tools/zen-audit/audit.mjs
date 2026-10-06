// `npx zen-ds audit <url> [more urls…]` — the docs platform's rendered-page checks, for your app. The static checks
// (`zen-ds check`, `zen-usage`) read the code; this loads each page in Chromium and checks what people see:
//
//   app checks      overflow, broken images, accessible names, nested controls, surfaces (§11), duplicate ids, phone
//                   pointer targets, text contrast, the heading outline (tools/zen-audit/app-checks.mjs)
//   Zen quality     text that is no Zen text style, colours/spacing/radii off the token scale, content hierarchy, rhythm
//                   and the spacing ladder (tools/platform-audit/quality-checks.mjs on the whole page), text wider than
//                   its box (fit)
//   axe-core        WCAG rules, when `axe-core` is installed in the app (npm i -D axe-core)
//   screenshots     full page at each width, light (and dark with --dark) in the output folder
//
// Options: --routes=/,/settings (paths added to each url) · --viewports=1440,390 · --dark · --out=.zen-audit
//          --wait=600 (ms after load) · --json (print the report as JSON) · --strict (warnings fail too)
//          --wcag-contrast (also run axe's 4.5:1 color-contrast rule; off by default — the Zen check warns under 3:1)
// Needs Playwright in the app: npm i -D playwright && npx playwright install chromium. Exit 1 when an error is found.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(here, "../..");

const ERRORS = new Set(["console", "overflow", "images", "names", "nesting", "surfaces", "scale", "hierarchy", "fit", "axe-serious"]);
const KINDS_HELP = {
  console: "a page error or console error while loading",
  overflow: "the page scrolls sideways, or something runs past the window",
  images: "an image did not load",
  names: "a control screen readers cannot name — add a label / aria-label",
  nesting: "an interactive element inside another",
  surfaces: "a Surface box on a Canvas/Alt page with no border (same colour)",
  scale: "text, colour, spacing or radius off the Zen tokens",
  hierarchy: "content hierarchy (h1 is Heading/1, headings not smaller than their body)",
  fit: "text wider than its box (no ellipsis, no wrap)",
  "axe-serious": "axe-core: serious or critical",
  "axe-minor": "axe-core: moderate or minor",
  ids: "duplicate ids",
  targets: "pointer targets under 24×24 on a phone",
  contrast: "text under 3:1 on its background",
  outline: "heading outline (one h1, starts at it, no skipped level)",
  roles: "a token used in the wrong role (a background token on text…)",
  rhythm: "rhythm (flat title/body pairs, too many text styles, nested corners)",
  ladder: "a gap off the spacing ladder for its relationship",
};

function resolveFrom(dirs, name) {
  for (const dir of dirs) {
    try { return createRequire(path.join(dir, "package.json")).resolve(name); } catch { /* not there */ }
  }
  return null;
}

const slug = (s) => s.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 80) || "page";

export async function audit(argv = []) {
  const opt = (name, fallback) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
  const flag = (name) => argv.includes(`--${name}`);
  const urls = argv.filter((a) => !a.startsWith("--"));
  if (!urls.length) {
    console.log("usage: zen-ds audit <url> [more urls…] [--routes=/,/settings] [--viewports=1440,390] [--dark] [--out=.zen-audit] [--wait=600] [--json] [--strict]");
    return 2;
  }
  const app = process.cwd();
  const pw = resolveFrom([app, pkgRoot], "playwright");
  if (!pw) {
    console.log("zen-ds audit needs Playwright in your app:\n  npm i -D playwright\n  npx playwright install chromium");
    return 2;
  }
  const { chromium } = await import(pathToFileURL(pw).href).then((m) => m.default ?? m);
  const axePath = resolveFrom([app, pkgRoot], "axe-core");
  const axeSource = axePath ? fs.readFileSync(path.join(path.dirname(axePath), "axe.min.js"), "utf8") : null;
  const { appChecks } = await import(pathToFileURL(path.join(here, "app-checks.mjs")).href);
  const { qualityChecks, textFit } = await import(pathToFileURL(path.join(pkgRoot, "tools/platform-audit/quality-checks.mjs")).href);

  const routes = (opt("routes", "") || "").split(",").map((r) => r.trim()).filter(Boolean);
  const targets = routes.length ? urls.flatMap((u) => routes.map((r) => new URL(r, u.endsWith("/") ? u : `${u}/`).href)) : urls;
  const widths = opt("viewports", "1440,390").split(",").map(Number).filter(Boolean);
  const themes = flag("dark") ? ["light", "dark"] : ["light"];
  const out = path.resolve(app, opt("out", ".zen-audit"));
  const wait = Number(opt("wait", "600"));
  fs.mkdirSync(out, { recursive: true });

  const browser = await chromium.launch();
  const report = { started: new Date().toISOString(), axe: Boolean(axeSource), pages: [] };
  try {
    for (const url of targets) for (const width of widths) for (const theme of themes) {
      const context = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, colorScheme: theme, isMobile: width < 600, hasTouch: width < 600 });
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("pageerror", (e) => consoleErrors.push(e.message.split("\n")[0]));
      page.on("console", (m) => { if (m.type() === "error" && !/favicon|DevTools|\[vite\]|ResizeObserver loop/i.test(m.text())) consoleErrors.push(m.text().split("\n")[0].slice(0, 200)); });
      const entry = { url, width, theme, findings: {} };
      const add = (kind, items) => { if (items?.length) entry.findings[kind] = [...(entry.findings[kind] ?? []), ...items]; };
      const run = async () => {
        entry.findings = {};
        await page.waitForTimeout(wait);
        add("console", [...new Set(consoleErrors)]);
        for (const [kind, items] of Object.entries(await page.evaluate(appChecks, { mobile: width < 600 }))) add(kind, items);
        const quality = await page.evaluate(qualityChecks, { regionSel: "body" }).catch((e) => ({ scale: [`quality checks crashed: ${e.message.split("\n")[0]}`] }));
        for (const [kind, items] of Object.entries(quality)) add(kind, items);
        add("fit", (await page.evaluate(textFit, { regionSel: "body" }).catch(() => ({ fit: [] }))).fit);
        if (axeSource) {
          await page.addScriptTag({ content: axeSource });
          const rules = flag("wcag-contrast") ? {} : { "color-contrast": { enabled: false } };
          const violations = await page.evaluate(async (rules) => (await window.axe.run(document, { resultTypes: ["violations"], rules })).violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, target: v.nodes[0]?.target?.join(" ") })), rules);
          add("axe-serious", violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id} (${v.impact}, ${v.nodes}×): ${v.help} — ${v.target ?? ""}`));
          add("axe-minor", violations.filter((v) => !["serious", "critical"].includes(v.impact)).map((v) => `${v.id} (${v.impact}, ${v.nodes}×): ${v.help} — ${v.target ?? ""}`));
        }
        const shot = path.join(out, `${slug(url)}-${width}${theme === "dark" ? "-dark" : ""}.png`);
        await page.screenshot({ path: shot, fullPage: true });
        entry.screenshot = path.relative(app, shot);
      };
      try {
        await page.goto(url, { waitUntil: "load", timeout: 45000 });
        // A dev server's hot reload can replace the page mid-check: wait for the new one and check it once more.
        await run().catch(async (error) => {
          if (!/Execution context was destroyed|navigation/i.test(error.message)) throw error;
          await page.waitForLoadState("load", { timeout: 45000 });
          consoleErrors.length = 0;
          await run();
        });
      } catch (error) {
        add("console", [`could not load: ${error.message.split("\n")[0]}`]);
      }
      report.pages.push(entry);
      await context.close();
    }
  } finally {
    await browser.close();
  }

  // Report: console summary, report.json and report.md in the output folder.
  const errorCount = report.pages.reduce((n, p) => n + Object.entries(p.findings).filter(([k]) => ERRORS.has(k)).reduce((m, [, v]) => m + v.length, 0), 0);
  const warnCount = report.pages.reduce((n, p) => n + Object.entries(p.findings).filter(([k]) => !ERRORS.has(k)).reduce((m, [, v]) => m + v.length, 0), 0);
  report.errors = errorCount;
  report.warnings = warnCount;
  fs.writeFileSync(path.join(out, "report.json"), JSON.stringify(report, null, 2));
  const lines = [`# Zen audit — ${report.started}`, "", `${errorCount} error(s), ${warnCount} warning(s)${report.axe ? "" : " · axe-core not installed (npm i -D axe-core for WCAG rules)"}`, ""];
  for (const p of report.pages) {
    lines.push(`## ${p.url} · ${p.width}px · ${p.theme}`, "", p.screenshot ? `Screenshot: ${p.screenshot}` : "", "");
    const kinds = Object.entries(p.findings);
    if (!kinds.length) lines.push("✓ nothing found", "");
    for (const [kind, items] of kinds) {
      lines.push(`- ${ERRORS.has(kind) ? "✗" : "⚠"} **${kind}** — ${KINDS_HELP[kind] ?? ""}`);
      for (const item of items.slice(0, 20)) lines.push(`  - ${item}`);
      if (items.length > 20) lines.push(`  - … ${items.length - 20} more (report.json)`);
    }
    lines.push("");
  }
  fs.writeFileSync(path.join(out, "report.md"), lines.join("\n"));
  if (flag("json")) console.log(JSON.stringify(report, null, 2));
  else {
    for (const p of report.pages) {
      const kinds = Object.entries(p.findings);
      console.log(`\n${p.url} · ${p.width}px · ${p.theme}${kinds.length ? "" : " — ✓ nothing found"}`);
      for (const [kind, items] of kinds) {
        console.log(`  ${ERRORS.has(kind) ? "✗" : "⚠"} ${kind} (${items.length}) — ${KINDS_HELP[kind] ?? ""}`);
        for (const item of items.slice(0, 5)) console.log(`      ${item}`);
        if (items.length > 5) console.log(`      … ${items.length - 5} more`);
      }
    }
    console.log(`\n${errorCount ? "✗" : "✓"} ${errorCount} error(s), ${warnCount} warning(s)${report.axe ? "" : " · axe-core not installed: npm i -D axe-core adds the WCAG rules"}. Report and screenshots: ${path.relative(app, out) || "."}/`);
  }
  return errorCount || (flag("strict") && warnCount) ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) audit(process.argv.slice(2)).then((code) => process.exit(code));

#!/usr/bin/env node
/**
 * Visual pass for the Codebase Platform (Playwright): screenshots example cards so a person or an agent can look at every
 * example instead of trusting the DOM checks alone (audit.mjs finds overflow and a11y issues, not a squashed button).
 *
 *   node tools/platform-audit/shoot.mjs <page> [--title="Card title"] [--click="Button name"]… [--width=1512] [--dark] [--out=dir]
 *     one card:   --title picks the example card by its heading; each --click presses a button inside it first (e.g. open a sheet)
 *     whole page: without --title every example card is shot, plus a contact sheet (all cards side by side) → <page>-<width>.png
 *   node tools/platform-audit/shoot.mjs --compose=out.png "Label=a.png" "Label=b.png"   side-by-side sheet (e.g. Figma vs platform)
 *
 * Prints each file and "ok" or the console errors the page raised. See docs/qa/platform-audit.md (visual pass).
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const require = createRequire(path.join(root, "package.json"));
const { chromium } = require("playwright");

const argv = process.argv.slice(2);
const opt = (name) => argv.filter((a) => a.startsWith(`--${name}=`)).map((a) => a.slice(name.length + 3));
const flag = (name) => argv.includes(`--${name}`);
const positional = argv.filter((a) => !a.startsWith("--"));
const BASE = (opt("url")[0] ?? "http://localhost:5173").replace(/\/$/, "");
const WIDTH = Number(opt("width")[0] ?? 1512);
const OUT = path.resolve(opt("out")[0] ?? path.join(root, ".platform-shots"));
const slug = (s) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
fs.mkdirSync(OUT, { recursive: true });

async function compose(browser, out, pairs) {
  const cells = pairs.map(([label, file]) => `<figure><figcaption>${label}</figcaption><img src="data:image/png;base64,${fs.readFileSync(file).toString("base64")}"></figure>`).join("");
  const page = await browser.newPage({ viewport: { width: 1800, height: 800 } });
  await page.setContent(`<body style="margin:0;background:#ddd;font:600 13px system-ui"><div style="display:flex;flex-wrap:wrap;gap:12px;padding:12px;align-items:flex-start;width:1776px">${cells}</div><style>figure{margin:0}figcaption{padding:0 0 6px}img{display:block;max-width:420px;border:1px solid #bbb}</style></body>`);
  await page.locator("body > div").screenshot({ path: out });
  await page.close();
}

const browser = await chromium.launch();
try {
  const composeOut = opt("compose")[0];
  if (composeOut) {
    await compose(browser, path.resolve(composeOut), positional.map((p) => { const i = p.lastIndexOf("="); return [p.slice(0, i), p.slice(i + 1)]; }));
    console.log(path.resolve(composeOut));
  } else {
    const [pageId] = positional;
    if (!pageId) { console.error("usage: shoot.mjs <page> [--title=…] [--click=…] [--width=1512] [--dark]"); process.exit(2); }
    const context = await browser.newContext({ viewport: { width: WIDTH, height: 1000 }, colorScheme: flag("dark") ? "dark" : "light" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => { if (m.type() === "error" && !/\[vite\]|hmr/i.test(m.text())) errors.push(m.text()); });
    await page.goto(`${BASE}/?page=${pageId}`);
    await page.waitForTimeout(900);
    // A card taller than the viewport is captured while scrolling, so the sticky platform chrome (topbar, sidebar, TOC)
    // would be stamped over the middle of it. Pin that chrome in place; example content keeps its own sticky elements.
    await page.addStyleTag({ content: ".official-topbar, .official-sidebar, .platform-toc { position: static !important; }" }).catch(() => undefined);
    // The platform has its own theme toggle (prefers-color-scheme alone does not switch it), same as audit.mjs.
    if (flag("dark")) { await page.getByRole("button", { name: "Dark mode" }).first().click().catch(() => undefined); await page.waitForTimeout(300); }
    const cards = page.locator(".pe-card, .platform-example");
    const [title] = opt("title");
    const targets = title
      ? [cards.filter({ has: page.getByRole("heading", { name: title, exact: true }) }).first()]
      : await cards.all();
    const shots = [];
    for (const [index, card] of targets.entries()) {
      await card.scrollIntoViewIfNeeded();
      for (const name of opt("click")) { await card.getByRole("button", { name, exact: true }).first().click(); await page.waitForTimeout(700); }
      const heading = title ?? ((await card.getByRole("heading").first().textContent().catch(() => null)) || `card-${index + 1}`);
      const file = path.join(OUT, `${pageId}-${slug(heading)}${opt("click").length ? `-${slug(opt("click").join("-"))}` : ""}-${WIDTH}${flag("dark") ? "-dark" : ""}.png`);
      await card.screenshot({ path: file });
      shots.push([heading, file]);
      console.log(file);
    }
    if (!title && shots.length) {
      const sheet = path.join(OUT, `${pageId}-${WIDTH}${flag("dark") ? "-dark" : ""}.png`);
      await compose(browser, sheet, shots);
      console.log(`sheet → ${sheet}`);
    }
    console.log(errors.length ? `ERRORS ${errors.join(" | ")}` : "ok");
    await context.close();
  }
} finally {
  await browser.close();
}

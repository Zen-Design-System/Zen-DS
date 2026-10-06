#!/usr/bin/env node
// Zen Studio on a production build, without the dev server (Studio builder GĐ2 M4, spec
// docs/research/studio-builder-pages-spec-2026-10-06.md §5 M4, §7): builds the docs platform with Vite (manifest on, in
// node_modules/.cache/zen-studio/build-check/dist), serves it with `vite preview` (no Studio plugin, no /__zen-studio
// API) and drives the Studio in Chromium through a builder page's whole life: make it, insert and edit, undo, reload,
// prototype and Play, then Link folder (the folder picker answers with an Origin Private File System folder, a real
// File System Access handle), Move to Trash and Restore through it, and a reload that reconnects the folder.
// It also measures the edit engine's lazy chunk (gzip) and checks that a component page never loads it.
//
//   npm run studio:build-check                 build, serve, drive, report (exit 1 when a step fails)
//   npm run studio:build-check -- --headed     watch it
//   npm run studio:build-check -- --strict-budget   also fail when the engine chunk is over its budget
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";
import { launchBrowser, openStudio, showLeftTab, sleep, until } from "./lib/studio.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const outDir = path.join(root, "node_modules/.cache/zen-studio/build-check/dist");
const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
/** The engine chunk's budget (gzip KB), from the spec. Over it is a warning unless --strict-budget. */
const ENGINE_BUDGET_KB = 130;
const FOLDER = "linked-pages";

const steps = [];
const failures = [];
async function step(name, fn) {
  const t0 = Date.now();
  try {
    const evidence = await fn();
    steps.push({ name, ok: true, ms: Date.now() - t0, evidence });
    console.log(`  ✓ ${name}${evidence ? `  · ${evidence}` : ""}`);
    return true;
  } catch (error) {
    const message = String(error?.message ?? error).split("\n")[0];
    steps.push({ name, ok: false, ms: Date.now() - t0, evidence: message });
    failures.push(name);
    console.log(`  ✗ ${name}  · ${message}`);
    return false;
  }
}

async function freePort(from, to) {
  for (let port = from; port <= to; port += 1) {
    const ok = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
    });
    if (ok) return port;
  }
  return null;
}

/* ── build and measure ─────────────────────────────────────────────────────────────────────────────────────────── */

console.log("Zen Studio build check");
const t0 = Date.now();
await build({ root, configFile: path.join(root, "vite.config.ts"), logLevel: "error", build: { outDir, emptyOutDir: true, manifest: true } });
console.log(`  built in ${Math.round((Date.now() - t0) / 1000)} s → ${path.relative(root, outDir)}`);

const manifest = JSON.parse(fs.readFileSync(path.join(outDir, ".vite/manifest.json"), "utf8"));
const keyOf = (part) => Object.keys(manifest).find((key) => key.includes(part));
const closure = (key, seen = new Set()) => {
  if (!key || seen.has(key)) return seen;
  seen.add(key);
  for (const next of manifest[key].imports ?? []) closure(next, seen);
  return seen;
};
const gzipKb = (file) => zlib.gzipSync(fs.readFileSync(path.join(outDir, file))).length / 1024;
const engineKey = keyOf("tools/studio/browser-engine.mjs");
const before = new Set([...closure(keyOf("index.html")), ...closure(keyOf("src/platform/studio/StudioApp.tsx"))]);
const engineChunks = [...closure(engineKey)].filter((key) => !before.has(key)).map((key) => manifest[key].file);
const engineKb = engineChunks.reduce((sum, file) => sum + gzipKb(file), 0);
const engineFile = engineKey ? manifest[engineKey].file : null;

await step(`engine chunk ≤ ${ENGINE_BUDGET_KB} KB gzip`, async () => {
  if (!engineFile) throw new Error("no chunk for tools/studio/browser-engine.mjs");
  const text = `${engineKb.toFixed(1)} KB gzip (${engineChunks.join(", ")})`;
  if (engineKb > ENGINE_BUDGET_KB) {
    if (has("strict-budget")) throw new Error(`${text}: over the budget`);
    return `⚠ ${text}: over the budget (a warning; --strict-budget fails)`;
  }
  return text;
});
await step("the parser loads with the engine only", async () => {
  const leaks = [...before].map((key) => manifest[key].file).filter((file) => file.endsWith(".js") && fs.readFileSync(path.join(outDir, file), "utf8").includes("This experimental syntax requires enabling"));
  if (leaks.length) throw new Error(`@babel/parser is in ${leaks.join(", ")}`);
  if (!fs.readFileSync(path.join(outDir, engineFile), "utf8").includes("This experimental syntax requires enabling")) throw new Error("the parser is not in the engine chunk");
  return "@babel/parser only in the engine chunk";
});

/* ── serve and drive ───────────────────────────────────────────────────────────────────────────────────────────── */

const port = await freePort(5290, 5299);
const server = await preview({ root, configFile: path.join(root, "vite.config.ts"), logLevel: "error", build: { outDir }, preview: { port, strictPort: true, host: "127.0.0.1", open: false } });
const url = `http://127.0.0.1:${port}`;
const browser = await launchBrowser({ headed: has("headed") });
console.log(`  serving ${url} (vite preview, no dev server)`);

/** The page's text as the browser keeps it (IndexedDB "zen-studio-builder"). */
const storedText = (page, id) => page.evaluate((key) => new Promise((resolve) => {
  const request = indexedDB.open("zen-studio-builder");
  request.onsuccess = () => {
    const get = request.result.transaction("pages").objectStore("pages").get(key);
    get.onsuccess = () => resolve(get.result?.text ?? null);
    get.onerror = () => resolve(null);
  };
  request.onerror = () => resolve(null);
}), id);

/** A file of the linked folder (OPFS), or the names in its trash/. */
const folderFile = (page, name) => page.evaluate(async ({ folder, name: file }) => {
  try {
    const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder);
    return await (await (await dir.getFileHandle(file)).getFile()).text();
  } catch {
    return null;
  }
}, { folder: FOLDER, name });
const folderTrash = (page) => page.evaluate(async (folder) => {
  try {
    const trash = await (await (await navigator.storage.getDirectory()).getDirectoryHandle(folder)).getDirectoryHandle("trash");
    const names = [];
    for await (const entry of trash.values()) names.push(entry.name);
    return names;
  } catch {
    return [];
  }
}, FOLDER);

const named = (page, id, name) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).first();
async function clickNamed(page, id, name) {
  const target = named(page, id, name);
  await target.waitFor({ state: "attached", timeout: 10_000 });
  const box = await target.boundingBox();
  if (!box) throw new Error(`<${name}> has no box`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(500);
}
async function pick(page, prop, label) {
  await page.locator(`#studio-right [data-prop="${prop}"] button`).first().click();
  await page.getByRole("option", { name: label, exact: typeof label === "string" }).click();
}
const inspectorTab = (page, name) => page.locator("#studio-right").getByRole("tab", { name }).click();
const storageLine = (page) => page.locator(".studio-pages__storage").innerText();

const reportDir = path.join(root, ".qa/studio-e2e");
fs.mkdirSync(reportDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
/** Play on the built Studio, as evidence for the report. */
const shot = path.join(reportDir, `build-check-${stamp}.png`);

let session = null;
try {
  session = await openStudio(browser, { url, page: "button", path: "/?ui=studio" });
  const { page, context, errors } = session;
  // Link folder… answers with an OPFS folder: a real FileSystemDirectoryHandle the browser keeps in IndexedDB.
  await context.addInitScript((folder) => {
    window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
  }, FOLDER);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-studio-frame="example:0"]', { timeout: 60_000 });
  const engineRequests = [];
  page.on("request", (request) => { if (engineFile && request.url().endsWith(engineFile.split("/").pop())) engineRequests.push(request.url()); });
  let id = null;
  const title = `Build check ${Date.now().toString(36)}`;

  await step("a component page opens without loading the engine", async () => {
    await sleep(1500);
    if (engineRequests.length) throw new Error(`requested ${engineRequests[0]}`);
    await showLeftTab(page, "pages");
    const where = await storageLine(page);
    if (!/In this browser/.test(where)) throw new Error(`storage line: ${where}`);
    return `no engine request; "${where}"`;
  });

  await step("New page opens a phone page (the engine loads now)", async () => {
    await page.getByRole("button", { name: "New page" }).click();
    const dialog = page.getByRole("dialog", { name: "New page" });
    await dialog.getByLabel("Title").fill(title);
    await dialog.getByRole("button", { name: "Phone" }).click();
    await dialog.getByRole("button", { name: "Create page" }).click();
    await until(async () => /page=local%3A|page=local:/.test(page.url()) && (await page.locator('[data-studio-frame^="screen:"]').count()) > 0, { timeout: 20_000, message: "the page on the canvas" });
    id = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
    await until(() => engineRequests.length > 0, { message: "the engine chunk requested" });
    return `${id} · engine loaded once (${engineRequests.length})`;
  });

  await step("insert a Button from Assets into the screen's Stack", async () => {
    await showLeftTab(page, "layers");
    const row = page.locator('[data-layer-id^="frame:screen:"]').first();
    await row.click();
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("Shift+Digit2");
    await sleep(400);
    await inspectorTab(page, "Design");
    await clickNamed(page, id, "Text");
    await page.keyboard.press("Escape");
    await until(async () => (await page.locator("#studio-right h2").first().innerText({ timeout: 1000 }).catch(() => "")).trim() === "Stack", { message: "the Stack selected" });
    await showLeftTab(page, "assets");
    await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill("Button");
    await page.locator(".studio-assets__row", { hasText: /^Button/ }).first().click();
    await until(async () => /<Button /.test((await storedText(page, id)) ?? ""), { timeout: 10_000, message: "<Button in the stored page" });
    await named(page, id, "Button").waitFor({ state: "attached", timeout: 10_000 });
    return "inserted and rendered";
  });

  await step("Inspector edit, then ⌘Z", async () => {
    await clickNamed(page, id, "Button");
    await pick(page, "level", "primary");
    await until(async () => /<Button level="primary"/.test((await storedText(page, id)) ?? ""), { message: 'level="primary"' });
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await until(async () => !/<Button level="primary"/.test((await storedText(page, id)) ?? ""), { message: "⌘Z undone" });
    return "level primary → undone";
  });

  await step("the page survives a reload", async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
    await named(page, id, "Button").waitFor({ state: "attached", timeout: 30_000 });
    return "Button rendered after the reload";
  });

  await step("Prototype: Add screen, Navigate to, Play", async () => {
    await inspectorTab(page, "Prototype");
    await page.getByRole("button", { name: "Add screen" }).click();
    await until(async () => /<Screen id="screen-2"/.test((await storedText(page, id)) ?? ""), { timeout: 10_000, message: "screen-2" });
    await page.locator('[data-studio-frame="screen:screen-2"]').waitFor({ state: "attached", timeout: 10_000 });
    await clickNamed(page, id, "Button");
    await pick(page, "proto:onClick", "Navigate to");
    await until(async () => /onClick=\{proto\.navigate\("screen-2"\)\}/.test((await storedText(page, id)) ?? ""), { message: "the navigate action" });
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("p");
    const player = page.locator(".studio-player");
    await player.waitFor({ state: "visible", timeout: 10_000 });
    await player.locator('[data-zen-name="Button"]').first().click();
    await until(async () => (await player.locator(".studio-player__device").getAttribute("data-screen-id")) === "screen-2", { message: "screen-2 in Play" });
    await page.screenshot({ path: shot }).catch(() => {});
    await page.keyboard.press("Escape");
    await until(async () => (await player.count()) === 0, { message: "Esc leaves Play" });
    return "navigate in Play, Esc";
  });

  await step("Link folder… keeps the page in the folder", async () => {
    await showLeftTab(page, "pages");
    await page.getByRole("button", { name: "My pages options" }).click();
    await page.getByRole("menuitem", { name: /^Link folder/ }).click();
    await until(async () => new RegExp(FOLDER).test(await storageLine(page)), { timeout: 10_000, message: "the storage line names the folder" });
    await until(async () => (await folderFile(page, `${id}.zen.tsx`)) === (await storedText(page, id)), { timeout: 10_000, message: "the folder's file equals the stored page" });
    return `"${await storageLine(page)}"`;
  });

  await step("Move to Trash and Restore through the folder", async () => {
    const row = page.locator('[data-section="mine"] .studio-pages__item').filter({ hasText: title });
    await row.hover();
    await row.getByRole("button", { name: `${title} actions` }).click();
    await page.getByRole("menuitem", { name: /^Move to Trash/ }).click();
    await until(async () => (await folderFile(page, `${id}.zen.tsx`)) === null, { message: "gone from the folder" });
    const trash = await folderTrash(page);
    if (!trash.some((name) => name.startsWith(`${id}-`))) throw new Error(`not in the folder's trash (${trash.join(", ")})`);
    await page.getByRole("button", { name: "My pages options" }).click();
    await page.getByRole("menuitem", { name: /^Trash/ }).click();
    const dialog = page.getByRole("dialog", { name: "Trash" });
    await dialog.locator(".studio-page-list__row", { hasText: title }).getByRole("button", { name: "Restore" }).click();
    await until(async () => (await folderFile(page, `${id}.zen.tsx`)) !== null, { message: "back in the folder" });
    await dialog.getByRole("button", { name: "Close" }).click();
    return "trash/ copy kept; restored";
  });

  await step("after a reload the linked folder is still connected", async () => {
    // Move to Trash left the page (the Studio is on the Button page now): any frame means the Studio is back.
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForSelector("[data-studio-frame]", { timeout: 30_000 });
    await showLeftTab(page, "pages");
    const where = await until(async () => { const text = await storageLine(page); return /Kept in|needs access/.test(text) ? text : null; }, { timeout: 10_000, message: "the storage line" });
    if (/needs access/.test(where)) {
      await page.getByRole("button", { name: "Reconnect" }).click();
      await until(async () => /Kept in/.test(await storageLine(page)), { message: "reconnected" });
      return `asked again, Reconnect worked ("${await storageLine(page)}")`;
    }
    return `"${where}"`;
  });

  await step("no page errors", async () => {
    const real = errors.filter((line) => !/Failed to load resource|favicon/.test(line));
    if (real.length) throw new Error(real.slice(0, 3).join(" | "));
    return `${errors.length} console lines, none an error of the page`;
  });
} catch (error) {
  failures.push("harness");
  console.log(`  ✗ harness · ${String(error?.message ?? error).split("\n")[0]}`);
} finally {
  await session?.context.close().catch(() => {});
  await browser.close().catch(() => {});
  await new Promise((resolve) => server.httpServer.close(resolve));
}

fs.writeFileSync(path.join(reportDir, `build-check-${stamp}.json`), JSON.stringify({ engineKb: Number(engineKb.toFixed(1)), budgetKb: ENGINE_BUDGET_KB, steps }, null, 2));
console.log(`\n${steps.filter((entry) => entry.ok).length} ok · ${failures.length} failed · engine ${engineKb.toFixed(1)} KB gzip (budget ${ENGINE_BUDGET_KB})`);
console.log(`Report: ${path.relative(root, path.join(reportDir, `build-check-${stamp}.json`))}`);
process.exit(failures.length ? 1 : 0);

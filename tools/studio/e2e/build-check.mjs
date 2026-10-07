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
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";
import { unzipFiles } from "../zip.mjs";
import { launchBrowser, openStudio, showLeftTab, sleep, until } from "./lib/studio.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const outDir = path.join(root, "node_modules/.cache/zen-studio/build-check/dist");
const args = process.argv.slice(2);
const has = (name) => args.includes(`--${name}`);
/** The engine chunk's budget (gzip KB). The spec said 130 on a guess of the parser's size; the user set 140 on
 *  2026-10-06 after M4 measured it (parser 77 + engine 58). Over it fails the check. */
const ENGINE_BUDGET_KB = 140;
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
  if (engineKb > ENGINE_BUDGET_KB) throw new Error(`${text}: over the budget`);
  return text;
});
// Detach on builder pages (GĐ4 M4): the recipes are a chunk of their own, loaded on first use, never in the engine's.
const detachKey = keyOf("tools/studio/browser-detach.mjs");
const engineClosure = closure(engineKey);
const detachChunks = [...closure(detachKey)].filter((key) => !before.has(key) && !engineClosure.has(key)).map((key) => manifest[key].file);
const detachFile = detachKey ? manifest[detachKey].file : null;
await step("the detach recipes are a chunk of their own", async () => {
  if (!detachFile) throw new Error("no chunk for tools/studio/browser-detach.mjs");
  // A recipe's own words (slots.mjs also reads the zen-detached marker, so the marker says nothing).
  const holds = (file) => fs.readFileSync(path.join(outDir, file), "utf8").includes("cannot be detached on a builder page yet");
  const leaks = [...before, ...engineClosure].map((key) => manifest[key].file).filter((file) => file.endsWith(".js") && holds(file));
  if (leaks.length) throw new Error(`the detach recipes are in ${leaks.join(", ")}`);
  if (!detachChunks.some(holds)) throw new Error(`no detach recipes in ${detachChunks.join(", ")}`);
  return `${detachChunks.reduce((sum, file) => sum + gzipKb(file), 0).toFixed(1)} KB gzip (${detachChunks.join(", ")})`;
});
await step("the parser loads with the engine only", async () => {
  const leaks = [...before].map((key) => manifest[key].file).filter((file) => file.endsWith(".js") && fs.readFileSync(path.join(outDir, file), "utf8").includes("This experimental syntax requires enabling"));
  if (leaks.length) throw new Error(`@babel/parser is in ${leaks.join(", ")}`);
  const parser = engineChunks.filter((file) => fs.readFileSync(path.join(outDir, file), "utf8").includes("This experimental syntax requires enabling"));
  if (!parser.length) throw new Error("the parser is not in the engine's chunks");
  return `@babel/parser only in the engine's chunks (${parser.join(", ")})`;
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
// Export (GĐ5 M1): the compiler is a chunk of its own too, loaded when the Export panel opens.
const compileKey = keyOf("tools/studio/browser-compile.mjs");
const compileFile = compileKey ? manifest[compileKey].file : null;
await step("the React compiler is a chunk of its own", async () => {
  if (!compileFile) throw new Error("no chunk for tools/studio/browser-compile.mjs");
  const holds = (file) => fs.readFileSync(path.join(outDir, file), "utf8").includes("Edit the design, then export again");
  const leaks = [...before, ...engineClosure].map((key) => manifest[key].file).filter((file) => file.endsWith(".js") && holds(file));
  if (leaks.length) throw new Error(`the compiler is in ${leaks.join(", ")}`);
  const own = [...closure(compileKey)].filter((key) => !before.has(key) && !engineClosure.has(key)).map((key) => manifest[key].file);
  if (!own.some(holds)) throw new Error(`no compiler in ${own.join(", ")}`);
  return `${own.reduce((sum, file) => sum + gzipKb(file), 0).toFixed(1)} KB gzip (${own.join(", ")})`;
});
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
  const detachRequests = [];
  const compileRequests = [];
  page.on("request", (request) => {
    if (compileFile && request.url().endsWith(compileFile.split("/").pop())) compileRequests.push(request.url());
    if (engineFile && request.url().endsWith(engineFile.split("/").pop())) engineRequests.push(request.url());
    if (detachFile && request.url().endsWith(detachFile.split("/").pop())) detachRequests.push(request.url());
  });
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

  await step("Inspector edit (Figma's option names), Reset all overrides, then ⌘Z", async () => {
    await clickNamed(page, id, "Button");
    // The select lists Figma's names ("Primary"); the file gets the code value (GĐ4 M1).
    await pick(page, "level", "Primary");
    await until(async () => /<Button level="primary"/.test((await storedText(page, id)) ?? ""), { message: 'level="primary"' });
    await page.locator("#studio-right").getByRole("button", { name: "Reset all overrides" }).click();
    await until(async () => /<Button onClick/.test((await storedText(page, id)) ?? ""), { message: "Reset all overrides removed level" });
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await until(async () => /<Button level="primary"/.test((await storedText(page, id)) ?? ""), { message: "⌘Z brings level back" });
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await until(async () => !/<Button level="primary"/.test((await storedText(page, id)) ?? ""), { message: "⌘Z undone" });
    return "level Primary → Reset all → ⌘Z → ⌘Z";
  });

  await step("Swap instance (canvas menu, op replaceElement in this build's engine), then ⌘Z", async () => {
    // Only a Button was selected so far: nothing asked about Detach, so its chunk has not loaded.
    if (detachRequests.length) throw new Error(`the detach chunk loaded with only a Button on the page (${detachRequests[0]})`);
    await clickNamed(page, id, "Button");
    const box = await named(page, id, "Button").boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: "right" });
    await page.getByRole("menuitem", { name: /^Swap instance/ }).click();
    const panel = page.locator('[data-e2e="quick-insert"][data-mode="swap"]');
    await panel.waitFor({ state: "visible", timeout: 5000 });
    await panel.getByLabel("Search components").fill("badge");
    await sleep(300);
    await page.keyboard.press("Enter");
    await until(async () => { const text = (await storedText(page, id)) ?? ""; return /<Badge\b/.test(text) && !/<Button\b/.test(text); }, { timeout: 10_000, message: "the Badge instead of the Button" });
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await until(async () => /<Button\b/.test((await storedText(page, id)) ?? ""), { timeout: 10_000, message: "⌘Z brings the Button back" });
    await named(page, id, "Button").waitFor({ state: "attached", timeout: 10_000 });
    return "Button → Badge → ⌘Z → Button";
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

  await step("Quick insert (⇧I) with nothing selected adds a Badge into the screen", async () => {
    await page.locator(".studio-viewport").focus();
    for (let i = 0; i < 3; i += 1) await page.keyboard.press("Escape");
    await page.keyboard.press("Shift+KeyI");
    const quick = page.locator('[data-e2e="quick-insert"]');
    await quick.waitFor({ state: "visible", timeout: 5000 });
    await page.keyboard.type("badge");
    await quick.locator('[data-e2e="quick-insert-preview"][data-ready="true"]').waitFor({ state: "visible", timeout: 10_000 });
    await page.keyboard.press("Enter");
    await until(async () => /<Badge/.test((await storedText(page, id)) ?? ""), { timeout: 10_000, message: "a Badge in the stored page" });
    return "previewed, added";
  });

  await step("Detach the Badge (the detach chunk loads now, op detach in this build's engine), then ⌘Z", async () => {
    // The Prototype step left the Inspector on its Prototype tab.
    await inspectorTab(page, "Design");
    await clickNamed(page, id, "Badge");
    const button = page.locator("#studio-right").getByRole("button", { name: /^Detach instance/ });
    await button.waitFor({ state: "visible", timeout: 10_000 });
    await until(async () => !(await button.isDisabled()), { timeout: 10_000, message: "Detach ready (its plan read in the browser)" });
    await button.click();
    await until(async () => { const text = (await storedText(page, id)) ?? ""; return /zen-detached: Badge/.test(text) && !/<Badge\b/.test(text); }, { timeout: 10_000, message: "the Badge detached into primitives" });
    if (!detachRequests.length) throw new Error("detached without requesting the detach chunk");
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("ControlOrMeta+KeyZ");
    await until(async () => /<Badge\b/.test((await storedText(page, id)) ?? ""), { timeout: 10_000, message: "⌘Z brings the Badge back" });
    return `Badge → primitives (detach chunk requested ${detachRequests.length}×) → ⌘Z → Badge`;
  });

  await step("Assets › Photos and Icons: a zen-media photo shows this build's file; an Icon is added", async () => {
    await showLeftTab(page, "assets");
    const assets = page.locator("#studio-left-panel-assets");
    await assets.getByRole("button", { name: "Photos", exact: true }).click();
    await assets.getByLabel("Search photos").fill("coffee");
    await assets.locator(".studio-assets__photo").first().click();
    await until(async () => /src="zen-media:site-cafe"/.test((await storedText(page, id)) ?? ""), { timeout: 10_000, message: "the zen-media Image in the stored page" });
    const img = page.locator(`img[data-zen-src^="local:${id}.zen.tsx:"], [data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Image"] img`).first();
    await img.waitFor({ state: "attached", timeout: 10_000 });
    await until(async () => img.evaluate((el) => el.complete && el.naturalWidth > 0), { timeout: 10_000, message: "the photo loaded from the build" });
    const src = await img.getAttribute("src");
    await assets.getByRole("button", { name: "Icons", exact: true }).click();
    await assets.getByLabel("Search icons").fill("heart");
    await assets.locator(".studio-assets__tile").first().click();
    await until(async () => /<Icon name="icon-heart/.test((await storedText(page, id)) ?? ""), { timeout: 10_000, message: "a heart Icon in the stored page" });
    await assets.getByRole("button", { name: "Components", exact: true }).click();
    return `photo ${src?.split("/").pop()} · Icon heart`;
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

  await step("New page from a template frame (GĐ3b: library components told by identity in this minified build)", async () => {
    await page.goto(`${url}/?ui=studio&page=templates`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[data-studio-frame="example:4"]', { timeout: 60_000 });
    // The frame's label on the canvas selects it (Layers lists the first 500 rows: this page has more).
    const label = page.locator('.studio-frame-label[data-chrome-key="label:example:4"]');
    await label.waitFor({ state: "attached", timeout: 20_000 });
    await label.evaluate((element) => element.click());
    await inspectorTab(page, "Design");
    const from = page.url();
    const button = page.locator("#studio-right").getByRole("button", { name: "New page from this frame" });
    await button.waitFor({ state: "visible", timeout: 10_000 }).catch(async (error) => {
      await page.screenshot({ path: path.join(reportDir, `build-check-${stamp}-starter.png`) }).catch(() => {});
      throw error;
    });
    await button.click();
    await until(async () => page.url() !== from && /page=local(%3A|:)/.test(page.url()), { timeout: 20_000, message: "the new page opened" });
    const starter = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
    const text = (await storedText(page, starter)) ?? "";
    if (!/device="desktop"/.test(text) || !/<Button\b/.test(text) || /onClick/.test(text)) throw new Error(`unexpected page:\n${text.slice(0, 600)}`);
    await page.locator(`[data-zen-src^="local:${starter}.zen.tsx:"][data-zen-name="Button"]`).first().waitFor({ state: "attached", timeout: 20_000 });
    return `${starter}: ${(text.match(/^\s*<[A-Z]/gm) ?? []).length} elements, rendered`;
  });

  await step("New page › Start from a phone template (Mobile list, rendered off screen in this build)", async () => {
    await showLeftTab(page, "pages");
    const from = page.url();
    await page.getByRole("button", { name: "New page" }).click();
    const dialog = page.getByRole("dialog", { name: "New page" });
    await dialog.waitFor({ state: "visible", timeout: 10_000 });
    await dialog.getByLabel("Start from").first().click();
    await page.getByRole("option", { name: /^Mobile list/ }).click();
    await dialog.getByRole("button", { name: "Create page" }).click();
    await until(async () => page.url() !== from && /page=local(%3A|:)/.test(page.url()), { timeout: 20_000, message: "the new page opened" });
    const starter = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
    const text = (await storedText(page, starter)) ?? "";
    if (!/device="phone"/.test(text) || !/<ListItem\b/.test(text)) throw new Error(`unexpected page:\n${text.slice(0, 600)}`);
    await page.locator(`[data-zen-src^="local:${starter}.zen.tsx:"][data-zen-name="ListItem"]`).first().waitFor({ state: "attached", timeout: 20_000 });
    return `${starter}: phone, ${(text.match(/^\s*<[A-Z]/gm) ?? []).length} elements, rendered`;
  });

  await step("Export the page as React (the compiler chunk loads now; Mobile list's search gets a stand-in handler)", async () => {
    if (compileRequests.length) throw new Error(`the compiler loaded before Export (${compileRequests[0]})`);
    await page.locator(".studio-viewport").focus();
    for (let i = 0; i < 3; i += 1) await page.keyboard.press("Escape");
    await inspectorTab(page, "Design");
    await page.locator("#studio-right").getByRole("button", { name: "Export…" }).click();
    const panel = page.locator(".studio-export");
    await panel.waitFor({ state: "visible", timeout: 10_000 });
    const code = await until(async () => { const text = await panel.innerText(); return /export function \w+Page\(/.test(text) ? text : null; }, { timeout: 20_000, message: "the React code in the panel" });
    if (!compileRequests.length) throw new Error("exported without requesting the compiler chunk");
    if (!/Generated by Zen Studio from/.test(code) || !/TODO\(dev\)/.test(code)) throw new Error(`unexpected code:\n${code.slice(0, 600)}`);
    const name = /export function (\w+Page)\(/.exec(code)[1];
    await page.keyboard.press("Escape");
    return `${name}: ${code.split("\n").length} lines (compiler chunk requested ${compileRequests.length}×)`;
  });

  await step("Export as HTML: the zip's styles.css holds this build's Zen rules (one bundled sheet) and its font files", async () => {
    await page.locator("#studio-right").getByRole("button", { name: "Export…" }).click();
    const panel = page.locator(".studio-export");
    await panel.waitFor({ state: "visible", timeout: 10_000 });
    await panel.getByRole("button", { name: "HTML", exact: true }).click();
    await until(async () => /screens\/[\w.-]+\.html/.test(await panel.innerText()), { timeout: 30_000, message: "the HTML files listed" });
    const downloading = page.waitForEvent("download");
    await panel.getByRole("button", { name: /^Download .*-html\.zip$/ }).click();
    const download = await downloading;
    const files = new Map(unzipFiles(new Uint8Array(fs.readFileSync(await download.path()))).map((file) => [file.path, new TextDecoder().decode(file.data)]));
    const css = files.get("styles.css") ?? "";
    const screens = [...files.keys()].filter((file) => /^screens\/.*\.html$/.test(file));
    const fonts = [...files.keys()].filter((file) => /^fonts\//.test(file));
    if (!screens.length || !/\.zen-/.test(css) || !/@font-face/.test(css) || !fonts.length) throw new Error(`incomplete export: ${[...files.keys()].join(", ")}; styles.css ${css.length} chars`);
    if (/\.(studio|platform|pe)-[\w-]/.test(css)) throw new Error("styles.css holds Studio or docs rules");
    if (/data-zen-src/.test(files.get(screens[0]) ?? "")) throw new Error("Studio attributes in the markup");
    await page.keyboard.press("Escape");
    return `${files.size} files: ${screens.length} screens, styles.css ${Math.round(css.length / 1024)} KB, ${fonts.join(", ")}`;
  });

  await step("Handoff zip: the code, handoff.md and a PNG of each frame drawn in this build (foreignObject)", async () => {
    await page.locator("#studio-right").getByRole("button", { name: "Export…" }).click();
    const panel = page.locator(".studio-export");
    await panel.waitFor({ state: "visible", timeout: 10_000 });
    await panel.getByRole("button", { name: "Handoff", exact: true }).click();
    await until(async () => /## Prototype flow/.test(await panel.innerText()), { timeout: 60_000, message: "handoff.md in the panel" });
    const downloading = page.waitForEvent("download");
    await panel.getByRole("button", { name: /^Download .*-handoff\.zip$/ }).click();
    const download = await downloading;
    const files = new Map(unzipFiles(new Uint8Array(fs.readFileSync(await download.path()))).map((file) => [file.path, file.data]));
    const markdown = new TextDecoder().decode(files.get("handoff.md") ?? new Uint8Array());
    const pictures = [...files.keys()].filter((file) => /^screens\/.*\.png$/.test(file));
    const code = [...files.keys()].find((file) => /^\w+Page\.tsx$/.test(file));
    if (!code || !pictures.length || !/## Accessibility/.test(markdown) || ![...files.keys()].some((file) => file.startsWith("html/"))) throw new Error(`incomplete package: ${[...files.keys()].join(", ")}`);
    const sizes = pictures.map((file) => { const bytes = Buffer.from(files.get(file)); return { file, width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), kb: Math.round(bytes.length / 1024) }; });
    // A phone frame is 390 px wide, an overlay frame 720: its picture twice that; an empty picture compresses to almost nothing.
    const bad = sizes.filter((size) => size.width !== (/overlay-/.test(size.file) ? 1440 : 780) || size.kb < 8);
    if (bad.length) throw new Error(`pictures: ${bad.map((size) => `${size.file} ${size.width}×${size.height} ${size.kb} KB`).join(", ")}`);
    await page.keyboard.press("Escape");
    return `${files.size} files: ${code}, ${sizes.map((size) => `${size.file} ${size.width}×${size.height} (${size.kb} KB)`).join(", ")}`;
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

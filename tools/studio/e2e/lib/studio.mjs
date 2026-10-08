// Zen Studio E2E: Playwright helpers that drive the Studio like a person (real pointer and keys) and read its state
// from the DOM it already exposes: frames ([data-studio-frame]), Layers rows ([data-layer-id="<file>:<line>:<col>#n"],
// aria-selected), Inspector rows ([data-prop]) and the canvas status line.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export const VIEWPORT = { width: 1512, height: 982 };
const PREFS_KEY = "zen-studio:prefs";

export async function launchBrowser({ headed = false } = {}) {
  const { chromium } = require("playwright");
  // The gate row opens the Studio on a non-loopback name; map it to the harness server's loopback address.
  return chromium.launch({ headless: !headed, args: ["--host-resolver-rules=MAP studio-e2e.test 127.0.0.1"] });
}

/** Finds the first DOM element a JSX element (file:loc) rendered: its own data-zen-src, else through the React fiber. */
function installHelpers() {
  const fiberOf = (el) => {
    for (const key in el) if (key.startsWith("__reactFiber$")) return el[key];
    return null;
  };
  const srcOfFiber = (fiber) => {
    for (let f = fiber; f; f = f.return) {
      const src = f.memoizedProps?.["data-zen-src"];
      if (typeof src === "string") return src;
    }
    return null;
  };
  window.__e2e = {
    elementOf(src) {
      const direct = document.querySelector(`[data-zen-src="${CSS.escape(src)}"]`);
      if (direct) return direct;
      for (const el of document.querySelectorAll(".studio-frame *")) {
        const fiber = fiberOf(el);
        if (fiber && srcOfFiber(fiber) === src) return el;
      }
      return null;
    },
    rectOf(src) {
      const el = this.elementOf(src);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    },
    /** Keydown default-prevented check: dispatches on the focused element and says whether a handler prevented it. */
    keyPrevented(init) {
      const target = document.activeElement ?? document.body;
      return !target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
    },
  };
}

/**
 * A fresh context (fresh sessionStorage, Admin role unless `role` says otherwise) on <url>/studio.html?page=<page>.
 * Returns { context, page, errors } — errors collects page errors and console errors for the smoke row.
 */
export async function openStudio(browser, { url, page: pageId, role = "admin", viewport = VIEWPORT, path = "/studio.html" }) {
  const context = await browser.newContext({ viewport, reducedMotion: "reduce", deviceScaleFactor: 1 });
  // ⌘C / ⌘V rows: the Studio copies layers through the system clipboard.
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: url }).catch(() => {});
  await context.addInitScript(({ key, role }) => {
    try {
      const prefs = JSON.parse(localStorage.getItem(key) ?? "{}");
      localStorage.setItem(key, JSON.stringify({ ...prefs, role }));
    } catch {
      localStorage.setItem(key, JSON.stringify({ role }));
    }
  }, { key: PREFS_KEY, role });
  await context.addInitScript(installHelpers);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  await page.goto(`${url}${path}${path.includes("?") ? "&" : "?"}page=${pageId}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-studio-frame="example:0"]', { timeout: 60_000 });
  return { context, page, errors };
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls `fn` (async ok) until it returns a truthy value; returns it, or throws `message` after `timeout` ms. */
export async function until(fn, { timeout = 6000, interval = 100, message = "condition" } = {}) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    try {
      last = await fn();
      if (last) return last;
    } catch (error) {
      last = error;
    }
    await sleep(interval);
  }
  throw new Error(`Timed out waiting for ${message}${last instanceof Error ? ` (${last.message})` : ""}`);
}

/** The toolbar's Document | Studio switch on Studio: the folders and the pages people made (user, 2026-10-09). */
export async function openStudioSpace(page) {
  const studio = page.locator(".studio-toolbar").getByRole("button", { name: "Studio", exact: true });
  if ((await studio.getAttribute("aria-pressed")) !== "true") { await studio.click(); await sleep(200); }
}

export async function showLeftTab(page, tab) {
  // A doc page and the Studio home show the Pages panel alone, without tabs.
  if (tab === "pages" && !(await page.locator(`#studio-left-tab-${tab}`).count())) {
    await page.waitForSelector(`#studio-left-panel-${tab}`, { state: "visible" });
    return;
  }
  await page.click(`#studio-left-tab-${tab}`);
  await page.waitForSelector(`#studio-left-panel-${tab}`, { state: "visible" });
}

/** Selects frame example:<index> from Layers and zooms to it (⇧2), so its content is on screen at a readable zoom. */
export async function focusFrame(page, index) {
  await showLeftTab(page, "layers");
  const row = page.locator(`[data-layer-id="frame:example:${index}"]`);
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Shift+Digit2");
  await sleep(250);
}

export async function rectOf(page, file, loc) {
  return page.evaluate((src) => window.__e2e.rectOf(src), `${file}:${loc}`);
}

/** Clicks the centre of what file:loc rendered (real pointer, through the canvas picker). */
export async function clickLoc(page, file, loc, { modifiers, clickCount, position = "center" } = {}) {
  const rect = await until(() => rectOf(page, file, loc), { message: `${file}:${loc} on the canvas` });
  // "center", or { dx, dy } from the top-left corner (a container's padding, where no child covers it).
  const x = position === "center" ? rect.x + rect.width / 2 : rect.x + (position.dx ?? 2);
  const y = position === "center" ? rect.y + rect.height / 2 : rect.y + (position.dy ?? 2);
  // page.mouse.click has no `modifiers`: hold the keys around the click.
  for (const key of modifiers ?? []) await page.keyboard.down(key);
  try {
    await page.mouse.click(x, y, { clickCount });
  } finally {
    for (const key of [...(modifiers ?? [])].reverse()) await page.keyboard.up(key);
  }
  return rect;
}

/** The loc ("<file>:<line>:<col>") of the primary selected layer, from the Layers tree, or null. */
export async function selectedSrc(page) {
  return page.evaluate(() => {
    const rows = [...document.querySelectorAll('.studio-layers__tree [role="treeitem"][aria-selected="true"]')];
    return rows.map((row) => (row.getAttribute("data-layer-id") ?? "").replace(/#\d+$/, ""));
  });
}

export const inspector = (page) => page.locator("#studio-right");
export const inspectorRow = (page, prop) => page.locator(`#studio-right [data-prop="${prop}"]`).first();

/** The canvas status hint text (CanvasStatus), where the Studio reports refusals and results. */
export async function statusText(page) {
  return page.evaluate(() => [...document.querySelectorAll('[role="status"]')].map((el) => el.textContent?.trim()).filter(Boolean).join(" | "));
}

/** Is the box fully inside the viewport? */
export const inViewport = (box, viewport = VIEWPORT) => Boolean(box) && box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 0.5 && box.y + box.height <= viewport.height + 0.5;

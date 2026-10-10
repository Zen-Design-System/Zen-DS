// Builder rows (Studio builder GĐ2 M1, spec docs/research/studio-builder-pages-spec-2026-10-06.md): a page made in the
// Studio and kept in the browser (IndexedDB), edited with the same tools as example code. Each row makes its own page.
import fs from "node:fs";
import path from "node:path";
import { pagesDirOf } from "../lib/server.mjs";
import { inspectorRow, openAssetLibrary, openStudioSpace, selectAt, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { pickOption, scaleStep } from "./inspector.mjs";

/** The page's text as the browser keeps it (IndexedDB "zen-studio-builder"). */
export const pageText = (page, id) => page.evaluate((key) => new Promise((resolve) => {
  const request = indexedDB.open("zen-studio-builder");
  request.onsuccess = () => {
    const get = request.result.transaction("pages").objectStore("pages").get(key);
    get.onsuccess = () => resolve(get.result?.text ?? null);
    get.onerror = () => resolve(null);
  };
  request.onerror = () => resolve(null);
}), id);

let made = 0;
/** New page from the Pages tab; returns its id (from the address). */
export async function newPage(ctx, { title, device = "phone" } = {}) {
  const { page } = await ctx.studio();
  made += 1;
  const name = title ?? `Builder ${made} ${Date.now().toString(36)}`;
  const from = page.url();
  await showLeftTab(page, "pages");
  await openStudioSpace(page);
    await page.locator("#studio-left").getByRole("button", { name: "New page", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New page" });
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  // Nothing to fill in (2026-10-09): a blank page is an "Untitled page" on a desktop Screen…
  await dialog.getByRole("button", { name: "Create page" }).click();
  await until(async () => page.url() !== from && /page=local%3A/.test(page.url()) && (await page.locator('[data-studio-frame^="screen:"]').count()) > 0, { message: "the new page on the canvas" });
  const id = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
  // …named with nothing selected (the Page section's Name, on the Design tab: a row before may have left Prototype open)…
  const design = page.locator("#studio-right").getByRole("tab", { name: "Design" });
  if (await design.count()) await design.click();
  const field = page.locator("#studio-right").getByLabel("Page name");
  await field.waitFor({ state: "visible", timeout: 5000 });
  await field.fill(name);
  await field.press("Enter");
  await until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === name, { message: `the page named "${name}"` });
  // …and on its device from the Screen's frame panel (Screen › Device).
  if (device !== "desktop") {
    await showLeftTab(page, "layers");
    await page.locator('[data-layer-id^="frame:screen:"]').first().click();
    await page.locator("#studio-right").getByRole("button", { name: new RegExp(`^${device === "phone" ? "Phone" : "Tablet"},`) }).click();
    await until(async () => new RegExp(`<Screen [^>]*device="${device}"`).test((await pageText(page, id)) ?? ""), { message: `the Screen on ${device}` });
    await page.locator(".studio-viewport").focus();
    await page.keyboard.press("Escape");
  }
  return { page, id, name };
}

/** Zooms the canvas to the page's first Screen (its Layers row, then ⇧2), as focusFrame does for an example. */
export async function focusScreen(page) {
  await showLeftTab(page, "layers");
  const row = page.locator('[data-layer-id^="frame:screen:"]').first();
  await row.waitFor({ state: "attached", timeout: 5000 }).catch(async () => { throw new Error(`no Screen row in Layers (rows: ${(await page.locator("[data-layer-id]").evaluateAll((els) => els.slice(0, 4).map((el) => el.getAttribute("data-layer-id")))).join(", ")})`); });
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Shift+Digit2");
  await sleep(300);
}

/** Selects the n-th element of the page named `name` (a click at its centre, through the canvas picker; ⌘ held: Figma's
 *  deep select, so the element itself is selected, not the outermost layer there). */
export async function clickNamed(page, id, name, index = 0) {
  const target = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).nth(index);
  await target.waitFor({ state: "attached", timeout: 5000 }).catch(async () => { throw new Error(`no <${name}> of ${id} on the canvas (url ${page.url()})`); });
  const box = await target.boundingBox();
  if (!box) throw new Error(`<${name}> has no box on the canvas`);
  await selectAt(page, box);
  await sleep(500);
}

/** The Inspector's heading: the selected layer's name. */
export const selectedName = async (page) => (await page.locator("#studio-right h2").first().innerText({ timeout: 1000 }).catch(() => "")).trim();

/** Selects the screen's Stack (its heading, then Escape to the parent). The Design tab names the selection (the tab
 *  persists across rows, and the Prototype tab has no h2 for selectedName to read). */
export async function selectStack(page, id) {
  await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
  await focusScreen(page);
  await clickNamed(page, id, "Text");
  await page.keyboard.press("Escape");
  await until(async () => (await selectedName(page)) === "Stack", { message: "the Stack selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await selectedName(page)}; status: ${await statusText(page)})`); });
}

async function insertAsset(page, label) {
  await openAssetLibrary(page, "Components");
  await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill(label);
  await page.locator("#studio-left-panel-assets [data-asset]", { hasText: new RegExp(`^${label}`) }).first().click();
}


/* ── M2: the dev server's pages folder, page actions, Trash, history, Export / Import ── */

/** The page's file in this server's pages folder (null when absent). */
const folderText = (ctx, id) => {
  try {
    return fs.readFileSync(path.join(ctx.root, pagesDirOf(ctx.server.port), `${id}.zen.tsx`), "utf8");
  } catch {
    return null;
  }
};

/** The page's row under My pages. */
const mineRow = (page, name) => page.locator('[data-section="mine"] .studio-pages__item').filter({ has: page.getByRole("button", { name, exact: true }) });

/** Chooses one of a page's actions (its row's menu). */
async function pageAction(page, name, action) {
  await showLeftTab(page, "pages");
  await openStudioSpace(page);
  const row = mineRow(page, name);
  await row.hover();
  await row.getByRole("button", { name: `${name} actions` }).click();
  await page.getByRole("menuitem", { name: action }).click();
}

/** Chooses one of the Studio options (the folders' ⋯). */
async function mineOption(page, action) {
  await showLeftTab(page, "pages");
  await openStudioSpace(page);
    await page.getByRole("button", { name: "Studio options" }).click();
  await page.getByRole("menuitem", { name: action }).click();
}

const listed = async (page, name) => { await openStudioSpace(page); return (await mineRow(page, name).count()) > 0; };

/* ── M3: Prototype tab, Play ── */

/** Opens the Inspector's Prototype tab. */
async function prototypeTab(page) {
  await page.locator("#studio-right").getByRole("tab", { name: "Prototype" }).click();
  await page.locator('[data-e2e="prototype-panel"]').waitFor({ state: "visible", timeout: 5000 });
}

/** A new page with a Button (from Assets) and a second Screen; returns the page and the Button's text check. */
async function flowPage(ctx) {
  const made = await newPage(ctx);
  const { page, id } = made;
  await selectStack(page, id);
  await insertAsset(page, "Button");
  await until(async () => /<Button /.test((await pageText(page, id)) ?? ""), { message: "a Button" });
  await prototypeTab(page);
  await page.getByRole("button", { name: "Add screen" }).click();
  await until(async () => /<Screen id="screen-2"/.test((await pageText(page, id)) ?? ""), { message: "screen-2 in the page" });
  await until(async () => (await page.locator('[data-studio-frame="screen:screen-2"]').count()) > 0, { message: "screen-2 on the canvas" });
  return made;
}

/** Sets the selected element's onClick action in the Prototype tab. */
async function setAction(page, action, target) {
  await pickOption(page, "proto:onClick", action);
  if (target) await pickOption(page, "proto:onClick:target", target);
}

const playing = (page) => page.locator(".studio-player");
const playScreen = (page) => playing(page).locator(".studio-player__device").getAttribute("data-screen-id");

export const rows = [
  {
    id: "B-01", feature: "New page: a blank phone page opens on the canvas, listed under My pages", wp: "GĐ2 M1",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx, { device: "phone" });
      const width = await page.locator('[data-studio-frame="screen:screen-1"]').evaluate((frame) => Math.round(frame.getBoundingClientRect().width / (Number(getComputedStyle(frame.closest(".studio-world") ?? frame).getPropertyValue("--studio-zoom")) || 1)));
      const text = await pageText(page, id);
      if (!/^\/\/ @zen-page \{"format":1/.test(text ?? "")) throw new Error("no page header in the stored text");
      await showLeftTab(page, "pages");
      if (!(await page.locator('[data-section="mine"]').getByRole("button", { name }).count())) throw new Error("not listed under My pages");
      return `screen-1 at ${width}px; stored with its header`;
    },
  },
  {
    id: "B-02", feature: "Assets insert a Button into the page (proto action, package import); it gets selected", wp: "GĐ2 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await insertAsset(page, "Button");
      await until(async () => /<Button level="tertiary" onClick=\{proto\.toast\(\{ title: "Report exported" \}\)\}>/.test((await pageText(page, id)) ?? ""), { message: "a Button with proto.toast in the page" });
      const text = await pageText(page, id);
      // The package import holds the app frame's components too (a new page comes with them).
      if (!/import \{[^}]*\bButton\b[^}]*\} from "@zen\/design-system";/.test(text)) throw new Error("Button not imported from the package");
      await until(async () => (await selectedName(page)) === "Button", { message: "the new Button selected" });
      return "inserted, imported, selected";
    },
  },
  {
    id: "B-03", feature: "Inspector edit on a page element, then ⌘Z", wp: "GĐ2 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await insertAsset(page, "Button");
      await until(async () => /<Button level="tertiary"/.test((await pageText(page, id)) ?? ""), { message: "the Button" });
      await sleep(400);
      await clickNamed(page, id, "Button");
      await pickOption(page, "level", "Primary");
      await until(async () => /<Button level="primary"/.test((await pageText(page, id)) ?? ""), { message: 'level="primary"' });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /<Button level="tertiary"/.test((await pageText(page, id)) ?? ""), { message: "⌘Z back to tertiary" });
      return "tertiary → primary → ⌘Z";
    },
  },
  {
    id: "B-34", feature: "⌘D on a page you made duplicates the layer (the renderer's React key is not a written key); ⌘Z removes the copy", wp: "usability walk 2026-10-10",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await insertAsset(page, "Button");
      await until(async () => ((await pageText(page, id)) ?? "").match(/<Button /g)?.length === 1, { message: "one Button" });
      await sleep(400);
      await clickNamed(page, id, "Button");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => ((await pageText(page, id)) ?? "").match(/<Button /g)?.length === 2, { message: "two Buttons after ⌘D" }).catch(async (error) => { throw new Error(`${error.message} · status: ${(await statusText(page)).slice(-160)}`); });
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => ((await pageText(page, id)) ?? "").match(/<Button /g)?.length === 1, { message: "one Button after ⌘Z" });
      return "⌘D → 2 Buttons · ⌘Z → 1";
    },
  },
  {
    id: "B-04", feature: "Layout on a page: the Stack's gap through the Layout section", wp: "GĐ2 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await pickOption(page, "gap", scaleStep("xl"));
      await until(async () => /<Stack gap="xl"/.test((await pageText(page, id)) ?? ""), { message: 'gap="xl"' });
      return "gap md → xl";
    },
  },
  {
    id: "B-05", feature: "A page survives a reload (and keeps its edits)", wp: "GĐ2 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await insertAsset(page, "Badge");
      await until(async () => /<Badge/.test((await pageText(page, id)) ?? ""), { message: "a Badge" });
      await page.reload({ waitUntil: "domcontentloaded" });
      await until(async () => (await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Badge"]`).count()) > 0, { timeout: 30000, message: "the Badge rendered after the reload" });
      return "Badge still there after a reload";
    },
  },
  {
    id: "B-06", feature: "An item that keeps state is refused with a reason (the page stays valid)", wp: "GĐ2 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      const before = await pageText(page, id);
      await insertAsset(page, "Tabs");
      await until(async () => /keeps state or code/.test(await statusText(page)), { message: "the refusal in the status" });
      if ((await pageText(page, id)) !== before) throw new Error("the page changed");
      if ((await inspectorRow(page, "gap").count()) === 0) throw new Error("the Stack is no longer selected");
      return "Tabs refused; nothing written";
    },
  },
  {
    id: "B-07", feature: "Dev server: a page and its edits are kept in the pages folder (.zen-studio/pages)", wp: "GĐ2 M2",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await until(async () => folderText(ctx, id) === (await pageText(page, id)), { message: "the new page in the folder" });
      await selectStack(page, id);
      await insertAsset(page, "Badge");
      await until(async () => /<Badge/.test(folderText(ctx, id) ?? ""), { message: "the Badge in the folder's file" });
      if (folderText(ctx, id) !== (await pageText(page, id))) throw new Error("the folder and the browser differ");
      // Where the pages are kept is the info icon's tooltip by Folders (its accessible name) since 2026-10-09.
      if (!/Kept in/.test((await page.locator(".studio-pages__info").getAttribute("aria-label")) ?? "")) throw new Error("the panel does not say the folder keeps the pages");
      return `${id}.zen.tsx written, same text as the browser`;
    },
  },
  {
    id: "B-08", feature: "Rename a page from its row's menu, in place in the list (header title, list, folder)", wp: "GĐ2 M2",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx);
      const renamed = `${name} renamed`;
      await pageAction(page, name, /^Rename/);
      // In place (2026-10-10): the row's name becomes a field, Enter saves.
      const field = page.locator("#studio-left").getByRole("textbox", { name: "Page name" });
      await field.fill(renamed);
      await field.press("Enter");
      await until(async () => (await pageText(page, id))?.startsWith(`// @zen-page {"format":1,"title":${JSON.stringify(renamed)}}`), { message: "the header renamed" });
      await until(async () => listed(page, renamed), { message: "the new name under My pages" });
      await until(async () => (folderText(ctx, id) ?? "").includes(JSON.stringify(renamed)), { message: "the folder's file renamed" });
      return "renamed in the header, the list and the folder";
    },
  },
  {
    id: "B-09", feature: "Duplicate a page: a copy opens under a new id", wp: "GĐ2 M2",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx);
      await pageAction(page, name, /^Duplicate/);
      // The copy's id comes from its title ("<name> copy"), the page's own id from the name it was made with.
      const copyId = await until(async () => { const at = /page=local:([a-z0-9-]+)/.exec(decodeURIComponent(page.url()))?.[1]; return at && at !== id && at.endsWith("-copy") ? at : null; }, { message: "the copy opened" });
      const copy = await pageText(page, copyId);
      if (!copy?.includes(JSON.stringify(`${name} copy`))) throw new Error("the copy's header is not renamed");
      if (!(await listed(page, `${name} copy`))) throw new Error("the copy is not listed");
      return `${copyId} opened`;
    },
  },
  {
    id: "B-10", feature: "Export a page, Import the file: the same text byte for byte", wp: "GĐ2 M2",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx);
      await selectStack(page, id);
      await insertAsset(page, "Badge");
      await until(async () => /<Badge/.test((await pageText(page, id)) ?? ""), { message: "a Badge" });
      const downloading = page.waitForEvent("download");
      await pageAction(page, name, /^Export file/);
      const download = await downloading;
      if (download.suggestedFilename() !== `${id}.zen.tsx`) throw new Error(`file named ${download.suggestedFilename()}`);
      const exported = fs.readFileSync(await download.path(), "utf8");
      if (exported !== (await pageText(page, id))) throw new Error("the exported file differs from the page");
      const copyId = `${id}-imported`;
      await page.locator('[data-e2e="import-pages"]').setInputFiles({ name: `${copyId}.zen.tsx`, mimeType: "text/plain", buffer: Buffer.from(exported, "utf8") });
      await until(async () => (await pageText(page, copyId)) !== null, { message: "the imported page stored" });
      if ((await pageText(page, copyId)) !== exported) throw new Error("the imported text differs from the file");
      await until(async () => decodeURIComponent(page.url()).includes(`page=local:${copyId}`), { message: "the imported page opened" });
      await page.locator('[data-e2e="import-pages"]').setInputFiles({ name: "broken.zen.tsx", mimeType: "text/plain", buffer: Buffer.from("export default 1;\n") });
      await until(async () => /Not imported: broken\.zen\.tsx/.test(await statusText(page)), { message: "an invalid file refused" });
      return `${exported.length} bytes out and back in; an invalid file refused`;
    },
  },
  {
    id: "B-11", feature: "Move to Trash and Restore (the folder's file goes to its trash and comes back)", wp: "GĐ2 M2",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx);
      await until(async () => folderText(ctx, id) !== null, { message: "the page in the folder" });
      await pageAction(page, name, /^Move to Trash/);
      await until(async () => !(await listed(page, name)), { message: "gone from My pages" });
      await until(async () => folderText(ctx, id) === null, { message: "gone from the folder" });
      const trashDir = path.join(ctx.root, pagesDirOf(ctx.server.port), "..", "trash");
      if (!fs.readdirSync(trashDir).some((file) => file.startsWith(`${id}-`))) throw new Error("not in the folder's trash");
      if (decodeURIComponent(page.url()).includes(`local:${id}`)) throw new Error("the trashed page is still open");
      await mineOption(page, /^Trash/);
      const dialog = page.getByRole("dialog", { name: "Trash" });
      await dialog.locator(".studio-page-list__row", { hasText: name }).getByRole("button", { name: "Restore" }).click();
      await until(async () => listed(page, name), { message: "back under My pages" });
      await until(async () => folderText(ctx, id) !== null, { message: "back in the folder" });
      await dialog.getByRole("button", { name: "Close" }).click();
      return "trashed (file kept in trash/), restored";
    },
  },
  {
    id: "B-12", feature: "Version history: restore the text from before the edits", wp: "GĐ2 M2",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx);
      await selectStack(page, id);
      await insertAsset(page, "Badge");
      await until(async () => /<Badge/.test((await pageText(page, id)) ?? ""), { message: "a Badge" });
      await pageAction(page, name, /^Version history/);
      const dialog = page.getByRole("dialog", { name: "Version history" });
      await dialog.getByRole("button", { name: "Restore" }).first().click();
      // The newest kept version is from before the edits (rename and device included): a page with no Badge.
      await until(async () => { const text = (await pageText(page, id)) ?? ""; return /<Screen\b/.test(text) && !/<Badge/.test(text); }, { message: "the text from before the Badge" });
      await until(async () => (await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Badge"]`).count()) === 0, { message: "the Badge gone from the canvas" });
      return "restored the first version";
    },
  },
  {
    id: "B-13", feature: "A change made in the folder reaches the Studio (Sync with the folder)", wp: "GĐ2 M2",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx);
      await until(async () => folderText(ctx, id) !== null, { message: "the page in the folder" });
      const changed = `${name} from disk`;
      const file = path.join(ctx.root, pagesDirOf(ctx.server.port), `${id}.zen.tsx`);
      fs.writeFileSync(file, folderText(ctx, id).replace(JSON.stringify(name), JSON.stringify(changed)));
      await mineOption(page, /^Sync with the folder/);
      await until(async () => listed(page, changed), { message: "the folder's title under My pages" });
      if ((await pageText(page, id)) !== fs.readFileSync(file, "utf8")) throw new Error("the browser copy differs from the folder");
      return "folder edit synced into the browser";
    },
  },
  {
    id: "B-14", feature: "Prototype tab: Add screen and Add overlay put frames on the Board", wp: "GĐ2 M3",
    async run(ctx) {
      const { page, id } = await flowPage(ctx);
      await page.getByRole("button", { name: "Add overlay" }).click();
      await until(async () => /<Overlay id="overlay-1">/.test((await pageText(page, id)) ?? ""), { message: "overlay-1 in the page" });
      const text = await pageText(page, id);
      if (!/import \{ Board, Overlay, Screen, proto \} from "@zen\/design-system\/builder";/.test(text)) throw new Error("Overlay not imported");
      if (!/import \{[^}]*\bDialog\b[^}]*\} from "@zen\/design-system";/.test(text)) throw new Error("Dialog not imported");
      await until(async () => (await page.locator('[data-studio-frame="overlay:overlay-1"]').count()) > 0, { message: "the overlay frame on the canvas" });
      const listed = await page.locator('[data-e2e="prototype-panel"] .studio-prototype__frame').count();
      if (listed !== 3) throw new Error(`Flow lists ${listed} frames`);
      return "screen-2 and overlay-1 added, imported, listed";
    },
  },
  {
    id: "B-15", feature: "Prototype tab: a Button's onClick navigates to a Screen (code + arrow on the canvas)", wp: "GĐ2 M3",
    async run(ctx) {
      const { page, id } = await flowPage(ctx);
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      await setAction(page, "Navigate to", "Screen 2");
      await until(async () => /onClick=\{proto\.navigate\("screen-2"\)\}/.test((await pageText(page, id)) ?? ""), { message: 'onClick={proto.navigate("screen-2")}' });
      await until(async () => (await page.locator(".studio-proto-links").getAttribute("data-links").catch(() => null)) === "1", { message: "one arrow on the canvas" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /onClick=\{proto\.toast/.test((await pageText(page, id)) ?? ""), { message: "⌘Z back to the toast" });
      return "navigate written, arrow drawn, ⌘Z undoes it";
    },
  },
  {
    id: "B-16", feature: "Play (P): the Button navigates, Back returns, R restarts, Esc leaves", wp: "GĐ2 M3",
    async run(ctx) {
      const { page, id } = await flowPage(ctx);
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      await setAction(page, "Navigate to", "Screen 2");
      await until(async () => /proto\.navigate\("screen-2"\)/.test((await pageText(page, id)) ?? ""), { message: "the action" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("p");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      if ((await playScreen(page)) !== "screen-1") throw new Error(`Play starts on ${await playScreen(page)}`);
      if (!new URL(page.url()).searchParams.has("play")) throw new Error("no ?play= in the address");
      await playing(page).locator(`[data-zen-name="Button"]`).first().click();
      await until(async () => (await playScreen(page)) === "screen-2", { message: "screen-2 after the click" });
      await playing(page).getByRole("button", { name: "Back" }).click();
      await until(async () => (await playScreen(page)) === "screen-1", { message: "Back to screen-1" });
      await playing(page).locator(`[data-zen-name="Button"]`).first().click();
      await until(async () => (await playScreen(page)) === "screen-2", { message: "screen-2 again" });
      await page.keyboard.press("r");
      await until(async () => (await playScreen(page)) === "screen-1", { message: "R restarts" });
      await page.keyboard.press("Escape");
      await until(async () => (await playing(page).count()) === 0, { message: "Esc leaves Play" });
      if (new URL(page.url()).searchParams.has("play")) throw new Error("?play= stays after Play");
      return "navigate · Back · R · Esc";
    },
  },
  {
    id: "B-17", feature: "Play: a Button opens an Overlay's Dialog; its Cancel closes it", wp: "GĐ2 M3",
    async run(ctx) {
      const { page, id } = await flowPage(ctx);
      await page.getByRole("button", { name: "Add overlay" }).click();
      await until(async () => /<Overlay id="overlay-1">/.test((await pageText(page, id)) ?? ""), { message: "overlay-1" });
      await sleep(400);
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      await setAction(page, "Open overlay", "overlay-1");
      await until(async () => /onClick=\{proto\.open\("overlay-1"\)\}/.test((await pageText(page, id)) ?? ""), { message: "the open action" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("p");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await playing(page).locator(`[data-zen-name="Button"]`).first().click();
      const dialog = playing(page).getByRole("dialog", { name: "Are you sure?" });
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await until(async () => (await dialog.count()) === 0, { message: "Cancel closes the Dialog" });
      if (!(await playing(page).count())) throw new Error("closing the Dialog left Play");
      await page.keyboard.press("Escape");
      await until(async () => (await playing(page).count()) === 0, { message: "Esc leaves Play" });
      return "open → Dialog → Cancel closes";
    },
  },
  {
    id: "B-18", feature: "?play= in the address opens the page in Play after a reload", wp: "GĐ2 M3",
    async run(ctx) {
      const { page } = await flowPage(ctx);
      const url = new URL(page.url());
      url.searchParams.set("play", "screen-2");
      await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
      await playing(page).waitFor({ state: "visible", timeout: 30000 });
      await until(async () => (await playScreen(page)) === "screen-2", { message: "Play on screen-2" });
      await page.keyboard.press("Escape");
      await until(async () => (await playing(page).count()) === 0, { message: "Esc leaves Play" });
      return "reloaded into Play on screen-2";
    },
  },
  {
    id: "B-19", feature: "Inspector › Frames names the open page's Screens after a switch (two pages share screen-1)", wp: "backlog 2026-10-07",
    async run(ctx) {
      const frameNames = async (page) => (await page.locator('#studio-right ul[aria-label="Frames"]').innerText({ timeout: 1000 }).catch(() => "")).trim();
      const listed = (page, name, message) => until(async () => (await frameNames(page)).includes(name), { message }).catch(async (error) => { throw new Error(`${error.message} (Frames: ${JSON.stringify(await frameNames(page))})`); });
      const first = await newPage(ctx, { title: `Frames A ${Date.now().toString(36)}` });
      await listed(first.page, first.name, "Frames lists page A's Screen");
      const second = await newPage(ctx, { title: `Frames B ${Date.now().toString(36)}` });
      await listed(second.page, second.name, "Frames lists page B's Screen");
      const names = await frameNames(second.page);
      if (names.includes(first.name)) throw new Error(`Frames still names page A after opening B: ${JSON.stringify(names)}`);
      // And back: A's own title again.
      await showLeftTab(second.page, "pages");
      await mineRow(second.page, first.name).getByRole("button", { name: first.name, exact: true }).click();
      await listed(second.page, first.name, "Frames lists page A's Screen again");
      return `Frames: "${second.name}" on B, "${first.name}" back on A`;
    },
  },
  {
    id: "B-20", feature: "Toolbar › Screen on a page you made: a click on the canvas adds a Screen on the page's device", wp: "toolbar 2026-10-09",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await page.locator(".studio-canvas-tools").getByRole("button", { name: "Screen", exact: true }).click();
      const box = await page.locator(".studio-viewport").boundingBox();
      await page.mouse.move(box.x + 40, box.y + box.height - 120);
      await page.mouse.down();
      await page.mouse.up();
      await until(async () => (((await pageText(page, id)) ?? "").match(/<Screen\b/g) ?? []).length === 2, { message: "a second Screen" });
      const text = (await pageText(page, id)) ?? "";
      if ((text.match(/<Screen [^>]*device="phone"/g) ?? []).length !== 2) throw new Error("the new Screen is not on the page's device (phone)");
      return "Screen tool → a second phone Screen";
    },
  },
  {
    id: "B-21", feature: "Right-click on a selected Stack's spacing (its padding) opens the canvas menu for that Stack", wp: "studio fixes 2026-10-09",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      const stack = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Stack"]`).first().boundingBox();
      // The Stack's left padding, level with its Text: a spacing area of the selection overlay.
      await page.mouse.click(stack.x + 6, stack.y + stack.height / 2, { button: "right" });
      const menu = page.getByRole("menu").last();
      await menu.waitFor({ state: "visible", timeout: 2500 }).catch(() => { throw new Error("no menu on the Stack's padding"); });
      const items = await menu.getByRole("menuitem").allInnerTexts();
      await page.keyboard.press("Escape");
      if (!items.some((item) => /Wrap in Stack/.test(item))) throw new Error(`not the layer menu (${items.slice(0, 4).join(", ")})`);
      if ((await selectedName(page)) !== "Stack") throw new Error(`the selection moved to ${await selectedName(page)}`);
      return `${items.length} items, the Stack still selected`;
    },
  },
  {
    id: "B-22", feature: "⇧A wraps one layer (a single Text) in a new Stack on a page you made", wp: "studio fixes 2026-10-09",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      await focusScreen(page);
      await clickNamed(page, id, "Text");
      await until(async () => (await selectedName(page)) === "Text", { message: "the Text selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+KeyA");
      await until(async () => /<Stack[^>]*>\s*<Stack[^>]*>\s*<Text/.test((await pageText(page, id)) ?? ""), { message: "the Text in a new Stack" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      await until(async () => (await selectedName(page)) === "Stack", { message: "the new Stack selected" });
      return "Text → Stack › Text, the Stack selected";
    },
  },
  {
    id: "B-23", feature: "Assets › Sidebar goes into a page's Stack (a static selected item: a page keeps no state)", wp: "studio fixes 2026-10-09",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await insertAsset(page, "Sidebar");
      await until(async () => /<Sidebar aria-label="Workspace" selectedId="projects">\s*<SidebarMenuItem id="home"/.test((await pageText(page, id)) ?? ""), { message: "a Sidebar with its Menu-Item rows in the page" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      const text = (await pageText(page, id)) ?? "";
      if (/useState|setSection/.test(text)) throw new Error("the page got state");
      if (!/import \{ [^}]*\bSidebarMenuItem\b[^}]* \} from "@zen\/design-system";/.test(text)) throw new Error("SidebarMenuItem is not imported");
      await until(async () => (await page.locator(`[data-studio-frame="screen:screen-1"] .zen-sidebar`).count()) > 0, { message: "the Sidebar on the canvas" });
      return "Sidebar inserted, selectedId fixed, no state";
    },
  },
  {
    id: "B-24", feature: "Screen › Canvas: Alt paints the Screen Canvas/Alt (canvas=\"alt\"); Default takes the prop away", wp: "studio fixes 2026-10-09",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id^="frame:screen:"]').first().click();
      const screen = page.locator('[data-studio-frame="screen:screen-1"] .studio-builder-screen');
      const paint = () => screen.evaluate((el) => getComputedStyle(el).backgroundColor);
      const before = await paint();
      await page.locator("#studio-right").getByRole("button", { name: /^Alt canvas,/ }).click();
      // The Screen's tag holds its app frame's components (their `/>`), so the prop is matched on its own.
      await until(async () => /\bcanvas="alt"/.test((await pageText(page, id)) ?? ""), { message: 'canvas="alt" on the Screen' });
      const alt = await page.evaluate(() => { const probe = document.createElement("div"); probe.style.background = "var(--zen-color-background-canvas-alt)"; document.querySelector(".studio-builder-screen")?.append(probe); const value = getComputedStyle(probe).backgroundColor; probe.remove(); return value; });
      await until(async () => (await paint()) === alt, { message: `the Screen painted Canvas/Alt (${alt})` });
      await page.locator("#studio-right").getByRole("button", { name: /^Default canvas,/ }).click();
      await until(async () => !/canvas=/.test((await pageText(page, id)) ?? ""), { message: "the canvas prop removed" });
      await until(async () => (await paint()) === before, { message: "the Screen back on Canvas/Default" });
      return `${before} → ${alt} → ${before}`;
    },
  },
  {
    id: "B-25", feature: "A blank page comes with its app frame (desktop: Sidebar + Page header); Screen › Sidebar (a toggle) switches it off and on", wp: "app frame 2026-10-09",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx, { device: "desktop" });
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      await until(async () => (await frame.locator(".zen-sidebar").count()) > 0 && (await frame.locator(".zen-page-header").count()) > 0, { message: "Sidebar and Page header on the Screen" });
      if ((await frame.locator(".zen-top-nav, .zen-bottom-nav").count()) > 0) throw new Error("the phone bars show on a desktop Screen");
      const header = (await frame.locator(".zen-page-header h1").first().innerText()).trim();
      if (header !== name) throw new Error(`the Page header reads "${header}", not the page's name "${name}"`);
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id^="frame:screen:"]').first().click();
      // The Toggle's label (it switches the part like the switch itself).
      const toggle = inspectorRow(page, "sidebar").getByText("Sidebar", { exact: true });
      await toggle.click();
      await until(async () => !/\bsidebar=\{/.test((await pageText(page, id)) ?? ""), { message: "the sidebar prop removed" });
      await until(async () => (await frame.locator(".zen-sidebar").count()) === 0, { message: "no Sidebar on the Screen" });
      await toggle.click();
      await until(async () => /\bsidebar=\{<Sidebar /.test((await pageText(page, id)) ?? ""), { message: "the Sidebar back in the page" });
      await until(async () => (await frame.locator(".zen-sidebar").count()) > 0, { message: "the Sidebar back on the Screen" });
      return "Sidebar + Page header; Sidebar off → on";
    },
  },
  {
    id: "B-26", feature: "A phone Screen shows Top + Bottom navigation; a tablet is laid out as mobile or (Screen › Layout) desktop", wp: "app frame 2026-10-09",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "phone" });
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      await until(async () => (await frame.locator(".zen-top-nav").count()) > 0 && (await frame.locator(".zen-bottom-nav").count()) > 0, { message: "Top and Bottom navigation on the phone" });
      if ((await frame.locator(".zen-sidebar").count()) > 0) throw new Error("the Sidebar shows on a phone");
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id^="frame:screen:"]').first().click();
      await page.locator("#studio-right").getByRole("button", { name: /^Tablet,/ }).click();
      await until(async () => /<Screen [^>]*device="tablet"/.test((await pageText(page, id)) ?? ""), { message: "the Screen on tablet" });
      await page.locator("#studio-right").getByRole("button", { name: /^Laid out as desktop/ }).click();
      await until(async () => /\blayout="desktop"/.test((await pageText(page, id)) ?? ""), { message: 'layout="desktop"' });
      await until(async () => (await frame.locator(".zen-sidebar").count()) > 0 && (await frame.locator(".zen-bottom-nav").count()) === 0, { message: "the desktop frame on the tablet" });
      return "phone bars; tablet → desktop layout shows the Sidebar";
    },
  },
  {
    id: "B-27", feature: "The Screen's Sidebar and Page header have Figma's slots: Header-, Body-, Footer-Content (rows are layers; + adds a Menu item) and Action- / Trailing-Slots (+ adds a button)", wp: "slots 2026-10-09",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "desktop" });
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      await until(async () => (await frame.locator(".zen-sidebar__body .zen-sidebar__item").count()) === 3, { message: "three Menu-Item rows in the Sidebar's Body-Content" });
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      await focusScreen(page);
      const clickIn = async (locator, what) => {
        const box = await locator.first().boundingBox();
        if (!box) throw new Error(`${what} has no box on the canvas`);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await sleep(500);
      };
      // The Sidebar's empty header (no logo yet) picks the Sidebar itself.
      await clickIn(frame.locator(".zen-sidebar__header"), "the Sidebar header");
      await until(async () => (await selectedName(page)) === "Sidebar", { message: "the Sidebar selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await selectedName(page)})`); });
      const slots = page.locator("#studio-right .studio-slots__slot");
      await until(async () => (await slots.evaluateAll((els) => els.map((el) => el.getAttribute("data-slot")).join(","))) === "brand,children,footer", { message: "Slots: Header-Content, Body-Content, Footer-Content" });
      const tag = page.locator(".studio-slots__outline .studio-slots__tag", { hasText: "Body-Content" });
      await until(() => tag.count(), { message: "the Body-Content outline on the canvas" });
      await page.locator('#studio-right [data-slot="footer"]').getByRole("button", { name: "Add to Footer-Content" }).click();
      await page.getByRole("option", { name: /^Menu item/ }).first().click();
      await until(async () => /footer=\{<SidebarMenuItem id="invoices-\w+"/.test((await pageText(page, id)) ?? ""), { message: "footer={<SidebarMenuItem id=\"invoices-…\" …/>} in the page" });
      await until(async () => (await frame.locator(".zen-sidebar__footer-content .zen-sidebar__item").count()) === 1, { message: "the footer row on the Screen" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      // The Page header's title picks the header (its heading is the component's own part).
      await clickIn(frame.locator(".zen-page-header h1"), "the Page header title");
      await until(async () => (await selectedName(page)) === "PageHeader", { message: "the Page header selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await selectedName(page)})`); });
      await until(async () => (await slots.evaluateAll((els) => els.map((el) => el.getAttribute("data-slot")).join(","))) === "breadcrumbs,meta,actions,trailing,tabs", { message: "Slots: Breadcrumbs, Meta, Action-Slots, Trailing-Slots, Tabs" });
      await page.locator('#studio-right [data-slot="actions"]').getByRole("button", { name: "Add to Action-Slots" }).click();
      await page.getByRole("option", { name: /^Primary button/ }).first().click();
      await until(async () => /<PageHeader [^>]*actions=\{<Button level="primary"/.test((await pageText(page, id)) ?? ""), { message: "actions={<Button level=\"primary\" …>} in the page" });
      await until(async () => (await frame.locator(".zen-page-header__actions .zen-button").count()) === 1, { message: "the action on the Screen" });
      return "Sidebar: brand · children (3 rows) · footer (+ Menu item) · PageHeader: actions (+ Primary button) · trailing";
    },
  },
  {
    id: "B-28", feature: "Page header › Breadcrumbs on puts a real Breadcrumbs (not a text label) whose Item-List + adds an item; the Screen's Header is a slot (+ adds content); a Menu item outside a Sidebar keeps the row's padding", wp: "slots 2026-10-10",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "desktop" });
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      await focusScreen(page);
      const text = async () => (await pageText(page, id)) ?? "";
      // The Page header: its Breadcrumbs row is a switch (a slot), not a text field.
      await clickNamed(page, id, "PageHeader");
      await until(async () => (await selectedName(page)) === "PageHeader", { message: "the Page header selected" });
      const toggle = page.locator('#studio-right [data-prop="breadcrumbs"]').getByRole("switch", { name: "Breadcrumbs" });
      await toggle.click();
      await until(async () => /<PageHeader [^]*breadcrumbs=\{<Breadcrumbs /.test(await text()), { message: "breadcrumbs={<Breadcrumbs …/>} in the page" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      await until(async () => (await frame.locator(".zen-page-header__breadcrumbs .zen-breadcrumbs").count()) === 1, { message: "a real Breadcrumbs on the Screen" });
      // Its Item-List takes another item.
      const items = (await text()).match(/<Breadcrumbs [^]*?items=\{\[([^]*?)\]\}/)?.[1] ?? "";
      const before = (items.match(/\bid:/g) ?? []).length;
      // Breadcrumbs keeps the annotation off its DOM: selected by its box (⌘: the element itself).
      await selectAt(page, await frame.locator(".zen-page-header__breadcrumbs .zen-breadcrumbs").first().boundingBox());
      await until(async () => (await selectedName(page)) === "Breadcrumbs", { message: "the Breadcrumbs selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await selectedName(page)})`); });
      await page.locator("#studio-right").getByRole("button", { name: "Add Item to Item-List" }).click();
      await until(async () => (((await text()).match(/<Breadcrumbs [^]*?items=\{\[([^]*?)\]\}/)?.[1] ?? "").match(/\bid:/g) ?? []).length === before + 1, { message: `${before + 1} breadcrumb items` });
      // Up to the Screen (Esc: Breadcrumbs → PageHeader → Screen): its Header slot takes any content.
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await until(async () => (await selectedName(page)) === "Screen", { message: "the Screen selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await selectedName(page)})`); });
      await page.locator('#studio-right [data-slot="header"]').getByRole("button", { name: "Add to Header" }).click();
      await page.getByRole("option", { name: /^Search/ }).first().click();
      await until(async () => /header=\{<Stack gap="md">[^]*<PageHeader [^]*<Search /.test(await text()), { message: "the Header holds the PageHeader and a Search" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      // A Menu item placed outside a Sidebar still draws Figma's Menu-Item (padding and gap Small).
      await selectStack(page, id);
      await insertAsset(page, "Menu item");
      await until(async () => (await frame.locator(".studio-builder-screen__content .zen-sidebar__item").count()) === 1, { message: "the Menu item in the page's Stack" });
      const spacing = await frame.locator(".studio-builder-screen__content .zen-sidebar__item").first().evaluate((el) => { const style = getComputedStyle(el); return `${style.paddingLeft} ${style.columnGap}`; });
      if (spacing !== "12px 12px") throw new Error(`the row outside a Sidebar has padding/gap ${spacing}`);
      return `Breadcrumbs: ${before} → ${before + 1} items · Header: PageHeader + Search · Menu item outside a Sidebar: ${spacing}`;
    },
  },
  {
    id: "B-32", feature: "Menu Item-List as Figma's flat slot (user: \"hành vi tự do này áp dụng cho mọi nơi\"): + Separator, + Section title, + an item in that section, its label edited in the Menu's Properties, the separator removed", wp: "nested items 2026-10-10",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "desktop" });
      const menuItems = async () => {
        const text = (await pageText(page, id)) ?? "";
        const at = text.indexOf("<Menu");
        const list = at < 0 ? "" : text.slice(at).match(/items=\{\[[\s\S]*?\]\}\s*\n?\s*\/?>/)?.[0] ?? "";
        return [...list.matchAll(/type: "(group|separator)"|label: "([^"]*)"/g)].map((match) => (match[1] ? `<${match[1]}>` : match[2])).join(" ");
      };
      await selectStack(page, id);
      await insertAsset(page, "Menu");
      await until(async () => (await selectedName(page)) === "Menu", { message: "the Menu selected" });
      const block = page.locator('#studio-right .studio-slots__slot[data-slot="items"]');
      const add = async (label) => {
        await block.getByRole("button", { name: "Add to Item-List" }).click();
        await page.getByRole("menuitem", { name: label, exact: true }).click();
      };
      await add("Separator");
      await until(async () => /<separator>$/.test(await menuItems()), { message: "a separator at the end" });
      await add("Section title");
      const title = page.locator('#studio-right input[aria-label="Section title"]');
      await title.fill("Danger zone");
      await title.press("Enter");
      await until(async () => /<group> Danger zone$/.test(await menuItems()), { message: "the Danger zone group" });
      await block.getByRole("button", { name: "Add Item to Danger zone" }).click();
      await until(async () => /<group> Danger zone \w+/.test(await menuItems()), { message: "an item in Danger zone" });
      const label = page.locator('#studio-right [role="group"] [data-prop="label"] input').last();
      await label.fill("Delete project");
      await label.press("Enter");
      await until(async () => /Danger zone Delete project$/.test(await menuItems()), { message: "the grouped item renamed" });
      // The Delete key on a focused row removes it, as the trash button does.
      await block.locator("li", { hasText: "Separator" }).first().locator("button.studio-inspector__item").focus();
      await page.keyboard.press("Delete");
      await until(async () => /^Send reminder Download PDF <group> Danger zone Delete project$/.test(await menuItems()), { message: "the separator removed, the rest kept" }).catch(async (error) => { throw new Error(`${error.message} (items: ${await menuItems()})`); });
      return await menuItems();
    },
  },
  {
    id: "B-33", feature: "Several selected, everywhere (user: \"Hành vi này phải làm được ở mọi nơi trong thiết kế\"): Sidebar rows written as children ⇧A into a SidebarMenuSection; a TopNavigation action added on a page you make (proto.toast), two actions ⌘ / ⇧-clicked and ⇧A share one pill", wp: "nested items 2026-10-10",
    timeout: 60_000,
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "desktop" });
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      await focusScreen(page);
      // The Sidebar's empty header picks the Sidebar (B-27); its first row from Slots, the second ⇧-clicked in Layers.
      const head = await frame.locator(".zen-sidebar__header").first().boundingBox();
      await page.mouse.click(head.x + head.width / 2, head.y + head.height / 2);
      await until(async () => (await selectedName(page)) === "Sidebar", { message: "the Sidebar selected" });
      await page.locator("#studio-right .studio-slots__slot li").nth(0).locator("button.studio-inspector__item").click();
      await until(async () => (await selectedName(page)) === "SidebarMenuItem", { message: "the first row selected" });
      const rows = page.locator('.studio-layers__tree [role="treeitem"][data-kind="node"]', { hasText: "SidebarMenuItem" });
      await rows.nth(1).click({ modifiers: ["Shift"] });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+KeyA");
      await until(async () => /<SidebarMenuSection label="Section">\s*<SidebarMenuItem id="home"[^>]*\/>\s*<SidebarMenuItem id="projects"/.test((await pageText(page, id)) ?? ""), { message: "Home and Projects in a SidebarMenuSection" });
      const phone = await newPage(ctx, { device: "phone" });
      await selectStack(page, phone.id);
      await insertAsset(page, "Top navigation");
      await until(async () => (await selectedName(page)) === "TopNavigation", { message: "the TopNavigation selected" });
      await page.locator('#studio-right .studio-slots__slot[data-slot="trailing"]').getByRole("button", { name: /^Add Action/ }).click();
      const trailing = async () => ((await pageText(page, phone.id)) ?? "").match(/trailing=\{\[[\s\S]*?\]\}/)?.[0] ?? "";
      await until(async () => /label: "Share", onClick: proto\.toast/.test(await trailing()), { message: "a second action with proto.toast" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      const press = async (label, keys) => {
        const box = await page.locator(`[data-studio-frame^="screen:"] button[aria-label="${label}"]`).first().boundingBox();
        for (const key of keys) await page.keyboard.down(key);
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        for (const key of [...keys].reverse()) await page.keyboard.up(key);
        await sleep(400);
      };
      // The new action may be selected after its add: start from New task (its own panel names it).
      const onNewTask = async () => (await selectedName(page)).startsWith("Action · in ") && /New task · 1 of/.test(await page.locator("#studio-right").innerText());
      for (let k = 0; k < 4 && !(await onNewTask()); k++) await press("New task", ["ControlOrMeta"]);
      await until(onNewTask, { message: "New task selected" });
      await press("Share", ["Shift"]);
      await until(async () => (await selectedName(page)).startsWith("2 Actions"), { message: "2 Actions selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+KeyA");
      await until(async () => (await trailing()).match(/group: "new-task"/g)?.length === 2, { message: "both actions in one group" }).catch(async (error) => { throw new Error(`${error.message} (${(await trailing()).replace(/\s+/g, " ").slice(0, 300)})`); });
      return "Sidebar rows → SidebarMenuSection · TopNavigation: + Action (proto.toast) · 2 selected → ⇧A → one pill";
    },
  },
  {
    id: "B-31", feature: "Pages list: a double-click renames a page or a folder in place (user: \"cho phép double click sửa tên folder, project trực tiếp trên list\"); Escape keeps the name", wp: "pages 2026-10-10",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx);
      await showLeftTab(page, "pages");
      const field = page.locator("#studio-left input.studio-pages__rename");
      await page.locator("#studio-left .studio-pages__row", { hasText: name }).first().dblclick();
      await field.fill(`${name} v2`);
      await field.press("Enter");
      await until(async () => (await pageText(page, id))?.includes(JSON.stringify(`${name} v2`)), { message: "the page renamed" });
      await page.locator("#studio-left .studio-pages__row", { hasText: `${name} v2` }).first().dblclick();
      await field.fill("Not this");
      await field.press("Escape");
      await sleep(300);
      if (!(await pageText(page, id))?.includes(JSON.stringify(`${name} v2`))) throw new Error("Escape changed the name");
      await page.locator("#studio-left").getByRole("button", { name: "New folder" }).first().click();
      const dialog = page.getByRole("dialog", { name: "New folder" });
      const folder = `Flows ${Date.now().toString(36)}`;
      await dialog.getByLabel("Name").fill(folder);
      await dialog.getByRole("button", { name: "Create folder" }).click();
      const folderRow = page.locator("#studio-left .studio-folder__row", { hasText: folder }).first();
      await folderRow.dblclick();
      await field.fill(`${folder} v2`);
      await field.press("Enter");
      await until(async () => (await page.locator("#studio-left .studio-folder__row", { hasText: `${folder} v2` }).count()) === 1, { message: "the folder renamed" });
      // The Delete key (user: "xoá nên cho phép bấm phím xoá trên bàn phím"): a folder asks first, a page goes to Trash.
      const renamedRow = page.locator("#studio-left .studio-folder__row", { hasText: `${folder} v2` }).first();
      await renamedRow.focus();
      await page.keyboard.press("Delete");
      const ask = page.getByRole("alertdialog", { name: new RegExp(`Delete “${folder} v2”`) });
      await ask.waitFor({ state: "visible", timeout: 4000 });
      await ask.getByRole("button", { name: "Cancel" }).click();
      const pageRow = page.locator("#studio-left .studio-pages__row", { hasText: `${name} v2` }).first();
      await pageRow.focus();
      await page.keyboard.press("Delete");
      await until(async () => (await page.locator("#studio-left .studio-pages__row", { hasText: `${name} v2` }).count()) === 0, { message: "the page moved to Trash by Delete" });
      return "page renamed in place (Escape keeps it) · folder renamed in place · Delete: the folder asks, the page goes to Trash";
    },
  },
  {
    id: "B-29", feature: "Nested items: ⌘-click on a crumb or a tab selects that item (user: \"Không chỉnh được props của nested\"); a crumb's own Emphasis / Dash write that crumb (Figma's Item-List instance), a tab's Label its item and its Variant (passed by Tabs) the owner", wp: "nested items 2026-10-10",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "desktop" });
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      const text = async () => (await pageText(page, id)) ?? "";
      for (const label of ["Breadcrumbs", "Tab bar"]) {
        await selectStack(page, id);
        await insertAsset(page, label);
      }
      await until(async () => (await frame.locator(".zen-breadcrumbs").count()) === 1 && (await frame.locator('.zen-tabs [role="tab"]').count()) === 2, { message: "a Breadcrumbs and a Tab bar on the Screen" });
      await focusScreen(page);
      // ⌘-click selects the owner, a second ⌘-click on the selected owner its item (Figma's deep select).
      // The item's heading: "Tab · in Item-List of Tabs" (the owner's is "Tabs").
      const pickItem = async (locator, heading) => {
        const isItem = async () => (await selectedName(page)).startsWith(`${heading} · in `);
        for (let k = 0; k < 3 && !(await isItem()); k++) {
          const box = await locator.boundingBox();
          if (!box) throw new Error(`no box for the ${heading}`);
          await page.keyboard.down("ControlOrMeta");
          await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
          await page.keyboard.up("ControlOrMeta");
          await sleep(500);
        }
        await until(isItem, { message: `the ${heading} selected` }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await selectedName(page)})`); });
      };
      // A crumb: its own Emphasis (that crumb only), and its Dash, on while unset because a crumb follows it.
      await pickItem(frame.locator(".zen-breadcrumb__label", { hasText: "Projects" }).first(), "Item");
      await until(() => inspectorRow(page, "emphasis").count(), { message: "Emphasis on the crumb" });
      await pickOption(page, "emphasis", "medium");
      await until(async () => /\{ id: "projects", label: "Projects", emphasis: "medium" \}/.test(await text()), { message: 'the crumb { …, emphasis: "medium" } in the page' }).catch(async (error) => { throw new Error(`${error.message} (${(await text()).match(/<Breadcrumbs [^<]*/)?.[0]}; status: ${await statusText(page)})`); });
      const dash = inspectorRow(page, "dash").getByRole("switch");
      if ((await dash.getAttribute("aria-checked")) !== "true") throw new Error("Dash reads off on a crumb a chevron follows");
      await dash.click();
      await until(async () => /emphasis: "medium", dash: false \}/.test(await text()), { message: "the crumb's dash: false in the page" });
      await until(async () => (await frame.locator(".zen-breadcrumbs__item").first().locator(".zen-breadcrumbs__separator").count()) === 0, { message: "no chevron after the first crumb" });
      // A tab: found by its key (Tabs passes the fields one by one), its Label writes the item, Variant writes Tabs.
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await pickItem(frame.locator('.zen-tabs [role="tab"]', { hasText: "Activity" }).first(), "Tab");
      const label = inspectorRow(page, "label").locator("input").first();
      await label.fill("History");
      await label.press("Enter");
      await until(async () => /\{ id: "activity", label: "History" \}/.test(await text()), { message: '{ id: "activity", label: "History" } in the page' }).catch(async (error) => { throw new Error(`${error.message} (${(await text()).match(/<Tabs [^<]*/)?.[0]}; status: ${await statusText(page)})`); });
      await pickItem(frame.locator('.zen-tabs [role="tab"]', { hasText: "History" }).first(), "Tab");
      await pickOption(page, "variant", "Subtle");
      await until(async () => /<Tabs [^<]*variant="subtle"/.test(await text()), { message: '<Tabs … variant="subtle"> in the page' }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      return "crumb › Emphasis medium + Dash off → that crumb · tab › Label History → its item · tab › Variant Subtle → Tabs variant";
    },
  },
];

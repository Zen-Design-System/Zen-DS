// Builder rows (Studio builder GĐ2 M1, spec docs/research/studio-builder-pages-spec-2026-10-06.md): a page made in the
// Studio and kept in the browser (IndexedDB), edited with the same tools as example code. Each row makes its own page.
import fs from "node:fs";
import path from "node:path";
import { pagesDirOf } from "../lib/server.mjs";
import { inspectorRow, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { pickOption } from "./inspector.mjs";

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
  await page.getByRole("button", { name: "New page", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New page" });
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await dialog.getByLabel("Title").fill(name);
  await dialog.getByRole("button", { name: device === "phone" ? "Phone" : device === "tablet" ? "Tablet" : "Desktop" }).click();
  await dialog.getByRole("button", { name: "Create page" }).click();
  await until(async () => page.url() !== from && /page=local%3A/.test(page.url()) && (await page.locator('[data-studio-frame^="screen:"]').count()) > 0, { message: "the new page on the canvas" });
  const id = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
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

/** Clicks the n-th element of the page named `name` (its centre, through the canvas picker). */
export async function clickNamed(page, id, name, index = 0) {
  const target = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).nth(index);
  await target.waitFor({ state: "attached", timeout: 5000 }).catch(async () => { throw new Error(`no <${name}> of ${id} on the canvas (url ${page.url()})`); });
  const box = await target.boundingBox();
  if (!box) throw new Error(`<${name}> has no box on the canvas`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
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
  await showLeftTab(page, "assets");
  await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill(label);
  await page.locator(".studio-assets__row", { hasText: new RegExp(`^${label}`) }).first().click();
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
  const row = mineRow(page, name);
  await row.hover();
  await row.getByRole("button", { name: `${name} actions` }).click();
  await page.getByRole("menuitem", { name: action }).click();
}

/** Chooses one of the My pages options. */
async function mineOption(page, action) {
  await showLeftTab(page, "pages");
  await page.getByRole("button", { name: "My pages options" }).click();
  await page.getByRole("menuitem", { name: action }).click();
}

const listed = async (page, name) => (await mineRow(page, name).count()) > 0;

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
      if (!/import \{ Button, Stack, Text \} from "@zen-ds\/react";/.test(text)) throw new Error("Button not imported from the package");
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
    id: "B-04", feature: "Layout on a page: the Stack's gap through the Layout section", wp: "GĐ2 M1",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await pickOption(page, "gap", /^xl · /);
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
      if (!/Kept in/.test(await page.locator('[data-storage="mirror"]').innerText())) throw new Error("the panel does not say the folder keeps the pages");
      return `${id}.zen.tsx written, same text as the browser`;
    },
  },
  {
    id: "B-08", feature: "Rename a page from its row's menu (header title, list, folder)", wp: "GĐ2 M2",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx);
      const renamed = `${name} renamed`;
      await pageAction(page, name, /^Rename/);
      const dialog = page.getByRole("dialog", { name: "Rename page" });
      await dialog.getByLabel("Title").fill(renamed);
      await dialog.getByRole("button", { name: "Rename" }).click();
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
      await until(async () => decodeURIComponent(page.url()).includes(`page=local:${id}-copy`), { message: "the copy opened" });
      const copy = await pageText(page, `${id}-copy`);
      if (!copy?.includes(JSON.stringify(`${name} copy`))) throw new Error("the copy's header is not renamed");
      if (!(await listed(page, `${name} copy`))) throw new Error("the copy is not listed");
      return `${id}-copy opened`;
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
      const before = await pageText(page, id);
      await selectStack(page, id);
      await insertAsset(page, "Badge");
      await until(async () => /<Badge/.test((await pageText(page, id)) ?? ""), { message: "a Badge" });
      await pageAction(page, name, /^Version history/);
      const dialog = page.getByRole("dialog", { name: "Version history" });
      await dialog.getByRole("button", { name: "Restore" }).first().click();
      await until(async () => (await pageText(page, id)) === before, { message: "the text from before the Badge" });
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
      if (!/import \{ Board, Overlay, Screen, proto \} from "@zen-ds\/react\/builder";/.test(text)) throw new Error("Overlay not imported");
      if (!/import \{[^}]*\bDialog\b[^}]*\} from "@zen-ds\/react";/.test(text)) throw new Error("Dialog not imported");
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
];

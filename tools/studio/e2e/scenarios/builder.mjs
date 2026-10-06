// Builder rows (Studio builder GĐ2 M1, spec docs/research/studio-builder-pages-spec-2026-10-06.md): a page made in the
// Studio and kept in the browser (IndexedDB), edited with the same tools as example code. Each row makes its own page.
import { inspectorRow, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { pickOption } from "./inspector.mjs";

/** The page's text as the browser keeps it (IndexedDB "zen-studio-builder"). */
const pageText = (page, id) => page.evaluate((key) => new Promise((resolve) => {
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
async function newPage(ctx, { title, device = "phone" } = {}) {
  const { page } = await ctx.studio();
  made += 1;
  const name = title ?? `Builder ${made} ${Date.now().toString(36)}`;
  const from = page.url();
  await showLeftTab(page, "pages");
  await page.getByRole("button", { name: "New page" }).click();
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
async function focusScreen(page) {
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
async function clickNamed(page, id, name, index = 0) {
  const target = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).nth(index);
  await target.waitFor({ state: "attached", timeout: 5000 }).catch(async () => { throw new Error(`no <${name}> of ${id} on the canvas (url ${page.url()})`); });
  const box = await target.boundingBox();
  if (!box) throw new Error(`<${name}> has no box on the canvas`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await sleep(500);
}

/** The Inspector's heading: the selected layer's name. */
const selectedName = async (page) => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim();

/** Selects the screen's Stack (its heading, then Escape to the parent). */
async function selectStack(page, id) {
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
      if (!/import \{ Button, Stack, Text \} from "@zen\/design-system";/.test(text)) throw new Error("Button not imported from the package");
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
      await pickOption(page, "level", "primary");
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
];

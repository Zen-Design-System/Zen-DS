// Builder rows (Studio builder GĐ2 M1, spec docs/research/studio-builder-pages-spec-2026-10-06.md): a page made in the
// Studio and kept in the browser (IndexedDB), edited with the same tools as example code. Each row makes its own page.
import fs from "node:fs";
import path from "node:path";
import { pagesDirOf } from "../lib/server.mjs";
import { inspectorRow, openAssetLibrary, openStudioSpace, selectAt, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { pickOption, scaleStep } from "./inspector.mjs";
import { codeWordsIn } from "../../../../src/platform/studio/words.ts";

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

/** A page as the Studio wrote it before the master layout (2026-10-15): the Screen's own Sidebar and Page header, and a
 *  template's AppShell with its own Sidebar and a Page header in its content. */
const legacyFramePage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { AppShell, PageHeader, Sidebar, SidebarMenuItem, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop"
        sidebar={<Sidebar aria-label="Main" selectedId="home">
          <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />
        </Sidebar>}
        header={<PageHeader title=${JSON.stringify(title)} />}>
        <AppShell
          sidebar={<Sidebar aria-label="Main" selectedId="dashboard">
            <SidebarMenuItem id="dashboard" label="Dashboard" icon="icon-home-03-line" />
          </Sidebar>}
        >
          <Stack gap="lg" padding="xl">
            <PageHeader title="Dashboard" />
            <Text tone="base">Revenue this month</Text>
          </Stack>
        </AppShell>
      </Screen>
    </Board>
  );
}
`;

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
  // A page with its AppShell (2026-10-18: Empty page is the default, the AppShell a choice) on a desktop Screen…
  await dialog.getByText("Page with AppShell", { exact: true }).click();
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
  // The page's first Screen: screen-1 by its id (Layers lists the front-most frame on top, as Figma: F1 2026-10-18),
  // else the lowest frame row.
  const first = page.locator('[data-layer-id="frame:screen:screen-1"]');
  const row = (await first.count()) ? first.first() : page.locator('[data-layer-id^="frame:screen:"]').last();
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
export async function mineOption(page, action) {
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


/** A header page (user, 2026-10-16: header slots as Figma's): a root AppShell whose top bar holds one Search and whose
 *  actions are a fragment of three layers, and a phone Screen with a desktop-only and a phone-only Text. */
const headerSlotsPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, Badge, Search, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop">
        <AppShell
          header={<AppShellHeader
            leading={<Search aria-label="Search" placeholder="Search expenses" />}
            actions={<><Badge theme="neutral">Pro</Badge><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={4} /><AppShellAccount name="Khoa Dang" /></>}
          />}
        >
          <Stack gap="md" padding="xl">
            <Text>Always</Text>
            <Text hidden="mobile">Desktop only</Text>
            <Text hidden="desktop">Phone only</Text>
          </Stack>
        </AppShell>
      </Screen>
      <Screen id="screen-2" title="Phone" device="phone">
        <Stack gap="md" padding="lg">
          <Text>Always</Text>
          <Text hidden="mobile">Desktop only</Text>
          <Text hidden="desktop">Phone only</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** A new page whose text is `text(name)`, written to the pages folder and synced into the browser (as B-36 does). */
export async function seededPage(ctx, text, has) {
  const { page, id, name } = await newPage(ctx, { device: "desktop" });
  await until(async () => (folderText(ctx, id) ?? "").includes(JSON.stringify(name)), { message: "the named page in the folder" });
  await sleep(500);
  fs.writeFileSync(path.join(ctx.root, pagesDirOf(ctx.server.port), `${id}.zen.tsx`), text(name));
  await mineOption(page, /^Sync with the folder/);
  await until(async () => has.test((await pageText(page, id)) ?? ""), { message: "the seeded page in the browser" });
  await page.reload();
  await page.locator('[data-studio-frame^="screen:"]').first().waitFor({ state: "attached", timeout: 10000 });
  return { page, id, name, text: async () => (await pageText(page, id)) ?? "" };
}


/** A page whose desktop and phone Screens share a master layout and have no phone parts yet (user, 2026-10-16: the
 *  phone header drawn from the desktop's, component-usage-rules §17). */
const phoneHeaderPage = (title) => {
  const shell = (indent) => [
    `${indent}<AppShell`,
    `${indent}  sidebar={<Sidebar aria-label="Main" selectedId="invoices">`,
    `${indent}    <SidebarMenuItem id="home" label="Home" icon="icon-home-03-line" />`,
    `${indent}    <SidebarMenuItem id="projects" label="Projects" icon="icon-folder-line" />`,
    `${indent}    <SidebarMenuItem id="invoices" label="Invoices" icon="icon-receipt-line" />`,
    `${indent}  </Sidebar>}`,
    `${indent}  header={<AppShellHeader`,
    `${indent}    actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={2} /><AppShellAccount name="Khoa Dang" /></>}`,
    `${indent}    main={<PageHeader title="Invoices" actions={<Button level="primary">New invoice</Button>} />}`,
    `${indent}  />}`,
    `${indent}>`,
    `${indent}  <Stack gap="md" padding="xl">`,
    `${indent}    <Text>INV-1024</Text>`,
    `${indent}  </Stack>`,
    `${indent}</AppShell>`,
  ].join("\n");
  return `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen } from "@zen-ds/react/builder";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, Button, PageHeader, Sidebar, SidebarMenuItem, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop">
${shell("        ")}
      </Screen>
      <Screen id="screen-2" title="Phone" device="phone">
${shell("        ")}
      </Screen>
    </Board>
  );
}
`;
};
/** One Screen's code in the page text. */
const screenCode = (text, id) => { const at = text.indexOf(`<Screen id="${id}"`); return at < 0 ? "" : text.slice(at, text.indexOf("</Screen>", at)); };
/** A Screen's opening tag: up to its first `>` outside braces (its slot props hold JSX). */
const screenTag = (text, id) => {
  const at = text.indexOf(`<Screen id="${id}"`);
  if (at < 0) return "";
  let depth = 0;
  for (let k = at; k < text.length; k++) {
    if (text[k] === "{") depth += 1;
    else if (text[k] === "}") depth -= 1;
    else if (text[k] === ">" && depth === 0) return text.slice(at, k + 1);
  }
  return text.slice(at);
};

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
      if (!/import \{[^}]*\bButton\b[^}]*\} from "@zen-ds\/react";/.test(text)) throw new Error("Button not imported from the package");
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
    id: "B-35", feature: "Design words on a page you made (plan criterion 7): the status line, the canvas tag, the Inspector header, its notes and tooltips name no file:line and no code ({…}, <Tag>, prop, children); a refusal too", wp: "design words 2026-10-12",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await selectStack(page, id);
      await insertAsset(page, "Button");
      await until(async () => ((await pageText(page, id)) ?? "").match(/<Button /g)?.length === 1, { message: "one Button" });
      await sleep(400);
      await clickNamed(page, id, "Button");
      const read = () => page.evaluate(() => {
        const texts = (selector) => [...document.querySelectorAll(selector)].map((el) => el.textContent ?? "");
        return {
          status: texts(".studio-inspector__status-text, .studio-inspector__status-details li"),
          tag: texts('.studio-selection__outline[data-kind="selected"] .studio-selection__tag'),
          header: texts("#studio-right .studio-inspector__src"),
          notes: texts("#studio-right .studio-inspector__note, #studio-right .studio-inspector__row-hint"),
          tips: [...document.querySelectorAll("#studio-right [title]")].map((el) => el.getAttribute("title") ?? ""),
        };
      });
      const findings = (seen) => Object.entries(seen).flatMap(([where, list]) => list.flatMap((text) => codeWordsIn(text).map((word) => `${where}: ${word} in "${text.slice(0, 90)}"`)));
      await until(async () => (await read()).header.join() === "Show code", { message: 'the Inspector header reads "Show code"' }).catch(async (error) => { throw new Error(`${error.message} (header: ${(await read()).header.join(" | ")})`); });
      // The edit's own line: "Saved in this browser · ⌘Z to undo"-like, never the page's file and line.
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => ((await pageText(page, id)) ?? "").match(/<Button /g)?.length === 2, { message: "two Buttons after ⌘D" });
      await until(async () => /Duplicated|Saved/.test(await statusText(page)), { message: "the duplicate's line in the status" });
      const afterEdit = await read();
      const found = findings(afterEdit);
      if (found.length) throw new Error(`code words on a Studio page: ${found.slice(0, 6).join(" · ")}`);
      // A refusal (an item that keeps state) speaks design words too.
      await selectStack(page, id);
      await insertAsset(page, "Tabs");
      await until(async () => /keeps state or code/.test(await statusText(page)), { message: "the refusal in the status" });
      const refused = findings({ status: [await statusText(page)] });
      if (refused.length) throw new Error(`code words in the refusal: ${refused.join(" · ")}`);
      return `header "Show code" · status "${afterEdit.status[0]?.slice(0, 40)}" · tag "${afterEdit.tag[0]}" · ${afterEdit.notes.length} notes, ${afterEdit.tips.length} tips clean`;
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
      await page.getByRole("menuitem", { name: "Dialog" }).click(); // Add overlay asks what it holds
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
    id: "B-16", feature: "Play (⌥⌘↵): the Button navigates, Back returns, R restarts, Esc leaves", wp: "GĐ2 M3",
    async run(ctx) {
      const { page, id } = await flowPage(ctx);
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      await setAction(page, "Navigate to", "Screen 2");
      await until(async () => /proto\.navigate\("screen-2"\)/.test((await pageText(page, id)) ?? ""), { message: "the action" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
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
      await page.getByRole("menuitem", { name: "Dialog" }).click(); // Add overlay asks what it holds
      await until(async () => /<Overlay id="overlay-1">/.test((await pageText(page, id)) ?? ""), { message: "overlay-1" });
      await sleep(400);
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      await setAction(page, "Open overlay", "Are you sure?"); // an Overlay is listed by its dialog's title
      await until(async () => /onClick=\{proto\.open\("overlay-1"\)\}/.test((await pageText(page, id)) ?? ""), { message: "the open action" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
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
    id: "B-20", feature: "Toolbar › Frame on a page you made: the right panel lists Figma's frame presets (Phone, Tablet, Desktop…); Phone › iPhone adds an empty 390 × 844 phone frame beside the page's frame, selected, and the tool goes back to Move (user 2026-10-19: \"Như Figma\")", wp: "toolbar 2026-10-09, free frames 2026-10-15, frame presets F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await page.locator(".studio-canvas-tools").getByRole("button", { name: "Frame", exact: true }).click();
      const presets = page.locator("#studio-right").getByRole("region", { name: "Frame presets" });
      await presets.waitFor({ state: "visible", timeout: 5000 });
      for (const group of ["Phone", "Tablet", "Desktop", "Presentation", "Watch", "Paper", "Social media"]) {
        if (!(await presets.getByRole("button", { name: group, exact: true }).count())) throw new Error(`no ${group} group in the presets`);
      }
      await presets.getByRole("list", { name: "Phone" }).getByRole("button", { name: /^iPhone\s*390 × 844$/ }).click();
      await until(async () => /<Screen id="screen-2"/.test((await pageText(page, id)) ?? ""), { message: "a second Screen" });
      const text = (await pageText(page, id)) ?? "";
      const first = screenTag(text, "screen-1");
      const added = screenTag(text, "screen-2");
      if (!/device="phone"/.test(added)) throw new Error(`the new Screen is not a phone: ${added}`);
      if (!/width=\{390\} height=\{844\}/.test(added)) throw new Error(`the new Screen is not 390 × 844: ${added}`);
      // Beside the page's frame (Figma places a preset frame right of the frames), top-aligned.
      const x = Number(first.match(/\sx=\{(-?\d+)\}/)?.[1] ?? 0);
      const y = Number(first.match(/\sy=\{(-?\d+)\}/)?.[1] ?? 0);
      const width = Number(first.match(/\swidth=\{(\d+)\}/)?.[1] ?? (/device="phone"/.test(first) ? 390 : 1440));
      if (!added.includes(` x={${x + width + 96}} y={${y}}`)) throw new Error(`the new Screen is not beside the first (${added} · first ${first.replace(/\s+/g, " ").slice(0, 160)})`);
      await until(async () => (await page.locator(".studio-canvas-tools").getByRole("button", { name: "Move", exact: true }).getAttribute("aria-pressed")) === "true", { message: "back to Move" });
      // The Studio selects the new frame once the board shows it, waiting up to 10 s (board/frames.ts): a loaded full
      // run can take longer than until's 6 s to show it.
      await until(async () => (await page.locator('[data-studio-frame="screen:screen-2"]').getAttribute("data-selected")) === "true", { timeout: 12_000, message: "the new frame selected" });
      return "Frame tool → presets › Phone › iPhone → an empty 390 × 844 phone frame beside screen-1, selected, Move again";
    },
  },
  {
    id: "B-45", feature: "Toolbar › Frame, a click on the canvas (Figma's): an empty 100 × 100 frame named Frame 2 at the click, no device chrome, no menu (user 2026-10-19)", wp: "frame presets F4 2026-10-19",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await page.locator(".studio-canvas-tools").getByRole("button", { name: "Frame", exact: true }).click();
      // On the empty canvas right of the page's frame (inside a frame the Frame tool draws a frame in it).
      const first = await page.locator('[data-studio-frame="screen:screen-1"]').boundingBox();
      const view = await page.locator(".studio-viewport").boundingBox();
      const at = { x: Math.min(first.x + first.width + 80, view.x + view.width - 420), y: Math.max(first.y, view.y + 80) };
      await page.mouse.move(at.x, at.y);
      await page.mouse.down();
      await page.mouse.up();
      await until(async () => /<Screen id="screen-2"/.test((await pageText(page, id)) ?? ""), { message: "a second frame" });
      if (await page.getByRole("menu", { name: "New frame" }).count()) throw new Error("a click still asks for a frame kind");
      const text = (await pageText(page, id)) ?? "";
      const frame = text.match(/<Screen id="screen-2"[^>]*>/)?.[0] ?? "";
      if (!/width=\{100\} height=\{100\}/.test(frame)) throw new Error(`the frame is not 100 × 100: ${frame}`);
      if (/device="(phone|tablet)"/.test(frame)) throw new Error(`the frame has a device: ${frame}`);
      if (!/title="Frame 2"/.test(frame)) throw new Error(`the frame is not named Frame 2: ${frame}`);
      const own = text.slice(text.indexOf('<Screen id="screen-2"')).split(/(?=<Screen )/)[0];
      if (/<(AppShell|Sidebar|PageHeader|TopNavigation|BottomNavigation)\b/.test(own)) throw new Error("the frame came with an app frame");
      // At the click: its top-left is where the pointer was.
      const placed = await page.locator('[data-studio-frame="screen:screen-2"]').boundingBox();
      if (!placed || Math.abs(placed.x - at.x) > 3 || Math.abs(placed.y - at.y) > 3) throw new Error(`the frame is not at the click (${placed ? `${Math.round(placed.x)},${Math.round(placed.y)}` : "none"})`);
      return "Frame tool click → an empty 100 × 100 frame (Frame 2) at the click";
    },
  },
  {
    id: "B-46", feature: "Screen › Size (Figma's frame presets): iPhone → iPad, portrait writes the tablet's device and 744 × 1133 in one edit (one ⌘Z back to the phone) (user 2026-10-18)", wp: "frame picker 2026-10-18",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      await page.locator(".studio-canvas-tools").getByRole("button", { name: "Frame", exact: true }).click();
      await page.locator("#studio-right").getByRole("list", { name: "Phone" }).getByRole("button", { name: /^iPhone\s*390 × 844$/ }).click();
      const screen2 = async () => ((await pageText(page, id)) ?? "").match(/<Screen id="screen-2"[^>]*>/)?.[0] ?? "";
      await until(async () => /width=\{390\} height=\{844\}/.test(await screen2()), { message: "a 390 × 844 iPhone Screen" });
      // The new Screen is selected: its Screen section shows Size iPhone.
      const size = page.locator('#studio-right [data-prop="screen-size"] button').first();
      await until(async () => /iPhone/.test(await size.innerText().catch(() => "")), { message: "Size reads iPhone" });
      await size.click();
      await page.getByRole("option", { name: /^iPad, portrait/ }).click();
      await until(async () => { const tag = await screen2(); return /device="tablet"/.test(tag) && /width=\{744\} height=\{1133\}/.test(tag); }, { message: "Size › iPad, portrait → a 744 × 1133 tablet" });
      const tablet = await screen2();
      if (/layout="desktop"/.test(tablet)) throw new Error(`a portrait iPad got the desktop layout: ${tablet}`);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => { const tag = await screen2(); return /device="phone"/.test(tag) && /width=\{390\} height=\{844\}/.test(tag); }, { message: "one ⌘Z brings the phone back" });
      return "Size iPhone → iPad, portrait: device tablet, 744 × 1133 in one edit; ⌘Z → iPhone 390 × 844";
    },
  },
  {
    id: "B-37", feature: "Free frames: a Screen dragged by its name moves there (x, y in the page, one ⌘Z); ⌥-drag drops a copy and leaves the Screen", wp: "free frames 2026-10-15",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      const label = page.locator('.studio-frame-label[data-chrome-key="label:screen:screen-1"]');
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      const drag = async (dx, dy, alt) => {
        const box = await label.boundingBox();
        const from = { x: box.x + 8, y: box.y + box.height / 2 };
        await page.mouse.move(from.x, from.y);
        if (alt) await page.keyboard.down("Alt");
        await page.mouse.down();
        for (let step = 1; step <= 6; step += 1) await page.mouse.move(from.x + (dx * step) / 6, from.y + (dy * step) / 6);
        await page.mouse.up();
        if (alt) await page.keyboard.up("Alt");
      };
      // A Screen's opening tag (its app frame's props make it several lines): x / y, null without a place.
      const placeOf = async (screen) => {
        const text = (await pageText(page, id)) ?? "";
        const start = text.indexOf(`<Screen id="${screen}"`);
        if (start < 0) return null;
        const match = text.slice(start, text.indexOf("<Stack", start)).match(/\bx=\{(-?\d+)\}\s+y=\{(-?\d+)\}/);
        return match ? [Number(match[1]), Number(match[2])] : null;
      };
      const before = await frame.boundingBox();
      // Towards the open canvas (a drag over a side panel pans, as in Figma).
      await drag(150, 100, false);
      await until(async () => (await placeOf("screen-1")) !== null, { message: "screen-1 placed" });
      const moved = await frame.boundingBox();
      // The 3 px threshold and a snap may take a few px; the frame follows the pointer.
      if (Math.abs(moved.x - before.x - 150) > 8 || Math.abs(moved.y - before.y - 100) > 8) throw new Error(`moved by ${Math.round(moved.x - before.x)}, ${Math.round(moved.y - before.y)} (expected 150, 100)`);
      await drag(200, 0, true);
      await until(async () => (await placeOf("screen-2")) !== null, { message: "a copy screen-2" });
      const stayed = await frame.boundingBox();
      if (Math.abs(stayed.x - moved.x) > 1 || Math.abs(stayed.y - moved.y) > 1) throw new Error("the ⌥-dragged Screen moved");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
      await until(async () => !/<Screen id="screen-2"/.test((await pageText(page, id)) ?? ""), { message: "⌘Z takes the copy back" });
      return "moved by its name, ⌥ copy at the drop, ⌘Z";
    },
  },
  {
    id: "B-44", feature: "Delete on a selected Screen of a page you made removes it, from its name on the canvas (one ⌘Z brings it back)", wp: "user 2026-10-16: \"Chưa bấm delete frame màn hình\"",
    async run(ctx) {
      const { page, id } = await newPage(ctx);
      // A second Screen to delete: ⌥-drag screen-1 by its name drops a copy (B-37).
      const label1 = page.locator('.studio-frame-label[data-chrome-key="label:screen:screen-1"]');
      const box = await label1.boundingBox();
      const from = { x: box.x + 8, y: box.y + box.height / 2 };
      await page.mouse.move(from.x, from.y);
      await page.keyboard.down("Alt");
      await page.mouse.down();
      for (let step = 1; step <= 6; step += 1) await page.mouse.move(from.x + (200 * step) / 6, from.y);
      await page.mouse.up();
      await page.keyboard.up("Alt");
      const has = async (screen) => new RegExp(`<Screen id="${screen}"`).test((await pageText(page, id)) ?? "");
      await until(() => has("screen-2"), { message: "a copy screen-2" });
      // Select it by its name (the click focuses the name's button) and press Delete, as a person does.
      await page.locator('.studio-frame-label[data-chrome-key="label:screen:screen-2"]').click();
      await page.keyboard.press("Delete");
      await until(async () => !(await has("screen-2")) && (await has("screen-1")), { message: "Delete removes screen-2 and keeps screen-1" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press(process.platform === "darwin" ? "Meta+z" : "Control+z");
      await until(() => has("screen-2"), { message: "⌘Z brings screen-2 back" });
      return "Delete from the frame's name removes it · ⌘Z restores";
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
      if (!items.some((item) => /Add auto layout/.test(item))) throw new Error(`not the layer menu (${items.slice(0, 4).join(", ")})`);
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
      if (!/import \{ [^}]*\bSidebarMenuItem\b[^}]* \} from "@zen-ds\/react";/.test(text)) throw new Error("SidebarMenuItem is not imported");
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
    id: "B-25", feature: "A blank page comes with its app frame (desktop: Sidebar + Page header); Screen › Sidebar (a toggle) switches it off and on, keeping its rows (hiddenSlots, 2026-10-16)", wp: "app frame 2026-10-09",
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
      // Off hides the part and keeps its rows (user, 2026-10-16: as Figma's boolean), so on brings the same Sidebar back.
      await until(async () => /hiddenSlots=\{\["sidebar"\]\}/.test((await pageText(page, id)) ?? "") && /\bsidebar=\{<Sidebar /.test((await pageText(page, id)) ?? ""), { message: "the sidebar hidden, its rows kept" });
      await until(async () => (await frame.locator(".zen-sidebar").count()) === 0, { message: "no Sidebar on the Screen" });
      await toggle.click();
      await until(async () => !/hiddenSlots/.test((await pageText(page, id)) ?? "") && /\bsidebar=\{<Sidebar /.test((await pageText(page, id)) ?? ""), { message: "the Sidebar shown again" });
      await until(async () => (await frame.locator(".zen-sidebar").count()) > 0, { message: "the Sidebar back on the Screen" });
      return "Sidebar + Page header; Sidebar off → on";
    },
  },
  {
    id: "B-26", feature: "A phone Screen shows Top + Bottom navigation and the page without its master layout (AppShell); a tablet is laid out as mobile or (Screen › Layout) desktop, where the AppShell's Sidebar is a drawer (narrower than 1024)", wp: "app frame 2026-10-09, master layout 2026-10-15",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "phone" });
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      await until(async () => (await frame.locator(".zen-top-nav").count()) > 0 && (await frame.locator(".zen-bottom-nav").count()) > 0, { message: "Top and Bottom navigation on the phone" });
      if ((await frame.locator(".zen-sidebar, .zen-app-shell").count()) > 0) throw new Error("the master layout (AppShell, Sidebar) shows on a phone");
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id^="frame:screen:"]').first().click();
      await page.locator("#studio-right").getByRole("button", { name: /^Tablet,/ }).click();
      await until(async () => /<Screen [^>]*device="tablet"/.test((await pageText(page, id)) ?? ""), { message: "the Screen on tablet" });
      await page.locator("#studio-right").getByRole("button", { name: /^Laid out as desktop/ }).click();
      await until(async () => /\blayout="desktop"/.test((await pageText(page, id)) ?? ""), { message: 'layout="desktop"' });
      // AppShell's own breakpoint: under 1024 its Sidebar opens as a drawer from the top bar's menu button.
      await until(async () => (await frame.locator('.zen-app-shell .zen-app-shell-header__toggle [aria-haspopup="dialog"]').count()) === 1 && (await frame.locator(".zen-bottom-nav, .zen-top-nav").count()) === 0, { message: "the master layout on the tablet (its Sidebar behind the menu button), no phone bars" });
      return "phone bars, no AppShell; tablet → desktop layout shows the AppShell, its Sidebar a drawer";
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
    id: "B-28", feature: "Page header › Breadcrumbs on puts a real Breadcrumbs (not a text label) whose Item-List + adds an item; the master layout's Sections (the AppShell's, under the top bar) is a slot (+ adds content); a Menu item outside a Sidebar keeps the row's padding", wp: "slots 2026-10-10, master layout 2026-10-15",
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
      // Up to the master layout's header (Esc: Breadcrumbs → PageHeader → AppShellHeader): its Sections slot takes any content.
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await until(async () => (await selectedName(page)) === "AppShellHeader", { message: "the AppShellHeader selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await selectedName(page)})`); });
      await page.locator('#studio-right [data-slot="sections"]').getByRole("button", { name: "Add to Sections" }).click();
      await page.getByRole("option", { name: /^Search/ }).first().click();
      await until(async () => /main=\{<PageHeader [^]*sections=\{<Search /.test(await text()), { message: "the Main row holds the PageHeader, the Sections a Search" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      // A Menu item placed outside a Sidebar still draws Figma's Menu-Item (padding and gap Small).
      await selectStack(page, id);
      await insertAsset(page, "Menu item");
      await until(async () => (await frame.locator(".zen-app-shell__main .zen-sidebar__item").count()) === 1, { message: "the Menu item in the page's Stack" });
      const spacing = await frame.locator(".zen-app-shell__main .zen-sidebar__item").first().evaluate((el) => { const style = getComputedStyle(el); return `${style.paddingLeft} ${style.columnGap}`; });
      if (spacing !== "12px 12px") throw new Error(`the row outside a Sidebar has padding/gap ${spacing}`);
      return `Breadcrumbs: ${before} → ${before + 1} items · Main: PageHeader, Sections: Search · Menu item outside a Sidebar: ${spacing}`;
    },
  },
  {
    id: "B-36", feature: "A page made before the master layout (its Screen's own Sidebar and Page header beside a template's AppShell: two Sidebars) opens with one Sidebar and one Page header, in the AppShell; Screen › Sidebar reads the AppShell's", wp: "master layout 2026-10-15",
    async run(ctx) {
      const { page, id, name } = await newPage(ctx, { device: "desktop" });
      // The folder has the page once its name is there (an earlier push would overwrite the old page written below).
      await until(async () => (folderText(ctx, id) ?? "").includes(JSON.stringify(name)), { message: "the named page in the folder" });
      await sleep(500);
      // The page as the Studio kept it before 2026-10-15 (user: "trang Dashboard tôi vừa tạo từ template bị lỗi").
      fs.writeFileSync(path.join(ctx.root, pagesDirOf(ctx.server.port), `${id}.zen.tsx`), legacyFramePage(name));
      await mineOption(page, /^Sync with the folder/);
      // The folder is watched (2026-10-16): the old page may already be moved to the master layout when it arrives, as
      // opening it does (the template's Sidebar, selectedId "dashboard", is how its text shows either way).
      await until(async () => /<Screen [^>]*\bsidebar=\{|selectedId="dashboard"/.test((await pageText(page, id)) ?? ""), { message: "the old page in the browser" }).catch(async (error) => { throw new Error(`${error.message} (browser: ${((await pageText(page, id)) ?? "").slice(0, 400).replace(/\s+/g, " ")} · folder: ${(folderText(ctx, id) ?? "").slice(0, 200).replace(/\s+/g, " ")})`); });
      await page.reload();
      const text = async () => (await pageText(page, id)) ?? "";
      await until(async () => !/<Screen [^>]*\bsidebar=\{/.test(await text()) && ((await text()).match(/<Sidebar\b/g) ?? []).length === 1 && ((await text()).match(/<PageHeader\b/g) ?? []).length === 1, { message: "the Screen's frame moved into the AppShell, one Sidebar and one Page header left" }).catch(async (error) => { throw new Error(`${error.message} (Sidebars ${((await text()).match(/<Sidebar\b/g) ?? []).length})`); });
      const frame = page.locator('[data-studio-frame="screen:screen-1"]');
      await until(async () => (await frame.locator(".zen-sidebar").count()) === 1 && (await frame.locator(".zen-page-header").count()) === 1 && (await frame.locator(".zen-app-shell").count()) === 1, { message: "one Sidebar, one Page header, one AppShell on the Screen" });
      if (!/selectedId="dashboard"/.test(await text())) throw new Error("the template's own Sidebar was not the one kept");
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id^="frame:screen:"]').first().click();
      const sidebar = inspectorRow(page, "sidebar").getByRole("switch");
      await sidebar.waitFor({ state: "visible", timeout: 5000 });
      if ((await sidebar.getAttribute("aria-checked")) !== "true") throw new Error("Screen › Sidebar reads off on the master layout");
      return "two Sidebars → one (the template's), one Page header, Screen › Sidebar on";
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
  {
    id: "B-38", feature: "New page › Empty page: one Screen with nothing in it (no app frame, no Stack), as Figma's new frame (user: \"cho phép tạo trang frame trống hoàn toàn\")", wp: "header slots 2026-10-16",
    async run(ctx) {
      const { page } = await ctx.studio();
      const from = page.url();
      await showLeftTab(page, "pages");
      await openStudioSpace(page);
      await page.locator("#studio-left").getByRole("button", { name: "New page", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "New page" });
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      // Empty page is the default (user 2026-10-18: the AppShell is not made by default).
      if (!(await dialog.getByRole("radio", { name: /Empty page/ }).isChecked())) throw new Error("Empty page is not the default start");
      await dialog.getByText("Empty page", { exact: true }).click();
      await dialog.getByRole("button", { name: "Create page" }).click();
      await until(async () => page.url() !== from && /page=local%3A/.test(page.url()) && (await page.locator('[data-studio-frame^="screen:"]').count()) > 0, { message: "the new page on the canvas" });
      const id = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
      const text = (await pageText(page, id)) ?? "";
      if (!/<Screen [^>]*device="desktop" width=\{1512\} height=\{982\} \/>/.test(text)) throw new Error(`the Screen is not empty: ${text.slice(text.indexOf("<Board>"), text.indexOf("</Board>")).replace(/\s+/g, " ")}`);
      if (/<AppShell|<Stack|<Text|topNavigation|bottomNavigation/.test(text)) throw new Error("the empty page came with an app frame or content");
      const frame = page.locator('[data-studio-frame^="screen:"]').first();
      if (await frame.locator('[data-zen-name]:not([data-zen-name="Screen"])').count()) throw new Error("the empty Screen draws layers");
      return "Empty page → <Screen … />, nothing drawn";
    },
  },
  {
    id: "B-39", feature: "A header slot holding one layer takes a second one (a prop holds several layers, <>…</>): ⌘D on the top bar's Search makes two Searches in the bar; ⌘Z takes the copy back", wp: "header slots 2026-10-16",
    async run(ctx) {
      const { page, id, text } = await seededPage(ctx, headerSlotsPage, /\bactions=\{<>/);
      await focusScreen(page);
      await clickNamed(page, id, "Search");
      await until(async () => (await selectedName(page)) === "Search", { message: "the Search selected" });
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => /leading=\{<>\s*<Search[^]*<Search[^]*<\/>\}/.test(await text()), { message: "two Searches in the top bar's prop" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      const bar = page.locator('[data-studio-frame="screen:screen-1"] .zen-app-shell__header');
      await until(async () => (await bar.locator(".zen-search").count()) === 2, { message: "two Searches drawn in the bar" });
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => ((await text()).match(/<Search\b/g) ?? []).length === 1, { message: "⌘Z: one Search again" });
      return "⌘D in a one-layer slot → <>Search Search</> in the bar; ⌘Z → one";
    },
  },
  {
    id: "B-40", feature: "Hide a layer as Figma's eye: ⇧⌘H on the Badge in the top bar's actions writes hidden, the canvas leaves it out and Layers lists it dimmed; its eye shows it again. hidden=\"mobile\" / \"desktop\" draw on the other layout only", wp: "header slots 2026-10-16",
    async run(ctx) {
      const { page, id, text } = await seededPage(ctx, headerSlotsPage, /\bactions=\{<>/);
      const desktop = page.locator('[data-studio-frame="screen:screen-1"]');
      const phone = page.locator('[data-studio-frame="screen:screen-2"]');
      const words = async (frame) => (await frame.innerText()).replace(/\s+/g, " ");
      await until(async () => (await words(desktop)).includes("Desktop only") && !(await words(desktop)).includes("Phone only") && (await words(phone)).includes("Phone only") && !(await words(phone)).includes("Desktop only"), { message: "each layout draws its own Text" });
      await focusScreen(page);
      await clickNamed(page, id, "Badge");
      await until(async () => (await selectedName(page)) === "Badge", { message: "the Badge selected" });
      await page.keyboard.press("ControlOrMeta+Shift+KeyH");
      await until(async () => /<Badge [^>]*\bhidden\b/.test(await text()), { message: "<Badge … hidden> in the page" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      await until(async () => (await desktop.locator('[data-zen-name="Badge"]').count()) === 0, { message: "the Badge not drawn" });
      await showLeftTab(page, "layers");
      const row = page.locator('.studio-layers__row[data-hidden="true"]').filter({ hasText: "Badge" }).first();
      await row.waitFor({ state: "visible", timeout: 5000 }).catch(() => { throw new Error("no dimmed Badge row in Layers"); });
      await row.hover();
      await row.locator(".studio-layers__eye").click();
      await until(async () => !/<Badge [^>]*\bhidden\b/.test(await text()) && (await desktop.locator('[data-zen-name="Badge"]').count()) === 1, { message: "the eye shows the Badge again" });
      return "⇧⌘H → hidden, not drawn, dimmed row in Layers; eye → back; mobile/desktop-only Texts on their layout";
    },
  },
  {
    id: "B-41", feature: "Screen › Top bar actions off hides the slot and keeps its three layers (hiddenSlots, Figma's boolean); on brings the same layers back, not a starting AppShellAccount", wp: "header slots 2026-10-16",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, headerSlotsPage, /\bactions=\{<>/);
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id="frame:screen:screen-1"]').click();
      const toggle = inspectorRow(page, "actions").getByRole("switch");
      await toggle.waitFor({ state: "visible", timeout: 5000 });
      if ((await toggle.getAttribute("aria-checked")) !== "true") throw new Error("Top bar actions reads off");
      await toggle.click();
      await until(async () => /hiddenSlots=\{\["actions"\]\}/.test(await text()), { message: "hiddenSlots on the AppShellHeader" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      if (!/<Badge[^>]*>Pro<\/Badge>/.test(await text()) || !/<AppShellAccount name="Khoa Dang"/.test(await text())) throw new Error("switching off removed the layers");
      const desktop = page.locator('[data-studio-frame="screen:screen-1"]');
      await until(async () => (await desktop.locator(".zen-app-shell-header__actions").count()) === 0, { message: "the actions not drawn" });
      await toggle.click();
      await until(async () => !/hiddenSlots/.test(await text()) && (await desktop.locator(".zen-app-shell-header__actions [data-zen-name]").count()) === 3, { message: "the same three layers back" });
      // In the AppShellHeader's actions (the linked phone bar keeps its own copy of the account, component-usage-rules §17).
      const actions = async () => (await text()).match(/\bactions=\{<>[^]*?<\/>\}/)?.[0] ?? "";
      if (((await actions()).match(/<AppShellAccount\b/g) ?? []).length !== 1) throw new Error("switching on added a starting account");
      return "off → hiddenSlots, layers kept; on → the same three";
    },
  },
  {
    id: "B-42", feature: "A Screen on its master layout gets its phone header drawn from the desktop's as the page opens (component-usage-rules §17): the PageHeader title as the large title, the account in leading, New invoice as +, Notifications with its dot; the Sidebar's rows as the Bottom Navigation; both linked", wp: "responsive header 2026-10-16",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, phoneHeaderPage, /<Screen id="screen-2"/);
      await until(async () => (screenCode(await text(), "screen-1").match(/phoneLinked=/g) ?? []).length === 1 && /phoneLinked=\{\["topNavigation", ?"bottomNavigation"\]\}/.test(screenCode(await text(), "screen-2")), { message: "both Screens' phone parts linked" }).catch(async (error) => { throw new Error(`${error.message} (${screenCode(await text(), "screen-2").slice(0, 300).replace(/\s+/g, " ")})`); });
      const code = screenCode(await text(), "screen-2");
      if (!/topNavigation=\{<TopNavigation type="alt" title="Invoices" largeTitle="Invoices" leading=\{<AppShellAccount name="Khoa Dang" \/>\}/.test(code)) throw new Error(`the bar is not the desktop's: ${code.slice(0, 400).replace(/\s+/g, " ")}`);
      if (!/label: "New invoice"/.test(code) || !/label: "Notifications", dot: true/.test(code)) throw new Error("the + action or the notifications dot is missing");
      if (!/bottomNavigation=\{<BottomNavigation value="invoices" showLabels items=\{\[\{ id: "home"[^\]]*\{ id: "projects"[^\]]*\{ id: "invoices"/.test(code)) throw new Error("the Bottom Navigation is not the Sidebar's rows");
      const phone = page.locator('[data-studio-frame="screen:screen-2"]');
      await until(async () => (await phone.locator(".zen-top-nav").count()) === 1 && /Invoices/.test(await phone.locator(".zen-top-nav").innerText()) && (await phone.locator(".zen-bottom-nav, nav[aria-label]").count()) > 0, { message: "the phone draws its bar and its Bottom Navigation" });
      const desktop = page.locator('[data-studio-frame="screen:screen-1"]');
      if (await desktop.locator(".zen-top-nav").count()) throw new Error("the desktop Screen draws the phone bar");
      return "phone parts drawn from the desktop header, linked; the phone shows them, the desktop does not";
    },
  },
  {
    id: "B-43", feature: "Linked phone parts follow the desktop: a new PageHeader title redraws the bar; the bar edited on the phone becomes its own (off the linked list, the desktop leaves it alone); Screen › Reset to desktop links it again", wp: "responsive header 2026-10-16",
    async run(ctx) {
      const { page, id, text } = await seededPage(ctx, phoneHeaderPage, /<Screen id="screen-2"/);
      await until(async () => /phoneLinked=/.test(screenCode(await text(), "screen-2")), { message: "the phone parts linked" });
      // The desktop's title: the desktop Screen's PageHeader (a phone draws none: its bar holds the title).
      await focusScreen(page);
      if (await page.locator(`[data-studio-frame="screen:screen-2"] [data-zen-name="PageHeader"]`).count()) throw new Error("the phone draws the PageHeader beside its bar");
      await clickNamed(page, id, "PageHeader");
      await until(async () => (await selectedName(page)) === "PageHeader", { message: "the PageHeader selected" });
      const title = inspectorRow(page, "title").locator("input, textarea").first();
      await title.waitFor({ state: "visible", timeout: 5000 }).catch(async () => { throw new Error(`no title field for the PageHeader (rows: ${(await page.locator("#studio-right [data-prop]").evaluateAll((els) => els.map((el) => el.getAttribute("data-prop")))).join(", ")})`); });
      await title.fill("Billing");
      await title.press("Enter");
      const barOf = async (screen) => screenCode(await text(), screen).match(/topNavigation=\{<TopNavigation[^]*?\/>\}/)?.[0] ?? "";
      await until(async () => /title="Billing" largeTitle="Billing"/.test(await barOf("screen-1")), { message: "the linked bar follows the desktop title" }).catch(async (error) => { throw new Error(`${error.message} (${(await barOf("screen-1")).slice(0, 200)})`); });
      const phoneBar = () => barOf("screen-2");
      // The bar edited on the phone (its Layers row).
      await showLeftTab(page, "layers");
      const navRow = page.locator('.studio-layers__row[data-kind="node"]').filter({ hasText: /^TopNavigation/ }).first();
      await navRow.waitFor({ state: "visible", timeout: 5000 }).catch(async () => { throw new Error(`no TopNavigation row in Layers (rows: ${(await page.locator(".studio-layers__row").allInnerTexts()).slice(0, 30).join(" · ").replace(/\s+/g, " ")})`); });
      await navRow.click();
      await until(async () => (await selectedName(page)) === "TopNavigation", { message: "the TopNavigation selected" });
      // Its type set on the phone (compact): the person's own bar from now on.
      await pickOption(page, "type", /^compact$/i).catch(async (error) => { throw new Error(`Type › Compact: ${error.message.split("\n")[0]} (row: ${(await inspectorRow(page, "type").innerText().catch(() => "?")).replace(/\s+/g, " ").slice(0, 120)}; options: ${(await page.getByRole("option").allInnerTexts().catch(() => [])).join(" · ").slice(0, 200)})`); });
      await until(async () => /type="compact"/.test(await phoneBar()) && /phoneLinked=\{\["bottomNavigation"\]\}/.test(screenCode(await text(), "screen-2")), { message: "the bar is the person's own (off the linked list)" }).catch(async (error) => { throw new Error(`${error.message} (${screenCode(await text(), "screen-2").match(/phoneLinked=\{[^}]*\}/)?.[0]}; bar ${(await phoneBar()).slice(0, 80)})`); });
      // Reset to desktop (Screen section).
      await page.locator('[data-layer-id="frame:screen:screen-2"]').click();
      const reset = page.locator("#studio-right").getByRole("button", { name: "Reset to desktop" }).first();
      await reset.waitFor({ state: "visible", timeout: 5000 }).catch(() => { throw new Error("no Reset to desktop in the Screen section"); });
      await reset.click();
      await until(async () => /title="Invoices" largeTitle="Invoices"/.test(await phoneBar()) && /phoneLinked=\{\[[^\]]*"topNavigation"/.test(screenCode(await text(), "screen-2")), { message: "Reset to desktop: the bar follows its desktop again" });
      return "desktop title → its bar; the phone's bar set to Compact → its own; Reset to desktop → linked again";
    },
  },
];

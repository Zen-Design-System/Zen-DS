// Starter rows (Studio builder GĐ3b, spec docs/research/studio-builder-starters-spec-2026-10-07.md): a builder page made
// from what an example or template frame shows ("New page from this frame"), kept in the browser and editable.
import { focusFrame, openStudioSpace, ownerOfLayer, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { clickNamed, focusScreen, pageText, selectedName } from "./builder.mjs";
import { pickOption, waitSeed } from "./inspector.mjs";

/**
 * Selects example frame `frame` and makes a page from it (the frame Inspector's button); returns the page id and text.
 * `on`: another platform page than the fixture's (its own session; `back` opens the fixture's again).
 */
export async function pageFromFrame(ctx, frame, { on } = {}) {
  // A row before may have left the Studio on the page it made: the fixture's page opens again.
  const session = on ? await ctx.studio({ page: on }) : await ctx.studio({ fresh: true });
  const { page, errors } = session;
  if (!on) await waitSeed(page, await ctx.reseed());
  // Its Layers row selects it and zooms to it; on the Templates page (more than the 500 rows Layers lists) its label
  // on the canvas does.
  if (on) {
    const label = page.locator(`.studio-frame-label[data-chrome-key="label:example:${frame}"]`);
    await label.waitFor({ state: "attached", timeout: 20_000 });
    await label.evaluate((element) => element.click());
  } else await focusFrame(page, frame);
  await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click().catch(() => {});
  const errorsBefore = errors.length;
  const from = page.url();
  await page.locator("#studio-right").getByRole("button", { name: "New page from this frame" }).click();
  await until(async () => page.url() !== from && /page=local%3A/.test(page.url()), { message: "the new page opened" });
  const id = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
  const text = await until(() => pageText(page, id), { message: "the page stored" });
  const status = (await page.locator(".studio-status, [data-e2e=status], .studio-inspector__status").allInnerTexts().catch(() => [])).join(" ");
  /** Console errors since the page was made (React's warnings about a copied prop show here). */
  const newErrors = () => errors.slice(errorsBefore).filter((line) => !/Failed to load resource/.test(line));
  return { page, id, text, status, newErrors };
}

/** New page › a template (the dialog's card, as a person picks it); returns the page id once the canvas shows it. */
export async function pageFromTemplate(ctx, title) {
  const { page } = await ctx.studio({ fresh: true });
  await showLeftTab(page, "pages");
  await openStudioSpace(page);
  const from = page.url();
  await page.locator("#studio-left").getByRole("button", { name: "New page", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New page" });
  await dialog.waitFor({ state: "visible", timeout: 5000 });
  await dialog.getByRole("radio", { name: new RegExp(`^${title}`) }).first().check({ force: true });
  await dialog.getByRole("button", { name: "Create page" }).click();
  await until(async () => page.url() !== from && /page=local%3A/.test(page.url()) && (await page.locator('[data-studio-frame^="screen:"]').count()) > 0, { timeout: 40_000, message: `the ${title} page on the canvas` });
  const id = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
  await focusScreen(page);
  return { page, id };
}

/** ⌘-click (Figma's deep select) at the centre of the first element matching `selector` in the page's Screen; ⇧Enter
 *  back to it when the click went on into its text or a nested instance (2026-10-13). */
async function deepSelect(page, selector) {
  const box = await page.locator(`.studio-frame ${selector}`).first().boundingBox();
  if (!box) throw new Error(`no ${selector} on the canvas`);
  await page.keyboard.down("Meta");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.up("Meta");
  await sleep(500);
  await ownerOfLayer(page);
  return box;
}

/** The source of the first `<Name` element of the page, up to the next element of that name. */
async function firstElementText(page, id, name) {
  const text = (await pageText(page, id)) ?? "";
  const start = text.indexOf(`<${name}`);
  const next = text.indexOf(`<${name}`, start + 1);
  return start < 0 ? "" : text.slice(start, next < 0 ? undefined : next);
}

export const rows = [
  {
    id: "SP-12", feature: "New page from a template frame keeps its Table cells as the Table draws them (2026-10-12, Admin list): the Member column an avatar column (name, email caption, bold, each person's colour), Status Badges with their colour and dot, the row menu an actions column", wp: "figma coverage 2026-10-12",
    timeout: 45000,
    async run(ctx) {
      const { page } = await ctx.studio({ page: "templates" });
      const frame = await until(() => page.evaluate(() => {
        const found = [...document.querySelectorAll('[data-studio-frame^="example:"]')].find((element) => element.querySelector(".zen-table") && /Team members/.test(element.textContent ?? ""));
        return found ? found.getAttribute("data-studio-frame").replace("example:", "") : null;
      }), { timeout: 20000, message: "the Admin list frame on Templates" });
      const made = await pageFromFrame(ctx, frame, { on: "templates" });
      const { id, text, newErrors } = made;
      const expected = [
        [/id: "member"[^}]*content: "avatar"/, "the Member column an avatar column"],
        [/id: "member"[^}]*captionField: "memberCaption"/, "its email as the caption"],
        [/id: "member"[^}]*bold: true/, "its name bold"],
        [/id: "status"[^}]*content: "badge"/, "Status a badge column"],
        [/id: "actions"[^}]*content: "actions"[^]*?icon: "icon-dots-horizontal-line"/, "the row menu an actions column"],
        [/"Row\[an\.mai@dizai\.studio\]\/member\/Avatar": \{ theme: "[a-z]+" \}/, "An Mai's avatar colour"],
        [/"Row\[[^\]]+\]\/status\/Badge": \{ theme: "green"[^}]*leadingIcon: true/, "an Active badge green with its dot"],
        [/"Row\[bichngoc\.ha@dizai\.studio\]\/member\/Avatar": \{[^}]*children: "BH"/, "the template's own initials (BH, not the Table's BN)"],
      ];
      if (/Not signed in yet/.test(text)) throw new Error("screen-reader text (VisuallyHidden) became a cell's words");
      const missing = expected.filter(([pattern]) => !pattern.test(text)).map(([, what]) => what);
      if (missing.length) throw new Error(`the design copy lacks: ${missing.join(", ")}\n${text.slice(text.indexOf("<Table"), text.indexOf("<Table") + 1500)}`);
      // On the canvas: initials in a colour, badges, the menus.
      const screen = made.page.locator(`[data-studio-frame^="screen:"]`).first();
      await screen.locator(".zen-table .zen-badge").first().waitFor({ state: "attached", timeout: 20000 });
      const initials = await screen.locator(".zen-table .zen-avatar").allInnerTexts();
      if (!initials.some((value) => value.trim() === "AM")) throw new Error(`no "AM" avatar in the table (${initials.slice(0, 4).join(", ")})`);
      if (newErrors().length) throw new Error(`console errors on the new page: ${newErrors().slice(0, 2).join(" | ").slice(0, 300)}`);
      return `Admin list → page ${id}: avatar column (caption, bold, colours), badges (colour, dot), actions column; ${initials.length} avatars`;
    },
  },
  {
    id: "SP-01", feature: "New page from a frame: the E2E instance frame becomes a builder page that renders and edits", wp: "GĐ3b M1",
    async run(ctx) {
      const { page, id, text, newErrors } = await pageFromFrame(ctx, 6);
      for (const expected of ['<Button level="accent" size="lg" startIcon="icon-plus-line">Save</Button>', '<NumberField label="Guests" defaultValue={2} />', "<AlertBanner>Heads up</AlertBanner>", 'title="Nothing here"', '<Badge leadingIcon leading="icon-heart-line">New</Badge>', 'leading={<Avatar alt="Ava Tran" size="sm" />}']) {
        if (!text.includes(expected)) throw new Error(`the page lacks ${expected}\n${text.slice(0, 1200)}`);
      }
      if (/onClick|data-e2e/.test(text)) throw new Error("a handler or a data- prop was copied");
      await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="ListItem"]`).first().waitFor({ state: "attached", timeout: 10_000 });
      await sleep(300);
      await clickNamed(page, id, "Button");
      await pickOption(page, "level", "Primary");
      await until(async () => /<Button level="primary"/.test((await pageText(page, id)) ?? ""), { message: 'level="primary" on the page' });
      if (newErrors().length) throw new Error(`console errors on the new page: ${newErrors().slice(0, 2).join(" | ").slice(0, 300)}`);
      return `${text.split("\n").length} lines · Button, NumberField, AlertBanner, EmptyState, Badge, ListItem › Avatar · Button level → primary`;
    },
  },
  {
    id: "SP-04", feature: "New page from a frame with HTML: flex and grid boxes become Stack / Grid, text Heading / Text / Link, a tint a Box", wp: "GĐ3b M2",
    async run(ctx) {
      const { page, id, text, newErrors } = await pageFromFrame(ctx, 7);
      const expected = [
        /<Stack gap="lg" padding="xl">/,
        /<Heading level=\{3\}[^>]*>Team<\/Heading>/,
        /<Text>\s*\{?"?Three people work on "?\}?\s*<Link href="#docs">the docs<\/Link>\s*\{?"? today\."?\}?\s*<\/Text>/,
        /<Stack direction="row" gap="sm" align="center">/,
        /<Grid columns=\{3\} gap="md">/,
        /<Box surface="subtle" padding="lg">/,
      ];
      const missing = expected.filter((pattern) => !pattern.test(text));
      if (missing.length) throw new Error(`the page lacks ${missing.join(", ")}\n${text.slice(0, 1400)}`);
      await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Grid"]`).first().waitFor({ state: "attached", timeout: 10_000 });
      await sleep(400);
      if (newErrors().length) throw new Error(`console errors on the new page: ${newErrors().slice(0, 2).join(" | ").slice(0, 300)}`);
      return "Stack (gap lg, padding xl) › Heading 3 · Text with a Link · row Stack (sm, center) · Grid 3 (md) · Box subtle (lg)";
    },
  },
  {
    id: "SP-05", feature: "New page › Start from a template (Sign in): the template rendered off screen becomes the page", wp: "GĐ3b M3",
    timeout: 40_000,
    async run(ctx) {
      const { page, errors } = await ctx.studio({ fresh: true });
      await showLeftTab(page, "pages");
      const from = page.url();
      await openStudioSpace(page);
    await page.locator("#studio-left").getByRole("button", { name: "New page", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "New page" });
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      await dialog.getByRole("radio", { name: /^Sign in/ }).check({ force: true });
      const before = errors.length;
      await dialog.getByRole("button", { name: "Create page" }).click();
      await until(async () => page.url() !== from && /page=local%3A/.test(page.url()), { timeout: 20_000, message: "the new page opened" });
      const id = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
      const text = await until(() => pageText(page, id), { message: "the page stored" });
      if (!/"title":"Sign in"/.test(text) || !/device="desktop"/.test(text) || !/<Button\b/.test(text)) throw new Error(`unexpected page:\n${text.slice(0, 800)}`);
      await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Button"]`).first().waitFor({ state: "attached", timeout: 10_000 });
      await sleep(400);
      const fresh = errors.slice(before).filter((line) => !/Failed to load resource/.test(line));
      if (fresh.length) throw new Error(`console errors: ${fresh.slice(0, 2).join(" | ").slice(0, 300)}`);
      return `${id}: ${(text.match(/^\s*<[A-Z]/gm) ?? []).length} elements, rendered`;
    },
  },
  {
    id: "SP-06", feature: "New page from a frame with a Dialog: the Dialog becomes an Overlay frame whose own action closes it", wp: "GĐ3b M3",
    async run(ctx) {
      const { page, id, text } = await pageFromFrame(ctx, 3);
      const expected = ['<Button level="secondary">Open dialog</Button>', '<Overlay id="fixture-dialog">', '<Dialog title="Fixture dialog" primaryAction={{ label: "Done", onClick: proto.close() }} secondaryAction={{ label: "Cancel" }} />'];
      // A tag too long for one line is written over several (the Dialog with two actions): compare with spaces folded.
      const flat = text.replace(/\s+/g, " ");
      const missing = expected.filter((line) => !flat.includes(line));
      if (missing.length) throw new Error(`the page lacks ${missing.join(", ")}\n${text.slice(0, 1200)}`);
      await page.locator('[data-studio-frame="overlay:fixture-dialog"]').waitFor({ state: "attached", timeout: 10_000 });
      return `${id}: Screen › Button "Open dialog" · Overlay fixture-dialog › Dialog (Done closes it)`;
    },
  },
  {
    id: "SP-07", feature: "New page from the Admin list template: its Table renders, a column without a cell shows its rows' field", wp: "GĐ5 M1",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id: pageId, text, newErrors } = await pageFromFrame(ctx, 0, { on: "templates" });
        if (!/<Table\b/.test(text) || /\bcell:/.test(text)) throw new Error(`expected a Table without cells:\n${text.slice(0, 800)}`);
        const table = page.locator(`[data-zen-src^="local:${pageId}.zen.tsx:"][data-zen-name="Table"]`).first();
        await table.waitFor({ state: "attached", timeout: 10_000 });
        // The selection column's cells say "Select row n"; the others show their row's field (Role → "Member").
        const shown = (all) => all.map((cell) => cell.trim()).filter((cell) => cell && !/^Select row/.test(cell));
        const cells = await until(async () => { const all = await table.locator("td.zen-table__cell").allInnerTexts(); return shown(all).length ? all : null; }, { timeout: 10_000, message: "Table cells showing their row's field" });
        if (!shown(cells).includes("Member")) throw new Error(`no Role cell shows "Member": ${shown(cells).slice(0, 8).join(", ")}`);
        await sleep(300);
        if (newErrors().length) throw new Error(`console errors on the new page: ${newErrors().slice(0, 2).join(" | ").slice(0, 300)}`);
        return `${cells.length} cells, ${shown(cells).length} show their row's field (${[...new Set(shown(cells))].slice(0, 4).join(", ")})`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-08", feature: "HR · Home's Sidebar footer is a shared const (footer={appsButton}): Footer-Content lists its button and + adds a Menu item where the const is written", wp: "slots 2026-10-09",
    timeout: 60_000,
    async run(ctx) {
      const file = "src/templates/hr/HrShell.tsx";
      try {
        const { page } = await ctx.studio({ page: "templates" });
        // HR · Home is the templates page's 9th frame.
        const label = page.locator('.studio-frame-label[data-chrome-key="label:example:8"]');
        await label.waitFor({ state: "attached", timeout: 20_000 });
        await label.evaluate((element) => element.click());
        // Zoom to the selected frame (⇧2), so the Sidebar is on screen to click.
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Shift+Digit2");
        const frame = page.locator('[data-studio-frame="example:8"]');
        const body = frame.locator(".zen-sidebar__body").first();
        await body.waitFor({ state: "visible", timeout: 20_000 });
        await sleep(800);
        // The rail's empty space under its items is the Sidebar itself (its items are data, not layers).
        const box = await body.boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height - 12);
        const heading = async () => (await page.locator("#studio-right h2").first().innerText({ timeout: 1000 }).catch(() => "")).trim();
        await until(async () => (await heading()) === "Sidebar", { message: "the Sidebar selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await heading()})`); });
        const slot = page.locator('#studio-right [data-slot="footer"]');
        await slot.waitFor({ state: "visible", timeout: 5000 });
        await until(async () => /Written in\s*appsButton/.test(await page.locator("#studio-right").innerText()), { message: "the note: Written in appsButton" });
        await slot.getByRole("button", { name: "Add to Footer-Content" }).click();
        await page.getByRole("option", { name: /^Menu item/ }).first().click();
        const written = async () => (await ctx.api.source(file)).content;
        await until(async () => /const appsButton = <>[\s\S]*<SidebarMenuItem id="invoices-\w+"/.test(await written()), { message: "the Menu item added inside const appsButton" });
        const text = await written();
        if ((text.match(/footer=\{appsButton\}/g) ?? []).length !== 2) throw new Error("both Sidebars should still show appsButton");
        await until(async () => (await frame.locator(".zen-sidebar__footer-content").first().locator(":scope > *").count()) >= 2, { message: "two footer rows on the canvas" });
        return "footer={appsButton} → Footer-Content › + Menu item → const appsButton = <>…<SidebarMenuItem …/></>";
      } finally {
        await ctx.api.discard([file]).catch(() => {});
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-09", feature: "Admin list page: its Sidebar's `sections` rows are Body-Content items (user: \"chưa list chỉnh được props của nested. Ví dụ như sidebar\", \"không remove được item trong sidebar mẫu\"): a double-click selects a Menu-Item, its Counter writes that row, Remove takes it out", wp: "nested items 2026-10-10",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id: pageId } = await pageFromFrame(ctx, 0, { on: "templates" });
        const text = async () => (await pageText(page, pageId)) ?? "";
        if (!/<Sidebar\b[\s\S]*?\bsections=\{\[/.test(await text())) throw new Error(`the Admin list page has no Sidebar sections: ${(await text()).match(/<Sidebar[\s\S]{0,300}/)?.[0] ?? "no Sidebar"}`);
        await focusScreen(page);
        const sidebar = page.locator(`[data-zen-src^="local:${pageId}.zen.tsx:"] .zen-sidebar, .studio-frame .zen-sidebar`).first();
        const row = sidebar.locator(".zen-sidebar__item", { hasText: "Reports" }).first();
        await row.waitFor({ state: "visible", timeout: 10_000 });
        const named = async () => (await page.locator("#studio-right h2").first().innerText({ timeout: 1000 }).catch(() => "")).trim();
        for (let k = 0; k < 5 && !(await named()).startsWith("Menu-Item · in "); k++) {
          const box = await row.boundingBox();
          await page.mouse.dblclick(box.x + 16, box.y + box.height / 2);
          await sleep(500);
        }
        await until(async () => (await named()).startsWith("Menu-Item · in Body-Content"), { message: "the Menu-Item selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await named()})`); });
        const counter = page.locator('#studio-right [data-prop="counter"] input').first();
        await counter.fill("3");
        await counter.press("Enter");
        await until(async () => /label: "Reports", icon: "[\w-]+", counter: (3|"3") \}/.test(await text()), { message: "the row's counter in the page" });
        await page.locator("#studio-right").getByRole("button", { name: /^Remove Reports/ }).click();
        await until(async () => !/label: "Reports"/.test(await text()) && /label: "Billing"/.test(await text()), { message: "Reports removed, Billing kept" });
        await until(async () => (await sidebar.locator(".zen-sidebar__item", { hasText: "Reports" }).count()) === 0, { message: "Reports gone from the Screen" });
        // The section title is Figma's Section-Title: ⌘-click selects it, Delete takes it (its rows join the section above).
        const title = sidebar.locator(".zen-sidebar__section-item", { hasText: "Admin" }).first();
        for (let k = 0; k < 4 && !(await named()).startsWith("Section-Title"); k++) {
          const box = await title.boundingBox();
          await page.keyboard.down("ControlOrMeta");
          await page.mouse.click(box.x + 16, box.y + box.height / 2);
          await page.keyboard.up("ControlOrMeta");
          await sleep(500);
        }
        await until(async () => (await named()).startsWith("Section-Title · in Body-Content"), { message: "the Section-Title selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await named()})`); });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Backspace");
        // Only the Sidebar's list: the page's role filter has an "Admin" option of its own.
        const sections = async () => (await text()).match(/sections=\{\[[\s\S]*?\n\s*\]\}/)?.[0] ?? "";
        await until(async () => !/label: "Admin"/.test(await sections()) && /label: "Billing"/.test(await sections()), { message: "the Admin title removed, its rows kept" }).catch(async (error) => {
          const status = await page.locator(".studio-status, [role=status]").allInnerTexts().catch(() => []);
          throw new Error(`${error.message} (selected: ${await named()}; focus: ${await page.evaluate(() => document.activeElement?.className ?? "")}; status: ${status.filter(Boolean).join(" | ").slice(0, 400)}; sections: ${((await text()).match(/sections=\{\[[\s\S]{0,400}/)?.[0] ?? "").replace(/\s+/g, " ")})`);
        });
        return "double-click → Menu-Item · Counter 3 → that row · Remove → gone · ⌘-click Admin → Section-Title · Delete → title gone, rows kept";
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-10", feature: "Admin list page: several Sidebar rows selected (⌘-click one, ⇧-click another; user: \"Chưa chọn được nhiều item add stack được\") show as N selected, ⇧A puts them in a new section, Delete removes several at once", wp: "nested items 2026-10-10",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id: pageId } = await pageFromFrame(ctx, 0, { on: "templates" });
        const text = async () => (await pageText(page, pageId)) ?? "";
        const sections = async () => {
          const list = (await text()).match(/sections=\{\[[\s\S]*?\n\s*\]\}/)?.[0] ?? "";
          return [...list.matchAll(/label: "([^"]*)"|items:/g)].map((match) => (match[0] === "items:" ? "|" : match[1])).join(" ");
        };
        await focusScreen(page);
        const sidebar = page.locator(".studio-frame .zen-sidebar").first();
        const named = async () => (await page.locator("#studio-right h2").first().innerText({ timeout: 1000 }).catch(() => "")).trim();
        const press = async (label, keys) => {
          const box = await sidebar.locator(".zen-sidebar__item", { hasText: label }).first().boundingBox();
          for (const key of keys) await page.keyboard.down(key);
          await page.mouse.click(box.x + 16, box.y + box.height / 2);
          for (const key of [...keys].reverse()) await page.keyboard.up(key);
          await sleep(500);
        };
        for (let k = 0; k < 4 && !(await named()).startsWith("Menu-Item · in "); k++) await press("Projects", ["ControlOrMeta"]);
        await press("Billing", ["Shift"]);
        await until(async () => (await named()).startsWith("2 Menu-Items"), { message: "2 Menu-Items selected" });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Shift+KeyA");
        // Right after the section Projects was in (before Admin's title).
        await until(async () => /^\| Home Reports \| Projects Billing Admin \|/.test(await sections()), { message: "a new section of Projects and Billing" }).catch(async (error) => { throw new Error(`${error.message} (sections: ${await sections()})`); });
        for (let k = 0; k < 4 && !(await named()).startsWith("Menu-Item · in "); k++) await press("Home", ["ControlOrMeta"]);
        await press("Security", ["Shift"]);
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Delete");
        await until(async () => !/Home|Security/.test(await sections()), { message: "Home and Security removed" }).catch(async (error) => { throw new Error(`${error.message} (sections: ${await sections()})`); });
        return await sections();
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-11", feature: "Admin list page: double-clicks go Sidebar → Section → Menu-Item, a click on another section selects that one, Escape climbs back one level (user: \"khó chọn section. chỉ chọn được item bên trong. Muốn chọn section lại phải bấm bên layer\"); nothing is written on the way", wp: "nested items 2026-10-10",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id: pageId } = await pageFromFrame(ctx, 0, { on: "templates" });
        const text = async () => (await pageText(page, pageId)) ?? "";
        const before = await text();
        await focusScreen(page);
        const sidebar = page.locator(".studio-frame .zen-sidebar").first();
        const named = async () => (await page.locator("#studio-right h2").first().innerText({ timeout: 1000 }).catch(() => "")).replace(/\s+/g, " ").trim();
        const note = async () => (await page.locator("#studio-right .studio-inspector__note", { hasText: "Menu-Item" }).first().innerText({ timeout: 1000 }).catch(() => "")).trim();
        // The row's empty end, off its label (a double-click on the text goes on to edit it).
        const end = async (label) => {
          const box = await sidebar.locator(".zen-sidebar__item", { hasText: label }).first().boundingBox();
          return { x: box.x + box.width - 8, y: box.y + box.height / 2 };
        };
        const expect = async (heading, message) => until(async () => (await named()).startsWith(heading), { message }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await named()})`); });
        const steps = [];
        for (let k = 0; k < 4 && !(await named()).startsWith("Section · in "); k++) {
          const point = await end("Billing");
          await page.mouse.dblclick(point.x, point.y);
          await sleep(500);
        }
        await expect("Section · in Body-Content", "a double-click selected the section");
        if (!/^Admin · /.test(await note())) throw new Error(`not the Admin section: ${await note()}`);
        steps.push(await note());
        {
          const point = await end("Billing");
          await page.mouse.dblclick(point.x, point.y);
        }
        await expect("Menu-Item · in Body-Content", "the next double-click selected the row");
        steps.push("Menu-Item");
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Escape");
        await expect("Section · in Body-Content", "Escape went up to the section");
        // A section selected: a click on a row of another section selects that section (Figma's siblings).
        {
          const point = await end("Home");
          await page.mouse.click(point.x, point.y);
        }
        await until(async () => (await named()).startsWith("Section · in ") && !/^Admin · /.test(await note()), { message: "the click selected the other section" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await named()} · ${await note()})`); });
        steps.push(await note());
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Escape");
        await expect("Sidebar", "Escape went up to the Sidebar");
        steps.push("Sidebar");
        await sleep(500);
        if ((await text()) !== before) throw new Error("the page changed while only selecting");
        return steps.join(" → ");
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-13", feature: "A page from the Dashboard template, its Metric card (user 2026-10-13: \"bật boolean … không hoạt động, đặc biệt các boolean có slot như Metric card\"): Title-Highlight lists Hint, Label-Icon and Custom but no Counter (Icon-Highlight's); Custom opens the picker and the picked item fills Custom-Slot", wp: "studio toggles 2026-10-13",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id } = await pageFromTemplate(ctx, "Dashboard");
        await deepSelect(page, ".zen-metric-card");
        await until(async () => (await selectedName(page)) === "MetricCard", { message: "the MetricCard selected" });
        const panel = page.locator("#studio-right");
        const switches = await panel.getByRole("switch").evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
        for (const label of ["Hint", "Label-Icon", "Custom"]) if (!switches.includes(label)) throw new Error(`no ${label} switch (${switches.join(", ")})`);
        if (switches.includes("Counter")) throw new Error("Counter shows on Title-Highlight, where nothing draws it");
        await panel.getByRole("switch", { name: "Custom", exact: true }).click();
        const picker = page.locator(".studio-slots__picker-scope");
        await picker.waitFor({ state: "visible", timeout: 5000 }).catch(() => { throw new Error("Custom did not open the picker"); });
        await page.keyboard.type("Progress");
        await picker.getByRole("option").first().click();
        await until(async () => /custom=\{<Stack[^]*?<ProgressBar/.test(await firstElementText(page, id, "MetricCard")), { timeout: 8000, message: "custom={…ProgressBar…} written" });
        await until(() => page.evaluate(() => Boolean(document.querySelector(".studio-frame .zen-metric-card .zen-metric__custom .zen-progress, .studio-frame .zen-metric-card .zen-metric__custom [role=progressbar]"))), { timeout: 8000, message: "the progress bar drawn in the card" });
        return "Hint, Label-Icon, Custom (no Counter); Custom → picker → ProgressBar in Custom-Slot";
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-14", feature: "A page from the Dashboard template, clicked like Figma (user 2026-10-13: \"khó click vào element muốn hơn so với figma\"): the first click on a KPI value selects a section of the page (never AppShell), three double-clicks reach the MetricCard, and right-click › Select layer › MetricCard selects it in two steps", wp: "studio click 2026-10-13",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page } = await pageFromTemplate(ctx, "Dashboard");
        const value = await page.locator(".studio-frame .zen-metric-card .zen-metric__value").first().boundingBox();
        const x = value.x + value.width / 2;
        const y = value.y + value.height / 2;
        const steps = [];
        await page.mouse.click(x, y); await sleep(400);
        steps.push(await selectedName(page));
        if (steps[0] === "AppShell" || steps[0] === "Screen") throw new Error(`the first click selected ${steps[0]}`);
        for (let index = 0; index < 4 && steps.at(-1) !== "MetricCard"; index++) { await page.mouse.dblclick(x, y); await sleep(400); steps.push(await selectedName(page)); }
        if (steps.at(-1) !== "MetricCard" || steps.length > 4) throw new Error(`clicks: ${steps.join(" → ")}`);
        await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await sleep(300);
        await page.mouse.click(x, y, { button: "right" });
        await page.getByRole("menuitem", { name: /^Select layer/ }).click();
        const listed = await page.getByRole("menu", { name: "Select layer" }).getByRole("menuitem").allInnerTexts().catch(() => []);
        await page.getByRole("menu", { name: "Select layer" }).getByRole("menuitem", { name: /^MetricCard/ }).click();
        await until(async () => (await selectedName(page)) === "MetricCard", { message: "Select layer › MetricCard" });
        return `${steps.join(" → ")}; Select layer lists ${listed.map((item) => item.split("\n")[0]).join(", ")}`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-15", feature: "A page from the Dashboard template: an Advanced Chip's Dropdown switched off writes dropdown={false} and its chevron goes (an unset dropdown is on for Advanced chips)", wp: "studio toggles 2026-10-13",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id } = await pageFromTemplate(ctx, "Dashboard");
        await deepSelect(page, ".zen-chip");
        await until(async () => (await selectedName(page)) === "Chip", { message: "the Chip selected" });
        const chevrons = () => page.evaluate(() => document.querySelector(".studio-frame .zen-chip")?.querySelectorAll("svg").length ?? 0);
        const before = await chevrons();
        await page.locator("#studio-right").getByRole("switch", { name: "Dropdown", exact: true }).click();
        await until(async () => /dropdown=\{false\}/.test(await firstElementText(page, id, "Chip")), { timeout: 8000, message: "dropdown={false} written" });
        await until(async () => (await chevrons()) < before, { timeout: 8000, message: "the chevron gone" });
        return `dropdown={false}; icons ${before} → ${await chevrons()}`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-16", feature: "Layers lists what the canvas selects (user 2026-10-13: \"Panel Layers vẫn hiện các lớp mà click đã bỏ qua\"): on a Dashboard page AppShell › Stack › Stack › Grid › Grid › MetricCard, no Container, no List row, no Parts row under a Stack or Grid; a selected KPI card's row is the selected one", wp: "studio click 2026-10-13",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page } = await pageFromTemplate(ctx, "Dashboard");
        await deepSelect(page, ".zen-metric-card");
        await until(async () => (await selectedName(page)) === "MetricCard", { message: "the MetricCard selected" });
        await showLeftTab(page, "layers");
        const rows = await until(async () => {
          const list = await page.locator("#studio-left [data-layer-id]").evaluateAll((els) => els.map((el) => ({ name: (el.querySelector(".studio-layers__name, [class*=name]")?.textContent ?? el.textContent ?? "").trim(), level: Number(el.getAttribute("aria-level") ?? 0), selected: el.getAttribute("aria-selected") === "true" })));
          return list.some((row) => row.selected) ? list : null;
        }, { message: "a selected Layers row" });
        const selected = rows.findIndex((row) => row.selected);
        if (!/^MetricCard/.test(rows[selected].name)) throw new Error(`the selected row is ${rows[selected].name}`);
        // Its ancestors as Layers shows them, nearest first.
        const chain = [];
        for (let index = selected - 1, level = rows[selected].level; index >= 0 && level > 1; index--) if (rows[index].level < level) { chain.unshift(rows[index].name.replace(/Empty$/, "")); level = rows[index].level; }
        const joined = chain.join(" › ");
        if (/Container|(^| › )List( › |$)/.test(joined)) throw new Error(`Layers still lists a passed-through layer: ${joined}`);
        if (!/AppShell › Stack › Stack › Grid › Grid$/.test(joined)) throw new Error(`ancestors: ${joined}`);
        const partsUnderLayout = rows.some((row, index) => /^Parts/.test(row.name) && index > 0 && /^(Stack|Grid)\b/.test(rows.slice(0, index).reverse().find((other) => other.level === row.level - 1)?.name ?? ""));
        if (partsUnderLayout) throw new Error("a Parts row under a Stack or Grid");
        return `${joined} › MetricCard`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-17", feature: "⌘-click goes into an instance to its text, as Figma's deep select (user 2026-10-13): a KPI value is the Text layer of the MetricCard, its Text › Value field writes value=, Enter edits it in place; a Badge's label is its Text too, ⇧Enter goes up to the Badge", wp: "studio click 2026-10-13",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id } = await pageFromTemplate(ctx, "Dashboard");
        const box = await page.locator(".studio-frame .zen-metric-card .zen-metric__value").first().boundingBox();
        await page.keyboard.down("Meta"); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.keyboard.up("Meta");
        await until(async () => /^Text\b/.test(await selectedName(page)), { message: "the value's Text layer selected" }).catch(async (error) => { throw new Error(`${error.message} (${await selectedName(page)})`); });
        const field = page.locator('#studio-right [data-prop="value"] input').first();
        await field.fill("$600K"); await field.press("Enter");
        await until(async () => /value="\$600K"/.test(await firstElementText(page, id, "MetricCard")), { timeout: 8000, message: 'value="$600K" written' });
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Enter");
        await until(() => page.evaluate(() => Boolean(document.activeElement?.isContentEditable)), { timeout: 4000, message: "Enter edits the text in place" });
        await page.keyboard.press("Meta+a"); await page.keyboard.type("$700K"); await page.keyboard.press("Enter");
        await until(async () => /value="\$700K"/.test(await firstElementText(page, id, "MetricCard")), { timeout: 8000, message: 'value="$700K" from the canvas' });
        const badge = await page.locator(".studio-frame .zen-table tbody .zen-badge").first().boundingBox();
        await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
        await page.keyboard.down("Meta"); await page.mouse.click(badge.x + badge.width / 2, badge.y + badge.height / 2); await page.keyboard.up("Meta");
        await until(async () => /^Text\b/.test(await selectedName(page)), { message: "⌘-click on a Badge's label selects its Text (Figma)" }).catch(async (error) => { throw new Error(`${error.message} (${await selectedName(page)})`); });
        await page.locator(".studio-viewport").focus(); await page.keyboard.press("Shift+Enter");
        await until(async () => /^Badge\b/.test(await selectedName(page)), { message: "⇧Enter goes up to the Badge" }).catch(async (error) => { throw new Error(`${error.message} (${await selectedName(page)})`); });
        return "value → Text layer → $600K (field) → $700K (Enter on the canvas); Badge label → Text → ⇧Enter → Badge";
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-18", feature: "A nested boolean switched back off returns to the main component (user 2026-10-13: off left `hint: false`): a MetricCard's Metric › Hint on writes overrides, off removes them all", wp: "studio overrides 2026-10-13",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id } = await pageFromTemplate(ctx, "Dashboard");
        const card = await deepSelect(page, ".zen-metric-card");
        await until(async () => (await selectedName(page)) === "MetricCard", { message: "the MetricCard selected" });
        // One level in (Figma's double-click): the Metric the card draws.
        // On its icon (a double-click on its words edits them in place).
        const icon = await page.locator(".studio-frame .zen-metric-card .zen-dock-icon").first().boundingBox();
        await page.mouse.dblclick(icon.x + icon.width / 2, icon.y + icon.height / 2); await sleep(500);
        await until(async () => /^Metric\b/.test(await selectedName(page)), { message: "the nested Metric selected" }).catch(async (error) => { throw new Error(`${error.message} (${await selectedName(page)})`); });
        const hint = page.locator("#studio-right").getByRole("switch", { name: "Hint", exact: true }).first();
        await hint.click();
        await until(async () => /overrides=\{\{ "Metric": \{ hint: "/.test(await firstElementText(page, id, "MetricCard")), { timeout: 8000, message: "the Hint override written" });
        await hint.click();
        await until(async () => !/overrides=/.test(await firstElementText(page, id, "MetricCard")), { timeout: 8000, message: "no override left (not hint: false)" }).catch(async (error) => { throw new Error(`${error.message}: ${(await firstElementText(page, id, "MetricCard")).match(/overrides=\{[^}]*\}\s*\}/)?.[0]}`); });
        return "Hint on → overrides; off → no overrides prop";
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-19", feature: "Figma walk fixes on template pages (2026-10-13): Add to Action-Slots › Button joins the page header's row of buttons (was refused: a fragment in a prop); a Sidebar item renamed on the canvas (⌘-click, double-click its label, type) writes its label; Trend off hides one card's trend", wp: "studio walk 2026-10-13",
    timeout: 90_000,
    async run(ctx) {
      try {
        const { page, id } = await pageFromTemplate(ctx, "Admin list");
        // Sidebar item label, in place.
        const label = await page.locator(".studio-frame .zen-sidebar__item-group").nth(1).evaluate((group) => { const walker = document.createTreeWalker(group, NodeFilter.SHOW_TEXT); for (let node = walker.nextNode(); node; node = walker.nextNode()) { const text = (node.textContent ?? "").trim(); if (text.length > 2) { const r = node.parentElement.getBoundingClientRect(); return { x: r.x + Math.min(r.width / 2, 20), y: r.y + r.height / 2, text }; } } return null; });
        if (!label) throw new Error("no Sidebar item label");
        await page.keyboard.down("Meta"); await page.mouse.click(label.x, label.y); await page.keyboard.up("Meta"); await sleep(400);
        await page.mouse.dblclick(label.x, label.y);
        await until(() => page.evaluate(() => Boolean(document.activeElement?.isContentEditable)), { timeout: 4000, message: "the item's label edits in place" }).catch(async (error) => { throw new Error(`${error.message} (${await selectedName(page)}; status: ${await statusText(page)})`); });
        await page.keyboard.press("Meta+a"); await page.keyboard.type("People"); await page.keyboard.press("Enter");
        await until(async () => /label: "People"/.test((await pageText(page, id)) ?? ""), { timeout: 8000, message: 'label: "People" in the sections' });
        // A button into the page header's actions row.
        await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
        const title = await page.locator(".studio-frame .zen-page-header h1").first().boundingBox();
        await page.keyboard.down("Meta"); await page.mouse.click(title.x + title.width + 40, title.y + title.height / 2); await page.keyboard.up("Meta"); await sleep(400);
        await until(async () => (await selectedName(page)) === "PageHeader", { message: "the PageHeader selected" });
        const before = (await firstElementText(page, id, "PageHeader")).split("<Button").length;
        await page.locator("#studio-right").getByRole("button", { name: /Add to Action-Slots/ }).first().click();
        await page.getByRole("option", { name: /^Button/ }).first().click();
        await until(async () => (await firstElementText(page, id, "PageHeader")).split("<Button").length > before, { timeout: 8000, message: "a Button in the header's actions" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
        if (/actions=\{<>/.test(await firstElementText(page, id, "PageHeader"))) throw new Error("a fragment in actions");
        return `Sidebar "${label.text}" → People in place; Button added to the header's actions`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-20", feature: "Figma's Trend boolean on a Metric card (2026-10-13): off removes that card's trend (its badge goes), on writes a starting trend again", wp: "studio walk 2026-10-13",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id } = await pageFromTemplate(ctx, "Dashboard");
        await deepSelect(page, ".zen-metric-card");
        await until(async () => (await selectedName(page)) === "MetricCard", { message: "the MetricCard selected" });
        const trend = page.locator("#studio-right").getByRole("switch", { name: "Trend", exact: true }).first();
        await trend.click();
        await until(async () => !/trend=/.test(await firstElementText(page, id, "MetricCard")), { timeout: 8000, message: "trend removed from the first card" });
        await until(() => page.evaluate(() => !document.querySelector(".studio-frame .zen-metric-card")?.querySelector(".zen-metric__content .zen-badge")), { timeout: 8000, message: "its badge gone" });
        await trend.click();
        await until(async () => /trend=\{\{/.test(await firstElementText(page, id, "MetricCard")), { timeout: 8000, message: "a trend written again" });
        return "Trend off → no trend; on → a trend";
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-21", feature: "A page made in the Studio marks its elements by document id (user 2026-10-13: \"Refactor định danh layer để sửa gần như tức thì\"): a switch that adds a line leaves the marks of the elements below it as they were, and the Studio still reads their place (a click on one selects it, its Inspector edits it)", wp: "studio ids 2026-10-13",
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id } = await pageFromTemplate(ctx, "Dashboard");
        // The page's document exists after its first edit: one edit first (Hint on the first card, then off).
        await deepSelect(page, ".zen-metric-card");
        await until(async () => (await selectedName(page)) === "MetricCard", { message: "the MetricCard selected" });
        const hint = page.locator("#studio-right").getByRole("switch", { name: "Hint", exact: true }).first();
        await hint.click();
        await until(async () => /hint=/.test(await firstElementText(page, id, "MetricCard")), { timeout: 8000, message: "hint written" });
        // Every mark the page's elements put in the DOM (components that pass their attributes on).
        const marks = () => page.evaluate(() => [...document.querySelectorAll('.studio-frame [data-zen-src^="local:"]')].map((el) => el.getAttribute("data-zen-src")));
        const before = await marks();
        if (before.length < 10 || !before.every((mark) => /:@[\w-]+$/.test(mark ?? ""))) throw new Error(`not marked by id (${before.length}): ${before.slice(0, 3).join(", ")}`);
        await hint.click();
        await until(async () => !/hint=/.test(await firstElementText(page, id, "MetricCard")), { timeout: 8000, message: "hint removed (a line fewer)" });
        const after = await marks();
        if (after.join("|") !== before.join("|")) throw new Error("the marks of the elements below changed with the line count");
        // Their place is still read right: ⌘-click a ListBox's padding selects the ListBox.
        const list = await page.locator(".studio-frame .zen-list-box").first().boundingBox();
        await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
        await page.keyboard.down("Meta"); await page.mouse.click(list.x + 4, list.y + 4); await page.keyboard.up("Meta");
        await until(async () => (await selectedName(page)) === "ListBox", { message: "the ListBox selected by its mark" }).catch(async (error) => { throw new Error(`${error.message} (${await selectedName(page)})`); });
        return `${before.length} marks kept through an edit that removed a line; ListBox selected`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-22", feature: "A page from the Admin list template works as the template does (user 2026-10-15: \"chip advance, date input… hoạt động như bình thường trong studio\"): its filter Chip keeps no controlled prop that would lock it, and in Interact it picks a value (the label shows it), counts a second one and × clears them", wp: "studio self-managed 2026-10-15",
    timeout: 60_000,
    async run(ctx) {
      try {
        /** Names the step that failed. */
        const step = async (name, run) => { try { return await run(); } catch (error) { throw new Error(`${name}: ${error.message}`); } };
        const { page, id: pageId, newErrors } = await step("New page from the Admin list frame", () => pageFromFrame(ctx, 0, { on: "templates" }));
        const chipText = await firstElementText(page, pageId, "Chip");
        if (!/popoverItems=/.test(chipText) || /\bselected=|\bpopoverOpen=|onPopoverSelect/.test(chipText)) throw new Error(`expected a filter Chip with its items and no controlled selected / popoverOpen:\n${chipText.slice(0, 500)}`);
        // The page's Screen in view (the new page opens on its overlays), then Interact.
        await focusScreen(page);
        await page.keyboard.press("KeyI");
        await until(async () => (await page.locator(".studio-viewport").getAttribute("data-tool")) === "interact", { message: "the Interact tool on" });
        const chip = page.locator(`.studio-frame [data-zen-src^="local:${pageId}.zen.tsx:"][data-zen-name="Chip"][aria-haspopup="listbox"]`).first();
        const label = () => chip.locator(".zen-chip__label").innerText();
        const placeholder = await label();
        await step("open the chip's menu", () => chip.click());
        const options = page.locator(".studio-frame .zen-popover").getByRole("option");
        await options.first().waitFor({ state: "visible", timeout: 5000 });
        const [first, second] = (await options.allInnerTexts()).map((text) => text.trim());
        await step(`pick "${first}"`, () => options.filter({ hasText: first }).first().click());
        await until(async () => (await label()) === first, { message: `the chip's label to show "${first}"` }).catch(async (error) => { throw new Error(`${error.message} (shows "${await label()}")`); });
        await step(`pick "${second}"`, () => options.filter({ hasText: second }).first().click());
        await until(async () => (await label()) === placeholder && /2 applied/.test((await chip.getAttribute("aria-label")) ?? ""), { message: "two values counted" });
        await page.keyboard.press("Escape");
        await step("press ×", () => chip.locator(".zen-chip__multi-trailing").click());
        await until(async () => (await chip.getAttribute("data-select")) === "false", { message: "× to clear the filter" });
        if (newErrors().length) throw new Error(`console errors on the new page: ${newErrors().slice(0, 2).join(" | ").slice(0, 300)}`);
        return `"${placeholder}" → "${first}" → "${placeholder}, 2 applied" → cleared`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "SP-23", feature: "A page from the Dashboard template: in Interact the New project form's DateField opens its calendar and a picked day fills the field (user 2026-10-15: \"date input… hoạt động như bình thường trong studio\")", wp: "studio self-managed 2026-10-15",
    timeout: 60_000,
    async run(ctx) {
      try {
        const step = async (name, run) => { try { return await run(); } catch (error) { throw new Error(`${name}: ${error.message}`); } };
        const { page, id } = await step("New page from the Dashboard template", () => pageFromTemplate(ctx, "Dashboard"));
        // A value the template's form held is the field's starting value, not a lock (`value=""` kept nothing typed or picked).
        const fieldText = await firstElementText(page, id, "DateField");
        if (/\bvalue=/.test(fieldText)) throw new Error(`the DateField keeps a controlled value: ${fieldText.slice(0, 200)}`);
        // The form is an Overlay frame of the page: its Layers row brings it into view.
        await showLeftTab(page, "layers");
        const row = page.locator('[data-layer-id^="frame:overlay:"]').filter({ hasText: /new.project/i }).first();
        await step("the New project overlay in Layers", () => row.click());
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Shift+Digit2");
        await page.keyboard.press("KeyI");
        await until(async () => (await page.locator(".studio-viewport").getAttribute("data-tool")) === "interact", { message: "the Interact tool on" });
        const field = page.locator('.studio-frame input[role="combobox"][aria-haspopup="dialog"]').first();
        await step("click the date field", () => field.click());
        await until(async () => (await field.getAttribute("aria-expanded")) === "true", { message: "the calendar open" });
        const day = page.locator(".zen-date-picker__day:not([disabled])").filter({ hasText: /^\s*15\s*$/ }).first();
        await step("pick the 15th", () => day.click());
        const value = await until(async () => { const text = await field.inputValue(); return /\/15\//.test(text) ? text : null; }, { message: "the picked day in the field" });
        return `calendar opens, the 15th fills the field (${value})`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  ...[["SP-02", 4, "Sign in", "desktop"], ["SP-03", 5, "Mobile list", "phone"]].map(([id, frame, name, device]) => ({
    id, feature: `New page from the ${name} template: a ${device} page that renders`, wp: "GĐ3b M1",
    // The first row opens the Templates page, which the server compiles then (about 20 s).
    timeout: 60_000,
    async run(ctx) {
      try {
        const { page, id: pageId, text, status, newErrors } = await pageFromFrame(ctx, frame, { on: "templates" });
        if (!text.includes(`device="${device}"`)) throw new Error(`not a ${device} page:\n${text.slice(0, 600)}`);
        const count = (text.match(/^\s*<[A-Z]/gm) ?? []).length;
        await page.locator(`[data-zen-src^="local:${pageId}.zen.tsx:"]`).nth(4).waitFor({ state: "attached", timeout: 10_000 });
        await sleep(500);
        if (newErrors().length) throw new Error(`console errors on the new page: ${newErrors().slice(0, 2).join(" | ").slice(0, 300)}`);
        const notes = /Not kept: (.*)$/.exec(status)?.[1] ?? "";
        return `${count} elements · ${notes ? `not kept: ${notes.slice(0, 140)}` : "everything kept"}`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  })),
];

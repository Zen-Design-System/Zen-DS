// Starter rows (Studio builder GĐ3b, spec docs/research/studio-builder-starters-spec-2026-10-07.md): a builder page made
// from what an example or template frame shows ("New page from this frame"), kept in the browser and editable.
import { focusFrame, openStudioSpace, showLeftTab, sleep, until } from "../lib/studio.mjs";
import { clickNamed, focusScreen, pageText } from "./builder.mjs";
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

export const rows = [
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

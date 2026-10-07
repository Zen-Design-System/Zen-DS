// Starter rows (Studio builder GĐ3b, spec docs/research/studio-builder-starters-spec-2026-10-07.md): a builder page made
// from what an example or template frame shows ("New page from this frame"), kept in the browser and editable.
import { focusFrame, showLeftTab, sleep, until } from "../lib/studio.mjs";
import { clickNamed, pageText } from "./builder.mjs";
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
      await page.getByRole("button", { name: "New page", exact: true }).click();
      const dialog = page.getByRole("dialog", { name: "New page" });
      await dialog.waitFor({ state: "visible", timeout: 5000 });
      await dialog.getByLabel("Start from").first().click();
      await page.getByRole("option", { name: /^Sign in/ }).click();
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
      const expected = ['<Button level="secondary">Open dialog</Button>', '<Overlay id="fixture-dialog">', '<Dialog title="Fixture dialog" primaryAction={{ label: "Done", onClick: proto.close() }} />'];
      const missing = expected.filter((line) => !text.includes(line));
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

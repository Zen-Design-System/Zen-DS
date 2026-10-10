// Nested instance rows (docs/research/studio-doc-engine-plan-2026-10-10.md §9, fast path A): on a page made in the
// Studio, a Zen component the owner draws itself (Card's Sub-Action, the icon inside it, one Table row's Badge) is
// selected with ⌘-click and changed in the Inspector like Figma's nested instance. The edit is the owner's `overrides`
// (src/components/_shared/nested.tsx), one ⌘Z.
import { sleep, until } from "../lib/studio.mjs";
import { focusScreen, newPage, pageText } from "./builder.mjs";
import { pickOption } from "./inspector.mjs";

const PAGE = `// @zen-page {"format":1,"title":"Nested instances"}
import { Board, Screen, proto } from "@zen/design-system/builder";
import { Card, Stack, Table, Text } from "@zen/design-system";

export const mock = {
  people: [
    { id: "alex", name: "Alex Duong", status: "Active" },
    { id: "binh", name: "Binh Tran", status: "Active" },
    { id: "chi", name: "Chi Le", status: "Away" },
  ],
};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Nested instances" device="desktop">
        <Stack gap="md" padding="xl">
          <Card subAction={{ label: "More" }}>
            <Text textStyle="Heading/3">Team</Text>
          </Card>
          <Table aria-label="People" columns={[{ id: "name", header: "Name", field: "name" }, { id: "status", header: "Status", field: "status", content: "badge" }]} rows={mock.people} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** A Studio page holding a Card with its Sub-Action and a Table of three people; returns the page and its id. */
async function openNestedPage(ctx) {
  const { page } = await newPage(ctx, { device: "desktop" });
  // The app's own page store (same module, served by Vite): the page as the Studio would keep it.
  const id = await page.evaluate(async (text) => (await import("/src/platform/studio/builder/store/pageStore.ts")).importPage(text, null), PAGE);
  const url = new URL(page.url());
  url.searchParams.set("page", `local:${id}`);
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await until(async () => (await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Table"] tbody .zen-badge`).count()) === 3, { timeout: 30000, message: "the page's Card and Table on the canvas" });
  await focusScreen(page);
  await sleep(300);
  return { page, id };
}

const heading = async (page) => (await page.locator("#studio-right h2").first().innerText({ timeout: 1000 }).catch(() => "")).trim();

/**
 * ⌘-clicks the point (x, y) of what `selector` matches until the Inspector shows a part named `name` (the first click
 * selects the written owner, the next ones go on into its parts, as in Figma).
 */
async function deepSelect(page, selector, name, { dy } = {}) {
  for (let click = 0; click < 4; click++) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`${selector} has no box on the canvas`);
    await page.keyboard.down("ControlOrMeta");
    try {
      await page.mouse.click(box.x + box.width / 2, dy === undefined ? box.y + box.height / 2 : box.y + dy);
    } finally {
      await page.keyboard.up("ControlOrMeta");
    }
    await sleep(400);
    if (new RegExp(`^${name}(\\s|·|$)`).test(await heading(page))) return;
  }
  await page.screenshot({ path: `.qa/studio-e2e/nested-${name}.png` }).catch(() => undefined);
  throw new Error(`⌘-click did not reach ${name} (Inspector: "${await heading(page)}")`);
}

/** pickOption, with what the Inspector shows when the row is missing. */
async function pick(page, prop, label) {
  try {
    await pickOption(page, prop, label);
  } catch (error) {
    await page.screenshot({ path: `.qa/studio-e2e/nested-${prop}.png` }).catch(() => undefined);
    const shown = (await page.locator("#studio-right").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 600);
    throw new Error(`no ${prop} option "${label}" (${error.message.split("\n")[0]}) · Inspector: ${shown}`);
  }
}

async function undo(page) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("ControlOrMeta+KeyZ");
}

/** Evidence of a row that works: the Studio as it looks after the edit (.qa/studio-e2e/nested-<row>.png). */
async function shot(page, row) {
  await sleep(400);
  await page.screenshot({ path: `.qa/studio-e2e/nested-${row}.png` }).catch(() => undefined);
}

const subAction = (id) => `[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Card"] .zen-card__sub-action .zen-button`;

export const rows = [
  {
    id: "NO-01", feature: "Card › Sub-Action (a nested IconButton): ⌘-click it, Level → Danger writes the Card's overrides; one ⌘Z", wp: "fast path A 2026-10-10",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      // The button's top padding, above its icon: the IconButton itself, not the Icon inside it.
      await deepSelect(page, subAction(id), "IconButton", { dy: 3 });
      await pick(page, "level", "Danger");
      await until(async () => /overrides=\{\{ "Sub-Action": \{ level: "danger" \} \}\}/.test((await pageText(page, id)) ?? ""), { message: 'overrides={{ "Sub-Action": { level: "danger" } }} in the page' });
      await until(async () => (await page.locator(subAction(id)).getAttribute("data-level")) === "danger", { message: "the Sub-Action drawn Danger" });
      await shot(page, "NO-01");
      await undo(page);
      await until(async () => !/overrides=/.test((await pageText(page, id)) ?? ""), { message: "no overrides after ⌘Z" });
      return "IconButton level secondary → danger as a Card override · ⌘Z → none";
    },
  },
  {
    id: "NO-02", feature: "Level 3: the Icon inside Card › Sub-Action takes its own override (Sub-Action/Leading-Icon)", wp: "fast path A 2026-10-10",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      await deepSelect(page, `${subAction(id)} [data-icon]`, "Icon");
      await pick(page, "tone", /^accent-base\b/);
      await until(async () => /"Sub-Action\/Leading-Icon": \{ tone: "accent-base" \}/.test((await pageText(page, id)) ?? ""), { message: '"Sub-Action/Leading-Icon": { tone: "accent-base" } in the page' });
      await shot(page, "NO-02");
      return "Icon tone → accent-base, written as Sub-Action/Leading-Icon";
    },
  },
  {
    id: "NO-03", feature: "Table › row 2 › Badge: Theme → Red changes that row only (Row[binh]/status/Badge); one ⌘Z", wp: "fast path A 2026-10-10",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      const badges = `[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Table"] tbody .zen-badge`;
      await deepSelect(page, `${badges} >> nth=1`, "Badge");
      await pick(page, "theme", "Red");
      await until(async () => /"Row\[binh\]\/status\/Badge": \{ theme: "red" \}/.test((await pageText(page, id)) ?? ""), { message: '"Row[binh]/status/Badge": { theme: "red" } in the page' });
      const tones = async () => page.locator(badges).evaluateAll((els) => els.map((el) => el.getAttribute("data-tone")).join(","));
      await until(async () => (await tones()) === "neutral,red,neutral", { message: "only the second row's Badge red" }).catch(async (error) => { throw new Error(`${error.message} (tones ${await tones()})`); });
      await shot(page, "NO-03");
      await undo(page);
      await until(async () => (await tones()) === "neutral,neutral,neutral", { message: "every Badge neutral after ⌘Z" });
      return "row 2 Badge neutral → red, rows 1 and 3 unchanged · ⌘Z";
    },
  },
  {
    id: "NO-04", feature: "A component's state shows at once on a page you made (user: \"đổi xong phải refresh trang mới thấy\"): Data-Row State → Selected draws the row selected, ⌘Z draws it unselected, no reload", wp: "states 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      const table = `[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Table"]`;
      // Figma's levels: a click selects the outermost layer there (the page's Stack), each double-click on a cell's text
      // goes one level in (Table, then its Data-Row).
      const cell = page.locator(`${table} tbody tr`).nth(1).locator("td").first();
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      for (let attempt = 0; attempt < 5 && !(await heading(page)).startsWith("Data-Row"); attempt += 1) {
        const box = await cell.boundingBox();
        if (!box) throw new Error("no box for row 2");
        if (attempt === 0) await page.mouse.click(box.x + 12, box.y + box.height / 2);
        else await page.mouse.dblclick(box.x + 12, box.y + box.height / 2);
        await sleep(300);
      }
      if (!(await heading(page)).startsWith("Data-Row")) throw new Error(`could not reach row 2's Data-Row (Inspector: "${await heading(page)}")`);
      await pick(page, "row-state", "Selected");
      await until(async () => /defaultSelectedIds=\{\["binh"\]\}/.test((await pageText(page, id)) ?? ""), { message: 'defaultSelectedIds={["binh"]} in the page' });
      const selected = () => page.locator(`${table} tbody tr`).evaluateAll((rows) => rows.map((row) => row.getAttribute("data-selected") === "true"));
      await until(async () => JSON.stringify(await selected()) === "[false,true,false]", { timeout: 1500, message: "row 2 drawn selected without a reload" }).catch(async (error) => { throw new Error(`${error.message} (rows ${JSON.stringify(await selected())})`); });
      await shot(page, "NO-04");
      await undo(page);
      await until(async () => !/defaultSelectedIds/.test((await pageText(page, id)) ?? ""), { message: "no defaultSelectedIds after ⌘Z" });
      await until(async () => !(await selected()).includes(true), { timeout: 1500, message: "no row drawn selected after ⌘Z, without a reload" }).catch(async (error) => { throw new Error(`${error.message} (rows ${JSON.stringify(await selected())})`); });
      return "Data-Row State → Selected draws row 2 selected at once · ⌘Z draws none";
    },
  },
];

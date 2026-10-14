// Appearance and Effects rows (WP-D): Box corner radius in canonical form, the effect style with its eye, the warnings.
import { inspectorRow, sleep, until } from "../lib/studio.mjs";
import { expectSource, freshSelect, pickOption, scaleStep } from "./inspector.mjs";

const selectBox = (ctx) => freshSelect(ctx, "box", { frame: 2, position: { dx: 6, dy: 6 } });

export const rows = [
  {
    id: "AP-01", feature: "Corner radius: independent corners write the canonical form", wp: "WP-D",
    async run(ctx) {
      const page = await selectBox(ctx);
      await page.locator("#studio-right").getByRole("button", { name: "Independent corners" }).click();
      await until(async () => (await inspectorRow(page, "radiusBottomRight").count()) > 0, { message: "the four corner rows" });
      await pickOption(page, "radiusBottomRight", scaleStep("xs"));
      await expectSource(ctx, "box", (el) => el.attr("radiusBottomRight") === "xs" && el.attr("radius") === "md", 'radius="md" radiusBottomRight="xs"');
      await sleep(300);
      await pickOption(page, "radiusBottomRight", scaleStep("md"));
      await expectSource(ctx, "box", (el) => el.attr("radiusBottomRight") === undefined && el.attr("radius") === "md", "the corner removed again (equals radius)");
      return 'chat tail radius="md" radiusBottomRight="xs", then back to radius only';
    },
  },
  {
    id: "AP-02", feature: "Effects: + adds the elevation, the eye hides and shows it, − removes it", wp: "WP-D",
    async run(ctx) {
      const page = await selectBox(ctx);
      await page.locator("#studio-right").getByRole("button", { name: "Add effect" }).click();
      await expectSource(ctx, "box", (el) => el.attr("effectStyle") === "Shadow/Bottom/Level-1", "Shadow/Bottom/Level-1 added");
      await page.locator("#studio-right").getByRole("button", { name: "Hide effect" }).click();
      await expectSource(ctx, "box", (el) => el.attr("effectStyle") === undefined, "hidden: effectStyle removed");
      // The source loses effectStyle before the inspector re-renders with the hidden row: wait for the row, not just the write.
      await until(async () => (await page.locator("#studio-right").getByText("Hidden. Hidden effects aren't saved in code.").count()) > 0, { message: "no hidden row" });
      await page.locator("#studio-right").getByRole("button", { name: "Show effect" }).click();
      await expectSource(ctx, "box", (el) => el.attr("effectStyle") === "Shadow/Bottom/Level-1", "shown again");
      await page.locator("#studio-right").getByRole("button", { name: "Remove effect" }).click();
      await expectSource(ctx, "box", (el) => el.attr("effectStyle") === undefined, "removed");
      return "add → hide → show → remove";
    },
  },
  {
    id: "AP-03", feature: "Effects warn with a fix: a shadowed surface takes no border", wp: "WP-D",
    async run(ctx) {
      const page = await selectBox(ctx);
      // Border: a segmented control (none · pale · subtle) when its options fit the field column, else a select.
      if (await inspectorRow(page, "border").locator(".zen-segmented").count()) await inspectorRow(page, "border").getByRole("button", { name: "pale", exact: true }).click();
      else await pickOption(page, "border", "pale");
      await expectSource(ctx, "box", (el) => el.attr("border") === "pale", "border pale");
      await page.locator("#studio-right").getByRole("button", { name: "Add effect" }).click();
      await expectSource(ctx, "box", (el) => el.attr("effectStyle") !== undefined, "an effect");
      const fix = page.locator("#studio-right").getByRole("button", { name: "Remove border" });
      await fix.waitFor({ state: "visible", timeout: 3000 });
      await fix.click();
      await expectSource(ctx, "box", (el) => el.attr("border") === undefined && el.attr("effectStyle") !== undefined, "border removed, effect kept");
      return "warning shown; Remove border fixes it";
    },
  },
  {
    id: "AP-05", feature: "Effect settings lists the style's layers read-only (from the style manifest)", wp: "backlog 2026-10-07",
    async run(ctx) {
      const page = await selectBox(ctx);
      const panel = page.locator("#studio-right");
      await panel.getByRole("button", { name: "Add effect" }).click();
      await expectSource(ctx, "box", (el) => el.attr("effectStyle") === "Shadow/Bottom/Level-1", "Shadow/Bottom/Level-1 added");
      await panel.getByRole("button", { name: "Effect settings" }).click();
      const layers = panel.getByRole("group", { name: "Shadow/Bottom/Level-1 settings" });
      await until(async () => (await layers.innerText().catch(() => "")).includes("Drop shadow · X 0 · Y 4 · Blur 8 · Spread −4"), { message: "the Level-1 layers" });
      return (await layers.innerText()).split("\n")[0];
    },
  },
  {
    id: "AP-06", feature: "A Card's Effects row shows the effect its theme draws; picking another effect picks its theme (Figma's style row, 2026-10-13)", wp: "backlog 2026-10-07",
    async run(ctx) {
      const page = await freshSelect(ctx, "card", { frame: 2, position: { dx: 8, dy: 8 } });
      const panel = page.locator("#studio-right");
      const row = page.locator('#studio-right [data-prop="effectStyle"]').first();
      await until(async () => (await row.innerText().catch(() => "")).includes("Shadow/Bottom/Level-1"), { message: "the Card's theme effect" });
      if (!(await panel.innerText()).includes("Set by Theme · Shadow")) throw new Error("no theme caption");
      if (await panel.getByRole("button", { name: "Remove effect" }).count()) throw new Error("the theme effect can be removed");
      await row.getByRole("button", { name: /Shadow\/Bottom\/Level-1/ }).click();
      await page.getByRole("menuitem", { name: /No effect/ }).click();
      await expectSource(ctx, "card", (el) => el.attr("theme") === "flat", 'theme="flat" written');
      await until(async () => (await row.innerText().catch(() => "")).includes("No effect"), { timeout: 8000, message: "the row shows No effect" });
      return "Shadow/Bottom/Level-1 from the Shadow theme; No effect writes theme flat";
    },
  },
  {
    id: "AP-04", feature: "Constraints on the canvas: a floating layer shows its pinned edges", wp: "WP-D",
    async run(ctx) {
      // The Box's padding (2xs) is clear of its Text, so a click there selects the floating Box itself.
      const page = await freshSelect(ctx, "float", { frame: 2, position: { dx: 2, dy: 2 } });
      const pills = page.locator(".studio-constraint-layer [data-constraint-pill]");
      let texts = [];
      await until(async () => {
        texts = await pills.allInnerTexts();
        return texts.some((text) => /^right · sm · \d+$/.test(text)) && texts.some((text) => /^top · xs · \d+$/.test(text));
      }, { message: "the right and top pills" }).catch((error) => { throw new Error(`${error.message} (saw ${JSON.stringify(texts)})`); });
      const lines = await page.locator(".studio-constraint-layer__line").count();
      const owner = await page.locator('.studio-constraint-layer .studio-selection__outline[data-kind="owner"]').count();
      if (lines < 2 || owner !== 1) throw new Error(`expected 2 dashed lines and the owner outline, saw ${lines} lines, ${owner} owner`);
      return texts.join(" | ");
    },
  },
];

// Appearance and Effects rows (WP-D): Box corner radius in canonical form, the effect style with its eye, the warnings.
import { inspectorRow, sleep, until } from "../lib/studio.mjs";
import { expectSource, freshSelect, pickOption } from "./inspector.mjs";

const selectBox = (ctx) => freshSelect(ctx, "box", { frame: 2, position: { dx: 6, dy: 6 } });

export const rows = [
  {
    id: "AP-01", feature: "Corner radius: independent corners write the canonical form", wp: "WP-D",
    async run(ctx) {
      const page = await selectBox(ctx);
      await page.locator("#studio-right").getByRole("button", { name: "Independent corners" }).click();
      await until(async () => (await inspectorRow(page, "radiusBottomRight").count()) > 0, { message: "the four corner rows" });
      await pickOption(page, "radiusBottomRight", /^xs · /);
      await expectSource(ctx, "box", (el) => el.attr("radiusBottomRight") === "xs" && el.attr("radius") === "md", 'radius="md" radiusBottomRight="xs"');
      await sleep(300);
      await pickOption(page, "radiusBottomRight", /^md · /);
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
      if (!(await page.locator("#studio-right").getByText("Hidden. Hidden effects aren't saved in code.").count())) throw new Error("no hidden row");
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
      // Border is a segmented control (none · pale · subtle).
      await inspectorRow(page, "border").getByText("pale", { exact: true }).click();
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

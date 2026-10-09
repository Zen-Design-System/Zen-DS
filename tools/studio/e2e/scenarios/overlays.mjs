// Overlay rows: Interact mode, selecting what a Dialog renders, Present.
import { locOf } from "../lib/source.mjs";
import { clickLoc, focusFrame, selectedSrc, sleep, until } from "../lib/studio.mjs";
import { freshSelect } from "./inspector.mjs";

/** The Move (select) tool from the toolbar (V is the example's own key while Interact has focus inside it). */
const selectTool = (page) => page.getByRole("toolbar", { name: "Tools", exact: true }).getByRole("button", { name: "Move", exact: true }).click();

/** Interact (I), click "Open dialog", wait for the Dialog; returns its box. */
async function openDialog(ctx, page) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("KeyI");
  await clickLoc(page, ctx.file, locOf(await ctx.text(), "open").loc);
  const dialog = page.getByRole("dialog", { name: "Fixture dialog" });
  await dialog.waitFor({ state: "visible", timeout: 4000 });
  return dialog;
}

export const rows = [
  {
    id: "O-01", feature: "Interact mode (I) uses the example: the button opens its Dialog", wp: "GĐ0",
    async run(ctx) {
      const page = await freshSelect(ctx, "open", { frame: 3 });
      const dialog = await openDialog(ctx, page);
      await dialog.getByRole("button", { name: "Done" }).click();
      await until(async () => !(await dialog.isVisible()), { message: "Done to close it" });
      await selectTool(page);
      return "opens, Done closes";
    },
  },
  {
    id: "O-02", feature: "Select mode: click inside an open Dialog selects the Dialog layer", wp: "WP-F",
    async run(ctx) {
      const page = await freshSelect(ctx, "open", { frame: 3 });
      const dialog = await openDialog(ctx, page);
      await selectTool(page);
      const box = await dialog.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + 24);
      const loc = locOf(await ctx.text(), "dialog").loc;
      let selected = [];
      try {
        await until(async () => (selected = await selectedSrc(page)).includes(`${ctx.file}:${loc}`), { timeout: 2500, message: "the Dialog selected" });
      } catch {
        throw new Error(`selected: ${selected.join(", ") || "nothing"} (want the Dialog ${loc})`);
      }
      const outlined = await page.locator('.studio-selection__outline[data-kind="selected"]').count();
      const still = await dialog.isVisible();
      await page.keyboard.press("Escape");
      if (!still) throw new Error("the click in Select mode closed the Dialog (its controls acted)");
      if (!outlined) throw new Error("selected, but no outline around the Dialog");
      return "Dialog selected and outlined; its controls stay inert in Select";
    },
  },
  {
    id: "O-03", feature: "Present (F) shows the frame full screen; Esc exits", wp: "GĐ0",
    async run(ctx) {
      const { page } = await ctx.studio();
      await focusFrame(page, 3);
      await page.keyboard.press("KeyF");
      const exit = page.getByRole("button", { name: /Exit full screen/i });
      await exit.waitFor({ state: "visible", timeout: 4000 });
      await page.keyboard.press("Escape");
      await until(async () => !(await exit.isVisible()), { message: "Esc to exit" });
      return "presents and exits";
    },
  },
];

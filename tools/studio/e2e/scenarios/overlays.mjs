// Overlay rows: Interact mode, selecting what a Dialog renders, Present.
import { locOf } from "../lib/source.mjs";
import { clickLoc, focusFrame, selectedSrc, sleep, statusText, until } from "../lib/studio.mjs";
import { expectSource, freshSelect, pickOption } from "./inspector.mjs";

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
    id: "O-04", feature: "⌘-click on a Dialog's actions selects its ModalActions part; Direction writes the Dialog's actionsDirection (Figma's exposed Buttons › Direction)", wp: "parts 2026-10-09",
    async run(ctx) {
      const page = await freshSelect(ctx, "open", { frame: 3 });
      const dialog = await openDialog(ctx, page);
      await selectTool(page);
      // A point of the actions that no button covers (the gap between Cancel and Done, in a row or a column): a deep click
      // there lands on ModalActions, not on a Button.
      // (By geometry: the canvas is inert in Select, so the browser's hit test does not reach it; the picker reads boxes.)
      const point = await dialog.locator(".zen-modal-actions").first().evaluate((row) => {
        const box = row.getBoundingClientRect();
        const buttons = [...row.querySelectorAll("button")].map((button) => button.getBoundingClientRect());
        const onButton = (x, y) => buttons.some((rect) => x >= rect.left - 1 && x <= rect.right + 1 && y >= rect.top - 1 && y <= rect.bottom + 1);
        for (let y = box.top + 2; y < box.bottom - 2; y += 3) {
          for (let x = box.left + 2; x < box.right - 2; x += 3) if (!onButton(x, y)) return { x, y };
        }
        return null;
      });
      if (!point) throw new Error("every point of the actions row is a button");
      await page.keyboard.down("ControlOrMeta");
      await page.mouse.click(point.x, point.y);
      await page.keyboard.up("ControlOrMeta");
      const heading = async () => (await page.locator("#studio-right h2").first().innerText({ timeout: 1000 }).catch(() => "")).trim();
      await until(async () => /^ModalActions\b/.test(await heading()), { message: "the ModalActions part selected" }).catch(async (error) => { throw new Error(`${error.message} (selected: ${await heading()})`); });
      const row = page.locator('#studio-right [data-prop="actionsDirection"]');
      await row.waitFor({ state: "visible", timeout: 4000 });
      const label = (await row.locator(".studio-inspector__row-label").first().innerText()).trim();
      if (label !== "Direction") throw new Error(`the row reads "${label}", not the part's Direction`);
      await pickOption(page, "actionsDirection", "Vertical");
      await expectSource(ctx, "dialog", (el) => el.attr("actionsDirection") === "vertical", 'actionsDirection="vertical" on the Dialog')
        .catch(async (error) => { throw new Error(`${error.message} (status: ${(await statusText(page)).slice(0, 160)})`); });
      // The edit re-renders the example (the Dialog closes, as after any edit there) and the selection goes back to the
      // Dialog, whose own Properties show the value the part wrote.
      await until(async () => /^Dialog\b/.test(await heading()), { message: "the Dialog selected again" });
      await until(async () => /vertical/i.test(await row.innerText().catch(() => "")), { message: "the Dialog's Actions direction reads Vertical" });
      await page.keyboard.press("Escape");
      return 'ModalActions part → Direction Vertical → <Dialog actionsDirection="vertical">';
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

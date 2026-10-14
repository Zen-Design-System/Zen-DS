// Shell rows: the Studio loads the fixture page, menus open on screen, view commands do what they say.
import { focusFrame, inViewport, sleep, until } from "../lib/studio.mjs";

const CANVAS = ".studio-canvas-area";

async function menuItemsOnScreen(page, opener) {
  await opener();
  const menu = page.getByRole("menu").last();
  await menu.waitFor({ state: "visible", timeout: 4000 });
  const boxes = await menu.getByRole("menuitem").or(menu.getByRole("menuitemradio")).or(menu.getByRole("menuitemcheckbox")).evaluateAll((items) => items.map((item) => {
    const r = item.getBoundingClientRect();
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }));
  await page.keyboard.press("Escape");
  const visible = boxes.filter((box) => inViewport(box)).length;
  if (!boxes.length) throw new Error("the menu has no items");
  if (visible < boxes.length) throw new Error(`${visible}/${boxes.length} menu items on screen (first item y=${Math.round(boxes[0].y)})`);
  return `${visible}/${boxes.length} items on screen`;
}

export const rows = [
  {
    id: "S-01", feature: "Studio loads the page: one frame per example, no errors", wp: "GĐ0",
    async run(ctx) {
      const { page, errors } = await ctx.studio();
      const frames = await page.$$eval("[data-studio-frame^='example:']", (els) => els.map((el) => el.getAttribute("aria-label")));
      const want = ["E2E layout", "E2E data", "E2E slot", "E2E overlay", "E2E save"];
      const missing = want.filter((name) => !frames.includes(name));
      if (missing.length) throw new Error(`missing frames: ${missing.join(", ")} (have ${frames.join(", ")})`);
      const real = errors.filter((e) => !/favicon|DevTools/i.test(e));
      if (real.length) throw new Error(real[0]);
      return `${frames.length} example frames, 0 errors`;
    },
  },
  {
    id: "S-02", feature: "Zoom % menu opens on screen (left panel docked)", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      const trigger = page.locator('[role="toolbar"][aria-label="Zoom"] button').filter({ hasText: "%" }).first();
      return menuItemsOnScreen(page, () => trigger.click());
    },
  },
  {
    // Preview modes change in Play and Present only (user, 2026-10-09): the toolbar has light/dark, no Modes.
    id: "S-03", feature: "Modes: none in the toolbar; Present's Modes panel opens on screen", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      const toolbar = page.locator("header, .studio-toolbar").first();
      if (await toolbar.getByRole("button", { name: "Modes", exact: true }).count()) throw new Error("the toolbar still has Modes");
      await focusFrame(page, 3);
      await page.keyboard.press("KeyF");
      const exit = page.getByRole("button", { name: /Exit full screen/i });
      await exit.waitFor({ state: "visible", timeout: 4000 });
      await page.locator(".studio-present").getByRole("button", { name: "Modes", exact: true }).first().click();
      const pop = page.locator(".platform-fullscreen-bar__panel[role=dialog]").last();
      await pop.waitFor({ state: "visible", timeout: 4000 });
      const box = await pop.boundingBox();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      if (!inViewport(box)) throw new Error(`Modes panel off screen: ${JSON.stringify(box)}`);
      return "no toolbar Modes; Present's panel inside the viewport";
    },
  },
  {
    id: "S-04", feature: "Zoom to fit (⇧1) shows every frame", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+Digit1");
      await sleep(400);
      const result = await page.evaluate((canvasSel) => {
        const area = document.querySelector(canvasSel)?.getBoundingClientRect();
        const left = document.querySelector("#studio-left")?.getBoundingClientRect();
        const right = document.querySelector("#studio-right")?.getBoundingClientRect();
        const x0 = Math.max(area.left, left && left.width ? left.right : area.left);
        const x1 = Math.min(area.right, right && right.width ? right.left : area.right);
        const out = [...document.querySelectorAll("[data-studio-frame]")].filter((frame) => {
          const r = frame.getBoundingClientRect();
          return r.left < x0 - 1 || r.right > x1 + 1 || r.top < area.top - 1 || r.bottom > area.bottom + 1;
        }).map((frame) => frame.getAttribute("aria-label"));
        return { out, total: document.querySelectorAll("[data-studio-frame]").length };
      }, CANVAS);
      if (result.out.length) throw new Error(`${result.out.length}/${result.total} frames outside the visible canvas: ${result.out.join(", ")}`);
      return `${result.total}/${result.total} frames inside the visible canvas`;
    },
  },
  {
    id: "S-05", feature: "Keyboard shortcuts dialog opens with ?", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+Slash");
      const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
      await dialog.waitFor({ state: "visible", timeout: 4000 });
      await page.keyboard.press("Escape");
      await until(async () => !(await dialog.isVisible()), { message: "the dialog to close" });
      return "opens and closes";
    },
  },
  {
    id: "S-06", feature: "Hide / show the side panels (⌘\\)", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      // Shown = laid out on screen and not visibility:hidden (hidden panels slide off as drawers).
      const shown = () => page.evaluate(() => {
        const el = document.querySelector("#studio-right");
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return getComputedStyle(el).visibility !== "hidden" && r.width > 0 && r.left < innerWidth - 1;
      });
      if (!(await shown())) throw new Error("the Inspector is not shown at the start");
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Backslash");
      await until(async () => !(await shown()), { message: "the Inspector to hide" });
      await page.keyboard.press("ControlOrMeta+Backslash");
      await until(() => shown(), { message: "the Inspector to come back" });
      return "Inspector shown → hidden → shown";
    },
  },
  {
    id: "S-07", feature: "Phone width: the Inspector button is reachable in the toolbar", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio({ viewport: { width: 390, height: 844 } });
      const button = page.getByRole("button", { name: /^Inspector/ }).first();
      const box = await button.boundingBox();
      await ctx.studio({ fresh: true });
      if (!box || !inViewport(box, { width: 390, height: 844 })) throw new Error(`Inspector button off screen at 390px: ${JSON.stringify(box)}`);
      return "on screen at 390px";
    },
  },
];

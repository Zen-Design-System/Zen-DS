// Shell rows: the Studio loads the fixture page, menus open on screen, view commands do what they say.
import { focusFrame, inViewport, openAssetLibrary, sleep, until } from "../lib/studio.mjs";
import { pageFromTemplate } from "./starters.mjs";

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
    id: "S-02", feature: "Zoom % menu on the Inspector's tab row (Figma UI3) opens on screen", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      const trigger = page.locator("#studio-right .studio-inspector__tabs .studio-zoom__value").first();
      return menuItemsOnScreen(page, () => trigger.click());
    },
  },
  {
    // Preview modes change in Play and Present only (user, 2026-10-09): the panel headers have no Modes.
    id: "S-03", feature: "Modes: none in the panel headers; Present's Modes panel opens on screen", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      if (await page.locator(".studio-panel-head, .studio-bar").getByRole("button", { name: "Modes", exact: true }).count()) throw new Error("a panel header still has Modes");
      await focusFrame(page, 3);
      await page.keyboard.press(process.platform === "darwin" ? "Alt+Meta+Enter" : "Control+Alt+Enter");
      const exit = page.getByRole("button", { name: /Exit full screen/i });
      await exit.waitFor({ state: "visible", timeout: 4000 });
      await page.locator(".studio-present").getByRole("button", { name: "Modes", exact: true }).first().click();
      const pop = page.locator(".studio-present-bar__panel[role=dialog]").last();
      await pop.waitFor({ state: "visible", timeout: 4000 });
      const box = await pop.boundingBox();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      if (!inViewport(box)) throw new Error(`Modes panel off screen: ${JSON.stringify(box)}`);
      return "no Modes in the panel headers; Present's panel inside the viewport";
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
    id: "S-07", feature: "Phone width: the Inspector button is reachable in its corner bar", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio({ viewport: { width: 390, height: 844 } });
      const button = page.getByRole("button", { name: /^Inspector/ }).first();
      const box = await button.boundingBox();
      await ctx.studio({ fresh: true });
      if (!box || !inViewport(box, { width: 390, height: 844 })) throw new Error(`Inspector button off screen at 390px: ${JSON.stringify(box)}`);
      return "on screen at 390px";
    },
  },
  {
    // UX review 2026-10-27 §2.9 (the user's decision): Dark mode in the Zen Studio menu changes the panels and chrome
    // only, as Figma's theme setting; the frames keep the Mode chosen in Preview modes.
    id: "S-08", feature: "Zen Studio menu › Dark mode darkens the chrome only: the app's data-theme goes dark, the frames' world keeps its Mode; Light mode brings the chrome back", wp: "ux review §7.8 2026-10-27",
    async run(ctx) {
      const { page } = await ctx.studio();
      const app = page.locator(".studio-app").first();
      const world = page.locator(".studio-world").first();
      const before = await world.getAttribute("data-theme");
      const menu = async (item) => {
        await page.getByRole("button", { name: "Zen Studio menu" }).first().click();
        await page.getByRole("menu", { name: "Zen Studio" }).getByRole("menuitem", { name: item, exact: true }).click();
      };
      try {
        await menu("Dark mode");
        await until(async () => (await app.getAttribute("data-theme")) === "dark", { message: "the chrome dark" });
        await sleep(200);
        const after = await world.getAttribute("data-theme");
        if (after !== before) throw new Error(`the frames' theme changed with the chrome: ${before} → ${after}`);
        await menu("Light mode");
        await until(async () => (await app.getAttribute("data-theme")) === "light", { message: "the chrome light again" });
        if ((await world.getAttribute("data-theme")) !== before) throw new Error("the frames' theme changed on the way back");
        return `chrome light → dark → light · frames stay ${before}`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    // §2.7: a panel note is one line, the rest in a tooltip (Changes on Desktop, Photos).
    id: "S-09", feature: "Panel notes run to one line with the rest behind an info button: the selected Screen's Changes on Desktop note and the Assets › Photos hint", wp: "ux review §7.6 2026-10-27", timeout: 60_000,
    async run(ctx) {
      try {
        const { page } = await pageFromTemplate(ctx, "Dashboard");
        const section = page.locator("#studio-right .studio-breakpoint-section");
        await section.getByRole("heading", { name: "Changes on Desktop" }).waitFor({ state: "visible", timeout: 5000 });
        const line = section.locator(".studio-inspector__note-line").first();
        const text = (await line.locator(".studio-inspector__note-text").innerText()).trim();
        if (text !== "Nothing: Desktop is the Screen as designed") throw new Error(`the note reads "${text}"`);
        const more = await line.locator(".studio-inspector__note-more").getAttribute("aria-label");
        if (!/View it on Tablet or Mobile/.test(more ?? "")) throw new Error(`the info button says "${more}"`);
        const height = (await line.boundingBox())?.height ?? 0;
        if (height > 28) throw new Error(`the note is ${Math.round(height)}px tall (more than one line)`);
        await openAssetLibrary(page, "Photos");
        const hint = page.locator("#studio-left-panel-assets .studio-assets__hint .studio-inspector__note-text").first();
        await hint.waitFor({ state: "visible", timeout: 5000 });
        const photos = (await hint.innerText()).trim();
        if (photos !== "Drop or upload pictures, up to 5 MB each") throw new Error(`the Photos hint reads "${photos}"`);
        return `"${text}" + info · Photos: "${photos}" + info`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
];

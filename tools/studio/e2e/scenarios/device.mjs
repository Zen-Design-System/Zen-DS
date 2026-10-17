// Device bar rows (user, 2026-10-10): a page made in the Studio picks iOS or Android for its phone and tablet Screens
// (Page › Mobile OS, header `os`); those Screens draw that OS's status bar and bottom bar and publish their safe areas.
import { until } from "../lib/studio.mjs";
import { newPage, pageText } from "./builder.mjs";

const SCREEN = '[data-studio-frame^="screen:"] .studio-builder-screen';
/** The first Screen's bars as the canvas draws them (unscaled CSS px). */
const barsOf = (page) => page.evaluate((selector) => {
  const screen = document.querySelector(selector);
  const status = screen?.querySelector(":scope > .studio-device-status");
  const home = screen?.querySelector(":scope > .studio-device-home");
  const style = screen ? getComputedStyle(screen) : null;
  return {
    os: screen?.getAttribute("data-os") ?? null,
    top: style?.getPropertyValue("--zen-safe-area-top").trim() ?? "",
    bottom: style?.getPropertyValue("--zen-safe-area-bottom").trim() ?? "",
    status: status ? { os: status.getAttribute("data-os"), h: status.offsetHeight } : null,
    home: home ? { w: home.offsetWidth, h: home.offsetHeight } : null,
  };
}, SCREEN);

async function pickOs(page, label) {
  // The Page section shows with nothing selected.
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.locator("#studio-right").getByRole("radio", { name: label, exact: true }).or(page.locator("#studio-right").getByRole("button", { name: label, exact: true })).first().click();
}

export const rows = [
  {
    id: "DV-01", feature: "Mobile OS: a phone Screen draws iOS bars by default; Page › Mobile OS › Android switches to Android's (header os)", wp: "device bars 2026-10-10",
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "phone" });
      const ios = await until(async () => { const bars = await barsOf(page); return bars.status ? bars : null; }, { message: "the iOS status bar" });
      if (ios.os !== "ios" || ios.status.h !== 50 || ios.top !== "50px" || ios.bottom !== "28px" || ios.home?.w !== 134) throw new Error(`iOS: ${JSON.stringify(ios)}`);
      await pickOs(page, "Android");
      await until(async () => /^\/\/ @zen-page \{[^\n]*"os":"android"/.test((await pageText(page, id)) ?? ""), { message: 'the header holds "os":"android"' });
      const android = await until(async () => { const bars = await barsOf(page); return bars.os === "android" ? bars : null; }, { message: "the Android bars" });
      if (android.status?.h !== 24 || android.top !== "24px" || android.bottom !== "24px" || android.home?.w !== 108 || android.home?.h !== 4) throw new Error(`Android: ${JSON.stringify(android)}`);
      await pickOs(page, "iOS");
      await until(async () => !/"os":/.test(((await pageText(page, id)) ?? "").split("\n")[0]), { message: "iOS leaves the header without os" });
      return "iOS 50 / 28 · home 134 → Android 24 / 24 · handle 108×4 → iOS again";
    },
  },
  {
    id: "DV-02", feature: "Mobile OS: a desktop Screen draws no system bars and publishes no safe areas", wp: "device bars 2026-10-10",
    async run(ctx) {
      const { page } = await newPage(ctx, { device: "desktop" });
      await page.waitForSelector(SCREEN, { timeout: 8000 });
      const bars = await barsOf(page);
      if (bars.os || bars.status || bars.home) throw new Error(`desktop: ${JSON.stringify(bars)}`);
      return "no bars on desktop";
    },
  },
  {
    id: "DV-03", feature: "A phone Screen's Top and Bottom Navigation sit at its top and its foot on the canvas whatever the window's height (user 2026-10-17: the bottom bar jumped to the top)", wp: "device bars 2026-10-17",
    async run(ctx) {
      const { page } = await newPage(ctx, { device: "phone" });
      const size = page.viewportSize();
      // A window shorter than the Screen: a sticky bar used to stick to it and climb the Screen.
      await page.setViewportSize({ width: size.width, height: 560 });
      try {
        const bars = () => page.evaluate((selector) => {
          const screen = document.querySelector(selector);
          if (!screen) return null;
          const box = screen.getBoundingClientRect();
          const scale = box.height / screen.offsetHeight;
          const edge = (part) => { const el = screen.querySelector(`.studio-builder-screen__${part}`); if (!el) return null; const rect = el.getBoundingClientRect(); return { top: Math.round((rect.top - box.top) / scale), bottom: Math.round((rect.bottom - box.top) / scale) }; };
          return { height: screen.offsetHeight, top: edge("top"), bottom: edge("bottom") };
        }, SCREEN);
        const read = await until(async () => { const value = await bars(); return value?.top && value?.bottom ? value : null; }, { message: "the phone Screen's bars" });
        if (read.top.top !== 0) throw new Error(`the Top Navigation starts ${read.top.top}px from the Screen's top`);
        if (Math.abs(read.bottom.bottom - read.height) > 1) throw new Error(`the Bottom Navigation ends at ${read.bottom.bottom}px of a ${read.height}px Screen (a 560px window)`);
        return `560px window: top bar 0–${read.top.bottom}px, bottom bar ${read.bottom.top}–${read.bottom.bottom}px of ${read.height}px`;
      } finally {
        await page.setViewportSize(size);
      }
    },
  },
];

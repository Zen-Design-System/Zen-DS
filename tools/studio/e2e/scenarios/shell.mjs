// Shell rows: the Studio loads the fixture page, menus open on screen, view commands do what they say; ST-30…32: how a
// page you made opens (its first view, and the viewport it reopens at); S-12: a project's language.
import fs from "node:fs";
import path from "node:path";
import { pagesDirOf } from "../lib/server.mjs";
import { focusFrame, inViewport, openAssetLibrary, openStudio, sleep, statusText, until } from "../lib/studio.mjs";
import { newPage, seededPage } from "./builder.mjs";
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


/** A page you made with a desktop Screen at the origin and overlays as `places` says ([x, y] each; one row or more). */
const framesPage = (places) => (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { Button, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop" width={1512} height={982} x={0} y={0}>
        <Text tone="base">Hello</Text>
      </Screen>
${places.map(([x, y], index) => `      <Overlay id="overlay-${index + 1}" title="Overlay ${index + 1}" x={${x}} y={${y}}>
        <Button appearance="main" level="primary" size="md" onClick={proto.toast({ title: "Hi" })}>Hi</Button>
      </Overlay>`).join("\n")}
    </Board>
  );
}
`;

/** The frames on screen: each frame's box, which are inside the visible canvas (between the panels), the zoom pill. */
const frameView = (page) => page.evaluate((canvasSel) => {
  const area = document.querySelector(canvasSel)?.getBoundingClientRect();
  const left = document.querySelector("#studio-left")?.getBoundingClientRect();
  const right = document.querySelector("#studio-right")?.getBoundingClientRect();
  const x0 = Math.max(area.left, left && left.width ? left.right : area.left);
  const x1 = Math.min(area.right, right && right.width ? right.left : area.right);
  const frames = [...document.querySelectorAll("[data-studio-frame]")].map((frame) => {
    const r = frame.getBoundingClientRect();
    return { id: frame.getAttribute("data-studio-frame"), x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height), inside: r.left >= x0 - 1 && r.right <= x1 + 1 && r.top >= area.top - 1 && r.bottom <= area.bottom + 1, shows: r.right > x0 && r.left < x1 && r.bottom > area.top && r.top < area.bottom };
  });
  return { frames, zoom: document.querySelector(".studio-zoom__value")?.textContent?.trim() ?? null, visible: [Math.round(x0), Math.round(x1)] };
}, CANVAS);

/** A page of project `project` with a heading (S-13). */
const fontsPage = (project) => (title) => `// @zen-page ${JSON.stringify({ format: 1, title, project })}
import { Board, Screen } from "@zen-ds/react/builder";
import { Heading, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop">
        <Heading level={2}>Quarterly plan</Heading>
        <Text>Ăn uống đầy đủ</Text>
      </Screen>
    </Board>
  );
}
`;

/** A page of project `project` with a Table whose date column holds this year's 25 October (S-12). */
const languagePage = (project, year) => (title) => `// @zen-page ${JSON.stringify({ format: 1, title, project })}
import { Board, Screen } from "@zen-ds/react/builder";
import { Table } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop">
        <Table aria-label="Due" columns={[{ id: "title", header: "Task" }, { id: "due", header: "Due", edit: "date" }]} rows={[{ id: "a", title: "Agenda", due: "${year}-10-25" }]} />
      </Screen>
    </Board>
  );
}
`;

/** Opens the page `id` in a fresh browser context (no viewport remembered for it): its first view. */
async function openFirst(ctx, id) {
  const { page } = await ctx.studio({ fresh: true });
  await page.goto(`${new URL(page.url()).origin}/studio.html?page=local:${id}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-studio-frame^="screen:"]', { timeout: 20_000 });
  await sleep(2000);
  return page;
}

export const rows = [
  {
    id: "ST-30", feature: "A page you made opens at its first Screen (UX review 2026-10-27 §2.3): with frames on three rows, the first open shows the Screen filling the visible canvas (its width between the panels, under 100%), not the overlay frames", wp: "first view + insert 2026-10-27", timeout: 60_000,
    async run(ctx) {
      const { id } = await seededPage(ctx, framesPage([[1608, 0], [2524, 0], [1608, 1120], [0, 2240]]), /overlay-4/);
      const page = await openFirst(ctx, id);
      const view = await frameView(page);
      const screen = view.frames.find((frame) => frame.id === "screen:screen-1");
      if (!screen || !screen.inside) throw new Error(`the Screen is not inside the visible canvas: ${JSON.stringify(screen)} (visible x ${view.visible.join("…")})`);
      const span = view.visible[1] - view.visible[0];
      if (screen.width < span - 100) throw new Error(`the Screen is ${screen.width} px wide on a ${span} px canvas: it does not fill the view`);
      if (view.zoom === "100%") throw new Error("still 100%");
      return `Screen ${screen.width} × ${screen.height} at (${screen.x}, ${screen.y}) in the ${span} px canvas, zoom ${view.zoom}`;
    },
  },
  {
    id: "ST-31", feature: "A page whose frames are one row (a Screen and an overlay beside it) opens zoomed to fit them all, whole and centred (Figma's zoom to fit on a fresh file)", wp: "first view + insert 2026-10-27", timeout: 60_000,
    async run(ctx) {
      const { id } = await seededPage(ctx, framesPage([[1608, 40]]), /overlay-1/);
      const page = await openFirst(ctx, id);
      const view = await frameView(page);
      const out = view.frames.filter((frame) => !frame.inside);
      if (view.frames.length !== 2) throw new Error(`${view.frames.length} frames`);
      if (out.length) throw new Error(`${out.length}/2 frames outside the visible canvas: ${out.map((frame) => frame.id).join(", ")} (zoom ${view.zoom})`);
      return `both frames inside the visible canvas at ${view.zoom}`;
    },
  },
  {
    id: "ST-32", feature: "The viewport is remembered per page: zoom to 100% and pan, open another page and come back, reload — the page shows the same zoom and the same place both times", wp: "first view + insert 2026-10-27", timeout: 60_000,
    async run(ctx) {
      const { id } = await seededPage(ctx, framesPage([[1608, 0], [1608, 1120]]), /overlay-2/);
      const page = await openFirst(ctx, id);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+Digit0");
      await sleep(500);
      const viewport = await page.locator(".studio-viewport").boundingBox();
      await page.mouse.move(viewport.x + viewport.width / 2, viewport.y + viewport.height / 2);
      await page.mouse.wheel(180, 120);
      await sleep(700);
      const before = await frameView(page);
      const screenBefore = before.frames.find((frame) => frame.id === "screen:screen-1");
      if (before.zoom !== "100%") throw new Error(`zoom ${before.zoom} after ⇧0`);
      const same = (after, when) => {
        const screen = after.frames.find((frame) => frame.id === "screen:screen-1");
        if (after.zoom !== before.zoom || !screen || Math.abs(screen.x - screenBefore.x) > 1 || Math.abs(screen.y - screenBefore.y) > 1) throw new Error(`${when}: zoom ${after.zoom}, Screen at (${screen?.x}, ${screen?.y}); before ${before.zoom} at (${screenBefore.x}, ${screenBefore.y})`);
      };
      // Another page (the host page), then back.
      const url = page.url();
      await ctx.studio();
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-studio-frame^="screen:"]', { timeout: 20_000 });
      await sleep(1500);
      same(await frameView(page), "back from another page");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector('[data-studio-frame^="screen:"]', { timeout: 20_000 });
      await sleep(1500);
      same(await frameView(page), "after a reload");
      return `100% with the Screen at (${screenBefore.x}, ${screenBefore.y}) after coming back and after a reload`;
    },
  },
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
    id: "S-02", feature: "Zoom % Chip at the canvas's bottom-right (Figma B4) opens its menu on screen", wp: "WP-A · B4 2026-11-01",
    async run(ctx) {
      const { page } = await ctx.studio();
      const trigger = page.locator(".studio-canvas-area .studio-status .studio-zoom__value").first();
      return menuItemsOnScreen(page, () => trigger.click());
    },
  },
  {
    // Preview modes change in Play and Present only (user, 2026-10-09): the top bar has no Modes.
    id: "S-03", feature: "Modes: none in the top bar; Present's Modes panel opens on screen", wp: "WP-A",
    async run(ctx) {
      const { page } = await ctx.studio();
      if (await page.locator(".studio-topbar").getByRole("button", { name: "Modes", exact: true }).count()) throw new Error("the top bar has Modes");
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
      return "no Modes in the top bar; Present's panel inside the viewport";
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
    id: "S-07", feature: "Phone width: the Inspector button is reachable in the top bar", wp: "WP-A",
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
    // Figma B4 · Workspace Editor (user, 2026-11-01): a top bar across, two Border panes beside the canvas (not over it),
    // the canvas between them the Pale field. The bar has no Mode Segmented: it repeated the Inspector's tabs (user).
    id: "S-10", feature: "B4 chrome: the top bar spans the window over the panes, Pages | Layers and the Inspector sit beside the canvas without covering it and cast no shadow, the canvas is the Pale field, and the bar repeats none of the Inspector's Design · Code tabs", wp: "B4 chrome 2026-11-01",
    async run(ctx) {
      const { page } = await ctx.studio();
      const boxes = await page.evaluate(() => {
        const rect = (selector) => { const r = document.querySelector(selector)?.getBoundingClientRect(); return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width } : null; };
        const shadow = (selector) => { const el = document.querySelector(selector); return el ? getComputedStyle(el).boxShadow : null; };
        return { bar: rect(".studio-topbar"), left: rect("#studio-left"), right: rect("#studio-right"), canvas: rect(".studio-canvas-area"), width: innerWidth, leftShadow: shadow("#studio-left"), rightShadow: shadow("#studio-right"), viewport: getComputedStyle(document.querySelector(".studio-viewport")).backgroundColor };
      });
      const { bar, left, right, canvas } = boxes;
      if (!bar || !left || !right || !canvas) throw new Error(`missing chrome: ${JSON.stringify(boxes)}`);
      if (bar.left > 1 || bar.right < boxes.width - 1) throw new Error(`the top bar spans ${Math.round(bar.left)}…${Math.round(bar.right)} of ${boxes.width}`);
      if (left.top < bar.bottom - 1 || right.top < bar.bottom - 1) throw new Error(`a pane starts above the bar's bottom (${Math.round(bar.bottom)}): left ${Math.round(left.top)}, right ${Math.round(right.top)}`);
      if (canvas.left < left.right || canvas.right > right.left) throw new Error(`the canvas ${Math.round(canvas.left)}…${Math.round(canvas.right)} runs under a pane (${Math.round(left.right)}, ${Math.round(right.left)})`);
      if (boxes.leftShadow !== "none" || boxes.rightShadow !== "none") throw new Error(`a docked pane has a shadow: ${boxes.leftShadow} / ${boxes.rightShadow}`);
      const pale = await page.evaluate(() => { const probe = document.createElement("div"); probe.style.background = "var(--zen-color-background-neutral-pale-default)"; document.querySelector(".studio-canvas-area").append(probe); const value = getComputedStyle(probe).backgroundColor; probe.remove(); return value; });
      if (boxes.viewport !== pale) throw new Error(`the canvas paints ${boxes.viewport}, not Pale ${pale}`);
      const topBar = page.locator(".studio-topbar");
      const repeated = await topBar.getByRole("button", { name: /^(Design|Code|Prototype)$/ }).or(topBar.getByRole("tab")).count();
      if (repeated) throw new Error(`the top bar repeats ${repeated} of the Inspector's views`);
      return `bar 0…${Math.round(bar.right)} · panes from y ${Math.round(left.top)} · canvas ${Math.round(canvas.left)}…${Math.round(canvas.right)} between them · no view switch in the bar`;
    },
  },
  {
    // User 2026-11-01: the page's name centred on the bar, the trail Home › project (avatar, name, switch menu) at its start.
    id: "S-11", feature: "Top bar trail on a page you made: its name centred on the bar, Home › Drafts at the start; Switch project › Drafts opens Drafts' home, Home opens the projects grid; a docs page reads Home › Docs", wp: "B4 chrome 2026-11-01", timeout: 60_000,
    async run(ctx) {
      try {
        const docs = await ctx.studio();
        const docsTrail = (await docs.page.locator(".studio-topbar").getByRole("navigation", { name: "Project" }).innerText()).replace(/\s+/g, " ").trim();
        if (docsTrail !== "Home Docs") throw new Error(`a docs page's trail reads "${docsTrail}"`);
        const { page } = await newPage(ctx);
        const bar = page.locator(".studio-topbar");
        const centred = await page.evaluate(() => {
          const title = document.querySelector(".studio-topbar__title")?.getBoundingClientRect();
          return title ? Math.abs(title.left + title.width / 2 - innerWidth / 2) : null;
        });
        if (centred === null || centred > 60) throw new Error(`the page name is ${centred} px off the bar's centre`);
        const trail = bar.getByRole("navigation", { name: "Project" });
        await trail.getByRole("link", { name: "Home" }).waitFor({ state: "visible", timeout: 4000 });
        await trail.getByRole("button", { name: "Project: Drafts" }).click();
        await page.getByRole("menu", { name: "Switch project" }).getByRole("menuitem", { name: "Drafts", exact: true }).click();
        await until(async () => (await page.locator(".studio-app").getAttribute("data-space")) === "studio" && !(await page.locator("[data-studio-frame]").count()), { message: "Drafts' home (no page open)" });
        await bar.getByRole("navigation", { name: "Project" }).getByRole("link", { name: "Home" }).click();
        await page.locator(".studio-canvas-area .studio-projects__grid").waitFor({ state: "visible", timeout: 4000 });
        return `docs: Home › Docs · name ${Math.round(centred)} px off centre · Switch project › Drafts → its home · Home → Projects grid`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    // BACKLOG-user-and-later P3 (user 2026-10-25 "Để đợt sau"; approved 2026-11-05): a project's language.
    id: "S-12", feature: "Project language: a project's page is US English until Project settings › Language picks Tiếng Việt; then its Table date column reads 25/10 on the canvas and in Play, the canvas world and Play's page say lang vi-VN while Play's bar stays en-US, and project.json keeps the locale", wp: "backlog P3 2026-11-05", timeout: 90_000,
    async run(ctx) {
      const project = "e2e-language";
      const { defaultProjectTheme } = await import("../../project-theme.mjs");
      const now = Date.now();
      await ctx.api.writeProject({ id: project, name: "E2E Language", theme: defaultProjectTheme(), createdAt: now, updatedAt: now });
      try {
        const { page, id } = await seededPage(ctx, languagePage(project, new Date().getFullYear()), /Agenda/);
        const world = page.locator(".studio-world");
        const table = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Table"]`).first();
        await until(async () => /\b10\/25\b/.test(await table.innerText()), { message: "US English first: the due day reads 10/25" });
        const before = await world.getAttribute("lang");
        if (before !== "en-US") throw new Error(`the canvas world says lang ${before} before the change`);
        // Project settings from the Page panel (nothing selected), Language › Tiếng Việt, Save.
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "E2E Language settings" }).click();
        const settings = page.getByRole("dialog", { name: "E2E Language · Settings" });
        await settings.waitFor({ state: "visible", timeout: 5000 });
        await settings.locator('[data-prop="locale"] button').first().click();
        await page.getByRole("option", { name: "Tiếng Việt", exact: true }).click();
        await settings.getByRole("button", { name: "Save", exact: true }).click();
        await settings.waitFor({ state: "hidden", timeout: 8000 });
        await until(async () => /\b25\/10\b/.test(await table.innerText()), { message: "Tiếng Việt: the due day reads 25/10 on the canvas" });
        const lang = await world.getAttribute("lang");
        if (lang !== "vi-VN") throw new Error(`the canvas world says lang ${lang}`);
        const file = path.join(ctx.root, path.dirname(pagesDirOf(ctx.server.port)), "projects", project, "project.json");
        await until(() => JSON.parse(fs.readFileSync(file, "utf8")).locale === "vi-VN", { message: "project.json keeps locale vi-VN" });
        // Play: the page in the project's language, its bar in the Studio's.
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Escape");
        await page.keyboard.press("ControlOrMeta+Alt+Enter");
        const player = page.locator(".studio-player");
        await player.waitFor({ state: "visible", timeout: 5000 });
        await until(async () => /\b25\/10\b/.test(await player.locator(".studio-player__device").innerText()), { message: "Play: the due day reads 25/10" });
        const langs = await player.evaluate((layer) => [layer.querySelector(".studio-present__page")?.getAttribute("lang"), layer.querySelector(".studio-present-bar")?.getAttribute("lang")]);
        if (langs[0] !== "vi-VN" || langs[1] !== "en-US") throw new Error(`Play's page says lang ${langs[0]}, its bar ${langs[1]}`);
        await page.keyboard.press("Escape");
        return "10/25 → Language Tiếng Việt → canvas 25/10 (lang vi-VN) · Play 25/10, bar en-US · project.json locale vi-VN";
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    // User 2026-11-10: "làm upload font riêng từng project".
    id: "S-13", feature: "Project fonts: Project settings › Typography (its tab shows the Typography preview; Color shows Cards) › Upload takes a WOFF2 (InterVariable as AcmeSans-Variable: Acme Sans, Variable) and refuses a PNG with its reason; two JetBrains Mono files become one font whose row warns and whose styles (Regular, Bold) show 400 and 700 and the Zen weights it lacks; Display's Upload font… gives Display the font uploaded; Acme Sans picked for Heading and saved (removed later from its ⋯ menu), the canvas heading draws in its face (loaded from this browser), the project's fonts/ folder and theme.css hold it, a fresh browser gets the file from the dev server; Remove puts Heading back on Inter", wp: "user 2026-11-10", timeout: 120_000,
    async run(ctx) {
      const project = "e2e-fonts";
      const family = "Acme Sans (e2e-fonts)";
      const { defaultProjectTheme } = await import("../../project-theme.mjs");
      const now = Date.now();
      await ctx.api.writeProject({ id: project, name: "E2E Fonts", theme: defaultProjectTheme(), createdAt: now, updatedAt: now });
      const folder = path.join(ctx.root, path.dirname(pagesDirOf(ctx.server.port)), "projects", project);
      const font = fs.readFileSync(path.join(ctx.root, "src/assets/fonts/Inter/InterVariable.woff2"));
      try {
        const { page } = await seededPage(ctx, fontsPage(project), /Quarterly plan/);
        const openSettings = async () => {
          await page.locator(".studio-viewport").focus();
          await page.keyboard.press("Escape");
          await page.getByRole("button", { name: "E2E Fonts settings" }).click();
          const settings = page.getByRole("dialog", { name: "E2E Fonts · Settings" });
          await settings.waitFor({ state: "visible", timeout: 5000 });
          return settings;
        };
        const settings = await openSettings();
        const previewTab = () => settings.getByRole("tablist", { name: "Preview" }).getByRole("tab", { selected: true }).innerText();
        const openGroup = async (name, tab) => {
          await settings.getByRole("tablist", { name: "Settings" }).getByRole("tab", { name }).click();
          await until(async () => (await previewTab()).trim() === tab, { message: `${name} shows the ${tab} preview` });
        };
        await openGroup("Typography", "Typography");
        const upload = settings.locator('input[data-e2e="upload-fonts"]');
        await upload.setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: Buffer.from("89504e470d0a1a0a0000000d49484452", "hex") });
        await until(async () => /Not uploaded: logo\.png \(not a WOFF2, WOFF, TTF or OTF font\)/.test(await statusText(page)), { message: "the PNG refused with its reason" });
        await upload.setInputFiles({ name: "AcmeSans-Variable.woff2", mimeType: "font/woff2", buffer: font });
        const fontsList = settings.getByRole("list", { name: "Fonts" });
        const acme = fontsList.getByRole("button", { name: /^Acme Sans(?! actions)/ });
        await acme.waitFor({ state: "visible", timeout: 8000 });
        const acmeRow = (await acme.innerText()).replace(/\s+/g, " ");
        if (!/Variable/.test(acmeRow)) throw new Error(`Acme Sans's row reads "${acmeRow}"`);
        // Two static files of one family: one font, its row warns; opened, each weight from its name and the Zen weights it lacks.
        const mono = path.join(ctx.root, "src/assets/fonts/JetBrainsMono");
        await upload.setInputFiles(["JetBrainsMono-Regular.woff2", "JetBrainsMono-Bold.woff2"].map((name) => ({ name, mimeType: "font/woff2", buffer: fs.readFileSync(path.join(mono, name)) })));
        const monoRow = fontsList.getByRole("button", { name: /^Jet Brains Mono(?! actions)/ });
        await monoRow.waitFor({ state: "visible", timeout: 8000 });
        const monoName = (await monoRow.getAttribute("aria-label")) ?? (await monoRow.evaluate((el) => el.textContent ?? ""));
        if (!/2 weights/.test(monoName) || !/No Medium, Semi Bold/.test(monoName)) throw new Error(`Jet Brains Mono's row says "${monoName}"`);
        await monoRow.click();
        const pair = settings.getByRole("group", { name: "Jet Brains Mono files" });
        await pair.waitFor({ state: "visible", timeout: 5000 });
        const weights = await pair.locator("button").evaluateAll((buttons) => buttons.map((button) => button.textContent?.trim()).filter((text) => /\d00$/.test(text ?? "")));
        if (weights.join() !== "400,700") throw new Error(`Jet Brains Mono's weights: ${weights.join(", ")}`);
        const gap = (await pair.innerText()).replace(/\s+/g, " ");
        if (!/Regular.*Bold/.test(gap)) throw new Error(`Jet Brains Mono's styles: ${gap}`);
        if (!/No Medium, Semi Bold: text takes the nearest weight/.test(gap)) throw new Error(`Jet Brains Mono's note: ${gap}`);
        // A role list's last option uploads a font for that role.
        await settings.locator('[data-prop="font-display"] button').first().click();
        const chooser = page.waitForEvent("filechooser", { timeout: 5000 });
        await page.getByRole("option", { name: /^Upload font/ }).click();
        await (await chooser).setFiles({ name: "BrandDisplay-Bold.woff2", mimeType: "font/woff2", buffer: fs.readFileSync(path.join(mono, "JetBrainsMono-Bold.woff2")) });
        await until(async () => /Brand Display/.test(await settings.locator('[data-prop="font-display"]').innerText()), { message: "Display on the font uploaded from its list" });
        await settings.locator(".studio-project-setup__settings").screenshot({ path: ".qa/studio-e2e/shell-S-13-fonts.png" }).catch(() => undefined);
        await settings.locator('[data-prop="font-heading"] button').first().click();
        await page.getByRole("option", { name: /^Acme Sans(?! actions)/ }).first().click();
        // A change kept the Typography preview; opening Color shows Cards.
        if ((await previewTab()).trim() !== "Typography") throw new Error(`picking a font switched the preview to ${await previewTab()}`);
        await openGroup("Color", "Cards");
        await settings.getByRole("button", { name: "Save", exact: true }).click();
        await settings.waitFor({ state: "hidden", timeout: 8000 });
        // The canvas: the heading names the project's font first, and its face is loaded from this browser's file.
        const heading = page.locator('[data-zen-name="Heading"]').first();
        await until(async () => (await heading.evaluate((el) => getComputedStyle(el).fontFamily)).startsWith(`"${family}"`), { message: "the heading in Acme Sans" })
          .catch(async (error) => { throw new Error(`${error.message}: ${await heading.evaluate((el) => getComputedStyle(el).fontFamily)}`); });
        const faces = await page.evaluate(async (name) => {
          const list = [...document.fonts].filter((face) => face.family.replace(/"/g, "") === name);
          await Promise.all(list.map((face) => face.load().catch(() => null)));
          return list.map((face) => `${face.status} ${face.weight}`);
        }, family);
        if (faces.join() !== "loaded 100 900") throw new Error(`the faces of ${family}: ${faces.join(", ") || "none"}`);
        // The HTML export's styles.css: the face with its file in the zip's fonts/, by the file's own name.
        const exported = await page.evaluate(async () => {
          const { libraryCss } = await import("/src/platform/studio/builder/export/htmlExport.tsx");
          const assets = new Map();
          const css = libraryCss([...document.querySelectorAll('[data-studio-frame="screen:screen-1"]')], "Fonts", assets);
          return { face: css.split("\n").find((line) => line.includes("@font-face") && line.includes("Acme Sans")) ?? "", role: css.includes('--zen-typography-font-family-heading: "Acme Sans (e2e-fonts)"'), files: [...assets.keys()] };
        });
        if (!exported.role) throw new Error("the HTML export's styles.css has no project Heading font (the project's mode left out)");
        if (!/url\("?fonts\/acmesans-variable-[0-9a-f]{8}\.woff2"?\)/.test(exported.face) || !exported.files.some((file) => /^fonts\/acmesans-variable-/.test(file))) throw new Error(`the HTML export's font: ${exported.face || "no @font-face"} (files ${exported.files.join(", ")})`);
        // The dev server's copy: the file in fonts/, theme.css's @font-face beside it, project.json's Heading.
        await until(() => fs.existsSync(path.join(folder, "fonts")) && fs.readdirSync(path.join(folder, "fonts")).some((file) => /^acmesans-variable-[0-9a-f]{8}\.woff2$/.test(file)), { timeout: 10_000, message: "fonts/acmesans-variable-<hash>.woff2 on the dev server" });
        const css = fs.readFileSync(path.join(folder, "theme.css"), "utf8");
        if (!css.includes(`@font-face { font-family: "${family}"; src: url("fonts/acmesans-variable-`)) throw new Error("theme.css has no @font-face for the file");
        const saved = JSON.parse(fs.readFileSync(path.join(folder, "project.json"), "utf8"));
        if (saved.theme.type.fonts.heading !== "Acme Sans") throw new Error(`project.json's Heading is ${saved.theme.type.fonts.heading}`);
        // Another browser (its own IndexedDB): the file comes from the dev server, the face from that copy.
        const other = await openStudio(ctx.browser, { url: ctx.server.url, page: ctx.host });
        try {
          await until(async () => (await other.page.evaluate(() => document.getElementById("zen-studio-projects")?.textContent ?? "")).includes(`font-family: "${family}"; src: url("blob:`), { timeout: 15_000, message: "the fresh browser's sheet with the font's object URL" });
        } finally {
          await other.context.close();
        }
        // Remove: Heading back on Inter, the project without the font.
        const again = await openSettings();
        await again.getByRole("tablist", { name: "Settings" }).getByRole("tab", { name: "Typography" }).click();
        await again.getByRole("button", { name: "Acme Sans actions" }).click();
        await page.getByRole("menuitem", { name: "Remove font" }).click();
        await again.getByRole("list", { name: "Fonts" }).getByRole("button", { name: /^Acme Sans(?! actions)/ }).waitFor({ state: "detached", timeout: 5000 });
        await again.getByRole("button", { name: "Save", exact: true }).click();
        await again.waitFor({ state: "hidden", timeout: 8000 });
        await until(() => { const json = JSON.parse(fs.readFileSync(path.join(folder, "project.json"), "utf8")); return json.theme.type.fonts.heading === "Inter" && json.theme.type.fonts.display === "Brand Display" && json.theme.type.uploads.map((font) => font.family).join() === "Jet Brains Mono,Brand Display"; }, { message: "project.json back on Inter without Acme Sans" });
        return `Type tab → Typography preview · PNG refused · AcmeSans-Variable.woff2 → Acme Sans, Variable · JetBrainsMono Regular + Bold → one font, 400 + 700, "No Medium, Semi Bold" · Display › Upload font… → Brand Display · Color → Cards · Heading: canvas "${family}" face ${faces[0]} · fonts/ + theme.css @font-face · fresh browser pulled it · Remove → Inter`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "S-14", feature: "Chart colors suggested from Primary: a new project's sectors 3–7 (Zen's palette) turn with a Primary picked (Blue) and the note says so; a sector picked by hand stays when Primary changes again (Violet) and the wand button puts the suggestion back; project.json keeps it", wp: "user 2026-11-11", timeout: 90_000,
    async run(ctx) {
      const project = "e2e-chart";
      const { defaultProjectTheme, suggestedChart, RAMPS, SUPPORT_LABELS } = await import("../../project-theme.mjs");
      const now = Date.now();
      await ctx.api.writeProject({ id: project, name: "E2E Chart", theme: defaultProjectTheme(), createdAt: now, updatedAt: now });
      const folder = path.join(ctx.root, path.dirname(pagesDirOf(ctx.server.port)), "projects", project);
      try {
        const { page } = await seededPage(ctx, fontsPage(project), /Quarterly plan/);
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "E2E Chart settings" }).click();
        const settings = page.getByRole("dialog", { name: "E2E Chart · Settings" });
        await settings.waitFor({ state: "visible", timeout: 5000 });
        await settings.getByRole("tablist", { name: "Settings" }).getByRole("tab", { name: "Color" }).click();
        const section = settings.locator("section", { has: page.getByRole("heading", { name: "Chart colors" }) });
        const sectors = async () => (await section.innerText()).replace(/\s+/g, " ");
        const reads = (chart) => chart.map((slot, index) => `Sector ${index + 3} ${SUPPORT_LABELS[slot.family]}`);
        const expectChart = async (chart, message) => until(async () => { const text = await sectors(); return reads(chart).every((line) => text.includes(line)); }, { message })
          .catch(async (error) => { throw new Error(`${error.message}: ${await sectors()}`); });
        const pickPrimary = (ramp) => settings.getByRole("radiogroup", { name: "Primary ramp" }).getByRole("radio", { name: ramp, exact: true }).check({ force: true });
        await pickPrimary("Blue");
        await expectChart(suggestedChart(RAMPS.Blue), "sectors 3–7 suggested from Blue");
        if (!(await sectors()).includes("Suggested from Primary")) throw new Error(`the note: ${await sectors()}`);
        // A sector picked by hand: the suggestion stops; a new Primary keeps it; the wand puts the suggestion back.
        await section.locator(".studio-project-setup__fields", { hasText: "Sector 3" }).locator("button").first().click();
        await page.getByRole("option", { name: "Red", exact: true }).click();
        await until(async () => (await sectors()).includes("Sector 3 Red"), { message: "Sector 3 on Red" });
        await pickPrimary("Violet");
        const suggest = settings.getByRole("button", { name: "Suggest from Primary" });
        await suggest.waitFor({ state: "visible", timeout: 5000 });
        if (!(await sectors()).includes("Sector 3 Red")) throw new Error(`a new Primary changed the picked sector: ${await sectors()}`);
        await suggest.click();
        await expectChart(suggestedChart(RAMPS.Violet), "the wand's suggestion from Violet");
        await suggest.waitFor({ state: "hidden", timeout: 5000 });
        await settings.locator(".studio-project-setup__settings").screenshot({ path: ".qa/studio-e2e/shell-S-14-chart.png" }).catch(() => undefined);
        await settings.getByRole("button", { name: "Save", exact: true }).click();
        await settings.waitFor({ state: "hidden", timeout: 8000 });
        const want = JSON.stringify(suggestedChart(RAMPS.Violet));
        await until(() => JSON.stringify(JSON.parse(fs.readFileSync(path.join(folder, "project.json"), "utf8")).theme.chart) === want, { message: "project.json's chart = the suggestion from Violet" });
        return `Blue → ${reads(suggestedChart(RAMPS.Blue)).join(", ")} · Sector 3 Red kept on Violet · wand → ${suggestedChart(RAMPS.Violet).map((slot) => slot.family).join(", ")} · saved`;
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "FW-298", feature: "Status colors take a colour of the project's own (user 2026-11-26): each role's color field opens on its current colour; a typed colour makes it Custom with a ramp generated as the Primary's (the preview's CSS), a light one says white text is hard to read; a shipped ramp picked again is its name; project.json keeps { hex }", wp: "user 2026-11-26", timeout: 90_000,
    async run(ctx) {
      const project = "e2e-status";
      const { defaultProjectTheme, RAMPS } = await import("../../project-theme.mjs");
      const now = Date.now();
      await ctx.api.writeProject({ id: project, name: "E2E Status", theme: defaultProjectTheme(), createdAt: now, updatedAt: now });
      const folder = path.join(ctx.root, path.dirname(pagesDirOf(ctx.server.port)), "projects", project);
      let stage = "open";
      let shot = null;
      try {
        const { page } = await seededPage(ctx, fontsPage(project), /Quarterly plan/);
        shot = page;
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "E2E Status settings" }).click();
        const settings = page.getByRole("dialog", { name: "E2E Status · Settings" });
        await settings.waitFor({ state: "visible", timeout: 5000 });
        await settings.getByRole("tablist", { name: "Settings" }).getByRole("tab", { name: "Color" }).click();
        const section = settings.locator("section", { has: page.getByRole("heading", { name: "Status colors" }) });
        const field = (role) => section.getByRole("combobox", { name: `${role} color` });
        const row = (role) => section.locator(`[data-prop="status-${role.toLowerCase()}"]`);
        const draftCss = () => page.evaluate(() => document.getElementById("zen-studio-project-draft")?.textContent ?? "");
        // Each color field shows the role's current colour (Zen's ramps).
        const shown = [await field("Warning").inputValue(), await field("Info").inputValue()].map((value) => value.toUpperCase());
        if (shown.join() !== [RAMPS.Yellow, RAMPS.Blue].join()) throw new Error(`the fields open on ${shown.join(", ")}, not Yellow and Blue`);
        // A colour of its own: Custom, a generated ramp in the draft's CSS.
        stage = "Warning colour";
        await field("Warning").fill("#C2410C");
        await field("Warning").press("Enter");
        await until(async () => (await row("Warning").innerText()).includes("Custom"), { message: "Warning on Custom" });
        await until(async () => /--zen-light-warning-9: #[0-9A-F]{6};/.test(await draftCss()), { message: "the draft's Warning ramp generated (no alias)" });
        // A light one: white text is hard to read, said in the section's note.
        stage = "Info colour";
        await field("Info").fill("#FFE066");
        await field("Info").press("Enter");
        await until(async () => /White text hard to read on Info/.test(await section.innerText()), { message: "the hard-to-read note for Info" });
        // A shipped ramp picked again is its name: the alias comes back, the note goes.
        stage = "Info back on Blue";
        await row("Info").locator("button").first().click();
        // Blue is Info's Zen ramp: its option says so ("Blue Zen").
        await page.getByRole("option", { name: /^Blue\b/ }).click();
        await until(async () => /--zen-light-info-9: var\(--zen-light-blue-9\);/.test(await draftCss()), { message: "Info back on Blue's alias" });
        if (/hard to read/.test(await section.innerText())) throw new Error("the note stays after Blue");
        await settings.locator(".studio-project-setup__settings").screenshot({ path: ".qa/studio-e2e/shell-FW-298-status.png" }).catch(() => undefined);
        await settings.getByRole("button", { name: "Save", exact: true }).click();
        await settings.waitFor({ state: "hidden", timeout: 8000 });
        const saved = () => JSON.parse(fs.readFileSync(path.join(folder, "project.json"), "utf8")).theme.status;
        await until(() => JSON.stringify(saved()) === JSON.stringify({ positive: "Grass", negative: "Tomato", warning: { hex: "#C2410C" }, info: "Blue" }), { message: "project.json's status" })
          .catch((error) => { throw new Error(`${error.message}: ${JSON.stringify(saved())}`); });
        return "fields open on Yellow / Blue · #C2410C → Custom, generated ramp · #FFE066 → hard to read · Blue → alias · saved { hex }";
      } catch (error) {
        await shot?.screenshot({ path: ".qa/studio-e2e/shell-FW-298-failed.png" }).catch(() => undefined);
        throw new Error(`${stage}: ${error.message}`);
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "FW-299", feature: "Typography (the Type tab renamed) with a custom scale lists every text style with its size, line height and letter spacing (user 2026-11-26): a value set on Heading 1 writes its own --zen-typography-* in the draft and shows in the preview's numbers, Back to the scale undoes it, project.json keeps the step's own values", wp: "user 2026-11-26", timeout: 90_000,
    async run(ctx) {
      const project = "e2e-type-steps";
      const { defaultProjectTheme } = await import("../../project-theme.mjs");
      const now = Date.now();
      await ctx.api.writeProject({ id: project, name: "E2E Steps", theme: defaultProjectTheme(), createdAt: now, updatedAt: now });
      const folder = path.join(ctx.root, path.dirname(pagesDirOf(ctx.server.port)), "projects", project);
      let stage = "open";
      let shot = null;
      try {
        const { page } = await seededPage(ctx, fontsPage(project), /Quarterly plan/);
        shot = page;
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "E2E Steps settings" }).click();
        const settings = page.getByRole("dialog", { name: "E2E Steps · Settings" });
        await settings.waitFor({ state: "visible", timeout: 5000 });
        await settings.getByRole("tablist", { name: "Settings" }).getByRole("tab", { name: "Typography", exact: true }).click();
        stage = "custom scale";
        // The scale's select opens its list from a button named by its label and value ("Scale Dashboard").
        await settings.locator('[data-prop="type-scale"]').getByRole("button", { name: /^Scale\b/ }).click();
        await page.getByRole("option", { name: /^Custom/ }).click();
        const styles = settings.locator("section", { has: page.getByRole("heading", { name: "Text styles" }) });
        await styles.waitFor({ state: "visible", timeout: 5000 });
        const draftCss = () => page.evaluate(() => document.getElementById("zen-studio-project-draft")?.textContent ?? "");
        const set = async (name, value) => { const field = styles.getByRole("spinbutton", { name }); await field.fill(String(value)); await field.press("Enter"); };
        stage = "Heading 1 size and letter spacing";
        await set("Heading 1 size", 40);
        await until(async () => /--zen-typography-font-size-heading-1: 40px;/.test(await draftCss()), { message: "Heading 1 at 40px in the draft" });
        await set("Heading 1 letter spacing", -1);
        await until(async () => /--zen-typography-letter-spacing-heading-1: -1px;/.test(await draftCss()), { message: "Heading 1's letter spacing -1px in the draft" });
        const heading = page.locator(".studio-theme-preview").getByText("Heading/1", { exact: true }).locator("xpath=..");
        await until(async () => /40 \/ \d+ · -1/.test(await heading.innerText()), { message: "the preview reads 40 / … · -1 for Heading/1" })
          .catch(async (error) => { throw new Error(`${error.message}: ${await heading.innerText()}`); });
        stage = "back to the scale";
        const back = styles.getByRole("button", { name: "Heading 1 back to the scale" });
        await back.click();
        // Custom starts from the mode's own values (2026-11-27): Dashboard's Heading 1 is 28 / -0.84.
        await until(async () => /--zen-typography-font-size-heading-1: 28px;/.test(await draftCss()) && /--zen-typography-letter-spacing-heading-1: -0\.84px;/.test(await draftCss()), { message: "Heading 1 back at Dashboard's 28px / -0.84px" });
        await back.waitFor({ state: "hidden", timeout: 5000 });
        stage = "save";
        await set("Heading 1 letter spacing", -1);
        await until(async () => /--zen-typography-letter-spacing-heading-1: -1px;/.test(await draftCss()), { message: "letter spacing -1px again" });
        await settings.locator(".studio-project-setup__settings").screenshot({ path: ".qa/studio-e2e/shell-FW-299-styles.png" }).catch(() => undefined);
        await settings.getByRole("button", { name: "Save", exact: true }).click();
        await settings.waitFor({ state: "hidden", timeout: 8000 });
        const saved = () => JSON.parse(fs.readFileSync(path.join(folder, "project.json"), "utf8")).theme.type.scale;
        await until(() => JSON.stringify(saved()) === JSON.stringify({ base: 14, ratio: 1.14, from: "dashboard", steps: { "heading-1": { letterSpacing: -1 } } }), { message: "project.json's scale" })
          .catch((error) => { throw new Error(`${error.message}: ${JSON.stringify(saved())}`); });
        return "Custom → Text styles · Heading 1 40px, -1 → draft + preview · back to Dashboard's 28 / -0.84 · saved { from: dashboard, steps: heading-1 -1 }";
      } catch (error) {
        await shot?.screenshot({ path: ".qa/studio-e2e/shell-FW-299-failed.png" }).catch(() => undefined);
        throw new Error(`${stage}: ${error.message}`);
      } finally {
        await ctx.studio({ fresh: true });
      }
    },
  },
  {
    id: "FW-300", feature: "Text styles always show, as the Figma plugin (user 2026-11-27: \"luôn hiện như plugin figma\", \"cho thanh kéo chọn nhóm để kéo như plugin\", \"hiện đủ các style bên phần preview\"): on Dashboard the table reads the mode's own values and the preview lists every style from Display-Extra/1; a value set there makes the scale Custom from Dashboard; the letter-spacing slider with Styles on Heading moves only the headings, live, springs back to 0, and one Undo takes the whole drag back; project.json keeps from: dashboard",
    async run(ctx) {
      const project = "e2e-type-nudge";
      const { defaultProjectTheme } = await import("../../project-theme.mjs");
      const now = Date.now();
      await ctx.api.writeProject({ id: project, name: "E2E Nudge", theme: defaultProjectTheme(), createdAt: now, updatedAt: now });
      const folder = path.join(ctx.root, path.dirname(pagesDirOf(ctx.server.port)), "projects", project);
      let stage = "open";
      let shot = null;
      try {
        const { page } = await seededPage(ctx, fontsPage(project), /Quarterly plan/);
        shot = page;
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Escape");
        await page.getByRole("button", { name: "E2E Nudge settings" }).click();
        const settings = page.getByRole("dialog", { name: "E2E Nudge · Settings" });
        await settings.waitFor({ state: "visible", timeout: 5000 });
        await settings.getByRole("tablist", { name: "Settings" }).getByRole("tab", { name: "Typography", exact: true }).click();
        stage = "the table on Dashboard";
        const styles = settings.locator("section", { has: page.getByRole("heading", { name: "Text styles" }) });
        await styles.waitFor({ state: "visible", timeout: 5000 });
        const scaleButton = (value) => settings.locator('[data-prop="type-scale"]').getByRole("button", { name: new RegExp(`^Scale ${value}`) });
        await scaleButton("Dashboard").waitFor({ state: "visible", timeout: 5000 });
        const valueOf = (name) => styles.getByRole("spinbutton", { name }).inputValue();
        const read = [await valueOf("Heading 1 size"), await valueOf("Display Extra 1 size"), await valueOf("Heading 1 letter spacing")];
        if (read.join() !== "28,65,-0.84") throw new Error(`the table reads ${read.join(", ")}, not Dashboard's 28, 65, -0.84`);
        stage = "every style in the preview";
        const preview = page.locator(".studio-theme-preview");
        for (const style of ["Display-Extra/1", "Display-Extra/2", "Display-Extra/3", "Display/2", "Display/4", "Label/Small/Medium"]) {
          await preview.getByText(style, { exact: true }).first().waitFor({ state: "visible", timeout: 5000 });
        }
        stage = "a value on Dashboard";
        const draftCss = () => page.evaluate(() => document.getElementById("zen-studio-project-draft")?.textContent ?? "");
        const spacing = async (token) => Number((await draftCss()).match(new RegExp(`--zen-typography-letter-spacing-${token}: (-?[\\d.]+)px;`))?.[1]);
        const field = styles.getByRole("spinbutton", { name: "Heading 1 letter spacing" });
        await field.fill("-1");
        await field.press("Enter");
        await until(async () => /--zen-typography-letter-spacing-heading-1: -1px;/.test(await draftCss()) && /--zen-typography-font-size-display-extra-1: 65px;/.test(await draftCss()), { message: "Heading 1 at -1 over Dashboard's values (Display Extra 1 still 65px)" });
        await scaleButton("Custom").waitFor({ state: "visible", timeout: 5000 });
        stage = "Styles: Heading";
        const nudge = settings.locator('[data-prop="step-nudge"]');
        await nudge.getByRole("button", { name: /^Styles/ }).click();
        await page.getByRole("option", { name: "Heading", exact: true }).click();
        const before = { heading2: await spacing("heading-2"), display1: await spacing("display-1") };
        stage = "drag the slider";
        const slider = nudge.getByRole("slider", { name: "Letter spacing nudge" });
        const box = await slider.boundingBox();
        const y = box.y + box.height / 2;
        await page.mouse.move(box.x + box.width / 2, y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width * 0.9, y, { steps: 8 });
        await until(async () => (await spacing("heading-2")) > before.heading2, { message: "Heading 2's letter spacing grows while dragging" });
        await page.mouse.up();
        await until(async () => (await slider.getAttribute("aria-valuenow")) === "0", { message: "the slider back at 0 once let go" });
        const after = { heading2: await spacing("heading-2"), display1: await spacing("display-1") };
        if (!(after.heading2 > before.heading2) || after.display1 !== before.display1) throw new Error(`after the drag: ${JSON.stringify({ before, after })}`);
        stage = "one Undo";
        await settings.getByRole("button", { name: "Undo", exact: true }).click();
        await until(async () => (await spacing("heading-2")) === before.heading2 && (await spacing("heading-1")) === -1, { message: "one Undo takes the whole drag back (Heading 1 keeps -1)" });
        stage = "the ratio slider";
        // Base and ratio are slider fields (user 2026-11-27: "phần scale có thể cho kéo hoặc điền bằng inline slider"): an
        // arrow key steps the ratio, the formula takes over from Dashboard's values; one Undo puts them back.
        const ratio = settings.getByRole("slider", { name: "Scale ratio" });
        await ratio.press("ArrowRight");
        await until(async () => (await ratio.getAttribute("aria-valuenow")) === "1.15" && !/--zen-typography-font-size-display-extra-1: 65px;/.test(await draftCss()), { message: "ratio 1.15 and the formula's Display Extra 1" });
        await settings.getByRole("button", { name: "Undo", exact: true }).click();
        await until(async () => (await ratio.getAttribute("aria-valuenow")) === "1.14" && /--zen-typography-font-size-display-extra-1: 65px;/.test(await draftCss()), { message: "one Undo: ratio 1.14, Dashboard's values" });
        stage = "save";
        await settings.getByRole("button", { name: "Save", exact: true }).click();
        await settings.waitFor({ state: "hidden", timeout: 8000 });
        const saved = () => JSON.parse(fs.readFileSync(path.join(folder, "project.json"), "utf8")).theme.type.scale;
        await until(() => JSON.stringify(saved()) === JSON.stringify({ base: 14, ratio: 1.14, from: "dashboard", steps: { "heading-1": { letterSpacing: -1 } } }), { message: "project.json's scale" })
          .catch((error) => { throw new Error(`${error.message}: ${JSON.stringify(saved())}`); });
        return `Dashboard: 28 · 65 · -0.84 · preview from Display-Extra/1 · Heading 1 -1 → Custom from Dashboard · Heading nudge ${before.heading2} → ${after.heading2}, Display 1 kept, slider 0 · one Undo · ratio → 1.15 → Undo · saved { from: dashboard }`;
      } catch (error) {
        await shot?.screenshot({ path: `.qa/studio-e2e/shell-FW-300-failed.png` }).catch(() => undefined);
        throw new Error(`${stage}: ${error.message}`);
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

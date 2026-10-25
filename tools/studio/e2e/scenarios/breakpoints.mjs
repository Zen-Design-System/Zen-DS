// Breakpoint rows (user, 2026-10-26; plan docs/research/studio-responsive-breakpoints-2026-10-26.md): a Screen's view
// switch Desktop · Tablet · Mobile (a view, never in the page), a desktop Screen's breakpoint following its width, the
// canvas's "Add Top / Bottom Navigation", Play on the viewed device with its width dragged, "Make a separate Screen" and
// the version Play shows at a phone's width, and "Changes on this breakpoint". Each row makes its own page.
import { showLeftTab, sleep, until } from "../lib/studio.mjs";
import { newPage, pageText } from "./builder.mjs";

const FRAME = "screen:screen-1";
const label = (page, frame = FRAME) => page.locator(`.studio-frame-label[data-chrome-key="label:${frame}"]`);
const toolbar = (page, frame = FRAME) => page.locator(`.studio-frame-toolbar[data-chrome-key="toolbar:${frame}"]`);
const PRESENT_VIEWPORT = ".studio-present__fit > :is(.studio-present__viewport, .studio-player__device)";

/** A Screen frame as the canvas draws it: its width, the breakpoint on the frame and the Screen, its device and layout. */
const frameOf = (page, frame = FRAME) => page.evaluate((id) => {
  const element = document.querySelector(`[data-studio-frame="${CSS.escape(id)}"]`);
  const screen = element?.querySelector(".studio-builder-screen");
  const shell = screen?.querySelector(".zen-app-shell");
  return {
    width: element?.offsetWidth ?? 0,
    view: Boolean(element?.hasAttribute("data-view")),
    frame: element?.getAttribute("data-breakpoint") ?? null,
    breakpoint: screen?.getAttribute("data-breakpoint") ?? null,
    device: screen?.getAttribute("data-device") ?? null,
    layout: screen?.getAttribute("data-layout") ?? null,
    shell: shell?.getAttribute("data-layout") ?? null,
    placeholders: [...(screen?.querySelectorAll(".studio-builder-screen__placeholder") ?? [])].map((node) => node.getAttribute("data-edge")),
  };
}, frame);

/** Waits until the frame matches `want` (the fields named), else throws with what it is. */
async function expectFrame(page, want, message, frame = FRAME) {
  return until(async () => { const now = await frameOf(page, frame); return Object.entries(want).every(([key, value]) => JSON.stringify(now[key]) === JSON.stringify(value)) ? now : null; }, { message, timeout: 8000 })
    .catch(async () => { throw new Error(`${message}: ${JSON.stringify(await frameOf(page, frame))}`); });
}

/** Selects the Screen by its name on the canvas (its toolbar shows). */
async function selectScreen(page, frame = FRAME) {
  await label(page, frame).click();
  await toolbar(page, frame).locator(".studio-frame-toolbar__tools").waitFor({ state: "visible", timeout: 5000 });
}

/** A desktop page with its AppShell, the Screen selected; its text and width before any view. */
async function desktopPage(ctx) {
  const { page, id } = await newPage(ctx, { device: "desktop" });
  await page.locator(`[data-studio-frame="${FRAME}"] .studio-builder-screen`).waitFor({ state: "attached", timeout: 8000 });
  // The page links its phone parts to the desktop header as it opens (responsive-header.mjs): wait for that write.
  const text = await until(async () => { const now = (await pageText(page, id)) ?? ""; return /phoneLinked=/.test(now) ? now : null; }, { message: "the phone parts linked as the page opens" });
  await sleep(300);
  await selectScreen(page);
  return { page, id, text: (await pageText(page, id)) ?? text, saved: await frameOf(page) };
}

const viewOn = async (page, name) => { await toolbar(page).getByRole("button", { name: `View on ${name}` }).click(); };

/** The Screen's W field (Inspector › Layout). */
async function typeWidth(page, width) {
  const field = page.locator('#studio-right [data-prop="frame-size"] input[aria-label="Width"]');
  await field.fill(String(width));
  await field.press("Enter");
}

/** Makes the Mobile copy of the selected Screen from the view switch's menu (viewing Mobile first). */
async function separateMobile(page) {
  await viewOn(page, "Mobile");
  await toolbar(page).getByText("Viewing Mobile", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
  await toolbar(page).getByRole("button", { name: "More views" }).click();
  await page.getByRole("menuitem", { name: /^Make a separate Screen/ }).click();
}

export const rows = [
  {
    id: "BP-01", feature: "View switch: View on Mobile shows a desktop Screen on the page OS's phone (390 wide, phone, mobile breakpoint, \"Viewing Mobile\"), Back to Desktop brings it back; the page text never changes", wp: "breakpoints P1 2026-10-26",
    async run(ctx) {
      const { page, id, text, saved } = await desktopPage(ctx);
      if (saved.breakpoint !== "desktop" || saved.view) throw new Error(`before: ${JSON.stringify(saved)}`);
      await viewOn(page, "Mobile");
      await expectFrame(page, { width: 390, view: true, frame: "mobile", breakpoint: "mobile", device: "phone", layout: "mobile" }, "the Screen viewed on the iPhone");
      await toolbar(page).getByText("Viewing Mobile", { exact: true }).waitFor({ state: "visible", timeout: 5000 });
      if ((await toolbar(page).getByLabel("View width").inputValue()) !== "390") throw new Error("the view's width field does not read 390");
      await viewOn(page, "Tablet");
      await expectFrame(page, { width: 744, frame: "tablet", breakpoint: "tablet", device: "tablet" }, "the Screen viewed on the iPad, portrait");
      await toolbar(page).getByRole("button", { name: "Back to Desktop" }).click();
      await expectFrame(page, { width: saved.width, view: false, frame: "desktop", breakpoint: "desktop", device: "desktop", layout: "desktop" }, "back to the Screen as saved");
      await sleep(300);
      if (((await pageText(page, id)) ?? "") !== text) throw new Error("a view changed the page text");
      return `desktop ${saved.width} → Mobile 390 (phone, mobile) → Tablet 744 → Back to Desktop ${saved.width}; page text unchanged`;
    },
  },
  {
    id: "BP-02", feature: "Editing while viewing: the Screen edits as usual (Canvas › Alt is written) and the view stays; its resize handles and W / H are off; Escape on its name ends the view", wp: "breakpoints P1 2026-10-26",
    async run(ctx) {
      const { page, id, saved } = await desktopPage(ctx);
      await viewOn(page, "Mobile");
      await expectFrame(page, { view: true, breakpoint: "mobile" }, "viewing Mobile");
      if (await page.locator(".studio-frame-handle").count()) throw new Error("the Screen shows resize handles while viewed");
      if (!(await page.locator('#studio-right [data-prop="frame-size"] input[aria-label="Width"]').isDisabled())) throw new Error("W is editable while viewed");
      await page.locator("#studio-right").getByRole("button", { name: /^Alt canvas/ }).click();
      await until(async () => /\scanvas="alt"/.test((await pageText(page, id)) ?? ""), { message: 'Canvas › Alt written as canvas="alt"' });
      await expectFrame(page, { view: true, breakpoint: "mobile", width: 390 }, "the view stays after the edit");
      await label(page).focus();
      await page.keyboard.press("Escape");
      await expectFrame(page, { view: false, breakpoint: "desktop", width: saved.width }, "Escape on the name ends the view");
      return "viewing Mobile: no handles, W off; Canvas › Alt written, view kept; Escape on the name → Desktop";
    },
  },
  {
    id: "BP-03", feature: "A desktop Screen's breakpoint follows its width: W 390 renders it on the mobile breakpoint (the frame, the Screen, its AppShell below 1024) as a web page (no device change); W back gives desktop again", wp: "breakpoints P1 2026-10-26",
    async run(ctx) {
      const { page, id, saved } = await desktopPage(ctx);
      await typeWidth(page, 390);
      await until(async () => /<Screen [^>]*width=\{390\}/.test((await pageText(page, id)) ?? ""), { message: "W 390 written on the Screen" });
      const narrow = await expectFrame(page, { width: 390, view: false, frame: "mobile", breakpoint: "mobile", device: "desktop", layout: "desktop" }, "the 390 desktop Screen on the mobile breakpoint");
      if (narrow.shell === "desktop") throw new Error(`the AppShell kept its desktop structure at 390: ${JSON.stringify(narrow)}`);
      await typeWidth(page, 800);
      await expectFrame(page, { width: 800, breakpoint: "tablet" }, "W 800: tablet");
      await typeWidth(page, saved.width);
      await expectFrame(page, { width: saved.width, breakpoint: "desktop", shell: "desktop", placeholders: [] }, "back to desktop");
      return `W 390 → mobile (AppShell ${narrow.shell}), 800 → tablet, ${saved.width} → desktop; device stays desktop`;
    },
  },
  {
    id: "BP-04", feature: "Missing phone parts: a desktop Screen at a phone's width whose AppShell has no Top / Bottom Navigation shows dashed placeholders; Add Bottom Navigation writes the AppShell's bottomNavigation from its Sidebar's rows (D3) and the AppShell shows its phone pattern; ⌘Z takes it back", wp: "breakpoints P1 2026-10-26",
    async run(ctx) {
      const { page, id } = await desktopPage(ctx);
      await typeWidth(page, 390);
      await expectFrame(page, { breakpoint: "mobile", placeholders: ["top", "bottom"] }, "both placeholders at 390");
      // The selection layer covers the canvas; the placeholder is frame chrome it hands the press to.
      await page.locator('[data-studio-frame="screen:screen-1"] .studio-builder-screen__placeholder[data-edge="bottom"]').click({ force: true });
      const shellText = async () => { const text = (await pageText(page, id)) ?? ""; const start = text.indexOf("<AppShell"); return start < 0 ? "" : text.slice(start); };
      const written = await until(async () => { const text = await shellText(); return /bottomNavigation=\{<BottomNavigation/.test(text) ? text : null; }, { message: "the AppShell's bottomNavigation written" });
      const labels = [...written.slice(written.indexOf("bottomNavigation=")).matchAll(/label: "([^"]+)"/g)].slice(0, 3).map((match) => match[1]);
      if (labels.join(",") !== "Home,Projects,People") throw new Error(`the items are not the Sidebar's rows: ${labels.join(",")}`);
      const shown = await expectFrame(page, { breakpoint: "mobile", shell: "mobile", placeholders: ["top"] }, "the AppShell's phone pattern, the top placeholder left");
      await page.locator('[data-studio-frame="screen:screen-1"] .zen-bottom-nav__item').first().waitFor({ state: "visible", timeout: 5000 });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => !/bottomNavigation=\{<BottomNavigation/.test(await shellText()), { message: "⌘Z takes the Bottom Navigation back" });
      await expectFrame(page, { placeholders: ["top", "bottom"] }, "both placeholders again");
      return `placeholders top + bottom → Add Bottom Navigation: ${labels.join(", ")}, AppShell ${shown.shell} → ⌘Z`;
    },
  },
  {
    id: "BP-05", feature: "Play opens on the device the Screen is viewed on (Mobile → the iPhone, 390 × 844); dragging the viewport's left edge widens it live with a \"W × H · <breakpoint>\" tag", wp: "breakpoints P1 2026-10-26", timeout: 40_000,
    async run(ctx) {
      const { page } = await desktopPage(ctx);
      await viewOn(page, "Mobile");
      await expectFrame(page, { view: true, breakpoint: "mobile" }, "viewing Mobile");
      await page.locator("#studio-right").getByRole("button", { name: "Present", exact: true }).click();
      const present = page.locator(".studio-present");
      await present.waitFor({ state: "visible", timeout: 8000 });
      const screen = present.locator(".studio-builder-screen").first();
      await until(async () => (await screen.getAttribute("data-device")) === "phone" && (await screen.getAttribute("data-breakpoint")) === "mobile", { message: "Play shows the Screen on the phone" });
      const box = await present.locator(PRESENT_VIEWPORT).boundingBox();
      if (!box || Math.abs(box.width / box.height - 390 / 844) > 0.01) throw new Error(`the viewport is not 390 × 844 (${box ? `${Math.round(box.width)} × ${Math.round(box.height)}` : "none"})`);
      const handle = present.locator('.studio-viewport-handles__hit[data-axis="x-start"]');
      const edge = await handle.boundingBox();
      if (!edge) throw new Error("no left-edge handle");
      const from = { x: edge.x + edge.width / 2, y: edge.y + edge.height / 2 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let step = 1; step <= 6; step += 1) await page.mouse.move(from.x - (60 * step) / 6, from.y);
      const tag = await until(async () => { const text = await present.locator(".studio-viewport-handles__label").innerText().catch(() => ""); return /^\d+ × \d+ · (Mobile|Tablet|Desktop)$/.test(text) ? text : null; }, { message: "the drag's tag reads W × H · breakpoint" });
      await page.mouse.up();
      const width = Number(tag.split(" ")[0]);
      if (!(width > 390)) throw new Error(`the left edge did not widen the viewport: ${tag}`);
      await page.keyboard.press("Escape");
      await present.waitFor({ state: "detached", timeout: 5000 });
      return `Play on the iPhone (390 × 844) → left edge dragged: ${tag}`;
    },
  },
  {
    id: "BP-06", feature: "Make a separate Screen: viewing Mobile, More views › Make a separate Screen adds screen-1-mobile (a 390 × 844 phone Screen, versionOf=\"screen-1\", its title · Mobile) beside it, selected; the original goes back to Desktop; the Inspector names it the Mobile version", wp: "breakpoints P3 2026-10-26",
    async run(ctx) {
      const { page, id } = await desktopPage(ctx);
      await separateMobile(page);
      const tag = await until(async () => { const text = (await pageText(page, id)) ?? ""; const at = text.indexOf('<Screen id="screen-1-mobile"'); return at < 0 ? null : text.slice(at, text.indexOf(">", text.indexOf("versionOf", at))); }, { message: "the Mobile Screen in the page" });
      for (const part of ['device="phone"', "width={390}", "height={844}", 'versionOf="screen-1"', '· Mobile"']) if (!tag.includes(part)) throw new Error(`the copy lacks ${part}: ${tag}`);
      await expectFrame(page, { view: false, breakpoint: "desktop" }, "the original back to Desktop");
      await expectFrame(page, { breakpoint: "mobile", device: "phone" }, "the copy on the phone", "screen:screen-1-mobile");
      await until(async () => /Mobile version of/.test(await page.locator("#studio-right").innerText()), { message: "the Inspector names the Mobile version" });
      return "Make a separate Screen → screen-1-mobile (phone 390 × 844, versionOf screen-1), original on Desktop, Inspector: Mobile version of …";
    },
  },
  {
    id: "BP-07", feature: "Play follows versionOf (D4): on Desktop it shows screen-1; Viewport › Device › iPhone shows screen-1-mobile in its place; Desktop shows screen-1 again", wp: "breakpoints P3 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await desktopPage(ctx);
      await separateMobile(page);
      await until(async () => ((await pageText(page, id)) ?? "").includes('versionOf="screen-1"'), { message: "the Mobile version in the page" });
      await expectFrame(page, { view: false }, "the original's view ended");
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id="frame:screen:screen-1"]').click();
      await page.locator("#studio-right").getByRole("button", { name: "Present", exact: true }).click();
      const present = page.locator(".studio-present");
      await present.waitFor({ state: "visible", timeout: 8000 });
      const shownId = () => present.locator(".studio-builder-screen").first().getAttribute("data-screen");
      await until(async () => (await shownId()) === "screen-1", { message: "Play opens on screen-1" });
      const pick = async (name) => {
        await present.getByRole("button", { name: /^Viewport:/ }).click();
        const trigger = present.locator('[id$="-viewport-device-trigger"]');
        await trigger.waitFor({ state: "visible", timeout: 5000 });
        await trigger.click();
        await page.getByRole("option", { name: new RegExp(`^${name}`) }).first().click();
        await page.keyboard.press("Escape");
      };
      await pick("iPhone");
      await until(async () => (await shownId()) === "screen-1-mobile", { message: "the iPhone shows screen-1-mobile" });
      await pick("Desktop");
      await until(async () => (await shownId()) === "screen-1", { message: "Desktop shows screen-1 again" });
      await page.keyboard.press("Escape");
      await present.waitFor({ state: "detached", timeout: 5000 });
      return "Play: screen-1 → iPhone: screen-1-mobile → Desktop: screen-1";
    },
  },
  {
    id: "BP-08", feature: "Changes on this breakpoint: the selected Screen's Inspector says nothing changes on Desktop, and viewed on Mobile lists the phone's modes and the mobile layout", wp: "breakpoints P1 2026-10-26",
    async run(ctx) {
      const { page } = await desktopPage(ctx);
      const section = page.locator("#studio-right .studio-breakpoint-section");
      await section.getByRole("heading", { name: "Changes on Desktop" }).waitFor({ state: "visible", timeout: 5000 });
      if (!/Nothing: Desktop is the Screen as designed/.test(await section.innerText())) throw new Error(`Desktop: ${await section.innerText()}`);
      await viewOn(page, "Mobile");
      await section.getByRole("heading", { name: "Changes on Mobile" }).waitFor({ state: "visible", timeout: 5000 });
      const ids = await section.locator("[data-behaviour]").evaluateAll((items) => items.map((item) => item.getAttribute("data-behaviour")));
      for (const id of ["phone-modes", "mobile-layout"]) if (!ids.includes(id)) throw new Error(`Mobile lists ${ids.join(", ")}: no ${id}`);
      await toolbar(page).getByRole("button", { name: "Back to Desktop" }).click();
      await section.getByRole("heading", { name: "Changes on Desktop" }).waitFor({ state: "visible", timeout: 5000 });
      return `Desktop: nothing → Mobile: ${ids.join(", ")}`;
    },
  },
];

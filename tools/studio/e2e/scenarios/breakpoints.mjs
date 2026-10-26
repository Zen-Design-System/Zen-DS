// Breakpoint rows (user, 2026-10-26; plan docs/research/studio-responsive-breakpoints-2026-10-26.md): a Screen's view
// switch Desktop · Tablet · Mobile (a view, never in the page), a desktop Screen's breakpoint following its width, the
// canvas's "Add Top / Bottom Navigation", Play on the viewed device with its width dragged, "Make a separate Screen" and
// the version Play shows at a phone's width, and "Changes on this breakpoint". Each row makes its own page.
import { selectAt, showLeftTab, sleep, until } from "../lib/studio.mjs";
import { newPage, pageText, seededPage } from "./builder.mjs";
import { pickOption, scaleStep } from "./inspector.mjs";

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


/** A web page drawn at a phone's width (a desktop Screen 390 wide: the mobile breakpoint, the desktop layout) with a row
 *  Stack of two Texts and a footer Text, for the per-breakpoint props (P2). */
const p2Page = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen } from "@zen-ds/react/builder";
import { Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop" width={390} height={844}>
        <Stack direction="row" gap="md" padding="xl">
          <Text>One</Text>
          <Text>Two</Text>
        </Stack>
        <Text>Footer</Text>
      </Screen>
    </Board>
  );
}
`;

/** A 12-column Grid of two Cards and a Text (docs/research/grid-span-2026-10-26.md §4): `width` picks the breakpoint. */
const spanPage = ({ width = 1280, hero = "", side = "" } = {}) => (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen } from "@zen-ds/react/builder";
import { Card, Grid, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop" width={${width}} height={800}>
        <Grid columns={{ desktop: 12, mobile: 2 }} gap="md" padding="xl">
          <Card${hero}><Text>Hero</Text></Card>
          <Card${side}><Text>Side</Text></Card>
          <Text>Note</Text>
        </Grid>
      </Screen>
    </Board>
  );
}
`;

/** Seeds a span page and selects the layer around the `text` (its Card), or the Text itself (`own`). */
async function spanSetup(ctx, options, text, own = false) {
  const seeded = await seededPage(ctx, spanPage(options), /<Text>Note<\/Text>/);
  const { page, id } = seeded;
  await page.locator(`[data-studio-frame="screen:screen-1"]`).first().scrollIntoViewIfNeeded().catch(() => undefined);
  await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
  const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Text"]`).filter({ hasText: text }).first().boundingBox();
  if (!box) throw new Error(`no "${text}" on the canvas`);
  await selectAt(page, box);
  await sleep(300);
  if (!own) await page.keyboard.press("Escape");
  await until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === (own ? "Text" : "Card"), { message: `the ${own ? "Text" : "Card"} selected` });
  return seeded;
}
const cellGroup = (page) => page.locator('#studio-right [data-prop="span"][role="group"]');
const spanField = (page, name) => cellGroup(page).getByRole("spinbutton", { name });
async function typeSpan(page, name, value) {
  const field = spanField(page, name);
  await field.click();
  await field.fill(String(value));
  await field.press("Enter");
}
const gridText = async (page, id) => { const text = (await pageText(page, id)) ?? ""; const at = text.indexOf("<Grid"); return at < 0 ? "" : text.slice(at, text.indexOf("</Grid>", at)); };

/** The seeded P2 page, the canvas zoomed to its Screen. */
async function p2(ctx) {
  const seeded = await seededPage(ctx, p2Page, /<Text>Footer<\/Text>/);
  await page2Ready(seeded.page);
  return seeded;
}
async function page2Ready(page) {
  await page.locator('[data-studio-frame="screen:screen-1"] .studio-builder-screen[data-breakpoint="mobile"]').waitFor({ state: "attached", timeout: 10000 });
  await page.locator(`[data-studio-frame="screen:screen-1"]`).first().scrollIntoViewIfNeeded().catch(() => undefined);
}

/** The page's element named `name` (nth), and its box on the canvas. */
const named = (page, id, name, index = 0) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).nth(index);

/** Selects the row Stack (a Text in it, then Escape to the Stack). */
async function selectRow(page, id) {
  await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
  const box = await named(page, id, "Text").boundingBox();
  if (!box) throw new Error("no Text on the canvas");
  await selectAt(page, box);
  await sleep(300);
  await page.keyboard.press("Escape");
  await until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === "Frame", { message: "the Stack selected" });
}

/** The Screen's opening tag and its Stack's, as the page text writes them now. */
const stackTag = async (page, id) => { const text = (await pageText(page, id)) ?? ""; const at = text.indexOf("<Stack"); return at < 0 ? "" : text.slice(at, text.indexOf(">", text.indexOf("padding", at)) + 1); };
const inspectorButton = (page, name) => page.locator("#studio-right").getByRole("button", { name, exact: true }).first();

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
      // The AppShell itself (`<AppShell ` / `<AppShell>`), not an AppShellAccount in the Screen's phone bar before it.
      const shellText = async () => { const text = (await pageText(page, id)) ?? ""; const start = text.search(/<AppShell[\s>]/); return start < 0 ? "" : text.slice(start); };
      const written = await until(async () => { const text = await shellText(); return /bottomNavigation=\{<BottomNavigation/.test(text) ? text : null; }, { message: "the AppShell's bottomNavigation written" });
      const labels = [...written.slice(written.indexOf("bottomNavigation=")).matchAll(/label: "([^"]+)"/g)].slice(0, 3).map((match) => match[1]);
      // The placeholder Sidebar's rows (appshell-placeholder.mjs, 2026-10-26): every one reads "Label".
      if (labels.join(",") !== "Label,Label,Label") throw new Error(`the items are not the Sidebar's rows: ${labels.join(",")}`);
      const shown = await expectFrame(page, { breakpoint: "mobile", shell: "mobile", placeholders: ["top"] }, "the AppShell's phone pattern, the top placeholder left");
      await page.locator('[data-studio-frame="screen:screen-1"] .zen-bottom-nav__item').first().waitFor({ state: "visible", timeout: 5000 });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => !/bottomNavigation=\{<BottomNavigation/.test(await shellText()), { message: "⌘Z takes the Bottom Navigation back" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await page.locator(".studio-status").first().innerText().catch(() => "?")}; AppShell props: ${[...(await shellText()).slice(0, 4000).matchAll(/^\s{8,10}(\w+)=\{/gm)].map((match) => match[1]).join(",")})`); });
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
  {
    id: "BP-09", feature: "Per-breakpoint props in the Inspector (P2): a Stack on a 390 Screen edits Mobile (Breakpoint row), Flow › Vertical writes direction={{ desktop: \"row\", mobile: \"column\" }} and marks it own; Desktop still shows Horizontal; Same on every breakpoint writes it plain", wp: "breakpoints P2 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await p2(ctx);
      await selectRow(page, id);
      const breakpoint = page.locator("#studio-right").getByRole("group", { name: "Edit the breakpoint" });
      await until(async () => (await breakpoint.getByRole("button", { name: /^Mobile \(shown\)/ }).getAttribute("aria-pressed")) === "true", { message: "the Breakpoint row edits Mobile" });
      await inspectorButton(page, "Vertical").click();
      await until(async () => /direction=\{\{ desktop: "row", mobile: "column" \}\}/.test(await stackTag(page, id)), { message: "direction per breakpoint" });
      await page.locator("#studio-right").getByText("Own on Mobile: Flow").waitFor({ state: "visible", timeout: 5000 });
      await breakpoint.getByRole("button", { name: /^Desktop/ }).click();
      await until(async () => (await inspectorButton(page, "Horizontal").getAttribute("aria-pressed")) === "true", { message: "Desktop still Horizontal" });
      await inspectorButton(page, "Same on every breakpoint").click();
      await until(async () => /direction="row"/.test(await stackTag(page, id)), { message: "Same on every breakpoint → plain row" });
      return "Mobile: Vertical → { desktop: row, mobile: column }, own dot · Desktop: Horizontal · Same on every breakpoint → row";
    },
  },
  {
    id: "BP-10", feature: "Reset to Desktop: a Mobile gap of its own (Gap › Large on the 390 Screen) goes back to Desktop's with Reset, written plain again", wp: "breakpoints P2 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await p2(ctx);
      await selectRow(page, id);
      await pickOption(page, "gap", scaleStep("lg"));
      await until(async () => /gap=\{\{ desktop: "md", mobile: "lg" \}\}/.test(await stackTag(page, id)), { message: "gap per breakpoint" });
      await inspectorButton(page, "Reset to Desktop").click();
      await until(async () => /gap="md"/.test(await stackTag(page, id)), { message: "Reset → gap md plain" });
      return "Mobile gap lg → { desktop: md, mobile: lg } → Reset to Desktop → md";
    },
  },
  {
    id: "BP-11", feature: "Canvas handles write the frame's breakpoint: on the 390 Screen, the row Stack's gap area picks Large and writes gap={{ desktop: \"md\", mobile: \"lg\" }}", wp: "breakpoints P2 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await p2(ctx);
      await selectRow(page, id);
      const one = await named(page, id, "Text", 0).boundingBox();
      const two = await named(page, id, "Text", 1).boundingBox();
      if (!one || !two) throw new Error("the row's Texts have no box");
      await until(async () => (await page.locator('.studio-selection__spacing-hit[data-editable="true"]').count()) > 0, { message: "editable spacing areas" });
      const x = (one.x + one.width + two.x) / 2;
      const y = one.y + one.height / 2;
      await page.mouse.move(x - 1, y);
      await page.mouse.move(x, y);
      await until(async () => /Gap · Medium/.test((await page.locator(".studio-selection__spacing-label").allInnerTexts()).join(" | ")), { message: 'the "Gap · Medium" pill' });
      await page.mouse.down();
      await page.mouse.up();
      await page.getByRole("option", { name: /^Large\b/ }).first().click();
      await until(async () => /gap=\{\{ desktop: "md", mobile: "lg" \}\}/.test(await stackTag(page, id)), { message: "the canvas pick wrote Mobile's key" });
      return "gap area on the 390 Screen → Large → { desktop: md, mobile: lg }";
    },
  },
  {
    id: "BP-12", feature: "Hide on <breakpoint>: the layer menu's Hide on Mobile writes hideOn={[\"mobile\"]} on the Stack (not drawn on the 390 Screen, its Layers row dimmed with the breakpoint); a Text gets Wrap in Box and hide on Mobile (one edit)", wp: "breakpoints P2 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await p2(ctx);
      await selectRow(page, id);
      const stack = await named(page, id, "Stack").boundingBox();
      await page.mouse.click(stack.x + 6, stack.y + stack.height / 2, { button: "right" });
      const menu = page.getByRole("menu").last();
      await menu.waitFor({ state: "visible", timeout: 3000 });
      await menu.getByRole("menuitem", { name: /^Hide on Mobile/ }).click();
      await until(async () => /hideOn=\{\["mobile"\]\}/.test(await stackTag(page, id)), { message: 'hideOn={["mobile"]} written' });
      await until(async () => (await named(page, id, "Stack").getAttribute("data-hidden")) === "true", { message: "the Stack is hidden on the 390 Screen" });
      await showLeftTab(page, "layers");
      await until(async () => (await page.locator('#studio-left [data-hidden-on="mobile"]').count()) > 0, { message: "its Layers row dimmed with the Mobile icon" });
      const footer = await named(page, id, "Text", 2).boundingBox().catch(() => null) ?? await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Text"]:visible`).last().boundingBox();
      if (!footer) throw new Error("no footer Text");
      await selectAt(page, footer);
      await sleep(300);
      await page.mouse.click(footer.x + footer.width / 2, footer.y + footer.height / 2, { button: "right" });
      const second = page.getByRole("menu").last();
      await second.waitFor({ state: "visible", timeout: 3000 });
      await second.getByRole("menuitem", { name: /^Wrap in Box and hide on Mobile/ }).click();
      await until(async () => /<Box hideOn=\{\["mobile"\]\}>\s*<Text>Footer<\/Text>/.test((await pageText(page, id)) ?? ""), { message: "the footer wrapped in a Box hidden on Mobile" });
      return "Stack: Hide on Mobile → hideOn, hidden at 390, Layers row dimmed · Text: Wrap in Box and hide on Mobile";
    },
  },
  {
    id: "BP-13", feature: "On a narrower breakpoint, a Text's sections say All breakpoints; the Stack's Auto layout (per breakpoint) does not; the Screen's Changes on Mobile lists the Stack's per-breakpoint direction", wp: "breakpoints P2 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await p2(ctx);
      await selectRow(page, id);
      await inspectorButton(page, "Vertical").click();
      await until(async () => /direction=\{\{/.test(await stackTag(page, id)), { message: "direction per breakpoint" });
      const autoLayout = page.locator("#studio-right section").filter({ has: page.getByRole("heading", { name: "Auto layout" }) });
      if (await autoLayout.locator(".studio-inspector__everywhere").count()) throw new Error("Auto layout says All breakpoints");
      const text = await named(page, id, "Text", 2).boundingBox().catch(() => null);
      if (text) { await selectAt(page, text); await sleep(400); }
      await until(async () => (await page.locator("#studio-right .studio-inspector__everywhere").count()) > 0, { message: "a Text section says All breakpoints" });
      await page.locator('.studio-frame-label[data-chrome-key="label:screen:screen-1"]').click();
      const changes = page.locator("#studio-right .studio-breakpoint-section");
      await changes.getByRole("heading", { name: "Changes on Mobile" }).waitFor({ state: "visible", timeout: 5000 });
      await until(async () => (await changes.locator('[data-behaviour="layout-props"]').innerText().catch(() => "")).includes("direction row → column"), { message: "Changes on Mobile lists the direction" });
      return "Text: All breakpoints · Auto layout: none · Changes on Mobile: Layout: Stack direction row → column";
    },
  },
  {
    id: "BP-14", feature: "Grid cell (span): a Card in a 12-column Grid shows Grid cell under Resizing; Column span 8 writes span={8} and the Card takes 8 of 12 columns; Take the whole row writes span=\"full\"; pressed again, the span goes", wp: "grid span PR B 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await spanSetup(ctx, {}, "Hero");
      await cellGroup(page).waitFor({ state: "visible", timeout: 5000 });
      await typeSpan(page, "Column span", 8);
      await until(async () => /<Card span=\{8\}>/.test(await gridText(page, id)), { message: "span={8} written" });
      const grid = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Grid"]`).first().boundingBox();
      const card = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Card"]`).first().boundingBox();
      if (!grid || !card || card.width < grid.width * 0.55 || card.width > grid.width * 0.75) throw new Error(`the Card is ${card?.width} of ${grid?.width}, not 8 of 12 columns`);
      await cellGroup(page).getByRole("button", { name: "Take the whole row" }).click();
      await until(async () => /<Card span="full">/.test(await gridText(page, id)), { message: 'span="full" written' });
      await cellGroup(page).getByRole("button", { name: "Take the whole row" }).click();
      await until(async () => /<Card>\s*<Text>Hero/.test(await gridText(page, id)), { message: "the span removed" });
      return "Column span 8 → span={8} (8 of 12) · whole row → full · again → no span";
    },
  },
  {
    id: "BP-15", feature: "Grid cell per breakpoint: on a 390 Screen (mobile, the Grid's 2 columns) a Card with span={8} shows Grid cell on Mobile at 2; Column span 1 writes span={{ desktop: 8, mobile: 1 }}", wp: "grid span PR B 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await spanSetup(ctx, { width: 390, hero: " span={8}" }, "Hero");
      await until(async () => /Grid cell on Mobile/.test(await cellGroup(page).innerText().catch(() => "")), { message: "the group edits Mobile" });
      await until(async () => (await spanField(page, "Column span").inputValue()) === "2", { message: "span 8 shows as 2 of 2" });
      await typeSpan(page, "Column span", 1);
      await until(async () => /<Card span=\{\{ desktop: 8, mobile: 1 \}\}>/.test(await gridText(page, id)), { message: "Mobile's key written" });
      return "390 Screen: span 8 shows 2 → Column span 1 → { desktop: 8, mobile: 1 }";
    },
  },
  {
    id: "BP-16", feature: "Grid cell on a layer without span: Column span 3 on a Text wraps it in <Box span={3}> (the Box selected); Column span 1 on that bare Box unwraps it", wp: "grid span PR B 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await spanSetup(ctx, {}, "Note", true);
      await typeSpan(page, "Column span", 3);
      await until(async () => /<Box span=\{3\}>\s*<Text>Note<\/Text>\s*<\/Box>/.test(await gridText(page, id)), { message: "the Text wrapped in a span Box" });
      await until(async () => (await page.locator("#studio-right h2").first().innerText().catch(() => "")).trim() === "Frame", { message: "the Box selected" });
      await typeSpan(page, "Column span", 1);
      await until(async () => { const text = await gridText(page, id); return /<\/Card>\s*<Text>Note<\/Text>/.test(text) && !/<Box span/.test(text); }, { message: "the Box unwrapped" });
      return "Text: Column span 3 → <Box span={3}> · span 1 → unwrapped";
    },
  },
  {
    id: "BP-17", feature: "Grid cell rows: Row span 2 on a Card writes rowSpan={2}; with the hero over 8 and the side over 3, the group says Row 1 leaves 1 of 12 columns empty", wp: "grid span PR B 2026-10-26", timeout: 45_000,
    async run(ctx) {
      const { page, id } = await spanSetup(ctx, { hero: " span={8}", side: " span={3}" }, "Side");
      await until(async () => /Row 1 leaves 1 of 12 columns empty/.test(await cellGroup(page).innerText().catch(() => "")), { message: "the empty-columns note" });
      await typeSpan(page, "Row span", 2);
      await until(async () => /<Card span=\{3\} rowSpan=\{2\}>/.test(await gridText(page, id)), { message: "rowSpan={2} written" });
      return "Row 1 leaves 1 of 12 columns empty · Row span 2 → rowSpan={2}";
    },
  },
];

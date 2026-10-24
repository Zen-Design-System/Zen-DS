// Prototype rows (Figma's prototype mode on pages made in the Studio, 2026-10-15): connect by dragging a layer's ⊕ onto a
// frame, click an arrow to select its layer, drag an arrow's end to another frame or off to remove it, one target per
// tab of a tab bar, the Flow list, and Play's hotspot hints. Each row makes its own page (builder.mjs newPage).
import { openAssetLibrary, selectAt, showLeftTab, sleep, until } from "../lib/studio.mjs";
import { pickOption } from "./inspector.mjs";
import { clickNamed, newPage, pageText, seededPage, selectStack } from "./builder.mjs";

const text = async (page, id) => (await pageText(page, id)) ?? "";
const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
const playing = (page) => page.locator(".studio-player");
const playScreen = (page) => playing(page).locator(".studio-player__device").getAttribute("data-screen-id");

/** A real pointer drag in small steps (the canvas reads pointermove), from one point to another. */
async function drag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let step = 1; step <= 10; step += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * step) / 10, from.y + ((to.y - from.y) * step) / 10);
    await sleep(16);
  }
  await page.mouse.up();
}

/** Runs one step of a row; a failure names the step (a bare "locator.click: Timeout" says nothing of where). */
async function step(label, run) {
  try {
    return await run();
  } catch (error) {
    throw new Error(`${label}: ${String(error?.message ?? error).split("\n")[0]}`);
  }
}

const frameCenter = async (page, frameId) => center(await page.locator(`[data-studio-frame="${frameId}"]`).boundingBox());

async function prototypeTab(page) {
  await page.locator("#studio-right").getByRole("tab", { name: "Prototype" }).click();
  await page.locator('[data-e2e="prototype-panel"]').waitFor({ state: "visible", timeout: 5000 });
}

/** A page (a phone unless `device` says otherwise) with `screens` Screens (and an Overlay when asked: `overlay` names what
 *  it holds, a Dialog by default), the whole board in view, the Prototype tab open. */
async function protoPage(ctx, { screens = 2, overlay = false, button = false, device = "phone" } = {}) {
  const made = await newPage(ctx, { device });
  const { page, id } = made;
  if (button) {
    await selectStack(page, id);
    await openAssetLibrary(page, "Components");
    await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill("Button");
    await page.locator("#studio-left-panel-assets [data-asset]", { hasText: /^Button/ }).first().click();
    await until(async () => /<Button /.test(await text(page, id)), { message: "a Button" });
  }
  await prototypeTab(page);
  for (let n = 2; n <= screens; n += 1) {
    await page.getByRole("button", { name: "Add screen" }).click();
    await until(async () => new RegExp(`<Screen id="screen-${n}"`).test(await text(page, id)), { message: `screen-${n} in the page` });
  }
  if (overlay) {
    await page.getByRole("button", { name: "Add overlay" }).click();
    await page.getByRole("menuitem", { name: overlay === "card" ? /^Card/ : "Dialog" }).click(); // Add overlay asks what it holds
    await until(async () => /<Overlay id="overlay-1">/.test(await text(page, id)), { message: "overlay-1 in the page" });
  }
  await until(async () => (await page.locator('[data-studio-frame^="screen:"]').count()) === screens, { message: "the screens on the canvas" });
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Shift+Digit1");
  await sleep(400);
  return made;
}

/** A phone Screen whose content outgrows the device under a large-title Top Navigation (PT-12, PT-13). */
const largeTitlePage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen } from "@zen-ds/react/builder";
import { Stack, Text, TopNavigation } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="phone" topNavigation={<TopNavigation type="compact-alt" largeTitle="Expenses" />}>
        <Stack gap="md" padding="lg">
${Array.from({ length: 40 }, (_, index) => `          <Text>Expense ${index + 1}</Text>`).join("\n")}
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** A phone Screen with a Box that leads to Screen 2 (proto.navigate on a layer with no control of its own), a field and
 *  plain text (PT-22). */
const pressedPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { Box, InputField, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="phone">
        <Stack gap="xl" padding="lg">
          <Box padding="lg" surface="surface" radius="lg" onClick={proto.navigate("screen-2")}>
            <Text>Open the details</Text>
          </Box>
          <InputField label="Note" />
          <Text>Nothing happens here</Text>
        </Stack>
      </Screen>
      <Screen id="screen-2" title="Details" device="phone">
        <Stack padding="lg">
          <Text>The details</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** An Android page (header `os`) whose phone Screen is at the iPhone's size (PT-16). */
const androidPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title, os: "android" })}
import { Board, Screen } from "@zen-ds/react/builder";
import { Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="phone" width={390} height={844}>
        <Stack gap="md" padding="lg">
          <Text>Android</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** Option C (user 2026-10-23): a desktop Screen whose Chip opens a DatePicker overlay and whose Button opens a Card
 *  overlay (set to Manual in the row), both by their trigger (PT-18). */
const anchoredPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { Button, Card, Chip, DatePicker, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Orders">
        <Stack gap="md" padding="lg">
          <Chip onClick={proto.open("pick-date")}>Date</Chip>
          <Button onClick={proto.open("tip")}>Tip</Button>
          <Text>Orders</Text>
        </Stack>
      </Screen>
      <Overlay id="pick-date">
        <DatePicker />
      </Overlay>
      <Overlay id="tip">
        <Card>
          <Text>Pick a day first</Text>
        </Card>
      </Overlay>
    </Board>
  );
}
`;

/** A phone Screen whose Chip opens a Bottom Sheet (PT-19). */
const sheetPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { BottomSheet, Chip, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Orders" device="phone">
        <Stack gap="md" padding="lg">
          <Chip onClick={proto.open("sort")}>Sort</Chip>
          <Text>Orders</Text>
        </Stack>
      </Screen>
      <Overlay id="sort">
        <BottomSheet title="Sort by" primaryAction={{ label: "Done", onClick: proto.close() }}>
          <Text>Newest first</Text>
        </BottomSheet>
      </Overlay>
    </Board>
  );
}
`;

/** A Table, a Chip with no action yet and a Search that filters the client column (PT-20). */
const filterPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { Chip, Search, Stack, Table } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Orders">
        <Stack gap="md" padding="lg">
          <Chip>Paid</Chip>
          <Search aria-label="Search orders" onValueChange={proto.filter({ column: "client", match: "contains" })} />
          <Table aria-label="Orders" columns={[{ id: "client", header: "Client" }, { id: "status", header: "Status" }]} rows={[{ id: "1", client: "Acme", status: "Paid" }, { id: "2", client: "Globex", status: "Overdue" }, { id: "3", client: "Initech", status: "Paid" }]} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** A Stepper with Next (no action yet), Previous and Finish (no action yet), and a "done" state of the Screen (PT-21). */
const stepPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { Button, Stack, Stepper, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="checkout" title="Checkout">
        <Stack gap="md" padding="lg">
          <Stepper steps={[{ id: "cart", title: "Cart" }, { id: "pay", title: "Pay" }, { id: "ship", title: "Ship" }]} />
          <Button>Next</Button>
          <Button onClick={proto.step("previous")}>Previous</Button>
          <Button>Finish</Button>
        </Stack>
      </Screen>
      <Screen id="checkout" title="Checkout · done" state="done">
        <Stack gap="md" padding="lg">
          <Text>All done</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** Two phone Screens, Next on the first leading to the second (PT-17). */
const phonePage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { Button, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Home" device="phone">
        <Stack gap="md" padding="lg">
          <Text>First screen</Text>
          <Button onClick={proto.navigate("screen-2")}>Next</Button>
        </Stack>
      </Screen>
      <Screen id="screen-2" title="Details" device="phone">
        <Stack gap="md" padding="lg">
          <Text>Second screen</Text>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** Scrolls what scrolls the shown page (the window's layer, or a box under Present's / Play's bar: the nearest ancestor of
 *  its Sidebar that really scrolls) 400px and checks the AppShell Sidebar stays at the top of that box, at its height,
 *  its rows scrolling inside (PT-11 Play, PT-14 Present). In CSS px, so a scaled fixed viewport measures the same;
 *  `rows: false` skips the rows when the box is tall enough for them. */
async function checkSidebarSticks(root, { rows = true } = {}) {
  await root.locator(".zen-app-shell__sidebar").waitFor({ state: "visible", timeout: 5000 });
  const measure = (scroll) => root.evaluate((el, by) => {
    const side = el.querySelector(".zen-app-shell__sidebar");
    let box = side.parentElement;
    while (box && box !== el.parentElement && !(box.scrollHeight > box.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    if (!box || box === el.parentElement) return { error: "nothing scrolls the shown page" };
    if (by) box.scrollTop = by;
    const rect = side.getBoundingClientRect();
    const view = box.getBoundingClientRect();
    const scale = box.offsetHeight ? view.height / box.offsetHeight : 1;
    const body = side.querySelector(".zen-sidebar__body");
    return { top: (rect.top - view.top - box.clientTop * scale) / scale, height: rect.height / scale, view: box.clientHeight, scrolled: box.scrollTop, bodyScrolls: body.scrollHeight > body.clientHeight + 1, bodyOverflow: getComputedStyle(body).overflowY };
  }, scroll);
  const before = await measure(0);
  if (before.error) throw new Error(before.error);
  const after = await measure(400);
  if (after.scrolled < 100) throw new Error(`the page scrolled only ${after.scrolled}px`);
  if (Math.abs(after.top) > 1) throw new Error(`after a ${after.scrolled}px scroll the Sidebar is ${Math.round(after.top)}px from the top of the scroll box (it should stick at 0)`);
  if (Math.abs(after.height - after.view) > 2) throw new Error(`the Sidebar is ${Math.round(after.height)}px tall in a ${after.view}px scroll box`);
  if (rows && (!after.bodyScrolls || !/auto|scroll/.test(after.bodyOverflow))) throw new Error(`the Sidebar's rows do not scroll inside it (overflow-y ${after.bodyOverflow})`);
  return `scrolled ${after.scrolled}px: Sidebar at ${Math.round(after.top)}px, ${Math.round(after.height)}px in a ${after.view}px box${rows ? ", its rows scroll inside" : ""}`;
}

/** Scrolls what scrolls the shown Screen (the nearest ancestor of its Top Navigation that scrolls its overflow) and checks
 *  the large title folds, the system bars stay at that box's edges, and the title opens again at the top. */
async function checkFold(root) {
  const nav = root.locator(".zen-top-nav").first();
  await nav.waitFor({ state: "visible", timeout: 5000 });
  const measure = (by) => root.evaluate((el, by) => {
    const top = el.querySelector(".zen-top-nav");
    let box = top;
    while (box && box !== el.parentElement && !(box.scrollHeight > box.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    if (!box || box === el.parentElement) return { error: "nothing scrolls the shown screen" };
    if (by !== null) box.scrollTop = by;
    const view = box.getBoundingClientRect();
    const status = el.querySelector(".studio-device-status")?.getBoundingClientRect();
    const home = el.querySelector(".studio-device-home")?.getBoundingClientRect();
    return { scrolled: box.scrollTop, linked: top.getAttribute("data-scroll-linked") === "true", collapsed: top.getAttribute("data-collapsed") === "true", status: status ? status.top - view.top : null, home: home ? view.bottom - home.bottom : null };
  }, by);
  const start = await measure(null);
  if (start.error) throw new Error(start.error);
  if (!start.linked) throw new Error("the Top Navigation does not follow the scroll (no data-scroll-linked)");
  if (start.collapsed) throw new Error("the large title starts folded");
  await measure(400);
  await until(async () => (await measure(null)).collapsed, { message: "the large title folded after a 400px scroll" });
  const down = await measure(null);
  if (down.scrolled < 100) throw new Error(`the screen scrolled only ${down.scrolled}px`);
  if (down.status === null || Math.abs(down.status) > 1) throw new Error(`after a ${down.scrolled}px scroll the status bar is ${down.status === null ? "gone" : `${Math.round(down.status)}px from the top`} (it should stay at 0)`);
  if (down.home === null || down.home < 0 || down.home > 40) throw new Error(`after a ${down.scrolled}px scroll the home indicator is ${down.home === null ? "gone" : `${Math.round(down.home)}px from the bottom`} (it should stay at the bottom edge)`);
  await measure(0);
  await until(async () => !(await measure(null)).collapsed, { message: "the large title open again at the top" });
  return `scrolled ${down.scrolled}px: title folded, status bar at ${Math.round(down.status)}px, home indicator ${Math.round(down.home)}px from the bottom; open again at 0`;
}

export const rows = [
  {
    id: "PT-01", feature: "Prototype ⊕: drag a Button's ⊕ onto Screen 2 (Navigate to), click the arrow (selects the Button), drag its end onto the overlay (Open overlay), off every frame (removed), ⌘Z", wp: "prototype 2026-10-15", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await protoPage(ctx, { overlay: true, button: true });
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      const plus = page.locator(".studio-proto-plus");
      await plus.waitFor({ state: "visible", timeout: 5000 });
      await drag(page, center(await plus.boundingBox()), await frameCenter(page, "screen:screen-2"));
      await until(async () => /onClick=\{proto\.navigate\("screen-2"\)\}/.test(await text(page, id)), { message: 'onClick={proto.navigate("screen-2")} after the drag' });
      await until(async () => (await page.locator(".studio-proto-links").getAttribute("data-links").catch(() => null)) === "1", { message: "one arrow" });
      // Nothing selected, then a click on the arrow selects its layer: the tab shows its tap.
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await until(async () => !(await page.locator('#studio-right [data-trigger="onClick"]').count()), { message: "the Button deselected" });
      const hit = await page.locator(".studio-proto-link__hit").first().boundingBox();
      await page.mouse.click(hit.x + hit.width / 2, hit.y + hit.height / 2);
      await page.locator('#studio-right [data-trigger="onClick"]').waitFor({ state: "visible", timeout: 5000 });
      const label = (await page.locator('#studio-right [data-prop="proto:onClick"]').innerText()).split("\n")[0].trim();
      if (label !== "On tap") throw new Error(`the trigger reads "${label}", not "On tap" (a phone)`);
      // The end onto the overlay, then off every frame.
      const end = page.locator(".studio-proto-end").first();
      await end.waitFor({ state: "visible", timeout: 5000 });
      await drag(page, center(await end.boundingBox()), await frameCenter(page, "overlay:overlay-1"));
      await until(async () => /onClick=\{proto\.open\("overlay-1"\)\}/.test(await text(page, id)), { message: "Open overlay after the end's drag" });
      await sleep(300);
      const viewport = await page.locator(".studio-viewport").boundingBox();
      const end2 = center(await page.locator(".studio-proto-end").first().boundingBox());
      await drag(page, end2, { x: end2.x, y: viewport.y + viewport.height - 100 });
      await until(async () => !/<Button[^>]*onClick=/.test(await text(page, id)), { message: "the interaction removed" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyZ");
      await until(async () => /onClick=\{proto\.open\("overlay-1"\)\}/.test(await text(page, id)), { message: "⌘Z brings it back" });
      return "⊕ → navigate · arrow click selects (On tap) · end → open overlay · end off → removed · ⌘Z";
    },
  },
  {
    id: "PT-02", feature: "Prototype by item: a tab bar shows one ⊕ per tab (the phone's tabs are the Sidebar's rows since 2026-10-16); Projects' ⊕ onto Screen 2 and the People row → Screen 3 lead each tab to its own screen; Play follows the tab", wp: "prototype 2026-10-15", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await protoPage(ctx, { screens: 3 });
      const tab = page.locator('[data-studio-frame="screen:screen-1"] .zen-bottom-nav__items li').nth(1);
      await selectAt(page, await tab.boundingBox());
      await prototypeTab(page);
      // A new page's tabs are drawn from its Sidebar (Home, Projects, People: component-usage-rules §17).
      await until(async () => (await page.locator(".studio-proto-plus").count()) === 3, { message: "one ⊕ per tab (3)" });
      await drag(page, center(await page.locator('.studio-proto-plus[data-item="projects"]').boundingBox()), await frameCenter(page, "screen:screen-2"));
      await until(async () => /onValueChange=\{proto\.navigate\(\{ projects: "screen-2" \}\)\}/.test(await text(page, id)), { message: "Projects → screen-2" });
      await pickOption(page, "proto:onValueChange:item:people", "Screen 3");
      await until(async () => /proto\.navigate\(\{ projects: "screen-2", people: "screen-3" \}\)/.test(await text(page, id)), { message: "People → screen-3, Projects kept" });
      await until(async () => (await page.locator(".studio-proto-links").getAttribute("data-links").catch(() => null)) === "2", { message: "an arrow from each linked tab" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await playing(page).locator(".zen-bottom-nav__items li").nth(2).locator("button").first().click();
      await until(async () => (await playScreen(page)) === "screen-3", { message: "People → screen-3 in Play" });
      await page.keyboard.press("Escape");
      await until(async () => (await playing(page).count()) === 0, { message: "Esc leaves Play" });
      return "3 tab ⊕ · drag → projects · row → people · 2 arrows · Play follows People";
    },
  },
  {
    id: "PT-03", feature: "Play hotspot hints: a press on nothing clickable outlines what leads somewhere (only the linked tabs of a tab bar), then they fade; the bar names the screen once", wp: "prototype 2026-10-15",
    async run(ctx) {
      const { page, id } = await protoPage(ctx, { screens: 2 });
      // The tab bar's Projects tab leads to Screen 2 (written through the tab's ⊕ path: one per-item action).
      const tab = page.locator('[data-studio-frame="screen:screen-1"] .zen-bottom-nav__items li').nth(1);
      await selectAt(page, await tab.boundingBox());
      await prototypeTab(page);
      await until(async () => (await page.locator(".studio-proto-plus").count()) === 3, { message: "one ⊕ per tab" });
      await drag(page, center(await page.locator('.studio-proto-plus[data-item="projects"]').boundingBox()), await frameCenter(page, "screen:screen-2"));
      await until(async () => /proto\.navigate\(\{ projects: "screen-2" \}\)/.test(await text(page, id)), { message: "Projects → screen-2" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const title = (await playing(page).locator(".studio-present-bar__title").innerText()).trim();
      if (/ · /.test(title)) throw new Error(`the bar repeats the name: "${title}"`);
      const device = await playing(page).locator(".studio-player__device").boundingBox();
      await page.mouse.click(device.x + device.width / 2, device.y + device.height / 2);
      const hints = await until(async () => playing(page).locator(".studio-player__hotspot").count(), { message: "hotspot hints after a press on nothing" });
      if (hints !== 1) throw new Error(`${hints} hints: only the Projects tab leads somewhere`);
      await until(async () => (await playing(page).locator(".studio-player__hotspot").count()) === 0, { timeout: 3000, message: "the hints fade away" });
      await page.keyboard.press("Escape");
      return `1 hint (the linked tab), faded; bar "${title}"`;
    },
  },
  {
    id: "PT-04", feature: "Prototype Flow: a row selects its frame, ▷ plays from that Screen, the first Screen is marked Start, an Overlay is named by its dialog", wp: "prototype 2026-10-15",
    async run(ctx) {
      const { page } = await protoPage(ctx, { screens: 2, overlay: true });
      const rowOf = (frameId) => page.locator(`[data-e2e="prototype-panel"] [data-frame="${frameId}"]`);
      if (!/Start/.test(await rowOf("screen:screen-1").innerText())) throw new Error("the first Screen is not marked Start");
      if (!/Are you sure\?/.test(await rowOf("overlay:overlay-1").innerText())) throw new Error("the Overlay is not named by its dialog");
      await rowOf("screen:screen-2").locator("button.studio-inspector__item").click();
      const selected = await page.evaluate(async () => (await import("/src/platform/studio/store.ts")).studioStore.getState().selection);
      if (selected?.kind !== "frame" || selected.frameId !== "screen:screen-2") throw new Error(`the row selected ${JSON.stringify(selected)}`);
      await rowOf("screen:screen-2").getByRole("button", { name: /^Play from / }).click();
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      if ((await playScreen(page)) !== "screen-2") throw new Error(`Play starts on ${await playScreen(page)}`);
      await page.keyboard.press("Escape");
      await until(async () => (await playing(page).count()) === 0, { message: "Esc leaves Play" });
      return "Start mark · overlay named · row selects screen-2 · ▷ plays from it";
    },
  },
  {
    id: "PT-05", feature: "Prototype by item on a desktop Sidebar: select its People row, drag the row's ⊕ onto Screen 2 → the Sidebar's On item click leads People there (the tab names the row); Play follows it", wp: "prototype 2026-10-15", timeout: 30_000,
    async run(ctx) {
      const { page, id } = await protoPage(ctx, { device: "desktop" });
      const row = page.locator('[data-studio-frame="screen:screen-1"] .zen-sidebar').getByText("People").first();
      await selectAt(page, await row.boundingBox());
      await prototypeTab(page);
      const note = (await page.locator('[data-e2e="prototype-panel"] .studio-inspector__section').nth(1).innerText()).split("\n").map((line) => line.trim());
      if (!note.includes("People · in Sidebar")) throw new Error(`the tab does not name the row: ${JSON.stringify(note.slice(0, 4))}`);
      const plus = page.locator('.studio-proto-plus[data-item="people"]');
      await plus.waitFor({ state: "visible", timeout: 5000 });
      await drag(page, center(await plus.boundingBox()), await frameCenter(page, "screen:screen-2"));
      await until(async () => /onItemClick=\{proto\.navigate\(\{ people: "screen-2" \}\)\}/.test(await text(page, id)), { message: "the Sidebar's people → screen-2" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await playing(page).locator(".zen-sidebar").getByText("People").first().click();
      await until(async () => (await playScreen(page)) === "screen-2", { message: "People → screen-2 in Play" });
      await page.keyboard.press("Escape");
      return "row ⊕ → Sidebar onItemClick { people } · Play follows People";
    },
  },
  {
    id: "PT-06", feature: "Prototype Animation: Navigate to → Push · moves right · Slow writes the options; Play runs the frame going away beside the one coming in, Back runs them backwards", wp: "prototype 2026-10-15 round 2", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await protoPage(ctx, { button: true });
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      await pickOption(page, "proto:onClick", "Navigate to");
      await until(async () => /onClick=\{proto\.navigate\("screen-2"\)\}/.test(await text(page, id)), { message: "navigate" });
      await pickOption(page, "proto:onClick:animation", "Push");
      await until(async () => /animation: "push"/.test(await text(page, id)), { message: "Push written" });
      await page.locator('#studio-right [data-prop="proto:onClick:direction"]').getByRole("button", { name: "Moves right" }).click();
      await pickOption(page, "proto:onClick:duration", "Slow");
      await until(async () => /onClick=\{proto\.navigate\("screen-2", \{ animation: "push", direction: "right", duration: "slow" \}\)\}/.test(await text(page, id)), { message: "Push · right · Slow written" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await playing(page).locator('[data-zen-name="Button"]').first().click();
      const going = playing(page).locator(".studio-player__screen[data-leaving][data-motion]");
      await until(async () => (await going.count()) === 1, { timeout: 2000, message: "the frame going away while Push runs" });
      const vars = await going.getAttribute("style");
      if (!/--studio-play-to-x:\s*100%/.test(vars ?? "")) throw new Error(`the frame going away does not move right: ${vars}`);
      await until(async () => (await playScreen(page)) === "screen-2" && (await going.count()) === 0, { timeout: 3000, message: "screen-2 once Push is over" });
      await playing(page).getByRole("button", { name: "Back" }).click();
      await until(async () => (await going.count()) === 1, { timeout: 2000, message: "Back runs Push backwards" });
      const back = await going.getAttribute("style");
      if (!/--studio-play-to-x:\s*-100%/.test(back ?? "")) throw new Error(`Back does not run backwards: ${back}`);
      await until(async () => (await playScreen(page)) === "screen-1", { message: "screen-1 after Back" });
      await page.keyboard.press("Escape");
      return "options written · Push right going away → +100% · Back → -100%";
    },
  },
  {
    id: "PT-07", feature: "Prototype After delay: a Screen selected from Flow shows After delay; Navigate to with a 300 ms delay; Play moves on by itself", wp: "prototype 2026-10-15 round 2", timeout: 30_000,
    async run(ctx) {
      const { page, id } = await protoPage(ctx);
      await page.locator('[data-e2e="prototype-panel"] [data-frame="screen:screen-1"] button.studio-inspector__item').click();
      await page.locator('#studio-right [data-prop="proto:onDelay"]').waitFor({ state: "visible", timeout: 5000 });
      await pickOption(page, "proto:onDelay", "Navigate to");
      await until(async () => /onDelay=\{proto\.navigate\("screen-2", \{ delay: 800 \}\)\}/.test(await text(page, id)), { message: "After delay 800 written" });
      const delay = page.locator('#studio-right [data-prop="proto:onDelay:delay"] input');
      await delay.fill("300");
      await delay.press("Enter");
      await until(async () => /delay: 300/.test(await text(page, id)), { message: "delay 300" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const t0 = Date.now();
      await until(async () => (await playScreen(page)) === "screen-2", { timeout: 3000, message: "screen-2 after the delay" });
      const waited = Date.now() - t0;
      await page.keyboard.press("Escape");
      return `After delay → screen-2 in ${waited} ms`;
    },
  },
  {
    id: "PT-08", feature: "Prototype While hovering: + adds it to a Button (Open overlay); in Play the Dialog shows while the pointer is on the Button and goes when it leaves", wp: "prototype 2026-10-15 round 2", timeout: 30_000,
    async run(ctx) {
      const { page, id } = await protoPage(ctx, { overlay: true, button: true });
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      await page.locator("#studio-right").getByRole("button", { name: "Add interaction" }).click();
      await page.getByRole("menuitem", { name: "While hovering" }).click();
      await page.getByRole("option", { name: "Open overlay" }).click();
      await until(async () => /whileHovering=\{proto\.open\("overlay-1"\)\}/.test(await text(page, id)), { message: "While hovering → overlay-1" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const box = await playing(page).locator('[data-zen-name="Button"]').first().boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const dialog = playing(page).getByRole("dialog", { name: "Are you sure?" });
      await dialog.waitFor({ state: "visible", timeout: 3000 });
      await page.mouse.move(box.x + box.width / 2, box.y + box.height + 200);
      await until(async () => (await dialog.count()) === 0, { timeout: 3000, message: "the Dialog goes when the pointer leaves" });
      await page.keyboard.press("Escape");
      return "+ While hovering → open · shows on enter · goes on leave";
    },
  },
  {
    id: "PT-09", feature: "Prototype overlay settings: Add overlay › Card, Position Top right and Dim; a Button opens it; Play shows it top right over a dimmed screen, an outside press closes it", wp: "prototype 2026-10-15 round 2", timeout: 40_000,
    async run(ctx) {
      const { page, id } = await protoPage(ctx, { overlay: "card", button: true });
      if (!/<Overlay id="overlay-1">\n\s*<Card>/.test(await text(page, id))) throw new Error("Add overlay › Card did not write a Card overlay");
      await page.locator('[data-e2e="prototype-panel"] [data-frame="overlay:overlay-1"] button.studio-inspector__item').click();
      await pickOption(page, "overlay:position", "Top right");
      await until(async () => /<Overlay id="overlay-1" position="top-right">/.test(await text(page, id)), { message: "Top right" });
      await page.locator('#studio-right [data-prop="overlay:background"]').getByRole("switch").click();
      await until(async () => /<Overlay id="overlay-1" position="top-right" background>/.test(await text(page, id)), { message: "Dim" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Shift+Digit1");
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      await pickOption(page, "proto:onClick", "Open overlay");
      await until(async () => /onClick=\{proto\.open\("overlay-1"\)\}/.test(await text(page, id)), { message: "Open overlay" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await playing(page).locator('[data-zen-name="Button"]').first().click();
      const shown = playing(page).locator('.studio-player__overlay[data-position="top-right"][data-background="true"]');
      await shown.waitFor({ state: "visible", timeout: 3000 });
      const device = await playing(page).locator(".studio-player__device").boundingBox();
      const card = await playing(page).locator(".studio-player__overlay-content").boundingBox();
      const right = device.x + device.width - card.x - card.width;
      if (right > 24 || card.y - device.y > device.height / 3) throw new Error(`the Card is not top right (right gap ${right}, top ${card.y - device.y})`);
      await page.mouse.click(device.x + 30, device.y + device.height - 120);
      await until(async () => (await shown.count()) === 0, { message: "an outside press closes it" });
      await page.keyboard.press("Escape");
      return `Card top right (gap ${Math.round(right)}), dimmed, closed by an outside press`;
    },
  },
  {
    id: "PT-10", feature: "An Overlay emptied of its Dialog takes the next layer from Assets (a Card): the Overlay shows what you put in it", wp: "prototype 2026-10-15 round 2", timeout: 30_000,
    async run(ctx) {
      const { page, id } = await protoPage(ctx, { overlay: true });
      const dialog = page.locator('[data-studio-frame="overlay:overlay-1"] .zen-dialog').first();
      await selectAt(page, await dialog.boundingBox());
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Backspace");
      await until(async () => /<Overlay id="overlay-1">\n\s*<\/Overlay>/.test(await text(page, id)), { message: "the Overlay empty" });
      await page.locator('[data-e2e="prototype-panel"] [data-frame="overlay:overlay-1"] button.studio-inspector__item').click();
      await openAssetLibrary(page, "Components");
      await page.locator("#studio-left-panel-assets").getByLabel("Search components").fill("Card");
      await page.locator("#studio-left-panel-assets [data-asset]", { hasText: /^Card/ }).first().click();
      await until(async () => /<Overlay id="overlay-1">\n\s*<Card\b/.test(await text(page, id)), { message: "the Card inside the Overlay" });
      return "Dialog removed · Card from Assets lands in the Overlay";
    },
  },
  {
    id: "PT-11", feature: "Play runs an AppShell page as an app: scrolling the page leaves the Sidebar at the top of the scroll box, at its height, its items scrolling inside (the user 2026-10-16: it scrolled away with the page)", wp: "play sidebar 2026-10-16", timeout: 30_000,
    async run(ctx) {
      const { page } = await newPage(ctx, { device: "desktop" });
      const size = page.viewportSize();
      // A short window: the page (a 900px Screen) scrolls and the Sidebar's rows outgrow their box.
      await page.setViewportSize({ width: size.width, height: 260 });
      try {
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Escape");
        await page.keyboard.press("ControlOrMeta+Alt+Enter");
        await playing(page).waitFor({ state: "visible", timeout: 5000 });
        await playing(page).locator(".zen-app-shell__sidebar").waitFor({ state: "visible", timeout: 5000 });
        const result = await checkSidebarSticks(playing(page));
        await page.keyboard.press("Escape");
        return result;
      } finally {
        await page.setViewportSize(size);
      }
    },
  },
  {
    id: "PT-12", feature: "Play scrolls a phone Screen as a phone: its large title folds under the bar (TopNavigation scrollRef, iOS) and the status bar and home indicator stay at the window's edges (the user 2026-10-16: the large title stayed open over a white band)", wp: "play large title 2026-10-16", timeout: 40_000,
    async run(ctx) {
      const { page } = await seededPage(ctx, largeTitlePage, /largeTitle="Expenses"/);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const result = await checkFold(playing(page));
      await page.keyboard.press("Escape");
      return result;
    },
  },
  {
    id: "PT-13", feature: "Present shows a phone Screen the same way: scrolling folds the large title under the bar and keeps the status bar and home indicator at the edges of what scrolls (the user 2026-10-16, the Expenses phone screen in Present)", wp: "play large title 2026-10-16", timeout: 40_000,
    async run(ctx) {
      const { page } = await seededPage(ctx, largeTitlePage, /largeTitle="Expenses"/);
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id="frame:screen:screen-1"]').click();
      // The selected Screen's Present button (Inspector › Frame), as a person starts it.
      await page.locator("#studio-right").getByRole("button", { name: "Present", exact: true }).click();
      const present = page.locator(".studio-present");
      await present.waitFor({ state: "visible", timeout: 5000 });
      const result = await checkFold(present);
      await page.keyboard.press("Escape");
      return result;
    },
  },
  {
    id: "PT-14", feature: "Present runs an AppShell page as Play does: scrolling the page leaves the Sidebar at the top of the scroll box, at its height, its items scrolling inside (the user 2026-10-17: the Sidebar still scrolled in Present)", wp: "present sidebar 2026-10-17", timeout: 30_000,
    async run(ctx) {
      const { page } = await newPage(ctx, { device: "desktop" });
      const size = page.viewportSize();
      // A short window, as PT-11: the page (a 900px Screen) scrolls and the Sidebar's rows outgrow their box.
      await page.setViewportSize({ width: size.width, height: 260 });
      try {
        await showLeftTab(page, "layers");
        await page.locator('[data-layer-id^="frame:screen:"]').first().click();
        await page.locator("#studio-right").getByRole("button", { name: "Present", exact: true }).click();
        const present = page.locator(".studio-present");
        await present.waitFor({ state: "visible", timeout: 5000 });
        const auto = await checkSidebarSticks(present);
        // A fixed W × H viewport (the bar's Viewport › H) is the scroll box: the Sidebar takes its height, not the window's.
        await present.getByRole("button", { name: /^Viewport:/ }).click();
        const height = present.getByLabel("Viewport height");
        await height.fill("400");
        await height.press("Enter");
        await present.locator('.studio-present__fit[data-viewport="fixed"]').waitFor({ state: "visible", timeout: 5000 });
        await page.keyboard.press("Escape");
        const fixed = await checkSidebarSticks(present, { rows: false });
        await page.keyboard.press("Escape");
        return `Auto: ${auto} · 400px viewport: ${fixed}`;
      } finally {
        await page.setViewportSize(size);
      }
    },
  },
  {
    id: "PT-15", feature: "Device simulator (user 2026-10-18: \"làm simulator cho thiết bị khi preview trong Studio\"): Present on an iPhone Screen shows it on the iPhone in its device frame; Viewport › Device › iPad, portrait lays the same Screen out as a tablet with the iPad bars; Device frame off drops the hardware; iPhone Duo, open shows the Duo's side status and the fold", wp: "simulator 2026-10-18",
    async run(ctx) {
      const { page } = await newPage(ctx);
      await page.locator(".studio-canvas-tools").getByRole("button", { name: "Frame", exact: true }).click();
      // Figma's frame presets (F4): the right panel while the Frame tool is on.
      await page.locator("#studio-right").getByRole("list", { name: "Phone" }).getByRole("button", { name: /^iPhone\s*390 × 844$/ }).click();
      await page.locator('[data-studio-frame="screen:screen-2"]').waitFor({ state: "visible", timeout: 5000 });
      // The new Screen is selected: its Present button (Inspector › Frame).
      await page.locator("#studio-right").getByRole("button", { name: "Present", exact: true }).click();
      const present = page.locator(".studio-present");
      await present.waitFor({ state: "visible", timeout: 5000 });
      const screen = present.locator(".studio-builder-screen").first();
      await until(async () => (await screen.getAttribute("data-device")) === "phone" && (await screen.getAttribute("data-hardware")) === "iphone", { message: "Present shows the iPhone Screen as a phone" });
      await present.locator(".studio-device-frame").waitFor({ state: "visible", timeout: 5000 });
      await present.locator('.studio-device-status[data-device="phone"]').waitFor({ state: "attached", timeout: 5000 });
      const pick = async (label) => {
        const trigger = present.locator('[id$="-viewport-device-trigger"]');
        await trigger.waitFor({ state: "visible", timeout: 5000 });
        await trigger.click();
        await page.getByRole("option", { name: new RegExp(`^${label}`) }).first().click();
      };
      await present.getByRole("button", { name: /^Viewport:/ }).click();
      await pick("iPad, portrait");
      await until(async () => (await screen.getAttribute("data-device")) === "tablet" && (await screen.getAttribute("data-layout")) === "mobile", { message: "iPad, portrait lays the Screen out as a portrait tablet" });
      await present.locator('.studio-device-status[data-device="tablet"]').waitFor({ state: "attached", timeout: 5000 });
      const fit = await present.locator(".studio-present__viewport").boundingBox();
      if (!fit || Math.abs(fit.width / fit.height - 744 / 1133) > 0.01) throw new Error(`the iPad viewport is not 744 × 1133 (${fit ? `${Math.round(fit.width)} × ${Math.round(fit.height)}` : "none"})`);
      await present.getByRole("switch", { name: "Device frame" }).click();
      await until(async () => (await present.locator(".studio-device-frame").count()) === 0, { message: "Device frame off drops the hardware" });
      await present.getByRole("switch", { name: "Device frame" }).click();
      await pick("iPhone Duo, open");
      await present.locator('.studio-device-duo[data-status="side"]').waitFor({ state: "attached", timeout: 5000 });
      await present.locator(".studio-device-fold").waitFor({ state: "attached", timeout: 5000 });
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await present.waitFor({ state: "detached", timeout: 5000 });
      return "Present: iPhone in its frame → iPad, portrait (tablet, mobile layout, 744 × 1133) → frame off/on → Duo open (side status, fold)";
    },
  },
  {
    id: "PT-16", feature: "Android in the simulator (user 2026-10-21: \"thêm máy Android vào simulator\"): Present on an Android page's 390 × 844 phone Screen plays it on the Android phone (412 × 917, Android's bars and safe areas, its device frame); Viewport › Device › Android tablet, landscape lays it out as a desktop tablet with Android's bars and Rotate turns it to portrait; Device › iPhone draws iOS bars whatever the page's OS", wp: "simulator android 2026-10-21", timeout: 40_000,
    async run(ctx) {
      const { page } = await seededPage(ctx, androidPage, /"os":"android"/);
      await showLeftTab(page, "layers");
      await page.locator('[data-layer-id="frame:screen:screen-1"]').click();
      await page.locator("#studio-right").getByRole("button", { name: "Present", exact: true }).click();
      const present = page.locator(".studio-present");
      await present.waitFor({ state: "visible", timeout: 5000 });
      const screen = present.locator(".studio-builder-screen").first();
      const read = () => screen.evaluate((node) => {
        const style = getComputedStyle(node);
        const status = node.querySelector(".studio-device-status");
        return { device: node.getAttribute("data-device"), layout: node.getAttribute("data-layout"), os: node.getAttribute("data-os"), status: status ? `${status.getAttribute("data-os")}/${status.getAttribute("data-device")}` : null, safe: `${style.getPropertyValue("--zen-safe-area-top").trim()}/${style.getPropertyValue("--zen-safe-area-bottom").trim()}` };
      });
      const expect = async (want, message) => {
        const got = await until(async () => { const value = await read(); return Object.entries(want).every(([key, wanted]) => value[key] === wanted) ? value : null; }, { message }).catch(async () => { throw new Error(`${message}: ${JSON.stringify(await read())}`); });
        return got;
      };
      const ratio = async (width, height, what) => {
        const box = await present.locator(".studio-present__viewport").boundingBox();
        if (!box || Math.abs(box.width / box.height - width / height) > 0.01) throw new Error(`the ${what} viewport is not ${width} × ${height} (${box ? `${Math.round(box.width)} × ${Math.round(box.height)}` : "none"})`);
      };
      // Auto: the Android page's Screen plays on the Android phone, not the iPhone of its size.
      await until(async () => (await screen.getAttribute("data-hardware")) === "android-phone", { message: "Auto takes the Android phone for the Android page's Screen" });
      await expect({ device: "phone", os: "android", status: "android/phone", safe: "24px/24px" }, "the Android phone's bars");
      await present.locator(".studio-device-status__camera").waitFor({ state: "attached", timeout: 5000 });
      await present.locator(".studio-device-frame").waitFor({ state: "visible", timeout: 5000 });
      await ratio(412, 917, "Android phone");
      const pick = async (label) => {
        const trigger = present.locator('[id$="-viewport-device-trigger"]');
        await trigger.waitFor({ state: "visible", timeout: 5000 });
        await trigger.click();
        await page.getByRole("option", { name: new RegExp(`^${label}`) }).first().click();
      };
      await present.getByRole("button", { name: /^Viewport:/ }).click();
      await pick("Android tablet, landscape");
      await expect({ device: "tablet", layout: "desktop", os: "android", status: "android/tablet" }, "Android tablet, landscape");
      await ratio(1280, 800, "Android tablet");
      await present.getByRole("button", { name: "Rotate", exact: true }).click();
      await expect({ device: "tablet", layout: "mobile", os: "android" }, "Rotate turns the Android tablet to portrait");
      await ratio(800, 1280, "Android tablet, portrait");
      await pick("iPhone");
      await expect({ device: "phone", os: "ios", status: "ios/phone", safe: "50px/28px" }, "the iPhone draws iOS bars on the Android page");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await present.waitFor({ state: "detached", timeout: 5000 });
      return "Android page: Auto on the Android phone (412 × 917, bars 24/24, camera, frame) → Android tablet, landscape (desktop layout) → Rotate (portrait) → iPhone (iOS bars 50/28)";
    },
  },
  {
    id: "PT-17", feature: "Open on phone (user 2026-10-21: Play on a real phone, \"Tương tác (Play)\"): Play's bar shares the page and shows a QR code of a network link; Escape closes that dialog and keeps Play; the link opened in a phone-sized browser plays the page from the Screen Play is on, with no simulated bars, and its proto actions run (Next → screen-2)", wp: "open on phone 2026-10-21", timeout: 90_000,
    async run(ctx) {
      const { page } = await seededPage(ctx, phonePage, /proto\.navigate\("screen-2"\)/);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await playing(page).getByRole("button", { name: "Open on phone" }).click();
      const dialog = page.locator(".studio-open-phone");
      await dialog.locator("svg.studio-open-phone__qr").waitFor({ state: "visible", timeout: 15_000 });
      const link = (await dialog.locator(".studio-open-phone__url").innerText()).trim();
      if (!/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+\/d\/[\w-]+$/.test(link)) throw new Error(`not a network link: ${link}`);
      await page.keyboard.press("Escape");
      await dialog.waitFor({ state: "detached", timeout: 5000 });
      if (!(await playing(page).isVisible())) throw new Error("Escape left Play instead of closing the dialog");
      const phone = await ctx.browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
      try {
        const tab = await phone.newPage();
        await tab.goto(link, { waitUntil: "domcontentloaded", timeout: 60_000 });
        await tab.waitForSelector(".studio-builder-screen", { timeout: 60_000 });
        const first = await tab.evaluate(() => ({ screen: document.querySelector("[data-screen-id]")?.getAttribute("data-screen-id"), bars: document.querySelectorAll(".studio-device-status, .studio-device-home").length }));
        if (first.screen !== "screen-1" || first.bars) throw new Error(`the phone: ${JSON.stringify(first)}`);
        await tab.getByRole("button", { name: "Next" }).tap();
        await until(async () => (await tab.locator("[data-screen-id]").getAttribute("data-screen-id")) === "screen-2", { message: "Next → screen-2 on the phone" });
      } finally {
        await phone.close();
      }
      await page.keyboard.press("Escape");
      return "Play › Open on phone: QR + network link → Esc keeps Play → a 390 × 844 phone plays screen-1 (no simulated bars) → Next → screen-2";
    },
  },
  {
    id: "PT-18", feature: "Option C (user 2026-10-23: \"open this popover, anchored to this element\"): in Play a Chip opens its DatePicker overlay right below it (Figma's Manual, by the trigger) and a picked day closes it; an Overlay set to Position Manual in the Prototype tab opens its Card below the Button that opens it, and the Button pressed again closes it", wp: "option C 2026-10-23", timeout: 40_000,
    async run(ctx) {
      const { page, id, text: source } = await seededPage(ctx, anchoredPage, /proto\.open\("pick-date"\)/);
      await prototypeTab(page);
      await page.locator('[data-e2e="prototype-panel"] [data-frame="overlay:tip"] button.studio-inspector__item').click();
      await pickOption(page, "overlay:position", "Manual");
      await until(async () => /<Overlay id="tip" position="manual">/.test(await source()), { message: 'position="manual" on the tip Overlay' });
      await page.locator('[data-e2e="prototype-panel"] [data-frame="overlay:pick-date"] button.studio-inspector__item').click();
      await until(async () => (await page.locator('[data-e2e="prototype-panel"] .studio-inspector__note').allInnerTexts()).some((note) => note.includes("DatePicker opens by its trigger")), { message: "the pick-date Overlay says its DatePicker opens by its trigger" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      // Below the trigger, at its start edge, a 4px gap (Popover's) in the device's scale; or above it with no room below.
      const by = async (trigger, surface) => {
        const device = playing(page).locator(".studio-player__device");
        const scale = await device.evaluate((el) => el.getBoundingClientRect().width / el.offsetWidth);
        const t = await trigger.boundingBox();
        const s = await surface.boundingBox();
        const below = Math.abs(s.y - (t.y + t.height + 4 * scale));
        const above = Math.abs(t.y - (s.y + s.height + 4 * scale));
        const start = Math.abs(s.x - t.x);
        if (Math.min(below, above) > 3 || start > 3) throw new Error(`not by its trigger: trigger ${JSON.stringify(t)}, surface ${JSON.stringify(s)}`);
        return below <= 3 ? "below" : "above";
      };
      const chip = playing(page).getByRole("button", { name: "Date" });
      await chip.click();
      const picker = playing(page).locator(".zen-date-picker");
      await picker.waitFor({ state: "visible", timeout: 3000 });
      await sleep(300);
      const pickerSide = await by(chip, picker);
      await picker.locator(".zen-date-picker__day:not(:disabled)").nth(10).click();
      await until(async () => (await picker.count()) === 0, { message: "a picked day closes the DatePicker" });
      // The Chip opens it again, and pressed once more closes it (its trigger is not outside it).
      await chip.click();
      await picker.waitFor({ state: "visible", timeout: 3000 });
      await chip.click();
      await until(async () => (await picker.count()) === 0, { message: "the Chip pressed again closes the DatePicker" });
      // Escape closes it and stays in Play.
      await chip.click();
      await picker.waitFor({ state: "visible", timeout: 3000 });
      await page.keyboard.press("Escape");
      await until(async () => (await picker.count()) === 0, { message: "Escape closes the DatePicker" });
      if (!(await playing(page).isVisible())) throw new Error("Escape left Play instead of closing the DatePicker");
      const tipButton = playing(page).getByRole("button", { name: "Tip" });
      await tipButton.click();
      const card = playing(page).locator('.studio-player__overlay[data-position="manual"] .studio-player__overlay-content');
      await card.waitFor({ state: "visible", timeout: 3000 });
      await sleep(400);
      const cardSide = await by(tipButton, card);
      await tipButton.click({ force: true });
      await until(async () => (await card.count()) === 0, { message: "the Button pressed again closes its overlay" });
      await page.keyboard.press("Escape");
      return `DatePicker ${pickerSide} its Chip, closed by a picked day, the Chip again and Escape · Manual Card ${cardSide} its Button, closed by it`;
    },
  },
  {
    id: "PT-19", feature: "Option C: on a phone Screen a Chip opens a Bottom Sheet overlay; the sheet places itself at the bottom of the device (Figma's Bottom center) and its Done (Close overlay) closes it", wp: "option C 2026-10-23", timeout: 40_000,
    async run(ctx) {
      const { page } = await seededPage(ctx, sheetPage, /proto\.open\("sort"\)/);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await step("tap the Sort chip", () => playing(page).getByRole("button", { name: "Sort" }).click());
      const sheet = playing(page).getByRole("dialog", { name: "Sort by" });
      await sheet.waitFor({ state: "visible", timeout: 3000 });
      await sleep(500);
      const device = await playing(page).locator(".studio-player__device").boundingBox();
      const box = await sheet.boundingBox();
      const gap = device.y + device.height - (box.y + box.height);
      if (gap > 40 || box.y < device.y + device.height / 3) throw new Error(`the sheet is not at the bottom (gap ${Math.round(gap)}, top ${Math.round(box.y - device.y)})`);
      await step("press the sheet's Done", () => sheet.getByRole("button", { name: "Done" }).click());
      await until(async () => (await sheet.count()) === 0, { message: "Done closes the sheet" });
      await page.keyboard.press("Escape");
      return `Chip → Bottom Sheet at the device's bottom (gap ${Math.round(gap)}) → Done closes it`;
    },
  },
  {
    id: "PT-20", feature: "Option C Filter table: the Prototype tab sets a Chip's On click to Filter table, column Status, value Paid (proto.filter); in Play the Chip filters the Screen's Table and pressed again shows every row; a Search filters it by what is typed (contains)", wp: "option C 2026-10-23", timeout: 40_000,
    async run(ctx) {
      const { page, id, text: source } = await seededPage(ctx, filterPage, /proto\.filter\(/);
      await clickNamed(page, id, "Chip");
      await prototypeTab(page);
      await pickOption(page, "proto:onClick", "Filter table");
      await until(async () => /<Chip onClick=\{proto\.filter\(\{\}\)\}>/.test(await source()), { message: "proto.filter({}) on the Chip" });
      await pickOption(page, "proto:onClick:column", "Status");
      await until(async () => /proto\.filter\(\{ column: "status" \}\)/.test(await source()), { message: "column status" });
      const value = page.locator('#studio-right [data-prop="proto:onClick:value"] input');
      await value.fill("Paid");
      await value.press("Enter");
      await until(async () => /<Chip onClick=\{proto\.filter\(\{ column: "status", value: "Paid" \}\)\}>/.test(await source()), { message: 'proto.filter({ column: "status", value: "Paid" })' });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const rows = playing(page).locator(".zen-table tbody tr.zen-table__row");
      const clients = async () => (await rows.allInnerTexts()).map((row) => row.split(/\s+/)[0]);
      await until(async () => (await rows.count()) === 3, { message: "three rows at first" });
      await playing(page).getByRole("button", { name: "Paid" }).click();
      await until(async () => (await clients()).join() === "Acme,Initech", { message: "the Paid chip keeps Acme and Initech" });
      await playing(page).getByRole("button", { name: "Paid" }).click();
      await until(async () => (await rows.count()) === 3, { message: "pressed again: every row" });
      const search = playing(page).getByLabel("Search orders");
      await search.fill("glo");
      await until(async () => (await clients()).join() === "Globex", { message: "“glo” keeps Globex" });
      await search.fill("");
      await until(async () => (await rows.count()) === 3, { message: "cleared: every row" });
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      return "Chip → Filter table · Status · Paid written · Play: 3 → 2 rows → 3 again · Search “glo” → Globex → cleared";
    },
  },
  {
    id: "PT-21", feature: "Option C Change step and a Screen state as a target: the Prototype tab sets Next to Change step (Next/Previous segmented); the Finish Button's ⊕ dropped on the Screen's \"done\" state frame navigates to that state (Figma: every frame is a target); in Play Next and Previous move the Stepper, a passed step goes back, Finish shows the done state and Back returns to the first step", wp: "option C 2026-10-23", timeout: 50_000,
    async run(ctx) {
      const { page, id, text: source } = await seededPage(ctx, stepPage, /state="done"/);
      // Both frames in view (the seeded page opens wherever the board starts).
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+Digit1");
      await sleep(400);
      await clickNamed(page, id, "Button", 0);
      await prototypeTab(page);
      await step("pick Change step", () => pickOption(page, "proto:onClick", "Change step"));
      await until(async () => /<Button onClick=\{proto\.step\("next"\)\}>Next/.test(await source()), { message: 'proto.step("next") on Next' });
      await step("pick Previous", () => pickOption(page, "proto:onClick:step", "Previous"));
      await until(async () => /<Button onClick=\{proto\.step\("previous"\)\}>Next/.test(await source()), { message: "Previous" });
      await step("pick Next", () => pickOption(page, "proto:onClick:step", "Next"));
      await until(async () => /<Button onClick=\{proto\.step\("next"\)\}>Next/.test(await source()), { message: "Next again" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+Digit1");
      await sleep(400);
      await clickNamed(page, id, "Button", 2);
      const plus = page.locator(".studio-proto-plus");
      await plus.waitFor({ state: "visible", timeout: 5000 });
      await drag(page, center(await plus.boundingBox()), await frameCenter(page, "screen:checkout:done"));
      await until(async () => /<Button onClick=\{proto\.navigate\("checkout:done"\)\}>Finish/.test(await source()), { message: 'Finish → proto.navigate("checkout:done")' });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const currentStep = async () => (await playing(page).locator('.zen-stepper__step[aria-current="step"]').innerText().catch(() => "")).trim();
      const press = (name) => step(`press ${name} in Play`, () => playing(page).getByRole("button", { name, exact: true }).click());
      await until(async () => /Cart/.test(await currentStep()), { message: "Cart first" });
      await press("Next");
      await until(async () => /Pay/.test(await currentStep()), { message: "Next → Pay" });
      await press("Next");
      await press("Next");
      await until(async () => /Ship/.test(await currentStep()), { message: "Next twice more → Ship (the last stays)" });
      await press("Previous");
      await until(async () => /Pay/.test(await currentStep()), { message: "Previous → Pay" });
      await step("press the passed Cart step", () => playing(page).locator(".zen-stepper__step").first().locator("button").click());
      await until(async () => /Cart/.test(await currentStep()), { message: "the passed Cart step goes back" });
      await press("Finish");
      await until(async () => (await playScreen(page)) === "checkout:done", { message: "Finish → the done state" });
      await playing(page).getByText("All done").waitFor({ state: "visible", timeout: 3000 });
      await step("press Play's Back", () => playing(page).getByRole("button", { name: "Back", exact: true }).click());
      await until(async () => (await playScreen(page)) === "checkout", { message: "Play's Back → checkout" });
      await until(async () => /Cart/.test(await currentStep()), { message: "a new visit starts on Cart" });
      await page.keyboard.press("Escape");
      return "Next → Change step (Previous/Next) · Finish ⊕ → checkout:done · Play: Cart → Pay → Ship (stays) → Previous → Pay → Cart (passed step) → done state → Back → Cart";
    },
  },
  {
    id: "PT-22", feature: "Play's hotspot hints stay back on a press that does something (the user 2026-10-24: they showed on every element that already had an interaction): a Box with proto.navigate goes to its Screen with no hints and is itself the hotspot; a press on a field's padding focuses the field with no hints; a press on plain text still outlines the Box", wp: "prototype 2026-10-24", timeout: 40_000,
    async run(ctx) {
      const { page } = await seededPage(ctx, pressedPage, /proto\.navigate\("screen-2"\)/);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const hints = () => playing(page).locator(".studio-player__hotspot").count();
      // Hints show within two frames of the click and stay ~0.9 s: none over 600 ms means none.
      const noHints = async (what) => { for (let n = 0; n < 6; n += 1) { if (await hints()) throw new Error(`hotspot hints after ${what}`); await sleep(100); } };
      const pressAt = async (locator, dx = 0.5) => { const b = await locator.boundingBox(); await page.mouse.click(b.x + b.width * dx, b.y + b.height / 2); };
      await pressAt(playing(page).getByText("Nothing happens here"));
      const shown = await until(async () => hints(), { message: "hints after a press on plain text" });
      const hint = await playing(page).locator(".studio-player__hotspot").first().boundingBox();
      const card = await playing(page).getByText("Open the details").locator("xpath=..").boundingBox();
      if (shown !== 1 || Math.abs(hint.width - card.width) > 2 || Math.abs(hint.height - card.height) > 2) throw new Error(`${shown} hints, the first ${Math.round(hint.width)}×${Math.round(hint.height)}: the Box (${Math.round(card.width)}×${Math.round(card.height)}) is the hotspot`);
      await until(async () => (await hints()) === 0, { timeout: 3000, message: "the hints fade" });
      // The field's control, at its left padding (not the input): the field focuses itself.
      await pressAt(playing(page).locator(".zen-input__control").first(), 0.02);
      await noHints("a press on the field's padding");
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (focused !== "INPUT") throw new Error(`the field's padding focused ${focused}`);
      await pressAt(playing(page).getByText("Open the details"));
      await until(async () => (await playScreen(page)) === "screen-2", { message: "the Box → Screen 2" });
      await noHints("a press on the Box that navigates");
      await page.keyboard.press("Escape");
      return "plain text → 1 hint (the Box) · field padding → focus, no hints · Box → screen-2, no hints";
    },
  },
];

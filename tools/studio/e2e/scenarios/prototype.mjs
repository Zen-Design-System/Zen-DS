// Prototype rows (Figma's prototype mode on pages made in the Studio, 2026-10-15): connect by dragging a layer's ⊕ onto a
// frame, click an arrow to select its layer, drag an arrow's end to another frame or off to remove it, one target per
// tab of a tab bar, the Flow list, and Play's hotspot hints. Each row makes its own page (builder.mjs newPage).
import { inspectorRow, openAssetLibrary, selectAt, showLeftTab, sleep, until } from "../lib/studio.mjs";
import { pickOption } from "./inspector.mjs";
import { clickNamed, newPage, pageText, seededPage, selectStack } from "./builder.mjs";
import { pageFromTemplate } from "./starters.mjs";

/** The presented device's viewport: Present's still frame, or Play's device (a Screen presented from its frame plays
 *  since #288, Figma's Present). */
const PRESENT_VIEWPORT = ".studio-present__fit > :is(.studio-present__viewport, .studio-player__device)";
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
    await page.getByRole("button", { name: "Add Screen" }).click();
    await page.getByRole("menuitem", { name: "Empty Screen" }).click(); // Add Screen asks: empty or a template (W-49)
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

/** Login and Splash at their places, Home still in the row of unplaced frames (PT-33, PT-34, walk 2026-10-29). */
const orderPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen } from "@zen-ds/react/builder";
import { Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="login" title="Login" device="phone" x={0} y={0}>
        <Text>Login</Text>
      </Screen>
      <Screen id="splash" title="Splash" device="phone" x={486} y={0}>
        <Text>Splash</Text>
      </Screen>
      <Screen id="home" title="Home" device="phone">
        <Text>Home</Text>
      </Screen>
    </Board>
  );
}
`;
/** A Change role button and two overlays, Filter first (PT-37, walk 2026-10-29 W-57). */
const namedOverlaysPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { Button, Dialog, Stack } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Team" device="desktop">
        <Stack gap="md" padding="lg">
          <Button>Change role</Button>
        </Stack>
      </Screen>
      <Overlay id="filter">
        <Dialog title="Filter" primaryAction={{ label: "Apply", onClick: proto.close() }} />
      </Overlay>
      <Overlay id="change-role">
        <Dialog title="Change role" primaryAction={{ label: "Save", onClick: proto.close() }} />
      </Overlay>
    </Board>
  );
}
`;

/** The page's Screens in the Board's order. */
const screenOrder = (code) => [...code.matchAll(/<Screen id="([a-z0-9-]+)"/g)].map((match) => match[1]).join(",");
/** Each frame's place on the canvas (world px), to check a reorder moves none. */
const frameBoxes = (page) => page.evaluate(() => {
  const board = document.querySelector(".studio-builder-board__frames")?.getBoundingClientRect();
  return Object.fromEntries([...document.querySelectorAll('[data-studio-frame^="screen:"]')].map((frame) => {
    const box = frame.getBoundingClientRect();
    return [frame.getAttribute("data-studio-frame"), `${Math.round(box.x - (board?.x ?? 0))},${Math.round(box.y - (board?.y ?? 0))}`];
  }));
});

/** Home → Detail (a Top Navigation without its Back yet, Book opens a Dialog) → Done (PT-32, walk 2026-10-29). */
const actionsPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { Button, Dialog, Stack, Text, TopNavigation } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="home" title="Home" device="phone">
        <Stack gap="md" padding="lg">
          <Button onClick={proto.navigate("detail")}>Open detail</Button>
        </Stack>
      </Screen>
      <Screen id="detail" title="Detail" device="phone" topNavigation={<TopNavigation type="compact" title="Detail" />}>
        <Stack gap="md" padding="lg">
          <Button onClick={proto.open("confirm")}>Book</Button>
        </Stack>
      </Screen>
      <Screen id="done" title="Done" device="phone">
        <Stack gap="md" padding="lg">
          <Text>Booked</Text>
        </Stack>
      </Screen>
      <Overlay id="confirm">
        <Dialog title="Book?" description="One visit." primaryAction={{ label: "Confirm", onClick: proto.close() }} secondaryAction={{ label: "Cancel", onClick: proto.close() }} />
      </Overlay>
    </Board>
  );
}
`;

/** A desktop Screen taller than Play's window, with a Button below a few rows that opens a modal Side Panel (PT-24). */
const longScreenPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { Button, SidePanel, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Tasks" device="desktop" height={2400}>
        <Stack gap="md" padding="lg">
          ${Array.from({ length: 8 }, (_, index) => `<Text>Task ${index + 1}</Text>`).join("\n          ")}
          <Button onClick={proto.open("details")}>Details</Button>
        </Stack>
      </Screen>
      <Overlay id="details">
        <SidePanel type="modal" title="Task details" onOpenChange={proto.close()}>
          <Text>Due Friday</Text>
        </SidePanel>
      </Overlay>
    </Board>
  );
}
`;

/** A phone Screen as the user drew it (2026-10-28): a long List in an absolute Box that runs past the Screen's foot,
 *  under a Liquid Glass Top Navigation and above a Floating Glass Bottom Navigation (PT-30). */
const absoluteListPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen } from "@zen-ds/react/builder";
import { BottomNavigation, Box, DockIcon, List, ListItem, TopNavigation } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Projects" device="phone" width={390} height={844} topNavigation={<TopNavigation type="liquid-glass" title="Projects" largeTitle="Projects" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} />} bottomNavigation={<BottomNavigation value="item-1" showLabels type="floating-glass" items={[{ id: "item-1", label: "Item 1", icon: "icon-circle-line" }, { id: "item-2", label: "Item 2", icon: "icon-circle-line" }, { id: "item-3", label: "Item 3", icon: "icon-circle-line" }]} />}>
        <Box position="absolute" insetLeft={0} insetTop={178} width="fill" height={683} paddingX="margin-comfortable">
          <List>
            ${Array.from({ length: 16 }, (_, index) => `<ListItem title="Project ${index + 1}" caption="Phin & Co · Due Oct 14" leading={<DockIcon icon="icon-mobile-line" theme="orange" background="subtle" />} />`).join("\n            ")}
          </List>
        </Box>
      </Screen>
    </Board>
  );
}
`;

/** A phone Screen with one navigation only (PT-31): a Bottom Navigation (the status bar's edge keeps the safe area), or
 *  a Top Navigation over a long List (the home indicator's edge keeps it). */
const oneBarPage = (bar) => (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen } from "@zen-ds/react/builder";
import { BottomNavigation, List, ListItem, Stack, Text, TopNavigation } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
${bar === "bottom" ? `      <Screen id="screen-1" title="Home" device="phone" width={390} height={844} bottomNavigation={<BottomNavigation value="item-1" showLabels items={[{ id: "item-1", label: "Home", icon: "icon-circle-line" }, { id: "item-2", label: "Visits", icon: "icon-circle-line" }]} />}>
        <Stack gap="md"><Text>Hello An Tam</Text></Stack>
      </Screen>` : `      <Screen id="screen-1" title="Orders" device="phone" width={390} height={844} topNavigation={<TopNavigation title="Orders" leading={{ icon: "icon-chevron-left-line-medium", label: "Back" }} />}>
        <List>
          ${Array.from({ length: 16 }, (_, index) => `<ListItem title="Order ${index + 1}" caption="Phin & Co" />`).join("\n          ")}
        </List>
      </Screen>`}
    </Board>
  );
}
`;

/** Two Screens and an Overlay named as a designer names them, long (PT-29). */
const longNamesPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { SidePanel, Stack, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Quản lý task · Danh sách công việc của nhóm sản phẩm" device="desktop">
        <Stack gap="md" padding="lg"><Text>Danh sách</Text></Stack>
      </Screen>
      <Screen id="screen-2" title="Gửi biên bản họp Sprint Review cho khách hàng Aurora" device="desktop">
        <Stack gap="md" padding="lg"><Text>Biên bản</Text></Stack>
      </Screen>
      <Overlay id="overlay-1">
        <SidePanel type="modal" title="Chốt agenda họp Sprint Review với khách hàng Aurora" onOpenChange={proto.close()}>
          <Text>Agenda</Text>
        </SidePanel>
      </Overlay>
    </Board>
  );
}
`;

/** Text nodes of the Flow list whose visible box (their span's own ellipsis clip applied) runs past the Inspector's box,
 *  the names the ellipsis shortened, and the Inspector's width (PT-29). */
const flowOverflow = (page) => page.evaluate(() => {
  const panel = document.querySelector("#studio-right");
  const box = panel.getBoundingClientRect();
  const list = panel.querySelector(".studio-prototype__frames");
  const walker = document.createTreeWalker(list, NodeFilter.SHOW_TEXT);
  const out = [];
  let total = 0;
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (!node.textContent.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    let { left, right } = range.getBoundingClientRect();
    for (let el = node.parentElement; el && el !== panel; el = el.parentElement) {
      if (/hidden|clip|auto|scroll/.test(getComputedStyle(el).overflowX)) { const b = el.getBoundingClientRect(); left = Math.max(left, b.left); right = Math.min(right, b.right); }
    }
    if (right - left <= 0) continue;
    total += 1;
    if (right > box.right + 0.5 || left < box.left - 0.5) out.push(`${node.textContent.trim().slice(0, 20)} → ${Math.round(right)} (panel ${Math.round(box.right)})`);
  }
  const ellipsized = [...list.querySelectorAll(".studio-inspector__item-name")].filter((el) => el.scrollWidth > el.clientWidth + 1).length;
  return { width: Math.round(box.width), total, out, ellipsized };
});

/** The Inspector resized to `to` px with its handle's keys (16px a step), whichever arrow shrinks it (PT-29). */
async function resizeInspector(page, to) {
  const width = async () => Math.round((await page.locator("#studio-right").boundingBox()).width);
  await page.locator('[aria-label="Resize Inspector"]').focus();
  for (let n = 0; n < 12 && (await width()) !== to; n += 1) {
    const before = await width();
    await page.keyboard.press(to < before ? "ArrowRight" : "ArrowLeft");
    await sleep(60);
    if ((await width()) === before) { await page.keyboard.press(to < before ? "ArrowLeft" : "ArrowRight"); await sleep(60); }
  }
  return width();
}

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

/** A filter Chip whose pick filters the Table's Status column, a second one on Priority, and four tasks (PT-23). */
const filterChipPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { Chip, Stack, Table } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Tasks">
        <Stack gap="md" padding="lg">
          <Chip dropdown popoverItems={[{ id: "todo", label: "To do" }, { id: "doing", label: "Doing" }]} onPopoverSelect={proto.filter({ column: "status" })}>Status</Chip>
          <Chip dropdown popoverItems={[{ id: "high", label: "High" }, { id: "low", label: "Low" }]} onPopoverSelect={proto.filter({ column: "priority" })}>Priority</Chip>
          <Table aria-label="Tasks" columns={[{ id: "title", header: "Task" }, { id: "status", header: "Status" }, { id: "priority", header: "Priority" }]} rows={[{ id: "1", title: "Alpha", status: "Doing", priority: "High" }, { id: "2", title: "Beta", status: "To do", priority: "High" }, { id: "3", title: "Gamma", status: "Doing", priority: "Low" }, { id: "4", title: "Delta", status: "To do", priority: "Low" }]} />
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
/** Two phone Screens on one master layout, their phone chrome drawn from it as the page opens (PT-25, PT-26; the DEMO-MEET
 *  task page, 2026-10-24): the Sidebar leads Overview and Tasks by item, the header has a Search that filters the task
 *  Table, a Help Menu, notifications, the account's Menu and an Export button, more than the phone bar holds. */
const phoneChromePage = (title) => {
  const shell = (selected, heading, content) => `        <AppShell
          sidebar={<Sidebar aria-label="Main" selectedId="${selected}" onItemClick={proto.navigate({ home: "overview", tasks: "tasks" })}>
            <SidebarMenuItem id="home" label="Overview" icon="icon-home-03-line" />
            <SidebarMenuItem id="tasks" label="Tasks" icon="icon-check-square-line" />
            <SidebarMenuItem id="people" label="People" icon="icon-users-line" />
          </Sidebar>}
          header={<AppShellHeader
            center={<Search aria-label="Search tasks" placeholder="Search" shortcut="K" onValueChange={proto.filter({ column: "title", match: "contains" })} />}
            actions={<Stack direction="row" gap="sm" align="center">
              <Menu align="end" onSelect={proto.toast("Guide opened")} trigger={<AppShellAction icon="icon-help-circle-line" aria-label="Help" />} items={[{ id: "guide", label: "Open the guide", icon: "icon-file-doc-line" }]} />
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} onClick={proto.toast("3 new")} />
              <Menu align="end" onSelect={proto.toast("Not in this demo")} trigger={<AppShellAccount name="Ha Tran" />} items={[{ id: "profile", label: "My profile", icon: "icon-user-circle-line" }]} />
            </Stack>}
            main={<PageHeader title="${heading}" actions={<Button level="tertiary" startIcon="icon-download-01-line" onClick={proto.toast("Exported")}>Export</Button>} />}
          />}
        >
${content}
        </AppShell>`;
  return `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader, Button, Menu, PageHeader, Search, Sidebar, SidebarMenuItem, Stack, Table, Text } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="overview" title="Overview" device="phone">
${shell("home", "Overview", `          <Stack gap="md" padding="lg">
            <Table aria-label="Tasks" columns={[{ id: "title", header: "Task" }]} rows={[{ id: "1", title: "Alpha" }, { id: "2", title: "Beta" }, { id: "3", title: "Gamma" }, { id: "4", title: "Delta" }]} />
            ${Array.from({ length: 30 }, (_, index) => `<Text>Note ${index + 1}</Text>`).join("\n            ")}
          </Stack>`)}
      </Screen>
      <Screen id="tasks" title="Tasks" device="phone">
${shell("tasks", "Tasks", `          <Stack padding="lg">
            <Text>Every task</Text>
          </Stack>`)}
      </Screen>
    </Board>
  );
}
`;
};

/** Seeds the phone chrome page and waits for both Screens' phone parts drawn from the desktop header, linked. */
async function phoneChromeSeeded(ctx) {
  const seeded = await seededPage(ctx, phoneChromePage, /<Screen id="tasks"/);
  await until(async () => {
    const page = await seeded.text();
    return (page.match(/phoneLinked=\{\["topNavigation", ?"bottomNavigation"\]\}/g) ?? []).length === 2 && /onValueChange=\{proto\.navigate\(\{ home: "overview", tasks: "tasks" \}\)\}/.test(page) && /searchAction=\{\{ label: "Search tasks" \}\}/.test(page);
  }, { message: "both Screens' phone chrome drawn and linked" }).catch(async (error) => { throw new Error(`${error.message} (${(await seeded.text()).match(/topNavigation=\{.{0,300}/)?.[0] ?? "no topNavigation"})`); });
  return seeded;
}

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

/** A desktop Screen with an editable Table and a toast, and a modal Side Panel holding another editable Table (PT-28). */
const darkPopoverPage = (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Overlay, Screen, proto } from "@zen-ds/react/builder";
import { Button, SidePanel, Stack, Table } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Orders" device="desktop">
        <Stack gap="md" padding="lg">
          <Button onClick={proto.toast({ title: "Report exported" })}>Export</Button>
          <Button onClick={proto.open("details")}>Details</Button>
          <Table aria-label="Orders" editable columns={[{ id: "client", header: "Client" }, { id: "status", header: "Status", content: "badge" }]} rows={[{ id: "1", client: "Acme", status: "Paid" }, { id: "2", client: "Globex", status: "Overdue" }]} />
        </Stack>
      </Screen>
      <Overlay id="details">
        <SidePanel type="modal" title="Order details" onOpenChange={proto.close()}>
          <Table aria-label="Lines" editable columns={[{ id: "item", header: "Item" }, { id: "state", header: "State", content: "badge" }]} rows={[{ id: "a", item: "Desk", state: "Packed" }, { id: "b", item: "Lamp", state: "Shipped" }]} />
        </SidePanel>
      </Overlay>
    </Board>
  );
}
`;

/** Where a popover, tooltip or toast of the played page draws, and whether it is dark: its theme scope, its background's
 *  brightness (0–255) and whether anything inert holds it. */
const layerLook = (locator) => locator.evaluate((element) => {
  const [r, g, b] = (getComputedStyle(element).backgroundColor.match(/[\d.]+/g) ?? ["255", "255", "255"]).map(Number);
  return { theme: element.closest("[data-theme]")?.getAttribute("data-theme") ?? null, brightness: Math.round((r + g + b) / 3), inPlay: Boolean(element.closest(".studio-player")), inert: Boolean(element.closest("[inert]")) };
});

export const rows = [
  {
    id: "PT-29", feature: "Flow list fits the panel: Screens and an Overlay with long names keep their trailing word (Start, Overlay) inside the Inspector at 320px and at its 280px minimum, the name ellipsized (UX review 2026-10-27 §2.5)", wp: "ux review 2026-10-27 §7.5", timeout: 40_000,
    async run(ctx) {
      const { page } = await seededPage(ctx, longNamesPage, /Sprint Review/);
      await prototypeTab(page);
      await page.locator(".studio-prototype__frame").nth(2).waitFor({ state: "visible", timeout: 5000 });
      const at320 = await flowOverflow(page);
      if (at320.width !== 320) throw new Error(`the Inspector is ${at320.width}px wide, not 320`);
      if (at320.total < 5) throw new Error(`${at320.total} text nodes in the Flow list, expected the 3 names, Start and Overlay`);
      if (at320.out.length) throw new Error(`at 320px ${at320.out.length} text node(s) run past the panel: ${at320.out.slice(0, 3).join(" · ")}`);
      const width = await resizeInspector(page, 280);
      let at280;
      try {
        if (width !== 280) throw new Error(`the Inspector resized to ${width}px, not its 280px minimum`);
        at280 = await flowOverflow(page);
        if (at280.out.length) throw new Error(`at 280px ${at280.out.length} text node(s) run past the panel: ${at280.out.slice(0, 3).join(" · ")}`);
        if (!at280.ellipsized) throw new Error("at 280px no name is ellipsized: the long names must shorten, not the trailing word");
      } finally {
        // The width is a preference the next rows share.
        await resizeInspector(page, 320);
      }
      return `320px: ${at320.total} text nodes inside the panel · 280px: ${at280.total} inside, ${at280.ellipsized} name(s) ellipsized · back at 320`;
    },
  },
  {
    id: "PT-30", feature: "Play keeps a phone Screen's bars over what scrolls: a long List in an absolute Box past the Screen's foot scrolls under the Top Navigation (its Back button stays on top) and the Bottom Navigation stays at the device's foot to the end (user 2026-10-28)", wp: "bug 2026-10-28",
    async run(ctx) {
      const { page } = await seededPage(ctx, absoluteListPage, /Project 16/);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await playing(page).getByText("Project 16").waitFor({ state: "attached", timeout: 5000 });
      // To the end of the list, where the bottom bar rose before (it stopped at the Screen's 844px foot).
      const max = await page.evaluate(() => {
        const inner = document.querySelector(".studio-player__device > .studio-player__screens");
        inner.scrollTop = inner.scrollHeight;
        return inner.scrollHeight - inner.clientHeight;
      });
      if (max < 300) throw new Error(`the Screen scrolls ${max}px: the list should run well past the device`);
      await sleep(300);
      const seen = await page.evaluate(() => {
        const inner = document.querySelector(".studio-player__device > .studio-player__screens");
        const view = inner.getBoundingClientRect();
        const bottom = document.querySelector(".studio-player .studio-builder-screen__bottom").getBoundingClientRect();
        const back = document.querySelector(".studio-player .studio-builder-screen__top").querySelector('button[aria-label="Back"]').getBoundingClientRect();
        const hit = document.elementFromPoint(back.x + back.width / 2, back.y + back.height / 2);
        const last = [...document.querySelectorAll(".studio-player .zen-list-item")].at(-1).getBoundingClientRect();
        return { gap: Math.round(view.bottom - bottom.bottom), backOnTop: Boolean(hit?.closest(".studio-builder-screen__top")), hit: hit?.className ?? null, lastAboveBar: Math.round(bottom.top - last.bottom), top: inner.scrollTop };
      });
      if (seen.gap > 2 || seen.gap < -2) throw new Error(`at the end of the list the Bottom Navigation stands ${seen.gap}px above the device's foot`);
      if (!seen.backOnTop) throw new Error(`the list covers the Top Navigation's Back button (the point hits ${seen.hit})`);
      return `scrolled ${seen.top}/${max}px · Bottom Navigation at the foot (${seen.gap}px) · Back on top · last row ${seen.lastAboveBar}px clear of the bar`;
    },
  },
  {
    id: "PT-32", feature: "Buttons inside a component are prototyped like Figma's (walk 2026-10-29 W-35/36/41): Top leading on a builder page's Top Navigation adds a Back that goes back (proto.back(), not a toast); the Prototype tab lists the Dialog's Primary and Secondary buttons by label and points Confirm at a Screen; Play: Detail's Back returns Home, Book → Confirm lands on Done", wp: "prototype walk 2026-10-29", timeout: 50_000,
    async run(ctx) {
      const { page, id, text: source } = await seededPage(ctx, actionsPage, /proto\.open\("confirm"\)/);
      await step("Top leading on", async () => {
        await clickNamed(page, id, "TopNavigation");
        await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
        await inspectorRow(page, "leading").getByRole("switch").click();
      });
      await until(async () => /leading=\{\{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: proto\.back\(\) \}\}/.test(await source()), { message: "the Back's proto.back() on the Top Navigation" });
      if (/toast/.test(await source())) throw new Error("the Back still brings a toast");
      await prototypeTab(page);
      await until(async () => (await inspectorRow(page, "proto:leading.onClick").count()) === 1, { message: "the Top Navigation's Leading button in Interactions" });
      const leadingRow = await inspectorRow(page, "proto:leading.onClick").innerText();
      if (!/Leading button · Back/.test(leadingRow)) throw new Error(`the Back's row reads “${leadingRow.split("\n")[0]}”`);
      await step("select the Dialog", async () => {
        // The overlay sits right of the Screens: every frame in view first, so the click lands on the Dialog.
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("Shift+Digit1");
        await sleep(400);
        await clickNamed(page, id, "Dialog");
      });
      for (const [trigger, label] of [["primaryAction.onClick", "Primary button · Confirm"], ["secondaryAction.onClick", "Secondary button · Cancel"]]) {
        const row = inspectorRow(page, `proto:${trigger}`);
        await until(async () => (await row.count()) === 1, { message: `${label} in Interactions` }).catch(async (error) => {
          const shown = (await page.locator('[data-e2e="prototype-panel"]').innerText().catch(() => "")).replace(/\s+/g, " ").slice(-300);
          throw new Error(`${error.message} (the panel: ${shown})`);
        });
        if (!(await row.innerText()).includes(label)) throw new Error(`the ${trigger} row reads “${(await row.innerText()).split("\n")[0]}”`);
      }
      await pickOption(page, "proto:primaryAction.onClick", "Navigate to");
      await until(async () => /primaryAction=\{\{ label: "Confirm", onClick: proto\.navigate\(/.test(await source()), { message: "Confirm navigates" });
      await pickOption(page, "proto:primaryAction.onClick:target", "Done");
      await until(async () => /primaryAction=\{\{ label: "Confirm", onClick: proto\.navigate\("done"\) \}\}/.test(await source()), { message: 'Confirm → proto.navigate("done")' });
      if (!/secondaryAction=\{\{ label: "Cancel", onClick: proto\.close\(\) \}\}/.test(await source())) throw new Error("Cancel lost its Close overlay");
      // ▷ beside Home in Flow: Play from the first Screen (⌘⌥↩ would play from the selected layer's frame).
      await step("Play from Home", () => page.locator('[data-e2e="prototype-panel"]').getByRole("button", { name: "Play from Home" }).click());
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const on = (screen) => until(async () => (await playScreen(page)) === screen, { message: `Play on ${screen}` });
      await on("home");
      await step("Open detail", () => playing(page).getByRole("button", { name: "Open detail" }).click());
      await on("detail");
      // The Top Navigation's Back inside the device (Play's own bar has a Back too).
      await step("Back", () => playing(page).locator(".studio-player__device").getByRole("button", { name: "Back", exact: true }).click());
      await on("home");
      await playing(page).getByRole("button", { name: "Open detail" }).click();
      await on("detail");
      await step("Book", () => playing(page).getByRole("button", { name: "Book" }).click());
      const dialog = playing(page).getByRole("dialog", { name: "Book?" });
      await dialog.waitFor({ state: "visible", timeout: 3000 });
      await step("Confirm", () => dialog.getByRole("button", { name: "Confirm" }).click());
      await on("done");
      await page.keyboard.press("Escape");
      return "Top leading → Back = proto.back() · Leading/Primary/Secondary buttons listed · Confirm → Done · Play: Back returns Home, Book → Confirm → Done";
    },
  },
  {
    id: "PT-33", feature: "Set as start (walk 2026-10-29 W-32, Figma's Set as starting point): a Flow row's flag makes Splash the start — it goes first in the Board, Flow marks it Start, Present plays from it, no frame moves on the canvas (Home, still unplaced, is pinned where it shows); ⌘Z puts Login back; the frame's menu says Set as start too", wp: "prototype walk 2026-10-29", timeout: 40_000,
    async run(ctx) {
      const { page, text: source } = await seededPage(ctx, orderPage, /<Screen id="home"/);
      await prototypeTab(page);
      const flow = page.locator('[data-e2e="prototype-panel"]');
      const startRow = () => flow.locator(".studio-prototype__frame", { hasText: "Start" }).first().innerText();
      if (!/Login/.test(await startRow())) throw new Error(`Login is not the start at first (${await startRow()})`);
      const before = await frameBoxes(page);
      await step("Splash's Set as start", async () => {
        await flow.locator('[data-frame="screen:splash"]').hover();
        await flow.getByRole("button", { name: "Set Splash as start" }).click();
      });
      await until(async () => screenOrder(await source()) === "splash,login,home", { message: "Splash first in the Board" });
      await until(async () => /Splash/.test(await startRow()), { message: "Flow marks Splash Start" });
      if (await flow.getByRole("button", { name: "Set Splash as start" }).count()) throw new Error("the start still offers Set as start");
      await sleep(500);
      const after = await frameBoxes(page);
      const moved = Object.keys(before).filter((id) => before[id] !== after[id]);
      if (moved.length) throw new Error(`frames moved on the canvas: ${moved.map((id) => `${id} ${before[id]} → ${after[id]}`).join("; ")}`);
      if (!/<Screen id="home" title="Home" device="phone" x=\{\d+\} y=\{\d+\}/.test(await source())) throw new Error("Home was not pinned where it shows");
      await step("Present plays from the start", () => flow.getByRole("button", { name: "Present" }).click());
      await until(async () => (await playScreen(page)) === "splash", { message: "Play on splash" });
      await page.keyboard.press("Escape");
      await playing(page).waitFor({ state: "detached", timeout: 5000 }).catch(() => undefined);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => screenOrder(await source()) === "login,splash,home", { message: "⌘Z puts Login first again" });
      await step("the frame's menu", async () => {
        await page.locator('[data-chrome-key="label:screen:home"]').first().click({ button: "right" });
        await page.getByRole("menuitem", { name: "Set as start" }).click();
      });
      await until(async () => screenOrder(await source()) === "home,login,splash", { message: "the menu's Set as start puts Home first" });
      return "flag → splash,login,home · Flow Start = Splash · no frame moved, Home pinned · Present from Splash · ⌘Z → login first · frame menu → home first";
    },
  },
  {
    id: "PT-34", feature: "Layers reorders frames (walk 2026-10-29 W-33: the drag did nothing): Login's row dragged above the top row goes last in the Board, the Flow list follows and Splash becomes the start; no frame moves on the canvas; ⌘Z puts it back", wp: "prototype walk 2026-10-29", timeout: 40_000,
    async run(ctx) {
      const { page, text: source } = await seededPage(ctx, orderPage, /<Screen id="home"/);
      await showLeftTab(page, "layers");
      const row = (id) => page.locator(`#studio-left [role="treeitem"][data-layer-id="frame:screen:${id}"]`).first();
      await row("login").waitFor({ state: "visible", timeout: 5000 });
      const rows = await page.locator('#studio-left [role="treeitem"][data-kind="frame"]').evaluateAll((items) => items.map((item) => item.getAttribute("data-layer-id")));
      const top = rows[0]?.replace(/^frame:screen:/, "");
      if (!top || top === "login") throw new Error(`the Layers frame rows: ${rows.join(", ")}`);
      const before = await frameBoxes(page);
      const from = await row("login").boundingBox();
      const to = await row(top).boundingBox();
      await step("drag Login's row above the top row", () => drag(page, { x: from.x + 40, y: from.y + from.height / 2 }, { x: to.x + 40, y: to.y + 3 }));
      // Layers lists the front-most frame first: above the top row is the end of the Board.
      await until(async () => screenOrder(await source()).endsWith(",login"), { message: `Login last in the Board (${screenOrder(await source())})` });
      await prototypeTab(page);
      const startRow = await page.locator('[data-e2e="prototype-panel"] .studio-prototype__frame', { hasText: "Start" }).first().innerText();
      if (/Login/.test(startRow)) throw new Error("Login is still the start");
      await sleep(500);
      const after = await frameBoxes(page);
      const moved = Object.keys(before).filter((id) => before[id] !== after[id]);
      if (moved.length) throw new Error(`frames moved on the canvas: ${moved.map((id) => `${id} ${before[id]} → ${after[id]}`).join("; ")}`);
      const order = screenOrder(await source());
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => screenOrder(await source()) === "login,splash,home", { message: "⌘Z puts the order back" });
      return `Layers drag → ${order} · Start no longer Login · no frame moved · ⌘Z → login,splash,home`;
    },
  },
  {
    id: "PT-35", feature: "A page from the Mobile list · Orders template keeps its bars and its links (walk 2026-10-29 W-48/W-50): the Screen's Top Navigation is the template's (Orders, its Search), its Bottom Navigation's tabs show, one of each on the canvas; the Date chip opens the Date placed sheet (proto.open) without the Prototype tab", wp: "prototype walk 2026-10-29", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await pageFromTemplate(ctx, "Mobile list · Orders");
      const source = async () => (await pageText(page, id)) ?? "";
      await until(async () => /<Screen[\s\S]*?topNavigation=\{<TopNavigation[\s\S]*?title="Orders"/.test(await source()), { message: "the Screen's Top Navigation is the template's (Orders)" });
      const code = await source();
      const screenTag = code.slice(code.indexOf("<Screen"), code.indexOf("<AppShell"));
      if (/Mobile list · Orders" largeTitle/.test(screenTag) || !/<Search\b/.test(screenTag)) throw new Error(`the Screen's bars: ${screenTag.replace(/\s+/g, " ").slice(0, 300)}`);
      if (!/bottomNavigation=\{<BottomNavigation/.test(screenTag)) throw new Error("the Screen has no Bottom Navigation");
      if (!/onClick=\{proto\.open\("date-placed"\)\}/.test(code)) throw new Error("the Date chip does not open the Date placed sheet");
      const screen = page.locator('[data-studio-frame="screen:screen-1"]');
      await until(async () => (await screen.locator(".zen-bottom-nav").count()) >= 1, { message: "the tabs on the canvas" });
      const bars = await screen.evaluate((frame) => ({
        top: [...frame.querySelectorAll(".zen-top-nav")].filter((bar) => bar.getBoundingClientRect().height > 0).length,
        bottom: [...frame.querySelectorAll(".zen-bottom-nav")].filter((bar) => bar.getBoundingClientRect().height > 0).length,
        shop: [...frame.querySelectorAll(".zen-bottom-nav")].some((bar) => /Shop/.test(bar.textContent ?? "")),
      }));
      if (bars.top !== 1 || bars.bottom !== 1 || !bars.shop) throw new Error(`on the canvas: ${bars.top} Top and ${bars.bottom} Bottom Navigations, Shop tab ${bars.shop}`);
      return "Top Navigation Orders + Search · tabs (Shop) · 1 top, 1 bottom bar on the canvas · Date → proto.open(\"date-placed\")";
    },
  },
  {
    id: "PT-36", feature: "Add Screen › a template (walk 2026-10-29 W-49): on a phone page Add Screen offers Empty Screen and the phone templates; Mobile detail · Order goes in as a second Screen with its three overlays, each opened by the button named as it is; one ⌘Z takes it all back", wp: "prototype walk 2026-10-29", timeout: 60_000,
    async run(ctx) {
      const { page, id } = await newPage(ctx, { device: "phone" });
      const source = async () => (await pageText(page, id)) ?? "";
      await prototypeTab(page);
      await page.getByRole("button", { name: "Add Screen" }).click();
      await page.getByRole("menuitem", { name: "Empty Screen" }).waitFor({ state: "visible", timeout: 3000 });
      await step("Mobile detail · Order", () => page.getByRole("menuitem", { name: /^Mobile detail · Order/ }).click({ timeout: 10_000 }));
      await until(async () => (await source()).match(/<Screen /g)?.length === 2, { timeout: 30_000, message: "a second Screen" });
      await until(async () => (await source()).match(/<Overlay /g)?.length === 3, { message: "its three overlays" });
      const code = await source();
      const opens = [...code.matchAll(/proto\.open\("([a-z0-9-]+)"\)/g)].map((match) => match[1]).sort();
      const overlays = [...code.matchAll(/<Overlay id="([a-z0-9-]+)"/g)].map((match) => match[1]).sort();
      if (opens.join() !== overlays.join()) throw new Error(`buttons open ${opens.join(", ") || "nothing"}; the overlays are ${overlays.join(", ")}`);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+z");
      await until(async () => (await source()).match(/<Screen /g)?.length === 1 && !/<Overlay /.test(await source()), { message: "one ⌘Z takes the Screen and its overlays back" });
      return `Add Screen › Mobile detail · Order → 2 Screens, overlays ${overlays.join(", ")} each opened by its button · one ⌘Z → 1 Screen`;
    },
  },
  {
    id: "PT-37", feature: "Open overlay picks the overlay named as the button (walk 2026-10-29 W-57: Invite members opened the first overlay, Filter): a Change role button's On click → Open overlay writes proto.open(\"change-role\"), not the first overlay", wp: "prototype walk 2026-10-29", timeout: 40_000,
    async run(ctx) {
      const { page, id, text: source } = await seededPage(ctx, namedOverlaysPage, /<Overlay id="change-role"/);
      await clickNamed(page, id, "Button");
      await prototypeTab(page);
      await pickOption(page, "proto:onClick", "Open overlay");
      await until(async () => /<Button onClick=\{proto\.open\("change-role"\)\}>Change role<\/Button>/.test(await source()), { message: 'proto.open("change-role")' });
      return 'Change role → Open overlay → proto.open("change-role") (not "filter")';
    },
  },
  {
    id: "PT-31", feature: "Play draws a phone's system bars at the device's edges whichever navigation the Screen has: with a Bottom Navigation only, the status bar at the top with no band above it and the content below it; with a Top Navigation only, the home indicator at the foot at the end of a long List and the last row clear of it (walk W-47)", wp: "bug 2026-10-29",
    async run(ctx) {
      const play = async (page, wait) => {
        await page.locator(".studio-viewport").focus();
        await page.keyboard.press("ControlOrMeta+Alt+Enter");
        await playing(page).waitFor({ state: "visible", timeout: 5000 });
        await playing(page).getByText(wait).first().waitFor({ state: "attached", timeout: 5000 });
        await sleep(300);
      };
      const top = await seededPage(ctx, oneBarPage("bottom"), /Hello An Tam/);
      await play(top.page, "Hello An Tam");
      const head = await top.page.evaluate(() => {
        const view = document.querySelector(".studio-player__device > .studio-player__screens").getBoundingClientRect();
        const status = document.querySelector(".studio-player .studio-device-status").getBoundingClientRect();
        const words = [...document.querySelectorAll(".studio-player .zen-text")].find((element) => element.textContent === "Hello An Tam").getBoundingClientRect();
        return { band: Math.round(status.top - view.top), height: Math.round(status.height), below: Math.round(words.top - status.bottom) };
      });
      if (Math.abs(head.band) > 1) throw new Error(`a ${head.band}px band above the status bar (it should sit at the device's top)`);
      if (head.below < 0) throw new Error(`the content starts ${-head.below}px under the status bar`);
      await top.page.keyboard.press("Escape");
      const foot = await seededPage(ctx, oneBarPage("top"), /Order 16/);
      await play(foot.page, "Order 16");
      const end = await foot.page.evaluate(() => {
        const inner = document.querySelector(".studio-player__device > .studio-player__screens");
        inner.scrollTop = inner.scrollHeight;
        return inner.scrollHeight - inner.clientHeight;
      });
      if (end < 100) throw new Error(`the Screen scrolls ${end}px: the List should run past the device`);
      await sleep(300);
      const tail = await foot.page.evaluate(() => {
        const view = document.querySelector(".studio-player__device > .studio-player__screens").getBoundingClientRect();
        const home = document.querySelector(".studio-player .studio-device-home").getBoundingClientRect();
        const screen = document.querySelector(".studio-player .studio-builder-screen");
        const safe = parseFloat(getComputedStyle(screen).getPropertyValue("--zen-safe-area-bottom")) || 0;
        const last = [...document.querySelectorAll(".studio-player .zen-list-item")].at(-1).getBoundingClientRect();
        return { home: Math.round(view.bottom - home.bottom), clear: Math.round(view.bottom - safe - last.bottom), safe };
      });
      if (tail.home < 6 || tail.home > 12) throw new Error(`at the end of the List the home indicator stands ${tail.home}px above the device's foot (8 on an iPhone)`);
      if (tail.clear < -1) throw new Error(`the last row runs ${-tail.clear}px into the ${tail.safe}px home area`);
      return `Bottom Navigation only: status bar at the top (${head.band}px), content ${head.below}px below it · Top Navigation only: home indicator ${tail.home}px from the foot, last row ${tail.clear}px clear of the ${tail.safe}px home area`;
    },
  },
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
      // A new page's tabs are drawn from its Sidebar (component-usage-rules §17): Figma's placeholder rows label-1 … label-6,
      // the first four and More (appshell-placeholder.mjs, 2026-10-26).
      const tabCount = () => page.locator('[data-studio-frame="screen:screen-1"] .zen-bottom-nav__items li').count();
      await until(async () => { const tabs = await tabCount(); return tabs >= 3 && (await page.locator(".studio-proto-plus").count()) === tabs; }, { message: "one ⊕ per tab" });
      await drag(page, center(await page.locator('.studio-proto-plus[data-item="label-2"]').boundingBox()), await frameCenter(page, "screen:screen-2"));
      await until(async () => /onValueChange=\{proto\.navigate\(\{ "label-2": "screen-2" \}\)\}/.test(await text(page, id)), { message: "the second tab → screen-2" });
      await pickOption(page, "proto:onValueChange:item:label-3", "Screen 3");
      await until(async () => /proto\.navigate\(\{ "label-2": "screen-2", "label-3": "screen-3" \}\)/.test(await text(page, id)), { message: "the third tab → screen-3, the second kept" });
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
      const tabCount = () => page.locator('[data-studio-frame="screen:screen-1"] .zen-bottom-nav__items li').count();
      await until(async () => { const tabs = await tabCount(); return tabs >= 3 && (await page.locator(".studio-proto-plus").count()) === tabs; }, { message: "one ⊕ per tab" });
      await drag(page, center(await page.locator('.studio-proto-plus[data-item="label-2"]').boundingBox()), await frameCenter(page, "screen:screen-2"));
      await until(async () => /proto\.navigate\(\{ "label-2": "screen-2" \}\)/.test(await text(page, id)), { message: "the second tab → screen-2" }).catch(async (error) => { throw new Error(`${error.message} (navigates: ${((await text(page, id)).match(/proto\.navigate\([^)]*\)/g) ?? []).join(" · ") || "none"})`); });
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
      // The placeholder Sidebar's second row (label-2; every row reads "Label").
      const row = page.locator('[data-studio-frame="screen:screen-1"] .zen-sidebar__body .zen-sidebar__item').nth(1);
      await selectAt(page, await row.boundingBox());
      await prototypeTab(page);
      const note = (await page.locator('[data-e2e="prototype-panel"] .studio-inspector__section').nth(1).innerText()).split("\n").map((line) => line.trim());
      if (!note.includes("Label · in Sidebar")) throw new Error(`the tab does not name the row: ${JSON.stringify(note.slice(0, 4))}`);
      const plus = page.locator('.studio-proto-plus[data-item="label-2"]');
      await plus.waitFor({ state: "visible", timeout: 5000 });
      await drag(page, center(await plus.boundingBox()), await frameCenter(page, "screen:screen-2"));
      await until(async () => /onItemClick=\{proto\.navigate\(\{ "label-2": "screen-2" \}\)\}/.test(await text(page, id)), { message: "the Sidebar's label-2 → screen-2" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await playing(page).locator(".zen-sidebar__body .zen-sidebar__item").nth(1).click();
      await until(async () => (await playScreen(page)) === "screen-2", { message: "the second row → screen-2 in Play" });
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
      const fit = await present.locator(PRESENT_VIEWPORT).boundingBox();
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
        const box = await present.locator(PRESENT_VIEWPORT).boundingBox();
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
  {
    id: "PT-23", feature: "Filter table from a filter Chip's pick (user 2026-10-24, the Quản lý task prototype: every filter works in Play): the Chip shows its pick and keeps the Table's Doing rows; the same pick again shows every row; × shows every row and the Chip its placeholder; two chips narrow together; Restart starts both over", wp: "play chip clear 2026-10-24", timeout: 40_000,
    async run(ctx) {
      const { page } = await seededPage(ctx, filterChipPage, /onPopoverSelect=\{proto\.filter\(/);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const titles = async () => (await playing(page).locator(".zen-table tbody tr.zen-table__row").allInnerTexts()).map((row) => row.match(/Alpha|Beta|Gamma|Delta/)?.[0]).join();
      const chip = (index) => playing(page).locator(".zen-chip").nth(index);
      const label = async (index) => ((await chip(index).locator(".zen-chip__label").textContent()) ?? "").trim();
      const pick = (index, option) => step(`pick ${option}`, async () => {
        await chip(index).click();
        await playing(page).getByRole("option", { name: option, exact: true }).click();
      });
      await until(async () => (await titles()) === "Alpha,Beta,Gamma,Delta", { message: "four tasks at first" });
      await pick(0, "Doing");
      await until(async () => (await titles()) === "Alpha,Gamma" && (await label(0)) === "Doing", { message: "Doing: Alpha and Gamma, the chip says Doing" });
      await pick(0, "Doing");
      await until(async () => (await titles()) === "Alpha,Beta,Gamma,Delta" && (await label(0)) === "Status", { message: "Doing again: every task, the chip says Status" });
      await pick(0, "Doing");
      await pick(1, "High");
      await until(async () => (await titles()) === "Alpha", { message: "Doing and High: Alpha" });
      await step("press the Status chip's ×", () => chip(0).locator(".zen-chip__remove").click());
      await until(async () => (await titles()) === "Alpha,Beta" && (await label(0)) === "Status" && (await chip(0).getAttribute("data-select")) === "false", { message: "×: High only (Alpha, Beta), the Status chip shows its placeholder" });
      await page.keyboard.press("r");
      await until(async () => (await titles()) === "Alpha,Beta,Gamma,Delta" && (await label(1)) === "Priority", { message: "Restart: every task, the Priority chip shows its placeholder" });
      await page.keyboard.press("Escape");
      return "Play: Doing → 2 rows (chip says Doing) → Doing again → 4 rows (chip says Status) → Doing + High → 1 row → × → High only, chip placeholder → R → 4 rows";
    },
  },
  {
    id: "PT-24", feature: "Play draws a Screen as an app in a window: the Screen scrolls inside the device, and a modal Side Panel opened on a scrolled Screen shows in full in the window, moves nothing, and a wheel over it or its scrim leaves the Screen still", wp: "modal scroll lock 2026-10-24", timeout: 40_000,
    async run(ctx) {
      const { page } = await seededPage(ctx, longScreenPage, /proto\.open\("details"\)/);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const scroll = () => page.evaluate(() => {
        const inner = document.querySelector(".studio-player__device > .studio-player__screens");
        const stage = document.querySelector(".studio-player .studio-present__scroll");
        return { top: inner.scrollTop, max: inner.scrollHeight - inner.clientHeight, stage: stage.scrollHeight - stage.clientHeight };
      });
      const start = await scroll();
      if (start.max < 200 || start.stage > 1) throw new Error(`the Screen does not scroll inside the device: ${JSON.stringify(start)}`);
      const device = await playing(page).locator(".studio-player__device").boundingBox();
      await page.mouse.move(device.x + device.width / 2, device.y + device.height / 2);
      await page.mouse.wheel(0, 150);
      await until(async () => (await scroll()).top >= 150, { message: "a wheel scrolls the Screen" });
      const top = (await scroll()).top;
      await step("open the Side Panel", () => playing(page).getByRole("button", { name: "Details" }).click());
      const panel = playing(page).getByRole("dialog", { name: "Task details" });
      await panel.waitFor({ state: "visible", timeout: 3000 });
      await sleep(400);
      if ((await scroll()).top !== top) throw new Error(`opening the Side Panel moved the Screen: ${top} → ${(await scroll()).top}`);
      const box = await panel.boundingBox();
      if (box.y < device.y - 1 || box.y + box.height > device.y + device.height + 1) throw new Error(`the Side Panel is not in the window: panel ${JSON.stringify(box)}, device ${JSON.stringify(device)}`);
      for (const [x, y] of [[device.x + 40, device.y + device.height / 2], [box.x + box.width / 2, box.y + box.height / 2]]) {
        for (const dy of [600, -600]) {
          await page.mouse.move(x, y);
          await page.mouse.wheel(0, dy);
          await sleep(200);
          if ((await scroll()).top !== top) throw new Error(`a wheel over the open Side Panel moved the Screen: ${top} → ${(await scroll()).top}`);
        }
      }
      await page.keyboard.press("Escape");
      await until(async () => (await panel.count()) === 0, { message: "Escape closes the Side Panel" });
      if ((await scroll()).top !== top) throw new Error(`closing moved the Screen: ${top} → ${(await scroll()).top}`);
      await page.mouse.move(device.x + device.width / 2, device.y + device.height / 2);
      await page.mouse.wheel(0, -600);
      await until(async () => (await scroll()).top === 0, { message: "the Screen scrolls again once the panel is closed" });
      await page.keyboard.press("Escape");
      return `Screen scrolls inside the device (range ${start.max}); Side Panel opened at ${top}: in the window, nothing moved, wheel held; closed, the Screen scrolls`;
    },
  },
  {
    id: "PT-25", feature: "Phone chrome from the desktop header (the DEMO-MEET task page, 2026-10-24: a frozen tab bar): the phone tab bar goes where the Sidebar's rows go (its per-item onItemClick as onValueChange); in phone Play the Tasks tab opens Tasks and Overview comes back", wp: "phone chrome 2026-10-25", timeout: 40_000,
    async run(ctx) {
      const { page } = await phoneChromeSeeded(ctx);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await until(async () => (await playScreen(page)) === "overview", { message: "Play starts on Overview" });
      const tab = (name) => playing(page).locator(".zen-bottom-nav__item", { hasText: name });
      await step("press the Tasks tab", () => tab("Tasks").click());
      await until(async () => (await playScreen(page)) === "tasks", { message: "the Tasks tab → Tasks" });
      await until(async () => (await tab("Tasks").getAttribute("aria-current")) === "page", { message: "Tasks' bar marks Tasks" });
      await step("press the Overview tab", () => tab("Overview").click());
      await until(async () => (await playScreen(page)) === "overview", { message: "the Overview tab → Overview" });
      await page.keyboard.press("Escape");
      return "phone parts linked with onValueChange = the Sidebar's onItemClick · Play: Tasks tab → tasks → Overview tab → overview";
    },
  },
  {
    id: "PT-26", feature: "Phone chrome from the desktop header does what the desktop does: the Search is the control bar and filters the Table, scrolled away its Search action scrolls back and focuses it; More opens a sheet whose rows run the folded actions (Export, Help's menu); the account opens its menu", wp: "phone chrome 2026-10-25", timeout: 60_000,
    async run(ctx) {
      const { page } = await phoneChromeSeeded(ctx);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await until(async () => (await playScreen(page)) === "overview", { message: "Play starts on Overview" });
      const nav = playing(page).locator(".zen-top-nav").first();
      // The task names the shown Screen lists (a phone Table may draw its rows as a list).
      const tasks = async () => (await playing(page).locator(".studio-player__device").innerText()).split("\n").map((line) => line.trim()).filter((line) => /^(Alpha|Beta|Gamma|Delta)$/.test(line)).join();
      // Search: the control bar's field filters the Table as the desktop's does.
      const field = nav.getByLabel("Search tasks");
      await until(async () => (await tasks()) === "Alpha,Beta,Gamma,Delta", { message: "four tasks at first" });
      await step("type in the control bar's Search", () => field.fill("gam"));
      await until(async () => (await tasks()) === "Gamma", { message: "“gam” keeps Gamma" });
      await field.fill("");
      await until(async () => (await tasks()) === "Alpha,Beta,Gamma,Delta", { message: "cleared: every task" });
      // Scrolled away, the Search folds into the bar's Search action, which scrolls back up and focuses the field.
      // What scrolls the shown Screen (as checkFold finds it): its scrollTop, set first when `to` is given.
      const scroller = (to = null) => playing(page).evaluate((root, to) => {
        let box = root.querySelector(".zen-top-nav");
        while (box && box !== root && !(box.scrollHeight > box.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
        if (!box || box === root) return null;
        if (to !== null) box.scrollTop = to;
        return box.scrollTop;
      }, to);
      await scroller(600);
      const searchAction = nav.locator(".zen-top-nav__search");
      await until(async () => (await searchAction.count()) === 1 && (await scroller()) > 100, { message: "scrolled: the Search action in the bar" });
      await step("press the Search action", () => searchAction.click());
      // The field itself takes focus (the Search action shares its name, so the tag and the control bar say which).
      await until(async () => (await scroller()) === 0 && (await page.evaluate(() => document.activeElement?.tagName === "INPUT" && Boolean(document.activeElement.closest(".zen-top-nav__control")))), { message: "the Search action scrolls up and focuses the field" });
      // More: a sheet of the folded actions, each doing what it does on desktop.
      const more = nav.getByRole("button", { name: "More" });
      const sheet = page.getByRole("dialog", { name: "More" });
      await step("open More", () => more.click());
      await sheet.waitFor({ state: "visible", timeout: 3000 });
      await step("press Export in the sheet", () => sheet.getByText("Export", { exact: true }).click());
      await page.getByText("Exported", { exact: true }).first().waitFor({ state: "visible", timeout: 3000 });
      await until(async () => (await sheet.count()) === 0, { message: "the sheet closes after a row" });
      await step("open More again", () => more.click());
      await step("press Help › Open the guide", () => sheet.getByText("Open the guide", { exact: true }).click());
      await page.getByText("Guide opened", { exact: true }).first().waitFor({ state: "visible", timeout: 3000 });
      // The account keeps its menu (the account sheet on a phone).
      await until(async () => (await sheet.count()) === 0, { message: "the sheet closes" });
      await step("press the account", () => nav.locator(".zen-top-nav__leading button").first().click());
      await step("press My profile", () => page.getByRole("dialog").getByText("My profile", { exact: true }).click());
      await page.getByText("Not in this demo", { exact: true }).first().waitFor({ state: "visible", timeout: 3000 });
      await page.keyboard.press("Escape");
      return "Search “gam” → Gamma · scrolled → Search action → top, field focused · More sheet: Export → toast, Help › Open the guide → toast · account → My profile → toast";
    },
  },
  {
    id: "PT-27", feature: "Play shows a desktop Screen full screen (the user 2026-10-26: \"không hiện full màn hình desktop\"): in Auto the device is the whole page under the bar, edge to edge with square corners, the Screen still scrolls inside it; a device picked in Viewport sits on the padded stage again", wp: "play desktop full screen 2026-10-26", timeout: 40_000,
    async run(ctx) {
      const { page } = await step("seed the page", () => seededPage(ctx, longScreenPage, /proto\.open\("details"\)/));
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      const measure = () => page.evaluate(() => {
        const box = (element) => { const rect = element.getBoundingClientRect(); return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }; };
        const device = document.querySelector(".studio-player__device");
        const screens = device.querySelector(".studio-player__screens");
        return { device: box(device), page: box(document.querySelector(".studio-player .studio-present__page")), radius: getComputedStyle(device).borderTopLeftRadius, mode: device.dataset.viewport, scroll: screens.scrollHeight - screens.clientHeight };
      });
      const auto = await measure();
      const off = ["x", "y", "width", "height"].filter((key) => Math.abs(auto.device[key] - auto.page[key]) > 1);
      if (off.length) throw new Error(`the device does not fill the page under the bar (${off.join(", ")}): device ${JSON.stringify(auto.device)}, page ${JSON.stringify(auto.page)}`);
      if (auto.radius !== "0px") throw new Error(`the full-screen device keeps rounded corners (${auto.radius})`);
      if (auto.scroll < 200) throw new Error(`the Screen does not scroll inside the full-screen device (range ${auto.scroll})`);
      await step("Viewport › iPad, landscape", async () => {
        await playing(page).getByRole("button", { name: /^Viewport:/ }).click();
        await playing(page).locator('[id$="-viewport-device-trigger"]').click();
        await page.getByRole("option", { name: /^iPad, landscape/ }).first().click();
        await page.keyboard.press("Escape");
      });
      await until(async () => (await measure()).mode === "fixed", { message: "the iPad viewport" });
      const fixed = await measure();
      if (fixed.device.x < 8 || fixed.device.y - fixed.page.y < 8) throw new Error(`the iPad sits on no stage padding: device ${JSON.stringify(fixed.device)}, page ${JSON.stringify(fixed.page)}`);
      await page.keyboard.press("Escape");
      return `Auto: device ${Math.round(auto.device.width)} × ${Math.round(auto.device.height)} = the page under the bar, corners ${auto.radius}, Screen scrolls ${auto.scroll}px; iPad at ${Math.round(fixed.device.x)}, ${Math.round(fixed.device.y - fixed.page.y)} on the stage`;
    },
  },
  {
    id: "PT-28", feature: "A dark Play keeps the page's popovers dark (the user 2026-10-26: a Table popover stayed light): the Table editor's popover, a tooltip and a toast draw in Play's portal layer in its theme, and a Table popover opened in a modal Side Panel stays live and picks", wp: "play portal 2026-10-26", timeout: 60_000,
    async run(ctx) {
      const { page } = await step("seed the page", () => seededPage(ctx, darkPopoverPage, /proto\.open\("details"\)/));
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+Enter");
      await playing(page).waitFor({ state: "visible", timeout: 5000 });
      await step("Dark mode", () => playing(page).getByRole("button", { name: "Dark mode" }).click());
      // Off the bar: its own hover tooltip (the Studio's chrome, in the Studio's modes) is not the page's.
      await page.mouse.move(page.viewportSize().width - 8, page.viewportSize().height - 8);
      const dark = (look, what) => { if (look.theme !== "dark" || !look.inPlay || look.inert) throw new Error(`${what} is not in the dark Play: ${JSON.stringify(look)}`); };
      await step("edit a Status cell", () => playing(page).locator("td.zen-table__cell[data-editable='true']").filter({ hasText: "Paid" }).first().click());
      const popover = page.locator(".zen-table-editor__popover");
      await popover.waitFor({ state: "visible", timeout: 3000 });
      const look = await layerLook(popover);
      dark(look, "the Table popover");
      if (look.brightness > 60) throw new Error(`the Table popover is light in a dark Play (background ${look.brightness}/255)`);
      await page.keyboard.press("Escape");
      await until(async () => (await popover.count()) === 0, { message: "Escape closes the popover" });
      if ((await playing(page).count()) !== 1) throw new Error("Escape on the popover left Play");
      await step("Export (toast)", () => playing(page).getByRole("button", { name: "Export" }).click());
      const toast = page.locator(".zen-toast").filter({ hasText: "Report exported" });
      await toast.waitFor({ state: "visible", timeout: 3000 });
      dark(await layerLook(toast), "the toast");
      await step("Details (modal Side Panel)", () => playing(page).getByRole("button", { name: "Details" }).click());
      const panel = playing(page).getByRole("dialog", { name: "Order details" });
      await panel.waitFor({ state: "visible", timeout: 3000 });
      await step("edit a State cell in the panel", () => panel.locator("td.zen-table__cell[data-editable='true']").filter({ hasText: "Packed" }).first().click());
      await popover.waitFor({ state: "visible", timeout: 3000 });
      dark(await layerLook(popover), "the Table popover over the Side Panel");
      await step("pick Shipped", () => popover.getByRole("option", { name: /Shipped/ }).click());
      await until(async () => (await panel.locator("td.zen-table__cell").filter({ hasText: "Packed" }).count()) === 0, { message: "the pick reaches the panel's Table" });
      // A pick ends with the focus back on its cell, one frame after the value shows (Table focusCell). Keys pressed before
      // that frame lose their focus to it: the close button's tooltip lived 5 ms and the row failed 3 runs in 8.
      await until(() => panel.locator('td[data-cell="a::state"]').evaluate((cell) => cell === document.activeElement), { message: "the focus back on the picked cell" });
      const tip = await step("tooltip on the panel's close button", async () => {
        await panel.getByRole("button", { name: "Close panel" }).focus();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Tab");
        const layer = page.locator(".zen-tooltip-layer").filter({ hasText: "Close panel" });
        await layer.waitFor({ state: "visible", timeout: 3000 });
        return layerLook(layer);
      });
      dark(tip, "the tooltip");
      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      return `dark Play: Table popover dark (${look.brightness}/255), Escape kept Play; toast and tooltip in the dark layer; in the modal Side Panel the popover stayed live and picked Shipped`;
    },
  },
];

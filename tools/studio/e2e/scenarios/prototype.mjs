// Prototype rows (Figma's prototype mode on pages made in the Studio, 2026-10-15): connect by dragging a layer's ⊕ onto a
// frame, click an arrow to select its layer, drag an arrow's end to another frame or off to remove it, one target per
// tab of a tab bar, the Flow list, and Play's hotspot hints. Each row makes its own page (builder.mjs newPage).
import { openAssetLibrary, selectAt, sleep, until } from "../lib/studio.mjs";
import { pickOption } from "./inspector.mjs";
import { clickNamed, newPage, pageText, selectStack } from "./builder.mjs";

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
      await page.keyboard.press("p");
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
      await page.keyboard.press("p");
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
      await page.keyboard.press("p");
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
      await page.keyboard.press("p");
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
      await page.keyboard.press("p");
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
      await page.keyboard.press("p");
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
      await page.keyboard.press("p");
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
        await page.keyboard.press("p");
        await playing(page).waitFor({ state: "visible", timeout: 5000 });
        await playing(page).locator(".zen-app-shell__sidebar").waitFor({ state: "visible", timeout: 5000 });
        // The scroll box is whatever Present/Play scrolls in (the window's layer, or a box under its bar): the nearest
        // ancestor of the device that really scrolls.
        const measure = (scroll) => playing(page).evaluate((root, by) => {
          const device = root.querySelector(".studio-player__device");
          let box = device;
          while (box && box !== root.parentElement && !(box.scrollHeight > box.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
          if (!box || box === root.parentElement) return { error: "nothing scrolls the played page" };
          if (by) box.scrollTop = by;
          const side = root.querySelector(".zen-app-shell__sidebar").getBoundingClientRect();
          const view = box.getBoundingClientRect();
          const body = root.querySelector(".zen-app-shell__sidebar .zen-sidebar__body");
          return { top: side.top - view.top, height: side.height, view: box.clientHeight, scrolled: box.scrollTop, bodyScrolls: body.scrollHeight > body.clientHeight + 1, bodyOverflow: getComputedStyle(body).overflowY };
        }, scroll);
        const before = await measure(0);
        if (before.error) throw new Error(before.error);
        const after = await measure(400);
        if (after.scrolled < 100) throw new Error(`the page scrolled only ${after.scrolled}px`);
        if (Math.abs(after.top) > 1) throw new Error(`after a ${after.scrolled}px scroll the Sidebar is ${Math.round(after.top)}px from the top of the scroll box (it should stick at 0)`);
        if (Math.abs(after.height - after.view) > 2) throw new Error(`the Sidebar is ${Math.round(after.height)}px tall in a ${after.view}px scroll box`);
        if (!after.bodyScrolls || !/auto|scroll/.test(after.bodyOverflow)) throw new Error(`the Sidebar's rows do not scroll inside it (overflow-y ${after.bodyOverflow})`);
        await page.keyboard.press("Escape");
        return `scrolled ${after.scrolled}px: Sidebar at ${Math.round(after.top)}px, ${Math.round(after.height)}px in a ${after.view}px box, its rows scroll inside`;
      } finally {
        await page.setViewportSize(size);
      }
    },
  },
];

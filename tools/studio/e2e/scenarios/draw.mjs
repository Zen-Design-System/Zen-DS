// Draw rows (Figma-native parity P1, 2026-10-17; docs/research/studio-figma-native-parity-2026-10-17.md): the Zen Studio
// menu's Document / Studio switch, Figma's shape tools (R, O, L, ⇧L) and Frame inside a frame, the ellipse's arc handles,
// and a free frame's layers moved, nudged and placed by px. Each row seeds its own page: a free Screen (no master layout).
import { sleep, until } from "../lib/studio.mjs";
import { focusScreen, seededPage } from "./builder.mjs";

/** A page with one empty desktop Screen of a fixed size (Figma's frame without auto layout), optionally holding `inner`. */
const freePage = (inner = "") => (title) => `// @zen-page ${JSON.stringify({ format: 1, title })}
import { Board, Screen, proto } from "@zen-ds/react/builder";
${inner ? `import { Shape } from "@zen-ds/react";\n` : ""}
export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title=${JSON.stringify(title)} device="desktop" width={800} height={500}${inner ? `>\n        ${inner}\n      </Screen>` : " />"}
    </Board>
  );
}
`;

const shapes = (text) => [...text.matchAll(/<Shape\b[^>]*\/>/g)].map((match) => match[0]);
const num = (tag, prop) => { const match = new RegExp(`${prop}=\\{(-?[\\d.]+)\\}`).exec(tag); return match ? Number(match[1]) : null; };
const screenBox = async (page) => page.locator('[data-studio-frame="screen:screen-1"] .studio-builder-screen').boundingBox();

/** A pointer drag in small steps, keys held as given (Playwright adds held modifiers to the moves). */
async function drag(page, from, to, { steps = 10, before } = {}) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  if (before) await before();
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * step) / steps, from.y + ((to.y - from.y) * step) / steps);
    await sleep(16);
  }
  await page.mouse.up();
}

async function tool(page, key) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("Escape");
  await page.keyboard.press(key);
  await sleep(150);
}

export const rows = [
  {
    id: "DR-01", feature: "Zen Studio menu › Switch to Studio / Switch to Document (no Document | Studio Segmented)", wp: "P1 menu",
    async run(ctx) {
      const { page } = await ctx.studio();
      if (await page.locator(".studio-space, .studio-space-bar").count()) throw new Error("the Document | Studio Segmented is still on screen");
      const menu = async () => { await page.getByRole("button", { name: "Zen Studio menu" }).first().click(); return page.getByRole("menu", { name: "Zen Studio" }); };
      let open = await menu();
      const first = (await open.getByRole("menuitem").first().innerText()).trim();
      if (!/^Switch to (Studio|Document)$/.test(first)) throw new Error(`the menu starts with "${first}"`);
      await open.getByRole("menuitem", { name: first, exact: true }).click();
      await sleep(400);
      open = await menu();
      const next = (await open.getByRole("menuitem").first().innerText()).trim();
      await page.keyboard.press("Escape");
      if (next === first) throw new Error(`still "${next}" after the switch`);
      return `${first} → the menu now offers ${next}`;
    },
  },
  {
    id: "DR-02", feature: "R + click in a free frame → Rectangle 100 × 100 at the point (px X / Y), selected, tool back to Move", wp: "P1 draw",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, freePage(), /width=\{800\}/);
      await focusScreen(page);
      const box = await screenBox(page);
      await tool(page, "r");
      await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.3);
      await until(async () => shapes(await text()).length === 1, { message: "a Shape in the page" });
      const tag = shapes(await text())[0];
      if (!/type="rectangle"/.test(tag) || num(tag, "width") !== 100 || num(tag, "height") !== 100 || !/position="absolute"/.test(tag) || num(tag, "insetLeft") === null) throw new Error(tag);
      const pressed = await page.locator(".studio-canvas-tools").getByRole("button", { name: "Move", exact: true }).getAttribute("aria-pressed");
      if (pressed !== "true") throw new Error("the tool did not go back to Move");
      await until(async () => (await page.locator("#studio-right h2").first().innerText()).trim() === "Rectangle", { message: "the Rectangle selected" });
      return tag;
    },
  },
  {
    id: "DR-03", feature: "O + ⇧ drag → a circle (equal sides); L + drag → a Line with its rotation, no height; ⇧L → Arrow", wp: "P1 draw",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, freePage(), /width=\{800\}/);
      await focusScreen(page);
      const box = await screenBox(page);
      await tool(page, "o");
      await page.keyboard.down("Shift");
      await drag(page, { x: box.x + 40, y: box.y + 40 }, { x: box.x + 140, y: box.y + 90 });
      await page.keyboard.up("Shift");
      await until(async () => shapes(await text()).length === 1, { message: "the ellipse" });
      const ellipse = shapes(await text())[0];
      if (!/type="ellipse"/.test(ellipse) || num(ellipse, "width") !== num(ellipse, "height")) throw new Error(`⇧ did not keep a circle: ${ellipse}`);
      await tool(page, "l");
      await drag(page, { x: box.x + 200, y: box.y + 200 }, { x: box.x + 300, y: box.y + 140 });
      await until(async () => shapes(await text()).length === 2, { message: "the line" });
      const line = shapes(await text())[1];
      if (!/type="line"/.test(line) || /height=/.test(line) || !num(line, "rotation")) throw new Error(`line: ${line}`);
      await tool(page, "Shift+KeyL");
      await drag(page, { x: box.x + 340, y: box.y + 200 }, { x: box.x + 440, y: box.y + 200 });
      await until(async () => shapes(await text()).length === 3, { message: "the arrow" });
      const arrow = shapes(await text())[2];
      if (!/type="arrow"/.test(arrow)) throw new Error(`arrow: ${arrow}`);
      return `${ellipse} · ${line} · ${arrow}`;
    },
  },
  {
    id: "DR-04", feature: "F inside a Screen → a nested frame (Box with Surface fill) at the point, not a new Screen", wp: "P1 frames",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, freePage(), /width=\{800\}/);
      await focusScreen(page);
      const box = await screenBox(page);
      await tool(page, "f");
      await drag(page, { x: box.x + 60, y: box.y + 60 }, { x: box.x + 220, y: box.y + 160 });
      await until(async () => /<Box [^>]*surface="surface"/.test(await text()), { message: "a nested Box frame" });
      const page_ = await text();
      if ((page_.match(/<Screen\b/g) ?? []).length !== 1) throw new Error("a new Screen was drawn instead");
      const frame = /<Box [^>]*\/>/.exec(page_)[0];
      if (!/position="absolute"/.test(frame) || num(frame, "width") === null) throw new Error(frame);
      return frame;
    },
  },
  {
    id: "DR-05", feature: "Ellipse arc handles: drag Sweep around the rim → arcSweep; drag Ratio out → arcRatio (one ⌘Z each)", wp: "P1 arc",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, freePage('<Shape type="ellipse" position="absolute" insetLeft={100} insetTop={80} width={240} height={240} />'), /type="ellipse"/);
      await focusScreen(page);
      const shape = await page.locator('.zen-shape[data-type="ellipse"]').boundingBox();
      await page.mouse.click(shape.x + shape.width * 0.25, shape.y + shape.height * 0.5);
      await page.locator('.studio-arc__handle[data-kind="sweep"]').waitFor({ state: "visible", timeout: 5000 });
      const sweep = await page.locator('.studio-arc__handle[data-kind="sweep"]').boundingBox();
      const cx = shape.x + shape.width / 2;
      const cy = shape.y + shape.height / 2;
      await page.mouse.move(sweep.x + sweep.width / 2, sweep.y + sweep.height / 2);
      await page.mouse.down();
      for (let degrees = 10; degrees <= 180; degrees += 10) {
        await page.mouse.move(cx + Math.cos((degrees * Math.PI) / 180) * shape.width * 0.4, cy + Math.sin((degrees * Math.PI) / 180) * shape.height * 0.4);
        await sleep(16);
      }
      await page.mouse.up();
      await until(async () => /arcSweep=\{(4[5-9]|5[0-5])(\.\d)?\}/.test(await text()), { message: "arcSweep about 50 %" });
      const ratio = await page.locator('.studio-arc__handle[data-kind="ratio"]').boundingBox();
      await drag(page, { x: ratio.x + ratio.width / 2, y: ratio.y + ratio.height / 2 }, { x: ratio.x + ratio.width / 2 + shape.width * 0.2, y: ratio.y + ratio.height / 2 });
      await until(async () => /arcRatio=\{\d/.test(await text()), { message: "arcRatio written" });
      return shapes(await text())[0];
    },
  },
  {
    id: "DR-06", feature: "A free frame's layer drags by px (not the token ladder) and nudges 1 px / ⇧ 10 px", wp: "P1 move",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, freePage('<Shape type="rectangle" position="absolute" insetLeft={100} insetTop={80} width={160} height={100} />'), /type="rectangle"/);
      await focusScreen(page);
      const shape = await page.locator('.zen-shape[data-type="rectangle"]').boundingBox();
      const zoom = shape.width / 160;
      await page.mouse.click(shape.x + shape.width / 2, shape.y + shape.height / 2);
      await sleep(300);
      await drag(page, { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 }, { x: shape.x + shape.width / 2 + 137 * zoom, y: shape.y + shape.height / 2 + 61 * zoom });
      await until(async () => num(shapes(await text())[0], "insetLeft") !== 100, { message: "the moved X" });
      const moved = shapes(await text())[0];
      const left = num(moved, "insetLeft");
      if (Math.abs(left - 237) > 3 || Math.abs(num(moved, "insetTop") - 141) > 3) throw new Error(`moved to ${left}, ${num(moved, "insetTop")} (expected about 237, 141): ${moved}`);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ArrowRight");
      await until(async () => num(shapes(await text())[0], "insetLeft") === left + 1, { message: "a 1 px nudge" });
      await page.keyboard.press("Shift+ArrowDown");
      const top = num(moved, "insetTop");
      await until(async () => num(shapes(await text())[0], "insetTop") === top + 10, { message: "a 10 px nudge" });
      return shapes(await text())[0];
    },
  },
  {
    id: "DR-07", feature: "Inspector: X takes math (\"+10\"), Rotation turns the shape; Arc fields write Start / Sweep / Ratio", wp: "P1 inspector",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, freePage('<Shape type="ellipse" position="absolute" insetLeft={100} insetTop={80} width={200} height={200} />'), /type="ellipse"/);
      await focusScreen(page);
      const shape = await page.locator('.zen-shape[data-type="ellipse"]').boundingBox();
      await page.mouse.click(shape.x + shape.width * 0.25, shape.y + shape.height * 0.5);
      const right = page.locator("#studio-right");
      await until(async () => (await right.locator("h2").first().innerText()).trim() === "Ellipse", { message: "the Ellipse in the Inspector" });
      const field = async (name, value) => { const input = right.getByRole("spinbutton", { name, exact: true }); await input.click(); await input.fill(value); await input.press("Enter"); };
      await field("X", "+10");
      await until(async () => num(shapes(await text())[0], "insetLeft") === 110, { message: "X + 10" });
      await field("Rotation", "45");
      await until(async () => num(shapes(await text())[0], "rotation") === 45, { message: "rotation 45" });
      await field("Arc sweep", "25");
      await until(async () => num(shapes(await text())[0], "arcSweep") === 25, { message: "arcSweep 25" });
      await field("Arc ratio", "40");
      await until(async () => num(shapes(await text())[0], "arcRatio") === 40, { message: "arcRatio 40" });
      return shapes(await text())[0];
    },
  },
  {
    id: "DR-09", feature: "⇧A on a free frame (Box) → that frame takes auto layout: row read from its layers, gap / padding tokens, layers leave X / Y", wp: "P2 auto layout",
    async run(ctx) {
      const layers = [16, 112, 208].map((x) => `<Shape type="rectangle" position="absolute" insetLeft={${x}} insetTop={16} width={80} height={80} />`).join("\n          ");
      const seeded = (title) => freePage()(title).replace(' width={800} height={500} />', ` width={800} height={500}>\n        <Box position="absolute" insetLeft={40} insetTop={40} width={320} height={120}>\n          ${layers}\n        </Box>\n      </Screen>`).replace('import { Board, Screen, proto } from "@zen-ds/react/builder";', 'import { Board, Screen, proto } from "@zen-ds/react/builder";\nimport { Box, Shape } from "@zen-ds/react";');
      const { page, text } = await seededPage(ctx, seeded, /insetLeft=\{208\}/);
      await focusScreen(page);
      const frame = await page.locator('[data-studio-frame="screen:screen-1"] .zen-box').first().boundingBox();
      // ⌘-click the frame's empty corner: the Box itself, not one of its shapes.
      await page.mouse.click(frame.x + frame.width - 4, frame.y + frame.height - 4);
      await until(async () => (await page.locator("#studio-right h2").first().innerText()).trim() === "Frame", { message: "the Box selected (heading Frame)" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Shift+KeyA");
      await until(async () => /<Stack [^>]*direction="row"/.test(await text()), { message: "the frame as a row Stack" });
      const code = await text();
      const stack = /<Stack [^>]*>/.exec(code)[0];
      if (/<Box\b/.test(code) || shapes(code).some((tag) => /inset/.test(tag)) || !/padding="md"/.test(stack) || /width=/.test(stack)) throw new Error(code);
      return stack;
    },
  },
  {
    id: "DR-10", feature: "⌥⇧A on a Stack → a Box of its size, each layer at the X / Y it showed (a Text in a float Box)", wp: "P2 auto layout",
    async run(ctx) {
      const seeded = (title) => freePage()(title).replace(' width={800} height={500} />', ` width={800} height={500}>\n        <Stack direction="row" padding="md" position="absolute" insetLeft={40} insetTop={40}>\n          <Shape type="ellipse" width={80} height={80} />\n          <Text>Two</Text>\n        </Stack>\n      </Screen>`).replace('import { Board, Screen, proto } from "@zen-ds/react/builder";', 'import { Board, Screen, proto } from "@zen-ds/react/builder";\nimport { Shape, Stack, Text } from "@zen-ds/react";');
      const { page, text } = await seededPage(ctx, seeded, /<Text>Two/);
      await focusScreen(page);
      const stack = await page.locator('[data-studio-frame="screen:screen-1"] .zen-stack').first().boundingBox();
      await page.mouse.click(stack.x + stack.width - 3, stack.y + 3);
      await until(async () => (await page.locator("#studio-right h2").first().innerText()).trim() === "Frame", { message: "the Stack selected (heading Frame)" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Alt+Shift+KeyA");
      await until(async () => !/<Stack\b/.test(await text()), { message: "the Stack as a Box" });
      const code = await text();
      const ellipse = shapes(code)[0];
      if (!/<Box [^>]*width=\{\d+\} height=\{\d+\}/.test(code) || num(ellipse, "insetLeft") !== 16 || num(ellipse, "insetTop") !== 16 || !/<Box position="absolute" insetLeft=\{\d+\} insetTop=\{\d+\}>\s*<Text>Two/.test(code)) throw new Error(code);
      return `${/<Box [^>]*>/.exec(code)[0]} · ${ellipse}`;
    },
  },
  {
    id: "DR-11", feature: "Figma keys on a free frame's layer: ⌥D aligns right, ⌘] brings forward, 5 → opacity 50 %, ⌘A selects every layer", wp: "P3 keys",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, freePage('<Shape type="rectangle" position="absolute" insetLeft={40} insetTop={40} width={100} height={60} />\n        <Shape type="ellipse" position="absolute" insetLeft={200} insetTop={200} width={80} height={80} />'), /type="ellipse"/);
      await focusScreen(page);
      const rect = await page.locator('.zen-shape[data-type="rectangle"]').boundingBox();
      await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await until(async () => (await page.locator("#studio-right h2").first().innerText()).trim() === "Rectangle", { message: "the Rectangle selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Alt+KeyD");
      await until(async () => num(shapes(await text())[0], "insetLeft") === 700, { message: "aligned right (X 700)" });
      await page.keyboard.press("ControlOrMeta+BracketRight");
      await until(async () => /type="ellipse"[\s\S]*type="rectangle"/.test(await text()), { message: "the rectangle brought forward (after the ellipse)" });
      await page.keyboard.press("Digit5");
      await until(async () => /type="rectangle"[^>]*opacity=\{50\}/.test(await text()), { message: "opacity 50" });
      await page.keyboard.press("ControlOrMeta+KeyA");
      await until(async () => (await page.locator(".studio-selection__outline[data-kind='extra']").count()) >= 1, { message: "both layers selected" });
      return shapes(await text()).join(" · ");
    },
  },
  {
    id: "DR-12", feature: "⌥⌘K makes the selected layer a main component in place; ⌘D on it makes an instance; Layers shows both by name", wp: "P4 components",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, freePage('<Shape type="star" position="absolute" insetLeft={60} insetTop={60} width={120} height={120} fill="support-yellow-solid" />'), /type="star"/);
      await focusScreen(page);
      const star = await page.locator('.zen-shape[data-type="star"]').boundingBox();
      await page.mouse.click(star.x + star.width / 2, star.y + star.height / 2);
      await until(async () => (await page.locator("#studio-right h2").first().innerText()).trim() === "Star", { message: "the Star selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+KeyK");
      // Named after the layer, as Figma names a new component ("Star 1": F1's automatic name).
      await until(async () => /<Component id="star(?:-1)?" name="Star(?: 1)?">\s*<Shape type="star"/.test(await text()), { message: "the star as a main component" });
      await until(async () => (await page.locator(".studio-selection__outline[data-kind='selected'][data-component='main']").count()) === 1, { message: "the main's violet outline" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => /<\/Component>\s*<Use of="star(?:-1)?" \/>/.test(await text()), { message: "an instance after the main" });
      await until(async () => (await page.locator("#studio-right").getByRole("button", { name: "Go to main component" }).count()) === 1, { message: "the instance selected (Instance section)" });
      const names = (await page.locator("#studio-left .studio-layers__name").allInnerTexts()).map((name) => name.trim());
      if (names.filter((name) => /^Star(?: 1)?$/.test(name)).length < 2) throw new Error(`Layers: ${names.join(", ")}`);
      return names.join(", ");
    },
  },
  {
    id: "DR-13", feature: "An instance follows its main: an edit of the main shows in it; Detach (⌥⌘B) writes the main's layers in its place", wp: "P4 components",
    async run(ctx) {
      const body = '<Component id="dot" name="Dot">\n          <Shape type="ellipse" width={40} height={40} fill="accent-solid" />\n        </Component>\n        <Box position="absolute" insetLeft={200} insetTop={40}>\n          <Use of="dot" />\n        </Box>';
      const seeded = (title) => freePage()(title).replace(' width={800} height={500} />', ` width={800} height={500}>\n        ${body}\n      </Screen>`).replace('import { Board, Screen, proto } from "@zen-ds/react/builder";', 'import { Board, Component, Screen, Use, proto } from "@zen-ds/react/builder";\nimport { Box, Shape } from "@zen-ds/react";');
      const { page, text } = await seededPage(ctx, seeded, /<Use of="dot"/);
      await focusScreen(page);
      await until(async () => (await page.locator('.zen-shape[data-type="ellipse"]').count()) === 2, { message: "the main and its instance drawn" });
      // The main is the first ellipse (its own place); change its fill in the code through the Inspector's Fill list.
      const main = await page.locator('.zen-shape[data-type="ellipse"]').first().boundingBox();
      await page.mouse.click(main.x + main.width / 2, main.y + main.height / 2);
      await until(async () => (await page.locator("#studio-right h2").first().innerText()).trim() === "Dot", { message: "the main selected" });
      const right = page.locator("#studio-right");
      await right.getByRole("spinbutton", { name: "Opacity", exact: true }).fill("40");
      await right.getByRole("spinbutton", { name: "Opacity", exact: true }).press("Enter");
      await until(async () => /<Shape type="ellipse"[^>]*opacity=\{40\}/.test(await text()), { message: "the main's opacity 40" });
      await until(async () => (await page.locator('.zen-shape[data-type="ellipse"]').evaluateAll((els) => els.map((el) => getComputedStyle(el).opacity))).every((value) => value === "0.4"), { message: "the instance follows (opacity 0.4)" });
      const instance = await page.locator('.zen-shape[data-type="ellipse"]').nth(1).boundingBox();
      await page.mouse.click(instance.x + instance.width / 2, instance.y + instance.height / 2);
      await until(async () => (await right.getByRole("button", { name: "Detach instance" }).count()) === 1, { message: "the instance selected" });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+Alt+KeyB");
      await until(async () => !/<Use\b/.test(await text()) && (((await text()).match(/<Shape type="ellipse"/g) ?? []).length === 2), { message: "the instance detached into its own Shape" });
      return "main edit shown in the instance; detached";
    },
  },
  {
    id: "DR-14", feature: "Assets › Local components lists the page's components; a click adds an instance", wp: "P4 components",
    async run(ctx) {
      const seeded = (title) => freePage()(title).replace(' width={800} height={500} />', ' width={800} height={500}>\n        <Stack padding="lg">\n          <Component id="tag" name="Tag">\n            <Shape type="rectangle" width={60} height={24} radius="full" fill="support-mint-soft" />\n          </Component>\n        </Stack>\n      </Screen>').replace('import { Board, Screen, proto } from "@zen-ds/react/builder";', 'import { Board, Component, Screen, proto } from "@zen-ds/react/builder";\nimport { Shape, Stack } from "@zen-ds/react";');
      const { page, text } = await seededPage(ctx, seeded, /<Component id="tag"/);
      await focusScreen(page);
      const stack = await page.locator('[data-studio-frame="screen:screen-1"] .zen-stack').first().boundingBox();
      await page.mouse.click(stack.x + stack.width - 6, stack.y + stack.height - 6);
      await page.locator("#studio-left").getByRole("tab", { name: "Assets" }).click();
      const local = page.locator("#studio-left").getByRole("button", { name: "Tag, local component" });
      await local.waitFor({ state: "visible", timeout: 5000 });
      await local.click();
      await until(async () => /<Use of="tag" \/>/.test(await text()), { message: "an instance added from Assets" });
      return "Local components › Tag → <Use of=\"tag\" />";
    },
  },
  {
    id: "DR-08", feature: "Layers names a Shape as Figma's tool does (Ellipse 1, Line 1) with its icon", wp: "P1 layers · F1",
    async run(ctx) {
      const { page } = await seededPage(ctx, freePage('<Shape type="ellipse" position="absolute" insetLeft={40} insetTop={40} width={80} height={80} />\n        <Shape type="line" position="absolute" insetLeft={40} insetTop={200} width={120} />'), /type="line"/);
      await focusScreen(page);
      const names = (await page.locator("#studio-left .studio-layers__name").allInnerTexts()).map((name) => name.trim());
      if (!names.some((name) => /^Ellipse \d+$/.test(name)) || !names.some((name) => /^Line \d+$/.test(name))) throw new Error(`Layers: ${names.join(", ")}`);
      return names.join(", ");
    },
  },
  {
    id: "DR-15", feature: "A drawn shape is an object, never a component (user, 2026-10-17): the Inspector calls it a Shape (no Zen component, docs link, component colour, Swap or Reset), its menu has no Swap / Detach instance, Assets offers no Rectangle / Ellipse", wp: "P1 objects",
    async run(ctx) {
      const { page, text } = await seededPage(ctx, freePage(), /width=\{800\}/);
      await focusScreen(page);
      const box = await screenBox(page);
      await tool(page, "r");
      await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.3);
      await until(async () => shapes(await text()).length === 1, { message: "a Shape in the page" });
      const head = page.locator("#studio-right .studio-inspector__head-block").first();
      await until(async () => (await head.locator("h2").innerText()).trim() === "Rectangle", { message: "the Rectangle selected" });
      const meta = (await head.locator(".studio-inspector__meta-row").innerText()).replace(/\s+/g, " ").trim();
      if (meta !== "Shape") throw new Error(`the Inspector says "${meta}"`);
      if (await head.locator(".studio-inspector__kind-icon[data-component]").count()) throw new Error("the header icon has the component colour");
      if (await head.getByRole("button", { name: /Swap instance|Reset all changes/ }).count()) throw new Error("the header offers Swap instance / Reset all overrides");
      const shape = await page.locator('[data-studio-frame="screen:screen-1"] .zen-shape').first().boundingBox();
      await page.mouse.click(shape.x + shape.width / 2, shape.y + shape.height / 2, { button: "right" });
      const menu = page.getByRole("menu").last();
      await menu.waitFor({ state: "visible", timeout: 5000 });
      const items = (await menu.getByRole("menuitem").allInnerTexts()).map((item) => item.replace(/\s+/g, " ").trim());
      await page.keyboard.press("Escape");
      const offered = items.filter((item) => /Swap instance|Detach instance/.test(item));
      if (offered.length) throw new Error(`the menu offers ${offered.join(", ")}`);
      await page.locator("#studio-left").getByRole("tab", { name: "Assets" }).click();
      const search = page.locator("#studio-left").getByRole("searchbox").first();
      await search.fill("rectangle");
      await sleep(400);
      const tiles = await page.locator("#studio-left").getByText(/^(Rectangle|Ellipse)$/).filter({ visible: true }).count();
      await search.fill("");
      if (tiles) throw new Error("Assets lists Rectangle / Ellipse among the components");
      return `Inspector: ${meta} · menu: ${items.length} items, no Swap / Detach · Assets: no shapes`;
    },
  },
];

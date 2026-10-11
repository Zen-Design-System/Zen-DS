// Nested instance rows (docs/research/studio-doc-engine-plan-2026-10-10.md §9, fast path A): on a page made in the
// Studio, a Zen component the owner draws itself (Card's Sub-Action, the icon inside it, one Table row's Badge) is
// selected with ⌘-click and changed in the Inspector like Figma's nested instance. The edit is the owner's `overrides`
// (src/components/_shared/nested.tsx), one ⌘Z.
import { openAssetLibrary, openStudioSpace, selectedSrc, showLeftTab, sleep, statusText, until } from "../lib/studio.mjs";
import { focusScreen, newPage, pageText } from "./builder.mjs";
import { pickOption } from "./inspector.mjs";

const PAGE = `// @zen-page {"format":1,"title":"Nested instances"}
import { Board, Screen, proto } from "@zen/design-system/builder";
import { Card, Stack, Table, Text } from "@zen/design-system";

export const mock = {
  people: [
    { id: "alex", name: "Alex Duong", status: "Active" },
    { id: "binh", name: "Binh Tran", status: "Active" },
    { id: "chi", name: "Chi Le", status: "Away" },
  ],
};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Nested instances" device="desktop">
        <Stack gap="md" padding="xl">
          <Card subAction={{ label: "More" }}>
            <Text textStyle="Heading/3">Team</Text>
          </Card>
          <Table aria-label="People" columns={[{ id: "name", header: "Name", field: "name" }, { id: "status", header: "Status", field: "status", content: "badge" }]} rows={mock.people} />
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** A list (a `.map` of the mock rows) of Badges with a fixed theme (core rebuild M4). */
const LIST_PAGE = `// @zen-page {"format":1,"title":"Row list"}
import { Board, Screen, proto } from "@zen/design-system/builder";
import { Avatar, Badge, Stack } from "@zen/design-system";

export const mock = {
  people: [
    { id: "alex", name: "Alex Duong" },
    { id: "binh", name: "Binh Tran" },
    { id: "chi", name: "Chi Le" },
  ],
};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Row list" device="desktop">
        <Stack gap="md" padding="xl">
          <Stack direction="row" gap="md">
            {mock.people.map((person) => <Badge theme="neutral">{person.name}</Badge>)}
          </Stack>
          <Stack direction="row" gap="md">
            {mock.people.map((person) => <Avatar size="md" src="" alt={person.name} />)}
          </Stack>
        </Stack>
      </Screen>
    </Board>
  );
}
`;

/** A Studio page holding a Card with its Sub-Action and a Table of three people; returns the page and its id. */
async function openNestedPage(ctx, text = PAGE, { badges = 3 } = {}) {
  const { page } = await newPage(ctx, { device: "desktop" });
  // The app's own page store (same module, served by Vite): the page as the Studio would keep it.
  const id = await page.evaluate(async (source) => (await import("/src/platform/studio/builder/store/pageStore.ts")).importPage(source, null), text);
  const url = new URL(page.url());
  url.searchParams.set("page", `local:${id}`);
  await page.goto(url.href, { waitUntil: "domcontentloaded" });
  await until(async () => (await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"] .zen-badge, [data-zen-src^="local:${id}.zen.tsx:"].zen-badge`).count()) >= badges, { timeout: 30000, message: "the page's Badges on the canvas" });
  await focusScreen(page);
  await sleep(300);
  return { page, id };
}

const heading = async (page) => (await page.locator("#studio-right h2").first().innerText({ timeout: 1000 }).catch(() => "")).trim();

/**
 * ⌘-clicks the point (x, y) of what `selector` matches until the Inspector shows a part named `name` (the first click
 * selects the written owner, the next ones go on into its parts, as in Figma).
 */
async function deepSelect(page, selector, name, { dy } = {}) {
  for (let click = 0; click < 4; click++) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) throw new Error(`${selector} has no box on the canvas`);
    await page.keyboard.down("ControlOrMeta");
    try {
      await page.mouse.click(box.x + box.width / 2, dy === undefined ? box.y + box.height / 2 : box.y + dy);
    } finally {
      await page.keyboard.up("ControlOrMeta");
    }
    await sleep(400);
    if (new RegExp(`^${name}(\\s|·|$)`).test(await heading(page))) return;
  }
  await page.screenshot({ path: `.qa/studio-e2e/nested-${name}.png` }).catch(() => undefined);
  throw new Error(`⌘-click did not reach ${name} (Inspector: "${await heading(page)}")`);
}

/** pickOption, with what the Inspector shows when the row is missing. */
async function pick(page, prop, label) {
  try {
    await pickOption(page, prop, label);
  } catch (error) {
    await page.screenshot({ path: `.qa/studio-e2e/nested-${prop}.png` }).catch(() => undefined);
    const shown = (await page.locator("#studio-right").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 600);
    throw new Error(`no ${prop} option "${label}" (${error.message.split("\n")[0]}) · Inspector: ${shown}`);
  }
}

async function undo(page) {
  await page.locator(".studio-viewport").focus();
  await page.keyboard.press("ControlOrMeta+KeyZ");
}

/** Evidence of a row that works: the Studio as it looks after the edit (.qa/studio-e2e/nested-<row>.png). */
async function shot(page, row) {
  await sleep(400);
  await page.screenshot({ path: `.qa/studio-e2e/nested-${row}.png` }).catch(() => undefined);
}

/** The page's document as this browser keeps it (pageStore `doc`, core rebuild M2), or null. */
const pageDoc = (page, id) => page.evaluate((key) => new Promise((resolve) => {
  const request = indexedDB.open("zen-studio-builder");
  request.onsuccess = () => {
    const get = request.result.transaction("pages").objectStore("pages").get(key);
    get.onsuccess = () => resolve(get.result?.doc ?? null);
    get.onerror = () => resolve(null);
  };
  request.onerror = () => resolve(null);
}), id);

/** The ids of a document's elements named `name`, in document order. */
function idsOf(doc, name) {
  const out = [];
  const visit = (node) => {
    if (node.name === name) out.push(node.id);
    for (const value of Object.values(node.props ?? {})) if (value?.kind === "element") visit(value.node);
    for (const child of node.children ?? []) { if (child.kind === "element") visit(child); else if (child.kind === "map") visit(child.node); }
  };
  if (doc?.board) visit(doc.board);
  return out;
}

const subAction = (id) => `[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Card"] .zen-card__sub-action .zen-button`;

/** Where the n-th <tag of the page's text starts ("line:col", as data-zen-src writes it), or null. */
function tagLoc(text, tag, index = 0) {
  const lines = (text ?? "").split("\n");
  let seen = 0;
  for (let line = 0; line < lines.length; line++) {
    const column = lines[line].search(new RegExp(`<${tag}[\\s>/]`));
    if (column >= 0 && seen++ === index) return `${line + 1}:${column}`;
  }
  return null;
}

/** ⌘-clicks the written element `name` at (dx, dy) from its box's top-left until the Inspector names it. */
async function selectWritten(page, id, name, dx, dy) {
  const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).first().boundingBox();
  if (!box) throw new Error(`<${name}> has no box on the canvas`);
  await page.keyboard.down("ControlOrMeta");
  try { await page.mouse.click(box.x + dx, box.y + dy); } finally { await page.keyboard.up("ControlOrMeta"); }
  await until(async () => new RegExp(`^${name}(\\s|$)`).test(await heading(page)), { message: `the ${name} selected` }).catch(async (error) => { throw new Error(`${error.message} (Inspector: "${await heading(page)}")`); });
}

/** Double-clicks (x, y) until the Inspector names `name` (each double-click goes one layer deeper there, as in Figma). */
async function drill(page, x, y, name) {
  for (let click = 0; click < 3; click++) {
    await page.mouse.dblclick(x, y);
    await sleep(400);
    if (new RegExp(`^${name}(\\s|·|$)`).test(await heading(page))) return;
  }
  throw new Error(`double-click did not reach ${name} (Inspector: "${await heading(page)}")`);
}

/** Waits until the selection is the n-th <tag of the page's current text (the same element, at its new place). */
async function stillSelected(page, id, tag, index, after) {
  let want = null;
  await until(async () => {
    want = `local:${id}.zen.tsx:${tagLoc(await pageText(page, id), tag, index)}`;
    return (await selectedSrc(page))[0] === want && new RegExp(`^${tag}(\\s|$)`).test(await heading(page));
  }, { message: `the ${tag} still selected after ${after}` }).catch(async (error) => { throw new Error(`${error.message} (selected ${(await selectedSrc(page)).join(", ") || "nothing"}, want ${want}; Inspector "${await heading(page)}")`); });
  return want.split(":").slice(-2).join(":");
}

/**
 * Core rebuild M8 (plan criterion: the avatar test, 5/5 pages through the design copy): on example page `on`, the first
 * frame that draws an Avatar becomes a page you made (New page from this frame); there an Avatar is ⌘-clicked and a
 * photo from Assets put on it — that Avatar shows it, no other layer changes.
 */
async function avatarThroughDesign(ctx, on) {
  const { page } = await ctx.studio({ page: on });
  const frame = await until(() => page.evaluate(() => {
    const found = [...document.querySelectorAll('[data-studio-frame^="example:"]')].find((element) => element.querySelector(".zen-avatar"));
    return found ? found.getAttribute("data-studio-frame").replace("example:", "") : null;
  }), { timeout: 20000, message: `a frame with an Avatar on ${on}` });
  const label = page.locator(`.studio-frame-label[data-chrome-key="label:example:${frame}"]`);
  await label.waitFor({ state: "attached", timeout: 20000 });
  await label.evaluate((element) => element.click());
  await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click().catch(() => undefined);
  const from = page.url();
  await page.locator("#studio-right").getByRole("button", { name: "New page from this frame" }).click();
  await until(async () => page.url() !== from && /page=local%3A/.test(page.url()), { timeout: 20000, message: "the design copy opened" });
  const id = decodeURIComponent(new URL(page.url()).searchParams.get("page")).replace(/^local:/, "");
  const before = await until(() => pageText(page, id), { message: "the design copy stored" });
  await page.locator('[data-studio-frame^="screen:"] .zen-avatar').first().waitFor({ state: "attached", timeout: 20000 });
  // The Screen in view (⇧2 on its Layers row), then the first Avatar it draws that shows on the canvas.
  await focusScreen(page);
  await sleep(400);
  const index = await until(() => page.evaluate(() => {
    // Shown: some size, its centre on the canvas between the Studio's side panels and inside the window.
    const left = document.getElementById("studio-left")?.getBoundingClientRect().right ?? 0;
    const right = document.getElementById("studio-right")?.getBoundingClientRect().left ?? window.innerWidth;
    const avatars = [...document.querySelectorAll('[data-studio-frame^="screen:"] .zen-avatar')];
    // …and on top there: the first element of a frame under its centre (the Studio's overlays left out) is in it.
    const onTop = (el, x, y) => { const top = document.elementsFromPoint(x, y).find((element) => element.closest("[data-studio-frame]")); return Boolean(top && (el === top || el.contains(top))); };
    const shown = avatars.findIndex((el) => { const r = el.getBoundingClientRect(); const x = r.left + r.width / 2; const y = r.top + r.height / 2; return r.width >= 4 && r.height >= 4 && x > left && x < right && y > 48 && y < window.innerHeight - 8 && onTop(el, x, y); });
    return shown >= 0 ? { shown } : null;
  }), { timeout: 5000, message: "an Avatar in view on the design copy" }).catch(async (error) => {
    await page.screenshot({ path: `.qa/studio-e2e/nested-avatar-${on}.png` }).catch(() => undefined);
    const boxes = await page.evaluate(() => `${[...document.querySelectorAll('[data-studio-frame^="screen:"] .zen-avatar')].slice(0, 3).map((el) => { const r = el.getBoundingClientRect(); return `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}×${Math.round(r.height)}`; }).join(" | ")}; panels ${Math.round(document.getElementById("studio-left")?.getBoundingClientRect().right ?? -1)}…${Math.round(document.getElementById("studio-right")?.getBoundingClientRect().left ?? -1)}; window ${window.innerWidth}×${window.innerHeight}`);
    throw new Error(`${error.message} (avatars at ${boxes})`);
  });
  const avatar = page.locator('[data-studio-frame^="screen:"] .zen-avatar').nth(index.shown);
  // ⌘-click (Figma's deep select) until the Inspector names the Avatar.
  const trail = [];
  for (let click = 0; click < 4 && !/^Avatar(\s|·|$)/.test(await heading(page)); click++) {
    const box = await avatar.boundingBox();
    await page.keyboard.down("ControlOrMeta");
    try { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); } finally { await page.keyboard.up("ControlOrMeta"); }
    await sleep(400);
    trail.push(await heading(page));
  }
  if (!/^Avatar(\s|·|$)/.test(await heading(page))) throw new Error(`⌘-click did not reach the Avatar (${trail.join(" → ")}; the copy writes ${(before.split("\n").find((line) => /<Avatar(Stack)?\b/.test(line)) ?? "no Avatar").trim().slice(0, 220)})`);
  await openAssetLibrary(page, "Photos");
  const assets = page.locator("#studio-left-panel-assets");
  const photo = assets.locator(".studio-assets__photo[data-photo]").first();
  const key = await photo.getAttribute("data-photo");
  const count = (text) => (text.match(new RegExp(`zen-media:${key}\\b`, "g")) ?? []).length;
  await photo.click();
  const after = await until(async () => { const text = (await pageText(page, id)) ?? ""; return count(text) === count(before) + 1 ? text : null; }, { timeout: 10000, message: `zen-media:${key} on the Avatar` }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
  await until(async () => avatar.evaluate((el, file) => [...el.querySelectorAll("img")].some((img) => img.src.includes(file) && img.complete), key), { timeout: 10000, message: "the photo on the Avatar" });
  const was = new Set(before.split("\n"));
  const changed = after.split("\n").filter((line) => !was.has(line)).length;
  return `${on}: frame ${frame} → ${id} · Avatar ⌘-click · Photos › ${key} (${changed} line${changed === 1 ? "" : "s"} changed)`;
}

export const rows = [
  {
    id: "NO-01", feature: "Card › Sub-Action (a nested IconButton): ⌘-click it, Level → Danger writes the Card's overrides; one ⌘Z", wp: "fast path A 2026-10-10",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      // The button's top padding, above its icon: the IconButton itself, not the Icon inside it.
      await deepSelect(page, subAction(id), "IconButton", { dy: 3 });
      await pick(page, "level", "Danger");
      await until(async () => /overrides=\{\{ "Sub-Action": \{ level: "danger" \} \}\}/.test((await pageText(page, id)) ?? ""), { message: 'overrides={{ "Sub-Action": { level: "danger" } }} in the page' });
      await until(async () => (await page.locator(subAction(id)).getAttribute("data-level")) === "danger", { message: "the Sub-Action drawn Danger" });
      await shot(page, "NO-01");
      await undo(page);
      await until(async () => !/overrides=/.test((await pageText(page, id)) ?? ""), { message: "no overrides after ⌘Z" });
      return "IconButton level secondary → danger as a Card override · ⌘Z → none";
    },
  },
  {
    id: "NO-02", feature: "Level 3: the Icon inside Card › Sub-Action takes its own override (Sub-Action/Leading-Icon)", wp: "fast path A 2026-10-10",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      await deepSelect(page, `${subAction(id)} [data-icon]`, "Icon");
      await pick(page, "tone", /^accent-base\b/);
      await until(async () => /"Sub-Action\/Leading-Icon": \{ tone: "accent-base" \}/.test((await pageText(page, id)) ?? ""), { message: '"Sub-Action/Leading-Icon": { tone: "accent-base" } in the page' });
      await shot(page, "NO-02");
      return "Icon tone → accent-base, written as Sub-Action/Leading-Icon";
    },
  },
  {
    id: "NO-03", feature: "Table › row 2 › Badge: Theme → Red changes that row only (Row[binh]/status/Badge); one ⌘Z", wp: "fast path A 2026-10-10",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      const badges = `[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Table"] tbody .zen-badge`;
      await deepSelect(page, `${badges} >> nth=1`, "Badge");
      await pick(page, "theme", "Red");
      await until(async () => /"Row\[binh\]\/status\/Badge": \{ theme: "red" \}/.test((await pageText(page, id)) ?? ""), { message: '"Row[binh]/status/Badge": { theme: "red" } in the page' });
      const tones = async () => page.locator(badges).evaluateAll((els) => els.map((el) => el.getAttribute("data-tone")).join(","));
      await until(async () => (await tones()) === "neutral,red,neutral", { message: "only the second row's Badge red" }).catch(async (error) => { throw new Error(`${error.message} (tones ${await tones()})`); });
      await shot(page, "NO-03");
      await undo(page);
      await until(async () => (await tones()) === "neutral,neutral,neutral", { message: "every Badge neutral after ⌘Z" });
      return "row 2 Badge neutral → red, rows 1 and 3 unchanged · ⌘Z";
    },
  },
  {
    id: "NO-04", feature: "A component's state shows at once on a page you made (user: \"đổi xong phải refresh trang mới thấy\"): Data-Row State → Selected draws the row selected, ⌘Z draws it unselected, no reload", wp: "states 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      const table = `[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Table"]`;
      // Figma's levels: a click selects the outermost layer there (the page's Stack), each double-click on a cell's text
      // goes one level in (Table, then its Data-Row).
      const cell = page.locator(`${table} tbody tr`).nth(1).locator("td").first();
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("Escape");
      for (let attempt = 0; attempt < 5 && !(await heading(page)).startsWith("Data-Row"); attempt += 1) {
        const box = await cell.boundingBox();
        if (!box) throw new Error("no box for row 2");
        if (attempt === 0) await page.mouse.click(box.x + 12, box.y + box.height / 2);
        else await page.mouse.dblclick(box.x + 12, box.y + box.height / 2);
        await sleep(300);
      }
      if (!(await heading(page)).startsWith("Data-Row")) throw new Error(`could not reach row 2's Data-Row (Inspector: "${await heading(page)}")`);
      await pick(page, "row-state", "Selected");
      await until(async () => /defaultSelectedIds=\{\["binh"\]\}/.test((await pageText(page, id)) ?? ""), { message: 'defaultSelectedIds={["binh"]} in the page' });
      const selected = () => page.locator(`${table} tbody tr`).evaluateAll((rows) => rows.map((row) => row.getAttribute("data-selected") === "true"));
      await until(async () => JSON.stringify(await selected()) === "[false,true,false]", { timeout: 1500, message: "row 2 drawn selected without a reload" }).catch(async (error) => { throw new Error(`${error.message} (rows ${JSON.stringify(await selected())})`); });
      await shot(page, "NO-04");
      await undo(page);
      await until(async () => !/defaultSelectedIds/.test((await pageText(page, id)) ?? ""), { message: "no defaultSelectedIds after ⌘Z" });
      await until(async () => !(await selected()).includes(true), { timeout: 1500, message: "no row drawn selected after ⌘Z, without a reload" }).catch(async (error) => { throw new Error(`${error.message} (rows ${JSON.stringify(await selected())})`); });
      return "Data-Row State → Selected draws row 2 selected at once · ⌘Z draws none";
    },
  },
  {
    id: "NO-05", feature: "A page you made is a document with stable ids (core rebuild M2): it gets one as it opens (its text unchanged); ⌘D keeps the Card's id and gives the copy a new one; ⌘Z brings the same id back", wp: "core rebuild M2 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      const text = await pageText(page, id);
      const opened = await until(() => pageDoc(page, id), { message: "the page's document after it opens" });
      if ((await pageText(page, id)) !== text) throw new Error("opening the page rewrote its text");
      const [card] = idsOf(opened, "Card");
      if (!card) throw new Error("no Card in the document");
      // ⌘-click the Card's padding: the innermost written layer there is the Card itself.
      const box = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Card"]`).first().boundingBox();
      await page.keyboard.down("ControlOrMeta");
      try { await page.mouse.click(box.x + 6, box.y + box.height / 2); } finally { await page.keyboard.up("ControlOrMeta"); }
      await until(async () => /^Card(\s|$)/.test(await heading(page)), { message: "the Card selected" }).catch(async (error) => { throw new Error(`${error.message} (Inspector: "${await heading(page)}")`); });
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => ((await pageText(page, id)) ?? "").match(/<Card /g)?.length === 2, { message: "two Cards after ⌘D" });
      const copied = await until(async () => { const doc = await pageDoc(page, id); return idsOf(doc, "Card").length === 2 ? doc : null; }, { message: "two Cards in the document" });
      const [first, copy] = idsOf(copied, "Card");
      if (first !== card || copy === card) throw new Error(`ids after ⌘D: ${first}, ${copy} (the Card was ${card})`);
      await undo(page);
      await until(async () => ((await pageText(page, id)) ?? "").match(/<Card /g)?.length === 1, { message: "one Card after ⌘Z" });
      const back = await until(async () => { const doc = await pageDoc(page, id); return idsOf(doc, "Card").length === 1 ? doc : null; }, { message: "one Card in the document after ⌘Z" });
      if (idsOf(back, "Card")[0] !== card) throw new Error(`after ⌘Z the Card is ${idsOf(back, "Card")[0]}, was ${card}`);
      return `document on open (text unchanged) · ⌘D: ${card} kept, copy ${copy} · ⌘Z: ${card} back`;
    },
  },
  {
    id: "NO-06", feature: "The selection follows its element by id (core rebuild M3, plan criterion 2): the Table stays selected while ⌘Z / ⌘⇧Z take the Card copied above it away and back; the Card moved below the Table (↓) stays selected through ⌘Z and ⌘⇧Z; a tab switch keeps it", wp: "core rebuild M3 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      await until(() => pageDoc(page, id), { message: "the page's document after it opens" });
      const cards = async () => ((await pageText(page, id)) ?? "").match(/<Card /g)?.length ?? 0;
      // A copy of the Card above the Table, then the Table selected (⌘-click its header's corner).
      await selectWritten(page, id, "Card", 6, 30);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ControlOrMeta+KeyD");
      await until(async () => (await cards()) === 2, { message: "two Cards after ⌘D" });
      await selectWritten(page, id, "Table", 4, 4);
      const steps = [`Table ${await stillSelected(page, id, "Table", 0, "selecting it")}`];
      await undo(page);
      await until(async () => (await cards()) === 1, { message: "one Card after ⌘Z" });
      steps.push(`⌘Z ${await stillSelected(page, id, "Table", 0, "⌘Z")}`);
      await page.keyboard.press("ControlOrMeta+Shift+KeyZ");
      await until(async () => (await cards()) === 2, { message: "two Cards after ⌘⇧Z" });
      steps.push(`⌘⇧Z ${await stillSelected(page, id, "Table", 0, "⌘⇧Z")}`);
      await page.locator("#studio-right").getByRole("tab", { name: "Prototype" }).click();
      await sleep(300);
      await page.locator("#studio-right").getByRole("tab", { name: "Design" }).click();
      steps.push(`tabs ${await stillSelected(page, id, "Table", 0, "Prototype and back to Design")}`);
      // Back to one Card; ↓ moves it below the Table (Figma's reorder in auto layout), the selection with it.
      await undo(page);
      await until(async () => (await cards()) === 1, { message: "one Card again" });
      await selectWritten(page, id, "Card", 6, 30);
      await page.locator(".studio-viewport").focus();
      await page.keyboard.press("ArrowDown");
      const below = async () => { const text = (await pageText(page, id)) ?? ""; return text.indexOf("<Card ") > text.indexOf("<Table "); };
      await until(below, { message: "the Card below the Table after ↓" });
      steps.push(`↓ ${await stillSelected(page, id, "Card", 0, "↓")}`);
      await undo(page);
      await until(async () => !(await below()), { message: "the Card above the Table after ⌘Z" });
      steps.push(`⌘Z ${await stillSelected(page, id, "Card", 0, "⌘Z of the move")}`);
      await page.keyboard.press("ControlOrMeta+Shift+KeyZ");
      await until(below, { message: "the Card below the Table after ⌘⇧Z" });
      steps.push(`⌘⇧Z ${await stillSelected(page, id, "Card", 0, "⌘⇧Z of the move")}`);
      return steps.join(" · ");
    },
  },
  {
    id: "NO-08", feature: "Double-click goes into nested instances like Figma (plan criterion 1): Table → Data-Row → Cell → row 3's Badge (level 4), Theme → Red writes Row[chi]/status/Badge; Card → Sub-Action → its Icon (level 3), Tone writes Sub-Action/Leading-Icon; one ⌘Z each", wp: "core rebuild M3 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      const steps = [];
      await selectWritten(page, id, "Table", 4, 4);
      const badge = await page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Table"] tbody .zen-badge`).nth(2).boundingBox();
      const bx = badge.x + badge.width / 2;
      const by = badge.y + badge.height / 2;
      for (const name of ["Data-Row", "Cell", "Badge"]) await drill(page, bx, by, name);
      steps.push("Table → Data-Row → Cell → Badge");
      await pick(page, "theme", "Red");
      await until(async () => /"Row\[chi\]\/status\/Badge": \{ theme: "red" \}/.test((await pageText(page, id)) ?? ""), { message: '"Row[chi]/status/Badge": { theme: "red" } in the page' });
      await undo(page);
      await until(async () => !/overrides=/.test((await pageText(page, id)) ?? ""), { message: "no overrides after ⌘Z" });
      steps.push("Red, ⌘Z");
      await page.locator(".studio-viewport").focus();
      for (let i = 0; i < 4; i++) await page.keyboard.press("Escape");
      await selectWritten(page, id, "Card", 6, 30);
      const icon = await page.locator(`${subAction(id)} [data-icon]`).first().boundingBox();
      const ix = icon.x + icon.width / 2;
      const iy = icon.y + icon.height / 2;
      for (const name of ["IconButton", "Icon"]) await drill(page, ix, iy, name);
      steps.push("Card → IconButton → Icon");
      await pick(page, "tone", /^accent-base\b/);
      await until(async () => /"Sub-Action\/Leading-Icon": \{ tone: "accent-base" \}/.test((await pageText(page, id)) ?? ""), { message: "the Icon's tone in the page" });
      await undo(page);
      await until(async () => !/overrides=/.test((await pageText(page, id)) ?? ""), { message: "no overrides after the second ⌘Z" });
      steps.push("accent-base, ⌘Z");
      await shot(page, "NO-08");
      return steps.join(" · ");
    },
  },
  {
    id: "NO-09", feature: "Layers lists a nested instance under its owner's Parts with its Figma layer name (IconButton · Sub-Action); its row selects it and the Inspector edits it as the Card's override; one ⌘Z", wp: "core rebuild M3 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      await selectWritten(page, id, "Card", 6, 30);
      await page.locator("#studio-left").getByRole("tab", { name: "Layers" }).click().catch(() => undefined);
      const tree = page.locator(".studio-layers__tree");
      const open = async (row, what) => {
        await until(() => row.count(), { message: what });
        if ((await row.first().getAttribute("aria-expanded")) === "false") await row.first().locator(".studio-layers__chevron").click();
      };
      await open(tree.locator('[role="treeitem"][aria-selected="true"]'), "the Card's Layers row");
      const card = await tree.locator('[role="treeitem"][aria-selected="true"]').first().getAttribute("data-layer-id");
      await open(tree.locator(`[role="treeitem"][data-layer-id="${card}/parts"]`), "the Card's Parts row");
      // The Card's inner frames open one level at a time (as a component's frames in Figma's Layers) until the IconButton shows.
      const row = tree.locator('[role="treeitem"][data-kind="part"]', { hasText: "IconButton" }).first();
      for (let round = 0; round < 6 && !(await row.count()); round++) {
        const closed = tree.locator(`[role="treeitem"][data-layer-id^="${card}/part:"][aria-expanded="false"]`);
        for (let index = (await closed.count()) - 1; index >= 0; index--) await closed.nth(index).locator(".studio-layers__chevron").click();
        await sleep(200);
      }
      await until(() => row.count(), { message: "an IconButton row under Parts" });
      const caption = (await row.locator(".studio-layers__hint").innerText().catch(() => "")).trim();
      if (caption !== "Sub-Action") throw new Error(`the IconButton row's caption is "${caption}", not its layer name Sub-Action`);
      await row.scrollIntoViewIfNeeded();
      await row.click();
      await until(async () => /^IconButton(\s|·|$)/.test(await heading(page)), { message: "the IconButton selected from Layers" }).catch(async (error) => { throw new Error(`${error.message} (Inspector "${await heading(page)}")`); });
      await pick(page, "level", "Danger");
      await until(async () => /"Sub-Action": \{ level: "danger" \}/.test((await pageText(page, id)) ?? ""), { message: 'the "Sub-Action" override in the page' });
      await undo(page);
      await until(async () => !/overrides=/.test((await pageText(page, id)) ?? ""), { message: "no overrides after ⌘Z" });
      await shot(page, "NO-09");
      return "Card › Parts › IconButton · Sub-Action → Level Danger as the Card's override · ⌘Z";
    },
  },
  {
    id: "NO-10", feature: "One row of a list edits on its own (core rebuild M4, plan criterion 3): Row 2 › Theme → Red makes that Badge red only (the rows get a theme field, the Badge reads it); All 3 rows › Green paints every one; ⌘Z back to the row's own", wp: "core rebuild M4 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx, LIST_PAGE);
      const badges = page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="Badge"]`);
      const tones = async () => badges.evaluateAll((els) => els.map((el) => el.getAttribute("data-tone")).join(","));
      const box = await badges.nth(1).boundingBox();
      await page.keyboard.down("ControlOrMeta");
      try { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); } finally { await page.keyboard.up("ControlOrMeta"); }
      await until(async () => /^Badge(\s|$)/.test(await heading(page)), { message: "the second Badge selected" }).catch(async (error) => { throw new Error(`${error.message} (Inspector "${await heading(page)}")`); });
      const scope = page.locator("#studio-right").getByRole("group", { name: "Changes go to" });
      await until(() => scope.count(), { message: 'the "Changes go to" choice (Row 2 · All 3 rows)' });
      await pick(page, "theme", "Red");
      await until(async () => { const text = (await pageText(page, id)) ?? ""; return /<Badge theme=\{person\.theme\}>/.test(text) && /id: "binh", name: "Binh Tran", theme: "red"/.test(text) && /id: "alex", name: "Alex Duong", theme: "neutral"/.test(text); }, { message: "binh's theme red in the data, the Badge reading person.theme" }).catch(async (error) => { throw new Error(`${error.message} (${((await pageText(page, id)) ?? "").match(/<Badge[^>]*>/)?.[0]}; status: ${await statusText(page)})`); });
      await until(async () => (await tones()) === "neutral,red,neutral", { message: "only the second Badge red" }).catch(async (error) => { throw new Error(`${error.message} (tones ${await tones()})`); });
      const steps = ["Row 2 › Red: neutral,red,neutral"];
      await scope.getByRole("button", { name: /^All 3 rows/ }).click();
      await pick(page, "theme", "Green");
      await until(async () => /<Badge theme="green">/.test((await pageText(page, id)) ?? ""), { message: 'theme="green" on the Badge for all rows' });
      await until(async () => (await tones()) === "green,green,green", { message: "every Badge green" }).catch(async (error) => { throw new Error(`${error.message} (tones ${await tones()})`); });
      steps.push("All 3 rows › Green: green,green,green");
      await undo(page);
      await until(async () => (await tones()) === "neutral,red,neutral", { message: "⌘Z: the row's own red again" }).catch(async (error) => { throw new Error(`${error.message} (tones ${await tones()})`); });
      steps.push("⌘Z → neutral,red,neutral");
      await shot(page, "NO-10");
      return steps.join(" · ");
    },
  },
  {
    id: "NO-11", feature: "A photo for one row of a list (core rebuild M4, Figma's replace image on one instance): the second Avatar selected, Assets › Photos › a photo shows on that Avatar only (the rows get a src field); one ⌘Z", wp: "core rebuild M4 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx, LIST_PAGE);
      // An Avatar carries no data-zen-src of its own (the Studio finds it through React): found by its class.
      const avatars = page.locator('[data-studio-frame="screen:screen-1"] .zen-avatar');
      await until(async () => (await avatars.count()) === 3, { message: "three Avatars on the canvas" });
      const photos = async () => avatars.evaluateAll((els) => els.map((el) => (el.querySelector("img") ? "photo" : "none")).join(","));
      const box = await avatars.nth(1).boundingBox();
      await page.keyboard.down("ControlOrMeta");
      try { await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); } finally { await page.keyboard.up("ControlOrMeta"); }
      await until(async () => /^Avatar(\s|$)/.test(await heading(page)), { message: "the second Avatar selected" }).catch(async (error) => { throw new Error(`${error.message} (Inspector "${await heading(page)}")`); });
      await openAssetLibrary(page, "Photos");
      const assets = page.locator("#studio-left-panel-assets");
      await assets.getByLabel("Search photos").fill("coffee");
      await sleep(200);
      await assets.locator(".studio-assets__photo[data-photo]").first().click();
      await until(async () => { const text = (await pageText(page, id)) ?? ""; return /<Avatar size="md" src=\{person\.src\}/.test(text) && /id: "binh", name: "Binh Tran", src: "zen-media:[^"]+"/.test(text) && /id: "alex", name: "Alex Duong", src: ""/.test(text); }, { message: "binh's photo in the data, the Avatar reading person.src" }).catch(async (error) => { throw new Error(`${error.message} (${((await pageText(page, id)) ?? "").match(/<Avatar[^>]*>/)?.[0]}; status: ${await statusText(page)})`); });
      await until(async () => (await photos()) === "none,photo,none", { message: "the photo on the second Avatar only" }).catch(async (error) => { throw new Error(`${error.message} (${await photos()})`); });
      await undo(page);
      await until(async () => (await photos()) === "none,none,none", { message: "⌘Z: no photo" }).catch(async (error) => { throw new Error(`${error.message} (${await photos()})`); });
      await shot(page, "NO-11");
      return "row 2 Avatar ← photo (none,photo,none) · ⌘Z → none,none,none";
    },
  },
  {
    id: "NO-12", feature: "Drag a card past another on a page you made (the dashboard walk's unverified step): the Card dragged below the Table lands there and stays selected (by id); one ⌘Z puts it back, still selected", wp: "core rebuild M4 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      await selectWritten(page, id, "Card", 6, 30);
      const box = (name) => page.locator(`[data-zen-src^="local:${id}.zen.tsx:"][data-zen-name="${name}"]`).first().boundingBox();
      const card = await box("Card");
      const table = await box("Table");
      // Pressed in the selected Card (its centre, as a drag in Figma), moved in steps past the Table's bottom edge, dropped.
      const from = { x: card.x + card.width / 2, y: card.y + card.height / 2 };
      const to = { x: table.x + table.width / 2, y: table.y + table.height + 4 };
      await page.mouse.move(from.x, from.y);
      await page.mouse.down();
      for (let step = 1; step <= 14; step += 1) await page.mouse.move(from.x + ((to.x - from.x) * step) / 14, from.y + ((to.y - from.y) * step) / 14);
      await sleep(150);
      await page.mouse.up();
      const below = async () => { const text = (await pageText(page, id)) ?? ""; return text.indexOf("<Card ") > text.indexOf("<Table "); };
      await until(below, { message: "the Card below the Table after the drag" }).catch(async (error) => { throw new Error(`${error.message} (status: ${await statusText(page)})`); });
      const steps = [`dragged · ${await stillSelected(page, id, "Card", 0, "the drag")}`];
      await undo(page);
      await until(async () => !(await below()), { message: "the Card above the Table after ⌘Z" });
      steps.push(`⌘Z · ${await stillSelected(page, id, "Card", 0, "⌘Z of the drag")}`);
      return steps.join(" · ");
    },
  },
  {
    id: "NO-13", feature: "A Figma frame pulled in (core rebuild M6, figma-pull.mjs on the selftest's frame JSON) opens as a page you made: the title, the Card, the Badges (one red, from Figma's Theme) and the Button render", wp: "core rebuild M6 2026-10-11",
    async run(ctx) {
      const { pageFromFigma, repoMapping } = await import("../../figma-pull.mjs");
      const fs = await import("node:fs");
      const source = fs.readFileSync(new URL("../../figma-pull.selftest.mjs", import.meta.url), "utf8");
      const frame = JSON.parse(JSON.stringify(eval(`(${/const FRAME = (\{[\s\S]*?\n\});/.exec(source)[1]})`)));
      const { text } = pageFromFigma(frame, { mapping: await repoMapping() });
      const { page, id } = await openNestedPage(ctx, text, { badges: 2 });
      const scope = `[data-zen-src^="local:${id}.zen.tsx:"]`;
      const badges = page.locator(`${scope}[data-zen-name="Badge"]`);
      await until(async () => (await badges.count()) === 2, { message: "two Badges from Figma" });
      const tones = await badges.evaluateAll((els) => els.map((el) => el.getAttribute("data-tone")).join(","));
      if (tones !== "neutral,red") throw new Error(`Badge tones ${tones}`);
      for (const name of ["Card", "Button", "Text"]) if (!(await page.locator(`${scope}[data-zen-name="${name}"]`).count())) throw new Error(`no ${name} on the canvas`);
      await shot(page, "NO-13");
      return `Figma frame → page: Text, Card (border), Badges ${tones}, Button`;
    },
  },
  {
    id: "NO-19", feature: "The live Figma read (core rebuild M6: Overviews 14243:64878 read through use_figma, fixtures/figma-overviews.json) opens as a page: the Sidebar's sections, selected item and footer, the Breadcrumbs, the Segmented and the five Cards two to a row in Figma's order", wp: "core rebuild M6 2026-10-11",
    async run(ctx) {
      const { pageFromFigma, repoMapping } = await import("../../figma-pull.mjs");
      const fs = await import("node:fs");
      const live = JSON.parse(fs.readFileSync(new URL("../../fixtures/figma-overviews.json", import.meta.url), "utf8"));
      const { text } = pageFromFigma(live.frame, { mapping: await repoMapping() });
      const { page, id } = await openNestedPage(ctx, text, { badges: 0 });
      const scope = `[data-zen-src^="local:${id}.zen.tsx:"]`;
      const cards = page.locator(`${scope}[data-zen-name="Card"]`);
      await until(async () => (await cards.count()) === 5, { timeout: 30000, message: "five Cards from Figma" });
      const placed = await cards.evaluateAll((els) => els.map((el) => { const box = el.getBoundingClientRect(); return { x: Math.round(box.x), y: Math.round(box.y), title: el.innerText.trim().split("\n")[0] }; }));
      const order = placed.map((card) => card.title).join(", ");
      if (order !== "Foundation, Components, Patterns, Resources & Tools, Development") throw new Error(`Cards in order ${order}`);
      const columns = new Set(placed.map((card) => card.x)).size;
      const rows = new Set(placed.map((card) => card.y)).size;
      if (columns !== 2 || rows !== 3) throw new Error(`Cards in ${columns} columns, ${rows} rows`);
      // Sidebar, Breadcrumbs and Segmented keep data-zen-* off their DOM (the picker finds them by fiber): found by class
      // inside the page's Screen.
      const screen = page.locator(`${scope}[data-zen-name="Screen"]`).first();
      const sidebar = screen.locator(".zen-sidebar").first();
      if (!(await sidebar.count())) throw new Error("no Sidebar on the canvas");
      const sidebarText = await sidebar.innerText();
      for (const label of ["Installation", "Foundation", "Typography", "Components", "Avatar", "Download Figma", "Feedback"]) if (!sidebarText.includes(label)) throw new Error(`no "${label}" in the Sidebar`);
      const current = (await sidebar.locator('[aria-current="page"]').first().innerText().catch(() => "")).trim();
      if (current !== "Overviews") throw new Error(`the Sidebar's current item is "${current}"`);
      // Figma's Sidebar fills the frame's height: the page's top row stretches it (a row Stack would centre it).
      const heights = await sidebar.evaluate((el) => [el.getBoundingClientRect().height, el.parentElement.parentElement.getBoundingClientRect().height].map(Math.round));
      if (Math.abs(heights[0] - heights[1]) > 2) throw new Error(`the Sidebar is ${heights[0]} px tall in a ${heights[1]} px row`);
      for (const part of [".zen-breadcrumbs", ".zen-segmented"]) if (!(await screen.locator(part).count())) throw new Error(`no ${part} on the canvas`);
      if (!(await page.locator(`${scope}[data-zen-name="Icon"]`).count())) throw new Error("no Icon (the icon-zen instance) on the canvas");
      await shot(page, "NO-19");
      return `Figma Overviews → page: Sidebar (current ${current}), Breadcrumbs, Segmented, Cards ${columns}×${rows}: ${order}`;
    },
  },
  {
    id: "NO-20", feature: "Pull a Figma frame again (core rebuild M6): the pulled page imported and edited in the Studio (the Components card re-themed, the tagline re-aligned), then a later pull imported: Update from Figma lists what Figma changed with the Studio's conflict unticked, Apply lands it in one edit keeping the Studio's edits, one ⌘Z undoes it", wp: "core rebuild M6 2026-10-11",
    timeout: 45000,
    async run(ctx) {
      const { pageFromFigma, repoMapping } = await import("../../figma-pull.mjs");
      const { printPage } = await import("../../doc.mjs");
      const fs = await import("node:fs");
      const live = JSON.parse(fs.readFileSync(new URL("../../fixtures/figma-overviews.json", import.meta.url), "utf8"));
      const mapping = await repoMapping();
      // A frame of its own per run (the rows share a browser): the live read under another node id.
      const stamp = Date.now().toString(36);
      const frame = { ...JSON.parse(JSON.stringify(live.frame)), id: `9${Date.now() % 1e6}:1` };
      const pulled = (read) => printPage(pageFromFigma(read, { mapping }).doc, { ids: true });
      const find = (read, id) => { const stack = [read]; while (stack.length) { const node = stack.pop(); if (node.id === id) return node; stack.push(...(node.children ?? []), ...(node.slots ?? [])); } throw new Error(`no layer ${id}`); };
      const { page } = await newPage(ctx, { device: "desktop" });
      await showLeftTab(page, "pages");
      await openStudioSpace(page);
      const id = `figma-pull-${stamp}`;
      const importFile = (text, name) => page.locator('[data-e2e="import-pages"]').setInputFiles({ name, mimeType: "text/plain", buffer: Buffer.from(text, "utf8") });
      await importFile(pulled(frame), `${id}.zen.tsx`);
      await until(async () => decodeURIComponent(page.url()).includes(`page=local:${id}`), { timeout: 15000, message: "the pulled page opened" });
      const first = (await pageText(page, id)) ?? "";
      if (/data-zen-id/.test(first) || !/"figma":\{"file":"9nZv4uW2LT21yuHabMTCh1"/.test(first)) throw new Error("the pulled page's text carries ids or no Figma source");
      // The Studio's edits, as the Inspector sends them.
      const scope = `[data-zen-src^="local:${id}.zen.tsx:"]`;
      await until(async () => (await page.locator(`${scope}[data-zen-name="Card"]`).count()) === 5, { timeout: 30000, message: "five Cards" });
      const srcOf = async (name, text) => page.locator(`${scope}[data-zen-name="${name}"]`).filter({ hasText: text }).first().getAttribute("data-zen-src");
      const edit = (src, name, prop, value) => page.evaluate(async ({ src: at, name: tag, prop: key, value: next }) => {
        const api = await import("/src/platform/studio/api.ts");
        const parsed = api.parseSrc(at);
        const response = await api.applyEdit({ file: parsed.file, loc: parsed.loc, name: tag, ops: [{ op: "setProp", name: key, value: { kind: "string", value: next } }] }, `${key} → ${next}`);
        return response.ok ? null : response.error;
      }, { src, name, prop, value });
      for (const [name, text, prop, value] of [["Card", "Components", "theme", "flat"], ["Text", "comprehensive set", "align", "start"]]) {
        const problem = await edit(await srcOf(name, text), name, prop, value);
        if (problem) throw new Error(`Studio edit ${prop}: ${problem}`);
      }
      await until(async () => { const text = (await pageText(page, id)) ?? ""; return /theme="flat"/.test(text) && /align="start"/.test(text); }, { message: "the Studio's edits written" });
      const edited = (await pageText(page, id)) ?? "";
      // The later pull: a heading renamed, the same card re-themed (a conflict), the Button resized, Development gone,
      // Templates added, Foundation and Components swapped.
      const later = JSON.parse(JSON.stringify(frame));
      find(later, "I14243:64889;7063:62204;14240:50460").characters = "Foundations";
      find(later, "14243:64888").props.Theme = "Border";
      find(later, "14243:64886").props.Size = "Small";
      const grid = find(later, "14243:64887");
      grid.children = grid.children.filter((card) => card.id !== "14243:64892");
      const templates = JSON.parse(JSON.stringify(find(later, "14243:64891")).replaceAll("14243:64891", "14243:69999").replace('"characters":"Patterns"', '"characters":"Templates"').replace('"text":"Patterns"', '"text":"Templates"'));
      templates.cell = { col: 3, row: 2, span: 2, rowSpan: 1 };
      grid.children.push(templates);
      const [foundation, components] = [find(later, "14243:64889"), find(later, "14243:64888")];
      [foundation.cell, components.cell] = [components.cell, foundation.cell];
      await importFile(pulled(later), `${id}-later.zen.tsx`);
      const dialog = page.getByRole("dialog", { name: "Update from Figma" });
      await dialog.waitFor({ state: "visible", timeout: 15000 });
      await until(async () => (await dialog.locator("[data-change]").count()) === 6, { timeout: 15000, message: "six changes listed" }).catch(async (error) => { throw new Error(`${error.message} (${(await dialog.innerText()).replace(/\s+/g, " ").slice(0, 400)})`); });
      const ticked = await dialog.locator("[data-change]").evaluateAll((items) => items.map((item) => `${item.getAttribute("data-change")}=${item.querySelector("input")?.checked}`));
      const conflict = ticked.find((entry) => entry.startsWith("prop:f14243-64888:theme"));
      if (conflict !== "prop:f14243-64888:theme=false" || ticked.filter((entry) => entry.endsWith("=true")).length !== 5) throw new Error(`ticked: ${ticked.join(", ")}`);
      if (!/Changed in the Studio too/.test(await dialog.innerText())) throw new Error("the conflict is not marked");
      await shot(page, "NO-20-dialog");
      await dialog.getByRole("button", { name: "Apply 5 changes" }).click();
      await dialog.waitFor({ state: "hidden", timeout: 15000 });
      const after = async () => (await pageText(page, id)) ?? "";
      await until(async () => /Foundations/.test(await after()), { timeout: 15000, message: "the update written" });
      const text = await after();
      const landed = { renamed: /Foundations/.test(text), added: /Templates/.test(text), removed: !/Development/.test(text), resized: /<Button size="small"/.test(text), keptTheme: /theme="flat"/.test(text), keptAlign: /align="start"/.test(text), noIds: !/data-zen-id/.test(text) };
      if (Object.values(landed).some((value) => !value)) throw new Error(`after Apply: ${JSON.stringify(landed)}`);
      const cards = await page.locator(`${scope}[data-zen-name="Card"]`).evaluateAll((els) => els.map((el) => el.innerText.trim().split("\n")[0]).join(", "));
      if (cards !== "Components, Foundations, Patterns, Resources & Tools, Templates") throw new Error(`cards ${cards}`);
      await shot(page, "NO-20");
      await undo(page);
      await until(async () => (await after()) === edited, { timeout: 15000, message: "one ⌘Z: the page as the Studio left it" }).catch(async (error) => { throw new Error(`${error.message} (Development: ${/Development/.test(await after())}, Foundations: ${/Foundations/.test(await after())})`); });
      return `Update from Figma: 6 changes (theme conflict unticked) → 5 applied in one edit, Studio's theme and align kept, cards ${cards}; ⌘Z back`;
    },
  },
  ...["avatar", "card", "app-shell", "table", "sidebar"].map((on, index) => ({
    id: `NO-${14 + index}`, feature: `The avatar test through the design copy (core rebuild M8): ${on} › New page from this frame, ⌘-click an Avatar, Assets › Photos puts the photo on that Avatar`, wp: "core rebuild M8 2026-10-11",
    // A frame of an example page made into a page and rendered, then the edit: more than a row's usual 20 s.
    timeout: 45000,
    run: (ctx) => avatarThroughDesign(ctx, on),
  })),
  {
    id: "NO-07", feature: "Reset all overrides at level 3 (plan criterion 4): the Icon inside Card › Sub-Action takes a tone, stays selected, Reset all overrides takes it away, ⌘Z brings it back", wp: "core rebuild M3 2026-10-11",
    async run(ctx) {
      const { page, id } = await openNestedPage(ctx);
      await deepSelect(page, `${subAction(id)} [data-icon]`, "Icon");
      await pick(page, "tone", /^accent-base\b/);
      const written = /"Sub-Action\/Leading-Icon": \{ tone: "accent-base" \}/;
      await until(async () => written.test((await pageText(page, id)) ?? ""), { message: "the Icon's tone in the page" });
      await until(async () => /^Icon(\s|·|$)/.test(await heading(page)), { message: "the Icon still selected after the edit" }).catch(async (error) => { throw new Error(`${error.message} (Inspector "${await heading(page)}")`); });
      await page.locator("#studio-right").getByRole("button", { name: "Reset all overrides" }).first().click();
      await until(async () => !/overrides=/.test((await pageText(page, id)) ?? ""), { message: "no overrides after Reset all" });
      await until(async () => /^Icon(\s|·|$)/.test(await heading(page)), { message: "the Icon still selected after Reset all" });
      await undo(page);
      await until(async () => written.test((await pageText(page, id)) ?? ""), { message: "the tone back after ⌘Z" });
      await shot(page, "NO-07");
      return "Icon tone → accent-base (selected after the edit) · Reset all → none (still selected) · ⌘Z → back";
    },
  },
];

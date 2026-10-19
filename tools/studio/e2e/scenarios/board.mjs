// Component page board rows (user 2026-10-18: "Sắp xếp layout của các trang component trên canvas lại cho gọn gàng và
// chuyên nghiệp hơn. Mỗi lần bổ sung để kiểm tra lại layout"): every component page of the Studio, opened once per run,
// is measured in world px. BL-01 checks the stack (Title → Component → Examples → Docs, StudioBoard.tsx), BL-02 that
// every Main component variant draws (MainComponentFrame.tsx). A page or an example added later is checked the same way.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sleep } from "../lib/studio.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../..");
/** The component pages, as the Studio's Pages panel lists them (PlatformApp.tsx componentNavigation). */
const app = fs.readFileSync(path.join(root, "src/platform/PlatformApp.tsx"), "utf8");
const nav = app.slice(app.indexOf("export const componentNavigation"), app.indexOf("];", app.indexOf("export const componentNavigation")));
const PAGES = [...nav.matchAll(/\bid: "([\w-]+)"/g)].map((match) => match[1]);
const GAP = 64;
const SECTION_GAP = 128;
const DOCS_WIDTH = 880;
const near = (a, b) => Math.abs(a - b) <= 1;
const api = JSON.parse(fs.readFileSync(path.join(root, "src/platform/api.generated.json"), "utf8"));

/** One page's board in world px (the board's own coordinates, zoom divided out). */
function measure() {
  const board = document.querySelector(".studio-board");
  if (!board) return null;
  const origin = board.getBoundingClientRect();
  const scale = origin.width / board.offsetWidth || 1;
  const box = (element) => {
    const rect = element.getBoundingClientRect();
    return { x: (rect.left - origin.left) / scale, y: (rect.top - origin.top) / scale, w: rect.width / scale, h: rect.height / scale };
  };
  const children = [...board.children].map((element) => ({ kind: element.matches("header") ? "title" : element.getAttribute("data-studio-section") ?? element.getAttribute("data-studio-frame") ?? element.tagName, ...box(element) }));
  const sections = [...board.querySelectorAll(":scope > .studio-section")].map((section) => ({
    id: section.getAttribute("data-studio-section"),
    ...box(section),
    frames: [...section.querySelectorAll(":scope > .studio-section__frames > [data-studio-frame]")].map((frame) => ({ id: frame.getAttribute("data-studio-frame"), ...box(frame) })),
  }));
  const cells = [...board.querySelectorAll('[data-studio-frame="main-component"] [data-mc-cell]')].map((cell) => {
    // A modal overlay's cell holds the overlay's <template> anchor first, then the overlay drawn in it.
    const child = cell.querySelector(".studio-mc__stage > :not(template)");
    const rect = child?.getBoundingClientRect();
    return { component: cell.getAttribute("data-mc-component"), set: cell.getAttribute("data-mc-set"), name: cell.getAttribute("data-mc-name"), w: rect ? rect.width / scale : 0, h: rect ? rect.height / scale : 0, empty: !child };
  });
  // The sections' name tabs (screen-space chrome): a tab with its label alone pads both ends alike (user 2026-10-18:
  // "Bug UI của section badge", the counter's 4px end padding kept without the counter).
  const tabs = [...document.querySelectorAll(".studio-section-tab")].map((tab) => {
    const style = getComputedStyle(tab);
    return { label: tab.textContent.trim(), alone: tab.children.length === 1, start: parseFloat(style.paddingInlineStart), end: parseFloat(style.paddingInlineEnd) };
  });
  return { children, sections, cells, tabs };
}

/** The layout rules of one measured board; returns the broken ones. */
function layoutProblems(page, board) {
  const out = [];
  const order = ["title", "component", "examples", "docs"];
  const kinds = board.children.map((child) => child.kind);
  const known = kinds.filter((kind) => order.includes(kind));
  if (known.length !== kinds.length) out.push(`${page}: unexpected board children ${kinds.join(", ")}`);
  if (known.join() !== order.filter((kind) => known.includes(kind)).join()) out.push(`${page}: order ${known.join(" → ")}`);
  if (!known.includes("component")) out.push(`${page}: no Component section`);
  for (let index = 1; index < board.children.length; index++) {
    const above = board.children[index - 1];
    const here = board.children[index];
    if (!near(here.y, above.y + above.h + SECTION_GAP)) out.push(`${page}: ${here.kind} starts ${Math.round(here.y - above.y - above.h)}px under ${above.kind} (128)`);
  }
  const [first] = board.sections;
  for (const section of board.sections) {
    if (!near(section.x, 0)) out.push(`${page}: ${section.id} section at x ${Math.round(section.x)} (0)`);
    if (first && !near(section.w, first.w)) out.push(`${page}: ${section.id} section ${Math.round(section.w)} wide, ${first.id} ${Math.round(first.w)}`);
    if (!section.frames.length) out.push(`${page}: ${section.id} section is empty`);
    for (const frame of section.frames) {
      const inside = frame.x >= section.x + GAP - 1 && frame.y >= section.y + GAP - 1 && frame.x + frame.w <= section.x + section.w - GAP + 1 && frame.y + frame.h <= section.y + section.h - GAP + 1;
      if (!inside) out.push(`${page}: ${frame.id} sticks out of the ${section.id} section`);
      if (frame.w < 2 || frame.h < 2) out.push(`${page}: ${frame.id} is ${Math.round(frame.w)}×${Math.round(frame.h)}`);
    }
    for (let a = 0; a < section.frames.length; a++) {
      for (let b = 0; b < a; b++) {
        const one = section.frames[a];
        const two = section.frames[b];
        const apart = one.x >= two.x + two.w + GAP - 1 || two.x >= one.x + one.w + GAP - 1 || one.y >= two.y + two.h + GAP - 1 || two.y >= one.y + one.h + GAP - 1;
        if (!apart) out.push(`${page}: ${one.id} and ${two.id} are closer than ${GAP}px`);
      }
    }
  }
  for (const tab of board.tabs ?? []) if (tab.alone && !near(tab.start, tab.end)) out.push(`${page}: the "${tab.label}" tab pads ${tab.start}px / ${tab.end}px`);
  const component = board.sections.find((section) => section.id === "component");
  const playground = component?.frames.find((frame) => frame.id === "playground");
  const main = component?.frames.find((frame) => frame.id === "main-component");
  if (component && (!playground || !near(playground.x, component.x + GAP) || !near(playground.y, component.y + GAP))) out.push(`${page}: the Playground is not at the Component section's top left`);
  if (playground && main && (!near(main.y, playground.y) || !near(main.x, playground.x + playground.w + GAP))) out.push(`${page}: the Main component is not ${GAP}px beside the Playground`);
  const docs = board.sections.find((section) => section.id === "docs");
  for (const frame of docs?.frames ?? []) {
    if (!near(frame.w, DOCS_WIDTH)) out.push(`${page}: ${frame.id} is ${Math.round(frame.w)} wide (${DOCS_WIDTH})`);
    if (![0, 1, 2].some((column) => near(frame.x, docs.x + GAP + column * (DOCS_WIDTH + GAP)))) out.push(`${page}: ${frame.id} is off the Docs columns`);
  }
  return out;
}

/** Every component page, measured once per run (both rows read it). */
let sweep = null;
async function boards(ctx) {
  if (sweep) return sweep;
  const { page } = await ctx.studio({ fresh: true });
  const url = new URL(page.url());
  const measured = new Map();
  for (const id of PAGES) {
    url.searchParams.set("page", id);
    // A document page (Overviews, Templates…) is one Document frame, not a component board: left out. A page whose
    // first open meets a dependency re-optimization (Vite reloads it, the wait loses its context) is opened once more.
    let first = null;
    for (let attempt = 0; attempt < 2 && !first; attempt++) {
      await page.goto(url.href, { waitUntil: "domcontentloaded" }).catch(() => undefined);
      first = await page.waitForSelector('[data-studio-frame="playground"], [data-studio-frame="document"]', { timeout: 30_000 }).catch(() => null);
    }
    if (!first) { measured.set(id, null); continue; }
    if ((await first.getAttribute("data-studio-frame")) === "document") continue;
    // The Main component draws its cells after the Assets code parses (only pages that have one wait for them); the
    // sections place their frames on layout.
    if (await page.locator('[data-studio-frame="main-component"]').count()) await page.waitForSelector('[data-studio-frame="main-component"] [data-mc-cell] .studio-mc__stage > *', { timeout: 4_000 }).catch(() => undefined);
    await page.evaluate(() => document.fonts?.ready);
    await sleep(400);
    measured.set(id, await page.evaluate(measure));
  }
  sweep = measured;
  return sweep;
}

export const rows = [
  {
    id: "BL-01", feature: "Every component page stacks Title → Component (Playground beside the Main component) → Examples → Docs (880 columns): one left edge, one width, 128 apart, every frame inside its section and 64 from the next", wp: "board layout 2026-10-18",
    timeout: 360_000,
    async run(ctx) {
      const all = await boards(ctx);
      const problems = [];
      for (const [page, board] of all) {
        if (!board) problems.push(`${page}: no board`);
        else problems.push(...layoutProblems(page, board));
      }
      if (problems.length) throw new Error(`${problems.length} layout problem(s): ${problems.slice(0, 8).join("; ")}`);
      const frames = [...all.values()].reduce((sum, board) => sum + board.sections.reduce((n, section) => n + section.frames.length, 0), 0);
      return `${all.size} pages, ${frames} frames in place`;
    },
  },
  {
    id: "BL-02", feature: "Every component with Figma variant sets is in its page's Main component (modal overlays drawn open in a screen), and every variant draws something (no empty or collapsed cell)", wp: "board layout 2026-10-18",
    timeout: 360_000,
    async run(ctx) {
      const all = await boards(ctx);
      const { VARIANT_SETS } = await import("../../../../src/platform/studio/mainComponent/variantSets.generated.ts");
      const bad = [];
      let cells = 0;
      for (const [page, board] of all) {
        if (!board) continue;
        // User 2026-10-18 "làm tiếp phần còn thiếu của main component": a component the page documents and Figma has sets
        // for is drawn (samples.ts or its Assets item).
        const drawn = new Set(board.cells.map((cell) => cell.component));
        for (const { name } of api[page] ?? []) if (VARIANT_SETS[name] && !drawn.has(name)) bad.push(`${page} ${name}: not drawn`);
        for (const cell of board?.cells ?? []) {
          cells += 1;
          if (cell.empty || cell.w < 2 || cell.h < 1) bad.push(`${page} ${cell.set} ${cell.name}: ${cell.empty ? "empty" : `${Math.round(cell.w)}×${Math.round(cell.h)}`}`);
        }
      }
      if (bad.length) throw new Error(`${bad.length} problem(s): ${bad.slice(0, 10).join("; ")}`);
      return `${cells} variants drawn on ${[...all.values()].filter((board) => board?.cells.length).length} pages`;
    },
  },
];

#!/usr/bin/env node
// Add / Remove auto layout matrix (user, 2026-10-17: "test luôn phần add auto layout và detach auto layout"), through the
// code the Studio runs: the plans (src/platform/studio/edit/autoLayoutPlan.ts, from the layers' boxes as the canvas
// measures them), relayoutCode (tools/studio/relayout.mjs) and the page edit (op replaceElement, editDoc as localEdit).
//   1. Plans on generated arrangements: rows and columns, aligned on an edge, a centre or not, equal or uneven gaps,
//      shuffled source order, overlaps, 0–6 layers. Judged by what the arrangement was made as (direction, order,
//      gap and padding steps, alignment), never by the plan's own arithmetic.
//   2. Every Assets item in a frame: floating in a Frame (Add), in flow in a Frame (Add), in a painted Frame (Add: Box >
//      Stack), in a Stack (Remove), then Remove → Add back (the Stack it was, same direction, gap, padding, order).
//      Judged: a valid page, no layer lost or doubled, no X / Y left in auto layout, every layer floating after Remove.
// Run: node tools/studio/autolayout-matrix.mjs (npm run studio:dnd runs it after dnd-matrix.mjs).
import path from "node:path";
import { newPageText, parsePage, validateDialect } from "./dialect.mjs";
import { components, edit, FILE, grow, items, root } from "./dnd-engine.mjs";
import { findElement, parseLoc, parseSource } from "./jsx-source.mjs";
import { relayoutCode } from "./relayout.mjs";

const { addPlan, removePlan, floatingCode, FLOATS, POSITION } = await import(path.join(root, "src/platform/studio/edit/autoLayoutPlan.ts"));

const failures = [];
const kinds = {};
let cases = 0;
const fail = (kind, detail) => {
  kinds[kind] = (kinds[kind] ?? 0) + 1;
  if (kinds[kind] <= 12) failures.push(`${kind}: ${detail}`);
};

/* ── 1. plans on generated arrangements ─────────────────────────────────────────────────────────────────────────── */

// Zen's spacing ladder in px (gap and padding share it here): the step nearest a length, none under half a pixel.
const LADDER = [["3xs", 2], ["2xs", 4], ["xs", 8], ["sm", 12], ["md", 16], ["lg", 24], ["xl", 32], ["2xl", 40], ["3xl", 48], ["4xl", 64]];
const keyOf = (_scale, px) => (px < 0.5 ? "none" : LADDER.reduce((best, step) => (Math.abs(step[1] - px) < Math.abs(best[1] - px) ? step : best))[0]);
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = (list) => list[Math.floor(random() * list.length)];
const shuffle = (list) => { const out = [...list]; for (let k = out.length - 1; k > 0; k -= 1) { const j = Math.floor(random() * (k + 1)); [out[k], out[j]] = [out[j], out[k]]; } return out; };

for (let run = 0; run < 12000; run += 1) {
  const count = Math.floor(random() * 6) + 1;
  const row = count > 1 && random() < 0.5;
  const align = pick(["start", "center", "end"]);
  const [gapKey, gapPx] = pick(LADDER);
  const [padKey, padPx] = pick(LADDER);
  const sizes = Array.from({ length: count }, () => ({ w: 24 + Math.round(random() * 140), h: 16 + Math.round(random() * 90) }));
  // Across the flow, every layer shares the edge or centre of a band as tall (wide) as the largest one.
  const band = Math.max(...sizes.map((size) => (row ? size.h : size.w)));
  let along = padPx;
  const boxes = sizes.map((size) => {
    const cross = row ? size.h : size.w;
    const offset = align === "start" ? 0 : align === "center" ? (band - cross) / 2 : band - cross;
    const box = row ? { x: along, y: padPx + offset, w: size.w, h: size.h } : { x: padPx + offset, y: along, w: size.w, h: size.h };
    along += (row ? size.w : size.h) + gapPx;
    return box;
  });
  // A column of layers that are much wider than tall still reads as a column only when its centres spread more down:
  // keep the arrangements whose intent is unambiguous.
  const spread = (values) => Math.max(...values) - Math.min(...values);
  const across = spread(boxes.map((box) => box.x + box.w / 2));
  const down = spread(boxes.map((box) => box.y + box.h / 2));
  if (count > 1 && (row ? across <= down : down >= across ? false : true)) continue;
  // Source order shuffled, as layers drawn in any order.
  const order = shuffle(boxes.map((_, index) => index));
  const layers = order.map((index) => ({ box: boxes[index], name: pick(["Shape", "Text", "Button", "Stack", "Box"]), floatWrapper: random() < 0.3 }));
  cases += 1;
  let plan;
  try { plan = addPlan(layers, keyOf, random() < 0.25); } catch (error) { fail("plan-crash", `${count} layers: ${error.message}`); continue; }
  const label = `${count} in a ${row ? "row" : "column"}, ${align}, gap ${gapKey}, padding ${padKey}`;
  if (count > 1 && plan.row !== row) fail("plan-direction", `${label}: read as ${plan.row ? "row" : "column"}`);
  const visual = plan.order.map((index) => order[index]);
  if (visual.some((value, index) => value !== index)) fail("plan-order", `${label}: order ${visual}`);
  if (count > 1 && plan.gap !== gapKey) fail("plan-gap", `${label}: gap ${plan.gap}`);
  const pads = plan.padding.padding ?? plan.padding.paddingX ?? "none";
  if (pads !== padKey || ("paddingY" in plan.padding && plan.padding.paddingY !== plan.padding.paddingX)) {
    // Across the flow a centred or end-aligned smaller layer starts after the padding: only the start edge is exact.
    const exact = count === 1 || align === "start";
    if (exact) fail("plan-padding", `${label}: padding ${JSON.stringify(plan.padding)}`);
  }
  // Layers of one size share start, centre and end alike: the start is right.
  const crossSizes = sizes.map((size) => (row ? size.h : size.w));
  const alike = new Set(crossSizes).size === 1;
  const wantAlign = count < 2 || align === "start" ? undefined : align;
  if (count > 1 && !alike && plan.align !== wantAlign) fail("plan-align", `${label}: align ${plan.align ?? "start"} (sizes ${crossSizes}; boxes ${JSON.stringify(layers.map((layer) => layer.box))})`);
  const unwraps = plan.plan.children.filter((child) => child.unwrap).length;
  if (unwraps !== layers.filter((layer) => layer.floatWrapper).length) fail("plan-unwrap", `${label}: ${unwraps} unwrapped`);
}
const planCases = cases;

/* ── 2. every Assets item in a frame, through the page edit ─────────────────────────────────────────────────────── */

const base = newPageText({ title: "Auto layout", device: "phone", chrome: true });
/** The page with `frame` as the body's last layer, and that layer. */
function framed(frame) {
  const text = grow(base, "Stack", frame);
  const body = parsePage(text, { components }).board.children[0].children[0];
  const node = body.children.filter((child) => child.kind === "element").at(-1);
  return { text, node };
}
/** relayoutCode then replaceElement on the frame at `node`: the new page text, or { error }. */
function relayout(text, node, plan) {
  const ast = parseSource(text);
  const element = findElement(ast, parseLoc(node.loc));
  let code;
  try { code = relayoutCode(text, { start: element.start, end: element.end }, plan); } catch (error) { return { error: error.message }; }
  const result = edit(text, FILE, { loc: node.loc, name: node.name, ops: [{ op: "replaceElement", code }] });
  return result.text ? { text: result.text } : { error: result.error ?? result.crash };
}
const lastLayer = (text) => parsePage(text, { components }).board.children[0].children[0].children.filter((child) => child.kind === "element").at(-1);
const kids = (node) => (node?.children ?? []).filter((child) => child.kind === "element");
const tags = (text) => {
  const out = new Map();
  for (const match of text.matchAll(/<([A-Z]\w*)[\s/>]/g)) out.set(match[1], (out.get(match[1]) ?? 0) + 1);
  return out;
};
// X / Y on a layer that floats itself (another component's own `position`, an ActionBar's, is its behaviour).
const hasPosition = (node) => FLOATS.has(node.name) && POSITION.some((prop) => prop in node.props);
const floating = (node) => node.props.position?.value === "absolute";

const TEXT = '<Text tone="base">Caption</Text>';
for (const item of items.filter((one) => one.code)) {
  const rootName = item.root;
  // A: floating in a Frame (as a drop at the pointer writes it), with a Text under it → Add auto layout (a column).
  {
    cases += 1;
    const { text, node } = framed(`<Box width={360} height={260}>\n${floatingCode(item.code, rootName, 16, 16)}\n${floatingCode(TEXT, "Text", 16, 180)}\n</Box>`);
    const layers = kids(node).map((kid, index) => ({ box: index ? { x: 16, y: 180, w: 120, h: 20 } : { x: 16, y: 16, w: 200, h: 120 }, name: kid.name, floatWrapper: kid.name === "Box" && !FLOATS.has(rootName) || (kid.name === "Box" && index === 1) }));
    const { plan } = addPlan(layers, keyOf, false);
    const out = relayout(text, node, plan);
    if (out.error) fail("add-floating-refused", `${item.id}: ${out.error}`);
    else {
      const issues = validateDialect(out.text, { components });
      const frame = lastLayer(out.text);
      const inner = kids(frame);
      if (issues.length) fail("add-invalid-page", `${item.id}: ${issues[0].message}`);
      else if (frame.name !== "Stack") fail("add-not-stack", `${item.id}: ${frame.name}`);
      else if (inner.length !== 2 || inner[0].name !== rootName || inner[1].name !== "Text") fail("add-layers", `${item.id}: ${inner.map((kid) => kid.name).join(", ")}`);
      else if (inner.some(hasPosition)) fail("add-kept-xy", `${item.id}`);
      else {
        // Nothing lost or doubled: the frame's Box became a Stack, each float wrapper gave its layer back.
        const wrappers = layers.filter((layer) => layer.floatWrapper).length;
        const want = new Map(tags(text));
        want.set("Box", (want.get("Box") ?? 0) - 1 - wrappers);
        want.set("Stack", (want.get("Stack") ?? 0) + 1);
        const now = tags(out.text);
        const off = [...new Set([...want.keys(), ...now.keys()])].filter((name) => (want.get(name) ?? 0) !== (now.get(name) ?? 0));
        if (off.length) fail("add-lost-or-doubled", `${item.id}: ${off.map((name) => `${name} ${now.get(name) ?? 0}/${want.get(name) ?? 0}`).join(", ")}`);
      }
    }
  }
  // B: in flow in a Frame → Add auto layout.
  {
    cases += 1;
    const { text, node } = framed(`<Box>\n${item.code}\n${TEXT}\n</Box>`);
    const { plan } = addPlan(kids(node).map((kid, index) => ({ box: index ? { x: 0, y: 130, w: 120, h: 20 } : { x: 0, y: 0, w: 200, h: 120 }, name: kid.name, floatWrapper: false })), keyOf, false);
    const out = relayout(text, node, plan);
    if (out.error) fail("add-flow-refused", `${item.id}: ${out.error}`);
    else {
      const frame = lastLayer(out.text);
      const issues = validateDialect(out.text, { components });
      if (issues.length) fail("add-invalid-page", `${item.id}: ${issues[0].message}`);
      else if (frame.name !== "Stack" || kids(frame).map((kid) => kid.name).join() !== `${rootName},Text`) fail("add-flow-layers", `${item.id}: ${frame.name} > ${kids(frame).map((kid) => kid.name).join(", ")}`);
      else if (frame.props.gap?.value !== "xs") fail("add-flow-gap", `${item.id}: gap ${frame.props.gap?.value ?? "md"} for 10px`);
      else if (!FLOATS.has(rootName) && kids(node)[0].props.position && kids(frame)[0].props.position?.value !== kids(node)[0].props.position.value) fail("add-own-position-lost", `${item.id}`);
    }
  }
  // C: in a painted Frame → Add auto layout keeps the Box (its fill) and lays the layers out in a Stack inside.
  {
    cases += 1;
    const { text, node } = framed(`<Box surface="surface" radius="md" width={360} height={260}>\n${floatingCode(item.code, rootName, 24, 24)}\n</Box>`);
    const { plan } = addPlan(kids(node).map((kid) => ({ box: { x: 24, y: 24, w: 200, h: 120 }, name: kid.name, floatWrapper: kid.name === "Box" && !FLOATS.has(rootName) })), keyOf, true);
    const out = relayout(text, node, plan);
    if (out.error) fail("add-painted-refused", `${item.id}: ${out.error}`);
    else {
      const frame = lastLayer(out.text);
      const stack = kids(frame)[0];
      if (validateDialect(out.text, { components }).length) fail("add-invalid-page", `${item.id} (painted)`);
      else if (frame.name !== "Box" || frame.props.surface?.value !== "surface" || stack?.name !== "Stack" || kids(stack)[0]?.name !== rootName || "width" in frame.props) fail("add-painted", `${item.id}: ${frame.name}(${Object.keys(frame.props)}) > ${stack?.name} > ${kids(stack)[0]?.name}`);
      else if (frame.props.padding?.value !== "lg") fail("add-painted-padding", `${item.id}: ${frame.props.padding?.value}`);
    }
  }
  // D + E: in a Stack → Remove auto layout (every layer floats where it showed), then Add it back: the same Stack.
  {
    cases += 2;
    const { text, node } = framed(`<Stack gap="sm" padding="md">\n${item.code}\n${TEXT}\n</Stack>`);
    const boxes = [{ x: 16, y: 16, w: 200, h: 120 }, { x: 16, y: 148, w: 120, h: 20 }];
    const plan = removePlan(kids(node).map((kid, index) => ({ box: boxes[index], name: kid.name, floatWrapper: false, fill: { width: kid.props.width?.value === "fill" } })), { width: 358, height: 184 });
    const out = relayout(text, node, plan);
    if (out.error) { fail("remove-refused", `${item.id}: ${out.error}`); continue; }
    const frame = lastLayer(out.text);
    const issues = validateDialect(out.text, { components });
    const inner = kids(frame);
    if (issues.length) fail("remove-invalid-page", `${item.id}: ${issues[0].message}`);
    else if (frame.name !== "Box" || frame.props.width?.value !== 358 || frame.props.height?.value !== 184 || ["gap", "padding", "direction"].some((prop) => prop in frame.props)) fail("remove-frame", `${item.id}: ${frame.name} ${JSON.stringify(Object.keys(frame.props))}`);
    else if (inner.length !== 2 || !inner.every(floating)) fail("remove-not-floating", `${item.id}: ${inner.map((kid) => `${kid.name}${floating(kid) ? "" : "(flow)"}`).join(", ")}`);
    else if (inner[0].props.insetLeft?.value !== 16 || inner[0].props.insetTop?.value !== 16 || inner[1].props.insetTop?.value !== 148) fail("remove-place", `${item.id}`);
    // Back: Add auto layout from the same places (the float wrappers give their layers back).
    const back = relayout(out.text, frame, addPlan(inner.map((kid, index) => ({ box: boxes[index], name: kid.name, floatWrapper: kid.name === "Box" && Object.keys(kid.props).every((prop) => POSITION.includes(prop)) && kids(kid).length === 1 })), keyOf, false).plan);
    if (back.error) { fail("roundtrip-refused", `${item.id}: ${back.error}`); continue; }
    const again = lastLayer(back.text);
    const was = tags(text);
    const now = tags(back.text);
    if (again.name !== "Stack" || again.props.gap?.value !== "sm" || again.props.padding?.value !== "md" || "direction" in again.props) fail("roundtrip-frame", `${item.id}: ${again.name} gap ${again.props.gap?.value} padding ${again.props.padding?.value} ${again.props.direction?.value ?? ""}`);
    else if (kids(again).map((kid) => kid.name).join() !== `${rootName},Text` || kids(again).some(hasPosition)) fail("roundtrip-layers", `${item.id}: ${kids(again).map((kid) => kid.name).join(", ")}`);
    else if ([...was].some(([name, n]) => now.get(name) !== n) || [...now].some(([name, n]) => was.get(name) !== n)) fail("roundtrip-tags", `${item.id}`);
  }
}

// Refusals the canvas shows in words: a list or loose words among the layers.
for (const frame of ['<Box>\n{mock.rows?.map((row) => <Text key={row}>{row}</Text>)}\n</Box>', "<Box>Loose words</Box>"]) {
  cases += 1;
  try { relayoutCode(frame, { start: 0, end: frame.length }, { tag: "Stack" }); fail("refusal-missing", frame.slice(0, 30)); } catch (error) { if (!/list or code|text of its own/.test(error.message)) fail("refusal-words", error.message); }
}

const total = Object.values(kinds).reduce((sum, n) => sum + n, 0);
console.log(`autolayout-matrix: ${cases} cases (${planCases} arrangements, ${cases - planCases} frames of ${items.filter((one) => one.code).length} Assets items) · ${total} findings`);
for (const [kind, n] of Object.entries(kinds)) console.log(`  ${kind}: ${n}`);
for (const line of failures.slice(0, 40)) console.log(`  · ${line}`);
process.exitCode = total ? 1 : 0;

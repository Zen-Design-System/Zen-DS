// Shared pieces of the chart suites (docs/figma-contracts/chart-*.json, read 2026-10-23). Every Figma Chart/* set is the
// body of a Chart Card: Heading (icon · Label · open chevron) · Segmented · Metric (Description · Value) · the chart. So
// each case renders the chart inside a ChartCard (cases.tsx `chartCard`) as wide as the set plus Card-padding-medium on
// both sides, and the suite measures from `.zen-chart-card__body`. The card's props are read from the variant itself
// (visible icon, title, open button, range items, metric texts), so a Figma edit to them changes the case too.

const CARD_PADDING = 24; // Card-padding-medium: the Chart Card around the set (Chart/Chart-Card's Card).

/** The child of `node` named `name` (the first, or the `index`-th). */
export const child = (node, name, index = 0) => (node?.c ?? []).filter((item) => item.n === name)[index];
/** The node at a ` > ` path under `node`. */
export const at = (node, route) => route.split(" > ").reduce((found, name) => child(found, name), node);
/** Every node under `node` (depth first) that passes `test`. */
export const findAll = (node, test, out = []) => {
  for (const item of node?.c ?? []) {
    if (test(item)) out.push(item);
    findAll(item, test, out);
  }
  return out;
};
/** The text of the first TEXT layer under `node`. */
export const textOf = (node) => (node?.t === "TEXT" ? node.txt : findAll(node, (item) => item.t === "TEXT")[0]?.txt);

/** The Chart Card around a set's chart: width, title, icon, open button, ranges and metric, as the variant shows them. */
export function cardProps(spec, prefix) {
  const body = prefix ? at(spec, prefix) : spec;
  const header = at(body, "Heading > Header");
  const icon = child(header, "Icon");
  const open = child(header, "Button/Icon-Main");
  const segmented = child(body, "Segmented");
  const metric = child(body, "Metric");
  const props = { width: spec.w + 2 * CARD_PADDING, title: textOf(child(header, "Label")) };
  if (icon && !icon.hidden) props.icon = icon.main;
  if (open && !open.hidden) props.open = true;
  if (segmented && !segmented.hidden) {
    const items = (child(segmented, "Item-List")?.c ?? []).filter((item) => !item.hidden);
    props.ranges = items.map((item, index) => ({ id: `r${index}`, label: textOf(child(item, "Text-Wrapper")) }));
    props.range = `r${Math.max(0, items.findIndex((item) => /Select=Yes/.test(item.main ?? "")))}`;
    props.rangesFullWidth = segmented.sz?.[0] === "FILL";
  }
  if (metric && !metric.hidden) {
    const description = child(metric, "Description");
    const value = child(metric, "Value");
    if (description && !description.hidden) props.description = description.txt;
    if (value && !value.hidden) props.value = value.txt;
  }
  return props;
}

/** The map entries of the card's part of the set: Heading, Segmented and Metric, under `prefix` (Stack-Bar's Elements). */
export function cardMap(prefix) {
  const P = (route) => (prefix ? `${prefix} > ${route}` : route);
  return [
    { figma: "", dom: ":root", check: ["w"] },
    { figma: P("Heading"), dom: ".zen-chart-card__header", check: ["size", "x", "y"] },
    { figma: P("Heading > Header > Icon"), dom: ".zen-chart-card__icon", check: ["size", "x", "y"] },
    { figma: P("Heading > Header > Icon > Vector"), dom: ".zen-chart-card__icon", check: ["fill"], fillVia: "color", when: (vp, props) => Boolean(props.icon) },
    { figma: P("Heading > Header > Label"), dom: ".zen-chart-card__title", check: ["text", "size", "x", "y"] },
    { figma: P("Heading > Header > Button/Icon-Main"), dom: ".zen-chart-card__titlebar .zen-button", check: ["size", "x", "y"] },
    { figma: P("Segmented"), dom: ".zen-segmented", check: ["size", "x", "y", "fill", "radius"] },
    { figma: P("Metric"), dom: ".zen-chart-card__metric", check: ["size", "x", "y"] },
    { figma: P("Metric > Description"), dom: ".zen-chart-card__description", check: ["text", "size", "x", "y"] },
    { figma: P("Metric > Value"), dom: ".zen-chart-card__value", check: ["text", "size", "x", "y"] },
  ];
}

/** A legend's map entries: the row, each item's dot (size + colour) and label (text style + colour). `items` legend items. */
/** `itemY` also places each item (a legend that wraps or lists down a column); `check: []` skips the row's own box. */
export function legendMap(route, { items = 2, itemName = ".Chart/Legend-Item", dotName = "Dot", check = ["w", "h", "x", "y"], itemY = false, when } = {}) {
  const entries = check.length ? [{ figma: route, dom: ".zen-chart__legend", check, when }] : [];
  for (let i = 0; i < items; i += 1) {
    const li = `.zen-chart__legend > li:nth-child(${i + 1})`;
    entries.push(
      { figma: `${route} > ${itemName}#${i} > ${dotName}`, dom: `${li} > .zen-chart__swatch`, check: ["size", "fill"], when },
      { figma: `${route} > ${itemName}#${i} > Label`, dom: li, check: itemY ? ["text", "h", "y"] : ["text", "h"], when },
    );
  }
  return entries;
}

/** The number in "N-Sectors". */
export const sectorCount = (vp) => Number(String(vp.Sector ?? "").split("-")[0]);
/** The palette prop of a Color variant (Figma Color=Primary · Secondary ↔ `palette`). */
export const paletteOf = (vp) => (vp.Color === "Secondary" ? "secondary" : "primary");

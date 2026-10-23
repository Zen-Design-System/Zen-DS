#!/usr/bin/env node
// Self-test: the Zen Studio Widgets palette entries (src/platform/studio/slots/palette.ts, spec
// docs/research/widget-patterns-spec-2026-10-14.md) through Export › Figma and Import from Figma. A builder page holding
// every widget, each written as the palette writes it on a page you make (its builder code: no callbacks), is pushed
// (figma-push.mjs) and pulled back (figma-pull.mjs): every widget comes back as the same components with the same
// header, theme and variant props. The charts' data is the Studio's sample after the trip (Figma draws its own), so it
// is left out of the comparison, as in figma-push.selftest.mjs §29.
// Run: node tools/studio/figma-widgets.selftest.mjs
import { validateDialect } from "./dialect.mjs";
import { docFromText } from "./doc.mjs";
import { figmaFromPage } from "./figma-push.mjs";
import { pageFromFigma, repoMapping } from "./figma-pull.mjs";
import { NESTED_LAYERS } from "../../src/platform/studio/inspector/nestedLayers.generated.ts";
import { headingLevelFor, slotOf } from "../../src/platform/studio/slots/registry.ts";
import { PALETTE, paletteFor, paletteItem } from "../../src/platform/studio/slots/palette.ts";

let passed = 0;
const failures = [];
const check = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) passed += 1;
  else failures.push(`${label}\n    expected ${e}\n    actual   ${a}`);
};
const ok = (label, value) => check(label, Boolean(value), true);

const mapping = await repoMapping();
const push = (text) => figmaFromPage(text, { mapping, nestedLayers: NESTED_LAYERS });

// The Widgets entries as a builder page's insert picker offers them (paletteFor with builder: its static code).
const ancestors = ["Screen", "Board"];
const offered = paletteFor({
  host: "Stack", slot: slotOf("Stack", "children"), hostProps: {}, ancestors, uid: "w1", mobile: false, builder: true,
  headingLevel: headingLevelFor("Stack", {}, { ancestors: ancestors.map((name) => ({ name })) }),
});
const widgets = offered.items.filter((item) => item.group === "Widgets");
check("every Widgets entry is offered on a builder page (none hidden)", widgets.map((item) => item.id), PALETTE.filter((item) => item.group === "Widgets").map((item) => item.id));
check("no Widgets entry hidden on a builder page", offered.hidden.filter((row) => row.group === "Widgets"), []);

const indent = (code, depth) => code.split("\n").map((line) => `${" ".repeat(depth)}${line}`).join("\n");
const names = [...new Set(["Stack", ...widgets.flatMap((item) => item.components)])].sort((a, b) => a.localeCompare(b));
const PAGE = `// @zen-page {"format":1,"title":"Widgets"}
import { Board, Screen, proto } from "@zen-ds/react/builder";
import { ${names.join(", ")} } from "@zen-ds/react";

export const mock = {};

export default function Page() {
  return (
    <Board>
      <Screen id="screen-1" title="Widgets" device="desktop">
        <Stack gap="md">
${widgets.map((item) => indent(item.build(offered.context), 10)).join("\n")}
        </Stack>
      </Screen>
    </Board>
  );
}
`;
check("the page of every widget is valid dialect", validateDialect(PAGE), []);

// What a widget is made of, without its data: per element, its name and the props Figma carries (header, theme,
// variants). Data props come back as the Studio's sample (DATA); DonutChart's centre label/value and RadialChart's
// legend position are carried, as in figma-push.selftest.mjs §29. A number format (format="currency", lineFormat,
// currency: text presets since 2026-10-23) is data too: Figma draws the figures as text and has no format property.
const DATA = new Set(["data", "series", "compare", "values", "rows", "columns", "aria-label", "height", "label", "barLabel", "lineLabel", "value", "target", "actualLabel", "headers", "legendPosition", "max", "size"]);
const FORMAT = new Set(["format", "lineFormat", "currency"]);
const shape = (text) => {
  const value = (v) => (v.kind === "element" ? { element: tree(v.node) } : v.kind === "object" ? Object.fromEntries(Object.entries(v.fields).sort(([a], [b]) => a.localeCompare(b)).map(([k, f]) => [k, value(f)])) : v.kind === "array" ? v.items.map(value) : v.value);
  const tree = (node) => ({ name: node.name, props: Object.fromEntries(Object.entries(node.props).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, value(v)])), children: node.children.map((child) => (child.kind === "element" ? tree(child) : child.value)) });
  return tree(docFromText(text).doc.board);
};
const widgetsOf = (text) => {
  const out = [];
  const walk = (node) => {
    if (node.name === "ChartCard" || node.name === "MetricCard" || node.name === "Card") {
      const parts = [];
      const inner = (child) => {
        const isChart = /Chart$|^BarList$/.test(child.name) && child.name !== "ChartCard";
        parts.push({ name: child.name, props: Object.fromEntries(Object.entries(child.props).filter(([prop]) => !FORMAT.has(prop) && (!isChart || !DATA.has(prop) || (child.name === "RadialChart" && prop === "legendPosition")))) });
        child.children.forEach((grandchild) => grandchild.name && inner(grandchild));
      };
      out.push({ name: node.name, props: Object.fromEntries(Object.entries(node.props).filter(([prop]) => !FORMAT.has(prop))), parts: (node.children.forEach((child) => child.name && inner(child)), parts) });
      return;
    }
    node.children.forEach((child) => child.name && walk(child));
  };
  walk(shape(text));
  return out;
};

/*
 * Widgets whose Figma mapping another owner is still building (spec "Owners"): their round trip is reported, not failed,
 * until it holds; then this selftest fails until the entry is taken off the list. MetricCard `type` and its data
 * (series, goal, comparison, categories, footer) → Figma Metric-Card Type: metric-types. (Card theme="solid" + color →
 * Theme=Solid + Color holds since 2026-10-14, card-color.)
 */
const PENDING = new Map([
]);

const { frame, notes } = push(PAGE);
const cards = [];
const collect = (node) => {
  // A typed MetricCard is one Figma Metric-Card instance (figma-metric.mjs), its Card inside.
  if (node.set?.name === "Card" || node.set?.name === "Metric-Card") cards.push(node);
  else [...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)].forEach(collect);
};
collect(frame);
check("push: one Card instance per widget", cards.length, widgets.length);
const SETS = { AreaChart: "Chart/Area-Chart", LineChart: "Chart/Multi-Line-Chart", BarChart: "Chart/Bar-Chart", GroupedBarChart: "Chart/Grouped-Bar-Chart", ComboChart: "Chart/Combo-Chart",
  HeatmapChart: "Chart/Heatmap-Chart", GaugeChart: "Chart/Gauge-Chart", BulletChart: "Chart/Bullet-Chart", RadialChart: "Chart/Radial-Chart", FunnelChart: "Chart/Funnel-Chart", BarList: "Chart/Bar-List", DonutChart: "Chart/Donut-Chart" };
const chartWidgets = widgets.filter((item) => item.root === "ChartCard");
check("push: each ChartCard widget is a Card holding its ❖ Chart set", chartWidgets.map((item) => cards[widgets.indexOf(item)]?.slots?.[0]?.children?.[0]?.set?.name ?? null), chartWidgets.map((item) => SETS[item.components[1]] ?? `? ${item.components[1]}`));
check("push: every chart widget's header carries its title, icon, description and figure", chartWidgets.map((item) => {
  const chart = cards[widgets.indexOf(item)]?.slots?.[0]?.children?.[0];
  const code = item.build(offered.context);
  const attr = (name) => code.match(new RegExp(`^<ChartCard[^\\n]*?\\b${name}="([^"]*)"`))?.[1];
  return [chart?.props.Title === attr("title"), chart?.props.Icon === attr("icon"), chart?.props.Description === (attr("description") ?? chart?.props.Description), chart?.props["Show Value"] === Boolean(attr("value")) && (!attr("value") || chart?.props.Value === attr("value"))];
}), chartWidgets.map(() => [true, true, true, true]));
// The notes the pending widgets cause: a MetricCard's type data and footer.
const pendingNote = (note) => [...PENDING.keys()].some((id) => paletteItem(id)?.root === "MetricCard") && /^MetricCard: /.test(note);
check("push: no widget component is left without a Figma component, slot or option (but the pending owners' ones)",
  notes.filter((note) => /no Figma (component|slot|option)/.test(note) && !pendingNote(note)), []);

const { text: back, notes: backNotes } = pageFromFigma(frame, { mapping });
check("pull: the page comes back valid dialect", validateDialect(back), []);
const before = widgetsOf(PAGE);
const after = widgetsOf(back);
const pending = [];
widgets.forEach((item, index) => {
  const same = JSON.stringify(after[index]) === JSON.stringify(before[index]);
  if (PENDING.has(item.id)) {
    check(`round trip: ${item.id} is still pending (take it off PENDING once it holds)`, same, false);
    if (!same) pending.push(`${item.id} — ${PENDING.get(item.id)}`);
  } else {
    check(`round trip: ${item.id} comes back with its components and props (data aside)`, after[index], before[index]);
  }
});
check("round trip: as many widgets come back as went up", after.length, before.length);
ok("round trip: the pull says the charts' data is the Studio's sample", backNotes.some((note) => /the data is the Studio's sample/.test(note)));
// Pushed again, the pulled page draws the same Card and chart sets with the same header.
const again = [];
const collectAgain = (node) => {
  if (node.set?.name === "Card" || node.set?.name === "Metric-Card") again.push(node);
  else [...(node.children ?? []), ...(node.slots ?? []).flatMap((slot) => slot.children)].forEach(collectAgain);
};
collectAgain(push(back).frame);
// A Metric-Card: its Type and its Card's Theme (nested); a Card: its Theme and the chart set it holds.
const head = (card) => { if (card.set?.name === "Metric-Card") return [card.props.Type, card.nested?.find((entry) => entry.path === "Card")?.props.Theme ?? null, null, null]; const chart = card.slots?.[0]?.children?.[0]; return [card.props.Theme, chart?.set?.name, chart?.props.Title ?? null, chart?.props.Value ?? null]; };
const settled = (list) => list.filter((_, index) => !PENDING.has(widgets[index]?.id));
check("round trip twice: the same cards, chart sets and headers", settled(again.map(head)), settled(cards.map(head)));

if (failures.length) {
  console.error(`✗ figma-widgets selftest: ${failures.length} failed, ${passed} passed\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`✓ figma-widgets selftest: ${widgets.length} widgets, ${passed} checks pass.`);
if (pending.length) console.log(`  pending Figma mapping (${pending.length}, other owners):\n  · ${pending.join("\n  · ")}`);

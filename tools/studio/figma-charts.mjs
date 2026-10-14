// Zen charts ↔ the ❖ Chart sets of the Zen Figma file (docs/research/chart-phase2-spec-2026-10-14.md §1, read live
// 2026-10-14): the set that draws a chart and its variant and boolean properties (figma-push.mjs), and the chart a set
// reads back as (figma-pull.mjs). Since 2026-10-14 the charts are card-less content: a ChartCard is a Card (its theme)
// holding the chart, and every chart set carries the header properties ChartCard writes (Show Icon + Icon, Title,
// Show Description + Description, Show Value + Value, Show Ranges, Show Open). A chart outside a ChartCard turns them
// off and hides its Heading layer (the title has no toggle). Figma draws its own sample data, which no property
// carries: the pull takes the data of the matching Studio palette sample (src/platform/studio/slots/palette.ts).
// Isomorphic: the Studio loads it in the browser too.
import { docFromText } from "./doc.mjs";
import { paletteItem } from "../../src/platform/studio/slots/palette.ts";

/** Every chart set; the plugin finds a set by its id, then by its name. */
export const CHART_SETS = {
  line: { id: "6643:63324", name: "Chart/Line-Chart" },
  stackBar: { id: "6643:73471", name: "Chart/Stack-Bar-Chart" },
  multiLine: { id: "15501:3054", name: "Chart/Multi-Line-Chart" },
  bar: { id: "15321:84071", name: "Chart/Bar-Chart" },
  donut: { id: "15324:80365", name: "Chart/Donut-Chart" },
  radial: { id: "15325:1135", name: "Chart/Radial-Chart" },
  heatmap: { id: "15326:1043", name: "Chart/Heatmap-Chart" },
  area: { id: "15484:2663", name: "Chart/Area-Chart" },
  groupedBar: { id: "15485:2457", name: "Chart/Grouped-Bar-Chart" },
  combo: { id: "15485:2519", name: "Chart/Combo-Chart" },
  gauge: { id: "15486:2467", name: "Chart/Gauge-Chart" },
  funnel: { id: "15486:2497", name: "Chart/Funnel-Chart" },
  barList: { id: "15487:2473", name: "Chart/Bar-List" },
  bullet: { id: "15487:2516", name: "Chart/Bullet-Chart" },
};
/** Chart/Chart-Card (a component holding a Card whose Content slot holds a chart): read as its Card. */
export const CHART_CARD_SET = { id: "6643:63528", name: "Chart/Chart-Card" };
/** The chart's header frame (Header › Icon · Label · Button/Icon-Main, Description, Value): hidden on a bare chart. */
export const HEADING_LAYER = "Heading";
/** Whether a chart read in Figma (`headingHidden`) or written by the push (`hide`) shows no Heading: a chart on its own. */
export const headingHidden = (node) => Boolean(node.headingHidden || node.hide?.includes(HEADING_LAYER));

/** The code charts the push maps (figma-push CHART_SETS). */
export const CHART_COMPONENTS = new Set(["LineChart", "StackBarChart", "BarChart", "DonutChart", "RadialChart", "HeatmapChart", "AreaChart", "GroupedBarChart", "ComboChart", "GaugeChart", "FunnelChart", "BarList", "BulletChart"]);
/** Sets with Show Average + Average (↔ showAverage) and with Show Legend (↔ showLegend). */
const AVERAGE = new Set(["line", "stackBar", "multiLine", "bar"]);
const LEGEND = new Set(["area", "groupedBar", "combo", "gauge", "bullet"]);
/** Chart/Multi-Line-Chart's Sector options: as many periods as the line has points. */
const SECTORS = [4, 6, 7, 12];
/** Chart/Donut-Chart's sample total (Total Value's default): a pull leaves it to the code, which totals its data. */
const DONUT_SAMPLE_TOTAL = "$296,800";
/** The total's caption the code shows without `label` (labels.ts `total`, en). */
const DONUT_TOTAL_LABEL = "Total";

/** Whether the code shows the legend without `showLegend`: AreaChart only when stacked, GaugeChart only with a target. */
const legendByDefault = (key, values) => (key === "area" ? values.type === "stacked" : key === "gauge" ? values.target !== undefined && values.target !== null : true);

/** chartCore defaultFormat: what the code writes without `format` (the Average tag). */
const defaultFormat = (value) => (Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}K` : `${value}`);
const meanOf = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined);
const numbers = (list) => list.filter((value) => typeof value === "number" && Number.isFinite(value));
const nearest = (options, count) => options.reduce((best, option) => (Math.abs(option - count) < Math.abs(best - count) ? option : best));
const words = (value) => (typeof value === "string" || typeof value === "number" ? String(value) : "");

/** Which set draws the chart `name` with `values` (its props as plain data). */
function setKeyOf(name, values) {
  switch (name) {
    case "LineChart": return values.compare ? "multiLine" : "line";
    case "StackBarChart": return "stackBar";
    case "BarChart": return "bar";
    case "DonutChart": return "donut";
    case "RadialChart": return "radial";
    case "HeatmapChart": return "heatmap";
    case "AreaChart": return "area";
    case "GroupedBarChart": return "groupedBar";
    case "ComboChart": return "combo";
    case "GaugeChart": return "gauge";
    case "FunnelChart": return "funnel";
    case "BarList": return "barList";
    case "BulletChart": return "bullet";
    default: return null;
  }
}

/** The mean the Average tag shows (Chart.tsx, BarChart.tsx): the line's points, the stacks' totals, the closed bars. */
function averageOf(key, values) {
  const data = Array.isArray(values.data) ? values.data.filter((item) => item && typeof item === "object") : [];
  if (!data.length) return undefined;
  if (key === "stackBar") return meanOf(numbers(data.map((item) => numbers(Object.values(item.values ?? {})).reduce((sum, value) => sum + value, 0))));
  if (key === "bar") return meanOf(numbers(data.filter((item) => !item.projected).map((item) => item.value)));
  return meanOf(numbers(data.map((item) => item.value)));
}

/**
 * The Figma set and properties of the chart `name` (push). `values`: its props as plain data (`data`, `compare`,
 * `orientation`…; a prop that holds no data, such as a handler, is `true`). Notes say what Figma cannot show.
 * → { set, props } or null when `name` is no chart.
 */
export function chartFigma(name, values, notes, where) {
  const key = setKeyOf(name, values);
  if (!key) return null;
  const set = CHART_SETS[key];
  const props = {};
  if (key === "multiLine") {
    const count = Array.isArray(values.data) ? values.data.length : null;
    const sectors = count === null ? SECTORS[0] : nearest(SECTORS, count);
    props.Sector = `${sectors}-Sectors`;
    if (count !== sectors) notes.push(`${where}: ${count === null ? "its data is not written in the page" : `${count} points`}; Figma's ${set.name} has 4, 6, 7 or 12 sectors (${sectors} drawn)`);
    if (values.legendPosition !== undefined && values.legendPosition !== "top") notes.push(`${where}: legendPosition="${values.legendPosition}": Figma's ${set.name} draws its legend on top`);
  }
  if (key === "bar") props.Orientation = values.orientation === "horizontal" ? "Horizontal" : "Vertical";
  if (key === "area") props.Type = values.type === "stacked" ? "Stacked" : "Area";
  if (key === "donut") {
    const start = values.totalPosition === "start";
    const position = values.legendPosition ?? "bottom";
    const legend = start ? "Start" : { bottom: "Bottom", start: "Start", top: "Bottom", end: "Start" }[position] ?? "Bottom";
    if (!start && (position === "top" || position === "end")) notes.push(`${where}: legendPosition="${position}": Figma's ${set.name} has its legend at Bottom or Start (${legend} drawn)`);
    props.Legend = legend;
    props.Total = start ? "Start" : "Centre";
    // The total's caption as the code shows it (the locale's "Total" without one); its figure only when the page writes
    // it (the code totals its data, Figma shows its sample's total).
    const label = values.label === undefined ? DONUT_TOTAL_LABEL : words(values.label);
    if (label) props["Total Label"] = label;
    else notes.push(`${where}: its label is not text (Figma's Total Label kept)`);
    if (words(values.value)) props["Total Value"] = words(values.value);
  }
  if (key === "radial") {
    const position = values.legendPosition ?? "bottom";
    const legend = { bottom: "Bottom", end: "End", top: "Bottom", start: "End" }[position] ?? "Bottom";
    if (position === "top" || position === "start") notes.push(`${where}: legendPosition="${position}": Figma's ${set.name} has its legend at Bottom or End (${legend} drawn)`);
    props.Legend = legend;
  }
  if (AVERAGE.has(key)) {
    props["Show Average"] = values.showAverage === true;
    const mean = values.showAverage === true ? averageOf(key, values) : undefined;
    if (mean !== undefined) props.Average = `Avg ${defaultFormat(mean)}`;
  }
  if (LEGEND.has(key)) {
    props["Show Legend"] = typeof values.showLegend === "boolean" ? values.showLegend : legendByDefault(key, values);
    const position = values.legendPosition ?? "bottom";
    if (position !== "bottom") notes.push(`${where}: legendPosition="${position}": Figma's ${set.name} draws its legend below`);
  } else if (values.showLegend === false && ["multiLine", "stackBar", "donut", "radial", "heatmap"].includes(key)) notes.push(`${where}: showLegend={false}: Figma's ${set.name} has no Show Legend (its legend shows)`);
  return { set, props };
}

/**
 * A ChartCard's header as its chart's properties (push): `header` holds the texts it shows (title, description, value:
 * "" for none), its icon name (null for none), how many ranges it offers and whether it has an open button.
 */
export function chartHeaderFigma({ title = "", icon = null, description = "", value = "", ranges = 0, open = false }) {
  return {
    "Show Icon": Boolean(icon), ...(icon ? { Icon: icon } : {}),
    Title: title,
    "Show Description": Boolean(description), ...(description ? { Description: description } : {}),
    "Show Value": Boolean(value), ...(value ? { Value: value } : {}),
    "Show Ranges": ranges > 0,
    "Show Open": Boolean(open),
  };
}

/** A chart on its own (no ChartCard): every header toggle off; the push hides its Heading too (HEADING_LAYER). */
export const BARE_HEADER = { "Show Icon": false, "Show Description": false, "Show Value": false, "Show Ranges": false, "Show Open": false };

/* ── pull ───────────────────────────────────────────────────────────────────────────────────────────────────────── */

const SET_KEYS = new Map(Object.entries(CHART_SETS).map(([key, set]) => [set.name, key]));
const SET_IDS = new Map(Object.entries(CHART_SETS).map(([key, set]) => [set.id, key]));

/** The chart set a Figma instance's set is (by name, else id), or null. */
export const chartSetKey = (set) => (set ? SET_KEYS.get(set.name) ?? SET_IDS.get(set.id) ?? null : null);

/** The palette sample (slots/palette.ts) each chart reads its data from, by set and variant. */
function sampleId(key, props) {
  switch (key) {
    case "line": return "line-chart";
    case "multiLine": return "multi-line-chart";
    case "stackBar": return "bar-chart";
    case "bar": return props.Orientation === "Horizontal" ? "horizontal-bar-chart" : "column-chart";
    case "donut": return "donut-chart";
    case "radial": return "radial-chart";
    case "heatmap": return "heatmap-chart";
    case "area": return props.Type === "Stacked" ? "stacked-area-chart" : "area-chart";
    case "groupedBar": return "grouped-bar-chart";
    case "combo": return "combo-chart";
    case "gauge": return "gauge-chart";
    case "funnel": return "funnel-chart";
    case "barList": return "bar-list";
    case "bullet": return "bullet-chart";
    default: return null;
  }
}

const literal = (value) => ({ kind: "literal", value });
/** Plain data as a document value. */
const toValue = (value) => (Array.isArray(value) ? { kind: "array", items: value.map(toValue) } : value && typeof value === "object" ? { kind: "object", fields: Object.fromEntries(Object.entries(value).map(([name, field]) => [name, toValue(field)])) } : literal(value));
/** A document value as plain data (undefined for anything but literals, arrays and objects). */
const plainOf = (value) => {
  if (!value) return undefined;
  if (value.kind === "literal") return value.value;
  if (value.kind === "array") return value.items.map(plainOf);
  if (value.kind === "object") return Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, plainOf(field)]));
  return undefined;
};

const samples = new Map();
/** A palette sample's root element (its props as document values), parsed once; null when the palette has none. */
function sampleElement(id) {
  if (samples.has(id)) return samples.get(id);
  const item = paletteItem(id);
  let element = null;
  if (item) {
    const code = item.build({ host: "Stack", slot: { component: "Stack", prop: "children" }, headingLevel: 3, mobile: false, uid: "figma" });
    const text = `// @zen-page {"format":1,"title":"Sample"}\nimport { Board, Screen } from "@zen-ds/react/builder";\nimport { ${item.components.join(", ")} } from "@zen-ds/react";\n\nexport const mock = {};\n\nexport default function Page() {\n  return (\n    <Board>\n      <Screen id="sample" title="Sample" device="desktop">\n${code}\n      </Screen>\n    </Board>\n  );\n}\n`;
    const root = docFromText(text, { newId: () => "sample" }).doc?.board.children[0]?.children.find((child) => child.kind === "element") ?? null;
    element = root ? { name: root.name, props: root.props } : null;
  }
  samples.set(id, element);
  return element;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/**
 * A monthly sample (LineChart data + compare) as `count` months ending where it ends: earlier months repeat its values
 * in turn, and the aria-label's "Jul – Sep 2026" follows. Figma's Multi-Line-Chart Sector is its number of periods,
 * so a pulled chart pushes back with the same Sector.
 */
function monthsOf(props, count) {
  const data = plainOf(props.data);
  if (!Array.isArray(data) || !data.length || data.length === count) return props;
  const last = MONTHS.indexOf(data[data.length - 1]?.label);
  if (last < 0) return props;
  const at = (list, index) => list[((index % list.length) + list.length) % list.length];
  const span = Array.from({ length: count }, (_, index) => data.length - count + index);
  const out = { ...props, data: toValue(span.map((index) => ({ ...at(data, index), label: MONTHS[(((last - (data.length - 1 - index)) % 12) + 12) % 12] }))) };
  const compare = plainOf(props.compare);
  if (compare && Array.isArray(compare.values) && compare.values.length) out.compare = toValue({ ...compare, values: span.map((index) => at(compare.values, index)) });
  const label = plainOf(props["aria-label"]);
  const range = /\b([A-Z][a-z]{2}) – ([A-Z][a-z]{2}) (\d{4})\b/;
  if (typeof label === "string" && range.test(label)) {
    const year = Number(range.exec(label)[3]);
    const first = MONTHS[(((last - count + 1) % 12) + 12) % 12];
    const startYear = year - Math.ceil(Math.max(0, count - 1 - last) / 12);
    out["aria-label"] = literal(label.replace(range, startYear === year ? `${first} – ${MONTHS[last]} ${year}` : `${first} ${startYear} – ${MONTHS[last]} ${year}`));
  }
  return out;
}

/**
 * A chart instance read in Figma ({ set, props }) as its code chart (pull): { name, props } with document values,
 * the data from its palette sample and the variant and boolean properties as props; null when its set is no chart.
 */
export function chartFromFigma(node, notes, where) {
  const key = chartSetKey(node.set);
  if (!key) return null;
  const figma = node.props ?? {};
  const sample = sampleElement(sampleId(key, figma));
  if (!sample) { notes.push(`${where}: no Studio sample for ${node.set?.name} (left out)`); return null; }
  let props = { ...sample.props };
  const set = (name, value) => { props[name] = literal(value); };
  const unset = (name) => { delete props[name]; };
  if (key === "multiLine") {
    const sectors = Number.parseInt(String(figma.Sector ?? ""), 10);
    if (SECTORS.includes(sectors)) props = monthsOf(props, sectors);
  }
  if (key === "bar") { if (figma.Orientation === "Horizontal") set("orientation", "horizontal"); else unset("orientation"); }
  if (key === "area") { if (figma.Type === "Stacked") set("type", "stacked"); else unset("type"); }
  if (key === "donut") {
    if (figma.Total === "Start") { set("totalPosition", "start"); unset("legendPosition"); }
    else if (figma.Legend === "Start") set("legendPosition", "start");
    const label = figma["Total Label"];
    if (typeof label === "string" && label && label !== DONUT_TOTAL_LABEL) set("label", label);
    const value = figma["Total Value"];
    if (typeof value === "string" && value && value !== DONUT_SAMPLE_TOTAL) set("value", value);
  }
  if (key === "radial" && figma.Legend === "End") set("legendPosition", "end");
  if (AVERAGE.has(key)) { if (figma["Show Average"] === true) set("showAverage", true); else unset("showAverage"); }
  if (LEGEND.has(key) && typeof figma["Show Legend"] === "boolean") {
    const values = Object.fromEntries(Object.entries(props).map(([name, value]) => [name, plainOf(value)]));
    // Series told apart by colour alone keep their legend (usage-guard chart/series-need-legend): a stacked area,
    // grouped bars, a combo.
    const needed = key === "groupedBar" || key === "combo" || (key === "area" && values.type === "stacked");
    if (figma["Show Legend"] === false && needed) notes.push(`${where}: Show Legend is off in Figma; its series need their legend in code (chart/series-need-legend), so it stays`);
    if (figma["Show Legend"] === legendByDefault(key, values) || needed) unset("showLegend");
    else set("showLegend", figma["Show Legend"]);
  }
  return { name: sample.name, props };
}

/** Segmented item ids: the label's words (figma-pull slug), unique. */
const slug = (text) => String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "range";

/**
 * A chart's header as ChartCard's props (pull), from its properties and the items its Segmented shows
 * (`ranges`: [{ text, props: { Select } }]): plain data, `open` true when Show Open is on.
 */
export function chartHeaderOf(node) {
  const figma = node.props ?? {};
  const on = (name) => figma[name] === true;
  const text = (name) => (typeof figma[name] === "string" ? figma[name] : "");
  const ids = new Set();
  // Read in Figma: `ranges`; a push's own JSON (read back in the selftests): its Item-List slot's items.
  const items = node.ranges ?? (node.slots ?? []).find((slot) => slot.name === "Item-List")?.children ?? [];
  const ranges = on("Show Ranges") ? items.filter((item) => typeof item.text === "string" && item.text).map((item) => {
    let id = slug(item.text);
    for (let n = 2; ids.has(id); n++) id = `${slug(item.text)}-${n}`;
    ids.add(id);
    return { id, label: item.text, selected: item.props?.Select === "Yes" };
  }) : [];
  const selected = ranges.findIndex((range) => range.selected);
  return {
    title: text("Title"),
    ...(on("Show Icon") && text("Icon") ? { icon: text("Icon") } : {}),
    ...(on("Show Description") && text("Description") ? { description: text("Description") } : {}),
    ...(on("Show Value") && text("Value") ? { value: text("Value") } : {}),
    ...(ranges.length ? { ranges: ranges.map(({ id, label }) => ({ id, label })) } : {}),
    // The first item is what the Segmented selects without `range`.
    ...(selected > 0 ? { range: ranges[selected].id } : {}),
    open: on("Show Open"),
  };
}

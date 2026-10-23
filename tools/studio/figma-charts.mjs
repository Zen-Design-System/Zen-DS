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

/** Every chart set; the plugin finds a set by its id, then by its name. Line, Stack-Bar, Bar, Area, Grouped-Bar and
 *  Combo have a Sector of 4 · 6 · 7 · 12 periods (the live file, 2026-10-17). Gauge, Funnel and Bullet became sets on
 *  2026-10-17 (Color): their old component ids are now the Color=Primary variants (15486:2467, 15486:2497, 15487:2516). */
export const CHART_SETS = {
  line: { id: "15929:120139", name: "Chart/Line-Chart" },
  stackBar: { id: "15930:4271", name: "Chart/Stack-Bar-Chart" },
  multiLine: { id: "15501:3054", name: "Chart/Multi-Line-Chart" },
  bar: { id: "15321:84071", name: "Chart/Bar-Chart" },
  donut: { id: "15324:80365", name: "Chart/Donut-Chart" },
  radial: { id: "15325:1135", name: "Chart/Radial-Chart" },
  heatmap: { id: "15326:1043", name: "Chart/Heatmap-Chart" },
  area: { id: "15484:2663", name: "Chart/Area-Chart" },
  groupedBar: { id: "15933:120083", name: "Chart/Grouped-Bar-Chart" },
  combo: { id: "15934:7580", name: "Chart/Combo-Chart" },
  gauge: { id: "15968:130382", name: "Chart/Gauge-Chart" },
  funnel: { id: "15968:130460", name: "Chart/Funnel-Chart" },
  barList: { id: "15487:2473", name: "Chart/Bar-List" },
  bullet: { id: "15968:130554", name: "Chart/Bullet-Chart" },
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
/** Sets with Color = Primary | Secondary (↔ palette; the live file, 2026-10-17): Line, Multi-Line, Bar-List and Heatmap
 *  have none. */
const COLOR = new Set(["bar", "stackBar", "area", "groupedBar", "combo", "donut", "radial", "gauge", "funnel", "bullet"]);
/** Chart/Multi-Line-Chart's Sector options: as many periods as the line has points. */
const SECTORS = [4, 6, 7, 12];
/** Sets whose Sector is the period count (2026-10-17): the smallest that holds every point, so none is dropped. */
const SECTORED = new Set(["line", "stackBar", "bar", "area", "groupedBar", "combo"]);
const sectorFor = (count) => SECTORS.find((sectors) => sectors >= count) ?? SECTORS[SECTORS.length - 1];
/** The paint style of the i-th series or slice (chartCore chartPalette; Figma's "Color Chart Sector/…", never variables). */
const SECTOR_STYLES = ["Primary", "Secondary", "Tertiary", "Quaternary", "Quinary", "Senary", "Septenary"].map((name) => `Color Chart Sector/${name}`);
/** The style of the i-th series or slice under `palette` (chartCore sectorAt): "secondary" swaps the first two. */
const sectorStyle = (index, palette) => {
  const slot = index % SECTOR_STYLES.length;
  return SECTOR_STYLES[palette === "secondary" && slot < 2 ? 1 - slot : slot];
};
/** chartCore defaultFormat: a number as the code writes it without `format` (a tick, a tooltip, a total). */
const formatNumber = (value) => (Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}K` : `${Math.round(value * 10) / 10}`);
/** chartCore niceScale: the axis top and its ticks (a 1 · 2 · 2.5 · 5 step, at most 5 steps). */
function niceScale(max, steps = 5) {
  if (!(max > 0)) return { top: steps, step: 1, ticks: Array.from({ length: steps + 1 }, (_, i) => i) };
  const magnitude = 10 ** Math.floor(Math.log10(max / steps));
  const step = [1, 2, 2.5, 5, 10, 20].map((m) => m * magnitude).find((s) => Math.ceil(max / s - 1e-9) <= steps) ?? max / steps;
  const count = Math.max(1, Math.ceil(max / step - 1e-9));
  return { top: step * count, step, ticks: Array.from({ length: count + 1 }, (_, i) => i * step) };
}
/** The legend's items in a chart set (Stack-Bar, Donut: seven, the ones past the data hidden; the live file 2026-10-17). */
const LEGEND_ITEMS = 7;
/** Chart/Donut-Chart's old sample total (Total Value's default until 2026-10-17, now "$296.8K"): a pull leaves it to
 *  the code, which totals its data — as it does a total the push wrote from the data (totalOf). */
const DONUT_SAMPLE_TOTALS = new Set(["$296,800"]);
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

/* ── marks: the page's data drawn in the set's own layers and slots (the Expenses import, 2026-10-17) ───────────── */

/** The legend's items: the series' names, the ones past them hidden (Legend-Item instances or Stack-Bar's frames). */
function legendMarks(labels, notes, where, setName, { instances }) {
  if (labels.length > LEGEND_ITEMS) notes.push(`${where}: ${labels.length} series; Figma's ${setName} legend names ${LEGEND_ITEMS} (the first ${LEGEND_ITEMS} are written)`);
  const edits = [];
  const nested = [];
  for (let i = 0; i < LEGEND_ITEMS; i++) {
    edits.push({ layer: ["Legend", `>Legend-Item[${i}]`], visible: i < labels.length });
    if (i >= labels.length) continue;
    if (instances) nested.push({ path: `Legend-Item[${i}]`, props: { Label: labels[i] } });
    else edits.push({ layer: ["Legend", `>Legend-Item[${i}]`, "Label"], characters: labels[i] });
  }
  return { edits, nested };
}

/**
 * Chart.tsx StackBarChart in Figma's Stack-Bar of `sectors` columns: each column's segments in its Value slot (a grid
 * of Flex rows, the empty top then the bar, so the bar is its total's share of the axis and scales with the chart; the
 * bar rounds and clips its series, Flex rows top to bottom), the period labels and the active period's tooltip on the Sector instances, the six axis labels and
 * the legend. Columns past the data stay empty.
 */
function stackBarMarks(values, sectors, notes, where, setName) {
  const data = Array.isArray(values.data) ? values.data.filter((item) => item && typeof item === "object") : [];
  const series = Array.isArray(values.series) ? values.series.filter((item) => item && typeof item === "object") : [];
  if (!data.length || !series.length) return null;
  if (data.length > sectors) notes.push(`${where}: ${data.length} periods; Figma's ${setName} draws ${sectors} (the first ${sectors} are written)`);
  if (series.some((item) => item.color)) notes.push(`${where}: a series' own colour is the palette's in Figma (Color Chart Sector styles)`);
  if (values.format === true) notes.push(`${where}: its format function is not written (Figma shows the default format)`);
  const totals = data.map((item) => series.reduce((sum, s) => sum + Math.max(0, Number(item.values?.[s.id]) || 0), 0));
  const { top, ticks } = niceScale(Math.max(0, ...totals));
  const active = typeof values.initialIndex === "number" ? Math.min(Math.max(0, values.initialIndex), data.length - 1) : data.length - 1;
  const slots = [];
  const nested = [];
  for (let k = 0; k < sectors; k++) {
    const item = data[k];
    const segments = item ? series.map((s, si) => ({ s, si, value: Math.max(0, Number(item.values?.[s.id]) || 0) })).filter((segment) => segment.value > 0).reverse() : [];
    const total = item ? totals[k] : 0;
    const rest = Math.max(0, top - total);
    const rows = [rest, total].filter((value) => value > 0);
    // The bar's own frame rounds and clips (chart.css .zen-chart__stack): the slot's corners sit on the empty top row.
    const stack = segments.length ? [{
      type: "FRAME", name: "Stack", radius: 8, radiusVar: "Corner-Radius/Small", clip: true,
      layout: { mode: "GRID", gap: 0, rowGap: 0, padding: [0, 0, 0, 0], grid: { columns: 1, rows: segments.length, rowSizes: segments.map((segment) => ({ type: "FLEX", value: (segment.value / total) * 100 })) } },
      children: segments.map((segment, row) => ({ type: "FRAME", name: segment.s.label ?? segment.s.id, fillStyle: sectorStyle(segment.si, values.palette), cell: { col: 0, row, span: 1 }, fillW: true, fillH: true })),
      cell: { col: 0, row: rows.length - 1, span: 1 }, fillW: true, fillH: true,
    }] : [];
    slots.push({
      name: "Value",
      within: [`.Primitives/Chart/Column/Stack-Bar/Single[${k}]`],
      children: [{
        type: "FRAME", name: "Segments",
        layout: { mode: "GRID", gap: 0, rowGap: 0, padding: [0, 0, 0, 0], grid: { columns: 1, rows: Math.max(1, rows.length), rowSizes: (rows.length ? rows : [top]).map((value) => ({ type: "FLEX", value: (value / top) * 100 })) } },
        children: stack,
        fillW: true, fillH: true,
      }],
    });
    nested.push({ path: `Sector-${k + 1}`, props: { Label: item ? words(item.label) : "", Select: k === active ? "Selected" : "Default", Tooltip: k === active } });
  }
  nested.push({ path: `Sector-${active + 1}/Tooltip/Text`, props: { Text: formatNumber(totals[active]) } });
  // Six axis labels, top to bottom: the code's ticks, or five equal steps of its top where it has fewer.
  const labels = ticks.length === 6 ? [...ticks].reverse() : Array.from({ length: 6 }, (_, i) => (top * (5 - i)) / 5);
  if (ticks.length !== 6) notes.push(`${where}: its axis has ${ticks.length - 1} steps; Figma's ${setName} has 5 (labels at fifths of ${formatNumber(top)})`);
  const grid = `Chart/Stack-Chart/Comparison-Stack/Specifics/${sectors}-Sectors`;
  const edits = labels.map((value, i) => ({ layer: [grid, `>Label[${i}]`], characters: formatNumber(value) }));
  const legend = legendMarks(series.map((s) => words(s.label)), notes, where, setName, { instances: false });
  return { slots, nested, edits: [...edits, ...legend.edits] };
}

/** DonutChart.tsx geometry: the ring 22% of the diameter, 4px straight gaps, 4px round corners, % pills at 6% and up. */
const RING = 22;
const SLICE_GAP_PX = 4;
const SLICE_CORNER_PX = 4;
/** A circle arc from angle a to b (radians from 12 o'clock, clockwise) as cubic Béziers, in the 100 × 100 box. */
function arcCubics(r, a, b) {
  const point = (angle) => [50 + r * Math.sin(angle), 50 - r * Math.cos(angle)];
  const parts = Math.max(1, Math.ceil(Math.abs(b - a) / (Math.PI / 2)));
  const out = [];
  for (let i = 0; i < parts; i++) {
    const from = a + ((b - a) * i) / parts;
    const to = a + ((b - a) * (i + 1)) / parts;
    const k = (4 / 3) * Math.tan((to - from) / 4);
    const [x0, y0] = point(from);
    const [x3, y3] = point(to);
    const c1 = [x0 + k * r * Math.cos(from), y0 + k * r * Math.sin(from)];
    const c2 = [x3 - k * r * Math.cos(to), y3 - k * r * Math.sin(to)];
    out.push(`C ${[...c1, ...c2, x3, y3].map((n) => Math.round(n * 1000) / 1000).join(" ")}`);
  }
  return out.join(" ");
}
/** DonutChart.tsx slicePath in cubic Béziers (Figma paths take no arcs): the slice inset by its corner, which the
 *  stroke's round joins add back. */
function slicePath(from, to, outer, inner, halfGap, corner) {
  const ro = outer - corner;
  const ri = inner + corner;
  const h = halfGap + corner;
  const edge = (r) => {
    const shift = Math.asin(Math.min(1, h / r));
    return to - shift > from + shift ? [from + shift, to - shift] : [(from + to) / 2, (from + to) / 2];
  };
  const at = (r, a) => `${Math.round((50 + r * Math.sin(a)) * 1000) / 1000} ${Math.round((50 - r * Math.cos(a)) * 1000) / 1000}`;
  const [oa, ob] = edge(ro);
  const [ia, ib] = edge(ri);
  return `M ${at(ro, oa)} ${arcCubics(ro, oa, ob)} L ${at(ri, ib)} ${arcCubics(ri, ib, ia)} Z`;
}

/**
 * DonutChart.tsx in Figma's Donut: the slices and % pills in its Ring-Slot (drawn in a 100 × 100 box placed over the
 * slot, so they follow the ring's size), the total and its caption as the set's properties, and the legend.
 */
function donutMarks(values, px, notes, where, setName) {
  const data = Array.isArray(values.data) ? values.data.filter((item) => item && typeof item === "object") : [];
  if (!data.length) return null;
  if (data.some((item) => item.color)) notes.push(`${where}: a slice's own colour is the palette's in Figma (Color Chart Sector styles)`);
  const total = data.reduce((sum, item) => sum + Math.max(0, Number(item.value) || 0), 0);
  const unit = 100 / px;
  let start = 0;
  const slices = data.map((item, i) => {
    const share = total > 0 ? (Math.max(0, Number(item.value) || 0) / total) * 100 : 0;
    const slice = { item, i, share, start, percent: Math.round(share) };
    start += share;
    return slice;
  });
  const drawn = slices.filter((slice) => slice.share > 0);
  const whole = { x: 0, y: 0, w: 1, h: 1 };
  const marks = drawn.length === 1
    ? [{ type: "ELLIPSE", name: "Slice", arc: { start: 0, end: Math.PI * 2, inner: (50 - RING) / 50 }, fillStyle: sectorStyle(drawn[0].i, values.palette), place: whole }]
    : drawn.map((slice) => ({
      type: "VECTOR", name: "Slice", box: { w: 100, h: 100 },
      d: slicePath((slice.start / 100) * Math.PI * 2, ((slice.start + slice.share) / 100) * Math.PI * 2, 50, 50 - RING, (SLICE_GAP_PX / 2) * unit, SLICE_CORNER_PX * unit),
      fillStyle: sectorStyle(slice.i, values.palette), strokeStyle: sectorStyle(slice.i, values.palette), strokeWeight: SLICE_CORNER_PX * 2, strokeJoin: "ROUND",
      place: whole,
    }));
  const r = 50 - RING / 2;
  const pills = values.showPercent === false ? [] : slices.filter((slice) => slice.share >= 6).map((slice) => {
    const angle = ((slice.start + slice.share / 2) / 100) * Math.PI * 2 - Math.PI / 2;
    return {
      type: "FRAME", name: "Pill", fill: "Background/Surface/Default", radius: 1000, radiusVar: "Corner-Radius/Rounded",
      layout: { mode: "HORIZONTAL", gap: 0, padding: [2, 4, 2, 4], paddingVars: ["Spacing/Padding/3XSmall", "Spacing/Padding/2XSmall", "Spacing/Padding/3XSmall", "Spacing/Padding/2XSmall"], counter: "CENTER", primary: "CENTER" },
      children: [{ type: "TEXT", characters: `${slice.percent}%`, textStyle: "Label/Small/Medium", fill: "Content/Neutral/Strongest", autoWidth: true }],
      place: { x: (50 + r * Math.cos(angle)) / 100, y: (50 + r * Math.sin(angle)) / 100, center: true },
    };
  });
  const legend = legendMarks(data.map((item) => words(item.label)), notes, where, setName, { instances: true });
  return { slots: [{ name: "Ring-Slot", children: [...marks, ...pills] }], nested: legend.nested, edits: legend.edits, total };
}

/**
 * The Figma set and properties of the chart `name` (push). `values`: its props as plain data (`data`, `compare`,
 * `orientation`…; a prop that holds no data, such as a handler, is `true`). Notes say what Figma cannot show.
 * → { set, props, slots?, nested?, edits?, drawn } or null when `name` is no chart; `drawn` says the page's data is
 * drawn (Stack-Bar, Donut), else Figma keeps its sample.
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
  if (COLOR.has(key)) props.Color = values.palette === "secondary" ? "Secondary" : "Primary";
  // As many periods as the data has (the smallest Sector that holds them).
  const periods = Array.isArray(values.data) ? values.data.length : null;
  const sectors = periods === null ? SECTORS[0] : sectorFor(periods);
  if (SECTORED.has(key)) props.Sector = `${sectors}-Sectors`;
  let marks = null;
  if (key === "stackBar") marks = stackBarMarks(values, sectors, notes, where, set.name);
  if (key === "donut") {
    const start = values.totalPosition === "start";
    const position = values.legendPosition ?? "bottom";
    const legend = start ? "Start" : { bottom: "Bottom", start: "Start", top: "Bottom", end: "End" }[position] ?? "Bottom";
    if (!start && position === "top") notes.push(`${where}: legendPosition="top": Figma's ${set.name} has its legend at Bottom, Start or End (Bottom drawn)`);
    props.Legend = legend;
    props.Total = start ? "Start" : "Centre";
    props.Size = ringSizeProp(values.size, notes, where, set.name);
    marks = donutMarks(values, RING_SIZES.find(([, figma]) => figma === props.Size)?.[2] ?? 168, notes, where, set.name);
    // The total's caption as the code shows it (the locale's "Total" without one) and its figure: the page's, else the
    // data's total as the code formats it.
    const label = values.label === undefined ? DONUT_TOTAL_LABEL : words(values.label);
    if (label) props["Total Label"] = label;
    else notes.push(`${where}: its label is not text (Figma's Total Label kept)`);
    if (words(values.value)) props["Total Value"] = words(values.value);
    else if (marks) props["Total Value"] = formatNumber(marks.total);
  }
  if (key === "radial") {
    const position = values.legendPosition ?? "bottom";
    const legend = { bottom: "Bottom", end: "End", top: "Bottom", start: "End" }[position] ?? "Bottom";
    if (position === "top" || position === "start") notes.push(`${where}: legendPosition="${position}": Figma's ${set.name} has its legend at Bottom or End (${legend} drawn)`);
    props.Legend = legend;
    props.Size = ringSizeProp(values.size, notes, where, set.name);
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
  if (!marks) return { set, props, drawn: false };
  return { set, props, drawn: true, ...(marks.slots?.length ? { slots: marks.slots } : {}), ...(marks.nested?.length ? { nested: marks.nested } : {}), ...(marks.edits?.length ? { edits: marks.edits } : {}) };
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

/** Ring sizes (DonutChart / RadialChart `size` ↔ Figma Size): the long spelling, its Figma value, its px. */
const RING_SIZES = [["small", "Small", 120], ["medium", "Medium", 168], ["large", "Large", 240], ["xlarge", "XLarge", 320]];
const RING_SHORT = { sm: "small", md: "medium", lg: "large", xl: "xlarge" };
/** A ring chart's `size` as Figma's Size, noting a px size Figma draws at its nearest step. */
function ringSizeProp(size, notes, where, setName) {
  if (size === undefined) return "Medium";
  if (typeof size === "number") {
    const [, figma, px] = RING_SIZES.reduce((best, step) => (Math.abs(step[2] - size) < Math.abs(best[2] - size) ? step : best));
    if (px !== size) notes.push(`${where}: size={${size}}: Figma's ${setName} has Small 120, Medium 168, Large 240 and XLarge 320 (${figma} drawn)`);
    return figma;
  }
  const long = RING_SHORT[size] ?? size;
  return RING_SIZES.find(([name]) => name === long)?.[1] ?? "Medium";
}

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
/** A donut's data total as the code formats it (the figure the push writes when the page sets no `value`). */
const totalOf = (props) => {
  const data = plainOf(props.data);
  return Array.isArray(data) ? formatNumber(data.reduce((sum, item) => sum + Math.max(0, Number(item?.value) || 0), 0)) : null;
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

/** Figma's own period labels per Sector (the live file, 2026-10-17: as Multi-Line). */
const SECTOR_LABELS = { 4: ["Q1", "Q2", "Q3", "Q4"], 6: MONTHS.slice(6), 7: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], 12: MONTHS };
/**
 * A sample as `count` periods, so a pulled chart pushes back with the same Sector: a monthly sample as months ending
 * where it ends (monthsOf), any other its values in turn under Figma's own labels for that Sector.
 */
function periodsOf(props, count) {
  const data = plainOf(props.data);
  if (!Array.isArray(data) || !data.length || data.length === count) return props;
  if (MONTHS.includes(data[data.length - 1]?.label)) return monthsOf(props, count);
  const labels = SECTOR_LABELS[count] ?? Array.from({ length: count }, (_, index) => `P${index + 1}`);
  return { ...props, data: toValue(labels.map((label, index) => ({ ...data[index % data.length], label }))) };
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
  if (key === "multiLine" || SECTORED.has(key)) {
    const sectors = Number.parseInt(String(figma.Sector ?? ""), 10);
    if (SECTORS.includes(sectors)) props = key === "multiLine" ? monthsOf(props, sectors) : periodsOf(props, sectors);
  }
  if (key === "bar") { if (figma.Orientation === "Horizontal") set("orientation", "horizontal"); else unset("orientation"); }
  if (key === "area") { if (figma.Type === "Stacked") set("type", "stacked"); else unset("type"); }
  if (COLOR.has(key)) { if (figma.Color === "Secondary") set("palette", "secondary"); else unset("palette"); }
  if (key === "donut") {
    if (figma.Total === "Start") { set("totalPosition", "start"); unset("legendPosition"); }
    else if (figma.Legend === "Start") set("legendPosition", "start");
    else if (figma.Legend === "End") set("legendPosition", "end");
    const label = figma["Total Label"];
    if (typeof label === "string" && label && label !== DONUT_TOTAL_LABEL) set("label", label);
    const value = figma["Total Value"];
    if (typeof value === "string" && value && !DONUT_SAMPLE_TOTALS.has(value) && value !== totalOf(props)) set("value", value);
  }
  if (key === "radial" && figma.Legend === "End") set("legendPosition", "end");
  if (key === "donut" || key === "radial") {
    const step = RING_SIZES.find(([, name]) => name === figma.Size);
    if (step && step[0] !== "medium") set("size", step[0]); else unset("size");
  }
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

// Zen MetricCard `type` ↔ the Zen Figma file's Metric-Card set (6643:64008, page ❖ Metric Widget 595:54968; read live
// 2026-10-14, docs/research/widget-patterns-spec-2026-10-14.md "As built (metric-types)"). Type = KPI · Sparkline ·
// Spark-Bars · Goal-Progress · Comparison · Category-Bar · Hero · Tile: each variant a Card whose Content slot holds a
// Title-Highlight Metric-Inline and the type's own drawing (Tile: a Primitives/Metric/Metric-Tile, 16104:4826). The push (figma-push.mjs) writes a typed MetricCard as that
// set: its Type, the title and number (Label, Metric-Number), the trend badge, the Card's Theme / Color / Sub-Action and,
// for Comparison, each column's title, number and trend. The drawing is slot content, the instance's own, so the push
// draws the page's data in it as MetricMarks.tsx does (the plugin's `edits`; 2026-10-16, the Expenses import showed
// Figma's sample marks): the Sparkline's and the Hero's line and area, the Spark-Bars' heights, the goal's Progress-Bar
// (label, value text, nearest fill step) and the footer under the drawing. Category-Bar keeps Figma's sample. The pull
// takes the data from the matching Studio palette sample (src/platform/studio/slots/palette.ts, the Widgets group). A
// KPI MetricCard keeps its Card + Metric-Inline push. Isomorphic: the Studio loads it in the browser too.
import { docFromText } from "./doc.mjs";
import { PROGRESS_TRACK, progressColumns, progressStep } from "./figma-steps.mjs";
import { zenLabels } from "../../src/components/_shared/labels.ts";
import { paletteItem } from "../../src/platform/studio/slots/palette.ts";

/** The set; the plugin finds it by id, then by name. */
export const METRIC_CARD_SET = { id: "6643:64008", name: "Metric-Card" };
/** MetricCard type → Figma Type (KPI is not pushed as this set: MetricCard without a type draws Card + Metric-Inline). */
export const METRIC_CARD_TYPE = { kpi: "KPI", sparkline: "Sparkline", "spark-bars": "Spark-Bars", "goal-progress": "Goal-Progress", comparison: "Comparison", "category-bar": "Category-Bar", hero: "Hero", tile: "Tile" };
const TYPE_OF = Object.fromEntries(Object.entries(METRIC_CARD_TYPE).map(([code, figma]) => [figma, code]));
/** What each type draws that Figma keeps as its sample, and the palette widget whose data the pull takes. */
const SAMPLE = { sparkline: "widget-kpi-sparkline", "spark-bars": "widget-kpi-spark-bars", "goal-progress": "widget-goal-progress", "category-bar": "widget-category-split", hero: "widget-hero" };
const DATA = { sparkline: ["series"], "spark-bars": ["series"], "goal-progress": ["goal"], "category-bar": ["categories"], hero: ["series", "footer"] };
const DRAWING = { sparkline: "line", "spark-bars": "bars", "goal-progress": "goal", "category-bar": "categories", hero: "line" };
/** Comparison's title is a text layer of the variant named after its sample words (no Metric-Inline holds it). */
export const COMPARISON_TITLE = "Cash flow · September";
/** Figma's Comparison draws three columns. */
const COLUMNS = 3;
/** The Metric-Inline inside a Metric-Card (its layerKey) and its trend badge. */
const METRIC = "Title-Highlight";
/** Type=Tile: the Metric-Tile in the Card's slot (its layerKey), its Trend and its Dock-Icon. */
const TILE = "Metric-Tile";
/** Metric-Tile Content for a Solid card's colour (card-content.ts cardContentOf: content follows the fill). */
const TILE_CONTENT = { neutral: "Inverse", accent: "On-Accent", yellow: "On-Bright", brand: "On-Color", cyan: "On-Color", orange: "On-Color" };
const tileContentOf = (theme, color) => (theme === "solid" ? TILE_CONTENT[color] ?? "Inverse" : "Default");
const TILE_ICON = "icon-activity-line";
const TREND_OPTION = { positive: "Positive", negative: "Negative", normal: "Normal" };
const TREND_DIRECTION = { Positive: "positive", Negative: "negative", Normal: "normal" };
/** Card Theme / Color (Figma Card 6643:51021) ↔ code; Figma's Hero card is Solid Brand with its fill overridden to
 *  Support/Brand/Pale, which code draws as theme="pale" color="brand" (MetricCard's Hero default). */
// Renamed 2026-10-21: Flat → Default, Border × Surface=Flat → Flat-Border.
const CARD_THEME = { shadow: "Shadow", default: "Default", pale: "Pale", "semi-pale": "Pale", border: "Border", "flat-border": "Flat-Border", "on-container": "On-Container", solid: "Solid", subtle: "Subtle" };
const THEME_OF = { Shadow: "shadow", Default: "default", Pale: "pale", Border: "border", "Flat-Border": "flat-border", "On-Container": "on-container", Solid: "solid", Subtle: "subtle" };
const capital = (word) => (typeof word === "string" && word ? word[0].toUpperCase() + word.slice(1) : word);
const words = (value) => (typeof value === "string" || typeof value === "number" ? String(value) : null);

/** Whether a MetricCard of these plain props is pushed as the Metric-Card set (a type other than KPI). */
export const metricCardTyped = (values) => typeof values.type === "string" && values.type !== "kpi" && values.type in METRIC_CARD_TYPE;

/** The drawing's layers in a Metric-Card (Card › Content slot › Metric-Body; the live file, 2026-10-16). */
const BODY = "Metric-Body";
/** Sparkline and Hero: a 64px Sparkline frame, its Line 4px inside the top and bottom, its Area down to the bottom. */
const SPARK = { line: "Sparkline/Line", area: "Sparkline/Area", height: 64, inset: 4 };
/** Spark-Bars: eleven Bar layers, then the current one, Bar-Active. */
const BARS = { bar: "Spark-Bars/Bar", current: "Spark-Bars/Bar-Active", count: 12 };
const finite = (list) => (Array.isArray(list) ? list.filter((value) => typeof value === "number" && Number.isFinite(value)) : []);
const round = (value) => Math.round(value * 100) / 100;
/** chartCore defaultFormat: a number as MetricCard writes it without `format` (the goal's target). */
const defaultFormat = (value) => (Math.abs(value) >= 1000 ? `${Math.round(value / 100) / 10}K` : `${Math.round(value * 10) / 10}`);

/** MetricMarks.tsx Sparkline: the line and its area, in the 100 × 64 box the code draws them in. */
function sparkEdits(series) {
  const values = finite(series);
  if (!values.length) return [];
  const drawn = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...drawn);
  const span = Math.max(...drawn) - min;
  const y = (value) => SPARK.inset + (span > 0 ? 1 - (value - min) / span : 0.5) * (SPARK.height - 2 * SPARK.inset);
  const line = drawn.map((value, index) => `${index ? "L" : "M"} ${round((index / Math.max(1, drawn.length - 1)) * 100)} ${round(y(value))}`).join(" ");
  const box = { w: 100, h: SPARK.height };
  return [{ layer: SPARK.line, vector: { d: line, ...box } }, { layer: SPARK.area, vector: { d: `${line} L 100 ${SPARK.height} L 0 ${SPARK.height} Z`, ...box } }];
}

/** MetricMarks.tsx SparkBars: each bar a share of the largest value, the last one current, right-aligned (fewer values
 *  than Figma's twelve hide the first bars; more keep the last twelve). */
function barEdits(series, notes, where) {
  const values = finite(series);
  if (!values.length) return [];
  const max = Math.max(0, ...values);
  const share = (value) => (max > 0 ? round(Math.max(0, value) / max) : 0);
  if (values.length > BARS.count) notes.push(`${where}: ${values.length} bars; Figma's Spark-Bars draws ${BARS.count} (the last ${BARS.count} are written)`);
  const shown = values.slice(-BARS.count);
  const before = shown.slice(0, -1);
  const plain = BARS.count - 1;
  const edits = Array.from({ length: plain }, (_, index) => {
    const value = before[index - (plain - before.length)];
    return value === undefined ? { layer: `${BARS.bar}[${index}]`, visible: false } : { layer: `${BARS.bar}[${index}]`, visible: true, share: share(value) };
  });
  return [...edits, { layer: BARS.current, share: share(shown[shown.length - 1]) }];
}

/** MetricWidget.tsx goal-progress: value / target as a percentage, null without a numeric target. */
const goalPercent = (goal) => (goal && typeof goal === "object" && typeof goal.target === "number" ? (goal.target > 0 ? (Number(goal.value) / goal.target) * 100 : 0) : null);

/** The goal's stacked accent ProgressBar: its label, value text and nearest step (its exact fill is an edit). */
function goalNested(goal) {
  const percent = goalPercent(goal);
  if (percent === null) return [];
  const label = words(goal.label) ?? zenLabels.en.metricGoalOf(defaultFormat(goal.target));
  const value = words(goal.valueLabel) ?? `${Math.round(percent)}%`;
  return [{ path: "Progress-Bar", props: { Text: label, Progress: progressStep(Math.max(0, Math.min(100, percent))) }, texts: { Value: value } }];
}

/**
 * A typed MetricCard (its props as plain data; `footerText` the words of a Button footer, `footerLayers` the footer as
 * pushed layers) as the Metric-Card instance: { set, props, texts, nested, edits }. Notes say what Figma draws from its
 * own sample.
 */
export function metricCardFigma(values, { notes, where, footerText = null, footerLayers = [] }) {
  const type = values.type;
  const nested = [];
  const texts = {};
  const edits = [];
  // The Card: its Theme and Color when they are not the variant's (Shadow; the Hero's Solid Brand drawn Pale), and its
  // ⋮ Sub-Action only when the code has one.
  const theme = values.theme ?? (type === "hero" ? "pale" : "shadow");
  const color = values.color ?? (type === "hero" && theme === "pale" ? "brand" : undefined);
  const heroDefault = type === "hero" && theme === "pale" && color === "brand";
  const card = { "Sub-Action": Boolean(values.subAction) };
  if (!heroDefault && CARD_THEME[theme] && !(type !== "hero" && theme === "shadow")) card.Theme = CARD_THEME[theme];
  if (!heroDefault && color && (theme === "pale" || theme === "solid")) card.Color = capital(color);
  nested.push({ path: "Card", props: card });
  if (type === "hero" && !heroDefault && theme === "solid") notes.push(`${where}: Figma's Hero card keeps its Brand Pale fill; pick the Card's fill (Background/Neutral/Solid for Solid Neutral) in Figma`);
  const trendOf = (trend, path) => {
    if (!trend || typeof trend !== "object") return [{ path: path.replace(/\/Trend$/, ""), props: { Trend: false } }];
    return [{ path: path.replace(/\/Trend$/, ""), props: { Trend: true } }, { path, props: { Trend: TREND_OPTION[trend.direction] ?? "Positive" }, ...(words(trend.label) ? { textList: [words(trend.label)] } : {}) }];
  };
  if (type === "tile") {
    // The Metric-Tile: its texts are its own TEXT properties, its Content follows the card's fill, Small below Medium.
    const trend = values.trend && typeof values.trend === "object" ? values.trend : null;
    const tile = { Trend: Boolean(trend), "Dock-Icon": values.icon !== false };
    if (words(values.label)) tile["Metric-Title"] = words(values.label);
    if (words(values.value)) tile["Metric-Number"] = words(values.value);
    if (["sm", "small", "xs", "xsmall"].includes(values.size)) tile.Size = "Small";
    const content = tileContentOf(theme, color);
    if (content !== "Default") tile.Content = content;
    nested.push({ path: TILE, props: tile });
    if (trend) nested.push({ path: `${TILE}/Trend`, props: { Trend: TREND_OPTION[trend.direction] ?? "Positive" }, ...(words(trend.label) ? { textList: [words(trend.label)] } : {}) });
    if (typeof values.icon === "string" && values.icon !== TILE_ICON) nested.push({ path: `${TILE}/Metric-Icon`, props: { "Icon-Src": values.icon } });
    if (values.footer) notes.push(`${where}: a tile has no footer in Figma's Metric-Tile`);
    return { set: METRIC_CARD_SET, props: { Type: METRIC_CARD_TYPE[type] }, nested };
  }
  if (type === "comparison") {
    if (words(values.label)) texts[COMPARISON_TITLE] = words(values.label);
    const columns = Array.isArray(values.comparison) ? values.comparison : [];
    if (columns.length !== COLUMNS) notes.push(`${where}: ${columns.length} comparison column${columns.length === 1 ? "" : "s"}; Figma's Comparison draws ${COLUMNS} (the first ${COLUMNS} are written)`);
    columns.slice(0, COLUMNS).forEach((column, index) => {
      const at = `${METRIC}[${index}]`;
      const own = {};
      if (words(column?.label)) own.Label = words(column.label);
      if (words(column?.value)) own["Metric-Number"] = words(column.value);
      nested.push(...trendOf(column?.trend, `${at}/Trend`).map((entry, i) => (i === 0 ? { ...entry, texts: own } : entry)));
    });
  } else {
    if (words(values.label)) texts.Label = words(values.label);
    if (words(values.value)) texts["Metric-Number"] = words(values.value);
    nested.push(...trendOf(values.trend, `${METRIC}/Trend`));
    // The drawing from the page's data; Category-Bar keeps Figma's sample.
    if (type === "sparkline" || type === "hero") edits.push(...sparkEdits(values.series));
    if (type === "spark-bars") edits.push(...barEdits(values.series, notes, where));
    if (type === "goal-progress") nested.push(...goalNested(values.goal));
    if (type === "goal-progress" && goalPercent(values.goal) !== null) edits.push({ layer: `Progress-Bar/${PROGRESS_TRACK}`, columns: progressColumns(goalPercent(values.goal)) });
    const drawn = { sparkline: "series", hero: "series", "spark-bars": "series", "goal-progress": "goal" }[type];
    if (!drawn || (drawn === "series" ? !finite(values.series).length : !goalNested(values.goal).length)) notes.push(`${where}: Figma's Metric-Card ${METRIC_CARD_TYPE[type]} draws its own sample ${DRAWING[type]}`);
  }
  // The Hero's button: its words on Figma's Button/Main. Any other type's footer goes under its drawing (the code's
  // .zen-metric-card__footer, the Metric-Body's last layer); none drops the one an earlier import added.
  if (type === "hero") {
    // By its full name: "Button" alone found the hidden Button/Icon-Main first (corpus test 2026-10-18).
    if (footerText) nested.push({ path: "Button/Main", textList: [footerText] });
    else if (values.footer) notes.push(`${where}: its footer is not a Button with words (Figma's Hero keeps its "View report" button)`);
  } else edits.push({ layer: BODY, append: footerLayers });
  return { set: METRIC_CARD_SET, props: { Type: METRIC_CARD_TYPE[type] }, ...(Object.keys(texts).length ? { texts } : {}), nested, ...(edits.length ? { edits } : {}) };
}

/* ── pull ── */

const literal = (value) => ({ kind: "literal", value });
const object = (fields) => ({ kind: "object", fields });
/** Words → an id ("Client Services" → client-services). */
const slug = (text) => String(text).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "column";

const samples = new Map();
/** A palette widget's root element (props as document values) as a builder page writes it; null without one. */
function sampleElement(id) {
  if (samples.has(id)) return samples.get(id);
  const item = paletteItem(id);
  let element = null;
  if (item) {
    const ctx = { host: "Stack", slot: { component: "Stack", prop: "children" }, headingLevel: 3, mobile: false, uid: "figma" };
    const code = (item.builder ?? item.build)(ctx);
    const text = `// @zen-page {"format":1,"title":"Sample"}\nimport { Board, Screen, proto } from "@zen-ds/react/builder";\nimport { ${item.components.join(", ")} } from "@zen-ds/react";\n\nexport const mock = {};\n\nexport default function Page() {\n  return (\n    <Board>\n      <Screen id="sample" title="Sample" device="desktop">\n${code}\n      </Screen>\n    </Board>\n  );\n}\n`;
    const root = docFromText(text, { newId: () => "sample" }).doc?.board.children[0]?.children.find((child) => child.kind === "element") ?? null;
    element = root ? { name: root.name, props: root.props } : null;
  }
  samples.set(id, element);
  return element;
}

/** A nested entry by its path. */
const nestedAt = (node, path) => (node.nested ?? []).find((entry) => entry.path === path) ?? null;
/** A trend read from its Metric-Inline's Trend toggle and badge (push JSON, or the reader's). */
function trendAt(node, path) {
  const metric = nestedAt(node, path.replace(/\/Trend$/, ""));
  if (metric?.props?.Trend === false) return null;
  const badge = nestedAt(node, path);
  if (!badge) return null;
  const fields = { direction: literal(TREND_DIRECTION[badge.props?.Trend] ?? "positive") };
  const text = badge.textList?.[0] ?? badge.text;
  if (text) fields.label = literal(text);
  return object(fields);
}

/** Whether a read instance is a Metric-Card. */
export const isMetricCard = (node) => node?.type === "INSTANCE" && (node.set?.id === METRIC_CARD_SET.id || node.set?.name === METRIC_CARD_SET.name);

/**
 * A Metric-Card instance (read in Figma, or the push's own JSON) as its MetricCard: { name, props } with document values,
 * the data its Figma sample stands for from the Studio palette's widget of that type.
 */
export function metricCardFromFigma(node, { notes, where }) {
  const type = TYPE_OF[node.props?.Type] ?? "kpi";
  const props = {};
  const texts = node.texts ?? {};
  // The Card: Theme and Color back to the code; the variant's own (Shadow, the Hero's Solid Brand) are its defaults.
  const card = nestedAt(node, "Card")?.props ?? {};
  const theme = THEME_OF[card.Theme];
  const color = typeof card.Color === "string" ? card.Color.toLowerCase() : undefined;
  const heroDefault = type === "hero" && ((theme === "solid" && color === "brand") || (theme === "pale" && color === "brand") || !theme);
  if (!heroDefault && theme && !(type !== "hero" && theme === "shadow")) props.theme = literal(theme);
  if (!heroDefault && color && color !== "neutral" && (theme === "pale" || theme === "solid")) props.color = literal(color);
  if (!heroDefault && theme === "solid" && color === "neutral") props.color = literal("neutral");
  if (card["Sub-Action"] === true) notes.push(`${where}: Sub-Action shows in Figma; set subAction on the MetricCard in the Studio`);
  // As the palette writes it: theme and color, then the type.
  if (type !== "kpi") props.type = literal(type);
  if (type === "comparison") {
    if (texts[COMPARISON_TITLE] ?? texts.Title) props.label = literal(texts[COMPARISON_TITLE] ?? texts.Title);
    const columns = [];
    const ids = new Set();
    for (let index = 0; index < COLUMNS; index++) {
      const metric = nestedAt(node, `${METRIC}[${index}]`);
      if (!metric) continue;
      const label = metric.texts?.Label ?? "";
      const value = metric.texts?.["Metric-Number"] ?? "";
      let id = slug(label);
      for (let n = 2; ids.has(id); n++) id = `${slug(label)}-${n}`;
      ids.add(id);
      const fields = { id: literal(id), label: literal(label), value: literal(value) };
      const trend = trendAt(node, `${METRIC}[${index}]/Trend`);
      if (trend) fields.trend = trend;
      columns.push(object(fields));
    }
    props.comparison = { kind: "array", items: columns };
    return { name: "MetricCard", props };
  }
  if (type === "tile") {
    // Its texts, Size, trend and icon; the Content follows the card's fill in code (a Figma Content that does not is a note).
    const tile = nestedAt(node, TILE)?.props ?? {};
    if (typeof tile["Metric-Title"] === "string") props.label = literal(tile["Metric-Title"]);
    if (typeof tile["Metric-Number"] === "string") props.value = literal(tile["Metric-Number"]);
    const tileTrend = trendAt(node, `${TILE}/Trend`);
    if (tileTrend) props.trend = tileTrend;
    if (tile.Size === "Small") props.size = literal("sm");
    const icon = nestedAt(node, `${TILE}/Metric-Icon`)?.props?.["Icon-Src"];
    if (tile["Dock-Icon"] === false) props.icon = literal(false);
    else if (typeof icon === "string" && icon.startsWith("icon-") && icon !== TILE_ICON) props.icon = literal(icon);
    const content = tileContentOf(theme ?? "shadow", color ?? "neutral");
    if (typeof tile.Content === "string" && tile.Content !== content) notes.push(`${where}: Figma's Metric-Tile is Content=${tile.Content}; the code follows the card's fill (${content})`);
    return { name: "MetricCard", props };
  }
  if (texts.Label) props.label = literal(texts.Label);
  if (texts["Metric-Number"]) props.value = literal(texts["Metric-Number"]);
  const trend = trendAt(node, `${METRIC}/Trend`);
  if (trend) props.trend = trend;
  if (type === "kpi") return { name: "MetricCard", props };
  const sample = sampleElement(SAMPLE[type]);
  if (!sample) { notes.push(`${where}: no Studio sample for Metric-Card ${node.props?.Type} (its ${DATA[type].join(" and ")} left out)`); return { name: "MetricCard", props }; }
  for (const name of DATA[type]) if (sample.props[name]) props[name] = sample.props[name];
  // The Hero's button words: Figma's own, on the sample's Button.
  // The push names it by its full name (Button/Main), the reader by its first part.
  const button = nestedAt(node, "Button/Main") ?? nestedAt(node, "Button");
  const footer = props.footer;
  const words_ = button?.textList?.[0] ?? button?.text;
  if (footer?.kind === "element" && words_ && footer.node.children?.length === 1 && footer.node.children[0].kind === "text" && footer.node.children[0].value !== words_) {
    props.footer = { ...footer, node: { ...footer.node, children: [{ ...footer.node.children[0], value: words_ }] } };
  }
  notes.push(`${where}: its ${DATA[type].filter((name) => name !== "footer").join(" and ")} is the Studio sample's (Figma's Metric-Card ${node.props?.Type} draws its own)`);
  return { name: "MetricCard", props };
}

/**
 * The Figma-side reader (figma-pull's use_figma script calls it for a Metric-Card instance): the same shape the push
 * writes — Type; Label and Metric-Number (Comparison: its title and each column's); each Metric-Inline's Trend toggle
 * and badge; Tile's Metric-Tile (its properties, Trend and Metric-Icon); the Card's Theme / Color / Sub-Action; the Hero
 * button's words. Uses the reader's propsOf and firstText.
 */
export const READ_METRIC_CARD = `const readMetricCard = async (instance, set) => {
  const out = { type: "INSTANCE", id: instance.id, name: instance.name, set, props: await propsOf(instance), texts: {}, nested: [] };
  const card = instance.findOne((n) => n.type === "INSTANCE" && n.name === "Card");
  if (card) out.nested.push({ path: "Card", props: await propsOf(card) });
  if (out.props.Type === "Tile") {
    const tile = instance.findOne((n) => n.type === "INSTANCE" && /Metric-Tile$/.test(n.name));
    if (!tile) return out;
    out.nested.push({ path: "Metric-Tile", props: await propsOf(tile) });
    const trend = tile.findOne((n) => n.type === "INSTANCE" && n.visible && n.name === "Trend");
    if (trend) out.nested.push({ path: "Metric-Tile/Trend", props: await propsOf(trend), textList: [firstText(trend)].filter(Boolean) });
    const dock = tile.findOne((n) => n.type === "INSTANCE" && n.name === "Metric-Icon");
    if (dock) out.nested.push({ path: "Metric-Tile/Metric-Icon", props: await propsOf(dock) });
    return out;
  }
  const metrics = instance.findAll((n) => n.type === "INSTANCE" && n.visible && /^Primitives\\/Metric\\/Metric-Inline\\//.test(n.name));
  const textIn = (node, name) => { const t = node.findOne((n) => n.type === "TEXT" && n.visible && n.name === name); return t ? t.characters : null; };
  const comparison = out.props.Type === "Comparison";
  if (comparison) {
    const body = instance.findOne((n) => n.type === "FRAME" && n.name === "Metric-Body");
    const title = body ? body.children.find((n) => n.type === "TEXT" && n.visible) : null;
    if (title) out.texts.Title = title.characters;
  } else if (metrics[0]) {
    const label = textIn(metrics[0], "Label"); const value = textIn(metrics[0], "Metric-Number");
    if (label !== null) out.texts.Label = label;
    if (value !== null) out.texts["Metric-Number"] = value;
  }
  for (let i = 0; i < metrics.length; i++) {
    const at = comparison ? "Title-Highlight[" + i + "]" : "Title-Highlight";
    const entry = { path: at, props: await propsOf(metrics[i]) };
    if (comparison) entry.texts = { Label: textIn(metrics[i], "Label") || "", "Metric-Number": textIn(metrics[i], "Metric-Number") || "" };
    out.nested.push(entry);
    const trend = metrics[i].findOne((n) => n.type === "INSTANCE" && n.visible && n.name === "Trend");
    if (trend) out.nested.push({ path: at + "/Trend", props: await propsOf(trend), textList: [firstText(trend)].filter(Boolean) });
    if (!comparison) break;
  }
  const button = instance.findOne((n) => n.type === "INSTANCE" && n.visible && /^Button\\/(Main|Overlay)$/.test(n.name));
  if (button) out.nested.push({ path: "Button", textList: [firstText(button)].filter(Boolean) });
  return out;
};`;

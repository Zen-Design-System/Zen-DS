// Zen MetricCard `type` ↔ the Zen Figma file's Metric-Card set (6643:64008, page ❖ Metric Widget 595:54968; read live
// 2026-10-14, docs/research/widget-patterns-spec-2026-10-14.md "As built (metric-types)"). Type = KPI · Sparkline ·
// Spark-Bars · Goal-Progress · Comparison · Category-Bar · Hero: each variant a Card whose Content slot holds a
// Title-Highlight Metric-Inline and the type's own drawing. The push (figma-push.mjs) writes a typed MetricCard as that
// set: its Type, the title and number (Label, Metric-Number), the trend badge, the Card's Theme / Color / Sub-Action and,
// for Comparison, each column's title, number and trend. The marks are Figma's own sample (no property carries a series,
// a goal or the categories), as for the charts (figma-charts.mjs): the pull takes them from the matching Studio palette
// sample (src/platform/studio/slots/palette.ts, the Widgets group). A KPI MetricCard keeps its Card + Metric-Inline push.
// Isomorphic: the Studio loads it in the browser too.
import { docFromText } from "./doc.mjs";
import { paletteItem } from "../../src/platform/studio/slots/palette.ts";

/** The set; the plugin finds it by id, then by name. */
export const METRIC_CARD_SET = { id: "6643:64008", name: "Metric-Card" };
/** MetricCard type → Figma Type (KPI is not pushed as this set: MetricCard without a type draws Card + Metric-Inline). */
export const METRIC_CARD_TYPE = { kpi: "KPI", sparkline: "Sparkline", "spark-bars": "Spark-Bars", "goal-progress": "Goal-Progress", comparison: "Comparison", "category-bar": "Category-Bar", hero: "Hero" };
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
const TREND_OPTION = { positive: "Positive", negative: "Negative", normal: "Normal" };
const TREND_DIRECTION = { Positive: "positive", Negative: "negative", Normal: "normal" };
/** Card Theme / Color (Figma Card 6643:51021) ↔ code; Figma's Hero card is Solid Brand with its fill overridden to
 *  Support/Brand/Pale, which code draws as theme="pale" color="brand" (MetricCard's Hero default). */
const CARD_THEME = { shadow: "Shadow", flat: "Flat", pale: "Pale", "semi-pale": "Pale", border: "Border", "on-container": "On-Container", solid: "Solid" };
const THEME_OF = { Shadow: "shadow", Flat: "flat", Pale: "pale", Border: "border", "On-Container": "on-container", Solid: "solid" };
const capital = (word) => (typeof word === "string" && word ? word[0].toUpperCase() + word.slice(1) : word);
const words = (value) => (typeof value === "string" || typeof value === "number" ? String(value) : null);

/** Whether a MetricCard of these plain props is pushed as the Metric-Card set (a type other than KPI). */
export const metricCardTyped = (values) => typeof values.type === "string" && values.type !== "kpi" && values.type in METRIC_CARD_TYPE;

/**
 * A typed MetricCard (its props as plain data; `footerText` the words of a Button footer) as the Metric-Card instance:
 * { set, props, texts, nested }. Notes say what Figma draws from its own sample.
 */
export function metricCardFigma(values, { notes, where, footerText = null }) {
  const type = values.type;
  const nested = [];
  const texts = {};
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
    notes.push(`${where}: Figma's Metric-Card ${METRIC_CARD_TYPE[type]} draws its own sample ${DRAWING[type]}`);
  }
  // The Hero's button: its words on Figma's Button/Main.
  if (type === "hero") {
    if (footerText) nested.push({ path: "Button", textList: [footerText] });
    else if (values.footer) notes.push(`${where}: its footer is not a Button with words (Figma's Hero keeps its "View report" button)`);
  }
  return { set: METRIC_CARD_SET, props: { Type: METRIC_CARD_TYPE[type] }, ...(Object.keys(texts).length ? { texts } : {}), nested };
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
  if (texts.Label) props.label = literal(texts.Label);
  if (texts["Metric-Number"]) props.value = literal(texts["Metric-Number"]);
  const trend = trendAt(node, `${METRIC}/Trend`);
  if (trend) props.trend = trend;
  if (type === "kpi") return { name: "MetricCard", props };
  const sample = sampleElement(SAMPLE[type]);
  if (!sample) { notes.push(`${where}: no Studio sample for Metric-Card ${node.props?.Type} (its ${DATA[type].join(" and ")} left out)`); return { name: "MetricCard", props }; }
  for (const name of DATA[type]) if (sample.props[name]) props[name] = sample.props[name];
  // The Hero's button words: Figma's own, on the sample's Button.
  const button = nestedAt(node, "Button");
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
 * and badge; the Card's Theme / Color / Sub-Action; the Hero button's words. Uses the reader's propsOf and firstText.
 */
export const READ_METRIC_CARD = `const readMetricCard = async (instance, set) => {
  const out = { type: "INSTANCE", id: instance.id, name: instance.name, set, props: await propsOf(instance), texts: {}, nested: [] };
  const card = instance.findOne((n) => n.type === "INSTANCE" && n.name === "Card");
  if (card) out.nested.push({ path: "Card", props: await propsOf(card) });
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

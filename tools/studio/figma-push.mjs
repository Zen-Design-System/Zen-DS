// Zen Studio → Figma (core rebuild Q4, spec docs/research/studio-figma-push-spec-2026-10-12.md §3.1): a page as the JSON
// figmaReadCode (figma-pull.mjs) returns, so the Zen plugin's Import from Studio places it and a later pull reads it back
// the same — the round trip is the test (figma-push.selftest.mjs). Isomorphic: no Node imports; the caller passes the
// mapping (figma-pull.mjs repoMapping / figmaMapping) and the nested layers (inspector/nestedLayers.generated.ts).
//
//   figmaFromPage(text, { mapping, nestedLayers }) → { frame, notes }    every node keyed by its element's document id
//   figmaPackage(text, { mapping, nestedLayers, page: { id, title } }) → { pkg, notes }   the file the plugin imports
//
// Frames (Stack, Grid; absolute layers with their constraints and insets), text, instances (variant, boolean, text and
// icon properties, the label, slot content, `overrides` as nested instances, an icon-only control's name), data slots
// as their item instances (Sidebar sections, Breadcrumbs, Segmented), node slots (Sidebar brand / footer, Dashboard
// header rows), Sidebar footer rows and dashboard actions, the Dashboard header's texts and Search, a Table as Figma
// draws it (a frame of Data-Rows, header and content cells) and pictures (`images`, filled by the caller: the plugin has
// no network).
import { docFromText } from "./doc.mjs";
import { GAP_PX, LONG_TO_SHORT, PADDING_PX, sameValue } from "./figma-steps.mjs";
import { SCREEN_CHROME, screenLayout } from "./screen-chrome.mjs";
import { contentToneToken } from "../../src/components/_shared/contentTone.ts";
import { iconAliases } from "../../src/icons/generated/aliases.ts";

/** A spacing step's Figma variable name: md → Medium ("Spacing/Gap/Medium"). */
const STEP_NAMES = { "3xs": "3XSmall", "2xs": "2XSmall", xs: "XSmall", sm: "Small", md: "Medium", lg: "Large", xl: "XLarge", "2xl": "2XLarge", "3xl": "3XLarge", "4xl": "4XLarge", giant: "Giant", xgiant: "XGiant", "2xgiant": "2XGiant" };
/** The width of a Screen's frame by its device (figma-pull's deviceOf reads it back). */
const DEVICE_WIDTH = { phone: 390, tablet: 768, desktop: 1440 };
const DRAWN_BY_PULL = new Set(["Board", "Screen", "Overlay"]);

/** Figma sets the push draws itself (docs/figma-contracts/component-properties.json; checked against the live file). */
const SETS = {
  menuItem: { id: "1536:27473", name: "Primitives/Side-Bar/Menu-Item/Master" },
  sectionTitle: { id: "6044:81281", name: "Primitives/Sidebar/Menu-Item/Section-Title" },
  crumb: { id: "4031:20158", name: "Primitives/Breadcrumbs/Item/Slot" },
  segment: { id: "1204:11690", name: "Primitives/Segmented/Item" },
  actionItem: { id: "12280:19532", name: "Primitives/Dashboard/Header/Action-Item" },
  dataRow: { id: "4035:10629", name: "Primitives/Table/Data-Row" },
  headerCell: { id: "1604:12968", name: "Table/Cell/Header" },
  defaultCell: { id: "1603:23604", name: "Table/Cell/Default" },
  // ❖ Chart: each chart is a whole card (header Label, Icon-Main, Segmented, the drawing), no properties.
  lineChart: { id: "6643:63324", name: "Chart/Line-Chart" },
  stackBarChart: { id: "6643:73471", name: "Chart/Stack-Bar-Chart" },
  // Data items drawn as their primitive (Term / Value, a tab's Text, a step's title and number).
  descriptionItem: { id: "14859:78890", name: ".Primitives/Description-List/Item" },
  tabItem: { id: "1576:2090", name: "Primitives/Tab-Item" },
  stepVertical: { id: "4034:11389", name: ".Primitives/Stepper/Step-Vertical" },
};
/** Form fields drawn as Figma's Input/…-Field: the label in Label, the value (else the placeholder) in Text, help in Message. */
const FIELDS = new Set(["InputField", "SelectField", "DateField", "NumberField", "TextAreaField", "AutocompleteField", "RichTextField"]);
/** A data value as the text it shows (a string or number; anything else draws nothing). */
const textValue = (value) => (typeof value === "string" || typeof value === "number" ? String(value) : "");
/** A ChartCard's chart (its child) → the Figma chart card that draws that kind. */
const CHART_SETS = { LineChart: SETS.lineChart, StackBarChart: SETS.stackBarChart };
/** MetricCard trend.direction → Figma .Primitives/Metrics/Metric-Trend's Trend option. */
const TREND_OPTION = { positive: "Positive", negative: "Negative", normal: "Normal", neutral: "Normal" };
/** A Table column's content cell (Figma Table/Cell/Default › Content) by the column's `content`. */
const CELL_SETS = {
  text: { id: "1603:3247", name: "Primitives/Table/Cell/Text-Cell" },
  avatar: { id: "1603:2869", name: "Primitives/Table/Cell/Avatar-Cell" },
  photo: { id: "1603:4668", name: "Primitives/Table/Cell/Photo-Cell" },
  icon: { id: "1603:4727", name: "Primitives/Table/Cell/Basic-Icon-Cell" },
  "dock-icon": { id: "1603:5099", name: "Primitives/Table/Cell/Dock-Icon-Cell" },
  badge: { id: "1603:6158", name: "Primitives/Table/Cell/Badge-Cell" },
  tag: { id: "1603:23304", name: "Primitives/Table/Cell/Tag-Cell" },
  trend: { id: "1603:14279", name: "Primitives/Table/Cell/Trend-Cell" },
  progress: { id: "4081:19726", name: "Primitives/Table/Cell/Progress-Cell" },
  checkbox: { id: "1603:14284", name: "Primitives/Table/Cell/Control-Cell" },
  toggle: { id: "1603:14284", name: "Primitives/Table/Cell/Control-Cell" },
  actions: { id: "1603:14291", name: "Primitives/Table/Cell/Actions-Cell" },
};
/** A data slot's item set (owner › prop): its items are instances of it, a nested slot's group titles of `title`. */
const DATA_ITEMS = {
  Sidebar: { sections: { item: SETS.menuItem, title: SETS.sectionTitle } },
  Breadcrumbs: { items: { item: SETS.crumb } },
  Segmented: { options: { item: SETS.segment } },
};
/** Node props that are a Figma slot (figma-pull SLOT_PROPS, the other way). */
const SLOT_OF_PROP = {
  Sidebar: { brand: "Header-Content", footer: "Footer-Content" },
  DashboardHeader: { leading: "Leading-Slots", center: "Center-Slots", trailing: "Trailing-Slots", controls: "Control-Slots", actions: "Action-Slots" },
  ListBox: { header: "Header-Slot", footer: "Footer-Slot" },
};
/**
 * Node props whose layers go in their slot as one frame: a ListBox header row keeps its row (title left, action right),
 * a Sidebar brand its logo beside its name (Figma's Header-Content spreads its layers apart).
 */
const FRAMED_SLOT_PROPS = { ListBox: new Set(["header", "footer"]), Sidebar: new Set(["brand"]) };
/** Props the push draws in the instance's own layers (metricParts, listItemParts), not in a slot. */
const DRAWN_PARTS = { MetricCard: new Set(["trend", "action"]), ListItem: new Set(["leading", "trailing"]), InlineMessage: new Set(["action"]) };
/** What the page holds but does not show: screen-reader text. */
const NOT_DRAWN = new Set(["VisuallyHidden"]);
/** The slot a component's children go in, where it is not the set's first. */
const CHILD_SLOT = { DashboardHeader: "Custome-Elements", Sidebar: "Body-Content" };
const SELECTED_PROP = { Sidebar: "selectedId", Segmented: "defaultValue", Tabs: "defaultValue" };
const ITEM_ICON = { Segmented: "leading" };
/** Components whose `src` is a picture the plugin fills in (the instance's image layer). */
const PICTURED = new Set(["Avatar", "Image", "Thumbnail", "AppShellAccount"]);
/** Heading's text style when it sets none (src/components/Text/Text.tsx headingStyleByLevel). */
const HEADING_STYLE = { 1: "Heading/1", 2: "Heading/4", 3: "Heading/Subheading", 4: "Body/Extra/Bold", 5: "Body/Base/Bold", 6: "Body/Base/Bold" };
/**
 * Code-only components (no Figma set) are drawn as a frame of their layers named by the component, in the layout their
 * CSS gives; any other one is a column with nothing between its layers.
 */
const WRAPPER_LAYOUT = {
  List: { gap: "3xs" }, // list-item.css .zen-list
  FormField: { gap: "xs" }, // form.css: Input outside-field gap
  FormFieldset: { gap: "xs" },
  FormActions: { direction: "row", gap: "sm", align: "center", justify: "end", wrap: true }, // form.css .zen-form-actions
  PageHeader: { gap: "xs" }, // page-header.css .zen-page-header
};
/** PageHeader props as the Dashboard header Type=Main draws them (DashboardHeader's props). */
const PAGE_HEADER_PROPS = { title: "title", childTitle: "childTitle", description: "subheading", actions: "actions", trailing: "trailing" };
/** AppShell's rows (app-shell.css): the top bar and each section pad Padding/Small above and below, Margin-Comfortable on the sides. */
const SHELL_ROW_PADDING = [12, 24, 12, 24];
/** Container's content width by maxWidth (layout.css .zen-container[data-width]). */
const CONTAINER_MAX = { sm: 640, md: 960, lg: 1280, xl: 1440 };
/** Sidebar's width open (sidebar.css --zen-sidebar-width; Figma's Side-Bar measures the same) and as the collapsed rail
 *  (basic: min-width 84px, Figma's Expand=No; small-density: 20px + 4 × Padding/XSmall). */
const SIDEBAR_WIDTH = 240;
const SIDEBAR_RAIL_WIDTH = { basic: 84, "small-density": 52 };
/** Margin-Comfortable: Container's gutter (layout.css) and the floating action's inset (app-shell.css). */
const MARGIN_COMFORTABLE = 24;

const literal = (value) => ({ kind: "literal", value });
/** A page element the push makes itself, to draw a code-only component with the Zen components it renders. */
const elementOf = (name, props, children = []) => ({ kind: "element", name, props: Object.fromEntries(Object.entries(props).filter(([, value]) => value)), children });
/** "Ava Chen" → "AC": the first letters of the first two words, as Avatar draws a name without a photo (Avatar.tsx). */
const initialsOf = (name) => String(name ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join("").toUpperCase() || "?";

const short = (step) => LONG_TO_SHORT[step] ?? step;
const pxOf = (step, table) => table.find(([, key]) => key === short(step))?.[0];
/** A page element's Figma id (figma-pull figmaDocId, the other way): "f14243-64878" → "14243:64878"; an id the pull added (".place") is none. */
export function figmaIdOf(docId) {
  const match = /^f([A-Za-z0-9_-]+)$/.exec(docId ?? "");
  return match ? match[1].replace(/_/g, ";").replace(/-/g, ":") : undefined;
}

const literalOf = (value) => (value?.kind === "literal" ? value.value : undefined);
/** A document value as plain data (literals, objects, arrays; anything else undefined). */
const plain = (value) => {
  if (!value) return undefined;
  if (value.kind === "literal") return value.value;
  if (value.kind === "array") return value.items.map(plain);
  if (value.kind === "object") return Object.fromEntries(Object.entries(value.fields).map(([name, field]) => [name, plain(field)]));
  return undefined;
};
const textOf = (element) => element.children.filter((child) => child.kind === "text").map((child) => child.value).join("");
/** All the words a Text shows, its inline Links and spans included ("New to Zen? Create an account"). */
const deepText = (element) => element.children.map((child) => (child.kind === "text" ? child.value : child.kind === "element" ? deepText(child) : "")).join("");
/** A data field given as layers (`description: <Stack>…</Stack>`): the words they show, on one line. */
const layerWords = (value) => {
  if (value?.kind !== "element") return "";
  // Each Text (or Heading) is a line of its own: lines join with a space, a Text's inline words stay together.
  const lines = (element) => (["Text", "Heading"].includes(element.name) ? [deepText(element)] : element.children.flatMap((child) => (child.kind === "text" ? [child.value] : child.kind === "element" ? lines(child) : [])));
  return lines(value.node).join(" ").replace(/\s+/g, " ").trim();
};

/** The mapping's sets by code component (several for a component that is several Figma sets: Button's appearance). */
function setsByCode(mapping) {
  const out = new Map();
  for (const entry of new Set(mapping.sets.values())) out.set(entry.code, [...(out.get(entry.code) ?? []), entry]);
  return out;
}

/**
 * The Figma properties of an instance from its code props (instanceProps in figma-pull.mjs, the other way): every
 * mapped property whose code value is known (written, else the code default), by Figma name and Figma option.
 * `only`: write just these code props (a nested override names what it changes).
 */
function figmaProps(entry, code, mapping, notes, where, only = null, filled = null) {
  const props = {};
  const defaults = mapping.apiProps[entry.code];
  const valueOf = (prop) => (prop in code ? code[prop] : only ? undefined : defaults?.get(prop));
  // A component that is several Figma sets (Sidebar: Basic, Workspace, Small-Density) maps the properties of them all:
  // write only those this set has (its contract's property names), when the contract knows the set.
  const known = entry.defaults && Object.keys(entry.defaults).length ? new Set(Object.keys(entry.defaults)) : null;
  const ownedBySet = (name) => !known || known.has(name);
  const swaps = new Map();
  for (const item of entry.own) {
    if (only && !only.has(item.prop)) continue;
    if (!ownedBySet(item.label ?? item.prop)) continue;
    const value = valueOf(item.prop);
    if (value === undefined) continue;
    const name = item.label ?? item.prop;
    if (item.type === "VARIANT") {
      const option = Object.entries(item.options ?? {}).find(([, codeValue]) => sameValue(codeValue, String(value)))?.[0];
      if (option) props[name] = option;
      else notes.push(`${where}: ${item.prop}="${value}" has no Figma option in ${name}`);
    } else if (item.type === "BOOLEAN") props[name] = Boolean(value);
    // A text property shows a number as its digits (a Badge-Counter's value 3).
    else if (item.type === "TEXT" && (typeof value === "string" || typeof value === "number")) props[name] = String(value);
    else if (item.type === "INSTANCE_SWAP" && typeof value === "string") swaps.set(item.prop, { name, icon: value });
  }
  for (const toggle of entry.toggles ?? []) {
    if (only && !only.has(toggle.prop)) continue;
    if (!ownedBySet(toggle.label)) continue;
    // On whenever the prop holds something: an icon, a slot's content, a text (Subheading's "96 results" is only what
    // the pull writes for a toggle without content). `filled`: the props that hold layers or data (not in `code`).
    const value = filled?.has(toggle.prop) ? true : valueOf(toggle.prop);
    props[toggle.label] = value !== undefined && value !== false && value !== null && value !== "";
  }
  for (const swap of swaps.values()) props[swap.name] = swap.icon;
  return props;
}

/** The set of a code component: by its set prop (Button appearance="flat" → Button/Flat), else its only set. */
function entryFor(name, code, byCode, mapping) {
  const entries = byCode.get(name);
  if (!entries?.length) return null;
  const chooser = entries.find((entry) => entry.setProp);
  if (!chooser) return entries[0];
  const value = code[chooser.setProp] ?? mapping.apiProps[name]?.get(chooser.setProp) ?? chooser.setDefault;
  return entries.find((entry) => entry.setValue === value) ?? entries.find((entry) => !entry.setProp) ?? entries[0];
}

/** Literal props of an element ({ prop: value }); other kinds are noted by the caller. */
function codeProps(element) {
  return Object.fromEntries(Object.entries(element.props).filter(([, value]) => value.kind === "literal").map(([name, value]) => [name, value.value]));
}

/**
 * `text`: print the page with its ids (doc.mjs printPage(doc, { ids: true })) so the keys stay the same from one export to
 * the next; an element without one takes `newId()` (doc.mjs's random id by default, a counter in the CLI).
 */
export function figmaFromPage(text, { mapping, nestedLayers = {}, newId } = {}) {
  const notes = [];
  const { doc, errors } = docFromText(text, newId ? { newId } : {});
  if (!doc) return { frame: null, notes: errors.map((error) => error.message) };
  const byCode = setsByCode(mapping);
  const screen = doc.board.children.find((child) => child.kind === "element" && child.name === "Screen");
  if (!screen) return { frame: null, notes: ["the page has no Screen"] };
  const device = literalOf(screen.props.device) ?? "desktop";
  const frameWidth = DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop;
  const boardElements = doc.board.children.filter((child) => child.kind === "element");
  if (boardElements.filter((child) => child.name === "Screen").length > 1) notes.push("only the first Screen is pushed");
  const overlays = boardElements.filter((child) => child.name === "Overlay").length;
  if (overlays) notes.push(`${overlays} Overlay${overlays > 1 ? "s" : ""} (dialogs and sheets the page opens): not pushed`);
  /** Code-only components drawn as a frame of their layers (or as their text), by name: one note each at the end. */
  const framed = new Map();
  const countFramed = (name) => framed.set(name, (framed.get(name) ?? 0) + 1);

  // Each node carries its element's document id (`key`): the plugin keeps it on the layer, so importing the page again
  // updates the same layers (Zen plugin src/plugin/studio-import.js).
  const convert = (element, parent) => {
    const node = convertElement(element, parent);
    if (node && element.id) node.key = element.id;
    return node;
  };
  const images = new Set();
  /** The properties a captured set has (contract), to write an item's only where its set takes them. */
  const ownProps = (set) => {
    const captured = mapping.contractSets?.get(set.id) ?? mapping.contractSets?.get(set.name);
    return captured ? new Set((captured.props ?? []).map((prop) => prop.name)) : null;
  };
  const onlyOwn = (set, props) => {
    const own = ownProps(set);
    return own ? Object.fromEntries(Object.entries(props).filter(([name]) => own.has(name))) : props;
  };

  const convertElement = (element, parent) => {
    if (element.kind !== "element") return null;
    // Not on screen: screen-reader text, a tab's panel while another tab is selected.
    if (NOT_DRAWN.has(element.name) || (element.name === "TabPanel" && literalOf(element.props.hidden) === true)) return null;
    const id = figmaIdOf(element.id);
    const code = codeProps(element);
    let node;
    if (element.name === "Stack" || element.name === "Grid" || element.name === "Box") node = frameNode(element, code, id, parent);
    else if (element.name === "Text" || element.name === "Heading") {
      const align = { center: "CENTER", end: "RIGHT", justify: "JUSTIFIED" }[code.align];
      // Text.tsx's defaults: Body/Base/Regular in Neutral Strongest; a tone paints with its Color/Content variable.
      const textStyle = code.textStyle ?? (element.name === "Heading" ? HEADING_STYLE[code.level ?? 2] : "Body/Base/Regular");
      const fill = contentToneToken(code.tone ?? "strongest");
      node = { type: "TEXT", ...(id ? { id } : {}), characters: deepText(element), textStyle, ...(fill ? { fill } : {}), ...(align ? { align } : {}) };
    } else if (element.name === "Icon" && typeof code.name === "string") node = { type: "INSTANCE", ...(id ? { id } : {}), name: code.name, set: { id: null, name: code.name }, props: {} };
    else if (element.name === "SidebarMenuItem") node = itemNode(SETS.menuItem, code, { id });
    else if (element.name === "AppShellAction") node = actionItemNode(code, id);
    else if (element.name === "Table") node = tableNode(element, code, id);
    else if (element.name === "AppShell") node = appShellNode(element, code, id, parent);
    else if (element.name === "AppShellAccount") node = accountNode(element, code, id);
    else if (element.name === "PageHeader") node = pageHeaderNode(element, code, id);
    else if (element.name === "ChartCard" && element.children.some((child) => child.kind === "element" && CHART_SETS[child.name])) node = chartCardNode(element, code, id);
    else if (element.name === "MetricCard") node = cardAround(instanceNode(element, code), code.theme ?? "shadow", id, typeof code.label === "string" ? code.label : "MetricCard");
    // Metric is MetricCard's content without its Card: the same Metric-Inline set and parts.
    else if (element.name === "Metric") node = instanceNode({ ...element, name: "MetricCard" }, code, id);
    // A Menu draws its trigger on the page; its items open in a popover.
    else if (element.name === "Menu" && element.props.trigger?.kind === "element") node = convertElement(element.props.trigger.node, parent);
    else node = instanceNode(element, code, id, parent);
    if (node && code.position === "absolute") node.absolute = absoluteOf(code);
    return node;
  };

  /** position="absolute": Figma's constraints and the insets to the pinned edges, in px (figma-pull positioned, the other way). */
  function absoluteOf(code) {
    const cx = { left: "MIN", right: "MAX", center: "CENTER", "left-right": "STRETCH" }[code.constraintX ?? "left"] ?? "MIN";
    const cy = { top: "MIN", bottom: "MAX", center: "CENTER", "top-bottom": "STRETCH" }[code.constraintY ?? "top"] ?? "MIN";
    const inset = (step) => pxOf(step ?? "none", PADDING_PX) ?? 0;
    return { cx, cy, left: inset(code.insetLeft), right: inset(code.insetRight), top: inset(code.insetTop), bottom: inset(code.insetBottom) };
  }

  /** A data item (or a Sidebar row) as its primitive: Label / Icon shown, Icon-Src, Select, the label text (itemFields, the other way). */
  function itemNode(set, fields, { id, key, selected = false, labelKey = "label", iconKey = "icon", look = {} } = {}) {
    const label = typeof fields[labelKey] === "string" ? fields[labelKey] : typeof fields.children === "string" ? fields.children : "";
    const icon = typeof fields[iconKey] === "string" ? fields[iconKey] : null;
    const props = onlyOwn(set, { Label: label !== "", Icon: Boolean(icon), ...(icon ? { "Icon-Src": icon } : {}), Select: selected ? "Yes" : "No", ...look });
    const name = typeof fields["aria-label"] === "string" ? fields["aria-label"] : label || set.name;
    return { type: "INSTANCE", ...(id ? { id } : {}), ...(key ? { key } : {}), name, set, props, ...(label ? { text: label } : {}) };
  }

  /** A Segmented's Level and Size on its items (Segmented.tsx: secondary, md), as Figma's item options. */
  const segmentLook = (code) => ({ Level: code.level === "primary" ? "Primary" : "Secondary", Size: ["sm", "small"].includes(code.size) ? "Small" : "Medium" });

  /** AppShellAction as Figma's Dashboard Header Action-Item: Theme Flat, its notification dot or number, the glyph it draws. */
  function actionItemNode(code, id) {
    const count = typeof code.count === "number" ? code.count : 0;
    const props = { Notification: Boolean(code.dot) || count > 0, ...(code.appearance === "flat" ? { Theme: "Flat" } : {}), ...(count > 0 ? { "Noti-type": "Number" } : {}) };
    return { type: "INSTANCE", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : "Action", set: SETS.actionItem, props, ...(count > 0 ? { textList: [String(count)] } : {}), ...(typeof code.icon === "string" ? { swapIcon: code.icon } : {}) };
  }

  /**
   * A code-only component (no Figma set) as a frame of its layers, named by the component, so nothing inside it is lost:
   * the layers in its node props, then its children, in its CSS layout (WRAPPER_LAYOUT; Container's gutter). One with
   * text and no layers (a Link) is its text; one with neither is left out.
   */
  function wrapperNode(element, code, id, where, parent = null) {
    const layers = [
      ...Object.values(element.props).filter((value) => value.kind === "element").map((value) => value.node),
      ...element.children.filter((child) => child.kind === "element"),
    ];
    const label = textOf(element).trim();
    if (!layers.length && label) {
      countFramed(element.name);
      return { type: "TEXT", ...(id ? { id } : {}), characters: label };
    }
    const shape = WRAPPER_LAYOUT[element.name] ?? {};
    const gutter = element.name === "Container" && code.gutter !== false ? { paddingX: "xl" } : {};
    // Container's content stops at its maxWidth (layout.css: lg 1280 by default; full has none).
    const contentMax = element.name === "Container" ? CONTAINER_MAX[code.maxWidth ?? "lg"] : undefined;
    const frame = layers.length ? frameNode(elementOf("Stack", {}, layers), { gap: "none", ...shape, ...gutter, ...(contentMax ? { contentMax } : {}) }, id, parent) : null;
    if (!frame?.children.length) {
      notes.push(`${where}: no Figma set for ${element.name} (left out)`);
      return null;
    }
    countFramed(element.name);
    return { ...frame, name: element.name };
  }

  /** A row frame of layers (the AppShell's parts), nothing between them. */
  const shellFrame = (name, mode, children, extra = {}) => ({ type: "FRAME", name, layout: { mode, gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: children.filter(Boolean), ...extra });
  const layerOf = (element, prop) => (element.props[prop]?.kind === "element" ? element.props[prop].node : null);
  /** A node prop's layers: a Stack of layout props alone gives its layers (as slotLayers does), anything else itself. */
  const layersOf = (element, prop) => {
    const node = layerOf(element, prop);
    if (!node) return [];
    return node.name === "Stack" && !Object.keys(node.props).some((name) => !["gap", "direction", "align", "justify", "wrap"].includes(name)) ? node.children.filter((child) => child.kind === "element") : [node];
  };

  /**
   * AppShell with the Zen components it renders (app-shell.css), named by Zen: the Sidebar, then a column of the top bar
   * (Figma's Dashboard header Type=Navigation: the collapse toggle and `header` in Leading-Slots, `headerCenter` in
   * Center-Slots, `headerActions` in Trailing-Slots), the `sections` rows, the page (`children`) and the `footer`, the
   * floating action pinned bottom right; the docked `aside` last.
   */
  function appShellNode(element, code, id, parent = null) {
    const sidebar = layerOf(element, "sidebar");
    const overrides = plain(element.props.overrides) ?? {};
    const hasTopBar = ["header", "headerCenter", "headerActions"].some((prop) => layerOf(element, prop));
    // The collapse toggle (AppShell.tsx showCollapseToggle): a Zen Sidebar that is not the workspace rail, with a top bar.
    const collapsed = literalOf(sidebar?.props.collapsed) ?? code.defaultSidebarCollapsed ?? code.sidebarCollapsed ?? false;
    const toggle = hasTopBar && code.sidebarToggle !== false && sidebar?.name === "Sidebar" && literalOf(sidebar.props.variant) !== "workspace" && code.layout !== "drawer"
      ? elementOf("IconButton", Object.fromEntries(Object.entries({ appearance: "flat", level: "primary", size: "md", icon: collapsed ? "icon-layout-right-line" : "icon-layout-left-line", "aria-label": collapsed ? "Expand sidebar" : "Collapse sidebar", ...(overrides.Collapse ?? {}) }).map(([name, value]) => [name, literal(value)])))
      : null;
    const leading = [toggle, ...layersOf(element, "header")].filter(Boolean);
    const topBar = hasTopBar ? instanceNode(elementOf("DashboardHeader", {
      type: literal("navigation"),
      leading: leading.length ? { kind: "element", node: elementOf("Stack", { direction: literal("row"), gap: literal("md"), align: literal("center") }, leading) } : null,
      center: element.props.headerCenter?.kind === "element" ? element.props.headerCenter : null,
      trailing: element.props.headerActions?.kind === "element" ? element.props.headerActions : null,
    }), { type: "navigation" }) : null;
    // The column's width: the shell's less the open Sidebar (another sidebar, a collapsed one or an aside: unknown).
    const aside = layerOf(element, "aside") ? convert(layerOf(element, "aside"), { direction: "row", stretch: true }) : null;
    const sideWidth = !sidebar ? 0 : sidebarWidth(sidebar, collapsed);
    const columnWidth = typeof parent?.width === "number" && sideWidth !== null && !aside ? parent.width - sideWidth : null;
    const filling = (layers, width = columnWidth) => layers.map((layer) => convert(layer, { direction: "column", stretch: true, width })).filter(Boolean).map((node) => (node.absolute ? node : { ...node, fillW: true }));
    const stretch = { direction: "column", stretch: true, width: columnWidth };
    const sections = filling(layersOf(element, "sections"), columnWidth === null ? null : columnWidth - SHELL_ROW_PADDING[1] - SHELL_ROW_PADDING[3]);
    const floating = layerOf(element, "floatingAction") ? convert(layerOf(element, "floatingAction"), stretch) : null;
    const column = shellFrame("Column", "VERTICAL", [
      topBar && shellFrame("Header", "VERTICAL", [{ ...topBar, fillW: true }], { layout: { mode: "VERTICAL", gap: 0, padding: SHELL_ROW_PADDING, counter: "MIN", primary: "MIN" }, fillW: true }),
      // Each section row pads Padding/Small above and below: Gap/Large between rows.
      sections.length && shellFrame("Sections", "VERTICAL", sections, { layout: { mode: "VERTICAL", gap: 24, gapVar: "Spacing/Gap/Large", padding: SHELL_ROW_PADDING, counter: "MIN", primary: "MIN" }, fillW: true }),
      shellFrame("Main", "VERTICAL", filling(element.children.filter((child) => child.kind === "element")), { fillW: true }),
      ...filling(layersOf(element, "footer")),
      floating && { ...floating, absolute: { cx: "MAX", cy: "MAX", left: 0, right: MARGIN_COMFORTABLE, top: 0, bottom: MARGIN_COMFORTABLE } },
    ], { fillW: true });
    // A Sidebar the AppShell collapses (defaultSidebarCollapsed) is drawn as the rail too.
    const shellSidebar = sidebar?.name === "Sidebar" && collapsed && literalOf(sidebar.props.collapsed) === undefined ? { ...sidebar, props: { ...sidebar.props, collapsed: literal(true) } } : sidebar;
    const row = [shellSidebar ? convert(shellSidebar, { direction: "row", stretch: true }) : null, column, aside].filter(Boolean).map((node) => (node === column ? node : { ...node, fillH: true }));
    const banner = layersOf(element, "banner");
    // The page is Canvas (app-shell.css; canvas="alt" | "flat" the other two).
    const canvas = { fill: `Background/Canvas/${{ alt: "Alt", flat: "Flat" }[code.canvas] ?? "Default"}` };
    if (!banner.length) return shellFrame("AppShell", "HORIZONTAL", row, { ...(id ? { id } : {}), ...canvas });
    return shellFrame("AppShell", "VERTICAL", [...filling(banner), shellFrame("Frame", "HORIZONTAL", row, { fillW: true })], { ...(id ? { id } : {}), ...canvas });
  }

  /**
   * ChartCard as Chart.tsx draws it: a Card (its theme) holding Figma's chart of that kind (❖ Chart: header Label,
   * Icon-Main, Segmented, the drawing), the title in its Label, `ranges` as the Segmented's items (hidden without), the
   * open button only with `onOpen`. Figma draws its own sample data.
   */
  function chartCardNode(element, code, id) {
    const chart = element.children.find((child) => child.kind === "element" && CHART_SETS[child.name]);
    const set = CHART_SETS[chart.name];
    const title = typeof code.title === "string" ? code.title : "";
    const ranges = Array.isArray(plain(element.props.ranges)) ? plain(element.props.ranges) : [];
    const hide = [...(ranges.length ? [] : ["Segmented"]), ...(element.props.onOpen ? [] : ["Button/Icon-Main"])];
    // The range switch (Chart.tsx: a Segmented, secondary md) fills the card and splits it, or hugs its items
    // (rangesFullWidth={false}): then the chart's Segmented and its Item-List hug too.
    const full = code.rangesFullWidth !== false;
    const items = ranges.map((range) => ({ ...itemNode(SETS.segment, range ?? {}, { selected: range?.id !== undefined && range.id === (code.range ?? ranges[0]?.id), look: segmentLook({}) }), ...(full ? { fillW: true } : {}) }));
    notes.push(`${chart.name}: Figma's ${set.name} draws its own sample data`);
    const drawing = { type: "INSTANCE", name: set.name, set, props: {}, ...(title ? { texts: { Label: title } } : {}), ...(hide.length ? { hide } : {}), ...(items.length && !full ? { nested: [{ path: "Segmented", hugW: true }] } : {}), ...(items.length ? { slots: [{ name: "Item-List", children: items, ...(full ? {} : { hugW: true }) }] } : {}), fillW: true };
    return cardAround(drawing, code.theme ?? "flat", id, title || "ChartCard");
  }

  /** A layer in a Card of `theme` (MetricCard and ChartCard are a Card around their content: Figma Metric-Card, Chart-Card). */
  function cardAround(content, theme, id, name) {
    if (!content) return null;
    const card = entryFor("Card", { theme }, byCode, mapping);
    if (!card) return { ...content, ...(id ? { id } : {}) };
    const set = { id: card.id, name: card.name };
    return { type: "INSTANCE", ...(id ? { id } : {}), name, set, props: { ...figmaProps(card, { theme }, mapping, notes, name, new Set(["theme"])), ...onlyOwn(set, { "Sub-Action": false }) }, slots: [{ name: "Content", children: [{ ...content, fillW: true }] }] };
  }

  /** AppShellAccount: the Avatar it draws (Avatar/Single Circle Medium), its photo or the name's initials. */
  function accountNode(element, code, id) {
    const own = plain(element.props.overrides)?.Avatar ?? {};
    const props = Object.fromEntries(Object.entries({ size: "md", shape: "circle", ...(code.theme ? { theme: code.theme } : {}), ...(code.src ? { src: code.src } : {}), alt: code.name ?? "", ...own }).map(([name, value]) => [name, literal(value)]));
    const node = instanceNode(elementOf("Avatar", props, code.src ? [] : [{ kind: "text", value: initialsOf(code.name) }]), codeProps({ props }), id);
    return node && typeof code.name === "string" ? { ...node, name: code.name } : node;
  }

  /**
   * PageHeader as Figma's Dashboard header Type=Main (title, Child, SubHeading, Action-Slots, Trailing-Slots), with its
   * breadcrumbs, eyebrow, meta and tabs as the layers around it (page-header.css: a column, Gap/XSmall).
   */
  function pageHeaderNode(element, code, id) {
    const props = { type: literal("main") };
    for (const [from, to] of Object.entries(PAGE_HEADER_PROPS)) if (element.props[from]) props[to] = element.props[from];
    const header = instanceNode(elementOf("DashboardHeader", props), { ...codeProps({ props }) });
    if (element.props.back) notes.push(`PageHeader${id ? ` (${id})` : ""} back: not pushed (no Back in Figma's Dashboard header)`);
    const around = (prop) => {
      const value = element.props[prop];
      if (value?.kind === "element") return convert(value.node, { direction: "column", stretch: false });
      if (value?.kind === "literal" && typeof value.value === "string") return { type: "TEXT", characters: value.value };
      return null;
    };
    const before = ["breadcrumbs", "eyebrow"].map(around).filter(Boolean);
    const after = ["meta", "tabs"].map(around).filter(Boolean);
    if (!header || (!before.length && !after.length)) return header ? { ...header, ...(id ? { id } : {}) } : null;
    const frame = { type: "FRAME", ...(id ? { id } : {}), name: "PageHeader", layout: { mode: "VERTICAL", gap: 8, gapVar: "Spacing/Gap/XSmall", padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: [...before, { ...header, fillW: true }, ...after] };
    return frame;
  }

  const fills = (element, parent) => {
    const code = codeProps(element);
    const row = parent?.direction === "row";
    return { fillW: code.width === "fill" || (!row && parent?.stretch), fillH: code.height === "fill" || (row && parent?.stretch) };
  };

  /** A frame's width in px where the push knows it: a width of its own, else its parent's when it fills it; maxWidth caps it. */
  const widthIn = (code, parent, filling) => {
    const px = (value) => (/^\d+(\.\d+)?(px)?$/.test(String(value ?? "")) ? Number.parseFloat(String(value)) : null);
    const width = px(code.width) ?? (filling && typeof parent?.width === "number" ? parent.width : null);
    const max = px(code.maxWidth);
    return width !== null && max !== null ? Math.min(width, max) : width;
  };
  /** A Zen Sidebar's width, open or as the rail (another sidebar, a workspace one or one of its own width: unknown). */
  const sidebarWidth = (sidebar, collapsed) => {
    const variant = literalOf(sidebar.props.variant) ?? "basic";
    if (sidebar.name !== "Sidebar" || variant === "workspace" || sidebar.props.width !== undefined) return null;
    return collapsed ? SIDEBAR_RAIL_WIDTH[variant] ?? null : SIDEBAR_WIDTH;
  };
  /** Each grid column's width (Figma's tracks: Fixed px, Flex shares what is left after the gaps); unknown without a width. */
  const trackWidths = (columns, inner, gap) => {
    if (inner === null) return null;
    const tracks = columns.sizes ?? Array.from({ length: columns.count }, () => ({ type: "FLEX", value: 1 }));
    const fixed = tracks.reduce((sum, track) => sum + (track.type === "FIXED" ? track.value : 0), 0);
    const flex = tracks.reduce((sum, track) => sum + (track.type === "FLEX" ? track.value : 0), 0);
    const free = Math.max(0, inner - (tracks.length - 1) * gap - fixed);
    return tracks.map((track) => (track.type === "FIXED" ? track.value : track.type === "FLEX" && flex ? (free * track.value) / flex : null));
  };

  /** A track list's top-level tracks ("minmax(0, 1fr) 320px" → two). */
  const splitTracks = (text) => {
    const tracks = [];
    let depth = 0, current = "";
    for (const char of text) {
      if (char === "(") depth++;
      if (char === ")") depth--;
      if (/\s/.test(char) && depth === 0) { if (current) tracks.push(current); current = ""; } else current += char;
    }
    return current ? [...tracks, current] : tracks;
  };
  /** A track as Figma's grid track: fr → Flex, px → Fixed, minmax(…, n fr) → Flex n, auto → Hug. */
  const trackSize = (track) => {
    const fr = /([\d.]+)fr\)?$/.exec(track);
    if (fr) return { type: "FLEX", value: Number(fr[1]) };
    const px = /^([\d.]+)px$/.exec(track);
    if (px) return { type: "FIXED", value: Number(px[1]) };
    return track === "auto" ? { type: "HUG" } : { type: "FLEX", value: 1 };
  };
  /**
   * A Grid's columns in this Screen's frame (Layout.tsx Grid; the breakpoint is the Screen's device): `{ count, sizes }`
   * for a column count or a track list, `{ min }` for columns that fit as many as the width allows (no columns:
   * minColumnWidth; repeat(auto-fit | auto-fill, minmax(min(100%, Npx), 1fr))).
   */
  function gridColumns(element, code) {
    const value = plain(element.props.columns);
    const order = { phone: ["mobile", "tablet", "desktop"], tablet: ["tablet", "desktop", "mobile"] }[device] ?? ["desktop", "tablet", "mobile"];
    const tracks = value && typeof value === "object" ? order.map((name) => value[name]).find((item) => item !== undefined) : value;
    // layout.css data-mode="fill": auto-fill keeps a row's empty columns; auto-fit lets the cells take them.
    if (tracks === undefined || tracks === null) return { min: Number.parseFloat(String(code.minColumnWidth ?? 240)) || 240, mode: "fill" };
    if (typeof tracks === "number") return { count: Math.max(1, Math.round(tracks)) };
    const text = String(tracks).trim();
    const fit = /^repeat\(\s*auto-(fit|fill)\s*,\s*minmax\(\s*(?:min\(\s*100%\s*,\s*)?([\d.]+)px\s*\)?\s*,\s*[\d.]*fr\s*\)\s*\)$/.exec(text);
    if (fit) return { min: Number(fit[2]), mode: fit[1] };
    const repeat = /^repeat\(\s*(\d+)\s*,/.exec(text);
    if (repeat) return { count: Number(repeat[1]) };
    const list = splitTracks(text);
    return { count: Math.max(1, list.length), sizes: list.map(trackSize) };
  }

  function frameNode(element, code, id, parent = null) {
    const grid = element.name === "Grid";
    const row = code.direction === "row";
    const gap = code.gap ?? "md";
    const gapPx = pxOf(gap, GAP_PX) ?? 0;
    const pad = (step) => pxOf(step ?? "none", PADDING_PX) ?? 0;
    const x = pad(code.paddingX ?? code.padding);
    const y = pad(code.paddingY ?? code.padding);
    // The width inside it, where the push knows it (a page's frames fill the Screen; an instance's slot is unknown).
    const self = widthIn(code, parent, parent?.cell || fills(element, parent).fillW);
    const inner = self === null ? null : Math.min(Math.max(0, self - 2 * x), code.contentMax ?? Infinity);
    // Columns that fit (CSS auto-fill / auto-fit) are as many as that width takes, an even Figma grid; with no width
    // known, a wrapping row whose cells fill it, no narrower than the minimum. A column count is Figma's grid.
    let columns = grid ? gridColumns(element, code) : null;
    if (columns?.min && inner !== null) {
      const fitting = Math.max(1, Math.floor((inner + gapPx) / (columns.min + gapPx)));
      const cells = element.children.filter((child) => child.kind === "element").length;
      const count = columns.mode === "fit" ? Math.max(1, Math.min(fitting, cells)) : fitting;
      columns = { count, sizes: Array.from({ length: count }, () => ({ type: "FLEX", value: 1 })), min: columns.min, even: true };
    }
    const fit = Boolean(columns?.min) && !columns.even;
    const layout = { mode: grid && !fit ? "GRID" : row || fit ? "HORIZONTAL" : "VERTICAL" };
    layout.gap = gapPx;
    if (short(gap) !== "none" && STEP_NAMES[short(gap)]) layout.gapVar = `Spacing/Gap/${STEP_NAMES[short(gap)]}`;
    // Between wrapped rows (and grid rows): rowGap, else the gap (CSS gap is both).
    const rowGap = code.rowGap ?? gap;
    if (grid || code.wrap) {
      layout.rowGap = pxOf(rowGap, GAP_PX) ?? 0;
      if (short(rowGap) !== "none" && STEP_NAMES[short(rowGap)]) layout.rowGapVar = `Spacing/Gap/${STEP_NAMES[short(rowGap)]}`;
    }
    layout.padding = [y, x, y, x];
    if (code.padding && !code.paddingX && !code.paddingY && short(code.padding) !== "none") layout.paddingVar = `Spacing/Padding/${STEP_NAMES[short(code.padding)]}`;
    const align = code.align ?? (row ? "center" : "stretch");
    if (!grid) {
      layout.counter = { start: "MIN", center: "CENTER", end: "MAX", baseline: "BASELINE" }[align] ?? "MIN";
      layout.primary = { center: "CENTER", end: "MAX", between: "SPACE_BETWEEN" }[code.justify] ?? "MIN";
      if (code.wrap) layout.wrap = true;
    } else if (fit) Object.assign(layout, { counter: "MIN", primary: "MIN", wrap: true });
    // What a child fills: a column's width inside the padding, a grid cell its column's share; a row's is unknown.
    const context = { direction: row ? "row" : "column", stretch: !grid && align === "stretch", width: grid || row ? null : inner };
    const cellWidths = grid && !fit ? trackWidths(columns, inner, gapPx) : null;
    let cellIndex = 0;
    const children = element.children.map((child) => {
      const node = convert(child, grid && child.kind === "element" ? { ...context, cell: true, width: cellWidths?.[cellIndex++ % columns.count] ?? null } : context);
      if (!node || node.absolute) return node;
      // A grid's cells fill their column; Grid's default align (stretch) makes a row's cards as tall as its tallest (a
      // frame cell hugs: Fill inside Fill leaves Figma a height it cannot settle). Columns that fit keep their minimum on
      // each cell (figma-pull reads them back as minColumnWidth).
      if (grid) return { ...node, fillW: true, ...(align === "stretch" && node.type === "INSTANCE" ? { fillH: true } : {}), ...(columns.min ? { minW: Math.min(columns.min, frameWidth - 32) } : {}) };
      const { fillW, fillH } = fills(child, context);
      // fillChildren (layout.css): in a row every child without its own width takes an equal share; in a column only
      // when the column has a height of its own (else they keep their content height).
      const own = codeProps(child);
      const shareW = code.fillChildren === true && row && own.width === undefined;
      const shareH = code.fillChildren === true && !row && code.height !== undefined && own.height === undefined;
      // A text in a column wraps at the column's width whatever the Stack aligns (CSS), where Figma's Hug runs on: it
      // fills. A Divider between layers of a row takes the room they leave (divider.css).
      const wide = fillW || shareW || (node.type === "TEXT" && !row) || (row && child.name === "Divider");
      return { ...node, ...(wide ? { fillW: true } : {}), ...(fillH || shareH ? { fillH: true } : {}) };
    }).filter(Boolean);
    if (grid && !fit) {
      layout.grid = { columns: columns.count, rows: Math.max(1, Math.ceil(children.length / columns.count)), ...(columns.sizes ? { sizes: columns.sizes } : {}) };
      children.forEach((child, index) => { child.cell = { col: index % columns.count, row: Math.floor(index / columns.count), span: 1 }; });
    }
    // maxWidth (a number of px, or "400px"): the frame fills up to it (a sign-in form in its centred row).
    const maxW = Number.parseFloat(String(code.maxWidth ?? "")) || null;
    // Only a frame with `clip` (Box, Stack or Grid) cuts what overflows it: the importer clips that frame alone.
    return { type: "FRAME", ...(id ? { id } : {}), name: element.name, layout, children, ...(maxW && /^\d+(px)?$/.test(String(code.maxWidth)) ? { maxW } : {}), ...(code.clip === true ? { clip: true } : {}) };
  }

  /** A node prop's layers as a slot's: a Stack the pull made of a slot's several layers gives its layers back. */
  function slotLayers(value) {
    const element = value.node;
    const layers = element.name === "Stack" && !Object.keys(element.props).some((name) => !["gap", "direction", "align", "justify", "wrap", "padding", "paddingX", "paddingY"].includes(name)) ? element.children : [element];
    return layers.map((child) => convert(child, { direction: "column", stretch: false })).filter(Boolean);
  }

  /** A data slot's items as instances of its item set; a nested slot (Sidebar sections) a frame per group, its title first. */
  /**
   * Data items Figma draws as a primitive with texts and options of its own: DescriptionList's Term / Value (its Layout
   * and Divider on each item: Figma's list set carries a duplicate variant), Tabs' Tab-Items (the selected one, their
   * Style and Size), a vertical Stepper's steps (number, title, caption; Passed before `current`, Focused at it).
   */
  const ITEM_BUILDERS = {
    // A description given as layers (an address on two lines) gives its words.
    DescriptionList: { items: (list, code, raw) => list.map((item, index) => ({ type: "INSTANCE", name: textValue(item?.term) || "Item", set: SETS.descriptionItem, fillW: true,
      props: { Layout: code.layout === "stacked" ? "Stacked" : "Inline", Divider: code.divider ? "Yes" : "No", Emphasis: item?.emphasis ? "Yes" : "No", Action: Boolean(item?.action), Term: textValue(item?.term) || layerWords(raw?.items?.[index]?.fields?.term), Value: textValue(item?.description) || layerWords(raw?.items?.[index]?.fields?.description) } })) },
    Tabs: { items: (list, code) => {
      const selected = code.value ?? code.defaultValue ?? list[0]?.id;
      return list.map((item) => ({ type: "INSTANCE", name: textValue(item?.label) || "Tab", set: SETS.tabItem, ...(textValue(item?.label) ? { text: textValue(item.label) } : {}), ...(code.fullWidth ? { fillW: true } : {}),
        props: { Style: code.variant === "subtle" ? "Subtle" : "Indicator", Size: ["sm", "small"].includes(code.size) ? "Small" : "Medium", Select: item?.id === selected ? "Yes" : "No", Label: textValue(item?.label) ? "True" : "False", Icon: typeof item?.icon === "string" ? "True" : "False", ...(typeof item?.icon === "string" ? { "Icon-Src": item.icon } : {}), Badge: item?.badge !== undefined && item?.badge !== null && item?.badge !== false } }));
    } },
    Stepper: { steps: (list, code) => {
      if (code.orientation !== "vertical") return null;
      const current = Number(code.current ?? 0);
      return list.map((step, index) => {
        const caption = textValue(step?.caption);
        const state = step?.error ? "Error" : index < current ? "Passed" : index === current ? "Focused" : "Default";
        // A passed or failed step draws a mark, not its number.
        return { type: "INSTANCE", name: textValue(step?.title) || `Step ${index + 1}`, set: SETS.stepVertical, fillW: true,
          props: { Position: index === 0 ? "First" : index === list.length - 1 ? "Last" : "Middle", State: state, Caption: Boolean(caption) },
          texts: { ...(state === "Passed" || state === "Error" ? {} : { Label: String(index + 1) }), "Step Title": textValue(step?.title), ...(caption ? { Caption: caption } : {}) } };
      });
    } },
  };

  function dataSlotChildren(owner, dataSlot, value, code, raw) {
    const build = ITEM_BUILDERS[owner]?.[dataSlot.prop];
    if (build) return build(Array.isArray(value) ? value : [], code, raw);
    const items = DATA_ITEMS[owner]?.[dataSlot.prop];
    if (!items) return null;
    const labelKey = /\btitle:/.test(dataSlot.newItem(0).code) ? "title" : "label";
    const iconKey = ITEM_ICON[owner] ?? "icon";
    const selectedId = code[SELECTED_PROP[owner]];
    // A Segmented's items take its Level and Size (Figma's item starts Small Primary); they split a full-width one.
    const look = owner === "Segmented" ? segmentLook(code) : {};
    const fill = owner === "Segmented" && code.fullWidth === true ? { fillW: true } : {};
    const item = (fields) => ({ ...itemNode(items.item, fields ?? {}, { selected: fields?.id !== undefined && fields.id === selectedId, labelKey, iconKey, look }), ...fill });
    const list = Array.isArray(value) ? value : [];
    // A crumb draws its chevron as the slot's Dash (all but the last) and its look on the Item inside (Breadcrumbs.tsx:
    // the first crumb is Master while `master` is on, Emphasis from the crumb or the trail).
    if (owner === "Breadcrumbs") return list.map((fields, index) => {
      const node = item(fields);
      const level = fields?.level ?? (code.master !== false && index === 0 ? "master" : "sub");
      const emphasis = fields?.emphasis ?? code.emphasis ?? "default";
      node.props = { ...node.props, Dash: index < list.length - 1 };
      node.nested = [{ path: "Item", props: { Level: level === "master" ? "Master" : "Sub", Emphasis: emphasis === "medium" ? "Medium" : "Default", ...(fields?.state === "hover" ? { State: "Hover" } : {}) },
        ...(level === "master" && typeof fields?.icon === "string" ? { swapIcon: fields.icon } : {}) }];
      return node;
    });
    if (!dataSlot.nested) return list.map(item);
    return list.map((section, index) => ({
      type: "FRAME", name: section?.label ? `Section ${section.label}` : `Section ${index + 1}`,
      layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" },
      children: [
        ...(section?.label && items.title ? [{ type: "INSTANCE", name: "Section-Title", set: items.title, props: {}, text: section.label, fillW: true }] : []),
        ...(Array.isArray(section?.[dataSlot.nested]) ? section[dataSlot.nested] : []).map((fields) => ({ ...item(fields), fillW: true })),
      ],
    }));
  }

  /**
   * A collapsed Sidebar as Figma's rail (Side-Bar Expand=No; Sidebar.tsx collapsed): its mark alone in the header
   * (logoCollapsed, else the brand's first layer), each row its icon without its label, the groups' titles gone and a
   * Divider opening each later group.
   */
  function sidebarRail(element, node, slots) {
    Object.assign(node.props, onlyOwn(node.set, { Expand: "No" }));
    const brand = element.props.brand?.kind === "element" ? element.props.brand.node : null;
    const mark = element.props.logoCollapsed?.kind === "element" ? element.props.logoCollapsed.node
      : brand?.name === "Stack" ? brand.children.find((child) => child.kind === "element") ?? null : brand;
    const markNode = mark ? convert(mark, { direction: "column", stretch: false }) : null;
    const header = slots.find((slot) => slot.name === "Header-Content");
    if (header) header.children = markNode ? [markNode] : [];
    else if (markNode) slots.unshift({ name: "Header-Content", children: [markNode] });
    // A row of the rail is its icon: as wide as it (Figma's 44; its Element fills the open row), its label left in its
    // layer's name (no text to write).
    const iconOnly = (layer) => {
      if (layer?.set?.id !== SETS.menuItem.id) return layer;
      const { text, fillW, ...row } = layer;
      return { ...row, props: { ...layer.props, Label: false }, hugW: true, hugLayers: [{ name: "Element", w: true }] };
    };
    for (const slot of slots) {
      if (slot.name === "Header-Content") continue;
      let group = 0;
      slot.children = slot.children.map((layer) => {
        if (layer.type !== "FRAME" || !layer.name.startsWith("Section")) return iconOnly(layer);
        const divider = group++ > 0 ? instanceNode(elementOf("Divider", {}), {}) : null;
        const rows = layer.children.filter((child) => child.set?.id !== SETS.sectionTitle.id).map(iconOnly);
        return { ...layer, children: [...(divider ? [{ ...divider, fillW: true }] : []), ...rows] };
      });
    }
  }

  /** The Dashboard header's texts (Type Main: title, Child, SubHeading; Control-Bar: its count) and Search (dashboardHeaderParts, the other way). */
  function dashboardHeaderParts(element, code, node) {
    const type = code.type ?? "control-bar";
    const texts = {};
    if (type === "main") {
      if (typeof code.title === "string") node.text = code.title;
      if (typeof code.childTitle === "string") texts.Child = code.childTitle;
      if (typeof code.subheading === "string") texts.SubHeading = code.subheading;
    }
    if (type === "control-bar") {
      if (typeof code.subheading === "string") texts.Subheading = code.subheading;
      const search = element.props.search;
      if (search?.kind === "element") {
        const placeholder = literalOf(search.node.props.placeholder);
        node.props.Search = true;
        if (typeof placeholder === "string") (node.nested ??= []).push({ path: "Search", props: {}, text: placeholder });
      } else node.props.Search = false;
    }
    if (Object.keys(texts).length) node.texts = texts;
  }

  /**
   * A Table as Figma draws it (figma-pull tableElement, the other way): a frame of Primitives/Table/Data-Row instances,
   * the first a header row of Table/Cell/Header, each other row's Columns slot a Table/Cell/Default per column holding
   * the column's content cell (Text-Cell, Badge-Cell…), fixed width or Fill; a row's overrides change its Badge, Dock
   * Icon or action buttons.
   */
  function tableNode(element, code, id) {
    const columns = Array.isArray(plain(element.props.columns)) ? plain(element.props.columns) : [];
    const rows = Array.isArray(plain(element.props.rows)) ? plain(element.props.rows) : [];
    const overrides = plain(element.props.overrides) ?? {};
    if (!columns.length) notes.push(`Table${id ? ` (${id})` : ""}: its columns are not written in the page (left out)`);
    const widthOf = (column) => (/^\d+px$/.test(String(column.width ?? "")) ? Number.parseInt(column.width, 10) : null);
    const sized = (node, column) => (widthOf(column) ? { ...node, fixedWidth: widthOf(column) } : { ...node, fillW: true });
    const align = (column) => (column.align === "right" ? "Right" : "Left");
    const header = columns.map((column) => sized({ type: "INSTANCE", name: column.id, set: SETS.headerCell, props: onlyOwn(SETS.headerCell, { "✏️ Label": String(column.header ?? ""), Label: Boolean(column.header), Type: column.sortable ? "Sort" : "None", Align: align(column), Icon: Boolean(column.icon) }) }, column));
    const instanceOf = (name, codeValues, where) => {
      const entry = entryFor(name, codeValues, byCode, mapping);
      if (!entry) { notes.push(`${where}: no Figma set for ${name}`); return null; }
      return { type: "INSTANCE", name, set: { id: entry.id, name: entry.name }, props: figmaProps(entry, codeValues, mapping, notes, where) };
    };
    const content = (column, row, rowId) => {
      const kind = column.content ?? "text";
      const set = CELL_SETS[kind];
      const field = column.field ?? column.id;
      const value = row[field];
      const label = typeof value === "string" || typeof value === "number" ? String(value) : "";
      const caption = column.captionField && typeof row[column.captionField] === "string" ? row[column.captionField] : "";
      const own = (name) => overrides[`Row[${rowId}]/${column.id}/${name}`] ?? {};
      const where = `Table › ${column.id} › row ${rowId}`;
      if (kind === "text") return { type: "INSTANCE", name: "Text-Cell", set, props: onlyOwn(set, { Bold: column.bold ? "Yes" : "No", Caption: Boolean(caption) }), textList: caption ? [label, caption] : [label] };
      if (kind === "badge" || kind === "tag") {
        const labels = (Array.isArray(value) ? value : [value]).filter((item) => item !== undefined && item !== null && item !== "").map(String);
        const layer = kind === "badge" ? "Badge" : "Tag";
        const drawn = kind === "badge" ? { size: "medium", theme: "neutral", background: "subtle", leadingIcon: false } : {};
        return { type: "INSTANCE", name: `${layer}-Cell`, set, props: {}, slots: [{ name: "Items", children: labels.map((text, index) => {
          const node = instanceOf(layer, { ...drawn, ...(labels.length > 1 ? own(`${layer}[${index}]`) : own(layer)) }, where);
          return node ? { ...node, text } : null;
        }).filter(Boolean) }] };
      }
      if (kind === "trend") {
        const number = Number.parseFloat(label.replace(/[^\d.+-]/g, ""));
        return { type: "INSTANCE", name: "Trend-Cell", set, props: { Trend: label.trim().startsWith("-") || number < 0 ? "Down" : number > 0 ? "Up" : "Neutral" }, textList: [label] };
      }
      if (kind === "progress") return { type: "INSTANCE", name: "Progress-Cell", set, props: {}, textList: [`${Math.max(0, Math.min(100, Number(value) || 0))}%`] };
      if (kind === "checkbox" || kind === "toggle") return { type: "INSTANCE", name: "Control-Cell", set, props: { Type: kind === "checkbox" ? "Checkbox" : "Toggle" } };
      if (kind === "actions") {
        const actions = Array.isArray(column.actions) ? column.actions : [];
        return { type: "INSTANCE", name: "Actions-Cell", set, props: {}, slots: [{ name: "Actions", children: actions.map((action, index) => {
          const node = instanceOf("IconButton", { appearance: "flat", level: action.level ?? "primary", size: action.size ?? "md", icon: action.icon, ...(actions.length > 1 ? own(`Button[${index}]`) : own("Button")) }, where);
          return node ? { ...node, name: action.label ?? "Action" } : null;
        }).filter(Boolean) }] };
      }
      // Media cells: the label (and Subtext) in their nested Text-Cell (the live file: Content-Div › Text-Cell › Label,
      // Caption), the Dock Icon's or icon's own look, the photo.
      const media = column.mediaField ? row[column.mediaField] : undefined;
      const node = { type: "INSTANCE", name: set.name.split("/").pop(), set, props: onlyOwn(set, { Bold: column.bold ? "Yes" : "No", Subtext: caption ? "Yes" : "No" }), nested: [{ path: "Text-Cell", props: { Caption: Boolean(caption) }, textList: caption ? [label, caption] : [label] }] };
      if (kind === "dock-icon") {
        const dock = instanceOf("DockIcon", { size: "xs", theme: "neutral", background: "subtle", ...(typeof media === "string" ? { icon: media } : {}), ...own("Dock-Icon") }, where);
        if (dock) node.nested.push({ path: "Dock-Icon", set: dock.set, props: dock.props, ...(typeof own("Dock-Icon").emoji === "string" ? { text: own("Dock-Icon").emoji } : {}) });
      }
      if (kind === "icon" && typeof media === "string") node.swapIcon = media;
      if ((kind === "avatar" || kind === "photo") && typeof media === "string") { node.image = media; images.add(media); }
      return node;
    };
    const rowNodes = rows.map((row, index) => {
      const rowId = row?.id ?? String(index);
      return { type: "INSTANCE", name: `Row ${index + 1}`, set: SETS.dataRow, props: {}, fillW: true, slots: [{ name: "Columns", children: columns.map((column) => sized({ type: "INSTANCE", name: column.id, set: SETS.defaultCell, props: onlyOwn(SETS.defaultCell, { Align: align(column) }), slots: [{ name: "Content", children: [content(column, row ?? {}, rowId)] }] }, column)) }] };
    });
    return { type: "FRAME", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : "Table", layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: [{ type: "INSTANCE", name: "Header", set: SETS.dataRow, props: {}, fillW: true, slots: [{ name: "Columns", children: header }] }, ...rowNodes] };
  }

  /**
   * MetricCard in Figma's Metric-Inline layers: Label and Metric-Number, the Trend badge (its Trend option and label),
   * the Metric-Icon Dock Icon (icon, theme, background), the action's Icon-Main glyph; each part shown only when set.
   */
  function metricParts(element, code, node, where) {
    const texts = {};
    if (typeof code.label === "string") texts.Label = code.label;
    if (typeof code.value === "string" || typeof code.value === "number") texts["Metric-Number"] = String(code.value);
    if (Object.keys(texts).length) node.texts = { ...(node.texts ?? {}), ...texts };
    const trend = plain(element.props.trend);
    const action = layerOf(element, "action");
    Object.assign(node.props, onlyOwn(node.set, { "Metric-Title": Boolean(texts.Label), Trend: Boolean(trend), "Dock-Icon": typeof code.icon === "string", Action: Boolean(action) }));
    const nested = [];
    if (trend && typeof trend === "object") nested.push({ path: "Trend", props: TREND_OPTION[trend.direction] ? { Trend: TREND_OPTION[trend.direction] } : {}, ...(typeof trend.label === "string" ? { textList: [trend.label] } : {}) });
    const dock = typeof code.icon === "string" ? entryFor("DockIcon", {}, byCode, mapping) : null;
    if (dock) {
      const fields = { icon: code.icon, ...(code.iconTheme ? { theme: code.iconTheme } : {}), ...(code.iconBackground ? { background: code.iconBackground } : {}) };
      nested.push({ path: "Metric-Icon", props: figmaProps(dock, fields, mapping, notes, `${where} › Metric-Icon`, new Set(Object.keys(fields))) });
    }
    const actionIcon = action?.name === "IconButton" ? literalOf(action.props.icon) : undefined;
    const button = typeof actionIcon === "string" ? entryFor("IconButton", { appearance: "main" }, byCode, mapping) : null;
    // The action is the Metric's "Button/Icon-Main" instance (layerKey "Button").
    if (button) nested.push({ path: "Button", props: figmaProps(button, { icon: actionIcon }, mapping, notes, `${where} › Button`, new Set(["icon"])) });
    else if (action) notes.push(`${where}: action ${action.name} has no place in Figma's Metric (its Icon-Main)`);
    if (nested.length) node.nested = [...(node.nested ?? []), ...nested];
  }

  /** ListItem in Figma's List-Item layers: Title and Subtitle (hidden without a caption), its leading Avatar (or the Dock Icon it swaps to), Selected. */
  /**
   * A form field in Figma's Input/…-Field layers: its label in Label, what it shows in Text (its value, a SelectField's
   * option label, else the placeholder; a value is State Inputted), its help or error in Message.
   */
  function fieldParts(element, code, node) {
    let shown = [code.value, code.defaultValue].find((value) => (typeof value === "string" && value !== "") || typeof value === "number");
    if (shown !== undefined && element.name === "SelectField") {
      const option = (Array.isArray(plain(element.props.options)) ? plain(element.props.options) : []).find((item) => String(item?.value) === String(shown));
      if (option && textValue(option.label)) shown = option.label;
    }
    const help = [code.errorMessage, code.helpText].find((text) => typeof text === "string" && text);
    const texts = {
      ...(typeof code.label === "string" ? { Label: code.label } : {}),
      // Neither value nor placeholder: the field is empty (not Figma's sample "Placeholder").
      Text: shown !== undefined ? String(shown) : typeof code.placeholder === "string" ? code.placeholder : "",
      ...(help ? { Message: help } : {}),
    };
    if (Object.keys(texts).length) node.texts = { ...(node.texts ?? {}), ...texts };
    if (shown !== undefined && (node.props.State ?? "Default") === "Default") Object.assign(node.props, onlyOwn(node.set, { State: "Inputted" }));
  }

  function listItemParts(element, code, node, where, slots) {
    const texts = {};
    if (typeof code.title === "string") texts.Title = code.title;
    if (typeof code.caption === "string") texts.Subtitle = code.caption;
    else if (layerOf(element, "caption")) texts.Subtitle = deepText(layerOf(element, "caption"));
    if (Object.keys(texts).length) node.texts = { ...(node.texts ?? {}), ...texts };
    // Without a caption Subtitle hides (its own content replaces both when it has children).
    if (texts.Title && !texts.Subtitle && !element.children.some((child) => child.kind === "element")) node.hide = [...(node.hide ?? []), "Subtitle"];
    if (code.selected === true) Object.assign(node.props, onlyOwn(node.set, { State: "Selected" }));
    // Its trailing layer (a Badge, a price, an IconButton) in the Trailing primitive's Actions slot.
    const trailing = layerOf(element, "trailing");
    const after = trailing ? convert(trailing, { direction: "row", stretch: false }) : null;
    if (after) slots.push({ name: "Actions", children: [after] });
    const leading = layerOf(element, "leading");
    if (!leading) return;
    const lead = convert(leading, { direction: "row", stretch: false });
    if (lead?.type === "INSTANCE" && lead.set?.id) (node.nested ??= []).push({ path: "Avatar", set: lead.set, props: lead.props, ...(lead.text ? { text: lead.text } : {}), ...(lead.swapIcon ? { swapIcon: lead.swapIcon } : {}) });
    else notes.push(`${where}: leading ${leading.name} has no place in Figma's List-Item (its Avatar)`);
  }

  function instanceNode(element, code, id, parent = null) {
    const where = `${element.name}${id ? ` (${id})` : ""}`;
    const entry = entryFor(element.name, code, byCode, mapping);
    if (!entry) return wrapperNode(element, code, id, where, parent);
    const filled = new Set(Object.entries(element.props).filter(([name, value]) => name !== "overrides" && ["element", "array", "object"].includes(value.kind)).map(([name]) => name));
    const props = figmaProps(entry, code, mapping, notes, where, null, filled);
    const node = { type: "INSTANCE", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : entry.name, set: { id: entry.id, name: entry.name }, props };
    const label = textOf(element);
    if (label) node.text = label;
    const slots = [];
    const dataSlots = mapping.dataSlots?.[element.name] ?? [];
    const slotProps = SLOT_OF_PROP[element.name] ?? {};
    for (const [name, value] of Object.entries(element.props)) {
      const dataSlot = dataSlots.find((slot) => slot.prop === name);
      if (dataSlot && (value.kind === "array" || value.kind === "object")) {
        const children = dataSlotChildren(element.name, dataSlot, plain(value), code, value);
        // Segmented hugs its items unless fullWidth (Segmented.tsx): its Item-List slot hugs with it.
        // A Segmented's items hug, or split a full-width one: its Item-List slot fills it then (Figma's slot hugs).
        if (children) slots.push({ name: dataSlot.name, children, ...(element.name === "Segmented" ? (code.fullWidth === true ? { fillW: true } : { hugW: true }) : {}) });
        else notes.push(`${where}: ${name} (${dataSlot.name}) has no item set yet: not written`);
        continue;
      }
      if (slotProps[name] && value.kind === "element") {
        const framed = FRAMED_SLOT_PROPS[element.name]?.has(name) ? [convert(value.node, { direction: "column", stretch: true })].filter(Boolean).map((layer) => ({ ...layer, fillW: true })) : null;
        slots.push({ name: slotProps[name], children: framed ?? slotLayers(value) });
        continue;
      }
      if (name === "search" && element.name === "DashboardHeader") continue;
      if (name === "logoCollapsed" && element.name === "Sidebar") continue;
      if (DRAWN_PARTS[element.name]?.has(name)) continue;
      if (value.kind === "array" || (value.kind === "object" && name !== "overrides")) notes.push(`${where}: ${name} is data with no Figma slot: not written`);
      if (value.kind === "element") notes.push(`${where}: ${name} holds layers with no Figma slot: not written`);
    }
    if (element.name === "DashboardHeader") dashboardHeaderParts(element, code, node);
    if (element.name === "MetricCard") metricParts(element, code, node, where);
    // ListBox is as tall as its rows (Figma's List-Box starts at its sample's fixed height, in its Container-Slot frame
    // and its Body-Slot too).
    if (element.name === "ListBox") {
      node.hugH = true;
      node.hugLayers = [{ name: "Container-Slot", h: true }];
    }
    // Segmented is as wide as its items (inline, max-content) unless fullWidth: it never stretches with its column.
    if (element.name === "Segmented") node[code.fullWidth === true ? "fillW" : "hugW"] = true;
    // Card's ⋮ Sub-Action shows by default in Figma; the page shows it only with `subAction`.
    if (element.name === "Card") Object.assign(node.props, onlyOwn(node.set, { "Sub-Action": Boolean(element.props.subAction) }));
    if (element.name === "ListItem") listItemParts(element, code, node, where, slots);
    if (FIELDS.has(element.name)) fieldParts(element, code, node);
    // Progress: its label (a string, else the percentage) in Text; the bar's fill step by its value (Progress-Bar).
    if (element.name === "ProgressBar" || element.name === "ProgressCircle") {
      const value = Math.max(0, Math.min(100, Number(code.value) || 0));
      const label = typeof code.label === "string" ? code.label : code.label ? `${Math.round(value)}%` : null;
      Object.assign(node.props, onlyOwn(node.set, { ...(label ? { Text: label } : {}), ...(element.name === "ProgressBar" ? { Progress: value <= 0 ? "None" : value < 40 ? "Low" : value < 70 ? "Medium" : value < 100 ? "Good" : "Done" } : {}) }));
    }
    if (element.name === "AiChatField" && typeof code.placeholder === "string") node.texts = { ...(node.texts ?? {}), Text: code.placeholder };
    // Toggle: its label and caption (Subtext hidden without one).
    if (element.name === "Toggle") {
      const texts = { ...(typeof code.label === "string" ? { Label: code.label } : {}), ...(typeof code.caption === "string" ? { Subtext: code.caption } : {}) };
      if (Object.keys(texts).length) node.texts = { ...(node.texts ?? {}), ...texts };
      if (texts.Label && !texts.Subtext) node.hide = [...(node.hide ?? []), "Subtext"];
    }
    if (element.name === "FileUpload") {
      const texts = Object.fromEntries([["Label", code.label], ["Message", code.helpText], ["Text", code.text], ["Internal Caption", code.caption]].filter(([, text]) => typeof text === "string" && text));
      if (Object.keys(texts).length) node.texts = { ...(node.texts ?? {}), ...texts };
    }
    // InlineMessage: its title in Title, its words in Caption (not the first text layer), its action's label.
    if (element.name === "InlineMessage") {
      const words = deepText(element).trim();
      node.texts = { ...(node.texts ?? {}), ...(typeof code.title === "string" ? { Title: code.title } : {}), ...(words ? { Caption: words } : {}) };
      delete node.text;
      const action = plain(element.props.action);
      if (action && typeof action === "object" && typeof action.label === "string") (node.nested ??= []).push({ path: "Action", props: {}, text: action.label });
      // Its close button shows only with onClose (Figma's Close starts on).
      node.props.Close = element.props.onClose !== undefined;
    }
    // IconButton without a level takes the one Button.tsx resolves (no static default, so none was written and Figma
    // showed its Primary): Tertiary on Main, Primary on Flat, Accent on Overlay.
    if (element.name === "IconButton" && code.level === undefined && code.variant === undefined) {
      Object.assign(node.props, onlyOwn(node.set, { Level: { flat: "Primary", overlay: "Accent" }[code.appearance] ?? "Tertiary" }));
    }
    if (element.name === "Search") {
      const shown = [code.value, code.defaultValue, code.placeholder].find((text) => typeof text === "string" && text);
      if (shown) node.texts = { ...(node.texts ?? {}), Text: shown };
    }
    // Chip/Advanced draws a leading icon as Theme Leading-Icon (no Icon-Src property): its Leading glyph swapped.
    if (element.name === "Chip" && typeof code.leading === "string" && ownProps(node.set)?.has("Theme")) {
      delete node.props["Icon-Src"];
      node.props.Theme = "Leading-Icon";
      node.swapIcon = code.leading;
    }
    // A Sidebar without a footer: Figma's sample footer rows go, and the footer's divider and padding with them.
    const noFooter = element.name === "Sidebar" && !element.props.footer && entry.slots?.includes("Footer-Content");
    if (noFooter) node.hide = [...(node.hide ?? []), "Divider", "Footer-Container"];
    if (PICTURED.has(element.name) && typeof code.src === "string" && code.src) {
      node.image = code.src;
      images.add(code.src);
      // A photo Avatar only comes with a Subtle background in Figma (Theme=Photo, Background=Solid is no variant).
      if (element.name === "Avatar") Object.assign(node.props, { Theme: "Photo", ...("Background" in node.props ? { Background: "Subtle" } : {}) });
    }
    const layers = element.children.filter((child) => child.kind === "element");
    if (layers.length) {
      const taken = new Set(slots.map((slot) => slot.name));
      const own = CHILD_SLOT[element.name];
      const name = (own && (!entry.slots || entry.slots.includes(own)) ? own : null) ?? (entry.slots ?? []).find((slot) => !taken.has(slot)) ?? "Content";
      // A row the component marks selected (Sidebar selectedId → its SidebarMenuItem's Select Yes).
      const selected = SELECTED_PROP[element.name] ? code[SELECTED_PROP[element.name]] : undefined;
      const content = layers.map((child) => {
        const layer = convert(child, { direction: "column", stretch: true });
        if (layer?.props && "Select" in layer.props && selected !== undefined && literalOf(child.props.id) === selected) layer.props.Select = "Yes";
        // A component's content column stretches its blocks (a Card's Stack, a ListBox's List) and wraps its texts:
        // frames and texts fill the slot.
        return (layer?.type === "FRAME" || layer?.type === "TEXT") && !layer.absolute ? { ...layer, fillW: true } : layer;
      }).filter(Boolean);
      // A ListItem's own content is a column (list-item.css .zen-list-item__contents, Gap/3XSmall); Figma's Contents
      // slot lays its layers in a row: one column frame holds them.
      const column = element.name === "ListItem" && content.length > 1
        ? [{ type: "FRAME", name: "Contents", layout: { mode: "VERTICAL", gap: 2, gapVar: "Spacing/Gap/3XSmall", padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: content, fillW: true }]
        : content;
      slots.push({ name, children: column });
    }
    if (noFooter) slots.push({ name: "Footer-Content", children: [] });
    if (element.name === "Sidebar" && literalOf(element.props.collapsed) === true && (code.variant ?? "basic") !== "workspace") sidebarRail(element, node, slots);
    if (element.name === "ListBox") for (const slot of slots) if (slot.name === "Body-Slot") slot.hugH = true;
    if (slots.length) node.slots = slots;
    const overrides = element.props.overrides;
    if (overrides?.kind === "object") {
      node.nested ??= [];
      for (const [path, value] of Object.entries(overrides.fields)) {
        if (value.kind !== "object") continue;
        // The nested instance's component, layer by layer from the owner (Card › Sub-Action → IconButton).
        let owner = element.name;
        for (const segment of path.split("/")) owner = owner ? nestedLayers[owner]?.[segment.replace(/\[.*$/, "")] : null;
        const fields = Object.fromEntries(Object.entries(value.fields).filter(([, field]) => field.kind === "literal").map(([name, field]) => [name, field.value]));
        const inner = owner ? entryFor(owner, fields, byCode, mapping) : null;
        if (!inner) { notes.push(`${where} › ${path}: its component is not known (override left out)`); continue; }
        node.nested.push({ path, set: { id: inner.id, name: inner.name }, props: figmaProps(inner, fields, mapping, notes, `${where} › ${path}`, new Set(Object.keys(fields))), ...(typeof fields.children === "string" ? { text: fields.children } : {}) });
      }
    }
    if (node.nested && !node.nested.length) delete node.nested;
    return node;
  }

  const title = literalOf(screen.props.title) ?? doc.header?.title ?? "Studio page";
  // The Screen's app frame (screen-chrome.mjs; builder runtime Screen): the desktop layout's Sidebar and Page header, the
  // mobile layout's Top and Bottom navigation, around the page. The other layout's parts wait for a device change.
  const active = screenLayout(device, literalOf(screen.props.layout));
  const chromeProps = SCREEN_CHROME.map((part) => part.prop);
  const chromeOf = (prop) => (SCREEN_CHROME.some((part) => part.prop === prop && part.layout === active) && screen.props[prop]?.kind === "element" ? screen.props[prop].node : null);
  const chrome = chromeProps.some(chromeOf);
  const layers = screen.children.filter((child) => child.kind === "element");
  const rootStack = !chrome && layers.length === 1 && layers[0].name === "Stack";
  // Anything else on the Screen (an AppShell, a Container…) fills the frame's width, as it fills the Screen.
  const filled = (node) => (node.absolute ? node : { ...node, fillW: true });
  // The page's width: the frame's, less the desktop layout's Sidebar (an open Zen Sidebar; any other: unknown).
  const chromeSidebar = chrome && active === "desktop" ? chromeOf("sidebar") : null;
  const chromeSide = chromeSidebar ? sidebarWidth(chromeSidebar, literalOf(chromeSidebar.props.collapsed) === true) : 0;
  const pageWidth = chromeSide === null ? null : frameWidth - chromeSide;
  const page = rootStack ? [] : layers.map((layer) => convert(layer, { direction: "column", stretch: true, width: pageWidth })).filter(Boolean).map(filled);
  const column = (name, children, extra = {}) => ({ type: "FRAME", name, layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: children.filter(Boolean), ...extra });
  const part = (prop, parent) => (chromeOf(prop) ? convert(chromeOf(prop), parent) : null);
  let body = page;
  if (chrome && active === "desktop") {
    const sidebar = part("sidebar", { direction: "row", stretch: true });
    const header = part("header", { direction: "column", stretch: true });
    const main = column("Main", [
      // builder.css .studio-builder-screen__header: Padding/XLarge above and on the sides.
      header && column("Header", [filled(header)], { layout: { mode: "VERTICAL", gap: 0, padding: [24, 24, 0, 24], counter: "MIN", primary: "MIN" }, fillW: true }),
      column("Content", page, { fillW: true }),
    ], { fillW: true });
    body = [{ type: "FRAME", name: "Screen", layout: { mode: "HORIZONTAL", gap: 0, padding: [0, 0, 0, 0], counter: "MIN", primary: "MIN" }, children: [sidebar && { ...sidebar, fillH: true }, main].filter(Boolean), fillW: true }];
  } else if (chrome) {
    body = [part("topNavigation", { direction: "column", stretch: true }), column("Content", page, { fillW: true }), part("bottomNavigation", { direction: "column", stretch: true })].filter(Boolean).map(filled);
  }
  const root = rootStack ? frameNode(layers[0], codeProps(layers[0]), figmaIdOf(layers[0].id), { direction: "column", stretch: true, width: frameWidth }) : { type: "FRAME", name: title, layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0] }, children: body };
  for (const element of [doc.board, screen]) for (const name of Object.keys(element.props)) if (!["id", "title", "device", "layout", ...chromeProps].includes(name) && !DRAWN_BY_PULL.has(name)) notes.push(`${element.name} ${name}: not pushed`);
  // The frame is keyed by the Stack it draws, else by the Screen (its layers keep their own keys).
  if (rootStack && layers[0].id) root.key = layers[0].id;
  else if (screen.id) root.key = screen.id;
  for (const [name, count] of framed) notes.push(`${name}${count > 1 ? ` ×${count}` : ""}: no Figma component, drawn as a frame of its layers (or as its text)`);
  const frame = { ...root, name: title, width: DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop, ...(doc.header?.figma?.file ? { file: doc.header.figma.file } : {}) };
  if (doc.header?.figma?.node) frame.id = doc.header.figma.node;
  // Layers the push draws itself (a Table's rows and cells, a data slot's items, a section) take their parent's key and
  // their place, so importing the page again finds them too.
  const keyed = (node, parentKey, place) => {
    node.key ??= `${parentKey}/${place}`;
    (node.children ?? []).forEach((child, index) => keyed(child, node.key, index));
    (node.slots ?? []).forEach((slot) => slot.children.forEach((child, index) => keyed(child, node.key, `${slot.name}.${index}`)));
  };
  keyed(frame, "page", 0);
  // An icon the code names plainly ("icon-chevron-right-line") is a cut in Figma ("…-medium", icons/generated/aliases.ts).
  const figmaIcon = (value) => (typeof value === "string" && iconAliases[value]) || value;
  const cutIcons = (node) => {
    if (node.swapIcon) node.swapIcon = figmaIcon(node.swapIcon);
    // An Icon placed on its own is the icon component, found by name.
    if (node.set && !node.set.id && node.set.name) node.set = { ...node.set, name: figmaIcon(node.set.name) };
    for (const props of [node.props, ...(node.nested ?? []).map((nested) => nested.props)]) for (const name of Object.keys(props ?? {})) props[name] = figmaIcon(props[name]);
    for (const nested of node.nested ?? []) if (nested.swapIcon) nested.swapIcon = figmaIcon(nested.swapIcon);
    (node.children ?? []).forEach(cutIcons);
    (node.slots ?? []).forEach((slot) => slot.children.forEach(cutIcons));
  };
  cutIcons(frame);
  // The same note for several layers (a MetricCard's trend on four cards) once, with its count.
  const counted = new Map();
  for (const note of notes) counted.set(note, (counted.get(note) ?? 0) + 1);
  return { frame, notes: [...counted].map(([note, count]) => (count > 1 ? `${note} (×${count})` : note)), images: [...images] };
}

/** The file the Zen plugin's Import from Studio reads: `{ format: "zen-studio-figma", version: 1, page, frame }`. */
export function figmaPackage(text, { mapping, nestedLayers = {}, page = {}, newId } = {}) {
  const { frame, notes, images } = figmaFromPage(text, { mapping, nestedLayers, newId });
  if (!frame) return { pkg: null, notes, images: [] };
  // A frame with nothing in it would import as an empty frame: say why instead.
  if (!frame.children?.length) return { pkg: null, notes: [`nothing on the page has a place in Figma${notes.length ? ` (${notes.join("; ")})` : ""}`], images: [] };
  // `images`: picture source → base64 bytes, which the caller fills (the Studio reads its uploads and the dev server's
  // files; the CLI reads repo files): a picture left null keeps the component's own.
  return { pkg: { format: "zen-studio-figma", version: 1, page: { id: page.id ?? null, title: page.title ?? frame.name }, frame, images: Object.fromEntries(images.map((src) => [src, null])) }, notes, images };
}

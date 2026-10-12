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
};
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
};
/** The slot a component's children go in, where it is not the set's first. */
const CHILD_SLOT = { DashboardHeader: "Custome-Elements" };
const SELECTED_PROP = { Sidebar: "selectedId", Segmented: "defaultValue", Tabs: "defaultValue" };
const ITEM_ICON = { Segmented: "leading" };
/** Components whose `src` is a picture the plugin fills in (the instance's image layer). */
const PICTURED = new Set(["Avatar", "Image", "Thumbnail", "AppShellAccount"]);

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
function figmaProps(entry, code, mapping, notes, where, only = null) {
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
    else if (item.type === "TEXT" && typeof value === "string") props[name] = value;
    else if (item.type === "INSTANCE_SWAP" && typeof value === "string") swaps.set(item.prop, { name, icon: value });
  }
  for (const toggle of entry.toggles ?? []) {
    if (only && !only.has(toggle.prop)) continue;
    if (!ownedBySet(toggle.label)) continue;
    // On whenever the prop holds something: an icon, a slot's content, a text (Subheading's "96 results" is only what
    // the pull writes for a toggle without content).
    const value = valueOf(toggle.prop);
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
  if (doc.board.children.filter((child) => child.kind === "element").length > 1) notes.push("only the first Screen is pushed");

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
    const id = figmaIdOf(element.id);
    const code = codeProps(element);
    let node;
    if (element.name === "Stack" || element.name === "Grid" || element.name === "Box") node = frameNode(element, code, id, parent);
    else if (element.name === "Text") {
      const align = { center: "CENTER", end: "RIGHT", justify: "JUSTIFIED" }[code.align];
      node = { type: "TEXT", ...(id ? { id } : {}), characters: textOf(element), ...(code.textStyle ? { textStyle: code.textStyle } : {}), ...(align ? { align } : {}) };
    } else if (element.name === "Icon" && typeof code.name === "string") node = { type: "INSTANCE", ...(id ? { id } : {}), name: code.name, set: { id: null, name: code.name }, props: {} };
    else if (element.name === "SidebarMenuItem") node = itemNode(SETS.menuItem, code, { id });
    else if (element.name === "AppShellAction") node = actionItemNode(code, id);
    else if (element.name === "Table") node = tableNode(element, code, id);
    else node = instanceNode(element, code, id);
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
  function itemNode(set, fields, { id, key, selected = false, labelKey = "label", iconKey = "icon" } = {}) {
    const label = typeof fields[labelKey] === "string" ? fields[labelKey] : typeof fields.children === "string" ? fields.children : "";
    const icon = typeof fields[iconKey] === "string" ? fields[iconKey] : null;
    const props = onlyOwn(set, { Label: label !== "", Icon: Boolean(icon), ...(icon ? { "Icon-Src": icon } : {}), Select: selected ? "Yes" : "No" });
    const name = typeof fields["aria-label"] === "string" ? fields["aria-label"] : label || set.name;
    return { type: "INSTANCE", ...(id ? { id } : {}), ...(key ? { key } : {}), name, set, props, ...(label ? { text: label } : {}) };
  }

  /** AppShellAction as Figma's Dashboard Header Action-Item: Theme Flat, its notification dot or number, the glyph it draws. */
  function actionItemNode(code, id) {
    const count = typeof code.count === "number" ? code.count : 0;
    const props = { Notification: Boolean(code.dot) || count > 0, ...(code.appearance === "flat" ? { Theme: "Flat" } : {}), ...(count > 0 ? { "Noti-type": "Number" } : {}) };
    return { type: "INSTANCE", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : "Action", set: SETS.actionItem, props, ...(count > 0 ? { textList: [String(count)] } : {}), ...(typeof code.icon === "string" ? { swapIcon: code.icon } : {}) };
  }

  const fills = (element, parent) => {
    const code = codeProps(element);
    const row = parent?.direction === "row";
    return { fillW: code.width === "fill" || (!row && parent?.stretch), fillH: code.height === "fill" || (row && parent?.stretch) };
  };

  function frameNode(element, code, id) {
    const grid = element.name === "Grid";
    const row = code.direction === "row";
    const layout = { mode: grid ? "GRID" : row ? "HORIZONTAL" : "VERTICAL" };
    const gap = code.gap ?? "md";
    layout.gap = pxOf(gap, GAP_PX) ?? 0;
    if (short(gap) !== "none" && STEP_NAMES[short(gap)]) layout.gapVar = `Spacing/Gap/${STEP_NAMES[short(gap)]}`;
    const pad = (step) => pxOf(step ?? "none", PADDING_PX) ?? 0;
    const x = pad(code.paddingX ?? code.padding);
    const y = pad(code.paddingY ?? code.padding);
    layout.padding = [y, x, y, x];
    if (code.padding && !code.paddingX && !code.paddingY && short(code.padding) !== "none") layout.paddingVar = `Spacing/Padding/${STEP_NAMES[short(code.padding)]}`;
    if (grid) layout.grid = { columns: Number(code.columns ?? 1) };
    const align = code.align ?? (row ? "center" : "stretch");
    if (!grid) {
      layout.counter = { start: "MIN", center: "CENTER", end: "MAX", baseline: "BASELINE" }[align] ?? "MIN";
      layout.primary = { center: "CENTER", end: "MAX", between: "SPACE_BETWEEN" }[code.justify] ?? "MIN";
      if (code.wrap) layout.wrap = true;
    }
    const context = { direction: row ? "row" : "column", stretch: !grid && align === "stretch" };
    const children = element.children.map((child) => {
      const node = convert(child, context);
      if (!node || grid || node.absolute) return node;
      const { fillW, fillH } = fills(child, context);
      return { ...node, ...(fillW ? { fillW: true } : {}), ...(fillH ? { fillH: true } : {}) };
    }).filter(Boolean);
    if (grid) children.forEach((child, index) => { child.cell = { col: index % layout.grid.columns, row: Math.floor(index / layout.grid.columns), span: 1 }; });
    return { type: "FRAME", ...(id ? { id } : {}), name: element.name, layout, children };
  }

  /** A node prop's layers as a slot's: a Stack the pull made of a slot's several layers gives its layers back. */
  function slotLayers(value) {
    const element = value.node;
    const layers = element.name === "Stack" && !Object.keys(element.props).some((name) => !["gap", "direction", "align", "justify", "wrap", "padding", "paddingX", "paddingY"].includes(name)) ? element.children : [element];
    return layers.map((child) => convert(child, { direction: "column", stretch: false })).filter(Boolean);
  }

  /** A data slot's items as instances of its item set; a nested slot (Sidebar sections) a frame per group, its title first. */
  function dataSlotChildren(owner, dataSlot, value, code) {
    const items = DATA_ITEMS[owner]?.[dataSlot.prop];
    if (!items) return null;
    const labelKey = /\btitle:/.test(dataSlot.newItem(0).code) ? "title" : "label";
    const iconKey = ITEM_ICON[owner] ?? "icon";
    const selectedId = code[SELECTED_PROP[owner]];
    const item = (fields) => itemNode(items.item, fields ?? {}, { selected: fields?.id !== undefined && fields.id === selectedId, labelKey, iconKey });
    const list = Array.isArray(value) ? value : [];
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

  function instanceNode(element, code, id) {
    const where = `${element.name}${id ? ` (${id})` : ""}`;
    const entry = entryFor(element.name, code, byCode, mapping);
    if (!entry) {
      notes.push(`${where}: no Figma set for ${element.name} (left out)`);
      return null;
    }
    const props = figmaProps(entry, code, mapping, notes, where);
    const node = { type: "INSTANCE", ...(id ? { id } : {}), name: typeof code["aria-label"] === "string" ? code["aria-label"] : entry.name, set: { id: entry.id, name: entry.name }, props };
    const label = textOf(element);
    if (label) node.text = label;
    const slots = [];
    const dataSlots = mapping.dataSlots?.[element.name] ?? [];
    const slotProps = SLOT_OF_PROP[element.name] ?? {};
    for (const [name, value] of Object.entries(element.props)) {
      const dataSlot = dataSlots.find((slot) => slot.prop === name);
      if (dataSlot && (value.kind === "array" || value.kind === "object")) {
        const children = dataSlotChildren(element.name, dataSlot, plain(value), code);
        if (children) slots.push({ name: dataSlot.name, children });
        else notes.push(`${where}: ${name} (${dataSlot.name}) has no item set yet: not written`);
        continue;
      }
      if (slotProps[name] && value.kind === "element") { slots.push({ name: slotProps[name], children: slotLayers(value) }); continue; }
      if (name === "search" && element.name === "DashboardHeader") continue;
      if (value.kind === "array" || (value.kind === "object" && name !== "overrides")) notes.push(`${where}: ${name} is data with no Figma slot: not written`);
      if (value.kind === "element") notes.push(`${where}: ${name} holds layers with no Figma slot: not written`);
    }
    if (element.name === "DashboardHeader") dashboardHeaderParts(element, code, node);
    if (PICTURED.has(element.name) && typeof code.src === "string" && code.src) {
      node.image = code.src;
      images.add(code.src);
      if (element.name === "Avatar") node.props.Theme = "Photo";
    }
    const layers = element.children.filter((child) => child.kind === "element");
    if (layers.length) {
      const taken = new Set(slots.map((slot) => slot.name));
      const name = CHILD_SLOT[element.name] ?? (entry.slots ?? []).find((slot) => !taken.has(slot)) ?? "Content";
      slots.push({ name, children: layers.map((child) => convert(child, { direction: "column", stretch: true })).filter(Boolean) });
    }
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
  const device = literalOf(screen.props.device) ?? "desktop";
  const content = screen.children.find((child) => child.kind === "element");
  const root = content && content.name === "Stack" ? frameNode(content, codeProps(content), figmaIdOf(content.id)) : { type: "FRAME", name: title, layout: { mode: "VERTICAL", gap: 0, padding: [0, 0, 0, 0] }, children: content ? [convert(content, null)].filter(Boolean) : [] };
  for (const element of [doc.board, screen]) for (const name of Object.keys(element.props)) if (!["id", "title", "device"].includes(name) && !DRAWN_BY_PULL.has(name)) notes.push(`${element.name} ${name}: not pushed`);
  if (content?.id && root.type === "FRAME") root.key = content.id;
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
  return { frame, notes, images: [...images] };
}

/** The file the Zen plugin's Import from Studio reads: `{ format: "zen-studio-figma", version: 1, page, frame }`. */
export function figmaPackage(text, { mapping, nestedLayers = {}, page = {}, newId } = {}) {
  const { frame, notes, images } = figmaFromPage(text, { mapping, nestedLayers, newId });
  if (!frame) return { pkg: null, notes, images: [] };
  // `images`: picture source → base64 bytes, which the caller fills (the Studio reads its uploads and the dev server's
  // files; the CLI reads repo files): a picture left null keeps the component's own.
  return { pkg: { format: "zen-studio-figma", version: 1, page: { id: page.id ?? null, title: page.title ?? frame.name }, frame, images: Object.fromEntries(images.map((src) => [src, null])) }, notes, images };
}

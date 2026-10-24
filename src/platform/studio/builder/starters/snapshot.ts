import { Fragment, isValidElement, type ReactElement } from "react";
import * as Zen from "../../../../index";
import { componentSchema, propSpecs } from "../../inspector/propSchema";
import { currentFiber, elementFiber, hostsOf, isHostFiber, isPortalFiber, type Fiber } from "../../select/picker";
import { classProps, classSizing, hostNode, libraryMedia, paddingKeyFor, svgPicture, type HostContext } from "./hostLayout";
import { mergeText, type PageDevice, type SnapChild, type SnapNode, type SnapValue } from "./toDialect";

/*
 * Starters (Studio builder GĐ3b M1, spec docs/research/studio-builder-starters-spec-2026-10-07.md §3a, the user's Q2:
 * copy what renders): what a frame shows, read from React's rendered tree, as library components with literal props
 * (./toDialect.ts writes them as a builder page).
 * - A library component is told by identity (the export itself, a function or a memo / forwardRef object), so this also
 *   runs on the deployed docs, where names are minified and nothing carries data-zen-src.
 * - Its props become literals: text, numbers, booleans, lists and plain objects of those; a photo of the library
 *   becomes `zen-media:<key>`. Handlers and other functions go (a page is a drawing; prototype links are added in the
 *   Prototype tab). A controlled prop becomes its default twin (value → defaultValue) when the component has one, so the
 *   page stays interactive. A state the component can keep itself therefore needs that twin (Chip popoverOpen →
 *   defaultPopoverOpen, selected → defaultSelected; Pagination page, Stepper current, 2026-10-15): written as a literal,
 *   the controlled prop would lock it (`popoverOpen={false}`, a menu that never opens on the page).
 * - Elements in its props (children, leading, action…) are read from the fibers they rendered (found by their props
 *   object, which React keeps as the fiber's props), so the page's own components (HrShell, a helper) are walked through
 *   and lists show the rows they rendered; one that did not render (a hidden tab) is read from its props.
 * - What cannot be kept is listed (`notes`), as Detach lists its approximations.
 */

const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15]);
const HOST_TEXT = 6;

const isComponentValue = (value: unknown) => typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value);

/** Library components by identity → name; their component members too (`Card.Header`). */
const zenNames: Map<unknown, string> = (() => {
  const names = new Map<unknown, string>();
  for (const [name, value] of Object.entries(Zen as Record<string, unknown>)) {
    if (!/^[A-Z]/.test(name) || !isComponentValue(value)) continue;
    if (!names.has(value)) names.set(value, name);
    for (const [member, inner] of Object.entries(value as Record<string, unknown>)) {
      if (/^[A-Z]/.test(member) && isComponentValue(inner) && !names.has(inner)) names.set(inner, `${name}.${member}`);
    }
  }
  return names;
})();

/** Library names a page leaves out and walks through: providers (the page's Screen gives the modes). */
const transparent = (name: string) => /Provider$/.test(name);

/** Overlays become Overlay frames (GĐ3b M3, the user's Q4): drawn open there, their own buttons close them. */
export const OVERLAY_NAMES: ReadonlySet<string> = new Set(["Dialog", "ModalForm", "SidePanel", "BottomSheet"].filter((name) => name in Zen));


/** The docs' chrome around an example: its card, a phone mock-up, a provider's own box. */
const CHROME = ".pe-card, .pe-card__stage, .pe-card__preview, .zen-provider, .platform-phone-fit, .platform-phone, .platform-phone__screen, .platform-phone__header, .platform-phone__footer, .patpl-frame, .patpl-frame__scroll";

/** Props a page never writes: React's, the Studio's and the platform's plumbing. */
const SKIPPED = new Set(["children", "key", "ref"]);

export type Snapshot = {
  /** What the frame shows, top level first. */
  nodes: SnapNode[];
  /** The room the docs' example card leaves around it, as a Padding key (null: none, the content fills the frame). */
  padding: string | null;
  /** Overlays the frame holds (open or not), for Overlay frames. */
  overlays: SnapNode[];
  device: PageDevice;
  /** What could not be kept, each once, with how often. */
  notes: string[];
};

/** `lists`: how many lists the value being read is inside (a list's dates are its data, kept as text). */
type Context = { byProps: WeakMap<object, Fiber>; notes: Map<string, number>; overlays: SnapNode[]; seen: WeakSet<object>; depth: number; lists: number; frame: Element; host: HostContext };

const note = (ctx: Context, text: string) => ctx.notes.set(text, (ctx.notes.get(text) ?? 0) + 1);
const literal = (value: string | number | boolean | null): SnapValue => ({ kind: "literal", value });
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function zenName(fiber: Fiber): string | null {
  if (!COMPONENT_TAGS.has(fiber.tag)) return null;
  return zenNames.get(fiber.elementType) ?? zenNames.get(fiber.type) ?? null;
}

function typeName(type: unknown): string {
  if (typeof type === "string") return type;
  const named = type as { displayName?: string; name?: string; render?: { name?: string }; type?: { name?: string } } | null;
  return named?.displayName || named?.name || named?.render?.name || named?.type?.name || "Component";
}

/** A plain object (a literal `{ … }`), not a class instance. */
const isPlainObject = (value: object) => {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

/** A prop's value as a literal tree; undefined when a page cannot hold it (`where` names it in a note). */
function valueOf(raw: unknown, ctx: Context, where: string): SnapValue | undefined {
  if (raw === undefined) return undefined;
  if (raw === null || typeof raw === "boolean") return literal(raw);
  if (typeof raw === "number") return Number.isFinite(raw) ? literal(raw) : undefined;
  if (typeof raw === "string") return literal(libraryMedia(raw));
  if (typeof raw === "function") {
    // Handlers are the page's logic: a page is a drawing (prototype links come from the Prototype tab).
    // Handlers and the page's logic (getRowId, isDisabled…) go quietly; one that draws (a cell, a format) is noted.
    if (!/(^|[\s.])(on|get|is|has|should|compare|sort|filter)[A-Z]/.test(where)) note(ctx, `${where} is a function: left out`);
    return undefined;
  }
  if (typeof raw !== "object") return undefined;
  if (isValidElement(raw)) {
    const nodes = mergeText(fromElement(raw, ctx));
    if (!nodes.length) return undefined;
    if (nodes.length === 1) return nodes[0].kind === "text" ? literal(nodes[0].value) : { kind: "element", node: nodes[0] };
    // A group of actions, badges or text runs side by side: the slot holds them as its layers (user, 2026-10-16: a prop
    // holds several layers for real, as Figma's slot), so each one can be selected, hidden or removed.
    return { kind: "fragment", children: wrapLoose(nodes) };
  }
  if (ctx.seen.has(raw) || ctx.depth > 40) return undefined;
  ctx.seen.add(raw);
  ctx.depth += 1;
  try {
    if (Array.isArray(raw)) {
      ctx.lists += 1;
      try {
        const items = raw.map((item) => valueOf(item, ctx, where)).filter((item): item is SnapValue => item !== undefined);
        return { kind: "array", items };
      } finally {
        ctx.lists -= 1;
      }
    }
    if (raw instanceof Date) {
      // In a list (a row's due date) a date is data, kept as its ISO text; a prop or a field that takes a Date
      // (DateField `today`) cannot be written on a page, so it is left out (the component's default).
      if (ctx.lists) return literal(raw.toISOString());
      note(ctx, `${where} is a date: left out`);
      return undefined;
    }
    // A component given as a value (Link `as={RouterLink}`: forwardRef / memo objects) is code, not something drawn.
    if ("$$typeof" in raw) {
      note(ctx, `${where} is a component: left out`);
      return undefined;
    }
    if (!isPlainObject(raw)) {
      note(ctx, `${where}: a ${(raw as { constructor?: { name?: string } }).constructor?.name ?? "class"} value left out`);
      return undefined;
    }
    const entries = Object.entries(raw);
    // An object holding a date outside a list (a DatePicker range) is left out whole: without its dates it is not one.
    if (!ctx.lists && entries.some(([, field]) => field instanceof Date)) {
      note(ctx, `${where} holds a date: left out`);
      return undefined;
    }
    // A ref ({ current }) is the page's wiring, not something it shows.
    if (entries.length === 1 && entries[0][0] === "current") return undefined;
    // A controller (useForm's form, a table's state): more functions than values is the page's logic.
    const functions = entries.filter(([, field]) => typeof field === "function").length;
    if (functions >= 2 && functions >= entries.length - functions) {
      note(ctx, `${where}: left out (it holds the page's logic)`);
      return undefined;
    }
    const fields: Array<[string, SnapValue]> = [];
    for (const [key, field] of entries) {
      const value = valueOf(field, ctx, `${where}.${key}`);
      if (value !== undefined) fields.push([key, value]);
    }
    return { kind: "object", fields };
  } finally {
    ctx.depth -= 1;
    ctx.seen.delete(raw);
  }
}

/** HTML attribute sets whose `value` / `checked` have an uncontrolled twin (defaultValue / defaultChecked). */
const FIELD_ATTRIBUTES = /\b(Input|Textarea|Select)HTMLAttributes\b/;

/** The props `name` takes, with the uncontrolled twins its HTML field attributes add. */
function propsOf(name: string): Set<string> {
  const own = new Set(propSpecs(name).map((spec) => spec.name));
  if (FIELD_ATTRIBUTES.test(componentSchema(name)?.extends ?? "")) for (const twin of ["defaultValue", "defaultChecked"]) own.add(twin);
  return own;
}

/** Layout primitives and text whose className's CSS can be read back as props (hostLayout.ts classProps). */
const CLASS_READ = new Set(["Stack", "Grid", "Box", "Text", "Heading"]);

/** A library component with its props (from its fiber when it rendered, else from its element). */
function zenNode(name: string, props: Record<string, unknown>, ctx: Context): SnapNode {
  const own = propsOf(name);
  const out: Array<[string, SnapValue]> = [];
  // A primitive styled by a className: what its CSS renders, as the props it does not write (the rest is noted).
  const fiber = typeof props.className === "string" && props.className && CLASS_READ.has(name) ? ctx.byProps.get(props) : undefined;
  const host = fiber ? hostsOf(fiber)[0] : undefined;
  const fromClass = host instanceof HTMLElement ? classProps(name, host, new Set(Object.keys(props).filter((key) => props[key] !== undefined)), ctx.frame, ctx.host) : [];
  if (host) note(ctx, "A layout or text className: read back as props (spacing to the nearest token), its other CSS left out");
  for (const [key, raw] of Object.entries(props)) {
    if (SKIPPED.has(key) || key.startsWith("data-")) continue;
    if (key === "className" || key === "style") {
      if (raw && !(key === "className" && host)) note(ctx, `${key} on library components: left out (a page takes their props and tokens)`);
      continue;
    }
    // A router link (`as={RouterLink} to="/x"`) loses its component: it becomes a plain link to the same place.
    if (key === "to" && typeof raw === "string" && props.as && typeof props.as !== "string") {
      if (props.href === undefined) out.push(["href", literal(raw)]);
      continue;
    }
    const value = valueOf(raw, ctx, `${name} ${key}`);
    if (value === undefined) continue;
    // A controlled value keeps what it shows as the default of the uncontrolled twin (value → defaultValue).
    const twin = `default${capitalize(key)}`;
    out.push([own.has(twin) && !(twin in props) ? twin : key, value]);
  }
  if (name === "Table") cellsAsText(props, out, ctx);
  const node: SnapNode = { kind: "element", name, props: [...out, ...fromClass], children: childrenOf(props.children, ctx) };
  // Any other component styled by a className (a Card, a Button: 103 frames): the width its CSS gives it, as a Box of
  // that size around it (2026-10-08); the rest of that CSS is noted as before.
  if (typeof props.className === "string" && props.className && !CLASS_READ.has(name)) {
    const rendered = ctx.byProps.get(props);
    const element = rendered ? hostsOf(rendered)[0] : undefined;
    const size = element instanceof Element ? classSizing(element, props.className.split(/\s+/)) : null;
    if (size) {
      note(ctx, "A className's width on a library component: kept as a Box around it");
      const sizing: Array<[string, SnapValue]> = [];
      if (size.width !== undefined) sizing.push(["width", literal(size.width)]);
      if (size.minWidth !== undefined) sizing.push(["minWidth", literal(size.minWidth)]);
      if (size.maxWidth !== undefined) sizing.push(["maxWidth", literal(size.maxWidth)]);
      return { kind: "element", name: "Box", props: sizing, children: [node] };
    }
  }
  return node;
}

/** The text an element draws (its children and its title / label / caption props), runs joined by " · ". */
function drawnText(value: unknown, depth = 0): string[] {
  if (value === null || value === undefined || typeof value === "boolean" || depth > 12) return [];
  if (typeof value === "string" || typeof value === "number") return String(value).trim() ? [String(value).trim()] : [];
  if (Array.isArray(value)) return value.flatMap((item) => drawnText(item, depth + 1));
  if (!isValidElement(value)) return [];
  // Screen-reader text is not drawn ("—" for a person who never signed in, its "Not signed in yet" hidden).
  if (zenNames.get(value.type) === "VisuallyHidden") return [];
  const props = (value.props ?? {}) as Record<string, unknown>;
  return ["title", "label", "children", "caption", "description"].flatMap((key) => drawnText(props[key], depth + 1));
}

/** The first library photo a drawn cell holds in its props (an Avatar's src, a PersonAvatar's person.photo), or null. */
function drawnPhoto(value: unknown, depth = 0): string | null {
  if (depth > 6 || value === null || value === undefined) return null;
  if (typeof value === "string") { const media = libraryMedia(value); return media.startsWith("zen-media:") ? media : null; }
  if (Array.isArray(value)) { for (const item of value) { const found = drawnPhoto(item, depth + 1); if (found) return found; } return null; }
  if (isValidElement(value)) return drawnPhoto(value.props, depth + 1);
  if (typeof value === "object") { for (const field of Object.values(value as Record<string, unknown>)) { const found = drawnPhoto(field, depth + 1); if (found) return found; } }
  return null;
}

/** What a Table cell draws, read from its `cell` function's elements (TableMedia, TableBadges, TableActions…). */
type CellLook = Record<string, string | boolean>;
type DrawnCell =
  | { kind: "avatar" | "photo"; label: string; caption: string; bold: boolean; media: string | null; look: CellLook }
  | { kind: "icon" | "dock-icon"; label: string; caption: string; bold: boolean; media: string | null; look: CellLook }
  | { kind: "badge" | "tag"; items: string[]; looks: CellLook[] }
  | { kind: "actions"; actions: Array<{ icon: string; label: string }> }
  | { kind: "text"; label: string; caption: string; bold: boolean };

const CELL_PARTS: ReadonlySet<string> = new Set(["TableMedia", "TableBadges", "TableTags", "TableActions", "TableText"]);

/** The first library element named in `names` a drawn value holds (through fragments, arrays and children). */
function drawnZen(value: unknown, names: ReadonlySet<string>, depth = 0): ReactElement<Record<string, unknown>> | null {
  if (depth > 8 || value === null || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = drawnZen(item, names, depth + 1); if (found) return found; }
    return null;
  }
  if (!isValidElement<Record<string, unknown>>(value)) return null;
  const name = zenNames.get(value.type);
  if (name && names.has(name)) return value;
  return drawnZen(value.props.children, names, depth + 1);
}
/** The elements a part holds in its children (a TableBadges' Badges, a TableActions' buttons), fragments opened. */
function drawnList(value: unknown, depth = 0): Array<ReactElement<Record<string, unknown>>> {
  if (depth > 6 || value === null || value === undefined || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => drawnList(item, depth + 1));
  if (!isValidElement<Record<string, unknown>>(value)) return [];
  return value.type === Fragment ? drawnList(value.props.children, depth + 1) : [value];
}
/** A drawn element's props that differ from what the Table draws in their place (Table.tsx cellOf / cellVisual). */
function lookOf(element: ReactElement<Record<string, unknown>>, drawn: CellLook, own: CellLook = {}): CellLook {
  const props = { ...own, ...element.props } as Record<string, unknown>;
  const look: CellLook = {};
  for (const [key, value] of Object.entries(drawn)) {
    const mine = props[key];
    if ((typeof mine === "string" || typeof mine === "boolean") && mine !== value) look[key] = mine;
  }
  return look;
}
/** A component's defaults the drawn element leaves to it (Badge leadingIcon true, background solid). */
function defaultsOf(name: string, keys: string[]): CellLook {
  const out: CellLook = {};
  for (const spec of propSpecs(name)) if (keys.includes(spec.name) && (typeof spec.defaultValue === "string" || typeof spec.defaultValue === "boolean")) out[spec.name] = spec.defaultValue;
  return out;
}

/** A cell's drawing as a Table column draws it from row fields (`content`), or null: kept as its text. */
function readCell(drawn: unknown, lead = false): DrawnCell | null {
  const part = drawnZen(drawn, CELL_PARTS);
  const text = (value: unknown) => drawnText(value).join(" · ");
  if (!part) return null;
  const name = zenNames.get(part.type);
  const props = part.props;
  if (name === "TableText") return { kind: "text", label: text(props.children), caption: text(props.caption), bold: props.bold === true };
  if (name === "TableMedia") {
    const label = text(props.children);
    const caption = text(props.caption);
    const bold = props.bold === true;
    const media = isValidElement<Record<string, unknown>>(props.media) ? props.media : null;
    const mediaName = media ? zenNames.get(media.type) : null;
    if (media && mediaName === "DockIcon") {
      return { kind: "dock-icon", label, caption, bold, media: typeof media.props.icon === "string" ? media.props.icon : null, look: lookOf(media, { theme: "neutral", background: "subtle" }, defaultsOf("DockIcon", ["theme", "background"])) };
    }
    if (media && mediaName === "Icon") return { kind: "icon", label, caption, bold, media: typeof media.props.name === "string" ? media.props.name : null, look: {} };
    // An Avatar (or a page's own wrapper around one): its photo, else the initials the Table draws from the label.
    const photo = drawnPhoto(media) ?? (media && typeof media.props.src === "string" && media.props.src ? media.props.src : null);
    const square = media?.props.shape === "square";
    // The Table draws the first column's Avatar Solid, the others Subtle (Table.tsx cellVisual).
    const look = media && mediaName === "Avatar" && !photo ? lookOf(media, { theme: "neutral", background: lead ? "solid" : "subtle" }, defaultsOf("Avatar", ["theme", "background"])) : {};
    // Initials the page made its own way ("Bich Ngoc Ha" → BH) where the Table's would differ (Table.tsx initialsOf: BN).
    const initials = media && mediaName === "Avatar" && !photo ? text(media.props.children) : "";
    const tableInitials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("");
    if (initials && initials !== tableInitials) look.children = initials;
    return { kind: square ? "photo" : "avatar", label, caption, bold, media: photo, look };
  }
  if (name === "TableBadges" || name === "TableTags") {
    const component = name === "TableBadges" ? "Badge" : "Tag";
    const items = drawnList(props.children).filter((element) => zenNames.get(element.type) === component);
    if (!items.length) return null;
    const drawnLook: CellLook = component === "Badge" ? { theme: "neutral", background: "subtle", leadingIcon: false } : {};
    const own = component === "Badge" ? defaultsOf("Badge", ["theme", "background", "leadingIcon"]) : {};
    return { kind: component === "Badge" ? "badge" : "tag", items: items.map((element) => text(element.props.children)), looks: items.map((element) => lookOf(element, drawnLook, own)) };
  }
  if (name === "TableActions") {
    const buttons = drawnList(props.children).map((element) => (zenNames.get(element.type) === "Menu" && isValidElement<Record<string, unknown>>(element.props.trigger) ? element.props.trigger : element));
    const actions = buttons.filter((element) => typeof element.props.icon === "string").map((element) => ({ icon: String(element.props.icon), label: String(element.props["aria-label"] ?? element.props.label ?? "Action") }));
    return actions.length ? { kind: "actions", actions } : null;
  }
  return null;
}

/** A row's id as the design copy's Table finds it (Table.tsx defaultRowId: `id`, `key`, else its place). */
function rowIdOf(raw: unknown, index: number): string {
  const own = raw !== null && typeof raw === "object" ? ((raw as { id?: unknown }).id ?? (raw as { key?: unknown }).key) : undefined;
  return typeof own === "string" || typeof own === "number" ? String(own) : `row-${index}`;
}
const objectOf = (fields: CellLook | Record<string, string>): SnapValue => ({ kind: "object", fields: Object.entries(fields).map(([key, value]) => [key, literal(value)]) });

/**
 * A Table whose columns draw their cells with `cell` functions (a page cannot hold one): each such column's cells are
 * drawn here once per row and read as the Table would draw them from row fields, so the design copy (and the Figma
 * push) shows the same cells (core rebuild M8; 2026-10-12, the Admin list's avatars, badges and row menus):
 * - TableMedia → `content: "avatar" | "photo" | "dock-icon" | "icon"`, the row's `<id>`, `<id>Caption` and the photo or
 *   icon in `<id>Photo` / `<id>Icon`; an Avatar's or Dock Icon's own theme and fill as the row's override (`Row[<id>]/<col>/Avatar`).
 * - TableBadges / TableTags → `content: "badge" | "tag"`, the words in the row; a Badge's theme, fill and dot as its
 *   override (`…/Badge`, `Badge[i]` for several).
 * - TableActions → `content: "actions"` with the column's `actions` (icon and name of each button).
 * - TableText, or anything else → the row's text (`<id>`), its caption in `<id>Caption`.
 */
function cellsAsText(props: Record<string, unknown>, out: Array<[string, SnapValue]>, ctx: Context) {
  const columns = Array.isArray(props.columns) ? props.columns : null;
  const rawRows = Array.isArray(props.rows) ? props.rows : Array.isArray(props.data) ? props.data : null;
  const rowsEntry = out.find(([key]) => key === "rows" || key === "data");
  if (!columns || !rawRows || rowsEntry?.[1].kind !== "array") return;
  const rows = rowsEntry[1].items;
  const overrides: Array<[string, SnapValue]> = [];
  const setRowField = (index: number, key: string, value: SnapValue) => {
    const item = rows[index];
    if (!item || item.kind !== "object") return;
    item.fields = [...item.fields.filter(([name]) => name !== key), [key, value]];
  };
  for (const [columnIndex, column] of columns.entries()) {
    const cell = column && typeof column === "object" ? (column as { cell?: unknown; id?: unknown }).cell : undefined;
    const id = column && typeof column === "object" ? (column as { id?: unknown }).id : undefined;
    if (typeof cell !== "function" || typeof id !== "string") continue;
    const drawn: Array<{ index: number; raw: unknown; cell: DrawnCell | null; text: string }> = [];
    rawRows.forEach((raw, index) => {
      if (!raw || typeof raw !== "object") return;
      let element: unknown;
      try { element = (cell as (row: unknown, at: number) => unknown)(raw, index); } catch { return; }
      drawn.push({ index, raw, cell: readCell(element, columnIndex === 0), text: drawnText(element).join(" · ") });
    });
    if (!drawn.length) continue;
    const kinds = new Set(drawn.map((entry) => entry.cell?.kind ?? "text"));
    const kind = kinds.size === 1 ? [...kinds][0] : "text";
    const columnFields: Array<[string, SnapValue]> = [];
    if (kind === "avatar" || kind === "photo" || kind === "icon" || kind === "dock-icon") {
      const media = drawn.map((entry) => entry.cell as Extract<DrawnCell, { media: string | null }>);
      columnFields.push(["content", literal(kind)]);
      // The picture's or icon's field: `<id>Photo` (avatar, photo), `<id>Icon` (icon, dock-icon).
      const mediaKey = `${id}${kind === "avatar" || kind === "photo" ? "Photo" : "Icon"}`;
      if (media.some((entry) => entry.media)) columnFields.push(["mediaField", literal(mediaKey)]);
      if (media.some((entry) => entry.caption)) columnFields.push(["captionField", literal(`${id}Caption`)]);
      if (media.every((entry) => entry.bold)) columnFields.push(["bold", literal(true)]);
      const layer = kind === "dock-icon" ? "Dock-Icon" : "Avatar";
      drawn.forEach(({ index, raw }, at) => {
        const entry = media[at];
        setRowField(index, id, literal(entry.label));
        if (entry.caption) setRowField(index, `${id}Caption`, literal(entry.caption));
        if (entry.media) setRowField(index, mediaKey, literal(entry.media));
        if (Object.keys(entry.look).length && kind !== "icon") overrides.push([`Row[${rowIdOf(raw, index)}]/${id}/${layer}`, objectOf(entry.look)]);
      });
      note(ctx, `Table column "${id}": its cells are a ${kind} column (picture, caption and look per row)`);
    } else if (kind === "badge" || kind === "tag") {
      columnFields.push(["content", literal(kind)]);
      const layer = kind === "badge" ? "Badge" : "Tag";
      drawn.forEach(({ index, raw, cell: read }) => {
        const entry = read as Extract<DrawnCell, { items: string[] }>;
        setRowField(index, id, entry.items.length === 1 ? literal(entry.items[0]) : { kind: "array", items: entry.items.map((item) => literal(item)) });
        entry.looks.forEach((look, at) => {
          if (Object.keys(look).length) overrides.push([`Row[${rowIdOf(raw, index)}]/${id}/${layer}${entry.items.length > 1 ? `[${at}]` : ""}`, objectOf(look)]);
        });
      });
    } else if (kind === "actions") {
      const first = drawn.find((entry) => entry.cell?.kind === "actions")?.cell as Extract<DrawnCell, { kind: "actions" }>;
      // A button named after its row ("Actions for Alex Duong") is named without it: the Table adds the row itself.
      const labelAt = (at: number) => {
        const labels = new Set(drawn.map((entry) => (entry.cell?.kind === "actions" ? entry.cell.actions[at]?.label : undefined)).filter(Boolean));
        return labels.size <= 1 ? first.actions[at].label : first.actions[at].label.replace(/\s+(for|of)\s+.*$/i, "").trim() || "Actions";
      };
      columnFields.push(["content", literal("actions")], ["actions", { kind: "array", items: first.actions.map((action, at) => objectOf({ id: `action-${at + 1}`, icon: action.icon, label: labelAt(at) })) }]);
    } else {
      // Text: the cell's words (a TableText's label, its caption in its own field), unless the row already has them.
      let captions = 0;
      drawn.forEach(({ index, cell: read, text }) => {
        const item = rows[index];
        const own = item?.kind === "object" ? item.fields.find(([key]) => key === id) : undefined;
        const textCell = read?.kind === "text" ? read : null;
        if (!(own && own[1].kind === "literal" && typeof own[1].value === "string")) setRowField(index, id, literal(textCell ? textCell.label : text));
        if (textCell?.caption) { setRowField(index, `${id}Caption`, literal(textCell.caption)); captions += 1; }
      });
      if (captions) columnFields.push(["captionField", literal(`${id}Caption`)]);
      if (drawn.every((entry) => entry.cell?.kind === "text" && entry.cell.bold)) columnFields.push(["bold", literal(true)]);
      if (kinds.size > 1) note(ctx, `Table column "${id}": its cells draw different things; kept as their text`);
    }
    if (columnFields.length) {
      const columnsEntry = out.find(([key]) => key === "columns");
      const entry = columnsEntry?.[1].kind === "array" ? columnsEntry[1].items.find((value) => value.kind === "object" && value.fields.some(([key, field]) => key === "id" && field.kind === "literal" && field.value === id)) : undefined;
      if (entry?.kind === "object") {
        const names = new Set(columnFields.map(([key]) => key));
        entry.fields = [...entry.fields.filter(([key]) => !names.has(key)), ...columnFields];
      }
    }
  }
  // The rows' own looks join the Table's overrides (a page's own entries win).
  if (overrides.length) {
    const existing = out.find(([key]) => key === "overrides");
    if (existing && existing[1].kind === "object") {
      const mine = new Set(existing[1].fields.map(([key]) => key));
      existing[1].fields = [...existing[1].fields, ...overrides.filter(([key]) => !mine.has(key))];
    } else out.push(["overrides", { kind: "object", fields: overrides }]);
  }
}

/** Props an Overlay frame sets itself (it draws the overlay open). */
const OVERLAY_STATE = new Set(["open", "defaultOpen"]);

/**
 * An overlay as an Overlay frame holds it: without its open state, and each of its own actions (an object prop with an
 * onClick: primaryAction, secondaryAction…) closing it, as a new Overlay frame's Dialog does.
 */
function overlayNode(name: string, props: Record<string, unknown>, ctx: Context): SnapNode {
  // An Overlay frame holds the overlay itself, never a sizing Box around it (zenNode for a className).
  const sized = zenNode(name, props, ctx);
  const node = sized.name === name ? sized : (sized.children[0] as SnapNode);
  node.props = node.props.filter(([key]) => !OVERLAY_STATE.has(key)).map(([key, value]): [string, SnapValue] => {
    const raw = props[key];
    if (value.kind !== "object" || !raw || typeof raw !== "object" || typeof (raw as { onClick?: unknown }).onClick !== "function") return [key, value];
    return [key, { kind: "object", fields: [...value.fields, ["onClick", { kind: "proto", action: "close" }]] }];
  });
  return node;
}

/** React children (text, elements, lists, fragments) as snapshot children. */
function childrenOf(children: unknown, ctx: Context): SnapChild[] {
  const out: SnapChild[] = [];
  const visit = (child: unknown) => {
    if (child === null || child === undefined || typeof child === "boolean") return;
    if (typeof child === "string" || typeof child === "number") out.push({ kind: "text", value: String(child) });
    else if (Array.isArray(child)) child.forEach(visit);
    else if (isValidElement(child)) out.push(...fromElement(child, ctx));
    else if (typeof child === "function") note(ctx, "A render function (children as a function): left out");
  };
  visit(children);
  return out;
}

/** An element written in a prop: what it rendered (its fiber, found by its props object), else its own props. */
function fromElement(element: ReactElement, ctx: Context): SnapChild[] {
  const props = (element.props ?? {}) as Record<string, unknown>;
  if (element.type === Fragment) return childrenOf(props.children, ctx);
  const fiber = ctx.byProps.get(props);
  const name = zenNames.get(element.type);
  if (name) {
    if (transparent(name)) return childrenOf(props.children, ctx);
    if (OVERLAY_NAMES.has(name)) { ctx.overlays.push(overlayNode(name, props, ctx)); return []; }
    return [zenNode(name, props, ctx)];
  }
  if (fiber) return fromFiber(fiber, ctx);
  if (typeof element.type === "string") return hostChildren(element.type, childrenOf(props.children, ctx), ctx);
  note(ctx, `<${typeName(element.type)}> was not on screen when the frame was copied: left out`);
  return [];
}

/** Text among elements goes into a Text of its own (a Stack does not style text). */
const wrapLoose = (nodes: SnapChild[]): SnapChild[] => nodes.flatMap((node): SnapChild[] => {
  if (node.kind !== "text") return [node];
  const text = node.value.trim();
  return text ? [{ kind: "element", name: "Text", props: [], children: [{ kind: "text", value: text }] }] : [];
});

/** What an HTML element that did not render (a hidden tab's) keeps on a page: its content. */
function hostChildren(tag: string, children: SnapChild[], ctx: Context): SnapChild[] {
  if (tag === "svg" || tag === "img" || tag === "canvas" || tag === "video" || tag === "iframe") {
    note(ctx, `<${tag}>: left out (a page holds library components)`);
    return [];
  }
  if (tag === "style" || tag === "script" || tag === "template") return [];
  if (tag === "br") return [{ kind: "text", value: "\n" }];
  // Text loose in an HTML tag goes into a Text of its own.
  const kept = children.flatMap((child): SnapChild[] => {
    if (child.kind !== "text") return [child];
    const text = child.value.trim();
    return text ? [{ kind: "element", name: "Text", props: [], children: [{ kind: "text", value: text }] }] : [];
  });
  // A wrapper around one thing (the platform's example frame, a link's span) loses nothing worth saying.
  if (kept.length > 1) note(ctx, `<${tag}>: its layout is not kept (only its content)`);
  return kept;
}

/** What a rendered fiber contributes: a library component, text, or what the fibers inside it render. */
function fromFiber(fiber: Fiber, ctx: Context): SnapChild[] {
  const name = zenName(fiber);
  if (name) {
    const props = fiber.memoizedProps ?? {};
    if (transparent(name)) return fibersIn(fiber, ctx);
    if (OVERLAY_NAMES.has(name)) { ctx.overlays.push(overlayNode(name, props, ctx)); return []; }
    return [zenNode(name, props, ctx)];
  }
  if (fiber.tag === HOST_TEXT) {
    const text = fiber.memoizedProps as unknown;
    return typeof text === "string" || typeof text === "number" ? [{ kind: "text", value: String(text) }] : [];
  }
  // A portal outside a library component (platform chrome): not part of what the frame shows.
  if (isPortalFiber(fiber)) return [];
  if (isHostFiber(fiber)) {
    const tag = typeof fiber.type === "string" ? fiber.type : "div";
    const element = fiber.stateNode;
    // An inline drawing (a brand mark, a custom glyph): a picture of itself, its parts not walked.
    if (tag === "svg" && element instanceof SVGSVGElement) return svgPicture(element, ctx.host);
    // React writes a lone text child into the element itself (no text fiber): <h3>Team</h3>.
    const own = fiber.memoizedProps?.children;
    const children = !fiber.child && (typeof own === "string" || typeof own === "number") ? [{ kind: "text" as const, value: String(own) }] : fibersIn(fiber, ctx);
    // The docs' frame around an example (its card, a phone mock-up, a provider's box): only what it holds.
    if (element instanceof Element && element.matches(CHROME)) return children;
    // A rendered HTML element: its layout, read from the browser, as Stack / Grid / Box / Text (./hostLayout.ts).
    return element instanceof HTMLElement ? hostNode(element, tag, children, ctx.frame, ctx.host) : hostChildren(tag, children, ctx);
  }
  return fibersIn(fiber, ctx);
}

/** The children of a fiber, in order. */
function fibersIn(fiber: Fiber, ctx: Context): SnapChild[] {
  const out: SnapChild[] = [];
  for (let child = fiber.child; child; child = child.sibling) out.push(...fromFiber(child, ctx));
  return out;
}

/** Every fiber under `root` by its props object (the object an element hands its fiber). */
function propsIndex(root: Fiber): WeakMap<object, Fiber> {
  const index = new WeakMap<object, Fiber>();
  const stack: Fiber[] = [root];
  for (let guard = 0; stack.length && guard < 200_000; guard++) {
    const fiber = stack.pop()!;
    const props = fiber.memoizedProps;
    if (props && typeof props === "object" && !index.has(props)) index.set(props, fiber);
    for (let child = fiber.child; child; child = child.sibling) stack.push(child);
  }
  return index;
}

/** The device a page made from `frame` uses: a phone mock-up inside it, else its width. */
function deviceOf(frame: Element): PageDevice {
  if (frame.querySelector(".platform-phone, [data-device='phone']")) return "phone";
  const width = frame instanceof HTMLElement ? frame.offsetWidth : 0;
  return width && width <= 480 ? "phone" : width && width <= 1024 ? "tablet" : "desktop";
}

/** The padding of the docs' example card around its content, as a Padding key; null without one. */
function previewPadding(frame: Element, ctx: HostContext): string | null {
  // The stage (platform.css: padding xlarge; none for a full-screen example) and the preview inside it.
  const boxes = [frame.querySelector(".pe-card__stage"), frame.querySelector(".pe-card__preview")].filter((box): box is HTMLElement => box instanceof HTMLElement);
  const px = boxes.reduce((sum, box) => {
    const style = getComputedStyle(box);
    return sum + Math.max(parseFloat(style.paddingTop) || 0, parseFloat(style.paddingLeft) || 0);
  }, 0);
  return px && boxes[0] ? paddingKeyFor(boxes[0], px, ctx) : null;
}

/** What `frame` (a canvas frame's element) shows, as library components with literal props. */
export function snapshotFrame(frame: Element): Snapshot {
  const host = elementFiber(frame);
  const ctx: Context = { byProps: new WeakMap(), notes: new Map(), overlays: [], seen: new WeakSet(), depth: 0, lists: 0, frame, host: { note: () => undefined, rounded: { count: 0 } } };
  ctx.host.note = (text) => note(ctx, text);
  if (!host) return { nodes: [], padding: null, overlays: [], device: deviceOf(frame), notes: ["The frame has not rendered yet"] };
  const root = currentFiber(host);
  ctx.byProps = propsIndex(root);
  const nodes = fibersIn(root, ctx).filter((child): child is SnapNode => {
    if (child.kind === "element") return true;
    if (child.value.trim()) note(ctx, "Text outside any component: left out");
    return false;
  });
  if (ctx.host.rounded.count) note(ctx, `Spacing that matches no token: rounded to the nearest (×${ctx.host.rounded.count})`);
  const notes = [...ctx.notes].map(([text, count]) => (count > 1 ? `${text} (×${count})` : text));
  return { nodes, padding: previewPadding(frame, ctx.host), overlays: ctx.overlays, device: deviceOf(frame), notes };
}

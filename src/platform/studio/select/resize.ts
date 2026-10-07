import { componentSchema, valueOf } from "../inspector/propSchema";
import type { EditOp, EditValue, SourceAttr, SourceElement } from "../types";
import { columnsOp, withTrackPx, type ColumnsSource } from "./gridTracks";

/*
 * Resize on the canvas (Figma-like): what dragging a handle of the selected element writes. Zen auto-layout props, no
 * absolute positioning: Box / Stack / Grid get `width` / `height` (Fixed px; a double-click sets "hug"), Text and
 * Heading get `width` only. Other library components use their own size props when they have them (a sizing or px
 * `width` / `height`), a boolean `fullWidth` when the drag reaches the parent's content width, else they are wrapped in
 * a Stack whose child fills it (server op "wrap", `fillChildren`): the component itself takes the dragged size. A
 * component already in such a Stack (studioWrapper) edits that Stack instead of being wrapped again. A playground
 * specimen (its props bound to the playground's state) is never wrapped: only its own size props resize it. Plain DOM
 * tags and components outside the library are not resized.
 * A wrap keeps the axis it does not size as the element rendered it (CrossFits, measured at the press): an element
 * stretched by its parent stays stretched (the Stack is left unset there, or "fill"), one with its own size keeps it.
 * A drag never goes below the element's rendered minimum (a Button's label, a Badge's whole label), and an axis whose
 * wrap would not resize what the component shows (an InputField's height, which its size sets) or that the server cannot
 * wrap has no handle. An element a component clones or type-checks (cloning.json: the child of a Tooltip, the body of a
 * ChatMessage, an AppShell's sidebar) is never wrapped, also when a helper returns it or a variable passes it
 * (`sidebar={sidebar}`: the source cannot see it; the client reads the fibers).
 * Every axis without a handle says why (ResizeTarget.why): the size pill shows it.
 * An element that fills the only cell of a Zen Grid column the source sizes in px ("minmax(0, 320px)", "320px") resizes
 * that column instead (ResizeTarget.column: the Grid's `columns` at the frame's breakpoint), so its neighbours follow
 * and the gap stays the gap, as in Figma auto layout; a wrap there would leave free space in the cell.
 */

export type ResizeAxis = "width" | "height";

/**
 * How one axis is written. `prop`: setProp <prop> (a number = Fixed; `hug` when its type takes "hug"); `fullWidth`:
 * fullWidth true when an edge drag reaches the parent's content width, else a wrap; `wrap`: a new Stack around the element, which fills it,
 * takes the size; `wrapper`: the Stack the Studio wrapped the element in before (ResizeTarget.wrapper) takes it.
 */
export type AxisRule = { kind: "prop"; prop: string; hug: boolean } | { kind: "fullWidth" } | { kind: "wrap" } | { kind: "wrapper" } | { kind: "column" };

/** The Grid column a width drag resizes (AxisRule "column"): the Grid's src, the column (0-based), where its tracks are written. */
export type ResizeColumn = { src: string; index: number; source: ColumnsSource };

/** The Stack a component sits in after a wrap (studioWrapper): its src and attributes as the source writes them. */
export type ResizeWrapper = { src: string; attributes: SourceAttr[] };

export type ResizeTarget = {
  /** layout: Box, Stack, Grid; text: Text, Heading; component: any other library component. */
  kind: "layout" | "text" | "component";
  width: AxisRule | null;
  height: AxisRule | null;
  /** Corner handles: both axes are written by one request of one kind (never a wrap beside a prop). */
  corners: boolean;
  /** The Studio wrap Stack around the element, which the `wrapper` rules edit. */
  wrapper?: ResizeWrapper;
  /** The Grid column the `column` width rule edits. */
  column?: ResizeColumn;
  /** Why the server cannot wrap the element (SourceElement.wrap): no wrap axes, and a fullWidth drag only fills. */
  noWrap?: string;
  /** Why an axis (or every handle) is missing, in the order the steps removed them: the size pill says it. */
  why?: string[];
};

/**
 * src/platform/studio/cloning.json, shared with the dev server's wrap guard: elements a component clones or type-checks,
 * which a wrap Stack would break. `props`: an element passed as `Owner.prop`; `parents`: the child of `Owner` (`only`:
 * the child names it clones). `why` says what the component does with it.
 */
export type CloneEntry = {
  /** The child components it clones (else any). */
  only?: string[];
  /** How it still reaches a child further in: "fragment" (<>…</>), "array" (several children, a .map result). */
  through?: string[];
  /** What the component does with the element (for the code reader). */
  why?: string;
  /** What the Studio says; {element} is the element's tag ("<ChatCall>"). */
  reason?: string;
  /** Its `only` children are refused in any position (the dev server's guard; set with `only`). */
  anywhere?: boolean;
};
export type CloningList = { props?: Record<string, CloneEntry>; parents?: Record<string, CloneEntry> };

/**
 * How the element fills its parent on an axis, measured at the press: what a Stack around it keeps on the axis it does
 * not size. "stretch": the element is larger than its own content there (stretched across a flex line or a grid cell,
 * a block's width, grown in a fillChildren Stack) and a Stack in its place, left unset, is too; "fill": it is, but the
 * Stack needs width / height "fill" for it; null: the element has its own size there (a Button, a Chip, a Badge).
 */
export type CrossFit = "stretch" | "fill" | null;
export type CrossFits = Record<ResizeAxis, CrossFit>;
/** Nothing measured: a column wrapper hugs its child's width (the child keeps its own size). */
export const noCross: CrossFits = { width: null, height: null };

/**
 * What else a plan says: the measured fits, how many times the element renders (a .map row: every one changes), and
 * whether a corner handle was dragged (a corner never writes fullWidth: it wraps both axes).
 */
export type PlanOptions = { cross?: CrossFits; count?: number; corner?: boolean };

/** The sizing modes the canvas shows ("Hug · 312"); null = the element's usual size (or a component's own). */
export type AxisMode = "hug" | "fill" | "fixed" | null;

/** The server op that wraps the element at `loc` in `<Stack …props>` (the only op of its request). */
export type WrapOp = Extract<EditOp, { op: "wrap" }>;

export type ResizePlan = {
  ops: EditOp[];
  /** The request wraps the element: the client selects the new Stack (EditResponse.wrapped). */
  wrap: boolean;
  /** The ops go to the element's Studio wrap Stack (this src, a Stack), not to the element. */
  wrapper: string | null;
  /** The ops go to the Grid whose column the element fills (this src, a Grid), not to the element. */
  grid?: string;
  /** Undo label. */
  label: string;
  /** What the canvas announces at commit ("Width 320, fixed"). */
  announce: string;
};

export const layoutResizeNames = new Set(["Box", "Stack", "Grid"]);
export const textResizeNames = new Set(["Text", "Heading"]);

/**
 * Both axes resizable by one request of one kind: two props, two wraps, or a fullWidth width with a wrapped height (a
 * corner drag of those is one wrap of both axes; only an edge drag to the parent's width writes fullWidth).
 */
const cornersOf = (width: AxisRule | null, height: AxisRule | null) =>
  Boolean(width && height && (width.kind === height.kind ? width.kind !== "fullWidth" : width.kind === "fullWidth" && height.kind === "wrap"));

const axisWord = (axis: ResizeAxis) => (axis === "width" ? "Width" : "Height");
/** `why` with `reasons` added (each once). */
const withWhy = (why: string[] | undefined, ...reasons: Array<string | null | undefined>) => {
  const next = [...(why ?? [])];
  for (const reason of reasons) if (reason && !next.includes(reason)) next.push(reason);
  return next.length ? next : undefined;
};
/** Source text shortened for the size pill (one line). */
const clip = (text: string, max = 32) => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
};

const sizeRule = (type: string, prop: string): AxisRule | null => {
  if (!/\bnumber\b/.test(type) && !type.includes("\"hug\"")) return null;
  return { kind: "prop", prop, hug: type.includes("\"hug\"") };
};

/** How the element named `name` resizes, before its source is read; null when it does not (DOM tags, other components). */
export function resizeTarget(name: string, isComponent: boolean): ResizeTarget | null {
  if (!isComponent) return null;
  if (layoutResizeNames.has(name)) return { kind: "layout", width: { kind: "prop", prop: "width", hug: true }, height: { kind: "prop", prop: "height", hug: true }, corners: true };
  // Text / Heading resize like a Figma text box: Auto height until a height is dragged (Fixed size).
  if (textResizeNames.has(name)) return { kind: "text", width: { kind: "prop", prop: "width", hug: true }, height: { kind: "prop", prop: "height", hug: true }, corners: true };
  const schema = componentSchema(name);
  if (!schema) return null;
  const prop = (key: string) => schema.props.find((candidate) => candidate.name === key && !candidate.deprecated);
  const widthProp = prop("width");
  const heightProp = prop("height");
  const width: AxisRule = (widthProp && sizeRule(widthProp.type, "width")) ?? (prop("fullWidth")?.type === "boolean" ? { kind: "fullWidth" } : { kind: "wrap" });
  const height: AxisRule = (heightProp && sizeRule(heightProp.type, "height")) ?? { kind: "wrap" };
  return { kind: "component", width, height, corners: cornersOf(width, height) };
}

/** The prop an axis rule writes ("width", "fullWidth"), or null for a wrap (or the wrapper Stack's). */
const ruleProp = (rule: AxisRule) => (rule.kind === "prop" ? rule.prop : rule.kind === "fullWidth" ? "fullWidth" : null);

/**
 * The target once the source is read: an axis whose prop is bound to an expression, or may come from a spread
 * ({...form.field("email")}), has no handles (the inspector says where it is set; `why` says it too). A wrap never
 * touches the component's props, so a spread leaves the wrap axes alone (a playground specimen, whose props come from
 * the playground's state, is caught by specimenOnly); a fullWidth width whose prop is set in code keeps its wrap (a drag
 * wraps it, never writes fullWidth). Corners need both axes.
 */
export function lockBound(target: ResizeTarget, attributes: SourceAttr[]): ResizeTarget {
  let why = target.why;
  const free = (axis: ResizeAxis, rule: AxisRule | null): AxisRule | null => {
    if (!rule) return rule;
    const prop = ruleProp(rule);
    if (!prop) return rule;
    const value = valueOf(attributes, prop);
    if (value.state !== "bound" && value.state !== "spread") return rule;
    if (rule.kind === "fullWidth") return { kind: "wrap" };
    why = withWhy(why, value.state === "bound" ? `${axisWord(axis)} is set in code (${prop})` : `${axisWord(axis)} may come from ${clip(value.via)}`);
    return null;
  };
  const width = free("width", target.width);
  const height = free("height", target.height);
  return { ...target, width, height, corners: target.corners && cornersOf(width, height), why };
}

/**
 * A playground specimen (inside a component page's playground, its props bound to the playground's state): never
 * wrapped, never its wrapper edited; only its own size props (not bound, see lockBound) resize it. An axis left with
 * no edit has no handle.
 */
export function specimenOnly(target: ResizeTarget): ResizeTarget {
  const own = (rule: AxisRule | null) => (rule?.kind === "prop" ? rule : null);
  const width = own(target.width);
  const height = own(target.height);
  const dropped = Boolean((target.width && !width) || (target.height && !height));
  return { kind: target.kind, width, height, corners: target.corners && cornersOf(width, height), why: withWhy(target.why, dropped ? "A playground specimen is never wrapped in a Stack" : null) };
}

/** Attribute values a Studio wrap Stack may hold as literals only (a bound one makes it someone's own Stack). */
const wrapperProps = ["direction", "align", "fillChildren", "width", "height"];

/**
 * The src of the Stack `host` sits in when it may be a Studio wrap Stack (a fillChildren Stack whose only element is
 * `host`), from the DOM; studioWrapper confirms it from the source. Null otherwise.
 */
export function wrapperCandidate(host: Element): string | null {
  const parent = host.parentElement;
  if (!parent || !parent.classList.contains("zen-stack") || parent.getAttribute("data-fill-children") !== "true") return null;
  if (parent.children.length !== 1 || parent.firstElementChild !== host) return null;
  return parent.getAttribute("data-zen-src") || null;
}

/**
 * Whether `parent` (the source of wrapperCandidate's Stack) is a Studio wrap Stack around the element at `file:loc`:
 * a Stack with a literal fillChildren, no spread, literal (or unset) direction / align / width / height, and that
 * element as its only child.
 */
export function studioWrapper(parent: SourceElement, file: string, loc: string): boolean {
  if (parent.name !== "Stack" || parent.file !== file) return false;
  if (parent.attributes.some((attr) => attr.kind === "spread")) return false;
  const fill = valueOf(parent.attributes, "fillChildren");
  if (fill.state !== "literal" || fill.value !== true) return false;
  if (wrapperProps.some((prop) => valueOf(parent.attributes, prop).state === "bound")) return false;
  const [only, ...rest] = parent.children;
  return !rest.length && only?.kind === "element" && only.loc === loc;
}

/**
 * "line:column" (as data-zen-src writes them) of the element right inside the wrapper whose opening tag starts at `loc`
 * of `text` (a wrap's result: its attributes are literals the Studio wrote, so the first ">" ends the tag); null when
 * there is none.
 */
export function wrappedChildLoc(text: string, loc: string): string | null {
  const [line, column] = loc.split(":").map(Number);
  if (!Number.isInteger(line) || !Number.isInteger(column) || line < 1) return null;
  let offset = 0;
  for (let index = 1; index < line; index++) {
    offset = text.indexOf("\n", offset) + 1;
    if (offset === 0) return null;
  }
  const close = text.indexOf(">", offset + column);
  if (close < 0) return null;
  const start = close + 1 + text.slice(close + 1).search(/\S/);
  if (start <= close || text[start] !== "<") return null;
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  return `${text.slice(0, start).split("\n").length}:${start - lineStart}`;
}

/**
 * "line:column" of the `<Stack …>` opening tag right before the element at `loc` of `text` (where a Studio wrap Stack
 * opens: studioWrapper confirms it from the source), or null.
 */
export function stackTagBefore(text: string, loc: string): string | null {
  const [line, column] = loc.split(":").map(Number);
  if (!Number.isInteger(line) || !Number.isInteger(column) || line < 1) return null;
  let offset = 0;
  for (let index = 1; index < line; index++) {
    offset = text.indexOf("\n", offset) + 1;
    if (offset === 0) return null;
  }
  const start = offset + column;
  if (text[start] !== "<") return null;
  const before = text.slice(0, start).trimEnd();
  if (!before.endsWith(">") || before.endsWith("/>")) return null;
  const open = before.lastIndexOf("<");
  if (open < 0 || !/^<Stack[\s>]/.test(text.slice(open))) return null;
  const lineStart = text.lastIndexOf("\n", open - 1) + 1;
  return `${text.slice(0, open).split("\n").length}:${open - lineStart}`;
}

/** The target of a component in a Studio wrap Stack: the axes that would wrap it (or set fullWidth) edit that Stack. */
export function withWrapper(target: ResizeTarget, wrapper: ResizeWrapper): ResizeTarget {
  if (target.kind !== "component") return target;
  const via = (rule: AxisRule | null): AxisRule | null => (rule && (rule.kind === "wrap" || rule.kind === "fullWidth") ? { kind: "wrapper" } : rule);
  const width = via(target.width);
  const height = via(target.height);
  return { ...target, width, height, corners: cornersOf(width, height), wrapper };
}

/** The target whose width resizes the Grid column the element fills (no corners: the height, if any, is another request). */
export function withColumn(target: ResizeTarget, column: ResizeColumn): ResizeTarget {
  const width: AxisRule = { kind: "column" };
  return { ...target, width, corners: cornersOf(width, target.height), column };
}

/** The axes a drag resizes through a Stack (a new wrap, or the Studio wrap Stack the element sits in). */
export const stackAxes = (target: ResizeTarget): ResizeAxis[] =>
  (["width", "height"] as const).filter((axis) => target[axis]?.kind === "wrap" || target[axis]?.kind === "wrapper");

/** The target without handles on `axes` (corners need both), `reason` saying why. */
export function withoutAxes(target: ResizeTarget, axes: ResizeAxis[], reason?: string): ResizeTarget {
  if (!axes.length) return target;
  const width = axes.includes("width") ? null : target.width;
  const height = axes.includes("height") ? null : target.height;
  const dropped = Boolean((target.width && !width) || (target.height && !height));
  return { ...target, width, height, corners: target.corners && Boolean(width && height), why: dropped ? withWhy(target.why, reason) : target.why };
}

/**
 * Why the dev server cannot wrap the element (GET /element `wrap: { ok, reason }`), or null when it can or does not
 * say (a server older than the flag: the wrap request itself still refuses what it cannot do).
 */
export function wrapRefusal(element: SourceElement | null | undefined): string | null {
  const flag: unknown = element ? (element as SourceElement & { wrap?: unknown }).wrap : undefined;
  if (!flag || typeof flag !== "object") return null;
  const { ok, reason } = flag as { ok?: unknown; reason?: unknown };
  if (ok !== false) return null;
  return typeof reason === "string" && reason.trim() ? reason.trim() : "the dev server cannot wrap it";
}

/**
 * A target that cannot be wrapped (`reason`: the server's verdict, or what clones it): its wrap axes have no handles;
 * own props, fullWidth (to fill) and its Stack stay. `note`: what the size pill says (default: the reason itself).
 */
export function refuseWrap(target: ResizeTarget, reason: string, note: string = reason): ResizeTarget {
  const keep = (rule: AxisRule | null) => (rule?.kind === "wrap" ? null : rule);
  const width = keep(target.width);
  const height = keep(target.height);
  const dropped = Boolean((target.width && !width) || (target.height && !height));
  return { ...target, width, height, corners: target.corners && cornersOf(width, height), noWrap: reason, why: dropped ? withWhy(target.why, note) : target.why };
}

const lastSegment = (name: string) => name.slice(name.lastIndexOf(".") + 1);

/**
 * The cloning.json entry of `parent` (the nearest component above an element in the React tree) when it clones a
 * child named `name`: its `only` lists the name, or it has none. Null otherwise.
 */
export function cloningParent(list: CloningList, parent: string | null, name: string): CloneEntry | null {
  if (!parent || !list.parents) return null;
  const owner = lastSegment(parent);
  const entry = Object.prototype.hasOwnProperty.call(list.parents, owner) ? list.parents[owner] : undefined;
  if (!entry || (entry.only && !entry.only.includes(lastSegment(name)))) return null;
  return entry;
}

/**
 * The cloning.json `props` entry ("Owner.prop") under which `owner` (a component above the element in the React tree)
 * holds the element: that prop of its `props` is a React element annotated with one of `srcs` (the element itself, or a
 * component of the page's own that renders it). A variable or a helper's result counts too (`sidebar={sidebar}`), which
 * the source cannot see. Null otherwise.
 */
export function cloningProp(list: CloningList, owner: string | null, props: Record<string, unknown> | null | undefined, srcs: ReadonlySet<string>): CloneEntry | null {
  if (!owner || !list.props || !props) return null;
  const name = lastSegment(owner);
  for (const [key, entry] of Object.entries(list.props)) {
    const dot = key.lastIndexOf(".");
    if (dot < 0 || key.slice(0, dot) !== name) continue;
    const value: unknown = props[key.slice(dot + 1)];
    if (typeof value !== "object" || value === null || !("$$typeof" in value)) continue;
    const src = (value as { props?: Record<string, unknown> | null }).props?.["data-zen-src"];
    if (typeof src === "string" && srcs.has(src)) return entry;
  }
  return null;
}

/** What the Studio says about an entry's element (`element`: its tag, "<ChatCall>"): the list's reason, filled in. */
export function cloneReason(entry: CloneEntry, element: string, owner: string): string {
  const reason = entry.reason?.trim();
  if (reason) {
    const filled = reason.split("{element}").join(element);
    return filled.charAt(0).toUpperCase() + filled.slice(1);
  }
  return `${element} is cloned by ${lastSegment(owner)}; change it in code.`;
}

/** The longest refusal the size pill shows itself (one line); a longer one is in the status line only. */
const PILL_REASON = 100;
/** What the size pill says about a refusal: the reason when it fits one line, else that it cannot be wrapped. */
export const pillReason = (reason: string) => (reason.length <= PILL_REASON ? reason : "Cannot be wrapped in a Stack");

/** The box that lays `element` out (its parent, past display: contents ones); null when there is none. */
export function layoutParent(element: Element): HTMLElement | null {
  let parent = element.parentElement;
  try {
    while (parent && getComputedStyle(parent).display === "contents") parent = parent.parentElement;
  } catch {
    return null;
  }
  return parent instanceof HTMLElement ? parent : null;
}

/** align-items / justify-items values that stretch a child without a size of its own. */
const stretching = (value: string) => value === "normal" || value === "stretch" || value === "legacy";

/**
 * For an element that fills its parent on `axis` (see CrossFit): whether a Stack in its place fills the same way left
 * unset ("stretch": across a stretching flex line or grid cell, a block's width, along a fillChildren Stack) or needs
 * "fill" (it grew along another flex parent, or stretched itself across a parent that does not stretch children).
 */
export function stackFill(element: Element, axis: ResizeAxis): Exclude<CrossFit, null> {
  const parent = layoutParent(element);
  if (!parent) return "fill";
  try {
    const style = getComputedStyle(parent);
    if (style.display.includes("flex")) {
      if ((axis === "width") === style.flexDirection.startsWith("row")) {
        const shares = parent.classList.contains("zen-stack") && parent.getAttribute("data-fill-children") === "true";
        return shares ? "stretch" : "fill";
      }
      return stretching(style.alignItems) ? "stretch" : "fill";
    }
    if (style.display.includes("grid")) return stretching(axis === "width" ? style.justifyItems : style.alignItems) ? "stretch" : "fill";
    // Flow layout: a block box (a Stack is one) takes the line's width; a height comes from the content.
    return axis === "width" && /^(block|flow-root|list-item|inline-block|table-cell)/.test(style.display) ? "stretch" : "fill";
  } catch {
    return "fill";
  }
}

/** The smallest size a drag writes (a drag past the opposite edge stops here, or at the element's own minimum). */
export const MIN_SIZE = 8;

/** A dragged size in px: whole pixels, or 8 px steps with Shift; never below `floor` (MIN_SIZE at least). */
export function snapSize(value: number, shift: boolean, floor = MIN_SIZE): number {
  const least = Number.isFinite(floor) ? Math.max(MIN_SIZE, Math.ceil(floor)) : MIN_SIZE;
  if (!Number.isFinite(value)) return least;
  return Math.max(least, shift ? Math.round(value / 8) * 8 : Math.round(value));
}

/** The width of `parent`'s content box (CSS px), for fullWidth; null when unreadable. */
export function contentWidth(parent: Element | null): number | null {
  if (!(parent instanceof HTMLElement)) return null;
  try {
    const style = getComputedStyle(parent);
    const width = parent.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    return Number.isFinite(width) && width > 0 ? width : null;
  } catch {
    return null;
  }
}

/** Within 2 px of the parent's content width: the drag means "fill it" (fullWidth). */
export const reachesParent = (width: number, parentWidth: number | null) => parentWidth !== null && Math.abs(width - parentWidth) <= 2;

const number = (value: number): EditValue => ({ kind: "number", value });
const sizeWords = (values: { width?: number; height?: number }) =>
  [values.width !== undefined ? `width ${values.width}` : null, values.height !== undefined ? `height ${values.height}` : null].filter(Boolean).join(", ");
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** A size a Studio wrap Stack takes on one axis: Fixed px, or "hug". */
type StackSize = number | "hug";
type StackValue = string | number | boolean;
/** One prop of a Stack shape: its value, or null to remove it (only for a Stack that exists). */
type ShapeEntry = [string, StackValue | null];
const editValue = (value: StackValue): EditValue =>
  typeof value === "number" ? number(value) : typeof value === "boolean" ? { kind: "boolean", value } : { kind: "string", value };

/**
 * The props of a fillChildren Stack that holds its only child at `changes` (on top of what `current` writes). Only a
 * Fixed size picks the direction (a new wrap, a drag); a Hug keeps the Stack's (a column wrapper whose height hugs
 * stays a column: its child keeps its own height there). A Fixed height makes it a column (fillChildren gives the
 * child that height along the main axis, over the component's own one), with align="stretch" when the width is Fixed
 * too (the child takes it across: in a row a component with its own CSS height would not stretch); a Fixed width alone
 * makes it a row (the child fills it). An axis neither written nor set keeps what `cross` measured (on the element for
 * a new wrap, on the Stack for a later edit): a stretched one stays unset (the Stack stretches like the element did; a
 * new wrap writes "fill" when the Stack needs it to), and a new wrap stretches the child across with align="stretch";
 * a column whose width is the child's own hugs it ("hug": the child keeps its own width). A Stack that this edit
 * leaves a row without a Fixed or Fill height (its height hugs, or a column became a row) loses align="stretch", which
 * would take the child's own height away (layout.css: height auto) and squash it to its content. In the order they
 * are written.
 */
function stackShape(current: SourceAttr[], changes: { width?: StackSize; height?: StackSize }, cross: CrossFits, fresh: boolean): ShapeEntry[] {
  const literal = (prop: string) => {
    const value = valueOf(current, prop);
    return value.state === "literal" ? value.value : undefined;
  };
  const width = changes.width ?? literal("width");
  const height = changes.height ?? literal("height");
  // The element filled its parent there and the Stack does not size that axis: the Stack stretches its child across.
  const stretched = (axis: ResizeAxis) => fresh && (axis === "width" ? width : height) === undefined && cross[axis] !== null;
  const was = literal("direction") === "row" ? "row" : "column";
  let direction = was;
  const shape: ShapeEntry[] = [];
  if (fresh || typeof changes.width === "number" || typeof changes.height === "number") {
    if (typeof height === "number") {
      direction = "column";
      shape.push(["direction", "column"]);
      if (typeof width === "number" || stretched("width")) shape.push(["align", "stretch"]);
    } else if (typeof width === "number") {
      direction = "row";
      shape.push(["direction", "row"]);
      if (stretched("height")) shape.push(["align", "stretch"]);
    }
  }
  if (changes.width !== undefined) shape.push(["width", changes.width]);
  else if (fresh && width === undefined && cross.width === "fill") shape.push(["width", "fill"]);
  else if (direction === "column" && width === undefined && cross.width === null) shape.push(["width", "hug"]);
  if (changes.height !== undefined) shape.push(["height", changes.height]);
  else if (fresh && height === undefined && cross.height === "fill") shape.push(["height", "fill"]);
  const sized = typeof height === "number" || height === "fill";
  if (!fresh && direction === "row" && !sized && (changes.height !== undefined || was !== "row") && literal("align") === "stretch") shape.push(["align", null]);
  return shape;
}

/**
 * The ops that give the wrapper `shape`: setProp for each value it does not already write (direction's default is
 * "column"), removeProp for each null it writes.
 */
function wrapperOps(wrapper: ResizeWrapper, shape: ShapeEntry[]): EditOp[] {
  const ops: EditOp[] = [];
  for (const [prop, value] of shape) {
    const now = valueOf(wrapper.attributes, prop);
    if (value === null) {
      if (now.state === "literal") ops.push({ op: "removeProp", name: prop });
      continue;
    }
    const written = now.state === "literal" ? now.value : prop === "direction" ? "column" : undefined;
    if (written !== value) ops.push({ op: "setProp", name: prop, value: editValue(value) });
  }
  return ops;
}

/** "Tag" → "Tags", "Box" → "Boxes". */
const plural = (name: string) => (/(s|x|z|ch|sh)$/.test(name) ? `${name}es` : `${name}s`);
/** The undo-label and announcement words for an element rendered `count` times (every instance changes). */
const every = (count: number | undefined) => {
  const many = count !== undefined && Number.isInteger(count) && count > 1 ? count : 0;
  return { many, label: many ? `all ${many}` : "", announce: many ? `, all ${many}` : "" };
};

/**
 * What a drag that ended at `values` (the dragged axes only) writes; null when nothing is written (also a wrap the
 * server refuses, target.noWrap). `options.cross`: what the element (or its Studio wrap Stack) fills, measured at the
 * press; `options.count`: how many times it renders (labels and announcements say "all N").
 */
export function planResize(name: string, target: ResizeTarget, values: { width?: number; height?: number }, parentWidth: number | null, options: PlanOptions = {}): ResizePlan | null {
  const axes = (["width", "height"] as const).filter((axis) => values[axis] !== undefined && target[axis]);
  if (!axes.length) return null;
  const all = every(options.count);
  const cross = options.cross ?? noCross;
  const rules = axes.map((axis) => [axis, target[axis]!] as const);
  const dragged = Object.fromEntries(axes.map((axis) => [axis, values[axis]!])) as { width?: number; height?: number };
  // The Grid column it fills takes the width (one request on the Grid; never mixed with another axis).
  if (rules.some(([, rule]) => rule.kind === "column")) {
    const column = target.column;
    const width = dragged.width;
    if (!column || width === undefined || rules.length > 1) return null;
    const list = withTrackPx(column.source.list, column.index, width);
    if (!list) return null;
    const which = `column ${column.index + 1}`;
    return { ops: [columnsOp(column.source, list)], wrap: false, wrapper: null, grid: column.src, label: `${name} width → ${width} (Grid ${which}${all.label ? `, ${all.label}` : ""})`, announce: `Width ${width}, Grid ${which}${all.announce}` };
  }
  // fullWidth: only an edge drag to the parent's content width fills it; any other width (and a corner) is a wrap.
  const fullWidth = rules.find(([, rule]) => rule.kind === "fullWidth");
  if (fullWidth && axes.length === 1 && !options.corner && reachesParent(dragged.width ?? 0, parentWidth)) {
    return { ops: [{ op: "setProp", name: "fullWidth", value: { kind: "boolean", value: true } }], wrap: false, wrapper: null, label: `${name} fullWidth → true${all.label ? ` (${all.label})` : ""}`, announce: `Full width${all.announce}` };
  }
  const sizes = axes.map((axis) => `${axis} → ${dragged[axis]}`).join(", ");
  if (rules.every(([, rule]) => rule.kind === "prop")) {
    const ops: EditOp[] = rules.map(([axis, rule]) => ({ op: "setProp", name: (rule as Extract<AxisRule, { kind: "prop" }>).prop, value: number(dragged[axis]!) }));
    return { ops, wrap: false, wrapper: null, label: `${name} ${sizes}${all.label ? ` (${all.label})` : ""}`, announce: `${capitalize(sizeWords(dragged))}, fixed${all.announce}` };
  }
  // The Stack the Studio wrapped it in before takes the size (no second wrap).
  if (target.wrapper && rules.every(([, rule]) => rule.kind === "wrapper")) {
    const ops = wrapperOps(target.wrapper, stackShape(target.wrapper.attributes, dragged, cross, false));
    if (!ops.length) return null;
    return { ops, wrap: false, wrapper: target.wrapper.src, label: `${name} ${sizes} (its Stack${all.label ? `, ${all.label}` : ""})`, announce: `${capitalize(sizeWords(dragged))}, fixed (in a Stack)${all.announce}` };
  }
  if (rules.some(([, rule]) => rule.kind === "wrapper") || target.noWrap) return null;
  // A wrap takes every dragged axis (corners never mix a wrap with a prop, see resizeTarget): a Stack the component fills.
  // A new Stack has nothing to remove: its shape holds values only.
  const [direction, ...rest] = stackShape([], dragged, cross, true).filter((entry): entry is [string, StackValue] => entry[1] !== null);
  const props: Record<string, EditValue> = Object.fromEntries([direction, ["fillChildren", true] as [string, StackValue], ...rest].map(([prop, value]) => [prop, editValue(value)]));
  const wrap: WrapOp = { op: "wrap", tag: "Stack", props };
  const what = all.many ? `${all.many} ${plural(name)}` : name;
  return { ops: [wrap], wrap: true, wrapper: null, label: `Wrap ${what} in a Stack (${sizeWords(dragged)})`, announce: `${capitalize(sizeWords(dragged))}, fixed (in a Stack)${all.announce}` };
}

/**
 * A double-click on a handle: Hug on its axes. Sizing props get "hug"; a px-only size prop or fullWidth written in the
 * source is removed (the component's own size again). `none`: nothing to write, and why. `options` as planResize
 * (`cross` measured on the Studio wrap Stack).
 */
export function planHug(name: string, target: ResizeTarget, axes: ResizeAxis[], attributes: SourceAttr[], options: PlanOptions = {}): ResizePlan | { none: string } {
  const all = every(options.count);
  // In a Studio wrap Stack: the Stack hugs on those axes (width "hug" gives the component its own width back), in the
  // direction it has (stackShape).
  const wrapped = axes.filter((axis) => target[axis]?.kind === "wrapper");
  if (target.wrapper && wrapped.length && wrapped.length === axes.length) {
    const ops = wrapperOps(target.wrapper, stackShape(target.wrapper.attributes, Object.fromEntries(wrapped.map((axis) => [axis, "hug" as const])), options.cross ?? noCross, false));
    if (!ops.length) return { none: `${name}'s Stack already hugs it` };
    return { ops, wrap: false, wrapper: target.wrapper.src, label: `${name} ${wrapped.map((axis) => `${axis} → hug`).join(", ")} (its Stack${all.label ? `, ${all.label}` : ""})`, announce: `${capitalize(wrapped.join(" and "))} hug (in a Stack)${all.announce}` };
  }
  const ops: EditOp[] = [];
  const done: ResizeAxis[] = [];
  const changes: string[] = [];
  for (const axis of axes) {
    const rule = target[axis];
    if (!rule || rule.kind === "wrap" || rule.kind === "wrapper" || rule.kind === "column") continue;
    const prop = ruleProp(rule)!;
    if (rule.kind === "prop" && rule.hug) {
      ops.push({ op: "setProp", name: prop, value: { kind: "string", value: "hug" } });
      changes.push(`${prop} → hug`);
    } else if (valueOf(attributes, prop).state === "literal") {
      ops.push({ op: "removeProp", name: prop });
      changes.push(`reset ${prop}`);
    } else continue;
    done.push(axis);
  }
  if (!ops.length) return { none: axes.some((axis) => target[axis]?.kind === "column") ? `${name} fills its Grid column: drag the edge to resize the column` : `${name} already takes its own size` };
  return { ops, wrap: false, wrapper: null, label: `${name} ${changes.join(", ")}${all.label ? ` (${all.label})` : ""}`, announce: `${capitalize(done.join(" and "))} hug${all.announce}` };
}

/**
 * Fill container on one axis (the Inspector's instance Width, GĐ4 M4): fullWidth, a sizing prop's "fill", or a Stack
 * that fills on that axis with the component filling it (fillChildren along the Stack's main axis): a new wrap, or the
 * Studio wrap Stack it already sits in (stretched across when that Stack sizes its other axis). `none`: nothing to write.
 */
export function planFill(name: string, target: ResizeTarget, axis: ResizeAxis, options: PlanOptions = {}): ResizePlan | { none: string } {
  const rule = target[axis];
  const all = every(options.count);
  const label = (where: string) => `${name} ${axis} → fill${where}${all.label ? ` (${all.label})` : ""}`;
  const announce = `${axisWord(axis)} fill${all.announce}`;
  if (!rule) return { none: target.why?.join(" · ") ?? `${name}'s ${axis} cannot change here` };
  if (rule.kind === "column") return { none: `${name} fills its Grid column already` };
  if (rule.kind === "fullWidth") return { ops: [{ op: "setProp", name: "fullWidth", value: { kind: "boolean", value: true } }], wrap: false, wrapper: null, label: label(""), announce };
  if (rule.kind === "prop") return rule.hug ? { ops: [{ op: "setProp", name: rule.prop, value: { kind: "string", value: "fill" } }], wrap: false, wrapper: null, label: label(""), announce } : { none: `${name}'s ${rule.prop} takes a size in px only` };
  const main = axis === "width" ? "row" : "column";
  if (rule.kind === "wrapper" && target.wrapper) {
    const other = valueOf(target.wrapper.attributes, axis === "width" ? "height" : "width");
    const otherSized = other.state === "literal" && (typeof other.value === "number" || other.value === "fill");
    // The child fills along the Stack's main axis; with the other axis sized, the Stack keeps its direction and
    // stretches the child across instead.
    const ops = wrapperOps(target.wrapper, otherSized ? [[axis, "fill"], ["align", "stretch"]] : [["direction", main], [axis, "fill"]]);
    if (!ops.length) return { none: `${name}'s Stack already fills its ${axis}` };
    return { ops, wrap: false, wrapper: target.wrapper.src, label: label(" (its Stack)"), announce: `${announce} (in a Stack)` };
  }
  if (rule.kind === "wrapper" || target.noWrap) return { none: target.noWrap ?? `${name}'s Stack is still being read` };
  const props: Record<string, EditValue> = { direction: { kind: "string", value: main }, fillChildren: { kind: "boolean", value: true }, [axis]: { kind: "string", value: "fill" } };
  const what = all.many ? `${all.many} ${plural(name)}` : name;
  return { ops: [{ op: "wrap", tag: "Stack", props }], wrap: true, wrapper: null, label: `Wrap ${what} in a Stack (${axis} fill)`, announce: `${announce} (in a Stack)` };
}

/**
 * Hug on one axis from the Inspector (GĐ4 M4, the user's sizing choice): a Studio wrap Stack that would size nothing
 * once this axis hugs goes (op unwrap: the component takes its own size, no Stack left in the code); else as planHug.
 */
export function planHugAxis(name: string, target: ResizeTarget, axis: ResizeAxis, attributes: SourceAttr[], options: PlanOptions = {}): ResizePlan | { none: string } {
  if (target[axis]?.kind === "wrapper" && target.wrapper) {
    const other = valueOf(target.wrapper.attributes, axis === "width" ? "height" : "width");
    const otherSized = other.state === "literal" && (typeof other.value === "number" || other.value === "fill");
    if (!otherSized) {
      const all = every(options.count);
      return { ops: [{ op: "unwrap" }], wrap: false, wrapper: target.wrapper.src, label: `${name} ${axis} → hug (its Stack goes${all.label ? `, ${all.label}` : ""})`, announce: `${axisWord(axis)} hug${all.announce}` };
    }
  }
  return planHug(name, target, [axis], attributes, options);
}

/**
 * The mode an axis renders with now: the layout primitives' data attributes, a component's own props, or the data
 * attributes of the Studio wrap Stack it fills.
 */
export function currentMode(target: ResizeTarget, axis: ResizeAxis, host: Element, props: Record<string, unknown>): AxisMode {
  const rule = target[axis];
  // It fills its Grid column (the column's width is what a drag changes).
  if (rule?.kind === "column") return "fill";
  const box = target.kind !== "component" ? host : rule?.kind === "wrapper" ? host.parentElement : null;
  if (box) {
    const value = box.getAttribute(axis === "width" ? "data-w" : "data-h");
    return value === "hug" || value === "fill" || value === "fixed" ? value : null;
  }
  if (rule?.kind === "fullWidth") return props.fullWidth === true ? "fill" : null;
  if (rule?.kind !== "prop") return null;
  const value = props[rule.prop];
  return value === "hug" || value === "fill" ? value : typeof value === "number" ? "fixed" : null;
}

const px = (value: number) => String(Math.round(value));

/** One axis of the size pill: "320", "Hug · 312", "Fill · 640". */
export function axisText(mode: AxisMode, value: number): string {
  if (mode === "hug") return `Hug · ${px(value)}`;
  if (mode === "fill") return `Fill · ${px(value)}`;
  return px(value);
}

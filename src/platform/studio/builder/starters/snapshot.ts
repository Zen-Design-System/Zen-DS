import { Fragment, isValidElement, type ReactElement } from "react";
import * as Zen from "../../../../index";
import { componentSchema, propSpecs } from "../../inspector/propSchema";
import { currentFiber, elementFiber, isHostFiber, isPortalFiber, type Fiber } from "../../select/picker";
import { LIBRARY_PHOTOS, MEDIA_PREFIX } from "../library/media";
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
 *   page stays interactive.
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

/** Overlays become Overlay frames (GĐ3b M3); until then they are left out, noted. */
export const OVERLAY_NAMES: ReadonlySet<string> = new Set(["Dialog", "ModalForm", "SidePanel", "BottomSheet"].filter((name) => name in Zen));

/** A library photo's URL in this build → its `zen-media:` key. */
const photoKeys = new Map(LIBRARY_PHOTOS.map((entry) => [entry.photo.src, `${MEDIA_PREFIX}${entry.key}`]));

/** Props a page never writes: React's, the Studio's and the platform's plumbing. */
const SKIPPED = new Set(["children", "key", "ref"]);

export type Snapshot = {
  /** What the frame shows, top level first. */
  nodes: SnapNode[];
  /** Overlays the frame holds (open or not), for Overlay frames. */
  overlays: SnapNode[];
  device: PageDevice;
  /** What could not be kept, each once, with how often. */
  notes: string[];
};

type Context = { byProps: WeakMap<object, Fiber>; notes: Map<string, number>; overlays: SnapNode[]; seen: WeakSet<object>; depth: number };

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
  if (typeof raw === "string") return literal(photoKeys.get(raw) ?? raw);
  if (typeof raw === "function") {
    // Handlers are the page's logic: a page is a drawing (prototype links come from the Prototype tab).
    if (!/(^|[\s.])on[A-Z]/.test(where)) note(ctx, `${where} is a function: left out`);
    return undefined;
  }
  if (typeof raw !== "object") return undefined;
  if (isValidElement(raw)) {
    const nodes = mergeText(fromElement(raw, ctx));
    if (!nodes.length) return undefined;
    if (nodes.length === 1) return nodes[0].kind === "text" ? literal(nodes[0].value) : { kind: "element", node: nodes[0] };
    note(ctx, `${where} held several elements: put in a Stack`);
    return { kind: "element", node: { kind: "element", name: "Stack", props: [["gap", literal("xs")]], children: nodes } };
  }
  if (ctx.seen.has(raw) || ctx.depth > 40) return undefined;
  ctx.seen.add(raw);
  ctx.depth += 1;
  try {
    if (Array.isArray(raw)) {
      const items = raw.map((item) => valueOf(item, ctx, where)).filter((item): item is SnapValue => item !== undefined);
      return { kind: "array", items };
    }
    if (raw instanceof Date) return literal(raw.toISOString());
    if (!isPlainObject(raw)) {
      note(ctx, `${where}: a ${(raw as { constructor?: { name?: string } }).constructor?.name ?? "class"} value left out`);
      return undefined;
    }
    const entries = Object.entries(raw);
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

/** A library component with its props (from its fiber when it rendered, else from its element). */
function zenNode(name: string, props: Record<string, unknown>, ctx: Context): SnapNode {
  const own = propsOf(name);
  const out: Array<[string, SnapValue]> = [];
  for (const [key, raw] of Object.entries(props)) {
    if (SKIPPED.has(key) || key.startsWith("data-")) continue;
    if (key === "className" || key === "style") {
      if (raw) note(ctx, `${name} ${key}: left out (a page takes the component's props and tokens)`);
      continue;
    }
    const value = valueOf(raw, ctx, `${name} ${key}`);
    if (value === undefined) continue;
    // A controlled value keeps what it shows as the default of the uncontrolled twin (value → defaultValue).
    const twin = `default${capitalize(key)}`;
    out.push([own.has(twin) && !(twin in props) ? twin : key, value]);
  }
  return { kind: "element", name, props: out, children: childrenOf(props.children, ctx) };
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
    if (OVERLAY_NAMES.has(name)) { ctx.overlays.push(zenNode(name, props, ctx)); return []; }
    return [zenNode(name, props, ctx)];
  }
  if (fiber) return fromFiber(fiber, ctx);
  if (typeof element.type === "string") return hostChildren(element.type, childrenOf(props.children, ctx), ctx);
  note(ctx, `<${typeName(element.type)}> was not on screen when the frame was copied: left out`);
  return [];
}

/** What a host element (an HTML tag) keeps on a page: its content (GĐ3b M2 turns its layout into Stack / Grid / Box). */
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
    if (OVERLAY_NAMES.has(name)) { ctx.overlays.push(zenNode(name, props, ctx)); return []; }
    return [zenNode(name, props, ctx)];
  }
  if (fiber.tag === HOST_TEXT) {
    const text = fiber.memoizedProps as unknown;
    return typeof text === "string" || typeof text === "number" ? [{ kind: "text", value: String(text) }] : [];
  }
  // A portal outside a library component (platform chrome): not part of what the frame shows.
  if (isPortalFiber(fiber)) return [];
  if (isHostFiber(fiber)) return hostChildren(typeof fiber.type === "string" ? fiber.type : "div", fibersIn(fiber, ctx), ctx);
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

/** What `frame` (a canvas frame's element) shows, as library components with literal props. */
export function snapshotFrame(frame: Element): Snapshot {
  const host = elementFiber(frame);
  const ctx: Context = { byProps: new WeakMap(), notes: new Map(), overlays: [], seen: new WeakSet(), depth: 0 };
  if (!host) return { nodes: [], overlays: [], device: deviceOf(frame), notes: ["The frame has not rendered yet"] };
  const root = currentFiber(host);
  ctx.byProps = propsIndex(root);
  const nodes = fibersIn(root, ctx).filter((child): child is SnapNode => {
    if (child.kind === "element") return true;
    if (child.value.trim()) note(ctx, "Text outside any component: left out");
    return false;
  });
  const notes = [...ctx.notes].map(([text, count]) => (count > 1 ? `${text} (×${count})` : text));
  return { nodes, overlays: ctx.overlays, device: deviceOf(frame), notes };
}

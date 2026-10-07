import { Fragment, isValidElement, type ReactElement } from "react";
import * as Zen from "../../../../index";
import { componentSchema, propSpecs } from "../../inspector/propSchema";
import { currentFiber, elementFiber, hostsOf, isHostFiber, isPortalFiber, type Fiber } from "../../select/picker";
import { classProps, hostNode, libraryMedia, paddingKeyFor, type HostContext } from "./hostLayout";
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

type Context = { byProps: WeakMap<object, Fiber>; notes: Map<string, number>; overlays: SnapNode[]; seen: WeakSet<object>; depth: number; frame: Element; host: HostContext };

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
    // A group of actions, badges or text runs side by side.
    note(ctx, `${where} held several elements: put in a row Stack`);
    return { kind: "element", node: { kind: "element", name: "Stack", props: [["direction", literal("row")], ["gap", literal("xs")], ["align", literal("center")]], children: wrapLoose(nodes) } };
  }
  if (ctx.seen.has(raw) || ctx.depth > 40) return undefined;
  ctx.seen.add(raw);
  ctx.depth += 1;
  try {
    if (Array.isArray(raw)) {
      const items = raw.map((item) => valueOf(item, ctx, where)).filter((item): item is SnapValue => item !== undefined);
      return { kind: "array", items };
    }
    if (raw instanceof Date) {
      // In data (a row's due date) a date is kept as its ISO text; a prop that takes a Date (DateField `today`) cannot
      // be written on a page, so it is left out (the component's default).
      if (where.includes(".")) return literal(raw.toISOString());
      note(ctx, `${where} is a date: left out`);
      return undefined;
    }
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
    const value = valueOf(raw, ctx, `${name} ${key}`);
    if (value === undefined) continue;
    // A controlled value keeps what it shows as the default of the uncontrolled twin (value → defaultValue).
    const twin = `default${capitalize(key)}`;
    out.push([own.has(twin) && !(twin in props) ? twin : key, value]);
  }
  return { kind: "element", name, props: [...out, ...fromClass], children: childrenOf(props.children, ctx) };
}

/** Props an Overlay frame sets itself (it draws the overlay open). */
const OVERLAY_STATE = new Set(["open", "defaultOpen"]);

/**
 * An overlay as an Overlay frame holds it: without its open state, and each of its own actions (an object prop with an
 * onClick: primaryAction, secondaryAction…) closing it, as a new Overlay frame's Dialog does.
 */
function overlayNode(name: string, props: Record<string, unknown>, ctx: Context): SnapNode {
  const node = zenNode(name, props, ctx);
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
  const ctx: Context = { byProps: new WeakMap(), notes: new Map(), overlays: [], seen: new WeakSet(), depth: 0, frame, host: { note: () => undefined, rounded: { count: 0 } } };
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

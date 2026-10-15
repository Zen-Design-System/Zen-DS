import { createElement, isValidElement, type ReactNode } from "react";
import { requiredFunctions, standInKind } from "../../../../../tools/studio/standins.mjs";
import * as Zen from "../../../../index";
import { resolveMediaDeep } from "../library/media";
import { Board, Overlay, protoHandler, Screen, type ProtoActions } from "../proto/runtime";

/*
 * The builder page renderer (spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2b): the neutral tree of
 * tools/studio/dialect.mjs → React elements, without eval. Every element carries data-zen-src (`local:<id>.zen.tsx:L:C`,
 * the same loc annotate() writes) and data-zen-name (component names are minified in a build; the picker reads it first),
 * so selection, Layers, the Inspector and every Studio edit work as on example code.
 */

export type PageValue =
  | { kind: "literal"; value: unknown }
  | { kind: "array"; items: PageValue[] }
  | { kind: "object"; fields: Record<string, PageValue> }
  | { kind: "element"; node: PageNode }
  | { kind: "proto"; action: string; args: unknown[] }
  | { kind: "ref"; root: string; path: string[] };
export type PageNode = { kind: "element"; name: string; loc: string; props: Record<string, PageValue>; children: PageChild[] };
export type PageChild = PageNode | { kind: "text"; value: string } | { kind: "ref"; root: string; path: string[] } | { kind: "map"; source: { root: string; path: string[] }; item: string; node: PageNode };
export type PageTree = { header: Record<string, unknown> | null; mock: Record<string, unknown>; board: PageNode | null; errors: Array<{ line: number; column: number; message: string }> };

const BUILDER: Record<string, unknown> = { Board, Screen, Overlay };

/** A component by name (`Card.Header` follows the dots); null when the library has none. */
function componentOf(name: string): unknown {
  const [head, ...rest] = name.split(".");
  let value: unknown = BUILDER[head] ?? (Zen as Record<string, unknown>)[head];
  for (const key of rest) value = value && typeof value === "object" || typeof value === "function" ? (value as Record<string, unknown>)[key] : undefined;
  return typeof value === "function" || (typeof value === "object" && value !== null) ? value : null;
}

const read = (base: unknown, path: string[]) => path.reduce<unknown>((value, key) => (value !== null && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined), base);

export type RenderContext = {
  /** "local:<id>.zen.tsx" */
  file: string;
  mock: Record<string, unknown>;
  proto: ProtoActions;
  /** Props written on the root of an overlay frame so it shows open while designing ({ open: true }). */
  forceOpen?: boolean;
  /** The elements of the last render, by what their node says: an unchanged node gives the same element (renderCache). */
  cache?: RenderCache;
  /** Each element's document id by its place ("line:col" → id, doc.mjs locsOf): the canvas marks it `<file>:@<id>`
   *  (select/srcIds.ts), which an edit keeps; without one, by its place. */
  ids?: ReadonlyMap<string, string>;
};

type Scope = Record<string, unknown>;

/*
 * Element reuse across edits (user, 2026-10-13: "Độ trễ khoảng 200 ms mỗi lần sửa"): a page's text is parsed anew after
 * each edit, so every node is a new object and React would render the whole page again. A node whose name, place,
 * props and children are as before (its signature) and that renders in the page's own scope gives the element it gave
 * last time, so React skips that subtree. Two generations are kept (this tree's and the last one's); anything around the
 * render that the nodes do not say (the file, the prototype actions, the mock data, the uploaded photos) is the cache's
 * `env`, and a new env starts empty.
 */
export type RenderCache = { tree: unknown; env: string; previous: Map<string, ReactNode>; current: Map<string, ReactNode> };

export const renderCache = (): RenderCache => ({ tree: null, env: "", previous: new Map(), current: new Map() });

/** Moves the cache to `tree` (the last tree's elements become the ones to reuse); nothing when it is there already. */
export function cacheGeneration(cache: RenderCache, tree: unknown, env: string) {
  if (cache.tree === tree && cache.env === env) return;
  cache.previous = cache.env === env ? cache.current : new Map();
  cache.current = new Map();
  cache.tree = tree;
  cache.env = env;
}

/** Two 32-bit string hashes (FNV-1a and djb2) with the length: a node signature's short form. */
function hash(text: string): string {
  let fnv = 0x811c9dc5;
  let djb = 5381;
  for (let index = 0; index < text.length; index++) {
    const code = text.charCodeAt(index);
    fnv = Math.imul(fnv ^ code, 0x01000193);
    djb = (Math.imul(djb, 33) + code) | 0;
  }
  return `${(fnv >>> 0).toString(36)}${(djb >>> 0).toString(36)}${text.length.toString(36)}`;
}

const signatures = new WeakMap<object, string>();

/** What a node says, as a short string: its name, identity (its document id, else its place), props (its elements by
 *  their own signatures) and children. A node is a new object on every parse, so a tree's `ids` stay with its nodes. */
function signatureOf(node: PageNode, ids: ReadonlyMap<string, string> | undefined): string {
  const known = signatures.get(node);
  if (known) return known;
  const props = JSON.stringify(node.props, (_key, value: unknown) => (value && typeof value === "object" && (value as { kind?: unknown }).kind === "element" && (value as { node?: unknown }).node ? `@${signatureOf((value as { node: PageNode }).node, ids)}` : value));
  const children = node.children.map((child) => (child.kind === "element" ? signatureOf(child, ids) : child.kind === "map" ? `map:${JSON.stringify(child.source)}:${child.item}:${signatureOf(child.node, ids)}` : JSON.stringify(child))).join("\u0002");
  const signature = hash(`${node.name}\u0001${ids?.get(node.loc) ?? node.loc}\u0001${props}\u0001${children}`);
  signatures.set(node, signature);
  return signature;
}

/** The element's mark: `<file>:@<id>` when its document gives it one (stable through edits), else `<file>:<line>:<col>`. */
const srcOfNode = (node: PageNode, ctx: RenderContext) => {
  const id = ctx.ids?.get(node.loc);
  return id ? `${ctx.file}:@${id}` : `${ctx.file}:${node.loc}`;
};

function valueOf(value: PageValue, scope: Scope, ctx: RenderContext): unknown {
  switch (value.kind) {
    case "literal": return value.value;
    case "array": return value.items.map((item) => valueOf(item, scope, ctx));
    case "object": return Object.fromEntries(Object.entries(value.fields).map(([key, field]) => [key, valueOf(field, scope, ctx)]));
    case "element": return renderNode(value.node, scope, ctx);
    case "proto": return protoHandler(ctx.proto, value.action, value.args);
    case "ref": return read(scope[value.root], value.path);
  }
}

const STAND_IN = { void: () => undefined, null: () => null, string: () => "" };

/**
 * A function the component requires but a page cannot write (tools/studio/standins.mjs: AiChatField onSubmit, a Table
 * column's cell) gets a stand-in, so the component renders and does nothing; a Table column shows its row's field named
 * by its id, as the exported React does.
 */
function withStandIns(name: string, props: Record<string, unknown>) {
  const required = requiredFunctions(name);
  if (!required) return;
  for (const [prop, signature] of Object.entries(required.props ?? {})) {
    const kind = props[prop] === undefined ? standInKind(signature) : null;
    if (kind) props[prop] = STAND_IN[kind];
  }
  for (const [prop, fields] of Object.entries(required.fields ?? {})) {
    const fill = (object: unknown) => {
      if (!object || typeof object !== "object" || Array.isArray(object) || isValidElement(object)) return object;
      const added: Record<string, unknown> = {};
      for (const [field, signature] of Object.entries(fields)) {
        if ((object as Record<string, unknown>)[field] !== undefined) continue;
        const kind = standInKind(signature);
        if (kind) added[field] = STAND_IN[kind];
      }
      return Object.keys(added).length ? { ...object, ...added } : object;
    };
    const value = props[prop];
    props[prop] = Array.isArray(value) ? value.map(fill) : fill(value);
  }
}

/** Board props no component reads (Play reads them from the page): a Screen's After delay. */
const BOARD_ONLY: Readonly<Record<string, readonly string[]>> = { Screen: ["onDelay"] };

/**
 * The Studio's prototype props on their way to a component (proto/protoModel.ts): the Board's own are dropped, and While
 * hovering (Open overlay) becomes the pointer's enter and leave — its overlay shows while the pointer stays — where the
 * actions take hover (Play's); elsewhere it does nothing.
 */
function prototypeProps(node: PageNode, props: Record<string, unknown>, ctx: RenderContext) {
  for (const prop of BOARD_ONLY[node.name] ?? []) delete props[prop];
  const hover = node.props.whileHovering;
  if (!hover) return;
  delete props.whileHovering;
  const actions = ctx.proto.hover;
  if (hover.kind !== "proto" || hover.action !== "open" || typeof hover.args[0] !== "string" || !actions) return;
  const [overlay, options] = hover.args;
  props.onPointerEnter = () => actions.enter(overlay, options);
  props.onPointerLeave = () => actions.leave();
}

const INITIAL_PROP = /^(default|initial)[A-Z]/;

/** The initial-state props of an element (its own `defaultX` / `initialX`, and those its `overrides` set on nested layers) as one
 *  string, or "" when it has none. */
function initialStateOf(props: Record<string, unknown>): string {
  const initial: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(props)) if (INITIAL_PROP.test(name)) initial[name] = value;
  const overrides = props.overrides;
  if (overrides && typeof overrides === "object") {
    for (const [path, layer] of Object.entries(overrides as Record<string, unknown>)) {
      if (!layer || typeof layer !== "object") continue;
      for (const [name, value] of Object.entries(layer as Record<string, unknown>)) if (INITIAL_PROP.test(name)) initial[`${path}.${name}`] = value;
    }
  }
  return Object.keys(initial).length ? JSON.stringify(initial) : "";
}

/** One element of the page (`key`: its place among its siblings, or its row in a list). */
export function renderNode(node: PageNode, scope: Scope, ctx: RenderContext, key?: string | number, extra?: Record<string, unknown>): ReactNode {
  // In the page's own scope (not a list row's) and without extra props, an unchanged node gives its last element.
  const cache = ctx.cache && scope.mock === ctx.mock && Object.keys(scope).length === 1 && !extra ? ctx.cache : null;
  const cacheKey = cache ? `${key ?? ""}|${signatureOf(node, ctx.ids)}` : "";
  if (cache) {
    const reused = cache.current.get(cacheKey) ?? cache.previous.get(cacheKey);
    if (reused !== undefined) {
      cache.current.set(cacheKey, reused);
      return reused;
    }
  }
  const element = renderFresh(node, scope, ctx, key, extra);
  if (cache) cache.current.set(cacheKey, element);
  return element;
}

function renderFresh(node: PageNode, scope: Scope, ctx: RenderContext, key?: string | number, extra?: Record<string, unknown>): ReactNode {
  const component = componentOf(node.name);
  if (!component) return null;
  const props: Record<string, unknown> = { key, "data-zen-src": srcOfNode(node, ctx), "data-zen-name": node.name, ...extra };
  // A builder page's photo is `zen-media:<key>` (builder/library/media.ts): this build's URL, in a prop's data too (a
  // Table row's picture).
  for (const [name, value] of Object.entries(node.props)) props[name] = resolveMediaDeep(valueOf(value, scope, ctx));
  prototypeProps(node, props, ctx);
  withStandIns(node.name, props);
  // A component reads its initial state once, when it mounts (Table defaultSelectedIds, Checkbox defaultChecked, a chart's
  // initialIndex, a nested layer's default in `overrides`): an edit of one starts that component again, so the canvas
  // shows the new state at once instead of after a reload (user, 2026-10-11).
  const initial = initialStateOf(props);
  if (initial) props.key = `${key ?? ""}~${initial}`;
  const children = node.children.flatMap((child, index): ReactNode[] => {
    if (child.kind === "text") return [child.value];
    if (child.kind === "ref") { const value = read(scope[child.root], child.path); return value === undefined || value === null ? [] : [String(value)]; }
    if (child.kind === "map") {
      const list = read(scope[child.source.root], child.source.path);
      return Array.isArray(list) ? list.map((item, row) => renderNode(child.node, { ...scope, [child.item]: item }, ctx, `${index}:${row}`)) : [];
    }
    return [renderNode(child, scope, ctx, index)];
  });
  return createElement(component as never, props, ...children);
}

/** A Screen or Overlay of the board, with the mock data in scope. An overlay frame shows its overlay open. */
export function renderFrame(node: PageNode, ctx: RenderContext): ReactNode {
  const scope: Scope = { mock: ctx.mock };
  if (node.name !== "Overlay") return renderNode(node, scope, ctx);
  const [first, ...rest] = node.children;
  const opened: PageNode = first && first.kind === "element" && !("open" in first.props) ? { ...first, props: { ...first.props, open: { kind: "literal", value: true } } } : (first as PageNode);
  return renderNode({ ...node, children: first ? [opened, ...rest] : [] }, scope, ctx);
}

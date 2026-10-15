import { createElement, useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import * as Zen from "../index";
import type { Catalog, CatalogComponent, PropSchema } from "./catalog";
import { isNode, markerOf, readPath, splitPath, writePath } from "./spec.mjs";
import type { ActionMarker, UiChild, UiNode, UiSpec, UiValue } from "./spec.mjs";

/*
 * The renderer of a Zen UI spec (docs/ai-ui/README.md): the tree a model composed → real Zen components, with the
 * spec's markers resolved. `$ref` reads `data`; `$state` binds a prop to shared state and its catalog pair writes it
 * back (SelectField value ⇄ onValueChange), so what the person picks is visible to the conversation; `$action` names
 * what a handler does and reaches the app through `onAction`; `$map` repeats a node per item; `pending` draws a Skeleton
 * while content loads. Nothing here is styled: every look is the component's own props and tokens.
 */

export type StateChange = { path: string; value: unknown; id: string | null; prop: string | null };
export type ActionCall = { name: string; args: Record<string, unknown>; id: string | null; event: unknown[]; marker: ActionMarker | null };
export type UiEvent = ({ type: "state" } & StateChange) | ({ type: "action" } & ActionCall);

export type AiUiProps = {
  spec: UiSpec;
  /** docs/ai-ui/catalog.json: without it, pairs are not bound and dates are not coerced (the spec still renders). */
  catalog?: Catalog | null;
  /** The data `$ref` reads; defaults to spec.data. */
  data?: Record<string, unknown>;
  /** Controlled shared state (with onStateChange); leave it out to let the renderer keep it (from defaultState or spec.state). */
  state?: Record<string, unknown>;
  defaultState?: Record<string, unknown>;
  onStateChange?: (next: Record<string, unknown>, change: StateChange) => void;
  /** Every `$action` the person triggers (setState, open and close are applied first, then reported too). */
  onAction?: (action: ActionCall) => void;
  /** Both kinds of event in one stream. */
  onEvent?: (event: UiEvent) => void;
  /** Components by name; defaults to the Zen library. */
  registry?: Record<string, unknown>;
  /** The attribute each element carries with its node id (false for none). */
  idAttribute?: string | false;
};

type Scope = Record<string, unknown>;
type Context = {
  data: Record<string, unknown>;
  state: Record<string, unknown>;
  setState: (path: string, value: unknown, origin?: { id: string | null; prop: string | null }) => void;
  dispatch: (marker: ActionMarker, scope: Scope, id: string | null, event: unknown[]) => void;
  registry: Record<string, unknown>;
  catalog: Catalog | null;
  idAttribute: string | false;
};

const PENDING: Record<string, string> = { text: "SkeletonText", heading: "SkeletonHeading", shape: "SkeletonShape" };
const EMPTY: Record<string, unknown> = {};

function componentOf(registry: Record<string, unknown>, name: string): unknown {
  const [head, ...rest] = name.split(".");
  let value: unknown = registry[head];
  for (const key of rest) value = value && (typeof value === "object" || typeof value === "function") ? (value as Record<string, unknown>)[key] : undefined;
  return typeof value === "function" || (typeof value === "object" && value !== null) ? value : null;
}

const readRef = (path: string, scope: Scope, ctx: Context) => {
  const [root, ...rest] = splitPath(path);
  if (root in scope) return readPath(scope[root], rest);
  if (root === "state") return readPath(ctx.state, rest);
  return readPath(ctx.data, path);
};

type Fill = (field: string) => unknown;

/**
 * Coerces what JSON cannot carry, by the catalog's schema: an ISO string where it says `date` becomes a Date, and a
 * required handler field an object lacks (TableBulkAction.onClick) gets one that reports the action — also inside
 * arrays and nested objects.
 */
function coerce(value: unknown, schema: PropSchema | undefined, catalog: Catalog | null, fill: Fill, depth = 0): unknown {
  if (!schema || value === null || value === undefined || depth > 6) return value;
  const resolved = schema.$ref ? catalog?.$defs[schema.$ref.split("/").pop() ?? ""] : schema;
  if (!resolved) return value;
  if (resolved["x-kind"] === "date") return typeof value === "string" ? new Date(value) : value;
  if (resolved.anyOf) {
    const date = resolved.anyOf.find((s) => s["x-kind"] === "date");
    if (date && typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value);
    const object = typeof value === "object" && !Array.isArray(value) ? resolved.anyOf.find((s) => (s.$ref ? catalog?.$defs[s.$ref.split("/").pop() ?? ""] : s)?.type === "object") : undefined;
    return object ? coerce(value, object, catalog, fill, depth + 1) : value;
  }
  if (resolved.type === "array" && Array.isArray(value)) return value.map((item) => coerce(item, resolved.items, catalog, fill, depth + 1));
  if (resolved.type === "object" && typeof value === "object" && !Array.isArray(value) && resolved.properties) {
    const out: Record<string, unknown> = { ...(value as Record<string, unknown>) };
    for (const [key, field] of Object.entries(resolved.properties)) {
      if (key in out) out[key] = coerce(out[key], field, catalog, fill, depth + 1);
      else if (field["x-kind"] === "action" && resolved.required?.includes(key)) out[key] = fill(key);
    }
    return out;
  }
  return value;
}

/** The value a bound prop takes before the person touched it: the component's own default, else an empty value of its type (so a controlled component never flips from uncontrolled). */
function emptyFor(schema: PropSchema | undefined): unknown {
  if (!schema) return undefined;
  if (schema.default !== undefined && schema.default !== null) return schema.default;
  if (schema["x-kind"] === "date" || schema["x-nullable"]) return null;
  if (schema.type === "boolean" || schema.enum?.every((v) => typeof v === "boolean")) return false;
  if (schema.type === "string" || schema.enum?.every((v) => typeof v === "string")) return "";
  if (schema.type === "array") return [];
  return undefined;
}

function resolveValue(value: UiValue, scope: Scope, ctx: Context, id: string | null): unknown {
  if (isNode(value)) return renderNode(value, scope, ctx);
  // A list of nodes in a prop (ListItem title with an inline Link) needs keys, as any React list does.
  if (Array.isArray(value)) return value.map((item, index) => (isNode(item) ? renderNode(item, scope, ctx, index) : resolveValue(item, scope, ctx, id)));
  if (value === null || typeof value !== "object") return value;
  switch (markerOf(value)) {
    case "ref": return readRef((value as { $ref: string }).$ref, scope, ctx);
    case "state": return readPath(ctx.state, (value as { $state: string }).$state);
    case "action": { const marker = value as ActionMarker; return (...event: unknown[]) => ctx.dispatch(marker, scope, id, event); }
    case "map": return undefined;
    case "pending": return pendingElement((value as { $pending: string }).$pending, ctx, null);
    default: return Object.fromEntries(Object.entries(value as Record<string, UiValue>).map(([key, field]) => [key, resolveValue(field, scope, ctx, id)]));
  }
}

function pendingElement(kind: string, ctx: Context, id: string | null, key?: string | number): ReactNode {
  const component = componentOf(ctx.registry, PENDING[kind] ?? "SkeletonShape") ?? componentOf(ctx.registry, "SkeletonShape");
  if (!component) return null;
  const props: Record<string, unknown> = { key };
  if (ctx.idAttribute && id) props[ctx.idAttribute] = id;
  return createElement(component as never, props);
}

function renderChild(child: UiChild, scope: Scope, ctx: Context, key: number): ReactNode {
  if (typeof child === "string" || typeof child === "number") return child;
  if (isNode(child)) return renderNode(child, scope, ctx, key);
  switch (markerOf(child)) {
    case "ref": { const value = readRef((child as { $ref: string }).$ref, scope, ctx); return value === undefined || value === null ? null : String(value); }
    case "state": { const value = readPath(ctx.state, (child as { $state: string }).$state); return value === undefined || value === null ? null : String(value); }
    case "pending": return pendingElement((child as { $pending: string }).$pending, ctx, null, key);
    case "map": {
      const map = child as { $map: string; as: string; node: UiNode };
      const list = readRef(map.$map, scope, ctx);
      if (!Array.isArray(list)) return null;
      return list.map((item, row) => renderNode(map.node, { ...scope, [map.as]: item }, ctx, `${key}:${row}`, row));
    }
    default: return null;
  }
}

/** One node → one element: props resolved, pairs bound to state, required handlers emitting actions, children rendered. */
export function renderNode(node: UiNode, scope: Scope, ctx: Context, key?: string | number, row?: number): ReactNode {
  const entry: CatalogComponent | undefined = ctx.catalog?.components[node.type];
  const id = typeof node.id === "string" ? (row === undefined ? node.id : `${node.id}:${row}`) : null;
  if (node.pending) return pendingElement(/^(Heading)$/.test(node.type) ? "heading" : /^(Text|Link)$/.test(node.type) ? "text" : "shape", ctx, id, key);
  const component = componentOf(ctx.registry, node.type);
  if (!component) return null;
  const spec = node.props ?? EMPTY;
  const props: Record<string, unknown> = { key };
  if (ctx.idAttribute && id) props[ctx.idAttribute] = id;
  const fill: Fill = (field) => (...event: unknown[]) => ctx.dispatch({ $action: field }, scope, id, event);
  for (const [name, value] of Object.entries(spec)) {
    if (name === "children") continue;
    props[name] = coerce(resolveValue(value as UiValue, scope, ctx, id), entry?.props[name], ctx.catalog, fill);
  }
  for (const pair of entry?.bindings ?? []) {
    const given = spec[pair.prop];
    const path = markerOf(given) === "state" ? (given as { $state: string }).$state : pair.auto && given === undefined && spec[pair.handler] === undefined && id ? `${id}.${pair.prop}` : null;
    if (!path) continue;
    let value = readPath(ctx.state, path);
    if (value === undefined) value = pair.initial && spec[pair.initial] !== undefined ? props[pair.initial] : emptyFor(entry?.props[pair.prop]);
    props[pair.prop] = coerce(value, entry?.props[pair.prop], ctx.catalog, fill);
    const own = props[pair.handler];
    props[pair.handler] = (next: unknown, ...rest: unknown[]) => {
      ctx.setState(path, next instanceof Date ? next.toISOString() : next, { id, prop: pair.prop });
      if (typeof own === "function") (own as (...args: unknown[]) => void)(next, ...rest);
    };
  }
  for (const name of entry?.requiredActions ?? []) {
    if (props[name] !== undefined) continue;
    props[name] = (...event: unknown[]) => ctx.dispatch({ $action: name }, scope, id, event);
  }
  const children = [...(node.children ?? []), ...(spec.children !== undefined ? [spec.children as UiChild] : [])].map((child, index) => renderChild(child, scope, ctx, index));
  return createElement(component as never, props, ...children);
}

/** Renders a spec without React state: `state` and `data` as given, every event through the callbacks (tests, servers). */
export function renderSpec(spec: UiSpec, options: Omit<AiUiProps, "spec" | "state" | "defaultState"> & { state?: Record<string, unknown>; setState?: Context["setState"] } = {}): ReactNode {
  const ctx = contextOf(spec, options, options.state ?? spec.state ?? {}, options.setState ?? (() => undefined));
  return isNode(spec?.root) ? renderNode(spec.root, {}, ctx) : null;
}

function contextOf(spec: UiSpec, options: Omit<AiUiProps, "spec" | "state" | "defaultState">, state: Record<string, unknown>, setState: Context["setState"]): Context {
  const ctx: Context = {
    data: options.data ?? spec.data ?? EMPTY,
    state,
    setState,
    registry: options.registry ?? (Zen as unknown as Record<string, unknown>),
    catalog: options.catalog ?? null,
    idAttribute: options.idAttribute === undefined ? "data-ai-ui-id" : options.idAttribute,
    dispatch: (marker, scope, id, event) => {
      const args = marker.args ? (resolveValue(marker.args, scope, ctx, id) as Record<string, unknown>) : {};
      if (marker.$action === "setState" && typeof marker.path === "string") setState(marker.path, marker.value === undefined ? undefined : resolveValue(marker.value, scope, ctx, id), { id, prop: null });
      else if ((marker.$action === "open" || marker.$action === "close") && typeof marker.id === "string") setState(`${marker.id}.open`, marker.$action === "open", { id: marker.id, prop: "open" });
      const call: ActionCall = { name: marker.$action, args, id, event, marker };
      options.onAction?.(call);
      options.onEvent?.({ type: "action", ...call });
    },
  };
  return ctx;
}

/** A Zen UI spec as a React tree, with shared state the conversation can read and write. */
export function AiUi({ spec, state, defaultState, onStateChange, onEvent, ...options }: AiUiProps) {
  const [inner, setInner] = useState<Record<string, unknown>>(() => defaultState ?? spec.state ?? {});
  const current = state ?? inner;
  const latest = useRef(current);
  latest.current = current;
  const setState = useCallback<Context["setState"]>((path, value, origin) => {
    const next = writePath(latest.current, path, value);
    latest.current = next;
    if (state === undefined) setInner(next);
    const change: StateChange = { path, value, id: origin?.id ?? null, prop: origin?.prop ?? null };
    onStateChange?.(next, change);
    onEvent?.({ type: "state", ...change });
  }, [state, onStateChange, onEvent]);
  const ctx = useMemo(() => contextOf(spec, { ...options, onEvent }, current, setState), [spec, current, setState, onEvent, options.catalog, options.data, options.onAction, options.registry, options.idAttribute]);
  return <>{isNode(spec?.root) ? renderNode(spec.root, {}, ctx) : null}</>;
}

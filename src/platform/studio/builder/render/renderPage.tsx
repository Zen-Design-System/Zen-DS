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
};

type Scope = Record<string, unknown>;

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

/** One element of the page (`key`: its place among its siblings, or its row in a list). */
export function renderNode(node: PageNode, scope: Scope, ctx: RenderContext, key?: string | number, extra?: Record<string, unknown>): ReactNode {
  const component = componentOf(node.name);
  if (!component) return null;
  const props: Record<string, unknown> = { key, "data-zen-src": `${ctx.file}:${node.loc}`, "data-zen-name": node.name, ...extra };
  // A builder page's photo is `zen-media:<key>` (builder/library/media.ts): this build's URL, in a prop's data too (a
  // Table row's picture).
  for (const [name, value] of Object.entries(node.props)) props[name] = resolveMediaDeep(valueOf(value, scope, ctx));
  withStandIns(node.name, props);
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

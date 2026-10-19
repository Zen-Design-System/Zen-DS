import { useSyncExternalStore } from "react";
import { LOCKED_PROP, NAME_PROP, autoLayerNames, givenNameOf, isLockedValue } from "../../../../tools/studio/layer-meta.mjs";
import type { PageChild, PageNode } from "../builder/render/renderPage";
import { layerName } from "./layerNames";

/*
 * Figma's layer names and locks on a page made in the Studio (plan docs/research/studio-figma-design-parity-2026-10-18.md
 * F1; the model is tools/studio/layer-meta.mjs). Read from the page's tree in the render that shows it (BuilderBoard),
 * as hidden layers are (edit/visibility.ts): each layer's automatic name ("Frame 2", "Rectangle 1", a text's words) and
 * which layers are locked — a locked frame or layer locks everything in it, as in Figma.
 */

/** Actions › Collapse layers (⌥L): Layers closes every group and layer but the way to the selection. */
export const COLLAPSE_LAYERS_EVENT = "zen-studio:collapse-layers";

type PageMeta = {
  /** "file:line:col" → its automatic name. */
  auto: Map<string, string>;
  /** "file:line:col" of every layer the canvas skips: a locked one and everything in it. */
  locked: Set<string>;
  /** "file:line:col" of the layers locked themselves (Layers shows their padlock). */
  own: Set<string>;
  /** Frames locked themselves ("screen:home", "overlay:sheet"). */
  frames: Set<string>;
  /** Each frame's element ("screen:home" → its loc and tag), for renaming and locking it. */
  frameNodes: Map<string, { loc: string; name: string }>;
};

const byFile = new Map<string, PageMeta>();
const listeners = new Set<() => void>();
let version = 0;

const LOCAL_FILE = /^(local:[^:]+\.zen\.tsx)/;
const fileOf = (src: string) => LOCAL_FILE.exec(src)?.[1] ?? null;

/** Reads the names and locks of a page's tree (BuilderBoard, in the render that shows that text). */
export function setLayerMeta(file: string, tree: { board: PageNode | null } | null) {
  const auto = new Map<string, string>();
  for (const [loc, name] of autoLayerNames(tree?.board ?? null)) auto.set(`${file}:${loc}`, name);
  const locked = new Set<string>();
  const own = new Set<string>();
  const frames = new Set<string>();
  const frameNodes = new Map<string, { loc: string; name: string }>();
  const src = (node: PageNode) => `${file}:${node.loc}`;
  const visit = (node: PageNode, inLocked: boolean) => {
    const self = isLockedValue(node.props[LOCKED_PROP]);
    if (self) own.add(src(node));
    const lock = inLocked || self;
    if (lock) locked.add(src(node));
    for (const entry of Object.values(node.props)) {
      if (entry.kind === "element") visit(entry.node, lock);
      else if (entry.kind === "fragment") children(entry.children, lock);
    }
    children(node.children, lock);
  };
  const children = (list: PageChild[], lock: boolean) => {
    for (const child of list) {
      if (child.kind === "element") visit(child, lock);
      else if (child.kind === "map") visit(child.node, lock);
    }
  };
  for (const frame of tree?.board?.children ?? []) {
    if (frame.kind !== "element") continue;
    const literal = (name: string) => { const value = frame.props[name]; return value?.kind === "literal" ? value.value : undefined; };
    const id = String(literal("id") ?? "untitled");
    const state = literal("state");
    const self = isLockedValue(frame.props[LOCKED_PROP]);
    // A Section (F4) is a frame of the board too ("section:<id>"): renamed and locked as one.
    const frameId = frame.name === "Overlay" ? `overlay:${id}` : frame.name === "Section" ? `section:${id}` : `screen:${id}${typeof state === "string" ? `:${state}` : ""}`;
    frameNodes.set(frameId, { loc: frame.loc, name: frame.name });
    if (self) frames.add(frameId);
    if (self) own.add(src(frame));
    for (const entry of Object.values(frame.props)) if (entry.kind === "element") visit(entry.node, self);
    children(frame.children, self);
  }
  const before = byFile.get(file);
  const same = before && sameMap(before.auto, auto) && sameSet(before.locked, locked) && sameSet(before.own, own) && sameSet(before.frames, frames);
  byFile.set(file, { auto, locked, own, frames, frameNodes });
  // Called while BuilderBoard renders: listeners hear it after that render.
  if (!same) {
    version += 1;
    queueMicrotask(() => listeners.forEach((listener) => listener()));
  }
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((value) => b.has(value));
const sameMap = (a: Map<string, string>, b: Map<string, string>) => a.size === b.size && [...a].every(([key, value]) => b.get(key) === value);

/** A layer's automatic name on its page ("Frame 2"), if it has one. */
export const autoNameOf = (src: string | null | undefined): string | undefined => (src ? byFile.get(fileOf(src) ?? "")?.auto.get(src) : undefined);

/** Whether the canvas skips the layer at `src`: it, or a frame or layer it is in, is locked. */
export const isLockedSrc = (src: string | null | undefined): boolean => Boolean(src && byFile.get(fileOf(src) ?? "")?.locked.has(src));

/** Whether the layer at `src` is locked itself (Layers' padlock), not only by what holds it. */
export const isOwnLock = (src: string | null | undefined): boolean => Boolean(src && byFile.get(fileOf(src) ?? "")?.own.has(src));

/** A frame's element on the page `file` ("screen:home" → its loc and tag), if the page shows it. */
export const frameNodeOf = (file: string | null | undefined, frameId: string | null | undefined) => (file && frameId ? byFile.get(file)?.frameNodes.get(frameId) : undefined);

/** Whether a frame ("screen:home") is locked on the page `file`. */
export const isLockedFrame = (file: string | null | undefined, frameId: string | null | undefined): boolean => Boolean(file && frameId && byFile.get(file)?.frames.has(frameId));

/**
 * The name a layer shows everywhere (Layers, the canvas tag, the Inspector header, Select layer): the one the person
 * gave it (data-name), else its automatic name on a page you made, else its component's (select/layerNames.ts).
 */
export function displayName(name: string, props: Record<string, unknown> | null | undefined, src?: string | null): string {
  const given = givenNameOf({ props: { [NAME_PROP]: props?.[NAME_PROP] } });
  if (given) return given;
  // An instance of a page's component reads as its component (Figma), never as its main root's frame number.
  if (typeof props?.["data-zen-instance-name"] === "string" || typeof props?.["data-zen-main-name"] === "string") return layerName(name, props);
  return autoNameOf(src) ?? layerName(name, props);
}

/** Re-renders a component when names or locks change (Layers rows, the canvas tag). */
export function useLayerMeta(): number {
  return useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => version, () => version);
}

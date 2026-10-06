import { canvasApi } from "../canvas/viewport";
import { findBySrc, isHostFiber, type Fiber, type FiberHit } from "../select/picker";
import type { StudioSelection } from "../types";
import { slotContainer, slotHostRoot, type ContentSlot } from "./registry";

/*
 * Canvas lookups the slot UI shares (actions, SlotLayer, the Layers slot rows): the selected instance, its component
 * root (overlays included: their panel renders in a portal) and a slot's container. Nothing here throws.
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;

/** The rendered instance of a node selection (its `instance` among the JSX element's renders), or null. */
export function selectedHit(selection: NodeSelection, world: Element | null = canvasApi.getWorldElement()): FiberHit | null {
  if (!world) return null;
  const hits = findBySrc(world, selection.src);
  return hits[selection.instance] ?? hits[0] ?? null;
}

/** The frame element (`[data-studio-frame]`) with this id, or null. */
export function frameElement(frameId: string | null, world: Element | null = canvasApi.getWorldElement()): Element | null {
  if (!world || !frameId) return null;
  return Array.from(world.querySelectorAll("[data-studio-frame]")).find((frame) => frame.getAttribute("data-studio-frame") === frameId) ?? null;
}

/**
 * The first DOM nodes under a fiber, crossing portals (picker.hostsOf stops at them): an overlay's first host is its
 * `<template data-zen-overlay-anchor>`, its panel renders in the portal (registry slotHostRoot).
 */
export function hostsWithPortals(fiber: Fiber | null | undefined): Element[] {
  const out: Element[] = [];
  if (!fiber) return out;
  const visit = (node: Fiber | null, depth: number) => {
    for (let current = node; current && out.length < 400; current = current.sibling) {
      if (isHostFiber(current)) {
        if (current.stateNode instanceof Element && current.stateNode.isConnected) out.push(current.stateNode);
        continue;
      }
      if (depth > 400) continue;
      // A portal (unlike picker.hostsOf) is entered: its children are the host nodes in its container.
      visit(current.child, depth + 1);
    }
  };
  try {
    if (isHostFiber(fiber)) return fiber.stateNode instanceof Element && fiber.stateNode.isConnected ? [fiber.stateNode] : [];
    visit(fiber.child, 0);
  } catch {
    // React internals changed mid-walk: what was found.
  }
  return out;
}

/** The component root of a rendered slot host (registry `root`), portals included; null when it is not rendered. */
export function hostRootOf(hit: FiberHit | null): Element | null {
  if (!hit) return null;
  try {
    return slotHostRoot(hit.name, hit.fiber ? hostsWithPortals(hit.fiber) : hit.hosts);
  } catch {
    return null;
  }
}

/** The slot's container in a rendered root, or null when it is not mounted (an empty slot that does not mount, a closed panel). */
export function containerOf(root: Element | null, slot: ContentSlot): Element | null {
  if (!root) return null;
  try {
    return slotContainer(root, slot);
  } catch {
    return null;
  }
}

/** Hidden or inert inside the component (a collapsed Accordion panel, a TabPanel that is not selected). */
export function isConcealed(element: Element, root: Element): boolean {
  for (let current: Element | null = element; current && current !== root.parentElement; current = current.parentElement) {
    if (current.hasAttribute("hidden") || current.hasAttribute("inert")) return true;
  }
  return false;
}

/** The level of the last heading rendered in the slot (h2 → 2), for the palette's Heading level; undefined when none. */
export function lastHeadingLevel(hit: FiberHit | null, slot: ContentSlot): number | undefined {
  const container = containerOf(hostRootOf(hit), slot);
  const headings = container ? container.querySelectorAll("h1, h2, h3, h4, h5, h6") : [];
  const last = headings[headings.length - 1];
  return last ? Number(last.tagName.slice(1)) : undefined;
}

/**
 * Whether the canvas shows a Shift multi-selection: SelectionLayer's extra outlines (it keeps the extras to itself;
 * integration notes: it should publish their count).
 */
export function hasExtraSelection(world: Element | null = canvasApi.getWorldElement()): boolean {
  return Boolean(world?.closest(".studio-viewport")?.querySelector('.studio-selection__outline[data-kind="extra"]'));
}

/** Whether the slot shows the docs' empty-slot marker (a playground's PlaygroundSlot renders `.platform-slot`). */
export function slotShowsPlaceholder(selection: NodeSelection, slot: ContentSlot): boolean {
  const container = containerOf(hostRootOf(selectedHit(selection)), slot);
  return Boolean(container && (container.matches(".platform-slot") || container.querySelector(".platform-slot")));
}

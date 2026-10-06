import { currentFiber, srcOf, type Fiber, type FiberHit } from "../select/picker";
import { isComponentFiber, partHit, type PartHit } from "../select/parts";
import type { ObjectShape, SourceElement } from "../types";
import { dataSlotsOf, slotGroups, type DataSlot } from "./dataSlots";

/*
 * Data-slot items on the canvas and in the source (dataSlots.ts). On the canvas an item is the part whose props hold
 * the item object itself: TopNavigation passes each `trailing` object to a TopNavigationActionButton as `action`, so the
 * object identity ties a rendered button to its index. In the source it is the n-th object of the array literal
 * (SourceAttr.shape). The two line up only when the attribute is a plain literal: anything else is read-only with why.
 */

const GUARD = 4000;

/** The items as the owner renders them now: the array, the one object, or none (a `list` slot takes either). */
export function renderedItems(slot: DataSlot, props: Record<string, unknown> | null | undefined): unknown[] {
  const value = props?.[slot.prop];
  if (Array.isArray(value)) return slot.form === "object" ? [] : value;
  if (slot.form === "array") return [];
  return value && typeof value === "object" ? [value] : [];
}

/** Whether the slot's items group as the owner is drawn now (TopNavigation: not on the compact types' Flat actions). */
export function slotGroupsAt(owner: FiberHit | null | undefined, slot: DataSlot): boolean {
  return slotGroups(slot, owner?.fiber ? currentFiber(owner.fiber).memoizedProps : null);
}

/** Whether a fiber (or its other copy) passes `item` itself in one of its props. */
function holds(fiber: Fiber, item: unknown): boolean {
  for (const node of [fiber, fiber.alternate]) {
    const props = node?.memoizedProps;
    if (!props) continue;
    for (const key in props) if (key !== "children" && props[key] === item) return true;
  }
  return false;
}

/** The owner's items per slot, from both copies of its fiber (a walk can meet either). */
function ownerItems(owner: FiberHit, slot: DataSlot): unknown[][] {
  const fiber = owner.fiber;
  if (!fiber) return [];
  const live = currentFiber(fiber);
  return [live, live.alternate].filter(Boolean).map((node) => renderedItems(slot, node?.memoizedProps)).filter((items) => items.length);
}

const indexIn = (lists: unknown[][], fiber: Fiber) => {
  for (const items of lists) {
    const index = items.findIndex((item) => item !== null && typeof item === "object" && holds(fiber, item));
    if (index >= 0) return index;
  }
  return -1;
};

export type DataItemHit = { slot: DataSlot; index: number; part: PartHit };

/**
 * The data item a part belongs to (the action button, or the icon inside it): its slot, its index and the item's own
 * root part (the outermost component that receives the item). Null for any other part.
 */
export function dataItemOfPart(part: PartHit | null): DataItemHit | null {
  if (!part?.owner.fiber) return null;
  const owner = part.owner;
  const slots = dataSlotsOf(owner.name);
  if (!slots.length) return null;
  const lists = slots.map((slot) => ownerItems(owner, slot));
  const ownerFiber = owner.fiber!;
  let found: { slot: DataSlot; index: number; fiber: Fiber } | null = null;
  try {
    for (let fiber: Fiber | null = currentFiber(part.fiber), guard = 0; fiber && guard < GUARD; fiber = fiber.return, guard++) {
      if (fiber === ownerFiber || fiber === ownerFiber.alternate) break;
      const src = srcOf(fiber);
      if (src && src !== owner.src) break;
      if (!isComponentFiber(fiber)) continue;
      slots.forEach((slot, k) => {
        const index = indexIn(lists[k], fiber!);
        if (index >= 0) found = { slot, index, fiber: fiber! };
      });
    }
  } catch {
    return null;
  }
  if (!found) return null;
  const { slot, index, fiber } = found as { slot: DataSlot; index: number; fiber: Fiber };
  const root = partHit(owner, fiber);
  return root ? { slot, index, part: root } : null;
}

/** The item's own name as rendered (its label / title / name), else "{Action} {n}". */
export function renderedItemTitle(hit: DataItemHit): string {
  for (const value of Object.values(hit.part.props ?? {})) {
    if (!value || typeof value !== "object") continue;
    for (const key of ["label", "title", "name"]) {
      const text = (value as Record<string, unknown>)[key];
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }
  return `${hit.slot.itemName} ${hit.index + 1}`;
}

/** The data item whose own root part is `part` (null for any other part, or a part inside an item). */
export function dataItemRootOf(part: PartHit | null): DataItemHit | null {
  const hit = dataItemOfPart(part);
  if (!hit || !part) return null;
  return hit.part.element === part.element && (hit.part.fiber === part.fiber || hit.part.fiber === part.fiber.alternate) ? hit : null;
}

/** The rendered root part of each item of the slot (null where it does not render, e.g. past the bar's three actions). */
export function itemParts(owner: FiberHit | null, slot: DataSlot): Array<PartHit | null> {
  if (!owner?.fiber) return [];
  const lists = ownerItems(owner, slot);
  const count = lists[0]?.length ?? 0;
  const out: Array<PartHit | null> = Array.from({ length: count }, () => null);
  if (!count) return out;
  const visit = (node: Fiber | null, depth: number) => {
    for (let current = node; current && depth < 200; current = current.sibling) {
      const src = srcOf(current);
      if (src && src !== owner.src) continue;
      if (isComponentFiber(current)) {
        const index = indexIn(lists, current);
        if (index >= 0) {
          if (!out[index]) out[index] = partHit(owner, current);
          continue;
        }
      }
      visit(current.child, depth + 1);
    }
  };
  try {
    visit(currentFiber(owner.fiber).child, 0);
  } catch {
    // React internals changed: what was found so far.
  }
  return out;
}

/** A fingerprint of the items as rendered (their plain fields): it changes once the canvas shows an edit. */
export function renderedSignature(owner: FiberHit | null, slot: DataSlot): string {
  if (!owner?.fiber) return "";
  const items = renderedItems(slot, currentFiber(owner.fiber).memoizedProps);
  return JSON.stringify(items.map((item) => (item && typeof item === "object"
    ? Object.entries(item as Record<string, unknown>).filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
    : String(item))));
}

/* ───────────── The source ───────────── */

export type SourceItems =
  /** The prop is not written: the slot is empty (an add writes it). */
  | { state: "absent" }
  /** null / undefined / false: empty too. */
  | { state: "empty"; code: string }
  /** A literal the Studio edits: one ObjectShape per item, in order. */
  | { state: "items"; items: ObjectShape[] }
  /** Anything else (a variable, a condition, a spread or a non-object item): read-only, with the code it comes from. */
  | { state: "computed"; code: string };

const NULLISH = /^(null|undefined|false)$/;

/** The data slot's items as the source writes them. */
export function sourceItems(element: SourceElement, slot: DataSlot): SourceItems {
  const attr = element.attributes.filter((candidate) => candidate.kind !== "spread" && candidate.name === slot.prop).at(-1);
  if (!attr) return { state: "absent" };
  const code = (attr.value ?? "").trim();
  if (attr.kind !== "expression") return { state: "computed", code: attr.raw };
  if (!code || NULLISH.test(code)) return { state: "empty", code };
  const shape = attr.shape;
  const oneObject = shape?.type === "object" && !shape.fields.some((field) => field.kind === "spread");
  if (slot.form === "object" || (slot.form === "list" && shape?.type === "object")) return oneObject ? { state: "items", items: [shape] } : { state: "computed", code };
  if (shape?.type !== "array") return { state: "computed", code };
  const items = shape.items.filter((item): item is ObjectShape => item.type === "object");
  return items.length === shape.items.length ? { state: "items", items } : { state: "computed", code };
}

/** "trailing={actions}" for a read-only caption (one line, at most 40 characters of code). */
export function computedCaption(slot: DataSlot, code: string): string {
  const flat = code.replace(/\s+/g, " ").trim();
  return `Its items come from {${flat.length > 40 ? `${flat.slice(0, 39)}…` : flat}} — edit them in the code`;
}

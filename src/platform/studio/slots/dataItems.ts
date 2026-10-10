import { currentFiber, fiberOf, srcOf, type Fiber, type FiberHit } from "../select/picker";
import { isComponentFiber, partHit, type PartHit } from "../select/parts";
import type { ObjectShape, SourceElement } from "../types";
import { dataSlotsOf, slotGroups, type DataSlot } from "./dataSlots";

/*
 * Data-slot items on the canvas and in the source (dataSlots.ts). On the canvas an item is the part whose props hold
 * the item object itself: TopNavigation passes each `trailing` object to a TopNavigationActionButton as `action`, so the
 * object identity ties a rendered button to its index. An owner that passes the fields one by one (Tabs, Segmented,
 * Stepper, …) is read by the React key its .map gives the item (2026-10-10). In the source it is the n-th object of the array literal
 * (SourceAttr.shape). The two line up only when the attribute is a plain literal: anything else is read-only with why.
 */

const GUARD = 4000;

/** The items as the owner renders them now: the array, the one object, or none (a `list` slot takes either). */
export function renderedItems(slot: DataSlot, props: Record<string, unknown> | null | undefined): unknown[] {
  const value = props?.[slot.prop];
  // Menu-like lists: the items in order, a group's own included (separators and group titles are not items).
  if (slot.grouped) {
    const { typeKey, group, separator, list } = slot.grouped;
    const kind = (entry: unknown) => (entry && typeof entry === "object" ? (entry as Record<string, unknown>)[typeKey] : undefined);
    return Array.isArray(value) ? value.flatMap((entry) => (kind(entry) === separator ? [] : kind(entry) === group
      ? (Array.isArray((entry as Record<string, unknown>)[list]) ? ((entry as Record<string, unknown[]>)[list]).filter((inner) => kind(inner) !== separator) : [])
      : [entry])) : [];
  }
  // One level down (Sidebar `sections[n].items`): every group's items, in order.
  if (slot.nested) return Array.isArray(value) ? value.flatMap((group) => (group && typeof group === "object" && Array.isArray((group as Record<string, unknown>)[slot.nested!]) ? (group as Record<string, unknown[]>)[slot.nested!] : [])) : [];
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

/** The React key the owner's `.map` gives an item: the slot's rule, else its `id`. */
function itemKey(slot: DataSlot, item: unknown, index: number): string | null {
  if (!item || typeof item !== "object") return null;
  if (slot.itemKey) return slot.itemKey(item as Record<string, unknown>, index);
  const id = (item as { id?: unknown }).id;
  return typeof id === "string" || typeof id === "number" ? String(id) : null;
}

/**
 * The item a fiber stands for by its React key, for owners that pass an item's fields one by one (Tabs, Segmented,
 * Stepper's <li>, DescriptionList, Bottom Navigation, Bottom Sheet): no prop holds the object itself there.
 */
const keyIndexIn = (slot: DataSlot, lists: unknown[][], fiber: Fiber) => {
  if (fiber.key == null) return -1;
  for (const items of lists) {
    const index = items.findIndex((item, at) => itemKey(slot, item, at) === fiber.key);
    if (index >= 0) return index;
  }
  return -1;
};

export type DataItemHit = { slot: DataSlot; index: number; part: PartHit };

/**
 * The data item a part belongs to (the action button, or the icon inside it): its slot, its index and the item's own
 * root part (the outermost component that receives the item; else the outermost node the owner's .map keys by the item,
 * a tab or a step). Null for any other part.
 */
export function dataItemOfPart(part: PartHit | null): DataItemHit | null {
  if (!part?.owner.fiber) return null;
  const owner = part.owner;
  const slots = dataSlotsOf(owner.name);
  if (!slots.length) return null;
  const lists = slots.map((slot) => ownerItems(owner, slot));
  const ownerFiber = owner.fiber!;
  type Found = { slot: DataSlot; index: number; fiber: Fiber };
  let found: Found | null = null;
  let keyed: Found | null = null;
  try {
    for (let fiber: Fiber | null = currentFiber(part.fiber), guard = 0; fiber && guard < GUARD; fiber = fiber.return, guard++) {
      if (fiber === ownerFiber || fiber === ownerFiber.alternate) break;
      const src = srcOf(fiber);
      if (src && src !== owner.src) break;
      const component = isComponentFiber(fiber);
      slots.forEach((slot, k) => {
        const index = component ? indexIn(lists[k], fiber!) : -1;
        if (index >= 0) found = { slot, index, fiber: fiber! };
        const byKey = keyIndexIn(slot, lists[k], fiber!);
        if (byKey >= 0) keyed = { slot, index: byKey, fiber: fiber! };
      });
    }
  } catch {
    return null;
  }
  // The object itself wins (Breadcrumbs' crumb, not the <li> keyed around it); the key only where no prop holds it.
  const hit = (found ?? keyed) as Found | null;
  if (!hit) return null;
  const { slot, index, fiber } = hit;
  const root = partHit(owner, fiber);
  return root ? { slot, index, part: root } : null;
}

/** The item's own name as rendered (its label / title / name / term), else "{Action} {n}". */
export function renderedItemTitle(hit: DataItemHit): string {
  // The owner's item at that place (a tab passes its fields one by one, so its own props hold no object).
  const owned = hit.part.owner.fiber ? renderedItems(hit.slot, currentFiber(hit.part.owner.fiber).memoizedProps)[hit.index] : undefined;
  for (const value of [owned, ...Object.values(hit.part.props ?? {})]) {
    if (!value || typeof value !== "object") continue;
    for (const key of ["label", "title", "name", "term"]) {
      const text = (value as Record<string, unknown>)[key];
      if (typeof text === "string" && text.trim()) return text.trim();
    }
  }
  return `${hit.slot.itemName} ${hit.index + 1}`;
}

export type DataGroupHit = { slot: DataSlot; group: number; role: "group" | "title" | "list"; part: PartHit };

/**
 * A nested slot's group as drawn (DataSlot `groupParts`): `part` is a group's element (a Sidebar section), its title or its
 * rows' container, for the group-th object of the slot's prop. Null for any other part.
 */
export function dataGroupOfPart(part: PartHit | null): DataGroupHit | null {
  if (!part?.owner.fiber) return null;
  const owner = part.owner;
  const props = currentFiber(owner.fiber!).memoizedProps ?? {};
  for (const slot of dataSlotsOf(owner.name)) {
    if (!slot.groupParts) continue;
    const count = Array.isArray(props[slot.prop]) ? (props[slot.prop] as unknown[]).length : 0;
    if (!count) continue;
    const groups = owner.hosts.flatMap((host) => [...host.querySelectorAll(slot.groupParts!.group)]).slice(0, count);
    for (const [group, element] of groups.entries()) {
      if (part.element === element) return { slot, group, role: "group", part };
      if (!element.contains(part.element)) continue;
      const title = element.querySelector(`:scope > ${slot.groupParts.title}`);
      if (title === part.element) return { slot, group, role: "title", part };
      const list = element.querySelector(`:scope > ${slot.groupParts.list}`);
      if (list === part.element) return { slot, group, role: "list", part };
    }
  }
  return null;
}

/**
 * The group (a Sidebar section) `element` sits in, as a part of `owner`: what a double-click on the selected Sidebar
 * selects first, one level above its rows and title (Figma's frame in the slot; user, 2026-10-10: "khó chọn section. chỉ
 * chọn được item bên trong"). Null outside the groups its prop draws.
 */
export function groupPartAt(owner: FiberHit, element: Element | null): PartHit | null {
  if (!owner.fiber || !element) return null;
  const props = currentFiber(owner.fiber).memoizedProps ?? {};
  for (const slot of dataSlotsOf(owner.name)) {
    if (!slot.groupParts) continue;
    const count = Array.isArray(props[slot.prop]) ? (props[slot.prop] as unknown[]).length : 0;
    const groups = owner.hosts.flatMap((host) => [...host.querySelectorAll(slot.groupParts!.group)]).slice(0, count);
    const group = groups.find((candidate) => candidate === element || candidate.contains(element));
    const fiber = group ? fiberOf(group) : null;
    if (fiber) return partHit(owner, fiber);
  }
  return null;
}

const holdsPoint = (element: Element, x: number, y: number) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
};

/** The groups `owner` draws from a nested slot's prop (its sections), with their slot. */
function drawnGroups(owner: FiberHit): Array<{ slot: DataSlot; elements: Element[] }> {
  if (!owner.fiber) return [];
  const props = currentFiber(owner.fiber).memoizedProps ?? {};
  return dataSlotsOf(owner.name).filter((slot) => slot.groupParts).map((slot) => {
    const count = Array.isArray(props[slot.prop]) ? (props[slot.prop] as unknown[]).length : 0;
    return { slot, elements: owner.hosts.flatMap((host) => [...host.querySelectorAll(slot.groupParts!.group)]).slice(0, count) };
  });
}

/** The component that draws `element` as its first DOM node (the outermost), as a part of `owner`; else the element's own. */
function partOfElement(owner: FiberHit, element: Element): PartHit | null {
  let found: Fiber | null = fiberOf(element);
  for (let fiber = found?.return ?? null; fiber && isComponentFiber(fiber); fiber = fiber.return) {
    if (partHit(owner, fiber)?.element !== element) break;
    found = fiber;
  }
  return found ? partHit(owner, found) : null;
}

/**
 * By geometry, not hit-testing (the selection's capture layer and `display: contents` wrappers hide what is under the
 * pointer): the section of `owner` under (x, y), and inside it the row or the Section-Title there. What a double-click
 * goes through, Sidebar → section → row (user, 2026-10-10: "khó chọn section").
 */
export function sectionPartAtPoint(owner: FiberHit, x: number, y: number): PartHit | null {
  for (const { elements } of drawnGroups(owner)) {
    const group = elements.find((element) => holdsPoint(element, x, y));
    if (group) { const fiber = fiberOf(group); return fiber ? partHit(owner, fiber) : null; }
  }
  return null;
}

export function rowPartAtPoint(owner: FiberHit, x: number, y: number): PartHit | null {
  for (const { slot, elements } of drawnGroups(owner)) {
    const group = elements.find((element) => holdsPoint(element, x, y));
    if (!group) continue;
    const title = group.querySelector(`:scope > ${slot.groupParts!.title}`);
    if (title && holdsPoint(title, x, y)) return partOfElement(owner, title);
    const row = itemParts(owner, slot).find((part) => part && group.contains(part.element) && holdsPoint(part.element, x, y));
    if (row) return row;
  }
  return null;
}

/**
 * The Section-Title a part sits in (a ⌘-click on a Sidebar section's label): the component that draws the title, as
 * Figma selects the instance, not the text inside it. Null outside a title, or when `part` is the title already.
 */
export function groupTitlePartOf(part: PartHit | null): PartHit | null {
  if (!part?.owner.fiber) return null;
  for (const slot of dataSlotsOf(part.owner.name)) {
    if (!slot.groupParts) continue;
    const title = part.element.closest(slot.groupParts.title);
    if (!title || !part.owner.hosts.some((host) => host.contains(title))) continue;
    // The outermost component whose first DOM node is the title element.
    let found: Fiber | null = null;
    for (let fiber = fiberOf(title)?.return ?? null; fiber && isComponentFiber(fiber); fiber = fiber.return) {
      const hit = partHit(part.owner, fiber);
      if (hit?.element !== title) break;
      found = fiber;
    }
    const hit = found ? partHit(part.owner, found) : null;
    if (!hit || (hit.element === part.element && hit.name === part.name)) return null;
    return dataGroupOfPart(hit)?.role === "title" ? hit : null;
  }
  return null;
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
  // First the components that receive the item object; none: the nodes the owner's .map keys by the item (dataItemOfPart).
  const visit = (node: Fiber | null, depth: number, byKey: boolean) => {
    for (let current = node; current && depth < 200; current = current.sibling) {
      const src = srcOf(current);
      if (src && src !== owner.src) continue;
      const index = byKey ? keyIndexIn(slot, lists, current) : isComponentFiber(current) ? indexIn(lists, current) : -1;
      if (index >= 0) {
        if (!out[index]) out[index] = partHit(owner, current);
        continue;
      }
      visit(current.child, depth + 1, byKey);
    }
  };
  try {
    const first = currentFiber(owner.fiber).child;
    visit(first, 0, false);
    if (out.every((part) => !part)) visit(first, 0, true);
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
  /**
   * A literal the Studio edits: one ObjectShape per item, in order. A nested slot (DataSlot `nested`) adds `at`: each
   * item's group (the index in `prop`) and place in that group's list.
   */
  | { state: "items"; items: ObjectShape[]; at?: Array<{ group: number; index: number }> }
  /** Anything else (a variable, a condition, a spread or a non-object item): read-only, with the code it comes from. */
  | { state: "computed"; code: string; via?: string };

const NULLISH = /^(null|undefined|false)$/;

/** The data slot's items as the source writes them. */
export function sourceItems(element: SourceElement, slot: DataSlot): SourceItems {
  const attr = element.attributes.filter((candidate) => candidate.kind !== "spread" && candidate.name === slot.prop).at(-1);
  if (!attr) return { state: "absent" };
  const code = (attr.value ?? "").trim();
  if (attr.kind !== "expression") return { state: "computed", code: attr.raw };
  if (!code || NULLISH.test(code)) return { state: "empty", code };
  // A list a same-file const holds (`options={views}`, its shape read there: shapeVia): its fields edit in the const, but
  // the item ops add and remove items of lists written in place only.
  if (attr.shapeVia) return { state: "computed", code, via: attr.shapeVia.name };
  const shape = attr.shape;
  // Menu-like lists are edited as a whole in Slots (SectionedSlotBlock) and field by field in the Menu's own Properties.
  if (slot.grouped) return { state: "computed", code };
  if (slot.nested) {
    // Each group's list written in place (the dev server reads it one level down: ShapeField `shape`).
    if (shape?.type !== "array" || shape.items.some((group) => group.type !== "object")) return { state: "computed", code };
    const items: ObjectShape[] = [];
    const at: Array<{ group: number; index: number }> = [];
    for (const [group, holder] of shape.items.entries()) {
      const field = (holder as ObjectShape).fields.find((candidate) => candidate.key === slot.nested);
      if (!field) continue;
      const list = field.kind === "expression" ? field.shape : undefined;
      if (list?.type !== "array" || list.items.some((item) => item.type !== "object")) return { state: "computed", code: field.kind === "expression" || field.kind === "spread" ? field.value : code };
      list.items.forEach((item, index) => { items.push(item as ObjectShape); at.push({ group, index }); });
    }
    return { state: "items", items, at };
  }
  const oneObject = shape?.type === "object" && !shape.fields.some((field) => field.kind === "spread");
  if (slot.form === "object" || (slot.form === "list" && shape?.type === "object")) return oneObject ? { state: "items", items: [shape] } : { state: "computed", code };
  if (shape?.type !== "array") return { state: "computed", code };
  const items = shape.items.filter((item): item is ObjectShape => item.type === "object");
  return items.length === shape.items.length ? { state: "items", items } : { state: "computed", code };
}

/** "trailing={actions}" for a read-only caption (one line, at most 40 characters of code). */
export function computedCaption(slot: DataSlot, code: string, via?: string): string {
  // A same-file const's list: its fields edit in Properties, adding or removing an item is the code's.
  if (via) return `Its items are written in const ${via}: edit their fields below; add or remove them in the code`;
  const flat = code.replace(/\s+/g, " ").trim();
  return `Its items come from {${flat.length > 40 ? `${flat.slice(0, 39)}…` : flat}} — edit them in the code`;
}

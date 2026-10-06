import { studioStore } from "../store";
import type { StudioPartRef, StudioSelection } from "../types";
import { currentFiber, fiberOf, frameOf, hostsOf, instanceOf, isHostFiber, isPortalFiber, isTransparentName, nameOf, panelOf, srcOf, type Fiber, type FiberHit } from "./picker";

/*
 * Deep select (read-only): the internal parts of an annotated JSX element, like Figma's ⌘-click into an instance. A
 * part is a component the element renders inside itself (SidebarItem, InputLabel, Badge in a Table cell…) or one of
 * its DOM nodes. It is addressed by a DOM path from the element's own DOM nodes, so it survives re-renders; the
 * selection keeps the element as `src` (the owner) and the part as `selection.part`.
 */

// FunctionComponent, ClassComponent, ForwardRef, MemoComponent, SimpleMemoComponent (react-reconciler ReactWorkTags).
const COMPONENT_TAGS = new Set([0, 1, 11, 14, 15]);

/** A function / class / forwardRef / memo fiber. */
export const isComponentFiber = (fiber: Fiber) => COMPONENT_TAGS.has(fiber.tag);

/** A part: a FiberHit (src = the owner's) plus where it sits in the owner. */
export type PartHit = FiberHit & { owner: FiberHit; path: number[]; element: Element; fiber: Fiber };

/** A component name worth showing as a part ("Anonymous" wrappers, context objects and docs scaffolding are skipped). */
function partName(fiber: Fiber): string | null {
  const name = nameOf(fiber);
  return name && name !== "Anonymous" && name !== "Context" && !isTransparentName(name) ? name : null;
}

const isOwnerFiber = (owner: FiberHit, fiber: Fiber) => Boolean(owner.fiber && (fiber === owner.fiber || fiber === owner.fiber.alternate));

/** [index among the owner's DOM nodes, child-element indices…] of `element`, or null when it is not inside the owner. */
export function pathOf(owner: FiberHit, element: Element): number[] | null {
  for (let index = 0; index < owner.hosts.length; index++) {
    const host = owner.hosts[index];
    if (!host.contains(element)) continue;
    const path: number[] = [];
    for (let node: Element | null = element; node !== host; node = node.parentElement) {
      const parent: Element | null = node?.parentElement ?? null;
      if (!node || !parent) return null;
      path.unshift(Array.prototype.indexOf.call(parent.children, node));
    }
    return [index, ...path];
  }
  return null;
}

/** The DOM node a part path leads to inside the owner, or null. */
export function elementAt(owner: FiberHit, path: number[]): Element | null {
  let node: Element | null = owner.hosts[path[0] ?? -1] ?? null;
  for (let step = 1; node && step < path.length; step++) node = node.children[path[step]] ?? null;
  return node;
}

/** A part hit for a fiber inside `owner` (null when it renders no DOM inside the owner). */
export function partHit(owner: FiberHit, fiber: Fiber): PartHit | null {
  try {
    const live = currentFiber(fiber);
    const host = isHostFiber(live);
    const hosts = host ? (live.stateNode instanceof Element && live.stateNode.isConnected ? [live.stateNode] : []) : hostsOf(live);
    const element = hosts[0];
    if (!element) return null;
    const path = pathOf(owner, element);
    if (!path) return null;
    return { src: owner.src, name: nameOf(live), hosts, isComponent: !host, props: live.memoizedProps ?? {}, fiber: live, owner, path, element };
  } catch {
    return null;
  }
}

/**
 * The parts under the cursor, innermost first: from the DOM node up to the owner, every DOM node and every named
 * component (memo(forwardRef(X)) counted once). Annotated elements inside the owner end the walk (they are layers).
 */
export function partChain(owner: FiberHit, element: Element | null): PartHit[] {
  const out: PartHit[] = [];
  try {
    let node: Node | null = element;
    let fiber: Fiber | null = null;
    while (node && !(fiber = fiberOf(node))) node = node.parentNode;
    if (!fiber) return out;
    let last: Fiber | null = null;
    for (let current: Fiber | null = currentFiber(fiber), guard = 0; current && guard < 4000; current = current.return, guard++) {
      if (isOwnerFiber(owner, current)) break;
      const src = srcOf(current);
      if (src && src !== owner.src) break;
      const host = isHostFiber(current);
      if (!host && !(isComponentFiber(current) && partName(current))) continue;
      if (!host && last && !isHostFiber(last) && last.return === current && nameOf(last) === nameOf(current)) continue;
      last = current;
      // Above the owner (an alternate tree can hide it from the identity check) nothing is inside it: partHit is null.
      const hit = partHit(owner, current);
      if (hit) out.push(hit);
    }
  } catch {
    // React internals changed: what was found so far.
  }
  return out;
}

/** A part that starts at one of the owner's own top-level DOM nodes wraps the whole element (InputField › FieldShell). */
const wrapsOwner = (part: PartHit) => part.path.length === 1;

/** The part a deep click lands on: the nearest internal component that is not a wrapper of the whole element, else the DOM node. */
function nearestPart(chain: PartHit[]): PartHit | null {
  return chain.find((part) => part.isComponent && !wrapsOwner(part)) ?? chain[0] ?? null;
}

/** Cmd/Ctrl-click: the nearest internal component under the cursor (SidebarItem, InputLabel, a Badge in a cell), else the DOM node. */
export function deepPartAt(owner: FiberHit, element: Element | null): PartHit | null {
  return nearestPart(partChain(owner, element));
}

const samePart = (a: PartHit, b: PartHit) => a.fiber === b.fiber || a.fiber === b.fiber.alternate || (a.element === b.element && a.name === b.name);

/** Double-click on a selected part: one level deeper towards the cursor (null when it is the deepest already). */
export function drillPart(owner: FiberHit, element: Element | null, from: PartHit): PartHit | null {
  const chain = partChain(owner, element);
  const index = chain.findIndex((part) => samePart(part, from));
  if (index < 0) return nearestPart(chain);
  return index > 0 ? chain[index - 1] : null;
}

/** Whether `part` is one of the parts under the cursor (a click inside the selected part keeps it). */
export function chainHas(owner: FiberHit, element: Element | null, part: PartHit): boolean {
  return partChain(owner, element).some((candidate) => samePart(candidate, part));
}

/** The part named `name` whose first DOM node is `element`, or null. */
export function partForElement(owner: FiberHit, element: Element, name: string): PartHit | null {
  if (!owner.hosts.some((host) => host.contains(element))) return null;
  return partChain(owner, element).find((part) => part.name === name && part.element === element) ?? null;
}

/** A stored part found again inside its owner. */
export function resolvePart(owner: FiberHit, ref: StudioPartRef): PartHit | null {
  const element = elementAt(owner, ref.path);
  return element ? partForElement(owner, element, ref.name) : null;
}

/**
 * The parts directly inside `parent` (the owner's fiber, or a part's): DOM nodes and named components, in document
 * order. Annotated elements are left out (they are layers of their own), so are portals and parts that render nothing.
 */
export function partChildren(owner: FiberHit, parent: Fiber): PartHit[] {
  const out: PartHit[] = [];
  let start = currentFiber(parent);
  // The owner's own inner fibers (memo(forwardRef(X)), a component that passes everything to its inner self).
  if (isOwnerFiber(owner, parent) || start === owner.fiber) {
    while (start.child && !start.child.sibling && isComponentFiber(start.child) && nameOf(start.child) === owner.name) start = start.child;
  }
  const visit = (node: Fiber | null, depth: number) => {
    for (let current = node; current && out.length < 400; current = current.sibling) {
      if (isPortalFiber(current) || depth > 200) continue;
      const src = srcOf(current);
      if (src && src !== owner.src) continue;
      if (isHostFiber(current) || (isComponentFiber(current) && partName(current))) {
        let fiber = current;
        while (!isHostFiber(fiber) && fiber.child && !fiber.child.sibling && isComponentFiber(fiber.child) && nameOf(fiber.child) === nameOf(fiber)) fiber = fiber.child;
        const hit = partHit(owner, fiber);
        if (hit) out.push(hit);
        continue;
      }
      visit(current.child, depth + 1);
    }
  };
  try {
    visit(start.child, 0);
  } catch {
    // React internals changed: what was found so far.
  }
  return out;
}

/** The first DOM node's first meaningful class, as a hint beside a DOM part's tag ("div" · zen-sidebar__header). */
export function classHint(element: Element): string | null {
  const names = Array.from(element.classList).filter((name) => !name.startsWith("zen-type-"));
  return names.find((name) => name.startsWith("zen-")) ?? names[0] ?? null;
}

/** Selects a part (the selection keeps its owner as `src`). */
export function selectPart(part: PartHit, world: Element | null) {
  const owner = part.owner;
  const host = owner.hosts[0];
  studioStore.setState({
    selection: {
      kind: "node",
      src: owner.src,
      name: owner.name,
      frameId: frameOf(host),
      panelId: panelOf(host),
      instance: world ? instanceOf(world, owner) : 0,
      part: { path: part.path, name: part.name },
    },
  });
}

/** The selection without its part: the owner. */
export function withoutPart(selection: StudioSelection): StudioSelection {
  if (selection.kind !== "node" || !selection.part) return selection;
  const { part: _part, ...owner } = selection;
  return owner;
}

/* ───────────── The resolved part, shared by the overlay (publisher), the inspector and the Layers panel ───────────── */

let selectedPart: PartHit | null = null;
const partListeners = new Set<() => void>();

export const selectedPartStore = {
  get: () => selectedPart,
  set(part: PartHit | null) {
    if (part === selectedPart) return;
    selectedPart = part;
    partListeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    partListeners.add(listener);
    return () => { partListeners.delete(listener); };
  },
};

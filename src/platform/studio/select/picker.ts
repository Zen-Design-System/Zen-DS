import { studioStore } from "../store";

/*
 * Picking on the canvas through React fibers (spec §5). Every JSX element of the platform source carries
 * data-zen-src="<file>:<line>:<col>" (dev-server plugin); a DOM node leads to its fiber, the fiber up to the nearest
 * annotated element. React internals may change between versions: every function here returns null / [] instead of
 * throwing.
 */

const SRC = "data-zen-src";
// React work tags (react-reconciler/src/ReactWorkTags).
const HOST_ROOT = 3;
const HOST_PORTAL = 4;
const HOST_COMPONENT = 5;
const HOST_SINGLETON = 27;

export type Fiber = {
  tag: number;
  type: unknown;
  elementType: unknown;
  /** The React key the parent gave it (a .map's item id). */
  key: string | null;
  return: Fiber | null;
  child: Fiber | null;
  sibling: Fiber | null;
  alternate: Fiber | null;
  memoizedProps: Record<string, unknown> | null;
  stateNode: unknown;
};

export type FiberHit = {
  src: string;
  /** Component display name ("Button", forwardRef/memo unwrapped) or the host tag ("div"). */
  name: string;
  /** Nearest host DOM nodes of the element (their union is the outline). */
  hosts: Element[];
  isComponent: boolean;
  props: Record<string, unknown>;
  /** The (current) fiber of the element, for parent/child walks. */
  fiber?: Fiber;
};

let fiberKey: string | null = null;

/** The fiber React keeps on a DOM node (`__reactFiber$…`), or null. */
export function fiberOf(node: Node | null | undefined): Fiber | null {
  if (!node) return null;
  try {
    const record = node as unknown as Record<string, Fiber | undefined>;
    if (fiberKey && record[fiberKey]) return record[fiberKey] ?? null;
    const key = Object.keys(node).find((name) => name.startsWith("__reactFiber$"));
    if (!key) return null;
    fiberKey = key;
    return record[key] ?? null;
  } catch {
    return null;
  }
}

// Context providers / consumers carry the annotation too (<Ctx value>), but they are not layers.
const CONTEXT_CONSUMER = 9;
const CONTEXT_PROVIDER = 10;

/*
 * Docs scaffolding written in the playground source (their call sites carry the annotation): not layers and never
 * selectable. A click on them falls through to the element around them, or the frame.
 */
const transparentNames = new Set(["ComponentPreview", "PlaygroundControls", "PlaygroundFilterChip", "PlaygroundToggle", "PlaygroundSlot", "PlatformCode", "ExampleCard", "ExamplePage"]);
/** Docs scaffolding that is never a layer (ComponentPreview, PlaygroundControls…). */
export const isTransparentName = (name: string) => transparentNames.has(name);

/** The src annotation of a fiber that is a layer (an element or a component), or null. */
export function srcOf(fiber: Fiber | null | undefined): string | null {
  if (!fiber || fiber.tag === CONTEXT_PROVIDER || fiber.tag === CONTEXT_CONSUMER) return null;
  const value = fiber.memoizedProps?.[SRC];
  if (typeof value !== "string" || !value) return null;
  return typeof fiber.type === "function" && transparentNames.has(nameOf(fiber)) ? null : value;
}

const isHost = (fiber: Fiber) => fiber.tag === HOST_COMPONENT || fiber.tag === HOST_SINGLETON;
/** A DOM element fiber (its stateNode is the element). */
export const isHostFiber = isHost;
/** A portal fiber (its subtree renders outside the parent DOM). */
export const isPortalFiber = (fiber: Fiber) => fiber.tag === HOST_PORTAL;

/**
 * The fiber of the committed tree. A DOM node keeps the fiber it was created with, which may be the alternate after
 * later renders; this is React DevTools' findCurrentFiberUsingSlowPath, returning the input when unsure.
 */
export function currentFiber(fiber: Fiber): Fiber {
  try {
    const alternate = fiber.alternate;
    if (!alternate) return fiber;
    let a: Fiber = fiber;
    let b: Fiber = alternate;
    for (let guard = 0; guard < 10000; guard++) {
      const parentA = a.return;
      if (!parentA) break;
      const parentB = parentA.alternate;
      if (!parentB) {
        const nextParent = parentA.return;
        if (nextParent) { a = b = nextParent; continue; }
        break;
      }
      if (parentA.child === parentB.child) {
        for (let child = parentA.child; child; child = child.sibling) {
          if (child === a) return fiber;
          if (child === b) return alternate;
        }
        return fiber;
      }
      if (a.return !== b.return) {
        a = parentA;
        b = parentB;
      } else {
        let found = false;
        for (let child = parentA.child; child; child = child.sibling) {
          if (child === a) { found = true; a = parentA; b = parentB; break; }
          if (child === b) { found = true; b = parentA; a = parentB; break; }
        }
        if (!found) {
          for (let child = parentB.child; child; child = child.sibling) {
            if (child === a) { found = true; a = parentB; b = parentA; break; }
            if (child === b) { found = true; b = parentB; a = parentA; break; }
          }
        }
        if (!found) return fiber;
      }
    }
    if (a.tag !== HOST_ROOT) return fiber;
    const root = a.stateNode as { current?: Fiber } | null;
    return root?.current === a ? fiber : alternate;
  } catch {
    return fiber;
  }
}

function typeName(type: unknown, depth = 0): string | null {
  if (depth > 5 || type == null) return null;
  if (typeof type === "string") return type;
  if (typeof type === "function") {
    const fn = type as { displayName?: string; name?: string };
    return fn.displayName || fn.name || null;
  }
  if (typeof type === "object") {
    const object = type as { displayName?: string; render?: unknown; type?: unknown; _payload?: { value?: unknown } };
    if (object.displayName) return object.displayName;
    if (object.render) return typeName(object.render, depth + 1);
    if (object.type) return typeName(object.type, depth + 1);
    if (object._payload?.value) return typeName(object._payload.value, depth + 1);
    return "Context";
  }
  return null;
}

/** Layer name: the component's display name (forwardRef, memo and lazy unwrapped) or the host tag. */
export function nameOf(fiber: Fiber): string {
  // A builder page's renderer names each component element (data-zen-name): a build minifies function names.
  if (typeof fiber.type !== "string") {
    const named = fiber.memoizedProps?.["data-zen-name"];
    const src = fiber.memoizedProps?.[SRC];
    if (typeof named === "string" && named && typeof src === "string" && src.startsWith("local:")) return named;
  }
  return typeName(fiber.type) ?? typeName(fiber.elementType) ?? "Anonymous";
}

/**
 * Nearest host DOM nodes under a fiber: stops at the first host level and does not cross a portal, unless the element
 * shows nothing else (a Dialog, Side Panel or Bottom Sheet: all of it is a portal, beside a <template> marker at most),
 * whose overlay is then its layer (plan WP-F, E2E O-02).
 */
export function hostsOf(fiber: Fiber): Element[] {
  const out: Element[] = [];
  const visit = (node: Fiber | null, depth: number, crossPortals: boolean) => {
    for (let current = node; current && out.length < 400; current = current.sibling) {
      if (isHost(current)) {
        if (current.stateNode instanceof Element) out.push(current.stateNode);
        continue;
      }
      if ((current.tag === HOST_PORTAL && !crossPortals) || depth > 400) continue;
      visit(current.child, depth + 1, crossPortals);
    }
  };
  try {
    if (isHost(fiber)) return fiber.stateNode instanceof Element && fiber.stateNode.isConnected ? [fiber.stateNode] : [];
    visit(fiber.child, 0, false);
    // Nothing on screen outside its portal (a Dialog renders a <template> marker beside it): its overlay is the layer.
    if (!out.some((element) => element.tagName !== "TEMPLATE" && element.getClientRects().length > 0)) {
      out.length = 0;
      visit(fiber.child, 0, true);
    }
  } catch {
    return out.filter((element) => element.isConnected);
  }
  return out.filter((element) => element.isConnected);
}

/** Whether a fiber renders a portal of its own (above its first host level): an overlay owner (Dialog, Side Panel). */
export function rendersPortal(fiber: Fiber): boolean {
  let found = false;
  const visit = (node: Fiber | null, depth: number) => {
    for (let current = node; current && !found; current = current.sibling) {
      if (current.tag === HOST_PORTAL) { found = true; return; }
      if (isHost(current) || depth > 200) continue;
      visit(current.child, depth + 1);
    }
  };
  try {
    visit(fiber.child, 0);
  } catch {
    return false;
  }
  return found;
}

/** The canvas frame a fiber renders in: through its parents to the first DOM node inside `world` (portals included). */
export function frameOfFiber(fiber: Fiber | undefined, world: Element): Element | null {
  for (let current = fiber?.return ?? null, guard = 0; current && guard < 4000; current = current.return, guard++) {
    if (isHost(current) && current.stateNode instanceof Element && world.contains(current.stateNode)) return current.stateNode.closest("[data-studio-frame]");
  }
  return null;
}

/** Walks up from an annotated fiber over the fibers of the same JSX element (a component that spreads its props puts
 * the same src on its DOM node) and returns the outermost one. */
function outermost(fiber: Fiber, src: string): Fiber {
  let top = fiber;
  for (let parent = fiber.return, guard = 0; parent && guard < 2000; parent = parent.return, guard++) {
    if (!srcOf(parent)) continue;
    // A bailed-out subtree can point `.return` at the previous tree, whose props carry the old annotation.
    if (srcOf(parent.alternate ? currentFiber(parent) : parent) !== src) break;
    top = parent;
  }
  return top;
}

/**
 * A hit for an annotated fiber (its outermost same-src fiber, in the committed tree). A DOM node keeps the fiber it was
 * created with, which can be the previous render's: the annotation is read from the committed fiber, so a re-render
 * after a source edit reports the element's new location.
 */
export function hitOf(fiber: Fiber): FiberHit | null {
  try {
    const live = currentFiber(fiber);
    const src = srcOf(live) ?? srcOf(fiber);
    if (!src) return null;
    const element = currentFiber(outermost(live, src));
    return {
      src,
      name: nameOf(element),
      hosts: hostsOf(element),
      isComponent: typeof element.type !== "string",
      props: element.memoizedProps ?? {},
      fiber: element,
    };
  } catch {
    return null;
  }
}

/** The nearest annotated JSX element that rendered `element` (walks DOM parents to the first React node first). */
export function annotatedAt(element: Element | null): FiberHit | null {
  try {
    let node: Node | null = element;
    let fiber: Fiber | null = null;
    while (node && !(fiber = fiberOf(node))) node = node.parentNode;
    for (let current = fiber, guard = 0; current && guard < 4000; current = current.return, guard++) {
      if (srcOf(current)) return hitOf(current);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The element `host` is the first DOM node of, named `name`: the selected element found again through its DOM node after
 * a re-render (React keeps host nodes), with the annotation the new render gave it. Null when the node now belongs to
 * something else.
 */
export function hitForHost(host: Element, name: string): FiberHit | null {
  try {
    const fiber = fiberOf(host);
    for (let current = fiber, guard = 0, levels = 0; current && guard < 4000 && levels < 6; current = current.return, guard++) {
      if (!srcOf(current)) continue;
      levels += 1;
      const hit = hitOf(current);
      if (!hit || !hit.hosts.includes(host)) return null;
      if (hit.name === name && hit.hosts[0] === host) return hit;
      if (hit.fiber) current = hit.fiber;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Depth-first walk over the annotated elements below `fiber` (portals excluded), in document order. An element is a
 * fiber whose src differs from its nearest annotated ancestor's; `enter` returns false to skip its subtree.
 */
export function walkAnnotated(fiber: Fiber | null, enter: (fiber: Fiber, src: string, parent: string | null) => boolean | void, parentSrc: string | null = null) {
  const visit = (node: Fiber | null, inherited: string | null, depth: number) => {
    for (let current = node; current; current = current.sibling) {
      if (current.tag === HOST_PORTAL || depth > 1500) continue;
      const src = srcOf(current);
      if (src && src !== inherited) {
        if (enter(current, src, inherited) === false) continue;
        visit(current.child, src, depth + 1);
      } else {
        visit(current.child, inherited, depth + 1);
      }
    }
  };
  try {
    visit(fiber, parentSrc, 0);
  } catch {
    // Internals changed mid-walk: return what was found.
  }
}

/** The committed fiber of a DOM element (the world, a frame body). */
export function elementFiber(element: Element | null): Fiber | null {
  const fiber = fiberOf(element);
  if (fiber) return currentFiber(fiber);
  // A React root container (createRoot target): its HostRoot fiber.
  try {
    const key = element ? Object.keys(element).find((name) => name.startsWith("__reactContainer$")) : undefined;
    const hostRoot = key ? (element as unknown as Record<string, Fiber | undefined>)[key] : undefined;
    return (hostRoot?.stateNode as { current?: Fiber } | null)?.current ?? hostRoot ?? null;
  } catch {
    return null;
  }
}

/** All rendered instances of a JSX element (`.map`), in document order, inside `root` (the world). */
export function findBySrc(root: Element, src: string): FiberHit[] {
  const fiber = elementFiber(root);
  if (!fiber) return [];
  const hits: FiberHit[] = [];
  walkAnnotated(fiber.child, (current, currentSrc) => {
    if (currentSrc !== src) return true;
    const hit = hitOf(current);
    if (hit) hits.push(hit);
    return true;
  });
  return hits;
}

/** Which instance (index among findBySrc) a hit is. */
export function instanceOf(root: Element, hit: FiberHit): number {
  const all = findBySrc(root, hit.src);
  const index = all.findIndex((other) => other.fiber === hit.fiber || other.fiber === hit.fiber?.alternate || (other.hosts[0] && other.hosts[0] === hit.hosts[0]));
  return Math.max(0, index);
}

/** The annotated element that contains `hit` (a different src), or null. Stops at `boundary` (a frame body). */
export function parentHit(hit: FiberHit, boundary?: Element | null): FiberHit | null {
  try {
    for (let current = hit.fiber?.return ?? null, guard = 0; current && guard < 4000; current = current.return, guard++) {
      if (boundary && current.stateNode === boundary) return null;
      const src = srcOf(current);
      if (src && src !== hit.src) return hitOf(current);
    }
  } catch {
    return null;
  }
  return null;
}

/** The annotated elements directly inside `hit`, in document order. */
export function childHits(hit: FiberHit): FiberHit[] {
  const fiber = hit.fiber;
  if (!fiber) return [];
  const out: FiberHit[] = [];
  walkAnnotated(fiber.child, (current) => {
    const child = hitOf(current);
    if (child) out.push(child);
    return false;
  }, hit.src);
  return out;
}

/**
 * The annotated element one level inside `owner` that renders `target` (the DOM node under the cursor): the outermost
 * annotated fiber between the two, such as the Avatar written in a ListItem's leading, which the row's own click target
 * covers on the canvas. Null when `target` is the owner's own markup (then only its read-only parts are below it).
 */
export function nestedHitAt(owner: FiberHit, target: Element | null): FiberHit | null {
  try {
    let node: Node | null = target;
    let fiber: Fiber | null = null;
    while (node && !(fiber = fiberOf(node))) node = node.parentNode;
    let nested: Fiber | null = null;
    for (let current = fiber ? currentFiber(fiber) : null, guard = 0; current && guard < 4000; current = current.return, guard++) {
      const src = srcOf(current);
      if (!src) continue;
      if (src === owner.src) {
        const hit = nested ? hitOf(nested) : null;
        return hit && hit.hosts.length ? hit : null;
      }
      nested = current;
    }
    return null;
  } catch {
    return null;
  }
}

function rectsOf(element: Element, depth = 0): DOMRect[] {
  const rect = element.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) return [rect];
  // display: contents (and empty wrappers) has no box: use its children's.
  if (depth > 3) return [];
  return Array.from(element.children).flatMap((child) => rectsOf(child, depth + 1));
}

/** Union of the hosts' client rects, or null when nothing has a box. */
export function rectOf(hosts: Element[]): DOMRect | null {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  try {
    for (const host of hosts) {
      if (!host.isConnected) continue;
      for (const rect of rectsOf(host)) {
        left = Math.min(left, rect.left);
        top = Math.min(top, rect.top);
        right = Math.max(right, rect.right);
        bottom = Math.max(bottom, rect.bottom);
      }
    }
  } catch {
    return null;
  }
  return Number.isFinite(left) ? new DOMRect(left, top, right - left, bottom - top) : null;
}

/** Frame id ([data-studio-frame]) an element sits in. */
export function frameOf(element: Element | null | undefined): string | null {
  return element?.closest("[data-studio-frame]")?.getAttribute("data-studio-frame") ?? null;
}

/**
 * Playground panel id ([data-studio-panel], ComponentPreview) an element sits in, or the one panel it wraps (the
 * section or playground component around a panel, which the Layers panel shows as that panel).
 */
export function panelOf(element: Element | null | undefined): string | null {
  const inside = element?.closest("[data-studio-panel]")?.getAttribute("data-studio-panel");
  if (inside || !element) return inside ?? null;
  const wrapped = element.querySelectorAll("[data-studio-panel]");
  return wrapped.length === 1 ? wrapped[0].getAttribute("data-studio-panel") : null;
}

/** "src/platform/examples/pages/button.tsx:84:6" → "button.tsx:84". */
export function shortSrc(src: string): string {
  const match = /([^/]*):(\d+):\d+$/.exec(src);
  return match ? `${match[1]}:${match[2]}` : src;
}

/* ───────────── Selection shared by the overlay, the Layers panel and the inspector ───────────── */

/* The resolved selection, shared with the inspector (instance count) without another fiber walk. */
let selectionInfo = { src: "", count: 0 };
const infoListeners = new Set<() => void>();
/** SelectionLayer publishes the instance count of the resolved selection. */
export function publishSelectionInfo(src: string, count: number) {
  if (selectionInfo.src === src && selectionInfo.count === count) return;
  selectionInfo = { src, count };
  infoListeners.forEach((listener) => listener());
}
/** How many instances the selected JSX element renders (0 while unresolved). */
export const selectionInstances = {
  get: () => selectionInfo,
  subscribe(listener: () => void) {
    infoListeners.add(listener);
    return () => { infoListeners.delete(listener); };
  },
};

/** Selects an annotated element on the canvas (also used by the Layers panel). */
export function selectHit(hit: FiberHit, world: Element | null) {
  const host = hit.hosts[0];
  studioStore.setState({
    selection: {
      kind: "node",
      src: hit.src,
      name: hit.name,
      frameId: frameOf(host),
      panelId: panelOf(host),
      instance: world ? instanceOf(world, hit) : 0,
    },
  });
}

/* ───────────── Canvas hover shared by the Layers panel and the selection overlay ───────────── */

let hovered: FiberHit | null = null;
const hoverListeners = new Set<() => void>();

/** A layer hovered outside the canvas (Layers panel row): the overlay outlines it. */
export const layerHover = {
  get: () => hovered,
  set(hit: FiberHit | null) {
    if (hit === hovered) return;
    hovered = hit;
    hoverListeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    hoverListeners.add(listener);
    return () => { hoverListeners.delete(listener); };
  },
};

/* ───────────── Source updates (HMR) ───────────── */

const updateListeners = new Set<() => void>();
const notifyUpdate = () => updateListeners.forEach((listener) => listener());
if (import.meta.hot) {
  import.meta.hot.on("vite:afterUpdate", notifyUpdate);
  // An update of this module itself must not leave the previous instance's handler behind.
  import.meta.hot.dispose(() => import.meta.hot?.off("vite:afterUpdate", notifyUpdate));
}

/** A builder page re-rendered from a new text (its "hot update": no Vite involved, Studio builder GĐ2). */
export const notifySourceUpdate = () => notifyUpdate();

/** Calls `listener` after Vite applied an update (a source edit re-rendered the page). Returns unsubscribe. */
export function onSourceUpdate(listener: () => void): () => void {
  updateListeners.add(listener);
  return () => { updateListeners.delete(listener); };
}

/** Focus is in a text field, or inside an open popover / menu / dialog: canvas shortcuts stay out of the way. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return true;
  return Boolean(target.closest(".zen-popover, [role='menu'], [role='listbox'], [role='dialog'], [aria-modal='true']"));
}

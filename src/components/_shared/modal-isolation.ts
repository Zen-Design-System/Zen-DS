/**
 * What a modal does to the rest of the page while it is open (React Aria `ariaHideOutside`, Radix `hideOthers`, Base UI
 * FloatingFocusManager): everything outside it is `inert`, so screen-reader browsing, pointers and Tab cannot reach the
 * background; and the page stops scrolling without the layout shifting by the scrollbar's width.
 * Both are reference counted, so a Dialog over a ModalForm works and modals may close in any order.
 */

const inertCounts = new WeakMap<Element, number>();
/** Kept reachable: toasts announce and offer actions while a modal is open; non-rendering nodes need nothing. */
const KEEP = ".zen-toast-stack, script, style, template, link, meta";

/** Where overlays are portalled: a device frame, a ZenProvider's portal root, or the body. */
const PORTAL_CONTAINER = "[data-zen-overlay-root], .zen-provider__portal, body";

/**
 * "Hide others": from the modal's own root (the element it portalled, backdrop included) up to the device frame or
 * `<body>`, every sibling on the way gets `inert`: the app, other providers, other layers. Popups the modal opens later
 * are added after this runs, so they stay live. Returns the cleanup.
 */
export function inertOutside(panel: Element): () => void {
  let root: Element = panel;
  while (root.parentElement && !root.parentElement.matches(PORTAL_CONTAINER)) root = root.parentElement;
  const frame = panel.closest("[data-zen-overlay-root]");
  const marked: Element[] = [];
  for (let node: Element = root; node.parentElement && node !== frame && node !== node.ownerDocument.body; node = node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling === node || sibling.matches(KEEP)) continue;
      const count = inertCounts.get(sibling) ?? 0;
      // Inert by the app's own choice: leave it, and leave it to the app.
      if (count === 0 && sibling.hasAttribute("inert")) continue;
      inertCounts.set(sibling, count + 1);
      sibling.setAttribute("inert", "");
      marked.push(sibling);
    }
  }
  return () => {
    for (const element of marked) {
      const count = (inertCounts.get(element) ?? 1) - 1;
      if (count > 0) inertCounts.set(element, count);
      else { inertCounts.delete(element); element.removeAttribute("inert"); }
    }
  };
}

let scrollLocks = 0;
let saved: { overflow: string; paddingRight: string } | null = null;

/** Locks page scroll; the first lock pads the body by the scrollbar's width so content does not jump. Returns the unlock. */
export function lockScroll(doc: Document = document): () => void {
  const body = doc.body;
  if (scrollLocks++ === 0) {
    saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = (doc.defaultView?.innerWidth ?? 0) - doc.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `calc(${getComputedStyle(body).paddingRight} + ${scrollbar}px)`;
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--scrollLocks === 0 && saved) {
      body.style.overflow = saved.overflow;
      body.style.paddingRight = saved.paddingRight;
      saved = null;
    }
  };
}

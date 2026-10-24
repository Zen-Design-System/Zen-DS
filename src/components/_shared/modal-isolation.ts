/**
 * What a modal does to the rest of the page while it is open (React Aria `ariaHideOutside`, Radix `hideOthers`, Base UI
 * FloatingFocusManager): everything outside it is `inert`, so screen-reader browsing, pointers and Tab cannot reach the
 * background; and the page stops scrolling, every box that scrolls around the modal included, without the layout
 * shifting by the scrollbar's width.
 * Both are reference counted, so a Dialog over a ModalForm works and modals may close in any order.
 */

const inertCounts = new WeakMap<Element, number>();
/** Kept reachable: toasts announce and offer actions while a modal is open; non-rendering nodes need nothing. */
const KEEP = ".zen-toast-layer, .zen-toast-stack, script, style, template, link, meta";

/** Where overlays are portalled when the caller does not say: a device frame, a ZenProvider's portal root, or the body. */
const PORTAL_CONTAINER = "[data-zen-overlay-root], .zen-provider__portal, body";

/**
 * Where isolation stops below `<body>`: a device frame, or an element marked `data-zen-isolation-root` whose outside must
 * stay live (Zen Studio's preview overlay layer: a Dialog previewed on the canvas leaves the canvas and the chrome alone).
 */
const ISOLATION_ROOT = "[data-zen-overlay-root], [data-zen-isolation-root]";

/**
 * The modal's root: the panel's ancestor directly inside the container it was portalled to. Given that container (an
 * app's own ZenPortalProvider element included), climb to it; otherwise recognise the usual ones.
 */
export function modalRoot(panel: Element, container?: Element | null): Element {
  const isContainer = (element: Element) => (container && container.contains(panel) ? element === container : element.matches(PORTAL_CONTAINER));
  let root: Element = panel;
  while (root.parentElement && !isContainer(root.parentElement)) root = root.parentElement;
  return root;
}

/**
 * "Hide others": from the modal's own root (the element it portalled, backdrop included) up to the device frame, an
 * isolation root or `<body>`, every sibling on the way gets `inert`: the app, other providers, other layers. Popups the
 * modal opens later are added after this runs, so they stay live. Returns the cleanup.
 */
export function inertOutside(panel: Element, container?: Element | null): () => void {
  const root = modalRoot(panel, container);
  const frame = panel.closest(ISOLATION_ROOT);
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

/** What a lock changed on a box, put back when its last lock is released. */
const scrollLocks = new WeakMap<HTMLElement, { count: number; overflow: string; paddingRight: string }>();
const SCROLLS = /(auto|scroll|overlay)/;

function lockBox(box: HTMLElement, scrollbar: number) {
  const lock = scrollLocks.get(box);
  if (lock) { lock.count++; return; }
  scrollLocks.set(box, { count: 1, overflow: box.style.overflow, paddingRight: box.style.paddingRight });
  // A stable gutter stays when the overflow is hidden, so only a box without one is padded.
  const pad = scrollbar > 0 && !getComputedStyle(box).scrollbarGutter?.includes("stable");
  if (pad) box.style.paddingRight = `calc(${getComputedStyle(box).paddingRight} + ${scrollbar}px)`;
  box.style.overflow = "hidden";
}

function unlockBox(box: HTMLElement) {
  const lock = scrollLocks.get(box);
  if (!lock) return;
  if (--lock.count > 0) return;
  scrollLocks.delete(box);
  box.style.overflow = lock.overflow;
  box.style.paddingRight = lock.paddingRight;
}

/**
 * Locks page scroll: the document and every box that scrolls its own overflow around `around` (the element the modal is
 * portalled into), up to `<body>` or an isolation root. A modal opened in a device frame inside a scrolling stage (Zen
 * Studio's Play and Present, a phone preview on a scrolling docs pane) must hold that stage still too: a wheel over its
 * scrim scrolls the scrim's ancestors, not the window. Each box is padded by its scrollbar's width so content does not
 * jump. Returns the unlock.
 */
export function lockScroll(around?: Element | null): () => void {
  const doc = around?.ownerDocument ?? document;
  const boxes: Array<[HTMLElement, number]> = [[doc.body, (doc.defaultView?.innerWidth ?? 0) - doc.documentElement.clientWidth]];
  for (let node = around ?? null; node && node !== doc.body && node !== doc.documentElement; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (SCROLLS.test(style.overflowX) || SCROLLS.test(style.overflowY)) {
      const box = node as HTMLElement;
      boxes.push([box, box.offsetWidth - box.clientWidth - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth)]);
    }
    if (node.matches("[data-zen-isolation-root]")) break;
  }
  for (const [box, scrollbar] of boxes) lockBox(box, scrollbar);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    for (const [box] of boxes.reverse()) unlockBox(box);
  };
}

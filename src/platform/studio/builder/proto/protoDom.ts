import { elementFiber, hitOf, walkAnnotated } from "../../select/picker";
import { srcAttr } from "../../select/srcIds";
import type { ChoiceItem } from "./protoModel";

/*
 * Where a prototype's items are on screen: what a press can operate, and the element that draws one item of a choice
 * control (a tab, a navigation destination, a segment), found by its label inside the control. Shared by the canvas
 * connections (ProtoLinks) and Play's hotspot hints.
 */

/** The DOM elements each wanted layer (`file:line:col`) draws inside `root`, its first instance: through React (a
 *  component that keeps the Studio's mark off its DOM, as BottomNavigation) and through the marks on the DOM (what a
 *  portal shows, as an overlay's Dialog). */
export function layerElements(root: Element, wanted: ReadonlySet<string>): Map<string, Element[]> {
  const out = new Map<string, Element[]>();
  if (!wanted.size) return out;
  const fiber = elementFiber(root);
  if (fiber) {
    walkAnnotated(fiber.child, (current, src) => {
      if (!wanted.has(src) || out.has(src)) return true;
      const hit = hitOf(current);
      if (hit?.hosts.length) out.set(src, hit.hosts);
      return true;
    });
  }
  root.querySelectorAll("[data-zen-src]").forEach((element) => {
    const src = srcAttr(element);
    if (src && wanted.has(src) && !out.has(src)) out.set(src, [element]);
  });
  return out;
}

/** What a press can operate. */
export const CLICKABLE = "button, a[href], input, select, textarea, summary, label, [role='button'], [role='link'], [role='tab'], [role='menuitem'], [role='option'], [role='switch'], [role='checkbox'], [role='radio'], [tabindex]:not([tabindex='-1'])";

const nameOf = (element: Element) => (element.getAttribute("aria-label") ?? element.textContent ?? "").replace(/\s+/g, " ").trim();

/** The element of `root` (a choice control) that draws `item`: the operable element named by its label (exactly, else
 *  starting with it, as a tab with a counter). Items sharing a label (Figma's placeholder tabs, all "Label") pair with
 *  those elements in order: the n-th such item of `items` (the control's list) is the n-th element with that name. */
export function itemElement(root: Element, item: ChoiceItem, items: readonly ChoiceItem[] = [item]): Element | null {
  const candidates = [...(root.matches(CLICKABLE) ? [root] : []), ...root.querySelectorAll(CLICKABLE)];
  const nth = Math.max(0, items.filter((other) => other.label === item.label).findIndex((other) => other.value === item.value));
  const exact = candidates.filter((element) => nameOf(element) === item.label);
  if (exact.length) return exact[nth] ?? exact[0];
  const prefixed = candidates.filter((element) => nameOf(element).startsWith(item.label));
  return prefixed[nth] ?? prefixed[0] ?? null;
}

/** The item of `items` drawn by `element` (a part selected inside the control), or by its one item inside it. */
export function itemAt(root: Element, items: ChoiceItem[], element: Element): ChoiceItem | null {
  const drawn = items.map((item) => ({ item, at: itemElement(root, item, items) }));
  const holding = drawn.find(({ at }) => at && (at === element || at.contains(element)));
  if (holding) return holding.item;
  const inside = drawn.filter(({ at }) => at && element.contains(at));
  return inside.length === 1 ? inside[0].item : null;
}

/** The item of a choice control selected on the canvas (a tab, a destination: a part of the control), as ProtoLinks
 *  resolves it: the Prototype tab marks its row and a new per-item action starts from it. */
type SelectedItem = { loc: string; item: string } | null;
let selected: SelectedItem = null;
const listeners = new Set<() => void>();
export const selectedItem = {
  get: (): SelectedItem => selected,
  set(next: SelectedItem) {
    if (next?.loc === selected?.loc && next?.item === selected?.item) return;
    selected = next;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

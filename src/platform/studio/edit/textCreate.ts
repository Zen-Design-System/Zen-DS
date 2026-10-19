import { applyEdit, parseSrc, studioApi } from "../api";
import { multiSelection } from "../select/multiSelection";
import { annotatedAt, childHits, findBySrc, frameOf, instanceOf, panelOf, parentHit } from "../select/picker";
import { expectRender } from "../select/remap";
import { flushStudioStore, studioStore } from "../store";
import type { EditOp, StudioSelection } from "../types";
import { startTextEditOnSelection, textNodeAt, tryStartTextEdit } from "./textEdit";

/** A hold of the keys typed since the Text tool's click (textEdit holdKeysForText). */
type KeyHold = { cancelled: () => boolean };

/*
 * Figma's Text tool after the click or drag (F6): the new Text is selected and its words are being edited at once,
 * all selected, so the first key replaces them (keys typed before the editor shows are kept: textEdit takeTypedAhead).
 * A new text left without typing, or emptied, is removed again (Figma keeps no empty text layer): `freshTexts` names
 * the texts made this way until their first edit ends. In a free frame the Text floats in a Box at the point (the
 * Ignore auto layout wrapper, position/float.ts); that Box goes with it.
 */

const freshTexts = new Set<string>();

/** Whether the text layer `src` was just made with the Text tool and has not been edited yet; forgets it. */
export function takeFreshText(src: string): boolean {
  return freshTexts.delete(src);
}

/** Selects the Text the Text tool inserted at `loc` of `file` (inside its float Box when `wrapped`) and edits it. */
export async function editNewText(file: string, loc: string, wrapped: boolean, ref: Pick<StudioSelection & { kind: "node" }, "frameId" | "panelId">, before: WeakSet<Element>, keys?: KeyHold) {
  let textLoc = loc;
  if (wrapped) {
    const box = await studioApi.element(file, loc).catch(() => null);
    const child = box?.children.find((entry) => entry.kind === "element");
    if (child && child.kind === "element") textLoc = child.loc;
  }
  const next: StudioSelection = { kind: "node", src: `${file}:${textLoc}`, name: "Text", frameId: ref.frameId, panelId: ref.panelId, instance: 0 };
  freshTexts.add(next.src);
  multiSelection.clear();
  expectRender(next, before, () => undefined, 1500);
  studioStore.setState({ selection: next });
  flushStudioStore();
  // The editor opens as soon as the new text shows (Esc pressed before that: the text goes again).
  const until = Date.now() + 2000;
  const tryOpen = () => {
    if (keys?.cancelled()) { freshTexts.delete(next.src); void removeEmptyText(next.src); return; }
    if (startTextEditOnSelection()) return;
    if (Date.now() < until) requestAnimationFrame(tryOpen);
  };
  requestAnimationFrame(tryOpen);
}

/**
 * The Text tool pressed on the words of a text layer (a Text or Heading of a page you made): Figma puts the caret there
 * instead of making a new text. True when that edit starts.
 */
export function editTextAt(x: number, y: number): boolean {
  const node = textNodeAt(x, y);
  const hit = node?.parentElement ? annotatedAt(node.parentElement) : null;
  const name = hit?.name.slice(hit.name.lastIndexOf(".") + 1);
  const host = hit?.hosts[0];
  const world = document.querySelector(".studio-world");
  if (!hit || !host || !world || (name !== "Text" && name !== "Heading")) return false;
  studioStore.setState({ tool: "select", selection: { kind: "node", src: hit.src, name: hit.name, frameId: frameOf(host), panelId: panelOf(host), instance: instanceOf(world, hit) } });
  flushStudioStore();
  return tryStartTextEdit(x, y, hit.src);
}

/** Props a Box that only floats one layer has (position/float.ts isFloatWrapper). */
const FLOAT_PROPS = new Set(["position", "constraintX", "constraintY", "insetTop", "insetRight", "insetBottom", "insetLeft", "width", "height", "children", "key"]);

/** The element a text layer that ends empty takes with it: its float Box (it is that Box's only layer), else itself. */
function removedWith(src: string): string {
  const world = document.querySelector(".studio-world");
  const hit = world ? findBySrc(world, src)[0] : undefined;
  const parent = hit ? parentHit(hit, hit.hosts[0]?.closest("[data-studio-frame]") ?? null) : null;
  if (!parent || parent.name.slice(parent.name.lastIndexOf(".") + 1) !== "Box" || parent.props.position !== "absolute") return src;
  const own = Object.keys(parent.props).filter((key) => !key.startsWith("data-") && !FLOAT_PROPS.has(key));
  return own.length === 0 && childHits(parent).length === 1 ? parent.src : src;
}

/**
 * Removes a text layer that ends empty (Figma deletes it): the Text, or the float Box around it in a free frame. One
 * edit, labelled "Delete text"; the selection clears.
 */
export async function removeEmptyText(src: string): Promise<boolean> {
  const at = parseSrc(removedWith(src));
  if (!at) return false;
  const element = await studioApi.element(at.file, at.loc).catch(() => null);
  if (!element) return false;
  const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops: [{ op: "removeElement" } as EditOp], hash: element.hash }, "Delete text");
  if (response.ok) studioStore.setState({ selection: null });
  return Boolean(response.ok);
}

import { applyEdit, squashEdits, studioApi } from "../api";
import { canvasApi } from "../canvas/viewport";
import { findBySrc } from "../select/picker";
import { studioStore } from "../store";

/*
 * Figma's width for a component placed in a Frame without auto layout. A component that fills its container in code (a
 * Top Navigation, an Input) hugs its content in the Box that floats it; Figma's instance keeps its variant's width
 * (edit/assets/figmaWidths.generated.ts). Shared by the empty canvas (builder/boardPaste.ts dropOnBoard), a drop
 * (edit/assets/assets.ts dropAsset) and a click in Assets (edit/clipboard.ts pasteAt), so no module of theirs imports another.
 */

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** Whether what floating `layer` holds widens with it (it fills its container: a Top Navigation), not its own width (a
 *  Button). */
export function fillsLayer(layer: HTMLElement): boolean {
  const kids = Array.from(layer.children).filter((kid): kid is HTMLElement => kid instanceof HTMLElement);
  const widths = kids.map((kid) => kid.offsetWidth);
  const own = layer.style.width;
  layer.style.width = `${layer.offsetWidth + 40}px`;
  const wider = kids.some((kid, index) => kid.offsetWidth > widths[index]);
  layer.style.width = own;
  return wider;
}

/** What `src` draws once the canvas shows the write (an element not in `before`, drawn before it), or null after `timeout`. */
async function renderedAfter(src: string, before: WeakSet<Element>, timeout = 3000): Promise<HTMLElement | null> {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const host = findBySrc(canvasApi.getWorldElement() ?? document.body, src)[0]?.hosts[0];
    if (host instanceof HTMLElement && !before.has(host) && host.offsetWidth && host.offsetHeight) return host;
    await nextFrame();
  }
  return null;
}

/**
 * Once the floating Box at `loc` of `file` has rendered, it takes `width` when what it holds fills it (user 2026-11-02:
 * "áp dụng luôn cho thả vào frame không có auto layout"; 2026-11-04: "áp dụng luôn cho bấm chèn từ Assets"), in a second
 * write that joins the one that added it (`text`: the page before that one; one ⌘Z). One that hugs in code (a Button)
 * keeps its own width. The page's text after the width, or null when nothing was written.
 */
export async function fitFreeBox(file: string, loc: string, width: number, label: string, text: string, before: WeakSet<Element>): Promise<string | null> {
  const added = studioStore.getState().undo.at(-1);
  const box = await renderedAfter(`${file}:${loc}`, before);
  if (!box || !fillsLayer(box)) return null;
  const element = await studioApi.element(file, loc).catch(() => null);
  if (!element || element.name !== "Box") return null;
  const response = await applyEdit({ file, loc, name: element.name, ops: [{ op: "setProp", name: "width", value: { kind: "number", value: Math.round(width) } }], hash: element.hash }, label);
  if (!response.ok) return null;
  // One step only while the fit sits right on the add (a ⌘Z in between took the add back: nothing to join).
  if (studioStore.getState().undo.at(-2) === added) squashEdits(2, label, text, response.after);
  return response.after;
}

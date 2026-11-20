import type { MenuItemData } from "../../../components/Menu";
import { announceEditStatus, squashEdits } from "../api";
import { CLIPBOARD_BLOCKED, copiedLayers, readClipboardText, textLayer } from "../edit/clipboard";
import { canEdit, studioStore } from "../store";
import { loadEngine } from "./engine";
import { copyFrame, setFrameBoxes } from "./frameEdit";
import { copiedFrame } from "./frameKeys";
import { boardPlaceAt } from "./frameMove";
import { addLooseLayers, fillsLooseLayer } from "./looseLayer";
import type { PageVarStarts } from "../types";
import type { FramePlace } from "./render/framePlace";
import { getPage } from "./store/pageStore";

/*
 * Figma's Paste here on the empty canvas (the canvas menu, shell/CanvasMenu.tsx), on a page you made: what was copied
 * last lands on the board with its corner at the pointer, one edit and one ⌘Z. A copied frame or Section (⌘C on it,
 * frameKeys.ts) is pasted there as a frame (frameEdit.ts copyFrame). Copied layers (edit/clipboard.ts), or code or text
 * from elsewhere, land as layers on the canvas, outside any frame (Figma's; user 2026-11-20 "Các component vẫn chỉ tạo
 * và đặt trong frame. Không đặt ở ngoài frame được"): each one a `<Layer>` of the Board (builder/looseLayer.ts) where it
 * was beside the others. The first one's layer is selected. A component dragged from Assets onto the empty canvas
 * lands the same way (dropOnBoard).
 */

/** Code or text from elsewhere, whose size is unknown before it renders: room for a card around the middle of the view. */
const UNMEASURED = { width: 400, height: 300 };

const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });

/** The frame or the layers copied last in the Studio (whichever ⌘C came later), or null. */
function lastCopied() {
  const layers = copiedLayers();
  const frame = copiedFrame();
  if (frame && (!layers || frame.copiedAt > layers.copiedAt)) return { frame: frame.clip, layers: null };
  return layers ? { frame: null, layers } : null;
}

/**
 * Whether Paste here has something to paste: a frame or layers copied in the Studio, or text on the system clipboard.
 * The clipboard is read only where the browser allows it without asking; where it would ask, the item stays on and its
 * click reads the clipboard.
 */
export async function boardPasteReady(): Promise<boolean> {
  if (lastCopied()) return true;
  const permission = await navigator.permissions?.query({ name: "clipboard-read" as PermissionName }).catch(() => null);
  if (!permission || permission.state === "prompt") return true;
  if (permission.state !== "granted") return false;
  const text = await navigator.clipboard?.readText().catch(() => null);
  return Boolean(text?.trim());
}

/**
 * Pastes what was copied last on the board of the page you are on, its corner at the client point `point`. `text`: what
 * a ⌘V event held that the Studio did not copy (else the Studio's clip, or the system clipboard). `centred`: the new
 * frame's middle at `point` (⌘V with no frame in the middle of the view, edit/clipboard.ts: Figma pastes in the middle
 * of the view, on the canvas; user 2026-11-20 "không cho cắt component ra ngoài frame": ⌘X, then ⌘V there said
 * "Nothing here takes a paste").
 */
export async function pasteOnBoard(point: { x: number; y: number }, options: { text?: string; centred?: boolean } = {}): Promise<boolean> {
  const { localPage } = studioStore.getState();
  if (!localPage || !canEdit()) return false;
  const place = boardPlaceAt(point);
  if (!place) { fail("Paste here pastes on the board of a page you made"); return false; }
  const last = options.text === undefined ? lastCopied() : null;
  if (last?.frame) {
    const { frame } = last;
    // Still on this page: copied from it (after it in Layers); else from what ⌘C read (another page, or deleted since).
    const here = frame.page === localPage && document.querySelector(`.studio-builder-board__frames > [data-studio-frame="${CSS.escape(frame.frameId)}"]`);
    return Boolean(await copyFrame(localPage, frame.frameId, place, { label: "Paste frame here", ...(here ? {} : { source: frame }) }));
  }
  const layers = last?.layers ?? null;
  const read = layers || options.text !== undefined ? null : await readClipboardText();
  if (read?.blocked) { fail(CLIPBOARD_BLOCKED); return false; }
  const text = layers ? layers.code : (options.text ?? read?.text ?? "").trim();
  if (!text) { fail("The clipboard is empty — copy a layer first"); return false; }
  const code = text.startsWith("<") ? text : textLayer(text);
  if (/^<(?:Screen|Overlay|Section|Slice|Layer)\b/.test(code)) { fail("Select the frame by its name, copy it, then paste it here"); return false; }
  const engine = await loadEngine();
  let pieces: Array<{ code: string; x: number; y: number }>;
  try {
    pieces = engine.looseLayers(code);
  } catch {
    fail("Nothing to paste: the clipboard holds no layers");
    return false;
  }
  if (!pieces.length) { fail("Nothing to paste: the clipboard holds no layers"); return false; }
  // Where each was beside the others on the canvas (layers from auto layout too), else where it floated.
  const boxes = layers?.boxes?.length === pieces.length ? layers.boxes : null;
  const size = layers?.size ?? UNMEASURED;
  const name = layers?.name ?? (text.startsWith("<") ? "layer" : "text");
  const at = options.centred ? { x: place.x - Math.round(size.width / 2), y: place.y - Math.round(size.height / 2) } : place;
  const items = pieces.map((piece, index) => ({ place: { x: at.x + (boxes ? boxes[index].x : piece.x), y: at.y + (boxes ? boxes[index].y : piece.y) }, content: piece.code }));
  const label = options.centred ? `Paste ${name}` : `Paste ${name} here`;
  const before = (await getPage(localPage))?.text;
  const added = await addLooseLayers(localPage, items, label);
  // One layer that fills its container keeps the width it had where it was copied.
  if (added?.length === 1 && layers?.size && before !== undefined) await fitLooseLayer(localPage, added[0], layers.size.width, label, before);
  return Boolean(added);
}

/**
 * Figma's drop of a component on the empty canvas (Assets, edit/assets/assets.ts), on a page you made (user 2026-10-28:
 * "kéo component ra canvas trống như figma"): a layer on the canvas at the pointer, outside any frame (user 2026-11-20),
 * at its own size. A component that fills its container in code (a Top Navigation, an Input, a chart) would hug its
 * content there: once it has rendered it takes `figmaWidth`, its Figma variant's (user 2026-10-29: "giữ đúng chiều rộng
 * như Figma khi thả ra canvas"; edit/assets/figmaWidths.generated.ts), else a phone's width. One ⌘Z takes both writes
 * back. Its layer is selected.
 */
export async function dropOnBoard(code: string, place: FramePlace, label: string, figmaWidth?: number, vars?: PageVarStarts): Promise<boolean> {
  const { localPage } = studioStore.getState();
  if (!localPage || !canEdit()) return false;
  const engine = await loadEngine();
  let content: string;
  try {
    content = engine.looseLayers(code)[0]?.code ?? "";
  } catch {
    content = "";
  }
  if (!content) { fail(`${label}: nothing to add`); return false; }
  const before = (await getPage(localPage))?.text;
  const [frameId] = (await addLooseLayers(localPage, [{ place, content }], label, vars)) ?? [];
  if (!frameId) return false;
  if (before !== undefined) await fitLooseLayer(localPage, frameId, figmaWidth ?? FILL_START, label, before);
  return true;
}

/** A component that fills its container, without a Figma width, dropped on the canvas: a phone's width. */
const FILL_START = 390;

/**
 * A layer just put on the canvas that fills its container in code (a Top Navigation, an Input, a chart) would hug its
 * content in its Layer: once it has rendered, its Layer takes `width` (Figma's instance width), in the same undo step
 * as the add (`before`: the page's text before it).
 */
async function fitLooseLayer(localPage: string, frameId: string, width: number, label: string, before: string) {
  const added = studioStore.getState().undo.at(-1);
  const frame = await renderedFrame(frameId);
  if (!frame || !fillsLooseLayer(frame)) return;
  if (!(await setFrameBoxes(localPage, new Map([[frameId, { width: Math.round(width) }]]), label))) return;
  const after = (await getPage(localPage))?.text;
  // One step only while the width sits right on the add (a ⌘Z in between took the add back: nothing to join).
  if (after !== undefined && studioStore.getState().undo.at(-2) === added) squashEdits(2, label, before, after);
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** The loose Layer `frameId` once its layer has rendered, or null after `timeout`. */
async function renderedFrame(frameId: string, timeout = 3000): Promise<HTMLElement | null> {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const frame = document.querySelector<HTMLElement>(`[data-studio-frame="${CSS.escape(frameId)}"]`);
    const layer = frame?.firstElementChild;
    if (frame && layer instanceof HTMLElement && !layer.matches(".studio-frame__portal") && layer.offsetWidth && layer.offsetHeight) return frame;
    await nextFrame();
  }
  return null;
}

/** The empty canvas menu's Paste here (Figma's), on a page you made: dimmed with nothing to paste or for a viewer. */
export function boardPasteItems(point: { x: number; y: number }, ready: boolean): MenuItemData[] {
  if (!studioStore.getState().localPage) return [];
  return [{ id: "canvas-paste-here", label: "Paste here", icon: "icon-clipboard-line", disabled: !ready || !canEdit(), onSelect: () => { void pasteOnBoard(point); } }];
}

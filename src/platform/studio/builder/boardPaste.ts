import type { MenuItemData } from "../../../components/Menu";
import { announceEditStatus, squashEdits } from "../api";
import { CLIPBOARD_BLOCKED, copiedLayers, readClipboardText, textLayer } from "../edit/clipboard";
import { canEdit, studioStore } from "../store";
import { loadEngine } from "./engine";
import { copyFrame, setFrameBoxes } from "./frameEdit";
import { copiedFrame } from "./frameKeys";
import { boardPlaceAt, deviceFor, FRAME_MAX, FRAME_MIN } from "./frameMove";
import { addFrame } from "./proto/addFrame";
import type { FramePlace } from "./render/framePlace";
import { getPage } from "./store/pageStore";

/*
 * Figma's Paste here on the empty canvas (the canvas menu, shell/CanvasMenu.tsx), on a page you made: what was copied
 * last lands on the board with its corner at the pointer, one edit and one ⌘Z. A copied frame or Section (⌘C on it,
 * frameKeys.ts) is pasted there as a frame (frameEdit.ts copyFrame). Copied layers (edit/clipboard.ts), or code or text
 * from elsewhere, go into a new empty frame of their size there: a page's Board holds frames only, so Figma's loose
 * layer is a frame here. One layer, or layers that floated, float in it from its top-left corner (a frame without auto
 * layout: X / Y move them); several layers of an auto layout stay in its flow, one under another. The new frame is
 * selected. A component dragged from Assets onto the empty canvas lands the same way (dropOnBoard).
 */

/** A frame for code or text from elsewhere, whose size is unknown before it renders: room for a card; resize it after. */
const UNMEASURED = { width: 400, height: 300 };

const fail = (message: string) => announceEditStatus({ kind: "error", message, at: Date.now() });
const clamp = (value: number) => Math.min(FRAME_MAX, Math.max(FRAME_MIN, Math.round(value)));

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

/** Pastes what was copied last on the board of the page you are on, its corner at the client point `point`. */
export async function pasteOnBoard(point: { x: number; y: number }): Promise<boolean> {
  const { localPage } = studioStore.getState();
  if (!localPage || !canEdit()) return false;
  const place = boardPlaceAt(point);
  if (!place) { fail("Paste here pastes on the board of a page you made"); return false; }
  const last = lastCopied();
  if (last?.frame) {
    const { frame } = last;
    // Still on this page: copied from it (after it in Layers); else from what ⌘C read (another page, or deleted since).
    const here = frame.page === localPage && document.querySelector(`.studio-builder-board__frames > [data-studio-frame="${CSS.escape(frame.frameId)}"]`);
    return Boolean(await copyFrame(localPage, frame.frameId, place, { label: "Paste frame here", ...(here ? {} : { source: frame }) }));
  }
  const layers = last?.layers ?? null;
  const read = layers ? null : await readClipboardText();
  if (read?.blocked) { fail(CLIPBOARD_BLOCKED); return false; }
  const text = layers ? layers.code : (read?.text ?? "").trim();
  if (!text) { fail("The clipboard is empty — copy a layer first"); return false; }
  const code = text.startsWith("<") ? text : textLayer(text);
  if (/^<(?:Screen|Overlay|Section)\b/.test(code)) { fail("Select the frame by its name, copy it, then paste it here"); return false; }
  let content = code;
  if (!layers?.several || layers.floats) {
    const engine = await loadEngine();
    try {
      content = engine.floatAt(code, { x: 0, y: 0 });
    } catch {
      fail("Nothing to paste: the clipboard holds no layers");
      return false;
    }
  }
  const size = layers?.size ?? UNMEASURED;
  const name = layers?.name ?? (text.startsWith("<") ? "layer" : "text");
  return Boolean(await frameOnBoard(localPage, place, content, size, `Paste ${name} here`));
}

/** A new empty frame of `size` (100 to 4096 a side) at `place` on the board, holding `content`: Paste here's, a drop's. */
function frameOnBoard(localPage: string, place: FramePlace, content: string, size: { width: number; height: number }, label: string) {
  const width = clamp(size.width);
  const height = clamp(size.height);
  return addFrame(localPage, "screen", { place, width, height, device: deviceFor(width), name: "Frame", empty: true, content, label });
}

/** A component's frame before it renders: a phone's width (a component that fills takes it, one that hugs keeps its
 *  own); the frame then fits what rendered. */
const DROP_START = { width: 390, height: 300 };

/**
 * Figma's drop of a component on the empty canvas (Assets, edit/assets/assets.ts), on a page you made (user 2026-10-28:
 * "kéo component ra canvas trống như figma"): as Paste here, a new empty frame at the pointer holds it, floating from
 * the frame's top-left corner; once it has rendered, the frame takes its size (Figma's instance on the canvas is its
 * own size; a frame is 100 a side at least). A component that fills its container in code (a Top Navigation, an Input,
 * a chart) would hug its content there: it takes `figmaWidth`, its Figma variant's (user 2026-10-29: "giữ đúng chiều
 * rộng như Figma khi thả ra canvas"; edit/assets/figmaWidths.generated.ts). One ⌘Z takes both writes back. The new
 * frame is selected.
 */
export async function dropOnBoard(code: string, place: FramePlace, label: string, figmaWidth?: number): Promise<boolean> {
  const { localPage } = studioStore.getState();
  if (!localPage || !canEdit()) return false;
  const engine = await loadEngine();
  let content: string;
  try {
    content = engine.floatAt(code, { x: 0, y: 0 });
  } catch {
    fail(`${label}: nothing to add`);
    return false;
  }
  const before = (await getPage(localPage))?.text;
  const frameId = await frameOnBoard(localPage, place, content, DROP_START, label);
  if (!frameId) return false;
  const added = studioStore.getState().undo.at(-1);
  const layer = await renderedLayer(frameId);
  const size = layer && (await fitOf(layer, figmaWidth));
  if (!size || before === undefined || !(await setFrameBoxes(localPage, new Map([[frameId, { width: clamp(size.width), height: clamp(size.height), layerWidth: size.layerWidth }]]), label))) return true;
  const after = (await getPage(localPage))?.text;
  // One step only while the fit sits right on the add (a ⌘Z in between took the add back: nothing to join).
  if (after !== undefined && studioStore.getState().undo.at(-2) === added) squashEdits(2, label, before, after);
  return true;
}

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

/** What frame `frameId` holds once it has rendered (its floating layer), or null after `timeout`. */
async function renderedLayer(frameId: string, timeout = 3000): Promise<HTMLElement | null> {
  const until = Date.now() + timeout;
  while (Date.now() < until) {
    const layer = document.querySelector<HTMLElement>(`[data-studio-frame="${CSS.escape(frameId)}"] .studio-builder-screen [data-position="absolute"]`);
    if (layer?.offsetWidth && layer.offsetHeight) return layer;
    await nextFrame();
  }
  return null;
}

/** Whether what floating `layer` holds widens with it (it fills its container: a Top Navigation), not its own width (a Button). */
function fillsLayer(layer: HTMLElement): boolean {
  const kids = Array.from(layer.children).filter((kid): kid is HTMLElement => kid instanceof HTMLElement);
  const widths = kids.map((kid) => kid.offsetWidth);
  const own = layer.style.width;
  layer.style.width = `${layer.offsetWidth + 40}px`;
  const wider = kids.some((kid, index) => kid.offsetWidth > widths[index]);
  layer.style.width = own;
  return wider;
}

/**
 * The CSS px box the new frame takes around floating `layer`: its own size, or, for a component that fills its
 * container with a Figma width, that width (`layerWidth`: the layer takes it too) and the height it has there (tried on
 * the canvas for two frames, so what measures its box, a chart, lays out again).
 */
async function fitOf(layer: HTMLElement, figmaWidth: number | undefined): Promise<{ width: number; height: number; layerWidth?: number }> {
  if (!figmaWidth || !fillsLayer(layer)) return { width: layer.offsetWidth, height: layer.offsetHeight };
  const own = layer.style.width;
  layer.style.width = `${figmaWidth}px`;
  await nextFrame();
  await nextFrame();
  const height = layer.offsetHeight;
  layer.style.width = own;
  return { width: figmaWidth, height, layerWidth: figmaWidth };
}

/** The empty canvas menu's Paste here (Figma's), on a page you made: dimmed with nothing to paste or for a viewer. */
export function boardPasteItems(point: { x: number; y: number }, ready: boolean): MenuItemData[] {
  if (!studioStore.getState().localPage) return [];
  return [{ id: "canvas-paste-here", label: "Paste here", icon: "icon-clipboard-line", disabled: !ready || !canEdit(), onSelect: () => { void pasteOnBoard(point); } }];
}

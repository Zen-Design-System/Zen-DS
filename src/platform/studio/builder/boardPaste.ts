import type { MenuItemData } from "../../../components/Menu";
import { announceEditStatus } from "../api";
import { copiedLayers, textLayer } from "../edit/clipboard";
import { canEdit, studioStore } from "../store";
import { loadEngine } from "./engine";
import { copyFrame } from "./frameEdit";
import { copiedFrame } from "./frameKeys";
import { boardPlaceAt, deviceFor, FRAME_MAX, FRAME_MIN } from "./frameMove";
import { addFrame } from "./proto/addFrame";

/*
 * Figma's Paste here on the empty canvas (the canvas menu, shell/CanvasMenu.tsx), on a page you made: what was copied
 * last lands on the board with its corner at the pointer, one edit and one ⌘Z. A copied frame or Section (⌘C on it,
 * frameKeys.ts) is pasted there as a frame (frameEdit.ts copyFrame). Copied layers (edit/clipboard.ts), or code or text
 * from elsewhere, go into a new empty frame of their size there: a page's Board holds frames only, so Figma's loose
 * layer is a frame here. One layer, or layers that floated, float in it from its top-left corner (a frame without auto
 * layout: X / Y move them); several layers of an auto layout stay in its flow, one under another. The new frame is
 * selected.
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
  const text = layers ? layers.code : ((await navigator.clipboard?.readText().catch(() => null)) ?? "").trim();
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
  const width = clamp(size.width);
  const height = clamp(size.height);
  const name = layers?.name ?? (text.startsWith("<") ? "layer" : "text");
  return addFrame(localPage, "screen", { place, width, height, device: deviceFor(width), name: "Frame", empty: true, content, label: `Paste ${name} here` });
}

/** The empty canvas menu's Paste here (Figma's), on a page you made: dimmed with nothing to paste or for a viewer. */
export function boardPasteItems(point: { x: number; y: number }, ready: boolean): MenuItemData[] {
  if (!studioStore.getState().localPage) return [];
  return [{ id: "canvas-paste-here", label: "Paste here", icon: "icon-clipboard-line", disabled: !ready || !canEdit(), onSelect: () => { void pasteOnBoard(point); } }];
}

import { useEffect } from "react";
import { announceEditStatus } from "../api";
import { isTypingTarget } from "../select/picker";
import { canEdit, studioStore } from "../store";
import { frameFigmaClip, writeFrameClip } from "./export/figmaClipboard";
import { copyFrame, frameClip, moveFrames, type FrameClip } from "./frameEdit";
import { dropLivePlace, livePlace, showLivePlace } from "./frameMove";

/*
 * Keys for a selected frame on a page you made (Figma's): ⌘D duplicates it beside itself, ⌘C / ⌘V copy and paste it
 * (onto this page or another page you made), the arrow keys nudge it 1 px (⇧ 10 px; one undo step per burst). Taken
 * in the capture phase before the Studio's layer keys and clipboard, which act on layers only. ⌘C also carries the
 * frame's Figma export (export/figmaClipboard.ts), which ⌘V on the Zen file's canvas or in the Zen plugin places in Figma.
 */

const NUDGE_SETTLE_MS = 400;

/** The frame selected on page `localPage` and its element, when its keys apply (Select tool, an admin, focus on the canvas). */
function selectedFrame(localPage: string, target: EventTarget | null) {
  const state = studioStore.getState();
  if (state.localPage !== localPage || state.tool !== "select" || state.presenting || !canEdit(state)) return null;
  if (state.selection?.kind !== "frame") return null;
  // The canvas has the keys (or nothing focused): never a field, a menu, or a row in a side panel.
  if (isTypingTarget(target) || (target instanceof Element && target !== document.body && !target.closest(".studio-viewport"))) return null;
  const { frameId } = state.selection;
  const element = document.querySelector<HTMLElement>(`.studio-builder-board__frames > [data-studio-frame="${CSS.escape(frameId)}"]`);
  return element ? { frameId, element } : null;
}

const heightsOf = (element: HTMLElement) => new Map(Array.from(element.parentElement?.children ?? []).flatMap((child) => (child instanceof HTMLElement && child.dataset.studioFrame ? [[child.dataset.studioFrame, child.offsetHeight] as const] : [])));

/** The frame last copied with ⌘C (its page and element), while the system clipboard still holds its code. */
let clip: FrameClip | null = null;

export function useFrameKeys(localPage: string, text: string | undefined) {
  useEffect(() => {
    // ⌘C writes the clipboard in the copy event itself: the selected frame's code is read ahead.
    let ready: FrameClip | null = null;
    // Its Figma export, read ahead as well (the copy event takes only what is ready); null while it is read or failed.
    let readyFigma: { frameId: string; html: string } | null = null;
    let reading = 0;
    const prefetch = () => {
      const state = studioStore.getState();
      const frameId = state.localPage === localPage && state.selection?.kind === "frame" ? state.selection.frameId : null;
      const run = (reading += 1);
      readyFigma = null;
      if (!frameId) { ready = null; return; }
      void frameClip(localPage, frameId).then((next) => { if (run === reading) ready = next; });
      void frameFigmaClip(localPage, frameId).then((next) => { if (run === reading && "html" in next) readyFigma = { frameId, html: next.html }; });
    };
    prefetch();
    let selection = studioStore.getState().selection;
    const unsubscribe = studioStore.subscribe(() => {
      const next = studioStore.getState().selection;
      if (next !== selection) { selection = next; prefetch(); }
    });

    type Place = { x: number; y: number };
    let nudge: { frameId: string; element: HTMLElement; start: Place; place: Place; timer: number } | null = null;
    const settleNudge = () => {
      const done = nudge;
      nudge = null;
      if (!done) return;
      window.clearTimeout(done.timer);
      void moveFrames(localPage, new Map([[done.frameId, done.place]]), "Nudge frame").then((ok) => { if (!ok) dropLivePlace(done.frameId, done.element, done.start); });
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const mod = event.metaKey || event.ctrlKey;
      const arrow = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
      const duplicate = mod && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "d";
      if (!duplicate && !(arrow && !mod && !event.altKey)) return;
      const frame = selectedFrame(localPage, event.target);
      if (!frame) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (duplicate) {
        if (!event.repeat) void copyFrame(localPage, frame.frameId, null, { heights: heightsOf(frame.element) });
        return;
      }
      const step = event.shiftKey ? 10 : 1;
      if (nudge && nudge.frameId !== frame.frameId) settleNudge();
      const shown = { x: frame.element.offsetLeft, y: frame.element.offsetTop };
      const from = nudge?.place ?? livePlace(frame.frameId) ?? shown;
      const place = { x: from.x + arrow![0] * step, y: from.y + arrow![1] * step };
      showLivePlace(frame.frameId, frame.element, place);
      if (nudge) window.clearTimeout(nudge.timer);
      nudge = { frameId: frame.frameId, element: frame.element, start: nudge?.start ?? shown, place, timer: window.setTimeout(settleNudge, NUDGE_SETTLE_MS) };
    };

    const onCopy = (event: ClipboardEvent) => {
      const frame = selectedFrame(localPage, document.activeElement);
      if (!frame) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!ready || ready.frameId !== frame.frameId) {
        announceEditStatus({ kind: "error", message: "The frame is still being read — copy again", at: Date.now() });
        return;
      }
      clip = ready;
      event.clipboardData?.setData("text/plain", ready.code);
      const copied = "Copied frame — ⌘V pastes it here, on another page you made, on the Zen file's canvas or in the Zen plugin";
      if (readyFigma && readyFigma.frameId === frame.frameId) {
        event.clipboardData?.setData("text/html", readyFigma.html);
        announceEditStatus({ kind: "unchanged", message: copied, at: Date.now() });
        return;
      }
      // Its Figma export is still being read: the clipboard takes both once it is ready (the code is already there).
      const code = ready.code;
      const html = frameFigmaClip(localPage, frame.frameId).then((next) => ("html" in next ? next.html : Promise.reject(new Error(next.error))));
      announceEditStatus({ kind: "unchanged", message: "Copied frame — preparing it for Figma…", at: Date.now() });
      void writeFrameClip(code, html).then(
        () => announceEditStatus({ kind: "unchanged", message: "Copied frame — ⌘V in the Zen plugin places it; copy again for the Zen file's canvas", at: Date.now() }),
        (error: unknown) => announceEditStatus({ kind: "error", message: `Copied for the Studio only — not for Figma: ${error instanceof Error ? error.message : String(error)}`, at: Date.now() }),
      );
    };

    const onPaste = (event: ClipboardEvent) => {
      const state = studioStore.getState();
      if (!clip || state.localPage !== localPage || state.tool !== "select" || !canEdit(state)) return;
      if (isTypingTarget(document.activeElement)) return;
      // The system clipboard moved on (a layer or text copied since): the Studio's layer paste takes it.
      const text = event.clipboardData?.getData("text/plain") ?? "";
      if (text && text !== clip.code) { clip = null; return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      const from = clip;
      const here = from.page === localPage && document.querySelector(`.studio-builder-board__frames > [data-studio-frame="${CSS.escape(from.frameId)}"]`);
      const any = document.querySelector<HTMLElement>(".studio-builder-board__frames > [data-studio-frame]");
      void copyFrame(localPage, from.frameId, null, { label: "Paste frame", heights: any ? heightsOf(any) : undefined, ...(here ? {} : { source: from }) });
    };

    window.addEventListener("keydown", onKey, true);
    window.addEventListener("copy", onCopy, true);
    window.addEventListener("paste", onPaste, true);
    return () => {
      unsubscribe();
      settleNudge();
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("copy", onCopy, true);
      window.removeEventListener("paste", onPaste, true);
    };
    // The page's text: a frame edited since it was selected is read again for ⌘C.
  }, [localPage, text]);
}

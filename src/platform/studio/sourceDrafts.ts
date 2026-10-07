import { useSyncExternalStore } from "react";
import { plural } from "../../components/Text";
import { afterPendingEdits, announceEditStatus, emitWrite, forgetDraftHistory, forgetOwnWrites, studioApi, StudioApiError, subscribeStudioWrites } from "./api";
import { findFrame, getStudioFrames, subscribeStudioFrames } from "./board/frames";
import { flushInspectorDrafts } from "./inspector/drafts";
import { fiberOf, type Fiber } from "./select/picker";
import { studioStore } from "./store";
import type { DraftInfo, FrameDraft, SaveResult, SourceFile } from "./types";

/*
 * Admin drafts (spec: drafts until Save). The dev server keeps every Studio edit of a file as a draft (shown to every
 * browser on that server) until an admin saves it to disk or discards it. This module mirrors GET /drafts for the
 * toolbar's Unsaved · Save all and the code view's Draft badge, and runs Save and Discard. Refreshes: on mount,
 * after every edit/undo/redo, Vite update, Save, Discard, window focus, and every 10 s while drafts exist.
 * Per frame (2026-10-03): which canvas frames own which changes (POST /frame-drafts), and each frame's own Save and
 * Discard, which write or drop only that frame's changes. Save all and Discard all name the files they were shown,
 * so drafts another admin made meanwhile are never written or dropped unseen.
 */

export type StudioDrafts = {
  /** The server answers GET /drafts for this role. False (an older dev server, offline): no draft UI shows. */
  available: boolean;
  drafts: DraftInfo[];
  /** A Save or Discard is running. */
  busy: "save" | "discard" | null;
  /** Bumps whenever the list changes, so source views refetch the effective text. */
  revision: number;
};

const POLL_MS = 10_000;
/** Findings listed under the status line; the rest are counted. */
const MAX_DETAILS = 4;

let state: StudioDrafts = { available: false, drafts: [], busy: null, revision: 0 };
const listeners = new Set<() => void>();
let poll: number | undefined;

const fileName = (file: string) => file.slice(file.lastIndexOf("/") + 1);

function set(next: Partial<StudioDrafts>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
  schedulePoll();
}

function schedulePoll() {
  const wanted = listeners.size > 0 && state.drafts.length > 0 && typeof window !== "undefined";
  // A hidden tab does not poll; it refreshes when it shows again (visibilitychange below).
  if (wanted && poll === undefined) poll = window.setInterval(() => { if (!document.hidden) void refreshDrafts(); }, POLL_MS);
  if (!wanted && poll !== undefined) {
    window.clearInterval(poll);
    poll = undefined;
  }
}

const sameDrafts = (a: DraftInfo[], b: DraftInfo[]) =>
  a.length === b.length && a.every((row, index) => {
    const other = b[index];
    return row.file === other.file && row.baseHash === other.baseHash && row.diskHash === other.diskHash && row.stale === other.stale
      && row.updatedAt === other.updatedAt && row.changedLines.added === other.changedLines.added && row.changedLines.removed === other.changedLines.removed;
  });

let inflight: Promise<void> | null = null;
let again = false;

/** Reads GET /drafts now (a call made while one runs reads once more after it). */
export function refreshDrafts(): Promise<void> {
  if (inflight) {
    again = true;
    return inflight;
  }
  inflight = (async () => {
    do {
      again = false;
      const rows = await studioApi.drafts();
      const available = rows !== null;
      const drafts = (rows ?? []).slice().sort((a, b) => a.file.localeCompare(b.file));
      if (available !== state.available || !sameDrafts(drafts, state.drafts)) set({ available, drafts, revision: state.revision + 1 });
    } while (again);
  })().finally(() => { inflight = null; });
  return inflight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) void refreshDrafts();
  schedulePoll();
  return () => {
    listeners.delete(listener);
    schedulePoll();
  };
}

/** The admin drafts on this dev server (see StudioDrafts). */
export function useStudioDrafts(): StudioDrafts {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export const studioDrafts = { get: () => state };

/* ── refresh triggers ─────────────────────────────────────────────────────────────────────────────────────────────── */

if (typeof window !== "undefined") {
  let debounce: number | undefined;
  const soon = () => {
    if (!listeners.size) return;
    window.clearTimeout(debounce);
    debounce = window.setTimeout(() => { void refreshDrafts(); }, 150);
  };
  const onVisible = () => { if (document.visibilityState === "visible") soon(); };
  const unsubscribeWrites = subscribeStudioWrites(soon);
  let role = studioStore.getState().role;
  const unsubscribeRole = studioStore.subscribe(() => {
    const next = studioStore.getState().role;
    if (next !== role) {
      role = next;
      soon();
    }
  });
  window.addEventListener("focus", soon);
  document.addEventListener("visibilitychange", onVisible);
  const hot = import.meta.hot;
  hot?.on("vite:afterUpdate", soon);
  hot?.dispose(() => {
    unsubscribeWrites();
    unsubscribeRole();
    window.removeEventListener("focus", soon);
    document.removeEventListener("visibilitychange", onVisible);
    hot.off?.("vite:afterUpdate", soon);
    window.clearTimeout(debounce);
    if (poll !== undefined) window.clearInterval(poll);
  });
}

/* ── Save ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** "⚠ src/platform/examples/pages/button.tsx:84 rule — …" → "⚠ button.tsx:84 rule — …" (the footer is narrow). */
const shortPaths = (line: string) => line.replace(/(^|[\s(])(?:[\w.@-]+\/)+([\w.@-]+:\d+)/g, "$1$2");
const listMore = (lines: string[]) => (lines.length > MAX_DETAILS ? [...lines.slice(0, MAX_DETAILS), `…and ${lines.length - MAX_DETAILS} more`] : lines);

/**
 * The status line for a Save: "Saved 2 files · harness clean" ("Saved “Send an invoice” · …" for a frame), findings or
 * conflicts as detail lines.
 */
function reportSave(result: SaveResult, frameLabel?: string) {
  const at = Date.now();
  if (!result.ok) {
    announceEditStatus({ kind: "error", message: `Not saved: ${result.error}`, at });
    return;
  }
  const { saved, conflicts, harness } = result;
  const conflictLines = conflicts.map((entry) => `${fileName(entry.file)} kept as a draft: ${entry.reason}`);
  if (!saved.length && !conflicts.length) {
    announceEditStatus({ kind: "unchanged", message: "Nothing to save", at });
    return;
  }
  if (!saved.length) {
    announceEditStatus({ kind: "error", message: `Not saved · ${plural(conflicts.length, "conflict")} with the disk`, details: listMore(conflictLines), at });
    return;
  }
  const parts = [frameLabel ? `Saved “${frameLabel}”` : saved.length === 1 ? `Saved ${fileName(saved[0].file)}` : `Saved ${plural(saved.length, "file")}`];
  parts.push(harness.findings.length ? plural(harness.findings.length, "harness finding") : harness.ok ? "harness clean" : "harness failed");
  if (conflicts.length) parts.push(`${plural(conflicts.length, "conflict")} kept as draft`);
  const clean = harness.ok && !harness.findings.length && !conflicts.length;
  announceEditStatus({ kind: clean ? "saved" : "warning", message: parts.join(" · "), details: clean ? undefined : listMore([...conflictLines, ...harness.findings.map(shortPaths)]), at });
}

/**
 * Saves the drafts of `files` (every draft when omitted) after any edit still on its way (an inspector field typed
 * into is committed first), and reports the outcome in the status line.
 */
export function saveDrafts(files?: string[]): Promise<SaveResult> {
  flushInspectorDrafts();
  return afterPendingEdits(async () => {
    set({ busy: "save" });
    try {
      const result = await studioApi.save(files);
      reportSave(result);
      return result;
    } finally {
      set({ busy: null });
      await refreshDrafts();
    }
  });
}

/* ── Discard ──────────────────────────────────────────────────────────────────────────────────────────────────────── */

async function readSource(file: string): Promise<SourceFile | null> {
  try {
    return await studioApi.source(file);
  } catch (error) {
    if (!(error instanceof StudioApiError)) console.error("[zen-studio] cannot read", file, error);
    return null;
  }
}

/**
 * Drops the drafts of `files` (every draft when omitted): the files read from disk again, the canvas follows. The
 * undo records that made the dropped drafts are forgotten (older, saved edits stay undoable).
 */
export function discardDrafts(files?: string[]): Promise<boolean> {
  return afterPendingEdits(async () => {
    const targets = state.drafts.filter((row) => !files || files.includes(row.file));
    set({ busy: "discard" });
    try {
      // The draft texts, so the selection and the code marks can follow the revert like an undo.
      const before = await Promise.all(targets.map((row) => readSource(row.file)));
      const result = await studioApi.discard(files);
      if (!result.ok) {
        announceEditStatus({ kind: "error", message: `Not discarded: ${result.error}`, at: Date.now() });
        return false;
      }
      const dropped = new Set(result.discarded.length ? result.discarded : targets.map((row) => row.file));
      const after = await Promise.all(targets.map((row) => (dropped.has(row.file) ? readSource(row.file) : Promise.resolve(null))));
      targets.forEach((row, index) => {
        if (!dropped.has(row.file)) return;
        forgetDraftHistory(row.file, [row.diskHash, row.baseHash, after[index]?.hash ?? null]);
        const draft = before[index];
        const disk = after[index];
        if (draft && disk && draft.content !== disk.content) emitWrite({ file: row.file, before: draft.content, after: disk.content, kind: "undo" });
      });
      const count = dropped.size;
      const message = count === 1 ? `Discarded the draft of ${fileName([...dropped][0])}` : `Discarded ${plural(count, "draft")}`;
      announceEditStatus({ kind: "undone", message: count ? message : "Nothing to discard", at: Date.now() });
      return true;
    } finally {
      set({ busy: null });
      await refreshDrafts();
    }
  });
}

/* ── confirmations (mounted once: shell/DraftsDialogs) ────────────────────────────────────────────────────────────── */

/** A question the drafts dialog asks: discard these drafts, or save over files that changed on disk. */
export type DraftsQuestion =
  | { kind: "discard"; files: string[]; frame?: FrameRef }
  | { kind: "save-stale"; files: string[]; stale: string[]; frame?: FrameRef };

/** A canvas frame a question is about: its Save or Discard covers only its own changes. */
export type FrameRef = { id: string; label: string };

let question: DraftsQuestion | null = null;
const questionListeners = new Set<() => void>();

function setQuestion(next: DraftsQuestion | null) {
  question = next;
  questionListeners.forEach((listener) => listener());
}

export function useDraftsQuestion(): DraftsQuestion | null {
  return useSyncExternalStore(
    (listener) => { questionListeners.add(listener); return () => { questionListeners.delete(listener); }; },
    () => question,
    () => null,
  );
}

/** Asks before discarding `files` (null = every draft listed now: the ones the dialog names, nothing added meanwhile). */
export function confirmDiscard(files: string[] | null = null) {
  if (!state.drafts.length) return;
  setQuestion({ kind: "discard", files: files ?? state.drafts.map((row) => row.file) });
}

/**
 * ⌘S: saves at once, unless a draft to save is stale (the disk changed since it started), then it asks first. The
 * list is read again first, after any edit still on its way (a disk change made elsewhere reaches this page only
 * through the 10 s poll otherwise).
 */
export async function requestSave(files: string[] | null = null): Promise<void> {
  flushInspectorDrafts();
  await afterPendingEdits(() => refreshDrafts());
  if (!state.available) return;
  const targets = state.drafts.filter((row) => !files || files.includes(row.file));
  if (!targets.length) {
    announceEditStatus({ kind: "unchanged", message: "Nothing to save", at: Date.now() });
    return;
  }
  // The files listed now, by name: a draft another admin starts after this never rides along.
  const listed = targets.map((row) => row.file);
  const stale = targets.filter((row) => row.stale).map((row) => row.file);
  if (stale.length) setQuestion({ kind: "save-stale", files: listed, stale });
  else await saveDrafts(listed);
}

/** The dialog's answer. */
export function answerDraftsQuestion(confirmed: boolean) {
  const asked = question;
  setQuestion(null);
  if (!asked || !confirmed) return;
  if (asked.frame) {
    if (asked.kind === "discard") void discardFrame(asked.frame);
    else void saveFrame(asked.frame);
    return;
  }
  if (asked.kind === "discard") void discardDrafts(asked.files);
  else void saveDrafts(asked.files);
}

/* ── per frame ────────────────────────────────────────────────────────────────────────────────────────────────────── */

export type FrameDraftsState = {
  /** The server answers POST /frame-drafts (false: an older plugin; frames then show no Save or Discard). */
  available: boolean;
  /** Frame id → the draft changes it owns (frames without changes are missing or have changes: 0). */
  frames: Record<string, FrameDraft>;
  /** Changes no frame on this board owns (a file of another page, a shared helper): only Save all writes them. */
  outside: { changes: number; files: string[] };
};

let frameState: FrameDraftsState = { available: false, frames: {}, outside: { changes: 0, files: [] } };
const frameListeners = new Set<() => void>();

function setFrames(next: FrameDraftsState) {
  frameState = next;
  frameListeners.forEach((listener) => listener());
}

/** React elements a frame's walk reads at most (a page renders a few thousand). */
const MAX_FRAME_FIBERS = 40_000;

/**
 * The data-zen-src lines a frame renders ("src/…/button.tsx:84"), once each: its DOM's, and its React elements' (a Zen
 * component such as TopNavigation or Avatar does not pass the annotation on to the DOM; an overlay portals its content
 * out of the frame's DOM).
 */
export function frameLocs(element: HTMLElement): string[] {
  const seen = new Set<string>();
  const own = element.getAttribute("data-zen-src");
  const sources = own ? [own] : [];
  element.querySelectorAll("[data-zen-src]").forEach((node) => { sources.push(node.getAttribute("data-zen-src") ?? ""); });
  const stack: Array<Fiber | null> = [fiberOf(element)?.child ?? null];
  for (let count = 0; stack.length && count < MAX_FRAME_FIBERS; count += 1) {
    const fiber = stack.pop();
    if (!fiber) continue;
    const src = fiber.memoizedProps?.["data-zen-src"];
    if (typeof src === "string") sources.push(src);
    stack.push(fiber.sibling, fiber.child);
  }
  for (const source of sources) {
    // A builder page kept in this browser has no server drafts.
    if (source.startsWith("local:")) continue;
    const match = /^(.+?:\d+)(?::\d+)?$/.exec(source);
    if (match) seen.add(match[1]);
  }
  return [...seen];
}

let frameInflight: Promise<void> | null = null;
let frameAgain = false;

/** Asks the server which frames on the board own which changes (nothing to ask while no draft exists). */
export function refreshFrameDrafts(): Promise<void> {
  if (frameInflight) {
    frameAgain = true;
    return frameInflight;
  }
  frameInflight = (async () => {
    do {
      frameAgain = false;
      if (!state.available || !state.drafts.length) {
        if (Object.keys(frameState.frames).length || frameState.outside.changes) setFrames({ ...frameState, frames: {}, outside: { changes: 0, files: [] } });
        continue;
      }
      const frames = getStudioFrames().map((frame) => ({ id: frame.id, locs: frameLocs(frame.element) }));
      const reply = await studioApi.frameDrafts(frames);
      setFrames(reply ? { available: true, frames: reply.frames, outside: reply.outside } : { available: false, frames: {}, outside: { changes: 0, files: [] } });
    } while (frameAgain);
  })().finally(() => { frameInflight = null; });
  return frameInflight;
}

let frameDebounce: number | undefined;
/** After the drafts, the board or the rendered code changed (a re-render after HMR lands a little after Vite's event). */
const frameSoon = () => {
  if (!frameListeners.size || typeof window === "undefined") return;
  window.clearTimeout(frameDebounce);
  frameDebounce = window.setTimeout(() => { void refreshFrameDrafts(); }, 250);
};

let frameUnsubscribe: (() => void) | null = null;
function subscribeFrames(listener: () => void) {
  frameListeners.add(listener);
  if (frameListeners.size === 1) {
    // While a frame watches: the drafts list (it also keeps the drafts poll alive), the board and Vite updates.
    const offDrafts = subscribe(frameSoon);
    const offFrames = subscribeStudioFrames(frameSoon);
    const hot = import.meta.hot;
    hot?.on("vite:afterUpdate", frameSoon);
    frameUnsubscribe = () => { offDrafts(); offFrames(); hot?.off?.("vite:afterUpdate", frameSoon); window.clearTimeout(frameDebounce); };
    frameSoon();
  }
  return () => {
    frameListeners.delete(listener);
    if (!frameListeners.size) { frameUnsubscribe?.(); frameUnsubscribe = null; }
  };
}

/** Which frames own which draft changes (see FrameDraftsState). */
export function useFrameDrafts(): FrameDraftsState {
  return useSyncExternalStore(subscribeFrames, () => frameState, () => frameState);
}

/** A frame's Save: asks first when one of its files changed on disk since its draft started, else saves at once. */
export async function requestFrameSave(frame: FrameRef): Promise<void> {
  flushInspectorDrafts();
  await afterPendingEdits(() => refreshDrafts());
  await refreshFrameDrafts();
  const files = frameState.frames[frame.id]?.files ?? [];
  if (!files.length) {
    announceEditStatus({ kind: "unchanged", message: `Nothing to save in “${frame.label}”`, at: Date.now() });
    return;
  }
  const stale = state.drafts.filter((row) => row.stale && files.includes(row.file)).map((row) => row.file);
  if (stale.length) setQuestion({ kind: "save-stale", files, stale, frame });
  else await saveFrame(frame);
}

/** A frame's Discard asks first. */
export function confirmFrameDiscard(frame: FrameRef) {
  const files = frameState.frames[frame.id]?.files ?? [];
  if (files.length) setQuestion({ kind: "discard", files, frame });
}

/** Writes only the frame's changes (the server splits each draft at the frame), then runs the harness on the files. */
function saveFrame(frame: FrameRef): Promise<SaveResult | null> {
  flushInspectorDrafts();
  return afterPendingEdits(async () => {
    const target = findFrame(frame.id);
    if (!target) return null;
    set({ busy: "save" });
    try {
      const result = await studioApi.save(undefined, { locs: frameLocs(target.element) });
      reportSave(result, frame.label);
      return result;
    } finally {
      set({ busy: null });
      await refreshDrafts();
      void refreshFrameDrafts();
    }
  });
}

/** Drops only the frame's changes: its code reads from disk again, the other frames keep their drafts. */
function discardFrame(frame: FrameRef): Promise<boolean> {
  return afterPendingEdits(async () => {
    const target = findFrame(frame.id);
    const files = frameState.frames[frame.id]?.files ?? [];
    if (!target || !files.length) return false;
    set({ busy: "discard" });
    try {
      const before = await Promise.all(files.map(readSource));
      const result = await studioApi.discard(undefined, { locs: frameLocs(target.element) });
      if (!result.ok) {
        announceEditStatus({ kind: "error", message: `Not discarded: ${result.error}`, at: Date.now() });
        return false;
      }
      const after = await Promise.all(files.map((file) => (result.discarded.includes(file) ? readSource(file) : Promise.resolve(null))));
      // The selection and the code view follow, as after an undo. Undo records stay: the history never applies one
      // whose lines are gone.
      files.forEach((file, index) => {
        const draft = before[index];
        const now = after[index];
        // An edit read before the discard never rebases across it (api.ts rebased).
        if (result.discarded.includes(file)) forgetOwnWrites(file);
        if (draft && now && draft.content !== now.content) emitWrite({ file, before: draft.content, after: now.content, kind: "undo" });
      });
      announceEditStatus({ kind: "undone", message: result.discarded.length ? `Discarded the changes in “${frame.label}”` : "Nothing to discard", at: Date.now() });
      return true;
    } finally {
      set({ busy: null });
      await refreshDrafts();
      void refreshFrameDrafts();
    }
  });
}

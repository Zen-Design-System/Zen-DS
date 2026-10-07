import { useSyncExternalStore } from "react";

/*
 * Frame remounts. Fast Refresh keeps a component's state across an edit, so an edit of an initial state (a `defaultX`
 * twin, a useState initializer: inspector/writePlan.ts) would not show on the canvas until a reload. After such a write
 * the frame's content remounts once its hot update has landed, so it starts from the new initial state (user,
 * 2026-10-05: variant and boolean edits keep the component's behaviour, and the canvas shows them).
 */

const epochs = new Map<string, number>();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

/** The frame's remount count: StudioFrame keys its content with it. */
export const useFrameEpoch = (frameId: string) => useSyncExternalStore(subscribe, () => epochs.get(frameId) ?? 0);

/** Remounts the frame's content now (its examples start from their initial state). */
export function remountFrame(frameId: string) {
  epochs.set(frameId, (epochs.get(frameId) ?? 0) + 1);
  listeners.forEach((listener) => listener());
}

type HotPayload = { updates?: Array<{ path?: string; acceptedPath?: string }> };

/**
 * Remounts the frame once the hot update of `file` (repo-relative, e.g. src/platform/examples/pages/checkbox.tsx) has
 * been applied; after `fallbackMs` it remounts anyway (no hot update reached this page, or it was a full reload).
 */
export function remountFrameAfterUpdate(frameId: string, file: string, fallbackMs = 2000) {
  const hot = import.meta.hot;
  let done = false;
  let timer = 0;
  const fire = () => {
    if (done) return;
    done = true;
    hot?.off?.("vite:afterUpdate", onUpdate);
    window.clearTimeout(timer);
    remountFrame(frameId);
  };
  const onUpdate = (payload: HotPayload) => {
    if ((payload.updates ?? []).some((update) => [update.path, update.acceptedPath].some((path) => path?.endsWith(`/${file}`) || path === file))) fire();
  };
  hot?.on("vite:afterUpdate", onUpdate);
  timer = window.setTimeout(fire, fallbackMs);
}

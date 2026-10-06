import { useSyncExternalStore } from "react";

/*
 * "Change shared code?" (plan WP-B2): a structural edit (remove, duplicate, move, insert, paste, drag, several layers,
 * wrap) in code that examples share (PlatformDemoActions.tsx, chatDemo.tsx…) changes every place that uses it, like
 * Figma's "Edit main component". The server refuses it with code "confirm" until the person says yes; applyEdit asks
 * through this store (SharedConfirm renders the dialog) and sends it again. A yes holds for that file until the page
 * reloads, so a run of edits there asks once.
 */

export type SharedQuestion = { file: string; uses: number; users: string[] };

let pending: (SharedQuestion & { resolve: (ok: boolean) => void }) | null = null;
const confirmed = new Set<string>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

/** Whether the person already said yes for `file` (this page load). */
export const sharedConfirmed = (file: string) => confirmed.has(file);

/** Asks once (a second question while one is open answers no). Resolves true for "Change everywhere". */
export function askShared(question: SharedQuestion): Promise<boolean> {
  if (pending) return Promise.resolve(false);
  return new Promise((resolve) => {
    pending = { ...question, resolve };
    notify();
  });
}

export function answerShared(ok: boolean) {
  const current = pending;
  if (!current) return;
  pending = null;
  if (ok) confirmed.add(current.file);
  notify();
  current.resolve(ok);
}

/** The open question, or null. */
export const useSharedQuestion = () => useSyncExternalStore(subscribe, () => pending, () => null);

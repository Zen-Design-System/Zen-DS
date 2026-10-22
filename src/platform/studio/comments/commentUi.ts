import { useSyncExternalStore } from "react";
import type { CommentAnchor } from "../../../../tools/studio/page-comments.mjs";

/*
 * What comment mode shows (CommentsLayer.tsx on the canvas, CommentsPanel.tsx in the right panel): the thread open in
 * its popover, a new pin waiting for its first comment, and whether resolved threads show (Figma's "Show resolved
 * comments"). One store, so a click in the panel opens the pin on the canvas and the other way round.
 */

export type CommentUi = { open: string | null; draft: CommentAnchor | null; showResolved: boolean };

let state: CommentUi = { open: null, draft: null, showResolved: false };
const listeners = new Set<() => void>();

export const commentUi = {
  get: () => state,
  set(next: Partial<CommentUi>) {
    state = { ...state, ...next };
    listeners.forEach((listener) => listener());
  },
};

export const useCommentUi = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => state, () => state);

import { useEffect, useRef } from "react";
import { sameSelectedElement } from "../select/remap";
import { studioStore } from "../store";

/*
 * Inspector text and number fields commit on Enter and on blur. A press on the canvas changes the selection (and
 * unmounts the field) before the browser moves focus, so blur never comes: every field with an uncommitted draft
 * registers here, and the drafts are committed when the selection, the inspector tab or the page changes — while the
 * old panel still holds the element it showed.
 */

const pending = new Set<() => void>();

/** Commits every uncommitted inspector draft now. */
export function flushInspectorDrafts() {
  [...pending].forEach((commit) => commit());
}

/** Registers `commit` (read through a ref, so it always sees the latest draft) for as long as the field is mounted. */
export function usePendingDraft(commit: () => void) {
  const ref = useRef(commit);
  ref.current = commit;
  useEffect(() => {
    const entry = () => ref.current();
    pending.add(entry);
    return () => { pending.delete(entry); };
  }, []);
}

let last = studioStore.getState();
const unsubscribe = studioStore.subscribe(() => {
  const state = studioStore.getState();
  const moved = state.selection !== last.selection && !sameSelectedElement(last.selection, state.selection);
  const changed = moved || state.inspectorTab !== last.inspectorTab || state.page !== last.page || state.collection !== last.collection;
  last = state;
  if (changed) flushInspectorDrafts();
});
import.meta.hot?.dispose(unsubscribe);

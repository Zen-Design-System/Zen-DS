import { useMemo, type Ref, type RefCallback, type RefObject } from "react";

/**
 * One callback ref that feeds several refs (Radix `composeRefs`, Base UI `useMergedRefs`). It returns a React 19 ref
 * cleanup, so callback refs that return their own cleanup keep it, and object refs are reset to null on detach.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  return (node) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === "function") {
        const cleanup = ref(node);
        return typeof cleanup === "function" ? cleanup : () => ref(null);
      }
      if (ref) {
        (ref as RefObject<T | null>).current = node;
        return () => { (ref as RefObject<T | null>).current = null; };
      }
      return undefined;
    });
    return () => cleanups.forEach((cleanup) => cleanup?.());
  };
}

/** `mergeRefs` with a stable identity while the refs stay the same, so React does not detach and re-attach on render. */
export function useMergedRefs<T>(...refs: Array<Ref<T> | undefined>): RefCallback<T> {
  // The refs themselves are the dependencies (their count is fixed per call site).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => mergeRefs(...refs), refs);
}

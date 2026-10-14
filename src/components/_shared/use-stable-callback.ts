import { useCallback, useInsertionEffect, useRef } from "react";

/**
 * A function with a stable identity that always calls the latest `callback` (Base UI `useStableCallback`, Radix
 * `useCallbackRef`). Use it for consumer handlers read inside effects or listeners, so a new inline handler on every parent
 * render neither re-runs the effect nor needs an exhaustive-deps exception. The ref is updated in an insertion effect, never
 * during render (React's rules), so call the result from events and effects, not while rendering.
 */
export function useStableCallback<Args extends unknown[], Result>(callback: ((...args: Args) => Result) | undefined): (...args: Args) => Result | undefined {
  const latest = useRef(callback);
  useInsertionEffect(() => {
    latest.current = callback;
  });
  return useCallback((...args: Args) => latest.current?.(...args), []);
}

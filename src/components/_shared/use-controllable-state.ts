import { useCallback, useEffect, useInsertionEffect, useRef, useState } from "react";
import { isDev } from "./dev";
import { useStableCallback } from "./use-stable-callback";

export interface ControllableStateOptions<T> {
  /** The controlled value. `undefined` means uncontrolled; `null` is a controlled "nothing selected". */
  value: T | undefined;
  /** The starting value while uncontrolled. */
  defaultValue: T | (() => T);
  /** Called with the next value when it changes (not when the same value is set again). */
  onChange?: (value: T) => void;
  /** Component and prop for the dev warning, e.g. "Tabs value". */
  name?: string;
}

/**
 * One controlled/uncontrolled state for every value control (Radix `useControllableState`, Base UI `useControlled`,
 * React Stately `useControlledState`). The prop wins whenever it is defined; otherwise the component keeps its own state.
 * `setValue` notifies `onChange` only on a real change, and in development a switch between controlled and uncontrolled
 * after mount is reported once, as React does for native inputs.
 */
export function useControllableState<T>({ value, defaultValue, onChange, name = "component" }: ControllableStateOptions<T>): [T, (next: T | ((previous: T) => T)) => void] {
  const [internal, setInternal] = useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? (value as T) : internal;
  const latest = useRef(current);
  useInsertionEffect(() => {
    latest.current = current;
  });
  const notify = useStableCallback(onChange);

  const wasControlled = useRef(controlled);
  useEffect(() => {
    if (isDev() && wasControlled.current !== controlled) {
      console.warn(`Zen DS: ${name} switched from ${wasControlled.current ? "controlled" : "uncontrolled"} to ${controlled ? "controlled" : "uncontrolled"}. Keep the prop defined (use null for "none") or leave it out for the component's lifetime.`);
    }
    wasControlled.current = controlled;
  }, [controlled, name]);

  const setValue = useCallback((next: T | ((previous: T) => T)) => {
    const resolved = typeof next === "function" ? (next as (previous: T) => T)(latest.current) : next;
    if (Object.is(resolved, latest.current)) return;
    // Uncontrolled: remember it now so a second call in the same event builds on it. Controlled: the parent decides,
    // so the next comparison is against the prop it renders, not against a value it may have refused.
    if (!controlled) { latest.current = resolved; setInternal(() => resolved); }
    notify(resolved);
  }, [controlled, notify]);

  return [current, setValue];
}

import { useEffect, useState } from "react";

/*
 * A double-click on canvas text that cannot be edited in place asks the Inspector for its text field
 * (`zen-studio:focus-content`, edit/textEdit.ts): the Design panel's Content field, or a selected data item's label (a
 * Sidebar row, whose text comes from a nested list). The panel may mount a moment later: a request stays valid 2 s.
 */
let focusRequestedAt = 0;
const focusListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  const onFocusRequest = () => {
    focusRequestedAt = Date.now();
    focusListeners.forEach((listener) => listener());
  };
  window.addEventListener("zen-studio:focus-content", onFocusRequest);
  import.meta.hot?.dispose(() => window.removeEventListener("zen-studio:focus-content", onFocusRequest));
}

/** A token that changes on each request (TextControl `autoFocusToken`), 0 once used. */
export function useFocusContentToken() {
  const [token, setToken] = useState(() => (Date.now() - focusRequestedAt < 2000 ? Date.now() : 0));
  useEffect(() => {
    const listener = () => setToken(Date.now());
    focusListeners.add(listener);
    return () => { focusListeners.delete(listener); };
  }, []);
  useEffect(() => {
    if (!token) return undefined;
    focusRequestedAt = 0;
    const timer = window.setTimeout(() => setToken(0), 1500);
    return () => window.clearTimeout(timer);
  }, [token]);
  return token;
}

import { useEffect } from "react";
import { announceEditStatus } from "../api";
import { isTypingTarget } from "../select/picker";
import { studioStore } from "../store";
import { VIEW_OPTION_NAMES, viewOptions, type ViewOption } from "./viewOptions";

/*
 * Figma's View keys (Studio parity F10): ⌘' Pixel grid, ⌘Y Outlines (the Mac's; Ctrl+Y redoes elsewhere), ⇧R Rulers,
 * ⌃G Layout guides (Ctrl+Alt+G elsewhere, as Figma writes it). Each turns its view on or off and says so on the status
 * line; a text field keeps its keys (a letter or ⇧R types), the browser never gets ⌘Y (History) or ⌃G.
 */

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** The View option `event` toggles, or null. */
export function viewOptionFor(event: Pick<KeyboardEvent, "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey">, mac = isMac): ViewOption | null {
  const mod = mac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
  if (event.code === "Quote" && mod && !event.altKey && !event.shiftKey) return "pixelGrid";
  if (event.code === "KeyY" && mac && event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey) return "outlines";
  if (event.code === "KeyR" && event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey) return "rulers";
  const layoutGuides = mac ? event.ctrlKey && !event.metaKey && !event.altKey : event.ctrlKey && event.altKey && !event.metaKey;
  if (event.code === "KeyG" && layoutGuides && !event.shiftKey) return "layoutGuides";
  return null;
}

/** Turns a View option on or off and says which way. */
export function toggleViewOption(name: ViewOption) {
  const on = viewOptions.toggle(name);
  announceEditStatus({ kind: "unchanged", message: `${VIEW_OPTION_NAMES[name]} ${on ? "on" : "off"}`, at: Date.now() });
}

export function useViewKeys() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || event.repeat) return;
      const name = viewOptionFor(event);
      if (!name) return;
      const target = event.target instanceof Element ? event.target : null;
      const typing = isTypingTarget(target) || Boolean(target?.closest("input, textarea, [contenteditable]:not([contenteditable='false'])"));
      if (typing && name === "rulers") return;
      if (studioStore.getState().presenting) return;
      if (target?.closest("[role='dialog'], [role='menu'], [role='listbox']") && name === "rulers") return;
      event.preventDefault();
      toggleViewOption(name);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}

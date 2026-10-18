import { useEffect } from "react";
import { announceEditStatus } from "../api";
import { isTypingTarget } from "../select/picker";
import { studioStore } from "../store";

/*
 * Figma keys Zen Studio has no feature for yet (plan docs/research/studio-figma-design-parity-2026-10-18.md, F0): each
 * says so on the status line, in Figma's words, instead of doing nothing or running the browser's own command (⌘R
 * reloads the tab, ⌘G finds the next match, ⌘Y opens History, ⌘E, ⇧⌘C…). A phase that builds a feature takes its key
 * out of this list. Letters without ⌘ apply on a page you made, with the canvas in focus and the Move tool.
 */

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

type Keys = { mod?: boolean; shift?: boolean; alt?: boolean; ctrl?: boolean };
type NotYet = { code: string; keys: Keys; name: string; macOnly?: boolean };

/**
 * Figma's key → its feature name (help.figma.com words). `mod` is ⌘ (Ctrl elsewhere); `ctrl` is the Mac Control key,
 * which Figma writes as Ctrl+Alt elsewhere.
 */
export const FIGMA_NOT_YET: readonly NotYet[] = [
  { code: "KeyG", keys: { mod: true }, name: "Group selection" },
  { code: "KeyG", keys: { mod: true, shift: true }, name: "Ungroup" },
  { code: "KeyE", keys: { mod: true }, name: "Flatten" },
  { code: "KeyO", keys: { mod: true, alt: true }, name: "Outline stroke" },
  { code: "KeyM", keys: { mod: true, ctrl: true }, name: "Use as mask" },
  { code: "KeyA", keys: { mod: true, alt: true }, name: "Select matching layers" },
  // Ctrl+Y redoes elsewhere: Outline view is the Mac's ⌘Y only.
  { code: "KeyY", keys: { mod: true }, name: "Outline view", macOnly: true },
  { code: "KeyC", keys: { mod: true, shift: true }, name: "Copy as PNG" },
  { code: "KeyT", keys: { ctrl: true, alt: true }, name: "Tidy up" },
  { code: "KeyH", keys: { ctrl: true, alt: true }, name: "Distribute horizontal spacing" },
  { code: "KeyV", keys: { ctrl: true, alt: true }, name: "Distribute vertical spacing" },
  { code: "KeyG", keys: { ctrl: true }, name: "Layout guides", macOnly: true },
  { code: "KeyR", keys: { shift: true }, name: "Rulers" },
  { code: "KeyS", keys: { shift: true }, name: "Section" },
  { code: "KeyP", keys: { shift: true }, name: "Pencil" },
  { code: "KeyH", keys: { shift: true }, name: "Flip horizontal" },
  { code: "KeyV", keys: { shift: true }, name: "Flip vertical" },
  { code: "KeyN", keys: { shift: true }, name: "Previous frame" },
  { code: "KeyK", keys: {}, name: "Scale" },
  { code: "KeyS", keys: {}, name: "Slice" },
  { code: "KeyP", keys: {}, name: "Pen" },
  { code: "KeyC", keys: {}, name: "Comment" },
  { code: "KeyI", keys: {}, name: "Pick color" },
  { code: "KeyN", keys: {}, name: "Next frame" },
];

/** Whether the modifiers of `event` are exactly `keys` on this platform. */
function matches(event: KeyboardEvent, entry: NotYet): boolean {
  const { keys } = entry;
  if (isMac) {
    return event.metaKey === Boolean(keys.mod) && event.ctrlKey === Boolean(keys.ctrl) && event.altKey === Boolean(keys.alt) && event.shiftKey === Boolean(keys.shift);
  }
  if (entry.macOnly) return false;
  return event.ctrlKey === Boolean(keys.mod || keys.ctrl) && event.altKey === Boolean(keys.alt || keys.ctrl) && event.shiftKey === Boolean(keys.shift) && !event.metaKey;
}

/** The Figma feature `event` asks for that Zen Studio does not have yet, or null. */
export function figmaNotYet(event: KeyboardEvent): string | null {
  return FIGMA_NOT_YET.find((entry) => entry.code === event.code && matches(event, entry))?.name ?? null;
}

/** The browser commands a Figma chord would run here: always kept from the browser, a field in focus or not. */
const BROWSER_CHORDS = new Set(["KeyR", "KeyG", "KeyY", "KeyE"]);

/** Says on the status line that Zen Studio does not have `name` yet. */
export const sayNotYet = (name: string) => announceEditStatus({ kind: "unchanged", message: `${name} isn't in Zen Studio yet`, at: Date.now() });

export function useFigmaNotYet() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const name = figmaNotYet(event);
      if (!name) return;
      const state = studioStore.getState();
      const target = event.target instanceof Element ? event.target : null;
      const chord = event.metaKey || event.ctrlKey || event.altKey;
      const typing = isTypingTarget(target) || Boolean(target?.closest("input, textarea, [contenteditable]:not([contenteditable='false'])"));
      // In a text field a letter is text; a chord that would reload or browse is still kept from the browser.
      if (typing) { if (chord && BROWSER_CHORDS.has(event.code) && (event.metaKey || event.ctrlKey)) event.preventDefault(); return; }
      if (state.presenting || state.tool === "interact") return;
      if (!chord && !event.shiftKey && (!state.localPage || state.tool !== "select")) return;
      if (!chord && event.shiftKey && !state.localPage) return;
      if (target?.closest("[role='dialog'], [role='menu'], [role='listbox']")) return;
      event.preventDefault();
      if (!event.repeat) sayNotYet(name);
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, []);
}

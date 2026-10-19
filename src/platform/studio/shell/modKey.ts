const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** The modifier key as the shortcut labels write it: ⌘ on Apple devices, Ctrl+ elsewhere. */
export const modKey = isMac ? "⌘" : "Ctrl+";
/** Present the selected frame (Figma's ⌥⌘↵; it was F until 2026-10-15, now the Frame tool): the label, and the keys as
 *  aria-keyshortcuts names them. */
export const presentShortcut = isMac ? "⌥⌘↵" : "Ctrl+Alt+Enter";
export const presentKeys = isMac ? "Alt+Meta+Enter" : "Control+Alt+Enter";
/** Figma's Use as mask: ⌃⌘M on a Mac, Ctrl+Alt+M elsewhere (edit/groupLayers.ts maskSelection). */
export const maskShortcut = isMac ? "⌃⌘M" : "Ctrl+Alt+M";
/** Whether `event` is Use as mask's key on this platform. */
export const isMaskKey = (event: KeyboardEvent) => event.code === "KeyM" && !event.shiftKey && (isMac ? event.metaKey && event.ctrlKey && !event.altKey : event.ctrlKey && event.altKey && !event.metaKey);

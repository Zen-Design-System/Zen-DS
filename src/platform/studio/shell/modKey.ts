const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/** The modifier key as the shortcut labels write it: ⌘ on Apple devices, Ctrl+ elsewhere. */
export const modKey = isMac ? "⌘" : "Ctrl+";

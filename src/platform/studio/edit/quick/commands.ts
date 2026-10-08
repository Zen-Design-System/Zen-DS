import { redoEdit, undoEdit } from "../../api";
import { presentFrame } from "../../board/presentFrame";
import { canvasApi, zoomIn, zoomOut } from "../../canvas/viewport";
import { modKey } from "../../shell/modKey";
import { detachSelection, detachShortcut, offersDetach } from "../../inspector/detach";
import { autoLayoutShortcut, frameSelectionShortcut, wrapCheck, wrapSelection } from "../../select/wrapSelection";
import { openShortcuts } from "../../shell/shortcutsOpen";
import { toggleSidePanels } from "../../shell/layout";
import { duplicateSelection, duplicateShortcut, removeSelection, removeShortcut } from "../../slots/actions";
import { toggleStudioTheme } from "../../shell/modes";
import { requestSave } from "../../sourceDrafts";
import { canEdit, studioStore } from "../../store";
import type { StudioSelection } from "../../types";
import { stepLayer, type NodeSelection } from "../arrange";
import { clipboardActions, clipboardShortcuts } from "../clipboard";
import { duplicateLayers, removeLayers } from "../multi";
import { toggleIgnoreAutoLayout } from "../ignoreAutoLayout";
import { multiSelection } from "../../select/multiSelection";
import { startTextEditOnSelection } from "../textEdit";

/*
 * Every Studio action for Quick actions (⌘/, Figma's), with its shortcut and, when it cannot run now, why. Actions
 * that live in other modules' key handlers (page search, Tab / ⇧Enter, zoom to selection) are run by sending their
 * key to the canvas.
 */

export type Command = { id: string; label: string; group: string; shortcut?: string; keywords?: string; disabled?: string; run: () => void };

/** Sends a key to the canvas, as the keyboard would (after the palette has given the focus back to it). */
function press(init: KeyboardEventInit) {
  const viewport = canvasApi.getViewportElement();
  viewport?.focus({ preventScroll: true });
  (viewport ?? window).dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
}

export function commands(): Command[] {
  const state = studioStore.getState();
  const selection: StudioSelection | null = state.selection;
  const node = selection?.kind === "node" && !selection.part ? (selection as NodeSelection) : null;
  const layerOff = node ? undefined : "Select a layer first";
  const editOff = !canEdit(state) ? (state.role === "admin" ? "Editing needs the Studio dev server" : "View only — switch to Admin to edit") : layerOff;
  const frameId = selection?.kind === "frame" ? selection.frameId : selection?.frameId ?? null;
  const wrap = node ? wrapCheck() : null;
  const list: Command[] = [
    { id: "tool-select", group: "Tools", label: "Select tool", shortcut: "V", run: () => studioStore.setState({ tool: "select" }) },
    { id: "tool-hand", group: "Tools", label: "Hand tool", shortcut: "H", keywords: "pan", run: () => studioStore.setState({ tool: "hand" }) },
    { id: "tool-interact", group: "Tools", label: "Interact (use the examples)", shortcut: "I", keywords: "preview play", run: () => studioStore.setState({ tool: "interact" }) },
    { id: "edit-text", group: "Edit", label: "Edit text", shortcut: "Enter", keywords: "type content copy", disabled: editOff, run: () => { if (!startTextEditOnSelection()) press({ key: "Enter", code: "Enter" }); } },
    { id: "copy", group: "Edit", label: "Copy", shortcut: clipboardShortcuts.copy, disabled: layerOff, run: () => { if (node) void clipboardActions.copy(node); } },
    { id: "cut", group: "Edit", label: "Cut", shortcut: clipboardShortcuts.cut, disabled: editOff, run: () => { if (node) void clipboardActions.cut(node); } },
    { id: "paste", group: "Edit", label: "Paste", shortcut: clipboardShortcuts.paste, disabled: editOff, run: () => { if (node) void clipboardActions.paste(node); } },
    { id: "paste-replace", group: "Edit", label: "Paste to replace", shortcut: clipboardShortcuts.replace, disabled: editOff, run: () => { if (node) void clipboardActions.replace(node); } },
    { id: "copy-props", group: "Edit", label: "Copy properties", shortcut: clipboardShortcuts.copyProps, keywords: "style", disabled: layerOff, run: () => { if (node) void clipboardActions.copyProperties(node); } },
    { id: "paste-props", group: "Edit", label: "Paste properties", shortcut: clipboardShortcuts.pasteProps, keywords: "style", disabled: editOff ?? (clipboardActions.hasProperties() ? undefined : "Copy properties first"), run: () => { if (node) void clipboardActions.pasteProperties(node); } },
    { id: "duplicate", group: "Edit", label: "Duplicate", shortcut: duplicateShortcut, disabled: editOff, run: () => { if (multiSelection.get().length) void duplicateLayers(); else if (node) void duplicateSelection(node); } },
    { id: "remove", group: "Edit", label: "Remove", shortcut: removeShortcut, keywords: "delete", disabled: editOff, run: () => { if (multiSelection.get().length) void removeLayers(); else if (node) void removeSelection(node); } },
    { id: "move-up", group: "Edit", label: "Move earlier", shortcut: "↑ ←", keywords: "reorder up left", disabled: editOff, run: () => { if (node) void stepLayer(node, "prev"); } },
    { id: "move-down", group: "Edit", label: "Move later", shortcut: "↓ →", keywords: "reorder down right", disabled: editOff, run: () => { if (node) void stepLayer(node, "next"); } },
    { id: "wrap-stack", group: "Edit", label: "Wrap in Stack (auto layout)", shortcut: autoLayoutShortcut, keywords: "group container", disabled: editOff ?? (wrap && !wrap.ok ? wrap.reason : undefined), run: () => { void wrapSelection("stack"); } },
    { id: "wrap-box", group: "Edit", label: "Wrap in Box (frame)", shortcut: frameSelectionShortcut, keywords: "group container", disabled: editOff ?? (wrap && !wrap.ok ? wrap.reason : undefined), run: () => { void wrapSelection("box"); } },
    // The Design tab's Position toggle, for one layer or several (edit/ignoreAutoLayout.ts): floating on, or back in the flow.
    { id: "ignore-auto-layout", group: "Edit", label: "Ignore auto layout (float) / back in auto layout", keywords: "absolute position float constraints", disabled: editOff, run: () => { void toggleIgnoreAutoLayout(); } },
    { id: "detach", group: "Edit", label: "Detach instance", shortcut: detachShortcut, disabled: editOff ?? (node && !offersDetach(node.name) ? `${node.name} is not a component instance` : undefined), run: () => { if (node) void detachSelection(node); } },
    { id: "undo", group: "Edit", label: "Undo", shortcut: `${modKey}Z`, disabled: state.undo.length ? undefined : "Nothing to undo", run: () => { void undoEdit(); } },
    { id: "redo", group: "Edit", label: "Redo", shortcut: `⇧${modKey}Z`, disabled: state.redo.length ? undefined : "Nothing to redo", run: () => { void redoEdit(); } },
    { id: "save", group: "Edit", label: "Save all drafts", shortcut: `${modKey}S`, disabled: canEdit(state) ? undefined : "Editing needs the Studio dev server", run: () => { void requestSave(); } },
    { id: "select-parent", group: "Selection", label: "Select parent", shortcut: "⇧Enter", disabled: selection?.kind === "node" ? undefined : "Select a layer first", run: () => press({ key: "Enter", code: "Enter", shiftKey: true }) },
    { id: "select-child", group: "Selection", label: "Select first child", shortcut: "Enter", disabled: layerOff, run: () => press({ key: "Enter", code: "Enter" }) },
    { id: "select-next", group: "Selection", label: "Select next sibling", shortcut: "Tab", disabled: layerOff, run: () => press({ key: "Tab", code: "Tab" }) },
    { id: "select-prev", group: "Selection", label: "Select previous sibling", shortcut: "⇧Tab", disabled: layerOff, run: () => press({ key: "Tab", code: "Tab", shiftKey: true }) },
    { id: "deselect", group: "Selection", label: "Deselect", shortcut: "Esc", disabled: selection ? undefined : "Nothing is selected", run: () => studioStore.setState({ selection: null }) },
    { id: "zoom-in", group: "View", label: "Zoom in", shortcut: `${modKey}+`, run: zoomIn },
    { id: "zoom-out", group: "View", label: "Zoom out", shortcut: `${modKey}−`, run: zoomOut },
    { id: "zoom-100", group: "View", label: "Zoom to 100%", shortcut: "⇧0", run: () => canvasApi.setZoom(1) },
    { id: "zoom-fit", group: "View", label: "Zoom to fit", shortcut: "⇧1", run: () => canvasApi.fit() },
    { id: "zoom-selection", group: "View", label: "Zoom to selection", shortcut: "⇧2", disabled: selection ? undefined : "Select a layer or frame first", run: () => press({ key: "@", code: "Digit2", shiftKey: true }) },
    { id: "present", group: "View", label: "Present the frame", shortcut: "F", keywords: "full screen", disabled: frameId ? undefined : "Select a frame or a layer in one", run: () => { if (frameId) presentFrame(frameId); } },
    { id: "panels", group: "View", label: "Show / hide the side panels", shortcut: `${modKey}\\`, keywords: "ui", run: toggleSidePanels },
    { id: "theme", group: "View", label: state.chromeTheme === "dark" ? "Light mode" : "Dark mode", keywords: "theme dark light interface canvas mode", run: toggleStudioTheme },
    { id: "pages", group: "Panels", label: "Show Pages", run: () => studioStore.setState({ leftTab: "pages" }) },
    { id: "layers", group: "Panels", label: "Show Layers", run: () => studioStore.setState({ leftTab: "layers" }) },
    { id: "assets", group: "Panels", label: "Show Assets", keywords: "components insert add", run: () => studioStore.setState({ leftTab: "assets" }) },
    { id: "design", group: "Panels", label: "Show Design", keywords: "inspector properties", run: () => studioStore.setState({ inspectorTab: "design" }) },
    { id: "code", group: "Panels", label: "Show Code", keywords: "source", run: () => studioStore.setState({ inspectorTab: "code" }) },
    { id: "search-pages", group: "Navigate", label: "Search pages", shortcut: `${modKey}K`, keywords: "go to open", run: () => press({ key: "k", code: "KeyK", metaKey: navigator.platform.includes("Mac"), ctrlKey: !navigator.platform.includes("Mac") }) },
    { id: "shortcuts", group: "Navigate", label: "Keyboard shortcuts", shortcut: "?", keywords: "help keys", run: openShortcuts },
  ];
  return list;
}

/** Commands whose label, group or keywords hold every word of `query`. */
export function searchCommands(list: readonly Command[], query: string): Command[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...list];
  return list.filter((command) => {
    const text = `${command.label} ${command.group} ${command.keywords ?? ""}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}

import { redoEdit, undoEdit } from "../../api";
import { openFind } from "../FindPanel";
import { toggleViewOption } from "../../canvas/viewKeys";
import { presentFrame } from "../../board/presentFrame";
import { canvasApi, zoomIn, zoomOut } from "../../canvas/viewport";
import { maskShortcut, modKey, presentShortcut } from "../../shell/modKey";
import { detachSelection, detachShortcut, offersDetach } from "../../inspector/detach";
import { autoLayoutShortcut, frameSelectionShortcut, wrapCheck, wrapSelection } from "../../select/wrapSelection";
import { openShortcuts } from "../../shell/shortcutsOpen";
import { openVariables } from "../../variables/variablesState";
import { toggleSidePanels } from "../../shell/layout";
import { duplicateSelection, duplicateShortcut, removeSelection, removeShortcut } from "../../slots/actions";
import { toggleStudioTheme } from "../../shell/modes";
import { requestSave } from "../../sourceDrafts";
import { canEdit, studioStore } from "../../store";
import type { StudioSelection } from "../../types";
import { stepLayer, type NodeSelection } from "../arrange";
import { clipboardActions, clipboardShortcuts } from "../clipboard";
import { copyAsPng, copyAsPngShortcut, copyAsSvg } from "../copyAs";
import type { SameKind } from "../matchModel";
import { SAME_LABELS, selectAllWithSame, selectMatchingLayers, selectMatchingShortcut } from "../selectMatching";
import { duplicateLayers, removeLayers, stepLayers } from "../multi";
import { toggleIgnoreAutoLayout } from "../ignoreAutoLayout";
import { multiSelection, selectedLayers } from "../../select/multiSelection";
import { selectedFrames } from "../../select/frameSelection";
import { COLLAPSE_LAYERS_EVENT } from "../../select/layerMeta";
import { isSelectionLocked, lockShortcut, toggleLockSelection } from "../lock";
import { renameShortcut, startRename } from "../rename";
import { startTextEditOnSelection } from "../textEdit";
import { stepFrame } from "../../board/frameOrder";
import { wrapInSection } from "../../builder/proto/addFrame";
import { combineAsVariants, createComponentOfLayers, createComponents } from "../localComponents";
import { booleanSelection, flattenSelection, outlineStrokeSelection } from "../pathOps";
import { maskSelection } from "../groupLayers";
import { addAutoLayoutToSelection, isAutoLayoutFrame, isFrameWithoutAutoLayout, removeAutoLayoutFromSelection, removeAutoLayoutShortcut } from "../autoLayout";
import { startPickColor } from "../pickColor";

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
  const pictureOff = node || selection?.kind === "frame" ? undefined : "Select a layer or a frame first";
  const editOff = !canEdit(state) ? (state.role === "admin" ? "Can't edit right now" : "View only") : layerOff;
  const frameId = selection?.kind === "frame" ? selection.frameId : selection?.frameId ?? null;
  const wrap = node ? wrapCheck() : null;
  const list: Command[] = [
    { id: "tool-select", group: "Tools", label: "Move", shortcut: "V", keywords: "select", run: () => studioStore.setState({ tool: "select" }) },
    { id: "tool-hand", group: "Tools", label: "Hand", shortcut: "H", keywords: "pan", run: () => studioStore.setState({ tool: "hand" }) },
    // Figma's Frame and Section tools (F4), on a page you made.
    { id: "tool-frame", group: "Tools", label: "Frame", shortcut: "F", keywords: "screen artboard preset device", disabled: state.localPage ? undefined : "Frame works on a page you made", run: () => studioStore.setState({ tool: "frame" }) },
    { id: "tool-section", group: "Tools", label: "Section", shortcut: "⇧S", keywords: "group area board", disabled: state.localPage ? undefined : "Section works on a page you made", run: () => studioStore.setState({ tool: "section" }) },
    { id: "tool-slice", group: "Tools", label: "Slice", shortcut: "S", keywords: "export area picture png", disabled: state.localPage ? undefined : "Slice works on a page you made", run: () => studioStore.setState({ tool: "slice" }) },
    { id: "wrap-section", group: "Edit", label: "Wrap in new section", keywords: "section group frames", disabled: !state.localPage || !frameId || !/^(screen|overlay):/.test(frameId) || selection?.kind !== "frame" ? "Select a frame on a page you made" : !canEdit(state) ? "View only" : undefined, run: () => { if (state.localPage && frameId) void wrapInSection(state.localPage, selectedFrames().length ? selectedFrames() : [frameId]); } },
    // Zen's own tool (Figma has none): try the components where they are drawn, an Overlay frame's form included. On a
    // page you made it is here only (no toolbar button; I is Figma's Pick color there).
    // Figma's Pick color (I), on a page you made: the selected layers' fill from a colour on the canvas (edit/pickColor.ts).
    { id: "pick-color", group: "Tools", label: "Pick color", shortcut: state.localPage ? "I" : undefined, keywords: "eyedropper dropper sample colour fill", disabled: !state.localPage ? "Works on a page you made" : editOff, run: () => { startPickColor(); } },
    { id: "tool-interact", group: "Tools", label: "Interact", shortcut: state.localPage ? undefined : "I", keywords: "preview play use try examples components", run: () => studioStore.setState({ tool: "interact" }) },
    { id: "edit-text", group: "Edit", label: "Edit text", shortcut: "Enter", keywords: "type content copy", disabled: editOff, run: () => { if (!startTextEditOnSelection()) press({ key: "Enter", code: "Enter" }); } },
    { id: "copy", group: "Edit", label: "Copy", shortcut: clipboardShortcuts.copy, disabled: layerOff, run: () => { if (node) void clipboardActions.copy(node); } },
    { id: "cut", group: "Edit", label: "Cut", shortcut: clipboardShortcuts.cut, disabled: editOff, run: () => { if (node) void clipboardActions.cut(node); } },
    { id: "paste", group: "Edit", label: "Paste", shortcut: clipboardShortcuts.paste, disabled: editOff, run: () => { void clipboardActions.paste(node ?? null); } },
    { id: "paste-replace", group: "Edit", label: "Paste to replace", shortcut: clipboardShortcuts.replace, disabled: editOff, run: () => { if (node) void clipboardActions.replace(node); } },
    // Figma's Copy as PNG (⇧⌘C) / SVG: the layer or the frame as a picture or as SVG markup (edit/copyAs.ts).
    { id: "copy-as-png", group: "Edit", label: "Copy as PNG", shortcut: copyAsPngShortcut, keywords: "picture image screenshot export", disabled: pictureOff, run: () => { void copyAsPng(selection ?? null); } },
    { id: "copy-as-svg", group: "Edit", label: "Copy as SVG", keywords: "vector markup export", disabled: pictureOff, run: () => { void copyAsSvg(selection ?? null); } },
    { id: "copy-props", group: "Edit", label: "Copy properties", shortcut: clipboardShortcuts.copyProps, keywords: "style", disabled: layerOff, run: () => { if (node) void clipboardActions.copyProperties(node); } },
    { id: "paste-props", group: "Edit", label: "Paste properties", shortcut: clipboardShortcuts.pasteProps, keywords: "style", disabled: editOff ?? (clipboardActions.hasProperties() ? undefined : "Copy properties first"), run: () => { if (node) void clipboardActions.pasteProperties(node); } },
    { id: "duplicate", group: "Edit", label: "Duplicate", shortcut: duplicateShortcut, disabled: editOff, run: () => { if (multiSelection.get().length) void duplicateLayers(); else if (node) void duplicateSelection(node); } },
    { id: "remove", group: "Edit", label: "Delete", shortcut: removeShortcut, keywords: "remove", disabled: editOff, run: () => { if (multiSelection.get().length) void removeLayers(); else if (node) void removeSelection(node); } },
    { id: "move-up", group: "Arrange", label: "Send backward", shortcut: `${modKey}[`, keywords: "reorder up left earlier", disabled: editOff, run: () => { if (multiSelection.get().length) void stepLayers("prev"); else if (node) void stepLayer(node, "prev"); } },
    { id: "move-down", group: "Arrange", label: "Bring forward", shortcut: `${modKey}]`, keywords: "reorder down right later", disabled: editOff, run: () => { if (multiSelection.get().length) void stepLayers("next"); else if (node) void stepLayer(node, "next"); } },
    { id: "wrap-stack", group: "Edit", label: "Add auto layout", shortcut: autoLayoutShortcut, keywords: "stack group container wrap", disabled: editOff ?? (wrap && !wrap.ok && !isFrameWithoutAutoLayout(selection ?? null) ? wrap.reason : undefined), run: () => { void addAutoLayoutToSelection(); } },
    { id: "remove-auto-layout", group: "Edit", label: "Remove auto layout", shortcut: removeAutoLayoutShortcut, keywords: "stack box frame", disabled: editOff ?? (isAutoLayoutFrame(selection ?? null) ? undefined : "Select an auto layout frame on a page you made"), run: () => { void removeAutoLayoutFromSelection(); } },
    { id: "wrap-box", group: "Edit", label: "Frame selection", shortcut: frameSelectionShortcut, keywords: "box group container wrap", disabled: editOff ?? (wrap && !wrap.ok ? wrap.reason : undefined), run: () => { void wrapSelection("box"); } },
    // The Design tab's Position toggle, for one layer or several (edit/ignoreAutoLayout.ts): floating on, or back in the flow.
    { id: "ignore-auto-layout", group: "Edit", label: "Ignore auto layout", keywords: "absolute position float constraints back in auto layout", disabled: editOff, run: () => { void toggleIgnoreAutoLayout(); } },
    // Figma's Rename (⌘R; several layers: Rename layers) and Lock / Unlock (⇧⌘L), on a page you made (F1).
    { id: "rename", group: "Edit", label: selectedLayers().length > 1 ? "Rename layers" : "Rename", shortcut: renameShortcut, keywords: "name layer batch", disabled: editOff ?? (state.localPage ? (selection ? undefined : "Select a layer first") : "Works on a page you made"), run: () => startRename() },
    { id: "lock", group: "Edit", label: isSelectionLocked(selection) ? "Unlock" : "Lock", shortcut: lockShortcut, keywords: "lock unlock freeze", disabled: editOff ?? (state.localPage ? (selection ? undefined : "Select a layer first") : "Works on a page you made"), run: () => { void toggleLockSelection(); } },
    // Figma's Create component (⌥⌘K: one, of every selected layer) and Create multiple components, on a page you made (F3).
    { id: "create-component", group: "Edit", label: "Create component", shortcut: `⌥${modKey}K`, keywords: "main component symbol make", disabled: editOff ?? (state.localPage ? undefined : "Works on a page you made"), run: () => { void createComponentOfLayers(); } },
    { id: "combine-variants", group: "Edit", label: "Combine as variants", keywords: "component set variants merge", disabled: editOff ?? (!state.localPage ? "Works on a page you made" : selectedLayers().length > 1 ? undefined : "Select several main components"), run: () => { void combineAsVariants(); } },
    { id: "create-components", group: "Edit", label: "Create multiple components", keywords: "main components symbols make each", disabled: editOff ?? (!state.localPage ? "Works on a page you made" : selectedLayers().length > 1 ? undefined : "Select several layers"), run: () => { void createComponents(); } },
    // Figma's boolean groups, Flatten and Outline stroke on shapes of a page you made (edit/pathOps.ts, F9b).
    ...(["union", "subtract", "intersect", "exclude"] as const).map((operation) => ({ id: `boolean-${operation}`, group: "Edit", label: `${operation[0].toUpperCase()}${operation.slice(1)} selection`, shortcut: `⌥⇧${operation === "union" ? "U" : operation === "subtract" ? "S" : operation === "intersect" ? "I" : "E"}`, keywords: "boolean shapes combine", disabled: editOff ?? (state.localPage ? undefined : "Works on a page you made"), run: () => { void booleanSelection(operation); } })),
    { id: "flatten", group: "Edit", label: "Flatten", shortcut: `${modKey}E`, keywords: "vector merge shapes", disabled: editOff ?? (state.localPage ? undefined : "Works on a page you made"), run: () => { void flattenSelection(); } },
    { id: "use-as-mask", group: "Edit", label: "Use as mask", shortcut: maskShortcut, keywords: "mask clip crop shape group", disabled: editOff ?? (state.localPage ? undefined : "Works on a page you made"), run: () => { void maskSelection(); } },
    { id: "outline-stroke", group: "Edit", label: "Outline stroke", shortcut: `⌥${modKey}O`, keywords: "vector stroke fill", disabled: editOff ?? (state.localPage ? undefined : "Works on a page you made"), run: () => { void outlineStrokeSelection(); } },
    { id: "detach", group: "Edit", label: "Detach instance", shortcut: detachShortcut, disabled: editOff ?? (node && !offersDetach(node.name) ? "Select an instance" : undefined), run: () => { if (node) void detachSelection(node); } },
    { id: "undo", group: "Edit", label: "Undo", shortcut: `${modKey}Z`, disabled: state.undo.length ? undefined : "Nothing to undo", run: () => { void undoEdit(); } },
    { id: "redo", group: "Edit", label: "Redo", shortcut: `⇧${modKey}Z`, disabled: state.redo.length ? undefined : "Nothing to redo", run: () => { void redoEdit(); } },
    { id: "save", group: "Edit", label: "Save", shortcut: `${modKey}S`, keywords: "unsaved changes", disabled: canEdit(state) ? undefined : "Can't save right now", run: () => { void requestSave(); } },
    { id: "collapse-layers", group: "Panels", label: "Collapse layers", shortcut: "⌥L", keywords: "layers fold close", run: () => { studioStore.setState({ leftTab: "layers" }); window.dispatchEvent(new Event(COLLAPSE_LAYERS_EVENT)); } },
    { id: "select-parent", group: "Selection", label: "Select parent", shortcut: "⇧Enter", disabled: selection?.kind === "node" ? undefined : "Select a layer first", run: () => press({ key: "Enter", code: "Enter", shiftKey: true }) },
    { id: "select-child", group: "Selection", label: "Select children", shortcut: "Enter", disabled: layerOff, run: () => press({ key: "Enter", code: "Enter" }) },
    { id: "select-next", group: "Selection", label: "Select next sibling", shortcut: "Tab", disabled: layerOff, run: () => press({ key: "Tab", code: "Tab" }) },
    { id: "select-prev", group: "Selection", label: "Select previous sibling", shortcut: "⇧Tab", disabled: layerOff, run: () => press({ key: "Tab", code: "Tab", shiftKey: true }) },
    // Figma's Select matching layers and Select all with same ›, on a page you made (edit/selectMatching.ts).
    { id: "select-matching", group: "Selection", label: "Select matching layers", shortcut: selectMatchingShortcut, keywords: "same twin copies frames multi edit", disabled: !state.localPage ? "Works on a page you made" : layerOff, run: () => { selectMatchingLayers(); } },
    ...(Object.keys(SAME_LABELS) as SameKind[]).map((kind): Command => ({ id: `select-same-${kind}`, group: "Selection", label: `Select all with same ${SAME_LABELS[kind].toLowerCase()}`, keywords: "matching similar", disabled: !state.localPage ? "Works on a page you made" : layerOff, run: () => { selectAllWithSame(kind); } })),
    { id: "deselect", group: "Selection", label: "Deselect", keywords: "clear selection none", disabled: selection ? undefined : "Nothing is selected", run: () => studioStore.setState({ selection: null }) },
    { id: "zoom-in", group: "View", label: "Zoom in", shortcut: `${modKey}+`, run: zoomIn },
    { id: "zoom-out", group: "View", label: "Zoom out", shortcut: `${modKey}−`, run: zoomOut },
    { id: "zoom-100", group: "View", label: "Zoom to 100%", shortcut: "⇧0", run: () => canvasApi.setZoom(1) },
    { id: "zoom-fit", group: "View", label: "Zoom to fit", shortcut: "⇧1", run: () => canvasApi.fit() },
    { id: "zoom-selection", group: "View", label: "Zoom to selection", shortcut: "⇧2", disabled: selection ? undefined : "Select a layer or frame first", run: () => press({ key: "@", code: "Digit2", shiftKey: true }) },
    { id: "next-frame", group: "View", label: "Zoom to next frame", shortcut: "N", disabled: state.localPage ? undefined : "Works on a page you made", run: () => { stepFrame(1); } },
    { id: "previous-frame", group: "View", label: "Zoom to previous frame", shortcut: "⇧N", disabled: state.localPage ? undefined : "Works on a page you made", run: () => { stepFrame(-1); } },
    { id: "present", group: "View", label: "Present", shortcut: presentShortcut, keywords: "full screen play", disabled: frameId ? undefined : "Select a frame or a layer in one", run: () => { if (frameId) presentFrame(frameId); } },
    { id: "panels", group: "View", label: "Show/Hide UI", shortcut: `${modKey}\\`, keywords: "side panels", run: toggleSidePanels },
    { id: "find", group: "View", label: "Find and replace", shortcut: `${modKey}F`, keywords: "search text replace words", run: openFind },
    // Figma's View options (F10, canvas/viewOptions.ts): each turns on or off.
    { id: "pixel-grid", group: "View", label: "Pixel grid", shortcut: `${modKey}'`, keywords: "pixels 400%", run: () => toggleViewOption("pixelGrid") },
    { id: "outlines", group: "View", label: "Outlines", shortcut: modKey === "⌘" ? "⌘Y" : undefined, keywords: "outline mode wireframe", run: () => toggleViewOption("outlines") },
    { id: "rulers", group: "View", label: "Rulers", shortcut: "⇧R", keywords: "guides measure", run: () => toggleViewOption("rulers") },
    { id: "layout-guides", group: "View", label: "Layout guides", shortcut: modKey === "⌘" ? "⌃G" : "Ctrl+Alt+G", keywords: "columns grid layout grid", run: () => toggleViewOption("layoutGuides") },
    { id: "theme", group: "View", label: state.chromeTheme === "dark" ? "Light mode" : "Dark mode", keywords: "theme dark light interface canvas mode", run: toggleStudioTheme },
    { id: "pages", group: "Panels", label: "Show pages", run: () => studioStore.setState({ leftTab: "pages" }) },
    { id: "variables", group: "Panels", label: "Local variables", keywords: "tokens variables colors modes collection open", run: openVariables },
    { id: "layers", group: "Panels", label: "Show layers", run: () => studioStore.setState({ leftTab: "layers" }) },
    { id: "assets", group: "Panels", label: "Show assets", keywords: "components insert add", run: () => studioStore.setState({ leftTab: "assets" }) },
    { id: "design", group: "Panels", label: "Show design", keywords: "inspector properties", run: () => studioStore.setState({ inspectorTab: "design" }) },
    { id: "code", group: "Panels", label: "Show code", keywords: "source", run: () => studioStore.setState({ inspectorTab: "code" }) },
    { id: "search-pages", group: "Navigate", label: "Search pages", keywords: "go to open find", run: () => window.dispatchEvent(new Event("zen-studio:search-pages")) },
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

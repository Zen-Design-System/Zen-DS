import { startPlay } from "../builder/proto/Player";
import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { Menu, type MenuEntry, type MenuItemData } from "../../../components/Menu";
import { ZenPortalProvider } from "../../../components/Portal";
import type { IconName } from "../../../icons/generated/names";
import { parseSrc, studioApi, type DetachPlanReply } from "../api";
import { detachSelection, detachShortcut, offersDetach, renderCount, withRowCheck } from "../inspector/detach";
import { useExtraSelection } from "../select/multiSelection";
import { autoLayoutShortcut, frameSelectionShortcut, wrapCheck, wrapSelection } from "../select/wrapSelection";
import { addAutoLayoutToSelection, isAutoLayoutFrame, isFrameWithoutAutoLayout, removeAutoLayoutFromSelection, removeAutoLayoutShortcut } from "../edit/autoLayout";
import { useSlotMenuItems } from "../slots/menu";
import { clipboardActions, clipboardMenuItems, clipboardShortcuts } from "../edit/clipboard";
import { duplicateLayers, removeLayers, stepLayers } from "../edit/multi";
import { toggleIgnoreAutoLayout } from "../edit/ignoreAutoLayout";
import { visibilityMenuItems } from "../edit/visibility";
import { lockMenuItems } from "../edit/lock";
import { renameShortcut, startRename } from "../edit/rename";
import { findFrame } from "../board/frames";
import { newPageFromFrame } from "../builder/starters/newPageFromFrame";
import { copyFrameForFigma } from "../builder/export/figmaClipboard";
import { presentFrame, zoomToFrame } from "../board/presentFrame";
import { canvasApi } from "../canvas/viewport";
import { duplicateShortcut, removeShortcut } from "../slots/actions";
import { toggleSidePanels } from "./layout";
import { modKey, presentShortcut } from "./modKey";
import { createComponent } from "../edit/localComponents";
import { removeFrame } from "../builder/proto/addFrame";
import { canEdit, studioStore } from "../store";
import { useChromeAttributes } from "./ChromeScope";
import type { StudioSelection } from "../types";
import "./shell.css";

/*
 * The canvas context menu (right-click, Select tool), like Figma's, for what is under the pointer:
 * - a layer: Copy, Cut, Paste, Paste to replace, Copy / Paste properties (edit/clipboard.ts), Add to {Slot}…, Duplicate,
 *   Move up / down (slots/menu.ts), Add auto layout ⇧A / Remove auto layout ⌥⇧A / Frame selection ⌥⌘G (edit/autoLayout.ts,
 *   select/wrapSelection.ts), Detach instance, then
 *   Remove (destructive, last);
 * - several selected layers: Copy, Cut, Duplicate, Move up / down, Remove for all of them (edit/multi.ts), then the wrap items;
 * - a frame: Zoom to frame, Present, Zoom to fit;
 * - the empty canvas: Zoom to fit, Zoom to 100%, Hide / show UI.
 * The selection layer opens it at the pointer; it renders in its own window-sized layer (chrome modes) and anchors to
 * an invisible point there, moved up when the menu is taller than the room on either side (Figma keeps it whole).
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
type MenuTarget = { kind: "node"; selection: NodeSelection } | { kind: "frame"; frameId: string } | { kind: "canvas" };
/** A layer under the pointer that "Select layer" offers (Figma's submenu): its name and how to select it. */
export type LayerUnderPointer = { name: string; icon: IconName; selected: boolean; select: () => void };
/** `listing`: the menu shows only the layers under the pointer ("Select layer ›" chosen). */
type MenuState = { x: number; y: number; target: MenuTarget; at: number; layers?: readonly LayerUnderPointer[]; listing?: boolean };
/** What Menu's placement keeps between the anchor and the window edge: its 8px margin, its 4px gap and the 1px anchor
 * (.studio-canvas-menu__anchor). Leaving out the gap and the anchor made Menu find 5px too little room below the moved
 * anchor and open the menu above it, cut off by the window's top (2026-10-09). */
const WINDOW_MARGIN = 8;
const MENU_GAP = 4;
const ANCHOR_HEIGHT = 1;

let state: MenuState | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const set = (next: MenuState | null) => { state = next; listeners.forEach((listener) => listener()); };

/** Opens the canvas menu for `selection` (and the other selected layers) at a client point; `layers`: every layer under
 *  the pointer, deepest first, for "Select layer". */
export function openCanvasMenu(x: number, y: number, selection: NodeSelection, layers?: readonly LayerUnderPointer[]) {
  set({ x, y, target: { kind: "node", selection }, at: Date.now(), layers });
}

/** Opens the frame menu at a client point (right-click on a frame's empty area or its label). */
export function openFrameMenu(x: number, y: number, frameId: string) {
  set({ x, y, target: { kind: "frame", frameId }, at: Date.now() });
}

/** Opens the canvas menu of the empty canvas at a client point. */
export function openEmptyCanvasMenu(x: number, y: number) {
  set({ x, y, target: { kind: "canvas" }, at: Date.now() });
}

/** A Figma item Zen Studio has no feature for yet: in Figma's place in the menu, off, saying so (edit/figmaNotYet.ts). */
const notYet = (id: string, label: string, shortcut: string, icon: MenuItemData["icon"]): MenuItemData => ({ id: `not-yet-${id}`, label, icon, shortcut, disabled: true, caption: "Not in Zen Studio yet", onSelect: () => {} });

export function CanvasMenu() {
  const menu = useSyncExternalStore(subscribe, () => state, () => null);
  const [point, setPoint] = useState({ x: 0, y: 0 });
  const [plan, setPlan] = useState<{ at: number; reply: DetachPlanReply } | null>(null);
  // Its own viewport-sized layer (chrome modes): the menu then opens to the right of the pointer, like Figma's, and
  // flips only at the window's edge (the shared chrome portal root is a 0×0 box).
  const [layer, setLayer] = useState<HTMLDivElement | null>(null);
  const chrome = useChromeAttributes();
  if (menu && (menu.x !== point.x || menu.y !== point.y)) setPoint({ x: menu.x, y: menu.y });

  const selection = menu?.target.kind === "node" ? menu.target.selection : null;
  const offered = selection ? offersDetach(selection.name) && !selection.part : false;
  const slotItems = useSlotMenuItems(selection, menu ? { x: menu.x, y: menu.y } : null, menu?.at ?? 0);
  useEffect(() => {
    if (!menu || !offered || !canEdit()) return undefined;
    if (!selection) return undefined;
    const parsed = parseSrc(selection.src);
    if (!parsed) return undefined;
    let alive = true;
    void studioApi.detachPlan(parsed.file, parsed.loc, selection.name, renderCount(selection) || undefined).then((reply) => { if (alive) setPlan({ at: menu.at, reply: withRowCheck(reply, selection) }); });
    return () => { alive = false; };
  }, [menu, offered, selection]);

  const reply = plan && menu && plan.at === menu.at ? plan.reply : null;
  const reason = !selection ? null
    : !canEdit() ? (studioStore.getState().role === "admin" ? "Can't detach right now" : "View only")
      : !offered ? "Select an instance"
        : !reply ? "Checking…"
          : reply.ok ? null : reply.reason;
  const detach: MenuItemData = {
    id: "detach",
    label: "Detach instance",
    icon: "icon-link-broken-02-line",
    shortcut: detachShortcut,
    caption: reason ?? undefined,
    disabled: reason !== null,
    onSelect: () => { if (selection) void detachSelection(selection); },
  };
  // Wrap in a new container (Figma's Add auto layout / Frame selection): the selection, one layer or several.
  const several = useExtraSelection().length > 0;
  const wrap = menu && selection && !selection.part ? wrapCheck() : null;
  const frameAlone = isFrameWithoutAutoLayout(selection);
  const autoLayoutAlone = isAutoLayoutFrame(selection);
  const wrapItems: MenuItemData[] = wrap && (wrap.ok || !wrap.hidden) ? [
    // Figma's words (user, 2026-10-17: less developer language): Add auto layout turns a frame without it into auto
    // layout, and wraps anything else in an auto layout frame; Frame selection wraps in a frame.
    { id: "wrap-stack", label: "Add auto layout", icon: "icon-rows-01-line", shortcut: autoLayoutShortcut, caption: wrap.ok || frameAlone ? undefined : wrap.reason, disabled: !wrap.ok && !frameAlone, onSelect: () => { void addAutoLayoutToSelection(); } },
    ...(autoLayoutAlone ? [{ id: "remove-auto-layout", label: "Remove auto layout", icon: "icon-square-line" as const, shortcut: removeAutoLayoutShortcut, onSelect: () => { void removeAutoLayoutFromSelection(); } }] : []),
    notYet("group", "Group selection", `${modKey}G`, "icon-layers-three-01-line"),
    { id: "wrap-box", label: "Frame selection", icon: "icon-square-line", shortcut: frameSelectionShortcut, disabled: !wrap.ok, onSelect: () => { void wrapSelection("box"); } },
  ] : [];
  // Show / Hide (⇧⌘H) and one layout only, on a page made in the Studio (edit/visibility.ts).
  // Show / Hide, Lock / Unlock and Rename, as Figma's layer menu (edit/visibility.ts, edit/lock.ts, edit/rename.ts).
  const renameItem = (label: string): MenuItemData => ({ id: "rename", label, icon: "icon-text-input-line", shortcut: renameShortcut, disabled: Boolean(canEdit() ? undefined : "View only"), onSelect: () => { requestAnimationFrame(startRename); } });
  const visibility: MenuEntry[] = menu?.target.kind === "node" ? [...visibilityMenuItems(selection), ...lockMenuItems(selection), ...(studioStore.getState().localPage && selection && !selection.part ? [renameItem("Rename")] : [])] : [];
  // Copy / Cut / Paste / Paste to replace / properties first, as in Figma's layer menu (edit/clipboard.ts).
  const clipboard = clipboardMenuItems(selection);
  const editOff = canEdit() ? undefined : studioStore.getState().role === "admin" ? "Can't edit right now" : "View only";
  // Several layers: the edits that work on all of them at once (Figma's multi-selection menu), then the wrap items.
  const severalItems: MenuEntry[] = selection ? [
    { id: "multi-copy", label: "Copy", icon: "icon-copy-line", shortcut: clipboardShortcuts.copy, onSelect: () => { void clipboardActions.copy(selection); } },
    { id: "multi-cut", label: "Cut", icon: "icon-scissors-line", shortcut: clipboardShortcuts.cut, disabled: Boolean(editOff), caption: editOff, onSelect: () => { void clipboardActions.cut(selection); } },
    { id: "multi-duplicate", label: "Duplicate", icon: "icon-duplicate-line", shortcut: duplicateShortcut, disabled: Boolean(editOff), caption: editOff, onSelect: () => { void duplicateLayers(); } },
    // Several layers of one parent step together (op many move), as the arrow keys do.
    { id: "multi-move-down", label: "Bring forward", icon: "icon-arrow-up-line", shortcut: `${modKey}]`, disabled: Boolean(editOff), caption: editOff, onSelect: () => { void stepLayers("next"); } },
    { id: "multi-move-up", label: "Send backward", icon: "icon-arrow-down-line", shortcut: `${modKey}[`, disabled: Boolean(editOff), caption: editOff, onSelect: () => { void stepLayers("prev"); } },
    { type: "separator", id: "multi-separator" },
    ...wrapItems,
    // Floats every selected Stack / Grid / Box at its own offsets (or puts them back in the flow): edit/ignoreAutoLayout.ts.
    { id: "multi-float", label: "Ignore auto layout", icon: "icon-transform-line", disabled: Boolean(editOff), caption: editOff, onSelect: () => { void toggleIgnoreAutoLayout(); } },
    ...lockMenuItems(selection),
    ...(studioStore.getState().localPage ? [renameItem("Rename…")] : []),
    { type: "separator", id: "multi-remove-separator" },
    { id: "multi-remove", label: "Delete", icon: "icon-trash-line", shortcut: removeShortcut, danger: true, disabled: Boolean(editOff), caption: editOff, onSelect: () => { void removeLayers(); } },
  ] : [];
  // Figma's Create component (⌥⌘K) on one layer of a page you made (edit/localComponents.ts).
  const componentItems: MenuEntry[] = selection && !selection.part && selection.name !== "Use" && studioStore.getState().localPage ? [
    { id: "create-component", label: "Create component", icon: "icon-diamond-line" as const, shortcut: `⌥${modKey}K`, disabled: Boolean(editOff), onSelect: () => { void createComponent(selection); } },
  ] : [];
  const frame = menu?.target.kind === "frame" ? findFrame(menu.target.frameId) : null;
  const localPage = studioStore.getState().localPage;
  const frameItems: MenuEntry[] = frame ? [
    { id: "frame-zoom", label: "Zoom to selection", icon: "icon-zoom-in-line", shortcut: "⇧2", onSelect: () => zoomToFrame(frame.element) },
    // Present plays a page you made from this Screen (Figma's Present runs the prototype); an example frame is presented.
    ...(localPage || frame.id.startsWith("example:") ? [{ id: "frame-present", label: "Present", icon: "icon-play-line" as const, shortcut: presentShortcut, onSelect: () => (localPage ? startPlay(frame.id.startsWith("screen:") ? frame.id.split(":")[1] : null) : presentFrame(frame.id)) }] : []),
    // A frame of a page you made: its code and its Figma export on the clipboard (⌘V in the Zen plugin places it).
    ...(localPage ? [{ id: "frame-copy-figma", label: "Copy for Figma", icon: "icon-copy-line" as const, onSelect: () => { void copyFrameForFigma(localPage, frame.id); } }] : []),
    // A builder page that starts as this example or template (GĐ3b): kept in this browser, so it needs no dev server.
    ...(frame.id.startsWith("example:") ? [{ id: "frame-new-page", label: "New page from this frame", icon: "icon-file-plus-line" as const, onSelect: () => { void newPageFromFrame(frame); } }] : []),
    { type: "separator", id: "frame-separator" },
    { id: "frame-fit", label: "Zoom to fit", icon: "icon-expand-04-line", shortcut: "⇧1", onSelect: () => canvasApi.fit() },
    // A Screen or Overlay of a page you made deletes as one edit (Figma deletes a frame from its menu too).
    ...(localPage && /^(screen|overlay):/.test(frame.id) ? [
      { type: "separator" as const, id: "frame-name-separator" },
      ...lockMenuItems({ kind: "frame", frameId: frame.id }),
      renameItem("Rename"),
      { type: "separator" as const, id: "frame-delete-separator" },
      { id: "frame-delete", label: "Delete", icon: "icon-trash-line" as const, shortcut: removeShortcut, danger: true, disabled: Boolean(editOff), onSelect: () => { void removeFrame(localPage, frame.id); } },
    ] : []),
  ] : [];
  const canvasItems: MenuEntry[] = [
    { id: "canvas-fit", label: "Zoom to fit", icon: "icon-expand-04-line", shortcut: "⇧1", onSelect: () => canvasApi.fit() },
    { id: "canvas-100", label: "Zoom to 100%", icon: "icon-zoom-in-line", shortcut: "⇧0", onSelect: () => canvasApi.setZoom(1) },
    { type: "separator", id: "canvas-separator" },
    { id: "canvas-ui", label: "Show/Hide UI", icon: "icon-layout-alt-04-line", shortcut: `${modKey}\\`, onSelect: () => toggleSidePanels() },
  ];
  // Figma's "Select layer ›": every layer under the pointer, deepest first, so any of them is two steps away however
  // deep it sits (user, 2026-10-13: "khó click vào element muốn hơn so với figma"). One item opens the list in place
  // (the Menu has no submenus), each layer with its Layers icon; the selected one says so.
  const under = menu?.layers ?? [];
  const selectLayer: MenuEntry[] = under.length > 1 && menu ? [
    { id: "select-layer", label: "Select layer", icon: "icon-layers-three-01-line", shortcut: "›", onSelect: () => { const current = menu; window.setTimeout(() => set({ ...current, listing: true, at: Date.now() }), 0); } },
    { type: "separator", id: "select-layer-separator" },
  ] : [];
  const layerItems: MenuEntry[] = [{ type: "group", id: "select-layer-list", label: "Select layer", items: under.map((layer, index) => ({ id: `select-layer-${index}`, label: layer.name, icon: layer.icon, caption: layer.selected ? "Selected" : undefined, onSelect: layer.select })) }];
  const entries: MenuEntry[] = menu?.listing ? layerItems
    : menu?.target.kind === "canvas" ? canvasItems
    : menu?.target.kind === "frame" ? frameItems
      : several ? severalItems
        : [...selectLayer, ...clipboard, ...(clipboard.length ? [{ type: "separator" as const, id: "clip-separator" }] : []), ...slotItems.leading, ...wrapItems, ...componentItems, ...visibility, ...(offered ? [detach] : []), ...slotItems.trailing];
  // A disabled item shows its label only, as Figma's menu does: no reason line under it (user, 2026-10-09).
  const items = entries.map((entry) => ("disabled" in entry && entry.disabled && entry.caption ? { ...entry, caption: undefined } : entry));

  // Taller than the room above and below the pointer: move the anchor up so the menu stays whole in the window (E2E ST-03).
  // Measured again whenever the menu's size changes: items can arrive after it opens (the slot items).
  const [anchorY, setAnchorY] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!menu || !layer) { setAnchorY(null); return undefined; }
    let surface: HTMLElement | null = null;
    let frame = 0;
    const measure = () => {
      surface ??= layer.querySelector<HTMLElement>(".zen-menu");
      if (!surface) { frame = requestAnimationFrame(measure); return; }
      observer.observe(surface);
      const height = surface.offsetHeight;
      const room = window.innerHeight;
      const below = ANCHOR_HEIGHT + MENU_GAP + WINDOW_MARGIN;
      const fits = menu.y + below + height <= room || menu.y - MENU_GAP - WINDOW_MARGIN - height >= 0;
      // The lowest anchor with the whole menu below it, so Menu opens it downwards.
      setAnchorY(fits ? null : Math.max(0, room - below - height));
    };
    const observer = new ResizeObserver(() => measure());
    measure();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [menu, layer]);
  // The menu places itself again on a window resize (Menu's useMenuPlacement): tell it the anchor moved, on the next
  // frame (its handler calls flushSync, which React refuses during a commit).
  useEffect(() => {
    if (anchorY === null) return undefined;
    const frame = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => cancelAnimationFrame(frame);
  }, [anchorY]);
  return (
    <>
      <div ref={setLayer} className="studio-canvas-menu__layer" {...chrome} />
      <ZenPortalProvider container={layer}>
        <Menu
          open={Boolean(menu)}
          onOpenChange={(open) => { if (!open) set(null); }}
          aria-label={menu?.listing ? "Select layer" : menu?.target.kind === "canvas" ? "Canvas actions" : frame ? `${frame.label} actions` : several ? "Selection actions" : selection ? `${selection.name} actions` : "Layer actions"}
          items={items}
          trigger={<button type="button" tabIndex={-1} aria-label="Canvas menu" className="studio-canvas-menu__anchor" style={{ left: point.x, top: anchorY ?? point.y }} />}
        />
      </ZenPortalProvider>
    </>
  );
}

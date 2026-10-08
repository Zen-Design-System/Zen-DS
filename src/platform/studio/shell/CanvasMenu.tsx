import { useEffect, useLayoutEffect, useState, useSyncExternalStore } from "react";
import { Menu, type MenuEntry, type MenuItemData } from "../../../components/Menu";
import { ZenPortalProvider } from "../../../components/Portal";
import { parseSrc, studioApi, type DetachPlanReply } from "../api";
import { detachSelection, detachShortcut, offersDetach, renderCount, withRowCheck } from "../inspector/detach";
import { useExtraSelection } from "../select/multiSelection";
import { autoLayoutShortcut, frameSelectionShortcut, wrapCheck, wrapSelection } from "../select/wrapSelection";
import { useSlotMenuItems } from "../slots/menu";
import { clipboardActions, clipboardMenuItems, clipboardShortcuts } from "../edit/clipboard";
import { duplicateLayers, removeLayers } from "../edit/multi";
import { toggleIgnoreAutoLayout } from "../edit/ignoreAutoLayout";
import { findFrame } from "../board/frames";
import { newPageFromFrame } from "../builder/starters/newPageFromFrame";
import { presentFrame, zoomToFrame } from "../board/presentFrame";
import { canvasApi } from "../canvas/viewport";
import { duplicateShortcut, removeShortcut } from "../slots/actions";
import { toggleSidePanels } from "./layout";
import { canEdit, studioStore } from "../store";
import { useChromeAttributes } from "./ChromeScope";
import type { StudioSelection } from "../types";
import "./shell.css";

/*
 * The canvas context menu (right-click, Select tool), like Figma's, for what is under the pointer:
 * - a layer: Copy, Cut, Paste, Paste to replace, Copy / Paste properties (edit/clipboard.ts), Add to {Slot}…, Duplicate,
 *   Move up / down (slots/menu.ts), Wrap in Stack ⇧A / Wrap in Box ⌥⌘G (select/wrapSelection.ts), Detach instance, then
 *   Remove (destructive, last);
 * - several selected layers: Copy, Cut, Duplicate, Remove for all of them (edit/multi.ts), then the wrap items;
 * - a frame: Zoom to frame, Present, Zoom to fit;
 * - the empty canvas: Zoom to fit, Zoom to 100%, Hide / show UI.
 * The selection layer opens it at the pointer; it renders in its own window-sized layer (chrome modes) and anchors to
 * an invisible point there, moved up when the menu is taller than the room on either side (Figma keeps it whole).
 */

type NodeSelection = Extract<StudioSelection, { kind: "node" }>;
type MenuTarget = { kind: "node"; selection: NodeSelection } | { kind: "frame"; frameId: string } | { kind: "canvas" };
type MenuState = { x: number; y: number; target: MenuTarget; at: number };
/** The window margin the menu keeps when the anchor moves it (Menu's own is 8px). */
const WINDOW_MARGIN = 8;

let state: MenuState | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const set = (next: MenuState | null) => { state = next; listeners.forEach((listener) => listener()); };

/** Opens the canvas menu for `selection` (and the other selected layers) at a client point. */
export function openCanvasMenu(x: number, y: number, selection: NodeSelection) {
  set({ x, y, target: { kind: "node", selection }, at: Date.now() });
}

/** Opens the frame menu at a client point (right-click on a frame's empty area or its label). */
export function openFrameMenu(x: number, y: number, frameId: string) {
  set({ x, y, target: { kind: "frame", frameId }, at: Date.now() });
}

/** Opens the canvas menu of the empty canvas at a client point. */
export function openEmptyCanvasMenu(x: number, y: number) {
  set({ x, y, target: { kind: "canvas" }, at: Date.now() });
}

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
    : !canEdit() ? (studioStore.getState().role === "admin" ? "Detaching needs the Studio dev server" : "View only — switch to Admin to edit")
      : !offered ? `${selection.name} is not a component instance`
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
  const wrapItems: MenuItemData[] = wrap && (wrap.ok || !wrap.hidden) ? [
    { id: "wrap-stack", label: "Wrap in Stack", icon: "icon-rows-01-line", shortcut: autoLayoutShortcut, caption: wrap.ok ? undefined : wrap.reason, disabled: !wrap.ok, onSelect: () => { void wrapSelection("stack"); } },
    { id: "wrap-box", label: "Wrap in Box", icon: "icon-square-line", shortcut: frameSelectionShortcut, disabled: !wrap.ok, onSelect: () => { void wrapSelection("box"); } },
  ] : [];
  // Copy / Cut / Paste / Paste to replace / properties first, as in Figma's layer menu (edit/clipboard.ts).
  const clipboard = clipboardMenuItems(selection);
  const editOff = canEdit() ? undefined : studioStore.getState().role === "admin" ? "Editing needs the Studio dev server" : "View only — switch to Admin to edit";
  // Several layers: the edits that work on all of them at once (Figma's multi-selection menu), then the wrap items.
  const severalItems: MenuEntry[] = selection ? [
    { id: "multi-copy", label: "Copy", icon: "icon-copy-line", shortcut: clipboardShortcuts.copy, onSelect: () => { void clipboardActions.copy(selection); } },
    { id: "multi-cut", label: "Cut", icon: "icon-scissors-line", shortcut: clipboardShortcuts.cut, disabled: Boolean(editOff), caption: editOff, onSelect: () => { void clipboardActions.cut(selection); } },
    { id: "multi-duplicate", label: "Duplicate", icon: "icon-duplicate-line", shortcut: duplicateShortcut, disabled: Boolean(editOff), caption: editOff, onSelect: () => { void duplicateLayers(); } },
    { type: "separator", id: "multi-separator" },
    ...wrapItems,
    // Floats every selected Stack / Grid / Box at its own offsets (or puts them back in the flow): edit/ignoreAutoLayout.ts.
    { id: "multi-float", label: "Ignore auto layout", icon: "icon-transform-line", disabled: Boolean(editOff), caption: editOff, onSelect: () => { void toggleIgnoreAutoLayout(); } },
    { type: "separator", id: "multi-remove-separator" },
    { id: "multi-remove", label: "Remove", icon: "icon-trash-line", shortcut: removeShortcut, danger: true, disabled: Boolean(editOff), caption: editOff, onSelect: () => { void removeLayers(); } },
  ] : [];
  const frame = menu?.target.kind === "frame" ? findFrame(menu.target.frameId) : null;
  const frameItems: MenuEntry[] = frame ? [
    { id: "frame-zoom", label: "Zoom to frame", icon: "icon-zoom-in-line", shortcut: "⇧2", onSelect: () => zoomToFrame(frame.element) },
    { id: "frame-present", label: "Present", icon: "icon-play-line", shortcut: "F", onSelect: () => presentFrame(frame.id) },
    // A builder page that starts as this example or template (GĐ3b): kept in this browser, so it needs no dev server.
    ...(frame.id.startsWith("example:") ? [{ id: "frame-new-page", label: "New page from this frame", icon: "icon-file-plus-line" as const, onSelect: () => { void newPageFromFrame(frame); } }] : []),
    { type: "separator", id: "frame-separator" },
    { id: "frame-fit", label: "Zoom to fit", icon: "icon-expand-04-line", shortcut: "⇧1", onSelect: () => canvasApi.fit() },
  ] : [];
  const canvasItems: MenuEntry[] = [
    { id: "canvas-fit", label: "Zoom to fit", icon: "icon-expand-04-line", shortcut: "⇧1", onSelect: () => canvasApi.fit() },
    { id: "canvas-100", label: "Zoom to 100%", icon: "icon-zoom-in-line", shortcut: "⇧0", onSelect: () => canvasApi.setZoom(1) },
    { type: "separator", id: "canvas-separator" },
    { id: "canvas-ui", label: "Hide or show UI", icon: "icon-layout-alt-04-line", shortcut: "⌘\\", onSelect: () => toggleSidePanels() },
  ];
  const items: MenuEntry[] = menu?.target.kind === "canvas" ? canvasItems
    : menu?.target.kind === "frame" ? frameItems
      : several ? severalItems
        : [...clipboard, ...(clipboard.length ? [{ type: "separator" as const, id: "clip-separator" }] : []), ...slotItems.leading, ...wrapItems, detach, ...slotItems.trailing];

  // Taller than the room above and below the pointer: move the anchor up so the menu stays whole in the window (E2E ST-03).
  // Measured again whenever the menu's size changes: captions arrive after it opens ("Checking…" → the Detach reason).
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
      const fits = menu.y + height + WINDOW_MARGIN <= room || menu.y - height - WINDOW_MARGIN >= 0;
      setAnchorY(fits ? null : Math.max(WINDOW_MARGIN, room - WINDOW_MARGIN - height));
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
          aria-label={menu?.target.kind === "canvas" ? "Canvas actions" : frame ? `${frame.label} actions` : several ? "Selection actions" : selection ? `${selection.name} actions` : "Layer actions"}
          items={items}
          trigger={<button type="button" tabIndex={-1} aria-label="Canvas menu" className="studio-canvas-menu__anchor" style={{ left: point.x, top: anchorY ?? point.y }} />}
        />
      </ZenPortalProvider>
    </>
  );
}

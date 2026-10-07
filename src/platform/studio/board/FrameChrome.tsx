import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button, IconButton } from "../../../components/Button";
import { BadgeCounter } from "../../../components/Badge";
import { plural } from "../../../components/Text";
import { Icon } from "../../../components/Icon";
import { Menu, type MenuEntry, type MenuItemData } from "../../../components/Menu";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { typographyStyles } from "../../../tokens/typography.generated";
import { useStudioServer } from "../api";
import { canvasApi, getViewport, getViewportBox } from "../canvas/viewport";
import { frameIcon } from "../inspector/frames";
import { ChromeScope } from "../shell/ChromeScope";
import { confirmFrameDiscard, requestFrameSave, useFrameDrafts, useStudioDrafts } from "../sourceDrafts";
import { canEdit, pageKey, setFrameOverride, studioStore, useStudio } from "../store";
import type { FrameDraft, StudioFrameWidth } from "../types";
import { FRAME_MAX_WIDTH, FRAME_MIN_WIDTH, frameWidthPresets, isCustomFrameWidth, resolveFrameWidth } from "./frameLayout";
import { getStudioFrames, getStudioSections, useStudioFrames, useStudioSections, type StudioFrameEntry } from "./frames";
import { presentFrame, zoomToFrame } from "./presentFrame";
import "./board.css";

/** The toolbar needs this much screen width above a frame; narrower frames show it only while selected. */
const TOOLBAR_MIN_FRAME = 240;
/** Screen width the name label keeps beside a toolbar above the frame; narrower frames get the toolbar beside them. */
const LABEL_MIN = 72;
/** The frame tools' width (width menu, theme, present, copy) until one has been measured. */
const TOOLS_WIDTH = 180;
/** Hovering this far above a frame (its label and toolbar row) still counts as hovering the frame. */
const HOVER_REACH = 40;
/** Screen gaps of the chrome around a frame: the label 4px above it, the toolbar 8px. */
const LABEL_GAP = 4;
const TOOLBAR_GAP = 8;
/** The selected frame's label and toolbar keep this far inside the canvas's visible edges. */
const EDGE = 8;

type Rect = { x: number; y: number; width: number; height: number };
type Size = { width: number; height: number };

/** An element's box in world coordinates, from layout offsets (transform-free, so valid whatever the zoom). */
function worldRectOf(element: HTMLElement, world: HTMLElement): Rect | null {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = element;
  while (node && node !== world) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return node === world ? { x, y, width: element.offsetWidth, height: element.offsetHeight } : null;
}

const overlaps = (a: Rect, b: Rect) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * Frame chrome in screen space (spec §4): each frame's name label above its top-left, a small toolbar above its top-right
 * on hover or selection, and the section name tabs. It sits above the world and the selection layer, so labels stay one
 * size at every zoom and their clicks are never taken by the Select capture layer.
 *
 * Pan and zoom never read the DOM: frame, section and title boxes are cached in world coordinates (refreshed by a
 * ResizeObserver) and placed with the viewport transform; label, toolbar and tab sizes are cached the same way.
 */
export function FrameChrome({ viewport }: { viewport: HTMLElement | null }) {
  const frames = useStudioFrames();
  const sections = useStudioSections();
  const selectedFrame = useStudio((state) => (state.selection?.kind === "frame" ? state.selection.frameId : state.selection?.kind === "node" ? state.selection.frameId : null));
  const frameSelected = useStudio((state) => state.selection?.kind === "frame");
  const [hovered, setHovered] = useState<string | null>(null);
  // Pointer over a frame's name row: the frame itself is the target (1px outline, like Figma's frame hover).
  const [labelHovered, setLabelHovered] = useState<string | null>(null);
  const [menuFrame, setMenuFrame] = useState<string | null>(null);
  // Frames with unsaved draft changes keep their toolbar (Save · Discard) and a dot on their label.
  const frameDrafts = useFrameDrafts();
  const draftOf = (id: string) => (frameDrafts.frames[id]?.changes ? frameDrafts.frames[id] : null);
  // Screen-space chrome elements and their sizes, keyed "label:<frame>", "toolbar:<frame>", "tab:<section>".
  const elements = useRef(new Map<string, HTMLElement>());
  const sizes = useRef(new Map<string, Size>());
  // World boxes of frames, sections and the board title.
  const frameRects = useRef(new Map<string, Rect>());
  const sectionRects = useRef(new Map<string, Rect>());
  const titleRect = useRef<Rect | null>(null);
  // The selected frame's right-edge handle (FrameEdge), placed by layout() like the labels.
  const edges = useRef(new Map<string, HTMLElement>());

  // Arithmetic only: world box × zoom + offset. No layout reads, so a wheel event costs a few style writes. Names never
  // print over other things: a frame label that would sit on another frame hides (unless its frame is selected), a
  // hover toolbar that would sit on a label or the board title hides, a section tab that would sit on a frame or a
  // label hides (zoomed far out, where the gaps between frames are a few pixels).
  // The selected frame's label and toolbar float like FigJam's selection toolbar: they stay inside the visible canvas
  // (clamped across, over the frame), and move inside the frame's top — or below it — when there is no room above.
  const layout = useCallback(() => {
    const { x, y, zoom } = getViewport();
    const view = getViewportBox();
    const screen = (rect: Rect): Rect => ({ x: rect.x * zoom + x, y: rect.y * zoom + y, width: rect.width * zoom, height: rect.height * zoom });
    const sizeOf = (key: string, fallback: Size) => sizes.current.get(key) ?? fallback;
    const placed = getStudioFrames().flatMap((frame) => {
      const world = frameRects.current.get(frame.id);
      return world ? [{ frame, rect: screen(world) }] : [];
    });
    const hitsFrame = (box: Rect, except?: string) => placed.some(({ frame, rect }) => frame.id !== except && overlaps(box, rect));
    const onCanvas = (box: Rect) => box.x >= 0 && box.y >= 0 && box.x + box.width <= view.width && box.y + box.height <= view.height;
    const visible = (rect: Rect) => rect.x < view.width && rect.x + rect.width > 0 && rect.y < view.height && rect.y + rect.height > 0;
    // 1. Frame labels.
    const labelBoxes = new Map<string, Rect>();
    const labelHidden = new Map<string, boolean>();
    const labelInside = new Map<string, boolean>();
    for (const { frame, rect } of placed) {
      const size = sizeOf(`label:${frame.id}`, { width: 0, height: 16 });
      const box = { x: rect.x, y: rect.y - LABEL_GAP - size.height, width: Math.min(size.width, rect.width), height: size.height };
      const selected = elements.current.get(`label:${frame.id}`)?.dataset.selected === "true";
      let hidden = rect.width < 32 || (!selected && hitsFrame(box, frame.id));
      if (selected) {
        // Across: from the frame's left edge, but never left of the canvas or past the frame's visible right end.
        box.x = Math.max(EDGE, Math.min(Math.max(rect.x, EDGE), Math.min(rect.x + rect.width, view.width - EDGE) - box.width));
        // No room above: inside the frame's top (pinned to the canvas top while the frame runs above it).
        if (box.y < EDGE) {
          box.y = Math.max(EDGE, rect.y + LABEL_GAP);
          labelInside.set(frame.id, true);
        }
        hidden = hidden || !visible(rect) || box.y + box.height > rect.y + rect.height;
      }
      labelHidden.set(frame.id, hidden);
      if (!hidden) labelBoxes.set(frame.id, box);
    }
    // The board title only shows from 20% (CSS data-zoom-band).
    const title = titleRect.current && zoom >= 0.2 ? screen(titleRect.current) : null;
    // 2. Toolbars, then the labels' room beside them.
    for (const { frame, rect } of placed) {
      const labelBox = labelBoxes.get(frame.id);
      let labelRight = labelBox && labelInside.get(frame.id) ? Math.min(rect.x + rect.width, view.width - EDGE) : rect.x + rect.width;
      const toolbar = elements.current.get(`toolbar:${frame.id}`);
      if (toolbar) {
        const size = sizeOf(`toolbar:${frame.id}`, { width: 0, height: 0 });
        const selected = toolbar.dataset.selected === "true";
        // Shown only for its unsaved changes (Save · Discard, no frame tools): only where it fits above its frame, on
        // no other frame; else the label's dot says it (hovering or selecting the frame brings the whole toolbar).
        const draftOnly = toolbar.dataset.drafted === "true" && toolbar.dataset.tools !== "true";
        const pinned = selected || toolbar.dataset.menu === "true";
        const beside = rect.width < size.width + LABEL_MIN;
        let place = beside ? "beside" : "above";
        const box: Rect = beside
          ? { x: rect.x + rect.width + TOOLBAR_GAP, y: rect.y, width: size.width, height: size.height }
          : { x: rect.x + rect.width - size.width, y: rect.y - TOOLBAR_GAP - size.height, width: size.width, height: size.height };
        if (pinned) {
          if (beside) {
            // Beside a narrow frame; with no room on the canvas's right, under the frame (its right ends lined up), or
            // above its name when there is no room below either. Then held on the canvas.
            if (box.x + box.width > view.width - EDGE) {
              box.x = rect.x + rect.width - box.width;
              box.y = rect.y + rect.height + TOOLBAR_GAP;
              place = "below";
              if (box.y + box.height > view.height - EDGE) {
                box.y = rect.y - LABEL_GAP - sizeOf(`label:${frame.id}`, { width: 0, height: 16 }).height - TOOLBAR_GAP - box.height;
                place = "above";
              }
            }
            box.x = Math.max(EDGE, Math.min(box.x, view.width - EDGE - box.width));
            box.y = Math.max(EDGE, Math.min(box.y, view.height - EDGE - box.height));
          } else {
            // Its right end at the frame's visible right end, never past the canvas's left edge.
            box.x = Math.max(EDGE, Math.min(rect.x + rect.width, view.width - EDGE) - box.width);
            if (box.y < EDGE) {
              // No room above: inside the frame's top; a frame whose visible part is too short takes it below.
              box.y = Math.max(EDGE, rect.y + TOOLBAR_GAP);
              place = "inside";
              if (box.y + box.height > rect.y + rect.height - TOOLBAR_GAP) { box.y = rect.y + rect.height + TOOLBAR_GAP; place = "below"; }
            }
          }
        }
        const collides = !pinned && ([...labelBoxes].some(([id, label]) => id !== frame.id && label.width > 0 && overlaps(box, label)) || (title ? overlaps(box, title) : false));
        // A hover toolbar shows only where it fits on the canvas; the selected one only while its frame is on screen.
        const hidden = (rect.width < TOOLBAR_MIN_FRAME && !selected) || collides || !visible(rect) || (!pinned && !onCanvas(box))
          || (draftOnly && !pinned && (beside || hitsFrame(box, frame.id)));
        toolbar.dataset.hidden = hidden ? "true" : "false";
        toolbar.dataset.place = place;
        toolbar.style.transform = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
        // The label stops short of a toolbar on its row (above the frame, or both inside its top).
        const sameRow = labelBox && (place === "above" ? !beside && !labelInside.get(frame.id) : place === "inside" && labelInside.get(frame.id));
        if (!hidden && sameRow) labelRight = Math.min(labelRight, box.x - TOOLBAR_GAP);
      }
      const label = elements.current.get(`label:${frame.id}`);
      if (label) {
        const box = labelBox ?? { x: rect.x, y: rect.y - LABEL_GAP - sizeOf(`label:${frame.id}`, { width: 0, height: 16 }).height, width: 0, height: 0 };
        label.style.transform = `translate(${Math.round(box.x)}px, ${Math.round(box.y)}px)`;
        label.style.maxWidth = `${Math.max(0, Math.round(labelRight - box.x))}px`;
        label.dataset.hidden = labelHidden.get(frame.id) ? "true" : "false";
        label.dataset.place = labelInside.get(frame.id) ? "inside" : "above";
      }
    }
    // 3. The selected frame's right-edge handle: along the frame's visible height, centred on its edge.
    for (const { frame, rect } of placed) {
      const edge = edges.current.get(frame.id);
      if (!edge) continue;
      const top = Math.max(rect.y, 0);
      const bottom = Math.min(rect.y + rect.height, view.height);
      const right = rect.x + rect.width;
      edge.dataset.hidden = bottom - top < 16 || right < 0 || right > view.width ? "true" : "false";
      edge.style.transform = `translate(${Math.round(right)}px, ${Math.round(top)}px)`;
      edge.style.height = `${Math.max(0, Math.round(bottom - top))}px`;
    }
    // 4. Section tabs.
    for (const section of getStudioSections()) {
      const world = sectionRects.current.get(section.id);
      const tab = elements.current.get(`tab:${section.id}`);
      if (!tab || !world) continue;
      const rect = screen(world);
      const size = sizeOf(`tab:${section.id}`, { width: 0, height: 0 });
      const box = { x: rect.x, y: rect.y - TOOLBAR_GAP - size.height, width: size.width, height: size.height };
      tab.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
      tab.dataset.hidden = hitsFrame(box) || [...labelBoxes.values()].some((label) => overlaps(box, label)) ? "true" : "false";
    }
  }, []);

  // Re-measure the world boxes (frames that change size, an example opening a panel, the page reflowing) — never
  // during pan or zoom.
  const measure = useCallback(() => {
    const world = canvasApi.getWorldElement();
    if (!world) return;
    frameRects.current.clear();
    for (const frame of getStudioFrames()) {
      const rect = worldRectOf(frame.element, world);
      if (rect) frameRects.current.set(frame.id, rect);
    }
    sectionRects.current.clear();
    for (const section of getStudioSections()) {
      const rect = worldRectOf(section.element, world);
      if (rect) sectionRects.current.set(section.id, rect);
    }
    const title = world.querySelector<HTMLElement>(".studio-board__title");
    titleRect.current = title ? worldRectOf(title, world) : null;
    layout();
  }, [layout]);

  useLayoutEffect(() => {
    measure();
    const off = canvasApi.onChange(layout);
    const observer = new ResizeObserver(() => measure());
    const world = canvasApi.getWorldElement();
    if (world) {
      observer.observe(world);
      const title = world.querySelector(".studio-board__title");
      if (title) observer.observe(title);
    }
    for (const frame of frames) observer.observe(frame.element);
    for (const section of sections) observer.observe(section.element);
    return () => { off(); observer.disconnect(); };
  }, [frames, sections, layout, measure]);

  // Label, toolbar and tab sizes: measured when they mount or change size, not per pan.
  const sizeObserver = useRef<ResizeObserver | null>(null);
  if (!sizeObserver.current && typeof ResizeObserver !== "undefined") {
    sizeObserver.current = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const key = element.dataset.chromeKey;
        if (!key) continue;
        const next = { width: element.offsetWidth, height: element.offsetHeight };
        const previous = sizes.current.get(key);
        if (!previous || previous.width !== next.width || previous.height !== next.height) { sizes.current.set(key, next); changed = true; }
      }
      if (changed) layout();
    });
  }
  useEffect(() => () => sizeObserver.current?.disconnect(), []);
  // One stable ref callback per element (a new callback each render would detach and re-measure on every hover).
  const refCallbacks = useRef(new Map<string, (node: HTMLElement | null) => void>());
  const track = (key: string) => {
    let callback = refCallbacks.current.get(key);
    if (!callback) {
      callback = (node: HTMLElement | null) => {
        const previous = elements.current.get(key);
        if (previous && previous !== node) { sizeObserver.current?.unobserve(previous); sizes.current.delete(key); elements.current.delete(key); }
        if (node && previous !== node) {
          elements.current.set(key, node);
          sizes.current.set(key, { width: node.offsetWidth, height: node.offsetHeight });
          sizeObserver.current?.observe(node);
        }
      };
      refCallbacks.current.set(key, callback);
    }
    return callback;
  };

  const edgeCallbacks = useRef(new Map<string, (node: HTMLElement | null) => void>());
  const trackEdge = (id: string) => {
    let callback = edgeCallbacks.current.get(id);
    if (!callback) {
      callback = (node: HTMLElement | null) => {
        if (node) edges.current.set(id, node);
        else edges.current.delete(id);
      };
      edgeCallbacks.current.set(id, callback);
    }
    return callback;
  };

  useLayoutEffect(layout, [hovered, menuFrame, selectedFrame, frameSelected, frameDrafts, layout]);

  // Hover is hit-tested from the pointer position (the Select layer covers the frames, so they never see the pointer),
  // in world coordinates against the cached boxes.
  useEffect(() => {
    if (!viewport) return undefined;
    let frame = 0;
    let point: { x: number; y: number } | null = null;
    const update = () => {
      frame = 0;
      if (!point || viewport.dataset.panning === "true") return;
      const box = getViewportBox();
      const { x, y, zoom } = getViewport();
      const worldX = (point.x - box.left - x) / zoom;
      const worldY = (point.y - box.top - y) / zoom;
      const reach = HOVER_REACH / zoom;
      let label: string | null = null;
      const hit = [...getStudioFrames()].reverse().find((entry) => {
        const rect = frameRects.current.get(entry.id);
        if (!rect) return false;
        const inside = worldX >= rect.x && worldX <= rect.x + rect.width && worldY >= rect.y - reach && worldY <= rect.y + rect.height;
        if (inside && worldY < rect.y) label = entry.id;
        return inside;
      });
      setHovered(hit?.id ?? null);
      setLabelHovered(label);
    };
    const onMove = (event: PointerEvent) => { point = { x: event.clientX, y: event.clientY }; if (!frame) frame = requestAnimationFrame(update); };
    const onLeave = () => { point = null; setHovered(null); setLabelHovered(null); };
    viewport.addEventListener("pointermove", onMove, { passive: true });
    viewport.addEventListener("pointerleave", onLeave);
    return () => { viewport.removeEventListener("pointermove", onMove); viewport.removeEventListener("pointerleave", onLeave); cancelAnimationFrame(frame); };
  }, [viewport]);

  // Hovering a frame's name (not its content, where the layers take the hover) outlines the frame (CSS).
  useEffect(() => {
    const entry = frames.find((frame) => frame.id === labelHovered);
    entry?.element.setAttribute("data-hovered", "true");
    return () => entry?.element.removeAttribute("data-hovered");
  }, [labelHovered, frames]);

  const toolbarFor = new Set([hovered, menuFrame, frameSelected ? selectedFrame : null].filter(Boolean) as string[]);
  const draftedFrames = frames.filter((frame) => draftOf(frame.id));
  // A frame with unsaved changes adds its tools on hover only when the whole toolbar fits above it (else the toolbar
  // would move beside the frame or hide, taking Save away from the pointer); selected or with its menu open, always.
  const withTools = (id: string) => {
    if (!toolbarFor.has(id)) return false;
    if (!draftOf(id) || menuFrame === id || (frameSelected && selectedFrame === id)) return true;
    const world = frameRects.current.get(id);
    const draftsWidth = sizes.current.get(`drafts:${id}`)?.width ?? 0;
    const toolsWidth = Math.max(TOOLS_WIDTH, ...[...sizes.current].filter(([key]) => key.startsWith("tools:")).map(([, size]) => size.width));
    return !world || world.width * getViewport().zoom >= draftsWidth + toolsWidth + TOOLBAR_GAP * 2 + LABEL_MIN;
  };

  return (
    <ChromeScope className="studio-frame-chrome">
      {sections.map((section) => (
        <div key={section.id} ref={track(`tab:${section.id}`)} data-chrome-key={`tab:${section.id}`} className="studio-section-tab">
          <span className={typographyStyles["Body/Small/Bold"]}>{section.label}</span>
          <BadgeCounter value={section.count} theme="neutral" background="subtle" />
        </div>
      ))}
      {frames.map((frame) => (
        <button
          key={frame.id}
          ref={track(`label:${frame.id}`)}
          type="button"
          className={`studio-frame-label ${typographyStyles["Caption/Medium"]}`}
          data-chrome-key={`label:${frame.id}`}
          data-selected={selectedFrame === frame.id ? "true" : undefined}
          aria-pressed={frameSelected && selectedFrame === frame.id}
          title={frame.label}
          onClick={() => studioStore.setState({ selection: { kind: "frame", frameId: frame.id } })}
          onFocus={(event) => revealLabel(event.currentTarget)}
          onDoubleClick={() => zoomToFrame(frame.element)}
        >
          <Icon name={frameIcon(frame.id)} size="xs" decorative />
          <span className="studio-frame-label__text">{frame.label}</span>
          {draftOf(frame.id) ? <span className="studio-frame-label__dot" role="img" aria-label="Unsaved changes" /> : null}
        </button>
      ))}
      {frames.filter((frame) => frameSelected && selectedFrame === frame.id).map((frame) => <FrameEdge key={frame.id} frame={frame} setRef={trackEdge(frame.id)} />)}
      {frames.filter((frame) => toolbarFor.has(frame.id) || draftedFrames.includes(frame)).map((frame) => (
        <FrameToolbar
          key={frame.id}
          frame={frame}
          selected={frameSelected && selectedFrame === frame.id}
          menuOpen={menuFrame === frame.id}
          // Shown only for its unsaved changes (not hovered or selected): the Save · Discard group alone.
          tools={withTools(frame.id)}
          draft={draftOf(frame.id)}
          setRef={track(`toolbar:${frame.id}`)}
          setToolsRef={track(`tools:${frame.id}`)}
          setDraftsRef={track(`drafts:${frame.id}`)}
          onMenuOpenChange={(open) => setMenuFrame(open ? frame.id : null)}
        />
      ))}
    </ChromeScope>
  );
}

/** A label that takes keyboard focus off screen (Tab through the frames) pans the canvas to itself. */
function revealLabel(label: HTMLElement) {
  const viewport = canvasApi.getViewportElement();
  if (!viewport) return;
  const rect = label.getBoundingClientRect();
  const box = viewport.getBoundingClientRect();
  if (rect.left >= box.left && rect.top >= box.top && rect.right <= box.right && rect.bottom <= box.bottom) return;
  canvasApi.ensureVisible(rect);
}

/**
 * A frame's unsaved changes: "● 2 changes", then (admins on a writable server) Discard and Save, which act on this
 * frame's changes only (sourceDrafts: the server splits each draft at the frame). Viewers see the count alone.
 */
function FrameDraftActions({ frame, draft, setRef }: { frame: StudioFrameEntry; draft: FrameDraft; setRef: ChromeRef }) {
  const editable = useStudio((state) => canEdit(state));
  const server = useStudioServer();
  const { busy } = useStudioDrafts();
  const writable = editable && server.ready && server.writable;
  const ref = { id: frame.id, label: frame.label };
  const summary = `${plural(draft.changes, "unsaved change")} in ${frame.label} (+${draft.added} −${draft.removed})`;
  return (
    <div ref={setRef} className="studio-frame-drafts" role="group" aria-label={`Unsaved changes in ${frame.label}`} data-chrome-key={`drafts:${frame.id}`}>
      <span className={`studio-frame-drafts__count ${typographyStyles["Caption/Medium"]}`} title={summary}>
        <span className="studio-drafts__dot" aria-hidden="true" />
        <span>{writable ? plural(draft.changes, "change") : "Unsaved"}</span>
      </span>
      {writable ? (
        <>
          <Button appearance="main" level="danger-subtle" size="sm" disabled={busy !== null} aria-label={`Discard the changes in ${frame.label}`} onClick={() => confirmFrameDiscard(ref)}>Discard</Button>
          <Button appearance="main" level="primary" size="sm" disabled={busy !== null} aria-label={`Save the changes in ${frame.label}`} onClick={() => { void requestFrameSave(ref); }}>
            {busy === "save" ? "Saving…" : "Save"}
          </Button>
        </>
      ) : null}
    </div>
  );
}

type ChromeRef = (node: HTMLElement | null) => void;

function FrameToolbar({ frame, selected, menuOpen, tools, draft, setRef, setToolsRef, setDraftsRef, onMenuOpenChange }: { frame: StudioFrameEntry; selected: boolean; menuOpen: boolean; tools: boolean; draft: FrameDraft | null; setRef: ChromeRef; setToolsRef: ChromeRef; setDraftsRef: ChromeRef; onMenuOpenChange: (open: boolean) => void }) {
  const key = useStudio((state) => pageKey(state.page, state.collection, state.localPage));
  const override = useStudio((state) => state.frameOverrides[key]?.[frame.id]);
  const previewTheme = useStudio((state) => state.preview.theme);
  const [copied, setCopied] = useState(false);
  const theme = override?.theme ?? previewTheme;
  const width = resolveFrameWidth(frame.baseWidth, override?.width);
  const presetItems: MenuItemData[] = frameWidthPresets.map((preset) => ({
    id: String(preset.value),
    label: preset.value === "auto" ? `Auto · ${frame.baseWidth}` : preset.label,
    caption: (override?.width ?? "auto") === preset.value ? "Current width" : preset.caption,
    onSelect: () => setFrameOverride(key, frame.id, { width: preset.value as StudioFrameWidth }),
  }));
  // A width dragged on the frame's edge is listed among the presets, in order, as the current one.
  const custom = isCustomFrameWidth(override?.width) ? override.width : null;
  const customAt = custom === null ? -1 : presetItems.findIndex((item, index) => index > 0 && Number(item.id) > custom);
  const widthEntries = custom === null ? presetItems : [
    ...presetItems.slice(0, customAt < 0 ? presetItems.length : customAt),
    { id: "custom", label: String(custom), caption: "Current width · custom" },
    ...(customAt < 0 ? [] : presetItems.slice(customAt)),
  ];
  const widthItems: MenuEntry[] = [{ type: "group", label: "Frame width", items: widthEntries }];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(frame.example?.code ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };
  const example = frame.kind === "example";
  return (
    <div ref={setRef} className="studio-frame-toolbar" role="toolbar" aria-label={`${frame.label} frame`} data-chrome-key={`toolbar:${frame.id}`} data-selected={selected ? "true" : undefined} data-menu={menuOpen ? "true" : undefined} data-drafted={draft ? "true" : undefined} data-tools={tools ? "true" : undefined}>
      {tools ? (
        <div ref={setToolsRef} className="studio-frame-toolbar__tools" data-chrome-key={`tools:${frame.id}`}>
          <Menu
            aria-label="Frame width"
            align="end"
            onOpenChange={onMenuOpenChange}
            items={widthItems}
            trigger={<Button appearance="flat" level="primary" size="sm" endIcon={<Icon name="icon-chevron-down-line" decorative />} aria-label={`Frame width ${width}`}>{String(width)}</Button>}
          />
          <IconButton
            appearance="flat"
            level="primary"
            size="sm"
            aria-label={theme === "dark" ? "Show frame in light mode" : "Show frame in dark mode"}
            icon={<Icon name={theme === "dark" ? "icon-sun-line" : "icon-moon-01-line"} />}
            onClick={() => setFrameOverride(key, frame.id, { theme: theme === "dark" ? "light" : "dark" })}
          />
          <IconButton
            appearance="flat"
            level="primary"
            size="sm"
            aria-label={example ? "Present" : "Zoom to frame"}
            aria-keyshortcuts="F"
            tooltip={example ? "Present full screen (F)" : "Zoom to frame (F)"}
            icon={<Icon name={example ? "icon-play-line" : "icon-zoom-in-line"} />}
            onClick={() => presentFrame(frame.id)}
          />
          {example ? (
            <IconButton
              appearance="flat"
              level="primary"
              size="sm"
              aria-label={copied ? "Code copied" : "Copy code"}
              tooltip={copied ? "Copied" : "Copy code"}
              icon={<Icon name={copied ? "icon-check-line" : "icon-copy-line"} />}
              onClick={copy}
            />
          ) : null}
        </div>
      ) : null}
      {draft && tools ? <span className="studio-frame-toolbar__divider" aria-hidden="true" /> : null}
      {/* Last, so Save keeps its place at the toolbar's right end when the frame tools appear on hover. */}
      {draft ? <FrameDraftActions frame={frame} draft={draft} setRef={setDraftsRef} /> : null}
    </div>
  );
}

/** Screen px of Shift steps and of the drag that starts a resize. */
const WIDTH_STEP = 8;
const EDGE_DRAG_START = 2;

/**
 * The selected frame's right edge (Figma-like): a drag sets a free width (a view setting like the width menu, never
 * source: rounded px, Shift = 8 px steps), shown live as "Width 812"; Escape puts the width back; a double-click goes
 * back to Auto. Pointer-only: the width menu and the Frame inspector are the keyboard path. The new width is announced.
 */
function FrameEdge({ frame, setRef }: { frame: StudioFrameEntry; setRef: ChromeRef }) {
  const key = useStudio((state) => pageKey(state.page, state.collection, state.localPage));
  const [live, setLive] = useState<{ width: number; y: number; side: "right" | "left" } | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const stop = useRef<() => void>(() => undefined);
  useEffect(() => () => stop.current(), []);

  const announce = (text: string) => {
    setAnnouncement("");
    window.setTimeout(() => setAnnouncement(text), 60);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    // The press is the edge's: no selection change, no pan.
    event.preventDefault();
    event.stopPropagation();
    stop.current();
    const captor = event.currentTarget;
    const pointerId = event.pointerId;
    try { captor.setPointerCapture(pointerId); } catch { /* the pointer may already be gone */ }
    const before = studioStore.getState().frameOverrides[key]?.[frame.id]?.width ?? "auto";
    const startWidth = resolveFrameWidth(frame.baseWidth, before);
    const startX = event.clientX;
    let last = { x: event.clientX, y: event.clientY, shift: event.shiftKey };
    let active = false;
    let request = 0;
    let written: number | null = null;
    const apply = () => {
      request = 0;
      const zoom = getViewport().zoom || 1;
      const raw = startWidth + (last.x - startX) / zoom;
      const snapped = last.shift ? Math.round(raw / WIDTH_STEP) * WIDTH_STEP : Math.round(raw);
      const width = Math.min(FRAME_MAX_WIDTH, Math.max(FRAME_MIN_WIDTH, snapped));
      written = width;
      setFrameOverride(key, frame.id, { width: width === frame.baseWidth ? "auto" : width });
      const edge = captor.getBoundingClientRect();
      const canvas = canvasApi.getViewportElement()?.getBoundingClientRect();
      // The label sits right of the edge, or left of it near the canvas's right side.
      setLive({ width, y: Math.max(0, last.y - edge.top), side: canvas && edge.right + 120 > canvas.right ? "left" : "right" });
    };
    const schedule = () => { if (!request) request = requestAnimationFrame(apply); };
    const onMove = (move: PointerEvent) => {
      if (move.pointerId !== pointerId) return;
      last = { x: move.clientX, y: move.clientY, shift: move.shiftKey };
      if (!active && Math.abs(move.clientX - startX) < EDGE_DRAG_START) return;
      active = true;
      schedule();
    };
    const end = (commit: boolean) => {
      stop.current();
      if (!active) return;
      if (commit) {
        apply();
        announce(`Frame width ${written ?? startWidth}`);
      } else {
        setFrameOverride(key, frame.id, { width: before });
        announce(`Frame width back to ${before === "auto" ? `Auto (${frame.baseWidth})` : before}`);
      }
      setLive(null);
    };
    const onUp = (up: PointerEvent) => { if (up.pointerId === pointerId) { last = { x: up.clientX, y: up.clientY, shift: up.shiftKey }; end(true); } };
    const onCancel = (cancel: PointerEvent) => { if (cancel.pointerId === pointerId) end(false); };
    const onKey = (key: KeyboardEvent) => {
      if (key.key === "Escape" && key.type === "keydown") {
        // Escape puts the width back (no parent selection step).
        key.preventDefault();
        key.stopPropagation();
        end(false);
      } else if (key.key === "Shift" && active) {
        last = { ...last, shift: key.type === "keydown" };
        schedule();
      }
    };
    const onBlur = () => end(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    window.addEventListener("blur", onBlur);
    stop.current = () => {
      cancelAnimationFrame(request);
      request = 0;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      window.removeEventListener("blur", onBlur);
      try { if (captor.hasPointerCapture(pointerId)) captor.releasePointerCapture(pointerId); } catch { /* already released */ }
      stop.current = () => undefined;
    };
  };

  const onDoubleClick = () => {
    setFrameOverride(key, frame.id, { width: "auto" });
    announce(`Frame width Auto (${frame.baseWidth})`);
  };

  return (
    <>
      <div ref={setRef} className="studio-frame-edge" aria-hidden="true" data-dragging={live ? "true" : undefined}>
        <div className="studio-frame-edge__hit" onPointerDown={onPointerDown} onDoubleClick={onDoubleClick} onContextMenu={(event) => event.preventDefault()} />
        {live ? <span className={`studio-frame-edge__label ${typographyStyles["Caption/Medium"]}`} data-side={live.side} style={{ transform: `translateY(${Math.round(live.y)}px)` }}>{`Width ${live.width}`}</span> : null}
      </div>
      <VisuallyHidden role="status" aria-live="polite">{announcement}</VisuallyHidden>
    </>
  );
}

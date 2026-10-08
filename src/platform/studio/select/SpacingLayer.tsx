import { useCallback, useContext, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Popover, useAnchoredPosition, type PopoverItemData } from "../../../components/Popover";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi, useStudioServer } from "../api";
import { canvasApi } from "../canvas/viewport";
import { inspectorStatus } from "../inspector/status";
import { ChromePortalContext, ChromeScope } from "../shell/ChromeScope";
import { canEdit, studioStore, useStudio } from "../store";
import type { EditOp, SourceElement } from "../types";
import { onSourceUpdate } from "./picker";
import { liveSrc, noteEditTarget } from "./remap";
import { areaLabel, areaState, fitColumn, freeLabel, kebab, tokenPx, type AreaState, type Box, type SpacingArea, type SpacingOwner } from "./spacing";
import { useSpacingHover } from "./spacingHover";

/*
 * The selected layout's padding and gap areas on the canvas (Figma-like). Each area is tinted; above the capture layer
 * it takes the pointer: hover shows its token ("gap · md · 16"), a click opens the spacing scale right there and writes
 * the choice to the source (setProp / removeProp through applyEdit). Alt+click on a padding edits `padding` on every
 * side. A value bound to an expression or a spread shows a read-only note; Viewer, or no writable dev server, gets the
 * label only. The areas are not tab stops: keyboard users edit spacing in the inspector's Layout section.
 * A Grid column wider than its only item shows its free space ("column 1 · 80 free", only where the source sizes that
 * column in px): a click offers Fit column to content, which writes the column at the item's width.
 * A spacing field hovered or focused in the inspector (spacingHover) emphasises the areas its prop sets, labelled with
 * the step it names; a 0 side or gap (`none`) is a thin band that shows only while hovered (spacing.ts ZERO_BAND).
 */

type Props = {
  areas: SpacingArea[];
  owner: SpacingOwner | null;
  /** Select tool, not presenting: the areas take the pointer. */
  interactive: boolean;
  viewport: HTMLElement | null;
  /** A press the areas do not use (⌘/Ctrl/Shift, read-only areas) goes to the capture layer's selection logic. */
  onPassPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onPassPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  /** A double-click on a read-only area drills in as it would on the canvas. */
  onPassDoubleClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
};

/** The open picker (or read-only note): which area, which prop, and a small anchor box inside the area (at the click). */
type OpenState = { src: string; index: number; kind: SpacingArea["kind"]; side: SpacingArea["side"]; prop: string; alt: boolean; mode: "picker" | "note" | "fit"; area: Box; anchor: Box };

const RESET = "__reset";
const FIT = "__fit";
const ANCHOR = 16;

const formatPx = (px: number) => (Number.isInteger(px) ? String(px) : px.toFixed(1));
const boxStyle = (box: Box) => ({ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h });

/** The owner's JSX element as the dev server reads it, refreshed after source updates, undo and redo. */
function useOwnerSource(src: string | null, enabled: boolean): SourceElement | null {
  const [read, setRead] = useState<{ src: string; element: SourceElement | null } | null>(null);
  const [version, setVersion] = useState(0);
  const undo = useStudio((state) => state.undo.length);
  const redo = useStudio((state) => state.redo.length);
  useEffect(() => onSourceUpdate(() => setVersion((value) => value + 1)), []);
  useEffect(() => {
    const parsed = enabled && src ? parseSrc(src) : null;
    if (!parsed || !src) return undefined;
    // Right after a write (an undo, a slot Clear) the canvas still shows the render before it, so a `src` read from it
    // may name a place the file no longer has (GET /element 404 on a cleared host): it is read where the write put it.
    const live = liveSrc(src);
    const at = live ? parseSrc(live) : null;
    if (!at) return undefined;
    let alive = true;
    void studioApi.element(at.file, at.loc).then((element) => { if (alive) setRead({ src, element }); });
    return () => { alive = false; };
  }, [src, enabled, version, undo, redo]);
  return read && read.src === src ? read.element : null;
}

export function SpacingLayer({ areas: measured, owner, interactive, viewport, onPassPointerDown, onPassPointerMove, onPassDoubleClick }: Props) {
  const role = useStudio((state) => state.role);
  const server = useStudioServer();
  const writable = canEdit() && role === "admin" && server.writable;
  const chromePortal = useContext(ChromePortalContext);
  const element = useOwnerSource(owner?.src ?? null, Boolean(owner?.editable));
  const attributes = element && owner && element.name === owner.name ? element.attributes : null;
  // Free space shows only where Fit column to content can write the column (the source sizes it in px).
  const areas = useMemo(() => (owner ? measured.filter((area) => area.kind !== "free" || fitColumn(area, owner, attributes)) : measured), [measured, owner, attributes]);
  const [hovered, setHovered] = useState<number | null>(null);
  const [alt, setAlt] = useState(false);
  const [open, setOpen] = useState<OpenState | null>(null);
  const fieldHover = useSpacingHover();
  const anchorRef = useRef<HTMLDivElement>(null);
  const src = owner?.src ?? null;

  const close = useCallback((focusCanvas = false) => {
    setOpen(null);
    if (focusCanvas) viewport?.focus({ preventScroll: true });
  }, [viewport]);

  // A new selection, another tool, a pan or zoom: the picker and the hover go away.
  useEffect(() => { setHovered(null); setOpen(null); }, [src, interactive]);
  useEffect(() => (open ? canvasApi.onChange(() => setOpen(null)) : undefined), [open]);

  // Alt pressed or released while hovering an area: the label follows (padding on every side).
  useEffect(() => {
    if (hovered === null) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Alt") setAlt(event.type === "keydown"); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKey);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("keyup", onKey); };
  }, [hovered]);

  // The open area as rendered now (it follows scrolling and re-renders), else where it was when opened.
  const openArea = open && open.src === src ? areas[open.index] : undefined;
  const liveArea = openArea && open && openArea.kind === open.kind && openArea.side === open.side ? openArea : null;
  const anchor: Box | null = open ? (liveArea ? { ...open.anchor, x: liveArea.x + (open.anchor.x - open.area.x), y: liveArea.y + (open.anchor.y - open.area.y) } : open.anchor) : null;
  const openState: AreaState | null = useMemo(() => {
    if (!open || !owner || open.src !== owner.src || open.mode === "fit") return null;
    const area = liveArea ?? areas.find((candidate) => candidate.kind === open.kind && candidate.side === open.side) ?? null;
    return area ? areaState(area, owner, attributes, open.alt) : null;
  }, [open, owner, liveArea, areas, attributes]);

  const writeOps = useCallback(async (ops: EditOp[], label: string) => {
    const parsed = owner ? parseSrc(owner.src) : null;
    if (!parsed || !owner) return;
    const done = noteEditTarget(`${parsed.file}:${parsed.loc}`);
    try {
      // Read the element again: the write carries the file's current hash, and a moved element is never written.
      const fresh = await studioApi.element(parsed.file, parsed.loc);
      if (!fresh || fresh.name !== owner.name) {
        inspectorStatus.set("negative", `${owner.name} moved before the change was saved; nothing was written`);
        return;
      }
      await applyEdit({ file: parsed.file, loc: parsed.loc, name: fresh.name, ops, hash: fresh.hash }, label);
    } finally {
      done();
    }
  }, [owner]);

  // The open free area's fix (Fit column to content), as the source reads now.
  const openFit = useMemo(() => {
    if (!open || open.mode !== "fit" || !owner || open.src !== owner.src) return null;
    return liveArea ? fitColumn(liveArea, owner, attributes) : null;
  }, [open, owner, liveArea, attributes]);

  const choose = useCallback((item: PopoverItemData) => {
    if (open?.mode === "fit") {
      close(true);
      if (item.id === FIT && openFit && owner) void writeOps(openFit.ops, openFit.label);
      return;
    }
    if (!open || !openState || !owner) return;
    const prop = open.prop;
    close(true);
    if (item.id === RESET) {
      void writeOps([{ op: "removeProp", name: prop }], `${owner.name} reset ${prop}`);
      return;
    }
    // The step it already has (written, or the default it shows) is no change.
    if (!openState.clears.length && !openState.mixed && item.id === openState.key) return;
    // Alt: `padding` on every side, so the side props written beside it are removed in the same edit (one undo step).
    const ops: EditOp[] = [{ op: "setProp", name: prop, value: { kind: "string", value: item.id } }, ...openState.clears.map((name): EditOp => ({ op: "removeProp", name }))];
    const label = `${owner.name} ${prop} → "${item.id}"${openState.clears.length ? " (all sides)" : ""}`;
    void writeOps(ops, label);
  }, [open, openState, openFit, owner, close, writeOps]);

  const onPickerKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" && event.key !== "Tab") return;
    // Escape (and Tab out of the list) closes it and gives the canvas its focus back; no parent selection step.
    event.preventDefault();
    event.stopPropagation();
    close(true);
  }, [close]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>, index: number) => {
    const area = areas[index];
    if (event.button !== 0 || !area || !owner) return;
    const fit = area.kind === "free" ? fitColumn(area, owner, attributes) : null;
    const state = areaState(area, owner, attributes, event.altKey);
    const usable = writable && interactive && Boolean(attributes) && (area.kind === "free" ? Boolean(fit) : Boolean(state.prop));
    if (!usable || event.metaKey || event.ctrlKey || event.shiftKey) {
      onPassPointerDown(event);
      return;
    }
    // The press is the area's: no selection change, no pan, no light dismiss of the picker it opens.
    event.preventDefault();
    event.stopPropagation();
    if (open && open.src === owner.src && open.index === index && open.prop === (area.kind === "free" ? "columns" : state.prop)) return;
    const root = event.currentTarget.parentElement?.getBoundingClientRect();
    const pointX = event.clientX - (root?.left ?? 0);
    const pointY = event.clientY - (root?.top ?? 0);
    const w = Math.min(ANCHOR, area.w);
    const h = Math.min(ANCHOR, area.h);
    const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));
    const anchorBox = { x: clamp(pointX - w / 2, area.x, area.x + area.w - w), y: clamp(pointY - h / 2, area.y, area.y + area.h - h), w, h };
    const mode = area.kind === "free" ? "fit" : state.bound ? "note" : "picker";
    setOpen({ src: owner.src, index, kind: area.kind, side: area.side, prop: area.kind === "free" ? "columns" : state.prop!, alt: event.altKey, mode, area: { x: area.x, y: area.y, w: area.w, h: area.h }, anchor: anchorBox });
  };

  if (!areas.length || !owner) return null;
  // The inspector's hovered spacing field: the areas its prop sets (a side prop, or `padding` on every side via Alt).
  const emphasis = fieldHover && fieldHover.src === owner.src ? fieldHover : null;
  const emphasised = (area: SpacingArea) => Boolean(emphasis && area.kind !== "free" && (area.props.includes(emphasis.prop) || area.altProp === emphasis.prop));
  const fieldArea = emphasis && hovered === null && !open ? areas.find(emphasised) : undefined;
  const pillArea = hovered !== null && !(open && open.index === hovered) ? areas[hovered] : fieldArea;
  const pillState = pillArea ? areaState(pillArea, owner, attributes, alt) : null;
  const pillText = pillArea === fieldArea && fieldArea && emphasis
    ? fieldLabel(fieldArea, owner, emphasis.prop, emphasis.key ?? null, pillState)
    : pillArea && pillState ? (pillArea.kind === "free" ? freeLabel(pillArea) : areaLabel(pillArea, pillState)) : null;
  const openIndex = open && open.src === owner.src ? open.index : null;

  const items: PopoverItemData[] = openState && open?.mode === "picker" ? [
    ...openState.options.map((option) => ({
      id: option.key,
      label: (
        <span className="studio-spacing__option">
          <span>{option.key}</span>
          <span className={`studio-spacing__px ${typographyStyles["Body/Small/Regular"]}`}>{option.px === null ? "" : ` ${formatPx(option.px)}px`}</span>
        </span>
      ),
      selected: option.key === openState.key,
    })),
    ...(openState.value?.state === "literal" ? [{ id: RESET, label: "Reset to default" }] : []),
  ] : openFit && open?.mode === "fit" ? [{
    id: FIT,
    label: (
      <span className="studio-spacing__option">
        <span>Fit column to content</span>
        <span className={`studio-spacing__px ${typographyStyles["Body/Small/Regular"]}`}>{` ${formatPx(openFit.px)}px`}</span>
      </span>
    ),
  }] : [];

  return (
    <>
      {areas.map((area, index) => (
        <div
          key={`t${index}`}
          className={area.kind === "gap" ? "studio-selection__gap" : area.kind === "free" ? "studio-selection__free" : "studio-selection__padding"}
          data-hover={hovered === index || openIndex === index ? "true" : undefined}
          data-zero={area.zero ? "true" : undefined}
          data-emphasis={emphasised(area) ? "true" : undefined}
          style={boxStyle(area)}
        />
      ))}
      {interactive ? areas.map((area, index) => (
        <div
          key={`h${index}`}
          className="studio-selection__spacing-hit"
          data-editable={writable && owner.editable && (area.props.length || area.kind === "free") ? "true" : undefined}
          style={boxStyle(area)}
          onPointerEnter={(event) => { setHovered(index); setAlt(event.altKey); }}
          onPointerLeave={() => setHovered((current) => (current === index ? null : current))}
          onPointerMove={(event) => { if (event.altKey !== alt) setAlt(event.altKey); onPassPointerMove(event); }}
          onPointerDown={(event) => onPointerDown(event, index)}
          onDoubleClick={(event) => { if (!(writable && owner.editable && (area.props.length || area.kind === "free"))) onPassDoubleClick(event); }}
          onContextMenu={(event) => event.preventDefault()}
        />
      )) : null}
      {pillArea && pillText ? (
        <span className={`studio-selection__spacing-label ${typographyStyles["Caption/Medium"]}`} style={{ transform: `translate(${pillArea.x + pillArea.w / 2}px, ${pillArea.y + pillArea.h / 2}px) translate(-50%, -50%)` }}>
          {pillText}
        </span>
      ) : null}
      {anchor ? <div ref={anchorRef} className="studio-selection__spacing-anchor" style={boxStyle(anchor)} /> : null}
      {open && (openState || openFit) && anchor && chromePortal ? createPortal(
        <ChromeScope className="studio-spacing-scope">
          {open.mode === "fit" && openFit ? (
            <Popover
              open
              onOpenChange={(next) => { if (!next) close(); }}
              anchorRef={anchorRef}
              className="studio-spacing-picker"
              label={`${owner.name} · column ${(liveArea?.column?.index ?? 0) + 1}`}
              items={items}
              autoFocus
              onSelect={choose}
              onKeyDown={onPickerKeyDown}
            />
          ) : open.mode === "picker" && openState ? (
            <Popover
              open
              onOpenChange={(next) => { if (!next) close(); }}
              anchorRef={anchorRef}
              className="studio-spacing-picker"
              label={`${owner.name} · ${kebab(open.prop)}${openState.clears.length || (open.alt && openState.mixed) ? " (all sides)" : ""}`}
              items={items}
              autoFocus
              onSelect={choose}
              onKeyDown={onPickerKeyDown}
            />
          ) : openState ? (
            <SpacingNote owner={owner} state={openState} anchorRef={anchorRef} onClose={close} />
          ) : null}
        </ChromeScope>,
        chromePortal,
      ) : null}
    </>
  );
}

/** The pill for an inspector field's hover: "gap · lg · 24" for the step it names, else the area as it is now. */
function fieldLabel(area: SpacingArea, owner: SpacingOwner, prop: string, key: string | null, state: AreaState | null): string | null {
  if (!key) return state ? areaLabel(area, state) : null;
  const px = tokenPx(owner.host, area.scale, key);
  return [kebab(prop), key, px === null ? null : formatPx(px)].filter(Boolean).join(" · ");
}

/** A bound value: what the source passes, instead of the picker. Escape or a press elsewhere closes it. */
function SpacingNote({ owner, state, anchorRef, onClose }: { owner: SpacingOwner; state: AreaState; anchorRef: RefObject<HTMLDivElement | null>; onClose: (focusCanvas?: boolean) => void }) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const placement = useAnchoredPosition(surfaceRef, true, { anchor: () => anchorRef.current });
  const inPlayground = studioStore.getState().selection?.kind === "node" && Boolean((studioStore.getState().selection as { panelId?: string | null }).panelId);
  useEffect(() => {
    const onDown = (event: PointerEvent) => { if (!surfaceRef.current?.contains(event.target as Node)) onClose(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose(true);
    };
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("pointerdown", onDown, true); window.removeEventListener("keydown", onKey, true); };
  }, [onClose]);
  const value = state.boundBy?.value ?? state.value;
  const prop = state.boundBy?.prop ?? state.prop ?? "";
  const source = value?.state === "bound" ? `{${value.expression}}` : value?.state === "spread" ? value.via : "";
  return (
    <div ref={surfaceRef} className="studio-spacing-note" role="status" style={placement.style} data-side={placement.side}>
      <p className={typographyStyles["Body/Small/Medium"]}>
        {`${owner.name} ${kebab(prop)} `}
        {value?.state === "spread" ? "comes from " : "is bound to "}
        <code className={typographyStyles["Body/Code/Regular"]}>{source}</code>
      </p>
      <p className={`studio-spacing-note__hint ${typographyStyles["Caption/Regular"]}`}>
        {inPlayground ? "Change it with the Playground properties." : "Change it in the source, where the value is computed."}
      </p>
    </div>
  );
}

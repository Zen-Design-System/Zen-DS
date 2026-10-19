import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent as ReactPointerEvent } from "react";
import { cropOf, imageFillStyle, type ImageCrop } from "../../../components/_shared/image-fill";
import { moved, scaled, type Corner } from "./cropModel";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi } from "../api";
import { getViewport } from "../canvas/viewport";
import { canEdit, useStudio } from "../store";
import type { EditOp } from "../types";
import { hitForHost, type FiberHit } from "../select/picker";
import type { Box } from "../select/spacing";
import "./crop.css";

/*
 * Figma's crop on the canvas (Studio parity F8b): with a layer's image fill in Crop (a rectangle Shape or a frame), the
 * whole picture shows faint around the layer; drag it to move what the layer shows, drag a corner of the picture to
 * scale it (its ratio kept, the opposite corner still). The layer keeps its place and size, as Figma's crop window.
 * The picture follows the pointer live; a release writes `imageCrop` once (one edit, one ⌘Z); Esc while dragging puts
 * it back. Crop mode starts when Image fit is set to Crop or with the Image row's Crop button, and ends with Esc,
 * Enter or another selection.
 */

let cropping: string | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
/** Crop mode on the layer `src` (the Image row's Crop, Image fit → Crop). */
export const startCrop = (src: string) => { cropping = src; emit(); };
export const endCrop = () => { if (cropping) { cropping = null; emit(); } };
const useCropping = () => useSyncExternalStore((listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => cropping, () => null);
/** Whether crop mode is on (the layer's resize handles step aside: the crop's corners are where they were). */
export const useCropActive = () => useCropping() !== null;

type Drag = { kind: "move" | Corner; pointerId: number; x: number; y: number; crop0: ImageCrop; crop: ImageCrop; vars: Record<string, string>; stopKeys: () => void };

const VARS = ["--zen-image-size", "--zen-image-position"] as const;

export function CropHandles({ box, hit, interactive, viewport }: { box: Box | null; hit: FiberHit | null; interactive: boolean; viewport: HTMLElement | null }) {
  const editable = useStudio((state) => canEdit(state) && Boolean(state.localPage));
  const active = useCropping();
  const dragRef = useRef<Drag | null>(null);
  const [live, setLive] = useState<ImageCrop | null>(null);
  const host = hit?.hosts[0];
  // Another selection ends crop mode; Esc and Enter end it too.
  useEffect(() => { if (active && hit?.src !== active) endCrop(); }, [active, hit?.src]);
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if ((event.key !== "Escape" && event.key !== "Enter") || dragRef.current) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      endCrop();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [active]);
  // The layer repaints when its crop is written (or undone): read its props again then.
  const [, repaint] = useState(0);
  useEffect(() => {
    if (!(host instanceof HTMLElement)) return undefined;
    const observer = new MutationObserver(() => repaint((count) => count + 1));
    observer.observe(host, { attributes: true, attributeFilter: ["style", "data-image"] });
    return () => observer.disconnect();
  }, [host]);
  const props = (host && hit ? hitForHost(host, hit.name)?.props : null) ?? hit?.props ?? {};
  const crop = live ?? cropOf(props.imageCrop);
  if (!box || !hit || !interactive || !editable || !viewport || active !== hit.src || !(host instanceof HTMLElement)) return null;
  if (props.imageFit !== "crop" || !crop || typeof props.image !== "string" || host.getAttribute("data-image") !== "crop") return null;
  if ((typeof props.rotation === "number" && props.rotation % 360) || props.flip) return null;
  const zoom = getViewport().zoom || 1;
  const view = viewport.getBoundingClientRect();
  const rect = host.getBoundingClientRect();
  const window_ = { left: rect.left - view.left, top: rect.top - view.top, w: rect.width, h: rect.height };
  const width = window_.w / (crop.width / 100);
  const height = window_.h / (crop.height / 100);
  const picture = { left: window_.left - (crop.x / 100) * width, top: window_.top - (crop.y / 100) * height, width, height };
  const src = getComputedStyle(host).getPropertyValue("--zen-image-fill").trim();

  /** Shows `next` on the layer itself while dragging (its CSS reads the custom properties). */
  const paint = (next: ImageCrop) => {
    const { vars } = imageFillStyle({ image: "x", imageFit: "crop", imageCrop: next });
    for (const name of VARS) host.style.setProperty(name, vars[name] ?? "");
  };
  const restore = (drag: Drag) => { for (const name of VARS) host.style.setProperty(name, drag.vars[name] ?? ""); };

  const onDown = (event: ReactPointerEvent<HTMLDivElement>, kind: Drag["kind"]) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const vars = Object.fromEntries(VARS.map((name) => [name, host.style.getPropertyValue(name)]));
    const onEscape = (key: KeyboardEvent) => {
      const drag = dragRef.current;
      if (key.key !== "Escape" || !drag) return;
      key.preventDefault();
      key.stopImmediatePropagation();
      dragRef.current = null;
      drag.stopKeys();
      restore(drag);
      setLive(null);
    };
    window.addEventListener("keydown", onEscape, true);
    dragRef.current = { kind, pointerId: event.pointerId, x: event.clientX, y: event.clientY, crop0: crop, crop, vars, stopKeys: () => window.removeEventListener("keydown", onEscape, true) };
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    const next = drag.kind === "move" ? moved(drag.crop0, dx, dy, window_) : scaled(drag.crop0, drag.kind, dx, dy, window_);
    drag.crop = next;
    paint(next);
    setLive(next);
  };
  const finish = (event: ReactPointerEvent<HTMLDivElement>, keep: boolean) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    drag.stopKeys();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const same = JSON.stringify(drag.crop) === JSON.stringify(drag.crop0);
    const at = parseSrc(hit.src);
    if (!keep || same || !at) { restore(drag); setLive(null); return; }
    const { x, y, width: w, height: h } = drag.crop;
    const ops: EditOp[] = [{ op: "setProp", name: "imageCrop", value: { kind: "expression", code: `{ x: ${x}, y: ${y}, width: ${w}, height: ${h} }` } }];
    void studioApi.element(at.file, at.loc).then(async (element) => {
      const response = element ? await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops, hash: element.hash }, drag.kind === "move" ? "Move image" : "Scale image") : null;
      if (!response?.ok) restore(drag);
      setLive(null);
    });
  };
  const corner = (kind: Corner, x: number, y: number) => (
    <div
      key={kind}
      className="studio-crop__handle"
      data-corner={kind}
      aria-hidden="true"
      style={{ transform: `translate(${x}px, ${y}px)` }}
      onPointerDown={(event) => onDown(event, kind)}
      onPointerMove={onMove}
      onPointerUp={(event) => finish(event, true)}
      onPointerCancel={(event) => finish(event, false)}
    />
  );
  const { left, top } = picture;
  return (
    <>
      <div
        className="studio-crop__picture"
        data-dragging={dragRef.current ? "true" : undefined}
        aria-hidden="true"
        style={{ transform: `translate(${left}px, ${top}px)`, width: picture.width, height: picture.height, backgroundImage: src || undefined }}
        onPointerDown={(event) => onDown(event, "move")}
        onPointerMove={onMove}
        onPointerUp={(event) => finish(event, true)}
        onPointerCancel={(event) => finish(event, false)}
      />
      {corner("nw", left, top)}
      {corner("ne", left + picture.width, top)}
      {corner("se", left + picture.width, top + picture.height)}
      {corner("sw", left, top + picture.height)}
      <span className={`studio-crop__pill ${typographyStyles["Caption/Medium"]}`} style={{ transform: `translate(${window_.left}px, ${window_.top + window_.h}px)` }}>
        Crop · {Math.round(crop.width)} × {Math.round(crop.height)}% · zoom {Math.round(zoom * 100)}% · Esc to finish
      </span>
    </>
  );
}


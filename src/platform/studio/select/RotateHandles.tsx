import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi } from "../api";
import { normalizeTurn, turnOps, type Flip } from "../position/positionModel";
import { canEdit, useStudio } from "../store";
import { isLockedSrc } from "./layerMeta";
import type { FiberHit } from "./picker";
import type { Box } from "./spacing";
import "./rotate-handles.css";

/*
 * Figma's rotate handles (plan docs/research/studio-figma-design-parity-2026-10-18.md F2): just outside each corner of a
 * selected frame (Box, Stack, Grid) or shape, a drag turns the layer about its centre; ⇧ steps by 15°; Esc puts it
 * back. The layer follows the pointer live (its own `rotate`), a pill says the angle, and the release writes the
 * rotation once (Session B's turnOps: Figma's default 0° leaves the code, the flip is kept). One edit, one ⌘Z.
 */

const TURNABLE = new Set(["Box", "Stack", "Grid", "Shape"]);
/** Screen px: each zone's size, and how far outside its corner it starts. */
const ZONE = 16;
const OUTSIDE = 4;
const CORNERS = [["nw", 0, 0], ["ne", 1, 0], ["sw", 0, 1], ["se", 1, 1]] as const;

type Turn = { pointerId: number; centre: { x: number; y: number }; from: number; start: number; now: number; host: HTMLElement; was: string; flip: Flip | undefined; stopKeys: () => void };

const degrees = (x: number, y: number) => (Math.atan2(y, x) * 180) / Math.PI;
const baseName = (name: string) => name.slice(name.lastIndexOf(".") + 1);

export function RotateHandles({ box, hit, interactive, viewport }: { box: Box | null; hit: FiberHit | null; interactive: boolean; viewport: HTMLElement | null }) {
  const role = useStudio((state) => state.role);
  const turnRef = useRef<Turn | null>(null);
  const [live, setLive] = useState<{ angle: number; x: number; y: number } | null>(null);
  const host = hit?.hosts[0] instanceof HTMLElement ? hit.hosts[0] : null;
  if (!box || !hit || !host || !interactive || role !== "admin" || !canEdit() || !TURNABLE.has(baseName(hit.name)) || isLockedSrc(hit.src)) return null;
  const line = hit.props.type === "line" || hit.props.type === "arrow";

  const restore = (turn: Turn) => { turn.host.style.rotate = turn.was; };
  const down = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = host.getBoundingClientRect();
    const centre = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const start = Number(hit.props.rotation ?? 0) || 0;
    const flip = typeof hit.props.flip === "string" ? (hit.props.flip as Flip) : undefined;
    const onKey = (key: KeyboardEvent) => {
      if (key.key !== "Escape" || !turnRef.current) return;
      key.preventDefault();
      key.stopImmediatePropagation();
      restore(turnRef.current);
      turnRef.current.stopKeys();
      turnRef.current = null;
      setLive(null);
    };
    window.addEventListener("keydown", onKey, true);
    turnRef.current = { pointerId: event.pointerId, centre, from: degrees(event.clientX - centre.x, event.clientY - centre.y), start, now: start, host, was: host.style.rotate, flip, stopKeys: () => window.removeEventListener("keydown", onKey, true) };
  };
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    const turn = turnRef.current;
    if (!turn || turn.pointerId !== event.pointerId) return;
    // CSS turns clockwise on the screen; Figma's rotation counts counter-clockwise.
    const swept = degrees(event.clientX - turn.centre.x, event.clientY - turn.centre.y) - turn.from;
    let next = turn.start - swept;
    if (event.shiftKey) next = Math.round(next / 15) * 15;
    next = normalizeTurn(Math.round(next * 100) / 100);
    turn.now = next;
    turn.host.style.rotate = `${-next}deg`;
    const view = viewport?.getBoundingClientRect();
    setLive({ angle: next, x: event.clientX - (view?.left ?? 0), y: event.clientY - (view?.top ?? 0) });
  };
  const up = (event: ReactPointerEvent<HTMLDivElement>) => {
    const turn = turnRef.current;
    if (!turn || turn.pointerId !== event.pointerId) return;
    turnRef.current = null;
    turn.stopKeys();
    setLive(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (turn.now === turn.start) { restore(turn); return; }
    const at = parseSrc(hit.src);
    if (!at) { restore(turn); return; }
    void studioApi.element(at.file, at.loc).then(async (element) => {
      if (!element) { restore(turn); return; }
      const written = new Set(element.attributes.map((attr) => attr.name));
      const ops = turnOps({ rotation: turn.now, flip: turn.flip }).filter((op) => op.op !== "removeProp" || written.has(op.name));
      const response = await applyEdit({ file: at.file, loc: at.loc, name: element.name, ops, hash: element.hash }, `Rotate ${baseName(hit.name)} → ${turn.now}°`);
      restore(turn);
      if (!response.ok) return;
    });
  };

  return (
    <>
      {CORNERS.map(([id, sx, sy]) => (
        <div
          key={id}
          className="studio-rotate__zone"
          data-corner={id}
          data-e2e={`rotate-${id}`}
          aria-hidden="true"
          // A line's ends are its own handles (ResizeLayer): its turn is its rotation field.
          hidden={line}
          style={{ transform: `translate(${box.x + sx * box.w + (sx ? OUTSIDE : -OUTSIDE - ZONE)}px, ${box.y + sy * box.h + (sy ? OUTSIDE : -OUTSIDE - ZONE)}px)`, width: ZONE, height: ZONE }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      ))}
      {live ? <span className={`studio-rotate__pill ${typographyStyles["Caption/Medium"]}`} style={{ transform: `translate(${live.x + 12}px, ${live.y + 12}px)` }}>{`${live.angle}°`}</span> : null}
    </>
  );
}

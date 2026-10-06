import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useIconTooltip } from "../../../../components/Tooltip";
import type { EditOp } from "../../types";
import "./controls.css";
import { alignResetOps, alignView, autoOps, AXIS, baselineOps, cellOps, laneAlignOps, laneJustifyOps, type AxisValue, type Written } from "../layoutModel";

/*
 * Alignment box v2 (spec docs/research/studio-inspector-redesign-2026-10-03.md, Phase 4; Figma UI3's alignment control):
 * a 3×3 radiogroup over align (cross axis) and justify (main axis), axes swapped by direction. The chosen cell shows
 * three bars across the flow; hovering shows them as a ghost; unset shows the effective cell in the default tone. Auto
 * (justify between) collapses it to three cross-axis lanes; a stretched (or baseline) cross axis to three main-axis
 * lanes. Keys: arrows move a pending mark and write once on release; W/A/S/D jump to an edge; X toggles Auto; B toggles
 * Text baseline (rows); ⌫ resets; Esc drops the pending mark. One write per gesture (`onOps`, one apply).
 */

type Target = {
  /** Grid placement (1-based) and span: a cell is 1×1, a lane spans the box along one axis. */
  row: number;
  column: number;
  rows: number;
  columns: number;
  label: string;
  tip: string;
  ops: () => EditOp[];
  /** Where its bars sit: a cell's align/justify, or a lane's spread. */
  align: AxisValue | "stretch";
  justify: AxisValue | "spread";
};

const VERTICAL = ["Top", "Middle", "Bottom"];
const HORIZONTAL = ["left", "center", "right"];
const LANE_VERTICAL = ["Top", "Middle", "Bottom"];
const LANE_HORIZONTAL = ["Left", "Center", "Right"];

/** The box's targets for what the source writes (cells, cross lanes in Auto, main lanes while the cross axis stretches). */
function targetsOf(w: Written): { kind: "cells" | "cross-lanes" | "main-lanes"; targets: Target[] } {
  const view = alignView(w);
  const row = view.row;
  if (view.auto) {
    // Cross lanes: rows stack three horizontal lanes (align = vertical position); columns three vertical lanes.
    return {
      kind: "cross-lanes",
      targets: AXIS.map((align, index) => ({
        row: row ? index + 1 : 1, column: row ? 1 : index + 1, rows: row ? 1 : 3, columns: row ? 3 : 1,
        label: (row ? LANE_VERTICAL : LANE_HORIZONTAL)[index],
        tip: `${(row ? LANE_VERTICAL : LANE_HORIZONTAL)[index]} · align ${align}, space between`,
        ops: () => laneAlignOps(w, align), align, justify: "spread",
      })),
    };
  }
  if (view.cross !== "position") {
    // Main lanes: the cross axis is decided (stretch, baseline); the lanes choose justify.
    return {
      kind: "main-lanes",
      targets: AXIS.map((justify, index) => ({
        row: row ? 1 : index + 1, column: row ? index + 1 : 1, rows: row ? 3 : 1, columns: row ? 1 : 3,
        label: (row ? LANE_HORIZONTAL : LANE_VERTICAL)[index],
        tip: `${(row ? LANE_HORIZONTAL : LANE_VERTICAL)[index]} · justify ${justify}, ${view.cross === "baseline" ? "text baseline" : "stretched"}`,
        ops: () => laneJustifyOps(w, justify), align: "stretch", justify,
      })),
    };
  }
  return {
    kind: "cells",
    targets: [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => {
      const align = row ? AXIS[r] : AXIS[c];
      const justify = row ? AXIS[c] : AXIS[r];
      return { row: r + 1, column: c + 1, rows: 1, columns: 1, label: `${VERTICAL[r]} ${HORIZONTAL[c]}`, tip: `${VERTICAL[r]} ${HORIZONTAL[c]} · align ${align}, justify ${justify}`, ops: () => cellOps(w, align, justify), align, justify };
    })),
  };
}

/** Which target renders now (the written values, else the defaults). */
function currentIndex(w: Written, kind: string, targets: Target[]): number {
  const view = alignView(w);
  if (kind === "cross-lanes") return targets.findIndex((target) => target.align === view.align);
  if (kind === "main-lanes") return targets.findIndex((target) => target.justify === view.justify);
  return targets.findIndex((target) => target.align === view.align && target.justify === view.justify);
}

/** Three bars of unequal length (Figma's alignment marks), placed as the items would be. */
function Bars({ row, align, justify }: { row: boolean; align: Target["align"]; justify: Target["justify"] }) {
  return (
    <span className="studio-align-box__bars" data-flow={row ? "row" : "column"} data-align={align} data-justify={justify} aria-hidden="true">
      <span /><span /><span />
    </span>
  );
}

function TargetButton({ target, index, active, checked, mark, row, disabled, onPick, register }: {
  target: Target; index: number; active: boolean; checked: boolean; mark: "chosen" | "default" | null; row: boolean; disabled: boolean;
  onPick: (index: number) => void; register: (index: number, node: HTMLButtonElement | null) => void;
}) {
  const tip = useIconTooltip(target.tip);
  return (
    <>
      <button
        ref={(node) => register(index, node)}
        type="button"
        role="radio"
        className="studio-align-box__target"
        style={{ gridRow: `${target.row} / span ${target.rows}`, gridColumn: `${target.column} / span ${target.columns}` }}
        aria-checked={checked}
        aria-label={target.label}
        data-mark={mark ?? undefined}
        disabled={disabled}
        tabIndex={active ? 0 : -1}
        {...tip.bind({ onClick: () => onPick(index) })}
      >
        <span className="studio-align-box__dot" aria-hidden="true" />
        <Bars row={row} align={target.align} justify={target.justify} />
      </button>
      {tip.tooltip}
    </>
  );
}

export function AlignmentBox({ written, disabled, onOps }: {
  /** The literal align, justify and direction the source writes. */
  written: Written;
  disabled: boolean;
  /** One gesture's ops (one apply); `label` names it for the undo history. */
  onOps: (ops: EditOp[], label: string) => void;
}) {
  const view = alignView(written);
  const { kind, targets } = targetsOf(written);
  const current = currentIndex(written, kind, targets);
  const [pending, setPending] = useState<number | null>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  // A key gesture in the box (X, B, ⌫, W/A/S/D) may change its targets (cells ↔ lanes): the focus follows to the new
  // chosen target once, instead of falling to the page.
  const regain = useRef(false);
  const shown = pending ?? current;
  useEffect(() => {
    if (!regain.current) return;
    regain.current = false;
    if (boxRef.current && !boxRef.current.contains(document.activeElement)) refs.current[Math.max(0, current)]?.focus();
  }, [kind, current]);
  const send = (ops: EditOp[], label: string) => { if (ops.length) onOps(ops, label); };
  const pick = (index: number) => {
    setPending(null);
    const target = targets[index];
    if (target) send(target.ops(), `Alignment → ${target.label.toLowerCase()}`);
  };
  const commit = () => {
    if (pending === null) return;
    const index = pending;
    setPending(null);
    if (index !== current) pick(index);
  };
  const move = (next: number) => {
    setPending(next);
    refs.current[next]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || event.metaKey || event.ctrlKey || event.altKey) return;
    const from = shown < 0 ? 0 : shown;
    // `regain`: the gesture writes now and may swap the targets under the focus.
    const handled = (regainFocus = true) => { event.preventDefault(); event.stopPropagation(); if (regainFocus) regain.current = true; };
    if (event.key.startsWith("Arrow")) {
      handled(false);
      if (kind === "cells") {
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 3, ArrowUp: -3 }[event.key] ?? 0;
        move((from + step + 9) % 9);
      } else {
        // Lanes stack along one axis: the keys across them move, the others do nothing.
        const horizontalLanes = targets[0].columns === 3;
        const step = horizontalLanes ? { ArrowDown: 1, ArrowUp: -1 }[event.key] : { ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (step !== undefined) move((from + step + 3) % 3);
      }
      return;
    }
    const key = event.key.toLowerCase();
    if (kind === "cells" && ["w", "a", "s", "d"].includes(key)) {
      // Jump to an edge, keeping the other axis (Figma's W/A/S/D).
      handled();
      const r = Math.floor(from / 3);
      const c = from % 3;
      const next = key === "w" ? c : key === "s" ? 6 + c : key === "a" ? r * 3 : r * 3 + 2;
      pick(next);
      refs.current[next]?.focus();
      return;
    }
    if (key === "x") { handled(); send(autoOps(written), view.auto ? "Alignment: Auto off" : "Alignment: Auto (space between)"); return; }
    if (key === "b" && view.row) { handled(); send(baselineOps(written), written.align === "baseline" ? "Alignment: baseline off" : "Alignment: text baseline"); return; }
    if (event.key === "Backspace" || event.key === "Delete") {
      // Reset alignment, never the layer (Figma: Delete in a property control).
      handled();
      setPending(null);
      send(alignResetOps(written), "Reset alignment");
      return;
    }
    if (event.key === "Escape" && pending !== null) { handled(false); setPending(null); }
  };
  return (
    <div
      ref={boxRef}
      className="studio-align-box"
      role="radiogroup"
      aria-label={kind === "cells" ? "Alignment" : kind === "cross-lanes" ? "Alignment (Auto: space between)" : "Alignment (cross axis stretched)"}
      aria-keyshortcuts="W A S D X B Backspace"
      data-kind={kind}
      data-flow={view.row ? "row" : "column"}
      data-unset={view.unset || undefined}
      onKeyDown={onKeyDown}
      onKeyUp={(event) => { if (event.key.startsWith("Arrow")) commit(); }}
      onBlur={(event) => { if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) commit(); }}
    >
      {targets.map((target, index) => (
        <TargetButton
          key={`${kind}-${index}`}
          target={target}
          index={index}
          active={index === (shown < 0 ? 0 : shown)}
          checked={index === shown}
          mark={index === shown ? (view.unset && pending === null ? "default" : "chosen") : null}
          row={view.row}
          disabled={disabled}
          onPick={pick}
          register={(at, node) => { refs.current[at] = node; }}
        />
      ))}
    </div>
  );
}

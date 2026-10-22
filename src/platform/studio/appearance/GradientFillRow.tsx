import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { IconButton } from "../../../components/Button";
import { Icon, type IconName } from "../../../components/Icon";
import { fillPaint, shapeFills } from "../../../components/Shape/paint";
import type { GradientStop, GradientType, ZenGradient } from "../../../components/_shared/gradient";
import { ScrubNumberField } from "../inspector/controls/ScrubNumberField";
import type { FieldApi } from "../inspector/fieldApi";
import { fillPalette } from "../inspector/palettes";
import { PropField, SwatchControl } from "../inspector/PropField";
import type { PropSpec } from "../inspector/propSchema";
import type { EditOp } from "../types";
import { addGradientStop, gradientAngleDefault, gradientLabels, gradientOf, gradientOps, GRADIENT_TYPES, removeGradientStop, retypeGradient, setGradientStop, startGradient } from "./appearanceModel";

/*
 * Figma's gradient paint in the Fill section (spec docs/research/studio-fill-gradient-smoothing-eyedropper-spec-2026-10-22.md
 * §1), for a Shape and a frame (Box, Stack, Grid), as Figma's gradient editor: its type (None · Linear · Radial ·
 * Angular · Diamond) with − to take it off, a linear or angular angle, the gradient bar with a handle per stop (a click
 * on the bar adds a stop there, a handle drags or takes ← → to move, Delete to remove), then the selected stop's place
 * and its colour, a variable from the whole fill palette (user 2026-10-22). A shape's colour becomes the gradient
 * (Figma's paint type); a frame's fill stays under it. Every row sits on the panel's grid (two field columns, then the
 * icon column).
 */

const STOP_COLORS: string[] = shapeFills.filter((fill) => fill !== "none");
const TYPE_SPEC: PropSpec = { name: "gradientType", type: "string", description: "Figma's gradient paint", defaultValue: "none", editor: { kind: "enum", options: ["none", ...GRADIENT_TYPES] } };
const TYPE_LABELS: Readonly<Record<string, string>> = { none: "None", ...gradientLabels };

/** A field's leading mark, an icon as Figma's (it is also what the pointer scrubs). */
const mark = (name: IconName) => <Icon name={name} size="sm" decorative />;
const clampAt = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

/** The bar's preview: the stops left to right, whatever the type (Figma's gradient bar). */
const barImage = (stops: readonly GradientStop[]) => {
  const shown = [...stops].sort((a, b) => a.at - b.at).map((stop) => `${fillPaint(stop.color) ?? "transparent"} ${stop.at}%`);
  return shown.length > 1 ? `linear-gradient(to right, ${shown.join(", ")})` : undefined;
};

/**
 * `shapeFill`: a Shape's default fill (its type's: none for a vector), so taking the gradient off leaves no colour, as
 * Figma's − does; undefined for a frame.
 */
export function GradientFillRow({ api, specs, shapeFill }: { api: FieldApi; specs: PropSpec[]; shapeFill?: string }) {
  const [picked, setPicked] = useState(0);
  // A handle being dragged: its stop and where it is now (written once, on release: one ⌘Z).
  const [drag, setDrag] = useState<{ index: number; at: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  if (!specs.some((candidate) => candidate.name === "gradient")) return null;
  const value = api.valueFor("gradient");
  const gradient = gradientOf(value);
  // A gradient the code computes (it reads state or data) or a spread feeds in is changed in the code.
  const locked = api.disabled || value.state === "spread" || (value.state === "bound" && (!gradient || Boolean(value.origin?.reads.length)));
  const shape = shapeFill !== undefined;
  const selected = gradient ? Math.min(picked, gradient.stops.length - 1) : 0;
  const stop = gradient?.stops[selected];

  const write = (next: ZenGradient, label: string, extra: EditOp[] = []) => { void api.apply([...gradientOps(next), ...extra], label); };
  const remove = () => {
    const ops: EditOp[] = [{ op: "removeProp", name: "gradient" }];
    if (shape && shapeFill !== "none" && api.valueFor("fill").state === "unset") ops.push({ op: "setProp", name: "fill", value: { kind: "string", value: "none" } });
    void api.apply(ops, "Remove gradient");
  };
  const setType = (next: string) => {
    if (next === "none") { if (gradient) remove(); return; }
    const type = next as GradientType;
    if (gradient) { write(retypeGradient(gradient, type), `Gradient → ${gradientLabels[type]}`); return; }
    // A shape's colour becomes the gradient's first stop (Figma changes the paint's type); a frame's fill stays under it.
    const fill = shape ? api.valueFor("fill") : null;
    const color = fill?.state === "literal" && typeof fill.value === "string" ? fill.value : undefined;
    setPicked(0);
    write(startGradient(type, color), `Gradient → ${gradientLabels[type]}`, fill && fill.state === "literal" ? [{ op: "removeProp", name: "fill" }] : []);
  };
  /** A stop added (at `at`, else in the widest gap), selected. */
  const addAt = (at?: number) => {
    if (!gradient) return;
    setPicked(gradient.stops.length);
    write(addGradientStop(gradient, at), "Add gradient stop");
  };
  const removeStop = (index: number) => {
    if (!gradient || gradient.stops.length <= 2) return;
    setPicked(Math.max(0, index - 1));
    write(removeGradientStop(gradient, index), "Remove gradient stop");
  };
  const moveStop = (index: number, at: number) => { if (gradient && clampAt(at) !== gradient.stops[index].at) write(setGradientStop(gradient, index, { at }), `Stop ${index + 1} → ${clampAt(at)}%`); };
  const atOf = (event: PointerEvent) => {
    const box = barRef.current?.getBoundingClientRect();
    return box && box.width ? clampAt(((event.clientX - box.left) / box.width) * 100) : 0;
  };
  const onHandleKey = (event: KeyboardEvent, index: number) => {
    if (!gradient) return;
    const step = event.shiftKey ? 10 : 1;
    const at = gradient.stops[index].at;
    const next = event.key === "ArrowLeft" || event.key === "ArrowDown" ? at - step : event.key === "ArrowRight" || event.key === "ArrowUp" ? at + step : event.key === "Home" ? 0 : event.key === "End" ? 100 : null;
    if (next !== null) { event.preventDefault(); moveStop(index, next); return; }
    if ((event.key === "Delete" || event.key === "Backspace") && gradient.stops.length > 2) { event.preventDefault(); event.stopPropagation(); removeStop(index); }
  };
  const angleDefault = gradient ? gradientAngleDefault(gradient.type) : null;
  const stops = gradient ? gradient.stops.map((each, index) => (drag?.index === index ? { ...each, at: drag.at } : each)) : [];

  return (
    <div className="studio-gradient-fill" data-prop="gradient-fill">
      {/* The type, − in its row's icon column (PropField's own grid row). */}
      <PropField spec={TYPE_SPEC} label="Gradient" value={{ state: "literal", value: gradient?.type ?? "none", raw: "" }} disabled={locked} resettable={false} optionLabels={TYPE_LABELS}
        onSet={(next) => setType(String(next))} onReset={remove}
        action={gradient ? <IconButton icon="icon-minus-line" aria-label="Remove gradient" appearance="flat" level="primary" size="xs" disabled={locked} onClick={remove} /> : undefined} />
      {gradient && angleDefault !== null ? (
        <div className="studio-shape__pair">
          <ScrubNumberField label={mark("icon-refresh-cw-01-line")} name="Gradient angle" suffix="°" round={1} min={0} max={360} value={gradient.angle ?? angleDefault} disabled={locked}
            onCommit={(next) => write({ ...gradient, angle: ((next % 360) + 360) % 360 }, `Gradient angle → ${next}°`)} />
        </div>
      ) : null}
      {gradient && stop ? (
        <>
          <div className="studio-gradient-fill__row">
            {/* The bar: a press on it (not on a handle) adds a stop there. */}
            <div ref={barRef} className="studio-gradient-fill__bar" role="group" aria-label="Gradient stops" data-disabled={locked || undefined}
              onPointerDown={(event) => { if (!locked && event.target === event.currentTarget) addAt(atOf(event)); }}>
              <span className="studio-gradient-fill__preview" style={{ backgroundImage: barImage(stops) }} aria-hidden="true" />
              {stops.map((each, index) => (
                <span key={index} role="slider" tabIndex={locked ? -1 : 0} className="studio-gradient-fill__handle" aria-label={`Stop ${index + 1}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={each.at} aria-valuetext={`${each.at}%, ${fillPalette.label(each.color)}`}
                  aria-disabled={locked || undefined} data-selected={index === selected || undefined} style={{ left: `${each.at}%`, color: fillPaint(each.color) }}
                  onFocus={() => setPicked(index)}
                  onKeyDown={(event) => onHandleKey(event, index)}
                  onPointerDown={(event) => { if (locked) return; event.preventDefault(); event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId); setPicked(index); setDrag({ index, at: each.at }); }}
                  onPointerMove={(event) => { if (drag?.index === index) setDrag({ index, at: atOf(event) }); }}
                  onPointerUp={() => { if (drag?.index === index) { moveStop(index, drag.at); setDrag(null); } }}
                  onPointerCancel={() => setDrag(null)} />
              ))}
            </div>
            <IconButton icon="icon-plus-line" aria-label="Add gradient stop" appearance="flat" level="primary" size="xs" disabled={locked}
              onClick={() => addAt()} />
          </div>
          <div className="studio-shape__pair" data-stop={selected}>
            <ScrubNumberField label={mark("icon-percent-01-line")} name="Stop position" suffix="%" round={1} min={0} max={100} value={stop.at} disabled={locked} onCommit={(next) => moveStop(selected, next)} />
            <span aria-hidden="true" />
            {gradient.stops.length > 2 ? <IconButton icon="icon-minus-line" aria-label={`Remove stop ${selected + 1}`} appearance="flat" level="primary" size="xs" disabled={locked} onClick={() => removeStop(selected)} /> : null}
          </div>
          <div className="studio-gradient-fill__row">
            <SwatchControl label="Stop color" value={stop.color} fallback={undefined} disabled={locked} options={STOP_COLORS} palette={fillPalette}
              onSet={(next) => write(setGradientStop(gradient, selected, { color: next as GradientStop["color"] }), `Stop ${selected + 1} → ${fillPalette.label(next)}`)} />
          </div>
        </>
      ) : null}
    </div>
  );
}

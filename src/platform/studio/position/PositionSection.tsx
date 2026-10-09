import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { InputField, SelectField, type SelectFieldOption } from "../../../components/Input";
import { ScaleTrail } from "../inspector/controls/ScaleField";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { parseSrc } from "../api";
import { canvasApi } from "../canvas/viewport";
import type { FieldApi } from "../inspector/fieldApi";
import type { PropValue } from "../inspector/propSchema";
import { InspectorRow, InspectorSection } from "../inspector/Section";
import { inspectorStatus } from "../inspector/status";
import { findBySrc, onSourceUpdate, parentHit, rectOf, selectHit } from "../select/picker";
import { tokenPx } from "../select/spacing";
import { wrapInBox } from "../select/wrapSelection";
import { frameElement } from "../slots/dom";
import type { EditValue, SourceElement, StudioNodeRef } from "../types";
import { isFloatWrapper, unwrapFloat } from "./float";
import {
  constraintLabels, constraintOps, constraintOptions, edgeLabels, floatingComponents, floatOps, floatPlan, floatSummary,
  paddingLadderKeys, pinOfConstraint, positionProps, readInsets, snapText, unfloatOps,
  type AxisMeasure, type Ladder, type Measured, type Pin, type PositionAxis,
} from "./positionModel";
import "./position.css";

/*
 * The Design tab's Position section (Figma UI3 "Position": Align, X / Y, Ignore auto layout, Constraints; spec
 * docs/research/studio-position-effects-radius-spec-2026-10-03.md §4.1). Any layer inside a layout can float:
 *   Stack, Grid, Box   their own props: position="absolute", constraintX / constraintY, inset* on Spacing/Padding tokens;
 *   any other layer    a Box around it carries them (wrapInBox, select/wrapSelection.ts), and off takes that Box away
 *                      again (op "unwrap"), so the code is what it was.
 * X / Y are measured (read-only): offsets are tokens, written through the constraint's edges. Every gesture is one write
 * and one undo step (FieldApi.apply, or one structural request).
 */

type NodeSelection = { kind: "node" } & StudioNodeRef;

/* ── the rendered layer ───────────────────────────────────────────────────────────────────────────────────────── */

export type Geometry = {
  /** Distances from the containing block's padding box, CSS px; null until the layer is found on the canvas. */
  measured: Measured | null;
  /** The layer's own data-position (Stack, Grid, Box). */
  floating: boolean;
  /** How the parent places it: auto layout (Stack row / column, Grid), block flow (Box, host elements), or not at all (frame root). */
  parent: "auto" | "flow" | "none";
  /** A floating Box around it that holds only it: that Box's data-zen-src. */
  floatBox: string | null;
  /** The containing block is not the layer's parent (a Card or a positioned ancestor further out): its name. */
  pinnedTo: string | null;
  /** Every layer of the parent floats, so the parent hugs nothing on that axis. */
  parentEmpty: boolean;
};

const noGeometry: Geometry = { measured: null, floating: false, parent: "none", floatBox: null, pinnedTo: null, parentEmpty: false };

/** The nearest ancestor that renders a box (display: contents wrappers are skipped). */
function layoutParent(element: Element): HTMLElement | null {
  let parent = element.parentElement;
  while (parent && getComputedStyle(parent).display === "contents") parent = parent.parentElement;
  return parent;
}

const LAYOUT = ".zen-stack, .zen-grid, .zen-box";

/**
 * Where a floating layer's offsets start: its offsetParent once it floats; before, the parent when it is a Stack, Grid or
 * Box (position.css makes it relative), else the nearest positioned or transformed ancestor.
 */
function containingBlock(host: HTMLElement, floating: boolean): HTMLElement | null {
  if (floating) return host.offsetParent instanceof HTMLElement ? host.offsetParent : null;
  const parent = layoutParent(host);
  if (!parent) return null;
  if (parent.matches(LAYOUT)) return parent;
  for (let node: HTMLElement | null = parent; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.position !== "static" || style.transform !== "none") return node;
  }
  return null;
}

function axisOf(start: number, size: number, inner: number, padStart: string, padEnd: string): AxisMeasure {
  return { start, end: inner - start - size, padStart: parseFloat(padStart) || 0, padEnd: parseFloat(padEnd) || 0 };
}

export function readGeometry(selection: NodeSelection): Geometry {
  const world = canvasApi.getWorldElement();
  if (!world) return noGeometry;
  const hits = findBySrc(world, selection.src);
  const hit = hits[selection.instance] ?? hits[0];
  const host = hit?.hosts.find((node): node is HTMLElement => node instanceof HTMLElement && node.getAttribute("data-zen-src") === selection.src)
    ?? hit?.hosts.find((node): node is HTMLElement => node instanceof HTMLElement);
  if (!hit || !host?.isConnected) return noGeometry;
  const jsxParent = parentHit(hit, frameElement(selection.frameId, world));
  const domParent = layoutParent(host);
  if (!jsxParent || !domParent) return noGeometry;
  const floating = host.dataset.position === "absolute";
  const display = getComputedStyle(domParent).display;
  const parent = /flex|grid/.test(display) ? "auto" : "flow";
  const floatBox = !floating && domParent.matches('.zen-box[data-position="absolute"]') && domParent.children.length === 1 ? domParent.getAttribute("data-zen-src") : null;
  const block = containingBlock(host, floating);
  let measured: Measured | null = null;
  if (block) {
    const outer = block.getBoundingClientRect();
    const scale = block.offsetWidth ? outer.width / block.offsetWidth || 1 : 1;
    const rect = rectOf(hit.hosts) ?? host.getBoundingClientRect();
    const style = getComputedStyle(block);
    const left = (rect.left - outer.left) / scale - block.clientLeft;
    const top = (rect.top - outer.top) / scale - block.clientTop;
    const at = (node: Element) => {
      const box = node.getBoundingClientRect();
      return {
        x: axisOf((box.left - outer.left) / scale - block.clientLeft, box.width / scale, block.clientWidth, style.paddingLeft, style.paddingRight),
        y: axisOf((box.top - outer.top) / scale - block.clientTop, box.height / scale, block.clientHeight, style.paddingTop, style.paddingBottom),
      };
    };
    const spans = (axis: AxisMeasure) => Math.abs(axis.start - axis.padStart) <= 1 && Math.abs(axis.end - axis.padEnd) <= 1;
    // In-flow siblings that span an axis keep the parent's size there once this layer floats.
    const others = Array.from(domParent.children).filter((node) => !hit.hosts.includes(node) && getComputedStyle(node).position !== "absolute" && getComputedStyle(node).display !== "none").map(at);
    const x = axisOf(left, rect.width / scale, block.clientWidth, style.paddingLeft, style.paddingRight);
    const y = axisOf(top, rect.height / scale, block.clientHeight, style.paddingTop, style.paddingBottom);
    measured = { x: { ...x, shared: others.some((other) => spans(other.x)) }, y: { ...y, shared: others.some((other) => spans(other.y)) } };
  }
  const parentHost = jsxParent.hosts.find((node) => node instanceof HTMLElement) ?? null;
  const pinnedTo = block && parentHost && !parentHost.contains(block) ? findName(block) : null;
  const siblings = Array.from(domParent.children).filter((node) => node instanceof HTMLElement && getComputedStyle(node).display !== "none");
  const parentEmpty = floating && siblings.length > 0 && siblings.every((node) => node instanceof HTMLElement && getComputedStyle(node).position === "absolute");
  return { measured, floating, parent, floatBox, pinnedTo, parentEmpty };
}

/** A readable name for an annotated element (its component, else its tag). */
function findName(element: Element): string {
  const zen = Array.from(element.classList).find((name) => /^zen-[a-z-]+$/.test(name) && !/^zen-(type|text|provider)\b/.test(name));
  return zen ? zen.replace(/^zen-/, "").replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase()) : `a <${element.tagName.toLowerCase()}>`;
}

const sameGeometry = (a: Geometry, b: Geometry) => JSON.stringify(a) === JSON.stringify(b);

/** The layer's geometry, read again as the canvas re-renders, resizes or the source changes (throttled; no rAF, which a hidden pane never runs). */
function useGeometry(selection: NodeSelection): Geometry {
  const [geometry, setGeometry] = useState<Geometry>(() => readGeometry(selection));
  const ref = useRef(selection);
  ref.current = selection;
  useEffect(() => {
    let timer = 0;
    const read = () => {
      timer = 0;
      const next = readGeometry(ref.current);
      setGeometry((current) => (sameGeometry(current, next) ? current : next));
    };
    const schedule = () => { if (!timer) timer = window.setTimeout(read, 60); };
    read();
    const world = canvasApi.getWorldElement();
    const mutation = new MutationObserver(schedule);
    if (world) mutation.observe(world, { subtree: true, childList: true, attributes: true, attributeFilter: ["style", "class", "data-position", "data-constraint-x", "data-constraint-y"] });
    const resize = new ResizeObserver(schedule);
    if (world) resize.observe(world);
    const offSource = onSourceUpdate(schedule);
    return () => { window.clearTimeout(timer); mutation.disconnect(); resize.disconnect(); offSource(); };
  }, [selection.src, selection.instance]);
  return geometry;
}

/** The Spacing/Padding ladder as it measures on the layer (density, breakpoint and mode applied). */
export function ladderOf(selection: NodeSelection): Ladder {
  const world = canvasApi.getWorldElement();
  const host = world ? findBySrc(world, selection.src)[selection.instance]?.hosts[0] ?? findBySrc(world, selection.src)[0]?.hosts[0] : null;
  const probe = host ?? document.documentElement;
  return paddingLadderKeys.map((key) => ({ key, px: tokenPx(probe, "padding", key) })).filter((step): step is { key: (typeof paddingLadderKeys)[number]; px: number } => step.px !== null && Number.isFinite(step.px));
}

/* ── the section ──────────────────────────────────────────────────────────────────────────────────────────────── */

const alignButtons: { axis: PositionAxis; pin: Pin; icon: IconName; label: string }[] = [
  { axis: "x", pin: "start", icon: "icon-align-left-01-line", label: "Align left" },
  { axis: "x", pin: "center", icon: "icon-align-horizontal-centre-01-line", label: "Align horizontal centres" },
  { axis: "x", pin: "end", icon: "icon-align-right-01-line", label: "Align right" },
  { axis: "y", pin: "start", icon: "icon-align-top-01-line", label: "Align top" },
  { axis: "y", pin: "center", icon: "icon-align-vertical-center-01-line", label: "Align vertical centres" },
  { axis: "y", pin: "end", icon: "icon-align-bottom-01-line", label: "Align bottom" },
];

const literal = (value: PropValue) => (value.state === "literal" ? value.value : value.state === "spread" && (typeof value.live === "string") ? value.live : undefined);

export function PositionSection(props: { selection: NodeSelection; element: SourceElement; api: FieldApi; component: string }) {
  // Another selection starts fresh.
  return <Position key={`${props.selection.src}#${props.selection.instance}`} {...props} />;
}

function Position({ selection, element, api, component }: { selection: NodeSelection; element: SourceElement; api: FieldApi; component: string }) {
  const geometry = useGeometry(selection);
  const own = floatingComponents.has(component);
  const values = useMemo(() => Object.fromEntries(positionProps.map((name) => [name, api.valueFor(name)])), [api]);
  const sizes = { width: api.valueFor("width"), height: api.valueFor("height"), alignSelf: api.valueFor("alignSelf") };
  const positionValue = values.position;
  const locked = positionValue.state === "bound" || positionValue.state === "spread";
  const floating = own && literal(positionValue) === "absolute";
  const viaBox = !own && Boolean(geometry.floatBox);
  const pressed = floating || viaBox;
  const disabled = api.disabled;
  const [busy, setBusy] = useState(false);
  if (geometry.parent === "none") return null;

  const name = element.name;
  const toggleLabel = geometry.parent === "auto" ? "Ignore auto layout" : "Absolute position";
  const ref = { frameId: selection.frameId, panelId: selection.panelId, instance: selection.instance };

  const toggle = async () => {
    if (busy || disabled) return;
    setBusy(true);
    try {
      if (pressed) {
        if (viaBox && geometry.floatBox) await unwrapFloat(geometry.floatBox, ref);
        else if (isFloatWrapper(element)) await unwrapFloat(selection.src, ref);
        else {
          const names = unfloatOps(values).flatMap((op) => (op.op === "removeProp" ? [op.name] : []));
          const ok = names.length ? await api.apply(names.map((prop) => ({ op: "removeProp", name: prop })), `${name} back in auto layout`, Object.fromEntries(names.map((prop) => [prop, { state: "unset" } as PropValue]))) : false;
          if (ok) inspectorStatus.set("positive", `${name} is back in auto layout`);
        }
        return;
      }
      if (!geometry.measured) {
        inspectorStatus.set("neutral", `${name} is not on the canvas right now`);
        return;
      }
      const ladder = ladderOf(selection);
      const plan = floatPlan(geometry.measured, ladder, own ? sizes : {});
      const summary = floatSummary(name, plan.snaps, plan.pins);
      if (own) {
        const ok = await api.apply(floatOps(plan), `${name} ignores auto layout`, Object.fromEntries(Object.entries(plan.props).map(([prop, value]) => [prop, { state: "literal", value, raw: "" } as PropValue])));
        if (ok) inspectorStatus.set("positive", summary);
      } else {
        const boxProps: Record<string, EditValue> = Object.fromEntries(Object.entries(plan.props).map(([prop, value]) => [prop, { kind: "string", value }]));
        await wrapInBox({ src: selection.src, name, frameId: selection.frameId, panelId: selection.panelId, instance: selection.instance }, boxProps, `${name} ignores auto layout`, `${summary} · in a Box around it`);
      }
    } finally {
      setBusy(false);
    }
  };

  const pins = { x: pinOfConstraint("x", String(literal(values.constraintX) ?? "left")), y: pinOfConstraint("y", String(literal(values.constraintY) ?? "top")) };
  const constraintLocked = disabled || !floating || [values.constraintX, values.constraintY].some((value) => value.state === "bound" || value.state === "spread");
  const setPin = (axis: PositionAxis, pin: Pin, { flush = false } = {}) => {
    if (constraintLocked) return;
    const { ops, snaps } = constraintOps(axis, pin, geometry.measured?.[axis] ?? null, ladderOf(selection), values, { flush });
    if (!ops.length) return;
    const label = flush
      ? `${name} ${(alignButtons.find((button) => button.axis === axis && button.pin === pin)?.label ?? "align").toLowerCase()}`
      : `${name} ${axis === "x" ? "horizontal" : "vertical"} constraint → ${constraintLabels[constraintValue(axis, pin)].toLowerCase()}`;
    void api.apply(ops, label).then((ok) => {
      if (!ok) return;
      const notes = [
        pin === "stretch" ? `${axis === "x" ? "Width" : "Height"} now follows the parent` : "",
        pin === "center" && !flush ? "Centred: Zen has no offset from the centre" : "",
        ...snaps.filter((entry) => entry.snap.clamped || Math.abs(entry.snap.px - entry.snap.from) >= 1).map(snapText),
      ].filter(Boolean);
      if (notes.length) inspectorStatus.set("neutral", notes.join(" · "));
    });
  };

  const insetRows = floating ? (["x", "y"] as const).flatMap((axis) => readInsets(axis, pins[axis])) : [];
  const ladder = floating ? ladderOf(selection) : [];
  const x = geometry.measured ? Math.round(geometry.measured.x.start) : null;
  const y = geometry.measured ? Math.round(geometry.measured.y.start) : null;
  const flowHint = geometry.parent === "auto" ? "Placed by the parent's auto layout" : "Placed by the page flow";

  const notes: { text: string; tone: "warning" | "neutral"; action?: { label: string; run: () => void } }[] = [];
  if (!floating && own) {
    const dead = ["constraintX", "constraintY", "insetTop", "insetRight", "insetBottom", "insetLeft"].filter((prop) => values[prop].state === "literal");
    if (dead.length && !viaBox) notes.push({ text: "Constraints do nothing until the layer ignores auto layout.", tone: "warning", action: disabled ? undefined : { label: "Remove", run: () => void api.apply(dead.map((prop) => ({ op: "removeProp", name: prop })), `${name} remove constraints`) } });
  }
  if (floating) {
    for (const axis of ["x", "y"] as const) {
      const reads = readInsets(axis, pins[axis]);
      for (const prop of axis === "x" ? ["insetLeft", "insetRight"] : ["insetTop", "insetBottom"]) {
        if (!reads.includes(prop) && values[prop].state === "literal") {
          notes.push({ text: `${edgeLabels[prop]} offset is ignored while pinned ${constraintLabels[constraintValue(axis, pins[axis])]}.`, tone: "warning", action: disabled ? undefined : { label: "Remove", run: () => api.removeProp(prop) } });
        }
      }
    }
    if (sizes.alignSelf.state === "literal") notes.push({ text: "Align in parent does nothing on a floating layer.", tone: "warning", action: disabled ? undefined : { label: "Remove", run: () => api.removeProp("alignSelf") } });
    if (geometry.pinnedTo) notes.push({ text: `Pinned to ${geometry.pinnedTo}, the nearest positioned layer.`, tone: "neutral" });
    if (geometry.parentEmpty) notes.push({ text: "Every layer of the parent floats, so it hugs nothing. Give it a size.", tone: "neutral" });
  }

  return (
    <InspectorSection title="Position" fieldGrid>
      <InspectorRow label="Align" labelTitle="Align to the parent (a floating layer)">
        <div className="studio-position__align" role="group" aria-label="Align in parent">
          {alignButtons.map((button) => (
            <IconButton
              key={button.label}
              icon={button.icon}
              aria-label={button.label}
              appearance="flat"
              level="primary"
              size="xs"
              disabled={constraintLocked || pins[button.axis] === "stretch"}
              onClick={() => setPin(button.axis, button.pin, { flush: true })}
            />
          ))}
        </div>
      </InspectorRow>

      <div className="studio-position__pair" data-prop="position">
        <ReadOnlyNumber axis="X" value={x} />
        <ReadOnlyNumber axis="Y" value={y} />
        <span className="studio-position__slot">
          {/* zen-allow-secondary: pressed state of a toggle (Ignore auto layout on), as the Code view's Wrap lines. */}
          <IconButton
            icon="icon-transform-line"
            aria-label={toggleLabel}
            aria-pressed={pressed}
            level={pressed ? "secondary" : "tertiary"}
            size="xs"
            disabled={disabled || locked || busy}
            onClick={() => void toggle()}
          />
        </span>
      </div>
      {viaBox ? (
        <div className="studio-position__via">
          <p className={`studio-position__caption ${typographyStyles["Body/Small/Regular"]}`}>Floats in a Box around it: its constraints are on the Box.</p>
          {/* zen-allow-compact-button: a quiet jump to the parent layer in a dense tool panel, like the element's file link */}
          <Button appearance="flat" level="primary" size="xs" onClick={() => selectSrc(geometry.floatBox!, selection)}>Select Box</Button>
        </div>
      ) : !floating ? (
        <p className={`studio-position__caption ${typographyStyles["Body/Small/Regular"]}`}>{locked ? `Position is set in the code (${positionValue.state === "bound" ? `{${positionValue.expression}}` : positionValue.via})` : flowHint}</p>
      ) : null}

      {floating ? (
        <div className="studio-position__constraints" role="group" aria-label="Constraints">
          <span className={`studio-position__label ${typographyStyles["Caption/Regular"]}`}>Constraints</span>
          <div className="studio-position__constraint-body">
            <ConstraintsDiagram pins={pins} disabled={constraintLocked} onPick={setPin} />
            <div className="studio-position__selects">
              {(["x", "y"] as const).map((axis) => (
                <SelectField
                  key={axis}
                  aria-label={axis === "x" ? "Horizontal constraint" : "Vertical constraint"}
                  size="sm"
                  disabled={constraintLocked}
                  value={constraintValue(axis, pins[axis])}
                  onValueChange={(next) => setPin(axis, pinOfConstraint(axis, next))}
                  options={[...constraintOptions[axis].map((value) => ({ value, label: constraintLabels[value] })), { value: "scale", label: "Scale (needs %)", disabled: true }]}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {insetRows.map((prop) => (
        <InsetRow key={prop} prop={prop} value={values[prop]} ladder={ladder} api={api} name={name} />
      ))}

      {notes.map((note) => (
        <div key={note.text} className="studio-position__note-row">
          <p className={`studio-position__note ${typographyStyles["Body/Small/Regular"]}`} data-tone={note.tone}>
            {note.tone === "warning" ? <Icon name="icon-alert-triangle-line" size="sm" decorative /> : null}
            {note.text}
          </p>
          {/* zen-allow-compact-button: a quiet fix next to a one-line warning in a dense tool panel, as the Size group's */}
          {/* zen-allow-destructive: removes props that do nothing here, as one undoable draft edit; not an irreversible delete */}
          {note.action ? <Button appearance="flat" level="primary" size="xs" onClick={note.action.run}>{note.action.label}</Button> : null}
        </div>
      ))}
    </InspectorSection>
  );
}

const constraintValue = (axis: PositionAxis, pin: Pin) => constraintOptions[axis][(["start", "end", "stretch", "center"] as const).indexOf(pin)];

/** Selects the layer at `src` (the Box a layer floats in). */
function selectSrc(src: string, selection: NodeSelection) {
  const world = canvasApi.getWorldElement();
  if (!world) return;
  const hits = findBySrc(world, src);
  const hit = hits[selection.instance] ?? hits[0];
  if (hit) selectHit(hit, world);
  else if (parseSrc(src)) inspectorStatus.set("neutral", "That Box is not rendered right now");
}

function ReadOnlyNumber({ axis, value }: { axis: string; value: number | null }) {
  return (
    <div className="studio-position__field">
      <InputField size="sm" aria-label={`${axis} (measured)`} value={value === null ? "—" : String(value)} readOnly leading={<span className={`studio-position__axis ${typographyStyles["Body/Small/Medium"]}`}>{axis}</span>} />
    </div>
  );
}

/** One offset of the pinned edges: the Spacing/Padding step ("sm · 12"); reset = none (flush). */
function InsetRow({ prop, value, ladder, api, name }: { prop: string; value: PropValue; ladder: Ladder; api: FieldApi; name: string }) {
  const label = edgeLabels[prop];
  const written = value.state === "literal" ? String(value.value) : null;
  const readOnly = value.state === "bound" || value.state === "spread";
  // Token + value on one line, as every token select (ScaleField): "md … 16px" in the list, "md 16" in the field.
  const options: SelectFieldOption[] = ladder.map((step) => ({ value: step.key, label: step.key, meta: `${Math.round(step.px)}px` }));
  if (written && !options.some((option) => option.value === written)) options.push({ value: written, label: written });
  return (
    <InspectorRow
      name={prop}
      label={label}
      labelTitle={`${label} offset · ${prop}`}
      isDefault={value.state === "unset"}
      hint={readOnly ? `Set in the code (${value.state === "bound" ? `{${value.expression}}` : value.via})` : undefined}
    >
      <SelectField
        aria-label={`${label} offset`}
        size="sm"
        disabled={api.disabled || readOnly}
        value={written ?? "none"}
        trailing={<ScaleTrail px={ladder.find((step) => step.key === (written ?? "none"))?.px ?? null} />}
        onValueChange={(next) => { if (next !== (written ?? "none")) (next === "none" ? api.removeProp(prop) : api.setProp(prop, next)); }}
        options={options}
      />
    </InspectorRow>
  );
}

/**
 * Figma's constraint diagram: an outer square (the parent), an inner one (the layer), four arms and two centre ticks.
 * Click an arm or a tick to pin that side; Shift+click the opposite arm to pin both (Left and right / Top and bottom).
 * Pointer only (aria-hidden): the two selects beside it are the keyboard path.
 */
function ConstraintsDiagram({ pins, disabled, onPick }: { pins: { x: Pin; y: Pin }; disabled: boolean; onPick: (axis: PositionAxis, pin: Pin) => void }) {
  const on = (axis: PositionAxis, side: "start" | "end" | "center") => {
    const pin = pins[axis];
    return side === "center" ? pin === "center" : pin === side || pin === "stretch";
  };
  const pick = (axis: PositionAxis, side: "start" | "end" | "center") => (event: MouseEvent) => {
    if (disabled) return;
    const pin = pins[axis];
    if (side === "center") return onPick(axis, "center");
    const other = side === "start" ? "end" : "start";
    if (event.shiftKey && (pin === other || pin === "stretch")) return onPick(axis, pin === "stretch" ? other : "stretch");
    onPick(axis, side);
  };
  const parts: { key: string; axis: PositionAxis; side: "start" | "end" | "center" }[] = [
    { key: "top", axis: "y", side: "start" },
    { key: "bottom", axis: "y", side: "end" },
    { key: "left", axis: "x", side: "start" },
    { key: "right", axis: "x", side: "end" },
    { key: "center-x", axis: "x", side: "center" },
    { key: "center-y", axis: "y", side: "center" },
  ];
  return (
    <div className="studio-constraints" aria-hidden="true" data-disabled={disabled || undefined}>
      <span className="studio-constraints__inner" />
      {parts.map((part) => (
        <button key={part.key} type="button" tabIndex={-1} className="studio-constraints__hit" data-part={part.key} data-on={on(part.axis, part.side) || undefined} disabled={disabled} onClick={pick(part.axis, part.side)}>
          <span className="studio-constraints__line" />
        </button>
      ))}
    </div>
  );
}


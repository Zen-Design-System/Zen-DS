import { useCallback, useEffect, useId, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Divider } from "../../../components/Divider";
import { Icon } from "../../../components/Icon";
import { InputField, InputLeadingTrailing } from "../../../components/Input";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { Popover, PopoverItem } from "../../../components/Popover";
import { Segmented } from "../../../components/Segmented";
import { useIconTooltip } from "../../../components/Tooltip";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { applyEdit, parseSrc, studioApi } from "../api";
import { canvasApi, getViewport } from "../canvas/viewport";
import { findBySrc, onSourceUpdate } from "../select/picker";
import { noteEditTarget } from "../select/remap";
import { studioDrafts } from "../sourceDrafts";
import type { EditOp } from "../types";
import type { FieldApi, LayoutGroupProps } from "./fieldApi";
import { propSpecs, valueOf, type PropValue } from "./propSchema";
import { InspectorRow } from "./Section";
import { fileName, inspectorStatus, saveShortcut } from "./status";
import {
  alignSelfLiteral, alignSelfOps, alignSelfOptions, axisLetter, axisName, axisTooltip, axisView, editLabel, effectiveAlign, fillCaption,
  fillChildrenOps, holdValues, holds, hugCaption, limitOps, limitProps, limitSuffix, limitText, limitValue, limitsOf, optimisticOf, parseLimit,
  parseSizingInput, releaseValues, removeLimitsOps, scrubbed, settleValues, sizingOps, stepBase, stepped,
  type AlignSelfValue, type AxisView, type HeldValue, type LimitProp, type LiveSizing, type ParentLayout, type SizingAxis, type SizingInput,
} from "./sizingModel";
import "./sizing.css";

/*
 * The Design tab's Size group (spec: docs/research/studio-inspector-redesign-2026-10-03.md, "SIZE" and the control
 * specs width / height, min / max, alignSelf, fillChildren): Figma's W / H with Hug · Fill · Fixed, min / max sizes,
 * Align in parent and a Stack's Children. A group of the Layout section (LayoutGroupProps from ./fieldApi), which
 * mounts it and leaves its props out of the generic Properties list:
 *
 *   {hasSizing(component) ? <SizingSection {...layoutGroupProps} /> : null}
 *   specs.filter((spec) => !sizingPropNames.has(spec.name))   // the generic Properties list
 *
 * Reads: values through api.valueFor, api.disabled, which fields show from `specs` (the component's own API when it is
 * empty), measured px from `host` (bounding rect ÷ the canvas zoom inside the Studio world). Writes: one gesture = one
 * api.apply(ops, label) = one request = one undo step = one draft change. Until FieldApi declares apply, it is read at
 * runtime; without it the group queues its own applyEdit requests to host's data-zen-src, each with the file hash
 * read from the source when needed. Typing, ↑ / ↓ and scrubbing never write until Enter, key release, pointer release,
 * blur or a pick.
 */

export { sizingPropNames } from "./sizingModel";

/** Whether the component takes the sizing props (Stack, Grid, Box, Text, Heading): mount the Size group only then. */
export function hasSizing(component: string): boolean {
  return propSpecs(component).some((spec) => spec.name === "width");
}

export function SizingSection(props: LayoutGroupProps) {
  const src = props.host?.getAttribute("data-zen-src") || null;
  // Another selection starts fresh: no draft, no added min / max field, no open popover.
  return <SizeGroup key={src ?? `${props.component}:no-source`} {...props} src={src} />;
}

/* ── the rendered element ───────────────────────────────────────────────────────────────────────────────────── */

type HostInfo = {
  size: Record<SizingAxis, number | null>;
  parent: ParentLayout;
  live: Record<SizingAxis, LiveSizing>;
  limits: Record<LimitProp, number | null>;
  /** Computed align-self of the element and align-items of its parent. */
  alignSelf: string | null;
  parentAlign: string | null;
};

const noInfo: HostInfo = {
  size: { width: null, height: null },
  parent: { kind: "other", fillChildren: false },
  live: { width: { mode: null, px: null }, height: { mode: null, px: null } },
  limits: { minWidth: null, maxWidth: null, minHeight: null, maxHeight: null },
  alignSelf: null,
  parentAlign: null,
};

const limitVar: Record<LimitProp, string> = { minWidth: "--zen-layout-min-width", maxWidth: "--zen-layout-max-width", minHeight: "--zen-layout-min-height", maxHeight: "--zen-layout-max-height" };

/** Which rendered instance of `src` (a .map row) the element is, so an element a re-render replaced is found again. */
function instanceOfHost(host: HTMLElement, src: string): number {
  const world = canvasApi.getWorldElement();
  if (!world?.contains(host)) return 0;
  return Math.max(0, findBySrc(world, src).findIndex((hit) => hit.hosts.includes(host)));
}

/** The panel's element while it is in the document; once a re-render (HMR) replaced it, the same instance found again. */
function resolveHost(host: HTMLElement | null, src: string | null, instance: number): HTMLElement | null {
  if (host?.isConnected) return host;
  const world = canvasApi.getWorldElement();
  if (!world || !src) return null;
  const hits = findBySrc(world, src);
  const node = (hits[instance] ?? hits[0])?.hosts[0];
  return node instanceof HTMLElement ? node : null;
}

/** The layout parent: the nearest ancestor that renders a box (display: contents wrappers are skipped). */
function layoutParent(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;
  while (parent && getComputedStyle(parent).display === "contents") parent = parent.parentElement;
  return parent;
}

function readHost(element: HTMLElement | null): HostInfo {
  if (!element?.isConnected) return noInfo;
  const rect = element.getBoundingClientRect();
  // The canvas world is scaled by the zoom: measured px are CSS px, as the props write them.
  const zoom = canvasApi.getWorldElement()?.contains(element) ? getViewport().zoom || 1 : 1;
  const parent = layoutParent(element);
  const kind: ParentLayout["kind"] = parent?.matches(".zen-stack[data-direction]") ? (parent.dataset.direction === "row" ? "row" : "column") : parent?.matches(".zen-grid") ? "grid" : "other";
  const px = (name: string) => {
    const value = parseFloat(element.style.getPropertyValue(name));
    return Number.isFinite(value) ? Math.round(value) : null;
  };
  const mode = (value: string | undefined) => (value === "hug" || value === "fill" || value === "fixed" ? value : null);
  return {
    size: { width: Math.round(rect.width / zoom), height: Math.round(rect.height / zoom) },
    parent: { kind, fillChildren: (kind === "row" || kind === "column") && parent?.dataset.fillChildren === "true" },
    live: { width: { mode: mode(element.dataset.w), px: px("--zen-layout-width") }, height: { mode: mode(element.dataset.h), px: px("--zen-layout-height") } },
    limits: { minWidth: px(limitVar.minWidth), maxWidth: px(limitVar.maxWidth), minHeight: px(limitVar.minHeight), maxHeight: px(limitVar.maxHeight) },
    alignSelf: getComputedStyle(element).alignSelf,
    parentAlign: parent ? getComputedStyle(parent).alignItems : null,
  };
}

const sameInfo = (left: HostInfo, right: HostInfo) => JSON.stringify(left) === JSON.stringify(right);

/** The element's measured size, parent and live sizing, kept current as it resizes, its attributes change or HMR re-renders it. */
function useHostInfo(host: HTMLElement | null, src: string | null): HostInfo {
  const [info, setInfo] = useState<HostInfo>(() => readHost(host));
  const [generation, setGeneration] = useState(0);
  const retries = useRef(0);
  const instance = useRef<{ host: HTMLElement | null; index: number }>({ host: null, index: 0 });
  useEffect(() => onSourceUpdate(() => setGeneration((value) => value + 1)), []);
  useEffect(() => {
    if (host?.isConnected && src && instance.current.host !== host) instance.current = { host, index: instanceOfHost(host, src) };
    const element = resolveHost(host, src, instance.current.index);
    let frame = 0;
    const read = () => {
      frame = 0;
      const next = readHost(element);
      setInfo((current) => (sameInfo(current, next) ? current : next));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    if (!element) {
      // A re-render replaced the element and the canvas renders it again a moment later: look again a few times.
      if (!src || retries.current >= 4) return undefined;
      const timer = window.setTimeout(() => { retries.current += 1; setGeneration((value) => value + 1); }, 400);
      return () => window.clearTimeout(timer);
    }
    retries.current = 0;
    const resize = new ResizeObserver(schedule);
    resize.observe(element);
    const mutation = new MutationObserver(schedule);
    mutation.observe(element, { attributes: true });
    const parent = element.parentElement;
    if (parent) mutation.observe(parent, { attributes: true });
    return () => { if (frame) cancelAnimationFrame(frame); resize.disconnect(); mutation.disconnect(); };
  }, [host, src, generation]);
  return info;
}

/* ── writes ───────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * FieldApi.apply, which the Layout section owner adds: one call = one request = one undo step = one draft change.
 * Read at runtime until fieldApi.ts declares it. The optimistic values go along as a third argument the panel may
 * show at once (the spec's apply(ops, label, optimistic)); a returned promise that answers false or { ok: false }
 * (refused) lets the group's own optimistic values go.
 */
type ApplyEdit = (ops: EditOp[], label: string, optimistic?: Record<string, PropValue>) => unknown;

function applyOf(api: FieldApi): ApplyEdit | null {
  const candidate = (api as FieldApi & { apply?: unknown }).apply;
  return typeof candidate === "function" ? (ops, label, optimistic) => (candidate as ApplyEdit).call(api, ops, label, optimistic) : null;
}

const isThenable = (value: unknown): value is PromiseLike<unknown> => typeof (value as { then?: unknown } | null)?.then === "function";
const refused = (answer: unknown) => answer === false || (typeof answer === "object" && answer !== null && (answer as { ok?: unknown }).ok === false);

/** Whether the element at `loc` already holds what `ops` writes (a repeated or raced edit, not a conflict). */
async function alreadyApplied(file: string, loc: string, name: string, ops: EditOp[]): Promise<string | null> {
  const current = await studioApi.element(file, loc);
  if (!current || current.name !== name) return null;
  return holds(ops, (prop) => valueOf(current.attributes, prop)) ? current.hash : null;
}

/**
 * Every gesture goes out as one write: api.apply when the panel offers it (its queue, hash and undo step), otherwise
 * this group's own queue (DesignPanel's send() pattern): one request at a time to the element at `src` (read when the
 * request leaves), each carrying the file hash, which is read from the source when needed (the first edit, after the
 * canvas re-rendered from a new source) and again after each of the group's own edits, so a quick second change is
 * not refused as stale. Optimistic values show the change at once until the panel's read shows it (settleValues), or
 * the edit is refused.
 */
function useSizingWriter(api: FieldApi, component: string, src: string | null, disabled: boolean) {
  const { valueFor } = api;
  const [held, setHeld] = useState<Record<string, HeldValue>>({});
  const srcRef = useRef(src);
  srcRef.current = src;
  const hashRef = useRef<{ src: string; hash: string } | null>(null);
  const inFlight = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());
  // A new read of the source (or the panel's own optimistic value): let go of what it now shows.
  useEffect(() => { setHeld((current) => settleValues(current, valueFor)); }, [valueFor]);
  // The canvas re-rendered from a changed source: the next edit of the queue reads the hash again.
  useEffect(() => onSourceUpdate(() => { if (!inFlight.current) hashRef.current = null; }), []);

  const send = useCallback((ops: EditOp[] | null) => {
    if (!ops?.length || disabled) return;
    const optimistic = optimisticOf(ops);
    const label = editLabel(component, ops);
    const release = () => setHeld((current) => releaseValues(current, optimistic));
    setHeld((current) => holdValues(current, optimistic, valueFor));
    const apply = applyOf(api);
    if (apply) {
      const answer = apply(ops, label, optimistic);
      if (isThenable(answer)) answer.then((result) => { if (refused(result)) release(); }, release);
      return;
    }
    inFlight.current += 1;
    const run = async () => {
      const at = srcRef.current ? parseSrc(srcRef.current) : null;
      const target = srcRef.current;
      const done = at ? noteEditTarget(`${at.file}:${at.loc}`) : null;
      try {
        if (!at || !target) { release(); return; }
        let hash = hashRef.current?.src === target ? hashRef.current.hash : null;
        if (!hash) {
          const current = await studioApi.element(at.file, at.loc);
          if (current && current.name !== component) {
            release();
            inspectorStatus.set("negative", `${fileName(at.file)}:${at.line} is a ${current.name} now; nothing was written`);
            return;
          }
          hash = current?.hash ?? null;
        }
        const response = await applyEdit({ file: at.file, loc: at.loc, name: component, ops, hash: hash ?? undefined }, label);
        if (response.ok) {
          const current = await studioApi.element(at.file, at.loc);
          hashRef.current = { src: target, hash: current?.hash ?? response.hash };
          return;
        }
        const fresh = response.code === "stale" ? await alreadyApplied(at.file, at.loc, component, ops) : null;
        if (fresh) {
          // Already in the file's draft (a drafts server) or on disk.
          hashRef.current = { src: target, hash: fresh };
          const where = `${fileName(at.file)}:${at.loc.split(":")[0]}`;
          if (studioDrafts.get().available) inspectorStatus.set("neutral", `Draft · ${where} · ${saveShortcut} to save`);
          else inspectorStatus.set("positive", `Saved · ${where}`);
          return;
        }
        hashRef.current = null;
        release();
        if (response.code === "stale") inspectorStatus.set("negative", "The file changed before this edit was saved; nothing was written");
      } finally {
        done?.();
        inFlight.current -= 1;
      }
    };
    queue.current = queue.current.then(run, run);
  }, [api, component, disabled, valueFor]);

  const read = useCallback((name: string): PropValue => held[name]?.value ?? valueFor(name), [held, valueFor]);
  return { read, send };
}

/* ── the group ────────────────────────────────────────────────────────────────────────────────────────────────── */

const axesOf = (names: Set<string>): SizingAxis[] => (["width", "height"] as const).filter((axis) => names.has(axis));
const isWritten = (value: PropValue) => value.state === "literal" || value.state === "bound" || (value.state === "spread" && typeof value.live === "number");

function SizeGroup({ api, specs, component, host, src }: LayoutGroupProps & { src: string | null }) {
  // The fields the panel offers; the component's own API when it passes none.
  const names = useMemo(() => new Set((specs.length ? specs : propSpecs(component)).map((spec) => spec.name)), [specs, component]);
  const axes = axesOf(names);
  const info = useHostInfo(host, src);
  // Without api.apply the group writes to host's data-zen-src itself: nothing to write to until the element is found.
  const disabled = api.disabled || (!applyOf(api) && !src);
  const { read, send } = useSizingWriter(api, component, src, disabled);
  const labelId = useId();
  /** Min / max pairs the person added from the menu (shown, prefilled, nothing written until committed). */
  const [added, setAdded] = useState<Set<SizingAxis>>(() => new Set());
  const [focusLimit, setFocusLimit] = useState<{ prop: LimitProp; at: number } | null>(null);

  if (!axes.length) return null;
  const values = Object.fromEntries(limitProps.map((prop) => [prop, read(prop)])) as Record<LimitProp, PropValue>;
  const limitPx = (prop: LimitProp) => limitValue(values[prop]) ?? (values[prop].state === "literal" ? null : info.limits[prop]);
  const pairShown = (axis: SizingAxis) => added.has(axis) || limitsOf[axis].some((prop) => names.has(prop) && isWritten(values[prop]));
  const anyLimitWritten = limitProps.some((prop) => values[prop].state === "literal");
  const parentLaysOut = info.parent.kind !== "other";

  const menuItems: MenuEntry[] = [
    ...axes.filter((axis) => !pairShown(axis)).flatMap((axis) => limitsOf[axis].filter((prop) => names.has(prop)).map((prop) => ({ id: `add:${prop}`, label: limitText[prop].add }))),
  ];
  if (anyLimitWritten || axes.some((axis) => added.has(axis))) {
    if (menuItems.length) menuItems.push({ type: "separator" });
    menuItems.push({ id: "remove", label: "Remove min and max" });
  }
  const onMenu = (id: string) => {
    if (id === "remove") {
      setAdded(new Set());
      send(removeLimitsOps(values));
      return;
    }
    const prop = id.slice(4) as LimitProp;
    const axis: SizingAxis = prop.endsWith("Width") ? "width" : "height";
    setAdded((current) => new Set(current).add(axis));
    setFocusLimit({ prop, at: Date.now() });
  };

  const alignValue = read("alignSelf");
  const fillValue = read("fillChildren");

  return (
    <div className="studio-sizing" role="group" aria-labelledby={labelId} data-prop="width">
      <span id={labelId} className={`studio-sizing__label ${typographyStyles["Body/Small/Regular"]}`}>Size</span>
      <div className="studio-sizing__pair" data-single={axes.length === 1 || undefined}>
        {axes.map((axis) => {
          const [min, max] = limitsOf[axis];
          return (
            <SizeField
              key={axis}
              view={axisView(axis, read(axis), info.live[axis], info.parent)}
              measured={info.size[axis]}
              parent={info.parent}
              limits={limitSuffix(limitPx(min), limitPx(max))}
              disabled={disabled}
              align={axis === "width" ? "start" : "end"}
              onWrite={send}
            />
          );
        })}
        <span className="studio-sizing__slot">
          {menuItems.length ? (
            <Menu
              align="end"
              aria-label="Min and max size"
              trigger={<IconButton icon="icon-ruler-line" aria-label="Min and max size" appearance="flat" level="primary" size="xs" disabled={disabled} />}
              items={menuItems}
              onSelect={(item) => onMenu(item.id)}
            />
          ) : null}
        </span>
      </div>

      {axes.filter(pairShown).map((axis) => (
        <div key={axis} className="studio-sizing__pair" data-prop={limitsOf[axis][0]}>
          {limitsOf[axis].map((prop) => (names.has(prop) ? (
            <LimitField
              key={prop}
              prop={prop}
              value={values[prop]}
              live={info.limits[prop]}
              prefill={info.size[axis]}
              disabled={disabled}
              focusAt={focusLimit?.prop === prop ? focusLimit.at : 0}
              onWrite={send}
            />
          ) : <span key={prop} />))}
          <span className="studio-sizing__slot" />
        </div>
      ))}

      {names.has("alignSelf") && parentLaysOut ? (
        <AlignInParent value={alignValue} info={info} disabled={disabled} onWrite={send} />
      ) : null}
      {names.has("alignSelf") && !parentLaysOut && alignValue.state === "literal" ? (
        <div className="studio-sizing__warning">
          <p className={`studio-sizing__note ${typographyStyles["Body/Small/Regular"]}`}>
            <Icon name="icon-alert-triangle-line" size="sm" decorative />
            Align in parent needs a Stack or Grid parent.
          </p>
          {/* zen-allow-compact-button: a quiet fix next to a one-line warning in a dense tool panel (spec: no-effect warnings) */}
          {/* zen-allow-destructive: removes a prop that does nothing here, as one undoable draft edit; not an irreversible delete */}
          <Button appearance="flat" level="primary" size="xs" disabled={disabled} onClick={() => send(alignSelfOps(null, alignValue))}>Remove</Button>
        </div>
      ) : null}

      {names.has("fillChildren") ? <Children value={fillValue} disabled={disabled} onWrite={send} /> : null}
    </div>
  );
}

/* ── W / H ────────────────────────────────────────────────────────────────────────────────────────────────────── */

/** One W / H field. `onInput`: what the person chose goes there instead of `onWrite`'s props (an instance's Size group). */
export function SizeField({ view, measured, parent, limits, disabled, align, onWrite, onInput }: {
  view: AxisView;
  measured: number | null;
  parent: ParentLayout;
  limits: string;
  disabled: boolean;
  align: "start" | "end";
  onWrite?: (ops: EditOp[] | null) => void;
  onInput?: (input: SizingInput) => void;
}) {
  const { axis } = view;
  const name = axisName[axis];
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPendingState] = useState<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const setPending = (next: number | null) => { pendingRef.current = next; setPendingState(next); };
  const [open, setOpen] = useState(false);
  const [openWithKeys, setOpenWithKeys] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrub = useRef<{ id: number; x: number; base: number; moved: boolean } | null>(null);
  const justFocused = useRef(false);
  const locked = !view.editable;
  const shown = pending !== null ? String(pending) : draft ?? view.text;
  const isDefault = pending === null && draft === null && !view.written;
  const why = axisTooltip(view, parent, limits);
  // On the field, not the input: a text input matches :focus-visible on every click, and the hint would cover the row
  // above while typing. Hover shows it after 1s; assistive tech reads it as the input's description.
  const [onHandle, setOnHandle] = useState(false);
  const tip = useIconTooltip(open || onHandle ? false : why);
  const handleTip = useIconTooltip(locked || disabled || open ? false : `${name} · drag to change${limits}`);

  const commit = (input: SizingInput) => {
    if (input.kind === "invalid") { inspectorStatus.set("neutral", input.message); return; }
    if (input.kind === "revert") return;
    if (onInput) onInput(input);
    else onWrite?.(sizingOps(view, input, measured));
  };
  const commitDraft = () => {
    if (draft === null) return;
    setDraft(null);
    if (draft.trim() !== view.text) commit(parseSizingInput(draft, axis));
  };
  const commitPending = () => {
    const px = pendingRef.current;
    if (px === null) return;
    setPending(null);
    commit({ kind: "fixed", px });
  };
  const pick = (input: SizingInput) => {
    setOpen(false);
    setDraft(null);
    inputRef.current?.focus();
    commit(input);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || locked) return;
    const input = event.currentTarget;
    if (event.key === "ArrowDown" && event.altKey) {
      event.preventDefault();
      setDraft(null);
      setPending(null);
      setOpenWithKeys(true);
      setOpen(true);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      // Repeats move the value; the key's release writes it once.
      event.preventDefault();
      setDraft(null);
      const base = pendingRef.current ?? stepBase(view, measured);
      setPending(stepped(base, (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 8 : 1)));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (pendingRef.current !== null) commitPending();
      else commitDraft();
      requestAnimationFrame(() => inputRef.current?.select());
      return;
    }
    if (event.key === "Escape" && (draft !== null || pendingRef.current !== null)) {
      event.preventDefault();
      event.stopPropagation();
      setDraft(null);
      setPending(null);
      requestAnimationFrame(() => inputRef.current?.select());
      return;
    }
    const all = input.value.length > 0 && input.selectionStart === 0 && input.selectionEnd === input.value.length;
    if ((event.key === "Backspace" || event.key === "Delete") && all && draft === null && view.written) {
      event.preventDefault();
      commit({ kind: "auto" });
    }
  };
  const onKeyUp = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") commitPending();
  };

  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (disabled || locked || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    scrub.current = { id: event.pointerId, x: event.clientX, base: stepBase(view, measured), moved: false };
    setDraft(null);
  };
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const state = scrub.current;
    if (!state || state.id !== event.pointerId) return;
    const travel = event.clientX - state.x;
    if (!state.moved && Math.abs(travel) < 2) return;
    state.moved = true;
    setPending(scrubbed(state.base, travel, event.shiftKey));
  };
  const endScrub = (event: PointerEvent<HTMLSpanElement>, keep: boolean) => {
    const state = scrub.current;
    if (!state || state.id !== event.pointerId) return;
    scrub.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (keep && state.moved) commitPending();
    else setPending(null);
  };

  const fixedPx = view.written && view.mode === "fixed" && view.px !== null ? view.px : measured;
  const mark = view.source === "bound" ? "icon-code-01-line" : "icon-lock-01-line";
  return (
    <div ref={wrapRef} className="studio-sizing__field" data-default={isDefault || undefined} data-axis={axis} data-prop={axis} {...tip.bind({})}>
      <InputField
        ref={inputRef}
        size="sm"
        aria-label={name}
        role="spinbutton"
        aria-valuenow={pending ?? (view.mode === "fixed" && view.px !== null ? view.px : measured ?? undefined)}
        aria-valuemin={1}
        aria-valuetext={`${view.fromParent ? "Fill from the parent" : shown}${measured !== null ? `, ${measured} px` : ""}`}
        aria-description={why}
        autoComplete="off"
        spellCheck={false}
        value={shown}
        disabled={disabled}
        readOnly={locked}
        onValueChange={(next) => { setPending(null); setDraft(next); }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onFocus={(event: FocusEvent<HTMLInputElement>) => { justFocused.current = true; event.currentTarget.select(); }}
        onMouseUp={(event: MouseEvent<HTMLInputElement>) => { if (justFocused.current) { justFocused.current = false; event.preventDefault(); } }}
        onBlur={() => { justFocused.current = false; commitPending(); commitDraft(); }}
        leading={(
          <span
            className={`studio-sizing__handle ${typographyStyles["Body/Small/Medium"]}`}
            data-locked={locked || disabled || undefined}
            aria-hidden="true"
            {...handleTip.bind({
              onPointerEnter: () => setOnHandle(true),
              onPointerLeave: () => setOnHandle(false),
              onPointerDown,
              onPointerMove,
              onPointerUp: (event: PointerEvent<HTMLSpanElement>) => endScrub(event, true),
              onPointerCancel: (event: PointerEvent<HTMLSpanElement>) => endScrub(event, false),
            })}
          >
            {axisLetter[axis]}
            {handleTip.tooltip}
          </span>
        )}
        trailing={(
          <span className="studio-sizing__trail">
            {measured !== null ? <span className={`studio-sizing__measure ${typographyStyles["Body/Small/Regular"]}`}>{measured}</span> : null}
            {locked ? (
              <span className="studio-sizing__mark"><Icon name={mark} size="sm" decorative /></span>
            ) : (
              <InputLeadingTrailing
                size="sm"
                icon="icon-chevron-down-line"
                aria-label={`${name} options`}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={(event) => { setOpenWithKeys(event.detail === 0); setOpen((current) => !current); }}
              />
            )}
          </span>
        )}
      />
      {/* Outside the field: its control clips overflow. Anchored to the whole field, 4px below it. */}
      <Popover
        open={open}
        onOpenChange={(next) => { if (!next) setOpen(false); }}
        anchorRef={wrapRef}
        align={align}
        autoFocus={openWithKeys}
        aria-label={`${name} sizing`}
      >
        <PopoverItem label={`Fixed ${name.toLowerCase()}${fixedPx !== null ? ` · ${fixedPx}` : ""}`} caption="Keep the current size" selected={view.written && view.mode === "fixed"} onSelect={() => pick({ kind: "fixed-current" })} />
        <PopoverItem label="Hug contents" caption={hugCaption(axis)} selected={view.written && view.mode === "hug"} onSelect={() => pick({ kind: "hug" })} />
        <PopoverItem label="Fill container" caption={fillCaption(axis, parent)} selected={view.written && view.mode === "fill"} onSelect={() => pick({ kind: "fill" })} />
        {view.written ? <Divider decorative /> : null}
        {view.written ? <PopoverItem label="Reset to auto" onSelect={() => pick({ kind: "auto" })} /> : null}
      </Popover>
      {tip.tooltip}
    </div>
  );
}

/* ── min / max ────────────────────────────────────────────────────────────────────────────────────────────────── */

function LimitField({ prop, value, live, prefill, disabled, focusAt, onWrite }: {
  prop: LimitProp;
  value: PropValue;
  /** What the element renders with (bound and spread values). */
  live: number | null;
  /** The measured px a just-added field starts from (default tone, written only when committed). */
  prefill: number | null;
  disabled: boolean;
  /** A time stamp: the menu just added this field, focus it. */
  focusAt: number;
  onWrite: (ops: EditOp[] | null) => void;
}) {
  const text = limitText[prop];
  const written = limitValue(value);
  const locked = value.state === "bound" || value.state === "spread";
  const fed = value.state === "spread" && typeof value.live === "number" ? Math.round(value.live) : live;
  const [draft, setDraft] = useState<string | null>(null);
  const [pending, setPendingState] = useState<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const setPending = (next: number | null) => { pendingRef.current = next; setPendingState(next); };
  const inputRef = useRef<HTMLInputElement>(null);
  const resting = locked ? (fed !== null ? String(fed) : "") : written !== null ? String(written) : value.state === "unset" && prefill !== null && focusAt ? String(prefill) : "";
  const shown = pending !== null ? String(pending) : draft ?? resting;
  const isDefault = pending === null && draft === null && written === null;
  const tip = useIconTooltip(locked ? (value.state === "bound" ? `Bound to {${value.expression}}: change it in the code` : `Set by ${value.via}. Read-only here`) : false);

  useEffect(() => {
    if (!focusAt) return undefined;
    // The menu hands focus back to its trigger as it closes: take it after that.
    const timer = window.setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
    return () => window.clearTimeout(timer);
  }, [focusAt]);

  const commitText = (raw: string) => {
    const parsed = parseLimit(raw);
    if (parsed === "invalid") { inspectorStatus.set("neutral", `${text.name} takes a number of px`); return; }
    onWrite(limitOps(prop, parsed, value));
  };
  const commitPending = () => {
    const px = pendingRef.current;
    if (px === null) return;
    setPending(null);
    onWrite(limitOps(prop, px, value));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled || locked) return;
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      setDraft(null);
      const base = pendingRef.current ?? written ?? prefill ?? 0;
      setPending(Math.max(0, base + (event.key === "ArrowUp" ? 1 : -1) * (event.shiftKey ? 8 : 1)));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      if (pendingRef.current !== null) { commitPending(); return; }
      // Enter commits what the field shows: a just-added field's prefill, a typed value, or empty (removes the prop).
      const raw = draft ?? resting;
      setDraft(null);
      commitText(raw);
      return;
    }
    if (event.key === "Escape" && (draft !== null || pendingRef.current !== null)) {
      event.preventDefault();
      event.stopPropagation();
      setDraft(null);
      setPending(null);
    }
  };

  return (
    <div className="studio-sizing__field" data-default={isDefault || undefined} data-prop={prop}>
      <InputField
        ref={inputRef}
        size="sm"
        aria-label={text.name}
        role="spinbutton"
        aria-valuenow={pending ?? written ?? fed ?? undefined}
        aria-valuemin={0}
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        placeholder={prop.startsWith("min") ? "Auto" : "None"}
        value={shown}
        disabled={disabled}
        readOnly={locked}
        onValueChange={(next) => { setPending(null); setDraft(next); }}
        {...tip.bind({
          onKeyDown,
          onKeyUp: (event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") commitPending(); },
          onBlur: () => {
            commitPending();
            if (draft === null) return;
            const raw = draft;
            setDraft(null);
            if (raw.trim() !== resting) commitText(raw);
          },
        })}
        leading={<span className={`studio-sizing__handle ${typographyStyles["Body/Small/Medium"]}`} data-locked="true" aria-hidden="true">{text.short}</span>}
        trailing={(
          <span className="studio-sizing__trail">
            <span className={`studio-sizing__measure ${typographyStyles["Body/Small/Regular"]}`}>px</span>
            {locked ? <span className="studio-sizing__mark"><Icon name={value.state === "bound" ? "icon-code-01-line" : "icon-lock-01-line"} size="sm" decorative /></span> : null}
          </span>
        )}
      />
      {tip.tooltip}
    </div>
  );
}

/* ── align in parent / children ───────────────────────────────────────────────────────────────────────────────── */

/** A bound or spread value: the live value, read-only (never editable here), with where it comes from. */
function ReadOnlyValue({ label, text, value }: { label: string; text: string; value: Extract<PropValue, { state: "bound" | "spread" }> }) {
  const tip = useIconTooltip(value.state === "bound" ? `Bound to {${value.expression}}: change it in the code` : `Set by ${value.via}. Read-only here`);
  return (
    <div className="studio-sizing__field">
      <InputField
        size="sm"
        aria-label={label}
        value={text}
        readOnly
        {...tip.bind({})}
        trailing={<span className="studio-sizing__mark"><Icon name={value.state === "bound" ? "icon-code-01-line" : "icon-lock-01-line"} size="sm" decorative /></span>}
      />
      {tip.tooltip}
    </div>
  );
}

function AlignInParent({ value, info, disabled, onWrite }: { value: PropValue; info: HostInfo; disabled: boolean; onWrite: (ops: EditOp[] | null) => void }) {
  const options = alignSelfOptions(info.parent);
  const literal = alignSelfLiteral(value);
  const effective = effectiveAlign(info.alignSelf, info.parentAlign);
  const fed = value.state === "spread" && typeof value.live === "string" && (options.some((option) => option.id === value.live)) ? (value.live as AlignSelfValue) : null;
  const selected = literal ?? fed ?? effective.value;
  const selectedName = options.find((option) => option.id === selected)?.name ?? selected;
  const follows = effective.baseline ? "text baseline" : selectedName.toLowerCase();
  const tip = useIconTooltip(literal ? false : `Follows the parent: ${follows}`);
  const label = <span {...tip.bind({})}>Align in parent{tip.tooltip}</span>;
  const reset = literal && !disabled
    ? <IconButton icon="icon-reverse-left-line" aria-label="Reset align in parent" appearance="flat" level="primary" size="xs" onClick={() => onWrite(alignSelfOps(null, value))} />
    : <span className="studio-sizing__slot" />;
  if (value.state === "bound" || (value.state === "spread" && fed)) {
    return <InspectorRow name="alignSelf" label={label} action={<span className="studio-sizing__slot" />}><ReadOnlyValue label="Align in parent" text={selectedName} value={value} /></InspectorRow>;
  }
  return (
    <InspectorRow name="alignSelf" label={label} isDefault={!literal} action={reset}>
      <div className="studio-sizing__seg" data-default={!literal || undefined}>
        <Segmented
          aria-label={literal ? "Align in parent" : `Align in parent (follows the parent: ${follows})`}
          size="sm"
          fullWidth
          disabled={disabled || value.state === "spread"}
          value={selected}
          onValueChange={(next) => onWrite(alignSelfOps(next as AlignSelfValue, value))}
          options={options.map((option) => ({ id: option.id, label: null, leading: option.icon as IconName, "aria-label": option.name }))}
        />
      </div>
    </InspectorRow>
  );
}

function Children({ value, disabled, onWrite }: { value: PropValue; disabled: boolean; onWrite: (ops: EditOp[] | null) => void }) {
  const on = value.state === "literal" ? value.value === true : value.state === "spread" ? value.live === true : false;
  const tip = useIconTooltip("Fill equally: every child takes an equal share along the direction; a child's own width or height wins");
  // "Child size", not "Children": the Slots section of a layout primitive is titled Children.
  const label = <span {...tip.bind({})}>Child size{tip.tooltip}</span>;
  if (value.state === "bound" || (value.state === "spread" && typeof value.live === "boolean")) {
    return <InspectorRow name="fillChildren" label={label} action={<span className="studio-sizing__slot" />}><ReadOnlyValue label="Child size" text={on ? "Fill equally" : "Own size"} value={value} /></InspectorRow>;
  }
  const unset = value.state === "unset" || value.state === "spread";
  return (
    <InspectorRow name="fillChildren" label={label} isDefault={unset} action={<span className="studio-sizing__slot" />}>
      <div className="studio-sizing__seg" data-default={unset || undefined}>
        <Segmented
          aria-label="Child size"
          size="sm"
          fullWidth
          disabled={disabled || value.state === "spread"}
          value={on ? "fill" : "own"}
          onValueChange={(next) => onWrite(fillChildrenOps(next === "fill", value))}
          options={[{ id: "own", label: "Own size" }, { id: "fill", label: "Fill equally" }]}
        />
      </div>
    </InspectorRow>
  );
}

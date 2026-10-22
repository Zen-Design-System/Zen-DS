import { useContext, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useWords } from "../useWords";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { ColorSwatch } from "../../../components/ColorSwatch";
import { InputField, NumberField, SelectField, TextAreaField } from "../../../components/Input";
import { Popover, PopoverItem } from "../../../components/Popover";
import { Segmented } from "../../../components/Segmented";
import { SliderField } from "../../../components/SliderField";
import { ToggleButton } from "../../../components/Toggle";
import type { IconName } from "../../../icons/generated/names";
import { typographyStyles } from "../../../tokens/typography.generated";
import { studioApi } from "../api";
import { InspectorFileContext, InspectorHostContext } from "./controls/hostContext";
import { usePendingDraft } from "./drafts";
import { iconGroups, iconsIn, relatedIcons, withRecent } from "./iconSuggestions";
import { figmaOptions } from "./propGroups";
import { allIconNames, dataEditable, dataSourceLabel, fixableBinding, inSentence, matchOption, propLabel, typographyFamily, typographyKeys, type Literal, type PropSpec, type PropValue } from "./propSchema";
import { useObjectStarter } from "./useObjectStarter";
import { PhotoControl } from "./controls/PhotoControl";
import { ScaleField } from "./controls/ScaleField";
import { scaleOfType, optionLabel } from "./controls/scale";
import { InspectorRow, NoInlineLabel, useInlineLabel } from "./Section";
import { numberRange, type NumberRange } from "./numberRanges";
import { toneWarning } from "./toneRules";
import { paletteFor, tonePalette, type SwatchPalette } from "./palettes";
import { requestPickColor } from "../edit/pickColorRequest";
import { RowSelectField } from "./rowFields";
import { hexOf, nearestColors, parseHex, type Rgb } from "./controls/colorMatch";
import { openVariables } from "../variables/variablesState";
import { inspectorStatus } from "./status";

/** A colour variable's rendered RGB where `at` sits (its CSS value read through a 1-px canvas; a translucent one over white). */
let probe: CanvasRenderingContext2D | null | undefined;
function rgbOf(at: Element | null, variable: string | null): Rgb | null {
  if (!at || !variable) return null;
  const value = getComputedStyle(at).getPropertyValue(variable).trim();
  if (!value) return null;
  probe ??= typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe) return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "#fff";
  probe.fillRect(0, 0, 1, 1);
  probe.fillStyle = value;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
  return { r, g, b };
}

/*
 * One editable prop (spec §6): the editor follows the prop's type; the row shows whether the source sets a literal
 * (editable, with a reset in the row's fixed trailing slot), binds an expression (read-only "Bound to {expr}"), receives
 * it through a spread (read-only, the live value) or leaves it unset (the effective default, in the lighter tone).
 * A boolean bound to data (`status={one.online}`, no state read) stays switchable as in Figma: the switch shows what
 * the element renders and writes a fixed value; `onRestore` puts the saved binding back.
 */

const iconSet = new Set(allIconNames);
const asIcon = (value: unknown) => (typeof value === "string" && iconSet.has(value) ? (value as IconName) : undefined);

type ControlProps<T extends Literal> = { label: string; value: T | undefined; fallback: T | undefined; disabled: boolean; onSet: (value: T) => void };

/**
 * Text committed once per value: on Enter, on blur, or when the selection changes while it is still a draft (a press
 * on the canvas unmounts the field before blur). Escape restores the source value and keeps focus in the field.
 */
export function TextControl({ label, value, fallback, disabled, onSet, multiline = false, autoFocusToken, numeric = false }: ControlProps<string | number> & { multiline?: boolean; autoFocusToken?: number; numeric?: boolean }) {
  const inlineLabel = useInlineLabel();
  const source = value === undefined ? "" : String(value);
  const [draft, setDraft] = useState(source);
  const committed = useRef<string | null>(null);
  // Only what the user typed is written. Between a new value and the effect that copies it into the draft, a selection
  // change flushes the drafts (drafts.ts) with the old one: a Sidebar section's Label wrote "" on a double-click on the
  // canvas (2026-10-10).
  const edited = useRef(false);
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  useEffect(() => {
    setDraft(source);
    committed.current = null;
    edited.current = false;
  }, [source]);
  useEffect(() => {
    if (!autoFocusToken) return;
    ref.current?.focus();
    ref.current?.select();
  }, [autoFocusToken]);
  const commit = () => {
    if (disabled || !edited.current || draft === source || draft === committed.current) return;
    committed.current = draft;
    onSet(numeric && /^-?\d+(\.\d+)?$/.test(draft.trim()) ? Number(draft.trim()) : draft);
  };
  const change = (next: string) => {
    edited.current = true;
    setDraft(next);
  };
  usePendingDraft(commit);
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setDraft(source);
      committed.current = null;
      edited.current = false;
    }
  };
  const placeholder = fallback === undefined ? "" : String(fallback);
  if (multiline) return <TextAreaField ref={ref} aria-label={label} size="sm" value={draft} rows={3} disabled={disabled} placeholder={placeholder} onValueChange={change} onBlur={commit} onKeyDown={onKeyDown} />;
  return <InputField ref={ref} aria-label={label} size="sm" layout={inlineLabel ? "inline" : undefined} label={inlineLabel ?? undefined} value={draft} disabled={disabled} placeholder={placeholder} onValueChange={change} onBlur={commit} onKeyDown={onKeyDown} />;
}

/**
 * A number with a known range (numberRanges.ts): Figma's Slider/Field — drag to scrub, click to type, ↑/↓ step. It writes
 * once the scrub pauses, on blur or on a selection change, never on every pixel of a drag.
 */
function NumberSliderControl({ label, value, fallback, disabled, onSet, range }: ControlProps<number> & { range: NumberRange }) {
  const inlineLabel = useInlineLabel();
  const start = value ?? fallback ?? range.min;
  const [draft, setDraft] = useState(start);
  const edited = useRef(false);
  const timer = useRef(0);
  useEffect(() => {
    setDraft(start);
    edited.current = false;
  }, [start]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const commit = (next: number = draft) => {
    window.clearTimeout(timer.current);
    if (disabled || !edited.current || next === value) return;
    edited.current = false;
    onSet(next);
  };
  usePendingDraft(() => commit());
  return (
    <div className="studio-slider-control" onBlur={() => commit()}>
      <SliderField
        label={inlineLabel ?? label}
        aria-label={label}
        size="sm"
        min={range.min}
        max={range.max}
        step={range.step}
        formatValue={range.format}
        value={draft}
        disabled={disabled}
        onValueChange={(next) => {
          edited.current = true;
          setDraft(next);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => commit(next), 400);
        }}
      />
    </div>
  );
}

/** A number committed once per value, on Enter, blur or a selection change (as TextControl). */
export function NumberControl({ label, value, fallback, disabled, onSet }: ControlProps<number>) {
  const inlineLabel = useInlineLabel();
  const [draft, setDraft] = useState<number | null>(value ?? null);
  const committed = useRef<number | null>(null);
  /** Typed by the user (see TextControl): a stale draft is never written back. */
  const edited = useRef(false);
  useEffect(() => {
    setDraft(value ?? null);
    committed.current = null;
    edited.current = false;
  }, [value]);
  const commit = () => {
    if (disabled || !edited.current || draft === null || draft === value || draft === committed.current) return;
    committed.current = draft;
    onSet(draft);
  };
  usePendingDraft(commit);
  return (
    <NumberField
      aria-label={label}
      size="sm"
      layout={inlineLabel ? "inline" : undefined}
      label={inlineLabel ?? undefined}
      value={draft}
      placeholder={fallback === undefined ? "" : String(fallback)}
      disabled={disabled}
      onValueChange={(next) => { edited.current = true; setDraft(next); }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setDraft(value ?? null);
          committed.current = null;
          edited.current = false;
        }
      }}
    />
  );
}

/* Small full-width Segmented: equal items, each its label plus 2 × (item padding + label padding), in a padded track.
   Read from the Segmented tokens where it renders (Segmented/Spacing Small Horizontal-Padding and Text-Wrapper-Padding,
   Spacing/Padding/3XSmall for the track), so a token change never leaves a cut label ("Stac…", 2026-10-15). */
function segmentedChrome(host: HTMLElement) {
  const style = getComputedStyle(host);
  const px = (name: string, fallback: number) => parseFloat(style.getPropertyValue(name)) || fallback;
  return {
    item: 2 * (px("--zen-segmented-spacing-small-horizontal-padding", 4) + px("--zen-segmented-spacing-small-text-wrapper-padding", 8)),
    track: 2 * px("--zen-spacing-padding-3-xsmall", 2),
  };
}

/**
 * Whether a small full-width Segmented shows every label whole at the wrapper's current width. In a label-left row the
 * Segmented has the control column, while a select takes the label inside and both columns (Inline-Field): the check
 * uses the control column's width either way, so the choice never flips with the row it causes.
 */
function useSegmentedFits(labels: string[]) {
  const ref = useRef<HTMLDivElement>(null);
  const [fits, setFits] = useState(true);
  const key = labels.join("\u0000");
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return undefined;
    const names = key.split("\u0000");
    const probe = document.createElement("span");
    probe.className = `studio-inspector__measure ${typographyStyles["Body/Small/Bold"]}`;
    host.appendChild(probe);
    const measureText = () => names.map((name) => { probe.textContent = name; return probe.getBoundingClientRect().width; });
    let widths = measureText();
    const row = host.closest<HTMLElement>(".studio-inspector__row");
    const column = () => {
      if (!row || row.dataset.stacked === "true" || row.dataset.compact === "true") return host.clientWidth;
      const style = getComputedStyle(row);
      const gap = parseFloat(style.columnGap) || 0;
      const action = parseFloat(style.gridTemplateColumns.split(" ").pop() ?? "") || 0;
      return (row.clientWidth - action - gap * 2) / 2;
    };
    const check = () => {
      const available = column();
      if (!available || !names.length) return;
      const chrome = segmentedChrome(host);
      setFits((available - chrome.track) / names.length >= Math.max(...widths) + chrome.item);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(row ?? host);
    let alive = true;
    void document.fonts?.ready.then(() => { if (!alive) return; widths = measureText(); check(); });
    return () => { alive = false; observer.disconnect(); probe.remove(); };
  }, [key]);
  return [ref, fits] as const;
}

/** A string-literal union: Segmented when up to four options all fit whole at the current width, otherwise a select. */
/** `labels` names options whose value is not the text to show ("between" → "Space between"); others show as written. */
/** The "not set" choice of an enum with no known default: the component's own default (picking it removes the prop). */
const DEFAULT_CHOICE = "__studio-default__";

export function EnumControl({ label, value, fallback, disabled, onSet, onReset, options, labels }: ControlProps<string> & { options: string[]; labels?: Record<string, string>; onReset?: () => void }) {
  // The long spelling of a size ("small") is the same option as the short one ("sm"): matched, never a second option.
  const matched = value === undefined ? undefined : matchOption(value, options);
  // No known default (Stack scroll: x | y): "Default" leads the options and is what an unset prop shows, so the control
  // always has a choice selected (user, 2026-10-15: a Segmented with none selected read as broken, a select as "—").
  const withDefault = fallback === undefined && (matched === undefined || Boolean(onReset));
  const listed = matched !== undefined && !options.includes(matched) ? [...options, matched] : options;
  const all = withDefault ? [DEFAULT_CHOICE, ...listed] : listed;
  const current = matched ?? (fallback === undefined ? (withDefault ? DEFAULT_CHOICE : "") : matchOption(fallback, all));
  const text = (option: string) => (option === DEFAULT_CHOICE ? "Default" : labels?.[option] ?? optionLabel(option));
  const pick = (next: string) => {
    if (next === DEFAULT_CHOICE) { if (matched !== undefined) onReset?.(); }
    else if (next !== matched) onSet(next);
  };
  const [ref, fits] = useSegmentedFits(all.length <= 4 ? all.map(text) : []);
  const inlineLabel = useInlineLabel();
  return (
    <div ref={ref} className="studio-enum">
      {all.length <= 4 && fits ? (
        <Segmented
          aria-label={label}
          size="sm"
          fullWidth
          disabled={disabled}
          value={current}
          onValueChange={pick}
          options={all.map((option) => ({ id: option, label: text(option) }))}
        />
      ) : (
        <SelectField
          aria-label={label}
          size="sm"
          layout={inlineLabel ? "inline" : undefined}
          label={inlineLabel ?? undefined}
          disabled={disabled}
          value={current}
          placeholder="—"
          popoverSearch={all.length > 12}
          onValueChange={pick}
          options={all.map((option) => ({ value: option, label: text(option) }))}
        />
      )}
    </div>
  );
}

/** Figma's text alignment icons and names (Typography › Alignment): horizontal start / center / end / justify, vertical
 * top / middle / bottom. */
const textAlignments: Record<string, { icon: IconName; name: string }> = {
  start: { icon: "icon-align-left-line", name: "Align left" },
  center: { icon: "icon-align-center-line", name: "Align center" },
  end: { icon: "icon-align-right-line", name: "Align right" },
  justify: { icon: "icon-align-justify-line", name: "Justified" },
  top: { icon: "icon-align-top-01-line", name: "Align top" },
  middle: { icon: "icon-align-vertical-center-01-line", name: "Align middle" },
  bottom: { icon: "icon-align-bottom-01-line", name: "Align bottom" },
};

/**
 * Text alignment as in Figma: icon-only segments, each named by a tooltip (Align left / center / right, Justified; Align
 * top / middle / bottom). Unset shows the alignment the text renders with (`fallback`, read from the canvas: a parent
 * may centre it); picking that one writes nothing, as a click on Figma's current alignment changes nothing.
 */
export function TextAlignControl({ label, value, fallback, disabled, onSet, options }: ControlProps<string> & { options: string[] }) {
  const all = value !== undefined && !options.includes(value) ? [...options, value] : options;
  const current = value ?? fallback ?? "";
  return (
    <Segmented
      aria-label={label}
      size="sm"
      fullWidth
      disabled={disabled}
      value={current}
      onValueChange={(next) => { if (next !== current) onSet(next); }}
      options={all.map((option) => {
        const known = textAlignments[option];
        return known ? { id: option, label: "", leading: known.icon, "aria-label": known.name } : { id: option, label: option };
      })}
    />
  );
}

/**
 * Max lines (Figma's Truncate text › Max lines): a whole number, at least 1. A stepper click writes at once (the field
 * keeps no focus then); typing writes on Enter, blur, an arrow key's release or a selection change (as NumberControl).
 */
function LinesControl({ label, value, disabled, onSet }: { label: string; value: number; disabled: boolean; onSet: (value: number) => void }) {
  const inlineLabel = useInlineLabel();
  const [draft, setDraft] = useState<number | null>(value);
  const committed = useRef<number | null>(null);
  /** Typed or stepped by the user (see TextControl): a stale draft is never written back. */
  const edited = useRef(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setDraft(value);
    committed.current = null;
    edited.current = false;
  }, [value]);
  const commit = (next: number | null = draft) => {
    if (disabled || !edited.current || next === null) return;
    const lines = Math.max(1, Math.round(next));
    if (lines === value || lines === committed.current) return;
    committed.current = lines;
    onSet(lines);
  };
  usePendingDraft(() => commit());
  return (
    <NumberField
      ref={ref}
      aria-label={label}
      size="sm"
      layout={inlineLabel ? "inline" : undefined}
      label={inlineLabel ?? undefined}
      min={1}
      step={1}
      value={draft}
      disabled={disabled}
      onValueChange={(next) => {
        edited.current = true;
        setDraft(next);
        if (document.activeElement !== ref.current) commit(next);
      }}
      onBlur={() => commit()}
      onKeyUp={(event) => { if (event.key === "ArrowUp" || event.key === "ArrowDown") commit(); }}
      onKeyDown={(event) => {
        if (event.key === "Enter") commit();
        else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          setDraft(value);
          committed.current = null;
          edited.current = false;
        }
      }}
    />
  );
}

function NumberEnumControl({ label, value, fallback, disabled, onSet, options }: ControlProps<number> & { options: number[] }) {
  const inlineLabel = useInlineLabel();
  const all = value !== undefined && !options.includes(value) ? [...options, value] : options;
  return (
    <SelectField
      aria-label={label}
      size="sm"
      layout={inlineLabel ? "inline" : undefined}
      label={inlineLabel ?? undefined}
      disabled={disabled}
      value={value !== undefined ? String(value) : fallback !== undefined ? String(fallback) : ""}
      placeholder="—"
      onValueChange={(next) => { if (Number(next) !== value) onSet(Number(next)); }}
      options={all.map((option) => ({ value: String(option), label: String(option) }))}
    />
  );
}

/**
 * A number Figma names in steps (Progress-Bar Progress: None 0, Low 20 … Done 100; figma-props.map.mjs): a select of the
 * steps by their Figma names. A number between them shows as itself ("53%"); the prop's own field below sets it.
 */
function NumberStepsControl({ label, value, fallback, disabled, onSet, steps, range }: ControlProps<number> & { steps: Readonly<Record<string, string>>; range: NumberRange | null }) {
  const shown = value ?? fallback;
  const options = Object.entries(steps).map(([option, name]) => ({ value: option, label: name }));
  if (shown !== undefined && !(String(shown) in steps)) options.push({ value: String(shown), label: range?.format?.(shown) ?? String(shown) });
  return (
    <RowSelectField
      aria-label={label}
      size="sm"
      disabled={disabled}
      value={shown !== undefined ? String(shown) : ""}
      placeholder="—"
      onValueChange={(next) => { if (Number(next) !== value) onSet(Number(next)); }}
      options={options}
    />
  );
}

/** Text styles grouped by family ("Body" → Body/Base/Regular, Body/Small/Medium…), in typographyStyles order. */
function textStyleGroups(keys: readonly string[]) {
  const groups = new Map<string, string[]>();
  for (const key of keys) {
    const family = typographyFamily(key);
    const list = groups.get(family);
    if (list) list.push(key);
    else groups.set(family, [key]);
  }
  return [...groups].map(([family, members]) => ({ family, members }));
}

/**
 * Text styles (keys of typographyStyles) in a searchable list grouped by family. The trigger is a SelectField (same look
 * as the other selects) whose own list stays closed: it opens this grouped Popover instead. `emptyLabel` is what it
 * says while nothing is set ("None"); `onClear` adds a "None" row that removes the style.
 */
export function TypographyControl({ label, value, fallback, disabled, onSet, emptyLabel, onClear }: ControlProps<string> & { emptyLabel?: string; onClear?: () => void }) {
  const inlineLabel = useInlineLabel();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const shown = value ?? fallback;
  const groups = useMemo(() => {
    if (!open) return [];
    const keys = value !== undefined && !typographyKeys.includes(value) ? [...typographyKeys, value] : typographyKeys;
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return textStyleGroups(keys.filter((key) => terms.every((term) => key.toLowerCase().includes(term))));
  }, [open, query, value]);
  // The trigger tells assistive tech about this list (the SelectField's own list never opens).
  useEffect(() => {
    const trigger = anchorRef.current?.querySelector<HTMLElement>(".zen-select__trigger");
    if (!trigger) return;
    trigger.setAttribute("aria-expanded", String(open));
    trigger.setAttribute("aria-controls", `${listId}-list`);
  }, [open, listId]);
  // The current style in view when the list opens (it may sit below the first 240px).
  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => popoverRef.current?.querySelector(".zen-popover__item.is-selected")?.scrollIntoView({ block: "nearest" }));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  const close = () => { setOpen(false); setQuery(""); };
  const pick = (next: string | null) => {
    close();
    anchorRef.current?.querySelector<HTMLElement>(".zen-select__trigger")?.focus();
    if (next === null) onClear?.();
    else if (next !== value) onSet(next);
  };
  const showNone = Boolean(onClear) && value !== undefined && !query.trim();
  return (
    <div ref={anchorRef} className="studio-type-control">
      <SelectField
        aria-label={label}
        size="sm"
        layout={inlineLabel ? "inline" : undefined}
        label={inlineLabel ?? undefined}
        disabled={disabled}
        value={shown ?? ""}
        placeholder={emptyLabel ?? "—"}
        options={shown ? [{ value: shown, label: shown }] : []}
        popoverOpen={false}
        onPopoverOpenChange={(next) => { if (next) setOpen((current) => !current); }}
      />
      <Popover
        ref={popoverRef}
        id={`${listId}-list`}
        open={open}
        onOpenChange={(next) => { if (!next) close(); }}
        anchorRef={anchorRef}
        search
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search text styles"
        aria-label={`${label} options`}
        autoFocus
      >
        {showNone ? <PopoverItem label="None" onSelect={() => pick(null)} /> : null}
        {groups.map(({ family, members }) => (
          <div key={family} role="group" aria-labelledby={`${listId}-${family}`} className="studio-type-control__group">
            <div id={`${listId}-${family}`} role="presentation" className={`studio-type-control__family ${typographyStyles["Caption/Medium"]}`}>{family}</div>
            {members.map((key) => <PopoverItem key={key} label={key} selected={key === value} onSelect={() => pick(key)} />)}
          </div>
        ))}
        {!groups.length && !showNone ? <div className={`studio-type-control__empty ${typographyStyles["Body/Small/Regular"]}`}>No text style matches</div> : null}
      </Popover>
    </div>
  );
}

/**
 * Colour roles offered as token swatches (inspector/palettes.ts): Text, Heading and Icon `tone` (every resting
 * Color/Content token by its path, _shared/contentTone.ts), a Shape's `fill` (Color/Background) and `stroke`
 * (Color/Border). A prop whose options all belong to one of them gets the swatch control below.
 */
export const isToneOptions = (options: readonly string[]) => options.length > 0 && options.every((option) => tonePalette.has(option));
/** A round swatch in the option's colour (its token, inline); a dashed ring for `inherit`, `none` or nothing set. */
function PaletteSwatch({ palette, option }: { palette: SwatchPalette; option: string | undefined }) {
  const token = option && palette.has(option) ? palette.colorOf(option) : null;
  return <span className="studio-tone-swatch" data-swatch={token ? undefined : "none"} style={token ? { color: `var(${token})` } : undefined} aria-hidden="true" />;
}

/** The value's swatch at the end of an inline colour field: Figma Inline-Field Type=Color's Color-Swatch. */
function InlinePaletteSwatch({ palette, option }: { palette: SwatchPalette; option: string | undefined }) {
  const token = option && palette.has(option) ? palette.colorOf(option) : null;
  return token ? <ColorSwatch color={`var(${token})`} size="sm" /> : <PaletteSwatch palette={palette} option={option} />;
}

/**
 * A colour prop (`tone`, `fill`, `stroke`): like a select, but the trigger and every option lead with a swatch of the
 * colour it paints, named after its token (Figma's variable list). The list groups the options by token family and
 * searches by name or token; aliases (secondary, accent, inverse) select the tone they paint with. The SelectField's own
 * list stays closed (as in TypographyControl).
 */
export function SwatchControl({ label, value, fallback, disabled, onSet, options, component, palette }: ControlProps<string> & { options: string[]; component?: string; palette: SwatchPalette }) {
  const inlineLabel = useInlineLabel();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const matched = value === undefined ? undefined : matchOption(value, options);
  const shown = matched ?? (fallback === undefined ? undefined : matchOption(fallback, options));
  const current = shown !== undefined && palette.has(shown) ? palette.resolve(shown) : undefined;
  const isTone = palette === tonePalette;
  const groups = useMemo(() => {
    if (!open) return [];
    const offered = new Set(options);
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (option: string) => terms.every((term) => option.includes(term) || palette.caption(option).toLowerCase().includes(term));
    return palette.groups
      .map(({ name, options: members }) => ({ name, members: members.filter((option) => offered.has(option) && hit(option)) }))
      .filter(({ members }) => members.length);
  }, [open, options, query, palette]);
  useEffect(() => {
    const trigger = anchorRef.current?.querySelector<HTMLElement>(".zen-select__trigger");
    if (!trigger) return;
    trigger.setAttribute("aria-expanded", String(open));
    trigger.setAttribute("aria-controls", `${listId}-list`);
  }, [open, listId]);
  // The current colour in view when the list opens (Support sits far below the first rows).
  useEffect(() => {
    if (!open) return undefined;
    const frame = requestAnimationFrame(() => popoverRef.current?.querySelector(".zen-popover__item.is-selected")?.scrollIntoView({ block: "nearest" }));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  // A hex typed into the search (Figma: a hex in the fill row): the nearest variables, and Local variables to make one
  // (decision 1 of the 2026-10-18 parity plan: Zen paints with variables).
  const typedHex = open ? parseHex(query) : null;
  const nearest = useMemo(() => {
    if (!typedHex) return [];
    const offered = new Set(options);
    const candidates = palette.groups.flatMap(({ options: members }) => members.filter((option) => offered.has(option)));
    return nearestColors(candidates.map((option) => ({ option, color: rgbOf(anchorRef.current, palette.colorOf(option)) })), typedHex, 3).map((entry) => entry.option);
  }, [typedHex?.r, typedHex?.g, typedHex?.b, options, palette]);
  const close = () => { setOpen(false); setQuery(""); };
  const createVariable = () => {
    const hex = typedHex ? hexOf(typedHex) : "";
    close();
    openVariables();
    inspectorStatus.set("neutral", `Make a color variable for ${hex} in Local variables`);
  };
  const pick = (next: string) => {
    close();
    anchorRef.current?.querySelector<HTMLElement>(".zen-select__trigger")?.focus();
    // An alias already written (accent, secondary) stays when its own tone is picked again.
    if (matched === undefined || palette.resolve(next) !== palette.resolve(matched)) onSet(next);
  };
  return (
    <div ref={anchorRef} className="studio-tone-control">
      {/* Inline (Figma Inline-Field Type=Color): the label left, the token and its swatch at the end. */}
      <SelectField
        aria-label={label}
        size="sm"
        layout={inlineLabel ? "inline" : undefined}
        label={inlineLabel ?? undefined}
        disabled={disabled}
        value={shown ?? ""}
        placeholder="—"
        leading={inlineLabel ? undefined : <PaletteSwatch palette={palette} option={shown} />}
        trailing={inlineLabel ? <InlinePaletteSwatch palette={palette} option={shown} /> : undefined}
        options={shown ? [{ value: shown, label: palette.label(shown) }] : []}
        popoverOpen={false}
        onPopoverOpenChange={(next) => { if (next) setOpen((was) => !was); }}
      />
      <Popover ref={popoverRef} id={`${listId}-list`} open={open} onOpenChange={(next) => { if (!next) close(); }} anchorRef={anchorRef}
        search searchValue={query} onSearchChange={setQuery} searchPlaceholder="Search colors" aria-label={`${label} options`} autoFocus>
        {typedHex ? (
          <div role="group" aria-labelledby={`${listId}-typed`} className="studio-type-control__group">
            <div id={`${listId}-typed`} role="presentation" className={`studio-type-control__family ${typographyStyles["Caption/Medium"]}`}>{`Nearest to ${hexOf(typedHex)}`}</div>
            {nearest.map((option) => (
              <PopoverItem key={`near-${option}`} label={palette.label(option)} caption={palette.caption(option)} leading={<PaletteSwatch palette={palette} option={option} />}
                selected={option === current} onSelect={() => pick(option)} />
            ))}
            <PopoverItem label="Create variable…" caption="Local variables" leading={<Icon name="icon-hexagon-01-line" size="sm" decorative />} onSelect={createVariable} />
          </div>
        ) : null}
        {/* Figma's eyedropper in its colour picker: this row's colour from a colour on the canvas (edit/pickColor.ts). */}
        {!query.trim() ? (
          <PopoverItem label="Pick color" caption="From the canvas" leading={<Icon name="icon-dropper-line" size="sm" decorative />}
            onSelect={() => { close(); requestPickColor({ label, palette, options, onPick: (option) => { if (matched === undefined || palette.resolve(option) !== palette.resolve(matched)) onSet(option); } }); }} />
        ) : null}
        {groups.map(({ name, members }) => (
          <div key={name} role="group" aria-labelledby={`${listId}-${name}`} className="studio-type-control__group">
            <div id={`${listId}-${name}`} role="presentation" className={`studio-type-control__family ${typographyStyles["Caption/Medium"]}`}>{name}</div>
            {members.map((option) => (
              <PopoverItem key={option} label={palette.label(option)} caption={[palette.caption(option), isTone ? toneWarning(palette.resolve(option), component) : null].filter(Boolean).join(" · ")} leading={<PaletteSwatch palette={palette} option={option} />}
                selected={option === current} onSelect={() => pick(option)} />
            ))}
          </div>
        ))}
        {!groups.length && !typedHex ? <div className={`studio-type-control__empty ${typographyStyles["Body/Small/Regular"]}`}>No color matches</div> : null}
      </Popover>
    </div>
  );
}

/** Text and icon colour roles (`tone`): the swatch control on Color/Content. */
export const ToneControl = (props: ControlProps<string> & { options: string[]; component?: string }) => <SwatchControl {...props} palette={tonePalette} />;

/** Icon names matching every search term: the exact name first, then names that start with it, then a word start. */
export function rankIcons(query: string, names: readonly string[] = allIconNames): string[] {
  const needle = query.trim().toLowerCase();
  const terms = needle.split(/\s+/).filter(Boolean);
  if (!terms.length) return [...names];
  const bare = (name: string) => name.replace(/^icon-/, "");
  const phrase = terms.join("-");
  const rank = (name: string) => {
    const short = bare(name);
    if (name === needle || short === phrase) return 0;
    if (short.startsWith(phrase) || name.startsWith(needle)) return 1;
    if (short.split("-").some((word) => word.startsWith(terms[0]))) return 2;
    return 3;
  };
  return names
    .filter((name) => terms.every((term) => name.includes(term)))
    .map((name, index) => ({ name, index, rank: rank(name) }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((entry) => entry.name);
}

/** The icons the selection's file writes (iconSuggestions.ts), read when the picker opens; [] until then or offline. */
function useFileIcons(open: boolean): string[] {
  const file = useContext(InspectorFileContext);
  const [icons, setIcons] = useState<string[]>([]);
  useEffect(() => {
    if (!open || !file) return undefined;
    let alive = true;
    studioApi.source(file).then((source) => { if (alive) setIcons(iconsIn(source.content, iconSet)); }, () => undefined);
    return () => { alive = false; };
  }, [open, file]);
  return icons;
}

/** The icons picked lately in any icon picker, newest first (this browser only: a private window starts empty). */
const RECENT_ICONS_KEY = "zen-studio:recent-icons";

function readRecentIcons(): string[] {
  try {
    const list: unknown = JSON.parse(window.localStorage.getItem(RECENT_ICONS_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((name): name is string => typeof name === "string" && iconSet.has(name)) : [];
  } catch {
    return [];
  }
}

function rememberIcon(name: string) {
  try {
    window.localStorage.setItem(RECENT_ICONS_KEY, JSON.stringify(withRecent(readRecentIcons(), name)));
  } catch {
    // No storage (a private window): the picker simply has no Recent group.
  }
}

/** The words beside the selection for Related icons: its own text, else the nearest ancestor's within four levels (a
 *  Metric card's dock icon → "Revenue $48,200…"), at most 160 characters. */
function wordsNear(host: Element | null): string {
  let element = host;
  for (let depth = 0; element && depth < 4; depth += 1, element = element.parentElement) {
    const text = element.textContent?.trim();
    if (text) return text.slice(0, 160);
  }
  return "";
}

/**
 * Icon names with a searchable list (at most 200 shown). With no search it leads with `defaultIcon` (the swap's default
 * in Figma), the icons picked lately and the related ones (as tiles), the icons the file already uses, then every icon
 * (user 2026-10-07: Figma's preferred values are the whole set; 2026-10-14: Recent and Related so a swap needs no
 * typing). `emptyLabel`: what the field reads with no icon ("None").
 */
export function IconControl({ label, value, fallback, disabled, onSet, emptyLabel = "None", defaultIcon }: ControlProps<string> & { emptyLabel?: string; defaultIcon?: string }) {
  const inlineLabel = useInlineLabel();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const shown = value ?? fallback;
  const fileIcons = useFileIcons(open);
  const host = useContext(InspectorHostContext);
  const searching = Boolean(query.trim());
  const items = useMemo(() => {
    if (!open || !searching) return undefined;
    return rankIcons(query)
      .slice(0, 200)
      .map((name) => ({ id: name, label: name, leading: name as IconName, selected: name === value }));
  }, [open, searching, query, value]);
  const groups = useMemo(() => {
    if (!open || searching) return [];
    const current = asIcon(shown);
    return iconGroups(allIconNames.slice(0, 200), {
      defaultIcon: asIcon(defaultIcon), fileIcons, current, recent: readRecentIcons(), related: relatedIcons(current, allIconNames, wordsNear(host)),
    });
  }, [open, searching, defaultIcon, fileIcons, shown, host]);
  const pick = (name: string) => {
    setOpen(false);
    setQuery("");
    rememberIcon(name);
    if (name !== value) onSet(name);
  };
  return (
    <div ref={anchorRef} className="studio-icon-control" data-empty={shown ? undefined : "true"} data-inline={inlineLabel ? "true" : undefined}>
      {/* zen-allow-filter-button: an inspector value picker (an icon name for a prop), not a filter or sort control; it
          wears a field's frame like the selects around it (Design panel UI3) */}
      <Button
        level="tertiary"
        size="sm"
        disabled={disabled}
        startIcon={inlineLabel ? undefined : asIcon(shown)}
        endIcon="icon-chevron-down-line"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${shown ?? emptyLabel.toLowerCase()}`}
        onClick={() => setOpen((current) => !current)}
      >
        {/* Inline (Figma Inline-Field): the row's label left, the icon and its name at the end. */}
        {inlineLabel ? <span className={`studio-inline-label ${typographyStyles["Body/Small/Medium"]}`}>{inlineLabel}</span> : null}
        {inlineLabel && asIcon(shown) ? <Icon name={asIcon(shown) as IconName} size="sm" decorative /> : null}
        <span className={`studio-icon-control__label ${typographyStyles["Body/Small/Medium"]}`}>{shown ?? emptyLabel}</span>
      </Button>
      <Popover
        open={open}
        onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}
        anchorRef={anchorRef}
        search
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search icons"
        aria-label={`${label} icons`}
        items={items}
        autoFocus
        emptyState="No icon matches"
        onSelect={(item) => pick(item.id)}
      >
        {groups.map((group) => (
          <div key={group.id} role="group" aria-labelledby={`${listId}-${group.id}`} className="studio-type-control__group" data-icon-group={group.id}>
            <div id={`${listId}-${group.id}`} role="presentation" className={`studio-type-control__family ${typographyStyles["Caption/Medium"]}`}>{group.title}</div>
            {group.id === "recent" || group.id === "related"
              ? <div className="studio-icon-control__tiles">
                  {group.names.map((name) => <PopoverItem key={`${group.id}:${name}`} aria-label={name} title={name} leading={name as IconName} onSelect={() => pick(name)} />)}
                </div>
              : group.names.map((name) => <PopoverItem key={`${group.id}:${name}`} label={name} leading={name as IconName} selected={name === value} onSelect={() => pick(name)} />)}
          </div>
        ))}
      </Popover>
    </div>
  );
}

/**
 * An icon that can be switched off (`boolean | IconName`: Dialog's icon, AlertBanner's leading; `IconName | false`:
 * Metric's dock icon), Figma's boolean and its instance swap in one row: off writes `false`; on goes back to the
 * default (the theme's icon, or the component's own), and the picker sets another icon.
 */
export function IconToggleControl({ label, value, fallback, disabled, onSet, onReset, takesTrue, defaultIcon }: ControlProps<string | boolean> & { onReset?: () => void; takesTrue: boolean; defaultIcon?: string }) {
  const on = value === undefined ? fallback !== false : value !== false;
  // The icon it shows: the one written, else the component's default icon; `true` (the theme's icon) reads "Default".
  const icon = typeof value === "string" ? value : value === undefined && typeof fallback === "string" ? fallback : undefined;
  const switchOn = () => {
    if (onReset) onReset();
    else if (takesTrue) onSet(true);
    else if (typeof fallback === "string") onSet(fallback);
  };
  return (
    <div className="studio-icon-toggle">
      <ToggleButton aria-label={`Show ${inSentence(label)}`} size="sm" checked={on} disabled={disabled} onCheckedChange={(next) => { if (!next) onSet(false); else switchOn(); }} />
      {on ? <NoInlineLabel><IconControl label={label} value={typeof value === "string" ? value : undefined} fallback={icon} emptyLabel="Default" defaultIcon={defaultIcon} disabled={disabled} onSet={onSet} /></NoInlineLabel> : null}
    </div>
  );
}

/**
 * A value the inspector shows in a field's frame but does not edit (Design panel UI3, 2026-10-06): the field keeps its
 * place in the column, so a read-only row reads like the editable rows around it. `code`: the text is an expression.
 */
function StaticField({ text, code = false, placeholder = false, title }: { text: string; code?: boolean; placeholder?: boolean; title?: string }) {
  // In a label-left row it reads as an Inline-Field: the label left, the value at the end.
  const inlineLabel = useInlineLabel();
  return (
    <span className={`studio-inspector__static ${typographyStyles["Body/Small/Medium"]}`} data-code={code || undefined} data-placeholder={placeholder || undefined} data-inline={inlineLabel ? "true" : undefined} title={title ?? text}>
      {inlineLabel ? <span className={`studio-inline-label ${typographyStyles["Body/Small/Medium"]}`}>{inlineLabel}</span> : null}
      <span className="studio-inspector__static-text">{text}</span>
    </span>
  );
}

/** A bound expression shown read-only ("{level}"): in a field's frame, the expression in the code font. */
export function BoundValue({ expression, hint }: { expression: string; hint?: string }) {
  // Design words: "data: person › theme" (or "a value set in code"), not the expression.
  const say = useWords();
  const said = say(`{${expression}}`);
  if (said !== `{${expression}}`) return <StaticField text={said} title={hint ? `${said} — ${say(hint)}` : said} />;
  return <StaticField text={`{${expression}}`} code title={hint ? `${expression} — ${hint}` : expression} />;
}

/** ValueChip's kinds on a page made in the Studio. */
const DESIGN_KINDS: Readonly<Record<string, string>> = { null: "None", "ƒ()": "Action", "[…]": "List", "{…}": "Group of values" };

/** A value the inspector shows but does not edit (an object, an element, a function): its kind in a field's frame. */
function ValueChip({ value }: { value: unknown }) {
  const text = value === undefined ? "Not set" : value === null ? "null" : typeof value === "function" ? "ƒ()" : Array.isArray(value) ? "[…]" : typeof value === "object" ? "{…}" : String(value);
  // The kind in design words (an action, a list, a group of values).
  const said = DESIGN_KINDS[text];
  if (said) return <StaticField text={said} />;
  return <StaticField text={text} code={text !== "Not set"} placeholder={text === "Not set"} />;
}

const isLiteral = (value: unknown): value is Literal => typeof value === "string" || typeof value === "number" || typeof value === "boolean";

/** A literal the inspector shows but has no editor for (Grid columns={2}): the value itself, not "Bound to {2}". */
function LiteralValue({ value }: { value: Literal }) {
  return <StaticField text={String(value)} />;
}

/** A select's options in Figma's order with Figma's names when the row has them (generated groups, propGroups.ts). */
const namedOptions = (options: string[], names: Readonly<Record<string, string>> | undefined, current?: string) => (names ? figmaOptions(options, names, matchOption, current) : { options, labels: undefined });

/** The editor for a value edited at its data (text, number, a choice), showing what it renders now; null: no editor. */
function dataControl(spec: PropSpec, live: unknown, label: string, disabled: boolean, onSet: (value: Literal) => void, optionLabels?: Readonly<Record<string, string>>, component?: string): ReactNode {
  const editor = spec.editor;
  const common = { label, disabled, fallback: undefined };
  switch (editor.kind) {
    case "photo":
      // A picture from data (a row's photo): Figma's image picker; the pick is written in that row's data.
      return <PhotoControl label={label} disabled={disabled} value={typeof live === "string" ? live : undefined} onSet={(next) => onSet(next)} people={component !== "Image"} />;
    case "enum":
      return <EnumControl {...common} {...namedOptions(editor.options, optionLabels, typeof live === "string" ? live : undefined)} value={typeof live === "string" ? live : undefined} onSet={onSet} />;
    case "number-enum":
      return <NumberEnumControl {...common} options={editor.options} value={typeof live === "number" ? live : undefined} onSet={onSet} />;
    case "number": {
      const shown = typeof live === "number" ? live : undefined;
      const range = numberRange(component, spec.name, shown);
      if (optionLabels) return <NumberStepsControl {...common} steps={optionLabels} range={range} value={shown} onSet={onSet} />;
      return range ? <NumberSliderControl {...common} range={range} value={shown} onSet={onSet} /> : <NumberControl {...common} value={shown} onSet={onSet} />;
    }
    case "string":
    case "node":
      return typeof live === "string" || typeof live === "number" || live === undefined
        ? <TextControl {...common} numeric={editor.kind === "string" && editor.numeric} value={live} onSet={onSet} multiline={typeof live === "string" && (live.length > 48 || live.includes("\n"))} />
        : null;
    default:
      return null;
  }
}

/** The row's restore action: the saved binding (or value) instead of the default, after a fixed value replaced it. */
export type PropRestore = { expression: string; onRestore: () => void };

/**
 * The control for a value of the prop's type (enum, number, text, icon…), or null for a kind without an editor. Shared by
 * a written or unset value and a binding a fixed value may replace (its live value shown in the same control).
 */
function editorFor(spec: PropSpec, literal: Literal | undefined, fallback: Literal | null | undefined, common: { label: string; disabled: boolean }, onSet: (value: Literal) => void, extra: { autoFocusToken?: number; onReset?: () => void; optionLabels?: Readonly<Record<string, string>>; defaultIcon?: string; component?: string } = {}): ReactNode {
  const editor = spec.editor;
  switch (editor.kind) {
    case "enum": {
      // Spacing and radius tokens read with their px ("md · 16") and step with ↑/↓ (ScaleField, WP-D).
      const scale = scaleOfType(spec.type);
      const enumValue = typeof literal === "string" ? literal : literal === undefined ? undefined : String(literal);
      const enumFallback = typeof fallback === "string" ? fallback : undefined;
      const palette = paletteFor(spec.name, editor.options);
      return palette
        ? <SwatchControl {...common} options={editor.options} value={enumValue} fallback={enumFallback} onSet={onSet} component={extra.component} palette={palette} />
        : scale
          ? <ScaleField {...common} prop={spec.name} scale={scale} options={editor.options} value={enumValue} fallback={enumFallback} onSet={onSet} onReset={extra.onReset} />
          : <EnumControl {...common} {...namedOptions(editor.options, extra.optionLabels, enumValue)} value={enumValue} fallback={enumFallback} onSet={onSet} onReset={extra.onReset} />;
    }
    case "number-enum":
      return <NumberEnumControl {...common} options={editor.options} value={typeof literal === "number" ? literal : undefined} fallback={typeof fallback === "number" ? fallback : undefined} onSet={onSet} />;
    case "boolean": {
      const checked = typeof literal === "boolean" ? literal : fallback === true;
      return <ToggleButton aria-label={common.label} size="sm" checked={checked} disabled={common.disabled || (literal !== undefined && typeof literal !== "boolean")} onCheckedChange={(next) => onSet(next)} />;
    }
    case "number": {
      const shown = typeof literal === "number" ? literal : undefined;
      const range = numberRange(extra.component, spec.name, shown ?? (typeof fallback === "number" ? fallback : undefined));
      if (extra.optionLabels) return <NumberStepsControl {...common} steps={extra.optionLabels} range={range} value={shown} fallback={typeof fallback === "number" ? fallback : undefined} onSet={onSet} />;
      return range
        ? <NumberSliderControl {...common} range={range} value={shown} fallback={typeof fallback === "number" ? fallback : undefined} onSet={onSet} />
        : <NumberControl {...common} value={shown} fallback={typeof fallback === "number" ? fallback : undefined} onSet={onSet} />;
    }
    case "string":
    case "node":
      if (literal !== undefined && typeof literal !== "string" && !(editor.kind === "string" && editor.numeric)) return null;
      // An unset slot (node) reads "None" in the placeholder tone, like Figma's empty instance swap.
      return <TextControl {...common} numeric={editor.kind === "string" && editor.numeric} value={literal as string | number | undefined} fallback={fallback === undefined || fallback === null ? (editor.kind === "node" ? "None" : undefined) : String(fallback)} onSet={onSet} autoFocusToken={extra.autoFocusToken} multiline={typeof literal === "string" && (literal.length > 48 || literal.includes("\n"))} />;
    case "photo": {
      const text = typeof literal === "string" ? literal : undefined;
      return <PhotoControl {...common} value={text} onSet={onSet} onClear={extra.onReset} people={extra.component !== "Image"} />;
    }
    case "typography":
      return <TypographyControl {...common} value={typeof literal === "string" ? literal : undefined} fallback={typeof fallback === "string" ? fallback : undefined} onSet={onSet} />;
    case "icon":
      return <IconControl {...common} value={typeof literal === "string" ? literal : undefined} fallback={typeof fallback === "string" ? fallback : undefined} defaultIcon={extra.defaultIcon} onSet={onSet} />;
    case "icon-toggle":
      return (
        <IconToggleControl
          {...common}
          value={typeof literal === "string" || typeof literal === "boolean" ? literal : undefined}
          fallback={typeof fallback === "string" || typeof fallback === "boolean" ? fallback : undefined}
          takesTrue={/(^|\|)\s*(boolean|true)\s*(\||$)/.test(spec.type)}
          onSet={onSet}
          onReset={extra.onReset}
          defaultIcon={extra.defaultIcon}
        />
      );
    case "text-align":
      return <TextAlignControl {...common} options={editor.options} value={typeof literal === "string" ? literal : undefined} fallback={typeof fallback === "string" ? fallback : undefined} onSet={onSet} />;
    default:
      return null;
  }
}

/**
 * The editor for one prop, inside an inspector row. Every control shows at once (Design panel UI3, user 2026-10-06): a
 * value bound to code shows what it renders in the same control, with a ƒ after the label; an edit writes it where its
 * data lives, or a fixed value that ↺ (Restore) turns back into the binding. A value that reads state stays read-only
 * (the keep-behaviour rule), in a field's frame so the column reads the same.
 */
export function PropField({ spec, value, disabled, onSet, onReset, onAddObject, boundHint, label = propLabel(spec.name), autoFocusToken, resettable = true, restore, repeats, hint, optionLabels, defaultIcon, component, action: extraAction }: {
  spec: PropSpec;
  value: PropValue;
  disabled: boolean;
  onSet: (value: Literal) => void;
  onReset: () => void;
  /** An unset object prop whose type starts from values (objectStarter.ts): "+" writes that object as code. */
  onAddObject?: (code: string) => void;
  /** Code value → Figma option name (generated groups): a select lists Figma's options first, by their Figma names. */
  optionLabels?: Readonly<Record<string, string>>;
  /** An icon swap's default in Figma (generated groups): its icon picker lists it first. */
  defaultIcon?: string;
  /** The selected element's component (the tone picker warns about picks its rules flag on Text and Heading). */
  component?: string;
  /** A button in the row's icon column (Corner radius' Independent corners), when the field has no action of its own. */
  action?: ReactNode;
  /** Why a bound value is read-only here ("Use Playground properties"): in the ƒ tooltip. */
  boundHint?: string;
  label?: string;
  autoFocusToken?: number;
  /** false: no reset action (a required field of an object prop, which removing would break). */
  resettable?: boolean;
  /** The saved file binds this prop and the draft replaced it: the row's action puts it back. */
  restore?: PropRestore | null;
  /** How many elements this source line renders (a .map row): a fixed value applies to all of them. */
  repeats?: number;
  /** A note under an editable row (why a value shows no effect yet); never hides or locks the control. */
  hint?: string;
}) {
  const say = useWords();
  // The label's tooltip: the whole label (it may truncate) and the prop's own name.
  // Only when it adds something: "Theme" for theme needs no "Theme · theme".
  const labelTitle = label.toLowerCase() === spec.name.toLowerCase() ? undefined : `${label} · ${spec.name}`;
  const starter = useObjectStarter(spec.name, spec.type, Boolean(onAddObject) && !disabled && value.state === "unset" && spec.editor.kind === "readonly");
  const restoreAction = restore && !disabled
    ? <IconButton icon="icon-reverse-left-line" aria-label={say(`Restore ${inSentence(label)} to {${restore.expression}}`)} appearance="flat" level="primary" size="xs" onClick={restore.onRestore} />
    : null;
  const row = { name: spec.name, label, labelTitle, hint };
  if (value.state === "bound") {
    const live = isLiteral(value.live) ? value.live : undefined;
    if (dataEditable(value, boundHint) && spec.editor.kind !== "boolean") {
      // A value the code reads from data (a .map row's item, a data const, examples/data.ts): edited where that data is
      // written (op setDataField, FieldApi.setProp), so the binding stays and every place that shows the data changes.
      const control = dataControl(spec, value.live, label, disabled, onSet, optionLabels, component);
      const note = `From ${dataSourceLabel(value.dataSource, value.dataSource.row)}: an edit changes it everywhere it shows.`;
      if (control) return <InspectorRow {...row} bound={{ expression: value.expression, note }}>{control}</InspectorRow>;
    }
    if (fixableBinding(value, boundHint)) {
      // A binding that reads no state (data, a condition on a const, a helper's parameter): the control shows what this
      // instance renders and an edit writes a fixed value; one source line renders every row of a .map.
      // Rows are a .map's; an element rendered in several places shows its count in the panel header instead.
      const rows = value.origin?.kind === "loop-bound" ? value.origin.rows ?? repeats : undefined;
      const note = rows && rows > 1 ? `An edit sets a fixed value for all ${rows} rows; Restore brings the binding back.` : "An edit sets a fixed value; Restore brings the binding back.";
      // A switch shows what renders once the live props arrived; before that (one render) the read-only binding, not a
      // false it may not be.
      const shown = spec.editor.kind === "boolean" ? (value.live === undefined ? undefined : Boolean(value.live)) : live;
      const control = shown === undefined ? null : editorFor(spec, shown, undefined, { label, disabled }, onSet, { autoFocusToken, optionLabels, defaultIcon, component });
      if (control) return <InspectorRow {...row} bound={{ expression: value.expression, note }}>{control}</InspectorRow>;
    }
    // An element written in the prop (Menu `trigger={<IconButton … />}`, ActionBar `summary={<Text …/>}`): a layer of its
    // own, edited where it is selected, not code to change (2026-10-10 palette sweep: "bound in code").
    const element = /^\s*<([A-Z][\w.]*)/.exec(value.expression)?.[1];
    if (element) return <InspectorRow {...row} hint={hint ?? `Select the ${element} on the canvas or in Layers to edit it`}><StaticField text={element} title={say(`{${value.expression}}`)} /></InspectorRow>;
    // State-bound (the keep-behaviour rule), or a playground's: read-only, what it renders now in a field's frame.
    const note = boundHint ?? (value.origin?.kind === "bound-state" ? "Set in code: change it there." : "Change it in the code.");
    return (
      <InspectorRow {...row} bound={{ expression: value.expression, note }}>
        {live !== undefined && typeof live !== "boolean" ? <StaticField text={String(live)} title={say(`{${value.expression}}`)} /> : <BoundValue expression={value.expression} hint={boundHint} />}
      </InspectorRow>
    );
  }
  const viaSpread = value.state === "spread";
  // A prop a spread feeds in shows what the element renders with, read-only.
  const literal = value.state === "literal" ? value.value : viaSpread && isLiteral(value.live) ? value.live : undefined;
  const locked = disabled || viaSpread;
  const fallback = spec.defaultValue ?? undefined;
  const editor = spec.editor;
  // A literal shown without an editor (readonly kinds, a number in a text prop) has no reset: it can't be set back.
  const shownOnly = editor.kind === "readonly" || ((editor.kind === "string" || editor.kind === "node") && literal !== undefined && typeof literal !== "string" && !(editor.kind === "string" && editor.numeric));
  // Unset: the control shows the effective default in the lighter tone. No per-field reset (user, 2026-10-09): a control
  // goes back to its default from inside it ("Default" / "None", Backspace) or with Reset all overrides. A fixed value
  // that replaced a saved binding keeps its Restore; an object prop with a starter keeps its Add (real actions).
  const action = restoreAction ?? (starter && onAddObject
    ? <IconButton icon="icon-plus-line" aria-label={`Add ${inSentence(label)}`} tooltip={`Add ${inSentence(label)}: ${starter}`} appearance="flat" level="primary" size="xs" onClick={() => onAddObject(starter)} />
    : extraAction ?? null);
  const common = { label, disabled: locked };
  if (editor.kind === "truncate" && !(viaSpread && value.live !== undefined && !isLiteral(value.live))) {
    // Figma's Truncate text + Max lines: true is one line, a number that many (Text keeps it ≥ 1); off shows it all.
    const lines = literal === true ? 1 : typeof literal === "number" ? Math.max(1, Math.floor(literal)) : null;
    return (
      <>
        <InspectorRow name={spec.name} label={label} labelTitle={labelTitle} action={action} isDefault={value.state === "unset"}>
          <ToggleButton aria-label={label} size="sm" checked={lines !== null} disabled={locked} onCheckedChange={(next) => onSet(next)} />
        </InspectorRow>
        {lines !== null ? (
          <InspectorRow
            label="Max lines"
            labelTitle={`Max lines · ${spec.name}={N}`}
            hint={editor.state ? `Bound to the on/off state {${editor.state}}: one line when on` : undefined}
          >
            <LinesControl label="Max lines" value={lines} disabled={locked || Boolean(editor.state)} onSet={(next) => onSet(next <= 1 ? true : next)} />
          </InspectorRow>
        ) : null}
      </>
    );
  }
  let control: ReactNode;
  if (viaSpread && value.live !== undefined && !isLiteral(value.live)) control = <ValueChip value={value.live} />;
  else {
    control = editorFor(spec, literal, fallback, common, onSet, { autoFocusToken, onReset: value.state === "literal" && resettable && !restore ? onReset : undefined, optionLabels, defaultIcon, component });
    if (control === null) {
      control = literal !== undefined && (value.state === "literal" || editor.kind === "string" || editor.kind === "node")
        ? (value.state === "literal" ? <LiteralValue value={literal} /> : <ValueChip value={literal} />)
        : viaSpread ? <ValueChip value={value.live} />
          : <StaticField text={fallback === undefined || fallback === null ? "Not set" : String(fallback)} placeholder={fallback === undefined || fallback === null} />;
    }
  }
  // A prop a spread feeds in is read-only; the section note names the spread ("Set through {...rest}").
  return <InspectorRow name={spec.name} label={label} labelTitle={labelTitle} action={action} isDefault={value.state === "unset"} hint={hint}>{control}</InspectorRow>;
}

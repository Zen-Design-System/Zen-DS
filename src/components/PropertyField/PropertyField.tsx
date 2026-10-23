import { createContext, useContext, useEffect, useId, useRef, useState, type HTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactNode, type Ref, type RefObject } from "react";
import { Badge, type BadgeTheme } from "../Badge";
import { BadgeStatus, badgeStatuses, type BadgeStatusValue } from "../BadgeStatus";
import { IconButton } from "../Button";
import { DatePicker } from "../DatePicker";
import type { IconName } from "../Icon";
import { Popover, type PopoverItemData } from "../Popover";
import { Tag } from "../Tag";
import { renderIcon } from "../_shared/icon";
import { useControllableState } from "../_shared/use-controllable-state";
import { useIsomorphicLayoutEffect } from "../_shared/use-isomorphic-layout-effect";
import { useZenLabels, useZenLocale } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./property-field.css";
import "../Icon/core";
import { dataAttributes } from "../_shared/data-attributes";

/** Figma .Primitives/Input/Property-Value State: Default (empty) · Inputted · Hover · Editing. Pass it only to draw a
 *  fixed state (docs, matrices); a live cell finds its own. */
export type PropertyValueState = "default" | "inputted" | "hover" | "editing";
/** Figma .Primitives/Input/Property-Icon Tone: the colour of an option's icon, by what it means (Content/<Tone>/Light). */
export type PropertyIconTone = "neutral" | "accent" | "info" | "positive" | "warning" | "negative";

/** One option of PropertySelect, PropertyPeople or PropertyTags. */
export type PropertyFieldOption = {
  value: string;
  /** The option's name: plain text reads best (it names the remove button of People and Tags). */
  label: ReactNode;
  /** PropertySelect: the option's icon (a priority flag, a project glyph), coloured by `tone`. */
  icon?: IconName | ReactNode;
  tone?: PropertyIconTone;
  /** PropertyPeople: the person's photo. */
  photoSrc?: string;
  /** PropertyTags: the Badge colour of the label (Subtle). */
  theme?: BadgeTheme;
  disabled?: boolean;
};

type AddRequest = { label: string; open: () => void; expanded: boolean; controls: string };
type RowContextValue = { labelId: string; labelText?: string; setAdd: (add: AddRequest | null) => void };
const PropertyFieldContext = createContext<RowContextValue | null>(null);

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root `<div role="group">`. */
export interface PropertyFieldProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  /** The root `<div role="group">`, named by the label. */
  ref?: Ref<HTMLDivElement>;
  /** The property's name (Figma Label): Body/Base/Regular in Content/Neutral/Base, one line, in a column 128 wide in Compact (it scales with Component Size, 154 in Comfortable) so every row's value lines up. */
  label: ReactNode;
  /** Figma Icon + Icon-Src: the property's line icon (Content/Neutral/Light). */
  icon?: IconName | ReactNode;
  /**
   * Figma Action: the + after the label (Button/Icon-Main XSmall Tertiary). PropertyPeople and PropertyTags show it by
   * themselves, opening their picker; pass `action` to add something else.
   */
  action?: { label: string; onClick?: () => void };
  /** The value: one cell — PropertyText, PropertySelect, PropertyStatus, PropertyDate, PropertyPeople or PropertyTags. */
  children?: ReactNode;
  className?: string;
}

/**
 * Figma Input/Property-Field (16923:6031, page ❖ Input): a property of a record (a task, ticket, deal or file) — an
 * icon and a label on the left, the value on the right, edited in place. Rows stack in one or two columns of a detail
 * view; Spacing/Gap/2XSmall apart. The label column is 128 wide (Input/Size/Medium high, Gap/XSmall inside); the value is
 * a .Primitives/Input/Property-Value cell (16921:6022).
 */
export function PropertyField({ ref, label, icon, action, children, className, ...rest }: PropertyFieldProps) {
  const labelId = useId();
  const [add, setAdd] = useState<AddRequest | null>(null);
  const plus = action ? { label: action.label, open: () => action.onClick?.(), expanded: undefined, controls: undefined } : add;
  return (
    <div {...rest} ref={ref} role="group" aria-labelledby={labelId} className={["zen-property-field", className].filter(Boolean).join(" ")}>
      <div className="zen-property-field__label">
        {icon ? <span className="zen-property-field__icon" aria-hidden="true">{renderIcon(icon)}</span> : null}
        <span id={labelId} className={`zen-property-field__name ${typographyStyles["Body/Base/Regular"]}`}>{label}</span>
        {plus ? (
          // An open list counts a press on this + as outside it and closes; the click would then open it again, so the
          // press stays here and the click closes it.
          <IconButton size="xs" level="tertiary" icon="icon-plus-line" aria-label={plus.label} onClick={plus.open}
            onPointerDown={plus.expanded ? (event) => event.stopPropagation() : undefined}
            aria-haspopup={plus.controls ? "listbox" : undefined} aria-expanded={plus.controls ? plus.expanded : undefined} aria-controls={plus.expanded ? plus.controls : undefined} />
        ) : null}
      </div>
      <PropertyFieldContext.Provider value={{ labelId, labelText: typeof label === "string" ? label : undefined, setAdd }}>
        {children}
      </PropertyFieldContext.Provider>
    </div>
  );
}

/** Shared props of every value cell. */
interface PropertyValueBaseProps {
  /** The cell. */
  ref?: Ref<HTMLElement>;
  /** Shown while there is no value (Figma State=Default). Default: the locale's "Empty" (vi "Trống"). */
  placeholder?: ReactNode;
  /** Show the value only: no hover, no picker, no remove buttons (a record people may not change). */
  readOnly?: boolean;
  /** Draw a fixed Figma state (docs, matrices); a live cell finds its own. */
  state?: PropertyValueState;
  /** Names the cell when it is not inside a PropertyField (which names it by its label). */
  "aria-label"?: string;
  className?: string;
}

const cellClass = (className?: string) => ["zen-property-value", className].filter(Boolean).join(" ");
const valueText = typographyStyles["Body/Base/Medium"];

function Placeholder({ children }: { children?: ReactNode }) {
  const t = useZenLabels();
  return <span className={`zen-property-value__placeholder ${valueText}`}>{children ?? t.propertyEmpty}</span>;
}

/** The option icon of PropertySelect (Figma .Primitives/Input/Property-Icon): 20px, its tone's Light colour. */
function ToneIcon({ icon, tone = "neutral" }: { icon: IconName | ReactNode; tone?: PropertyIconTone }) {
  return <span className="zen-property-value__icon" data-tone={tone} aria-hidden="true">{renderIcon(icon)}</span>;
}

/** Hands focus back to the cell's button after its picker closes from the keyboard. */
function useReturnFocus(open: boolean, targetRef: RefObject<HTMLElement | null>) {
  const wasOpen = useRef(open);
  useEffect(() => {
    if (wasOpen.current && !open && document.activeElement === document.body) targetRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open, targetRef]);
}

/** The single-value cell: a button that opens its picker. */
function PickerCell({ cellRef, state, type, readOnly, popup, open, onOpen, labelledBy, ariaLabel, valueId, className, data, children }: {
  /** The field's own data-* attributes (dataAttributes), on the cell. */
  data?: object;
  cellRef: Ref<HTMLButtonElement>; state: PropertyValueState; type: string; readOnly?: boolean; popup: "listbox" | "dialog"; open: boolean; onOpen: () => void;
  labelledBy?: string; ariaLabel?: string; valueId: string; className?: string; children: ReactNode;
}) {
  if (readOnly) return <span {...dataAttributes(data ?? {})} ref={cellRef as Ref<HTMLSpanElement>} id={valueId} className={cellClass(className)} data-type={type} data-state={state} data-read-only="">{children}</span>;
  return (
    <button {...dataAttributes(data ?? {})} ref={cellRef} type="button" id={valueId} className={cellClass(className)} data-type={type} data-state={state} data-interactive=""
      aria-haspopup={popup} aria-expanded={open} aria-labelledby={labelledBy ? `${labelledBy} ${valueId}` : undefined} aria-label={labelledBy ? undefined : ariaLabel}
      onClick={onOpen}>
      {children}
    </button>
  );
}

// ——— PropertyText ————————————————————————————————————————————————————————————————————————————————————————

export interface PropertyTextProps extends PropertyValueBaseProps {
  /** The text. Controlled with onValueChange. */
  value?: string;
  defaultValue?: string;
  /** Called with the new text when an edit is committed (Enter or leaving the field); Escape keeps the old one. */
  onValueChange?: (value: string) => void;
}

/** Figma Property-Value Type=Text: free text that turns into an input in place (the Input focus look while editing). */
export function PropertyText({ ref, value, defaultValue = "", onValueChange, placeholder, readOnly, state: stateProp, "aria-label": ariaLabel, className, ...rest }: PropertyTextProps) {
  const row = useContext(PropertyFieldContext);
  const valueId = useId();
  const [current, setCurrent] = useControllableState({ value, defaultValue, onChange: onValueChange, name: "PropertyText value" });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(current);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);
  const start = () => { if (readOnly) return; setDraft(current); setEditing(true); };
  const finish = (save: boolean, refocus: boolean) => {
    if (save && draft !== current) setCurrent(draft);
    setEditing(false);
    if (refocus) requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") { event.preventDefault(); finish(true, true); }
    else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(false, true); }
  };
  const shownEditing = editing || stateProp === "editing";
  const state = stateProp ?? (editing ? "editing" : current ? "inputted" : "default");
  if (shownEditing) {
    return (
      <span {...dataAttributes(rest)} ref={ref as Ref<HTMLSpanElement>} className={cellClass(className)} data-type="text" data-state="editing">
        <input ref={inputRef} className={`zen-property-value__input ${valueText}`} value={editing ? draft : current} readOnly={!editing}
          aria-labelledby={row?.labelId} aria-label={row ? undefined : ariaLabel}
          onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} onBlur={() => { if (editing) finish(true, false); }} />
      </span>
    );
  }
  const content = current ? <span className={`zen-property-value__text ${valueText}`}>{current}</span> : <Placeholder>{placeholder}</Placeholder>;
  if (readOnly) return <span {...dataAttributes(rest)} ref={ref as Ref<HTMLSpanElement>} id={valueId} className={cellClass(className)} data-type="text" data-state={state} data-read-only="">{content}</span>;
  return (
    <button {...dataAttributes(rest)} ref={(node) => { triggerRef.current = node; if (typeof ref === "function") ref(node); else if (ref) (ref as { current: HTMLElement | null }).current = node; }}
      type="button" id={valueId} className={cellClass(className)} data-type="text" data-state={state} data-interactive=""
      aria-labelledby={row ? `${row.labelId} ${valueId}` : undefined} aria-label={row ? undefined : ariaLabel} onClick={start}>
      {content}
    </button>
  );
}

// ——— PropertySelect ——————————————————————————————————————————————————————————————————————————————————————

export interface PropertySelectProps extends PropertyValueBaseProps {
  /** The options of the Popover; each may carry an icon and its tone (a priority's flag). */
  options: PropertyFieldOption[];
  /** The chosen option's value. Controlled with onValueChange; null = nothing chosen. */
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
  /** Names the option list (Popover label). Default: the row's label. */
  popoverLabel?: ReactNode;
}

/** Figma Property-Value Type=Select: one option (its icon and name); opens Popover/Default under the cell. */
export function PropertySelect({ ref, options, value, defaultValue = null, onValueChange, popoverLabel, placeholder, readOnly, state: stateProp, "aria-label": ariaLabel, className, ...rest }: PropertySelectProps) {
  const row = useContext(PropertyFieldContext);
  const valueId = useId();
  const popoverId = useId();
  const [current, setCurrent] = useControllableState<string | null>({ value, defaultValue, onChange: (next) => { if (next !== null) onValueChange?.(next); }, name: "PropertySelect value" });
  const [open, setOpen] = useState(false);
  const cellRef = useRef<HTMLButtonElement>(null);
  useReturnFocus(open, cellRef);
  const chosen = options.find((option) => option.value === current);
  const state = stateProp ?? (open ? "editing" : chosen ? "inputted" : "default");
  const items: PopoverItemData[] = options.map((option) => ({ id: option.value, value: option.value, label: option.label, disabled: option.disabled, selected: option.value === current, theme: option.icon ? "icon" : "text-only", leading: option.icon ? <ToneIcon icon={option.icon} tone={option.tone} /> : undefined }));
  return (
    <>
      <PickerCell data={rest} cellRef={(node) => { cellRef.current = node; if (typeof ref === "function") ref(node); else if (ref) (ref as { current: HTMLElement | null }).current = node; }}
        state={state} type="select" readOnly={readOnly} popup="listbox" open={open} onOpen={() => setOpen((was) => !was)} labelledBy={row?.labelId} ariaLabel={ariaLabel} valueId={valueId} className={className}>
        {chosen ? <>{chosen.icon ? <ToneIcon icon={chosen.icon} tone={chosen.tone} /> : null}<span className={`zen-property-value__text ${valueText}`}>{chosen.label}</span></> : <Placeholder>{placeholder}</Placeholder>}
      </PickerCell>
      {readOnly ? null : (
        <Popover id={popoverId} open={open} onOpenChange={setOpen} anchorRef={cellRef} autoFocus label={popoverLabel}
          aria-labelledby={popoverLabel ? undefined : row?.labelId} aria-label={popoverLabel || row ? undefined : ariaLabel}
          items={items} onSelect={(item) => { if (item.value) setCurrent(item.value); setOpen(false); cellRef.current?.focus({ preventScroll: true }); }} />
      )}
    </>
  );
}

// ——— PropertyStatus ——————————————————————————————————————————————————————————————————————————————————————

export interface PropertyStatusProps extends PropertyValueBaseProps {
  /** The workflow step (a BadgeStatus). Controlled with onValueChange; null = no status yet. */
  value?: BadgeStatusValue | null;
  defaultValue?: BadgeStatusValue | null;
  onValueChange?: (value: BadgeStatusValue) => void;
  /** The steps the picker offers, in order. Default: all six. */
  statuses?: readonly BadgeStatusValue[];
  /** A product's own words for the steps (`{ "in-review": "QA" }`); the step keeps its colour and ring. */
  labels?: Partial<Record<BadgeStatusValue, ReactNode>>;
  /** The ring's exact value for the current step (0–100), as BadgeStatus `progress`. */
  progress?: number;
  /** Names the list of steps (Popover label). Default: the row's label. */
  popoverLabel?: ReactNode;
}

/** Figma Property-Value Type=Status: a BadgeStatus Medium; opens Popover/Default of BadgeStatus items. */
export function PropertyStatus({ ref, value, defaultValue = null, onValueChange, statuses = badgeStatuses, labels, progress, popoverLabel, placeholder, readOnly, state: stateProp, "aria-label": ariaLabel, className, ...rest }: PropertyStatusProps) {
  const row = useContext(PropertyFieldContext);
  const valueId = useId();
  const popoverId = useId();
  const [current, setCurrent] = useControllableState<BadgeStatusValue | null>({ value, defaultValue, onChange: (next) => { if (next) onValueChange?.(next); }, name: "PropertyStatus value" });
  const [open, setOpen] = useState(false);
  const cellRef = useRef<HTMLButtonElement>(null);
  useReturnFocus(open, cellRef);
  const state = stateProp ?? (open ? "editing" : current ? "inputted" : "default");
  const items: PopoverItemData[] = statuses.map((status) => ({ id: status, value: status, theme: "text-only", selected: status === current, label: <BadgeStatus status={status}>{labels?.[status]}</BadgeStatus> }));
  return (
    <>
      <PickerCell data={rest} cellRef={(node) => { cellRef.current = node; if (typeof ref === "function") ref(node); else if (ref) (ref as { current: HTMLElement | null }).current = node; }}
        state={state} type="status" readOnly={readOnly} popup="listbox" open={open} onOpen={() => setOpen((was) => !was)} labelledBy={row?.labelId} ariaLabel={ariaLabel} valueId={valueId} className={className}>
        {current ? <BadgeStatus status={current} progress={progress}>{labels?.[current]}</BadgeStatus> : <Placeholder>{placeholder}</Placeholder>}
      </PickerCell>
      {readOnly ? null : (
        <Popover id={popoverId} open={open} onOpenChange={setOpen} anchorRef={cellRef} autoFocus label={popoverLabel}
          aria-labelledby={popoverLabel ? undefined : row?.labelId} aria-label={popoverLabel || row ? undefined : ariaLabel}
          items={items} onSelect={(item) => { if (item.value) setCurrent(item.value as BadgeStatusValue); setOpen(false); cellRef.current?.focus({ preventScroll: true }); }} />
      )}
    </>
  );
}

// ——— PropertyDate ————————————————————————————————————————————————————————————————————————————————————————

/** A day as a Date or an ISO string ("2026-06-07", "2026-06-07T09:00"), read in local time (never UTC). */
export type PropertyDateValue = Date | string;
const toDate = (value: PropertyDateValue | null | undefined): Date | null | undefined => {
  if (value === undefined || value === null || value instanceof Date) return value;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0)) : null;
};

export interface PropertyDateProps extends PropertyValueBaseProps {
  /** The day: a Date or an ISO string ("2026-06-07", local time). Controlled with onValueChange; null = no date. */
  value?: PropertyDateValue | null;
  defaultValue?: PropertyDateValue | null;
  onValueChange?: (value: Date | null) => void;
  /** How the day reads, for the locale (Intl.DateTimeFormat). Default `{ dateStyle: "long" }`: "June 7, 2026". */
  format?: Intl.DateTimeFormatOptions;
  minDate?: Date;
  maxDate?: Date;
}

/** Figma Property-Value Type=Date: the day as text; opens the Date-Picker under the cell. */
export function PropertyDate({ ref, value, defaultValue = null, onValueChange, format = { dateStyle: "long" }, minDate, maxDate, placeholder, readOnly, state: stateProp, "aria-label": ariaLabel, className, ...rest }: PropertyDateProps) {
  const row = useContext(PropertyFieldContext);
  const locale = useZenLocale();
  const valueId = useId();
  const [current, setCurrent] = useControllableState<Date | null>({ value: toDate(value), defaultValue: toDate(defaultValue) ?? null, onChange: onValueChange, name: "PropertyDate value" });
  const [open, setOpen] = useState(false);
  const cellRef = useRef<HTMLButtonElement>(null);
  useReturnFocus(open, cellRef);
  const state = stateProp ?? (open ? "editing" : current ? "inputted" : "default");
  return (
    <>
      <PickerCell data={rest} cellRef={(node) => { cellRef.current = node; if (typeof ref === "function") ref(node); else if (ref) (ref as { current: HTMLElement | null }).current = node; }}
        state={state} type="date" readOnly={readOnly} popup="dialog" open={open} onOpen={() => setOpen((was) => !was)} labelledBy={row?.labelId} ariaLabel={ariaLabel} valueId={valueId} className={className}>
        {current ? <span className={`zen-property-value__text ${valueText}`}>{new Intl.DateTimeFormat(locale, format).format(current)}</span> : <Placeholder>{placeholder}</Placeholder>}
      </PickerCell>
      {readOnly || !open ? null : (
        <DatePicker open={open} anchorRef={cellRef} value={current} minDate={minDate} maxDate={maxDate}
          aria-labelledby={row?.labelId} aria-label={row ? undefined : ariaLabel}
          onValueChange={(date) => { setCurrent(date); setOpen(false); cellRef.current?.focus({ preventScroll: true }); }}
          onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ——— PropertyPeople and PropertyTags: removable chips, the + opens the picker ——————————————————————————————

interface PropertyMultiProps extends PropertyValueBaseProps {
  /** Everyone or every label that can be added. */
  options: PropertyFieldOption[];
  /** The chosen values, in order. Controlled with onValueChange. */
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  /** Names the + (Figma Action). Default: the locale's "Add <label>". */
  addLabel?: string;
  /** Names the list (Popover label). Default: the row's label. */
  popoverLabel?: ReactNode;
}

function MultiCell({ type, options, value, defaultValue = [], onValueChange, addLabel, popoverLabel, placeholder, readOnly, state: stateProp, "aria-label": ariaLabel, className, ref, single, onCreate, renderChip, itemOf }: PropertyMultiProps & {
  type: "person" | "tags"; single?: boolean; onCreate?: (label: string) => void;
  renderChip: (option: PropertyFieldOption, remove: (() => void) | undefined) => ReactNode;
  itemOf: (option: PropertyFieldOption, selected: boolean) => PopoverItemData;
}) {
  const t = useZenLabels();
  const row = useContext(PropertyFieldContext);
  const popoverId = useId();
  const [current, setCurrent] = useControllableState<string[]>({ value, defaultValue, onChange: onValueChange, name: type === "person" ? "PropertyPeople value" : "PropertyTags value" });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const cellRef = useRef<HTMLSpanElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const name = addLabel ?? t.propertyAdd(row?.labelText ?? ariaLabel ?? "");
  // The + after the row's label opens the picker (Figma Action); outside a PropertyField it ends the cell.
  const openPicker = () => {
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    setQuery("");
    setOpen((was) => !was);
  };
  // Closing returns focus to the + that opened the list: Popover's own Escape focuses the cell's first chip instead.
  // Focus that moved elsewhere (a click on another field, Tab) stays where it went.
  const setPickerOpen = (next: boolean) => {
    setOpen(next);
    if (next) return;
    const opener = openerRef.current;
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (opener?.isConnected && (!active || active === document.body || cellRef.current?.contains(active))) opener.focus({ preventScroll: true });
    });
  };
  const setAdd = row?.setAdd;
  useIsomorphicLayoutEffect(() => {
    if (!setAdd || readOnly) return;
    setAdd({ label: name, open: openPicker, expanded: open, controls: popoverId });
    return () => setAdd(null);
  }, [setAdd, readOnly, name, open, popoverId]);
  const chosen = current.map((id) => options.find((option) => option.value === id)).filter((option): option is PropertyFieldOption => Boolean(option));
  const state = stateProp ?? (open ? "editing" : chosen.length ? "inputted" : "default");
  const toggle = (id: string) => setCurrent((list) => single ? [id] : list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  const needle = query.trim().toLowerCase();
  const textOf = (option: PropertyFieldOption) => typeof option.label === "string" ? option.label : option.value;
  const visible = options.filter((option) => !needle || textOf(option).toLowerCase().includes(needle));
  const canCreate = Boolean(onCreate && needle && !options.some((option) => textOf(option).toLowerCase() === needle));
  const items: PopoverItemData[] = [
    ...visible.map((option) => itemOf(option, current.includes(option.value))),
    ...(canCreate ? [{ id: "__create", value: "__create", label: t.createOption(query.trim()), theme: "icon" as const, leading: "icon-plus-line" as IconName }] : []),
  ];
  const onCellClick = (event: MouseEvent<HTMLSpanElement>) => {
    if (readOnly || (event.target as HTMLElement).closest("button")) return;
    openPicker();
  };
  return (
    <>
      <span ref={(node) => { cellRef.current = node; if (typeof ref === "function") ref(node); else if (ref) (ref as { current: HTMLElement | null }).current = node; }}
        className={cellClass(className)} data-type={type} data-state={state} data-interactive={readOnly ? undefined : ""} data-read-only={readOnly ? "" : undefined}
        onClick={onCellClick}>
        {chosen.length ? chosen.map((option) => <span key={option.value} className="zen-property-value__chip">{renderChip(option, readOnly ? undefined : () => setCurrent((list) => list.filter((item) => item !== option.value)))}</span>) : <Placeholder>{placeholder}</Placeholder>}
        {/* zen-allow-filter-button: the + adds a value to this cell (Figma Action); it is not a filter or sort picker. */}
        {!row && !readOnly ? <IconButton size="xs" level="tertiary" icon="icon-plus-line" aria-label={name} aria-haspopup="listbox" aria-expanded={open} onClick={openPicker} /> : null}
      </span>
      {readOnly ? null : (
        <Popover id={popoverId} open={open} onOpenChange={setPickerOpen} anchorRef={cellRef} autoFocus multiple={!single} label={popoverLabel}
          aria-labelledby={popoverLabel ? undefined : row?.labelId} aria-label={popoverLabel || row ? undefined : ariaLabel}
          search searchValue={query} onSearchChange={setQuery}
          items={items} onSelect={(item) => {
            if (item.value === "__create") { onCreate?.(query.trim()); setQuery(""); return; }
            if (item.value) toggle(item.value);
            if (single) setPickerOpen(false);
          }} />
      )}
    </>
  );
}

export interface PropertyPeopleProps extends PropertyMultiProps {
  /** One person only (a Reporter): picking replaces and closes. Default: several (Assignees). */
  single?: boolean;
}

/** Figma Property-Value Type=Person: Tag Leading-Photo chips with Remove; the + opens Popover/Default with Search and Avatar Small items. */
export function PropertyPeople({ single, ...props }: PropertyPeopleProps) {
  return <MultiCell {...props} type="person" single={single}
    renderChip={(option, remove) => <Tag photoSrc={option.photoSrc} remove={Boolean(remove)} onRemove={remove}>{option.label}</Tag>}
    itemOf={(option, selected) => ({ id: option.value, value: option.value, label: option.label, photoSrc: option.photoSrc, theme: "avatar-small", selected, disabled: option.disabled })} />;
}

export interface PropertyTagsProps extends PropertyMultiProps {
  /** Lets people create a label that is not listed: called with the typed text (Create "…" row). */
  onCreate?: (label: string) => void;
}

/** Figma Property-Value Type=Tags: Badges Medium Subtle with Remove, wrapping; the + opens Popover/Default with Search. */
export function PropertyTags({ onCreate, ...props }: PropertyTagsProps) {
  return <MultiCell {...props} type="tags" onCreate={onCreate}
    renderChip={(option, remove) => <Badge theme={option.theme ?? "neutral"} background="subtle" leadingIcon={false} remove={Boolean(remove)} onRemove={remove}>{option.label}</Badge>}
    itemOf={(option, selected) => ({ id: option.value, value: option.value, theme: "text-only", selected, disabled: option.disabled, label: <Badge theme={option.theme ?? "neutral"} background="subtle" leadingIcon={false}>{option.label}</Badge> })} />;
}

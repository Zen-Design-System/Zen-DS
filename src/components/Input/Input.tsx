import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type MouseEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Icon } from "../Icon";
import { Popover, PopoverManualAddNew } from "../Popover";
import { DatePicker } from "../DatePicker";
import { Button, IconButton } from "../Button";
import { Tag } from "../Tag";
import { typographyStyles } from "../../tokens/typography.generated";
import "./input.css";

export const inputSizes = ["small", "medium", "large", "xlarge"] as const;
export const headingInputSizes = ["h1", "h2", "h3"] as const;
/** Mirrors the State axis exposed by Figma's Input/Text-Field set. */
export const inputStates = [
  "default",
  "hover",
  "focused",
  "typing",
  "inputted",
  "read-only",
  "disabled",
  "inputted-error",
  "blank-error",
  // Kept as a compatibility alias for the first Storybook version.
  "error",
] as const;
export type InputSize = (typeof inputSizes)[number];
export type InputState = (typeof inputStates)[number];
export type TextAreaSize = Exclude<InputSize, "xlarge">;
export type HeadingInputSize = (typeof headingInputSizes)[number];

type CommonFieldProps = {
  label?: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  size?: InputSize;
  state?: InputState;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

export type InputHelpTheme = "neutral" | "negative" | "warning" | "positive";
export interface InputLabelProps {
  id?: string;
  children: ReactNode;
  optional?: boolean;
  tooltip?: boolean;
  action?: ReactNode;
  disabled?: boolean;
}

/** Public implementation of Figma's `Primitives/Input/Label` owner. */
export function InputLabel({ id, children, optional = false, tooltip = false, action, disabled = false }: InputLabelProps) {
  return (
    <span className={`zen-input-label ${typographyStyles["Body/Small/Regular"]}`} data-state={disabled ? "disabled" : "default"}>
      <label className="zen-input-label__content" htmlFor={id}>{children}{optional ? <span className="zen-input-label__optional"> (Optional)</span> : null}{tooltip ? <Icon name="icon-info-circle-line" size="2xs" decorative /> : null}</label>
      {action ? <span className={`zen-input-label__action ${typographyStyles["Body/Small/Bold"]}`}>{action}</span> : null}
    </span>
  );
}

export interface InputHelpTextProps {
  id?: string;
  children: ReactNode;
  theme?: InputHelpTheme;
  icon?: boolean;
  characterLimit?: ReactNode;
}

/** Public implementation of Figma's `.Primitives/Input/Help-Text` owner. */
export function InputHelpText({ id, children, theme = "neutral", icon = true, characterLimit }: InputHelpTextProps) {
  // Figma .Primitives/Input/Help-Text: Neutral = Caption/Regular; Negative/Warning/Positive = Caption/Medium. Icons at Element-Size/Popular/XSmall.
  const iconName = theme === "negative" ? "icon-alert-octagon-line" : theme === "positive" ? "icon-check-line" : theme === "warning" ? "icon-alert-triangle-line" : "icon-info-circle-line";
  return (
    <p id={id} className={`zen-input-help ${typographyStyles[theme === "neutral" ? "Caption/Regular" : "Caption/Medium"]}`} data-theme={theme} role={theme === "negative" ? "alert" : undefined}>
      <span className="zen-input-help__content">{icon ? <span className="zen-input-help__icon" aria-hidden="true"><Icon name={iconName} size="xs" decorative /></span> : null}<span>{children}</span></span>
      {characterLimit !== undefined ? <span className="zen-input-help__limit">{characterLimit}</span> : null}
    </p>
  );
}

export interface InputLeadingTrailingProps {
  size?: Exclude<InputSize, "xlarge">;
  active?: boolean;
  icon?: ReactNode;
  flag?: ReactNode;
  label?: ReactNode;
  /** Explicit Figma Label axis. Omit the label while keeping the slot/icon. */
  showLabel?: boolean;
  dropdown?: boolean;
  /** Explicit Figma Dropdown axis. */
  showDropdown?: boolean;
  children?: ReactNode;
  /** Makes a labelled slot a picker: clicking it opens a Popover with these options (e.g. country code, unit, currency). */
  options?: InputLeadingTrailingOption[];
  value?: string;
  onValueChange?: (value: string, option: InputLeadingTrailingOption) => void;
  /** Popover/Label heading, e.g. "Country code". Also the button's accessible name prefix. */
  popoverLabel?: string;
  /** Open the picker towards the start (leading) or end (trailing) of the field. */
  align?: "start" | "end";
  disabled?: boolean;
}

export type InputLeadingTrailingOption = { value: string; label: ReactNode; caption?: ReactNode; icon?: ReactNode; flag?: ReactNode };

/** Slot-compatible implementation of `.Primitives/Input/Leading-Trailing`. A labelled slot with `options` becomes a
 * picker button (label + chevron) that opens the shared Popover; slots without a label stay decorative, so a click
 * on them focuses the field instead. */
export function InputLeadingTrailing({ size = "medium", active = true, icon, flag, label, showLabel = true, dropdown = false, showDropdown, children, options, value, onValueChange, popoverLabel, align = "end", disabled = false }: InputLeadingTrailingProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hasLabel = showLabel && label !== undefined && label !== null && label !== "";
  const interactive = hasLabel && Boolean(options?.length);
  const resolvedDropdown = interactive || (showDropdown ?? dropdown);
  const current = options?.find((option) => option.value === value);
  const content = (
    <>
      {current?.flag ?? flag}{current?.icon ?? icon}
      <span className="zen-input-leading-trailing__elements">
        {hasLabel ? <span className={`zen-input-leading-trailing__label ${typographyStyles[size === "large" ? "Heading/4" : "Body/Base/Medium"]}`}>{current ? current.label : label}</span> : null}
        {children}
        {resolvedDropdown ? <span className="zen-input-leading-trailing__dropdown"><Icon name={open ? "icon-chevron-up-line" : "icon-chevron-down-line"} size={size === "small" ? "sm" : "base"} decorative /></span> : null}
      </span>
    </>
  );
  const common = { "data-size": size, "data-active": active ? "true" : "false", "data-label": showLabel ? "true" : "false", "data-dropdown": resolvedDropdown ? "true" : "false" };
  if (!interactive) return <span className="zen-input-leading-trailing" {...common}>{content}</span>;
  return (
    <span className="zen-input-leading-trailing__picker" data-open={open ? "true" : "false"} data-align={align}>
      <button
        ref={anchorRef}
        type="button"
        className="zen-input-leading-trailing zen-input-leading-trailing--interactive"
        {...common}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={popoverLabel ? `${popoverLabel}: ${typeof (current?.label ?? label) === "string" ? current?.label ?? label : value ?? ""}` : undefined}
        onClick={() => setOpen((next) => !next)}
        onKeyDown={(event) => { if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open) { event.preventDefault(); setOpen(true); } }}
      >
        {content}
      </button>
      <Popover
        className="zen-input-leading-trailing__popover"
        align={align === "end" ? "end" : "start"}
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        autoFocus
        label={popoverLabel}
        items={options!.map((option) => ({ id: option.value, label: option.label, caption: option.caption, leading: option.flag ?? option.icon, selected: option.value === value }))}
        onSelect={(item) => {
          const option = options!.find((entry) => entry.value === item.id)!;
          onValueChange?.(option.value, option);
          setOpen(false);
          anchorRef.current?.focus();
        }}
      />
    </span>
  );
}

export type InputContentState = "default" | "focused" | "typing" | "inputted" | "disabled";
export interface InputContentProps {
  size?: Exclude<InputSize, "xlarge">;
  state?: InputContentState;
  text?: ReactNode;
  cursor?: boolean;
}

/** Public implementation of Figma's `.Primitives/Input/Input-Content/Default`. */
export function InputContent({ size = "medium", state = "default", text = "Content", cursor = true }: InputContentProps) {
  const caret = <span className="zen-input-content__cursor" aria-hidden="true" />;
  // Figma: Focused shows the caret before the placeholder, Typing after the typed text.
  return <span className={`zen-input-content ${typographyStyles[size === "small" ? "Body/Small/Medium" : size === "large" ? "Heading/4" : "Body/Base/Medium"]}`} data-size={size} data-state={state}>{cursor && state === "focused" ? caret : null}{text}{cursor && state === "typing" ? caret : null}</span>;
}

/** Field text style: XLarge fields use Heading/4 (Figma Input-Content Large), every other size Body/Base/Medium. */
const fieldTextStyle = (size: InputSize | undefined) => typographyStyles[size === "xlarge" ? "Heading/4" : "Body/Base/Medium"];

export type InputFieldProps = CommonFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "size">;
export type TextAreaFieldProps = Omit<CommonFieldProps, "size"> & { size?: TextAreaSize } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size">;

function FieldLabel({ id, label, required }: { id: string; label?: ReactNode; required?: boolean }) {
  if (!label) return null;
  return <InputLabel id={id}>{label}{required ? <span aria-hidden="true"> *</span> : null}</InputLabel>;
}

function FieldMessage({ id, error, helpText }: { id: string; error?: ReactNode; helpText?: ReactNode }) {
  if (!error && !helpText) return null;
  return <InputHelpText id={id} theme={error ? "negative" : "neutral"}>{error ?? helpText}</InputHelpText>;
}

function normalizeInputState(state: InputState | undefined, error?: ReactNode): InputState {
  if (state === "error") return "blank-error";
  // An error message always wins over the interaction states (Figma Blank-Error / Inputted-Error);
  // only Read-only and Disabled keep their own look.
  if (error && (state === undefined || state === "default" || state === "hover" || state === "focused" || state === "typing")) return "blank-error";
  if (error && state === "inputted") return "inputted-error";
  return state ?? "default";
}

// Clicks on padding, icons or empty space inside the field act on the field itself; interactive children
// (steppers, clear buttons, Leading/Trailing pickers) keep their own behaviour.
const fieldInteractiveSelector = "button, a[href], input, textarea, select, [contenteditable='true'], [role='button'], [role='listbox'], [role='option'], .zen-popover";
const primaryFieldSelector = ".zen-input__native, .zen-select__trigger, [contenteditable='true']";
function focusFieldFromControl(event: MouseEvent<HTMLDivElement>) {
  if ((event.target as Element).closest(fieldInteractiveSelector)) return;
  const field = event.currentTarget.querySelector<HTMLElement>(primaryFieldSelector);
  if (!field || (field as HTMLInputElement).disabled) return;
  event.preventDefault(); // keep focus where it will land instead of flashing to <body>
  field.focus();
}
function openFieldFromControl(event: MouseEvent<HTMLDivElement>) {
  if ((event.target as Element).closest(fieldInteractiveSelector)) return;
  const trigger = event.currentTarget.querySelector<HTMLButtonElement>(".zen-select__trigger");
  if (trigger && !trigger.disabled) trigger.click(); // a Select opens from anywhere in its field
}

function FieldShell({ children, id, label, required, messageId, error, helpText, size, state, leading, trailing, className }: CommonFieldProps & { children: ReactNode; id: string; required?: boolean; messageId: string }) {
  const resolvedState = normalizeInputState(state, error);
  return (
    <div className={["zen-input-field", className].filter(Boolean).join(" ")} data-size={size ?? "medium"} data-state={resolvedState}>
      <FieldLabel id={id} label={label} required={required} />
      <div className="zen-input__control" onMouseDown={focusFieldFromControl} onClick={openFieldFromControl}>
        {leading ? <span className="zen-input__affordance zen-input__affordance--leading">{leading}</span> : null}
        {children}
        {trailing ? <span className="zen-input__affordance zen-input__affordance--trailing">{trailing}</span> : null}
      </div>
      <FieldMessage id={messageId} error={error} helpText={helpText} />
    </div>
  );
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { id: providedId, label, helpText, error, size = "medium", state, leading, trailing, className, required, disabled, ...inputProps },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? `zen-input-${generatedId.replace(/:/g, "")}`;
  const messageId = `${id}-message`;
  const message = error ?? helpText;
  return (
    <FieldShell id={id} label={label} required={required} messageId={messageId} error={error} helpText={helpText} size={size} state={state ?? (inputProps.readOnly ? "read-only" : undefined)} leading={leading} trailing={trailing} className={className}>
      <input
        {...inputProps}
        ref={ref}
        id={id}
        className={`zen-input__native ${fieldTextStyle(size)}`}
        required={required}
        disabled={disabled || normalizeInputState(state, error) === "disabled"}
        readOnly={inputProps.readOnly || normalizeInputState(state, error) === "read-only"}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
      />
    </FieldShell>
  );
});

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { id: providedId, label, helpText, error, size = "medium", state, leading, trailing, className, required, disabled, rows = 4, ...textareaProps },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? `zen-text-area-${generatedId.replace(/:/g, "")}`;
  const messageId = `${id}-message`;
  const message = error ?? helpText;
  return (
    <FieldShell id={id} label={label} required={required} messageId={messageId} error={error} helpText={helpText} size={size} state={state ?? (textareaProps.readOnly ? "read-only" : undefined)} leading={leading} trailing={trailing} className={className}>
      <textarea
        {...textareaProps}
        ref={ref}
        id={id}
        rows={rows}
        className={`zen-input__native zen-input__native--textarea ${typographyStyles["Body/Base/Medium"]}`}
        required={required}
        disabled={disabled || normalizeInputState(state, error) === "disabled"}
        readOnly={textareaProps.readOnly || normalizeInputState(state, error) === "read-only"}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
      />
    </FieldShell>
  );
});

export type SelectFieldOption = { label: string; value: string; disabled?: boolean };
export type SelectFieldProps = CommonFieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  options?: SelectFieldOption[];
  /** Popover/Label heading above the options (names the group, not the value). */
  popoverLabel?: ReactNode;
  /** Adds the Popover Search row; options are filtered by the query. */
  popoverSearch?: boolean;
  popoverSearchPlaceholder?: string;
  /** Figma State=Read-Only: shows the value, keeps the chevron, never opens. */
  readOnly?: boolean;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { id: providedId, label, helpText, error, size = "medium", state, leading, trailing, className, required, disabled, readOnly = false, options = [], popoverLabel, popoverSearch = false, popoverSearchPlaceholder, children, ...selectProps },
  ref,
) {
  const generatedId = useId();
  const id = providedId ?? `zen-select-${generatedId.replace(/:/g, "")}`;
  const messageId = `${id}-message`;
  const message = error ?? helpText;
  const nativeRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [openedFromKeyboard, setOpenedFromKeyboard] = useState(false);
  const closeAndRestore = () => { setOpen(false); triggerRef.current?.focus(); };
  useEffect(() => {
    if (!open) return undefined;
    // Pointer down outside the field closes the option list.
    const handlePointerDown = (event: PointerEvent) => {
      const field = triggerRef.current?.closest(".zen-input-field");
      if (field && !field.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);
  const controlledValue = selectProps.value == null ? undefined : String(selectProps.value);
  const defaultValue = selectProps.defaultValue == null ? options[0]?.value ?? "" : String(selectProps.defaultValue);
  const [selectedValue, setSelectedValue] = useState(controlledValue ?? defaultValue);
  useEffect(() => {
    if (controlledValue !== undefined) setSelectedValue(controlledValue);
  }, [controlledValue]);
  const selectedOption = options.find((option) => option.value === (controlledValue ?? selectedValue));
  const resolvedState = normalizeInputState(state, error);
  const isDisabled = disabled || resolvedState === "disabled";
  const isReadOnly = readOnly || resolvedState === "read-only";
  useImperativeHandle(ref, () => nativeRef.current as HTMLSelectElement);
  return (
    <FieldShell id={id} label={label} required={required} messageId={messageId} error={error} helpText={helpText} size={size} state={isReadOnly ? "read-only" : state} leading={leading} trailing={trailing ?? <Icon name="icon-chevron-down-line" size="2xs" />} className={[className, open ? "zen-input-field--popover-open" : ""].filter(Boolean).join(" ")}>
      <button
        id={`${id}-trigger`}
        className={`zen-input__native zen-select__trigger ${fieldTextStyle(size)}`}
        type="button"
        disabled={isDisabled}
        aria-haspopup="listbox"
        aria-readonly={isReadOnly || undefined}
        aria-expanded={open}
        aria-controls={`${id}-popover`}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        ref={triggerRef}
        onClick={(event) => { if (isReadOnly) return; setOpenedFromKeyboard(event.detail === 0); setOpen((current) => !current); }}
        onBlur={(event) => {
          // Close when focus leaves both the trigger and its popover.
          const next = event.relatedTarget as Node | null;
          if (next && event.currentTarget.parentElement?.closest(".zen-input-field")?.contains(next)) return;
          if (next) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (!isReadOnly && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setOpenedFromKeyboard(true);
            setOpen(true);
          }
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {selectedOption?.label ?? selectedValue}
      </button>
      <select
        {...selectProps}
        ref={nativeRef}
        id={id}
        className="zen-select__native"
        required={required}
        disabled={isDisabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        aria-hidden="true"
        tabIndex={-1}
      >
        {children ?? options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
      <Popover
        id={`${id}-popover`}
        open={open && !isDisabled}
        label={popoverLabel}
        search={popoverSearch}
        searchPlaceholder={popoverSearchPlaceholder}
        // The search field takes focus on open, so a mouse-opened list is still typeable.
        autoFocus={openedFromKeyboard || popoverSearch}
        onKeyDown={(event) => {
          if (event.key === "Escape") { event.preventDefault(); closeAndRestore(); }
          if (event.key === "Tab") setOpen(false);
        }}
        items={options.map((option) => ({ id: option.value, label: option.label, value: option.value, disabled: option.disabled, selected: option.value === (controlledValue ?? selectedValue) }))}
        onSelect={(option) => {
          const nextValue = option.value ?? "";
          if (controlledValue == null) setSelectedValue(nextValue);
          if (nativeRef.current) nativeRef.current.value = nextValue;
          selectProps.onChange?.({ target: nativeRef.current, currentTarget: nativeRef.current } as ChangeEvent<HTMLSelectElement>);
          closeAndRestore();
        }}
      />
    </FieldShell>
  );
});

/** Figma Input page compositions that reuse the Text Field primitive. */
export type DateFieldProps = InputFieldProps & { datePicker?: boolean; datePickerActions?: boolean; onDateChange?: (date: Date | null) => void };
function parseDateFieldValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value !== "string" || !value) return null;
  const usDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (usDate) {
    const parsed = new Date(Number(usDate[3]), Number(usDate[1]) - 1, Number(usDate[2]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
export function DateField({ trailing, datePicker = true, datePickerActions = false, onDateChange, onFocus, onClick, onChange, value, defaultValue, ...props }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  // Closing returns focus to the input; that focus must not re-open the picker.
  const closing = useRef(false);
  const close = () => { closing.current = true; setOpen(false); requestAnimationFrame(() => { closing.current = false; }); };
  const canOpen = !props.readOnly && props.state !== "read-only" && !props.disabled && props.state !== "disabled";
  const controlledValue = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? ""));
  const currentValue = controlledValue ? value : internalValue;
  const parsedValue = parseDateFieldValue(currentValue);
  const handleDateChange = (date: Date | null) => {
    if (!controlledValue && date) setInternalValue(`${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`);
    onDateChange?.(date);
    close();
  };
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!controlledValue) setInternalValue(event.target.value);
    onChange?.(event);
  };
  return (
    <div className="zen-date-field" ref={fieldRef}>
      <InputField
        {...props}
        value={controlledValue ? value : internalValue}
        type="text"
        placeholder={props.placeholder ?? "MM/DD/YYYY"}
        trailing={trailing ?? <Icon name="icon-calendar-line" size="sm" />}
        onFocus={(event) => { if (canOpen && !closing.current) setOpen(true); onFocus?.(event); }}
        // Re-open with a click after the picker was dismissed while the input kept focus.
        onClick={(event) => { if (canOpen) setOpen(true); onClick?.(event); }}
        onChange={handleChange}
      />
      {datePicker ? <DatePicker open={open} value={parsedValue} onChange={handleDateChange} onClose={close} anchorRef={fieldRef} showActions={datePickerActions} /> : null}
    </div>
  );
}

export type AutocompleteOption = { id: string; label: string; leading?: ReactNode; photoSrc?: string };
export interface AutocompleteFieldProps {
  id?: string;
  label?: ReactNode;
  helpText?: ReactNode;
  /** Blank-Error / Inputted-Error message (Help-Text Theme=Negative). */
  error?: ReactNode;
  options: AutocompleteOption[];
  value?: string[];
  defaultValue?: string[];
  onChange?: (value: string[]) => void;
  /** Ids rendered as Tag State=Error (Inputted-Error). */
  invalidValues?: string[];
  /** Figma State=View-Only: tags without Remove and no Add button. */
  readOnly?: boolean;
  disabled?: boolean;
  addLabel?: ReactNode;
  popoverLabel?: ReactNode;
  searchPlaceholder?: string;
  /** Figma Popover/Manual-Add-New: create a value that isn't in `options`. Add the new option to `options`
   * and return its id; the field then selects it as a Tag. */
  onCreate?: (label: string) => string | void;
  createLabel?: ReactNode;
  className?: string;
}

/**
 * Figma Input/Autocomplete-Field (1241:5616): Label, a wrapping Tag list (gap 4, Tag Remove=Yes) and an
 * "Add Item" Button/Main XSmall Secondary that opens Popover/Default (Search + "Search and select" label + items)
 * over the Add slot. Selected options become tags; the popover closes on outside pointer-down or Escape.
 */
export function AutocompleteField({ id: providedId, label, helpText, error, options, value, defaultValue = [], onChange, invalidValues = [], readOnly = false, disabled = false, addLabel = "Add Item", popoverLabel = "Search and select", searchPlaceholder = "Search", onCreate, createLabel, className }: AutocompleteFieldProps) {
  const generatedId = useId();
  const id = providedId ?? `zen-autocomplete-${generatedId.replace(/:/g, "")}`;
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const addRef = useRef<HTMLDivElement>(null);
  const selected = value ?? internal;
  const commit = (next: string[]) => { if (value === undefined) setInternal(next); onChange?.(next); };
  const byId = new Map(options.map((option) => [option.id, option]));
  const available = options.filter((option) => !selected.includes(option.id) && option.label.toLowerCase().includes(query.trim().toLowerCase()));
  const messageId = `${id}-message`;
  return (
    <div className={["zen-autocomplete", className].filter(Boolean).join(" ")} data-state={disabled ? "disabled" : readOnly ? "view-only" : error ? "error" : open ? "focused" : "default"} aria-describedby={error || helpText ? messageId : undefined}>
      {label ? <InputLabel id={id} disabled={disabled}>{label}</InputLabel> : null}
      {selected.length ? (
        <div className="zen-autocomplete__tags" role="list" aria-label={typeof label === "string" ? label : undefined}>
          {selected.map((optionId) => {
            const option = byId.get(optionId);
            if (!option) return null;
            return <span key={optionId} role="listitem"><Tag leading={option.leading} photoSrc={option.photoSrc} error={invalidValues.includes(optionId)} disabled={disabled} remove={!readOnly} onRemove={() => commit(selected.filter((item) => item !== optionId))}>{option.label}</Tag></span>;
          })}
        </div>
      ) : null}
      {!readOnly ? (
        <div className="zen-autocomplete__add" ref={addRef}>
          <Button appearance="main" level="secondary" size="xs" disabled={disabled} startIcon={<Icon name="icon-plus-line" decorative />} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}>{addLabel}</Button>
          {onCreate ? (
            <PopoverManualAddNew
              open={open}
              onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}
              anchorRef={addRef}
              autoFocus
              searchPlaceholder={searchPlaceholder}
              searchValue={query}
              onSearchChange={setQuery}
              label={popoverLabel}
              createLabel={createLabel}
              // Existing options (even already-selected ones) count as "exists", so Create only offers genuinely new values.
              items={available.map((option) => ({ id: option.id, label: option.label, leading: option.leading }))}
              onSelect={(item) => { commit([...selected, item.id]); setQuery(""); }}
              onCreate={(label) => {
                if (options.some((option) => typeof option.label === "string" && option.label.trim().toLowerCase() === label.toLowerCase())) return;
                const createdId = onCreate(label);
                if (createdId) commit([...selected, createdId]);
                setQuery("");
              }}
            />
          ) : (
            <Popover
              open={open}
              onOpenChange={(next) => { setOpen(next); if (!next) setQuery(""); }}
              anchorRef={addRef}
              autoFocus
              search
              searchPlaceholder={searchPlaceholder}
              searchValue={query}
              onSearchChange={setQuery}
              label={popoverLabel}
              items={available.map((option) => ({ id: option.id, label: option.label, leading: option.leading }))}
              onSelect={(item) => { commit([...selected, item.id]); setQuery(""); }}
            />
          )}
        </div>
      ) : null}
      {error || helpText ? <InputHelpText id={messageId} theme={error ? "negative" : "neutral"}>{error ?? helpText}</InputHelpText> : null}
    </div>
  );
}

export type NumberFieldProps = Omit<InputFieldProps, "value" | "defaultValue" | "type" | "min" | "max" | "step"> & {
  /** Figma Input/Number-Align-Left (steppers trailing) or Number-Align-Center (− value +). */
  align?: "left" | "center";
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  decrementLabel?: string;
  incrementLabel?: string;
};

const decimalPlaces = (n: number) => (String(n).split(".")[1] ?? "").length;

/** Figma Input/Number-Align-Left (421:10057) and Number-Align-Center (450:7900): Button/Icon-Main 2XSmall Tertiary
 * steppers (24px) after or around the value. Read-Only hides the steppers. Keyboard: ↑/↓ step; Enter/blur clamps. */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { align = "left", value, defaultValue = null, onValueChange, onChange, onKeyDown, onBlur, min, max, step = 1, readOnly, state, disabled, className, decrementLabel = "Decrease", incrementLabel = "Increase", leading, trailing, ...props },
  ref,
) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState<number | null>(defaultValue);
  const [draft, setDraft] = useState<string | null>(null);
  const current = controlled ? value : internal;
  const isReadOnly = Boolean(readOnly) || state === "read-only";
  const isDisabled = Boolean(disabled) || state === "disabled";
  const precision = Math.max(decimalPlaces(step), decimalPlaces(min ?? 0));
  const clamp = (n: number) => Number(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n)).toFixed(precision));
  const parse = (text: string) => (text.trim() === "" || text.trim() === "-" ? null : Number(text.replace(",", ".")));
  const commit = (next: number | null) => {
    const resolved = next === null || Number.isNaN(next) ? null : clamp(next);
    if (!controlled) setInternal(resolved);
    setDraft(null);
    if (resolved !== current) onValueChange?.(resolved);
  };
  const bump = (direction: 1 | -1) => {
    const base = current ?? (min !== undefined && direction > 0 ? min - step : 0);
    commit(base + direction * step);
  };
  const atMin = min !== undefined && current !== null && current <= min;
  const atMax = max !== undefined && current !== null && current >= max;
  // Steppers are pointer affordances; keyboard users step with ↑/↓ on the spinbutton itself.
  const stepper = (direction: 1 | -1) => (
    <IconButton
      appearance="main" level="tertiary" size="2xs" tabIndex={-1} className="zen-number__stepper"
      aria-label={direction > 0 ? incrementLabel : decrementLabel}
      disabled={isDisabled || (direction > 0 ? atMax : atMin)}
      icon={<Icon name={direction > 0 ? "icon-plus-line" : "icon-minus-line"} />}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => bump(direction)}
    />
  );
  return (
    <InputField
      {...props}
      ref={ref}
      type="text"
      inputMode={precision > 0 ? "decimal" : "numeric"}
      role="spinbutton"
      aria-valuenow={current ?? undefined}
      aria-valuemin={min}
      aria-valuemax={max}
      state={isReadOnly ? "read-only" : state}
      readOnly={isReadOnly}
      disabled={disabled}
      className={["zen-number", className].filter(Boolean).join(" ")}
      data-align={align}
      value={draft ?? (current === null ? "" : String(current))}
      leading={!isReadOnly && align === "center" ? stepper(-1) : leading}
      trailing={isReadOnly ? trailing : align === "center" ? stepper(1) : <span className="zen-number__steppers">{stepper(-1)}{stepper(1)}</span>}
      onChange={(event) => {
        setDraft(event.target.value);
        const parsed = parse(event.target.value);
        if (parsed !== null && !Number.isNaN(parsed)) {
          if (!controlled) setInternal(parsed);
          if (parsed !== current) onValueChange?.(parsed);
        }
        onChange?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || isReadOnly || isDisabled) return;
        if (event.key === "ArrowUp" || event.key === "ArrowDown") { event.preventDefault(); bump(event.key === "ArrowUp" ? 1 : -1); }
        if (event.key === "Enter" && draft !== null) commit(parse(draft));
      }}
      onBlur={(event) => { if (draft !== null) commit(parse(draft)); onBlur?.(event); }}
    />
  );
});

export type ControlBarSelectItemTheme = "subtle" | "solid" | "inverse";
export type ControlBarSelectItemState = "default" | "hover" | "selected";
export interface ControlBarSelectItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  theme?: ControlBarSelectItemTheme;
  state?: ControlBarSelectItemState;
  icon: ReactNode;
}

/** Public implementation of Figma's `Control-Bar/Select-Item` primitive. */
export function ControlBarSelectItem({ theme = "subtle", state = "default", icon, className, ...props }: ControlBarSelectItemProps) {
  return <button {...props} type="button" className={["zen-control-bar-item", className].filter(Boolean).join(" ")} data-theme={theme} data-state={state}>{icon}</button>;
}

export interface RichTextEditorBarProps {
  theme?: ControlBarSelectItemTheme;
  className?: string;
}

/** Fixed composition exported by Figma as `.Primitives/Rich-Text/Editor-Bar`. */
export function RichTextEditorBar({ theme = "subtle", className }: RichTextEditorBarProps) {
  const item = (label: string, icon: ReactNode) => <ControlBarSelectItem key={label} aria-label={label} title={label} theme={theme} icon={icon} />;
  return (
    <div className={["zen-rich-text-editor-bar", className].filter(Boolean).join(" ")} role="toolbar" aria-label="Rich text editor">
      <span className="zen-rich-text-editor-bar__group">{item("Undo", <Icon name="icon-reverse-left-line" decorative />)}{item("Redo", <Icon name="icon-reverse-right-line" decorative />)}</span>
      <SelectField className="zen-rich-text-editor-bar__select" size="small" aria-label="Text style" options={[{ label: "Paragraph", value: "paragraph" }, { label: "Heading 1", value: "h1" }, { label: "Heading 2", value: "h2" }]} />
      <span className="zen-rich-text-editor-bar__group">{item("Bold", <Icon name="icon-bold-01-line" decorative />)}{item("Italic", <Icon name="icon-italic-01-line" decorative />)}{item("Underline", <Icon name="icon-underline-01-line" decorative />)}{item("Code", <Icon name="icon-code-01-line" decorative />)}</span>
      <span className="zen-rich-text-editor-bar__divider" />
      <span className="zen-rich-text-editor-bar__group">{item("Align left", <Icon name="icon-align-left-01-line" decorative />)}{item("List", <Icon name="icon-list-line" decorative />)}{item("Link", <Icon name="icon-link-01-line" decorative />)}{item("Image", <Icon name="icon-image-line" decorative />)}</span>
    </div>
  );
}

export type RichTextFieldProps = TextAreaFieldProps & { editorBar?: boolean };
export function RichTextField({ editorBar = true, className, ...props }: RichTextFieldProps) {
  return <div className="zen-rich-text-field">{editorBar ? <RichTextEditorBar /> : null}<TextAreaField {...props} size={props.size ?? "large"} rows={props.rows ?? 4} className={[className, "zen-input-field--richtext"].filter(Boolean).join(" ")} /></div>;
}

export type HeadingFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  headingSize?: HeadingInputSize;
  /** Deterministic Figma Status for matrices; native hover/focus still apply. */
  status?: "default" | "hover" | "focus" | "typing" | "inputted-single-line" | "inputted-multi-line" | "inputted-hover";
};
/**
 * Figma Input/Heading: an inline-editable heading (no field chrome). Heading/1–3 text, an 8px pad that sits
 * outside the text box (−8px), radius 12, and a Neutral/Subtle surface on hover/focus/typing.
 */
export const HeadingField = forwardRef<HTMLInputElement, HeadingFieldProps>(function HeadingField({ headingSize = "h3", status, className, placeholder = "Heading", ...props }, ref) {
  const style = headingSize === "h1" ? "Heading/1" : headingSize === "h2" ? "Heading/2" : "Heading/3";
  return (
    <div className={["zen-heading-field", className].filter(Boolean).join(" ")} data-size={headingSize} data-status={status}>
      <input {...props} ref={ref} placeholder={placeholder} className={`zen-heading-field__native ${typographyStyles[style]}`} />
    </div>
  );
});

export type InputConditionState = "default" | "success" | "wrong";
export function InputConditionItem({ label, state = "default" }: { label: ReactNode; state?: InputConditionState }) {
  return <li className="zen-input-condition" data-state={state}><Icon name={state === "success" ? "icon-check-line" : state === "wrong" ? "icon-x-small-line" : "icon-minus-line"} size="2xs" decorative /><span>{label}</span></li>;
}
export function InputConditions({ children, state = "default" }: { children?: ReactNode; state?: "default" }) {
  return <ul className="zen-input-conditions" data-state={state}>{children}</ul>;
}

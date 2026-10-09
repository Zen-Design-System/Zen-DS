import { createContext, forwardRef, useCallback, useContext, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ChangeEvent, type FocusEvent, type FocusEventHandler, type KeyboardEvent, type MouseEvent, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Icon, type IconName } from "../Icon";
import { Popover, PopoverManualAddNew, useExclusivePopover } from "../Popover";
import { BottomSheet } from "../BottomSheet";
import { List, ListItem } from "../ListItem";
import { Search } from "../Search";
import { DatePicker, DatePickerSheet } from "../DatePicker";
import { Button, IconButton } from "../Button";
import { Tag } from "../Tag";
import { Tooltip, useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import type { ZenLabels } from "../_shared/labels";
import { scaleKey } from "../_shared/scale";
import { useZen, useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./input.css";
import "../Icon/core";

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
/** CSS / Figma key (the `data-size` value). */
type InputSizeKey = (typeof inputSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type InputSize = "sm" | "md" | "lg" | "xl" | "small" | "medium" | "large" | "xlarge";
export type InputState = (typeof inputStates)[number];
export type TextAreaSize = Exclude<InputSize, "xlarge" | "xl">;
export type HeadingInputSize = (typeof headingInputSizes)[number];

type CommonFieldProps = {
  label?: ReactNode;
  helpText?: ReactNode;
  /** Figma Label `Optional` / `Tooltip-Icon` / `Action` for the field label (see InputLabel). */
  labelOptional?: boolean;
  labelTooltip?: boolean | ReactNode;
  labelAction?: ReactNode;
  /** Figma Help-Text Theme for `helpText`: Neutral (default) · Warning · Positive · Negative. `error` always renders Negative. */
  helpTheme?: InputHelpTheme;
  /** Figma Help-Text `Icon` axis (default on). */
  helpIcon?: boolean;
  /** Figma Help-Text `Character-Limitation`: custom text (e.g. "12/100"), or `true` to count the value against `maxLength`. */
  characterLimit?: ReactNode | true;
  error?: ReactNode;
  /** @deprecated Use error (same meaning). */
  errorMessage?: ReactNode;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: InputSize;
  state?: InputState;
  /** Before the value: an icon name (`"icon-mail-01-line"`, sized to the field) or any node (a unit, a picker). */
  leading?: IconName | ReactNode;
  /** After the value: an icon name (sized to the field) or any node (a unit, a picker, an action). */
  trailing?: IconName | ReactNode;
  className?: string;
};

export type InputHelpTheme = "neutral" | "negative" | "warning" | "positive";
export interface InputLabelProps {
  id?: string;
  /** id of the <label> element itself, for controls that are named with aria-labelledby (e.g. a rich text editor). */
  labelId?: string;
  children: ReactNode;
  /** Figma `Optional`: appends the locale's "(Optional)" in Content/Neutral/Light. */
  optional?: boolean;
  /** Figma `Tooltip-Icon`: `true` shows the 12px info icon; text/nodes also show it as a hover/focus Tooltip. */
  tooltip?: boolean | ReactNode;
  /** Figma `Action`: right-aligned Body/Small/Bold slot — a link or a text button (e.g. "Forgot password?"). */
  action?: ReactNode;
  /** Figma `State=Disabled`: every part (label, optional, icon, action) turns Content/Disabled. */
  disabled?: boolean;
}

/** Public implementation of Figma's `Primitives/Input/Label` (387:3651): Content (label · optional · tooltip icon,
 * gap 2XSmall) + an optional right-aligned Action. The tooltip icon sits outside the <label> so hovering or
 * focusing it never activates the field. */
export function InputLabel({ id, labelId, children, optional = false, tooltip = false, action, disabled = false }: InputLabelProps) {
  const t = useZenLabels();
  const tooltipContent = tooltip === true || tooltip === false || tooltip === undefined || tooltip === null ? null : tooltip;
  const icon = <Icon name="icon-info-circle-line" size="2xs" decorative />;
  return (
    <span className={`zen-input-label ${typographyStyles["Body/Small/Regular"]}`} data-state={disabled ? "disabled" : "default"}>
      <span className="zen-input-label__content">
        <label className="zen-input-label__text" htmlFor={id} id={labelId}>{children}{optional ? <span className="zen-input-label__optional">{t.optional}</span> : null}</label>
        {tooltipContent && !disabled
          ? <Tooltip content={tooltipContent} size="small"><button type="button" className="zen-input-label__tooltip" aria-label={typeof tooltipContent === "string" ? tooltipContent : t.moreInformation}>{icon}</button></Tooltip>
          : tooltip ? <span className="zen-input-label__tooltip" aria-hidden="true">{icon}</span> : null}
      </span>
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
    <p id={id} className={`zen-input-help ${typographyStyles[theme === "neutral" ? "Caption/Regular" : "Caption/Medium"]}`} data-tone={theme} role={theme === "negative" ? "alert" : undefined}>
      <span className="zen-input-help__content">{icon ? <span className="zen-input-help__icon" aria-hidden="true"><Icon name={iconName} size="xs" decorative /></span> : null}<span>{children}</span></span>
      {/* Character-Limitation stays Caption/Regular in Content/Neutral/Light for every theme. */}
      {characterLimit !== undefined && characterLimit !== null ? <span className={`zen-input-help__limit ${typographyStyles["Caption/Regular"]}`}>{characterLimit}</span> : null}
    </p>
  );
}

export interface InputLeadingTrailingProps {
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: Exclude<InputSize, "xlarge" | "xl">;
  active?: boolean;
  /** An icon name (`"icon-settings-03-line"`, drawn at the slot's icon size) or any node. */
  icon?: IconName | ReactNode;
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
  /** Popover/Label above the options, e.g. "Country code" (a label, not a heading). Also the button's accessible name prefix. */
  popoverLabel?: string;
  /** Open the picker towards the start (leading) or end (trailing) of the field. */
  align?: "start" | "end";
  disabled?: boolean;
  /** Whether the slot is clickable. Defaults to `true` for a labelled slot with `options` (picker) or any slot with
   * `onClick` (action); otherwise `false` (decorative: a click focuses the field). Set it explicitly per use case. */
  interactive?: boolean;
  /** Action slot (no popover), e.g. a filter or visibility toggle. Makes the slot clickable unless `interactive={false}`. */
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Accessible name for a clickable slot; required when it has no visible label (icon-only). */
  "aria-label"?: string;
  /** Marks an action slot that opens a menu/popover owned by the caller. */
  "aria-haspopup"?: ButtonHTMLAttributes<HTMLButtonElement>["aria-haspopup"];
  "aria-expanded"?: boolean;
}

export type InputLeadingTrailingOption = {
  value: string;
  label: ReactNode;
  caption?: ReactNode;
  /** An icon name or any node, shown in the slot and before the option label. */
  icon?: IconName | ReactNode;
  flag?: ReactNode;
};

/** Slot-compatible implementation of `.Primitives/Input/Leading-Trailing`. Three behaviours, chosen per use case:
 * - picker: `options` → a button (label + chevron) that opens the shared Popover;
 * - action: `onClick` → a button that runs the caller's action (filter, show password…);
 * - decorative: neither, or `interactive={false}` → a plain slot; a click on it focuses the field. */
export function InputLeadingTrailing({ size: sizeProp = "md", active: activeProp = true, icon, flag, label, showLabel = true, dropdown = false, showDropdown, children, options, value, onValueChange, popoverLabel, align = "end", disabled: disabledProp = false, interactive: requestedInteractive, onClick, "aria-label": ariaLabel, "aria-haspopup": ariaHasPopup, "aria-expanded": ariaExpanded }: InputLeadingTrailingProps) {
  const size = scaleKey(sizeProp, inputSizes);
  // Figma Field-Only State=Disabled swaps its slots to Active=No: inside a disabled field the slot is inactive and locked.
  const fieldDisabled = useContext(FieldDisabledContext);
  const active = activeProp && !fieldDisabled;
  const disabled = disabledProp || fieldDisabled;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hasLabel = showLabel && label !== undefined && label !== null && label !== "";
  const hasOptions = Boolean(options?.length);
  // Default: labelled pickers and action slots are clickable; an icon-only slot with options stays decorative.
  const interactive = requestedInteractive ?? ((hasLabel && hasOptions) || Boolean(onClick));
  const isPicker = interactive && hasOptions;
  const resolvedDropdown = isPicker || (showDropdown ?? dropdown);
  const current = options?.find((option) => option.value === value);
  // Icon names draw at the slot's Element-Size/Popular: Small 16 · Medium 20 · Large 24.
  const iconSize = size === "small" ? "sm" : size === "large" ? "md" : "base";
  const content = (
    <>
      {current?.flag ?? flag}{renderIcon(current?.icon ?? icon, { size: iconSize })}
      <span className="zen-input-leading-trailing__elements">
        {hasLabel ? <span className={`zen-input-leading-trailing__label ${typographyStyles[size === "large" ? "Heading/4" : "Body/Base/Medium"]}`}>{current ? current.label : label}</span> : null}
        {children}
        {resolvedDropdown ? <span className="zen-input-leading-trailing__dropdown"><Icon name={open ? "icon-chevron-up-line" : "icon-chevron-down-line"} size={size === "small" ? "sm" : "base"} decorative /></span> : null}
      </span>
    </>
  );
  const common = { "data-size": size, "data-active": active ? "true" : "false", "data-label": showLabel ? "true" : "false", "data-dropdown": resolvedDropdown ? "true" : "false", "data-icon-only": hasLabel ? undefined : "true" };
  const pickerName = ariaLabel ?? (popoverLabel ? `${popoverLabel}: ${typeof (current?.label ?? label) === "string" ? current?.label ?? label : value ?? ""}` : undefined);
  // Icon-only slots show their name as a tooltip (Zen rule); labelled slots already read.
  const tip = useIconTooltip(interactive && !hasLabel && !open ? (isPicker ? pickerName : ariaLabel) : false);
  if (!interactive) return <span className="zen-input-leading-trailing" {...common}>{content}</span>;
  if (!isPicker) {
    return (
      <button type="button" className="zen-input-leading-trailing zen-input-leading-trailing--interactive" {...common} disabled={disabled} aria-label={ariaLabel} aria-haspopup={ariaHasPopup} aria-expanded={ariaExpanded} {...tip.bind({ onClick })}>
        {content}
        {tip.tooltip}
      </button>
    );
  }
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
        aria-label={pickerName}
        {...tip.bind({
          onClick: (event: MouseEvent<HTMLButtonElement>) => { setOpen((next) => !next); onClick?.(event); },
          onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !open) { event.preventDefault(); setOpen(true); }
            // Opened with the mouse, focus may still be on this button: Escape closes the picker only.
            if (open) closePopupOnEscape(event, () => setOpen(false));
          },
        })}
      >
        {content}
        {tip.tooltip}
      </button>
      <Popover
        className="zen-input-leading-trailing__popover"
        align={align === "end" ? "end" : "start"}
        open={open}
        onOpenChange={setOpen}
        anchorRef={anchorRef}
        autoFocus
        label={popoverLabel}
        // Escape in the list closes the picker only and hands focus back to its button (never the field's Dialog).
        onKeyDown={(event) => closePopupOnEscape(event, () => { setOpen(false); anchorRef.current?.focus(); })}
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
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: Exclude<InputSize, "xlarge" | "xl">;
  state?: InputContentState;
  text?: ReactNode;
  cursor?: boolean;
}

/** Public implementation of Figma's `.Primitives/Input/Input-Content/Default`. */
export function InputContent({ size: sizeProp = "md", state = "default", text = "Content", cursor = true }: InputContentProps) {
  const size = scaleKey(sizeProp, inputSizes);
  const caret = <span className="zen-input-content__cursor" aria-hidden="true" />;
  // Figma: Focused shows the caret before the placeholder, Typing after the typed text.
  return <span className={`zen-input-content ${typographyStyles[size === "small" ? "Body/Small/Medium" : size === "large" ? "Heading/4" : "Body/Base/Medium"]}`} data-size={size} data-state={state}>{cursor && state === "focused" ? caret : null}{text}{cursor && state === "typing" ? caret : null}</span>;
}

/** Field text style: XLarge fields use Heading/4 (Figma Input-Content Large), every other size Body/Base/Medium. */
const fieldTextStyle = (size: InputSizeKey | undefined) => typographyStyles[size === "xlarge" ? "Heading/4" : "Body/Base/Medium"];

export type InputFieldProps = CommonFieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
  /** Called with the new text on every change (next to the native `onChange(event)`, which still runs). */
  onValueChange?: (value: string) => void;
};
export type TextAreaFieldProps = Omit<CommonFieldProps, "size"> & { /** Short (sm, md…) or Figma (small, medium…) spelling. */ size?: TextAreaSize } & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size"> & {
  /** Called with the new text on every change (next to the native `onChange(event)`, which still runs). */
  onValueChange?: (value: string) => void;
};

function FieldLabel({ id, label, required, optional, tooltip, action, disabled }: { id: string; label?: ReactNode; required?: boolean; optional?: boolean; tooltip?: boolean | ReactNode; action?: ReactNode; disabled?: boolean }) {
  if (!label) return null;
  return <InputLabel id={id} labelId={`${id}-label`} optional={optional} tooltip={tooltip} action={action} disabled={disabled}>{label}{required ? <span aria-hidden="true"> *</span> : null}</InputLabel>;
}

function FieldMessage({ id, error, helpText, helpTheme = "neutral", helpIcon = true, characterLimit }: { id: string; error?: ReactNode; helpText?: ReactNode; helpTheme?: InputHelpTheme; helpIcon?: boolean; characterLimit?: ReactNode }) {
  const hasLimit = characterLimit !== undefined && characterLimit !== null && characterLimit !== false;
  if (!error && !helpText && !hasLimit) return null;
  return <InputHelpText id={id} theme={error ? "negative" : helpTheme} icon={helpIcon && Boolean(error ?? helpText)} characterLimit={hasLimit ? characterLimit : undefined}>{error ?? helpText}</InputHelpText>;
}

/** A consumer's `aria-describedby` plus the field's own help/error message id (space-separated IDREFs). */
const describedBy = (...ids: (string | undefined)[]) => ids.filter(Boolean).join(" ") || undefined;

/** `characterLimit={true}` → "length/maxLength" (or just the length without a maxLength). */
function useCharacterCount(characterLimit: ReactNode | true | undefined, value: unknown, defaultValue: unknown, maxLength: number | undefined) {
  const [length, setLength] = useState(() => String(value ?? defaultValue ?? "").length);
  const current = value !== undefined ? String(value ?? "").length : length;
  const text = characterLimit === true ? (maxLength !== undefined ? `${current}/${maxLength}` : String(current)) : characterLimit;
  return { text, track: (next: string) => setLength(next.length) };
}

function normalizeInputState(state: InputState | undefined, error?: ReactNode): InputState {
  if (state === "error") return "blank-error";
  // An error message always wins over the interaction states (Figma Blank-Error / Inputted-Error);
  // only Read-only and Disabled keep their own look.
  if (error && (state === undefined || state === "default" || state === "hover" || state === "focused" || state === "typing")) return "blank-error";
  if (error && state === "inputted") return "inputted-error";
  return state ?? "default";
}

/** The `disabled` / `readOnly` props pick the Figma state when no explicit `state` is set; Disabled wins. */
const fieldStateFrom = (state: InputState | undefined, disabled?: boolean, readOnly?: boolean): InputState | undefined =>
  state ?? (disabled ? "disabled" : readOnly ? "read-only" : undefined);

/** True inside a Disabled field: its Leading/Trailing slots render Active=No and lock their pickers and actions. */
const FieldDisabledContext = createContext(false);

/**
 * Escape on an open field popup (SelectField list, DateField calendar, Leading/Trailing picker, AutocompleteField list)
 * closes only that popup. The key is used up here: preventDefault for document listeners (useModal) and stopPropagation
 * for React ones, so a surrounding Dialog, ModalForm or Side Panel stays open. Returns whether it was Escape.
 */
function closePopupOnEscape(event: KeyboardEvent<HTMLElement>, close: () => void) {
  if (event.key !== "Escape") return false;
  event.preventDefault();
  event.stopPropagation();
  close();
  return true;
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

function FieldShell({ children, id, label, labelOptional, labelTooltip, labelAction, required, messageId, error, helpText, helpTheme, helpIcon, characterLimit, size, state, leading, trailing, className }: Omit<CommonFieldProps, "characterLimit" | "size"> & { size?: InputSizeKey; characterLimit?: ReactNode; children: ReactNode; id: string; required?: boolean; messageId: string }) {
  const resolvedState = normalizeInputState(state, error);
  const disabled = resolvedState === "disabled";
  // Icon names draw at the affordance size: Element-Size/Popular Small 16 · Base 20 · Medium 24 · Large 28.
  const iconSize = size === "small" ? "sm" : size === "large" ? "md" : size === "xlarge" ? "lg" : "base";
  return (
    <div className={["zen-input-field", className].filter(Boolean).join(" ")} data-size={size ?? "medium"} data-state={resolvedState}>
      <FieldLabel id={id} label={label} required={required} optional={labelOptional} tooltip={labelTooltip} action={labelAction} disabled={disabled} />
      <FieldDisabledContext.Provider value={disabled}>
      <div className="zen-input__control" onMouseDown={focusFieldFromControl} onClick={openFieldFromControl}>
        {leading ? <span className="zen-input__affordance zen-input__affordance--leading">{renderIcon(leading, { size: iconSize })}</span> : null}
        {children}
        {trailing ? <span className="zen-input__affordance zen-input__affordance--trailing">{renderIcon(trailing, { size: iconSize })}</span> : null}
        {/* Figma State=Read-Only: 1px INSIDE stroke with dashPattern [2,2]. CSS dashed borders use browser-defined dash
            lengths, so the exact pattern is an SVG rect (stroke 2px centred on the edge → the inner 1px shows). */}
        {resolvedState === "read-only" ? <svg className="zen-input__dash" aria-hidden="true" focusable="false"><rect width="100%" height="100%" /></svg> : null}
      </div>
      </FieldDisabledContext.Provider>
      <FieldMessage id={messageId} error={error} helpText={helpText} helpTheme={helpTheme} helpIcon={helpIcon} characterLimit={characterLimit} />
    </div>
  );
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(function InputField(
  { id: providedId, label, labelOptional, labelTooltip, labelAction, helpText, helpTheme, helpIcon, characterLimit, error: errorProp, errorMessage, size: sizeProp = "md", state, leading, trailing, className, required, disabled, onValueChange, ...inputProps },
  ref,
) {
  const error = errorProp ?? errorMessage;
  const size = scaleKey(sizeProp, inputSizes);
  const generatedId = useId();
  const id = providedId ?? `zen-input-${generatedId.replace(/:/g, "")}`;
  const messageId = `${id}-message`;
  const count = useCharacterCount(characterLimit, inputProps.value, inputProps.defaultValue, inputProps.maxLength);
  const message = error ?? helpText ?? count.text;
  return (
    <FieldShell id={id} label={label} labelOptional={labelOptional} labelTooltip={labelTooltip} labelAction={labelAction} required={required} messageId={messageId} error={error} helpText={helpText} helpTheme={helpTheme} helpIcon={helpIcon} characterLimit={count.text} size={size} state={fieldStateFrom(state, disabled, inputProps.readOnly)} leading={leading} trailing={trailing} className={className}>
      <input
        {...inputProps}
        onChange={(event) => { count.track(event.target.value); inputProps.onChange?.(event); onValueChange?.(event.target.value); }}
        ref={ref}
        id={id}
        className={`zen-input__native ${fieldTextStyle(size)}`}
        required={required}
        disabled={disabled || normalizeInputState(state, error) === "disabled"}
        readOnly={inputProps.readOnly || normalizeInputState(state, error) === "read-only"}
        // `error` makes it invalid; without one, an explicit aria-invalid (DateField's out-of-range flag, FormField) stays.
        aria-invalid={error ? true : inputProps["aria-invalid"]}
        aria-describedby={describedBy(inputProps["aria-describedby"], message ? messageId : undefined)}
      />
    </FieldShell>
  );
});

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { id: providedId, label, labelOptional, labelTooltip, labelAction, helpText, helpTheme, helpIcon, characterLimit, error: errorProp, errorMessage, size: sizeProp = "md", state, leading, trailing, className, required, disabled, rows = 4, onValueChange, ...textareaProps },
  ref,
) {
  const error = errorProp ?? errorMessage;
  const size = scaleKey(sizeProp, inputSizes);
  const generatedId = useId();
  const id = providedId ?? `zen-text-area-${generatedId.replace(/:/g, "")}`;
  const messageId = `${id}-message`;
  const count = useCharacterCount(characterLimit, textareaProps.value, textareaProps.defaultValue, textareaProps.maxLength);
  const message = error ?? helpText ?? count.text;
  return (
    <FieldShell id={id} label={label} labelOptional={labelOptional} labelTooltip={labelTooltip} labelAction={labelAction} required={required} messageId={messageId} error={error} helpText={helpText} helpTheme={helpTheme} helpIcon={helpIcon} characterLimit={count.text} size={size} state={fieldStateFrom(state, disabled, textareaProps.readOnly)} leading={leading} trailing={trailing} className={className}>
      <textarea
        {...textareaProps}
        onChange={(event) => { count.track(event.target.value); textareaProps.onChange?.(event); onValueChange?.(event.target.value); }}
        ref={ref}
        id={id}
        rows={rows}
        className={`zen-input__native zen-input__native--textarea ${typographyStyles["Body/Base/Medium"]}`}
        required={required}
        disabled={disabled || normalizeInputState(state, error) === "disabled"}
        readOnly={textareaProps.readOnly || normalizeInputState(state, error) === "read-only"}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(textareaProps["aria-describedby"], message ? messageId : undefined)}
      />
    </FieldShell>
  );
});

export type SelectFieldOption = {
  label: string;
  value: string;
  disabled?: boolean;
  /** Short text at the end of the option's row in the list, on the same line (Body/Small/Regular, Neutral/Base), e.g. the
   *  value a token stands for: `{ label: "md", meta: "16px" }`. The field itself shows only the label. */
  meta?: string;
};
export type SelectFieldProps = CommonFieldProps & Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  options?: SelectFieldOption[];
  /** Called with the picked value and its option, next to the native `onChange(event)` (which still runs). */
  onValueChange?: (value: string, option: SelectFieldOption) => void;
  /**
   * Shown (Content/Placeholder) while no option is selected, e.g. "Choose a role". With a placeholder and no
   * `value` / `defaultValue`, nothing is preselected; without one the first option is selected, like a native select.
   */
  placeholder?: string;
  /** Focus entered the field (its trigger or option list) from outside. The event targets the native select (name, value). */
  onFocus?: FocusEventHandler<HTMLSelectElement>;
  /** Focus left the field — the trigger and its option list — as on a native select. The event targets the native select. */
  onBlur?: FocusEventHandler<HTMLSelectElement>;
  /** Popover/Label above the options: it names the option list, not the value (a label, not a heading). On mobile it
   *  is the Bottom Sheet's title (default: the field's label). */
  popoverLabel?: ReactNode;
  /** Adds the Popover Search row; options are filtered by the query. */
  popoverSearch?: boolean;
  popoverSearchPlaceholder?: string;
  /**
   * Opens the option list from outside (controlled, as on Chip); leave it out and the field opens and closes itself.
   * On mobile (the nearest `data-breakpoint`, else ZenProvider's breakpoint, is `mobile`) the options open in a Bottom
   * Sheet instead of a Popover: a List of the options, the picked one selected with a check, and a pick closes it.
   */
  popoverOpen?: boolean;
  /** Called with the next open state: the trigger, Escape, a pick, a click outside or focus leaving the field. */
  onPopoverOpenChange?: (open: boolean) => void;
  /** Figma State=Read-Only: shows the value, keeps the chevron, never opens. */
  readOnly?: boolean;
};

/** SelectField's focus handlers are typed for its native <select>: hand them the event re-targeted at it (name, value). */
function selectFocusEvent(event: FocusEvent<HTMLElement>, select: HTMLSelectElement | null): FocusEvent<HTMLSelectElement> {
  if (!select) return event as unknown as FocusEvent<HTMLSelectElement>;
  return Object.create(event, { target: { value: select }, currentTarget: { value: select } }) as FocusEvent<HTMLSelectElement>;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { id: providedId, label, labelOptional, labelTooltip, labelAction, helpText, helpTheme, helpIcon, characterLimit, error: errorProp, errorMessage, size: sizeProp = "md", state, leading, trailing, className, required, disabled, readOnly = false, options = [], onValueChange, placeholder, popoverLabel, popoverSearch = false, popoverSearchPlaceholder, popoverOpen, onPopoverOpenChange, children, onFocus, onBlur, ...selectProps },
  ref,
) {
  const error = errorProp ?? errorMessage;
  const size = scaleKey(sizeProp, inputSizes);
  const generatedId = useId();
  const id = providedId ?? `zen-select-${generatedId.replace(/:/g, "")}`;
  const messageId = `${id}-message`;
  const message = error ?? helpText;
  const nativeRef = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = popoverOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    if (next !== open) onPopoverOpenChange?.(next);
  };
  const [openedFromKeyboard, setOpenedFromKeyboard] = useState(false);
  // Focus moves into the list only when the person opened it from the trigger; a list opened from outside
  // (popoverOpen) leaves focus where it is.
  const [openedFromTrigger, setOpenedFromTrigger] = useState(false);
  const closeAndRestore = () => { setOpen(false); triggerRef.current?.focus(); };
  // Mobile: the options open in a Bottom Sheet. The nearest data-breakpoint decides (ZenProvider's, or a phone frame
  // that only sets the attribute), else the provider's breakpoint; read again whenever the list opens or closes.
  const zen = useZen();
  const [domBreakpoint, setDomBreakpoint] = useState<string | null>(null);
  useLayoutEffect(() => {
    setDomBreakpoint(triggerRef.current?.parentElement?.closest("[data-breakpoint]")?.getAttribute("data-breakpoint") ?? null);
  }, [open, zen?.breakpoint]);
  const asSheet = (domBreakpoint ?? zen?.breakpoint) === "mobile";
  const [sheetQuery, setSheetQuery] = useState("");
  useEffect(() => { if (!open) setSheetQuery(""); }, [open]);
  useExclusivePopover(open, () => setOpen(false), triggerRef);
  useEffect(() => { if (!open) setOpenedFromTrigger(false); }, [open]);
  useEffect(() => {
    // The Bottom Sheet dismisses itself (scrim, drag, Escape); its taps are outside the field.
    if (!open || asSheet) return undefined;
    // Pointer down outside the field closes the option list.
    const handlePointerDown = (event: PointerEvent) => {
      const field = triggerRef.current?.closest(".zen-input-field");
      if (!field || field.contains(event.target as Node)) return;
      // Focus inside the list would vanish with it (no blur event): hand it to the trigger first, so leaving the field
      // is reported by the trigger's blur when the click moves focus.
      const active = document.activeElement;
      if (active && active !== triggerRef.current && triggerRef.current?.closest(".zen-input__control")?.contains(active)) triggerRef.current?.focus({ preventScroll: true });
      setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open, asSheet]);
  const hasPlaceholder = placeholder !== undefined && placeholder !== "";
  const controlledValue = selectProps.value == null ? undefined : String(selectProps.value);
  // A placeholder keeps the field empty until the user picks; without one the first option is preselected.
  const defaultValue = selectProps.defaultValue == null ? (hasPlaceholder ? "" : options[0]?.value ?? "") : String(selectProps.defaultValue);
  const [selectedValue, setSelectedValue] = useState(controlledValue ?? defaultValue);
  useEffect(() => {
    if (controlledValue !== undefined) setSelectedValue(controlledValue);
  }, [controlledValue]);
  const selectedOption = options.find((option) => option.value === (controlledValue ?? selectedValue));
  const showPlaceholder = hasPlaceholder && !selectedOption && !(controlledValue ?? selectedValue);
  const resolvedState = normalizeInputState(state, error);
  const isDisabled = disabled || resolvedState === "disabled";
  const isReadOnly = readOnly || resolvedState === "read-only";
  const ariaDescribedBy = describedBy(selectProps["aria-describedby"], message ? messageId : undefined);
  useImperativeHandle(ref, () => nativeRef.current as HTMLSelectElement);
  /** A pick from the Popover or the Bottom Sheet: the value, the native select (onChange) and onValueChange. */
  const pick = (nextValue: string) => {
    if (controlledValue == null) setSelectedValue(nextValue);
    if (nativeRef.current) nativeRef.current.value = nextValue;
    selectProps.onChange?.({ target: nativeRef.current, currentTarget: nativeRef.current } as ChangeEvent<HTMLSelectElement>);
    const option = options.find((entry) => entry.value === nextValue);
    if (option) onValueChange?.(nextValue, option);
  };
  // onFocus / onBlur belong to the whole field — the trigger and its option list — as on a native select (the hidden
  // <select> never takes focus from the user). Each fires once as focus enters / leaves the field.
  const focusReported = useRef(false);
  const inControl = (node: EventTarget | null) => node instanceof Node && Boolean(triggerRef.current?.closest(".zen-input__control")?.contains(node));
  const reportFocus = (event: FocusEvent<HTMLElement>) => {
    if (focusReported.current || inControl(event.relatedTarget)) return;
    focusReported.current = true;
    onFocus?.(selectFocusEvent(event, nativeRef.current));
  };
  const reportBlur = (event: FocusEvent<HTMLElement>) => {
    // Focus moving inside the field, or to nowhere while the list is open (Safari's mouse-down on an option, the
    // list's scrollbar), does not leave it: picking, Escape and a click outside hand focus on from the trigger.
    // The open Bottom Sheet takes the focus and gives it back to the trigger: the field is still in use.
    if (!focusReported.current || inControl(event.relatedTarget) || (!event.relatedTarget && open) || (asSheet && open)) return;
    focusReported.current = false;
    onBlur?.(selectFocusEvent(event, nativeRef.current));
  };
  return (
    <FieldShell id={id} label={label} labelOptional={labelOptional} labelTooltip={labelTooltip} labelAction={labelAction} required={required} messageId={messageId} error={error} helpText={helpText} helpTheme={helpTheme} helpIcon={helpIcon} characterLimit={characterLimit === true ? undefined : characterLimit} size={size} state={isDisabled ? "disabled" : isReadOnly ? "read-only" : state} leading={leading} trailing={trailing ?? <Icon name="icon-chevron-down-line" size="2xs" />} className={[className, open ? "zen-input-field--popover-open" : ""].filter(Boolean).join(" ")}>
      <button
        id={`${id}-trigger`}
        className={`zen-input__native zen-select__trigger ${fieldTextStyle(size)}`}
        type="button"
        disabled={isDisabled}
        aria-haspopup={asSheet ? "dialog" : "listbox"}
        // Named by the field's label and its own value ("Project, Online banking redesign"), as a native select is: the
        // <label> points at the hidden <select>, so the button alone read only its value.
        aria-labelledby={label ? `${id}-label ${id}-trigger` : selectProps["aria-labelledby"] ? `${selectProps["aria-labelledby"]} ${id}-trigger` : selectProps["aria-label"] ? `${id}-name ${id}-trigger` : undefined}
        aria-readonly={isReadOnly || undefined}
        aria-expanded={open}
        aria-controls={asSheet ? undefined : `${id}-popover`}
        aria-invalid={error ? true : undefined}
        aria-describedby={ariaDescribedBy}
        ref={triggerRef}
        onClick={(event) => { if (isReadOnly) return; setOpenedFromKeyboard(event.detail === 0); setOpenedFromTrigger(!open); setOpen(!open); }}
        onFocus={reportFocus}
        onBlur={(event) => {
          reportBlur(event);
          // Close when focus leaves both the trigger and its popover (the Bottom Sheet holds the focus while it is open).
          if (asSheet) return;
          const next = event.relatedTarget as Node | null;
          if (next && event.currentTarget.parentElement?.closest(".zen-input-field")?.contains(next)) return;
          if (next) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (!isReadOnly && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
            event.preventDefault();
            setOpenedFromKeyboard(true);
            setOpenedFromTrigger(true);
            setOpen(true);
          }
          // An open list (mouse-opened, focus still here) closes on Escape; a closed one lets Escape reach its Dialog.
          if (open) closePopupOnEscape(event, () => setOpen(false));
        }}
      >
        {selectedOption?.label ?? (showPlaceholder ? <span className="zen-select__placeholder">{placeholder}</span> : selectedValue)}
      </button>
      {/* The name an unlabelled select takes from `aria-label`, read before its value (aria-labelledby on the button). */}
      {!label && !selectProps["aria-labelledby"] && selectProps["aria-label"] ? <span id={`${id}-name`} hidden>{selectProps["aria-label"]}</span> : null}
      <select
        {...selectProps}
        ref={nativeRef}
        id={id}
        className="zen-select__native"
        required={required}
        disabled={isDisabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={ariaDescribedBy}
        aria-hidden="true"
        tabIndex={-1}
        // The hidden select only changes by itself through autofill; treat that like a pick. Always having a handler
        // also keeps React quiet for a `value` driven by onValueChange alone.
        onChange={(event) => {
          const nextValue = event.target.value;
          if (controlledValue == null) setSelectedValue(nextValue);
          selectProps.onChange?.(event);
          const option = options.find((entry) => entry.value === nextValue);
          if (option) onValueChange?.(nextValue, option);
        }}
        onFocus={reportFocus}
        onBlur={reportBlur}
      >
        {/* The empty "placeholder label option" keeps the native value "" (and `required` invalid) until a pick. */}
        {hasPlaceholder && !options.some((option) => option.value === "") ? <option value="">{placeholder}</option> : null}
        {children ?? options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
      {asSheet ? (
        <BottomSheet open={open && !isDisabled} onOpenChange={(next) => { if (!next) setOpen(false); }} title={popoverLabel ?? label ?? selectProps["aria-label"] ?? placeholder ?? ""}
          search={popoverSearch ? <Search value={sheetQuery} onValueChange={setSheetQuery} placeholder={popoverSearchPlaceholder} /> : undefined}>
          <List aria-label={typeof (popoverLabel ?? label) === "string" ? String(popoverLabel ?? label) : selectProps["aria-label"]}>
            {options.filter((option) => !sheetQuery.trim() || option.label.toLowerCase().includes(sheetQuery.trim().toLowerCase())).map((option) => {
              const picked = option.value === (controlledValue ?? selectedValue);
              return (
                <ListItem key={option.value} title={option.label} selected={picked} className={option.disabled ? "zen-select__sheet-option--disabled" : undefined} aria-disabled={option.disabled || undefined}
                  trailing={option.meta || picked ? <>{option.meta ? <span className={`zen-select__option-meta ${typographyStyles["Body/Small/Regular"]}`}>{option.meta}</span> : null}{picked ? <Icon name="icon-check-line" size="base" decorative /> : null}</> : undefined}
                  onClick={option.disabled ? undefined : () => { pick(option.value); setOpen(false); }} />
              );
            })}
          </List>
        </BottomSheet>
      ) : (
      <Popover
        id={`${id}-popover`}
        open={open && !isDisabled}
        label={popoverLabel}
        // Without a Popover label, the option list is named like the field: its label, or the field's own aria-label.
        aria-labelledby={popoverLabel ? undefined : label ? `${id}-label` : selectProps["aria-labelledby"]}
        aria-label={popoverLabel || label ? undefined : selectProps["aria-label"]}
        search={popoverSearch}
        searchPlaceholder={popoverSearchPlaceholder}
        // The search field takes focus on open, so a mouse-opened list is still typeable.
        autoFocus={openedFromTrigger && (openedFromKeyboard || popoverSearch)}
        onBlur={reportBlur}
        onKeyDown={(event) => {
          if (closePopupOnEscape(event, closeAndRestore)) return;
          if (event.key === "Tab") {
            setOpen(false);
            // Tab leaves the field: move on from the trigger (the list closes under the focused option), so the
            // trigger's blur reports it. Shift+Tab lands on the trigger anyway.
            if (!event.shiftKey) triggerRef.current?.focus({ preventScroll: true });
          }
        }}
        items={options.map((option) => ({ id: option.value, label: option.label, trailing: option.meta ? <span className={`zen-select__option-meta ${typographyStyles["Body/Small/Regular"]}`}>{option.meta}</span> : undefined, value: option.value, disabled: option.disabled, selected: option.value === (controlledValue ?? selectedValue) }))}
        onSelect={(item) => { pick(item.value ?? ""); closeAndRestore(); }}
      />
      )}
    </FieldShell>
  );
});

/** Figma Input page compositions that reuse the Text Field primitive. DateField's calendar opens when a person tabs to or
 * clicks the field, never on a script's focus (a blocked submit's focusFirstInvalidField, a Dialog's first focus). */
export type DateFieldProps = InputFieldProps & {
  datePicker?: boolean;
  /** The calendar's Cancel + Submit (Figma Actions): a picked day is a draft until Submit writes it to the field; Cancel and
   *  Escape keep the date the field had. */
  datePickerActions?: boolean;
  /** The day in the field: called when one is picked in the calendar and when a complete MM/DD/YYYY is typed; null when
   *  the field is emptied or a typed date stops being a real day. */
  onDateChange?: (date: Date | null) => void;
  /** Earliest day the calendar lets people pick (DatePicker `minDate`); earlier days are disabled. A typed date before
   * it stays in the field and reaches `onValueChange` as usual, and the input is marked `aria-invalid` (Form and
   * ModalForm count it and focus it after a blocked submit). The field shows no message of its own: validate the value
   * and pass `error` ("Pick a date from 1 October"). */
  minDate?: Date;
  /** Latest day the calendar lets people pick (DatePicker `maxDate`); later days are disabled. A typed date after it is
   * kept, reported and marked `aria-invalid` as for `minDate`: pass `error` to say why. */
  maxDate?: Date;
  /** The day the calendar treats as today (DatePicker `today`): its Today ring and the month it opens on while empty.
   * Default: the device clock. */
  today?: Date;
};
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
/** A complete MM/DD/YYYY that names a real day (02/31/2026 is not one), as typed into a DateField. */
function parseTypedDate(text: string): Date | null {
  const match = /^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*$/.exec(text);
  if (!match) return null;
  const [month, day, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}
const calendarDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
/** A date outside `minDate` / `maxDate`. Text counts once it holds a 4-digit year: "10/01/202" (half-typed) would
 * otherwise read as the year 202. */
function isOutOfRange(value: unknown, date: Date | null, minDate?: Date, maxDate?: Date) {
  if (!date || (typeof value === "string" && !/\d{4}/.test(value))) return false;
  return Boolean((minDate && calendarDay(date) < calendarDay(minDate)) || (maxDate && calendarDay(date) > calendarDay(maxDate)));
}
export function DateField({ trailing, datePicker = true, datePickerActions = false, onDateChange, onValueChange, onFocus, onClick, onChange, onKeyDown, value, defaultValue, minDate, maxDate, today, "aria-invalid": ariaInvalid, ...props }: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  // Closing returns focus to the input; that focus must not re-open the picker.
  const closing = useRef(false);
  const close = () => { closing.current = true; setOpen(false); requestAnimationFrame(() => { closing.current = false; }); };
  // The calendar opens when a person moves to the field (Tab) or clicks it, never on a script's focus: a blocked submit
  // focusing the first invalid field (focusFirstInvalidField), a Dialog's first focus or focus handed back by a closing
  // popup must not drop the calendar over the form. A Tab keydown marks the task it runs in; the focus it moves arrives
  // in that same task (a focus trap's wrap-around included), before the timer clears the mark.
  const tabbing = useRef(false);
  useEffect(() => {
    const doc = fieldRef.current?.ownerDocument ?? document;
    let timer = 0;
    const handleTab = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab") return;
      tabbing.current = true;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => { tabbing.current = false; }, 0);
    };
    doc.addEventListener("keydown", handleTab, true);
    return () => { doc.removeEventListener("keydown", handleTab, true); window.clearTimeout(timer); };
  }, []);
  const canOpen = !props.readOnly && props.state !== "read-only" && !props.disabled && props.state !== "disabled";
  // Phones (the nearest data-breakpoint, else ZenProvider's) get the Date-Picker/Mobile sheet instead of the desktop
  // popover (Figma has no mobile popover). A modal sheet opens on a tap or ArrowDown, not on Tab focus.
  const zenBreakpoint = useZen()?.breakpoint;
  const [phone, setPhone] = useState(false);
  useLayoutEffect(() => { setPhone((fieldRef.current?.closest("[data-breakpoint]")?.getAttribute("data-breakpoint") ?? zenBreakpoint) === "mobile"); }, [zenBreakpoint]);
  const controlledValue = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? ""));
  const currentValue = controlledValue ? value : internalValue;
  const parsedValue = parseDateFieldValue(currentValue);
  // Error-ready: a typed date outside the range is kept and reported (onValueChange) like any text, and marked invalid for
  // assistive tech and Form's blocked-submit focus. The app's `error` gives the reason; an explicit aria-invalid wins.
  const outOfRange = isOutOfRange(currentValue, parsedValue, minDate, maxDate);
  // Typing reports the date too: a complete, real MM/DD/YYYY gives that day; emptying the field or breaking a complete
  // date gives null (once, not on every keystroke of a half-typed date).
  const typedDate = useRef<number | null>(parsedValue ? calendarDay(parsedValue) : null);
  const handleDateChange = (date: Date | null) => {
    const text = date ? `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}` : null;
    if (!controlledValue && text) setInternalValue(text);
    typedDate.current = date ? calendarDay(date) : null;
    onDateChange?.(date);
    // A picked day is a new value too (the text the field shows, MM/DD/YYYY), like typing it.
    if (text) onValueChange?.(text);
    close();
  };
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!controlledValue) setInternalValue(event.target.value);
    onChange?.(event);
    const date = parseTypedDate(event.target.value);
    const day = date ? calendarDay(date) : null;
    if (day !== typedDate.current) { typedDate.current = day; onDateChange?.(date); }
  };
  return (
    <div
      className="zen-date-field"
      ref={fieldRef}
      // Like SelectField, a click anywhere in the box (text, padding, calendar icon) opens the picker — including
      // after Escape or a pick, when the input kept focus and no new focus event fires. Own buttons keep their action.
      onClick={(event) => {
        const target = event.target as Element;
        if (!canOpen || !target.closest(".zen-input__control") || target.closest("button, a[href]")) return;
        setOpen(true);
      }}
    >
      <InputField
        {...props}
        value={controlledValue ? value : internalValue}
        type="text"
        // English on purpose: the placeholder shows the only typed format parseDateFieldValue reads (US MM/DD/YYYY).
        placeholder={props.placeholder ?? "MM/DD/YYYY"}
        // APG Date Picker Combobox: the field is a combobox that opens a calendar dialog; it says so and whether the
        // calendar is open (a caller's own values win).
        role={props.role ?? (datePicker ? "combobox" : undefined)}
        aria-haspopup={props["aria-haspopup"] ?? (datePicker ? "dialog" : undefined)}
        aria-expanded={props["aria-expanded"] ?? (datePicker ? open : undefined)}
        trailing={trailing ?? <Icon name="icon-calendar-line" size="sm" />}
        onFocus={(event) => { if (canOpen && tabbing.current && !closing.current && !phone) setOpen(true); onFocus?.(event); }}
        onClick={onClick}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // The calendar opens on Tab focus or a click, so focus is usually still here: Escape closes the calendar only.
          if (open && datePicker && !event.defaultPrevented) closePopupOnEscape(event, close);
          // APG Date Picker Combobox: ArrowDown (or Alt+ArrowDown) opens the calendar and moves focus into its grid,
          // on the selected day, else today, else the first day that can be picked.
          if (datePicker && canOpen && event.key === "ArrowDown" && !event.defaultPrevented) {
            event.preventDefault();
            setOpen(true);
            const focusDay = (tries: number) => requestAnimationFrame(() => {
              const grid = fieldRef.current?.querySelector(".zen-date-picker__panels");
              const day = grid?.querySelector<HTMLElement>(".zen-date-picker__day:is([data-state^='range-selected'], [data-state='single-selected'])")
                ?? grid?.querySelector<HTMLElement>(".zen-date-picker__day[aria-current='date']:not(:disabled)")
                ?? grid?.querySelector<HTMLElement>(".zen-date-picker__day:not(:disabled):not(.is-blank)");
              if (day) day.focus({ preventScroll: true });
              else if (tries > 0) focusDay(tries - 1);
            });
            focusDay(3);
          }
        }}
        onChange={handleChange}
        onValueChange={onValueChange}
        aria-invalid={ariaInvalid ?? (outOfRange || undefined)}
      />
      {/* With datePickerActions a pick is a draft: Submit writes it (onApply), Cancel and Escape keep the field's date. */}
      {datePicker && phone ? (
        <DatePickerSheet open={open} onOpenChange={(next) => { if (!next) close(); }} title={typeof props.label === "string" ? props.label : undefined} value={parsedValue} onApply={(date) => handleDateChange(date)} minDate={minDate} maxDate={maxDate} today={today} />
      ) : datePicker ? <DatePicker open={open} value={parsedValue} onValueChange={datePickerActions ? undefined : handleDateChange} onApply={datePickerActions ? (date) => handleDateChange(date) : undefined} onClose={close} anchorRef={fieldRef} showActions={datePickerActions} minDate={minDate} maxDate={maxDate} today={today} /> : null}
    </div>
  );
}

export type AutocompleteOption = { id: string; label: string; leading?: ReactNode; photoSrc?: string };
export interface AutocompleteFieldProps {
  id?: string;
  label?: ReactNode;
  helpText?: ReactNode;
  helpTheme?: InputHelpTheme;
  helpIcon?: boolean;
  /** Blank-Error / Inputted-Error message (Help-Text Theme=Negative). */
  error?: ReactNode;
  /** @deprecated Use error (same meaning). */
  errorMessage?: ReactNode;
  options: AutocompleteOption[];
  value?: string[];
  defaultValue?: string[];
  /** Called with the selected option ids when a tag is added, created or removed. */
  onValueChange?: (value: string[]) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (value: string[]) => void;
  /** Ids rendered as Tag State=Error (Inputted-Error). */
  invalidValues?: string[];
  /** Figma State=View-Only: tags without Remove and no Add button. */
  readOnly?: boolean;
  disabled?: boolean;
  /** Text of the Add button. Default: the locale's "Add Item". */
  addLabel?: ReactNode;
  /** Label above the option list (it names the list; not a heading). Default: the locale's "Search and select". */
  popoverLabel?: ReactNode;
  /** Placeholder of the Search row. Default: the locale's "Search". */
  searchPlaceholder?: string;
  /** Figma Popover/Manual-Add-New: create a value that isn't in `options`. Add the new option to `options`
   * and return its id; the field then selects it as a Tag. A typed value that matches an option shows no Create row:
   * an option already added as a Tag is listed as selected (disabled) instead. */
  onCreate?: (label: string) => string | void;
  createLabel?: ReactNode;
  className?: string;
}

/**
 * Figma Input/Autocomplete-Field (1241:5616): Label, a wrapping Tag list (gap 4, Tag Remove=Yes) and an
 * "Add Item" Button/Main XSmall Secondary that opens Popover/Default (Search + "Search and select" label + items)
 * over the Add slot. Selected options become tags; the popover closes on outside pointer-down or Escape. Removing a tag
 * moves focus to the next tag's Remove button, else the previous tag's, else Add Item.
 */
export function AutocompleteField({ id: providedId, label, helpText, helpTheme = "neutral", helpIcon = true, error: errorProp, errorMessage, options, value, defaultValue = [], onValueChange, onChange, invalidValues = [], readOnly = false, disabled = false, addLabel: addLabelProp, popoverLabel: popoverLabelProp, searchPlaceholder: searchPlaceholderProp, onCreate, createLabel, className }: AutocompleteFieldProps) {
  const error = errorProp ?? errorMessage;
  const t = useZenLabels();
  const addLabel = addLabelProp === undefined ? t.addItem : addLabelProp;
  const popoverLabel = popoverLabelProp === undefined ? t.searchAndSelect : popoverLabelProp;
  const searchPlaceholder = searchPlaceholderProp ?? t.search;
  const generatedId = useId();
  const id = providedId ?? `zen-autocomplete-${generatedId.replace(/:/g, "")}`;
  const [internal, setInternal] = useState<string[]>(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const addRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const selected = value ?? internal;
  const commit = (next: string[]) => { if (value === undefined) setInternal(next); onValueChange?.(next); onChange?.(next); };
  const byId = new Map(options.map((option) => [option.id, option]));
  const normalizedQuery = query.trim().toLowerCase();
  const available = options.filter((option) => !selected.includes(option.id) && option.label.toLowerCase().includes(normalizedQuery));
  // A typed value that is already a Tag is not new: it is listed as selected (and disabled, it is in already), so the
  // Manual-Add-New list counts it as existing and shows no Create row for it.
  const alreadyAdded = normalizedQuery ? options.filter((option) => selected.includes(option.id) && option.label.trim().toLowerCase() === normalizedQuery) : [];
  const closePopover = () => { setOpen(false); setQuery(""); };
  // Escape in the list (or on the Add button while it is open) closes the list only and returns focus to Add.
  const handlePopoverKeyDown = (event: KeyboardEvent<HTMLElement>) => closePopupOnEscape(event, () => { closePopover(); addButtonRef.current?.focus(); });
  // A removed Tag takes its Remove button with it: focus moves to the next tag's Remove button, else the previous tag's,
  // else Add Item, so it never falls back to the page. It moves once the new value has rendered (a controlled parent that
  // keeps the tag moves nothing), and only when focus was lost with the button or is still in the field.
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ key: string; index: number } | null>(null);
  const selectedKey = selected.join("\u0000");
  useLayoutEffect(() => {
    const pending = pendingFocus.current;
    pendingFocus.current = null;
    const root = rootRef.current;
    if (!pending || pending.key !== selectedKey || !root) return;
    const active = root.ownerDocument.activeElement;
    if (active && active !== root.ownerDocument.body && !root.contains(active)) return;
    const removes = Array.from(root.querySelectorAll<HTMLButtonElement>(".zen-autocomplete__tags .zen-tag__remove:not(:disabled)"));
    (removes[Math.min(pending.index, removes.length - 1)] ?? addButtonRef.current)?.focus();
  }, [selectedKey]);
  const removeTag = (optionId: string) => {
    const next = selected.filter((item) => item !== optionId);
    pendingFocus.current = { key: next.join("\u0000"), index: selected.filter((item) => byId.has(item)).indexOf(optionId) };
    commit(next);
  };
  const messageId = `${id}-message`;
  return (
    <div ref={rootRef} className={["zen-autocomplete", className].filter(Boolean).join(" ")} data-state={disabled ? "disabled" : readOnly ? "view-only" : error ? "error" : open ? "focused" : "default"} aria-describedby={error || helpText ? messageId : undefined}>
      {label ? <InputLabel id={id} disabled={disabled}>{label}</InputLabel> : null}
      {selected.length ? (
        <div className="zen-autocomplete__tags" role="list" aria-label={typeof label === "string" ? label : undefined}>
          {selected.map((optionId) => {
            const option = byId.get(optionId);
            if (!option) return null;
            return <span key={optionId} role="listitem"><Tag leading={option.leading} photoSrc={option.photoSrc} error={invalidValues.includes(optionId)} disabled={disabled} remove={!readOnly} onRemove={() => removeTag(optionId)}>{option.label}</Tag></span>;
          })}
        </div>
      ) : null}
      {!readOnly ? (
        <div className="zen-autocomplete__add" ref={addRef}>
          {/* zen-allow-secondary: Figma Input/Autocomplete-Field (1241:5616) "Add Item" is Button/Main XSmall Secondary.
              zen-allow-filter-button: it opens the option list to add values, not a filter.
              zen-allow-compact-button: Figma sizes this in-field "Add Item" pill XSmall so it fits inside the 40px field. */}
          <Button ref={addButtonRef} appearance="main" level="secondary" size="xs" disabled={disabled} startIcon={<Icon name="icon-plus-line" decorative />} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} onKeyDown={(event) => { if (open) handlePopoverKeyDown(event); }}>{addLabel}</Button>
          {onCreate ? (
            <PopoverManualAddNew
              open={open}
              onOpenChange={(next) => { if (next) setOpen(true); else closePopover(); }}
              anchorRef={addRef}
              autoFocus
              searchPlaceholder={searchPlaceholder}
              searchValue={query}
              onSearchChange={setQuery}
              label={popoverLabel}
              createLabel={createLabel}
              onKeyDown={handlePopoverKeyDown}
              // Existing options (even already-selected ones) count as "exists", so Create only offers genuinely new values.
              items={[
                ...available.map((option) => ({ id: option.id, label: option.label, leading: option.leading })),
                ...alreadyAdded.map((option) => ({ id: option.id, label: option.label, leading: option.leading, selected: true, disabled: true })),
              ]}
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
              onOpenChange={(next) => { if (next) setOpen(true); else closePopover(); }}
              anchorRef={addRef}
              autoFocus
              search
              searchPlaceholder={searchPlaceholder}
              searchValue={query}
              onSearchChange={setQuery}
              label={popoverLabel}
              onKeyDown={handlePopoverKeyDown}
              items={available.map((option) => ({ id: option.id, label: option.label, leading: option.leading }))}
              onSelect={(item) => { commit([...selected, item.id]); setQuery(""); }}
            />
          )}
        </div>
      ) : null}
      {error || helpText ? <InputHelpText id={messageId} theme={error ? "negative" : helpTheme} icon={helpIcon}>{error ?? helpText}</InputHelpText> : null}
    </div>
  );
}

export type NumberFieldProps = Omit<InputFieldProps, "value" | "defaultValue" | "type" | "min" | "max" | "step" | "onValueChange"> & {
  /** Figma Input/Number-Align-Left (steppers trailing) or Number-Align-Center (− value +). */
  align?: "left" | "center";
  value?: number | null;
  defaultValue?: number | null;
  onValueChange?: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Accessible name of the − stepper. Default: the locale's "Decrease". */
  decrementLabel?: string;
  /** Accessible name of the + stepper. Default: the locale's "Increase". */
  incrementLabel?: string;
};

const decimalPlaces = (n: number) => (String(n).split(".")[1] ?? "").length;

/** Figma Input/Number-Align-Left (421:10057) and Number-Align-Center (450:7900): Button/Icon-Main 2XSmall Tertiary
 * steppers (24px) after or around the value. Read-Only hides the steppers; Disabled keeps them, disabled (Figma still
 * draws State=Default steppers in the Disabled variant). Keyboard: ↑/↓ step; Enter/blur clamps. */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { align = "left", value, defaultValue = null, onValueChange, onChange, onKeyDown, onBlur, min, max, step = 1, readOnly, state, disabled, className, decrementLabel: decrementLabelProp, incrementLabel: incrementLabelProp, leading, trailing, ...props },
  ref,
) {
  const t = useZenLabels();
  const decrementLabel = decrementLabelProp ?? t.decrease;
  const incrementLabel = incrementLabelProp ?? t.increase;
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
      state={isDisabled ? "disabled" : isReadOnly ? "read-only" : state}
      readOnly={isReadOnly}
      disabled={isDisabled}
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
  /** An icon name (`"icon-bold-02-line"`, drawn at 20px) or any node. Name the item with aria-label. */
  icon: IconName | ReactNode;
}

/** Public implementation of Figma's `Control-Bar/Select-Item` primitive. */
export function ControlBarSelectItem({ theme = "subtle", state = "default", icon, className, ...props }: ControlBarSelectItemProps) {
  return <button {...props} type="button" className={["zen-control-bar-item", className].filter(Boolean).join(" ")} data-tone={theme} data-state={state}>{renderIcon(icon, { size: "base" })}</button>;
}

export type RichTextCommand =
  | "undo" | "redo"
  | "bold" | "underline" | "italic" | "strikethrough"
  | "align-left" | "align-center" | "align-right" | "align-justify"
  | "bulleted-list" | "numbered-list" | "outdent" | "indent"
  | "link" | "image" | "video"
  | "clear-format";
export type RichTextBlockType = "p" | "h1" | "h2" | "h3";
/** The Text style options with English names; RichTextEditorBar shows the same block types named in the locale. */
export const richTextBlockTypes: SelectFieldOption[] = [
  { label: "Paragraph", value: "p" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
];

/** `label` is the item's key in the locale's `richText` labels (en "Undo", "Bold", "Insert link"…). */
type EditorBarItem = { command: RichTextCommand; label: keyof ZenLabels["richText"]; icon: IconName; toggle?: boolean };
/** Figma `.Primitives/Rich-Text/Editor-Bar` (6385:36476), left to right. `select` marks the Text style field,
 * `divider` a vertical Divider/Default between blocks. */
const editorBarLayout: (EditorBarItem[] | "select" | "divider")[] = [
  [
    { command: "undo", label: "undo", icon: "icon-flip-backward-line" },
    { command: "redo", label: "redo", icon: "icon-flip-forward-line" },
  ],
  "select",
  [
    { command: "bold", label: "bold", icon: "icon-bold-02-line", toggle: true },
    { command: "underline", label: "underline", icon: "icon-underline-02-line", toggle: true },
    { command: "italic", label: "italic", icon: "icon-italic-02-line", toggle: true },
    { command: "strikethrough", label: "strikethrough", icon: "icon-strikethrough-line", toggle: true },
  ],
  "divider",
  [
    { command: "align-left", label: "alignLeft", icon: "icon-align-left-line", toggle: true },
    { command: "align-center", label: "alignCenter", icon: "icon-align-center-line", toggle: true },
    { command: "align-right", label: "alignRight", icon: "icon-align-right-line", toggle: true },
    { command: "align-justify", label: "justify", icon: "icon-align-justify-line", toggle: true },
  ],
  "divider",
  [
    { command: "bulleted-list", label: "bulletedList", icon: "icon-list-line", toggle: true },
    { command: "numbered-list", label: "numberedList", icon: "icon-dot-number-line", toggle: true },
    { command: "outdent", label: "decreaseIndent", icon: "icon-left-indent-01-solid" },
    { command: "indent", label: "increaseIndent", icon: "icon-right-indent-01-solid" },
  ],
  "divider",
  [
    { command: "link", label: "insertLink", icon: "icon-link-01-line", toggle: true },
    { command: "image", label: "insertImage", icon: "icon-image-line" },
    { command: "video", label: "insertVideo", icon: "icon-film-02-line" },
  ],
  "divider",
  [{ command: "clear-format", label: "clearFormatting", icon: "icon-type-strikethrough-02-line" }],
];

export interface RichTextEditorBarProps {
  /** Figma Control-Bar/Select-Item Theme used by every item. */
  theme?: ControlBarSelectItemTheme;
  /** Commands shown as Selected (aria-pressed) — the formatting at the caret. */
  active?: Partial<Record<RichTextCommand, boolean>>;
  /** `true` disables the whole bar (Read-only field); a map disables single commands (e.g. undo with no history). */
  disabled?: boolean | Partial<Record<RichTextCommand, boolean>>;
  blockType?: RichTextBlockType;
  onBlockTypeChange?: (blockType: RichTextBlockType) => void;
  onCommand?: (command: RichTextCommand, trigger: HTMLButtonElement) => void;
  /** id of the editor the bar formats. */
  controls?: string;
  /** Accessible name of the toolbar. Default: the locale's "Formatting". */
  "aria-label"?: string;
  className?: string;
}

/**
 * Figma `.Primitives/Rich-Text/Editor-Bar`: Undo/Redo · Text style Select (Small) · Bold/Underline/Italic/Strikethrough ·
 * alignment · lists and indent · link/image/video · clear formatting, gap Spacing/Gap/2XSmall between blocks and
 * 3XSmall inside a block. Items keep the editor's selection (mouse-down does not steal focus); arrow keys move
 * between items (ARIA toolbar pattern).
 */
export function RichTextEditorBar({ theme = "subtle", active = {}, disabled, blockType = "p", onBlockTypeChange, onCommand, controls, "aria-label": ariaLabelProp, className }: RichTextEditorBarProps) {
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.formatting;
  // The block types of `richTextBlockTypes`, named in the locale.
  const blockTypeOptions: SelectFieldOption[] = [
    { label: t.richText.paragraph, value: "p" },
    { label: t.richText.heading1, value: "h1" },
    { label: t.richText.heading2, value: "h2" },
    { label: t.richText.heading3, value: "h3" },
  ];
  const barRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const allDisabled = disabled === true;
  const isDisabled = (command: RichTextCommand) => allDisabled || (typeof disabled === "object" && Boolean(disabled[command]));
  const focusables = () => [...(barRef.current?.querySelectorAll<HTMLButtonElement>(".zen-control-bar-item, .zen-select__trigger") ?? [])].filter((el) => !el.disabled);
  // Roving tabindex: one tab stop for the whole bar.
  useEffect(() => {
    const items = focusables();
    items.forEach((el, index) => { el.tabIndex = index === Math.min(focusIndex, items.length - 1) ? 0 : -1; });
  });
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest(".zen-popover")) return;
    const items = focusables();
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const next = event.key === "ArrowRight" ? (current + 1) % items.length
      : event.key === "ArrowLeft" ? (current - 1 + items.length) % items.length
      : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    setFocusIndex(next);
    items[next].focus();
  };
  return (
    <div ref={barRef} className={["zen-rich-text-editor-bar", className].filter(Boolean).join(" ")} role="toolbar" aria-label={ariaLabel} aria-controls={controls} onKeyDown={onKeyDown}
      onFocus={(event) => { const index = focusables().indexOf(event.target as unknown as HTMLButtonElement); if (index >= 0) setFocusIndex(index); }}>
      {editorBarLayout.map((block, index) => {
        if (block === "divider") return <span key={`divider-${index}`} className="zen-rich-text-editor-bar__divider" aria-hidden="true" />;
        if (block === "select") return (
          <SelectField key="select" className="zen-rich-text-editor-bar__select" size="small" aria-label={t.textStyle} popoverLabel={t.textStyle} options={blockTypeOptions}
            value={blockType} readOnly={allDisabled} onChange={(event) => onBlockTypeChange?.(event.target.value as RichTextBlockType)} />
        );
        return (
          <span key={`block-${index}`} className="zen-rich-text-editor-bar__group">
            {block.map((item) => (
              <ControlBarSelectItem
                key={item.command}
                // The ⌘K shortcut finds the link item by its command, not by its (translated) name.
                data-command={item.command}
                theme={theme}
                state={active[item.command] ? "selected" : "default"}
                icon={<Icon name={item.icon} decorative />}
                aria-label={t.richText[item.label]}
                title={t.richText[item.label]}
                aria-pressed={item.toggle ? Boolean(active[item.command]) : undefined}
                disabled={isDisabled(item.command)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => onCommand?.(item.command, event.currentTarget)}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
}

const richTextExec: Partial<Record<RichTextCommand, [string, string?]>> = {
  bold: ["bold"], underline: ["underline"], italic: ["italic"], strikethrough: ["strikeThrough"],
  "align-left": ["justifyLeft"], "align-center": ["justifyCenter"], "align-right": ["justifyRight"], "align-justify": ["justifyFull"],
  "bulleted-list": ["insertUnorderedList"], "numbered-list": ["insertOrderedList"], outdent: ["outdent"], indent: ["indent"],
};
const richTextStateQueries: [RichTextCommand, string][] = [
  ["bold", "bold"], ["underline", "underline"], ["italic", "italic"], ["strikethrough", "strikeThrough"],
  ["align-center", "justifyCenter"], ["align-right", "justifyRight"], ["align-justify", "justifyFull"],
  ["bulleted-list", "insertUnorderedList"], ["numbered-list", "insertOrderedList"],
];
const safeUrl = (raw: string) => {
  const url = raw.trim();
  if (!url) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`;
  return /^(https?:|mailto:)/i.test(withScheme) ? withScheme : null;
};
const escapeAttribute = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** A selection boundary as child indexes from the editor root plus an offset. The editor is normalised before a step is
 *  saved, so the indexes still match after the step's HTML is parsed back in. */
type RichTextPoint = { path: number[]; offset: number };
type RichTextSelection = { anchor: RichTextPoint; focus: RichTextPoint } | null;
/** One undo step of a RichTextField: its HTML and the selection to restore with it. */
type RichTextStep = { html: string; selection: RichTextSelection };
const richTextPoint = (root: Node, node: Node | null, offset: number): RichTextPoint | null => {
  if (!node || !root.contains(node)) return null;
  const path: number[] = [];
  for (let current = node; current !== root && current.parentNode; current = current.parentNode) path.unshift(Array.prototype.indexOf.call(current.parentNode.childNodes, current));
  return { path, offset };
};
const saveRichTextSelection = (root: Node): RichTextSelection => {
  const selection = document.getSelection();
  const anchor = selection?.rangeCount ? richTextPoint(root, selection.anchorNode, selection.anchorOffset) : null;
  const focus = selection?.rangeCount ? richTextPoint(root, selection.focusNode, selection.focusOffset) : null;
  return anchor && focus ? { anchor, focus } : null;
};
const richTextNodeAt = (root: Node, point: RichTextPoint): [Node, number] | null => {
  let node: Node = root;
  for (const index of point.path) {
    const child = node.childNodes[index];
    if (!child) return null;
    node = child;
  }
  return [node, Math.min(point.offset, node.nodeType === Node.TEXT_NODE ? (node as Text).length : node.childNodes.length)];
};
/** Put a saved selection back; without one (the first step), the caret goes to the end of the last text, or into the
 *  last empty paragraph (before its placeholder <br>). */
const restoreRichTextSelection = (root: Node, saved: RichTextSelection) => {
  const selection = document.getSelection();
  if (!selection) return;
  const anchor = saved ? richTextNodeAt(root, saved.anchor) : null;
  const focus = saved ? richTextNodeAt(root, saved.focus) : null;
  if (anchor && focus) { selection.setBaseAndExtent(anchor[0], anchor[1], focus[0], focus[1]); return; }
  let end: Node = root;
  while (end.lastChild && end.lastChild.nodeName !== "BR") end = end.lastChild;
  const offset = end.nodeType === Node.TEXT_NODE ? (end as Text).length : Math.max(0, end.childNodes.length - (end.lastChild?.nodeName === "BR" ? 1 : 0));
  selection.setBaseAndExtent(end, offset, end, offset);
};
/** An empty editor is "" before it is focused and one empty paragraph after: both are the same (empty) content. */
const sameRichTextHtml = (a: string, b: string) => a === b || (/^(<p><br><\/p>)?$/.test(a) && /^(<p><br><\/p>)?$/.test(b));
/** Typing of one kind (inserting or deleting characters) within this many ms of the last keystroke is one undo step. */
const RICH_TEXT_TYPING_STEP_MS = 1000;
const richTextTypingKind = (inputType: string | undefined) => (inputType === "insertText" ? "insert" : /^delete(Content|Word|SoftLine|HardLine)/.test(inputType ?? "") ? "delete" : null);

export type RichTextFieldProps = Omit<CommonFieldProps, "size" | "leading" | "trailing"> & {
  id?: string;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: TextAreaSize;
  /** HTML content (controlled). */
  value?: string;
  defaultValue?: string;
  /** Called with the editor HTML and its plain text on every edit. */
  onValueChange?: (html: string, text: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  /** Counted against `characterLimit={true}` (plain text length); not enforced. */
  maxLength?: number;
  /** Figma `Control-Bar` boolean: show the Editor-Bar above the field. */
  editorBar?: boolean;
  /** Control-Bar/Select-Item Theme of the bar. */
  editorBarTheme?: ControlBarSelectItemTheme;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
};

type RichTextInsert = "link" | "image" | "video";
/** Insert dialog copy: title and action are the toolbar item's name in the locale; the URL placeholders are examples. */
const insertCopy: Record<RichTextInsert, { label: "insertLink" | "insertImage" | "insertVideo"; placeholder: string }> = {
  link: { label: "insertLink", placeholder: "https://example.com" },
  image: { label: "insertImage", placeholder: "https://…/image.png" },
  video: { label: "insertVideo", placeholder: "https://…/video.mp4" },
};

/**
 * Figma `Input/Richtext` (6385:17480): the Editor-Bar (Control-Bar, optional) above a Text-Area field, gap Spacing/Gap/XSmall.
 * The field is a content-editable editor inside the regular Input shell, so hover/focus/Read-only/error states match
 * Text-Area. Output is HTML via `onValueChange(html, text)`. Undo / Redo (the Editor-Bar, ⌘Z, ⇧⌘Z, Ctrl+Y) step
 * through this field's own history and are disabled while there is nothing to undo or redo; a new `value` from
 * outside (clearing the field after it was posted) starts a new history.
 */
export const RichTextField = forwardRef<HTMLDivElement, RichTextFieldProps>(function RichTextField(
  { id: providedId, label, labelOptional, labelTooltip, labelAction, helpText, helpTheme, helpIcon, characterLimit, error: errorProp, errorMessage, size: sizeProp = "md", state, className, value, defaultValue, onValueChange, placeholder, readOnly = false, required, maxLength, editorBar = true, editorBarTheme = "subtle", onFocus, onBlur },
  ref,
) {
  const error = errorProp ?? errorMessage;
  const t = useZenLabels();
  const size = scaleKey(sizeProp, inputSizes);
  const generatedId = useId();
  const id = providedId ?? `zen-rich-text-${generatedId.replace(/:/g, "")}`;
  const messageId = `${id}-message`;
  const editorRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => editorRef.current as HTMLDivElement);
  const savedRange = useRef<Range | null>(null);
  const [text, setText] = useState("");
  const [active, setActive] = useState<Partial<Record<RichTextCommand, boolean>>>({});
  const [blockType, setBlockType] = useState<RichTextBlockType>("p");
  const [insert, setInsert] = useState<{ kind: RichTextInsert; anchor: HTMLButtonElement } | null>(null);
  const [insertUrl, setInsertUrl] = useState("");
  const anchorRef = useRef<HTMLElement | null>(null);
  const resolvedState = readOnly ? "read-only" : state;
  const isReadOnly = readOnly || normalizeInputState(state, error) === "read-only";
  // This field's own undo history. The browser's undo stack (execCommand "undo") is shared by every field on the page,
  // so the Editor-Bar's Undo could undo typing in another field, and it cannot tell whether this field has anything to
  // undo. `before` is the selection just before the edit being recorded: undo puts the caret back there.
  const history = useRef<{ steps: RichTextStep[]; index: number; typing: string | null; at: number; before: RichTextSelection; marked: boolean }>({ steps: [], index: -1, typing: null, at: 0, before: null, marked: false });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // execCommand fires input events of its own; the command records one step when it is done.
  const executing = useRef(false);

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    // execCommand copies computed styles onto inline tags when it moves content between blocks
    // (color: inherit, letter-spacing…). Keep semantic tags only; blocks keep their text-align.
    el.querySelectorAll<HTMLElement>("[style]").forEach((node) => {
      const align = /^(p|div|h[1-6]|li|ul|ol|blockquote)$/i.test(node.tagName) ? node.style.textAlign : "";
      node.removeAttribute("style");
      if (align) node.style.textAlign = align;
    });
    el.querySelectorAll("span:not([class])").forEach((span) => span.replaceWith(...span.childNodes));
    // Lists made from a paragraph end up nested in it (<p><ul>…</ul></p>), which is invalid HTML.
    el.querySelectorAll("p").forEach((paragraph) => { if (paragraph.querySelector(":scope > ul, :scope > ol")) paragraph.replaceWith(...paragraph.childNodes); });
    const nextText = el.textContent ?? "";
    setText(nextText);
    onValueChange?.(el.innerHTML, nextText);
  };
  const syncHistory = () => {
    const h = history.current;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.steps.length - 1);
  };
  /** Start a new history at the current content (first render, or a `value` set from outside). */
  const resetHistory = () => {
    const el = editorRef.current;
    if (!el) return;
    el.normalize();
    history.current = { steps: [{ html: el.innerHTML, selection: null }], index: 0, typing: null, at: 0, before: null, marked: false };
    syncHistory();
  };
  /** Remember the selection just before an edit (typing: every keystroke; a command: its first execCommand). */
  const markBefore = () => {
    const el = editorRef.current;
    if (!el) return;
    history.current.before = saveRichTextSelection(el);
    history.current.marked = true;
  };
  /** Record the content as a new step, or grow the current step while the same kind of typing goes on. */
  const record = (typing: string | null) => {
    const el = editorRef.current;
    const h = history.current;
    if (!el || h.index < 0) return;
    el.normalize();
    const html = el.innerHTML;
    if (!sameRichTextHtml(html, h.steps[h.index].html)) {
      const now = Date.now();
      const step = { html, selection: saveRichTextSelection(el) };
      if (typing && typing === h.typing && now - h.at < RICH_TEXT_TYPING_STEP_MS && h.index > 0 && h.index === h.steps.length - 1) {
        h.steps[h.index] = step;
      } else {
        if (h.before) h.steps[h.index] = { ...h.steps[h.index], selection: h.before };
        h.steps = [...h.steps.slice(0, h.index + 1), step];
        h.index = h.steps.length - 1;
      }
      h.typing = typing;
      h.at = now;
      syncHistory();
    }
    h.before = null;
    h.marked = false;
  };
  /** Undo (-1) or redo (+1): put that step's content and selection back and report it. */
  const travel = (delta: -1 | 1) => {
    const el = editorRef.current;
    const h = history.current;
    const target = h.index + delta;
    if (!el || isReadOnly || target < 0 || target >= h.steps.length) return;
    h.index = target;
    h.typing = null;
    // Back to empty: keep the paragraph a focused editor starts with, so typing goes on in a block.
    el.innerHTML = h.steps[target].html || "<p><br></p>";
    el.focus({ preventScroll: true });
    restoreRichTextSelection(el, h.steps[target].selection);
    emit();
    refreshActive();
    syncHistory();
  };
  // Initial content, and controlled updates that did not come from typing (keeps the caret stable); both start a new
  // history, like setting a textarea's value.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value ?? (el.dataset.initialised ? undefined : defaultValue ?? "");
    el.dataset.initialised = "true";
    if (next !== undefined && next !== el.innerHTML) { el.innerHTML = next; setText(el.textContent ?? ""); resetHistory(); }
    else if (history.current.index < 0) resetHistory();
  }, [value, defaultValue]);
  // The browser's Edit menu, context menu and shake-to-undo arrive as historyUndo / historyRedo: use this field's history.
  // Every other edit marks the selection it starts from.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return undefined;
    const handleBeforeInput = (event: InputEvent) => {
      if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
        event.preventDefault();
        travel(event.inputType === "historyUndo" ? -1 : 1);
        return;
      }
      if (!event.isComposing) markBefore();
    };
    el.addEventListener("beforeinput", handleBeforeInput);
    return () => el.removeEventListener("beforeinput", handleBeforeInput);
  });

  const selectionInEditor = () => {
    const selection = document.getSelection();
    const el = editorRef.current;
    return selection && selection.rangeCount && el && el.contains(selection.anchorNode) ? selection : null;
  };
  const refreshActive = () => {
    const selection = selectionInEditor();
    if (!selection) return;
    savedRange.current = selection.getRangeAt(0).cloneRange();
    const next: Partial<Record<RichTextCommand, boolean>> = {};
    for (const [command, query] of richTextStateQueries) { try { next[command] = document.queryCommandState(query); } catch { next[command] = false; } }
    next["align-left"] = !next["align-center"] && !next["align-right"] && !next["align-justify"];
    const anchorElement = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
    next.link = Boolean(anchorElement?.closest("a") && editorRef.current?.contains(anchorElement.closest("a")));
    setActive(next);
    const block = (document.queryCommandValue("formatBlock") || "p").toLowerCase().replace(/[<>]/g, "");
    setBlockType((["h1", "h2", "h3"].includes(block) ? block : "p") as RichTextBlockType);
  };
  useEffect(() => {
    document.addEventListener("selectionchange", refreshActive);
    return () => document.removeEventListener("selectionchange", refreshActive);
  });

  const restoreSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    // Read the saved range before focusing: focus runs refreshActive, which would overwrite it with the caret.
    const range = savedRange.current;
    el.focus();
    if (range && el.contains(range.startContainer)) { const selection = document.getSelection(); selection?.removeAllRanges(); selection?.addRange(range); }
  };
  const exec = (command: string, argument?: string) => {
    restoreSelection();
    if (!history.current.marked) markBefore();
    executing.current = true;
    try {
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand("defaultParagraphSeparator", false, "p");
      document.execCommand(command, false, argument);
    } finally {
      executing.current = false;
    }
    emit();
    refreshActive();
  };
  const runCommand = (command: RichTextCommand, trigger: HTMLButtonElement) => {
    if (isReadOnly) return;
    if (command === "undo" || command === "redo") { travel(command === "undo" ? -1 : 1); return; }
    if (command === "link" || command === "image" || command === "video") {
      const selection = selectionInEditor();
      if (selection) savedRange.current = selection.getRangeAt(0).cloneRange();
      const existing = command === "link" ? (selection?.anchorNode instanceof Element ? selection.anchorNode : selection?.anchorNode?.parentElement)?.closest("a") : null;
      anchorRef.current = trigger;
      setInsertUrl(existing?.getAttribute("href") ?? "");
      setInsert((current) => (current?.kind === command ? null : { kind: command, anchor: trigger }));
      return;
    }
    if (command === "clear-format") {
      exec("removeFormat");
      exec("unlink");
      // Headings in the selection become paragraphs (formatBlock would wrap lists into <p>).
      const range = savedRange.current;
      editorRef.current?.querySelectorAll("h1, h2, h3").forEach((heading) => {
        if (range && !range.intersectsNode(heading)) return;
        const paragraph = document.createElement("p");
        paragraph.append(...heading.childNodes);
        heading.replaceWith(paragraph);
      });
      emit();
      record(null);
      return;
    }
    const mapped = richTextExec[command];
    if (mapped) { exec(mapped[0], mapped[1]); record(null); }
  };
  const confirmInsert = () => {
    if (!insert) return;
    const url = safeUrl(insertUrl);
    const kind = insert.kind;
    setInsert(null);
    if (!url) { restoreSelection(); return; }
    if (kind === "link") {
      const collapsed = !savedRange.current || savedRange.current.collapsed;
      if (collapsed) exec("insertHTML", `<a href="${escapeAttribute(url)}">${escapeAttribute(url)}</a>`);
      else exec("createLink", url);
      editorRef.current?.querySelectorAll("a[href]").forEach((a) => { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); });
      emit();
    }
    if (kind === "image") exec("insertHTML", `<img src="${escapeAttribute(url)}" alt="" />`);
    if (kind === "video") exec("insertHTML", `<video src="${escapeAttribute(url)}" controls></video><p><br></p>`);
    record(null);
  };

  const count = characterLimit === true ? (maxLength !== undefined ? `${text.length}/${maxLength}` : String(text.length)) : characterLimit;
  const message = error ?? helpText ?? count;
  const empty = text.length === 0 && !editorRef.current?.querySelector("img, video, li");
  const copy = insert ? { title: t.richText[insertCopy[insert.kind].label], action: t.richText[insertCopy[insert.kind].label], placeholder: insertCopy[insert.kind].placeholder } : null;

  return (
    <div className={["zen-rich-text-field", className].filter(Boolean).join(" ")} data-size={size}>
      {/* The label names the whole composition, so it sits above the Editor-Bar (Figma's Text-Area has Label=false). */}
      <FieldLabel id={id} label={label} required={required} optional={labelOptional} tooltip={labelTooltip} action={labelAction} />
      {editorBar ? (
        <span className="zen-rich-text-field__bar">
          <RichTextEditorBar
            theme={editorBarTheme}
            active={active}
            disabled={isReadOnly || { undo: !canUndo, redo: !canRedo }}
            blockType={blockType}
            onBlockTypeChange={(next) => { setBlockType(next); exec("formatBlock", `<${next}>`); record(null); }}
            onCommand={runCommand}
            controls={id}
            aria-label={typeof label === "string" ? t.formattingOf(label) : t.formatting}
          />
          <Popover
            className="zen-rich-text-field__insert"
            open={Boolean(insert)}
            anchorRef={anchorRef}
            label={copy?.title}
            onOpenChange={(open) => { if (!open) { setInsert(null); } }}
            onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); setInsert(null); restoreSelection(); } }}
          >
            {insert ? (
              // Not a <form>: the field often sits inside the app's own Form, and forms cannot nest. Enter confirms here and
              // never reaches the outer form (no implicit submit).
              <div className="zen-rich-text-field__insert-form" role="group" aria-label={copy!.title}
                onKeyDown={(event) => { if (event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT") { event.preventDefault(); if (safeUrl(insertUrl)) confirmInsert(); } }}>
                <InputField size="small" aria-label={copy!.title} placeholder={copy!.placeholder} value={insertUrl} onChange={(event) => setInsertUrl(event.target.value)} autoFocus inputMode="url" />
                <span className="zen-rich-text-field__insert-actions">
                  <Button type="button" appearance="main" level="tertiary" size="sm" onClick={() => { setInsert(null); restoreSelection(); }}>{t.cancel}</Button>
                  <Button type="button" appearance="main" level="primary" size="sm" disabled={!safeUrl(insertUrl)} onClick={confirmInsert}>{copy!.action}</Button>
                </span>
              </div>
            ) : null}
          </Popover>
        </span>
      ) : null}
      <FieldShell id={id} messageId={messageId} error={error} helpText={helpText} helpTheme={helpTheme} helpIcon={helpIcon} characterLimit={count} size={size} state={resolvedState}>
        <div
          ref={editorRef}
          id={id}
          className={`zen-input__native zen-rich-text__editor ${typographyStyles["Body/Base/Medium"]}`}
          contentEditable={!isReadOnly}
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-readonly={isReadOnly || undefined}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-labelledby={label ? `${id}-label` : undefined}
          aria-label={label ? undefined : placeholder}
          aria-describedby={message ? messageId : undefined}
          aria-placeholder={placeholder}
          data-placeholder={placeholder}
          data-empty={empty ? "true" : "false"}
          tabIndex={isReadOnly ? 0 : undefined}
          onInput={(event) => {
            emit();
            const input = event.nativeEvent as InputEvent;
            if (!executing.current && !input.isComposing) record(richTextTypingKind(input.inputType));
          }}
          onCompositionEnd={() => record(null)}
          onKeyUp={refreshActive}
          onMouseUp={() => { history.current.typing = null; refreshActive(); }}
          onFocus={(event) => {
            document.execCommand("defaultParagraphSeparator", false, "p");
            // Start every document inside a paragraph so the first line is a block like the ones after it.
            const el = event.currentTarget;
            if (!isReadOnly && !el.firstChild) {
              el.innerHTML = "<p><br></p>";
              const range = document.createRange();
              range.setStart(el.firstChild!, 0);
              range.collapse(true);
              document.getSelection()?.removeAllRanges();
              document.getSelection()?.addRange(range);
            }
            refreshActive();
            onFocus?.(event);
          }}
          onBlur={onBlur}
          onKeyDown={(event) => {
            // Moving the caret ends a typing step: the next keystroke starts a new one.
            if (/^(Arrow|Home$|End$|Page)/.test(event.key)) history.current.typing = null;
            const mod = event.metaKey || event.ctrlKey;
            if (!mod || isReadOnly) return;
            const key = event.key.toLowerCase();
            if (key === "z" || (key === "y" && event.ctrlKey && !event.metaKey)) { event.preventDefault(); travel(key === "z" && !event.shiftKey ? -1 : 1); return; }
            if (key === "k") { event.preventDefault(); const trigger = event.currentTarget.closest(".zen-rich-text-field")?.querySelector<HTMLButtonElement>('.zen-rich-text-field__bar [data-command="link"]'); if (trigger) runCommand("link", trigger); }
            if (key === "s" && event.shiftKey) { event.preventDefault(); exec("strikeThrough"); record(null); }
          }}
          onPaste={(event) => {
            // Paste as plain text: keeps foreign styles and scripts out of the document. A paste is a step of its own.
            event.preventDefault();
            markBefore();
            executing.current = true;
            try {
              document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
            } finally {
              executing.current = false;
            }
            emit();
            record(null);
          }}
        />
      </FieldShell>
    </div>
  );
});

type HeadingFieldBaseProps = {
  /** Heading/1–3 text style. */
  headingSize?: HeadingInputSize;
  /**
   * `false` (default): one line, for short names (a board, a file, a section); a long heading scrolls inside the field.
   * `true`: long headings wrap and the field grows with them (Figma Status=Inputted-Multi-Line), for document,
   * announcement or task titles. It renders a `<textarea>`: Enter never adds a line break (handle it in `onKeyDown`,
   * e.g. to move on) and pasted line breaks become spaces.
   */
  multiline?: boolean;
  /** Called with the text on every change, in both variants. */
  onValueChange?: (value: string) => void;
  /** Deterministic Figma Status for matrices; native hover/focus still apply. */
  status?: "default" | "hover" | "focus" | "typing" | "inputted-single-line" | "inputted-multi-line" | "inputted-hover";
};
type HeadingFieldInputAttributes = Omit<InputHTMLAttributes<HTMLInputElement>, "size">;
type HeadingFieldTextareaAttributes = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows" | "cols" | "wrap">;
/** Single-line props take `<input>` attributes; `multiline` props take `<textarea>` attributes. */
export type HeadingFieldProps = HeadingFieldBaseProps & (
  | ({ multiline?: false } & HeadingFieldInputAttributes)
  | ({ multiline: true } & HeadingFieldTextareaAttributes)
);
/**
 * Figma Input/Heading (694:13062): an inline-editable heading (no field chrome). Heading/1–3 text, an 8px pad that
 * sits outside the text box (−8px), radius 12, and a Neutral/Subtle surface on hover/focus/typing. One line by
 * default; `multiline` wraps long headings and grows with them (Status=Inputted-Multi-Line).
 */
export const HeadingField = forwardRef<HTMLInputElement | HTMLTextAreaElement, HeadingFieldProps>(function HeadingField({ headingSize = "h3", multiline = false, onValueChange, status, className, placeholder: placeholderProp, ...attributes }, ref) {
  const t = useZenLabels();
  const placeholder = placeholderProp ?? t.heading;
  const style = headingSize === "h1" ? "Heading/1" : headingSize === "h2" ? "Heading/2" : "Heading/3";
  const nodeRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const setNode = useCallback((node: HTMLInputElement | HTMLTextAreaElement | null) => {
    nodeRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);
  // multiline: the one-row textarea grows to its wrapped text on every value, size and width change, and once the
  // web font has loaded (the line breaks move with the glyph widths).
  const fit = useCallback(() => {
    const node = nodeRef.current;
    if (!(node instanceof HTMLTextAreaElement)) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, []);
  useLayoutEffect(fit, [fit, multiline, headingSize, status, attributes.value]);
  useEffect(() => {
    const node = nodeRef.current;
    if (!multiline || !node) return;
    void document.fonts?.ready.then(fit);
    if (typeof ResizeObserver === "undefined") return;
    let width = node.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (node.offsetWidth === width) return;
      width = node.offsetWidth;
      fit();
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [multiline, fit]);
  const shared = { ref: setNode, placeholder, className: `zen-heading-field__native ${typographyStyles[style]}` };
  let field: ReactNode;
  if (multiline) {
    const { onChange, onKeyDown, onPaste, ...textareaProps } = attributes as HeadingFieldTextareaAttributes;
    field = (
      <textarea
        {...textareaProps}
        {...shared}
        rows={1}
        onChange={(event) => { onChange?.(event); onValueChange?.(event.target.value); fit(); }}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          // A heading is one paragraph: Enter never adds a line break (an IME keeps its own Enter).
          if (!event.defaultPrevented && event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
        }}
        onPaste={(event) => {
          onPaste?.(event);
          const text = event.clipboardData.getData("text/plain");
          if (event.defaultPrevented || !/[\r\n]/.test(text)) return;
          // Pasted line breaks become spaces, so the heading stays one paragraph.
          event.preventDefault();
          const clean = text.replace(/^[\r\n]+|[\r\n]+$/g, "").replace(/\s*[\r\n]+\s*/g, " ");
          if (!document.execCommand("insertText", false, clean)) {
            const node = event.currentTarget;
            node.setRangeText(clean, node.selectionStart, node.selectionEnd, "end");
            node.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }}
      />
    );
  } else {
    const { onChange, ...inputProps } = attributes as HeadingFieldInputAttributes;
    field = <input {...inputProps} {...shared} onChange={(event) => { onChange?.(event); onValueChange?.(event.target.value); }} />;
  }
  return (
    <div className={["zen-heading-field", className].filter(Boolean).join(" ")} data-size={headingSize} data-status={status}>
      {field}
    </div>
  );
});

export type InputConditionState = "default" | "success" | "wrong";
/** Figma Primitives/Input/Input-Conditions/Condition-Item: 16px icon (Element-Size/Popular/Small) + Body/Small/Regular,
 * gap 2XSmall. Default Content/Neutral/Base (minus), Success Positive/Light (check), Wrong Negative/Light (x-small). */
export function InputConditionItem({ label, state = "default" }: { label: ReactNode; state?: InputConditionState }) {
  return <li className="zen-input-condition" data-state={state}><Icon name={state === "success" ? "icon-check-line" : state === "wrong" ? "icon-x-small-line" : "icon-minus-line"} size="sm" decorative /><span className={`zen-input-condition__text ${typographyStyles["Body/Small/Regular"]}`}>{label}</span></li>;
}
/** Figma Input-Conditions: an Item-List slot stacking Condition-Items with gap XSmall. */
export function InputConditions({ children, state = "default" }: { children?: ReactNode; state?: "default" }) {
  return <ul className="zen-input-conditions" data-state={state}>{children}</ul>;
}

import { useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { scaleKey } from "../_shared/scale";
import { typographyStyles } from "../../tokens/typography.generated";
import "./toggle.css";

export const toggleSizes = ["small", "medium", "large"] as const;
/** Figma Toggle-Button State: Default, Default-Hover (`hover`) and Disabled. Toggle (with label) exposes Default and Disabled. */
export const toggleStates = ["default", "hover", "disabled"] as const;
export const toggleThemes = ["text-first", "toggle-first"] as const;
/** CSS / Figma key (the `data-size` value). */
type ToggleSizeKey = (typeof toggleSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type ToggleSize = "sm" | "md" | "lg" | "small" | "medium" | "large";
export type ToggleState = (typeof toggleStates)[number];
export type ToggleTheme = (typeof toggleThemes)[number];

export interface ToggleButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  /** On (true) or off (false) — controlled. */
  checked?: boolean;
  /** Initial state when uncontrolled. */
  defaultChecked?: boolean;
  /** Called with the new state when the switch is flipped. */
  onCheckedChange?: (checked: boolean) => void;
  /** @deprecated Use checked. */
  selected?: boolean;
  /** @deprecated Use defaultChecked. */
  defaultSelected?: boolean;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: ToggleSize;
  state?: ToggleState;
  /** @deprecated Use onCheckedChange (or read event.target.checked). */
  onSelectedChange?: (selected: boolean, event: ChangeEvent<HTMLInputElement>) => void;
}

export function ToggleButton({ checked, defaultChecked, onCheckedChange, selected, defaultSelected, size: sizeProp = "md", state = "default", disabled, className, onSelectedChange, onChange, ...inputProps }: ToggleButtonProps) {
  const size = scaleKey(sizeProp, toggleSizes);
  // `checked` / `defaultChecked` are the canonical names; `selected` / `defaultSelected` still work (the new name wins).
  const controlled = checked ?? selected;
  const [internalSelected, setInternalSelected] = useState(defaultChecked ?? defaultSelected ?? false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelected = controlled ?? internalSelected;
  const isDisabled = disabled || state === "disabled";
  return (
    <span
      className={["zen-toggle-button", className].filter(Boolean).join(" ")}
      data-size={size}
      data-selected={isSelected ? "true" : "false"}
      data-state={isDisabled ? "disabled" : state === "hover" ? "hover" : "default"}
      role="switch"
      aria-checked={isSelected}
      aria-disabled={isDisabled || undefined}
      aria-label={inputProps["aria-label"]}
      tabIndex={isDisabled ? -1 : 0}
      onClick={(event) => {
        if (isDisabled) return;
        // A click on the input itself comes from a surrounding <label> (or the forwarding below): keep focus on the
        // switch, so Space / Enter go on working after a click on the label text.
        if (event.target === inputRef.current) {
          if (document.activeElement !== event.currentTarget) event.currentTarget.focus({ preventScroll: true });
          return;
        }
        // The visible track is a Figma primitive, not the hidden input.
        // Forward pointer activation to the real input and suppress the
        // surrounding Toggle label's second implicit activation.
        event.preventDefault();
        inputRef.current?.click();
      }}
      onKeyDown={(event) => {
        if (isDisabled || (event.key !== " " && event.key !== "Enter")) return;
        event.preventDefault();
        inputRef.current?.click();
      }}
    >
      <span className="zen-toggle-button__track" aria-hidden="true">
        <span className="zen-toggle-button__dot" />
      </span>
      {/* The native checkbox only carries name/value for forms and fires the change event; the span above is the
          switch that takes focus and is announced. `hidden` takes the checkbox out of focus and the accessibility
          tree (tabIndex -1 alone does not: the switch had nested interactive content). A hidden checkbox still
          submits with its form and still toggles on .click() and from a surrounding <label>. */}
      <input
        ref={inputRef}
        {...inputProps}
        type="checkbox"
        checked={isSelected}
        disabled={isDisabled}
        tabIndex={-1}
        aria-hidden="true"
        hidden
        onChange={(event) => {
          if (controlled === undefined) setInternalSelected(event.target.checked);
          onChange?.(event);
          onCheckedChange?.(event.target.checked);
          onSelectedChange?.(event.target.checked, event);
        }}
      />
    </span>
  );
}

export interface ToggleProps extends ToggleButtonProps {
  label: ReactNode;
  caption?: ReactNode;
  bold?: boolean;
  theme?: ToggleTheme;
}

export function Toggle({ label, caption, bold = false, theme = "text-first", size: sizeProp = "sm", state = "default", disabled, className, ...props }: ToggleProps) {
  const size = scaleKey(sizeProp, toggleSizes);
  const isDisabled = disabled || state === "disabled";
  const control = <ToggleButton {...props} size={size} state={state} disabled={disabled} aria-label={typeof label === "string" ? label : props["aria-label"]} />;
  const content = (
    <span className="zen-toggle__content">
      <span className={`${bold ? typographyStyles["Body/Base/Bold"] : typographyStyles["Body/Base/Regular"]} zen-toggle__label`}>{label}</span>
      {caption ? <span className={`${typographyStyles["Body/Small/Regular"]} zen-toggle__caption`}>{caption}</span> : null}
    </span>
  );
  return (
    <label className={["zen-toggle", className].filter(Boolean).join(" ")} data-size={size} data-state={isDisabled ? "disabled" : "default"} data-tone={theme}>
      {theme === "text-first" ? content : control}
      {theme === "text-first" ? control : content}
    </label>
  );
}

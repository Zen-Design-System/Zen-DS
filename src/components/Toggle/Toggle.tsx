import { useRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { typographyStyles } from "../../tokens/typography.generated";
import "./toggle.css";

export const toggleSizes = ["small", "medium", "large"] as const;
/** Figma Toggle-Button State: Default, Default-Hover (`hover`) and Disabled. Toggle (with label) exposes Default and Disabled. */
export const toggleStates = ["default", "hover", "disabled"] as const;
export const toggleThemes = ["text-first", "toggle-first"] as const;
export type ToggleSize = (typeof toggleSizes)[number];
export type ToggleState = (typeof toggleStates)[number];
export type ToggleTheme = (typeof toggleThemes)[number];

export interface ToggleButtonProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "type"> {
  selected?: boolean;
  defaultSelected?: boolean;
  size?: ToggleSize;
  state?: ToggleState;
  onSelectedChange?: (selected: boolean, event: ChangeEvent<HTMLInputElement>) => void;
}

export function ToggleButton({ selected, defaultSelected = false, size = "medium", state = "default", disabled, className, onSelectedChange, onChange, ...inputProps }: ToggleButtonProps) {
  const [internalSelected, setInternalSelected] = useState(defaultSelected);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSelected = selected ?? internalSelected;
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
        // The visible track is a Figma primitive, not the 1px clipped input.
        // Forward pointer activation to the real input and suppress the
        // surrounding Toggle label's second implicit activation.
        if (isDisabled || event.target === inputRef.current) return;
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
      <input
        ref={inputRef}
        {...inputProps}
        type="checkbox"
        checked={isSelected}
        disabled={isDisabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          if (selected === undefined) setInternalSelected(event.target.checked);
          onChange?.(event);
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

export function Toggle({ label, caption, bold = false, theme = "text-first", size = "small", state = "default", disabled, className, ...props }: ToggleProps) {
  const isDisabled = disabled || state === "disabled";
  const control = <ToggleButton {...props} size={size} state={state} disabled={disabled} aria-label={typeof label === "string" ? label : props["aria-label"]} />;
  const content = (
    <span className="zen-toggle__content">
      <span className={`${bold ? typographyStyles["Body/Base/Bold"] : typographyStyles["Body/Base/Regular"]} zen-toggle__label`}>{label}</span>
      {caption ? <span className={`${typographyStyles["Caption/Regular"]} zen-toggle__caption`}>{caption}</span> : null}
    </span>
  );
  return (
    <label className={["zen-toggle", className].filter(Boolean).join(" ")} data-size={size} data-state={isDisabled ? "disabled" : "default"} data-theme={theme}>
      {theme === "text-first" ? content : control}
      {theme === "text-first" ? control : content}
    </label>
  );
}

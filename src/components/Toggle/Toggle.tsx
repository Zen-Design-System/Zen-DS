import { useRef, type ChangeEvent, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { useControllableState } from "../_shared/use-controllable-state";
import { scaleKey } from "../_shared/scale";
import { renderIcon } from "../_shared/icon";
import type { IconName } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./toggle.css";

export const toggleSizes = ["small", "medium", "large", "xlarge"] as const;
/** Figma Toggle-Button State: Default, Default-Hover (`hover`) and Disabled. Toggle (with label) exposes Default and Disabled. */
export const toggleStates = ["default", "hover", "disabled"] as const;
export const toggleThemes = ["text-first", "toggle-first"] as const;
/** CSS / Figma key (the `data-size` value). */
type ToggleSizeKey = (typeof toggleSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type ToggleSize = "sm" | "md" | "lg" | "xl" | "small" | "medium" | "large" | "xlarge";
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
  /** Short (sm, md…) or Figma (small, medium…) spelling. XLarge (`xl`) is the 48px switch with an icon in its dot. */
  size?: ToggleSize;
  /** XLarge only (Figma Icon + Icon-Src): an icon in the dot, an icon name (`"icon-moon-01-line"`) or a node. It takes
   *  Toggle/Dot/Content/Unselected (Light) while off and /Selected (Strongest) while on; smaller dots have no room for
   *  it and leave it out. */
  icon?: IconName | ReactNode;
  state?: ToggleState;
  /** @deprecated Use onCheckedChange (or read event.target.checked). */
  onSelectedChange?: (selected: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  /** The element with role="switch" (the one that takes focus); the native checkbox inside only carries the form value. */
  ref?: Ref<HTMLSpanElement>;
}

export function ToggleButton({ checked, defaultChecked, onCheckedChange, selected, defaultSelected, size: sizeProp = "md", icon, state = "default", disabled, className, onSelectedChange, onChange, "aria-labelledby": labelledBy, "aria-describedby": describedBy, ref, ...inputProps }: ToggleButtonProps) {
  const size = scaleKey(sizeProp, toggleSizes);
  // `checked` / `defaultChecked` are the canonical names; `selected` / `defaultSelected` still work (the new name wins).
  const [isSelected, setSelected] = useControllableState({ value: checked ?? selected, defaultValue: defaultChecked ?? defaultSelected ?? false, onChange: onCheckedChange, name: "ToggleButton checked" });
  const inputRef = useRef<HTMLInputElement>(null);
  const isDisabled = disabled || state === "disabled";
  return (
    <span
      ref={ref}
      className={["zen-toggle-button", className].filter(Boolean).join(" ")}
      data-size={size}
      data-selected={isSelected ? "true" : "false"}
      data-state={isDisabled ? "disabled" : state === "hover" ? "hover" : "default"}
      role="switch"
      aria-checked={isSelected}
      aria-disabled={isDisabled || undefined}
      aria-label={inputProps["aria-label"]}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
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
        <span className="zen-toggle-button__dot">{size === "xlarge" && icon ? renderIcon(icon) : null}</span>
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
          onChange?.(event);
          setSelected(event.target.checked);
          onSelectedChange?.(event.target.checked, event);
        }}
      />
    </span>
  );
}

export interface ToggleProps extends ToggleButtonProps {
  label: ReactNode;
  /** Toggle (1526:5703) Content Subtext: short help under the label (Caption/Regular 11/16, Content/Neutral/Light). */
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
      {caption ? <span className={`${typographyStyles["Caption/Regular"]} zen-toggle__caption`}>{caption}</span> : null}
    </span>
  );
  return (
    <label className={["zen-toggle", className].filter(Boolean).join(" ")} data-size={size} data-state={isDisabled ? "disabled" : "default"} data-tone={theme}>
      {theme === "text-first" ? content : control}
      {theme === "text-first" ? control : content}
    </label>
  );
}

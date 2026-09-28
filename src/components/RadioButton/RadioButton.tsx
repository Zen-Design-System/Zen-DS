import { type ChangeEvent, type ReactNode } from "react";
import { Icon } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./radio-button.css";
import "../Icon/core";

export const radioStates = ["default", "hover", "focus", "disabled"] as const;
export type RadioState = (typeof radioStates)[number];
export type RadioSide = "left" | "right";

export interface RadioButtonProps {
  checked?: boolean;
  defaultChecked?: boolean;
  /** Called with the new checked state. */
  onCheckedChange?: (checked: boolean) => void;
  /** @deprecated Use onCheckedChange (or read event.target.checked). */
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  /** Name for a mark-only radio (no visible label). When set without `label`, no placeholder text renders. */
  "aria-label"?: string;
  caption?: ReactNode;
  bold?: boolean;
  radioSide?: RadioSide;
  state?: RadioState;
  disabled?: boolean;
  name?: string;
  value?: string;
  className?: string;
}

export function RadioButton({ checked, defaultChecked = false, onCheckedChange, onChange, label: labelProp, "aria-label": ariaLabel, caption, bold = false, radioSide = "left", state = "default", disabled = false, name, value, className }: RadioButtonProps) {
  // "Content label" stays English on purpose: Figma's demo placeholder, shown only when neither label nor aria-label is set.
  const label = labelProp ?? (ariaLabel ? undefined : "Content label");
  // Uncontrolled radios stay native (defaultChecked) so a group sharing `name` keeps exactly one
  // selection when arrow keys or clicks move it; visuals follow `:checked` in CSS.
  const isChecked = checked ?? defaultChecked;
  const isDisabled = disabled || state === "disabled";
  return (
    <label className={["zen-radio-button", className].filter(Boolean).join(" ")} data-side={radioSide} data-state={isDisabled ? "disabled" : state} data-checked={checked === undefined ? undefined : isChecked ? "true" : "false"}>
      {radioSide === "left" ? <RadioMark /> : null}
      {label !== undefined || caption ? <span className="zen-radio-button__content">
        {label !== undefined ? <span className={`zen-radio-button__label ${typographyStyles[bold ? "Body/Base/Bold" : "Body/Base/Regular"]}`}>{label}</span> : null}
        {caption ? <span className={`zen-radio-button__caption ${typographyStyles["Body/Small/Regular"]}`}>{caption}</span> : null}
      </span> : null}
      {radioSide === "right" ? <RadioMark /> : null}
      <input type="radio" name={name} value={value} {...(checked === undefined ? { defaultChecked } : { checked })} disabled={isDisabled} onChange={(event) => { onCheckedChange?.(event.target.checked); onChange?.(event.target.checked, event); }} aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)} />
    </label>
  );
}

function RadioMark() {
  return <span className="zen-radio-button__mark" aria-hidden="true"><span className="zen-radio-button__ring"><Icon name="icon-circle-small-solid" size="2xs" decorative /></span></span>;
}

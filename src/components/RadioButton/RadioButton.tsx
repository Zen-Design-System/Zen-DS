import { type ChangeEvent, type ReactNode } from "react";
import { Icon } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./radio-button.css";

export const radioStates = ["default", "hover", "focus", "disabled"] as const;
export type RadioState = (typeof radioStates)[number];
export type RadioSide = "left" | "right";

export interface RadioButtonProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  caption?: ReactNode;
  bold?: boolean;
  radioSide?: RadioSide;
  state?: RadioState;
  disabled?: boolean;
  name?: string;
  value?: string;
  className?: string;
}

export function RadioButton({ checked, defaultChecked = false, onChange, label = "Content label", caption, bold = false, radioSide = "left", state = "default", disabled = false, name, value, className }: RadioButtonProps) {
  // Uncontrolled radios stay native (defaultChecked) so a group sharing `name` keeps exactly one
  // selection when arrow keys or clicks move it; visuals follow `:checked` in CSS.
  const isChecked = checked ?? defaultChecked;
  const isDisabled = disabled || state === "disabled";
  return (
    <label className={["zen-radio-button", className].filter(Boolean).join(" ")} data-side={radioSide} data-state={isDisabled ? "disabled" : state} data-checked={checked === undefined ? undefined : isChecked ? "true" : "false"}>
      {radioSide === "left" ? <RadioMark /> : null}
      <span className="zen-radio-button__content">
        <span className={`zen-radio-button__label ${typographyStyles[bold ? "Body/Base/Bold" : "Body/Base/Regular"]}`}>{label}</span>
        {caption ? <span className={`zen-radio-button__caption ${typographyStyles["Caption/Regular"]}`}>{caption}</span> : null}
      </span>
      {radioSide === "right" ? <RadioMark /> : null}
      <input type="radio" name={name} value={value} {...(checked === undefined ? { defaultChecked } : { checked })} disabled={isDisabled} onChange={(event) => onChange?.(event.target.checked, event)} aria-label={typeof label === "string" ? label : undefined} />
    </label>
  );
}

function RadioMark() {
  return <span className="zen-radio-button__mark" aria-hidden="true"><span className="zen-radio-button__ring"><Icon name="icon-circle-small-solid" size="2xs" decorative /></span></span>;
}

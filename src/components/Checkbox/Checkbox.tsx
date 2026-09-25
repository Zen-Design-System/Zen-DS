import { useState, type ChangeEvent, type ReactNode } from "react";
import { Icon } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./checkbox.css";

export const checkboxStates = ["default", "hover", "focus", "disabled"] as const;
export type CheckboxState = (typeof checkboxStates)[number];
export type CheckboxSide = "left" | "right";

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  caption?: ReactNode;
  bold?: boolean;
  checkSide?: CheckboxSide;
  state?: CheckboxState;
  disabled?: boolean;
  name?: string;
  value?: string;
  className?: string;
}

export function Checkbox({ checked, defaultChecked = false, indeterminate = false, onChange, label = "Content label", caption, bold = false, checkSide = "left", state = "default", disabled = false, name, value, className }: CheckboxProps) {
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = checked ?? internalChecked;
  const isDisabled = disabled || state === "disabled";
  return (
    <label className={["zen-checkbox", className].filter(Boolean).join(" ")} data-side={checkSide} data-state={isDisabled ? "disabled" : state} data-checked={isChecked ? "true" : "false"} data-indeterminate={indeterminate ? "true" : "false"}>
      {/* Figma Checkbox/Text: Container row (mark + Content), then Caption full-width below it. */}
      <span className="zen-checkbox__row">
        {checkSide === "left" ? <CheckboxMark checked={isChecked} indeterminate={indeterminate} /> : null}
        <span className="zen-checkbox__content">
          <span className={`zen-checkbox__label ${typographyStyles[bold ? "Body/Base/Bold" : "Body/Base/Regular"]}`}>{label}</span>
        </span>
        {checkSide === "right" ? <CheckboxMark checked={isChecked} indeterminate={indeterminate} /> : null}
      </span>
      {caption ? <span className={`zen-checkbox__caption ${typographyStyles["Caption/Regular"]}`}>{caption}</span> : null}
      <input
        type="checkbox"
        name={name}
        value={value}
        checked={isChecked}
        disabled={isDisabled}
        onChange={(event) => { if (checked === undefined) setInternalChecked(event.target.checked); onChange?.(event.target.checked, event); }}
        aria-label={typeof label === "string" ? label : undefined}
      />
    </label>
  );
}

function CheckboxMark({ checked, indeterminate }: { checked: boolean; indeterminate: boolean }) {
  return <span className="zen-checkbox__mark" aria-hidden="true"><span className="zen-checkbox__box">{checked ? <Icon name={indeterminate ? "icon-minus-line" : "icon-check-line"} size="xs" decorative /> : null}</span></span>;
}

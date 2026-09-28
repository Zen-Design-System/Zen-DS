import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { Icon } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./checkbox.css";
import "../Icon/core";

export const checkboxStates = ["default", "hover", "focus", "disabled"] as const;
export type CheckboxState = (typeof checkboxStates)[number];
export type CheckboxSide = "left" | "right";

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  /** Called with the new checked state. */
  onCheckedChange?: (checked: boolean) => void;
  /** @deprecated Use onCheckedChange (or read event.target.checked). */
  onChange?: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void;
  label?: ReactNode;
  /** Name for a mark-only checkbox (no visible label, e.g. inside a List-Item or Table row). When set without `label`,
   *  no text renders — the Figma placeholder "Content label" only fills an unnamed demo. */
  "aria-label"?: string;
  /** .Primitives/Checkbox/Content Subtext: short help under the label (Caption/Regular 11/16, Content/Neutral/Light). */
  caption?: ReactNode;
  /** .Primitives/Checkbox/Content Bold=Yes (Body/Base/Bold). */
  bold?: boolean;
  checkSide?: CheckboxSide;
  state?: CheckboxState;
  disabled?: boolean;
  name?: string;
  value?: string;
  className?: string;
}

export function Checkbox({ checked, defaultChecked = false, indeterminate = false, onCheckedChange, onChange, label: labelProp, "aria-label": ariaLabel, caption, bold = false, checkSide = "left", state = "default", disabled = false, name, value, className }: CheckboxProps) {
  // "Content label" stays English on purpose: Figma's demo placeholder, shown only when neither label nor aria-label is set.
  const label = labelProp ?? (ariaLabel ? undefined : "Content label");
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const isChecked = checked ?? internalChecked;
  const isDisabled = disabled || state === "disabled";
  // Indeterminate ("some selected") shows the minus mark whatever `checked` is, and is exposed as aria-checked="mixed"
  // through the native property (it has no HTML attribute).
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (inputRef.current) inputRef.current.indeterminate = indeterminate; }, [indeterminate]);
  return (
    <label className={["zen-checkbox", className].filter(Boolean).join(" ")} data-side={checkSide} data-state={isDisabled ? "disabled" : state} data-checked={isChecked || indeterminate ? "true" : "false"} data-indeterminate={indeterminate ? "true" : "false"}>
      {/* Figma Checkbox/Text (309:46871): Container row = Check-Wrapper (2px block padding) + Content (fill).
          Content is .Primitives/Checkbox/Content (309:46789): Label (Body/Base Regular|Bold) and, when on, the Subtext
          (Caption/Regular, Content/Neutral/Light) directly under it — gap 3XSmall, aligned with the label, not the mark. */}
      <span className="zen-checkbox__row">
        {checkSide === "left" ? <CheckboxMark checked={isChecked} indeterminate={indeterminate} /> : null}
        {label !== undefined || caption ? <span className="zen-checkbox__content">
          {label !== undefined ? <span className={`zen-checkbox__label ${typographyStyles[bold ? "Body/Base/Bold" : "Body/Base/Regular"]}`}>{label}</span> : null}
          {caption ? <span className={`zen-checkbox__caption ${typographyStyles["Caption/Regular"]}`}>{caption}</span> : null}
        </span> : null}
        {checkSide === "right" ? <CheckboxMark checked={isChecked} indeterminate={indeterminate} /> : null}
      </span>
      <input
        ref={inputRef}
        type="checkbox"
        name={name}
        value={value}
        checked={isChecked}
        disabled={isDisabled}
        onChange={(event) => { if (checked === undefined) setInternalChecked(event.target.checked); onCheckedChange?.(event.target.checked); onChange?.(event.target.checked, event); }}
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
      />
    </label>
  );
}

function CheckboxMark({ checked, indeterminate }: { checked: boolean; indeterminate: boolean }) {
  return <span className="zen-checkbox__mark" aria-hidden="true"><span className="zen-checkbox__box">{checked || indeterminate ? <Icon name={indeterminate ? "icon-minus-line" : "icon-check-line"} size="xs" decorative /> : null}</span></span>;
}

export interface CheckboxMarkProps {
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Figma Checkbox/Mark on its own (16px, State=Default): the visual control for rows that own the
 * interaction themselves, e.g. multi-select Popover items. Decorative — the row carries the state. */
export function CheckboxMarkIndicator({ checked = false, indeterminate = false, disabled = false, className }: CheckboxMarkProps) {
  return (
    <span className={["zen-checkbox-mark", className].filter(Boolean).join(" ")} data-checked={checked || indeterminate ? "true" : "false"} data-disabled={disabled ? "true" : undefined} aria-hidden="true">
      <span className="zen-checkbox__box">{checked || indeterminate ? <Icon name={indeterminate ? "icon-minus-line" : "icon-check-line"} size="xs" decorative /> : null}</span>
    </span>
  );
}

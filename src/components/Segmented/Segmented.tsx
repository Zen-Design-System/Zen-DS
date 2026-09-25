import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { typographyStyles } from "../../tokens/typography.generated";
import { BadgeCounter } from "../Badge";
import "./segmented.css";

export const segmentedLevels = ["primary", "secondary"] as const;
// The Figma component set only contains Small and Medium.  Keep the public
// axis in lockstep with that set so consumers cannot render a non-design
// variant (the old XSmall branch was a platform-only invention).
export const segmentedSizes = ["small", "medium"] as const;
export const segmentedStates = ["default", "hover", "focused", "disabled"] as const;
export type SegmentedLevel = (typeof segmentedLevels)[number];
export type SegmentedSize = (typeof segmentedSizes)[number];
export type SegmentedState = (typeof segmentedStates)[number];

export type SegmentedOption = {
  id: string;
  label: ReactNode;
  leading?: ReactNode;
  badge?: ReactNode;
  state?: SegmentedState;
  disabled?: boolean;
};

export interface SegmentedProps {
  options?: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  level?: SegmentedLevel;
  size?: SegmentedSize;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function Segmented({ options, value, defaultValue, onChange, level = "primary", size = "medium", children, className, disabled = false, "aria-label": ariaLabel = "Segmented control" }: SegmentedProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? options?.[0]?.id);
  const selectedValue = value ?? internalValue;
  const select = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
  };
  return (
    <div className={["zen-segmented", className].filter(Boolean).join(" ")} data-level={level} data-size={size} role="group" aria-label={ariaLabel}>
      {options ? options.map((option) => <SegmentedItem key={option.id} level={level} selected={selectedValue === option.id} disabled={disabled || option.disabled || option.state === "disabled"} leading={option.leading} badge={option.badge} state={disabled ? "disabled" : option.state} size={size} onClick={() => select(option.id)}>{option.label}</SegmentedItem>) : children}
    </div>
  );
}

export interface SegmentedItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  leading?: ReactNode;
  /** Figma Badge slot = Badge-Counter XSmall. A number/string renders the counter; pass a node to supply your own. */
  badge?: ReactNode;
  /** Level of the parent Segmented; selects the counter colour when this item is selected. */
  level?: SegmentedLevel;
  size?: SegmentedSize;
  state?: SegmentedState;
}

export function SegmentedItem({ selected = false, leading, badge, level = "primary", size = "medium", state = "default", className, children, ...props }: SegmentedItemProps) {
  const resolvedState = props.disabled || state === "disabled" ? "disabled" : state;
  // Figma: unselected → Neutral/Subtle; selected Primary → Inverse/Solid; selected Secondary → Neutral/Solid.
  const counter = typeof badge === "number" || typeof badge === "string"
    ? <BadgeCounter size="xsmall" value={badge} theme={selected && level === "primary" ? "inverse" : "neutral"} background={selected ? "solid" : "subtle"} />
    : badge;
  return (
    <button {...props} disabled={resolvedState === "disabled" || props.disabled} type="button" className={["zen-segmented__item", className].filter(Boolean).join(" ")} data-selected={selected ? "true" : "false"} data-size={size} data-state={resolvedState} aria-pressed={selected}>
      {leading ? <span className="zen-segmented__leading">{leading}</span> : null}
      {children !== undefined && children !== null ? <span className={`zen-segmented__label ${typographyStyles[size === "small" ? "Body/Small/Bold" : "Body/Base/Bold"]}`}>{children}</span> : null}
      {counter !== undefined && counter !== null && counter !== false ? <span className="zen-segmented__badge">{counter}</span> : null}
    </button>
  );
}

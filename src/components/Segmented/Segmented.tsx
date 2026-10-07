import { useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { typographyStyles } from "../../tokens/typography.generated";
import { BadgeCounter } from "../Badge";
import type { IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { useIconTooltip } from "../Tooltip";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import "./segmented.css";

export const segmentedLevels = ["primary", "secondary"] as const;
// The Figma component set only contains Small and Medium.  Keep the public
// axis in lockstep with that set so consumers cannot render a non-design
// variant (the old XSmall branch was a platform-only invention).
export const segmentedSizes = ["small", "medium"] as const;
export const segmentedStates = ["default", "hover", "focused", "disabled"] as const;
export type SegmentedLevel = (typeof segmentedLevels)[number];
/** CSS / Figma key (the `data-size` value). */
type SegmentedSizeKey = (typeof segmentedSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type SegmentedSize = "sm" | "md" | "small" | "medium";
export type SegmentedState = (typeof segmentedStates)[number];

export type SegmentedOption = {
  id: string;
  label: ReactNode;
  /** Leading icon: an icon name (`"icon-grid-01-line"`) or a node. */
  leading?: IconName | ReactNode;
  badge?: ReactNode;
  state?: SegmentedState;
  disabled?: boolean;
  /** Accessible name — required when `label` is empty or an icon only (Figma Label=false segments). It is also the
   *  name tooltip such a segment shows after a 1s hover, at once on keyboard focus (like IconButton). */
  "aria-label"?: string;
};

export interface SegmentedProps {
  options?: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  /** Called with the selected option's id. */
  onValueChange?: (value: string) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (value: string) => void;
  /** Secondary (default) is the common case; Primary adds emphasis. */
  level?: SegmentedLevel;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: SegmentedSize;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  /** Stretch to the container and split it into equal items (mobile control bars, sheets, narrow panels). */
  fullWidth?: boolean;
  /** Names the group (default "Segmented control", from the locale's labels). */
  "aria-label"?: string;
}

/**
 * Figma Segmented (1238:892) of `Primitives/Segmented/Item` (1204:11690): a Neutral/Subtle pill track (Spacing/Padding/
 * 2XSmall) of toggle segments, Secondary (default) or Primary, Small or Medium. An icon-only segment (Item Label=false:
 * `label: null` + `aria-label`) names itself with the shared icon tooltip, the Zen rule for icon-only actions.
 */
export function Segmented({ options, value, defaultValue, onValueChange, onChange, level = "secondary", size: sizeProp = "md", children, className, disabled = false, fullWidth = false, "aria-label": ariaLabelProp }: SegmentedProps) {
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.segmentedControl;
  const size = scaleKey(sizeProp, segmentedSizes);
  const [internalValue, setInternalValue] = useState(defaultValue ?? options?.[0]?.id);
  const selectedValue = value ?? internalValue;
  const select = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onValueChange?.(next);
    onChange?.(next);
  };
  const groupRef = useRef<HTMLDivElement>(null);
  const shownRef = useRef<Element | null>(null);
  // A Segmented wider than its container scrolls sideways (segmented.css). When the selection changes (or on mount),
  // bring the selected segment into view inside the group only; scrollIntoView would scroll the page as well.
  useLayoutEffect(() => {
    const group = groupRef.current;
    const item = group?.querySelector('.zen-segmented__item[data-selected="true"]');
    if (!group || !item || item === shownRef.current) return;
    shownRef.current = item;
    if (group.scrollWidth <= group.clientWidth) return;
    const box = group.getBoundingClientRect();
    const rect = item.getBoundingClientRect();
    // Rects are in screen pixels; scrollLeft and the padding are in the group's own CSS pixels. They differ under a scaled
    // ancestor (a device preview's transform), where the segment would stop short of the edge, so convert.
    const scale = box.width / group.offsetWidth || 1;
    const inset = (parseFloat(getComputedStyle(group).paddingInlineStart) || 0) * scale;
    if (rect.left < box.left + inset) group.scrollLeft -= (box.left + inset - rect.left) / scale;
    else if (rect.right > box.right - inset) group.scrollLeft += (rect.right - (box.right - inset)) / scale;
  });
  return (
    <div ref={groupRef} className={["zen-segmented", className].filter(Boolean).join(" ")} data-level={level} data-size={size} data-full-width={fullWidth ? "true" : undefined} role="group" aria-label={ariaLabel}>
      {options ? options.map((option) => <SegmentedItem key={option.id} level={level} selected={selectedValue === option.id} disabled={disabled || option.disabled || option.state === "disabled"} leading={option.leading} badge={option.badge} state={disabled ? "disabled" : option.state} size={size} aria-label={option["aria-label"]} onClick={() => select(option.id)}>{option.label}</SegmentedItem>) : children}
    </div>
  );
}

export interface SegmentedItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  /** Leading icon: an icon name (`"icon-grid-01-line"`) or a node. */
  leading?: IconName | ReactNode;
  /** Figma Badge slot = Badge-Counter XSmall. A number/string renders the counter; pass a node to supply your own. */
  badge?: ReactNode;
  /** Level of the parent Segmented; selects the counter colour when this item is selected. */
  level?: SegmentedLevel;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: SegmentedSize;
  state?: SegmentedState;
}

/** One `Primitives/Segmented/Item` (1204:11690). Without a visible label, its `aria-label` shows as the 1s name tooltip. */
export function SegmentedItem({ selected = false, leading, badge, level = "secondary", size: sizeProp = "md", state = "default", className, children, ...props }: SegmentedItemProps) {
  const size = scaleKey(sizeProp, segmentedSizes);
  // Icon-only segment (Figma Label=false): its name shows as a tooltip after 1s of hover and at once on keyboard focus.
  const noLabel = children === undefined || children === null || children === false || children === "";
  const iconOnly = noLabel && Boolean(props["aria-label"]);
  const tip = useIconTooltip(iconOnly ? props["aria-label"] : false);
  const resolvedState = props.disabled || state === "disabled" ? "disabled" : state;
  // Figma: unselected → Neutral/Subtle; selected Primary → Inverse/Solid; selected Secondary → Neutral/Solid.
  const counter = typeof badge === "number" || typeof badge === "string"
    ? <BadgeCounter size="xsmall" value={badge} theme={selected && level === "primary" ? "inverse" : "neutral"} background={selected ? "solid" : "subtle"} />
    : badge;
  return (
    <button {...tip.bind({ ...props })} disabled={resolvedState === "disabled" || props.disabled} type="button" className={["zen-segmented__item", className].filter(Boolean).join(" ")} data-selected={selected ? "true" : "false"} data-size={size} data-state={resolvedState} aria-pressed={selected}>
      {leading ? <span className="zen-segmented__leading">{renderIcon(leading)}</span> : null}
      {/* An empty label ("" as well as null) renders no label box, so an icon-only segment centres its icon. */}
      {!noLabel ? <span className={`zen-segmented__label ${typographyStyles[size === "small" ? "Body/Small/Bold" : "Body/Base/Bold"]}`}>{children}</span> : null}
      {counter !== undefined && counter !== null && counter !== false ? <span className="zen-segmented__badge">{counter}</span> : null}
      {tip.tooltip}
    </button>
  );
}

import { useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode, type Ref } from "react";
import { typographyStyles } from "../../tokens/typography.generated";
import { BadgeCounter } from "../Badge";
import { ChipGroup } from "../ChipGroup";
import type { IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { useIconTooltip } from "../Tooltip";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import "./segmented.css";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useControllableState } from "../_shared/use-controllable-state";
import { useMergedRefs } from "../_shared/merge-refs";
import { dataAttributes } from "../_shared/data-attributes";
import { usePhoneSheet } from "../_shared/phone-sheet";

// Black-Overlay and White-Overlay: the control on a colour band or photo, in static tokens (as Button's overlay levels).
export const segmentedLevels = ["primary", "secondary", "black-overlay", "white-overlay"] as const;
// The Figma component set only contains Small and Medium.  Keep the public
// axis in lockstep with that set so consumers cannot render a non-design
// variant (the old XSmall branch was a platform-only invention).
export const segmentedSizes = ["small", "medium"] as const;
export const segmentedStates = ["default", "hover", "focused", "disabled"] as const;
/** A Figma level, or `"overlay"`: the default overlay, Black-Overlay. */
export type SegmentedLevel = (typeof segmentedLevels)[number] | "overlay";
/** `"overlay"` is the default overlay level, Black-Overlay. */
const resolveLevel = (level: SegmentedLevel) => (level === "overlay" ? "black-overlay" : level);
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
  /** Ref to the root `role="group"` element. */
  ref?: Ref<HTMLDivElement>;
  options?: SegmentedOption[];
  value?: string;
  defaultValue?: string;
  /** Called with the selected option's id. */
  onValueChange?: (value: string) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (value: string) => void;
  /** Secondary (default) is the common case; Primary (the same filled track, an Inverse solid selected segment) adds emphasis.
   *  On a colour band or photo: `black-overlay` (or `"overlay"`, the default overlay: a Black-Overlay track, light text)
   *  or `white-overlay` (on a solid colour: a White-Overlay track, dark text); both select with a White/Solid segment
   *  and look the same in light and dark mode. */
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
  /** Figma instance overrides: props of the segments it draws, by layer (`{ "Item[week]": { level: "primary" }, "Item[week]/Badge-Counter": { theme: "accent" } }`). Written by Zen Studio;
   *  app code sets the options. */
  overrides?: NestedOverrides;
}

/**
 * Figma Segmented (1238:892) of `Primitives/Segmented/Item` (1204:11690): a pill track (Spacing/Padding/3XSmall) of toggle
 * segments (Segmented/Size/Small or Medium) on a Neutral/Subtle track; Secondary (default) selects with Neutral/Solid,
 * Primary with Inverse/Solid (its outlined track became filled in the live file, 2026-10-18). Black-Overlay and White-Overlay put it on a colour band or photo
 * in static tokens that do not switch with the mode (as Button's overlay levels): a Background/Black-Overlay or
 * White-Overlay track, with light text on Black-Overlay (Content/On-Black-Overlay) and dark text on White-Overlay
 * (Content/On-White-Overlay/Light at rest, Strongest hovered, focused or selected: Figma 2026-10-20), a
 * Background/White/Solid selected segment with
 * On-White-Overlay text and a Border/Overlay/Solid focus ring. An icon-only segment (Item Label=false:
 * `label: null` + `aria-label`) names itself with the shared icon tooltip, the Zen rule for icon-only actions.
 *
 * On a phone a Segmented is used only when every label fits its equal share (segmented guideline; the user 2026-10-24,
 * option A): when its labels are cut or it would slide sideways there, it shows as a single-choice row of Normal chips
 * (ChipGroup, Medium, the picked one Primary) that scrolls sideways, with the same options, value and onValueChange, and
 * comes back once its segments fit again. Desktop never switches; nor do segments drawn as children, icon-only
 * segments or segments with a counter. A phone is the nearest `data-breakpoint`, else ZenProvider's (as the phone sheets).
 */
export function Segmented({ ref, options, value, defaultValue, onValueChange, onChange, level: levelProp = "secondary", size: sizeProp = "md", children, className, disabled = false, fullWidth = false, "aria-label": ariaLabelProp, overrides, ...rest }: SegmentedProps) {
  const nest = useNested(overrides);
  const t = useZenLabels();
  const level = resolveLevel(levelProp);
  const ariaLabel = ariaLabelProp ?? t.segmentedControl;
  const size = scaleKey(sizeProp, segmentedSizes);
  const [selectedValue, select] = useControllableState<string | undefined>({
    value,
    defaultValue: () => defaultValue ?? options?.[0]?.id,
    onChange: (next) => { if (next === undefined) return; onValueChange?.(next); onChange?.(next); },
    name: "Segmented value",
  });
  const groupRef = useRef<HTMLDivElement>(null);
  const rootRef = useMergedRefs(ref, groupRef);
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
  // Phone: chips while the segments do not fit (see above). `needed` is the width the segments take side by side, read
  // while they show, so the chips know when there is room for them again.
  const phone = usePhoneSheet(groupRef, false);
  const chipable = Boolean(options?.length) && options!.every((option) => option.badge === undefined && option.label !== null && option.label !== undefined && option.label !== false && option.label !== "");
  const [chips, setChips] = useState(false);
  const neededRef = useRef(0);
  // A box that hugs its content (a floating layer, a toolbar in a column that does not stretch) is as wide as what it
  // shows: the chip row can reach `needed` while the segments, back in the same box, are cut again. That flip-flop ran
  // until React stopped it (Maximum update depth, dnd campaign DND-03, 2026-10-26). The chips' width at which the
  // segments came back and were cut at once is kept: they try again only once the chips have more room than that.
  const returnedAtRef = useRef(0);
  const blockedAtRef = useRef(0);
  useLayoutEffect(() => {
    const root = groupRef.current;
    if (!phone || !chipable) { if (chips) setChips(false); return undefined; }
    if (!root) return undefined;
    const measure = () => {
      const el = groupRef.current;
      if (!el) return;
      if (el.classList.contains("zen-chip-group")) {
        if (neededRef.current && el.clientWidth >= neededRef.current && el.clientWidth > blockedAtRef.current) {
          returnedAtRef.current = el.clientWidth;
          setChips(false);
        }
        return;
      }
      const items = [...el.children].filter((child): child is HTMLElement => child instanceof HTMLElement && child.classList.contains("zen-segmented__item"));
      const labelOf = (item: HTMLElement) => item.querySelector<HTMLElement>(".zen-segmented__label");
      const cut = items.some((item) => { const label = labelOf(item); return Boolean(label) && label!.scrollWidth > label!.clientWidth + 1; });
      if (!cut && el.scrollWidth <= el.clientWidth + 1) { returnedAtRef.current = 0; blockedAtRef.current = 0; return; }
      if (returnedAtRef.current) blockedAtRef.current = returnedAtRef.current;
      returnedAtRef.current = 0;
      const style = getComputedStyle(el);
      // Each segment's own width, its label uncut. Full width shares the row equally, so every segment needs the widest one's.
      const widths = items.map((item) => { const label = labelOf(item); return item.offsetWidth + (label ? Math.max(0, label.scrollWidth - label.clientWidth) : 0); });
      neededRef.current = (fullWidth ? Math.max(0, ...widths) * widths.length : widths.reduce((sum, width) => sum + width, 0))
        + (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      setChips(true);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(root);
    // Labels widen once the web fonts load (the first read can see a narrower fallback) without the track resizing:
    // read again then (train C's gate, 2026-10-25: segments a phone cuts stayed segments).
    const fonts = typeof document === "undefined" ? undefined : document.fonts;
    let alive = true;
    fonts?.ready.then(() => { if (alive) measure(); });
    fonts?.addEventListener?.("loadingdone", measure);
    return () => { alive = false; observer?.disconnect(); fonts?.removeEventListener?.("loadingdone", measure); };
  }, [phone, chipable, chips, options, fullWidth]);
  if (chips && options) {
    return (
      <ChipGroup {...dataAttributes(rest)} ref={rootRef} className={["zen-segmented-chips", className].filter(Boolean).join(" ")} size="md" level="primary" aria-label={ariaLabel}
        options={options.map((option) => ({ value: option.id, label: option.label, leading: option.leading, disabled: disabled || option.disabled || option.state === "disabled" }))}
        value={selectedValue ?? null} onValueChange={select} />
    );
  }
  return (
    <div {...dataAttributes(rest)} ref={rootRef} className={["zen-segmented", className].filter(Boolean).join(" ")} data-level={level} data-size={size} data-full-width={fullWidth ? "true" : undefined} role="group" aria-label={ariaLabel}>
      {options ? options.map((option) => nest("Item", <SegmentedItem key={option.id} level={levelProp} selected={selectedValue === option.id} disabled={disabled || option.disabled || option.state === "disabled"} leading={option.leading} badge={option.badge} state={disabled ? "disabled" : option.state} size={size} aria-label={option["aria-label"]} onClick={() => select(option.id)}>{option.label}</SegmentedItem>, option.id)) : nest.slot(children)}
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
export function SegmentedItem({ selected = false, leading, badge, level: levelProp = "secondary", size: sizeProp = "md", state = "default", className, children, ...props }: SegmentedItemProps) {
  const nest = useNested();
  const size = scaleKey(sizeProp, segmentedSizes);
  // Icon-only segment (Figma Label=false): its name shows as a tooltip after 1s of hover and at once on keyboard focus.
  const noLabel = children === undefined || children === null || children === false || children === "";
  const iconOnly = noLabel && Boolean(props["aria-label"]);
  const tip = useIconTooltip(iconOnly ? props["aria-label"] : false);
  const resolvedState = props.disabled || state === "disabled" ? "disabled" : state;
  // Figma: unselected → Neutral/Subtle; selected Primary → Inverse/Solid; selected Secondary → Neutral/Solid. Overlays:
  // unselected → On-Color (White/Solid); selected → Neutral/Solid, pinned to Black/Solid in segmented.css for dark mode.
  const level = resolveLevel(levelProp);
  const counterTheme = level.endsWith("overlay") && !selected ? "on-color" : selected && level === "primary" ? "inverse" : "neutral";
  const counter = typeof badge === "number" || typeof badge === "string"
    ? nest("Badge-Counter", <BadgeCounter size="xsmall" value={badge} theme={counterTheme} background={selected ? "solid" : "subtle"} />)
    : badge;
  return (
    <button {...tip.bind({ ...props })} disabled={resolvedState === "disabled" || props.disabled} type="button" className={["zen-segmented__item", className].filter(Boolean).join(" ")} data-selected={selected ? "true" : "false"} data-size={size} data-state={resolvedState} aria-pressed={selected}>
      {leading ? <span className="zen-segmented__leading">{nest("Leading", renderIcon(leading))}</span> : null}
      {/* An empty label ("" as well as null) renders no label box, so an icon-only segment centres its icon. */}
      {!noLabel ? <span className={`zen-segmented__label ${typographyStyles[size === "small" ? "Body/Small/Bold" : "Body/Base/Bold"]}`}>{children}</span> : null}
      {counter !== undefined && counter !== null && counter !== false ? <span className="zen-segmented__badge">{counter}</span> : null}
      {tip.tooltip}
    </button>
  );
}

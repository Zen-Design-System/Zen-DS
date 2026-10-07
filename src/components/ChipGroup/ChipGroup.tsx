import { useRef, useState, type HTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { Chip, type ChipLevel, type ChipSize } from "../Chip";
import type { IconName } from "../Icon";
import "./chip-group.css";

export interface ChipGroupOption {
  /** What `value` / `onValueChange` carry for this chip. */
  value: string;
  /** The chip's text. */
  label: ReactNode;
  /** Icon name or element before the label (Chip Theme=Leading-Icon). */
  leading?: IconName | ReactNode;
  /** This chip cannot be picked; arrow keys skip it. */
  disabled?: boolean;
}

/** Standard HTML attributes (`id`, `data-*`, `style`…) go to the root `<div role="radiogroup">`. */
export interface ChipGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
  /** The chips, in order. */
  options: ChipGroupOption[];
  /** Controlled picked value (null: none picked yet). */
  value?: string | null;
  /** Initial picked value when uncontrolled. */
  defaultValue?: string | null;
  /** Called with the picked chip's value (a press, or an arrow key moving the choice). */
  onValueChange?: (value: string) => void;
  /** Names the group when no visible label does (or pass `aria-labelledby`). */
  "aria-label"?: string;
  /** Chip size (short or long spelling). Default sm. */
  size?: ChipSize;
  /** Chip level. Default primary. */
  level?: ChipLevel;
  /** Every chip does nothing. */
  disabled?: boolean;
  className?: string;
}

/**
 * Single choice among a few Normal chips (Chip/Normal, Select=Yes on the picked one): one picked at a time, as radio
 * buttons. Composed from the Figma Chip with its own tokens — no Figma master of its own yet (backlog batch 6, user
 * 2026-10-07). APG Radio Group: the group is one Tab stop (the picked chip, else the first one); ← / → / ↑ / ↓ move the
 * choice and focus to the next enabled chip, wrapping; Space picks the focused chip. For several picks at once, use
 * Normal chips as toggles (`selected` + onClick) instead.
 */
export function ChipGroup({ ref, options, value: valueProp, defaultValue = null, onValueChange, size = "sm", level = "primary", disabled = false, className, ...rest }: ChipGroupProps) {
  const [inner, setInner] = useState<string | null>(defaultValue);
  const value = valueProp !== undefined ? valueProp : inner;
  const chips = useRef(new Map<string, HTMLButtonElement>());
  const enabled = options.filter((option) => !disabled && !option.disabled);
  const tabStop = enabled.find((option) => option.value === value)?.value ?? enabled[0]?.value;
  const pick = (next: string) => {
    if (valueProp === undefined) setInner(next);
    if (next !== value) onValueChange?.(next);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: string) => {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (event.key === " ") { event.preventDefault(); pick(current); return; }
    if (!step || !enabled.length) return;
    event.preventDefault();
    // Right-to-left rows step the other way on the horizontal arrows.
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl" && (event.key === "ArrowRight" || event.key === "ArrowLeft");
    const at = enabled.findIndex((option) => option.value === current);
    const next = enabled[(at + (rtl ? -step : step) + enabled.length) % enabled.length];
    pick(next.value);
    chips.current.get(next.value)?.focus();
  };
  return (
    <div {...rest} ref={ref} role="radiogroup" aria-disabled={disabled || undefined} className={["zen-chip-group", className].filter(Boolean).join(" ")}>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <Chip
            key={option.value}
            ref={(node) => { if (node) chips.current.set(option.value, node); else chips.current.delete(option.value); }}
            variant="normal"
            size={size}
            level={level}
            leading={option.leading}
            role="radio"
            aria-checked={checked}
            selected={checked}
            disabled={disabled || option.disabled}
            tabIndex={option.value === tabStop ? 0 : -1}
            onClick={() => pick(option.value)}
            onKeyDown={(event) => onKeyDown(event, option.value)}
          >
            {option.label}
          </Chip>
        );
      })}
    </div>
  );
}

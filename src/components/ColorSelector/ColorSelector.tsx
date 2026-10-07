import { useId, type CSSProperties } from "react";
import { Icon } from "../Icon";
import { useZenLabels } from "../_shared/zen-context";
import "./color-selector.css";
import "../Icon/core";

export interface ColorOption {
  /** Any CSS colour — prefer a token, e.g. "var(--zen-color-background-support-blue-solid)". */
  value: string;
  /** Accessible name, e.g. "Blue". */
  label: string;
  /** Force the check colour when automatic contrast is wrong (light swatches need "dark"). */
  contrast?: "light" | "dark";
}

export interface ColorSelectorProps {
  colors: ColorOption[];
  value?: string;
  /** Called with the chosen colour's `value`. */
  onValueChange?: (value: string) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (value: string) => void;
  /** Names the group (default "Colour", from the locale's labels). */
  "aria-label"?: string;
  name?: string;
  className?: string;
}

/**
 * Figma Color-Selector (373:97252): 32px round swatches (Corner-Radius/Rounded, padding XSmall, 1px inside
 * Border/Neutral/Subtle/Hover so light colours stay visible). Select=Yes shows a 16px check; Hover draws a 2px
 * Focus/Neutral/Solid ring (40px); keyboard focus shows the 48px Neutral/Flat/Hover halo. One radio per swatch.
 */
export function ColorSelector({ colors, value, onValueChange, onChange, "aria-label": ariaLabelProp, name, className }: ColorSelectorProps) {
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.colour;
  const autoName = useId();
  return (
    <div className={["zen-color-selector", className].filter(Boolean).join(" ")} role="radiogroup" aria-label={ariaLabel}>
      {colors.map((color) => {
        const selected = value === color.value;
        return (
          <label key={color.value} className="zen-color-swatch" data-selected={selected ? "true" : undefined} data-contrast={color.contrast ?? "light"} style={{ "--zen-swatch": color.value } as CSSProperties} title={color.label}>
            <input type="radio" name={name ?? autoName} value={color.value} checked={selected} aria-label={color.label} onChange={() => { onValueChange?.(color.value); onChange?.(color.value); }} />
            <span className="zen-color-swatch__fill" aria-hidden="true">{selected ? <Icon name="icon-check-line" decorative /> : null}</span>
          </label>
        );
      })}
    </div>
  );
}

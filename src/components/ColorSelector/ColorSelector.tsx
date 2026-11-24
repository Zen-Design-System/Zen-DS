import { useId, type CSSProperties, type Ref } from "react";
import { Icon } from "../Icon";
import { useZenLabels } from "../_shared/zen-context";
import { colorSelectorLabel, colorSwatchModel, type ColorOption } from "./model";
import "./color-selector.css";
import "../Icon/core";
import { dataAttributes } from "../_shared/data-attributes";

export type { ColorOption } from "./model";

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
  /** The root element (role="radiogroup"). */
  ref?: Ref<HTMLDivElement>;
}

/**
 * Figma Color-Selector (373:97252): 32px round swatches (Corner-Radius/Rounded, padding XSmall, 1px inside
 * Border/Neutral/Subtle/Hover so light colours stay visible). Select=Yes shows a 16px check; Hover draws a 2px
 * Focus/Neutral/Solid ring (40px); keyboard focus shows the 48px Neutral/Flat/Hover halo. One radio per swatch.
 */
export function ColorSelector({ colors, value, onValueChange, onChange, "aria-label": ariaLabelProp, name, className, ref, ...rest }: ColorSelectorProps) {
  const t = useZenLabels();
  const autoName = useId();
  return (
    <div {...dataAttributes(rest)} ref={ref} className={["zen-color-selector", className].filter(Boolean).join(" ")} role="radiogroup" aria-label={colorSelectorLabel(t, ariaLabelProp)}>
      {colors.map((color) => {
        const swatch = colorSwatchModel(color, value);
        return (
          <label key={color.value} className="zen-color-swatch" data-selected={swatch.selected ? "true" : undefined} data-contrast={swatch.contrast} style={swatch.style as CSSProperties} title={color.label}>
            <input type="radio" name={name ?? autoName} value={color.value} checked={swatch.selected} aria-label={color.label} onChange={() => { onValueChange?.(color.value); onChange?.(color.value); }} />
            <span className="zen-color-swatch__fill" aria-hidden="true">{swatch.selected ? <Icon name="icon-check-line" decorative /> : null}</span>
          </label>
        );
      })}
    </div>
  );
}

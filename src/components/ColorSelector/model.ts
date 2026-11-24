import type { ZenLabels } from "../_shared/labels";

/*
 * ColorSelector's framework-free part (the web core, src/core): the swatch option, the group's name and what each
 * swatch renders for the selected value. React's ColorSelector and the Vue port both draw from it
 * (tools/code-languages/vue-parity.mjs).
 */

export interface ColorOption {
  /** Any CSS colour — prefer a token, e.g. "var(--zen-color-background-support-blue-solid)". */
  value: string;
  /** Accessible name, e.g. "Blue". */
  label: string;
  /** Force the check colour when automatic contrast is wrong (light swatches need "dark"). */
  contrast?: "light" | "dark";
}

/** The radiogroup's accessible name: `aria-label`, else the locale's "Colour". */
export const colorSelectorLabel = (labels: ZenLabels, ariaLabel: string | undefined) => ariaLabel ?? labels.colour;

/** One swatch: selected when its value is the group's value (shows the check); the check is light unless `contrast` says dark. */
export function colorSwatchModel(color: ColorOption, value: string | undefined): {
  selected: boolean;
  contrast: "light" | "dark";
  style: { "--zen-swatch": string };
} {
  return { selected: value === color.value, contrast: color.contrast ?? "light", style: { "--zen-swatch": color.value } };
}

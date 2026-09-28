import "./divider.css";

export const dividerColors = ["default", "medium", "high"] as const;
export type DividerColor = (typeof dividerColors)[number];
export type DividerOrientation = "horizontal" | "vertical";

export interface DividerProps {
  /** Figma Color: Default → Border/Neutral/Pale · Medium → Subtle · High → Solid. */
  color?: DividerColor;
  orientation?: DividerOrientation;
  /** Dashed line; a Default dashed line steps up to Border/Neutral/Subtle (Pale is too faint when dashed). */
  dashed?: boolean;
  /** Purely visual: hidden from assistive tech (e.g. between toolbar groups that are already labelled). */
  decorative?: boolean;
  className?: string;
}

/**
 * Figma Divider (460:38361): a 1px INSIDE stroke line. Default (Pale) is the everyday rule; Medium (Subtle) and
 * High (Solid) add emphasis only when the design calls for it.
 */
export function Divider({ color = "default", orientation = "horizontal", dashed = false, decorative = false, className }: DividerProps) {
  const props = {
    className: ["zen-divider", className].filter(Boolean).join(" "),
    "data-color": color,
    "data-orientation": orientation,
    "data-dashed": dashed ? "true" : undefined,
  };
  if (decorative) return <div {...props} aria-hidden="true" />;
  return orientation === "vertical" ? <div {...props} role="separator" aria-orientation="vertical" /> : <hr {...props} />;
}

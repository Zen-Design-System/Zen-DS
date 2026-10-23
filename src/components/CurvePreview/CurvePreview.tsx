import type { CSSProperties, Ref } from "react";
import { useZenLabels } from "../_shared/zen-context";
import { curveProgress, type CurveType } from "./curve";
import "./curve-preview.css";
import { dataAttributes } from "../_shared/data-attributes";

export const curvePreviewTypes = ["spring", "bounce", "ease-out", "ease-in-out"] as const;
export type CurvePreviewType = CurveType;

export interface CurvePreviewProps {
  /**
   * The curve (Figma `Type`): `spring` (light damping, about 4% overshoot, default), `bounce` (visible overshoot),
   * `ease-out` (Motion/Ease/Emphasized) or `ease-in-out` (.65 0 .35 1).
   */
  type?: CurvePreviewType;
  /**
   * How much a spring overshoots, 0–1 (damping ratio = 1 − bounce): follow the Bounce setting the preview sits above.
   * Default: 0.3 for `spring`, 0.7 for `bounce`. Ease curves ignore it.
   */
  bounce?: number;
  /** Name for assistive technology. Default: "Motion curve: Spring" (the type, in the provider's language). */
  "aria-label"?: string;
  className?: string;
  style?: CSSProperties;
  /** The preview's root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}

// Figma's frame: 320 × 176, the value starts 28 from the bottom and reaches the target 52 from the top, so an
// overshoot has room above it. The SVG stretches to the width; strokes keep their width.
const WIDTH = 320;
const HEIGHT = 176;
const START = 148;
const TARGET = 52;

/**
 * Figma Chart/Curve-Preview (15663:110887): how a motion curve moves a value from its start (bottom left) to its target
 * (the dashed line) over time, left to right. Place it above the motion settings it previews (Type, Duration, Bounce)
 * so a change shows at once; it is a picture of the setting, not a control. The surface is the Input field's
 * (Input/Background/Default, Input/Border/Default, Effect/Input, Corner-Radius/Input/Medium) so it sits with fields;
 * grid lines Border/Neutral/Pale (as the charts), target dashed 4 · 4 Border/Neutral/Subtle, the curve 2px
 * Content/Neutral/Strongest with round caps. For data over time use LineChart; for a progress value, Progress.
 */
export function CurvePreview({ type = "spring", bounce, "aria-label": ariaLabel, className, style, ref, ...rest }: CurvePreviewProps) {
  const t = useZenLabels();
  const names: Record<CurvePreviewType, string> = { spring: t.curveSpring, bounce: t.curveBounce, "ease-out": t.curveEaseOut, "ease-in-out": t.curveEaseInOut };
  const progress = curveProgress(type, bounce);
  const curve = progress.map((value, index) => `${index ? "L" : "M"}${((index / (progress.length - 1)) * WIDTH).toFixed(2)} ${(START - value * (START - TARGET)).toFixed(2)}`).join(" ");
  // Four columns and four rows; the frame's own border closes the last ones.
  const grid = [1, 2, 3].map((step) => `M${(step * WIDTH) / 4} 0V${HEIGHT}M0 ${(step * HEIGHT) / 4}H${WIDTH}`).join("");
  return (
    <div {...dataAttributes(rest)}
      ref={ref}
      className={["zen-curve-preview", className].filter(Boolean).join(" ")}
      data-type={type}
      role="img"
      aria-label={ariaLabel ?? t.motionCurve(names[type] ?? type)}
      style={style}
    >
      <svg className="zen-curve-preview__plot" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path className="zen-curve-preview__grid" d={grid} />
        <path className="zen-curve-preview__target" d={`M0 ${TARGET}H${WIDTH}`} />
        <path className="zen-curve-preview__curve" d={curve} />
      </svg>
    </div>
  );
}

/**
 * Per-corner radius on the Corner-Radius tokens (Figma topLeftRadius … bottomLeftRadius, each bound to a Corner-Radius
 * variable), for Box and Image. Spec: docs/research/studio-position-effects-radius-spec-2026-10-03.md §3.3.
 *
 * The four values are written into the component's existing radius custom property as a CSS 4-value list (TL TR BR BL,
 * the same order as Figma), so no CSS changes and every corner follows the radius mode (`[data-radius]`).
 * Canonical form (what Studio writes and the Figma importer emits): all four equal → `radius` only; otherwise `radius`
 * plus only the corners that differ from it (chat tail `radius="xl" radiusBottomRight="xs"`, sheet top
 * `radiusTopLeft="3xl" radiusTopRight="3xl"`).
 */
import { radiusValue, type ZenCornerRadius } from "./scale";

export interface CornerRadiusProps {
  /**
   * Top-left corner on the Corner-Radius tokens (Figma topLeftRadius; none · 2xs 2 · xs 4 · sm 8 · md 12 · lg 16 ·
   * xl 20 · 2xl 24 · 3xl 28 · full), following the radius mode. A set corner wins over `radius`, as `paddingX` wins
   * over `padding`; unset corners keep `radius`. Don't mix `full` with a finite corner (`radius="full"
   * radiusBottomRight="xs"`): `full` is Corner-Radius/Rounded (1000px), so the browser scales every corner down to fit
   * the box and the small one renders square. Use a finite radius (a chat tail: `radius="xl" radiusBottomRight="xs"`);
   * `full` mixes only with `none`.
   */
  radiusTopLeft?: ZenCornerRadius;
  /** Top-right corner on the Corner-Radius tokens (Figma topRightRadius). Wins over `radius`. */
  radiusTopRight?: ZenCornerRadius;
  /** Bottom-right corner on the Corner-Radius tokens (Figma bottomRightRadius). Wins over `radius`. */
  radiusBottomRight?: ZenCornerRadius;
  /** Bottom-left corner on the Corner-Radius tokens (Figma bottomLeftRadius). Wins over `radius`. */
  radiusBottomLeft?: ZenCornerRadius;
}

/** The per-corner props in CSS / Figma order (TL TR BR BL). */
export const cornerRadiusPropNames = ["radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft"] as const;
/** Every prop the Corner radius field owns: `radius` plus the four corners (Studio filters these out of Properties). */
export const radiusPropNames: ReadonlySet<string> = new Set(["radius", ...cornerRadiusPropNames]);

/**
 * The border-radius value for `radius` plus per-corner overrides: the single token value when no corner is set (the
 * exact output of `radiusValue(radius)`, so existing pages do not change), else a 4-value list TL TR BR BL where an
 * unset corner takes `radius` (or 0 when `radius` is unset too). A `full` corner stays 1000px in the list, so next to a
 * finite corner CSS's overlap scaling shrinks every corner (see CornerRadiusProps: `full` mixes only with `none`).
 */
export function cornerRadiusValue(radius: ZenCornerRadius | undefined, corners: CornerRadiusProps): string | undefined {
  const values = [corners.radiusTopLeft, corners.radiusTopRight, corners.radiusBottomRight, corners.radiusBottomLeft];
  if (values.every((value) => value === undefined)) return radiusValue(radius);
  return values.map((value) => radiusValue(value ?? radius) ?? "0px").join(" ");
}

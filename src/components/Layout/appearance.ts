/**
 * Figma's frame appearance on Box, Stack and Grid: fill, stroke, corner radius, opacity, blend, rotation and flip. A Figma auto
 * layout frame with a fill is one element in code (decision 2 of docs/research/studio-figma-design-parity-2026-10-18.md;
 * spec docs/research/studio-f5-right-panel-spec-2026-10-19.md §2), so Stack and Grid take what Box takes.
 *
 * Tokens only: the fill is a background layer (Color/Background), the stroke Border/Neutral Pale or Subtle, the corners
 * Corner-Radius. Weight, opacity, rotation and flip are numbers, as Figma's fields. Unset props render nothing, and every
 * custom property is read only next to its own data attribute (an inherited value never leaks into a nested frame).
 * Rotation and flip are CSS individual transforms (`rotate`, `scale`): they compose with any `transform` and leave the
 * layer's box in the layout where it was, as Figma's rotation does inside auto layout's own bounds.
 */
import { cornerRadiusValue, type CornerRadiusProps } from "../_shared/corners";
import type { ZenCornerRadius } from "../_shared/scale";
import { imageFillPropNames, type ImageFillProps } from "../_shared/image-fill";
import { gradientPropNames, gradientStyle, type GradientFillProps } from "../_shared/gradient";

/** The background layers a frame may paint (docs/guidelines/background-layers.md). */
export const boxSurfaces = ["none", "surface", "surface-alt", "subtle", "pale", "canvas"] as const;
export type BoxSurface = (typeof boxSurfaces)[number];
/** Closed borders: Border/Neutral/Pale (static) and Border/Neutral/Subtle (actionable). */
export const frameBorders = ["none", "pale", "subtle"] as const;
export type FrameBorder = (typeof frameBorders)[number];
/** Figma's Stroke › sides: All, or one side (a bar's top or bottom rule). */
export const frameBorderSides = ["all", "top", "right", "bottom", "left"] as const;
export type FrameBorderSide = (typeof frameBorderSides)[number];
/** Figma's Stroke › Dash: solid, or dashed (dashed borders are always Subtle). */
export const frameBorderStyles = ["solid", "dashed"] as const;
export type FrameBorderStyle = (typeof frameBorderStyles)[number];
/** Figma's Flip horizontal (⇧H) and Flip vertical (⇧V); both is a half turn's mirror. */
export const frameFlips = ["horizontal", "vertical", "both"] as const;
export type FrameFlip = (typeof frameFlips)[number];
/**
 * Figma's layer blend (Appearance › blend mode), in Figma's order and groups. `pass-through` is a frame's (and a group's)
 * default: its layers blend with what lies under the frame; every other layer's default is `normal`. CSS draws each with
 * the `mix-blend-mode` of the same name (`plus-darker` falls back to normal where a browser has no such mode).
 */
export const zenBlendModes = ["pass-through", "normal", "darken", "multiply", "plus-darker", "color-burn", "lighten", "screen", "plus-lighter", "color-dodge", "overlay", "soft-light", "hard-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"] as const;
export type ZenBlendMode = (typeof zenBlendModes)[number];

export interface FrameAppearanceProps extends CornerRadiusProps, ImageFillProps, GradientFillProps {
  /**
   * Fill: the background layer (docs/guidelines/background-layers.md), Figma's frame fill bound to its variable.
   * `surface` (Background/Surface/Default) for cards and panels on the Canvas page, `surface-alt` on a white (Alt)
   * canvas, `subtle` / `pale` (Background/Neutral) for wells. `canvas` (Background/Canvas/Default) is the page itself:
   * only for a whole screen or page area drawn inside something else (an app screen in a preview), never for a card.
   * Never Flat (navigation) or Container (modals and sheets use Dialog / BottomSheet). Default none.
   */
  surface?: BoxSurface;
  /**
   * Stroke: a closed border, `subtle` (Border/Neutral/Subtle/Default) when the frame is actionable, `pale`
   * (Border/Neutral/Pale/Default) when it is static (docs/guidelines/borders.md). Inside the frame, as Figma's
   * Inside stroke. Default none.
   */
  border?: FrameBorder;
  /** Stroke weight in px (Figma strokeWeight), read with `border`. Default 1. */
  borderWeight?: number;
  /** Which sides the stroke draws (Figma's Stroke › sides): `all` (default) or one side, e.g. `bottom` for a bar's rule. */
  borderSides?: FrameBorderSide;
  /** Figma's Stroke › Dash: `dashed` draws only with `border="subtle"` (dashed borders are always Subtle). Default solid. */
  borderStyle?: FrameBorderStyle;
  /** Corner radius on the Corner-Radius tokens (Figma cornerRadius, follows the radius mode); `radiusTopLeft` … `radiusBottomLeft` override single corners. */
  radius?: ZenCornerRadius;
  /** Layer opacity in percent (Figma's layer opacity, 0 … 100), the whole frame and its layers. Default 100. */
  opacity?: number;
  /**
   * Figma's layer blend (Appearance › blend mode, the Plugin API's `blendMode`): how the frame mixes with what lies
   * under it. Default `pass-through` (its layers blend with what is under the frame, Figma's frame default); `normal`
   * keeps their blending inside the frame. Mostly for pictures and decorative layers, never to make text readable.
   */
  blendMode?: ZenBlendMode;
}

export interface FrameTransformProps {
  /**
   * Rotation in degrees, counter-clockwise positive, as Figma's rotation field. Turns the frame about its centre; its
   * place in the layout stays (the rotated frame may overlap its neighbours, as in Figma).
   */
  rotation?: number;
  /** Figma's Flip horizontal (⇧H) or Flip vertical (⇧V): the frame mirrored on that axis, its place in the layout kept. */
  flip?: FrameFlip;
}

/** Prop names the Studio's Appearance, Fill and Stroke sections own (filtered out of Properties). */
export const frameAppearancePropNames: ReadonlySet<string> = new Set(["surface", "border", "borderWeight", "borderSides", "borderStyle", "opacity", "blendMode", ...imageFillPropNames, ...gradientPropNames]);

type Attributes = Record<`data-${string}`, string | undefined>;
type Vars = Record<`--${string}`, string | undefined>;

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Data attributes and custom properties for the fill, stroke, opacity, blend, rotation and flip; nothing for unset props. */
export function frameAppearance({ surface, border, borderWeight, borderSides, borderStyle, gradient, opacity, blendMode, rotation, flip }: Omit<FrameAppearanceProps, "radius" | keyof CornerRadiusProps> & FrameTransformProps): { attributes: Attributes; vars: Vars } {
  const stroked = border !== undefined && border !== "none";
  // Pass through is the frame's default: nothing to draw.
  const blend = blendMode && blendMode !== "pass-through" && (zenBlendModes as readonly string[]).includes(blendMode) ? blendMode : undefined;
  const weight = stroked && finite(borderWeight) && borderWeight >= 0 && borderWeight !== 1 ? borderWeight : undefined;
  const shown = finite(opacity) && opacity < 100 ? Math.max(0, opacity) : undefined;
  const turned = finite(rotation) && rotation % 360 !== 0 ? rotation : undefined;
  // A gradient fill (gradient.ts): its layers over the surface colour, under an image fill.
  const painted = gradientStyle(gradient);
  return {
    attributes: {
      ...painted.attributes,
      "data-surface": surface && surface !== "none" ? surface : undefined,
      "data-border": stroked ? border : undefined,
      "data-border-weight": weight !== undefined ? "true" : undefined,
      "data-border-sides": stroked && borderSides && borderSides !== "all" ? borderSides : undefined,
      "data-border-style": stroked && borderStyle === "dashed" ? "dashed" : undefined,
      "data-opacity": shown !== undefined ? "true" : undefined,
      "data-blend": blend,
      "data-rotation": turned !== undefined ? "true" : undefined,
      "data-flip": flip && (frameFlips as readonly string[]).includes(flip) ? flip : undefined,
    },
    vars: {
      ...painted.vars,
      "--zen-layout-border-weight": weight !== undefined ? `${weight}px` : undefined,
      "--zen-layout-opacity": shown !== undefined ? String(shown / 100) : undefined,
      "--zen-layout-blend": blend,
      // CSS turns clockwise; Figma's rotation is counter-clockwise.
      "--zen-layout-rotation": turned !== undefined ? `${-turned}deg` : undefined,
    },
  };
}

/** Stack and Grid corners: `data-corners` and their own --zen-layout-radius (Box keeps --zen-box-radius). */
export function frameCorners(radius: ZenCornerRadius | undefined, corners: CornerRadiusProps): { attributes: Attributes; vars: Vars } {
  const value = cornerRadiusValue(radius, corners);
  return { attributes: { "data-corners": value !== undefined ? "true" : undefined }, vars: { "--zen-layout-radius": value } };
}

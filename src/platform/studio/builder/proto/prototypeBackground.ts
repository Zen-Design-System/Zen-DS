import { shapeFills } from "../../../../components/Shape/paint";
import { fillPalette } from "../../inspector/palettes";

/*
 * Play's stage colour (Figma's Prototype settings › Background; user 2026-11-26: "dark thì nền prototype là nền sáng, light
 * thì nền tối. nền cho phép user chỉnh sửa bằng picker", then "cho chọn bằng picker tự do không chỉ chọn token"). The default
 * is Background/Neutral/Solid in Play's own mode, the opposite of the played page (dark round a light page, light round a
 * dark one), so the UI stands out on it. A page may set any colour (`#RRGGBB`, the free picker) or an opaque
 * Color/Background token (header `prototypeBackground`): the flat, subtle, pale and overlay ones would let the Studio
 * behind Play show through.
 */

export const DEFAULT_PROTOTYPE_BACKGROUND = "neutral-solid";

/** The colours Prototype settings › Background offers: Shape's fill keys that paint an opaque colour. */
export const PROTOTYPE_BACKGROUNDS: readonly string[] = shapeFills.filter((fill) => !/^none$|-flat$|-subtle$|-pale$|overlay/.test(fill));

/** A colour the free picker set (`#RRGGBB`), or undefined for a token or the default. */
export const prototypeHex = (fill: string | undefined) => (fill && /^#[0-9A-F]{6}$/i.test(fill) ? fill.toUpperCase() : undefined);

/** A token the page picked (one of the list), or undefined for a colour or the default. */
export const prototypeToken = (fill: string | undefined) => (fill && PROTOTYPE_BACKGROUNDS.includes(fill) ? fill : undefined);

/** What Play's stage paints: the page's colour, its token, else the default's token. */
export function prototypeBackgroundPaint(fill: string | undefined): string {
  return prototypeHex(fill) ?? `var(${fillPalette.colorOf(prototypeToken(fill) ?? DEFAULT_PROTOTYPE_BACKGROUND) ?? "--zen-color-background-neutral-solid-default"})`;
}

/** Whether a painted colour ("rgb(18, 18, 18)") is dark: what sits on the stage takes the light or the dark overlay
 *  colours from it. */
export function isDarkPaint(color: string): boolean {
  const [r = 0, g = 0, b = 0] = (color.match(/[\d.]+/g) ?? []).map(Number);
  const linear = (value: number) => { const c = value / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b) < 0.18;
}

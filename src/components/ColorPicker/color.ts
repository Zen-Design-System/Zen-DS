/**
 * Colour maths for ColorPicker and ColorField. The value Zen stores is a 6-digit hex string ("#1F6FEB"); the picker
 * works in HSB (hue 0–360, saturation and brightness 0–1) because its area is saturation × brightness, and shows the
 * same colour as Hex, RGB, HSL or HSB in its Format select.
 */

export type Rgb = { r: number; g: number; b: number };
export type Hsb = { h: number; s: number; b: number };
export type Hsl = { h: number; s: number; l: number };
export const colorFormats = ["hex", "rgb", "hsl", "hsb"] as const;
export type ColorFormat = (typeof colorFormats)[number];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** "#1f6feb", "1F6FEB" or "#16e" → "#1F6FEB"; anything else → null. */
export function normalizeHex(input: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? match[1].split("").map((digit) => digit + digit).join("") : match[1];
  return `#${digits.toUpperCase()}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const normal = normalizeHex(hex);
  if (!normal) return null;
  const value = Number.parseInt(normal.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (channel: number) => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
}

export function rgbToHsb({ r, g, b }: Rgb): Hsb {
  const [red, green, blue] = [r / 255, g / 255, b / 255];
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  let h = 0;
  if (delta) {
    if (max === red) h = ((green - blue) / delta) % 6;
    else if (max === green) h = (blue - red) / delta + 2;
    else h = (red - green) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? delta / max : 0, b: max };
}

export function hsbToRgb({ h, s, b }: Hsb): Rgb {
  const hue = ((h % 360) + 360) % 360;
  const chroma = b * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = b - chroma;
  const [red, green, blue] =
    hue < 60 ? [chroma, x, 0] : hue < 120 ? [x, chroma, 0] : hue < 180 ? [0, chroma, x] : hue < 240 ? [0, x, chroma] : hue < 300 ? [x, 0, chroma] : [chroma, 0, x];
  return { r: (red + m) * 255, g: (green + m) * 255, b: (blue + m) * 255 };
}

export function hsbToHsl({ h, s, b }: Hsb): Hsl {
  const l = b * (1 - s / 2);
  return { h, s: l === 0 || l === 1 ? 0 : (b - l) / Math.min(l, 1 - l), l };
}

export function hslToHsb({ h, s, l }: Hsl): Hsb {
  const b = l + s * Math.min(l, 1 - l);
  return { h, s: b === 0 ? 0 : 2 * (1 - l / b), b };
}

export const hexToHsb = (hex: string): Hsb | null => {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsb(rgb) : null;
};
export const hsbToHex = (hsb: Hsb): string => rgbToHex(hsbToRgb(hsb));

/** The channels a format shows, as the picker's fields display them (rounded, % for saturation/lightness/brightness). */
export function formatChannels(hsb: Hsb, format: ColorFormat): string[] {
  if (format === "hex") return [hsbToHex(hsb).slice(1)];
  if (format === "rgb") {
    const { r, g, b } = hsbToRgb(hsb);
    return [r, g, b].map((channel) => String(Math.round(channel)));
  }
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  if (format === "hsl") {
    const { h, s, l } = hsbToHsl(hsb);
    return [String(Math.round(h)), percent(s), percent(l)];
  }
  return [String(Math.round(hsb.h)), percent(hsb.s), percent(hsb.b)];
}

/** One edited channel of `format` back into HSB; null when the text is not a valid value for that channel. */
export function parseChannel(hsb: Hsb, format: ColorFormat, index: number, text: string): Hsb | null {
  // A grey has no hue: keep the one the picker shows, so the hue slider does not jump to red.
  const keepHue = (next: Hsb | null) => (next && next.s === 0 ? { ...next, h: hsb.h } : next);
  if (format === "hex") return keepHue(hexToHsb(text));
  const number = Number.parseFloat(text.replace("%", ""));
  if (!Number.isFinite(number)) return null;
  if (format === "rgb") {
    const rgb = hsbToRgb(hsb);
    const channels = [rgb.r, rgb.g, rgb.b];
    channels[index] = clamp(number, 0, 255);
    return keepHue(rgbToHsb({ r: channels[0], g: channels[1], b: channels[2] }));
  }
  const value = index === 0 ? clamp(number, 0, 360) : clamp(number, 0, 100) / 100;
  if (format === "hsl") {
    const hsl = hsbToHsl(hsb);
    const next = index === 0 ? { ...hsl, h: value } : index === 1 ? { ...hsl, s: value } : { ...hsl, l: value };
    return hslToHsb(next);
  }
  return index === 0 ? { ...hsb, h: value } : index === 1 ? { ...hsb, s: value } : { ...hsb, b: value };
}

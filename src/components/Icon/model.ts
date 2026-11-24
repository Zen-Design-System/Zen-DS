/*
 * Icon's framework-free part (the web core, src/core): the token sizes and how a size or an instance id lands on the
 * `<svg>`. React's Icon and the Vue port both draw from it (tools/code-languages/vue-parity.mjs).
 */

export const iconSizes = ["2xs", "xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl"] as const;
export type IconSize = (typeof iconSizes)[number];

/** A token size is a `data-size` key; any other size (a px number, "1.5rem") is the svg's width and height. */
export function iconSize(size: IconSize | number | string | undefined): { name: IconSize | undefined; custom: string | undefined } {
  if (typeof size === "number") return { name: undefined, custom: `${size}px` };
  if (!size) return { name: undefined, custom: undefined };
  if ((iconSizes as readonly string[]).includes(size)) return { name: size as IconSize, custom: undefined };
  return { name: undefined, custom: size };
}

/**
 * Inline SVGs share one document: clipPath/mask/gradient ids are made unique per instance (`uid`), otherwise the second
 * copy of an icon points at the first copy's <clipPath> (broken when that one is hidden, and invalid HTML).
 */
export function scopeIconIds(content: string, uid: string): string {
  if (!/\sid="/.test(content)) return content;
  return content.replace(/\sid="([^"]+)"/g, ` id="$1-${uid}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${uid})`).replace(/(xlink:)?href="#([^"]+)"/g, (_m, xl, id) => `${xl ?? ""}href="#${id}-${uid}"`);
}

import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import { scaleKey } from "../_shared/scale";

/*
 * EmptyState's framework-free part (the web core, src/core): sizes, the title's level and style (also inside a titled
 * card), the placeholder art, and the CTAs' levels. React's EmptyState and the Vue port both draw from it
 * (tools/code-languages/vue-parity.mjs).
 */

export const emptyStateSizes = ["sm", "md"] as const;
/** Short (canonical) or long Figma spelling — both render the same. */
export type EmptyStateSize = "sm" | "md" | "small" | "medium";
type EmptyStateSizeKey = (typeof emptyStateSizes)[number];
export type EmptyStateHeadingLevel = 2 | 3 | 4 | 5 | 6;

/** The CTAs' Button levels when the action names none: Primary, then Tertiary. */
export const emptyStateActionLevels = { first: "primary", second: "tertiary" } as const;

export const emptyStateCaptionClass = `zen-empty-state__caption ${typographyStyles["Body/Base/Regular"]}`;

export type EmptyStateModelInput = {
  size?: EmptyStateSize;
  headingLevel?: EmptyStateHeadingLevel;
  compactTitle?: boolean;
  /** The level of the titled card's title around it (ChartCard), if any. */
  cardLevel?: EmptyStateHeadingLevel;
};

export type EmptyStateModel = { size: EmptyStateSizeKey; className: string; heading: "h2" | "h3" | "h4" | "h5" | "h6"; titleClass: string };

/**
 * Inside a titled card the Empty State is Small by default and its title sits one level below the card title in
 * Body/Extra/Bold. Stand-alone it is Medium with an h3; at level 4 and deeper (or `compactTitle`) the title takes
 * Body/Extra/Bold too, so it never outsizes the title above it.
 */
export function emptyStateModel({ size: sizeProp, headingLevel, compactTitle = false, cardLevel }: EmptyStateModelInput): EmptyStateModel {
  const size = scaleKey(sizeProp ?? (cardLevel === undefined ? "md" : "sm"), emptyStateSizes);
  const level = headingLevel ?? (cardLevel === undefined ? 3 : (Math.min(cardLevel + 1, 6) as EmptyStateHeadingLevel));
  const titleStyle: TypographyStyleName = compactTitle || cardLevel !== undefined || level >= 4 ? "Body/Extra/Bold" : "Heading/4";
  return { size, className: `zen-empty-state zen-empty-state--${size}`, heading: `h${level}`, titleClass: `zen-empty-state__title ${typographyStyles[titleStyle]}` };
}

/** The illustration's root class at a size (`md` 240, `sm` 200). */
export function emptyStateIllustrationClass(size: EmptyStateSize): string {
  const key = scaleKey(size, emptyStateSizes);
  return `zen-empty-state__illustration zen-empty-state__illustration--${key}`;
}

/** The placeholder art in its 240 box: the faded grid's lines, then the dashed ghost, the ring and the well. */
export const emptyStateArt = {
  lines: [
    ...[40, 93, 146, 199].map((x) => ({ key: `v${x}`, x1: x, x2: x, y1: 40, y2: 200 })),
    ...[60, 100, 140, 180].map((y) => ({ key: `h${y}`, x1: 20, x2: 220, y1: y, y2: y })),
  ],
  circles: [
    { className: "zen-empty-state__ghost", cx: 90, cy: 110, r: 49 },
    { className: "zen-empty-state__ring", cx: 149, cy: 130, r: 49 },
    { className: "zen-empty-state__well", cx: 149, cy: 130, r: 40 },
  ],
} as const;

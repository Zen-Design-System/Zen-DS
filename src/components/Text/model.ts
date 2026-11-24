import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import { layoutSizing, type LayoutSizingProps } from "../Layout/sizing";
import { contentTones, resolveContentTone, type ContentTone } from "../_shared/contentTone";

/*
 * Text, Heading and TextRun's framework-free part (the web core, src/core): their elements, levels and what the root
 * writes for a set of props (class, data-* attributes, custom properties). React's components and the Vue port both draw
 * from it, so the two stay the same DOM (tools/code-languages/vue-parity.mjs). The props are documented on React's
 * TextProps, HeadingProps and TextRunProps.
 */

/**
 * Text colour roles: every resting Figma Color/Content token, named by its path (`support-blue-light` =
 * Content/Support/Blue/Light; contentTone.ts). Neutral text: `strongest` (primary), `base` (secondary), `light`
 * (tertiary). Colour families: Strongest/Base for text on the family's Subtle background; Light, sparingly, for short
 * text that must stand out (help or error text, a condition, a delta), never for the Lights group (Accent, Warning,
 * Support/Yellow). `on-colors` is text on a Solid fill
 * (docs/component-usage-rules.md §7). Older names stay as aliases (`secondary`, `accent` = `accent-base`, `inverse`).
 */
export const textTones = contentTones;
export type TextTone = ContentTone;

export const textElements = ["p", "span", "div", "strong", "em", "small", "label", "li", "dt", "dd", "figcaption", "legend", "code", "time"] as const;
export type TextElement = (typeof textElements)[number];

/** Text alignment, as Figma's Alignment: start (left in LTR) · center · end · justify (Figma's Justified). */
export type TextAlign = "start" | "center" | "end" | "justify";
/** Vertical alignment inside the text box, as Figma's Align top · middle · bottom. */
export type TextVerticalAlign = "top" | "middle" | "bottom";

export const headingLevels = [1, 2, 3, 4, 5, 6] as const;
export type HeadingLevel = (typeof headingLevels)[number];

/**
 * Default Figma style per heading level, following the Typography › Content hierarchy ladder: h1 page title Heading/1,
 * h2 section Heading/4, h3 card or widget title Heading/Subheading, then Body/Extra/Bold and Body/Base/Bold. The
 * dashboard/popular/mobile typography modes resize the styles; the mapping never changes a font size.
 */
const headingStyleByLevel: Record<HeadingLevel, TypographyStyleName> = {
  1: "Heading/1",
  2: "Heading/4",
  3: "Heading/Subheading",
  4: "Body/Extra/Bold",
  5: "Body/Base/Bold",
  6: "Body/Base/Bold",
};

/** What Text and Heading share: a text style, a tone, the line clamp, alignment, wrapping, digits and Figma's resizing. */
export type TextModelProps = LayoutSizingProps & {
  textStyle?: TypographyStyleName;
  tone?: ContentTone;
  truncate?: boolean | number;
  align?: TextAlign;
  verticalAlign?: TextVerticalAlign;
  wrap?: boolean;
  tabularNumbers?: boolean;
};

/** The root of a Text or Heading: its classes (without the caller's), data-* attributes and custom properties. */
export type TextRootModel = {
  className: string;
  attributes: Record<string, string | undefined>;
  /** Figma's resizing (sizing.ts): under the caller's `style`, so theirs win. */
  vars: Record<`--${string}`, string>;
  /** The clamp of 2 lines or more (`--zen-text-lines`): over the caller's `style`. */
  clamp: Record<`--${string}`, number> | undefined;
};

/** Whether text children hold a line break (`{"First line\nSecond line"}`, Figma's Enter in a text): they show as lines. */
export const hasLineBreak = (children: readonly unknown[]) => children.some((child) => typeof child === "string" && child.includes("\n"));

function textRoot(classes: string[], { tone = "strongest", truncate, align, verticalAlign, wrap = true, tabularNumbers = false, ...size }: TextModelProps): TextRootModel {
  const lines = truncate === true ? 1 : typeof truncate === "number" ? Math.max(1, Math.floor(truncate)) : undefined;
  const sizing = layoutSizing(size);
  return {
    className: classes.filter(Boolean).join(" "),
    attributes: {
      "data-tone": resolveContentTone(tone),
      "data-truncate": lines === undefined ? undefined : lines === 1 ? "line" : "lines",
      "data-align": align,
      "data-valign": verticalAlign,
      "data-wrap": wrap ? undefined : "false",
      "data-numbers": tabularNumbers ? "tabular" : undefined,
      ...sizing.attributes,
    },
    vars: sizing.vars,
    clamp: lines !== undefined && lines >= 2 ? { "--zen-text-lines": lines } : undefined,
  };
}

/** Text: `breaks` when its children hold a line break (hasLineBreak). */
export function textModel(props: TextModelProps, breaks: boolean): TextRootModel {
  const root = textRoot(["zen-text", typographyStyles[props.textStyle ?? "Body/Base/Regular"]], props);
  return { ...root, attributes: { "data-breaks": breaks ? "true" : undefined, ...root.attributes } };
}

/** Heading: its element (h1–h6) and its root; the style follows the level's ladder unless `textStyle` sets it. */
export function headingModel({ level = 2, ...props }: TextModelProps & { level?: HeadingLevel }): TextRootModel & { tag: `h${HeadingLevel}` } {
  return { tag: `h${level}`, ...textRoot(["zen-text", "zen-heading", typographyStyles[props.textStyle ?? headingStyleByLevel[level]]], props) };
}

export type TextRunModelProps = { bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; tone?: ContentTone; textStyle?: TypographyStyleName };

/** TextRun: a span's classes (without the caller's) and data-* attributes; unset props keep the text around it. */
export function textRunModel({ bold = false, italic = false, underline = false, strikethrough = false, tone, textStyle }: TextRunModelProps) {
  const decoration = [underline ? "underline" : "", strikethrough ? "strikethrough" : ""].filter(Boolean).join(" ") || undefined;
  return {
    className: ["zen-text-run", textStyle ? typographyStyles[textStyle] : ""].filter(Boolean).join(" "),
    attributes: {
      "data-bold": bold ? "true" : undefined,
      "data-italic": italic ? "true" : undefined,
      "data-decoration": decoration,
      "data-tone": tone ? resolveContentTone(tone) : undefined,
    },
  };
}

/**
 * "1 file", "3 files". Counts in UI copy are pluralised (harness copy/plural-count). `locale` (default "en-US"; pass
 * useZenLocale()) picks the number format and the plural rule: Vietnamese nouns do not inflect, so
 * `plural(3, "tệp", undefined, "vi")` is "3 tệp" (the default `many` is `one` there, `one + "s"` in English).
 */
export function plural(count: number, one: string, many?: string, locale = "en-US"): string {
  const vietnamese = locale.toLowerCase().startsWith("vi");
  const singular = !vietnamese && new Intl.PluralRules(locale).select(count) === "one";
  return `${count.toLocaleString(locale)} ${singular ? one : (many ?? (vietnamese ? one : `${one}s`))}`;
}

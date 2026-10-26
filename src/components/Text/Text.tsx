import { Children, type CSSProperties, type HTMLAttributes, type ReactNode, type Ref } from "react";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import { layoutSizing, withSizingVars, type LayoutSizingProps } from "../Layout/sizing";
import { contentTones, resolveContentTone, type ContentTone } from "../_shared/contentTone";
import "../_shared/content-tone.css";
import "./text.css";

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

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, "color">, LayoutSizingProps {
  /** Figma text style, e.g. "Body/Base/Regular" (default), "Body/Small/Medium", "Caption/Regular", "Heading/4". */
  textStyle?: TypographyStyleName;
  /**
   * Colour role: a Color/Content token by its path ("base", "support-blue-strongest"). Default strongest (primary text).
   * Text in a Caption style always takes its family's Light ("light", "inverse-light", "negative-light"; Base in the
   * Lights group): set it, as the default would render Strongest (harness text/caption-light).
   */
  tone?: ContentTone;
  /** Element to render. Default p (a block); use span inside a line, label for a form label. */
  as?: TextElement;
  /** true: one line with an ellipsis; a number: clamp to that many lines. The full text stays in the DOM. */
  truncate?: boolean | number;
  /**
   * Text alignment (Figma Alignment): "start" (left in LTR), "center", "end", or "justify" (both edges flush, Figma's
   * Justified: only for long paragraphs in a wide column; in a narrow one it opens gaps between words). Unset keeps the
   * parent's alignment. Inline text (as="span") aligns once it is a block or has a width.
   */
  align?: TextAlign;
  /**
   * Vertical alignment inside the box (Figma Align top / middle / bottom). It shows only when the box is taller than its
   * text: a Fixed or Fill `height` (Figma's Fixed size text box). Default top.
   */
  verticalAlign?: TextVerticalAlign;
  /**
   * `false`: one line that never wraps (Figma text Auto width), e.g. a time or an amount that must stay whole; the row
   * around it gives it room. Unlike `truncate`, nothing is cut. Default true.
   */
  wrap?: boolean;
  /** Figma Number: Tabular (OpenType tnum): every digit takes the same width, so a count, a time or a price that changes
   *  does not move the text around it. */
  tabularNumbers?: boolean;
  /** For `as="label"`. */
  htmlFor?: string;
  children?: ReactNode;
  /** Ref to the rendered DOM element (the `as` element when set). */
  ref?: Ref<HTMLElement>;
}

function truncateStyle(truncate: TextProps["truncate"], style: CSSProperties | undefined): CSSProperties | undefined {
  if (typeof truncate !== "number" || truncate < 2) return style;
  return { ...style, ["--zen-text-lines" as string]: truncate };
}

/**
 * Figma text styles with Zen's content colours. Paragraphs, labels and inline copy; titles use <Heading>. Meta in
 * Body/Small takes tone "base"; Caption is always tone "light" (the user 2026-10-26; text on a Solid or Subtle fill follows
 * the fill).
 *
 *   <Text>Invite people to collaborate on this project.</Text>
 *   <Text textStyle="Body/Small/Regular" tone="base">Updated 2 min ago</Text>
 */
export function Text({ textStyle = "Body/Base/Regular", tone = "strongest", as: Element = "p", truncate, align, verticalAlign, wrap = true, tabularNumbers = false, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf, className, style, children, ref, ...rest }: TextProps) {
  const lines = truncate === true ? 1 : typeof truncate === "number" ? Math.max(1, Math.floor(truncate)) : undefined;
  const sizing = layoutSizing({ width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  // Line breaks in its words (`{"First line\nSecond line"}`, Figma's Enter in a text) show as lines.
  const breaks = Children.toArray(children).some((child) => typeof child === "string" && child.includes("\n"));
  return (
    <Element
      {...rest}
      ref={ref as never}
      className={["zen-text", typographyStyles[textStyle], className].filter(Boolean).join(" ")}
      data-breaks={breaks ? "true" : undefined}
      data-tone={resolveContentTone(tone)}
      data-truncate={lines === undefined ? undefined : lines === 1 ? "line" : "lines"}
      data-align={align}
      data-valign={verticalAlign}
      data-wrap={wrap ? undefined : "false"}
      data-numbers={tabularNumbers ? "tabular" : undefined}
      {...sizing.attributes}
      style={withSizingVars(truncateStyle(lines, style), sizing.vars)}
    >
      {children}
    </Element>
  );
}

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

export interface HeadingProps extends Omit<HTMLAttributes<HTMLHeadingElement>, "color">, LayoutSizingProps {
  /** Document level (h1–h6): pick it from the page outline, not from the size. Step down one level at a time (h1 → h2
   *  → h3); going back up may jump (h4 → h2). Default 2. */
  level?: HeadingLevel;
  /** Visual style; defaults to the level's ladder style (1 Heading/1 · 2 Heading/4 · 3 Heading/Subheading · 4
   *  Body/Extra/Bold · 5–6 Body/Base/Bold). A content h1 (the page title shown large) is Heading/1 or a larger Display /
   *  Display-Extra style, never smaller (harness: heading/h1-is-heading-1). Set textStyle when the kind of content asks for it: a card title is always
   *  Heading/Subheading, whatever its level; a list group header (a kicker) is Body/Small/Bold in tone "light". */
  textStyle?: TypographyStyleName;
  /** Colour role: a Color/Content token by its path, as on Text. Default strongest. */
  tone?: ContentTone;
  /** true: one line with an ellipsis; a number: clamp to that many lines. The full text stays in the DOM. */
  truncate?: boolean | number;
  /** Text alignment (Figma Alignment), as on Text: start · center · end · justify. Unset keeps the parent's alignment. */
  align?: TextAlign;
  /** Vertical alignment inside the box (Figma Align top / middle / bottom), as on Text: shows with a Fixed or Fill height. */
  verticalAlign?: TextVerticalAlign;
  /** `false`: one line that never wraps (Figma text Auto width), as on Text. Default true. */
  wrap?: boolean;
  /** Figma Number: Tabular (OpenType tnum): digits of one width, as on Text. */
  tabularNumbers?: boolean;
  children?: ReactNode;
  /** Ref to the rendered heading element (`<h1>`–`<h6>`). */
  ref?: Ref<HTMLHeadingElement>;
}

/**
 * A real heading (h1–h6) in a Figma text style. The level follows the page outline; the default look follows the
 * ladder, and textStyle sets it by the kind of content. A page title (h1, Heading/1), a section (h2, Heading/4 by
 * default) and a card title right under the page title (h2, always Heading/Subheading):
 *
 *   <Heading level={1}>Billing</Heading>
 *   <Heading level={2}>Invoices</Heading>
 *   <Heading level={2} textStyle="Heading/Subheading">Current plan</Heading>
 */
export function Heading({ level = 2, textStyle, tone = "strongest", truncate, align, verticalAlign, wrap = true, tabularNumbers = false, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf, className, style, children, ref, ...rest }: HeadingProps) {
  const Element = `h${level}` as const;
  const lines = truncate === true ? 1 : typeof truncate === "number" ? Math.max(1, Math.floor(truncate)) : undefined;
  const sizing = layoutSizing({ width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  return (
    <Element
      {...rest}
      ref={ref}
      className={["zen-text", "zen-heading", typographyStyles[textStyle ?? headingStyleByLevel[level]], className].filter(Boolean).join(" ")}
      data-tone={resolveContentTone(tone)}
      data-truncate={lines === undefined ? undefined : lines === 1 ? "line" : "lines"}
      data-align={align}
      data-valign={verticalAlign}
      data-wrap={wrap ? undefined : "false"}
      data-numbers={tabularNumbers ? "tabular" : undefined}
      {...sizing.attributes}
      style={withSizingVars(truncateStyle(lines, style), sizing.vars)}
    >
      {children}
    </Element>
  );
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

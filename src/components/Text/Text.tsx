import { Children, type HTMLAttributes, type ReactNode, type Ref } from "react";
import type { TypographyStyleName } from "../../tokens/typography.generated";
import { withSizingVars, type LayoutSizingProps } from "../Layout/sizing";
import "../Layout/layout.css";
import type { ContentTone } from "../_shared/contentTone";
import "../_shared/content-tone.css";
import "./text.css";
import { hasLineBreak, headingModel, textModel, type HeadingLevel, type TextAlign, type TextElement, type TextRootModel, type TextVerticalAlign } from "./model";

export { headingLevels, plural, textElements, textTones, type HeadingLevel, type TextAlign, type TextElement, type TextTone, type TextVerticalAlign } from "./model";

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

/** The root's style: Figma's resizing under the caller's `style`, the line clamp over it (model.ts). */
const rootStyle = (style: TextProps["style"], { vars, clamp }: TextRootModel) => withSizingVars(clamp ? { ...style, ...clamp } : style, vars);

/**
 * Figma text styles with Zen's content colours. Paragraphs, labels and inline copy; titles use <Heading>. Meta in
 * Body/Small takes tone "base"; Caption is always tone "light" (the user 2026-10-26; text on a Solid or Subtle fill follows
 * the fill).
 *
 *   <Text>Invite people to collaborate on this project.</Text>
 *   <Text textStyle="Body/Small/Regular" tone="base">Updated 2 min ago</Text>
 */
export function Text({ textStyle = "Body/Base/Regular", tone = "strongest", as: Element = "p", truncate, align, verticalAlign, wrap = true, tabularNumbers = false, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf, className, style, children, ref, ...rest }: TextProps) {
  const text = textModel({ textStyle, tone, truncate, align, verticalAlign, wrap, tabularNumbers, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf }, hasLineBreak(Children.toArray(children)));
  return (
    <Element {...rest} ref={ref as never} className={[text.className, className].filter(Boolean).join(" ")} {...text.attributes} style={rootStyle(style, text)}>
      {children}
    </Element>
  );
}

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
  const heading = headingModel({ level, textStyle, tone, truncate, align, verticalAlign, wrap, tabularNumbers, width, height, minWidth, maxWidth, minHeight, maxHeight, alignSelf });
  const Element = heading.tag;
  return (
    <Element {...rest} ref={ref} className={[heading.className, className].filter(Boolean).join(" ")} {...heading.attributes} style={rootStyle(style, heading)}>
      {children}
    </Element>
  );
}

import { type HTMLAttributes, type ReactNode, type Ref } from "react";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import { resolveContentTone, type ContentTone } from "../_shared/contentTone";
import "../_shared/content-tone.css";
import "./text.css";

export interface TextRunProps extends Omit<HTMLAttributes<HTMLSpanElement>, "color"> {
  /** Bold words (Figma's Bold weight on a range, ⌘B): the Bold emphasis token over the text style around it. */
  bold?: boolean;
  /** Italic words (Figma's Italic on a range, ⌘I). */
  italic?: boolean;
  /** Underlined words (Figma's Decoration: Underline, ⌘U). A link is a Link, not an underlined run. */
  underline?: boolean;
  /** Struck-through words (Figma's Decoration: Strikethrough, ⇧⌘X): an old price, a done item. */
  strikethrough?: boolean;
  /**
   * The words' colour role (Figma's fill on a range): a Color/Content token by its path ("accent-base",
   * "negative-base"). Unset keeps the Text's colour.
   */
  tone?: ContentTone;
  /**
   * Another Figma text style for these words (a range in Body/Base/Bold inside Body/Base/Regular, a Caption in a line).
   * Unset keeps the Text's style; prefer `bold` for weight alone.
   */
  textStyle?: TypographyStyleName;
  children?: ReactNode;
  /** Ref to the rendered span. */
  ref?: Ref<HTMLSpanElement>;
}

/**
 * Words with a style of their own inside a Text or Heading (Figma's mixed styles: a range made bold, italic,
 * underlined, struck through, coloured or set in another text style). It renders a span that keeps everything else from
 * the text around it (font, size, line height, colour), so a line reads as one text. A link inside a text is a Link.
 *
 *   <Text>Your plan renews on <TextRun bold>Nov 2</TextRun>. <TextRun tone="negative-base">2 seats</TextRun> are unpaid.</Text>
 */
export function TextRun({ bold = false, italic = false, underline = false, strikethrough = false, tone, textStyle, className, children, ref, ...rest }: TextRunProps) {
  const decoration = [underline ? "underline" : "", strikethrough ? "strikethrough" : ""].filter(Boolean).join(" ") || undefined;
  return (
    <span
      {...rest}
      ref={ref}
      className={["zen-text-run", textStyle ? typographyStyles[textStyle] : "", className].filter(Boolean).join(" ")}
      data-bold={bold ? "true" : undefined}
      data-italic={italic ? "true" : undefined}
      data-decoration={decoration}
      data-tone={tone ? resolveContentTone(tone) : undefined}
    >
      {children}
    </span>
  );
}

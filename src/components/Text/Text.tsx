import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import "./text.css";

/**
 * Text colour roles (Figma Color/Content). Neutral text: `strongest` (primary), `base` (secondary), `light`
 * (tertiary); `primary` / `secondary` / `tertiary` are aliases. Colour families use their Base token, which is safe on
 * the family's Subtle background (docs/component-usage-rules.md §7). `on-colors` is text on a Solid fill.
 */
export const textTones = ["strongest", "base", "light", "primary", "secondary", "tertiary", "accent", "info", "positive", "negative", "warning", "inverse", "on-colors", "disabled", "inherit"] as const;
export type TextTone = (typeof textTones)[number];

export const textElements = ["p", "span", "div", "strong", "em", "small", "label", "li", "dt", "dd", "figcaption", "legend", "code", "time"] as const;
export type TextElement = (typeof textElements)[number];

export interface TextProps extends Omit<HTMLAttributes<HTMLElement>, "color"> {
  /** Figma text style, e.g. "Body/Base/Regular" (default), "Body/Small/Medium", "Caption/Regular", "Heading/4". */
  textStyle?: TypographyStyleName;
  /** Colour role. Default strongest (primary text). */
  tone?: TextTone;
  /** Element to render. Default p (a block); use span inside a line, label for a form label. */
  as?: TextElement;
  /** true: one line with an ellipsis; a number: clamp to that many lines. The full text stays in the DOM. */
  truncate?: boolean | number;
  align?: "start" | "center" | "end";
  /** For `as="label"`. */
  htmlFor?: string;
  children?: ReactNode;
}

const toneAlias: Partial<Record<TextTone, TextTone>> = { primary: "strongest", secondary: "base", tertiary: "light" };

function truncateStyle(truncate: TextProps["truncate"], style: CSSProperties | undefined): CSSProperties | undefined {
  if (typeof truncate !== "number" || truncate < 2) return style;
  return { ...style, ["--zen-text-lines" as string]: truncate };
}

/**
 * Figma text styles with Zen's content colours. Paragraphs, labels and inline copy; titles use <Heading>.
 *
 *   <Text>Invite people to collaborate on this project.</Text>
 *   <Text textStyle="Body/Small/Regular" tone="base">Updated 2 min ago</Text>
 */
export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { textStyle = "Body/Base/Regular", tone = "strongest", as: Element = "p", truncate, align, className, style, children, ...rest },
  ref,
) {
  const lines = truncate === true ? 1 : typeof truncate === "number" ? Math.max(1, Math.floor(truncate)) : undefined;
  return (
    <Element
      {...rest}
      ref={ref as never}
      className={["zen-text", typographyStyles[textStyle], className].filter(Boolean).join(" ")}
      data-tone={toneAlias[tone] ?? tone}
      data-truncate={lines === undefined ? undefined : lines === 1 ? "line" : "lines"}
      data-align={align}
      style={truncateStyle(lines, style)}
    >
      {children}
    </Element>
  );
});

export const headingLevels = [1, 2, 3, 4, 5, 6] as const;
export type HeadingLevel = (typeof headingLevels)[number];

/** Default Figma style per heading level (dashboard/popular/mobile typography modes resize them). */
const headingStyleByLevel: Record<HeadingLevel, TypographyStyleName> = {
  1: "Heading/1",
  2: "Heading/2",
  3: "Heading/3",
  4: "Heading/4",
  5: "Heading/Subheading",
  6: "Body/Base/Bold",
};

export interface HeadingProps extends Omit<HTMLAttributes<HTMLHeadingElement>, "color"> {
  /** Document level (h1–h6): pick it from the page outline, not from the size. Default 2. */
  level?: HeadingLevel;
  /** Visual style; defaults to the level's style (1 → Heading/1 … 4 → Heading/4, 5 → Heading/Subheading). An h1 — the
   *  page title — always stays Heading/1 (harness: heading/h1-is-heading-1); lower levels may take another style. */
  textStyle?: TypographyStyleName;
  tone?: TextTone;
  truncate?: boolean | number;
  align?: "start" | "center" | "end";
  children?: ReactNode;
}

/**
 * A real heading (h1–h6) in a Figma text style. The level follows the page outline; the look can differ:
 *
 *   <Heading level={2} textStyle="Heading/Subheading">Team members</Heading>
 */
export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { level = 2, textStyle, tone = "strongest", truncate, align, className, style, children, ...rest },
  ref,
) {
  const Element = `h${level}` as const;
  const lines = truncate === true ? 1 : typeof truncate === "number" ? Math.max(1, Math.floor(truncate)) : undefined;
  return (
    <Element
      {...rest}
      ref={ref}
      className={["zen-text", "zen-heading", typographyStyles[textStyle ?? headingStyleByLevel[level]], className].filter(Boolean).join(" ")}
      data-tone={toneAlias[tone] ?? tone}
      data-truncate={lines === undefined ? undefined : lines === 1 ? "line" : "lines"}
      data-align={align}
      style={truncateStyle(lines, style)}
    >
      {children}
    </Element>
  );
});

/** "1 file", "3 files". Counts in UI copy are pluralised (harness copy/plural-count). */
export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

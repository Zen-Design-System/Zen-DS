import { useId, useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { scaleKey } from "../_shared/scale";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import "./accordion.css";
import "../Icon/core";

export const accordionSizes = ["medium", "large", "xlarge"] as const;
export const accordionThemes = ["divider", "box"] as const;
export const accordionContentWidths = ["title", "full"] as const;
/** CSS / Figma key (the `data-size` value). */
type AccordionSizeKey = (typeof accordionSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type AccordionSize = "md" | "lg" | "xl" | "medium" | "large" | "xlarge";
export type AccordionTheme = (typeof accordionThemes)[number];
export type AccordionContentWidth = (typeof accordionContentWidths)[number];

/** Figma .Primitives/Accordion/Content Title text style per size. */
const titleStyle: Record<AccordionSizeKey, TypographyStyleName> = {
  medium: "Heading/Subheading",
  large: "Heading/4",
  xlarge: "Heading/3",
};

export interface AccordionProps {
  title: ReactNode;
  /**
   * Heading level around the header button (WAI-ARIA APG Accordion: `<h{n}><button>`), default 3. Take it from where
   * the accordion sits: one level below the nearest heading above (2 directly under the page h1, 3 under an h2
   * section, 4 inside an h3 card). Only the tag changes; the look follows `size`. Pick the size so the title is never
   * larger than the heading it sits under: Medium (Heading/Subheading) and Large (Heading/4) fit under an h2 section;
   * XLarge (Heading/3) only directly under the page h1.
   */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Content slot (Figma .Primitives/Accordion/Content/Text is Body/Base/Regular, Neutral/Base). */
  children?: ReactNode;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: AccordionSize;
  /**
   * Divider: bottom Border/Neutral/Subtle rule; the whole header row, its block padding included, is the toggle. Box:
   * Support/Neutral/Pale surface with radius (Corner-Radius/Large, XLarge 2XLarge); the whole box header is the toggle,
   * and its focus ring is concentric with the box corner.
   */
  theme?: AccordionTheme;
  /**
   * Where the content column ends. title (default, Figma): at the end of the title, before the chevron column, which keeps
   * text lines short. full: under the chevron too, to the box padding (Box) or the row's end (Divider), for rows with
   * end-aligned values (a receipt, specs, a DescriptionList or a List with trailing values), so the values line up with
   * the edge instead of stopping before an empty column. Figma Content Width=Title|Full (added 2026-10-03).
   */
  contentWidth?: AccordionContentWidth;
  /** Controlled open state (Figma Expanded). */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

/**
 * Figma Accordion/Text (239:16847): Size XLarge/Large/Medium × Theme Divider/Box × Expanded.
 * The whole header row is the toggle button, wrapped in an `h{headingLevel}` so the outline lists every section;
 * the chevron turns 180° when expanded and the panel height animates open (disabled for reduced motion).
 * Theme=Divider: the root keeps Figma's block padding and a hit layer on the trigger covers it (open: down to the
 * content only), so a press anywhere on the header row toggles, as in Box; the layout and focus ring are unchanged.
 * Theme=Box: the trigger covers the whole box header, not just the title line. The box padding (Padding/Medium,
 * XLarge Padding/XLarge) splits into a box inset of padding − header gap and a trigger padding of the header gap, so the
 * layout matches Figma; the trigger radius is box radius − inset (concentric corners), and the focus ring sits inside it.
 */
export function Accordion({ title, headingLevel = 3, children, size: sizeProp = "md", theme = "divider", contentWidth = "title", expanded, defaultExpanded = false, onExpandedChange, className }: AccordionProps) {
  const size = scaleKey(sizeProp, accordionSizes);
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;
  const id = useId();
  const panelId = `${id}-panel`;
  const triggerId = `${id}-trigger`;
  const toggle = () => {
    if (expanded === undefined) setInternalExpanded(!isExpanded);
    onExpandedChange?.(!isExpanded);
  };
  return (
    <div className={["zen-accordion", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} data-content-width={contentWidth === "full" ? "full" : undefined} data-expanded={isExpanded ? "true" : "false"}>
      <Heading className="zen-accordion__heading">
        <button id={triggerId} type="button" className="zen-accordion__trigger" aria-expanded={isExpanded} aria-controls={panelId} onClick={toggle}>
          <span className={`zen-accordion__title ${typographyStyles[titleStyle[size]]}`}>{title}</span>
          <span className="zen-accordion__icon" aria-hidden="true"><Icon name="icon-chevron-down-line" decorative /></span>
        </button>
      </Heading>
      <div id={panelId} className="zen-accordion__panel" role="region" aria-labelledby={triggerId} inert={!isExpanded || undefined}>
        <div className="zen-accordion__panel-inner">
          <div className={`zen-accordion__content ${typographyStyles["Body/Base/Regular"]}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

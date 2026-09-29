import { useId, useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { scaleKey } from "../_shared/scale";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import "./accordion.css";
import "../Icon/core";

export const accordionSizes = ["medium", "large", "xlarge"] as const;
export const accordionThemes = ["divider", "box"] as const;
/** CSS / Figma key (the `data-size` value). */
type AccordionSizeKey = (typeof accordionSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type AccordionSize = "md" | "lg" | "xl" | "medium" | "large" | "xlarge";
export type AccordionTheme = (typeof accordionThemes)[number];

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
  /** Divider: bottom Border/Neutral/Subtle rule; Box: Support/Neutral/Pale surface with radius. */
  theme?: AccordionTheme;
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
 */
export function Accordion({ title, headingLevel = 3, children, size: sizeProp = "md", theme = "divider", expanded, defaultExpanded = false, onExpandedChange, className }: AccordionProps) {
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
    <div className={["zen-accordion", className].filter(Boolean).join(" ")} data-size={size} data-tone={theme} data-expanded={isExpanded ? "true" : "false"}>
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

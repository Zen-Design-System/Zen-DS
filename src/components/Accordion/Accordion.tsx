import { useId, useState, type ReactNode } from "react";
import { Icon } from "../Icon";
import { typographyStyles, type TypographyStyleName } from "../../tokens/typography.generated";
import "./accordion.css";

export const accordionSizes = ["medium", "large", "xlarge"] as const;
export const accordionThemes = ["divider", "box"] as const;
export type AccordionSize = (typeof accordionSizes)[number];
export type AccordionTheme = (typeof accordionThemes)[number];

/** Figma .Primitives/Accordion/Content Title text style per size. */
const titleStyle: Record<AccordionSize, TypographyStyleName> = {
  medium: "Heading/Subheading",
  large: "Heading/4",
  xlarge: "Heading/3",
};

export interface AccordionProps {
  title: ReactNode;
  /** Content slot (Figma .Primitives/Accordion/Content/Text is Body/Base/Regular, Neutral/Base). */
  children?: ReactNode;
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
 * The whole header row is the toggle button; the chevron turns 180° when expanded and the panel
 * height animates open (disabled for reduced motion).
 */
export function Accordion({ title, children, size = "medium", theme = "divider", expanded, defaultExpanded = false, onExpandedChange, className }: AccordionProps) {
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
    <div className={["zen-accordion", className].filter(Boolean).join(" ")} data-size={size} data-theme={theme} data-expanded={isExpanded ? "true" : "false"}>
      <button id={triggerId} type="button" className="zen-accordion__trigger" aria-expanded={isExpanded} aria-controls={panelId} onClick={toggle}>
        <span className={`zen-accordion__title ${typographyStyles[titleStyle[size]]}`}>{title}</span>
        <span className="zen-accordion__icon" aria-hidden="true"><Icon name="icon-chevron-down-line" decorative /></span>
      </button>
      <div id={panelId} className="zen-accordion__panel" role="region" aria-labelledby={triggerId} inert={!isExpanded || undefined}>
        <div className="zen-accordion__panel-inner">
          <div className={`zen-accordion__content ${typographyStyles["Body/Base/Regular"]}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

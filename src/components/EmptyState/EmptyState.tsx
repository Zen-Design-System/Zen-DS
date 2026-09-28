import type { HTMLAttributes, ReactElement, ReactNode, Ref } from "react";
import { Button, type ButtonLevel } from "../Button";
import type { IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./empty-state.css";
import "../Icon/core";

export interface EmptyStateAction {
  label: ReactNode;
  onClick?: () => void;
  /** Button level; defaults to primary for `primaryAction` and tertiary for `secondaryAction`. */
  level?: ButtonLevel;
}

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root `<section>`. */
export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** The root `<section>`. */
  ref?: Ref<HTMLElement>;
  /** Figma Title (Heading/4). */
  title: ReactNode;
  /** Heading level of the title (default 3 → `<h3>`); only the tag changes, the text style stays Heading/4. */
  headingLevel?: 2 | 3 | 4 | 5 | 6;
  /** Figma Caption (Body/Base/Regular, Content/Neutral/Light). */
  children?: ReactNode;
  /** Figma Illustration: `true` renders the placeholder with `icon`; pass a node for your own art; `false` hides it. */
  illustration?: boolean | ReactNode;
  /** Icon at the centre of the placeholder illustration: an icon name or an icon element. */
  icon?: IconName | ReactElement;
  /** Figma CTA Primary: Button/Main Medium Primary, full width. */
  primaryAction?: EmptyStateAction;
  /** Figma CTA Secondary: Button/Main Medium Tertiary, full width. */
  secondaryAction?: EmptyStateAction;
  className?: string;
}

/** Figma Empty-State/Illustration/Placeholder (6085:25816): a faded grid, a dashed and a solid circle, and an icon. */
export function EmptyStateIllustration({ icon = "icon-user-circle-line" }: { icon?: IconName | ReactElement }) {
  return (
    <span className="zen-empty-state__illustration" aria-hidden="true">
      <svg viewBox="0 0 240 240" width="240" height="240" className="zen-empty-state__art">
        <g className="zen-empty-state__grid">
          {[40, 93, 146, 199].map((x) => <line key={`v${x}`} x1={x} x2={x} y1={40} y2={200} />)}
          {[60, 100, 140, 180].map((y) => <line key={`h${y}`} x1={20} x2={220} y1={y} y2={y} />)}
        </g>
        <circle className="zen-empty-state__ghost" cx={90} cy={110} r={49} />
        <circle className="zen-empty-state__ring" cx={146} cy={120} r={49} />
        <circle className="zen-empty-state__well" cx={146} cy={120} r={40} />
      </svg>
      <span className="zen-empty-state__icon">{renderIcon(icon)}</span>
    </span>
  );
}

/**
 * Figma Empty-State (6085:25796): 320px centred column — illustration (240), gap XSmall, then the content wrapper
 * (gap XLarge) of Title + Caption (gap 4) and the CTAs (full-width Primary + Tertiary, gap Small); padding-bottom 4XLarge.
 */
export function EmptyState({ ref, title, headingLevel = 3, children, illustration = true, icon, primaryAction, secondaryAction, className, ...rest }: EmptyStateProps) {
  const art = illustration === true ? <EmptyStateIllustration icon={icon} /> : illustration || null;
  const hasActions = Boolean(primaryAction || secondaryAction);
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4" | "h5" | "h6";
  return (
    <section {...rest} ref={ref} className={["zen-empty-state", className].filter(Boolean).join(" ")}>
      {art}
      <div className="zen-empty-state__body">
        <div className="zen-empty-state__content">
          <Heading className={`zen-empty-state__title ${typographyStyles["Heading/4"]}`}>{title}</Heading>
          {children ? <p className={`zen-empty-state__caption ${typographyStyles["Body/Base/Regular"]}`}>{children}</p> : null}
        </div>
        {hasActions ? (
          <div className="zen-empty-state__actions">
            {primaryAction ? <Button appearance="main" level={primaryAction.level ?? "primary"} size="md" onClick={primaryAction.onClick}>{primaryAction.label}</Button> : null}
            {secondaryAction ? <Button appearance="main" level={secondaryAction.level ?? "tertiary"} size="md" onClick={secondaryAction.onClick}>{secondaryAction.label}</Button> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

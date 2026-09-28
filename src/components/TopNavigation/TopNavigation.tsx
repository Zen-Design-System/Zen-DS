import type { ReactElement, ReactNode } from "react";
import type { IconName } from "../Icon";
import { usePresence } from "../Motion";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./top-navigation.css";
import "../Icon/core";

/**
 * Figma Top-Navigation/Mobile (12014:45167) Type. Each type pairs a background with a Nav-Action style:
 * - default · alt: Surface/Default · Surface/Alt + Nav-Action/Icon-Main Tertiary (44px, bordered).
 * - default-blurring · alt-blurring: the surface fading to transparent (…-Bluring-End) + background blur, Tertiary actions.
 * - liquid-glass: Alt blurring + Nav-Action/Liquid-Glass actions.
 * - default-overlay · liquid-overlay: a Black-Overlay gradient over media + Liquid-Glass Black-Overlay actions, white content.
 * - compact · compact-alt · compact-overlay: the same backgrounds with Nav-Action/Flat (icon-only) actions.
 */
/** Figma Type=*-Bluring / Liquid Glass / *-Overlay: BACKGROUND_BLUR blurType=PROGRESSIVE, start radius at the top edge
 *  (Default-Bluring 10, the rest 20) → 0 at the bottom edge, under the gradient fill. */
const PROGRESSIVE_TYPES = new Set<string>(["default-blurring", "alt-blurring", "liquid-glass", "default-overlay", "liquid-overlay", "compact-overlay"]);

export const topNavigationTypes = ["default", "alt", "default-blurring", "alt-blurring", "liquid-glass", "default-overlay", "liquid-overlay", "compact", "compact-alt", "compact-overlay"] as const;
export type TopNavigationType = (typeof topNavigationTypes)[number];
/** Figma Margin: Comfortable (20px sides) · Compact (16px sides). */
export type TopNavigationMargin = "comfortable" | "compact";
/** Figma .Primitives/Heading-Text/Basic Type for the expanded heading: H1 · H2 · H3. */
export type TopNavigationHeading = "h1" | "h2" | "h3";

export interface TopNavigationAction {
  /** An icon name (drawn at 24px) or an element. */
  icon: IconName | ReactElement;
  /** Accessible name (the action is icon-only). */
  label: string;
  onClick?: () => void;
  /** Figma Noti-Dot: an 8px Negative dot with a 2px Border/Inverse ring. */
  dot?: boolean;
  disabled?: boolean;
}

export interface TopNavigationProps {
  type?: TopNavigationType;
  margin?: TopNavigationMargin;
  /**
   * Figma Heading-Text Type=Sub with Subheading / Leading (◆ Social conversation header): with either set, the bar title
   * becomes a left-aligned identity — a 48px `titleLeading` visual (Avatar / ChatAvatarGroup), gap 12, the title in
   * Body/Extra/Bold over the subtitle in Caption/Regular (Neutral/Light), gap 2.
   */
  subtitle?: ReactNode;
  titleLeading?: ReactNode;
  /** Makes the identity a button (open the profile / group info). */
  onTitleClick?: () => void;
  titleLabel?: string;
  /** Figma Nav-Action/Icon-Main with a trailing icon: the trailing actions share one Tertiary pill (e.g. audio + video call). */
  trailingGroup?: boolean;
  /** Figma Top-Heading-Text (Type=Sub, Body/Extra/Bold), centred in the navigator bar. Shown when collapsed or when there is no large title. */
  title?: ReactNode;
  /** Figma Expand-Heading (Heading/1–3) under the navigator bar. */
  largeTitle?: ReactNode;
  headingLevel?: TopNavigationHeading;
  /** Figma Top-Leading: an action (usually Back) or a visual (e.g. an Avatar). */
  leading?: TopNavigationAction | ReactNode;
  /** Figma Top-Trailing: up to two actions. */
  trailing?: TopNavigationAction[];
  /** Figma Expand-Trailing: one action beside the large title. */
  largeTitleAction?: TopNavigationAction;
  /** Figma Control-Bar slot (48px): a Search, Segmented or Tabs under the heading. */
  controlBar?: ReactNode;
  /**
   * For a Search control bar: while `collapsed`, the bar folds away and this Search action appears at the start of the
   * trailing slot (top-right); it leaves again when the bar expands. Its `onClick` usually scrolls back up and focuses
   * the field. Counts toward the two trailing actions, so keep at most one other. `label` defaults to the locale's
   * “Search”, `icon` to icon-search-medium-line (an icon name or an element).
   */
  searchAction?: { onClick: () => void; label?: string; icon?: IconName | ReactElement };
  /** Scrolled state: hides the large title and shows `title` (or the large title) in the navigator bar. */
  collapsed?: boolean;
  /** Stick to the top of the scroll container. */
  sticky?: boolean;
  "aria-label"?: string;
  className?: string;
}

const isAction = (value: unknown): value is TopNavigationAction => typeof value === "object" && value !== null && "icon" in value && "label" in value;

const actionStyleFor = (type: TopNavigationType) =>
  type.startsWith("compact") ? "flat" : type === "liquid-glass" ? "glass" : type === "default-overlay" || type === "liquid-overlay" ? "glass-dark" : "default";

/** Figma Nav-Action (Icon-Main Tertiary · Flat · Liquid-Glass): a 44px circle with a 24px icon. */
export function TopNavigationActionButton({ action, variant, className, state }: { action: TopNavigationAction; variant: string; className?: string; state?: "open" | "closing" }) {
  // Icon-only: the label shows as a tooltip after 1s hover (Zen rule); below the bar so it never covers the status bar.
  const tip = useIconTooltip(state === "closing" ? false : action.label, { placement: "bottom" });
  return (
    <button type="button" className={["zen-top-nav__action", className].filter(Boolean).join(" ")} data-style={variant} data-state={state} aria-label={action.label} disabled={action.disabled} {...tip.bind({ onClick: action.onClick })}>
      {renderIcon(action.icon)}
      {action.dot ? <span className="zen-top-nav__dot" aria-hidden="true" /> : null}
      {tip.tooltip}
    </button>
  );
}

/**
 * Figma Top-Navigation/Mobile (12014:45167, page ❖ Top-Navigations): a 64px navigator bar (Top-Leading 44px action ·
 * centred Sub heading · Top-Trailing) over an optional 64px Expand-Heading (H1–H3 + one action) and a Control-Bar slot.
 * The OS status bar is not part of the component; leave room for it with `env(safe-area-inset-top)`.
 */
export function TopNavigation({ type = "default", margin = "comfortable", subtitle, titleLeading, onTitleClick, titleLabel, trailingGroup = false, title, largeTitle, headingLevel = "h1", leading, trailing = [], largeTitleAction, controlBar, searchAction, collapsed = false, sticky = false, "aria-label": ariaLabel, className }: TopNavigationProps) {
  const t = useZenLabels();
  const variant = actionStyleFor(type);
  const identity = Boolean(subtitle || titleLeading);
  const showLarge = Boolean(largeTitle) && !collapsed;
  const barTitle = title ?? (collapsed ? largeTitle : undefined);
  const Heading = headingLevel;
  const headingStyle = headingLevel === "h1" ? "Heading/1" : headingLevel === "h2" ? "Heading/2" : "Heading/3";
  const progressive = PROGRESSIVE_TYPES.has(type);
  // Search control bar ⇄ trailing Search action: the bar shows while expanded, the action while collapsed.
  const foldsSearch = Boolean(searchAction && controlBar);
  const search = usePresence(foldsSearch && collapsed, 120);
  const searchButton: TopNavigationAction | null = searchAction ? { icon: searchAction.icon ?? "icon-search-medium-line", label: searchAction.label ?? t.search, onClick: searchAction.onClick } : null;
  return (
    <header className={["zen-top-nav", className].filter(Boolean).join(" ")} data-type={type} data-margin={margin} data-collapsed={collapsed ? "true" : undefined} data-sticky={sticky ? "true" : undefined} aria-label={ariaLabel}>
      {progressive ? <span className="zen-top-nav__progressive" aria-hidden="true"><i /><i /><i /><i /><i /></span> : null}
      <div className="zen-top-nav__bar">
        <div className="zen-top-nav__leading">
          {isAction(leading) ? <TopNavigationActionButton action={leading} variant={variant} /> : leading}
        </div>
        {identity ? (() => {
          const content = (
            <>
              {titleLeading ? <span className="zen-top-nav__identity-leading">{titleLeading}</span> : null}
              <span className="zen-top-nav__identity-text">
                <span className={`zen-top-nav__identity-title ${typographyStyles["Body/Extra/Bold"]}`}>{barTitle}</span>
                {subtitle ? <span className={`zen-top-nav__identity-subtitle ${typographyStyles["Caption/Regular"]}`}>{subtitle}</span> : null}
              </span>
            </>
          );
          return onTitleClick
            ? <button type="button" className="zen-top-nav__identity" onClick={onTitleClick} aria-label={titleLabel}>{content}</button>
            : <div className="zen-top-nav__identity">{content}</div>;
        })() : (
          <div className={`zen-top-nav__title ${typographyStyles["Body/Extra/Bold"]}`} data-visible={barTitle && (!largeTitle || collapsed) ? "true" : "false"} aria-hidden={barTitle && (!largeTitle || collapsed) ? undefined : true}>
            {barTitle}
          </div>
        )}
        <div className="zen-top-nav__trailing">
          {search.mounted && searchButton ? <TopNavigationActionButton action={searchButton} variant={variant} className="zen-top-nav__search" state={search.phase} /> : null}
          {trailingGroup && trailing.length > 1 && !(search.mounted && searchButton)
            ? <span className="zen-top-nav__group" role="group">{trailing.slice(0, 2).map((action) => <TopNavigationActionButton key={action.label} action={action} variant="flat-group" />)}</span>
            : trailing.slice(0, search.mounted && searchButton ? 1 : 2).map((action) => <TopNavigationActionButton key={action.label} action={action} variant={variant} />)}
        </div>
      </div>
      {showLarge ? (
        <div className="zen-top-nav__expand">
          <Heading className={`zen-top-nav__heading ${typographyStyles[headingStyle]}`} data-level={headingLevel}>{largeTitle}</Heading>
          {largeTitleAction ? <div className="zen-top-nav__expand-trailing"><TopNavigationActionButton action={largeTitleAction} variant={variant} /></div> : null}
        </div>
      ) : null}
      {controlBar && !(foldsSearch && collapsed) ? <div className="zen-top-nav__control">{controlBar}</div> : null}
    </header>
  );
}

import type { ButtonHTMLAttributes, ReactElement } from "react";
import type { IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { renderIcon } from "../_shared/icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./bottom-navigation.css";

/** Figma Bottom-Navigation/Mobile: Default (full-width bar) · Floating (Surface/Glass pill) · Floating-Glass (Liquid-Glass pill). */
export type BottomNavigationType = "default" | "floating" | "floating-glass";
/** Figma item Theme colour family. */
export type BottomNavigationTheme = "neutral" | "accent";
/** Floating item selection style (Figma Theme Neutral · Neutral-Surface · Neutral-Solid, and the Accent equivalents). */
export type BottomNavigationSelection = "subtle" | "surface" | "solid";
/** Figma .Primitives/Bottom-Navigation Theme for the floating action (Default · Primary · Accent; Glass on Floating-Glass). */
export type BottomNavigationActionTheme = "default" | "primary" | "accent";

export interface BottomNavigationItem {
  id: string;
  label: string;
  /** The destination's icon: an icon name (drawn at 24px) or an element. */
  icon: IconName | ReactElement;
  /** Icon for the selected state (e.g. the solid glyph). Defaults to `icon`. */
  selectedIcon?: IconName | ReactElement;
  /** Figma Noti: 8px Negative dot with a 2px Border/Inverse ring. */
  dot?: boolean;
}

export interface BottomNavigationAction {
  /** An icon name (drawn at 24px) or an element. */
  icon: IconName | ReactElement;
  label: string;
  onClick?: () => void;
  theme?: BottomNavigationActionTheme;
}

export interface BottomNavigationProps {
  items: BottomNavigationItem[];
  value: string;
  onValueChange: (id: string) => void;
  type?: BottomNavigationType;
  theme?: BottomNavigationTheme;
  selection?: BottomNavigationSelection;
  /** Figma Label (Label/Small/Medium; Bold when selected on Floating). Off by default, like Figma; the label is still the accessible name. */
  showLabels?: boolean;
  /** Default: a 48px Primary/Accent action item in the bar (Type=Action). Floating: a separate 64px floating button. */
  action?: BottomNavigationAction;
  /** Pin to the bottom of the viewport / scroll container. */
  fixed?: boolean;
  /** Floating types: what sits behind the pill. `surface` (Figma) fades transparent → Surface/Default for plain screens; `none` keeps only the progressive blur, for photos and video where a Surface band would show as a white strip. */
  backdrop?: "surface" | "none";
  /** Accessible name of the navigation landmark. Default: the locale's “Main”. */
  "aria-label"?: string;
  className?: string;
}

/** An icon-only nav button that shows its name as a tooltip after 1s hover (Zen rule); `tip={false}` when a label is visible. */
function TipButton({ tip, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tip: string | false }) {
  const tooltip = useIconTooltip(tip);
  return <button type="button" {...tooltip.bind(props)}>{children}{tooltip.tooltip}</button>;
}

/**
 * Figma Bottom-Navigation (page ❖ Bottom-Navigations, 7042:38507): 3–5 root destinations.
 * Default: Surface/Default bar, 56px items (24px icon, Content/Placeholder → Neutral/Strongest or Accent/Base when selected).
 * Floating: a 4px-padded pill (Surface/Glass + glass border + Effect/Popover) of 56px round items, selected on
 * Active/Subtle · Surface (+ Shadow/Bottom/Level-1) · Active/Solid, with an optional 64px floating action beside it.
 * Floating types sit on a transparent → Surface fade with Figma's PROGRESSIVE background blur (radius 24): 0 at the top
 * edge, strongest at the bottom — the mirror of the Top Navigation blur.
 * The home indicator is the OS's; the bar pads `env(safe-area-inset-bottom)`.
 */
export function BottomNavigation({ items, value, onValueChange, type = "default", theme = "neutral", selection: selectionProp, showLabels = false, action, fixed = false, backdrop = "surface", "aria-label": ariaLabelProp, className }: BottomNavigationProps) {
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.mainTabs;
  // Figma defaults: Floating selects on Surface (Neutral-Surface), Floating-Glass on Active/Subtle (Neutral).
  const selection = selectionProp ?? (type === "floating-glass" ? "subtle" : "surface");
  const floating = type !== "default";
  const actionTheme = action?.theme ?? (floating ? "default" : "primary");
  const actionButton = action ? (
    <TipButton tip={action.label} className={floating ? "zen-bottom-nav__fab" : "zen-bottom-nav__action"} data-tone={actionTheme} aria-label={action.label} onClick={action.onClick}>
      {renderIcon(action.icon)}
    </TipButton>
  ) : null;
  const list = (
    <ul className="zen-bottom-nav__items">
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <li key={item.id} className="zen-bottom-nav__cell">
            <TipButton tip={showLabels ? false : item.label} className="zen-bottom-nav__item" aria-current={selected ? "page" : undefined} aria-label={showLabels ? undefined : item.label} data-selected={selected ? "true" : "false"} onClick={() => onValueChange(item.id)}>
              <span className="zen-bottom-nav__icon">
                {renderIcon(selected && item.selectedIcon ? item.selectedIcon : item.icon)}
                {item.dot ? <span className="zen-bottom-nav__dot" aria-hidden="true" /> : null}
              </span>
              {showLabels ? <span className={`zen-bottom-nav__label ${typographyStyles[floating && selected ? "Label/Small/Bold" : "Label/Small/Medium"]}`}>{item.label}</span> : null}
            </TipButton>
          </li>
        );
      })}
      {!floating && actionButton ? <li className="zen-bottom-nav__cell">{actionButton}</li> : null}
    </ul>
  );
  return (
    <nav className={["zen-bottom-nav", className].filter(Boolean).join(" ")} aria-label={ariaLabel} data-type={type} data-tone={theme} data-selection={selection} data-labels={showLabels ? "true" : undefined} data-fixed={fixed ? "true" : undefined} data-backdrop={floating && backdrop === "none" ? "none" : undefined}>
      {/* Floating types: Figma progressive background blur, strongest at the bottom edge (see bottom-navigation.css). */}
      {floating ? <span className="zen-bottom-nav__progressive" aria-hidden="true"><i /><i /><i /><i /><i /></span> : null}
      {floating ? <div className="zen-bottom-nav__row"><div className="zen-bottom-nav__pill">{list}</div>{actionButton}</div> : list}
    </nav>
  );
}

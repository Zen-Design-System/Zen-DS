import { isValidElement, type HTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, type Ref } from "react";
import { IconButton } from "../Button";
import type { IconName } from "../Icon";
import { scaleKey } from "../_shared/scale";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { layoutSizing, withSizingVars, type LayoutWidthProps } from "../Layout/sizing";
import "./card.css";
import "../Icon/core";

export const cardThemes = ["shadow", "flat", "pale", "border", "on-container"] as const;
export const cardSpacings = ["medium", "small"] as const;
/** A Figma Card theme. `semi-pale` still type-checks but is deprecated: Figma dropped its gradient themes
 * (2026-10-14) and the card renders it as `pale`. */
export type CardTheme = (typeof cardThemes)[number] | "semi-pale";
/** CSS / Figma key (the `data-spacing` value). */
type CardSpacingKey = (typeof cardSpacings)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type CardSpacing = "md" | "sm" | "medium" | "small";
/** Layer 2 fill of Shadow / Flat / Border cards: default on a Canvas/Default page, alt to suit a Canvas/Alt (white) page. */
export type CardSurface = "default" | "alt";

export interface CardSubAction {
  label: string;
  /** Icon name (default `icon-dots-vertical-line`, Figma 1460:13) or an icon element. */
  icon?: IconName | ReactElement;
  onClick?: () => void;
}

const isSubActionConfig = (value: unknown): value is CardSubAction => typeof value === "object" && value !== null && !isValidElement(value) && "label" in value;

/**
 * Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root element. `width`, `minWidth`, `maxWidth`
 * and `alignSelf` size the card as Figma auto layout sizes an instance (Fill container, a max width…), as on Stack.
 */
export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "onClick">, LayoutWidthProps {
  /** The root element. */
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
  /** Figma Theme: Shadow (Shadow/Bottom/Level-1) · Flat · Pale (Support/Neutral/Pale + Effect/Overlay blur) · Border ·
   *  On-Container (Surface/Flat: a card inside a Modal, Side Panel or Bottom Sheet, on their Container fill; harness
   *  card/on-container-in-overlay). `semi-pale` is deprecated (no gradients in Figma since 2026-10-14) and renders as pale. */
  theme?: CardTheme;
  /** Figma Spacing: Medium (Card-padding-medium, Corner-Radius/2XLarge) · Small (Card-padding-small, Corner-Radius/Large). Short (sm, md…) or Figma (small, medium…) spelling. */
  spacing?: CardSpacing;
  /** Figma Active=Yes: the selected card — Surface fill with a 2px Card/Border/Active stroke. */
  selected?: boolean;
  /**
   * Figma Active=Yes (the selected card).
   * @deprecated Use selected.
   */
  active?: boolean;
  /** Surface/Default or Surface/Alt, chosen to suit the page's Canvas. Unset follows an inherited --zen-card-surface
   *  (a page scope can set it once), else Surface/Default. Pale / On-Container keep their own fill. With theme="shadow",
   *  `alt` drops the drop shadow (Surface-Alt never casts one, §9) and the card renders as Figma Theme=Flat (6643:51018)
   *  on Surface/Alt; an inherited alt surface cannot do this, so pass surface="alt" explicitly on an alt page. */
  surface?: CardSurface;
  /** Makes the whole card one action (role=button, Enter/Space). Keep other controls out of clickable cards. */
  onClick?: (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void;
  /** Accessible name for a clickable card when its content does not start with a clear title. */
  "aria-label"?: string;
  /** Figma Sub-Action: an absolute layer over the top-right corner holding Button/Icon-Flat Small Secondary (default ⋮).
   *  It takes no room: the Content slot keeps the full width. A node (e.g. a Menu) should use the same trigger. */
  subAction?: CardSubAction | ReactNode;
  as?: "div" | "article" | "section" | "li";
  className?: string;
  /** Figma instance overrides: props of the Zen components the card draws itself, by layer (`{ "Sub-Action": { level:
   *  "primary" } }`, `"Sub-Action/Leading-Icon"` one level deeper). Written by Zen Studio; app code sets `subAction`. */
  overrides?: NestedOverrides;
}

/**
 * Figma Card (6643:51021): a Content slot on one of six surfaces, padded Card-padding-medium/small.
 * A clickable card is an actionable container: Border theme steps its stroke up to Border/Neutral/Subtle (§6).
 */
export function Card({ ref, children, theme = "shadow", spacing: spacingProp = "md", selected, active: activeProp, surface, onClick, onKeyDown, "aria-label": ariaLabel, subAction, as: Tag = "div", className, overrides, width, minWidth, maxWidth, alignSelf, style, ...rest }: CardProps) {
  const nest = useNested(overrides);
  const sizing = layoutSizing({ width, minWidth, maxWidth, alignSelf });
  const spacing = scaleKey(spacingProp, cardSpacings);
  const active = selected ?? activeProp ?? false;
  const interactive = Boolean(onClick);
  // zen-allow-secondary: Figma Card Sub-Action (6664:21688) = Button/Icon-Flat Small Secondary.
  const sub: ReactNode = isSubActionConfig(subAction)
    ? nest("Sub-Action", <IconButton appearance="flat" level="secondary" size="sm" aria-label={subAction.label} onClick={subAction.onClick} icon={subAction.icon ?? "icon-dots-vertical-line"} />)
    : nest.slot(subAction);
  return (
    <Tag
      {...rest}
      // One ref type for every `as` tag (div, article, section, li).
      ref={ref as Ref<HTMLDivElement & HTMLLIElement>}
      className={["zen-card", className].filter(Boolean).join(" ")}
      {...sizing.attributes}
      style={withSizingVars(style, sizing.vars)}
      // Deprecated semi-pale (Figma has no gradient theme since 2026-10-14) draws as Pale.
      data-tone={theme === "semi-pale" ? "pale" : theme}
      data-spacing={spacing}
      data-surface={surface}
      data-active={active ? "true" : undefined}
      data-interactive={interactive ? "true" : undefined}
      role={interactive ? "button" : rest.role}
      tabIndex={interactive ? 0 : rest.tabIndex}
      aria-pressed={interactive && active ? true : rest["aria-pressed"]}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={interactive ? (event: KeyboardEvent<HTMLElement>) => { onKeyDown?.(event); if (event.defaultPrevented) return; if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); onClick?.(event); } } : onKeyDown}
    >
      <div className="zen-card__content">{nest.slot(children)}</div>
      {sub ? <div className="zen-card__sub-action">{sub}</div> : null}
    </Tag>
  );
}

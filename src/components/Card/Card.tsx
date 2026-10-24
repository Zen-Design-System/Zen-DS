import { isValidElement, type HTMLAttributes, type KeyboardEvent, type MouseEvent, type ReactElement, type ReactNode, type Ref } from "react";
import { IconButton } from "../Button";
import type { IconName } from "../Icon";
import { scaleKey } from "../_shared/scale";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { layoutSizing, withSizingVars, type LayoutWidthProps } from "../Layout/sizing";
import { CardContentContext, cardContentOf } from "./card-content";
import "./card.css";
import "../Icon/core";

/** Figma Card Theme (6643:51021), renamed 2026-10-21 (user: "Flat hiện tại nên là default, còn flat phải là dùng đổ màu
 *  surface-flat"): `default` was `flat` (no border, no shadow), `flat-border` was Border × Surface=Flat. */
export const cardThemes = ["shadow", "default", "pale", "border", "flat-border", "on-container", "solid", "subtle"] as const;
export const cardSpacings = ["medium", "small", "xsmall"] as const;
/** Figma Card Color (6643:51021): the hue of a Pale or Solid card. */
export const cardColors = ["neutral", "brand", "cyan", "violet", "green", "yellow", "orange", "blue", "purple", "accent"] as const;
/** The colours Figma draws at Theme=Solid (15480:87472…87496; Accent 16109:23445/23454); the others render as Solid
 *  Neutral (harness card/solid-color). */
export const cardSolidColors = ["neutral", "brand", "cyan", "yellow", "orange", "accent"] as const;
/** A Figma Card Color. Pale and Subtle take the first nine (Figma has no Pale or Subtle Accent: they render as Neutral)
 *  and Solid takes cardSolidColors; the other themes ignore it. */
export type CardColor = (typeof cardColors)[number];
/** A Figma Card theme. `semi-pale` still type-checks but is deprecated: Figma dropped its gradient themes
 * (2026-10-14) and the card renders it as `pale`. */
export type CardTheme = (typeof cardThemes)[number] | "semi-pale";
/** CSS / Figma key (the `data-spacing` value). */
type CardSpacingKey = (typeof cardSpacings)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type CardSpacing = "md" | "sm" | "xs" | "medium" | "small" | "xsmall";
/** Layer 2 fill of Shadow / Default / Border cards (Figma Card Surface): default on a Canvas/Default page, alt to suit a
 *  Canvas/Alt (white) page. A card on a Canvas/Flat page is theme="flat-border" (Surface/Flat inside a Pale frame). */
export type CardSurface = "default" | "alt";
/** The Figma Surface each theme draws (Card 6643:51021); `surface` on another theme is ignored (harness card/surface-ignored).
 *  Shadow on alt is the one code extra: it renders as Flat on Surface/Alt. */
export const cardSurfaces: Readonly<Record<(typeof cardThemes)[number], readonly CardSurface[]>> = {
  shadow: ["default", "alt"], default: ["default", "alt"], border: ["default", "alt"], "flat-border": ["default"], pale: ["default"], "on-container": ["default"], solid: ["default"], subtle: ["default"],
};

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
export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "children" | "onClick" | "color">, LayoutWidthProps {
  /** The root element. */
  ref?: Ref<HTMLElement>;
  children?: ReactNode;
  /** Figma Theme: Shadow (Shadow/Bottom/Level-1) · Default (the Surface fill alone: no border, no shadow) · Pale
   *  (Support/<Color>/Pale + Effect/Overlay blur) · Border (Border/Neutral/Pale) · Flat-Border (15530:502–520: Surface/Flat
   *  inside a Border/Neutral/Pale frame, the card of a Canvas/Flat page) · On-Container (Surface/Flat: a card inside a Modal, Side Panel or Bottom Sheet, on their Container fill; harness
   *  card/on-container-in-overlay) · Solid (15480:87472: the one widget of a row that stands out; Neutral fills
   *  Background/Neutral/Solid/Default and its content reads Content/Inverse/*, a hue fills Support/<Color>/Solid) ·
   *  Subtle (16195:138560…: Support/<Color>/Subtle + Effect/Overlay blur, the colour box on a Canvas/Default page, where
   *  Pale fades into the grey; Pale is for white pages — user rule 2026-10-17, harness card/pale-on-canvas-default).
   *  `semi-pale` is deprecated (no gradients in Figma since 2026-10-14) and renders as pale. */
  theme?: CardTheme;
  /** Figma Color, for theme="pale" (Support/<Color>/Pale, the nine hues: 15480:87358…, 15530:526, 15530:550),
   *  theme="subtle" (Support/<Color>/Subtle, the same nine hues: 16195:138578…138668) and
   *  theme="solid" (neutral: Background/Neutral/Solid/Default; brand · cyan · yellow · orange: Support/<Color>/Solid;
   *  accent: Background/Accent/Solid/Default, Solid only; Figma has no Solid violet, green, blue or purple and no Pale
   *  or Subtle accent, which render as Solid / Pale / Subtle Neutral — harness card/solid-color). Shadow, Default, Border,
   *  Flat-Border and On-Container ignore it (harness card/color-ignored). A Solid card re-points the neutral tokens its children read to the fill's
   *  own family (Neutral → Content/Inverse/*, Border/Inverse, Background/Inverse/*; Accent → Content/On-Accent; Yellow →
   *  Content/On-Brights; the other hues → Content/On-Colors) and tells its Metric parts which family to draw; the page
   *  keeps its mode. */
  color?: CardColor;
  /** Figma Spacing: Medium (Card-padding-medium, Corner-Radius/2XLarge) · Small (Card-padding-small, Corner-Radius/Large) ·
   *  XSmall (Card-padding-xsmall 8, Corner-Radius/Base 12: a compact tile, such as a row of choices on a phone; the user,
   *  2026-10-20). Short (xs, sm, md) or Figma (xsmall, small, medium) spelling. */
  spacing?: CardSpacing;
  /** Figma Active=Yes: the selected card — Surface fill with a 2px Card/Border/Active stroke. */
  selected?: boolean;
  /**
   * Figma Active=Yes (the selected card).
   * @deprecated Use selected.
   */
  active?: boolean;
  /** Figma Surface, chosen to suit the page's Canvas: Surface/Default · Surface/Alt (Default and Border: 15530:454–496).
   *  Unset follows an inherited --zen-card-surface (a page scope can set it once), else Surface/Default. Pale /
   *  Flat-Border / On-Container / Solid / Subtle keep their own fill (harness card/surface-ignored). With theme="shadow",
   *  `alt` drops the drop shadow (Surface-Alt never casts one, §9) and the card renders as Figma Theme=Default
   *  (6643:51018) on Surface/Alt. A page scope that sets an alt --zen-card-surface sets `--zen-card-shadow: 0 0 transparent`
   *  with it, so its Shadow cards drop the shadow too; `surface="default"` on a card brings it back. */
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
 * Figma Card (6643:51021): a Content slot on one of six themes (Pale and Solid in a Color), padded Card-padding-medium/small.
 * A clickable card is an actionable container: Border theme steps its stroke up to Border/Neutral/Subtle (§6).
 */
export function Card({ ref, children, theme = "shadow", color = "neutral", spacing: spacingProp = "md", selected, active: activeProp, surface, onClick, onKeyDown, "aria-label": ariaLabel, subAction, as: Tag = "div", className, overrides, width, minWidth, maxWidth, alignSelf, style, ...rest }: CardProps) {
  const nest = useNested(overrides);
  const sizing = layoutSizing({ width, minWidth, maxWidth, alignSelf });
  const spacing = scaleKey(spacingProp, cardSpacings);
  const active = selected ?? activeProp ?? false;
  const interactive = Boolean(onClick);
  // Deprecated semi-pale (Figma has no gradient theme since 2026-10-14) draws as Pale.
  const tone = theme === "semi-pale" ? "pale" : theme;
  // Color applies to Pale, Subtle and Solid only; a colour Figma does not draw on that theme falls back to Neutral.
  const hue = tone === "pale" || tone === "subtle" ? (color === "accent" ? "neutral" : color) : tone === "solid" ? ((cardSolidColors as readonly string[]).includes(color) ? color : "neutral") : undefined;
  const content = cardContentOf(tone, hue, active);
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
      data-tone={tone}
      data-color={hue}
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
      <div className="zen-card__content"><CardContentContext.Provider value={content}>{nest.slot(children)}</CardContentContext.Provider></div>
      {sub ? <div className="zen-card__sub-action">{sub}</div> : null}
    </Tag>
  );
}

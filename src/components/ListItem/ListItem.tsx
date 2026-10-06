import type { HTMLAttributes, MouseEvent, ReactNode, Ref } from "react";
import type { IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./list-item.css";

export type ListInset = "auto" | "comfortable" | "compact" | "none";

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root `<ul>`. */
export interface ListProps extends HTMLAttributes<HTMLUListElement> {
  /** The root `<ul>`. */
  ref?: Ref<HTMLUListElement>;
  children: ReactNode;
  /** @deprecated Rows keep the spacing Figma sets inside List-Item: Padding/Small (12px) above and below, none at the
   *  sides; the container around the List insets it sideways. This prop still gives the rows a horizontal padding
   *  (comfortable = Margin/Comfortable, compact = Margin/Compact, none = 0) for existing apps. */
  inset?: ListInset;
  "aria-label"?: string;
  className?: string;
}

/** A plain list of List-Items (ul, no bullets). Rows are spaced Spacing/Gap/3XSmall (2px), static and clickable alike
 *  (Figma List-Box Body-Slot); each row pads itself 12px above and below. The container insets the list sideways
 *  (ListBox does): leave at least Padding/Small (12px) at the sides of clickable rows for the fill. */
export function List({ ref, children, "aria-label": ariaLabel, className, inset = "auto", ...rest }: ListProps) {
  return <ul {...rest} ref={ref} className={["zen-list", className].filter(Boolean).join(" ")} aria-label={ariaLabel} data-inset={inset === "auto" ? undefined : inset}>{children}</ul>;
}

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root row element (`as`). */
export interface ListItemProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "onClick"> {
  /** The root row element. */
  ref?: Ref<HTMLElement>;
  /** Figma Info-Content Title (Body/Base/Bold, Content/Neutral/Strongest). */
  title: ReactNode;
  /** Lines the title may take before it truncates with an ellipsis. 1 (default) = Figma's one line
   *  (Title, textTruncation ENDING, maxLines 1); 2 when the title must be read in full, e.g. a long task or document name
   *  in a narrow list. */
  titleLines?: 1 | 2;
  /** Figma Info-Content Subtitle (Body/Small/Regular, Content/Neutral/Light). */
  caption?: ReactNode;
  /** Figma Leading slot: an Avatar (Image-Size/Medium), Dock Icon, thumbnail or an icon name (`"icon-clock-line"`). */
  leading?: IconName | ReactNode;
  /** Figma Trailing slot (Slot-Actions): Medium (md) buttons / icon buttons, a Badge, a value or a chevron. */
  trailing?: ReactNode;
  /** Figma Contents slot override: replaces the title/caption stack. */
  children?: ReactNode;
  /** Figma State=Selected (Background/Active/Neutral/Subtle). Interactive rows only (Figma has no Selected for
   *  Interactive=No): pair it with onClick or href. */
  selected?: boolean;
  /** Makes the row one action: Figma Interactive=Yes (an Interactive-Background over the row's height and 12px past it
   *  sideways, Interactive-List-Item-Radius corners, Hover / Pressed from real interaction). Without onClick or href the row is Interactive=No: no background or states. Keep
   *  trailing buttons out of clickable rows. */
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  /** Renders the row as a link (Figma Interactive=Yes). */
  href?: string;
  /** "li" (default, inside <List>) or "div" when used on its own. */
  as?: "li" | "div";
  className?: string;
}

/**
 * Figma List-Item (4080:11700): a Wrapper row (gap Medium) of Leading · Contents · Trailing, padded Spacing/Padding/Small
 * (12px) above and below and nothing at the sides (one set for every device; Contents = Info-Content, Title and
 * Subtitle Spacing/Gap/3XSmall apart).
 * - Interactive=Yes (onClick or href): an Interactive-Background Padding/Small (12px) outside the content on every side —
 *   the row's height, 12px past it sideways (Interactive-List-Item-Radius: Corner-Radius/Base 12px on desktop, Large 16px
 *   on tablet and mobile) — that shows Neutral/Flat Hover · Pressed and Active/Neutral/Subtle when selected; the
 *   container leaves at least 12px at the row's sides.
 * - Interactive=No (neither): no background or states.
 * Never add padding to the row: the layout around the List decides where it sits.
 */
export function ListItem({ ref, title, titleLines = 1, caption, leading, trailing, children, selected = false, onClick, href, as: Tag = "li", className, ...rest }: ListItemProps) {
  const body = (
    <>
      {leading ? <span className="zen-list-item__leading">{renderIcon(leading)}</span> : null}
      <span className="zen-list-item__contents">
        {children ?? (
          <>
            <span className={`zen-list-item__title ${typographyStyles["Body/Base/Bold"]}`}>{title}</span>
            {caption ? <span className={`zen-list-item__caption ${typographyStyles["Body/Small/Regular"]}`}>{caption}</span> : null}
          </>
        )}
      </span>
    </>
  );
  const interactive = Boolean(onClick || href);
  return (
    // One ref type for both `as` tags (li, div).
    <Tag {...rest} ref={ref as Ref<HTMLDivElement & HTMLLIElement>} className={["zen-list-item", className].filter(Boolean).join(" ")} data-selected={selected ? "true" : undefined} data-interactive={interactive ? "true" : undefined} data-title-lines={titleLines === 2 ? "2" : undefined}>
      {href
        ? <a className="zen-list-item__wrapper" href={href} onClick={onClick} aria-current={selected ? "true" : undefined}>{body}</a>
        : onClick
          // aria-current, like the link row: aria-pressed made every clickable row a toggle button ("not pressed") to
          // screen readers, where a row opens or picks something and the selected one is the current item.
          ? <button type="button" className="zen-list-item__wrapper" onClick={onClick} aria-current={selected ? "true" : undefined}>{body}</button>
          : <span className="zen-list-item__wrapper">{body}</span>}
      {trailing ? <span className="zen-list-item__trailing">{trailing}</span> : null}
    </Tag>
  );
}

/** ListBox elevation: Card's Figma Theme without Semi-Pale. */
export const listBoxThemes = ["flat", "shadow", "pale", "border"] as const;
export type ListBoxTheme = (typeof listBoxThemes)[number];

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root element (`as`). */
export interface ListBoxProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  /** The root element. */
  ref?: Ref<HTMLElement>;
  /** Figma Header-Slot (Header=Yes): what names the box, e.g. a Heading/Subheading title and a caption, or a toolbar.
   *  Pads Card-padding-medium on top and at the sides and Padding/XSmall below; its content stacks Spacing/Gap/Medium. */
  header?: ReactNode;
  /** Figma Body-Slot: the rows, usually a `<List>` of ListItems. Pads Card-padding-medium sideways and
   *  List-Container-Vertical-Padding above and below (12px desktop, 8px tablet and mobile) and stacks its children
   *  Spacing/Gap/3XSmall, so a clickable row's fill sits 12px (desktop) or 8px (phone) from every box edge. */
  children: ReactNode;
  /** Figma Footer-Slot (Footer=Yes): what follows the rows, e.g. a "Show all" Tertiary button. Pads Card-padding-medium. */
  footer?: ReactNode;
  /** Elevation, as Card's Figma Theme. Flat (default): Surface/Default alone — on Canvas/Default it needs no frame
   *  (usage rules §16). Shadow: Shadow/Bottom/Level-1, when the page's elevation follows a default Sidebar. Pale:
   *  Support/Neutral/Pale + Effect/Overlay blur, a tinted box (never with a shadow, §9). Border: a 1px
   *  Border/Neutral/Pale ring inside, for a white page (Canvas/Alt, a phone screen) or a box inside another Surface (§11). */
  theme?: ListBoxTheme;
  /** "div" (default) or "section" when the box is a titled region (give it aria-labelledby). */
  as?: "div" | "section";
  className?: string;
}

/**
 * Figma Component/List-Box (14922:75297): the white box that holds a list of rows, the same on every device — only the
 * tokens change by mode. Surface/Default, Corner-Radius/2XLarge (24px, concentric with the row fill:
 * Interactive-List-Item-Radius + its gap to the edge), Header-Slot · Body-Slot · Footer-Slot padded Card-padding-medium
 * sideways (24px desktop · 20px tablet and mobile), the body List-Container-Vertical-Padding above and below. Header and
 * Footer are optional (Figma Header=No / Footer=No). `theme` picks the elevation like Card's: flat (default), shadow,
 * pale or border.
 */
export function ListBox({ ref, header, footer, children, theme = "flat", as: Tag = "div", className, ...rest }: ListBoxProps) {
  return (
    // One ref type for both `as` tags (div, section).
    <Tag {...rest} ref={ref as Ref<HTMLDivElement>} data-tone={theme} className={["zen-list-box", className].filter(Boolean).join(" ")}>
      {header ? <div className="zen-list-box__header">{header}</div> : null}
      <div className="zen-list-box__body">{children}</div>
      {footer ? <div className="zen-list-box__footer">{footer}</div> : null}
    </Tag>
  );
}

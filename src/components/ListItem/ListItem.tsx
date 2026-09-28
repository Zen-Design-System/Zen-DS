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
  /** Horizontal inset of the rows' content, following the layout it sits in.
   *  auto (default): full-bleed on a page = Margin/Comfortable (24px); inside a container that already has its own
   *  padding (Modal, Side Panel, Card) = none, so row content lines up with the container's other content.
   *  comfortable = Margin/Comfortable, compact = Margin/Compact, none = 0 (the hover/selected fill bleeds 12px outward). */
  inset?: ListInset;
  "aria-label"?: string;
  className?: string;
}

/** A plain list of List-Items (ul, no bullets). */
export function List({ ref, children, "aria-label": ariaLabel, className, inset = "auto", ...rest }: ListProps) {
  return <ul {...rest} ref={ref} className={["zen-list", className].filter(Boolean).join(" ")} aria-label={ariaLabel} data-inset={inset === "auto" ? undefined : inset}>{children}</ul>;
}

/** Standard HTML attributes (`id`, `data-*`, `aria-*`, `style`…) go to the root row element (`as`). */
export interface ListItemProps extends Omit<HTMLAttributes<HTMLElement>, "title" | "onClick"> {
  /** The root row element. */
  ref?: Ref<HTMLElement>;
  /** Figma Info-Content Title (Body/Base/Bold, Content/Neutral/Strongest). */
  title: ReactNode;
  /** Figma Info-Content Subtitle (Body/Small/Regular, Content/Neutral/Light). */
  caption?: ReactNode;
  /** Figma Leading slot: an Avatar (Image-Size/Medium), Dock Icon, thumbnail or an icon name (`"icon-clock-line"`). */
  leading?: IconName | ReactNode;
  /** Figma Trailing slot (Slot-Actions): Medium (md) buttons / icon buttons, a Badge, a value or a chevron. */
  trailing?: ReactNode;
  /** Figma Contents slot override: replaces the title/caption stack. */
  children?: ReactNode;
  /** Figma State=Selected (Background/Active/Neutral/Subtle). */
  selected?: boolean;
  /** Makes the row one action (Hover / Pressed from real interaction). Keep trailing buttons out of clickable rows. */
  onClick?: (event: MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  /** Renders the row as a link. */
  href?: string;
  /** "li" (default, inside <List>) or "div" when used on its own. */
  as?: "li" | "div";
  className?: string;
}

/**
 * Figma List-Item (4080:11700): padding Spacing/Padding/Small × Margin-Comfortable, a Wrapper row (gap Medium) of
 * Leading · Contents · Trailing, and an Interactive-Background inset 12px (Corner-Radius/Large) that shows
 * Neutral/Flat Hover · Pressed and Active/Neutral/Subtle when selected.
 */
export function ListItem({ ref, title, caption, leading, trailing, children, selected = false, onClick, href, as: Tag = "li", className, ...rest }: ListItemProps) {
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
    <Tag {...rest} ref={ref as Ref<HTMLDivElement & HTMLLIElement>} className={["zen-list-item", className].filter(Boolean).join(" ")} data-selected={selected ? "true" : undefined} data-interactive={interactive ? "true" : undefined}>
      {href
        ? <a className="zen-list-item__wrapper" href={href} onClick={onClick} aria-current={selected ? "true" : undefined}>{body}</a>
        : onClick
          ? <button type="button" className="zen-list-item__wrapper" onClick={onClick} aria-pressed={selected}>{body}</button>
          : <span className="zen-list-item__wrapper">{body}</span>}
      {trailing ? <span className="zen-list-item__trailing">{trailing}</span> : null}
    </Tag>
  );
}

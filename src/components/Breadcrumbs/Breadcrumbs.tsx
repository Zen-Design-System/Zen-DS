import { useState, type MouseEvent, type ReactNode } from "react";
import { Icon } from "../Icon";
import { typographyStyles } from "../../tokens/typography.generated";
import "./breadcrumbs.css";

export type BreadcrumbEmphasis = "default" | "medium";
export type BreadcrumbItemData = {
  id: string;
  label: ReactNode;
  href?: string;
  /** Leading icon; Figma shows it on the Master (first) level. */
  icon?: ReactNode;
};

export interface BreadcrumbItemProps {
  item: BreadcrumbItemData;
  level?: "master" | "sub";
  emphasis?: BreadcrumbEmphasis;
  current?: boolean;
  /** Deterministic Figma State for matrices; real hover applies natively. */
  state?: "default" | "hover";
  onNavigate?: (item: BreadcrumbItemData, event: MouseEvent) => void;
}

/** Figma .Primitives/Breadcrumbs/Item (292:43787): Level × State × Emphasis. */
export function BreadcrumbItem({ item, level = "sub", emphasis = "default", current = false, state = "default", onNavigate }: BreadcrumbItemProps) {
  const content = (
    <>
      {level === "master" ? <span className="zen-breadcrumb__icon" aria-hidden="true">{item.icon ?? <Icon name="icon-home-03-line" />}</span> : null}
      <span className={`zen-breadcrumb__label ${typographyStyles[emphasis === "medium" ? "Body/Base/Medium" : "Body/Base/Regular"]}`}>{item.label}</span>
    </>
  );
  const common = { className: "zen-breadcrumb", "data-level": level, "data-state": state, "data-current": current ? "true" : undefined };
  if (current) return <span {...common} aria-current="page">{content}</span>;
  if (item.href) return <a {...common} href={item.href} onClick={(event) => onNavigate?.(item, event)}>{content}</a>;
  return <button {...common} type="button" onClick={(event) => onNavigate?.(item, event)}>{content}</button>;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItemData[];
  emphasis?: BreadcrumbEmphasis;
  /** Show the first item as the Master level (with icon). Default true. */
  master?: boolean;
  /** Collapse middle items behind an ellipsis button when there are more than this many. */
  maxItems?: number;
  /** Called for every non-current item; call `event.preventDefault()` for client-side routing. */
  onNavigate?: (item: BreadcrumbItemData, event: MouseEvent) => void;
  "aria-label"?: string;
  className?: string;
}

/** Figma Breadcrumbs (4031:20161): Item-List with chevron separators (icon-chevron-right-line-small, Neutral/Light). */
export function Breadcrumbs({ items, emphasis = "default", master = true, maxItems, onNavigate, "aria-label": ariaLabel = "Breadcrumb", className }: BreadcrumbsProps) {
  const [expanded, setExpanded] = useState(false);
  const collapse = !expanded && maxItems !== undefined && maxItems >= 2 && items.length > maxItems;
  const visible: Array<BreadcrumbItemData | "ellipsis"> = collapse ? [items[0], "ellipsis", ...items.slice(items.length - (maxItems - 1))] : items;
  return (
    <nav aria-label={ariaLabel} className={["zen-breadcrumbs", className].filter(Boolean).join(" ")}>
      <ol className="zen-breadcrumbs__list">
        {visible.map((entry, index) => {
          const last = index === visible.length - 1;
          return (
              <li key={entry === "ellipsis" ? "ellipsis" : entry.id} className="zen-breadcrumbs__item">
                {entry === "ellipsis"
                  ? <button type="button" className="zen-breadcrumb" data-level="sub" aria-label={`Show ${items.length - maxItems!} more`} onClick={() => setExpanded(true)}><span className={`zen-breadcrumb__label ${typographyStyles["Body/Base/Regular"]}`}>…</span></button>
                  : <BreadcrumbItem item={entry} level={master && index === 0 ? "master" : "sub"} emphasis={emphasis} current={last} onNavigate={onNavigate} />}
                {!last ? <span className="zen-breadcrumbs__separator" aria-hidden="true"><Icon name="icon-chevron-right-line-small" /></span> : null}
              </li>
          );
        })}
      </ol>
    </nav>
  );
}

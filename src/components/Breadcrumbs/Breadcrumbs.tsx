import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { slotItems } from "../_shared/slots";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./breadcrumbs.css";
import "../Icon/core";

export type BreadcrumbEmphasis = "default" | "medium";
export type BreadcrumbLevel = "master" | "sub";
/**
 * One crumb. Its look follows Figma's instance in the Item-List slot, each crumb on its own: Primitives/Breadcrumbs/Item/Slot
 * (4031:20158) › Dash, and the .Primitives/Breadcrumbs/Item (292:43787) inside it › Level, State, Emphasis. A field left
 * out takes Breadcrumbs' own value (`master`, `emphasis`) or its place in the trail.
 */
export type BreadcrumbItemData = {
  id: string;
  label: ReactNode;
  href?: string;
  /** Leading icon — an icon name (`"icon-home-03-line"`, the default) or a node; Figma shows it on the Master level. */
  icon?: IconName | ReactNode;
  /** Figma Item › Level: Master draws the leading icon. Unset: the first crumb is Master while Breadcrumbs' `master` is
   *  on, the others Sub. */
  level?: BreadcrumbLevel;
  /** Figma Item › Emphasis: Medium sets the label in Body/Base/Medium. Unset: Breadcrumbs' `emphasis`. */
  emphasis?: BreadcrumbEmphasis;
  /** Figma Item › State, for a static mockup or matrix (Hover shows Neutral/Flat/Hover); real hover applies anyway. */
  state?: "default" | "hover";
  /** Figma Item/Slot › Dash: the chevron after this crumb. Unset: after every crumb but the last. */
  dash?: boolean;
};

export interface BreadcrumbItemProps {
  item: BreadcrumbItemData;
  /** Figma Level. Unset: the item's own `level`, else Sub. */
  level?: BreadcrumbLevel;
  /** Figma Emphasis. Unset: the item's own `emphasis`, else Default. */
  emphasis?: BreadcrumbEmphasis;
  current?: boolean;
  /** Deterministic Figma State for matrices; real hover applies natively. Unset: the item's own `state`. */
  state?: "default" | "hover";
  onNavigate?: (item: BreadcrumbItemData, event: MouseEvent) => void;
}

/** Figma .Primitives/Breadcrumbs/Item (292:43787): Level × State × Emphasis. */
export function BreadcrumbItem({ item, level: levelProp, emphasis: emphasisProp, current = false, state: stateProp, onNavigate }: BreadcrumbItemProps) {
  const level = levelProp ?? item.level ?? "sub";
  const emphasis = emphasisProp ?? item.emphasis ?? "default";
  const state = stateProp ?? item.state ?? "default";
  const content = (
    <>
      {level === "master" ? <span className="zen-breadcrumb__icon" aria-hidden="true">{renderIcon(item.icon ?? "icon-home-03-line")}</span> : null}
      <span className={`zen-breadcrumb__label ${typographyStyles[emphasis === "medium" ? "Body/Base/Medium" : "Body/Base/Regular"]}`}>{item.label}</span>
    </>
  );
  const common = { className: "zen-breadcrumb", "data-level": level, "data-state": state, "data-current": current ? "true" : undefined };
  if (current) return <span {...common} aria-current="page">{content}</span>;
  if (item.href) return <a {...common} href={item.href} onClick={(event) => onNavigate?.(item, event)}>{content}</a>;
  return <button {...common} type="button" onClick={(event) => onNavigate?.(item, event)}>{content}</button>;
}

export interface BreadcrumbsProps {
  /** The trail as data, Master first and the current page last. Or give BreadcrumbItem children (Figma Item-List). */
  items?: BreadcrumbItemData[];
  /** The trail as BreadcrumbItem elements (`<BreadcrumbItem item={{ id, label, href }} />`), in order, when `items` is
   *  not given. Breadcrumbs still sets the current page and collapsing; a BreadcrumbItem's own `level`, `emphasis` and
   *  `state` (or its item's) win over Breadcrumbs' defaults. */
  children?: ReactNode;
  /** Every crumb's Figma Emphasis, unless the crumb sets its own (`items[n].emphasis`). */
  emphasis?: BreadcrumbEmphasis;
  /** Show the first item as the Master level (with icon), unless a crumb sets its own `level`. Default true. */
  master?: boolean;
  /** Collapse middle items behind an ellipsis button when there are more than this many. Activating the ellipsis
   *  shows them all and moves focus to the first crumb it revealed. */
  maxItems?: number;
  /** Called for every non-current item; call `event.preventDefault()` for client-side routing. */
  onNavigate?: (item: BreadcrumbItemData, event: MouseEvent) => void;
  /** Names the navigation landmark (default "Breadcrumb", from the locale's labels). */
  "aria-label"?: string;
  className?: string;
}

/** Figma Breadcrumbs (4031:20161): Item-List with chevron separators (icon-chevron-right-line-small, Neutral/Light). */
export function Breadcrumbs({ items: itemsProp, children, emphasis = "default", master = true, maxItems, onNavigate, "aria-label": ariaLabelProp, className }: BreadcrumbsProps) {
  const t = useZenLabels();
  const ariaLabel = ariaLabelProp ?? t.breadcrumb;
  // A BreadcrumbItem child's own level / emphasis / state count as its item's (the Item instance's properties in Figma).
  const items = itemsProp ?? slotItems(children, BreadcrumbItem).map((crumb): BreadcrumbItemData => ({
    ...crumb.item,
    level: crumb.level ?? crumb.item.level,
    emphasis: crumb.emphasis ?? crumb.item.emphasis,
    state: crumb.state ?? crumb.item.state,
  }));
  const [expanded, setExpanded] = useState(false);
  const listRef = useRef<HTMLOListElement>(null);
  // Activating "…" removes it, so focus would drop to <body>: move it to the first crumb it revealed (items[1]), which is
  // a link or a button (the current page is always the last crumb, never a revealed one).
  const focusRevealed = useRef(false);
  useEffect(() => {
    if (!expanded || !focusRevealed.current) return;
    focusRevealed.current = false;
    listRef.current?.children[1]?.querySelector<HTMLElement>(".zen-breadcrumb")?.focus();
  }, [expanded]);
  const collapse = !expanded && maxItems !== undefined && maxItems >= 2 && items.length > maxItems;
  const visible: Array<BreadcrumbItemData | "ellipsis"> = collapse ? [items[0], "ellipsis", ...items.slice(items.length - (maxItems - 1))] : items;
  return (
    <nav aria-label={ariaLabel} className={["zen-breadcrumbs", className].filter(Boolean).join(" ")}>
      <ol ref={listRef} className="zen-breadcrumbs__list">
        {visible.map((entry, index) => {
          const last = index === visible.length - 1;
          // Figma Item/Slot › Dash: the crumb's own, else after every crumb but the last.
          const dash = entry === "ellipsis" ? !last : entry.dash ?? !last;
          return (
              <li key={entry === "ellipsis" ? "ellipsis" : entry.id} className="zen-breadcrumbs__item">
                {entry === "ellipsis"
                  ? <button type="button" className="zen-breadcrumb" data-level="sub" aria-label={t.showMore(items.length - maxItems!)} onClick={() => { focusRevealed.current = true; setExpanded(true); }}><span className={`zen-breadcrumb__label ${typographyStyles["Body/Base/Regular"]}`}>…</span></button>
                  : <BreadcrumbItem item={entry} level={entry.level ?? (master && index === 0 ? "master" : "sub")} emphasis={entry.emphasis ?? emphasis} current={last} onNavigate={onNavigate} />}
                {dash ? <span className="zen-breadcrumbs__separator" aria-hidden="true"><Icon name="icon-chevron-right-line-small" /></span> : null}
              </li>
          );
        })}
      </ol>
    </nav>
  );
}

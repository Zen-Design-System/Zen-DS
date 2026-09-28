import { createContext, useContext, useEffect, useRef, useState, type Dispatch, type ElementType, type FocusEvent, type PointerEvent, type ReactNode, type RefObject, type SetStateAction } from "react";
import { ZenPortal } from "../Portal";
import { Icon, type IconName } from "../Icon";
import { BadgeCounter } from "../Badge";
import { IconButton } from "../Button";
import { TOOLTIP_HOVER_DELAY, TooltipSurface, useIconTooltip } from "../Tooltip";
import { Popover } from "../Popover";
import { renderIcon } from "../_shared/icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./sidebar.css";
import "../Icon/core";

export type SidebarVariant = "basic" | "workspace" | "small-density";
/** Layer 2 (Surface) of the page it sits on: default = Surface/Default (on a Canvas/Default page), alt = Surface/Alt
 *  (on a white Canvas/Alt page), flat = Surface/Flat (navigation on a Canvas/Flat page, seamless in both modes),
 *  inverse = Inverse/Solid. */
export type SidebarBackground = "default" | "alt" | "flat" | "inverse";
export type SidebarItemState = "default" | "hover" | "focus" | "disabled";
export type SidebarItemTheme = "neutral" | "accent";

export type SidebarItem = {
  id: string;
  label: string;
  /** Leading icon: an icon name (drawn at 20px) or a node (an Avatar in the workspace rail). */
  icon?: IconName | ReactNode;
  active?: boolean;
  selected?: boolean;
  disabled?: boolean;
  state?: SidebarItemState;
  theme?: SidebarItemTheme;
  dropdown?: boolean;
  indent?: boolean;
  counter?: ReactNode;
  notificationDot?: boolean;
  trailingAction?: ReactNode;
  children?: SidebarItem[];
  /** Destination of the item: it renders as a link (`<a href>`, or the Sidebar's `linkAs` router link) and still calls
   *  `onItemClick`. Disabled items stay buttons. */
  href?: string;
};

export type SidebarSection = {
  label?: string;
  /** Section-title action: a Button/Icon-Flat Small — <IconButton appearance="flat" level="primary" size="sm" aria-label icon /> (32px, 16px icon, centred in a 16px wrapper). */
  action?: ReactNode;
  items: SidebarItem[];
};

export interface SidebarProps {
  variant?: SidebarVariant;
  /** Compatibility alias for the earlier component API. */
  density?: "medium" | "small";
  collapsed?: boolean;
  /** Controlled collapse callback used by the Figma Basic/Small-Density header control. Without it the control is
   * not rendered. Ignored by `variant="workspace"`, which has no collapsed state. */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Replaces the whole header, including the collapse control. Prefer `logo` / `productName`, which keep it. */
  brand?: ReactNode;
  /** Header logo while expanded (Figma LOGO / Union). Sized to the header height (24px; 20px in Small-Density). */
  logo?: ReactNode;
  /** Mark shown in the collapsed rail instead of `logo` (Figma collapsed Logo, 28px; 20px in Small-Density). */
  logoCollapsed?: ReactNode;
  /** Small product label after the logo (Figma: the product badge beside the wordmark). */
  productName?: ReactNode;
  /** Accessible name of the navigation landmark. Default: the locale's “Main navigation” (“Workspace navigation” for the workspace variant). */
  "aria-label"?: string;
  sections?: SidebarSection[];
  /** Id of the current page's item: it is marked selected (aria-current="page") and its parent groups open (and stay
   *  open until the user collapses them), so the app passes its route id instead of setting `selected` in `sections`.
   *  When set, it replaces the items' own `selected` / `active` flags in the navigation (not in the workspace rail). */
  selectedId?: string;
  /** Component that renders items with an `href`, e.g. your router's link. It receives `href`, `className`, `onClick`,
   *  `aria-current` and the children; adapt a router link that takes `to` (`({ href, ...rest }) => <RouterLink to={href} {...rest} />`). Default `a`. */
  linkAs?: ElementType;
  footer?: ReactNode;
  search?: ReactNode;
  onItemClick?: (item: SidebarItem) => void;
  className?: string;
  background?: SidebarBackground;
  workspaceBrand?: ReactNode;
  workspaceItems?: SidebarItem[];
  workspaceFooter?: ReactNode;
  /** Figma Workspace rail: the action after the workspace avatars (usually an "Add workspace" Button/Icon-Main). */
  workspaceAction?: ReactNode;
  /** Workspace panel header action on the right (Figma: settings Button/Icon-Flat). */
  headerAction?: ReactNode;
  workspaceBar?: boolean;
  /** Figma Side-Bar/Sub: a 260px flyout panel opened beside the sidebar (usually a <SidebarSubMenu>). */
  subMenu?: ReactNode;
  /** Accessible name of the flyout panel. Default: the locale's “Sub menu”. */
  subMenuLabel?: string;
  /** Called on Escape or a pointer press outside the sidebar and its flyout, so the owner can close it. */
  onSubMenuClose?: (event: KeyboardEvent | globalThis.PointerEvent) => void;
}

export interface SidebarSubMenuProps {
  /** Figma Sub-Item/Search: usually <Search variant="popover" />. */
  search?: ReactNode;
  items?: SidebarItem[];
  /** Grouped items with Menu-Item section titles (rendered after `items`). */
  sections?: SidebarSection[];
  onItemClick?: (item: SidebarItem) => void;
  /** Extra content under the item list. */
  children?: ReactNode;
  className?: string;
}

type SidebarBrandSlots = { logo?: ReactNode; logoCollapsed?: ReactNode; productName?: ReactNode };

/** Header built from the logo slots plus the collapse control. No product branding by default: apps pass their own. */
function DefaultSidebarBrand({ collapsed, onCollapsedChange, logo, logoCollapsed, productName }: SidebarBrandSlots & { collapsed: boolean; onCollapsedChange?: (collapsed: boolean) => void }) {
  const t = useZenLabels();
  const collapseLabel = collapsed ? t.expandSidebar : t.collapseSidebar;
  // Icon-only control → its name as a tooltip (1s hover, instant on keyboard focus, never on touch).
  const collapseTip = useIconTooltip(onCollapsedChange ? collapseLabel : undefined, { placement: "bottom" });
  return (
    <div className="zen-sidebar__default-brand" data-collapsed={collapsed ? "true" : "false"}>
      {logo ? <span className="zen-sidebar__default-brand-expanded">{logo}</span> : null}
      {logoCollapsed ? <span className="zen-sidebar__default-brand-collapsed">{logoCollapsed}</span> : null}
      {productName ? <span className="zen-sidebar__default-brand-product">{productName}</span> : null}
      {/* The collapse control only renders when the owner can act on it; a dead (disabled) toggle reads as broken. */}
      {onCollapsedChange ? <button {...collapseTip.bind()} className="zen-sidebar__collapse" type="button" aria-label={collapseLabel} aria-expanded={!collapsed} onClick={() => onCollapsedChange(!collapsed)}>
        <Icon name={collapsed ? "icon-layout-right-line" : "icon-layout-left-line"} size="base" decorative />
      </button> : null}
      {collapseTip.tooltip}
    </div>
  );
}

/** Figma Workspace Child-Header (4233:5950): the active workspace name (Heading/4, max 148px) + chevron opens a
 * Popover to switch workspace; an optional action (settings) sits on the right. */
function WorkspaceHeader({ items, onSelect, action }: { items: SidebarItem[]; onSelect?: (item: SidebarItem) => void; action?: ReactNode }) {
  const t = useZenLabels();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const current = items.find((item) => item.selected ?? item.active) ?? items[0];
  return (
    <div className="zen-sidebar__workspace-title">
      <span className="zen-sidebar__workspace-switcher">
        <button ref={anchorRef} type="button" className="zen-sidebar__workspace-trigger" aria-haspopup="listbox" aria-expanded={open} disabled={items.length < 2} onClick={() => setOpen((next) => !next)}>
          <span className={`zen-sidebar__workspace-name ${typographyStyles["Heading/4"]}`}>{current?.label ?? t.workspace}</span>
          <Icon name="icon-chevron-down-line" size="base" decorative />
        </button>
        {/* Portalled: the sidebar surface and app shells clip overflow (overflow: hidden), which cut the 220px list off at
            narrow widths; in the page's overlay layer it stays whole and on top (audit smoke: layer). */}
        <ZenPortal><Popover className="zen-sidebar__workspace-popover" open={open} onOpenChange={setOpen} anchorRef={anchorRef} autoFocus label={t.switchWorkspace}
          items={items.map((item) => ({ id: item.id, label: item.label, selected: item.id === current?.id }))}
          onSelect={(entry) => { const item = items.find((candidate) => candidate.id === entry.id); if (item) onSelect?.(item); setOpen(false); anchorRef.current?.focus(); }} /></ZenPortal>
      </span>
      {action ? <span className="zen-sidebar__workspace-action">{action}</span> : null}
    </div>
  );
}

/** Collapsed rail label: TooltipSurface portalled to <body> with fixed positioning so the
 * sidebar surface's overflow clipping cannot cut it off. Hover shows after TOOLTIP_HOVER_DELAY (1s, same as every icon tooltip),
 * keyboard focus (focus-visible) shows immediately, Escape/press dismisses. */
function useRailTooltip(enabled: boolean, delay = TOOLTIP_HOVER_DELAY) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const clear = () => window.clearTimeout(timer.current);
  const hide = () => { clear(); setPosition(null); };
  const show = (target: HTMLElement, wait: number) => {
    clear();
    const place = () => { const rect = target.getBoundingClientRect(); setPosition({ top: rect.top + rect.height / 2, left: rect.right + 8 }); };
    if (wait <= 0) place(); else timer.current = window.setTimeout(place, wait);
  };
  useEffect(() => clear, []);
  useEffect(() => { if (!enabled) hide(); }, [enabled]);
  useEffect(() => {
    if (!position) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, true);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", hide, true); };
  }, [position]);
  const triggerProps = enabled ? {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => { if (event.pointerType !== "touch") show(event.currentTarget, delay); },
    onPointerLeave: hide,
    onPointerDown: hide,
    onFocus: (event: FocusEvent<HTMLElement>) => { if (event.currentTarget.matches(":focus-visible")) show(event.currentTarget, 0); },
    onBlur: hide,
  } : {};
  return { position: enabled ? position : null, triggerProps };
}

/** Sidebar-level navigation settings (`selectedId`, `linkAs`), shared with the item rows of the panel and its flyout. */
const SidebarNavContext = createContext<{ selectedId?: string; linkAs?: ElementType }>({});

function defaultExpanded(item: SidebarItem, selectedId?: string): boolean {
  if (selectedId !== undefined) return Boolean(item.children?.some((child) => child.id === selectedId || defaultExpanded(child, selectedId)));
  return Boolean(item.active || item.selected || item.children?.some((child) => defaultExpanded(child)));
}

/** Ids of the items that contain `id` (its parent groups), outermost first. */
function ancestorsOf(items: SidebarItem[], id: string): string[] {
  for (const item of items) {
    if (!item.children?.length) continue;
    if (item.children.some((child) => child.id === id)) return [item.id];
    const path = ancestorsOf(item.children, id);
    if (path.length) return [item.id, ...path];
  }
  return [];
}

function SidebarItemView({
  item,
  depth,
  collapsed,
  openItems,
  setOpenItems,
  onItemClick,
}: {
  item: SidebarItem;
  depth: number;
  collapsed: boolean;
  openItems: Record<string, boolean>;
  setOpenItems: Dispatch<SetStateAction<Record<string, boolean>>>;
  onItemClick?: (item: SidebarItem) => void;
}) {
  const { selectedId, linkAs } = useContext(SidebarNavContext);
  const hasChildren = Boolean(item.children?.length);
  const isOpen = openItems[item.id] ?? defaultExpanded(item, selectedId);
  const selected = selectedId !== undefined ? item.id === selectedId : (item.selected ?? item.active ?? false);
  const theme = item.theme ?? (depth > 0 ? "accent" : "neutral");
  const state = item.disabled ? "disabled" : (item.state ?? "default");
  const tooltip = useRailTooltip(collapsed && !item.disabled);
  // An item with a destination is a link (the Sidebar's router link when given); everything else stays a button.
  const isLink = Boolean(item.href) && !item.disabled;
  const Row: ElementType = isLink ? (linkAs ?? "a") : "button";

  return (
    <div className="zen-sidebar__item-group" data-level={depth === 0 ? "master" : "child"}>
      <Row
        className="zen-sidebar__item"
        data-depth={depth}
        data-selected={selected ? "true" : "false"}
        data-tone={theme}
        data-state={state}
        {...(isLink ? { href: item.href } : { type: "button", disabled: item.disabled })}
        onClick={() => {
          if (hasChildren || item.dropdown) setOpenItems((current) => ({ ...current, [item.id]: !isOpen }));
          onItemClick?.(item);
        }}
        aria-current={selected ? "page" : undefined}
        aria-expanded={hasChildren || item.dropdown ? isOpen : undefined}
        aria-label={collapsed ? item.label : undefined}
        {...tooltip.triggerProps}
      >
        {item.icon ? <span className="zen-sidebar__item-icon">{renderIcon(item.icon, { size: "base" })}</span> : null}
        <span className="zen-sidebar__item-label">{item.label}</span>
        {item.counter !== undefined ? <BadgeCounter className="zen-sidebar__counter" size="small" theme="neutral" background="subtle" value={item.counter} /> : null}
        {item.notificationDot ? <span className="zen-sidebar__notification-dot" aria-hidden="true" /> : null}
        {hasChildren || item.dropdown ? (
          <span className="zen-sidebar__item-dropdown" data-open={isOpen} aria-hidden="true">
            <Icon name="icon-chevron-down-01-line" size="base" />
          </span>
        ) : null}
        {item.trailingAction ? <span className="zen-sidebar__trailing-action">{item.trailingAction}</span> : null}
      </Row>
      {tooltip.position ? (
        <ZenPortal><TooltipSurface aria-hidden="true" className="zen-sidebar__rail-tooltip" style={{ top: tooltip.position.top, left: tooltip.position.left }}>{item.label}</TooltipSurface></ZenPortal>
      ) : null}
      {hasChildren && isOpen && !collapsed ? (
        <div className="zen-sidebar__sub-menu">{item.children!.map((child) => (
          <SidebarItemView key={child.id} item={child} depth={depth + 1} collapsed={collapsed} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />
        ))}</div>
      ) : null}
    </div>
  );
}

/** Section labels use the same Menu-Item primitive as navigation rows in Figma:
 * 32px high, Body/Small/Regular, no leading icon, and an optional action slot. */
function SidebarSectionTitle({ label, action }: { label: string; action?: ReactNode }) {
  return <div className="zen-sidebar__item zen-sidebar__section-item" role="presentation">
    <span className="zen-sidebar__item-label">{label}</span>
    {action ? <span className="zen-sidebar__section-action">{action}</span> : null}
  </div>;
}

function ItemList({ sections, collapsed, openItems, setOpenItems, onItemClick }: {
  sections: SidebarSection[];
  collapsed: boolean;
  openItems: Record<string, boolean>;
  setOpenItems: Dispatch<SetStateAction<Record<string, boolean>>>;
  onItemClick?: (item: SidebarItem) => void;
}) {
  return (
    <div className="zen-sidebar__items">
      {sections.map((section, index) => (
        <section className="zen-sidebar__section" key={`${section.label ?? "section"}-${index}`}>
          {section.label ? <SidebarSectionTitle label={section.label} action={section.action} /> : null}
          <div className="zen-sidebar__section-items">
            {section.items.map((item) => <SidebarItemView key={item.id} item={item} depth={0} collapsed={collapsed} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function SidebarPanel({ className, brand, brandSlots, sections, footer, search, collapsed, onCollapsedChange, openItems, setOpenItems, onItemClick }: {
  className: string;
  brand?: ReactNode;
  brandSlots?: SidebarBrandSlots;
  sections: SidebarSection[];
  footer?: ReactNode;
  search?: ReactNode;
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  openItems: Record<string, boolean>;
  setOpenItems: Dispatch<SetStateAction<Record<string, boolean>>>;
  onItemClick?: (item: SidebarItem) => void;
}) {
  const t = useZenLabels();
  return (
    <div className={className}>
      <div className="zen-sidebar__header">{brand ?? <DefaultSidebarBrand {...brandSlots} collapsed={collapsed} onCollapsedChange={onCollapsedChange} />}</div>
      {search ? <div className="zen-sidebar__search">{collapsed
        // Figma collapsed rail: Search becomes Button/Icon-Main Small Tertiary; activating it expands the panel.
        ? <IconButton appearance="main" level="tertiary" size="sm" aria-label={t.search} icon={<Icon name="icon-search-medium-line" />} onClick={() => onCollapsedChange?.(false)} />
        : search}</div> : null}
      <div className="zen-sidebar__body"><ItemList sections={sections} collapsed={collapsed} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} /></div>
      {footer ? <><div className="zen-sidebar__divider" aria-hidden="true" /><div className="zen-sidebar__footer"><div className="zen-sidebar__footer-content">{footer}</div></div></> : null}
    </div>
  );
}

/** Figma Side-Bar/Sub → Sub-Item: Search/Popover, then the Item-List of Master menu items (gap Small). */
export function SidebarSubMenu({ search, items = [], sections = [], onItemClick, children, className }: SidebarSubMenuProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  return (
    <div className={["zen-sidebar__sub-content", className].filter(Boolean).join(" ")}>
      {search ? <div className="zen-sidebar__sub-search">{search}</div> : null}
      {items.length ? <div className="zen-sidebar__sub-items">
        {items.map((item) => <SidebarItemView key={item.id} item={item} depth={0} collapsed={false} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />)}
      </div> : null}
      {sections.length ? <ItemList sections={sections} collapsed={false} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} /> : null}
      {children}
    </div>
  );
}

/** Flyout surface for the Side-Bar/Sub panel, positioned outside the sidebar's right edge. */
function SidebarFlyout({ children, label, onClose, rootRef }: { children: ReactNode; label: string; onClose?: (event: KeyboardEvent | globalThis.PointerEvent) => void; rootRef: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    if (!onClose) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(event); };
    const onPointer = (event: globalThis.PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) onClose(event); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer); };
  }, [onClose, rootRef]);
  return <div className="zen-sidebar__submenu" role="region" aria-label={label}>{children}</div>;
}

export function Sidebar({ variant: requestedVariant, density: requestedDensity, collapsed = false, onCollapsedChange, brand, logo, logoCollapsed, productName, "aria-label": ariaLabel, sections = [], selectedId, linkAs, footer, search, onItemClick, className, background = "default", workspaceBrand, workspaceItems = [], workspaceFooter, workspaceAction, headerAction, workspaceBar = true, subMenu, subMenuLabel: subMenuLabelProp, onSubMenuClose }: SidebarProps) {
  const t = useZenLabels();
  const subMenuLabel = subMenuLabelProp ?? t.subMenu;
  const rootRef = useRef<HTMLElement>(null);
  const flyout = subMenu ? <SidebarFlyout label={subMenuLabel} onClose={onSubMenuClose} rootRef={rootRef}>{subMenu}</SidebarFlyout> : null;
  const variant = requestedVariant ?? (requestedDensity === "small" ? "small-density" : "basic");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const rootClassName = ["zen-sidebar", className].filter(Boolean).join(" ");
  const nav = { selectedId, linkAs };
  // When the selection moves (e.g. a link elsewhere on the page), open the groups that hold the selected item. They stay
  // open after the selection leaves them (no jump under the pointer) until the user collapses them.
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  useEffect(() => {
    if (selectedId === undefined) return;
    const path = ancestorsOf(sectionsRef.current.flatMap((section) => section.items), selectedId);
    if (path.length) setOpenItems((current) => (path.every((id) => current[id] === true) ? current : { ...current, ...Object.fromEntries(path.map((id) => [id, true])) }));
  }, [selectedId]);

  if (variant === "workspace") {
    return (
      <aside ref={rootRef} className={rootClassName} data-variant="workspace" data-background={background} data-collapsed="false" aria-label={ariaLabel ?? t.workspaceNavigation}>
        {workspaceBar ? <div className="zen-sidebar__workspace-rail">
          <div className="zen-sidebar__workspace-header">{workspaceBrand ?? <span className="zen-sidebar__workspace-default-mark" aria-hidden="true"><Icon name="icon-zen" size="lg" /></span>}</div>
          <div className="zen-sidebar__workspace-body"><div className="zen-sidebar__workspace-items">
            {workspaceItems.map((item) => <SidebarItemView key={item.id} item={{ ...item, icon: item.icon ?? <span /> }} depth={0} collapsed openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />)}
            {workspaceAction ? <div className="zen-sidebar__workspace-action-slot">{workspaceAction}</div> : null}
          </div></div>
          {workspaceFooter ? <div className="zen-sidebar__workspace-footer">{workspaceFooter}</div> : null}
        </div> : null}
        {/* Figma Side-Bar/Master/Workspace has no Expand axis: the panel never collapses, so no collapse control. */}
        <SidebarNavContext value={nav}>
          <SidebarPanel className="zen-sidebar__workspace-main" brand={brand ?? (workspaceItems.length ? <WorkspaceHeader items={workspaceItems} onSelect={onItemClick} action={headerAction} /> : undefined)} sections={sections} footer={footer} search={search} collapsed={false} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />
          {flyout}
        </SidebarNavContext>
      </aside>
    );
  }

  return (
    <aside ref={rootRef} className={rootClassName} data-variant={variant} data-background={background} data-collapsed={collapsed ? "true" : "false"} data-sidebar-density={requestedDensity ?? (variant === "small-density" ? "small" : "medium")} aria-label={ariaLabel ?? t.mainNavigation}>
      <SidebarNavContext value={nav}>
        <SidebarPanel className="zen-sidebar__surface" brand={brand} brandSlots={{ logo, logoCollapsed, productName }} sections={sections} footer={footer} search={search} collapsed={collapsed} onCollapsedChange={onCollapsedChange} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />
        {flyout}
      </SidebarNavContext>
    </aside>
  );
}

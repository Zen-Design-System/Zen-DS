import { Children, cloneElement, createContext, Fragment, isValidElement, useContext, useEffect, useRef, useState, type Dispatch, type ElementType, type FocusEvent, type PointerEvent, type ReactElement, type ReactNode, type RefObject, type SetStateAction } from "react";
import { ZenPortal } from "../Portal";
import { Icon, type IconName } from "../Icon";
import { BadgeCounter } from "../Badge";
import { IconButton } from "../Button";
import { TOOLTIP_HOVER_DELAY, TooltipSurface, useIconTooltip } from "../Tooltip";
import { Popover } from "../Popover";
import { renderIcon } from "../_shared/icon";
import { slotItems } from "../_shared/slots";
import { useZenLabels } from "../_shared/zen-context";
import { useSidebarShell } from "../_shared/sidebar-shell";
import { NotificationDot } from "../_shared/notification-dot";
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
  /** Figma Menu-Item Theme: `neutral` (the default at every level, Figma's default; the selected row is
   *  Active/Neutral/Subtle) or `accent` (Active/Accent/Subtle with Accent/Strongest text). */
  theme?: SidebarItemTheme;
  dropdown?: boolean;
  indent?: boolean;
  /** Figma Counter (a Small Neutral Subtle BadgeCounter). The collapsed rail has no room for it: a non-zero count shows
   *  the Notification-Dot instead and joins the row's name ("Approvals, 3"). */
  counter?: ReactNode;
  /** Figma Primitives/Notification-Dot on the icon. */
  notificationDot?: boolean;
  /** Figma Trailing-Slot (Trailing-Action on): content after the label (an icon, a shortcut). Not a control: the row
   *  itself is the button or link. */
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
  /** Replaces the header's logo slots; the collapse control (with `onCollapsedChange`) follows it. In the collapsed rail
   * `logoCollapsed` takes its place; without it the rail keeps only the brand's first element (its mark), centred, and
   * hides the rest visually. */
  brand?: ReactNode;
  /** Header logo while expanded (Figma LOGO / Union). Sized to the header height (24px; 20px in Small-Density). */
  logo?: ReactNode;
  /** Mark shown centred in the collapsed rail instead of `logo` or a custom `brand` (Figma collapsed Logo, 28px; 20px
   * in Small-Density). */
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
  /** Figma Body-Content (Child-Body-Content in the workspace variant), after `sections`: `<SidebarMenuItem>` rows and
   *  `<SidebarMenuSection>` groups, or any content. Consecutive rows form one unlabelled section. The rows share the
   *  Sidebar's selection, rail and `onItemClick`; other content renders as it is, so it handles the rail itself. */
  children?: ReactNode;
  /** Figma Footer-Content (Child-Footer-Content), under a divider: `<SidebarMenuItem>` rows like the body's, or the app's
   *  own buttons of an Icon and a label span (the rail hides the label visually, keeps it as the name and the tooltip). */
  footer?: ReactNode;
  /** The slot under the header (Figma Search): usually a Search field, or a Back control over a module title. */
  search?: ReactNode;
  /** What the collapsed rail shows in place of `search`. Default: a Search button that expands the panel. Pass the
   *  slot's own control when it is not a search (a Back chevron for a module's Back + title, backlog batch 6). */
  searchCollapsed?: ReactNode;
  onItemClick?: (item: SidebarItem) => void;
  className?: string;
  /** Default = Surface with a shadow (a Canvas/Default page; cards on the page take the same shadow, no border). Alt
   *  (Surface/Alt) and Flat are the only choices on a Canvas/Alt (white) page, where cards are bordered. */
  background?: SidebarBackground;
  /** A Pale divider on the Sidebar's inner edge, the full height of the block: separates an Alt or Flat Sidebar from the
   *  page on a Canvas/Alt (white) page. Not with the default Sidebar, whose shadow already separates it. */
  divider?: boolean;
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
  /** Figma Sub-Item slot content under the item list: `<SidebarMenuItem>` rows (they share `onItemClick`) or anything else. */
  children?: ReactNode;
  className?: string;
}

/** Figma Primitives/Side-Bar/Menu-Item/Master (1536:27473) as a slot row: the fields of a `SidebarItem` entry, in a
 *  Sidebar's `children` (Body-Content) or `footer` (Footer-Content), a `SidebarMenuSection` or a `SidebarSubMenu`. */
export type SidebarMenuItemProps = Omit<SidebarItem, "children"> & {
  /** Nested rows (Figma Level=Child): `<SidebarMenuItem>` children, or a `SidebarItem[]`. */
  children?: ReactNode | SidebarItem[];
};

export interface SidebarMenuSectionProps {
  /** Section title: the Menu-Item section label (Body/Small), as `SidebarSection.label`. */
  label?: string;
  /** Section-title action: a Button/Icon-Flat Small, as `SidebarSection.action`. */
  action?: ReactNode;
  /** The section's `<SidebarMenuItem>` rows. */
  children?: ReactNode;
}

type SidebarBrandSlots = { logo?: ReactNode; logoCollapsed?: ReactNode; productName?: ReactNode };

/** The header's collapse control (Figma Basic/Small-Density). Only rendered when the owner can act on it: a dead
 *  (disabled) toggle reads as broken. */
function SidebarCollapseButton({ collapsed, onCollapsedChange }: { collapsed: boolean; onCollapsedChange: (collapsed: boolean) => void }) {
  const t = useZenLabels();
  const collapseLabel = collapsed ? t.expandSidebar : t.collapseSidebar;
  // Icon-only control → its name as a tooltip (1s hover, instant on keyboard focus, never on touch).
  const collapseTip = useIconTooltip(collapseLabel, { placement: "bottom" });
  return (
    <>
      <button {...collapseTip.bind()} className="zen-sidebar__collapse" type="button" aria-label={collapseLabel} aria-expanded={!collapsed} onClick={() => onCollapsedChange(!collapsed)}>
        <Icon name={collapsed ? "icon-layout-right-line" : "icon-layout-left-line"} size="base" decorative />
      </button>
      {collapseTip.tooltip}
    </>
  );
}

/** Header built from the logo slots plus the collapse control. No product branding by default: apps pass their own. */
function DefaultSidebarBrand({ collapsed, onCollapsedChange, logo, logoCollapsed, productName }: SidebarBrandSlots & { collapsed: boolean; onCollapsedChange?: (collapsed: boolean) => void }) {
  return (
    <div className="zen-sidebar__default-brand" data-collapsed={collapsed ? "true" : "false"}>
      {logo ? <span className="zen-sidebar__default-brand-expanded">{logo}</span> : null}
      {logoCollapsed ? <span className="zen-sidebar__default-brand-collapsed">{logoCollapsed}</span> : null}
      {productName ? <span className="zen-sidebar__default-brand-product">{productName}</span> : null}
      {onCollapsedChange ? <SidebarCollapseButton collapsed={collapsed} onCollapsedChange={onCollapsedChange} /> : null}
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
        <button ref={anchorRef} type="button" className="zen-sidebar__workspace-trigger" aria-haspopup="listbox" aria-expanded={open} disabled={items.length < 2} onClick={() => setOpen((next) => !next)}
          // APG listbox button: Down / Up Arrow open the list as Enter and Space do; focus lands on the current workspace.
          onKeyDown={(event) => { if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); } }}>
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
  const [position, setPosition] = useState<{ top: number; left: number; label?: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const clear = () => window.clearTimeout(timer.current);
  const hide = () => { clear(); setPosition(null); };
  const show = (target: HTMLElement, wait: number, label?: string) => {
    clear();
    const place = () => { const rect = target.getBoundingClientRect(); setPosition({ top: rect.top + rect.height / 2, left: rect.right + 8, label }); };
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
  return { position: enabled ? position : null, triggerProps, show, hide };
}

/** Collapsed rail footer: the footer's buttons are the app's own markup (`<button><Icon /><span>Label</span></button>`),
 * so their rail tooltip is delegated from the footer. The label span stays in the accessibility tree (visually hidden in
 * sidebar.css), so each button keeps its name; the tooltip shows that name after 1s hover and at once on keyboard focus,
 * like the rail items. */
function useRailFooterTooltip(enabled: boolean) {
  const tooltip = useRailTooltip(enabled);
  const current = useRef<HTMLElement | null>(null);
  const buttonOf = (target: EventTarget | null) => (target instanceof Element ? target.closest<HTMLElement>(".zen-sidebar__footer-content > button:not(:disabled)") : null);
  const nameOf = (button: HTMLElement) => button.getAttribute("aria-label")?.trim() || button.textContent?.trim() || "";
  const footerProps = enabled ? {
    onPointerOver: (event: PointerEvent<HTMLElement>) => {
      const button = buttonOf(event.target);
      if (event.pointerType === "touch" || !button || button === current.current) return;
      current.current = button;
      const name = nameOf(button);
      if (name) tooltip.show(button, TOOLTIP_HOVER_DELAY, name);
    },
    onPointerOut: (event: PointerEvent<HTMLElement>) => {
      const button = buttonOf(event.target);
      if (!button || (event.relatedTarget instanceof Node && button.contains(event.relatedTarget))) return;
      current.current = null;
      tooltip.hide();
    },
    onPointerDown: tooltip.hide,
    onFocus: (event: FocusEvent<HTMLElement>) => {
      const button = buttonOf(event.target);
      const name = button?.matches(":focus-visible") ? nameOf(button) : "";
      if (button && name) tooltip.show(button, 0, name);
    },
    onBlur: tooltip.hide,
  } : {};
  return { position: tooltip.position, footerProps };
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
  // Figma's Theme defaults to Neutral for Master and Child rows alike (HR-Platform Time Off › Leave Types is grey);
  // child rows were accent before 2026-10-05.
  const theme = item.theme ?? "neutral";
  const state = item.disabled ? "disabled" : (item.state ?? "default");
  const tooltip = useRailTooltip(collapsed && !item.disabled);
  // A counter the collapsed rail hides (Approvals 3): its text joins the row's name and a Notification-Dot shows it.
  const railCount = collapsed && (typeof item.counter === "number" ? item.counter > 0 : typeof item.counter === "string" ? item.counter.trim() !== "" && item.counter.trim() !== "0" : false) ? String(item.counter) : "";
  // The rail has no room for the counter: Figma's Notification-Dot (in every Item's Icon-Wrapper) marks it instead.
  const dot = Boolean(item.notificationDot || railCount);
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
        aria-label={collapsed ? (railCount ? `${item.label}, ${railCount}` : item.label) : undefined}
        {...tooltip.triggerProps}
      >
        {item.icon ? <span className="zen-sidebar__item-icon">{renderIcon(item.icon, { size: "base" })}{dot ? <NotificationDot className="zen-sidebar__notification-dot" /> : null}</span> : null}
        <span className="zen-sidebar__item-label">{item.label}</span>
        {item.counter !== undefined ? <BadgeCounter className="zen-sidebar__counter" size="small" theme="neutral" background="subtle" value={item.counter} /> : null}
        {dot && !item.icon ? <NotificationDot className="zen-sidebar__notification-dot zen-sidebar__notification-dot--row" /> : null}
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

/** Row state of the panel (or the flyout) that slot rows share: the rail, the open groups and the owner's handler. */
type SidebarRowsState = {
  collapsed: boolean;
  openItems: Record<string, boolean>;
  setOpenItems: Dispatch<SetStateAction<Record<string, boolean>>>;
  onItemClick?: (item: SidebarItem) => void;
};
const SidebarRowsContext = createContext<SidebarRowsState | null>(null);

const isItemData = (value: unknown): value is SidebarItem[] => Array.isArray(value) && value.length > 0
  && value.every((entry) => typeof entry === "object" && entry !== null && !isValidElement(entry) && "id" in entry);

/** A slot row's props as the `SidebarItem` the rows render; its nested rows are read the same way. */
function menuItemOf({ children, slotKey, ...item }: SidebarMenuItemProps & { slotKey?: string }): SidebarItem {
  const nested = isItemData(children) ? children : slotItems(children as ReactNode, SidebarMenuItem).map(menuItemOf);
  return nested.length ? { ...item, children: nested } : item;
}

/** Every SidebarMenuItem of a slot (in a SidebarMenuSection too), for the groups `selectedId` opens. */
function slotMenuItems(nodes: ReactNode): SidebarItem[] {
  const out: SidebarItem[] = [];
  Children.forEach(nodes, (node) => {
    if (!isValidElement(node)) return;
    const element = node as ReactElement<{ children?: ReactNode }>;
    if (element.type === SidebarMenuItem) out.push(menuItemOf(element.props as SidebarMenuItemProps));
    else if (element.type === Fragment || element.type === SidebarMenuSection) out.push(...slotMenuItems(element.props.children));
  });
  return out;
}

/** A slot's children in order, fragments flattened (their keys prefixed, so they stay unique). */
function flatSlot(nodes: ReactNode, prefix = ""): ReactNode[] {
  return Children.toArray(nodes).flatMap((node) => isValidElement(node) && node.type === Fragment
    ? flatSlot((node as ReactElement<{ children?: ReactNode }>).props.children, `${prefix}${node.key}/`)
    : [prefix && isValidElement(node) ? cloneElement(node, { key: `${prefix}${node.key}` }) : node]);
}

/** Consecutive SidebarMenuItem rows of a slot go into one list (`wrap`); anything else stays where it is. */
function slotBlocks(nodes: ReactNode, wrap: (rows: ReactNode[], key: string) => ReactNode): ReactNode[] {
  const blocks: ReactNode[] = [];
  let rows: ReactNode[] = [];
  const close = () => { if (rows.length) blocks.push(wrap(rows, `rows-${blocks.length}`)); rows = []; };
  for (const node of flatSlot(nodes)) {
    if (isValidElement(node) && node.type === SidebarMenuItem) rows.push(node);
    else { close(); blocks.push(node); }
  }
  close();
  return blocks;
}

/** Figma Primitives/Side-Bar/Menu-Item/Master (1536:27473) placed in a slot: Body-Content (`<Sidebar>` children),
 *  Footer-Content (`footer`), a `SidebarMenuSection` or a `SidebarSubMenu`. It reads the Sidebar's selection
 *  (`selectedId`), rail and `onItemClick`, exactly like a `sections` entry with the same fields. */
export function SidebarMenuItem(props: SidebarMenuItemProps) {
  const rows = useContext(SidebarRowsContext);
  // Outside a Sidebar or flyout the row keeps its own open groups.
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  return <SidebarItemView item={menuItemOf(props)} depth={0} collapsed={rows?.collapsed ?? false} openItems={rows?.openItems ?? openItems} setOpenItems={rows?.setOpenItems ?? setOpenItems} onItemClick={rows?.onItemClick} />;
}

/** A titled group of `<SidebarMenuItem>` rows in a slot, the JSX form of a `sections` entry (Figma section label +
 *  Item-List). The collapsed rail hides the title and opens later groups with a divider, as for `sections`. */
export function SidebarMenuSection({ label, action, children }: SidebarMenuSectionProps) {
  return (
    <section className="zen-sidebar__section">
      {label ? <SidebarSectionTitle label={label} action={action} /> : null}
      <div className="zen-sidebar__section-items">{children}</div>
    </section>
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

function ItemList({ sections, children, collapsed, openItems, setOpenItems, onItemClick }: {
  sections: SidebarSection[];
  /** Body-Content slot children, after the sections. */
  children?: ReactNode;
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
      {slotBlocks(children, (rows, key) => <section className="zen-sidebar__section" key={key}><div className="zen-sidebar__section-items">{rows}</div></section>)}
    </div>
  );
}

function SidebarPanel({ className, brand, brandSlots, sections, children, footer, search, searchCollapsed, collapsed, onCollapsedChange, expandRail, openItems, setOpenItems, onItemClick }: {
  className: string;
  brand?: ReactNode;
  brandSlots?: SidebarBrandSlots;
  sections: SidebarSection[];
  children?: ReactNode;
  footer?: ReactNode;
  search?: ReactNode;
  searchCollapsed?: ReactNode;
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Expands the rail (its Search button): the Sidebar's own onCollapsedChange, or the AppShell's. */
  expandRail?: () => void;
  openItems: Record<string, boolean>;
  setOpenItems: Dispatch<SetStateAction<Record<string, boolean>>>;
  onItemClick?: (item: SidebarItem) => void;
}) {
  const t = useZenLabels();
  const footerTooltip = useRailFooterTooltip(collapsed && Boolean(footer));
  return (
    <SidebarRowsContext value={{ collapsed, openItems, setOpenItems, onItemClick }}>
      <div className={className}>
        {/* A custom brand is the expanded header, followed by the collapse control (backlog batch 6, user 2026-10-07); the
            rail shows logoCollapsed in its place. */}
        <div className="zen-sidebar__header">{brand && !(collapsed && brandSlots?.logoCollapsed)
          ? <>{brand}{onCollapsedChange ? <SidebarCollapseButton collapsed={collapsed} onCollapsedChange={onCollapsedChange} /> : null}</>
          : <DefaultSidebarBrand {...brandSlots} collapsed={collapsed} onCollapsedChange={onCollapsedChange} />}</div>
        {search ? <div className="zen-sidebar__search">{collapsed
          // Figma collapsed rail: Search becomes Button/Icon-Main Small Tertiary; activating it expands the panel.
          ? searchCollapsed ?? <IconButton appearance="main" level="tertiary" size="sm" aria-label={t.search} icon={<Icon name="icon-search-medium-line" />} onClick={expandRail} />
          : search}</div> : null}
        <div className="zen-sidebar__body"><ItemList sections={sections} collapsed={collapsed} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick}>{children}</ItemList></div>
        {footer ? <><div className="zen-sidebar__divider" aria-hidden="true" /><div className="zen-sidebar__footer"><div className="zen-sidebar__footer-content" {...footerTooltip.footerProps}>{footer}</div></div></> : null}
        {footerTooltip.position ? (
          <ZenPortal><TooltipSurface aria-hidden="true" className="zen-sidebar__rail-tooltip" style={{ top: footerTooltip.position.top, left: footerTooltip.position.left }}>{footerTooltip.position.label}</TooltipSurface></ZenPortal>
        ) : null}
      </div>
    </SidebarRowsContext>
  );
}

/** Figma Side-Bar/Sub → Sub-Item: Search/Popover, then the Item-List of Master menu items (gap Small). */
export function SidebarSubMenu({ search, items = [], sections = [], onItemClick, children, className }: SidebarSubMenuProps) {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  return (
    <SidebarRowsContext value={{ collapsed: false, openItems, setOpenItems, onItemClick }}>
      <div className={["zen-sidebar__sub-content", className].filter(Boolean).join(" ")}>
        {search ? <div className="zen-sidebar__sub-search">{search}</div> : null}
        {items.length ? <div className="zen-sidebar__sub-items">
          {items.map((item) => <SidebarItemView key={item.id} item={item} depth={0} collapsed={false} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />)}
        </div> : null}
        {sections.length ? <ItemList sections={sections} collapsed={false} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} /> : null}
        {slotBlocks(children, (rows, key) => <div className="zen-sidebar__sub-items" key={key}>{rows}</div>)}
      </div>
    </SidebarRowsContext>
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

export function Sidebar({ variant: requestedVariant, density: requestedDensity, collapsed: collapsedProp = false, onCollapsedChange: onCollapsedChangeProp, brand, logo, logoCollapsed, productName, "aria-label": ariaLabel, sections = [], selectedId, linkAs, children, footer, search, searchCollapsed, onItemClick, className, background = "default", divider = false, workspaceBrand, workspaceItems = [], workspaceFooter, workspaceAction, headerAction, workspaceBar = true, subMenu, subMenuLabel: subMenuLabelProp, onSubMenuClose }: SidebarProps) {
  const t = useZenLabels();
  // Inside an AppShell (directly or wrapped in an app component) the shell owns the rail unless the Sidebar has its own
  // onCollapsedChange; its drawer always shows the whole navigation with no collapse control.
  const shell = useSidebarShell();
  const collapsed = shell?.drawer ? false : onCollapsedChangeProp ? collapsedProp : (shell?.collapsed ?? collapsedProp);
  const onCollapsedChange = shell?.drawer ? undefined : onCollapsedChangeProp;
  const expandRail = onCollapsedChange ? () => onCollapsedChange(false) : shell?.expand;
  const subMenuLabel = subMenuLabelProp ?? t.subMenu;
  const rootRef = useRef<HTMLElement>(null);
  const flyout = subMenu ? <SidebarFlyout label={subMenuLabel} onClose={onSubMenuClose} rootRef={rootRef}>{subMenu}</SidebarFlyout> : null;
  const variant = requestedVariant ?? (requestedDensity === "small" ? "small-density" : "basic");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const rootClassName = ["zen-sidebar", className].filter(Boolean).join(" ");
  const nav = { selectedId, linkAs };
  // When the selection moves (e.g. a link elsewhere on the page), open the groups that hold the selected item. They stay
  // open after the selection leaves them (no jump under the pointer) until the user collapses them.
  const itemsRef = useRef<SidebarItem[]>([]);
  itemsRef.current = [...sections.flatMap((section) => section.items), ...slotMenuItems(children), ...slotMenuItems(footer)];
  useEffect(() => {
    if (selectedId === undefined) return;
    const path = ancestorsOf(itemsRef.current, selectedId);
    if (path.length) setOpenItems((current) => (path.every((id) => current[id] === true) ? current : { ...current, ...Object.fromEntries(path.map((id) => [id, true])) }));
  }, [selectedId]);

  if (variant === "workspace") {
    return (
      <nav ref={rootRef} className={rootClassName} data-variant="workspace" data-background={background} data-divider={divider ? "true" : undefined} data-collapsed="false" aria-label={ariaLabel ?? t.workspaceNavigation}>
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
          <SidebarPanel className="zen-sidebar__workspace-main" brand={brand ?? (workspaceItems.length ? <WorkspaceHeader items={workspaceItems} onSelect={onItemClick} action={headerAction} /> : undefined)} sections={sections} footer={footer} search={search} collapsed={false} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick}>{children}</SidebarPanel>
          {flyout}
        </SidebarNavContext>
      </nav>
    );
  }

  return (
    <nav ref={rootRef} className={rootClassName} data-variant={variant} data-background={background} data-divider={divider ? "true" : undefined} data-collapsed={collapsed ? "true" : "false"} data-sidebar-density={requestedDensity ?? (variant === "small-density" ? "small" : "medium")} aria-label={ariaLabel ?? t.mainNavigation}>
      <SidebarNavContext value={nav}>
        <SidebarPanel className="zen-sidebar__surface" brand={brand} brandSlots={{ logo, logoCollapsed, productName }} sections={sections} footer={footer} search={search} searchCollapsed={searchCollapsed} collapsed={collapsed} onCollapsedChange={onCollapsedChange} expandRail={expandRail} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick}>{children}</SidebarPanel>
        {flyout}
      </SidebarNavContext>
    </nav>
  );
}

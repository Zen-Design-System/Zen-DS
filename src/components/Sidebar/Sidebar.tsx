import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Icon } from "../Icon";
import { IconButton } from "../Button";
import unionLogo from "../../assets/figma/sidebar/union.svg";
import "./sidebar.css";

export type SidebarVariant = "basic" | "workspace" | "small-density";
export type SidebarBackground = "default" | "flat" | "inverse";
export type SidebarItemState = "default" | "hover" | "focus" | "disabled";
export type SidebarItemTheme = "neutral" | "accent";

export type SidebarItem = {
  id: string;
  label: string;
  icon?: ReactNode;
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
};

export type SidebarSection = {
  label?: string;
  action?: ReactNode;
  items: SidebarItem[];
};

export interface SidebarProps {
  variant?: SidebarVariant;
  /** Compatibility alias for the earlier component API. */
  density?: "medium" | "small";
  collapsed?: boolean;
  /** Controlled collapse callback used by the Figma Basic/Small-Density header control. */
  onCollapsedChange?: (collapsed: boolean) => void;
  brand?: ReactNode;
  sections?: SidebarSection[];
  footer?: ReactNode;
  search?: ReactNode;
  onItemClick?: (item: SidebarItem) => void;
  className?: string;
  background?: SidebarBackground;
  workspaceBrand?: ReactNode;
  workspaceItems?: SidebarItem[];
  workspaceFooter?: ReactNode;
  workspaceBar?: boolean;
  subMenu?: ReactNode;
}

function DefaultSidebarBrand({ collapsed, onCollapsedChange }: { collapsed: boolean; onCollapsedChange?: (collapsed: boolean) => void }) {
  return (
    <div className="zen-sidebar__default-brand" data-collapsed={collapsed ? "true" : "false"}>
      <span className="zen-sidebar__default-brand-expanded" aria-hidden="true"><img src={unionLogo} alt="" /></span>
      <span className="zen-sidebar__default-brand-collapsed" aria-hidden="true"><Icon name="icon-zen" size={28} /></span>
      <span className="zen-sidebar__default-brand-kaiz">Kaiz</span>
      <button className="zen-sidebar__collapse" type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => onCollapsedChange?.(!collapsed)} disabled={!onCollapsedChange}>
        <Icon name={collapsed ? "icon-layout-right-line" : "icon-layout-left-line"} size="sm" decorative />
      </button>
    </div>
  );
}

function defaultExpanded(item: SidebarItem) {
  return Boolean(item.active || item.selected || item.children?.some(defaultExpanded));
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
  const hasChildren = Boolean(item.children?.length);
  const isOpen = openItems[item.id] ?? defaultExpanded(item);
  const selected = item.selected ?? item.active ?? false;
  const theme = item.theme ?? (depth > 0 ? "accent" : "neutral");
  const state = item.disabled ? "disabled" : (item.state ?? "default");

  return (
    <div className="zen-sidebar__item-group" data-level={depth === 0 ? "master" : "child"}>
      <button
        className="zen-sidebar__item"
        data-depth={depth}
        data-selected={selected ? "true" : "false"}
        data-theme={theme}
        data-state={state}
        disabled={item.disabled}
        onClick={() => {
          if (hasChildren || item.dropdown) setOpenItems((current) => ({ ...current, [item.id]: !isOpen }));
          onItemClick?.(item);
        }}
        type="button"
        aria-current={selected ? "page" : undefined}
        aria-expanded={hasChildren || item.dropdown ? isOpen : undefined}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
      >
        {item.icon ? <span className="zen-sidebar__item-icon">{item.icon}</span> : null}
        <span className="zen-sidebar__item-label">{item.label}</span>
        {item.counter !== undefined ? <span className="zen-sidebar__counter">{item.counter}</span> : null}
        {item.notificationDot ? <span className="zen-sidebar__notification-dot" aria-hidden="true" /> : null}
        {hasChildren || item.dropdown ? (
          <span className="zen-sidebar__item-dropdown" data-open={isOpen} aria-hidden="true">
            <Icon name="icon-chevron-down-01-line" size="base" />
          </span>
        ) : null}
        {item.trailingAction ? <span className="zen-sidebar__trailing-action">{item.trailingAction}</span> : null}
      </button>
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

function SidebarPanel({ className, brand, sections, footer, search, collapsed, onCollapsedChange, openItems, setOpenItems, onItemClick }: {
  className: string;
  brand?: ReactNode;
  sections: SidebarSection[];
  footer?: ReactNode;
  search?: ReactNode;
  collapsed: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  openItems: Record<string, boolean>;
  setOpenItems: Dispatch<SetStateAction<Record<string, boolean>>>;
  onItemClick?: (item: SidebarItem) => void;
}) {
  return (
    <div className={className}>
      <div className="zen-sidebar__header">{brand ?? <DefaultSidebarBrand collapsed={collapsed} onCollapsedChange={onCollapsedChange} />}</div>
      {search ? <div className="zen-sidebar__search">{collapsed
        // Figma collapsed rail: Search becomes Button/Icon-Main Small Tertiary; activating it expands the panel.
        ? <IconButton appearance="main" level="tertiary" size="sm" aria-label="Search" icon={<Icon name="icon-search-medium-line" />} onClick={() => onCollapsedChange?.(false)} />
        : search}</div> : null}
      <div className="zen-sidebar__body"><ItemList sections={sections} collapsed={collapsed} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} /></div>
      {footer ? <><div className="zen-sidebar__divider" aria-hidden="true" /><div className="zen-sidebar__footer"><div className="zen-sidebar__footer-content">{footer}</div></div></> : null}
    </div>
  );
}

export function Sidebar({ variant: requestedVariant, density: requestedDensity, collapsed = false, onCollapsedChange, brand, sections = [], footer, search, onItemClick, className, background = "default", workspaceBrand, workspaceItems = [], workspaceFooter, workspaceBar = true, subMenu }: SidebarProps) {
  const variant = requestedVariant ?? (requestedDensity === "small" ? "small-density" : "basic");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const rootClassName = ["zen-sidebar", className].filter(Boolean).join(" ");

  if (variant === "workspace") {
    return (
      <aside className={rootClassName} data-variant="workspace" data-background={background} data-collapsed="false" aria-label="Zen Design System workspace navigation">
        {workspaceBar ? <div className="zen-sidebar__workspace-rail">
          <div className="zen-sidebar__workspace-header">{workspaceBrand ?? <span className="zen-sidebar__workspace-default-mark" aria-hidden="true"><Icon name="icon-zen" size={28} /></span>}</div>
          <div className="zen-sidebar__workspace-body"><div className="zen-sidebar__workspace-items">
            {workspaceItems.map((item) => <SidebarItemView key={item.id} item={{ ...item, icon: item.icon ?? <span /> }} depth={0} collapsed openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />)}
          </div></div>
          {workspaceFooter ? <div className="zen-sidebar__workspace-footer">{workspaceFooter}</div> : null}
        </div> : null}
        <SidebarPanel className="zen-sidebar__workspace-main" brand={brand} sections={sections} footer={footer} search={search} collapsed={false} onCollapsedChange={onCollapsedChange} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />
        {subMenu ? <div className="zen-sidebar__submenu-overlay">{subMenu}</div> : null}
      </aside>
    );
  }

  return (
    <aside className={rootClassName} data-variant={variant} data-background={background} data-collapsed={collapsed ? "true" : "false"} data-density={requestedDensity ?? (variant === "small-density" ? "small" : "medium")} aria-label="Zen Design System navigation">
      <SidebarPanel className="zen-sidebar__surface" brand={brand} sections={sections} footer={footer} search={search} collapsed={collapsed} onCollapsedChange={onCollapsedChange} openItems={openItems} setOpenItems={setOpenItems} onItemClick={onItemClick} />
      {subMenu ? <div className="zen-sidebar__submenu-overlay">{subMenu}</div> : null}
    </aside>
  );
}

import { useId, useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { BadgeCounter } from "../Badge";
import type { IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { slotItems } from "../_shared/slots";
import { scaleKey } from "../_shared/scale";
import { typographyStyles } from "../../tokens/typography.generated";
import "./tabs.css";
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useControllableState } from "../_shared/use-controllable-state";
import { useMergedRefs } from "../_shared/merge-refs";
import { dataAttributes } from "../_shared/data-attributes";

export const tabSizes = ["medium", "small", "large"] as const;
export const tabVariants = ["indicator", "subtle"] as const;
export const tabStates = ["default", "hover", "disabled"] as const;
/** CSS / Figma key (the `data-size` value). */
type TabSizeKey = (typeof tabSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type TabSize = "md" | "sm" | "lg" | "medium" | "small" | "large";
export type TabVariant = (typeof tabVariants)[number];
export type TabState = (typeof tabStates)[number];

export interface TabItemProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "value"> {
  ref?: Ref<HTMLButtonElement>;
  /** As a child of Tabs (Figma Item-List): the tab's id, what `value` and `onValueChange` use. Default: its key, then
   *  its position. */
  value?: string;
  label?: ReactNode;
  /** Leading icon (Element-Size/Popular/Base 20): an icon name (`"icon-home-03-line"`) or a node. */
  icon?: IconName | ReactNode;
  /** Figma Badge=Yes: Badge-Counter XSmall · Neutral · Subtle after the label. */
  badge?: number | string;
  selected?: boolean;
  /** Short (sm, md, lg) or Figma (small, medium, large) spelling. `lg` (Figma Size=Large, 64px in Compact) is the
   *  desktop top-navigation tab: same label, a taller item whose indicator meets the bar's bottom border. */
  size?: TabSize;
  /** Figma Style: Indicator (underline) or Subtle (filled). */
  variant?: TabVariant;
  /** Deterministic Figma State for matrices; real hover/disabled apply natively. */
  state?: TabState;
}

/** Figma Primitives/Tab-Item (1576:2090): Size × Style × State × Select × Label × Icon (+ Badge). */
export function TabItem({ label, icon, badge, selected = false, size: sizeProp = "md", variant = "indicator", state = "default", disabled, className, type = "button", value: _value, ...props }: TabItemProps) {
  const nest = useNested();
  const size = scaleKey(sizeProp, tabSizes);
  const isDisabled = disabled || state === "disabled";
  const iconOnly = !label && Boolean(icon);
  return (
    <button
      {...props}
      type={type}
      role="tab"
      aria-selected={selected}
      disabled={isDisabled}
      className={["zen-tab", className].filter(Boolean).join(" ")}
      data-size={size}
      data-variant={variant}
      data-selected={selected ? "true" : "false"}
      data-state={isDisabled ? "disabled" : state}
      data-icon-only={iconOnly ? "true" : undefined}
    >
      <span className="zen-tab__container">
        {icon ? <span className="zen-tab__icon" aria-hidden="true">{nest("Icon", renderIcon(icon))}</span> : null}
        {label ? <span className={`zen-tab__label ${typographyStyles[selected ? "Body/Base/Bold" : "Body/Base/Medium"]}`} data-text={typeof label === "string" ? label : undefined}>{label}{typeof label === "string" ? <span className="zen-tab__label-reserve" aria-hidden="true">{label}</span> : null}</span> : null}
        {badge !== undefined && badge !== null && badge !== "" ? nest("Badge-Counter", <BadgeCounter size="xsmall" theme="neutral" background="subtle" value={badge} />) : null}
      </span>
    </button>
  );
}

export type TabOption = {
  id: string;
  label?: ReactNode;
  /** Leading icon: an icon name (`"icon-home-03-line"`) or a node. */
  icon?: IconName | ReactNode;
  badge?: number | string;
  disabled?: boolean;
  "aria-label"?: string;
};

export interface TabsProps {
  /** Ref to the root `role="tablist"` element. */
  ref?: Ref<HTMLDivElement>;
  /** The tabs as data. Or give TabItem children (Figma Item-List): `<TabItem value="general" label="General" />`. */
  items?: TabOption[];
  /** The tabs as TabItem elements, in order, when `items` is not given (Figma's Item-List slot). Tabs still owns the
   *  selection, the roving focus and the ids, so give each one `value`, `label` and optionally `icon`, `badge`,
   *  `disabled`, `aria-label`. */
  children?: ReactNode;
  value?: string;
  defaultValue?: string;
  /** Called with the selected tab's id. */
  onValueChange?: (id: string) => void;
  /** @deprecated Use onValueChange (same arguments). */
  onChange?: (id: string) => void;
  /** Short (sm, md, lg) or Figma (small, medium, large) spelling. `lg` is the desktop top-navigation size (64px). */
  size?: TabSize;
  variant?: TabVariant;
  /** Stretch the bar to its container (Indicator style keeps its bottom border full width). */
  fullWidth?: boolean;
  "aria-label"?: string;
  /**
   * Prefix for tab/panel ids so TabPanels can pair with the tabs (`${idPrefix}-panel-${id}`, `${idPrefix}-tab-${id}`).
   * Only then do the tabs carry `aria-controls`: without it no panel can reference the generated prefix, and an id that
   * points at nothing is an ARIA error (axe aria-valid-attr-value).
   */
  idPrefix?: string;
  className?: string;
  /** Figma instance overrides: props of the tabs it draws, by layer (`{ "Tab-Item[members]/Badge-Counter": { theme: "accent" }, "Tab-Item[members]/Icon": { name: "icon-users-line" } }`). Written by Zen Studio;
   *  app code sets the items. */
  overrides?: NestedOverrides;
}

/** Figma Tab-Bar (1577:5477). Roving tabindex: ←/→ move and select, Home/End jump, disabled tabs are skipped. */
export function Tabs({ ref, items: itemsProp, children, value, defaultValue, onValueChange, onChange, size: sizeProp = "md", variant = "indicator", fullWidth = false, "aria-label": ariaLabel, idPrefix, className, overrides, ...rest }: TabsProps) {
  const nest = useNested(overrides);
  const size = scaleKey(sizeProp, tabSizes);
  const items: TabOption[] = itemsProp ?? slotItems(children, TabItem).map((tab, index) => ({
    id: tab.value ?? tab.slotKey ?? String(index), label: tab.label, icon: tab.icon, badge: tab.badge, disabled: tab.disabled, "aria-label": tab["aria-label"],
  }));
  const generated = useId().replace(/:/g, "");
  const prefix = idPrefix ?? `zen-tabs-${generated}`;
  const [current, select] = useControllableState<string | undefined>({
    value,
    defaultValue: () => defaultValue ?? items.find((item) => !item.disabled)?.id,
    onChange: (id) => { if (id === undefined) return; onValueChange?.(id); onChange?.(id); },
    name: "Tabs value",
  });
  const listRef = useRef<HTMLDivElement>(null);
  const rootRef = useMergedRefs(ref, listRef);
  const enabled = items.filter((item) => !item.disabled);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = enabled.findIndex((item) => item.id === current);
    const next = event.key === "ArrowRight" ? enabled[(index + 1) % enabled.length]
      : event.key === "ArrowLeft" ? enabled[(index - 1 + enabled.length) % enabled.length]
        : event.key === "Home" ? enabled[0]
          : event.key === "End" ? enabled[enabled.length - 1] : undefined;
    if (!next) return;
    event.preventDefault();
    select(next.id);
    // By id, not by position (a tab wrapped by Studio's nest() is not a direct child), and within this tablist (two
    // copies of the same tabs may share an idPrefix).
    listRef.current?.querySelector<HTMLElement>(`[id="${CSS.escape(`${prefix}-tab-${next.id}`)}"]`)?.focus();
  };
  return (
    <div {...dataAttributes(rest)} ref={rootRef} role="tablist" aria-label={ariaLabel} aria-orientation="horizontal" className={["zen-tabs", className].filter(Boolean).join(" ")} data-variant={variant} data-size={size} data-full-width={fullWidth ? "true" : undefined} onKeyDown={onKeyDown}>
      {items.map((item) => nest("Tab-Item", (
        <TabItem
          key={item.id}
          id={`${prefix}-tab-${item.id}`}
          aria-controls={idPrefix ? `${prefix}-panel-${item.id}` : undefined}
          aria-label={item["aria-label"] ?? (!item.label && typeof item.id === "string" ? item.id : undefined)}
          tabIndex={item.id === current ? 0 : -1}
          label={item.label}
          icon={item.icon}
          badge={item.badge}
          disabled={item.disabled}
          selected={item.id === current}
          size={size}
          variant={variant}
          onClick={() => select(item.id)}
        />
      ), item.id))}
    </div>
  );
}

/** Panel paired with a tab: `<TabPanel idPrefix="settings" id="general" hidden={tab !== "general"}>`. */
export function TabPanel({ idPrefix, id, children, hidden, className, ref, ...rest }: {
  idPrefix: string;
  id: string;
  children: ReactNode;
  hidden?: boolean;
  className?: string;
  /** Ref to the panel's root `<div>`. */
  ref?: Ref<HTMLDivElement>;
}) {
  return <div {...dataAttributes(rest)} ref={ref} role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} hidden={hidden} tabIndex={0} className={["zen-tab-panel", className].filter(Boolean).join(" ")}>{children}</div>;
}

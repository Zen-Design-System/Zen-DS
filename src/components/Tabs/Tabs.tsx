import { useId, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode, type Ref } from "react";
import { BadgeCounter } from "../Badge";
import type { IconName } from "../Icon";
import { renderIcon } from "../_shared/icon";
import { slotItems } from "../_shared/slots";
import { scaleKey } from "../_shared/scale";
import { typographyStyles } from "../../tokens/typography.generated";
import "./tabs.css";

export const tabSizes = ["medium", "small"] as const;
export const tabVariants = ["indicator", "subtle"] as const;
export const tabStates = ["default", "hover", "disabled"] as const;
/** CSS / Figma key (the `data-size` value). */
type TabSizeKey = (typeof tabSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type TabSize = "md" | "sm" | "medium" | "small";
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
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: TabSize;
  /** Figma Style: Indicator (underline) or Subtle (filled). */
  variant?: TabVariant;
  /** Deterministic Figma State for matrices; real hover/disabled apply natively. */
  state?: TabState;
}

/** Figma Primitives/Tab-Item (1576:2090): Size × Style × State × Select × Label × Icon (+ Badge). */
export function TabItem({ label, icon, badge, selected = false, size: sizeProp = "md", variant = "indicator", state = "default", disabled, className, type = "button", value: _value, ...props }: TabItemProps) {
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
        {icon ? <span className="zen-tab__icon" aria-hidden="true">{renderIcon(icon)}</span> : null}
        {label ? <span className={`zen-tab__label ${typographyStyles[selected ? "Body/Base/Bold" : "Body/Base/Medium"]}`} data-text={typeof label === "string" ? label : undefined}>{label}{typeof label === "string" ? <span className="zen-tab__label-reserve" aria-hidden="true">{label}</span> : null}</span> : null}
        {badge !== undefined && badge !== null && badge !== "" ? <BadgeCounter size="xsmall" theme="neutral" background="subtle" value={badge} /> : null}
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
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: TabSize;
  variant?: TabVariant;
  /** Stretch the bar to its container (Indicator style keeps its bottom border full width). */
  fullWidth?: boolean;
  "aria-label"?: string;
  /** Prefix for tab/panel ids so panels can reference `${idPrefix}-tab-${id}`. */
  idPrefix?: string;
  className?: string;
}

/** Figma Tab-Bar (1577:5477). Roving tabindex: ←/→ move and select, Home/End jump, disabled tabs are skipped. */
export function Tabs({ items: itemsProp, children, value, defaultValue, onValueChange, onChange, size: sizeProp = "md", variant = "indicator", fullWidth = false, "aria-label": ariaLabel, idPrefix, className }: TabsProps) {
  const size = scaleKey(sizeProp, tabSizes);
  const items: TabOption[] = itemsProp ?? slotItems(children, TabItem).map((tab, index) => ({
    id: tab.value ?? tab.slotKey ?? String(index), label: tab.label, icon: tab.icon, badge: tab.badge, disabled: tab.disabled, "aria-label": tab["aria-label"],
  }));
  const generated = useId().replace(/:/g, "");
  const prefix = idPrefix ?? `zen-tabs-${generated}`;
  const [internal, setInternal] = useState(defaultValue ?? items.find((item) => !item.disabled)?.id);
  const current = value ?? internal;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const select = (id: string) => { if (value === undefined) setInternal(id); onValueChange?.(id); onChange?.(id); };
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
    refs.current[next.id]?.focus();
  };
  return (
    <div role="tablist" aria-label={ariaLabel} aria-orientation="horizontal" className={["zen-tabs", className].filter(Boolean).join(" ")} data-variant={variant} data-size={size} data-full-width={fullWidth ? "true" : undefined} onKeyDown={onKeyDown}>
      {items.map((item) => (
        <TabItem
          key={item.id}
          ref={(node) => { refs.current[item.id] = node; }}
          id={`${prefix}-tab-${item.id}`}
          aria-controls={`${prefix}-panel-${item.id}`}
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
      ))}
    </div>
  );
}

/** Panel paired with a tab: `<TabPanel idPrefix="settings" id="general" hidden={tab !== "general"}>`. */
export function TabPanel({ idPrefix, id, children, hidden, className }: { idPrefix: string; id: string; children: ReactNode; hidden?: boolean; className?: string }) {
  return <div role="tabpanel" id={`${idPrefix}-panel-${id}`} aria-labelledby={`${idPrefix}-tab-${id}`} hidden={hidden} tabIndex={0} className={["zen-tab-panel", className].filter(Boolean).join(" ")}>{children}</div>;
}

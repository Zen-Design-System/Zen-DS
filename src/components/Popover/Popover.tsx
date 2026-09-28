import { useExclusivePopover } from "./useExclusivePopover";
import { forwardRef, useEffect, useId, useRef, useState, type ComponentProps, type HTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Icon, type IconName } from "../Icon";
import { Search } from "../Search";
import { Badge, type BadgeTheme } from "../Badge";
import { Avatar } from "../Avatar";
import { CheckboxMarkIndicator } from "../Checkbox";
import { renderIcon } from "../_shared/icon";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import { useAnchoredPosition } from "./useAnchoredPosition";
import "./popover.css";
import "../Icon/core";

/** Data shape exported by the Popover/Default and Popover/Item component sets. */
export type PopoverItemData = {
  id: string;
  label: ReactNode;
  value?: string;
  caption?: ReactNode;
  /** Before the label: an icon name (`"icon-folder-line"`, drawn at 20px) or any node. */
  leading?: IconName | ReactNode;
  /** After the label: an icon name (drawn at 16px) or any node (a Badge, a shortcut). */
  trailing?: IconName | ReactNode;
  disabled?: boolean;
  selected?: boolean;
  /** Image for the Avatar/Photo themes. The item renders the Figma-sized primitive itself
   * (Avatar Small 32 · Avatar Big 40 · Photo Small 20 · Photo Big 32), so callers don't size it. */
  photoSrc?: string;
  photoAlt?: string;
  /** Theme=Badge: colour of the Medium Solid Badge that carries the label. */
  badgeTheme?: BadgeTheme;
  /** Figma Content variant; React nodes remain fully composable. */
  theme?: "icon" | "text-only" | "photo-small" | "photo-big" | "avatar-small" | "avatar-big" | "dock-icon" | "badge";
  /** Figma Function variant used by the Manual-Add-New composition. */
  function?: "default" | "manual-add-new";
};

export interface PopoverItemProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onSelect"> {
  item?: PopoverItemData;
  label?: ReactNode;
  caption?: ReactNode;
  /** Before the label: an icon name (`"icon-folder-line"`, drawn at 20px) or any node. */
  leading?: IconName | ReactNode;
  /** After the label: an icon name (drawn at 16px) or any node (a Badge, a shortcut). */
  trailing?: IconName | ReactNode;
  selected?: boolean;
  disabled?: boolean;
  theme?: PopoverItemData["theme"];
  function?: PopoverItemData["function"];
  /** Static preview of Figma's Hover state (real hover/focus work without it). */
  state?: "default" | "hover";
  /** `checkbox`: multi-select row — a trailing Checkbox/Mark shows the selection instead of the
   * Single-Selected fill + check icon. */
  control?: "check" | "checkbox";
  /** ARIA role of the row. `option` (default) in a listbox, with aria-selected from `selected`; `menuitem` in a Menu (no
   * aria-selected); `menuitemcheckbox` / `menuitemradio` for a checkable menu row, with aria-checked from `selected`. */
  itemRole?: "option" | "menuitem" | "menuitemcheckbox" | "menuitemradio";
  onSelect?: () => void;
}

/** The 240px Popover/Item primitive. */
export const PopoverItem = forwardRef<HTMLButtonElement, PopoverItemProps>(function PopoverItem(
  { item, label, caption, leading, trailing, selected, disabled, theme, function: itemFunction, state, control = "check", itemRole = "option", onSelect, className, ...buttonProps },
  ref,
) {
  const resolvedLabel = item?.label ?? label;
  const photoSrc = item?.photoSrc;
  const resolvedCaption = item?.caption ?? caption;
  const explicitTheme = item?.theme ?? theme;
  // Icon names draw at the slot size (Leading Element-Size/Popular/Base 20, Trailing Small 16).
  const resolvedTrailing = renderIcon(item?.trailing ?? trailing, { size: "sm" });
  const isSelected = item?.selected ?? selected;
  const isDisabled = item?.disabled ?? disabled;
  const resolvedFunction = item?.function ?? itemFunction ?? "default";
  const customLeading = renderIcon(item?.leading ?? leading, { size: "base" });
  const resolvedTheme = explicitTheme ?? (photoSrc ? "avatar-small" : customLeading ? "icon" : "text-only");
  // Theme=Badge (Function=Default): the Medium Solid Badge *is* the content, carrying the label.
  const badgeContent = resolvedTheme === "badge" && resolvedFunction === "default";
  const resolvedLeading = badgeContent ? null
    : photoSrc && (resolvedTheme === "avatar-small" || resolvedTheme === "avatar-big")
      // Figma .Primitives/Popover/Item/Content (829:20006): Avatar Small = Avatar Size=Small (32px), Avatar Big = Medium (40px).
      ? <Avatar size={resolvedTheme === "avatar-big" ? "medium" : "small"} theme="photo" background="subtle" src={photoSrc} alt={item?.photoAlt ?? ""} />
      : photoSrc && (resolvedTheme === "photo-small" || resolvedTheme === "photo-big")
        ? <img src={photoSrc} alt={item?.photoAlt ?? ""} />
        : customLeading;
  const hasLeading = Boolean(resolvedLeading);
  const hasTrailing = Boolean(resolvedTrailing);
  const hasCaption = Boolean(resolvedCaption);
  return (
    <button
      {...buttonProps}
      ref={ref}
      type="button"
      role={itemRole}
      aria-selected={itemRole === "option" ? isSelected || undefined : undefined}
      aria-checked={itemRole === "menuitemcheckbox" || itemRole === "menuitemradio" ? Boolean(isSelected) : undefined}
      disabled={isDisabled}
      className={["zen-popover__item", isSelected && control === "check" ? "is-selected" : "", className].filter(Boolean).join(" ")}
      data-control={control}
      data-has-leading={hasLeading ? "true" : "false"}
      data-has-trailing={hasTrailing ? "true" : "false"}
      data-has-caption={hasCaption ? "true" : "false"}
      data-tone={resolvedTheme}
      data-function={resolvedFunction}
      data-state={state === "hover" ? "hover" : undefined}
      onClick={(event) => {
        buttonProps.onClick?.(event);
        if (!event.defaultPrevented) onSelect?.();
      }}
    >
      {resolvedLeading ? <span className="zen-popover__item-leading">{resolvedLeading}</span> : null}
      {badgeContent ? <span className="zen-popover__item-content zen-popover__item-content--badge"><Badge size="medium" theme={item?.badgeTheme ?? "neutral"} background="solid" leadingIcon={false}>{resolvedLabel}</Badge></span> : null}
      {!badgeContent && (resolvedLabel || resolvedCaption) ? <span className="zen-popover__item-content">
        <span className={`zen-popover__item-label ${typographyStyles["Body/Base/Medium"]}`}>{resolvedLabel}</span>
        {resolvedCaption ? <span className={`zen-popover__item-caption ${typographyStyles["Body/Small/Regular"]}`}>{resolvedCaption}</span> : null}
      </span> : null}
      {isSelected && control === "check" ? <span className="zen-popover__item-check" aria-hidden="true"><Icon name="icon-check-line" size="xs" /></span> : null}
      {resolvedTrailing ? <span className="zen-popover__item-trailing">{resolvedTrailing}</span> : null}
      {control === "checkbox" ? <CheckboxMarkIndicator checked={Boolean(isSelected)} disabled={Boolean(isDisabled)} /> : null}
    </button>
  );
});

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  /** Whether the surface is shown. Default false: pass `open` (controlled, with `onOpenChange`) to show it. */
  open?: boolean;
  /** Semantic group heading for the options (for example `Component Size`), not the current selection. It also names the option list. */
  label?: ReactNode;
  /** Accessible name of the option list (role=listbox) when there is no visible `label`, e.g. "Sort by". */
  "aria-label"?: string;
  /** id of the element that names the option list (role=listbox); wins over `label` and `aria-label`. */
  "aria-labelledby"?: string;
  search?: boolean;
  searchValue?: string;
  /** Placeholder and accessible name of the Search row. Default: the locale's "Search". */
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  scrollBar?: boolean;
  items?: PopoverItemData[];
  onSelect?: (item: PopoverItemData) => void;
  children?: ReactNode;
  /** Shown when the (filtered) item list is empty. Default: the locale's "No results"; `null` shows nothing. */
  emptyState?: ReactNode;
  /** Move focus into the popover when it opens (use when it was opened from the keyboard). */
  autoFocus?: boolean;
  /** Called with `false` on a pointer-down outside the popover (and outside `anchorRef`) or on Escape. */
  onOpenChange?: (open: boolean) => void;
  /** The trigger element; pointer-downs on it are left to the trigger's own toggle. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Show the Search clear button while it has a value (Figma Search/Popover Typing/Inputted). */
  searchClearable?: boolean;
  /** Preferred horizontal edge against the anchor box; flips when it would overflow the viewport. */
  align?: "start" | "end";
  /** Multi-select list: every item gets a trailing Checkbox/Mark (Figma multi-select Popover). */
  multiple?: boolean;
}

/**
 * Popover/Default composition. It mirrors the exported Figma structure while
 * keeping the item list composable for Select, Autocomplete, and menu fields.
 */
export const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover(
  {
    open = false,
    label,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    search = false,
    searchValue = "",
    searchPlaceholder: searchPlaceholderProp,
    onSearchChange,
    scrollBar = true,
    items,
    onSelect,
    children,
    emptyState: emptyStateProp,
    autoFocus = false,
    onOpenChange,
    anchorRef,
    searchClearable = true,
    align = "start",
    multiple = false,
    className,
    onKeyDown,
    ...divProps
  },
  ref,
) {
  const t = useZenLabels();
  const searchPlaceholder = searchPlaceholderProp ?? t.search;
  // `null` is a deliberate "no empty state" (PopoverManualAddNew), so only a missing prop falls back to the label.
  const emptyState = emptyStateProp === undefined ? t.noResults : emptyStateProp;
  const generatedId = useId();
  const [internalSearchValue, setInternalSearchValue] = useState(searchValue);
  const rootRef = useRef<HTMLDivElement | null>(null);
  // Attach 4px below the trigger / input box, flipping above it near the bottom of the viewport.
  // Inside an Input the box is the enclosing control (SelectField, field pickers); otherwise the trigger.
  const placement = useAnchoredPosition(rootRef, open, {
    align,
    anchor: () => rootRef.current?.parentElement?.closest<HTMLElement>(".zen-input__control") ?? anchorRef?.current,
  });
  // One popover at a time: opening this one closes another object's open popover (nested ones keep their parent).
  useExclusivePopover(open, onOpenChange ? () => onOpenChange(false) : undefined, rootRef, anchorRef);
  // Re-sync on open/close too: the component stays mounted while closed, so an
  // uncontrolled query would otherwise survive into the next opening.
  useEffect(() => setInternalSearchValue(searchValue), [searchValue, open]);
  // Keyboard-opened popovers move focus inside: search field first, else the selected or first option.
  useEffect(() => {
    if (!open || !autoFocus) return;
    const root = rootRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(".zen-popover__search input")
      ?? root.querySelector<HTMLElement>(".zen-popover__item.is-selected:not(:disabled)")
      ?? root.querySelector<HTMLElement>(".zen-popover__item:not(:disabled)");
    target?.focus();
  }, [open, autoFocus]);
  // Light dismiss: a pointer-down outside the surface (and its trigger) closes it.
  useEffect(() => {
    if (!open || !onOpenChange) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || rootRef.current?.contains(target) || anchorRef?.current?.contains(target)) return;
      onOpenChange(false);
    };
    // Escape while focus is still on the trigger (the usual case after a mouse click) also closes it;
    // Escape inside the surface is handled by handleKeyDown, which also restores focus.
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const active = document.activeElement;
      if (active && anchorRef?.current?.contains(active)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange, anchorRef]);
  if (!open) return null;
  const resolvedSearchValue = onSearchChange ? searchValue : internalSearchValue;
  const handleSearchChange = (value: string) => {
    setInternalSearchValue(value);
    onSearchChange?.(value);
  };
  // Uncontrolled search filters the provided items by their text label.
  const query = onSearchChange ? "" : internalSearchValue.trim().toLowerCase();
  const visibleItems = query && items
    ? items.filter((item) => (typeof item.label === "string" || typeof item.label === "number" ? String(item.label) : "").toLowerCase().includes(query))
    : items;
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (event.key === "Escape" && onOpenChange) {
      event.preventDefault();
      onOpenChange(false);
      // Return focus to the trigger (the anchor itself or its first focusable descendant).
      const anchor = anchorRef?.current;
      (anchor?.matches("button, a[href], input, [tabindex]") ? anchor : anchor?.querySelector<HTMLElement>("button, a[href], input, [tabindex]"))?.focus();
      return;
    }
    const root = rootRef.current;
    if (!root || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const options = Array.from(root.querySelectorAll<HTMLElement>(".zen-popover__item:not(:disabled)"));
    if (!options.length) return;
    event.preventDefault();
    const current = options.indexOf(document.activeElement as HTMLElement);
    const last = options.length - 1;
    const next = event.key === "Home" ? 0
      : event.key === "End" ? last
        : event.key === "ArrowDown" ? (current < 0 ? 0 : Math.min(current + 1, last))
          : current <= 0 ? (current === 0 && search ? -1 : 0) : current - 1;
    if (next === -1) root.querySelector<HTMLElement>(".zen-popover__search input")?.focus();
    else options[next].focus();
  };
  // The heading names the listbox, so it always gets an id (from the popover's own id, else a generated one).
  const labelId = `${divProps.id ?? `zen-popover-${generatedId.replace(/:/g, "")}`}-label`;
  return (
    <div
      {...divProps}
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={["zen-popover", className].filter(Boolean).join(" ")}
      style={{ ...placement.style, ...divProps.style }}
      data-side={placement.side}
      data-search={search ? "true" : "false"}
      data-scroll-bar={scrollBar ? "true" : "false"}
      onKeyDown={handleKeyDown}
    >
      {search ? (
        // Figma .Primitives/Popover/Search = Search/Popover (Theme=Default, Icon-Search=No).
        <div className="zen-popover__search">
          <Search
            variant="popover"
            iconSearch={false}
            clearable={searchClearable}
            onClear={() => {
              handleSearchChange("");
              rootRef.current?.querySelector<HTMLInputElement>(".zen-popover__search input")?.focus();
            }}
            value={resolvedSearchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </div>
      ) : null}
      {label ? <div id={labelId} className={`zen-popover__label ${typographyStyles["Body/Small/Medium"]}`}>{label}</div> : null}
      {/* The name belongs to the listbox: the root is a plain container, where aria-label is not allowed. */}
      <div className="zen-popover__items" role="listbox" aria-multiselectable={multiple || undefined} aria-label={ariaLabel} aria-labelledby={ariaLabelledBy ?? (label && !ariaLabel ? labelId : undefined)}>
        {visibleItems?.map((item) => (
          <PopoverItem key={item.id} item={item} control={multiple ? "checkbox" : "check"} onSelect={() => onSelect?.(item)} />
        ))}
        {children}
        {visibleItems && visibleItems.length === 0 && !children && emptyState ? <div className="zen-popover__empty">{emptyState}</div> : null}
      </div>
    </div>
  );
});

export function PopoverSearch(props: Omit<ComponentProps<typeof Popover>, "items" | "children">) {
  return <Popover {...props} search />;
}

/** Figma Popover/Bunk-Action (9021:28726): a compact action bar on the popover surface.
 * Children are the Item-List slot — use PopoverBunkActionGroup for button groups
 * (gap 2) and PopoverBunkActionDivider for the 40px vertical Divider between them. */
export interface PopoverBunkActionProps extends HTMLAttributes<HTMLDivElement> {
  theme?: "default";
}

export function PopoverBunkAction({ theme = "default", className, children, ...props }: PopoverBunkActionProps) {
  return (
    <div role="toolbar" {...props} className={["zen-popover", "zen-popover--bunk-action", className].filter(Boolean).join(" ")} data-tone={theme}>
      <div className="zen-popover__bunk-list">{children}</div>
    </div>
  );
}

export function PopoverBunkActionGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div role="group" {...props} className={["zen-popover__bunk-group", className].filter(Boolean).join(" ")} />;
}

export function PopoverBunkActionDivider({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span role="separator" aria-orientation="vertical" {...props} className={["zen-popover__bunk-divider", className].filter(Boolean).join(" ")} />;
}

/** Figma renamed the set to Popover/Bulk-Action: a contextual quick-action bar shown on selection (text, canvas element,
 *  list rows). Name it with aria-label; keep it to 5–6 Button/Icon-Flat Medium actions, grouped by dividers.
 *  The Bunk names stay as aliases for existing imports. */
export const PopoverBulkAction = PopoverBunkAction;
export const PopoverBulkActionGroup = PopoverBunkActionGroup;
export const PopoverBulkActionDivider = PopoverBunkActionDivider;
export type PopoverBulkActionProps = PopoverBunkActionProps;

/** Figma Popover/Manual-Add-New composition: Search (focused) + Label + option list, ending
 * with the Manual-Add-New item — "Create" followed by an Accent Badge that shows the typed
 * value. Options are filtered by the query; the create row appears only for a new value. */
export interface PopoverManualAddNewProps extends Omit<PopoverProps, "label" | "search"> {
  /** Heading above the options. Default: the locale's "Select an option or create one". */
  label?: ReactNode;
  /** Text of the create row, before the Badge with the typed value. Default: the locale's "Create". */
  createLabel?: ReactNode;
  onCreate?: (value: string) => void;
}

export function PopoverManualAddNew({ createLabel: createLabelProp, onCreate, label: labelProp, items = [], searchValue, onSearchChange, ...props }: PopoverManualAddNewProps) {
  const t = useZenLabels();
  const createLabel = createLabelProp === undefined ? t.create : createLabelProp;
  const label = labelProp === undefined ? t.selectOrCreate : labelProp;
  const [internalQuery, setInternalQuery] = useState(searchValue ?? "");
  useEffect(() => { if (searchValue !== undefined) setInternalQuery(searchValue); }, [searchValue]);
  const query = searchValue ?? internalQuery;
  const normalized = query.trim().toLowerCase();
  const textOf = (node: ReactNode) => (typeof node === "string" || typeof node === "number" ? String(node) : "");
  const visible = normalized ? items.filter((item) => textOf(item.label).toLowerCase().includes(normalized)) : items;
  const exists = items.some((item) => textOf(item.label).trim().toLowerCase() === normalized);
  return (
    <Popover
      {...props}
      label={label}
      search
      searchValue={query}
      onSearchChange={(value) => { setInternalQuery(value); onSearchChange?.(value); }}
      emptyState={null}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        // Enter in the search field creates the typed value when it is not an existing option.
        if (!event.defaultPrevented && event.key === "Enter" && (event.target as HTMLElement).tagName === "INPUT" && normalized && !exists) {
          event.preventDefault();
          onCreate?.(query.trim());
        }
      }}
    >
      {visible.map((item) => <PopoverItem key={item.id} item={item} control={props.multiple ? "checkbox" : "check"} onSelect={() => props.onSelect?.(item)} />)}
      {normalized && !exists ? (
        <PopoverItem
          label={createLabel}
          function="manual-add-new"
          trailing={<Badge size="medium" theme="accent" background="solid" leadingIcon={false}>{query.trim()}</Badge>}
          onSelect={() => onCreate?.(query.trim())}
        />
      ) : null}
    </Popover>
  );
}

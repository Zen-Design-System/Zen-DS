import { forwardRef, useEffect, useRef, useState, type ComponentProps, type HTMLAttributes, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Icon } from "../Icon";
import { Search } from "../Search";
import { Badge } from "../Badge";
import { typographyStyles } from "../../tokens/typography.generated";
import "./popover.css";

/** Data shape exported by the Popover/Default and Popover/Item component sets. */
export type PopoverItemData = {
  id: string;
  label: ReactNode;
  value?: string;
  caption?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  selected?: boolean;
  /** Figma Content variant; React nodes remain fully composable. */
  theme?: "icon" | "text-only" | "photo-small" | "photo-big" | "avatar-small" | "avatar-big" | "dock-icon" | "badge";
  /** Figma Function variant used by the Manual-Add-New composition. */
  function?: "default" | "manual-add-new";
};

export interface PopoverItemProps extends Omit<HTMLAttributes<HTMLButtonElement>, "onSelect"> {
  item?: PopoverItemData;
  label?: ReactNode;
  caption?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  theme?: PopoverItemData["theme"];
  function?: PopoverItemData["function"];
  /** Static preview of Figma's Hover state (real hover/focus work without it). */
  state?: "default" | "hover";
  onSelect?: () => void;
}

/** The 240px Popover/Item primitive. */
export const PopoverItem = forwardRef<HTMLButtonElement, PopoverItemProps>(function PopoverItem(
  { item, label, caption, leading, trailing, selected, disabled, theme, function: itemFunction, state, onSelect, className, ...buttonProps },
  ref,
) {
  const resolvedLabel = item?.label ?? label;
  const resolvedCaption = item?.caption ?? caption;
  const resolvedLeading = item?.leading ?? leading;
  const resolvedTrailing = item?.trailing ?? trailing;
  const isSelected = item?.selected ?? selected;
  const isDisabled = item?.disabled ?? disabled;
  const resolvedTheme = item?.theme ?? theme ?? (resolvedLeading ? "icon" : "text-only");
  const resolvedFunction = item?.function ?? itemFunction ?? "default";
  const hasLeading = Boolean(resolvedLeading);
  const hasTrailing = Boolean(resolvedTrailing);
  const hasCaption = Boolean(resolvedCaption);
  return (
    <button
      {...buttonProps}
      ref={ref}
      type="button"
      role="option"
      aria-selected={isSelected || undefined}
      disabled={isDisabled}
      className={["zen-popover__item", isSelected ? "is-selected" : "", className].filter(Boolean).join(" ")}
      data-has-leading={hasLeading ? "true" : "false"}
      data-has-trailing={hasTrailing ? "true" : "false"}
      data-has-caption={hasCaption ? "true" : "false"}
      data-theme={resolvedTheme}
      data-function={resolvedFunction}
      data-state={state === "hover" ? "hover" : undefined}
      onClick={(event) => {
        buttonProps.onClick?.(event);
        if (!event.defaultPrevented) onSelect?.();
      }}
    >
      {resolvedLeading ? <span className="zen-popover__item-leading">{resolvedLeading}</span> : null}
      {resolvedLabel || resolvedCaption ? <span className="zen-popover__item-content">
        <span className={`zen-popover__item-label ${typographyStyles["Body/Base/Medium"]}`}>{resolvedLabel}</span>
        {resolvedCaption ? <span className={`zen-popover__item-caption ${typographyStyles["Caption/Regular"]}`}>{resolvedCaption}</span> : null}
      </span> : null}
      {isSelected ? <span className="zen-popover__item-check" aria-hidden="true"><Icon name="icon-check-line" size="xs" /></span> : null}
      {resolvedTrailing ? <span className="zen-popover__item-trailing">{resolvedTrailing}</span> : null}
    </button>
  );
});

export interface PopoverProps extends Omit<HTMLAttributes<HTMLDivElement>, "children" | "onSelect"> {
  open?: boolean;
  /** Semantic group heading for the options (for example `Component Size`), not the current selection. */
  label?: ReactNode;
  search?: boolean;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  scrollBar?: boolean;
  items?: PopoverItemData[];
  onSelect?: (item: PopoverItemData) => void;
  children?: ReactNode;
  emptyState?: ReactNode;
  /** Move focus into the popover when it opens (use when it was opened from the keyboard). */
  autoFocus?: boolean;
  /** Called with `false` on a pointer-down outside the popover (and outside `anchorRef`) or on Escape. */
  onOpenChange?: (open: boolean) => void;
  /** The trigger element; pointer-downs on it are left to the trigger's own toggle. */
  anchorRef?: RefObject<HTMLElement | null>;
  /** Show the Search clear button while it has a value (Figma Search/Popover Typing/Inputted). */
  searchClearable?: boolean;
}

/**
 * Popover/Default composition. It mirrors the exported Figma structure while
 * keeping the item list composable for Select, Autocomplete, and menu fields.
 */
export const Popover = forwardRef<HTMLDivElement, PopoverProps>(function Popover(
  {
    open = true,
    label,
    search = false,
    searchValue = "",
    searchPlaceholder = "Search",
    onSearchChange,
    scrollBar = true,
    items,
    onSelect,
    children,
    emptyState = "No results",
    autoFocus = false,
    onOpenChange,
    anchorRef,
    searchClearable = true,
    className,
    onKeyDown,
    ...divProps
  },
  ref,
) {
  const [internalSearchValue, setInternalSearchValue] = useState(searchValue);
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => setInternalSearchValue(searchValue), [searchValue]);
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
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
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
  const labelId = divProps.id ? `${divProps.id}-label` : undefined;
  return (
    <div
      {...divProps}
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={["zen-popover", className].filter(Boolean).join(" ")}
      data-search={search ? "true" : "false"}
      data-scroll-bar={scrollBar ? "true" : "false"}
      onKeyDown={handleKeyDown}
    >
      {search ? (
        // Figma .Primitives/Popover/Search = Search/Popover (Icon-Search=No) → Input Field-Only Small.
        <div className="zen-popover__search">
          <Search
            size="small"
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
      <div className="zen-popover__items" role="listbox" aria-labelledby={label ? labelId : undefined}>
        {visibleItems?.map((item) => (
          <PopoverItem key={item.id} item={item} onSelect={() => onSelect?.(item)} />
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
    <div role="toolbar" {...props} className={["zen-popover", "zen-popover--bunk-action", className].filter(Boolean).join(" ")} data-theme={theme}>
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

/** Figma Popover/Manual-Add-New composition: Search (focused) + Label + option list, ending
 * with the Manual-Add-New item — "Create" followed by an Accent Badge that shows the typed
 * value. Options are filtered by the query; the create row appears only for a new value. */
export interface PopoverManualAddNewProps extends Omit<PopoverProps, "label" | "search"> {
  label?: ReactNode;
  createLabel?: ReactNode;
  onCreate?: (value: string) => void;
}

export function PopoverManualAddNew({ createLabel = "Create", onCreate, label = "Select an option or create one", items = [], searchValue, onSearchChange, ...props }: PopoverManualAddNewProps) {
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
      {visible.map((item) => <PopoverItem key={item.id} item={item} onSelect={() => props.onSelect?.(item)} />)}
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

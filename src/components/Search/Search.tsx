import { forwardRef, useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Icon, type IconName } from "../Icon";
import { useIconTooltip } from "../Tooltip";
import { InputField, InputLeadingTrailing, type InputLeadingTrailingOption } from "../Input";
import { renderIcon } from "../_shared/icon";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import "./search.css";
import "../Icon/core";

export const searchSizes = ["small", "medium"] as const;
export const searchThemes = ["default", "filter-icon", "filter-dropdown"] as const;
export const searchStates = ["default", "hover", "focused", "typing", "inputted"] as const;
/** Figma component sets: Search/Default and Search/Popover. */
export const searchVariants = ["default", "popover"] as const;

/** CSS / Figma key (the `data-size` value). */
type SearchSizeKey = (typeof searchSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type SearchSize = "sm" | "md" | "small" | "medium";
export type SearchTheme = (typeof searchThemes)[number];
export type SearchState = (typeof searchStates)[number];
export type SearchVariant = (typeof searchVariants)[number];

/** Search has no Disabled state (like every Zen input); hide or omit it instead. */
export interface SearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "disabled"> {
  /** `popover` is Figma Search/Popover: always Small, Corner-Radius/Input/Medium, and no focus
   * stroke; its 3px focus ring takes Input/Border/Default, so it shows only in component themes
   * with a visible input border (Neutral S4). `size` is ignored. */
  variant?: SearchVariant;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: SearchSize;
  /** Optional Input label above the field; when set it also names the input. */
  label?: ReactNode;
  theme?: SearchTheme;
  state?: SearchState;
  /** Figma's `Icon-Search` property. */
  iconSearch?: boolean;
  /** Replaces the search icon: an icon name (`"icon-filter-lines-line"`, sized to the field) or any node. */
  leading?: IconName | ReactNode;
  /** Replaces the whole trailing group (clear button, shortcut, filter): an icon name (sized to the field) or any node. */
  trailing?: IconName | ReactNode;
  /** Shows the Figma Inputted clear affordance when the field has a value. */
  clearable?: boolean;
  /** Called with the text on every change, and with "" when the clear button empties the field. */
  onValueChange?: (value: string) => void;
  /** What is searched ("Search members"); also the accessible name without `label`/`aria-label`. Default: the locale's "Search". */
  placeholder?: string;
  /** Label paired with the chevron in the Filter-Dropdown variant. Default: the locale's "All". */
  filterLabel?: ReactNode;
  /** Filter-Icon / Filter-Dropdown trailing is an `InputLeadingTrailing`: clickable by default, `false` makes it decorative. */
  filterInteractive?: boolean;
  /** Action for the filter affordance (e.g. open a filter panel or your own menu). */
  onFilterClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  /** Filter-Dropdown picker: options open the shared Popover and replace `filterLabel` with the selected label. */
  filterOptions?: InputLeadingTrailingOption[];
  filterValue?: string;
  onFilterChange?: (value: string, option: InputLeadingTrailingOption) => void;
  /** Accessible name / Popover heading for the filter affordance. Default: the locale's "Filter". */
  filterActionLabel?: string;
  /** Keyboard shortcut key shown as `⌘K` in the trailing slot (Figma Side-Bar Small-Density search); pressing
   * ⌘/Ctrl + key focuses the field. Hidden while the field has a value (the clear button takes the slot). */
  shortcut?: string;
  onClear?: () => void;
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search(
  {
    variant = "default",
    size: requestedSize = "md",
    label,
    theme = "default",
    state,
    iconSearch = true,
    leading,
    trailing,
    clearable = true,
    onValueChange,
    filterLabel: filterLabelProp,
    filterInteractive = true,
    onFilterClick,
    filterOptions,
    filterValue,
    onFilterChange,
    filterActionLabel: filterActionLabelProp,
    shortcut,
    onClear,
    className,
    placeholder: placeholderProp,
    value,
    defaultValue,
    onChange,
    ...inputProps
  },
  ref,
) {
  const t = useZenLabels();
  const placeholder = placeholderProp ?? t.search;
  const filterLabel = filterLabelProp === undefined ? t.filterAll : filterLabelProp;
  const filterActionLabel = filterActionLabelProp ?? t.filter;
  const size: SearchSizeKey = variant === "popover" ? "small" : scaleKey(requestedSize, searchSizes);
  const innerRef = useRef<HTMLInputElement | null>(null);
  const setRef = (node: HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  };
  useEffect(() => {
    if (!shortcut) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === shortcut.toLowerCase()) {
        event.preventDefault();
        innerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut]);
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? ""));
  const resolvedState = state;
  const leadingContent = renderIcon(leading, { size: "sm" }) ?? (iconSearch ? <Icon name="icon-search-medium-line" size="sm" /> : null);
  const currentValue = controlled ? String(value ?? "") : internalValue;
  const hasValue = currentValue.length > 0 || resolvedState === "inputted";
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setInternalValue(event.target.value);
    onChange?.(event);
    onValueChange?.(event.target.value);
  };
  const handleClear = () => {
    if (!controlled) setInternalValue("");
    onClear?.();
    if (controlled && onChange) {
      onChange({ target: { value: "" }, currentTarget: { value: "" } } as ChangeEvent<HTMLInputElement>);
    }
    onValueChange?.("");
  };
  const clearTip = useIconTooltip(clearable && hasValue ? t.clearSearch : false);
  const clearContent = clearable && hasValue ? (
    <button className="zen-search__clear" type="button" aria-label={t.clearSearch} {...clearTip.bind({ onClick: handleClear })}>
      <Icon name="icon-x-circle-solid" size={size === "medium" ? "base" : "sm"} decorative />
      {clearTip.tooltip}
    </button>
  ) : null;
  // Filter affordances reuse Input's Leading/Trailing primitive, so they click, hover and focus like Input slots.
  const themeTrailing = theme === "filter-icon"
    ? <InputLeadingTrailing size={size} icon={<Icon name="icon-settings-03-line" decorative />} interactive={filterInteractive} onClick={onFilterClick} aria-label={filterActionLabel} />
    : theme === "filter-dropdown"
      ? <InputLeadingTrailing size={size} label={filterLabel} dropdown interactive={filterInteractive} onClick={onFilterClick}
          options={filterOptions} value={filterValue} onValueChange={onFilterChange} popoverLabel={filterActionLabel}
          aria-label={filterOptions?.length ? undefined : `${filterActionLabel}: ${typeof filterLabel === "string" ? filterLabel : ""}`.replace(/: $/, "")} />
      : null;
  const shortcutContent = shortcut && !hasValue ? (
    <span className="zen-search__shortcut" aria-hidden="true"><Icon name="icon-command-line" decorative /><span>{shortcut.toUpperCase()}</span></span>
  ) : null;
  const trailingContent = renderIcon(trailing, { size: "sm" }) ?? (clearContent || themeTrailing || shortcutContent ? (
    <span className="zen-search__trailing-group">{clearContent}{shortcutContent}{themeTrailing}</span>
  ) : null);

  return (
    <InputField
      {...inputProps}
      value={controlled ? value : internalValue}
      onChange={handleChange}
      ref={setRef}
      type="search"
      aria-keyshortcuts={shortcut ? `Meta+${shortcut.toUpperCase()} Control+${shortcut.toUpperCase()}` : inputProps["aria-keyshortcuts"]}
      className={["zen-search", variant === "popover" ? "zen-search--popover" : "", className].filter(Boolean).join(" ")}
      size={size}
      state={resolvedState}
      leading={leadingContent}
      trailing={trailingContent}
      placeholder={placeholder}
      label={label}
      aria-label={inputProps["aria-label"] ?? (label ? undefined : placeholder)}
      data-tone={theme}
    />
  );
});

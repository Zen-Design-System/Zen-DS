import { forwardRef, useState, type ChangeEvent, type InputHTMLAttributes, type ReactNode } from "react";
import { Icon } from "../Icon";
import { InputField } from "../Input";
import "./search.css";

export const searchSizes = ["small", "medium"] as const;
export const searchThemes = ["default", "filter-icon", "filter-dropdown"] as const;
export const searchStates = ["default", "hover", "focused", "typing", "inputted"] as const;
/** Figma component sets: Search/Default and Search/Popover. */
export const searchVariants = ["default", "popover"] as const;

export type SearchSize = (typeof searchSizes)[number];
export type SearchTheme = (typeof searchThemes)[number];
export type SearchState = (typeof searchStates)[number] | "disabled";
export type SearchVariant = (typeof searchVariants)[number];

export interface SearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** `popover` is Figma Search/Popover: always Small, Corner-Radius/Input/Medium, and no
   * focus stroke or ring (it sits inside the Popover surface). `size` is ignored. */
  variant?: SearchVariant;
  size?: SearchSize;
  /** Optional Input label above the field; when set it also names the input. */
  label?: ReactNode;
  theme?: SearchTheme;
  state?: SearchState;
  /** Figma's `Icon-Search` property. */
  iconSearch?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  /** Shows the Figma Inputted clear affordance when the field has a value. */
  clearable?: boolean;
  /** Label paired with the chevron in the Filter-Dropdown variant. */
  filterLabel?: ReactNode;
  onClear?: () => void;
}

export const Search = forwardRef<HTMLInputElement, SearchProps>(function Search(
  {
    variant = "default",
    size: requestedSize = "medium",
    label,
    theme = "default",
    state,
    iconSearch = true,
    leading,
    trailing,
    clearable = true,
    filterLabel = "All",
    onClear,
    className,
    disabled,
    placeholder = "Search",
    value,
    defaultValue,
    onChange,
    ...inputProps
  },
  ref,
) {
  const size: SearchSize = variant === "popover" ? "small" : requestedSize;
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(() => String(defaultValue ?? ""));
  const resolvedState = state ?? (disabled ? "disabled" : undefined);
  const leadingContent = leading ?? (iconSearch ? <Icon name="icon-search-medium-line" size="sm" /> : null);
  const currentValue = controlled ? String(value ?? "") : internalValue;
  const hasValue = currentValue.length > 0 || resolvedState === "inputted";
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!controlled) setInternalValue(event.target.value);
    onChange?.(event);
  };
  const handleClear = () => {
    if (!controlled) setInternalValue("");
    onClear?.();
    if (controlled && onChange) {
      onChange({ target: { value: "" }, currentTarget: { value: "" } } as ChangeEvent<HTMLInputElement>);
    }
  };
  const clearContent = clearable && hasValue ? (
    <button className="zen-search__clear" type="button" aria-label="Clear search" onClick={handleClear} disabled={disabled}>
      <Icon name="icon-x-circle-solid" size={size === "medium" ? "base" : "sm"} decorative />
    </button>
  ) : null;
  const themeTrailing = theme === "filter-icon"
    ? <Icon name="icon-settings-03-line" size={size === "medium" ? "base" : "sm"} decorative />
    : theme === "filter-dropdown"
      ? <span className="zen-search__filter-dropdown"><span>{filterLabel}</span><Icon name="icon-chevron-down-line" size={size === "medium" ? "base" : "sm"} decorative /></span>
      : null;
  const trailingContent = trailing ?? (clearContent || themeTrailing ? (
    <span className="zen-search__trailing-group">{clearContent}{themeTrailing ? <span className="zen-search__theme-trailing">{themeTrailing}</span> : null}</span>
  ) : null);

  return (
    <InputField
      {...inputProps}
      value={controlled ? value : internalValue}
      onChange={handleChange}
      ref={ref}
      type="search"
      className={["zen-search", variant === "popover" ? "zen-search--popover" : "", className].filter(Boolean).join(" ")}
      size={size}
      state={resolvedState}
      leading={leadingContent}
      trailing={trailingContent}
      placeholder={placeholder}
      disabled={disabled || resolvedState === "disabled"}
      label={label}
      aria-label={inputProps["aria-label"] ?? (label ? undefined : placeholder)}
      data-theme={theme}
    />
  );
});

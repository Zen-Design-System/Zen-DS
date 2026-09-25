import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { Icon } from "../Icon";
import { Popover, type PopoverItemData } from "../Popover";
import { Badge, BadgeCounter } from "../Badge";
import { Avatar, type AvatarSize } from "../Avatar";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chip.css";

/** Figma's three Chip/Pill component sets. */
export const chipVariants = ["advanced", "normal", "number-only"] as const;
export const chipSizes = ["xsmall", "small", "medium"] as const;
export const chipLevels = ["primary", "secondary"] as const;
export const chipThemes = ["text-only", "leading-icon", "leading-photo"] as const;
export const chipStates = ["default", "hover", "press", "focused", "placeholder", "disabled"] as const;

export type ChipVariant = (typeof chipVariants)[number];
export type ChipSize = (typeof chipSizes)[number];
export type ChipLevel = (typeof chipLevels)[number];
export type ChipTheme = (typeof chipThemes)[number];
export type ChipState = (typeof chipStates)[number];
export type ChipSelectionMode = "single" | "multiple";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: ReactNode;
  /** Component set: Advanced, Normal, or Number-only. */
  variant?: ChipVariant;
  size?: ChipSize;
  level?: ChipLevel;
  theme?: ChipTheme;
  state?: ChipState;
  /** Figma's Select property. Selected chips show the close affordance in Advanced. */
  select?: boolean;
  /** Figma's Dropdown property. Advanced chips show a chevron when enabled. */
  dropdown?: boolean;
  /** Filter behavior: single keeps the dropdown affordance; multiple uses the
   * Figma Chip/Trailing counter and changes to remove on hover. */
  selectionMode?: ChipSelectionMode;
  /** Number of selected options for a multiple filter. */
  selectionCount?: number;
  counter?: number | string;
  /** Alias used by the Number-only component set. */
  value?: number | string;
  leading?: ReactNode;
  /** Leading-Photo theme: image rendered through the shared Avatar/Single (Photo, Subtle) primitive,
   * sized per Figma (XSmall → 2XSmall 20, Small → XSmall 24, Medium → Small 32). */
  photoSrc?: string;
  photoAlt?: string;
  trailing?: ReactNode;
  /** Items rendered by the shared Figma Popover/Default composition. */
  popoverItems?: PopoverItemData[];
  /** Controlled open state for the advanced chip menu. */
  popoverOpen?: boolean;
  /** Keep the shared Popover open while selected options are toggled. */
  popoverMultiple?: boolean;
  onPopoverOpenChange?: (open: boolean) => void;
  onPopoverSelect?: (item: PopoverItemData) => void;
  /** Clear the current single or multiple filter selection. */
  onClearSelection?: () => void;
  popoverLabel?: ReactNode;
  popoverSearch?: boolean;
  popoverSearchValue?: string;
  onPopoverSearchChange?: (value: string) => void;
  popoverSearchPlaceholder?: string;
  popoverScrollBar?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  {
    children,
    variant = "advanced",
    size = "small",
    level = "secondary",
    theme,
    state = "default",
    select = false,
    dropdown,
    selectionMode,
    selectionCount,
    counter,
    value,
    leading: leadingProp,
    photoSrc,
    photoAlt = "",
    trailing,
    popoverItems,
    popoverOpen,
    popoverMultiple = false,
    onPopoverOpenChange,
    onPopoverSelect,
    onClearSelection,
    popoverLabel,
    popoverSearch = false,
    popoverSearchValue = "",
    onPopoverSearchChange,
    popoverSearchPlaceholder,
    popoverScrollBar = true,
    className,
    type = "button",
    disabled,
    onClick,
    onKeyDown,
    ...buttonProps
  },
  ref,
) {
  const [uncontrolledPopoverOpen, setUncontrolledPopoverOpen] = useState(false);
  const [openedFromKeyboard, setOpenedFromKeyboard] = useState(false);
  const dropdownRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const isNumberOnly = variant === "number-only";
  const photoSize: AvatarSize = size === "xsmall" ? "2xsmall" : size === "medium" ? "small" : "xsmall";
  const leading = photoSrc ? <Avatar size={photoSize} theme="photo" background="subtle" src={photoSrc} alt={photoAlt} /> : leadingProp;
  const isDisabled = disabled || state === "disabled";
  // Padding follows the rendered leading slot, including callers that omit Theme.
  const resolvedTheme = leading && !isNumberOnly ? (photoSrc || theme === "leading-photo" ? "leading-photo" : "leading-icon") : "text-only";
  const canOpenPopover = !isNumberOnly && !isDisabled && (popoverItems !== undefined || dropdown === true);
  const isPopoverOpen = popoverOpen ?? uncontrolledPopoverOpen;
  const showDropdown = !isNumberOnly && !select && !trailing && (dropdown ?? variant === "advanced");
  // The Advanced set owns the removable trailing primitive. Normal's Select
  // axis only changes its selected styling; it does not add a close icon.
  const showRemove = variant === "advanced" && select && !trailing;
  const handleClear = (event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClearSelection?.();
  };
  // The clear affordance lives inside the chip <button>; it is pointer-clickable but not a
  // nested focus stop (interactive-in-interactive is invalid). Keyboard users press
  // Delete/Backspace on the focused chip instead (announced via aria-keyshortcuts).
  const singleRemove = (
    <span
      className="zen-chip__remove"
      aria-hidden="true"
      data-clickable={onClearSelection ? "true" : undefined}
      onClick={onClearSelection ? handleClear : undefined}
    >
      <Icon name="icon-x-circle-solid" decorative />
    </span>
  );
  // The Figma Multiple trailing primitive is Badge/Counter: its label is
  // always numeric, never a caller-provided string or arbitrary React node.
  const multipleCount = typeof selectionCount === "number" && Number.isFinite(selectionCount) ? Math.max(0, Math.trunc(selectionCount)) : 0;
  const multipleTrailing = selectionMode === "multiple" && select && multipleCount > 1 ? (
    <span className="zen-chip__multi-trailing" aria-hidden="true" data-clickable={onClearSelection ? "true" : undefined} onClick={onClearSelection ? handleClear : undefined}>
      <BadgeCounter className="zen-chip__multi-count" size={size === "medium" ? "small" : "xsmall"} theme="neutral" background="solid" value={multipleCount} />
      <span className="zen-chip__multi-remove" aria-hidden="true"><Icon name="icon-x-circle-solid" decorative /></span>
    </span>
  ) : null;
  const resolvedTrailing = trailing ?? (multipleTrailing ?? (showRemove ? singleRemove : showDropdown ? <Icon name={isPopoverOpen || state === "press" ? "icon-chevron-up-line" : "icon-chevron-down-line"} size="2xs" /> : null));
  const resolvedValue = value ?? counter;
  const resolvedLevel = variant === "advanced" ? "secondary" : level;
  const setPopoverOpen = (nextOpen: boolean, { fromKeyboard = false, restoreFocus = false } = {}) => {
    setOpenedFromKeyboard(nextOpen && fromKeyboard);
    setUncontrolledPopoverOpen(nextOpen);
    onPopoverOpenChange?.(nextOpen);
    if (!nextOpen && restoreFocus) buttonRef.current?.focus();
  };
  const handleClick: NonNullable<ButtonHTMLAttributes<HTMLButtonElement>["onClick"]> = (event) => {
    onClick?.(event);
    // detail === 0 means the click came from Enter/Space.
    if (!event.defaultPrevented && canOpenPopover) setPopoverOpen(!isPopoverOpen, { fromKeyboard: event.detail === 0 });
  };
  const handleKeyDown: NonNullable<ButtonHTMLAttributes<HTMLButtonElement>["onKeyDown"]> = (event) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if ((event.key === "Delete" || event.key === "Backspace") && select && onClearSelection) {
      event.preventDefault();
      onClearSelection();
      return;
    }
    if (!canOpenPopover) return;
    if (event.key === "Escape" && isPopoverOpen) {
      event.preventDefault();
      setPopoverOpen(false);
      return;
    }
    if (event.key === "ArrowDown" && !isPopoverOpen) {
      event.preventDefault();
      setPopoverOpen(true, { fromKeyboard: true });
    }
  };
  const handlePopoverSelect = (item: PopoverItemData) => {
    onPopoverSelect?.(item);
    if (!popoverMultiple) setPopoverOpen(false, { restoreFocus: true });
  };
  useEffect(() => {
    if (!isPopoverOpen || !canOpenPopover) return undefined;
    const handleOutsidePointer = (event: PointerEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setPopoverOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [canOpenPopover, isPopoverOpen, onPopoverOpenChange]);

  const button = (
    <button
      {...buttonProps}
      ref={(node) => {
        buttonRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-haspopup={canOpenPopover ? "listbox" : undefined}
      aria-expanded={canOpenPopover ? isPopoverOpen : undefined}
      aria-pressed={!canOpenPopover && variant !== "advanced" ? select : undefined}
      aria-keyshortcuts={select && onClearSelection ? "Delete Backspace" : undefined}
      className={["zen-chip", className].filter(Boolean).join(" ")}
      data-level={resolvedLevel}
      data-open={isPopoverOpen ? "true" : "false"}
      data-select={select ? "true" : "false"}
      data-size={size}
      data-state={isPopoverOpen && canOpenPopover ? "press" : state}
      data-theme={resolvedTheme}
      data-variant={variant}
    >
      {leading && !isNumberOnly ? <span className={["zen-chip__slot", resolvedTheme === "leading-photo" ? "zen-chip__photo" : ""].filter(Boolean).join(" ")}>{leading}</span> : null}
      {isNumberOnly ? <span className={`zen-chip__value ${typographyStyles["Body/Base/Bold"]}`}>{resolvedValue ?? children}</span> : <span className={`zen-chip__label ${typographyStyles[state === "placeholder" ? "Body/Base/Medium" : "Body/Base/Bold"]}`}>{children}</span>}
      {/* Figma Chip/Advanced "Counter" boolean: nested Badge XSmall · Neutral · Subtle. */}
      {!isNumberOnly && counter !== undefined ? <Badge className="zen-chip__counter" size="xsmall" theme="neutral" background="subtle" leadingIcon={false}>{counter}</Badge> : null}
      {resolvedTrailing ? <span className="zen-chip__slot zen-chip__trailing">{resolvedTrailing}</span> : null}
    </button>
  );

  if (!canOpenPopover) return button;
  return (
    <span ref={dropdownRef} className="zen-chip__dropdown">
      {button}
      <Popover
        open={isPopoverOpen}
        label={popoverLabel}
        search={popoverSearch}
        searchValue={popoverSearchValue}
        searchPlaceholder={popoverSearchPlaceholder}
        onSearchChange={onPopoverSearchChange}
        scrollBar={popoverScrollBar}
        items={popoverItems}
        onSelect={handlePopoverSelect}
        autoFocus={openedFromKeyboard}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setPopoverOpen(false, { restoreFocus: true });
          }
        }}
      />
    </span>
  );
});

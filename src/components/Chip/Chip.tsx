import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode, type Ref } from "react";
import { Icon, type IconName } from "../Icon";
import { Popover, PopoverManualAddNew, useExclusivePopover, type PopoverItemData } from "../Popover";
import { ZenPortal } from "../Portal";
import { BadgeCounter } from "../Badge";
import { Avatar, type AvatarSize } from "../Avatar";
import { VisuallyHidden } from "../VisuallyHidden";
import { renderIcon } from "../_shared/icon";
import { scaleKey } from "../_shared/scale";
import { useZenLabels } from "../_shared/zen-context";
import { typographyStyles } from "../../tokens/typography.generated";
import "./chip.css";
import "../Icon/core";

/** Figma's three Chip/Pill component sets. */
export const chipVariants = ["advanced", "normal", "number-only"] as const;
export const chipSizes = ["xsmall", "small", "medium"] as const;
export const chipLevels = ["primary", "secondary"] as const;
export const chipThemes = ["text-only", "leading-icon", "leading-photo"] as const;
export const chipStates = ["default", "hover", "press", "focused", "placeholder", "disabled"] as const;

export type ChipVariant = (typeof chipVariants)[number];
/** CSS / Figma key (the `data-size` value). */
type ChipSizeKey = (typeof chipSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type ChipSize = "xs" | "sm" | "md" | "xsmall" | "small" | "medium";
export type ChipLevel = (typeof chipLevels)[number];
export type ChipTheme = (typeof chipThemes)[number];
export type ChipState = (typeof chipStates)[number];
export type ChipSelectionMode = "single" | "multiple";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  children?: ReactNode;
  /** Component set: Advanced, Normal, or Number-only. */
  variant?: ChipVariant;
  /** Medium by default, on desktop and phones (a filter row lines up with Search and Buttons at 40px); small only inside a
   *  genuinely narrow component space. Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: ChipSize;
  level?: ChipLevel;
  theme?: ChipTheme;
  state?: ChipState;
  /** Selected (Figma Select=Yes): Advanced chips show the close affordance, Normal chips the selected styling. */
  selected?: boolean;
  /**
   * Figma's Select property. Selected chips show the close affordance in Advanced.
   * @deprecated Use selected.
   */
  select?: boolean;
  /** Figma's Dropdown property. Advanced chips show a chevron when enabled. */
  dropdown?: boolean;
  /** Filter behavior: single keeps the dropdown affordance; multiple uses the
   * Figma Chip/Trailing counter and changes to remove on hover. */
  selectionMode?: ChipSelectionMode;
  /** Number of selected options for a multiple filter. Shown from 2 as the Chip/Trailing Badge-Counter; the chip is
   *  then named "Owner, 3 applied" (the locale's `appliedCount`). */
  selectionCount?: number;
  /** Figma Chip/Advanced Counter: a Badge-Counter after the label. The chip is then named "Filters, 2 applied" (the
   *  locale's `appliedCount`; a Normal chip reads "Unread, 4"), never the run-together "Filters2". */
  counter?: number | string;
  /** Alias used by the Number-only component set. */
  value?: number | string;
  /** Leading icon: an icon name (`"icon-grid-01-line"`) or a node. */
  leading?: IconName | ReactNode;
  /** Leading-Photo theme: image rendered through the shared Avatar/Single (Photo, Subtle) primitive,
   * sized per Figma (XSmall → 2XSmall 20, Small → XSmall 24, Medium → Small 32). */
  photoSrc?: string;
  photoAlt?: string;
  /** Trailing slot: an icon name or a node; replaces the dropdown chevron / remove affordance. */
  trailing?: IconName | ReactNode;
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
  /** Figma Popover/Manual-Add-New: lets users create a value that isn't listed (labels, tags).
   * The popover gets a Search row; a "Create" + Accent Badge row appears only for a new value, Enter creates it. */
  onPopoverCreate?: (value: string) => void;
  popoverCreateLabel?: ReactNode;
  /**
   * Renders the Popover in the page's overlay layer (ZenPortal), anchored under the chip, instead of inside it: a chip in
   * a row that scrolls sideways (`overflow-x: auto` clips both axes) or in any box that clips its overflow keeps a whole,
   * visible menu. Light dismiss, Escape and focus return work the same. Leave it off inside a Dialog or Bottom Sheet.
   */
  popoverPortal?: boolean;
}

/**
 * Figma Chip/Pill: `Chip/Advanced` (512:7659, the filter control that owns a Popover), `Chip/Normal` (512:6843, toggle
 * pills) and `Chip/Number-Only` (1536:26687). A chip is a `<button>`. A Number-only chip with nothing to do (no
 * `onClick` or other press handler, no `selected`, not `disabled`) is a count, which Figma describes as a "numeric-only
 * compact indicator for counts or rankings": it renders a `<span>` in the Default state, with no hover, no focus stop
 * and no dead click, and the ref points at that span. Give it `onClick` or `selected` to make it a pressable number
 * (Hover, Focused, Selected). Normal and Advanced chips always do something; Figma: a read-only label is a Tag.
 */
export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  {
    children,
    variant = "advanced",
    size: sizeProp = "md",
    level = "secondary",
    theme,
    state = "default",
    selected: selectedProp,
    select: selectProp,
    dropdown,
    selectionMode,
    selectionCount,
    counter,
    value,
    leading: leadingProp,
    photoSrc,
    photoAlt = "",
    trailing: trailingProp,
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
    onPopoverCreate,
    popoverCreateLabel,
    popoverPortal = false,
    className,
    type = "button",
    disabled,
    onClick,
    onKeyDown,
    ...buttonProps
  },
  ref,
) {
  const size = scaleKey(sizeProp, chipSizes);
  const t = useZenLabels();
  const select = selectedProp ?? selectProp ?? false;
  // Icon names render at the slot's size today (leading Small 16, trailing chevron 2XSmall); the slot CSS sizes the glyph.
  const trailing = renderIcon(trailingProp, { size: "2xs" });
  const [uncontrolledPopoverOpen, setUncontrolledPopoverOpen] = useState(false);
  const [openedFromKeyboard, setOpenedFromKeyboard] = useState(false);
  const dropdownRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  // The portalled layer (popoverPortal): outside the chip in the DOM, so light dismiss checks it as well.
  const layerRef = useRef<HTMLDivElement>(null);
  const isNumberOnly = variant === "number-only";
  const photoSize: AvatarSize = size === "xsmall" ? "2xsmall" : size === "medium" ? "small" : "xsmall";
  const leading = photoSrc ? <Avatar size={photoSize} theme="photo" background="subtle" src={photoSrc} alt={photoAlt} /> : renderIcon(leadingProp, { size: "sm" });
  const isDisabled = disabled || state === "disabled";
  // Anything that makes pressing the chip do something: a handler, a selection (a toggle, even while off), a submit,
  // or ARIA state the caller manages (an external sheet it opens).
  const pressable = Boolean(onClick || onKeyDown || onClearSelection || buttonProps.onPointerDown || buttonProps.onPointerUp || buttonProps.onMouseDown || buttonProps.onMouseUp || buttonProps.form || buttonProps.formAction)
    || type !== "button" || selectedProp !== undefined || selectProp !== undefined
    || buttonProps["aria-pressed"] !== undefined || buttonProps["aria-haspopup"] !== undefined || buttonProps["aria-expanded"] !== undefined;
  // Figma Chip/Number-Only is a count as well as a pressable number: with nothing to do it is a <span> (see the JSDoc).
  const isStatic = isNumberOnly && !isDisabled && !pressable;
  // Padding follows the rendered leading slot, including callers that omit Theme.
  const resolvedTheme = leading && !isNumberOnly ? (photoSrc || theme === "leading-photo" ? "leading-photo" : "leading-icon") : "text-only";
  // The chip owns a Popover only when it has something to show. `dropdown` alone is just the chevron affordance: a chip that
  // opens an external surface (a Bottom Sheet, a filter panel) passes its own onClick / aria-haspopup / aria-expanded.
  const canOpenPopover = !isNumberOnly && !isDisabled && (popoverItems !== undefined || onPopoverCreate !== undefined);
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
  // A shown count is part of the chip's name, after a comma: "Filters, 2 applied" (Advanced counter or the Multiple
  // count), "Unread, 4" (a Normal chip's counter). The badges themselves are aria-hidden, so the name never runs the
  // digits into the label ("Filters2"). Text labels get an exact aria-label; any other label gets a hidden suffix.
  const counterShown = !isNumberOnly && counter !== undefined && counter !== null && counter !== "";
  const shownCount = counterShown ? counter : multipleTrailing ? multipleCount : undefined;
  const countName = shownCount === undefined ? null : variant === "advanced" || !counterShown ? t.appliedCount(shownCount) : String(shownCount);
  const ownName = buttonProps["aria-label"] !== undefined || buttonProps["aria-labelledby"] !== undefined;
  const textLabel = typeof children === "string" || typeof children === "number" ? String(children) : null;
  const countLabel = countName && !ownName && textLabel ? `${textLabel}, ${countName}` : undefined;
  const countSuffix = countName && !ownName && !textLabel ? <VisuallyHidden>{`, ${countName}`}</VisuallyHidden> : null;
  const resolvedTrailing = trailing ?? (multipleTrailing ?? (showRemove ? singleRemove : showDropdown ? <Icon name={isPopoverOpen || state === "press" ? "icon-chevron-up-line" : "icon-chevron-down-line"} size="2xs" /> : null));
  const resolvedValue = value ?? counter;
  const resolvedLevel = variant === "advanced" ? "secondary" : level;
  const setPopoverOpen = (nextOpen: boolean, { fromKeyboard = false, restoreFocus = false } = {}) => {
    setOpenedFromKeyboard(nextOpen && fromKeyboard);
    setUncontrolledPopoverOpen(nextOpen);
    onPopoverOpenChange?.(nextOpen);
    if (!nextOpen && restoreFocus) buttonRef.current?.focus();
  };
  // One popover at a time: opening this chip's menu closes another object's open popover (and vice versa).
  useExclusivePopover(canOpenPopover && isPopoverOpen, () => setPopoverOpen(false), dropdownRef);
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
      const target = event.target as Node;
      if (!dropdownRef.current?.contains(target) && !layerRef.current?.contains(target)) setPopoverOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [canOpenPopover, isPopoverOpen, onPopoverOpenChange]);

  if (isStatic) {
    // A count: the Default state of the chip, not a control. Button-only attributes stay off the span.
    const { form: _form, formAction: _formAction, formEncType: _formEncType, formMethod: _formMethod, formNoValidate: _formNoValidate, formTarget: _formTarget, name: _name, ...spanProps } = buttonProps;
    return (
      <span
        {...spanProps}
        ref={ref as unknown as Ref<HTMLSpanElement>}
        className={["zen-chip", className].filter(Boolean).join(" ")}
        data-level={resolvedLevel}
        data-select="false"
        data-size={size}
        data-state={state}
        data-static="true"
        data-tone={resolvedTheme}
        data-variant={variant}
      >
        <span className={`zen-chip__value ${typographyStyles["Body/Base/Bold"]}`}>{resolvedValue ?? children}</span>
      </span>
    );
  }

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
      aria-haspopup={canOpenPopover ? "listbox" : buttonProps["aria-haspopup"]}
      aria-expanded={canOpenPopover ? isPopoverOpen : buttonProps["aria-expanded"]}
      aria-pressed={!canOpenPopover && variant !== "advanced" && buttonProps.role !== "radio" ? select : undefined}
      aria-keyshortcuts={select && onClearSelection ? "Delete Backspace" : undefined}
      aria-label={countLabel ?? buttonProps["aria-label"]}
      className={["zen-chip", className].filter(Boolean).join(" ")}
      data-level={resolvedLevel}
      data-open={isPopoverOpen ? "true" : "false"}
      data-select={select ? "true" : "false"}
      data-size={size}
      data-state={isPopoverOpen && canOpenPopover ? "press" : state}
      data-tone={resolvedTheme}
      data-variant={variant}
    >
      {leading && !isNumberOnly ? <span className={["zen-chip__slot", resolvedTheme === "leading-photo" ? "zen-chip__photo" : ""].filter(Boolean).join(" ")}>{leading}</span> : null}
      {isNumberOnly ? <span className={`zen-chip__value ${typographyStyles["Body/Base/Bold"]}`}>{resolvedValue ?? children}</span> : <span className={`zen-chip__label ${typographyStyles[state === "placeholder" ? "Body/Base/Medium" : "Body/Base/Bold"]}`}>{children}{countSuffix}</span>}
      {/* Figma Chip/Advanced "Counter" boolean: a count → Badge-Counter XSmall · Neutral · Subtle (Figma still nests a plain Badge). */}
      {!isNumberOnly && counter !== undefined ? <BadgeCounter className="zen-chip__counter" size="xsmall" theme="neutral" background="subtle" value={counter} aria-hidden="true" /> : null}
      {resolvedTrailing ? <span className="zen-chip__slot zen-chip__trailing">{resolvedTrailing}</span> : null}
    </button>
  );

  if (!canOpenPopover) return button;
  const anchor = popoverPortal ? buttonRef : undefined;
  const popover = onPopoverCreate ? (
        <PopoverManualAddNew
          open={isPopoverOpen}
          label={popoverLabel}
          createLabel={popoverCreateLabel}
          onCreate={(created) => { onPopoverCreate(created); if (!popoverMultiple) setPopoverOpen(false, { restoreFocus: true }); }}
          searchValue={popoverSearchValue}
          searchPlaceholder={popoverSearchPlaceholder}
          onSearchChange={onPopoverSearchChange}
          scrollBar={popoverScrollBar}
          items={popoverItems}
          multiple={popoverMultiple}
          onSelect={handlePopoverSelect}
          autoFocus
          anchorRef={anchor}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setPopoverOpen(false, { restoreFocus: true });
            }
          }}
        />
      ) : // zen-allow-popover-close: Chip owns dismissal (document pointerdown outside + Escape handlers above).
      <Popover
        open={isPopoverOpen}
        label={popoverLabel}
        search={popoverSearch}
        searchValue={popoverSearchValue}
        searchPlaceholder={popoverSearchPlaceholder}
        onSearchChange={onPopoverSearchChange}
        scrollBar={popoverScrollBar}
        items={popoverItems}
        multiple={popoverMultiple}
        onSelect={handlePopoverSelect}
        autoFocus={openedFromKeyboard}
        anchorRef={anchor}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setPopoverOpen(false, { restoreFocus: true });
          }
        }}
      />;
  return (
    <span ref={dropdownRef} className="zen-chip__dropdown">
      {button}
      {popoverPortal ? <ZenPortal><div ref={layerRef} className="zen-chip__layer">{popover}</div></ZenPortal> : popover}
    </span>
  );
});

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type MouseEvent, type ReactNode, type Ref } from "react";
import { Icon, type IconName } from "../Icon";
import { Popover, PopoverManualAddNew, useExclusivePopover, type PopoverItemData } from "../Popover";
import { BottomSheet } from "../BottomSheet";
import { List, ListItem } from "../ListItem";
import { Search } from "../Search";
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
import { useNested, type NestedOverrides } from "../_shared/nested";
import { useDismissableLayer } from "../_shared/layers";
import { sheetLeading, usePhoneSheet } from "../_shared/phone-sheet";
import { useMergedRefs } from "../_shared/merge-refs";
import { composeEventHandlers } from "../_shared/compose-event-handlers";

/** Figma's three Chip/Pill component sets. */
export const chipVariants = ["advanced", "normal", "number-only"] as const;
export const chipSizes = ["xsmall", "small", "medium"] as const;
/** Black-Overlay and White-Overlay: chips on a colour band or photo, in static tokens (as Button's overlay levels). */
export const chipLevels = ["primary", "secondary", "black-overlay", "white-overlay"] as const;
export const chipThemes = ["text-only", "leading-icon", "leading-photo"] as const;
export const chipStates = ["default", "hover", "press", "focused", "placeholder", "disabled"] as const;

export type ChipVariant = (typeof chipVariants)[number];
/** CSS / Figma key (the `data-size` value). */
type ChipSizeKey = (typeof chipSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type ChipSize = "xs" | "sm" | "md" | "xsmall" | "small" | "medium";
/** A Figma level, or `"overlay"`: the default overlay, Black-Overlay. */
export type ChipLevel = (typeof chipLevels)[number] | "overlay";
export type ChipTheme = (typeof chipThemes)[number];
export type ChipState = (typeof chipStates)[number];
export type ChipSelectionMode = "single" | "multiple";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Ref to the chip's `<button>`; a static Number-only count (see the component docs) renders a `<span>`, which it
   *  then points at. */
  ref?: Ref<HTMLButtonElement>;
  children?: ReactNode;
  /** Component set: Advanced, Normal, or Number-only. */
  variant?: ChipVariant;
  /** Medium by default, on desktop and phones (a filter row lines up with Search and Buttons at 40px); small only inside a
   *  genuinely narrow component space. Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: ChipSize;
  /** Secondary (default) or Primary on a page surface (Advanced chips are always Secondary there). On a colour band or
   *  photo, for every variant: `black-overlay` (or `"overlay"`, the default overlay: a Black-Overlay chip, light text) or
   *  `white-overlay` (on a solid colour: a White-Overlay chip, light text); both turn White/Solid with dark text when
   *  selected and look the same in light and dark mode. */
  level?: ChipLevel;
  theme?: ChipTheme;
  state?: ChipState;
  /** Selected (Figma Select=Yes): Advanced chips show the close affordance, Normal chips the selected styling. */
  selected?: boolean;
  /** Uncontrolled start for `selected`: a Normal chip then turns itself on and off when pressed, and an Advanced chip's
   *  close affordance clears it. Leave `selected` out to use it. */
  defaultSelected?: boolean;
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
  /**
   * Items rendered by the shared Figma Popover/Default composition. Without `onPopoverSelect` (and `onPopoverCreate`) the
   * chip keeps the choice itself, starting from the items marked `selected`: a pick marks it (`popoverMultiple` toggles)
   * and the chip shows the one picked value as its label (and its photo or icon). A filter chip (`defaultSelected`, or
   * nothing picked at first) is then Selected, counts several for `selectionMode` "multiple" and clears them with its
   * close affordance; a chip that starts on a value (a period) only changes it. Pass `onPopoverSelect` to keep the choice
   * in your own state.
   * On a phone (the nearest `data-breakpoint`, else ZenProvider's, is "mobile"; SelectField's rule) the items open in a
   * Bottom Sheet instead, titled `popoverLabel` (else the chip's label): picked rows are Selected with a check, the Search
   * comes with `popoverSearch`, a pick closes it, and with `popoverMultiple` picks keep it open until Done. A chip with
   * `onPopoverCreate` keeps its popover.
   */
  popoverItems?: PopoverItemData[];
  /** Controlled open state for the advanced chip menu. */
  popoverOpen?: boolean;
  /** Uncontrolled start for `popoverOpen` (default false). */
  defaultPopoverOpen?: boolean;
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
  /** Figma instance overrides: props of the photo, icons and counters it draws, by layer (`{ Avatar: { shape: "square" }, Badge: { theme: "accent" } }`). Written by Zen Studio;
   *  app code sets photoSrc / leading / counter. */
  overrides?: NestedOverrides;
}

/**
 * Figma Chip/Pill: `Chip/Advanced` (512:7659, the filter control that owns a Popover), `Chip/Normal` (512:6843, toggle
 * pills) and `Chip/Number-Only` (1536:26687). A chip is a `<button>`. A Number-only chip with nothing to do (no
 * `onClick` or other press handler, no `selected`, not `disabled`) is a count, which Figma describes as a "numeric-only
 * compact indicator for counts or rankings": it renders a `<span>` in the Default state, with no hover, no focus stop
 * and no dead click, and the ref points at that span. Give it `onClick` or `selected` to make it a pressable number
 * (Hover, Focused, Selected). Normal and Advanced chips always do something; Figma: a read-only label is a Tag.
 * `level="black-overlay"` (`"overlay"`) and `"white-overlay"` put any variant on a colour band or photo in static tokens
 * that do not switch with the mode, as Button's overlay levels: a Background/Black-Overlay or White-Overlay chip with
 * light text (Content/On-Black-Overlay, Content/On-Colors), Background/White/Solid with On-White-Overlay text when selected.
 */
export function Chip({
    ref,
    children,
    variant = "advanced",
    size: sizeProp = "md",
    level: levelProp = "secondary",
    theme,
    state = "default",
    selected: selectedProp,
    defaultSelected,
    select: selectProp,
    dropdown,
    selectionMode,
    selectionCount: selectionCountProp,
    counter,
    value,
    leading: leadingProp,
    photoSrc,
    photoAlt = "",
    trailing: trailingProp,
    popoverItems,
    popoverOpen,
    defaultPopoverOpen = false,
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
    overrides,
    className,
    type = "button",
    disabled,
    onClick,
    onKeyDown,
    ...buttonProps
  }: ChipProps) {
  const nest = useNested(overrides);
  const size = scaleKey(sizeProp, chipSizes);
  const t = useZenLabels();
  const isNumberOnly = variant === "number-only";
  const controlledSelect = selectedProp ?? selectProp;
  // The chip keeps the choice itself when nobody listens to picks (see popoverItems). What it starts from is its key: when
  // those props change (an edit in Zen Studio, new data), it starts from them again.
  const ownsChoice = !isNumberOnly && popoverItems !== undefined && !onPopoverSelect && !onPopoverCreate;
  const startItems = ownsChoice ? (popoverItems ?? []).filter((item) => item.selected) : [];
  const startKey = `${controlledSelect}|${defaultSelected}|${startItems.map((item) => item.id).join("\u0000")}`;
  const [own, setOwn] = useState<{ key: string; selected: boolean; ids: string[] } | null>(null);
  const mine = own?.key === startKey ? own : null;
  const setOwnChoice = (selected: boolean, ids: string[]) => setOwn({ key: startKey, selected, ids });
  // Picks turn a filter chip Selected (× clears it): one that says so (selected / defaultSelected) or starts with nothing
  // picked. A chip that starts on a value without being Selected (a period picker) only changes that value.
  const picksSelect = controlledSelect !== undefined || defaultSelected !== undefined || startItems.length === 0;
  const select = mine && (picksSelect || !ownsChoice) ? mine.selected : controlledSelect ?? defaultSelected ?? false;
  // Uncontrolled (defaultSelected): a Normal or Number-only chip turns itself on and off; an Advanced chip clears itself.
  const ownsToggle = !ownsChoice && variant !== "advanced" && controlledSelect === undefined && defaultSelected !== undefined;
  const ownsClear = variant === "advanced" && !onClearSelection && (ownsChoice || (controlledSelect === undefined && defaultSelected !== undefined));
  const clearSelection = onClearSelection ?? (ownsClear ? () => setOwnChoice(false, []) : undefined);
  // Once a chip that keeps the choice is used, what it shows comes from that choice (until then, from its props): the one
  // picked value as its label, with its photo or icon, else its placeholder. The placeholder is the label it was given,
  // unless that label is the value it started with (a page captured with one value on), then the popover's label.
  const used = ownsChoice ? mine : null;
  const ids = used?.ids ?? startItems.map((item) => item.id);
  const usedItems = used ? popoverItems?.map((item) => ({ ...item, selected: used.ids.includes(item.id) })) : undefined;
  const selectionCount = ownsChoice ? (used ? used.ids.length : selectionCountProp ?? startItems.length) : selectionCountProp;
  const picked = used?.ids.length === 1 ? popoverItems?.find((item) => item.id === used.ids[0]) : undefined;
  const textOf = (node: ReactNode) => (typeof node === "string" || typeof node === "number" ? String(node) : null);
  const startedOnValue = textOf(children) !== null && startItems.some((item) => textOf(item.label) === textOf(children));
  const placeholder = startedOnValue && textOf(popoverLabel) !== null ? popoverLabel : children;
  const label = used ? (picked ? picked.label : placeholder) : children;
  // A photo or icon that came from the start value leaves with it (usedPhoto null: no photo).
  const fromStart = (media: unknown) => media !== undefined && startItems.some((item) => item.photoSrc === media || item.leading === media);
  const pickedIcon = typeof picked?.leading === "string" ? picked.leading : undefined;
  const usedPhoto = used ? picked?.photoSrc ?? (pickedIcon || fromStart(photoSrc) ? null : undefined) : undefined;
  const showsPhoto = usedPhoto !== null && Boolean(usedPhoto ?? photoSrc);
  const leadingIcon = used ? (picked?.photoSrc ? undefined : pickedIcon ?? (fromStart(leadingProp) ? undefined : leadingProp)) : leadingProp;
  // Icon names render at the slot's size today (leading Small 16, trailing chevron 2XSmall); the slot CSS sizes the glyph.
  const trailing = nest("Trailing", renderIcon(trailingProp, { size: "2xs" }));
  const [uncontrolledPopoverOpen, setUncontrolledPopoverOpen] = useState(defaultPopoverOpen);
  const [openedFromKeyboard, setOpenedFromKeyboard] = useState(false);
  const dropdownRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const mergedButtonRef = useMergedRefs(buttonRef, ref);
  // The portalled layer (popoverPortal): outside the chip in the DOM, so light dismiss checks it as well.
  const layerRef = useRef<HTMLDivElement>(null);
  const photoSize: AvatarSize = size === "xsmall" ? "2xsmall" : size === "medium" ? "small" : "xsmall";
  const leading = showsPhoto ? nest("Avatar", <Avatar size={photoSize} theme="photo" background="subtle" src={usedPhoto ?? photoSrc} alt={photoAlt} />) : nest("Leading", renderIcon(leadingIcon, { size: "sm" }));
  const isDisabled = disabled || state === "disabled";
  // Anything that makes pressing the chip do something: a handler, a selection (a toggle, even while off), a submit,
  // or ARIA state the caller manages (an external sheet it opens).
  const pressable = Boolean(onClick || onKeyDown || onClearSelection || buttonProps.onPointerDown || buttonProps.onPointerUp || buttonProps.onMouseDown || buttonProps.onMouseUp || buttonProps.form || buttonProps.formAction)
    || type !== "button" || selectedProp !== undefined || selectProp !== undefined || defaultSelected !== undefined
    || buttonProps["aria-pressed"] !== undefined || buttonProps["aria-haspopup"] !== undefined || buttonProps["aria-expanded"] !== undefined;
  // Figma Chip/Number-Only is a count as well as a pressable number: with nothing to do it is a <span> (see the JSDoc).
  const isStatic = isNumberOnly && !isDisabled && !pressable;
  // Padding follows the rendered leading slot, including callers that omit Theme.
  const resolvedTheme = leading && !isNumberOnly ? (showsPhoto || theme === "leading-photo" ? "leading-photo" : "leading-icon") : "text-only";
  // The chip owns a Popover only when it has something to show. `dropdown` alone is just the chevron affordance: a chip that
  // opens an external surface (a Bottom Sheet, a filter panel) passes its own onClick / aria-haspopup / aria-expanded.
  const canOpenPopover = !isNumberOnly && !isDisabled && (popoverItems !== undefined || onPopoverCreate !== undefined);
  const isPopoverOpen = popoverOpen ?? uncontrolledPopoverOpen;
  // A phone: the items open in a Bottom Sheet (its scrim, Escape, focus trap and focus return), as SelectField's do.
  const asSheet = usePhoneSheet(buttonRef, isPopoverOpen) && canOpenPopover && !onPopoverCreate;
  // The sheet's own query when the app does not filter (as the Popover's uncontrolled Search), reset on every opening.
  const [sheetQuery, setSheetQuery] = useState(popoverSearchValue);
  useEffect(() => { if (isPopoverOpen) setSheetQuery(popoverSearchValue); }, [isPopoverOpen, popoverSearchValue]);
  const showDropdown = !isNumberOnly && !select && !trailing && (dropdown ?? variant === "advanced");
  // The Advanced set owns the removable trailing primitive. Normal's Select
  // axis only changes its selected styling; it does not add a close icon.
  const showRemove = variant === "advanced" && select && !trailing;
  const handleClear = (event: MouseEvent<HTMLSpanElement>) => {
    event.preventDefault();
    event.stopPropagation();
    clearSelection?.();
  };
  // The clear affordance lives inside the chip <button>; it is pointer-clickable but not a
  // nested focus stop (interactive-in-interactive is invalid). Keyboard users press
  // Delete/Backspace on the focused chip instead (announced via aria-keyshortcuts).
  const singleRemove = (
    <span
      className="zen-chip__remove"
      aria-hidden="true"
      data-clickable={clearSelection ? "true" : undefined}
      onClick={clearSelection ? handleClear : undefined}
    >
      <Icon name="icon-x-circle-solid" decorative />
    </span>
  );
  // The Figma Multiple trailing primitive is Badge/Counter (layer "Badge-Counter" in .Chip/Trailing): its label is
  // always numeric, never a caller-provided string or arbitrary React node.
  const multipleCount = typeof selectionCount === "number" && Number.isFinite(selectionCount) ? Math.max(0, Math.trunc(selectionCount)) : 0;
  const multipleTrailing = selectionMode === "multiple" && select && multipleCount > 1 ? (
    <span className="zen-chip__multi-trailing" aria-hidden="true" data-clickable={clearSelection ? "true" : undefined} onClick={clearSelection ? handleClear : undefined}>
      {nest("Badge-Counter", <BadgeCounter className="zen-chip__multi-count" size={size === "medium" ? "small" : "xsmall"} theme="neutral" background="solid" value={multipleCount} />)}
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
  const textLabel = textOf(label);
  const countLabel = countName && !ownName && textLabel ? `${textLabel}, ${countName}` : undefined;
  const countSuffix = countName && !ownName && !textLabel ? <VisuallyHidden>{`, ${countName}`}</VisuallyHidden> : null;
  const resolvedTrailing = trailing ?? (multipleTrailing ?? (showRemove ? singleRemove : showDropdown ? <Icon name={isPopoverOpen || state === "press" ? "icon-chevron-up-line" : "icon-chevron-down-line"} size="2xs" /> : null));
  const resolvedValue = value ?? counter;
  // "overlay" is the default overlay level; Advanced chips have no Primary (Figma Chip/Advanced).
  const level = levelProp === "overlay" ? "black-overlay" : levelProp;
  const resolvedLevel = variant === "advanced" && !level.endsWith("overlay") ? "secondary" : level;
  const setPopoverOpen = (nextOpen: boolean, { fromKeyboard = false, restoreFocus = false } = {}) => {
    setOpenedFromKeyboard(nextOpen && fromKeyboard);
    setUncontrolledPopoverOpen(nextOpen);
    onPopoverOpenChange?.(nextOpen);
    if (!nextOpen && restoreFocus) buttonRef.current?.focus();
  };
  // One popover at a time: opening this chip's menu closes another object's open popover (and vice versa).
  useExclusivePopover(canOpenPopover && isPopoverOpen, () => setPopoverOpen(false), dropdownRef);
  const handleClick = composeEventHandlers(onClick, (event) => {
    if (ownsToggle) setOwnChoice(!select, []);
    // detail === 0 means the click came from Enter/Space.
    if (canOpenPopover) setPopoverOpen(!isPopoverOpen, { fromKeyboard: event.detail === 0 });
  });
  const handleKeyDown = composeEventHandlers(onKeyDown, (event) => {
    if ((event.key === "Delete" || event.key === "Backspace") && select && clearSelection) {
      event.preventDefault();
      clearSelection();
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
  });
  const handlePopoverSelect = (item: PopoverItemData) => {
    if (ownsChoice) {
      const next = popoverMultiple ? (ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id]) : [item.id];
      setOwnChoice(next.length > 0, next);
    }
    onPopoverSelect?.(item);
    if (!popoverMultiple) setPopoverOpen(false, { restoreFocus: true });
  };
  const isOutside = useDismissableLayer(isPopoverOpen && canOpenPopover && !asSheet, () => [dropdownRef.current, layerRef.current]);
  useEffect(() => {
    if (!isPopoverOpen || !canOpenPopover || asSheet) return undefined;
    const handleOutsidePointer = (event: PointerEvent) => {
      if (isOutside(event.target as Node)) setPopoverOpen(false);
    };
    document.addEventListener("pointerdown", handleOutsidePointer);
    return () => document.removeEventListener("pointerdown", handleOutsidePointer);
  }, [canOpenPopover, isPopoverOpen, asSheet, onPopoverOpenChange]);

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
      ref={mergedButtonRef}
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-haspopup={canOpenPopover ? (asSheet ? "dialog" : "listbox") : buttonProps["aria-haspopup"]}
      aria-expanded={canOpenPopover ? isPopoverOpen : buttonProps["aria-expanded"]}
      aria-pressed={!canOpenPopover && variant !== "advanced" && buttonProps.role !== "radio" ? select : undefined}
      aria-keyshortcuts={select && clearSelection ? "Delete Backspace" : undefined}
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
      {isNumberOnly ? <span className={`zen-chip__value ${typographyStyles["Body/Base/Bold"]}`}>{resolvedValue ?? children}</span> : <span className={`zen-chip__label ${typographyStyles[state === "placeholder" ? "Body/Base/Medium" : "Body/Base/Bold"]}`}>{label}{countSuffix}</span>}
      {/* Figma Chip/Advanced "Counter" boolean shows the layer "Badge": a count → Badge-Counter XSmall · Neutral · Subtle (Figma still nests a plain Badge). */}
      {!isNumberOnly && counter !== undefined ? nest("Badge", <BadgeCounter className="zen-chip__counter" size="xsmall" theme="neutral" background="subtle" value={counter} aria-hidden="true" />) : null}
      {resolvedTrailing ? <span className="zen-chip__slot zen-chip__trailing">{resolvedTrailing}</span> : null}
    </button>
  );

  if (!canOpenPopover) return button;
  if (asSheet) {
    // The phone's sheet: the items as List rows (SelectField's sheet), Selected with a check; the Search filters them by
    // their text unless the app does (onPopoverSearchChange). Several picks keep it open until Done.
    const sheetItems = usedItems ?? popoverItems ?? [];
    const query = onPopoverSearchChange ? "" : sheetQuery.trim().toLowerCase();
    const shown = query ? sheetItems.filter((item) => (textOf(item.label) ?? "").toLowerCase().includes(query)) : sheetItems;
    const title = popoverLabel ?? label;
    return (
      <span ref={dropdownRef} className="zen-chip__dropdown">
        {button}
        <BottomSheet open={isPopoverOpen} onOpenChange={(next) => { if (!next) setPopoverOpen(false); }} title={title}
          search={popoverSearch ? <Search value={onPopoverSearchChange ? popoverSearchValue : sheetQuery} onValueChange={(next) => { setSheetQuery(next); onPopoverSearchChange?.(next); }} placeholder={popoverSearchPlaceholder} /> : undefined}
          primaryAction={popoverMultiple ? { label: t.done } : undefined}>
          <List aria-label={textOf(title) ?? undefined}>
            {shown.map((item) => (
              <ListItem key={item.id} title={item.label} caption={item.caption} leading={sheetLeading(item)} selected={Boolean(item.selected)}
                className={item.disabled ? "zen-chip__sheet-option--disabled" : undefined} aria-disabled={item.disabled || undefined}
                trailing={item.selected ? <Icon name="icon-check-line" size="base" decorative /> : undefined}
                onClick={item.disabled ? undefined : () => handlePopoverSelect(item)} />
            ))}
          </List>
        </BottomSheet>
      </span>
    );
  }
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
        items={usedItems ?? popoverItems}
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
}

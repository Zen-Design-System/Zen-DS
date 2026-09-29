import {
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { Divider } from "../Divider";
import { Icon, type IconName } from "../Icon";
import { PopoverItem, useExclusivePopover } from "../Popover";
import { ZenPortal } from "../Portal";
import { typographyStyles } from "../../tokens/typography.generated";
import "./menu.css";

/** One action in a Menu. */
export type MenuItemData = {
  type?: "item";
  /** Stable id, handed back to `onSelect`. */
  id: string;
  /** The action, verb first (“Duplicate”, “Move to…”). One line: a long label ends in “…”. */
  label: string;
  /** Leading icon: an icon name (drawn at 20px) or an element. Give every item of a menu an icon, or none. */
  icon?: IconName | ReactElement;
  /** A second line with a short consequence (“Anyone with the link can view”). */
  caption?: ReactNode;
  /** Keyboard shortcut shown on the right (“⌘D”). Display only: the app wires the shortcut itself. */
  shortcut?: string;
  /** Destructive action (Delete, Remove): Content/Negative text. Put it last, after a separator. */
  danger?: boolean;
  /** Not available right now: dimmed and skipped by the arrow keys. */
  disabled?: boolean;
  /** Runs when the item is chosen (click, Enter or Space), before the Menu's `onSelect`; then the menu closes. */
  onSelect?: () => void;
};
/** A line between groups of items. */
export type MenuSeparatorData = { type: "separator"; id?: string };
/** Items under a small label (“Share”, “Danger zone”). The label names the group; it is not a heading. */
export type MenuGroupData = { type: "group"; id?: string; label: string; items: Array<MenuItemData | MenuSeparatorData> };
/** An entry of `items`: an item, `{ type: "separator" }` or `{ type: "group", label, items }`. */
export type MenuEntry = MenuItemData | MenuSeparatorData | MenuGroupData;

export interface MenuProps {
  /**
   * The control that opens the menu: a Button or an IconButton with an aria-label (it names the menu too). It receives
   * aria-haspopup="menu", aria-expanded and aria-controls, and the opening keys (Enter · Space · ↓ first item, ↑ last item).
   */
  trigger: ReactElement;
  /** The actions: items, `{ type: "separator" }` and `{ type: "group", label, items }`. Without it, compose `children`. */
  items?: MenuEntry[];
  /** Composable entries (`MenuItem`, `MenuSeparator`, `MenuGroup`), used when `items` is not given. */
  children?: ReactNode;
  /** Called with the chosen item (after the item's own `onSelect`); then the menu closes and focus returns to the trigger. */
  onSelect?: (item: MenuItemData) => void;
  /** Which edge of the trigger the menu lines up with: `start` (default) or `end` (a trigger at the right end of a row or card). Flips when it would leave the viewport. */
  align?: "start" | "end";
  /** Controlled open state; pair it with `onOpenChange`. Default: uncontrolled and closed. */
  open?: boolean;
  /** Initial state when uncontrolled. Default false. */
  defaultOpen?: boolean;
  /** Called with `true` when the trigger opens the menu and `false` when it closes (choice, Escape, Tab, outside press). */
  onOpenChange?: (open: boolean) => void;
  /** Accessible name of the menu. Default: the trigger's name (aria-labelledby). */
  "aria-label"?: string;
  /** Extra class on the floating surface. */
  className?: string;
}

type MenuContextValue = { choose: (item: MenuItemData) => void };
const MenuContext = createContext<MenuContextValue | null>(null);

type TriggerProps = {
  id?: string;
  ref?: Ref<HTMLElement>;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
};

const ITEM = ".zen-popover__item";
const enabledItems = (list: HTMLElement | null) => Array.from(list?.querySelectorAll<HTMLButtonElement>(`${ITEM}:not(:disabled)`) ?? []);
const idFrom = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "");

type MenuPlacement = { side: "bottom" | "top"; style?: CSSProperties };
const MENU_GAP = 4; // Spacing/Gap/2XSmall between the trigger and the surface
const MENU_MARGIN = 8; // room kept to the edge of the visible area

/**
 * Places the absolutely positioned surface against the trigger: 4px below it, or above when there is less room below;
 * lined up with its start edge, or its end edge when the start would overflow (and the other way round for `end`).
 * Like useAnchoredPosition, plus a container that is scaled (a device frame with `transform: scale()`): offsets are
 * computed in the container's own, unscaled pixels and its `--zen-safe-area-top/-bottom` are kept clear.
 */
function useMenuPlacement(surfaceRef: RefObject<HTMLElement | null>, triggerRef: RefObject<HTMLElement | null>, open: boolean, align: "start" | "end") {
  const [placement, setPlacement] = useState<MenuPlacement>({ side: "bottom" });
  useLayoutEffect(() => {
    if (!open) return undefined;
    const surface = surfaceRef.current;
    if (!surface) return undefined;
    const update = () => {
      const trigger = triggerRef.current;
      const container = surface.offsetParent as HTMLElement | null;
      if (!trigger || !container) return;
      const viewportWidth = document.documentElement.clientWidth;
      const viewportHeight = document.documentElement.clientHeight;
      // A portalled surface with no positioned ancestor resolves top/bottom against the initial containing block:
      // viewport-sized and pinned to the top of the document.
      const icb = (container === document.body || container === document.documentElement) && getComputedStyle(container).position === "static";
      const frame = container.getBoundingClientRect();
      const scale = icb ? 1 : frame.width / container.offsetWidth || 1;
      // Viewport position of the containing block's padding-box origin (a scrolled container moves its content, and with it the surface).
      const originX = icb ? -window.scrollX : frame.left + (container.clientLeft - container.scrollLeft) * scale;
      const originY = icb ? -window.scrollY : frame.top + (container.clientTop - container.scrollTop) * scale;
      const containerWidth = icb ? viewportWidth : container.clientWidth;
      const containerHeight = icb ? viewportHeight : container.clientHeight;
      const safe = (name: string) => (icb ? 0 : (parseFloat(getComputedStyle(container).getPropertyValue(name)) || 0) * scale);
      const bounds = icb
        ? { top: 0, left: 0, right: viewportWidth, bottom: viewportHeight }
        : { top: Math.max(0, frame.top + safe("--zen-safe-area-top")), left: Math.max(0, frame.left), right: Math.min(viewportWidth, frame.right), bottom: Math.min(viewportHeight, frame.bottom - safe("--zen-safe-area-bottom")) };
      const box = trigger.getBoundingClientRect();
      const width = surface.offsetWidth * scale;
      const height = surface.offsetHeight * scale;
      const gap = MENU_GAP * scale;
      const margin = MENU_MARGIN * scale;
      const below = bounds.bottom - box.bottom - gap - margin;
      const above = box.top - bounds.top - gap - margin;
      const side = below >= height || below >= above ? "bottom" : "top";
      const fitsStart = box.left + width <= bounds.right - margin;
      const fitsEnd = box.right - width >= bounds.left + margin;
      const end = align === "end" ? fitsEnd || !fitsStart : !fitsStart && fitsEnd;
      const x = (value: number) => (value - originX) / scale;
      const y = (value: number) => (value - originY) / scale;
      const style: CSSProperties = {
        top: side === "bottom" ? y(box.bottom + gap) : "auto",
        bottom: side === "top" ? containerHeight - y(box.top - gap) : "auto",
        left: end ? "auto" : x(box.left),
        right: end ? containerWidth - x(box.right) : "auto",
      };
      setPlacement((current) => (current.side === side && current.style?.top === style.top && current.style?.bottom === style.bottom && current.style?.left === style.left && current.style?.right === style.right ? current : { side, style }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(surface);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, align, surfaceRef, triggerRef]);
  return placement;
}

/**
 * An action menu (WAI-ARIA menu button): a trigger opens a list of actions on the Popover surface — Duplicate, Rename,
 * Move to…, Delete. It is not a selection list: to pick a value use SelectField, or Chip + Popover for filters.
 * The menu renders in the overlay portal (inside a device frame marked `data-zen-overlay-root`, in that frame), so a
 * table or card that clips its overflow never cuts it off; it attaches 4px below the trigger and flips above it (or to
 * the other edge) when there is no room.
 *
 *   <Menu trigger={<IconButton aria-label="Actions for Invoice 1024" icon={<Icon name="icon-dots-horizontal-line" />} />}
 *     items={[{ id: "duplicate", label: "Duplicate" }, { type: "separator" }, { id: "delete", label: "Delete", danger: true }]}
 *     onSelect={(item) => run(item.id)} />
 */
export function Menu({ trigger, items, children, onSelect, align = "start", open: openProp, defaultOpen = false, onOpenChange, "aria-label": ariaLabel, className }: MenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolledOpen;
  const baseId = idFrom(useId());
  const triggerProps = (isValidElement(trigger) ? trigger.props : {}) as TriggerProps;
  const triggerId = triggerProps.id ?? `zen-menu-trigger-${baseId}`;
  const menuId = `zen-menu-${baseId}`;
  const triggerRef = useRef<HTMLElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  /** Where focus goes when the menu opens: the first / last item (keyboard) or the menu itself (pointer). */
  const focusOnOpen = useRef<"first" | "last" | "menu">("menu");
  /** Set when a press outside closes the menu: focus then stays where the user clicked. */
  const closedOutside = useRef(false);
  const typeahead = useRef<{ text: string; timer?: number }>({ text: "" });
  const latest = useRef({ onOpenChange, onSelect });
  latest.current = { onOpenChange, onSelect };

  const setOpen = useCallback((next: boolean) => {
    if (!controlled) setUncontrolledOpen(next);
    latest.current.onOpenChange?.(next);
  }, [controlled]);

  const placement = useMenuPlacement(surfaceRef, triggerRef, open, align);
  // One popover at a time: opening this menu closes another object's popover or menu, and the other way round.
  useExclusivePopover(open, () => setOpen(false), surfaceRef, triggerRef);

  // Opening moves focus into the menu; closing while focus was inside gives it back to the trigger.
  useLayoutEffect(() => {
    if (!open) return undefined;
    closedOutside.current = false;
    const list = listRef.current;
    const options = enabledItems(list);
    const target = focusOnOpen.current === "first" ? options[0] : focusOnOpen.current === "last" ? options[options.length - 1] : undefined;
    focusOnOpen.current = "menu";
    // preventScroll: the surface is measured and placed in this same commit, so it may not sit at its final spot yet.
    (target ?? list)?.focus({ preventScroll: true });
    return () => {
      const active = document.activeElement;
      if (!closedOutside.current && (!active || active === document.body)) triggerRef.current?.focus({ preventScroll: true });
    };
  }, [open]);

  // Light dismiss: a press outside the menu and its trigger closes it (the trigger toggles on its own click).
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const target = event.target as Node | null;
      if (!target || surfaceRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closedOutside.current = true;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, setOpen]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus({ preventScroll: true });
  };

  const choose = (item: MenuItemData) => {
    item.onSelect?.();
    latest.current.onSelect?.(item);
    setOpen(false);
    // Back to the trigger, unless the action already moved focus somewhere else (an inline editor, a dialog).
    const active = document.activeElement;
    if (!active || active === document.body || listRef.current?.contains(active)) triggerRef.current?.focus({ preventScroll: true });
  };

  const focusItem = (options: HTMLButtonElement[], index: number) => options[index]?.focus();

  /** Printable characters move to the next item whose label starts with what was typed (within 500ms). */
  const findByTyping = (key: string, options: HTMLButtonElement[], current: number) => {
    const state = typeahead.current;
    window.clearTimeout(state.timer);
    state.text += key.toLowerCase();
    state.timer = window.setTimeout(() => { state.text = ""; }, 500);
    // Pressing one letter repeatedly cycles through the items that start with it.
    const repeated = [...state.text].every((char) => char === state.text[0]);
    const query = repeated ? state.text[0] : state.text;
    const start = repeated ? current + 1 : Math.max(current, 0);
    const labelOf = (option: HTMLElement) => (option.querySelector(".zen-popover__item-label")?.textContent ?? option.textContent ?? "").trim().toLowerCase();
    for (let step = 0; step < options.length; step += 1) {
      const index = (start + step) % options.length;
      if (labelOf(options[index]).startsWith(query)) { focusItem(options, index); return; }
    }
  };

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const options = enabledItems(listRef.current);
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusItem(options, current < 0 || current === last ? 0 : current + 1);
        return;
      case "ArrowUp":
        event.preventDefault();
        focusItem(options, current <= 0 ? last : current - 1);
        return;
      case "Home":
        event.preventDefault();
        focusItem(options, 0);
        return;
      case "End":
        event.preventDefault();
        focusItem(options, last);
        return;
      case "Escape":
        // Only the menu closes: a Dialog or Side Panel around the trigger stays open.
        event.preventDefault();
        event.stopPropagation();
        close(true);
        return;
      case "Tab":
        // Close, and let Tab carry on from the trigger (the menu itself is portalled to the end of the page).
        close(true);
        return;
      default:
        if (event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey) findByTyping(event.key, options, current);
    }
  };

  // Focus follows the mouse, so the keyboard continues from the hovered item and only one row is highlighted.
  const onListPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const option = (event.target as Element).closest<HTMLButtonElement>(ITEM);
    if (option && !option.disabled && document.activeElement !== option) option.focus({ preventScroll: true });
  };

  // Focus leaving for another element (screen-reader navigation, a click into an iframe) closes the menu.
  const onListBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && !surfaceRef.current?.contains(next) && !triggerRef.current?.contains(next)) setOpen(false);
  };

  const mergedTriggerRef = useCallback((node: HTMLElement | null) => {
    triggerRef.current = node;
    const own = triggerProps.ref;
    if (typeof own === "function") own(node);
    else if (own) (own as { current: HTMLElement | null }).current = node;
  }, [triggerProps.ref]);

  const triggerElement = isValidElement<TriggerProps & Record<string, unknown>>(trigger)
    ? cloneElement(trigger, {
      ref: mergedTriggerRef,
      id: triggerId,
      "aria-haspopup": "menu",
      "aria-expanded": open,
      "aria-controls": open ? menuId : undefined,
      onClick: (event: MouseEvent<HTMLElement>) => {
        triggerProps.onClick?.(event);
        if (event.defaultPrevented) return;
        if (open) { setOpen(false); return; }
        // Enter / Space fire a click with detail 0: open on the first item. A pointer opens on the menu itself.
        focusOnOpen.current = event.detail === 0 ? "first" : "menu";
        setOpen(true);
      },
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
        triggerProps.onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const where = event.key === "ArrowDown" ? "first" : "last";
          if (open) { const options = enabledItems(listRef.current); focusItem(options, where === "first" ? 0 : options.length - 1); return; }
          focusOnOpen.current = where;
          setOpen(true);
        } else if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
        }
      },
    })
    : trigger;

  // Inside a device frame (`[data-zen-overlay-root]`, e.g. a phone preview) the menu opens in that frame, like the Chat
  // hold menu: it scales with the frame and stays on its screen. Elsewhere it goes to the page's overlay portal.
  const overlayRoot = open ? triggerRef.current?.closest<HTMLElement>("[data-zen-overlay-root]") ?? null : null;
  const surface = open ? (
    <div ref={surfaceRef} className={["zen-popover", "zen-menu", className].filter(Boolean).join(" ")} style={placement.style} data-side={placement.side}>
      <div
        ref={listRef}
        id={menuId}
        role="menu"
        tabIndex={-1}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : triggerId}
        className="zen-popover__items zen-menu__list"
        onKeyDown={onListKeyDown}
        onPointerMove={onListPointerMove}
        onBlur={onListBlur}
      >
        <MenuContext value={{ choose }}>{items ? renderEntries(items) : children}</MenuContext>
      </div>
    </div>
  ) : null;

  return (
    <>
      {triggerElement}
      {surface ? overlayRoot ? createPortal(surface, overlayRoot) : <ZenPortal>{surface}</ZenPortal> : null}
    </>
  );
}

function renderEntries(entries: MenuEntry[]): ReactNode {
  return entries.map((entry, index) => {
    if (entry.type === "separator") return <MenuSeparator key={entry.id ?? `separator-${index}`} />;
    if (entry.type === "group") return <MenuGroup key={entry.id ?? `group-${index}`} label={entry.label}>{renderEntries(entry.items)}</MenuGroup>;
    const { type: _type, ...item } = entry;
    return <MenuItem key={item.id} {...item} />;
  });
}

export interface MenuItemProps {
  /** Stable id, handed back to the Menu's `onSelect`. Default: the label. */
  id?: string;
  /** The action, verb first (“Duplicate”, “Move to…”). One line: a long label ends in “…”. */
  label: string;
  /** Leading icon: an icon name (drawn at 20px) or an element. Give every item of a menu an icon, or none. */
  icon?: IconName | ReactElement;
  /** A second line with a short consequence (“Anyone with the link can view”). */
  caption?: ReactNode;
  /** Keyboard shortcut shown on the right (“⌘D”). Display only: the app wires the shortcut itself. */
  shortcut?: string;
  /** Destructive action (Delete, Remove): Content/Negative text. Put it last, after a separator. */
  danger?: boolean;
  /** Not available right now: dimmed and skipped by the arrow keys. */
  disabled?: boolean;
  /** Runs when the item is chosen (click, Enter or Space); then the Menu's `onSelect` runs and the menu closes. */
  onSelect?: () => void;
  /** Extra class on the row. */
  className?: string;
}

/** One action row (role=menuitem) on the Popover/Item primitive. Use it inside `<Menu>` when you compose children. */
export function MenuItem({ id, label, icon, caption, shortcut, danger = false, disabled = false, onSelect, className }: MenuItemProps) {
  const menu = useContext(MenuContext);
  const leading = icon === undefined ? undefined : typeof icon === "string" ? <Icon name={icon} size="base" decorative /> : icon;
  return (
    <PopoverItem
      itemRole="menuitem"
      tabIndex={-1}
      className={["zen-menu__item", className].filter(Boolean).join(" ")}
      data-danger={danger ? "true" : undefined}
      label={label}
      caption={caption}
      leading={leading}
      trailing={shortcut ? <span className={`zen-menu__shortcut ${typographyStyles["Body/Small/Regular"]}`}>{shortcut}</span> : undefined}
      disabled={disabled}
      onSelect={() => (menu ? menu.choose({ id: id ?? label, label, icon, caption, shortcut, danger, disabled, onSelect }) : onSelect?.())}
    />
  );
}

/** A Divider between groups of items (role=separator). */
export function MenuSeparator({ className }: { /** Extra class on the line. */ className?: string }) {
  return <Divider className={["zen-menu__separator", className].filter(Boolean).join(" ")} />;
}

export interface MenuGroupProps {
  /** Small label above the items (“Share”, “Move to”); it names the group for screen readers (aria-labelledby). It is a
   *  label, not a heading, so a menu never adds to the page outline. */
  label: string;
  /** MenuItem and MenuSeparator elements. */
  children: ReactNode;
  /** Extra class on the group. */
  className?: string;
}

/** Items under a label (Figma .Primitives/Popover/Label): role=group, named by the label through aria-labelledby (APG
 *  menu). The label is a plain element, never a heading (h1–h6 or role=heading). */
export function MenuGroup({ label, children, className }: MenuGroupProps) {
  const labelId = `zen-menu-group-${idFrom(useId())}`;
  return (
    <div role="group" aria-labelledby={labelId} className={["zen-menu__group", className].filter(Boolean).join(" ")}>
      <div id={labelId} className={`zen-popover__label ${typographyStyles["Body/Small/Medium"]}`}>{label}</div>
      {children}
    </div>
  );
}

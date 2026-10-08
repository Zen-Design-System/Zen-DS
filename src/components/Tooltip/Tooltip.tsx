import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type HTMLAttributes, type PointerEvent, type ReactElement, type ReactNode } from "react";
import { Icon } from "../Icon";
import "../Icon/core";
import { ZenPortal } from "../Portal";
import { useZenLabels } from "../_shared/zen-context";
import { usePresence } from "../Motion";
import { scaleKey } from "../_shared/scale";
import { typographyStyles } from "../../tokens/typography.generated";
import "./tooltip.css";

export const tooltipColors = ["default", "accent", "white-overlay", "black-overlay"] as const;
export const tooltipSizes = ["medium", "small"] as const;
export const tooltipPlacements = ["top", "bottom", "left", "right"] as const;
export type TooltipColor = (typeof tooltipColors)[number];
/** CSS / Figma key (the `data-size` value). */
type TooltipSizeKey = (typeof tooltipSizes)[number];
/** Short (canonical) or long Figma spelling — both render the same. */
export type TooltipSize = "md" | "sm" | "medium" | "small";
export type TooltipPlacement = (typeof tooltipPlacements)[number];

export interface TooltipSurfaceProps extends HTMLAttributes<HTMLSpanElement> {
  color?: TooltipColor;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: TooltipSize;
  children: ReactNode;
  /** Figma Close=Yes: a dismiss X after the label, called when it is pressed. */
  onClose?: () => void;
  /** The X's accessible name. Default: the locale's “Close”. */
  closeLabel?: string;
}

/**
 * Figma Tooltip (1595:2220): Color × Size bubble with the Simple-Label primitive (Caption/Medium). Close (boolean, added
 * 2026-10-07): a Wrapper Element-Size/Popular/Small high, Spacing/Gap/XSmall after the label, holding an
 * icon-x-medium-line at Element-Size/Popular/XSmall centred, in the label's content colour; for a tooltip shown open by
 * default.
 */
export function TooltipSurface({ color = "default", size: sizeProp = "md", className, children, onClose, closeLabel, ...props }: TooltipSurfaceProps) {
  const size = scaleKey(sizeProp, tooltipSizes);
  const t = useZenLabels();
  return (
    <span {...props} className={["zen-tooltip", className].filter(Boolean).join(" ")} data-color={color} data-size={size} data-closable={onClose ? "true" : undefined}>
      <span className={`zen-tooltip__label ${typographyStyles["Caption/Medium"]}`}>{children}</span>
      {onClose ? (
        // zen-allow-raw-icon-button: Figma Close is a bare XSmall icon in the label's colour (no Button container), and a
        // tooltip's own X takes no second tooltip; its name is aria-label, its hit area 24px (tooltip.css).
        <button type="button" className="zen-tooltip__close" aria-label={closeLabel ?? t.close} onClick={onClose}>
          <Icon name="icon-x-medium-line" size="xs" decorative />
        </button>
      ) : null}
    </span>
  );
}

export interface TooltipProps {
  /** Tooltip text. Keep it short and non-interactive; use Popover for rich content. */
  content: ReactNode;
  /** A single focusable element (Button, IconButton, link…), or a wrapper around one. The focused control receives
   *  aria-describedby. */
  children: ReactElement;
  color?: TooltipColor;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: TooltipSize;
  placement?: TooltipPlacement;
  /** Hover delay in ms before showing (focus shows immediately). Zen rule: 1s (`TOOLTIP_HOVER_DELAY`). */
  delay?: number;
  /** Controlled visibility; omit for hover/focus behavior. */
  open?: boolean;
  /** Shown from the start (uncontrolled): an onboarding hint, or a phone, where a tooltip never opens on touch. Pair it
   *  with `closable`. */
  defaultOpen?: boolean;
  /** Called when the tooltip opens or closes (the close X, Escape, hover and focus). */
  onOpenChange?: (open: boolean) => void;
  /** Figma Close=Yes: a dismiss X after the label. The tooltip then stays until it is closed (hover, focus and pointer
   *  presses no longer hide it) and is a `note`, as it holds a button. */
  closable?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Zen rule: a tooltip opens after hovering its trigger for 1s; keyboard focus opens it at once; touch never does. */
export const TOOLTIP_HOVER_DELAY = 1000;
/** After a tooltip closes, the next one within this window opens without the delay (moving along a toolbar). */
const TOOLTIP_WARM_MS = 600;
let lastTooltipClosedAt = 0;
const hoverWait = (delay: number) => (Date.now() - lastTooltipClosedAt < TOOLTIP_WARM_MS ? 0 : delay);
/** True inside an explicit <Tooltip>, so a built-in icon tooltip never doubles up with it. */
const InsideTooltipContext = createContext(false);

/** Shows a TooltipSurface next to its trigger on hover (after `delay`) and keyboard focus; Escape dismisses. */
export function Tooltip({ content, children, color = "default", size: sizeProp = "md", placement = "top", delay = TOOLTIP_HOVER_DELAY, open: controlledOpen, defaultOpen = false, onOpenChange, closable = false, disabled = false, className }: TooltipProps) {
  const size = scaleKey(sizeProp, tooltipSizes);
  const id = `zen-tooltip-${useId().replace(/:/g, "")}`;
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const timer = useRef<number | undefined>(undefined);
  const open = !disabled && (controlledOpen ?? internalOpen);
  const clear = () => window.clearTimeout(timer.current);
  // The open state as rendered (controlled or not), read by timers and handlers without a stale closure.
  const openRef = useRef(open);
  openRef.current = open;
  const setOpen = (next: boolean) => {
    if (next === openRef.current) return;
    openRef.current = next;
    if (!next) lastTooltipClosedAt = Date.now();
    if (controlledOpen === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  const show = (wait: number) => { clear(); if (wait <= 0) setOpen(true); else timer.current = window.setTimeout(() => setOpen(true), wait); };
  const hide = () => { clear(); setOpen(false); };
  // A closable tooltip stays until its X (or Escape) closes it.
  const hideOnLeave = closable ? undefined : hide;
  // Hiding fades out at XFast (tooltip.css); Escape dismisses at once.
  const presence = usePresence(open, 80);
  const [escaped, setEscaped] = useState(false);
  if (open && escaped) setEscaped(false);
  useEffect(() => clear, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setEscaped(true); hide(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  // Focus on a control nested in the trigger (a Button inside a Box) opens the tooltip too: that control gets the
  // aria-describedby while it is open, as the wrapper it sits in has no role to carry it.
  const [focused, setFocused] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const target = focused;
    // The close X of a closable tooltip sits inside the tooltip itself.
    if (!open || !target || target.closest(".zen-tooltip--floating")) return undefined;
    const ids = (target.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
    if (ids.includes(id)) return undefined;
    target.setAttribute("aria-describedby", [...ids, id].join(" "));
    return () => {
      const rest = (target.getAttribute("aria-describedby") ?? "").split(" ").filter((part) => part && part !== id);
      if (rest.length) target.setAttribute("aria-describedby", rest.join(" "));
      else target.removeAttribute("aria-describedby");
    };
  }, [open, id, focused]);
  const trigger = isValidElement<{ "aria-describedby"?: string }>(children)
    ? cloneElement(children, { "aria-describedby": [children.props["aria-describedby"], open ? id : undefined].filter(Boolean).join(" ") || undefined })
    : children;
  return (
    <span
      className={["zen-tooltip-anchor", className].filter(Boolean).join(" ")}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") show(hoverWait(delay)); }}
      onPointerLeave={hideOnLeave}
      onFocus={(event) => { const target = event.target as HTMLElement; setFocused(target); if (target.matches(":focus-visible")) show(0); }}
      onBlur={() => { setFocused(null); hideOnLeave?.(); }}
      onPointerDown={closable ? undefined : hide}
    >
      <InsideTooltipContext.Provider value={true}>{trigger}</InsideTooltipContext.Provider>
      {presence.mounted && !(escaped && !open) ? <TooltipSurface id={id} role={closable ? "note" : "tooltip"} color={color} size={size} className="zen-tooltip--floating" data-placement={placement} data-state={open ? undefined : "closing"} onClose={closable ? hide : undefined}>{content}</TooltipSurface> : null}
    </span>
  );
}

type TriggerHandlers = Pick<HTMLAttributes<HTMLElement>, "onPointerEnter" | "onPointerLeave" | "onPointerDown" | "onFocus" | "onBlur">;

/**
 * Built-in tooltip for icon-only controls (Zen rule: every icon-only action shows its name on hover after 1s, and at once
 * on keyboard focus). No wrapper element: `bind()` merges the pointer/focus handlers into the trigger's own props and
 * `tooltip` portals a fixed-position TooltipSurface (through ZenPortal, so it follows the theme scope). Off when `label`
 * is empty/false or inside an explicit <Tooltip>. The label repeats the accessible name, so it is not aria-describedby.
 */
export function useIconTooltip(label: ReactNode | false | undefined, { placement = "top", delay = TOOLTIP_HOVER_DELAY }: { placement?: "top" | "bottom"; delay?: number } = {}) {
  const inside = useContext(InsideTooltipContext);
  const enabled = !inside && label !== false && label !== undefined && label !== null && label !== "";
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const clear = () => window.clearTimeout(timer.current);
  const open = (el: HTMLElement, wait: number) => { clear(); if (wait <= 0) setAnchor(el); else timer.current = window.setTimeout(() => setAnchor(el), wait); };
  const close = () => { clear(); setAnchor((was) => { if (was) lastTooltipClosedAt = Date.now(); return null; }); };
  // Hiding fades out at XFast from the last anchor (tooltip.css); Escape dismisses at once.
  const presence = usePresence(Boolean(anchor), 80);
  const lastAnchor = useRef<HTMLElement | null>(null);
  if (anchor) lastAnchor.current = anchor;
  const [escaped, setEscaped] = useState(false);
  if (anchor && escaped) setEscaped(false);
  useEffect(() => clear, []);
  useEffect(() => {
    if (!anchor) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setEscaped(true); close(); } };
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    return () => { document.removeEventListener("keydown", onKey); window.removeEventListener("scroll", close, true); };
  }, [anchor]);
  const handlers: TriggerHandlers = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => { if (event.pointerType !== "touch") open(event.currentTarget, hoverWait(delay)); },
    onPointerLeave: close,
    onPointerDown: close,
    onFocus: (event: FocusEvent<HTMLElement>) => { if (event.currentTarget.matches(":focus-visible")) open(event.currentTarget, 0); },
    onBlur: close,
  };
  /** Merge the tooltip handlers into the trigger's props (the trigger's own handlers run first). */
  const bind = <P extends object>(props: P = {} as P): P => {
    if (!enabled) return props;
    const own = props as TriggerHandlers, merged = { ...props } as P & TriggerHandlers;
    (Object.keys(handlers) as (keyof TriggerHandlers)[]).forEach((key) => {
      const theirs = own[key] as ((event: never) => void) | undefined, ours = handlers[key] as (event: never) => void;
      merged[key] = ((event: never) => { theirs?.(event); ours(event); }) as never;
    });
    return merged;
  };
  const shown = anchor ?? lastAnchor.current;
  const tooltip = enabled && presence.mounted && shown && !(escaped && !anchor) ? <IconTooltipLayer anchor={shown} placement={placement} closing={!anchor}>{label}</IconTooltipLayer> : null;
  return { bind, tooltip };
}

function IconTooltipLayer({ anchor, placement, closing = false, children }: { anchor: HTMLElement; placement: "top" | "bottom"; closing?: boolean; children: ReactNode }) {
  const layer = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number; side: "top" | "bottom" } | null>(null);
  useLayoutEffect(() => {
    const el = layer.current; if (!el) return;
    const rect = anchor.getBoundingClientRect(), gap = 8, edge = 4;
    const width = el.offsetWidth, height = el.offsetHeight, viewportWidth = document.documentElement.clientWidth;
    let side = placement;
    if (side === "top" && rect.top - height - gap < edge) side = "bottom";
    else if (side === "bottom" && rect.bottom + height + gap > window.innerHeight - edge) side = "top";
    const top = side === "top" ? rect.top - height - gap : rect.bottom + gap;
    const left = Math.min(Math.max(edge, rect.left + rect.width / 2 - width / 2), viewportWidth - width - edge);
    setPosition({ top, left, side });
  }, [anchor, placement]);
  return (
    <ZenPortal>
      <span ref={layer} className="zen-tooltip-layer" data-placement={position?.side} data-state={closing ? "closing" : undefined} style={position ? { top: position.top, left: position.left } : { top: 0, left: 0, visibility: "hidden" }}>
        <TooltipSurface role="tooltip">{children}</TooltipSurface>
      </span>
    </ZenPortal>
  );
}

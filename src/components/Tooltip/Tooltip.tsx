import { cloneElement, createContext, isValidElement, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type HTMLAttributes, type PointerEvent, type ReactElement, type ReactNode } from "react";
import { ZenPortal } from "../Portal";
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
}

/** Figma Tooltip (1595:2220): Color × Size bubble with the Simple-Label primitive (Caption/Medium). */
export function TooltipSurface({ color = "default", size: sizeProp = "md", className, children, ...props }: TooltipSurfaceProps) {
  const size = scaleKey(sizeProp, tooltipSizes);
  return (
    <span {...props} className={["zen-tooltip", className].filter(Boolean).join(" ")} data-color={color} data-size={size}>
      <span className={`zen-tooltip__label ${typographyStyles["Caption/Medium"]}`}>{children}</span>
    </span>
  );
}

export interface TooltipProps {
  /** Tooltip text. Keep it short and non-interactive; use Popover for rich content. */
  content: ReactNode;
  /** A single focusable element (Button, IconButton, link…). It receives aria-describedby. */
  children: ReactElement;
  color?: TooltipColor;
  /** Short (sm, md…) or Figma (small, medium…) spelling. */
  size?: TooltipSize;
  placement?: TooltipPlacement;
  /** Hover delay in ms before showing (focus shows immediately). Zen rule: 1s (`TOOLTIP_HOVER_DELAY`). */
  delay?: number;
  /** Controlled visibility; omit for hover/focus behavior. */
  open?: boolean;
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
export function Tooltip({ content, children, color = "default", size: sizeProp = "md", placement = "top", delay = TOOLTIP_HOVER_DELAY, open: controlledOpen, disabled = false, className }: TooltipProps) {
  const size = scaleKey(sizeProp, tooltipSizes);
  const id = `zen-tooltip-${useId().replace(/:/g, "")}`;
  const [internalOpen, setInternalOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const open = !disabled && (controlledOpen ?? internalOpen);
  const clear = () => window.clearTimeout(timer.current);
  const show = (wait: number) => { clear(); if (wait <= 0) setInternalOpen(true); else timer.current = window.setTimeout(() => setInternalOpen(true), wait); };
  const hide = () => { clear(); setInternalOpen((was) => { if (was) lastTooltipClosedAt = Date.now(); return false; }); };
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
  const trigger = isValidElement<{ "aria-describedby"?: string }>(children)
    ? cloneElement(children, { "aria-describedby": [children.props["aria-describedby"], open ? id : undefined].filter(Boolean).join(" ") || undefined })
    : children;
  return (
    <span
      className={["zen-tooltip-anchor", className].filter(Boolean).join(" ")}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") show(hoverWait(delay)); }}
      onPointerLeave={hide}
      onFocus={(event) => { if ((event.target as HTMLElement).matches(":focus-visible")) show(0); }}
      onBlur={hide}
      onPointerDown={hide}
    >
      <InsideTooltipContext.Provider value={true}>{trigger}</InsideTooltipContext.Provider>
      {presence.mounted && !(escaped && !open) ? <TooltipSurface id={id} role="tooltip" color={color} size={size} className="zen-tooltip--floating" data-placement={placement} data-state={open ? undefined : "closing"}>{content}</TooltipSurface> : null}
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

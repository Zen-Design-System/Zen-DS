import { cloneElement, isValidElement, useEffect, useId, useRef, useState, type HTMLAttributes, type ReactElement, type ReactNode } from "react";
import { typographyStyles } from "../../tokens/typography.generated";
import "./tooltip.css";

export const tooltipColors = ["default", "accent", "white-overlay", "black-overlay"] as const;
export const tooltipSizes = ["medium", "small"] as const;
export const tooltipPlacements = ["top", "bottom", "left", "right"] as const;
export type TooltipColor = (typeof tooltipColors)[number];
export type TooltipSize = (typeof tooltipSizes)[number];
export type TooltipPlacement = (typeof tooltipPlacements)[number];

export interface TooltipSurfaceProps extends HTMLAttributes<HTMLSpanElement> {
  color?: TooltipColor;
  size?: TooltipSize;
  children: ReactNode;
}

/** Figma Tooltip (1595:2220): Color × Size bubble with the Simple-Label primitive (Caption/Medium). */
export function TooltipSurface({ color = "default", size = "medium", className, children, ...props }: TooltipSurfaceProps) {
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
  size?: TooltipSize;
  placement?: TooltipPlacement;
  /** Hover delay in ms before showing (focus shows immediately). */
  delay?: number;
  /** Controlled visibility; omit for hover/focus behavior. */
  open?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Shows a TooltipSurface next to its trigger on hover (after `delay`) and keyboard focus; Escape dismisses. */
export function Tooltip({ content, children, color = "default", size = "medium", placement = "top", delay = 400, open: controlledOpen, disabled = false, className }: TooltipProps) {
  const id = `zen-tooltip-${useId().replace(/:/g, "")}`;
  const [internalOpen, setInternalOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const open = !disabled && (controlledOpen ?? internalOpen);
  const clear = () => window.clearTimeout(timer.current);
  const show = (wait: number) => { clear(); if (wait <= 0) setInternalOpen(true); else timer.current = window.setTimeout(() => setInternalOpen(true), wait); };
  const hide = () => { clear(); setInternalOpen(false); };
  useEffect(() => clear, []);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") hide(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  const trigger = isValidElement<{ "aria-describedby"?: string }>(children)
    ? cloneElement(children, { "aria-describedby": [children.props["aria-describedby"], open ? id : undefined].filter(Boolean).join(" ") || undefined })
    : children;
  return (
    <span
      className={["zen-tooltip-anchor", className].filter(Boolean).join(" ")}
      onPointerEnter={(event) => { if (event.pointerType !== "touch") show(delay); }}
      onPointerLeave={hide}
      onFocus={(event) => { if ((event.target as HTMLElement).matches(":focus-visible")) show(0); }}
      onBlur={hide}
      onPointerDown={hide}
    >
      {trigger}
      {open ? <TooltipSurface id={id} role="tooltip" color={color} size={size} className="zen-tooltip--floating" data-placement={placement}>{content}</TooltipSurface> : null}
    </span>
  );
}

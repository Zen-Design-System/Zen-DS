import { useEffect, useState } from "react";
import { ZenPortal } from "../Portal";
import "../Motion/motion.css";
import { Toast, type ToastProps } from "./Toast";

export interface ToastItem extends Omit<ToastProps, "onClose" | "className"> {
  id: string | number;
  /** Auto-dismiss after this many ms; `null` keeps it until closed. Defaults to the stack's duration (longer with an action). */
  duration?: number | null;
}

export type ToastPlacement = "bottom-center" | "bottom-right" | "top-center" | "top-right";

export interface ToastStackProps {
  toasts: ToastItem[];
  /** Called when a toast times out or its close button is pressed; remove it from `toasts`. */
  onDismiss: (id: ToastItem["id"]) => void;
  placement?: ToastPlacement;
  /** Default auto-dismiss (ms). Toasts with an action get +3s. Timers pause while the stack is hovered or focused. */
  duration?: number;
  /** Most toasts shown at once; older ones are dismissed. */
  max?: number;
  /** Render in place (e.g. inside a demo card) instead of the fixed viewport layer. */
  inline?: boolean;
  /** Accessible name of every toast's close button (a toast's own `closeLabel` wins). Default: the locale's “Dismiss”. */
  closeLabel?: string;
  className?: string;
}

const EXIT_MS = 200;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Toast queue with motion: new toasts rise in (Slow, emphasized), leaving toasts fade/scale out while their row
 * collapses (Base, exit curve) so the stack reflows smoothly. Portals through ZenPortal; aria-live is on each Toast.
 */
export function ToastStack({ toasts, onDismiss, placement = "bottom-center", duration = 5000, max = 3, inline = false, closeLabel, className }: ToastStackProps) {
  // Rendered rows keep their position; a toast removed from `toasts` stays as "closing" for the exit animation.
  const [rows, setRows] = useState<Array<{ item: ToastItem; exiting: boolean }>>(() => toasts.map((item) => ({ item, exiting: false })));
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    setRows((current) => {
      const next = current.map((row) => {
        const live = toasts.find((t) => t.id === row.item.id);
        return live ? { item: live, exiting: false } : { ...row, exiting: true };
      });
      toasts.forEach((t) => { if (!next.some((row) => row.item.id === t.id)) next.push({ item: t, exiting: false }); });
      return next;
    });
    const timer = window.setTimeout(() => setRows((current) => current.filter((row) => toasts.some((t) => t.id === row.item.id))), reducedMotion() ? 0 : EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [toasts]);

  // Enforce max: the oldest overflow toasts are dismissed.
  useEffect(() => { if (toasts.length > max) toasts.slice(0, toasts.length - max).forEach((t) => onDismiss(t.id)); }, [toasts, max, onDismiss]);

  // Auto-dismiss timers (paused while hovered/focused).
  useEffect(() => {
    if (paused) return undefined;
    const timers = toasts.map((t) => {
      const ms = t.duration === null ? null : t.duration ?? (t.action ? duration + 3000 : duration);
      return ms === null ? 0 : window.setTimeout(() => onDismiss(t.id), ms);
    });
    return () => timers.forEach((id) => id && window.clearTimeout(id));
  }, [toasts, paused, duration, onDismiss]);

  const stack = (
    <div
      className={["zen-toast-stack", className].filter(Boolean).join(" ")}
      data-placement={placement}
      data-inline={inline ? "true" : undefined}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}
    >
      {rows.map(({ item, exiting }) => {
        const { id, duration: _duration, ...props } = item;
        return (
          <div key={id} className="zen-toast-stack__item" data-state={exiting ? "closing" : "open"} inert={exiting} aria-hidden={exiting || undefined}>
            <div className="zen-toast-stack__clip"><Toast {...props} closeLabel={props.closeLabel ?? closeLabel} onClose={() => onDismiss(id)} /></div>
          </div>
        );
      })}
    </div>
  );
  return inline ? stack : <ZenPortal>{stack}</ZenPortal>;
}

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePortalContainer } from "../Portal";
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
  /** Called when a toast times out, its close button is pressed or its action runs (unless `action.keepOpen`); remove it
   *  from `toasts`. It may be called again for an id already removed (an action that dismisses itself): ignore that. */
  onDismiss: (id: ToastItem["id"]) => void;
  placement?: ToastPlacement;
  /** Default auto-dismiss (ms). Toasts with an action get +3s. Each toast counts down from when it appears; timers
   *  pause while the stack is hovered or focused. */
  duration?: number;
  /** Most toasts shown at once; older ones are dismissed. */
  max?: number;
  /** Render in place (e.g. inside a demo card) instead of the fixed viewport layer. */
  inline?: boolean;
  /** Accessible name of every toast's close button (a toast's own `closeLabel` wins). Default: the locale's “Dismiss”. */
  closeLabel?: string;
  className?: string;
}

/** Drops a closed row if its exit animation never reports its end (a hidden tab); the exit itself is Fast + Base. */
const EXIT_FALLBACK_MS = 600;
const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** How many stacks use each fixed layer; the last one out removes it. */
const layerUsers = new WeakMap<HTMLElement, number>();

/**
 * The fixed layer for one placement in one portal container, shared by every ToastStack portalled there: sibling
 * ZenProviders each host their own queue, and their toasts must stack, not overlap.
 */
function useToastLayer(container: HTMLElement | null, placement: ToastPlacement) {
  const [layer, setLayer] = useState<HTMLElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (!container) return undefined;
    let node = Array.from(container.children).find((child): child is HTMLElement =>
      child instanceof HTMLElement && child.classList.contains("zen-toast-layer") && child.dataset.placement === placement) ?? null;
    if (!node) {
      node = document.createElement("div");
      node.className = "zen-toast-layer";
      node.dataset.placement = placement;
      container.appendChild(node);
    }
    const current = node;
    layerUsers.set(current, (layerUsers.get(current) ?? 0) + 1);
    setLayer(current);
    return () => {
      const users = (layerUsers.get(current) ?? 1) - 1;
      layerUsers.set(current, users);
      if (users <= 0) current.remove();
    };
  }, [container, placement]);
  return layer;
}

/**
 * Toast queue with motion: a new toast rises in from the screen edge while its row opens (Slow, emphasized); a leaving
 * toast fades and shrinks in place (Fast), then its row closes (Base) so the others slide over. Fixed stacks portal into
 * a shared layer in the ZenPortal container; aria-live is on each Toast.
 */
export function ToastStack({ toasts, onDismiss, placement = "bottom-center", duration = 5000, max = 3, inline = false, closeLabel, className }: ToastStackProps) {
  // Rendered rows keep their position; a toast removed from `toasts` stays as "closing" until its exit animation ends.
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
    const timer = window.setTimeout(() => setRows((current) => current.filter((row) => toasts.some((t) => t.id === row.item.id))), EXIT_FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [toasts]);
  const removeRow = (id: ToastItem["id"]) => setRows((current) => current.filter((row) => !(row.exiting && row.item.id === id)));

  // Enforce max: the oldest overflow toasts are dismissed.
  useEffect(() => { if (toasts.length > max) toasts.slice(0, toasts.length - max).forEach((t) => onDismiss(t.id)); }, [toasts, max, onDismiss]);

  // Auto-dismiss: each toast counts down from when it appears, so a new or closed toast never restarts the others and
  // they leave one by one. Hover/focus pauses them all; they resume with the time they had left. A toast replaced under
  // the same id (a new item) starts over.
  const clocks = useRef(new Map<ToastItem["id"], { item: ToastItem; left: number }>());
  useEffect(() => {
    const live = new Map<ToastItem["id"], { item: ToastItem; left: number }>();
    toasts.forEach((t) => {
      const ms = t.duration === null ? null : t.duration ?? (t.action ? duration + 3000 : duration);
      if (ms === null) return;
      const clock = clocks.current.get(t.id);
      live.set(t.id, clock && clock.item === t ? clock : { item: t, left: ms });
    });
    clocks.current = live;
    if (paused) return undefined;
    const start = Date.now();
    const timers = Array.from(live.values(), (clock) => window.setTimeout(() => onDismiss(clock.item.id), clock.left));
    return () => {
      const elapsed = Date.now() - start;
      live.forEach((clock) => { clock.left = Math.max(0, clock.left - elapsed); });
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [toasts, paused, duration, onDismiss]);

  const container = usePortalContainer();
  const layer = useToastLayer(inline ? null : container, placement);

  const stack = (
    <div
      className={["zen-toast-stack", className].filter(Boolean).join(" ")}
      data-placement={placement}
      data-inline={inline ? "true" : undefined}
      data-empty={rows.length ? undefined : "true"}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false); }}
    >
      {rows.map(({ item, exiting }) => {
        const { id, duration: _duration, ...props } = item;
        return (
          <div key={id} className="zen-toast-stack__item" data-state={exiting ? "closing" : "open"} inert={exiting} aria-hidden={exiting || undefined}
            onAnimationEnd={(event) => {
              if (!exiting) return;
              // The row's collapse ends the exit; with reduced motion the row does not animate, so the toast's fade does.
              const row = event.currentTarget;
              if (event.animationName === "zen-toast-row-out" ? event.target === row : event.animationName === "zen-toast-out" && getComputedStyle(row).animationName === "none") removeRow(id);
            }}>
            <div className="zen-toast-stack__clip"><Toast {...props} closeLabel={props.closeLabel ?? closeLabel} onClose={() => onDismiss(id)} /></div>
          </div>
        );
      })}
    </div>
  );
  if (inline) return stack;
  return layer ? createPortal(stack, layer) : null;
}

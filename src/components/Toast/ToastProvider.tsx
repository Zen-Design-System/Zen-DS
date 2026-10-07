import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastStack, type ToastItem, type ToastPlacement } from "./ToastStack";

/** Everything a Toast takes (type, title, children, action, duration…); `id` is optional (reuse one to replace a toast). */
export type ToastOptions = Omit<ToastItem, "id"> & { id?: ToastItem["id"] };

export interface ToastApi {
  /** Shows a toast and returns its id. */
  toast: (options: ToastOptions) => ToastItem["id"];
  dismiss: (id: ToastItem["id"]) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export interface ToastProviderProps {
  placement?: ToastPlacement;
  /** Default auto-dismiss in ms (toasts with an action get +3s). */
  duration?: number;
  /** Most toasts on screen at once. */
  max?: number;
  children?: ReactNode;
}

/**
 * Owns the toast queue and renders one ToastStack. ZenProvider already includes it (outermost provider), so apps
 * only call useToast(); render ToastProvider yourself only outside a ZenProvider.
 */
export function ToastProvider({ placement, duration, max, children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // The stack (a fixed layer in the portal) mounts with the first toast, so idle providers add nothing to the DOM.
  const [used, setUsed] = useState(false);
  const counter = useRef(0);
  // Stable callbacks: calling toast() or dismiss() never re-renders consumers or resets the running timers.
  const dismiss = useCallback((id: ToastItem["id"]) => setToasts((list) => list.filter((item) => item.id !== id)), []);
  const dismissAll = useCallback(() => setToasts([]), []);
  const toast = useCallback((options: ToastOptions) => {
    counter.current += 1;
    const id = options.id ?? `zen-toast-${counter.current}`;
    setUsed(true);
    setToasts((list) => [...list.filter((item) => item.id !== id), { ...options, id }]);
    return id;
  }, []);
  const api = useMemo<ToastApi>(() => ({ toast, dismiss, dismissAll }), [toast, dismiss, dismissAll]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      {used ? <ToastStack toasts={toasts} onDismiss={dismiss} placement={placement} duration={duration} max={max} /> : null}
    </ToastContext.Provider>
  );
}

/**
 * Show feedback after an action:
 *
 *   const { toast } = useToast();
 *   toast({ type: "positive", title: "Invite sent" });
 *
 * Needs a ZenProvider (or ToastProvider) above the component.
 */
export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast() needs a <ZenProvider> (or <ToastProvider>) above this component.");
  return api;
}

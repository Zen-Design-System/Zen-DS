import { useCallback, useRef } from "react";

/**
 * Open state shared by the overlays (Dialog, ModalForm, SidePanel, BottomSheet). `open` + `onOpenChange` is the API;
 * `onClose` (MUI, Headless UI) and `isOpen` (Chakra, React Aria) are accepted too, because agents guess them.
 */
export interface OverlayOpenProps {
  /**
   * Whether the overlay is shown: keep it in state and set it from `onOpenChange` (the exit animation then plays).
   * Without `open` the overlay shows while it is mounted, e.g. `{show && <Dialog … />}`.
   */
  open?: boolean;
  /** @deprecated Use open (same meaning). */
  isOpen?: boolean;
  /** Called with false on Escape, a scrim click, the close button, or an action without its own handler. */
  onOpenChange?: (open: boolean) => void;
  /** Called at the same moments as `onOpenChange(false)`: the overlay asks to close. */
  onClose?: () => void;
}

/**
 * Resolves the aliases to the shown state and one stable `setOpen` that notifies `onOpenChange` and `onClose`.
 * Stable on purpose: the focus trap depends on it, and a new inline handler on every parent render must not re-run it.
 */
export function useOverlayOpen({ open, isOpen, onOpenChange, onClose }: OverlayOpenProps): [boolean, (open: boolean) => void] {
  const handlers = useRef({ onOpenChange, onClose });
  handlers.current = { onOpenChange, onClose };
  const setOpen = useCallback((next: boolean) => {
    handlers.current.onOpenChange?.(next);
    if (!next) handlers.current.onClose?.();
  }, []);
  return [open ?? isOpen ?? true, setOpen];
}

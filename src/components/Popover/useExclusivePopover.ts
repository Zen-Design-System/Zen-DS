import { useEffect, useRef, type RefObject } from "react";

/**
 * One popover at a time: opening a popover for one object closes any popover that is open for another object
 * (Popover, DatePicker and any custom popup that calls this hook). A popover opened from inside another one — its
 * trigger or its own surface sits within the open popover — is nested, so the parent stays open.
 * Only closable popovers take part: pass the close callback; always-open previews (no close) are ignored.
 */
type OpenPopover = { close: () => void; root: () => HTMLElement | null };
const openPopovers = new Set<OpenPopover>();

export function useExclusivePopover(open: boolean, close: (() => void) | undefined, rootRef: RefObject<HTMLElement | null>, anchorRef?: RefObject<HTMLElement | null>) {
  const closeRef = useRef(close);
  closeRef.current = close;
  const closable = Boolean(close);
  useEffect(() => {
    if (!open || !closable) return undefined;
    const self: OpenPopover = { close: () => closeRef.current?.(), root: () => rootRef.current };
    const mine = [anchorRef?.current, rootRef.current].filter((node): node is HTMLElement => Boolean(node));
    for (const other of [...openPopovers]) {
      const otherRoot = other.root();
      // Nested: this popover's trigger or surface lives inside the other popover — keep the parent open.
      if (otherRoot && mine.some((node) => otherRoot.contains(node))) continue;
      other.close();
      openPopovers.delete(other);
    }
    openPopovers.add(self);
    return () => { openPopovers.delete(self); };
  }, [open, closable, rootRef, anchorRef]);
}

import { createContext, useContext, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Where overlays (Modal/Dialog, Modal Form, Side Panel, tooltips, the Table editor layer) are portalled.
 * Token modes live on data-* attributes (data-theme, data-component-theme, data-density, data-radius…), so an
 * overlay only follows light/dark and the other modes when it is mounted inside the element that carries them.
 * Apps that set the modes on <html> need nothing; apps that set them on an inner element render
 * <ZenPortalProvider container={el}> with an element inside that scope.
 */
const PortalContext = createContext<HTMLElement | null>(null);

export function ZenPortalProvider({ container, children }: { container: HTMLElement | null; children: ReactNode }) {
  return <PortalContext.Provider value={container}>{children}</PortalContext.Provider>;
}

/** The provided container, else document.body (null during SSR). */
export function usePortalContainer(): HTMLElement | null {
  const container = useContext(PortalContext);
  return container ?? (typeof document === "undefined" ? null : document.body);
}

/** createPortal into the Zen portal container. */
export function ZenPortal({ children }: { children: ReactNode }) {
  const container = usePortalContainer();
  return container ? createPortal(children, container) : null;
}

import { createContext, useContext, useState, type HTMLAttributes, type ReactNode } from "react";
import { ZenPortalProvider } from "../../../../components/Portal";

/*
 * The builder page runtime (spec docs/research/studio-builder-pages-spec-2026-10-06.md §2, §3 2d): what
 * `@zen-ds/react/builder` names in a page. Board holds Screens and Overlays (the board lays them out as frames);
 * Screen renders its content in the device's modes (a phone: Comfortable density, Mobile typography and breakpoint, as
 * PlatformPhone); Overlay renders its overlay open inside its own frame (its portal stays in the frame). `proto` handlers
 * call the actions of the nearest ProtoContext: inert while designing (Select), live in Play (M3).
 */

export type PageDevice = "phone" | "tablet" | "desktop";
/** Width of a device frame (CSS px). */
export const DEVICE_WIDTH: Readonly<Record<PageDevice, number>> = { phone: 390, tablet: 768, desktop: 1440 };

export type ProtoActions = {
  navigate: (screen: string) => void;
  open: (overlay: string) => void;
  close: () => void;
  back: () => void;
  toast: (options: unknown) => void;
  link: (url: string) => void;
};
const inert: ProtoActions = { navigate: () => undefined, open: () => undefined, close: () => undefined, back: () => undefined, toast: () => undefined, link: () => undefined };
export const ProtoContext = createContext<ProtoActions>(inert);

/** A page's `proto.<action>(…args)`: the handler a prop receives (it runs the context's action when called). */
export function protoHandler(actions: ProtoActions, action: string, args: unknown[]): () => void {
  return () => {
    const run = (actions as Record<string, (...rest: unknown[]) => void>)[action];
    run?.(...args);
  };
}

/** Builder props that are not DOM attributes (the board reads them; they must not reach the element). */
type ScreenProps = HTMLAttributes<HTMLDivElement> & { id?: string; title?: string; device?: PageDevice; state?: string; children?: ReactNode };

export function Screen({ id, title, device = "desktop", state, children, ...rest }: ScreenProps) {
  const phone = device === "phone";
  return (
    <div
      {...rest}
      className="studio-builder-screen"
      data-screen={id}
      data-screen-state={state}
      data-device={device}
      data-breakpoint={device === "desktop" ? undefined : device === "phone" ? "mobile" : "tablet"}
      data-density={phone ? "comfortable" : undefined}
      data-typography={phone ? "mobile" : undefined}
      aria-label={title}
    >
      {children}
    </div>
  );
}

/** An overlay drawn open in its own frame: its portal is a node inside the frame, not the page's. */
export function Overlay({ id, children, ...rest }: HTMLAttributes<HTMLDivElement> & { id?: string; children?: ReactNode }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    // The frame is the overlay's device frame (data-zen-overlay-root): a Dialog opens contained, its scrim fills this frame
    // only (the world's transform would otherwise make its fixed scrim cover the whole board).
    <div {...rest} className="studio-builder-overlay" data-overlay={id} data-zen-overlay-root="">
      <div ref={setHost} className="studio-builder-overlay__portal" />
      {host ? <ZenPortalProvider container={host}>{children}</ZenPortalProvider> : null}
    </div>
  );
}

/** The page root: the board lays its children out; rendered alone it shows them in a column. */
export function Board({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export const useProto = () => useContext(ProtoContext);

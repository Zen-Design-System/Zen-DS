import { createContext, useContext, useState, type CSSProperties, type HTMLAttributes, type ReactNode } from "react";
import { ZenPortalProvider } from "../../../../components/Portal";
import { DeviceBars, SAFE_AREAS, type DeviceOs } from "./DeviceBars";

/*
 * The builder page runtime (spec docs/research/studio-builder-pages-spec-2026-10-06.md §2, §3 2d): what
 * `@zen/design-system/builder` names in a page. Board holds Screens and Overlays (the board lays them out as frames);
 * Screen renders its content in the device's modes (a phone: Comfortable density, Mobile typography and breakpoint, as
 * PlatformPhone); Overlay renders its overlay open inside its own frame (its portal stays in the frame). `proto` handlers
 * call the actions of the nearest ProtoContext: inert while designing (Select), live in Play (M3).
 */

export type PageDevice = "phone" | "tablet" | "desktop";
/** A Screen's background layer, as AppShell's `canvas`: Canvas/Default, Canvas/Alt (a white page) or Canvas/Flat. */
export type ScreenCanvas = "default" | "alt" | "flat";
/** How a Screen is laid out (tools/studio/dialect.mjs screenLayout): a phone's frame or a desktop's. A tablet picks one. */
export type ScreenLayout = "mobile" | "desktop";
export const screenLayoutOf = (device: PageDevice, layout?: ScreenLayout): ScreenLayout => (device === "phone" ? "mobile" : device === "tablet" ? (layout === "desktop" ? "desktop" : "mobile") : "desktop");
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

/** The page's mobile OS (its header's `os`; user, 2026-10-10: one choice for the page): the status bar and bottom bar its
 *  phone and tablet Screens simulate, and the safe areas they publish. iOS by default. */
export const PageOsContext = createContext<DeviceOs>("ios");
export const pageOsOf = (header: Record<string, unknown> | null | undefined): DeviceOs => (header?.os === "android" ? "android" : "ios");

/** A page's `proto.<action>(…args)`: the handler a prop receives (it runs the context's action when called). */
export function protoHandler(actions: ProtoActions, action: string, args: unknown[]): () => void {
  return () => {
    const run = (actions as Record<string, (...rest: unknown[]) => void>)[action];
    run?.(...args);
  };
}

/** Builder props that are not DOM attributes (the board reads them; they must not reach the element). */
type ScreenProps = HTMLAttributes<HTMLDivElement> & {
  id?: string;
  title?: string;
  device?: PageDevice;
  /** A tablet's layout: a phone's frame (mobile, the default) or a desktop's. */
  layout?: ScreenLayout;
  canvas?: ScreenCanvas;
  state?: string;
  /** The app frame (dialect SCREEN_CHROME): the desktop layout shows `sidebar` and `header`, the mobile layout
   *  `topNavigation` and `bottomNavigation`; the other layout's parts are kept for when the device changes. */
  sidebar?: ReactNode;
  header?: ReactNode;
  topNavigation?: ReactNode;
  bottomNavigation?: ReactNode;
  children?: ReactNode;
};

export function Screen({ id, title, device = "desktop", layout, canvas = "default", state, sidebar, header, topNavigation, bottomNavigation, children, style, ...rest }: ScreenProps) {
  const phone = device === "phone";
  // A phone or tablet shows its OS's bars; the app runs under them and pads by the safe areas (as in PlatformPhone).
  const os = useContext(PageOsContext);
  const bars = device === "desktop" ? null : SAFE_AREAS[os][device];
  const safe = bars ? ({ "--zen-safe-area-top": `${bars.top}px`, "--zen-safe-area-bottom": `${bars.bottom}px` } as CSSProperties) : null;
  const active = screenLayoutOf(device, layout);
  // The sides the content keeps clear itself: a Top / Bottom Navigation (the mobile layout's) pads by the safe area.
  const inset = bars ? [!(active === "mobile" && topNavigation) && "top", !(active === "mobile" && bottomNavigation) && "bottom"].filter(Boolean).join(" ") : "";
  const desktop = active === "desktop";
  const chrome = desktop ? Boolean(sidebar || header) : Boolean(topNavigation || bottomNavigation);
  return (
    <div
      {...rest}
      className="studio-builder-screen"
      data-screen={id}
      data-screen-state={state}
      data-device={device}
      data-layout={active}
      data-chrome={chrome ? "" : undefined}
      data-canvas={canvas === "default" ? undefined : canvas}
      data-breakpoint={device === "desktop" ? undefined : device === "phone" ? "mobile" : "tablet"}
      data-density={phone ? "comfortable" : undefined}
      data-typography={phone ? "mobile" : undefined}
      data-os={bars ? os : undefined}
      data-inset={inset || undefined}
      style={safe ? { ...safe, ...style } : style}
      aria-label={title}
    >
      {!chrome ? children : desktop ? (
        <>
          {sidebar ? <div className="studio-builder-screen__side">{sidebar}</div> : null}
          <div className="studio-builder-screen__main">
            {header ? <div className="studio-builder-screen__header">{header}</div> : null}
            <div className="studio-builder-screen__content">{children}</div>
          </div>
        </>
      ) : (
        <div className="studio-builder-screen__main">
          {topNavigation ? <div className="studio-builder-screen__top">{topNavigation}</div> : null}
          <div className="studio-builder-screen__content">{children}</div>
          {bottomNavigation ? <div className="studio-builder-screen__bottom">{bottomNavigation}</div> : null}
        </div>
      )}
      {/* Last, beside the app (never inside __main, where the Screen's slots are found). */}
      {bars && device !== "desktop" ? <DeviceBars os={os} device={device} /> : null}
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

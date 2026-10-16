import { Children, cloneElement, createContext, isValidElement, useContext, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactElement, type ReactNode, type RefObject } from "react";
import { AppShell } from "../../../../components/AppShell";
import { ZenPortalProvider } from "../../../../components/Portal";
import { DeviceBars, SAFE_AREAS, type DeviceOs } from "./DeviceBars";

/*
 * The builder page runtime (spec docs/research/studio-builder-pages-spec-2026-10-06.md §2, §3 2d): what
 * `@zen-ds/react/builder` names in a page. Board holds Screens and Overlays (the board lays them out as frames);
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

/** What a page's `proto.*` calls do. `options` is the action's own (protoModel.ts ProtoOptions: animation, delay);
 *  `hover`: what runs While hovering triggers, an overlay shown while the pointer stays (Play's; the canvas never opens
 *  one under the pointer). */
export type ProtoActions = {
  navigate: (screen: string, options?: unknown) => void;
  open: (overlay: string, options?: unknown) => void;
  close: () => void;
  back: () => void;
  toast: (options: unknown) => void;
  link: (url: string) => void;
  hover?: { enter: (overlay: string, options?: unknown) => void; leave: () => void };
};
const inert: ProtoActions = { navigate: () => undefined, open: () => undefined, close: () => undefined, back: () => undefined, toast: () => undefined, link: () => undefined };
export const ProtoContext = createContext<ProtoActions>(inert);

/** The page's mobile OS (its header's `os`; user, 2026-10-10: one choice for the page): the status bar and bottom bar its
 *  phone and tablet Screens simulate, and the safe areas they publish. iOS by default. */
export const PageOsContext = createContext<DeviceOs>("ios");
export const pageOsOf = (header: Record<string, unknown> | null | undefined): DeviceOs => (header?.os === "android" ? "android" : "ios");

/** The item a choice control hands its handler, as the key of a per-item action: the value itself, or the item's id. */
const itemKey = (choice: unknown): string => {
  if (choice && typeof choice === "object") { const item = choice as { id?: unknown; value?: unknown }; return String(item.id ?? item.value ?? ""); }
  return String(choice ?? "");
};

/** A page's `proto.<action>(…args)`: the handler a prop receives (it runs the context's action when called). A
 *  navigate / open with one target per item (`proto.navigate({ home: "screen-1" })`) runs for the chosen item's entry. */
export function protoHandler(actions: ProtoActions, action: string, args: unknown[]): (...event: unknown[]) => void {
  return (...event) => {
    const run = (actions as unknown as Record<string, ((...rest: unknown[]) => void) | undefined>)[action];
    const [first] = args;
    if ((action === "navigate" || action === "open") && first && typeof first === "object" && !Array.isArray(first)) {
      const target = (first as Record<string, unknown>)[itemKey(event[0])];
      if (typeof target === "string") run?.(target, args[1]);
      return;
    }
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
  /** The app frame (dialect SCREEN_CHROME). The desktop layout's is the Screen's master layout, one root AppShell
   *  (tools/studio/screen-frame.mjs; `sidebar` and `header` are the props of pages made before it, moved into the
   *  AppShell when the page opens). The mobile layout shows `topNavigation` and `bottomNavigation` and the AppShell's
   *  content without its frame; the other layout's parts are kept for when the device changes. */
  sidebar?: ReactNode;
  header?: ReactNode;
  topNavigation?: ReactNode;
  bottomNavigation?: ReactNode;
  children?: ReactNode;
  /** The frame's place on the board (the canvas reads it from the page, render/framePlace.ts); nothing on the screen. */
  x?: number;
  y?: number;
  /** A drawn Screen's width (the frame takes it, render/frames.ts) and height (the screen's least height). */
  width?: number;
  height?: number;
};

/** The Present / Play page that scrolls this screen (board/board.css .studio-present__scroll); none on the canvas. */
function usePresentScroller(rootRef: RefObject<HTMLDivElement | null>) {
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => { setScroller(rootRef.current?.closest<HTMLElement>(".studio-present__scroll") ?? null); }, [rootRef]);
  // A new object once the scroller is known: TopNavigation reads `scrollRef.current` when it links (its effect runs
  // before this one), so the ref must change to link again.
  return useMemo(() => (scroller ? { current: scroller } : null), [scroller]);
}

/** In Present and Play a Top Navigation with a large title follows the page's scroll, as on iOS (TopNavigation
 *  `scrollRef`): the large title folds under the bar and the bar title fades in. The page's own `scrollRef` or
 *  `collapsed` wins; on the canvas nothing scrolls, so the large title stays open. */
function withScrollLink(topNavigation: ReactNode, scrollRef: RefObject<HTMLElement | null> | null): ReactNode {
  if (!scrollRef || !isValidElement(topNavigation)) return topNavigation;
  const props = topNavigation.props as { largeTitle?: unknown; scrollRef?: unknown; collapsed?: unknown };
  if (props.largeTitle == null || props.largeTitle === "" || props.scrollRef !== undefined || props.collapsed !== undefined) return topNavigation;
  return cloneElement(topNavigation as ReactElement<{ scrollRef?: RefObject<HTMLElement | null> }>, { scrollRef });
}

export function Screen({ id, title, device = "desktop", layout, canvas = "default", state, sidebar, header, topNavigation, bottomNavigation, children, style, x: _x, y: _y, width: _width, height, ...rest }: ScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const presentScroll = usePresentScroller(rootRef);
  const phone = device === "phone";
  // A phone or tablet shows its OS's bars; the app runs under them and pads by the safe areas (as in PlatformPhone).
  const os = useContext(PageOsContext);
  const bars = device === "desktop" ? null : SAFE_AREAS[os][device];
  const safe = bars ? ({ "--zen-safe-area-top": `${bars.top}px`, "--zen-safe-area-bottom": `${bars.bottom}px` } as CSSProperties) : null;
  const drawn = typeof height === "number" ? ({ "--studio-screen-height": `${height}px` } as CSSProperties) : null;
  const active = screenLayoutOf(device, layout);
  // The sides the content keeps clear itself: a Top / Bottom Navigation (the mobile layout's) pads by the safe area.
  const inset = bars ? [!(active === "mobile" && topNavigation) && "top", !(active === "mobile" && bottomNavigation) && "bottom"].filter(Boolean).join(" ") : "";
  const desktop = active === "desktop";
  const chrome = desktop ? Boolean(sidebar || header) : Boolean(topNavigation || bottomNavigation);
  const content = desktop ? children : withoutMasterLayout(children);
  // Present and Play scroll the whole screen in the page: its system bars stay at the edges of the window, as a phone's
  // do (a canvas frame draws them on its own edges).
  const pinBars = Boolean(presentScroll && bars && device !== "desktop" && chrome && !desktop);
  return (
    <div
      {...rest}
      ref={rootRef}
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
      style={safe || drawn ? { ...safe, ...drawn, ...style } : style}
      aria-label={title}
    >
      {!chrome ? content : desktop ? (
        <>
          {sidebar ? <div className="studio-builder-screen__side">{sidebar}</div> : null}
          <div className="studio-builder-screen__main">
            {header ? <div className="studio-builder-screen__header">{header}</div> : null}
            <div className="studio-builder-screen__content">{children}</div>
          </div>
        </>
      ) : (
        <div className="studio-builder-screen__main">
          {pinBars ? <div className="studio-builder-screen__pin" data-edge="top"><DeviceBars os={os} device={device as "phone" | "tablet"} part="status" /></div> : null}
          {topNavigation ? <div className="studio-builder-screen__top">{withScrollLink(topNavigation, presentScroll)}</div> : null}
          <div className="studio-builder-screen__content">{content}</div>
          {bottomNavigation ? <div className="studio-builder-screen__bottom">{bottomNavigation}</div> : null}
          {pinBars ? <div className="studio-builder-screen__pin" data-edge="bottom"><DeviceBars os={os} device={device as "phone" | "tablet"} part="home" /></div> : null}
        </div>
      )}
      {/* Last, beside the app (never inside __main, where the Screen's slots are found; Present and Play pin them there). */}
      {bars && device !== "desktop" && !pinBars ? <DeviceBars os={os} device={device} /> : null}
    </div>
  );
}

/** A Screen's content without its master layout (a lone root AppShell gives its children): the mobile layout's. */
function withoutMasterLayout(children: ReactNode): ReactNode {
  const nodes = Children.toArray(children).filter((child) => !(typeof child === "string" && !child.trim()));
  const [only] = nodes;
  return nodes.length === 1 && isValidElement<{ children?: ReactNode }>(only) && only.type === AppShell ? only.props.children : children;
}

/** An overlay drawn open in its own frame: its portal is a node inside the frame, not the page's. A layer that does not
 *  place itself (a Card, not a Dialog) sits where the Overlay's `position` says, over a dimmed frame with `background`,
 *  as Play shows it; `closeOnOutside` is Play's only. */
export function Overlay({ id, children, x: _x, y: _y, position = "center", background = false, closeOnOutside: _closeOnOutside, ...rest }: HTMLAttributes<HTMLDivElement> & { id?: string; children?: ReactNode; x?: number; y?: number; position?: string; background?: boolean; closeOnOutside?: boolean }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    // The frame is the overlay's device frame (data-zen-overlay-root): a Dialog opens contained, its scrim fills this frame
    // only (the world's transform would otherwise make its fixed scrim cover the whole board).
    <div {...rest} className="studio-builder-overlay" data-overlay={id} data-zen-overlay-root="">
      <div ref={setHost} className="studio-builder-overlay__portal" />
      {host ? (
        <ZenPortalProvider container={host}>
          <div className="studio-builder-overlay__place" data-position={position} data-background={background || undefined}>{children}</div>
        </ZenPortalProvider>
      ) : null}
    </div>
  );
}

/** The page root: the board lays its children out; rendered alone it shows them in a column. */
export function Board({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export const useProto = () => useContext(ProtoContext);

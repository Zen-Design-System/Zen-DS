import { useModeScope, type ZenModes } from "../../../../components/_shared/zen-context";
import { Children, cloneElement, createContext, isValidElement, useContext, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type ReactElement, type ReactNode, type RefObject } from "react";
import { AppShell } from "../../../../components/AppShell";
import { ZenPortalProvider } from "../../../../components/Portal";
import { OverlayPreviewContext } from "../../../../components/_shared/overlay";
import { typographyStyles } from "../../../../tokens/typography.generated";
import { BREAKPOINT_LABELS, deviceOfScreen, deviceOs, screenBreakpoint, type ScreenDevice, type ZenBreakpointKey } from "../../../../../tools/studio/screen-devices.mjs";
import { DeviceBars, duoStatusOf, safeAreasOf, type DeviceOs } from "./DeviceBars";
import type { FilterMatch, PlayChoices } from "./protoModel";
import { evaluate, isProtoValue, type ProtoValue, type VarRef } from "../../../../../tools/studio/proto-vars.mjs";

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
 *  `from`: the element pressed (an overlay at Position Manual opens next to it); `hover`: what runs While hovering
 *  triggers, an overlay shown while the pointer stays (Play's; the canvas never opens one under the pointer). `filter`
 *  and `step` (Filter table, Change step) drive the Screen's Table and Stepper in Play; `filter` takes what the trigger
 *  hands over (a Search's text, the chosen item). `set` and `vars` are Play's prototype variables (W-52 B,
 *  docs/research/studio-prototype-variables-2026-10-31.md): Set variable, and the values a Conditional or an expression
 *  reads when the action runs. */
export type ProtoActions = {
  navigate: (screen: string, options?: unknown) => void;
  open: (overlay: string, options?: unknown, from?: Element | null) => void;
  close: () => void;
  back: () => void;
  toast: (options: unknown) => void;
  link: (url: string) => void;
  filter?: (filter: unknown, choice?: unknown) => void;
  step?: (to: unknown, options?: unknown) => void;
  hover?: { enter: (overlay: string, options?: unknown, from?: Element | null) => void; leave: () => void };
  set?: (name: string, value: unknown) => void;
  vars?: () => Readonly<Record<string, unknown>>;
};
const inert: ProtoActions = { navigate: () => undefined, open: () => undefined, close: () => undefined, back: () => undefined, toast: () => undefined, link: () => undefined };

/** One Filter table filter on a Table: the column it reads (none: every field), the values it keeps, how it compares. */
export type PlayFilter = { column?: string; values: string[]; match: FilterMatch };

/** Play's live state of the shown Screen (Filter table, Change step, its choice controls), by the layer's place: each
 *  filtered Table's filters (one per column and match, all applied: a Search and the filter chips beside it narrow
 *  together), each driven Stepper's step (`stepTargets`: the Steppers a Change step drives, which Play then holds), and
 *  what its controls hold (W-52 A, docs/research/studio-play-live-controls-2026-10-30.md): a Switch's checked, a
 *  Segmented's value, typed text, by the control's place; a choice group's pick (`choices`) by the group's. */
export type PlayLive = {
  filters: ReadonlyMap<string, ReadonlyMap<string, PlayFilter>>;
  steps: ReadonlyMap<string, number>;
  stepTargets: ReadonlySet<string>;
  onStep: (loc: string, index: number) => void;
  controls: ReadonlyMap<string, unknown>;
  choices: PlayChoices;
  onControl: (loc: string, value: unknown) => void;
};

/** The element a handler's event was pressed on (a React or DOM event's current target), or null (a value). */
export const eventElement = (event: unknown): Element | null => {
  if (typeof Element === "undefined" || !event || typeof event !== "object") return null;
  const { currentTarget, target } = event as { currentTarget?: unknown; target?: unknown };
  return currentTarget instanceof Element ? currentTarget : target instanceof Element ? target : null;
};
export const ProtoContext = createContext<ProtoActions>(inert);

/** The page's mobile OS (its header's `os`; user, 2026-10-10: one choice for the page): the status bar and bottom bar its
 *  phone and tablet Screens simulate, and the safe areas they publish. iOS by default. */
export const PageOsContext = createContext<DeviceOs>("ios");
export const pageOsOf = (header: Record<string, unknown> | null | undefined): DeviceOs => (header?.os === "android" ? "android" : "ios");

/** The device Present and Play preview a Screen on (user, 2026-10-18: a device simulator): the Screen takes its device
 *  type and layout, its bars and safe areas, and its height. `null` (the canvas, a typed size): the Screen's own. */
export const SimulatedDeviceContext = createContext<ScreenDevice | null>(null);

/** The phone parts a Screen can be given from the canvas (its dashed placeholders): the root AppShell's prop, else the
 *  Screen's own. */
export type ScreenPart = "topNavigation" | "bottomNavigation";

/**
 * What only the Studio's canvas gives a Screen (docs/research/studio-responsive-breakpoints-2026-10-26.md §3.6): on the
 * mobile breakpoint, a Screen without a Top or Bottom Navigation shows a dashed placeholder whose click adds one
 * (`addPart`); `child` names the Screens that take no Bottom Navigation (a child screen: Back, two crumbs or more;
 * component-usage-rules §17). Given to the Screen being worked on (selected, or viewed on another breakpoint); null on
 * the rest of the board, in Present, Play, the exports and for viewers: no placeholders there.
 */
export type ScreenCanvasEdit = { addPart: (screen: string, part: ScreenPart, layout: ScreenLayout) => void; child: (screen: string) => boolean };
export const ScreenCanvasContext = createContext<ScreenCanvasEdit | null>(null);

/** A real phone's browser (Open on phone, device/DevicePlay.tsx): no simulated bars, the phone's own safe areas
 *  (viewport-fit=cover) and the window's height. */
export const RealDeviceContext = createContext(false);
const REAL_SAFE_AREAS = { "--zen-safe-area-top": "env(safe-area-inset-top, 0px)", "--zen-safe-area-bottom": "env(safe-area-inset-bottom, 0px)" } as CSSProperties;
const REAL_HEIGHT = { "--studio-screen-height": "100dvh" } as CSSProperties;

/** The item a choice control hands its handler, as the key of a per-item action: the value itself, or the item's id. */
const itemKey = (choice: unknown): string => {
  if (choice && typeof choice === "object") { const item = choice as { id?: unknown; value?: unknown }; return String(item.id ?? item.value ?? ""); }
  return String(choice ?? "");
};

/** A page's `proto.<action>(…args)`: the handler a prop receives (it runs the context's action when called). A
 *  navigate / open with one target per item (`proto.navigate({ home: "screen-1" })`) runs for the chosen item's entry;
 *  open names the element pressed, filter hands over what the trigger did (its first argument). Several actions
 *  (`proto.run`) run in order, each with what the trigger handed over; a Conditional (`proto.if`) runs one branch by the
 *  variables at that moment, so an earlier Set variable of the same press counts; Set variable works out its value then. */
export function protoHandler(actions: ProtoActions, action: string, args: unknown[]): (...event: unknown[]) => void {
  const nested = (value: unknown) => (isProtoValue(value) ? protoHandler(actions, (value as ProtoValue).action, (value as ProtoValue).args) : null);
  const now = (operand: unknown) => evaluate(operand, (ref: VarRef) => (ref.root === "vars" ? actions.vars?.()[ref.path[0]] : undefined));
  if (action === "run") {
    const steps = args.map(nested);
    return (...event) => { for (const step of steps) step?.(...event); };
  }
  if (action === "if") {
    const [condition, then, otherwise] = args;
    const yes = nested(then);
    const no = nested(otherwise);
    return (...event) => (now(condition) ? yes : no)?.(...event);
  }
  if (action === "set") {
    const [name, value] = args;
    return () => { if (typeof name === "string") actions.set?.(name, now(value)); };
  }
  return (...event) => {
    const run = (actions as unknown as Record<string, ((...rest: unknown[]) => void) | undefined>)[action];
    const [first] = args;
    if ((action === "navigate" || action === "open") && first && typeof first === "object" && !Array.isArray(first)) {
      const target = (first as Record<string, unknown>)[itemKey(event[0])];
      if (typeof target === "string") run?.(target, args[1], eventElement(event[0]));
      return;
    }
    if (action === "open") run?.(first, args[1], eventElement(event[0]));
    else if (action === "filter") run?.(first, event[0]);
    else run?.(...args);
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
  /** The Screen's own variable modes (Figma's Change variable mode on a frame; Studio Variables v2): they win over the
   *  device's (a phone's Comfortable and Mobile typography), and the components inside read them as their context. */
  modes?: ZenModes;
  /** The frame's place on the board (the canvas reads it from the page, render/framePlace.ts); nothing on the screen. */
  x?: number;
  y?: number;
  /** A drawn Screen's width (the frame takes it, render/frames.ts) and height (the screen's least height). */
  width?: number;
  height?: number;
  /** "Make a separate Screen" (§5): the id of the Screen this one is the phone or tablet version of. Play, Present and
   *  Open on phone show it in place of that Screen at its breakpoint (builder/screenViews.ts); nothing on the screen. */
  versionOf?: string;
};

/** The widths desktop Screens render at, from one observer for all of them (a page holds many Screens). */
const widthListeners = new Map<Element, (width: number) => void>();
let widthObserver: ResizeObserver | null = null;
function observeWidth(element: Element, listener: (width: number) => void) {
  if (typeof ResizeObserver === "undefined") return () => undefined;
  widthObserver ??= new ResizeObserver((entries) => {
    for (const entry of entries) widthListeners.get(entry.target)?.((entry.target as HTMLElement).offsetWidth);
  });
  widthListeners.set(element, listener);
  widthObserver.observe(element);
  return () => { widthListeners.delete(element); widthObserver?.unobserve(element); };
}

/** The width a desktop Screen renders at (CSS px, transforms aside): a Present viewport, a phone's window or a frame
 *  narrower than the Screen's own width; null before it is laid out, or when `on` is false. */
function useRenderedWidth(rootRef: RefObject<HTMLDivElement | null>, on: boolean) {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!on || !root) { setWidth(null); return undefined; }
    const take = (next: number) => setWidth((last) => (next > 0 && next !== last ? next : last));
    take(root.offsetWidth);
    return observeWidth(root, take);
  }, [on, rootRef]);
  return on ? width : null;
}

/** What scrolls this screen in Present / Play (inside board/board.css .studio-present__scroll; none on the canvas): the
 *  nearest ancestor that scrolls its overflow (the example stage), else the present page itself. Linking the page while
 *  the stage scrolled left a large title open over the content (the user 2026-10-16, the Expenses phone screen). */
function usePresentScroller(rootRef: RefObject<HTMLDivElement | null>) {
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  // After every render, not once: a device viewport (Present, Play) is measured after its first render, so the box that
  // scrolls changes from the window's layer to the fixed viewport once the Screen is already mounted.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const present = root?.closest<HTMLElement>(".studio-present__scroll") ?? null;
    let node = present ? root?.parentElement ?? null : null;
    while (node && node !== present && !/(auto|scroll)/.test(getComputedStyle(node).overflowY)) node = node.parentElement;
    const next = present ? node ?? present : null;
    setScroller((last) => (last === next ? last : next));
  });
  // A new object once the scroller is known: TopNavigation reads `scrollRef.current` when it links (its effect runs
  // before this one), so the ref must change to link again.
  return useMemo(() => (scroller ? { current: scroller } : null), [scroller]);
}

/** An absolute layer pinned to the bottom or the centre: it moves with the height of what holds it. */
const MOVES_WITH_HEIGHT = '[data-position="absolute"]:is([data-constraint-y="bottom"], [data-constraint-y="center"], [data-constraint-y="top-bottom"])';

/** In Present and Play a Screen is as tall as what it draws. A layer placed absolutely (Figma's Ignore auto layout) that
 *  reaches below the Screen's foot, or a list overflowing such a layer, scrolls the page but does not grow the Screen;
 *  the sticky bars inside it (Top and Bottom Navigation, the pinned system bars) then stopped at its foot, and the Bottom
 *  Navigation rose into the page while the rest scrolled on below it (user 2026-10-28). The Screen's min-height takes
 *  the lowest edge of its absolute layers (--studio-screen-overflow, builder.css), measured again when the Screen
 *  resizes or its layers change. Nothing on the canvas, where a frame clips at its height as Figma's does. */
function useAbsoluteOverflow(rootRef: RefObject<HTMLDivElement | null>, on: boolean) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!on || !root) return undefined;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const box = root.getBoundingClientRect();
      // A scaled device (Play's fit) scales the rects, not the CSS px.
      const scale = root.offsetHeight ? box.height / root.offsetHeight : 1;
      let lowest = 0;
      for (const layer of root.querySelectorAll<HTMLElement>('[data-position="absolute"]')) {
        // A layer pinned to the bottom or the centre (or one inside such a layer) moves with the Screen's height: it
        // would grow the Screen that moves it again.
        if (layer.closest(MOVES_WITH_HEIGHT)) continue;
        // What overflows a layer that clips (Clip content) does not show: only its own box counts then.
        const reach = getComputedStyle(layer).overflowY === "visible" ? layer.scrollHeight : layer.offsetHeight;
        lowest = Math.max(lowest, (layer.getBoundingClientRect().top - box.top) / (scale || 1) + reach);
      }
      if (lowest > 0) root.style.setProperty("--studio-screen-overflow", `${Math.ceil(lowest)}px`);
      else root.style.removeProperty("--studio-screen-overflow");
    };
    const later = () => { if (!frame) frame = requestAnimationFrame(measure); };
    measure();
    const resize = new ResizeObserver(later);
    resize.observe(root);
    // Rows added to a list in an absolute layer change its overflow, not its size: watch the tree, not the attributes
    // (a large title's scroll link writes its style on every scroll).
    const tree = new MutationObserver(later);
    tree.observe(root, { childList: true, subtree: true, characterData: true });
    // A picture that loads late grows its layer (load does not bubble: caught on the way down).
    root.addEventListener("load", later, true);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      tree.disconnect();
      root.removeEventListener("load", later, true);
      root.style.removeProperty("--studio-screen-overflow");
    };
  }, [on, rootRef]);
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

export function Screen({ id, title, device: drawnDevice = "desktop", layout, canvas = "default", state, sidebar, header, topNavigation, bottomNavigation, children, style, x: _x, y: _y, width, height, modes, versionOf: _versionOf, ...rest }: ScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const presentScroll = usePresentScroller(rootRef);
  useAbsoluteOverflow(rootRef, Boolean(presentScroll));
  // The hardware: the device Present or Play simulates (the canvas's view switch too), else the one the Screen is drawn
  // for (its size, its type's own).
  const simulated = useContext(SimulatedDeviceContext);
  const os = useContext(PageOsContext);
  const own = deviceOfScreen(drawnDevice, layout, width, height, os);
  const hardware = simulated ?? own;
  const device: PageDevice = simulated?.device ?? drawnDevice;
  const phone = device === "phone";
  // The breakpoint (docs/research/studio-responsive-breakpoints-2026-10-26.md §2): a phone's mobile, a tablet's tablet, a
  // desktop Screen (a web page) its width's: the simulated device's or its own on the first render, then the width it
  // renders at (a typed or dragged Present viewport, a phone's window). It is the Screen's mode for the components inside
  // (useZen().breakpoint, the [data-breakpoint] tokens); the Screen's own `modes` win.
  const rendered = useRenderedWidth(rootRef, device === "desktop");
  const breakpoint: ZenBreakpointKey = screenBreakpoint(device, rendered ?? simulated?.width ?? width ?? DEVICE_WIDTH[device]);
  const scope = useModeScope(modes?.breakpoint ? modes : { ...modes, breakpoint });
  const shown = (modes?.breakpoint as ZenBreakpointKey | undefined) ?? breakpoint;
  const edit = useContext(ScreenCanvasContext);
  // A phone or tablet shows its OS's bars; the app runs under them and pads by the safe areas (as in PlatformPhone).
  // The page's OS on the canvas; the simulated device's in Present and Play (an Android phone, an iPad); an iPhone Duo
  // is iOS whatever the page's OS.
  const duo = duoStatusOf(hardware?.bars);
  const barsOs: DeviceOs = simulated ? deviceOs(simulated) : duo ? "ios" : os;
  // On a real phone (Open on phone) the phone draws its own bars: the app pads by its real safe areas and fills the window.
  const real = useContext(RealDeviceContext);
  const bars = device === "desktop" || real ? null : safeAreasOf(barsOs, device, duo);
  const safe = real ? REAL_SAFE_AREAS : bars ? ({ "--zen-safe-area-top": `${bars.top}px`, "--zen-safe-area-bottom": `${bars.bottom}px` } as CSSProperties) : null;
  const tall = simulated ? simulated.height : height;
  const drawn = real ? REAL_HEIGHT : typeof tall === "number" ? ({ "--studio-screen-height": `${tall}px` } as CSSProperties) : null;
  const active = screenLayoutOf(device, simulated ? simulated.layout : layout);
  const desktop = active === "desktop";
  // A root AppShell with phone parts of its own on a Screen without bars (a page pulled from Figma's
  // Pattern/AppShell/Mobile): the AppShell draws its bars, band and ActionBar, as the app does.
  const shellBars = desktop || topNavigation || bottomNavigation ? null : phoneShellOf(children);
  // The sides the content keeps clear itself: a Top / Bottom Navigation (the mobile layout's) pads by the safe area.
  const inset = bars || (real && device !== "desktop") ? [!(active === "mobile" && (topNavigation || shellBars?.top)) && "top", !(active === "mobile" && (bottomNavigation || shellBars?.bottom)) && "bottom"].filter(Boolean).join(" ") : "";
  const chrome = desktop ? Boolean(sidebar || header) : Boolean(topNavigation || bottomNavigation);
  const content = desktop || shellBars ? children : withoutMasterLayout(children);
  // Present and Play scroll the whole screen in the page: its system bars stay at the edges of the window, as a phone's
  // do (a canvas frame draws them on its own edges).
  const pinBars = Boolean(presentScroll && bars && device !== "desktop" && chrome && !desktop);
  // The canvas's placeholders for the phone parts the mobile breakpoint lacks (§3.6): in the mobile layout, a part neither
  // the Screen nor its root AppShell has; a desktop Screen narrowed to a phone's width shows its root AppShell, so only
  // that AppShell's parts count there (the Screen's own show in the mobile layout only).
  const shell = edit && id && shown === "mobile" ? rootShellParts(children) : null;
  const missing = (part: ScreenPart) => Boolean(shell && (desktop ? shell.root && !shell[part] : !shell[part] && !(part === "topNavigation" ? topNavigation : bottomNavigation)) && !(part === "bottomNavigation" && edit?.child(id!)));
  const placeholders = edit && id ? (["topNavigation", "bottomNavigation"] as const).filter(missing) : [];
  return (
    <div
      {...rest}
      ref={rootRef}
      className="studio-builder-screen"
      data-screen={id}
      data-screen-state={state}
      data-device={device}
      data-hardware={own?.id}
      data-layout={active}
      data-chrome={chrome ? "" : undefined}
      data-canvas={canvas === "default" ? undefined : canvas}
      data-density={phone ? "comfortable" : undefined}
      data-typography={phone ? "mobile" : undefined}
      data-os={bars ? barsOs : undefined}
      data-inset={inset || undefined}
      {...scope.attributes}
      style={safe || drawn ? { ...safe, ...drawn, ...style } : style}
      aria-label={title}
    >
      {scope.wrap(<>
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
          {pinBars ? <div className="studio-builder-screen__pin" data-edge="top"><DeviceBars os={barsOs} device={device as "phone" | "tablet"} duo={duo} part="status" /></div> : null}
          {topNavigation ? <div className="studio-builder-screen__top">{withScrollLink(topNavigation, presentScroll)}</div> : null}
          <div className="studio-builder-screen__content">{content}</div>
          {bottomNavigation ? <div className="studio-builder-screen__bottom">{bottomNavigation}</div> : null}
          {pinBars ? <div className="studio-builder-screen__pin" data-edge="bottom"><DeviceBars os={barsOs} device={device as "phone" | "tablet"} duo={duo} part="home" /></div> : null}
        </div>
      )}
      {/* Last, beside the app (never inside __main, where the Screen's slots are found; Present and Play pin them there). */}
      {bars && device !== "desktop" && !pinBars ? <DeviceBars os={barsOs} device={device} duo={duo} /> : null}
      {placeholders.map((part) => <PartPlaceholder key={part} part={part} breakpoint={shown} onAdd={() => edit!.addPart(id!, part, active)} />)}
      </>)}
    </div>
  );
}

/** A Screen's lone root AppShell and the phone parts it has (`root` false: no root AppShell). */
function rootShellParts(children: ReactNode): { root: boolean } & Record<ScreenPart, boolean> {
  const nodes = Children.toArray(children).filter((child) => !(typeof child === "string" && !child.trim()));
  const [only] = nodes;
  if (nodes.length !== 1 || !isValidElement<{ topNavigation?: ReactNode; bottomNavigation?: ReactNode }>(only) || only.type !== AppShell) return { root: false, topNavigation: false, bottomNavigation: false };
  return { root: true, topNavigation: Boolean(only.props.topNavigation), bottomNavigation: Boolean(only.props.bottomNavigation) };
}

/** The canvas's dashed "Add Top / Bottom Navigation" over the edge the part takes (it changes no layout, and nothing of
 *  it reaches Present, Play or an export). Frame chrome to the selection layer, so the press is the button's. */
function PartPlaceholder({ part, breakpoint, onAdd }: { part: ScreenPart; breakpoint: ZenBreakpointKey; onAdd: () => void }) {
  const label = part === "topNavigation" ? "Add Top Navigation" : "Add Bottom Navigation";
  return (
    <button type="button" className={`studio-builder-screen__placeholder ${typographyStyles["Body/Small/Medium"]}`} data-edge={part === "topNavigation" ? "top" : "bottom"} data-studio-frame-chrome="" data-studio-placeholder="" title={`${BREAKPOINT_LABELS[breakpoint]} has no ${part === "topNavigation" ? "Top" : "Bottom"} Navigation`} onClick={onAdd}>
      <span aria-hidden="true">+</span>{label}
    </button>
  );
}

/** A lone root AppShell's own phone parts ({ top, bottom }: the sides its bars keep clear), or null without any. */
function phoneShellOf(children: ReactNode): { top: boolean; bottom: boolean } | null {
  const nodes = Children.toArray(children).filter((child) => !(typeof child === "string" && !child.trim()));
  const [only] = nodes;
  if (nodes.length !== 1 || !isValidElement<{ topNavigation?: ReactNode; bottomNavigation?: ReactNode; actionBar?: ReactNode; hero?: ReactNode; backdrop?: ReactNode }>(only) || only.type !== AppShell) return null;
  const { topNavigation, bottomNavigation, actionBar, hero, backdrop } = only.props;
  return topNavigation || bottomNavigation || actionBar || hero || backdrop ? { top: Boolean(topNavigation), bottom: Boolean(bottomNavigation || actionBar) } : null;
}

/** A Screen's content without its master layout (a lone root AppShell gives its children): the mobile layout's. */
function withoutMasterLayout(children: ReactNode): ReactNode {
  const nodes = Children.toArray(children).filter((child) => !(typeof child === "string" && !child.trim()));
  const [only] = nodes;
  // The AppShell's mobile Body (Pattern/AppShell/Mobile): its padding and section gap, around the master layout's content.
  return nodes.length === 1 && isValidElement<{ children?: ReactNode }>(only) && only.type === AppShell ? <div className="studio-builder-screen__shell-body">{only.props.children}</div> : children;
}

/** An overlay drawn open in its own frame: its portal is a node inside the frame, not the page's. A layer that does not
 *  place itself (a Card, not a Dialog) sits where the Overlay's `position` says, over a dimmed frame with `background`,
 *  as Play shows it; `closeOnOutside` is Play's only. A modal there is a picture of it open (OverlayPreviewContext, as the
 *  Main component's): it moves no focus and traps no keys. Its autofocus took the focus from the Studio each time the
 *  page drew it again, and closed a menu open in the Pages panel (E2E PT-19, PT-27, PT-28, 2026-10-27). Play draws
 *  overlays live (playFlow.tsx). */
export function Overlay({ id, children, x: _x, y: _y, position = "center", background = false, closeOnOutside: _closeOnOutside, ...rest }: HTMLAttributes<HTMLDivElement> & { id?: string; children?: ReactNode; x?: number; y?: number; position?: string; background?: boolean; closeOnOutside?: boolean }) {
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  return (
    // The frame is the overlay's device frame (data-zen-overlay-root): a Dialog opens contained, its scrim fills this frame
    // only (the world's transform would otherwise make its fixed scrim cover the whole board).
    <div {...rest} className="studio-builder-overlay" data-overlay={id} data-zen-overlay-root="">
      <div ref={setHost} className="studio-builder-overlay__portal" />
      {host ? (
        <ZenPortalProvider container={host}>
          <OverlayPreviewContext value>
            <div className="studio-builder-overlay__place" data-position={position} data-background={background || undefined}>{children}</div>
          </OverlayPreviewContext>
        </ZenPortalProvider>
      ) : null}
    </div>
  );
}

/** Figma's section (F4): a named area of the board the frames inside it belong to. The Studio's board draws it
 *  (builder/SectionFrame.tsx); outside the Studio it is nothing (the page's frames are its Screens and Overlays). */
export function Section(_props: { id?: string; title?: string; x?: number; y?: number; width?: number; height?: number }) {
  return null;
}

/** Figma's slice: an area of the board exported as a picture (builder/SliceFrame.tsx draws its outline in the Studio);
 *  it draws nothing on the page itself. */
export function Slice(_props: { id?: string; title?: string; x?: number; y?: number; width?: number; height?: number }) {
  return null;
}

/** The page root: the board lays its children out; rendered alone it shows them in a column. */
export function Board({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

export const useProto = () => useContext(ProtoContext);

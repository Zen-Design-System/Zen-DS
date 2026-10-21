import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { IconButton } from "../../../../components/Button";
import { Icon } from "../../../../components/Icon";
import { ToastProvider, useToast, type ToastOptions } from "../../../../components/Toast";
import { PresentBar } from "../../board/PresentBar";
import { deviceOfScreen } from "../../../../../tools/studio/screen-devices.mjs";
import { bezelOf, DeviceFrame, deviceViewport, presentEscapeOwners, useViewportFit, viewportDevice, ViewportHandles, type PresentViewport } from "../../board/presentViewport";
import { canvasApi } from "../../canvas/viewport";
import { previewAttributes, type ModeKey } from "../../shell/modes";
import { studioStore, useStudio } from "../../store";
import type { StudioPreviewSettings } from "../../types";
import { componentsOf, renderNode, type PageNode, type PageTree } from "../render/renderPage";
import { pageFile, usePage } from "../store/pageStore";
import { usePageTree } from "../usePageTree";
import { useUploadsVersion } from "../assets/uploads";
import { duoStatusOf, safeAreasOf } from "./DeviceBars";
import { frameMotion, motionProps } from "./playMotion";
import { CLICKABLE, itemElement, layerElements } from "./protoDom";
import { DEFAULT_DELAY, openerOf, optionsOf, overlayTitleOf, protoSourcesOf, type ProtoOptions } from "./protoModel";
import { placesItself } from "./protoTriggers";
import { isPlaying, OVERLAY_START, PLAY_PREFIX, stopPlay } from "./playStart";
import { DEVICE_WIDTH, PageOsContext, pageOsOf, ProtoContext, protoHandler, Screen, SimulatedDeviceContext, type PageDevice, type ProtoActions, type ScreenCanvas, type ScreenLayout } from "./runtime";
import { useCanvasPreview } from "../../project/activeProject";

export { isPlaying, PLAY_PREFIX, playStartOf, startPlay, stopPlay } from "./playStart";

/*
 * Play (Studio builder GĐ2 M3, spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2d): the page runs full
 * screen from its first Screen (or the one named), and its proto actions are live: navigate opens a Screen's default
 * state, open shows an Overlay over the current Screen, close / back undo them, toast shows a Toast, link opens the URL
 * in a new tab. ⌥⌘↵ (Figma's Present) starts it on a builder page, R restarts, Esc leaves. Play is Present's layer
 * under the name `presenting: "play:<start>"` (playStart.ts), so the Studio behind it is inert and its shortcuts wait,
 * as for Present.
 *
 * Present from a selected Overlay frame (Figma presents any frame): the Overlay opens at once over the Screen that opens
 * it, which plays on from there once it closes; an Overlay no Screen opens shows over a blank screen of the page's
 * device (its first Screen's), and closing it leaves Present, as there is nothing under it.
 */

/** How long the hotspot hints stay (their fade is in builder.css). */
const HINT_MS = 900;
type HintBox = { x: number; y: number; width: number; height: number; radius: string };
/** A step of the flow: the Screen shown and the options of the action that showed it (Back plays them backwards). */
type Step = { screen: string; options?: ProtoOptions };
/** The open overlay: shown by a press (`options`: its animation), while the pointer stays on a layer (`hover`), or as
 *  the presented frame (`start`). */
type OpenOverlay = { id: string; options?: ProtoOptions; hover?: boolean; start?: boolean };
/** The frame going away while the next one comes in (`reverse`: Back). */
type Leaving = { key: string; screen: string; options?: ProtoOptions; reverse: boolean };
/** A frame going away is dropped after this long even if its animation never reports its end (no animation running). */
const LEAVE_MS = 700;

const literal = (node: PageNode, prop: string) => { const value = node.props[prop]; return value?.kind === "literal" ? value.value : undefined; };
const elements = (tree: PageTree | null) => (tree?.board?.children ?? []).filter((child): child is PageNode => child.kind === "element");

/** StudioApp renders it beside Present: the Play layer while `presenting` is "play:…" on a builder page. */
export function Player() {
  const presenting = useStudio((state) => state.presenting);
  const localPage = useStudio((state) => state.localPage);
  if (!localPage || !isPlaying(presenting)) return null;
  return (
    <ToastProvider placement="bottom-center">
      <PlayLayer key={localPage} id={localPage} start={presenting!.slice(PLAY_PREFIX.length) || null} />
    </ToastProvider>
  );
}

function PlayLayer({ id, start }: { id: string; start: string | null }) {
  const page = usePage(id);
  const tree = usePageTree(page?.text);
  // Uploaded photos show once they have loaded.
  useUploadsVersion();
  const frames = useMemo(() => elements(tree), [tree]);
  const screens = frames.filter((node) => node.name === "Screen");
  const firstScreen = String(literal(screens[0] ?? { props: {} } as PageNode, "id") ?? "");
  // Present from an Overlay frame: it starts open (no animation) over the Screen that opens it, else alone.
  const presented = start?.startsWith(OVERLAY_START) ? start.slice(OVERLAY_START.length) : null;
  const presentedNode = presented ? frames.find((node) => node.name === "Overlay" && literal(node, "id") === presented) : undefined;
  const opener = useMemo(() => (presented ? openerOf(tree, presented) : null), [presented, tree]);
  const alone = Boolean(presentedNode) && !opener;
  const startOverlay = useMemo<OpenOverlay | null>(() => (presented ? { id: presented, options: { animation: "instant" }, start: true } : null), [presented]);
  const first = presentedNode ? opener ?? "" : start && screens.some((node) => literal(node, "id") === start) ? start : firstScreen;
  const [history, setHistory] = useState<Step[]>([]);
  const [overlay, setOverlay] = useState<OpenOverlay | null>(startOverlay);
  const current = history.at(-1)?.screen ?? first;
  const currentKey = `${history.length}:${current}`;
  // The animation between two frames: the one going away stays drawn under (or over) the one coming in until it ends.
  const [leaving, setLeaving] = useState<Leaving | null>(null);
  const [entering, setEntering] = useState<{ options?: ProtoOptions; reverse: boolean } | null>(null);
  const flow = useRef({ history, current, currentKey, overlay, alone });
  flow.current = { history, current, currentKey, overlay, alone };
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(() => { setLeaving(null); setEntering(null); }, LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);
  const layerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  // Preview modes change here and in Present only (the toolbar has none): Play's own, light/dark included, over the
  // canvas modes. They change the page being played, never the Studio's UI (its bar keeps the chrome modes).
  const { preview: canvasModes, brand } = useCanvasPreview();
  const [own, setOwn] = useState<Partial<StudioPreviewSettings>>({});
  const modes: StudioPreviewSettings = { ...canvasModes, ...own };
  const setMode = useCallback((key: ModeKey, value: string) => setOwn((current) => ({ ...current, [key]: value })), []);
  // Auto plays each Screen on the device it is drawn for (a desktop one at its device's width); a device or a typed
  // W × H holds for the whole Play (Restart keeps it), and so does Device frame.
  const [viewport, setViewport] = useState<PresentViewport>(null);
  const [framed, setFramed] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  // Figma's hotspot hints: a press on nothing clickable flashes what has an action on this screen (and its overlay).
  const deviceRef = useRef<HTMLDivElement>(null);
  const sources = useMemo(() => protoSourcesOf(tree), [tree]);
  const [hints, setHints] = useState<{ key: number; boxes: HintBox[] } | null>(null);
  useEffect(() => {
    if (!hints) return undefined;
    const timer = window.setTimeout(() => setHints(null), HINT_MS);
    return () => window.clearTimeout(timer);
  }, [hints]);
  const showHotspots = (event: ReactPointerEvent<HTMLDivElement>) => {
    const device = deviceRef.current;
    if (!device || (event.target instanceof Element && event.target.closest(CLICKABLE))) return;
    const box = device.getBoundingClientRect();
    // A fixed viewport scales the device down: boxes are in its own CSS px.
    const scale = device.offsetWidth ? box.width / device.offsetWidth : 1;
    const file = pageFile(id);
    const hot = new Set<Element>();
    const drawn = layerElements(device, new Set([...sources.keys()].map((loc) => `${file}:${loc}`)));
    sources.forEach((items, loc) => {
      for (const element of drawn.get(`${file}:${loc}`) ?? []) {
        // A choice control whose items lead somewhere by item: those items only.
        if (items) items.forEach((item) => { const at = itemElement(element, item); if (at) hot.add(at); });
        else if (element.matches(CLICKABLE)) hot.add(element);
        else element.querySelectorAll(CLICKABLE).forEach((inner) => hot.add(inner));
      }
    });
    const boxes = [...hot].flatMap((element) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return [];
      // The hint takes the control's own corners (a pill stays a pill).
      return [{ x: (rect.left - box.left) / scale, y: (rect.top - box.top) / scale, width: rect.width / scale, height: rect.height / scale, radius: getComputedStyle(element).borderRadius }];
    });
    if (boxes.length) setHints({ key: Date.now(), boxes });
  };

  const restart = useCallback(() => { setHistory([]); setOverlay(startOverlay); setLeaving(null); setEntering(null); }, [startOverlay]);
  const exit = useCallback(() => stopPlay(), []);
  // An overlay closing over nothing (the presented Overlay alone, before any Screen) leaves Present.
  const closeOverlay = useCallback(() => {
    const { alone: lone, history: stack } = flow.current;
    if (lone && !stack.length) exit();
    else setOverlay(null);
  }, [exit]);
  const screenOf = useCallback((screenId: string) => screens.find((node) => literal(node, "id") === screenId && literal(node, "state") === undefined) ?? screens.find((node) => literal(node, "id") === screenId), [screens]);
  const missing = useCallback((what: string, target: string) => toast({ title: `No ${what} “${target}” on this page`, type: "warning" }), [toast]);

  const hasOverlay = useCallback((target: string) => frames.some((node) => node.name === "Overlay" && literal(node, "id") === target), [frames]);
  const actions = useMemo<ProtoActions>(() => ({
    navigate: (target, raw) => {
      if (!screenOf(String(target))) { missing("screen", String(target)); return; }
      const options = optionsOf("navigate", [target, raw]);
      const { history: stack, current: from, currentKey: fromKey } = flow.current;
      setOverlay(null);
      setLeaving(options.animation === "instant" ? null : { key: fromKey, screen: from, options, reverse: false });
      setEntering(options.animation === "instant" ? null : { options, reverse: false });
      // The presented Overlay alone has no Screen to come back to: Back returns to it (below).
      setHistory([...(stack.length || !first ? stack : [{ screen: first }]), { screen: String(target), options }]);
    },
    open: (target, raw) => {
      if (!hasOverlay(String(target))) { missing("overlay", String(target)); return; }
      setOverlay({ id: String(target), options: optionsOf("open", [target, raw]) });
    },
    close: closeOverlay,
    back: () => {
      const { history: stack, overlay: open, currentKey: fromKey, alone: lone } = flow.current;
      if (open) { closeOverlay(); return; }
      const step = stack.at(-1);
      if (!step) return;
      // Back plays the way in backwards: the frame leaves the way it came.
      const instant = step.options?.animation === "instant";
      setLeaving(instant ? null : { key: fromKey, screen: step.screen, options: step.options, reverse: true });
      setEntering(instant ? null : { options: step.options, reverse: true });
      setHistory(stack.slice(0, -1));
      if (lone && stack.length === 1) setOverlay(startOverlay);
    },
    toast: (options) => toast((options && typeof options === "object" ? options : { title: String(options ?? "") }) as ToastOptions),
    link: (url) => { if (/^(https?:|mailto:)/i.test(String(url))) window.open(String(url), "_blank", "noopener,noreferrer"); },
    // While hovering: the overlay shows while the pointer stays on the layer, then goes (an overlay opened by a press stays).
    hover: {
      enter: (target, raw) => { if (hasOverlay(target)) setOverlay({ id: target, options: optionsOf("open", [target, raw]), hover: true }); },
      leave: () => setOverlay((open) => (open?.hover ? null : open)),
    },
  }), [closeOverlay, first, hasOverlay, missing, screenOf, startOverlay, toast]);

  useEffect(() => {
    layerRef.current?.focus({ preventScroll: true });
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    const url = new URL(window.location.href);
    url.searchParams.set("play", start ?? "");
    window.history.replaceState(window.history.state, "", url);
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "Escape") {
        // An open overlay (Dialog, Menu…) takes Escape first; one the Overlay places (a Card…) closes.
        if (layerRef.current?.querySelector(presentEscapeOwners)) return;
        if (layerRef.current?.querySelector(".studio-player__overlay")) { event.preventDefault(); closeOverlay(); return; }
        event.preventDefault();
        exit();
      } else if (event.key.toLowerCase() === "r" && !event.shiftKey) {
        event.preventDefault();
        restart();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      root.style.overflow = overflow;
      const back = new URL(window.location.href);
      back.searchParams.delete("play");
      window.history.replaceState(window.history.state, "", back);
      requestAnimationFrame(() => { if (!studioStore.getState().presenting) canvasApi.getViewportElement()?.focus({ preventScroll: true }); });
    };
  }, [closeOverlay, exit, restart, start]);

  const screen = screenOf(current);
  // The presented Overlay alone shows over a blank screen of the page's device and size (its first Screen's).
  const blank = !screen && alone ? screenOf(firstScreen) : undefined;
  const base = screen ?? blank;
  const overlayNode = overlay ? frames.find((node) => node.name === "Overlay" && literal(node, "id") === overlay.id) : undefined;
  const overlayChild = overlayNode?.children.find((child): child is PageNode => child.kind === "element");
  const device = (base ? (literal(base, "device") as PageDevice | undefined) : undefined) ?? "desktop";
  const leavingNode = leaving ? screenOf(leaving.screen) : undefined;
  const os = pageOsOf(tree?.header);
  // The device simulator (presentViewport.tsx): the Screen plays on the shown device, which takes its type, layout and
  // bars (SimulatedDeviceContext); a typed size keeps the Screen's own.
  const drawnOn = base ? deviceOfScreen(device, literal(base, "layout") as string | undefined, literal(base, "width"), literal(base, "height")) : undefined;
  const shown = viewport ?? deviceViewport(drawnOn);
  const shownDevice = viewportDevice(shown);
  const fit = useViewportFit(shown, stageRef, bezelOf(shownDevice, framed), shownDevice?.radius);
  // An overlay layer pads by the bars of the device it plays on.
  const barsDevice = shownDevice?.device ?? device;
  const duo = duoStatusOf((shownDevice ?? drawnOn)?.bars);
  const overlaySafe = barsDevice === "desktop" ? null : safeAreasOf(duo ? "ios" : os, barsDevice, duo);

  // After delay (a Screen's): once the screen shows, its action runs when the delay is over (again on each visit).
  const delayed = screen?.props.onDelay;
  const live = useRef(actions);
  live.current = actions;
  useEffect(() => {
    if (delayed?.kind !== "proto") return undefined;
    const timer = window.setTimeout(() => protoHandler(live.current, delayed.action, delayed.args)(), optionsOf(delayed.action, delayed.args).delay ?? DEFAULT_DELAY);
    return () => window.clearTimeout(timer);
  }, [currentKey, delayed]);
  const ctx = { file: pageFile(id), mock: tree?.mock ?? {}, proto: actions, components: componentsOf(tree?.board ?? null) };
  const title = page?.title ?? id;
  const screenTitle = screen ? String(literal(screen, "title") ?? current) : alone && presentedNode ? overlayTitleOf(presentedNode) ?? presented ?? "" : "";
  const blankSize = (prop: string) => { const value = blank ? literal(blank, prop) : undefined; return typeof value === "number" ? value : undefined; };

  return (
    <div ref={layerRef} className="studio-present studio-player" role="dialog" aria-label={`${title}, playing`} tabIndex={-1} data-device={device} {...previewAttributes(modes, brand)}>
      <PresentBar title={screenTitle && screenTitle !== title ? `${title} · ${screenTitle}` : title} theme={modes.theme} onToggleTheme={() => setMode("theme", modes.theme === "dark" ? "light" : "dark")} modes={modes} onModeChange={setMode} onExit={exit} modesScope="while playing"
        viewport={shown} onViewportChange={setViewport} viewportScale={fit.scale} autoWidth={DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop} framed={framed} onFramedChange={setFramed}
        leading={<>
          <IconButton appearance="flat" level="primary" size="sm" aria-label="Back" icon={<Icon name="icon-chevron-left-line-medium" />} disabled={!history.length && (!overlayNode || alone)} onClick={() => actions.back()} />
          <IconButton appearance="flat" level="primary" size="sm" aria-label="Restart" aria-keyshortcuts="R" tooltip="Restart (R)" icon={<Icon name="icon-refresh-ccw-01-line" />} onClick={restart} />
        </>} />
      {/* The page under the bar (Present's): the device scrolls in it, never under the bar. */}
      <div className="studio-present__page">
      <ProtoContext value={actions}>
      <PageOsContext value={os}>
      <div className="studio-present__scroll">
        <div ref={stageRef} className="studio-player__stage">
          <div className="studio-present__fit" data-viewport={fit.mode} data-frame={fit.bezel ? "" : undefined} style={fit.fitStyle}>
            <DeviceFrame device={shownDevice} fit={fit} part="body" />
            <div ref={deviceRef} onPointerDownCapture={showHotspots} className="studio-player__device" style={fit.boxStyle ?? { width: `min(${DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop}px, 100%)` }} data-viewport={fit.mode} data-zen-overlay-root="" data-screen-id={current} data-overlay={overlay?.id} data-hover-overlay={overlay?.hover || undefined}>
              <SimulatedDeviceContext value={shownDevice ?? null}>
              <div className="studio-player__screens">
                {screen ? (
                  <div key={currentKey} className="studio-player__screen" {...motionProps(entering ? frameMotion(entering.options, "enter", entering.reverse) : null)}>
                    {renderNode(screen, { mock: ctx.mock }, ctx)}
                  </div>
                ) : alone ? (
                  <div className="studio-player__screen" data-blank="">
                    <Screen device={device} layout={blank ? literal(blank, "layout") as ScreenLayout | undefined : undefined} canvas={blank ? literal(blank, "canvas") as ScreenCanvas | undefined : undefined} width={blankSize("width")} height={blankSize("height")} />
                  </div>
                ) : <p className="studio-player__empty">{tree ? "This page has no Screen to play." : ""}</p>}
                {leaving && leavingNode ? (
                  <div
                    key={leaving.key}
                    className="studio-player__screen"
                    data-leaving=""
                    inert
                    aria-hidden="true"
                    {...motionProps(frameMotion(leaving.options, "leave", leaving.reverse))}
                    onAnimationEnd={(event) => { if (event.target === event.currentTarget) { setLeaving(null); setEntering(null); } }}
                  >
                    {renderNode(leavingNode, { mock: ctx.mock }, ctx)}
                  </div>
                ) : null}
              </div>
              {overlayChild && overlayNode && overlay ? (placesItself(overlayChild.name)
                // A Dialog, Side Panel, Bottom Sheet… places and animates itself.
                ? renderNode(overlayChild, { mock: ctx.mock }, ctx, `overlay:${overlay.id}`, { open: true, onOpenChange: (open: boolean) => { if (!open) closeOverlay(); } })
                : (
                  // Any other layer: where the Overlay says (Figma's overlay position), over a dimmed screen when asked;
                  // a press outside it closes it unless the Overlay says not to.
                  <div
                    className="studio-player__overlay"
                    data-position={String(literal(overlayNode, "position") ?? "center")}
                    data-background={literal(overlayNode, "background") === true || undefined}
                    data-hover={overlay.hover || undefined}
                    style={overlaySafe ? { "--zen-safe-area-top": `${overlaySafe.top}px`, "--zen-safe-area-bottom": `${overlaySafe.bottom}px` } as CSSProperties : undefined}
                    onPointerDown={(event) => { if (event.target === event.currentTarget && literal(overlayNode, "closeOnOutside") !== false) closeOverlay(); }}
                  >
                    <div key={overlay.id} className="studio-player__overlay-content" {...motionProps(overlay.hover ? null : frameMotion(overlay.options, "enter"))}>
                      {renderNode(overlayChild, { mock: ctx.mock }, ctx, `overlay:${overlay.id}`)}
                    </div>
                  </div>
                )) : null}
              {hints ? (
                <div key={hints.key} className="studio-player__hotspots" aria-hidden="true">
                  {hints.boxes.map((hint, index) => <span key={index} className="studio-player__hotspot" style={{ transform: `translate(${hint.x}px, ${hint.y}px)`, width: hint.width, height: hint.height, borderRadius: hint.radius }} />)}
                </div>
              ) : null}
              </SimulatedDeviceContext>
            </div>
            <DeviceFrame device={shownDevice} fit={fit} part="fold" />
            <ViewportHandles viewport={shown} fit={fit} onChange={setViewport} />
          </div>
        </div>
      </div>
      </PageOsContext>
      </ProtoContext>
      </div>
    </div>
  );
}

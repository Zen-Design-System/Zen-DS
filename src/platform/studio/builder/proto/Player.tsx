import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { IconButton } from "../../../../components/Button";
import { Icon } from "../../../../components/Icon";
import { ToastProvider } from "../../../../components/Toast";
import { PresentBar } from "../../board/PresentBar";
import { deviceOfScreen, deviceOs } from "../../../../../tools/studio/screen-devices.mjs";
import { bezelOf, DeviceFrame, deviceViewport, presentEscapeOwners, useViewportFit, viewportDevice, ViewportHandles, type PresentViewport } from "../../board/presentViewport";
import { canvasApi } from "../../canvas/viewport";
import { OpenOnPhone } from "../../device/OpenOnPhone";
import { previewAttributes, type ModeKey } from "../../shell/modes";
import { studioStore, useStudio } from "../../store";
import type { StudioPreviewSettings } from "../../types";
import { pageFile, usePage } from "../store/pageStore";
import { usePageTree } from "../usePageTree";
import { useUploadsVersion } from "../assets/uploads";
import { duoStatusOf, safeAreasOf } from "./DeviceBars";
import { CLICKABLE, itemElement, layerElements } from "./protoDom";
import { overlayTitleOf, protoSourcesOf } from "./protoModel";
import { literal, PlayScreens, usePlayFlow } from "./playFlow";
import { isPlaying, PLAY_PREFIX, stopPlay } from "./playStart";
import { DEVICE_WIDTH, PageOsContext, pageOsOf, ProtoContext, SimulatedDeviceContext, type PageDevice } from "./runtime";
import { useCanvasPreview } from "../../project/activeProject";
import { libraryOf } from "../../project/projectLibrary";

export { isPlaying, PLAY_PREFIX, playStartOf, startPlay, stopPlay } from "./playStart";

/*
 * Play (Studio builder GĐ2 M3, spec docs/research/studio-builder-pages-spec-2026-10-06.md §3 2d): the page runs full
 * screen from its first Screen (or the one named), and its proto actions are live (playFlow.tsx: navigate, open, close,
 * back, toast, link). ⌥⌘↵ (Figma's Present) starts it on a builder page, R restarts, Esc leaves. Play is Present's layer
 * under the name `presenting: "play:<start>"` (playStart.ts), so the Studio behind it is inert and its shortcuts wait,
 * as for Present. Present from a selected Overlay frame opens it over the Screen that opens it, or alone, where closing
 * it leaves Play (playFlow.tsx). Open on phone (device/OpenOnPhone.tsx) plays the same page on a phone's own browser.
 */

/** How long the hotspot hints stay (their fade is in builder.css). */
const HINT_MS = 900;
type HintBox = { x: number; y: number; width: number; height: number; radius: string };

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
  const exit = useCallback(() => stopPlay(), []);
  const flow = usePlayFlow(tree, start, { onLeave: exit });
  const { screen, base, alone, presentedNode, current, history, overlay, overlayNode, closeOverlay, actions, restart } = flow;
  const layerRef = useRef<HTMLDivElement>(null);
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
        // An open overlay (Dialog, Menu…) takes Escape first; one the Overlay places (a Card…) closes. Open on phone's
        // dialog sits in the chrome's portal, outside the layer.
        if (layerRef.current?.querySelector(presentEscapeOwners) || document.querySelector(".studio-open-phone")) return;
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

  // The Screen's device (the presented Overlay alone: its blank screen's, the page's first Screen's).
  const device = (base ? (literal(base, "device") as PageDevice | undefined) : undefined) ?? "desktop";
  const os = pageOsOf(tree?.header);
  // The device simulator (presentViewport.tsx): the Screen plays on the shown device, which takes its type, layout and
  // bars (SimulatedDeviceContext); a typed size keeps the Screen's own.
  const drawnOn = base ? deviceOfScreen(device, literal(base, "layout") as string | undefined, literal(base, "width"), literal(base, "height"), os) : undefined;
  const shown = viewport ?? deviceViewport(drawnOn);
  const shownDevice = viewportDevice(shown);
  const fit = useViewportFit(shown, stageRef, bezelOf(shownDevice, framed), shownDevice?.radius);
  // An overlay layer pads by the bars of the device it plays on (its OS's: an Android phone's on an iOS page).
  const barsDevice = shownDevice?.device ?? device;
  const duo = duoStatusOf((shownDevice ?? drawnOn)?.bars);
  const overlaySafe = barsDevice === "desktop" ? null : safeAreasOf(shownDevice ? deviceOs(shownDevice) : duo ? "ios" : os, barsDevice, duo);
  const title = page?.title ?? id;
  const screenTitle = screen ? String(literal(screen, "title") ?? current) : alone && presentedNode ? overlayTitleOf(presentedNode) ?? String(literal(presentedNode, "id") ?? "") : "";

  return (
    <div ref={layerRef} className="studio-present studio-player" role="dialog" aria-label={`${title}, playing`} tabIndex={-1} data-device={device} {...previewAttributes(modes, brand)}>
      <PresentBar title={screenTitle && screenTitle !== title ? `${title} · ${screenTitle}` : title} theme={modes.theme} onToggleTheme={() => setMode("theme", modes.theme === "dark" ? "light" : "dark")} modes={modes} onModeChange={setMode} onExit={exit} modesScope="while playing"
        viewport={shown} onViewportChange={setViewport} viewportScale={fit.scale} autoWidth={DEVICE_WIDTH[device] ?? DEVICE_WIDTH.desktop} framed={framed} onFramedChange={setFramed}
        leading={<>
          <IconButton appearance="flat" level="primary" size="sm" aria-label="Back" icon={<Icon name="icon-chevron-left-line-medium" />} disabled={!history.length && (!overlayNode || alone)} onClick={() => actions.back()} />
          <IconButton appearance="flat" level="primary" size="sm" aria-label="Restart" aria-keyshortcuts="R" tooltip="Restart (R)" icon={<Icon name="icon-refresh-ccw-01-line" />} onClick={restart} />
          <OpenOnPhone page={id} title={title} text={page?.text} start={current || null} modes={modes} brand={brand} />
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
              <PlayScreens flow={flow} file={pageFile(id)} overlaySafe={overlaySafe} library={libraryOf(id)} />
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

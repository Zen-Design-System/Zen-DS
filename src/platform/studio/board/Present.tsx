import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ZenPortalProvider } from "../../../components/Portal";
import { PlatformPhoneModesContext } from "../../PlatformPhone";
import { isWideExample } from "../../examples/types";
import { ExampleCard } from "../../PlatformShowcases";
import { PlatformTypographyContext } from "../../PlatformTemplate";
import { canvasApi } from "../canvas/viewport";
import { previewAttributes, type ModeKey } from "../shell/modes";
import { pageKey, studioStore, useStudio } from "../store";
import { resolveFrameWidth } from "./frameLayout";
import type { StudioPreviewSettings } from "../types";
import { useStudioFrames, type StudioExample, type StudioFrameEntry } from "./frames";
import { PresentBar } from "./PresentBar";
import { stepFocusFor, stepPresent, takeReturnFocus } from "./presentFrame";
import { deviceOs, screenDevice, viewDevice } from "../../../../tools/studio/screen-devices.mjs";
import { versionFor, viewportBreakpoint } from "../builder/proto/versions";
import { SimulatedDeviceContext } from "../builder/proto/runtime";
import { duoStatusOf, safeAreasOf } from "../builder/proto/DeviceBars";
import { bezelOf, DeviceFrame, deviceViewport, presentEscapeOwners, useViewportFit, viewportDevice, ViewportHandles, type PresentViewport } from "./presentViewport";
import "./board.css";
import { useCanvasPreview } from "../project/activeProject";

/** Present's own modes: what the user picked in its Modes panel. They hold while ‹ › step between examples and are
 *  forgotten when Present ends; the canvas never sees them. */
/** Present's own modes for the presented example, light/dark included: the Studio (chrome and canvas) never changes. */
type PresentModes = Partial<StudioPreviewSettings>;

/** A phone screen's modes when Present has no pick of its own (PlatformPhone's defaults, as a phone app sets them). */
const PHONE_MODES = { density: "comfortable", typography: "mobile" } as const;

/** The Present layer: rendered by StudioApp beside the canvas, while `state.presenting` names an example frame. */
export function Present() {
  const presenting = useStudio((state) => state.presenting);
  const frames = useStudioFrames();
  const [own, setOwn] = useState<PresentModes>({});
  // The viewport holds while ‹ › step, like the modes, and is forgotten when Present ends.
  const [viewport, setViewport] = useState<PresentViewport>(null);
  const [framed, setFramed] = useState(true);
  useEffect(() => {
    if (!presenting) { setOwn({}); setViewport(null); setFramed(true); }
  }, [presenting]);
  const setMode = useCallback((key: ModeKey, value: string) => setOwn((modes) => ({ ...modes, [key]: value })), []);
  const presented = presenting ? frames.find((entry) => entry.id === presenting) : undefined;
  // A builder Screen with a version drawn for the fixed viewport's breakpoint (Make a separate Screen, decision D4) shows
  // that version; Auto shows the Screen presented.
  const frame = presented && viewport ? versionFrame(frames, presented, viewport) : presented;
  return frame?.example ? <PresentLayer key={frame.id} frame={frame} example={frame.example} own={own} onModeChange={setMode} viewport={viewport} onViewportChange={setViewport} framed={framed} onFramedChange={setFramed} /> : null;
}

/** The frame of the version of `frame`'s Screen for `viewport`'s breakpoint, else `frame` (builder/proto/versions.ts). */
function versionFrame(frames: ReadonlyArray<StudioFrameEntry>, frame: StudioFrameEntry, viewport: NonNullable<PresentViewport>): StudioFrameEntry {
  const shape = frame.example?.shape;
  if (!shape) return frame;
  const screens = frames.flatMap((entry) => (entry.id.startsWith("screen:") && entry.example?.shape && entry.id.split(":").length === 2 ? [{ ...entry.example.shape, frame: entry }] : []));
  const id = versionFor(screens, shape.id, viewportBreakpoint(viewport.width, viewportDevice(viewport)?.device));
  return id === shape.id ? frame : screens.find((screen) => screen.id === id)?.frame ?? frame;
}

function PresentLayer({ frame, example, own, onModeChange, viewport, onViewportChange, framed, onFramedChange }: { frame: StudioFrameEntry; example: StudioExample; own: PresentModes; onModeChange: (key: ModeKey, value: string) => void; viewport: PresentViewport; onViewportChange: (viewport: PresentViewport) => void; framed: boolean; onFramedChange: (framed: boolean) => void }) {
  const { preview: canvasModes, brand } = useCanvasPreview();
  const key = useStudio((state) => pageKey(state.page, state.collection, state.localPage));
  const override = useStudio((state) => state.frameOverrides[key]?.[frame.id]);
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);
  // The device's toast layer (walk 2026-10-29 W-45; set while a device is simulated): see the effect below.
  const [toastRoot, setToastRoot] = useState<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const exit = useCallback(() => studioStore.setState({ presenting: null }), []);
  const examples = useStudioFrames().filter((entry) => entry.kind === "example" && entry.example);
  const index = examples.findIndex((entry) => entry.id === frame.id);
  const stageRef = useRef<HTMLDivElement>(null);
  // A phone screen opens in the phone modes (Comfortable, Mobile), a desktop one in the canvas modes; Present's own picks
  // win over both.
  const [phone, setPhone] = useState(false);
  // A phone or tablet Screen shows at its device's size (the user 2026-10-16: "Mobile khi bấm present nên fix size",
  // "tương tự ipad"): Auto takes the device it is drawn for (runtime Screen's data-hardware: the device of its size,
  // else its type's iPhone or iPad); a viewport picked in the bar wins.
  const [hardware, setHardware] = useState<string | null>(null);
  useLayoutEffect(() => setHardware(stageRef.current?.querySelector(".studio-builder-screen")?.getAttribute("data-hardware") ?? null), []);
  useLayoutEffect(() => setPhone(Boolean(stageRef.current?.querySelector(".platform-phone"))), []);
  const theme = own.theme ?? override?.theme ?? canvasModes.theme;
  const preview: StudioPreviewSettings = { ...canvasModes, ...(phone ? PHONE_MODES : null), ...own, theme };
  const modes = previewAttributes(preview, brand);
  // Light/dark changes the presented example only, like every other mode here (user, 2026-10-09: the Studio's UI keeps
  // its own modes in Play and Present).
  const toggleTheme = () => onModeChange("theme", theme === "dark" ? "light" : "dark");

  useEffect(() => {
    // The dialog itself takes focus (no ring on a control the user did not pick; Tab reaches the bar first), or the ‹ / ›
    // button that stepped here, so a keyboard user keeps stepping.
    const step = stepFocusFor(frame.id);
    const stepButton = step ? layerRef.current?.querySelector<HTMLButtonElement>(`[data-present-step="${step}"]:not(:disabled)`) : null;
    (stepButton ?? layerRef.current)?.focus({ preventScroll: true });
    const root = document.documentElement;
    const overflow = root.style.overflow;
    root.style.overflow = "hidden";
    // Escape leaves unless an overlay, the Modes panel or a text field inside the screen owns it (as the classic full
    // screen). ← / → step between the example frames while the focus is on the layer or a bar button, never inside the
    // example (its own arrow keys: tabs, menus, fields).
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || layerRef.current?.querySelector(presentEscapeOwners)) return;
        const free = target === layerRef.current || target === document.body || Boolean(target?.closest(".studio-present-bar button"));
        if (!free) return;
        event.preventDefault();
        stepPresent(event.key === "ArrowLeft" ? -1 : 1);
        return;
      }
      if (event.key !== "Escape") return;
      if (target?.closest("input, textarea, select, [contenteditable='true'], td, th") || layerRef.current?.querySelector(presentEscapeOwners)) return;
      event.preventDefault();
      exit();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      root.style.overflow = overflow;
      // After the layer is gone and the Studio is no longer inert (not on a remount while still presenting).
      requestAnimationFrame(() => {
        if (studioStore.getState().presenting) return;
        const saved = takeReturnFocus();
        const target = saved?.isConnected ? saved : canvasApi.getViewportElement();
        target?.focus({ preventScroll: true });
      });
    };
  }, [exit, frame.id]);

  const width = resolveFrameWidth(frame.baseWidth, override?.width);
  // A Screen viewed on another breakpoint on the canvas (builder/screenViews.ts) opens on that device.
  const viewed = viewDevice(override?.view, example.shape?.height);
  const shown: PresentViewport = viewport ?? deviceViewport(viewed ?? screenDevice(hardware));
  // The device simulator: a builder Screen takes the shown device's type, layout and bars; Device frame draws it.
  const device = viewportDevice(shown);
  const fit = useViewportFit(shown, stageRef, bezelOf(device, framed), device?.radius);
  // A builder Screen on a phone or tablet draws its bars: the device publishes their room for what opens in it (a
  // Dialog, a Bottom Sheet, the toasts), as Play's does (W-44).
  const bars = example.screen && fit.mode === "fixed" && device && device.device !== "desktop" ? safeAreasOf(deviceOs(device), device.device, duoStatusOf(device.bars)) : null;
  const safe = bars ? ({ "--zen-safe-area-top": `${bars.top}px`, "--zen-safe-area-bottom": `${bars.bottom}px` } as CSSProperties) : null;
  // An example's toasts come from its card's own queue (ExampleCard's ZenProvider is a root one) and portal into this
  // layer's portal root, fixed at the window's foot. In a simulated device their layer moves into the device's toast
  // layer, over its home indicator (W-45; the portal follows the node), and back when the device goes.
  useLayoutEffect(() => {
    if (fit.mode !== "fixed" || !toastRoot || !portalRoot) return undefined;
    const move = (from: HTMLElement, to: HTMLElement) => { for (const layer of from.querySelectorAll(":scope > .zen-toast-layer")) to.appendChild(layer); };
    move(portalRoot, toastRoot);
    const observer = new MutationObserver(() => move(portalRoot, toastRoot));
    observer.observe(portalRoot, { childList: true });
    return () => { observer.disconnect(); move(toastRoot, portalRoot); };
  }, [fit.mode, toastRoot, portalRoot]);
  return (
    <div ref={layerRef} className="studio-present" role="dialog" aria-label={`${example.title}, full screen`} tabIndex={-1} data-screen={example.screen ? "true" : undefined} {...modes}>
      <PresentBar title={example.title} theme={theme} onToggleTheme={toggleTheme} modes={preview} onModeChange={onModeChange} onExit={exit} index={index} count={examples.length} onStep={stepPresent} viewport={shown} onViewportChange={onViewportChange} viewportScale={fit.scale} autoWidth={width} framed={framed} onFramedChange={onFramedChange} />
      {/* The page under the bar, as a browser's: a full-screen card and the example's overlays fill it, never the bar. */}
      <div className="studio-present__page">
        <ZenPortalProvider container={portalRoot}>
          <PlatformTypographyContext value={preview.typography}>
            <PlatformPhoneModesContext value={{ density: own.density, typography: own.typography }}>
              <div className="studio-present__scroll">
                <div ref={stageRef} className="studio-present__stage" style={{ "--studio-frame-width": `${width}px` } as CSSProperties}>
                  {/* The same two wrappers in Auto (they take no box) and in a fixed viewport, so a change keeps the example's state. */}
                  <div className="studio-present__fit" data-viewport={fit.mode} data-frame={fit.bezel ? "" : undefined} style={fit.fitStyle}>
                    <DeviceFrame device={device} fit={fit} part="body" />
                    <div className="studio-present__viewport" data-viewport={fit.mode} style={safe ? { ...fit.boxStyle, ...safe } : fit.boxStyle} data-zen-overlay-root={fit.mode === "fixed" ? "" : undefined}>
                      <SimulatedDeviceContext value={device ?? null}>
                        <ExampleCard bare title={example.title} description={example.description} code={example.code} wide={isWideExample(example)} screen={example.screen} presented={example.screen}>{example.render()}</ExampleCard>
                      </SimulatedDeviceContext>
                    </div>
                    {/* Beside the viewport, its size: the viewport scrolls its example, and the toasts stay at the device's foot. */}
                    {fit.mode === "fixed" ? <div ref={setToastRoot} className="studio-device-toasts" style={{ ...fit.boxStyle, ...safe }} data-breakpoint={shown ? viewportBreakpoint(shown.width, device?.device) : undefined} /> : null}
                    <DeviceFrame device={device} fit={fit} part="fold" />
                    <ViewportHandles viewport={shown} fit={fit} onChange={onViewportChange} device={example.shape?.device} />
                  </div>
                </div>
              </div>
            </PlatformPhoneModesContext>
          </PlatformTypographyContext>
        </ZenPortalProvider>
        {/* The presented example's overlays (Dialog, Menu, Tooltip…) stay above it and in its modes. */}
        <div ref={setPortalRoot} className="official-portal-root studio-portal-root" {...modes} />
      </div>
    </div>
  );
}

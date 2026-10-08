import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { ZenPortalProvider } from "../../../components/Portal";
import { fullScreenEscapeOwners } from "../../PlatformFullScreen";
import { PlatformPhoneModesContext } from "../../PlatformPhone";
import { isWideExample } from "../../examples/types";
import { ExampleCard } from "../../PlatformShowcases";
import { PlatformTypographyContext } from "../../PlatformTemplate";
import { canvasApi } from "../canvas/viewport";
import { previewAttributes, setStudioTheme, type ModeKey } from "../shell/modes";
import { pageKey, setFrameOverride, studioStore, useStudio } from "../store";
import { resolveFrameWidth } from "./frameLayout";
import type { StudioPreviewSettings } from "../types";
import { useStudioFrames, type StudioExample, type StudioFrameEntry } from "./frames";
import { PresentBar } from "./PresentBar";
import { stepFocusFor, stepPresent, takeReturnFocus } from "./presentFrame";
import "./board.css";

/** Present's own modes: what the user picked in its Modes panel. They hold while ‹ › step between examples and are
 *  forgotten when Present ends; the canvas never sees them. */
type PresentModes = Partial<Omit<StudioPreviewSettings, "theme">>;

/** A phone screen's modes when Present has no pick of its own (PlatformPhone's defaults, as a phone app sets them). */
const PHONE_MODES = { density: "comfortable", typography: "mobile" } as const;

/** The Present layer: rendered by StudioApp beside the canvas, while `state.presenting` names an example frame. */
export function Present() {
  const presenting = useStudio((state) => state.presenting);
  const frames = useStudioFrames();
  const [own, setOwn] = useState<PresentModes>({});
  useEffect(() => {
    if (!presenting) setOwn({});
  }, [presenting]);
  const setMode = useCallback((key: ModeKey, value: string) => {
    if (key === "theme") setStudioTheme(value === "dark" ? "dark" : "light");
    else setOwn((modes) => ({ ...modes, [key]: value }));
  }, []);
  const frame = presenting ? frames.find((entry) => entry.id === presenting) : undefined;
  return frame?.example ? <PresentLayer key={frame.id} frame={frame} example={frame.example} own={own} onModeChange={setMode} /> : null;
}

function PresentLayer({ frame, example, own, onModeChange }: { frame: StudioFrameEntry; example: StudioExample; own: PresentModes; onModeChange: (key: ModeKey, value: string) => void }) {
  const canvasModes = useStudio((state) => state.preview);
  const key = useStudio((state) => pageKey(state.page, state.collection, state.localPage));
  const override = useStudio((state) => state.frameOverrides[key]?.[frame.id]);
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const exit = useCallback(() => studioStore.setState({ presenting: null }), []);
  const examples = useStudioFrames().filter((entry) => entry.kind === "example" && entry.example);
  const index = examples.findIndex((entry) => entry.id === frame.id);
  const stageRef = useRef<HTMLDivElement>(null);
  // A phone screen opens in the phone modes (Comfortable, Mobile), a desktop one in the canvas modes; Present's own picks
  // win over both.
  const [phone, setPhone] = useState(false);
  useLayoutEffect(() => setPhone(Boolean(stageRef.current?.querySelector(".platform-phone"))), []);
  const theme = override?.theme ?? canvasModes.theme;
  const preview: StudioPreviewSettings = { ...canvasModes, ...(phone ? PHONE_MODES : null), ...own, theme };
  const modes = previewAttributes(preview);
  // Light/dark changes what is on screen: the frame's own theme when it has one, else the whole Studio's (the canvas
  // and the chrome follow after Present).
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    if (override?.theme) setFrameOverride(key, frame.id, { theme: next });
    else setStudioTheme(next);
  };

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
        if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || layerRef.current?.querySelector(fullScreenEscapeOwners)) return;
        const free = target === layerRef.current || target === document.body || Boolean(target?.closest(".platform-fullscreen-bar button"));
        if (!free) return;
        event.preventDefault();
        stepPresent(event.key === "ArrowLeft" ? -1 : 1);
        return;
      }
      if (event.key !== "Escape") return;
      if (target?.closest("input, textarea, select, [contenteditable='true'], td, th") || layerRef.current?.querySelector(fullScreenEscapeOwners)) return;
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
  return (
    <div ref={layerRef} className="studio-present" role="dialog" aria-label={`${example.title}, full screen`} tabIndex={-1} data-screen={example.screen ? "true" : undefined} {...modes}>
      <PresentBar title={example.title} theme={theme} onToggleTheme={toggleTheme} modes={preview} onModeChange={onModeChange} onExit={exit} index={index} count={examples.length} onStep={stepPresent} />
      <ZenPortalProvider container={portalRoot}>
        <PlatformTypographyContext value={preview.typography}>
          <PlatformPhoneModesContext value={{ density: own.density, typography: own.typography }}>
            <div ref={stageRef} className="studio-present__stage" style={{ "--studio-frame-width": `${width}px` } as CSSProperties}>
              <ExampleCard bare title={example.title} description={example.description} code={example.code} wide={isWideExample(example)} screen={example.screen} presented={example.screen}>{example.render()}</ExampleCard>
            </div>
          </PlatformPhoneModesContext>
        </PlatformTypographyContext>
      </ZenPortalProvider>
      {/* The presented example's overlays (Dialog, Menu, Tooltip…) stay above it and in its modes. */}
      <div ref={setPortalRoot} className="official-portal-root studio-portal-root" {...modes} />
    </div>
  );
}

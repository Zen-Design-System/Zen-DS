import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Text } from "../../../components/Text";
import { FullScreenBarDivider, FullScreenExit } from "../../PlatformFullScreen";
import { ChromeScope } from "../shell/ChromeScope";
import { usePanelLayout } from "../shell/layout";
import { PreviewModeFields } from "../shell/ModesMenu";
import { previewSummary, type ModeKey } from "../shell/modes";
import type { StudioPreviewSettings } from "../types";
import { viewportButton, ViewportFields, type PresentViewport } from "./presentViewport";

/** The modes Present's panel lists: Mode has its own button on the bar. */
const PANEL_MODES = ["componentTheme", "density", "typography", "radius", "emphasis", "contrast"] as const;

type PresentBarProps = {
  title: string;
  /** The presented frame's colour mode (its own theme, or the Studio's). */
  theme: "light" | "dark";
  onToggleTheme: () => void;
  /** The presented screen's own modes (Present's, seeded from the canvas and the screen's defaults) and their setter:
   *  the panel changes the presented screen only, never the canvas. */
  modes: StudioPreviewSettings;
  onModeChange: (key: ModeKey, value: string) => void;
  onExit: () => void;
  /** Where the frame sits among the page's example frames (‹ 3 / 7 › when there are two or more). Play has none. */
  index?: number;
  count?: number;
  onStep?: (delta: -1 | 1, focus: "prev" | "next") => void;
  /** Controls before light/dark (Play's Back and Restart), then a divider. */
  leading?: ReactNode;
  /** The panel's note on where the modes apply. Default "this presentation only". */
  modesScope?: string;
  /** The presented screen's viewport (presentViewport.tsx: Auto, a device or a typed W × H) and its setter; without
   *  them the bar has no Viewport button. */
  viewport?: PresentViewport;
  onViewportChange?: (viewport: PresentViewport) => void;
  /** How far a fixed viewport is scaled down to fit the window (1 = 100%). */
  viewportScale?: number;
  /** The width Auto shows (the frame's, or the Play screen's device): the W field's placeholder, and W when only H is typed. */
  autoWidth?: number;
};

/**
 * Present's and Play's controls, a browser's toolbar across the top of the window (user, 2026-10-16: the page loads in
 * the frame below it, so the bar never covers the screen): navigation at the start (Play's Back and Restart, ‹ 3 / 7 ›
 * between the page's example frames), the screen's name in an address pill in the middle, then light/dark, the viewport
 * (Auto, Desktop, Tablet, Phone or a typed W × H), the other preview modes and Exit + Esc at the end. Viewport and Modes
 * open a panel below their button (the presented screen's own: the canvas keeps its modes and frame widths). The bar is
 * in the Studio chrome's modes; the caller lays the page out under it (.studio-present__page).
 */
export function PresentBar({ title, theme, onToggleTheme, modes, onModeChange, onExit, index = 0, count = 0, onStep, leading, modesScope = "this presentation only", viewport = null, onViewportChange, viewportScale = 1, autoWidth = 0 }: PresentBarProps) {
  const { phone } = usePanelLayout();
  const [panelOpen, setPanelOpen] = useState<"modes" | "viewport" | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelRight, setPanelRight] = useState<number | null>(null);
  const modesRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  // A panel closes on a press outside it and its button (a press on the other button closes it, then opens that one),
  // and on Escape (Present leaves on Escape only when no panel is open: the panel's class is one of presentEscapeOwners).
  useEffect(() => {
    if (!panelOpen) return undefined;
    const button = panelOpen === "modes" ? modesRef : viewportRef;
    panelRef.current?.querySelector<HTMLElement>("button, select, input")?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && !panelRef.current?.contains(target) && !button.current?.contains(target)) setPanelOpen(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      setPanelOpen(null);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("pointerdown", onPointerDown); document.removeEventListener("keydown", onKeyDown); };
  }, [panelOpen]);

  // An open panel hangs from its button's end edge, kept inside the bar's padding (a phone's panel is wider than the
  // room left of its button).
  useLayoutEffect(() => {
    if (!panelOpen) return undefined;
    const place = () => {
      const panel = panelRef.current, button = (panelOpen === "modes" ? modesRef : viewportRef).current;
      const bar = button?.closest<HTMLElement>(".studio-present-bar");
      if (!bar || !panel || !button) return;
      const barBox = bar.getBoundingClientRect();
      const edge = parseFloat(getComputedStyle(bar).paddingRight) || 0;
      const most = Math.max(edge, barBox.width - panel.offsetWidth - edge);
      setPanelRight(Math.min(most, Math.max(edge, barBox.right - button.getBoundingClientRect().right)));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [panelOpen, phone]);

  const panelButton = (name: "modes" | "viewport") => ({
    ref: name === "modes" ? modesRef : viewportRef,
    appearance: "flat",
    level: "primary",
    size: "sm",
    "aria-haspopup": "dialog",
    "aria-expanded": panelOpen === name,
    "aria-controls": panelOpen === name ? `${id}-panel` : undefined,
    onClick: () => setPanelOpen((open) => (open === name ? null : name)),
  } as const);
  const modesProps = panelButton("modes");
  const viewportProps = panelButton("viewport");
  const chevron = (name: "modes" | "viewport") => <Icon name={panelOpen === name ? "icon-chevron-up-line" : "icon-chevron-down-line"} decorative />;
  const shownViewport = viewportButton(viewport);
  const panelStyle = panelRight === null ? undefined : { right: panelRight };

  const panel = panelOpen === "modes" ? (
    <div ref={panelRef} id={`${id}-panel`} className="studio-present-bar__panel" style={panelStyle} role="dialog" aria-labelledby={`${id}-title`}>
      <div className="studio-modes__head">
        <Text as="p" id={`${id}-title`} textStyle="Body/Small/Bold">Preview modes</Text>
        <Text as="p" textStyle="Caption/Regular" tone="light">{previewSummary(modes)} · {modesScope}</Text>
      </div>
      <PreviewModeFields idPrefix={id} keys={PANEL_MODES} values={modes} onChange={onModeChange} />
    </div>
  ) : panelOpen === "viewport" && onViewportChange ? (
    <div ref={panelRef} id={`${id}-panel`} className="studio-present-bar__panel" style={panelStyle} role="dialog" aria-labelledby={`${id}-viewport-title`}>
      <ViewportFields idPrefix={`${id}-viewport`} viewport={viewport} onChange={onViewportChange} scale={viewportScale} autoWidth={autoWidth} />
    </div>
  ) : null;

  return (
    <ChromeScope className="studio-present-bar" role="group" aria-label="Full screen controls">
      <div className="studio-present-bar__group">
        {leading ? <>{leading}{count > 1 && onStep ? <FullScreenBarDivider /> : null}</> : null}
        {count > 1 && onStep ? (
          <>
            <IconButton appearance="flat" level="primary" size="sm" data-present-step="prev" aria-label="Previous example" aria-keyshortcuts="ArrowLeft" tooltip="Previous example (←)" disabled={index <= 0} icon={<Icon name="icon-chevron-left-line" />} onClick={() => onStep(-1, "prev")} />
            <Text as="span" textStyle="Body/Small/Medium" tone="base" className="studio-present-bar__count" aria-label={`Example ${index + 1} of ${count}`}>{index + 1} / {count}</Text>
            <IconButton appearance="flat" level="primary" size="sm" data-present-step="next" aria-label="Next example" aria-keyshortcuts="ArrowRight" tooltip="Next example (→)" disabled={index >= count - 1} icon={<Icon name="icon-chevron-right-line" />} onClick={() => onStep(1, "next")} />
          </>
        ) : null}
      </div>
      {phone ? null : (
        <div className="studio-present-bar__address">
          <Text as="span" textStyle="Body/Small/Medium" tone="base" className="studio-present-bar__title" title={title}>{title}</Text>
        </div>
      )}
      <div className="studio-present-bar__group" data-end="">
        <IconButton appearance="flat" level="primary" size="sm" aria-label={theme === "dark" ? "Light mode" : "Dark mode"} icon={<Icon name={theme === "dark" ? "icon-sun-line" : "icon-moon-01-line"} />} onClick={onToggleTheme} />
        {onViewportChange ? (phone
          ? <IconButton {...viewportProps} aria-label={`Viewport: ${viewport ? shownViewport.label : "Auto"}`} icon={<Icon name={shownViewport.icon} />} />
          : <Button {...viewportProps} aria-label={`Viewport: ${viewport ? shownViewport.label : "Auto"}`} startIcon={<Icon name={shownViewport.icon} decorative />} endIcon={chevron("viewport")}>{shownViewport.label}</Button>) : null}
        {phone
          ? <IconButton {...modesProps} aria-label="Preview modes" icon={<Icon name="icon-sliders-02-line" />} />
          : <Button {...modesProps} startIcon={<Icon name="icon-sliders-02-line" decorative />} endIcon={chevron("modes")}>Modes</Button>}
        <FullScreenBarDivider />
        <FullScreenExit onExit={onExit} />
      </div>
      {panel}
    </ChromeScope>
  );
}

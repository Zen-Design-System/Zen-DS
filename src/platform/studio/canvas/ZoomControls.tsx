import { Button } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { ChromeScope } from "../shell/ChromeScope";
import { useStudio } from "../store";
import { modKey } from "../shell/modKey";
import { canvasApi, formatZoom, useCanvasZoom, zoomIn, zoomOut } from "./viewport";
import { zoomToSelection } from "./zoomToSelection";
import "./canvas.css";

/** The zoom percentage and its menu (toolbar and the canvas pill). */
export function ZoomMenu({ align = "end", size = "sm" }: { align?: "start" | "end"; size?: "xs" | "sm" }) {
  const zoom = useCanvasZoom();
  const hasSelection = useStudio((state) => state.selection !== null);
  const items: MenuEntry[] = [
    { id: "in", label: "Zoom in", shortcut: `${modKey}+`, onSelect: zoomIn },
    { id: "out", label: "Zoom out", shortcut: `${modKey}−`, onSelect: zoomOut },
    { id: "fit", label: "Zoom to fit", shortcut: "⇧1", onSelect: () => canvasApi.fit() },
    { id: "selection", label: "Zoom to selection", shortcut: "⇧2", disabled: !hasSelection, onSelect: () => { zoomToSelection(); } },
    { type: "separator" },
    { id: "50", label: "Zoom to 50%", onSelect: () => canvasApi.setZoom(0.5) },
    { id: "100", label: "Zoom to 100%", shortcut: `${modKey}0`, onSelect: () => canvasApi.setZoom(1) },
    { id: "200", label: "Zoom to 200%", onSelect: () => canvasApi.setZoom(2) },
  ];
  return (
    <Menu
      aria-label="Zoom"
      align={align}
      items={items}
      trigger={<Button className="studio-zoom__value" appearance="flat" level="primary" size={size} aria-label={`Zoom ${formatZoom(zoom)}`} endIcon={<Icon name="icon-chevron-down-line" decorative />}>{formatZoom(zoom)}</Button>}
    />
  );
}

/**
 * Floating zoom pill, top-right of the canvas, as Figma's: only the percentage and its menu (XSmall). Zoom in/out, fit
 * and selection live in that menu and on their keys (⌘+ ⌘− ⇧1 ⇧2), so the pill stays out of the way.
 */
export function ZoomControls() {
  return (
    <ChromeScope className="studio-zoom" role="toolbar" aria-label="Zoom">
      <ZoomMenu size="xs" />
    </ChromeScope>
  );
}

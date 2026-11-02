import { Chip } from "../../../components/Chip";
import { Menu, type MenuEntry } from "../../../components/Menu";
import { useStudio } from "../store";
import { modKey } from "../shell/modKey";
import { canvasApi, formatZoom, useCanvasZoom, zoomIn, zoomOut } from "./viewport";
import { zoomToSelection } from "./zoomToSelection";
import "./canvas.css";

/** The zoom percentage and its menu: a small advanced Chip at the canvas's bottom-right (Figma B4, 2026-11-01). */
export function ZoomMenu({ align = "end" }: { align?: "start" | "end" }) {
  const zoom = useCanvasZoom();
  const hasSelection = useStudio((state) => state.selection !== null);
  const items: MenuEntry[] = [
    { id: "in", label: "Zoom in", shortcut: `${modKey}+`, onSelect: zoomIn },
    { id: "out", label: "Zoom out", shortcut: `${modKey}−`, onSelect: zoomOut },
    { id: "fit", label: "Zoom to fit", shortcut: "⇧1", onSelect: () => canvasApi.fit() },
    { id: "selection", label: "Zoom to selection", shortcut: "⇧2", disabled: !hasSelection, onSelect: () => { zoomToSelection(); } },
    { type: "separator" },
    { id: "50", label: "Zoom to 50%", onSelect: () => canvasApi.setZoom(0.5) },
    { id: "100", label: "Zoom to 100%", shortcut: "⇧0", onSelect: () => canvasApi.setZoom(1) },
    { id: "200", label: "Zoom to 200%", onSelect: () => canvasApi.setZoom(2) },
  ];
  return (
    <Menu
      aria-label="Zoom"
      align={align}
      items={items}
      // zen-allow-chip-action: the Menu's trigger (Menu wires its click, keys and aria-expanded).
      trigger={<Chip className="studio-zoom__value" variant="advanced" size="sm" aria-label={`Zoom ${formatZoom(zoom)}`}>{formatZoom(zoom)}</Chip>}
    />
  );
}

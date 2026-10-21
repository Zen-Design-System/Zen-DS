import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { openShortcuts } from "../shell/shortcutsOpen";
import { ChromeScope } from "../shell/ChromeScope";
import { useStudio } from "../store";
import type { StudioTool } from "../types";
import "./canvas.css";

export const CANVAS_STATUS_ID = "studio-canvas-status";

/** What the tool does, in Figma's words, short (the details are in Keyboard shortcuts). */
const hints: Record<StudioTool, string> = {
  select: "Move V · click to select, ⌘-click inside a frame, drag to move, ⌥-drag to duplicate",
  interact: "Interact · try the components · V for Move",
  hand: "Hand H · drag to pan",
  frame: "Frame F · drag to draw a frame, click for 100 × 100, or pick a preset · ⇧ square · ⌥ from center",
  section: "Section ⇧S · drag to draw a section around frames, or click · ⇧ square · ⌥ from center",
  slice: "Slice S · drag over what to export, or click for 100 × 100 · ⇧ square · ⌥ from center",
  rectangle: "Rectangle R · drag, or click for 100 × 100 · ⇧ square · ⌥ from center · Space to move",
  ellipse: "Ellipse O · drag, or click for 100 × 100 · ⇧ circle · ⌥ from center · Space to move",
  line: "Line L · drag · ⇧ 45° steps · ⌥ from center · Space to move",
  arrow: "Arrow ⇧L · drag · ⇧ 45° steps · ⌥ from center · Space to move",
  polygon: "Polygon · drag, or click for 100 × 100 · ⇧ equal sides · ⌥ from center",
  star: "Star · drag, or click for 100 × 100 · ⇧ equal sides · ⌥ from center",
  pen: "Pen P · click for corners, drag for curves · ⇧ 45° · ⌥ breaks handles · click the first point to close · Enter to finish",
  pencil: "Pencil ⇧P · drag to draw · Esc for Move",
  stack: "Auto layout frame · click where it goes",
  text: "Text T · click where it goes",
  image: "Image · click where it goes",
};

/**
 * The canvas's tip, bottom-right (as Figma's help button): one icon whose tooltip says what a click does with the
 * current tool and the key that switches it; a click opens Keyboard shortcuts. The tip also describes the canvas
 * (aria-describedby) for screen-reader users, so its text stays in the DOM, visually hidden.
 */
export function CanvasStatus() {
  const tool = useStudio((state) => state.tool);
  return (
    <ChromeScope className="studio-status" data-tool={tool}>
      <VisuallyHidden id={CANVAS_STATUS_ID}>{hints[tool]}</VisuallyHidden>
      <IconButton appearance="flat" level="primary" size="sm" aria-label="Help and keyboard shortcuts" aria-keyshortcuts="Shift+?" tooltip={hints[tool]} icon={<Icon name="icon-help-circle-line" />} onClick={openShortcuts} />
    </ChromeScope>
  );
}

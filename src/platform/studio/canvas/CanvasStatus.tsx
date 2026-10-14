import { IconButton } from "../../../components/Button";
import { Icon } from "../../../components/Icon";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { openShortcuts } from "../shell/shortcutsOpen";
import { ChromeScope } from "../shell/ChromeScope";
import { useStudio } from "../store";
import type { StudioTool } from "../types";
import "./canvas.css";

export const CANVAS_STATUS_ID = "studio-canvas-status";

const hints: Record<StudioTool, string> = {
  select: "Select · click a layer to inspect · ⌘/Ctrl-click a nested part · I to interact",
  interact: "Interact · use the examples · V to select",
  hand: "Hand · drag to pan",
  screen: "Screen · click the canvas to add a Screen · Esc for Move",
  stack: "Stack · point where it goes, click to place · Esc for Move",
  text: "Text · point where it goes, click to place · Esc for Move",
  image: "Image · point where it goes, click to place · Esc for Move",
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
      <IconButton appearance="flat" level="primary" size="sm" aria-label="Tips and keyboard shortcuts" aria-keyshortcuts="Shift+?" tooltip={`${hints[tool]} · ? for shortcuts`} icon={<Icon name="icon-help-circle-line" />} onClick={openShortcuts} />
    </ChromeScope>
  );
}

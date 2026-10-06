import { IconButton } from "../../../components/Button";
import { Icon, type IconName } from "../../../components/Icon";
import { ChromeScope } from "../shell/ChromeScope";
import { studioStore, useStudio } from "../store";
import type { StudioTool } from "../types";
import "./canvas.css";

export const canvasTools: ReadonlyArray<{ id: StudioTool; label: string; key: string; icon: IconName }> = [
  { id: "select", label: "Select", key: "V", icon: "icon-cursor-line" },
  { id: "hand", label: "Hand", key: "H", icon: "icon-hand-line" },
  { id: "interact", label: "Interact", key: "I", icon: "icon-cursor-click-line" },
];

/** Floating tool pill, bottom-centre of the canvas (as Figma's toolbar): Select · Hand · Interact (V, H, I). */
export function CanvasTools() {
  const tool = useStudio((state) => state.tool);
  return (
    <ChromeScope className="studio-canvas-tools" role="toolbar" aria-label="Tools">
      {canvasTools.map((item) => (
        <IconButton
          key={item.id}
          appearance={tool === item.id ? "main" : "flat"}
          level="primary"
          size="sm"
          aria-label={item.label}
          aria-pressed={tool === item.id}
          aria-keyshortcuts={item.key}
          tooltip={`${item.label} (${item.key})`}
          icon={<Icon name={item.icon} />}
          onClick={() => studioStore.setState({ tool: item.id })}
        />
      ))}
    </ChromeScope>
  );
}

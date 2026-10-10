import { Fragment, useEffect } from "react";
import { IconButton } from "../../../components/Button";
import { Icon, type IconName } from "../../../components/Icon";
import { openQuickInsert } from "../builder/library/quickInsertState";
import { addFrame } from "../builder/proto/addFrame";
import { paletteInsertable, type Insertable } from "../edit/assets/assets";
import { armPlacement, disarmPlacement } from "../edit/place";
import { ChromeScope } from "../shell/ChromeScope";
import { PALETTE } from "../slots/palette";
import { studioStore, useStudio } from "../store";
import type { StudioTool } from "../types";
import "./canvas.css";

type ToolEntry = { id: StudioTool; label: string; key?: string; icon: IconName };

/** The tools in Figma UI3's order and groups: Move · Hand | Screen | Stack · Text · Image | (Assets) | Interact. */
export const canvasToolGroups: ReadonlyArray<ReadonlyArray<ToolEntry>> = [
  [{ id: "select", label: "Move", key: "V", icon: "icon-cursor-line" }, { id: "hand", label: "Hand", key: "H", icon: "icon-hand-line" }],
  [{ id: "screen", label: "Screen", icon: "icon-layout-alt-01-line" }],
  [{ id: "stack", label: "Stack", key: "A", icon: "icon-rows-01-line" }, { id: "text", label: "Text", key: "T", icon: "icon-type-01-line" }, { id: "image", label: "Image", icon: "icon-image-line" }],
  [{ id: "interact", label: "Interact", key: "I", icon: "icon-cursor-click-line" }],
];
export const canvasTools = canvasToolGroups.flat();

const paletteItem = (id: string) => PALETTE.find((item) => item.id === id);
/** What a placement tool places (Stack and Image are the Assets' items; Text is a plain line to type over). */
function placed(tool: StudioTool): Insertable | null {
  if (tool === "text") return { label: "Text", root: "Text", code: () => "<Text>Text</Text>", refusal: "" };
  const item = paletteItem(tool === "stack" ? "stack" : tool === "image" ? "image" : "");
  return item ? paletteInsertable(item) : null;
}

/**
 * Floating toolbar, bottom-centre of the canvas (Figma UI3's): Move and Hand; Screen (a page you made: a click on the
 * canvas adds one); Stack, Text and Image, placed with the pointer (edit/place.ts: the insertion line shows where, a
 * click places it, then Move again); Assets (⇧I, Quick insert: components, icons, photos); Interact.
 */
export function CanvasTools() {
  const tool = useStudio((state) => state.tool);
  const localPage = useStudio((state) => state.localPage);
  // A placement tool arms the pointer; any other tool, or leaving the page, puts it away.
  useEffect(() => {
    if (tool === "screen" && localPage) {
      if (!armPlacement({ label: "Screen", run: () => { void addFrame(localPage, "screen"); } })) studioStore.setState({ tool: "select" });
    } else if (tool === "stack" || tool === "text" || tool === "image") {
      const item = placed(tool);
      if (!item || !armPlacement({ label: item.label, item })) studioStore.setState({ tool: "select" });
    } else if (tool === "screen") {
      studioStore.setState({ tool: "select" });
    }
    return () => disarmPlacement();
  }, [tool, localPage]);
  return (
    <ChromeScope className="studio-canvas-tools" role="toolbar" aria-label="Tools">
      {canvasToolGroups.map((group, index) => (
        <Fragment key={group[0].id}>
          {index ? <span className="studio-canvas-tools__divider" aria-hidden="true" /> : null}
          {group.map((item) => {
            const off = item.id === "screen" && !localPage;
            return (
              <IconButton
                key={item.id}
                appearance={tool === item.id ? "main" : "flat"}
                level="primary"
                size="sm"
                aria-label={item.label}
                aria-pressed={tool === item.id}
                aria-keyshortcuts={item.key}
                disabled={off}
                tooltip={off ? "Screen · on a page you made" : `${item.label}${item.key ? ` (${item.key})` : ""}`}
                icon={<Icon name={item.icon} />}
                onClick={() => studioStore.setState({ tool: item.id })}
              />
            );
          })}
          {index === 2 ? (
            <IconButton appearance="flat" level="primary" size="sm" aria-label="Assets" aria-keyshortcuts="Shift+I" tooltip="Assets (⇧I)" icon={<Icon name="icon-cube-line" />} onClick={() => openQuickInsert()} />
          ) : null}
        </Fragment>
      ))}
    </ChromeScope>
  );
}

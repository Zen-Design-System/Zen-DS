import { Fragment, useEffect, useState } from "react";
import { IconButton } from "../../../components/Button";
import { Icon, type IconName } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
import { openQuickInsert } from "../builder/library/quickInsertState";
import { armFrameDraw, disarmFrameDraw } from "../builder/frameMove";
import { armDraw, disarmDraw } from "../draw/drawTool";
import { paletteInsertable, type Insertable } from "../edit/assets/assets";
import { armPlacement, disarmPlacement } from "../edit/place";
import { ChromeScope } from "../shell/ChromeScope";
import { PALETTE } from "../slots/palette";
import { studioStore, useStudio } from "../store";
import type { StudioShapeTool, StudioTool } from "../types";
import "./canvas.css";

type ToolEntry = { id: StudioTool; label: string; key?: string; icon: IconName };

/** Figma's shape tools in its menu's order (UI3: the Rectangle button's menu). */
export const shapeTools: ReadonlyArray<ToolEntry & { id: StudioShapeTool }> = [
  { id: "rectangle", label: "Rectangle", key: "R", icon: "icon-square-line" },
  { id: "line", label: "Line", key: "L", icon: "icon-minus-line" },
  { id: "arrow", label: "Arrow", key: "⇧L", icon: "icon-arrow-up-right-line" },
  { id: "ellipse", label: "Ellipse", key: "O", icon: "icon-circle-line" },
  { id: "polygon", label: "Polygon", icon: "icon-triangle-line" },
  { id: "star", label: "Star", icon: "icon-star-01-line" },
];
const isShapeTool = (tool: StudioTool): tool is StudioShapeTool => shapeTools.some((entry) => entry.id === tool);

/** The tools in Figma UI3's order and groups: Move · Hand | Frame | Shapes | Stack · Text · Image | (Assets) | Interact. */
export const canvasToolGroups: ReadonlyArray<ReadonlyArray<ToolEntry>> = [
  [{ id: "select", label: "Move", key: "V", icon: "icon-cursor-line" }, { id: "hand", label: "Hand", key: "H", icon: "icon-hand-line" }],
  [{ id: "frame", label: "Frame", key: "F", icon: "icon-layout-alt-01-line" }],
  shapeTools,
  [{ id: "stack", label: "Stack", icon: "icon-rows-01-line" }, { id: "text", label: "Text", key: "T", icon: "icon-type-01-line" }, { id: "image", label: "Image", icon: "icon-image-line" }],
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

/** The shape tool the toolbar shows: the one in use, else the last one used (Figma keeps the last). */
let lastShape: StudioShapeTool = "rectangle";

/**
 * Figma UI3's shape button: the last shape tool, and a chevron that lists all six with their keys. Off (the reason in
 * the tooltip) on a page that is not one you made.
 */
function ShapeTools({ tool, off }: { tool: StudioTool; off: boolean }) {
  const [shown, setShown] = useState<StudioShapeTool>(isShapeTool(tool) ? tool : lastShape);
  useEffect(() => { if (isShapeTool(tool)) { lastShape = tool; setShown(tool); } }, [tool]);
  const entry = shapeTools.find((item) => item.id === shown) ?? shapeTools[0];
  const pick = (id: StudioShapeTool) => { lastShape = id; setShown(id); studioStore.setState({ tool: id }); };
  return (
    <span className="studio-canvas-tools__split">
      <IconButton
        appearance={isShapeTool(tool) ? "main" : "flat"}
        level="primary"
        size="sm"
        aria-label={entry.label}
        aria-pressed={tool === entry.id}
        aria-keyshortcuts={entry.key?.replace("⇧", "Shift+")}
        disabled={off}
        tooltip={off ? "Shapes · on a page you made" : `${entry.label}${entry.key ? ` (${entry.key})` : ""}`}
        icon={<Icon name={entry.icon} />}
        onClick={() => pick(entry.id)}
      />
      <Menu
        aria-label="Shape tools"
        items={shapeTools.map((item) => ({ id: item.id, label: item.label, icon: item.icon, shortcut: item.key, onSelect: () => pick(item.id) }))}
        // zen-allow-no-action: the Menu's trigger (Menu wires its click and keys).
        trigger={<IconButton className="studio-canvas-tools__more" appearance="flat" level="primary" size="sm" aria-label="Shape tools" disabled={off} tooltip="Shape tools" icon={<Icon name="icon-chevron-down-line" />} />}
      />
    </span>
  );
}

/**
 * Floating toolbar, bottom-centre of the canvas (Figma UI3's): Move and Hand; Frame (a page you made: drag a box for a
 * Screen of that size, or click for one on the page's device there; inside a Screen, a frame there: draw/drawTool.ts);
 * the shape tools (draw/drawTool.ts: Rectangle R, Line L, Arrow ⇧L, Ellipse O, Polygon, Star); Stack, Text and Image,
 * placed with the pointer (edit/place.ts: the insertion line shows where, a click places it, then Move again); Assets
 * (⇧I, Quick insert: components, icons, photos); Interact.
 */
export function CanvasTools() {
  const tool = useStudio((state) => state.tool);
  const localPage = useStudio((state) => state.localPage);
  // A placement or drawing tool arms the pointer; any other tool, or leaving the page, puts it away.
  useEffect(() => {
    if (tool === "frame" && localPage) {
      if (!armFrameDraw(localPage)) studioStore.setState({ tool: "select" });
    } else if (isShapeTool(tool) && localPage) {
      if (!armDraw(tool)) studioStore.setState({ tool: "select" });
    } else if (tool === "stack" || tool === "text" || tool === "image") {
      const item = placed(tool);
      if (!item || !armPlacement({ label: item.label, item })) studioStore.setState({ tool: "select" });
    } else if (tool === "frame" || isShapeTool(tool) || !canvasTools.some((entry) => entry.id === tool)) {
      // No page you made here, or a tool this Studio no longer has (a session kept from before): Move.
      studioStore.setState({ tool: "select" });
    }
    return () => { disarmPlacement(); disarmFrameDraw(); disarmDraw(); };
  }, [tool, localPage]);
  return (
    <ChromeScope className="studio-canvas-tools" role="toolbar" aria-label="Tools">
      {canvasToolGroups.map((group, index) => (
        <Fragment key={group[0].id}>
          {index ? <span className="studio-canvas-tools__divider" aria-hidden="true" /> : null}
          {group === shapeTools ? <ShapeTools tool={tool} off={!localPage} /> : group.map((item) => {
            const off = item.id === "frame" && !localPage;
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
                tooltip={off ? "Frame · on a page you made" : `${item.label}${item.key ? ` (${item.key})` : ""}`}
                icon={<Icon name={item.icon} />}
                onClick={() => studioStore.setState({ tool: item.id })}
              />
            );
          })}
          {index === 3 ? (
            <IconButton appearance="flat" level="primary" size="sm" aria-label="Assets" aria-keyshortcuts="Shift+I" tooltip="Assets (⇧I)" icon={<Icon name="icon-cube-line" />} onClick={() => openQuickInsert()} />
          ) : null}
        </Fragment>
      ))}
    </ChromeScope>
  );
}

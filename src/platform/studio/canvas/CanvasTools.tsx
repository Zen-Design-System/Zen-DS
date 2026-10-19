import { Fragment, useEffect, useState } from "react";
import { placeImages } from "../draw/placeImage";
import { installFileDrop } from "./fileDrop";
import { IconButton } from "../../../components/Button";
import { Icon, type IconName } from "../../../components/Icon";
import { Menu } from "../../../components/Menu";
import { openQuickInsert } from "../builder/library/quickInsertState";
import { armFrameDraw, disarmFrameDraw } from "../builder/frameMove";
import { armDraw, disarmDraw } from "../draw/drawTool";
import { paletteInsertable, type Insertable } from "../edit/assets/assets";
import { armPlacement, disarmPlacement } from "../edit/place";
import { toggleAgent, useAgent } from "../agent/agentStore";
import { ChromeScope } from "../shell/ChromeScope";
import { modKey } from "../shell/modKey";
import { tip } from "../shell/ShortcutTip";
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

/** Figma UI3's Frame button and its menu: Frame F and Section ⇧S (Slice S is not in Zen Studio yet). */
export const frameTools: ReadonlyArray<ToolEntry & { id: "frame" | "section" }> = [
  { id: "frame", label: "Frame", key: "F", icon: "icon-layout-alt-01-line" },
  { id: "section", label: "Section", key: "⇧S", icon: "icon-browser-line" },
];
const isFrameTool = (tool: StudioTool): tool is "frame" | "section" => tool === "frame" || tool === "section";

/**
 * The tools in Figma UI3's order and groups: Move · Hand | Frame | Shapes | Text · Image | (Assets); example pages also
 * have Stack (placed in a layout) and Interact (use the examples).
 */
export const canvasToolGroups: ReadonlyArray<ReadonlyArray<ToolEntry>> = [
  [{ id: "select", label: "Move", key: "V", icon: "icon-cursor-line" }, { id: "hand", label: "Hand", key: "H", icon: "icon-hand-line" }],
  frameTools,
  shapeTools,
  [{ id: "stack", label: "Stack", icon: "icon-rows-01-line" }, { id: "text", label: "Text", key: "T", icon: "icon-type-01-line" }, { id: "image", label: "Place image/video", key: `⇧${modKey}K`, icon: "icon-image-line" }],
  [{ id: "interact", label: "Interact", key: "I", icon: "icon-cursor-click-line" }],
];
export const canvasTools = canvasToolGroups.flat();

/** A tool key as aria-keyshortcuts writes it ("⇧⌘K" → "Shift+Meta+K"). */
const ariaKeys = (key?: string) => key?.replace("⇧", "Shift+").replace("⌘", "Meta+").replace("⌥", "Alt+");
const paletteItem = (id: string) => PALETTE.find((item) => item.id === id);
/** What a placement tool places (Stack and Image are the Assets' items; Text is a plain line to type over). */
function placed(tool: StudioTool): Insertable | null {
  if (tool === "text") return { label: "Text", root: "Text", code: () => "<Text>Text</Text>", refusal: "" };
  const item = paletteItem(tool === "stack" ? "stack" : tool === "image" ? "image" : "");
  return item ? paletteInsertable(item) : null;
}

/** The shape tool the toolbar shows: the one in use, else the last one used (Figma keeps the last). */
let lastShape: StudioShapeTool = "rectangle";
let lastFrame: "frame" | "section" = "frame";

/** Figma UI3's Frame button: the last of Frame / Section, and a chevron that lists both with their keys. */
function FrameTools({ tool, off }: { tool: StudioTool; off: boolean }) {
  const [shown, setShown] = useState<"frame" | "section">(isFrameTool(tool) ? tool : lastFrame);
  useEffect(() => { if (isFrameTool(tool)) { lastFrame = tool; setShown(tool); } }, [tool]);
  const entry = frameTools.find((item) => item.id === shown) ?? frameTools[0];
  const pick = (id: "frame" | "section") => { lastFrame = id; setShown(id); studioStore.setState({ tool: id }); };
  return (
    <span className="studio-canvas-tools__split">
      <IconButton
        appearance={isFrameTool(tool) ? "main" : "flat"}
        level="primary"
        size="sm"
        aria-label={entry.label}
        aria-pressed={tool === entry.id}
        aria-keyshortcuts={ariaKeys(entry.key)}
        disabled={off}
        tooltip={off ? `${entry.label} works on a page you made` : tip(entry.label, entry.key)}
        icon={<Icon name={entry.icon} />}
        onClick={() => pick(entry.id)}
      />
      <Menu
        aria-label="Frame tools"
        items={frameTools.map((item) => ({ id: item.id, label: item.label, icon: item.icon, shortcut: item.key, onSelect: () => pick(item.id) }))}
        // zen-allow-no-action: the Menu's trigger (Menu wires its click and keys).
        trigger={<IconButton className="studio-canvas-tools__more" appearance="flat" level="primary" size="sm" aria-label="Frame tools" disabled={off} tooltip="Frame tools" icon={<Icon name="icon-chevron-down-line" />} />}
      />
    </span>
  );
}

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
        aria-keyshortcuts={ariaKeys(entry.key)}
        disabled={off}
        tooltip={off ? "Shapes work on a page you made" : tip(entry.label, entry.key)}
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
 * Floating toolbar, bottom-centre of the canvas (Figma UI3's): Move and Hand; Frame and Section (a page you made: drag a
 * box for a frame of that size, a click for Figma's 100 × 100 one, the right panel's presets; inside a Screen, a frame
 * there: draw/drawTool.ts; Section ⇧S draws a named board area the frames under it belong to: builder/frameMove.ts);
 * the shape tools (draw/drawTool.ts: Rectangle R, Line L, Arrow ⇧L, Ellipse O, Polygon, Star); Text T (a page you
 * made: Figma's, a click for Auto width text or a drag for a text box, typing at once; example pages: placed with the
 * pointer); Stack and Image, placed with the pointer (edit/place.ts: the insertion line shows where, a click places it,
 * then Move again); Assets
 * (⇧I, Quick insert: components, icons, photos); Interact.
 */
export function CanvasTools() {
  const tool = useStudio((state) => state.tool);
  const localPage = useStudio((state) => state.localPage);
  // A placement or drawing tool arms the pointer; any other tool, or leaving the page, puts it away.
  useEffect(() => {
    if (isFrameTool(tool) && localPage) {
      if (!armFrameDraw(localPage, tool)) studioStore.setState({ tool: "select" });
    } else if (isShapeTool(tool) && localPage) {
      if (!armDraw(tool)) studioStore.setState({ tool: "select" });
    } else if (tool === "text" && localPage) {
      // Figma's Text tool on a page you made (F6): a click or a drag at the pointer, then typing (draw/drawTool.ts).
      if (!armDraw("text")) studioStore.setState({ tool: "select" });
    } else if (tool === "image" && localPage) {
      // Figma's Place image on a page you made (F8): the file dialog, then a click per picture (draw/placeImage.ts).
      void placeImages(() => armDraw("image"));
    } else if (tool === "stack" || tool === "text" || tool === "image") {
      const item = placed(tool);
      if (!item || !armPlacement({ label: item.label, item })) studioStore.setState({ tool: "select" });
    } else if (isFrameTool(tool) || isShapeTool(tool) || !canvasTools.some((entry) => entry.id === tool)) {
      // No page you made here, or a tool this Studio no longer has (a session kept from before): Move.
      studioStore.setState({ tool: "select" });
    }
    return () => { disarmPlacement(); disarmFrameDraw(); disarmDraw(); };
  }, [tool, localPage]);
  // Pictures dropped from the computer onto a frame (F8: canvas/fileDrop.ts).
  useEffect(() => installFileDrop(localPage), [localPage]);
  return (
    <ChromeScope className="studio-canvas-tools" role="toolbar" aria-label="Tools">
      {canvasToolGroups.map((group, index) => {
        // A page you made is a Figma design page: no Stack tool (Frame F, then Add auto layout ⇧A) and no Interact
        // (the examples' tool); I is Figma's Pick color there (edit/figmaNotYet.ts).
        const items = localPage ? group.filter((item) => item.id !== "stack" && item.id !== "interact") : group;
        if (!items.length) return null;
        return (
        <Fragment key={group[0].id}>
          {index ? <span className="studio-canvas-tools__divider" aria-hidden="true" /> : null}
          {group === shapeTools ? <ShapeTools tool={tool} off={!localPage} /> : group === frameTools ? <FrameTools tool={tool} off={!localPage} /> : items.map((item) => (
              <IconButton
                key={item.id}
                appearance={tool === item.id ? "main" : "flat"}
                level="primary"
                size="sm"
                aria-label={item.label}
                aria-pressed={tool === item.id}
                aria-keyshortcuts={ariaKeys(item.key)}
                tooltip={tip(item.label, item.key)}
                icon={<Icon name={item.icon} />}
                onClick={() => studioStore.setState({ tool: item.id })}
              />
          ))}
          {index === 3 ? (
            <IconButton appearance="flat" level="primary" size="sm" aria-label="Assets" aria-keyshortcuts="Shift+I" tooltip={tip("Assets", "⇧I")} icon={<Icon name="icon-cube-line" />} onClick={() => openQuickInsert()} />
          ) : null}
        </Fragment>
        );
      })}
      <ZenAgentButton />
    </ChromeScope>
  );
}

/** Zen Agent (agent/AgentPanel.tsx) at the toolbar's end, as Figma UI3 keeps its AI there. */
function ZenAgentButton() {
  const open = useAgent().open;
  return (
    <>
      <span className="studio-canvas-tools__divider" aria-hidden="true" />
      <IconButton appearance={open ? "main" : "flat"} level="primary" size="sm" aria-label="Zen Agent" aria-pressed={open} aria-keyshortcuts="Meta+J" tooltip={tip("Zen Agent", `${modKey}J`)} icon={<Icon name="icon-stars-01-line" />} onClick={toggleAgent} />
    </>
  );
}

import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { Text } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { modKey, presentShortcut } from "./modKey";
import { detachShortcut } from "../inspector/detach";
import { autoLayoutShortcut, frameSelectionShortcut } from "../select/wrapSelection";
import { duplicateShortcut, removeShortcut } from "../slots/actions";
import { clipboardShortcuts } from "../edit/clipboard";
import { setShortcutsOpen, useShortcutsOpen } from "./shortcutsOpen";
import "./shell.css";

const groups: ReadonlyArray<{ label: string; rows: ReadonlyArray<[string, string]> }> = [
  { label: "Tools", rows: [["Select", "V"], ["Hand", "H"], ["Frame: inside a Screen a frame, on the canvas a Screen (a page you made)", "F · A"], ["Rectangle · Ellipse · Line · Arrow", "R · O · L · ⇧L"], ["While drawing: equal sides · from the centre · move it", "⇧ · ⌥ · Space"], ["Interact (use the examples)", "I"], ["Pan while held", "Space"]] },
  { label: "View", rows: [["Zoom in", `+ · ${modKey}+`], ["Zoom out", `− · ${modKey}−`], ["Zoom to 100%", `${modKey}0 · ⇧0`], ["Zoom to fit", "⇧1"], ["Zoom to selection", "⇧2"], ["Present the selected frame", presentShortcut], ["Play a page you made (prototype)", "P"], ["Hide or show the side panels", `${modKey}\\`]] },
  { label: "Selection", rows: [["Select the parent layer, then the frame", "Esc"], ["Select the first child layer", "Enter"], ["Select a nested part (read-only)", `${modKey} + click`], ["Go into a selected component: nested instance, then parts", "Double-click"], ["Add to the selection (canvas or Layers)", "⇧ + click"], ["Select the next / previous sibling", "Tab · ⇧Tab"], ["Select the parent layer", "⇧Enter · \\"], ["Select every layer of the parent", `${modKey}A`], ["Measure to another layer", "⌥ + point"]] },
  { label: "Edit (Admin)", rows: [["Quick insert: find a component and add it", "⇧I"], ["Undo the last source edit", `${modKey}Z`], ["Redo", `⇧${modKey}Z`], ["Save the drafts to the source files", `${modKey}S`], ["Detach the selected instance", detachShortcut], ["Duplicate the selected layer", duplicateShortcut], ["Remove the selected layer", removeShortcut], ["Add auto layout (a frame takes it; other layers are wrapped)", autoLayoutShortcut], ["Remove auto layout (layers keep their place)", "⌥⇧A"], ["Bring forward · send backward", `${modKey}] · ${modKey}[`], ["Bring to front · send to back", `⌥${modKey}] · ⌥${modKey}[`], ["Align left · right · top · bottom (a layer in a free frame)", "⌥A · ⌥D · ⌥W · ⌥S"], ["Align centre horizontally · vertically", "⌥H · ⌥V"], ["A shape's opacity 10 … 90 %, 100 %", "1 … 9 · 0"], ["Wrap the selection in a Box (frame)", frameSelectionShortcut], ["Edit text in place", "Enter · double-click"], ["Move earlier / later among the siblings", "← ↑ · → ↓"], ["Move by dragging (⌥ drops a copy)", "Drag"], ["Move a frame by its name (⌥ drops a copy)", "Drag"], ["Nudge the selected frame, or a layer in a free frame (⇧ 10 px)", "← ↑ → ↓"], ["Copy · cut · paste the layer", `${clipboardShortcuts.copy} · ${clipboardShortcuts.cut} · ${clipboardShortcuts.paste}`], ["Paste to replace the layer", clipboardShortcuts.replace], ["Copy · paste properties", `${clipboardShortcuts.copyProps} · ${clipboardShortcuts.pasteProps}`]] },
  { label: "Navigate", rows: [["Quick actions (search every action)", `${modKey}/`], ["Search pages", `${modKey}K`], ["Zen Agent: design by chat", `${modKey}J`], ["Keyboard shortcuts", "?"]] },
];

/** Every Studio shortcut, grouped (brand menu › Keyboard shortcuts…, the canvas "?" button, or ?). */
export function ShortcutsDialog() {
  const open = useShortcutsOpen();
  const onOpenChange = setShortcutsOpen;
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Keyboard shortcuts" icon={false} className="studio-shortcuts" primaryAction={{ label: "Close" }}>
      <div className="studio-shortcuts__groups">
        {groups.map((group) => (
          <section key={group.label} className="studio-shortcuts__group" aria-label={group.label}>
            <Text as="p" textStyle="Body/Small/Bold" tone="base">{group.label}</Text>
            <DescriptionList items={group.rows.map(([action, keys]) => ({ term: action, description: <kbd className={`studio-kbd ${typographyStyles["Body/Code/Regular"]}`}>{keys}</kbd> }))} />
          </section>
        ))}
      </div>
    </Dialog>
  );
}

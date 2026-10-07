import { useSyncExternalStore } from "react";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { Text } from "../../../components/Text";
import { typographyStyles } from "../../../tokens/typography.generated";
import { modKey } from "../canvas/ZoomControls";
import { detachShortcut } from "../inspector/detach";
import { autoLayoutShortcut, frameSelectionShortcut } from "../select/wrapSelection";
import { duplicateShortcut, removeShortcut } from "../slots/actions";
import { clipboardShortcuts } from "../edit/clipboard";
import "./shell.css";

const groups: ReadonlyArray<{ label: string; rows: ReadonlyArray<[string, string]> }> = [
  { label: "Tools", rows: [["Select", "V"], ["Hand", "H"], ["Interact (use the examples)", "I"], ["Pan while held", "Space"]] },
  { label: "View", rows: [["Zoom in", `${modKey}+`], ["Zoom out", `${modKey}−`], ["Zoom to 100%", `${modKey}0 · ⇧0`], ["Zoom to fit", "⇧1"], ["Zoom to selection", "⇧2"], ["Present the selected frame", "F"], ["Play a page you made (prototype)", "P"], ["Hide or show the side panels", `${modKey}\\`]] },
  { label: "Selection", rows: [["Select the parent layer, then the frame", "Esc"], ["Select the first child layer", "Enter"], ["Select a nested part (read-only)", `${modKey} + click`], ["Go into a selected component: nested instance, then parts", "Double-click"], ["Add to the selection (canvas or Layers)", "⇧ + click"], ["Select the next / previous sibling", "Tab · ⇧Tab"], ["Select the parent layer", "⇧Enter"], ["Measure to another layer", "⌥ + point"]] },
  { label: "Edit (Admin)", rows: [["Quick insert: find a component and add it", "⇧I"], ["Undo the last source edit", `${modKey}Z`], ["Redo", `⇧${modKey}Z`], ["Save the drafts to the source files", `${modKey}S`], ["Detach the selected instance", detachShortcut], ["Duplicate the selected layer", duplicateShortcut], ["Remove the selected layer", removeShortcut], ["Wrap the selection in a Stack (auto layout)", autoLayoutShortcut], ["Wrap the selection in a Box (frame)", frameSelectionShortcut], ["Edit text in place", "Enter · double-click"], ["Move earlier / later among the siblings", "← ↑ · → ↓"], ["Move by dragging (⌥ drops a copy)", "Drag"], ["Copy · cut · paste the layer", `${clipboardShortcuts.copy} · ${clipboardShortcuts.cut} · ${clipboardShortcuts.paste}`], ["Paste to replace the layer", clipboardShortcuts.replace], ["Copy · paste properties", `${clipboardShortcuts.copyProps} · ${clipboardShortcuts.pasteProps}`]] },
  { label: "Navigate", rows: [["Quick actions (search every action)", `${modKey}/`], ["Search pages", `${modKey}K`], ["Keyboard shortcuts", "?"]] },
];

/* Open state as a tiny external store: the brand menu, the canvas "?" button and the ? key all open the same dialog. */
let shortcutsOpen = false;
const openListeners = new Set<() => void>();
const subscribeOpen = (listener: () => void) => { openListeners.add(listener); return () => { openListeners.delete(listener); }; };

export function setShortcutsOpen(open: boolean) {
  if (open === shortcutsOpen) return;
  shortcutsOpen = open;
  openListeners.forEach((listener) => listener());
}

/** Opens the Keyboard shortcuts dialog. */
export const openShortcuts = () => setShortcutsOpen(true);

/** Every Studio shortcut, grouped (brand menu › Keyboard shortcuts…, the canvas "?" button, or ?). */
export function ShortcutsDialog() {
  const open = useSyncExternalStore(subscribeOpen, () => shortcutsOpen, () => false);
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

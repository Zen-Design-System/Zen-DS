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

/** Figma's names and groups (its Keyboard shortcuts panel); Zen-only rows say what they are in design words. */
const groups: ReadonlyArray<{ label: string; rows: ReadonlyArray<[string, string]> }> = [
  { label: "Tools", rows: [["Move", "V"], ["Hand", "H · Space"], ["Frame", "F · A"], ["Section", "⇧S"], ["Rectangle", "R"], ["Ellipse", "O"], ["Line", "L"], ["Arrow", "⇧L"], ["Pen", "P"], ["Pencil", "⇧P"], ["Text", "T"], ["Place image/video", `⇧${modKey}K`], ["Constrain proportions · from center · move while drawing", "⇧ · ⌥ · Space"], ["Interact (example pages; ⌘K › Interact on a page you made)", "I"]] },
  { label: "View", rows: [["Zoom in", `+ · ${modKey}+`], ["Zoom out", `− · ${modKey}−`], ["Zoom to 100%", "⇧0"], ["Zoom to fit", "⇧1"], ["Zoom to selection", "⇧2"], ["Zoom to next frame · previous frame", "N · ⇧N"], ["Find and replace", `${modKey}F`], ["Pixel grid", `${modKey}'`], ...(modKey === "⌘" ? [["Outlines", "⌘Y"] as [string, string]] : []), ["Rulers", "⇧R"], ["Layout guides", modKey === "⌘" ? "⌃G" : "Ctrl+Alt+G"], ["Present", presentShortcut], ["Show/Hide UI", `${modKey}\\`]] },
  { label: "Selection", rows: [["Select children", "Enter"], ["Select parent", "⇧Enter · \\ · Esc"], ["Deep select", `${modKey} click`], ["Add to selection", "⇧ click"], ["Select next / previous sibling", "Tab · ⇧Tab"], ["Select all", `${modKey}A`], ["Measure to other layers", "⌥"]] },
  { label: "Edit", rows: [["Undo", `${modKey}Z`], ["Redo", `⇧${modKey}Z`], ["Save", `${modKey}S`], ["Copy · cut · paste", `${clipboardShortcuts.copy} · ${clipboardShortcuts.cut} · ${clipboardShortcuts.paste}`], ["Paste to replace", clipboardShortcuts.replace], ["Copy properties · paste properties", `${clipboardShortcuts.copyProps} · ${clipboardShortcuts.pasteProps}`], ["Duplicate", duplicateShortcut], ["Delete", removeShortcut], ["Delete section, keep its frames", `${modKey}⌫`], ["Edit text", "Enter · double-click"], ["New line in a text · leave the text", "Enter · Esc"], ["Show/Hide", `⇧${modKey}H`], ["Lock/Unlock", `⇧${modKey}L`], ["Rename", `${modKey}R`], ["Create component", `⌥${modKey}K`], ["Detach instance", detachShortcut]] },
  { label: "Arrange", rows: [["Bring forward · send backward", `${modKey}] · ${modKey}[`], ["Bring to front · send to back", `⌥${modKey}] · ⌥${modKey}[`], ["Align left · right · top · bottom", "⌥A · ⌥D · ⌥W · ⌥S"], ["Align horizontal centers · vertical centers", "⌥H · ⌥V"], ["Move in auto layout", "← ↑ → ↓"], ["Nudge (⇧ 10)", "← ↑ → ↓"], ["Opacity 10 … 90%, 100%", "1 … 9 · 0"]] },
  { label: "Auto layout", rows: [["Add auto layout", autoLayoutShortcut], ["Remove auto layout", "⌥⇧A"], ["Frame selection", frameSelectionShortcut]] },
  { label: "Navigate", rows: [["Actions", `${modKey}K · ${modKey}/`], ["Assets", "⇧I"], ["Find a layer", `${modKey}F`], ["Collapse layers", "⌥L"], ["Expand or collapse a layer and everything in it", "⌥ click"], ["Zen Agent", `${modKey}J`], ["Keyboard shortcuts", "?"]] },
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

import { useContext, useState } from "react";
import { SheetCode, SheetKeys, SheetTable } from "../components/SheetTable";
import { TableText } from "../components/Table";
import { PlatformCode } from "./PlatformCode";
import { PlatformTypographyContext } from "./PlatformTemplate";
import { ComponentPreview, PlaygroundControls, PlaygroundFilterChip } from "./appLayer/playgroundParts";

/* The Sheet Table page playground: Figma Table/Sheet's two examples (doc frame 17100:7996), a props reference and a
   keyboard reference, with or without their last rows. */

type Prop = { id: string; type: string; fallback: string | null; description: string };
const PROPS: Prop[] = [
  { id: "theme", type: '"shadow" | "default" | "pale" | "border" | "flat-border" | "on-container" | "solid" | "subtle"', fallback: '"shadow"', description: "Figma Theme, picked by where the card sits: Default on Canvas/Default, Shadow beside a shadowed Sidebar, Border on a white page, Flat-Border on Canvas/Flat; colour Subtle on Canvas/Default, Pale on a white page; Solid for the one widget that stands out." },
  { id: "color", type: '"neutral" | "brand" | "cyan" | "violet" | "green" | "yellow" | "orange" | "blue" | "purple" | "accent"', fallback: '"neutral"', description: "Figma Color, for theme=\"pale\", \"subtle\" and \"solid\"; the other themes ignore it." },
  { id: "surface?", type: '"default" | "alt"', fallback: null, description: "Figma Surface on Default and Border: alt on a white Canvas/Alt page, where Surface/Default is the canvas itself." },
  { id: "onClick?", type: "(event: MouseEvent | KeyboardEvent) => void", fallback: null, description: "Makes the whole card one action (role=button, Enter and Space). Keep other controls out of a clickable card." },
];

type Shortcut = { id: string; keys: string; action: string };
const SHORTCUTS: Shortcut[] = [
  { id: "tab", keys: "Tab / Shift + Tab", action: "Moves focus to the next or the previous card that is one action." },
  { id: "enter", keys: "Enter / Space", action: "Activates the focused card, as a click does." },
  { id: "arrows", keys: "→ / ←", action: "Moves between the options of a group of selectable cards; the focused option is selected." },
  { id: "esc", keys: "Esc", action: "Closes the card's More menu and returns focus to its button." },
];

const KINDS = [{ id: "props", label: "Props reference" }, { id: "keyboard", label: "Keyboard" }];
const ROWS = [{ id: "all", label: "All rows" }, { id: "two", label: "Two rows" }, { id: "none", label: "No rows" }];

export function SheetTablePlayground() {
  const previewTypography = useContext(PlatformTypographyContext);
  const [kind, setKind] = useState("props");
  const [rowChoice, setRowChoice] = useState<string | undefined>(undefined);
  const take = <T,>(rows: T[]) => (rowChoice === "none" ? [] : rowChoice === "two" ? rows.slice(0, 2) : rows);
  const code = kind === "props"
    ? `<SheetTable aria-label="Card props" rows={props} minWidth="680px"
  columns={[
    { id: "prop", header: "Prop", width: "18%", cell: (row) => <SheetCode>{row.name}</SheetCode> },
    { id: "type", header: "Type", width: "34%", cell: (row) => <SheetCode>{row.type}</SheetCode> },
    { id: "default", header: "Default", width: "12%", cell: (row) => row.default ? <SheetCode>{row.default}</SheetCode> : <TableText>—</TableText> },
    { id: "description", header: "Description", cell: (row) => <TableText>{row.description}</TableText> },
  ]}
  empty={<TableText>This component has no props of its own.</TableText>} />`
    : `<SheetTable aria-label="Keyboard" rows={shortcuts}
  columns={[
    { id: "keys", header: "Key", width: "32%", cell: (row) => <SheetKeys value={row.keys} /> },
    { id: "action", header: "Action", cell: (row) => <TableText>{row.action}</TableText> },
  ]}
  empty={<TableText>No keyboard shortcuts.</TableText>} />`;
  return (
    <ComponentPreview className="platform-example-panel platform-example-panel--stack">
      <h2 className="platform-main-component__title">Sheet Table</h2>
      <PlaygroundControls aria-label="Sheet Table playground controls">
        <PlaygroundFilterChip label="Content" value={kind} onChange={(value) => setKind(String(value) || "props")} options={KINDS} />
        <PlaygroundFilterChip label="Rows" value={rowChoice} onChange={(value) => setRowChoice(String(value) || undefined)} options={ROWS} />
      </PlaygroundControls>
      <div data-typography={previewTypography} className="platform-example-row platform-sheet-table-preview">
        {kind === "props" ? (
          <SheetTable aria-label="Card props" rows={take(PROPS)} minWidth="680px" empty={<TableText>This component has no props of its own.</TableText>}
            columns={[
              { id: "prop", header: "Prop", width: "18%", cell: (row) => <SheetCode>{row.id}</SheetCode> },
              { id: "type", header: "Type", width: "34%", cell: (row) => <SheetCode>{row.type}</SheetCode> },
              { id: "default", header: "Default", width: "12%", cell: (row) => (row.fallback ? <SheetCode>{row.fallback}</SheetCode> : <TableText>—</TableText>) },
              { id: "description", header: "Description", cell: (row) => <TableText>{row.description}</TableText> },
            ]} />
        ) : (
          <SheetTable aria-label="Keyboard" rows={take(SHORTCUTS)} empty={<TableText>No keyboard shortcuts.</TableText>}
            columns={[
              { id: "keys", header: "Key", width: "32%", cell: (row) => <SheetKeys value={row.keys} /> },
              { id: "action", header: "Action", cell: (row) => <TableText>{row.action}</TableText> },
            ]} />
        )}
      </div>
      <PlatformCode code={`import { SheetCode, SheetKeys, SheetTable, TableText } from "@zen-ds/react";

${code}`} />
    </ComponentPreview>
  );
}

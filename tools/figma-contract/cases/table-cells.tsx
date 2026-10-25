// Harness case kinds for the table-cells suites (tools/figma-contract/suites). cases.tsx merges every group's kinds.
// `tableCell` draws one body cell the way an app does: a real Table (header + one row) in a box as wide as the Figma
// cell (the primitive plus Spacing/Padding/Medium on both sides), one column whose width is that box (its header empty, so
// it never widens the column), so the cell's own CSS (the FIXED row, the one-line Content slot, the fixed-column rules)
// applies. The column is plain JSON (`content`, `field`, `mediaField`, `actions`…); a cell the Table has no `content` for
// is named by `cell` and drawn below.
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Table, TableBadges, type TableColumn } from "../../../src/components/Table";
import { Badge } from "../../../src/components/Badge";
import { AvatarStack } from "../../../src/components/Avatar";
import { RadioButton } from "../../../src/components/RadioButton";

type Props = Record<string, any>;
type Row = Record<string, unknown>;

/** Cells drawn by a column's `cell` function (no `content` covers them). */
const cells: Record<string, () => ReactNode> = {
  // Figma Badge-Cell's default Items slot: one Badge Medium · Neutral · Subtle with its leading dot.
  badges: () => <TableBadges><Badge size="md" theme="neutral" background="subtle">Badge</Badge></TableBadges>,
  // Control-Cell Type=Radio-Button: the Table has no radio content, so the column draws the mark itself.
  radio: () => <RadioButton aria-label="Select row" />,
  // Group-Avatar-Cell: Avatar/Stack Small · Subtle, three avatars and the "+2" More chip.
  avatarStack: () => (
    <AvatarStack size="sm" background="subtle" max={3} showMore
      items={[{ theme: "accent", children: "A" }, { theme: "blue", children: "B" }, { theme: "brown", children: "C" }, { theme: "neutral", children: "D" }, { theme: "neutral", children: "E" }]} />
  ),
};

/** Puts the Table's only editable cell in Edit (Figma State=Edit / Editabled-Cell), as a press on it does, before the first
 *  paint (a discrete event: React applies the edit at once). */
function Editing({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    ref.current?.querySelector('[data-editable="true"]')?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
  }, []);
  return <div ref={ref} style={{ display: "contents" }}>{children}</div>;
}

/** The empty first column of a `second` case (its cells are plain text, so the suite's root is the measured cell's). */
const LEAD_WIDTH = 64;

export const cases: Record<string, (props: Props) => ReactNode> = {
  // `second`: the column is the Table's second, after an empty one: the first column, the row's name, draws some media
  // larger than Figma's primitive does (Table.tsx cellVisual: a Dock Icon is Small there with or without a Subtext).
  tableCell: ({ width, column, row = {}, cell, editing, second }) => {
    const draw = cell ? cells[cell] : undefined;
    // A JSON `edit` object (a placeholder, say) becomes a text editor over the column's field.
    const edit = column.edit && typeof column.edit === "object"
      ? { ...column.edit, value: (r: Row) => String(r[column.field ?? "cell"] ?? ""), onCommit: () => {} }
      : column.edit;
    const columns: TableColumn<Row>[] = [...(second ? [{ id: "lead", header: "", width: `${LEAD_WIDTH}px` }] : []), { id: "cell", header: "", width: `${width}px`, ...column, edit, ...(draw ? { cell: draw } : {}) }];
    const table = <Table aria-label="Cell" columns={columns} rows={[{ id: "r1", ...row }]} />;
    const box = second ? width + LEAD_WIDTH : width;
    return <div style={{ width: box, minWidth: box }}>{editing ? <Editing>{table}</Editing> : table}</div>;
  },
};

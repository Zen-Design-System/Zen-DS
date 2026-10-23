import type { Meta, StoryObj } from "@storybook/react-vite";
import { TableText } from "../Table";
import { SheetCode, SheetKeys, SheetTable } from "./SheetTable";

type Prop = { id: string; type: string; fallback: string | null; description: string };
const props: Prop[] = [
  { id: "theme", type: '"shadow" | "default" | "pale" | "border" | "flat-border" | "on-container" | "solid" | "subtle"', fallback: '"shadow"', description: "Picked by where the card sits: Default on Canvas/Default, Shadow beside a shadowed Sidebar, Border on a white page; colour Subtle on Canvas/Default, Pale on a white page." },
  { id: "surface", type: '"default" | "alt"', fallback: null, description: "Surface/Alt on Default and Border, for a white Canvas/Alt page." },
  { id: "onClick", type: "(event: MouseEvent | KeyboardEvent) => void", fallback: null, description: "Makes the whole card one action (role=button, Enter and Space). Keep other controls out of a clickable card." },
];

type Shortcut = { id: string; keys: string; action: string };
const shortcuts: Shortcut[] = [
  { id: "tab", keys: "Tab / Shift + Tab", action: "Moves focus to the next or the previous card that is one action." },
  { id: "enter", keys: "Enter / Space", action: "Activates the focused card, as a click does." },
  { id: "esc", keys: "Esc", action: "Closes the card's More menu and returns focus to its button." },
];

const meta = {
  title: "Components/SheetTable",
  component: SheetTable<Prop>,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Table/Sheet (doc frame 17100:7996): reference rows that grow with their content — a Table/Cell/Header row over Table/Sheet/Cell cells holding Text-Cell, Code or Key content." } } },
  args: {
    "aria-label": "Card props",
    rows: props,
    minWidth: "680px",
    columns: [
      { id: "prop", header: "Prop", width: "18%", cell: (row: Prop) => <SheetCode>{row.id}</SheetCode> },
      { id: "type", header: "Type", width: "34%", cell: (row: Prop) => <SheetCode>{row.type}</SheetCode> },
      { id: "default", header: "Default", width: "12%", cell: (row: Prop) => (row.fallback ? <SheetCode>{row.fallback}</SheetCode> : <TableText>—</TableText>) },
      { id: "description", header: "Description", cell: (row: Prop) => <TableText>{row.description}</TableText> },
    ],
  },
} satisfies Meta<typeof SheetTable<Prop>>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Props: Story = {};
export const Keyboard: StoryObj<typeof SheetTable<Shortcut>> = {
  args: {
    "aria-label": "Keyboard",
    rows: shortcuts,
    columns: [
      { id: "keys", header: "Key", width: "32%", cell: (row: Shortcut) => <SheetKeys value={row.keys} /> },
      { id: "action", header: "Action", cell: (row: Shortcut) => <TableText>{row.action}</TableText> },
    ],
  },
};
export const Empty: Story = { args: { rows: [], empty: <TableText>This component has no props of its own.</TableText> } };

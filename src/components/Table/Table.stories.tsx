import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../Badge";
import { Table, TableText, TableTrend } from "./Table";

type Row = { id: string; name: string; status: string; delta: string; amount: string };
const rows: Row[] = [
  { id: "1", name: "Zen website", status: "Live", delta: "+12%", amount: "$1,240" },
  { id: "2", name: "Token pipeline", status: "Review", delta: "0%", amount: "$860" },
  { id: "3", name: "Mobile kit", status: "Blocked", delta: "−8%", amount: "$320" },
];

const meta = {
  title: "Components/Table",
  component: Table<Row>,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Table (1595:2631): header and data rows of Table/Cell/Header and Table/Cell/Default with cell primitives." } } },
  args: {
    "aria-label": "Projects",
    rows,
    getRowId: (row: Row) => row.id,
    columns: [
      { id: "name", header: "Project", sortable: true, cell: (row: Row) => <TableText bold caption="Owner">{row.name}</TableText> },
      { id: "status", header: "Status", cell: (row: Row) => <Badge size="small" background="subtle" theme={row.status === "Live" ? "green" : row.status === "Blocked" ? "red" : "yellow"}>{row.status}</Badge> },
      { id: "trend", header: "Trend", cell: (row: Row) => <TableTrend trend={row.delta.startsWith("+") ? "up" : row.delta.startsWith("−") ? "down" : "neutral"}>{row.delta}</TableTrend> },
      { id: "amount", header: "Amount", align: "right", cell: (row: Row) => <TableText>{row.amount}</TableText> },
    ],
  },
} satisfies Meta<typeof Table<Row>>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Selectable: Story = { args: { selectable: true, selectedIds: ["2"] } };
export const BulkActions: Story = {
  args: {
    selectable: true,
    selectedIds: ["1", "3"],
    bulkActions: (ids: string[]) => [
      { id: "export", icon: "icon-download-01-line", label: `Export ${ids.length} projects`, onClick: () => undefined, group: "Share" },
      { id: "archive", icon: "icon-archive-line", label: `Archive ${ids.length} projects`, onClick: () => undefined, group: "Manage" },
    ],
  },
};

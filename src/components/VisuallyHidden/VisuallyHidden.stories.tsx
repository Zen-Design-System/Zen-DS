import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconButton } from "../Button";
import { Icon } from "../Icon";
import { Table, TableActions, TableText } from "../Table";
import { VisuallyHidden, visuallyHiddenElements } from "./VisuallyHidden";

const meta = {
  title: "Components/VisuallyHidden",
  component: VisuallyHidden,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Content for screen readers only: clipped to a 1px box but kept in the accessibility tree. `focusable` shows it while it has focus (skip links)." } } },
  args: { as: "span", focusable: false, children: "Actions" },
  argTypes: { as: { control: "select", options: visuallyHiddenElements } },
} satisfies Meta<typeof VisuallyHidden>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  render: (args) => <p>Inspect the accessibility tree: the text “{String(args.children)}” is read, not shown. <VisuallyHidden {...args} /></p>,
};

export const SkipLink: Story = {
  render: () => (
    <div style={{ position: "relative", minHeight: 160, padding: 16, border: "1px dashed var(--zen-color-border-neutral-subtle-default)", borderRadius: 12 }}>
      <VisuallyHidden as="a" href="#story-main" focusable>Skip to main content</VisuallyHidden>
      <p>Press Tab: the skip link appears at the top-start corner.</p>
      <main id="story-main" tabIndex={-1}>Main content</main>
    </div>
  ),
};

export const IconOnlyTableHeader: Story = {
  render: () => (
    <Table aria-label="Invoices" getRowId={(row) => row.id} rows={[{ id: "INV-2401", amount: "$120.00" }, { id: "INV-2402", amount: "$8.50" }]}
      columns={[
        { id: "id", header: "Invoice", cell: (row) => <TableText bold>{row.id}</TableText> },
        { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{row.amount}</TableText> },
        { id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", cell: (row) => <TableActions><IconButton appearance="flat" level="primary" size="sm" aria-label={`Download ${row.id}`} icon={<Icon name="icon-download-01-line" />} /></TableActions> },
      ]} />
  ),
};

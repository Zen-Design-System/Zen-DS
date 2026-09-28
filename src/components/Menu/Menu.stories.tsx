import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, IconButton } from "../Button";
import { Icon } from "../Icon";
import { Text } from "../Text";
import { Menu, MenuGroup, MenuItem, MenuSeparator, type MenuEntry } from "./Menu";

const items: MenuEntry[] = [
  { id: "rename", label: "Rename", icon: "icon-edit-02-line", shortcut: "F2" },
  { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line", shortcut: "⌘D" },
  { id: "move", label: "Move to…", icon: "icon-folder-line" },
  { type: "separator" },
  { id: "share", label: "Share", icon: "icon-share-01-line", disabled: true, caption: "Only owners can share" },
  { type: "separator" },
  { id: "delete", label: "Delete", icon: "icon-trash-line", danger: true },
];

const meta = {
  title: "Components/Menu",
  component: Menu,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: { description: { component: "An action menu (WAI-ARIA menu button) on the Popover surface: a trigger opens a list of actions. It renders in the overlay portal and flips when there is no room. For choosing a value use SelectField or a Chip." } },
  },
  args: {
    trigger: <IconButton appearance="flat" level="primary" aria-label="Actions for Q4 roadmap" icon={<Icon name="icon-dots-horizontal-line" />} />,
    items,
    align: "start",
  },
  argTypes: { align: { control: "inline-radio", options: ["start", "end"] }, trigger: { control: false }, items: { control: false } },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

function WithLastAction(args: Story["args"]) {
  const [last, setLast] = useState<string>();
  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
      <Menu {...(args as Parameters<typeof Menu>[0])} onSelect={(item) => setLast(item.label)} />
      <Text textStyle="Body/Small/Regular" tone="light" role="status">{last ? `Chose ${last}` : "Click, or focus and press ↓"}</Text>
    </div>
  );
}

export const Playground: Story = { render: (args) => <WithLastAction {...args} /> };

/** Group headings and shortcuts for a longer menu. */
export const Groups: Story = {
  args: {
    trigger: <Button level="tertiary" size="sm" endIcon={<Icon name="icon-chevron-down-line" />}>Edit</Button>,
    items: [
      { type: "group", label: "Clipboard", items: [
        { id: "cut", label: "Cut", icon: "icon-scissors-line", shortcut: "⌘X" },
        { id: "copy", label: "Copy", icon: "icon-copy-line", shortcut: "⌘C" },
        { id: "paste", label: "Paste", icon: "icon-clipboard-line", shortcut: "⌘V" },
      ] },
      { type: "separator" },
      { id: "delete", label: "Delete layer", icon: "icon-trash-line", shortcut: "⌫", danger: true },
    ],
  },
  render: (args) => <WithLastAction {...args} />,
};

/** Without `items`, compose MenuItem / MenuSeparator / MenuGroup children. */
export const Composed: Story = {
  args: { items: undefined },
  render: () => (
    <Menu trigger={<Button level="primary" size="sm" startIcon={<Icon name="icon-plus-line" />}>New</Button>}>
      <MenuGroup label="Create">
        <MenuItem label="Document" icon="icon-file-doc-line" caption="Blank page" />
        <MenuItem label="Folder" icon="icon-folder-line" />
      </MenuGroup>
      <MenuSeparator />
      <MenuItem label="Upload files" icon="icon-download-01-line" />
    </Menu>
  ),
};

/** Opens on mount (uncontrolled `defaultOpen`), e.g. for a screenshot of the surface. */
export const Open: Story = { args: { defaultOpen: true }, render: (args) => <div style={{ minHeight: 360 }}><WithLastAction {...args} /></div> };

import { Badge } from "../Badge";
import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../Icon";
import { Popover, type PopoverItemData } from "./Popover";

const items: PopoverItemData[] = [
  { id: "all", label: "All components", leading: <Icon name="icon-grid-01-line" size="sm" decorative />, selected: true },
  { id: "foundations", label: "Foundations", caption: "Tokens and styles", leading: <Icon name="icon-colors-line" size="sm" decorative /> },
  { id: "components", label: "Components", caption: "Reusable UI", leading: <Icon name="icon-layout-grid-01-line" size="sm" decorative /> },
  { id: "disabled", label: "Disabled item", leading: <Icon name="icon-file-lock-line" size="sm" decorative />, disabled: true },
];

const meta = {
  title: "Components/Popover",
  component: Popover,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component: "Popover/Default follows the Figma component: a 240px hug-height surface, 4px container padding and gap, Large (16px) radius, Popover border/background variables, and the Effect/Popover shadow + 40px backdrop blur.",
      },
    },
  },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

function Surface({ children }: { children: ReactNode }) {
  return <div style={{ position: "relative", width: 240, minHeight: 260 }}>{children}</div>;
}

export const Playground: Story = {
  render: () => (
    <Surface>
      <Popover open items={items} label="Choose a component" />
    </Surface>
  ),
};

export const WithSearch: Story = {
  render: () => (
    <Surface>
      <Popover
        open
        items={items}
        label="Filter library"
        search
        searchPlaceholder="Search components"
      />
    </Surface>
  ),
};

export const Scrollable: Story = {
  render: () => (
    <Surface>
      <Popover
        open
        scrollBar
        items={Array.from({ length: 12 }, (_, index) => ({
          id: `item-${index}`,
          label: `Component ${index + 1}`,
          leading: <Icon name="icon-layout-grid-01-line" size="sm" decorative />,
        }))}
      />
    </Surface>
  ),
};

export const ManualAddNew: Story = {
  render: () => (
    <Surface>
      <Popover
        open
        label="Select or create"
        items={[
          ...items,
          {
            id: "create",
            label: "Create new",
            theme: "badge",
            function: "manual-add-new",
            trailing: <Badge size="medium" theme="accent" background="solid" leadingIcon={false}>New</Badge>,
          },
        ]}
      />
    </Surface>
  ),
  parameters: {
    docs: {
      description: { story: "Exercises the Figma Manual-Add-New function: text-only content padding, 8px action-to-badge gap, and a badge-sized trailing slot." },
    },
  },
};

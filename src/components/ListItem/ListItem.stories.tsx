import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "../Avatar";
import { IconButton } from "../Button";
import { Icon } from "../Icon";
import { List, ListItem } from "./ListItem";

const meta = {
  title: "Components/ListItem",
  component: ListItem,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma List-Item (4080:11700): Leading avatar, Title + Caption, Trailing actions; Hover / Pressed / Selected." } } },
  args: { title: "Title", caption: "Caption", leading: <Avatar size="medium" theme="blue" alt="">AC</Avatar>, trailing: <IconButton appearance="flat" level="primary" size="md" aria-label="Add" icon={<Icon name="icon-plus-line" />} /> },
  decorators: [(Story) => <div style={{ width: 375 }}><List aria-label="Example"><Story /></List></div>],
} satisfies Meta<typeof ListItem>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Selected: Story = { args: { selected: true, onClick: () => undefined, trailing: undefined } };

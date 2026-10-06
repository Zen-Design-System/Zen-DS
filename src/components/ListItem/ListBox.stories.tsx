import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "../Avatar";
import { Heading } from "../Text";
import { List, ListBox, ListItem, listBoxThemes } from "./ListItem";

const rows = (
  <List aria-label="Team">
    <ListItem title="Ava Chen" caption="Product Designer" leading={<Avatar size="medium" theme="blue" alt="">AC</Avatar>} onClick={() => undefined} />
    <ListItem title="Bao Nguyen" caption="Frontend Engineer" leading={<Avatar size="medium" theme="green" alt="">BN</Avatar>} onClick={() => undefined} />
  </List>
);

const meta = {
  title: "Components/ListBox",
  component: ListBox,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Component/List-Box (14922:75297): the box of List-Item rows with optional Header-Slot and Footer-Slot, the same on every device (only the tokens change by mode). `theme` picks its elevation like Card's: flat (default), shadow, pale or border." } } },
  args: { theme: "flat", header: <Heading level={3} textStyle="Heading/Subheading">Team</Heading>, children: rows },
  argTypes: { theme: { control: "inline-radio", options: [...listBoxThemes] } },
  decorators: [(Story) => <div style={{ width: 375 }}><Story /></div>],
} satisfies Meta<typeof ListBox>;

export default meta;
type Story = StoryObj<typeof meta>;
/** Flat (default): Surface/Default alone, for a Canvas/Default page (usage rules §16). */
export const Playground: Story = {};
/** Shadow: beside a default Sidebar, the page's elevation follows it. */
export const Shadow: Story = { args: { theme: "shadow" } };
/** Border: on a white page (Canvas/Alt, a phone screen) or inside another Surface. */
export const Border: Story = { args: { theme: "border" } };
/** Pale: a tinted box; it never casts a shadow. */
export const Pale: Story = { args: { theme: "pale" } };

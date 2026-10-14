import type { Meta, StoryObj } from "@storybook/react-vite";
import { Avatar } from "../Avatar";
import { IconButton } from "../Button";
import { DockIcon } from "../DockIcon";
import { Icon } from "../Icon";
import { List, ListItem } from "./ListItem";

const meta = {
  title: "Components/ListItem",
  component: ListItem,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma List-Item (4080:11700): Leading avatar, Title + Caption, Trailing actions. Rows pad Small 12px above and below, none at the sides; the container insets them. Interactive=Yes (onClick or href): Hover / Pressed / Selected on a fill 12px outside the content. Interactive=No: no states." } } },
  args: { title: "Title", caption: "Caption", leading: <Avatar size="medium" theme="blue" alt="">AC</Avatar>, trailing: <IconButton appearance="flat" level="primary" size="md" aria-label="Add" icon={<Icon name="icon-plus-line" />} /> },
  decorators: [(Story) => <div style={{ width: 375 }}><List aria-label="Example"><Story /></List></div>],
} satisfies Meta<typeof ListItem>;

export default meta;
type Story = StoryObj<typeof meta>;
/** Figma Interactive=Yes: the whole row is one action. */
export const Playground: Story = { args: { onClick: () => undefined } };
/** Figma Interactive=No: no onClick or href; no background or states. */
export const Static: Story = {};
export const Selected: Story = { args: { selected: true, onClick: () => undefined, trailing: undefined } };
/** `titleLines={2}`: a title that must be read in full wraps to a second line before it truncates (Figma's Title is one line). */
export const TwoLineTitle: Story = { args: { titleLines: 2, title: "Quarterly performance review for the platform design team and partners", caption: "Updated today" } };
/** `value` + `valueCaption`: an amount mirrored to the right of the title stack; it keeps its width and the title
 *  truncates. `valueTone="positive-light"` marks money in; the sign stays in the text. */
export const Value: Story = {
  args: {
    title: "From Saola Outdoor", caption: "Received · Today", value: "+94,860,000 VND", valueCaption: "3,600.00 USD", valueTone: "positive-light",
    leading: <DockIcon size="md" icon="icon-arrow-down-line" theme="neutral" background="subtle" />, trailing: undefined,
  },
};

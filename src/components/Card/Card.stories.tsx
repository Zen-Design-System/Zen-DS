import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, cardSpacings, cardThemes } from "./Card";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Card (6643:51021): Theme Shadow/Flat/Pale/Border/On-Container × Spacing Medium/Small × Active, with an optional top-right Sub-Action." } } },
  args: { theme: "shadow", spacing: "medium", active: false, children: "Content slot", subAction: { label: "More actions" } },
  argTypes: { theme: { control: "inline-radio", options: cardThemes }, spacing: { control: "inline-radio", options: cardSpacings } },
  decorators: [(Story) => <div style={{ width: 230, padding: 24, background: "var(--zen-color-background-neutral-pale-default)" }}><Story /></div>],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Clickable: Story = { args: { theme: "border", onClick: () => undefined, "aria-label": "Open project", subAction: undefined } };
/** On-Container: Surface/Flat, a card inside a Dialog, ModalForm, SidePanel or BottomSheet — shown here on their Container fill. */
export const OnContainer: Story = {
  args: { theme: "on-container" },
  decorators: [(Story) => <div style={{ padding: "var(--zen-spacing-padding-large, 20px)", background: "var(--zen-color-background-container)" }}><Story /></div>],
};

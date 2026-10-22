import type { Meta, StoryObj } from "@storybook/react-vite";
import { Heading, Text } from "../Text";
import { Card, cardColors, cardSolidColors, cardSpacings, cardThemes } from "./Card";

const meta = {
  title: "Components/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Card (6643:51021): Theme Shadow/Default/Pale/Border/Flat-Border/On-Container/Solid/Subtle × Color (Pale: nine hues; Solid: Neutral, Brand, Cyan, Yellow, Orange) × Spacing Medium/Small × Active, with an optional top-right Sub-Action." } } },
  args: { theme: "shadow", color: "neutral", spacing: "medium", active: false, children: "Content slot", subAction: { label: "More actions" } },
  argTypes: { theme: { control: "inline-radio", options: cardThemes }, color: { control: "select", options: cardColors }, spacing: { control: "inline-radio", options: cardSpacings } },
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
const Widget = ({ title }: { title: string }) => (
  <>
    <Heading level={3} textStyle="Heading/Subheading">{title}</Heading>
    <Text textStyle="Heading/2">$48,200</Text>
    <Text textStyle="Body/Small/Regular" tone="base">+12% vs. last month</Text>
  </>
);
/** Figma Theme=Pale × Color (Support/<Color>/Pale): colour on a box is Pale, any of the nine hues. */
export const PaleColors: Story = {
  args: { theme: "pale" },
  decorators: [() => <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 200px)", gap: "var(--zen-spacing-gap-medium, 16px)", padding: "var(--zen-spacing-padding-large, 20px)", background: "var(--zen-color-background-canvas-alt)" }}>{cardColors.map((color) => <Card key={color} theme="pale" color={color} subAction={{ label: "More actions" }}><Widget title={color} /></Card>)}</div>],
};
/** Figma Theme=Subtle × Color (Support/<Color>/Subtle): colour on a box on the grey Canvas/Default, where Pale fades. */
export const SubtleColors: Story = {
  args: { theme: "subtle" },
  decorators: [() => <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 200px)", gap: "var(--zen-spacing-gap-medium, 16px)", padding: "var(--zen-spacing-padding-large, 20px)", background: "var(--zen-color-background-canvas-default)" }}>{cardColors.map((color) => <Card key={color} theme="subtle" color={color} subAction={{ label: "More actions" }}><Widget title={color} /></Card>)}</div>],
};
/** Figma Theme=Solid × Color: the one widget of a row that stands out. Neutral is the dark widget (Content/Inverse/*). */
export const SolidColors: Story = {
  args: { theme: "solid" },
  decorators: [() => <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 200px)", gap: "var(--zen-spacing-gap-medium, 16px)", padding: "var(--zen-spacing-padding-large, 20px)", background: "var(--zen-color-background-canvas-default)" }}>{cardSolidColors.map((color) => <Card key={color} theme="solid" color={color} subAction={{ label: "More actions" }}><Widget title={color} /></Card>)}</div>],
};

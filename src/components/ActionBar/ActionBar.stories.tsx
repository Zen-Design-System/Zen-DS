import type { Meta, StoryObj } from "@storybook/react-vite";
import { Text } from "../Text";
import { ActionBar, actionBarDirections, actionBarPositions, actionBarSurfaces } from "./ActionBar";

const meta = {
  title: "Components/ActionBar",
  component: ActionBar,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { description: { component: "The footer bar for a screen's main actions: vertical (phones, Large full-width buttons, Primary on top) or horizontal (desktop, Tertiary · Primary at the end); sticky, fixed or static; Surface/Default with a Pale top rule and safe-area bottom padding." } } },
  args: { direction: "vertical", position: "sticky", surface: "default", primaryAction: { label: "Add to cart" }, secondaryAction: { label: "Save for later" } },
  argTypes: { direction: { control: "inline-radio", options: actionBarDirections }, position: { control: "inline-radio", options: actionBarPositions }, surface: { control: "inline-radio", options: actionBarSurfaces } },
  decorators: [(Story, context) => (
    <div style={{ maxWidth: context.args.direction === "horizontal" ? 960 : 390, height: 420, margin: "0 auto", overflow: "auto", contain: "layout", background: "var(--zen-color-background-canvas-default)" }}>
      <div style={{ display: "grid", gap: 12, padding: 24 }}>
        {Array.from({ length: 12 }, (_, index) => <Text key={index} tone="base">Paragraph {index + 1} of the page content scrolls under the bar.</Text>)}
      </div>
      <Story />
    </div>
  )],
} satisfies Meta<typeof ActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MobileFooter: Story = {};

export const DesktopWithSummary: Story = {
  args: { direction: "horizontal", primaryAction: { label: "Save changes" }, secondaryAction: { label: "Discard" }, summary: <Text as="span" textStyle="Body/Small/Regular" tone="base">3 unsaved changes</Text> },
};

export const Fixed: Story = { args: { position: "fixed" } };

import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColorSwatch } from "./ColorSwatch";

const meta = {
  title: "Components/ColorSwatch",
  component: ColorSwatch,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma .Primitives/Input/Color-Swatch (15659:110090): the colour chip of a colour value, 16 / 20 / 24px." } } },
  args: { color: "var(--zen-color-background-support-blue-solid)", size: "md" },
  argTypes: { size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
} satisfies Meta<typeof ColorSwatch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      <ColorSwatch {...args} size="sm" />
      <ColorSwatch {...args} size="md" />
      <ColorSwatch {...args} size="lg" />
    </div>
  ),
};

/** A white or canvas-coloured value stays visible thanks to the inside border. */
export const LightValue: Story = { args: { color: "var(--zen-color-background-surface-default)", "aria-label": "Surface" } };

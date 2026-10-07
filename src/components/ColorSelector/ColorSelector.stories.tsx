import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColorSelector } from "./ColorSelector";

const colors = ["blue", "green", "yellow", "orange", "red", "purple"].map((name) => ({ value: `var(--zen-color-background-support-${name}-solid)`, label: name, contrast: name === "yellow" ? "dark" as const : undefined }));

const meta = {
  title: "Components/ColorSelector",
  component: ColorSelector,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Color-Selector (373:97252): 32px swatches, check when selected, hover ring, focus halo." } } },
  args: { "aria-label": "Label colour", colors, value: colors[0].value },
} satisfies Meta<typeof ColorSelector>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};

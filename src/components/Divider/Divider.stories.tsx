import type { Meta, StoryObj } from "@storybook/react-vite";
import { Divider, dividerColors } from "./Divider";

const meta = {
  title: "Components/Divider",
  component: Divider,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Divider (460:38361): Color Default (Pale) · Medium (Subtle) · High (Solid); dashed Default steps up to Subtle." } } },
  args: { color: "default", orientation: "horizontal", dashed: false },
  argTypes: { color: { control: "inline-radio", options: dividerColors }, orientation: { control: "inline-radio", options: ["horizontal", "vertical"] } },
  decorators: [(Story) => <div style={{ maxWidth: 360, display: "flex", height: 48, alignItems: "center", gap: 12 }}><Story /></div>],
} satisfies Meta<typeof Divider>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Colors: Story = { render: () => <div style={{ display: "grid", gap: 24, width: 360 }}>{dividerColors.map((color) => <Divider key={color} color={color} />)}<Divider dashed /></div> };

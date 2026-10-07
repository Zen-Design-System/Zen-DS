import type { Meta, StoryObj } from "@storybook/react-vite";
import { Slider, sliderSizes, sliderThemes } from "./Slider";

const meta = {
  title: "Components/Slider",
  component: Slider,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Slider/Horizontal (4010:35946): Theme Neutral/Accent/White × Size Small/Medium/Large; hover, hold and disabled come from the native range input." } } },
  args: { "aria-label": "Value", defaultValue: 50, theme: "neutral", size: "medium" },
  argTypes: { theme: { control: "inline-radio", options: sliderThemes }, size: { control: "inline-radio", options: sliderSizes } },
  decorators: [(Story) => <div style={{ maxWidth: 262, padding: 16, background: "var(--zen-color-background-neutral-pale-default)" }}><Story /></div>],
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Matrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24, width: 262 }}>
      {sliderThemes.flatMap((theme) => sliderSizes.filter((size) => !(theme === "white" && size === "small")).map((size) => <Slider key={`${theme}-${size}`} aria-label={`${theme} ${size}`} theme={theme} size={size} defaultValue={50} />))}
    </div>
  ),
};

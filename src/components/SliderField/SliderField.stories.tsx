import type { Meta, StoryObj } from "@storybook/react-vite";
import { SliderField } from "./SliderField";

const meta = {
  title: "Components/Slider Field",
  component: SliderField,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma Slider/Field (15662:108207): a number that is also a slider. Drag to scrub, click to type, arrows to step." } } },
  args: { label: "Overlay Opacity", defaultValue: 0.6, min: 0, max: 1, step: 0.01, theme: "neutral", size: "md" },
  argTypes: { theme: { control: "inline-radio", options: ["neutral", "accent"] }, size: { control: "inline-radio", options: ["sm", "md"] } },
} satisfies Meta<typeof SliderField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { render: (args) => <div style={{ width: 320 }}><SliderField {...args} /></div> };

/** A property panel's rows: offsets in px, a scale and an opacity. */
export const PanelRows: Story = {
  render: () => (
    <div style={{ width: 320, display: "grid", gap: 8 }}>
      <SliderField label="Offset X" defaultValue={239} min={0} max={400} formatValue={(value) => String(value)} />
      <SliderField label="Offset Y" defaultValue={0} min={0} max={400} />
      <SliderField label="Scale" defaultValue={0.7} min={0.2} max={1.5} step={0.01} />
      <SliderField label="Overlay Opacity" defaultValue={0.6} min={0} max={1} step={0.01} theme="accent" />
    </div>
  ),
};

export const Disabled: Story = { args: { disabled: true }, render: (args) => <div style={{ width: 320 }}><SliderField {...args} /></div> };

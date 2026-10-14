import type { Meta, StoryObj } from "@storybook/react-vite";
import { ColorField } from "../Input";
import { ColorPicker } from "./ColorPicker";

const palette = ["#1F6FEB", "#0E9F8E", "#2E9E4F", "#E07B12", "#E5533D", "#8E44C4"];

const meta = {
  title: "Components/Color Picker",
  component: ColorPicker,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma Color-Picker (15708:5927): the saturation × brightness area, the hue on Slider, a Format select (Hex · RGB · HSL · HSB) with its channels and saved colours. Inline by default; ColorField opens it as a popover." } } },
  args: { defaultValue: "#1F6FEB", savedColors: palette, "aria-label": "Brand colour" },
  argTypes: { defaultFormat: { control: "inline-radio", options: ["hex", "rgb", "hsl", "hsb"] } },
} satisfies Meta<typeof ColorPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { render: (args) => <div style={{ width: 240 }}><ColorPicker {...args} /></div> };

export const Formats: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: 24 }}>
      {(["hex", "rgb", "hsl", "hsb"] as const).map((format) => <div key={format} style={{ width: 240 }}><ColorPicker {...args} defaultFormat={format} /></div>)}
    </div>
  ),
};

/** ColorField opens the picker under the field (click it or press ↓). */
export const Field: Story = {
  render: () => <div style={{ width: 312, height: 440 }}><ColorField label="Brand colour" defaultValue="#1F6FEB" savedColors={palette} /></div>,
};

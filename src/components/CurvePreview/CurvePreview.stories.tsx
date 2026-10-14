import type { Meta, StoryObj } from "@storybook/react-vite";
import { CurvePreview } from "./CurvePreview";

const meta = {
  title: "Components/Curve Preview",
  component: CurvePreview,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma Chart/Curve-Preview (15663:110887): how a motion curve moves a value from start to target over time." } } },
  args: { type: "spring" },
  argTypes: { type: { control: "inline-radio", options: ["spring", "bounce", "ease-out", "ease-in-out"] }, bounce: { control: { type: "range", min: 0, max: 1, step: 0.01 } } },
} satisfies Meta<typeof CurvePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = { render: (args) => <div style={{ width: 320 }}><CurvePreview {...args} /></div> };

/** The four Figma types side by side. */
export const Types: Story = {
  render: () => (
    <div style={{ width: 664, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
      <CurvePreview type="spring" />
      <CurvePreview type="bounce" />
      <CurvePreview type="ease-out" />
      <CurvePreview type="ease-in-out" />
    </div>
  ),
};

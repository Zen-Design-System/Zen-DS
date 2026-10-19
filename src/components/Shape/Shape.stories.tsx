import type { Meta, StoryObj } from "@storybook/react-vite";
import { Box } from "../Layout";
import { Shape, shapeStrokeAligns, shapeTypes } from "./Shape";
import { shapeFills, shapeStrokes } from "./paint";

const meta = {
  title: "Components/Shape",
  component: Shape,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma's own shapes (RECTANGLE, ELLIPSE with arcData, LINE, arrow, REGULAR_POLYGON, STAR) for decoration drawn in Zen Studio; colours are Zen tokens only." } } },
  args: { type: "ellipse", width: 120, height: 120, fill: "accent-solid", arcStart: 0, arcSweep: 100, arcRatio: 0 },
  argTypes: {
    type: { control: "inline-radio", options: shapeTypes },
    fill: { control: "select", options: shapeFills },
    stroke: { control: "select", options: shapeStrokes },
    strokeAlign: { control: "inline-radio", options: shapeStrokeAligns },
    arcStart: { control: { type: "range", min: 0, max: 360 } },
    arcSweep: { control: { type: "range", min: 0, max: 100 } },
    arcRatio: { control: { type: "range", min: 0, max: 99 } },
  },
} satisfies Meta<typeof Shape>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Types: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      {shapeTypes.map((type) => (type === "line" || type === "arrow" ? <Shape key={type} type={type} width={100} rotation={20} />
        : type === "vector" ? <Shape key={type} type="vector" d={WAVE} viewBox="0 0 80 40" width={80} height={40} strokeWeight={2} />
          : <Shape key={type} type={type} width={80} height={80} />))}
    </div>
  ),
};
export const Arcs: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24 }}>
      <Shape type="ellipse" width={96} height={96} arcSweep={75} fill="accent-solid" />
      <Shape type="ellipse" width={96} height={96} arcRatio={60} fill="accent-solid" />
      <Shape type="ellipse" width={96} height={96} arcStart={180} arcSweep={50} arcRatio={60} fill="accent-solid" />
    </div>
  ),
};
/** A wave drawn with the Pen: two cubic curves (Figma's VECTOR). */
const WAVE = "M 0 20 C 13 0 27 0 40 20 C 53 40 67 40 80 20";
export const Vectors: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
      <Shape type="vector" d={WAVE} viewBox="0 0 80 40" width={160} height={40} strokeWeight={3} stroke="accent-solid" />
      <Shape type="vector" d="M 20 0 C 31 0 40 9 40 20 C 40 31 31 40 20 40 C 9 40 0 31 0 20 C 0 9 9 0 20 0 Z M 20 10 L 30 20 L 20 30 L 10 20 Z" viewBox="0 0 40 40" width={64} height={64} fill="support-teal-solid" stroke="none" fillRule="evenodd" />
    </div>
  ),
};
export const FreeFrame: Story = {
  render: () => (
    <Box width={200} height={140} surface="surface" border="pale" radius="md">
      <Shape type="rectangle" position="absolute" insetLeft={16} insetTop={16} width={80} height={56} radius="sm" fill="support-sky-soft" stroke="support-sky-solid" />
      <Shape type="star" position="absolute" insetLeft={120} insetTop={60} width={56} height={56} fill="support-yellow-solid" rotation={15} />
    </Box>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import photo from "../../assets/media/site-santorini.webp";
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
      {shapeTypes.map((type) => (type === "line" || type === "arrow" ? <Shape key={type} type={type} width={100} rotation={20} /> : <Shape key={type} type={type} width={80} height={80} />))}
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
/** Figma's image fill: Fill (cover), Fit (the whole picture, around it the fill colour), Crop (a part, stretched), Tile. */
export const ImageFill: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
      <Shape image={photo} label="Santorini, Fill" width={160} height={100} radius="md" />
      <Shape image={photo} imageFit="fit" fill="neutral-subtle" label="Santorini, Fit" width={160} height={100} radius="md" />
      <Shape image={photo} imageFit="crop" imageCrop={{ x: 50, y: 20, width: 40, height: 60 }} label="Santorini, Crop" width={100} height={100} radius="md" />
      <Shape image={photo} imageFit="tile" imageScale={10} width={160} height={100} radius="md" stroke="neutral-solid" />
      <Shape type="ellipse" image={photo} label="Santorini in a circle" width={100} height={100} />
      <Shape type="star" image={photo} imageFit="fit" fill="support-yellow-soft" width={100} height={100} />
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

import type { Meta, StoryObj } from "@storybook/react-vite";
import { SkeletonHeading, SkeletonShape, SkeletonText, skeletonHeadingSizes, skeletonShapeSizes, skeletonShapes, skeletonTextLines } from "./Skeleton";

const meta = {
  title: "Components/Skeleton",
  component: SkeletonText,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Skeleton (1556:17503): Body-Text lines, Heading-Text bars and Shapes, all Neutral/Subtle. Pulses while loading (off for reduced motion)." } } },
  args: { lines: 3, animated: true },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
} satisfies Meta<typeof SkeletonText>;

export default meta;
type Story = StoryObj<typeof meta>;

export const BodyText: Story = {};

export const AllVariants: Story = {
  decorators: [(Story) => <div style={{ width: "auto" }}><Story /></div>],
  render: () => (
    <div style={{ display: "grid", gap: 32 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 140px)", gap: 24 }}>{skeletonTextLines.map((lines) => <SkeletonText key={lines} lines={lines} />)}</div>
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>{skeletonHeadingSizes.map((size) => <SkeletonHeading key={size} size={size} />)}</div>
      {skeletonShapes.map((shape) => <div key={shape} style={{ display: "flex", gap: 16, alignItems: "center" }}>{[...skeletonShapeSizes].reverse().map((size) => <SkeletonShape key={size} shape={shape} size={size} />)}</div>)}
    </div>
  ),
};

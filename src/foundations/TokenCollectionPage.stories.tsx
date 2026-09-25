import type { Meta, StoryObj } from "@storybook/react-vite";
import { TokenCollectionPage } from "./TokenCollectionPage";

const meta = {
  title: "Foundations/Collections",
  component: TokenCollectionPage,
  parameters: { layout: "fullscreen" },
  argTypes: {
    collection: { table: { disable: true } },
  },
} satisfies Meta<typeof TokenCollectionPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GlobalColors: Story = { args: { collection: "global-colors" } };
export const GlobalDimensions: Story = { args: { collection: "global-dimensions" } };
export const BaseColorsProject: Story = { args: { collection: "base-colors-project" } };
export const SemanticColors: Story = { args: { collection: "mode-colors-semantic" } };
export const ComponentColors: Story = { args: { collection: "component-colors-theme" } };
export const ComponentSize: Story = { args: { collection: "component-size" } };
export const Spacing: Story = { args: { collection: "spacing" } };
export const CornerRadius: Story = { args: { collection: "corner-radius" } };
export const EmphasisLevel: Story = { args: { collection: "emphasis-level" } };
export const BreakpointsAndGrids: Story = { args: { collection: "breakpoint-grids" } };
export const Typography: Story = { args: { collection: "typography-configuration" } };

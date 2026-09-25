import type { Meta, StoryObj } from "@storybook/react-vite";
import { FoundationOverview } from "./FoundationOverview";

const meta = {
  title: "Foundations/Overview",
  component: FoundationOverview,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof FoundationOverview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllCollections: Story = {};

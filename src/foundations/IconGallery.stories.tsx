import type { Meta, StoryObj } from "@storybook/react-vite";
import { IconGallery } from "./IconGallery";

const meta = {
  title: "Foundations/Iconography",
  component: IconGallery,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof IconGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Gallery: Story = {};

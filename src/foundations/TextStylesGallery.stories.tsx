import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextStylesGallery } from "./TextStylesGallery";

const meta = {
  title: "Foundations/Styles/Text Styles",
  component: TextStylesGallery,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof TextStylesGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStyles: Story = {};

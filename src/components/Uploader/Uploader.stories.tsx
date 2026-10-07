import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileUpload } from "./Uploader";

const meta = {
  title: "Components/Uploader",
  component: FileUpload,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Uploader/File-Upload (1581:22708) with DragDrop-Field and File-Item." } } },
  args: {
    label: "Label",
    caption: "JPG, GIF or PNG. Max size of 800K",
    helpText: "Message text",
    thumbnail: "file",
    files: [
      { id: "1", name: "brand.pdf", size: "1.2 MB", state: "uploading", progress: 70, caption: "7 seconds left" },
      { id: "2", name: "tokens.json", size: "86 KB", state: "uploaded" },
      { id: "3", name: "hero.png", size: "2.4 MB", state: "alert", error: "Message text" },
    ],
    onRemove: () => undefined,
    onRetry: () => undefined,
  },
  decorators: [(Story) => <div style={{ width: 320 }}><Story /></div>],
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const BrowseButton: Story = { args: { type: "button", files: [] } };

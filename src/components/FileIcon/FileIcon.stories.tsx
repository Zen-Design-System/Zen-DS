import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileIcon } from "./FileIcon";
import { fileIconFormats } from "./fileIconData";

const meta = {
  title: "Foundations/File Icon",
  component: FileIcon,
  tags: ["autodocs"],
  args: { format: "pdf", size: "base" },
  argTypes: { format: { control: "select", options: fileIconFormats } },
  parameters: { docs: { description: { component: "Figma `icon-media-file` (Iconography → Special Icons → File): 10 file-type icons with token colours. Content-type identifiers, never action icons." } } },
} satisfies Meta<typeof FileIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllFormats: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      {fileIconFormats.map((format) => <FileIcon key={format} format={format} size="xl" title={format} />)}
    </div>
  ),
};

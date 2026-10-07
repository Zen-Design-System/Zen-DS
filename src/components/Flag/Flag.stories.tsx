import type { Meta, StoryObj } from "@storybook/react-vite";
import { Flag } from "./Flag";
import { flagNames } from "./flagNames";

const meta = {
  title: "Foundations/Flag",
  component: Flag,
  tags: ["autodocs"],
  args: { name: "Vietnam", size: "md" },
  argTypes: { name: { control: "select", options: flagNames }, size: { control: "inline-radio", options: ["sm", "md", "lg"] } },
  parameters: { docs: { description: { component: "Figma Flag (7063:63834, Iconography): 260 round country and region flags. Always next to the country name or code; decorative unless `label` is set." } } },
} satisfies Meta<typeof Flag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Flag name="Vietnam" size="sm" /><Flag name="Vietnam" size="md" /><Flag name="Vietnam" size="lg" />
    </div>
  ),
};

export const AllFlags: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
      {flagNames.map((name) => <Flag key={name} name={name} label={name} />)}
    </div>
  ),
};

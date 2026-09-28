import type { Meta, StoryObj } from "@storybook/react-vite";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "Components/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma Empty-State (6085:25796): placeholder illustration, Heading/4 title, caption and full-width Primary + Tertiary CTAs." } } },
  args: { title: "Empty State Title", children: "Dummy caption for empty state here.", primaryAction: { label: "Call to Action" }, secondaryAction: { label: "Call to Action" } },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const WithoutIllustration: Story = { args: { illustration: false, secondaryAction: undefined } };

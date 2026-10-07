import type { Meta, StoryObj } from "@storybook/react-vite";
import { NpsScale, OpinionScale, Rating, RatingDisplay, ratingSizes, ratingThemes } from "./Rating";

const meta = {
  title: "Components/Rating",
  component: Rating,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Rating (1536:355): star input, display, opinion scale and NPS scale." } } },
  args: { "aria-label": "Rate this template", defaultValue: 3, size: "large", theme: "default" },
  argTypes: { size: { control: "inline-radio", options: ratingSizes }, theme: { control: "inline-radio", options: ratingThemes } },
} satisfies Meta<typeof Rating>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Display: Story = { render: () => <div style={{ display: "grid", gap: 12 }}>{ratingSizes.map((size) => <RatingDisplay key={size} value={3.5} size={size} />)}</div> };
export const Scales: Story = { render: () => <div style={{ display: "grid", gap: 24 }}><OpinionScale scale={5} /><NpsScale scale={10} /></div> };

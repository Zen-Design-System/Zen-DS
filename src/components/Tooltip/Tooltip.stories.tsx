import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, IconButton } from "../Button";
import { Tooltip, tooltipColors, tooltipPlacements } from "./Tooltip";

const meta = {
  title: "Components/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { content: "Export as CSV", placement: "top", color: "default", size: "md", children: <Button level="tertiary">Export</Button> },
  argTypes: { placement: { control: "select", options: tooltipPlacements }, color: { control: "select", options: tooltipColors }, size: { control: "inline-radio", options: ["sm", "md"] } },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Shows after 1s of hover, at once on keyboard focus, never on touch. */
export const Playground: Story = {};

/** Icon-only buttons name themselves with a tooltip built in. */
export const IconOnly: Story = { render: () => <IconButton icon="icon-plus-line" aria-label="Add member" onClick={() => undefined} /> };

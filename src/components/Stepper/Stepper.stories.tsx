import type { Meta, StoryObj } from "@storybook/react-vite";
import { Stepper } from "./Stepper";

const steps = [
  { id: "one", title: "Step Title", caption: "Optional" },
  { id: "two", title: "Step Title", caption: "Optional" },
  { id: "three", title: "Step Title", caption: "Optional" },
];

const meta = {
  title: "Components/Stepper",
  component: Stepper,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Stepper-Bar/Horizontal (1625:8328) and Stepper-Bar/Vertical (1625:8656): Passed, Focused, Default and Error steps." } } },
  args: { "aria-label": "Progress", steps, current: 1, orientation: "horizontal" },
  argTypes: { orientation: { control: "inline-radio", options: ["horizontal", "vertical"] }, current: { control: { type: "number", min: 0, max: 2 } } },
  decorators: [(Story) => <div style={{ maxWidth: 600 }}><Story /></div>],
} satisfies Meta<typeof Stepper>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Vertical: Story = { args: { orientation: "vertical" } };
export const WithError: Story = { args: { steps: steps.map((step, index) => (index === 1 ? { ...step, error: true } : step)) } };

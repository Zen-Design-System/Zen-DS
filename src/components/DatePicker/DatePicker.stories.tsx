import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateField } from "../Input";
import { DatePicker } from "./DatePicker";

const meta = {
  title: "Components/Date Picker",
  component: DatePicker,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { selectionMode: "single", calendar: "single", showActions: false },
  argTypes: {
    selectionMode: { control: "inline-radio", options: ["single", "range"] },
    calendar: { control: "inline-radio", options: ["single", "dual"] },
  },
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The calendar panel itself (visible by default). */
export const Playground: Story = {};

/** Range selection on two months, with Cancel / Submit. */
export const Range: Story = { args: { selectionMode: "range", calendar: "dual", showActions: true } };

/** In forms, DateField owns the popover. */
export const Field: Story = { render: () => <div style={{ width: 320 }}><DateField label="Start date" helpText="Your first working day." /></div> };

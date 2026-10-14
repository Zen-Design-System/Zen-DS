import type { Meta, StoryObj } from "@storybook/react-vite";
import { DateField } from "../Input";
import { DatePicker } from "./DatePicker";
import { DatePickerSheet } from "./DatePickerSheet";

const meta = {
  title: "Components/Date Picker",
  component: DatePicker,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { selectionMode: "single", calendar: "single", showActions: false },
  argTypes: {
    selectionMode: { control: "inline-radio", options: ["single", "range"] },
    calendar: { control: "inline-radio", options: ["single", "dual", "stacked"] },
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

/** Figma Date-Picker/Mobile Variant=Multiple: months stacked under one pinned weekday row (in a phone sheet). */
export const Stacked: Story = { args: { selectionMode: "range", calendar: "stacked", monthCount: 3, device: "mobile" }, render: (args) => <div style={{ width: 350, height: 480, overflow: "auto" }}><DatePicker {...args} /></div> };

/** The phone picker (Figma Date-Picker/Mobile): a Bottom Sheet with Cancel / OK, or stacked months and a summary for a range. */
export const PhoneSheet: Story = {
  render: () => <DatePickerSheet open onOpenChange={() => undefined} selectionMode="range" title="Your stay" monthCount={6} summary={<span>Add dates for prices</span>} />,
};

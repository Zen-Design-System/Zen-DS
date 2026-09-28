import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { RadioButton } from "./RadioButton";

const meta = {
  title: "Components/Radio Button",
  component: RadioButton,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "Monthly", caption: "Billed every month. Cancel anytime.", name: "plan", value: "monthly", radioSide: "left" },
  argTypes: { radioSide: { control: "inline-radio", options: ["left", "right"] }, onCheckedChange: { action: "checked" } },
} satisfies Meta<typeof RadioButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** One group shares a name; the recommended option is pre-selected. */
export const Group: Story = {
  render: function GroupStory() {
    const [plan, setPlan] = useState("yearly");
    return (
      <div role="radiogroup" aria-label="Billing" style={{ display: "grid", gap: 8 }}>
        {[["monthly", "Monthly", "$12 / month"], ["yearly", "Yearly", "$120 / year — 2 months free"]].map(([value, label, caption]) => (
          <RadioButton key={value} name="billing" value={value} label={label} caption={caption} checked={plan === value} onCheckedChange={(checked) => checked && setPlan(value)} />
        ))}
      </div>
    );
  },
};

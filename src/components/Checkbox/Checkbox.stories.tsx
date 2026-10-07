import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "./Checkbox";

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { label: "Email me about new comments", caption: "At most one email a day.", defaultChecked: true, checkSide: "left", bold: false, disabled: false },
  argTypes: { checkSide: { control: "inline-radio", options: ["left", "right"] }, onCheckedChange: { action: "checked" } },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** A parent shows "some selected" with indeterminate. */
export const SelectAll: Story = {
  render: function SelectAllStory() {
    const [picked, setPicked] = useState(["design"]);
    const all = ["design", "engineering", "marketing"];
    const toggle = (id: string, checked: boolean) => setPicked((list) => (checked ? [...list, id] : list.filter((x) => x !== id)));
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <Checkbox label="All teams" checked={picked.length === all.length} indeterminate={picked.length > 0 && picked.length < all.length} onCheckedChange={(checked) => setPicked(checked ? all : [])} />
        {all.map((id) => <div key={id} style={{ paddingLeft: 28 }}><Checkbox label={id[0].toUpperCase() + id.slice(1)} checked={picked.includes(id)} onCheckedChange={(checked) => toggle(id, checked)} /></div>)}
      </div>
    );
  },
};

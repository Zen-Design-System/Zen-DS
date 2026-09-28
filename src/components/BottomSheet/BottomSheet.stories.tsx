import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button";
import { BottomSheet } from "./BottomSheet";

const meta = {
  title: "Components/BottomSheet",
  component: BottomSheet,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma Bottom-Sheet (4059:14161): Modal (contents + actions) or Action (item list), Flex or Max-Fixed height." } } },
  args: { open: false, onOpenChange: () => undefined, title: "Heading", type: "modal", primaryAction: { label: "Save" }, secondaryAction: { label: "Cancel" } },
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState("recent");
    return (
      <>
        <Button level="primary" onClick={() => setOpen(true)}>Open sheet</Button>
        <BottomSheet {...args} open={open} onOpenChange={setOpen} selectedId={args.type === "action" ? selected : undefined} onSelect={(item) => setSelected(item.id)}
          items={[{ id: "recent", label: "Most recent", icon: "icon-clock-line" }, { id: "name", label: "Name", icon: "icon-type-01-line" }, { id: "size", label: "File size", icon: "icon-database-01-line" }]}>
          <p style={{ margin: 0 }}>Everything in Zen contains Auto Layout.</p>
        </BottomSheet>
      </>
    );
  },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Modal: Story = {};
export const Action: Story = { args: { type: "action", title: "Sort by" } };

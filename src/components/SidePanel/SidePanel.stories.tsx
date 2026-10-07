import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button";
import { SidePanel } from "./SidePanel";

const meta = {
  title: "Components/SidePanel",
  component: SidePanel,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { description: { component: "Figma Side-Panel (1573:3128): Standard (docked) or Modal (floating, focus trapped), Default 440 / Small 360." } } },
  args: { open: true, onOpenChange: () => undefined, title: "Modal Heading Text", description: "Everything in Zen contains Auto Layout.", type: "standard", size: "default", primaryAction: { label: "Button" }, secondaryAction: { label: "Button" } },
} satisfies Meta<typeof SidePanel>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Standard: Story = { render: (args) => <div style={{ display: "flex", height: 600, justifyContent: "flex-end" }}><SidePanel {...args} /></div> };
export const Modal: Story = {
  render: function ModalStory(args) {
    const [open, setOpen] = useState(false);
    return <><Button level="primary" onClick={() => setOpen(true)}>Open panel</Button><SidePanel {...args} type="modal" icon="icon-info-circle-solid" open={open} onOpenChange={setOpen} /></>;
  },
};

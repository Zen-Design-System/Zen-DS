import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "../Button";
import { Dialog, dialogThemes } from "./Dialog";

const meta = {
  title: "Components/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    open: false,
    onOpenChange: () => undefined,
    title: "Delete project?",
    description: "Ava's 12 files and every comment go with it. This can't be undone.",
    theme: "negative",
  },
  argTypes: { theme: { control: "select", options: dialogThemes } },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Open from a button; Escape, the close button and Cancel dismiss it; focus returns to the opener. */
export const Playground: Story = {
  render: function PlaygroundStory(args) {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button level="danger" onClick={() => setOpen(true)}>Delete project</Button>
        <Dialog {...args} open={open} onOpenChange={setOpen} primaryAction={{ label: "Delete project", onClick: () => setOpen(false) }} secondaryAction={{ label: "Cancel", onClick: () => setOpen(false) }} />
      </>
    );
  },
};

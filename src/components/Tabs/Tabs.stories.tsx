import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { TabPanel, Tabs, tabVariants } from "./Tabs";

const items = [{ id: "overview", label: "Overview" }, { id: "activity", label: "Activity", badge: 3 }, { id: "settings", label: "Settings" }];

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { items, "aria-label": "Project sections", variant: "indicator", size: "md", defaultValue: "overview" },
  argTypes: { variant: { control: "inline-radio", options: tabVariants }, size: { control: "inline-radio", options: ["sm", "md"] }, onValueChange: { action: "value" } },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

/** Tabs switch TabPanels that share the idPrefix (aria-controls wiring). */
export const WithPanels: Story = {
  render: function PanelsStory(args) {
    const [tab, setTab] = useState("overview");
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <Tabs {...args} idPrefix="story" value={tab} onValueChange={setTab} />
        {items.map((item) => <TabPanel key={item.id} idPrefix="story" id={item.id} hidden={tab !== item.id}>{item.label} content</TabPanel>)}
      </div>
    );
  },
};

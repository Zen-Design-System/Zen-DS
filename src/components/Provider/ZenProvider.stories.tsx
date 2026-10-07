import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button";
import { ZenProvider, zenComponentThemes, zenDensities, zenRadii, zenThemes, zenTypographies } from "./ZenProvider";

const meta = {
  title: "Foundations/ZenProvider",
  component: ZenProvider,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "App root: sets the token modes (data-theme, data-density…), paints Canvas and hosts the overlay portal. Nest one to switch a region." } },
  },
  args: { theme: "light", typography: "dashboard", density: "compact", radius: "rounded", componentTheme: "neutral-s1", syncDocument: false },
  argTypes: {
    theme: { control: "inline-radio", options: zenThemes },
    typography: { control: "inline-radio", options: zenTypographies },
    density: { control: "inline-radio", options: zenDensities },
    radius: { control: "inline-radio", options: zenRadii },
    componentTheme: { control: "select", options: zenComponentThemes },
  },
  render: (args) => (
    <ZenProvider {...args} style={{ padding: 32, display: "flex", gap: 12 }}>
      <Button level="tertiary">Cancel</Button>
      <Button level="primary">Save changes</Button>
    </ZenProvider>
  ),
} satisfies Meta<typeof ZenProvider>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const NestedDarkRegion: Story = {
  render: () => (
    <ZenProvider syncDocument={false} style={{ padding: 32 }}>
      <ZenProvider theme="dark" style={{ padding: 32, borderRadius: 16 }}>
        <Button level="primary">Inside a dark region</Button>
      </ZenProvider>
    </ZenProvider>
  ),
};

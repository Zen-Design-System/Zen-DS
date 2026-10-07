import type { Meta, StoryObj } from "@storybook/react-vite";
import { DockIcon, dockIconSizes, dockIconThemes } from "./DockIcon";

const meta = {
  title: "Components/DockIcon",
  component: DockIcon,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Dock-Icon (308:45902): 5 sizes × 22 themes × Solid/Subtle." } } },
  args: { icon: "icon-colors-line", size: "medium", theme: "accent", background: "solid" },
  argTypes: { size: { control: "inline-radio", options: dockIconSizes }, theme: { control: "select", options: dockIconThemes }, background: { control: "inline-radio", options: ["solid", "subtle"] } },
} satisfies Meta<typeof DockIcon>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Themes: Story = { render: () => <div style={{ display: "grid", gridTemplateColumns: "repeat(11, 40px)", gap: 12 }}>{dockIconThemes.flatMap((theme) => (["solid", "subtle"] as const).map((background) => <DockIcon key={`${theme}-${background}`} theme={theme} background={background} emoji="🎉" />))}</div> };

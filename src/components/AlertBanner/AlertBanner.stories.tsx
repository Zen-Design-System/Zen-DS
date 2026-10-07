import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertBanner, alertBannerSizes, alertBannerThemes } from "./AlertBanner";

const meta = {
  title: "Components/Alert Banner",
  component: AlertBanner,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Alert-Banner (6828:9393): full-width Solid strip. Medium 56px with optional Button/Overlay Inverse action; Small 32px without action." } } },
  args: { children: "Scheduled maintenance on Sunday, 02:00–03:00.", theme: "default", size: "medium", leading: true, action: { label: "Details" }, onClose: () => {} },
  argTypes: { theme: { control: "inline-radio", options: alertBannerThemes }, size: { control: "inline-radio", options: alertBannerSizes }, leading: { control: "boolean" } },
} satisfies Meta<typeof AlertBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {alertBannerSizes.flatMap((size) => alertBannerThemes.map((theme) => (
        <AlertBanner key={`${size}-${theme}`} size={size} theme={theme} action={{ label: "Details" }} onClose={() => {}}>{`${theme} · ${size} — Alert message here`}</AlertBanner>
      )))}
    </div>
  ),
};

import type { Meta, StoryObj } from "@storybook/react-vite";
import { Accordion, accordionSizes, accordionThemes } from "./Accordion";

const meta = {
  title: "Components/Accordion",
  component: Accordion,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Accordion/Text (239:16847): Size Medium/Large/XLarge × Theme Divider/Box × Expanded. The header row toggles the panel; the chevron turns 180° and the height animates." } } },
  args: { title: "Where can I see a breakdown of my seats?", children: "You can manage your full seats, viewer seats and pending invites from Settings → Members.", size: "medium", theme: "divider", defaultExpanded: true },
  argTypes: { size: { control: "inline-radio", options: accordionSizes }, theme: { control: "inline-radio", options: accordionThemes } },
  decorators: [(Story) => <div style={{ maxWidth: 643 }}><Story /></div>],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const Matrix: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 643px))", gap: 32 }}>
      {accordionSizes.flatMap((size) => accordionThemes.flatMap((theme) => [false, true].map((expanded) => (
        <Accordion key={`${size}-${theme}-${expanded}`} size={size} theme={theme} defaultExpanded={expanded} title={`${size} · ${theme}${expanded ? " · expanded" : ""}`}>
          You can manage your full seats, viewer seats and pending invites from Settings → Members.
        </Accordion>
      ))))}
    </div>
  ),
};

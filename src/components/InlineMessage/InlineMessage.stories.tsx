import type { Meta, StoryObj } from "@storybook/react-vite";
import { InlineMessage, inlineMessageThemes } from "./InlineMessage";

const meta = {
  title: "Components/InlineMessage",
  component: InlineMessage,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma Inline-Message (595:54857): six themes on their Subtle surface with title, caption, one Tertiary action and a close control." } } },
  args: { theme: "info", title: "Inline Message", children: "A narrow visual element that displays relevant messages or prompts within the context of the main content.", onClose: () => undefined },
  argTypes: { theme: { control: "inline-radio", options: inlineMessageThemes } },
  decorators: [(Story) => <div style={{ maxWidth: 343 }}><Story /></div>],
} satisfies Meta<typeof InlineMessage>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Themes: Story = { render: (args) => <div style={{ display: "grid", gap: 16 }}>{inlineMessageThemes.map((theme) => <InlineMessage key={theme} {...args} theme={theme} action={{ label: "Action" }} />)}</div> };

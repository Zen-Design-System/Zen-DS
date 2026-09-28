import type { Meta, StoryObj } from "@storybook/react-vite";
import { AiChatBlock, AiChatBubble, AiChatField, AiChatThread } from "./AiChat";

const meta = {
  title: "Components/AiChat",
  component: AiChatField,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma ❖ AI-Chat (7032:2174): Chat-Field (Default · Surface · Liquid Glass), Chat-Bubble (You · AI) and the empty-state Block." } } },
  args: { onSubmit: () => undefined, model: "AI Model V 1.0", fieldStyle: "default" },
  decorators: [(Story) => <div style={{ width: 640 }}><Story /></div>],
} satisfies Meta<typeof AiChatField>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Field: Story = {};
export const Conversation: Story = {
  render: (args) => (
    <AiChatThread>
      <AiChatBubble side="you" actions={[{ icon: "icon-copy-line", label: "Copy" }, { icon: "icon-edit-02-line", label: "Edit" }]}>Summarise the Q3 report in three bullets.</AiChatBubble>
      <AiChatBubble side="ai" version="1/1" actions={[{ icon: "icon-thumbs-up-line", label: "Good response" }, { icon: "icon-thumbs-down-line", label: "Bad response" }, { icon: "icon-refresh-cw-01-line", label: "Regenerate" }, { icon: "icon-copy-line", label: "Copy" }]}>Revenue grew 12%, churn fell to 2.1%, and two enterprise deals closed.</AiChatBubble>
      <AiChatField {...args} />
    </AiChatThread>
  ),
};
export const Block: Story = {
  render: (args) => (
    <AiChatBlock suggestions={[{ label: "Help me write", icon: "icon-pencil-line" }, { label: "Summarize text", icon: "icon-align-left-line" }]}>
      <AiChatField {...args} />
    </AiChatBlock>
  ),
};

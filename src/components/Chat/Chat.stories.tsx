import type { Meta, StoryObj } from "@storybook/react-vite";
import { ChatComposer, ChatDateDivider, ChatFile, ChatMessage, ChatThread } from "./Chat";

const meta = {
  title: "Components/Chat",
  component: ChatMessage,
  tags: ["autodocs"],
  parameters: { layout: "centered", docs: { description: { component: "Figma ❖ Chat (7042:23220): conversation bubbles (text, file, call, photos), reactions, read list, composer and conversation list items." } } },
  args: { side: "others", children: "Text your friend's message" },
} satisfies Meta<typeof ChatMessage>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Message: Story = {};
export const Thread: Story = {
  render: () => (
    <div style={{ width: 390, display: "grid" }}>
      <ChatThread>
        <ChatDateDivider>Today</ChatDateDivider>
        <ChatMessage side="others" author={{ name: "Ava Chen" }}>Did you get the brand files?</ChatMessage>
        <ChatMessage side="you" time="20:32" status="Seen" reactions={[{ kind: "like" }]}>Yes, reviewing now.</ChatMessage>
        <ChatMessage side="others" author={{ name: "Ava Chen" }}><ChatFile kind="pdf" name="ZenDS.pdf" size="13,6 MB" /></ChatMessage>
      </ChatThread>
      <ChatComposer onSend={() => undefined} />
    </div>
  ),
};

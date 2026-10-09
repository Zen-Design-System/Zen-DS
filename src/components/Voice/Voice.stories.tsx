import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card } from "../Card";
import { AiVoiceConversation, VoiceRecorder } from "./Voice";

const meta = {
  title: "Components/Voice",
  component: VoiceRecorder,
  tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: "Figma ❖ Voice (15081:1294): Voice Recorder (Ready · Recording · Paused) and AI Voice Conversation (Ready · Listening · Responding)." } } },
  args: { state: "recording", elapsed: "00:24.18", start: "00:16", end: "00:24", input: "Built-in microphone", format: "48 kHz · Mono" },
  argTypes: { state: { control: "inline-radio", options: ["ready", "recording", "paused"] } },
  decorators: [(Story) => <Card theme="border" spacing="sm" style={{ maxWidth: 448 }}><Story /></Card>],
} satisfies Meta<typeof VoiceRecorder>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Recorder: Story = {};
export const Conversation: Story = {
  render: () => <AiVoiceConversation state="listening" transcript="Help me plan a calm start to my day…" />,
};

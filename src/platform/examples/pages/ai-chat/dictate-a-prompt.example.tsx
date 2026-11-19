import { useState } from "react";
import { AiChatField, AiVoiceConversation, Card, Stack, Text, type AiVoiceState } from "@zen-ds/react";

/** What the microphone hears (a demo: a real app puts its speech-to-text result here). */
const DICTATED = "Draft a two-line update for Lumen Bank about the transfer flow tests.";

/** The field's Voice state: dictation fills the prompt, and the empty field's Primary opens voice mode. */
export default function DictateAPrompt() {
  const [listening, setListening] = useState(false);
  // The field is uncontrolled: new text (the dictated words, an empty field after Send) remounts it with that text.
  const [draft, setDraft] = useState({ key: 0, text: "" });
  const [sent, setSent] = useState<string | null>(null);
  // Voice mode (the empty field's Primary): the conversation takes the field's place until End.
  const [voice, setVoice] = useState<AiVoiceState | null>(null);
  const [muted, setMuted] = useState(false);
  if (voice) {
    return (
      <Card theme="default" spacing="sm">
        <AiVoiceConversation state={voice} muted={muted} onMutedChange={setMuted}
          transcript={voice === "responding" ? "Here is a two-line update for Lumen Bank: the transfer flow tests pass, and the release stays on Friday." : "Draft a two-line update for Lumen Bank…"}
          onStart={() => setVoice("listening")} onDone={() => setVoice("responding")} onInterrupt={() => setVoice("listening")}
          onEnd={() => { setVoice(null); setMuted(false); }} />
      </Card>
    );
  }
  return (
    <Stack gap="sm">
      <AiChatField key={draft.key} defaultValue={draft.text} placeholder="Ask Zen AI"
        listening={listening}
        onVoice={() => { setSent(null); setListening(true); }}
        onVoiceMode={() => { setListening(false); setVoice("listening"); }}
        onStopListening={() => { setListening(false); setDraft((current) => ({ key: current.key + 1, text: DICTATED })); }}
        onSubmit={(text) => { setSent(text); setDraft((current) => ({ key: current.key + 1, text: "" })); }} />
      <Text as="p" textStyle="Body/Small/Regular" tone="base" role="status">
        {listening ? "Listening… press Stop when you are done." : sent ? `Sent: ${sent}` : draft.text ? "Your words are in the field: edit them, then send." : "Press the microphone to dictate, or Voice to talk it through."}
      </Text>
    </Stack>
  );
}

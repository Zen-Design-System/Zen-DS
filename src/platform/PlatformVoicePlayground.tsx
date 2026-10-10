import { useContext, useEffect, useState } from "react";
import { Card } from "../components/Card";
import { AiVoiceConversation, VoiceRecorder, type AiVoiceState, type VoiceRecorderState } from "../components/Voice";
import { PlatformCode } from "./PlatformCode";
import { PlatformTypographyContext } from "./PlatformTemplate";
import { ComponentPreview, PlaygroundControls, PlaygroundFilterChip } from "./appLayer/playgroundParts";

/*
 * The Voice page's playground (Figma ❖ Voice 15081:1294): pick the component and its State; the actions work — a take
 * counts up while recording, the conversation moves from listening to responding and back.
 */

const option = (id: string, label = id) => ({ id, label });
/** Seconds as Figma's "00:24.18" and "00:24". */
const clock = (seconds: number, hundredths = true) => {
  const whole = Math.floor(seconds);
  const text = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  return hundredths ? `${text}.${String(Math.floor((seconds % 1) * 100)).padStart(2, "0")}` : text;
};

export function VoicePlayground() {
  const previewTypography = useContext(PlatformTypographyContext);
  const [kind, setKind] = useState<string | undefined>("recorder");
  const [recorder, setRecorder] = useState<VoiceRecorderState>("recording");
  const [conversation, setConversation] = useState<AiVoiceState>("listening");
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(24.18);
  // A take counts up while it records (a tenth of a second at a time).
  useEffect(() => {
    if (kind !== "recorder" || recorder !== "recording") return undefined;
    const timer = window.setInterval(() => setSeconds((now) => now + 0.1), 100);
    return () => window.clearInterval(timer);
  }, [kind, recorder]);
  const isRecorder = (kind ?? "recorder") === "recorder";
  const state = isRecorder ? recorder : conversation;
  const states = isRecorder ? [option("ready", "Ready"), option("recording", "Recording"), option("paused", "Paused")] : [option("ready", "Ready"), option("listening", "Listening"), option("responding", "Responding")];
  const code = isRecorder
    ? `import { Card, VoiceRecorder } from "@zen/design-system";

<Card theme="flat" spacing="sm">
  <VoiceRecorder
    state="${recorder}"
    elapsed="${clock(recorder === "ready" ? 0 : seconds)}"
    start="${clock(Math.max(0, seconds - 8), false)}"
    end="${clock(seconds, false)}"
    input="Built-in microphone"
    format="48 kHz · Mono"
    onRecord={start} onPause={pause} onResume={resume} onFinish={save} onDiscard={discard}
  />
</Card>`
    : `import { AiVoiceConversation, Card } from "@zen/design-system";

<Card theme="flat" spacing="sm">
  <AiVoiceConversation
    state="${conversation}"
    transcript="${conversation === "responding" ? "Start with five quiet minutes, then choose one thing that matters today." : conversation === "listening" ? "Help me plan a calm start to my day…" : "“Help me plan a calm start to my day.”"}"
    muted={muted} onMutedChange={setMuted}
    onStart={listen} onDone={answer} onInterrupt={listen} onEnd={end}
  />
</Card>`;
  return (
    <ComponentPreview className="platform-example-panel platform-example-panel--stack">
      <h2 className="platform-main-component__title">Voice</h2>
      <PlaygroundControls aria-label="Voice playground controls">
        <PlaygroundFilterChip label="Component" value={kind} onChange={(value) => setKind(String(value) || undefined)} options={[option("recorder", "Voice Recorder"), option("conversation", "AI Voice Conversation")]} />
        <PlaygroundFilterChip label="State" value={state} onChange={(value) => {
          if (!value) return;
          if (isRecorder) { setRecorder(value as VoiceRecorderState); if (value === "ready") setSeconds(0); else if (seconds === 0) setSeconds(24.18); }
          else setConversation(value as AiVoiceState);
        }} options={states} />
      </PlaygroundControls>
      <div data-typography={previewTypography} className="platform-example-row platform-voice-preview">
        <Card theme="flat" spacing="sm" className="platform-voice-card">
          {isRecorder ? (
            <VoiceRecorder
              state={recorder}
              elapsed={clock(recorder === "ready" ? 0 : seconds)}
              start={clock(recorder === "ready" ? 0 : Math.max(0, seconds - 8), false)}
              end={clock(recorder === "ready" ? 0 : seconds, false)}
              input="Built-in microphone"
              format="48 kHz · Mono"
              onRecord={() => { setSeconds(0); setRecorder("recording"); }}
              onPause={() => setRecorder("paused")}
              onResume={() => setRecorder("recording")}
              onFinish={() => { setRecorder("ready"); setSeconds(0); }}
              onDiscard={() => { setRecorder("ready"); setSeconds(0); }}
            />
          ) : (
            <AiVoiceConversation
              state={conversation}
              transcript={conversation === "responding" ? "Start with five quiet minutes, then choose one thing that matters today." : conversation === "listening" ? "Help me plan a calm start to my day…" : "“Help me plan a calm start to my day.”"}
              muted={muted}
              onMutedChange={setMuted}
              onStart={() => setConversation("listening")}
              onDone={() => setConversation("responding")}
              onInterrupt={() => setConversation("listening")}
              onEnd={() => { setConversation("ready"); setMuted(false); }}
            />
          )}
        </Card>
      </div>
      <PlatformCode code={code} />
    </ComponentPreview>
  );
}

/* Voice examples (Figma ❖ Voice 15081:1294): Đìzai Studio's work — a voice note on a task, a microphone the browser
   blocked, talking a day through with Zen AI, and the same conversation on a phone. Every action works. */
import { useEffect, useRef, useState } from "react";
import { Card } from "../../../components/Card";
import { InlineMessage } from "../../../components/InlineMessage";
import { Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Text } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import { AiVoiceConversation, VoiceRecorder, type AiVoiceState, type VoiceRecorderState } from "../../../components/Voice";
import { PlatformPhone } from "../../PlatformPhone";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./voice.css";

export const page: PlatformPage = "voice";

/** Seconds as Figma's "00:24.18" (or "00:24" for the timeline). */
const clock = (seconds: number, hundredths = true) => {
  const whole = Math.floor(seconds);
  const text = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  return hundredths ? `${text}.${String(Math.floor((seconds % 1) * 100)).padStart(2, "0")}` : text;
};

/** A recorder whose take counts up while it records. */
function useTake() {
  const [state, setState] = useState<VoiceRecorderState>("ready");
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (state !== "recording") return undefined;
    const timer = window.setInterval(() => setSeconds((now) => now + 0.1), 100);
    return () => window.clearInterval(timer);
  }, [state]);
  const props = {
    state,
    elapsed: clock(seconds),
    start: clock(Math.max(0, seconds - 8), false),
    end: clock(seconds, false),
  };
  return { state, setState, seconds, setSeconds, props, reset: () => { setState("ready"); setSeconds(0); } };
}

// ——— 1. A voice note on a task ——————————————————————————————————————————————————————————————————————————
function TaskVoiceNote() {
  const take = useTake();
  const [notes, setNotes] = useState<Array<{ id: number; length: string }>>([{ id: 1, length: "00:42" }]);
  const [status, setStatus] = useState("");
  return (
    <Stack gap="md">
      <Card theme="flat" spacing="sm" className="pe-voice-card">
        <VoiceRecorder
          {...take.props}
          title="Note for “Rewards screens”"
          input="Built-in microphone"
          format="48 kHz · Mono"
          onRecord={() => { take.setSeconds(0); take.setState("recording"); setStatus(""); }}
          onPause={() => take.setState("paused")}
          onResume={() => take.setState("recording")}
          onFinish={() => { setNotes((all) => [{ id: Date.now(), length: clock(take.seconds, false) }, ...all]); setStatus("Voice note attached to Rewards screens"); take.reset(); }}
          onDiscard={() => { setStatus("Take discarded"); take.reset(); }}
        />
      </Card>
      <Text as="p" textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>
      <List aria-label="Voice notes on Rewards screens">
        {notes.map((note, index) => (
          <ListItem key={note.id} title={`Voice note ${notes.length - index}`} caption={`${note.length} · Alex Duong`} leading="icon-microphone-line" />
        ))}
      </List>
    </Stack>
  );
}

// ——— 2. The browser blocked the microphone ————————————————————————————————————————————————————————————————
function MicrophoneBlocked() {
  const take = useTake();
  const [blocked, setBlocked] = useState(true);
  const [asked, setAsked] = useState(false);
  return (
    <Stack gap="md">
      {asked && blocked ? (
        <InlineMessage theme="negative" title="Microphone access is off" action={{ label: "Allow microphone", onClick: () => { setBlocked(false); setAsked(false); take.setState("recording"); } }}>
          Your browser blocked the microphone for this site. Allow it, then record again.
        </InlineMessage>
      ) : null}
      <Card theme="flat" spacing="sm" className="pe-voice-card">
        <VoiceRecorder
          {...take.props}
          input={blocked ? "No microphone allowed" : "Built-in microphone"}
          format="48 kHz · Mono"
          onRecord={() => { if (blocked) setAsked(true); else take.setState("recording"); }}
          onPause={() => take.setState("paused")}
          onResume={() => take.setState("recording")}
          onFinish={() => take.reset()}
          onDiscard={() => take.reset()}
        />
      </Card>
    </Stack>
  );
}

// ——— 3. Talk a day through with Zen AI ———————————————————————————————————————————————————————————————————
const ASK = "Help me plan a calm start to my day";
const ANSWER = "Start with five quiet minutes, then choose one thing that matters today: the Rewards screens review at 10.";

function useConversation() {
  const [state, setState] = useState<AiVoiceState>("ready");
  const [muted, setMuted] = useState(false);
  const [heard, setHeard] = useState("");
  const timer = useRef<number | null>(null);
  // While listening, the transcript fills in word by word (a live transcript).
  useEffect(() => {
    if (state !== "listening") return undefined;
    const words = ASK.split(" ");
    let count = 0;
    setHeard("");
    timer.current = window.setInterval(() => { count = Math.min(words.length, count + 1); setHeard(`${words.slice(0, count).join(" ")}${count < words.length ? "…" : ""}`); }, 260);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [state]);
  const transcript = state === "responding" ? ANSWER : state === "listening" ? heard || "…" : `“${ASK}.”`;
  return {
    state, muted, transcript,
    props: {
      state, muted, transcript,
      onMutedChange: setMuted,
      onStart: () => setState("listening"),
      onDone: () => setState("responding"),
      onInterrupt: () => setState("listening"),
      onEnd: () => { setState("ready"); setMuted(false); },
    },
  };
}

function TalkWithZen() {
  const talk = useConversation();
  return (
    <Card theme="flat" spacing="sm" className="pe-voice-card">
      <AiVoiceConversation {...talk.props} />
    </Card>
  );
}

// ——— 4. On a phone ————————————————————————————————————————————————————————————————————————————————————
function PhoneVoice() {
  const talk = useConversation();
  return (
    // A white screen: the voice signal and the transcript card are Surface/Alt, as on Figma's Card.
    <PlatformPhone label="Zen voice on a phone" canvas="surface"
      header={<TopNavigation type="compact" title="Zen voice" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: talk.props.onEnd }} />}>
      <AiVoiceConversation {...talk.props} headingLevel={2} />
    </PlatformPhone>
  );
}

// ——— 5. The one-minute limit on a narrow card ———————————————————————————————————————————————————————————
const LIMIT = 60;

function TakeLimit() {
  const take = useTake();
  const [saved, setSaved] = useState("");
  const atLimit = take.seconds >= LIMIT;
  // The take stops itself at the limit: it pauses at 01:00 and says what is left to do.
  useEffect(() => {
    if (take.state === "recording" && atLimit) { take.setSeconds(LIMIT); take.setState("paused"); }
  }, [take, atLimit]);
  return (
    <Stack gap="md">
      <Card theme="flat" spacing="sm" className="pe-voice-card pe-voice-card--narrow">
        <VoiceRecorder
          {...take.props}
          title="Note for “Rewards screens — checkout copy review with Lumen Bank”"
          guidance={atLimit ? "You reached the 1-minute limit. Finish to attach the take, or discard it." : take.state === "ready" ? "Takes stop at 1 minute." : undefined}
          input="Built-in microphone"
          format="48 kHz · Mono"
          onRecord={() => { take.setSeconds(LIMIT - 3); take.setState("recording"); setSaved(""); }}
          onPause={() => take.setState("paused")}
          onResume={atLimit ? undefined : () => take.setState("recording")}
          onFinish={() => { setSaved(`Saved a ${clock(take.seconds, false)} voice note`); take.reset(); }}
          onDiscard={() => { setSaved("Take discarded"); take.reset(); }}
        />
      </Card>
      <Text as="p" textStyle="Body/Small/Regular" tone="base" role="status">{saved}</Text>
    </Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Record a voice note on a task",
    description: "Voice Recorder on a Card: Record starts the take, Pause and Resume hold it, Finish attaches it to the task's list and Discard throws it away. Discard and Finish stay off until there is a take.",
    code: `const [state, setState] = useState("ready");

<Card theme="flat" spacing="sm">
  <VoiceRecorder
    state={state}
    elapsed={elapsed} start={windowStart} end={windowEnd}
    title="Note for “Rewards screens”"
    input="Built-in microphone"
    format="48 kHz · Mono"
    onRecord={() => setState("recording")}
    onPause={() => setState("paused")}
    onResume={() => setState("recording")}
    onFinish={attachNote}
    onDiscard={discardTake}
  />
</Card>
<Text as="p" textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>
<List aria-label="Voice notes on Rewards screens">
  {notes.map((note) => <ListItem key={note.id} title={note.name} caption={note.length} leading="icon-microphone-line" />)}
</List>`,
    render: () => <TaskVoiceNote />,
  },
  {
    title: "Microphone blocked",
    description: "Record cannot start until the browser allows the microphone: an Inline Message says why and offers the fix, and the footer names the missing input. Allow microphone starts the take.",
    code: `{blocked && asked ? (
  <InlineMessage theme="negative" title="Microphone access is off"
    action={{ label: "Allow microphone", onClick: allowAndRecord }}>
    Your browser blocked the microphone for this site. Allow it, then record again.
  </InlineMessage>
) : null}
<Card theme="flat" spacing="sm">
  <VoiceRecorder state={state} input={blocked ? "No microphone allowed" : "Built-in microphone"} format="48 kHz · Mono"
    onRecord={() => (blocked ? setAsked(true) : setState("recording"))}
    onPause={pause} onResume={resume} onFinish={finish} onDiscard={discard} />
</Card>`,
    render: () => <MicrophoneBlocked />,
  },
  {
    title: "Talk a day through with Zen AI",
    description: "AI Voice Conversation: Start talking listens (the transcript fills in as you speak), Done speaking lets Zen answer, Interrupt takes the turn back and End closes the conversation. Mute is a toggle and stays off until you start.",
    code: `const [state, setState] = useState("ready");
const [muted, setMuted] = useState(false);

<Card theme="flat" spacing="sm">
  <AiVoiceConversation
    state={state}
    transcript={transcript}
    muted={muted} onMutedChange={setMuted}
    onStart={() => setState("listening")}
    onDone={() => setState("responding")}
    onInterrupt={() => setState("listening")}
    onEnd={() => setState("ready")}
  />
</Card>`,
    render: () => <TalkWithZen />,
  },
  {
    title: "Voice mode on a phone",
    description: "The same conversation full screen on a white phone screen (its signal and transcript card are Surface/Alt), under a compact Top Navigation whose Back ends it. The actions keep their 48 and 56px targets.",
    code: `<PlatformPhone canvas="surface" header={<TopNavigation type="compact" title="Zen voice" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: endConversation }} />}>
  <AiVoiceConversation state={state} transcript={transcript} muted={muted} onMutedChange={setMuted}
    onStart={listen} onDone={answer} onInterrupt={listen} onEnd={endConversation} />
</PlatformPhone>`,
    render: () => <PhoneVoice />,
  },
  {
    title: "The one-minute limit on a narrow card",
    description: "Edge cases: on a narrow card the long title truncates to one line, and a take that reaches its limit pauses itself at 01:00 and says why — Resume turns off (a main action without its handler is disabled), Finish saves it and Discard throws it away. (This demo starts three seconds before the limit.)",
    code: `<Card theme="flat" spacing="sm">
  <VoiceRecorder
    state={state}
    title="Note for “Rewards screens — checkout copy review with Lumen Bank”"
    guidance={atLimit ? "You reached the 1-minute limit. Finish to attach the take, or discard it." : undefined}
    elapsed={elapsed} start={windowStart} end={windowEnd}
    onRecord={record} onPause={pause}
    onResume={atLimit ? undefined : () => setState("recording")}
    onFinish={save} onDiscard={discard}
  />
</Card>`,
    render: () => <TakeLimit />,
  },
]);

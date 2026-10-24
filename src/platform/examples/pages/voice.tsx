/* Voice examples (Figma ❖ Voice 15081:1294): Đìzai Studio's work — a voice note on a task (Discard can be undone), a
   microphone the browser blocked, your own microphone's levels (with a silence warning), talking a day through with
   Zen AI (your turn ends on silence, then Zen thinks and answers), a turn it did not catch, and the conversation on a
   phone. Every action works. */
import { useEffect, useRef, useState } from "react";
import { Card } from "../../../components/Card";
import { DockIcon } from "../../../components/DockIcon";
import { InlineMessage } from "../../../components/InlineMessage";
import { Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { AiVoiceConversation, useVoiceLevels, VoiceRecorder, type AiVoiceState, type VoiceRecorderState } from "../../../components/Voice";
import { PlatformPhone } from "../../PlatformPhone";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "voice";

/** Seconds as Figma's "00:24.18" (or "00:24" for the timeline). */
const clock = (seconds: number, hundredths = true) => {
  const whole = Math.floor(seconds);
  const text = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  return hundredths ? `${text}.${String(Math.floor((seconds % 1) * 100)).padStart(2, "0")}` : text;
};

/** A recorder whose take counts up while it records: from the real clock, so the hundredths run like a stopwatch's. */
function useTake() {
  const [state, setState] = useState<VoiceRecorderState>("ready");
  const [seconds, setSeconds] = useState(0);
  const latest = useRef(0);
  latest.current = seconds;
  useEffect(() => {
    if (state !== "recording") return undefined;
    const from = performance.now() - latest.current * 1000;
    const timer = window.setInterval(() => setSeconds((performance.now() - from) / 1000), 47);
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
  const { toast } = useToast();
  const [notes, setNotes] = useState<Array<{ id: number; length: string }>>([{ id: 1, length: "00:42" }]);
  const [status, setStatus] = useState("");
  // A take is never lost to one press: Discard throws it away with an Undo that brings it back paused (review R4).
  const discard = () => {
    const kept = take.seconds;
    take.reset();
    setStatus("");
    toast({ title: "Take discarded", action: { label: "Undo", onClick: () => { take.setSeconds(kept); take.setState("paused"); setStatus("Take restored. Resume or finish it."); } } });
  };
  return (
    <Stack gap="md">
      <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
        <VoiceRecorder
          {...take.props}
          title="Note for “Rewards screens”"
          input="Built-in microphone"
          format="48 kHz · Mono"
          onRecord={() => { take.setSeconds(0); take.setState("recording"); setStatus(""); }}
          onPause={() => take.setState("paused")}
          onResume={() => take.setState("recording")}
          onFinish={() => { setNotes((all) => [{ id: Date.now(), length: clock(take.seconds, false) }, ...all]); setStatus("Voice note attached to Rewards screens"); take.reset(); }}
          onDiscard={discard}
        />
      </Card>
      <Text as="p" textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>
      <List aria-label="Voice notes on Rewards screens">
        {notes.map((note, index) => (
          <ListItem key={note.id} title={`Voice note ${notes.length - index}`} caption={`${note.length} · Alex Duong`} leading={<DockIcon icon="icon-microphone-line" size="md" background="subtle" />} />
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
      <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
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

// ——— 3. Your microphone's real levels, and silence called out ————————————————————————————————————————————————
/** 3 seconds at the waveform's 7 levels a second, under the quiet line: no sound reaches the microphone. */
const SILENT_LEVELS = 21;
const QUIET = 0.12;

function LiveMicrophone() {
  const take = useTake();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  // The real levels at the recorder's speed (useVoiceLevels, review R7); paused, the take holds still.
  const levels = useVoiceLevels(stream, { paused: take.state !== "recording" });
  // Nothing heard for 3 seconds while recording: say so, with the fix (review R6).
  const silent = take.state === "recording" && (levels?.length ?? 0) >= SILENT_LEVELS && Boolean(levels?.slice(-SILENT_LEVELS).every((level) => level < QUIET));
  useEffect(() => () => stream?.getTracks().forEach((track) => track.stop()), [stream]);
  const stop = () => { setStream(null); take.reset(); };
  const record = async () => {
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(microphone);
      setError("");
      setStatus("");
      take.setSeconds(0);
      take.setState("recording");
    } catch {
      setError("The browser did not allow the microphone. Allow it for this site, then record again.");
    }
  };
  return (
    <Stack gap="md">
      {error ? <InlineMessage theme="negative" title="Microphone access is off">{error}</InlineMessage> : null}
      <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
        <VoiceRecorder
          {...take.props}
          title="Try your microphone"
          levels={take.state === "ready" ? undefined : levels}
          guidance={silent ? "No sound detected. Check that your microphone is on and not muted." : undefined}
          input={stream ? stream.getAudioTracks()[0]?.label || "Microphone" : "Your microphone"}
          format="Live levels · 7 a second"
          onRecord={() => { void record(); }}
          onPause={() => take.setState("paused")}
          onResume={() => take.setState("recording")}
          onFinish={() => { setStatus(`Recorded ${clock(take.seconds, false)} from your microphone`); stop(); }}
          onDiscard={() => { setStatus("Take discarded"); stop(); }}
        />
      </Card>
      <Text as="p" textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>
    </Stack>
  );
}

// ——— 4. Talk a day through with Zen AI ———————————————————————————————————————————————————————————————————
const TURNS = [
  { ask: "Help me plan a calm start to my day", answer: "Start with five quiet minutes, then choose one thing that matters today: the Rewards screens review at 10." },
  { ask: "Move the review to eleven", answer: "Done. The Rewards screens review is at 11 now, so your morning stays clear until then." },
];

/**
 * A voice conversation that runs like a voice mode: your words reach the live transcript as you say them (none while
 * muted: the microphone hears nothing), your turn ends on a moment of silence (Done speaking is the manual way, review
 * A5), Zen thinks before it speaks (A4), its answer appears as it is spoken, and when it finishes Zen listens again for
 * your next turn. Interrupt stops the answer and gives you the turn.
 */
function useConversation() {
  const [state, setState] = useState<AiVoiceState>("ready");
  const [muted, setMuted] = useState(false);
  const [turn, setTurn] = useState(0);
  const [said, setSaid] = useState(0);
  const { ask, answer } = TURNS[turn % TURNS.length];
  const words = (state === "responding" ? answer : ask).split(" ");
  useEffect(() => {
    if (state === "ready" || (state === "listening" && muted)) return undefined;
    // Zen thinks for a moment before its first word.
    if (state === "thinking") {
      const timer = window.setTimeout(() => { setSaid(0); setState("responding"); }, 1400);
      return () => window.clearTimeout(timer);
    }
    // About 2.6 words a second for you and 2.9 for Zen. Your turn ends after 1.2 s of silence (end-of-speech, as voice
    // modes do); a finished answer hands the turn back after a short pause.
    const timer = said < words.length
      ? window.setTimeout(() => setSaid((count) => count + 1), state === "listening" ? 380 : 340)
      : state === "listening" ? window.setTimeout(() => setState("thinking"), 1200)
      : window.setTimeout(() => { setTurn((count) => count + 1); setSaid(0); setState("listening"); }, 1600);
    return () => window.clearTimeout(timer);
  }, [state, muted, said, words.length]);
  const spoken = words.slice(0, said).join(" ");
  const transcript = state === "ready" ? `“${TURNS[0].ask}.”` : !spoken ? "…" : said < words.length ? `${spoken}…` : state === "responding" ? spoken : `${spoken}.`;
  return {
    state, muted, transcript,
    props: {
      state, muted, transcript,
      onMutedChange: setMuted,
      onStart: () => { setSaid(0); setState("listening"); },
      onDone: () => setState("thinking"),
      onInterrupt: () => { setTurn((count) => count + 1); setSaid(0); setState("listening"); },
      onEnd: () => { setState("ready"); setMuted(false); setTurn(0); setSaid(0); },
    },
  };
}

function TalkWithZen() {
  const talk = useConversation();
  return (
    <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
      <AiVoiceConversation {...talk.props} />
    </Card>
  );
}

// ——— 5. A turn Zen did not catch ——————————————————————————————————————————————————————————————————————————
/** Listening and nothing heard for 4 seconds, or a turn ended with nothing in it: Zen says so and how to fix it (A8). */
function NotCaught() {
  const [state, setState] = useState<AiVoiceState>("ready");
  const [missed, setMissed] = useState(false);
  useEffect(() => {
    if (state !== "listening" || missed) return undefined;
    const timer = window.setTimeout(() => setMissed(true), 4000);
    return () => window.clearTimeout(timer);
  }, [state, missed]);
  return (
    <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
      <AiVoiceConversation
        state={state}
        heading={missed ? "I didn’t catch that" : undefined}
        guidance={missed ? "Say it again, a little closer to your microphone." : undefined}
        speaker={state === "ready" ? undefined : "You · Live transcript"}
        transcript={state === "ready" ? "“What’s on my calendar tomorrow?”" : "…"}
        onStart={() => { setMissed(false); setState("listening"); }}
        onDone={() => setMissed(true)}
        onInterrupt={() => setState("listening")}
        onEnd={() => { setMissed(false); setState("ready"); }}
      />
    </Card>
  );
}

// ——— 6. On a phone ————————————————————————————————————————————————————————————————————————————————————
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

// ——— 7. The one-minute limit on a narrow card ———————————————————————————————————————————————————————————
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
      <Card theme="default" spacing="sm" width="fill" maxWidth={320}>
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
    description: "Voice Recorder on a Card: Record starts the take, Pause and Resume hold it, Finish attaches it to the task's list and Discard throws it away with an Undo in a toast, so a take is never lost to one press. Discard and Finish stay off until there is a take.",
    code: `const [state, setState] = useState("ready");

<Card theme="default" spacing="sm">
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
    onDiscard={() => {
      const kept = take;
      resetTake();
      toast({ title: "Take discarded", action: { label: "Undo", onClick: () => restoreTake(kept) } });
    }}
  />
</Card>
<Text as="p" textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>
<List aria-label="Voice notes on Rewards screens">
  {notes.map((note) => <ListItem key={note.id} title={note.name} caption={note.length} leading={<DockIcon icon="icon-microphone-line" size="md" background="subtle" />} />)}
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
<Card theme="default" spacing="sm">
  <VoiceRecorder state={state} input={blocked ? "No microphone allowed" : "Built-in microphone"} format="48 kHz · Mono"
    onRecord={() => (blocked ? setAsked(true) : setState("recording"))}
    onPause={pause} onResume={resume} onFinish={finish} onDiscard={discard} />
</Card>`,
    render: () => <MicrophoneBlocked />,
  },
  {
    title: "Your microphone's real levels",
    description: "useVoiceLevels(stream) turns your microphone into the recorder's levels: one every 1/7 s, the waveform's speed, so a real take scrolls like the sample. Paused, the take holds still. When nothing is heard for 3 seconds the guidance says so and what to check. Record asks for the microphone.",
    code: `const [stream, setStream] = useState<MediaStream | null>(null);
const levels = useVoiceLevels(stream, { paused: state !== "recording" });
// 3 seconds (21 levels) under the quiet line while recording: no sound reaches the microphone.
const silent = state === "recording" && levels?.slice(-21).every((level) => level < 0.12);

<VoiceRecorder
  state={state}
  levels={state === "ready" ? undefined : levels}
  guidance={silent ? "No sound detected. Check that your microphone is on and not muted." : undefined}
  onRecord={async () => { setStream(await navigator.mediaDevices.getUserMedia({ audio: true })); setState("recording"); }}
  onPause={pause} onResume={resume} onFinish={finish} onDiscard={discard}
/>`,
    render: () => <LiveMicrophone />,
  },
  {
    title: "Talk a day through with Zen AI",
    description: "AI Voice Conversation: Start talking listens (the transcript fills in as you speak) and your turn ends on a moment of silence — Done speaking is the manual way. Zen thinks (the signal rests as dots that brighten in turn), then its words appear as it says them and it listens again. Interrupt takes the turn back and End closes the conversation. Mute is a toggle that stays off until you start; muted, the signal rests and the transcript stops.",
    code: `const [state, setState] = useState("ready");
const [muted, setMuted] = useState(false);
// Your speech detection ends the turn on 1.2 s of silence, as voice modes do: setState("thinking").

<Card theme="default" spacing="sm">
  <AiVoiceConversation
    state={state}
    transcript={transcript}
    muted={muted} onMutedChange={setMuted}
    onStart={() => setState("listening")}
    onDone={() => setState("thinking")}
    onInterrupt={() => setState("listening")}
    onEnd={() => setState("ready")}
  />
</Card>`,
    render: () => <TalkWithZen />,
  },
  {
    title: "A turn Zen did not catch",
    description: "Listening and nothing heard for 4 seconds (or Done speaking with nothing said): the heading and guidance say so in plain words and how to fix it, and Zen keeps listening. A dropped connection reads the same way: what happened, then what to do.",
    code: `<AiVoiceConversation
  state={state}
  heading={missed ? "I didn’t catch that" : undefined}
  guidance={missed ? "Say it again, a little closer to your microphone." : undefined}
  transcript={transcript}
  onStart={listen} onDone={() => setMissed(true)} onInterrupt={listen} onEnd={end}
/>`,
    render: () => <NotCaught />,
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
    code: `<Card theme="default" spacing="sm">
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

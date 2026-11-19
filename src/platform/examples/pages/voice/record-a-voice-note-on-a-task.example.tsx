import { useRef, useState } from "react";
import { Card, DockIcon, List, ListItem, Stack, Text, VoiceRecorder, useToast, type VoiceRecorderState } from "@zen-ds/react";

/** Seconds as Figma's "00:24.18" (or "00:24" for the timeline). */
const clock = (seconds: number, hundredths = true) => {
  const whole = Math.floor(seconds);
  const text = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  return hundredths ? `${text}.${String(Math.floor((seconds % 1) * 100)).padStart(2, "0")}` : text;
};

export default function TaskVoiceNote() {
  const { toast } = useToast();
  const [state, setState] = useState<VoiceRecorderState>("ready");
  const [seconds, setSeconds] = useState(0);
  const [notes, setNotes] = useState<Array<{ id: number; length: string }>>([{ id: 1, length: "00:42" }]);
  const [status, setStatus] = useState("");
  const recorderRef = useRef<HTMLDivElement>(null);
  // The take counts up from the real clock while it records, so the hundredths run like a stopwatch's. Each start is a
  // new run: Pause, Finish and Discard begin another, so the old run's next tick stops (as does a recorder that left
  // the screen).
  const run = useRef(0);
  const record = (at: number) => {
    const id = ++run.current;
    const from = performance.now() - at * 1000;
    const tick = () => setTimeout(() => {
      if (run.current !== id || !recorderRef.current) return;
      setSeconds((performance.now() - from) / 1000);
      tick();
    }, 47);
    setSeconds(at);
    setState("recording");
    tick();
  };
  const pause = () => {
    run.current += 1;
    setState("paused");
  };
  const reset = () => {
    run.current += 1;
    setState("ready");
    setSeconds(0);
  };
  // A take is never lost to one press: Discard throws it away with an Undo that brings it back paused.
  const discard = () => {
    const kept = seconds;
    reset();
    setStatus("");
    toast({ title: "Take discarded", action: { label: "Undo", onClick: () => { pause(); setSeconds(kept); setStatus("Take restored. Resume or finish it."); } } });
  };
  return (
    <Stack gap="md">
      <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
        <VoiceRecorder
          ref={recorderRef}
          state={state}
          elapsed={clock(seconds)}
          // The waveform's window: the last 8 seconds of the take.
          start={clock(Math.max(0, seconds - 8), false)}
          end={clock(seconds, false)}
          title="Note for “Rewards screens”"
          input="Built-in microphone"
          format="48 kHz · Mono"
          onRecord={() => { record(0); setStatus(""); }}
          onPause={pause}
          onResume={() => record(seconds)}
          onFinish={() => { setNotes((all) => [{ id: Date.now(), length: clock(seconds, false) }, ...all]); setStatus("Voice note attached to Rewards screens"); reset(); }}
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

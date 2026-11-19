import { useRef, useState } from "react";
import { Card, InlineMessage, Stack, VoiceRecorder, type VoiceRecorderState } from "@zen-ds/react";

/** Seconds as Figma's "00:24.18" (or "00:24" for the timeline). */
const clock = (seconds: number, hundredths = true) => {
  const whole = Math.floor(seconds);
  const text = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  return hundredths ? `${text}.${String(Math.floor((seconds % 1) * 100)).padStart(2, "0")}` : text;
};

export default function MicrophoneBlocked() {
  const [state, setState] = useState<VoiceRecorderState>("ready");
  const [seconds, setSeconds] = useState(0);
  const [blocked, setBlocked] = useState(true);
  const [asked, setAsked] = useState(false);
  const recorderRef = useRef<HTMLDivElement>(null);
  // The take counts up from the real clock while it records. Each start is a new run: Pause, Finish and Discard begin
  // another, so the old run's next tick stops (as does a recorder that left the screen).
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
  return (
    <Stack gap="md">
      {asked && blocked ? (
        <InlineMessage theme="negative" title="Microphone access is off" action={{ label: "Allow microphone", onClick: () => { setBlocked(false); setAsked(false); record(0); } }}>
          Your browser blocked the microphone for this site. Allow it, then record again.
        </InlineMessage>
      ) : null}
      <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
        <VoiceRecorder
          ref={recorderRef}
          state={state}
          elapsed={clock(seconds)}
          start={clock(Math.max(0, seconds - 8), false)}
          end={clock(seconds, false)}
          input={blocked ? "No microphone allowed" : "Built-in microphone"}
          format="48 kHz · Mono"
          onRecord={() => { if (blocked) setAsked(true); else record(0); }}
          onPause={pause}
          onResume={() => record(seconds)}
          onFinish={reset}
          onDiscard={reset}
        />
      </Card>
    </Stack>
  );
}

import { useRef, useState } from "react";
import { Card, Stack, Text, VoiceRecorder, type VoiceRecorderState } from "@zen-ds/react";

/** Seconds as Figma's "00:24.18" (or "00:24" for the timeline). */
const clock = (seconds: number, hundredths = true) => {
  const whole = Math.floor(seconds);
  const text = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  return hundredths ? `${text}.${String(Math.floor((seconds % 1) * 100)).padStart(2, "0")}` : text;
};

const LIMIT = 60;

export default function TakeLimit() {
  const [state, setState] = useState<VoiceRecorderState>("ready");
  const [seconds, setSeconds] = useState(0);
  const [saved, setSaved] = useState("");
  const recorderRef = useRef<HTMLDivElement>(null);
  const atLimit = seconds >= LIMIT;
  // The take counts up from the real clock while it records. Each start is a new run: Pause, Finish and Discard begin
  // another, so the old run's next tick stops (as does a recorder that left the screen).
  const run = useRef(0);
  const record = (at: number) => {
    const id = ++run.current;
    const from = performance.now() - at * 1000;
    const tick = () => setTimeout(() => {
      if (run.current !== id || !recorderRef.current) return;
      const now = (performance.now() - from) / 1000;
      // The take stops itself at the limit: it pauses at 01:00 and says what is left to do.
      if (now >= LIMIT) {
        setSeconds(LIMIT);
        setState("paused");
        return;
      }
      setSeconds(now);
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
      <Card theme="default" spacing="sm" width="fill" maxWidth={320}>
        <VoiceRecorder
          ref={recorderRef}
          state={state}
          elapsed={clock(seconds)}
          start={clock(Math.max(0, seconds - 8), false)}
          end={clock(seconds, false)}
          title="Note for “Rewards screens — checkout copy review with Lumen Bank”"
          guidance={atLimit ? "You reached the 1-minute limit. Finish to attach the take, or discard it." : state === "ready" ? "Takes stop at 1 minute." : undefined}
          input="Built-in microphone"
          format="48 kHz · Mono"
          // The demo starts three seconds before the limit.
          onRecord={() => { record(LIMIT - 3); setSaved(""); }}
          onPause={pause}
          // A main action without its handler is off: Resume at the limit.
          onResume={atLimit ? undefined : () => record(seconds)}
          onFinish={() => { setSaved(`Saved a ${clock(seconds, false)} voice note`); reset(); }}
          onDiscard={() => { setSaved("Take discarded"); reset(); }}
        />
      </Card>
      <Text as="p" textStyle="Body/Small/Regular" tone="base" role="status">{saved}</Text>
    </Stack>
  );
}

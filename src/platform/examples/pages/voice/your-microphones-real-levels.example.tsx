import { useRef, useState } from "react";
import { Card, InlineMessage, Stack, Text, VoiceRecorder, useVoiceLevels, type VoiceRecorderState } from "@zen-ds/react";

/** Seconds as Figma's "00:24.18" (or "00:24" for the timeline). */
const clock = (seconds: number, hundredths = true) => {
  const whole = Math.floor(seconds);
  const text = `${String(Math.floor(whole / 60)).padStart(2, "0")}:${String(whole % 60).padStart(2, "0")}`;
  return hundredths ? `${text}.${String(Math.floor((seconds % 1) * 100)).padStart(2, "0")}` : text;
};

/** 3 seconds at the waveform's 7 levels a second, under the quiet line: no sound reaches the microphone. */
const SILENT_LEVELS = 21;
const QUIET = 0.12;

export default function LiveMicrophone() {
  const [state, setState] = useState<VoiceRecorderState>("ready");
  const [seconds, setSeconds] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const recorderRef = useRef<HTMLDivElement>(null);
  // The real levels at the recorder's speed; paused, the take holds still.
  const levels = useVoiceLevels(stream, { paused: state !== "recording" });
  // Nothing heard for 3 seconds while recording: say so, with the fix.
  const silent = state === "recording" && (levels?.length ?? 0) >= SILENT_LEVELS && Boolean(levels?.slice(-SILENT_LEVELS).every((level) => level < QUIET));
  // The take counts up from the real clock while it records. Each start is a new run: Pause, Finish and Discard begin
  // another, so the old run's next tick stops. A recorder that left the screen mid-take lets the microphone go.
  const run = useRef(0);
  const record = (at: number, microphone: MediaStream) => {
    const id = ++run.current;
    const from = performance.now() - at * 1000;
    const tick = () => setTimeout(() => {
      if (run.current !== id) return;
      if (!recorderRef.current) { microphone.getTracks().forEach((track) => track.stop()); return; }
      setSeconds((performance.now() - from) / 1000);
      tick();
    }, 47);
    setSeconds(at);
    setState("recording");
    tick();
  };
  // Paused, the take keeps the microphone; a recorder that left the screen lets it go here too.
  const pause = () => {
    const id = ++run.current;
    setState("paused");
    const watch = () => setTimeout(() => {
      if (run.current !== id) return;
      if (!recorderRef.current) { stream?.getTracks().forEach((track) => track.stop()); return; }
      watch();
    }, 500);
    watch();
  };
  // Finish and Discard end the take and stop the microphone, so the browser's recording light goes off.
  const stop = () => {
    run.current += 1;
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    setState("ready");
    setSeconds(0);
  };
  const start = async () => {
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(microphone);
      setError("");
      setStatus("");
      record(0, microphone);
    } catch {
      setError("The browser did not allow the microphone. Allow it for this site, then record again.");
    }
  };
  return (
    <Stack gap="md">
      {error ? <InlineMessage theme="negative" title="Microphone access is off">{error}</InlineMessage> : null}
      <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
        <VoiceRecorder
          ref={recorderRef}
          state={state}
          elapsed={clock(seconds)}
          start={clock(Math.max(0, seconds - 8), false)}
          end={clock(seconds, false)}
          title="Try your microphone"
          levels={state === "ready" ? undefined : levels}
          guidance={silent ? "No sound detected. Check that your microphone is on and not muted." : undefined}
          input={stream ? stream.getAudioTracks()[0]?.label || "Microphone" : "Your microphone"}
          format="Live levels · 7 a second"
          onRecord={() => { void start(); }}
          onPause={pause}
          onResume={() => { if (stream) record(seconds, stream); }}
          onFinish={() => { setStatus(`Recorded ${clock(seconds, false)} from your microphone`); stop(); }}
          onDiscard={() => { setStatus("Take discarded"); stop(); }}
        />
      </Card>
      <Text as="p" textStyle="Body/Small/Regular" tone="base" role="status">{status}</Text>
    </Stack>
  );
}

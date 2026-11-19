import { useRef, useState } from "react";
import { AiVoiceConversation, Card, type AiVoiceState } from "@zen-ds/react";

const TURNS = [
  { ask: "Help me plan a calm start to my day", answer: "Start with five quiet minutes, then choose one thing that matters today: the Rewards screens review at 10." },
  { ask: "Move the review to eleven", answer: "Done. The Rewards screens review is at 11 now, so your morning stays clear until then." },
];

/** Where the conversation is: its state, which exchange, and how many words of the current turn are said. */
type Moment = { state: AiVoiceState; turn: number; said: number };

/**
 * What comes next, and after how long. Zen thinks for a moment before its first word. About 2.6 words a second for you
 * and 2.9 for Zen. Your turn ends after 1.2 s of silence (end-of-speech, as voice modes do); a finished answer hands the
 * turn back after a short pause.
 */
function after(now: Moment): [Moment, number] {
  if (now.state === "thinking") return [{ ...now, state: "responding", said: 0 }, 1400];
  const { ask, answer } = TURNS[now.turn % TURNS.length];
  const words = (now.state === "responding" ? answer : ask).split(" ").length;
  if (now.said < words) return [{ ...now, said: now.said + 1 }, now.state === "listening" ? 380 : 340];
  if (now.state === "listening") return [{ ...now, state: "thinking" }, 1200];
  return [{ state: "listening", turn: now.turn + 1, said: 0 }, 1600];
}

/**
 * A voice conversation that runs like a voice mode: your words reach the live transcript as you say them (none while
 * muted: the microphone hears nothing), your turn ends on a moment of silence (Done speaking is the manual way), Zen
 * thinks before it speaks, its answer appears as it is spoken, and when it finishes Zen listens again for your next
 * turn. Interrupt stops the answer and gives you the turn.
 */
export default function TalkWithZen() {
  const [moment, setMoment] = useState<Moment>({ state: "ready", turn: 0, said: 0 });
  const [muted, setMuted] = useState(false);
  const voiceRef = useRef<HTMLDivElement>(null);
  // Each press starts a new run of steps from where it puts the conversation; a step of an older run (or of a
  // conversation that left the screen) stops there.
  const run = useRef(0);
  const play = (now: Moment, isMuted: boolean) => {
    const id = ++run.current;
    const step = (from: Moment) => {
      // Nothing moves before Start, or on your turn while muted.
      if (from.state === "ready" || (from.state === "listening" && isMuted)) return;
      const [next, wait] = after(from);
      setTimeout(() => {
        if (run.current !== id || !voiceRef.current) return;
        setMoment(next);
        step(next);
      }, wait);
    };
    setMoment(now);
    step(now);
  };
  const { ask, answer } = TURNS[moment.turn % TURNS.length];
  const words = (moment.state === "responding" ? answer : ask).split(" ");
  const spoken = words.slice(0, moment.said).join(" ");
  const transcript = moment.state === "ready" ? `“${TURNS[0].ask}.”` : !spoken ? "…" : moment.said < words.length ? `${spoken}…` : moment.state === "responding" ? spoken : `${spoken}.`;
  return (
    <Card theme="default" spacing="sm" width="fill" maxWidth={448}>
      <AiVoiceConversation
        ref={voiceRef}
        state={moment.state}
        muted={muted}
        transcript={transcript}
        // Muting or unmuting starts the current wait again (muted on your turn, it waits for you).
        onMutedChange={(next) => { setMuted(next); play(moment, next); }}
        onStart={() => play({ ...moment, state: "listening", said: 0 }, muted)}
        onDone={() => play({ ...moment, state: "thinking" }, muted)}
        onInterrupt={() => play({ state: "listening", turn: moment.turn + 1, said: 0 }, muted)}
        onEnd={() => { setMuted(false); play({ state: "ready", turn: 0, said: 0 }, false); }}
      />
    </Card>
  );
}

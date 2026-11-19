import { useRef, useState, type RefObject } from "react";
import { AiVoiceConversation, AppShell, Box, TopNavigation, type AiVoiceState } from "@zen-ds/react";

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

// scrollRef: what scrolls the screen, so the bar draws its rule once content runs under it. "window" in your app.
export default function PhoneVoice({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
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
  const end = () => { setMuted(false); play({ state: "ready", turn: 0, said: 0 }, false); };
  const { ask, answer } = TURNS[moment.turn % TURNS.length];
  const words = (moment.state === "responding" ? answer : ask).split(" ");
  const spoken = words.slice(0, moment.said).join(" ");
  const transcript = moment.state === "ready" ? `“${TURNS[0].ask}.”` : !spoken ? "…" : moment.said < words.length ? `${spoken}…` : moment.state === "responding" ? spoken : `${spoken}.`;
  return (
    // A white screen (canvas="alt"): the voice signal and the transcript card are Surface/Alt, as on Figma's Card. Back
    // ends the conversation.
    <AppShell canvas="alt"
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact" title="Zen voice" leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: end }} />}>
      {/* The conversation pads itself as a full screen, so it takes back the page margin at the sides and the space above it. */}
      <Box style={{ margin: "calc(-1 * var(--zen-spacing-padding-xsmall, 8px)) calc(-1 * var(--zen-margin-comfortable, 20px)) 0" }}>
        <AiVoiceConversation
          ref={voiceRef}
          headingLevel={2}
          state={moment.state}
          muted={muted}
          transcript={transcript}
          onMutedChange={(next) => { setMuted(next); play(moment, next); }}
          onStart={() => play({ ...moment, state: "listening", said: 0 }, muted)}
          onDone={() => play({ ...moment, state: "thinking" }, muted)}
          onInterrupt={() => play({ state: "listening", turn: moment.turn + 1, said: 0 }, muted)}
          onEnd={end}
        />
      </Box>
    </AppShell>
  );
}

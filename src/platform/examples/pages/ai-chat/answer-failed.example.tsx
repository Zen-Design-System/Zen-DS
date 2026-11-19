import { useRef, useState } from "react";
import { AiChatBubble, AiChatThread, Box, InlineMessage, type AiChatAction } from "@zen-ds/react";
import { formatMoney, projectById, studioMonths } from "../../data";

/** Invoiced revenue of a quarter, from the studio's months (the Metric and Chart pages use the same series). */
const quarter = (ids: string[]) => studioMonths.filter((m) => ids.includes(m.id)).reduce((sum, m) => sum + m.invoiced, 0);
const q2 = quarter(["apr", "may", "jun"]), q3 = quarter(["jul", "aug", "sep"]);
const lumen = projectById("lumen-banking");
/** Zen AI's answer once the report loads. */
const reportSummary = `The Q3 studio report in short:\n\n• Revenue: ${formatMoney(q3)}, up ${Math.round((q3 / q2 - 1) * 100)}% on Q2.\n• Utilisation: 78% in September, 2 points below August.\n• Largest budget: ${lumen.name}, ${formatMoney(lumen.spent)} spent of ${formatMoney(lumen.budget)}.`;

/** A turn of the conversation. Ids are the moment a turn started (a real app takes its messages' ids). */
type Turn = { id: number; side: "you" | "ai"; text: string; state?: "thinking" | "streaming" | "done" };

/** A failed answer: the question stays, a Negative Inline Message takes the answer's place, and Try again retries. */
export default function AnswerFailed() {
  const [turns, setTurns] = useState<Turn[]>([{ id: 1, side: "you", text: "Summarise the Q3 studio report" }]);
  const [failed, setFailed] = useState(true);
  const [votes, setVotes] = useState<Partial<Record<number, "up" | "down">>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const threadRef = useRef<HTMLElement>(null);

  /** Zen AI thinks for a moment, then the answer arrives a word at a time (a real app streams it from its model). */
  const stream = (id: number, text: string) => {
    const words = text.match(/\S+\s*/g) ?? [];
    const step = (shown: number) => {
      if (!threadRef.current) return; // The example has closed: its answer stops streaming.
      setTurns((all) => all.map((turn): Turn => (turn.id === id ? { ...turn, text: words.slice(0, shown).join(""), state: shown < words.length ? "streaming" : "done" } : turn)));
      if (shown < words.length) setTimeout(() => step(shown + 1), 45);
    };
    setTimeout(() => step(1), 900);
  };
  const retry = () => {
    setFailed(false);
    const id = Date.now();
    setTurns((all) => [...all, { id, side: "ai", text: "", state: "thinking" }]);
    stream(id, reportSummary);
    // Try again leaves with the message: focus moves to the conversation, not to <body>.
    setTimeout(() => threadRef.current?.focus());
  };
  const regenerate = (answer: Turn) => {
    setTurns((all) => all.map((turn): Turn => (turn.id === answer.id ? { ...turn, text: "", state: "thinking" } : turn)));
    stream(answer.id, reportSummary);
  };

  // Copy confirms in place for 2 seconds; the thumbs are toggle buttons that swap to the solid glyph.
  const copy = (turn: Turn): AiChatAction => ({
    icon: copied === turn.id ? "icon-check-line" : "icon-copy-line",
    label: copied === turn.id ? "Copied" : "Copy",
    onClick: () => {
      void navigator.clipboard?.writeText(turn.text).catch(() => undefined);
      setCopied(turn.id);
      setTimeout(() => setCopied((current) => (current === turn.id ? null : current)), 2000);
    },
  });
  const feedback = (turn: Turn): AiChatAction[] => (["up", "down"] as const).map((value) => ({
    icon: `icon-thumbs-${value}-${votes[turn.id] === value ? "solid" : "line"}` as const,
    label: value === "up" ? "Good response" : "Bad response",
    pressed: votes[turn.id] === value,
    onClick: () => setVotes((all) => ({ ...all, [turn.id]: all[turn.id] === value ? undefined : value })),
  }));

  return (
    <Box ref={threadRef} tabIndex={-1}>
      <AiChatThread aria-label="Conversation with Zen AI">
        {turns.map((turn) => turn.side === "you" ? (
          <AiChatBubble key={turn.id} side="you" actions={[copy(turn)]}>{turn.text}</AiChatBubble>
        ) : (
          <AiChatBubble key={turn.id} side="ai" thinking={turn.state === "thinking"} thinkingLabel="Retrying" streaming={turn.state === "streaming"}
            actions={turn.state === "done" ? [...feedback(turn), { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: () => regenerate(turn) }, copy(turn)] : []}>
            {turn.text}
          </AiChatBubble>
        ))}
        {failed ? (
          <InlineMessage theme="negative" title="Zen AI couldn't finish this answer" action={{ label: "Try again", onClick: retry }}>
            The Q3 studio report didn't load in time. Your question is kept.
          </InlineMessage>
        ) : null}
      </AiChatThread>
    </Box>
  );
}

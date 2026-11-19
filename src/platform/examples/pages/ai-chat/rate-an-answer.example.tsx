import { useRef, useState } from "react";
import { AiChatBubble, AiChatThread, Chip, Stack, Text, type AiChatAction } from "@zen-ds/react";

/** Zen AI's answers, the first and each regenerated version in turn. */
const utilisationAnswers = [
  "Utilisation fell to 78%, 2 points below August. Most of the drop is Client Services at 58%: two pitches for new clients took 64 hours that can't be billed. Design (84%) and Engineering (81%) held steady.",
  "Mainly Client Services. Its utilisation fell to 58% because two new-client pitches took 64 unbillable hours. Without them, the studio would be at 80%, level with August.",
];
const reasons = ["Wrong numbers", "Too long", "Missed something"];

/** A turn of the conversation. Ids are the moment a turn started (a real app takes its messages' ids). */
type Turn = { id: number; side: "you" | "ai"; text: string; state?: "thinking" | "streaming" | "done" };

/** Good and Bad response are toggle buttons; Bad response asks what went wrong, and Regenerate counts the versions. */
export default function RateAnAnswer() {
  const [turns, setTurns] = useState<Turn[]>([
    { id: 1, side: "you", text: "Why did utilisation drop in September?" },
    { id: 2, side: "ai", text: utilisationAnswers[0], state: "done" },
  ]);
  const [votes, setVotes] = useState<Partial<Record<number, "up" | "down">>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [version, setVersion] = useState(1);
  const [askReason, setAskReason] = useState(false);
  const [note, setNote] = useState("");
  const noteRef = useRef<HTMLElement>(null);
  const [question, answer] = turns;

  /** Zen AI thinks for a moment, then the answer arrives a word at a time (a real app streams it from its model). */
  const stream = (id: number, text: string) => {
    const words = text.match(/\S+\s*/g) ?? [];
    const step = (shown: number) => {
      if (!noteRef.current) return; // The example has closed: its answer stops streaming.
      setTurns((all) => all.map((turn): Turn => (turn.id === id ? { ...turn, text: words.slice(0, shown).join(""), state: shown < words.length ? "streaming" : "done" } : turn)));
      if (shown < words.length) setTimeout(() => step(shown + 1), 45);
    };
    setTimeout(() => step(1), 900);
  };
  // A new version of the answer has a new id, so it starts unrated.
  const regenerate = () => {
    const id = Date.now();
    setTurns((all) => all.map((turn): Turn => (turn.id === answer.id ? { id, side: "ai", text: "", state: "thinking" } : turn)));
    stream(id, utilisationAnswers[version % utilisationAnswers.length]);
    setVersion((n) => n + 1);
    setAskReason(false);
    setNote("");
  };
  const vote = (value: "up" | "down") => {
    const next = votes[answer.id] === value ? undefined : value;
    setVotes((all) => ({ ...all, [answer.id]: next }));
    setAskReason(next === "down");
    setNote(next === "up" ? "Feedback sent" : "");
  };
  // Picking a reason removes the Chips, so focus moves to the line that confirms it.
  const sendReason = (reason: string) => {
    setAskReason(false);
    setNote(`Feedback sent: ${reason.toLowerCase()}`);
    setTimeout(() => noteRef.current?.focus());
  };

  // Copy confirms in place for 2 seconds; the thumbs swap to the solid glyph while pressed.
  const copy: AiChatAction = {
    icon: copied === answer.id ? "icon-check-line" : "icon-copy-line",
    label: copied === answer.id ? "Copied" : "Copy",
    onClick: () => {
      void navigator.clipboard?.writeText(answer.text).catch(() => undefined);
      setCopied(answer.id);
      setTimeout(() => setCopied((current) => (current === answer.id ? null : current)), 2000);
    },
  };
  const feedback = (["up", "down"] as const).map((value): AiChatAction => ({
    icon: `icon-thumbs-${value}-${votes[answer.id] === value ? "solid" : "line"}` as const,
    label: value === "up" ? "Good response" : "Bad response",
    pressed: votes[answer.id] === value,
    onClick: () => vote(value),
  }));

  return (
    <Stack gap="md">
      <AiChatThread aria-label="Conversation with Zen AI">
        <AiChatBubble side="you">{question.text}</AiChatBubble>
        <AiChatBubble side="ai" thinking={answer.state === "thinking"} streaming={answer.state === "streaming"} version={answer.state === "done" && version > 1 ? `${version}/${version}` : undefined}
          actions={answer.state === "done" ? [...feedback, { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: regenerate }, copy] : []}>
          {answer.text}
        </AiChatBubble>
        {askReason ? (
          <Stack gap="xs">
            <Text textStyle="Body/Small/Medium" tone="base">What went wrong?</Text>
            <Stack direction="row" gap="xs" wrap>
              {reasons.map((reason) => (
                <Chip key={reason} variant="normal" onClick={() => sendReason(reason)}>{reason}</Chip>
              ))}
            </Stack>
          </Stack>
        ) : null}
      </AiChatThread>
      <Text ref={noteRef} tabIndex={-1} textStyle="Caption/Regular" tone="light" role="status">{note}</Text>
    </Stack>
  );
}

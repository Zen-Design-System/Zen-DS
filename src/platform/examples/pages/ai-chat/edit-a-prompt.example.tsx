import { useRef, useState, type RefObject } from "react";
import { AiChatBubble, AiChatField, AiChatThread, Box, FileIcon, Popover, Stack, Tag, fileIconFormatOf, type AiChatAction } from "@zen-ds/react";
import { files, formatBytes, people, type StudioFile } from "../../data";

// ——— What Zen AI drafts: a kickoff agenda as long as the prompt asks ————————————————————————————————————
const agendaPrompt = "Draft a 60-minute kickoff agenda for the Saola Outdoor brand refresh on Oct 12: introductions, goals, the moodboard and next steps.";
/** Minutes per item for the lengths Alex is likely to ask for. */
const agendaSplits: Record<string, [number, number, number, number]> = { 30: [5, 5, 15, 5], 45: [5, 10, 20, 10], 60: [10, 15, 25, 10], 90: [15, 20, 40, 15] };
function agendaFor(prompt: string) {
  // The last length mentioned wins ("…60-minute… Keep it to 90 minutes.").
  const length = [...prompt.matchAll(/\b(30|45|60|90)\b/g)].pop()?.[1] ?? "60";
  const [intro, goals, moodboard, next] = agendaSplits[length];
  return `Brand refresh kickoff · Monday, Oct 12, 2026 · ${length} minutes\n\n1. Introductions (${intro} min): Gia Pham, Emi Sato, Linh Vo and the Saola Outdoor team.\n2. Goals (${goals} min): what the refresh must change, and what it must keep.\n3. Moodboard (${moodboard} min): Gia walks through the outdoor range directions.\n4. Next steps (${next} min): owners and dates for the first review.`;
}

// ——— The prompt field, with its model switch, attachments and dictation ———————————————————————————————
const models = [
  { id: "zen-2", label: "Zen 2", caption: "Best for reports and planning" },
  { id: "zen-2-mini", label: "Zen 2 Mini", caption: "Fastest for short answers" },
];
const recentFiles = ["f4", "f2", "f3"].map((id) => files.find((file) => file.id === id)!);

/** The field and its Popovers (model, recent files), which open against it. The prompt's text is the screen's, so Edit
 *  can put a prompt back in it. `fieldRef` is the field (AiChatField's <form>): a click on it puts the caret at the end
 *  of the prompt, so focus returns there after a pick, Stop or a removed file. */
function AskField({ fieldRef, text, onTextChange, onAsk, busy, onStop, modelId, onModelChange }: {
  fieldRef: RefObject<HTMLFormElement | null>;
  text: string;
  onTextChange: (text: string) => void;
  onAsk: (prompt: string, file?: StudioFile) => void;
  busy: boolean;
  onStop: () => void;
  modelId: string;
  onModelChange: (id: string) => void;
}) {
  const [open, setOpen] = useState<"model" | "files" | null>(null);
  const [file, setFile] = useState<StudioFile | null>(null);
  const focusPrompt = () => setTimeout(() => fieldRef.current?.click());
  return (
    // The field's Popovers position against it.
    <Stack gap="xs" style={{ position: "relative" }}>
      {file ? (
        <Stack direction="row" gap="2xs">
          <Tag leading={<FileIcon format={fileIconFormatOf(file.name)} />} remove onRemove={() => { setFile(null); focusPrompt(); }}>{file.name}</Tag>
        </Stack>
      ) : null}
      <Box>
        <AiChatField ref={fieldRef} value={text} onValueChange={onTextChange} fieldStyle="surface" placeholder="Ask Zen AI"
          model={models.find((option) => option.id === modelId)?.label} onModelClick={() => setOpen((current) => (current === "model" ? null : "model"))}
          onAttach={() => setOpen((current) => (current === "files" ? null : "files"))}
          // Dictation (a demo): what the microphone heard goes into the prompt, ready to edit.
          onVoice={() => { onTextChange("Make the kickoff agenda 45 minutes"); focusPrompt(); }}
          busy={busy} onStop={() => { onStop(); focusPrompt(); }}
          onSubmit={(prompt) => { onAsk(prompt, file ?? undefined); setFile(null); }} />
      </Box>
      <Popover open={open === "model"} onOpenChange={(next) => { if (!next) setOpen(null); }} anchorRef={fieldRef} align="end" autoFocus label="Model"
        items={models.map((option) => ({ id: option.id, label: option.label, caption: option.caption, selected: option.id === modelId }))}
        onSelect={(item) => { onModelChange(item.id); setOpen(null); focusPrompt(); }} />
      <Popover open={open === "files"} onOpenChange={(next) => { if (!next) setOpen(null); }} anchorRef={fieldRef} autoFocus label="Recent files"
        items={recentFiles.map((recent) => ({ id: recent.id, label: recent.name, caption: `${formatBytes(recent.bytes)} · ${people[recent.owner].name}`, leading: <FileIcon format={fileIconFormatOf(recent.name)} /> }))}
        onSelect={(item) => { setFile(recentFiles.find((recent) => recent.id === item.id) ?? null); setOpen(null); focusPrompt(); }} />
    </Stack>
  );
}

/** A turn of the conversation. Ids are the moment a turn started (a real app takes its messages' ids). */
type Turn = { id: number; side: "you" | "ai"; text: string; state?: "thinking" | "streaming" | "done" };

/** Edit puts a prompt back in the field; sending it replaces the old prompt and its answer. */
export default function EditAPrompt() {
  const [turns, setTurns] = useState<Turn[]>([
    { id: 1, side: "you", text: agendaPrompt },
    { id: 2, side: "ai", text: agendaFor(agendaPrompt), state: "done" },
  ]);
  // The answer's next word, so Stop can cancel it.
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();
  const [prompt, setPrompt] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [votes, setVotes] = useState<Partial<Record<number, "up" | "down">>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [modelId, setModelId] = useState(models[0].id);
  const fieldRef = useRef<HTMLFormElement>(null);
  const busy = turns.some((turn) => turn.side === "ai" && turn.state !== "done");

  /** Zen AI thinks for a moment, then the answer arrives a word at a time (a real app streams it from its model). */
  const stream = (id: number, answer: string) => {
    const words = answer.match(/\S+\s*/g) ?? [];
    const step = (shown: number) => {
      if (!fieldRef.current) return; // The example has closed: its answer stops streaming.
      // Only the turn this stream started on, while it still streams (Stop ends it).
      setTurns((all) => all.map((turn): Turn => (turn.id === id && turn.state !== "done"
        ? { ...turn, text: words.slice(0, shown).join(""), state: shown < words.length ? "streaming" : "done" }
        : turn)));
      if (shown < words.length) setTimer(setTimeout(() => step(shown + 1), 45));
    };
    setTimer(setTimeout(() => step(1), 900));
  };
  // An edited prompt replaces the old one and its answer; a new prompt adds a turn.
  const ask = (text: string) => {
    clearTimeout(timer);
    const id = Date.now();
    setTurns((all) => [
      ...(editing !== null ? all.slice(0, all.findIndex((turn) => turn.id === editing)) : all),
      { id, side: "you", text },
      { id: id + 1, side: "ai", text: "", state: "thinking" },
    ]);
    stream(id + 1, agendaFor(text));
    setEditing(null);
  };
  /** Stop keeps what has arrived. */
  const stop = () => {
    clearTimeout(timer);
    setTurns((all) => all.map((turn): Turn => (turn.side === "ai" && turn.state !== "done" ? { ...turn, state: "done", text: turn.text || "You stopped this answer." } : turn)));
  };
  // Edit puts the prompt in the field, with the caret at the end (a click on the field).
  const edit = (turn: Turn) => {
    setEditing(turn.id);
    setPrompt(turn.text);
    setTimeout(() => fieldRef.current?.click());
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
    <Stack gap="md">
      <AiChatThread aria-label="Conversation with Zen AI">
        {turns.map((turn) => turn.side === "you" ? (
          <AiChatBubble key={turn.id} side="you" actions={[copy(turn), { icon: "icon-edit-02-line", label: "Edit", onClick: () => edit(turn) }]}>{turn.text}</AiChatBubble>
        ) : (
          <AiChatBubble key={turn.id} side="ai" thinking={turn.state === "thinking"} streaming={turn.state === "streaming"}
            actions={turn.state === "done" ? [...feedback(turn), copy(turn)] : []}>
            {turn.text}
          </AiChatBubble>
        ))}
      </AiChatThread>
      <AskField fieldRef={fieldRef} text={prompt} onTextChange={setPrompt} modelId={modelId} onModelChange={setModelId} busy={busy} onStop={stop} onAsk={ask} />
    </Stack>
  );
}

/* AI Chat examples (docs/research/example-rebuild-brief-2026-09-30.md). Zen AI is the assistant inside Đìzai Studio's
   workspace: Alex asks it about his week, projects, files and invoices, and every answer comes from the shared studio
   data. Answers think for a moment and then stream a word at a time, so Stop, feedback and retry can be tried. */
import { useEffect, useRef, useState } from "react";
import { AiChatBlock, AiChatBubble, AiChatField, AiChatThread, type AiChatAction, type AiChatFieldStyle } from "../../../components/AiChat";
import { Button } from "../../../components/Button";
import { Chip } from "../../../components/Chip";
import { FileIcon, fileIconFormatOf } from "../../../components/FileIcon";
import { InlineMessage } from "../../../components/InlineMessage";
import { Box, Stack } from "../../../components/Layout";
import { Popover } from "../../../components/Popover";
import { Tag } from "../../../components/Tag";
import { Text } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhone } from "../../PlatformPhone";
import { files, formatBytes, formatDate, formatMoney, formatRange, formatRelative, invoices, leaveRequests, me, people, projectById, studioMonths, type StudioFile } from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./ai-chat.css";

export const page: PlatformPage = "ai-chat";

/* ───────────── What Zen AI knows (from the studio's data) ───────────── */

const firstName = me.name.split(" ")[0];
const lumen = projectById("lumen-banking");
const zenDs = projectById("zen-ds");
const overdue = invoices.find((invoice) => invoice.status === "Overdue")!;
const newestFile = files[0];
const myLeave = leaveRequests.find((request) => request.person === "alex")!;
/** Invoiced revenue of a quarter, from the studio's months (the Metric and Chart pages use the same series). */
const quarter = (ids: string[]) => studioMonths.filter((m) => ids.includes(m.id)).reduce((sum, m) => sum + m.invoiced, 0);
const q2 = quarter(["apr", "may", "jun"]), q3 = quarter(["jul", "aug", "sep"]);

const answers = {
  week: `Here's your week so far:\n\n• Due today: Audit the account overview for WCAG 2.2 (LUM-091), marked Urgent.\n• Waiting for your review: Connect the rewards API to checkout, from Bao Nguyen.\n• ${zenDs.name} is ${zenDs.progress}% done and due ${formatDate(zenDs.due)}, the last day of your leave (${formatRange(myLeave.from, myLeave.to)}).`,
  clientUpdate: `Here's a draft for ${lumen.client}:\n\nHi ${lumen.client} team,\n\nThe ${lumen.name.toLowerCase()} is ${lumen.progress}% done and on track for ${formatDate(lumen.due)}. This week Ava Chen runs five usability sessions on transfers, and Finn Walsh finished the passkey sign-in spike for iOS. Next, we audit the account overview for WCAG 2.2.\n\nBest,\n${firstName}`,
  overdue: `One invoice is overdue: ${overdue.number} to ${overdue.client} for ${formatMoney(overdue.amount)}, due ${formatDate(overdue.due)}. Shipment tracking is on hold, so a call with Duy Le may land better than a reminder.`,
  tomorrow: "Tomorrow, Thursday, Oct 1: Connect the rewards API to checkout (PHIN-219) is due, and it's waiting for your review. Nothing else of yours is due.",
  today: "Today, Wednesday, Sep 30:\n\n• Audit the account overview for WCAG 2.2 is due, marked Urgent.\n• Bao Nguyen is waiting for your review on the rewards API.\n• Chi Tran commented on the points history screen just now.",
  file: `The newest is “${newestFile.name}” (${formatBytes(newestFile.bytes)}) in Loyalty app. ${people[newestFile.owner].name} updated it ${formatRelative(newestFile.updated).toLowerCase()}.`,
  hours: "You logged 164 h in September: 92 h on Online banking redesign, 48 h on Zen design system, 16 h on Loyalty app and 8 h on Brand refresh.",
  fallback: "I can answer from the studio's projects, tasks, files and invoices. Which project should I look at: Loyalty app, Online banking redesign or Zen design system?",
};

/** What Zen AI says about a file attached with the prompt. */
const fileAnswers: Record<string, string> = {
  f4: `The Q3 studio report in short:\n\n• Revenue: ${formatMoney(q3)}, up ${Math.round((q3 / q2 - 1) * 100)}% on Q2.\n• Utilisation: 78% in September, 2 points below August.\n• Largest budget: ${lumen.name}, ${formatMoney(lumen.spent)} spent of ${formatMoney(lumen.budget)}.`,
  f2: "Ava Chen's plan runs five 45-minute sessions with customers who moved money in the last month. Each session tests three tasks: a new payee, a scheduled transfer and a failed transfer.",
  f3: "The contract has four endpoints: points balance, points history, redeem, and a webhook for new rewards. Checkout calls redeem, which Bao Nguyen is connecting now (PHIN-219).",
};

function replyTo(prompt: string, file?: StudioFile) {
  if (file) return fileAnswers[file.id] ?? answers.fallback;
  const routes: Array<[RegExp, string]> = [
    [/week/i, answers.week], [/lumen|client update/i, answers.clientUpdate], [/invoice|overdue/i, answers.overdue],
    [/tomorrow/i, answers.tomorrow], [/today|my day/i, answers.today], [/file/i, answers.file], [/hours/i, answers.hours],
  ];
  return routes.find(([test]) => test.test(prompt))?.[1] ?? answers.fallback;
}

/* ───────────── A demo assistant: think, then stream a word at a time ───────────── */

type Turn = { id: number; side: "you" | "ai"; text: string; state?: "thinking" | "streaming" | "done"; file?: StudioFile };

function useAssistant(initial: Turn[] = []) {
  const [turns, setTurns] = useState<Turn[]>(initial);
  const nextId = useRef(initial.length + 1);
  const timers = useRef<number[]>([]);
  const clear = () => { for (const timer of timers.current) { window.clearTimeout(timer); window.clearInterval(timer); } timers.current = []; };
  useEffect(() => clear, []);
  const patch = (id: number, change: Partial<Turn>) => setTurns((all) => all.map((turn) => (turn.id === id ? { ...turn, ...change } : turn)));
  const stream = (id: number, answer: string) => {
    const words = answer.match(/\S+\s*/g) ?? [];
    let shown = 0;
    timers.current.push(window.setTimeout(() => {
      const timer = window.setInterval(() => {
        shown += 1;
        patch(id, { text: words.slice(0, shown).join(""), state: shown >= words.length ? "done" : "streaming" });
        if (shown >= words.length) window.clearInterval(timer);
      }, 45);
      timers.current.push(timer);
    }, 900));
  };
  /** A new AI turn at the end of the thread. */
  const answer = (text: string) => { const id = nextId.current++; setTurns((all) => [...all, { id, side: "ai", text: "", state: "thinking" }]); stream(id, text); };
  return {
    turns,
    busy: turns.some((turn) => turn.side === "ai" && turn.state !== "done"),
    answer,
    ask: (prompt: string, reply: string, file?: StudioFile) => {
      clear();
      const id = nextId.current++;
      setTurns((all) => [...all, { id, side: "you", text: prompt, file }]);
      answer(reply);
    },
    /** Replace a prompt (and everything after it) with an edited one, then answer again. */
    edit: (id: number, prompt: string, reply: string) => {
      clear();
      const edited: Turn = { id: nextId.current++, side: "you", text: prompt };
      setTurns((all) => [...all.slice(0, all.findIndex((turn) => turn.id === id)), edited]);
      answer(reply);
    },
    regenerate: (id: number, reply: string) => { clear(); patch(id, { text: "", state: "thinking" }); stream(id, reply); },
    /** Stop keeps what has arrived. */
    stop: () => { clear(); setTurns((all) => all.map((turn) => (turn.side === "ai" && turn.state !== "done" ? { ...turn, state: "done", text: turn.text || "You stopped this answer." } : turn))); },
    reset: () => { clear(); setTurns([]); },
  };
}

/** Copy confirms in place for 2 seconds; the thumbs are toggle buttons that swap to the solid glyph. */
function useAnswerActions() {
  const [votes, setVotes] = useState<Partial<Record<number, "up" | "down">>>({});
  const [copied, setCopied] = useState<number | null>(null);
  useEffect(() => {
    if (copied === null) return undefined;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);
  const vote = (id: number, value: "up" | "down") => setVotes((all) => ({ ...all, [id]: all[id] === value ? undefined : value }));
  return {
    /** A new version of an answer starts unrated. */
    clearVote: (id: number) => setVotes((all) => ({ ...all, [id]: undefined })),
    copy: (turn: Turn): AiChatAction => ({
      icon: copied === turn.id ? "icon-check-line" : "icon-copy-line",
      label: copied === turn.id ? "Copied" : "Copy",
      onClick: () => { void navigator.clipboard?.writeText(turn.text).catch(() => undefined); setCopied(turn.id); },
    }),
    feedback: (turn: Turn, onVote?: (value: "up" | "down" | undefined) => void): AiChatAction[] => (["up", "down"] as const).map((value) => ({
      icon: `icon-thumbs-${value}-${votes[turn.id] === value ? "solid" : "line"}` as const,
      label: value === "up" ? "Good response" : "Bad response",
      pressed: votes[turn.id] === value,
      onClick: () => { vote(turn.id, value); onVote?.(votes[turn.id] === value ? undefined : value); },
    })),
  };
}

/** The prompt of a You bubble, with the file it was sent with above it. */
function Prompt({ turn }: { turn: Turn }) {
  if (!turn.file) return <>{turn.text}</>;
  return (
    <Stack gap="xs" align="end">
      <Stack direction="row" gap="2xs" align="center">
        <FileIcon format={fileIconFormatOf(turn.file.name)} />
        <Text as="span" textStyle="Body/Base/Medium">{turn.file.name}</Text>
      </Stack>
      <span>{turn.text}</span>
    </Stack>
  );
}

/* ───────────── The prompt field, with its model switch, attachments and dictation ───────────── */

const models = [
  { id: "zen-2", label: "Zen 2", caption: "Best for reports and planning" },
  { id: "zen-2-mini", label: "Zen 2 Mini", caption: "Fastest for short answers" },
];
const recentFiles = ["f4", "f2", "f3"].map((id) => files.find((file) => file.id === id)!);

function AskField({ onAsk, busy, onStop, fieldStyle = "default", dictation, modelId, onModelChange, draft, className }: {
  onAsk: (prompt: string, file?: StudioFile) => void;
  busy: boolean;
  onStop: () => void;
  fieldStyle?: AiChatFieldStyle;
  /** What the microphone hears: dictation fills the field with it. */
  dictation: string;
  /** The chosen model, kept by the screen so it survives the field moving to the dock. Phones leave the switch out. */
  modelId?: string;
  onModelChange?: (id: string) => void;
  /** Text to put back in the field (Edit on a prompt). */
  draft?: { key: number; text: string };
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState<"model" | "files" | null>(null);
  const [file, setFile] = useState<StudioFile | null>(null);
  // The field is uncontrolled: new text (dictation, Edit) remounts it with that text and puts the caret at the end.
  const [fill, setFill] = useState({ key: 0, text: "" });
  useEffect(() => { if (draft?.key) setFill((current) => ({ key: current.key + 1, text: draft.text })); }, [draft?.key, draft?.text]);
  const focusPrompt = () => requestAnimationFrame(() => {
    const input = wrapRef.current?.querySelector("textarea");
    input?.focus();
    input?.setSelectionRange(input.value.length, input.value.length);
  });
  useEffect(() => { if (fill.key) focusPrompt(); }, [fill.key]);
  // The Popovers attach to the button that opened them (the model switch, the + button).
  const toggle = (which: "model" | "files", selector: string) => {
    anchorRef.current = wrapRef.current?.querySelector<HTMLElement>(selector) ?? null;
    setOpen((current) => (current === which ? null : which));
  };
  return (
    <Stack gap="xs" className={["px-ai-chat-field", className].filter(Boolean).join(" ")}>
      {file ? (
        <Stack direction="row" gap="2xs">
          <Tag leading={<FileIcon format={fileIconFormatOf(file.name)} />} remove onRemove={() => { setFile(null); focusPrompt(); }}>{file.name}</Tag>
        </Stack>
      ) : null}
      <Box ref={wrapRef}>
        <AiChatField key={fill.key} defaultValue={fill.text} fieldStyle={fieldStyle} placeholder="Ask Zen AI"
          model={models.find((option) => option.id === modelId)?.label} onModelClick={() => toggle("model", ".zen-ai-field__model")}
          onAttach={() => toggle("files", ".zen-ai-field__leading button")}
          onVoice={() => setFill((current) => ({ key: current.key + 1, text: dictation }))}
          busy={busy} onStop={() => { onStop(); focusPrompt(); }}
          onSubmit={(text) => { onAsk(text, file ?? undefined); setFile(null); }} />
      </Box>
      <Popover open={open === "model"} onOpenChange={(next) => { if (!next) setOpen(null); }} anchorRef={anchorRef} align="end" autoFocus label="Model"
        items={models.map((option) => ({ id: option.id, label: option.label, caption: option.caption, selected: option.id === modelId }))}
        onSelect={(item) => { onModelChange?.(item.id); setOpen(null); anchorRef.current?.focus(); }} />
      <Popover open={open === "files"} onOpenChange={(next) => { if (!next) setOpen(null); }} anchorRef={anchorRef} autoFocus label="Recent files"
        items={recentFiles.map((recent) => ({ id: recent.id, label: recent.name, caption: `${formatBytes(recent.bytes)} · ${people[recent.owner].name}`, leading: <FileIcon format={fileIconFormatOf(recent.name)} /> }))}
        onSelect={(item) => { setFile(recentFiles.find((recent) => recent.id === item.id) ?? null); setOpen(null); focusPrompt(); }} />
    </Stack>
  );
}

/** Scroll a conversation to its newest line whenever it changes. */
function useScrollToEnd(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current; if (el) el.scrollTop = el.scrollHeight; }, [dep]);
  return ref;
}

/** The field moves between the greeting and the dock (a first prompt, New chat): the prompt keeps focus. Never on load. */
function useKeepPromptFocus(started: boolean, find: () => HTMLTextAreaElement | null | undefined) {
  const shown = useRef(started);
  useEffect(() => {
    if (shown.current === started) return;
    shown.current = started;
    find()?.focus({ preventScroll: true });
  });
}

/** Regenerate answers the prompt before the answer again. */
const promptBefore = (turns: Turn[], answer: Turn) => turns[turns.indexOf(answer) - 1];

/* ───────────── Assistant home ───────────── */

function AssistantHomeExample() {
  const chat = useAssistant();
  const actions = useAnswerActions();
  const [modelId, setModelId] = useState(models[0].id);
  const screenRef = useRef<HTMLDivElement>(null);
  const scrollRef = useScrollToEnd(chat.turns);
  const started = chat.turns.length > 0;
  useKeepPromptFocus(started, () => screenRef.current?.querySelector("textarea"));
  const ask = (prompt: string, file?: StudioFile) => chat.ask(prompt, replyTo(prompt, file), file);
  const last = chat.turns[chat.turns.length - 1];
  // A new version of the answer starts unrated.
  const regenerate = (turn: Turn) => { const prompt = promptBefore(chat.turns, turn); chat.regenerate(turn.id, replyTo(prompt.text, prompt.file)); actions.clearVote(turn.id); };
  const field = <AskField fieldStyle="surface" dictation="What's due tomorrow?" modelId={modelId} onModelChange={setModelId}
    busy={chat.busy} onStop={chat.stop} onAsk={ask} className={started ? "px-ai-chat-column" : undefined} />;
  return (
    <Box ref={screenRef} className="px-ai-chat-screen">
      <VisuallyHidden as="h1">Zen AI</VisuallyHidden>
      {started ? (
        <>
          {/* A strip over the conversation: block padding Small, the page margin at the sides (24, or 20 on a phone). */}
          <Stack direction="row" justify="end" className="px-ai-chat-screen__bar">
            <Button level="tertiary" startIcon="icon-message-plus-circle-line" onClick={chat.reset}>New chat</Button>
          </Stack>
          <Box ref={scrollRef} className="px-ai-chat-screen__scroll">
            <AiChatThread aria-label="Conversation with Zen AI">
              {chat.turns.map((turn) => turn.side === "you" ? (
                <AiChatBubble key={turn.id} side="you" actions={[actions.copy(turn)]}><Prompt turn={turn} /></AiChatBubble>
              ) : (
                <AiChatBubble key={turn.id} side="ai" thinking={turn.state === "thinking"} streaming={turn.state === "streaming"}
                  actions={turn.state === "done" ? [
                    ...actions.feedback(turn),
                    ...(turn === last ? [{ icon: "icon-refresh-cw-01-line" as const, label: "Regenerate", onClick: () => regenerate(turn) }] : []),
                    actions.copy(turn),
                  ] : []}>
                  {turn.text}
                </AiChatBubble>
              ))}
            </AiChatThread>
          </Box>
          <Box className="px-ai-chat-screen__dock">{field}</Box>
        </>
      ) : (
        <Box className="px-ai-chat-screen__home">
          <AiChatBlock greeting={`What are we working on, ${firstName}?`} suggestions={[
            { label: "Summarise my week", icon: "icon-align-left-line", onClick: () => ask("Summarise my week") },
            { label: "Draft a client update", icon: "icon-pencil-line", onClick: () => ask("Draft an update for Lumen Bank on the online banking redesign") },
            { label: "Check overdue invoices", icon: "icon-receipt-line", onClick: () => ask("Which invoices are overdue?") },
            { label: "Plan tomorrow", icon: "icon-calendar-check-line", onClick: () => ask("What's due tomorrow?") },
          ]}>
            {field}
          </AiChatBlock>
        </Box>
      )}
    </Box>
  );
}

/* ───────────── Rate an answer ───────────── */

const utilisationAnswers = [
  "Utilisation fell to 78%, 2 points below August. Most of the drop is Client Services at 58%: two pitches for new clients took 64 hours that can't be billed. Design (84%) and Engineering (81%) held steady.",
  "Mainly Client Services. Its utilisation fell to 58% because two new-client pitches took 64 unbillable hours. Without them, the studio would be at 80%, level with August.",
];
const reasons = ["Wrong numbers", "Too long", "Missed something"];

function RateAnswerExample() {
  const chat = useAssistant([
    { id: 1, side: "you", text: "Why did utilisation drop in September?" },
    { id: 2, side: "ai", text: utilisationAnswers[0], state: "done" },
  ]);
  const actions = useAnswerActions();
  const [version, setVersion] = useState(1);
  const [askReason, setAskReason] = useState(false);
  const [note, setNote] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const answer = chat.turns[1];
  // Picking a reason removes the Chips, so focus goes back to the pressed Bad response.
  const sendReason = (reason: string) => {
    setAskReason(false);
    setNote(`Feedback sent: ${reason.toLowerCase()}`);
    requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('[aria-label="Bad response"]')?.focus());
  };
  const onVote = (value: "up" | "down" | undefined) => { setAskReason(value === "down"); setNote(value === "up" ? "Feedback sent" : ""); };
  const regenerate = () => {
    chat.regenerate(answer.id, utilisationAnswers[version % utilisationAnswers.length]);
    setVersion((n) => n + 1);
    actions.clearVote(answer.id);
    setAskReason(false);
    setNote("");
  };
  return (
    <Stack ref={rootRef} gap="md">
      <AiChatThread aria-label="Conversation with Zen AI">
        <AiChatBubble side="you">{chat.turns[0].text}</AiChatBubble>
        <AiChatBubble side="ai" thinking={answer.state === "thinking"} streaming={answer.state === "streaming"} version={answer.state === "done" && version > 1 ? `${version}/${version}` : undefined}
          actions={answer.state === "done" ? [...actions.feedback(answer, onVote), { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: regenerate }, actions.copy(answer)] : []}>
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
      <Text textStyle="Caption/Regular" tone="light" role="status">{note}</Text>
    </Stack>
  );
}

/* ───────────── Answer failed ───────────── */

function AnswerFailedExample() {
  const chat = useAssistant([{ id: 1, side: "you", text: "Summarise the Q3 studio report" }]);
  const actions = useAnswerActions();
  const threadRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(true);
  const retry = () => {
    setFailed(false);
    chat.answer(fileAnswers.f4);
    // Try again leaves with the message: focus moves to the conversation, not to <body>.
    requestAnimationFrame(() => threadRef.current?.focus());
  };
  return (
    <Box ref={threadRef} tabIndex={-1}>
      <AiChatThread aria-label="Conversation with Zen AI">
        {chat.turns.map((turn) => turn.side === "you" ? (
          <AiChatBubble key={turn.id} side="you" actions={[actions.copy(turn)]}>{turn.text}</AiChatBubble>
        ) : (
          <AiChatBubble key={turn.id} side="ai" thinking={turn.state === "thinking"} thinkingLabel="Retrying" streaming={turn.state === "streaming"}
            actions={turn.state === "done" ? [...actions.feedback(turn), { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: () => chat.regenerate(turn.id, fileAnswers.f4) }, actions.copy(turn)] : []}>
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

/* ───────────── Edit a prompt ───────────── */

const agendaPrompt = "Draft a 60-minute kickoff agenda for the Saola Outdoor brand refresh on Oct 12: introductions, goals, the moodboard and next steps.";
/** Minutes per item for the lengths Alex is likely to ask for. */
const agendaSplits: Record<string, [number, number, number, number]> = { 30: [5, 5, 15, 5], 45: [5, 10, 20, 10], 60: [10, 15, 25, 10], 90: [15, 20, 40, 15] };
function agendaFor(prompt: string) {
  // The last length mentioned wins ("…60-minute… Keep it to 90 minutes.").
  const length = [...prompt.matchAll(/\b(30|45|60|90)\b/g)].pop()?.[1] ?? "60";
  const [intro, goals, moodboard, next] = agendaSplits[length];
  return `Brand refresh kickoff · Monday, Oct 12, 2026 · ${length} minutes\n\n1. Introductions (${intro} min): Gia Pham, Emi Sato, Linh Vo and the Saola Outdoor team.\n2. Goals (${goals} min): what the refresh must change, and what it must keep.\n3. Moodboard (${moodboard} min): Gia walks through the outdoor range directions.\n4. Next steps (${next} min): owners and dates for the first review.`;
}

function EditPromptExample() {
  const chat = useAssistant([
    { id: 1, side: "you", text: agendaPrompt },
    { id: 2, side: "ai", text: agendaFor(agendaPrompt), state: "done" },
  ]);
  const actions = useAnswerActions();
  const [draft, setDraft] = useState({ key: 0, text: "" });
  const [editing, setEditing] = useState<number | null>(null);
  const [modelId, setModelId] = useState(models[0].id);
  const ask = (prompt: string) => {
    // An edited prompt replaces the old one and its answer; a new prompt adds a turn.
    if (editing !== null) chat.edit(editing, prompt, agendaFor(prompt));
    else chat.ask(prompt, agendaFor(prompt));
    setEditing(null);
  };
  return (
    <Stack gap="md">
      <AiChatThread aria-label="Conversation with Zen AI">
        {chat.turns.map((turn) => turn.side === "you" ? (
          <AiChatBubble key={turn.id} side="you" actions={[
            actions.copy(turn),
            { icon: "icon-edit-02-line", label: "Edit", onClick: () => { setEditing(turn.id); setDraft((d) => ({ key: d.key + 1, text: turn.text })); } },
          ]}>{turn.text}</AiChatBubble>
        ) : (
          <AiChatBubble key={turn.id} side="ai" thinking={turn.state === "thinking"} streaming={turn.state === "streaming"}
            actions={turn.state === "done" ? [...actions.feedback(turn), actions.copy(turn)] : []}>
            {turn.text}
          </AiChatBubble>
        ))}
      </AiChatThread>
      <AskField fieldStyle="surface" dictation="Make the kickoff agenda 45 minutes" draft={draft} modelId={modelId} onModelChange={setModelId} busy={chat.busy} onStop={chat.stop} onAsk={ask} />
    </Stack>
  );
}

/* ───────────── Assistant on a phone ───────────── */

function PhoneAssistantExample() {
  const chat = useAssistant();
  const actions = useAnswerActions();
  const screenRef = useScrollToEnd(chat.turns);
  const started = chat.turns.length > 0;
  const ask = (prompt: string, file?: StudioFile) => chat.ask(prompt, replyTo(prompt, file), file);
  useKeepPromptFocus(started, () => screenRef.current?.closest(".platform-phone")?.querySelector("textarea"));
  const field = <AskField dictation="What's due today?" busy={chat.busy} onStop={chat.stop} onAsk={ask} />;
  return (
    // The screen that keeps the newest answer in view is also the Top Navigation's scroller: once the thread runs under
    // the bar, the bar shows its Pale rule.
    <PlatformPhone label="Zen AI" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={screenRef} trailing={started ? [{ icon: "icon-message-plus-circle-line", label: "New chat", onClick: chat.reset }] : undefined} />}
      footer={started ? <Box className="px-ai-chat-phone-dock">{field}</Box> : undefined}>
      {started ? (
        <Box className="px-ai-chat-phone-body">
          <AiChatThread aria-label="Conversation with Zen AI">
            {chat.turns.map((turn) => turn.side === "you" ? (
              <AiChatBubble key={turn.id} side="you" actions={[actions.copy(turn)]}><Prompt turn={turn} /></AiChatBubble>
            ) : (
              <AiChatBubble key={turn.id} side="ai" thinking={turn.state === "thinking"} streaming={turn.state === "streaming"}
                actions={turn.state === "done" ? [...actions.feedback(turn), actions.copy(turn)] : []}>
                {turn.text}
              </AiChatBubble>
            ))}
          </AiChatThread>
        </Box>
      ) : (
        <Box className="px-ai-chat-phone-home">
          <AiChatBlock greeting={`What do you need, ${firstName}?`} suggestions={[
            { label: "Plan my day", icon: "icon-calendar-check-line", onClick: () => ask("Plan my day") },
            { label: "Find a file", icon: "icon-folder-line", onClick: () => ask("Find the newest loyalty app file") },
            { label: "Check my hours", icon: "icon-clock-line", onClick: () => ask("How many hours did I log in September?") },
          ]}>
            {field}
          </AiChatBlock>
        </Box>
      )}
    </PlatformPhone>
  );
}

/* ───────────── Examples ───────────── */

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Assistant home",
    screen: true,
    description: "A full-page assistant opens on the Block: a greeting, the field and suggestions that start real tasks. The first prompt turns it into a Thread with the field docked below; the answer streams with Stop in the field and shows its actions once it ends. New chat goes back to the greeting.",
    render: () => <AssistantHomeExample />,
    code: `const [turns, setTurns] = useState<Turn[]>([]);
const streaming = turns.some((turn) => turn.side === "ai" && turn.state !== "done");
const field = <AiChatField fieldStyle="surface" placeholder="Ask Zen AI" model={model.label} onModelClick={openModels}
  onAttach={openFiles} onVoice={dictate} busy={streaming} onStop={stop} onSubmit={ask} />;

{turns.length === 0 ? (
  <AiChatBlock greeting="What are we working on, Alex?" suggestions={[
    { label: "Summarise my week", icon: "icon-align-left-line", onClick: () => ask("Summarise my week") },
    { label: "Check overdue invoices", icon: "icon-receipt-line", onClick: () => ask("Which invoices are overdue?") },
  ]}>
    {field}
  </AiChatBlock>
) : (
  <>
    <Button level="tertiary" startIcon="icon-message-plus-circle-line" onClick={() => setTurns([])}>New chat</Button>
    <AiChatThread aria-label="Conversation with Zen AI">
      {turns.map((turn) => (
        <AiChatBubble key={turn.id} side={turn.side} thinking={turn.state === "thinking"} streaming={turn.state === "streaming"}
          actions={turn.state === "streaming" || turn.state === "thinking" ? [] : actionsFor(turn)}>
          {turn.text}
        </AiChatBubble>
      ))}
    </AiChatThread>
    {field}
  </>
)}`,
  },
  {
    title: "Rate an answer",
    description: "Good and Bad response are toggle buttons that swap to the solid thumb. Bad response asks what went wrong with a row of Chips; Regenerate streams a new version and counts it (2/2).",
    render: () => <RateAnswerExample />,
    code: `<AiChatBubble side="ai" version={version > 1 ? \`\${version}/\${version}\` : undefined} actions={[
  { icon: vote === "up" ? "icon-thumbs-up-solid" : "icon-thumbs-up-line", label: "Good response", pressed: vote === "up", onClick: () => toggle("up") },
  { icon: vote === "down" ? "icon-thumbs-down-solid" : "icon-thumbs-down-line", label: "Bad response", pressed: vote === "down", onClick: () => toggle("down") },
  { icon: "icon-refresh-cw-01-line", label: "Regenerate", onClick: regenerate },
  { icon: copied ? "icon-check-line" : "icon-copy-line", label: copied ? "Copied" : "Copy", onClick: copyAnswer },
]}>
  {answer}
</AiChatBubble>
{vote === "down" && !reason ? (
  <Stack gap="xs">
    <Text textStyle="Body/Small/Medium" tone="base">What went wrong?</Text>
    <Stack direction="row" gap="xs" wrap>
      {["Wrong numbers", "Too long", "Missed something"].map((label) => (
        <Chip key={label} variant="normal" onClick={() => sendReason(label)}>{label}</Chip>
      ))}
    </Stack>
  </Stack>
) : null}
<Text textStyle="Caption/Regular" tone="light" role="status">{note}</Text>`,
  },
  {
    title: "Answer failed",
    description: "When an answer fails, the question stays and a Negative Inline Message takes the answer's place. Try again shows the thinking dots, named Retrying, and the answer streams like any other.",
    render: () => <AnswerFailedExample />,
    code: `<AiChatThread aria-label="Conversation with Zen AI">
  <AiChatBubble side="you">Summarise the Q3 studio report</AiChatBubble>
  {failed ? (
    <InlineMessage theme="negative" title="Zen AI couldn't finish this answer" action={{ label: "Try again", onClick: retry }}>
      The Q3 studio report didn't load in time. Your question is kept.
    </InlineMessage>
  ) : (
    <AiChatBubble side="ai" thinking={thinking} thinkingLabel="Retrying" streaming={streaming}
      actions={thinking || streaming ? [] : [good, bad, regenerate, copy]}>
      {answer}
    </AiChatBubble>
  )}
</AiChatThread>`,
  },
  {
    title: "Edit a prompt",
    description: "Edit puts a prompt back in the field with the caret at the end; a prompt this long moves above the controls. Shift+Enter adds a line, and Enter sends it in place of the old prompt and its answer.",
    render: () => <EditPromptExample />,
    code: `// The field is uncontrolled: remount it with the prompt to edit (key + defaultValue).
const [draft, setDraft] = useState({ key: 0, text: "" });
const [editing, setEditing] = useState<number | null>(null);

<AiChatBubble side="you" actions={[
  copy,
  { icon: "icon-edit-02-line", label: "Edit", onClick: () => { setEditing(turn.id); setDraft((d) => ({ key: d.key + 1, text: turn.text })); } },
]}>
  {turn.text}
</AiChatBubble>

<AiChatField key={draft.key} defaultValue={draft.text} fieldStyle="surface" placeholder="Ask Zen AI" model="Zen 2"
  onModelClick={openModels} onAttach={openFiles} onVoice={dictate} busy={streaming} onStop={stop}
  onSubmit={(prompt) => (editing !== null ? replace(editing, prompt) : ask(prompt))} />`,
  },
  {
    title: "Assistant on a phone",
    description: "On a phone the Block fills the first screen and leaves out the model switch. Once Alex asks, the field docks in the footer above the home indicator, and New chat in the Top Navigation goes back to the greeting.",
    render: () => <PhoneAssistantExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={screenRef}
    trailing={turns.length ? [{ icon: "icon-message-plus-circle-line", label: "New chat", onClick: newChat }] : undefined} />}
  footer={turns.length ? field : undefined}>
  {turns.length ? (
    <AiChatThread aria-label="Conversation with Zen AI">{bubbles}</AiChatThread>
  ) : (
    <AiChatBlock greeting="What do you need, Alex?" suggestions={[
      { label: "Plan my day", icon: "icon-calendar-check-line", onClick: () => ask("Plan my day") },
      { label: "Find a file", icon: "icon-folder-line", onClick: () => ask("Find the newest loyalty app file") },
      { label: "Check my hours", icon: "icon-clock-line", onClick: () => ask("How many hours did I log in September?") },
    ]}>
      {field /* <AiChatField placeholder="Ask Zen AI" onAttach={openFiles} onVoice={dictate} busy={streaming} onStop={stop} onSubmit={ask} /> */}
    </AiChatBlock>
  )}
</PlatformPhone>`,
  },
]);

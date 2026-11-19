import { useRef, useState, type RefObject } from "react";
import {
  AiChatBlock, AiChatBubble, AiChatField, AiChatThread, AppShell, Box, FileIcon, Popover, Stack, Tag, Text, TopNavigation, fileIconFormatOf,
  type AiChatAction,
} from "@zen-ds/react";
import {
  files, formatBytes, formatDate, formatMoney, formatRange, formatRelative, invoices, leaveRequests, me, people, projectById, studioMonths,
  type StudioFile,
} from "../../data";

// ——— What Zen AI knows: every answer comes from the studio's data ————————————————————————————————————
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

/** A demo assistant: it picks a prepared answer by the prompt's words (a real app asks its model). */
function replyTo(prompt: string, file?: StudioFile) {
  if (file) return fileAnswers[file.id] ?? answers.fallback;
  const routes: Array<[RegExp, string]> = [
    [/week/i, answers.week], [/lumen|client update/i, answers.clientUpdate], [/invoice|overdue/i, answers.overdue],
    [/tomorrow/i, answers.tomorrow], [/today|my day/i, answers.today], [/file/i, answers.file], [/hours/i, answers.hours],
  ];
  return routes.find(([test]) => test.test(prompt))?.[1] ?? answers.fallback;
}

// ——— The prompt field, with attachments and dictation (a phone leaves out the model switch) ————————————————
const recentFiles = ["f4", "f2", "f3"].map((id) => files.find((file) => file.id === id)!);

/** The field and its recent-files Popover, which opens against it. `fieldRef` is the field (AiChatField's <form>): a
 *  click on it puts the caret at the end of the prompt, so focus returns there after a pick, Stop or a removed file. */
function AskField({ fieldRef, onAsk, busy, onStop }: {
  fieldRef: RefObject<HTMLFormElement | null>;
  onAsk: (prompt: string, file?: StudioFile) => void;
  busy: boolean;
  onStop: () => void;
}) {
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<StudioFile | null>(null);
  const focusPrompt = () => setTimeout(() => fieldRef.current?.click());
  return (
    // The field's Popover positions against it.
    <Stack gap="xs" style={{ position: "relative" }}>
      {file ? (
        <Stack direction="row" gap="2xs">
          <Tag leading={<FileIcon format={fileIconFormatOf(file.name)} />} remove onRemove={() => { setFile(null); focusPrompt(); }}>{file.name}</Tag>
        </Stack>
      ) : null}
      <Box>
        <AiChatField ref={fieldRef} value={text} onValueChange={setText} placeholder="Ask Zen AI"
          onAttach={() => setOpen((current) => !current)}
          // Dictation (a demo): what the microphone heard goes into the prompt, ready to edit.
          onVoice={() => { setText("What's due today?"); focusPrompt(); }}
          busy={busy} onStop={() => { onStop(); focusPrompt(); }}
          onSubmit={(prompt) => { onAsk(prompt, file ?? undefined); setFile(null); }} />
      </Box>
      <Popover open={open} onOpenChange={setOpen} anchorRef={fieldRef} autoFocus label="Recent files"
        items={recentFiles.map((recent) => ({ id: recent.id, label: recent.name, caption: `${formatBytes(recent.bytes)} · ${people[recent.owner].name}`, leading: <FileIcon format={fileIconFormatOf(recent.name)} /> }))}
        onSelect={(item) => { setFile(recentFiles.find((recent) => recent.id === item.id) ?? null); setOpen(false); focusPrompt(); }} />
    </Stack>
  );
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

/** A turn of the conversation. Ids are the moment a turn started (a real app takes its messages' ids). */
type Turn = { id: number; side: "you" | "ai"; text: string; state?: "thinking" | "streaming" | "done"; file?: StudioFile };

// scrollRef: what scrolls the screen, so the bar shows its rule over the thread and the newest line stays in view.
// "window" in your app.
export default function AssistantOnAPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  // The answer's next word, so Stop and New chat can cancel it.
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();
  const [votes, setVotes] = useState<Partial<Record<number, "up" | "down">>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLFormElement>(null);
  const started = turns.length > 0;
  const busy = turns.some((turn) => turn.side === "ai" && turn.state !== "done");

  // The screen follows the newest line.
  const scrollToEnd = () => setTimeout(() => {
    const scroller = scrollRef === "window" ? null : scrollRef.current;
    if (scroller) scroller.scrollTo({ top: scroller.scrollHeight });
    else shellRef.current?.scrollIntoView({ block: "end" });
  });
  // The field moves between the greeting and the dock (a first prompt, New chat): the prompt keeps focus.
  const focusPrompt = () => setTimeout(() => fieldRef.current?.click());

  /** Zen AI thinks for a moment, then the answer arrives a word at a time (a real app streams it from its model). */
  const stream = (id: number, answer: string) => {
    const words = answer.match(/\S+\s*/g) ?? [];
    const step = (shown: number) => {
      if (!shellRef.current) return; // The example has closed: its answer stops streaming.
      // Only the turn this stream started on, while it still streams (Stop ends it).
      setTurns((all) => all.map((turn): Turn => (turn.id === id && turn.state !== "done"
        ? { ...turn, text: words.slice(0, shown).join(""), state: shown < words.length ? "streaming" : "done" }
        : turn)));
      scrollToEnd();
      if (shown < words.length) setTimer(setTimeout(() => step(shown + 1), 45));
    };
    setTimer(setTimeout(() => step(1), 900));
  };
  const ask = (prompt: string, file?: StudioFile) => {
    clearTimeout(timer);
    const id = Date.now();
    setTurns((all) => [...all, { id, side: "you", text: prompt, file }, { id: id + 1, side: "ai", text: "", state: "thinking" }]);
    stream(id + 1, replyTo(prompt, file));
    scrollToEnd();
    if (!started) focusPrompt();
  };
  /** Stop keeps what has arrived. */
  const stop = () => {
    clearTimeout(timer);
    setTurns((all) => all.map((turn): Turn => (turn.side === "ai" && turn.state !== "done" ? { ...turn, state: "done", text: turn.text || "You stopped this answer." } : turn)));
    scrollToEnd();
  };
  const newChat = () => {
    clearTimeout(timer);
    setTurns([]);
    focusPrompt();
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

  const field = <AskField fieldRef={fieldRef} busy={busy} onStop={stop} onAsk={ask} />;
  return (
    // Once the thread runs under the bar, the bar shows its Pale rule. Once Alex asks, the field docks at the bottom of
    // the shell, where a task's Action bar goes, above the home indicator.
    <AppShell ref={shellRef}
      topNavigation={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={scrollRef} trailing={started ? [{ icon: "icon-message-plus-circle-line", label: "New chat", onClick: newChat }] : undefined} />}
      actionBar={started ? (
        // A strip on the Surface: block padding Small, like the Action Bar, and its bottom clears the home indicator.
        <Box surface="surface" paddingX="margin-comfortable"
          style={{ paddingBlock: "var(--zen-spacing-padding-small, 12px) calc(var(--zen-safe-area-bottom, 0px) + var(--zen-spacing-padding-xsmall, 8px))" }}>
          {field}
        </Box>
      ) : undefined}
    >
      {started ? (
        <AiChatThread aria-label="Conversation with Zen AI">
          {turns.map((turn) => turn.side === "you" ? (
            <AiChatBubble key={turn.id} side="you" actions={[copy(turn)]}><Prompt turn={turn} /></AiChatBubble>
          ) : (
            <AiChatBubble key={turn.id} side="ai" thinking={turn.state === "thinking"} streaming={turn.state === "streaming"}
              actions={turn.state === "done" ? [...feedback(turn), copy(turn)] : []}>
              {turn.text}
            </AiChatBubble>
          ))}
        </AiChatThread>
      ) : (
        // The greeting fills the first screen inside the Body's margins.
        <Stack justify="center" style={{ flex: "1 1 auto", minHeight: 0 }}>
          <AiChatBlock greeting={`What do you need, ${firstName}?`} suggestions={[
            { label: "Plan my day", icon: "icon-calendar-check-line", onClick: () => ask("Plan my day") },
            { label: "Find a file", icon: "icon-folder-line", onClick: () => ask("Find the newest loyalty app file") },
            { label: "Check my hours", icon: "icon-clock-line", onClick: () => ask("How many hours did I log in September?") },
          ]}>
            {field}
          </AiChatBlock>
        </Stack>
      )}
    </AppShell>
  );
}

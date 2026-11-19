import { useRef, useState, type RefObject } from "react";
import {
  AiChatBlock, AiChatBubble, AiChatField, AiChatThread, AppShell, AppShellAccount, AppShellHeader, Box, Button, FileIcon, Menu, PageHeader, Popover,
  Sidebar, SidebarMenuItem, Stack, Tag, Text, Thumbnail, fileIconFormatOf, useToast,
  type AiChatAction, type SidebarSection,
} from "@zen-ds/react";
import {
  files, formatBytes, formatDate, formatMoney, formatRange, formatRelative, invoices, leaveRequests, me, people, projectById, studio, studioMonths,
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

// ——— The prompt field, with its model switch, attachments and dictation ———————————————————————————————
const models = [
  { id: "zen-2", label: "Zen 2", caption: "Best for reports and planning" },
  { id: "zen-2-mini", label: "Zen 2 Mini", caption: "Fastest for short answers" },
];
const recentFiles = ["f4", "f2", "f3"].map((id) => files.find((file) => file.id === id)!);

/** The field and its Popovers (model, recent files), which open against it. `fieldRef` is the field (AiChatField's
 *  <form>): a click on it puts the caret at the end of the prompt, so focus returns there after a pick, Stop or a
 *  removed file. */
function AskField({ fieldRef, onAsk, busy, onStop, modelId, onModelChange }: {
  fieldRef: RefObject<HTMLFormElement | null>;
  onAsk: (prompt: string, file?: StudioFile) => void;
  busy: boolean;
  onStop: () => void;
  /** The chosen model, kept by the screen so it survives the field moving to the dock. */
  modelId: string;
  onModelChange: (id: string) => void;
}) {
  const [text, setText] = useState("");
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
        <AiChatField ref={fieldRef} value={text} onValueChange={setText} fieldStyle="surface" placeholder="Ask Zen AI"
          model={models.find((option) => option.id === modelId)?.label} onModelClick={() => setOpen((current) => (current === "model" ? null : "model"))}
          onAttach={() => setOpen((current) => (current === "files" ? null : "files"))}
          // Dictation (a demo): what the microphone heard goes into the prompt, ready to edit.
          onVoice={() => { setText("What's due tomorrow?"); focusPrompt(); }}
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

// ——— The studio app: Zen AI is a place of its Sidebar ——————————————————————————————————————————————
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  { id: "zen-ai", label: "Zen AI", icon: "icon-stars-01-line" },
] }];

/** A turn of the conversation. Ids are the moment a turn started (a real app takes its messages' ids). */
type Turn = { id: number; side: "you" | "ai"; text: string; state?: "thinking" | "streaming" | "done"; file?: StudioFile };

// scrollRef: what scrolls the page, so the newest line stays in view. "window" in your app.
export default function AssistantHome({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [turns, setTurns] = useState<Turn[]>([]);
  // The answer's next word, so Stop and New chat can cancel it.
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();
  const [votes, setVotes] = useState<Partial<Record<number, "up" | "down">>>({});
  const [copied, setCopied] = useState<number | null>(null);
  const [modelId, setModelId] = useState(models[0].id);
  const shellRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLFormElement>(null);
  const started = turns.length > 0;
  const busy = turns.some((turn) => turn.side === "ai" && turn.state !== "done");
  const last = turns[turns.length - 1];

  // The page follows the newest line: its end, where the field docks under the thread.
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
      // Only the turn this stream started on, while it still streams (Stop ends it; Regenerate gives it a new id).
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
  // A new version of the answer has a new id, so it starts unrated.
  const regenerate = (answer: Turn) => {
    const prompt = turns[turns.indexOf(answer) - 1];
    const id = Date.now();
    setTurns((all) => all.map((turn): Turn => (turn.id === answer.id ? { id, side: "ai", text: "", state: "thinking" } : turn)));
    stream(id, replyTo(prompt.text, prompt.file));
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

  const field = <AskField fieldRef={fieldRef} modelId={modelId} onModelChange={setModelId} busy={busy} onStop={stop} onAsk={ask} />;
  return (
    // A place of the studio app (AppShell, pattern sidebar): the Sidebar on Zen AI, the page's title and New chat in the
    // header's Main row. The Body opens on the Block in the middle of the page; once a conversation starts, the thread
    // runs in its 800 column and the field docks at the bottom of the window.
    <AppShell ref={shellRef}
      sidebar={(
        <Sidebar
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          sections={studioPlaces} selectedId="zen-ai"
          onItemClick={(item) => { if (item.id !== "zen-ai") toast({ title: `${item.label} isn't part of this example`, children: "This screen shows Zen AI." }); }}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          // The header's top row keeps the utilities: the account and its menu.
          actions={(
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
              { id: "history", label: "Chat history", icon: "icon-clock-line", onSelect: () => toast({ title: "Chat history", children: "Zen AI keeps your chats for 30 days." }) },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
            ]} />
          )}
          main={<PageHeader title="Zen AI" description="Answers from the studio's projects, tasks, files and invoices."
            actions={started ? <Button level="tertiary" startIcon="icon-message-plus-circle-line" onClick={newChat}>New chat</Button> : undefined} />} />
      )}
    >
      {started ? (
        <>
          {/* The thread fills the page above the dock. */}
          <Box style={{ flex: "1 1 auto", paddingBlockEnd: "var(--zen-spacing-padding-xlarge, 24px)" }}>
            <AiChatThread aria-label="Conversation with Zen AI">
              {turns.map((turn) => turn.side === "you" ? (
                <AiChatBubble key={turn.id} side="you" actions={[copy(turn)]}><Prompt turn={turn} /></AiChatBubble>
              ) : (
                <AiChatBubble key={turn.id} side="ai" thinking={turn.state === "thinking"} streaming={turn.state === "streaming"}
                  actions={turn.state === "done" ? [
                    ...feedback(turn),
                    ...(turn === last ? [{ icon: "icon-refresh-cw-01-line" as const, label: "Regenerate", onClick: () => regenerate(turn) }] : []),
                    copy(turn),
                  ] : []}>
                  {turn.text}
                </AiChatBubble>
              ))}
            </AiChatThread>
          </Box>
          {/* Docked at the bottom of the window on the page's Canvas, in the conversation's 800 column; the answers
              scroll under it. */}
          <Box sticky="bottom" surface="canvas">
            <Box maxWidth={800} style={{ marginInline: "auto" }}>{field}</Box>
          </Box>
        </>
      ) : (
        // The greeting sits in the middle of the free space.
        <Stack justify="center" style={{ flex: "1 1 auto", minHeight: 0 }}>
          <AiChatBlock greeting={`What are we working on, ${firstName}?`} suggestions={[
            { label: "Summarise my week", icon: "icon-align-left-line", onClick: () => ask("Summarise my week") },
            { label: "Draft a client update", icon: "icon-pencil-line", onClick: () => ask("Draft an update for Lumen Bank on the online banking redesign") },
            { label: "Check overdue invoices", icon: "icon-receipt-line", onClick: () => ask("Which invoices are overdue?") },
            { label: "Plan tomorrow", icon: "icon-calendar-check-line", onClick: () => ask("What's due tomorrow?") },
          ]}>
            {field}
          </AiChatBlock>
        </Stack>
      )}
    </AppShell>
  );
}

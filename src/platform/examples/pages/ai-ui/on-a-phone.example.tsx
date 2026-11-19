/* Zen AI composing UI: a prompt gets a UI spec, JSON that names Zen components and their props, checked against the
   catalog and rendered with the real components in the answer (@zen-ds/react/ai-ui). What the person picks lands in a
   shared state the conversation reads, and a follow-up edits the UI in place instead of rebuilding it. A deterministic
   demo composer stands in for the model; with a model behind your endpoint, typed prompts go to it. Nothing is styled
   by hand: every look is a component prop. */
import { useRef, useState, type RefObject } from "react";
import {
  AiChatBubble, AiChatField, AiChatThread, AppShell, Box, Card, InlineMessage, SkeletonText, Stack, TopNavigation,
} from "@zen-ds/react";
import {
  AiUi, applyOps, markdownToSpec, validateSpec, walkNodes, type ActionCall, type Catalog, type SpecOp,
  type StateChange, type UiSpec,
} from "@zen-ds/react/ai-ui";
import { formatMoney, invoices, projectById, projects, studioMonths } from "../../data";

/* ── Your endpoint: in the Zen docs, the dev server's /ai-ui/* when a model is configured (ANTHROPIC_API_KEY before npm run
   dev); in your app, the handler you mount (docs/ai-ui/README.md, "Where the model connects"). Called from handlers
   only; without a model, the demo composer below answers. ── */

type ServerStatus = { enabled: boolean; model: string | null };
const offline: ServerStatus = { enabled: false, model: null };
/** Whether a model answers behind /ai-ui (no route, a static host or an error: no). */
const readStatus = async (): Promise<ServerStatus> => {
  try {
    const response = await fetch("/ai-ui/status");
    return response.ok ? ((await response.json()) as ServerStatus) : offline;
  } catch { return offline; }
};
type Failed = { ok: false; error: string };
/** A POST to the /ai-ui routes: the JSON answer, or `{ ok: false, error }` with the server's reason (a model error, a 503 without a key, the network), so the answer can say why the demo composer stepped in. */
const postJson = async <T extends { ok: true },>(url: string, body: unknown, signal?: AbortSignal): Promise<T | Failed> => {
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
    const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (response.ok && json) return json;
    return { ok: false, error: json?.error ?? `${response.status} ${response.statusText}` };
  } catch (error) { if ((error as Error).name === "AbortError") throw error; return { ok: false, error: (error as Error).message }; }
};

/* ── What the demo composer answers with: specs built from the studio's data (in your app, the model composes them) ── */

const slots = ["09:00", "10:00", "14:00", "16:00"];
const nearestSlot = (hour: number) => slots.find((s) => Number(s.slice(0, 2)) === hour) ?? slots.reduce((best, s) => (Math.abs(Number(s.slice(0, 2)) - hour) < Math.abs(Number(best.slice(0, 2)) - hour) ? s : best), slots[0]);
const lumen = projectById("lumen-banking");
const overdue = invoices.filter((invoice) => invoice.status === "Overdue");
const quarter = (ids: string[]) => studioMonths.filter((m) => ids.includes(m.id)).reduce((sum, m) => sum + m.invoiced, 0);
const q2 = quarter(["apr", "may", "jun"]), q3 = quarter(["jul", "aug", "sep"]);

/** What a model may read with { "$ref" } (described to it by shape, never pasted): the studio's data, as the specs below use it. */
const studioData = () => ({
  projects: projects.filter((project) => project.status === "Active").map((project) => ({ value: project.id, label: project.name, client: project.client })),
  slots: slots.map((slot) => ({ value: slot, label: slot })),
  invoices: invoices.map((invoice) => ({ id: invoice.id, number: invoice.number, client: invoice.client, amount: formatMoney(invoice.amount), status: invoice.status })),
  months: studioMonths.slice(-6).map((m) => ({ label: m.label, value: m.invoiced })),
});

/** A form to schedule a design review: project, date, time slot and the two actions. Everything the person picks is `review.*` in the shared state. */
const bookingSpec = (title = "Schedule a design review"): UiSpec => ({
  version: 1,
  data: {
    projects: projects.filter((project) => project.status === "Active").map((project) => ({ value: project.id, label: project.name })),
    slots: slots.map((slot) => ({ value: slot, label: slot })),
  },
  root: {
    type: "Stack", id: "booking", props: { gap: "md" },
    children: [
      // A heading inside an answer sits right under the chat page's h1: level 2, drawn at Heading/4 size.
      { type: "Heading", id: "booking-title", props: { level: 2, textStyle: "Heading/4" }, children: [title] },
      { type: "SelectField", id: "project", props: { label: "Project", options: { $ref: "projects" }, value: { $state: "review.project" } } },
      { type: "DateField", id: "date", props: { label: "Date", value: { $state: "review.date" } } },
      { type: "ChipGroup", id: "slot", props: { "aria-label": "Time", options: { $ref: "slots" }, value: { $state: "review.slot" } } },
      {
        type: "Stack", id: "booking-actions", props: { direction: "row", gap: "sm", justify: "end", wrap: true },
        children: [
          { type: "Button", id: "cancel", props: { level: "tertiary", onClick: { $action: "cancel" } }, children: ["Cancel"] },
          { type: "Button", id: "submit", props: { level: "primary", onClick: { $action: "book", args: { review: { $state: "review" } } } }, children: ["Schedule"] },
        ],
      },
    ],
  },
});

/** The studio's invoices as a table; `pending` is the first frame, before the rows arrive (a Skeleton in place of the table). */
const invoicesSpec = (pending: boolean): UiSpec => ({
  version: 1,
  data: { invoices: pending ? [] : invoices.map((invoice) => ({ id: invoice.id, number: invoice.number, client: invoice.client, amount: formatMoney(invoice.amount), status: invoice.status })) },
  root: {
    type: "Stack", id: "invoices", props: { gap: "md" },
    children: [
      { type: "Text", id: "invoices-intro", children: [overdue.length === 1 ? `One invoice is overdue: ${overdue[0].number} to ${overdue[0].client} for ${formatMoney(overdue[0].amount)}. Here are all of them:` : `${overdue.length} invoices are overdue. Here are all of them:`] },
      pending ? { $pending: "text" } : {
        type: "Table", id: "invoice-table",
        props: {
          "aria-label": "Invoices",
          columns: [{ id: "number", header: "Invoice" }, { id: "client", header: "Client" }, { id: "amount", header: "Amount", align: "right" }, { id: "status", header: "Status" }],
          rows: { $ref: "invoices" },
          onRowClick: { $action: "openInvoice" },
        },
      },
    ],
  },
});

/** Invoiced revenue by month, the series the Chart and Metric pages read. */
const revenueSpec = (): UiSpec => ({
  version: 1,
  data: { months: studioMonths.slice(-6).map((m) => ({ label: m.label, value: m.invoiced })) },
  root: {
    type: "Stack", id: "revenue", props: { gap: "md" },
    children: [
      { type: "Heading", id: "revenue-title", props: { level: 2, textStyle: "Heading/4" }, children: ["Invoiced by month"] },
      { type: "BarChart", id: "revenue-chart", props: { "aria-label": "Invoiced by month, the last six months", data: { $ref: "months" }, height: 220 } },
      { type: "Text", id: "revenue-note", props: { tone: "base", textStyle: "Body/Small/Regular" }, children: [`Q3 came to ${formatMoney(q3)}, ${Math.round((q3 / q2 - 1) * 100)}% more than Q2.`] },
    ],
  },
});

/** A destructive action behind a confirmation: the button opens the Dialog by id, the Dialog's primary action carries the real action. */
const confirmSpec = (): UiSpec => ({
  version: 1,
  root: {
    type: "Stack", id: "confirm", props: { gap: "md" },
    children: [
      { type: "Text", id: "confirm-text", children: [`Deleting “${lumen.name}” removes its tasks, files and ${lumen.members.length} members' access. It can't be undone, so I'll ask you to confirm.`] },
      {
        type: "Stack", id: "confirm-actions", props: { direction: "row", gap: "sm" },
        children: [{ type: "Button", id: "confirm-open", props: { level: "danger", onClick: { $action: "open", id: "confirm-dialog" } }, children: ["Delete project…"] }],
      },
      {
        type: "Dialog", id: "confirm-dialog",
        props: {
          title: "Delete project?", theme: "negative",
          primaryAction: { label: "Delete project", level: "danger", onClick: { $action: "deleteProject", args: { id: lumen.id } } },
          secondaryAction: { label: "Cancel", onClick: { $action: "close", id: "confirm-dialog" } },
        },
        children: [`“${lumen.name}” and everything in it will be removed for the whole studio.`],
      },
    ],
  },
});

/** A prose answer: Markdown mapped to Heading, Text, List and Link. */
const proseSpec = (): UiSpec => markdownToSpec(`### What I can compose\n\nAsk in your own words and I answer with a UI you can use at once, built from Zen components only:\n\n- **Schedule** a design review, a call or a meeting\n- Your **invoices**, with the overdue ones first\n- **Revenue** by month or by quarter\n- A **confirmation** before anything is deleted\n\nEvery screen is validated against the [component catalog](https://github.com/Zen-Design-System/Zen-DS/tree/main/docs/ai-ui) before it renders.`, { idPrefix: "prose" });

/** What a model gets wrong: a component that is not in the catalog, a value outside the enum, a styling escape hatch. */
const brokenSpec = (): UiSpec => ({
  version: 1,
  root: {
    type: "Stack", id: "broken", props: { gap: "md" },
    children: [
      { type: "Heading", id: "broken-title", props: { level: 2, textStyle: "Heading/4" }, children: ["Your week"] },
      { type: "Calendar", id: "broken-calendar", props: { view: "week" } },
      { type: "Button", id: "broken-button", props: { level: "brand", className: "cta", onClick: { $action: "go" } }, children: ["Go"] },
    ],
  },
});

/* ── The demo composer, standing in for the model: a prompt, or a follow-up to the UI on screen → text, a spec, ops on that spec or a state change ── */

type Reply = { text: string; spec?: UiSpec; /** The spec's data arrives later (a Skeleton first). */ later?: UiSpec; ops?: SpecOp[]; state?: [string, unknown] };

function demoCompose(prompt: string, lastSpec?: UiSpec): Reply {
  const text = prompt.trim();
  const hasSubmit = lastSpec && JSON.stringify(lastSpec).includes('"id":"submit"');
  const level = /\b(accent|primary|tertiary|secondary|danger)\b/i.exec(text)?.[1].toLowerCase();
  if (hasSubmit && level && /\b(make|button|nút|đổi|accent|level)\b/i.test(text)) return { text: `Done, the Schedule button is ${level} now.`, ops: [{ op: "setProp", id: "submit", name: "level", value: level }] };
  const time = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|h|giờ)?\b/i.exec(text);
  if (hasSubmit && time && /\b(am|pm|h|giờ|o'clock|:\d{2}|at|lúc)\b/i.test(text)) {
    let hour = Number(time[1]);
    if (time[3]?.toLowerCase() === "pm" && hour < 12) hour += 12;
    const slot = nearestSlot(hour);
    return { text: `Set the time to ${slot}.`, state: ["review.slot", slot] };
  }
  if (/\b(schedule|book|meeting|review|appointment|call)\b|đặt lịch|hẹn|họp/i.test(text)) return { text: "Here is the form. Pick the project, a date and a time, and I'll schedule it.", spec: bookingSpec() };
  if (/\binvoice|overdue|unpaid|bill|hoá đơn|hóa đơn/i.test(text)) return { text: "Checking the studio's invoices…", spec: invoicesSpec(true), later: invoicesSpec(false) };
  if (/\brevenue|invoiced|chart|month|quarter|doanh thu/i.test(text)) return { text: "Here is what the studio invoiced over the last six months.", spec: revenueSpec() };
  if (/\bdelete|remove|archive|xoá|xóa/i.test(text)) return { text: "That is a destructive change.", spec: confirmSpec() };
  if (/\bbroken|invalid|wrong|lỗi/i.test(text)) return { text: "Here is your week:", spec: brokenSpec() };
  return { text: "", spec: proseSpec() };
}

/* ── The conversation: turns, and the shared state every pick in a composed UI writes ── */

type Turn = { id: number; side: "you" | "ai"; text: string; spec?: UiSpec; thinking?: boolean; /** The model could not answer this typed prompt (the server's reason); the demo composer did. */ error?: string };

const writeState = (state: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
  const [head, ...rest] = path.split(".");
  if (!rest.length) return { ...state, [head]: value };
  return { ...state, [head]: writeState((state[head] ?? {}) as Record<string, unknown>, rest.join("."), value) };
};

const PROMPT = "Schedule a design review for the online banking redesign";
/** The conversation this example opens on: the prompt and the demo composer's answer, at once (an answer whose data comes later opens with it). In your app it starts empty. */
const opening = (prompt: string): Turn[] => {
  const reply = demoCompose(prompt);
  return [{ id: 1, side: "you", text: prompt }, { id: 2, side: "ai", text: reply.text, spec: reply.later ?? reply.spec }];
};

/** A composed UI with bound controls (fields, chips, a table) sits on a Card, so a form reads as one object inside the answer; prose, a chart or a lone button stay in the flow. The host frames it, the model never adds the Card. */
function hasControls(spec: UiSpec, catalog: Catalog): boolean {
  let found = false;
  walkNodes(spec.root, (node) => { if (found) return false; if (catalog.components[node.type]?.bindings?.length) found = true; return found ? false : undefined; });
  return found;
}

type AnswerProps = { turn: Turn; catalog: Catalog | null; shared: Record<string, unknown>; onStateChange: (state: Record<string, unknown>, change: StateChange) => void; onAction: (call: ActionCall) => void };

/** An answer: its text, then its UI once the spec passes the catalog check (a Skeleton while the catalog loads). */
function Answer({ turn, catalog, shared, onStateChange, onAction }: AnswerProps) {
  // A typed prompt the model could not answer: the server's reason first, then the demo composer's answer.
  const failure = turn.error ? <InlineMessage theme="negative" title="Zen AI could not reach the model">{`${turn.error}. The demo composer answered instead.`}</InlineMessage> : null;
  if (!turn.spec) return failure ? <Stack gap="md">{failure}<span>{turn.text}</span></Stack> : <>{turn.text}</>;
  if (!catalog) return <Stack gap="md">{failure}{turn.text ? <span>{turn.text}</span> : null}<SkeletonText lines={3} /></Stack>;
  const check = validateSpec(turn.spec, catalog);
  const ui = <AiUi spec={turn.spec} catalog={catalog} state={shared} onStateChange={onStateChange} onAction={onAction} />;
  return (
    <Stack gap="md">
      {failure}
      {turn.text ? <span>{turn.text}</span> : null}
      {check.ok
        // Flat on the canvas (usage rules §16); one card on its own, so Spacing=Medium (card/spacing-by-count).
        ? (hasControls(turn.spec, catalog) ? <Card theme="default" width="fill">{ui}</Card> : ui)
        : <InlineMessage theme="negative" title="This answer's UI did not pass the catalog check">{check.errors.map((problem) => `${problem.path}: ${problem.message}${problem.hint ? ` ${problem.hint}` : ""}`).join(" · ")}</InlineMessage>}
    </Stack>
  );
}

/** Zen AI on a phone: the same composer and specs, in Comfortable density and Mobile typography. The field docks at
    the bottom of the shell, where a task's Action bar goes, and the conversation scrolls under its glass. */
export default function OnAPhone({ catalog, scrollRef = "window" }: {
  /** The catalog the answers are checked against and rendered with. In your app: `import catalog from "@zen-ds/react/ai-ui/catalog.json"` (the docs load it once and pass it in). Null while it loads: an answer shows a Skeleton where its UI goes. */
  catalog: Catalog | null;
  /** What scrolls the conversation, so a new turn comes into view. "window" in your app. */
  scrollRef?: RefObject<HTMLElement | null> | "window";
}) {
  const [turns, setTurns] = useState(() => opening(PROMPT));
  const [shared, setShared] = useState<Record<string, unknown>>({});
  const nextId = useRef(3);
  const statusCheck = useRef<Promise<ServerStatus> | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);

  // Who answers typed prompts: asked of your endpoint once, with the first one.
  const checkServer = () => (statusCheck.current ??= readStatus());
  // A new turn scrolls the conversation to its end, where the field is.
  const toEnd = () => setTimeout(() => {
    if (scrollRef === "window") shellRef.current?.scrollIntoView({ block: "end" });
    else scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  });
  const patch = (id: number, change: Partial<Turn>) => setTurns((all) => all.map((turn) => (turn.id === id ? { ...turn, ...change } : turn)));
  const answer = (text: string) => {
    const id = nextId.current++;
    setTurns((all) => [...all, { id, side: "ai", text }]);
    toEnd();
  };

  /** A typed prompt: the person's turn, a moment of thinking, the answer. */
  const ask = (prompt: string) => {
    const lastWithSpec = [...turns].reverse().find((turn) => turn.spec);
    const you = nextId.current++;
    const id = nextId.current++;
    setTurns((all) => [...all, { id: you, side: "you", text: prompt }, { id, side: "ai", text: "", thinking: true }]);
    toEnd();
    const apply = (reply: Reply) => {
      if (reply.ops && lastWithSpec) setTurns((all) => all.map((turn) => (turn.id === lastWithSpec.id && turn.spec ? { ...turn, spec: applyOps(turn.spec, reply.ops!) } : turn)));
      if (reply.state) {
        const [path, value] = reply.state;
        setShared((state) => writeState(state, path, value));
      }
      patch(id, { text: reply.text, spec: reply.spec, thinking: false });
      // Data that comes later: the same spec again, with the rows (a Skeleton stood in its place).
      if (reply.later) setTimeout(() => { patch(id, { spec: reply.later }); toEnd(); }, 1200);
      toEnd();
    };
    const local = () => apply(demoCompose(prompt, lastWithSpec?.spec));
    void (async () => {
      const status = await checkServer();
      // No model: the demo composer, after the moment a model would take.
      if (!status.enabled) { setTimeout(local, 650); return; }
      // A model behind /ai-ui: a follow-up edits the UI on screen (/edit), anything else composes (/compose); the demo
      // composer answers when the server cannot.
      type ComposeBody = { ok: true; text: string; spec: UiSpec | null };
      type EditBody = { ok: true; kind: string; text: string; spec: UiSpec; state: Record<string, unknown> | null };
      if (lastWithSpec?.spec) {
        const edit = await postJson<EditBody>("/ai-ui/edit", { prompt, spec: lastWithSpec.spec, state: shared });
        if (edit.ok) {
          if (edit.kind === "ops" || edit.kind === "spec") setTurns((all) => all.map((turn) => (turn.id === lastWithSpec.id ? { ...turn, spec: edit.spec } : turn)));
          for (const [path, value] of Object.entries(edit.state ?? {})) {
            setShared((state) => writeState(state, path, value));
          }
          patch(id, { text: edit.text || "Done.", thinking: false });
          toEnd();
          return;
        }
      }
      const composed = await postJson<ComposeBody>("/ai-ui/compose", { prompt, data: studioData(), state: shared });
      if (composed.ok) { patch(id, { text: composed.text, spec: composed.spec ?? undefined, thinking: false }); toEnd(); return; }
      // The model failed (a bad key, no credit, the network…): the demo composer answers, and the bubble says why.
      local();
      patch(id, { error: composed.error });
    })();
  };
  const stop = () => setTurns((all) => all.map((turn) => (turn.thinking ? { ...turn, thinking: false, text: "You stopped this answer." } : turn)));
  const onStateChange = (next: Record<string, unknown>) => setShared(next);
  /** What the composed UIs do: every action reaches the app here, with its args (the shared state they read). */
  const onAction = (call: ActionCall) => {
    const review = (shared.review ?? {}) as Record<string, string | undefined>;
    switch (call.name) {
      case "book": {
        const project = projects.find((p) => p.id === review.project)?.name ?? "a project to pick";
        answer(`Scheduled a design review of ${project}${review.date ? ` on ${review.date}` : ""}${review.slot ? ` at ${review.slot}` : ", time to be confirmed"}. The team gets the invite.`);
        break;
      }
      case "cancel": answer("Okay, nothing scheduled."); break;
      case "openInvoice": { const row = call.event[0] as { number?: string; client?: string } | undefined; answer(`Opening ${row?.number ?? "the invoice"}${row?.client ? ` for ${row.client}` : ""}…`); break; }
      case "deleteProject": { setShared((state) => writeState(state, "confirm-dialog.open", false)); answer(`“${lumen.name}” is deleted. (This demo changes nothing.)`); break; }
      default: break;
    }
  };
  const busy = turns.some((turn) => turn.thinking);

  const thread = (
    <AiChatThread aria-label="Conversation with Zen AI">
      {turns.map((turn) => turn.side === "you"
        ? <AiChatBubble key={turn.id} side="you">{turn.text}</AiChatBubble>
        : (
          // While the answer is on its way, the bubble shows its thinking state.
          <AiChatBubble key={turn.id} side="ai" thinking={turn.thinking} thinkingLabel="Zen AI is thinking">
            {turn.thinking ? null : <Answer turn={turn} catalog={catalog} shared={shared} onStateChange={onStateChange} onAction={onAction} />}
          </AiChatBubble>
        ))}
    </AiChatThread>
  );
  // The field docks at the bottom of the shell, where a task's Action bar goes, on a strip that clears the home indicator.
  const dock = (
    <Box style={{ padding: "var(--zen-spacing-padding-small, 12px) var(--zen-margin-comfortable, 20px) calc(var(--zen-safe-area-bottom, 0px) + var(--zen-spacing-padding-xsmall, 8px))" }}>
      <AiChatField fieldStyle="liquid-glass" placeholder="Ask Zen AI" busy={busy} onStop={stop} onSubmit={ask} />
    </Box>
  );
  return (
    <AppShell ref={shellRef} topNavigation={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={scrollRef} />} actionBar={dock}>
      {thread}
    </AppShell>
  );
}

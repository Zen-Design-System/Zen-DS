/* AI UI examples (docs/ai-ui/README.md): the runtime layer for UI a model composes, at work inside Zen AI. A small
   deterministic "composer" stands in for the model: it answers a prompt with a UI spec built from Đìzai Studio's data
   (examples/data.ts), the spec is validated against the catalog and rendered in the AI bubble with the real components,
   what Alex picks lands in a shared state the conversation reads, and a follow-up edits the UI in place (ops) instead of
   rebuilding it. Nothing here is styled by hand: every look is a component prop. */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AiChatBubble, AiChatField, AiChatThread } from "../../../components/AiChat";
import { Chip } from "../../../components/Chip";
import { InlineMessage } from "../../../components/InlineMessage";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { SkeletonText } from "../../../components/Skeleton";
import { Heading, Text } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { AiUi, applyOps, createLiveComposer, keywordClassifier, markdownToSpec, toJsx, validateSpec, type ActionCall, type Catalog, type LiveComposer, type LiveState, type SpecOp, type StateChange, type UiSpec } from "../../../ai-ui/index";
import { PreviewWindow } from "../../PlatformFrames";
import { PlatformPhone } from "../../PlatformPhone";
import { Panel, PlaygroundFilterChip, option } from "../../appLayer/shared";
import { formatMoney, invoices, me, projectById, projects, studioMonths } from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./ai-ui.css";

export const page: PlatformPage = "ai-ui";

/* ───────────── The catalog (docs/ai-ui/catalog.json, 700 KB: loaded when the page first renders a spec) ───────────── */

let loadedCatalog: Catalog | null = null;
let loadingCatalog: Promise<Catalog> | null = null;
function useCatalog() {
  const [catalog, setCatalog] = useState<Catalog | null>(loadedCatalog);
  useEffect(() => {
    if (loadedCatalog) return;
    loadingCatalog ??= import("../../../../docs/ai-ui/catalog.json").then((mod) => (loadedCatalog = mod.default as unknown as Catalog));
    let live = true;
    void loadingCatalog.then((loaded) => { if (live) setCatalog(loaded); });
    return () => { live = false; };
  }, []);
  return catalog;
}

/* ───────────── The server: /ai-ui/* on the dev server when a model is configured (tools/ai-ui/vite-plugin.mjs) ───────────── */

type ServerStatus = { enabled: boolean; model: string | null };
let serverStatus: Promise<ServerStatus> | null = null;
const aiServer = () => (serverStatus ??= fetch("/ai-ui/status").then((response) => (response.ok ? (response.json() as Promise<ServerStatus>) : { enabled: false, model: null })).catch(() => ({ enabled: false, model: null })));
function useServer() {
  const [status, setStatus] = useState<ServerStatus | null>(null);
  useEffect(() => { let live = true; void aiServer().then((loaded) => { if (live) setStatus(loaded); }); return () => { live = false; }; }, []);
  return status;
}
const postJson = async <T,>(url: string, body: unknown, signal?: AbortSignal): Promise<T | null> => {
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
    return response.ok ? ((await response.json()) as T) : null;
  } catch (error) { if ((error as Error).name === "AbortError") throw error; return null; }
};

/* ───────────── What the composer answers with (specs from the studio's data) ───────────── */

const firstName = me.name.split(" ")[0];
const slots = ["09:00", "10:00", "14:00", "16:00"];
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
const bookingSpec = (): UiSpec => ({
  version: 1,
  data: {
    projects: projects.filter((project) => project.status === "Active").map((project) => ({ value: project.id, label: project.name })),
    slots: slots.map((slot) => ({ value: slot, label: slot })),
  },
  root: {
    type: "Stack", id: "booking", props: { gap: "md" },
    children: [
      // A heading inside an answer sits right under the chat page's h1: level 2, drawn at Heading/4 size.
      { type: "Heading", id: "booking-title", props: { level: 2, textStyle: "Heading/4" }, children: ["Schedule a design review"] },
      { type: "SelectField", id: "project", props: { label: "Project", options: { $ref: "projects" }, value: { $state: "review.project" } } },
      { type: "DateField", id: "date", props: { label: "Date", value: { $state: "review.date" } } },
      { type: "ChipGroup", id: "slot", props: { "aria-label": "Time", options: { $ref: "slots" }, value: { $state: "review.slot" } } },
      {
        type: "Stack", id: "booking-actions", props: { direction: "row", gap: "sm", justify: "end" },
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

/* ───────────── The composer: a prompt (or a follow-up) → text, a spec, ops or a state change ───────────── */

type Reply = { text: string; spec?: UiSpec; /** The spec's data arrives later (a Skeleton first). */ later?: UiSpec; ops?: SpecOp[]; state?: [string, unknown] };

function compose(prompt: string, lastSpec: UiSpec | undefined): Reply {
  const text = prompt.trim();
  const hasSubmit = lastSpec && JSON.stringify(lastSpec).includes('"id":"submit"');
  const level = /\b(accent|primary|tertiary|secondary|danger)\b/i.exec(text)?.[1].toLowerCase();
  if (hasSubmit && level && /\b(make|button|nút|đổi|accent|level)\b/i.test(text)) return { text: `Done, the Schedule button is ${level} now.`, ops: [{ op: "setProp", id: "submit", name: "level", value: level }] };
  const time = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|h|giờ)?\b/i.exec(text);
  if (hasSubmit && time && /\b(am|pm|h|giờ|o'clock|:\d{2}|at|lúc)\b/i.test(text)) {
    let hour = Number(time[1]);
    if (time[3]?.toLowerCase() === "pm" && hour < 12) hour += 12;
    const slot = slots.find((s) => Number(s.slice(0, 2)) === hour) ?? slots.reduce((best, s) => (Math.abs(Number(s.slice(0, 2)) - hour) < Math.abs(Number(best.slice(0, 2)) - hour) ? s : best), slots[0]);
    return { text: `Set the time to ${slot}.`, state: ["review.slot", slot] };
  }
  if (/\b(schedule|book|meeting|review|appointment|call)\b|đặt lịch|hẹn|họp/i.test(text)) return { text: "Here is the form. Pick the project, a date and a time, and I'll schedule it.", spec: bookingSpec() };
  if (/\binvoice|overdue|unpaid|bill|hoá đơn|hóa đơn/i.test(text)) return { text: "Checking the studio's invoices…", spec: invoicesSpec(true), later: invoicesSpec(false) };
  if (/\brevenue|invoiced|chart|month|quarter|doanh thu/i.test(text)) return { text: "Here is what the studio invoiced over the last six months.", spec: revenueSpec() };
  if (/\bdelete|remove|archive|xoá|xóa/i.test(text)) return { text: "That is a destructive change.", spec: confirmSpec() };
  if (/\bbroken|invalid|wrong|lỗi/i.test(text)) return { text: "Here is your week:", spec: brokenSpec() };
  return { text: "", spec: proseSpec() };
}

/* ───────────── The demo assistant: turns, shared state, events ───────────── */

type Turn = { id: number; side: "you" | "ai"; text: string; spec?: UiSpec; thinking?: boolean };
type Event = { id: number; kind: "state" | "action"; title: string; caption: string };

function useComposerDemo(initial: string[]) {
  const [turns, setTurnsState] = useState<Turn[]>([]);
  const [shared, setShared] = useState<Record<string, unknown>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const catalog = useCatalog();
  const server = useServer();
  const nextId = useRef(1);
  const timers = useRef<number[]>([]);
  const queue = useRef<string[]>([...initial]);
  // The turns as they are now (a follow-up scheduled from an earlier answer must see the spec that answer added).
  const turnsRef = useRef<Turn[]>([]);
  const setTurns = (update: (all: Turn[]) => Turn[]) => { turnsRef.current = update(turnsRef.current); setTurnsState(turnsRef.current); };
  const later = (ms: number, run: () => void) => { timers.current.push(window.setTimeout(run, ms)); };
  const patch = (id: number, change: Partial<Turn>) => setTurns((all) => all.map((turn) => (turn.id === id ? { ...turn, ...change } : turn)));
  const log = (kind: Event["kind"], title: string, caption: string) => setEvents((all) => [{ id: nextId.current++, kind, title, caption }, ...all].slice(0, 6));
  const answer = (text: string, spec?: UiSpec) => { setTurns((all) => [...all, { id: nextId.current++, side: "ai", text, spec }]); };

  /** A prompt: the person's turn, a moment of thinking (none for a seeded conversation, so the page shows its UIs at once), the answer. */
  const ask = (prompt: string, seeded = false) => {
    const lastWithSpec = [...turnsRef.current].reverse().find((turn) => turn.spec);
    const id = nextId.current++;
    setTurns((all) => [...all, { id: nextId.current++, side: "you", text: prompt }, { id, side: "ai", text: "", thinking: !seeded }]);
    const apply = (composed: Reply) => {
      if (composed.ops && lastWithSpec) setTurns((all) => all.map((turn) => (turn.id === lastWithSpec.id && turn.spec ? { ...turn, spec: applyOps(turn.spec, composed.ops!) } : turn)));
      if (composed.state) { const [path, value] = composed.state; setShared((state) => writeState(state, path, value)); log("state", `${path} = ${JSON.stringify(value)}`, "Set by the conversation"); }
      patch(id, { text: composed.text, spec: composed.spec, thinking: false });
      if (composed.later) later(1200, () => patch(id, { spec: composed.later }));
      if (queue.current.length) later(seeded ? 250 : 900, () => ask(queue.current.shift()!, seeded));
    };
    const local = () => apply(compose(prompt, lastWithSpec?.spec));
    if (seeded) { local(); return; }
    if (!server?.enabled) { later(650, local); return; }
    // A typed prompt with a model behind /ai-ui: a follow-up edits the UI on screen (/edit), anything else composes (/compose);
    // the deterministic composer answers when the server cannot.
    void (async () => {
      type ComposeBody = { ok: boolean; text: string; spec: UiSpec | null };
      type EditBody = { ok: boolean; kind: string; text: string; spec: UiSpec; state: Record<string, unknown> | null };
      if (lastWithSpec?.spec) {
        const edit = await postJson<EditBody>("/ai-ui/edit", { prompt, spec: lastWithSpec.spec, state: shared });
        if (edit?.ok) {
          if (edit.kind === "ops" || edit.kind === "spec") setTurns((all) => all.map((turn) => (turn.id === lastWithSpec.id ? { ...turn, spec: edit.spec } : turn)));
          if (edit.state) { for (const [path, value] of Object.entries(edit.state)) { setShared((state) => writeState(state, path, value)); log("state", `${path} = ${JSON.stringify(value)}`, `Set by ${server.model}`); } }
          patch(id, { text: edit.text || "Done.", thinking: false });
          return;
        }
      }
      const composed = await postJson<ComposeBody>("/ai-ui/compose", { prompt, data: studioData(), state: shared });
      if (composed?.ok) { patch(id, { text: composed.text, spec: composed.spec ?? undefined, thinking: false }); return; }
      local();
    })();
  };
  // A seeded conversation answers its first prompt at once; the rest follow one by one. The effect starts from a clean
  // conversation and its cleanup drops the timers, so StrictMode's second run (dev) seeds once, not twice.
  useEffect(() => {
    queue.current = [...initial];
    turnsRef.current = [];
    setTurnsState([]);
    setShared({});
    setEvents([]);
    if (queue.current.length) ask(queue.current.shift()!, true);
    return () => { for (const timer of timers.current) window.clearTimeout(timer); timers.current = []; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = () => { setTurns((all) => all.map((turn) => (turn.thinking ? { ...turn, thinking: false, text: "You stopped this answer." } : turn))); };
  const onStateChange = (next: Record<string, unknown>, change: StateChange) => { setShared(next); log("state", `${change.path} = ${JSON.stringify(change.value)}`, change.id ? `Picked in ${change.id}` : "Set by the conversation"); };
  const onAction = (call: ActionCall) => {
    log("action", call.name, call.id ? `From ${call.id}${Object.keys(call.args).length ? ` with ${Object.keys(call.args).join(", ")}` : ""}` : "Built in");
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
  return { turns, shared, events, catalog, server, ask, stop, busy: turns.some((turn) => turn.thinking), onStateChange, onAction };
}

const writeState = (state: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> => {
  const [head, ...rest] = path.split(".");
  if (!rest.length) return { ...state, [head]: value };
  return { ...state, [head]: writeState((state[head] ?? {}) as Record<string, unknown>, rest.join("."), value) };
};
type Demo = ReturnType<typeof useComposerDemo>;

/* ───────────── An answer: text, then the UI (validated first) ───────────── */

function Answer({ turn, demo }: { turn: Turn; demo: Demo }) {
  if (!turn.spec) return <>{turn.text}</>;
  if (!demo.catalog) return <Stack gap="md">{turn.text ? <span>{turn.text}</span> : null}<SkeletonText lines={3} /></Stack>;
  const check = validateSpec(turn.spec, demo.catalog);
  return (
    <Stack gap="md">
      {turn.text ? <span>{turn.text}</span> : null}
      {check.ok
        ? <AiUi spec={turn.spec} catalog={demo.catalog} state={demo.shared} onStateChange={demo.onStateChange} onAction={demo.onAction} />
        : <InlineMessage theme="negative" title="This answer's UI did not pass the catalog check">{check.errors.map((problem) => `${problem.path}: ${problem.message}${problem.hint ? ` ${problem.hint}` : ""}`).join(" · ")}</InlineMessage>}
    </Stack>
  );
}

function Thread({ demo, label = "Conversation with Zen AI" }: { demo: Demo; label?: string }) {
  return (
    <AiChatThread aria-label={label}>
      {demo.turns.map((turn) => turn.side === "you"
        ? <AiChatBubble key={turn.id} side="you">{turn.text}</AiChatBubble>
        : <AiChatBubble key={turn.id} side="ai" thinking={turn.thinking}><Answer turn={turn} demo={demo} /></AiChatBubble>)}
    </AiChatThread>
  );
}

const suggestions = [
  { label: "Schedule a review", prompt: "Schedule a design review for the online banking redesign" },
  { label: "Overdue invoices", prompt: "Which invoices are overdue?" },
  { label: "Revenue", prompt: "How did revenue go this quarter?" },
  { label: "Delete a project", prompt: "Delete the online banking project" },
];

/** Suggested prompts over the field, and the field itself. */
function Prompter({ demo, className }: { demo: Demo; className?: string }) {
  return (
    <Stack gap="xs" className={className}>
      <Stack direction="row" gap="xs" wrap>
        {suggestions.map((item) => <Chip key={item.label} variant="normal" size="sm" onClick={() => demo.ask(item.prompt)}>{item.label}</Chip>)}
      </Stack>
      <AiChatField placeholder={`Ask Zen AI, ${firstName}`} busy={demo.busy} onStop={demo.stop} onSubmit={demo.ask} />
      <Text textStyle="Body/Small/Regular" tone="base">{demo.server?.enabled ? `Typed prompts go to ${demo.server.model} through /ai-ui (tools/ai-ui/vite-plugin.mjs); seeded ones use the demo composer.` : "Demo composer. With ANTHROPIC_API_KEY set, npm run dev answers typed prompts with a model through /ai-ui."}</Text>
    </Stack>
  );
}

/* ───────────── Composing while typing (the user's decision, 2026-10-15: the UI appears as the sentence forms) ───────────── */

const skeletonOf = (kind: "form" | "list" | "chart" | "text"): UiSpec => ({
  version: 1,
  root: { type: "Stack", id: `skeleton-${kind}`, props: { gap: "md" }, children: kind === "form" ? [{ $pending: "heading" }, { $pending: "shape" }, { $pending: "shape" }, { $pending: "text" }] : kind === "chart" ? [{ $pending: "heading" }, { $pending: "shape" }] : [{ $pending: "text" }] },
});
/** The on-device classifier: trigger words per intent and the Skeleton to show at once. Nothing leaves the device until an intent is likely. */
const liveIntents = [
  { intent: "booking", words: ["schedule", "book", "meeting", "review", "appointment", "đặt lịch", "hẹn", "họp"], skeleton: skeletonOf("form") },
  { intent: "invoices", words: ["invoice", "overdue", "unpaid", "bill", "hoá đơn", "hóa đơn"], skeleton: skeletonOf("list") },
  { intent: "revenue", words: ["revenue", "invoiced", "chart", "quarter", "doanh thu"], skeleton: skeletonOf("chart") },
  { intent: "confirm", words: ["delete", "remove", "archive", "xoá", "xóa"], skeleton: skeletonOf("text") },
];

function LiveTypingExample({ initial = "" }: { initial?: string }) {
  const catalog = useCatalog();
  const server = useServer();
  const [text, setText] = useState(initial);
  const [live, setLive] = useState<LiveState | null>(null);
  const [shared, setShared] = useState<Record<string, unknown>>({});
  const [sent, setSent] = useState<string | null>(null);
  const composerRef = useRef<LiveComposer | null>(null);
  useEffect(() => {
    if (!server) return undefined;
    const composer = createLiveComposer({
      classify: keywordClassifier(liveIntents),
      compose: async (prompt, { signal }) => {
        if (server.enabled) {
          const remote = await postJson<{ ok: boolean; text: string; spec: UiSpec | null }>("/ai-ui/compose", { prompt, data: studioData() }, signal);
          if (remote?.ok) return { text: remote.text, spec: remote.spec };
        }
        // The demo composer, after the moment a model would take.
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
        const reply = compose(prompt, undefined);
        return { text: reply.text, spec: reply.spec ?? null };
      },
      onChange: setLive,
    });
    composerRef.current = composer;
    if (initial) void composer.submit(initial);
    return () => { composer.dispose(); composerRef.current = null; };
  }, [server]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = live && live.phase !== "idle" ? live.spec ?? live.skeleton : null;
  const status = !live || live.phase === "idle" ? "Waiting for an intent" : live.phase === "skeleton" ? `${live.intent}: likely (${Math.round(live.confidence * 100)}%), composing…` : live.phase === "composing" ? `${live.intent}: updating…` : live.phase === "ready" ? `${live.intent}: ready (${Math.round(live.confidence * 100)}%)` : "Could not compose";
  return (
    <Stack gap="md">
      <AiChatField placeholder="Type, don't send: schedule a review, overdue invoices…" value={text}
        onValueChange={(next) => { setText(next); setSent(null); composerRef.current?.input(next); }}
        onSubmit={(prompt) => { setSent(prompt); setText(""); void composerRef.current?.submit(prompt); }} />
      <Text textStyle="Body/Small/Regular" tone="base">{status}{sent ? ` · sent: “${sent}”` : ""}</Text>
      {preview ? (
        <AiChatThread aria-label="Preview of the UI being composed">
          <AiChatBubble side="ai">
            <Stack gap="md">
              {live?.answer ? <span>{live.answer}</span> : null}
              {catalog ? <AiUi spec={preview} catalog={catalog} state={shared} onStateChange={(next) => setShared(next)} onAction={() => undefined} /> : <SkeletonText lines={3} />}
            </Stack>
          </AiChatBubble>
        </AiChatThread>
      ) : null}
    </Stack>
  );
}

/** What the conversation sees: the shared state and the last events (picks and actions), beside the thread. */
function Aside({ demo }: { demo: Demo }) {
  return (
    <Stack gap="lg">
      <Stack gap="xs">
        {/* Under the answer's h2 (and the playground's): h3, drawn at Heading/4 size. */}
        <Heading level={3} textStyle="Heading/4">Shared state</Heading>
        <Text as="code" textStyle="Body/Small/Regular" tone="base" className="px-ai-ui-json">{JSON.stringify(demo.shared, null, 2) === "{}" ? "{ }  — nothing picked yet" : JSON.stringify(demo.shared, null, 2)}</Text>
      </Stack>
      <Stack gap="xs">
        <Heading level={3} textStyle="Heading/4">Events</Heading>
        {demo.events.length
          ? <List aria-label="Events the conversation received">{demo.events.map((event) => <ListItem key={event.id} title={event.title} caption={event.caption} leading={event.kind === "action" ? "icon-zap-line" : "icon-edit-02-line"} />)}</List>
          : <Text textStyle="Body/Small/Regular" tone="base">Pick something in the answer: every change lands here as the model would see it.</Text>}
      </Stack>
    </Stack>
  );
}

/* ───────────── The screens ───────────── */

function useScrollToEnd(dep: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [dep]);
  return ref;
}

/** Zen AI on the desktop: the conversation with its composed UIs, and beside it what the conversation sees. */
function ComposerScreen({ initial, aside = true }: { initial: string[]; aside?: boolean }) {
  const demo = useComposerDemo(initial);
  const screenRef = useRef<HTMLDivElement>(null);
  const scrollRef = useScrollToEnd(demo.turns.length);
  const conversation = (
    <div className="px-ai-ui-screen">
      <Box ref={scrollRef} scroll="y" className="px-ai-ui-screen__scroll"><Thread demo={demo} /></Box>
      <Box className="px-ai-ui-screen__dock"><Prompter demo={demo} className="px-ai-ui-column" /></Box>
    </div>
  );
  return (
    <PreviewWindow ref={screenRef} height={{ min: 560, max: 720, offset: 160 }} clip={false}>
      <VisuallyHidden as="h1">Zen AI</VisuallyHidden>
      {aside ? (
        <Grid columns="minmax(0, 1fr) 320px" stackBelow={960} gap="none" height="fill">
          {conversation}
          <Box scroll="y" className="px-ai-ui-aside"><Aside demo={demo} /></Box>
        </Grid>
      ) : conversation}
    </PreviewWindow>
  );
}

/** Zen AI on a phone: the same composer, the same specs, in Comfortable density and Mobile typography. */
function ComposerPhone({ initial }: { initial: string[] }) {
  const demo = useComposerDemo(initial);
  const screenRef = useRef<HTMLDivElement>(null);
  return (
    <PlatformPhone label="Zen AI" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={screenRef} />}
      footer={<Box className="px-ai-ui-phone-dock"><AiChatField placeholder="Ask Zen AI" busy={demo.busy} onStop={demo.stop} onSubmit={demo.ask} /></Box>}>
      <Box className="px-ai-ui-phone-body"><Thread demo={demo} /></Box>
    </PlatformPhone>
  );
}

/* ───────────── Playground ───────────── */

const prompts = [
  { id: "booking", label: "Schedule a review", prompt: suggestions[0].prompt },
  { id: "invoices", label: "Overdue invoices", prompt: suggestions[1].prompt },
  { id: "revenue", label: "Revenue by month", prompt: suggestions[2].prompt },
  { id: "confirm", label: "Delete a project", prompt: suggestions[3].prompt },
  { id: "prose", label: "What can you do?", prompt: "What can you do?" },
];

function PlaygroundConversation({ prompt, onCode }: { prompt: string; onCode: (code: string) => void }) {
  const demo = useComposerDemo([prompt]);
  const spec = [...demo.turns].reverse().find((turn) => turn.spec)?.spec;
  useEffect(() => { onCode(spec && demo.catalog ? toJsx(spec, { catalog: demo.catalog }).code : "// The composer is answering…"); }, [spec, demo.catalog, onCode]);
  return (
    <Grid columns="minmax(0, 1fr) 320px" stackBelow={960} gap="lg">
      <Thread demo={demo} label="Zen AI answer" />
      <Aside demo={demo} />
    </Grid>
  );
}

export function AiUiPlayground() {
  const [promptId, setPromptId] = useState(prompts[0].id);
  const [code, setCode] = useState("");
  const current = prompts.find((entry) => entry.id === promptId) ?? prompts[0];
  return (
    <Panel title="AI UI" code={code}
      controls={<>
        <PlaygroundFilterChip label="Prompt" value={promptId} onChange={(value) => setPromptId(String(value))} options={prompts.map((entry) => option(entry.id, entry.label))} />
        <Text as="span" textStyle="Body/Small/Regular" tone="base">The code is the React the renderer runs for the answer's spec (toJsx), what the usage harness lints.</Text>
      </>}>
      <PlaygroundConversation key={current.id} prompt={current.prompt} onCode={setCode} />
    </Panel>
  );
}

/* ───────────── Examples ───────────── */

const renderCode = `const check = validateSpec(spec, catalog);            // the model's JSON against docs/ai-ui/catalog.json

<AiChatBubble side="ai">
  <Stack gap="md">
    <span>{answer.text}</span>
    {check.ok
      ? <AiUi spec={spec} catalog={catalog} state={shared} onStateChange={setShared} onAction={run} />
      : <InlineMessage theme="negative" title="This answer's UI did not pass the catalog check">{check.errors[0].message}</InlineMessage>}
  </Stack>
</AiChatBubble>`;

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Compose from a prompt",
    description: "Alex asks for a design review; the assistant answers with a booking form composed from the catalog (SelectField, DateField, ChipGroup, Buttons) and rendered inside its bubble. Every pick lands in the shared state on the right, and Schedule sends it back as an action.",
    screen: true,
    render: () => <ComposerScreen initial={[suggestions[0].prompt]} />,
    code: renderCode,
  },
  {
    title: "Skeleton first, data after",
    description: "The invoices answer renders at once with a Skeleton where the table goes ({ \"$pending\": \"text\" }); when the rows arrive the same spec is re-rendered with the data, so nothing jumps. A row click reaches the app as an action with the row.",
    wide: true,
    render: () => <ComposerScreen initial={[suggestions[1].prompt]} aside={false} />,
    code: `// Frame 1: the structure, no data yet                       // Frame 2: the same spec with the rows
{ type: "Table", pending: true } or { "$pending": "text" }      { type: "Table", props: { columns, rows: { "$ref": "invoices" }, onRowClick: { "$action": "openInvoice" } } }`,
  },
  {
    title: "Follow-ups edit, not rebuild",
    description: "“Make the button accent” becomes one op on the spec already on screen (setProp on the node with id submit); “at 4 pm” writes the shared state the ChipGroup is bound to. The form stays, with what Alex had already picked.",
    wide: true,
    render: () => <ComposerScreen initial={[suggestions[0].prompt, "Make the button accent", "Let's do it at 4 pm"]} />,
    code: `const next = applyOps(spec, [{ op: "setProp", id: "submit", name: "level", value: "accent" }]);   // "make it accent"
setShared((state) => writePath(state, "review.slot", "16:00"));                                        // "at 4 pm"`,
  },
  {
    title: "Composed while typing",
    description: "The UI appears as the sentence forms, before Send. A keyword classifier runs on the device, so no keystroke leaves it until an intent is likely; at that point the intent's Skeleton shows at once and the composer is asked (a model through /ai-ui when one is configured). A keystroke during composing drops the stale answer; an unsure guess never clears what is shown; Enter composes regardless. Type a different request to watch it switch.",
    wide: true,
    render: () => <LiveTypingExample initial="Schedule a design review with the banking team" />,
    code: `const live = createLiveComposer({
  classify: keywordClassifier([{ intent: "booking", words: ["schedule", "book", "meeting"], skeleton }]),   // on-device
  compose: (prompt, { signal }) => post("/ai-ui/compose", { prompt, data }, signal),                       // the model, when likely
  onChange: setLive,                                                                                         // skeleton → composing → ready
});
<AiChatField value={text} onValueChange={(next) => { setText(next); live.input(next); }} onSubmit={(prompt) => live.submit(prompt)} />
{live.spec ?? live.skeleton ? <AiUi spec={live.spec ?? live.skeleton} catalog={catalog} state={shared} onStateChange={setShared} /> : null}`,
  },
  {
    title: "A spec the catalog rejects",
    description: "The model named a component Zen does not have, a Button level outside the enum and a className. validateSpec reports each with its path and a hint; the answer shows the text and the problems instead of a broken UI, and the app sends the errors back for the model to fix.",
    render: () => <ComposerScreen initial={["Show me something broken"]} aside={false} />,
    code: `validateSpec(spec, catalog).errors
// → [{ code: "unknown-component", path: "root.children.1.type", message: '"Calendar" is not in the catalog.' },
//    { code: "enum", path: "root.children.2.props.level", hint: 'Did you mean "primary"?' },
//    { code: "excluded-prop", path: "root.children.2.props.className", … }]`,
  },
  {
    title: "A prose answer",
    description: "When no UI is called for, the Markdown answer still renders with Zen's text styles: Heading, Text with bold and links, List. The same catalog check applies.",
    render: () => <ComposerScreen initial={["What can you do?"]} aside={false} />,
    code: `const spec = markdownToSpec(answer.markdown);   // Heading, Text, List + ListItem, Link, Table
<AiUi spec={spec} catalog={catalog} />`,
  },
  {
    title: "On a phone",
    description: "The same composer and specs in a phone frame: Comfortable density and Mobile typography come from the frame, the form stacks in one column, the field docks above the home indicator.",
    render: () => <ComposerPhone initial={[suggestions[0].prompt]} />,
    code: `<PlatformPhone label="Zen AI" header={<TopNavigation type="compact-alt" title="Zen AI" />} footer={<AiChatField placeholder="Ask Zen AI" onSubmit={ask} />}>
  <AiChatThread aria-label="Conversation with Zen AI">
    <AiChatBubble side="ai"><AiUi spec={spec} catalog={catalog} state={shared} onStateChange={setShared} onAction={run} /></AiChatBubble>
  </AiChatThread>
</PlatformPhone>`,
  },
]);

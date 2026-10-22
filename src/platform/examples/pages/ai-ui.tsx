/* AI UI examples (docs/ai-ui/README.md): the runtime layer for UI a model composes, at work inside Zen AI. A small
   deterministic "composer" stands in for the model: it answers a prompt with a UI spec built from Đìzai Studio's data
   (examples/data.ts), the spec is validated against the catalog and rendered in the AI bubble with the real components,
   what Alex picks lands in a shared state the conversation reads, and a follow-up edits the UI in place (ops) instead of
   rebuilding it. Nothing here is styled by hand: every look is a component prop. */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { AiChatBlock, AiChatBubble, AiChatField, AiChatThread, type AiChatFieldStyle } from "../../../components/AiChat";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Chip } from "../../../components/Chip";
import { Tag } from "../../../components/Tag";
import { InlineMessage } from "../../../components/InlineMessage";
import { Button } from "../../../components/Button";
import { DescriptionItem, DescriptionList } from "../../../components/DescriptionList";
import { Card } from "../../../components/Card";
import { Icon, type IconName } from "../../../components/Icon";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { SidePanel } from "../../../components/SidePanel";
import { SkeletonText } from "../../../components/Skeleton";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { AiUi, applyOps, createLiveComposer, extractSlots, keywordClassifier, markdownToSpec, primaryActionOf, resolveArgs, walkNodes, toJsx, validateSpec, type ActionCall, type Catalog, type LiveComposer, type LiveState, type Slots as LiveSlots, type UiNode, type SpecOp, type StateChange, type UiSpec } from "../../../ai-ui/index";
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhone } from "../../PlatformPhone";
import { Panel, PlaygroundFilterChip, option } from "../../appLayer/shared";
import { formatMoney, invoices, me, projectById, projects, studio, studioMonths } from "../data";
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
type Failed = { ok: false; error: string };
/** A POST to the dev server's /ai-ui routes: the JSON answer, or `{ ok: false, error }` with the server's reason (a model error, a 503 without a key, the network), so the page can say why it fell back. */
const postJson = async <T extends { ok: true },>(url: string, body: unknown, signal?: AbortSignal): Promise<T | Failed> => {
  try {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
    const json = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
    if (response.ok && json) return json;
    return { ok: false, error: json?.error ?? `${response.status} ${response.statusText}` };
  } catch (error) { if ((error as Error).name === "AbortError") throw error; return { ok: false, error: (error as Error).message }; }
};

/** A composed UI with bound controls (fields, chips, a table) sits on a Card, so a form reads as one object inside the answer (the user, 2026-10-15: "các form nên bỏ vô card cho dễ nhìn"); prose, a chart or a lone button stay in the flow. The host frames it, the model never adds the Card. */
function hasControls(spec: UiSpec, catalog: Catalog): boolean {
  let found = false;
  walkNodes(spec.root, (node) => { if (found) return false; if (catalog.components[node.type]?.bindings?.length) found = true; return found ? false : undefined; });
  return found;
}
function Framed({ spec, catalog, children }: { spec: UiSpec; catalog: Catalog; children: ReactNode }) {
  // Flat on the canvas (usage rules §16); one card on its own, so Spacing=Medium (card/spacing-by-count).
  return hasControls(spec, catalog) ? <Card theme="default" width="fill">{children}</Card> : <>{children}</>;
}

/* ───────────── What the composer answers with (specs from the studio's data) ───────────── */

const firstName = me.name.split(" ")[0];
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

/* ───────────── The composer: a prompt (or a follow-up) → text, a spec, ops or a state change ───────────── */

type Reply = { text: string; spec?: UiSpec; /** The spec's data arrives later (a Skeleton first). */ later?: UiSpec; ops?: SpecOp[]; state?: [string, unknown] };

function compose(prompt: string, lastSpec: UiSpec | undefined, slots?: LiveSlots | null): Reply {
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
  if (/\b(schedule|book|meeting|review|appointment|call)\b|đặt lịch|hẹn|họp/i.test(text)) return { text: "Here is the form. Pick the project, a date and a time, and I'll schedule it.", spec: bookingSpec(slots?.title ?? undefined) };
  if (/\binvoice|overdue|unpaid|bill|hoá đơn|hóa đơn/i.test(text)) return { text: "Checking the studio's invoices…", spec: invoicesSpec(true), later: invoicesSpec(false) };
  if (/\brevenue|invoiced|chart|month|quarter|doanh thu/i.test(text)) return { text: "Here is what the studio invoiced over the last six months.", spec: revenueSpec() };
  if (/\bdelete|remove|archive|xoá|xóa/i.test(text)) return { text: "That is a destructive change.", spec: confirmSpec() };
  if (/\bbroken|invalid|wrong|lỗi/i.test(text)) return { text: "Here is your week:", spec: brokenSpec() };
  return { text: "", spec: proseSpec() };
}

/* ───────────── The demo assistant: turns, shared state, events ───────────── */

type Turn = { id: number; side: "you" | "ai"; text: string; spec?: UiSpec; thinking?: boolean; /** The model could not answer this typed prompt (the server's reason); the demo composer did. */ error?: string };
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
      type ComposeBody = { ok: true; text: string; spec: UiSpec | null };
      type EditBody = { ok: true; kind: string; text: string; spec: UiSpec; state: Record<string, unknown> | null };
      if (lastWithSpec?.spec) {
        const edit = await postJson<EditBody>("/ai-ui/edit", { prompt, spec: lastWithSpec.spec, state: shared });
        if (edit.ok) {
          if (edit.kind === "ops" || edit.kind === "spec") setTurns((all) => all.map((turn) => (turn.id === lastWithSpec.id ? { ...turn, spec: edit.spec } : turn)));
          if (edit.state) { for (const [path, value] of Object.entries(edit.state)) { setShared((state) => writeState(state, path, value)); log("state", `${path} = ${JSON.stringify(value)}`, `Set by ${server.model}`); } }
          patch(id, { text: edit.text || "Done.", thinking: false });
          return;
        }
      }
      const composed = await postJson<ComposeBody>("/ai-ui/compose", { prompt, data: studioData(), state: shared });
      if (composed.ok) { patch(id, { text: composed.text, spec: composed.spec ?? undefined, thinking: false }); return; }
      // The model failed (a bad key, no credit, the network…): the demo composer answers, and the bubble says why.
      local();
      patch(id, { error: composed.error });
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
  // A typed prompt the model could not answer: the server's reason first, then the demo composer's answer.
  const failure = turn.error ? <InlineMessage theme="negative" title="Zen AI could not reach the model">{`${turn.error}. The demo composer answered instead.`}</InlineMessage> : null;
  if (!turn.spec) return failure ? <Stack gap="md">{failure}<span>{turn.text}</span></Stack> : <>{turn.text}</>;
  if (!demo.catalog) return <Stack gap="md">{failure}{turn.text ? <span>{turn.text}</span> : null}<SkeletonText lines={3} /></Stack>;
  const check = validateSpec(turn.spec, demo.catalog);
  return (
    <Stack gap="md">
      {failure}
      {turn.text ? <span>{turn.text}</span> : null}
      {check.ok
        ? <Framed spec={turn.spec} catalog={demo.catalog}><AiUi spec={turn.spec} catalog={demo.catalog} state={demo.shared} onStateChange={demo.onStateChange} onAction={demo.onAction} /></Framed>
        : <InlineMessage theme="negative" title="This answer's UI did not pass the catalog check">{check.errors.map((problem) => `${problem.path}: ${problem.message}${problem.hint ? ` ${problem.hint}` : ""}`).join(" · ")}</InlineMessage>}
    </Stack>
  );
}

/** The AI at work (the user, 2026-10-15: a sphere after the Dribbble shot "Sphere AI Assistant"): frosted glass with soft
    colour drifting inside (three blurred layers, ai-ui.css), in the bubble that waits for the answer and on the composer
    card while it composes. */
function Orb({ label, size, beat = 0 }: { label: string; size?: "sm"; /** Bumps on each keystroke: the sphere beats once (listening). */ beat?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!beat || !el || typeof el.animate !== "function") return;
    const style = getComputedStyle(el);
    const movement = Number(style.getPropertyValue("--zen-motion-movement").trim() || 1);
    if (!movement) return; // reduced motion: no beat, the sphere stays
    const duration = Number.parseFloat(style.getPropertyValue("--zen-motion-duration-base")) || 200;
    el.animate([{ scale: "1" }, { scale: String(1 + 0.14 * movement), offset: 0.35 }, { scale: "1" }], { duration, easing: "cubic-bezier(0.2, 0, 0, 1)" });
  }, [beat]);
  return <span ref={ref} className={size === "sm" ? "px-ai-ui-orb px-ai-ui-orb--sm" : "px-ai-ui-orb"} role="status" aria-label={label}><i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" /></span>;
}

function Thread({ demo, label = "Conversation with Zen AI" }: { demo: Demo; label?: string }) {
  return (
    <AiChatThread aria-label={label}>
      {demo.turns.map((turn) => turn.side === "you"
        ? <AiChatBubble key={turn.id} side="you" className="px-ai-ui-enter">{turn.text}</AiChatBubble>
        : <AiChatBubble key={turn.id} side="ai" className="px-ai-ui-enter">{turn.thinking ? <Orb label="Zen AI is thinking" /> : <Answer turn={turn} demo={demo} />}</AiChatBubble>)}
    </AiChatThread>
  );
}

const suggestions = [
  { label: "Schedule a review", prompt: "Schedule a design review for the online banking redesign" },
  { label: "Overdue invoices", prompt: "Which invoices are overdue?" },
  { label: "Revenue", prompt: "How did revenue go this quarter?" },
  { label: "Delete a project", prompt: "Delete the online banking project" },
];

/** Suggested prompts after the last answer: they scroll with the conversation, so only bubbles pass under the glass field. */
function Suggestions({ demo }: { demo: Demo }) {
  return (
    <Stack direction="row" gap="xs" wrap>
      {suggestions.map((item) => <Chip key={item.label} variant="normal" size="sm" onClick={() => demo.ask(item.prompt)}>{item.label}</Chip>)}
    </Stack>
  );
}

/** Who answers typed prompts: the model behind /ai-ui when one is configured (ANTHROPIC_API_KEY before npm run dev), the
    demo composer otherwise. */
function ModelTag({ demo }: { demo: Demo }) {
  // In the header's top row it steps aside on a phone (.pf-wide-only), where the row keeps the panel and the account.
  return <Tag className="pf-wide-only">{demo.server?.enabled ? demo.server.model : "Demo composer"}</Tag>;
}

/* ───────────── Composing while typing (the user's decision, 2026-10-15: the UI appears as the sentence forms) ───────────── */

const skeletonOf = (kind: "form" | "list" | "chart" | "text"): UiSpec => ({
  version: 1,
  root: { type: "Stack", id: `skeleton-${kind}`, props: { gap: "md" }, children: kind === "form" ? [{ $pending: "heading" }, { $pending: "shape" }, { $pending: "shape" }, { $pending: "text" }] : kind === "chart" ? [{ $pending: "heading" }, { $pending: "shape" }] : [{ $pending: "text" }] },
});
/** The on-device classifier: trigger words per intent and the Skeleton to show at once. Nothing leaves the device until an intent is likely. */
/** What the demo's classifier knows: trigger words, and for the booking intent a tier-1 template: the real form, pre-filled from the slots the sentence carries. */
const liveIntents = [
  { intent: "booking", words: ["schedule", "book", "meeting", "review", "appointment", "đặt lịch", "hẹn", "họp"], skeleton: (slots: Record<string, unknown> | null) => bookingSpec(typeof slots?.title === "string" ? slots.title : undefined) },
  { intent: "invoices", words: ["invoice", "overdue", "unpaid", "bill", "hoá đơn", "hóa đơn"], skeleton: skeletonOf("list") },
  { intent: "revenue", words: ["revenue", "invoiced", "chart", "quarter", "doanh thu"], skeleton: skeletonOf("chart") },
  { intent: "confirm", words: ["delete", "remove", "archive", "xoá", "xóa"], skeleton: skeletonOf("text") },
];

/** The slots the sentence carries, written into the form's shared state (`review.*`): only a slot that changed since the last reading, so a pick made in the form survives further typing. */
function withSlots(prev: Record<string, unknown>, slots: LiveSlots | null, last: LiveSlots | null): Record<string, unknown> {
  const review = { ...((prev.review as Record<string, unknown> | undefined) ?? {}) };
  const changed = (key: "date" | "time" | "people") => JSON.stringify(slots?.[key] ?? null) !== JSON.stringify(last?.[key] ?? null);
  // DateField's value is the text it shows (MM/DD/YYYY, what a pick writes back), so the ISO slot is written in that form.
  if (changed("date")) { if (slots?.date) review.date = fieldDate(slots.date); else delete review.date; }
  if (changed("time")) { if (slots?.time) review.slot = nearestSlot(Number(slots.time.slice(0, 2))); else delete review.slot; }
  if (changed("people")) { if (slots?.people?.length) review.people = slots.people; else delete review.people; }
  return { ...prev, review };
}

const fieldDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${m}/${d}/${y}`; };

/** The label of the Button a primary action lives on (its first text child), for the Enter hint. */
function buttonLabel(node: UiNode | undefined, id: string | null): string | null {
  if (!node || typeof node !== "object" || !id) return null;
  if (node.id === id) { const first = node.children?.[0]; return typeof first === "string" ? first : null; }
  for (const child of node.children ?? []) { const found = buttonLabel(child as UiNode, id); if (found) return found; }
  return null;
}

/** Keyboard hint: the key as a Tag (no keycap component yet), then what it does. */
function KeyHint({ keys, children }: { keys: string; children: ReactNode }) {
  return <Stack direction="row" gap="xs" align="center"><Tag>{keys}</Tag><Text textStyle="Body/Small/Regular" tone="base">{children}</Text></Stack>;
}

/* ── The composer card (docs/research/ai-ui-live-composer-ux-2026-10-15.md §4): the field is the header; the guess is the
   body (type row · title · slot chips, then the form once the intent is sure or a chip is opened); the keys and the primary
   action are the footer. The host draws the card and the slots; the form stays a spec the renderer draws. ── */
const intentMeta = {
  booking: { label: "Booking", icon: "icon-calendar-line", keep: "keep as booking" },
  invoices: { label: "Invoices", icon: "icon-receipt-line", keep: "keep as invoices" },
  revenue: { label: "Revenue", icon: "icon-bar-chart-01-line", keep: "keep as revenue" },
  confirm: { label: "Confirmation", icon: "icon-trash-line", keep: "keep as confirmation" },
  /** Anything the keyword classifier does not know: the sentence goes to the composer as it is. */
  free: { label: "Zen AI", icon: "icon-zen", keep: "keep this" },
} as const satisfies Record<string, { label: string; icon: IconName; keep: string }>;
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Anything the keyword classifier does not know becomes "free" once there are a few words, at the lowest confidence the
    live composer accepts, so a known intent replaces it the moment its words appear; the composer gets the sentence as it
    is (the model when one is configured). */
type Classifier = ReturnType<typeof keywordClassifier>;
const keywordOrFree = (classify: Classifier): Classifier => (text: string) => {
  const known = classify(text);
  if (known?.intent || text.trim().split(/\s+/).length < 3) return known;
  return { intent: "free", confidence: 0.6, slots: extractSlots(text), skeleton: skeletonOf("text") };
};
type SlotKey = "date" | "time" | "people" | "place";

/** The slots as chips: a heard value opens its control in the form; an empty slot says what was not heard ("Add date"). */
/** The slots as chips. While guessing every chip opens the form (an empty one reads "Add date"); once the form is shown
    (`interactive` false) only the heard values stay, as plain chips: the form has no field to add the others to. */
function SlotChips({ slots, keys, onOpen, interactive = true }: { slots: LiveSlots | null; keys: SlotKey[]; onOpen: (slot: SlotKey) => void; interactive?: boolean }) {
  const items: { key: SlotKey; icon: IconName; value: string | null; add: string }[] = [
    { key: "date", icon: "icon-calendar-line", value: slots?.date ? fieldDate(slots.date) : null, add: "Add date" },
    { key: "time", icon: "icon-clock-line", value: slots?.time ?? null, add: "Add time" },
    { key: "people", icon: "icon-users-line", value: slots?.people?.length ? slots.people.join(", ") : null, add: "Add people" },
    { key: "place", icon: "icon-marker-pin-01-line", value: slots?.place ?? null, add: "Add place" },
  ];
  return (
    <Stack direction="row" gap="xs" wrap>
      {items.filter((item) => keys.includes(item.key) && (interactive || item.value)).map((item) => item.value
        ? (interactive
          ? <Chip key={item.key} variant="normal" size="sm" leading={item.icon} dropdown onClick={() => onOpen(item.key)}>{item.value}</Chip>
          : <Chip key={item.key} variant="normal" size="sm" leading={item.icon}>{item.value}</Chip>)
        : <Chip key={item.key} variant="normal" size="sm" leading="icon-plus-line" state="placeholder" onClick={() => onOpen(item.key)}>{item.add}</Chip>)}
    </Stack>
  );
}

/** The template without its heading and its action row: the composer's type row and footer carry those. */
function composerBody(spec: UiSpec): UiSpec {
  const isNode = (child: unknown): child is UiNode => Boolean(child) && typeof child === "object" && "type" in (child as object);
  const children = (spec.root.children ?? []).filter((child) => {
    if (!isNode(child)) return true;
    if (child.type === "Heading") return false;
    const kids = child.children ?? [];
    if (child.type === "Stack" && kids.length > 0 && kids.every((kid) => isNode(kid) && kid.type === "Button")) return false;
    return true;
  });
  return { ...spec, root: { ...spec.root, children } };
}

/** The live composer: the field and the guess card. `placement="above"` puts the card over the field (a phone: the keyboard
    covers nothing, the preview pushes the thread; study F9). */
function LiveTypingExample({ initial = "", placement = "below", fieldStyle = "default", placeholder = "Type, don't send: schedule a review tomorrow at 4 pm, overdue invoices…" }: { initial?: string; placement?: "below" | "above"; fieldStyle?: AiChatFieldStyle; placeholder?: string }) {
  const catalog = useCatalog();
  const server = useServer();
  const [text, setText] = useState(initial);
  const [live, setLive] = useState<LiveState | null>(null);
  const [shared, setShared] = useState<Record<string, unknown>>({});
  const [done, setDone] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  // Listening: each keystroke beats the sphere, and it stays on the type row for a moment after the last one.
  const [beat, setBeat] = useState(0);
  const [hearing, setHearing] = useState(false);
  const hearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heard = () => {
    setBeat((count) => count + 1);
    setHearing(true);
    if (hearTimer.current) clearTimeout(hearTimer.current);
    hearTimer.current = setTimeout(() => { hearTimer.current = null; setHearing(false); }, 900);
  };
  useEffect(() => () => { if (hearTimer.current) clearTimeout(hearTimer.current); }, []);
  const composerRef = useRef<LiveComposer | null>(null);
  const lastSlots = useRef<LiveSlots | null>(null);
  useEffect(() => {
    if (!server) return undefined;
    const composer = createLiveComposer({
      classify: keywordOrFree(keywordClassifier(liveIntents, { slots: extractSlots })),
      compose: async (prompt, { intent, slots, signal }) => {
        const known = (slots as LiveSlots | null) ?? null;
        if (intent === "free" && !server.enabled) {
          // Without a model the demo composer cannot build this: say so, and what it can build.
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
          return { text: "", spec: markdownToSpec("The demo composer knows bookings, invoices, revenue and confirmations. With `ANTHROPIC_API_KEY` set before `npm run dev`, Zen AI composes this request too.") };
        }
        if (server.enabled) {
          const remote = await postJson<{ ok: true; text: string; spec: UiSpec | null }>("/ai-ui/compose", { prompt, data: studioData(), state: known ? withSlots({}, known, null) : undefined }, signal);
          if (remote.ok) { setServerError(null); return { text: remote.text, spec: remote.spec }; }
          setServerError(remote.error);
        }
        // The demo composer, after the moment a model would take.
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
        const reply = compose(prompt, undefined, known);
        return { text: reply.text, spec: reply.spec ?? null };
      },
      onChange: (state) => {
        setLive(state);
        // The slots land in the shared state as they change, so the template and the composed form read them.
        const slots = (state.slots as LiveSlots | null) ?? null;
        if (state.phase === "idle") { lastSlots.current = null; return; }
        const last = lastSlots.current;
        if (JSON.stringify(slots) !== JSON.stringify(last)) { lastSlots.current = slots; setShared((prev) => withSlots(prev, slots, last)); }
      },
    });
    composerRef.current = composer;
    if (initial) void composer.submit(initial);
    return () => { composer.dispose(); composerRef.current = null; };
  }, [server]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = live && live.phase !== "idle" ? live.spec ?? live.skeleton : null;
  const intent = live?.intent ?? null;
  const meta = intent && intent in intentMeta ? intentMeta[intent as keyof typeof intentMeta] : null;
  // Sure: kept with Tab or answered by the composer; until then the body is a guess (the keyword classifier's confidence is not calibrated enough to decide it).
  const sure = Boolean(live && (live.pinned || (live.phase === "ready" && live.spec)));
  const working = live?.phase === "skeleton" || live?.phase === "composing"; // a template shown and the answer on its way, or an edit of a kept spec
  const showForm = Boolean(preview && (sure || opened || intent !== "booking"));
  const action = preview ? primaryActionOf(preview) : null;
  const actionLabel = action ? buttonLabel(preview?.root, action.id) ?? action.action : null;
  const slots = (live?.slots as LiveSlots | null) ?? null;
  const clear = () => { setDone(null); setOpened(false); setShared({}); lastSlots.current = null; composerRef.current?.reset(); };
  const runAction = () => {
    if (!action || !preview || !showForm) return false;
    // Enter and the footer's button run the UI's primary action, as a click on it would: the args read the shared state.
    const args = resolveArgs(action.args, { state: shared, data: preview.data ?? studioData() });
    setDone(`${actionLabel}: ${action.action} ${JSON.stringify(args)}`);
    setText("");
    clear();
    return true;
  };
  const submit = (prompt: string) => { if (runAction()) return; setDone(null); void composerRef.current?.submit(prompt); };
  // The field keeps its pill on the canvas; the guess card sits right under it, or over it on a phone (nested corners stay concentric, usage rules §13 / rhythm).
  const field = (
    <AiChatField fieldStyle={fieldStyle} placeholder={placeholder} value={text}
      onValueChange={(next) => { setText(next); heard(); composerRef.current?.input(next); }}
      onSubmit={submit}
      onAccept={intent && !live?.pinned ? () => { composerRef.current?.accept(); } : undefined}
      onClear={text || preview ? clear : undefined} />
  );
  const listening = !preview && text.trim().length > 0;
  const card = listening ? (
    <Card theme="default" width="fill" className="px-ai-ui-composer">
      <Stack direction="row" gap="xs" align="center">
        <Orb label="Listening" size="sm" beat={beat} />
        <Text textStyle="Body/Small/Medium">Zen AI</Text>
        <Text textStyle="Body/Small/Regular" tone="base">listening</Text>
      </Stack>
    </Card>
  ) : preview && meta ? (
          <Card theme="default" width="fill" className="px-ai-ui-composer">
            <Stack gap="md">
              <div className="px-ai-ui-composer__guess" key={intent ?? "none"}>
                <Stack gap="sm">
                  <Stack direction="row" gap="xs" align="center">
                    {working || hearing ? <Orb label={working ? "Composing" : "Listening"} size="sm" beat={beat} /> : <Icon name={meta.icon} size={16} />}
                    <Text textStyle="Body/Small/Medium">{meta.label}</Text>
                    {live?.pinned ? <Text textStyle="Body/Small/Regular" tone="base">kept</Text> : sure ? null : <Text textStyle="Body/Small/Regular" tone="base">likely</Text>}
                  </Stack>
                  {intent === "booking" && slots?.title ? <Heading level={3} textStyle="Heading/4">{slots.title}</Heading> : null}
                  {/* The chips are the guess; once the form shows it carries the date and the time, so those two step aside and the slots it has no field for (people, place) stay. */}
                  {intent === "booking" ? <SlotChips slots={slots} keys={showForm ? ["people", "place"] : ["date", "time", "people", "place"]} onOpen={() => setOpened(true)} interactive={!showForm} /> : null}
                  {showForm ? (catalog ? <AiUi spec={composerBody(preview)} catalog={catalog} state={shared} onStateChange={(next) => setShared(next)} onAction={(call) => { setDone(`${call.name} ${JSON.stringify(call.args)}`); clear(); }} /> : <SkeletonText lines={3} />) : null}
                  {serverError ? <Text textStyle="Body/Small/Regular" tone="base">{`The model failed (${serverError}); the demo composer answered.`}</Text> : null}
                </Stack>
              </div>
              {/* The footer: the keys on a desktop; on a phone (no Tab, no Esc) a "Keep as …" button in their place. */}
              <Stack direction="row" gap="md" justify="between" align="center" wrap>
                {placement === "above"
                  ? <Stack direction="row" gap="xs" wrap>{!live?.pinned ? <Button level="tertiary" size="sm" onClick={() => composerRef.current?.accept()}>{capitalise(meta.keep)}</Button> : null}</Stack>
                  : <Stack direction="row" gap="sm" wrap>
                      {!live?.pinned ? <KeyHint keys="Tab">to {meta.keep}</KeyHint> : null}
                      <KeyHint keys="Esc">to clear</KeyHint>
                      <KeyHint keys="Enter">{action && showForm && actionLabel ? `to ${actionLabel.toLowerCase()}` : "to compose now"}</KeyHint>
                    </Stack>}
                {action && showForm ? (
                  <Stack direction="row" gap="xs">
                    <Button level="tertiary" size="sm" onClick={clear}>Cancel</Button>
                    <Button level="primary" size="sm" onClick={runAction}>{actionLabel}</Button>
                  </Stack>
                ) : null}
              </Stack>
            </Stack>
          </Card>
        ) : null;
  return (
    <Stack gap="md">
      <Stack gap="xs">
        {placement === "above" ? card : field}
        {placement === "above" ? field : card}
      </Stack>
      {done ? <Text textStyle="Body/Small/Regular">{done}</Text> : null}
    </Stack>
  );
}

/** The composer on a phone: the greeting fills the screen and the composer sits at the end of the shell's Body, in flow;
    the card rises above the field as the sentence forms and pushes the greeting up, and the screen follows the field
    (useScrollToEnd), so the keyboard would cover nothing. */
function LiveTypingPhone({ initial = "" }: { initial?: string }) {
  const screenRef = useRef<HTMLDivElement>(null);
  useScrollToEnd(screenRef, null, null);
  return (
    <PlatformPhone label="Zen AI" screenRef={screenRef}>
      <AppShell topNavigation={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={screenRef} />}>
        <Box className="px-ai-ui-phone-home">
          <AiChatBlock greeting={`What do you need, ${firstName}?`}>
            <Text textStyle="Body/Base/Regular" tone="base">Type it: the form takes shape above the field as you go.</Text>
          </AiChatBlock>
        </Box>
        {/* In flow at the end of the Body, not pinned: a card taller than the screen scrolls, and the screen follows it. */}
        <Box className="px-ai-ui-phone-composer"><LiveTypingExample initial={initial} placement="above" fieldStyle="liquid-glass" placeholder="Ask Zen AI" /></Box>
      </AppShell>
    </PlatformPhone>
  );
}

/** What the conversation sees: the shared state and the last events (picks and actions), beside the thread. */
/** The shared state as rows (path → value), the way the conversation reads it. */
const flatten = (value: unknown, prefix = ""): Array<[string, string]> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => flatten(inner, prefix ? `${prefix}.${key}` : key))
    : [[prefix, Array.isArray(value) ? value.map(String).join(", ") : String(value ?? "")]];

/** What the conversation sees (the shared state, the events): the panel the screen's bar opens, or the playground's column. */
function Aside({ demo, titled = true }: { demo: Demo; /** The playground's column names itself; a Side Panel's title does it there. */ titled?: boolean }) {
  const rows = flatten(demo.shared);
  return (
    <Stack gap="lg">
      {titled ? <Heading level={2} textStyle="Heading/4">What Zen AI sees</Heading> : null}
      <Stack gap="xs">
        <Heading level={3} textStyle="Body/Base/Medium">Shared state</Heading>
        {rows.length
          ? <DescriptionList divider>{rows.map(([path, value]) => <DescriptionItem key={path} term={path} description={value} />)}</DescriptionList>
          : <Text textStyle="Body/Small/Regular" tone="base">Nothing picked yet. Every pick in the answer lands here, as the model would see it.</Text>}
      </Stack>
      <Stack gap="xs">
        <Heading level={3} textStyle="Body/Base/Medium">Events</Heading>
        {demo.events.length
          ? <List aria-label="Events the conversation received">{demo.events.map((event) => <ListItem key={event.id} title={event.title} caption={event.caption} leading={event.kind === "action" ? "icon-zap-line" : "icon-edit-02-line"} />)}</List>
          : <Text textStyle="Body/Small/Regular" tone="base">Schedule, or pick a row: actions and edits land here.</Text>}
      </Stack>
    </Stack>
  );
}

/* ───────────── The screens ───────────── */

/** Keeps the end of the conversation in view: on a new turn, once the catalog lets an answer render its UI, and while
    that UI still grows (lazy icons, fonts) as long as the reader was at the end; a reader who scrolled up stays put. */
function useScrollToEnd(ref: RefObject<HTMLDivElement | null>, turns: unknown, catalog: unknown) {
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [ref, turns, catalog]);
  useEffect(() => {
    const el = ref.current;
    const flow = el?.firstElementChild;
    if (!el || !flow || typeof ResizeObserver === "undefined") return undefined;
    let height = el.scrollHeight;
    const observer = new ResizeObserver(() => {
      const wasAtEnd = el.scrollTop + el.clientHeight >= height - 80;
      height = el.scrollHeight;
      if (wasAtEnd) el.scrollTo({ top: height });
    });
    observer.observe(flow);
    return () => observer.disconnect();
  }, [ref]);
}

/** Zen AI on the desktop, one product without navigation (AppShell pattern top-bar): the header's one row holds the
    product, who answers, the panel's button and the account; the conversation with its composed UIs scrolls under a
    Liquid Glass field (Figma AI/Chat-Field, Style=Liquid Glass) docked at the bottom of the window, on the Canvas; what
    the conversation sees opens as the shell's Side Panel, docked beside the conversation where the window has room. */
function ComposerScreen({ initial, aside = true }: { initial: string[]; aside?: boolean }) {
  const { toast } = useToast();
  const demo = useComposerDemo(initial);
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // The window's scroller (PreviewAppFrame) is what follows the end of the conversation.
  useLayoutEffect(() => { scrollRef.current = frameRef.current?.querySelector<HTMLDivElement>(".pf-app-frame__scroll") ?? null; }, []);
  useScrollToEnd(scrollRef, demo.turns, demo.catalog);
  const [open, setOpen] = useState(false);
  return (
    <PreviewAppFrame frameRef={frameRef} height={{ min: 560, max: 720 }}>
      <AppShell pattern="top-bar"
        header={(
          <AppShellHeader
            leading={(
              <Stack direction="row" gap="xs" align="center">
                <Avatar size="sm" shape="square" theme="photo" src={studio.logo} alt="" />
                {/* zen-allow-visual-heading: the product's name in the bar repeats the visually hidden h1 of the Body (aria-hidden), so the outline has one h1 and the bar no oversized title. */}
                <Text as="span" textStyle="Heading/4" aria-hidden="true">Zen AI</Text>
              </Stack>
            )}
            actions={<>
              <ModelTag demo={demo} />
              {/* A header utility (AppShellAction): its name is the tooltip, so the row fits a narrow window too. */}
              {aside ? <AppShellAction icon="icon-code-01-line" aria-label="What Zen AI sees" aria-expanded={open} onClick={() => setOpen((value) => !value)} /> : null}
              <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
                { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
                { id: "history", label: "Chat history", icon: "icon-clock-line", onSelect: () => toast({ title: "Chat history", children: "Zen AI keeps your chats for 30 days." }) },
                { type: "separator" },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
              ]} />
            </>}
          />
        )}
        sidePanel={aside ? (
          <SidePanel type="standard" size="small" open={open} onOpenChange={setOpen} title="What Zen AI sees" description="The shared state and the events, as the conversation reads them.">
            <Aside demo={demo} titled={false} />
          </SidePanel>
        ) : undefined}
      >
        {/* The screen's title for the outline; the bar shows it at bar size (a content h1 would be Heading/1). */}
        <VisuallyHidden as="h1">Zen AI</VisuallyHidden>
        <Stack gap="lg" className="px-ai-ui-column px-ai-ui-desk__thread"><Thread demo={demo} /><Suggestions demo={demo} /></Stack>
        <div className="px-ai-ui-dock"><AiChatField fieldStyle="liquid-glass" placeholder={`Ask Zen AI, ${firstName}`} busy={demo.busy} onStop={demo.stop} onSubmit={demo.ask} className="px-ai-ui-column" /></div>
      </AppShell>
    </PreviewAppFrame>
  );
}

/** Zen AI on a phone: the same composer, the same specs, in Comfortable density and Mobile typography. The field docks at
    the bottom of the shell, where a task's Action bar goes, and the conversation scrolls under its glass. */
function ComposerPhone({ initial }: { initial: string[] }) {
  const demo = useComposerDemo(initial);
  const screenRef = useRef<HTMLDivElement>(null);
  useScrollToEnd(screenRef, demo.turns, demo.catalog); // the phone's screen is the scroller; the shell is its first child
  return (
    <PlatformPhone label="Zen AI" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={screenRef} />}
        actionBar={<Box className="px-ai-ui-phone-dock"><AiChatField fieldStyle="liquid-glass" placeholder="Ask Zen AI" busy={demo.busy} onStop={demo.stop} onSubmit={demo.ask} /></Box>}
      >
        <Thread demo={demo} />
      </AppShell>
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
      ? <Card theme="default" width="fill"><AiUi spec={spec} catalog={catalog} state={shared} onStateChange={setShared} onAction={run} /></Card>   // a form reads as one object on a Card; the host frames it
      : <InlineMessage theme="negative" title="This answer's UI did not pass the catalog check">{check.errors[0].message}</InlineMessage>}
  </Stack>
</AiChatBubble>`;

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Compose from a prompt",
    description: "Alex asks for a design review; the assistant answers with a booking form composed from the catalog (SelectField, DateField, ChipGroup, Buttons) and rendered inside its bubble. Every pick lands in the shared state (open “What Zen AI sees”, the code icon in the header, to watch it in the Side Panel), and Schedule sends it back as an action. The bar's Tag says who answers typed prompts: the model behind /ai-ui when ANTHROPIC_API_KEY is set before npm run dev, the demo composer otherwise.",
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
    description: "The composer card: the field is the header, the guess is the body, the keys and the primary action are the footer. As the sentence forms, a keyword classifier on the device names the intent and pulls the slots out of it (title, date, time, people, place), and anything it does not know goes to the composer as it is once a few words are in (the model, when one is configured; the demo composer says what it can build); the card shows the type row, the title and the slots as chips at once (an empty slot reads 'Add date'), then the form once the intent is sure (Tab, the composer's answer, or a clear match) or a chip is opened; the composer (a model through /ai-ui when one is configured) fills in the real UI. A keystroke during composing drops the stale answer; an unsure guess never clears what is shown. Tab keeps the guessed intent and moves into the card, Escape clears, Enter runs the form's primary action when one is on screen (Schedule) and composes otherwise.",
    wide: true,
    render: () => <LiveTypingExample initial="Schedule a design review with the banking team tomorrow at 4 pm" />,
    code: `const live = createLiveComposer({
  classify: keywordClassifier(intents, { slots: extractSlots }),                  // on-device: the intent, and title / date / time / people from the sentence
  compose: (prompt, { slots, signal }) => post("/ai-ui/compose", { prompt, data, state: fromSlots(slots) }, signal),
  onChange: setLive,
});
const sure = live.pinned || Boolean(live.spec);                                 // Tab, or the composer's answer; a guess looks like a guess until then
const action = primaryActionOf(live.spec ?? live.skeleton);                       // Enter and the footer button run it
<Card theme="default" width="fill">                                     {/* one object: field · guess · footer */}
  <AiChatField fieldStyle="surface" value={text} onValueChange={(next) => { setText(next); live.input(next); }}
    onAccept={live.intent && !live.pinned ? () => live.accept() : undefined}       // Tab keeps the guess, then moves into the card
    onClear={text ? () => live.reset() : undefined}                                // Escape clears
    onSubmit={(prompt) => (action && sure ? run(action) : live.submit(prompt))} />
  <TypeRow intent={live.intent} sure={sure} />                                     {/* icon · Booking · "likely" */}
  <SlotChips slots={live.slots} onOpen={showForm} />                               {/* [Tomorrow ▾] [16:00 ▾] [+ Add people] */}
  {sure || opened ? <AiUi spec={composerBody(live.spec ?? live.skeleton)} catalog={catalog} state={shared} onStateChange={setShared} /> : null}
  <Footer hints={[["Tab", "keep as booking"], ["Esc", "clear"], ["Enter", "schedule"]]} primary={action} />
</Card>`,
  },
  {
    title: "Composed while typing, on a phone",
    description: "The same composer on a phone: the card rises above the docked field, so a keyboard would cover nothing and the preview pushes the greeting up (study F9); the slots become chips, the form shows once the intent is sure, and the footer's keys and buttons wrap in the 390 px column.",
    render: () => <LiveTypingPhone initial="Schedule a design review with Gia tomorrow at 4 pm" />,
    code: `<PlatformPhone label="Zen AI" screenRef={screenRef}>
  <AppShell topNavigation={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={screenRef} />}>
    <AiChatBlock greeting="What do you need, Alex?">…</AiChatBlock>
    <Stack gap="xs">                                                    {/* at the end of the Body, in flow: the card, then the field */}
      <Card theme="default" width="fill">…the guess…</Card>
      <AiChatField fieldStyle="liquid-glass" placeholder="Ask Zen AI" value={text} onValueChange={…} onAccept={…} onClear={…} onSubmit={…} />
    </Stack>
  </AppShell>
</PlatformPhone>`,
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
    description: "The same composer and specs in a phone frame: Comfortable density and Mobile typography come from the frame, the form stacks in one column on its Card, in the narrow bubble the time chips and the actions wrap onto another row instead of overflowing, the Liquid Glass field docks above the home indicator and the conversation scrolls under it.",
    render: () => <ComposerPhone initial={[suggestions[0].prompt]} />,
    code: `<PlatformPhone label="Zen AI" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={screenRef} />}
    actionBar={<AiChatField fieldStyle="liquid-glass" placeholder="Ask Zen AI" onSubmit={ask} />}
  >
    <AiChatThread aria-label="Conversation with Zen AI">
      <AiChatBubble side="ai"><AiUi spec={spec} catalog={catalog} state={shared} onStateChange={setShared} onAction={run} /></AiChatBubble>
    </AiChatThread>
  </AppShell>
</PlatformPhone>`,
  },
]);

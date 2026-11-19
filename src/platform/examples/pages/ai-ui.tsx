/* AI UI (docs/ai-ui/README.md): the runtime layer for UI a model composes, at work inside Zen AI. Each example is its own
   file in ai-ui/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export (in
   a window frame or on the device) and shows its text as the snippet. A small deterministic "composer" stands in for the
   model there and in the playground below: it answers a prompt with a UI spec built from Đìzai Studio's data
   (examples/data.ts), the spec is validated against the catalog and rendered in the AI bubble with the real components,
   what Alex picks lands in a shared state the conversation reads, and a follow-up edits the UI in place (ops) instead of
   rebuilding it. Nothing here is styled by hand: every look is a component prop. */
import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type ReactNode, type RefObject } from "react";
import { AiChatBubble, AiChatThread } from "../../../components/AiChat";
import { InlineMessage } from "../../../components/InlineMessage";
import { DescriptionItem, DescriptionList } from "../../../components/DescriptionList";
import { Card } from "../../../components/Card";
import { Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { SkeletonText } from "../../../components/Skeleton";
import { Heading, Text } from "../../../components/Text";
import { AiUi, applyOps, markdownToSpec, walkNodes, toJsx, validateSpec, type ActionCall, type Catalog, type SpecOp, type StateChange, type UiSpec } from "../../../ai-ui/index";
import { PreviewAppFrame } from "../../PlatformFrames";
import { PlatformPhone, type PhoneScrollRef } from "../../PlatformPhone";
import { Panel, PlaygroundFilterChip, option } from "../../appLayer/shared";
import { formatMoney, invoices, projectById, projects, studioMonths } from "../data";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import ComposeFromAPrompt from "./ai-ui/compose-from-a-prompt.example";
import composeFromAPrompt from "./ai-ui/compose-from-a-prompt.example.tsx?raw";
import SkeletonFirstDataAfter from "./ai-ui/skeleton-first-data-after.example";
import skeletonFirstDataAfter from "./ai-ui/skeleton-first-data-after.example.tsx?raw";
import FollowUpsEditNotRebuild from "./ai-ui/follow-ups-edit-not-rebuild.example";
import followUpsEditNotRebuild from "./ai-ui/follow-ups-edit-not-rebuild.example.tsx?raw";
import ComposedWhileTyping from "./ai-ui/composed-while-typing.example";
import composedWhileTyping from "./ai-ui/composed-while-typing.example.tsx?raw";
import ComposedWhileTypingOnAPhone from "./ai-ui/composed-while-typing-on-a-phone.example";
import composedWhileTypingOnAPhone from "./ai-ui/composed-while-typing-on-a-phone.example.tsx?raw";
import ASpecTheCatalogRejects from "./ai-ui/a-spec-the-catalog-rejects.example";
import aSpecTheCatalogRejects from "./ai-ui/a-spec-the-catalog-rejects.example.tsx?raw";
import AProseAnswer from "./ai-ui/a-prose-answer.example";
import aProseAnswer from "./ai-ui/a-prose-answer.example.tsx?raw";
import OnAPhone from "./ai-ui/on-a-phone.example";
import onAPhone from "./ai-ui/on-a-phone.example.tsx?raw";
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

function compose(prompt: string, lastSpec: UiSpec | undefined): Reply {
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
    colour drifting inside (three blurred layers, ai-ui.css), in the playground's bubble that waits for the answer. The
    examples use AiChatBubble's own thinking state instead (page CSS cannot travel with a copied example). */
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

/* ───────────── The examples' docs frames ───────────── */

/** An example takes the catalog as a prop (an app imports it); the page loads it once, lazily, and passes it in. */
type CatalogProps = { catalog: Catalog | null };

/** Docs chrome: the frame's scroller (the window frame's scroll area, the phone's screen) opens at the end of the seeded
    conversation and stays there while an answer's UI grows (the catalog arriving, fonts, icons), as long as the reader is
    at the end; a reader who scrolled up stays put. The examples scroll it themselves on each new turn. */
function useFollowEnd(scroller: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = scroller.current;
    const flow = el?.firstElementChild;
    if (!el || !flow || typeof ResizeObserver === "undefined") return undefined;
    el.scrollTo({ top: el.scrollHeight });
    let height = el.scrollHeight;
    const observer = new ResizeObserver(() => {
      const wasAtEnd = el.scrollTop + el.clientHeight >= height - 80;
      height = el.scrollHeight;
      if (wasAtEnd) el.scrollTo({ top: height });
    });
    observer.observe(flow);
    return () => observer.disconnect();
  }, [scroller]);
}

/** Under this width AppShell's header lays out its top row for a phone (the drawer layout under a tablet's 744 px). */
const PHONE_BAR_MAX_WIDTH = 744;

/** A desktop example in its window frame: the frame's scroll area is what the conversation scrolls (`scrollRef`), and
    the frame's own width says whether the bar's top row is a phone's (`narrow`): a card in the page is narrower than the
    window the breakpoint reads. Until measured, the example follows the breakpoint. */
function AiUiWindow({ app: App }: { app: ComponentType<CatalogProps & { scrollRef?: PhoneScrollRef; narrow?: boolean }> }) {
  const catalog = useCatalog();
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLElement | null>(null);
  const [narrow, setNarrow] = useState<boolean | undefined>(undefined);
  useLayoutEffect(() => {
    const scroller = frameRef.current?.querySelector<HTMLElement>(".pf-app-frame__scroll") ?? null;
    scrollRef.current = scroller;
    if (!scroller) return undefined;
    const measure = () => setNarrow(scroller.clientWidth < PHONE_BAR_MAX_WIDTH);
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);
  useFollowEnd(scrollRef);
  return <PreviewAppFrame frameRef={frameRef} height={{ min: 560, max: 720 }}><App catalog={catalog} scrollRef={scrollRef} narrow={narrow} /></PreviewAppFrame>;
}

/** A phone example on the device: its screen is what scrolls (`scrollRef`). */
function AiUiPhone({ app: App }: { app: ComponentType<CatalogProps & { scrollRef?: PhoneScrollRef }> }) {
  const catalog = useCatalog();
  const screenRef = useRef<HTMLDivElement>(null);
  useFollowEnd(screenRef);
  return <PlatformPhone label="Zen AI" screenRef={screenRef}><App catalog={catalog} scrollRef={screenRef} /></PlatformPhone>;
}

/** An example on the card itself: the catalog only. */
function CatalogFor({ app: App }: { app: ComponentType<CatalogProps> }) {
  const catalog = useCatalog();
  return <App catalog={catalog} />;
}

/* ───────────── Examples ───────────── */

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Compose from a prompt",
    description: "Alex asks for a design review; the assistant answers with a booking form composed from the catalog (SelectField, DateField, ChipGroup, Buttons) and rendered inside its bubble. Every pick lands in the shared state (open “What Zen AI sees”, the code icon in the header, to watch it in the Side Panel), and Schedule sends it back as an action. The bar's Tag says who answers typed prompts: the model behind /ai-ui when ANTHROPIC_API_KEY is set before npm run dev, the demo composer otherwise.",
    screen: true,
    render: () => <AiUiWindow app={ComposeFromAPrompt} />,
    code: exampleCode(composeFromAPrompt),
  },
  {
    title: "Skeleton first, data after",
    description: "The invoices answer renders at once with a Skeleton where the table goes ({ \"$pending\": \"text\" }); when the rows arrive the same spec is re-rendered with the data, so nothing jumps. A row click reaches the app as an action with the row. The example opens with the rows: pick Overdue invoices to watch the Skeleton.",
    wide: true,
    render: () => <AiUiWindow app={SkeletonFirstDataAfter} />,
    code: exampleCode(skeletonFirstDataAfter),
  },
  {
    title: "Follow-ups edit, not rebuild",
    description: "“Make the button accent” becomes one op on the spec already on screen (setProp on the node with id submit); “at 4 pm” writes the shared state the ChipGroup is bound to. The form stays, with what Alex had already picked.",
    wide: true,
    render: () => <AiUiWindow app={FollowUpsEditNotRebuild} />,
    code: exampleCode(followUpsEditNotRebuild),
  },
  {
    title: "Composed while typing",
    description: "The composer card: the field is the header, the guess is the body, the keys and the primary action are the footer. As the sentence forms, a keyword classifier on the device names the intent and pulls the slots out of it (title, date, time, people, place), and anything it does not know goes to the composer as it is once a few words are in (the model, when one is configured; the demo composer says what it can build); the card shows the type row, the title and the slots as chips at once (an empty slot reads 'Add date'), then the form once the intent is sure (Tab, the composer's answer, or a clear match) or a chip is opened; the composer (a model through /ai-ui when one is configured) fills in the real UI. A keystroke during composing drops the stale answer; an unsure guess never clears what is shown. Tab keeps the guessed intent and moves into the card, Escape clears, Enter runs the form's primary action when one is on screen (Schedule) and composes otherwise.",
    wide: true,
    render: () => <CatalogFor app={ComposedWhileTyping} />,
    code: exampleCode(composedWhileTyping),
  },
  {
    title: "Composed while typing, on a phone",
    description: "The same composer on a phone: the card rises above the docked field, so a keyboard would cover nothing and the preview pushes the greeting up (study F9); the slots become chips, the form shows once the intent is sure, and the footer's keys and buttons wrap in the 390 px column.",
    render: () => <AiUiPhone app={ComposedWhileTypingOnAPhone} />,
    code: exampleCode(composedWhileTypingOnAPhone),
  },
  {
    title: "A spec the catalog rejects",
    description: "The model named a component Zen does not have, a Button level outside the enum and a className. validateSpec reports each with its path and a hint; the answer shows the text and the problems instead of a broken UI, and the app sends the errors back for the model to fix.",
    render: () => <AiUiWindow app={ASpecTheCatalogRejects} />,
    code: exampleCode(aSpecTheCatalogRejects),
  },
  {
    title: "A prose answer",
    description: "When no UI is called for, the Markdown answer still renders with Zen's text styles: Heading, Text with bold and links, List. The same catalog check applies.",
    render: () => <AiUiWindow app={AProseAnswer} />,
    code: exampleCode(aProseAnswer),
  },
  {
    title: "On a phone",
    description: "The same composer and specs in a phone frame: Comfortable density and Mobile typography come from the frame, the form stacks in one column on its Card, in the narrow bubble the time chips and the actions wrap onto another row instead of overflowing, the Liquid Glass field docks above the home indicator and the conversation scrolls under it.",
    render: () => <AiUiPhone app={OnAPhone} />,
    code: exampleCode(onAPhone),
  },
]);

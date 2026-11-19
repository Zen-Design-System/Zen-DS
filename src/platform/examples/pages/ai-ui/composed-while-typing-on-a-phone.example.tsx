/* Composing while typing (@zen-ds/react/ai-ui, createLiveComposer): as the sentence forms, a classifier on the device
   names the likely intent and its slots and shows the form at once; the composer (the model behind your endpoint, or the
   demo composer standing in for it) fills in the real UI. Nothing is styled by hand: every look is a component prop. */
import { useRef, useState, type RefObject } from "react";
import {
  AiChatBlock, AiChatField, AppShell, Box, Button, Card, Chip, Heading, Icon, SkeletonText, Stack, Tag, Text,
  TopNavigation, type IconName,
} from "@zen-ds/react";
import {
  AiUi, createLiveComposer, extractSlots, keywordClassifier, markdownToSpec, primaryActionOf, resolveArgs,
  type Catalog, type LiveComposer, type LiveState, type Slots as LiveSlots, type UiNode, type UiSpec,
} from "@zen-ds/react/ai-ui";
import { formatMoney, invoices, me, projectById, projects, studioMonths } from "../../data";

const firstName = me.name.split(" ")[0];

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

/** The studio's invoices as a table. */
const invoicesSpec = (): UiSpec => ({
  version: 1,
  data: { invoices: invoices.map((invoice) => ({ id: invoice.id, number: invoice.number, client: invoice.client, amount: formatMoney(invoice.amount), status: invoice.status })) },
  root: {
    type: "Stack", id: "invoices", props: { gap: "md" },
    children: [
      { type: "Text", id: "invoices-intro", children: [overdue.length === 1 ? `One invoice is overdue: ${overdue[0].number} to ${overdue[0].client} for ${formatMoney(overdue[0].amount)}. Here are all of them:` : `${overdue.length} invoices are overdue. Here are all of them:`] },
      {
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

/* ── Composing while typing: the guess on the device (intent and slots) shows at once, the composer fills in the real UI ── */

type Reply = { text: string; spec?: UiSpec };

/** The demo composer, standing in for the model: a sentence → text and a spec; a booking form takes the title the sentence carries. */
function demoCompose(prompt: string, slots: LiveSlots | null): Reply {
  const text = prompt.trim();
  if (/\b(schedule|book|meeting|review|appointment|call)\b|đặt lịch|hẹn|họp/i.test(text)) return { text: "Here is the form. Pick the project, a date and a time, and I'll schedule it.", spec: bookingSpec(slots?.title ?? undefined) };
  if (/\binvoice|overdue|unpaid|bill|hoá đơn|hóa đơn/i.test(text)) return { text: "Here are the studio's invoices.", spec: invoicesSpec() };
  if (/\brevenue|invoiced|chart|month|quarter|doanh thu/i.test(text)) return { text: "Here is what the studio invoiced over the last six months.", spec: revenueSpec() };
  if (/\bdelete|remove|archive|xoá|xóa/i.test(text)) return { text: "That is a destructive change.", spec: confirmSpec() };
  if (/\bbroken|invalid|wrong|lỗi/i.test(text)) return { text: "Here is your week:", spec: brokenSpec() };
  return { text: "", spec: proseSpec() };
}

/** Waits the moment a model would take, unless a keystroke made the answer stale. */
const pause = async (ms: number, signal: AbortSignal) => {
  await new Promise((resolve) => setTimeout(resolve, ms));
  if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" });
};

const skeletonOf = (kind: "form" | "list" | "chart" | "text"): UiSpec => ({
  version: 1,
  root: { type: "Stack", id: `skeleton-${kind}`, props: { gap: "md" }, children: kind === "form" ? [{ $pending: "heading" }, { $pending: "shape" }, { $pending: "shape" }, { $pending: "text" }] : kind === "chart" ? [{ $pending: "heading" }, { $pending: "shape" }] : [{ $pending: "text" }] },
});
/** What the demo's classifier knows: trigger words per intent and the Skeleton to show at once; for the booking intent a template: the real form, pre-filled from the slots the sentence carries. */
const liveIntents = [
  { intent: "booking", words: ["schedule", "book", "meeting", "review", "appointment", "đặt lịch", "hẹn", "họp"], skeleton: (slots: Record<string, unknown> | null) => bookingSpec(typeof slots?.title === "string" ? slots.title : undefined) },
  { intent: "invoices", words: ["invoice", "overdue", "unpaid", "bill", "hoá đơn", "hóa đơn"], skeleton: skeletonOf("list") },
  { intent: "revenue", words: ["revenue", "invoiced", "chart", "quarter", "doanh thu"], skeleton: skeletonOf("chart") },
  { intent: "confirm", words: ["delete", "remove", "archive", "xoá", "xóa"], skeleton: skeletonOf("text") },
];

/** Anything the keyword classifier does not know becomes "free" once there are a few words, at the lowest confidence the
    live composer accepts, so a known intent replaces it the moment its words appear; the composer gets the sentence as it
    is (the model when one is configured). */
type Classifier = ReturnType<typeof keywordClassifier>;
const keywordOrFree = (classify: Classifier): Classifier => (text: string) => {
  const known = classify(text);
  if (known?.intent || text.trim().split(/\s+/).length < 3) return known;
  return { intent: "free", confidence: 0.6, slots: extractSlots(text), skeleton: skeletonOf("text") };
};
/** The classifier on the device: nothing leaves it until an intent is likely. */
const classify = keywordOrFree(keywordClassifier(liveIntents, { slots: extractSlots }));

const fieldDate = (iso: string) => { const [y, m, d] = iso.split("-"); return `${m}/${d}/${y}`; };

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

/** The label of the Button a primary action lives on (its first text child), for the footer. */
function buttonLabel(node: UiNode | undefined, id: string | null): string | null {
  if (!node || typeof node !== "object" || !id) return null;
  if (node.id === id) { const first = node.children?.[0]; return typeof first === "string" ? first : null; }
  for (const child of node.children ?? []) { const found = buttonLabel(child as UiNode, id); if (found) return found; }
  return null;
}

const intentMeta = {
  booking: { label: "Booking", icon: "icon-calendar-line", keep: "keep as booking" },
  invoices: { label: "Invoices", icon: "icon-receipt-line", keep: "keep as invoices" },
  revenue: { label: "Revenue", icon: "icon-bar-chart-01-line", keep: "keep as revenue" },
  confirm: { label: "Confirmation", icon: "icon-trash-line", keep: "keep as confirmation" },
  /** Anything the keyword classifier does not know: the sentence goes to the composer as it is. */
  free: { label: "Zen AI", icon: "icon-zen", keep: "keep this" },
} as const satisfies Record<string, { label: string; icon: IconName; keep: string }>;
const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
type SlotKey = "date" | "time" | "people" | "place";

/** The slots as chips. While guessing every chip opens the form (an empty one reads "Add date"); once the form is shown
    (`interactive` false) only the heard values stay, as plain tags: the form has no field to add the others to. */
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
          // Read-only once the form shows: a Tag (a Chip always does something).
          : <Tag key={item.key} leading={item.icon}>{item.value}</Tag>)
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

const SENTENCE = "Schedule a design review with Gia tomorrow at 4 pm";
/** The sentence as the live composer leaves it once answered (the guess, its slots in the shared state, the composed form):
    what this example opens on, computed at once. In your app the field starts empty. */
function answered(sentence: string) {
  const guess = classify(sentence);
  const slots = (guess?.slots as LiveSlots | null) ?? null;
  const reply = demoCompose(sentence, slots);
  const live: LiveState = { phase: "ready", intent: guess?.intent ?? null, confidence: guess?.confidence ?? 0, pinned: false, slots: guess?.slots ?? null, spec: reply.spec ?? null, skeleton: null, text: sentence, answer: reply.text, error: null };
  return { live, slots, shared: withSlots({}, slots, null) };
}

/** The composer on a phone: the greeting fills the screen and the composer ends the shell's Body, in flow; the card
    rises above the field as the sentence forms and pushes the greeting up, and the screen follows the field, so the
    keyboard would cover nothing. */
export default function ComposedWhileTypingOnAPhone({ catalog, scrollRef = "window" }: {
  /** The catalog the composed UI is rendered with. In your app: `import catalog from "@zen-ds/react/ai-ui/catalog.json"` (the docs load it once and pass it in). Null while it loads: a Skeleton stands where the form goes. */
  catalog: Catalog | null;
  /** What scrolls the screen, so it follows the field as the card above it grows. "window" in your app. */
  scrollRef?: RefObject<HTMLElement | null> | "window";
}) {
  const [opening] = useState(() => answered(SENTENCE));
  const [text, setText] = useState(SENTENCE);
  const [live, setLive] = useState(opening.live);
  const [shared, setShared] = useState(opening.shared);
  const [done, setDone] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [opened, setOpened] = useState(false);
  const composerRef = useRef<LiveComposer | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  // The screen follows the field: as the card above it grows, the end of the screen (where the field is) stays in view.
  const toEnd = () => setTimeout(() => {
    if (scrollRef === "window") shellRef.current?.scrollIntoView({ block: "end" });
    else scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  });

  /** The live composer that follows the field, made on the first pointer or focus inside the example. It first takes in
      the answer already on screen, quietly (nothing re-renders), so Tab, typing and Enter carry on from it. */
  const start = () => {
    if (composerRef.current) return;
    let quiet = true;
    let lastSlots = opening.slots;
    let server: Promise<ServerStatus> | null = null;
    const composer = createLiveComposer({
      classify,
      compose: async (prompt, { intent, slots, signal }) => {
        if (quiet) return { text: opening.live.answer ?? "", spec: opening.live.spec };
        const known = (slots as LiveSlots | null) ?? null;
        const status = await (server ??= readStatus());
        if (intent === "free" && !status.enabled) {
          // Without a model the demo composer cannot build this: say so, and what it can build.
          await pause(400, signal);
          return { text: "", spec: markdownToSpec("The demo composer knows bookings, invoices, revenue and confirmations. With `ANTHROPIC_API_KEY` set before `npm run dev`, Zen AI composes this request too.") };
        }
        if (status.enabled) {
          const remote = await postJson<{ ok: true; text: string; spec: UiSpec | null }>("/ai-ui/compose", { prompt, data: studioData(), state: known ? withSlots({}, known, null) : undefined }, signal);
          if (remote.ok) { setServerError(null); return { text: remote.text, spec: remote.spec }; }
          setServerError(remote.error);
        }
        await pause(400, signal);
        const reply = demoCompose(prompt, known);
        return { text: reply.text, spec: reply.spec ?? null };
      },
      onChange: (state) => {
        if (quiet) return;
        setLive(state);
        toEnd();
        // The slots land in the shared state as they change, so the template and the composed form read them.
        const slots = (state.slots as LiveSlots | null) ?? null;
        if (state.phase === "idle") { lastSlots = null; return; }
        const last = lastSlots;
        if (JSON.stringify(slots) !== JSON.stringify(last)) { lastSlots = slots; setShared((prev) => withSlots(prev, slots, last)); }
      },
    });
    composerRef.current = composer;
    void composer.submit(opening.live.text).then(() => { quiet = false; });
  };

  const preview = live.phase !== "idle" ? live.spec ?? live.skeleton : null;
  const intent = live.intent;
  const meta = intent && intent in intentMeta ? intentMeta[intent as keyof typeof intentMeta] : null;
  // Sure: kept with Tab or answered by the composer; until then the body is a guess (the keyword classifier's confidence is not calibrated enough to decide it).
  const sure = live.pinned || (live.phase === "ready" && Boolean(live.spec));
  const working = live.phase === "skeleton" || live.phase === "composing"; // a template shown and the answer on its way, or an edit of a kept spec
  const showForm = Boolean(preview && (sure || opened || intent !== "booking"));
  const action = preview ? primaryActionOf(preview) : null;
  const actionLabel = action ? buttonLabel(preview?.root, action.id) ?? action.action : null;
  const slots = (live.slots as LiveSlots | null) ?? null;
  const clear = () => { setDone(null); setOpened(false); setShared({}); composerRef.current?.reset(); };
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
  // The card sits over the field (a phone: the keyboard covers nothing, and the preview pushes the greeting up).
  const field = (
    <AiChatField fieldStyle="liquid-glass" placeholder="Ask Zen AI" value={text}
      onValueChange={(next) => { setText(next); composerRef.current?.input(next); }}
      onSubmit={submit}
      onAccept={intent && !live.pinned ? () => { composerRef.current?.accept(); } : undefined}
      onClear={text || preview ? clear : undefined} />
  );
  const listening = !preview && text.trim().length > 0;
  const card = listening ? (
    <Card theme="default" width="fill">
      <Stack direction="row" gap="xs" align="center">
        <Icon name="icon-zen" size={16} />
        <Text textStyle="Body/Small/Medium">Zen AI</Text>
        <Text textStyle="Body/Small/Regular" tone="base" role="status">listening</Text>
      </Stack>
    </Card>
  ) : preview && meta ? (
    <Card theme="default" width="fill">
      <Stack gap="md">
        {/* The guess: a new intent draws a new body. */}
        <Stack gap="sm" key={intent ?? "none"}>
          <Stack direction="row" gap="xs" align="center">
            <Icon name={meta.icon} size={16} />
            <Text textStyle="Body/Small/Medium">{meta.label}</Text>
            {live.pinned
              ? <Text textStyle="Body/Small/Regular" tone="base">kept</Text>
              : working ? <Text textStyle="Body/Small/Regular" tone="base" role="status">composing</Text>
              : sure ? null : <Text textStyle="Body/Small/Regular" tone="base">likely</Text>}
          </Stack>
          {intent === "booking" && slots?.title ? <Heading level={3} textStyle="Heading/4">{slots.title}</Heading> : null}
          {/* The chips are the guess; once the form shows it carries the date and the time, so those two step aside and the slots it has no field for (people, place) stay. */}
          {intent === "booking" ? <SlotChips slots={slots} keys={showForm ? ["people", "place"] : ["date", "time", "people", "place"]} onOpen={() => setOpened(true)} interactive={!showForm} /> : null}
          {showForm ? (catalog ? <AiUi spec={composerBody(preview)} catalog={catalog} state={shared} onStateChange={(next) => setShared(next)} onAction={(call) => { setDone(`${call.name} ${JSON.stringify(call.args)}`); clear(); }} /> : <SkeletonText lines={3} />) : null}
          {serverError ? <Text textStyle="Body/Small/Regular" tone="base">{`The model failed (${serverError}); the demo composer answered.`}</Text> : null}
        </Stack>
        {/* The footer: a phone has no Tab and no Esc, so a "Keep as …" button stands in their place. */}
        <Stack direction="row" gap="md" justify="between" align="center" wrap>
          <Stack direction="row" gap="xs" wrap>{!live.pinned ? <Button level="tertiary" size="sm" onClick={() => composerRef.current?.accept()}>{capitalise(meta.keep)}</Button> : null}</Stack>
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
    <AppShell ref={shellRef} topNavigation={<TopNavigation type="compact-alt" title="Zen AI" scrollRef={scrollRef} />}>
      {/* The greeting fills the free screen; the composer ends the Body, in flow, so the card rising above the field pushes it up. */}
      <Stack direction="row" align="center" style={{ flex: "1 1 auto", minHeight: 0 }}>
        <AiChatBlock greeting={`What do you need, ${firstName}?`}>
          <Text textStyle="Body/Base/Regular" tone="base">Type it: the form takes shape above the field as you go.</Text>
        </AiChatBlock>
      </Stack>
      {/* In flow at the end of the Body, not pinned: a card taller than the screen scrolls. With the Body's own padding,
          the field ends Padding/XSmall above the home indicator. The live composer starts on the first pointer or focus in here. */}
      <Box onPointerDown={start} onFocus={start} style={{ paddingBlockEnd: "max(0px, calc(var(--zen-safe-area-bottom, 0px) + var(--zen-spacing-padding-xsmall, 8px) - var(--zen-spacing-padding-large, 20px)))" }}>
        <Stack gap="md">
          <Stack gap="xs">
            {card}
            {field}
          </Stack>
          {done ? <Text textStyle="Body/Small/Regular">{done}</Text> : null}
        </Stack>
      </Box>
    </AppShell>
  );
}

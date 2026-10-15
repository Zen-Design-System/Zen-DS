// Composing while the person types (the user's decision, 2026-10-15: the UI appears as they type, not after they send).
// A controller for the input field: every keystroke is debounced; a cheap `classify` (on-device or the app's choice)
// names the likely intent and its slots; once it is confident enough the intent's skeleton (or a template pre-filled
// from the slots) shows at once (tier 1) and `compose` is asked for the real UI (tier 2/3) with an AbortSignal, so a
// stale answer never lands; hysteresis keeps the UI from flickering between intents while the sentence is still
// forming. Isomorphic (Node and the browser), only spec.mjs beside it.
//
//   const live = createLiveComposer({ classify, compose, onChange: (state) => render(state) });
//   live.input(text)      on every change of the field
//   live.accept()         Tab: keep the guessed intent (pinned; the sentence may go on changing, the intent stays)
//   live.submit(text)     Enter: compose regardless of confidence
//   live.reset()          Escape, the field was cleared, or the answer was used
//   live.dispose()
//
//   classify(text, { signal }) → { intent, confidence, slots?, skeleton? } | null       (fast, cheap)
//   compose(text, { intent, slots, signal })  → { spec?, text? } | spec | null         (the model, through the server)
//   state = { phase: "idle" | "skeleton" | "composing" | "ready" | "error", intent, confidence, pinned, slots, spec,
//             skeleton, text, answer, error }
//
// The keyboard contract the field follows (AiChatField onAccept / onClear / onSubmit): Tab keeps the guess, Escape
// clears, Enter runs the UI's primary action when one is on screen (`primaryActionOf`, `resolveArgs`), else composes.

import { markerOf, readPath, walkNodes } from "./spec.mjs";

const DEFAULTS = { debounceMs: 300, minConfidence: 0.6, switchMargin: 0.15, stickMs: 800, minLength: 3 };

export function createLiveComposer({ classify, compose, onChange, ...options } = {}) {
  if (typeof classify !== "function" || typeof compose !== "function") throw new TypeError("createLiveComposer needs classify(text) and compose(text, { intent, slots, signal }).");
  const opt = { ...DEFAULTS, ...options };
  let state = idle();
  let timer = null;
  let controller = null;
  let generation = 0;
  let shownAt = 0;
  let disposed = false;

  function idle() { return { phase: "idle", intent: null, confidence: 0, pinned: false, slots: null, spec: null, skeleton: null, text: "", answer: null, error: null }; }
  const emit = (next) => { state = next; onChange?.(state); };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } if (controller) { controller.abort(); controller = null; } };

  async function run(text, { force = false } = {}) {
    const mine = ++generation;
    cancel();
    controller = new AbortController();
    const { signal } = controller;
    let classified = null;
    try { classified = await classify(text, { signal }); } catch (error) { if (mine !== generation || disposed) return; emit({ ...state, phase: "error", error }); return; }
    if (mine !== generation || disposed) return;
    // Pinned (Tab): the intent on screen stays whatever the classifier now thinks; only its slots and the text move.
    const pinned = state.pinned && Boolean(state.intent);
    const confident = pinned || (Boolean(classified?.intent) && (force || classified.confidence >= opt.minConfidence));
    if (!confident && !force) {
      // Not sure yet: what is on screen stays (no flicker), nothing appears that is not likely.
      if (state.phase !== "idle") emit({ ...state, text });
      return;
    }
    const sameIntent = classified?.intent === state.intent;
    const intent = pinned ? state.intent : classified?.intent ?? (force ? state.intent : null);
    const confidence = pinned ? (sameIntent ? classified.confidence : state.confidence) : classified?.confidence ?? 0;
    const switching = Boolean(state.intent && intent !== state.intent);
    // A different intent replaces the one on screen only when it is clearly more likely, or the current one has been
    // shown long enough to be a settled guess that turned out wrong. Enter always wins.
    if (switching && !force && confidence < state.confidence + opt.switchMargin && Date.now() - shownAt < opt.stickMs) return;
    const slots = classified?.slots ?? (pinned ? state.slots : null);
    const keep = !switching && state.spec ? state.spec : null;
    const skeleton = keep ? null : classified?.skeleton ?? null;
    if (!keep) shownAt = Date.now();
    emit({ phase: keep ? "composing" : skeleton ? "skeleton" : "composing", intent, confidence, pinned: state.pinned && !switching, slots, spec: keep, skeleton, text, answer: keep ? state.answer : null, error: null });
    try {
      const result = await compose(text, { intent, slots, signal });
      if (mine !== generation || disposed || signal.aborted) return;
      const spec = result && typeof result === "object" && "root" in result ? result : result?.spec ?? null;
      const answer = result && typeof result === "object" && typeof result.text === "string" ? result.text : null;
      if (spec) shownAt = Date.now();
      emit({ ...state, phase: spec ? "ready" : keep ? "ready" : "idle", spec: spec ?? keep, skeleton: null, answer: answer ?? state.answer ?? null, error: null });
    } catch (error) {
      if (mine !== generation || disposed || signal.aborted || error?.name === "AbortError") return;
      emit({ ...state, phase: "error", error });
    }
  }

  return {
    /** The field changed. Short or empty text clears what is shown (and the pin). */
    input(text) {
      if (disposed) return;
      const value = String(text ?? "");
      if (value.trim().length < opt.minLength) { cancel(); generation++; if (state.phase !== "idle") emit(idle()); return; }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; void run(value); }, opt.debounceMs);
    },
    /** Tab: keep the intent on screen while the sentence goes on. False when there is nothing to keep. */
    accept() {
      if (disposed || !state.intent || state.phase === "idle") return false;
      if (!state.pinned) emit({ ...state, pinned: true });
      return true;
    },
    /** Enter: compose now, whatever the confidence. Resolves when the state settled. */
    async submit(text) { if (disposed) return; await run(String(text ?? ""), { force: true }); },
    reset() { cancel(); generation++; emit(idle()); },
    dispose() { disposed = true; cancel(); },
    get state() { return state; },
  };
}

/**
 * A keyword classifier for the common case (on-device, no network): intents with their trigger words; the confidence
 * grows with the matched word count and the text length, so "sch" says nothing and "schedule a review" is sure.
 * An intent's `skeleton` is a spec, or a function of the slots (a template pre-filled from them); its `slots` is an
 * extractor `(text) => object | null`, `slots` in the options the default for every intent (`extractSlots`).
 *
 *   const classify = keywordClassifier([{ intent: "booking", words: ["schedule", "book", "meeting", "đặt lịch"], skeleton }], { slots: extractSlots });
 */
export function keywordClassifier(intents, { minLength = 4, slots: defaultSlots = null } = {}) {
  const rules = intents.map((entry) => ({ ...entry, words: entry.words.map((w) => w.toLowerCase()) }));
  return (text) => {
    const source = String(text ?? "");
    const value = source.toLowerCase();
    if (value.trim().length < minLength) return null;
    let best = null;
    for (const rule of rules) {
      const hits = rule.words.filter((word) => value.includes(word)).length;
      if (!hits) continue;
      const confidence = Math.min(0.95, 0.55 + 0.25 * hits + Math.min(0.15, value.length / 200));
      if (!best || confidence > best.confidence) {
        const extractor = rule.slots ?? defaultSlots;
        const slots = typeof extractor === "function" ? extractor(source) ?? null : null;
        const skeleton = typeof rule.skeleton === "function" ? rule.skeleton(slots) ?? null : rule.skeleton ?? null;
        best = { intent: rule.intent, confidence, slots, skeleton };
      }
    }
    return best;
  };
}

/* ── slots from the sentence (on-device, English and Vietnamese) ─────────────────────────────────────────────────── */

const B = "(?<![\\p{L}\\d])";
const E = "(?![\\p{L}\\d])";
const re = (source, flags = "u") => new RegExp(source, flags);
const WEEKDAYS_EN = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAYS_VI = { "chủ nhật": 0, "thứ hai": 1, "thứ 2": 1, "thứ ba": 2, "thứ 3": 2, "thứ tư": 3, "thứ 4": 3, "thứ năm": 4, "thứ 5": 4, "thứ sáu": 5, "thứ 6": 5, "thứ bảy": 6, "thứ 7": 6 };
const MONTHS_EN = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => { const next = new Date(d); next.setDate(next.getDate() + n); return next; };
const nextWeekday = (from, day, { after = false } = {}) => { let diff = (day - from.getDay() + 7) % 7; if (diff === 0 && after) diff = 7; return addDays(from, diff); };
const hourOf = (hour, minute, period) => {
  let h = Number(hour), m = Number(minute ?? 0);
  if (!Number.isFinite(h) || h > 23 || m > 59) return null;
  if (period === "pm" || period === "chiều" || period === "tối") { if (h < 12) h += 12; }
  else if (period === "am" || period === "sáng") { if (h === 12) h = 0; }
  else if (period === "trưa") { if (h < 11) h += 12; }
  else if (period === null && h >= 1 && h <= 6) h += 12; // "at 4", "lúc 4": a working hour, not the small hours
  return h > 23 ? null : `${pad(h)}:${pad(m)}`;
};

const TIME_RULES = [
  [re(`${B}(\\d{1,2})[:h](\\d{2})\\s*(am|pm|sáng|trưa|chiều|tối)?${E}`), (m) => hourOf(m[1], m[2], m[3] ?? "none")],
  [re(`${B}(\\d{1,2})\\s*(am|pm)${E}`), (m) => hourOf(m[1], 0, m[2])],
  [re(`${B}(\\d{1,2})\\s*(?:h|g|giờ)\\s*(sáng|trưa|chiều|tối)?${E}`), (m) => hourOf(m[1], 0, m[2] ?? "none")],
  [re(`${B}(?:at|lúc|vào lúc)\\s+(\\d{1,2})(?!\\s*[:h/.-]\\d)(?!\\s*(?:am|pm|h|g|giờ|tháng|days?|ngày))${E}`), (m) => hourOf(m[1], 0, null)],
  [re(`${B}(noon|buổi trưa|midnight|nửa đêm)${E}`), (m) => (/^(noon|buổi trưa)$/.test(m[1]) ? "12:00" : "00:00")],
];

/** Date rules: each returns a Date, or null when the words do not make one. `now` is the reference day. */
const DATE_RULES = [
  [re(`${B}(today|tonight|hôm nay|tối nay|chiều nay|sáng nay)${E}`), (m, now) => now],
  [re(`${B}(tomorrow|ngày mai|sáng mai|chiều mai|tối mai)${E}`), (m, now) => addDays(now, 1)],
  [re(`${B}(the day after tomorrow|day after tomorrow|ngày mốt|ngày kia)${E}`), (m, now) => addDays(now, 2)],
  [re(`${B}(next week|tuần sau|tuần tới)${E}`), (m, now) => nextWeekday(now, 1, { after: true })],
  [re(`${B}in (\\d{1,2}) days?${E}`), (m, now) => addDays(now, Number(m[1]))],
  [re(`${B}(?:(next|this|on|vào)\\s+)?(${WEEKDAYS_EN.join("|")}|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)${E}`), (m, now) => nextWeekday(now, WEEKDAYS_EN.findIndex((d) => d.startsWith(m[2].slice(0, 3))), { after: m[1] === "next" })],
  [re(`${B}(${Object.keys(WEEKDAYS_VI).join("|")})(?:\\s+(tuần sau|tuần tới|tới|sau))?${E}`), (m, now) => nextWeekday(now, WEEKDAYS_VI[m[1]], { after: Boolean(m[2]) })],
  [re(`${B}(\\d{1,2})\\s*(?:tháng|\\/)\\s*(\\d{1,2})(?:[\\/\\s]+(\\d{4}))?${E}`), (m, now, { dayFirst }) => monthDay(now, dayFirst ? m[1] : m[2], dayFirst ? m[2] : m[1], m[3])],
  [re(`${B}${MONTH_RE}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?${E}`), (m, now) => monthDay(now, m[2], MONTHS_EN.indexOf(m[1]) + 1, m[3])],
  [re(`${B}(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH_RE}(?:,?\\s+(\\d{4}))?${E}`), (m, now) => monthDay(now, m[1], MONTHS_EN.indexOf(m[2]) + 1, m[3])],
];
function monthDay(now, day, month, year) {
  const d = Number(day), mo = Number(month);
  if (!(d >= 1 && d <= 31 && mo >= 1 && mo <= 12)) return null;
  const date = new Date(year ? Number(year) : now.getFullYear(), mo - 1, d);
  if (date.getDate() !== d) return null;
  // Without a year, a day already past means the next one.
  return !year && date < startOfDay(now) ? new Date(date.getFullYear() + 1, mo - 1, d) : date;
}

const PEOPLE_RE = re(`${B}(?:with|cùng với|cùng|với)\\s+(@?\\p{Lu}[\\p{L}'-]*(?:\\s+\\p{Lu}[\\p{L}'-]*)*(?:\\s*(?:,|&|and|và)\\s*@?\\p{Lu}[\\p{L}'-]*(?:\\s+\\p{Lu}[\\p{L}'-]*)*)*)`);
const HANDLE_RE = re("(?<![\\p{L}\\d])@([\\p{L}\\d_.-]+)", "gu");
const PLACE_RE = re(`${B}(?:at|in|ở|tại)\\s+(\\p{Lu}[\\p{L}\\d'&.-]*(?:\\s+(?:\\p{Lu}[\\p{L}\\d'&.-]*|\\d+))*)`);
const NOT_A_PLACE = re(`^(?:${WEEKDAYS_EN.join("|")}|(?:${MONTHS_EN.join("|")})[a-z]*|${Object.keys(WEEKDAYS_VI).join("|")}|tháng \\d+)$`, "iu");
const LEAD_RE = re("^(?:please\\s+|hãy\\s+|làm ơn\\s+)?(?:(?:can|could|would) you\\s+)?(?:remind me to|remind me|reminder to|reminder:?|schedule|book|set up|create|add|plan|arrange|note to|i want to|i need to|i'd like to|let's|let me|nhắc (?:tôi|mình|em)|nhắc|đặt lịch|lên lịch|đặt|tạo|thêm|cho tôi|tôi muốn|tôi cần|giúp tôi)\\s+(?:a|an|the|my|some|một|cuộc|buổi)?\\s*", "iu");
const CONNECTOR = "(?:at|on|in|with|for|by|to|and|vào|lúc|với|ở|tại|cho|và|cùng)";

/**
 * The slots a sentence carries, found on the device with no model: `title` (the sentence without its lead-in and
 * without the slots), `date` (ISO yyyy-mm-dd), `time` (HH:MM), `people` (names after with / với, @handles), `place`
 * (a capitalised place after at / in / ở / tại); `spans` says where each came from. English and Vietnamese; a bare
 * hour 1–6 reads as the afternoon; numeric dates are day-first unless `dayFirst: false`. A demo-grade extractor: the
 * product swaps in its own (`keywordClassifier(…, { slots })`) when it needs more.
 */
export function extractSlots(text, { now = new Date(), dayFirst = true } = {}) {
  const source = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!source) return null;
  const lower = source.toLowerCase();
  const spans = [];
  const claim = (slot, match, value) => { if (value === null || value === undefined) return false; spans.push({ slot, text: source.slice(match.index, match.index + match[0].length).trim(), start: match.index, end: match.index + match[0].length, value }); return true; };
  const taken = (match) => spans.some((span) => match.index < span.end && match.index + match[0].length > span.start);

  let time = null;
  for (const [rule, read] of TIME_RULES) { const m = rule.exec(lower); if (m && !taken(m) && claim("time", m, read(m))) { time = read(m); break; } }
  let date = null;
  for (const [rule, read] of DATE_RULES) {
    const m = rule.exec(lower);
    if (!m || taken(m)) continue;
    const value = read(m, now, { dayFirst });
    if (value && claim("date", m, isoDate(value))) { date = isoDate(value); break; }
  }
  let people = null;
  const names = [];
  const withMatch = PEOPLE_RE.exec(source);
  if (withMatch && !taken(withMatch)) { names.push(...withMatch[1].split(/\s*(?:,|&|\band\b|\bvà\b)\s*/u).map((n) => n.replace(/^@/, "").trim()).filter(Boolean)); claim("people", withMatch, names.slice()); }
  for (const m of source.matchAll(HANDLE_RE)) if (!names.includes(m[1])) { names.push(m[1]); if (!taken(m)) claim("people", m, [m[1]]); }
  if (names.length) people = names;
  let place = null;
  const placeMatch = PLACE_RE.exec(source);
  if (placeMatch && !taken(placeMatch) && !NOT_A_PLACE.test(placeMatch[1]) && !names.includes(placeMatch[1])) { place = placeMatch[1]; claim("place", placeMatch, place); }

  // The title: the sentence with the slots and the lead-in ("remind me to", "đặt lịch") taken out.
  let title = source;
  for (const span of [...spans].sort((a, b) => b.start - a.start)) title = `${title.slice(0, span.start)} ${title.slice(span.end)}`;
  title = title.replace(/\s+/g, " ").trim().replace(LEAD_RE, "");
  for (let pass = 0; pass < 3; pass++) title = title.replace(re(`\\s*${B}${CONNECTOR}\\s*$`, "iu"), "").replace(re(`^${CONNECTOR}${E}\\s*`, "iu"), "").trim();
  title = title.replace(/^[\s,.;:!?-]+|[\s,.;:!?-]+$/g, "");
  title = title ? title[0].toUpperCase() + title.slice(1) : null;
  spans.sort((a, b) => a.start - b.start);
  return { title, date, time, people, place, spans };
}

/* ── Enter runs the primary action ───────────────────────────────────────────────────────────────────────────────── */

/**
 * The UI's primary action: the first Button whose `onClick` is an `$action` and whose level is primary or accent (a
 * Button without a level is primary). `{ id, action, args }` or null; the args still carry their markers, see
 * `resolveArgs`.
 */
export function primaryActionOf(spec, { levels = ["primary", "accent"] } = {}) {
  const root = spec?.root ?? spec;
  let found = null;
  walkNodes(root, (node) => {
    if (found) return false;
    const click = node.props?.onClick;
    if (node.type !== "Button" || markerOf(click) !== "action" || !levels.includes(node.props?.level ?? "primary")) return undefined;
    found = { id: typeof node.id === "string" ? node.id : null, action: click.$action, args: click.args ?? null };
    return false;
  });
  return found;
}

/** Action args with their `$state` and `$ref` markers read from the shared state and the data, as the renderer does on a click. */
export function resolveArgs(value, { state = {}, data = {} } = {}) {
  if (Array.isArray(value)) return value.map((item) => resolveArgs(item, { state, data }));
  if (!value || typeof value !== "object") return value;
  switch (markerOf(value)) {
    case "state": return readPath(state, value.$state);
    case "ref": return readPath(data, value.$ref);
    default: return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveArgs(item, { state, data })]));
  }
}

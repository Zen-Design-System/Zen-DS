// Composing while the person types (the user's decision, 2026-10-15: the UI appears as they type, not after they send).
// A controller for the input field: every keystroke is debounced; a cheap `classify` (on-device or the app's choice)
// names the likely intent; once it is confident enough the intent's skeleton shows at once (tier 1) and `compose` is
// asked for the real UI (tier 2/3) with an AbortSignal, so a stale answer never lands; hysteresis keeps the UI from
// flickering between intents while the sentence is still forming. Isomorphic, no imports.
//
//   const live = createLiveComposer({ classify, compose, onChange: (state) => render(state) });
//   live.input(text)      on every change of the field
//   live.submit(text)     Enter: compose regardless of confidence
//   live.reset()          the field was cleared or the answer accepted
//   live.dispose()
//
//   classify(text, { signal }) → { intent, confidence, slots?, skeleton? } | null       (fast, cheap)
//   compose(text, { intent, slots, signal })  → { spec?, text? } | spec | null         (the model, through the server)
//   state = { phase: "idle" | "skeleton" | "composing" | "ready" | "error", intent, confidence, slots, spec, skeleton, text, error }

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

  function idle() { return { phase: "idle", intent: null, confidence: 0, slots: null, spec: null, skeleton: null, text: "", error: null }; }
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
    const confident = Boolean(classified?.intent) && (force || classified.confidence >= opt.minConfidence);
    if (!confident && !force) {
      // Not sure yet: what is on screen stays (no flicker), nothing appears that is not likely.
      if (state.phase !== "idle") emit({ ...state, text });
      return;
    }
    const intent = classified?.intent ?? (force ? state.intent : null);
    const confidence = classified?.confidence ?? 0;
    const switching = Boolean(state.intent && intent !== state.intent);
    // A different intent replaces the one on screen only when it is clearly more likely, or the current one has been
    // shown long enough to be a settled guess that turned out wrong. Enter always wins.
    if (switching && !force && confidence < state.confidence + opt.switchMargin && Date.now() - shownAt < opt.stickMs) return;
    const slots = classified?.slots ?? null;
    const keep = !switching && state.spec ? state.spec : null;
    const skeleton = keep ? null : classified?.skeleton ?? null;
    if (!keep) shownAt = Date.now();
    emit({ phase: keep ? "composing" : skeleton ? "skeleton" : "composing", intent, confidence, slots, spec: keep, skeleton, text, answer: keep ? state.answer : null, error: null });
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
    /** The field changed. Short or empty text clears what is shown. */
    input(text) {
      if (disposed) return;
      const value = String(text ?? "");
      if (value.trim().length < opt.minLength) { cancel(); generation++; if (state.phase !== "idle") emit(idle()); return; }
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; void run(value); }, opt.debounceMs);
    },
    /** Enter: compose now, whatever the confidence. Resolves when the state settled. */
    async submit(text) { if (disposed) return; await run(String(text ?? ""), { force: true }); },
    reset() { cancel(); generation++; emit(idle()); },
    dispose() { disposed = true; cancel(); },
    get state() { return state; },
  };
}

const sameSlots = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * A keyword classifier for the common case (on-device, no network): intents with their trigger words; the confidence
 * grows with the matched word count and the text length, so "sch" says nothing and "schedule a review" is sure.
 *
 *   const classify = keywordClassifier([{ intent: "booking", words: ["schedule", "book", "meeting", "đặt lịch"], skeleton }]);
 */
export function keywordClassifier(intents, { minLength = 4 } = {}) {
  const rules = intents.map((entry) => ({ ...entry, words: entry.words.map((w) => w.toLowerCase()) }));
  return (text) => {
    const value = String(text ?? "").toLowerCase();
    if (value.trim().length < minLength) return null;
    let best = null;
    for (const rule of rules) {
      const hits = rule.words.filter((word) => value.includes(word)).length;
      if (!hits) continue;
      const confidence = Math.min(0.95, 0.55 + 0.25 * hits + Math.min(0.15, value.length / 200));
      if (!best || confidence > best.confidence) best = { intent: rule.intent, confidence, slots: rule.slots?.(value) ?? null, skeleton: rule.skeleton ?? null };
    }
    return best;
  };
}

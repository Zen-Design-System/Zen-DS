// Measures the compose loop (tools/ai-ui/compose.mjs) against a prompt set with a real model, and the keyword
// classifier against the same prompts typed part-way. Four of the five metrics the handoff names:
//   1. intent accuracy on partial input  — the keyword classifier on 25 / 50 / 75 / 100 % of each prompt (no model)
//   2. wrong-UI rate                      — a valid spec that is not what the case expects (kind, components)
//   3. valid-spec rate                    — first attempt, within the retry loop, and per spec attempt
//   4. time to first UI                   — ms from the request to the accepted spec, the pick call included
// The fifth, task completion against plain chat, needs people; the report says so.
//
//   npm run ai-ui:eval                                      # every case once · ANTHROPIC_API_KEY · claude-opus-5-5
//   npm run ai-ui:eval -- --only=booking-en,small-talk --repeat=3 --effort=low --concurrency=3
//   npm run ai-ui:eval -- --classifier-only                 # metric 1 alone, no key needed
//   npm run ai-ui:eval -- --dry                             # the pipeline on a scripted model, no key (the report's shape)
//   --prompts=<file> (default tools/ai-ui/eval/prompts.json) · --model= · --attempts=3 · --pick=false (compose from
//   tier 1 in one call) · --limit=N · --out=<dir> (default .qa/ai-ui-eval)
// Reports: <out>/<stamp>-<model>.json (every reply, spec and problem) and .md (the summary printed at the end).
// Apps run the same loop on their own prompts: import { runEval, renderReport } from "@zen-ds/react/ai-ui/eval".

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { composeEdit, composeUi } from "./compose.mjs";
import { anthropicModel, DEFAULT_MODEL } from "./adapters/anthropic.mjs";
import { keywordClassifier } from "../../src/ai-ui/live.mjs";
import { walkNodes } from "../../src/ai-ui/spec.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

/** The prompt set: { intents, data, cases } (see tools/ai-ui/eval/prompts.json). */
export function loadPromptSet(file = path.join(here, "eval/prompts.json")) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function loadCatalog() {
  return JSON.parse(fs.readFileSync(path.join(root, "docs/ai-ui/catalog.json"), "utf8"));
}

/** The catalog components a spec uses, each once. */
export function typesIn(spec, catalog) {
  const types = new Set();
  walkNodes(spec?.root ?? spec, (node) => { if (catalog.components[node.type]) types.add(node.type); });
  return [...types];
}

/* ── expectations ────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Does an answer match a case's `expect`? `kind`: ui | text | any (default any). `all` / `any` / `none`: component
 * names, checked on a UI answer; a text answer passes them only when `kind` allows text.
 */
export function matches(expect = {}, { kind, types }) {
  const reasons = [];
  const want = expect.kind ?? "any";
  if (want === "ui" && kind !== "ui") reasons.push(`expected a UI, got ${kind}`);
  if (want === "text" && kind !== "text") reasons.push(`expected a text answer, got ${kind}`);
  if (kind === "ui") {
    for (const name of expect.all ?? []) if (!types.includes(name)) reasons.push(`missing ${name}`);
    if (expect.any?.length && !expect.any.some((name) => types.includes(name))) reasons.push(`none of ${expect.any.join(" / ")}`);
    for (const name of expect.none ?? []) if (types.includes(name)) reasons.push(`has ${name}`);
  }
  return { ok: reasons.length === 0, reasons };
}

/** Does a follow-up's outcome match its `expect`? `kind`: one or several of ops | state | spec | text; `ops`: op names, any of. */
export function matchesEdit(expect = {}, { kind, ops = [] }) {
  const kinds = [].concat(expect.kind ?? ["ops", "state", "spec", "text"]);
  const reasons = [];
  if (!kinds.includes(kind)) reasons.push(`expected ${kinds.join(" | ")}, got ${kind}`);
  if (expect.ops?.length && kind === "ops" && !ops.some((op) => expect.ops.includes(op))) reasons.push(`ops ${ops.join(", ")} not among ${expect.ops.join(" / ")}`);
  return { ok: reasons.length === 0, reasons };
}

/* ── one case ────────────────────────────────────────────────────────────────────────────────────────────────────── */

const instrument = (model, calls) => async (call) => {
  const started = performance.now();
  try {
    const reply = await model(call);
    calls.push({ ms: performance.now() - started, chars: call.system.length + call.messages.reduce((n, m) => n + m.content.length, 0), replyChars: String(reply ?? "").length });
    return reply;
  } catch (error) {
    calls.push({ ms: performance.now() - started, error: error.message });
    throw error;
  }
};

/** Token totals over the adapter's `usage` objects. */
export function sumUsage(list) {
  const total = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  for (const u of list) {
    if (!u) continue;
    total.input += u.input_tokens ?? u.input ?? 0;
    total.output += u.output_tokens ?? u.output ?? 0;
    total.cacheRead += u.cache_read_input_tokens ?? u.cacheRead ?? 0;
    total.cacheWrite += u.cache_creation_input_tokens ?? u.cacheWrite ?? 0;
  }
  return total;
}

const roundMs = (calls) => Math.round(calls.reduce((n, c) => n + c.ms, 0));
const problemsOf = (attempts) => attempts.flatMap((a) => (a.validation?.errors ?? []).map((p) => ({ code: p.code, path: p.path, message: p.message })));
const lintOf = (attempts) => attempts.flatMap((a) => (a.lint ?? []).filter((f) => f.severity === "error").map((f) => ({ rule: f.rule, id: f.id ?? null, message: f.message })));

/**
 * Runs one case: composeUi, then its follow-ups in a chain on the UI it produced.
 * `makeModel({ onUsage })` returns the model function for one case (so usage lands on the right record).
 */
export async function runCase(entry, { catalog, makeModel, data, maxAttempts = 3, pick = true, chrome = false, experimental = false }) {
  const calls = [];
  const usage = [];
  const model = instrument(makeModel({ onUsage: (u) => usage.push(u) }), calls);
  const record = {
    id: entry.id, prompt: entry.prompt, intent: entry.intent ?? null, ok: false, kind: "none", validFirst: false, attempts: 0,
    specAttempts: 0, specValid: 0, problems: [], lint: [], picked: [], components: [], expected: { ok: false, reasons: [] },
    msToUi: null, msTotal: 0, calls: 0, usage: sumUsage([]), edits: [], text: "", spec: null, replies: [],
  };
  const started = performance.now();
  try {
    const result = await composeUi({
      prompt: entry.prompt, catalog, model, data: { ...(data ?? {}), ...(entry.data ?? {}) }, state: entry.state,
      components: entry.components, maxAttempts, pick, chrome, experimental,
    });
    record.ok = result.ok;
    record.text = result.text;
    record.spec = result.spec;
    record.picked = result.components;
    record.kind = result.ok ? (result.spec ? "ui" : "text") : "none";
    record.attempts = result.attempts.length;
    record.validFirst = Boolean(result.attempts[0]?.ok);
    record.replies = result.attempts.map((a) => a.reply);
    for (const attempt of result.attempts) if (attempt.spec) { record.specAttempts += 1; if (attempt.ok) record.specValid += 1; }
    record.problems = problemsOf(result.attempts);
    record.lint = lintOf(result.attempts);
    record.components = result.spec ? typesIn(result.spec, catalog) : [];
    record.expected = matches(entry.expect, { kind: record.kind, types: record.components });
    if (result.ok && result.spec) {
      // The accepting call: the pick (when there was one) plus every compose attempt.
      const accepting = (pick && !entry.components?.length ? 1 : 0) + result.attempts.length;
      record.msToUi = roundMs(calls.slice(0, accepting));
    }

    let current = result.spec;
    let state = entry.state;
    const history = [{ role: "user", content: entry.prompt }, { role: "assistant", content: result.text || "(the UI above)" }];
    for (const edit of entry.edits ?? []) {
      if (!result.ok || !current) { record.edits.push({ id: edit.id, prompt: edit.prompt, skipped: "no UI to edit" }); continue; }
      const editCalls = [];
      const editUsage = [];
      const editModel = instrument(makeModel({ onUsage: (u) => editUsage.push(u) }), editCalls);
      try {
        const outcome = await composeEdit({ prompt: edit.prompt, spec: current, state, catalog, model: editModel, history, maxAttempts, chrome, experimental });
        const ops = (outcome.ops ?? []).map((o) => o.op);
        record.edits.push({
          id: edit.id, prompt: edit.prompt, ok: outcome.ok, kind: outcome.kind, ops, text: outcome.text, attempts: outcome.attempts.length,
          validFirst: Boolean(outcome.attempts[0]?.ok), problems: problemsOf(outcome.attempts), lint: lintOf(outcome.attempts),
          expected: matchesEdit(edit.expect, { kind: outcome.kind, ops }), ms: roundMs(editCalls), usage: sumUsage(editUsage),
          replies: outcome.attempts.map((a) => a.reply),
        });
        if (outcome.ok) {
          current = outcome.spec;
          if (outcome.state) state = { ...(state ?? {}), ...outcome.state };
          history.push({ role: "user", content: edit.prompt }, { role: "assistant", content: outcome.text || "(done)" });
        }
      } catch (error) {
        record.edits.push({ id: edit.id, prompt: edit.prompt, ok: false, kind: "error", ops: [], error: error.message, attempts: 0, validFirst: false, problems: [], lint: [], expected: { ok: false, reasons: [error.message] }, ms: roundMs(editCalls), usage: sumUsage(editUsage), replies: [] });
      }
      calls.push(...editCalls);
      usage.push(...editUsage);
    }
  } catch (error) {
    record.kind = "error";
    record.error = error.message;
    record.expected = { ok: false, reasons: [error.message] };
  }
  record.msTotal = Math.round(performance.now() - started);
  record.calls = calls.length;
  record.usage = sumUsage(usage);
  return record;
}

/* ── the classifier on partial input (no model) ──────────────────────────────────────────────────────────────────── */

/**
 * Metric 1: for every case with an `intent` (a name, or null for "no intent"), the keyword classifier sees the first
 * 25 / 50 / 75 / 100 % of the prompt's words; a positive case counts when the intent is right and confident, a null case
 * when nothing is confident. `firstConfidentAt` per case: the fraction at which the UI would first appear.
 */
export function classifierMetric(cases, intents = [], { fractions = [0.25, 0.5, 0.75, 1], minConfidence = 0.6 } = {}) {
  const classify = keywordClassifier(intents);
  const rows = fractions.map((fraction) => ({ fraction, correct: 0, of: 0, falsePositives: 0, misses: 0 }));
  const details = [];
  for (const entry of cases) {
    if (entry.intent === undefined) continue;
    const words = String(entry.prompt).trim().split(/\s+/);
    const detail = { id: entry.id, intent: entry.intent, firstConfidentAt: null, guesses: [] };
    for (const row of rows) {
      const text = words.slice(0, Math.max(1, Math.round(words.length * row.fraction))).join(" ");
      const guess = classify(text);
      const confident = Boolean(guess?.intent) && guess.confidence >= minConfidence;
      detail.guesses.push({ fraction: row.fraction, intent: confident ? guess.intent : null, confidence: guess?.confidence ?? 0 });
      row.of += 1;
      if (entry.intent) {
        if (confident && guess.intent === entry.intent) { row.correct += 1; detail.firstConfidentAt ??= row.fraction; }
        else if (confident) row.falsePositives += 1;
        else row.misses += 1;
      } else if (!confident) row.correct += 1;
      else row.falsePositives += 1;
    }
    details.push(detail);
  }
  return { fractions: rows, minConfidence, details, positives: cases.filter((c) => c.intent).length, negatives: cases.filter((c) => c.intent === null).length };
}

/* ── the run and its summary ─────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Runs the prompt set. Options: `only` (case ids), `limit`, `repeat` (runs per case), `concurrency` (cases in flight,
 * default 2), `maxAttempts`, `pick`, `chrome`, `experimental`, `onRecord(record, index, total)`.
 * @returns {Promise<{ records: object[], classifier: object, summary: object }>}
 */
export async function runEval(promptSet, { catalog, makeModel, only, limit, repeat = 1, concurrency = 2, maxAttempts = 3, pick = true, chrome = false, experimental = false, onRecord } = {}) {
  let cases = promptSet.cases ?? [];
  if (only?.length) cases = cases.filter((entry) => only.includes(entry.id));
  if (limit) cases = cases.slice(0, Number(limit));
  const jobs = [];
  for (let run = 0; run < Math.max(1, repeat); run++) for (const entry of cases) jobs.push({ entry, run });
  const records = new Array(jobs.length);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const index = next++;
      const { entry, run } = jobs[index];
      const record = await runCase(entry, { catalog, makeModel, data: promptSet.data, maxAttempts, pick, chrome, experimental });
      record.run = run;
      records[index] = record;
      onRecord?.(record, index, jobs.length);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length || 1)) }, worker));
  const classifier = classifierMetric(cases, promptSet.intents);
  return { records, classifier, summary: summarize(records, classifier) };
}

const tally = (items, key) => {
  const counts = new Map();
  for (const item of items) counts.set(item[key], (counts.get(item[key]) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ [key]: name, count }));
};

/** The numbers of a run; `records` as runEval returns them (holes allowed). */
export function summarize(records, classifier = classifierMetric([], [])) {
  const done = records.filter(Boolean);
  const n = done.length;
  const okRecords = done.filter((r) => r.ok);
  const times = done.map((r) => r.msToUi).filter((ms) => ms != null).sort((a, b) => a - b);
  const quantile = (p) => (times.length ? times[Math.min(times.length - 1, Math.floor(p * (times.length - 1)))] : null);
  const edits = done.flatMap((r) => r.edits.filter((e) => !e.skipped));
  const usage = sumUsage(done.map((r) => r.usage));
  return {
    cases: n,
    ok: okRecords.length,
    errors: done.filter((r) => r.kind === "error").length,
    validFirst: { n: done.filter((r) => r.validFirst).length, of: n },
    validFinal: { n: okRecords.length, of: n },
    specAttempts: { valid: done.reduce((s, r) => s + r.specValid, 0), of: done.reduce((s, r) => s + r.specAttempts, 0) },
    wrongUi: { n: okRecords.filter((r) => !r.expected.ok).length, of: okRecords.length },
    textAnswers: done.filter((r) => r.kind === "text").length,
    attemptsMean: n ? Number((done.reduce((s, r) => s + r.attempts, 0) / n).toFixed(2)) : 0,
    problems: tally(done.flatMap((r) => r.problems), "code"),
    lint: tally(done.flatMap((r) => r.lint), "rule"),
    msToUi: { median: quantile(0.5), p90: quantile(0.9), max: times.at(-1) ?? null, n: times.length },
    msTotal: n ? Math.round(done.reduce((s, r) => s + r.msTotal, 0) / n) : 0,
    usage: { ...usage, calls: done.reduce((s, r) => s + r.calls, 0) },
    edits: { n: edits.length, ok: edits.filter((e) => e.ok).length, expected: edits.filter((e) => e.expected?.ok).length, validFirst: edits.filter((e) => e.validFirst).length },
    classifier: { minConfidence: classifier.minConfidence, fractions: classifier.fractions, positives: classifier.positives, negatives: classifier.negatives },
    notMeasured: ["task completion against plain chat (needs people)"],
  };
}

/* ── the report ──────────────────────────────────────────────────────────────────────────────────────────────────── */

const pct = (a, b) => (b ? `${a}/${b} (${Math.round((100 * a) / b)}%)` : "–");
const sec = (ms) => (ms == null ? "–" : `${(ms / 1000).toFixed(1)} s`);
const k = (count) => (count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count));
const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

/** The Markdown summary of a run. */
export function renderReport({ summary, records, classifier }, { title = "AI UI eval", model = "?", effort = "", stamp = new Date().toISOString() } = {}) {
  const s = summary;
  const lines = [
    `# ${title} — ${stamp}`, "",
    `Model ${model}${effort ? ` · effort ${effort}` : ""} · ${s.cases} case run(s) · ${s.usage.calls} model call(s)${s.errors ? ` · ${s.errors} error(s)` : ""}`, "",
    "| Metric | Value |", "|---|---|",
    `| Valid spec, first attempt | ${pct(s.validFirst.n, s.validFirst.of)} |`,
    `| Valid within the retry loop | ${pct(s.validFinal.n, s.validFinal.of)} |`,
    `| Spec attempts accepted | ${pct(s.specAttempts.valid, s.specAttempts.of)} |`,
    `| Wrong UI (valid, not what the case expects) | ${pct(s.wrongUi.n, s.wrongUi.of)} |`,
    `| Text answers | ${s.textAnswers} |`,
    `| Attempts per case | ${s.attemptsMean} |`,
    `| Time to first UI | median ${sec(s.msToUi.median)} · p90 ${sec(s.msToUi.p90)} · max ${sec(s.msToUi.max)} (${s.msToUi.n} UI) |`,
    `| Tokens | in ${k(s.usage.input)} · cache read ${k(s.usage.cacheRead)} · cache write ${k(s.usage.cacheWrite)} · out ${k(s.usage.output)} |`,
    `| Follow-up edits | right kind ${pct(s.edits.expected, s.edits.n)} · applied clean ${pct(s.edits.ok, s.edits.n)} · first try ${pct(s.edits.validFirst, s.edits.n)} |`,
    `| Intent on partial input (keyword classifier ≥ ${s.classifier.minConfidence}) | ${s.classifier.fractions.map((r) => `${Math.round(r.fraction * 100)}%: ${pct(r.correct, r.of)}`).join(" · ")} (${s.classifier.positives} with an intent, ${s.classifier.negatives} without) |`,
    `| Not measured here | ${s.notMeasured.join("; ")} |`, "",
  ];
  if (s.problems.length) lines.push("## Problems the loop sent back", "", "| Code | Count |", "|---|---|", ...s.problems.map((p) => `| ${p.code} | ${p.count} |`), "");
  if (s.lint.length) lines.push("## Harness findings on specs", "", "| Rule | Count |", "|---|---|", ...s.lint.map((p) => `| ${p.rule} | ${p.count} |`), "");
  const done = records.filter(Boolean);
  lines.push("## Cases", "", "| Case | Result | Attempts | Components | To UI | As expected |", "|---|---|---|---|---|---|");
  for (const r of done) lines.push(`| ${r.id}${r.run ? ` #${r.run + 1}` : ""} | ${r.kind}${r.ok ? "" : " ✗"} | ${r.attempts} | ${cell(r.components.join(", ") || "–")} | ${sec(r.msToUi)} | ${r.expected.ok ? "yes" : cell(r.expected.reasons.join("; "))} |`);
  const edits = done.flatMap((r) => r.edits.map((e) => ({ ...e, caseId: r.id })));
  if (edits.length) {
    lines.push("", "## Follow-ups", "", "| Case | Edit | Result | Ops | As expected |", "|---|---|---|---|---|");
    for (const e of edits) lines.push(`| ${e.caseId} | ${e.id} | ${e.skipped ?? `${e.kind}${e.ok ? "" : " ✗"}`} | ${cell((e.ops ?? []).join(", ") || "–")} | ${e.skipped ? "–" : e.expected.ok ? "yes" : cell(e.expected.reasons.join("; "))} |`);
  }
  const detail = classifier?.details?.filter((d) => d.intent) ?? [];
  if (detail.length) {
    lines.push("", "## Intent while typing", "", "| Case | Intent | First confident at |", "|---|---|---|");
    for (const d of detail) lines.push(`| ${d.id} | ${d.intent} | ${d.firstConfidentAt == null ? "never" : `${Math.round(d.firstConfidentAt * 100)}% of the prompt`} |`);
  }
  return `${lines.join("\n")}\n`;
}

/* ── a scripted model for --dry ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * Answers like a model would, from the booking fixture: picks four components, sends one broken spec first (the loop's
 * feedback round), answers "thanks" / "what can you do" with text, and edits with ops or a state change. Nothing is
 * sent anywhere; `--dry` shows the pipeline and the report without a key.
 */
export function dryModel() {
  const booking = JSON.parse(fs.readFileSync(path.join(here, "fixtures/booking.json"), "utf8"));
  const form = (root) => JSON.stringify({ text: "Here is the form.", spec: { root } });
  let brokenOnce = false;
  return async ({ system, messages }) => {
    const last = messages.at(-1).content;
    if (/Which components will the UI/.test(last)) return '["SelectField", "DateField", "ChipGroup", "Button"]';
    if (/# Editing the UI on screen/.test(system)) {
      if (/accent/i.test(last)) return JSON.stringify({ text: "Done.", ops: [{ op: "setProp", id: "book", name: "level", value: "accent" }] });
      if (/4 pm/i.test(last)) return JSON.stringify({ text: "Set to 16:00.", state: { when: { slot: "16:00" } } });
      if (/notes/i.test(last)) return JSON.stringify({ text: "Added a notes field.", ops: [{ op: "insertChild", parent: "root", index: 4, node: { type: "TextAreaField", id: "notes", props: { label: "Notes" } } }] });
      return JSON.stringify({ text: "Okay." });
    }
    if (/Request: (Thanks|What can you do)/.test(last)) return JSON.stringify({ text: "Happy to help: ask for a booking, your invoices or the revenue." });
    if (/The spec was rejected/.test(last)) return form(booking.root);
    if (!brokenOnce) {
      brokenOnce = true;
      return form({ ...booking.root, children: [{ type: "SelectFeild", props: { label: "Project" } }, ...booking.root.children.slice(1)] });
    }
    return form(booking.root);
  };
}

/* ── CLI ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */

function parseArgs(argv) {
  const args = { _: [] };
  for (const arg of argv) {
    if (!arg.startsWith("--")) { args._.push(arg); continue; }
    const [key, value] = arg.slice(2).split(/=(.*)/s);
    args[key] = value === undefined ? true : value;
  }
  return args;
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const promptSet = loadPromptSet(args.prompts ? path.resolve(String(args.prompts)) : undefined);
  const catalog = loadCatalog();
  const only = args.only ? String(args.only).split(",").map((s) => s.trim()).filter(Boolean) : undefined;
  const cases = only ? promptSet.cases.filter((entry) => only.includes(entry.id)) : promptSet.cases;
  const outDir = path.resolve(args.out ? String(args.out) : path.join(root, ".qa/ai-ui-eval"));
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  fs.mkdirSync(outDir, { recursive: true });

  if (args["classifier-only"]) {
    const classifier = classifierMetric(cases, promptSet.intents);
    console.log(`AI UI eval · classifier on partial input · ${classifier.positives} case(s) with an intent, ${classifier.negatives} without`);
    for (const row of classifier.fractions) console.log(`  ${String(Math.round(row.fraction * 100)).padStart(3)}% of the prompt: ${pct(row.correct, row.of)} right · ${row.falsePositives} false positive(s) · ${row.misses} miss(es)`);
    for (const d of classifier.details.filter((x) => x.intent)) console.log(`  ${d.id.padEnd(22)} ${d.intent.padEnd(10)} first confident at ${d.firstConfidentAt == null ? "never" : `${Math.round(d.firstConfidentAt * 100)}%`}`);
    const file = path.join(outDir, `${stamp}-classifier.json`);
    fs.writeFileSync(file, JSON.stringify({ stamp, classifier }, null, 2));
    console.log(`Report: ${file}`);
    return classifier.fractions.at(-1).correct === classifier.fractions.at(-1).of ? 0 : 1;
  }

  const effort = String(args.effort ?? process.env.ZEN_AI_EFFORT ?? "medium");
  let makeModel;
  let modelName;
  if (args.dry) {
    const model = dryModel();
    makeModel = () => model;
    modelName = "dry";
  } else {
    if (!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ZEN_AI_UI_MODEL === "on")) {
      console.error("No ANTHROPIC_API_KEY (or ANTHROPIC_AUTH_TOKEN) in the environment. Set one, or run --dry (scripted model) or --classifier-only.");
      return 2;
    }
    modelName = String(args.model ?? process.env.ZEN_AI_MODEL ?? DEFAULT_MODEL);
    const sdk = await import("@anthropic-ai/sdk");
    const client = new (sdk.default ?? sdk.Anthropic)({ maxRetries: 4 });
    makeModel = ({ onUsage }) => anthropicModel({ model: modelName, effort, client, onUsage });
  }
  const options = { only, limit: args.limit ? Number(args.limit) : undefined, repeat: Number(args.repeat ?? 1), concurrency: Number(args.concurrency ?? 2), maxAttempts: Number(args.attempts ?? 3), pick: args.pick !== "false" };
  console.log(`AI UI eval · ${cases.length} case(s) × ${options.repeat} · model ${modelName}${args.dry ? "" : ` · effort ${effort}`} · ${options.concurrency} in flight · ${options.maxAttempts} attempt(s)`);
  const result = await runEval(promptSet, {
    catalog, makeModel, ...options,
    onRecord: (r, i, total) => console.log(`  ${String(i + 1).padStart(3)}/${total} ${r.id.padEnd(22)} ${r.kind.padEnd(5)} ${r.ok ? "✓" : "✗"} ${r.attempts} attempt(s)${r.msToUi != null ? ` · ${sec(r.msToUi)} to UI` : ""}${r.expected.ok ? "" : ` · ${r.expected.reasons.join("; ")}`}${r.error ? ` · ${r.error}` : ""}`),
  });
  const report = renderReport(result, { model: modelName, effort: args.dry ? "" : effort, stamp });
  const base = path.join(outDir, `${stamp}-${modelName.replace(/[^a-z0-9.-]+/gi, "_")}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify({ stamp, model: modelName, effort: args.dry ? null : effort, options, summary: result.summary, classifier: result.classifier, records: result.records }, null, 2));
  fs.writeFileSync(`${base}.md`, report);
  console.log(`\n${report}`);
  console.log(`Report: ${base}.md (+ .json with every reply)`);
  return result.summary.errors ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((code) => { process.exitCode = code; }, (error) => { console.error(error); process.exitCode = 1; });
}

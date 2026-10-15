// The compose loop (docs/ai-ui/README.md "Composing with a model"): a prompt → the model → a spec → validateSpec +
// lintSpec → the problems go back to the model until the spec is clean or the attempts run out. Provider-agnostic: the
// app passes `model`, a function that takes { system, messages } and returns the reply text. Node only (the lint runs
// the usage harness from disk); run it where the model is called, before the spec reaches the renderer.
//
//   import { composeUi, composeEdit, buildSystemPrompt } from "@zen-ds/react/ai-ui/compose";
//   const result = await composeUi({ prompt, catalog, model, data: { slots } });
//   result.ok ? render(result.spec) : fallback(result.attempts.at(-1))
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyOps } from "../../src/ai-ui/ops.mjs";
import { assignIds, nodeIds } from "../../src/ai-ui/spec.mjs";
import { validateSpec } from "../../src/ai-ui/validate.mjs";
import { compactDef, compactProps, defsOf } from "./compact.mjs";
import { lintSpec } from "./lint.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
let rulesText = null;
/** docs/ai-ui/composer-rules.md (ships with the package), once. */
export function composerRules() {
  if (rulesText === null) { try { rulesText = fs.readFileSync(path.join(here, "../../docs/ai-ui/composer-rules.md"), "utf8"); } catch { rulesText = ""; } }
  return rulesText;
}

/* ── the prompt, in two tiers ────────────────────────────────────────────────────────────────────────────────────── */

const usable = (catalog, { chrome = false, experimental = false } = {}) => Object.values(catalog.components).filter((c) => (chrome || !c.chrome) && (experimental || c.status !== "experimental"));

/** Tier 1: every usable component in one line (name, purpose and, unless `props: false`, its prop names), to choose from. */
export function tier1(catalog, { props = true, ...options } = {}) {
  return usable(catalog, options).map((c) => `- ${c.name}: ${c.purpose || c.description || ""}${props ? ` (props: ${Object.keys(c.props).join(", ")})` : ""}`).join("\n");
}

/** Always available for structure, in brief (props without descriptions, no Do / Don't). */
export const STRUCTURE = ["Stack", "Text", "Heading", "Button"];

/**
 * Tier 2: the chosen components in full (props with types, defaults and descriptions, shared types, bindings, Do /
 * Don't); the ones in `brief` with their props only.
 */
export function tier2(catalog, names, { brief = [] } = {}) {
  const seen = new Set();
  const blocks = [];
  const short = new Set(brief);
  for (const name of names) {
    const entry = catalog.components[name];
    if (!entry || seen.has(name)) continue;
    seen.add(name);
    const full = !short.has(name);
    const guideline = full ? catalog.guidelines?.[entry.slug] : null;
    const lines = [`## ${entry.name}`, entry.purpose, ...(full && entry.use.length ? ["Use for: " + entry.use.join(" · ")] : []), ...(full && entry.avoid.length ? ["Not for: " + entry.avoid.join(" · ")] : []), "Props:", ...compactProps(entry, catalog, { descriptions: full }).map((line) => `  ${line}`)];
    const defs = defsOf(entry, catalog);
    if (defs.length) lines.push("Types:", ...defs.map((def) => `  ${compactDef(def, catalog)}`));
    if (entry.bindings.length) lines.push(`Bound to state when given { "$state" }: ${entry.bindings.map((b) => `${b.prop} ⇄ ${b.handler}`).join(", ")}`);
    if (entry.requiredActions.length) lines.push(`Handlers the app receives even when you omit them: ${entry.requiredActions.join(", ")}`);
    if (guideline?.do?.length) lines.push("Do:", ...guideline.do.map((d) => `  - ${d}`));
    if (guideline?.dont?.length) lines.push("Don't:", ...guideline.dont.map((d) => `  - ${d}`));
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}

/**
 * The system prompt of the composing model: the rules, then tier 1 (to choose) or tier 2 (the chosen components).
 * @param {object} catalog
 * @param {{ components?: string[], chrome?: boolean, experimental?: boolean, rules?: string }} [options]
 */
export function buildSystemPrompt(catalog, { components, chrome = false, experimental = false, rules = composerRules() } = {}) {
  const parts = [rules.trim()];
  if (components?.length) parts.push("# The components for this answer\n\nOnly these (Stack, Text, Heading and Button are always there for structure):\n\n" + tier2(catalog, [...new Set([...components, ...STRUCTURE])], { brief: STRUCTURE.filter((name) => !components.includes(name)) }));
  else parts.push("# The catalog (tier 1)\n\n" + tier1(catalog, { chrome, experimental }));
  parts.push('# Output\n\nAnswer with one JSON object only: { "text": "<one or two sentences shown above the UI>", "spec": { "version": 1, "root": <node>, "data"?: {…} } }. No Markdown fences, no prose outside the JSON. If no UI is called for, answer { "text": "<the answer>" } with no spec.');
  return parts.join("\n\n");
}

/* ── the model's reply ───────────────────────────────────────────────────────────────────────────────────────────── */

/** The first JSON object or array in a reply (Markdown fences and prose around it are ignored); null when none parses. */
export function extractJson(text) {
  const source = String(text ?? "");
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(source);
  const candidates = [fenced?.[1], source];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const start = candidate.search(/[[{]/);
    if (start < 0) continue;
    let depth = 0, quote = false;
    for (let index = start; index < candidate.length; index++) {
      const char = candidate[index];
      if (quote) { if (char === "\\") index++; else if (char === '"') quote = false; continue; }
      if (char === '"') quote = true;
      else if (char === "{" || char === "[") depth++;
      else if (char === "}" || char === "]") { depth--; if (depth === 0) { try { return JSON.parse(candidate.slice(start, index + 1)); } catch { break; } } }
    }
  }
  return null;
}

/** The message that sends a rejected spec back: every problem with its path and hint, then the harness findings by node id. */
export function feedbackFor({ validation, lint = [] }) {
  const lines = ["The spec was rejected. Fix every item and answer again with the whole JSON object."];
  validation.errors.forEach((p, i) => lines.push(`${i + 1}. [${p.code}] ${p.path}: ${p.message}${p.hint ? ` ${p.hint}` : ""}`));
  validation.warnings.forEach((p) => lines.push(`- (warning) [${p.code}] ${p.path}: ${p.message}${p.hint ? ` ${p.hint}` : ""}`));
  lint.filter((f) => f.severity === "error").forEach((f, i) => lines.push(`${validation.errors.length + i + 1}. [${f.rule}] node ${f.id ?? "?"} <${f.tag}>: ${f.message}`));
  lint.filter((f) => f.severity === "warn").forEach((f) => lines.push(`- (warning) [${f.rule}] node ${f.id ?? "?"} <${f.tag}>: ${f.message}`));
  return lines.join("\n");
}

/** Validation and lint of a candidate spec, as the loop judges it. */
export function judge(spec, catalog, { chrome = false, experimental = false, lint = true } = {}) {
  const validation = validateSpec(spec, catalog, { chrome, experimental });
  const findings = validation.ok && lint ? lintSpec(spec, catalog) : [];
  return { ok: validation.ok && !findings.some((f) => f.severity === "error"), validation, lint: findings };
}

const describeData = (data) => {
  if (!data || typeof data !== "object") return "";
  const sample = (value, depth = 0) => Array.isArray(value) ? (value.length ? `[${sample(value[0], depth + 1)}, … ${value.length} items]` : "[]") : value && typeof value === "object" && depth < 3 ? `{ ${Object.entries(value).map(([k, v]) => `${k}: ${sample(v, depth + 1)}`).join(", ")} }` : JSON.stringify(value);
  return Object.entries(data).map(([key, value]) => `- data.${key}: ${sample(value)}`).join("\n");
};

/* ── compose ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * @param {{
 *   prompt: string, catalog: object, model: (call: { system: string, messages: { role: "user" | "assistant", content: string }[] }) => Promise<string>,
 *   data?: object, state?: object, history?: { role: "user" | "assistant", content: string }[], components?: string[],
 *   pick?: boolean, maxAttempts?: number, chrome?: boolean, experimental?: boolean, lint?: boolean, maxPick?: number,
 * }} input
 *   `data`: what the app fetched (the spec reads it with $ref; its shape is described to the model, never its values
 *   invented). `components`: skip the picking step with these. `pick`: with no `components`, ask the model to pick from
 *   tier 1 first (default true; false sends tier 1 and lets it compose in one go).
 * @returns {Promise<{ ok: boolean, text: string, spec: object | null, components: string[], attempts: { reply: string, text: string, spec: object | null, ok: boolean, validation: object | null, lint: object[] }[], messages: object[] }>}
 */
export async function composeUi({ prompt, catalog, model, data, state, history = [], components, pick = true, maxAttempts = 3, chrome = false, experimental = false, lint = true, maxPick = 8 }) {
  if (typeof model !== "function") throw new TypeError("composeUi needs `model`: ({ system, messages }) => Promise<string>.");
  let chosen = components?.filter((name) => catalog.components[name]) ?? [];
  const context = [describeData(data) ? `Data the app has (read it with { "$ref" }):\n${describeData(data)}` : "", state && Object.keys(state).length ? `Shared state now: ${JSON.stringify(state)}` : ""].filter(Boolean).join("\n\n");
  if (!chosen.length && pick) {
    const reply = await model({ system: buildSystemPrompt(catalog, { chrome, experimental }).replace(/# Output[\s\S]*$/, ""), messages: [...history, { role: "user", content: `${context ? `${context}\n\n` : ""}Request: ${prompt}\n\nWhich components will the UI for this request need? Answer with a JSON array of at most ${maxPick} component names from the catalog, nothing else. Answer [] if no UI is called for.` }] });
    const picked = extractJson(reply);
    chosen = Array.isArray(picked) ? picked.filter((name) => typeof name === "string" && catalog.components[name]).slice(0, maxPick) : [];
  }
  const system = buildSystemPrompt(catalog, { components: chosen, chrome, experimental });
  const messages = [...history, { role: "user", content: `${context ? `${context}\n\n` : ""}Request: ${prompt}` }];
  const attempts = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const reply = await model({ system, messages });
    const parsed = extractJson(reply);
    const text = typeof parsed?.text === "string" ? parsed.text : "";
    const spec = parsed && typeof parsed === "object" && parsed.spec && typeof parsed.spec === "object" ? assignIds({ version: 1, ...parsed.spec }) : parsed && typeof parsed === "object" && parsed.root ? assignIds({ version: 1, ...parsed }) : null;
    if (!spec) {
      const record = { reply, text, spec: null, ok: Boolean(parsed && typeof parsed === "object" && "text" in parsed), validation: null, lint: [] };
      attempts.push(record);
      if (record.ok) return { ok: true, text, spec: null, components: chosen, attempts, messages };
      messages.push({ role: "assistant", content: reply }, { role: "user", content: 'That was not the JSON object asked for. Answer with { "text": "…", "spec": { "version": 1, "root": … } } only.' });
      continue;
    }
    const verdict = judge(spec, catalog, { chrome, experimental, lint });
    attempts.push({ reply, text, spec, ok: verdict.ok, validation: verdict.validation, lint: verdict.lint });
    if (verdict.ok) return { ok: true, text, spec, components: chosen, attempts, messages };
    messages.push({ role: "assistant", content: reply }, { role: "user", content: feedbackFor(verdict) });
  }
  const last = attempts.at(-1);
  return { ok: false, text: last?.text ?? "", spec: last?.spec ?? null, components: chosen, attempts, messages };
}

/* ── edit ────────────────────────────────────────────────────────────────────────────────────────────────────────── */

const OPS_REFERENCE = `# Editing the UI on screen

Answer with one JSON object only. Choose the smallest change:
- { "text": "…", "ops": [ … ] } edits the spec in place. Ops (by node id): { "op": "setProp", "id", "name", "value" } ·
  { "op": "removeProp", "id", "name" } · { "op": "setText", "id", "text" } · { "op": "setChildren", "id", "children" } ·
  { "op": "insertChild", "parent", "index"?, "node" } · { "op": "removeNode", "id" } · { "op": "replaceNode", "id", "node" } ·
  { "op": "moveNode", "id", "parent", "index"? }.
- { "text": "…", "state": { "<path>": <value> } } sets shared state (what a bound control shows).
- { "text": "…", "spec": { … } } replaces the UI when an edit would not do.
- { "text": "…" } when no change is needed.`;

/**
 * A follow-up on a UI already on screen: the model answers with ops (or a state change, or a new spec), which are
 * applied and judged like a fresh spec. Same `model` contract as composeUi.
 */
export async function composeEdit({ prompt, spec, state, catalog, model, history = [], maxAttempts = 3, chrome = false, experimental = false, lint = true }) {
  if (typeof model !== "function") throw new TypeError("composeEdit needs `model`: ({ system, messages }) => Promise<string>.");
  const used = [...new Set(nodeIds(spec).length ? Object.values(catalog.components).filter((c) => JSON.stringify(spec).includes(`"type":"${c.name}"`)).map((c) => c.name) : [])];
  const system = [composerRules().trim(), OPS_REFERENCE, "# The components on screen\n\n" + tier2(catalog, used), `# The spec on screen\n\n${JSON.stringify(spec)}`, state && Object.keys(state).length ? `# Shared state\n\n${JSON.stringify(state)}` : ""].filter(Boolean).join("\n\n");
  const messages = [...history, { role: "user", content: prompt }];
  const attempts = [];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const reply = await model({ system, messages });
    const parsed = extractJson(reply);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      attempts.push({ reply, ok: false, kind: "none", validation: null, lint: [] });
      messages.push({ role: "assistant", content: reply }, { role: "user", content: 'That was not the JSON object asked for: { "text", "ops" | "state" | "spec" }.' });
      continue;
    }
    const text = typeof parsed.text === "string" ? parsed.text : "";
    let next = spec, kind = "text", error = null;
    try {
      if (Array.isArray(parsed.ops) && parsed.ops.length) { next = applyOps(spec, parsed.ops); kind = "ops"; }
      else if (parsed.spec && typeof parsed.spec === "object") { next = assignIds({ version: 1, ...parsed.spec }); kind = "spec"; }
    } catch (caught) { error = caught; }
    const stateChange = parsed.state && typeof parsed.state === "object" && !Array.isArray(parsed.state) ? parsed.state : null;
    if (stateChange && kind === "text") kind = "state";
    if (error) {
      attempts.push({ reply, ok: false, kind, validation: null, lint: [], error: error.message });
      messages.push({ role: "assistant", content: reply }, { role: "user", content: `The ops could not be applied: ${error.message} (${error.code ?? "error"}). Node ids on screen: ${nodeIds(spec).join(", ")}. Answer again.` });
      continue;
    }
    const verdict = kind === "ops" || kind === "spec" ? judge(next, catalog, { chrome, experimental, lint }) : { ok: true, validation: null, lint: [] };
    attempts.push({ reply, ok: verdict.ok, kind, validation: verdict.validation, lint: verdict.lint });
    if (verdict.ok) return { ok: true, kind, text, spec: next, ops: kind === "ops" ? parsed.ops : [], state: stateChange, attempts, messages };
    messages.push({ role: "assistant", content: reply }, { role: "user", content: feedbackFor(verdict) });
  }
  return { ok: false, kind: attempts.at(-1)?.kind ?? "none", text: "", spec, ops: [], state: null, attempts, messages };
}

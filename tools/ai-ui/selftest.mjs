#!/usr/bin/env node
// Self-test of the AI UI runtime that needs no browser (`npm run ai-ui:selftest`): the catalog on disk is current, the
// fixtures validate (or fail with the expected codes), the printer emits React the usage harness accepts, the lint bridge
// maps findings back to node ids, ops edit a spec in place, Markdown maps to catalogued components. The renderer itself
// is covered by tests/ai-ui (Vitest, browser).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { outputs } from "./build-catalog.mjs";
import { lintSpec, checkSpec } from "./lint.mjs";
import { validateSpec } from "../../src/ai-ui/validate.mjs";
import { toJsx } from "../../src/ai-ui/print.mjs";
import { assignIds, findNode, nodeIds } from "../../src/ai-ui/spec.mjs";
import { applyOps } from "../../src/ai-ui/ops.mjs";
import { markdownToSpec } from "../../src/ai-ui/markdown.mjs";
import { composeEdit, composeUi, extractJson, feedbackFor, buildSystemPrompt, tier1 } from "./compose.mjs";
import { anthropicModel } from "./adapters/anthropic.mjs";
import { createAiUiHandler } from "./server.mjs";
import { createLiveComposer, extractSlots, keywordClassifier, primaryActionOf, resolveArgs } from "../../src/ai-ui/live.mjs";
import { classifierMetric, dryModel, loadPromptSet, renderReport, runEval } from "./eval.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = (name) => JSON.parse(fs.readFileSync(path.join(root, "tools/ai-ui/fixtures", name), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(root, "docs/ai-ui/catalog.json"), "utf8"));
let failed = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "✓" : "✗"} ${name}${ok || !detail ? "" : `\n    ${detail}`}`); if (!ok) failed += 1; };
const codes = (result) => result.problems.map((p) => p.code);

// 1. docs/ai-ui is what the sources say
const generated = outputs();
const stale = Object.entries(generated).filter(([name, text]) => fs.readFileSync(path.join(root, "docs/ai-ui", name), "utf8") !== text).map(([name]) => name);
check("docs/ai-ui is up to date", !stale.length, `stale: ${stale.join(", ")} — run npm run ai-ui:build`);
check("catalog has the public components only", Object.keys(catalog.components).length >= 120 && !catalog.components.DatePickerItem && catalog.components.Button && catalog.components.SelectField, Object.keys(catalog.components).length);
check("excluded props never appear", Object.values(catalog.components).every((c) => !c.props.className && !c.props.style && !c.props.overrides && !c.props.ref && !c.props.state));
check("bindings follow the API convention", catalog.components.SelectField.bindings.some((b) => b.prop === "value" && b.handler === "onValueChange") && catalog.components.Dialog.bindings.some((b) => b.prop === "open"));

// 2. fixtures
const booking = fixture("booking.json");
const bookingResult = validateSpec(booking, catalog, { strictData: true });
check("booking.json validates", bookingResult.ok && !bookingResult.warnings.length, JSON.stringify(bookingResult.problems, null, 1));
const list = fixture("list.json");
const listResult = validateSpec(list, catalog, { strictData: true });
check("list.json validates ($map, $ref, pending)", listResult.ok, JSON.stringify(listResult.problems, null, 1));
const bad = validateSpec(fixture("bad.json"), catalog);
const expected = ["enum", "excluded-prop", "unknown-component", "enum", "action-on-value", "required-prop", "chrome-component", "missing-id", "duplicate-id", "map-in-prop", "enum"];
const missing = expected.filter((code) => !codes(bad).includes(code));
check("bad.json fails with the expected codes", !bad.ok && !missing.length, `missing ${missing.join(", ")}; got ${codes(bad).join(", ")}`);
check("hints name the nearest component and value", bad.problems.some((p) => p.code === "unknown-component" && p.hint === 'Did you mean "Button"?') && bad.problems.some((p) => p.code === "enum" && p.hint === 'Did you mean "primary"?'), JSON.stringify(bad.problems.filter((p) => p.hint)));
check("duplicate id names the first place", bad.problems.some((p) => p.code === "duplicate-id" && /already used at/.test(p.message)));

// 3. printer + harness
const printed = toJsx(booking, { catalog });
check("printer imports every component once from @zen-ds/react", /^import \{ Button, ChipGroup, DateField, Heading, SelectField, Stack \} from "@zen-ds\/react";/.test(printed.code), printed.code.split("\n")[0]);
check("printer binds controlled pairs as the renderer does", /value=\{state\.when\.service\} onValueChange=\{\(next\) => setState\("when\.service", next\)\}/.test(printed.code), printed.code);
check("printer maps lines to node ids", Object.values(printed.lines).includes("book") && Object.values(printed.lines).includes("service"));
const bookingLint = lintSpec(booking, catalog);
check("booking.json passes the usage harness", !bookingLint.some((f) => f.severity === "error"), JSON.stringify(bookingLint, null, 1));
const badLint = lintSpec(fixture("bad.json"), catalog);
check("lint finds the nameless IconButton and maps it to its id", badLint.some((f) => f.rule === "icon-button/needs-name" && f.id === "b"), JSON.stringify(badLint, null, 1));
const checked = checkSpec(booking, catalog, { strictData: true });
check("checkSpec runs validation and lint together", checked.ok && checked.code && checked.validation.ok);
const listPrinted = toJsx(list, { catalog });
check("printer writes $map as .map and pending as Skeletons", /data\.orders\.map\(\(order, index\) =>/.test(listPrinted.code) && /<SkeletonHeading \/>/.test(listPrinted.code) && /<SkeletonShape data-ai-ui-id="pending-card" \/>/.test(listPrinted.code), listPrinted.code);

// 4. ops
const withIds = assignIds({ version: 1, root: { type: "Stack", children: [{ type: "Text", children: ["a"] }, { type: "Button", children: ["b"] }] } });
check("assignIds gives every node a unique id", nodeIds(withIds).length === 3 && new Set(nodeIds(withIds)).size === 3, JSON.stringify(nodeIds(withIds)));
const edited = applyOps(booking, [
  { op: "setProp", id: "book", name: "level", value: "accent" },
  { op: "setText", id: "title", text: "Book a visit" },
  { op: "insertChild", parent: "actions", index: 0, node: { type: "Button", id: "later", props: { level: "tertiary" }, children: ["Later"] } },
  { op: "removeNode", id: "cancel" },
  { op: "moveNode", id: "date", parent: "root", index: 1 },
  { op: "replaceNode", id: "slot", node: { type: "Segmented", id: "slot", props: { "aria-label": "Time", options: { $ref: "slots" }, value: { $state: "when.slot" } } } },
]);
check("ops edit the spec by id and keep the original", findNode(edited, "book").node.props.level === "accent" && findNode(booking, "book").node.props.level === "primary" && findNode(edited, "title").node.children[0] === "Book a visit" && !findNode(edited, "cancel") && findNode(edited, "later") && edited.root.children[1].id === "date" && findNode(edited, "slot").node.type === "Segmented");
check("the edited spec still validates", validateSpec(edited, catalog, { strictData: true }).ok, JSON.stringify(validateSpec(edited, catalog, { strictData: true }).problems, null, 1));
let thrown = null;
try { applyOps(booking, [{ op: "setProp", id: "nope", name: "x", value: 1 }]); } catch (error) { thrown = error; }
check("an op on an unknown id throws with a code", thrown?.code === "unknown-id", String(thrown));

// 5. markdown
const md = markdownToSpec("# Your visit\n\nWe found **3 slots** on Tuesday, see [the list](https://example.com).\n\n- 09:00\n- 10:30\n\n| Service | Price |\n|---|---|\n| Haircut | 250k |\n| Colour | 900k |\n\n```\nref: 1041\n```\n");
const mdResult = validateSpec(md, catalog);
check("markdown maps to catalogued components and validates", mdResult.ok, JSON.stringify(mdResult.problems, null, 1));
const types = []; (function walk(node) { types.push(node.type); for (const c of node.children ?? []) if (c && typeof c === "object" && c.type) walk(c); for (const v of Object.values(node.props ?? {})) if (v && typeof v === "object" && v.type) walk(v); })(md.root);
check("markdown uses Heading, Text, List/ListItem, Link and Table", ["Heading", "Text", "List", "ListItem", "Link", "Table"].every((t) => types.includes(t)), types.join(" "));

// 6. the compose loop with a scripted model: it picks, answers with a broken spec, gets the problems back, then fixes it
check("extractJson reads fenced, prefixed and bare JSON", extractJson("Sure:\n```json\n{\"a\":1}\n```")?.a === 1 && extractJson("Here you go { \"b\": [1, 2] } done")?.b?.length === 2 && extractJson("[\"Button\", \"Stack\"]")?.length === 2 && extractJson("no json here") === null);
check("tier 1 lists every usable component once and leaves chrome out", (tier1(catalog).match(/^- /gm) ?? []).length === Object.values(catalog.components).filter((c) => !c.chrome && c.status !== "experimental").length && !/^- AppShell:/m.test(tier1(catalog)));
const systemPrompt = buildSystemPrompt(catalog, { components: ["SelectField"] });
check("the system prompt carries the rules, the chosen component in full and the output contract", /Composer rules/.test(systemPrompt) && /## SelectField/.test(systemPrompt) && /SelectFieldOption \{/.test(systemPrompt) && /## Stack/.test(systemPrompt) && /Answer with one JSON object only/.test(systemPrompt));
const broken = { text: "Here is the form.", spec: { root: { type: "Stack", children: [{ type: "SelectFeild", props: { label: "Service" } }, { type: "Button", id: "go", props: { level: "primry", onClick: { $action: "book" } }, children: ["Book"] }] } } };
const fixed = { text: "Here is the form.", spec: { root: { type: "Stack", id: "form", props: { gap: "md" }, children: [{ type: "SelectField", id: "service", props: { label: "Service", options: { $ref: "services" }, value: { $state: "service" } } }, { type: "Button", id: "go", props: { level: "primary", onClick: { $action: "book" } }, children: ["Book"] }] } } };
const calls = [];
const scripted = async ({ system, messages }) => {
  calls.push({ system, messages });
  if (/Which components will the UI/.test(messages.at(-1).content)) return '["SelectField", "Button", "Nope"]';
  if (/The spec was rejected/.test(messages.at(-1).content)) return JSON.stringify(fixed);
  return `\`\`\`json\n${JSON.stringify(broken)}\n\`\`\``;
};
const composed = await composeUi({ prompt: "Book a haircut", catalog, model: scripted, data: { services: [{ value: "cut", label: "Haircut" }] } });
check("composeUi picks, rejects the broken spec with feedback and accepts the fixed one", composed.ok && composed.components.join() === "SelectField,Button" && composed.attempts.length === 2 && !composed.attempts[0].ok && composed.attempts[1].ok && composed.spec.root.children[0].type === "SelectField" && composed.text === "Here is the form.", JSON.stringify({ ok: composed.ok, components: composed.components, attempts: composed.attempts.map((a) => ({ ok: a.ok, codes: a.validation?.errors.map((e) => e.code) })) }));
check("the feedback names the misspelt component and the enum with hints", /\[unknown-component\].*Did you mean "SelectField"/.test(calls[2].messages.at(-1).content) && /\[enum\].*Did you mean "primary"/.test(calls[2].messages.at(-1).content) && /data\.services: \[\{ value: "cut"/.test(calls[1].messages[0].content), calls[2].messages.at(-1).content);
check("the composing call carries tier 2 of the picked components only", /## SelectField/.test(calls[1].system) && !/## DatePicker/.test(calls[1].system) && /## Button/.test(calls[1].system));
const giveUp = await composeUi({ prompt: "x", catalog, model: async () => JSON.stringify(broken), components: ["SelectField"], maxAttempts: 2 });
check("composeUi gives up after maxAttempts with the last attempt's problems", !giveUp.ok && giveUp.attempts.length === 2 && giveUp.attempts[1].validation.errors.length > 0);
const textOnly = await composeUi({ prompt: "hello", catalog, model: async () => '{"text":"Hi there."}', components: ["Button"] });
check("a text-only answer is accepted without a spec", textOnly.ok && textOnly.spec === null && textOnly.text === "Hi there.");
const editedByModel = await composeEdit({ prompt: "make it accent", spec: composed.spec, state: { service: "cut" }, catalog, model: async ({ messages }) => (/could not be applied/.test(messages.at(-1).content) ? '{"text":"Done.","ops":[{"op":"setProp","id":"go","name":"level","value":"accent"}]}' : '{"text":"Done.","ops":[{"op":"setProp","id":"nope","name":"level","value":"accent"}]}') });
check("composeEdit applies ops after a retry on an unknown id and judges the result", editedByModel.ok && editedByModel.kind === "ops" && editedByModel.spec.root.children[1].props.level === "accent" && editedByModel.attempts.length === 2 && /unknown-id|No node with id/.test(editedByModel.attempts[0].error ?? ""), JSON.stringify(editedByModel.attempts));
const stateOnly = await composeEdit({ prompt: "4 pm", spec: composed.spec, catalog, model: async () => '{"text":"Set to 16:00.","state":{"slot":"16:00"}}' });
check("composeEdit returns a state change untouched", stateOnly.ok && stateOnly.kind === "state" && stateOnly.state.slot === "16:00" && stateOnly.spec === composed.spec);
check("feedbackFor numbers errors and marks warnings", /^1\. \[enum\]/m.test(feedbackFor({ validation: { errors: [{ code: "enum", path: "a", message: "m" }], warnings: [{ code: "missing-id", path: "b", message: "w" }] }, lint: [] })) && /\(warning\) \[missing-id\]/.test(feedbackFor({ validation: { errors: [], warnings: [{ code: "missing-id", path: "b", message: "w" }] }, lint: [] })));

// 7. the Anthropic adapter against a fake SDK client: request shape, text extraction, a refusal as a text-only answer
const requests = [];
const fakeClient = { beta: { messages: { create: async (request) => { requests.push(request); return request.messages.at(-1).content.includes("refuse") ? { stop_reason: "refusal", stop_details: { category: "cyber", explanation: "policy" }, content: [], usage: {} } : { stop_reason: "end_turn", content: [{ type: "text", text: "{\"text\":\"hi\"}" }], usage: { input_tokens: 10 } }; } } }, messages: { create: async () => { throw new Error("non-beta path used"); } } };
const usages = [];
const adapter = anthropicModel({ client: fakeClient, effort: "low", onUsage: (usage) => usages.push(usage) });
const reply = await adapter({ system: "SYS", messages: [{ role: "user", content: "hello" }] });
check("the Anthropic adapter sends the system prompt cached, the effort, the fallback beta and returns the text", reply === "{\"text\":\"hi\"}" && requests[0].model === "claude-opus-5-5" && requests[0].system[0].cache_control?.type === "ephemeral" && requests[0].output_config.effort === "low" && requests[0].fallbacks === "default" && requests[0].betas.includes("server-side-fallback-2026-07-01") && requests[0].messages[0].role === "user" && usages.length === 1, JSON.stringify(requests[0]).slice(0, 300));
const refused = await adapter({ system: "SYS", messages: [{ role: "user", content: "please refuse" }] });
check("a refusal comes back as a text-only answer the loop accepts", JSON.parse(refused).text.includes("can't help") && !("spec" in JSON.parse(refused)));

// 8. the request handler: status, catalog, check, compose through a scripted model, edit, errors
const scriptedModel = async ({ messages }) => (/Which components will the UI/.test(messages.at(-1).content) ? '["Button"]' : /make it accent/.test(messages.at(-1).content) ? '{"text":"Done.","ops":[{"op":"setProp","id":"go","name":"level","value":"accent"}]}' : '{"text":"Here.","spec":{"root":{"type":"Button","id":"go","props":{"level":"primary","onClick":{"$action":"go"}},"children":["Go"]}}}');
const handle = createAiUiHandler({ model: scriptedModel, modelName: "scripted", data: () => ({ rows: [1] }) });
const status = await handle({ method: "GET", path: "/status" });
check("GET /status reports the model", status.status === 200 && status.body.enabled === true && status.body.model === "scripted");
const catalogRoute = await handle({ method: "GET", path: "/catalog?component=Button" });
check("GET /catalog?component= returns tier 2", catalogRoute.status === 200 && /## Button/.test(catalogRoute.body.text) && (await handle({ method: "GET", path: "/catalog?component=Nope" })).status === 404);
const composed2 = await handle({ method: "POST", path: "/compose", body: { prompt: "go", data: { extra: 1 } } });
check("POST /compose runs the loop and strips the messages", composed2.status === 200 && composed2.body.ok && composed2.body.spec.root.type === "Button" && !("messages" in composed2.body));
const edited2 = await handle({ method: "POST", path: "/edit", body: { prompt: "make it accent", spec: composed2.body.spec } });
check("POST /edit applies the ops", edited2.status === 200 && edited2.body.ok && edited2.body.spec.root.props.level === "accent");
const checked2 = await handle({ method: "POST", path: "/check", body: { spec: { version: 1, root: { type: "Nope" } } } });
check("POST /check reports problems with feedback", checked2.status === 200 && checked2.body.ok === false && /unknown-component/.test(checked2.body.feedback));
check("bad requests and unknown routes answer 400 / 404 / 503", (await handle({ method: "POST", path: "/compose", body: {} })).status === 400 && (await handle({ method: "GET", path: "/nope" })).status === 404 && (await createAiUiHandler({ model: null })({ method: "POST", path: "/compose", body: { prompt: "x" } })).status === 503);

// 9. composing while typing: debounce, skeleton first, stale answers dropped, hysteresis, submit
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const skeleton = { version: 1, root: { type: "Stack", id: "sk", children: [{ $pending: "heading" }] } };
const classify = keywordClassifier([{ intent: "booking", words: ["schedule", "book"], skeleton }, { intent: "invoices", words: ["invoice", "overdue"] }]);
check("keywordClassifier stays quiet on short text and names the intent with a confidence", classify("sch") === null && classify("schedule a review")?.intent === "booking" && classify("schedule a review").confidence >= 0.6 && classify("hello there") === null);
const states = [];
let composeCalls = 0;
const live = createLiveComposer({ classify, debounceMs: 10, stickMs: 50, onChange: (s) => states.push(s.phase + ":" + (s.intent ?? "-")), compose: async (text, { intent, signal }) => { composeCalls++; await sleep(30); if (signal.aborted) throw Object.assign(new Error("aborted"), { name: "AbortError" }); return { text: "ok", spec: { version: 1, root: { type: "Text", id: intent, children: [text] } } }; } });
live.input("s"); live.input("sch"); live.input("schedule a");
await sleep(60);
check("while typing: debounce, then the skeleton, then the composed UI", states.join(" ") === "skeleton:booking ready:booking" && composeCalls === 1 && live.state.spec?.root.id === "booking", states.join(" "));
live.input("schedule a review"); await sleep(15); live.input("schedule a review for lumen"); await sleep(70);
check("a keystroke during composing aborts the stale answer; one UI lands for the final text", composeCalls === 3 && live.state.phase === "ready" && live.state.spec.root.children[0] === "schedule a review for lumen", `${composeCalls} ${live.state.phase} ${JSON.stringify(live.state.spec)}`);
live.input("sched"); await sleep(40);
check("a weaker guess does not replace the UI on screen while it sticks", live.state.phase === "ready" && live.state.intent === "booking", `${live.state.phase} ${live.state.intent}`);
await sleep(60); live.input("which invoices are overdue"); await sleep(70);
check("a confident new intent replaces the old one once it may switch", live.state.intent === "invoices" && live.state.phase === "ready", `${live.state.intent} ${live.state.phase}`);
live.input(""); await sleep(5);
check("clearing the field clears the preview", live.state.phase === "idle" && live.state.spec === null);
await live.submit("anything at all");
check("submit composes regardless of confidence", live.state.phase === "ready" && live.state.intent === null);
live.dispose();

// 10. slots from the sentence (en + vi), a template built from them, Tab (accept) pinning the intent, Enter's primary action
const now = new Date(2026, 9, 15, 9, 0, 0); // Thursday 2026-10-15
const en = extractSlots("Remind me to pay the rent tomorrow at 4 pm with Linh at Lotus Cafe", { now });
check("extractSlots reads title, date, time, people and place (en)", en?.title === "Pay the rent" && en.date === "2026-10-16" && en.time === "16:00" && en.people?.join() === "Linh" && en.place === "Lotus Cafe" && en.spans.map((x) => x.slot).join() === "date,time,people,place", JSON.stringify(en));
const vi = extractSlots("Đặt lịch họp review với Gia lúc 9h sáng thứ sáu", { now });
check("extractSlots reads a Vietnamese sentence (thứ sáu, 9h sáng, với Gia)", vi?.title === "Họp review" && vi.date === "2026-10-16" && vi.time === "09:00" && vi.people?.join() === "Gia" && vi.place === null, JSON.stringify(vi));
const plain = extractSlots("buy a coffee", { now });
check("a sentence without slots keeps its title, a bare hour reads as the afternoon, numeric dates are day-first", plain?.title === "Buy a coffee" && plain.date === null && extractSlots("call Minh at 4", { now })?.time === "16:00" && extractSlots("ship it on 12/10", { now })?.date === "2027-10-12" && extractSlots("ship it on 12/10", { now, dayFirst: false })?.date === "2026-12-10", JSON.stringify([plain, extractSlots("call Minh at 4", { now }), extractSlots("ship it on 12/10", { now })]));
const classifyWithSlots = keywordClassifier([{ intent: "booking", words: ["schedule"], skeleton: (slots) => ({ version: 1, root: { type: "Text", id: "t", children: [slots?.title ?? "?"] } }) }], { slots: (text) => extractSlots(text, { now }) });
const guess = classifyWithSlots("Schedule a design review tomorrow at 4 pm");
check("keywordClassifier runs the slot extractor and builds the template from the slots", guess?.slots?.title === "Design review" && guess.slots.time === "16:00" && guess.skeleton?.root.children[0] === "Design review", JSON.stringify(guess));
const pinLive = createLiveComposer({ classify, debounceMs: 10, stickMs: 50, onChange: () => undefined, compose: async (text, { intent }) => ({ spec: { version: 1, root: { type: "Text", id: intent, children: [text] } } }) });
pinLive.input("schedule a review"); await sleep(60);
check("accept() pins the intent on screen", pinLive.accept() === true && pinLive.state.pinned === true && pinLive.state.intent === "booking", JSON.stringify(pinLive.state));
pinLive.input("schedule a review, then which invoices are overdue"); await sleep(200);
check("a pinned intent stays while the sentence changes, and compose runs for it", pinLive.state.intent === "booking" && pinLive.state.pinned === true && pinLive.state.phase === "ready" && pinLive.state.spec?.root.children[0].endsWith("overdue"), `${pinLive.state.intent} ${pinLive.state.pinned} ${pinLive.state.phase}`);
pinLive.reset();
check("reset() unpins; there is nothing to accept when idle", pinLive.state.pinned === false && pinLive.accept() === false);
pinLive.dispose();
const primary = primaryActionOf(booking);
check("primaryActionOf finds the primary Button's $action and resolveArgs reads the state", primary?.id === "book" && primary.action === "book" && JSON.stringify(resolveArgs(primary.args, { state: { when: { slot: "16:00" } } })) === '{"when":{"slot":"16:00"}}', JSON.stringify(primary));

// 11. the eval on the scripted model: the metrics it reports, the report, and the classifier on partial prompts (no model)
const promptSet = loadPromptSet();
const dry = dryModel();
const evalRun = await runEval(promptSet, { catalog, makeModel: () => dry, only: ["booking-en", "invoices-overdue", "small-talk"], concurrency: 1 });
const es = evalRun.summary;
check("runEval counts valid-first, the retry, the wrong UI, the text answer and the follow-ups", es.cases === 3 && es.validFinal.n === 3 && es.validFirst.n === 2 && es.specAttempts.valid === 2 && es.specAttempts.of === 3 && es.wrongUi.n === 1 && es.textAnswers === 1 && es.problems[0]?.code === "unknown-component" && es.edits.n === 4 && es.edits.ok === 4 && es.edits.expected === 3 && es.msToUi.n === 2 && es.usage.calls === evalRun.records.reduce((n, r) => n + r.calls, 0), JSON.stringify({ ...es, classifier: undefined }));
const evalMd = renderReport(evalRun, { model: "dry" });
check("renderReport lists the metrics, the cases and the follow-ups", /\| Valid spec, first attempt \| 2\/3/.test(evalMd) && /\| booking-en \| ui \| 2 \|/.test(evalMd) && /## Follow-ups/.test(evalMd) && /\| invoices-overdue \| sort \| text \|/.test(evalMd), evalMd.slice(0, 600));
const partial = classifierMetric(promptSet.cases, promptSet.intents);
check("the keyword classifier names every intent on the full prompt and stays quiet on the rest", partial.fractions.at(-1).correct === partial.fractions.at(-1).of && partial.fractions.at(-1).of === promptSet.cases.length && partial.fractions.at(-1).falsePositives === 0 && partial.details.find((d) => d.id === "booking-en")?.firstConfidentAt === 0.25, JSON.stringify(partial.fractions));

console.log(failed ? `\n${failed} check(s) failed.` : "\nAI UI selftest OK.");
process.exitCode = failed ? 1 : 0;

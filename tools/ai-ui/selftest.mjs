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

console.log(failed ? `\n${failed} check(s) failed.` : "\nAI UI selftest OK.");
process.exitCode = failed ? 1 : 0;

#!/usr/bin/env node
// Zen DS MCP server (`zen-ds-mcp`): gives AI agents the design system's setup, component guidelines and props, icon and
// token search, page templates and the usage harness, straight from the files shipped with @zen/design-system.
// Zero dependencies: newline-delimited JSON-RPC 2.0 over stdio (MCP stdio transport). Logs go to stderr only.
//
//   Claude Code, in an app:   claude mcp add --scope project zen-ds -- npx zen-ds-mcp
//   or .mcp.json:            { "mcpServers": { "zen-ds": { "command": "npx", "args": ["zen-ds-mcp"] } } }
//   In the Zen-DS repo:       .mcp.json runs `node mcp/server.mjs`
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const SUPPORTED_PROTOCOLS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const MAX_TEXT = 40_000; // characters per result (~10k tokens)

const read = (rel) => { try { return fs.readFileSync(path.join(root, rel), "utf8"); } catch { return null; } };
const first = (...rels) => rels.map(read).find((text) => text !== null) ?? null;
const clip = (text) => (text.length > MAX_TEXT ? `${text.slice(0, MAX_TEXT)}\n\n… (truncated; ask for a narrower query)` : text);
const words = (text) => String(text ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/* ── data (read lazily, cached) ─────────────────────────────────────── */
let indexCache;
const guidelineIndex = () => (indexCache ??= JSON.parse(read("docs/guidelines/index.json") ?? '{"components":[]}').components);

let iconCache;
function iconNames() {
  if (iconCache) return iconCache;
  const source = first("src/icons/generated/names.ts", "dist/icons/generated/names.js") ?? "";
  const list = source.slice(source.indexOf("iconNames"));
  return (iconCache = [...new Set([...list.matchAll(/"((?:icon|ic)-[a-z0-9-]+)"/g)].map((m) => m[1]))]);
}

let tokenCache;
function tokens() {
  if (tokenCache) return tokenCache;
  const css = first("src/styles/tokens.css", "dist/styles.css") ?? "";
  const effects = read("src/styles/style-effects.css") ?? "";
  const out = new Map();
  for (const text of [css, effects]) for (const m of text.matchAll(/(--zen-[a-z0-9-]+)\s*:\s*([^;]+);/g)) if (!out.has(m[1])) out.set(m[1], m[2].trim());
  return (tokenCache = out);
}

/** JSX components a guideline documents: its compact props keys plus the names in its import line. */
const tagsOf = (g) => [...new Set([...Object.keys(g.props ?? {}), ...((g.import ?? "").match(/\{([^}]*)\}/)?.[1].split(",").map((s) => s.trim()).filter(Boolean) ?? [])])];

/** A guideline entry by slug, title or any JSX tag it documents ("Button", "icon-button", "Chip / Pill"). */
function findGuideline(name) {
  const key = String(name ?? "").trim().toLowerCase().replace(/^<|\/?>$/g, "");
  const index = guidelineIndex();
  return index.find((g) => g.slug === key)
    ?? index.find((g) => tagsOf(g).some((c) => c.toLowerCase() === key || c.toLowerCase() === key.replace(/[^a-z0-9]/g, "")))
    ?? index.find((g) => g.title.toLowerCase() === key)
    ?? index.find((g) => key.replace(/[^a-z0-9]/g, "") === g.slug.replace(/[^a-z0-9]/g, ""))
    ?? index.find((g) => (g.import ?? "").toLowerCase().includes(key));
}

/**
 * get_component's brief answer: the guideline without the sections an app does not need to write JSX (Figma → React,
 * the harness table — its rule ids stay as one line —, References), without Figma node ids, and with the props of the
 * named component only (the family's other components are listed, to ask for by name).
 */
function briefGuideline(text, name, g) {
  const sections = text.replace(/^<!--.*?-->\n/, "").split(/^(?=## )/m);
  const want = String(name ?? "").trim().replace(/^<|\/?>$/g, "").toLowerCase();
  const out = [];
  for (const section of sections) {
    const heading = /^## (.+)$/m.exec(section)?.[1] ?? "";
    if (/^Figma|^References/.test(heading)) continue;
    if (/^Harness/.test(heading)) {
      const ids = [...new Set([...section.matchAll(/`([a-z0-9-]+\/[a-z0-9-]+)`/g)].map((m) => m[1]))];
      if (ids.length) out.push(`## Harness rules\n${ids.join(" · ")}\n`);
      continue;
    }
    if (/^Props/.test(heading)) {
      const parts = section.split(/^(?=### )/m);
      const head = parts.shift() ?? "";
      const named = parts.filter((part) => !/^### Types/.test(part));
      const pick = named.find((part) => /^### (\w+)/.exec(part)?.[1].toLowerCase() === want) ?? named[0];
      const others = named.filter((part) => part !== pick).map((part) => /^### (\w+)/.exec(part)?.[1]).filter(Boolean);
      const types = parts.find((part) => /^### Types/.test(part));
      out.push(head + (pick ?? "") + (types && pick && /\b[A-Z]\w+(?:Props)?\b/.test(pick) ? types : "") + (others.length ? `\nAlso in this family (get_component with the name for its props): ${others.join(", ")}\n` : ""));
      continue;
    }
    out.push(section);
  }
  return out.join("\n").replace(/^\*\*Figma:\*\*.*\n/m, "").replace(/\s*\((?:Figma )?[\w./ -]*?\d+:\d+\)/g, "").replace(/\n{3,}/g, "\n\n").trim() + `\n\n(brief answer; detail: "full" for the Figma mapping, every component's props and the rule table)`;
}

/* ── Figma → Zen JSX (a local stand-in for Code Connect, which needs a Figma Organization plan) ── */
const flat = (text) => String(text ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const kebab = (text) => String(text ?? "").trim().replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[\s_/]+/g, "-").replace(/-+/g, "-").toLowerCase();
const SHORT = { "2xsmall": "2xs", "2-xsmall": "2xs", xsmall: "xs", small: "sm", medium: "md", large: "lg", xlarge: "xl", "2xlarge": "2xl", "2-xlarge": "2xl", "3xlarge": "3xl" };
/** The guideline's "Figma → React" rows: [figma label, [code props], notes]. */
function figmaTable(slug) {
  const md = read(`docs/guidelines/${slug}.md`) ?? "";
  const section = md.slice(md.indexOf("## Figma → React"), md.indexOf("\n## ", md.indexOf("## Figma → React") + 5));
  return [...section.matchAll(/^\| ([^|]+) \| ([^|]+) \| ([^|]*) \|$/gm)].slice(2).map(([, figma, prop, notes]) => [figma.trim(), [...prop.matchAll(/`([^`]+)`/g)].map((m) => m[1]), notes.trim()]);
}
function apiComponent(slug, name) {
  try { return JSON.parse(read(`docs/api/${slug}.json`)).components.find((c) => c.name === name) ?? null; } catch { return null; }
}
async function mapFigmaComponent(component, properties) {
  const index = guidelineIndex();
  const setName = component.split(/[,(]/)[0].trim();
  const g = index.find((x) => (x.figma ?? "").split(/[,(]/).some((part) => flat(part.replace(/\bpage\b.*$/, "")).length > 2 && (flat(setName).startsWith(flat(part)) || flat(part).startsWith(flat(setName)))))
    ?? findGuideline(setName.split("/")[0]);
  if (!g) return { error: `No Zen component documents the Figma component "${component}". Try list_components.` };
  const tags = tagsOf(g);
  // Pick the export whose name appears in the Figma name (Button/Icon-Main → IconButton), else the first one.
  const code = tags.filter((t) => flat(setName).includes(flat(t).replace(/^button$/, "xx"))).sort((a, b) => b.length - a.length)[0]
    ?? (/icon/i.test(setName) && tags.includes("IconButton") ? "IconButton" : tags[0]);
  const api = apiComponent(g.slug, code);
  const table = figmaTable(g.slug);
  const attrs = [];
  const notes = [];
  let children = null;
  for (const [figmaProp, rawValue] of Object.entries(properties)) {
    const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;
    const figmaKey = flat(figmaProp.replace(/#.*$/, ""));
    if (figmaKey === "state") {
      if (/^disabled$/i.test(String(value))) attrs.push("disabled");
      else if (!/^(default|hover|pressed|focus(ed)?|press|active)$/i.test(String(value))) notes.push(`State=${value}: interaction states come from real interaction; not a prop.`);
      continue;
    }
    if (/^(label|text|title|content)$/.test(figmaKey) && typeof value === "string") { children = value; continue; }
    const row = table.find(([figma]) => flat(figma) === figmaKey || flat(figma).startsWith(figmaKey) || figma.split("/").some((part) => flat(part) === figmaKey));
    const propName = row?.[1].length === 1 && /^[\w-]+$/.test(row[1][0]) ? row[1][0] : api?.props.find((p) => flat(p.name) === figmaKey)?.name;
    if (!propName) { notes.push(`${figmaProp}=${value}: ${row ? `see the guideline row "${row[0]}" → ${row[1].join(" / ")} (${row[2]})` : "no matching prop"}.`); continue; }
    const prop = api?.props.find((p) => p.name === propName);
    const literals = [...(prop?.type ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    if (typeof value === "boolean" || /^(true|false|yes|no|on|off)$/i.test(String(value))) {
      const on = value === true || /^(true|yes|on)$/i.test(String(value));
      if (/^boolean/.test(prop?.type ?? "boolean")) { if (on) attrs.push(propName); }
      else notes.push(`${figmaProp}=${value}: ${propName} is ${prop?.type}; set it to the content you want${on ? "" : " (or omit it)"}.`);
      continue;
    }
    // The short size spelling is canonical (Medium → md); otherwise the Figma value in kebab-case (Danger-Subtle → danger-subtle).
    const candidates = [SHORT[kebab(value)] ?? "", SHORT[String(value).toLowerCase()] ?? "", kebab(value), String(value).toLowerCase(), String(value)].filter(Boolean);
    const hit = literals.length ? candidates.find((c) => literals.includes(c)) : candidates[1];
    if (hit) attrs.push(`${propName}="${hit}"`);
    else notes.push(`${figmaProp}=${value}: ${propName} takes ${literals.join(" | ") || prop?.type}.`);
  }
  const required = (api?.props ?? []).filter((p) => p.required && !attrs.some((a) => a.startsWith(p.name)) && !(p.name === "children" && children));
  for (const p of required) notes.push(`${p.name} is required (${p.type.slice(0, 80)}).`);
  const open = `<${code}${attrs.length ? ` ${attrs.join(" ")}` : ""}`;
  const jsx = children ? `${open}>${children}</${code}>` : `${open} />`;
  // Run the snippet through the usage harness, so rule breaks (a field without a label…) show up here too.
  const { checkSource } = await import("../tools/usage-guard/api.mjs");
  const findings = checkSource(`import { ${code} } from "@zen/design-system";\nexport const Example = () => (\n  ${jsx}\n);\n`, "figma-instance.tsx");
  for (const f of findings) notes.push(`${f.severity === "error" ? "✗" : "⚠"} [${f.rule}] ${f.message}`);
  return [`import { ${code} } from "@zen/design-system";`, "", jsx, "", notes.length ? `Not mapped / to check:\n${notes.map((n) => `- ${n}`).join("\n")}` : "Every property mapped; the usage harness finds nothing.", "", `Guideline: ${g.file ?? `docs/guidelines/${g.slug}.md`}`].join("\n");
}

/* ── tools ──────────────────────────────────────────────────────────── */
const tools = [
  {
    name: "get_setup",
    description: "How to install and set up Zen DS in an app (styles, ZenProvider, token modes, icons, fonts), the rules agents get wrong most often, and how to check work. Read this first.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: () => [first("AGENTS.consumer.md"), first("docs/getting-started.md")].filter(Boolean).join("\n\n---\n\n"),
  },
  {
    name: "list_components",
    description: "Every Zen component with its purpose, when to use it and when to use something else. Use it to pick the right component before writing JSX.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Optional words to filter by (e.g. 'filter', 'navigation', 'form')." } }, additionalProperties: false },
    run: ({ query } = {}) => {
      const q = words(query);
      const rows = guidelineIndex().filter((g) => !q.length || q.every((w) => words(`${g.slug} ${g.title} ${g.purpose ?? ""} ${(g.use ?? []).join(" ")} ${tagsOf(g).join(" ")}`).some((x) => x.startsWith(w))));
      return rows.map((g) => `## ${g.title} (${g.slug})\n${g.import ?? ""}\n${g.purpose ?? ""}\nUse for: ${(g.use ?? []).join(" · ")}\nNot for: ${(g.avoid ?? []).join(" · ")}`).join("\n\n") || `No component matches "${query}". Call list_components without a query for the full list.`;
    },
  },
  {
    name: "get_component",
    description: "One component: when to use it, its props with types and defaults, Do/Don't, keyboard and accessibility, and the names of the harness rules that check it. Accepts a slug ('button'), a component name ('IconButton') or a title. `detail: \"brief\"` (default) keeps the props of the component you named (the others are listed by name) and leaves out the Figma mapping, the rule table and references; `\"full\"` returns the whole guideline.",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "Slug, component name or title, e.g. 'Table', 'date-picker', 'ChatMessage'." }, detail: { type: "string", enum: ["brief", "full"], default: "brief" } }, required: ["name"], additionalProperties: false },
    run: ({ name, detail = "brief" }) => {
      const g = findGuideline(name);
      if (!g) return { error: `No component "${name}". Try list_components.` };
      const text = read(g.file ?? `docs/guidelines/${g.slug}.md`);
      if (!text) return JSON.stringify(g, null, 2);
      return detail === "full" ? text : briefGuideline(text, name, g);
    },
  },
  {
    name: "search_icons",
    description: "Find Zen icon names (IconName) by meaning or part of the name, e.g. 'search', 'trash', 'chevron left'. Icon names are irregular (icon-search-medium-line, icon-chevron-left-line-medium), so search instead of guessing.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number", default: 20 } }, required: ["query"], additionalProperties: false },
    run: ({ query, limit = 20 }) => {
      const synonyms = { delete: ["trash"], remove: ["trash", "x"], close: ["x"], back: ["chevron-left", "arrow-left"], settings: ["settings", "gear"], add: ["plus"], more: ["dots"], menu: ["menu", "dots"], edit: ["pencil", "edit"], user: ["user"], profile: ["user"], mail: ["mail"], email: ["mail"], home: ["home"], notification: ["bell"], alert: ["alert", "bell"] };
      const q = words(query);
      if (!q.length) return { error: "Give a query, e.g. 'search' or 'arrow left'." };
      const names = iconNames();
      const score = (name) => {
        const parts = name.split("-");
        let s = 0;
        for (const w of q) {
          const alts = [w, ...(synonyms[w] ?? [])];
          const hit = alts.some((a) => a.includes("-") ? name.includes(a) : parts.includes(a)) ? 3 : alts.some((a) => name.includes(a)) ? 1 : 0;
          if (!hit) return 0;
          s += hit;
        }
        return s + (name.endsWith("-line") ? 0.5 : 0) - name.length / 100;
      };
      const hits = names.map((n) => [n, score(n)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, Math.min(Number(limit) || 20, 100));
      return hits.length ? `${hits.length} of ${names.length} icons (styles: -line, -solid; some have -medium/-small cuts):\n${hits.map(([n]) => n).join("\n")}\n\nUse: <Icon name="${hits[0][0]}" />` : `No icon matches "${query}". Try one word (e.g. "trash", "chevron", "user").`;
    },
  },
  {
    name: "get_tokens",
    description: "Search Zen design tokens (CSS custom properties) by words, e.g. 'background surface', 'content neutral', 'spacing gap', 'radius'. Returns names with their default (light) value. Use tokens in CSS as var(--zen-…); never raw colours.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number", default: 60 } }, required: ["query"], additionalProperties: false },
    run: ({ query, limit = 60 }) => {
      const q = words(query);
      const all = [...tokens()].filter(([name]) => !/^--zen-(light|dark)-/.test(name) && !/^--zen-dm-/.test(name));
      const hits = all.filter(([name]) => q.every((w) => name.includes(w))).slice(0, Math.min(Number(limit) || 60, 200));
      return hits.length ? hits.map(([name, value]) => `${name}: ${value}`).join("\n") : `No token matches "${query}". Families: color-background, color-content, color-border, spacing-gap, spacing-padding, corner-radius, typography, style (effects).`;
    },
  },
  {
    name: "list_templates",
    description: "Page templates shipped with Zen DS (admin list, detail, dashboard, settings form, sign-in, empty/error, mobile list, mobile detail). Copying one is the fastest correct start for a screen.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    run: () => {
      const dir = path.join(root, "src/templates");
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".tsx")) : [];
      return files.map((f) => { const src = fs.readFileSync(path.join(dir, f), "utf8"); const doc = src.match(/\/\*\*([\s\S]*?)\*\//)?.[1].replace(/^\s*\* ?/gm, "").trim().split("\n")[0] ?? ""; return `${f.replace(/\.tsx$/, "")}: ${doc}`; }).join("\n") || "No templates found.";
    },
  },
  {
    name: "get_template",
    description: "The full source of one page template (see list_templates), ready to copy into an app. Templates import from @zen/design-system.",
    inputSchema: { type: "object", properties: { name: { type: "string", description: "e.g. 'AdminListTemplate' or 'admin list'." } }, required: ["name"], additionalProperties: false },
    run: ({ name }) => {
      const dir = path.join(root, "src/templates");
      const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith(".tsx")) : [];
      const key = String(name).toLowerCase().replace(/[^a-z0-9]/g, "");
      const file = files.find((f) => f.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/tsx$/, "").replace(/template$/, "") === key.replace(/template$/, "")) ?? files.find((f) => f.toLowerCase().replace(/[^a-z0-9]/g, "").includes(key));
      return file ? fs.readFileSync(path.join(dir, file), "utf8") : { error: `No template "${name}". Available: ${files.map((f) => f.replace(/\.tsx$/, "")).join(", ")}` };
    },
  },
  {
    name: "map_figma_component",
    description: "Translate a Figma component instance into Zen JSX: give the Figma component (set) name, e.g. 'Button/Main', 'Chip/Advanced', 'Input/Text-Field', and its properties as shown in Figma or get_design_context (e.g. { \"Level\": \"Primary\", \"Size\": \"Medium\", \"State\": \"Disabled\", \"Label\": \"Save\" }). Uses each guideline's Figma → React table and the props' allowed values; lists what it could not map.",
    inputSchema: { type: "object", properties: { component: { type: "string" }, properties: { type: "object", additionalProperties: { type: ["string", "boolean", "number"] } } }, required: ["component"], additionalProperties: false },
    run: ({ component, properties = {} }) => mapFigmaComponent(String(component), properties),
  },
  {
    name: "check_usage",
    description: "Run the Zen usage harness on JSX/TSX (or CSS) source, like `npx zen-usage` does in an app: checks Zen components imported from @zen/design-system against the Do/Don't rules. Returns every finding with the rule, message and guideline. Run it on each file you write.",
    inputSchema: { type: "object", properties: { code: { type: "string", description: "The file's full source text." }, filename: { type: "string", description: "Its name, e.g. 'src/TeamPage.tsx' (a .css name checks stylesheet rules)." } }, required: ["code"], additionalProperties: false },
    run: async ({ code, filename = "input.tsx" }) => {
      const { checkSource } = await import("../tools/usage-guard/api.mjs");
      const findings = checkSource(String(code), filename);
      if (!findings.length) return /@zen\/design-system/.test(code) || /\.css$/.test(filename) ? "✓ No findings." : "No Zen imports found: the harness checks only components imported from \"@zen/design-system\".";
      return findings.map((f) => `${f.severity === "error" ? "✗" : "⚠"} ${filename}:${f.line}:${f.column} [${f.rule}] <${f.tag}> ${f.message} → ${f.guideline} (deliberate exception: comment zen-allow-${f.allow}: <reason>)`).join("\n");
    },
  },
];

/* ── JSON-RPC over stdio ────────────────────────────────────────────── */
const send = (message) => process.stdout.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
const log = (...args) => process.stderr.write(`[zen-ds-mcp] ${args.join(" ")}\n`);

/** The tool's inputSchema, checked: unknown and missing arguments, and top-level types. Returns a message or null. */
function invalidArguments(tool, args) {
  const { properties = {}, required = [], additionalProperties } = tool.inputSchema;
  if (!args || typeof args !== "object" || Array.isArray(args)) return `${tool.name}: arguments must be an object.`;
  const expected = Object.keys(properties);
  const list = expected.length ? expected.join(", ") : "none";
  const unknown = additionalProperties === false ? Object.keys(args).filter((name) => !(name in properties)) : [];
  if (unknown.length) return `${tool.name}: unknown argument${unknown.length > 1 ? "s" : ""} ${unknown.map((n) => `"${n}"`).join(", ")} (expected: ${list}).`;
  const missing = required.filter((name) => args[name] === undefined);
  if (missing.length) return `${tool.name}: missing required argument${missing.length > 1 ? "s" : ""} ${missing.map((n) => `"${n}"`).join(", ")} (expected: ${list}).`;
  for (const [name, value] of Object.entries(args)) {
    const types = [properties[name]?.type].flat().filter(Boolean);
    const actual = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
    if (types.length && !types.includes(actual)) return `${tool.name}: "${name}" must be ${types.join(" or ")}, not ${actual}.`;
  }
  return null;
}

async function handle(request) {
  const { id, method, params } = request;
  const isNotification = id === undefined || id === null;
  try {
    switch (method) {
      case "initialize": {
        const requested = params?.protocolVersion;
        return send({ id, result: {
          protocolVersion: SUPPORTED_PROTOCOLS.includes(requested) ? requested : SUPPORTED_PROTOCOLS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "zen-ds", title: "Zen Design System", version: packageJson.version },
          instructions: "Zen DS: call get_setup once, list_components to pick a component, get_component for its props and rules, search_icons for icon names, get_template to start a screen, and check_usage on every file you write.",
        } });
      }
      case "ping": return isNotification ? undefined : send({ id, result: {} });
      case "tools/list": return send({ id, result: { tools: tools.map(({ run, ...tool }) => tool) } });
      case "tools/call": {
        const tool = tools.find((t) => t.name === params?.name);
        if (!tool) return send({ id, error: { code: -32602, message: `Unknown tool: ${params?.name}` } });
        const args = params?.arguments ?? {};
        // Reject what the schema rejects: a misspelt argument must not come back as an empty (clean-looking) answer.
        const problem = invalidArguments(tool, args);
        if (problem) return send({ id, result: { content: [{ type: "text", text: problem }], isError: true } });
        const output = await tool.run(args);
        const failed = output && typeof output === "object" && "error" in output;
        return send({ id, result: { content: [{ type: "text", text: clip(failed ? output.error : String(output)) }], isError: Boolean(failed) } });
      }
      default:
        if (method?.startsWith("notifications/")) return undefined;
        if (!isNotification) send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (error) {
    log(error.stack ?? error.message);
    if (!isNotification) send({ id, error: { code: -32603, message: error.message } });
  }
}

const lines = readline.createInterface({ input: process.stdin });
lines.on("line", (line) => {
  if (!line.trim()) return;
  let message;
  try { message = JSON.parse(line); } catch { return send({ id: null, error: { code: -32700, message: "Parse error" } }); }
  for (const request of Array.isArray(message) ? message : [message]) void handle(request);
});
lines.on("close", () => process.exit(0));
log(`ready (${root})`);

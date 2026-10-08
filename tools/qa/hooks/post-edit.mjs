#!/usr/bin/env node
// Claude Code PostToolUse hook (Edit | Write | MultiEdit | NotebookEdit | Bash) for the Zen DS Build-QA gate.
//
// After every edit of a UI file (component, playground, example, template, hand-kept styles) it:
//   1. records the edit in this session's ledger (.qa/sessions/<session>.json) with its time and the platform pages it
//      renders on, so `npm run qa` checks the pages of the edits made since the last passing run and the Stop hook knows
//      QA is still owed;
//   2. lints the file at once — style-guard (spacing / radius / typography / colour roles / shadows / slot sizes) and
//      usage-guard (component rules) — and hands NEW errors back to Claude as a blocking message, so drift is fixed
//      while building instead of at the end. Warnings and pre-existing (baseline) debt go back as context only.
// Edits of harness/contract tooling, tests and token sources are recorded too (ledger `aux`): they scope the static gates
// (self-tests, contract suites, Vitest, token consumers) and never make the Stop hook ask for a QA run.
// Bash edits count only for changed files the command itself names (another session may write files meanwhile), and
// for the outputs a token / style / icon generator wrote in the last two minutes.
// It never fails the tool call: any internal problem exits 0 silently.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const readStdin = () => { try { return JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { return {}; } };

async function main() {
  const input = readStdin();
  const tool = input.tool_name ?? "";
  const ti = input.tool_input ?? {};
  const session = input.session_id ?? process.env.CLAUDE_CODE_SESSION_ID;
  let targets = [];
  if (tool === "Bash") {
    const changed = input.tool_response?.changedFiles ?? input.tool_response?.result?.changedFiles ?? null;
    const cmd = String(ti.command ?? "");
    if (Array.isArray(changed)) targets = changed.filter((f) => typeof f === "string" && (cmd.includes(f) || cmd.includes(path.basename(f))));
    else if (/\bsed\s+-i|perl\s+-p?i|writeFile|write_text|open\([^)]*['"][wa]['"]|\.write\(|\btee\b|>\s*["']?[\w./-]+\.(tsx|ts|css|mjs|json)\b|\b(cp|mv|patch|git\s+(apply|checkout|restore))\b/.test(cmd)) {
      // No changed-file list (it is only reported in some permission modes): take the files the command names that were
      // modified in the last two minutes (UI files, and the tooling/test/token files that scope the static gates).
      const cwd = input.cwd ?? process.cwd();
      const named = [...new Set([...cmd.matchAll(/(?:\/|\b)[\w.@-]+(?:\/[\w.@-]+)*\.(?:tsx|ts|css|mjs|json)\b/g)].map((m) => m[0]))];
      const bases = [cwd, path.join(cwd, "Zen-DS"), process.env.CLAUDE_PROJECT_DIR ?? "", path.join(process.env.CLAUDE_PROJECT_DIR ?? "", "Zen-DS")].filter(Boolean);
      for (const n of named) {
        const hit = (path.isAbsolute(n) ? [n] : bases.map((b) => path.join(b, n))).find((f) => fs.existsSync(f));
        if (hit && Date.now() - fs.statSync(hit).mtimeMs < 120000) targets.push(hit);
      }
    }
    // A generator run (npm run tokens:build / styles:build / icons:build, or its script) names no output file: record
    // what it wrote in the last two minutes under its output folders, so a token change made only in tokens/source still
    // scopes the gate and makes the Stop hook ask for QA (backlog batch C, 2026-10-07).
    if (/\bnpm\s+run\s+(tokens|styles|icons):build\b|\bscripts\/build-(tokens|native-tokens|text-styles|style-manifest|icons)\.mjs\b/.test(cmd)) {
      const cwd = input.cwd ?? process.cwd();
      const roots = [cwd, path.join(cwd, "Zen-DS"), process.env.CLAUDE_PROJECT_DIR ?? "", path.join(process.env.CLAUDE_PROJECT_DIR ?? "", "Zen-DS")].filter(Boolean);
      const root = roots.find((dir) => fs.existsSync(path.join(dir, "scripts/build-tokens.mjs")));
      for (const dir of root ? ["src/styles", "src/tokens", "src/icons/generated"] : []) {
        const abs = path.join(root, dir);
        if (!fs.existsSync(abs)) continue;
        for (const name of fs.readdirSync(abs, { recursive: true })) {
          const file = path.join(abs, String(name));
          try { if (fs.statSync(file).isFile() && Date.now() - fs.statSync(file).mtimeMs < 120000) targets.push(file); } catch { /* removed meanwhile */ }
        }
      }
    }
  } else {
    const f = ti.file_path ?? ti.notebook_path ?? input.tool_response?.filePath;
    if (f) targets = [f];
  }
  if (!targets.length) return;

  const lib = await import(pathToFileURL(path.join(path.dirname(new URL(import.meta.url).pathname), "../lib.mjs")).href);
  const messages = { block: [], context: [] };
  // A file another session edited in the last 30 minutes: say so once per file per half hour (ledger.sharedWarned).
  const warnShared = (root, rel) => {
    if (!session) return;
    const others = lib.recentOtherEdits(root, session, rel);
    if (!others.length) return;
    const ledger = lib.readLedger(root, session);
    const last = ledger.sharedWarned?.[rel] ?? 0;
    if (Date.now() - last < 30 * 60 * 1000) return;
    (ledger.sharedWarned ??= {})[rel] = Date.now();
    lib.writeLedger(root, session, ledger);
    const who = others.map((o) => `${o.session.slice(0, 8)} (${Math.max(1, Math.round((Date.now() - o.at) / 60000))} min ago)`).join(", ");
    messages.context.push(`Shared file: ${rel} was also edited by session ${who}. Coordinate before you overwrite it: ListAgents → SendMessage its owner, re-read the file right before each write and keep edits targeted; when you both need it for a while, take a git worktree and merge at an agreed stable point (AGENTS.md "Working alongside other sessions").`);
  };
  for (const file of targets) {
    const root = lib.repoRootOf(file); if (!root) continue;
    const rel = lib.relTo(root, file); const kind = lib.uiKind(rel);
    warnShared(root, rel);
    if (!kind) {
      // Tooling / tests / token sources: record the edit so the gate scopes its static checks; no lint, no brief.
      if (session && lib.auxKind(rel)) { const ledger = lib.readLedger(root, session); lib.recordAux(ledger, rel); ledger.repo = root; lib.writeLedger(root, session, ledger); }
      continue;
    }
    const snippets = [ti.new_string, ti.content, ...(ti.edits ?? []).map((e) => e.new_string), ti.old_string].filter((s) => typeof s === "string");

    // 1 · ledger
    if (session) {
      const ledger = lib.readLedger(root, session);
      const first = !Object.keys(ledger.files ?? {}).length;
      const found = lib.pagesForEdit(root, rel, snippets);
      // Where the edit landed (line ranges), so the gate can tell findings in this change from old debt elsewhere.
      const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      const lineAt = (i) => text.slice(0, i).split("\n").length;
      const ranges = tool === "Write" ? [[1, text.split("\n").length]] : snippets.filter((s) => s !== ti.old_string && s.length > 2).flatMap((s) => { const i = text.indexOf(s); return i < 0 ? [] : [[lineAt(i), lineAt(i + s.length)]]; });
      const entry = lib.recordEdit(ledger, rel, found);
      entry.ranges = [...(entry.ranges ?? []), ...ranges].slice(-40);
      ledger.repo = root;
      // First touch of a component in this session: brief the spec — Figma node, guideline, the harness rules for it.
      const folder = rel.match(/^src\/components\/([^/_][^/]*)\//)?.[1];
      if (folder && !(ledger.briefed ?? []).includes(folder)) {
        (ledger.briefed ??= []).push(folder);
        const dir = path.join(root, "src/components", folder);
        const srcs = fs.readdirSync(dir).filter((f) => /\.(tsx|css)$/.test(f) && !/\.stories\./.test(f)).map((f) => fs.readFileSync(path.join(dir, f), "utf8"));
        const nodes = [...new Set(srcs.flatMap((s) => [...s.matchAll(/(?:Figma|node)[^\n]{0,40}?\b(\d{2,5}:\d{2,6})\b/gi)].map((m) => m[1])))].slice(0, 4);
        const exported = [...new Set([...(fs.existsSync(path.join(dir, "index.ts")) ? fs.readFileSync(path.join(dir, "index.ts"), "utf8") : "").matchAll(/\b([A-Z][A-Za-z]+)\b(?![^{]*\btype\b)/g)].map((m) => m[1]))];
        const slug = found.pages.find((p) => fs.existsSync(path.join(root, "docs/guidelines", `${p}.md`)));
        let ruleIds = [];
        try { const listed = spawnSync(process.execPath, [path.join(root, "tools/usage-guard/check-usage.mjs"), "--list"], { cwd: root, encoding: "utf8", timeout: 10000 }); ruleIds = JSON.parse(listed.stdout).filter((r) => r.components?.some((c) => exported.includes(c) || c === folder)).map((r) => r.id); } catch { /* registry unavailable */ }
        messages.context.push(`You are changing ${folder}. Before styling, pin the spec your tier asks for (AGENTS.md §C): ${nodes.length ? `Figma node ${nodes.join(", ")} (live file 9nZv4uW2LT21yuHabMTCh1)` : "its Figma node"}; tokens per changed element (padding/gap, radius, text style + tone, colour roles), states and keyboard pattern.${slug ? ` Guideline: docs/guidelines/${slug}.md.` : ""}${ruleIds.length ? ` Harness rules for it: ${ruleIds.join(", ")}.` : ""} Pages to check afterwards: ${found.pages.join(", ") || "(pass --pages)"}.`);
      }
      lib.writeLedger(root, session, ledger);
      if (first) messages.context.push(`Zen Build-QA gate is on for this session: before you deliver, run \`npm --prefix "${root}" run qa\` (it checks the files you edited since your last passing run), fix every ✗, open the contact sheets it asks for and review them with skills/zen-build-qa/SKILL.md. Use \`npm --prefix "${root}" run qa:quick\` for fast loops while building.`);
    }

    // 2 · instant lint of this file
    if (!/\.(css|tsx)$/.test(rel)) continue;
    const guard = await import(pathToFileURL(path.join(root, "tools/style-guard/check-styles.mjs")).href).catch(() => null);
    if (guard) {
      const found = guard.checkFiles([rel]);
      const fresh = found.filter((f) => f.new);
      const errs = fresh.filter((f) => f.severity === "error"), warns = fresh.filter((f) => f.severity === "warn");
      const debt = found.length - fresh.length;
      if (errs.length) messages.block.push(`style-guard found ${errs.length} new token problem(s) in ${rel}:\n${errs.slice(0, 12).map((f) => `  ✗ ${rel}:${f.line} ${f.rule} — ${f.message}`).join("\n")}${errs.length > 12 ? `\n  … ${errs.length - 12} more (npm run style:check -- ${rel})` : ""}`);
      if (warns.length) messages.context.push(`style-guard warnings in ${rel} (fix, or add \`zen-allow-<id>: <reason>\` above the line when Figma requires it):\n${warns.slice(0, 8).map((f) => `  ⚠ ${rel}:${f.line} ${f.rule} — ${f.message}`).join("\n")}`);
      if (debt && (errs.length || warns.length)) messages.context.push(`${rel} also carries ${debt} pre-existing style-guard finding(s) (baseline debt): write one Backlog line (priority + pointer) in docs/context/BACKLOG.md; fix them only if that is in the approved task.`);
    }
    const usage = spawnSync(process.execPath, [path.join(root, "tools/usage-guard/check-usage.mjs"), rel], { cwd: root, encoding: "utf8", timeout: 20000 });
    if (usage.status === 1) {
      const lines = `${usage.stdout ?? ""}`.split("\n").filter((l) => /^\s*✗/.test(l)).map((l) => `  ${l.trim()}`);
      if (lines.length) messages.block.push(`usage-guard errors in ${rel}:\n${lines.slice(0, 12).join("\n")}`);
    }
  }
  if (messages.block.length) {
    process.stdout.write(JSON.stringify({ decision: "block", reason: `Zen Build-QA (instant check after your edit) — fix these now, while the change is fresh:\n${messages.block.join("\n")}\nTokens: docs/qa/build-qa-process.md · rules: npm run style:check -- --list / npm run usage:rules.${messages.context.length ? `\n\n${messages.context.join("\n")}` : ""}` }));
  } else if (messages.context.length) {
    process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: messages.context.join("\n") } }));
  }
}

main().catch(() => undefined).finally(() => process.exit(0));

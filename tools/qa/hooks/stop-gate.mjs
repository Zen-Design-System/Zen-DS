#!/usr/bin/env node
// Claude Code Stop hook for the Zen DS Build-QA gate: "always QA after building, then deliver".
//
// A session that edited UI files (components, playgrounds, examples, templates) may only finish its turn when
//   1. every such file passed a full `npm run qa` after its last edit (ledger .qa/sessions/<session>.json), and
//   2. the contact sheets of that passing run were opened (Read) in this session after the run — a screenshot
//      shows what the DOM checks cannot (a squashed button, a flat hierarchy, a crowded card).
// Otherwise it blocks the stop with the exact next step. If Claude stops again and nothing changed, the turn ends and
// the user is told once instead, so the hook can never loop. Sessions that edited no UI file never see it.
// Internal problems exit 0 silently.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const readStdin = () => { try { return JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { return {}; } };

/** Absolute paths of PNGs this session opened with Read at or after `since` (ms). */
function viewedImages(transcript, since) {
  const seen = new Set();
  if (!transcript || !fs.existsSync(transcript)) return seen;
  for (const line of fs.readFileSync(transcript, "utf8").split("\n")) {
    if (!line.includes('"Read"') || !line.includes(".png")) continue;
    try {
      const o = JSON.parse(line); const at = Date.parse(o.timestamp ?? "") || 0;
      if (at < since - 1000) continue;
      for (const c of o.message?.content ?? []) if (c?.type === "tool_use" && c.name === "Read" && c.input?.file_path) seen.add(path.resolve(String(c.input.file_path)));
    } catch { /* partial line */ }
  }
  return seen;
}

async function main() {
  const input = readStdin();
  const session = input.session_id; if (!session) return;
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  // Zen repos under the project (Zen-DS, worktrees such as Zen-DS-vibe) or the project itself.
  const candidates = [projectDir, ...fs.readdirSync(projectDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => path.join(projectDir, d.name))];
  const id = session.replace(/[^\w-]/g, "");
  const ledgers = candidates.filter((root) => fs.existsSync(path.join(root, ".qa", "sessions", `${id}.json`)));
  if (!ledgers.length) return;

  const problems = [], notes = [];
  for (const root of ledgers) {
    const lib = await import(pathToFileURL(path.join(root, "tools/qa/lib.mjs")).href).catch(() => null); if (!lib) continue;
    const ledger = lib.readLedger(root, session);
    const cmd = `npm --prefix "${root}" run qa`;
    const dirty = lib.dirtyFiles(ledger, root);
    const runs = ledger.runs ?? [];
    const last = runs[runs.length - 1];
    const lastEdit = Math.max(0, ...dirty.map((f) => ledger.files[f].editedAt ?? 0));
    const pass = [...runs].reverse().find((r) => r.ok && r.full);
    const unseen = !dirty.length && pass ? (() => { const seen = viewedImages(input.transcript_path, pass.at); return (pass.shots ?? []).filter((s) => !seen.has(path.resolve(root, s))); })() : [];

    const state = { dirty: dirty.join(","), last: last?.at ?? 0, unseen: unseen.join(",") };
    const prev = ledger.stopGate;
    const same = prev && prev.dirty === state.dirty && prev.last === state.last && prev.unseen === state.unseen;
    const repeat = same && (input.stop_hook_active || prev.notified);
    let notified = same ? Boolean(prev.notified) : false;

    let problem = null;
    if (dirty.length) {
      const list = `${dirty.slice(0, 6).join(", ")}${dirty.length > 6 ? ", …" : ""}`;
      const next = last && last.at >= lastEdit && !last.ok
        ? `The last QA run (${new Date(last.at).toLocaleTimeString("en-GB")}) FAILED at: ${(last.failed ?? []).join(", ")}. Fix every ✗ (report: ${last.report}) and run \`${cmd}\` again. If a failure is outside your change and you cannot fix it, say so plainly in your reply, with the report path.`
        : last && last.at >= lastEdit && !last.full
          ? `The last run was --quick (or had no dev server), which does not count. Run the full gate: \`${cmd}\`.`
          : `Run \`${cmd}\` (it scopes itself to this session), fix every ✗, open the contact sheets it prints, then deliver with the summary from its report.`;
      problem = { agent: `You edited ${dirty.length} UI file(s) in this session (${list}) without a passing full Build-QA run after the last edit. ${next}`, user: `⚠ Build-QA: ${dirty.length} UI file(s) ended the turn without a passing QA run (${list}). Ask Claude to run \`${cmd}\`.` };
    } else if (unseen.length) {
      const list = unseen.join(", ");
      problem = { agent: `Build-QA passed, but its screenshots have not been looked at. Open each with Read and review it with the UX rubric in skills/zen-build-qa/SKILL.md (hierarchy, spacing rhythm, alignment, states, copy, mobile): ${list}. Fix what you see and re-run the gate, or deliver saying what you checked.`, user: `⚠ Build-QA passed but ${unseen.length} screenshot(s) were not reviewed: ${list}.` };
    }
    if (problem && repeat) { if (!notified) notes.push(problem.user); notified = true; }
    else if (problem) problems.push(problem.agent);
    ledger.stopGate = { ...state, at: Date.now(), notified };
    lib.writeLedger(root, session, ledger);
  }
  if (problems.length) process.stdout.write(JSON.stringify({ decision: "block", reason: `Zen Build-QA gate — not ready to deliver yet.\n${problems.map((p) => `• ${p}`).join("\n")}` }));
  else if (notes.length) process.stdout.write(JSON.stringify({ systemMessage: notes.join("\n") }));
}

main().catch(() => undefined).finally(() => process.exit(0));

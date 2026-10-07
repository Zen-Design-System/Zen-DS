#!/usr/bin/env node
// Claude Code Stop hook for the Zen DS Build-QA gate: "always QA after building, then deliver".
//
// A session that edited UI files (components, playgrounds, examples, templates) may only finish its turn when
//   1. every such file passed a full `npm run qa` after its last edit (ledger .qa/sessions/<session>.json), and
//   2. the contact sheets of that passing run whose content is new to this session were opened (Read): at most 12,
//      own pages first, then 390 before 1512 (the rest are optional). A sheet whose content hash was already reviewed
//      in this session is never asked for again. A screenshot shows what the DOM checks cannot (a squashed button, a flat
//      hierarchy, a crowded card).
// While the session's own QA run is still in progress (ledger `running`, pid alive) the stop is allowed with a one-line
// note; the results arrive when the run ends. Otherwise it blocks the stop with the exact next step. If Claude stops
// again and nothing changed, the turn ends and the user is told once instead, so the hook can never loop. Sessions that
// edited no UI file never see it. Internal problems exit 0 silently.
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const readStdin = () => { try { return JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { return {}; } };

async function main() {
  const input = readStdin();
  const session = input.session_id; if (!session) return;
  const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  // Zen repos under the project (Zen-DS, worktrees such as Zen-DS-vibe) or the project itself.
  const candidates = [projectDir, ...fs.readdirSync(projectDir, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).map((d) => path.join(projectDir, d.name))];
  const id = session.replace(/[^\w-]/g, "");
  const ledgers = candidates.filter((root) => fs.existsSync(path.join(root, ".qa", "sessions", `${id}.json`)));
  if (!ledgers.length) return;
  // The ledger format is the post-edit hook's, so both hooks read it with the lib next to them.
  const lib = await import(pathToFileURL(path.join(path.dirname(new URL(import.meta.url).pathname), "../lib.mjs")).href);

  const problems = [], notes = [];
  for (const root of ledgers) {
    const ledger = lib.readLedger(root, session);
    const cmd = `npm --prefix "${root}" run qa`;

    // A run in progress: its results will follow, so do not block the stop now.
    const running = lib.runningRun(ledger);
    if (running) {
      const later = lib.dirtyFiles(ledger, root).filter((f) => (ledger.files[f].editedAt ?? 0) > (running.startedAt ?? 0)).length;
      notes.push(`QA run ${running.pid} still in progress; results will follow${later ? ` (${later} file(s) edited after it started need another run)` : ""}`);
      continue;
    }
    if (ledger.running) delete ledger.running; // stale marker: the process is gone

    // Contact sheets opened since the last scan of the transcript: remember their content hash.
    const transcript = input.transcript_path && fs.existsSync(input.transcript_path) ? path.resolve(input.transcript_path) : null;
    if (transcript) {
      try {
        const scan = ledger.reviewScan?.transcript === transcript ? ledger.reviewScan.size ?? 0 : 0;
        const { reads, size } = lib.pngReads(transcript, scan);
        lib.recordReviewed(root, ledger, reads);
        ledger.reviewScan = { transcript, size };
      } catch { /* unreadable transcript: keep going with what the ledger knows */ }
    }

    const dirty = lib.dirtyFiles(ledger, root);
    const runs = ledger.runs ?? [];
    const last = runs[runs.length - 1];
    const lastEdit = Math.max(0, ...dirty.map((f) => ledger.files[f].editedAt ?? 0));
    const pass = [...runs].reverse().find((r) => r.ok && r.full);
    let review = { required: [], optional: [], unchanged: [], overwritten: [] };
    if (!dirty.length && pass && Array.isArray(pass.sheets)) review = lib.sheetsToReview(root, ledger, pass);
    else if (!dirty.length && pass) {
      // A pass recorded before content hashes: the old rule (every sheet not opened after the run), so an upgrade never
      // re-asks for what the user was already told about.
      const seen = new Set(lib.pngReads(transcript, 0).reads.filter((r) => r.at >= pass.at - 1000).map((r) => r.file));
      review.required = (pass.shots ?? []).filter((s) => !seen.has(path.resolve(root, s))).map((s) => ({ path: s }));
    }
    const unseen = review.required.map((s) => s.path);

    const state = { dirty: dirty.join(","), last: last?.at ?? 0, unseen: unseen.join(",") };
    const prev = ledger.stopGate;
    const same = prev && prev.dirty === state.dirty && prev.last === state.last && prev.unseen === state.unseen;
    const repeat = same && (input.stop_hook_active || prev.notified);
    let notified = same ? Boolean(prev.notified) : false;

    let problem = null;
    if (dirty.length) {
      const list = `${dirty.slice(0, 6).join(", ")}${dirty.length > 6 ? ", …" : ""}`;
      const next = last && last.at >= lastEdit && !last.ok
        ? `The last QA run (${new Date(last.at).toLocaleTimeString("en-GB")}) FAILED at: ${(last.failed ?? []).join(", ")}. Fix every ✗ in your change (report: ${last.report}) and run \`${cmd}\` again. If a failure is outside your change and you cannot fix it, say so plainly in your reply, with the report path.`
        : last && last.at >= lastEdit && !last.full
          ? `The last run was --quick (or had no dev server), which does not count. Run the full gate: \`${cmd}\`.`
          : `Run \`${cmd}\` (it scopes itself to your edits since the last pass), fix every ✗, open the contact sheets it asks for, then deliver with the summary from its report.`;
      problem = { agent: `You edited ${dirty.length} UI file(s) in this session (${list}) without a passing full Build-QA run after the last edit. ${next}`, user: `⚠ Build-QA: ${dirty.length} UI file(s) ended the turn without a passing QA run (${list}). Ask Claude to run \`${cmd}\`.` };
    } else if (unseen.length) {
      const list = unseen.join(", ");
      const optional = [...review.optional, ...review.overwritten].map((s) => s.path);
      const extra = [
        optional.length ? `Optional (${optional.length}, lower priority${review.overwritten.length ? "; some were overwritten by a later shot" : ""}): ${optional.join(", ")}.` : "",
        review.unchanged.length ? `${review.unchanged.length} sheet(s) are unchanged since you reviewed them and are not needed.` : "",
      ].filter(Boolean).join(" ");
      problem = { agent: `Build-QA passed; ${unseen.length} contact sheet(s) are new since your last review. Open each with Read and review it with the UX rubric in skills/zen-build-qa/SKILL.md (hierarchy, spacing rhythm, alignment, states, copy, mobile): ${list}.${extra ? ` ${extra}` : ""} Fix what you see in your change and re-run the gate, or deliver saying what you checked.`, user: `⚠ Build-QA passed but ${unseen.length} new screenshot(s) were not reviewed: ${list}.` };
    }
    if (problem && repeat) { if (!notified) notes.push(problem.user); notified = true; }
    else if (problem) problems.push(problem.agent);
    ledger.stopGate = { ...state, at: Date.now(), notified };
    lib.writeLedger(root, session, ledger);
  }
  if (problems.length) process.stdout.write(JSON.stringify({ decision: "block", reason: `Zen Build-QA gate — not ready to deliver yet.\n${problems.map((p) => `• ${p}`).join("\n")}${notes.length ? `\n${notes.join("\n")}` : ""}` }));
  else if (notes.length) process.stdout.write(JSON.stringify({ systemMessage: notes.join("\n") }));
}

main().catch(() => undefined).finally(() => process.exit(0));

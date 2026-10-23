# Session log 2026-10-24

## Backlog triage · "Backlog (plan before opening sessions)" (tier XS, docs only; started by the progress session)
- All 53 entries checked against main 545216b6: grep, the named files, git history, and two read-only Figma variable
  reads (Bubble-Chat-Others-Business is Surface/Default in all nine modes; Popover-Search is still NaN in S1–S6).
- 10 done, 2 stale, 3 duplicates of archived entries, 25 partly done (rewritten to what is left), 13 still open
  (5 kept as written, 8 merged into group entries). 48 originals archived with their verdict, text unchanged.
- Left: 35 entries under 7 owner groups (business, Studio, components, designer, platform, tooling, design check);
  4 P2: the LICENSE review, the registry's user steps, ModalForm `header={false}` without a name (a11y), and the
  contrast/targets baseline seeding. "## Open items" untouched; nothing P1-urgent found. No work started.
- User "Giao 35 mục theo đề xuất": the Designer entry moved to QUESTIONS.md / .vi.md as the 2026-10-24 designer batch.

## Gate: `--failed` re-runs only what failed (process audit B.2; the user's go 2026-10-24) (tier S, tools/qa)
- `npm run qa -- --failed`: after a failing full run with nothing in its scope edited since (the ledger's editedAt), the
  gate keeps TypeScript, the Figma contracts and Vitest where they passed, runs the quick static gates again, the browser
  steps only on the pages that had an error or no report (`retryPagesFrom` in lib.mjs reads the last run's audit /
  dark / behaviour JSON), and the Studio E2E only if it failed; a pass marks the files passed as a full run would.
  Anything edited, a passing or quick last run, or a missing report → it says why and runs everything.
- qa:selftest 26 → 30 checks (the page choice); a static-only run against a fake failed ledger skipped TypeScript and
  re-ran the failed self-test (the fake ledger and its report removed after).


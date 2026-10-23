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

## Tooling fixes (#264; tier S–M; the user's go 2026-10-24)
- `avatar/solid-initials-contrast`: measured today's tokens (both themes the same): golden 2.58, teal 2.70, cyan 2.96,
  orange 2.98 below 3:1; green 3.48 and bronze 3.38 pass, so the rule lists golden | teal | cyan | orange (fixtures,
  guideline, the sidebar example's comment).
- `-shadow-off`: `token-outputs.mjs` declares each companion in every component theme (`initial` where not tinted);
  tokens.css +66 lines, no value changed; Chromium check of a Neutral-S4 chip inside Neutral-S3: the shadow is back.
  `tokens:check` counts gaps (66 on main, 0 here).
- Audit `edges`: a focused element's outline / ring is not a frame. Gate: `pidIsQaRun` (a reused pid is stale).
  Baseline notes follow fix-at-once. Playground empty slots → example-patterns §3c; APFS backups → zen-build-qa §2.


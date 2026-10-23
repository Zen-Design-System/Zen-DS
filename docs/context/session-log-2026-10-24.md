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

## Contract suites, batch 2 (tier L; BACKLOG P3, the user's go 2026-10-24 through the progress session)
- 66 suites, written by seven parallel helpers (one per group, case kinds in `tools/figma-contract/cases/<group>.tsx`,
  merged by cases.tsx so they never shared a file): Avatar/Single, Avatar/Stack, Avatar status, Badge, Badge-Counter;
  Segmented Item (a SegmentedItem-in-Segmented kind), Segmented, Toggle, Toggle-Button, Toggle Content, Breadcrumbs (3);
  nine Input fields; eleven Input parts, Search/Default, Search/Popover (+ a light/neutral-s4 mode), Divider; thirteen
  Table cells; seventeen DatePicker and Sidebar parts; three Chat sets. `.Primitives/Date-Picker` 9923:2323 has none
  (code has no sheet header): BACKLOG. All 105 suites + 25 interaction checks pass (one by one, niced, beside another session's --all gate).
- Code drifts fixed at their owners (CHANGELOG): Avatar, Badge, Input (six), Table toggle columns, DatePicker (six),
  Sidebar (four, incl. the Workspace width 340 → 320 Compact). I read every diff before the commit; tsc, style:check,
  usage:check clean.
- Figma-side inconsistencies → `figmaExceptions` + QUESTIONS.md "From the contract suites, batch 2"; resolved:
  QUESTIONS Segmented (P2) binding, the BACKLOG Breadcrumbs "4px list padding" (both captures pad 0). New BACKLOG: the
  APIs the suites asked for, the checker gaps. Linux fonts (#252): no text-decided width or x is asserted.


# Session log 2026-10-23

## Session B · Example className round 2, PR 1 (tier S; user decisions 2026-10-23, spec examples-classnames-round2-spec-2026-10-23.md)

Branch zen/chore/examples-classnames-20261023. The coverage BACKLOG item (P3–P4) had been merged on 10-13; examples
added since brought 177 className back. PR 1: classes with a Figma-equivalent prop become props.
- Direct: calendar planner Card `maxWidth={420}`, schedule planner Stack `maxWidth={420}`, colour-picker panel
  `<Box width="fill" maxWidth={360}>` (was a div).
- Fill + min width, measured on an isolated server (natural width, line and siblings at 1512 / 768 / 390 / 320):
  list-item search `width="fill" minWidth={200}` (natural 220 would overflow a 320 phone; wrap point 299 instead of 319);
  toast title block `minWidth={160}` (= natural, same wrap point). Kept as CSS: the search page's toolbar (natural 445
  shrinks to 248 on a phone because its chips wrap inside: no min width keeps both) and the date picker's Form (Form has
  no size props).
- Visual diff 102 panels at 1512 / 390 / 320: identical. Gate PASS (5 pages; audit, dark, behaviour, contact sheets
  looked at).
- My slip: I stopped my isolated server with pattern kills (`pkill -f "tail -f /dev/null"`), which can hit another
  session's processes; memory updated (TaskStop or exact PIDs only).

## Backlog triage · P2 / P3 open items (tier XS, docs only; user: "rà 54 mục P2/P3")
- Each of the 53 P2 / P3 entries (B's className round 2 left to B) checked against main 4b96bbb8, merged PRs and open
  branches. 5 done or answered (#155, #193, #50/#99, the user's White-Overlay call, round 2 supersedes the 112 classes);
  20 merged into 5 (chart designer questions, AI UI × 2, direct paste, Figma contracts) and the Popover label into
  QUESTIONS.md "Contrast in light mode"; 4 rewritten to what is left (Variables v2: E5 came with #151; navigation
  surfaces; chart push data; UX polish → the design check); 8 are closed by open PRs or branches (#223, #225, #226,
  workflow-badge-status, studio-parity-leftovers). Also archived: the P6b remains, the empty "Phone decisions" heading,
  and 9 plan-section entries already marked done (PR #5, I-15) or done by #141. 38 archive entries in all.

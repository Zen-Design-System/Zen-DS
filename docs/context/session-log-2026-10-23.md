# Session log 2026-10-23

## Shape examples: coverage (tier S; gate finding with no owner, assigned by Giám sát)

Branch zen/fix/shape-examples-coverage-20261023 from main e07ae5ae. BACKLOG "P3 · Shape examples: coverage (2026-10-17,
gate ④)": the page had 9 examples and no states, edge cases, phone or keyboard / a11y example.
- `src/platform/examples/pages/shape.tsx` (now `keepOnHotUpdate`, as example-patterns §8), three examples:
  - **A seat map with labelled marks** (states + keyboard / a11y): four seats, each a labelled ellipse (role img), its
    number aria-hidden; Segmented buttons pick the seat, taken seats disabled there and drawn as outlines (form and
    words, not colour alone); a role="status" line.
  - **Arc and star at the edge of their range**: Sweep 0 % (nothing drawn, the box kept), Ratio 96 %, a 16-tip star
    at Ratio 10 % and 0 % (no fill area left: a centred stroke).
  - **Onboarding art on a phone**: PlatformPhone, TopNavigation compact-alt with Back, ActionBar Next / Skip / Start
    collecting (a toast, then step 1), each screen's art in a 240 × 200 free frame, Accent leading.
- BACKLOG line removed; CHANGELOG line.
- Gate finding met on the way, fixed at its owner: usage:check warned interaction/action-without-handler on
  DesignPanel.tsx:696, a `// … (<Button>Save</Button>)` comment (#219). engine.mjs skipped block comments only; it now
  skips line comments too (never after ":" or a quote, so a URL stays code). Fixtures: the comment case in good.tsx, a
  tag after "https://" still caught in bad.tsx. usage:check 0 warnings.
- Static: tsc, usage:selftest, usage:check, style:check, guidelines:check, ai-ui:check, ai-kit:check, mcp:selftest,
  tokens:check: all exit 0.
- Gate (Giám sát's slot, `--isolated --only=shape`): run 1 FAIL — at 320 the seat map (264 + a 6-item Segmented)
  overflowed; warnings: Segmented 6 items (keep 2–5), the onboarding's gap 2xl (40, off the ladder here). Fixed: four
  seats in a 240 frame, gap xl, the onboarding content centred in the screen (height fill). Run 3 **PASS** (0 ✗, 0 ⚠);
  contact sheets 390 / 1512 looked at.
- Stale BACKLOG lines removed (both shipped in #214, 032d8fbd): "P3 · AppShellHeader `theme` / `density` to and from
  Figma" (79f07c77: Header/AppShell with theme, density and slots, read back) and "P3 · Card `subAction` to and from
  Figma" (bac4f867: Sub-Action through the wrapper, its icon). "P3 · Card contract predates Figma's Sub-Action wrapper"
  stays: nested-layers.json was last captured 2026-10-17.

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

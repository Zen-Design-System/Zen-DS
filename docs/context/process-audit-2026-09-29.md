# Process audit — 2026-09-29

The user asked for an audit of how we work (sessions, QA gate, docs, Figma sync) and a proposal that is less redundant,
faster and more accurate. Evidence was gathered read-only by three agents (QA gate and hooks; written process and
skills; Figma sync tooling) from `.qa/reports`, `.qa/runs`, session transcripts, workflow journals and the docs.
Nothing here is approved work: it is a proposal. Approved parts move into the HANDOFF Backlog as batches.

## What the numbers say

| Area | Measured | Source |
| --- | --- | --- |
| QA gate | 50 runs on 28–29/9, 5.98 h of gate time, 12 failed (6 because of other sessions' unfinished work, 2 real) | `.qa/reports/*.json` |
| QA gate | ~39 s per page, all serial (audit 48%, behaviour 29%, screenshots 13%); median run 234 s, p90 1,090 s | `.qa/runs/*` timings |
| QA gate | 4 `--all` runs = 35.6% of gate time; 3 of 4 failed; they found 1 issue caused by the change | reports 07-06-11, 14-50-24, 15-25-59, 18-51-31 |
| QA gate | 143 of 276 page-runs re-audited pages that were clean in the previous run (≈1.8 h) | consecutive runs per session |
| QA gate | the ledger never resets: a one-line copy fix in `PlatformShowcases.tsx` re-checked 7 pages and 14 sheets | `post-edit.mjs:63`, `run.mjs:58-59,251` |
| QA gate | 1,066 contact sheets listed, 655 opened, 30% re-reads; 1512 sheets show text at ≈0.31× (unreadable) | transcripts, `shoot.mjs:34` |
| QA gate | 10 of 14 Stop-hook blocks fired while the session's own QA run was still going | hook events vs run windows |
| QA gate | 1,265 of 1,270 ⚠ repeat every run (contrast, targets have no baseline); the gate says "triage every ⚠" | reports, `run.mjs:258` |
| QA gate | token/global CSS edits map to a fixed 7-page set that missed input and chip on 29/9 | `lib.mjs:40,75` |
| Docs | ≈1,531 lines to read before the first edit (+300–550 for Figma work); 3 read orders disagree | AGENTS.md, HANDOFF.md, docs/context/README.md |
| Docs | the same rule copied in 3–7 files (shadow rule 7, read-only 6, concentric radius 6, coverage matrix 5) | grep |
| Docs | skills still order "turn every bug into a rule / fix touched debt / add the missing example", against the Scope lock | zen-build-qa, zen-platform-qa, build-qa-process.md |
| Docs | three verification levels for one token change (computed-style check / scoped qa / mandatory `--all`) | token-sync skill, AGENTS.md, build-qa-process.md:132 |
| Docs | claude.ai plugin skills describe the old Cowork environment (device_bash, project_write); zen-ds-ship always pushes a PR | plugin SKILL.md files |
| Figma | the extractor preamble throws in `use_figma`; all 7 parity agents failed their first call; 6 hand-fixed copies | workflow journals, scratchpad |
| Figma | agents re-typed 197K chars of capture JSON through Write (20 KB output cap); 18 one-off measure scripts | scratchpad/figma-0929 |
| Figma | captures store resolved colours, so moving a set into an S4 frame changed every hash | Search/Popover, 29/9 |
| Figma | 69 of 92 captured sets have no contract suite (all of today's groups except Checkbox/Radio) | docs/figma-contracts, suites |
| Cost | the 6-value token update got a 49-agent audit (3.69M tokens, 23.6 min) plus two gate runs; the binding check that covers it takes ≈4 s | workflow wf_3d2d1413, `run-all.mjs` |
| Cost | the 9-component parity update: 8 agents, 1.84M tokens, 30 min, 412 tool calls (≈150 avoidable with a kit) | workflow wf_cbafd934 |

## Proposal

### A. Proportional process (effort S, docs + small tool changes)

1. **One tier table in AGENTS.md** that every other doc defers to:
   - XS (token value, copy, one CSS value): no spec card; `qa` on consumer pages; review changed cards only; CHANGELOG line.
   - S (one component or example): spec card for changed elements; scoped `qa`.
   - M (Figma re-sync, 1–3 components): evidence table, contract re-capture, suites + scoped `qa`.
   - L (new component, typography or spacing scale, shell, `_shared`): full recipe, `--all`.
2. **Token changes scope by consumers**: after `tokens:build`, grep the changed vars (alias-expanded) in component CSS
   → pages → `qa --pages=…`, plus the contract suites that bind them. Drop "`--all` is mandatory for tokens"
   (`build-qa-process.md:132`, `zen-build-qa:92`, `lib.mjs:75`).
3. **Ledger resets after a pass**; `--only` narrows scope; notes stop repeating (`post-edit.mjs`, `run.mjs`).
4. **Stop hook knows a run is in progress** (pid in the ledger) and asks only for the sheets of changed cards,
   capped at ~12, at full resolution.
5. **Static gates scoped to the change**: harness self-tests only when `tools/usage-guard` or `tools/style-guard`
   changed; guidelines check only for edited slugs; post-edit runs `guidelines:build` when a component's JSDoc changes
   (a forgotten build failed a gate on 29/9).
6. **Baseline contrast/targets**; the gate says "triage NEW ⚠, the rest goes to the Backlog".
7. **Remove the instructions that override the Scope lock** (make-it-stick, fix touched debt, coverage ⚠ → add an
   example): they become "one Backlog line".
8. **Fix the Figma extractor once** (`globalThis`, README for `use_figma`), delete the 4 workaround notes.

### B. Faster gate (effort M)

1. Parallel workers (N contexts in one browser, adaptive to other gates via a lock file); screenshots taken during the
   audit instead of 2 Chromium launches per page; static gates run beside the runtime steps. Median run ≈234 s →
   ≈80 s; `--all` ≈31 → 8–10 min.
2. Re-run only failed steps/pages when nothing changed; stop early when static fails.
3. A screenshot folder per run (23 cross-session overwrites seen); stable baseline keys (no px or hint text).
4. `--all` becomes a visual-diff pass that audits only pages whose pixels changed; the full 61 pages is for release.

### C. Figma kit (effort M)

1. `tools/figma-contract/figma-call.mjs capture|status|delta` prints the exact `use_figma` code; a shared
   normalizer/hash makes captures mode-independent (drop `c` when a paint is bound, drop text bindings under a style,
   record extractor version, file key, date and modes).
2. `contracts.lock.json` + `delta` + `contract-patch.mjs`: an orchestrator checks all sets in 1–2 calls and spawns
   agents only for changed sets; contracts are written one variant per line so git diffs mean something.
3. `check.mjs` flags (`--contract`, `--mode`, `--json`), per-kind case files, a text-width tolerance and a coverage
   ratchet (a dropped check count fails).
4. `measure.mjs` for per-state computed styles (replaces the 18 one-off scripts).
5. Suites next: Input family (+ radius modes), Search/Default + Search/Popover (with Neutral-S4), Segmented, Toggle,
   Breadcrumbs, Table cells, Chat bubbles: suited variants 54% → ≈87%.
6. Tokens read live through `use_figma` (per-collection hash → changed variables only); zip exports become a
   fallback. `tokens-impact.mjs` maps changed variables → suites + modes → CSS → pages.
7. `fallbacks:sync`: 79 of 372 hex `var()` fallbacks no longer match their tokens.

### D. Less to read, less to write (effort M)

1. HANDOFF ≈80 lines (state, gate, owners, top-5 Backlog); Open items and Backlog move to `docs/context/BACKLOG.md`;
   CHANGELOG and design-system-context read on demand. Session start ≈1,531 → ≈320 lines.
2. One source per rule (component-usage-rules + generated guidelines; gate mechanics in zen-build-qa); the Vietnamese
   process docs become short summaries with links.
3. Session-log entries ≤30 lines with a link to the QA report; CHANGELOG only for user-facing changes.
4. Clean memory: duplicates, stale counts, "the repo has no git", a dangling link.

## Skills and plugins

- **New repo skill** `zen-figma-resync` (or a tier-M mode of `zen-figma-component-audit`): hash-diff live Figma vs
  contracts → changed variants only → fix existing-variant mismatches → re-capture → suites + scoped qa → designer
  questions to Open items. Built with `skill-creator` once kit C1–C2 exists.
- **Move token sync into the repo** (`skills/zen-token-sync`): live `use_figma` variable reads, consumer-scoped QA,
  the gotchas from memory. Refresh or retire the claude.ai plugin skills (`zen-ds-token-sync`, `zen-ds-ship`,
  `zen-ds-figma-to-code`, `zen-ds-ai-spec`, `zen-ds-port-platform`): stale environment text, and ship's "always push
  a PR" contradicts "commit or push only when the user asks".
- **Plugins:** nothing new is needed. The Figma plugin (figma-use, figma-design-to-code, figma-code-connect) and the
  Design plugin are enabled; `use_figma` works through the claude.ai connector. Optional later: Axe Accessibility
  (keyboard-guided tests beyond the Vitest axe baseline) and code-review (once PRs are opened). Not recommended:
  community figma-suite / Claude2Figma (privileged reach, overlap with the contract kit).

## Suggested order

1. A (one session, mostly docs and small tool edits): the biggest cut in waste for the least effort.
2. C1–C2 + the Search/Segmented/Toggle/Breadcrumbs suites: the next Figma update needs them.
3. B1–B2: gate speed.
4. D: reading and writing load.
5. C3–C7 and the new skills.

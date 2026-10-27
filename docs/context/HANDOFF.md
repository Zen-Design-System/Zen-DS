# Handoff — read this first in a new session

The short, current picture of Zen DS: state, gate, owners, where the details are. Keep it under ~90 lines. When a
session changes this picture, edit the matching line here, add a CHANGELOG entry, and put the detail in
`docs/context/session-log-<date>.md`. Long state text belongs in `HANDOFF-details.md`, work items in `BACKLOG.md`.

Last updated: 2026-10-27.

## Read order

1. This file.
2. [`AGENTS.md`](../../AGENTS.md): tier table (§C), how to build or change a component, the gate commands.
3. [`BACKLOG.md`](BACKLOG.md): only when picking up work or logging a follow-up. Items that wait on the user or the
   next phase are in [`BACKLOG-user-and-later.md`](BACKLOG-user-and-later.md) (since 2026-10-25).
4. [`HANDOFF-details.md`](HANDOFF-details.md): full state (versions, token syncs, contracts, harness), gate detail, house
   rules. `grep -n` it by topic.
5. On demand for the area you touch: [`CHANGELOG.md`](../../CHANGELOG.md), [`component-usage-rules.md`](../component-usage-rules.md),
   the latest `session-log-*.md` (search by component name), [`design-system-context.md`](design-system-context.md).

## State in short

- **Studio first view + Figma-like inserts (2026-10-27, UX review §7.3–4):** branch
  `claude/studio-first-view-insert-20261027-2f7881`. A page you made opens at its first Screen (one row of frames
  fits, ≥ 25%) and reopens at its remembered viewport (localStorage); in a Screen without auto layout an insert floats
  beside the selection at its own size with the page gap (`edit/insertPlace.ts`, `edit/freeBlock.ts`,
  `canvas/firstView.ts`). Root cause of §2.3 was a page field's `autoFocus` scrolling the viewport (session log).
- **Studio UX review §7 items 6–8 (2026-10-27, words · grouped properties · Dark mode UI-only):** branch
  `claude/studio-words-props-dark-20261027-b8fcaa` (the review's BACKLOG line names it `zen/fix/studio-words-props-dark-20261027`).
  Design words through `words.ts` (`layerLabel`, new phrases) and the owning components; `SectionNote` (one line + info
  tooltip); `inspector/sizeNote.ts` (the size badge's note, published by the canvas — the badge side is with session
  studio-gestures); `inspector/propCategories.ts` + `GroupedProperties` groups (Content · Look · Behavior · Advanced,
  `FLAT_GROUPS` for components without Figma groups); `shell/modes.ts` `setStudioTheme` (chrome only) and
  `setPreviewTheme` (the frames). E2E I-35…I-38, S-08, S-09. Detail: session log 2026-10-27.
- **Studio UI/UX review (2026-10-27, docs only):** `docs/research/studio-ux-review-2026-10-27.md` — five hands-on
  walks on the user's pages, the Figma-key E2E walk, axe, a UX-writing audit (40 strings), 15 screenshots. Ranked
  proposal §7 approved by the user 2026-10-27, in order: P0 double-click / Enter land on DOM parts with a CSS panel and ⌘A / ⌘D die after
  that; P1 first view at the overlays, full-width inserts, Prototype list clipped, phone tool rail; P2 words, notes,
  grouped instance properties, dark-mode coupling. Decisions: §2.4 inserts keep their own size (A); §2.9 Dark mode
  changes the UI only, as Figma. In progress in four worktree sessions from main (BACKLOG.md Open items):
  `zen/fix/studio-gestures-20261027`, `claude/studio-first-view-insert-20261027-2f7881` (PR #334, below), `zen/fix/studio-panels-small-20261027`,
  `zen/fix/studio-words-props-dark-20261027`. Docs PR #332. Items 5, 9, 10 (session panels-small) done: PR #335
  (Studio: Flow list at 320 / 280, the phone tool rail's More menu, the §2.10 small things, every Inspector tab with a
  panel) and PR #336 (library Tabs `aria-controls` only with an `idPrefix`); the 12px tab tone (3.79:1) stays the
  user's question.
- **Studio UX review 2026-10-27 (`docs/research/studio-ux-review-2026-10-27.md`, §7 approved in order):** items 1–2 (P0,
  gestures) built on `claude/studio-gestures-20261027-17240d` (the app's name for `zen/fix/studio-gestures-20261027`): a double-click and Enter take the ⌘-click path into an
  instance (`select/parts.ts deepLayerAt`, `select/layerParts.ts firstLayerPart`), HTML parts are off the Design tab
  (`inspector/PartPanel.tsx`; the Code tab keeps their CSS as `PartCodeDetails`), ⌘A / ⌘D / Delete work with a part
  selected (`edit/figmaKeys.ts`, `StudioApp.tsx`); E2E FW-255…258; PR #337 (gate PASS, 388 E2E rows). Items 3–10 are in the three sibling sessions
  (first-view-insert, panels-small, words-props-dark), one worktree each from main.
- **Studio responsive breakpoints (2026-10-26):** plan `docs/research/studio-responsive-breakpoints-2026-10-26.md`
  approved (D1–D4; D5, a harness rule, not). Session bp-studio builds the Studio half: PR 1 (view switch Desktop ·
  Tablet · Mobile on a Screen's label, the Screen's breakpoint in ZenContext and following a desktop Screen's width,
  Changes on this breakpoint, Add Top / Bottom Navigation placeholders, Make a separate Screen + `versionOf`, Play's
  width drag; six component CSS files on `[data-breakpoint]`) on `claude/responsive-studio-b28ea5`, merged with bp-layout's
  responsive Stack / Grid / Box props as train #310 (in main 9fa8ef52). PR 2 (per-breakpoint fields, Hide on
  <breakpoint>, MCP shape) on `zen/feat/studio-responsive-fields-20261026`. E2E rows BP-01…08 (PR 1), BP-09…13 (PR 2).
- **BadgeStatus + PropertyField (2026-10-21):** branch `zen/feat/property-field-20261021` (worktree
  `../Zen-DS-badge-status`): Figma Badge-Status 16932:195 and Input/Property-Field 16923:6031 approved by the user, then
  code, platform pages (Badge, Input), harness rules, Studio palette + push/pull. Rule since then: new components go
  Figma draft → user review → code + Studio. Open items in BACKLOG (themed-Badge migration, Figma gaps).
- **Component best-practice refactor (2026-10-14):** branch `zen/refactor/component-best-practices` in worktree
  `../Zen-DS-refactor`, not merged. Shared helpers in `_shared` (controllable state, stable callback, merged refs,
  layers, modal isolation, HTML sanitiser), every component takes `ref` as a prop, conformance test. Details: session log
  2026-10-14, review list `docs/qa/component-review-checklist.md`.
- **AI UI runtime (2026-10-14):** branch `zen/feat/ai-ui-runtime-20261014`, not merged (the user: no merge without a
  request). `@zen-ds/react/ai-ui` renders, validates, prints, lints and edits the JSON spec a model composes from
  `docs/ai-ui/catalog.json` (generated; `npm run ai-ui:build` / `ai-ui:check` / `ai-ui:selftest`, tests/ai-ui). Read
  `docs/ai-ui/README.md` (files, spec, runtime, catalog rules, findings, the 5 open decisions in BACKLOG "AI UI"). The
  platform page Patterns › AI UI (`?page=ai-ui`, app layer) shows it at work with a deterministic composer;
  `@zen-ds/react/ai-ui/compose` runs the real loop with the app's model function (`…/ai-ui/server` mounts it,
  `…/ai-ui/adapters/anthropic` is the Claude API adapter, the dev server serves `/ai-ui/*` with `ANTHROPIC_API_KEY`),
  `createLiveComposer` composes while typing (the user's decision 2026-10-15: "lúc gõ") with `extractSlots` (title /
  date / time / people / place on the device, en + vi), a template per intent pre-filled from them, Tab = keep
  (`accept`), Escape = clear, Enter = the UI's primary action (`primaryActionOf`; `AiChatField` `onAccept` /
  `onClear`), and `zen-ds-mcp` has
  `get_catalog` + `check_spec`; `npm run ai-ui:eval` measures the loop on 20 prompts (valid-spec rate, wrong UI, time
  to first UI, the classifier on partial input; `--dry` and `--classifier-only` need no key; the first live run needs
  `ANTHROPIC_API_KEY`). PR #64 merged 2026-10-15; the follow-ups (`anthropic-workspace-id` for multi-workspace
  keys, a visible reason when the model call fails) were PR #74, merged by the user 2026-10-15 16:48Z. The commits
  since then (cea2b95 … f23a27f) are in `main` through PR #83 (merged 2026-10-16, f420bb8): the live-composer UX study
  (`docs/research/ai-ui-live-composer-ux-2026-10-15.md`: ShapeShift reference, plan P1 … P4) and its P1 steps on the
  page: composed forms on a flat Card, "Composed while typing" as the composer card (type row, slot chips, form once
  sure, key hints + primary action), and the Zen AI screen as the product (bar, Liquid Glass field the thread scrolls
  under, bubbles fading in, "What Zen AI sees" panel, a frosted sphere while the AI works), the composer on a phone
  (card above the field), real-time listening and the free intent (any sentence reaches the composer; the model when
  configured). P2 … P4 wait for Figma (tentative look,
  dashed add-chip, Kbd, AI-glow gradient tokens, the Composer-Preview pattern) and the user's three open questions in
  the study. Still open: where the classifier runs in the product (the kit's default is on-device keywords, the model
  only once an intent is likely).
- **Git:** work is on `claude/zen-ds-0.4.0`, pushed to origin (the user allowed direct pushes to it, 2026-10-08); no
  pull request yet, `main` still points at `eafb0de`. Zen Studio (`tools/studio/`, `src/platform/studio/`) is committed
  on the branch since the 2026-10-08 parallel-agent merges. Open a PR only when the user asks.
- **Source of truth:** the live Figma file `9nZv4uW2LT21yuHabMTCh1`, read-only through `use_figma`. The older key `yhWJ…`
  in some docs has no MCP access.
- **Studio projects + theme (2026-10-17, phase 1):** branch `zen/feat/studio-projects-theme-20261017` (worktree
  `../Zen-DS-projects`). Projects like Figma files; each theme is one extra Base Colors (Project) mode
  `data-brand="p-<id>"` in `.zen-studio/projects/<id>/` (never tokens/source). Spec, gotchas and phases 2–3:
  `docs/research/studio-projects-theme-2026-10-17.md`.
- **Zen Agent in Studio, vibe design (2026-10-18):** plan `docs/research/studio-vibe-agent-2026-10-18.md` (user
  decisions §1, V-1 baseline §7, V1 plan §9). **V0 merged** (#122): panel beside Pages | Layers (⌘J), Tool Runner in
  the dev server over the Studio MCP tools through the relay, zen-ds knowledge, the usage harness after each changing
  turn (`tools/studio/README.md` §6). **V1a built** on `zen/feat/studio-agent-v1-20261018` (worktree `../Zen-DS-agent-v1`):
  model picker, Undo turn, `ask_person`, pictures, ordered reply parts, canvas flash for any MCP client. Checks offline
  (`agent.selftest`, E2E AG-01…12 with `ZEN_AGENT_SCRIPT`); the first live run needs the user's key. V1b waits.
- **AppShell patterns (2026-10-18, Figma; reviews 1–3 answered):** ◇ Master-Layout section 16254:1057 —
  `Pattern/AppShell/Desktop` (Layout × Collapse, Status-Bar for iPad landscape), `Pattern/AppShell/Mobile` (Device Phone |
  Tablet portrait × Top × Bottom), `Pattern/AppShell/Duo`, Pane, `Action-Bar/Mobile`; Header/AppShell gained a Sections
  slot (rows under the main row, code AppShell sections); status bars have Style Default · Black Overlay · White Overlay.
  Since 2026-10-26 (branch `zen/feat/appshell-placeholder-20261026`) the AppShell everywhere in code and Studio (playground,
  Main component sets, Assets item, new page, Screen parts) is Figma's placeholder from `tools/studio/appshell-placeholder.mjs`;
  real apps are the App Shell page's "Layout examples".
  Templates rebuilt on it (user: archive the old screens, leave Ecommerce and Logistic): HR-Platform 22, Performance 21,
  Finance 10 and Social 17 done (originals in each page's "Archive · before AppShell" section). Empty-State has Size Medium (240) | Small (200) in Figma and code (EmptyState sm, Studio Size, push/pull). Studio phase 1 + device simulator and the floating bottom-nav fit: branch zen/feat/appshell-frames-20261018 (QA PASS, PR next). Detail
  in session-log-2026-10-18.
- **Code AppShell rebuilt from scratch (2026-10-19, user: "Phá hẳn, migrate hết"; in progress):**
  - Branch zen/feat/appshell-patterns-20261019, worktree `../Zen-DS-appshell`.
  - New API: `pattern`, `collapse`, AppShellHeader, AppShellPane, the mobile pattern; no aliases. Spec:
    `docs/research/appshell-rebuild-2026-10-19.md`.
  - Templates, HR, appLayer, the harness and Studio are migrated (all studio:selftest steps pass).
  - The platform page `app-shell` is Figma ◇ Master-Layout · Example sections A–F (41 screens, Figma's own photos) in
    `src/platform/examples/pages/app-shell/*`, plus six behaviour examples.
  - Phase 3 is done: the screen and phone app examples on all 32 platform pages run on the new shell. On a phone, a
    trail turns into Back (`_shared/trail-back.tsx`).
  - The audit and harness follow the user's 2026-10-19 rules: APCA contrast, h1 ≥ Heading/1 (Display allowed), and
    Gap/3XSmall on the ladder.
  - Three gate runs on 2026-10-20 (session-log-2026-10-19, the AppShell section) found the following, all fixed at their
    owners:
    - The Sidebar collapse button remounted.
    - The phone header squeezed its actions; header niceties now step aside (`.pf-wide-only`).
    - ChatComposer and a narrow desktop ChatThread at 320.
    - E2E rows read the old padded content Stack.
    - A JSX-text comment in B4.
  - E2E shards are 336/0. The PR follows the app-shell and ai-ui re-audit.
  - Detail in session-log-2026-10-19.
- **Calendar / Schedule / Timeline (done, on main 2026-10-22):** Figma ❖ Calendar 16121:3, ❖ Schedule 16121:6,
  ❖ Timeline 16121:9 (drawn 2026-10-17, approved 2026-10-21), in code + Zen Studio: Calendar #180 (5 views + 7
  primitives), Schedule #197 (4 views + 5 primitives), Timeline #198 (3 views + Item + 4 primitives); pages `calendar`,
  `schedule`, `timeline`; specs `docs/research/{calendar,schedule,timeline}-2026-10-21.md`, detail session-log-2026-10-21.
  Conventions they set: date props take ISO strings (Studio pages hold literals), data objects say `kind` (an object
  with a string `type` reads as an AI UI node), array props are plain arrays (build-api reads no `readonly`), wide
  views keep a minimum column and scroll or wrap in a narrow box. Open: BACKLOG P2 (designer) on the mobile Toolbar title.
- **Studio simulator + Open on phone (2026-10-21, on main):** Android phone 412×917 and tablet 1280×800 (#190); Open on
  phone, Play's QR to a real phone over the Wi-Fi through a token proxy, dev server stays on localhost (#191; `uqr`
  devDependency).
- **Widget themes phase 1 (2026-10-13, Figma only):** Card +`Color` (7 hues) and Themes Gradient/Solid (72 variants),
  gradient + On-Color chart styles from tokens, Metric-Card `Type` (KPI, Sparkline, Spark-Bars, Goal-Progress,
  Comparison, Category-Bar, Hero) and 7 new card-less chart components (Area/Stacked, Grouped-Bar, Combo, Gauge, Funnel,
  Bar-List, Bullet). Phase 2 is in code and Studio; the gradient themes were dropped (2026-10-14). Since 2026-10-23
  the harness mirrors the Figma theme audit (theme/* rules, Card guideline) and a Canvas/Alt Sidebar sits on the canvas.
- **Chart Color (2026-10-23):** Figma Color = Primary | Secondary on ten chart sets ↔ `palette` in code and Studio
  push/pull (Gauge/Funnel/Bullet are sets: CHART_SETS holds the set ids). Harness `chart/palette-by-hand`.
- **Figma descriptions + AI kit (2026-10-13):** every public set, the semantic/spacing/radius/breakpoint variables and
  every style in the file carry descriptions from `tools/figma-docs/build.mjs` (rerun after a rule change; the user
  approved writing them); the old texts are in frame "Description backup 2026-10-13" on 🔒 ARCHIVED until the user
  reviews and publishes the library. 🔤 Typography has a Content-Hierarchy section. Installation › AI kit for Figma
  downloads the skill `skills/zen-figma-design` + its audit harness (`npm run ai-kit:check`).
- **Library:** every Figma component is built (60 folders in `src/index.ts`, 49 guideline slugs). API vocabulary,
  labels (en/vi), `data-tone` variants and the harness are described in `HANDOFF-details.md` ("Vibe-code readiness").
  Since 2026-10-03 Stack/Grid/Box (and Text/Heading on the width axis) take Figma sizing: `width`/`height` hug · fill ·
  px, min/max, `alignSelf`, Stack `fillChildren` (`src/components/Layout/sizing.ts`, rules at the end of `layout.css`);
  since 2026-10-13 Card and ListBox take the width half (`width`, `minWidth`, `maxWidth`, `alignSelf`).
  Since 2026-10-26 (responsive-breakpoints plan P2, `docs/research/studio-responsive-breakpoints-2026-10-26.md`) Stack,
  Grid and Box structure props take `{ desktop?, tablet?, mobile? }` plus `hideOn`, resolved in JS from the frame's
  breakpoint (`_shared/responsive.ts` `resolveAt`; Grid `columns` too); push/pull rules in `tools/studio/responsive-props.mjs`.
  The Studio half (view switch, ResponsiveField, the Screen giving its breakpoint as context) is session bp-studio's.
  Since 2026-10-05 Text/Heading/Icon `tone` takes every resting Color/Content token by its path (81 tones, old names are
  aliases; `src/components/_shared/contentTone.ts` + `content-tone.css`, test `tests/content-tone.test.tsx`).
- **Tokens:** repo-only modes 2026-10-09 (user): Component Size, Typography Configuration and Corner Radius have a mode
  "Studio" for the Zen Studio chrome (ChromeScope); not in Figma — keep them on the next sync (or add them in Figma).
  2026-10-14 (live Figma read): Component Size `Segmented/Size` Medium 36 / 44, Small 28 / 36, XSmall deleted (Studio
  mode kept at 28 / 24); Segmented track padding 3XSmall, Primary track outlined. 2026-10-15: `Segmented/Spacing`
  Gap 0 and Text-Wrapper-Padding 8 (Medium and Small), Spacing/XSmall deleted; Studio mode follows Compact.
  2026-10-15 (user, Figma + repo): every Component Size Gap/Padding variable aliases `Spacing/Gap|Padding/*`, not
  `dm-#` (raw values and sizes stay; Action-Icon-Gap stays dm-20, BACKLOG P3); the Studio mode follows the same rule.
  A new Component Size spacing value aliases a Spacing step. Segmented Medium Compact padding 8 (was 6).
  2026-10-17 (live Figma read): Segmented/Spacing/Medium/Horizontal-Padding 10 (Compact, Comfortable; raw, no Spacing
  step; Studio 6). Global Colors Zen ramp re-synced (Zen/9 #F755C9, 45 of 48 values; only the Zen ramp).
  2026-10-18 (Zen plugin 5ce6ba8 "Dark lift", user-approved): every ramp's Dark steps 2–8 (Neutral 2–7) +0.020 OKLCH L,
  regenerated with tools/studio/zen-ramp.generated.mjs (278 Dark values, Zen-High-Contrast recomputed).
  2026-10-13 (user, repo + Figma): Component Theme `Chart/Sector/Primary` = Support/Brand/Solid and `Secondary` =
  Support/Neutral/Deep in every mode (as Brand - S1).
  2026-10-08 (user, repo + Figma): Accent and Neutral `Color/Background/*/Flat/Hover` → step 2 (Alpha/2,
  were 3 = Pressed); every Flat/Hover is now step 2.
  Repo-only edit 2026-10-06 (user): Component Size `Sidebar/Default-Width` = Compact 240 / Comfortable 260
  (Figma still 260 / 280 — keep 240/260 on the next variables sync unless Figma is updated); the docs no longer pin a
  260px rail. Before it: synced from the user's exports; the latest is the 2026-10-05 evening export "Zen-Variables 2": Global Colors
  carries Figma's Zen-High-Contrast mode (equal to the algorithm) and a re-synced Mint ramp; Mode Colors (Semantic) adds
  the 20 Support Sky/Mint tokens (repo 2,199). Avatar, Badge/BadgeCounter and DockIcon took the Figma Sky, Mint, Bronze
  and Golden themes the same day. Before it: the 2026-10-05 Global Colors export (235 values in Cyan, Grass,
  Blue, Bronze, Orange and Zen, step 9 included; no names changed). **Zen-High-Contrast (2026-10-05, prototype):**
  `ZenProvider contrast="high" | "system"` → `data-contrast`; `scripts/high-contrast.mjs` (block `ZenHighContrast`, also
  pasted into the Zen Plugin's `src/plugin/code.js`) generated the mode until Figma's Global Colors held it (the export does since 2026-10-05 evening), and
  `tokens:build` writes it at the end of tokens.css; `tokens:check` verifies its rules (step 9 / backgrounds fixed,
  Subtle borders 3:1, Neutral alpha 9–11 and colour steps 10–11 4.5:1). Before it: the 2026-10-03 Global Colors export from the Zen Plugin's new
  ramp algorithm (258 values: Light Neutral 4–6, Dark steps 2 and 4–7; no names changed). Before it: the 2026-10-02 Component Size token `AI-Chat/Field/Corner-Radius` and the 2026-10-03 Component Theme tokens `Input/Border/Focus` and `Input/Border/Popover-Search` (2,179 variables; that evening's Neutral-S7 export set `Input/Border/Focus` to Focus/Neutral/Solid, as in the other eight modes). Since 2026-10-05 Color/Content/Placeholder = Neutral-Alpha/9 in Light and Dark (user request, matches the live file; was step 8 like Disabled). The VT, Chat and Ananas
  ramps were removed from the repo but still exist in Figma: a future sync must drop them again. Motion tokens are
  code-owned (`tokens/source/motion.json`, 2026-10-01); the Figma "Motion" collection only mirrors the durations, so a
  variables sync ignores it.
- **Figma parity:** `node tools/figma-contract/run-all.mjs` (23 suites + 25 interactions). Captures live in
  `docs/figma-contracts/`: slice them with a script, never `Read` a whole file (0.7–2 MB each).
- **Harness:** 209 usage rules (`npm run usage:rules`; latest `card/spacing-by-count`, 2026-10-17). The style-guard baseline is empty, so every style finding is new.
- **Templates:** `src/templates/` holds the page templates shown on `?page=templates`; `src/templates/hr/` is the Figma HR-Platform set (7 pages on one `HrShell`; `HrRouterContext` links them, as App Shell › HR workspace does). Platform examples reuse its data from `src/platform/appLayer/hrDemo.tsx`. The pages were rebuilt from Figma node data on 2026-09-30 (read with `use_figma`, never from screenshots): same components/primitives, Figma copy and data, nothing invented — rebuilt again on 2026-10-01 from Zen components + research with the Figma as a moodboard only (brief docs/research/template-rebuild-brief-2026-09-30.md, shared data src/templates/hr/data.ts); follow-ups in BACKLOG "Template rebuild follow-ups". Screen rules: elevation follows the Sidebar, widget titles Subheading.
- **Examples (rebuilt 2026-09-30 → 10-02):** the 43 component + mobile pages read their examples from
  `src/platform/examples/pages/<page>.tsx` (one file per page, picked up by `examples/registry.ts`; a page with a file
  shows only those, app-layer extras are not appended). Shared world and formatters: `examples/data.ts` (Đìzai
  Studio, Alex Duong, today Sep 30, 2026). The rules are in `docs/research/example-rebuild-brief-2026-09-30.md`
  (spacing ladder §3b, one style §3c, phone Top Navigation §5b, final check §9) and usage rules §13–§15 (§15 grouped
  lists on phones: Surface-Alt screen, a white block per group). One mood (2026-10-06, usage rules §16): the stage is
  Canvas/Default and boxes on it are flat Surface/Default (Card/MetricCard `theme="flat"`, ListBox), no border or
  shadow unless a condition picks another pairing (Sidebar, white page/phone, Surface in Surface, clickable, selected). Phone frames (`PlatformPhone`) always render in
  Comfortable + Mobile (2026-10-06); only the Studio's Present changes modes, for that presentation. The old
  example functions were removed on 2026-10-02 (`PlatformShowcases.tsx` keeps ExampleCard, the Popover content sets
  and the registry; `PlatformMobileShowcases.tsx` only ChartReportPanel); the 12 app-layer pages (action-bar, app-shell, description-list, form, image, layout, link, menu, page-header, side-panel, text, visually-hidden) were rebuilt the same way on 2026-10-02 by the session "Add audit check for text overflowing its box". Their old examples in `src/platform/appLayer/*.tsx` no longer render (dead code, Backlog); the playgrounds there still do.
- **Figma re-sync kit:** `tools/figma-kit/` (README there) hashes the live sets through `use_figma`, names only the changed variants, fetches them and patches `docs/figma-contracts/`; `contracts.lock.json` holds the hashes. Use it instead of re-reading sets or spawning one agent per set.
- **Ship:** `npm run ship` (`tools/ship/README.md`) runs the gate for a small branch, pushes and opens the PR link/API. Pushing needs a GitHub token with Contents, Pull requests and Workflows write (or `gh auth login`); the sandbox cannot reach github.com, run it on the Mac.
- **Gate is parallel:** `tools/qa/run.mjs` runs tsc, contract suites and Vitest side by side, and audit + dark audit + behaviour side by side (`ZEN_QA_SHARDS` processes per job, `--serial` to opt out). Since 2026-10-22 every runtime job and the Studio E2E run in shards of about 10 min sized from the last run's timings (`.qa/timings.json`); E2E shards run one after another with a `--budget`, and one combined report (`.qa/studio-e2e/<stamp>-gate.md`) lists the regressions, so no session needs `studio:e2e --shard` by hand or `ZEN_QA_SHARDS=4` for app-shell. Contract suites run 4 at a time (`ZEN_QA_SUITES`), each in its own `.out/<suite>-<pid>` folder; on the Mac (2026-09-30) all 23 passed that way on a token change. A token sync takes the fast path by itself (56 pages ≈ 10 min). Since 2026-10-16 (user) the audit runs at 1512 + 390 + 320 (320: every kind baselined, debt in BACKLOG P1) and has `card-gap` / `legend-column`; Studio E2E PT-11 checks Play's sticky Sidebar.
- **Native tokens:** `npm run tokens:native` (also part of `tokens:build`) writes `platforms/swift` and `platforms/flutter` (tokens + text styles, mode-aware resolver, shared vectors; see `platforms/README.md`). Swift/Dart were never compiled: run `swift test` and `flutter test` first. Not done: shadows, components.
- **Dev server:** `npm run dev`, port 5173. Since 2026-10-03 it answers on `localhost`, `127.0.0.1` and `[::1]` alike: Node 24 binds "localhost" to `::1` only, so `tools/dev/loopback-both-families.mjs` (in `vite.config.ts`) forwards the other loopback family. Any of the three works for `--url=` in `npm run qa`, audit, behaviour and shoot.
- **Studio drag and drop + auto layout tests (2026-10-17, PR #121 stacked on #119):** `npm run studio:dnd` (engine:
  19,286 drop / insert / move cases + 12,564 Add / Remove auto layout cases, must report 0 findings) and the opt-in E2E
  group `dnd` (`npm run studio:e2e -- --only=dnd`, ~30 min, real drags of every Assets item; `ZEN_DND_ONLY=<ids>` /
  `ZEN_DND_LIMIT=<n>`). Run both after any drop, insert or auto layout change. Drop rules: memory "studio-drag-drop-rules".
- **Zen Studio in Figma's words and keys (2026-10-18, F0 + F1 of `docs/research/studio-figma-design-parity-2026-10-18.md`,
  user: "Đồng ý theo đề xuất, làm F0 trước", then "ok làm F1 tiếp đi"):** F0: the glossary (§3a) on menus, tooltips
  (`tip(name, keys)`, `shell/ShortcutTip.tsx`), Inspector, Layers, status line; Figma keys Zen lacks say so
  (`edit/figmaNotYet.ts`); P is Pen, Present ⌥⌘↵. F1: layer names and locks are `data-name` / `data-locked`
  (`tools/studio/layer-meta.mjs`, client store `select/layerMeta.ts`, `edit/rename.ts`, `edit/lock.ts`); Layers of a page
  you made list front-first with automatic names, no folding, the Screen as the frame row. Guards: `words.selftest`
  part 3, `layer-meta.selftest`, opt-in E2E `--only=figma` (FW-01…18, the plan's scoreboard). Since 2026-10-19 three
  sessions build the rest (A: F2 → F3 → F9, B: F5 → F7, C: F4 → F6 → F8 → F10). F4 (C): Figma's frame presets in the
  right panel (`builder/FramePresets.tsx`), a click = 100 × 100, frame handles + X / Y / W / H written in the page
  (`board/FrameHandles.tsx`, `builder/FrameGeometry.tsx`), Sections `<Section>` beside the frames (membership by
  place, `board/sections.ts`), N / ⇧N, Pages order + dividers (`builder/store/pageOrderStore.ts`); FW-40…49.
  **F6 + F8 (C, one PR):** the Text tool (T click / drag, typing at once; Enter is a new line only on pages you made),
  `TextRun` mixed styles (⌘B ⌘I ⌘U ⇧⌘X; TEXT `segments` to and from Figma, `tools/studio/text-runs.mjs`), image fills
  on Shape and frames (`image` / `imageFit` / `imageCrop` / `imageScale`, `_shared/image-fill.ts`), ⇧⌘K file dialog +
  drop / paste pictures, Fill › Image, crop on the canvas (`draw/CropHandles.tsx`), `tools/studio/figma-image.mjs`;
  FW-60…69, FW-80…87. **F10 (C):** zoom 2 %–25 600 %, pixel grid ⌘', Outlines ⌘Y, rulers ⇧R + guides, layout guides
  ⌃G (right panel › Layout guide; Breakpoint & Grids margin / gutter), page canvas Background, Find and replace ⌘F
  (`canvas/viewOptions.ts`, `canvas/Rulers.tsx`, `canvas/LayoutGuides.tsx`, `edit/FindPanel.tsx`); guides, layout
  guides and the background live in the page header; FW-100…105. Free frames ↔ Figma layoutMode NONE: separate fix PR.
  **F8c (C):** the direct ⌘C → ⌘V places pictures: image fills as Image paints with their bytes as message blobs
  (meta URLs only work for pictures Figma already has; a WebP goes as PNG), Shape rectangles / ellipses as Figma's own
  layers, an Avatar's photo and the table's Avatar / Photo cells through the pack's `img` layers
  (`native-pack.mjs images-code` / `images`); research studio-native-paste §7c.
  The direct paste also carries a frame's whole look (stroke + sides / dash, corners on their variables, the effect
  style with its effects from the pack's `native-pack.mjs effects-code` / `effects`, opacity, rotation, flip; #177),
  and `native-pack --merge` adds a set to the pack without a full capture (#176).
  **F5a (Session B):** Box, Stack and Grid take one look (fill, stroke + weight / sides / dash, corners, effect,
  opacity, rotation, flip: `src/components/Layout/appearance.ts`), so a Figma auto layout frame with a fill is one Stack
  in code, push / pull and the Zen plugin; the right panel is in Figma's order.
  **F5b + F5c (B, #151):** typed values snap to variables (variable pills, W / H math, ratio lock, nearest colours),
  Export, a text's Fill and style details, several frames at once, Selection colors, Local styles; spec
  `docs/research/studio-f5-right-panel-spec-2026-10-19.md`. **Blend mode (B, 2026-10-20):** `blendMode` on Box /
  Stack / Grid / Shape (`mix-blend-mode`), Appearance's ◐ (`appearance/BlendMode.tsx`), push / pull / plugin
  (`tools/studio/blend-modes.mjs`, `studio-import` 325ba36); native ⌘C→⌘V waits on C (BACKLOG P2); spec
  `docs/research/studio-blend-mode-spec-2026-10-20.md`. **Re-measure gaps (B, 2026-10-21):** a Zen instance's layer
  menu Go to main component / Reset all changes (`inspector/instanceActions.ts`); a Zen instance's Appearance
  (`opacity` / `blendMode` on the page → its `style`, `tools/studio/instance-look.mjs` with STYLE_ON_ROOT pinned by the
  conformance test; push / pull / plugin 8248c59); the panel heads frames Frame and groups Group (`panelTitle`); spec
  `docs/research/studio-instance-panel-parity-spec-2026-10-21.md`.
  **F7 (B, #152):** component sets and variants (`<ComponentSet>`, Combine as variants, Add variant), properties and
  their bindings (`data-prop-*`), instance values, overrides inside an instance (`<Use overrides>`; layer paths in
  `tools/studio/instance-paths.mjs`; ⌘-click into an instance, `inspector/LocalPartPanel.tsx`), Reset / Push changes
  to main, slot content (`<Use slots>`), Assets › Local; React export, push / pull and the Zen plugin (`studio-import`
  1785c37); specs `docs/research/studio-f7-components-spec-2026-10-19.md`, `…f7b-instance-overrides-spec-2026-10-19.md`.
  Same PR: the right panel on one grid, using the shared Inline-Field (E2E `panelFits`), and E2E retries that start
  from the documents the row found. Since 2026-10-20: the React export turns overrides no property carries into props
  (#155), and the Figma pull brings overrides and slot content back (live fixture `figma-overrides.json`). Push and pull
  also carry overrides inside nested instances (#160, `figma-deep-overrides.json`) and of Zen components in a main: props,
  label and nest() layers such as "Pagination/Next" (`figma-library-layers.json`; plugin `studio-import` 1352a72, arrow
  one head eed5057). Open: BACKLOG "Studio components, after F7a/F7b", "Card `subAction` to and from Figma".
  **F2 + F3 + F9 (Session A, done 2026-10-20):** F2 (#140): several layers align, distribute, tidy up, nudge and move
  (`edit/arrangeModel.ts`, `edit/alignLayers.ts`), resize from the centre / ⇧ ratio, equal-spacing snaps
  (`edit/spacingModel.ts`), several frames (`select/frameSelection.ts`: ⌘A, marquee, ⇧-click). F3 (#142, #145): Delete
  selects nothing, Copy / Paste properties (visual props only), paste at a point or into the frame most in view, ⌘D
  repeats a move, Frame selection / Remove frame (slot ops `group` / `ungroup`), ⌥⌘K on several layers, Copy as code /
  CSS; Layers nests frames under Sections. F9 (#146, #148): Pen and Pencil vectors, ⌘G groups that hug their layers
  (Box `group`), ⇧H / ⇧V flip, rotate handles, live boolean groups (`Shape type="boolean"`, ⌥⇧U / S / I / E), ⌘E
  Flatten, ⌥⌘O Outline stroke (Skia PathOps, `pathkit-wasm` loaded on first use: `draw/pathKit.ts`, `edit/pathOps.ts`,
  `tools/studio/path-ops.mjs`); push / pull fixed against the live Zen file. ⇧⌘C Copy as PNG / SVG (#156,
  `edit/copyAs.ts` on B's `layerPicture`). Use as mask ⌃⌘M (#161): Box `mask` (`Layout/mask.tsx`, an inline clipPath
  from the first layer's outline), a Mask group in Studio, `isMask` in push / pull and the Zen plugin (`studio-import`
  3f0cf52). E2E `--only=figma` FW-20…39, FW-110…127. A worktree without `pathkit-wasm` makes ⌥⇧S / ⌘E say "could not
  load the path engine". Since 2026-10-22: ⌥⌘A Select matching layers and Select all with same › (`edit/matchModel.ts`,
  `edit/selectMatching.ts`, FW-175…179; the user's rule is in the model's note).
- **Zen Studio → native Figma (2026-10-17, user: "convert người dùng từ Figma"):** research + plan
  `docs/research/studio-figma-native-parity-2026-10-17.md` (P1–P5, status §8). Built: `Shape` (Rectangle, Ellipse +
  arc, Line, Arrow, Polygon, Star; token paints), px insets for free frames, Figma's drawing tools and gestures
  (`studio/draw/`), arc handles, shape Inspector, ⇧A / ⌥⇧A, Figma keys (`edit/figmaKeys.ts`), push / pull / plugin
  import of shapes; Document / Studio moved into the Zen Studio menu. E2E group `draw`. Components on a page you made
  (P4 v1: ⌥⌘K `<Component>`, `<Use of>` instances, ⌥⌘B, Assets › Local, export + push). Rule (user): a drawn shape,
  frame or text is an object, never shown as a component (`select/layerNames.ts objectIcon`, `nodeKind` "shape", E2E
  DR-15). Shipped together as one PR (branch zen/feat/studio-components-20261017). Next: P5 Variables v1 on
  zen/feat/studio-variables-20261017 (PR after this one); open: P2–P3 rest, P4 v2 (BACKLOG).
- **Zen Studio Screen = master layout (2026-10-15, user):** a builder Screen's desktop frame is one root `<AppShell>`
  (`tools/studio/screen-frame.mjs`, op `screenFrame`; parts in `screen-chrome.mjs` FRAME_PARTS); the Screen's own
  `sidebar`/`header` props are legacy, moved into it when a page opens (`localApi.ts` moveScreenFrame). The mobile layout
  keeps the Screen's Top/Bottom navigation and draws the AppShell's content only (runtime, compile, push). Since
  2026-10-19 the header parts (`leading`, `center`, `actions`, `main`) live on `header={<AppShellHeader …/>}` (FRAME_PARTS
  `host`), and old pages move to the new props on load (`migrateAppShellProps`).
  Since 2026-10-21 (Session B) the header goes to Figma as Header/AppShell with its theme and density, swapped into the
  master layout's Header/Dashboard, and comes back from a placed master's read; the toggle is the header's or the
  Side-Bar's Collapse Button (plugin `studio-import` bf300bc for the master's top alignment).
- **Zen Studio MCP M0 (2026-10-15, user):** AI clients (Claude Code first) read and edit the open Studio page live
  through `/__zen-studio/mcp` (relayed to the tab over Vite's HMR socket, one ⌘Z per change, AI chip Stop/Resume).
  Merged in #72 (baafbf8). Tools: get_studio_state, get_tree, update, get_screenshot, on pages made in the Studio;
  `npm run studio:mcp` prints the `claude mcp add` command. Not yet tried from the user's own Claude Code. Next, each
  waiting for the user's go: M1 full write set, then the embedded Zen Agent (V0 built 2026-10-18), M2 code pages; spec
  `docs/research/studio-mcp-canvas-2026-10-15.md`.
- **Zen Studio free frames (2026-10-15, user):** on a page you made, Screens / Overlays sit at `x` / `y` from the page
  (frames without them keep the old row, `builder/render/framePlace.ts`); drag by name or a selected frame, ⌥ copies,
  ⌘D / ⌘C ⌘V / arrows (`builder/frameMove.ts`, `frameKeys.ts`, writes in `frameEdit.ts`); toolbar Frame (F) draws a
  Screen (`width` / `height`); Present is ⌥⌘↵. Component (Document) pages keep their generated layout (user: not free).
- **Zen Studio prototype = Figma's prototype mode (2026-10-15, branch `zen/feat/prototype-usability-20261015`, worktree
  `../Zen-DS-proto`):** ⊕ drag to connect, clickable arrows with draggable ends, per-item targets for tab bars / Tabs /
  Segmented / Sidebar (`proto.navigate({ item: screen })`), design-word triggers, Flow rows, Play hotspot hints; round 2:
  Animation per connection, After delay, While hovering, overlay position / outside press / dim, Add overlay menu. Code
  in `builder/proto/` (protoModel/protoTriggers/protoEdit/protoDom/playMotion), E2E group `prototype` (PT-01…10).
- **Zen Studio UI3 shell (2026-10-15, user):** Figma UI3 floating panels — no toolbar row; the canvas fills the window
  under the panels (`canvas/viewport.ts` `setCanvasInsets` / `getSafeBox`: fit, zoom, keep-in-view, frame chrome and
  edge pan aim at the visible part); headers in `shell/PanelHeaders.tsx`; corner bars when a panel is not docked.
  Inspector rows are Input/Inline-Field (`Section.tsx` `useInlineLabel`: a field control takes its row's label inside),
  ranged numbers use SliderField (`inspector/numberRanges.ts`), chrome Emphasis Light. Figma Inline-Field Type=Number
  added the same day (15753:6135…).
- **Zen Studio clicks and booleans (2026-10-13, branch `zen/fix/studio-toggles-click`, worktree `Zen-DS-click`):**
  clicks pass through layout wrappers and AppShell / the page body (template pages 5.6 → 2.5 double-clicks to a layer),
  right-click › Select layer ›; every Figma boolean on template pages works or says why (slot toggles open their picker,
  set-specific booleans show on their set only, `inspector/computedDefaults.ts`). Round 2 the same day: Layers folds
  what clicks pass through, ⌘-click reaches texts and nested instances (`select/parts.ts deepLayerAt`), text layers edit
  (Inspector Text, Enter), nested booleans off drop their override, edits ~2× faster (render cache in
  `builder/render/renderPage.tsx`, sync parse, parse/sha1 caches, deferred size probes); Figma walk 14/14 tasks at
  Figma's step count (scripts in the session log). Round 3: ⌘-click on every text (atoms too), ⇧Enter/Esc one layer
  up (`parts.ts parentLayerOf`), Layers without Parts / empty slots; builder pages mark elements `file:@<doc id>`
  (`select/srcIds.ts` turns them back into file:line:col; BuilderBoard sets it from `locsOf`), edits 35–60 ms.
  2026-10-14: the icon picker leads with Recent and Related tiles (`inspector/iconSuggestions.ts` ICON_TOPICS,
  relatedIcons; E2E IN-20). PR #43 (CI runs the full gate; merging is the user's step). Session logs 2026-10-13/14.
- **Zen Studio, Figma usability round 1 (2026-10-10):** pictures replace like Figma everywhere (Assets › Photos click or
  a drop on an Avatar/Image/Thumbnail/account, the Inspector's Picture; data rows and factories write that row,
  `platformMedia` bindings become the layer's own, repo files take `new URL("<file>", import.meta.url).href`:
  `edit/assets/picture.ts`, `tools/studio/picture.mjs`); ⌘-click selects the innermost written layer; E2E SE-36. The
  usability check and the remaining program: `docs/research/studio-usability-eval-2026-10-10.md`; follow-ups in BACKLOG.
- **Zen Studio nested instances (2026-10-10, branch `zen/feat/nested-overrides`, worktree `Zen-CodeBase/Zen-DS-nested`):**
  plan `docs/research/studio-doc-engine-plan-2026-10-10.md`; the user chose fast path A (§9). Library `overrides` +
  `_shared/nested.tsx` (`useNested`/`nest`) on 64 components; Studio edits any nested instance on pages you made as the
  owner's overrides (`inspector/OverrideProperties.tsx`, `select/parts.ts nestedPathOf`); harness
  `api/overrides-studio-only`; E2E NO-01…04. Don't add nested-edit tracers: add `nest()` to the component instead.
- **Zen Studio core rebuild M2 (2026-10-11, branch `zen/feat/studio-doc-engine` on top of the above):** a builder page
  keeps its `.zen.tsx` text as written and a JSON document with stable element ids beside it in IndexedDB
  (`tools/studio/doc.mjs`, `PageRecord.doc`; the user's choice "cách 2"); `localApi` edits through `editDoc` (the engine
  twice: shown text + id print). `studio:build-check` fixed (out of date with main + a Chromium OPFS crash): only the
  engine budget is now 160 KB gzip (the user's choice, 2026-10-11; 153.6 measured), so build-check is green.
  M2 pushed (c670fc5). M3 (same branch): the selection follows its element by id through edits, undo and redo
  (`locs` on each write, `remap.ts mapSrc`; `api.ts writeInFlight`), double-click goes into nested instances one level at
  a time (`parts.ts outerNestedAt`/`drillNested`), Layers names nested instances by their Figma layer; E2E NO-06…09.
  PR #13 (M2+M3, 76c7683) open by Giám sát. M4 on `zen/feat/studio-doc-m4`: one row of a list edits on its own
  ("Changes go to · Row N · All rows", op `setRowProp`; a photo for one row's Avatar too); E2E NO-10…12.
  M5 on `zen/feat/studio-doc-m5`: the export of a page with overrides and a row's own values passes the harness (app
  mode) and tsc, and draws what the canvas draws (`tests/interaction/studio-export-parity.test.tsx`).
  M6 (converter half) on `zen/feat/studio-doc-m6`: `tools/studio/figma-pull.mjs` (use_figma read code + JSON → page with
  overrides; CLI), selftest 14, E2E NO-13. Live read (2026-10-11, `zen/feat/studio-figma-pull-live`): Overviews
  14243:64878 read through use_figma (read-only, paged) and converted — slots (Card content, Sidebar brand/sections/
  footer, Breadcrumbs/Segmented items), Fill container, grid placement, text alignment, absolute layers; fixture
  `tools/studio/fixtures/figma-overviews.json`, selftest 38, E2E NO-19. Re-pull (`zen/feat/studio-figma-pull-diff`):
  pulled elements keep Figma-derived document ids, the header names the frame; importing a later pull opens Update from
  Figma (three-way diff against the last pull kept in this browser, conflicts unticked, Apply = one edit/⌘Z);
  `tools/studio/figma-diff.mjs` + selftest 19, E2E NO-20. Table (`zen/feat/studio-figma-pull-table`): a frame of
  Primitives/Table/Data-Row instances is read as one table and becomes `<Table columns rows>` (rows inline, so a re-pull
  compares them), per-row Badge / Dock-Icon looks as `overrides`; Actions cells → a `content: "actions"` column (2026-10-12); fixture
  `figma-table.json` (Demo › Table-Example 14730:78776), E2E NO-21.
  M7 on `zen/feat/studio-doc-m7`: `tools/figma-contract/nested-paths.mjs` in the gate (15/15 components with a contract
  name their nested layers as Figma does; DatePicker Apply → Submit, Time → Time-Picker). M8 on
  `zen/feat/studio-doc-m8`: the avatar test passes 5/5 through the design copy (NO-14…18) after fixes to AvatarStack
  (attributes on its root), SidePanel (modal opens inside a frame), nested pictures and Table cell photos in copies.
  Leftovers done 2026-10-12 (`zen/feat/studio-design-words`, session log): dashboard walk 27/27; design words on every
  page (criterion 7: `src/platform/studio/words.ts` + `useWords.ts`, Code tab keeps the line, E2E B-35 and I-31);
  Table `content: "actions"` + `actions` (Figma Actions-Cell, pulled in by figma-pull); AiChatBubble `overrides`.
  **Q4/Q5 built 2026-10-12 (spec `docs/research/studio-figma-push-spec-2026-10-12.md`, branch `zen/feat/figma-push`,
  PR #24):** Studio Export › Figma + the Zen plugin's Import from Studio (plugin folder `~/Documents/zen-ds-figma-plugin-main`,
  local git since 2026-10-12), Check Figma bindings (binding-diff.mjs), Download for Figma after a token save
  (rebind.mjs). Coverage (2026-10-12/13, spec §8, merged to main via PRs #26 #30 #31 #32): app pages export whole
  (Screen chrome, code-only wrappers as frames; AppShell as the ◇ Master-Layout instance Patterns/Pages/Density-Medium
  since 2026-10-18, research doc studio-native-paste §7b); AppShell's top bar is a DashboardHeader navigation (72px as
  Figma) and app frames pull back as AppShell; Clip content on Stack / Grid / Box (Studio toggle, Figma round trip);
  a design copy keeps its Table cells; sessions "Lỗi UI" / "Kết nối file Figma Pokeslide" made the Dashboard and the
  templates import as they look (tried in the live file, page "Studio exports — QA"; even fit grids, metric / chart
  cards, table checkbox / sort / avatar cells, Table last-row rule in surfaces). Test any export change by running the
  real importer in the Zen file. P3–P4 (2026-10-13, branch `zen/feat/figma-map-p3`, spec §8 "P3" / "P4"):
  TopNavigation, ColorSelector, TabItem, InputConditions, UploaderFileItem, DatePickerSheet, chat, FileIcon, Flag and
  icon sizes map both ways (shared module `tools/studio/figma-top-nav.mjs`, fixtures `figma-chat.json`,
  `figma-metric.json`); 90 example classNames became Card / ListBox / Layout sizing props. P5 (branch
  `zen/feat/examples-classnames`, spec §8 "P5"): Grid stackBelow, Stack / Box scroll, Box surface="canvas", Text wrap /
  tabularNumbers (all pushed and pulled; plugin 6b823d2); docs frames in `src/platform/PlatformFrames.tsx`; examples
  down to 112 classNames, none with a Zen prop. Left: BACKLOG P2 item.
- **DashboardHeader (2026-10-11, `zen/feat/dashboard-header`, the user's "Thì build ngay"):** new component for Figma
  ◇ Master-Layout Primitives/Dashboard/Header 4122:33402 — `type` control-bar (default) · navigation · main (renders
  PageHeader, which gained `childTitle`) · custom. Contract `docs/figma-contracts/dashboard-header.json`, suite 68/68,
  platform page with 5 examples, 4 harness rules, Studio palette item and Figma props; figma-pull maps it (a custom
  Header-Text cover → type custom; Action-Item → AppShellAction). Manifest: `docs/platform-json-audit.md` › DashboardHeader.
  Chip's counters follow Figma's layer names (`Badge`, `Badge-Counter`; the user's choice B, branch
  `zen/fix/chip-figma-names`); Date field waits on the Figma rename.
- **Chart family (2026-10-12, branch `zen/feat/charts`, PR #33, worktree `Zen-CodeBase/Zen-DS-charts`):** the user's moodboard
  in Zen tokens, one style for every chart, with motion. New BarChart (vertical/horizontal, projected, target),
  DonutChart, RadialChart, HeatmapChart; LineChart `compare`; ChartCard `icon`/`description`/`value`; shared
  `chartCore.tsx`; `showAverage` (Line, Bar, Stack-bar); Studio palette items; harness `chart/*`. Spec
  `docs/research/chart-family-spec-2026-10-12.md`; the Figma side (❖ Chart page, IDs in spec §5.1) is built from it in
  the official file at the user's request. Open: Export › Figma mapping and Figma contracts (BACKLOG).
- **Zen Studio spaces (2026-10-09; since 2026-10-17 the brand menu’s Switch to Document / Switch to Studio, no floating switch):** the toolbar centre was a Document | Studio switch (`state.space`, `?space=studio`,
  `shell/navigation.ts setSpace`); Studio = folders of builder pages (`builder/store/folderStore.ts` in IndexedDB settings,
  `PageRecord.folder`; `builder/StudioFolders.tsx`, `StudioHome.tsx`). Folders are not in the mirrored page files. Preview
  modes change only in Present / Play (their bar's Modes panel); the toolbar has light/dark only. E2E: `openStudioSpace`.
- **Zen Studio (2026-10-02) is the default docs UI:** `src/main.tsx` lazy-loads `src/platform/studio/StudioApp`
  (canvas tool: Pages/Layers, zoomable board of Playground/Examples/Docs frames, Inspector that edits source). The
  classic `PlatformApp` renders for `?ui=classic` and whenever `navigator.webdriver` is true, so `npm run qa`, audit,
  behaviour and shoot keep the same DOM. `vite.config.ts` runs `tools/studio/vite-plugin-zen-studio.mjs` (dev only):
  `data-zen-src` on platform JSX + `/__zen-studio/*` (source read, edit, write; admin role + per-server token).
  Docs-chrome functions carry a `// zen-studio-chrome` comment (never selectable). Spec:
  `docs/research/zen-studio-spec-2026-10-02.md`; plugin notes and selftest: `tools/studio/README.md`,
  `node tools/studio/selftest.mjs`. `vite.studio.config.ts` + `studio.html` serve the Studio alone on 5180.
  Since 2026-10-06 the canvas chrome floats as in Figma (`canvas/CanvasChrome.tsx`, mounted by StudioApp after the
  examples' overlay layer so a Dialog scrim never covers it): zoom top-right (percentage menu only), tools bottom-centre
  (`CanvasTools`, toolbar "Tools"), the tip as a "?" icon bottom-right (`CanvasStatus`, hint text visually hidden).
- **Studio → builder plan + E2E (2026-10-05, session "Studio builder tool planning"):** approved plan
  `docs/research/studio-builder-plan-2026-10-05.md` (GĐ0 E2E + GĐ1 fixes approved; GĐ2–5 builder pages each need a
  spec + the user's OK). `npm run studio:e2e` (`tools/studio/e2e/`, README there) drives the Studio on its own server
  (5190+) and writes an 81-row feature matrix; baseline `matrix.baseline.json` = 80 works / 1 broken (left: GĐ3 Assets
  without a selection ST-02).
  WP-C server: `tools/studio/data-source.mjs` (`dataSource` on GET /element, op setDataField, data files draftable);
  WP-C client: propSchema `dataEditable` / `dataSourceLabel` (bound PropValue carries `dataSource`), PropField data
  editor + "Set fixed value" (non-state bindings only), DesignPanel.setProp → setDataField with the row (rowOf);
  WP-F: overlays are layers in Select (studio.css data-picking, picker hostsOf/frameOfFiber/rendersPortal), `.map`
  text edits its row's data (textEdit.ts).
  WP-E: Figma properties for 53 components: read with `tools/studio/figma-props-read.js` (use_figma, one call per ❖ page)
  into `docs/figma-contracts/component-properties.json`; map `tools/studio/figma-props.map.mjs`; build/check
  `tools/studio/figma-props-build.mjs` → `inspector/figmaProps.generated.ts`; `inspector/componentGroups.ts` (hand-written
  propGroups first, else `groupsFromFigma`).
  WP-D (part): `src/platform/studio/appearance/` (AppearanceSection + CornerRadiusField + EffectsSection, pure
  `appearanceModel.ts` + selftest), mounted by DesignPanel for Box/Image (`appearancePropNames` leave Properties).
  Canvas `position/ConstraintLayer.tsx` (dashed constraint lines + pills, mounted after SlotLayer; E2E AP-04).
  ScaleField: `inspector/controls/{ScaleField.tsx, scale.ts (+selftest), hostContext.ts}`; PropField renders it for any enum
  whose type is a gap/padding/radius scale (`scaleOfType`), DesignPanel provides the canvas host (E2E I-15).
  Layout (2026-10-06, redesign spec phases 3, 4, 6): `inspector/LayoutSection.tsx` (moved out of DesignPanel) +
  `layoutModel.ts` (pure, selftest) + `controls/{AlignmentBox,ColumnsField}.tsx` + `controls/controls.css`; E2E group
  `layout` (L-01…L-08) on the fixture's new Grid example (frame 5).
  WP-B2 (2026-10-06): shared demo code (`isSharedFile`: annotated, not an example/template/playground file) is
  restructured after "Change shared code?": server `slots.mjs`/`jsx-source.mjs` refuse with code "confirm" (+ `uses`,
  `users` from `tools/studio/shared-code.mjs importersOf`) until `shared: true`; client `api.ts sendEdit` asks through
  `sharedConfirm.ts` + `shell/SharedConfirm.tsx` (alertdialog), a yes holds per file per page load (E2E ST-12).
  GĐ1 is complete apart from ST-02 (Assets with nothing selected = GĐ3). New: `src/platform/studio/gate.ts` + `shell/ReadOnlyChip.tsx` (why read-only), CanvasMenu
  targets (node / several / frame / canvas), `layout.ts` `phone` flag.
  **GĐ2 approved 2026-10-06:** spec `docs/research/studio-builder-pages-spec-2026-10-06.md` (pages in a gitignored
  `.zen-studio/pages/` on the dev server, lists as `mock.items.map`, blank page + device, delivered M1 → M4). In
  progress: M1 done 2026-10-06 (engine without Node: `posix.mjs`, `sha1.mjs`, `component-modules.mjs`; `dialect.mjs`;
  `browser-engine.mjs`; client `src/platform/studio/builder/` = engine.ts, localApi.ts (api.ts routes "local:" files),
  store/pageStore.ts (IndexedDB), render/renderPage.tsx (no eval, data-zen-src + data-zen-name), proto/runtime.tsx,
  BuilderBoard.tsx, NewPageDialog.tsx; store `localPage` + `pageKey(…, localPage)`; LOCAL_SERVER in useStudioServer;
  palette `builder` → proto.toast; E2E group `builder` B-01…B-06). M2 done 2026-10-06: `tools/studio/pages-folder.mjs`
  + plugin GET /pages, POST /pages/write|trash (`.zen-studio/pages/`, trash moves to `.zen-studio/trash/`,
  `ZEN_STUDIO_PAGES_DIR` for the E2E server); client `builder/store/pageModel.ts` (pure: sync plan, revisions, Trash),
  pageStore v2 (IndexedDB v2: revisions, settings, trashedAt, mirror sync), `store/mirrors.ts` (dev folder or File
  System Access Link folder), `builder/MyPages.tsx` (row + section menus, Rename / Version history / Trash dialogs,
  Import / Export); E2E B-07…B-13. M3 done 2026-10-06: `dialect.mjs` boardFrames / freeFrameId / frameCode /
  protoCode; slots.mjs insertChild takes Screen / Overlay on a builder page (BUILDER_RUNTIME, runtime import);
  `builder/proto/Player.tsx` (Play = `presenting: "play:<screen>"`, P, `?play=`, R, Esc), `proto/PrototypePanel.tsx`
  (Inspector tab "prototype": Flow + Interactions via setProp / removeProp), `proto/ProtoLinks.tsx` (arrows),
  `usePageTree.ts`; Interact tool runs proto on the canvas; Overlay frame is a `data-zen-overlay-root`; E2E B-14…B-18;
  baseline 98 works / 1 broken (ST-02). M4 done 2026-10-06: `npm run studio:build-check` (`tools/studio/e2e/build-check.mjs`:
  vite build + preview, the builder flow incl. Link folder through an OPFS folder, engine chunk size, parser only in
  it); `tools/studio/source-helpers.mjs` holds UNIT / pathTo / piece / importEdits (detach.mjs re-exports them and
  calls jsx-source `registerDetach`), so the browser engine has no detach recipes: 150 → 135 KB gzip; budget 140
  (user, 2026-10-06; the check fails above it). **GĐ2 is complete.** Next: GĐ3 (library search and insert): spec
  `docs/research/studio-builder-library-spec-2026-10-06.md` approved 2026-10-06 (preview of the focused item only,
  uploads with GĐ5, starters = GĐ3b, Vietnamese keywords); delivered M1 → M3. M1 done 2026-10-06:
  `src/platform/studio/builder/library/` (search.ts pure + selftest 77, synonyms.ts EN/VI → palette ids,
  keywords.generated.ts from `tools/studio/library-keywords-build.mjs` (--check in studio:selftest), catalog.ts,
  target.ts: frame in view → its first layout); Assets uses them; E2E group `library` LB-01…LB-04; ST-02 fixed:
  baseline 103 works / 0 broken. M2 done 2026-10-07: `library/QuickInsert.tsx` (⇧I in StudioApp; combobox +
  listbox, target line from target.ts describeTarget, a click outside closes), `ItemPreview.tsx` + `preview.ts` (the
  item's code in a one-Screen page parsed by the engine and drawn by renderPage; overlays forced closed, portals kept
  in the inert pane), E2E LB-05…LB-07, build-check 13 steps; baseline 106 works / 0 broken. M3 done 2026-10-07: `library/{iconSearch.ts (pure:
  glyphs, icon + photo search), iconSynonyms.ts, icons.ts, media.ts (LIBRARY_PHOTOS, `zen-media:` keys, resolveMedia,
  photoCode)}`; edit/assets/assets.ts `Insertable` (palette / icon / photo; an icon on a selected Icon swaps its name);
  Assets kinds Components · Icons · Photos; Quick insert groups; renderPage resolves `zen-media:`; E2E LB-08…LB-12;
  build-check 14 steps; baseline 111 works / 0 broken. **GĐ3 is complete.** GĐ4 instance panel like Figma: spec
  `docs/research/studio-builder-instance-spec-2026-10-07.md`, approved 2026-10-07 (Q2–Q4 as proposed; Q1 sizing: the
  user asked which is friendlier, proposal "(a) wrap in a Stack + 3 fixes" recorded in the spec §8, to settle before
  M4). M1 done 2026-10-07: Figma option names (`propGroups.ts` figmaOptions / entryOptions → PropField optionLabels,
  MixedProperties too); 70 mapped components (`figma-props.map.mjs`, nested groups `nested`, object toggles `on: { code }`);
  `inspector/inheritedProps.ts` (props from another component's props type, ALIAS_EXTENDS checked against the source);
  editor `icon-toggle` (boolean | IconName); Reset all overrides (`inspector/resetAll.ts`, DesignPanel header, one
  runPlan); E2E group `instance` IN-01…IN-06, build-check step 6 picks "Primary" + Reset all; baseline 117 works. M2 done
  2026-10-07: Figma swap defaults read (component-properties.json `default` / `preferred` on INSTANCE_SWAP; preferred =
  the whole icon set, so the user chose "default + icons used in this file": `inspector/iconSuggestions.ts`,
  InspectorFileContext); toggles `on: { swap }` start from Figma's default; server op `replaceElement` (arrange.mjs
  replacePlan, a slot op); Slots ⇄ menu on atom-slot rows (`swapSlotLayer`); Swap instance = Quick insert mode "swap"
  (`builder/library/quickInsertState.ts`, Inspector header ⇄, canvas menu) → `swapSelection`; E2E IN-07…IN-11,
  build-check 15 steps (Swap instance on the build). M3 done 2026-10-07: `nestedInstances.ts` nestedRows (a nested
  component's Figma groups: variants with option names, text toggles, swaps, texts; else its design props) rendered by
  NestedInstanceGroup; the hook is read once in DesignPanel (`nested` passed to GroupedProperties / NestedProperties);
  Reset all overrides adds the nested instances written inside the owner in its file, through op many setProps
  `opsByLoc` (arrange.mjs) = one ⌘Z; E2E IN-12, IN-13 (124 rows). M4 done 2026-10-07 (Q1: wrap in a Stack + 3 fixes):
  instance W / H (`select/instanceSizing.ts` published by ResizeLayer, `inspector/InstanceSizeGroup.tsx`, resize.ts
  planFill / planHugAxis: Hug unwraps); the Stack follows (Layers fold `isStudioWrap`, `studioWrapOf` in remove /
  duplicate / move / drag); Detach on builder pages (`tools/studio/browser-detach.mjs` lazy chunk, detach.mjs
  `pageLayout` for *.zen.tsx); E2E IN-14…IN-17 (128 rows), build-check 17 steps (engine 136.9 KB, detach 16.6 KB).
  **GĐ4 is complete.** GĐ3b starters: spec `docs/research/studio-builder-starters-spec-2026-10-07.md`, approved
  2026-10-07 (Q1 both sources, Q2 snapshot of what renders, Q3 HTML → Layout by token, Q4 overlays → Overlay frames). M1
  done 2026-10-07: `builder/starters/{snapshot.ts (fibers → literal tree; library components by export identity, so it
  runs on the build), toDialect.ts (pure, selftest), newPageFromFrame.ts}`; canvas frame menu + FramePanel button "New
  page from this frame"; E2E group `starters` SP-01…SP-03 (rows may set `timeout`: opening the Templates page compiles
  it); build-check 18 steps. M2 done 2026-10-07: `builder/starters/hostLayout.ts` (rendered HTML → Stack / Grid / Box /
  Heading / Text / Link / Image / Divider by token, measured with detach.ts textStyleKey / toneKey and partInfo
  colorTokensFor; `classProps` reads a primitive's className CSS back as props), docs chrome (`.pe-card*`,
  `.platform-phone*`, `.zen-provider`) walked through, the stage's padding kept; E2E SP-04 (fixture frame "E2E html");
  `tools/studio/e2e/starters-coverage.mjs` (every example frame, nothing saved): 323/323 valid. M3 done 2026-10-07:
  `builder/starters/fromTemplate.tsx` (templates render off screen as their Templates-page frame, lazy chunk) + New
  page's Start from (SelectField above Title; device from the template); overlays → `<Overlay id=…>` frames
  (`overlayNode`: open state dropped, an action object's onClick → `proto.close()`, SnapValue kind "proto";
  `pageFromSnapshot` / `overlayIds` in newPageFromFrame.ts shared by both); E2E SP-05, SP-06 (134 rows); build-check 19
  steps (Start from a phone template on the build). **GĐ3b is complete.** GĐ5 export: spec
  `docs/research/studio-builder-handoff-spec-2026-10-07.md`, approved 2026-10-07 (Q1 React and HTML, Q2 Promote into
  `src/templates/studio`, Q3 PNG in the browser, Q4 uploads in the browser). M1 done 2026-10-07: `tools/studio/compile.mjs`
  (page → one React component; isomorphic, lazy chunk `browser-compile.mjs` via `builder/engine.ts` loadCompile; selftest
  runs tsc noUnusedLocals + usage-guard consumer mode on its outputs), `tools/studio/standins.mjs` + generated
  `compile-api.generated.mjs` (`compile-api-build.mjs --check` in studio selftest: required function props / object
  fields from docs/api; the renderer `builder/render/renderPage.tsx` passes the same stand-ins, a Table column without
  `cell` shows `row[id]`), `builder/export/{ExportDialog.tsx, exportState.ts}` (PagePanel and My pages "Export…");
  `OBJECT_FIELDS` (closed object props: compile leaves out a design's own fields such as an option's `at`); snapshot
  leaves out a date outside a list (a prop, a DatePicker range) and a component value (`as={RouterLink}`, `to` → `href`).
  `starters-coverage.mjs --compile` (tsc + harness on every frame's React; a
  harness finding the design has too is noted, not failed). E2E SP-07 (Admin list's Table renders), HO-01 (136 rows);
  build-check 21 steps (compiler chunk, Export on the build). M2 done 2026-10-07:
  `builder/export/htmlExport.tsx` (lazy with the HTML tab: frames rendered off screen by renderFrame inside a
  ZenProvider, lazy photos loaded first; markup without data-zen-*/data-studio-*, runtime wrappers renamed `.screen` /
  `.overlay`; styles.css = reset.css (?inline) + the loaded rules whose classes are all `zen-*` and are used by the
  screens, token rules with their `--zen-*` only, the @font-face / @keyframes they name; fonts and library photos in
  the zip), `tools/studio/zip.mjs` (store-only writer + reader, selftest with unzip -t and Python zipfile),
  `builder/render/frames.ts` (frameOf shared with the board), CodeView language "html". E2E HO-02 (zip content),
  HO-03 (each HTML frame vs its canvas frame at 100%: 0.00% of pixels differ); build-check 22 steps. M3 done 2026-10-07:
  Export › Handoff (`prepareHandoff` in htmlExport.tsx: one off-screen render in the Studio's preview modes
  (`canvasModes`, a frame's own theme), the HTML files, a PNG per frame (`export/screenshot.ts`: exported markup in an
  SVG foreignObject, fonts and photos as data URLs, animations off), each frame's Tab stops (role + name), the compiled
  code (`compile.mjs` now returns `actions` per frame, `components`, `dataType`) and `export/handoff.ts` (pure:
  guideline notes from docs/guidelines/*.md, design names from the page tree, the markdown; `handoff.selftest.mjs` 15
  checks in studio selftest)); CodeView language "markdown". E2E HO-04 (zip content, handoff.md facts, each PNG vs its
  canvas frame: ≤ 0.02%), 139 rows; build-check 23 steps (the handoff on the build). M4 done 2026-10-07:
  `builder/assets/uploads.ts` (IndexedDB v3 store `assets`, id = name slug + FNV-1a of the bytes + extension, object
  URLs, `missingAssets` asks the linked folder first), `zen-asset:` in media.ts resolveMedia (MISSING_PHOTO picture when
  absent), BuilderBoard / Player re-render on `useUploadsVersion` and name missing photos (status "warning"), Assets ›
  Photos (Upload, drop, Your photos above Library), assets.ts `uploadInsertable` + a photo on a selected page Image swaps
  its `src`, exports (htmlExport maps an upload's object URL to `assets/<id>`; handoff code assets from the store),
  Import pages… takes a .zip (its `*.zen.tsx` + the `assets/<id>` the pages name), the linked folder writes / reads
  `assets/<id>` (mirrors.ts). E2E HO-05 (upload → page → canvas → zip → Import in a fresh browser), HO-06 (missing photo
  → replaced), 141 rows; build-check 24 steps (upload on the build, the folder's assets/). M5 done 2026-10-07:
  `tools/studio/promote.mjs` (planPromotion: compile with suffix "Template", photos from src/assets/media or the
  request; writePromotion: atomic, a differing template is a conflict unless overwrite; typecheck: a tsconfig in
  node_modules/.cache extending the repo's, noUnusedLocals, the file only; selftest 12 checks in studio selftest), dev
  server `POST /promote` (admin, dialect check, `ZEN_STUDIO_PROMOTE_DIR` for the E2E server: lib/server.mjs
  promoteDirOf), `studioApi.promote`, Export panel secondary action (DEV + admin; Replace on conflict; result line
  `data-e2e="promote-result"`). E2E HO-07 (142 rows); build-check 24 steps (no Promote on the build). **GĐ5 is
  complete** (M1–M5), merged to main (PR #1). Backlog after it (user, 2026-10-07): batch 1 cleanup and batch 2 Studio
  quick fixes done (E2E B-19, 143 rows; data-slot `removeItem { all }`); batch 4 examples/docs P2 done (6 fixed, 10
  already fixed and closed); batch 5a Studio P2 done (frame Save/Discard ownership, example pages keep state through
  keepOnHotUpdate in src/platform/hotData.ts, Effect settings, object props: + and same-file consts; E2E 147 rows, the
  gate's Studio E2E step now has 25 min); the CI Package step stays logged (P2, not approved). Batch 5b (Studio P3 small items) is
  done: 16 rows closed (E2E SE-08, SE-09, LB-13, LB-14, L-09; 152 rows), see the session log. Batch 5c (the five Studio decisions of batch 8, plus arrow keys on several layers, ⇧-click range in Layers and Mixed text props) is done: E2E SE-10…13, K-13, I-16; 158 rows, all working. Batch 6 (13 component decisions, plus ToggleListItem and ChipGroup composed without Figma: verify them, Backlog P2) is done: gate .qa/reports/2026-10-07T16-05-21 — browser tests 31/31, Studio E2E 158/158; the only ✗ is the cloud-only chat emoji [fit] (Backlog P3). Batches 6b, 7 and 9 are done too (gate --all .qa/reports/2026-10-07T16-41-07 after 6b: ✗ only the cloud-only TabItem axe and chat emoji [fit]); the batch 8 decision list is complete. After it: the official Inter WOFF2 (same build), the §16 pairing audit check (`roles` warn, not yet run on every page: the final --all was stopped by the user) and the docs-nav contrast skip in audit.mjs. Open from today in BACKLOG: Figma check of ToggleListItem/ChipGroup (P2), bordered boxes in phone screens (P2), cloud-only gate failures, flaky usage selftest under a parallel gate, side-panel coverage. A backlog sweep (2026-10-07) checked the ~440 open items against the code: ~145 were done or
  duplicates and are closed with evidence (4 more close with the 5b gate); ~290 stay open (~214 work, ~63 decisions,
  ~13 need a check by hand). New P2: qa step ④ (example coverage) reads no `examples/pages` source. Batch 8 (the
  decision list) answered the same day (user: "theo đề xuất"): 12 rows closed, the approved work is tagged
  "Decided 2026-10-07 … → batch N" in BACKLOG (5c Studio, 6 components, 6b examples/docs, 7 Figma and fonts, 9
  tooling); still the user's: the Code Connect seat and package publishing; the designer questions are unchanged.
  `npm run qa` runs `studio:selftest` + `studio:e2e` when Studio files change (`uiKind` "studio" in tools/qa/lib.mjs).
- **Studio slots (2026-10-03, session "Slot Component phân biệt"):** spec `docs/research/studio-slots-spec-2026-10-03.md`.
  Client `src/platform/studio/slots/*` is live (Slots section, insert picker, Remove/⌫, ⌘D, canvas slot outlines, Layers
  slot rows, Reset slot / Clear contents); server ops in `tools/studio/slots.mjs` (live since the 2026-10-03 17:37 swap).
  Playground slots stay empty; only example/template files accept structural ops. Since 2026-10-04 (user: editing is
  free) the palette offers every DS component and host rules warn ("Not recommended here") instead of hiding; stateful
  items carry `state` and the server declares their useState (slots.mjs stateFor / hookEdits; Image imports
  platformMedia in example pages). `palette.selftest.mjs --deep` checks every item in every host.
  Data slots (props written as objects, `slots/dataSlots.ts` + server `tools/studio/items.mjs`): TopNavigation
  Top-Trailing (`trailing`, array) and Header-Trailing (`largeTitleAction`, form `list` = one object or an array) take 3
  each since 2026-10-05, matching Figma's Trailing-Slot and the component's `MAX_ACTIONS`; Control-Slot is a content slot.
  TopNavigation grouped actions (2026-10-05): `trailing[].group` (runs of one group share a pill in the bar style;
  `trailingGroup` deprecated); the slot has `groups: true`, so the Studio drags items on the canvas (`edit/itemDrag.ts`,
  armed from SelectionLayer onPointerDown) and in Slots rows (`DataSlotBlock` pressRow), server ops `groupItem` /
  `ungroupItem` / `moveItem regroup` in `tools/studio/items.mjs` (selftest 20 cases). propGroups entries can carry
  `warn` (shown under the field, never hidden).
- **Figma-grade editing (2026-10-03, session "Figma-like editing functionality"; plan
  `docs/research/studio-figma-editing-plan-2026-10-03.md`, all 8 phases done):** code in `src/platform/studio/edit/**`
  (mounted by `EditLayer` in StudioCanvas; hooks in SelectionLayer press / double-click / Enter / empty-canvas, LayersPanel
  press, StudioApp Delete / ⌘D and the Assets tab, CanvasMenu clipboard group, ShortcutsDialog rows), server ops
  `moveTo` / `pasteCode` / `many` in `tools/studio/arrange.mjs` (wired by slots.mjs, test `arrange.selftest.mjs`, in
  `node tools/studio/selftest.mjs`), `GET /element` `range`. Inline text edit, drag + arrow reorder, clipboard,
  Tab/⇧Enter + ⌥ measure, Layers DnD, Assets tab, Quick actions ⌘/, marquee (drag on empty canvas no longer pans:
  Space / Hand / scroll) and multi-layer Delete / ⌘D / copy / Mixed props. Follow-ups in BACKLOG.
- **Grid columns on the canvas (2026-10-06, session "Search spacing collapse bug"):** `select/gridTracks.ts` (+ selftest in
  `studio:selftest`) reads/writes a Grid's px column at the frame's breakpoint (setProp `columns` or setField of its
  key). Resize: the only item of a px column that fills it (no Fixed width of its own) resizes the column
  (`resize.ts` rule `column`, preview on the Grid's track list); spacing: grid gaps between tracks, `free` areas +
  Fit column to content (`SpacingLayer`). An item with a Fixed width still edits its own width (one request = one element).
- **Position / effects / corners (2026-10-03):** Stack/Grid/Box `position`, `constraintX/Y`, `inset*`; Box `effectStyle`,
  `clip`, per-corner radius; Image corners (spec `docs/research/studio-position-effects-radius-spec-2026-10-03.md`).
  Studio UI: the Position section is built (2026-10-04, session "Cho phép edit element floating":
  `src/platform/studio/position/**`, mounted by DesignPanel above Layout; any other layer floats in a Box, server op
  `unwrap` takes it away again); Effects and CornerRadiusField are still the next block (Backlog).
- **Object/array props (2026-10-04, B2):** props written as `{ … }` or `[{ … }]` are edited field by field (op `setField`,
  `SourceAttr.shape`; inspector `ObjectProperties.tsx` + `objectSchema.ts` read `docs/api/<slug>.json` types).
  `node tools/studio/editability-audit.mjs` counts what stays locked by class; next steps (B2+, B3–B5) in BACKLOG P2.
  **Data slots (2026-10-04, session "Mở lại port preview"):** Figma slots whose content the code takes as objects
  (`slots/dataSlots.ts`: TopNavigation `trailing` = Top-Trailing, `largeTitleAction` = Header-Trailing; Control-Slot
  `controlBar` is a content slot in `registry.ts`). Server ops `insertItem` / `removeItem` / `duplicateItem` / `moveItem`
  (`tools/studio/items.mjs`, test `items.selftest.mjs`); client `slots/dataItems.ts` (an item on the canvas = the part
  whose props hold the item object itself), `slots/DataSlotBlock.tsx` (Slots rows), `inspector/DataItemPanel.tsx` (a
  selected action: fields, move, duplicate ⌘D, remove ⌫), generic list controls in `ObjectProperties.tsx`.
  **Figma property groups (2026-10-05, same session):** `inspector/propGroups.ts` (registry, TopNavigation only; test
  `propGroups.selftest.mjs`, in the Studio selftest) + `GroupedProperties.tsx` replace the flat Properties list and the
  "Nested instances" section for a grouped component; nested-instance logic moved to `inspector/nestedInstances.ts`
  (its write()/valueFor are owned by session "Nested boolean không hoạt động" since 2026-10-05).
  **Text alignment (2026-10-05):** Text/Heading `align` = Figma's icon Alignment under Style (`TextAlignControl`, editor
  kind `text-align`; unset shows `textInfo` `RenderedText.align`); `truncate` = Truncate text + Max lines (kind
  `truncate`, `LinesControl`); Text/Heading take `height`, `verticalAlign` and `align="justify"` (row "Vertical", note
  from `textInfo` `alignmentHint`); host text elements get the rows from `inspector/HostTextAlignment.tsx` (inline style).
  Since 2026-10-03 admin edits are **drafts** on the dev server (`drafts-<port>.json` in `node_modules/.cache/zen-studio`)
  until Save: per frame (frame toolbar "N changes · Discard · Save", `tools/studio/frame-scope.mjs`) or Save all
  (toolbar, ⌘S). A drafted file renders from its draft on 5173 too, so `npm run qa` warns ("Unsaved Zen Studio drafts")
  when its browser checks see one; a disk edit to a drafted file rebases the draft onto it.
  Resize (2026-10-03): `select/resize.ts` + `ResizeLayer.tsx` (canvas handles, wrap of components in a filling Stack
  via the server op `wrap`), `inspector/SizingSection.tsx` (mounted by the Layout section owner through
  `inspector/fieldApi.ts` LayoutGroupProps + `api.apply`), `studio/cloning.json` (what is never wrapped; read by
  server and client). Slots (session "Slot Component phân biệt") live in `tools/studio/slots.mjs` + `studio/slots/*`.
  Multi-select + wrap (2026-10-03, session "Chọn nhiều element vào container"): Shift+click (canvas) or Shift/⌘+click
  (Layers) adds layers; the extras live in `select/multiSelection.ts` (own store, cleared when the primary changes,
  moved by writes), the Inspector shows `inspector/SelectionActions.tsx` instead of the Design panel. ⇧A wraps them in a
  Stack inferred from the render, ⌥⌘G in a Box (`select/wrapSelection.ts`, server op `wrap` + `with`). Delete/⌘D stay
  one layer (blocked with a status while several are selected).
  Inspector writes go through `inspector/writePlan.ts` (2026-10-05, user: edits keep behaviour): a prop bound to
  `useState(<literal>)` edits that literal (op `setStateInit`, `SourceAttr.state`), an uncontrolled state prop writes its
  `defaultX` twin, a boolean off is removed unless its default is true; such writes remount the frame
  (`board/remount.ts`). Nested-instance writes and the builder plan's WP-C reuse the same module.
  The Design tab (`src/platform/studio/inspector/DesignPanel.tsx`) runs in this order:
  1. The header (UI3, 2026-10-06): name · ×N · Detach/Remove icons (`compact`), kind · Docs, file:line + copy.
  2. Layout, which holds the Size group (`SizingSection.tsx`).
  3. Properties (plus inherited HTML booleans: disabled/required/readOnly, `propSchema.ts` `propSpecs`): Figma groups, else
     `autoGroups.ts` sections (Appearance · Content · Icon · State · Actions · More) and one section per object prop.
     Design panel UI3 (2026-10-06, `docs/research/studio-design-panel-ui3-2026-10-06.md`): Body/Small only; bound values
     show their control + a ƒ mark (`Section.tsx` BoundMark) and edit to a fixed value; read-only values in `StaticField`.
  4. Nested instances (`NestedProperties.tsx`, logic in `nestedInstances.ts`): booleans of the Zen components the
     selection renders from its props, found by fiber ownership (consts, helpers, local components, other files and
     Table column cells included; children are slot content). Writes go through `writePlan.ts` in a per-hook queue;
     data-bound booleans (`SourceAttr.origin` bound-value/loop-bound) have a switch + Restore (GET /element
     `savedAttributes`); `api.ts` rebases a stale edit across the Studio's own prop-level writes (2026-10-05).
  Under a spread, a prop the spread does not feed stays editable in every section (`propSchema.ts` `ownValueOf`); the
  server's setProp writes it in front of the first spread. `PlatformExamples.tsx` must export components only (and
  types), or every Studio edit to a playground reloads the whole page.
  5. Slots/Children (`studio/slots/`).

  Every control writes through `FieldApi` (`inspector/fieldApi.ts`: `apply` = one write and one undo step). The redesign
  spec is `docs/research/studio-inspector-redesign-2026-10-03.md`. Phases 2–7 are in the Backlog. The gate cannot map
  Studio files to a page ("Page mapping" ✗), so verify them in `?ui=studio` by hand.
- **List Item + List Box (Figma sync 2026-10-06 night, session "List Item padding/gap adjustment"):** rows pad
  Padding/Small 12px above and below, 0 at the sides (no Device variant); a clickable row's fill = the row's height,
  12px past it sideways, corners `--zen-interactive-list-item-radius`; List gap 3XSmall for every row. `ListBox`
  (Figma Component/List-Box 14922:75297, in `src/components/ListItem`): Surface, 2XLarge, header/footer Card-padding-medium,
  body Card-padding-medium × `--zen-list-container-vertical-padding`, gap 3XSmall — use it instead of a Box padded by
  hand. Phone lists across a screen: `Box paddingX="lg" paddingY="xs"`. No `--zen-list-bleed`; `List inset`
  deprecated. Studio: slots ListItem Contents, ListBox Header/Body/Footer; Detach gives rows `paddingY sm`.
  Since 2026-10-06 (user): ListBox only for List-Item rows; Description List, toggles, forms, Tabs stay in a Card. ListBox
  `theme` (flat default · shadow · pale · border) is picked by usage rules §16 (Sidebar → shadow, white page/phone or
  Surface-in-Surface → border).
- **Description List in Figma (2026-10-04):** built from code on the new page ❖ Description List (14857:3): `Description List`
  14859:79180 (Layout × Divider, Items slot) + `.Primitives/Description-List/Item` 14859:78890 (8 variants). No figma-contract
  suite yet (Backlog if wanted).
- **Phones (2026-10-01):** every phone example follows `docs/research/top-navigation-mobile-rules-2026-10-01.md`.
  - The rules: R1 scroll-linked TopNavigation, R2 one key per screen, R15 ActionBar footers.
  - The length rule: a list screen is at least 1.5× the phone's height, about 14 rows.
  - The examples session applies it to `src/platform/examples/**`. Playgrounds, the Typography and Text phones, and
    the mobile templates already follow it.
  - TopNavigation's fold survives screen swaps (G1). PlatformPhone pads the screen's scroll under an overlaid header
    (G2).
  - Roots follow Figma Top-bar=false: there is no empty bar row, and the actions sit beside the large title (G4/G5).
    `topBar` forces the row.
  - `banner` pins a status under the bar (G6).
- **Uncommitted, to keep together (2026-10-02):** session "Component library review và fixes" has not committed yet.
  Its working tree also holds spacing-ladder fixes from "Add audit check…" (commit e129549), on lines that exist only in
  that uncommitted work:
  - layout.tsx: 5 Stack gaps.
  - content.tsx: 1 gap.
  - HrHomeTemplate.tsx: page stack xl/sm.
  - HrExpenseOverviewTemplate.tsx: Team budgets xs.
  - component-usage-rules.md: the §13 `ladder` bullet.
  Commit them with this work.
  - `.platform-phone` has the mobile breakpoint tokens (`data-breakpoint="mobile"`, user-approved 2026-10-01). Interactive
    list rows pad Padding/XLarge (24, Figma) since 2026-10-03; `inset` is deprecated.

## Gate

`npm run qa` checks what this session edited since its last pass (tokens → consumer pages; `--only=`, `--pages=`,
`--all`, `--keep-going`); `npm run qa:quick` is the fast loop and never counts as a pass. Open the contact sheets it
asks for (new content, at most 12). Process: `docs/qa/build-qa-process.md`, skill `skills/zen-build-qa`. Owner of
`tools/qa`, style-guard, audit flags and hooks: the session "Quy trình kiểm tra Component build".

## Working rules

- **Scope lock:** do only the task the user approved; one Backlog line per follow-up (`BACKLOG.md`); another session
  cannot approve scope.
- Several sessions edit this folder at once: re-read a file right before writing, make targeted edits, ask the owner of a
  shared area with SendMessage first.
- Owners (2026-09-28): Chat demo wiring (`chatDemo`, `ChatReactors`): "Search popover component và Overviews";
  vibe-code readiness, `AGENTS.md`, VisuallyHidden, appLayer: "Đánh giá Zen DS hiện tại"; `tools/figma-contract`:
  "Figma contract button suites".
- Scratchpad test scripts vanish with the session: anything worth keeping goes to `tools/`.
- House rules most often forgotten: `HANDOFF-details.md` ("House rules") and `docs/component-usage-rules.md`.

## Open items and Backlog

Work items are in [`BACKLOG.md`](BACKLOG.md); questions for the designer and decisions for the user are in
[`QUESTIONS.md`](QUESTIONS.md) (since 2026-10-08). New rule (user, 2026-10-08): a bug or gate finding met while working
is fixed in the same change; only those two kinds go to the files above.

# Session log 2026-10-18

## Zen Agent in Studio for vibe design: plan + V-1 baseline (user: "Plan trước … Plan chứ khoan làm") — plan, no code

- Plan `docs/research/studio-vibe-agent-2026-10-18.md`: embedded agent panel, loop in the dev server on the Anthropic SDK
  Tool Runner, Studio MCP tools run through the relay in-process (replaces the Agent SDK of the 2026-10-05 spec).
  User decisions: API key or `ant auth login` (per-token billing); Opus 5.5 default + Sonnet 5.5 / Haiku 5.5 picker;
  floating panel left of the canvas only; ⌘Z per step + "undo the whole turn"; phases V0–V4 each approved separately.
- V-1 (approved): sales dashboard on an empty Studio page through Claude Code + zen-studio MCP. 13 canvas calls, 2 undo
  steps for the whole build, 2 refusals (ids stale after the person switched project; open_page cannot see another
  project), 12 knowledge calls (most of the tokens), ~66 s, 0 dialect errors. Gaps folded into V0/V1 (plan §7);
  two questions to BACKLOG (chart currency in the dialect, BarList in a stretched card).
- Test pages left in Studio for the user to look at and trash: "V-1 · Sales overview" in two projects
  (ids v-1-sales-overview, v-1-sales-overview-2). No code changed; no gate run (docs only).

## Zen Agent V0 (user: "làm V0 đi") — tier M, worktree `../Zen-DS-agent`, branch `zen/feat/studio-agent-v0-20261018`

- Built per plan §4 (`docs/research/studio-vibe-agent-2026-10-18.md` §8 lists it): `tools/studio/agent/*` (Tool Runner
  turn over the Studio MCP tools through the relay, zen-ds over stdio, check_page, routes `/agent/*` behind the `/edit`
  guards), panel `src/platform/studio/agent/*` (⌘J, toolbar ✦), plugin/StudioApp/CanvasTools/ShortcutsDialog/AiChip/
  runtime small edits. User asked mid-build whether the agent uses Zen rules + harness while vibing: yes — the usage
  harness runs after every changing turn and the findings the turn caused go back to the model (2 rounds); wiring rules
  (button without action) are listed, not forced, on design pages.
- Found on the way: "make it secondary" trips `button/secondary-justified` (the agent now reports it); a panel answer
  raced a New chat (generation guard); the check stayed "fixing" when the model changed nothing (now "left"); the panel
  header sat under the floating bars below 1280px (now starts under them).
- Checks: agent.selftest 17/17; E2E AG-01…06 6/6 ×3 (baseline +6 rows); studio:selftest all; tsc; style/usage guard on
  the new files; screenshots 1512 / 390 / dark, transcript restored after reload. Live run with a real key: waits for the
  user (no key on this machine).
- Gate in the worktree: `npm run qa -- --isolated --files=<the V0 files>` PASS (report
  `.qa/reports/2026-10-17T21-08-16-6afafa79.md`, Studio E2E 324 works · 0 broken). D-01 failed first, also on clean
  main: commit 4ff67077 (card grey-canvas fix) carried the E2E leftover `save-a level="primary"` in
  `src/platform/examples/e2e/StudioSaveFixture.tsx`; restored to `tertiary` on this branch (fix at its owner).

## Dark lift in Global Colors (tier XS token change, session "Studio project theme customization"; asked by session "Kết nối GitHub cho Zen Figma", approved by the user here: "Làm luôn")
- The Zen plugin (commit 5ce6ba8) changed its ramp algorithm. `generateScale` is now the contrast ramp (`generateBaseScale`)
  plus `liftDarkSteps`: Dark Accent steps 2–8 and Dark Neutral steps 2–7 get +0.020 OKLCH L (`DARK_STEP_LIFT`, chroma
  gamut-mapped).
- `node tools/studio/zen-ramp-extract.mjs` re-copied it into tools/studio/zen-ramp.generated.mjs.
- Global Colors regeneration:
  - The Zen mode was regenerated for all 20 ramps on the #121212 dark canvas.
  - 278 Dark values changed and 0 Light; the Gray and Blue samples match the plugin exactly.
  - Zen-High-Contrast was recomputed with scripts/high-contrast.mjs (279 values; 0 rule failures).
- figma.collections.json: note and date updated. tokens:build, styles:build and native rebuilt.
- Checks:
  - tokens:check ✓, styles:check ✓, tokens:native:check ✓.
  - project-theme.selftest 1961 ✓: the copy rebuilds the new Global Colors exactly.
- Also: PR #124 makes `zen-ramp-extract --check` warn instead of failing. The plugin's change had made every session's
  studio:selftest fail on this Mac.
- Figma: the user runs Update in the Zen plugin so the Zen file matches.

## Zen Agent V1a (user: "plan V1 trước đi", then "OK") — tier M, worktree `../Zen-DS-agent-v1`, branch `zen/feat/studio-agent-v1-20261018`

- Plan §9 recorded with the user's "OK" to every recommendation (chat per page, ask when a request breaks a Zen rule,
  eval budget with Sonnet + Haiku, V1a → V1b → V1c). V1a built: model picker (a Menu at the panel's foot; the AiChatField
  model slot cannot anchor a Menu), Undo turn, `ask_person` (+ POST /agent/answer), pictures (paste or +, `pictures.ts`),
  transcript parts in order, canvas flash of the changed layer for any MCP client (`mcp/highlight.ts`).
- Found on the way: the flash outlined the parent Stack too ("Added to #parent" in the insert answer) → ids after
  Added to / Moved into / Copied / Deleted are left out, children too; the E2E helper read the previous "Stopped" reply
  as the new one → waits for the new reply; the tab's update answer is "Changed:" + outline → step details join them.
  Machine load (replayd ~90% CPU, load 14) made two E2E repeats time out; reruns at load 6–9 passed.
- Checks: agent.selftest 21/21, mcp.selftest 14/14, E2E AG-01…12 12/12 ×3 (baseline +6), tsc, style/usage guard on
  the new files; screenshots 1512 / 390 (flash on the Button only, question card, model menu, picture).

## Project variables: only the project's mode (tier S, session "Studio project theme customization"; user: "trong variables
studio chỉ hiện của project đó, không cho hiện project khác hoặc mặc định (mode Zen)") — worktree `../Zen-DS-project-vars`,
branch `zen/fix/project-variables-20261018`

- `project/projectVariables.ts`: `withProjectMode` gives Base Colors (Project) one mode, named after the project,
  instead of putting it before Zen. Drafts keeps Zen.
- `VariablesWindow.tsx`: inside a project that collection's rows are fixed. Rename, Duplicate, Delete and Create
  variable are off; Enter / Delete say "This project's colours change in Project settings"; a value opens Project
  settings, as before. The collections menu counts the shown modes (Base Colors (Project) · 1 mode).
- Checked on a private server (:5197, Playwright): project Demo → headers Name | Demo, Create variable disabled, Enter
  makes no rename field, Delete removes no row, a value opens Project settings; Drafts → Name | Zen, Create enabled.

## Studio component boards + Main component coverage (tier L, session "Bug")

User: "Update lại Progress component từ Figma lên Studio" · "Kiểm tra lại hết các main component của Studio đã hiển thị
đủ chưa" · "Sắp xếp layout của các trang component trên canvas lại cho gọn gàng và chuyên nghiệp hơn. Mỗi lần bổ sung
để kiểm tra lại layout" (layout picked: "Xếp dọc theo khu") · "Bug UI của section badge".
- Progress from the live file: Progress-Bar fills None 0 / Low 20 / Medium 40 / Good 80 / Done 100 (grid weights);
  Progress-Circle/Icon Done=No is an 80% pie. Map: `main: { prop, values }` on a skipped VARIANT (figma-props.map.mjs)
  → variant-sets-build draws it; MainComponentFrame turns numeric axes into numbers. Same for Rating and SkeletonText.
  ProgressCircle maps Progress-Circle + Progress-Circle/Icon (Theme row in Properties) + an Assets item.
- Probe of all 40 Main component pages (scratch Playwright): zero-width cells Divider / NPS / Dashboard header rows →
  a collapsed variant takes its set's Figma width (356 / 212·392 / 1232, else 360).
- Board: StudioBoard sections Component (row) · Examples (wrap) · Docs (masonry, boardLayout.ts `masonry` + selftest);
  frames "guidelines" and "props:<Component>" (ComponentProps `only`, unique ids); zoom-to-fit takes every section.
- E2E group `board`: BL-01 (stack, edges, gaps, frames inside sections, Docs columns, tab padding) and BL-02 (no empty
  Main component cell) over the 49 component pages, 156 s; both works, in the baseline.
- Still open (BACKLOG): Main component not drawn for components without an Assets item (ToggleButton, BadgeCounter,
  HeadingField, SkeletonShape, OpinionScale, UploaderFileItem, ControlBarSelectItem, InputConditionItem, Chat parts),
  the five overlays (deferred by design), 13 components with no variant set mapped, Dashboard header Navigation/Custom
  rows drawn without their content.

## AppShell collapses a customised Sidebar (user: "lỗi sidebar lúc expand và collapse khi dùng template … nếu user gọi sidebar ra rồi custom") — tier M
- Cause 1: AppShell read the rail from `sidebar.type === Sidebar` + its props. Measured (scratch vitest, 1440px): a
  Sidebar wrapped in an app component got no control at all (240px, no toggle); wrapped with `collapsed` it stayed an
  84px rail with no way out; a wrapped Sidebar with its own `collapsed` + `onCollapsedChange` beside a shell prop showed
  two controls and the top-bar one did nothing. Same for a Sidebar in a Stack (Studio wrap) and a Studio ⌥⌘K main,
  which compile.mjs exports as `<LocalFn />`.
- Fix: `SidebarShellContext.register` (`_shared/sidebar-shell.ts`). The Sidebar registers in a layout effect
  (canCollapse = not workspace, its `collapsed`, owns = has `onCollapsedChange`, `request` = a stable call of it); the
  drawer copy never registers. AppShell reads a Sidebar passed straight in from its props as before (first render, SSR)
  and a deeper one from the registration; the first word from a wrapped Sidebar seeds the rail unless
  `defaultSidebarCollapsed` is set; an owning Sidebar keeps its header control and the shell's toggle /
  `useAppShell().toggleSidebar()` call its handler.
- Cause 2: HrShell's footer was a raw `<button><Icon/><span>`; Studio's template copy turns it into Stack + Icon + Text,
  which the rail CSS (`> button > span`) cannot hide: rail 122px with "Apps" showing (the user's page "HR · Expense
  overview"). Footer is now `<SidebarMenuItem id="apps">` (onItemClick "apps" → the demo toast): 84px, label hidden,
  name "Apps".
- Tests: 6 new cases in `tests/interaction/app-shell-sidebar-context.test.tsx` (wrapped, wrapped collapsed,
  defaultSidebarCollapsed wins, Stack wrap, owning Sidebar + useAppShell, footer SidebarMenuItem 84px). AppShell,
  Sidebar slots, nested overrides, navigation and smoke suites: 411 passed. tsc clean; guidelines rebuilt (Sidebar
  `collapsed` now documented).
- Gate: `npm run qa -- --isolated --keep-going --files=…` PASS (report `.qa/reports/2026-10-17T19-10-54-c49938e0.md`;
  full vitest 70/70 on the second run, the first lost 3 unrelated-looking tests to load ~18 with another session's gate
  running; my suites passed 4/4 repeats). Sheets read: templates (HR Apps row aligned, rail shows its icon alone),
  app-shell, sidebar. Studio page "HR · Expense overview" (its Stack footer) still to replace once the Studio tab is
  open again (the tab closed during the session).
- Gathered by "Giám sát" after the session closed (PR zen/fix/appshell-wrapped-sidebar-20261018), with the "Bug"
  session's Studio E2E SP-08 update (`tools/studio/e2e/scenarios/starters.mjs`: `appsButton` → `appsItem`), which must
  land together with the HrShell footer change.

## Studio in Figma's words and keys — F0 (user: "Đồng ý theo đề xuất, làm F0 trước") — tier M, worktree `../Zen-DS-figlang`, branch `zen/feat/studio-f0-words-keys-20261018`

Plan `docs/research/studio-figma-design-parity-2026-10-18.md` (audit + plan written this session, every §4 recommendation
approved). F0 applies its glossary (§3a) and keys.
- **Keys:** `edit/figmaNotYet.ts` — Figma keys Zen lacks (⌘R, ⌘G, ⇧⌘G, ⇧⌘L, ⌘E, ⌥⌘O, ⌃⌘M, ⌥⌘A, ⌘Y, ⇧⌘C, ⌃⌥T/H/V, ⌃G,
  ⇧R, ⇧S, ⇧P, ⇧H, ⇧V, ⇧N, K, S, P, C, I, N) say "X isn't in Zen Studio yet" (⌘R / ⌘G / ⌘Y / ⌘E kept from the browser
  even in a field). ⌘K = Actions (⌘/ stays), ⌘F = Find a layer, ⇧⌘K = Place image/video (the Image tool), Enter = Select
  children (all of them), ⌥⌘↵ = Present (a page you made plays its prototype; P was Play), ⇧0 = Zoom to 100%, ⇧2 = Zoom to
  selection. Show/Hide UI no longer persists hidden across a reload.
- **Words:** one tooltip shape `tip(name, keys)` (`shell/ShortcutTip.tsx`); menus Bring to front / forward, Send backward
  / to back, Delete, Show/Hide UI, Create component, Group selection and Lock (off, "Not in Zen Studio yet"); Inspector
  Layers (was Children), Layer size, Alignment, Typography, Reset all changes, "Alignment works only inside auto layout",
  no "Reset to auto"; status lines name tokens ("Gap → XLarge", "left 4XLarge · 48"), "Unsaved" for drafts (dialogs:
  "Discard changes to …"), "Deleted"; Layers row titles and empty states without code; US spelling; option labels by
  Figma names (`controls/scale.ts optionLabel / valueWords`).
- **`words.ts`:** gate adds attribute, markup, render, source, HTML, dev server, Stack / Box; Stack → auto layout frame,
  Box → frame; a / an fixed after a swap; identifiers and paths kept (`data-zen-src`, `src/components`, `List-Box`).
- **Guard:** `words.selftest` part 3 harvests 1,542 UI strings (JSX labels, tooltips, titles, text, menu labels) and fails
  on a retired glossary term (`RETIRED`) or code words in a JSX label. New opt-in E2E group `figma` (FW-01…10, plan §6:
  the Figma walk's scoreboard) — `npm run studio:e2e -- --only=figma`.
- **E2E updated** for the new words: P → ⌥⌘↵ in prototype / builder / dnd / build-check, SE-03 (Enter selects all
  children), I-31 (Unsaved), AP-02, drafts D-01, MC-07, starters (Delete Reports), instance.
- **Interact on a page you made:** off the toolbar and off I (Figma's Pick color), but kept in Actions (⌘K › Interact):
  Play starts only on a Screen, so an Overlay frame's form (the Dashboard template's New project DateField, SP-24, the
  user's 2026-10-15 "date input… hoạt động như bình thường") had no other way to be tried. Figma's answer (Present from
  the selected frame, an overlay too) needs Player.tsx (AppShell session's file): later, with them.
- **Runs:** tsc ✓; `studio:selftest` ✓; `studio:dnd` 19,442 + 12,569 cases, 0 findings; style / usage ✓. Full Studio E2E
  326 / 332, the 6 regressions were old words in the tests (I-31, AP-02, B-43, NO-07) and Interact on templates (SP-23,
  SP-24): fixed, all 6 pass on rerun. `--only=figma` 10 / 10 (FW-10: the undo line reads "Undid “auto layout frame Gap →
  XLarge”").
- **Left (BACKLOG P1 line):** Code properties rows → the Code tab (structural, after F1); Rename / Lock / Group get built
  in F1–F3; Present from an Overlay frame.

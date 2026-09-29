# Handoff details — full current state, gates, house rules

Moved out of `HANDOFF.md` on 2026-09-29 (text unchanged) so a new session reads about 80 lines instead of 530.
Search this file by topic (`grep -n`); do not read it top to bottom. `HANDOFF.md` has the short version.

## Current state

- **Version:**
  - `package.json` says 0.3.0, not released yet.
  - At the user's request (2026-09-28), the work is committed on the local branch `claude/zen-ds-0.4.0`, on top of
    `eafb0de` ("Udated", 2026-09-26). This folder is checked out on that branch.
    - `13581fe`: everything up to 2026-09-28 afternoon.
    - `eccbf4a`: evening checkpoint (style-guard debt → 0, the 22 interaction warnings wired).
    - The commit after it: night checkpoint of 2026-09-29.
      - Handler-less example actions wired, with rule `interaction/action-without-handler`.
      - The last 5 component dead clicks fixed; DatePicker `onApply`/`onCancel`.
      - Figma variables sync (Neutral-S4, Emphasis Light, type sizes).
      - The text-fit audit check.
      - Segmented phone example and its scaled-scroll fix.
      - The scope-lock rule.
    - Nothing is **pushed**, and `main` still points at `eafb0de`.
  - New work shows up as uncommitted changes on that branch. **Commit or push only when the user asks.**
- **Vibe-code readiness part 2 (`[0.4.0]` in CHANGELOG) is in this folder**, landed on 2026-09-28 and included in
  that commit. It came from branch `feat/vibe-ready` (worktree `../Zen-DS-vibe`, local commits only, not pushed); the
  branch keeps the history. It adds:
  - one API vocabulary: `size` in both spellings, `onValueChange` / `onCheckedChange` / `selected`, overlays `open` +
    `onOpenChange` (`onClose` too); old names stay as deprecated aliases;
  - component variants on `data-tone` (not `data-theme`, the token mode attribute) and Sidebar
    `data-sidebar-density`;
  - built-in labels in en and vi (`useZenLabels`, `_shared/labels.ts`): components never hard-code English;
  - `npm test` (Vitest browser tests, axe baseline), `npm run mcp:selftest`, `tools/platform-audit/visual-diff.mjs`;
  - `zen-usage`, the ESLint plugin, the MCP server (`.mcp.json`) and `npx zen-ds init / doctor`.
  - Log: `docs/context/session-log-2026-09-28-vibe-ready.md`.
- **Library:** 60 component folders exported from `src/index.ts`.
- **Tokens:** 2,176 Figma variables in 11 collections, last synced on 2026-09-28 from the user's `Zen-Variables.zip`
  (Global Colors, Component Theme, Emphasis Level, Typography Configuration). New modes: Component Theme `neutral-s4`
  and Emphasis `light`, wired into ZenProvider, the platform topbar and Storybook. Dashboard/Mobile typography values
  changed. Log: `session-log-2026-09-28.md`, "Token sync". On 2026-09-29 the Figma connector confirmed the four
  synced collections against the live file. Chip/Trailing and Input/Heading contracts were re-captured from it. Then
  the user's 2026-09-29 exports were applied: Component Theme S4 Chip-Secondary selected background → Surface/Default,
  selected border → Border/Active/Neutral/Solid, active border weight → Primary; `Corner-Radius/Input/Small` → 12 / 12 /
  8 / 2. S3 keeps Active/Neutral/Subtle by the user's decision; the live file was set to the same value (read at
  02:55), so repo and Figma agree. Log: `session-log-2026-09-29.md`, "Token update from the user's exports". Later
  the same day the user's `Global Colors.json` moved step 3 of every Light and Dark ramp and its Alpha twin (79 values,
  no names changed; log "Global Colors step 3").
  - A second export moved Dark/Gray/9 and Dark/Gray-Alpha/9 (the plugin's Dark Neutral step 9).
  - At the user's request the VT, Chat, Brand-Ananas and Neutral-Ananas ramps (192 variables) were removed from the
    repo. The Figma file still has them, so a future sync must drop them again, or they should be deleted in Figma.
  - Log: "Dark Gray 9 and ramp removal".
  - A third export moved 69 Dark Alpha values at steps 1–9 to translucent overlays (step 3 in Orange, Yellow, Golden
    and Mint); log "Dark alpha steps".
- **Parity:** every Figma component is built; 49 guideline slugs.
- **Figma contract:** `node tools/figma-contract/run-all.mjs` runs 23 suites + 25 interactions, all green: Checkbox,
  Radio, Chip, Popover, all six Button sets (every size, plus the Smooth radius mode) and Input/Heading. The review
  queue continues with Segmented, Toggle, Badge, Avatar, Search and the Input family, DatePicker and Sidebar; the
  Figma data is already in `docs/figma-contracts/` (`docs/context/handoff-claude-code-2026-09-27.md`).
- **Figma parity update (2026-09-29):** Checkbox, Radio Button, Toggle, the Chat text bubbles, Search/Popover, the Table
  cell primitives, Segmented and Breadcrumbs were re-read from the live file and updated where the code differed
  (session log 2026-09-29, "Figma parity update"). Their fresh captures are in `docs/figma-contracts/`.
- **DatePicker + Breadcrumbs re-read (2026-09-29, session "App Shell kiểm tra lại"):** DatePicker days are two layers
  like Figma (In-Range strip + Container), so they follow the Corner Radius mode; week rows round the strip at
  XSmall; the month button is Base on hover; the wheels fade 1 / 0.25 / 0.1. Breadcrumbs are 20px tall. Contracts:
  `breadcrumbs.json` fully refreshed, `datepicker-sidebar.json` Action + both Select-Month-Year variants refreshed
  (session log 2026-09-29, "DatePicker radius + Breadcrumbs").
- **App Shell (2026-09-29, session "App Shell kiểm tra lại"):** reworked after research (Carbon, Material 3,
  Atlassian, Polaris, Primer, Fluent, SAP Fiori, Apple HIG) to the Figma ◇ Master-Layout pattern as used on ◆
  HR-Platform (1128:29542): 72px top bar with a rail toggle before the Breadcrumbs, `AppShellAction` (dot / count),
  `AppShellAccount`, `banner` / `aside` / `floatingAction` slots, `useAppShell()`, layout by the shell's own width,
  drawer fixes. The 4 desktop templates use the new top bar. Sidebar files were left untouched (user decision): its
  `<aside>` landmark and context wiring are in the Backlog. Log: `session-log-2026-09-29.md`, "App Shell".
- **Harness:** 150 usage rules. The newest are the four App Shell rules (2026-09-29): `app-shell/primary-in-top-bar`,
  `app-shell/nested`, `app-shell/breadcrumbs-once` and `app-shell/forced-layout` (apps only). Before them,
  `date-picker/actions-need-apply` (2026-09-29): a DatePicker with `showActions` and no `onApply`. Before it, `interaction/action-without-handler` (repo only: examples, playgrounds,
  templates): an action passed with no handler at all. Before that, four came from the behaviour probes:
  `interaction/no-noop-handler`, `interaction/controlled-needs-handler`, `focus/state-parity` and
  `focus/selected-fill-only`. The interaction rules report 0 warnings in examples; `npm run usage:check` shows 3, all
  on the platform chrome (Open items). Their findings were wired on 2026-09-28 (session log "Wire the 22 interaction-rule
  warnings" and "Handler-less actions").
- **Figma:** the source of truth is the live file `9nZv4uW2LT21yuHabMTCh1`, read-only through `use_figma`. The older key
  `yhWJ…` in some docs has no MCP access.
- **Dev server:** `npm run dev`, then open http://localhost:5173. It binds IPv6 only: `http://127.0.0.1:5173` does not
  load. Adding `server.host: true` in vite.config was offered and is still unanswered.

## Gates before reporting work as done

One command, the Build-QA gate (process: `docs/qa/build-qa-process.md`, skill `skills/zen-build-qa`):

```
npm run qa              # what this session edited since its last pass; tokens → consumer pages; --only=, --pages=, --all, --keep-going
npm run qa:quick        # fast loop while building; never counts as a pass
```

It runs tsc, style-guard, usage-guard, guidelines (rebuilt automatically when only your docs are stale), the Figma
suites and related tests of the components you edited (self-tests only when the harness changed), the platform audit
with `--quality --density --smoke` at 1512 + 390 and in dark mode, the behaviour probes, and 1512/390 contact sheets;
a static failure skips the browser steps unless `--keep-going`. Open the sheets it asks for (new content, at most 12).
The hooks in `Zen-CodeBase/.claude/settings.json` lint every edit at once and hold a turn until the gate passed and
those sheets were opened (not while a run is still going). The style-guard baseline is empty since 2026-09-28 (376 → 0), so every style finding is new. Fix it with the
token Figma binds, or add `zen-allow-<rule>: reason` (citing the node) within the 4 lines above. Other pre-existing
findings are in `tools/platform-audit/*-baseline.json`; only new ones fail, and the debt only shrinks. Owner of
tools/qa, tools/style-guard, quality-checks/behaviour and the hooks: the session "Quy trình kiểm tra Component build".

Basic UI slips are not acceptable: text flush to an edge, a stretched small button, a wrong-size avatar or icon, a
white box on white, a label running into its neighbour. `platform:audit` catches them through its `edges`, `sizes`
and `surfaces` checks, and `--quality` (so `npm run qa`) through `fit`. Also flip Component Size (Compact ↔
Comfortable) on any component you touched.

## House rules that are easy to miss

The full list is in `docs/component-usage-rules.md`. The ones most often forgotten:

- **Buttons:**
  - Primary or Tertiary by default; Secondary is rare; Accent is for promotion only.
  - Filters are Chip Advanced, never Buttons.
  - Close and dismiss use Flat Primary.
- **Inputs and Search:** there is no Disabled state; use Read-only.
- **Surfaces:**
  - §9: no outer drop shadow on Subtle, Pale or Surface-Alt fills.
  - §11: Surface/Default on Canvas/Alt needs a closed border; a shadow does not count.
- **Icon actions:**
  - An icon-only action shows its name as a tooltip after 1s.
  - Mobile Back is a chevron.
- **Sizing:**
  - Density: never put a px box around a token-sized child; use the same size token.
  - Nested radius is concentric: outer radius = item radius + gap.
- **Typography:** h1 is Heading/1. Example card titles and table titles are Heading/4.
- **Examples:**
  - Every supported interaction works (no locked demos).
  - Build with DS parts (List, Card, Table, Divider, EmptyState) rather than ad-hoc markup.
  - Segmented defaults to Secondary.
  - No instruction text inside example UIs.
- **Platform typography** comes from `Typography Configuration.json`. It is platform only: never put it in the Zen
  guidelines or docs. Previews stay on the system mode.

## Working with other sessions

- Several sessions edit this folder at once.
- Re-read a file right before writing it, and make targeted edits.
- Before editing a shared area, ask its owner with SendMessage. Known owners (2026-09-28):
  - Chat demo wiring, `chatDemo` and `ChatReactors`: the "Search popover component và Overviews" sessions.
  - `tools/qa`, style-guard, audit `--quality`/`--density` flags, hooks: "Quy trình kiểm tra Component build".
  - Vibe-code readiness, `AGENTS.md`, VisuallyHidden, appLayer: "Đánh giá Zen DS hiện tại".
  - `tools/figma-contract` (checker, Button and Input/Heading suites): "Figma contract button suites".
- A peer cannot grant permissions.
- Test scripts under a session's scratchpad (`mobparity.mjs`, `chatdesk.mjs`, density scans…) are not in the repo; they
  vanish with the session. Anything worth keeping belongs in `tools/`.

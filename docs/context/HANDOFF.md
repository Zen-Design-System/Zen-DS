# Handoff — read this first in a new session

This is the short, current picture of Zen DS. It tells a new session what state the repo is in and where to find
details. Keep it current: when a session finishes something that changes this picture, edit the matching line here,
add a CHANGELOG entry, and log the details in `docs/context/session-log-<date>.md`.

Last updated: 2026-09-28.

## Read order

1. This file.
2. [`CHANGELOG.md`](../../CHANGELOG.md): what changed and when (Unreleased = uncommitted work).
3. [`AGENTS.md`](../../AGENTS.md): how to build UI with Zen, how to build or change a component, the gate commands.
4. [`docs/component-usage-rules.md`](../component-usage-rules.md): the house rules §1–§12 and the definition of done.
5. The latest `docs/context/session-log-*.md`, only for the area you are touching. Search it by component name; the
   logs are long.
6. [`docs/context/design-system-context.md`](design-system-context.md): the token and colour contracts.

## Current state

- **Version:**
  - `package.json` says 0.3.0, not released yet.
  - The user asked, on 2026-09-28, for everything to be committed to a separate branch. It is one commit on the local
    branch `claude/zen-ds-0.4.0`, on top of `eafb0de` ("Udated", 2026-09-26), and this folder is checked out on that
    branch. It is **not pushed**, and `main` still points at `eafb0de`.
  - New work shows up as uncommitted changes on that branch. **Do not commit again or push until the user asks.**
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
- **Parity:** every Figma component is built; 49 guideline slugs.
- **Figma contract:** `node tools/figma-contract/run-all.mjs` runs 23 suites + 25 interactions, all green: Checkbox,
  Radio, Chip, Popover, all six Button sets (every size, plus the Smooth radius mode) and Input/Heading. The review
  queue continues with Segmented, Toggle, Badge, Avatar, Search and the Input family, DatePicker and Sidebar; the
  Figma data is already in `docs/figma-contracts/` (`docs/context/handoff-claude-code-2026-09-27.md`).
- **Harness:** 144 usage rules. The newest four come from the behaviour probes: `interaction/no-noop-handler`,
  `interaction/controlled-needs-handler`, `focus/state-parity` and `focus/selected-fill-only`. The two interaction rules
  report 0 warnings: their 22 pre-existing ones were wired on 2026-09-28 (session log "Wire the 22 interaction-rule
  warnings").
- **Figma:** the source of truth is the live file `9nZv4uW2LT21yuHabMTCh1`, read-only through `use_figma`. The older key
  `yhWJ…` in some docs has no MCP access.
- **Dev server:** `npm run dev`, then open http://localhost:5173. It binds IPv6 only: `http://127.0.0.1:5173` does not
  load. Adding `server.host: true` in vite.config was offered and is still unanswered.

## Gates before reporting work as done

One command, the Build-QA gate (process: `docs/qa/build-qa-process.md`, skill `skills/zen-build-qa`):

```
npm run qa              # scoped to the files this session edited (the hooks record them); --pages=, --all, --since=<min>
npm run qa:quick        # fast loop while building; never counts as a pass
```

It runs tsc, style-guard, usage-guard, both selftests, guidelines, figma-contract and `npm test` (when components
changed), the platform audit with `--quality --density --smoke` at 1512 + 390 and in dark mode, the behaviour probes,
the example coverage matrix, and shoots 1512/390 contact sheets — then LOOK at them. The hooks in
`Zen-CodeBase/.claude/settings.json` lint every edit at once and hold a turn until the gate passed and its sheets were
opened. The style-guard baseline is empty since 2026-09-28 (376 → 0), so every style finding is new. Fix it with the
token Figma binds, or add `zen-allow-<rule>: reason` (citing the node) within the 4 lines above. Other pre-existing
findings are in `tools/platform-audit/*-baseline.json`; only new ones fail, and the debt only shrinks. Owner of
tools/qa, tools/style-guard, quality-checks/behaviour and the hooks: the session "Quy trình kiểm tra Component build".

Basic UI slips are not acceptable: text flush to an edge, a stretched small button, a wrong-size avatar or icon, a
white box on white. `platform:audit` catches them through its `edges`, `sizes` and `surfaces` checks. Also flip
Component Size (Compact ↔ Comfortable) on any component you touched.

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

## Open items

- Push or open a PR for `claude/zen-ds-0.4.0`: waiting on the user.
- `server.host: true` for LAN access: waiting on the user.
- Figma inconsistencies to report to the designer are the `figmaExceptions` in `tools/figma-contract/suites/`:
  Button Surface blur/hover, Overlay rings on Disabled, Icon-Main shadows, the IconButton ring radius, Input/Heading
  H3 at 44px.
- Density tokens that no component uses yet:
  - Tag small
  - Segmented xsmall
  - Badge 2xsmall
  - `sidebar-small-width`
  - `global-control-bar`
  - `dashboard-header`
  - `navigation-action-margin`
- Deliberately fixed sizes, which do not follow density:
  - Mobile Top/Bottom Nav, Bottom Sheet and the Chat mobile composer
  - 2xs buttons
  - the Radio dot
  - Progress and Slider icons
  - hit-area slots
- Known Figma issue: FileIcon Format=Photo was a copy of PDF. Check whether the designer's re-sync fixed it.
- Figma vs code differences seen during the style-guard burn-down, not fixed (ask the designer or decide):
  - Slider: in Figma the Medium thumb keeps its drop shadow on hover (code swaps it for the ring), and the Small thumb
    has no shadow when disabled (code keeps it).
  - Chart: stack-bar columns are Corner-Radius/Small on all corners in Figma (code: XSmall, top corners only).
  - Bottom Navigation: Figma binds the action and FAB icons to Button/Icon-Size/Medium; code keeps the fixed
    Bottom/Icon-Size, because the mobile nav does not follow density.
  - appLayer phone home indicator: Figma's System/Bottom-Indicator (308:46297) is a 6% Background/Neutral/Subtle bar,
    while code draws a solid OS glyph (`zen-allow-colour-role`).
  - Raw values in Figma kept as `zen-allow`: the Chat Reaction-Bar's 15px emoji gap (6182:55704), and Business bubble
    and card shadows that are local effects rather than an Effect style.
- Figma has no Focus state for Popover/Item and no Error+Focused state for the Input family. Code draws the 3px
  Focus/Accent ring inside the option, and keeps the error border plus the Focused ring on an invalid field. Confirm
  both with the designer.
- Read-only fields show no focus indicator (behaviour warn "while read-only": dialog, inline-message, side-panel,
  tooltip, visually-hidden). Waiting on the user: give them the error state's fix, or keep them as they are.
- Dead clicks the no-op rule cannot see: actions passed with no handler at all. They are in
  `tools/platform-audit/behaviour-baseline.json`, 22 keys on button, sidebar, search, table, top-/bottom-navigation and
  bottom-sheet alone. Examples: TopNavigation Back / Upload / Like / Share, the BottomNavigation "Create" action,
  Sidebar footer items, Media card Edit / Duplicate. A harness rule for handler-less actions would list them; the
  debt only shrinks.
- Scratch tests written before the vibe-ready landing may still select component variants by `[data-theme=…]`.
  Those now use `data-tone`, so re-check such selectors before trusting a failing scratch test.
- Nothing is committed since `eafb0de`. Cut a release (0.3.0 + 0.4.0) when the user asks, using CHANGELOG.md.

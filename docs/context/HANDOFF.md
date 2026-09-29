# Handoff — read this first in a new session

This is the short, current picture of Zen DS. It tells a new session what state the repo is in and where to find
details. Keep it current: when a session finishes something that changes this picture, edit the matching line here,
add a CHANGELOG entry, and log the details in `docs/context/session-log-<date>.md`.

Last updated: 2026-09-29.

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
- **Tokens:** 2,368 Figma variables in 11 collections, last synced on 2026-09-28 from the user's `Zen-Variables.zip`
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
- **Parity:** every Figma component is built; 49 guideline slugs.
- **Figma contract:** `node tools/figma-contract/run-all.mjs` runs 23 suites + 25 interactions, all green: Checkbox,
  Radio, Chip, Popover, all six Button sets (every size, plus the Smooth radius mode) and Input/Heading. The review
  queue continues with Segmented, Toggle, Badge, Avatar, Search and the Input family, DatePicker and Sidebar; the
  Figma data is already in `docs/figma-contracts/` (`docs/context/handoff-claude-code-2026-09-27.md`).
- **Figma parity update (2026-09-29):** Checkbox, Radio Button, Toggle, the Chat text bubbles, Search/Popover, the Table
  cell primitives, Segmented and Breadcrumbs were re-read from the live file and updated where the code differed
  (session log 2026-09-29, "Figma parity update"). Their fresh captures are in `docs/figma-contracts/`.
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

## Open items

- Push or open a PR for `claude/zen-ds-0.4.0`: waiting on the user.
- `server.host: true` for LAN access: waiting on the user.
- Figma inconsistencies to report to the designer are the `figmaExceptions` in `tools/figma-contract/suites/`:
  Button Surface blur/hover, Overlay rings on Disabled, Icon-Main shadows, the IconButton ring radius, Input/Heading
  H3 at 44px.
- For the designer (found on 2026-09-29 through the Figma connector): text styles Heading/2, Heading/3 and
  Caption/* still cache the old `paragraphSpacing` (28 / 24 / 10), although it is bound to Font-Size (25 / 22 / 11).
  Code follows the variable. Re-apply the styles in Figma to refresh them.
- For the designer (Figma parity update, 2026-09-29; code keeps its current behaviour until answered):
  - **Toggle caption (P2):** the set 1526:5703 overrides Subtext to Caption/Regular 11/16 in all 24 variants, but the
    primitive `.Primitives/Toggle/Content` 1526:5945 says Body/Small/Regular 12/16. Code follows the set, like
    Checkbox, Radio and the Table cells. Fix the primitive?
  - **Segmented (P2):** Item Medium / Secondary / Selected (and the set's Item-1) binds Tag/Background/Default, while
    Small binds Segmented-Item-Secondary/Background/Seclected/Default. Same in light, different in dark. Code uses the
    Segmented token. Also: code has a Disabled state Figma lacks; the `*/Seclected/Hover` and Secondary Border tokens
    are now unbound; the set description lists props it does not have; should focus stack with the selected shadow?
  - **Search/Popover:** the designer made all 30 variants consistent on 2026-09-29 (a 1px INSIDE Container stroke,
    no ring); code follows. Still open: the set description lists props that do not exist, and the Hover stroke
    weight of Field-Only and Search/Default is no longer bound to Emphasis/Border-Weight/Active/Primary (code keeps
    the binding there). The set now sits in a frame with an explicit Component Theme mode, so its previews resolve
    in that mode.
  - **Checkbox / Radio:** Checkbox/Text centres the mark on label + caption (Radio top-aligns; code top-aligns both);
    Checkbox/Text has a dead Caption prop and a root gap on a single child; neither set says what colour a Disabled
    caption is (code: Content/Disabled).
  - **Chat bubbles:** the Text-You Social background blur (40) sits on an opaque fill and does nothing; the Mobile
    variants carry the Hover actions toolbar, but mobile uses hold-to-react.
  - **Table cells:** Badge-Cell and Tag-Cell items do not wrap in Figma (code wraps); two-line and action cells do not
    fit Table/Cell/Size 52 (code rows grow to 63–64px); Edit state stroke alignment, Control-Cell wrappers and a few
    descriptions are inconsistent.
  - **Breadcrumbs:** the root's 3XSmall gap has a single child and never renders; there is no current-page state and
    no collapse (…) item.
  - **Toggle:** the `Seclected` typo in its variables; Toggle-Button binds Segmented tokens and has an effect on an
    empty frame.
  - **Chip S3:** the selected Secondary chip keeps a Subtle border at the Secondary weight on a faint tint (selection
    contrast about 1.15–1.3:1), unlike "Selected → Color/Border/Active/*". Should S3 switch?
  - **Typography (2026-09-29 review, decision 6):** Display/4 values (32/36/40) are larger than the Heading/1 page title
    (28/32/36) in every mode, so card grids of values outrank the title. Keep, or limit Display/4 to one hero value per
    view (Heading/2–3 in grids)? Related: the AiChat greeting (h2 in Heading/1), the MetricWidget large value
    (Heading/1) and the ModalForm title (Heading/2, 25px next to a 28px page h1) blur "Heading/1 = the page title".
- For the designer (App Shell, 2026-09-29; code keeps its current behaviour until answered):
  - **Rail width:** the HR-Platform rail (Patterns/Density/Comfortable/Sidebar/No) is 80px wide, with a 72px surface and
    an 8px inset on the left only. The Side-Bar/Master/Basic Expand=No master is 84px, with a 68px surface and an 8px
    inset on both sides. Code follows the master.
  - **Sidebar pattern Shadow=No** (6040:67524): a Surface/Default sidebar without Shadow/Bottom/Level-1. No Sidebar
    `background` gives it today.
  - **No spec for narrow shells:** Figma draws the top bar and the drawer on desktop only. Code puts the top-bar
    content on its own row under 744px and adds a Close button beside the drawer (APG modal dialog).
  - **Floating-Actions** (6040:72809) uses a local effect (0 12 28 and 0 4 8 −4, Neutral/Base), not an Effect style.
  - **Action-Item has no open state:** when Notifications opens its panel (`aria-expanded="true"`) the button looks the
    same. Should it take a selected or pressed look?
- Density tokens that no component uses yet (Badge 2xsmall is now the AppShellAction count; `global-control-bar`
  places the drawer's Close button):
  - Tag small
  - Segmented xsmall
  - `sidebar-small-width`
  - `dashboard-header` (80/88): the HR-Platform top bar measures 72 (24 + 40 + 8); ask the designer which one the
    dashboard header should use.
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
- Figma `Control-Bar/Select-Item` (9021:27379) has Default / Hover / Selected only. Code draws a disabled item with
  Content/Disabled: the whole bar of a Read-only RichTextField, and since 2026-09-29 Undo / Redo with nothing to undo
  or redo. Ask the designer for a Disabled state.
- Scrolling strips show no overflow hint. Since 2026-09-28 a Segmented wider than its container scrolls sideways,
  like Tabs and the chip filter row: no scrollbar, no edge fade.
  - When a segment boundary lands on the edge, nothing shows that there are more. Example: Templates › "Empty & error
    states" at 390 in Comfortable.
  - Figma has no fade or peek spec. Ask the designer; if the answer is yes, add it once for Tabs, chip rows and
    Segmented.
- Read-only fields show no focus indicator (behaviour warn "while read-only": dialog, inline-message, side-panel,
  tooltip, visually-hidden). Waiting on the user: give them the error state's fix, or keep them as they are.
- Dead clicks: none left in `tools/platform-audit/behaviour-baseline.json` (deadclick 75 → 5 on 2026-09-28, 5 → 0 on
  2026-09-29; 24 → 19 keys). The 96 handler-less actions were wired on 2026-09-28 (session log "Handler-less
  actions"); the last 5 were component behaviour, fixed on 2026-09-29 (session log "The last 5 dead clicks"):
  - Chip: a Number-only chip without `onClick` or `selected` is a static count (`<span>`).
  - DatePicker: with `showActions` picks are a draft; `onApply(value, range)`, `onCancel`, `range` / `defaultRange`.
  - RichTextField: its own undo history; Undo / Redo are disabled with nothing to undo or redo.
  - Chat: the quote of a deleted message is plain text. The other quotes already flashed the original; the Chat
    owners' sessions were not running, so the change stayed inside `ChatReplyQuote`.
- Platform chrome: "Download Figma" (overview + sidebar footer) and "Feedback" have no destination, so
  `interaction/action-without-handler` keeps them as its 3 warnings. Waiting on the user for the URLs.
- Scratch tests written before the vibe-ready landing may still select component variants by `[data-theme=…]`.
  Those now use `data-tone`, so re-check such selectors before trusting a failing scratch test.
- appLayer has an import cycle: `appLayer/shared.tsx` imports `../PlatformExamples` and `../PlatformTemplate`, and
  `content.tsx` imports `option` from `shared.tsx`.
  - A hot update while a probe runs (another session editing) can throw "Cannot access 'option' before
    initialization" in `behaviour.mjs`.
  - Re-run the page: a fresh load is clean.
  - Moving the shared helpers (`option`, `Panel`) into a leaf module would end it. The owner is "Đánh giá Zen DS hiện
    tại" (appLayer).
- The work is committed on the local branch `claude/zen-ds-0.4.0` (see Current state); `main` is still `eafb0de`. Cut a
  release (0.3.0 + 0.4.0) when the user asks, using CHANGELOG.md.

## Backlog (plan before opening sessions)

The user's rule since 2026-09-29 (also in `AGENTS.md`, "Scope lock"):
- A session does only the task the user approved.
- Nothing new starts without the user's explicit approval: no new session or task chip, no new rule or check, no fix
  found along the way. Another session cannot approve scope on the user's behalf.
- Every bug found and every follow-up goes here as one line, with a priority and a pointer, and is mentioned in the
  session's report. Nobody fixes it in passing.
- At the end of a working block this list is summarised as a **proposal for the next block**. The user approves what
  gets done; the approved items run as one planned batch, with fewer sessions that each own a set of files.
- Items that need a decision from the user or the designer stay under "Open items"; this list holds work.

- **Typography outline / content hierarchy (2026-09-29):** the user approved every recommendation ("theo đề xuất");
  implemented the same day (session log, "Typography outline"). Follow-ups:
  - **P2 · Screens without an h1:** Bottom Navigation "Floating + action" and "Glass over media" (no TopNavigation),
    Templates "Empty & error states" (outline starts at the EmptyState h3), Form "Mobile checkout" (bar h1 → h4
    sections, should be h2).
  - **P2 · EmptyState in a Card you title yourself:** with headingLevel 3 under an h2 Subheading title it still renders
    Heading/4 (20px > 18px); only ChartCard passes its level down. Needs a smaller style or description-only.
  - **P2 · Seed and switch on the outline warnings:** `audit.mjs --outline` (outline-h1/start/card/siblings) is opt-in
    until seeded: `--quality --outline --baseline-update=outline-h1,outline-start,outline-card,outline-siblings` over
    all pages; then drop the flag. Also re-seed `rhythm` (its messages changed).
  - **P2 · Gate page mapping:** `PlatformPhone.tsx`, `PlatformTypographyHierarchy.tsx` and
    `PlatformMobileShowcases.tsx` edits map to no page ("pass --pages"), and a pass then clears them although their
    pages were not rendered. Map PlatformPhone → pages with phone frames, the hierarchy file → typography, mobile
    showcases → the edited examples' pages.
  - **P3 · Typography "Emphasis inside a level":** clicking a row that is already read does nothing (behaviour
    deadclick ⚠); let the row toggle read/unread or say so in the caption.
  - **P3:** the docs platform's own outline on the Typography page (h2 Heading/3 sections, example h1s under h3 card
    titles); ExampleCard should expose `data-screen`; a durable selftest for the quality/outline runtime checks; the
    redundant `ZenProvider typography="mobile"` wrappers around PlatformPhone; the Typography topbar chip no longer
    reaches phone frames (they default to Mobile); TopNavigation stories for the heading behaviour; the Text
    "Headings" story could label each level's default style. Review:
  `docs/context/typography-hierarchy-review-2026-09-29.md` (8 decisions, ~30 verdicts; the phone child screen has no
  h1, h2 renders in 6 styles, the enforcement misses missing h1s and errors on valid group headers).
- **Process (2026-09-29):** batch A of `docs/context/process-audit-2026-09-29.md` is done (tiers in AGENTS.md §C,
  consumer-scoped QA, ledger/Stop-hook fixes, scoped static gates, Scope-lock wording, a `use_figma`-safe extractor),
  then a token fast path, label-key scoping and a narrower tier L (`--all` only for every-page changes; library
  components like AppShell stay scoped). Token sync: `skills/zen-token-sync` (the claude.ai `zen-ds-token-sync` skill is
  out of date: point it at the repo skill).
  The user chose to work with it for a few days; batches B (parallel gate), C (Figma kit, suites, live tokens) and
  D (lighter docs) wait here until needed. Batch A follow-ups:
  - **P2 · Seed the contrast/targets baseline:** `node tools/platform-audit/audit.mjs --quality --viewports=1512,390
    --baseline-update=contrast,targets` over all pages, plus a `--dark` pass (≈20 min). Until then those known
    warnings show as new.
  - **P2 · Exact sheet review:** add `Read` to the PostToolUse matcher in `Zen-CodeBase/.claude/settings.json` so a
    sheet's hash is saved when it is opened (needs the user's OK: settings), and give each run its own sheet folder
    (B3), since `.platform-shots/` is shared by sessions.
  - **P2 · Token builds run through Bash** (`npm run tokens:build`) are not recorded by post-edit, so the Stop hook does
    not ask for QA after a token change made only in `tokens/source`.
  - **P2 · Live Figma drift found by `__HASHES`:** 9 of 18 sets in `checkbox-radio-chip-popover.json` (Chip/Normal,
    Chip/Advanced, Chip/Number-Only, Popover label/item primitives …) no longer hash-match; check whether this is a
    real change or only the frame's variable mode (captures are not mode-independent until kit C1).
  - **P3 · Gate details:** baseline JSON notes and their generators (`check-styles.mjs:353`, `audit.mjs:483`) still say
    "fix these when you touch them" (Scope lock wording); token scope follows importers one level (a Button token →
    23 pages); token scope reads CSS only, not inline `var()` in TSX; `foundations.css` maps to the representative set;
    a reused pid can keep a stale "running" marker alive for up to 6 h; `--only` runs that each render part of an edit's pages never clear it (one run must cover them all, so plain `npm run qa` is simpler); edits made by scripts through Bash are often not recorded; mixed stale guidelines (own + another
    session's) fail instead of rebuilding.
- **P1 · Faster QA.** Owner: "Quy trình kiểm tra Component build". On 28/9, 32 QA runs audited 419 pages one at a
  time, about 5 hours of browser time on an 11-core Mac.
  - Add `--workers=N` to `audit.mjs`, `behaviour.mjs` and `shoot.mjs`: one browser with N contexts working from a page
    queue.
  - Run the static gates concurrently in `tools/qa/run.mjs`.
  - Optionally audit a `vite build` preview on its own port, so other sessions' HMR never breaks a run.
  - Expected: 3–4× faster; `qa --all` from ~45 to ~12–15 min.
- **P1 · Session setup.** Give each parallel session its own file area, and a worktree when two sessions touch the same
  files. Commit from one place, at agreed stable points. 8 of 32 QA runs on 28/9 failed, most of them because another
  session was mid-edit.
- **P2 · Narrow-width example slips** seen in the 390 contact sheets (pre-existing):
  - Templates › Sign in: the SSO button label is cut off.
  - Side Panel › "Docked inspector": the panel is clipped.
  - List Item › "Trailing actions": captions wrap to 4 lines.
  - Tables are cut off in narrow cards: Menu › "Row actions in a table" and the Sidebar shells.
  - Popover › "Selection toolbar (Bulk-Action)": at 390 the Delete action wraps to a second row (seen 2026-09-29).
- **P2 · Audit warnings kept as debt:**
  - Avatar initials contrast of 2.7–2.9:1 (List Item "BN" / "CT", Sidebar workspace "A").
  - Small targets: Chat reaction pills (15px tall), the Chip mobile filter row (20px), TopNavigation control-bar
    Segmented (20px).
- **P2 · Example coverage gaps** (qa step ④):
  - sidebar: edge cases.
  - divider: states, edge cases, mobile.
  - side-panel, popover, dialog: mobile.
  - tooltip, list-item: states, mobile.
  - link: states.
  - card: states, edge cases, mobile.
- **P2 · appLayer import cycle:** `appLayer/shared.tsx` ↔ `PlatformExamples` / `PlatformTemplate`. It can throw
  "Cannot access 'option' before initialization" under HMR. Move `option` and `Panel` into a leaf module (Open items
  has the detail).
- **P2 · Figma vs code differences found during the style-guard burn-down** (Open items: Slider thumb shadows, Chart
  bar corners, Bottom Navigation icon size, the phone home indicator). Fix them once the designer confirms the
  behaviour.
- **P3 · Package weight:** every app loads the whole 63 KB gz stylesheet. Consider per-component CSS entry points.
- **P3 · A rendered-page check for apps** (a blocker from the final blind trial, score 8.5).
- **P3 · Official Inter WOFF2** (with the glyf transform, about 10% smaller than today's conversion): needs the user's
  approval to download it.
- **P3 · `-shadow-off` leaks into nested component themes** (found 2026-09-29, token update): companions are emitted
  only in the modes whose fill is tinted, so a Neutral-S4 scope inside a Neutral-S3 scope inherits S3's `0 0 #0000`
  and its selected chip loses the Figma shadow. Nothing in the repo nests component themes, but `ZenProvider` allows
  it. Fix idea: `scripts/build-tokens.mjs` emits `<token>-shadow-off: initial` in the other modes.
- **P3 · Input family contracts predate the new small radius:** `docs/figma-contracts/input-search*.json` and
  `datepicker-sidebar.json` were captured when `Corner-Radius/Input/Small` was 8 / 8 / 4 / 2. No suite checks them
  yet; re-capture before building the Input suites.
- **P3 · Live modes that the repo does not have:** Typography Configuration `Ecom-Demo` (and `Zen-Platform`, kept in
  platform.css), Base Colors (Project) `Chat`, `VT`, `Ecom-Demo`. Global Dimensions' only mode is now named `Zen`
  (repo: `Mode 1`, no effect on CSS).
- **P3 · Badge-Counter parity:** the 2026-09-29 Chip/Trailing capture shows the Small badge's Text-Wrapper with
  Spacing/Padding/3XSmall side padding. There is no Badge contract suite yet to check the component.
- **P3 · `targets` audit reads scaled phone previews:** at a 390 viewport PlatformPhone is scaled to ~0.63, so a 32px
  control measures 20px (a 24px reaction pill 15px). The "Small targets" debt above and the 4 new Segmented ⚠ are
  likely all this; measure in device px (divide by the frame's scale). Owner: "Quy trình kiểm tra Component build".
- **P3 · Phone List inset:** Chip "Mobile filter row" and Button "Mobile footer CTA" keep List at its default inset
  (Margin/Comfortable 24px) while the rest of the screen sits on Margin/Compact (20px), so rows start 4px right of the
  chips and the Back chevron. `List inset="compact"` lines them up (as in the new Segmented phone example).
- **Blocked:** Code Connect needs a Figma Organization or Enterprise plan.
- **P2 · DateField `datePickerActions` commits on pick:** `handleDateChange` (onValueChange) writes the field and closes
  at once, so Cancel and Submit can never differ. Make the pick a draft and commit in the new DatePicker `onApply`
  (Cancel and Escape keep the old date). `zen-allow-date-apply` in `Input.tsx` marks the spot; session log
  2026-09-29, "The last 5 dead clicks".
- **P3 · Harness idea `chip/needs-action`:** a Normal or Advanced Chip with no onClick, `selected`, `popoverItems`,
  `onPopoverCreate` or `onClearSelection` renders a dead button; Figma says a read-only label is a Tag (Badge for
  status). 0 cases in the repo today (Chip "Counters" was Number-only, now a static count). Same session log.
- **P3 · Chat quote whose original is not in the thread** (older history not loaded): the default jump finds nothing
  and does nothing. Apps must pass `onJumpToReply` to load it; add that to the Chat guideline, or give the default a
  fallback. Chat owners ("Search popover component và Overviews").
- **P2 · Text-fit debt:** 24 findings of the new `fit` check (text wider than its box, no ellipsis, no scroll),
  baselined in `tools/platform-audit/quality-baseline.json`; table in session log 2026-09-29, "Text-fit audit check".
  - Stepper at 390: equal-share steps (`.zen-stepper__step { flex: 1 1 0; min-width: 0 }`) squeeze one-word titles,
    e.g. "WorkspaceInvite team" (Stepper, Checkout, Icon steps).
  - App Shell at 390: the desktop examples keep the sidebar open (the card sets `breakpoint="desktop"`), so `main` is
    16px wide and the PageHeader title breaks one letter per line.
  - Templates page list at 390: the trailing file name leaves the caption column ~63px wide.
  - Captions narrower than one word: Sidebar "Flat · knowledge base" (390) and List Item "Trailing actions" (390,
    Comfortable).
  - DatePicker at Comfortable (1512 and 390): "September 2026" fills the month button's padding.
- **P3 · `fit` follow-ups** for its owner "Quy trình kiểm tra Component build" (offline while it was built): review
  `textFit` and the new `audit.mjs` flags `--baseline-update=<kinds>` and `--css=<file>`. Still unchecked: a control
  that fits its own text but is cut off by an `overflow: hidden` ancestor or covered by a sibling. Examples: a
  Segmented with `flex-shrink: 0` in a clipping container would hide its last items, and at 390 the Side Panel ›
  "Docked inspector" card sits under the panel. `overflow` skips these as clipped, and `fit` does not see them.
- **From the Figma parity update of 2026-09-29** (session log, "Figma parity update"). The designer questions from
  the same run are under Open items.
  - **P2 · Platform Table example vs Figma:** the Actions column uses IconButton sm (32px, 16px icons), while Figma
    Actions-Cell 1603:14291 is Button/Icon-Flat Medium (40px). The Progress column uses `theme="accent"` with no
    label; Figma Progress-Cell 4081:19726 is Theme=Neutral with its label. `PlatformExamples.tsx:2055–2080`.
  - **P2 · Contract suites for the updated components.** The fresh captures are saved in `docs/figma-contracts/`
    (`segmented-toggle-badge-avatarstack.json`, `input-search-primitives.json` for Search/Popover, and new
    `breadcrumbs.json`, `chat-bubbles.json`, `table-cells.json`), but only Checkbox and Radio have suites. The gap
    drifts fixed today would have failed a suite.
    - Add suites for Segmented (a harness kind that renders SegmentedItem inside Segmented), Search/Popover
      (a `search` kind, including a Neutral-S4 mode), Breadcrumbs (a figmaExceptions entry for the 4px list padding),
      Toggle, the Table cells and the Chat bubbles.
    - Re-add a caption x check to the Checkbox/Text suite: the nested instance no longer exposes Subtext, so only
      the primitive's offset is checked.
    - Labels render ~1px narrower than Figma's text boxes (Inter metrics); the suites need a global width tolerance.
  - **P3 · Code follow-ups found in passing** (need approval):
    - Chat: the keyboard focus ring on a bubble uses Corner-Radius/XLarge on every corner and ignores the Business
      radius and the tail corner (`chat.css:172, 175`). One-emoji reaction pills measure 28×24 against Figma's 24×24
      (Apple Color Emoji is 20px wide at 16px; `chat.css:99`, needs a design call).
    - Segmented: `:focus-visible` on a selected item replaces its Shadow/Action/Basic (`segmented.css:15–16`).
    - Table: `TableMedia` defaults to `bold = true` while every Figma media cell defaults to Bold=No (behaviour
      change, needs a decision); Photo-Cell radius (XSmall at 24px, Small at 32px) has no API or harness check;
      the text editor adds Effect/Popover over a Neutral/Pale fill when it grows (house-rule exception?); a duplicate
      `gap` in the select-editor rule (`table.css:85`).
    - Breadcrumbs: the nav is 28px tall (Figma 20) because the list pads 4px for the hover plate; the Sub plate's
      bleed now covers the first 4px of the chevron's hit area.
    - Toggle: the platform showcases still pass the deprecated `selected` / `onSelectedChange`
      (`PlatformShowcases.tsx:557–559`); its JSDoc does not cite the node ids; Figma renamed the Caption prop to
      Subtext (a `subtext` alias would be new API).

- **From the App Shell rework of 2026-09-29** (session "App Shell kiểm tra lại"; session log 2026-09-29, "App Shell"):
  - **P1 · Sidebar landmark:** Sidebar renders `<aside aria-label="Main navigation">` (a complementary landmark), so an
    AppShell page has no navigation landmark (`Sidebar.tsx:380, 399`). Make it `<nav>`. The user deferred Sidebar edits
    on 2026-09-29.
  - **P2 · Sidebar reads the shell:** AppShell passes the rail state and the drawer's expanded state to a direct
    `<Sidebar>` with `cloneElement`. A wrapped Sidebar needs `useAppShell()` by hand. Letting Sidebar read an AppShell
    context would cover both.
  - **P2 · Rail group dividers:** the HR-Platform rail puts a Divider between groups. The collapsed Sidebar only hides
    section titles, so its groups run together.
  - **P3 · Sidebar headers from HR-Platform:** a workspace/account switcher header (square Avatar, name, email,
    chevron-selector) and a drill-in module header (Back chevron + Heading/4 "Time Off").
  - **P3 · Keyboard shortcut for the rail toggle:** Atlassian has an opt-in Ctrl+[ and Apple HIG asks for one. Needs a
    decision (it must not clash with ⌘B / Ctrl+B bold in editors).
  - **P3 · Notification-Dot as one primitive** (Figma 4116:21789): Sidebar items, TopNavigation actions and
    AppShellAction each draw their own dot today.
  - **P3 · Harness for dead top-bar actions:** `icon-button/needs-action` and `interaction/action-without-handler` do
    not look at AppShellAction or AppShellAccount yet.
  - **P3 · Aside in a narrow preview:** a SidePanel in `aside` becomes SidePanel's own portalled modal, so in a docs
    preview frame it covers the page rather than the frame. The drawer stays in the frame.
  - **From the UX review of the same session:**
    - **P2 · The platform wordmark is invisible in dark mode:** `figmaSidebarBrand` in `PlatformSidebarBrand.tsx` draws
      the Zen logo as an `<img>` with a hard-coded #111. It sits on the dark Sidebar in every Sidebar and App Shell
      example. Use an inline SVG in currentColor.
    - **P3 · Rail counters:** a collapsed Sidebar hides an item's counter ("Approvals 3") without showing a Dot. This is
      a Sidebar change.
    - **P3 · PageHeader when its actions wrap:** the order becomes title → buttons → description, so the description is
      split from its title. Example cards force `breakpoint="desktop"`, so at 390 they never show the mobile order
      (Primary first).
    - **P3 · Dashboard template:** the "Recent activity" title sits outside its card while "Revenue"'s sits inside, so
      the two columns start at different heights.
    - **P3 · Behaviour probe clicks during a layout transition:** the probe clicks the next control about 25ms after
      the previous one. After "Collapse sidebar" the page is still sliding (Sidebar width transition, 160ms), so the
      first Breadcrumb is missed and reported as a dead click. Reproduced: it works after 400ms. This gives 2 ⚠ on
      templates@1512 (Admin list "Home", Detail "Invoices"). Fix in `behaviour.mjs`: wait for running transitions
      before `pointAt`. Owner: "Quy trình kiểm tra Component build".
    - **P3 · Example coverage (qa step ④):** `app-shell` has no "states" example (a loading shell, an offline
      banner, an empty notifications panel); `page-header` still lacks states, edge cases and mobile (pre-existing).

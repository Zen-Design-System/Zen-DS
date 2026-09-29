# Backlog and open items

Moved out of `HANDOFF.md` on 2026-09-29 (text unchanged). A session that finds a bug or follow-up appends ONE line under
"## Backlog" here (priority + pointer), mentions it in its report, and stops (Scope lock, `AGENTS.md`).
Read this file only when picking up work or logging a follow-up.

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
  - **DatePicker (2026-09-29):** In-Range-Hover fills the Container with Color/Background/Inverse/Solid/Default and
    leaves `Date-Picker-Item/Background/Seclected-In-Range/Hover` unused (code follows the component). The Header
    Date-Container is Corner-Radius/Small at rest and Base on Hover/Focused (the rest state has no fill, so only Base
    is ever seen).
  - **Toggle:** the `Seclected` typo in its variables; Toggle-Button binds Segmented tokens and has an effect on an
    empty frame.
  - **Typography (2026-09-29 review, decision 6):** Display/4 values (32/36/40) are larger than the Heading/1 page title
    (28/32/36) in every mode, so card grids of values outrank the title. Keep, or limit Display/4 to one hero value per
    view (Heading/2–3 in grids)? Related: the AiChat greeting (h2 in Heading/1), the MetricWidget large value
    (Heading/1) and the ModalForm title (Heading/2, 25px next to a 28px page h1) blur "Heading/1 = the page title".
  - **Chip S3:** the selected Secondary chip keeps a Subtle border at the Secondary weight on a faint tint (selection
    contrast about 1.15–1.3:1), unlike "Selected → Color/Border/Active/*". Should S3 switch?
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
  - **Done 2026-09-30 (was P1, approved by the user):** concurrent contract suites overwrote the shared
    `tools/figma-contract/.out/harness.js` (18 of 23 failed on a token change). Each run now builds in its own folder,
    the gate runs 4 suites at a time (`ZEN_QA_SUITES`, 1 under `--serial`), and a token sync takes the fast path without
    `--files`. Log: `session-log-2026-09-30.md`.
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
  yet; re-capture before building the Input suites. (2026-09-29: the DatePicker Action entry and the two
  Select-Month-Year variants are refreshed; see the DatePicker block below.)
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
    - Breadcrumbs: the Sub plate's bleed covers the first 4px of the chevron's hit area. (The 28px height is fixed:
      20px as in Figma since 2026-09-29.)
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
- **From the DatePicker + Breadcrumbs Figma re-read of 2026-09-29** (session "App Shell kiểm tra lại"; session log
  2026-09-29, "DatePicker radius + Breadcrumbs"):
  - **P2 · `use_figma` captures drop hidden instance children:** `use_figma` runs with
    `figma.skipInvisibleInstanceChildren = true`, so `__RUN` / `__HASHES` miss hidden nodes inside instances (the
    Breadcrumbs slot's hidden Dash, Button's hidden icons, the hidden Event dots) and report false diffs. Set it to
    `false` first (extractor + `tools/figma-contract/README.md`). The other 2026-09-29 `use_figma` captures
    (`segmented-toggle-badge-avatarstack.json`, `input-search-primitives.json`, `chat-bubbles.json`,
    `table-cells.json`) may lack those nodes; `breadcrumbs.json` is re-captured. Owner: figma-contract.
  - **P3 · Rest of `datepicker-sidebar.json`:** Header, Item, Calendar-Table and Calendar Single/Dual still hold the
    2026-09-27 hex values and miss hidden nodes inside instances (structure and bindings checked equal to live);
    Time-Picker and the mobile sets changed in Figma. Re-capture in the desktop console when the DatePicker suite is
    built.
  - **P3 · DatePicker parts with no code:** Time-Picker (460:38628, Single-Calendar's Time-Picker prop), the mobile
    date picker (9921:3283, 9923:2323, 9923:2791, 9923:3576), and Event-List with 1–4 dots and its On-Selected colour
    (510:36577); `DatePickerItem event` draws one Accent/Light dot.
  - **P3 · DatePicker sizes in px:** day cells (32 / 24) and the 224px panel are px, while Figma binds
    Select-Item/Size/Medium | Small (40 / 32 in Comfortable), so the calendar does not grow with density.

- **From the Zen Plugin Neutral 9→10 fix of 2026-09-29** (plugin repo `zen-ds-figma-plugin-main`, session "Zen Plugin
  Neutral color contrast"; the user chose to move Dark step 9, `NEUTRAL_STEP_9_10_CONTRAST = 1.16` in `src/ui/main.js`):
  - **Done 2026-09-29 (was P1): synced from the user's second `Global Colors.json`, gate PASS.** Apply the new Dark
    Neutral step 9, then sync tokens: Dark/Gray/9 goes #656565 (3.29:1) → #929292
    (6.16:1), Dark 9→10 now 1.16:1 like Light. Run the plugin's Check → Update in the live file, then
    `skills/zen-token-sync`. Consumers: `Color/Background|Border/Support/Neutral/Solid` (Dark) and
    `Color/Content/On-Black-Overlay/Light` (Dark/Neutral-Alpha/9).
  - **P2 · Light Neutral step 10 follows the raw input lightness, not step 9** (`L10_nl = L9 - 0.032`): Color Generator
    palettes get Light 9→10 anywhere from 1.08 to 1.98:1 (Slate hsl(220,10,50): 1.47; Gray at 70% makes step 10
    lighter than step 9), and Check regenerates another step 10 from the saved step 9 (Gray #828282 vs #838383).
    **Decided 2026-09-29: the user keeps Light as is, no change.** Check's ±1-per-channel tolerance treats #828282
    and #838383 as equal, so Gray is not flagged; the drift only affects new tinted palettes made in the Generator.
  - **P2 · Plugin build drops the bundled component packages:** `src/components/*.json` (Button_Main,
    Button_Icon-Main, Nav-Action_Main, Nav-Action_Icon-Main) were removed at 15:06, after the 15:00 build, so
    `npm run build` now writes a 0.5 MB `dist/code.js` without them. This session kept the rebuilt `dist/ui.html` and
    restored `dist/code.js` byte for byte, so the unbuilt 15:15 `code.js` change (check progress messages) is not in
    dist yet. Decide whether the packages come back before the next build.
- **From the Zen Plugin dark-alpha fix of 2026-09-29** (plugin `generateAlphaScale`; the user approved "all dark alphas";
  backup `backups/zen-ds-before-dark-alpha-overlay-20260929-182719.tar.gz`):
  - **P1 · Apply the new dark alphas, then sync tokens:** dark alphas are now lightening overlays, so steps that were
    87–96% opaque become translucent: Yellow/Orange/Golden 2–7 (step 3: #2E1D00F5 → #FF81001F, #371900EE → #FF500027,
    #2C1E00F5 → #FF91001D; on Surface-Default 1.07 → 1.20–1.22:1), Mint 2–7, Cyan/Sky/Teal 5–7, Blue/Grass 6–7,
    Tomato 7, and step 1 of every accent (unused). Solids, Light alphas and real Neutral palettes are unchanged. Run
    the plugin's Check → Update in the live file, then `skills/zen-token-sync`. Consumers: the Subtle/Flat
    background and Subtle border tokens of Warning (Yellow), Info (Blue), Positive (Grass), Negative (Tomato) and the
    Support colours.
- **P1 · Zen Plugin Neutral Dark step 1 = 7% HSL (2026-09-29):** `NEUTRAL_DARK_STEP_1_LIGHTNESS` 6 → 7, so Dark/Gray/1
  #0F0F0F → #121212 and every Neutral Dark step is re-solved against it (Gray/2 #1D1D1D, /9 #939393, /12 #FDFDFD);
  accent darks and alphas follow the new canvas. Run the plugin's Check → Update, then `skills/zen-token-sync`.
  Backup `backups/zen-ds-before-neutral-dark-l7-20260929-191010.tar.gz`.

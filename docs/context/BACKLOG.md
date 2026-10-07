# Backlog and open items

Moved out of `HANDOFF.md` on 2026-09-29 (text unchanged). A session that finds a bug or follow-up appends ONE line under
"## Backlog" here (priority + pointer), mentions it in its report, and stops (Scope lock, `AGENTS.md`).
Read this file only when picking up work or logging a follow-up.

## Open items

- **Zen-High-Contrast, next steps (prototype in code since 2026-10-05; user: keep step 9, no new tokens):**
  - Decided (user, 2026-10-05, after crisp crops at 2.2 / 2.5 / 3:1): Subtle borders stay 3:1 in HC. Chip, Checkbox,
    Radio, Tertiary button, Segmented and Tag share Border/Neutral/Subtle, so they cannot differ.
  - Done (user "Có", 2026-10-05): the overlay placeholders follow Content/Placeholder to alpha 9 (live Figma had it).
  - Done (2026-10-05 evening, export "Zen-Variables 2"): Global Colors now carries the Zen-High-Contrast mode, which
    equals the algorithm on all 960 values; build-tokens takes Figma's mode and tokens:check verifies it. The Mint ramp
    was synced in the same export and matches the live file (Mint/9 #40E7AD). The native packages carry the second mode
    as data (resolver default Zen); mapping it to iOS accessibilityContrast / Flutter highContrast is still open.
  - Done (user "Có", 2026-10-05): Color Scales › Create Variables › Sync High Contrast in the plugin (toast with the
    result); in the plugin's next build (the Lục Thạch session integrates and builds overnight).
  - Known by decision: text on step-9 Solid fills (Avatar initials, Accent button text) stays under 4.5:1 in HC.

- Push or open a PR for `claude/zen-ds-0.4.0`: waiting on the user.
- `server.host: true` for LAN access: waiting on the user.
- Code view in other languages (Vue, Svelte, HTML, Swift, Flutter; today "Coming Soon"): plan
  `docs/research/code-languages-plan-2026-10-03.md`, waiting on the user's decisions in its §8 (web strategy, which
  languages and in what order, the dropdown until then). Examples get every language too (user, 2026-10-03; §4, P2b).
  Nothing built.
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
  - **Input / Search Disabled (2026-09-30):** Search/Default and Search/Popover have no State=Disabled; code derives it
    from the Field-Only instance they are built on (Field-Only State=Disabled + Leading-Trailing Active=No). Add the
    variant, or confirm. Number-Align-Left/Center State=Disabled still draw their steppers as Button State=Default
    (code disables them). Autocomplete (View-Only) and Rich-Text have no Disabled: intended?
  - **Search/Popover:** the designer made all 30 variants consistent on 2026-09-29 (a 1px INSIDE Container stroke,
    no ring); code follows. Still open: the set description lists props that do not exist, and the Hover stroke
    weight of Field-Only and Search/Default is no longer bound to Emphasis/Border-Weight/Active/Primary (code keeps
    the binding there). The set now sits in a frame with an explicit Component Theme mode, so its previews resolve
    in that mode. **Sweep 2026-10-07:** the live Field-Only node is 374:103464 (was the separate 2026-10-03 evening designer line).
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
- ~~appLayer has an import cycle~~ done 2026-10-05 (session "Nested boolean không hoạt động"): the playground helpers
  moved to `appLayer/playgroundParts.tsx` and the group data exports keep their identity (`keepOnHotUpdate`), so a
  template or app-shell edit is a Fast Refresh. Adding or removing a page/example still reloads once (by design).
  Old notes: `appLayer/shared.tsx` imported `../PlatformExamples` and `../PlatformTemplate`, and
  `content.tsx` imports `option` from `shared.tsx`.
  - A hot update while a probe runs (another session editing) can throw "Cannot access 'option' before
    initialization" in `behaviour.mjs`.
  - Re-run the page: a fresh load is clean.
  - Moving the shared helpers (`option`, `Panel`) into a leaf module would end it. The owner is "Đánh giá Zen DS hiện
    tại" (appLayer).
- The work is committed on the local branch `claude/zen-ds-0.4.0` (see Current state); `main` is still `eafb0de`. Cut a
  release (0.3.0 + 0.4.0) when the user asks, using CHANGELOG.md.
- Phone decisions from the Top Navigation research (2026-10-01, `docs/research/top-navigation-mobile-rules-2026-10-01.md`):
  - **PlatformPhone tokens: decided 2026-10-01.** The user approved it in session "Disable input và search từ Figma":
    `.platform-phone` now sets `data-breakpoint="mobile"`, and R10 became "keep the default inset". Phone rows, kicker
    headers and the bar all sit on 20px.
  - **G4: done 2026-10-02 (user: match Figma).** Roots hide the empty top-bar row (Top-bar=false). Code always draws the 64px row, so roots are 64px
    taller than Figma.
  - **G6: done 2026-10-02 (user: always under the Top Navigation).** TopNavigation `banner` now covers where the
    "Offline on a phone" banner sits once the title folds. `controlBar` documents Search, Segmented
    and Tabs only, so there is no slot for a banner under the bar.

## Backlog (plan before opening sessions)
- **P2 · CI "Package" step fails on every run of the 0.4.0 branch (2026-10-07, seen when merging PR #1):** 14 of 14
  finished CI runs since 2026-09-29 failed, almost all in "Package (pack, install in a temp app, budgets, zen-usage,
  MCP, zen-ds)" (twice Browser tests, twice Platform audit); `npm run verify:package` passes locally ("Package OK").
  The job log could not be read from the cloud session (its storage host is blocked). PR #1 was merged with it on the
  user's call. Pointer: `.github/workflows/ci.yml` step "Package", `scripts/verify-package.mjs`.
- **Done 2026-10-07 (backlog batch 2, E2E B-19: `inspector/frames.ts` compares labels and listens to the frame registry):** ~~P2 · Builder: Inspector Frames list keeps the previous local page's frames (2026-10-06, seen during GĐ2 M2):~~
  open page A then page B (both new pages, Screen id `screen-1`): the Page panel's Frames shows A's title. Likely the
  frame registry keys `screen:screen-1` without the page. Pointer: `builder/BuilderBoard.tsx` frame ids,
  `inspector/PagePanel.tsx` Frames.
- **P3 · Studio E2E I-11 is flaky too (2026-10-07, seen during GĐ3 M3):** "timed out after 20 s" once with
  `--no-retry` right after the library group; 2/2 alone. Pointer: `tools/studio/e2e/scenarios/inspector.mjs` I-11.
- ~~**P3 · Studio E2E I-15 is flaky**~~ done 2026-10-07 (GĐ4 M4, the user chose to fix the row: it waits for the field to
  read "sm · …" before ⌫; 5/5 alone, full matrix). Was: **(2026-10-06, session "Studio builder tool planning", seen during GĐ2 M2):** "Timed out
  waiting for ⌫ removes gap" on the first try in 2 of 3 full runs (passes on retry and alone, 2/2); the gate counts a
  failed try as a regression. Pointer: `tools/studio/e2e/scenarios/inspector.mjs` I-15, ScaleField ⌫ reset.
  2026-10-07 (GĐ4 M1): 3/5 alone, both tries failed once in a gate run. Likely race: ⌫ right after ⌘Z is planned from
  the element and hash read before the undo's refetch, so the server refuses it as stale; the row could wait for the
  field to read "sm · …" again before ⌫.
- **P3 · Builder Link folder: the permission prompt of a real folder is untested (2026-10-06, GĐ2 M4):**
  `npm run studio:build-check` covers link, write, Trash (trash/ copy), Restore and the reconnect after a reload through
  an OPFS folder, which the browser always grants; a folder the person picks is usually "prompt" after a reload, so the
  Reconnect button path (`mirrors.ts` reconnectFolder → requestPermission) needs one check by hand in Chromium.
- **P3 · Grid column resize follow-ups (2026-10-06, session "Search spacing collapse bug"):** (1) an item with a Fixed
  width (a Studio wrap Stack `width={240}`) that is alone in a px Grid column still edits its own width on a drag, which
  can leave free space again; resizing the column and clearing that width needs one request touching two elements
  (server op). (2) Double-click (Hug) on a column item does nothing ("drag the edge"): could write the track as `auto`.
  (3) No E2E row for the column drag / Fit yet (probe scripts were ad hoc).
- **P3 · Emoji in alpha text (2026-10-06, session "Emoji mờ trong text alpha"):** (1) proposed harness/audit check:
  a colour emoji in text whose colour has alpha < 1 (Neutral Base/Light, captions, DescriptionList terms) — wrap it in
  an opaque span; (2) proposed DS helper (e.g. an inline `Emoji` primitive) so apps need not know the trick;
  (3) `examples/pages/chat.tsx:912` docs description "sends a 👋" renders at alpha .69; (4) `appLayer/shell.tsx:463`
  "Phone app" (HrPhoneExample) does not render on the App Shell page — `examples/pages/app-shell.tsx` wins; dead or meant? **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (2) no `Emoji` component; the opaque-span tip goes into the guideline → batch 6.
- **P3 · Sidebar section titles (2026-10-06, session "Khoảng trống Report và Settings"):** (1) proposed harness rule
  `sidebar/untitled-section`: a `sections` entry after the first without `label` (renders a bare 16px gap); fixtures
  in `tools/usage-guard/fixtures`. (2) Titled one-item groups await the user's call (merge or keep):
  `appLayer/navigation.tsx` "Workspace › Settings", `examples/pages/alert-banner.tsx` "Workspace › Billing",
  `appLayer/shellScreens.tsx` "Settings › Roles & access". **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (2) one-item groups lose their title (merged) → batch 6b.
- **P3 · Sidebar rail follow-ups (2026-10-06, found by "Sidebar rail align", not changed):** (1) App Shell example
  screens (`src/platform/appLayer/shellScreens.tsx` People/Time off/Settings, `shell.tsx`) pass `brand` without
  `logoCollapsed`: their rails are 84px (fallback, centred) vs 88px on the Modules screen. (2) HR module rails turn
  the `search` slot (Back + module title) into a magnifier "Search" button that only expands the panel: a Back
  chevron (or nothing) would match what the slot holds. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (2) the collapsed rail shows a Back chevron → batch 6.
- **P3 · Card → ListBox leftovers (2026-10-06):** (1) done 2026-10-06 by session "Canvas và surface mặc định": the
  screen stage is Canvas/Default and the 4 list Cards (menu Projects + Open tasks, text Open tasks, visually-hidden
  Skip link) are ListBoxes; sidebar RowCard on Alt/Flat canvases stays a Card.
  (2) done 2026-10-06: ListBox `theme` (flat · shadow · pale · border, user-approved); the examples and templates pick it
  by §16. Open: Figma Component/List-Box has no Theme property (code mirrors Card's Theme) — add it to the master?
  Found by the theme sweep (not changed, scope lock): sibling Cards that disagree with their screen's ListBox theme —
  app-shell StudioApp Home MetricCards flat beside shadow ListBox (~244); alert-banner Billing Card border (~134) and
  breadcrumbs Top bar trail Card border (~201) on shadow screens; sidebar.tsx `cardLook` (default → border, alt → flat +
  surface alt) for the settingsList Cards. layout.tsx Elevated panel: `ElevatedList` is a hand-built box of rows (Box
  surface + List) whose render (Sidebar background="flat", no effectStyle, MetricCards flat) disagrees with its
  description and code string (default Sidebar, Shadow/Bottom/Level-1) — candidate for `<ListBox theme="shadow">`. (3) Mixed pairs: done
  2026-10-06 (the tabs Overview Card and segmented Billing Card are flat now, like the ListBoxes beside them).
- **P3 · Figma List-Box master (2026-10-06):** variants have a FIXED height (instances with fewer rows keep empty space
  until set to Hug) and Header-Slot / Footer-Slot centre their content, while code left-aligns header text and footer
  actions; ask the user whether the master should hug and align left.
- **P3 · List Item follow-ups (2026-10-06, session "List Item padding/gap adjustment"):** (1) Box padding is not
  breakpoint-aware, so desktop boxes of rows (`padding="xl"`, 24px) keep 24px on a 390px window where the page margin
  is 20px; (2) the Demo page's List composition (14730:79268, "My Leaves") still has the old List padding (12 top/bottom,
  0 sides, gap 2): with the new master its rows touch the frame sides and the fills overlap — update it in Figma;
  (3) BottomSheet body pads Margin-Compact, 16px on phones, so a clickable row's fill sits 4px from the sheet edge
  (Pick one, Sort by, template sheets); padding phone sheets 20px (title, search, body, footer) would give 8px — a
  component decision; (4) Card keeps radius 24px on phones while row blocks are `radius="xl"` 20px (Chart › Hours on a
  phone): Card radius xl on phones would match and be concentric with the fill; (5) Chat conversation rows keep the
  component's 16px inset (Figma Margin-Compact) while phone titles sit at 20px; (6) App Shell › Studio app's list block
  is a Studio-detached Box (24px fixed) next to Cards that pad 20px on phones; (7) code strings that differ from their
  render, seen by the review but not about lists: badge › Invoice status, menu › Keyboard and shortcuts, list-item ›
  Grouped notifications and layout › Main column / Centred (Card theme border vs flat), layout › Elevated panel (prose
  says shadow, render is flat), stepper / date-picker / pagination / rating snippets that leave out their List rows;
  avatar › Who's online status row sits on the card edge while the rows are inset.
  Gate warnings seen on these pages, not from this change: action-bar.tsx:404/519 trailing button size xs
  (list-item/trailing-button-medium); avatar › Profile photo has no h1 (outline-h1/start); app-shell › Search in the top
  bar "Activity, new" and chat › First message "Audio call" dead clicks; button.tsx:403 Heading/2 Text on a Studio-detached
  row (type/visual-heading) and its 2px Stack gap (ladder); list-item › Pending invites Revoke flagged as a dead click but
  works (3 → 2 rows + toast). **Sweep 2026-10-07:** done: (6) the list block is a `ListBox theme="shadow"` (app-shell.tsx:252); (7) the badge, menu, list-item and layout Main column / Centred code strings match their render, pagination's snippet has its List, and avatar's status row is a Stack above the ListBox (avatar.tsx:107-121). Duplicates: layout › Elevated panel (the Card → ListBox leftovers row above), "Activity, new" (a probe-order artifact, Done line of 2026-10-05 batch 1), button Heading/2 Text and 2px gap (Structural audit warnings row), Revoke (closed as a probe artifact). Still open: (1)–(5); (7) the stepper, date-picker and rating snippets; action-bar xs trailing buttons; avatar › Profile photo h1; chat › First message now flags "Video call" (its handler exists: check by hand). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (3) phone sheets pad 20px and (4) Card uses radius xl on phones → batch 6; (5) chat rows keep Figma's 16px (closed).
- **P3 · Sky/Mint/Bronze/Golden themes, follow-ups (2026-10-05, session "Cập nhật Zen Variables tokens"):** (1) Avatar
  Golden Solid has white initials at 2.58:1 (Bronze 3.38:1): add `golden` to `avatar/solid-initials-contrast` (today
  green|teal|orange|cyan) and to the avatar guideline Don't; (2) Figma Dock-Icon Solid Sky, Mint (and Yellow) draw white
  icons (On-Colors, 1.6–1.8:1) while Avatar/Badge use On-Brights there: ask whether Figma should switch to On-Brights;
  (3) the Badge and Badge-Counter contracts (`segmented-toggle-badge-avatarstack.json`, 102 of 126 variants) predate the
  four themes, `avatar-single.json` holds only the Photo/Neutral subset, and no suite reads them: re-capture with
  tools/figma-kit when a suite is written.
- **P3 · TopNavigation groups follow-ups (2026-10-05, session "Dual action trên top navigation Figma"):** (1) Header-Trailing
  (`largeTitleAction`) takes no `group` yet; (2) Figma's pill holds two, nothing warns at three in one group (a harness
  rule or a Studio drop warning); (3) Studio E2E rows for drag/group (gestures sent to "Studio builder tool planning");
  (4) the 5173 dev server needs a restart before the Studio item ops `groupItem` / `ungroupItem` work there. **Sweep 2026-10-07:** done: (4) the 5173 dev server was restarted after the item ops landed. Still open: (1)–(3).
- **P3 · Input Small text style vs Figma (2026-10-04):** `InputContent` uses Body/Small/Medium for Small, but `fieldTextStyle` (Input.tsx) gives every field but XLarge Body/Base/Medium; check the Figma Input Small content style and align one of them.
- **Mostly done 2026-10-07 (batch 5a): the unset prop gets a + (objectStarter.ts; named types read from docs/api, E2E IN-18) and `prop={CONST}` held by a same-file const of up to 20 items edits field by field there (E2E IN-19; its items do not move or go from the inspector); B3 done in GĐ4 M3; B4 (L) and B5 beyond these classes stay open.** P2 · Studio object props, next steps (2026-10-04): after B2 (`setField`): adding an object to an unset prop
  (EmptyState `secondaryAction` "Not set"), editing `prop={CONST}` data held by a
  same-file const (86 props, `editability-audit.mjs --class=data-const`). Then B3 (nested non-boolean props), B4 (override
  for loop-bound/bound/conditional props, 3,087), B5 (tests per class). Add/remove/reorder list items: done 2026-10-04 by
  session "Mở lại port preview" (`tools/studio/items.mjs`, ObjectProperties `selection`/`only`, DataItemPanel).
- ~~**P3 · Top Navigation Modal screen placeholder contrast (2026-10-04):**~~ **closed 2026-10-07 (backlog cleanup):** the placeholder token is kept on purpose (Content/Placeholder, see the examples-rebuild RESOLVED entry), like the other placeholder 1.92:1 lines. Was: `npm run qa` warns `[contrast] top-navigation@1512/390`
  "Choose a reviewer" / "Choose a slot" 1.92:1 (SelectField placeholders); seen while gating the Studio B2 change, which does not
  touch that page.
- **P3 · Design Tokens dark nav contrast (2026-10-04):** `npm run qa` dark audit warns 11× `[contrast] design-tokens@1512-dark`
  "page: <section>" 1.38:1 (Global Colors … Typography Configuration); first seen after the 2026-10-04 Global Colors
  Dark-contrast sync, not from the Studio code view change that ran the gate. Check the classic token-page nav text in Dark.
- **P3 · Empty State guideline vs Studio (2026-10-04):** the Search guideline says `illustration={false}` "in narrow
  panels such as sidebars and pickers", but the user wants the Studio tool's empty states illustrated (done for Code,
  Layers, Pages, Assets). Decide: Studio-only exception, or update the guideline (`guidelines.source.mjs` Search + Empty
  State "Drop the illustration inside lists…"). Also: Assets "No components match" says "clear the search" but has no
  Clear search action (Pages has one). **Sweep 2026-10-07:** the Assets "No components match" Clear search action is fixed in WIP b89020f (closes when the backlog batch 5b gate passes). The guideline question stays open. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** Studio panels keep their illustrations as a Studio-only exception; the app guideline stays (closed).
- **P2 · DatePicker Date-Picker/Mobile composition (2026-10-04):** the mobile primitives are built (`device`); not built:
  the Bottom Sheet picker of Figma 9923:3576 (Heading + Close, Cancel / OK), Variant=Multiple's scrolling stacked months
  with one sticky weekday row (`.Primitives/Date-Picker` 9923:2323 Option 2, "Clear dates"), Footer-Actions 9923:2791
  (price + Primary), and a DateField that opens it on phones instead of the desktop popover.
- ~~**P3 · Flaky test (2026-10-04):** `tests/scale.test.tsx` › Rating size spellings fails now and then.~~ Done 2026-10-04:
  Rating previews stars on pointerenter and the test browser's pointer stayed where an earlier test left it; the scale
  test now renders inside `pointer-events: none` (static DOM compare). Full suite 3× green (489 tests).
- **P3 · Code Connect for Description List (blocked, 2026-10-04):** Figma answers "You need a Dev or Full seat on an
  Organization or Enterprise plan to use Code Connect" for this account. Once a seat is available: map
  `Description List` 14859:79180 (Layout → `layout`, Items slot → `items`) and `.Primitives/Description-List/Item`
  14859:78890 (Term → `term`, Value → `description`, Emphasis → `emphasis`, Action/Action Button → `action`) with
  `.figma.ts` templates (the repo has no figma.config.json yet).
- **P2 · Card Sub-Action Menu triggers in examples (2026-10-04):** a node `subAction` (a Menu) still uses IconButton
  flat **primary** ⋯, while Figma and the Card default are flat **Secondary** ⋮: card.tsx:172/585, badge.tsx:100/411,
  metric.tsx:159/532 (level only), appLayer/navigation.tsx:466/852. Switching trips `button/secondary-justified` (also
  in the code strings). Needs the user's call: exempt flat IconButtons from the rule, `zen-allow-secondary` per site, or
  a Card `subAction={{ label, items }}` that renders the Menu with the Figma trigger. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** exempt flat IconButtons from `button/secondary-justified`; the examples switch to Figma's flat Secondary ⋮ → batch 6.
- **P3 · Card playground slot corners:** `.platform-slot` (radius Base 12px) inside a Small Card (16px, inset 16px) is
  not concentric ([rhythm] card@1512/390), new since the slot fills the card width (platform.css:817).
- **P2 · App Shell examples (checked 2026-10-03 after the List Item refactor; none caused by it):**
  - **Done (checked 2026-10-07, backlog sweep: a `ListBox` now (app-shell.tsx:252), padded by breakpoint like the Cards):** ~~Home "Due this week" is a Box detached from a Card in Zen Studio (`zen-detached`), so its padding is a fixed~~
    Padding/XLarge (24px); at the mobile breakpoint the MetricCards above pad 20px (Card padding follows the
    breakpoint) and the list content sits 4px inside them (Studio app, Narrow window, Banner).
  - Phone app › Profile: the two Toggles in Notifications don't stretch, so their switches sit mid-block instead of at
    the right edge; the Account kicker (`Group`) is tone="light" while the Notifications kicker is tone="base"
    (kickers are Body/Small/Bold Base). **Sweep 2026-10-07:** done: both kickers are `tone="light"` (app-shell.tsx:583, :711). Still open: the Toggles that do not stretch, "New" rows that open nothing, and the Back tooltip over the first row (keyboard only).
  - Notification rows (desktop Notifications page, phone Notifications) carry "New" but open nothing (static rows).
  - Phone Notifications: after the bell opens the screen, focus lands on Back and its tooltip covers the first row.
- **P3 · Accordion `contentWidth` follow-ups (2026-10-03, session 2dd655b9):** ~~(1) a Content width control in the
  Accordion playground (Figma has the property since 2026-10-03)~~ done 2026-10-07 (backlog batch 4: Title / Full); (2) the audit's [rhythm] concentric check measures
  insets inside scaled phones (accordion@390 reports 8 + 5 for 8 + 8).
- ~~**P2 · List Item on phones (designer decision, 2026-10-03):** interactive rows put their text at Padding/XLarge
  24px while phone page margins are 20px.~~ Done 2026-10-03: Figma List-Item gained Device=Desktop/Mobile (Mobile binds
  Margin-Comfortable, 20px); code pads Margin-Comfortable by breakpoint. Left: tablet Margin-Comfortable is 24px while
  Card/Modal padding is 20px, so tablet rows sit 4px inside a Card's content (Figma has no Tablet device). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** on tablet, rows follow the Card padding (20px); no Tablet device in Figma → batch 6.
- **P3 · List Item follow-ups (session "Component List Item refactor"):** EmptyError skeleton rows are static (0 / Gap/Medium
  16px) while the loaded rows are interactive (12px × 24px), so the list shifts when loading ends; a few static rows
  still carry Studio-written `selected={false}` (app-shell, action-bar, button); toggle.tsx "Show completed" snippet shows a
  Card while the JSX is a detached Box. Pre-existing NEW warnings seen in the gate, not from the list change: tooltip@390
  inline link targets (Exact time, Long file names), top-navigation/input "Choose a …" placeholder contrast 1.92:1,
  accordion@390 concentric corner, button "Chi Tran" styled Heading/4 without a heading + a 2px Stack gap (Hand off when
  ready), templates rhythm/outline-siblings. **Sweep 2026-10-07:** done: the toggle "Show completed" snippet matches (ListBox in both) and tooltip@390 audits clean. Duplicates: the placeholder contrast (kept on purpose), accordion@390 corner (Accordion `contentWidth` row (2)), button "Chi Tran" + 2px gap (Structural audit warnings row), templates rhythm / outline-siblings (AiChatBlock row and the rhythm 8 text styles item). Still open: skeleton vs loaded rows, Studio-written `selected={false}`.

The user's rule since 2026-09-29 (also in `AGENTS.md`, "Scope lock"):
- **Studio multi-select follow-ups (2026-10-03, session "Chọn nhiều element vào container"):**
  - P3 · Marquee (drag) selection on the canvas; Shift+click in Layers toggles like ⌘ instead of Figma's range select. **Sweep 2026-10-07:** marquee selection is done (`edit/marquee.ts`, `MarqueeLayer.tsx`); Shift+click range select is still open.
  - P3 · Delete / ⌘D / Move on a multi-selection (now one layer only, with a status line) and mixed-value property editing. **Sweep 2026-10-07:** Delete, ⌘D and mixed-value editing are done (`edit/multi.ts:55-75`, `MixedProperties.tsx`); Move on a multi-selection is still open (arrange.ts:131).
  - **Fixed in WIP b89020f (backlog batch 5b), closes when its gate passes.** P3 · Escape on a multi-selection selects the primary's parent; Figma selects the layers' common parent.
  - P3 · Wrap's snippet sync needs the example's `code:` to show the same region; most example snippets differ ("Example code not updated").
- **Studio nested booleans follow-ups (2026-10-03, session "Boolean lồng nhau trong Studio"):**
  - ~~P3 · Props inherited from another Zen props type are not listed~~ done in the Studio 2026-10-07 (GĐ4 M1,
    `inspector/inheritedProps.ts`: AvatarStack, BadgeCounter, NumberField, TextAreaField, PopoverManualAddNew); the docs
    (build-api) still list own props only.
  - ~~P3 · Nested instances show booleans only~~ done 2026-10-07 (GĐ4 M3: every property type, Figma names).
  - ~~P3 · A nested element passed through a variable (`leading={avatar}`) is not listed~~ done 2026-10-05 (fiber ownership).
- **Studio nested booleans, after the 2026-10-05 fix (session "Nested boolean không hoạt động"):**
  - **Closed (checked 2026-10-07, backlog sweep: the leftovers live elsewhere: Help-Text's Figma names has its own row (GĐ4 M2); Close, Toggle Subtext and characterLimit are recorded skips (session-log-2026-10-07)):** ~~P2 · Figma-model gaps (fits builder WP-E)~~ mostly done 2026-10-07 (GĐ4 M1): Input Label / Help-Text groups,
    switches for EmptyState CTA and AlertBanner / InlineMessage Action (object written as code), `icon-toggle` for
    `boolean | IconName` (Dialog, Toast, AlertBanner, InlineMessage icon; Slider / Metric icon). Left: ~~Toast Action~~
    (done 2026-10-07, batch 5a: Figma Actions is a toggle writing `{ label: "Action" }`) / Close and other handler-backed
    booleans (a no-op onClose fails interaction/no-noop-handler: the code says what closing does), Toggle Subtext (the
    Figma Toggle set has no property for it: `caption` stays a code text row), characterLimit (`ReactNode | true`: a
    text field, no switch), Help-Text's Figma names (set not in the capture: M2 read).
  - P2 · `scripts/build-api.mjs` drops intersection types: TextAreaField and NumberField list no label/helpText/label*
    props in the docs. The Studio lists them since 2026-10-07 (`inspector/inheritedProps.ts` ALIAS_EXTENDS).
  - **Fixed in WIP b89020f (backlog batch 5b), closes when its gate passes.** P3 (2026-10-07, GĐ4 M1) · A layer switch (Figma boolean) reads the rendered props, so it flips ~0.3–0.5 s after the
    source changes (the canvas's hot update + a 250 ms debounce); a second press before that writes the same value again
    ("No change"). Pointer: `inspector/GroupedProperties.tsx` ToggleRow `on`; an optimistic state would fix it.
  - P3 · Server `origin`: bindingOf ignores for-of/for-in/catch bindings; custom hooks returning state read as
    bound-value (a switch could fix their value); loop-bound `rows` is the innermost loop's length.
  - **Done 2026-10-07 (backlog batch 2: `jsx-source.mjs` setPropEdits inserts after the comment; 3 selftest checks):** ~~P3 · setProp after an attribute with a trailing `// comment` moves the comment; removeProp then leaves it on its own line.~~
  - **Closed (2026-10-07, backlog batch 5b: by design — ON brings the saved control bar back, as Figma shows a hidden layer again; the picker is for a bar the file never had):** ~~P3 · Control-Bar switch ON only opens the slot picker when the saved file has no control bar (no write until a pick).~~
  - P3 · Non-component exports left in component modules (Toolbar `revealSection`, ShortcutsDialog `openShortcuts`,
    ZoomControls `modKey`): an edit to those modules cascades; FramePanel.tsx and frames.ts could import
    board/presentFrame directly so Present.tsx can drop its re-export.
  - **Fixed in WIP b89020f (backlog batch 5b), closes when its gate passes.** P3 · A bound switch reads `false` for one render until DesignPanel's live props arrive.
  - **Done 2026-10-07 (batch 5a: a frame owns the module-level declarations its code names, list elements in ExampleMap / keepOnHotUpdate literals, a router's fallback statement; selftest frame-scope 23):** ~~P2 · Frame toolbar Discard (`tools/studio/frame-scope.mjs` frameRangesOf) misses edits whose JSX lives outside the
    frame's own JSX (a column const, a helper, a local component, hrDemo/HrShell): the frame shows no change and no
    Discard; only the toolbar's file-level Discard removes them. Nested groups now expose such edits ("Written in …").~~
  - P3 · Presence switch off → on in a playground (resetSlot refused there) re-adds the prop at the end of the tag, so a
    reordered draft remains (PlatformMobilePlaygrounds.tsx title).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1):** the three lines removed; Narrow window › Open navigation opens the drawer (Enter and click). Was: P2 · `src/platform/examples/pages/app-shell.tsx:288-291` (untracked; saved 01:38 on 2026-10-05, not by this session)
    has `defaultSidebarCollapsed={false}` `navOpen={false}` `defaultNavOpen` on the StudioApp AppShell: `navOpen={false}`
    locks the drawer, so "Narrow window" › "Open navigation" does nothing (`npm run qa -- --all` behaviour ✗ [apg]).
    Needs the user's call (remove the three lines).
  - **Done 2026-10-07 (batch 5a: every examples/pages/*.tsx exports through keepOnHotUpdate (src/platform/hotData.ts); readers re-render after React Refresh; frames keyed by place; a data edit still restarts its frame):** ~~P2 · Any Studio write to an example page remounts its examples (the page's `examples` export is not a Fast Refresh
    boundary): a view reached by interaction (Conversation › Back → Messages) jumps back to its first screen and the
    selected nested element disappears. The appLayer fix (`keepOnHotUpdate`) shows the way for example pages.~~
  - P3 · `origin` cannot see state that reaches a prop through a render-function parameter (Table cell
    `checked={feature.on}` with rows from useState): it reads bound-value, so a fixed value is offered and locks the toggle.
  - P3 · The "a fixed value applies to all N rows" hint counts every rendered instance (5 frames for
    PlatformChatHeader), not only .map rows.
  - **Done 2026-10-07 (batch 5a: frameLocs also walks the frame's React tree, portalled content included):** ~~P3 · Frame Save/Discard: `frameLocs` reads DOM data-zen-src only, which Zen components (TopNavigation, Avatar) do
    not forward, so their edits count as "outside" the frame (same fix area as the frame Discard item above).~~
  - **Duplicate (checked 2026-10-07, backlog sweep: closed as a probe artifact in the deadclick list-item@1512 "Pending invites" row):** ~~P3 · (observed in `npm run qa`, file unchanged since 2026-10-04) list-item › Pending invites › "Revoke invite for~~
    an.vu@…" reported as a dead click.
  - P3 · While a nested instance is selected, hover still outlines the outer layer that covers it (ListItem's click target).
  - ~~P2 · Enum/text props under a spread stay read-only~~ done 2026-10-04 (`ownValueOf`, user: "có").
  - ~~P2 · Studio edits to `PlatformExamples.tsx` reload the whole page~~ done 2026-10-04 (dead `isPlatformComponentPage` removed).
  - P3 · (2026-10-04) Canvas resize and spacing handles still treat any prop not written on an element with a spread as read-only (`select/resize.ts`, `select/spacing.ts` call `valueOf` without live props); the inspector unlocks the ones the spread does not feed. Only 1 layout primitive in platform/templates has a spread today.
  - **Duplicate (checked 2026-10-07, backlog sweep: kept by the user's choice, closed in the playground Avatar row of 2026-10-05):** ~~P3 · (2026-10-04, pre-existing) `PlatformExamples.tsx:728` Sidebar playground workspace Avatar: white initials on Solid green (usage-guard `avatar/solid-initials-contrast`).~~
- **Studio Design tab: remaining items (2026-10-03; session "Cloud migration feasibility"; spec docs/research/studio-inspector-redesign-2026-10-03.md):**
  - **Approved phases still to do:**
    - ~~Phase 2: ScaleField~~ ✅ 2026-10-05 (Studio builder session, `inspector/controls/ScaleField.tsx`, E2E I-15); left
      for later: typeahead "14" → nearest token, scrub (Phase 7).
    - ~~Phase 3 Flow/Padding, Phase 4 Alignment v2, Phase 6 Grid columns~~ ✅ 2026-10-06 (Studio builder session,
      `inspector/LayoutSection.tsx`, E2E L-01…L-08).
    - Phase 7: polish, Appearance surface/border.
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row ST-06):** **P2 · Canvas right-click menu still says "Detach component"** for non-detachable types. It should use
    isDetachableType and the label "Detach instance" (shell/CanvasMenu.tsx, Platform session).
  - **Done 2026-10-07 (backlog batch 2: the Size row is "Child size"):** ~~**P3 · Two "Children" labels:** the Size group's fillChildren row and the Slots section title both say
    "Children" on Stack/Grid/Box.~~
  - **Done 2026-10-07 (backlog batch 2: `propSchema.ts` nodeKind falls back to the engine's `zenComponents`, the src/index.ts exports):** ~~**P3 · Public exports read as "Local component":** PopoverBulkAction*, ZenPortal are missing from
    api.generated.json.~~
  - **Done 2026-10-07 (backlog batch 2: DesignPanel and FramePanel headings carry `title`):** ~~**P3 · Missing name tooltip:** a truncated node name in the header has no full-name tooltip.~~
  - **Done 2026-10-07 (backlog batch 2: `npm run studio:selftest` runs it, 33 checks):** ~~**P3 · No runner for detachable.selftest.mjs:** no test runner includes it.~~
  - **P3 · Unchecked dark / Comfortable / 280px:** no screenshot pass of the inspector in dark mode, Comfortable
    density or at 280px.
  - **Closed (2026-10-07, user decision in backlog batch 8: keep `sm`):** ~~**P3 · Small Detach button:**~~ the option-B Detach is `sm` full width and carries `zen-allow-small-full-width`.
    Decide whether to keep it or use md.
- **Full-width table pages follow-ups (2026-10-03; session "Cloud migration feasibility"; need the user's OK):**
  - **Done 2026-10-03 · examples/pages/app-shell.tsx:** Page() helper takes `maxWidth`; Projects, Invoices, People, Tasks
    and Files use "full" (+4 snippets); Home and Notifications keep lg. (The Studio draft that held it was discarded.)
  - **P3 · Harness rule:** flag a bare `<Container>` whose subtree holds a non-Card Table (new rule = new scope).
  - **P3 · HR · Home** is the only HR page still capped at lg; moving Home → a table page shifts the content edge above
    ~1500px. Decide whether app shells use one width. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** HR · Home uses `maxWidth="full"` like the other HR pages → batch 6b.
  - **P3 · Wide side content:** tabs › Project sections Overview DescriptionList card, My leaves Next leave card and
    Empty/Error InlineMessage now span up to ~2250px; layout › Main column and aside: the 1/3 aside grows too (fixed
    track option). Cap them if they read too wide. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** side content is capped at `xl` → batch 6b.
  - **Done 2026-10-07 (backlog batch 4: the table use case widens its stage to min(680px, 100%)):** ~~**P3 · Visually Hidden playground** table: the 520px stage + 64px star column cuts off the Archive column.~~
  - **Done 2026-10-07 (backlog batch 4):** ~~**P3 · HrPublicHolidayTemplate** section heading is `<Heading level={2}>` without textStyle Heading/4.~~

- A session does only the task the user approved.
- Nothing new starts without the user's explicit approval: no new session or task chip, no new rule or check, no fix
  found along the way. Another session cannot approve scope on the user's behalf.
- Every bug found and every follow-up goes here as one line, with a priority and a pointer, and is mentioned in the
  session's report. Nobody fixes it in passing.
- At the end of a working block this list is summarised as a **proposal for the next block**. The user approves what
  gets done; the approved items run as one planned batch, with fewer sessions that each own a set of files.
- Items that need a decision from the user or the designer stay under "Open items"; this list holds work.

- **From Zen Studio, the canvas tool (2026-10-02; session "Platform UI/UX redesign với canvas editor"):**
  - ~~**P2 · Classic full screen loses focus layout:**~~ Fixed 2026-10-02 by "Disable input và search từ Figma"
    (`:not([data-fullscreen="true"])`). `src/platform/platform.css` ~line 492, `.pe-card:is(:focus-within, …)`
    (specificity 0,3,0) beats `.pe-card[data-fullscreen="true"]` (0,2,0): in the classic docs a screen example's full
    screen falls back to an inline card as soon as focus enters it, so the first click on More actions / New task
    misses. The Studio's Present has its own higher-specificity rule. Fix: `:not([data-fullscreen="true"])` on the
    focus-raise rule.
  - **P3 · Studio: 0 spacing has no canvas area:** a gap/padding of `none` draws no hit area, so it is set from the
    Inspector's Layout section only (`select/spacing.ts`).
  - **P3 · Studio: outlines over scroll-clipped elements:** the selection outline and spacing tints draw over parts an
    ancestor scroll box clips (e.g. alert-banner.tsx:390 Box after Shift+2); clip to the scroll ancestor.
  - ~~**P3 · Studio: dashed owner outline warning**~~ done 2026-10-03 (zen-allow-dashed-color note).
  - **P3 · Studio detach follow-ups:** row index assumes the `.map` result renders unchanged (`.slice/.reverse/[h, ...map]`
    would pick another row; no repo case); the phrasing check for Badge/Tag looks at the nearest JSX parent only; the
    inspector status shows the snippet-not-synced note for detach only. **Sweep 2026-10-07:** done: the snippet-not-synced note also shows for wrap, slot inserts and float (wrapSelection.ts:298, slots/actions.ts:233, position/float.ts:49). Still open: the row index and the phrasing check.
  - **Done (checked 2026-10-07, backlog sweep: no static or dynamic import from appLayer/* or src/templates/** reaches PlatformAppLayer, PlatformExamples or PlatformShowcases (import-graph script), and the app layer uses `keepOnHotUpdate`; not re-run as a live HMR edit):** ~~**P3 · HMR cycle in the app layer:**~~ editing `src/platform/appLayer/*` or `src/templates/*` throws
    `Cannot access 'pages' before initialization` (PlatformAppLayer ↔ appLayer ↔ PlatformExamples cycle) and Vite
    reloads the page. The Studio survives it (state in sessionStorage) but a Studio edit there costs a full reload.
  - **P3 · Studio drafts, live push:** other browsers learn about a draft or a stale disk by the 10 s poll / focus;
    a Vite ws event (`zen-studio:drafts`) from the plugin would show it at once (verify 2026-10-03).
  - **P3 · Studio drafts and the standalone audit tools:** only `npm run qa` warns that 5173 renders unsaved drafts;
    `platform:audit`, `platform:shoot` and `visual-diff` run on 5173 without saying so (tools/platform-audit/*).
  - **P3 · Studio toolbar under ~900px:** the drafts group (Unsaved · Save all) leaves no room for the breadcrumb.
  - **Closed (checked 2026-10-07, backlog sweep: the placeholder colour is kept on purpose (Top Navigation placeholder row); the label tooltip has a 24px hit area (input.css:482-483)):** ~~**P3 · New gate warnings seen 2026-10-03 (not from the phone centring, owner to triage):**~~ placeholder contrast
    1.92:1 on "Choose a reviewer/slot" (top-navigation Modal screen) and "Choose a client" (input Create a project),
    `button.zen-input-label__tooltip` 12×12 target (input Label parts); report `.qa/reports/2026-10-03T04-58-39-47da80c2.md`.
  - **P3 · PlatformPhone scale feedback (latent):** `PlatformPhone.tsx` scales from its immediate parent's width minus
    32 and falls back to scale 1 when that room is ≤ 0, so a host sized by its content (grid/inline box around the phone)
    loops. Surfaced by the phone centring (2026-10-03, Chat playground; fixed there with a definite width). Harden: keep
    the last scale instead of 1, or measure a host whose width does not depend on the phone.
  - **P3 · Mobile templates take a full row:** `appLayer/templates.tsx` sets `wide: true` for every template, so the
    two phone templates (Mobile list · Orders, Mobile detail · Order) sit centred in a 1064px grey stage; `wide:
    !template.mobile` would put them two per row like the other phone examples (needs the user's OK). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** phone templates use `wide: !template.mobile` → batch 6b.
  - **P3 · Phone on fractional pixels:** the fit box is `spec.width * scale` (e.g. 323.02px), so centred phones land on
    half pixels (1px gap differences, anti-aliasing in element screenshots); round the fit size in PlatformPhone.
  - ~~**P2 · Detach ListItem after the ListItem refactor (2026-10-03, session "Component List Item refactor"):**
    `tools/studio/detach.mjs` ListItem.build + listInset() still emit Padding/Small × the list inset.~~ Done 2026-10-03
    (session "Platform UI/UX redesign với canvas editor"): listRowBox; 156/156 rendered static rows match the DOM.
  - **Done (checked 2026-10-07, backlog sweep: superseded by the 2026-10-06 ListItem refactor: no side padding by default (list-item.css:11-24), and detach writes no paddingX fallback (detach.mjs:947-956)):** ~~**P2 · Detach ListItem: default inset is now Margin/Comfortable (2026-10-03, session "Component List Item refactor",
    List-Item Device=Desktop|Mobile):**~~ interactive rows pad Small × `var(--zen-margin-comfortable)` (24px desktop/tablet,
    20px mobile), not Padding/XLarge. `listRowBox` (tools/studio/detach.mjs) still falls back to paddingX xl with no note;
    the Studio measures the row, so detached output is right per frame (phone frame → lg), but the fallback and the
    approximation should say the default inset follows the breakpoint (like inset="comfortable"). Needs the user's OK.
  - **P3 · Detach follow-ups seen while verifying the ListItem recipe (2026-10-03):** (a) a row whose `onClick={onClick}`
    comes from a prop is refused as "interactive" although it renders static (HrHomeTemplate leaveRow); reword the
    refusal for a bare identifier. (b) Rows in portalled overlays (Dialog, modal SidePanel, AppShell aside as a modal)
    sit in `.studio-portal-root` outside the frames, so the canvas and Layers cannot select them. (c) The HMR after a
    detach resets examples with interaction state, so "Selection lost after the file changed" replaces the outcome and
    its Approximated notes. (d) Detaching or discarding in a template logs `ReferenceError: Cannot access 'pages' before
    initialization` (PlatformAppLayer.tsx:24 ↔ appLayer/templates.tsx import order). (e) `<Zen.ListItem>` (namespace
    JSX) is not found by detach ("Expected <ListItem>"). (f) 55 static ListItems need multi-step state to render and
    were checked from source only. **Sweep 2026-10-07:** done: (b) overlay rows are hit-tested through `.studio-portal-root` (SelectionLayer.tsx:430-446, E2E O-02); (c) every example page uses `keepOnHotUpdate`, and a detach keeps its awaited selection and status; (d) no import cycle is left (import-graph script). Still open: (a), (e). (f) is a verification note, not a defect.
  - **P3 · Structural audit warnings new on 2026-10-03 (not from the colour or Detach changes; owners to triage):**
    ~~ai-chat "Assistant on a phone" has no h1 (outline starts at h2 "What do you need, Alex?")~~ done 2026-10-07 (backlog batch 4: the bar title "Zen AI", as its code sample already had); button "Approve on a
    phone" styles "Chi Tran" heading-4 without a Heading, and "Hand off when ready" has a 2px Stack gap (not a ladder
    step); accordion@390 "Mobile order summary" corner 16px vs trigger 8px + 5px inset; tooltip@390 "Exact time" and
    "Long file names" links are 16–20px tall targets. Report `.qa/reports/2026-10-03T15-48-37-47da80c2.md`. **Sweep 2026-10-07:** done: "Chi Tran" is a Text span now and the audit finds no hierarchy issue; tooltip@390 audits clean (WCAG 2.5.8 spacing exemption). Still open: the 2px gap in "Hand off when ready" (button.tsx:245) and the accordion@390 corner.
  - **P3 · action-bar 390 contact sheet:** the sticky "No changes to save yet · Undo changes · Save changes" bar of
    Unsaved changes is drawn over the neighbouring cells (Two choices on a phone, Running total) in the shot.
  - **Done 2026-10-07 (backlog batch 2: the "Row inset" label is gone; the prop shows as the API marks it):** ~~**P3 · Inspector: List `inset` is @deprecated**~~ — `inspector/propSchema.ts` still labels it "Row inset" (inspector
    owner: hide it or mark it deprecated).
  - **P3 · Board follow-ups (2026-10-03, stable layout):** a width override past the section edge overlaps the Docs
    frame and is left out of the section surface and zoom-to-fit (extend the surface / fitRect to the rendered extent
    without changing the grid track); "ResizeObserver loop completed" still fires at zoom ≤ 0.5 when frame labels crowd
    (pre-existing: defer FrameChrome's RO-path style writes to the next frame); at 1024px a toolbar inside the frame
    top opens its width menu upward off the window; after Clear contents → Reset slot → Undo ×2 on card example:5 the
    selection layer drops the selection; GET /element 404s for removed children after a slot Clear.
  - **P3 · Resize follow-ups (2026-10-03):** a fillChildren column with `height="fill"` whose own parent gives it no
    height collapses its children to 0 (needs a parent-aware rule); a column/row with only a minHeight keeps content
    heights (decide Figma parity); a px-capped component (number Chip, CSS max-width 40px) still offers width handles
    that only size its wrap Stack; after a wrapper edit, a child on the same source line keeps its old column and the
    selection drops ~2 s later; a `.map` drag previews only the pressed instance; a Hug double-click on an axis that is
    already Hug still sends one no-op edit; a dropdown Chip hides both axes (decide whether width stays). **Sweep 2026-10-07:** done: a Hug double-click on an axis that is already Hug writes nothing (resize.ts:582, :601; ResizeLayer.tsx:978-982). The rest is still open (two of them are decisions). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** a minHeight-only Stack sizes Fill children as Figma does, and a dropdown Chip keeps its width handle → batch 5c.
  - **P3 · Studio wrap and child contracts:** the `wrap` op (resize of a component without a size prop) does not check
    parent/child contracts: wrapping a ListItem in List, a Tab in Tabs, menu/select items or Table parts may break the
    parent's semantics or ARIA (it already refuses table/svg/paragraph nesting). The wrap selftest runs no
    style-guard/usage-guard/tsc on its outputs (detach's does).
  - **Done (checked 2026-10-07, backlog batch 2: set then remove returns the original text; a selftest check covers the tag closed on its last line):** ~~**P3 · Studio setProp/removeProp on a multi-line self-closing tag:**~~ setting then removing a prop (e.g. `fullWidth`
    on card.tsx's Segmented) leaves `/>` on its own line instead of the original text, so the draft no longer equals the
    disk until it is discarded (found by the resize builder, 2026-10-03).
  - **Done 2026-10-07 (backlog batch 2: tsconfig.json excludes `src/platform/examples/drafts`, git ignores it; the samples' own tsconfigs set `exclude: []`):** ~~**P3 · Studio selftest temp files in src/:**~~ `tools/studio/selftest.mjs` writes detach tsc samples under
    `src/platform/examples/drafts/`, so a `tsc` run in parallel fails and the 5173 watcher sees them; write them to a temp
    dir with its own tsconfig.
  - **Closed (2026-10-07, user decision in backlog batch 8: keep it as it is):** ~~**P3 · Frame Save at mid zoom:**~~ on hover a drafted frame adds its frame tools only when the whole toolbar fits
    above it; otherwise the tools need a selected frame (by design, so Save never jumps; revisit if it confuses).

- **From the AI Chat Field / Chat-Control update (2026-10-02; session "Cloud migration feasibility"):**
  - ~~**P2 · Token sync:** the live Figma Component Theme collection has 8 modes; the repo has 6 (no Neutral - S5, S6).~~
    Done 2026-10-02 (session "Platform UI/UX redesign với canvas editor"): Neutral - S5, S6, S7 synced from Component Theme.json.
  - **P3 · AiChatField focus ring (decision):** focus adds a 1px Border/Neutral/Subtle ring, which in S4 equals the new
    resting stroke, so only the caret changes; ChatComposer uses the standard Input ring (user-approved 2026-10-02).
    Option: give AiChatField (all three styles) the same ring. `ai-chat.css` focus-within rules. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** all three styles take the standard Input ring → batch 6.
  - **Done 2026-10-02 (user: "sửa lỗi đi") · P3 · Intermittent smoke finding on chat:** a race in the audit's smoke
    layer check, not a UI bug: it sampled a popover rect read before the mouse moved, while chat demo timers re-pinned a
    thread and the portalled popover moved with its anchor. The check now samples the popover's live rect
    (`tools/platform-audit/audit.mjs`). Verified: 6 gate-flag runs clean under load, 3 genuine-overlap CSS variants still
    flagged, all 61 pages × 1512/390 old vs new: no real overlap lost, none added. It also ends the templates@390
    "HR · Home #1" flake below (old check: 5/5, new: 0/5).
    - **Done 2026-10-02 (user: "xử lý hết lần lượt") · P3 · Smoke hardening:** pointer spot kept inside the viewport,
      on-screen part sampled, 0×0/closed popovers skipped and counted in `report.smokeStats` (one summary line,
      information only), hover-revealed toolbar buttons clicked with the pointer on their row.
  - **Done 2026-10-02 (user: "xử lý hết lần lượt") · found while fixing it:**
    - **P2 · Reaction-Bar clipped at 390:** `useAnchoredPosition` now shifts a surface that fits on neither edge of
      its anchor into the viewport (`clampAnchoredLeft`, 8px margin); surfaces that fit are placed as before.
    - **P3 · ChatThread re-pins after a programmatic scroll:** the reader's input/position are refs, focus counts as
      input, and an input while the thread is away from its end unpins it (tests: chat-thread-picker.test.tsx).
    - **P3 · Docs page jumps at 390:** `.platform-phone { overflow-anchor: none }` (measured −38px → 0).
    - **P3 · React picker refocuses on every render:** focuses once per opening (Popover merges refs inline).
    - **P3 · Smoke coverage of chat hover toolbars:** covered by the smoke hardening above.
    - **Not a bug · desktop chat windows open at scrollTop 0:** every thread opens at its end on load (13/13 at
      1512 and 390); the case seen mid-smoke was the re-pin above.
  - **Found while verifying those fixes (2026-10-02; need the user's OK):**
    - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** useMenuPlacement shifts a menu that fits on neither edge into the bounds (margin each side; test in input-popups). Was: ~~P2 · Menu cut off at 390:~~ Menu has its own `useMenuPlacement` (not the clamp): menu › Project actions #2 More
      opens at x −51 on a 390px window, labels cut ("opy link"). Same fix as `clampAnchoredLeft`.
    - **Done (checked 2026-10-07, backlog sweep: Menu keeps the 8px margin (Menu.tsx:146-157); at templates@390 all 7 Settings menus open between 146 and 378):** ~~**P3 · Menus at the viewport edge:**~~ templates@390 HR cards' Settings menus open at x 2 (inside the 8px margin).
    - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** Popover autoFocus focuses with preventScroll (Switch workspace: scrollY 3316 → 3316, list on screen). Was: ~~P2 · Sidebar workspace switcher jumps the page:~~ sidebar › Switch workspace (and templates › Empty and error
      states #2) scroll the page 3250 → 602 and open the listbox off-screen (focus set before it is positioned).
    - **P3 · HR · Home Settings menu closes in the full smoke flow** (stays open alone): state left by an earlier step
      (the "Open navigation" drawer?); the smoke never samples it.
    - **P3 · Popover shift → edge hand-over jumps:** a surface shifted into view (fits on neither edge) jumps to its
      edge-aligned spot once the anchor slides far enough for an edge to fit (64–96px seen while resizing 360→424).
      Inherent to shift-then-align; a continuous hand-over would clamp from the edge the anchor moves toward.
    - **P3 · useAnchoredPosition in scaled frames:** offsets are measured in screen px but written as CSS px, so in a
      transform-scaled docs phone a surface sits slightly off its anchor (pre-existing; the clamp now uses the scale).

- **Template rebuild follow-ups (2026-10-01; brief docs/research/template-rebuild-brief-2026-09-30.md):**
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4):** DatePicker re-opens on the applied value's month (else today's; useLayoutEffect on open; test in input-popups); the focus-after-failed-submit half was already fixed (DateField opens on focus only after Tab). Was: ~~P2 · DateField:~~ the calendar opens on today's month even when the field holds a typed date in another month;
    after a failed ModalForm submit, focus lands on the first invalid DateField and its calendar covers the dialog's
    title and first fields (HR Public holidays, My leaves).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1), already fixed in Toast.tsx (the action dismisses unless `keepOpen`):** ~~P2 · Toast:~~ a Toast stays visible after its Undo is pressed (HR Expense overview, Leave types).
  - **P3 · Table:** rows of a table without onRowClick still show the hover fill (Team budgets); the
    `table/title-heading-4` rule wants Heading/4 for a Card title that heads a table, while cards use
    Heading/Subheading (Detail page used one zen-allow). **Sweep 2026-10-07:** done: `table/title-heading-4` accepts Heading/Subheading inside a Card (check-usage.mjs:900-901); the zen-allow at DetailTemplate.tsx:271 is no longer needed. Still open: the hover fill without onRowClick.
  - **P3 · HrShell:** the Approvals counter in the module sidebar is static data; it doesn't follow approvals made on
    the page.
  - **P2 · ListItem:** on a clickable row the trailing slot (a Badge) sits outside the row's button, so tapping it does
    nothing. (Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 3): the `aria-pressed` half — a button row now sets `aria-current="true"` when selected, nothing otherwise.)
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4):** the trigger is `aria-labelledby="<label> <trigger>"` ("Role Editor"; an unlabelled one reads its aria-label through a hidden span); test in input-popups. Was: ~~P2 · SelectField:~~ the trigger button's accessible name is only its value; the label points at the hidden native
    select.
  - **Done (checked 2026-10-07, backlog sweep: templates@1160: all 5 Notifications panels open as modals with the header fully visible):** ~~**P2 · SidePanel in the docs frame:**~~ at ~1160px the notifications panel of Admin list / Settings opens as a modal
    with its header cut off at the top.
  - **P3 · Phone templates:** their toasts appear at the bottom of the browser window, outside the phone frame (the
    docs ToastStack, not the template).
  - **P3 · AiChatBlock:** its greeting is an h2 in Heading/1, so a page that also has Heading/4 section h2s trips
    `outline-siblings` (HR · Home).
- **HR template audit follow-ups (2026-09-30, batch 6b; log: session-log-2026-09-30.md "Batch 6b"):**
  - ~~P1 · Sidebar collapsed Basic width~~ — done 2026-09-30 (user: "Có"): the collapsed panel HUGs its logo like
    Figma 4081:15233 (84 with the 28px logo; HR rail 88 = 8 + 72, main at 80).
  - **Waiting for design (user 2026-09-30: "Chờ thiết kế") · All Tasks Calendar / Gantt tabs:** Figma's Tab-Bar has
    List · Kanban · Calendar · Gantt but only List and Kanban frames exist; the two panels stay as they are until the
    designer draws them.
  - **Checkbox column closed 2026-10-05 (user: "Cột checkbox như code là cũng ổn" — keep 48, no drag handle).** **P2 · Table (All Tasks):** checkbox column 48 vs Figma 64 with a hover drag handle; no add-row slot (Leave Types,
    Public Holiday, Tasks build "Add New" as a data row / Stack); fill column still wraps in a narrow preview. **Sweep 2026-10-07:** the narrow-preview fill column is the same as the "Narrow tables without fixed widths" row. Still open: no add-row slot.
  - **P2 · Designer questions (Figma data kept literally):** Metric-Trend Medium badge + 24px gaps and a down arrow on
    Positive only as an instance override (Total Expenses) — add a Size to the component?; Remaining Budget
    "Bar-Quota" is raw frames (Violet on Neutral Subtle, legend dot Neutral) — make it a ProgressBar (needs Violet)?;
    Leave Types header "Type" twice, row 3 "Annual Leave" 🥵 Unpaid; Pending $229.00 vs rows $112.50; "$5.4k" vs
    "$5.4K"; Expenses/Workbench "Configurations" drawn collapsed with no children; "Hight" typo; Figma flag names
    "Uzbekista N", "andorra", "Marshall Island", "Sao Tome and Prince".
  - **P2 · Component gaps from the Tasks frames:** Box has no Support/Subtle colour surfaces (Kanban columns); Card
    Spacing Small 16/16 vs Figma ticket 12/12; ModalForm Big 960 vs 800, no action icon (Attach File), TextAreaField
    fixed 112 vs 240; PageHeader title-to-chevron gap 12 vs 8; ProgressCircle Done shows a check vs a full disc; flag
    text tone Base vs Light.
  - **Closed (2026-10-07, user decision in backlog batch 8: keep the Grid (the Dock Icon offset was done, see the sweep note)):** ~~**P2 · Home metric row:**~~ Figma is a masked, fading row of fixed 356px cards that runs past the edge (no carousel /
    fade primitive in code; 4 equal columns now). Dock Icon sits 28px left of Figma because Card reserves the
    Sub-Action padding. **Sweep 2026-10-07:** done: the Card Sub-Action is absolute and takes no room (card.css:43-45), and HR Home uses MetricCard title-highlight (not pixel-compared). Still open: the fading row (a decision).
  - **Done (checked 2026-10-07, backlog sweep: at templates@390 the Segmented is 203px in a 302px card and nothing scrolls (HrExpenseOverviewTemplate.tsx:427)):** ~~**P3 · Expense Overviews at 390:**~~ the hugging range Segmented scrolls sideways (phone rule: single-choice Chips).
  - **P2 · Narrow tables without fixed widths (pre-existing):** when a Table's min-content is wider than its box it
    both scrolls and crushes text columns to min-content (Sidebar "Projects flyout" at 390: "Token rename for Selected"
    on 4 lines, table 345 in 246). Proposal: a readable minimum for text columns (as the fixed-column tables now have,
    `--zen-table-fill-min-width`), in line with the research overflow matrix (docs/research/ui-patterns-and-rules-2026-09-30.md B1 L11–L13).
  - **Closed (user, 2026-10-05: "chữ trắng trên Avatar nền Solid: Giữ nguyên hết") — Figma's solid colours stay; the harness keeps warning.** ~~P2 · Solid Avatar initials contrast (designer question):~~ white initials on Solid Green / Orange / Teal / Accent /
    Cyan avatars measure 2.6–2.9:1 (gate warnings on avatar, list-item, sidebar, bottom-sheet playground, HR All Tasks
    Space "P"). Figma uses Content/On-Colors on these fills; needs a colour decision, not an example fix.
  - **Done 2026-10-05 (session 28eea406):** a 390 pass of all 61 pages found only the Input label tooltip (now a 24px
    hit area) and lone Tooltip-page links (exempt under WCAG 2.5.8's spacing exception, which the audits now apply); the
    chat items were gone since the 10-02 audit fix. ~~P3 · Gate target warnings (component level, pre-existing):~~ chat
    reactions 18×15, chat call action 129×20, input label tooltip 12×12 at 390.
- **Review batch 5 follow-ups (2026-09-30, items 13–17; log: session-log-2026-09-30.md "Review batch 5"):**
  - **P2 · DateField typed dates:** `onDateChange` fires only when a day is picked in the calendar, not for a typed
    MM/DD/YYYY (`Input.tsx` DateField); Side Panel › Submit leave parses `onValueChange` instead.
  - **Done 2026-10-05 (user: "Đúng"):** Sidebar item `theme` defaults to neutral at every level (Figma Menu-Item Theme default Neutral); `theme: "accent"` keeps the pink. ~~P2 · Sidebar selected child item~~ is accent-subtle (pink); Figma HR-Platform shows it neutral grey (Time Off ›
    Configurations › Leave Types).
  - **Done (checked 2026-10-07, backlog sweep: at app-shell and templates@390 every header keeps its actions on the toggle's row (app-shell.css:44-48)):** ~~**P2 · AppShell top bar at 390:**~~ the actions wrap under the menu button (HR templates, App Shell › HR workspace).
  - **Done, verified 2026-10-05 (user: "Thử"):** MetricWidget/MetricCard `variant="title-highlight"` (Figma 7523:507049) exists and HR Home, My Leaves, My Expenses, Expense Overview and Public Holidays use it. ~~P2 · Metric has no Title-Highlight variant~~ (title on top, big number, DockIcon): HR Home, My Leaves and Expense
    Overviews compose it from Card + Heading + DockIcon.
  - **P2 · Thin examples sweep (item 13 rest):** Dialog "Form · 1-3 with preview" and ModalForm "Basic" still open from
    a one-line row; scan other overlay/trigger examples the same way (script in the session log). **Sweep 2026-10-07:** done: "Form · 1-3 with preview" and "Basic" are gone; dialog.tsx:667-794 are scenario examples. The scan of the other overlay examples has not been re-run.
  - **P3 · Sidebar with a custom `brand`** loses its own collapse control (flat canvas without a top bar must use
    logo/productName). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** a custom `brand` keeps the collapse control → batch 6.
  - **P3 · Components seen by the template agents:** emoji DockIcon XSmall draws a 12px glyph (Figma 28px); ProgressCircle
    has no decorative mode (status read twice); ModalForm `header={false}` has no accessible name; Box has no tinted
    surfaces (Kanban column colours); Card content does not fill a stretched card; AiChatBlock greeting is an h2 (Home
    adds a hidden h1). **Sweep 2026-10-07:** duplicates: Box tinted surfaces ("Component gaps from the Tasks frames" row) and the AiChatBlock greeting (AiChatBlock row). Still open: emoji DockIcon XSmall, ProgressCircle decorative mode, ModalForm `header={false}` name, Card content fill.
  - **P3 · Gate warnings left from batch 5:** coverage — App Shell "states", Visually Hidden "edge cases", Page Header
    "states / edge cases / mobile" (Action Bar keyboard/a11y was already open); rhythm — HR templates and App Shell › HR
    workspace use 8 text styles (Figma pages); the Templates page runs past the 90s behaviour budget; deadclick on
    App Shell › Flat canvas "Overviews" is not reproducible by a direct click (it switches the page) — likely the
    probe clicking after the collapse button; Dialog "Form · Half-Half" styles "Workspace name" as heading-4 without a
    heading (pre-existing); Action Bar at 390 (sheet of the shared content.tsx): "Edit page with a sticky bar"
    truncates Undo changes / Save changes and "Cart with a total" truncates the print names (pre-existing). **Sweep 2026-10-07:** done: App Shell, Visually Hidden and Page Header coverage, the Flat canvas dead click (no longer on the page), Dialog "Form · Half-Half" (example gone), Action Bar 390 truncations. Still open: the HR rhythm (a decision) and the Templates page's 90 s behaviour budget. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the HR text-style rhythm is baselined as Figma-faithful → batch 6b.
- **Typography outline / content hierarchy (2026-09-29):** the user approved every recommendation ("theo đề xuất");
  implemented the same day (session log, "Typography outline"). Follow-ups:
  - **Done 2026-09-30:** the Bottom Navigation and Templates screens have their h1 (Form "Mobile checkout" was already
    fixed); outline-* warnings run by default with their baseline seeded, `rhythm` re-seeded; the gate maps
    `PlatformPhone.tsx`, `PlatformTypographyHierarchy.tsx` and `PlatformMobileShowcases.tsx` helpers to their pages.
    Log: `session-log-2026-09-30.md`.
  - **Done (checked 2026-10-07, backlog batch 4: chat and side-panel pass the outline checks at 1512 and 390):** ~~**P2 · Screens still without an h1 (baselined debt, found by the default-on outline check):**~~ Chat "Desktop
    messenger", "Desktop support (Business)", "Desktop group media", "Reply to any message" (Messenger starts at h3
    "Messages"); Side Panel "Docked inspector". (Sidebar shells fixed 2026-09-30: PageHeader h1 + h2 sections.)
  - **Done 2026-10-01 (user chose option A):** EmptyState `compactTitle` gives a Card you title yourself the ChartCard
    title style (Body/Extra/Bold).
  - **Done (checked 2026-10-07, backlog sweep: the row click also selects the row (PlatformTypographyHierarchy.tsx:267)):** ~~**P3 · Typography "Emphasis inside a level":**~~ clicking a row that is already read does nothing (behaviour
    deadclick ⚠); let the row toggle read/unread or say so in the caption.
  - **P3:** the docs platform's own outline on the Typography page (h2 Heading/3 sections, example h1s under h3 card
    titles); ExampleCard should expose `data-screen`; a durable selftest for the quality/outline runtime checks; the
    redundant `ZenProvider typography="mobile"` wrappers around PlatformPhone; the Typography topbar chip no longer
    reaches phone frames (they default to Mobile); TopNavigation stories for the heading behaviour; the Text
    "Headings" story could label each level's default style. Review:
  `docs/context/typography-hierarchy-review-2026-09-29.md` (8 decisions, ~30 verdicts; the phone child screen has no
  h1, h2 renders in 6 styles, the enforcement misses missing h1s and errors on valid group headers). **Sweep 2026-10-07:** done: ExampleCard exposes `data-screen` (PlatformShowcases.tsx:41). The rest is still open. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the Typography chip does not override phone frames; phones stay Mobile (closed).
- **Closed (user, 2026-10-05: "Motion: Đóng") — the P2 motion ideas below stay as ideas, not planned work.** **Motion (2026-10-01):** P1 is done (tokens in the pipeline, reduced motion keeps fades, Popover/Menu/tooltip
  enter and exit, raw values swept, motion rules). The user's decisions: reduced motion = movement off (1A), code-owned
  tokens + Figma Motion collection (2A), productive only, no spring (3A), colour-only press feedback (4A), the Segmented
  Primary label flips at the midpoint (5A). Review: `docs/context/motion-transitions-review-2026-10-01.md`. Next:
  - **P2:** sliding Tabs indicator and Segmented thumb (label colour flips mid-slide); Checkbox/Radio/Toggle
    micro-motion; usePresence driven by animationend (then reduced motion can fade out too); Sidebar collapse with
    transform instead of width; Accordion content fade; Progress with scaleX. Each needs the full gate.
  - **Closed (2026-10-07, user decision in backlog batch 8: the Motion P3 ideas are dropped):** ~~**P3:**~~ shared add/remove motion for list rows; Toast stacking (design decision; enter/exit, timers and the shared
    layer fixed 2026-10-04, a collapsed "pile" like Sonner is still open); View Transitions on the platform.
- **Process (2026-09-29):** batch A of `docs/context/process-audit-2026-09-29.md` is done (tiers in AGENTS.md §C,
  consumer-scoped QA, ledger/Stop-hook fixes, scoped static gates, Scope-lock wording, a `use_figma`-safe extractor),
  then a token fast path, label-key scoping and a narrower tier L (`--all` only for every-page changes; library
  components like AppShell stay scoped). Token sync: `skills/zen-token-sync` (the claude.ai `zen-ds-token-sync` skill is
  out of date: point it at the repo skill).
  The user chose to work with it for a few days; batches B (parallel gate), C (Figma kit, suites, live tokens) and
  D (lighter docs) wait here until needed. Batch A follow-ups: **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** batch C (Figma kit, suites, live tokens) joins batch 7; batch D is dropped.
  - **P2 · Seed the contrast/targets baseline:** `node tools/platform-audit/audit.mjs --quality --viewports=1512,390
    --baseline-update=contrast,targets` over all pages, plus a `--dark` pass (≈20 min). Until then those known
    warnings show as new.
  - **P2 · Exact sheet review:** add `Read` to the PostToolUse matcher in `Zen-CodeBase/.claude/settings.json` so a
    sheet's hash is saved when it is opened (needs the user's OK: settings), and give each run its own sheet folder
    (B3), since `.platform-shots/` is shared by sessions. **Sweep 2026-10-07:** done another way: the Stop hook scans the transcript for PNG Reads (stop-gate.mjs:51, :67), so no settings change is needed. Still open: one sheet folder per run (run.mjs:495).
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
- **Done 2026-10-05 (user: "Xử nốt"):** the parallel gate (static steps side by side, ZEN_QA_SHARDS audits) was already in; the last part is `npm run qa -- --isolated` (tools/qa/isolated-server.mjs: private Vite on 5200+, own cache, no watcher/HMR, no Studio drafts; also the fallback when the shared server is down). Was: ~~P1 · Faster QA.~~ Owner: "Quy trình kiểm tra Component build". On 28/9, 32 QA runs audited 419 pages one at a
  time, about 5 hours of browser time on an 11-core Mac.
  - **Done (checked 2026-10-07, backlog sweep: done another way under the faster-QA parent: ZEN_QA_SHARDS processes (run.mjs:179-181), parallel static steps and `--isolated`):** ~~Add `--workers=N` to `audit.mjs`, `behaviour.mjs` and `shoot.mjs`: one browser with N contexts working from a page~~
    queue.
  - Run the static gates concurrently in `tools/qa/run.mjs`.
  - Optionally audit a `vite build` preview on its own port, so other sessions' HMR never breaks a run.
  - Expected: 3–4× faster; `qa --all` from ~45 to ~12–15 min.
  - **Done 2026-09-30 (was P1, approved by the user):** concurrent contract suites overwrote the shared
    `tools/figma-contract/.out/harness.js` (18 of 23 failed on a token change). Each run now builds in its own folder,
    the gate runs 4 suites at a time (`ZEN_QA_SUITES`, 1 under `--serial`), and a token sync takes the fast path without
    `--files`. Log: `session-log-2026-09-30.md`.
- **Done 2026-10-05 (user: "Xử nốt"):** the post-edit hook warns "Shared file: …" when a session edits a file another session's ledger touched in the last 30 min (lib.recentOtherEdits, once per file per half hour); AGENTS.md "Working alongside other sessions" now states file areas, worktrees, one commit place and --isolated. Was: ~~P1 · Session setup.~~ Give each parallel session its own file area, and a worktree when two sessions touch the same
  files. Commit from one place, at agreed stable points. 8 of 32 QA runs on 28/9 failed, most of them because another
  session was mid-edit.
- **Done (checked 2026-10-07, backlog batch 4, 390 shots):** the SSO label fits; "Docked inspector" is a desktop screen example (not shown at 390); "Trailing actions" became "Pending invites" (actions fold into a More menu); the Menu table scrolls sideways to its ⋯ column by design (its description says so) and the Sidebar shells use lists; the Bulk-Action bar is one row of icon buttons. Was: ~~**P2 · Narrow-width example slips** seen in the 390 contact sheets (pre-existing):~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~Templates › Sign in: the SSO button label is cut off.~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~Side Panel › "Docked inspector": the panel is clipped.~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~List Item › "Trailing actions": captions wrap to 4 lines.~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~Tables are cut off in narrow cards: Menu › "Row actions in a table" and the Sidebar shells.~~
  - **Done (checked 2026-10-07, backlog sweep: see the batch 4 line above; side-panel, list-item, menu, sidebar and popover audit clean at 390):** ~~Popover › "Selection toolbar (Bulk-Action)": at 390 the Delete action wraps to a second row (seen 2026-09-29).~~
- **Done (checked 2026-10-07, backlog sweep: every item below is closed):** ~~**P2 · Audit warnings kept as debt:**~~
  - **Done (checked 2026-10-07, backlog batch 4: the Brand colour example is gone; color-selector and dialog audit clean):** ~~Color Selector › "Brand colour" preview text on the White swatch 2.59:1; Dialog › "Form · Half-Half" field title
    styled Heading/4 but not a heading (rhythm) — both seen 2026-09-30, pre-existing.~~
  - **Done (checked 2026-10-07, backlog sweep: no contrast finding on list-item, sidebar, bottom-sheet and top-navigation at 1512/390, light and dark; the Avatar solid colours are kept by the user's decision):** ~~Avatar initials contrast of 2.7–2.9:1 (List Item "BN" / "CT", Sidebar workspace "A", Bottom Sheet share/people~~
    avatars "DP", "DT", "HC", "RN", "PP" in light and dark, and the same people in the Top Navigation playground
    list; seen 2026-09-30).
  - **Done 2026-10-05 (see the P3 target item above).** ~~Small targets:~~ Chat reaction pills (15px tall), the Chip mobile filter row (20px), TopNavigation control-bar
    Segmented (20px; also Segmented › "Fits a phone" — Medium is already the largest size, the phone frame is scaled), the Input label tooltip button at 390 (12×12, `.zen-input-label__tooltip`; seen 2026-09-30), Bottom
    Sheet "Share sheet" / "Long content" buttons at 390 (20px tall in the scaled phone frame).
- **Done (checked 2026-10-07, backlog sweep: the coverage matrix finds every category on these pages (examples/pages)):** ~~**P2 · Example coverage gaps**~~ (qa step ④):
  - **Done (checked 2026-10-07, backlog sweep: Projects flyout long, Handbook many):** ~~sidebar: edge cases.~~
  - **Done (checked 2026-10-07, backlog sweep: Settings sections, Mobile receipt):** ~~divider: states, edge cases, mobile.~~
  - **Done (checked 2026-10-07, backlog sweep: popover "Sort on a phone", dialog "Withdraw on a phone"; side-panel has no phone example by design):** ~~side-panel, popover, dialog: mobile.~~
  - **Done (checked 2026-10-07, backlog sweep: list-item "Settings on a phone"; tooltip has no phone example on purpose):** ~~tooltip, list-item: states, mobile.~~
  - **Done (checked 2026-10-07, backlog sweep: "Reading list" empty state):** ~~link: states.~~
  - **Done (checked 2026-10-07, backlog sweep: skeleton, error and empty states, minColumnWidth, "Choose on a phone"):** ~~card: states, edge cases, mobile.~~
  - **Done (checked 2026-10-07, backlog sweep: aria-labelledby in "Unsaved changes" and "Running total"):** ~~action-bar: keyboard / a11y (seen 2026-09-30).~~
  - **Duplicate (checked 2026-10-07, backlog sweep: same as the link line above):** ~~link: states (seen 2026-09-30).~~
  - **Done (checked 2026-10-07, backlog sweep: page-header pending, empty, long title and phone; app-shell empty states):** ~~page-header: states, edge cases, mobile; app-shell: states (seen 2026-09-30).~~
  - **Done (checked 2026-10-07, backlog sweep: "Icon-only columns (narrow)", "Unread counts on a phone"):** ~~visually-hidden: edge cases, mobile (item 16 of the user's 2026-09-30 review list re-checks these examples).~~
- **Done, verified 2026-10-05:** ExampleCard's ZenProvider inherits the docs breakpoint (no `breakpoint` prop; PageHeader examples reorder at 390). ~~P2 · Example cards pin `breakpoint="desktop"`~~ (`PlatformShowcases.tsx` example card ZenProvider): responsive Grid
  columns never change in examples at 390. Layout wraps its responsive examples in `ZenProvider breakpoint="auto"`,
  Metric uses intrinsic `auto-fit` tracks / a container query. Decide at platform level (user/designer decision).
- ~~**P3 · Top Navigation scrollRef adoption:**~~ **closed 2026-10-07 (backlog cleanup):** done: Master screen · phone uses `scrollRef` + `headerOverlay screenRef` (PlatformTypographyHierarchy.tsx). Was: Typography › "Master screen · phone" (`PlatformTypographyHierarchy.tsx`
  ~161) still sets `collapsed` from an onScroll > 24 threshold; move it to `scrollRef` + `headerOverlay screenRef`.
- **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6):** the appLayer cycle was already gone; the one cycle left in src/platform (PlatformExamples ↔ PlatformMobilePlaygrounds) is broken — PlaygroundSlot moved to appLayer/playgroundParts.tsx (re-exported), MobilePlaygrounds imports the leaf; a Tarjan scan of src/platform (static + eager glob) finds no cycles. Was: ~~P2 · appLayer import cycle:~~ `appLayer/shared.tsx` ↔ `PlatformExamples` / `PlatformTemplate`. It can throw
  "Cannot access 'option' before initialization" under HMR. Move `option` and `Panel` into a leaf module (Open items
  has the detail).
- **Duplicate (checked 2026-10-07, backlog sweep: the same four items as the "Figma vs code differences seen during the style-guard burn-down" list under Open items, which stays open for the designer):** ~~**P2 · Figma vs code differences found during the style-guard burn-down**~~ (Open items: Slider thumb shadows, Chart
  bar corners, Bottom Navigation icon size, the phone home indicator). Fix them once the designer confirms the
  behaviour.
- **P3 · Package weight:** every app loads the whole 63 KB gz stylesheet. Consider per-component CSS entry points.
- **Done 2026-10-05:** see `zen-ds audit` (P1 above). ~~P3 · A rendered-page check for apps~~ (a blocker from the final blind trial, score 8.5).
- **P3 · Official Inter WOFF2** (with the glyf transform, about 10% smaller than today's conversion): needs the user's
  approval to download it. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** use the official Inter WOFF2 → batch 7.
- **P3 · `-shadow-off` leaks into nested component themes** (found 2026-09-29, token update): companions are emitted
  only in the modes whose fill is tinted, so a Neutral-S4 scope inside a Neutral-S3 scope inherits S3's `0 0 #0000`
  and its selected chip loses the Figma shadow. Nothing in the repo nests component themes, but `ZenProvider` allows
  it. Fix idea: `scripts/build-tokens.mjs` emits `<token>-shadow-off: initial` in the other modes.
- **P3 · Input family contracts predate the new small radius:** `docs/figma-contracts/input-search*.json` and
  `datepicker-sidebar.json` were captured when `Corner-Radius/Input/Small` was 8 / 8 / 4 / 2. No suite checks them
  yet; re-capture before building the Input suites. (2026-09-29: the DatePicker Action entry and the two
  Select-Month-Year variants are refreshed; see the DatePicker block below.)
- **Closed (2026-10-07, user decision in backlog batch 8: recorded as out of scope (demo modes)):** ~~**P3 · Live modes that the repo does not have:**~~ Typography Configuration `Ecom-Demo` (and `Zen-Platform`, kept in
  platform.css), Base Colors (Project) `Chat`, `VT`, `Ecom-Demo`. Global Dimensions' only mode is now named `Zen`
  (repo: `Mode 1`, no effect on CSS).
- **Done (checked 2026-10-07, backlog sweep: badge.css:64, :70 pad the Small/Medium counter text with Spacing/Padding/3XSmall; the missing Badge suite is item (3) of the Sky/Mint/Bronze/Golden follow-ups):** ~~**P3 · Badge-Counter parity:**~~ the 2026-09-29 Chip/Trailing capture shows the Small badge's Text-Wrapper with
  Spacing/Padding/3XSmall side padding. There is no Badge contract suite yet to check the component.
- **Done 2026-10-02 · Audit tools** (user-approved): targets use the layout size and edges divide by the frame's
  scale (`audit.mjs`), so a 32px control in a 0.63 phone counts as 32px (chat@390: 3 targets → 0); the density
  snapshot skips `[inert]` content (collapsed Accordion panels); `behaviour.mjs` presses Escape again when the first one
  closed a popup inside the dialog; `shoot.mjs --timeout= --wait-until=` for a busy machine.
- **Done 2026-10-02 · DateField a11y:** the inputs session made the field an APG Date Picker Combobox (role=combobox,
  aria-haspopup="dialog", aria-expanded). `behaviour.mjs` comboFlow now checks that pattern: ArrowDown opens the
  calendar dialog, focus moves into it, and Escape closes it and returns focus to the field.
- **RESOLVED 2026-10-02 (user: "Tôi sửa luôn"; settings chips moved to a non-sticky row below 1024px) · P2 · Docs topbar at 390 covers popovers (found 2026-10-02):** the uncommitted topbar change (settings chips wrap
  instead of scrolling, CHANGELOG "Docs topbar settings chips work again below 1024px") makes the sticky topbar
  216px tall at 390. `audit.mjs --pages=popover --viewports=390 --smoke` reports "Create a label #0: layer
  official-topbar__controls paints over the open popover" in every run. Its session ("Zen Plugin Neutral color
  contrast") has ended.
- **Closed (2026-10-07, user decision in backlog batch 8: the docs shell gaps and raw values stay as accepted exceptions):** ~~**P3 · Docs chrome off the spacing ladder (found 2026-10-02, needs a decision, tier L):**~~ the docs shell's own
  layout in `platform.css` keeps gaps outside the ladder. The ladder pass covered templates, the app layer and
  playgrounds only.
  - **Closed (2026-10-07, user decision in backlog batch 8: accepted with the parent):** ~~Off-ladder gaps: `.official-page` and `.official-overview__content` giant 64; `.official-intro`,~~
    `.platform-page-template__body` and `.platform-component-sections` 3xl 48; `.pg` 2xl 40; topbar breadcrumbs and
    `.pg-refs` 3xs 2.
  - **Closed (2026-10-07, user decision in backlog batch 8: accepted with the parent):** ~~Raw values: `.official-cover__body` / `.platform-page-hero__main` 30px; `.platform-phone__levels` 7px (device chrome).~~
  - Every page renders these, so `npm run qa -- --all` is needed.
- **From the app-layer examples rebuild (2026-10-02, session "Add audit check…"): shared or component items, nothing
  fixed here.**
  - **Done 2026-10-02 · Full screen on `screen: true` examples:** the focus raise rule in `platform.css` is now
    `.pe-card:not([data-fullscreen="true"]):is(:focus-within, …)` (fixed by "Disable input…").
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6):** on `data-breakpoint="mobile"` the title row is display: contents and the order is title, description, actions (12px under it), tabs (custom properties in page-header.css; test). Docs phone previews still resolve desktop (P1 "Docs phones resolve desktop tokens"). Was: ~~P2 · PageHeader on phones:~~ when the actions wrap they land between the title and the description, so the one
    line that explains the title sits under the buttons (`page-header.css` 2–10). Move the description into the
    titles column or order it before the actions under the mobile breakpoint.
  - **Closed 2026-10-05 (user: "WCAG đã lỗi thời…" — keep the light border; no token change).** **Checked 2026-10-05 (backlog batch 6): code = Figma** — Checkbox/Mark and Radio-Button/Radio-Mark Default · Select=No both stroke `Checkbox/Border/Default` (#0101011D) in the captures; reaching 3:1 is a token change in Figma (designer's call, asked). **P2 · Checkbox / RadioButton unchecked outline** measures rgba(1,1,1,0.114), about 1.3:1 on white (WCAG 1.4.11
    asks 3:1 for the control boundary). Check the Figma token first.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** `DialogAction` takes `type` + `form` (SidePanel and Dialog actions; Enter in a field submits; test in input-popups). Was: ~~P2 · SidePanel `primaryAction`~~ cannot be `type="submit"` / `form` (ActionBar can), so a form in a panel calls
    `requestSubmit()` from onClick and Enter in a field does not submit.
  - **P3 · AppShell aside** assumes 440px (SIDE_PANEL_DEFAULT_WIDTH) before an aside has docked once and ignores
    SidePanel size="small" (360), so a small panel that would fit opens as an overlay.
  - **P3 · Audit `edges`** counts the focus outline of a programmatically focused `tabIndex={-1}` heading as a frame
    and reports its text as flush (`tools/platform-audit/audit.mjs`).
  - **P3 · Dead app-layer example code:** the old examples of the 12 rebuilt pages in `src/platform/appLayer/*.tsx`
    (layout, content, navigation, form, shell, shellScreens, text, panels) no longer render; the playgrounds there do.
  - **Done 2026-10-02 · Brief §3b** now says example cards inherit the docs breakpoint.
  - **P3 · Component nits seen in the second fix round:**
    - PageHeader `headingLevel={2}` renders Heading/2 (25px) next to the 28px h1; the house ladder says h2 = Heading/4. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** PageHeader h2 uses Heading/4 (house ladder) → batch 6.
    - EmptyState inside a Card is lopsided: no top padding, 48px at the bottom (`empty-state.css:10`).
    - FormActions in a narrow card (~424px) stack full width, and a dirty-only "Undo changes" makes the card grow. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** FormActions stack by container width (< 480px) → batch 6.
    - The read-only TextArea still draws its resize grip.
    - Table has no selected-row cue (aria-current / Selected fill) for the row whose detail is open in a docked panel.
    - Inline DescriptionList amounts drop under their terms at 390.
- **Done (checked 2026-10-07, backlog sweep: ListItem `inset` is deprecated and the container insets the rows (ListItem.tsx:13-16); chip.tsx:271-276 pads its Box paddingX lg):** ~~**P3 · Phone List inset:**~~ Chip "Mobile filter row" and Button "Mobile footer CTA" keep List at its default inset
  (Margin/Comfortable 24px) while the rest of the screen sits on Margin/Compact (20px), so rows start 4px right of the
  chips and the Back chevron. `List inset="compact"` lines them up (as in the new Segmented phone example).
- ~~**Blocked:**~~ **closed 2026-10-07 (backlog cleanup):** same blocker as the Code Connect for Description List line. Was: Code Connect needs a Figma Organization or Enterprise plan.
- **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** DateField writes the pick in DatePicker `onApply` when `datePickerActions` (Cancel/Escape keep the date; the zen-allow-date-apply exception is gone; test in input-popups). Was: ~~P2 · DateField `datePickerActions` commits on pick:~~ `handleDateChange` (onValueChange) writes the field and closes
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
  - **Done (checked 2026-10-07, backlog sweep: app-shell@390 audits clean, fit 0):** ~~App Shell at 390: the desktop examples keep the sidebar open (the card sets `breakpoint="desktop"`), so `main` is~~
    16px wide and the PageHeader title breaks one letter per line.
  - **Done (checked 2026-10-07, backlog batch 4: the file name is part of the caption now):** ~~Templates page list at 390: the trailing file name leaves the caption column ~63px wide.~~
  - **Done (checked 2026-10-07, backlog batch 4: both examples were reworked, "Handbook with chapters" and "Pending invites" read in full at 390):** ~~Captions narrower than one word: Sidebar "Flat · knowledge base" (390) and List Item "Trailing actions" (390,
    Comfortable).~~
  - **Done (checked 2026-10-07, backlog sweep: the month label is 127.7px in the 128px button; density fit is clean at 1512 and 390):** ~~DatePicker at Comfortable (1512 and 390): "September 2026" fills the month button's padding.~~
- **P3 · `fit` follow-ups** for its owner "Quy trình kiểm tra Component build" (offline while it was built): review
  `textFit` and the new `audit.mjs` flags `--baseline-update=<kinds>` and `--css=<file>`. Still unchecked: a control
  that fits its own text but is cut off by an `overflow: hidden` ancestor or covered by a sibling. Examples: a
  Segmented with `flex-shrink: 0` in a clipping container would hide its last items, and at 390 the Side Panel ›
  "Docked inspector" card sits under the panel. `overflow` skips these as clipped, and `fit` does not see them.
- **From the Figma parity update of 2026-09-29** (session log, "Figma parity update"). The designer questions from
  the same run are under Open items.
  - **Actions column done 2026-10-05 (user: "dùng 40"):** the 5 `TableActions` IconButtons that forced `size="sm"` are md (40px, Figma Actions-Cell Button/Icon-Flat Medium); Progress cell done 2026-10-07 (backlog batch 4: Neutral with its % label, the code sample too). ~~**P2 · Platform Table example vs Figma:** the Actions column uses IconButton sm (32px, 16px icons), while Figma
    Actions-Cell 1603:14291 is Button/Icon-Flat Medium (40px). The Progress column uses `theme="accent"` with no
    label; Figma Progress-Cell 4081:19726 is Theme=Neutral with its label. `PlatformExamples.tsx:2055–2080`.~~
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
      (Apple Color Emoji is 20px wide at 16px; `chat.css:99`, needs a design call). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the one-emoji pill stays 28×24 (accepted, closed).
    - Segmented: `:focus-visible` on a selected item replaces its Shadow/Action/Basic (`segmented.css:15–16`).
    - Table: `TableMedia` defaults to `bold = true` while every Figma media cell defaults to Bold=No (behaviour
      change, needs a decision); Photo-Cell radius (XSmall at 24px, Small at 32px) has no API or harness check;
      the text editor adds Effect/Popover over a Neutral/Pale fill when it grows (house-rule exception?); a duplicate
      `gap` in the select-editor rule (`table.css:85`). **Sweep 2026-10-07:** done: the duplicate `gap` is gone (table.css:104). Still open: Photo-Cell radius; decisions: TableMedia `bold` default, the text editor popover lift. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** TableMedia defaults to `bold=false` like Figma (CHANGELOG: behaviour change) → batch 6; the text editor lift is an accepted exception (closed).
    - Breadcrumbs: the Sub plate's bleed covers the first 4px of the chevron's hit area. (The 28px height is fixed:
      20px as in Figma since 2026-09-29.)
    - Toggle: the platform showcases still pass the deprecated `selected` / `onSelectedChange`
      (`PlatformShowcases.tsx:557–559`); its JSDoc does not cite the node ids; Figma renamed the Caption prop to
      Subtext (a `subtext` alias would be new API). **Sweep 2026-10-07:** done: Figma has no Subtext property to rename (component-properties.json, 2026-10-07). Still open: the deprecated props in the showcases and the JSDoc node ids.

- **From the App Shell rework of 2026-09-29** (session "App Shell kiểm tra lại"; session log 2026-09-29, "App Shell"):
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 2):** both Sidebar roots are `<nav>` now (same class, data-* and aria-label). Was: ~~P1 · Sidebar landmark:~~ Sidebar renders `<aside aria-label="Main navigation">` (a complementary landmark), so an
    AppShell page has no navigation landmark (`Sidebar.tsx:380, 399`). Make it `<nav>`. The user deferred Sidebar edits
    on 2026-09-29.
  - **P2 · Sidebar reads the shell:** AppShell passes the rail state and the drawer's expanded state to a direct
    `<Sidebar>` with `cloneElement`. A wrapped Sidebar needs `useAppShell()` by hand. Letting Sidebar read an AppShell
    context would cover both.
  - **P2 · Rail group dividers:** the HR-Platform rail puts a Divider between groups. The collapsed Sidebar only hides
    section titles, so its groups run together.
  - **P3 · Sidebar headers from HR-Platform:** a workspace/account switcher header (square Avatar, name, email,
    chevron-selector) and a drill-in module header (Back chevron + Heading/4 "Time Off").
  - **Closed (2026-10-07, user decision in backlog batch 8: no rail shortcut, ⌘B is enough):** ~~**P3 · Keyboard shortcut for the rail toggle:**~~ Atlassian has an opt-in Ctrl+[ and Apple HIG asks for one. Needs a
    decision (it must not clash with ⌘B / Ctrl+B bold in editors).
  - **P3 · Notification-Dot as one primitive** (Figma 4116:21789): Sidebar items, TopNavigation actions and
    AppShellAction each draw their own dot today.
  - **P3 · Harness for dead top-bar actions:** `icon-button/needs-action` and `interaction/action-without-handler` do
    not look at AppShellAction or AppShellAccount yet.
  - **P3 · Aside in a narrow preview:** a SidePanel in `aside` becomes SidePanel's own portalled modal, so in a docs
    preview frame it covers the page rather than the frame. The drawer stays in the frame. **Sweep 2026-10-07:** also in the 1512 card: 1180 − 240 sidebar − 440 panel leaves 500px, under the 744px a docked panel needs (was the "Docs frames" SidePanel line).
  - **From the UX review of the same session:**
    - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 3):** `figmaSidebarBrand.logo` is an inline SVG in currentColor built from the asset's own paths (dark Sidebar: #FDFDFD on #1C1C1C). Was: ~~P2 · The platform wordmark is invisible in dark mode:~~ `figmaSidebarBrand` in `PlatformSidebarBrand.tsx` draws
      the Zen logo as an `<img>` with a hard-coded #111. It sits on the dark Sidebar in every Sidebar and App Shell
      example. Use an inline SVG in currentColor.
    - **P3 · Rail counters:** a collapsed Sidebar hides an item's counter ("Approvals 3") without showing a Dot. This is
      a Sidebar change.
    - ~~**P3 · PageHeader when its actions wrap:**~~ **closed 2026-10-07 (backlog cleanup):** done 2026-10-05 (backlog batch 6): on the mobile breakpoint the order is title, description, actions. Was: the order becomes title → buttons → description, so the description is
      split from its title. Example cards force `breakpoint="desktop"`, so at 390 they never show the mobile order
      (Primary first).
    - **Done (checked 2026-10-07, backlog sweep: the title sits in the ListBox header (DashboardTemplate.tsx:603-606)):** ~~**P3 · Dashboard template:**~~ the "Recent activity" title sits outside its card while "Revenue"'s sits inside, so
      the two columns start at different heights.
    - **Done (checked 2026-10-07, backlog sweep: behaviour.mjs waits for running transitions (l.58-66, :1122) and pointAt lets them finish (l.405-411); no templates@1512 baseline entries are left):** ~~**P3 · Behaviour probe clicks during a layout transition:**~~ the probe clicks the next control about 25ms after
      the previous one. After "Collapse sidebar" the page is still sliding (Sidebar width transition, 160ms), so the
      first Breadcrumb is missed and reported as a dead click. Reproduced: it works after 400ms. This gives 2 ⚠ on
      templates@1512 (Admin list "Home", Detail "Invoices"). Fix in `behaviour.mjs`: wait for running transitions
      before `pointAt`. Owner: "Quy trình kiểm tra Component build".
    - **Done (checked 2026-10-07, backlog sweep: app-shell has "Banner above the shell" and "No people match"; page-header has First use, Long title and List page phone; the coverage matrix finds all four categories):** ~~**P3 · Example coverage (qa step ④):**~~ `app-shell` has no "states" example (a loading shell, an offline
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
    (510:36577); `DatePickerItem event` draws one Accent/Light dot. **Sweep 2026-10-07:** done: `DatePickerTimePicker` (460:38628, DatePicker.tsx:507-509) and the mobile picker (`device="mobile"`, date-picker.css:95). Still open: Event-List with 1–4 dots.
  - **P3 · DatePicker sizes in px:** day cells (32 / 24) and the 224px panel are px, while Figma binds
    Select-Item/Size/Medium | Small (40 / 32 in Comfortable), so the calendar does not grow with density.

- **From the Zen Plugin Neutral 9→10 fix of 2026-09-29** (plugin repo `zen-ds-figma-plugin-main`, session "Zen Plugin
  Neutral color contrast"; the user chose to move Dark step 9, `NEUTRAL_STEP_9_10_CONTRAST = 1.16` in `src/ui/main.js`):
  - **Done 2026-09-29 (was P1): synced from the user's second `Global Colors.json`, gate PASS.** Apply the new Dark
    Neutral step 9, then sync tokens: Dark/Gray/9 goes #656565 (3.29:1) → #929292
    (6.16:1), Dark 9→10 now 1.16:1 like Light. Run the plugin's Check → Update in the live file, then
    `skills/zen-token-sync`. Consumers: `Color/Background|Border/Support/Neutral/Solid` (Dark) and
    `Color/Content/On-Black-Overlay/Light` (Dark/Neutral-Alpha/9).
  - ~~**P2 · Light Neutral step 10 follows the raw input lightness, not step 9**~~ **closed 2026-10-07 (backlog cleanup):** decided 2026-09-29: the user keeps Light as is. Was: (`L10_nl = L9 - 0.032`): Color Generator
    palettes get Light 9→10 anywhere from 1.08 to 1.98:1 (Slate hsl(220,10,50): 1.47; Gray at 70% makes step 10
    lighter than step 9), and Check regenerates another step 10 from the saved step 9 (Gray #828282 vs #838383).
    **Decided 2026-09-29: the user keeps Light as is, no change.** Check's ±1-per-channel tolerance treats #828282
    and #838383 as equal, so Gray is not flagged; the drift only affects new tinted palettes made in the Generator.
  - **Closed (2026-10-07, user decision in backlog batch 8: it belongs to the plugin repo's own session):** ~~**P2 · Plugin build drops the bundled component packages:**~~ `src/components/*.json` (Button_Main,
    Button_Icon-Main, Nav-Action_Main, Nav-Action_Icon-Main) were removed at 15:06, after the 15:00 build, so
    `npm run build` now writes a 0.5 MB `dist/code.js` without them. This session kept the rebuilt `dist/ui.html` and
    restored `dist/code.js` byte for byte, so the unbuilt 15:15 `code.js` change (check progress messages) is not in
    dist yet. Decide whether the packages come back before the next build.
- **From the Zen Plugin dark-alpha fix of 2026-09-29** (plugin `generateAlphaScale`; the user approved "all dark alphas";
  backup `backups/zen-ds-before-dark-alpha-overlay-20260929-182719.tar.gz`):
  - **Done, verified 2026-10-05:** the 2026-10-03 Global Colors sync carries them (dark alphas are lightening overlays, e.g. `--zen-dark-yellow-alpha-3: #FF7C0024`, `--zen-dark-orange-alpha-3: #FF5C002A`). ~~P1 · Apply the new dark alphas, then sync tokens:~~ dark alphas are now lightening overlays, so steps that were
    87–96% opaque become translucent: Yellow/Orange/Golden 2–7 (step 3: #2E1D00F5 → #FF81001F, #371900EE → #FF500027,
    #2C1E00F5 → #FF91001D; on Surface-Default 1.07 → 1.20–1.22:1), Mint 2–7, Cyan/Sky/Teal 5–7, Blue/Grass 6–7,
    Tomato 7, and step 1 of every accent (unused). Solids, Light alphas and real Neutral palettes are unchanged. Run
    the plugin's Check → Update in the live file, then `skills/zen-token-sync`. Consumers: the Subtle/Flat
    background and Subtle border tokens of Warning (Yellow), Info (Blue), Positive (Grass), Negative (Tomato) and the
    Support colours.
- **Done, verified 2026-10-05:** `--zen-dark-gray-1: #121212` in tokens.css (the 2026-10-03 sync). ~~P1 · Zen Plugin Neutral Dark step 1 = 7% HSL (2026-09-29):~~ `NEUTRAL_DARK_STEP_1_LIGHTNESS` 6 → 7, so Dark/Gray/1
  #0F0F0F → #121212 and every Neutral Dark step is re-solved against it (Gray/2 #1D1D1D, /9 #939393, /12 #FDFDFD);
  accent darks and alphas follow the new canvas. Run the plugin's Check → Update, then `skills/zen-token-sync`.
  Backup `backups/zen-ds-before-neutral-dark-l7-20260929-191010.tar.gz`.
- **From the examples rebuild (2026-09-30/10-01) — RESOLVED 2026-10-02 (user: "cứ xử lý hết"; CHANGELOG "Approved backlog fixes"). Kept on purpose: the Content/Placeholder colour (Figma token; Zen fields always have a visible label) and the Avatar solid colours (Figma; harness warns instead):**
  - **Done (checked 2026-10-07, backlog sweep: ExampleCard no longer forces a breakpoint (PlatformShowcases.tsx:38-43); the comment at appLayer/layout.tsx:156 is stale):** ~~**P2 · Example cards force `breakpoint="desktop"`**~~ (ExampleCard's ZenProvider in `PlatformShowcases.tsx`), so
    `Grid columns={{ mobile, desktop }}` never collapses at 390; builders used `minColumnWidth` + clamp instead. The
    Search guideline's toolbar pattern (`columns={{ mobile: 1, desktop: "minmax(0, 320px) 1fr" }}`) fails there too.
  - **Closed (user, 2026-10-05: keep as is).** ~~P2 · Avatar solid contrast:~~ white initials on green 2.93, teal 2.70, orange 2.73, cyan 2.60 (yellow uses its
    own text) fall under 3:1 (`avatar.css` on-colors on support-*-solid). The examples' people avoid these themes.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4), all already fixed in code (Avatar names initials from alt, Badge remove "Remove <label>", Search filterHasPopup/filterExpanded, icon-only Segmented tooltip):** ~~P2 · Avatar initials have no accessible name~~ (alt is ignored without src), so AvatarStack initials read as
    "KB". **Badge remove** is always named "Remove" (guideline: "Remove <label>"; Tag uses `t.removeItem`).
  - **Done (checked 2026-10-07, backlog sweep: Search passes filterHasPopup / filterExpanded and the target is 24×24 (Search.tsx:57-59, :163, search.css:32-33); icon-only Segmented options use useIconTooltip (Segmented.tsx:113-116)):** ~~**P2 · Search filter trailing**~~ does not pass `aria-haspopup` / `aria-expanded`; the filter-icon target is 18×18
    at 390. **Icon-only Segmented options** have no 1s name tooltip (IconButton rule).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 4): day names (full date) and DateField minDate/maxDate were already fixed; Time-Picker fields are now Medium when the DatePicker is `mobile` (new `DatePickerTimePicker` `device`).** ~~P2 · DatePicker:~~ day buttons are named "Day N" (no month/year, ambiguous in the dual calendar); Time-Picker
    inputs are Small even on phones; DateField does not pass `minDate` / `maxDate` to its calendar.
  - **P3 · Pagination:** `resultsRange` prints "of 1284 results" without thousands separators (labels.ts en/vi); the
    guideline's "jump to page" wording and Enter row do not match the Manually theme (a page-size input). **Sweep 2026-10-07:** done: thousands separators through Intl.NumberFormat and an en dash (labels.ts:245-246, :280, :464). Still open: the guideline's "jump to page" wording.
  - **Done (checked 2026-10-07, backlog sweep: link.css:11-14 resets `button.zen-link`; tag.css:26-38 paints aria-pressed; the placeholder colour is kept on purpose (see the RESOLVED line above)):** ~~**P3 · Link `as="button"`**~~ keeps the browser button background and border; a pressed **Tag** (aria-pressed) has
    no visual pressed state; SelectField placeholder "Choose a client" measured 1.92:1 (placeholder token).
  - **Done (checked 2026-10-07, backlog sweep: deliberate and documented (platform.css:832-839, usage rules §16)):** ~~**P3 · platform.css:767**~~ pads and paints any bare List inside an example stage (builders wrap Lists in Card).
- **From the topbar chip fix of 2026-10-01** (session "Zen Plugin Neutral color contrast"; session log 2026-10-01):
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6):** opt-in Chip `popoverPortal` (ZenPortal layer anchored to the chip; light dismiss checks the layer; guideline line; test in tests/interaction/backlog-fixes-2026-10-05.test.tsx). Not the default: a portal inside a Dialog/Bottom Sheet would fight its focus trap and outside click. Was: ~~P2 · Chip menus are clipped in any horizontal scroll box:~~ Chip renders its Popover inline, so a chip row that
    scrolls (the phone chip-row pattern in apps) hides every menu, as the docs topbar did. A portal mode (ZenPortal +
    useAnchoredPosition with the chip as anchor, like ChatReactors) would fix it in the library; it also needs the light
    dismiss and focus return to follow the portalled surface.
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 6), not reproducible:** at 1512 both dialogs take focus inside (the field / the safe Cancel) and give it back to the trigger on close. Was: ~~P2 · Button page dialog focus (QA ✗ at 1512):~~ "Page actions → New task" and "Delete a file → Delete Launch
    plan.pdf": focus does not move into the modal / does not return to the trigger after close. Seen under concurrent
    HMR reloads; re-check before fixing (examples in PlatformShowcases.tsx / appLayer).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 5):** platform.css font-family-sans/button carry system-ui … sans-serif fallbacks. Was: ~~P3 · Platform text flashes in serif while Inter loads:~~ the Zen-Platform block sets `--zen-typography-font-family-*`
    to `"Inter"` with no generic fallback, so chips and body text use the browser's default serif until the font loads.
- **From the UX interaction pass and the Top Navigation research (2026-10-01; session "Component library review và
  fixes"; research §5):**
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 2), already fixed (`Dialog.tsx` useModal returns on `event.defaultPrevented`):** ~~P1 · Escape in a ModalForm closes the whole form~~ (in progress: the user approved the fix on 2026-10-01 in
    session "Disable input và search từ Figma", which owns it). It happens while a SelectField list or a DateField
    calendar is open, and
    what was typed is lost. Cause: `Dialog.tsx` `useModal` (~l.54) ignores `event.defaultPrevented`. Seen in Empty &
    error › New project, and it affects every date form.
  - **P2 · SidePanel `standard`:** a docked panel returns no focus when it closes, and Escape works only with focus
    inside it. In docs full screen, Escape on a row exits full screen and leaves the panel open (`PlatformFullScreen`
    Escape owners).
  - **P2 · AiChatField** always renders "+", the microphone and Start voice mode, even without `onAttach` / `onVoice`,
    so they are dead clicks unless an app passes both handlers. Fix: hide them without a handler, or add a harness rule.
    Home and HrShell now pass both.
  - **Done 2026-10-02 (user: yes) · P2 · Sidebar workspace switcher (APG):** `button.zen-sidebar__workspace-trigger` (aria-haspopup="listbox") opens
    its listbox with Enter but not with ArrowDown or ArrowUp. Seen in the gate on sidebar › Switch workspace,
    2026-10-01; it is a component issue, not that example's.
  - **Done 2026-10-07 (backlog batch 4: PlatformChatHeader takes `scrollRef`; the 5 Messenger threads and the Chat playground pass their screen):** ~~**P2 · G8 PlatformChatHeader** does not pass `scrollRef` on, so the 6 chat phones cannot follow the scroll rule (R1).~~
  - **P3 · G3 harness:** `top-navigation/search-folds-to-action` checks only `collapsed`. A `scrollRef` bar with a
    Search and no `searchAction` passes.
  - **Done 2026-10-02 with G4 · P3 · G5 `largeTitleAction`** could not be reached once the title folded. Figma's folded state shows it in Top-Trailing.
  - **P3 · G7 Figma Top Navigation features without props:**
    - large-title Capline, Subheading and Badges;
    - a bar-title Dropdown;
    - a selection-mode recipe;
    - a hero header that turns opaque on scroll.
  - **P3 · G9 docs:**
    - `example-patterns.md` §2 still puts every phone on `type="compact"` and `.pe-phone-cta`.
    - The guideline's HIG "Navigation bars" link now redirects to "Toolbars".
    - The Bottom Navigation guideline lacks "tapping the current tab scrolls to the top" (R14).
  - **RESOLVED 2026-10-02 · P3 · G10:** the phone examples in `PlatformMobileShowcases.tsx` / `PlatformShowcases.tsx` are overridden by
    `examples/pages` and never render. `ChartReportPanel` is still used.
  - **P3 · Focus after removal and from toasts:** these drop focus to the page:
    - a toast's Undo or View;
    - an emptying Clear;
    - deleting a row;
    - a button that disables after use (Settings Save/Discard, SSO, Pay in full).
    A panel or sheet opened from a toast also loses its opener.
  - **P3 · Phone targets and sizes:**
    - The MetricCard breakdown chevron, the ChartCard open button and Pagination prev/next are 24px on phones.
    - FileUpload's button is 32px and has no size prop.
    - Menu and Chip popovers have no phone (sheet) mode, so templates build their own sheets.
  - **Done (checked 2026-10-07, backlog sweep: Change role focuses the checked radio (Dialog.tsx:61-63, :98-103)):** ~~**P3 · RadioButton**~~ cannot take `data-autofocus`, so Change role focuses the first radio, not the checked one.
  - ~~**P3 · PageHeader**~~ **closed 2026-10-07 (backlog cleanup):** done 2026-10-05 (backlog batch 6): the description sits under the title on phones. Was: on phones puts the Primary button between the title and the description.
  - **P3 · Docs frames:**
    - **Duplicate (checked 2026-10-07, backlog sweep: same as the "Phone templates" toast row, which stays open):** ~~Toasts from phone templates appear in the docs page's stack under the phone.~~
    - **Duplicate (checked 2026-10-07, backlog sweep: same as the "Aside in a narrow preview" row, which stays open):** ~~In the 1512 card, SidePanels open as modals because the frame is too narrow to dock them.~~
    - A portaled ModalForm ignores the phone breakpoint, so date fields stay in 2 columns at 390.
  - **P3 · HR templates:**
    - The Zen AI floating button sits over rows while the page scrolls (AppShell already keeps room for it at the end
      of the page). On phones it covers a row's ⋯ mid-scroll: consider hide-on-scroll. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** on phones the button hides while scrolling down and comes back on scroll up → batch 6.
    - Team budgets still scrolls sideways at 390.
    - The "Who's out" chips wrap onto 2 lines.
    - Delete task cannot be reached on a phone.
- **From the example polish pass + its gate (2026-10-01) — RESOLVED 2026-10-01/02 (components, platform.css, data.ts, audit tools by "Add audit check…"). ~~Still open: useChatDemo Delete has a confirm but no Undo toast yet (partly)~~ Undo done (checked 2026-10-07, backlog sweep: chatDemo.tsx:61-73 deleteWithUndo); every line below is closed:**
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1), already fixed in Input.tsx ("Not a <form>" group, Enter confirms):** ~~P1 · RichTextField renders a `<form>`~~ (insert-link, `Input.tsx` ~l.1419): inside any `<Form>` it is a nested form
    (React error; gate ✗ on Input › Task title and notes). Fix: a `div role="group"` with Enter → confirm.
  - **Done, verified 2026-10-05 (user: "đổi qua token Mobile"):** PlatformPhone sets `data-breakpoint="mobile"`; measured inside a phone Margin/Comfortable 20 and modal padding 20 vs 24 outside. ~~P1 · Docs phones resolve desktop tokens~~ (`PlatformPhone` sets no `data-breakpoint="mobile"`): margins and
    insets differ from a real phone; decision pending (see the Top Navigation rules R10 note in the example brief).
  - **Done (checked 2026-10-07, backlog sweep: short stages top-align (platform.css:487-489); an open control lifts over the next card (:490-493); the bare List paint is the documented stage rule (usage rules §16); the desktop chat stage scrolls sideways by design (:1175-1181)):** ~~**P2 · platform.css:**~~ top-align short example stages that share a row with a taller card or phone (13 pages);
    `.pe-card__stage .zen-list` (l.769) paints a bare List as a borderless Surface; a later card's stage covers an
    open popover of the card above; `.pe-chat-desktop` min-width 560 at ≤620px cuts desktop chats at 390.
  - **Done (checked 2026-10-07, backlog sweep: data.ts:203-249 holds the shared series, plan and leave data):** ~~**P2 · data.ts (examples):**~~ one shared monthly studio series for Metric + Chart (revenue, billable hours), one
    workspace plan (name, price per seat, seats) and one leave dataset, so pages stop carrying page-local copies.
  - **Done (checked 2026-10-07, backlog sweep: Bottom Navigation idle labels are Light by the user's decision; the placeholder colour is kept; the composer and read-only inputs have focus rings (chat.css:143, input.css:325-334); the InlineMessage action is Button sm; Pagination sm is 32px with an en dash; Accordion (accordion.css:34-40, :69-75); ModalForm focusFirstInvalidField; Dialog overlay root; BottomSheet onSubmit; DatePicker `today` and inline; Badge removeLabel; Autocomplete and Form focus; one-row scales (rating.css); Chat labels in sentence case; Business call padding (chat.css:74, :83); ListItem titleLines):** ~~**P2 · Components:**~~ Bottom Navigation idle labels 1.92:1 (Content/Placeholder; design decision); SelectField
    placeholder 1.92:1; ChatComposer textarea and read-only inputs show no focus indicator; InlineMessage action 20px
    tall on phones; Pagination prev/next stay 24px at size sm and the range uses " - " not "–"; Accordion Box theme
    hit area and non-concentric corner; ModalForm does not focus the first invalid field (Form does); Dialog has no
    device-frame (overlay root) mode; BottomSheet has no form/submit; DatePicker `today` prop and an inline mode
    without the popover shadow; Badge remove label; AutocompleteField Create row for an already-selected value and
    Form focus for an Error tag; NpsScale/OpinionScale one-row narrow layout; Chat labels in Title Case
    (labels.ts 394–399) and a ringing Business call's bottom padding; ListItem titles may wrap to 2 lines.
  - **Done 2026-10-02 · Audit tools:** see the Done line under Backlog (phone scale, inert panels, dialog Escape, shoot
    timeout).
  - **Done (checked 2026-10-07, backlog sweep: R14 stays open in the HR templates' Bottom Navigation guideline line; TopNavigation has a `banner` prop (TopNavigation.tsx:107-112)):** ~~**P3 · Guidelines:**~~ Bottom Navigation should state R14 (re-tap scrolls to top); a slot for a Small AlertBanner
    under the TopNavigation (G6).
  - **Done 2026-10-02 (smoke live-rect fix; old check 5/5, new 0/5) · P3 · Intermittent smoke finding:** "templates@390: HR · Home #1: layer zen-list-item__wrapper paints over the
    open popover" from `node tools/platform-audit/audit.mjs --pages=templates --viewports=390 --smoke`.
    - It showed up in about half the runs. Replays of the same click sequence, and a probe copy of the audit, never hit
      it.
    - The popover is absolute, z 1000, with no positioned ancestor, so it is probably state left over from an earlier
      card in the run.
    - The audit owner ("Add audit check…") is aware.
  - **P3 · rhythm "> 7 text styles in one example"** flags full screens and their overlays: App Shell Banner and HR
    workspace, the Detail, HR Home and HR Expense overview templates, and the My expenses / My leaves panels. A real page
    uses 8 styles (h1, h4, Subheading, body regular/medium/bold, small, caption). Exempt `screen: true` examples and
    templates, or raise their limit.
  - **Done (checked 2026-10-07, backlog sweep: every item below is closed):** ~~**P3 · Example coverage gaps flagged by the gate (2026-10-01):**~~
    - **Duplicate (checked 2026-10-07, backlog sweep: same as the action-bar line of the "Example coverage gaps" list above):** ~~action-bar: keyboard / a11y.~~
    - **Done (checked 2026-10-07, backlog sweep: 6 examples; "Icon-only columns" covers the narrow case and "Unique button names" is another edge case):** ~~visually-hidden: edge cases.~~
    - **Done (checked 2026-10-07, backlog sweep: "Long title", "First use" with an empty state, "List page" (actions wrap on a phone)):** ~~page-header: states, edge cases, mobile.~~
    - **Duplicate (checked 2026-10-07, backlog sweep: same as the side-panel line above (no phone example by design)):** ~~side-panel: mobile.~~
    - **Done (checked 2026-10-07, backlog sweep: "Counts that agree" and "Status text" (text.tsx:401, :429)):** ~~text: states.~~
    Add examples only in an approved batch.
- **From the AI-readiness re-evaluation of 2026-10-02** (session "Đánh giá khả năng AI với library hiện tại"; blind trial on
  the packed tarball + memory-vs-repo audit; session log 2026-10-02, "AI-readiness re-evaluation"). Proposal, nothing fixed:
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1):** AGENTS.consumer.md rule 3 + Fields row now say `disabled` (not Autocomplete/RichText); bottom-sheet use/do and the chip phone line now say List + ListItem for a single choice (guidelines rebuilt). The harness idea stays open (new rule needs the user's OK). Was: ~~P1 · Two doc contradictions agents follow literally:~~ AGENTS.consumer.md §3 rule 3 says fields have `readOnly`, not
    `disabled` (Disabled is back since 2026-09-30, g/input:30); g/bottom-sheet "Use Action type with `selectedId` for single
    choice" (+ AGENTS.consumer.md §3.12, g/chip) vs the house rule "pick-one = List + ListItem selected" that the templates
    follow; the trial agent picked the Action sheet. Harness idea `bottom-sheet/choice-uses-list-item`. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the harness rule `bottom-sheet/choice-uses-list-item` is approved → batch 9 (tooling).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 2):** `scripts/build-api.mjs` resolves spreads in `as const` arrays (`dockIconThemes` was the only one), so Metric/MetricCard `iconTheme` and DockIcon `theme` list all 22 members; the `guidelines:check` union comparison stays an idea (a new check needs the user's OK). Was: ~~P1 · Props generator drops union members:~~ `iconTheme` on Metric/MetricCard is documented as neutral · accent ·
    inverse · on-color · pale · surface · emoji; the real `DockIconTheme` also has every hue (green, blue…). Check every
    `(typeof x)[number]` prop in docs/api and make `guidelines:check` compare documented unions with the TS type. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** `guidelines:check` comparing documented unions with the TS type is approved → batch 9 (tooling).
  - **Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1): AGENTS.md step 3 already points at `examples/pages/<page>.tsx`; the dead example code is the separate cleanup.** ~~P1 · AGENTS.md DoD step 3~~ still sends examples to `PlatformShowcases.tsx` (dead since 2026-10-02); delete the dead
    example code (≈6,400 lines) so greps stop landing there. **Sweep 2026-10-07:** the dead example code cleanup is done too (PlatformShowcases.tsx is 118 lines).
  - **Done 2026-10-05 (user: "zen-ds-audit: Làm luôn"):** `npx zen-ds audit <url…> [--routes] [--viewports=1440,390] [--dark] [--out] [--strict] [--wcag-contrast]` (tools/zen-audit/audit.mjs + app-checks.mjs, quality-checks.mjs `regionSel: "body"`; axe-core when installed, its 4.5:1 color-contrast rule opt-in; screenshots + report.md/json; shipped in package `files`; AGENTS.consumer.md §8 and the `zen-ds init` AGENTS section mention it). Not ported: density (Comfortable) and the behaviour probes. Was: ~~P1 · No rendered check for apps (trial blocker since 2026-09-28):~~ `zen-ds` has init/doctor/check only. Port the
    platform audit (axe, overflow, fit, ladder, rhythm, surfaces, outline, 1440/390 light/dark shots) as `zen-ds audit <url>`.
  - **P2 · App checks are weaker than repo checks:** CSS rules run only with `zen-usage --css` (init/ACM say plain
    `zen-usage`); `interaction/action-without-handler` is repo-only; `mobile/full-size-controls` keys on PlatformPhone.
  - **P2 · Missing app patterns (trial):** switch row (ListItem + Toggle), inset-grouped List section (needed an inline
    `--zen-list-inset`), single-choice Chip group with radio semantics, profile header, Metric trend formatter, a phone
    settings template. New components/templates need the user's OK. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** approved now: a switch row (ListItem + Toggle) and a single-choice Chip group with radio semantics → batch 6; the profile header, trend formatter and phone settings template wait.
  - **P2 · Vietnamese:** `plural()` is English-only; `copy/plural-count` cuts words at the first non-ASCII letter
    ("phiên" → "phi") and fires under `locale="vi"`.
  - **P2 · MCP answers too big:** `get_component` 8–15 KB with Figma ids and repo notes, `get_template` 39 KB; 5 guideline
    lines cite `component-usage-rules.md §n`, which the package does not ship. Add a brief mode; drop repo-only notes.
  - **P2 · Contrast in light mode (designer decision):** Content/Neutral/Tertiary #828282 on white 3.84:1 (ListItem and
    Table captions, chart axis), Table header 3.78:1, tonal destructive Button 3.8:1; every app inherits them (axe AA). **Sweep 2026-10-07:** the Tabs inactive label, Light kickers and Table headers (3.74–3.79:1) and the Danger button text (3.74:1) from the Studio polish list are the same question.
  - **P2 · Memory-only rules → repo:** token-sync gotchas (skills/zen-token-sync points to private memory), playground empty
    slots, backup naming on APFS; 15 more rules are documented but unchecked (elevation follows Sidebar, grouped lists,
    table without container, phone Chips not Segmented…).
  - **P2 · Distribution:** `private: true`, 22 local commits not pushed, CI never ran; apps outside this Mac cannot install. **Sweep 2026-10-07:** done: the branch is pushed and CI runs (its Package failure is the CI row at the top of the Backlog). Still open: `private: true` (a decision: publish, and where).
  - **P3 · Figma:** search_design_system sees 7 Zen libraries with the same names (Official-Sep2026, Kate, Starnest, Paid,
    Pokeslide, Archived, Glea); document `includeLibraryKeys` for the official key or archive the forks; published assets
    date from 2026-09-10. Stale counts in HANDOFF (49 slugs / 154 rules; now 62 / 157); `zen-usage --help` runs the check. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (a) document the official library key (`includeLibraryKeys`) → batch 7; archiving the forks is the designer's step.
- **Closed (checked 2026-10-07, backlog sweep: the placeholder colour is kept on purpose; the label tooltip has a 24px hit area (input.css:481-483); "Activity, new" is the probe-order artifact; "Copy value" and "Retry" have 0 findings in the 2026-10-07 behaviour run):** ~~P3 (2026-10-03, gate .qa/reports/2026-10-02T18-13-34-74c53b07.md, found by "Component Size tokens and corner radius", not from its change): new ⚠ outside ai-chat — Select placeholder contrast 1.92:1 ("Choose a reviewer/slot" top-navigation@1512/390, "Choose a client" input@1512/390); input@390 `button.zen-input-label__tooltip` 12×12 target; dead clicks: app-shell "Activity, new", inline-message "Copy value", uploader "Retry desert-trail-lookbook.jpg".~~
- P3 (2026-10-03, session "Component Theme tokens update"): re-capture the Input/Search contracts. `figma-kit status` on
  Field-Only, Text-Area, Search/Popover, Search/Default, Autocomplete-Field and Text-Field: 152 variants differ. Real
  rebindings: Focused/Typing → `Input/Border/Focus` / `Input/Border/Popover-Search` (code follows), Search/Popover Hover
  1 → 2px (code follows), Disabled → `Input/Border/Disabled`, `.Primitives/Input/Text-Area` fill/stroke now
  Input/Background/Default + Input/Border/Default. The rest are stale token values (Corner-Radius/Input/Small 8 → 12,
  Caption 10 → 11, XLarge tracking). No suite maps these strokes; use `tools/figma-kit` fetch + patch.
- P3 (same session, needs a user decision): `.zen-chat-composer__field` copies the Input focus ring with
  Color/Focus/Neutral/Solid (`chat.css:142`, guideline "standard Input focus ring"); switch it to `--zen-input-border-focus`
  so Neutral-S7 matches Input? (2026-10-03 evening: `Input/Border/Focus` is now Color/Focus/Neutral/Solid in all nine
  modes, so both already render the same; only the binding name differs.) **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the composer binds `--zen-input-border-focus` → batch 6.
- P3 (same session, for the designer): ~~Neutral-S7 focus is faint by design~~ — resolved 2026-10-03 evening: the designer
  set `Input/Border/Focus` in Neutral-S7 to Focus/Neutral/Solid (export synced). Still open: `Input/Border/Popover-Search` stores "Focus/Neutral/Solid at
  opacity 0" in S1–S6, which the export writes as `#NANNANNAN`: a plain transparent value would export cleanly. Also
  `.Primitives/Input/Text-Area` Focused has a 2px Focus/Neutral/Subtle outer ring, Field-Only a 3px
  Border/Active/Neutral/Subtle one (code uses the 3px ring on both).
- **Duplicate (checked 2026-10-07, backlog sweep: the Hover binding question is the Search/Popover designer row under Open items; the stale contracts are the re-capture line above):** ~~P3 (2026-10-03 evening, session "Token JSON và Search component", for the designer; user chose to keep the code):~~
  live Field-Only (374:103464) Hover Container stroke is a fixed 2px, no longer bound to Emphasis/Border-Weight/Active/Primary
  (the contracts still bind it). Code keeps the variable (`input.css` Hover rule: Medium 2px, Strong 3px, Light 1px); only
  Strong/Light in the outlined themes (Neutral S4, S6) differ. Ask whether the unbinding was intended. Search/Default and
  Search/Popover contracts are still stale (48 + 18 variants per `figma-kit status`: Small radius 8 → 12 value, Focused/Typing
  → Input/Border/Focus / Popover-Search, Popover Hover 1 → 2px, this Hover binding); see the re-capture line above.
- P3 (2026-10-03 evening, gate .qa/reports/2026-10-03T15-03-53-5b6b7c50.md, not from its token change): new behaviour ⚠
  deadclick chat@1512 "Chats inbox" — `button.zen-list-item__wrapper` "Hana Kim …" click had no visible effect. The
  gate's first run also hit a flaky `tests/scale.test.tsx` Rating xl/xlarge mismatch (star 1 `data-filled`), green alone
  and on the rerun.
  Seen again 2026-10-05 (gate .qa/reports/2026-10-04T18-19-01-8298399d.md, TopNavigation dual action); a manual click
  on Hana Kim opens the thread with its header, so the probe likely races the open (peers' HMR running at the time). Again
  2026-10-05 (.qa/reports/2026-10-04T18-56-56-1c7e4092.md, Chat composer radius, CSS only). **Sweep 2026-10-07:** done: the flaky scale test renders inside `pointerEvents: "none"` (tests/scale.test.tsx:58). Still open: the probe should skip the already-open "Hana Kim" row.
- **Duplicate (checked 2026-10-07, backlog sweep: "Chi Tran" and the 2px gap are the Structural audit warnings row; the HR · Home sibling h2s are the AiChatBlock row):** ~~P3 (2026-10-03, gate .qa/reports/2026-10-03T08-03-04-bd171ca9.md, session "Component Theme tokens update", not from its~~
  change): new ⚠ on example pages — button "Approve on a phone": "Chi Tran" styled Heading/4 but not a heading; button "Hand
  off when ready": Stack gap 2px off the spacing ladder; templates HR · Home: sibling h2 titles in Heading/1 and Heading/4
  (rhythm "8 text styles" on the HR templates is already listed above).
- ~~P3 (2026-10-03, gate .qa/reports/2026-10-03T08-38-12-bd171ca9.md, same session, not from its change):~~ **closed 2026-10-07 (backlog cleanup):** each part is tracked in its own line: Design Tokens dark nav contrast, Card playground slot corners, the chat Audio call dead click, the Templates 90 s budget. Was: design-tokens
  dark: the 11 collection headings measure 1.29:1; card playground Spacing=small: Card corner 16 vs slot 12 + inset 16
  (not concentric; card.css was being edited by "Slot Component phân biệt" during the run); chat "First message" Audio
  call dead click; templates exceeds the 90s behaviour budget.
- P2 (2026-10-03, session "Slot Component phân biệt"): Figma file — set `Bubble-Chat-Others-Business/Background/Default`
  to Color/Background/Surface/Default in all nine Component Theme modes (repo changed at the user's request); the next
  Component Theme sync reverts it otherwise.
- **Done (checked 2026-10-07, batch 5a):** the Effects section and Corner radius (independent corners) were built in `appearance/AppearanceSection.tsx` (E2E AP-01…03); this batch added the spec's Effect settings (the style's layers, read-only) and the read-only theme effect of Card / MetricCard / ChartCard (E2E AP-05, AP-06). The resize "inset" kind stays a question for the resize owner. Was: ~~P2 (same session): Studio Phase 2 UI not built yet — Effects section (session eye), CornerRadiusField (the Position
  section was built 2026-10-04, see below); waits for the inspector owner's ScaleField + `FieldApi.apply` response
  (`docs/research/studio-position-effects-radius-spec-2026-10-03.md` §4, §6 C–E). Also resize.ts: an "inset" kind for
  absolute layers (ask the resize owner).~~
- ~~P2 (2026-10-04, session "Cho phép edit element floating", not from its change):~~ **closed 2026-10-07 (backlog cleanup):** done 2026-10-05 (backlog batch 1): Narrow window › Open navigation opens the drawer. Was: behaviour ✗ on app-shell@1512 "Narrow
  window": "Open navigation" does not open with Enter and its click shows no visible effect (APG + dead click). Already
  in `.qa/reports/2026-10-03T17-00-38-710219c7.md` (00:00, before the AppShell measuring fix); fails every gate that
  includes app-shell. Probably the drawer inside `.px-app-shell-window` (overflow: clip) — needs a look.
- P2 (2026-10-04, session "Cho phép edit element floating"): Studio Position follow-ups — the canvas ConstraintLayer
  is ✅ built (2026-10-05, Studio builder session: `position/ConstraintLayer.tsx`, E2E AP-04); resize handles and
  canvas drag on a floating layer still behave as in flow (drag reorders; v2: drag-to-move snapped to tokens).
- P3 (same session): Ignore auto layout has no Quick action (⌘/) or shortcut yet, and works on one layer (not a
  multi-selection). Offsets stop at Spacing/Padding 4xl (48px), so a layer floated far from every edge jumps (the status
  says so); a larger offset scale or fractions would need the user's decision. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** offsets stay on the ladder up to 4xl (closed); the Quick action and multi-layer parts stay open.
- P3 (same session): Card `theme="shadow"` on an inherited alt surface (page scope `--zen-card-surface`, e.g.
  `.pe-shell[data-canvas="alt"]`) still casts its shadow; only an explicit `surface="alt"` drops it (CSS cannot read the
  inherited var).
- P3 (same session): Studio slots — duplicate then clear the original makes reset treat the original as new (⌘Z works);
  remove + insert of a same-named element in one slot is matched as the same element by "Modified"; menu captions over
  240px ("Required by ChartCard — replace its content instead") need shorter copy; snippet sync for inserts is best
  effort (most hand-written snippets do not contain the inserted element's anchor).
- **Closed (2026-10-07, user decision in backlog batch 8: the Layout self-test step is accepted as it runs):** ~~P3 (same session): `tools/qa/run.mjs` gained the "Layout self-test" static step (user-approved); the gate's maintainer~~
  should review it. AGENTS.md Commands table does not list `npm run layout:selftest` yet.
- P3 (2026-10-03, session "Figma-like editing functionality"): multi-selection follow-ups — arrow keys and dragging move
  one layer only (several: one at a time); Mixed properties cover variants and booleans (not text, number, spacing or
  text style); ⌘D on several selects the first copy only (op many answers one loc); copying layers from two files is
  refused ("one example at a time").
- **Done 2026-10-07 (backlog batch 2: "Metric card · Value and trend in a card"):** ~~P3 (2026-10-03, session "Figma-like editing functionality"):~~ slots/palette.ts has two items labelled "Metric ·
  Value and trend" (ids metric and metric-card); the Assets tab and the slot picker show them as twins — label the
  card one "Metric card".
- **Done 2026-10-05 (Studio builder plan GĐ1, E2E row ST-11):** P3 (2026-10-03, session "Figma-like editing functionality"): Studio menu "Move up/down" (slots/actions.ts runMove) drops
  the selection after the swap: the new loc still shows the sibling until React re-renders and SelectionLayer's
  name check runs before awaitingWriteRender covers it; edit/arrange.ts stepLayer avoids it with expectRender(…, 1500).
- **Done (checked 2026-10-07, backlog sweep: a frame never moves sideways or to another column; only frames below it in the same column shift (board/boardLayout.ts:6-12)):** ~~P3 (2026-10-03, session "Slot Component phân biệt"): Studio board reflows frames (masonry) when a frame's height changes (e.g. Clear contents then Reset slot): example frames jump columns and the selection leaves the viewport; Figma never moves frames on content edits (board/frameLayout.ts, Studio owner).~~
- **Done 2026-10-05 (Studio builder plan GĐ1, E2E row ST-10):** P2 (2026-10-04, session "Giới hạn component trong slot"): removing, clearing or resetting a stateful slot item (Dialog, Tabs, Chip row…) leaves its `const [x, setX] = useState(…)` behind unused; tools/studio/slots.mjs has toastHookRemovals for useToast but no state counterpart (tsc passes, no noUnusedLocals).
- P3 (2026-10-04, same session): ⌘C/⌘V of a stateful item into another file is refused (its state names are not bound there); the clipboard could carry the item's `state` like the Assets path does (edit/clipboard.ts pasteAt).
- P3 (2026-10-04, same session): a stateful item inserted into a `.map` row (Studio "Repeats N×") shares one state across the rows, so every row's Dialog opens together; per-row state needs a row component.
- P3 (2026-10-04, same session): Popover is the one DS component the slot palette does not offer (it needs an anchor `useRef`); stateFor could declare refs the way it declares useState.
- **Studio UX/UI audit (2026-10-04, session "Kiểm tra stack hiện và ẩn toast"; read-only; evidence and fixes in
  `docs/research/studio-ux-audit-2026-10-04.md`). Proposed for approval:**
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row S-02):** P1 · Zoom menu (`86% ▾`, canvas/ZoomControls.tsx) opens below the screen whenever the left panel is docked
    (1280–1920: 0/7 items visible; 1024/390 flip correctly).
  - **Done 2026-10-05 (Studio builder plan GĐ1):** P1 · Studio focus ring Focus/Accent/Solid #ff66d4 is 2.42:1 on the light canvas (SC 1.4.11 needs 3:1); 12 uses in
    src/platform/studio → Focus/Neutral like the components.
  - **Shift+1 part done 2026-10-05 (fits every frame, E2E S-04); first-view part done 2026-10-07 (backlog batch 2: the first view's zoom floor is 50%, `FIRST_VISIT_MIN_ZOOM` in `canvas/viewport.ts`):** ~~P2 · First view~~ clips the Playground under the Inspector (1280: 80px, 1024: 64px; zoom floors at 75%); Shift+1
    "fit all" leaves the Docs frame 213px off-canvas and hides 3/8 frame labels.
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row SE-07):** P2 · Layers search with no match: blank panel + unchanged "158 layers" count (Pages/Assets have EmptyState + Clear).
  - **Done 2026-10-05 (Studio builder plan GĐ1, Popover blur):** P2 · Quick actions (⌘/) palette: rgba(255,255,255,.898) fill with no backdrop blur → canvas text shows through.
  - **Done 2026-10-05 (Studio builder plan GĐ1, E2E row S-07):** P2 · Toolbar at 390: 690px of controls in 374px; Modes, theme, Undo/Redo, Role and Inspector are off-screen.
  - P2 · Two page descriptions on one screen (board ExamplePage description vs Inspector guideline purpose; 45 pages,
    9 with Figma-mapping copy) — content decision. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** keep the board description and drop the second one → batch 5c.
  - P2 · Docs on the canvas render 12–13.7px body at the default 75–86% zoom (1280–1512) — product decision
    (open Docs at 100% or a reading view). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** clicking a Docs frame zooms it to 100%; no separate reading view → batch 5c.
  - P3 · Polish N1–N11 in the report (flat 56-item Pages list with one icon, triple page name, rule notes in the size
    badge, duplicated bound props, double import in Snippet, Shortcuts dialog layout, Modes subtitle, raw layer names,
    ⌘/Ctrl hint, 11px nav labels, 592px of side panels).
  - **Duplicate (checked 2026-10-07, backlog sweep: same as the "Contrast in light mode (designer decision)" row):** ~~Library-wide decisions (not Studio): Tabs inactive label and Light kickers/Table headers at 3.74–3.79:1; Danger~~
    button text 3.74:1 (Negative/Solid + On-Colors).
- P3 (2026-10-04, session "Mở lại port preview", Studio data slots): the Layers panel lists no data-slot items (Figma shows
  the Action instances inside Trailing-Slot) and the canvas draws no outline or + chip for a data slot (SlotLayer knows
  content slots only); the Slots section and the item panel are the way in for now.
- P3 (same session): only TopNavigation is in `slots/dataSlots.ts`; other Figma slots the code takes as data (BottomNavigation
  items, ActionBar actions, Breadcrumbs items…) could join after a Figma SLOT-property check.
- P3 (same session): ⌘-click on a TopNavigation action lands on its IconSvg (the deepest part); the action itself is one
  "Select …" link (or a parent step) away. Decide whether deep select should stop at a data-slot item. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** deep select stops at the data-slot item → batch 5c.
- **Done 2026-10-07 (backlog batch 2: a move past identical items writes nothing and says why, `slots/actions.ts` runDataItem):** ~~P3 (same session): moving one of two identical list items reports "No change" (the texts swap to the same file).~~
- **Done (checked 2026-10-07, backlog sweep: components without hand-made groups fall back to groups generated from `figmaProps.generated.ts`, about 70 components (inspector/componentGroups.ts:5-13)):** ~~P2 (2026-10-05, session "Mở lại port preview"): Figma property groups exist for TopNavigation only~~
  (`src/platform/studio/inspector/propGroups.ts`). Each other component needs its Figma set read (componentPropertyDefinitions
  + which layers each boolean hides) before it gets groups; propose the order (most-used first) to the user.
- **Done 2026-10-07 (backlog batch 2: `removeItem { all: true }` takes every item and the prop, the toast hook with them; items selftest):** ~~P3 (same session): switching a list toggle off (Top-Trailing with 2+ actions) removes the prop, so a useToast() line an
  inserted action brought can stay unused; one item, or an object prop, goes through removeItem and cleans it.~~
- ~~P3 (2026-10-05, session "Studio builder tool planning", E2E):~~ **closed 2026-10-07 (backlog cleanup):** same as (3) of the TopNavigation groups follow-ups line. Was: add harness rows for TopNavigation data-slot items (drag to reorder, drop onto another action to group, Inspector Slots `[data-item-index]` rows, "Group X with Y" / "Take X out of its group"); gestures listed by session "Dual action trên top navigation Figma". Needs a TopNavigation in `tools/studio/e2e/fixtures/host-page.tsx`.
- **Done (checked 2026-10-07, backlog sweep: a cycle scan of src finds no platform import cycle, and no "before initialization" error appears in the 2026-10-06/07 gate reports):** ~~P3 (same session): intermittent HMR error during Studio E2E runs: `[vite] ReferenceError: Cannot access 'appLayerExamples' before initialization` then "Failed to reload /src/platform/PlatformShowcases.tsx" (import cycle PlatformShowcases ↔ appLayer). Not tied to one row (D-03/D-06 pass); the report's "Vite errors" lists it.~~
- P3 (2026-10-07, backlog batch 5a) · A Studio E2E run cut off during D-02 (the gate's time limit) leaves `src/platform/examples/e2e/StudioSaveFixture.tsx` saved with its edit, and the next run fails D-01 ("Unsaved · 1 file": the edit equals the disk). The harness could restore the save fixture from git at start. Pointer: `tools/studio/e2e/run.mjs`, rows D-01/D-02.
- P3 (2026-10-07, backlog batch 5a) · The Studio E2E matrix (147 rows) runs about 15 min; the gate step's limit went from 15 to 25 min after a run was cut off at 900 s. Shard it (groups across two servers) or run a changed-groups subset before it outgrows 25. Pointer: `tools/qa/run.mjs` "Studio E2E", `tools/studio/e2e/run.mjs`.
- **Closed (2026-10-07, user decision in backlog batch 8: the Studio hooks are accepted as they run):** ~~P3 (same session): the QA gate owner should review the Studio hooks in `tools/qa/lib.mjs` (`uiKind` "studio", `auxKind` tools/studio, `pagesForEdit` skips studio) and `tools/qa/run.mjs` ("Studio self-tests" static step, "Studio E2E" runtime step).~~
- **P3 · Studio Tone picker warnings (2026-10-05, "Token màu cho content/chữ/icon"):** the picker lists all 81 tones but
  shows no inline warning for a rule the pick would break (Lights-group `*-light` on Text/Heading, colour Light on body
  copy); the harness flags it only at Save. Add a per-option "Not for text" caption like the slot palette's warnings.
- ✅ 2026-10-06 (built: `shared-code.mjs`, `SharedConfirm`, E2E ST-12) P2 (2026-10-05, session "Studio builder tool planning", plan WP-B2): structural edits in shared demo code (`PlatformDemoActions.tsx`, `chatDemo`, `PlatformChat*`) with a "used in N places" confirmation. Needs one confirmation choke point for remove / duplicate / move / insert / paste / drag / multi, and `isSlotFile` widened to annotated non-playground files; today they show disabled with the reason ("shared beyond this example").
- P3 (same session): the Studio E2E server watches the shared tree, so peers' edits to Studio files mid-run cause hot-update errors; rows retry once on a fresh page ("passed on retry" in the evidence). A run in a quiet window gives the cleanest matrix.
- ~~**P3 · deadclick list-item@1512 "Pending invites" (2026-10-05, seen by "Token màu cho content/chữ/icon"'s gate):**~~ **closed 2026-10-07 (backlog cleanup):** a probe artifact: by hand Revoke removes the row and shows Undo (the batch 3 line below). Was: the
  "Revoke invite for an.vu@dizai.studio" Button click had no visible effect (no-op handler or a race); not caused by the
  tone change, example not touched.
- **Closed (2026-10-07, user decision: help text keeps the Light tone in every family but Warning):** ~~**P3 · Colour Light text contrast (2026-10-05, "Token màu cho content/chữ/icon"):**~~ on white (light mode) these Light levels
  are under 4.5:1: Positive/Green 3.97, Orange 3.69, Teal 3.64, Cyan 3.52, Golden 3.49 (Negative/Red 5.06 and Info/Blue
  4.87 pass). Small help text in them (Input success help uses positive-light) misses AA. Decide: Base for small help
  text in those families, or accept for short status lines. **Sweep 2026-10-07:** the numbers moved: Positive/Green is 4.71:1 now (passes); Orange 4.02, Cyan 3.98, Teal 3.64 and Golden 3.49 are still under 4.5:1. **Decided 2026-10-07 (user, replacing the batch 8 recommendation):** every help text but Warning uses the Light tone for its icon and text (Warning, a Lights family, uses Base), the Uploader's error help text too, so these Light levels stay for help text (closed). Done the same day: the Uploader field's error help text and the File-Item's error line were Negative/Strongest, now Negative/Light (field 4.72:1 light / 7.16:1 dark; on Negative/Subtle 4.01:1 light / 5.88:1 dark, the user's call); Input help already followed the rule.
- Done 2026-10-05 (session "Dark/light mode sync và UI present", backlog batch 1) for the Open navigation part (see the app-shell line above); ~~the example-content ⚠ below stay open.~~ (backlog sweep 2026-10-07: each is tracked in its own row: "Activity, new" and "Hana Kim" in the probe rows, the HR 8 text styles and the 90 s budget in "Gate warnings left from batch 5", "Chi Tran" and the 2px gap in "Structural audit warnings") Batch 3 note: app-shell "Activity, new" is a probe-order artifact, not a dead handler — the behaviour pass clicks the Sidebar's Activity first, so the bell then opens the page already shown (from People it navigates and clears the dot); fix in the probe (reset between clicks) if it keeps flagging. Was: P2 (2026-10-05, gate .qa/reports/2026-10-04T20-04-34-28eea406.md, found by "Dark/light mode sync và UI present", not from
  its change): app-shell "Narrow window" example (`examples/pages/app-shell.tsx` `<StudioApp narrowWindow />`): the
  "Open navigation" menu button (aria-haspopup=dialog) opens nothing on click or Enter, at 1100 and 900 px windows
  (behaviour ✗ apg + ⚠ deadclick). Same run, example content: ⚠ deadclick app-shell "Activity, new", chat "Hana Kim" inbox
  row; ⚠ rhythm 8 text styles in HR templates; button "Approve on a phone" "Chi Tran" heading-4 not a heading; button
  "Hand off when ready" Stack gap 2px; templates behaviour exceeded its 90 s budget.
- **Done (checked 2026-10-07, backlog sweep: the rest shipped in GĐ4 M3: nested instances show every property type (inspector/nestedInstances.ts:112, E2E IN-12/13)):** ~~P2 (2026-10-05, session "Studio builder tool planning", WP-E follow-ups, for GĐ4): ~~option labels in Figma words~~ done 2026-10-07 (GĐ4 M1); nested groups for generated entries: a field's Label / Help-Text done in M1, the rest (Button in Card…) is GĐ4 M3; ~~icon-presence toggles start from a fixed icon~~ done 2026-10-07 (GĐ4 M2: Figma's default icon).~~
- P3 (2026-10-07, GĐ4 M2) · Help-Text's Figma names: no Primitives/Input/Help-Text set in the capture or found by the swap read; the Help-Text group keeps code labels (Theme, Icon, Character limit) until the set is read.
- P3 (2026-10-07, GĐ3b M2) · Starters: a Table whose columns draw their cells with `cell` functions copies its rows but not what the cells draw (46 frames). Since GĐ5 M1 a column without a cell shows its rows' field named by its id (Role → "Member"), and a column with no such field (Admin list "Member": photo + name + email) draws nothing. Pointer: `src/platform/studio/builder/starters/snapshot.ts` valueOf (functions are left out); the coverage report lists them (`node tools/studio/e2e/starters-coverage.mjs`).
- P3 (2026-10-07, GĐ5 M4) · Uploaded photos: no way to delete one from Assets › Photos (they stay in IndexedDB); photos uploaded before a folder is linked are not copied into its assets/ (only later uploads and imports are); the dev server's pages folder keeps no photos (a page opened in another browser on the dev server shows "Missing photo"). Pointer: `builder/assets/uploads.ts`, `builder/store/mirrors.ts` (devMirror has no writeAsset / readAsset).
- P3 (2026-10-07, GĐ5 M1) · Starters: a photo that is not a library photo (an Avatar's `/src/assets/media/avatar-*.webp`, a template's own `/src/templates/hr/assets/*.jpg`) is kept as this build's URL: on the deployed docs it breaks after the next deploy, and an export carries a path the app does not have. Pointer: `builder/starters/hostLayout.ts` libraryMedia (library keys cover site / feed / viewer only); M4's `zen-asset:` could carry them.
- P3 (2026-10-07, GĐ3b M2) · Starters: inline `<svg>` drawings in examples (74 frames: brand marks, custom glyphs) are left out; a page holds library components only.
- P3 (2026-10-07, GĐ3b M2) · Starters: a className on a library component other than Stack / Grid / Box / Text (Card, Button…: 103 frames) is left out; its CSS (often a width or a grid placement) is not read back.
- P3 (2026-10-07, GĐ4 M4) · Detach on a builder page refuses EmptyState and DescriptionList: their recipes write an inline style (EmptyState `width: min(320px, 100%)` + auto margins, DescriptionList `maxWidth: 50%`) that pages do not take (`tools/studio/detach.mjs` pageLayout). A Layout-prop form of those layouts would let them detach there too.
- P3 (2026-10-07, GĐ4 M4) · A Studio wrap Stack follows its instance for remove, duplicate, move and drag; Cut / Copy / Paste and the multi-selection ops (`edit/clipboard.ts`, `edit/multi.ts`) still act on the instance alone (a cut leaves its Stack empty).
- P3 (2026-10-07, GĐ4 M4) · Detach approximations on builder pages leave out the "CSS keyed on the component class" lines: the browser has no repo CSS to read (`componentCss`).
- P3 (2026-10-07, GĐ4 M2) · Component swap covers registered atom slots (ListItem leading / trailing) and whole layers; a ReactNode prop that is not a registered slot (Metric `action`, EmptyState `icon` as an element) shows its value read-only, with no ⇄.
- **Done 2026-10-07 (backlog batch 2: a chip on the size pill moves just below it, `slots/SlotLayer.tsx` clearOfPill):** ~~P3 (2026-10-05, Studio builder session): on a selected Box (layout primitive with slots) the SlotLayer "+" chip sits
  on the selection's size pill ("28 × 28") below small layers, so the size is hidden (`slots/SlotLayer.tsx` chip vs
  `.studio-resize__pill`).~~
- **Closed (checked 2026-10-07, backlog sweep: list-item@1512 has 0 behaviour findings on 2026-10-07; the card playground corners are the "Card playground slot corners" row):** ~~P3 (2026-10-05, gate .qa/reports/2026-10-05T07-49-39-28eea406.md, backlog batch 3, not from its change): behaviour ⚠~~
  deadclick list-item › Pending invites "Revoke invite for an.vu@dizai.studio" is a probe artifact — by hand it removes the
  row and shows the Undo toast; the pass revoked the row above first (the list shifts, the toast may cover the next
  button). New ⚠ in the same run, not from it: card › playground Spacing=small corners (Card 16 vs platform-slot 12 + 16).
- ~~P3 (2026-10-05, gate .qa/reports/2026-10-05T09-47-59-28eea406.md, backlog batch 6, not from its change):~~ **closed 2026-10-07 (backlog cleanup):** the playground Avatar keeps white initials on Solid green by the user's choice (Avatar colours kept; the Playground Avatar line). Was: usage ⚠
  `src/platform/PlatformExamples.tsx:635` avatar/solid-initials-contrast (white initials on Solid green in a playground);
  the same run saw one file rendering from an unsaved Studio draft on 5173 (gone a minute later, not this session's).
- P3 (2026-10-05, seen in the 390 contact sheets of session 2984c6e6, not from its token change): Table at 390 cuts the
  Assignee column without an ellipsis — Badge › Task status ("Em I", "Alex") and Button › Page actions ("Chi Trar", "Bao Ngı"). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the two examples are adapted for 390 → batch 6b.
- P3 (2026-10-06, session "Canvas và surface mặc định", usage rules §16): **audit check for the default pairing** —
  proposal, needs the user's OK and the tools/qa owner: in `tools/platform-audit/audit.mjs`, warn on a Surface/Default
  box whose backdrop is the Canvas/Default stage and that carries a closed border or a drop shadow, outside phones,
  shells, Surface-in-Surface, clickable (`data-interactive`) and selected cards. Today §16 is documented only. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the audit check is approved → batch 9 (tooling).
- P3 (2026-10-06, same session): **playground stages** still paint Neutral/Pale
  (`.platform-example-panel--stack > .platform-input-preview`, platform.css ~369; `.platform-example-row` beside it):
  decide whether playgrounds follow §16 (Canvas/Default) like the example stages. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** playground stages follow §16 → batch 6b.
- P3 (2026-10-06, same session): **phone screens** paint Surface/Default (PlatformPhone), a white page, so cards in
  phones keep §11 borders (card Choose on a phone, progress Loyalty stamps, metric Drill in on a phone): decide whether
  phone examples should default to Canvas/Default too. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** phone screens default to Canvas/Default → batch 6b.
- P3 (2026-10-06, same session): **elevation in shells** — alert-banner Billing card (`alert-banner.tsx` ~134,
  theme border) and breadcrumbs Top bar trail card (`breadcrumbs.tsx` ~201, theme border) sit in AppShells on
  Canvas/Default: check each Sidebar's style; a shadowed Sidebar means Shadow cards (elevation follows the Sidebar).
- P3 (2026-10-06, same session): **Card Flat has no hover/pressed** when clickable (`card.css` only styles Border's
  interactive states), so clickable cards stay `theme="border"` under §16; a Flat interactive state would let them
  follow the default mood.
- ~~P3 (2026-10-06, gate .qa/reports of session 7b329fe8, Sidebar width change, not from it):~~ **closed 2026-10-07 (backlog cleanup):** same as the 2026-10-03 Chats inbox "Hana Kim" dead-click line (a probe race on the open row). Was: behaviour ⚠ deadclick
  `chat@1512` Chats inbox — clicking the selected "Hana Kim" Conversation-List row has no visible effect (the row is
  already open; likely a false positive, or the selected row should not re-announce).
- P3 (2026-10-06, Studio builder session, seen on a builder page; likely on examples too): undo of an Assets / clipboard insert does not go back to the previous selection (slot-picker inserts do, `slots/actions.ts` remember); a redo within ~2 s shifts the stale selection a line, and a reload then reports "Selection lost". `edit/clipboard.ts insertCode` could remember before/after like slot inserts.
- **Done 2026-10-07 (backlog batch 8, item 61: run.mjs reads each page's `examples` array from examples/pages, `isExampleSource` and `pagesForEdit` map examples/pages/<page>.tsx|.css to their page; a quick gate on side-panel and tooltip now warns):** ~~P2 (2026-10-07, backlog sweep)~~ · `npm run qa` step ④ (example coverage) reads only `src/platform/*Showcases.tsx` and `src/platform/appLayer/*.tsx` (`tools/qa/run.mjs:456`, `isExampleSource` in `tools/qa/lib.mjs:227`; the map regex at run.mjs:468 also misses the `keepOnHotUpdate(…)` wrapper). Since the examples moved to `src/platform/examples/pages/*.tsx` (`keepOnHotUpdate(import.meta.hot, "examples", [ … ])`), it finds no example list for those pages and reports them as "skip: no example map entry", so the coverage matrix checks nothing. Fix: read `examples/pages/<page>.tsx` and its `examples` array. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** approved; fix it before batch 5b.
- P3 (2026-10-07, backlog sweep) · Stale leftovers seen while verifying: the comment at `src/platform/appLayer/layout.tsx:156` still says example cards force a breakpoint; the zen-allow at `src/templates/DetailTemplate.tsx:271` is no longer needed (`table/title-heading-4` accepts Subheading in a Card); the behaviour baseline's chat focus-ring entries and `quality-baseline.json` (only 2 of its 24 fit findings remain) look stale.
- P3 (2026-10-07, backlog batch 8, found by the fixed qa step ④) · Example coverage gaps on the rebuilt pages: side-panel (edge cases, mobile), sidebar (states, mobile), tooltip (mobile). side-panel and tooltip have no phone example by design (their file headers say so), so the matrix warns each time they are edited: add the missing examples in an approved batch, or give run.mjs a per-page "no phone by design" exemption.

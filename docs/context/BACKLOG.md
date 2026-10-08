# Backlog and open items

Moved out of `HANDOFF.md` on 2026-09-29 (text unchanged). Since 2026-10-08 (user) a bug or gate finding is fixed at
once, in the change that met it; only questions for the user or designer and work too large for that change are added
here, one line each (priority + pointer), and mentioned in the report (Scope lock, `AGENTS.md`).
Read this file only when picking up work or logging a follow-up. Done, closed and duplicate entries move to
`BACKLOG-archive.md` (text unchanged).

## Open items

- **Zen-High-Contrast, next steps (prototype in code since 2026-10-05; user: keep step 9, no new tokens):**
  - Done (2026-10-05 evening, export "Zen-Variables 2"): Global Colors now carries the Zen-High-Contrast mode, which
    equals the algorithm on all 960 values; build-tokens takes Figma's mode and tokens:check verifies it. The Mint ramp
    was synced in the same export and matches the live file (Mint/9 #40E7AD). The native packages carry the second mode
    as data (resolver default Zen); mapping it to iOS accessibilityContrast / Flutter highContrast is still open.

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
- Platform chrome: "Download Figma" (overview + sidebar footer) and "Feedback" have no destination, so
  `interaction/action-without-handler` keeps them as its 3 warnings. Waiting on the user for the URLs.
- Phone decisions from the Top Navigation research (2026-10-01, `docs/research/top-navigation-mobile-rules-2026-10-01.md`):

## Backlog (plan before opening sessions)
- **P3 · usage:selftest fails now and then while another gate runs (2026-10-07):** twice a fixture rule reported 0 hits
  (`alert-banner/small-no-action`…, then `content/lights-no-light-text`) and passed 3/3 right after; both times a
  `npm run qa` ran in parallel. Find the shared state (a cache or a file the gate rewrites) before trusting a red run.
- **P2 · Bordered boxes in phone screens (2026-10-07, after batch 6b):** phone screens now paint Canvas/Default, so the
  cards and ListBoxes inside them that took §11 borders for the old white screen (card Choose on a phone, progress
  Loyalty stamps, metric Drill in on a phone, …) should go flat per §16, or their phone takes `canvas="surface"`; then the
  §16 audit check can stop skipping phones (quality-checks.mjs).
- **P3 · Builder Link folder: the permission prompt of a real folder is untested (2026-10-06, GĐ2 M4):**
  `npm run studio:build-check` covers link, write, Trash (trash/ copy), Restore and the reconnect after a reload through
  an OPFS folder, which the browser always grants; a folder the person picks is usually "prompt" after a reload, so the
  Reconnect button path (`mirrors.ts` reconnectFolder → requestPermission) needs one check by hand in Chromium.
- **P3 · Grid column resize follow-ups (2026-10-06, session "Search spacing collapse bug"):** (1) an item with a Fixed
  width (a Studio wrap Stack `width={240}`) that is alone in a px Grid column still edits its own width on a drag, which
  can leave free space again; resizing the column and clearing that width needs one request touching two elements
  (server op). (2) Double-click (Hug) on a column item does nothing ("drag the edge"): could write the track as `auto`.
  (3) No E2E row for the column drag / Fit yet (probe scripts were ad hoc). **Batch 5b 2026-10-07:** (2) done: a Hug double-click on the only item of a px column writes that column's track as `auto` (planHug, gridTracks withTrack); (3) E2E L-09 covers the Hug; the drag has no row yet. (1) still open.
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
  works (3 → 2 rows + toast). **Sweep 2026-10-07:** done: (6) the list block is a `ListBox theme="shadow"` (app-shell.tsx:252); (7) the badge, menu, list-item and layout Main column / Centred code strings match their render, pagination's snippet has its List, and avatar's status row is a Stack above the ListBox (avatar.tsx:107-121). Duplicates: layout › Elevated panel (the Card → ListBox leftovers row above), "Activity, new" (a probe-order artifact, Done line of 2026-10-05 batch 1), button Heading/2 Text and 2px gap (Structural audit warnings row), Revoke (closed as a probe artifact). Still open: (1)–(5); (7) the stepper, date-picker and rating snippets; action-bar xs trailing buttons; avatar › Profile photo h1; chat › First message now flags "Video call" (its handler exists: check by hand). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** (3) phone sheets pad 20px and (4) Card uses radius xl on phones → batch 6 · **Done 2026-10-07 (batch 6)** (bottom-sheet.css --zen-bottom-sheet-inset; card.css XLarge on phones); (5) chat rows keep Figma's 16px (closed).
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
- **P3 · Code Connect for Description List (blocked, 2026-10-04):** Figma answers "You need a Dev or Full seat on an
  Organization or Enterprise plan to use Code Connect" for this account. Once a seat is available: map
  `Description List` 14859:79180 (Layout → `layout`, Items slot → `items`) and `.Primitives/Description-List/Item`
  14859:78890 (Term → `term`, Value → `description`, Emphasis → `emphasis`, Action/Action Button → `action`) with
  `.figma.ts` templates (the repo has no figma.config.json yet).
- **P3 · Card playground slot corners:** `.platform-slot` (radius Base 12px) inside a Small Card (16px, inset 16px) is
  not concentric ([rhythm] card@1512/390), new since the slot fills the card width (platform.css:817).
- **P2 · App Shell examples (checked 2026-10-03 after the List Item refactor; none caused by it):**
  - Phone app › Profile: the two Toggles in Notifications don't stretch, so their switches sit mid-block instead of at
    the right edge; the Account kicker (`Group`) is tone="light" while the Notifications kicker is tone="base"
    (kickers are Body/Small/Bold Base). **Sweep 2026-10-07:** done: both kickers are `tone="light"` (app-shell.tsx:583, :711). Still open: the Toggles that do not stretch, "New" rows that open nothing, and the Back tooltip over the first row (keyboard only).
  - Notification rows (desktop Notifications page, phone Notifications) carry "New" but open nothing (static rows).
  - Phone Notifications: after the bell opens the screen, focus lands on Back and its tooltip covers the first row.
- **P3 · Accordion `contentWidth` follow-ups (2026-10-03, session 2dd655b9):** ~~(1) a Content width control in the
  Accordion playground (Figma has the property since 2026-10-03)~~ done 2026-10-07 (backlog batch 4: Title / Full); (2) the audit's [rhythm] concentric check measures
  insets inside scaled phones (accordion@390 reports 8 + 5 for 8 + 8).
- **P3 · List Item follow-ups (session "Component List Item refactor"):** EmptyError skeleton rows are static (0 / Gap/Medium
  16px) while the loaded rows are interactive (12px × 24px), so the list shifts when loading ends; a few static rows
  still carry Studio-written `selected={false}` (app-shell, action-bar, button); toggle.tsx "Show completed" snippet shows a
  Card while the JSX is a detached Box. Pre-existing NEW warnings seen in the gate, not from the list change: tooltip@390
  inline link targets (Exact time, Long file names), top-navigation/input "Choose a …" placeholder contrast 1.92:1,
  accordion@390 concentric corner, button "Chi Tran" styled Heading/4 without a heading + a 2px Stack gap (Hand off when
  ready), templates rhythm/outline-siblings. **Sweep 2026-10-07:** done: the toggle "Show completed" snippet matches (ListBox in both) and tooltip@390 audits clean. Duplicates: the placeholder contrast (kept on purpose), accordion@390 corner (Accordion `contentWidth` row (2)), button "Chi Tran" + 2px gap (Structural audit warnings row), templates rhythm / outline-siblings (AiChatBlock row and the rhythm 8 text styles item). Still open: skeleton vs loaded rows, Studio-written `selected={false}`.

- **Studio multi-select follow-ups (2026-10-03, session "Chọn nhiều element vào container"):**
  - P3 · Delete / ⌘D / Move on a multi-selection (now one layer only, with a status line) and mixed-value property editing. **Sweep 2026-10-07:** Delete, ⌘D and mixed-value editing are done (`edit/multi.ts:55-75`, `MixedProperties.tsx`); Move on a multi-selection is still open (arrange.ts:131). **2026-10-07 (backlog batch 5c):** the arrow keys move several layers of one parent (op many move, `edit/multi.ts` stepLayers; E2E K-13); dragging several layers is still open.
  - P3 · Wrap's snippet sync needs the example's `code:` to show the same region; most example snippets differ ("Example code not updated").
- **Studio nested booleans, after the 2026-10-05 fix (session "Nested boolean không hoạt động"):**
  - P3 · Server `origin`: bindingOf ignores for-of/for-in/catch bindings; custom hooks returning state read as
    bound-value (a switch could fix their value); loop-bound `rows` is the innermost loop's length.
  - P3 · Presence switch off → on in a playground (resetSlot refused there) re-adds the prop at the end of the tag, so a
    reordered draft remains (PlatformMobilePlaygrounds.tsx title).
  - P3 · `origin` cannot see state that reaches a prop through a render-function parameter (Table cell
    `checked={feature.on}` with rows from useState): it reads bound-value, so a fixed value is offered and locks the toggle.
- **Studio Design tab: remaining items (2026-10-03; session "Cloud migration feasibility"; spec docs/research/studio-inspector-redesign-2026-10-03.md):**
  - **Approved phases still to do:**
    - Phase 7: polish, Appearance surface/border.
  - **P3 · Unchecked dark / Comfortable / 280px:** no screenshot pass of the inspector in dark mode, Comfortable
    density or at 280px.
- **Full-width table pages follow-ups (2026-10-03; session "Cloud migration feasibility"; need the user's OK):**
  - **P3 · Harness rule:** flag a bare `<Container>` whose subtree holds a non-Card Table (new rule = new scope).

- **From Zen Studio, the canvas tool (2026-10-02; session "Platform UI/UX redesign với canvas editor"):**
  - **P3 · Studio: 0 spacing has no canvas area:** a gap/padding of `none` draws no hit area, so it is set from the
    Inspector's Layout section only (`select/spacing.ts`).
  - **P3 · Studio: outlines over scroll-clipped elements:** the selection outline and spacing tints draw over parts an
    ancestor scroll box clips (e.g. alert-banner.tsx:390 Box after Shift+2); clip to the scroll ancestor.
  - **P3 · Studio detach follow-ups:** row index assumes the `.map` result renders unchanged (`.slice/.reverse/[h, ...map]`
    would pick another row; no repo case); the phrasing check for Badge/Tag looks at the nearest JSX parent only; the
    inspector status shows the snippet-not-synced note for detach only. **Sweep 2026-10-07:** done: the snippet-not-synced note also shows for wrap, slot inserts and float (wrapSelection.ts:298, slots/actions.ts:233, position/float.ts:49). Still open: the row index and the phrasing check.
  - **P3 · Studio drafts, live push:** other browsers learn about a draft or a stale disk by the 10 s poll / focus;
    a Vite ws event (`zen-studio:drafts`) from the plugin would show it at once (verify 2026-10-03).
  - **P3 · Studio drafts and the standalone audit tools:** only `npm run qa` warns that 5173 renders unsaved drafts;
    `platform:audit`, `platform:shoot` and `visual-diff` run on 5173 without saying so (tools/platform-audit/*).
  - **P3 · PlatformPhone scale feedback (latent):** `PlatformPhone.tsx` scales from its immediate parent's width minus
    32 and falls back to scale 1 when that room is ≤ 0, so a host sized by its content (grid/inline box around the phone)
    loops. Surfaced by the phone centring (2026-10-03, Chat playground; fixed there with a definite width). Harden: keep
    the last scale instead of 1, or measure a host whose width does not depend on the phone.
  - **P3 · Phone on fractional pixels:** the fit box is `spec.width * scale` (e.g. 323.02px), so centred phones land on
    half pixels (1px gap differences, anti-aliasing in element screenshots); round the fit size in PlatformPhone.
  - **P3 · Structural audit warnings new on 2026-10-03 (not from the colour or Detach changes; owners to triage):**
    ~~ai-chat "Assistant on a phone" has no h1 (outline starts at h2 "What do you need, Alex?")~~ done 2026-10-07 (backlog batch 4: the bar title "Zen AI", as its code sample already had); button "Approve on a
    phone" styles "Chi Tran" heading-4 without a Heading, and "Hand off when ready" has a 2px Stack gap (not a ladder
    step); accordion@390 "Mobile order summary" corner 16px vs trigger 8px + 5px inset; tooltip@390 "Exact time" and
    "Long file names" links are 16–20px tall targets. Report `.qa/reports/2026-10-03T15-48-37-47da80c2.md`. **Sweep 2026-10-07:** done: "Chi Tran" is a Text span now and the audit finds no hierarchy issue; tooltip@390 audits clean (WCAG 2.5.8 spacing exemption). Still open: the 2px gap in "Hand off when ready" (button.tsx:245) and the accordion@390 corner.
  - **P3 · action-bar 390 contact sheet:** the sticky "No changes to save yet · Undo changes · Save changes" bar of
    Unsaved changes is drawn over the neighbouring cells (Two choices on a phone, Running total) in the shot.
  - **P3 · Board follow-ups (2026-10-03, stable layout):** a width override past the section edge overlaps the Docs
    frame and is left out of the section surface and zoom-to-fit (extend the surface / fitRect to the rendered extent
    without changing the grid track); "ResizeObserver loop completed" still fires at zoom ≤ 0.5 when frame labels crowd
    (pre-existing: defer FrameChrome's RO-path style writes to the next frame); at 1024px a toolbar inside the frame
    top opens its width menu upward off the window; after Clear contents → Reset slot → Undo ×2 on card example:5 the
    selection layer drops the selection; GET /element 404s for removed children after a slot Clear. **Batch 5b 2026-10-07:** the frame chrome lays out on the next frame after a size change (no observer loop; not reproduced before). Zoom-to-fit was done earlier (see the sweep). Still open: the section size with a width override; unsure: the width menu at 1024, Undo×2, GET /element 404.
  - **P3 · Resize follow-ups (2026-10-03):** a fillChildren column with `height="fill"` whose own parent gives it no
    height collapses its children to 0 (needs a parent-aware rule); a column/row with only a minHeight keeps content
    heights (decide Figma parity); a px-capped component (number Chip, CSS max-width 40px) still offers width handles
    that only size its wrap Stack; after a wrapper edit, a child on the same source line keeps its old column and the
    selection drops ~2 s later; a `.map` drag previews only the pressed instance; a Hug double-click on an axis that is
    already Hug still sends one no-op edit; a dropdown Chip hides both axes (decide whether width stays). **Sweep 2026-10-07:** done: a Hug double-click on an axis that is already Hug writes nothing (resize.ts:582, :601; ResizeLayer.tsx:978-982). The rest is still open (two of them are decisions). **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** a minHeight-only Stack sizes Fill children as Figma does, and a dropdown Chip keeps its width handle → batch 5c. **Done 2026-10-07** (layout.css, chip.css; E2E SE-10).
  - **P3 · Studio wrap and child contracts:** the `wrap` op (resize of a component without a size prop) does not check
    parent/child contracts: wrapping a ListItem in List, a Tab in Tabs, menu/select items or Table parts may break the
    parent's semantics or ARIA (it already refuses table/svg/paragraph nesting). The wrap selftest runs no
    style-guard/usage-guard/tsc on its outputs (detach's does).

- **From the AI Chat Field / Chat-Control update (2026-10-02; session "Cloud migration feasibility"):**
  - **Found while verifying those fixes (2026-10-02; need the user's OK):**
    - **P3 · HR · Home Settings menu closes in the full smoke flow** (stays open alone): state left by an earlier step
      (the "Open navigation" drawer?); the smoke never samples it.
    - **P3 · Popover shift → edge hand-over jumps:** a surface shifted into view (fits on neither edge) jumps to its
      edge-aligned spot once the anchor slides far enough for an edge to fit (64–96px seen while resizing 360→424).
      Inherent to shift-then-align; a continuous hand-over would clamp from the edge the anchor moves toward.
    - **P3 · useAnchoredPosition in scaled frames:** offsets are measured in screen px but written as CSS px, so in a
      transform-scaled docs phone a surface sits slightly off its anchor (pre-existing; the clamp now uses the scale).

- **Template rebuild follow-ups (2026-10-01; brief docs/research/template-rebuild-brief-2026-09-30.md):**
  - **P3 · Table:** rows of a table without onRowClick still show the hover fill (Team budgets); the
    `table/title-heading-4` rule wants Heading/4 for a Card title that heads a table, while cards use
    Heading/Subheading (Detail page used one zen-allow). **Sweep 2026-10-07:** done: `table/title-heading-4` accepts Heading/Subheading inside a Card (check-usage.mjs:900-901); the zen-allow at DetailTemplate.tsx:271 is no longer needed. Still open: the hover fill without onRowClick.
  - **P3 · HrShell:** the Approvals counter in the module sidebar is static data; it doesn't follow approvals made on
    the page.
  - **P3 · Phone templates:** their toasts appear at the bottom of the browser window, outside the phone frame (the
    docs ToastStack, not the template).
  - **P3 · AiChatBlock:** its greeting is an h2 in Heading/1, so a page that also has Heading/4 section h2s trips
    `outline-siblings` (HR · Home).
- **HR template audit follow-ups (2026-09-30, batch 6b; log: session-log-2026-09-30.md "Batch 6b"):**
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
- **Review batch 5 follow-ups (2026-09-30, items 13–17; log: session-log-2026-09-30.md "Review batch 5"):**
  - **P2 · Thin examples sweep (item 13 rest):** Dialog "Form · 1-3 with preview" and ModalForm "Basic" still open from
    a one-line row; scan other overlay/trigger examples the same way (script in the session log). **Sweep 2026-10-07:** done: "Form · 1-3 with preview" and "Basic" are gone; dialog.tsx:667-794 are scenario examples. The scan of the other overlay examples has not been re-run.
  - **P3 · Components seen by the template agents:** emoji DockIcon XSmall draws a 12px glyph (Figma 28px); ProgressCircle
    has no decorative mode (status read twice); ModalForm `header={false}` has no accessible name; Box has no tinted
    surfaces (Kanban column colours); Card content does not fill a stretched card; AiChatBlock greeting is an h2 (Home
    adds a hidden h1). **Sweep 2026-10-07:** duplicates: Box tinted surfaces ("Component gaps from the Tasks frames" row) and the AiChatBlock greeting (AiChatBlock row). Still open: emoji DockIcon XSmall, ProgressCircle decorative mode, ModalForm `header={false}` name, Card content fill.
- **Typography outline / content hierarchy (2026-09-29):** the user approved every recommendation ("theo đề xuất");
  implemented the same day (session log, "Typography outline"). Follow-ups:
  - **P3:** the docs platform's own outline on the Typography page (h2 Heading/3 sections, example h1s under h3 card
    titles); ExampleCard should expose `data-screen`; a durable selftest for the quality/outline runtime checks; the
    redundant `ZenProvider typography="mobile"` wrappers around PlatformPhone; the Typography topbar chip no longer
    reaches phone frames (they default to Mobile); TopNavigation stories for the heading behaviour; the Text
    "Headings" story could label each level's default style. Review:
  `docs/context/typography-hierarchy-review-2026-09-29.md` (8 decisions, ~30 verdicts; the phone child screen has no
  h1, h2 renders in 6 styles, the enforcement misses missing h1s and errors on valid group headers). **Sweep 2026-10-07:** done: ExampleCard exposes `data-screen` (PlatformShowcases.tsx:41). The rest is still open. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** the Typography chip does not override phone frames; phones stay Mobile (closed).
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
  - **P2 · Live Figma drift found by `__HASHES`:** 9 of 18 sets in `checkbox-radio-chip-popover.json` (Chip/Normal,
    Chip/Advanced, Chip/Number-Only, Popover label/item primitives …) no longer hash-match; check whether this is a
    real change or only the frame's variable mode (captures are not mode-independent until kit C1).
  - **P3 · Gate details:** baseline JSON notes and their generators (`check-styles.mjs:353`, `audit.mjs:483`) still say
    "fix these when you touch them" (Scope lock wording); token scope follows importers one level (a Button token →
    23 pages); token scope reads CSS only, not inline `var()` in TSX; `foundations.css` maps to the representative set;
    a reused pid can keep a stale "running" marker alive for up to 6 h; `--only` runs that each render part of an edit's pages never clear it (one run must cover them all, so plain `npm run qa` is simpler); edits made by scripts through Bash are often not recorded; mixed stale guidelines (own + another
    session's) fail instead of rebuilding.
- **P3 · Package weight:** every app loads the whole 63 KB gz stylesheet. Consider per-component CSS entry points.
- **P3 · `-shadow-off` leaks into nested component themes** (found 2026-09-29, token update): companions are emitted
  only in the modes whose fill is tinted, so a Neutral-S4 scope inside a Neutral-S3 scope inherits S3's `0 0 #0000`
  and its selected chip loses the Figma shadow. Nothing in the repo nests component themes, but `ZenProvider` allows
  it. Fix idea: `scripts/build-tokens.mjs` emits `<token>-shadow-off: initial` in the other modes.
- **P3 · Input family contracts predate the new small radius:** `docs/figma-contracts/input-search*.json` and
  `datepicker-sidebar.json` were captured when `Corner-Radius/Input/Small` was 8 / 8 / 4 / 2. No suite checks them
  yet; re-capture before building the Input suites. (2026-09-29: the DatePicker Action entry and the two
  Select-Month-Year variants are refreshed; see the DatePicker block below.)
- **From the app-layer examples rebuild (2026-10-02, session "Add audit check…"): shared or component items, nothing
  fixed here.**
  - **P3 · AppShell aside** assumes 440px (SIDE_PANEL_DEFAULT_WIDTH) before an aside has docked once and ignores
    SidePanel size="small" (360), so a small panel that would fit opens as an overlay.
  - **P3 · Audit `edges`** counts the focus outline of a programmatically focused `tabIndex={-1}` heading as a frame
    and reports its text as flush (`tools/platform-audit/audit.mjs`).
  - **P3 · Dead app-layer example code:** the old examples of the 12 rebuilt pages in `src/platform/appLayer/*.tsx`
    (layout, content, navigation, form, shell, shellScreens, text, panels) no longer render; the playgrounds there do.
  - **P3 · Component nits seen in the second fix round:**
    - EmptyState inside a Card is lopsided: no top padding, 48px at the bottom (`empty-state.css:10`).
    - The read-only TextArea still draws its resize grip.
    - Table has no selected-row cue (aria-current / Selected fill) for the row whose detail is open in a docked panel.
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
- **P3 · `fit` follow-ups** for its owner "Quy trình kiểm tra Component build" (offline while it was built): review
  `textFit` and the new `audit.mjs` flags `--baseline-update=<kinds>` and `--css=<file>`. Still unchecked: a control
  that fits its own text but is cut off by an `overflow: hidden` ancestor or covered by a sibling. Examples: a
  Segmented with `flex-shrink: 0` in a clipping container would hide its last items, and at 390 the Side Panel ›
  "Docked inspector" card sits under the panel. `overflow` skips these as clipped, and `fit` does not see them.
- **From the Figma parity update of 2026-09-29** (session log, "Figma parity update"). The designer questions from
  the same run are under Open items.
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
      `gap` in the select-editor rule (`table.css:85`). **Sweep 2026-10-07:** done: the duplicate `gap` is gone (table.css:104). Still open: Photo-Cell radius; decisions: TableMedia `bold` default, the text editor popover lift. **Decided 2026-10-07 (user: "theo đề xuất", backlog batch 8):** TableMedia defaults to `bold=false` like Figma (CHANGELOG: behaviour change) → batch 6 · **Done 2026-10-07 (batch 6)** (Table.tsx; call sites keep `bold`; CHANGELOG Changed); the text editor lift is an accepted exception (closed).
    - Breadcrumbs: the Sub plate's bleed covers the first 4px of the chevron's hit area. (The 28px height is fixed:
      20px as in Figma since 2026-09-29.)
    - Toggle: the platform showcases still pass the deprecated `selected` / `onSelectedChange`
      (`PlatformShowcases.tsx:557–559`); its JSDoc does not cite the node ids; Figma renamed the Caption prop to
      Subtext (a `subtext` alias would be new API). **Sweep 2026-10-07:** done: Figma has no Subtext property to rename (component-properties.json, 2026-10-07). Still open: the deprecated props in the showcases and the JSDoc node ids.

- **From the App Shell rework of 2026-09-29** (session "App Shell kiểm tra lại"; session log 2026-09-29, "App Shell"):
  - **P3 · Sidebar headers from HR-Platform:** a workspace/account switcher header (square Avatar, name, email,
    chevron-selector) and a drill-in module header (Back chevron + Heading/4 "Time Off").
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

- **From the examples rebuild (2026-09-30/10-01) — RESOLVED 2026-10-02 (user: "cứ xử lý hết"; CHANGELOG "Approved backlog fixes"). Kept on purpose: the Content/Placeholder colour (Figma token; Zen fields always have a visible label) and the Avatar solid colours (Figma; harness warns instead):**
  - **P3 · Pagination:** `resultsRange` prints "of 1284 results" without thousands separators (labels.ts en/vi); the
    guideline's "jump to page" wording and Enter row do not match the Manually theme (a page-size input). **Sweep 2026-10-07:** done: thousands separators through Intl.NumberFormat and an en dash (labels.ts:245-246, :280, :464). Still open: the guideline's "jump to page" wording.
- **From the UX interaction pass and the Top Navigation research (2026-10-01; session "Component library review và
  fixes"; research §5):**
  - **P3 · G3 harness:** `top-navigation/search-folds-to-action` checks only `collapsed`. A `scrollRef` bar with a
    Search and no `searchAction` passes.
  - **P3 · G7 Figma Top Navigation features without props:**
    - large-title Capline, Subheading and Badges;
    - a bar-title Dropdown;
    - a selection-mode recipe;
    - a hero header that turns opaque on scroll.
  - **P3 · G9 docs:**
    - `example-patterns.md` §2 still puts every phone on `type="compact"` and `.pe-phone-cta`.
    - The guideline's HIG "Navigation bars" link now redirects to "Toolbars".
    - The Bottom Navigation guideline lacks "tapping the current tab scrolls to the top" (R14).
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
  - **P3 · Docs frames:**
  - **P3 · HR templates:**
    - Team budgets still scrolls sideways at 390.
    - The "Who's out" chips wrap onto 2 lines.
    - Delete task cannot be reached on a phone.
- **From the example polish pass + its gate (2026-10-01) — RESOLVED 2026-10-01/02 (components, platform.css, data.ts, audit tools by "Add audit check…"). ~~Still open: useChatDemo Delete has a confirm but no Undo toast yet (partly)~~ Undo done (checked 2026-10-07, backlog sweep: chatDemo.tsx:61-73 deleteWithUndo); every line below is closed:**
  - **P3 · rhythm "> 7 text styles in one example"** flags full screens and their overlays (since batch A2 also App Shell "Side panel toggled": the modal aside now renders in the frame): App Shell Banner and HR
    workspace, the Detail, HR Home and HR Expense overview templates, and the My expenses / My leaves panels. A real page
    uses 8 styles (h1, h4, Subheading, body regular/medium/bold, small, caption). Exempt `screen: true` examples and
    templates, or raise their limit.
- **From the AI-readiness re-evaluation of 2026-10-02** (session "Đánh giá khả năng AI với library hiện tại"; blind trial on
  the packed tarball + memory-vs-repo audit; session log 2026-10-02, "AI-readiness re-evaluation"). Proposal, nothing fixed:
  - **P2 · Contrast in light mode (designer decision):** Content/Neutral/Tertiary #828282 on white 3.84:1 (ListItem and
    Table captions, chart axis), Table header 3.78:1, tonal destructive Button 3.8:1; every app inherits them (axe AA). **Sweep 2026-10-07:** the Tabs inactive label, Light kickers and Table headers (3.74–3.79:1) and the Danger button text (3.74:1) from the Studio polish list are the same question.
  - **P2 · Memory-only rules → repo:** token-sync gotchas (skills/zen-token-sync points to private memory), playground empty
    slots, backup naming on APFS; 15 more rules are documented but unchecked (elevation follows Sidebar, grouped lists,
    table without container, phone Chips not Segmented…). **Batch C 2026-10-07:** the token-sync gotchas are in
    skills/zen-token-sync now. Still open: the playground empty-slot and APFS backup notes live in the Mac's memory
    (not readable from a cloud session), and the unchecked rules (see the Container+Table rule row).
  - **P2 · Distribution:** `private: true`, 22 local commits not pushed, CI never ran; apps outside this Mac cannot install. **Sweep 2026-10-07:** done: the branch is pushed and CI runs (its Package failure is the CI row at the top of the Backlog). Still open: `private: true` (a decision: publish, and where).
- P3 (2026-10-03, session "Component Theme tokens update"): re-capture the Input/Search contracts. `figma-kit status` on
  Field-Only, Text-Area, Search/Popover, Search/Default, Autocomplete-Field and Text-Field: 152 variants differ. Real
  rebindings: Focused/Typing → `Input/Border/Focus` / `Input/Border/Popover-Search` (code follows), Search/Popover Hover
  1 → 2px (code follows), Disabled → `Input/Border/Disabled`, `.Primitives/Input/Text-Area` fill/stroke now
  Input/Background/Default + Input/Border/Default. The rest are stale token values (Corner-Radius/Input/Small 8 → 12,
  Caption 10 → 11, XLarge tracking). No suite maps these strokes; use `tools/figma-kit` fetch + patch.
- P3 (same session, for the designer): ~~Neutral-S7 focus is faint by design~~ — resolved 2026-10-03 evening: the designer
  set `Input/Border/Focus` in Neutral-S7 to Focus/Neutral/Solid (export synced). Still open: `Input/Border/Popover-Search` stores "Focus/Neutral/Solid at
  opacity 0" in S1–S6, which the export writes as `#NANNANNAN`: a plain transparent value would export cleanly. Also
  `.Primitives/Input/Text-Area` Focused has a 2px Focus/Neutral/Subtle outer ring, Field-Only a 3px
  Border/Active/Neutral/Subtle one (code uses the 3px ring on both).
- P3 (2026-10-03 evening, gate .qa/reports/2026-10-03T15-03-53-5b6b7c50.md, not from its token change): new behaviour ⚠
  deadclick chat@1512 "Chats inbox" — `button.zen-list-item__wrapper` "Hana Kim …" click had no visible effect. The
  gate's first run also hit a flaky `tests/scale.test.tsx` Rating xl/xlarge mismatch (star 1 `data-filled`), green alone
  and on the rerun.
  Seen again 2026-10-05 (gate .qa/reports/2026-10-04T18-19-01-8298399d.md, TopNavigation dual action); a manual click
  on Hana Kim opens the thread with its header, so the probe likely races the open (peers' HMR running at the time). Again
  2026-10-05 (.qa/reports/2026-10-04T18-56-56-1c7e4092.md, Chat composer radius, CSS only). **Sweep 2026-10-07:** done: the flaky scale test renders inside `pointerEvents: "none"` (tests/scale.test.tsx:58). Still open: the probe should skip the already-open "Hana Kim" row. Same class (batch A2 gate): app-shell@1512 "Search in the top bar" — the bell "Activity, new" goes to the Activity page the probe already opened through the Sidebar, so it changes nothing.
- P2 (2026-10-03, session "Slot Component phân biệt"): Figma file — set `Bubble-Chat-Others-Business/Background/Default`
  to Color/Background/Surface/Default in all nine Component Theme modes (repo changed at the user's request); the next
  Component Theme sync reverts it otherwise.
- **Done (checked 2026-10-07, batch 5a):** the Effects section and Corner radius (independent corners) were built in `appearance/AppearanceSection.tsx` (E2E AP-01…03); this batch added the spec's Effect settings (the style's layers, read-only) and the read-only theme effect of Card / MetricCard / ChartCard (E2E AP-05, AP-06). The resize "inset" kind stays a question for the resize owner. Was: ~~P2 (same session): Studio Phase 2 UI not built yet — Effects section (session eye), CornerRadiusField (the Position
  section was built 2026-10-04, see below); waits for the inspector owner's ScaleField + `FieldApi.apply` response
  (`docs/research/studio-position-effects-radius-spec-2026-10-03.md` §4, §6 C–E). Also resize.ts: an "inset" kind for
  absolute layers (ask the resize owner).~~
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
- P3 (2026-10-03, session "Figma-like editing functionality"): multi-selection follow-ups — arrow keys and dragging move
  one layer only (several: one at a time); Mixed properties cover variants and booleans (not text, number, spacing or
  text style); ⌘D on several selects the first copy only (op many answers one loc); copying layers from two files is
  refused ("one example at a time"). **2026-10-07 (backlog batch 5c):** done: the arrow keys on several layers of one
  parent (K-13) and Mixed text props (I-16). Still open: dragging several, Mixed number / spacing / text style, ⌘D's
  first copy only, two files.
- P3 (2026-10-04, same session): ⌘C/⌘V of a stateful item into another file is refused (its state names are not bound there); the clipboard could carry the item's `state` like the Assets path does (edit/clipboard.ts pasteAt).
- P3 (2026-10-04, same session): a stateful item inserted into a `.map` row (Studio "Repeats N×") shares one state across the rows, so every row's Dialog opens together; per-row state needs a row component.
- P3 (2026-10-04, same session): Popover is the one DS component the slot palette does not offer (it needs an anchor `useRef`); stateFor could declare refs the way it declares useState.
- **Studio UX/UI audit (2026-10-04, session "Kiểm tra stack hiện và ẩn toast"; read-only; evidence and fixes in
  `docs/research/studio-ux-audit-2026-10-04.md`). Proposed for approval:**
  - P3 · Polish N1–N11 in the report (flat 56-item Pages list with one icon, triple page name, rule notes in the size
    badge, duplicated bound props, double import in Snippet, Shortcuts dialog layout, Modes subtitle, raw layer names,
    ⌘/Ctrl hint, 11px nav labels, 592px of side panels).
- P3 (2026-10-04, session "Mở lại port preview", Studio data slots): the Layers panel lists no data-slot items (Figma shows
  the Action instances inside Trailing-Slot) and the canvas draws no outline or + chip for a data slot (SlotLayer knows
  content slots only); the Slots section and the item panel are the way in for now.
- P3 (same session): only TopNavigation is in `slots/dataSlots.ts`; other Figma slots the code takes as data (BottomNavigation
  items, ActionBar actions, Breadcrumbs items…) could join after a Figma SLOT-property check.
- P3 (2026-10-07, backlog batch 5a) · A Studio E2E run cut off during D-02 (the gate's time limit) leaves `src/platform/examples/e2e/StudioSaveFixture.tsx` saved with its edit, and the next run fails D-01 ("Unsaved · 1 file": the edit equals the disk). The harness could restore the save fixture from git at start. Pointer: `tools/studio/e2e/run.mjs`, rows D-01/D-02.
- P3 (2026-10-07, backlog batch 5a) · The Studio E2E matrix (147 rows) runs about 15 min; the gate step's limit went from 15 to 25 min after a run was cut off at 900 s. Shard it (groups across two servers) or run a changed-groups subset before it outgrows 25. Pointer: `tools/qa/run.mjs` "Studio E2E", `tools/studio/e2e/run.mjs`.
- P3 (same session): the Studio E2E server watches the shared tree, so peers' edits to Studio files mid-run cause hot-update errors; rows retry once on a fresh page ("passed on retry" in the evidence). A run in a quiet window gives the cleanest matrix.
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
- P3 (2026-10-06, same session): **elevation in shells** — alert-banner Billing card (`alert-banner.tsx` ~134,
  theme border) and breadcrumbs Top bar trail card (`breadcrumbs.tsx` ~201, theme border) sit in AppShells on
  Canvas/Default: check each Sidebar's style; a shadowed Sidebar means Shadow cards (elevation follows the Sidebar).
- P3 (2026-10-07, batch A1 gate, audit §16 `roles` warn) · Card page "Workspace plan" (`section.px-card-plan`) and the Sign in template card are Surface/Default with a shadow on Canvas/Default: make them flat or say which pairing they follow.
- P3 (2026-10-06, same session): **Card Flat has no hover/pressed** when clickable (`card.css` only styles Border's
  interactive states), so clickable cards stay `theme="border"` under §16; a Flat interactive state would let them
  follow the default mood.
- P3 (2026-10-07, backlog sweep) · Stale leftovers seen while verifying: the comment at `src/platform/appLayer/layout.tsx:156` still says example cards force a breakpoint; the zen-allow at `src/templates/DetailTemplate.tsx:271` is no longer needed (`table/title-heading-4` accepts Subheading in a Card); the behaviour baseline's chat focus-ring entries and `quality-baseline.json` (only 2 of its 24 fit findings remain) look stale.
- P3 (2026-10-07, backlog batch 8, found by the fixed qa step ④) · Example coverage gaps on the rebuilt pages: side-panel (edge cases, mobile), sidebar (states, mobile), tooltip (mobile). side-panel and tooltip have no phone example by design (their file headers say so), so the matrix warns each time they are edited: add the missing examples in an approved batch, or give run.mjs a per-page "no phone by design" exemption. **Decided 2026-10-07 (user):** side-panel needs no mobile example (run.mjs NOT_APPLICABLE, done); sidebar and tooltip do need one (tooltip.tsx's "no phone example on purpose" header is overruled) — not built yet. Sidebar on a phone: the floating drawer that slides in and out, as AppShell's drawer layout does (user). **Tooltip done 2026-10-07:** `closable` + `defaultOpen`/`onOpenChange` (Figma Close boolean added to Tooltip 1595:2220 by the same session) and the "A tip on a phone" example. Sidebar done 2026-10-07: "On a phone" (AppShell drawer in PlatformPhone); the drawer now keeps the safe areas clear.

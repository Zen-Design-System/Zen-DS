# Zen DS — open questions

Vietnamese translation: [`QUESTIONS.vi.md`](QUESTIONS.vi.md) (keep both in step). Questions only the designer can answer (Figma) and decisions only the user can make. Code keeps its current behaviour
until each is answered; an answer turns into work in `BACKLOG.md` (or is fixed at once). Moved out of `BACKLOG.md` on
2026-10-08.

## For the designer (Figma)

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
  - **Segmented (P2):** ~~Item Medium / Secondary / Selected (and the set's Item-1) binds Tag/Background/Default~~
    (resolved: the 2026-10-23 capture binds Segmented-Item-Secondary/Background/Seclected/Default, as code; contract suite
    `segmented-item.mjs`, 2026-10-24). Also: code has a Disabled state Figma lacks; the `*/Seclected/Hover` and Secondary Border tokens
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
  - **From the contract suites, batch 2 (2026-10-24; each is a `figmaExceptions` entry naming code's value):**
    Chat Desktop Hover toolbar icons are 20px Content/Neutral/Base while Button/Icon-Flat Small Secondary binds 16px Light
    (an icon swap that dropped the bindings?), and the reaction pill is a 24px circle where Apple's emoji is 20px wide (28 in
    code); Badge Sky / Mint Solid Remove binds On-Colors (white) beside On-Brights labels, On-Color Remove binds
    Neutral/Strongest (white in dark on a white badge), Badge-Counter Medium pads Subtle 8 / Solid 4; Avatar: four
    variants lack a Focus-Ring, Medium Square Violet's ring binds Rounded, Large Square Solid roots bind Corner-Radius/Large
    (fill and Subtle: Base), square Status dots bind the square's corner token, Medium squares inset the dot differently
    per background; Table Photo-Cell is a bare rectangle (code: Avatar Square with its rings), Group-Avatar-Cell is FIXED
    60px in a 28px slot; Input Leading-Trailing Medium icon + chevron without a label gaps 4 (8 elsewhere), Select / Date /
    Number Small root gaps Gap/XSmall 8 where Text-Field and Text-Area bind Outside-Field-Gap 4, Select Small's chevron is
    20 (Date and Field-Only 16), Number-Center's − stepper icon is 16 Strongest (+ and Number-Left: 12); DatePicker Item
    binds the selected day's dot Inverse/Strongest (Event-List and Mobile: Content/Selected), the Single and Mobile
    calendars draw weekend days as Default, Time-Picker Range From is fixed 64 where To hugs 52; Sidebar Menu-Item Child
    rows pad 1px (code: 2px apart), the Small-Density rail's Header and Search hug and centre, the Workspace name sample is
    Heading/Subheading (code Heading/4, 4233:5950), Section-Title has a Hover fill though it is not a control.
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
- **P2 · Designer questions (Figma data kept literally):** Metric-Trend Medium badge + 24px gaps and a down arrow on
  Positive only as an instance override (Total Expenses) — add a Size to the component?; Remaining Budget
  "Bar-Quota" is raw frames (Violet on Neutral Subtle, legend dot Neutral) — make it a ProgressBar (needs Violet)?;
  Leave Types header "Type" twice, row 3 "Annual Leave" 🥵 Unpaid; Pending $229.00 vs rows $112.50; "$5.4k" vs
  "$5.4K"; Expenses/Workbench "Configurations" drawn collapsed with no children; "Hight" typo; Figma flag names
  "Uzbekista N", "andorra", "Marshall Island", "Sao Tome and Prince".
- **P2 · Contrast in light mode (designer decision):** Content/Neutral/Tertiary #828282 on white 3.84:1 (ListItem and
  Table captions, chart axis), Table header 3.78:1, tonal destructive Button 3.8:1; every app inherits them (axe AA). **Sweep 2026-10-07:** the Tabs inactive label, Light kickers and Table headers (3.74–3.79:1) and the Danger button text (3.74:1) from the Studio polish list are the same question.
  **Added 2026-10-23 (from BACKLOG):** the Popover label `.zen-popover__label` ("Select an option or create one" in
  PopoverManualAddNew), Content/Neutral/Light #838383 on white at 12px = 3.75:1, baselined in
  `tests/smoke/axe-baseline.json`: keep, or Content/Neutral/Medium? Since 2026-10-19 the user judges contrast by APCA,
  not fixed WCAG ratios (High Contrast mode covers strict needs), so the answer may be "keep" for all of these.
- **List-Box master (user decision 2026-10-08: code stays):** in Figma the variants have a FIXED height and
  Header-Slot / Footer-Slot centre their content; code hugs its rows and left-aligns header text and footer actions.
  Ask the designer to update the master to Hug and left alignment.

- **Side-Panel (P3, 2026-10-12):** the hidden Back-Container (1573:3127 and the other 3 variants) reports 32×32 while
  its padding 2XSmall + 20px Wrapper make 28×28 (the Modal Close-Container beside it is 28). Code draws 28, like the
  close. Is 28 meant? Also: the Modal heading icon (Icon-Wrapper) was removed; code keeps `icon` as deprecated until
  confirmed.

- **Voice (P2, 2026-10-13, review `docs/research/voice-usability-review-2026-10-13.md`):** (a) AI Voice Conversation
  has no Thinking state between Done speaking and the first spoken word — add a variant? (Code has `state="thinking"`
  since 2026-10-23: the 96px signal on Accent/Subtle with five 4px dots that brighten in turn, badge "Thinking",
  heading "Thinking it through"; Figma's variant can copy or replace it.) (b) the Responding heading
  "Here's what I found" does not fit actions or small talk — a neutral default? (c) Mute on uses the tertiary Pressed
  look in code; Meet/Zoom use a negative one — keep Pressed or Danger/Subtle? (d) Chat/Bubble/Voice Social shows no
  length (Business does) and no unheard marker; (e) a Paused playback row for VoiceRecorder (listen before Finish)?

- For the designer, one review (moved from `BACKLOG.md` on 2026-10-23, triage group G1; code keeps its current
  behaviour until answered):
  - **Calendar/Toolbar Mobile in the Mobile typography (P2, 2026-10-21):** Figma drew the Mobile variant (16125:399) in
    the desktop type sizes; with Mobile typography Heading/3 is 26px, so "September 2026" (~200px) and a fourth view
    label ("Agenda") no longer fit 358px beside Today and the arrows, in Comfortable density. Code: the mobile toolbar's
    default title is the short form ("Sep 2026"), and the phone example offers three views. Keep the short title, or
    another style / layout? Pointer: `src/components/Calendar/CalendarToolbar.tsx`.
  - **Metric Title-Highlight slips (P3, 2026-10-17):** in 7523:507049, the Header gap of 12 is unbound (should be
    Spacing/Gap/Small) and Medium's Metric-Number has paragraphSpacing bound to Font-Size/Heading-3 (session log
    2026-10-17, "Metric-Inline/Title-Highlight"; the Custom-Slot padding is fixed).
  - **Navigation-Mobile/Top/Action-Icon-Gap is 20 (P3, 2026-10-15):** Component Size spacing now aliases
    Spacing/Gap|Padding, but the Gap ladder has no 20 (16 Medium, 24 Large), so this one stays on `dm-20`. Keep, or move
    it to a Gap step (a visible change in Top Navigation's flat icon actions)?
  - **Bottom-Navigation surface (P2, 2026-10-13; re-checked 2026-10-23):** Patterns/Sidebar takes Theme · Density ·
    Shadow since 2026-10-21 (#181) and Top-Navigation/Mobile has Type=Transparent / Transparent-On-Color since
    2026-10-17. Left: Bottom-Navigation has no surface choice and its main carries an unstyled drop shadow (not re-read
    since 2026-10-13). Screens override by variable until then (screen-rules §1).
  - **Side-Bar/Master/Small-Density is named "Component" (P3, 2026-10-23, contract re-read):** the set 5974:20590 on
    ❖ Sidebar (key 1cca393d…, Expand Yes/No) lost its name; no other set has it. The push imports it by key
    (library-keys.json) so it still lands, but a pull or a component-properties re-capture matches sets by name
    (`tools/studio/figma-props.map.mjs` Sidebar `Side-Bar/Master/Small-Density`). Rename it back, or say it is retired.
  - **Library gaps the 438-page Studio → Figma test found (P2, 2026-10-18):** (a) Accordion/Text has no content slot, so
    an open Accordion's content cannot be drawn (the push notes it); (b) Dock-Icon has Theme=Emoji only at Medium and
    Large (the HR templates use XSmall in table cells: the default variant shows); (c) Chat/Section/Read-List Seen
    by=5+ holds four Avatars after "+N" where Chat.tsx draws five (the push writes four). Pointer: session log
    2026-10-17 "Studio → Figma test run", figma-push.mjs chatMessageNode.
  - **Android system bars (P2, user 2026-10-10):** the Studio's Android Screens draw a Material 3 status bar (24) and
    gesture handle (108 × 4, 10 from the bottom) with dummy icons (builder/proto/DeviceBars.tsx); the Zen file's
    ⚙️ Operation Components has only Status-bar/IOS/Mobile, /Tablet and System/Bottom-Indicator. Add
    Status-bar/Android/Mobile (+ Tablet) and an Android navigation bar there; then the code follows those nodes.
  - **Layers left unnamed (P3, 2026-10-12):** the nested layer-name gate (`tools/figma-contract/nested-paths.mjs`,
    44/44 components since nested-layers.json) allows code names Figma has no layer for: unnamed instances that carry
    their component's name (AiChatField's three action buttons, AlertBanner / InlineMessage / Toast / ChatCall actions,
    Pagination's Previous / Next / page-size chip, SidePanel's close button), icons named after their glyph
    (AlertBanner, Dialog, SidePanel, EmptyState, Tabs), and Figma names that differ from Zen's, which the code keeps
    (user, 2026-10-12): Empty-State's buttons unnamed inside CTA (code `Primary` / `Secondary`), Modal/Forms' action
    row `Footer › Buttons` (code `Actions`, as Dialog and Side-Panel), Bottom-Navigation Floating's `CTA` (code
    `Action`), Inline-Message's `Icon-Wrapper › Icon` / Custom `Visual` slot and Toast's `icon-Container › Icon` (code
    `Leading`), Chat-Control's trailing send instance `Main` (code `Send`). Naming them with Zen's names lets the gate
    check them and a Studio page's overrides land in Figma by name. Pointer: `ALLOWED` in nested-paths.mjs.
  - **Charts (P2, merged from four entries of 2026-10-13 … 10-18; Figma not edited):** (a) parity: active X pill (20px
    hug, Medium vs sector-wide 16px Bold), 88% dim of inactive columns, Bar label padding / thinning, Tooltip anchor and
    lanes, bar lanes 38/26 vs 36/28, horizontal / heatmap axis gaps 8 vs 16, Heatmap density token, Chart Card
    description gap; Figma lacks the Line / Multi-Line active dot, Area Stacked and Grouped / Combo active states,
    Radial default variant (`docs/research/chart-parity-audit-2026-10-17.md` §2–§4). (b) Slips from the widgets batch:
    Bar-Chart Vertical `Average › Rule` 15335:2421 strokeCap NONE (no dots); Segmented `Item-List` FIXED 114 in Line,
    Stack-Bar, Multi-Line, Chart-Card and Heatmap (labels overlap); Area fills bound to Background/Accent|Neutral while
    lines use the Chart Sector styles; Solid hue cards: the series in the card's own hue uses Brand in code
    (On-Color/Tertiary washes out as an area); no Border/Inverse/Pale|Subtle token; Metric-Card Hero keeps a Brand Pale
    fill override on a Solid Brand Card (`docs/research/widget-patterns-spec-2026-10-14.md`,
    `chart-phase2-spec-2026-10-14.md` §4). (c) Bar, Donut, Radial, Heatmap and Multi-Line draw their own
    Surface/Default card, so they cannot take Card Theme / Color like the card-less new charts: align them? (d) Beside a
    taller LineChart card (Grid stretch) BarList's 5 rows sit ~72px apart: hug at the top, or fill as now?
    (`docs/research/studio-vibe-agent-2026-10-18.md` §7) (e) From the chart contract suites (2026-10-23, the
    `figmaExceptions` of `tools/figma-contract/suites/chart-*.mjs`): Radial Large's centre figure is Display/4 where
    Donut Large keeps Heading/4 (code: Heading/4 for both, Display/4 at XLarge only) — which one? Figma slips to fix:
    Bullet Rows SPACE_BETWEEN in a set fixed 16px short (goals 8px apart, Gap/Medium bound); Gauge frame fixed 2px
    taller than its content; Grouped-Bar and Combo 6-Sectors size bars from the whole column (the other Sectors from the
    column inside its 2px padding); Heatmap rows 21.6px under 24px cells; Radial XLarge keeps Medium's fixed 84px
    caption; Stack-Bar's fourth segment (the Value-Sector instance) alone carries Effect/Overlay; Multi-Line shows two
    active periods (the selected sector and the Compare layer's Active frame on the last one).
  - **AI UI, Figma first (P2, merged from six entries of 2026-10-14/15; `docs/ai-ui/README.md`):** (1) a tentative look
    for a guessed form (ShapeShift: the form faded, empty slots as dashed "+ Add date" chips); Zen has no tentative state
    or token (Chip `state="placeholder"` only recolours the label). (2) The recognised span underlined in the prompt
    field: `extractSlots` returns the `spans`, but `AiChatField` is a plain textarea (an overlay or a contenteditable,
    tier M). (3) "AI glow" gradient tokens for the "AI is working" orb (demo CSS `.px-ai-ui-orb` in
    `src/platform/examples/pages/ai-ui.css`, from Support Pink / Violet / Cyan); `tokens.css` has no gradient token; if
    the orb stays it becomes a component (AiChatBubble `thinking="orb"`?). (4) A 4-column Table in a 600 / 390 px chat
    column needs ~608 px and scrolls sideways in its own box (`tests/ai-ui/narrow.test.tsx`): keep, or a compact mode
    that folds columns? (5) Prose has no code block: `markdownToSpec` renders fenced code as `Text as="code"`; no mono
    text style or CodeBlock / Prose component. (6) A Keycap (Kbd) for keyboard hints ("Tab to keep as booking"; the
    demo uses Tag).
- **Card and Table hover (2026-10-24; from the triaged backlog, the user sent both here; code unchanged until answered):**
  (1) Card Theme=Default (Flat before #210) has no Hover or Pressed variant, so a clickable Default card in code shows no
  state change while Border and Flat-Border darken their stroke (`card.css` ~175). Add Default Hover / Pressed (a
  Neutral/Flat/Hover tint, as other no-fill surfaces take)? (2) A Table row with no `onRowClick` still takes Table/Cell
  Hover in code (`table.css` ~57). Is Cell Hover for every row (Figma's Table/Cell/Default State=Hover), or only rows
  that open, select or edit something?

- For the designer, one review (moved from `BACKLOG.md` on 2026-10-24, triage of the planned backlog; code keeps its
  current behaviour until answered):
  - **Dock-Icon Solid Sky / Mint / Yellow icon colour (P3, 2026-10-05):** these fills draw white icons (On-Colors,
    1.6–1.8:1) while Avatar and Badge use On-Brights on the same fills. Switch Dock-Icon to On-Brights? Code follows
    Figma (`dock-icon.css` ~48, ~60).
  - **Emoji Dock-Icon XSmall (P3, 2026-09-30):** the emoji glyph is 12px in code against Figma's 28px (`dock-icon.css`
    ~20–27). Which is right for XSmall?
  - **HR Tasks frames vs the components (P3, 2026-09-30):** Box has neutral surfaces only while the Kanban columns use
    Support/Subtle colours: add coloured surfaces? Card Spacing Small pads 16 where the ticket pads 12/12; ModalForm Big
    is 960 against the frame's 800, and the frame has an action icon (Attach File); TextAreaField is 112 against 240;
    ProgressCircle Done is a disc with a check in code and in Progress-Circle/Icon, a full disc in the Tasks frame; the
    flag text tone is Base against Light; PageHeader's title-to-meta gap is 12 against 8 (it has no title chevron now).
    Which are variants or local overrides, and which should the components follow? The All Tasks Calendar / Gantt tabs
    wait for frames (user 2026-09-30: "Chờ thiết kế"); Calendar (#180) and Timeline (#198) exist now to draw them from.
  - **EmptyState in a Card (P3, 2026-10-02):** no top padding and 48px at the bottom (`empty-state.css` ~10), so it sits
    lopsided in a Card. Intended?
  - **Input borders (P3, 2026-10-03 and 10-13):** `Input/Border/Popover-Search` still stores a NaN colour in S1–S6 (read
    2026-10-24; S7 aliases Focus/Neutral/Subtle), which the export writes as `#NANNANNAN`; a plain transparent value
    exports cleanly. `.Primitives/Input/Text-Area` Focused has a 2px Focus/Neutral/Subtle ring, Field-Only a 3px one;
    Text-Area's Inputted-Error / Blank-Error border is Color/Border/Negative/Solid/Default, Field-Only's
    Color/Focus/Negative/Solid (the same colour). Code uses the 3px ring and Focus/Negative on both: align Figma?
  - **Card Default hover / pressed (P3, 2026-10-06):** the Default theme (Flat before the 2026-10-22 rename) has no
    hover or pressed state, so clickable cards stay bordered. Draw them? (BACKLOG "Card states")
  - **Table row hover (P3, 2026-10-01):** rows of a table with no row action still show the hover fill. Does Figma's
    Cell Hover apply to clickable rows only? (BACKLOG "Table follow-ups")
  - **HR template pages use 9 text styles (P3, 2026-10-08; baselined 2026-10-21):** HR · Home, My leaves and Expense
    overview each use 9, where the audit's [rhythm] check allows a full page about 8 (the lists are in
    `tools/platform-audit/quality-baseline.json`; Home: Body/Base/Regular, Heading/1, Heading/4, Body/Small/Regular,
    Heading/Subheading, Body/Small/Bold, Body/Base/Bold, Body/Extra/Medium, Display/4). Do the HR-Platform frames use as
    many (accept), or which style should each page drop?
  - **Fix in Figma (P3, 2026-10-06):** the Demo page's List composition 14730:79268 ("My Leaves") still has the old List
    padding (12 top / bottom, 0 sides, gap 2); with the new master its rows touch the frame sides and the fills overlap.
  - **Avatar Status (P3, 2026-10-24, AvatarStatus):** (a) Fix in Figma: .Primitives/Avatar/Status 217:7418 XSmall and
    Small Disabled bind Color/Background/Solid-Disabled-Alt (VariableID:7286:1241, Light/Neutral/4), a variable deleted
    from Mode Colors (Semantic); Medium and Large bind Solid-Disabled, which code uses at every size (a figmaException in
    `suites/avatar-status.mjs`). Rebind them, or restore the variable if Disabled should be lighter on small dots?
    (b) What do Disabled, Pending and Inactive mean for a person? Screen readers say the Figma words ("Disabled",
    "Pending", "Inactive"; Active reads "Online"); the Member access example reads them as an account turned off, an
    invite not yet accepted and no sign-in for 90 days. Name the intended presence (offline · away · busy?) if different.

## For the user (decisions and actions)

Answered on 2026-10-09: selecting on the canvas follows Figma's click (a click selects the outermost layer in context,
a double-click goes one level in, ⌘-click the deepest), done the same day (`select/clickTarget.ts`).

Answered on 2026-10-08: no LAN access (`server.host` stays off); Code view languages in the order HTML/CSS → Vue →
Swift → Flutter → Svelte, on hold for a later phase (BACKLOG); read-only fields already show a focus ring (input.css, since 2026-10-06);
List-Box: code stays, the designer updates the master (above); Studio polish N1–N11 later (BACKLOG).

- **Later (user, 2026-10-08):** Platform chrome: "Download Figma" (overview + sidebar footer) and "Feedback" have no destination, so
  `interaction/action-without-handler` keeps them as its 3 warnings. Waiting on the user for the URLs.

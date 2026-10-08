# Zen DS — open questions

Questions only the designer can answer (Figma) and decisions only the user can make. Code keeps its current behaviour
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
- **P2 · Designer questions (Figma data kept literally):** Metric-Trend Medium badge + 24px gaps and a down arrow on
  Positive only as an instance override (Total Expenses) — add a Size to the component?; Remaining Budget
  "Bar-Quota" is raw frames (Violet on Neutral Subtle, legend dot Neutral) — make it a ProgressBar (needs Violet)?;
  Leave Types header "Type" twice, row 3 "Annual Leave" 🥵 Unpaid; Pending $229.00 vs rows $112.50; "$5.4k" vs
  "$5.4K"; Expenses/Workbench "Configurations" drawn collapsed with no children; "Hight" typo; Figma flag names
  "Uzbekista N", "andorra", "Marshall Island", "Sao Tome and Prince".
- **P2 · Contrast in light mode (designer decision):** Content/Neutral/Tertiary #828282 on white 3.84:1 (ListItem and
  Table captions, chart axis), Table header 3.78:1, tonal destructive Button 3.8:1; every app inherits them (axe AA). **Sweep 2026-10-07:** the Tabs inactive label, Light kickers and Table headers (3.74–3.79:1) and the Danger button text (3.74:1) from the Studio polish list are the same question.

## For the user (decisions and actions)

- `server.host: true` for LAN access: waiting on the user.
- Code view in other languages (Vue, Svelte, HTML, Swift, Flutter; today "Coming Soon"): plan
  `docs/research/code-languages-plan-2026-10-03.md`, waiting on the user's decisions in its §8 (web strategy, which
  languages and in what order, the dropdown until then). Examples get every language too (user, 2026-10-03; §4, P2b).
  Nothing built.
- Read-only fields show no focus indicator (behaviour warn "while read-only": dialog, inline-message, side-panel,
  tooltip, visually-hidden). Waiting on the user: give them the error state's fix, or keep them as they are.
- Platform chrome: "Download Figma" (overview + sidebar footer) and "Feedback" have no destination, so
  `interaction/action-without-handler` keeps them as its 3 warnings. Waiting on the user for the URLs.
- **P3 · Figma List-Box master (2026-10-06):** variants have a FIXED height (instances with fewer rows keep empty space
  until set to Hug) and Header-Slot / Footer-Slot centre their content, while code left-aligns header text and footer
  actions; ask the user whether the master should hug and align left.
- **Studio UX/UI audit (2026-10-04, session "Kiểm tra stack hiện và ẩn toast"; read-only; evidence and fixes in
  `docs/research/studio-ux-audit-2026-10-04.md`). Proposed for approval:**
  - P3 · Polish N1–N11 in the report (flat 56-item Pages list with one icon, triple page name, rule notes in the size
    badge, duplicated bound props, double import in Snippet, Shortcuts dialog layout, Modes subtitle, raw layer names,
    ⌘/Ctrl hint, 11px nav labels, 592px of side panels).

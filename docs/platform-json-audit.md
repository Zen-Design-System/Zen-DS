# Codebase Platform + component JSON audit

> Historical audit: some measurements below describe earlier implementation snapshots. For new work, verify the exact Figma node and current mode using the [Figma → platform workflow](figma-to-platform-workflow.md); use the [template lock](platform-template-lock.md) for the current shell contract.

## Scope and method

This audit is read-only. It compares the five exported component JSON bundles with the Codebase Platform overview node in the official Figma file (`9nZv4uW2LT21yuHabMTCh1`, node `14243:64878`). The JSON files are treated as design data, not as implementation instructions. No Figma nodes were edited.

The component exports use Figma JSON v3.1 and expose the same useful contract consistently: `componentPropertyDefinitions`, variant names, nested `children`, `boundVariables`, `styles`, `fills`, `strokes`, and `effects`.

| Bundle | JSON files | Main coverage |
| --- | ---: | --- |
| Button-Components | 6 | Main, Flat, Overlay and icon button sets |
| Chip-Components | 4 | Normal, Advanced, Number-only and trailing primitives |
| Input-Components | 19 | Text, Select, Date, Text Area, Number, Heading, Autocomplete, Richtext and primitives |
| Sidebar-Components | 5 | Basic/Workspace/Small-Density masters and menu-item primitives |
| Search-Components | 2 | Default (22 variants) and Popover |
| Chip-Components (re-audit) | 4 | Advanced, Normal, Number-only and trailing primitives |
| Popover-Components | 9 | Default, Bunk-Action, Manual-Add-New and item/search/label primitives |

## Contracts confirmed from JSON

### Button

The shared axes are `Size`, `Level`, and `State`, with boolean `Leading-Icon`/`Trailing-Icon`, text content, and icon swap properties. The exported bindings point to `Button/Size/*`, `Button/Spacing/*`, `Corner-Radius/Action/*`, `Typography/Font-*`, `Emphasis/Font-Weight/Bold`, shadow tokens, and focus tokens. The React API therefore keeps `size`, `level`, `state`, `startIcon`, `endIcon`, and `disabled` as the primary mapping surface.

### Chip/Pill

`Chip/Advanced` adds `Counter`, `Select`, `Theme`, `Level`, `Size`, and `State`; `Chip/Normal` adds an icon source property; `Chip/Number-only` removes the text/icon slot. The JSON binds chip spacing and size tokens, secondary background/border tokens, tertiary shadow, and Body/Small or Caption text styles. These are represented in the platform examples as separate advanced, normal, and number-only rows rather than a single visual approximation.

#### Live Advanced contract re-read (2026-09-23)

The live component set `Chip/Advanced` (`9nZv4uW2LT21yuHabMTCh1`, node `512:7659`) and `.Chip/Trailing` (`333:82245`) were read with Figma Design-to-Code MCP. The trailing set is explicit: `Select Type=Single` renders the X-circle icon; `Select Type=Multiple` renders a dark Counter badge (16px Small, 20px Default). The platform interaction contract is therefore: a single-choice filter keeps the header-chip chevron behavior; a multi-choice filter with one selected option renders the single X trailing, while two or more options render the Multiple counter and swap to the X trailing on trailing hover/focus. Clicking the chip body opens the shared Popover and keeps it open while options toggle; clicking the trailing control only clears the filter. This is an adaptation of the existing Chip + Popover owners, not a new page component.

The re-audit of the exported variants confirms the side-padding matrix. Advanced uses `Horizontal-Padding` on the left and `Customized-Padding` on the right for Text-Only, `Customized-Padding` on both sides for Leading-Icon, and `Minimum-Padding`/`Customized-Padding` for Leading-Photo. Normal uses Horizontal/Horizontal, Customized/Horizontal, and Minimum/Horizontal for the same three themes. Number-only has a fixed `Chip/Size/*` width and zero horizontal padding. Unselected icon vectors bind `Color/Content/Neutral/Light`; selected leading icons bind `Chip-Secondary/Content/Selected` or `Chip-Primary/Content/Selected`. Normal Select does not add a trailing close icon; only Advanced uses the `.Chip/Trailing` primitive.

### Input

The input exports contain the widest state surface: default, typing, focused, inputted, view-only/read-only, and error states, plus leading/trailing boolean or variant properties on Select and Date. The key bindings are `Input/Shadow/Base`, `Input/Shadow/Strong`, `Effect/Input`, `Input/Border/Default`, `Color/Focus/Neutral/Solid`, active border tokens, input size/spacing tokens, and Body/Base, Body/Small, and Caption text styles. This is why the platform Input page uses the canonical field components instead of ad-hoc HTML controls.

### Sidebar

The Basic master has slot properties for header/body/footer, `Sub-Item`, `Sub-Menu`, and `Expand`; Workspace adds workspace slots and workspace-bar controls; Small-Density has explicit collapsed/expanded variants. Menu items expose counter, dropdown, label, icon, notification dot, trailing action, density, level, theme, state, and select properties. The medium master item is 44px high with 12px padding, 12px internal gap, and 20px icons; child items retain the tree-line wrapper and a 16px tree-line column. The Basic `Expand=Yes` variant is 260px wide, padded 8px around the content, and uses a 20px surface radius. The implementation now keeps the outer canvas gutter and wraps the actual sidebar content in the surface layer so this structure is preserved.

### Search

`Search/Default` exposes `Size=Small|Medium`, `Theme=Default|Filter-Icon|Filter-Dropdown`, `State=Default|Hover|Focused|Typing|Inputted`, and `Icon-Search=Yes|No`; the export contains 22 variants. Its nested field is 249.6×40px with a 4px internal gap, 20px medium affordance slots (16px small), and the Input medium/radius tokens. The new `Search` component maps those properties directly and is available from the platform sidebar.

### Popover and Input dropdowns

The Popover export is a composition, not a single surface. `Popover/Default` is 240px wide and exposes `Item-List`, `Search`, `Label`, and `Scroll-Bar` properties. Its item primitive is 240×36px, while `Item/Content` supports `Caption`, `Icon-Src`, `Theme`, and `Function` (`Default` or `Manual-Add-New`). `Popover/Bunk-Action` uses the same list with 4px padding, 8px internal gaps, a large corner radius, the Popover background/border tokens, and the Popover effect. The search primitive is 232×32px and the label primitive is 232×32px with 8px padding.

The shared `Popover` implementation follows this nesting and is used by `SelectField`: the native select remains in the DOM for form/ref compatibility, while the visible trigger opens a tokenized `Popover` list. This avoids browser-native dropdown styling that cannot represent the Figma states or effects.

## Codebase Platform structure read from Figma

- Canvas: `Color/Background/Canvas/Default`, 28px root radius.
- Sidebar: 260px outer column, 8px top/bottom/left gutter, 4px gap; inner surface uses `Color/Background/Surface/Alt` and 20px radius.
- Header: 24px top/right, 20px left, 8px bottom; toolbar chips are 40px high, 8px gap, 12px vertical padding, and the Chip secondary background/border plus tertiary shadow.
- Cover: 500px high, accent solid background, 24px radius; title uses TASA Explorer Black at 120px with -4.8px tracking. Platform UI text remains Inter.
- Intro: Display/3 at 40/48/-1.2px, max width 700px, 48px gap before the download Button/Main.
- Download action: Button/Main XLarge, 56px high, 16px padding, 4px gap, action XLarge radius, neutral light shadow.
- Cards: 8-column grid, 16px row/column gap, 24px padding and radius; the card shadow is the three-layer neutral light/strong/base recipe from the Figma node. Placements are Foundation (col 3), Components (col 5), Patterns (col 3 row 2), Resources & Tools (col 5 row 2), and Development (col 4 row 3).

## Implementation decisions

1. The platform root uses the Compact component-size mode because the Figma template's actual sidebar/search/button dimensions are 260/40/56 even though the toolbar displays “Comfortable” as a selectable setting.
2. UI font-family variables resolve to Inter; TASA Explorer is loaded only for the cover title, matching the Figma text styles.
3. The platform's Sidebar is built from the shared `Sidebar` component and now has a dedicated surface wrapper. Search is a shared component, not a page-only mock.
4. Responsive layouts clear the desktop card placement grid below 800px so the Figma desktop coordinates do not overflow on smaller screens.
5. Sidebar alignment uses the exact Figma base body padding (8px), section-label box (32px with 8px/12px padding), and a single 20px header padding source; platform-specific brand wrappers do not add a second padding layer. The body-content gap is page-specific: the overview template uses 8px, while the supplied `Global-Colors` page node `14243:65530` uses `Spacing/Gap/Medium` (16px). It must be read from the exact page instance instead of hard-coded globally.

## Exact page-instance check: Global-Colors (`14243:65530`)

The requested Figma node is the `Global-Colors` page instance, not only the overview shell. Its layer tree confirms the following implementation details:

- Sidebar shell remains 260px wide with 8px outer gutter, 4px shell gap, a 20px rounded surface, and a 20px-padded header.
- This page sets `Body-Content` gap to `Spacing/Gap/Medium` (16px). The base body padding remains 8px.
- The child menu has no inter-item gap. Each child wrapper uses 1px vertical padding, 12px left offset, and a 16px tree-line column with a 2px line positioned at 9px from the sub-menu edge.
- The selected child binds `Color/Background/Active/Accent/Subtle` and `Color/Content/Accent/Strongest`; unselected child content stays on the neutral strongest content token.
- The footer is a separate layer tree: a 1px `Divider` using `Color/Border/Neutral/Pale/Default`, then `Footer-Container` with 8px padding, then `Footer-Content` with a 2px gap. Each footer item is full width with `Color/Background/Neutral/Flat/Default`, 12px padding, 12px internal gap, 12px radius, a 20px icon, and Body/Base/Medium text. The current platform labels map to the Figma `Download Figma` and `Feedback` items.
- Chip toolbar instances use the Figma secondary border (`Chip-Secondary/Border/Default`), tertiary action shadow, 40px medium height, and 20px icon slots. Their unselected leading/trailing icon vectors use `Color/Content/Neutral/Light`; selected vectors use the component's selected content token.

## Reusable execution skill

The repeatable audit/build procedure is documented in [`skills/zen-figma-component-audit/SKILL.md`](../skills/zen-figma-component-audit/SKILL.md). It requires JSON inventory, exact-node `get_design_context`, property/token mapping, implementation through existing primitives, and the complete build/token/style/icon checks before delivery.

## Correction audit — 2026-09-22

Sources re-read: `Chip-Components.zip` (Advanced, Normal), `Input-Components.zip`
(`.Primitives_Input_Field-Only.json`), and `Sidebar-Components.zip`
(`Primitives_Side-Bar_Menu-Item_Master.json`). Version 3.1 variants were expanded
using each `$variantDelta`'s actual base index and all `$patch` entries. Nested
`instanceOverrides`, paint `visible`, and `strokesIncludedInLayout` are part of
the contract; a variable binding alone does not mean a paint is visible.

Live Figma: `14243:65530` returned a large-node layer tree. A second
`get_design_context` read on its Design Tokens item
`I14243:65531;7139:100817;4081:14609;14240:60917` returned full reference code
and a screenshot, confirming 20px icons, Body/Base/Medium 14/20, 12px padding/gap,
and `icon-chevron-down-01-line` rotated 180° when expanded.

### Chip padding and paint corrections

The toolbar passed `leading` without `theme`, so the old default `text-only`
selected the wrong padding rule. Theme now follows the rendered leading slot;
`leading-photo` is explicit. No leading slot means Text-Only. All values below
are compact-mode L/R pixels resolved from `Chip/Spacing/{Size}/*` variables:

| Set / Size | Text-only (Horizontal / end) | Icon (Customized / end) | Photo (Minimum / end) |
| --- | --- | --- | --- |
| Advanced / Small | 12 / 8 | 8 / 8 | 4 / 8 |
| Advanced / Medium | 16 / 10 | 10 / 10 | 4 / 10 |
| Normal / XSmall | 8 / 8 | 6 / 8 | 4 / 8 |
| Normal / Small | 12 / 12 | 8 / 12 | 4 / 12 |
| Normal / Medium | 16 / 16 | 10 / 16 | 4 / 16 |

Advanced's end is Customized; Normal's end is Horizontal. Removed the additional
4px trailing margin: the export specifies only the set's gap (4px small, 8px
medium). The inside stroke is an overlay, not a CSS border that adds to padding
or changes the selected chip's width. Default/focused/placeholder icons use
Neutral/Light; unselected hover/press override them to Neutral/Strongest.
Selected leading content retains its Primary/Secondary selected token.

### Sidebar and platform corrections

The platform button reset overrode the footer's font, and a 20px main-item
wrapper contained a 16px SVG. Lowered the reset specificity and made icon leaves
fill their exported slot. Main/footer now resolve to 44px high, 20px icon,
Body/Base/Medium 14px/20px, weight 500, 12px padding/gap. Small-density icon JSON
also binds Element-Size/Popular/Base (20px). Replaced Unicode arrows with the
existing exported `icon-chevron-down-01-line` SVG (the source vector matches the
JSON's triangular glyph), Neutral/Light, 20px; expanded items rotate it 180°.
Inactive demo groups can now expand too. Added the missing 8px left canvas gutter.
Removed the layout and Home icons from the topbar; sidebar collapse stays in the
sidebar brand. Removed the mobile rule that would otherwise hide the remaining title.

### Input Effect/Input corrections

The old child fill/backdrop layer painted above the parent's inner shadows.
Fill, backdrop and both inset shadows now share one pseudo-element. The second
pseudo-element draws the INSIDE stroke without changing padding. The recipe is
Base: inset 0/0, blur 1px, spread 0, Input/Shadow/Base; Strong: inset 0/0, blur 3px,
spread 0, Input/Shadow/Strong. Light mode resolves them to black 8% / 12%.
The background blur mapping remains CSS blur(20px) for the exported Figma blur 40.

Hover uses Input/Background/Hover and a 2px Input/Border/Hover stroke. Focused/
typing use Input/Background/Focused, 1px Neutral/Solid, and a 3px OUTSIDE neutral
ring around only the control, not its label/help text. Error borders stay negative
even during keyboard focus. Read-only has no effects and its exported fill is
`visible:false`: transparent fill, no blur/shadow, 1px neutral border. Disabled
retains Effect/Input, as the JSON specifies.

### Verification

- Build, token coverage (2364/2364), text styles (35), and icons (1592) pass.
- Browser computed styles confirm matching main/footer metrics, six toolbar chips
  with Leading-Icon padding 10/10 and gap 8, and no topbar context SVGs.
- Real input focus stays 40px high, with the neutral outside ring; focusing an
  error field preserves its negative border. Read-only removes inner effects.
- Added Chip/PaddingMatrix and Input/EffectStates regression stories using the
  shared production components (no separate implementation).
- Measured all 15 size/theme padding combinations in Chip/PaddingMatrix against
  the table above: all match. Measured all nine Input/EffectStates: effect layers,
  visible fills, inside strokes, outside rings and disabled state match the
  decoded JSON contract. Selected secondary chips retain a 2px overlay stroke.
- Build retains the existing large-bundle warning; no bundling changes in this fix.

### Latest Figma/JSON reconciliation (2026-09-23)

- `Component Theme.json` now matches the repository collection exactly (110 tokens). The corrected `Segmented-Item-Secondary/Background/Seclected/Default` alias resolves all five modes to `Color/Content/Inverse/Strongest`; generated CSS was rebuilt for Neutral/Brand S1–S3.
- `Component Size.json` now matches `tokens/source/figma/component-size.json` exactly: 194 tokens in the collection. This adds the six `Button/Icon-Size/*` tokens and mobile top-bar tokens, replaces the two legacy navigator names, and corrects `Button/Spacing/XSmall/Horizontal-Padding` (Compact 6px, Comfortable 8px).
- Button ZIP confirms `Button/Main` and `Button/Icon-Main` expose `XLarge..2XSmall` and bind their icon slots to the corresponding `Button/Icon-Size/*` tokens. Production Button CSS/API now includes `2xs` and consumes the shared Button icon-size tokens rather than Element-Size fallbacks; the slot also overrides standalone Icon aliases so density changes reach the glyph.
- Exact Figma nodes re-read: component header/banner `14260:96956` (400px `_Cover`, 40px inset, neutral pale, 24px radius, 120px TASA title, -2.4px tracking); overview banner `14243:64881` (492px cover); Search inputted `1053:10656`, `1053:9910`, `1053:10676`, `1053:9914`, `1053:9912`; Popover item `4031:26009`, Bunk-Action `9021:28726`, Manual-Add-New `4031:27929`; Date Picker Single-Calendar `895:31954` and primitives `458:34317`, `455:33517`.
- Search inputted variants use `icon-x-circle-solid` clear at 16px Small/20px Medium, with Filter-Icon/Filter-Dropdown trailing glyphs retained. Popover now exposes selected check, Bunk-Action and Manual-Add-New compositions. Date Picker is a shared primitive used by `DateField`; Heading and Input Conditions are shared Input extensions.
- Latest token build generates 2365 tokens across 11 collections. Browser comparison verified DateField → DatePicker open/select (32px navigation, 09/15/2026 value) and Search inputted → `icon-x-circle-solid` clear behavior. Button icon slots were measured at 20px Compact and 24px Comfortable. Dual-calendar, mobile, time-picker and event-list compositions remain explicit follow-up variants from the Figma matrix, rather than being silently approximated by the shared single/range calendar.

### Component expansion and consumer audit (2026-09-23)

- Exact Figma component nodes re-read with `figma-design-to-code`: Segmented `1238:892`, Avatar/Single `223:9050`, Checkbox/Text `309:46871`, Radio-Button `373:96272`, and Badge `260:4825`. The production owners are now `src/components/Segmented`, `Avatar`, `Checkbox`, `RadioButton`, and `Badge`; Platform pages compose those owners rather than page-local markup.
- The Figma axes are represented in the Platform playgrounds: Segmented level/size/value, Avatar size/theme and stack, Checkbox state/side/selection/caption, Radio state/side/selection/caption, and Badge size/theme/background/leading/remove plus Badge-Counter.
- Chip trailing primitives now fill their token slot (`16px` small, `20px` medium) instead of inheriting a smaller standalone Icon alias. Multi-select counters use the shared Badge-Counter owner and switch to the same-size remove glyph on hover/focus.
- Platform Iconography now reuses production Search and Advanced Chip/Popover for icon search and `Icon Size`; the Popover label is the semantic group name `Icon Size`.
- `DatePicker` keeps `showActions=false` by default; `DateField` no longer opts into Cancel/Apply unless `datePickerActions` is explicitly true. Popover and Date Picker retain the tokenised 1px subtle stroke.
- Platform code previews are open by default. React is the reference code; Vue, Svelte, HTML, Swift and Flutter are visible as Coming Soon choices. JetBrains Mono remains platform-only.
- Sidebar's shared API retains the Figma `collapsed` variant; the Platform shell passes `collapsed=false` by default while the component page exposes the variant for verification. Platform component items continue to use `icon-cube-line`.
- Verification: `npm run tokens:check`, `npm run styles:check`, `npm run icons:check`, and `npm run build` pass. Browser checks confirmed Popover label `Component Size`, Iconography Search/Chip controls, and Chip trailing computed `16×16px` icon slots. Remaining Figma matrix gaps are the previously documented Date Picker dual-calendar/mobile/time/event compositions.

### Continuation verification (2026-09-24)

- Shared page hero now accepts explicit `titleLines`; the Sidebar page uses the Figma-style `Patterns/` / `Sidebar` break instead of allowing the 120px heading to overflow the 400px cover. Input, Search, Avatar, Chip, Sidebar and Overview were opened in the local platform at the reference shell viewport and their accessibility trees contain the production owners and expected playground controls.
- Re-read `Button_Icon-Main.json` variant patches: Icon-Main container padding is 16px for XL/L, 12px for M/S and 8px for XS/2XS; icon slots are 28px (XL), 20px (L/M/S) and 12px (XS/2XS). `button.css` now maps those padding bindings by size instead of applying one 12px value to every icon button.
- Component page controls remain single-preview controls: Toggle, Segmented, Checkbox, Radio, Avatar, Input and Search use production components; code language is the shared SelectField with React as the reference and other languages marked Coming Soon.
- Checks: `npm run tokens:check` (2364/2364), `npm run styles:check` (35/35, all PIXELS), `npm run icons:check` (1592/1592) and `npm run build` pass. The skill validator could not run because the workspace Python environment does not provide `yaml` (`ModuleNotFoundError`); this is an environment dependency gap, not a repository validation failure.
- Remaining evidence gaps are unchanged: Date Picker dual-calendar/mobile/time/event compositions and complete per-level visual comparison for every Button/Overlay and Sidebar Workspace state still require targeted Figma child-node reads; they are not silently marked exact.

### Focus and Search correction (2026-09-24)

- Token collection pages no longer render a page-local `<input>`; `TokenCollectionPage` composes the shared `Search` → `InputField` owner. Browser inspection of `Global Colors` resolves `.token-toolbar .zen-search` with the production 40px medium control and 12px input radius.
- Figma `Checkbox/Text` (`309:46871`) binds the mark to `Corner-Radius/XSmall` (4px in the current Compact mode), not `Corner-Radius/Small`; the Checkbox mark now uses the xsmall token.
- Native click focus is intentionally separate from the documented Focus state. Checkbox, Radio Button and Toggle only draw their focus ring for the explicit matrix state or `:focus-visible` (keyboard navigation). Browser checks: after mouse click, `focus-visible=false` and no focus ring; after `Tab`/`Shift+Tab`, `focus-visible=true` with the expected 2px ring/outline.

### Styles, theme and template reconciliation (2026-09-24)

Sources re-read for this pass: `/Users/vuduong/Documents/Styles.json`,
`/Users/vuduong/Documents/Component Theme.json`, and the live Component page
template `14260:96953` in Figma file `9nZv4uW2LT21yuHabMTCh1`.

- `Styles.json` is checked in as `styles/source/figma/styles.json` and is now a
  first-class generated source. It contains 35 color styles, 36 text styles,
  16 effect styles and no grid styles. `All-Caps/M-BOLD` is included in the
  text-style source and is resolved through the existing All-Caps/M typography
  scale rather than inventing a new Zen typography token.
- `Component Theme.json` was compared by token name and mode. The missing
  `Toggle/Bar/Background/Seclected/Hover` alias is now present and maps each
  mode to its corresponding `Color/Background/*/Solid/Hover` token. The
  selected Toggle hover track therefore uses the same semantic color contract
  as Figma instead of a hard-coded surface color.
- Effect styles are generated to `src/styles/generated/style-manifest.json` and
  `src/styles/style-effects.css`. Popover consumes `Effect/Popover`; input
  surfaces consume `Effect/Input`, including the exported inset shadow recipe
  and background blur. The manifest check verifies every exported style name
  and count before delivery.
- The template node confirms the fixed 260px sidebar, 44px item contract,
  20px icon slot, Body/Base/Medium navigation text, and 400px component cover.
  The platform topbar is sticky at the shell boundary; the platform still
  intentionally omits the Figma collapse control under the locked shell rule.
  The hero Zen mark and `Kaiz` wordmark now use token-backed paint while
  retaining the local SVG geometry.
- Checkbox hover/focus is kept separate from click focus. The mark resolves
  `Corner Radius/XSmall` (4px); the keyboard focus halo resolves
  `Corner Radius/Small` (8px) from the live Checkbox node. Radio uses the
  rounded 1000px focus/hover contract. The keyboard-focus selector has an
  explicit hover override so a pointer resting on the control cannot hide the
  Figma focus halo. Toggle selected hover uses the newly added theme alias.
- Input leading/trailing now expose the Figma Label and Dropdown axes as
  explicit `showLabel` and `showDropdown` props. The platform playground has
  independent Leading, Leading Label, Trailing and Trailing Label toggles, so
  the label can be removed without changing the icon/dropdown slot padding.
- Select and platform dropdowns continue to reuse the shared Popover owner;
  no page-local dropdown primitive was introduced. Popover labels remain
  semantic group names (for example `Component Size`), not selected values.
- Component playarounds now expose only production compositions. Primitive
  owners such as Input Label/Help-Text/Input-Content remain nested code owners,
  not selectable preview rows. Static State chips were removed; hover, pressed,
  keyboard focus, typing and selection are exercised through the real controls,
  while the preview starts from the documented default state.

Verification for this pass: `npm run build`, `npm run tokens:check`,
`npm run styles:check`, and `npm run icons:check` all pass. Generated counts
are 2,365 tokens, 36 text styles, 35 color styles, 16 effect styles and 1,592
icons. Any visual comparison not covered by a browser measurement remains
`Chưa xác minh` in the evidence table rather than being inferred from a
similar component.

### Token and component-template correction (2026-09-24)

- The attached `Component Size.json` was compared by token name and mode (194/194 exact). The corrected `Button/Icon-Size/Small` values are `16px` Compact and `20px` Comfortable; generated CSS was rebuilt from that source. `Component Theme.json` is also exact (110/110); `Segmented-Item-Secondary/Background/Seclected/Default` now aliases `Color/Background/Inverse/Solid/Default` in every mode.
- Button Overlay evidence from the exported Figma `Button_Overlay.json` was read instead of inferred: Inverse content binds `Color/Content/Neutral/Strongest` (including hover/pressed), White binds the global `Black` color, White Overlay binds the global `White` color, and Black Overlay also binds the global `White` color. Disabled Overlay content binds `Color/Content/On-Black-Overlay/Disabled`. `button.css` maps those exact contracts; no guessed neutral substitute is used for these levels.
- The shared Sidebar component now owns a Figma-style default header brand/collapse control (`icon-layout-left-line`), and Small-Density collapsed has its fixed 52px rail. The Platform Sidebar page no longer injects the platform-only `Zen DS` brand, so its Basic/Workspace/Small-Density previews exercise the component template itself. The application shell still passes its custom brand separately.
- Multiple Chip trailing is constrained to the shared `BadgeCounter` owner with a numeric value (`Math.trunc`). A multi-select chip with one selection uses the single remove affordance; only two or more selections render the numeric Counter, with the line-X affordance reserved for trailing hover/focus.
- Playaround state policy is now explicit: hover, pressed, focus, typing, selection and open/close are reached through the real production interaction. `Disabled` is the only state toggle because it cannot be reached through normal interaction. Segmented now also supports a disabled owner state so its platform toggle does not fake a static matrix state.
- Component-page hero `Kaiz` now follows the live `14260:96953` template exactly: Inter/All-Caps M (14/16, 600), token `Color/Content/Neutral/Strongest`, and 40px top/right inset. The overview cover keeps its separate On-Brights contract; these two wordmarks are intentionally not conflated.

### Main Component View and overview cover reconciliation (2026-09-24)

- The previously omitted `Main-Component-View` in template node `14260:96953` is now represented by every component playground's shared `platform-example-panel--stack`: a two-column `2fr/1fr` surface, current 24px `2XLarge` radius, three-layer neutral shadow, 24px controls rail with a pale left divider, and a first-class left title row. The Figma geometry is `title 88px`, `Component Container` 152px minimum (24px horizontal inset, 48px vertical inset), then `Code View`; the preview row grows with the production component instead of being clamped to 152px. The panel is a shared layout owner and pages do not create alternate preview shells.
- `Code View` now has the exact 12px header-to-code gap and 228px dark code surface, with a language SelectField (React is the reference; other choices remain Coming Soon), a tertiary Copy action, and SDK snippets rendered with syntax-token colors. The visible `Code` heading was removed because the Figma header contains the React selector and Copy action, not an additional title.
- Overview node `14243:64881` was re-read as a distinct custom cover, not reused from the 400px component hero. The cover is 1204×492 with 32px internal padding, a 428px body, 30px vertical gaps, 120px TASA Explorer Black title at -4.8px tracking, 2px 20%-black divider, three-column metadata, and the two exact downloaded Figma vector assets. Logo/Kaiz remain On-Brights token content; component heroes remain Neutral/Strongest.
- Button content audit was expanded to the full Main, Flat, Overlay and Icon sets. Figma JSON patches are the authority for each level/state and are now recorded as a matrix before CSS edits. Corrections in this pass include Main solid-level disabled content (`Color/Content/Inverse/Strongest`), subtle pressed content (`Negative/Base` / `Positive/Base`), Overlay disabled backgrounds (`Inverse-Disabled` / `White-Disabled`), White content (`Black`), and both overlay levels' white content (`White`). Icons inherit the same button content variable through the shared `Icon` primitive.

### Template code and Search reuse (2026-09-24)

- Every component Main-Component-View now renders the component name inside the shared Figma panel title row; page-local duplicate section headings are not used. The six Button sets and the component pages all use the same grid owner.
- Iconography and token collection filtering use the production `Search` composition directly (not nested `<label>` wrappers or page-local search fields). `Search` clears controlled values by emitting the shared input change contract, so the clear affordance works for both controlled page filters.

Verification for this pass: `npm run build` passes (2,365 tokens, 36 text styles, 16 effects, 1,592 icons). Browser measurements on the local platform confirm the overview cover is 492px high with 32px inset and a 428px body; the Main Component View current geometry is a 24px panel radius, 8px preview/code surface radius, a 24px controls rail, and a content-driven preview row. Black Overlay default resolves to white content over 40% black, White resolves to black content, and White disabled resolves to the White-Disabled background plus On-Black-Overlay disabled content. Hover/pressed interaction branches remain source-mapped and must be re-measured whenever their CSS changes. Any row not measured remains explicitly marked `Chưa xác minh`.

### Main Component View re-read correction (2026-09-24)

- The latest Figma node `14270:104798` is authoritative over the earlier template measurement: the outer Main-Component-View radius is `Corner Radius/2XLarge` (24px), the Component Container radius is `Corner Radius/Small` (8px), and the dark Code View surface also uses 8px. The preview row keeps a 152px minimum, but its height must grow with the production component instead of being clamped to 152px.
- The right rail is the actual `Variant, Properties & Boolean` composition: 24px inset, 24px title-to-group gap, 8px row gap, five-column rows, Body/Base/Regular 14px labels spanning columns 1–2, and Input/Select-Field spanning columns 3–5. Boolean rows use the production Toggle-Button primitive with 8px vertical padding. The platform now renders this shared rail rather than page-local chips for single-value properties.
- Sidebar section titles are not a bespoke text heading: Figma uses the same `.Primitives/Side-Bar/Menu-Item/Master` owner with no leading icon, 32px height, `Padding/XSmall` vertical and `Padding/Small` horizontal, Body/Small/Regular text, and an optional Action-Slot. The shared Sidebar now renders that primitive-shaped row.
- Input Leading-Trailing was re-read from node `373:101815`: outer medium/large gap 8px (small 4px), nested Elements gap 4px (small 2px), and dropdown slot 20px (small 16px). The React primitive now preserves this nesting instead of applying one gap to every child.
- Segmented now consumes its exported Small/Medium size tokens and dedicated vertical-padding/Text-Wrapper tokens. Chip multiple trailing uses the line X affordance only on hover/focus; the default multiple state renders the numeric Counter without an extra circular mark.
- Popover is now a first-class Platform component page. Its preview uses the shared `Popover` owner, the semantic label is `Component Size`, and the panel preview height is content-driven.
- Runtime regression measurements on the local app: Input panel radius `24px`, preview radius `8px`, Input medium field `40px`, Leading icon slot `20px`, medium outer/Elements gaps `8px/4px`; Sidebar section title `32px` with `8px 12px` padding and no icon; Popover preview panel grows to include the in-flow 240px Popover surface. Chip multi-selection with two options exposes text content exactly `2` and no punctuation/circular default mark.

### Interaction and Segmented correction (2026-09-24)

- Re-read Figma `Primitives/Segmented/Item` (`1204:11690`) and `Segmented` (`1238:892`) with the design-to-code skill. The component set has only `Small` (24px) and `Medium` (32px); `XSmall` is not a Figma variant and is no longer exposed by the production component or Platform playground. Both sizes use the Figma gap/vertical/horizontal tokens (`2/4/4` and `4/6/6`), a 4px horizontal Text-Wrapper padding, and 600-weight Body Small/Base labels. Unselected content is Neutral/Light; selected Primary/Secondary content follows the dedicated semantic aliases. Focus is a 3px `Focus/Accent/Subtle` border, not an inset outline. The current Figma node renders no secondary hover/selected stroke; selected surfaces keep the 0.5px shadow.
- Boolean rows in the Platform right rail are controlled production interactions: `ToggleButton` is the single switch owner; its visible Figma track forwards pointer/Space/Enter activation to the clipped native input, emits `onSelectedChange`, and the page setter updates the component prop. The hidden input is removed from the accessibility tree so the rail exposes one switch, not two. This is why a boolean toggle must be state + callback, not a static preview attribute.
- Re-read Checkbox Mark (`311:47222`) and Radio Mark (`373:96225`). Selected default, selected hover and selected focus use the component selected background aliases and the Figma `0 1px 0.5px` shadow; unselected controls retain the `0 1px 1px` shadow. Selected hover resolves the `.../Background/Seclected/Hover` alias and the -8px neutral halo; keyboard Focus keeps the -4px, 2px accent ring. CSS now preserves these selected-hover shadows explicitly for both controls.

### Component Theme synchronization (2026-09-24)

- The user-provided `/Users/vuduong/Documents/Component Theme.json` was compared against `tokens/source/figma/component-theme.json` by token name and all five modes. The result is exact: 112/112 tokens, no missing names, extra names, or value differences.
- Two previously missing aliases were added: `Segmented-Item-Primary/Background/Seclected/Hover` and `Segmented-Item-Secondary/Background/Seclected/Hover`. `Segmented` now consumes these aliases for selected hover at both levels.
- Checkbox and Radio selected-hover aliases were rechecked against the same export. Their values were already correct and remain mode-aware; their CSS consumes `Checkbox/Background/Seclected/Hover` and `Radio-Button/Background/Seclected/Hover` directly.
- Generated source now contains 2,367 variables across 11 collections. The English hand-off is in `docs/context/`.

### Code-side component audit (2026-09-24, Figma connector offline)

Scope: all 14 React component owners in `src/components`. Evidence = checked-in variable/style exports + static CSS reference audit + computed-style measurement (Chromium, light/dark × neutral-s1/brand-s1). No live Figma node was read in this pass, so layer bindings below stay `Chưa xác minh` until a node read.

Fixed (evidence: variable export):

| Owner | Before | After | Computed (light, neutral-s1) | Status |
|---|---|---|---|---|
| Avatar/Badge support themes | raw `--zen-light-<c>-9/alpha-3`; green/red referenced non-existent vars → rendered off-palette fallbacks `#30a46c`/`#e5484d` | `--zen-color-background-support-<c>-solid/subtle` (mode-aware) | green `#3FAB53`, red `#E5532E` | Khớp token; binding Chưa xác minh |
| Badge `red` | shared crimson rule | superseded: Figma binds Negative/* (see live-Figma section below) | — | Khớp (live) |
| DatePicker item | hard-wired accent semantics; 0/8 `Date-Picker/Item/*` component-theme tokens consumed | all 8 component-theme aliases (unselected/hover, selected/hover, in-range/hover, today border, selected content) | selected `#111`/`#FAFAFA`; brand-s1 → `#FF66D4` | Khớp token; binding Chưa xác minh |
| DatePicker surface | hand-rolled shadow + blur 20 | `Effect/Popover` style vars (same as Popover) | shadow identical, blur 40 | Khớp style |

Open gaps (need live node read or a decision):

1. Blur convention is inconsistent: Input/Button tertiary+overlay use half the Figma radius (20), Popover/Sidebar/generated styles use the Figma value (40), Segmented/Avatar use 50 directly. Pick one rule and apply it in `build-style-manifest` + components.
2. Unconsumed component tokens: `Segmented-Item-Secondary/Border/*`, `Button/Spacing/*/Vertical-Padding`, `Radio-Button/Border/Pressed`, `Input/Size/Heading-H1..H3`, `Input/Spacing/XLarge/Horizontal-Padding`, `Badge/Size/2-XSmall`, `Select-Item/Size/*`.
3. Literals with no variable/style: Button overlay borders `rgb(255 255 255/24%)`, `rgb(0 0 0/8%)`; Avatar text 9/10/12/20/24/32/48px + tracking; Chip counter 10/12; Segmented disabled `opacity:.5`; `0 1px .5px` selected shadows (Checkbox/Radio/Segmented/DatePicker nav).
4. Hand-rolled shadows equal to static Effect Styles (`Action/Basic`, `Shadow/Bottom/Level-1` in Sidebar) kept on colour variables because `styles.json` has no variable bindings; confirm whether Figma effects are variable-bound.
5. ~200 var() fallbacks don't all match current token values; they are inert but misleading for AI ingestion — consider removing fallbacks from component CSS.

### Color-theme correction from live Figma (2026-09-24)

Source: Figma desktop, file `ZEN Kaiz (Official-Sep2026)`, read with the Plugin API in the dev console (bound variable per paint). Sets in scope (every built component with a colour Theme axis): `Avatar/Single` 223:9050 (528), `Badge` 260:4825 (102), `Badge-Counter` 9535:33812 (102). Paint is identical across every Size/Shape (verified: 33 unique Avatar rows = 33 Theme×Background).

Badge / Badge-Counter (container F, leading `Vector` F, `Label` F):
- Neutral Solid: Neutral/Solid/Default · Inverse/Strongest · Inverse/Strongest; Subtle: Neutral/Subtle/Default · Neutral/Light · Neutral/Strongest
- Accent Solid: Accent/Solid/Default · On-Accent/Default ×2; Subtle: Accent/Subtle/Default · Accent/Light · Accent/Strongest
- Yellow → Warning/*, Red → Negative/*, Green → Positive/* (Solid content: Yellow On-Brights, others On-Colors; Subtle: */Light icon, */Strongest label)
- Orange, Crimson, Pink, Plum, Purple, Violet, Indigo, Blue, Cyan, Teal, Brown → Support/<c>/Solid + On-Colors; Support/<c>/Subtle + Support/<c>/Light + Support/<c>/Strongest
- Inverse (Solid only): Inverse/Solid/Default + Neutral/Strongest; On-Color (Solid only): White-Solid/Default + On-White-Overlay/Strongest

Avatar/Single: root 1px OUTSIDE stroke Border/Inverse, root fill Surface/Default only for Subtle and Photo; inner `Text` layer = theme fill + `Effect/Overlay` (background blur 100); Label = content. Solid: Support/<c>/Solid + On-Colors (Yellow On-Brights; Neutral Neutral/Solid/Default + Inverse/Strongest; Accent Accent/Solid/Default + On-Accent/Default). Subtle: Support/<c>/Subtle + Support/<c>/Strongest (Neutral/Accent use their Subtle/Default + Strongest). Red/Green/Yellow use Support/* here (not Negative/Positive/Warning as in Badge). Photo: Image layer 1px INSIDE stroke Border/Neutral/Subtle/Default.

Code before: Badge Subtle collapsed every theme to Neutral subtle; icon colour not separate; Yellow/Red/Green used Support palette; Inverse/On-Color used wrong fills; Avatar coloured Solid content was Inverse/Strongest instead of On-Colors, root had inside border + surface fill on every variant, Photo had no image stroke.

Verification: computed colours (Chromium, light) for 34 Badge + 32 Avatar variants compared in the Figma console against resolved Figma paints → **66 compared, 0 mismatches**. Dark mode follows the same semantic variables.

Still open: `Effect/Overlay` and `Liquid-Glass/Large` exist in Figma (18 local effect styles) but not in `styles/source/figma/styles.json` (16) — re-export styles; Avatar blur kept at CSS 50px pending the blur rule; Badge remove-icon colour not bound in Figma sample (inherits label).

### Styles + Checkbox / Radio / Chip / Popover contract pass (2026-09-24)

Source: Figma desktop, `ZEN Kaiz (Official-Sep2026)`, Plugin API via the dev console (bindings, not screenshots). Data saved in `styles/source/figma/figma-styles.full.json` and `docs/figma-contracts/*.json`. Verified with `tools/figma-contract` (production React components, every variant, light/neutral-s1 + dark/brand-s1).

Styles
- Uploaded `Styles.json` = plugin export: 35 colour / 36 text / 16 effect styles; Figma has 18 effect styles → added `Effect/Overlay` (background blur 100) and `Liquid-Glass/Large` (glass 8). Export also lacked every variable binding, blur radius and paint value → generator now reads the full Plugin-API extraction.
- Effect CSS now uses bound shadow variables (mode-aware) in Figma's CSS order; blur = Figma radius ÷ 2 (confirmed with Figma `getCSSAsync`: 40 → 20px, 100 → 50px). Previously every blur was hard-coded 40px.
- Text styles: 24 styles (Display, Heading, Button-Label, all "Bold") bound `Emphasis/Font-Weight/Bold` but code used Semi-Bold (550 vs 600) → fixed from bindings. `--zen-type-paragraph-spacing` added.
- Paint styles now generated as `--zen-style-*-fill` / `.zen-fill-*` (solid + linear gradients with bound stops; image/pattern layers noted as not expressible).
- Inter bundled (was relying on a locally installed font).

Components (checks matching / total)
| Set | Result | Fixes |
|---|---|---|
| Checkbox/Text 309:46871 (+ Caption) | 1248/1248 | selected shadow 0.5px → Shadow/Action/Basic 1px; selected-disabled stroke removed; caption moved under the row, full width, gap XSmall; row gap bound to Spacing/Gap/XSmall |
| Checkbox/Mark 311:47222 | 356/356 | (same) |
| .Primitives/Checkbox/Content 309:46789 | 20/20 | — |
| Radio-Button 373:96272, Radio-Mark 373:96225, Content 373:96322 | 1120/1120, 224/224, 32/32 | Checkbox/* tokens per Figma bindings; radius Corner-Radius/Rounded; Action/Basic shadow; uncontrolled groups now native (no double selection) |
| Chip/Normal 512:6843 | 3528/3528 (1 Figma exception) | focus ring = 3px inside stroke 5px out (was 2px + white gap); Leading-Photo = Avatar/Single Photo; Shadow/Action/Tertiary style (blur 20px) |
| Chip/Advanced 512:7659 | 1716/1716 | Select=Yes trailing icon-x-circle-solid Neutral/Strongest (was x-small-line, tinted); Placeholder = Body/Base/Medium + Content/Placeholder; Counter → Badge XSmall Neutral Subtle |
| Chip/Number-Only 1536:26687 | 672/672 | value uses Body/Base/Bold, fills + centres (was 16px/1) |
| .Chip/Trailing 333:82245 | 72/72 | — |
| Popover/Default 4031:26126 | 28/28 | Popover/Border as 1px OUTSIDE (outline); items gap 4; Effect/Popover blur 20px |
| Primitives/Popover/Item 4031:26009 | 94/94 | hover/default = Background/Neutral/Flat/*; check icon Content/Accent/Base |
| .Primitives/Popover/Item/Content 829:20006 | 68/68 | added avatar-small/big, photo-big, dock-icon themes (sizes + Avatar Big gap 16) |
| .Primitives/Popover/Search 846:38183 | 22/22 | now the production Search (Icon-Search=No) → Input Field-Only Small with the instance override radius Input/Medium, no focus stroke |
| Popover/Manual-Add-New 4031:27929 | 66/66 | Create + Accent Badge showing the typed value (was option count) |
| Popover/Bunk-Action 9021:28726 | 52/52 | surface Background/Popover/Default + Border/Popover/Subtle outside; groups/dividers primitives |

Known Figma inconsistencies (not copied): Chip/Normal Medium·Primary·Leading-Icon·Focused·No leading icon binds Neutral/Strongest (all other Focused = Neutral/Light); Checkbox/Text Container aligns the mark CENTER vs Radio TOP (identical for one-line labels; code keeps top alignment for wrapped labels). Figma has no Disabled chip state (code keeps opacity .55 — design needed).

Interaction pass (25/25, `tools/figma-contract/interactions.mjs`): label click, Space, focus-visible ring only on keyboard, radio arrow keys, chip aria-pressed, Advanced chip open/arrow/Home/End/Enter/Escape/outside-click/Delete-to-clear with focus restore, disabled options skipped, uncontrolled Popover search filters, Manual-Add-New Enter-to-create and no duplicate create row, SelectField keyboard open/select/focus restore/outside click.

## Token table template — Global Colors / Global Dimensions / Base Colors (2026-09-26)

Figma `9nZv4uW2LT21yuHabMTCh1`: `14257:56639` (Global Colors section), `14257:60372` (Dimensions table), `14257:76246` + `14257:60690` (Base Colors table + toolbar). Owner: `src/foundations/TokenTableView.tsx` + `.token-table-view*` in `src/styles/foundations.css`. Measured at 1512×982, Zen-Platform typography.

| Layer | Figma | Code | Browser | Status |
|---|---|---|---|---|
| Toolbar | 12-col grid, gap 16, py 8; Search col 5/4 (GC, Dim) or 10/3 (Base); Segmented secondary col 1 | `.token-table-view__toolbar`, `Search` medium, `Segmented level="secondary"` | Search x=406.66 w=390.66 (GC/Dim), x=915 w=289 (Base) | Khớp |
| Section | `.Ops/Header` Heading/1 + Table, gap 24; sections 64 apart | `zen-type-heading-1`, gap-large / gap-giant | 32/40, −0.96px, TASA Explorer; 64px | Khớp |
| Table header | Support/Neutral/Pale, radius 12, 12/16 padding, Body/Code/Bold | `.token-table-view__head` | rgba(5,5,5,.03), 12px, 12px 16px, JetBrains Mono 600 | Khớp |
| Cell | h72, px16, border-b Border/Neutral/Pale/Default | `.token-table-view__cell` | 72px, 1px rgba(1,1,1,.063) | Khớp |
| Color preview | 40px, 1px Focus/Neutral/Subtle, radius 12; checker 30% + fill radius XSmall | `.token-table-view__swatch` + `color-preview-checker.png` | 40px, 12px, checker opacity .3 | Khớp |
| Highlight pill | Neutral/Subtle/Default, 2/8 padding, rounded, Body/Code/Regular | `.token-table-view__pill` | 2px 8px, rgba(1,1,1,.063), 12px | Khớp |
| Dimension bar | p16, 2px Border/Accent/Solid inline borders, Background/Accent/Subtle | `.token-table-view__dimension` | width = token, h40, 2px #FF66D4 | Khớp |

Deliberate data differences (repo data kept): Token pill shows the real CSS variable (`--zen-light-tomato-1`) instead of Figma's placeholder `$light-brand-1`; Global Colors Value shows real hex instead of the `#000000` placeholder; aliased Value cells show only the referenced token as a CSS variable (`--zen-light-zen-1`), resolved value on hover; Global Colors also gets the Light/Dark Segmented (Figma frame only has Search) because the collection contains both schemes. Gap: Dark mode rendering of the table not measured.

### Template extended to every token collection (2026-09-26)

`TokenCollectionPage` now always renders `TokenTableView`; the old Preview/Figma name/Values by mode/CSS variable table and its CSS were removed. Rules for collections that have no dedicated Figma frame (derived from the three template frames, not measured against Figma):
- Multi-mode collections use the same Segmented (secondary, medium) to pick a mode; Search moves to col 10/3 (Base Colors layout). Single-mode, unschemed collections (Global Dimensions, Spacing) keep the centred Search. Global Colors now also uses the Base Colors toolbar layout because it has the Light/Dark Segmented.
- Color collections (Mode Colors, Component Theme) use Name | Token | Value; swatches and resolved hex follow the selected mode (alias chain resolved per hop; targets without that mode fall back to their first mode, e.g. Component Theme → Mode Colors Light).
- Numeric collections use Token | Value | Dimension; typography/emphasis collections label the third column Preview (Aa sample with the font family/size/weight, letter-spacing sample, text-style class). Corner radius previews as a 40px square with that radius; other dimensions keep the accent bar capped at the cell width.
- Verified in browser at 1512×982: all 11 collections render, mode switching changes values (Corner Radius Base 12px → Luxury 2px), no console errors. Dark theme still not measured.

### Checkbox re-audit (2026-09-27)
| Layer/node | Figma | Code | Result |
| --- | --- | --- | --- |
| Checkbox/Text 309:46871 Container | row: Check-Wrapper (py 3XSmall) + Content (fill), gap Small (12px, updated in Figma 2026-09-27; Radio-Button too) | `.zen-checkbox__row`, `.zen-radio-button` | Khớp |
| .Primitives/Checkbox/Content 309:46789 | Label + Subtext (boolean Subtext#14366:5) in one column, gap 3XSmall (2px); Body/Small/Regular, Content/Neutral/Light — re-extracted live via use_figma; Checkbox/Text no longer has an outer Caption layer (Caption#309:249 prop is dangling) | caption moved INTO `.zen-checkbox__content` (was below the row, full width, gap XSmall) | Đã sửa |
| Mark states 308:46684 · 309:46870/69/68 · 309:46872/81/92/904 · 4034:9560 | unselected default/hover/focus/disabled + selected default/hover/focus/disabled tokens, 12px check, 2px padding | checkbox.css | Khớp |
| Row alignment | Figma `items-center` (single line) | `flex-start` + 2px wrapper = same for one line; keeps the mark on line 1 with a caption | Chủ ý |

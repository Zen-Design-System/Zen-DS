# Session log — 2026-09-25 (v0.2.0)

## Request

Re-audit every built component against Figma (variables, styles, nested owners, primitives, icon versions), fix every mismatch, and build a new version.

## Evidence used

- Repo contracts: `docs/figma-contracts/checkbox-radio-chip-popover.json`, `input-search-primitives.json`.
- User exports in `~/Documents`: `Button-Components.zip` (6 sets, 23/09), `Sidebar-Components.zip` (Menu-Item, Section-Title, Avatar/Single 528, Badge-Counter 102, Notification-Dot), `Zen-Variables.zip` (24/09 — matches the repo tokens exactly).
- Live Figma was not reachable (plugin not authenticated).
- Method: every visible Figma node in every variant compared with the rendered DOM (geometry, fill, stroke, radius, effect style, text style, icon name/size/artwork) in all 10 modes (light/dark × 5 component themes). Button exports use delta-encoded variants (`$variantDelta` + `$patch`) and must be decoded before comparison.

## Fixes

| Component | Fix |
| --- | --- |
| Input | Leading-Trailing slot hugs its content at every field size (it was locked to icon size on Small/Large/XLarge and overlapped the text). Leading-Trailing: Small keeps Body/Base/Medium; Large (XLarge field) uses Heading/4 + 24px flag; dropdown Neutral/Light; Active=No and Read-Only/Disabled fields use Content/Disabled. XLarge field text and Input-Content Large use Heading/4. Input-Content: Typing text Strongest, 2px start inset, 1.5×20 caret in Background/Active/Neutral/Solid (before placeholder when Focused). Field affordance icons Neutral/Light. |
| Search | Clear + filter group no longer overflows/clips on Small; filter-dropdown label Body/Base/Medium with 2px element gap; icons Neutral/Light. |
| Button | Strokes are INSIDE (inset shadow) — the transparent 1px border that made text buttons 2px wider and put the focus ring 5px out is gone. Min width XL 96 / L 80. Main Pressed drops the shadow (Icon-Main keeps it; Tertiary/Surface drop it in both). Primary Hover keeps Content/Default. Tertiary disabled border = Color/Border/Disabled. Surface/Danger-/Positive-Secondary disabled = Subtle-Disabled. Main Surface focus ring = Focus/Accent/Solid; Overlay rings = Focus/Accent/Solid. Flat Accent/Danger/Positive use their Flat background family; Flat Accent content stays Accent/Base. Icon-Overlay Inverse/White carry Shadow/Action/Basic. White/Black Overlay use Figma's vertical gradient stroke (replaces hard-coded solid borders). Icon-Main solid levels keep the shadow while disabled. |
| Avatar | Square radius per size (4/4/8/12/12/16/20/28), 2px root stroke on 2XL/3XL, initials use the Figma text styles (Caption/Medium … Display/4), square focus-ring radius = radius + 4 (min 12). |
| Badge-Counter | XSmall container padding Spacing/Padding/2XSmall; no text-wrapper padding on XSmall/Small. |
| Sidebar | Dropdown icon `icon-chevron-down-01-line`; focus is a 3px OUTSIDE outline; Selected+Hover uses Subtle/Hover; `density` prop is honoured on every variant. |
| Popover | Theme=Dock Icon renders the Dock-Icon tile (24px, Neutral/Subtle, 12px Neutral/Base icon); Theme=Badge hugs a leading Badge with no label; story uses the real Badge. |
| Checkbox / Radio | Side=Right rows fill their width so the mark sits at the end (Figma fixed container + FILL label). |

## Verified

- `node tools/figma-contract/run-all.mjs`: 16/16 suites + 25/25 interactions.
- Deep audit on all sets above in 10 modes: remaining differences are text-metric (≤1.3px), the native caret vs Figma's drawn cursor, or the Figma inconsistencies below.
- `npm run build`, `build-storybook`, `tokens:check`, `styles:check`, `icons:check` pass.

## Figma inconsistencies left as-is (need a designer decision)

- Button/Main Surface Hover uses Surface/Pressed (Icon-Main Surface Hover uses Surface/Hover) — code uses Surface/Hover.
- Button/Icon-Main Positive Secondary Pressed uses Positive/Flat/Pressed (Danger Secondary uses Subtle/Pressed) — code uses Subtle/Pressed.
- Button/Icon-Main Danger Disabled drops the shadow while Primary/Accent/Positive keep it; Tertiary 2XSmall Disabled has a shadow — code follows the majority.
- Overlay gradient stroke on Disabled differs between Button/Overlay and Icon-Overlay (and Black Overlay XSmall has none) — code keeps it on every state.
- Avatar Square Large: Solid uses Corner-Radius/Large (16), Subtle/Photo use Base (12) — code uses 12.
- Chip/Normal Medium/Primary/Focused leading icon uses Neutral/Strongest (siblings Light) — code uses Light.
- Popover Item Content "Avatar Small" uses a legacy avatar component with a raw `#00000014` stroke.
- `~/Documents/Component Size.json` (23/09) is older than the repo; `Button/Icon-Size/Small` is 16 in the 24/09 export and in code.

## Not verified (no Figma data available locally)

DatePicker; Sidebar masters (Basic/Workspace/Small-Density), Section-Title, Notification-Dot; Avatar Stack/Status; Divider, Scroll-Bar, Popover Label; TextArea/Number/Heading/Autocomplete/RichText inputs; Buttons with leading/trailing icons. Carry to the next session and re-check against live Figma once the plugin is authenticated.

## Live Figma verification (same day, Figma MCP authenticated)

File `9nZv4uW2LT21yuHabMTCh1` was read directly (read-only). Every variant's visible geometry, fills, strokes, radius, effect style, text style, nested icon names, text and auto-layout padding/gap were hashed in Figma and compared with the local data used for v0.2.0.

- Identical to the live file: Checkbox (3 sets), Radio (3), Chip (4), Popover (8 sets incl. Default, Manual-Add-New, Label, Search, Scroll-Bar, Bunk-Action, Item, Item/Content), Search/Popover, Input Field-Only / Input-Content / Cursor / Leading-Trailing, Divider, Badge, Badge-Counter, Avatar/Single (528), Avatar Status, Sidebar Section-Title, Sidebar Menu-Item (Master level).
- Button (6 sets, 890 variants): identical except the Small icon size, which the live file now resolves to 16px (`Button/Icon-Size/Small`); code already uses 16.
- Sidebar Menu-Item Level=Child: live file shows a 12px inset + 16px Tree-Line column (line at x=21) and the item at x=28. Code fixed (`.zen-sidebar__sub-menu`).
- Variables: 8 of 11 collections identical; Global Dimensions, Base Colors (Project) and Typography Configuration have extra modes in the live file (`Zen`; `Chat`, `VT`, `Ecom-Demo`; `Ecom-Demo`, `Zen-Platform`). The modes the repo uses are value-identical. The extra modes are not imported yet.
- Styles: 36 text, 18 effect and 35 paint styles identical.
- Not yet compared against live (local exports were incomplete or absent): Search/Default (standalone Search), Sidebar masters (Basic/Workspace/Small-Density), Sidebar LOGO, Avatar/Stack, Segmented (Item now 20 variants), Toggle (Toggle-Button now 18 variants), Input field sets (Text-Field, Select, Date, Text-Area, Number, Heading, Autocomplete, Richtext), Date Picker.

## Toggle re-check after the designer's update (live Figma)

- Toggle-Button (1523:104) no longer reports set errors: 18 variants = Size (S/M/L) × State (Default, Default-Hover, Disabled) × Select, no duplicates. Toggle (24) and .Primitives/Toggle/Content (4) unchanged in structure.
- Code fixes: unselected bar second fill is Color/Background/Neutral/Pale/Default (was Input/Background/Default); dot stroke is 0.5px OUTSIDE (box-shadow, was an inside border); new `state="hover"` renders Figma State=Default-Hover (ToggleButton; also forwarded by Toggle). Platform Toggle page gained a Hover control.
- Verified: 18 Toggle-Button variants × 10 modes = 1260/1260 checks (size, dot position, bar fill + pale layer, dot fill, 0.5px stroke, Shadow/Action/Basic); Toggle layout for 3 sizes × 2 themes matches the live coordinates exactly.

## Avatar + Segmented (live Figma)

- Avatar/Single label: text styles per size were already correct (Display/4, Heading/3, Heading/4 ×2, Subheading, Body/Base/Medium, Caption/Medium ×2) but Figma's Label is a single initial at every size; code rendered two letters from Medium up ("ZD"), which crowded the circle. Now always one initial.
- Avatar status (.Primitives/Avatar/Status Active): dot + OUTSIDE Border/Inverse stroke — L–2XS 8px/2px, XL 12px/2px, 2XL/3XL 16px/3px; bottom-right inset 1 (M–2XS, XL), 3 (L), 2 (2XL), 8 (3XL). Code drew an 8px box with a 2px inside border (4px of colour). Fixed; coordinates match (88/62/43/37/31/23/15/11).
- Avatar/Stack: overlap −8 (Medium) / −4 (Small); max 5; no "+N" chip in Figma (`showMore` now opt-in, default max 5).
- Segmented/Item (20 variants): unselected hover label → Neutral/Strongest; selected shadow → Shadow/Action/Basic; Focused → 3px INSIDE ring (inset box-shadow, content no longer shifts). 1400/1400 checks (20 variants × 10 modes).
- Figma inconsistency: Segmented Item Medium/Secondary/Selected/Default fill is Tag/Background/Default (Neutral/Ghost) while Small uses Segmented-Item-Secondary/Background/Seclected/Default (Inverse/Solid) — different colours; code keeps the Segmented token. Needs designer fix.

## Follow-up (user review)

1. Avatar initials: two characters on Small and larger, one on XSmall/2XSmall (user decision; Figma sample shows "A").
2. Icon size tokens re-checked against the live bindings (Element-Size/Popular/*):
   - Badge: XSmall/Small icons = Popular/XSmall, Medium = Popular/Small (was Small/Base); XSmall has no Leading slot.
   - Checkbox check/minus and Popover item check = Popular/XSmall (was 2XSmall — equal in Compact, 12 vs 16 in Comfortable).
   - Sidebar item icon/dropdown/footer = Popular/Base (were hard-coded 20px); Section-Title action slot = Popular/Small.
   - Input Leading-Trailing Icon=Yes = Popular/Small/Base/Medium; Flag keeps Image-Size.
   - Badge-Counter (designer update): Medium container padding = Spacing/Padding/2XSmall (4), XSmall 4, Small Badge/Spacing/Small (4); text wrapper 0/0/2.
3. Segmented badge = Badge-Counter XSmall: unselected Neutral/Subtle, selected Primary Inverse/Solid, selected Secondary Neutral/Solid (`badge={number}`; `level` passed from Segmented).
4. Popover: `onOpenChange` + `anchorRef` give light dismiss (pointer-down outside) and Escape (focus returns to the trigger); Search clear button enabled (`searchClearable`, Figma Search/Popover Typing/Inputted). Platform Popover page: Search toggle now works, outside click closes.

## Live check — Search/Default, Input fields

- Search/Default (standalone Search, 60 variants): tokens, icons (16/20), radius (r8/r12) and all element positions match code within 0.4px across Small/Medium × 3 themes × Icon-Search. Figma inconsistency: the 3px OUTSIDE focus ring exists only on Theme=Default (Focused/Typing); Filter-Icon/Filter-Dropdown have none — code keeps the ring on every theme (keyboard visibility); designer to confirm.
- Input field sets (Text/Select/Date/Number/Text-Area): Label (Body/Small/Regular) + 8px + Field-Only — matches.
- Help-Text fixed: Negative/Warning/Positive use Caption/Medium; Warning colour Content/Warning/Base; Positive icon icon-check-line; icon Element-Size/Popular/XSmall.
- Input/Heading rebuilt as an inline heading (no field chrome): Heading/1–3, 8px pad outside the text (−8), radius 12, Neutral/Subtle surface on hover/focus/typing. Matches 389×40/36/32 with 405×56/52/48 surface. (Figma H3 non-default states use a 44px surface — outlier.)
- Autocomplete-Field in Figma is a Tag list (wrap, gap 4, Tag Remove=Yes, Error state) + "Add Item" Button/Main XSmall Secondary that opens Popover/Default (Search + "Search and select" label + items). Code's AutocompleteField is a plain input with a chevron. Needs a Tag component (Figma page ❖ Tag 260:5187) — not built yet.

## New: Tag + Autocomplete-Field (live Figma)

- `Tag` (src/components/Tag, Figma 288:32046): Theme Text-Only / Leading-Icon (16, Neutral/Base) / Leading-Photo (Avatar 2XSmall, 4px left padding) × State Default/Hover/Focused/Error/Disabled × Remove (icon-x-circle-solid 16, Placeholder; Negative/Light on Error). 28px, padding 4/6, gap 2, Tag/* tokens, 1px INSIDE stroke, Shadow/Action/Tertiary; Focused = 2px Focus/Accent/Solid; Disabled = Border/Disabled + Content/Disabled, no shadow. Positions match the live file (text x 10/28/30, icon 6,6, photo 4,4).
- `AutocompleteField` rebuilt (Figma 1241:5616): Label + wrapping Tag list (gap 4, 4px block padding) + "Add Item" Button/Main XSmall Secondary; the button opens Popover/Default (Search, "Search and select", unselected options) over the Add slot; selecting adds a tag and keeps the popover open; outside pointer-down/Escape close; `invalidValues` → Tag Error; `readOnly` = View-Only (no remove/add); `error` → Help-Text Negative. API changed from InputFieldProps to options/value/onChange.

## Sidebar Master/Basic (live)

- Collapse control = Button/Icon-Flat Small (32px) inside a 20×20 wrapper at −6,−6 → header stays 68 (was 72); icon 16 (Button icon size Small); icon-layout-left-line expanded / icon-layout-right-line collapsed.
- Surface shadow now references Shadow/Bottom/Level-1 (values unchanged).
- Collapsed: header 104 (logo 28 + 16 + collapse 20); collapse centred at 26,66; items 44×44 centred at x=20 (icon at 32). Figma footer items are 48 wide at x=18 (outlier vs body 44) — code uses 44.
- Expanded matches: root 260 (pad 8/0/8/8), surface 252 r20, header 68, items 236×44 at 16,84 step 46.

## Sidebar Small-Density + Workspace (live)

- Small-Density collapsed rail was 220px because it used Sidebar/Small-Width (the expanded Small-Density width); now 52 (= 20 + 4 × 8). Collapsed layout matches: header 92 (logo 24 at 14,12; collapse 10,54), Search → Button/Icon-Main Small Tertiary at 10,100 (click expands), items 36×36 at 8,152 step 38, footer padding 8.
- Small-Density expanded: collapse top-aligned (222,6); footer items 36 (footer button height follows item padding/density).
- Workspace: Master rail and Main panel use Background-Blur (40px) with no drop shadow (Main had Shadow/Bottom/Level-1).

## Date Picker (Single-Calendar) aligned with live Figma (page 453:32817)
- Nav buttons are now `IconButton appearance="main" level="tertiary" size="sm"` with `icon-chevron-{left,right}-line-small`; the icon is overridden to Element-Size/Popular/Base (20px), as the Figma instance does (the base Small component uses 16).
- Month/year container uses Body/Extra/Bold, Neutral/Flat Default/Hover background (transparent token), and a focus-visible ring.
- Header-to-calendar gap is 12 (header margin -4 on the 16 gap). Grid row-gap is 2. Today border is 2px inset. Event dot is 4px Content/Accent/Light at bottom 4, centered. Weekend label is Neutral/Light.
- Range start/end: a selected circle (radial-gradient) over the In-Range strip, radius 1000/0/0/1000 for start and mirrored for end.
- Container padding is 16−1 so the 1px border stays inside (total 256 wide, like Figma's INSIDE stroke).
- Measured on the Platform (Input → date): width 256, header gap 12, row gap 2, nav 32/icon 20, month 144×32 Body/Extra/Bold, today 2px. Build OK; run-all 17 ✓.
- Figma inconsistency: Date-Container radius is 8 on Default/Static/Display but 12 on Hover/Focused (code keeps 8).

## Checkbox hover (real-pointer check)
- Figma Checkbox/Mark Hover: a 32px Focus-Ring rectangle (-8 inset, radius 1000, Neutral/Flat/Hover). Unselected uses Background/Unselected/Hover plus Border/Hover. Selected/Indeterminate uses Background/Seclected/Hover with no stroke. Label stays Neutral/Strongest.
- Bug fixed in checkbox.css: the unselected hover rule `:hover:not(:has(input:disabled))` (0,4,1) outranked the selected hover rule (0,4,0). Hovering a checked/indeterminate box showed the near-transparent unselected-hover fill and border instead of #606060. Disabled+checked also turned #606060 on hover. The selected hover selector now carries the same `:not(:has(input:disabled))` guard.
- Verified with Playwright real hover (scratchpad hover-check.mjs), light and dark: unchecked, checked, indeterminate, disabled, disabled+checked and right-side all match Figma. RadioButton checked the same way: already correct.
- The figma-contract suite forces `data-state="hover"`, so it cannot catch `:hover` specificity bugs; a real-pointer check is needed for these.

## Platform playground review + Examples
- Playground fixes (src/platform/PlatformExamples.tsx):
  - Generated code now reflects the active controls instead of fixed or always-on props.
  - Button, Search, Segmented, Toggle, Checkbox and Radio use `disabled` rather than a forced `state`.
  - Chip: Advanced opens a real Popover (single/multiple, count, clear). Normal toggles `select` on click and gained a Level control.
  - Sidebar: the forced hover/focus demo items were replaced by real items. Clicks move the selection, the section action is an IconButton, and Expand is hidden for Workspace.
  - Input: added an Error control. Leading/Trailing controls only appear for text/field-only (date/select/number keep their own affordances; date previously lost its calendar icon). Added "heading" to Type.
  - Toggle: removed the forced Hover control (real hover works).
  - Avatar: all 17 themes, including photo, plus a stack count.
  - Checkbox: indeterminate is now visible, and clicking resolves it.
  - Radio: now a 3-option radiogroup (a lone radio could not be unselected).
  - Badge: all 18 themes, working remove with restore, and a counter value control.
  - Popover: code sample now puts anchorRef on a wrapper.
- New pages: Tag and Date Picker (nav, labels, breadcrumbs, topbar controls).
- Examples (src/platform/PlatformShowcases.tsx): 2–3 live compositions per component, each with a Code toggle. PlatformCode moved to src/platform/PlatformCode.tsx.
- Component changes:
  - DatePicker gained `onRangeChange({ start, end })`, since range mode could only report one date through onChange.
  - Popover: Escape now also closes the popover while focus is still on its anchor/trigger (the normal state after a mouse click). Before, Escape only worked with focus inside the surface.
- Verification:
  - scratchpad interact.mjs: 24/24 real pointer/keyboard checks.
  - 14 pages render with no console errors, and there is no horizontal overflow at 390px.
  - Build OK; run-all 17 ✓; Storybook build OK.
- Known gap: the Search filter-icon and filter-dropdown trailings are decorative (not buttons), so they cannot open a menu yet.

## New components from live Figma: Tooltip, Tabs, Breadcrumbs, Progress, Dialog
- Selection: ~30 Figma component pages were unbuilt. These five are high-use and compose already-built parts (Button, Badge-Counter, Icon).
- Deferred:
  - Inline Message still nests the legacy `Button/Main-Old`.
  - Alert Banner, Pagination and Table are next candidates.
- Components (src/components/*, exported from src/index.ts):
  - Tooltip (1595:2220):
    - `TooltipSurface` covers Color Default/Accent/White-Overlay/Black-Overlay × Size Medium 8/12 and Small 4/8. Radius Base, Effect/Popover, Caption/Medium label.
    - `Tooltip` shows on hover after a delay and immediately on keyboard focus. It sets aria-describedby, closes on Escape, and supports a controlled `open`.
  - Tabs (Tab-Item 1576:2090, Tab-Bar 1577:5477):
    - Indicator style: 40/32 height with 4/2 block padding. The hover fill bleeds 8px. The selected state draws a 2px Tab/Border/Selected line over the bar's 1px Border/Neutral/Pale.
    - Subtle style: padding 12/8, radius Base, Tab/Background tokens.
    - Label is Body/Base Medium, and Bold when selected (width reserved so neighbours don't shift). Icon is Popular/Base. Badge is Badge-Counter XSmall/Neutral/Subtle.
    - Behaviour: tablist/tab roles, roving tabindex, ←/→/Home/End that skip disabled tabs, and `TabPanel`.
  - Breadcrumbs (Item 292:43787, Breadcrumbs 4031:20161):
    - Sub level: 28px, padding 4/8, radius Small, Neutral/Flat hover.
    - Master level: 28px icon wrapper that turns Inverse/Solid on hover.
    - Separator: chevron-right-line-small (Neutral/Light), gap 2. Emphasis Default/Medium. The last item gets aria-current.
    - `maxItems` collapses middle items behind a "…" button.
  - Progress:
    - Progress-Bar (1536:260): 8px Neutral/Subtle track with an Active Neutral/Accent fill. Theme=Status maps <33 → Negative, <66 → Warning, otherwise Positive.
    - Progress-Circle (6915:62964): 20px disc with a 2px Support/*/Subtle ring and a 12px Support/*/Solid conic pie from 12 o'clock.
    - Done state: solid disc plus a 12px check in Content/On-Colors (Inverse/Strongest for Neutral).
  - Dialog (Modal/Dialog 841:17177 + Actions 694:9383):
    - Panel: 440px wide, Modal-Radius 36, Background/Container, 1px Container/Border, Effect/Container. Themed 44px icon; Heading/3 (Heading/4 on mobile); Body/Base caption in Neutral/Base.
    - Actions: Dual is [Tertiary][Primary] right-aligned; Triple puts the tertiary action on the left. At ≤480px they stack full width with Primary first.
    - Behaviour: portal, focus trap, initial focus (`autoFocus` action), focus restore, Escape/overlay dismiss, body scroll lock. Uses alertdialog for warning/negative.
- Platform: pages tooltip/tabs/breadcrumbs/progress/dialog, each with a playground and 2–3 Examples.
- Verification:
  - interact2.mjs: 14/14 real pointer/keyboard checks, including mobile Dialog layout.
  - interact.mjs: 24/24 still pass.
  - No console errors and no overflow at 390px.
  - Build OK; run-all 17 ✓; Storybook OK.
- Figma notes:
  - Tab-Item selected (Indicator) Fill uses x=-12 while other states use -8. Code uses 8.
  - Modal/Dialog Custom slot pads 24 on all sides after a 24-padded content block (48px gap). Code uses 0 top.
- Recheck against live Figma: the Tab-Item Fill offset (-8 vs -12) and the Dialog Custom padding are still unchanged. Every visible Hover variant with a label uses -8, so the code stays correct.
- Fixed a code mismatch: icon-only Tab-Items have Fill x=0 (no bleed) in Figma. Code now keeps icon-only Indicator fills flush (40×40), while labeled items still bleed 8px.

## Search/Popover, Popover playground, Overviews (live Figma)

- Search/Popover (1604:27401, 30 variants = Theme × State × Icon-Search) is now a real Search variant: `<Search variant="popover">` is always Small with Corner-Radius/Input/Medium. Focused/Typing show only Input/Background/Focused, with no focus stroke and no 3px ring (before, the popover search still showed the Input focus ring). Hover keeps the 2px stroke. Popover's `.Primitives/Popover/Search` (Theme=Default, Icon-Search=No) uses it. The old popover.css overrides were removed. There is a new Storybook story, "Search/Popover", and a Variant control on the platform Search page.
- Popover: an uncontrolled search query is reset on every open/close. Before, reopening a Select kept the old query, so typing again gave "No results".
- SelectField gained `popoverLabel`, `popoverSearch` and `popoverSearchPlaceholder`. With search enabled, focus moves to the search field when the list opens.
- Platform Popover playground: the trigger is now a Chip (Advanced) or a Select Input (Trigger control), with Label and Search toggles. The Button trigger was removed. The code sample follows the selected trigger.
- Typography: the token system keeps only Dashboard / Popular / Mobile. Zen-Platform, which the Figma Codebase Platform canvas pins, is platform-only:
  - The shell (`.official-platform`) is `data-typography="dashboard"` plus 6 overrides in platform.css: TASA Explorer for Display/Heading, and Display letter-spacing D1 −2.08, D2 −1.84, D3 −1.6, D4 −1.44.
  - The topbar Typography chip now only drives component previews, through `PlatformTypographyContext` → `data-typography` on every `.platform-example-row` / `.platform-input-preview`, the Example stages and the Typography gallery.
  - The cover and page hero titles use `--zen-typography-font-family-display` instead of a hard-coded TASA.
  - The Overview no longer sets its own mode.
- Overviews matched to frame 14243:64878 at 1512 px:
  - Tagline 700×240 at 536,612: TASA SemiBold 40/48/−1.6, centred, 36 px below the cover.
  - Download button at 801,900.
  - Cards 289×232 at x 589/894/742, starting at y 1012, with TASA Heading/4 titles.
  - Cover title in uppercase ("ZEN DESIGN SYSTEM"). KAIZ uses All-Caps/M-BOLD.
  - The floating action is now Button/Icon-Main Medium Accent with icon-zen, 24 px from the corner.
  - Card titles now use Content/Neutral/Strongest (they were unreadable in dark mode).
- Verified: run-all 17 suites ✓ + 25/25 interactions; `npm run build`, `styles:check` and `build-storybook` OK. Checked by hand in the browser: popover search focus has no ring, filtering and clear work, Select and Chip triggers work, there is no page overflow, and the Overview renders in dark mode.
- Left as is: the Figma cover title box is 272 px high vs 281 px in code (line-height 78% of TASA Black). The Figma sidebar header still shows the collapse icon, but the template lock says the platform shell does not render it.

## Popover item content themes (padding bug) + content picker
- Figma .Primitives/Popover/Item/Content (829:20006):
  - Icon, Avatar Small, Photo Small: 20px leading, gap 12, aligned MIN (top) when a caption is present.
  - Avatar Big: 40, gap 16, centred. Photo Big: 32 r4, centred. Dock Icon: 24 rounded Neutral/Subtle, centred.
  - Text-Only: 4px inline padding. Badge: a Medium Solid Badge is the whole content.
  - Item container: padding 8, radius 12; Single-Selected pads 12 on the right and adds a 12px check.
- Root cause: the leading slot has a fixed Figma size, but callers passed arbitrary nodes (e.g. `<Avatar size="small">`, 32px, into the 20px Avatar Small slot). The avatar overflowed and the item padding/gap looked wrong.
- Fix (Popover.tsx / popover.css):
  - `PopoverItemData.photoSrc/photoAlt` renders the Figma-sized primitive itself: Avatar 2XSmall/Medium, or an img 20/32 with r4.
  - Any Avatar inside an avatar theme is forced to fill the slot.
  - Small themes top-align their leading with a caption.
  - Theme=Badge (Function=Default) renders the label inside a Medium Solid Badge (`badgeTheme`). Manual-Add-New is unchanged.
  - `photoSrc` alone infers theme avatar-small.
- Platform:
  - The Popover playground gained Content (8 themes) and Caption controls. Each theme uses its own realistic data set (Sort by, Language, Assignee, Switch account, Recent files, Products, Integrations, Status), exported from PlatformShowcases as `popoverContentSet`.
  - The Chip trigger mirrors the selected option's icon/photo.
  - Existing examples (Chip owner filter, Popover assign) now use `photoSrc`.
- Verification:
  - popcontent.mjs: 16/16 (8 themes × caption off/on) — leading size, gap, alignment, padding, no overflow, badge-as-content.
  - interact 24/24, interact2 14/14 on two consecutive runs; one earlier run was flaky and did not reproduce.
  - Build OK; run-all 17 ✓.
- Note: another session concurrently edited Popover.tsx (search re-sync, Search variant="popover"), Search, Input (SelectField popover) and the Popover playground (Trigger control). Those edits were kept and built on.

## Iconography toolbar + Typography page (Zen-Platform)

- Iconography:
  - A legacy `.icon-gallery__toolbar input/select` rule restyled the input inside the shared Search: it drew a white 40px box with a border and 4px radius inside the field. The rule is removed.
  - The toolbar now uses `<Search label="Search icons">` and a `SelectField` "Preview size" whose Popover has the Label "Icon Size". Before, this was an Advanced Chip.
  - `Search` gained a `label` prop, passed through to the Input label. With a label, aria-label no longer falls back to the placeholder.
- Typography page:
  - The gallery is no longer wrapped in the system mode, so every text style renders in the platform's Zen-Platform set: TASA Explorer for Display/Heading, D3 −1.6px, and so on.
  - Each row's meta (family · weight · size/line-height · tracking) is read from the rendered sample. This keeps it correct in any mode, Storybook included.
  - Group headings use Heading/3.
- Correction (user): Zen-Platform is used only for the platform UI. Built components and text-style samples keep Dashboard as the default mode. `TextStylesGallery` gained `sampleTypography`, which sets `data-typography` on each sample. The platform passes the preview mode, which defaults to Dashboard. Group headings and hero stay Zen-Platform. The row metrics now read Dashboard values (e.g. Display/3: Inter 40/48 −1.20px).

## Date Picker: Dual-Calendar + Select-Month-Year (live Figma 453:32817)

- `calendar="dual"` renders Figma Date-Picker/Dual-Calendar (465:41427) with two consecutive months:
  - Each panel is 224 wide; the panels are Spacing/Gap/Small (12) apart, for 492 overall.
  - Headers are Type=Static: the label is not clickable. Back sits on the first panel and Next on the second; a hidden button keeps its 32px slot so the label stays centred.
  - Range selection works across both months. The platform playground has a new Calendar control (Single / Dual).
- The single calendar's month/year now opens Calendar Type=Select-Month-Year (478:30561 / Single-Calendar State=Select-Month-Year), exported as `DatePickerMonthYear`. It measures 256 × 308 (content 224 × 228):
  - Header in the Focused state: Neutral/Flat/Hover, Corner-Radius/Base, month at the start and year at the end.
  - Two wheels: Heading/4, 5 rows of 28px, gap 4, fading 1 / 0.4 / 0.2 away from the selection, with 16px blank rows above and below.
  - Actions Dual: Cancel (Tertiary) and Submit (Primary), 16 below the wheels.
  - Months wrap around; years are open-ended.
  - Interaction: click a row, press ArrowUp/Down, or use the mouse wheel (a non-passive listener, so the page does not scroll). Submit jumps the calendar to that month; Cancel or the header returns to the day view unchanged.
- Month/year wheels also support press-and-hold drag:
  - The pointer is captured only after 4px of movement, so a plain press still clicks a row.
  - Every 32px (row pitch) steps one value; dragging down reveals earlier values.
  - The remainder follows the pointer (`--zen-date-picker-wheel-drag`) and snaps back on release. The click that ends a drag is swallowed.
  - The cursor is grab/grabbing, with `touch-action: none`. Verified with real mouse drags: month +2, year −2, and a click after a drag still selects.
- `DatePickerAction` default apply label is now "Submit" (Figma). `DatePickerHeader` gained `back` / `next` and renders a Static label as a span.
- Not built yet: the Time-Picker (Range / Single) that Dual-Calendar shows by default, and Date-Picker/Mobile.
- Motion pass (user):
  - The month/year wheels are now a carousel. The position is continuous, and rows are absolutely placed with `translateY` and an interpolated 1 / 0.4 / 0.2 → 0 fade.
    - Drag follows the pointer 1:1. Release adds momentum (velocity over the last 80ms × 220ms, capped at ±6 rows; none if the pointer rested) and eases to the nearest row, frame-rate independent (τ ≈ 70ms).
    - Wheel and trackpad move the target continuously (≤1 row per event) and snap after 120ms idle. ArrowUp/Down, or a click on a row, glides to it.
    - The listbox is focusable and uses `aria-activedescendant`.
  - View switch: `.zen-date-picker__viewport` transitions its height to the measured view (ResizeObserver; 270 ↔ 308 over ~280ms). The incoming view fades in and rises from −6px at scale .98, over 260ms. This does not play on first open.
  - `prefers-reduced-motion` turns motion off.
  - Verified in headless Chromium (scratchpad dp-motion.mjs): smooth height samples, continuous mid-drag positions, correct snaps, momentum cap, wheel +3, and no errors. The in-app browser pane was hidden (document `hidden`), so its rAF and animations do not run there.
- DatePicker is a popover:
  - With `onClose`, a pointer-down outside the surface and outside `anchorRef` closes it. Escape closes it too, but first steps out of Select-Month-Year back to the day view.
  - A single pick, or a complete range (without actions), closes it, and so do Cancel/Submit. Closing returns focus to the trigger. Every opening starts on the day view.
  - DateField passes its wrapper as `anchorRef`. It re-opens on click, and the focus that returns on close does not re-open it.
  - Platform playground (user decision): no trigger input. The picker stays inline and always open, as before, because no `onClose` is passed. The code sample notes how to use it as a popover.
  - Verified with Playwright (scratchpad dp-popover.mjs): outside click, trigger toggle, pick+focus, Enter, Escape (month-year → days → closed), clicks inside month-year keep it open, and the DateField flow. No errors.

## Anchored placement for Popover + Date Picker

- New `useAnchoredPosition(surfaceRef, open, { anchor?, gap = 4, align })` in `src/components/Popover/useAnchoredPosition.ts`, exported from Popover. It works on absolutely positioned surfaces only; inline pickers and Bunk-Action are untouched.
  - The surface sits `gap` (Spacing/Gap/2XSmall = 4) below the anchor box. It flips above when the room below is smaller than its height and smaller than the room above.
  - Horizontally it aligns to the anchor start, or to the end when the start would overflow.
  - Room is measured against the viewport intersected with every clipping ancestor (overflow ≠ visible).
  - It re-measures on scroll (capture), resize and surface size changes (ResizeObserver), for example search filtering or the Date Picker's month-year view.
- Anchor box:
  - Popover: the enclosing `.zen-input__control` (SelectField, Input leading/trailing pickers), otherwise `anchorRef`, otherwise the containing block (Chip dropdown, Autocomplete add slot).
  - DatePicker: `anchorRef`'s `.zen-input__control` (DateField), otherwise `anchorRef`.
  - Popover gained `align`; the Input leading/trailing picker passes its side.
- Behaviour changes:
  - DateField fallback gap 8 → 4.
  - The Autocomplete popover now opens 4px below the Add button instead of over it, per the user rule "popover 4px from the input box".
  - The platform playground panel no longer clips (`overflow: visible`), so flipped popovers are not cut.
- Verified with Playwright (scratchpad placement.mjs), with the gap exactly 4 in every case: Chip below / flipped above near the bottom; playground SelectField; topbar chip; DateField below / above; DateField month-year view (re-measured, still 4); Select input near the bottom (above). No errors.

## Tertiary button shadow across Component Theme modes (live Figma)

- Figma:
  - Button/Main and Icon-Main Tertiary use the effect style Shadow/Action/Tertiary on Default, Hover and Focused: 0 1 1 0, colour `Button-Tertiary/Shadow/Default`, plus background blur 40.
  - Pressed has no shadow. Disabled has no shadow, except the Icon-Main 2XSmall outlier (Shadow/Action/Basic), which stays documented.
  - `Button-Tertiary/Shadow/Default` resolves to Color/Shadow/Neutral/Light in Neutral-S1, Brand-S1 and Neutral-S3 (Light 4%, Dark 16%), and to #FFFFFF00 (no shadow) in Neutral-S2 and Brand-S2. The repo tokens already matched.
- Bug:
  - `style-effects.css` declared every `--zen-style-*` value only on `:root`. A custom property resolves its `var()` where it is declared, so every effect/paint style was frozen to the default modes.
  - Measured before the fix: the Tertiary shadow was rgba(0,0,0,.04) in all 10 theme × mode combinations. It affected every themed style (Popover, Input, Level shadows…) whenever the mode is set below `:root`, as on the platform `<main>`.
- Fix: `scripts/build-style-manifest.mjs` now emits the variables for `:root` and every mode-axis attribute (`[data-brand]`, `[data-theme]`, `[data-component-theme]`, `[data-density]`, `[data-radius]`, `[data-emphasis]`, `[data-breakpoint]`, `[data-typography]`).
- After the fix: S1/S3 are .04 in Light and .16 in Dark; S2 is transparent. This was measured after the 120ms box-shadow transition (scratchpad tertiary-shadow2.mjs; an immediate read returns the transition's start value).

## Multi-select Popover uses Checkbox/Mark (live Figma)

- Figma Popover page: the multi-select Popover/Default puts `Checkbox/Mark` (311:47222, 16×16) at the end of each Item's Content slot, 8 after the Item/Content. The Item stays Select-Control=No / State=Default (no Single-Selected fill, no check icon); the selection is Mark Select=Yes.
- Code changes:
  - `CheckboxMarkIndicator` is exported from Checkbox. It is the standalone decorative Checkbox/Mark with the same box tokens, and takes `checked`, `indeterminate` and `disabled`.
  - `PopoverItem` gained `control="check" | "checkbox"`, and `Popover` gained `multiple`. With `multiple`, items render the trailing mark, drop `.is-selected` and the tick, and the listbox gets `aria-multiselectable`.
  - `Chip` passes `popoverMultiple` through. This covers the Status filter, the multi-value playground controls and the "Assign people" showcase.
- Verified with Playwright: mark 16×16, 8 from the content, 8 from the item edge; checked = Checkbox Selected fill; the list stays open while toggling. Single-select popovers still show the tick. No errors.
- Popover.tsx also carries concurrent edits from another session (Avatar/BadgeTheme imports); they were left untouched.

## Platform surface sync (all non-component pages)

- Reference, taken from the component pages (playground panel and Example cards):
  - Container: Surface/Default, no border, Corner-Radius/2XLarge (24), Shadow/Bottom/Level-1.
  - Inset canvas: Neutral/Pale/Default at radius 8.
  - These are now shared variables on `.official-platform`: `--platform-surface-background|radius|radius-compact|shadow|padding|divider` and `--platform-inset-background|radius`. The component panel, Example cards and Overview cards use them too. The Level-1 shadow now comes from the style variable instead of three hard-coded literals, so it follows dark mode.
- Pages brought onto the contract (platform-scoped overrides; Storybook foundations are unchanged):
  - Installation panel: was border + r20 + its own shadow.
  - Design Tokens: collection cards were transparent with a border and r12. The collection links block was border + r20; its buttons are now the inset style. The dependency block is r24.
  - Typography: style lists were border + r12; rows are now transparent with pale dividers.
  - Collection detail: the token table was border + r12; its head is now the inset background.
  - Iconography: the toolbar was border + r8 + translucent; icon cards were border + r8. Icon cards use surface-radius-compact (16) and inset previews.
- Collection cards use a fixed row grid. The code-axis row is always rendered (hidden when empty), so Variables/Modes line up in each row.
- Guideline sections (`pg*`) added by another session were left untouched.
- Verified: surface scan shows every container is `#fff / no border / r24 / Level-1` on Installation, Design Tokens, Typography, Iconography and Overviews (icon cards r16). Build and Storybook build pass.
- Code view is always dark (user):
  - `--platform-code-background` / `--platform-code-foreground` are pinned to the Global primitives `--zen-light-neutral-12` (#111) and `--zen-dark-neutral-12` (#fafafa). These are the Light-mode values of Neutral/Solid and Inverse/Strongest; the semantic tokens flipped the block to light in Dark mode.
  - The pinned colours and `color-scheme: dark` apply to `.platform-code pre` (playground and Examples) and the Installation `pre`. Syntax colours were already fixed hex.
  - Verified light/dark: rgb(17,17,17) / rgb(250,250,250) in both modes. The Overview card icon (same token pair, not code) still follows the mode.
- Avatar/Single Medium label (designer update, live Figma): the text style is now Body/Extra/Medium (Inter Medium 16/24, −0.16px), replacing Heading/Subheading. The other sizes are unchanged: 3XL Display/4, 2XL Heading/3, XL/L Heading/4, S Body/Base/Medium, XS/2XS Caption/Medium. `initialsStyle.medium` was updated; the rendered label measures 16px/24px w500 −0.16px.

## Text rendering vs Figma (weight looked heavier)

- The font is Inter 4.001 Variable (axes opsz 14–32, wght 100–900); `font-synthesis: none` was already set, so no faux bold.
- Measured ink density (Playwright on macOS, DPR 1) against Figma exports of the same text, size and width:

  | Sample | Before | Grayscale AA only | Grayscale AA + no auto opsz |
  |---|---|---|---|
  | Card body, Regular 14 | +18% | +5% | +5% |
  | Card title, Semi Bold 20 | +10% | −1% | −1% |
  | Heading/3 (24) | +6% | −5% | −2% |
  | Display/4 (36) | +4% | −7% | −1% |

- Causes:
  - macOS font smoothing ("stem darkening") thickens glyphs.
  - CSS `font-optical-sizing: auto` uses Inter's display cut at large sizes, while Figma's "Inter" is always the text cut (opsz 14).
- Fix in `src/styles/reset.css` (`:root`), so it applies to Storybook, the platform and consumers: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; font-optical-sizing: none;`.
- Scripts: scratchpad ink.mjs (card) and ink2.mjs (large text).
- Token tables (TokenTableView, added by another session): the Preview/Dimension column is now a regular cell. It overrode the cell with `height: auto`, 16px padding on all sides and no bottom border, so it had no row divider. It now matches the other cells (72px, 0/16 padding, 1px Border/Neutral/Pale divider), with the preview centred; the dimension bar is 40px high like the colour swatch and radius previews. Checked on Spacing, Typography Configuration and Corner Radius.
- Token tables: the Letter-Spacing table no longer has a Preview column (user). `hasPreview()` excludes `Typography/Letter-Spacing/*`, and a dimension table drops its third column when none of its tokens has a preview. The "Letter spacing" sample was removed from PreviewCell. Typography Configuration: Letter-Spacing shows Token | Value; every other table keeps its 3 columns.
- Page banner (PlatformPageHero) title: `max-width: 900px`, centred (152px each side in the 1204 hero). Short titles stay on one line. Long collection titles wrap to two lines inside 900 (Global Dimensions, Base Colors (Project), Mode Colors (Semantic), Component Theme/Size, Breakpoint & Grids, Typography Configuration); the divider shrinks to 52px and nothing overflows or clips.

## Sidebar A–Z + five new components (live Figma)

- Sidebar: component entries come from `componentNavigation` and are sorted by label (`localeCompare`), so new pages land in order. `componentPageIds` also drives the breadcrumb and topbar settings chips, replacing two hand-kept lists.
- New components, each with a platform playground page, token-driven CSS and exports from `src/index.ts`:
  - **Accordion** (Accordion/Text 239:16847):
    - Size Medium/Large/XLarge × Theme Divider/Box × Expanded. Title is Heading/Subheading, Heading/4 or Heading/3; content is Body/Base/Regular in Neutral/Base.
    - Padding: Medium 16, XLarge 24 (Box on all sides). Title–content gap 8/12/16; chevron 20/24/28, rotated 180° when open.
    - Box surface is Support/Neutral/Pale at r16/r24. The Divider rule is an inset 1px shadow so the collapsed item stays 56px.
    - The panel height animates (grid-rows) and respects reduced motion.
  - **AlertBanner** (Alert-Banner 6828:9393):
    - Themes Default/Info/Positive/Warning/Negative, all Solid; Warning content is On-Brights.
    - Medium 56px (padding 12/20, gap 12, 20px icons, Body/Base/Medium, Button/Overlay Small Inverse action); Small 32px (8/16, gap 8, 16px, Body/Small/Medium, no action). Close uses icon-x-small-line.
    - role=alert for Warning/Negative.
  - **Pagination** (774:29083 + Item 774:15999):
    - Primary/Secondary: tertiary ‹ › (icon-chevron-*-line-small) around items with at most 7 slots (`1 2 3 … 8 9 10`); items are 24 (XSmall) or 32 (Small).
    - Selected item: Primary Active/Neutral/Solid with Inverse text, Secondary Active/Neutral/Subtle.
    - Inline: page-size Chip/Advanced + "1 - 50 of N results" (Body/Small/Regular) + navigator. Manually: page-size Input (133px) + label + navigator.
  - **Toast** (Toast-Message 1579:13276):
    - Types Neutral/Subtle/Info/Positive/Warning/Negative with per-type icons and action buttons (Overlay Inverse / Main Tertiary / Overlay White).
    - r24, Effect/Popover, padding 16/20; Title Body/Base/Bold and caption Body/Small/Regular. Subtle is the Popover surface with a 1px outside stroke.
  - **Skeleton** (page 1556:17503):
    - `SkeletonText` (8px bars, gap 8, last line −40px), `SkeletonHeading` (32/24/16) and `SkeletonShape` (Rectangle/Pill/Round/Square × 48/40/32/24/20), all Neutral/Subtle.
    - The pulse animation is optional and off for reduced motion.
- Verified with Playwright: A–Z order (24 items). Accordion 56px collapsed with single-open toggling. Alert 56px, dismissible. Pagination 272×24, matching Figma, with correct ranges after navigation. Toast 648×70 r24. Skeleton bars correct. No console errors; build, Storybook and contracts pass.
- Not done: Storybook stories for the new components; Inline Message, Slider and Divider pages.

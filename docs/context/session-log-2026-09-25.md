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

# Session log 2026-10-17

## Overlay buttons: Level=Inverse Subtle (user: "Thêm 1 button inverse subtle cho các button Overlay", then "thêm trong Figma rồi update lại trong studio") — tier M
- Figma `9nZv4uW2LT21yuHabMTCh1`, page ❖ Button: Button/Overlay 1026:8747 (+25, rows 20–24 of its grid, which had 5
  empty rows) and Button/Icon-Overlay 291:41855 (+30, rows 24–29). Each variant is a clone of the same Size × State
  Inverse variant (refs copied back: Leading/Trailing-Icon visible + swap, Text; icon set: Leading-Icon-Src), then:
  Container fill Background/Inverse/Subtle/Default·Hover·Pressed (Focused = Default), Disabled Background/Inverse-Disabled;
  label + icon Vector Content/Inverse/Strongest, Disabled Content/Inverse/Disabled; Effect/Overlay (blur) on every state
  of both sets (Icon-Overlay Inverse/White carry Shadow/Action/Basic; a translucent fill takes the blur as White/Black
  Overlay do); no gradient ring; Focus-Ring unchanged (Focus/Accent/Solid). Tree signature = the source variant except
  the icon set's effect binding. Level option order is Inverse · White · White Overlay · Black Overlay · Inverse Subtle
  (the API cannot reorder options). Set descriptions' Level line updated (`tools/figma-docs/component-descriptions.mjs`).
- Disabled content is Content/Inverse/Disabled, not On-Black-Overlay/Disabled as the other overlay levels: it flips with
  the mode like the Inverse/Subtle fill and Inverse-Disabled background (dark mode = dark ink on a light surface).
- Code: `inverse-subtle` in `buttonLevels` / `buttonOverlayLevels`, one rule in `button.css`, playgrounds on the Button
  page, paint matrix row in `docs/button-main.md`, Level line in the guideline source; regenerated docs/api,
  docs/guidelines, docs/ai-ui.
- Studio: Level option added to `docs/figma-contracts/component-properties.json` for both sets, then
  `figma-props-build.mjs` + `variant-sets-build.mjs` (Properties panel + Main component frame). Library keys are per set,
  so Studio → Figma import needs only the library publish.
- Contracts: `button-text.json` / `button-icon.json` patched with the new variants through `tools/figma-kit` (fetch +
  patch; live `__HASHES` ✓ for both sets). `lock --check` also failed on two sets this change did not touch (Segmented
  1204:11690, uncommitted patch of the session below; Dashboard header 4122:33402, contract committed without `lock`):
  `lock` rebuilt, ✓ 94 sets. Suites: Button/Overlay 9000/9000, Icon-Overlay 5940/5940 (3 modes). Gate: `npm run qa --
  --isolated --files=…` PASS (Button page + representative pages, dark, behaviour, 69 browser tests).
- Open: `studio:selftest` stops at `library-keys check` on 4 chart Sector sets with no key yet (another session's
  2026-10-17 chart work), not this change; the rest of the chain passes. Publish the Zen library so other files see the level.

## Segmented Small size token (tier XS, session "Bug"; user: "Update token của component size Segmented")

- Live file read (Component Size, all 14 Segmented/* variables): one change, Segmented/Spacing/Small/Horizontal-Padding
  Compact {Spacing/Padding/2XSmall} → 6 (Comfortable was already 6). Primitives/Segmented/Item Small variants: padding
  4/6, bound to that variable. Repo-only Studio mode unchanged.
- `component-size.json` + sync note in `figma.collections.json`; `npm run tokens:build`; `segmented.css` fallback 6px.
- Contract `segmented-toggle-badge-avatarstack.json`: the 8 changed Small variants patched (w +4, padding 6, visible
  children x +2) and verified by `__HASHES`: both sets now hash equal to the live file.

## Studio → Figma import matches the page, part B: charts (tier M, session "Figma và Studio import chính xác"; user chose "Biểu đồ trước, rồi dán thẳng")
- Push (tools/studio/figma-charts.mjs): Stack-Bar picks the smallest Sector set ≥ its column count (4/6/7/12) and fills
  each column's `Value` slot with a 1-column grid of segments (row shares, paint styles in palette order, series[0] at
  the bottom), the six Y ticks (`niceScale`), the active column's tooltip and the legend. Donut fills the shared
  `Ring-Slot` with VECTOR slices (the code's ring 22 %, 4px gaps, round joins) and pills ≥ 6 % at r 39, and sets Size,
  Legend (End added), Total Label / Total Value. Pull reads Sector and Legend End back.
- Library (user-approved): Stack-Bar legend named Legend / Legend-Item + 2 hidden items in the 4 Sector variants; Donut
  Legend=End variants (Total=Centre, 4 sizes), centre texts wired to Total Value / Total Label, 7 legend items, slices and
  pills in one free-form Ring-Slot in all 16 variants, defaults "Total" / "$296.8K". The 4 chart Sector sets (another
  session's) have their keys in `docs/figma-contracts/library-keys.json` (the old components are now variants).
- Plugin (local repo ef04267, dist rebuilt 01:22, backup of the 00:44 build in the scratchpad): VECTOR/ELLIPSE specs,
  paint-style fills and strokes, `place` boxes in free-form slots, `characters` edits, grid row sizes, `>` direct paths.
  The user's Expenses paste with the 00:44 build had no ring and one pill at 0,0 (report via session "Bug").
- Live bed (QA frame 15907:3): re-import 58 created / 252 updated / 0 removed, 0 notes; screenshot matches the page
  (Donut 6 slices + 5 pills, Stack-Bar 6 columns, axis 50K → 0, 46.3K tooltip, the 1px rule on the active column).
- Gates: figma-push selftest 269; plugin npm test; library-keys check 173/173. Open: Line/Bar/Area/Grouped/Combo still
  draw Figma's sample (BACKLOG); the direct ⌘V paste is next (user's order).

## Master-layout variants, Top-Navigation Transparent, White-Solid content rule (session "Master layout variations") — tier M
- Figma page ◇ Master-Layout · Variants (15902:109717): Read me + A (4 background compositions) + B (6 desktop) + C (7
  mobile) + D (5 expressive mobile from the user's references). Figma-only; review notes are on the page.
- Top-Navigation/Mobile 12014:45167 (user: "Thêm Type=Transparent cho Top-Navigation đi", chose "Cả hai"): +4 variants,
  Type=Transparent (clone of Default, no fill) and Transparent-On-Color (clone of Default-Overlay, no fill, no blur) ×
  Comfortable/Compact; clone() turned Control-Slot into a FRAME and dropped 9 refs: the source SLOT re-cloned and refs
  copied, tree signature = source. Capline of Default-Overlay, Liquid-Overaly, Compact-Overlay and the new On-Color type
  was Neutral/Light (dark on a dark scrim): now On-Black-Overlay/Base. Used in D1/D2/D3 (Transparent) and D5 (On-Color).
- White-Solid rule (user: "nền màu white solid thì chữ phải luôn là on white overlay"): usage-guard `content/on-white-solid`
  (CSS; each state's content judged on that state's fill, so a white Button's Disabled on White-Disabled passes) with
  bad/good fixtures; Figma audit `theme/on-white-solid` (authored text and placed icons whose nearest painted layer is
  Background/White-Solid) + audit-rules.md row; content-colors guideline line. Found and fixed: Tooltip white-overlay
  (Figma Simple-Label On-White-Overlay variant + Close icon, `tooltip.css`) used Neutral/Strongest; Button/Overlay (60
  layers), Button/Icon-Overlay (24), Nav-Action/Overlay (12), Nav-Action/Icon-Overlay (8) White used global Black (Figma +
  `button.css` line for level white; docs/button-main.md paint row). Contracts: 60 + 24 bindings patched by hand,
  `lock` rebuilt, live per-variant hashes of all 44 changed variants = lock; suites Button/Overlay 9000/9000,
  Icon-Overlay 5940/5940. Light and dark checked in Figma (temporary frames, removed).
- Lesson: `node.fills.find()` then `node.fills.map(p => p === f …)` never matches (every read returns a new array): the
  first rebind run reported 128 changes and changed nothing; rebind by index and read back.
- Colour balance (user: "Nghiên cứu thêm harness và rule cho việc cân bằng màu"): research + measurements +
  proposal in docs/research/colour-balance-rule-2026-10-17.md; nothing built, 4 questions to the user.

## Chart Color = Primary | Secondary in Figma (tier M, Figma only; user: "thêm variant để đổi lại dùng secondary trước, hover là primary")
- AskUserQuestion: every chart using Primary/Secondary; Figma first, code + Studio after review; property `Color`.
- Survey: only Bar-Chart has "rest Primary, active Secondary"; Stack/Grouped/Combo/Area/Donut/Radial/Gauge/Funnel/Bullet
  use them as series 1/2 (or value/target, last stage). Line, Multi-Line (Accent), Bar-List (Primary only), Heatmap left out.
- Built in `9nZv4uW2LT21yuHabMTCh1` ❖ Chart: existing variants renamed `…, Color=Primary` (instances keep them: all
  file instances read back Primary), each cloned to `Color=Secondary` with the sector styles swapped on own layers,
  `.Chart/Legend-Item` instances switched by their `Color`, Stack-Bar segment overrides swapped, Area gradients Accent ↔
  Neutral (the Stacked chart's Engineering pair). Bar 16, Stack 8, Area 16, Grouped 8, Combo 8, Donut 32 (SLOT
  re-cloned), Radial 16; Gauge 15968:130382, Funnel 15968:130460, Bullet 15968:130554 are new sets (combineAsVariants,
  keys unchanged, descriptions moved to the set). Every clone matched its source by tree signature (0 diffs).
- Horizontal sets wrap at their old width (Secondary row under Primary); section "Chart components" re-laid (it had
  Donut over Radial), the Widget themes and .Primitives sections moved down 1852.

## Tabs size Large, the desktop top-navigation tab (session "Master layout variations") — tier S + tokens
User: "Thêm size tab large giữ nguyên font size tăng size lên 64", "thêm token của nó", "Tab size này dùng cho top nav
của desktop", then "cân chỉnh … toạ độ và size" of the hover/active fill, "chỉ chỉnh cho large size thôi".
- Figma: Component Size variables Tab-Item/Size/Large/Height + Min-Width (Compact 64, Comfortable 72), Spacing/Large/
  Horizontal-Padding 0, Vertical-Padding Padding/XSmall, Gap Gap/XSmall; Tab-Item `Size=Large`, 24 variants (Indicator
  and Subtle × states). Indicator fill 40 high, centred, bleeding 16 past the label; Subtle pill 40 centred. B3 top nav
  on ◇ Master-Layout · Variants uses them; its Tab-Bar baseline override was removed so only the Divider draws the line.
- Code: tokens in `component-size.json` (+ `tokens:build`), `tabSizes` gains "large" (`lg`), `tabs.css` Large rule
  (`--zen-tab-fill-bleed` 16; Small/Medium keep 8), a Large Indicator list has no baseline and 16px inline padding
  (the list scrolls, so 8 would clip the bleed). Guideline: large only as the desktop top-navigation bar.
- Platform: Tabs example "Workspace top navigation" (bar on Canvas, Divider as baseline, account Menu, 4 panels).
- Left as is (user: "giữ nguyên các size cũ"): Figma Medium's fill bleeds 12, code's 8.

## Figma Back chevron rule in the audit (session "Bug"; user: "Sai rule … chốt rule về button back … đảm bảo không bị lại lỗi này")

- ◇ Master-Layout · Variants: C5 · Stack detail (15923:8476) and C4 · Media + Bottom sheet (15922:8357) had
  icon-arrow-left-line as Back; swapped through Leading-Icon-Src to icon-chevron-left-line-medium (colour variable kept).
  The library default is icon-plus-line, so the arrow came from the build; the audit had no check.
- `zen-figma-audit.js`: `navigation/back-chevron` (error) on screens ≤ 1024 wide or with Top-Navigation/Mobile|Tablet:
  a left-arrow icon held by Top-Leading / Leading-Slot / Nav-Action / Top-Navigation / Button, steppers (Date Picker,
  Pagination, Carousel) skipped. Row in `references/audit-rules.md`, pointer in SKILL.md. Live: C5/C4/B6 clean (B6 is
  desktop); a rolled-back negative run on C5 reports 1 finding. `npm run ai-kit:check` passes.
- Same night: B2 Inbox fixed (Panes left padding, list side padding for the 12px List-Item bleed, Segmented slot FILL,
  thread rebuilt with Chat/Section/Time + Chat/Section/Conversation), audit 0/0; Chart/Multi-Line-Chart compare
  Tooltip anchored to the active sector (Compare-Grid › Tooltip-Track) so it stays on the hover line at any width.

## Figma skill: component rules + QA before done (session "Master layout variations") — tier S
User: "Dùng button sai rule … Luôn luôn kiểm tra để không bị sai rule dùng button role", then "bổ sung skill dùng
figma luôn check các rule khi dùng component nhé và QA lại trước khi done, thêm vào skill".
- Trigger: E4 on ◇ Master-Layout · Variants had two Secondary sign-in buttons above the Primary. A scan of 90 buttons
  in D/E/F found more: Surface on canvas, Accent on ordinary CTAs, Secondary as a plain action, Small Run buttons set
  to Fill, Main buttons on photos, an "OK" label, two Primaries on F9, Overlay buttons used as a view switch (E7), and
  a Button as an address picker (E1). All fixed in Figma: power-on toggles became Secondary, hearts on photos
  Icon-Overlay White, E7 a Segmented, the E1 address a Chip, E4 Primary + one Tertiary below.
- `skills/zen-figma-design/harness/zen-figma-audit.js`: `checkButtonRoles` adds `button/one-primary`,
  `secondary-justified`, `accent-is-promoted`, `small-full-width`, `overlay-on-imagery` and `vague-label`. It skips
  buttons owned by a component (outside a slot). `references/audit-rules.md` has the fixes.
- `SKILL.md`: a §2 hard rule "Every component by its own rules" (the Button role table, Segmented/Chip/Back, Brand/
  Accent leads the colour) and a §3 QA checklist (audit, component rules, colour, screenshot, report) that gates "done".
- `npm run ai-kit:check` ✓ (127 checks).

## Touch targets + control-row spacing rule (session "Master layout variations") — tier S
User (screenshots of E6 and E2 chip rows): "Khoảng cách giữa chip và các phần dưới gần quá. Nên làm rule spacing cho
các phần này, Đang làm cho mobile nên có rule về vùng chạm tối thiểu để làm spacing cho an toàn".
- The ladder already said "toolbar → table = md"; E2/E6 had their chip rows 12 above the content. Made it explicit:
  the ladder's md row now names "a control row (Chips, Segmented, Tabs, Search) → the content it controls".
- New §13 subsection "Touch targets on phones and tablets": 44 × 44 hit areas (Apple 44pt, Zen Nav-Action, WCAG
  2.5.5). The gap between two neighbours is at least what each lacks of 44, and on touch screens the larger of that
  and the ladder step wins. Mirrored in the skill's screen-rules §2, the SKILL QA checklist and audit-rules.
- Figma audit: `checkTouchSpacing` adds `touch/target-spacing` (error) for authored controls on screens ≤ 1024 wide
  or with Top-Navigation/Mobile|Tablet, and `spacing/controls-to-content` (warning) for a Chip/Segmented/Tabs/Search
  row closer than 16 to the next block.
- E2 Popular and E6 AI-Discoveries gaps → Gap/Medium.

## Chip + Segmented overlay (session 1d39f7fe) — tier M
User (screenshot: a Segmented "Nutrition / Activity" on a pink band): "Bổ sung Chip, Segmented cho case overlay. Case
chưa đáp ứng là hình đính kèm. đảm bảo work trên dark và light mode".
- Figma (live file): `Segmented` 1238:892 has Level=Secondary|Primary only, `Primitives/Segmented/Item` 1204:11690 the
  same; no Overlay anywhere → code-only level, Figma question in BACKLOG (P2).
- The reference measured: band #E561C4, track 7.5% black (= light Neutral/Subtle), unselected label 49% black (alpha-10),
  selected #121212 on white. In dark mode Secondary flips (Inverse/Solid → near-black pill, white-alpha track and text).
- `level="overlay"` on Segmented and Chip (every variant; ChipGroup through ChipLevel), static tokens only:

| Element | Token (light = dark) |
| --- | --- |
| Track / resting chip | `color-mix(Black-Overlay/Default 20%)` = 8% black (no static subtle black token) |
| Hover | `color-mix(Black-Overlay/Hover 20%)` |
| Selected | Background/White/Solid (+ hover White/Solid/Hover), Action basic shadow |
| Text | On-White-Overlay/Strongest (selected, chips), /Base (unselected segment, resting chip icon) |
| Focus ring | On-White-Overlay/Strongest, `zen-allow-focus-ring-token` (Accent vanishes on Brand, Neutral turns white in dark) |
| Counters | unselected Badge `on-color`; selected pinned to Black/Solid + On-Black-Overlay/Strongest |

- Contrast on Brand/Accent #FF6BD5 (same in both modes): unselected label Base 4.6:1 (Light, as in the screenshot,
  would be 2.6:1 light / 2.9:1 dark), Strongest 6.7:1, selected 18.7:1, ring 7.8:1 on the band.
- Platform: "On a colour band" on Segmented (hours / invoiced on a Brand/Accent band) and Chip (Advanced Assignee +
  Normal status toggles, list below). Stories `Overlay`. Guideline Level rows, a do and a don't each.
- Follow-up (user: "overlay sao dùng màu tối???", then "Nên có 2 option nền tối chữ sáng mặc định và nền sáng chữ sáng
  trên nền màu solid", "thêm trong Figma cho đồng bộ"): the dark-tint level became two levels, as Button/Overlay:
  `black-overlay` (default; `level="overlay"` resolves to it) = Black-Overlay Default/Hover/Pressed + On-Black-Overlay
  text, `white-overlay` = White-Overlay + On-Colors text (segment hover: a White-Overlay pill with dark text). Selected
  = White/Solid + On-White-Overlay/Strongest, counters On-Color / Black-Solid, focus ring = currentColor (no allow
  needed). No color-mix and no new token any more. Playgrounds list both levels and preview them on Brand/Accent.
- Figma (user-approved write): `Primitives/Segmented/Item` +16 variants (GRID 8 rows), `Segmented` +2 (SLOT re-cloned,
  items swapped), Chip/Number-Only +24, Chip/Advanced +96 (GRID 18 rows), Chip/Normal +108 (rows stacked below): clones
  of Level=Secondary with paints remapped by variable name, borders dropped, Effect/Overlay (unselected) or
  Shadow/Action/Basic (selected), badges swapped to On-Color / Neutral-Solid + Black-Solid override; 0 ref mismatches,
  0 leftover Secondary or mode tokens. Review frames "Overlay review — Segmented" / "— Chip" (Brand/Accent band) sit
  beside the docs frames. Studio: figma-push `segmentLook` and figma-pull map the overlay levels.
- Contrast on #FF6BD5: black-overlay text 4.7:1 (unselected segment, Base) to 5.9:1 (chip, Strongest); white-overlay
  light text 1.8:1 (BACKLOG P3 for the designer); a chip's outside ring in its light label colour reads 2.4:1 on the band.
- Contracts: the filtered capture (`mcp-capture/capture-template.js` with `__setSpec(id, vp => /Overlay/…)`, chunks
  read back by `assemble.cjs`) appended the overlay variants to `checkbox-radio-chip-popover.json` (Chip/Normal 216,
  Advanced 144, Number-Only 48) and `segmented-toggle-badge-avatarstack.json` (Item 32, Segmented 4), Level options
  updated. `suites/chip-advanced.mjs` now passes `level`. Chip/Normal 7056/7056, Advanced 5148/5148, Number-Only
  1344/1344 checks match in light/neutral-s1 and dark/brand-s1. `part-props-build`: Segmented passes `levelProp` to
  its items (a resolved local hid the pass-through from the Studio inspector).

## Studio → Figma direct paste (tier L, session "Figma và Studio import chính xác"; user: "Biểu đồ trước, rồi dán thẳng", then "đồng ý, làm tiếp đi")
- Proven by automatic pastes in the Zen file (osascript Edit › Paste after opening the QA node; the user enabled
  Accessibility): skeleton variants, deflate, variables and styles by node id, variant-level property ids, slot contents.
- Built: `tools/studio/figma-kiwi.mjs` (+ selftest 19), `tools/studio/native-pack.mjs` + `docs/figma-contracts/native-pack.json`
  (captured from 12 Figma desktop copies of a temporary probe: 4,344 variants, 1,597 icons, 561 slot contents; probe
  removed), `tools/studio/figma-native.mjs` (+ selftest 29 with `tools/studio/fixtures/figma-expenses.json`), Studio ⌘C
  writes Figma's html ahead of the plugin's span (`builder/export/figmaClipboard.ts`; messages in frameKeys/clipboard).
- Expenses pasted directly = the plugin import (474 frames, 613 instances, 151 slots, 277 texts, 190 vectors, 245/245
  texts); Chromium's copy event keeps the html (checked through Playwright → system clipboard → Figma).
- Stray test pastes landed on "◇ Master-Layout · Variants" twice (Figma desktop showed that page): removed or moved to QA,
  session "Master layout variations" told. Test frames on the QA page: Clip I1…K26, Style probe, Expenses (native 5).
- Open (BACKLOG): other files (publish + full definitions), pictures, the frame menu's async Copy for Figma.
- Follow-up (user: "spacing giữa các section trong mobile tối [thiểu] ở chế độ comfortable luôn là 32px. Compact là
  24px. tạo token để áp dụng luôn", and "Tuỳ vào domain mà tôi sẽ chọn mode component size và typography").
  - New Component Size variable `Layout-Mobile/Section-Gap`: Figma 16053:134453, aliases Gap/Large and Gap/XLarge.
    Its repo source is in `component-size.json` (Studio 24), and `tokens:build` gives `--zen-layout-mobile-section-gap`.
  - The rule is in §13, screen-rules §2 and the SKILL checklist. The audit adds `spacing/section-gap` (a phone
    Body's gap not bound to it).
  - The audit's `scrollsPast` exempts content past the far end of a frame set to scroll (overflowDirection).
  - The user had set every screen to Comfortable + Typography Mobile, which made F1–F8 and E1–E3 overflow. In
    Figma:
    - 20 Bodies are bound to the token.
    - The screens scroll vertically, with the bars fixed (numberOfFixedChildren).
    - 6 Chip rows scroll horizontally, with 2px block padding.
    - Text that grew is fixed: F1 "6.2" + "kWh today"; E1 name above price; E2 wallet icon above text; E5 names
      truncate.
    - E3 cart FAB is an auto layout with a pinned counter; F9 D-pad keeps its margins.
- Gate: `npm run qa -- --isolated --files=…` (edits went through Bash, so the hook saw none) ✓ PASS: usage guard needed
  `zen-allow-focus-ring-token` on both rings; 69 browser tests, audit 1512/390/320, dark audit, behaviour 0/0. Light and
  dark shots of both "On a colour band" cards are identical on the band. Not committed (user did not ask).

## Donut corners: Figma ↔ code (tier S, session "Figma và Studio import chính xác"; user: "pie chart Figma không có bo góc")
- Library: Chart/Donut-Chart 15324:80365, all 32 variants: 160 Slice vectors cornerRadius 0 → 4 (DonutChart.tsx
  CORNER_PX = 4; the 4px gaps were already drawn). Undo: back to 0.
- Plugin (local 275faae, dist 11:38): setting vectorPaths resets every vertex to mitre joins, so imported slices lost the
  round joins of their 8px same-colour stroke; the join is set again after the path (test mock now resets joins too).
- Direct paste: frames with a radius came out square (`rectangleCornerRadiiIndependent` false → Figma reads the unset
  `cornerRadius`); fixed in PR #103 by session "Giám sát".
## Zen colour ramp re-sync (session 1d39f7fe) — tier XS
User: "Update lại token màu của Zen trong global (chỉ dãy màu Zen)".
- Read Global Colors from the live file (use_figma, modes Zen / Zen-High-Contrast): Light/Dark Zen and Zen-Alpha 1–12,
  48 variables, no aliases. 45 values differ from `tokens/source/figma/global-colors.json` (Zen/9 #FF6BD5 → #F755C9;
  Light/Zen/10 #F663CE → #DC39B2, HC #CB25A3; Light/Zen-Alpha/10 HC #C20093DA; Dark/Zen/10 #FFA7E2 → #FF7BD6 …);
  Light/Zen/1 and Zen-Alpha/1 (both themes) were already equal. Only those 48 entries were written (same JSON format);
  `figma.collections.json` › source records the sync.
- `npm run tokens:build` (also picked up another session's uncommitted `component-size.json`: Layout-Mobile/Section-Gap
  appears in tokens.css and the native packages); `tokens:check` 0 failures, `tokens:native:check` up to date.
- Token gate: `npm run qa -- --isolated --files=tokens/source/figma/global-colors.json,…` ✓ PASS (token fast path:
  tokens/styles check, 23 Figma suites, 70 browser tests, audit 1512/390/320 + dark, 0 new findings).

## Chip + Segmented overlay — Figma descriptions and checks (session 1d39f7fe)
- `tools/figma-docs/component-descriptions.mjs`: Level rows for Chip/Normal, Chip/Advanced, Chip/Number-Only and
  Segmented name Black-Overlay / White-Overlay; written to Figma with `build.mjs sets "…"` (these four forced in the
  local copy of the script, as their old texts came from the tool; old texts in "Description backup 2026-10-17").
- `docs/figma-contracts/component-properties.json`: Level options of the five sets updated in place.
- Studio: figma-push/pull selftests ✓ (269/69), `part-props-build --check` ✓; `npm run studio:e2e -- --only=handoff,
  nested` 33 works · 0 broken (new row HO-11 not in the baseline). The gate's full E2E matrix run (qa6) ended with "no
  summary" after 3115 s, a run that never finished, not a failing row.
- Missed step, caught by session "Figma và Studio import chính xác": after the component-properties.json edit,
  `figma-props-build.mjs` and `variant-sets-build.mjs` had to run (figmaProps.generated.ts, variantSets.generated.ts:
  the overlay Level options). Rebuilt; both checks ✓, `npm run studio:selftest` exit 0. Rule: any edit to
  docs/figma-contracts/component-properties.json is followed by those two builds.

## Chart parity Figma ↔ code (tier M, session "Figma và Studio import chính xác"; user: "so tiếp các biểu đồ còn lại")
- 13 sets audited by 5 read-only agents; findings in `docs/research/chart-parity-audit-2026-10-17.md`.
- Fixed in Figma: Bar-Chart vertical Average rule caps ROUND (8 variants; dots were invisible), Bullet Goal + Rows
  frames no longer clip (target tick showed 20 of 24px), Bar-List fills proportional to the leader (user 2026-10-14;
  BACKLOG item replaced). Fixed in code: the ring box beside a start/end legend starts at the ring's size (chart.css), so
  Radial/Donut no longer leave a 90px gap and wrap the legend.
- Direct paste follow-ups: pack reads PROP_REF-only property links (Title-Highlight Custom-Slot), lists 2,019 variables
  (variables probe), slot content frames carry the slot's corners/clip/limits (Stack-Bar columns were square); writer:
  fill along a hugging parent's main axis hugs (Dashboard's Export button was cut to "Expor"; the plugin collapses it to
  1px, not fixed there yet). Dashboard direct paste = its plugin import (346 frames, 405 instances, 174 texts).
- Stack-Bar still square after the slot fix (user: "đã dán, cột vẫn vuông"): the column is a grid with the empty top
  row first, so the slot's 8px corners only clipped empty space, in the paste and the plugin import alike. Owner fix in
  `figma-charts.mjs`: the bar is its own `Stack` frame (radius 8 bound to Corner-Radius/Small, clip, Flex rows per
  series) in the column's second row, as chart.css `.zen-chart__stack`. Fixture rewritten, selftests updated; QA paste
  "Expenses (bar corners)" 16079:284368 shows rounded columns; the user re-pasted from Studio: "cột đã bo góc".
## Segmented component size re-sync (session 1d39f7fe) — tier XS
User: "Update token component size của segmented".
- Live Figma Component Size (modes Compact, Comfortable), the 14 `Segmented/*` variables vs `component-size.json`: one
  differs, `Segmented/Spacing/Medium/Horizontal-Padding` = 10 / 10 raw in Figma (repo `{Spacing/Padding/XSmall}` = 8).
  Written as a targeted edit (the file carries another session's uncommitted Layout-Mobile/Section-Gap block); the
  repo-only Studio mode keeps 6. Raw 10 has no Spacing step, like Small/Horizontal-Padding 6.
- `tokens:build`, `tokens:check` 0 failures, native tokens up to date; segmented.css fallback 8px → 10px. The
  Segmented contract stores bound variable names, so no re-capture.
- Segmented size gate: see the next section's gate line once it finishes (scope was every page: token diff vs HEAD).

## Toggle XLarge (session 1d39f7fe) — tier M (new size, Figma + code + Studio)
User: "thêm 1 bảng toggle size XLarge cao 48px (thêm token nhé, làm cho cả Figma và studio). bản này có thêm icon bên
trong toggle dot", then (AskUserQuestion → icon by state, refined in chat) "tắt thì không cần x", "icon chỉ nằm đúng trên
1 dot", "nên dùng icon mặc định không quy định là check hay x", "khi tắt màu light", "khi on thì màu strongest".
- Figma variables: Component Size `Toggle/Item/Size/XLarge` (Compact dm-44, Comfortable dm-48; WIDTH_HEIGHT; hidden),
  Component Theme `Toggle/Dot/Content/Unselected` (On-White-Overlay/Light in every theme: the dot is White-Solid in both
  modes) and `/Selected` (Neutral/Strongest on Neutral themes' Inverse dot, On-White-Overlay/Strongest on Brand themes'
  White dot). Plain Content/Neutral/Light|Strongest would turn white on the white dot in dark mode.
- Figma sets: Toggle-Button +6 Size=XLarge (clones of Large, dot + Blank bound to XLarge, an `Icon` instance of the
  default icon-marker-pin-01-solid at Element-Size/Popular/Medium in Toggle-Dot, fill Toggle/Dot/Content/* or
  Content/Disabled; new properties Icon (boolean) + Icon-Src (swap)); set resized, .Primitives/Toggle/Content moved
  down. Toggle +8 Size=XLarge (GRID rows 6-7), nested Toggle-Button swapped and exposed.
- Code: `toggleSizes` + xlarge, `ToggleSize` + xl/xlarge, `icon` (renderIcon, xlarge only), toggle.css XLarge block
  (dot flex-centred, icon Element-Size/Popular/Medium, colours from the new tokens). Tokens added to component-size.json
  (Studio mode dm-44 = Compact) and component-theme.json; `tokens:build`.
- Docs/harness: guideline Size + Icon rows and a do; mobile/full-size-controls accepts xl|xlarge (good.tsx case);
  stories XLarge; playground size xlarge (icon-bell-01-line); example "Focus on a phone".
- Studio: figma-props.map ToggleButton `Icon` → toggle `icon` (when size xlarge) + `Icon-Src` → icon;
  component-properties.json (Toggle-Button: Icon, Icon-Src, Size +XLarge; Toggle: Size +XLarge) then figma-props-build
  and variant-sets-build in the same step; `studio:selftest` exit 0.
- Contract: filtered capture (Size=XLarge) appended to segmented-toggle-badge-avatarstack.json (Toggle 32,
  Toggle-Button 24, props with Icon / Icon-Src). The stock assembler keeps one capture per file; a hash filter
  (ONLY_HASH copy in the scratchpad) picked the right one.
- Measured on the platform (phone = Comfortable): track 100×52, dot 48, icon 28; light/dark × off/on icon colours as
  asked (Light grey on white; black on white / white on the dark Inverse dot).
- Gates: Segmented size + Zen ramp scope `npm run qa -- --isolated --files=…component-size.json,segmented.css` ✓ PASS
  (57 pages, audit 1534 s, dark, behaviour, 23 suites). Toggle XLarge `--files=Toggle…,examples,harness,contract
  --pages=toggle,list-item` ✓ PASS (token sources left out of scope: additions only, `tokens:check` ✓). Studio:
  `studio:selftest` exit 0; `studio:e2e --only=inspector,handoff` 30 works · 0 broken. Figma description of Toggle
  updated (figma-docs, backup frame).

## Harness card/spacing-by-count (S)

- User rule: "nếu từ 3 card trở nên thì dùng card/box variant spacing Small. Còn mặc định là dùng Medium". The "box" in
  the screenshots is a Card (Content · Active · Sub-Action) holding a list; Figma List-Box has no Spacing variant, and
  MetricCard / ChartCard expose no `spacing` (ChartCard pins Medium), so the rule judges `<Card>` only.
- `tools/usage-guard/check-usage.mjs`: `card/spacing-by-count` (warn, allow `card-spacing`). One pass per file rebuilds
  the JSX tree (comments blanked, code samples skipped by backtick parity, `<K extends …>` generics skipped) and counts
  Card siblings; a mapped Card counts its literal array (inline or a `const x = […]` of the file; NaN otherwise); a
  component whose returned root is a Card is judged at its `<Name />` use sites. ≥ 3 shown → Small; < 3, all counts
  known and no repeating ancestor → Medium.
- Fixtures: catalogue cards in bad/good.tsx sit in their own `<div>` (side by side they read as one group); new cases
  for a row, a mapped row, a lone Small card and a component-root card.
- Fixed in the repo (22 findings + code samples): Small for the Card KPI row, Dock Icon project types, Text
  milestones; Medium for lone/paired cards on slider-field, curve-preview, accordion, divider, color-picker, card
  (order type), typography hierarchy; description-list code sample said small while the live card is md. Studio
  palette "Card" snippet → Medium. Kept Small with `zen-allow-card-spacing`: ai-ui Framed (chat column) and the two
  Rating survey cards (NPS pattern) — their comments already gave the reason.
- Gate run 1 failed on voice@390/320 density: the Voice frame pads itself (Spacing/Padding/XLarge) inside the Card,
  so Medium pushed the three actions out of the row (+4px at 320, new at 390 and at Compact). The rule now leaves a
  card around VoiceRecorder / AiVoiceConversation alone (Small); voice, voice playground and ai-chat reverted.
  The 320 Comfortable overflow (12px) stays in the quality baseline as before.
- Gate: `npm run qa -- --isolated --files=<harness, fixtures, guideline source, 16 platform/Studio files>` ✓ PASS
  (13 pages, audit 331 s · 0 errors, dark, behaviour, Studio E2E 297 works · 0 broken); usage + mcp selftests ✓.
  Contact sheets checked: Card KPI row and Dock Icon types at Small, Slider Field card at Medium. Done.
- User follow-up: the three `zen-allow` cards go Medium too (ai-ui Framed + its composer cards, Rating survey ×2;
  allow comments and the "spacing small" notes removed, code samples matched); gate (ai-ui, rating) ✓ PASS.
- MetricCard: Figma's Metric-Card is an exposed Card, so its Spacing is the Card's (user: "card thì có spacing
  small"); code MetricCard does not pass `spacing` to its Card yet — asked the user before adding the prop.

## Notification-Dot Number from Figma (session 1d39f7fe) — tier S
User: "Update lại luôn dot notification cho Studio từ Figma", then "Bạn phải cập nhật từ component chứ?
Primitives/Notification-Dot. Kiểm tra component này".
- Figma Primitives/Notification-Dot 4116:21789 (now on ◇ Master-Layout): Style=Dot (8×8, Negative/Positive/Accent,
  2px Border/Inverse outside) matched code; Style=Number did not: Badge 16 (Badge/Size/XSmall, min width the same,
  Badge/Spacing/Small vertical padding + Text-Wrapper padding 4), Caption/Regular, On-Colors (On-Accent/Default on
  Accent). Code drew 12px (Badge/Size/2XSmall) in Label/Small/Medium. Action-Item 12280:19532 places it at (26, −2)
  on Tertiary (40) and (10, −6) on Flat (20); the dot at (30, 2) / (14, −2).
- Fix at the owner: `_shared/notification-dot` draws both styles (`value` → Number); AppShellAction uses it
  (`zen-app-shell-action__number`, right/top −2 and −6, growing left as before); app-shell.test selector updated.
- Measured on app-shell and dashboard-header: number 16×16 at (26, −2), 11/16 Regular, 2px ring; dot 8×8 at (30, 2).

## Figma skill: rules from the user's catches and edits (session "Master layout variations") — tier S
User: "Dùng icon không đồng bộ" (F12 nav), "Làm Master layout nên QA lại kỹ trước khi done", "từ đây về sau bổ
sung nguyên tắc. Luôn làm đúng không lại sai", "đọc lại các cách tôi dùng component và spacing trong các file tôi
chỉnh sửa … học thêm cho skill".
- Navigation icons: every Bottom-Navigation in D/E/F now shows the selected item solid and the others line (Scenes
  moved to stars-01: magic-wand has no solid). The audit adds `navigation/icon-style`.
- I inventoried the user's hand edits on ◇ Master-Layout · Variants (frames, gaps, variants):
  - section header + content grouped into one frame;
  - overlays in padded Wrapper frames;
  - Card Spacing=Medium for two-column and full-width cards;
  - Toggle-Button XLarge power with the value aligned to the end;
  - Small steppers;
  - Segmented White-Overlay on a Solid band;
  - Solid shortcut rows;
  - a Surface unlock button;
  - "+" as the floating action.

  These went into screen-rules §4, and the same fixes were applied to my remaining screens: the E1 Stores section,
  E2/F7 overlay wrappers, Medium cards on E1/E6/D1, wider E5 tree cards, and the E3 fill and E6 chip row.
- SKILL §5: a slip the user catches → fix it everywhere + rule + audit check in the same turn. figma-gotchas gets
  "Modes" (emoji Dock-Icons at ~82% of the tile, text wrap/truncate, scroll instead of trimming).

## Zen Studio → native Figma, phase 1: shapes, arc, free frames (session "Figma-like freeform editing", tier L)

User: "Tiếp tục improve tính năng để có thể chỉnh sửa tự do như Figma … vẽ hình ellipse và cho chỉnh arc … y hệt Figma",
then "Nghiên cứu lại tất cả hành vi của Studio. Đưa về sát native với Figma nhất … vì chúng ta cần convert người dùng từ
Figma", "Cần nhắc cho cả tính năng quản lý variables", and "Chế độ studio và doc không dùng segmented nữa … đổi bên trong
khu vực giống trong ảnh" (the Zen Studio menu). Worktree `../Zen-DS-shapes`, branch `zen/feat/studio-shapes-20261017`.

- Research: five code audits (canvas/selection, drawing/transform, frames/auto layout, components/inspector, variables),
  ~80 Figma behaviours graded, decisions and the P1–P5 plan in `docs/research/studio-figma-native-parity-2026-10-17.md`.
- `Shape` component (Rectangle, Ellipse + arc, Line, Arrow, Polygon, Star; tokens only) with geometry shared by the
  canvas, the arc handles and the Figma export (`Shape/geometry.ts`); exact Figma variable names in `Shape/paint.ts`.
  Guideline, API docs, stories, platform page (5 examples, playground, Do/Don't), 3 harness rules (211 total).
- `position.ts`: insets take px (Figma X / Y in a free frame). Screen is `position: relative` (builder.css).
- Fixed on the way (gate-free bugs): an empty Screen refused every drop ("has no children to drop into", arrange.mjs
  OPENABLE), and the first component on a page with no `@zen-ds/react` import was imported from `./src/components/…`
  (slots.mjs importChanges: builder pages always use the package).
- Draw engine `src/platform/studio/draw/` (drawModel.ts pure + selftest 24; drawTool.ts on the canvas), toolbar shape
  menu, keys R O L ⇧L, A = Frame; Frame inside a Screen hands the press to drawTool (nested Box).
- Arc handles `select/ArcHandles.tsx` (live path, raw end angle as Figma, re-read on repaint via MutationObserver);
  Inspector `appearance/ShapeSections.tsx`, `inspector/palettes.ts` + PropField SwatchControl (tone, fill, stroke),
  `controls/ScrubNumberField.tsx` + `numberMath.ts` (selftest 24), PositionSection X / Y px + Rotation, drag.ts free
  moves with smart guides, arrange.ts nudges, ResizeLayer px edges + ⇧ ratio on corners, layer names (`layerNames.ts`).
- Figma: figma-push `shapeNode`, figma-pull `shapeElement` (selftest +7, 76), Zen plugin `studio-import.js` shape
  builder + `strokeWith` + rotation about the centre (plugin commit 3ba73f9, its tests pass).
- Walk (private server :5199, Playwright): draw frame / ellipse / rectangle / line, arc sweep 47.2 %, ratio 24 %,
  start 270°, move 107→160 px, nudge, Layers "Ellipse", Inspector sections — screenshots looked at.
## Metric-Inline/Title-Highlight: Figma → code/Studio check (tier S)

- Read live 7523:507049 (5 sizes): props unchanged from the 2026-10-05 contract; auto layout, gaps, text styles,
  Dock-Icon (absolute in Contents, MAX/MAX, Large 48 at XL/L, Medium 40 below) and Custom-Slot all match code.
- Fixed in MetricWidget + Studio map: Hint is also at Small/XSmall (12px, Element-Size/Popular/XSmall, after the
  Caption label; figma-props.map Hint lost its XL–M `when`); no Metric-Color dot in the XL–M title row (Figma has no
  Color layer there; the boolean stays in Properties as Figma shows it); Label-Icon → title gap 8 (Figma Wrapper,
  Spacing/Gap/XSmall); dot 2XSmall except Icon-Highlight XL/L (XSmall; 16 vs 12 in Comfortable).
- Figma-side, for the designer: Custom-Slot padding 10 raw (Card/Metric-Card slots are 0; code 0); Header gap 12
  unbound; Medium Metric-Number paragraphSpacing bound to Font-Size/Heading-3.
- Test: tests/interaction/metric-inline-props.test.tsx (3 pass).
- Figma write (user: "sửa luôn padding Custom-Slot trong Figma về 0"): Custom-Slot padding 10 → 0 on all 5 variants
  (15048:20966, :21172, :21180, :21194, :21202); no instance on ❖ Metric Widget has Custom on. Needs a library publish.

## Calendar / Schedule / Timeline in Figma (draft, tier L, Figma first)

- User scope: Calendar (Month, Week/Day time grid, Agenda, week strip), Schedule (resource rows, itinerary, booking
  slots, day planner from the user's reference), Timeline (activity feed, Gantt, milestones); desktop + mobile; the
  user reviews Figma before any code.
- File 9nZv4uW2LT21yuHabMTCh1, new pages filed like the others (Primitives section + one 1512 doc frame per set):
  - ❖ Calendar 16121:3: Toolbar 16125:399, Week-Strip 16125:520 (Style Dot|Tile), Month 16126:1093, Time-Grid
    16127:1172, Agenda 16128:1036; primitives Event, Event-Block, Slot, Date, Now-Line, Day-Cell, Agenda-Item, Day-Tile.
  - ❖ Schedule 16121:6: Resource-Grid 16135:145822, Itinerary 16135:13820, Slot-Picker 16135:14046, Day-Planner
    16143:1439; primitives Resource, Slot, Itinerary-Item, Hour-Label, Event-Card.
  - ❖ Timeline 16121:9: Item 16131:1090, Activity 16131:1311, Gantt 16136:859, Milestones 16132:777; primitives
    Marker, Gantt-Bar, Gantt-Label, Milestone.
- Only existing tokens (Support hues for event colours, Brand → Content/Accent text; Date-Picker-Item tokens for
  slots); reuses Date-Picker days, Segmented, Button, Avatar, Dock-Icon, Badge, Divider.
- User caught on Resource-Grid: header column 10px tall (rule stopped short), rows 57 vs 56 (stroke in layout), a
  leave bar squeezed to the visible range. Fixed on every grid; rule in customize-without-detach §5, audit
  `layout/row-drift` (verified on a broken copy), CHANGELOG.
- QA: Zen audit on all six sections: 0 errors, 0 warnings outside doc/set chrome; dark mode checked; ai-kit:check ✓.
- Day-Planner from the user's reference (16143:1439): Week-Strip Style=Tile (Day-Tile), Hour-Label, Event-Card; cards
  and the selected tile are Border boxes (Canvas/Alt is white). User: the card's ⋯ must be flat → Icon-Flat Small
  Secondary ⋮ in a 20px Element-Size/Popular/Base Wrapper (the Card Sub-Action); skill §2 + audit
  `button/in-card-flat` / `button/in-card-wrapper` (0 on the new pages and on Zen's Card, caught on a test copy).
- User: heading and selector too close → Day-Planner header 2XSmall → XSmall; same slip on Calendar/Toolbar arrows and
  Today + arrows; Itinerary title + Now badge → 2XSmall. Skill §2 + audit `spacing/control-gap` (0 on the new pages,
  caught on a test copy); ai-kit:check ✓.

## On-Brand follows the live Figma (session "Giám sát", tier XS; user: "Đồng bộ On-Brand theo Figma")
- Live Base Colors (Project), mode Zen: Light/Dark On-Brand-Default and On-Brand-Hover are #FFFFFF; the repo had
  #000000DB (the 2026-10-13 contrast fix). Pressed unchanged (Light white, Dark black 86%). 4 values in
  base-colors-project.json + sync note; `npm run tokens:build`.
- Contrast: white on Zen/9 #F755C9 2.96:1, on Light Zen/10 #DC39B2 3.98:1 (black 86%: 6.22 / 4.76). Told the user
  before syncing; they chose Figma.

## Content follows its Solid fill: Metric-Tile Inverse / On-Color / On-Bright, code + Studio (session "Metric-Tile inverse và on-color", tier M)
User: "Primitives/Metric/Metric-Tile → Inverse là nằm trên nền neutral solid, content phải dùng inverse tokens. Cần thêm
variant on-color…", then "Nhớ đọc hiểu cách dùng tokens màu", "update Figma xong nhớ update lại Studio". Asked: scope =
code + Studio in full; bright solids = follow the tokens and add On-Bright (white ~3:1 on Cyan/Orange/Brand accepted).
- Figma (9nZv4uW2LT21yuHabMTCh1):
  - Metric-Tile 16104:4826: Inverse tiles now take Dock-Icon and Badge Theme=Inverse (they were On-Color, which turns
    white-on-white in Dark mode). New Content=On-Color (16132:144526/144547; On-Colors text) and On-Bright
    (16140:1278/1293; On-Brights text).
  - Metric-Trend 595:55134 has a Content axis (Default|Inverse|On-Color). A nested Badge Theme override was lost on
    every Trend switch. Variants hug the badge (they were fixed 126 under a 131 badge); 0 overflow on 6 pages.
  - Hero · Solid Neutral 15487:89034 has an Inverse trend. Performance .Template-Component/Calendar/Date Today text
    is now On-Accent (it was On-Colors on Accent). Review board 16135:144805 shows Light and Dark.
- Skill: screen-rules §1 and SKILL §2 carry the rule. New audit `theme/on-solid-content` (text, icons, Dock-Icon,
  Badge, Metric-Tile, Metric-Trend against the fill); verified 0 findings on the board and 3 on a broken copy.
  ai-kit:check ✓.
- Code:
  - Card: `color="accent"` (Solid only). A Solid hue re-points neutral content to On-Colors / On-Brights / On-Accent,
    and a CardContentContext tells Metric parts the family.
  - MetricTrend `content`. MetricCard `type="tile"` (internal MetricTile, Card Spacing=Small, nest
    Metric-Tile/Trend/Metric-Icon).
  - Chart second series keeps its dark ink (--zen-card-mark-ink). Accent takes Brand's heatmap ramp → Neutral.
  - Harness card/solid-color flags a Pale accent.
- Studio: Metric-Card Type=Tile push/pull + reader (figma-metric.mjs; 3 round-trip checks). Palette "Stat tile".
  Contracts: component-properties (Metric-Card Tile, Metric-Tile set, Card Accent), nested-layers Metric-Card,
  library key of Metric-Tile.
- Tests: card-color axe now skips the white solids (documented); new tile + hero-on-solid checks; npm test 1066 ✓,
  studio:selftest ✓, usage:selftest ✓, guidelines:check ✓, tsc ✓.
- Gate fixes (same session):
  - Widgets page has the "Stat tile" pattern and example (palette selftest). The Widgets rhythm baseline goes from 8
    to 9 styles (the catalogue gains Display/3).
  - Rebuilt nestedLayers / variantSets / partProps. native-pack recaptured by "Figma và Studio import chính xác" (their
    file, they commit it).
  - Metric examples: four colours in the picker (five overflowed at 390). The phone highlight is Solid Neutral (Accent
    measured 2.96:1). The tile label class is `__label` (it is a Neutral/Base label, not a title). The Card hue example
    text now says On-Brights.

## Search Shape = Default · Rounded (tier M; user: "thêm props variant cho search là shape … Khuyên dùng cho các search của mobile, ưu tiên dùng chứ không force")
- Figma Search/Default (846:37624): the 60 variants renamed `Shape=Default` (instances untouched), 60 clones
  `Shape=Rounded` in grid rows 12–23; Rounded binds the 4 radii of the Field-Only instance and its Container to
  Corner-Radius/Rounded (only difference, checked by tree signature on all 60 pairs). Section 6849:4835 grown to 3752.
  Description via tools/figma-docs (`Search/Default` in FORCE). Search/Popover unchanged (no Shape).
- Code: `Search shape` (`searchShapes`, `SearchShape`) → `.zen-search--rounded`: field and interactive filter
  affordance on --zen-corner-radius-rounded; stroke, inset shadow and focus ring follow. Ignored with variant popover.
  Story `Shapes`; playground Shape chip; phone examples (search, top-navigation, bottom-sheet, Bottom-Sheet playground)
  use `shape="rounded"`. Guideline api row + Do line; Figma skill table row. No harness rule (recommendation only).
- Contracts: component-properties (Shape), Studio figmaProps/variantSets regenerated (map `Shape: "shape"`);
  input-search.json Search/Default re-captured whole (mcp-capture, 120 variants; the old capture was already stale,
  Corner-Radius/Input r 8 → 12): figma-kit hashes match live (set f96b04d2); `lock` rebuilt (it also refreshed 7
  stale Chip/Segmented/Toggle entries already in HEAD's contracts).
- Checks: tsc ✓, style:check ✓, usage:selftest ✓, guidelines:check ✓, studio:selftest ✓, figma-props/variant-sets
  --check ✓; Playwright on :5173: rounded field 1000px radius, focus ring + filter hover pill, code shows the prop.
- Open (BACKLOG P2): mobile library components' default shape (question for the user); native-pack re-capture.
- Gate: `npm run qa` (search, top-navigation, bottom-sheet) PASS, report .qa/reports/2026-10-17T11-18-10-c9cbf549.md
  (a first run's bottom-sheet@390 crash did not reproduce: audit 390/320 clean). Not committed (commits come from one place).

## A drawn shape is an object, never a component (session "Figma-like freeform editing", tier S)
User: "tại sao shape lại là component? Shape chỉ nên được vẽ ra là 1 object thôi, việc tạo component phải là do người dùng".
- Seen (walk on :5198): a drawn Rectangle's Inspector said "Zen component · Shape docs" with the cube in component colour,
  Swap instance and Reset all overrides; its canvas menu offered Swap / Detach instance; Assets › Components listed
  Rectangle and Ellipse.
- Fixed (branch zen/fix/shape-is-an-object-20261017, cherry-picked onto zen/feat/studio-components-20261017):
  `nodeKind("Shape")` = "shape"; `select/layerNames.ts objectIcon` gives Layers, the Inspector header and Select layer ›
  one icon per object (shape, frame #, auto layout, text T), component colour only for components; Swap instance only on
  component layers, Detach instance only where it applies; no shapes in the palette.
- Checks: E2E DR-15 (new) + draw 15/15, instance / starters / shell / select / structural 98/98, palette selftest 2361,
  tsc. Rule recorded: research doc §6 (2), CHANGELOG, memory drawn-objects-not-components.
- Gate on the components branch (`--all`): 0 errors; new ⚠ contrast on ai-ui (Schedule 2.96:1, white on Zen/9) comes
  from #109 (On-Brand → white, the user's choice), not this branch → BACKLOG P1 question for the designer.


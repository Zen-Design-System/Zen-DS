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

## Donut corners: Figma ↔ code (tier S, session "Figma và Studio import chính xác"; user: "pie chart Figma không có bo góc")
- Library: Chart/Donut-Chart 15324:80365, all 32 variants: 160 Slice vectors cornerRadius 0 → 4 (DonutChart.tsx
  CORNER_PX = 4; the 4px gaps were already drawn). Undo: back to 0.
- Plugin (local 275faae, dist 11:38): setting vectorPaths resets every vertex to mitre joins, so imported slices lost the
  round joins of their 8px same-colour stroke; the join is set again after the path (test mock now resets joins too).
- Direct paste: frames with a radius came out square (`rectangleCornerRadiiIndependent` false → Figma reads the unset
  `cornerRadius`); fixed in PR #103 by session "Giám sát".

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

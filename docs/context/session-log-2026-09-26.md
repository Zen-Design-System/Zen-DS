# Session log — 2026-09-26

## Usage rules + harness
- New `docs/component-usage-rules.md`:
  - Button hierarchy: Primary = main CTA; Tertiary = most common; Secondary only as a rare, justified highlight; Accent = promoted CTA.
  - Filters/sort/scope always use Chip advanced.
  - Inputs use Read-only, not Disabled (Search is the only exception).
  - A captioned popover item uses an avatar ≥ Small (32).
  - Badge remove uses the solid icon.
- `npm run usage:check` (tools/usage-guard/check-usage.mjs) scans the JSX in src/platform, code-sample strings included, and fails on:
  - secondary Button/IconButton without `zen-allow-secondary: <reason>`;
  - Button-based filter/sort triggers;
  - disabled inputs.
  - Checked against a fixture: 3/3 expected violations caught, allowed cases skipped.
- Examples fixed:
  - Undo, Make an edit, Copy, Reset and Leave page moved from secondary to tertiary. Invite moved to primary.
  - Table toolbar scope moved from Segmented to Chip advanced; Sort menu moved from Button to Chip advanced.
  - Tag input `disabled` became `readOnly`.
  - Playground buttons (Progress +10%, Tooltip trigger) moved to tertiary.
  - The pressed toolbar toggle keeps secondary, with an allow comment.

## Component fixes vs live Figma
- Badge: the remove icon is `icon-x-circle-solid` (was the line icon). Sizes 12 (XSmall/Small) and 16 (Medium) were already right.
- Breadcrumbs: Master hover changes only the Icon-Wrapper fill (Inverse/Solid, which is white in light mode). The icon stays Neutral/Strongest. Code had also switched the icon to Inverse, so the icon vanished on hover. Every other token (Flat Default/Hover, Neutral/Strongest label, Neutral/Light separator) was verified.
- Segmented: code matches Figma. Item-List gap 0; item padding 6/4, gap 4/2; Text-Wrapper 4; badge follows the item gap. Live variables are identical in Compact and Comfortable. No change.
- Popover item: a captioned `avatar-small` now renders Avatar Small (32) centred (user rule). Without a caption it stays at 20.
- Inputs:
  - InputField/TextAreaField derive `read-only` state from `readOnly`.
  - SelectField gained `readOnly`: keeps the chevron, never opens, aria-readonly.
  - DateField readOnly never opens the calendar.
  - Platform Input playground: Disabled replaced by Read-only, showing sample values.
- NumberField rebuilt per Input/Number-Align-Left (421:10057) and Number-Align-Center (450:7900):
  - Steppers are Button/Icon-Main 2XSmall Tertiary (24px) at every size. Center: − before, + after, value centred. Left: [− +] trailing, gap 4.
  - Behaviour: spinbutton role; ↑/↓ step; typing commits on Enter/blur with min/max clamp and step precision; the stepper disables at its bound. API: `value`/`defaultValue`/`onValueChange`/`min`/`max`/`step`.
  - Read-only hides the steppers.
- Figma inconsistencies:
  - Number-Align-Left Read-Only still shows the steppers; code hides them, as Center does.
  - The Number-Align-Center minus icon is 16 (Popular/Small) while plus is 12; code uses 12 for both.
  - Breadcrumb Master default Icon-Wrapper radius is 6 (unbound) vs 8 on hover.
- Verification:
  - verify7.mjs: all behaviours pass. The number-left row failed only because the shared playground value carried over from the previous test.
  - interact 24/24, interact2 14/14, popover-content 16/16 (updated to the 32px caption rule).
  - Build OK; run-all 17 ✓; usage:check ✓.

## Badge-Counter padding tokens (live Figma 9535:33812)
- Container (all bindings unchanged, values verified):
  - XSmall: Badge/Spacing/XSmall/Vertical-Padding (2) · Spacing/Padding/2XSmall (4).
  - Small: Badge/Spacing/Small/Vertical-Padding (2) · Badge/Spacing/Small/Horizontal-Padding (4; 5 in Comfortable).
  - Medium: Badge/Spacing/Medium/Vertical-Padding (4) · Spacing/Padding/2XSmall (4).
- Text-Wrapper:
  - XSmall 0.
  - Small now Spacing/Padding/3XSmall (2). It was 0 in code.
  - Medium is bound to Spacing/Padding/3XSmall (2). Code used Badge/Spacing/Medium/Text-Wrapper-Padding: same value, wrong binding.
- badge.css counter rules rewritten with explicit per-size padding using those exact variables. tokens.css values already equal live Figma in Compact and Comfortable.
- Measured (compact / comfortable):
  - XSmall "1" 16/20.
  - Small "1" 20/24, "12" 28/30.
  - Medium "1" 28/32.
  - Padding and text padding match the table. Chip multiple count (Counter Small) is now 4px wider, as in Figma.

## Iconography toolbar: popover blur + sticky offset
- The Size Select popover showed no blur. `.icon-gallery__toolbar` had its own backdrop-filter, which made it the Backdrop Root, so the popover's blur(20px) could only sample the toolbar. The frosted surface moved to `.icon-gallery__toolbar::before`. Verified: no backdrop-root ancestor, and the icon grid blurs behind the popover.
- The sticky toolbar docked at top 0 under the 72px sticky Platform topbar (z 20), so it was hidden while scrolling. This was pre-existing. It now uses `top: var(--zen-sticky-offset, 0px)`. `.official-platform` sets the offset to 72px + 8px; Storybook stays at 0. Verified: docks at 80px with the blur intact. On mobile the toolbar is static, so nothing changes there.

## Input click area + interactive Leading/Trailing
- The whole field is the click target. `FieldShell`'s `.zen-input__control` forwards mousedown/click on padding, icons and empty space to the native field; a Select opens its options. Interactive children (buttons, steppers, clear, pickers, popovers) keep their own behaviour. The cursor is text (pointer for Select, default when read-only/disabled). This applies to Text, Select, Date, Number, TextArea and Search.
- `InputLeadingTrailing` with a label and `options` renders a picker `<button>` (label + chevron, aria-haspopup=listbox). It opens the shared Popover (`popoverLabel`, option captions/icons, selected check, autoFocus) with ↓/↑ to open, Escape/outside-click to close, and focus returned to the picker. New props: `options`/`value`/`onValueChange`/`popoverLabel`/`align`/`disabled`. Slots without a label stay decorative, so clicking them focuses the field.
- The open picker escapes the field's overflow clip (`:has([data-open])`). The Focused ring ignores focus inside the picker, but still shows while typing or with a Select open.
- Platform Input playground: leading "User" picks the account type; trailing "VN" picks the region (with captions).
- Verification:
  - clickarea.mjs 10/10: padding, icon and corner clicks; pickers open/pick/Escape/outside; icon-only slot focuses; Select opens from padding; Date icon opens the calendar; Number steppers still step; Textarea corner; Search magnifier.
  - ringcheck: idle/picker transparent, typing/select #111.
  - interact 24/24.
  - interact2 upload test: its fixed 6s wait was flaky with random progress, so it now waits for 100% and asserts the upload started; 5/5 runs pass.
  - Build OK; usage:check ✓.

## Input playground Error toggle showed no error field
- Symptom: with Error on, the negative help text appeared, but the field stayed `data-state="default"`: no Border/Negative/Solid stroke.
- Cause: the playground passes `state="default"`, and `normalizeInputState` let an explicit state win over `error`.
- Fix (Input.tsx): `error` now overrides the interaction states. default/hover/focused/typing become `blank-error`, and inputted becomes `inputted-error`. Read-only and Disabled keep their own look. This applies to every FieldShell field (Text, Select, Date, Number, TextArea).
- Verified against Figma Text-Field Blank-Error:
  - Stroke 1px Color/Border/Negative/Solid (#E5532E).
  - Fill Input/Background/Focused, which equals Neutral/Pale, the same as Default.
  - Effect/Input kept on ::before.
  - Help-Text Theme=Negative: icon-alert-octagon-line and Caption/Medium in Content/Negative/Light.
  - All playground kinds switch to the error state.
  - run-all 17 ✓, interact 24/24, clickarea 10/10, build OK.

## Guidelines + harness for every component; next-5 recommendation
- Figma recheck: 44 component pages. 19 are built (Avatar, Badge, Breadcrumbs, Button, Checkbox, Chip, Date Picker, Input, Modal & Dialog, Popover, Progress, Radio, Search, Segmented, Sidebar, Tab, Tag, Toggle, Tooltip); 25 are unbuilt.
- Next 5, all composing already-built parts:
  - Toast-Message: 6 variants, uses Button/Overlay + Button/Main.
  - Alert Banner: 10 variants, uses Button/Overlay.
  - Accordion: Accordion/Text 12 variants + Content primitives, self-contained.
  - Pagination: Item 12 variants + 4 themes, uses IconButton, Chip/Advanced, Input.
  - Skeleton: Body-Text, Heading-Text and Shapes.
  - Quick add-on: Divider (3 variants).
  - Blocked: Inline Message still nests the legacy Button/Main-Old.
- Harness (tools/usage-guard/check-usage.mjs) is now a rule registry of 22 rules. Each rule has id/components/severity/allow/guideline/summary; `--list` prints JSON.
  - Presence requirements tolerate spreads and template interpolation; prohibitions are strict.
  - Fixed a regression where literal `level="secondary"` went undetected.
  - Self-test: fixtures/bad.tsx must trigger each rule exactly once, and good.tsx must stay clean (npm run usage:selftest).
  - Real findings fixed: workspace Avatars missing alt, Segmented code sample missing aria-label. Justified with allow comments: the reversible "Remove" member, and the Accent floating feedback action.
- Guidelines: tools/usage-guard/guidelines.source.mjs generates docs/guidelines/<component>.md (20 components incl. Icon), README.md and index.json for agents.
  - Sections: purpose, use / use-something-else, Figma→React, Do, Don't, accessibility, content, auto-injected harness table, references (Material 3, Carbon, Polaris, WAI-ARIA APG, NN/g). All 41 reference URLs returned 200.
  - `npm run guidelines:check` fails on stale docs or on rules pointing at missing guidelines.
- Repo skill skills/zen-component-usage (SKILL.md + agents/openai.yaml): how to compose with Zen and the component definition of done.
- Memory: zen-component-done-definition.

## Do / Don't on every component page
- `npm run guidelines:build` also emits `src/platform/guidelines.generated.json` (same source as docs/guidelines).
- `src/platform/PlatformGuidelines.tsx` renders a "Usage guidelines" section at the end of every component page (after Examples) and on Iconography:
  - purpose;
  - Use it for / Use something else for;
  - Do (positive top rule + check markers) / Don't (negative rule + × markers);
  - Accessibility + Content;
  - harness rules with severity badges;
  - reference links.
- Pages list every rule that checks their JSX tags (`tagsFor` in build-guidelines), not only rules whose primary guideline is that page. Toggle now shows choice/needs-label; Tag shows removable/needs-handler; Button shows filter-is-chip.
- Verified on all 20 pages: section present, no console errors, no horizontal overflow (desktop + 390px). guidelines:check, usage:selftest, usage:check and build all pass.

## Do/Don't UI redesign
- Replaced the boxed text lists with the pattern used by Material, Atlassian and Polaris:
  - "When to use / When to use something else" as two light columns; alternatives render "situation → **component**".
  - Visual Do/Don't pairs render real Zen components on a pale stage, with a 3px positive/negative bar, a verdict and a one-line caption. The stage is `inert`, so the demo controls stay out of the tab order.
  - A two-column checklist with ✓/✕ markers and dividers.
  - A quiet meta row: Accessibility + Content, Harness (severity dots), References.
- `src/platform/PlatformGuidelineVisuals.tsx` holds 21 pairs across 16 components. Sidebar, Date Picker, Dialog and Icon are checklist-only. The file carries `// zen-usage-guard: dont-examples`, which check-usage skips.
- Fixed an invalid nested `<button>` in the first Popover Don't preview; it now shows a form inside a Popover ("belongs in a Dialog").
- Verified on all 20 pages at 1440px and 390px: no clipped stages, no overflow, no console errors, stages inert, Don't items capitalised. Build, usage:check and guidelines:check pass.

## Popover Item states vs updated Figma (4031:26009)
- Live design update: State=Single-Selected now uses Container fill Color/Background/Active/Neutral/Subtle (was Active/Accent/Subtle, pink) and a check icon in Color/Content/Neutral/Strongest (was Content/Accent/Base). Default (Neutral/Flat/Default), Hover (Neutral/Flat/Hover), padding 8 (12 right when selected), radius 12, gap 8 and the 12px check are unchanged.
- popover.css:
  - `.is-selected` now uses active-neutral-subtle; the check uses content-neutral-strongest.
  - The Trailing slot is 16px (Element-Size/Popular/Small, as in Figma; it was 20) and hugs a Button/Icon-Flat XSmall or a Badge.
- Contract data refreshed from live Figma:
  - Ran the repo extractor through use_figma. Patched docs/figma-contracts/checkbox-radio-chip-popover.json for 4031:26009: Single-Selected Container fill + check vector.
  - The first patch also overwrote the hidden Trailing Button/Icon-Flat/Container fill; that was restored, and only Single-Selected/Container now uses Active/Neutral/Subtle.
  - Primitives/Popover/Item 94/94; run-all 17 ✓.
- Note for design: Active/Neutral/Subtle and Neutral/Flat/Hover resolve to the same value (#01010110), so Selected and Hover share a fill and differ only by the check.
- Other consumers are untouched (Sidebar accent item and Button accent use these tokens by their own design).
- interact 24/24, popover-content 16/16, clickarea 10/10, build OK, usage:check ✓.
- Keep in mind: another session added `control="checkbox"` (multi-select trailing Checkbox/Mark) to PopoverItem; left as is.
- Clickarea picker test updated: Popover now auto-flips above the field near the viewport bottom (another session's anchored placement), so it asserts a 4px attachment on either side and in-viewport. Removed the now-dead picker top/left CSS in input.css.

## Popover Manual-Add-New wired into real flows
- `PopoverManualAddNew` (Figma 4031:27929) existed with a passing contract (66/66) but was unused. Figma is unchanged: Search focused, Label "Select an option or create one", then the item "Create" + Accent Badge Medium with the query.
- New APIs:
  - `Chip`: `onPopoverCreate(value)` + `popoverCreateLabel`. The popover becomes Manual-Add-New (search on). A single-select create closes the popover; a multiple create keeps it open.
  - `AutocompleteField`: `onCreate(label) → id | void` + `createLabel`. Returning the new option's id selects it as a Tag. Existing labels never trigger Create.
  - `PopoverManualAddNew` now forwards `multiple` to its items (checkbox control).
- Platform:
  - Popover playground: "Manual-Add-New" toggle (Chip trigger). Created values join the current content set and become the selection. The code sample shows onPopoverCreate.
  - Examples: "Create a label (Manual-Add-New)" (Popover page, multi-select Chip) and "Keywords with create" (Tag page, AutocompleteField).
  - Guidelines: new Figma→React row; new Do (offer Manual-Add-New for open sets); new Don'ts (no "No results" dead ends when creation is allowed; no Create for closed sets). A second visual Popover pair covers Manual-Add-New vs a "No results" dead end.
- Verification:
  - manualadd.mjs 3/3: no Create for existing values; Create + Accent Badge for new ones; Enter creates, selects and closes (single); multi keeps open with checkbox control; Autocomplete creates a Tag.
  - Manual-Add-New contract 66/66.
  - Regression: interact 24/24, interact2 14/14, popover-content 16/16, clickarea 10/10, guideline pages all OK. run-all 17 ✓, build OK, usage selftest OK.

## Segmented: selected item has no hover (design decision)
- User decision, matching other design systems: the selected segment must not react to hover. A hover implied it could be clicked to deselect.
- Figma has no Select=Yes + Hover variants; the code had added a selected-hover (#606060 primary / secondary hover). Removed.
- The unselected hover rules are scoped to `:not([data-selected="true"])`, since the generic hover outranked the selected rule. The selected item gets `cursor: default`.
- Verified with a real pointer on the primary and secondary levels: selected bg/text/cursor are unchanged on hover, unselected still hovers, and re-clicking the selected item keeps it selected. interact 24/24, build OK.
- Guideline updated (Do + Don't). Designer note: keep Segmented's item set without Selected-Hover variants.

## Next-5 components: guidelines + harness (components built by the parallel session)
- The parallel session ("Search popover component và Overviews") had already built Accordion, Alert Banner, Pagination, Skeleton and Toast: components, platform pages, examples, stories. Committed as eafb0de.
- This session briefly overwrote Toast.tsx/toast.css/index.ts with a ToastProvider draft, then restored the committed version with `git checkout`. The peer keeps the `children` API. Ownership is agreed:
  - The peer owns these 5 components and their platform pages/examples/stories.
  - This session owns tools/usage-guard, docs/guidelines, guidelines.generated.json and PlatformGuidelineVisuals.tsx.
- Added guideline entries for toast, alert-banner, accordion, pagination and skeleton. They cover purpose, use / use-something-else, Figma→React, Do/Don't, a11y, content and references (Material, Carbon, Polaris, WAI-ARIA, NN/g).
- New harness rules (24 total), with fixtures:
  - `toast/needs-title` (error).
  - `alert-banner/small-no-action` (error; Figma Small has no Actions).
- Visual Do/Don't pairs:
  - Toast: Undo vs destructive question.
  - Alert Banner: one condition + fix vs stacked banners.
  - Accordion: questions vs hidden price/CTA.
  - Pagination: 10 pages vs 2.
  - Skeleton: mirrored layout vs one block.
- The harness flagged 5 findings in the peer's examples (3 secondary Buttons, a secondary vs tertiary pair, a non-danger Delete); the peer fixed them.
- Peer rule change adopted: Search has no Disabled either (`input/no-disabled` now covers Search).
- Verified the 5 pages at 1440/390: guidelines section present, no clipping/overflow, no console errors. usage:check (7 files, 24 rules), selftest, guidelines:check and build pass.

## Input Leading/Trailing slots hug their content
- Problem: `.zen-input__affordance` was locked to the icon size of the field (16/20/24/28). Anything wider was squeezed into it, so Pagination "Manually" showed "result" clipped: the 44px "results" text sat in a 16×16 slot. Each feature (pickers, Number steppers, Search trailing group, Pagination page size) carried its own "width:auto" override.
- Fix (input.css): the slot is `flex: 0 0 auto`, hugs its content and is nowrap. The field size now only sets `--zen-input-affordance-icon` (small 16 · medium 20 · large 24 · xlarge 28), which applies to direct `.zen-icon` children; `min-height` keeps rows aligned. Removed the per-feature overrides in input.css. The overrides in pagination.css/search.css (peer-owned) are now redundant but harmless.
- Verified: 297 slots across input kinds × 4 sizes, Search themes × sizes, Pagination inline/manually, Date, Tag, Popover and Sidebar pages. Icons stay at field size; nothing is clipped or outside the field. Pagination Manually shows "results" at 44×20. interact 24/24, clickarea 10/10, popover-content 16/16, run-all 17 ✓, build OK.
- Test update: the parallel session made slot clickability explicit (`interactive` prop, playground "Leading/Trailing Clickable"). clickarea now turns off label *and* clickable to test a decorative slot. The guideline already reflects decorative / picker / action slots.

## Input Read-Only: dashed stroke
- Figma (live): every Read-Only field (Field-Only, Text/Select/Date/Number-Left/Number-Center/Text-Area) has a 1px INSIDE stroke with dashPattern [2, 2] in Color/Border/Neutral/Subtle/Default. Code drew it solid.
- CSS `border-style: dashed` uses browser-defined dash lengths (not 2/2, and they differ per engine). So FieldShell renders an inline SVG `.zen-input__dash` only in the read-only state, and the ::after border goes transparent. The rect is 100% wide/high with a 2px centred stroke clipped by the SVG, which leaves the inner 1px. It uses stroke-dasharray 2 2, the token colour, and `rx/ry` from Corner-Radius/Input per size, so it follows the platform radius mode.
- Verified: text/select/date/number/textarea × sizes all show dash 2px/2px, 2px stroke (inner 1px visible), token colour, rx 8/12/16/16 = control radius, and the SVG covers the control box. Default/error states keep the solid ::after border with no SVG. A 4× zoom shows the dashes following the corners. interact 24/24, clickarea 10/10, affordance check 297 OK, run-all 17 ✓, build OK.
- Input focus-ring selector: the picker exclusion is now wrapped in :where() (`:focus-within:not(:where(:has(.zen-input-leading-trailing__picker :focus)))`). The rule is back at 0,4,0, so it no longer outranks Search/Popover's no-ring rule, which the peer had raised to 0,7,0 as a workaround. Verified: popover search focused = no ring; input focused = #111; picker open = no ring. clickarea 10/10, run-all 17 ✓, build OK.

## Border contract harness (Subtle vs Pale, dashed) — usage-guard

- `tools/usage-guard/check-usage.mjs` now also scans CSS (src/platform, src/components, src/styles; flat `selector { body }` scan, `/* zen-allow-<token>: reason */` just above the selector). Three warn rules → `docs/guidelines/borders.md` (§6 of component-usage-rules.md):
  - `border/subtle-static-box`: closed-box border (all-sides border/border-color/outline, a `0 0 0 1px` ring, an SVG stroke) in Neutral/Subtle on a static container.
  - `border/pale-actionable-box`: the same in Neutral/Pale on an actionable container (interaction pseudo/state in the selector, a class styled with :hover/:focus/… in the same file, or a control-like class word).
  - `border/dashed-is-subtle`: dashed / stroke-dasharray drawn with Pale or a raw colour.
  - Lines, single edges and media strokes are not covered; dashed is excluded from the two container rules.
- The first draft (subtle-on-divider, pale-not-interactive, divider/emphasis-justified) was withdrawn after the user narrowed the rule. Divider Default/Medium/High are all allowed and there is no Divider component, so no JSX rule.
- Fixtures: `fixtures/bad.css` and `good.css`. selftest iterates over `fixtures/bad.*` and `good.*` and compares the expected count per rule.
- Guideline entry `borders`: 26 guidelines, 27 rules.
- Fixes:
  - platform.css `.pg` / `.pg-example` / `.pg-checklist__col li` / `.pe-divider` / `.pe-toolbar__divider` → Pale.
  - foundations.css `.icon-gallery__more` (Load more button) Pale → Subtle, plus Subtle/Hover on hover.
- Checks: usage:check 40 files / 0 findings, selftest, guidelines:check, build, platform guidelines 1440/390 OK.

## Sidebar Sub-Menu (Figma Side-Bar/Sub) fixed

- Bug: `subMenu` rendered `.zen-sidebar__submenu-overlay` at `left: 0`, covering the sidebar itself (expanded and collapsed), with only placeholder content.
- Figma (page 1536:27287): Side-Bar/Sub is an absolute 260px (Sidebar/Default-Width) panel. It starts at the master's right edge, with Spacing/Padding/XSmall padding, so the surface sits 8px outside the aside and 8px from top and bottom.
  - Basic: Popover/Default fill, Border/Popover/Subtle, Effect/Popover, Corner-Radius/XLarge.
  - Small-Density and Workspace: Background-Blur, 2XLarge.
  - Sub-Item: Search/Popover plus an Item-List of Master Menu-Items (gap Small 12, list gap 2); Center-Container padding 8 (Workspace 12).
- Code:
  - `.zen-sidebar__submenu` flyout (`role="region"`, `subMenuLabel`), with `onSubMenuClose(event)` called on Escape or a pointer press outside.
  - New `SidebarSubMenu` (search + items + children).
  - Collapsed-rail item rules are scoped to `.zen-sidebar__surface`, so flyout items keep their labels.
  - Playground uses a real SidebarSubMenu; Storybook has a new `SubMenu` story.
- Verified with scratchpad/sbsub.mjs, 19/19: position in all 3 variants and collapsed, surface per variant, labels shown, sub-item selection, Escape/outside/toggle close. Build, usage:check, run-all 17 ✓ and interact pass.

## 2026-09-26 — Examples, Do/Don't + harness hardening, platform UX pass
- **Examples.** Added 29 new examples, so every component page now has ≥ 4 (Search has 5). Visual fixes:
  - Shipping-method radio cards now show the price on the trailing side and a selected ring.
  - Context menu is now a full-width file row.
  - Fixed the typo "Seclected".
- **Harness: 28 → 45 rules** (tools/usage-guard/check-usage.mjs).
  - New JSX rules:
    - button/vague-label and button/one-primary (Main appearance only)
    - toggle/label-names-setting
    - tooltip/no-interactive-content and tooltip/disabled-trigger
    - tabs/item-count (2–7) and segmented/option-count (2–5); elided "…" samples are skipped
    - chip/multiple-needs-count
    - dialog/no-nested and accordion/no-nested
    - pagination/worth-paging (≥ 3)
    - progress/value-range
    - toast/concise (≤ 60 chars, no "?")
    - input/placeholder-not-label
    - sidebar/submenu-close (requested by the peer)
  - New CSS rules:
    - color/token-only: component CSS only; platform and styles are exempt.
    - focus/visible-ring: removing an outline needs a replacement ring in the same file.
    - motion/reduced-motion
  - The CSS check ctx now gets `{src, file}` and the JSX ctx gets `{src, end}`.
  - readChildren now handles nested self-closing tags of the same name.
  - Fixtures cover every rule; the selftest passes.
- **Do/Don't.** Thin guidelines are now filled out: Sidebar (plus the sub-menu flyout), Date Picker, Tooltip, Tabs, Breadcrumbs, Progress, Search, Icon, Toggle, Checkbox, Radio, Badge, Tag, Dialog. Items tied to a harness rule name it.
  - Visual pairs: button, chip and input have 3 each; search, toggle, toast, accordion, tooltip, tabs and progress have 2.
  - New "borders" pairs are rendered on the Design Tokens overview as "Border usage" (`ComponentGuidelines` title prop; slugFor design-tokens → borders).
  - SKILL.md has the new house rules.
- **Platform UX.**
  - Pages are now history entries: pushState plus popstate, so Back/Forward work and `?collection=` deep-links a token collection.
  - A new page scrolls to the top, and `document.title` follows the page.
  - The active sidebar item is scrolled into view.
  - Removed `min-width: 1000px` from the content column.
  - ≤ 1024px:
    - The rail becomes an off-canvas drawer: topbar menu IconButton, scrim, Escape to close, closes on navigation.
    - Topbar chips scroll horizontally.
    - The playground stacks as title → preview → properties (2 columns; 1 column ≤ 620px) → code.
  - ≤ 760px: the hero and cover titles scale with clamp(), and the intro line-height is fixed.
  - The dual calendar scrolls inside its card.
  - Verified: no horizontal page scroll at 390px on 10 audited pages; no console errors; build passes.
- **Segmented default → Secondary (user).**
  - The playground and every example use Secondary; "Billing period" stays as the Primary emphasis example.
  - The component API default changed too: `Segmented` and `SegmentedItem` now use `level = "secondary"`. All existing usages pass level explicitly, so nothing shifts visually.
  - The guideline API row and Do were updated.

## Popover effect vs Figma: spread ignored on non-clipping frames

- Cause: Effect/Popover declares shadows `0 12 32 -16` (Shadow/Neutral/Light) and `0 8 24 -12` (Shadow/Neutral/Base), plus background blur 40. Figma only applies `spread` on rectangles/ellipses or on filled frames with clipsContent (Plugin API DropShadowEffect.spread). Popover/Default, Bunk-Action, Manual-Add-New, Tooltip, Date-Picker and the Sidebar Sub placeholder all have clipsContent=false, so Figma renders those shadows with spread 0. Code used -12/-16, which made the shadow visibly weaker at the edges and looked like a different border.
- Border tokens, fill, radius and blur already matched: Popover/Border is Neutral-Alpha/1 (1.2%), OUTSIDE for Popover, INSIDE for Date Picker and the Sidebar Sub panel.
- scripts/build-style-manifest.mjs now also emits `--zen-style-<token>-shadow-unclipped` (spread 0) for styles with spread; the rule is documented in its header.
- Popover, Tooltip, Date Picker, the Sidebar flyout and the showcase popover use `-unclipped`. Toast (clipsContent=true) keeps the spread.
- The Sidebar flyout stroke is now a 1px border (INSIDE, as in Figma) instead of an outline.
- tools/figma-contract/check.mjs expects `-unclipped` when the Figma node does not qualify for spread (`spreadApplies`).
- Checks: run-all 17 ✓, build, styles:check, usage:check, popcontent, sbsub.
- Known remaining difference: the Figma shadows use showShadowBehindNode=true, so they show through the 90% fill (inside about 252 instead of 255 on white). CSS box-shadow cannot draw under the box.

## Removed the floating Zen feedback button

- Removed the fixed bottom-right IconButton "Open feedback" (Figma Floating-Actions, icon-zen, Accent) from PlatformApp.tsx, together with its `.official-feedback` CSS and the unused IconButton import. Build and usage:check pass; no fixed element remains in the bottom-right corner on the button, popover and sidebar pages.
- **Input-Conditions (user).** Checked against the local Figma export (Input-Components.zip, 2026-09-22), because the live file returned "no MCP permission".
  - Condition-Item text now uses Body/Small/Regular (12/16, 400); previously it had no text style and inherited from the parent.
  - Icon is 16px (Element-Size/Popular/Small); it was 2xs.
  - Default colour is Content/Neutral/Base; it was Neutral/Light.
  - The list gap is Spacing/Gap/XSmall (8px); it was 2px.
  - The Input playground Type now includes "conditions": a live password field with 4 rules, plus its own code sample (Error/Read-only toggles are hidden for that type).
  - The input guideline gained an API row and a Do.
- **Content colour roles (user).**
  - Rules:
    - Neutral families (Neutral, Inverse, On-Black/White-Overlay): Strongest, Base and Light map to the Primary, Secondary and Tertiary text roles.
    - Colour families: Strongest and Base are normal text on that colour's Subtle background; Light is only for highlighted text or icons.
    - Yellow family (Warning, Support/Yellow, Support/Golden): text is Base at most, never Light.
  - Written into:
    - docs/component-usage-rules.md §7
    - the new guideline slug `content-colors` (docs/guidelines/content-colors.md, 3 visual pairs, rendered on the Design Tokens overview as "Content colour usage"; `ComponentGuidelines` gained a `slug` prop)
    - SKILL.md
    - the design-system-context "Content colour contract"
  - Harness is now at 48 rules:
    - content/yellow-no-light-text (error): `color` or content/text/label custom properties; icon properties are exempt.
    - content/title-is-strongest (warn)
    - content/colour-light-is-highlight (warn)
    - Role words are read from the element the rule actually styles.
    - Existing CSS is clean: Badge yellow and Dialog warning use Light only on icons.
- **Lights group corrected (user).** The group is now defined as colours that reference the Sky, Mint, Yellow or Zen scales, which have similar contrast.
  - `content/yellow-no-light-text` is renamed to `content/lights-no-light-text`.
  - The rule resolves every `--zen-color-content-*-light` alias chain in tokens.css (all modes) to its primitive scale. Today that gives Accent (Zen), Warning (Yellow) and Support/Yellow; Golden is out, and nothing maps to Sky or Mint yet.
  - Fallback list: accent, warning, support-yellow.
  - Updated fixtures, the guideline, §7, the context contract, SKILL.md and the visual captions.

## Input playground: preview no longer leaves a gap on the right

- Cause: `.platform-input-preview { width: min(520px, 100%) }` shrank the grey preview area to 520px, while the column (and the code block under it) is 707px at 1440. Every other playground's preview fills the column.
- Fix (platform.css): the preview area now fills the column; its content is `width: min(520px, 100%)` and centred. The media-query `width: auto` override is removed.
- Verified at 1440, 1024 and 390: the preview is as wide as the code block. All 11 Input types are centred with no overflow ("conditions" fills the area with 24px on each side). Build and usage:check pass.

## Rich Text rebuilt from Figma (Input/Richtext 6385:17480, Editor-Bar 6385:36476)

- Figma structure:
  - Input/Richtext is vertical, gap Spacing/Gap/XSmall 8: the Editor-Bar (boolean `Control-Bar`), then Input/Text-Area Medium with Label=false and Help=false.
  - Editor-Bar is horizontal with gap 2XSmall 4. Blocks (items inside a block gap 3XSmall 2):
    - Undo/Redo (icon-flip-backward/forward)
    - Select Small Inputted "Paragraph", 132×32
    - Bold/Underline/Italic/Strikethrough (bold-02, underline-02, italic-02, strikethrough)
    - | align left/center/right/justify
    - | list, dot-number, left-indent-01-solid, right-indent-01-solid
    - | link-01, image, film-02
    - | type-strikethrough-02 (clear formatting)
  - `|` is a vertical Divider/Default, 1×40 Pale.
  - Items are Control-Bar/Select-Item (40×40, radius Base, Theme Subtle).
- Old build: wrong icons (-01, reverse-left/right), wrong order, an extra Code button, missing strikethrough/align/lists/indent/video/clear; one divider; bar gap 2; a Large textarea; a non-functional toolbar over a plain textarea.
- New build:
  - `RichTextEditorBar`:
    - Items follow Figma order and icons.
    - Props: `active` / `disabled` / `blockType` / `onBlockTypeChange` / `onCommand`.
    - aria-pressed toggles; ARIA toolbar with roving tabindex (arrows / Home / End).
    - mousedown keeps the editor selection.
  - `RichTextField`:
    - A contentEditable editor inside the Input FieldShell (hover/focus/Read-only dash/error as Text-Area), min height from the Text-Area size token, grows to 480.
    - The label sits above the bar.
    - `value` / `defaultValue` (HTML), `onValueChange(html, text)`, `editorBar`, `editorBarTheme`, `characterLimit` counts plain text.
    - Commands use execCommand (paragraph separator `p`); the Text style Select maps to formatBlock p/h1/h2/h3.
    - Link/Image/Video open a Popover URL form: https is added, only http(s)/mailto are allowed, links get target=_blank rel=noopener.
    - Clear formatting runs removeFormat + unlink, and headings in the selection become `<p>`.
    - Pasting inserts plain text only.
    - Output is normalised: inline style junk is stripped, `<p><ul>` is unwrapped, bare spans are removed.
  - The bar wraps when narrower than 920 instead of hiding items.
- Exports added: `RichTextCommand`, `RichTextBlockType`, `richTextBlockTypes`. InputLabel gained `labelId`.
- Platform:
  - The Input "richtext" playground uses the new API: Control Bar toggle, Read-only sample, full width, code sample.
  - The Compose showcase uses onValueChange.
  - The control-bar-item sample uses bold-02.
- Verified:
  - scratchpad/richtext.mjs 30/30 and richtext2.mjs 12/12: structure/geometry vs Figma, formatting, undo, heading, lists, indent, link/image/video, unsafe URL, clear, keyboard, paste, Control Bar, Read-only, error, count, a11y name.
  - tsc, build, usage:check, run-all ✓.
- **5 new components (user), built from the live Figma file 9nZv4uW2LT21yuHabMTCh1.** The repo-doc key yhWJ… returns "no MCP permission".
  - **Divider** (460:38361):
    - Colors: Default = Pale, Medium = Subtle, High = Solid.
    - Horizontal renders `<hr>`, vertical renders role=separator; `decorative` is available.
    - Dashed Default steps up to Subtle.
    - It shrinks inside flex rows.
  - **InlineMessage** (595:54857):
    - Six themes on their Subtle surface: icon Light, title Strongest, caption Base.
    - One Main/Small/Tertiary action and a close control.
    - Custom theme takes any visual.
  - **EmptyState** (6085:25796): SVG placeholder illustration built from tokens, Heading/4 title, Light caption, full-width Primary + Tertiary CTAs.
  - **Stepper** (1625:*):
    - Horizontal and vertical layouts; Passed/Focused/Default/Error derived from `current` plus `step.error`.
    - Style=Icon supported.
    - `onStepClick` makes non-default steps buttons; aria-current=step.
  - **Slider** (4010:35946):
    - Neutral/Accent/White × Small/Medium/Large; a native range input sits on top.
    - Fill ends at the dot; Large knob shows on hover/hold; leading icon; `showLimits`; `valueText`.
  - Each component has: a playground, 4–5 examples, a guideline, visual Do/Don't pairs, stories and an index.ts export.
  - Harness is at 59 rules (58 from this session plus one more rule added by the peer):
    - divider/no-double
    - inline-message/needs-content and inline-message/custom-needs-visual
    - empty-state/needs-title and empty-state/action-label
    - stepper/needs-label and stepper/step-count
    - slider/needs-name and slider/white-no-small
    - richtext/value-not-onchange (for the peer's rebuilt RichText; the input guideline also got RichText do/don't)
    - literalCount now skips templated and mapped arrays.
  - Fixed the stale `<EmptyState />` in the Search code sample.

## Toggle "Privacy cards" example layout

- Cause: Toggle keeps Figma's fixed 232px width, so inside the 458px `.pe-radio-card` the switch floated mid-card, captions wrapped at 192px and the right side stayed empty. The settings example already had `.pe-settings .zen-toggle { width: 100% }`; the cards had no equivalent.
- Fix (platform.css): `.pe-radio-card > .zen-toggle { width: 100%; }`. The label/caption sit left and the switch sits on the card's right edge. Checked at 1440 and 390; build and usage:check pass.

## Platform navigation search

- Added a Search (small, "Search pages", ⌘/Ctrl+K from Search's `shortcut`) in the official Sidebar's `search` slot (PlatformApp.tsx).
- Matching (`filterSidebarSections`):
  - Case- and accent-insensitive; every query word must start a word of the label (so "to" finds Toast/Toggle/Tooltip/Design Tokens, not Button). If nothing matches, it falls back to substring.
  - Design Tokens collections match on their own label and are listed flat while searching.
  - Empty sections are hidden, and section actions are hidden while searching.
- Keys and feedback:
  - Enter opens the first result and clears the query; Escape clears it.
  - A polite status line shows "N results" or "No pages match “…”".
- Layout: the slot is inset like the body, so the field aligns with the items (16–252).
- Verified with scratchpad/navsearch.mjs: 14/14 at 1440 and 15/15 at 390 (drawer closes after opening a page). tsc, build and usage:check pass.
- **Card, Dock Icon, List Item, Table (user)**, built from the live Figma file:
  - **Card** (6643:51021):
    - Themes: Shadow / Flat / Border / Pale (backdrop blur) / Semi-Pale (gradient); Spacing Medium/Small.
    - Active = 2px Card/Border/Active.
    - Sub-Action pinned top-right.
    - `onClick` makes it role=button and Border steps up to Subtle.
    - Choice controls inside stretch to full width.
  - **DockIcon** (308:45902): 5 sizes (Image-Size tokens) × 22 themes × Solid/Subtle, including Emoji, On-Color, Inverse, Pale, Surface.
  - **List + ListItem** (4080:11700):
    - Row padding Small × Margin-Comfortable; Interactive-Background inset 12px, radius Large.
    - States: Hover, Pressed, Selected (Active/Neutral/Subtle).
    - Rows can be a button or a link; there is a Contents override.
  - **Table** (1595:2631):
    - Header uses Table/Header/Size, All-Caps/S Light; sort buttons with aria-sort; select-all is indeterminate when partial.
    - Cells use Table/Cell/Size with a 1px Pale bottom border and Table-Cell/Background Default/Hover/Selected.
    - `empty` renders a full-width row.
    - Cell primitives: TableText, TableMedia, TableTrend, TableActions.
    - `position: relative` keeps sr-only and checkbox inputs inside the scroll box (this fixed a 706px page scroll on mobile).
  - Each has a playground, 4 examples, a guideline, visual pairs and stories.
  - Harness is at 64 rules: card/clickable-no-nested-controls, list-item/clickable-trailing-controls, dock-icon/emoji-needs-glyph, table/needs-name, table/interaction-needs-handler. A new `topLevel()` helper makes these rules ignore props of nested elements.
- **Composition pass (user):** about 25 existing examples were rebuilt on the new components:
  - `pe-list` rows → List/ListItem;
  - radio/toggle/metric/preview/file-row boxes → Card (Active for the selected choice);
  - bulk selection, skeleton rows and paginated invoices → Table;
  - `pe-divider` / toolbar divider → Divider;
  - folder, file and nav rows got DockIcon leadings.
  - 17 dead CSS rules were removed; composition helpers `.pe-list-card`, `.pe-choice-card` and `.pe-card-grid` were added.
- **Memory:** saved a project map, composition rule, border rule, peer coordination and platform UX decisions so future sessions can continue.
- **EmptyState in platform search flows (user).**
  - **Sidebar nav search:** "No pages found" plus Clear search, with no illustration. The status line stays for screen readers and is visually hidden when empty.
  - **Iconography:** new "No icons match “q”" with a search icon and Clear search. The old setup notice "SVG source folder is ready" is now an EmptyState as well.
  - **Token collection tables:** "No tokens match “q”" with search hints and Clear search.
  - **Search examples:** "live results" and the compact icon picker.
  - Removed the dead `.icon-gallery__empty*` and `.token-table-view__empty` CSS.
  - The Search guideline gained a Do. Verified by typing "zzqq" into each search; Clear search restores the list.

## Nav search: no trailing shortcut hint

- Removed `shortcut="k"` from the sidebar Search, so the trailing ⌘K hint is gone.
- The shortcut still works through a window keydown listener in PlatformApp.tsx: ⌘/Ctrl+K opens the drawer on narrow screens, then focuses and selects the field. It is announced with `aria-keyshortcuts`.
- The peer's EmptyState for zero results is kept. navsearch 14/14; build and usage:check (69 rules) pass.
- Reverted at the user's request: the ⌘K trailing hint is back (`shortcut="k"`, which also focuses the field). The window listener now only opens the mobile drawer on ⌘/Ctrl+K. navsearch 14/14 at 1440, and passes at 390; build passes.
- **List containers (user):** containers that wrap a List now have padding-block = Spacing/Padding/Small (12px): the List Item playground, stage lists and `.pe-list-card` (was 4px). This matches the List-Item Interactive-Background's 12px side inset, so the hover/selected fill no longer touches the container edge.
- **List-Item trailing buttons are Medium (user).**
  - All Button/IconButton instances in ListItem trailing slots are now size="md": the playground and its code, the Inbox/Trailing-actions/Setup-checklist/Delete/Context-menu examples, visuals and the story.
  - Figma's Slot-Actions uses Small; the user chose Medium to match the 40px leading avatar.
  - JSDoc and the guideline were updated. New harness rule list-item/trailing-button-medium (warn); the harness is at 70 rules.
- **Table in-place editor coverage.** The editor itself was built by a third session, "Sidebar icon sizing and tooltips", which owns Table.tsx/table.css and the editable examples.
  - Table guideline:
    - api rows for Editable cells (column.edit: text/number/select/tags, value, onCommit, validate, disabled, options, suggestions) and the Open button (onOpen);
    - new use/avoid entries, 5 Do, 3 Don't, and a keyboard a11y paragraph (Enter/F2/type/double-click, Enter commit, Tab move, Escape cancel, arrows, Backspace clear).
  - Harness is at 73 rules: table/editor-needs-commit (error), table/editor-number-right (warn) and table/editor-number-validate (warn). They are checked per column through a new `arrayObjects()` helper that reads literal column arrays only.
  - No visual pair was added: the guideline stages are inert and can't show the edit state.

## Dialog example "Form · Big with steps": header above the Stepper

- Figma Modal/Forms (841:17182) has Top-Customize (Top-Custom-Slot) above the Header and Main-Contents in the Body below it. The example had put the Stepper in `top`, so it rendered above the title.
- Fix (PlatformShowcases.tsx, ModalFormImportExample): the Stepper is now the first child of Main-Contents; the `top` prop is removed. The description and code sample are updated. The ModalForm component is unchanged.
- Verified with scratchpad/bigsteps.mjs 8/8 at 1440 and 390: header above stepper, stepper inside the body, no overflow, Continue/Back flow, no page errors. Build passes.

## Card "Sub-Action menu" (and Popover "Context menu"): menu anchored to its button

- Cause: `anchorRef` pointed at the wrapper around the whole card, and useAnchoredPosition places the Popover 4px under the anchor box, so the menu opened under the card, far from the "…" button. The Popover "Context menu" example had the same bug (wrapper around a Card + ListItem).
- Fix (PlatformShowcases.tsx): both examples pass a ref to the IconButton (`ref={triggerRef}`) and `anchorRef={triggerRef}`. Focus returns to the button after a selection; aria-haspopup was not added (the items are options, and the filter-is-chip rule reads aria-haspopup as a filter). Code samples are updated. The Search filter and Assign examples anchor to the field/group on purpose and are unchanged.
- Verified with scratchpad/menuanchor.mjs 10/10 at 1440 and 390: 4px under the button, right edges aligned, select closes and returns focus, no page errors. Build and usage:check pass.
- **Batch 3 (user: "build the missing components")**, built from the live Figma file:
  - **Rating** (1536:355):
    - Star input: one radio per star, hover preview; 5 sizes; Default (Yellow Light) / Neutral / Accent.
    - RatingDisplay: fractions via a clipped fill row.
    - OpinionScale: 2/3/5 emoji.
    - NpsScale: 0–5/0–10 number chips.
  - **ColorSelector** (373:97188): 32px swatches, check when selected (contrast dark/light), hover 2px ring, focus halo; one radio per swatch.
  - **Metric Widget** (595:54968): Metric in 5 sizes (Display/4 → Subheading; XL/L stack the icon), MetricTrend (Badge), and MetricCard (Card Shadow + ⋮ Sub-Action).
  - **Uploader** (1581:17515):
    - FileUpload: dropzone (a real button plus drop target; dragover dashed Focus/Neutral/Subtle, allowed) or Browse Button; label, caption, help and error.
    - UploaderFileItem: uploading/uploaded/replaceable/alert, file-type badge or photo thumbnail, default/overlay theme.
  - **SidePanel** (1573:2884):
    - Standard is docked and non-modal (role=complementary, Pale left edge).
    - Modal floats over a scrim with focus trap and return focus.
    - Default 440 / Small 360; header Heading/3 + close; ModalActions footer.
  - Each has a playground, 4 examples, a guideline, visual pairs (not for SidePanel: inert stage) and stories.
  - Harness is at 78 rules: rating/needs-name (also covers ColorSelector, OpinionScale, NpsScale), metric/formatted-value, uploader/needs-label, uploader/accept-caption, side-panel/not-for-confirmations.
  - Harness fixes:
    - "swatch" is now an actionable word;
    - `button/filter-is-chip` ignores aria-haspopup="menu" (action menus added by a peer);
    - the static Uploader file row is allowed Pale.
  - The table.md guideline was updated for the Notion-style editor.
- **SidePanel close position (user: "wrong vs Figma").** Measured on Figma 1573:3128.
  - The close sits in a 20px Wrapper at the header's top-right, with the 32px button overhanging by 6px, and is now absolutely pinned:
    - Standard: top/right 18.
    - Modal: in the 28px Close-Container on the icon row, so top/right 22.
  - The title keeps clear of it (padding-end 36 / 44).
  - Modal title is Heading/4 (was Heading/3).
  - The modal container is 424/344: Figma's 440/360 includes the 8px outer padding.
  - Browser measurements now match Figma exactly (close 22/22 and 18/18; title top 84 h 28 w 332; standard title w 275).
  - SidePanel now uses Dialog's exported `useModal` (peer request).
  - Tag guideline "Don't" reworded to fit the new Tag onClick.

## Uploader File-Item Theme=Overlay updated to Figma

- Figma Primitives/Uploader/File-Item (1581:22739), Theme=Overlay (all 4 states × 3 thumbnails): fill Color/Background/Liquid-Glass/Normal/Default (Light/Glass-Default white 70%, Dark #262626 70%), no stroke, radius 16, Effect/Overlay (background blur 100 → CSS blur(50px)). Alert uses Negative/Subtle + Effect/Overlay in both themes (unchanged). Text, icons and actions are the same as Default.
- The code used Background/Neutral/Subtle for Overlay. It now uses `--zen-color-background-liquid-glass-normal-default`, and the prop doc is updated.
- Found while checking dark mode: the neutral file-type tile (e.g. MP4) put On-Colors (white) text on Neutral/Solid, which is light in dark mode, so the text was invisible. It now uses Content/Inverse/Strongest.
- Verified: computed style in light (rgba(255,255,255,.698), blur 50) and dark (rgba(38,38,38,.698)), with screenshots of the "Overlay item" example. tsc, build and usage:check pass.
- **Close buttons synced (user: "modal and side panel close aren't the same; they should be Flat").**
  - Figma: both are Button/Icon-Flat Small Primary.
  - ModalForm had `appearance="flat" level="tertiary"`. Flat has no Tertiary, so it fell back to the Main Tertiary look (border and shadow); it is now Flat Primary.
  - Figma icons are kept: ModalForm x-medium at 20/20; SidePanel x-small at 18/18 (Standard) and 22/22 (Modal). Computed styles are now identical (transparent, no border, 32px).
  - Also fixed 2 "Workspace settings" Flat Tertiary buttons (Sidebar examples/playground).
  - New harness rule `button/flat-level` (error): Flat allows only primary, secondary, accent, danger, positive. The harness is at 80 rules. The Button guideline gained a Do: close/dismiss uses Flat Primary.

## File icons (Figma Iconography → Special Icons → File) added

- Figma `icon-media-file` (5727:22537) is 20×20 with Format = Doc, Figma, Music, PDF, Record, Sheet, Sound, Video, Zip, Photo.
  - Base shape: Content/Support/<Blue|Red|Green|Orange>/Light; Figma uses Background/Support/Violet/Solid.
  - Visual glyph: Content/On-Colors.
  - Sheet has no glyph (its grid is cut into the base).
  - Figma's Format=Photo is currently an exact copy of PDF (same glyph and colour); kept as-is and flagged.
- New `src/components/FileIcon`:
  - `fileIconData.ts` holds verbatim SVG paths exported from Figma, marked base/glyph.
  - `<FileIcon format size title>` reuses the Icon size scale (default base 20) and the zen-icon class. It is decorative unless `title` is given.
  - Colours come from tokens via `data-tone` in `fileIcon.css`.
  - Also: `fileIconFormatOf(name)`, a story, and an export from src/index.ts.
- Iconography page (IconGallery): a "File icons" section above the system grid. It follows the search (format/label/"file") and the preview size, with a `<FileIcon format>` code per card.
- Verified with scratchpad/fileicons.mjs 9/9: 10 formats, base colours equal to the Figma export, white glyphs, 20×20, search filtering, empty state, dark tokens, no page errors. tsc, build and usage:check pass.
- **FileIcon coverage** (component built by the peer from Figma icon-media-file 5727:22537):
  - The Uploader File-Item Thumbnail=File now renders `<FileIcon format={fileIconFormatOf(name)} size={36} />` (Figma parity). The hand-made type badge, its tone map and its CSS were removed.
  - New guideline `file-icon`, rendered on the Iconography page as "File icon usage".
  - New harness rule `file-icon/not-an-action` (error: FileIcon inside Button/IconButton children, icon or startIcon); 81 rules.
  - Known Figma issue: Format=Photo is a copy of PDF, so .png files show the PDF mark until the designer fixes it.

## Sidebar Workspace rail: avatars square like the Avatar component

- Cause: the rail item button drew a 1px INSIDE border (40×40 box → 38px content), and `.zen-sidebar__item-icon > *` forced the avatar to 100% width/height with radius 11px. The avatar rendered 40×38 with radius 11, so it was not square and not the component.
- Figma (Side-Bar/Master/Workspace → Master-Body-Content): each item is Avatar/Single Square Medium 40×40 r12 with a 1px OUTSIDE Border/Inverse stroke; the Focus-Ring is a 48×48 rect with radius 16 and a 3px OUTSIDE stroke (4–7px outside).
- Fix (sidebar.css):
  - The border is replaced by `box-shadow: 0 0 0 1px Border/Inverse`.
  - The icon slot is 40×40 and the avatar keeps its own size and radius.
  - The ::after ring uses inset -7px, 3px, radius Large+3 (19).
- Verified: the playground and the "Workspace + members" example show avatars at 40×40 r12, the same as the component. The selected/focus ring is accent at 4–7px. sbsub 19/19; build and usage:check pass.
- **Motion for Toast / Side Panel / Modal (user: "smoother animation and transitions").**
  - New `src/components/Motion`:
    - motion tokens `--zen-motion-duration-{fast 120, base 200, slow 280}` and `--zen-motion-ease-{standard, emphasized, exit}`; all durations go to 0 under reduced motion;
    - shared keyframes, including scrim-in/out, which animate background-color only;
    - `usePresence(open, exitMs)` keeps an overlay mounted with data-state="closing" for its exit, and unmounts immediately under reduced motion.
  - **SidePanel:**
    - Modal slides in from beyond the edge (Slow, emphasized) and slides out faster (Base, exit curve); the scrim fades its colour only.
    - Standard nudges 16px + fades.
  - **Dialog/ModalForm** (peer-approved edits): enter translateY 12px + scale .96 (Slow, emphasized); exit 160ms (translate 6px, scale .98, fade); the scrim fades its colour.
  - While closing, overlays are inert/aria-hidden and ignore scrim clicks. useModal still restores focus and scroll the moment `open` goes false.
  - **ToastStack** (new): a queue with auto-dismiss (+3s with an action; paused on hover/focus) and max; rows rise in and collapse out (grid 0fr↔1fr) so neighbours reflow smoothly. Rows keep their position while exiting; portals through ZenPortal; `inline` option. The Toast "Stacked notifications" example uses it.
  - Guidelines: Toast API/Do (use ToastStack); Dialog and Side Panel a11y lines describe the motion.
  - Fixed a transparency glitch: scrims used to fade `opacity`, which faded the panel inside them.
  - Verified with Playwright in normal and reduced-motion modes: closing state, then unmount, focus returned immediately.

## Re-test after the peer's Dialog motion work; reduced-motion fix

- The peer added usePresence (160ms exit), data-state="closing", an inert panel, and zen-dialog-in/out plus scrim keyframes to Dialog/ModalForm.
- Re-run results: bigsteps 8/8; run-all 25/25. The new scratchpad/dlgclose.mjs checks focus returning to the opener and the scroll unlock at the moment of close, an inert panel while closing, detach after exit, and reopen + Cancel.
- Bug found and fixed (dialog.css): the `prefers-reduced-motion` rule sat before `.zen-modal-form { animation: zen-dialog-in … }` with the same specificity, so ModalForm still animated with reduced motion. The rule moved to the end of the file and also covers `[data-state="closing"]`. Now reduce mode gives Dialog/ModalForm/scrim animation none, and the panel unmounts at once. Build and usage:check pass.
- **Date Picker examples clipped the shadow (user).** `.pe-inline-picker` has overflow-x:auto (for the mobile dual calendar), which clipped Effect/Popover. It now gets 24px of shadow room as padding with a matching negative margin: the shadow shows, the layout is unchanged, and there is still no page scroll at 390px.

## Guidelines JSON: api + keyboard (peer request #2)
- `guidelines.source.mjs` exports `keyboard` (slug → [keys, action][]), limited to behaviour verified in code (popover, tabs, chip, date-picker, table editor, native radios/range, useModal overlays…). Segmented a11y corrected: aria-pressed button group, not radiogroup.
- `build-guidelines.mjs` emits `api` + `keyboard` into guidelines.generated.json and a "## Keyboard" table in docs/guidelines/*.md.
- guidelines:check and usage:selftest pass. tsc flags only the peer's PlatformReference.tsx:10 cast (JSON tuples widen to string[][]); the peer has been told to use `as unknown as`.

## Component page template: sticky "On this page" + Keyboard / API sections

- Figma Codebase Platform → Component-Page-Template (14260:96953):
  - Body Content is a Main-Component-View (960) beside a "Sticky" column (228 wide, padding-left 24, gap 8).
  - The column holds "On this page" (Body/Base/Regular, Content/Neutral/Light) and links "Playaround", "Examples", "Keyboard", "API" (Body/Base/Medium, Strongest).
- Code:
  - `ExamplePage` (PlatformExamples.tsx) is a grid [content | 228px rail], gap 16. At a 1512 viewport the content is 960, as in Figma.
  - Sections are anchored `PlatformSection`s: #playground, #examples, #keyboard, #api, #guidelines.
  - New src/platform/PlatformReference.tsx:
    - `ComponentKeyboard` and `ComponentApi` render Tables from guidelines.generated.json `keyboard`/`api` (the peer emits them from guidelines.source.mjs for all 43 slugs; empty → no section). Keys render as <kbd>.
    - `PlatformOnThisPage` is sticky at 72+24px. It lists only rendered sections, does scroll-spy (aria-current + a 2px rule in the gutter), smooth-scrolls on click (instant with reduced motion), focuses the section heading, and replaceState's the #hash.
    - It is hidden under 1280px.
  - `guidelineSlugFor` is exported from PlatformGuidelines.tsx.
  - Labels: "Playground" (Figma says "Playaround", a typo) and an extra "Guidelines" item for the existing usage section.
- Verified with scratchpad/toc.mjs 16/16:
  - Rail geometry equals Figma, sticky top 96, click lands the section 96px under the top, current is marked, heading focused, scroll-spy works.
  - No overflow on 8 pages; hidden at 1180; no page errors.
  - tocsmooth.mjs: all 5 targets settle at 96 with smooth scroll.
  - tsc, build, usage:check and interact pass.

## Slider: flush at 0 (Medium/Large)

- Symptom: at value 0 the Medium/Large knob sat 4px from the rail edge (2px at 100), and the fill was 24×22, a pill sticking out ~2px beyond the knob.
- Figma Slider/Horizontal (4010:35946): Track 24 high from the rail edge. The Trailing-Dot (24, padding 2 around a 20 Thumb) is flush with the Track end, so the knob is 2px from the rail edge at both ends.
- Cause: the fill sits inside the rail's 1px padding, and the dot overhangs it by 1px (right: -1px), but the fill's minimum length was the full dot (24).
- Fix (slider.css):
  - Medium/Large use `--zen-slider-fill-min: dot − 2px` in the width formula. At 0 the fill is a 22×22 / 30×30 circle and the knob is 2px from the edge; at 100 the knob is 2px from the edge.
  - Small keeps `fill-min = dot`; it was already symmetric at 1px.
- Verified: geometry table for 3 sizes × {0,1} is symmetric; dragging past both ends gives 0/100 with a 2px knob gap; Home/End work. Build and usage:check pass.

## Rule: no stretched small buttons (button/small-full-width)
- User: forbid small buttons stretched edge to edge (Uploader "Upload progress" had an xs button filling a .pe-stack grid).
- Rule `button/small-full-width` (error, allow `small-full-width`): Button size 2xs/xs/sm that is full width by its own style/class (width 100%, flex 1, stretch) or by its parent (grid without justify-items, flex column without align-items; from inline style or plain class selectors in any src/**/*.css). Opt-out must match the parent: justifySelf in a grid, alignSelf in a flex column. Full-width buttons are md+ (Figma EmptyState CTA = Medium, full width).
- Harness: new `parent()` in the JSX ctx (nearest enclosing JSX tag, template-string aware via local backtick parity; closing tags after text are not treated as generics) + `layoutClasses` map.
- Fixed 4 examples (Upload progress, Verify domain, Booking range "Reserve", Alert page "Reset") → justifySelf start. Button guideline Do/Don't + visual pair added. Runtime sweep (scratchpad smallwide.mjs, 1512 + 390) finds only the intended Don't illustration.
- 82 rules; selftest, usage:check, guidelines:check and tsc all pass.

## Sidebar workspace rail background
- User: the workspace avatar rail should be Surface/Default or have no background. Removed the rail from the `data-background="alt"` rule in sidebar.css, so the rail always stays on Surface/Default (white on a Canvas/Alt page); the main panel keeps Surface/Alt. Verified via computed style and a screenshot; the Sidebar owner session has been notified.

## Sidebar examples use the Table component

- `ShellTasks` (used by all three Sidebar examples: Projects flyout, Workspace + members, Collapsed rail + flyout) went from List/ListItem to `Table`.
  - Columns: Task (TableText bold, sortable), Owner (TableMedia with an xsmall photo Avatar, sortable), Status (Badge, sortable by the todo → in progress → done order).
  - Sorting is controlled through `sort`/`onSortChange` via a small `sortRows` helper.
- Workspace example: the "Projects" page now shows `ShellProjectsTable`.
  - Columns: Project (TableMedia icon + name, caption "Updated … · Pinned"), Team (AvatarStack xsmall, 96px), Open (right-aligned, 80px, sortable).
  - "Updated" rides in the caption because the app-shell column is ~390px.
- Code samples of the three examples now include the Table snippet.
- Verified with scratchpad/sbtables.mjs 11/11 at 1440 and 390:
  - Tables render and sort by Status and Open; no page overflow (the Table scrolls inside `.zen-table` at 390).
  - interact 23/23; tsc, build and usage:check pass.
- User rule: table titles are Heading/4.
  - `Table`'s `caption` changed from Body/Base/Bold to Heading/4 (Table.tsx).
  - The ShellTasks title and the Table "Files / N selected" toolbar title changed from Body/Base/Bold to Heading/4.
  - Verified computed 20px/28px w600 (= zen-type-heading-4) on "Recent activity", "Workspace activity", "Up next" and the Files title. Build and usage:check pass.

## Table titles = Heading/4 (peer request)
- The peer made Table `caption` Heading/4 and fixed two example titles. I added a Table guideline Do/Don't plus rule `table/title-heading-4` (warn, allow `table-title`): a `<Text style>` other than Heading/4 whose next sibling is `<Table>`. Fixtures bad/good added; 83 rules; selftest, usage:check, guidelines:check and tsc pass.

## Sticky "On this page" → Figma pill rail + ↑/↓ section jump
- Figma 14366:142238 (in the Component-Page-Template): 28px rail, 16px column gap, one 4×20 pill per section (radius full, gap 4, padding 0 12); active = Background/Active/Neutral/Solid, others = Background/Neutral/Subtle (hover = Subtle/Hover). No text.
- PlatformOnThisPage (peer's file, coordinated): pills are links with aria-label and a left DS Tooltip; hit area 28×24; the "On this page" label is removed (the nav is still aria-labelled). The rail now shows ≥761px (was ≥1280, since it's only 44px wide).
- New: ↑/↓ jumps to the previous/next section (same path as a click: scroll, aria-current, replaceState #hash, focus heading). Skipped when modifier keys are held, when the event is already defaultPrevented, when focus is in fields / listbox / menu / tabs / slider / radio / grid / table / date picker / code, or when an aria-modal is open. The nav has aria-keyshortcuts. The heading's programmatic focus shows no ring.
- Tests: scratchpad toc2.mjs (geometry, sticky 96, click ×5, scroll-spy, ↓↓↓↑, tooltip, 1180/800/390 overflow) all pass for both reduce and full motion; tockeys.mjs confirms arrows inside input/slider/tabs are not stolen. tsc and usage:check pass.

## Table editable cells: no focus ring after an edit ends

- Cause: when an edit ended (Enter, Escape, or a select picked), `focusCell` returned focus to the cell, and the CSS showed the 3px Focus/Accent/Subtle ring for both `:focus` and `:focus-visible`. The cell therefore stayed ringed after every edit.
- Fix (Table.tsx, table.css):
  - `focusCell(cell, quiet)`: an ended edit refocuses the cell with `data-quiet="true"`, so keyboard users continue from it without a ring. The flag is removed on blur.
  - Arrow/Tab navigation focuses the next cell normally, so the ring shows there.
  - CSS: the ring is `:focus-visible:not([data-quiet])` only; plain `:focus` (pointer) has no ring.
- Verified with scratchpad/cellfocus.mjs 6/6:
  - Enter: saved, focused, no ring. ArrowDown: ring on the next cell. Escape: no ring.
  - Clicking outside: saved, no cell focused. Select picked with the mouse: no ring. No page errors.
  - Build and usage:check pass.
- Table a11y note: after an edit ends, focus returns to the cell quietly (peer's data-quiet change).
- The TOC rail, once stuck, is centred vertically in the visible area under the topbar: top = max(96px, 50vh + 36px − height/2), with height from `--platform-toc-height` (items × 24px). toc2.mjs checks this ("stuck rail centred", mid 486 at 900px) and passes.
- Follow-up (2026-09-27): the row's Open button stayed visible after an edit, because `.zen-table__row:focus-within` still matched the quiet-focused cell. It now shows on `:hover` or `:has(:focus-visible:not([data-quiet="true"]))`. Verified with scratchpad/openbtn.mjs 6/6: hidden after Enter/Escape once the pointer leaves, shown on hover, shown on the row keyboard-navigated to (ArrowDown). cellfocus 6/6; build and usage:check pass.

## 2026-09-27 — Toggle "Inline preference": dark preview switches the whole example card

- The user wanted the whole example card (header, stage, code and every component) to switch when "Dark preview" is on. Before, only an inner wrapper got data-theme.
- ExampleCard (PlatformShowcases.tsx): new `ExampleCardThemeContext`. An example can set the card's `data-theme`; ToggleInlineExample uses it and follows the platform mode (MutationObserver on the scope above the card) until overridden.
- platform.css:
  - `.official-platform [data-theme]` re-declares the platform colour aliases (--official-*, --platform-surface-*, --platform-inset-background), because they were resolved on `.official-platform`.
  - `.pe-card[data-theme]` sets its own text colour.
- System fix (scripts/build-tokens.mjs → tokens.css):
  - Component theme colours were declared only on `[data-component-theme]`, so Button/Chip/etc. kept the outer mode inside any nested `[data-theme]` scope. The Code button stayed light in the dark card.
  - Each component theme block is now also emitted for `[data-component-theme="x"] [data-theme]`, and the default block for `:root [data-theme]`. Only selectors changed (16 diff lines, no values). tokens:check OK.
- Verified with scratchpad/darkcard.mjs 10/10:
  - Card, titles, the Code button, the inner Card, Toggle and text all switch.
  - Off returns to the page mode. With the platform in dark, the toggle starts on and turning it off makes the card light.
  - No page errors. run-all interactions 25/25; build passes.
- Unrelated pre-existing failure: the Checkbox/Text contract (caption x/y) fails with the old tokens too. Checkbox files were modified 00:09 by another session; reported to the peer.

## 2026-09-27 — Batch 4: every remaining Figma component
- New: TopNavigation, BottomNavigation, BottomSheet, Chat (kit), AiChat, Chart (Line / Stack bar / Card). Figma nodes are in each file's JSDoc.
- Platform: 6 pages. Playgrounds live in PlatformMobilePlaygrounds.tsx, 24 examples in PlatformMobileShowcases.tsx, a PlatformPhone device frame, and PlatformMobileData.ts (moved out to break an HMR import cycle).
- Guidelines: 6 new slugs (49 total) with keyboard rows and Do/Don't visual pairs. 6 new rules (89 total):
  - top-navigation/max-two-trailing
  - bottom-navigation/destinations
  - bottom-sheet/action-needs-items
  - chat/others-need-author
  - ai-chat/no-actions-while-streaming
  - chart/stack-needs-legend
- Fixes found in review:
  - Bottom-nav selection styles are scoped to the floating types.
  - Chart has a 36px tooltip gutter, 35% idle sector rules, and the stack bars' double inset is fixed.
  - AI answers keep line breaks.
  - The phone frame border is Pale.
- Verified:
  - mob.mjs: 1512 + 390, no overflow, no errors.
  - mobint.mjs: 16/16 — sheet focus trap / Escape / scrim / select, bottom-nav aria-current, composer Enter/Send, AI Stop → answer, chart arrows + live summary, top-nav collapse on scroll.
  - glmob.mjs: guideline pairs.
  - selftest, usage:check, guidelines:check, tsc and build all pass.

## 2026-09-27 — Popover .Primitives/Popover/Item/Content (829:20006) synced with live Figma
- Theme=Avatar Small is now always Avatar Size=Small (32px), where it used to be 20px, or 32px only when captioned.
- Subtext uses Body/Small/Regular (was Caption/Regular).
- Label/Subtext wrap (Figma truncation disabled, auto height).
- The Icon and Photo Small leading is always top-aligned; the check and trailing stay centred.
- Contract docs/figma-contracts/checkbox-radio-chip-popover.json: the Avatar Small variant was re-extracted with the repo extractor through the Plugin API, read-only. run-all is green (68/68 for Item/Content, 25/25 interactions); tsc and usage:check pass.
- Avatar guideline copy and the zen-input-states memory are updated.

## 2026-09-27 — Review of the 6 new pages (Top/Bottom Navigation, Bottom Sheet, Chat, AI Chat, Chart)

- Sweep (scratchpad/newpages.mjs) at 1440 and 390: no page errors, no horizontal overflow, 4 examples each, the "On this page" rail has 5 items, and Keyboard/API tables are filled.
- Interactions (scratchpad/newinteract.mjs 22/22):
  - Top-nav: named controls, Tab, the Collapsed toggle.
  - Bottom-nav: aria-current moves on click and Enter.
  - Bottom sheet: role=dialog, focus inside, Tab trapped, Escape closes and returns focus, rendered inside the phone frame.
  - Chat: Shift+Enter makes a newline, Enter sends and clears.
  - AI chat: Enter sends; answer actions are reachable.
  - Chart: ←/Home/End move the tooltip, the range switch updates, the plot is named.
  - No console errors.
- Issues found and handed to the peer (owner):
  1. The Chat Group example opens scrolled to the top, so the latest messages are cut off.
  2. The Chat Business example's others' bubble (white 90%) sits on a white screen; Figma puts it on Canvas/Default.
  3. Chart "Dashboard tile" uses ~390 of ~1040px and its month labels are cramped.
- Stale tests updated:
  - popcontent: Avatar Small is always 32px and centred (Figma 829:20006).
  - navsearch: "to" also finds Top Navigation.
  - interact2: the dialog test waits for the 160ms exit and reads only the open dialog.
  - toc2: the peer's version for the centred rail.
- All green: run-all (Popover contracts 0 ✗, 25/25), build, usage:check (90 rules).
- Peer review fixes (batch 4):
  - ChatThread now opens at the latest message and stays pinned to the bottom unless the reader scrolled up more than 48px. It uses the nearest scrollable ancestor.
  - Business chat sits on Canvas/Default: PlatformPhone gains canvas="canvas", and the playground picks it for the Business domain. Guideline Do added.
  - The Chart "Dashboard tile" uses .pe-chart-dash (1fr / 2fr, one column at ≤760).
  - Chart Y labels are absolutely positioned on their gridlines (≤1px).
- User follow-up: Popover item Label/Subtext truncate to one line with "…" (a deliberate deviation from Figma auto-height). The Popover guideline copy and memory are updated; the contract stays green.

## 2026-09-27 — Metric Widget: richer examples, themed Dock Icons
- Metric / MetricCard gained `iconTheme` (any Dock-Icon theme, default neutral), `iconBackground` (subtle | solid) and `iconEmoji` (Theme=Emoji). The playground has Icon theme + Solid icon controls.
- Examples went from 4 to 9:
  - KPI cards (green / blue / crimson)
  - Sales by period (Segmented + golden / orange / teal / violet)
  - Budget by department (6 support colours)
  - Goal progress (Solid Accent + ProgressBar)
  - Service health (green / orange / Solid red)
  - Team pulse (emoji)
  - Inline metrics, Metric with context and Sizes, all re-themed
- Guideline: API row plus Do/Don't on category colour-coding and a single Solid lead.
- tsc, usage:check and guidelines:check pass; 1512 and 390 have no overflow and no errors.

## 2026-09-27 — Example card titles are Heading/4

- `ExampleCard` (PlatformShowcases.tsx) title changed from Body/Extra/Bold to Heading/4. All component pages use it, including the mobile examples spread into `examples`.
- Verified with scratchpad/extitles.mjs: on button, toggle, chat, chart, sidebar and table (25 titles), each title equals a zen-type-heading-4 probe in the same typography scope (the platform heading font, 20/28 w600) and none wraps. Build and usage:check pass.
- Verified the peer's 3 fixes (scratchpad/verify3.mjs/verify3b.mjs): the Group chat opens at the latest message; the Business chat sits on Canvas #F7F7F7; the Dashboard tile's chart is 603px with month labels ≥63px apart. newinteract 22/22. The fork session's Popover ellipsis revert passes popcontent and run-all.
- Platform rule (peer, per user): example card titles are Heading/4 (ExampleCard); memory updated.

## 2026-09-27 — Uploader synced to the live Figma (1581:22739 File-Item, 1581:22873 DragDrop-Field, 1581:22708 File-Upload)

- Read the live Figma (compact walker via use_figma) and measured the code; the diffs were fixed.
- Figma values now in code:
  - File-Upload label: Body/Small/Regular (was Medium).
  - DragDrop-Field Extended=Yes: gap 16 icon → content and 2 text → caption (106 high; code was 108).
  - The file list sits 16 below the [label, field, help] block (was 8).
  - File-Item name: Body/Base/Bold 14/20 (was Body/Small/Bold).
  - Action icons: 16px (were 12), 12px apart, flush with the 16px padding; 24px hit areas with -2px block margin to keep the 20px row.
  - Thumbnail=Photo: 32px, Corner-Radius/Small (was 36).
  - Dragover: exact dash [4,4], 2px inside, via an SVG rect (4px stroke clipped), replacing the outline dashed.
  - New `extended` prop (Figma Extended=No): one 48px row, padding 12/16, gap 8, Corner-Radius/Base, no caption.
  - Single-file field (no `multiple`), per Figma State=Uploaded / File List=Single File: the File-Item replaces the field. An uploaded file reads as Replaceable, Replace re-opens the picker by default, and Remove brings the field back.
- Platform:
  - The uploader playground gained Extended and Multiple toggles; the code sample follows them, and turning Multiple off keeps one file.
  - The "Profile photo" example drops its no-op onReplace, and its copy is updated.
- Verified:
  - scratchpad/uploader.mjs 17/17: label, dropzone geometry, list gap, item heights (88/68 with the File thumbnail), icon size/gap/inset, dash, focus, alert, Extended=No, the single-file flow with filechooser.
  - upexamples: the photo is 32×32 r8; Replace opens the picker; Remove restores the button.
  - overlay/fileicons still pass; run-all 25/25; build and usage:check pass.
- Uploader guideline (after the peer's Figma sync): extended prop, single-file behaviour, and rule uploader/no-noop-replace (warn). 91 rules.
- 2026-09-27: the fork's QA audit added 6 rules and extended button/filter-is-chip; the peer added surface/no-shadow-on-tinted. The harness now has 99 rules. selftest, usage:check, guidelines:check and tsc pass (verified by this session).

## 2026-09-27 — House rule §9: no drop shadow on Subtle / Pale / Surface-Alt

- The user's rule is that a Subtle, Pale or Surface-Alt background never has a shadow. The user confirmed the scope: outer drop shadows only, applied even where Figma adds one. Inset effects (Effect/Input on fields, the kbd bottom edge) and 0 0 0 Npx rings stay.
- Found (scratchpad/shadowscan.mjs static, shadowrt*.mjs runtime across neutral-s1/s2/s3, brand-s2 and brand-s1 dark; colour collisions were excluded by checking token names):
  - Checkbox/Radio unselected (Checkbox/Background/Unselected = Neutral/Pale in all themes, Figma Shadow/Action/Basic).
  - Chip Primary/Secondary unselected (Neutral/Subtle in s2/brand-s2), Chip Secondary selected (Active/Neutral/Subtle in s3).
  - Button Tertiary (Neutral/Subtle in s2/brand-s2).
  - Tag State=Error (Negative/Subtle, Figma Shadow/Action/Tertiary).
  - Sidebar background="alt" (Surface/Alt + Shadow/Bottom/Level-1).
  - Platform phone canvas="alt".
- Theme-aware mechanism (scripts/build-tokens.mjs):
  - Every component background token that aliases a Subtle/Pale/Surface-Alt semantic token in a theme also gets `<token>-shadow-off: 0 0 #0000` in that theme block (85 declarations over 22 tokens).
  - Components write `box-shadow: var(<bg>-shadow-off, <shadow>)`.
- Code changes:
  - chip.css: `--zen-chip-shadow-off(-hover)` next to each background assignment, used for base and hover shadows.
  - button.css: tertiary shadow and hover guarded.
  - checkbox.css / radio-button.css: the unselected shadow is guarded (default + hover); checked states keep Shadow/Action/Basic.
  - tag.css: error sets `--zen-tag-shadow: 0 0 #0000`.
  - sidebar.css: alt surfaces set `box-shadow: none`.
  - platform.css: `.platform-phone[data-canvas=alt]` keeps only its Pale ring.
- Rule and harness:
  - docs/component-usage-rules.md §9.
  - `surface/no-shadow-on-tinted` (error) in tools/usage-guard/check-usage.mjs, with an `outerShadow()` helper that ignores inset, rings, empty or transparent layers and `-shadow-off` guards.
  - bad.css/good.css fixtures.
  - background-layers guideline Do/Don't.
  - Figma contract exceptions (fx, Select=No) in the checkbox/checkbox-mark/radio/radio-mark suites.
- Verified:
  - shadowthemes.mjs 5/5: the unselected checkbox has no shadow in any theme; the selected one keeps it; tertiary Button and Chip Secondary have a shadow in s1 (Ghost) and none in s2 (Subtle); Tag error has none.
  - The runtime rescan shows only colour collisions (Inverse/Solid, Canvas/Default, Container, Ghost/Hover).
  - run-all is green with the documented exceptions; build, tokens:check, styles:check and usage:check (99 rules, 0 §9 findings) pass; interaction suites pass.
- 2026-09-27: new rule navigation/back-chevron (error). All 11 arrow Backs in the platform and stories now use icon-chevron-left-line-medium. Added top-navigation and button guideline copy, a visual pair and §10 in component-usage-rules.md. 100 rules; selftest, check, guidelines and tsc pass.

## 2026-09-27 — Accurate mobile simulator (PlatformPhone)
- Devices: iPhone 15 390×844 (default), iPhone 15 Pro Max 430×932, iPad Air 820×1180. The device renders at real CSS size and scales as a whole (maxHeight: 844 in playgrounds, 720 in examples, plus stage width).
- OS layer at z 20, drawn over the app:
  - Figma Status-bar/IOS/Mobile (12013:39833): 50px, 21px top, time 17/22 semibold in the left 133, 124 island gap, exported cellular/wifi/battery SVGs;
  - Dynamic Island 125×37 @11;
  - home indicator 134×5 @8.
  - iPad: 24px bar, no island.
- Safe areas: the frame sets --zen-safe-area-top/-bottom (50/28; iPad 24/20). The peer switched TopNav, BottomNav, BottomSheet and the composer to var(--zen-safe-area-*, env(...)), so their backgrounds run under the status bar and indicator, with no separate transparent strip.
- platform.css: 34 old phone override lines replaced by one block. Inline overlays anchor to the device: the screen is position static and the sheet overlay sits at z 10 over the header. New `homeIndicator` tone prop.
- Verified: mobint 16/16, mob.mjs/phone.mjs 1512 + 390 with no errors or overflow, screenshots of the top-nav, bottom-nav (default/floating/glass), sheet (open) and chat phones.

## 2026-09-27 — Strict Figma parity: Chat, AI Chat, Top/Bottom Navigation, Bottom Sheet (size · spacing)
Every set was read from the live Figma file with read-only `use_figma` dumps covering layout, gap, padding, sizes, radius, fills, effects and text styles. The findings were fixed and then locked with a DOM measurement suite: scratchpad `mobparity.mjs`, 117 checks, run at 1440 and 390. Phone scale is divided out.

### Chat
- Thread and bubbles:
  - The text max is 220 (Mobile) / 516 (Desktop) through the new `ChatThread device`, replacing `min(80%,480)`.
  - Business bubbles: min width 66; Others get the Bubble-Chat-Others-Business fill and a 0 6 16 -4 shadow at 4%; You get 0 12 28 + 0 4 8 -4 at 8%.
  - Time: Others Neutral/Light; You 56% (was .72).
- File, call and photo cards:
  - File/Call: the text column is a fixed 32 box, so rows are 32/40 and cards 56/96 (they were 62/102).
  - Type=Others and non-missed calls use a Neutral **Subtle** Dock-Icon.
  - Business cards (context from ChatMessage): radius 16, business fill with the lift, and the time inside (size · time footer). Business call has no Call back button, per Figma.
  - Photos: a 260/400 square of radius-16 tiles, replacing one clipped radius-20 grid. 2 = two 160/240 tiles overlapping on the diagonal; 3 = one tall tile + two; "+N" is Heading/2 on Background/Overlay. Business photos sit in a Surface card (12 / r24) with the time.
- Reactions:
  - The status pill is 24 high with 16px emojis, sits on the bubble's bottom-right 16 below it on both sides, and uses the Figma shadow.
  - The picker (Reaction-Bar) is 48 high with padding 8/8/8/12, gap 15 and 28px emojis. Hover grows to 36; Selected sits on a 36 circle. There is a new optional `onMore` (Small Tertiary "+").
- Read list and time section:
  - Read list: a 16 row, and "+N" is a Small Neutral Subtle Badge.
  - Time section: 28 high (8/0), and the next message doesn't add 12 more.
- Composer: the field padding is 10/0/10/14, and the emoji is a flat 44 Nav-Action with a 24 icon at the field edge.
- Conversation list:
  - Rows use 16 side padding (List-Item 12/16).
  - The unread dot is a 12 fill with a 2px ring outside (it was 8 inside a 12 box).
  - Avatar-Group is 40 with two 28 avatars: top-right behind, bottom-left in front.

### AI Chat
- Block:
  - Say-Hi is the 44 logo + greeting in Heading/1 (was 32 / Heading/4), gap 16. There are 24 between Say-Hi and Contents, and Contents keep a gap of 16.
  - Suggestions are Chip/Normal Medium Secondary Leading-Icon (40).
- Field:
  - Long-Typing prompt box has padding 12 (+2) and sits 16 above the controls.
  - The model switch has no padding.
  - The placeholder is a truncating overlay (one line with an ellipsis), which fixes the 2-line wrap at 390 that the fork reported.

### Top Navigation
- H2 expand heading has padding 14.
- Leading gap is 16.
- Flat trailing actions sit 20 apart.
- padding-top uses the safe-area var.

### Bottom Navigation
- Default has a 0 -1 0 hairline.
- Cells cap at 120 and centre; floating cells are at least 64.
- Floating bottom padding is the safe area only (no extra 12), with a 12px backdrop blur. The floating-glass fade is kept because it is in Figma (9017:42257).

### Bottom Sheet
- Size:
  - Height caps at min(720, 100%), Figma maxH.
  - The overlay top is safe-area + 12.
  - Bottom padding is the safe area only.
- Contents:
  - Action items: 24 icon with a 12 gap to the label.
  - Footer Large buttons are stretched to 56, as in Figma.

### Verification
- mobparity 117/117 at 1440 and 390.
- Peer mobint 16/16.
- newinteract and newpages.
- run-all: contracts and 25/25 interactions.
- usage:check (100 rules), selftest, guidelines:check, tsc, build.

The main peer updated the guideline copy for the size changes.

### Not done (for the user)
- Desktop hover actions beside bubbles and photos (Figma Hover / Actions) are not built.
- Focus states on the composer and AI field keep a focus background/ring. Figma's Focused variant only shows the caret.
- Spacing between runs (16 / 4 within a run) has no Figma screen to check against.
- Guideline copy synced with the peer's Figma parity pass for AI Chat (Block Heading/1 + Chip suggestions, field Long-Typing), Chat (business cards, reaction pill, time section, composer, list padding), TopNav rhythm and BottomNav hairline.
- AI Chat thinking indicator (per the user): AiChatBubble `thinking` / `thinkingLabel` shows three 8px dots in a looping wave (1.2s cycle, 150ms stagger, rising 4px and brightening). It also shows automatically for `streaming` with no text yet. Reduced motion keeps only the staggered fade. Rendered as role=status with aria-busy on the bubble. The playground and examples use it instead of the "Thinking"/"Working on it" text. The ai-chat/no-actions-while-streaming rule now covers `thinking`. Guideline api/do/a11y updated. Verified the wave samples (Δy 4px, opacity .35→1) in both motion modes.

## 2026-09-27 — Fix: Chat File/Call text cropped
- Cause: `.zen-chat-file__text` is a fixed 32px column (Figma Message-Text), but name 20 + gap 2 + size 16 = 38. The flex children shrank to fit, and the name, which has overflow:hidden, was squeezed to 14px, cropping its glyphs.
- Fix: `.zen-chat-file__text > * { flex: none; }`. The lines keep their line-height and overflow the 32 box evenly, as in Figma (-3/+3).
- mobparity now checks that no File/Call line is shorter than its line-height (Social and Business): 119/119 at 1440 and 390. usage:check and build are green.
- Segmented fullWidth (per the user): new prop. Items flex 1 1 0 and labels ellipsize. A Segmented in the TopNavigation control bar always spans. Playground has a 'Full width' toggle. Harness segmented/control-bar-full-width (warn) covers TopNavigation controlBar and BottomSheet. Guideline api/do added (101 rules). Verified: 3 equal items across the bar.
- Phone simulator bezel (per the user): a black glass bezel (12px #050505), a 1.5px titanium frame and a hairline edge, drawn as box-shadow rings with fixed hardware colours (zen-allow-raw-colour) so they're identical in light and dark. No drop shadow. Scale accounts for the 16px bezel margin; no overflow at 390.
- Glass over media (per the user: white band under the nav): BottomNavigation gains `backdrop` ("surface" = Figma fade, default · "none" = progressive blur only). The media example uses backdrop="none". PlatformPhone media screens now fill edge to edge (padding-block 0, specificity-raised over the floating-footer reserve) on a device-black canvas. Guideline api/do/dont added.

## 2026-09-27 — Mobile examples: longer content + real photos / video
- Media (user-approved download):
  - `src/assets/media/`, 2.4 MB: 16 WebP photos from Unsplash via picsum.photos (Unsplash License) and one public-domain NPS Grand Canyon timelapse, cut to 8 s portrait/landscape VP9 loops with posters. The letterbox was cropped and the clips re-encoded in Chromium because there is no ffmpeg.
  - Sources and licences are in `CREDITS.md`. The Figma file has no photo assets.
- `src/platform/PlatformMedia.tsx`:
  - `platformMedia` (viewer, mountainRoad, site×6, feed×8, canyonPortrait/Landscape).
  - `usePlatformVideo`: muted loop; waits on the poster under reduced motion.
  - `PlatformPhoneMedia`: full-bleed photo, or video with a Pause/Play overlay button (WCAG 2.2.2).
  - `.platform-phone__media` no longer uses the gradient.
- Content:
  - `PlatformMobileData` gains 5 more people plus `mobileConversations`(22) / `mobileProjects`(14) / `mobileFiles`(16) / `mobileTasks`(14) / `mobileInbox`(20) / `mobileSettings`(16).
  - Every phone example now scrolls: inbox, profile (tasks + photo feed), files, tab screens, floating feed, labelled list, share/filter/task/settings/checkout pages, and seeded chat histories.
  - The chat photo grid uses real site photos.
  - The Button "Media card" is a real video: Play/Pause preview toggles it, with a light edge scrim.
  - "Checkout footer" has 8 items plus delivery/payment.
- Peers:
  - The main peer added BottomNavigation `backdrop="none"` and edge-to-edge media phones.
  - The fork added the progressive bottom blur.
  - ScreenList (playground) had already been lengthened by a peer and was kept.
- Verified:
  - scratchpad `scrollmedia.mjs` 250/250: every non-media phone scrolls by more than 80px, all images load, videos load with posters, the glass video autoplays (and stays paused under reduced motion), no gradient media, no overflow or page errors, at 1440 and 390.
  - mobparity 119/119: the blur check now counts the 5 progressive layers.
  - mobint 16/16: the scrim tap now clicks a visible scrim point; the old overlay.y+80 landed on the Platform topbar once the page scrolled.
  - contracts 25/25, usage 101 rules, guidelines:check, tsc, build.
- Not changed: the Tooltip "annotations" example keeps its gradient. It stands in for a UI mock, not media.
- Fix (user): the tags editable cell couldn't remove a tag. mousedown on × blurred the input, and onBlur committed and closed the editor before the click. The editor now keeps focus on mousedown inside the tags row, and onBlur ignores focus moving within the editor. Verified: × removes and the editor stays with the caret in the input; Enter and outside-click commit. Peer cellfocus 6/6 and openbtn 6/6 pass.

## 2026-09-27 — Desktop chat examples
- New file `src/platform/PlatformChatDesktopShowcases.tsx`, registered with `...chatDesktopExamples` at the end of the chat examples. The CSS is a `.pe-chat-desktop` block in platform.css. Three wide examples:
  - **Desktop messenger**: a 320px list pane (Heading/4, Search that filters, ChatConversationItem with unread/selected) beside the thread. The thread header has an avatar, presence, and call/video/details IconButtons with tooltips. The thread is `ChatThread device="desktop"` (516 text) and `ChatComposer device="desktop"`. Picking a chat marks it read; sending appends.
  - **Desktop support (Business)**: Canvas/Default window. Time sits inside bubbles and cards: a log ChatFile, and the overlapping-pair ChatPhotos card at 240/400. Sending triggers an auto-reply.
  - **Desktop group media**: 4+ grid (198 tiles/400), the overlapping pair from you, a missed video call with Call back, a finished outgoing call, a 5+ read list, and the ReactionPicker with `onMore` driving the pill.
- Below 760px the panes stack (list max 280, thread 600).
- Verified:
  - scratchpad `chatdesk.mjs` 35/35 at 1440 and 390: device=desktop, text max 516, bubbles wider than 220, grids 400/240/198, list 320, switch/search/send/auto-reply/picker, no overflow or errors.
  - usage 103 rules, guidelines, build, scroll/media 250/250, mobparity 119/119, mobint 16/16 (one earlier 15/16 was an HMR flake).
- Chat, per the user (Figma ◆ Social 4595:17280 + Chat/Bubble/Focused/*):
  - Call bubbles use the Figma solid glyphs (phone-incoming/outgoing/x · video-in/out/recorder-x). Red Solid only for an incoming missed call. Copy is "Audio call" / "Missed audio call", and a Small Secondary button reads Call Back / Call Again / Call back.
  - Hold to react: ChatMessage holdActions / onHoldAction / reaction / onReact / onMoreReactions.
    - Opens on a 450ms long press, right-click, or Shift+F10 / Menu / Enter. A long press doesn't trigger the card underneath.
    - The layer is Overlay 25% plus a full-screen blur. Inside a `[data-zen-overlay-root]` device it blurs the root's children with filter; on a page it uses backdrop-filter.
    - The bubble stays in place, with the Reaction-Bar 8px above (Figma order ❤ 😆 😲 😢 😡 👍 +) and a 240px Popover/Default menu 8px below. `chatHoldActions` others / you / call; Delete is Content/Negative/Light.
    - useModal handles the focus trap, Escape and focus return.
  - PlatformPhone is marked data-zen-overlay-root.
  - The "Hold to react" example replaces the picker demo, and the playground messages are holdable.
  - Harness chat/hold-delete-destructive (104 rules). Guideline api/do/dont/a11y and the keyboard map are updated.
  - Verified: hold.mjs 12/12 (long press, geometry, emoji, focus return, Shift+F10, Escape, right-click call menu, action, backdrop tap, short tap still acts); mobint 16/16.

## 2026-09-27 — Rule §11: Surface/Default on Canvas/Alt needs a border
- Why: canvas-alt and surface-default are the same colour in both modes (white / dark-neutral-2). The user first said "border or shadow", then "Bỏ vụ shadow đi", so only a closed border counts.
- Harness `layer/surface-on-canvas-alt-border` (error):
  - Flags a CSS rule that paints surface-default, sits nested under a selector in the same file that paints canvas-alt, and has no closed border. A closed border is an all-sides border/outline in a --zen-color-border-* token, or a 0 0 0 Npx ring.
  - Helpers `hasFrame`, `canvasAltPainters`. Fixtures bad/good. Selftest: 105 rules.
- `platform:audit` gets a new `surfaces` check (error), which also runs in playground variants:
  - Painters are read from the live stylesheets. It then walks every Surface/Default painter, finds the nearest painted ancestor, and flags the box if that ancestor is a Canvas/Alt painter of the same colour and the box has no border, outline or ring (on the box or its ::before/::after).
  - Nav bars are exempt, as are boxes under 40×24 and `[data-audit-skip-surface]`.
  - Positive control (scratchpad `surfctl.mjs`): in both light and dark, a shadow-only box and Card theme="shadow" are flagged; a ring box, surface-alt and Card theme="border" pass.
- Docs:
  - component-usage-rules.md §11.
  - background-layers guideline: use line, a Do and a Don't.
  - guidelines rebuilt.
- Memory: zen-surface-on-canvas-alt.
- Chat desktop (Sidebar session): ChatHoverActions (Figma Hover toolbar) and ChatAvatarGroup. The guideline API has 'Desktop hover' and 'Avatar group' rows plus a Do: one action list for hold and hover. hold.mjs and mobint are still green.

## 2026-09-27 — Input.tsx harness findings (component scan)
- `tooltip/focusable-trigger`: the label info trigger went from a span with tabIndex=0 and role img to a real `<button type="button">` with aria-label. `button.zen-input-label__tooltip` strips the UA chrome. Checked: 12×12, and the tooltip shows on focus.
- `button/secondary-justified` + `button/filter-is-chip` on the Autocomplete "Add": kept as is, because Figma Input/Autocomplete-Field (1241:5616) "Add Item" is Button/Main XSmall Secondary. Allowed with reasons (Figma-backed; it opens the add list, not a filter).
- `input/no-disabled` on NumberField → InputField: it forwards the consumer's prop, so this is allowed with a reason.
- `check-usage src/components/Input` is clean. Contracts 25/25, usage 107, tsc all pass.
- Harness scope (the fork proposed it, harness owner applied it): usage:check now also scans src/components/**/*.tsx (not stories) — 116 files. The scanner skips JSX quoted in block comments (JSDoc), and tooltip/focusable-trigger accepts tabIndex={0} or role=button triggers. Justified allows: Chat hover toolbar (Figma Icon-Flat Small Secondary; menus, not filters), Chip's controlled Popover (Chip owns dismissal). The Autocomplete Add allow cites Figma 1241:5616 (Secondary XSmall). Clean at 107 rules.
- Chat desktop React (per the user): the React button shows only the Chat/Reaction-Bar. The Popover supplies anchoring and outside-click; its chrome is stripped (width max-content, no padding/label/bg/outline), so the bar isn't clipped at 240. Focus goes to the bar and returns to React; Escape closes. The open row stacks above the next messages (z 5). The Reaction-Bar carries the Effect/Popover backdrop blur itself. Verified: rp7 (focus, react, close, outside click); hold.mjs 12/12.
- Reaction-Bar '+' (per the user): it always renders (Figma). Without onMore it opens the built-in ChatEmojiPicker panel (Reaction-Bar surface, search, 8×36px grid, arrow keys), in both the desktop React popover and the mobile hold layer. ChatReactionKind now also accepts any emoji (chatReactionGlyph); a picked custom emoji shows as selected in the bar. The hold layer re-places on resize (ResizeObserver) so the taller panel stays on screen. Desktop hovered rows stack above neighbours so the toolbar stays clickable. The demo's placeholder onMoreReactions is removed. Guideline and keyboard map updated. Verified: plus.mjs (8/8 behaviours), hold.mjs 12/12.
- Reply spacing (per the user, Messenger reference): caption→quote 4 with caption inset 12 (aligned to the quote text); the quote shows its text with 8 above and below, and the reply bubble tucks exactly over the extra 12 (margin −(12+4 stack gap)); a reply turn starts 16 below the previous message (specificity above the same-side run rule); the composer bar spans the composer top with the hairline above (not between it and the field), text at 16, ✕ aligned with the last action, no leading glyph. Checks: replyflow OK, chatdesk 35/35, mobparity 119/119, usage clean. Guideline Reply row added.

## 2026-09-27 — Example cards equal height (no stepped layout)
- Before: `.pe-grid` used align-items:start, and 71 of 77 two-card rows had different card/stage heights (up to Δ200px, e.g. Side Panel, Rating, Metric).
- Fix in platform.css plus ExampleCard:
  - `.pe-grid` is align-items:stretch.
  - `.pe-grid > .pe-card { grid-row: span 3; grid-template-rows: subgrid; row-gap: 0 }`, so head, stage and code share tracks across the row: titles, stages and cards line up even when the descriptions differ in length.
  - ExampleCard wraps children in `.pe-card__preview` (a block), and the stage is a flex column with justify-content:center. The preview is centred, and the example's own layout is unchanged (no stretched buttons).
- Verified:
  - scratchpad rows.mjs: 0/77 ragged.
  - platform:audit: 98 page runs with no error-level findings.
  - chatdesk 35/35 (search probe now "gia", since the fork changed the messenger's people).
  - mobparity 119/119 at 1440 and 390.
  - usage (109 rules) and build.
  - scrollmedia 248/250: the 2 failures are the fork's new "Hold to react" phone, which doesn't scroll; reported to them.

## 2026-09-27 — Fix: Chip "Mobile filter row" → Sort opened a stray empty Popover
- Symptom: tapping Sort opened the Action Bottom Sheet, and a white 199×7 bar (an empty `.zen-popover`, z 30) floated above the scrim under the chip row.
- Cause: in Chip.tsx, `canOpenPopover` was true for `dropdown` alone, so any Advanced chip with a chevron owned an (empty) Popover, even when it opens an external surface. The chip also overwrote the caller's aria-haspopup="dialog" with "listbox".
- Fix:
  - A Chip owns a Popover only with `popoverItems` or `onPopoverCreate`; `dropdown` is just the chevron.
  - When the chip has no own popover, aria-haspopup / aria-expanded fall through from the caller.
  - The example passes `aria-expanded={sheet}` and `popoverOpen={sheet}` (chevron flips); the code sample too.
  - Chip guideline API rows added.
- Verified:
  - Open shows the sheet only, with 0 popovers.
  - aria-haspopup="dialog" is kept; expanded goes true then false.
  - Choosing Distance re-sorts and closes the sheet.
  - Chip contracts: Advanced 1716, Normal 3528, Number-only 672, Trailing 72.
  - Interactions 23/23 (chip filters and playground).
  - Contracts 25/25, usage 109, guidelines, tsc, build.

## 2026-09-27 — Basic UI slips: Search padding, SidePanel avatar, new audit checks (edges · sizes · smoke)
The user asked to fix Search padding/spacing and said: "Từ nay về sau tôi không muốn thấy các lỗi cơ bản UI như này nữa".

### Fixes
- Search examples:
  - "Search with scope": dropped `List inset="none"`, whose rows sat 0px from the white list edge.
  - "Search with live results": rebuilt from List/ListItem with leading icons instead of ad-hoc `.pe-result` buttons, so the label and rows align. Removed `.pe-results`/`.pe-result` CSS.
  - "Icon picker": follows the Popover surface (padding 4, gap 4), and the "Selected" line has item padding 8.
- Toast "Undo delete": dropped `inset="none"`.
- SidePanel: `.zen-side-panel__body > *` no longer forces width:100% on fixed-size visuals (avatar, dock/file icon, icon, badge, tag, button, chip, media). That rule stretched the "Row details" Avatar to 376×56.
- Stage list rule: `.pe-card__stage .zen-list` (white card) now skips lists inside sheet, popover, panel, dialog or card. Painting them white made their inset-0 rows touch the edge (Bottom Sheet "Full-height with search", the Chat reactions list).
- Desktop chat at ≤620px: the `.pe-chat-desktop` window keeps min-width 560 and scrolls inside its stage (the Sidebar-shell policy). Before, at 278px the header, reaction bar and composer squeezed and broke.

### Audit (tools/platform-audit/audit.mjs), all error level
- `edges`: text must sit at least 8px from the sides and 4px from the top/bottom of the box that visibly holds it.
  - The box is the nearest ancestor whose composited colour differs from what's behind it, or one with a closed frame.
  - Only the visible part of truncated text counts.
  - Controls are skipped.
- `sizes`: Avatar (declared px size) / DockIcon / Icon must be square and at their declared size.
- `surfaces`: §11.
- With `--smoke`, sizes/edges also run after every example click, so dialogs, panels, sheets and popovers are covered.
- Positive controls:
  - edgectl: inset-0 list 0px and popover text 4px are caught; a padded box passes.
  - sizectl: the old SidePanel rule gives 376×56, which is caught.
- False positives fixed: truncated icon names and typography samples (now clipped to their overflow box); Avatar `--zen-avatar-size: 100%` in Popover slots (only px counts).

### Process
- docs/qa/platform-audit.md table gains edges/surfaces/sizes rows.
- skills/zen-platform-qa/SKILL.md makes them required.
- The QA memory now says basic UI slips must never reach a report.
- Peers are notified.

## 2026-09-28 — Component Size (density): fixed sizes and wrappers that didn't grow
The user reported components stuck at a fixed size when switching Component Size, e.g. Popover Item, which has no size of its own but must grow with its content.
Method: scratchpad scans that flip `.official-platform` (and the portal root) Compact ↔ Comfortable on every page and every opened popover:
- densfix2: component sizes that don't change.
- densclip: wrappers smaller than their content only in Comfortable.
- leftover: stuck icons and avatars.

### Root causes fixed
- **Icon size aliases:**
  - `icon.css` declared `--zen-icon-size-*: var(--zen-element-size-popular-*)` on `:root` only. A custom property resolves where it is declared, so every named icon size stayed at the root density.
  - Now on `:root, [data-density]`, which fixes every `size="sm"`/`"xs"`… icon (Pricing checks, the Checkbox check, …).
- **Popover Item:**
  - `.zen-popover__items` is a grid capped at 240px, and the item has `min-height: 36px`, so the grid squeezed rows. Chip avatar items rendered at 45px instead of 54 (Compact) / 56 (Comfortable).
  - `grid-auto-rows: max-content`: rows hug their item and the list scrolls.
- **Numeric px sizes changed to tokens:**
  - Uploader, list-item and tooltip FileIcons use `size="xl"` (36 → 40).
  - Chat conversation preview and reply icons: `sm`. Failed / reply caption icons: `xs`.
  - Sidebar default workspace mark: `lg`.
  - Button "Empty state" example icon: `var(--zen-image-size-small)`.
- **Hardcoded px boxes changed to tokens:**
  - Chat read-list row: `calc(image-size-2-xsmall − 4px)`.
  - Chat avatar-group: `image-size-medium` box with avatars at 70%.
  - AI Chat model chevron (element-size base) and logo (2-xlarge).
  - EmptyState icon (2-xlarge).
  - InlineMessage custom icon (xlarge).
  - Chat emoji-search icon (small).
  - Sidebar trailing-action and workspace-action slots (base).

### Deliberately fixed
- Mobile Top/Bottom Nav, Bottom Sheet and the Chat mobile composer (Figma mobile specs, no density tokens).
- 2xs buttons (the token is 24/24).
- Radio inner dot, Progress-circle and Slider icons (2xs / own vars).
- The EmptyState illustration.
- Hit-area slots where the button is intentionally larger than the icon slot: Card sub-action, Sidebar section/workspace action.

### Verified
- Compact is unchanged:
  - figma-contract run-all: contracts + 25/25 interactions.
  - mobparity 114/114 at 1440 and 390; the stale always-rendered picker checks were made conditional.
  - chatdesk 33/33.
- Comfortable: no remaining stuck icon/avatar outside the deliberate list.
- tsc, usage (135 rules), and platform:audit on 13 touched pages × 2 widths are clean.

## 2026-09-28 — CHANGELOG + handoff for new sessions
The user wanted a changelog, plus a saved log that a new session reads to pick up the context.
- New `CHANGELOG.md` (Keep a Changelog):
  - `[0.3.0] — Unreleased` is the uncommitted work since `eafb0de`.
  - `[0.2.0]` comes from git.
  - Maintenance rules are at the top of the file.
- New `docs/context/HANDOFF.md`, a short read-first file:
  - reading order;
  - version and commit state, dev server (IPv6 only);
  - gates;
  - the house rules that are easy to miss;
  - owners of shared areas;
  - open items.
- `AGENTS.md`: a pointer to both files near the top. "Working alongside other sessions" now also asks for a CHANGELOG
  line and a HANDOFF update.

## 2026-09-28 — Full screen for desktop-screen examples; QA process run over all examples
The user asked to re-check component examples with the QA process, and wanted examples that are one desktop screen to have a full-screen view.

### Full screen
- `ExampleCard` (PlatformShowcases.tsx) has a new `screen` prop, plus `screen?: boolean` on every `ExampleDef`, including appLayer/types.ts. It adds a "Full screen" button (xs tertiary, icon-maximize-01) next to Code.
- In full screen:
  - The card is `position: fixed; inset: 0; z-index: 25`: above the topbar (20), below portal overlays (Popover 30, dialogs/tooltips 1000).
  - It gets role=dialog, named by the card title. The description is hidden and Code still works.
  - Every ancestor's siblings are `inert`, except the platform portal root.
  - `html` gets overflow hidden and overflow-anchor none.
  - Exit ("Exit full screen", or Escape) restores inert, overflow and scroll (again in a rAF), and returns focus to the "Full screen" button.
  - Escape is ignored while a popover, submenu, aria-modal, menu or listbox is open, and while focus is in a field or table cell.
- CSS (`platform.css`, after `.pe-card__code`):
  - `.pe-card__actions`.
  - Full-screen rules. Frames that scroll inside (`.pe-shell--tall`, `.pe-chat-desktop`, `.patpl-frame`, `.pash-frame`, `.pe-panel-shell`) get `flex: 1 1 0; height: auto !important; min-height: 480px`. `!important` beats the inline height of `.pash-frame`.
- Flagged screens (20):
  - Sidebar ×4
  - desktop chat ×4 (messenger, business, group media, reply)
  - SidePanel "Docked inspector"
  - Typography "Master/Child page · desktop"
  - App Shell "Admin app", "Drawer below 1024px", "Flat canvas"
  - the desktop templates ×6 (`screen: !template.mobile`)
- The pattern is written up in docs/guides/example-patterns.md §3. The appLayer owner was notified.
- Verified with scratchpad `fullscreen.mjs`, 532/532 at 1440 and 390, on every flagged card:
  - The card covers the viewport and is on top. The screen fills the stage.
  - Focus lands on Exit, the dialog is named, the background is inert and scroll is locked.
  - Escape exits, scroll and focus return, and inert and overflow are cleaned up.
  - Non-screen cards have no button.
  - The Sidebar flyout opens on top in full screen, and the first Escape closes only the flyout.
  - The template chip Popover sits above the card.
  - No page errors.
- Note for tests: Playwright's `click()` re-scrolls the page before clicking, so the scroll check clicks through the DOM.
- The screenshots (1440) were checked by eye.
- Known: at 390 a desktop shell is still cramped (the Sidebar flyout is clipped by `.pe-shell`), the same as outside full screen.

### QA process (`npm run qa -- --all`) over every example: findings fixed
The first run (61 pages) found 197 runtime errors and 16 behaviour errors. After the fixes, a rerun of the 23 affected pages found 0 errors. Only one accepted item remains, now in the baseline.
- **Type scale.** Unstyled `pe-text` in the mobile examples (photo feed, section labels, prices, storage, vote status) now carries text styles.
  - Popover bulk text is Body/Extra/Regular and its notes are Body/Small/Regular.
  - The Tooltip truncate buttons are Body/Base/Medium.
  - The skip-link site nav uses `zen-type-body-small-medium` (appLayer/content.tsx).
  - The outline tags are Body/Code/Bold; their font was a missing `--zen-typography-font-family-code` that fell back to ui-monospace.
  - The Slider reading-size preview is `data-audit-skip-type`, because its size is set on purpose.
- **Spacing scale.**
  - Pricing price gap 6 → 2XSmall.
  - Radio row padding 10 → Padding/Small.
  - The floating-nav room (112 / 96 px padding) became a `::after` spacer (`.pe-floating-room`, `.pe-phone-feed[data-bottom-room]`).
- **Density at 390.**
  - Pagination on phones: column-gap is 2XSmall and the "…" gaps take the XSmall item width, so Comfortable keeps one line.
  - The AI bubble actions wrap.
  - Playground previews inset 16 + 16 at ≤620.
  - Shell inbox rows put the time over the New badge (`.pe-inbox-meta`); `.pe-shell__main` padding is Medium at ≤620.
- **Behaviour.**
  - `useModal`:
    - The Tab trap counts only real stops (tabIndex ≥ 0, visible, not inert or hidden), so roving tabs no longer let focus escape.
    - Initial focus skips disabled targets.
    - Dialog now prefers fields, then Primary, so "Invite teammates" focuses the email field.
  - The AppShell drawer (aria-modal) traps Tab.
  - The TOC ↑/↓ no longer fires inside `.pe-card__stage`, `.platform-example-panel` or `[aria-haspopup]`.
  - Chat:
    - Hover React/More and the desktop bubble use `aria-haspopup="listbox"`, and the mobile hold trigger uses "dialog".
    - Closing React/More returns focus to the trigger (or the bubble) unless focus moved elsewhere.
  - A selected Popover item shows Flat/Pressed on focus-visible.
  - The Admin list template row menu gained "Copy email", so the Owner row has an enabled item.
- **Headings.** Shell example titles are real headings (h4 Heading/3, h5 Heading/4); the "styled heading but not a heading" warnings are gone.
- **Accepted.** Sidebar Small-Density "Kaiz" is 10/13.3: Figma's 5/6 scale. It was added to `tools/platform-audit/quality-baseline.json` with `--baseline-update --pages=sidebar`.
- **Still open.**
  - Coverage warnings: many pages lack a mobile, states or edge-case example.
  - Warn-level dead clicks and contrast.
  - The qa ledger shows "0 file(s)" for this session, so static style-guard and figma-contract were run by hand (clean, 0 ✗).

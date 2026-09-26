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

# Zen Studio — Design panel UI3 (2026-10-06)

User (2026-10-06): the Design properties "are not design friendly: many text sizes, and controls that should show only
appear after a click (Set fixed value)". Refactor the Design panel's UI/UX after Lunagraph ("the Studio will work like
it"), add dividers between property sections, make the Design/Code and Pages/Layers/Assets tabs like Figma, and keep the
height (the Lunagraph 26px rows look cramped).

## What Lunagraph does (measured on lunagraph.com, 2026-10-06)

- Right panel: tabs **Styles · Props · Code** — text tabs 11px, the selected one on a quiet grey fill (radius 5), no
  underline; a hairline under the tab row.
- **One text size** for everything (section titles, labels, values: 11px regular); tones only (ink, muted, placeholder).
- Every section is a block with a **1px divider** under it; a title row (title left, icon actions right).
- Controls are always visible: fields 26px, white on the panel's grey, labels/units inside the field (W, H, px).
- **Props tab**: the component name, then one row per prop — the prop's name (left ~40%), its control (right): a select
  for an enum, a number field with an icon, a small switch for a boolean.

## Decisions (user, 2026-10-06)

| Question | Choice |
| --- | --- |
| A value bound to code (`{kind.name}`) | **Edit in place**: the control shows what it renders, with a ƒ after the label; an edit writes a fixed value (all rows of a `.map`), ↺ Restore brings the binding back; data-backed values edit their data; state-bound values stay read-only (keep-behaviour rule) |
| Groups for a component without Figma groups | **By prop name/type** (`autoGroups.ts`): Appearance · Content · Icon · State · Actions · More, one section each with a divider; an object prop (Trend) is a section of its own; ≤ 5 props stay one "Properties" list |
| Header (Type / Docs / Used in / Repeats + Detach / Remove buttons with captions) | **Compact**: name + ×N + Detach/Remove icons on one row; kind · Docs link; file:line + copy |
| Height | Keep the Zen Small control height (32px) and the row/section spacing; only the text gets smaller |

## What changed

- **One text size:** every line in the Inspector (right panel) is Body/Small (12px): section titles Body/Small/Bold,
  labels and notes Body/Small/Regular, values Body/Small/Medium, Small button labels Button-Label/XS. Caption (11px) and
  Body/Base (14px) are gone from the panel's components (Inspector, Position, Appearance, Sizing, Slots, Mixed).
- **Controls always show:** `PropField` renders the control for a bound value (fixable or data-editable) with its live
  value; "Bound to {…}" + "Set fixed value" + caption lines are gone. Read-only values (state-bound, a literal with no
  editor, "Not set", `{…}`) sit in a field's frame (`StaticField`), so the column reads the same. The icon picker wears
  a field's frame ("None" when empty); an unset slot (node) field says "None".
- **ƒ binding mark** (`BoundMark` in `Section.tsx`): Info tone, code font, after the label; its tooltip and screen-reader
  text name the expression and what an edit does.
- **Sections:** Properties split by `autoGroups.ts` (labels inside a group drop the group's word: "Icon size" → "Size");
  each object prop is its own section; the "Values bound to {…}…" note is gone.
- **Header:** `DetachAction` / `RemoveAction` take `compact` (an xs IconButton; the reason it cannot run yet is its
  tooltip, and a press shows it in the status line).
- **Tabs:** Inspector and left panel `Tabs variant="subtle"` (Figma UI3), labels Body/Small, a Pale line under the bar.
- E2E I-11 now checks the control (no "Set fixed value" button) and the read-only state condition.

## Not done (Backlog if wanted)

- Inline field labels/units like Figma (W/H inside the field) for Layout and Position (already partly there).
- A ƒ inside the field instead of after the label; a "detach binding" action separate from editing.
- The left panel's own rows (Layers/Pages) at one text size.

# Zen DS component usage rules

These cross-component rules apply to every example, playground, template and product screen built with Zen DS. Per-component Do/Don't guidelines live in [`docs/guidelines/`](guidelines/README.md), which is generated from `tools/usage-guard/guidelines.source.mjs`.

**Harness:**
- `npm run usage:check` enforces the machine-checkable rules on `src/platform`.
- `npm run usage:rules` lists the rules as JSON.
- `npm run usage:selftest` proves each rule fires on `fixtures/bad.tsx` and stays quiet on `fixtures/good.tsx`.
- `npm run guidelines:check` fails when the generated guidelines are stale.

## Definition of done for a component

A component is finished only when:
1. It matches Figma.
2. It has a guideline entry (purpose, when to use / not, Figma→React, Do, Don't, accessibility, content, references).
3. Every detectable Do/Don't is a harness rule, with fixtures, and the self-test passes.

See `skills/zen-component-usage/SKILL.md`.

## 1. Button hierarchy

| Level | Use it for | Frequency |
| --- | --- | --- |
| **Primary** | The one main CTA of a surface (Save, Publish, Create account). | Common |
| **Tertiary** | Everything else: Cancel, Undo, Reset, toolbar actions, "Mark all as read". | **Most common** |
| **Secondary** | A secondary highlight: an action that must stay visible but is *not* the main CTA (e.g. a pressed toggle in a toolbar). | Rare |
| **Accent** | A **promoted** CTA: upsell, marketing or onboarding moments that need extra pull. | Rare |
| Danger / Danger-Subtle | Destructive actions (Delete, Discard). | As needed |

- Default pairing is **Tertiary + Primary** (dialogs, forms, cards).
- Secondary needs a reason. In code, add `zen-allow-secondary: <reason>` in a comment right above the element, or the harness fails.

## 2. Filters are chips, never buttons

Any control that chooses a filter, sort order, scope, status, owner or period is a **Chip (variant="advanced")** with `popoverItems`. Do not use a Button (of any level) or a Segmented control for this.

- Single choice: `dropdown`, `select={Boolean(value)}`, `onClearSelection`.
- Multiple choice: `selectionMode="multiple"`, `selectionCount`, `popoverMultiple`.
- Segmented is for switching **views/sections** (grid ↔ list, Inbox ↔ Mentions), not for filtering data.

## 3. Inputs: Read-only instead of Disabled

- Text, Select, Date, Number, Text-Area, Autocomplete, Rich-Text and Heading inputs expose **Read-only** only. Read-only shows the committed value, drops the fill, and uses a 1px `Border/Neutral/Subtle` border with `Neutral/Strongest` text.
- **Search** is the only input with a Disabled state.
- Read-only Select and Date keep their chevron and calendar affordances but never open. Read-only Number hides its steppers.

## 4. Popover items with a caption

- A captioned item never uses the 20px avatar. `theme: "avatar-small"` with a `caption` renders **Avatar Small (32px)**, centred on both lines. `PopoverItem` enforces this automatically when you pass `photoSrc`.
- Pass images through `photoSrc`/`photoAlt` rather than your own `<Avatar>` or `<img>`. The item then picks the Figma size for each theme: Avatar Small 20/32, Avatar Big 40, Photo Small 20, Photo Big 32.

## 5. Badge

- The remove affordance is `icon-x-circle-solid` (12px on XSmall/Small, 16px on Medium), wired through `remove` + `onRemove`.

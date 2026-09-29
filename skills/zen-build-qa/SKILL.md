---
name: zen-build-qa
description: Build → QA → Deliver process for Zen DS components, playgrounds, examples and templates. Use whenever you build or change anything under src/components, src/platform or src/templates, and before you report UI work as done. Plan tokens and hierarchy first, let the instant checks catch drift while you build, run `npm run qa`, look at the screenshots the gate asks for with the UX rubric, and deliver with the QA summary.
---

# Zen Build → QA → Deliver

Every component, playground and example must be right on six axes: **spacing** (padding, gap), **corner radius**,
**tokens in the right role**, **style** (layers, borders, effects), **typography and content hierarchy**, and
**function + UX**. This skill is the order of work. Tools do the measuring; you do the planning and the looking.
How much of it a change needs is set by its tier: the **Pick your tier** table in `AGENTS.md` §C.

The machinery (see `docs/qa/build-qa-process.md` for details and the Vietnamese write-up for the team):

| When | What runs | Who |
| --- | --- | --- |
| After every Edit/Write of a UI file | style-guard + usage-guard on that file; new errors come back to you at once | PostToolUse hook |
| While iterating | `npm run qa:quick` (static + audit at 1512) | you |
| Before delivering | `npm run qa` (static, runtime quality, dark, Comfortable density, behaviour, coverage, screenshots) | you |
| When you try to finish | blocks if UI files changed since the last passing full run, or the sheets it asks for were not opened; while your own `npm run qa` is still running it prints one note and lets you stop | Stop hook |

## 1. Plan before you build (spec card)

Before writing code for a new component, a new example or a visible change, decide these and write them down (in
the reply for a big piece of work, otherwise in your notes). Most "not standard" results come from skipping this.
Whether you need a card, and for which elements, follows your tier (`AGENTS.md` §C).

1. **Source:** exact Figma node (live file `9nZv4uW2LT21yuHabMTCh1`) and mode. Read tokens from the node; never guess.
2. **Anatomy table** — one row per element:

   | Element | Padding / gap token | Radius token | Text style + tone | Background / border / content roles | Effect | States |
   | --- | --- | --- | --- | --- | --- | --- |

3. **Hierarchy plan:** page type (master/child, desktop/phone, overlay) → which text is h1/h2/h3, which is body, meta,
   value. One entry point per surface.
4. **Interaction plan:** the WAI-ARIA APG pattern (button, tabs, menu button, dialog, listbox, disclosure…), the keyboard
   map, focus order and where focus goes when things open and close.
5. **States:** default, hover, pressed, focus-visible, selected, disabled or read-only, error, loading, empty, success —
   mark each "applies / n.a. (why)".
6. **Responsive + modes:** 1512 / 1024 / 390, Compact ↔ Comfortable, radius modes, dark.
7. **Examples matrix** (`docs/guides/example-patterns.md` §1): main use case, states, composition, edge cases, mobile in
   `PlatformPhone`, keyboard/a11y.

### Token rules that go wrong most

- **Spacing.** Insets use `--zen-spacing-padding-*` (2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48), space between
  items `--zen-spacing-gap-*` (2 · 4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 88 · 144). Raw px is wrong even when the
  number matches: tokens follow Component Size. ±1px border compensation is fine. List rows take their inset from
  `<List inset>`; never pad a row twice (container padding + row padding). Card/modal padding comes from
  `--zen-card-padding-*` / `--zen-modal-padding` (they change per breakpoint).
- **Radius.** Containers use `--zen-corner-radius-{2-xsmall … xgiant}`; controls `--zen-corner-radius-action-<size>`;
  fields `--zen-corner-radius-input-<size>`; circles `--zen-corner-radius-rounded`. Radius modes (Rounded, Smooth,
  Standard, Luxury) only work through tokens. **Concentric corners:** outer radius = inner radius + inset (list card:
  Padding/2XSmall + Corner-Radius/XLarge around Large rows).
- **Colour roles.** Text and icons use `Color/Content/*`: neutral Strongest / Base / Light = primary / secondary /
  tertiary; colour families use Strongest/Base for text on their Subtle fill and Light only for highlights; the Lights
  group (Accent, Warning, Support/Yellow) never uses Light for text. Fills use `Color/Background/*` by layer: Canvas
  (page only) → Surface (cards) → component fills → Container (modal, sheet) → Popover (floating). Closed borders: Pale
  when static, Subtle when actionable, dashed always Subtle. Text on Solid fills uses On-Colors.
- **Style / effects.** Shadows only from `--zen-style-*-shadow` tokens; never an outer drop shadow on a Subtle, Pale or
  Surface-Alt fill; floating unclipped surfaces use `*-shadow-unclipped`. Surface/Default on a Canvas/Alt page needs a
  closed border. Hover/pressed tints are translucent: over other content, lay them on an opaque Surface.
- **Typography.** Always a Figma text style: `<Text textStyle>` / `<Heading level textStyle>` or `.zen-type-*`, or the
  complete token set of one style (size + line height + tracking from the same style, weight from
  `--zen-emphasis-font-weight-*`). Never a raw size, a half style (size only), or a calc of a text token.
- **Content hierarchy.** h1 = Heading/1 = the page title, once. Desktop sections h2 Heading/4; card and widget titles h3
  Heading/Subheading; row titles Body/Base/Medium; meta Body/Small or Caption in a lighter tone; values (Display/4,
  Heading/2) are never headings; overlay titles are h2 (never Heading/1). Titles are Strongest. Emphasise with weight or
  tone, never by resizing; pick heading levels from the outline, not from the size. A title and its description must
  not look the same. Keep one example to 3–5 text styles.
- **Density.** A slot that holds a token-sized child (icon, avatar, thumbnail, checkbox mark) is sized with the same token
  or a calc of it, or Comfortable overflows it.
- **Composition.** Use the DS component for the pattern (List/ListItem, Card, Table, Divider, DockIcon, EmptyState,
  InlineMessage, Chip advanced for filters, BadgeCounter for counts) instead of `pe-*` markup.
- **Function / UX.** Every interaction the component supports works in every example (no `() => undefined`). Keyboard
  follows the APG pattern; focus is always visible; hover and pressed give feedback; destructive actions use Danger; copy
  names the outcome and counts use `plural()`; mobile uses the patterns in example-patterns §2.

## 2. While you build

- The PostToolUse hook lints each file you edit. A **blocking message is a bug report on the line you just wrote**: fix
  it now. When Figma truly requires a value off the scale, bind it to a component token; if that is impossible, put
  `/* zen-allow-<id>: <reason, cite the Figma node> */` directly above the line (ids: `npm run style:check -- --list`,
  `npm run usage:rules`). Never silence a rule to make the gate green.
- Warnings in the hook context need a decision, not a shrug: fix, or keep with a reason you will state on delivery.
- Run `npm run qa:quick` after a visible change for fast runtime feedback (text styles, hierarchy, token scale).
- Keep examples on DS components and tokens; grep `platform.css` before naming a new `pe-*` class.

## 3. Run the gate

```bash
npm run qa                        # scope = UI files this session edited since its last passing run (hook's ledger)
npm run qa -- --only=card,chip    # exactly these pages (ignores the pages inferred from the ledger)
npm run qa -- --pages=card        # add pages the mapping could not infer (it tells you when)
npm run qa -- --keep-going        # still run the browser steps when a static gate failed
npm run qa -- --all               # every page: tier L (AGENTS.md §C)
```

What the scope means:

- **Pages** come from edits made after the last passing run; after a pass, older edits and their notes stop counting.
- **Tokens** (`src/styles/tokens.css`, `tokens/source/**`, `src/tokens/**`): the gate diffs the changed custom
  properties against git HEAD, adds every `--zen-*` var that aliases them, finds the component and platform CSS that
  reads those names and checks those files' pages. It prints the consumer pages, or says none was found and falls back
  to the representative set. It asks for `--all` only for typography/spacing-scale sources, `src/components/_shared`
  and the platform shell.
- **Static gates** follow the change: harness self-tests only when `tools/usage-guard/**` or `tools/style-guard/**`
  changed; Figma contract suites only for the components you edited (all of them when `tools/figma-contract/**`
  changed); Vitest runs the tests related to the edited files (the full suite for `tests/**` or `_shared` edits, or
  when `related` is unsupported, which it says). Stale guidelines of a component you edited are rebuilt and reported
  "regenerated"; stale files of components you did not edit are a ⚠ naming them (another session's work). `--all`
  runs everything.
- **Fail fast:** a failing static gate skips the browser steps and names them; add `--keep-going` to run them anyway.

It prints ✗ / ⚠ per step and writes `.qa/reports/<stamp>.md`. Read the report, then fix at the owner:

| Finding | Fix |
| --- | --- |
| style-guard / usage-guard ✗ | the CSS/TSX line; tokens and components as in §1 |
| `scale` (runtime) | text without a Zen text style, example markup off the spacing/radius/colour tokens |
| `hierarchy` / `rhythm` | heading level and style, title vs description, visual headings, concentric corners, double inset |
| `density` | wrapper sized in px around a token-sized child |
| `fit` | text wider than its own box, no ellipsis, no scroll (it runs into its neighbours even under `overflow: hidden`): let the item keep its width (`flex-shrink: 0` / `min-width: auto`), wrap, ellipsize, or scroll the row |
| `edges`, `sizes`, `overflow`, `surfaces`, `outline`, `typography` | see `docs/qa/platform-audit.md` |
| behaviour ✗ | focus ring, keyboard reach, APG keys, dialog focus trap / Escape / focus return |
| coverage ⚠ (only pages whose examples you edited; other pages' known gaps are one summary line) | write one Backlog line (priority + pointer) in `docs/context/HANDOFF.md`; add the example only if it is in the approved task |

Pre-existing findings live in baselines (`tools/style-guard/baseline.json`, `tools/platform-audit/*-baseline.json`,
now including `contrast` and `targets`) and do not fail the gate. Triage NEW ⚠ only; pre-existing warnings are debt:
note them in the Backlog (Scope lock), do not fix them in this task. Baseline debt on a line or example you touch:
write one Backlog line (priority + pointer) in `docs/context/HANDOFF.md`; fix it and refresh the baseline
(`npm run style:check -- --baseline-update`, `audit.mjs … --quality --density --baseline-update`) only if it is in
the approved task — debt only shrinks.

## 4. Look at the screenshots (UX rubric)

Open the contact sheets the Stop gate asks for with Read: the sheets of the last passing run whose image differs
from every sheet you already reviewed this session, at most 12, pages whose own component or example files you edited
first, 390 before 1512. The rest are listed as optional; a sheet with the same hash as one you reviewed is never asked
for again. DOM checks cannot see these; go through each card:

1. **Hierarchy:** one obvious entry point; title > body > meta at a glance; nothing competes with the primary action.
2. **Rhythm:** related things closer than unrelated ones; consistent gaps inside a group; no cramped or doubled insets.
3. **Alignment:** shared left edges, CTAs on one line across cards, icons centred on the text line.
4. **Surfaces:** layers read right (page, card, overlay), borders and shadows by rule, corners concentric.
5. **States:** empty, error, loading, disabled/read-only, success look intentional and offer the next step.
6. **Copy:** real data, verbs that name outcomes, correct plurals, no clipped or orphaned words.
7. **Affordance:** clickable things look clickable; destructive looks destructive; selected looks selected.
8. **Mobile (390):** thumb-reachable primary action, footer CTA `lg` full width, safe areas, back chevron, ≥ 24px targets.
9. **Comfortable + dark:** nothing clipped or overlapping; no white box on white, no invisible border.

Open states the sheet does not show (a dialog, menu or sheet) with
`npm run platform:shoot -- <page> --title="…" --click="…"` (add `--width=390`). For a new component or a new set of
examples, also ask the `zen-ux-reviewer` agent for a fresh-eyes review of the sheets, then fix what it finds.

## 5. Fix loop

Fix, re-run `npm run qa` (it re-checks what you edited since the last pass; `--only=` narrows it), look at the sheets
it asks for. A bug class that could recur (a candidate style-guard, usage-guard or quality/behaviour rule): write one
Backlog line (priority + pointer) in `docs/context/HANDOFF.md`; do it only if it is in the approved task. Tell peer
sessions when you change something they own.

## 6. Deliver

Only after a passing full run and the screenshot review. The reply (in Vietnamese) contains:

1. What changed and why (files, pages).
2. The "Tóm tắt để báo cáo" block from the QA report, and which screenshots you reviewed.
3. Every NEW warning you kept, with the reason; Figma-side issues you found; the Backlog lines you added.
4. What you could not verify (say it plainly).

Then log it at the size your tier sets (`AGENTS.md` §C): `docs/context/session-log-<date>.md`, a CHANGELOG line
(Unreleased), and HANDOFF.md when the picture changes.

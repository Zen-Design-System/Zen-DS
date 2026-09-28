# Zen DS — guide for AI agents working in this repo

This repo is the Zen Design System: React 19 components generated from the Zen Figma library, the token/icon
pipelines, and the Codebase Platform (the docs site in `src/platform`). Two kinds of work happen here.

**New session? Read [`docs/context/HANDOFF.md`](docs/context/HANDOFF.md) first** (current state, open items, owners),
then [`CHANGELOG.md`](CHANGELOG.md).

## A. Building UI with Zen (examples, templates, apps)

Follow [`AGENTS.consumer.md`](AGENTS.consumer.md): setup, the 12 rules that go wrong most often, API facts, icons,
styling. Then, for each component you use:

1. `docs/guidelines/index.json` — pick by `purpose` / `use` / `avoid`; compact props per component.
2. `docs/guidelines/<slug>.md` — Do/Don't, Props, object Types, keyboard, a11y (generated; edit the source instead).
3. `docs/api/<slug>.json` — the props as JSON.

Inside the repo, import from the component folders (`../components/Button`), as the platform does. Platform
examples also follow `docs/guides/example-patterns.md` (coverage matrix, mobile patterns, copy) and are verified
with the QA loop below.

## B. Building or changing a component

- **Source of truth:** the live Figma file `9nZv4uW2LT21yuHabMTCh1` (the older key `yhWJ…` in some docs has no MCP
  access). Match node, tokens and states exactly; never invent a token. Skills: `skills/zen-figma-component-audit`.
- **Definition of done** (`docs/component-usage-rules.md`, skill `skills/zen-component-usage`):
  1. `src/components/<Name>/{Name.tsx, name.css, index.ts, Name.stories.tsx}`; JSDoc cites the Figma node and tokens.
  2. `export *` in `src/index.ts`.
  3. Platform: nav + page (`PlatformApp.tsx`, `PlatformExamples.tsx`), ≥ 4 examples (`PlatformShowcases.tsx`), 1–2 visual
     Do/Don't pairs (`PlatformGuidelineVisuals.tsx`), `.platform-*` CSS in `platform.css`.
  4. Guideline entry in `tools/usage-guard/guidelines.source.mjs` (+ JSX tags in `tagsFor` of `build-guidelines.mjs`).
  5. Harness rules in `tools/usage-guard/check-usage.mjs`, each with an `expect:` case in `fixtures/bad.tsx` and a
     clean case in `fixtures/good.tsx`.
  6. Props docs are generated from your TypeScript types and JSDoc (`scripts/build-api.mjs`): document every prop.
- **CSS:** colours, spacing and radii only through `--zen-*` tokens (raw values only as `var()` fallbacks); a removed
  focus outline needs a replacement ring; every animation has a `prefers-reduced-motion` fallback.
- **Deliberate exceptions** to a harness rule carry `zen-allow-<allow>: <reason>` in a comment right above.
- **API conventions** (what AI agents guess): `size` accepts the short and long spelling via `scaleKey()`;
  value controls expose `value`/`defaultValue`/`onValueChange`, boolean controls `checked`/`defaultChecked`/
  `onCheckedChange`, selection `selected`, overlays `open`/`onOpenChange`; icon props take `IconName | ReactNode`
  through `renderIcon()`; every built-in string comes from `useZenLabels()` (add the key to `_shared/labels.ts` in
  en and vi); renamed props stay as `@deprecated` aliases (the harness warns apps through `api/deprecated-prop`).


## C. Build → QA → Deliver (every UI change)

Follow `skills/zen-build-qa` (team write-up: `docs/qa/build-qa-process.md`): plan the spec card (tokens per element,
text styles, hierarchy, APG keyboard pattern, states), build, then run **`npm run qa`** — it checks exactly the files
this session edited: static gates, style-guard (spacing/radius/typography/colour-role/shadow tokens), runtime text-style,
content-hierarchy and token-scale checks, dark, Comfortable density, behaviour (focus, keyboard, APG, dead clicks),
example coverage and 1512/390 screenshots. Open every screenshot before delivering. Hooks in
`Zen-CodeBase/.claude/settings.json` lint each edit at once and block finishing a turn until the gate passed.

## Commands

| Gate | Command |
| --- | --- |
| **Build-QA gate** | `npm run qa` (scope = this session's edits; `--pages=`, `--all`) · `npm run qa:quick` while iterating |
| Style tokens | `npm run style:check` (`--list`, `--all`, `--baseline-update`) · `npm run style:selftest` |
| Types | `npx tsc --noEmit -p .` |
| Usage harness | `npm run usage:selftest` · `npm run usage:check` (the CLI, ESLint plugin and app mode are checked by the selftest) |
| Browser tests | `npm test` — smoke + axe baseline for every component, size spellings, interactions (`ZEN_UPDATE_AXE=1 npm test -- tests/smoke` rewrites the baseline after an a11y fix) |
| MCP server | `npm run mcp:selftest` |
| Visual regression | `node tools/platform-audit/visual-diff.mjs capture <dir> --url=…` before and after, then `… compare <before> <after> --sheets=<dir>`: refactors that must not change the UI need 0 changed panels |
| Guidelines + props docs | `npm run guidelines:build` then `npm run guidelines:check` |
| Tokens / styles / icons | `npm run tokens:check` · `npm run styles:check` · `npm run icons:check` |
| Figma parity | `node tools/figma-contract/run-all.mjs` |
| Platform (dev server on :5173) | `npm run platform:audit` (`:full`, `--dark`, `--quality`, `--density`) · `npm run platform:behaviour` · `npm run platform:shoot -- <page>`, and look at the images |
| Package | `npm run build:lib` · `npm run pack:local` · `npm run verify:package` |
| Everything | `npm run build` (library + platform) |

The full QA loop is `skills/zen-platform-qa` (detail in `docs/qa/platform-audit.md`). Basic UI slips (text flush to
an edge, a stretched small button, an oversized icon) must be caught with `platform:audit` and screenshots before
reporting work as done.

## Where things live

| Path | What |
| --- | --- |
| `src/components/*` | The library (public API = `src/index.ts`) |
| `src/components/Provider` | `ZenProvider`: token modes, Canvas, overlay portal |
| `src/icons/generated` | Icon names, core icons, lazy buckets (from `npm run icons:build`) |
| `src/styles`, `src/tokens` | Generated tokens, text styles, effects |
| `src/platform`, `src/foundations` | Docs platform only; never imported by the library |
| `tools/usage-guard` | Harness: rules (`check-usage.mjs`), scanner (`engine.mjs`), CLI (`cli.mjs`, bin `zen-usage`), ESLint plugin (`eslint.mjs`), API (`api.mjs`); guideline source and generated docs builder |
| `mcp/` | `zen-ds-mcp`, the MCP server for AI agents (reads the shipped docs) |
| `tools/zen-ds.mjs` | `npx zen-ds init / doctor / check` for apps |
| `tests/` | Vitest browser tests (Chromium, reduced motion): `smoke/` (every component, axe baseline), `scale.test.tsx`, `interaction/` |
| `src/components/_shared` | `scale.ts` (size spellings), `labels.ts` (en/vi built-in text), `zen-context.ts` (useZen, useZenLabels, useZenLocale), `icon.tsx` (renderIcon), `overlay.ts` / `status.ts` (accepted aliases) |
| `tools/figma-contract`, `tools/platform-audit` | Figma parity suites; DOM audit, quality/density/behaviour checks and screenshots |
| `tools/style-guard`, `tools/qa` | Token linter for CSS + inline styles; the Build-QA gate (`npm run qa`) and its Claude Code hooks |
| `docs/` | Guidelines, API, getting started, architecture notes, session logs (`docs/context/`) |
| `examples/consumer-smoke` | Template app used by `verify:package` |

## Working alongside other sessions

Several Claude sessions often edit this folder at once. Re-read a file right before writing it, make targeted edits
(never rewrite a whole shared file), and generate new files before switching imports to them, so the shared dev server
never breaks. Log what you did in `docs/context/session-log-<date>.md`, add a user-facing line to `CHANGELOG.md`
(Unreleased), and update `docs/context/HANDOFF.md` when the current state or open items change.

**Scope lock (the user's rule since 2026-09-29).** Do only the task the user approved. Nothing new starts without the
user's explicit approval: no new session, no task chip, no new harness rule or audit check, no fix to a component or
tool you happened to find. Append each bug or follow-up as one line under "## Backlog" in
`docs/context/HANDOFF.md` (priority + pointer), mention it in your report, and stop there: the Backlog is summarised
as a proposal for the next working block, and the user approves what gets done. Another session cannot approve scope
on the user's behalf. If a finding blocks your approved task, stop and ask your user.

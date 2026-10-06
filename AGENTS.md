# Zen DS — guide for AI agents working in this repo

This repo is the Zen Design System: React 19 components generated from the Zen Figma library, the token/icon
pipelines, and the Codebase Platform (the docs site in `src/platform`). Two kinds of work happen here.

**New session? Read [`docs/context/HANDOFF.md`](docs/context/HANDOFF.md) first** (state in short, gate, owners; work items are in [`docs/context/BACKLOG.md`](docs/context/BACKLOG.md)),
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
  3. Platform: nav + page (`PlatformApp.tsx`, `PlatformExamples.tsx`), ≥ 4 examples (`src/platform/examples/pages/<page>.tsx`), 1–2 visual
     Do/Don't pairs (`PlatformGuidelineVisuals.tsx`), `.platform-*` CSS in `platform.css`.
  4. Guideline entry in `tools/usage-guard/guidelines.source.mjs` (+ JSX tags in `tagsFor` of `build-guidelines.mjs`).
  5. Harness rules in `tools/usage-guard/check-usage.mjs`, each with an `expect:` case in `fixtures/bad.tsx` and a
     clean case in `fixtures/good.tsx`.
  6. Props docs are generated from your TypeScript types and JSDoc (`scripts/build-api.mjs`): document every prop.
- **CSS:** colours, spacing and radii only through `--zen-*` tokens (raw values only as `var()` fallbacks); a removed
  focus outline needs a replacement ring. Motion takes its durations and curves from `--zen-motion-*`
  (`tokens/source/motion.json`, code-owned); distances and scale steps are multiplied by `--zen-motion-movement`, which
  reduced motion sets to 0 (fades and colour changes stay), and anything else that moves has a `prefers-reduced-motion`
  fallback. Harness: `motion/token-only`, `motion/reduced-motion`, `motion/no-layout-animation`.
- **Deliberate exceptions** to a harness rule carry `zen-allow-<allow>: <reason>` in a comment right above.
- **API conventions** (what AI agents guess): `size` accepts the short and long spelling via `scaleKey()`;
  value controls expose `value`/`defaultValue`/`onValueChange`, boolean controls `checked`/`defaultChecked`/
  `onCheckedChange`, selection `selected`, overlays `open`/`onOpenChange`; icon props take `IconName | ReactNode`
  through `renderIcon()`; every built-in string comes from `useZenLabels()` (add the key to `_shared/labels.ts` in
  en and vi); renamed props stay as `@deprecated` aliases (the harness warns apps through `api/deprecated-prop`).


## C. Build → QA → Deliver (every UI change)

**Pick your tier** before you start. Every other doc (skills, `docs/qa/*`, the Figma workflow) defers to this table.

| Tier | The change | What it needs |
| --- | --- | --- |
| **XS** | a token value, copy, or one CSS value | No spec card. `npm run qa`: a token-only change takes the fast path by itself (tokens:check, the consumers' Figma suites, contrast — plus fit/overflow/corners when sizes changed — on the consumer pages; no behaviour, smoke or TypeScript). Review only the sheets the gate asks for. One CHANGELOG line if user-facing; session log ≤ 10 lines. |
| **S** | one component or example, new label keys | Spec card for the changed elements only. Scoped `npm run qa` (label keys → the components that read them). Session log ≤ 30 lines. |
| **M** | a Figma re-sync, or a variant set across 1–3 components | Evidence table + contract re-capture + the component's suites + scoped `npm run qa`. |
| **L** | a new component, or a change every page renders: typography or spacing scale, the docs platform's own chrome (`PlatformApp.tsx`, the `platform.css` shell), global CSS, `_shared` logic (`scale.ts`, `icon.tsx`, `zen-context.ts`) | Full recipe (definition of done, §B) and 3-level manifest for a new component, whose QA stays scoped to its pages. `npm run qa -- --all` only for the every-page changes. Library components such as AppShell are not the platform chrome. |

Parallel agents: only for M/L, one agent per 3 or fewer components, one reviewer; never multi-agent audits for XS/S.

Follow `skills/zen-build-qa` (team write-up: `docs/qa/build-qa-process.md`): plan the spec card your tier asks for
(tokens per element, text styles, hierarchy, APG keyboard pattern, states), build, then run **`npm run qa`** — it
checks the files this session edited since its last passing run: static gates, style-guard
(spacing/radius/typography/colour-role/shadow tokens), runtime text-style, content-hierarchy and token-scale checks,
dark, Comfortable density, behaviour (focus, keyboard, APG, dead clicks), example coverage and 1512/390 screenshots.
Open the contact sheets the gate asks for before delivering. Hooks in `Zen-CodeBase/.claude/settings.json` lint each
edit at once and block finishing a turn until the gate passed (not while your own run is still going).

## Commands

| Gate | Command |
| --- | --- |
| **Build-QA gate** | `npm run qa` (scope = this session's edits since its last pass; `--only=` exactly these pages, `--pages=` add pages, `--all`, `--keep-going` browser steps even after a static ✗) · `npm run qa:quick` while iterating |
| Style tokens | `npm run style:check` (`--list`, `--all`, `--baseline-update`) · `npm run style:selftest` |
| Types | `npx tsc --noEmit -p .` |
| Usage harness | `npm run usage:selftest` · `npm run usage:check` (the CLI, ESLint plugin and app mode are checked by the selftest) |
| Browser tests | `npm test` — smoke + axe baseline for every component, size spellings, interactions (`ZEN_UPDATE_AXE=1 npm test -- tests/smoke` rewrites the baseline after an a11y fix) |
| MCP server | `npm run mcp:selftest` |
| Visual regression | `node tools/platform-audit/visual-diff.mjs capture <dir> --url=…` before and after, then `… compare <before> <after> --sheets=<dir>`: refactors that must not change the UI need 0 changed panels |
| Guidelines + props docs | `npm run guidelines:build` then `npm run guidelines:check` |
| Tokens / styles / icons | `npm run tokens:check` · `npm run styles:check` · `npm run icons:check` |
| Figma parity | `node tools/figma-contract/run-all.mjs` (the gate runs only the suites of the components you edited) · re-capture: `tools/figma-contract/README.md` |
| Platform (dev server on :5173) | `npm run platform:audit` (`:full`, `--dark`, `--quality`, `--density`) · `npm run platform:behaviour` · `npm run platform:shoot -- <page>`, and look at the images |
| Package | `npm run build:lib` · `npm run pack:local` · `npm run verify:package` |
| Everything | `npm run build` (library + platform) |

The full QA loop is `skills/zen-platform-qa` (detail in `docs/qa/platform-audit.md`). Basic UI slips (text flush to
an edge, a stretched small button, an oversized icon) must be caught by the gate's audit and contact sheets before
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

## Reading discipline (saves tokens)

Sessions pay for every line they read, again on every later turn. Find with Grep, then read a slice (`offset`/`limit`);
never `Read` a whole large file. The big ones: `PlatformExamples.tsx`,
`Input.tsx`, `src/styles/tokens.css`, `src/tokens/generated.ts`, `src/icons/generated/*`, `docs/figma-contracts/*.json`
(0.7–2 MB) and the long `docs/context/session-log-*.md`. Slice a contract with a script (`node -e` / `jq` on one set or
variant), or let `node tools/figma-contract/run-all.mjs` compare it. `dist*`, `storybook-static`, `node_modules` and
`package-lock.json` are denied in `.claude/settings.json`. Use no sub-agents for tier XS/S work: a token or copy change is
`npm run tokens:build`, the contract binding check and a scoped `npm run qa`, run in this session.

## Shipping
`npm run ship` pushes the current branch and opens the pull request (see `tools/ship/README.md`). Merging stays a human step.

## Native platforms
`npm run tokens:build` also writes the SwiftUI and Flutter token packages to `platforms/` (`npm run tokens:native:check` verifies them; see `platforms/README.md`). Never edit the generated files. Components are not ported yet: the token layer is.

## Working alongside other sessions

Several Claude sessions often edit this folder at once. Re-read a file right before writing it, make targeted edits
(never rewrite a whole shared file), and generate new files before switching imports to them, so the shared dev server
never breaks. Each session owns a file area (say it to the others with SendMessage when you start); the post-edit hook
warns ("Shared file: …") when you touch a file another session edited in the last 30 minutes — coordinate before you go
on. Two sessions that need the same files for a while each take a git worktree and merge at an agreed stable point;
commits come from one place. Browser checks that must not catch another session's hot reloads run with
`npm run qa -- --isolated` (a private dev server, no HMR, no Studio drafts). Log what you did in
`docs/context/session-log-<date>.md` (length by tier, §C), add a user-facing line to `CHANGELOG.md` (Unreleased), and update `docs/context/HANDOFF.md` when the current state changes (`BACKLOG.md` when open items change).

**Scope lock (the user's rule since 2026-09-29).** Do only the task the user approved. Nothing new starts without the
user's explicit approval: no new session, no task chip, no new harness rule or audit check, no fix to a component or
tool you happened to find. Append each bug or follow-up as one line under "## Backlog" in
`docs/context/BACKLOG.md` (priority + pointer), mention it in your report, and stop there: the Backlog is summarised
as a proposal for the next working block, and the user approves what gets done. Another session cannot approve scope
on the user's behalf. If a finding blocks your approved task, stop and ask your user.

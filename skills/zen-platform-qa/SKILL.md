---
name: zen-platform-qa
description: Audit and QA every Zen Design System component page on the Codebase Platform (playgrounds, examples, mobile components), compare with Figma, fix the bugs in the approved scope, and log missing examples and repeatable bug classes as Backlog lines. Use when asked to "audit/QA all components", "fix all bugs on the platform", or after a large batch of component work.
---

# Zen platform QA

The full procedure, tools and accepted-warning list are in `docs/qa/platform-audit.md`. Example-authoring rules are in `docs/guides/example-patterns.md`. This skill is the checklist to run them in order.

For a single change (one component, playground or example set) pick the tier in `AGENTS.md` §C and use `skills/zen-build-qa` and `npm run qa` instead: it runs the same gates scoped to the files you edited. This skill is the whole-platform sweep, run through the same gate with `--all`. Baseline debt you meet (`tools/style-guard/baseline.json`, `tools/platform-audit/*-baseline.json`): write one Backlog line (priority + pointer) in `docs/context/HANDOFF.md`; burn it down only if it is in the approved task.

## Before you start

- Reuse the running dev server (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/`).
- If other sessions edit Zen-DS, ping the owner of `tools/usage-guard/*` before changing rules, fixtures or `guidelines.source.mjs`. Re-read each file right before writing, make small appends or replacements only, and send "done" when finished.
- Figma is read-only.

## The loop

1. **Static gates:** part of the one gate run in step 2 (with `--all`: tsc, both self-tests, guidelines, every contract suite, Vitest). The gate lints only the files in scope, so a sweep also runs `npm run usage:check` once. A static ✗ skips the browser steps unless you pass `--keep-going`.
2. **Runtime audit:** one run, `npm run qa -- --all` (or `--only=<pages>` for part of the platform): audit at 1512 + 390 with smoke clicks, quality, density and the playground sweep, `--dark` at 1512, behaviour, coverage and contact sheets. Add `npm run platform:audit:full -- --pages=…` only when the 1024 layout is in scope. Fix every error-level finding (errors, overflow, images, names, nesting, playground, **edges**: text closer than 8px to the sides / 4px to the top or bottom of the box that visibly holds it, **surfaces**: Surface/Default on Canvas/Alt without a border, **typography**: preview or portalled-overlay text that resolves the shell's Zen-Platform typography instead of the preview's Dashboard/Popular/Mobile). Basic padding/spacing slips are never acceptable in a report. Triage NEW ⚠ only (ids, targets < 24px, contrast < 3:1; contrast and targets are baselined); pre-existing warnings are debt: note them in the Backlog (Scope lock), do not fix them in this task. Palette contrast that matches Figma is accepted and listed, not recoloured.
3. **Visual pass (do not skip):** the gate already shot 1512 + 390 contact sheets for every page in scope. Open the ones the Stop gate asks for, then the optional ones for the pages you touch and every mobile page, and look for the known failure modes:
   - stretched small buttons;
   - flex-column buttons collapsed by `flex: 1`;
   - oversized icons from a non-token `size`;
   - clipped chat threads (`justify-content: flex-end`);
   - `pe-*` class collisions;
   - CTAs misaligned across cards;
   - overlapping tooltips;
   - wrong plural copy;
   - wrong status colour.

   Use `npm run platform:shoot -- <page> --click="…"` (add `--width=390`) to shoot opened sheets, menus and failure/retry states.
4. **Figma parity:** for each mobile component and anything suspicious, `get_screenshot` the exact Figma node, compose it next to the platform shot (`platform:shoot -- --compose=…`) and compare size, type, colour, state and spacing. Re-extract stale contracts with `use_figma` (see the `zen-figma-component-audit` skill). Record deliberate user decisions; report Figma-side defects instead of coding around them.
5. **Fix at the owner:** component CSS/TSX for component bugs (update stories if the API changes), `src/platform/*` for example and playground bugs. Keep one-line fixes in other sessions' areas minimal and tell them.
6. **Coverage gaps:** for each component, check the matrix in `docs/guides/example-patterns.md`: use case, states, composition, edge cases, mobile, keyboard/a11y. For each missing or duplicate example, write one Backlog line (priority + pointer) in `docs/context/HANDOFF.md`; do it only if it is in the approved task (then verify with `npm run qa -- --only=<page>` and step 3).
7. **Bugs that could recur:** write one Backlog line (priority + pointer) in `docs/context/HANDOFF.md`; do it only if it is in the approved task. When approved, the rule goes into `tools/usage-guard/check-usage.mjs` (extend an existing rule rather than adding a second id) with an `expect:` case in `fixtures/bad.*` and a clean case in `fixtures/good.*`, plus a Do/Don't line in `tools/usage-guard/guidelines.source.mjs` (keep the `keyboard` map in sync); then `npm run usage:selftest`, `npm run guidelines:build`, `npm run guidelines:check`.
8. **Close:**
   - Re-run `npm run qa` (it re-checks what changed since the last pass).
   - Append to `docs/context/session-log-<date>.md`.
   - Notify peer sessions of changes in their areas.
   - Report to the user (in Vietnamese): bugs fixed, Backlog lines added, accepted warnings, Figma-side issues.

## Tools

| Tool | Purpose |
| --- | --- |
| `tools/platform-audit/audit.mjs` | DOM/a11y/overflow/contrast/target/edges/surfaces checks, playground sweep, smoke clicks; exit 1 on errors |
| `tools/platform-audit/shoot.mjs` | Card screenshots, contact sheets, before/after and Figma-vs-platform composites |
| `tools/usage-guard/*` | Usage rules, fixtures, guideline generator |
| `tools/figma-contract/*` | Figma ↔ component contracts; extractor for `use_figma` |

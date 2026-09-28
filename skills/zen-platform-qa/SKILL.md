---
name: zen-platform-qa
description: Audit and QA every Zen Design System component page on the Codebase Platform (playgrounds, examples, mobile components), compare with Figma, fix the bugs, add missing examples, and turn each repeatable bug into a harness rule plus guideline. Use when asked to "audit/QA all components", "fix all bugs on the platform", or after a large batch of component work.
---

# Zen platform QA

The full procedure, tools and accepted-warning list are in `docs/qa/platform-audit.md`. Example-authoring rules are in `docs/guides/example-patterns.md`. This skill is the checklist to run them in order and to leave the system better than you found it.

For a single change (one component, playground or example set) use `skills/zen-build-qa` and `npm run qa` instead: it runs the same gates scoped to the files you edited. This skill is the whole-platform sweep; when you run it, add `--quality --density` to the audit and `npm run platform:behaviour`, and burn down the baselines (`tools/style-guard/baseline.json`, `tools/platform-audit/*-baseline.json`) as you fix.

## Before you start

- Reuse the running dev server (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/`).
- If other sessions edit Zen-DS, ping the owner of `tools/usage-guard/*` before changing rules, fixtures or `guidelines.source.mjs`. Re-read each file right before writing, make small appends or replacements only, and send "done" when finished.
- Figma is read-only.

## The loop

1. **Static gates:** `npx tsc --noEmit -p .`, `npm run usage:check`, `npm run usage:selftest`, `npm run guidelines:check`, `node tools/figma-contract/run-all.mjs`.
2. **Runtime audit:** `npm run platform:audit` (1512 + 390, every playground axis), then `npm run platform:audit:full` (adds 1024 and smoke-clicks every example button) and `node tools/platform-audit/audit.mjs --dark`. Fix every error-level finding (errors, overflow, images, names, nesting, playground, **edges**: text closer than 8px to the sides / 4px to the top or bottom of the box that visibly holds it, **surfaces**: Surface/Default on Canvas/Alt without a border, **typography**: preview or portalled-overlay text that resolves the shell's Zen-Platform typography instead of the preview's Dashboard/Popular/Mobile). Basic padding/spacing slips are never acceptable in a report. Triage warnings (ids, targets < 24px, contrast < 3:1). Palette contrast that matches Figma is accepted and listed, not recoloured.
3. **Visual pass (do not skip):** `npm run platform:shoot -- <page>` and `--width=390` for every page you touch and every mobile page. Open the images and look for the known failure modes:
   - stretched small buttons;
   - flex-column buttons collapsed by `flex: 1`;
   - oversized icons from a non-token `size`;
   - clipped chat threads (`justify-content: flex-end`);
   - `pe-*` class collisions;
   - CTAs misaligned across cards;
   - overlapping tooltips;
   - wrong plural copy;
   - wrong status colour.

   Use `--click="…"` to shoot opened sheets, menus and failure/retry states.
4. **Figma parity:** for each mobile component and anything suspicious, `get_screenshot` the exact Figma node, compose it next to the platform shot (`platform:shoot -- --compose=…`) and compare size, type, colour, state and spacing. Re-extract stale contracts with `use_figma` (see the `zen-figma-component-audit` skill). Record deliberate user decisions; report Figma-side defects instead of coding around them.
5. **Fix at the owner:** component CSS/TSX for component bugs (update stories if the API changes), `src/platform/*` for example and playground bugs. Keep one-line fixes in other sessions' areas minimal and tell them.
6. **Fill coverage gaps:** for each component, check the matrix in `docs/guides/example-patterns.md`: use case, states, composition, edge cases, mobile, keyboard/a11y. Add the missing examples (with accurate description and code sample), remove duplicates, and verify them with step 2 (`--pages=… --smoke`) and step 3.
7. **Make it stick:** every bug that could recur becomes:
   - a rule in `tools/usage-guard/check-usage.mjs`, with an `expect:` case in `fixtures/bad.*` and a clean case in `fixtures/good.*`. Extend an existing rule rather than adding a second id for the same thing.
   - a Do/Don't line in `tools/usage-guard/guidelines.source.mjs`, with the `keyboard` map kept in sync.

   Then run `npm run usage:selftest`, `npm run guidelines:build`, `npm run guidelines:check`. New example patterns go into `docs/guides/example-patterns.md`.
8. **Close:**
   - Re-run steps 1–2 in full.
   - Append to `docs/context/session-log-<date>.md`.
   - Notify peer sessions of changes in their areas.
   - Report to the user (in Vietnamese): bugs fixed, examples added, rules added, accepted warnings, Figma-side issues.

## Tools

| Tool | Purpose |
| --- | --- |
| `tools/platform-audit/audit.mjs` | DOM/a11y/overflow/contrast/target/edges/surfaces checks, playground sweep, smoke clicks; exit 1 on errors |
| `tools/platform-audit/shoot.mjs` | Card screenshots, contact sheets, before/after and Figma-vs-platform composites |
| `tools/usage-guard/*` | Usage rules, fixtures, guideline generator |
| `tools/figma-contract/*` | Figma ↔ component contracts; extractor for `use_figma` |

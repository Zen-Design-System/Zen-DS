---
name: zen-token-sync
description: Sync Zen DS Figma variables into the repo (tier XS) — diff the export or the live file against tokens/source, apply, rebuild, and let the QA gate's token fast path check the consumers. Use when the user supplies a variables export or says tokens changed in Figma.
---

# Zen token sync (tier XS)

A token value change needs no component edit: every `var(--zen-…)` consumer picks up the new value. What can still go
wrong is the pipeline (bad alias, wrong type), a value that does not match Figma (wrong file or mode), contrast
(colours) and fit (sizes). The steps below check exactly that. No multi-agent audit, no `--all`.

1. **Map and diff.** Match the export (or a read-only `use_figma` read of the live file `9nZv4uW2LT21yuHabMTCh1`) to
   `tokens/source/figma/<collection>.json` by collection name and modes. Diff with a short script: added, removed,
   renamed, per-mode value changes. An export may hold one mode only; say which modes it covers.
2. **Ask before removals or renames**; value changes and additions go ahead. Keep Figma names exactly, typos included
   (`Seclected`, `Weigth`).
3. **Apply** with a format-preserving merge (parse, check the round-trip, set `valuesByMode`, write with the same
   indent). Update `tokens/source/figma.collections.json` (`lastSynchronizedAt`, one line in `synchronizationNote`).
4. `npm run tokens:build && npm run tokens:check`.
5. `npm run qa`. With only token values changed the gate takes the fast path by itself: it maps the changed names and
   their aliases to the consumer CSS and pages, runs tokens:check, the consumers' Figma suites and contrast (plus fit,
   overflow, corners and Comfortable when sizes changed), and asks for the consumer components' own sheets only.
   Typography or spacing-scale tokens are tier L: `npm run qa -- --all`.
6. **Report** one short table: collection, tokens before → after, added / removed / changed, consumer pages, and any
   value that differs from the live file. One CHANGELOG line if users see a change; session log ≤ 10 lines.

Known gotchas (moved here from a private memory note, 2026-10-07; add new ones here, not to memory):
- A typography token change (size, line height, tracking) moves every text box: the Figma contract suites compare
  rendered heights (`node tools/figma-contract/run-all.mjs`; re-capture per `tools/figma-contract/README.md` when Figma
  changed too), `npm run styles:build` regenerates the text-style manifest, and `tools/platform-audit/quality-baseline.json`
  keys that name text (fit, rhythm) stop matching. Re-baseline only after reading the new findings
  (`npm run platform:audit -- --quality --baseline-update`). Typography is tier L: `npm run qa -- --all`.
- `-shadow-off` companions are emitted only where a background is Subtle/Pale/Surface-Alt (scripts/build-tokens.mjs).
- `npm run tokens:build` runs through Bash, so the post-edit hook does not record the generated files: pass them to the
  gate (`npm run qa -- --files=src/styles/tokens.css,…`) or let its token fast path pick the changed names up.

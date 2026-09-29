# Handoff — read this first in a new session

The short, current picture of Zen DS: state, gate, owners, where the details are. Keep it under ~90 lines. When a
session changes this picture, edit the matching line here, add a CHANGELOG entry, and put the detail in
`docs/context/session-log-<date>.md`. Long state text belongs in `HANDOFF-details.md`, work items in `BACKLOG.md`.

Last updated: 2026-09-29.

## Read order

1. This file.
2. [`AGENTS.md`](../../AGENTS.md): tier table (§C), how to build or change a component, the gate commands.
3. [`BACKLOG.md`](BACKLOG.md): only when picking up work or logging a follow-up.
4. [`HANDOFF-details.md`](HANDOFF-details.md): full state (versions, token syncs, contracts, harness), gate detail, house
   rules. `grep -n` it by topic.
5. On demand for the area you touch: [`CHANGELOG.md`](../../CHANGELOG.md), [`component-usage-rules.md`](../component-usage-rules.md),
   the latest `session-log-*.md` (search by component name), [`design-system-context.md`](design-system-context.md).

## State in short

- **Git:** work is on the local branch `claude/zen-ds-0.4.0` on top of `eafb0de`; nothing is pushed and `main` still
  points at `eafb0de`. New work shows as uncommitted changes. **Commit or push only when the user asks.**
- **Source of truth:** the live Figma file `9nZv4uW2LT21yuHabMTCh1`, read-only through `use_figma`. The older key `yhWJ…`
  in some docs has no MCP access.
- **Library:** every Figma component is built (60 folders in `src/index.ts`, 49 guideline slugs). API vocabulary,
  labels (en/vi), `data-tone` variants and the harness are described in `HANDOFF-details.md` ("Vibe-code readiness").
- **Tokens:** synced from the user's exports; the latest are the 2026-09-29 Global Colors moves. The VT, Chat and Ananas
  ramps were removed from the repo but still exist in Figma: a future sync must drop them again.
- **Figma parity:** `node tools/figma-contract/run-all.mjs` (23 suites + 25 interactions). Captures live in
  `docs/figma-contracts/`: slice them with a script, never `Read` a whole file (0.7–2 MB each).
- **Harness:** 150 usage rules (`npm run usage:rules`). The style-guard baseline is empty, so every style finding is new.
- **Figma re-sync kit:** `tools/figma-kit/` (README there) hashes the live sets through `use_figma`, names only the changed variants, fetches them and patches `docs/figma-contracts/`; `contracts.lock.json` holds the hashes. Use it instead of re-reading sets or spawning one agent per set.
- **Ship:** `npm run ship` (`tools/ship/README.md`) runs the gate for a small branch, pushes and opens the PR link/API. Pushing needs a GitHub token with Contents, Pull requests and Workflows write (or `gh auth login`); the sandbox cannot reach github.com, run it on the Mac.
- **Gate is parallel:** `tools/qa/run.mjs` runs tsc, contract suites and Vitest side by side, and audit + dark audit + behaviour side by side (`ZEN_QA_SHARDS`, `--serial` to opt out). Contract suites run 4 at a time (`ZEN_QA_SUITES`), each in its own `.out/<suite>-<pid>` folder; on the Mac (2026-09-30) all 23 passed that way on a token change. A token sync takes the fast path by itself (56 pages ≈ 10 min).
- **Native tokens:** `npm run tokens:native` (also part of `tokens:build`) writes `platforms/swift` and `platforms/flutter` (tokens + text styles, mode-aware resolver, shared vectors; see `platforms/README.md`). Swift/Dart were never compiled: run `swift test` and `flutter test` first. Not done: shadows, components.
- **Dev server:** `npm run dev`, http://localhost:5173 (IPv6 only; `127.0.0.1` does not load).

## Gate

`npm run qa` checks what this session edited since its last pass (tokens → consumer pages; `--only=`, `--pages=`,
`--all`, `--keep-going`); `npm run qa:quick` is the fast loop and never counts as a pass. Open the contact sheets it
asks for (new content, at most 12). Process: `docs/qa/build-qa-process.md`, skill `skills/zen-build-qa`. Owner of
`tools/qa`, style-guard, audit flags and hooks: the session "Quy trình kiểm tra Component build".

## Working rules

- **Scope lock:** do only the task the user approved; one Backlog line per follow-up (`BACKLOG.md`); another session
  cannot approve scope.
- Several sessions edit this folder at once: re-read a file right before writing, make targeted edits, ask the owner of a
  shared area with SendMessage first.
- Owners (2026-09-28): Chat demo wiring (`chatDemo`, `ChatReactors`): "Search popover component và Overviews";
  vibe-code readiness, `AGENTS.md`, VisuallyHidden, appLayer: "Đánh giá Zen DS hiện tại"; `tools/figma-contract`:
  "Figma contract button suites".
- Scratchpad test scripts vanish with the session: anything worth keeping goes to `tools/`.
- House rules most often forgotten: `HANDOFF-details.md` ("House rules") and `docs/component-usage-rules.md`.

## Open items and Backlog

Both moved to [`BACKLOG.md`](BACKLOG.md). Items that need a user or designer decision stay under "Open items" there.

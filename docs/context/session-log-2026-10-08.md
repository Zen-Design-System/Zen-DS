# Session log 2026-10-08

## Private registry · Phase 2: license auth plugin (session "Verdaccio private registry")

- Distribution decided with the user: self-hosted Verdaccio 6.10.5 on a VPS, per-company license keys checked
  against the `zen-license-management` PocketBase, scope `@zen-ds` (the npm org `zen-ds` is the user's).
- New `tools/registry/` (own package.json, devDeps verdaccio 6.10.5 + js-yaml): `config.yaml` (only `@zen-ds/*`,
  no uplinks, no sign-up, web off, 365 d JWT), plugin `plugins/verdaccio-zen-license/` (SHA-256 key check, license
  re-checked on every request with a 300 s cache, 1 h stale grace on store outage then 503, `zen-publisher` key hash
  from env). Denials are errors: Verdaccio's fallback grants on a plain `false`.
- Tests: 10 unit (fake store/clock) + 7 e2e (real PocketBase 0.39.11 + Verdaccio + npm: publish gate, anonymous /
  wrong key / sign-up refused, install by token and by key, revoke → 403 with the old token, re-activate).
  A mutation (license re-check removed) fails the revocation test. `npm test` in tools/registry: 17/17.
- Not touched: the library, the platform, the live PocketBase. No `npm run qa` (no UI change).

## Private registry · Phase 2 follow-up: license id as the key, live access (same session)

- User: customers copy the key from the license server; `npm login` only (option A). The live `licenses` collection
  (read with `pbc admin`) has no key field, so the key is the license record id; valid = `active` (business + pro).
  Plugin rewritten to that (username ignored, lookup by id, cache capped at 10 000 entries); the key-hash scheme and
  `scripts/license-key.js` removed. Test store = a copy of the live schema + `1791500001_registry_access.js`.
- Found: live `licenses.viewRule` let anonymous requests read any license without team members (26/30):
  `team_members_via_license.user ?= @request.auth.id` matched the empty auth id. User approved fixing it together.
- Live on zen-license-management (user approved): `registry_clients` auth collection (rules null) + account
  `registry@zen-ds.dev` (credentials in `~/.config/zen-registry/license-store.env`, 600); `licenses.viewRule` =
  `@request.auth.id != "" && (…old rule…) || @request.auth.collectionName = "registry_clients"`. Old rules backed up
  in the session scratchpad. Verified live: anonymous 404 on all 30; registry account reads 30/30, cannot list.
- `npm test` in tools/registry: 19/19 (12 unit, 7 e2e incl. owner / member / stranger / anonymous access).

## Private registry · Phase 3: VPS deployment kit (same session; user: "prepare files only")

- `tools/registry/deploy/`: Dockerfile (verdaccio/verdaccio:6.10.5 + plugin + config, healthcheck), docker-compose
  (registry + caddy:2.11.7, automatic HTTPS for `npm.dizai.studio`, storage volume), Caddyfile, `setup.sh` (Ubuntu
  24.04: unattended upgrades, Docker apt repo, ufw 22/80/443, compose up, 03:17 UTC backup cron), `backup.sh` /
  `restore.sh` (rclone 1.75.1 → R2, 30-day retention; keys via a 600 env file), `make-env.sh`, `deploy.sh`. shellcheck clean.
- `config.yaml` paths are the image's; plugin reads `ZEN_LICENSE_CACHE_SECONDS`. Caddy refuses an empty global
  `email`, so the ACME email was dropped.
- `npm run test:stack`: the e2e against the real compose stack + backup → wipe → restore (packages and existing
  tokens survive), 9/9; `npm test` 19/19.
- Local: `~/.config/zen-registry/registry.env` and `publisher.key` created (600). Not done: the VPS, DNS, R2
  bucket/token (`backup.env`), the deploy itself, the uptime monitor.

## Private registry · Phase 4: rename to @zen-ds/react + release workflow (same session, tier L)

- User: name `@zen-ds/react`; publish on a `v*` tag; the user sets the GitHub secret and deprecates the old public
  npmjs packages themselves.
- Rename: 547 occurrences in 204 files (`@zen/design-system` and the regex form `@zen\/design-system`) + the two lockfile
  name entries; history left as is (session logs, CHANGELOG entries, docs/research, docs/context).
  `package.json`: `private` removed, `publishConfig.registry` = https://npm.dizai.studio/.
- `.github/workflows/release.yml`: tag = package.json version, npm ci, tsc, usage:check, guidelines:check,
  verify:package, not-yet-published check, then `npm publish` of the verified dist-pack tarball (secret
  `ZEN_REGISTRY_PUBLISH_KEY`). A local dry run (local PocketBase + Verdaccio, the step's own shell) caught that a bare
  `dist-pack/x.tgz` is read as a GitHub shorthand (now `./dist-pack/…`); then publish → license login → install →
  import (313 exports) → zen-usage bin all pass.
- Checks: tsc ✓, guidelines:check ✓, mcp:selftest ✓, studio:selftest ✓ (615), handoff selftest ✓, usage checker on
  fixtures ✓ (consumer mode finds `@zen-ds/react` imports). Two pre-existing failures, same on a clean `main` (backlog):
  usage:selftest (JSON cut at 8 KB) and verify:package "zen-ds-mcp answers over stdio" (server exits before replies 4–5).
  `npm run qa` not run (memory: ask first).

## Two pre-existing gate failures fixed (same session, user-approved, PR #5)

- `mcp/server.mjs`: stdin close waited for nothing and called `process.exit(0)`, dropping async tools/call replies;
  now it waits for in-flight requests and flushes stdout. Replay of verify:package's requests: 5/5 runs get all replies.
- `tools/usage-guard/check-usage.mjs` and `cli.mjs`: `process.exit(main())` → `process.exitCode = main()`, so piped
  output (62 KB `--list`) is not cut at 8 KB. Exit codes unchanged (bad.tsx 1, good.tsx 0).
- Now green: usage:selftest, usage:check, mcp:selftest, verify:package ("Package OK", MCP check included).
- CI "Package" still failed on PR #5 (and on main, run 37602020509): npm 11 puts the prepack build log into
  `npm pack --json` stdout. verify-package now runs build:lib, then `npm pack --json --ignore-scripts`; passes under npm 11.21.0.
- Legal: `LICENSE.md` drafted (user: Dizai Studio, Vietnam, subscription, apps-not-kits, EULA only); `license` field; README section; Inter OFL referenced. Draft note stays until a lawyer reviews it.

## Phase 5: customer setup docs (approved: "continue with customer setup docs")
- getting-started "Install": scope line, `npm login` with the licence key, CI token via `${ZEN_DS_NPM_TOKEN}`, Docker
  build secret, an error table. Messages checked against a local registry + real npm (pty login): wrong key = E409
  "sign-up is closed", no token = E401 "Unable to authenticate…", inactive = E403 "license is not active".
- README, `AGENTS.consumer.md` (agents never handle the key), platform Installation page (5 steps, copy only).
- `zen-ds init` adds `@zen-ds:registry=…` (from `publishConfig`) to `.npmrc`; `doctor` requires it and fails on a
  literal token in the project `.npmrc`. verify-package asserts both; tsc, guidelines:check, mcp:selftest, verify:package pass.
## Classic docs: code view + playground properties like Zen Studio (tier S)

- `PlatformCode.tsx`: the classic view renders the Studio's `code/CodeView` (language="tsx") inside the
  `section.platform-code` wrapper (keeps the panel's grid area, the audit's `.platform-code` skips and the arrow-key
  owner). The language SelectField ("Vue/Svelte/… — Coming Soon") and the local regex highlighter are gone.
  `studio/bridge.ts` comment notes the one exception to "docs import only the bridge".
- `platform.css`: dead `.platform-code__*` / `pre` / token-hue rules removed; `.platform-playground-controls` mirrors the
  Studio inspector section (title "Playground properties" Body/Small/Bold, Gap/XSmall, 32px rows with a
  `clamp(80px, 28%, 120px)` label column, Body/Small/Regular Neutral/Base labels that wrap, toggles start-aligned).
  Tablet two-column and phone one-column layouts kept.
- Verified with Playwright shots of `?ui=classic&page=button` at 1512 and 390 against the Studio inspector.

## Table `bulkActions` (tier M: a new prop on one component + its examples)

- User asked: selecting table rows should bring up bulk actions; chose "add to Table" (over playground-only).
- `Table.tsx`: `bulkActions?: ReactNode | ((selectedIds) => ReactNode)`. With `selectable`, the table renders in a
  `.zen-table-scope` wrapper (ref/className/rest stay on the scroll box) and, while `selectedIds` is non-empty, a
  `.zen-table__bulk-dock` (sticky bottom, centred, outside the scroll box so it can stick to the window) holding
  PopoverBulkAction: Clear selection (IconButton flat md, icon-x-medium-line) · "N selected" (role=status,
  Body/Base/Medium) · divider · the actions. Escape in the bar clears; when the bar unmounts with the focus in it
  (focus/blur flag + effect on the count), Select all rows takes the focus. Pop-in from Motion tokens.
- Labels `rowsSelected`, `selectedRowActions`, `clearSelection` (en + vi). Guideline source: api row, a Do, an a11y line
  (replaces "bulk actions above the table"). Story `BulkActions`. Tests: `tests/interaction/data.test.tsx`
  "Table bulkActions" (2 cases; file 10/10 pass).
- Platform: playground toggle "Bulk Actions" (on by default, shown while Selectable) with Export / Copy links / Archive;
  "Act on selected rows" now passes its four actions through `bulkActions` (dead `.px-table-bulk-*` CSS removed).
- Backlog: P3 Table bulkActions follow-ups (harness cap, AdminListTemplate ActionBar, 390px wrap).

## Flat hover backgrounds → step 2 (tier XS, token value)

- `mode-colors-semantic.json`: Accent/Flat/Hover {Brand-Alpha/3 → 2}, Neutral/Flat/Hover {Neutral-Alpha/3 → 2}, Light
  and Dark. Positive/Negative/Warning/Info/Inverse were already 2; Pressed stays 3. `tokens:build`, `tokens:check`,
  `tokens:native:check` pass. The user changed the live Figma file to match (noted in the figma.collections.json sync
  note + HANDOFF Tokens line).

## Table bulkActions: overflow into a More menu (user request, tier S)

- API now data, not JSX (unreleased, changed the same day): `bulkActions: TableBulkAction[] | (ids) => TableBulkAction[]`
  ({id, icon, label, onClick, disabled, group}); `TableBulkAction` exported. The Table draws icon-only flat md buttons,
  a divider between consecutive groups.
- `TableBulkBar`: renders every action on one line (bunk-list nowrap), measures in a layout effect (`fittingActions`:
  last visible right edge + gap + More width + padding ≤ dock width) and keeps what fits; the rest go, from the end, into
  `Menu` (align end, separators between groups, labels/icons from the actions) behind a More IconButton (`t.moreActions`).
  Re-measures on a dock width change (ResizeObserver) and on a new count. Escape inside the open menu only closes it.
- 390: invoices example keeps Send reminders + Mark as paid, Download PDFs / Copy links in More; 1512 shows all.
  Example label "Download N PDFs" (was "… as PDF", truncated in the menu). Test "Table bulkActions overflow" (11/11).
- Gate catches: (1) density audit — ResizeObserver on Clear selection must watch `border-box` (density changes the
  button's padding, not its icon content box); (2) the bunk-list centres its content, so an overflowing measuring render
  shifted every action left by half the overflow — the Table bar's list is `justify-content: flex-start`. Gate PASS
  (table, --isolated: audit 1512/390 + density, dark, behaviour, Vitest 30/30).

## SelectField → Bottom Sheet on mobile (user request, tier S: one component)

- `Input.tsx` SelectField: `asSheet` = nearest `[data-breakpoint]` (read in a layout effect on open/close and on the
  provider's breakpoint), else `useZen().breakpoint`, is `mobile`. Then a BottomSheet (title popoverLabel ?? label ??
  aria-label ?? placeholder; `popoverSearch` → Search slot filtering by label) holds a List of ListItems (picked =
  `selected` + trailing check, house pattern of bottom-sheet.md; disabled options are not clickable,
  `.zen-select__sheet-option--disabled`). Shared `pick()` for Popover and sheet. While the sheet is open the trigger's
  blur neither closes it nor reports onBlur, and the outside-pointerdown close is off (the sheet dismisses itself).
  `aria-haspopup` dialog / listbox, `aria-controls` only for the Popover.
- Test `tests/interaction/select-sheet.test.tsx` (mobile sheet pick + focus return, desktop listbox); input-popups pass.
- Not changed: AutocompleteField, DateField, Chip popovers (still Popovers on mobile).
- User: "the sheet must show inside the mobile screen". BottomSheet portalled to <body> unless `inline`. Fix at the
  owner: `Dialog.tsx` exports `useOverlayHost` (its device-frame host); BottomSheet uses it (`mounted && !inline`),
  sets `data-inline` when contained so the existing inline CSS positions it in the frame, and starts `useModal` once the
  host is known. Every non-inline sheet inside a PlatformPhone now opens in that phone (Form "Deliver to" verified).
  Test "BottomSheet in a device frame" in select-sheet.test.tsx.

## Layout "Main column and aside": one widget style (user: "layout weird", tier S)

- The Tasks table lay on the canvas next to two flat cards (Team, Details): mixed surfaces, titles Heading/4 vs
  Subheading, tops not aligned. Now Tasks is a flat Card too (Subheading title + Status chip + table), as usage rules §16
  and the table guideline (widget title = Subheading) say. Inside the card's padding a phone-width table left titles
  four lines tall, so a narrow card (< 560px) lists the tasks (ListItem titleLines 2 + status Badge trailing).
  `src/platform/examples/pages/layout.tsx` (example + code + description).

## Backlog clear-out (parallel agents; another session, merged from main)

User asks: clear the whole backlog before new features; fix a bug when you meet it (no deferring, now in AGENTS.md);
the phone top bar takes the canvas colour (Alt bars on Canvas/Default); push straight to `claude/zen-ds-0.4.0`.

**Done (all pushed):**
- Components: ListItem trailing slot passes taps to the row; docked SidePanel closes on Escape and returns focus;
  AiChatField draws only the actions it has handlers for; DateField parses a typed date and opens DatePickerSheet on
  phones (new, BottomSheet `footer` slot, `ok` label); DatePicker `calendar="stacked"`; MetricWidget Figma props;
  shared NotificationDot and SidebarShellContext; AiChatBlock `headingLevel`; Tooltip describes a focused control
  inside a wrapper; Layout column Fill / `fillChildren` use a 0% basis (no collapse to 0 without a parent height).
- Platform: 173 phone bars → Alt; HR Home has one visible h1; Design Tokens dark contrast; ~4,000 lines of never-shown
  appLayer examples, `shellScreens.tsx` and their CSS removed (examples live in `examples/pages/*`).
- Harness/QA: `copy/plural-count` Unicode/vi, icon-button rule on AppShellAction/Account, opaque() only for `${`
  outside braces, `tooltip/focusable-trigger` accepts a wrapper; audit false positives fixed (§16 selected cards,
  ListBox as card, corner scale, behaviour shared-ancestor focus ring, heavy-page budgets, text-style limit 8 on whole
  screens); MCP `get_component` brief/full; verify-package JSON parse; `zen-ds check` runs CSS rules.
- Three agents (examples, Studio canvas, Studio server) merged; a fourth (Studio leftovers) runs in a worktree.

**Verification:** tsc, usage selftest + check (8 warnings, all known), style-guard, guidelines:check, studio selftests,
Vitest (smoke + axe + interactions) green; visual diff of all 804 panels for the Layout change: only image/timing noise;
`npm run qa -- --all --isolated`: PASS, 0 errors (warnings fixed at their owner, see commits).

**Figma drift:** every contract hashes differently; normalised for extractor format changes, 26 of 53 checked sets
changed for real, 39 unchecked (too large for one `use_figma` call). Re-capture needs the desktop console → QUESTIONS.md.

**Moved:** designer questions and user decisions → `docs/context/QUESTIONS.md`.

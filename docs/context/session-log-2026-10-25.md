# Session log 2026-10-25

## Session B · merge train C gate (#282, #290–#294; PR #295; slot from Giám sát)

Train C was gated twice with `qa -- --all --isolated` and the full Studio E2E. The first run failed on SP-12 (B-47/B-48
are new rows) with 9 `segmented-fit` warnings. Fixed in the train, each at its owner:
- **SP-12:** Studio's starter snapshot, figma-pull's TABLE_DRAWS and TableCellPanel still took the first column's
  Avatar as Subtle; they follow Table.tsx now (Solid in the first column).
- **B-47 / B-48 (#294):** after e19bb167 the cells write emitted `<Use>` without importing it ("not imported"). applyOps
  adds Use to the builder import when an op's expression writes one (jsx-source.mjs; builder.selftest case).
- **segmented-fit:** 8 hits were docs playgrounds no ZenProvider wraps. The audit counted any viewport under 768 as a
  phone, while the Segmented reads its nearest `data-breakpoint`. The audit now uses the Segmented's rule at every
  viewport (two new self-test cases). The 9th (app-shell@320) was a font-load race: Segmented measures again on
  `document.fonts.ready` / `loadingdone`.
- **Met while fixing:** figma-push wrote Theme=Photo × Background=Solid (no such Figma variant) for a pictured
  first-column Avatar. Table.tsx, push, pull and the harness rule keep a photo Subtle there. The Table page's
  `PersonAvatar` helper drew first-column initials Subtle, which the harness cannot see through: it takes `lead`.
- **Merged in:** main 2268ac11 (#296). BACKLOG.md keeps #296's split and the train closes its last two lines (#293
  archived). The members' three user/designer questions move to BACKLOG-user-and-later.md, as #282's head 720dacee
  has them. #282 is at 720dacee and #294 at e19bb167, both ancestors.

Second `--all` run: PASS (audit 0 new, dark 0 new, behaviour 0, Studio E2E 360 works / 0 broken, Vitest 89/89). I
opened its 12 contact sheets plus segmented, table and chart. The table sheet showed the PersonAvatar slip above, and
the scoped gate on table passed after the fix.
Open (needs the user): an audit check for a table's first-column Avatar seen at runtime would catch helper components
the harness misses. It is a new check, so it waits for approval.

## Giám sát · the user answers four backlog items (library publish, Code Connect, Dock-Icon default, old Figma screens)

The user (2026-10-25): "Publish thư viện là việc ngoài studio không đưa vào backlog". The entry "P3 · Figma: publish
the renamed layers" moved from `BACKLOG-user-and-later.md` to `BACKLOG-archive.md` (text unchanged, with the reason).
"Direct paste into other files" stays in the user's list: it is Studio work that the publish unblocks.
"P3 · Code Connect for Description List" moved to the archive too (user: "Cái này không cần thiết cho studio"):
it only adds Zen code to Figma's Dev Mode panel; Studio pull/push and `map_figma_component` already give Zen code.
"P2 · Metric-Card Dock-Icon Solid by default?" answered: no default change. The user: generated screens still colour
a status card's Dock-Icon by meaning (skills), but no harness binds it, so `metric/dock-icon-by-meaning` left
check-usage.mjs (+ its bad.tsx case) and zen-figma-audit.js; skills and the guideline say it as what generation does.
"P3 · Figma screens older than the 2026-10-24 rules" moved to "Later phase" (user: "sẽ làm sau"), minus the metric part.
"P2 · Direct paste into other files" moved back to BACKLOG.md Open items: the user published the library (2026-10-25).
Two more answers took items back to BACKLOG.md as dev work. Private registry: "giao session làm". Toolbar Search vs
DashboardHeader 320: "ở control bar thì tối đa là 240". Each item gets its own session.

## Private registry: state check, Podman backups, owner runbook (tier S; user: "Dựng registry riêng -> giao session làm")

- Live since 2026-10-14, not waiting on a VPS: `npm.dizai.studio` → 51.79.205.10 (OVH VPS Singapore, Podman), ping 200,
  `@zen-ds/react` 401 without a token, Let's Encrypt until 2027-01-12, `ZEN_REGISTRY_PUBLISH_KEY` set, v0.3.0 (3.8 MB)
  published; the live sign-in page matches `main`. `npm test` in `tools/registry`: 28/28.
- Gap: the Podman deploy had no backups. `backup.sh`/`restore.sh` only spoke Docker (compose volume name, bridge
  network, `docker compose stop`). They now find the Quadlet unit and use `podman`, `zen-registry-storage`, the host
  network and `systemctl`; images fully qualified. `podman/deploy.sh` copies `backup.env` and installs the cron, or
  warns. Dry runs with stub engines/ssh (this Mac has neither Podman nor Docker): both engines, both deploy branches.
- `docs/registry-setup.md` (Vietnamese): SSH access (this Mac has no key; the 10-14 deploy ran from Tung's), R2,
  UptimeRobot, real `npm login`, `npm deprecate` (npmjs also has `@zen-ds/tokens@0.1.0`), choices with
  recommendations (keep the OVH VPS, R2, UptimeRobot, Polar for Phase 6: pays out to Vietnam via Stripe Connect Express).

## Private registry Phase 6: Polar webhook (tier M; user: "Chọn Polar cho Phase 6", then via Giám sát "Phiên làm, developer deploy")

- Where it runs: a PocketBase JS hook in the license store (`tools/registry/pocketbase/pb_hooks/`), deployed with
  `pbc pocketbase hooks push`; no new server. Nothing was pushed to the live PocketBase or Polar (developer's step).
- Design (README "Payments"): `POST /api/zen/billing/polar`, Standard Webhooks signature (both Polar secret formats;
  the key is binary, so SHA-256/HMAC are in JS: `$security.hs256` takes a string key). Every `subscription.*` event
  applies the whole subscription to one `billing_subscriptions` row (created at bootstrap, superuser-only) and its
  licence; older `modified_at` skipped. Owner: `reference_id` / `external_id`, else verified email, else pending until
  that email signs up verified. Terms from product metadata `zen_type`, `zen_max_members` (or seats), `zen_credits`,
  `zen_reset_day`. Active while active/trialing/past_due.
- Tests: `test/polar.test.js` (crypto vs node:crypto, signature cases, terms; then a real PocketBase 0.39.11 with the
  hook: create, retries, upgrade, stale event, cancel/past_due/revoke/renew, bad signature, reference_id, pending →
  verified claim, bare product, incomplete) and one e2e case (webhook purchase → CI key installs → revoke → 403 after
  the cache). `npm test` in tools/registry: 43/43. Probes for the deploy check: no hook 404, no secret 503, ready 401.
- Runbook Bước 5 (Vietnamese): Polar products + metadata, sandbox test against a local PocketBase with
  `polar webhook listen`, production deploy, check, rollback.

## DashboardHeader Search ≤ 240 (tier M; branch zen/feat/dashboard-header-search-240-20261025; slot from Giám sát)

The user: "ở control bar thì tối đa là 240". The Control-Bar Search follows the toolbar cap in code and Figma, and the
three toolbar Search checks stop skipping it.

| Where | Before | After |
| --- | --- | --- |
| `dashboard-header.css` `--zen-dashboard-header-search-basis` | 320px (phone 100%) | 240px (phone 100%) |
| Figma 4122:33401 `Elements > Search/Default` | FIXED 320 | FIXED 240 (Control-Slots x 256, Action-Slots 872 wide) |
| Harness `search/toolbar-width` | Stack, Grid | + DashboardHeader: a width forced past 240 on the search slot's Search or its one wrapper, the slot variable in `style`, a custom row's Search (3 bad + 2 good cases) |
| Audit kind `toolbar-search` (`SKIP_SEARCH`) | skipped `.zen-dashboard-header__search` | checked (self-test: 320 slot found, 240 clean) |
| Figma audit `OWN_SEARCH_BAR` | skipped Dashboard/Header, Header/Dashboard, Control-Bar | only a top bar's centre (Nav-Center, Center-Slot, Leading-Slot, Top-Navigation) |

- **Figma:** the only variant with a Search is Control-Bar. A focused audit of the variant (binding, overflow,
  toolbar width) found 0, and the screenshot looks right. The full 103 KB audit does not fit a `use_figma` call
  (50,000 characters, 46 KB minified), so only the rules this edit touches ran. Not published: the library publish
  stays with the designer.
- **Contract:** re-captured with `mcp-capture` (one chunk, `assemble.cjs`). It also brings in drift from before this
  change: the set descriptions (HTML escapes decoded) and the Action-Item count badge (2XSmall 12px → XSmall 16px,
  Caption/Regular), which `notification-dot.css` already draws.
- **Lock (Giám sát's request: fix the finding in this change):** `contracts.lock.json` had fallen behind the contracts
  on main (58 stale sets, 15 sets missing). Regenerated with `figma-call.mjs lock`; `lock --check` passes (109 sets,
  3339 variants). `lock --check` stays out of CI and the gate: adding it is a new check, so it needs the user's approval.
- **Gate:** `qa --isolated --pages=dashboard-header,app-shell,side-panel` PASS (suite 64/64, Vitest 87/87, audit
  1512/390/320 0 new, dark 0, behaviour 0). I opened its 6 contact sheets: the search is 240 at 1512 and fills its row
  at 390. Merged main 7d95ef7b (#297) and removed the BACKLOG line (archived); then main 4e218464 (#298) and 5c31f566 (#299), registry and docs only.

## Studio performance audit: Chart board and Main component frames (investigation, then the P0 fixes in PR #301)

Measured with Playwright on :5173 (`?ui=studio`, read-only: no inspector clicks, no drafts), a fake React DevTools hook
for render counts and CDP for the load profile. Findings, all reproduced:

- **Chart board never settles.** In the Main component frame five round-chart cells (Donut/Radial, Legend=Start/End or
  Total=Start, Size=Small) flip `data-wrapped` every ~370 ms: `useBesideWrapped` (chartCore.tsx) decides inside a
  max-content cell, so its own answer changes the width it measured (frame 1083 ↔ 1711 px, height 6620 ↔ 6886). The
  Examples and Docs sections jump 266 px ~3×/s; each flip re-renders all 35 cells, FrameChrome and Present (≈1 s of long
  tasks per second at idle). Pan on Chart: 82/82 frames > 50 ms, worst 717 ms. Only the Chart page loops (66 pages swept).
- **`useChartGrow` (Chart.tsx) is zoom-dependent.** It subtracts CSS-px gaps from `getBoundingClientRect` heights
  (screen px, × zoom): at 54 % "Budget used" grows 68 px instead of 156 (empty band under the chart); above 100 % the
  feedback gain is the zoom, a 1 px content change sent `--zen-chart-grow` to 80 788 553 px at 240 % (charts vanish).
- **Layout thrash on load** (Style recalc 14.5 s of 16 s on Chart; 15 s on App Shell): write-then-read measures per
  instance — `placeTip` 5.6 s, `useChartGrow` 3.3 s (runs every render, new ResizeObserver each time), Main component
  `Stage.check` 1.5 s (RO re-created on every render: `children` in its deps), AppShellHeader 6.9 s, AppShell `read` 3.3 s.
- **Selection re-renders every Main component cell:** `SetGrid` reads the whole `state.selection`; one frame click on
  Input re-renders 268 cells (5 118 component renders, 274 ms long task).
- **Off-screen frames cost every pan:** `content-visibility: auto` on `.studio-frame` (injected) took Input's pan from
  40 → 2–4 frames over 20 ms (p95 50 → 17 ms); `will-change: transform` on the world did nothing.

Proposals and priorities went to the user, who approved the P0 group (below).

### P0 fixes (tier S; user: "Sửa nhóm P0 … trên worktree riêng, xin slot QA từ Giám sát, mở PR"; PR #301, slot from Giám sát)

- `useBesideWrapped` (chartCore.tsx) decides in the beside layout every time (the wrapped look is taken off while it
  reads). Main component: Chart/Donut-Chart and Chart/Radial-Chart take their Figma FIXED widths (352–600 by
  Legend/Total/Size, from chart-donut.json / chart-radial.json), so Legend=Start/End shows the legend beside the ring.
- `useChartGrow` (Chart.tsx): layout px (`getComputedStyle` height, as StudioBoard's `frameHeight`); every card on the
  page measured together (all grows off → read → write), which also fixed a lock-in found while re-measuring: two
  cards of a row held each other up, so a card briefly 50 px taller left its row 50 px taller for good (old code at
  any zoom). Children are observed by border box (a padding change was invisible); mounts measure after the commit,
  later changes on the next frame (no "ResizeObserver loop … undelivered notifications").
- MainComponentFrame: `SetGrid` subscribes to its own selected cell key, `Stage` observes once per cell,
  `ComponentSets` is memoised.
- New `tests/interaction/chart-measure-scaled.test.tsx`; on the old code it fails (120 wrap flips, grow off by 135).
- Re-measured on a private :5291: Chart idle 0 commits / 0 long tasks (was 22 / 3.2 s per 3 s); Main component
  height the same at every zoom; grow 10/102/78/156 at 54 % and at 240 % (was 0/39/27/68 and 80 M px); a frame click
  re-renders 0 cells (was 268 on Input); Chart load Style recalc 14.5 → 9.2 s, pan worst frame 950 → 133 ms.
- Gate: `npm run qa -- --isolated --pages=chart --files=…` PASS (static, Vitest 90/90, 33 Chart contract suites, audit
  1512/390/320 + dark + behaviour 0 new, Studio E2E 360/360). Main component Donut/Radial cells shot at 100 %: the
  legends and totals sit beside the ring, as in Figma.
- Left for P1 (not approved yet): `placeTip` is now the largest load cost (6.7 s), AppShellHeader/AppShell measures,
  `content-visibility` on frames; the Inspector still takes ~200–340 ms after a frame click.

## Direct paste into other files (tier L; branch zen/feat/paste-other-files-20261025; BACKLOG P2 via #297)

The user published the Zen library; Studio's ⌘C → ⌘V now lands in any Figma file as library instances. Research doc
`studio-native-paste-2026-10-17.md` §9 has the measurements.

- **What Figma needs (pastes into new team files "Zen paste test …", user picked "Tạo file mới"):** full definitions in
  the paste. Figma builds a component it has not seen from the clipboard and never fetches it by key: a skeleton with
  `componentKey` pasted empty (with or without `sharedSymbolVersion`), a key-only or value-less variable pasted white, a
  key-only text style unbound. Only the used variants are needed.
- **Built:** `native-pack.mjs defsFrom` → `docs/figma-contracts/native-defs.json.gz` (45,854 nodes, 3.4 MB gzipped,
  from the same 18 probe copies as the pack, which a full capture refreshed: `Button/Main-Old` left the library);
  `figma-native.mjs definitions()` + `libraryForm()`; Studio loads the definitions on the first ⌘C (`figmaClipboard.ts`).
  Status copy says "a Figma canvas".
- **Found by real pastes:** slot contents components set had to ride along (Metric-Card, List-Box, charts pasted with
  empty slots); `Infinity` / `NaN` floats became `null` → 0 through JSON (stacked bars flat): stored as text now, and
  `figma-kiwi` writes them back. Two stale test inputs fixed with the refreshed pack: the Expenses fixture's
  `Child-Heading` (Figma dropped it) and the selftest's `Patterns/Sidebar/Density-Medium` (renamed `Patterns/Sidebar`).
- **Result:** Expenses in a fresh file: 615/615 library instances, 225 library variables (6,357 bindings, 0 unresolved),
  277/277 library text styles, layer tree = the Zen file's paste 728/728; screenshot right (stacked bars included). In
  the Zen file the same paste binds to the file's own components, variables and styles.
- **Tests:** `figma-native.selftest` 162 (library form: keys, full layers, nothing named missing, refs resolve, values,
  Infinity kept, skeleton fallback; defsFrom, mergeDefs); E2E HO-18 (library form), HO-19 (full definitions, slot
  contents, Infinity), HO-20 (definitions blocked → Zen file form).
- **Gate (slot from Giám sát):** `qa --isolated --files=<the PR's 18 files>` PASS (static ✓, Studio E2E 360 works; the
  3 new rows broke there: a first ⌘C ran before the read-ahead had loaded the definitions, took the async path and
  Chromium escaped `<!--`; the rows now copy again until the status says the read-ahead path, as a person would).
  After merging main 35d76fcc (#301; session log conflict, both kept): `studio:e2e --rows=HO-18,HO-19,HO-20,HO-12`
  4/4 and `--only=handoff` 19/19.
- **Race found by Giám sát's review, fixed in the product (9ef5427a):** a ⌘C before the frame's Figma export was read (a
  session's first copy also loads the definitions) wrote the html with an async clipboard write, which escapes `<!--`:
  Figma's canvas pasted nothing (older than this PR, longer with the definitions). Now the code goes at once and both
  go in a copy event of their own once read, within the key press's 3 s (`copyFrameWhenRead`, as the frame menu's Copy
  for Figma); frame ⌘C and a Screen layer's ⌘C; `isCopyingForFigma` keeps the frame keys off that event. HO-18 copies
  once, at once, in a fresh Studio ("one ⌘C before the read-ahead (written once read)"). Rows HO-18/19/20/12 4/4,
  handoff 19/19, frame-key rows B-39 + FW-106/153/154/192/195 6/6, `--only=figma` 195/196 (FW-186, Pick color, timed
  out in the group and passes alone).
- **Cleanup:** probe frames and test frames removed from the Zen file's QA page. The scratch files "Zen paste test",
  "(target)", "(target 2)", "(target 3)" stay in the team for the user to delete.
- **Not mine, noted:** the Zen plugin's ⌘V import hung once, and in a non-Zen file gave a partial frame (plugin repo); it draws no "Other"
  segment in the Expenses stacked bars where the direct paste does.

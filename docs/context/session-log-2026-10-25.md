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

## Studio performance audit: Chart board and Main component frames (investigation only, no code change)

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

Proposals and priorities went to the user; nothing is changed until they approve.

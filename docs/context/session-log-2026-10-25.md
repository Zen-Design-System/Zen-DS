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

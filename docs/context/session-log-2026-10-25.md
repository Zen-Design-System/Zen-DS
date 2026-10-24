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

# Session log — 2026-11-26

## Audit: card titles at 390 dark keep Figma, baselined (tier XS, branch zen/fix/card-title-one-style-20261126)

CI's dark audit on main warned `outline-siblings` on chart@390-dark (Finance dashboard: "Revenue" body-extra-medium
beside "Waiting for payment" heading-subheading) and templates@390-dark (Dashboard: "Billable hours by team" beside
"Recent activity").

- Source: the ChartCard title, `Chart.tsx` `zen-chart-card__title`, is Body/Extra/Medium as in Figma (Chart Card ›
  Header › Title, `docs/figma-contracts/chart-card.json`). The ListBox and Card titles beside it are Heading/Subheading.
- The user chose "Baseline, giữ như Figma" for this warning on 2026-10-21 (commit 43bb55a7), and again on 2026-11-26.
  The keys were there for 1512, 390, 320 and 1512-dark; only 390-dark was missing. CI's dark run covers 1512 and 390.
- `tools/platform-audit/quality-baseline.json`: the two 390-dark keys, total 139 → 141. No UI change.

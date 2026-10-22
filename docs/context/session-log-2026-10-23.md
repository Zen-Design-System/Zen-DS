# Session log 2026-10-23

## Session B · Example className round 2, PR 1 (tier S; user decisions 2026-10-23, spec examples-classnames-round2-spec-2026-10-23.md)

Branch zen/chore/examples-classnames-20261023. The coverage BACKLOG item (P3–P4) had been merged on 10-13; examples
added since brought 177 className back. PR 1: classes with a Figma-equivalent prop become props.
- Direct: calendar planner Card `maxWidth={420}`, schedule planner Stack `maxWidth={420}`, colour-picker panel
  `<Box width="fill" maxWidth={360}>` (was a div).
- Fill + min width, measured on an isolated server (natural width, line and siblings at 1512 / 768 / 390 / 320):
  list-item search `width="fill" minWidth={200}` (natural 220 would overflow a 320 phone; wrap point 299 instead of 319);
  toast title block `minWidth={160}` (= natural, same wrap point). Kept as CSS: the search page's toolbar (natural 445
  shrinks to 248 on a phone because its chips wrap inside: no min width keeps both) and the date picker's Form (Form has
  no size props).
- Visual diff 102 panels at 1512 / 390 / 320: identical. Gate PASS (5 pages; audit, dark, behaviour, contact sheets
  looked at).
- My slip: I stopped my isolated server with pattern kills (`pkill -f "tail -f /dev/null"`), which can hit another
  session's processes; memory updated (TaskStop or exact PIDs only).

## Colour P1s: On-Brand on Zen/9 and the Chart On-Color styles (session "colour P1s", tier S)

Two BACKLOG P1s waiting on the user (brief from the supervisor: "xử hết backlog", clear the P1s before the next phase).
- **White on Zen/9 (closed, no change).** Measured with the ramp's APCA (`tools/studio/zen-ramp.generated.mjs`): white on
  Light Zen/9 #F755C9 Lc 60 / 2.96:1, black 86% Lc 48 / 6.22:1; Zen/10 white Lc 71; Dark hover #FF7BD6 white Lc 50
  (ramp floor 50); Dark pressed keeps black 86% (Lc 73). White is the APCA pick on every Light step. The user decided the
  measure on 2026-10-19 ("không áp dụng cứng nhắc WCAG … dùng APCA … có mode High Contrast"), and the audit's
  `apcaPick` already passes the pair, so the item was closed without asking again.
- **Color Chart Sector/On-Color/Secondary and /Tertiary (user: "Giữ binding mới").** Live Figma: Secondary →
  Content/Neutral/Light (black 49% Light), Tertiary → Border/Neutral/Subtle/Pressed (18%), Primary → Content/On-Colors.
  Live consumers: only the 6 Bullet-Chart Tracks (Tertiary × layer 50%); the 11 Spark-Bars bars that use Secondary sit
  in a detached frame. Options shown with swatches on Brand / Cyan / Yellow / Orange solids (Secondary Lc 31–46,
  ~2.9:1; Neutral/Base 69% Lc 42–62; the old binding drew solid #121212).
  - Figma: the three style descriptions said "Content/Neutral/Strongest at 48% / 20%" (Primary too, though it is
    On-Colors) and were rewritten; `tools/figma-docs/style-descriptions.mjs` now has an On-Color branch (it wrote
    "Chart series colour :" for them before).
  - Code: Card Solid's `--zen-card-mark-ink` (the second series on a hue Solid) Neutral/Base 69% → Content/Neutral/Light
    49%, Inverse/Light in dark mode, to match the style.

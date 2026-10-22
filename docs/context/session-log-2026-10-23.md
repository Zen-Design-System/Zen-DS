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

## Session C · Figma-parity leftovers (tier S each; Giám sát's queue, plan studio-figma-design-parity-2026-10-18.md)
Branch `zen/fix/studio-parity-leftovers-20261023`; both BACKLOG lines archived.
- ⇧⌘G on several layers (BACKLOG P2): `ungroupLayers` in edit/groupLayers.ts ungroups every selected group or frame,
  the last in the code first, each once the canvas drew the one before (it reads its layers' places there); other
  selected srcs follow each write (`mapSrc`); the writes are squashed into one ⌘Z. The canvas menu offers Ungroup on
  several layers. E2E FW-220 (two seeded groups → four shapes in place, all selected, one ⌘Z).
- An instance's data-name (BACKLOG P1 leftover). User's choice (AskUserQuestion): the accessible name first. Push:
  an instance named by its component takes the data-name as its Figma name (`nameGiven`); an aria-label keeps the name
  (note), IconButton never (layer-meta `LABEL_NAMED`). Plugin (studio-import c95084e): plugin data "name" (what the
  import wrote) and "given". Pull reader: `nameGiven` when given or renamed in Figma since; pull writes data-name only
  then. A first try reading every non-default instance name made the library's own names ("Item", "Main") data-names
  on a live Zen screen and kept a padded wrapper: dropped.
- Real Figma (QA page): the import wrote name/given as planned; the real reader marked given ✓ / plain ✗ / renamed in
  Figma ✓; pageFromFigma gave `<Use data-name="Hero note">`, `<Use>`, `<Use data-name="Renamed in Figma">`. Test frame
  removed. Selftests push 402, pull 130, layer-meta 15, plugin `npm test` ✓.

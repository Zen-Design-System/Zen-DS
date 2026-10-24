# Harness inventory: documented rules nobody checks (2026-10-24)

BACKLOG Tooling, items 1e and 1f. The user decided on 2026-10-24 that these are an inventory only, with no new rule yet.
Each candidate below would become one usage-guard rule (S each, with an `expect:` case in `fixtures/bad.tsx` and a clean
case in `good.tsx`) once the user picks it.

## 1e · A bare `<Container>` around a non-Card Table

`Container` (src/components/Layout) is the page-width wrapper (max width + gutter). A Table placed straight in it
has no surface, title or frame around it.

I scanned every `.tsx` under `src/` (platform examples, templates, Studio) for a `<Container>` whose children hold a
`<Table>` but no `<Card>`. There are **0 cases**. A rule would guard nothing today. Revisit if one appears, or fold it
into the "table without a container" candidate below.

## 1f · AI readiness: documented but unchecked

- **The guidelines overall:** 71 guidelines, 887 Do/Don't lines.
- **Lines that name a check:** 161 name a harness rule (`harness: …`) or an audit check (`audit: …`).
- **The rest:** mostly judgement (copy, hierarchy, when to pick a component) that a static scan cannot see. The
  candidates below are the ones a rule could catch.

| Documented rule | Where | Checked today | Gap |
| --- | --- | --- | --- |
| Grouped lists: on a phone settings or profile screen, each group of rows is its own inset ListBox block with a kicker above it, never thin kickers over one long run of rows | usage rules §15, example brief §3c | `listbox/closing-list-on-phone` (only the page's closing list) | Several groups under kickers in one block or on a bare screen |
| A table sits in a container that names it (Card or ListBox with a title) | table guideline | `table/needs-name` (an accessible name only) | A Table with no surrounding surface (see 1e: no case today) |
| Phone Chips, not Segmented: when a Segmented's labels don't fit their equal share on a phone, use a single-choice Chip row | segmented guideline Do/Don't | `segmented/control-bar-full-width`, `segmented/option-count` (count only); the runtime `fit` audit sees the overflow | A static "phone + Segmented + more than N options or long labels" warning |
| Elevation follows the Sidebar | usage rules | `theme/mixed-elevation` + `theme/navigation-surface` | None, covered |

Unchecked Do/Don't lines per guideline (top 10, from `docs/guidelines/index.json`):

| Guideline | Unchecked lines |
| --- | --- |
| list-item | 28 |
| input | 26 |
| top-navigation | 22 |
| layout | 22 |
| sidebar | 21 |
| chat | 21 |
| chip | 18 |
| table | 17 |
| dialog | 16 |
| card | 16 |

Most of these are judgement, not rule candidates.

**Next:** the user picks which candidates become rules. The three above are the ones the BACKLOG's AI-readiness list names.

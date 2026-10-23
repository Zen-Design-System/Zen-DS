# Session log 2026-10-24

## Session B · Studio editor group of the planned backlog (tier S; user: "Giao 35 mục theo đề xuất … Phần không cần quyết làm ngay")

The group's six entries (BACKLOG rewritten in #262), each checked against the code first:
- **Drafts live push** (built): the dev server sends `zen-studio:drafts` over its HMR socket whenever the drafts change
  (`persist`) or a drafted file changes on disk (`diskChanged`); `sourceDrafts.ts` reads GET /drafts at once. E2E D-07:
  a draft written by the API (another client) and its discard show in the tab's drafts button within 2.5 s.
- **Resize leftovers (2)** (built): a `.map` row's resize previews every row it draws (`copiesOf`: the same
  data-zen-src in its frame; restored with the drag). E2E DA-10 (drag without release, all rows alike, Escape writes
  nothing).
- **Ungroup E2E** (built): ST-28 groups Favourite with Share from the Inspector's item row, then takes Favourite out
  (ungroupItem: a group of one is no group, Favourite keeps its place).
- **Resize leftovers (1)**, **slots (a)**, **slots (b)**, **per-row override**: questions for the user (sent to the progress
  session as one list). Slots (a) turned out not to be told apart by text: a remove + insert of a same-named element
  in its place and an edit of the original's words give the same draft, byte for byte.
- **Link folder**: a hand check in Chromium (an OS folder picker), asked of the user with the list.

The user's answers (through the progress session, "Theo đề xuất"): resize (1) stays as Figma does it, slots (a) closed,
slots (b) A built and B not (computed `.map` rows keep "edit it in the code"), no per-row override (relabelled).
- **Slots (b) A** (built): `constChildUse` (slots.mjs) finds the `{…}` child unit that shows a const through a condition
  (`childUnitAt` on each read), the one at the Studio's `parent` when the const is read elsewhere too; two at one holder
  are refused by name. `describeSlots` lists a condition's const elements, so the client's `constHolderOf` and
  `readBlock` place them. `slot-audit --op=move`: 22 → 4 refused (ai-ui `field`, shown twice in one Stack). Selftest
  +16, E2E ST-29 (fixture ConstFixture: Send backward on `{view === "list" ? note : null}`, `trailing={note}` stays).
- **Per-row override**: editability-audit's three "B4" classes name what the Studio edits (I-09, I-10, I-11).

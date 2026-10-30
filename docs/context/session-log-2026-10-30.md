# Session log 2026-10-30

## Session "Studio: popover option" · Popover as a default option of a clickable layer (tier M; user 2026-10-28 via Bug)

- Ask (verbatim): "popover nên là 1 option mặc định trong các component có thể mở popover. user chọn rồi bật nó có hiện
  popover khi click không. Bật thì cho chọn loại data hiển thị bên trong là gì, bao nhiêu dòng hoặc từ data nào."
- Before: a popover took 5 steps (Add overlay offers Dialog / Sheet / Panel / Card only → drop a Popover in → Position
  Manual → On click › Open overlay → edit its rows in the overlay frame). Chip already had its own `popoverItems`.
- Asked (AskUserQuestion with an inline mock of 4 pictures: today vs proposed, content kinds, data sources, which tab).
  Answers, all the recommended picks: every layer that takes a click (a Chip uses its own popover) · Options only (not
  Menu, Text, Data rows) · Sample + the page's `export const mock` (not project-wide data) · both tabs.
- Built (`builder/proto/`):
  - `popoverModel.ts` (pure, selftest 24): which layers take it (`takesPopover`: an On click, not a frame; Chip by its
    own prop), the mock's lists of objects (`mockLists`: text fields, picture fields, whether rows have ids), Sample
    labels, the items code (Sample: `{ id: "option-1", label: "Option 1" }`; mock: every field a reference,
    `label: mock.people[0].name`, the dialect has no `.slice` / `.map` in props), reading it back (`popoverDataOf`), the
    Overlay code (`<Popover items={…} onSelect={proto.close()} />`), openers of an Overlay, a free `popover-N` id.
  - `popoverEdit.ts`: on = insert the Overlay last on the Board + set On click to `proto.open("popover-N")`, squashed
    into one undo step ("Add popover"); a Chip gets `popoverItems` (+ `dropdown` when unset). Off = remove the click and
    the Overlay when nothing else opens it (the later of the two in the code first, so the other's loc holds), one step;
    a Chip loses `popoverItems` and `onPopoverSelect`, keeps its chevron.
  - `PopoverRows.tsx`: Data (Sample, or `people (3)`), Rows (1–12; a mock list at most its length), each Sample row's
    words, or Label / Caption / Picture fields of a mock row. `PopoverSection` (Design tab, after the properties: a
    switch; "Replaces what a click does" when the click held another action) and the Prototype tab's TriggerRow (On
    click › **Open popover** next to Open overlay; the same rows under it; leaving it takes the Overlay away).
- Not done (not chosen): Menu / Text / Data-rows content, project-wide data, a "Popover" entry in Add overlay.
- Question for the user (QUESTIONS.md): Zen's Avatar takes no click, so it has no Popover option; give it `onClick`?
- E2E: PT-49 (Design switch on a Button, Rows, row words, Play by the trigger, a pick closes, off), PT-50 (Prototype
  Open popover replaces Navigate, rows from mock.people, caption, Design shows it on, Play lists the people, None
  removes it), PT-51 (Chip's own popoverItems + chevron, Play pick, off keeps the chevron).

# Session log 2026-11-19

## Code view P2b PR3: portable examples, controls and forms (tier M; Giám sát session)

User: "Do this task here: Code view P2b PR3" (plan §11 slice 3). Branch `zen/feat/code-view-p2b3-20261119`, worktree
`.claude/worktrees/p2b-pr3`.

- 92 examples of Button, Input, Checkbox, Radio Button, Toggle, Slider, Slider Field, Segmented, Search, Color Picker,
  Color Selector, Uploader, Form, Date Picker and Calendar moved to `examples/pages/<page>/<slug>.example.tsx`; five
  agents (three pages each), one review pass here. All twelve page CSS files went. Baseline 417 → 325 code strings
  (`examples:check -- --write`); 180 example files compile as copied.
- Demo world: `videos` (canyon timelapse; `demo-vectors.mjs` loads `.webm` as empty) and `calendarEvents` (the review
  moved the 20 events each Calendar example had copied).
- Review fixes: two Toggles wrapped in a hidden-legend FormFieldset to fill/hug (an extra screen-reader group) → a Stack
  with `align="stretch" fillChildren`; the Early access table lost its 760px minimum at 390 (cells cut) → `Box
  scroll="x"` + Table `minWidth: 760` (390 panel identical again).
- Visual diff (224 panels, 1512 + 390): 185 identical; changed = the phone examples on AppShell (page margins, one device
  label per example), "Search during an import" (opens on the finished import: an effect started it before), Kickoff
  files' seeded upload (starts on first pointer/focus, so the capture no longer catches it moving), the Đìzai Studio mark
  in desktop frames (Thumbnail 2xs, as PR2), anti-aliasing (≤ 21 px).
- Costs logged: radio cards select from the radio row (the `::after` cover was page CSS), focus targets where a
  component gives no ref (Slider wraps, ColorSelector, FileUpload) → BACKLOG-user-and-later P2 refs line.
- Checks: tsc, examples:check, usage:check (0 portable-subset warnings in the new files), usage:selftest, style:check,
  studio:selftest, guidelines:check, mcp:selftest; gate `qa --isolated --only=<15 pages>`.

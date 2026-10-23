# Session log 2026-10-24

## Components group of the triaged backlog (tier M; user 2026-10-24 via the coordinator: "Giao 35 mục theo đề xuất … Phần không cần quyết làm ngay; phần cần quyết gom lại hỏi tôi một lượt")

Branch zen/fix/components-backlog-20261024 from main 6e4e6605 (worktree festive-archimedes-176df5, beside PR #248's
queued gate). The 9 Components entries of PR #262's triaged BACKLOG: what needs no decision is built; the decisions
went to the coordinator as one list.
- ModalForm `header={false}`: the title stays the modal's name as a visually hidden heading, the unshown description is
  no longer referenced; new `aria-label` / `aria-labelledby` (labelledby wins). Interaction tests in dialog-modal.
- Nits: ProgressCircle `decorative` (HR Tasks' status marks; harness progress/needs-label accepts it, good fixture);
  Table `currentRowId` (aria-current + Selected fill; six templates and the Side Panel files example moved off
  `selectedIds` for the open row); Popover / Menu keep their opened edge and clamp from it (resolveAnchoredAlign no
  longer flips while open: a 64px jump at anchor x 278 in a 390px window); TextArea `:read-only, :disabled` no grip;
  Chat ring radius per bubble shape (`--zen-chat-ring-radius`); onJumpToReply documented for threads that load older
  messages (jumpToChatMessage returns false when the original is not rendered); Breadcrumbs plate bleed = Figma, noted.
- Toggle docs: platform visuals, playground and its PlaygroundToggle on checked / onCheckedChange; JSDoc cites
  Toggle-Button 1523:104 and Toggle 1526:5703.
- Card: `--zen-card-shadow` set with an alt `--zen-card-surface` (platform .pe-shell[data-canvas="alt"]);
  surface="default" resets it. Test in card-color.
- Phone targets: 44px `::after` hit areas under `[data-breakpoint="mobile"]` for the ChartCard Open button, the Metric
  header action and Pagination's xs arrows (outward only: `data-arrow`), zen-allow-slot-size (no 44 token). FileUpload
  `buttonSize`; Settings template uses md on phones.
- DatePicker: Event-List read in Figma (510:36577: 4px dots, Gap/3XSmall, Content/Accent/Light, On-Selected
  Date-Picker-Item/Content/Selected); `event` count, Calendar passes counts. Cells/panels from
  --zen-select-item-size-medium|small (Compact 32/24, Comfortable 40/32, Studio 28): tests in calendar.
- TopNavigation: Figma check — Header-Trailing holds `.Primitives/Top-Navigation/Mobile/Nav-Slot/Action` (6340:42675)
  like the bar, its Nav-Action has Trailing-Icon / -2, so `largeTitleAction` pairs a `group` (groupedPlaces); the push
  mirror (figma-top-nav topNavActions) groups the lead too and notes it.
- Decisions sent to the coordinator: TopNavigation new props, Menu/Chip phone sheet, AdminList bar → bulkActions,
  Table add-row (recommend close), Sidebar headers (recipe), designer: Card Default hover/pressed, Table hover on
  non-clickable rows.
- Checks: tsc, usage:check / selftest, style:check, guidelines / ai-ui / Studio maps rebuilt, push / pull selftests,
  vitest dialog-modal, anchored-position, popover/menu files, card-color, component-fixes, calendar + date files,
  navigation / top-navigation-parity / liquid-glass. Gate: pending its slot from Giám sát.

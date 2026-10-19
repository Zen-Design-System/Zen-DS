# Session log 2026-10-19

## Studio frames, presets, sections — F4 (Session C of the parity plan; user: "chia session làm có nhanh hơn không?" → "ok") — tier M, worktree `.claude/worktrees/compassionate-hertz-fda2db`, branch `zen/feat/studio-f4-frames-20261019`

Plan `docs/research/studio-figma-design-parity-2026-10-18.md` §5 F4, built on the AppShell session's frame picker and
device simulator (#134) and on F1 (#139).
- **User's answers (2026-10-19):** the Frame tool behaves as Figma's ("Như Figma": a click makes a 100 × 100 frame at
  once, the presets live in the right panel; the click menu of 2026-10-18 is gone) and the presets are Figma's whole
  list ("Đủ nhóm Figma": Phone, Tablet, Desktop, Presentation, Watch, Paper, Social media; Zen's devices first in their
  group, a Zen device that shares a Figma name takes Figma's name of its size: Desktop 1512 × 982 = MacBook Pro 14").
- **Presets:** `screen-devices.mjs FRAME_PRESET_GROUPS`; `builder/FramePresets.tsx` (Disclosure groups, the Inspector's
  Design tab while the Frame tool is on); a preset frame goes beside the selected frame, else right of the right-most
  frame (top-aligned), else in the middle of the view (`frameMove.placeInView`), then into view (`revealFrame`). Drawn
  and sized frames are named "Frame N" (the Prototype panel's Add screen keeps "Screen N").
- **Resize and fields:** `board/FrameHandles.tsx` (8 handles on a selected Screen or Section of a page you made, ⇧
  ratio, ⌥ from the center, ⌘ no snapping, live size pill, Esc; only the changed fields are written, one edit) and
  `builder/FrameGeometry.tsx` (Position X / Y, Layout W / H with Figma's number fields; an Overlay's W / H read only),
  both writing through `frameEdit.setFrameBoxes`. The view-only Width (Inspector › Frame, the toolbar's width menu, the
  right-edge drag) stays for example frames only. A Screen's H is the least it takes (content may keep it taller).
- **Sections (decision: beside the frames, not around them):** `<Section id title x y width height />` is a Board
  child (dialect `SECTION_SIZE`, `boardSections`, `sectionCode`; runtime `Section` renders nothing outside the Studio),
  drawn first (behind) by `builder/SectionFrame.tsx` as a frame of kind "section" (`data-studio-frame="section:<id>"`),
  so selection, Delete, ⇧2 and the name label come from the frame code. What a Section holds is read from the board
  (`board/sections.ts`: the smallest Section a frame's middle lies in) — a frame dragged in or out needs no write.
  ⇧S / the Frame button's menu (Frame F · Section ⇧S) draws one (a click: 400 × 400); dragging its name moves its
  frames along (one edit); Delete takes them (`removeFrames`, one edit), ⌘⌫ keeps them; right-click a frame › Wrap in
  new section (80 px around); its name is a pill inside its top-left corner, renamed by double-click (`title`). Figma
  push sends one Screen, so Sections are noted "not pushed". Not yet: ⌥-drag copy of a Section with its frames.
- **N / ⇧N:** `board/frameOrder.ts` (reading order: rows by top, each left to right), select + zoom, wrapping.
- **Pages order and dividers:** `builder/store/pageOrderStore.ts` (IndexedDB settings "pageOrder", one order per list:
  a folder, or the pages in no folder of a project / Drafts); pages the order does not name come after, oldest first
  (the list no longer follows the last edit); `StudioFolders.tsx PageList` drags rows (another list: the page moves to
  that folder), Add divider in a page's menu, Delete divider in the divider's.
- **Keys / words:** ⇧S, N, ⇧N out of `figmaNotYet`; Shortcuts (Section, Zoom to next / previous frame, ⌘⌫); Actions
  (Frame, Section, Wrap in new section, Zoom to next / previous frame). Words lint ✓.
- **Shared-file edits (announced):** Inspector.tsx (presets mount), FramePanel.tsx (Section panel route, X / Y / W / H,
  Width for examples only), FrameChrome.tsx (Section labels, handles, no width menu on page frames), layerMeta.ts and
  rename.ts (`section:` frames), marquee.ts (a Section is no marquee frame), StudioApp.tsx, CanvasMenu.tsx, CanvasTools.tsx.
- **Tests:** `board/sections.selftest.mjs` (12), dialect selftest +7 (Section), `studio:selftest` ✓, tsc ✓. E2E: B-20,
  B-45, B-46, PT-15 moved to the presets; Figma walk FW-40…49 (presets, click, handles, fields, Section draw / move /
  delete / wrap, N / ⇧N, Frame button menu, Pages order + divider after a reload).
- **Runs (after merging main 5918b309: F2, F3, Bug):** full Studio E2E 336 / 336; `--only=figma` 51 / 51; CI quick steps
  (usage, guidelines, ai-ui, mcp, style) ✓; gate `npm run qa -- --isolated --files=…` PASS (third run). The first two
  gate runs caught B-20, both fixed: a frame just added was selected before the board showed it, and the board's next
  render of the row-pinned text cleared the selection (now `board/frames.ts selectFrameWhenShown`, for addFrame,
  addSection and copyFrame); the row now reads the Screen tags exactly. FW-49 once lost the page order on an instant
  reload: the order is now written before it shows.
- **Seen, not F4 (main has it too):** the builder / prototype / starters / main / device E2E groups log 19× "[Unhandled
  error] ResizeObserver loop completed with undelivered notifications" (Vite forwards it; every row passes); same count
  on main 5918b309. Told Giám sát.

## Main component for every component + count rule + Code properties (tier L, session "Bug")

User: "làm tiếp phần còn thiếu của main component" · "Bug UI của studio" (Code properties rows flush to the panel edge)
· "Luôn ghi vào harness và rule là các badge dùng số đếm luôn dùng badge counter".
- Main component: `mainComponent/samples.ts` (drawn-only samples: parts, Chat, Popover open in place, Toast, Dashboard
  header with every type's props, the 5 modal overlays open); variant-sets-build keeps sets without an axis (one cell);
  map `main` for List-Item Default/Selected, conversation call rows ("" = no prop), DatePickerSheet mode. Row sets
  (Dashboard header) at 1232, first axis down the rows; open Popover static in a cell; Uploader photo by zen-media key.
- Modal overlays: internal `OverlayPreviewContext` (_shared/overlay.ts) skips useModal's effect (focus, Tab trap,
  Escape, scroll lock, inert outside); the cell is a `[data-zen-overlay-root]` screen with `contain: layout paint`.
  Toggles keep a sample's own value when on (Bottom Sheet title).
- E2E BL-02 now fails a component with Figma sets that is not drawn; the sweep re-opens a page once (Vite re-optimize).
  board: 1202 variants on 42 pages; main/inspector groups 27/28 (MC-08 red only for the uncommitted Segmented contract,
  as its memory says).
- Count rule: harness `badge/count-uses-counter` error, new `badge/count-text-uses-counter` (span/Text with a count
  class and a lone count) + fixtures; component-usage-rules §18; Badge guideline; Figma audit `badge/count-uses-counter`
  (live rolled-back test: Badge "12"/"99+" flagged, "Live" and Badge-Counter not); screen-rules row. Studio counts in
  StudioFolders, AssetsPanel (3), VariablesWindow (2), CodeProperties → BadgeCounter xs Neutral Subtle.
- Code properties: `placement="panel"` (DesignPanel frame/text/shape) insets 12 like a section; body grid gap 8.
  Measured: rows 1196–1492 like a section's, chevron 1208, divider full width.

## Bottom Navigation from Figma to Studio (tier S, session "Bug"; user: "Update bottom navigation từ Figma lên Studio")

- Live read (❖ Bottom-Navigations (Mobile) 4060:20144): public sets unchanged (Default · Floating · Floating-Glass,
  CTA boolean, item slots); Floating's Action = `.Primitives/Bottom-Navigation` Theme=Primary, Floating-Glass's = Glass.
  Code defaulted a floating action to "default" (white) → now Primary unless floating-glass.
- Studio: map CTA → `action` toggle (`{ icon: "icon-plus-line", label: "New" }`); variant-sets-build turns code toggles
  into values (9 object toggles now drawn: actions, saved colours); Main component: FIXED_WIDTHS 390 for the three bars,
  a 4-tab sample (selected solid, others line, an Inbox dot). B-28 failed once in the full gate run (selection timing),
  passes alone.
- Progress (user: "progress … đã update từ Figma lên Studio rồi đúng không?" → "Nền nó đang là trong suốt, trên studio là
  nền xám"): #128 had the Studio side; the live Progress-Circle/Icon Base now has no fill (2px ring only, all 14
  variants) → progress.css background transparent. Done=No pies differ per theme sample (20–85%); Accent/Neutral keep 80.
  The user's Studio (:5174, Vite from 2026-10-16 in the shared checkout) serves the new code: a reload shows it.

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

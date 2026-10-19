
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

## Studio F9a — vectors (Session A, worktree `../Zen-DS-f9`, branch `zen/feat/studio-f9-vectors-20261019`)

Spec card `docs/research/studio-f9-vectors-spec-2026-10-19.md`; the user chose `pathkit-wasm` and live boolean groups
(both F9b).
- Library: `Shape type="vector"` (`d` in absolute M / L / C / Q / Z, `viewBox`, `fillRule`); geometry.ts
  `parseVectorPath`, `vectorPathData`, `parseViewBox`, `vectorBounds` (curve extremes), `fitVectorPath` (selftest 12);
  defaults as Figma's Pen (no fill, Border/Neutral/Solid, centred stroke). Harness `shape/vector-path` (+2 bad, 1 good).
  Guideline, docs/api, AI catalog, compile API, keywords regenerated; two examples (Pencil underline, Pen logo mark) and
  the playground's vector.
- Studio: `draw/penModel.ts` (pure, selftest 23: corners, smooth points, ⇧ 45°, Schneider curve fit for the Pencil,
  sub-paths with handles, move point / handle (mirrored), remove point), `draw/penTool.ts` (P / ⇧P, overlay, one
  `pasteCode` per vector; drawTool.ts now exports targetAt / localOf / screenOf / snapTargets), `select/VectorHandles.tsx`
  (Enter / double-click vertex edit: live `d`, one write with the new bounds and the box moved; turned vectors keep
  their box). Tool bar Pen split button, CanvasStatus hints, Shortcuts, figmaNotYet without Pen / Pencil.
- Figma: push `VECTOR` + `vectorPaths` (fitted to the size); pull VECTOR → Shape vector (unreadable paths noted and left
  out); plugin `studio-import.js` builds a Shape VECTOR (plugin commit fc18ba7, its test extended). Selftests: push 296,
  pull 81, layer-meta 12.
- E2E figma FW-115…118 (Pen closed, Pen curve, vertex edit, Pencil) written; run once the gate slot is free.

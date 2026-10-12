# Session log 2026-10-12

## Core-rebuild plan leftovers: dashboard walk, design words, Figma Actions column, AiChatBubble layers (session "Kiểm tra tiến độ plan", branch zen/feat/studio-design-words, tier M)

- User approved items 1–5 of the plan's remainder; merged PR #21 (Chip layer names) at the user's request after CI
  passed (7c99cfe). Work in worktree `Zen-CodeBase/Zen-DS-words` from that main.
- **Dashboard walk rerun (criterion of M4):** the 2026-10-10 script (`dash-walk3.mjs`) on the E2E harness server:
  27/27 steps, no refusal (19 operations + sub-steps). The earlier "?" rows were the script's: the multi-selection now
  reads "3 layers" (was "×3"), and three cards with one label hid the drag / → reorder; with distinct labels both work.
- **Criterion 7, design words on Studio pages:** `src/platform/studio/words.ts` (`designWords`, `codeWordsIn`, glossary:
  layer, layers inside, property, list, From data: person › photo, set in code, shared properties, id) and
  `useWords.ts` (`useWords`/`speak`/`useStudioPage`: on only while `state.localPage`). Applied where a designer reads:
  the Inspector status line (text + details), `InspectorRow` hints and label tooltips, section notes, the ƒ bound mark,
  bound values ("data: person › theme"), value kinds (Action, List, Group of values), sizing tooltips, part / slot /
  selection / object / table-cell notes, insert-picker warnings. File:line: the canvas tag, Layers tooltips and the
  multi-selection list show none (`picker.ts srcMeta`); the Inspector header and the part/cell code links read "Show
  code"; the Code tab keeps the highlighted lines. Example and template pages keep the developer wording (and the
  selftests that pin it). `words.selftest.mjs` (in studio:selftest): 22 rewrites + every message the engine and the
  Studio write (487, read with Babel) come out with no code words. E2E B-35 (new): status, tag, header, notes and 5
  tooltips clean after an insert, ⌘D and a refusal.
- **Figma Actions column (M6 leftover):** Table `content: "actions"` + column `actions` (`TableRowAction`), drawn by
  `RowActions` as Figma's Actions-Cell (IconButton flat, Medium Primary default, nested layer `Button`, aria-label via
  new label key `rowAction` en/vi; not editable in place). figma-pull: Actions-Cell → that column from the first row's
  buttons (name from the icon: chevron → Open, dots → More actions, edit, trash…); a row's own icon/size/level → its
  override `Row[row-N]/actions/Button`. Studio cell Content lists Actions (starts with Figma's dots-vertical button).
  figma-pull selftest 48 (+1), NO-21 now 6 columns and 9 "Open, row N" buttons; Vitest nested-overrides +2.
- **AiChatBubble:** `overrides` prop; actions are `nest("Button", …, index)` inside each Tooltip (its handlers sit on
  the anchor span, so the layer between keeps the tooltip: Vitest checks focus → tooltip "Like" + aria-describedby);
  children through `nest.slot`.
- Docs: guideline Table (Cell content, row actions), docs/api regenerated (table, ai-chat, provider labels),
  compile-api.generated.mjs.

## Design words everywhere; Date field's Leading-Icon read in Figma (session "Kiểm tra tiến độ plan", branch zen/feat/design-words-everywhere, tier M)

- PR #22 merged (9207125) after CI. User: "trong figma không thấy chỗ nào để leading-icon"; design words on example and
  template pages too: OK; Q4 and Q5: OK.
- Date field, read live (`use_figma`, read-only, `skipInvisibleInstanceChildren = false`): `Field › Container ›
  Leading` (hidden) and `Trailing` (the calendar; its own icon layer is the Leading-Trailing primitive's `Leading-Icon`).
  The M7 note "Figma names it Leading-Icon" was a misread: the code's `Leading`/`Trailing` match; nested-paths' DateField
  reason now says hidden (like the other fields); the designer item left BACKLOG.
- `useWords` / `speak` always speak design words; words.ts keeps a repo file's name and drops its line (`LINE_REF`), drops a
  Studio page's file (`PAGE_REF`). Inspector header, part and cell links read "Show code" everywhere (copy-location stays
  for repo files); canvas tag, Layers tooltips, multi-selection list and slot rows show no line; nested shared label
  names the file. `data-inspector-src` on the Inspector header: E2E `waitInspector` reads it (was the "file:line" text).
  E2E I-31 (new): an edit on the uploader example — status "Draft · uploader.tsx · ⌘S to save", tag "Button", header
  "Show code", tooltips clean.

## Figma push P0 (Q4) (session "Kiểm tra tiến độ plan", branch zen/feat/figma-push, tier M)

- Spec `docs/research/studio-figma-push-spec-2026-10-12.md`; the user chose the Zen plugin, Import free / rebind
  licensed, the plugin folder in local git. P0 (repo only): `figma-push.mjs` `figmaFromPage` (the inverse of
  `pageFromFigma`, same JSON), `figma-steps.mjs` (shared steps), `nested-layers-build.mjs` → `nestedLayers.generated.ts`
  (nested-paths now records each nest() layer's component), `figma-push-cli.mjs`. Selftest 18 (round trips); both in
  studio:selftest. P2 items are noted on push (Overviews: Sidebar / DashboardHeader slots, absolute layers).

## Figma push P1: plugin Import from Studio + Studio Export › Figma (session "Kiểm tra tiến độ plan", tier L)

- Plugin (~/Documents/zen-ds-figma-plugin-main, not a repo before): tarball backup, `git init` local (user's choice),
  .gitignore skips backups/ dist/ dist-web/; snapshot 9daf48a, feature 53d42d2 (studio-import.js, code.js handler, UI
  Import › Import from Studio, tests/studio-import.test.js, bundle-behavior stub). The Age of Emerald session works in
  the same folder (docs/luc-thach-3d, src/ui/emerald-*, tests, ios): told, nothing of theirs touched.
- Studio: Export › Figma (figmaExport.ts), figma-map.mjs split from figma-pull (isomorphic), figmaPackage + stable keys
  (page doc printed with ids; CLI counts), .d.mts for figma-map / figma-push, E2E HO-09 (first id HO-08 was taken).
- Read-only check against the live file (use_figma): sets, property names, Spacing variables, text styles, icons all
  present; found Sidebar writing other sets' properties → fixed (write only the chosen set's, selftest 21).

## Figma push P2–P4 (Q4 rest, Q5) (session "Kiểm tra tiến độ plan", the user: "tiếp xong hết tôi thử 1 lần")

- P2 figma-push: data slots, node slots, SidebarMenuItem / AppShellAction, Dashboard header texts + Search, Table as
  Figma's Data-Rows and cells, absolute layers, pictures; keys for generated layers. Plugin 3b984fc: textList / texts
  (nested too), swapIcon, image, fixedWidth, absolute, slots replace their sample content. Two read-only checks of the
  live file: sets / properties / slots / text layers all present; a media cell's label is in its nested Text-Cell
  (fixed: the push writes it there, not on the cell). Overviews and Table pages push with no notes.
- P3 binding-diff.mjs + Figma bindings dialog (Main component), GET /binding-diff (read only: the token header
  `call()` does not send was refused first — E2E MC-08 caught it, also a cold-start timeout: timeout 40 s).
- P4 rebind.mjs in the save's Figma check job, ParityDialog Download for Figma, plugin 173e97f rebind (licensed).
- Selftests: figma-push 36, binding-diff 8, rebind 5 (all in studio:selftest); plugin npm test green; dist rebuilt
  (backups/pre-studio-rebind-dist-20261012.tgz before).

## Nested layer names for every component (session "Kiểm tra tiến độ plan", branch zen/feat/figma-contracts, tier M)

- PR #24 merged (f5b4b52); the shared checkout Zen-DS switched to main (fast-forward; Giám sát told).
- Full contracts for the 29 sets without one are not practical through use_figma (20 KB answers, 0.7–2 MB contracts):
  what the gate needs is each set's layer names. Four read-only use_figma calls (37 sets, hidden layers included) →
  `docs/figma-contracts/nested-layers.json`; nested-paths reads it for sets without a full contract and for layers a
  full one dropped. Re-read: `tools/figma-contract/nested-layers-read.mjs code | merge`.
- Result: Input's hidden Leading / Trailing now checked (4 ALLOWED entries gone; Text-Area has none in Figma); 44/44
  components match after renaming 9 code layers to Figma's (CTA, Buttons, Icon, Tab-Item, File-Item, Main — checked in
  the file: Chat-Control's Main is the trailing send action) and allowing the rest with reasons (unnamed instances,
  glyph-named icons, layers Figma does not draw); designer item in BACKLOG.
- Found and fixed: contracts.lock.json was stale on main (10 sets: the 2026-10-09 re-captures and DashboardHeader never
  refreshed it), so figma-kit's selftest failed; `figma-call.mjs lock` → 13/13.
- Gate (isolated): passed; 12 contact sheets looked at, no visual change (the renames are override keys). Its
  `deadclick` warn on uploader "Retry desert-trail-lookbook.jpg" (also on main, about 3 runs in 4 in the gate's page
  order) was the probe, not the app: the previous card's failed submit focuses and scrolls to its invalid field a few
  frames later (`focusFirstInvalidField`), the page moved 88px after `pointAt` measured, and the click landed on the
  photo. Fixed at its owner: `behaviour.mjs` checks the point still hits the button (`B.hits`) and measures again.

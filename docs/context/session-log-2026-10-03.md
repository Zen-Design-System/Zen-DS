# Session log 2026-10-03

## Zen Studio: text style everywhere + spacing on the canvas (session "Platform UI/UX redesign với canvas editor", tier M)

- User feedback (relayed by "Component Size tokens and corner radius"): editing too limited, no text style; hover + click
  to edit gap/padding directly (Figma-like, no drag-to-step yet).
- Text: new server op `setTextStyle { value | null }` (add/swap/remove a `typographyStyles` class in any className form,
  adds/removes the import; `tools/studio/jsx-source.mjs`, 73 selftests) + Inspector Text section for every text element
  (`inspector/textInfo.ts`, grouped picker in PropField); components whose text comes from their size say so and jump
  to the prop. The plugin also reads only the `typographyStyles` block for valid keys (the old regex also accepted
  "className").
- Spacing: `select/spacing.ts` + `select/SpacingLayer.tsx`: hit areas on gap/padding of Stack/Grid/Box/Form/FormFieldset/
  FormActions/Card, label "gap · md · 16", listbox picker at the click point, Alt = all sides, bound values read-only,
  host elements read-only.
- Backlog: a 0 gap/padding has no canvas area (Inspector only); outlines over scroll-clipped elements draw outside the
  clip (pre-existing).
- Feedback round 2 (relayed, user decisions): selection tag/spacing pill now Info/Solid/Pressed + Content/Inverse/
  Strongest (8.1:1 light, ~14:1 dark; was dark text on #0A85FF), owner dashed outline justified (zen-allow-dashed-color).
  Card spacing steps: a Card API change for "Component Size tokens and corner radius", ON HOLD by the user (when it
  resumes, the Inspector and canvas picker read api.generated.json, so new steps appear by themselves). Text style inside Zen components: no change (user).
  Gate `--only=button` PASS (Studio CSS maps to no classic page).

## Detach component (same session, tier M, user-approved via "Component Size tokens and corner radius" + confirmed here)

- Decisions (AskUserQuestion here): Zen primitives output; presentational components only; `zen-detached` comment +
  normal harness; ⌘Z exact; in a .map only the selected row (`(index as number) === K ? detached : original`).
- Server `tools/studio/detach.mjs` (9 recipes, .map row split, imports, CSS-keyed approximations) + GET /detach-plan;
  client `inspector/detach.ts`, `DetachAction.tsx`, `shell/CanvasMenu.tsx` (button, ⌥⌘B, context menu, row confirm,
  measured token keys, selection follows the new root after the re-render).
- Survey: 968 example instances → 699 detach, 269 refused with a reason, 0 failures; 807 outputs: 0 new tsc/harness
  findings. Verifier round 2: 12/12 findings fixed; nested-ternary guard parenthesised by hand (selftest 1214).
- Gate `--only=card,empty-state` PASS (Studio files map to no classic page; detach test edits were undone byte-exact).
- Backlog: inspector StatusLine shows the snippet note only for detach; row index assumes the .map result renders
  unchanged (no repo case); phrasing check looks at the nearest parent only.

## Figma-like sizing on Layout + Text (workflow for the Zen Studio resize tool, tier S/M, user-approved 2026-10-03)

- API: Stack/Grid/Box `width`/`height` = "hug" · "fill" · number (Fixed px), `minWidth`/`maxWidth`/`minHeight`/
  `maxHeight` (px), `alignSelf` start·center·end·stretch; Stack `fillChildren`; Text/Heading `width`, `minWidth`,
  `maxWidth`, `alignSelf`. Types `LayoutSizing`, `LayoutAlignSelf`, `LayoutSizingProps`, `LayoutWidthProps`,
  `layoutAlignSelfValues` exported.
- Code: `src/components/Layout/sizing.ts` (`layoutSizing()` → data-w/-h hug|fill|fixed, data-self, data-min-w…, and
  `--zen-layout-*` px vars; `withSizingVars` keeps Text's style object untouched when unset); rules at the end of
  `layout.css` (sizing.ts imports it, so Text alone loads them). Parent-aware: row Stack fill = flex 1 1 0 + min-width 0
  (unless minWidth), hug/fixed = flex none; column Stack the same on height; across the axis fill = width 100% (column,
  so align/alignSelf still places a capped fill) or align-self stretch (row/grid heights); alignSelf beats the parent's
  align; fillChildren = flex 1 1 0 on children without their own size, zero minimum via :where() so a Button keeps its
  label width.
- Unset props render no attribute and no style (test "Layout sizing when unset"); no current JSX passes these props.
- Docs: Layout guideline API row + 1 Do + 1 Don't, Text API row; `guidelines:build`/`:check` ✓. Story Layout › Sizing.
- Test: `tests/interaction/layout-sizing.test.tsx` (12 cases: row, column, grid, Text, unset) ✓; full Vitest 26/26 ✓.
- Gate `npm run qa -- --pages=layout` PASS (0 failing; warnings are pre-existing rhythm/outline on templates + button,
  already in BACKLOG; templates behaviour budget timeout, known). Contact sheets reviewed: no visual change.
- Backups: `backups/zen-layout-sizing-before-20261003-091928.tar.gz`, `…-handoff-before-20261003-092616.tar.gz`.
- Review fixes (same day): a Fill height and column `fillChildren` no longer collapse to 0 in a column without a height
  (zero minimum only under a column with data-h fixed/fill or data-max-h); sized elements are border-box (reset.css
  optional); Grid fill height beats alignSelf; Fixed never shrinks in any flex row; Fixed on truncating Text not capped.
  JSDoc/guideline "constraint" → "alignment in its parent"; AGENTS.consumer.md Layout row lists the sizing props.
  +8 tests (20/20). Gate `--pages=layout` PASS. Backup `backups/zen-layout-sizing-review-fix-before-20261003-094452.tar.gz`.

## Full-width table pages (session "Cloud migration feasibility", tier S/M)
- User: "Các page table mà không phải widget nên dãn table theo bề ngang trang. Không giới hạn max".
- Audit workflow (3 agents: templates, app-layer, examples): one cause — `<Container>` default lg (1280). Visible above
  ~1330px of main width (1920: 1280 vs 1612; 2560: 1280 vs 2252). Plus a full-screen bug: a preview-root Container
  (content-box + gutters) overflowed by 48px.
- Changed to `maxWidth="full"`: 8 templates, appLayer/shell.tsx (playground + snippet), examples breadcrumbs, empty-state,
  form (list screen), layout (+snippet), metric, page-header (Page helper gets maxWidth; 3 table screens + snippet),
  pagination, side-panel ×2, skeleton, table, tabs. platform.css: full-screen preview Container width = 100% − 2 gutters.
- Docs: component-usage-rules §14, Table guideline (guidelines.source.mjs → guidelines:build), Container JSDoc.
  Memory zen-table-no-container updated.
- Verified: templates 1612/1612 and 2252/2252 (Empty/Error 1532/2172) in full screen; examples 1872/1872 at 1920, overflow 0.
- app-shell.tsx done after the Studio draft was discarded (Page helper maxWidth; 5 table screens + 4 snippets; 1612/1820/1796 = available at 1920). Backups: backups/zen-ds-before-full-width-
  {tables-20261003-095758,examples-20261003-100712}.tar.gz.

## Studio Design tab, phase 1 + row states + peer mounts (session "Cloud migration feasibility", tier M)
- User: "UX chỗ này khó dùng và khó hiểu quá. Nghiên cứu làm lại" (header) + "Properties … friendly như figma".
  - Spec: docs/research/studio-inspector-redesign-2026-10-03.md.
  - Decisions:
    - Header option B (labelled rows).
    - Layout above Properties.
    - Off-scale px suggests the nearest token.
    - Delivered in phases.
- Phase 1 (workflow: implement → tests / review / visual → fix). Backup: backups/zen-ds-before-studio-phase1-20261003-105219.tar.gz.
  - New: detachable.ts, its selftest (33 cases, incl. shortReason) and inspector/fieldApi.ts (FieldApi, LayoutGroupProps).
  - Changed: detach.ts, DetachAction.tsx, DesignPanel.tsx, PropField.tsx, propSchema.ts (per-component propLabel), Section.tsx, inspector.css, shell/ShortcutsDialog.tsx.
  - Review fixes:
    - Every align/justify value can be reached again (grid + Distribution + Cross axis).
    - A refusal no longer changes the header height.
    - shortReason splits only at depth 0.
    - Labels wrap to 2 lines.
- Row states (user: "hover state trong các dòng Layer nên dùng đúng rule của Zen"): shell.css Pages rows and select.css Layers rows use the ListItem/Sidebar tokens.
  - hover: neutral-flat-hover; pressed: neutral-flat-pressed.
  - selected: active-neutral-subtle; selected + hover: neutral-subtle-hover.
  - Text stays neutral. The component icon keeps its purple when selected.
  - Backups: zen-ds-before-studio-row-states-shell-20261003-111533, zen-ds-before-studio-layers-row-states-20261003-141819.
- Mounted the peers' work in DesignPanel (user: "Phiên Slot làm" Constraints/Effects/Corner radius; this session mounts). Backup: zen-ds-before-studio-mount-peers-20261003-141954.
  - SizingSection sits in the Layout section. Sizing props are filtered out of Properties.
  - SlotsSection follows Properties. The Content child list is hidden when the component has a `children` slot.
  - RemoveAction sits under Detach.
  - FieldApi.apply(ops, label, optimistic?) → Promise<boolean>.
  - alreadyApplied returns false for every non-setProp op it does not check.
- Verified:
  - tsc is clean. Selftests: history 89, detachable 33, sizingModel 95, tools/studio 1255.
  - Live Studio, read-only: Stack (Layout + Size → Properties → Children), Text (Layout = Size), Card (Properties → Slots, Remove under Detach), Layers hover/selected.
  - Gate: static checks pass. "Page mapping" ✗ because Studio files render on no classic page. Report: .qa/reports/2026-10-03T07-22-54-48475494.md.

## Zen Studio drafts → Save, then Save/Discard per frame (session "Platform UI/UX redesign với canvas editor", tier M)

- Drafts workflow (server S + client C + verify): edits are drafts until Save (`tools/studio/drafts.mjs`, plugin draft
  store, `/drafts`, `/save` + harness, `/discard`, persistence per port; client `sourceDrafts.ts`, `DraftsControls`,
  ⌘S, Draft badge in the Code tab). Verify: 57 API guard checks, Playwright 2-tab canvas, persistence, ?raw → disk.
- Verify findings fixed here: drafts follow disk changes (`followDisk`, rebase in the write queue, also at restore);
  Save writes before it clears the draft; undo to the base drops the draft; history import retried after a failure;
  Save all / Discard all / ⌘S send the files they listed; `npm run qa` warns "Unsaved Zen Studio drafts" (tools/qa/run.mjs).
- User request "Save/Discard trên frame chứa example; header là Save All": `tools/studio/frame-scope.mjs` (+17-case
  selftest, chained in selftest.mjs) — frame owns its module-level declarations / array element / `if (page === …)`
  branch + the example object that renders them; import changes join greedily by missing/unused-import cost.
  Endpoints `POST /frame-drafts`, `/save {frame}`, `/discard {frame}`. FrameChrome: "● N changes · Discard · Save" at the
  toolbar's right end (frame tools added on hover only when the whole toolbar fits above the frame, so Save never jumps),
  dot after the frame name; header "● Unsaved · N files ▾" + Save all; frame dialogs.
- Checks: studio selftest 1255 + history 89 + frame-scope 17 ✓; API e2e 23/23 on a private 5184 server, then on 5173 ✓;
  Studio on 5184: frame Discard (canvas back, status line), frame Save body `{frame:{locs}}` (fetch intercepted, no disk
  write), Save all body `{files:[…]}`; button.tsx byte-identical after (43deb6a7…). tsc ✓, style-guard ✓.
- 5173 restarted once at 10:40 for the plugin swap (peer "Cloud migration feasibility" told, no hold). An app-shell.tsx
  draft (`selected` toggle, origin unknown) had been discarded by someone before the restart.
- Backups: `backups/zen-studio-frame-save-before-20261003-100543.tar.gz` (tools/studio, src/platform/studio, qa run.mjs).

## Phone examples centred (same session, tier S; user: "playground của example mobile nên tự động center thiết bị")

- Cause: `.platform-phone-fit` (PlatformPhone) is a block child of `.pe-card__preview` with margin 16px only → left-aligned
  at desktop widths. Survey (scratchpad survey.mjs, every page): classic@1512 73/77 off-centre, studio@1512 70/74,
  classic@390 0/77; playgrounds (`.platform-mobile-preview`, flex centre) were fine.
- Fix: platform.css `.platform-phone-fit { … margin: 16px auto }` (moved out of the device-colour rule). Quick re-survey
  button/chat/bottom-navigation/templates: 0/45 off-centre. Full verify workflow (geometry, pixel diff vs a before
  capture of 51 phone pages + typography, adversarial, UX review) — see below.
- Backup `backups/platform-css-before-phone-centre-20261003-112048.tar.gz`.
- Verify workflow (geometry · pixel diff · adversarial · UX): 0/386 phones off-centre in 5 modes; 70 changed panels at
  1512 are pure horizontal phone moves (dx +58 cards, +354 templates), 0 at 390. Blocker found by all four: the Chat
  playground phone looped (host `.pe-chat-demo` grid sized by content → auto margins 0 → PlatformPhone shrank it each
  ResizeObserver tick). Fix: `.pe-chat-demo:is(:has(> .pe-chat-desktop), :has(> .platform-phone-fit)) { width: 100%;
  justify-items: center; }`; re-measured stable (1 width per phone: 323 @1512/1024/768, 246 @390, 277 Studio), centred.
  Comment narrowed. Latent PlatformPhone feedback, mobile templates full row, fractional px → BACKLOG.
  Backup `backups/platform-css-before-chat-phone-loop-fix-20261003-115515.tar.gz`.
- Gate `npm run qa -- --pages=<51 phone pages>,typography` PASS (report `.qa/reports/2026-10-03T04-58-39-47da80c2.md`; the
  run before the Chat fix failed on chat@390 overflow + ERR_NETWORK_CHANGED blips). 12 required sheets (390) + 1512
  bottom-navigation reviewed: phones centred, nothing else moved. New unrelated warnings → BACKLOG.

## Zen Studio resize like Figma (same session, tier M/L, user-approved: handles, Hug/Fill/Fixed, min/max, constraints in auto-layout)

- Round 1 (workflow): server op `wrap` (tools/studio-next only, 211 new selftest checks), canvas `select/resize.ts` +
  `ResizeLayer.tsx` (8 handles, live preview, size pill, Shift 8 px, Esc cancels, double-click Hug, frame right-edge
  drag = free width override, StudioFrameWidth "auto" | number), inspector `SizingSection.tsx` + `sizing.css` +
  `sizingModel.ts` (selftest 83). Verify: 1 POST per gesture, zoom math OK; found Box wrap did not resize the component.
- Round 2: components wrap in a filling Stack (row+fillChildren for width, column for height, column+stretch corner);
  later drags edit that Stack; playground specimens never wrap; min 8 px; undo of a wrap reselects the component;
  SizingSection takes `LayoutGroupProps` (fieldApi.ts, owned by "Cloud migration feasibility", who mounts it) and
  writes through `api.apply` when present (selftest 95). Verify found: stretched InputField halved on height drag,
  Badge/Chip corner not filling (max-content), Button shrinks below content, Menu/Tooltip trigger wrap moves ARIA.
- Round 3 (running): those fixes + `.map` "(all N)" hint, non-filling axes hidden by a probe, wrap refused for
  attribute values and children of cloning components (server flag on GET /element), layout.css stretch rule.
- The live plugin (tools/studio) still lacks `wrap`; swap from tools/studio-next after round 3 (restarts 5173).

## Component Theme: Input/Border/Focus + Input/Border/Popover-Search (session "Component Theme tokens update", tier S)

- Export `~/Downloads/Component Theme.json` vs repo: 2 new names, 0 changed values. Live file (use_figma): Focus binds the
  Focused/Typing Container stroke of every Field-Only-based set; Popover-Search the Search/Popover (and Autocomplete
  popover) Focused/Typing stroke. Its S1–S6 `#NANNANNAN` = alias Focus/Neutral/Solid at opacity 0 → stored `#FFFFFF00`.
- Code: `input.css` focus border → `--zen-input-border-focus` (read-only focus dashes stay Focus/Neutral/Solid, comment
  says why); `search.css` popover focus → `--zen-input-border-popover-search`, popover 1px Hover override removed (live
  Hover is 2px). Search.tsx doc comment, manifest counts/note, docs counts 2,177 → 2,179.
- Probe (Playwright, computed `--zen-input-field-border`): TextField/Search focus #111111 / dark #FDFDFD in S1–S6,
  #02020215 / #FFFFFF18 in S7; popover search focused transparent in S1/S4, #02020215 in S7; hover S4 2px #01010124.
- Backup: `backups/zen-ds-before-input-focus-tokens-20261003-145027.tar.gz`. Follow-ups: 3 BACKLOG lines (contracts
  re-capture, ChatComposer ring, S7 focus contrast / export NaN / Text-Area ring for the designer).

## Zen Studio code view: language name (session "Component Theme tokens update", tier XS; user: "Bổ sung tên cho ngôn ngữ ở code view")

- `CodeView.tsx`: a custom `title` (file path) is followed by `.studio-code__language` (Caption/Medium, Content/Neutral/Base,
  `code.css`); exported `codeLanguageLabel()`; `SourcePanel.tsx` shows the same label in its loading/error header.
  Owner "Platform UI/UX redesign với canvas editor" agreed (no pending edits there). Backup
  `backups/zen-ds-before-code-view-language-20261003-151109.tar.gz`. Verified in `?ui=studio&page=input` (Playwright):
  Source header "…rmExamples.tsx L859 TSX", Snippet header "TSX". style/usage/tsc clean.
- layout.css: every parent-aware sizing rule (row/column Hug/Fixed/Fill, flex-basis, min 0, Fill across, fillChildren,
  stretch) now skips `[data-position="absolute"]` (peer "Slot Component phân biệt"'s position.css layers are out of the
  flow); +2 tests (30/30), layout gate PASS, sheets reviewed. Backup
  `backups/layout-css-before-absolute-exclusion-20261003-155549.tar.gz`.

## Studio nested booleans (session "Boolean lồng nhau trong Studio", tier S)

User: "Các boolean của nested không hiển thị để sử dụng được trong studio"; chose all three fixes (AskUserQuestion).
Backup `backups/studio-before-nested-booleans-20261003-161110.tar.gz`. Owners told first (Cloud migration feasibility:
DesignPanel/propSchema; Platform UI/UX redesign: select/*; Slot session: FYI).
- `inspector/NestedProperties.tsx` (+ `nested.css`), mounted in DesignPanel between Properties and Slots: the selected
  instance's annotated children (canvas `childHits`) whose src offset falls inside one of its written attributes
  (offsets from GET /source, since several props share a line; primitives/host elements looked through, depth 3),
  Zen kind with boolean specs. Edits go through `applyEdit` at the nested element's own file:loc with a fresh hash;
  `noteEditTarget` on nested + owner src. Twins in one prop get "· 1/2".
- `select/picker.ts` `nestedHitAt(owner, target)`; `SelectionLayer.tsx` onDoubleClick: nested source instance first,
  then `deepPartAt`; resize handle targets ignored; `keepSelected()` keeps a covered nested selection on press.
- `propSchema.ts` `propSpecs`: inherited HTML booleans from the `extends` clause (Button/Input/Select/Textarea/Fieldset
  HTMLAttributes, through `XProps` → component X), minus Omit keys and declared props; no readOnly when Omit "type".
  `readOnly` label "Read-only".
- Verified in Studio on 5173: ListItem playground → Avatar (Leading) Status/Focus, IconButton (Trailing) Disabled;
  Status on wrote `status` on PlatformExamples.tsx:2022 (draft), Reset restored the saved file; Button → Icon
  (Start icon) Decorative, Disabled bound; Pending invites example → Avatar + IconButton · 1/2. Double-click chain
  ListItem → Avatar → "span · part of Avatar". tsc clean; `npm run qa -- --pages=list-item` PASS (Studio files have no
  page mapping; the ⚠ drafts were app-shell.tsx/toggle.tsx, not ours).

## Session "Slot Component phân biệt" — Studio slots, Phase 2 position/effects/corners, chat bubble token

- User decisions: playground slots stay empty (main component); examples/templates edit slot content freely; Studio
  controls follow Figma as closely as possible; new DS props token-only; Reset slot + Clear contents; Phase 2 answers in
  `docs/research/studio-position-effects-radius-spec-2026-10-03.md` §7a; Layout page capped at 8 examples (three media
  examples merged into "Layers over photos"); `radius/full-mixed` rule; `layout:selftest` in the gate.
- Slots: server `tools/studio/slots.mjs` (insertChild, removeElement, duplicateElement, moveElement, clearSlot, resetSlot;
  `describeSlots` adds attribute `elements`/`form` + Modified flags) with `slots.selftest.mjs` (1454 checks, scratch copy
  of studio-next). Client `src/platform/studio/slots/*` (registry, palette, SlotsSection, InsertPicker, RemoveAction,
  SlotLayer, SlotConfirm, menu, layers) wired into StudioApp (⌫, ⌘D), StudioCanvas (SlotLayer), CanvasMenu, LayersPanel
  (slot rows), ShortcutsDialog, SelectionLayer (off-canvas selections), types.ts (6 ops). DesignPanel mounts by
  "Cloud migration feasibility". Server wiring into jsx-source/plugin waits for the studio-next swap (integration script
  in the scratchpad, dry-run clean); until then the ops answer "Restart the dev server…".
- Phase 2 library: `Layout/position.ts|css`, `Layout/effects.ts|css`, `_shared/corners.ts`; Layout.tsx/Image.tsx wiring;
  Card shadow+alt fix; `tests/interaction/layout-position.test.tsx` (20) + effect gating test; 11 usage rules; style-guard
  `position/token`; audits (surfaces on Canvas/Alt, elevation, per-corner concentric); 4 overlay examples migrated
  (62/62 panels identical). layout.css owner excluded absolute layers from its parent sizing rules.
- Token: Bubble-Chat-Others-Business/Background/Default → Background/Surface/Default (9 modes); Figma still Popover (Backlog).
- Gates: static gates, vitest, contracts pass; behaviour flakes on pages hot-reloaded by other sessions (bottom-sheet,
  menu, page-header re-run clean alone). Backups: `backups/zen-ds-before-*-20261003-*.tar.gz`.
- Rounds 3–6 (workflows + inline fixes, each verified on a private server with /save blocked): cross-axis kept on a
  stretched component, min-content / spill floors, Hug keeps the wrapper's direction, row/column stretch rules only
  with a height, flex-basis auto in columns without a height, shared `cloning.json` (props + parents, `through`,
  `only`, `anywhere`, sole-child rule) enforced by the server (GET /element wrap verdict, op refusal) and the client
  (fiber check, props through variables), honest reasons in the pill (≤ 100 chars), SVG-root pills, `.map` "(all N)",
  out-and-back = 0 POSTs, undo/redo reselect, percentage max caps lifted in the preview only.
- Incident (round 4): a builder's scaled-screenshot click hit "Save all" on its private 5184 server and wrote a test
  wrap to `inline-message.tsx` at 13:51; restored from its backup the same minute (sha1 7705d323… verified).
- Swap 17:37: tools/studio-next (wrap + cloning guard + the Slot session's server integration) → tools/studio, one
  5173 restart; live selftests 1634 + history 89 + frame-scope 17 + slots 1712. Backup
  `backups/tools-studio-live-before-swap-20261003-173727.tar.gz`.
- Final: M1 truncation floor = spill + end padding/border (ListItem stops at 138 with handles; +30 works), verified on
  a private 5180 server with the live plugin. tools/studio-next + vite.studio-next.config.ts archived to
  `backups/tools-studio-next-final-20261003-174016.tar.gz` and removed. Gate `--pages=button` PASS.
- Added `tools/dev/loopback-both-families.d.mts` (new file): repo-wide tsc failed with TS7016 on vite.config.ts's import
  of the loopback plugin added by the (ended) Slot session; gate unblocked (PASS, button sheets reviewed).

## Zen Studio multi-select + wrap in a container (session "Chọn nhiều element vào container", tier M)

User: "Cho phép chọn nhiều element để add vào 1 div/container mới". Owners asked first: "Platform UI/UX redesign" OK'd
tools/studio, Layers, StudioApp, CanvasMenu, then released SelectionLayer + types (store.ts not needed).
- Server: `tools/studio/jsx-source.mjs` op `wrap` + `with` (applyWrapMany): siblings of one JSX parent (through {…},
  conditions, casts); adjacent ones wrapped in place, others move up after the first run (whole lines only); refuses
  .map rows, array items, prop values, different parents, nesting, every single-wrap guard (cloning.json, HTML nesting),
  chrome. Snippet follows when the region is found once. Single path unchanged (props → shared wrapAttrs). Built in a
  scratch copy, landed in one write (one 5173 restart). Selftest +75 → 1709, slots 1712, history 89, frame-scope 17.
- Client: `select/multiSelection.ts` (extras store, sessionStorage, remap-safe), `select/wrapSelection.ts` (checks,
  Stack inference: direction from rects, gap snapped to Spacing/Gap, align from a same-direction flex parent or a shared
  edge, wrap; undo reselects the layers via expectRender on the stored object; an old server that wraps one layer is
  undone), `inspector/SelectionActions.tsx` (N layers, Stack/Box, layer list), Inspector mount, Layers Shift/⌘+click +
  aria-multiselectable, StudioApp ⇧A / ⌥⌘G (Delete/⌘D blocked on several), CanvasMenu items, ShortcutsDialog rows,
  SelectionLayer (Shift+click through the store, extra outlines resolved from it, right-click on an extra keeps them).
- Verified on a private server (:56888, its own drafts): Layers and canvas multi-select; ⇧A/Stack button/menu wrap
  (gap xs inferred = parent); ⌥⌘G non-adjacent (FormActions moved up, Box import added); different-parent refusal;
  undo/redo selection, also across reloads. Test drafts discarded; checkbox.tsx on disk untouched.
- Bug found and fixed while testing: undo dropped the selection (expectRender got another object than the stored one).
- Backups: `backups/zen-ds-before-multi-select-wrap-20261003-183716.tar.gz`, `…-shortcuts-*.tar.gz`, `…-selectionlayer-*.tar.gz`.


## Board keeps frames in place (same session; user: "ok" to the peer-reported frame jump fix)

- Diagnosis (verifier on the old code; the first workflow's diagnose/fix agents died on ENOTFOUND): the Examples
  section was a 2944px flex-wrap row (a row as tall as its tallest frame → other columns moved by the row delta) and a
  width override re-wrapped rows (frames jumped columns: likely the peer's "example:5 jumped"); nothing kept the
  selection in view.
- Fix (workflow): `board/boardLayout.ts` (pure: x from rule widths with the old packing; y keeps each frame's opening
  gap to the frames above in its rule column; selftest 15018) + `StudioBoard.tsx` useSectionLayout (ResizeObserver,
  absolute left/top before paint, section size deferred a frame from the RO path); `canvas/keepInView.ts` (smallest
  pan when a relayout pushes a visible selection off screen). Verify: opening identical to the old flex layout on 57
  pages, 66-run height matrix, width overrides, HMR, preview modes, Present/fit/Tab order, no overlap flash.
- Major found by verify, fixed here: the opening (base heights + settled) is now kept per page (module Map +
  sessionStorage "zen-studio:board-openings"), so a page switch or reload with drafted heights no longer re-packs rows;
  the opening phase also ends on wheel and after fonts.ready + 2 frames. Re-run of the remount repro (switch and reload)
  on 5180: 0 moves, discard restores the opening exactly. Minors → BACKLOG.
- Backups `backups/zen-studio-stable-board-before-20261003-185700.tar.gz`, `backups/studio-board-openings-before-20261003-203712.tar.gz`.

## List Item Interactive=Yes/No + example refactor (session "Component List Item refactor")

User: "Update Component List Item. Refactor lại hết các List Item component trong example để không override padding
của nó. Dùng đúng các Spacing đã set bên trong component. Lưu ý dùng đúng case Interactive hay không." Tier M (variant
re-sync) + every list example. Backup `backups/zen-ds-before-listitem-interactive-20261003-184132.tar.gz`.
- Figma (live, `use_figma`): List-Item 4080:11700 gained `Interactive=Yes|No` (No = 14817:2741, padding 0). Yes binds
  Padding/Small × Padding/XLarge (was Margin-Comfortable in code), Interactive-Background x −12, radius Corner-Radius/Base
  (code had Large). Reference composition List-Item-Example 14730:76349: card radius 2XLarge, List frame gap 3XSmall,
  padding-block Small, rows edge to edge. Finance/Logistic phone instances also pad 24; Chat convo overrides Margin-Compact.
- User decisions (AskUserQuestion): interactive lists run to a padded container's edge (not the old inset-0); gap
  between static rows Gap/Medium.
- Component: interactive = onClick/href (no new prop). list-item.css: static padding 0; interactive Small × XLarge
  (`--zen-list-inset` still overrides: deprecated List inset, Chat convo); fill Base; List gap Medium / 3XSmall via
  `:has`; mixed lists give static rows the interactive box; `.zen-list:not([data-inset]):has(interactive)` bleeds by
  `--zen-list-bleed` (Card = card padding, Dialog custom/ModalForm body + SidePanel body = modal padding, BottomSheet
  body = margin-compact / 4 in action sheets, padded Stack/Box = own padding-inline, Container gutter; painted Box
  without paddingX resets 0). ChatReactors keeps one row box (chat-reactors.css, zen-allow-list-inset).
- Platform: playground Inset chip → Interactive toggle; stage/playground list frames radius 2XLarge, static frames pad
  XLarge; `.pe-list-card` with interactive rows = padding Small × 0; appLayer ListBox `radius 2xl paddingY sm`.
- Examples/templates/appLayer (5 parallel agents + list-item page by hand): ~70 `inset=` removed (JSX + snippets);
  grouped blocks of interactive rows `Box radius="2xl" paddingY="sm"` + kicker `paddingX="xl"`, static blocks
  `padding="md"`; static lists on full-bleed phone screens wrapped in the screen margin (`paddingX="lg"`); scroll panes
  that would clip the bleed run to the edge themselves (list-item `.px-list-item-pane`, search `.px-search-scroll`).
  Case changes: progress Background export and tooltip Exact time rows had `selected` without a handler → static
  (tooltip's time link now toasts "Activity opened"); DetailTemplate client row wrapped in a List. toast Export card
  dropped `spacing="small"` (interactive rows would sit 8px inside its 16px title).
- Docs: guidelines.source (Interactive row, State, List, Do/Don't), harness rule list-item/inset-not-padding text,
  usage rules §15, example brief §3b/§3c, CHANGELOG, HANDOFF, stories (Static story). `tools/dev/loopback-both-families.d.mts`
  added with the user's OK (vite.config.ts TS7016 blocked every gate).
- Not done (Backlog, Studio owner logged it): tools/studio/detach.mjs still builds the old Small × inset box for a static
  ListItem; propSchema still lists List inset. Phones: interactive rows' text at 24 vs the 20 page margin (Figma does the
  same). A Studio draft on avatar.tsx (+4 −4, not this session's) rendered during the gate.

## Component Theme Neutral-S7 focus + Search re-check (session "Token JSON và Search component", tier XS)

- Export `~/Downloads/Component Theme.json` (mode Neutral - S7 only, 115 tokens) vs repo: 0 added, 0 removed, 1 changed:
  `Input/Border/Focus` S7 {Color/Focus/Neutral/Subtle} → {Color/Focus/Neutral/Solid}. Live file: Solid in all nine modes.
- Source + `synchronizationNote` edited, `tokens:build` / `tokens:check` / `tokens:native:check` clean (2,179). Comments in
  `input.css` (focus + read-only focus) no longer say S7 is Subtle.
- Search live (figma-kit hashes + per-node hash diff on 8 variants): only the Container frame differs from the stale contracts
  (Small radius value, Focused/Typing border tokens, Popover Hover 2px — code already follows) plus Field-Only Hover's 2px
  stroke no longer bound to Emphasis/Border-Weight/Active/Primary. User kept the variable (BACKLOG P3 for the designer).
- Backup `backups/zen-ds-before-input-focus-s7-solid-20261003-213303.tar.gz`.

## Session "Figma-like editing functionality" — Zen Studio Figma-grade editing (tier L, 8 phases, user-approved)

- Plan: `docs/research/studio-figma-editing-plan-2026-10-03.md` (user approved all 8 phases; marquee replaces drag-to-pan
  on empty canvas; orphaned inspector phases stay with their own sessions).
- Client: `src/platform/studio/edit/` — textEdit.ts + TextEditor.tsx (overlay editor, live mirror into the text node,
  IME-safe, typed-ahead keys held while the source is read), arrange.ts (moveLayer / stepLayer with expectRender),
  drag.ts + DragLayer.tsx (dropTargetAt: deepest drop container, edge bands with shared-edge rule, own parent keeps it),
  clipboard.ts (copy/cut/paste events, ⇧⌘R, ⌥⌘C/V, menu items), navigate.ts, measure.ts + MeasureLayer.tsx (token shown
  only when the distance is that padding / gap), layersDrag.ts, assets/ (AssetsPanel over slots/palette.ts), quick/
  (commands + palette), marquee.ts + MarqueeLayer.tsx, multi.ts + MixedProperties.tsx.
- Hooks in others' files (owners told): SelectionLayer (dblclick, Enter, press → pressLayer, empty/frame press →
  startMarquee), StudioCanvas (EditLayer), LayersPanel (pressLayersRow), StudioApp (Assets tab, Delete/⌘D multi),
  CanvasMenu (clipboard group), ShortcutsDialog (rows), types.ts (EditOp moveTo/pasteCode/many, SourceElement.range,
  StudioLeftTab assets), SelectionActions (MixedProperties).
- Server: `tools/studio/arrange.mjs` (moveTo, pasteCode, many; cloning.json + text-parent + binding checks), wired in
  slots.mjs (SLOT_OPS, HOST_OPS, hashed, ARRANGE_HELPERS); jsx-source describeElement `range`. Tests: arrange.selftest.mjs
  30 cases; selftest.mjs suite total green (studio 2187, history 89, frame-scope 17, slots 1712).
- Testing notes: the Browser pane was hidden part of the time (rAF paused) — measure/drag overlays were verified with a
  setTimeout rAF shim; dynamic imports of HMR-updated modules load a second instance (read state from the DOM instead).
  Someone's Save all saved two in-flight test drafts of checkbox.tsx at 21:38/21:44; restored byte-identical.
- Gate: `npm run qa -- --pages=checkbox` PASS after each phase (Studio files cannot be page-mapped).
- Backups: `backups/zen-ds-before-studio-{text-edit,moveto,selftests,drag-hook,clipboard,layers-dnd,assets,shortcuts,multi}-*.tar.gz`.

## Zen Studio Detach of a static ListItem (session "Platform UI/UX redesign với canvas editor", tier S; user: "Cập nhật ngay")
- `tools/studio/detach.mjs`: `listInset()` replaced by `listRowBox` (rowParent · listInset · listRows · rowKind ·
  bleedingList). A static row pads 0 unless it is a direct child of a List that always has a clickable row (onClick/href;
  `selected`, `href=""`, `{undefined}` do not count): then sm × xl, or the deprecated inset of that List or an outer one
  (the variable inherits). Fragments, conditionals, `.map`/`?.map`/`flatMap`/`Array.from` callbacks and List `children`
  are transparent; names resolve through imports (aliases, namespaces; a local `List` is not Zen's). Unknown cases
  (helper rows, `{rows}`, spreads, rows clickable only sometimes) keep the measured padding, else 0 + a note; "none" is
  never written. Notes name the written value.
- Built in a private copy (`tools/studio-detach`, server 5185; archived `backups/tools-studio-detach-copy-final-*.tar.gz`),
  landed once (live files unchanged since the 21:33 base). Backup `backups/tools-studio-detach-listitem-20261003-213310.tar.gz`.
- Verify (workflow): every static row on 61 pages (32,186 observations, 164 locs): 156/156 exact vs the DOM, 0 wrong,
  10 refusals as before; UI detach of 10 rows on 5185: 0px deltas; adversarial review → fixed (optional maps, inherited
  inset, note values, conditional siblings, aliases, spread order). Selftest 2,187 (+~50 ListItem cases). Follow-ups in BACKLOG.

## Global Colors re-sync (same session, tier XS; user: "Update Global Tokens", ~/Downloads/Global Colors.json)
- 258 values (109 solid, 149 Alpha), no names changed; 192 VT/Chat/Ananas dropped. From the Zen Plugin's new ramp
  algorithm (peer "Kiểm tra tương phản dark mode step 1 và 2"): Light Neutral 4–6 evenly spread (Gray/4 #EAEAEA →
  #E5E5E5, Gray/6 #DBDBDB → #D7D7D7), Dark step 2 lighter (Surface/Canvas-Alt #191919 → #1A1A1A, 1.066 → 1.076:1 on
  Gray/1), Dark Neutral 4–5 spread, Dark accents 4–7 darker; ±1 rounding on Light Gray/10, 12, Orange/8, Brown/7, Dark Gray/6–10.
- Contrast: Light Border/Neutral/Subtle on white 1.295 → 1.345:1, Solid-Disabled 1.385 → 1.439:1; text pairs barely move
  (Dark Gray/12 on Surface 17.28 → 17.11:1, Light Gray/10 on white 3.84 → 3.79:1).
- Gate (token fast path): static ✓, 23/23 contracts, Vitest 27/27 (one Rating flake on the first run, 2/2 alone); one
  audit error (dock-icon createRoot during a peer's 5173 restart) clean on 3 reruns; contrast warnings only the known
  1.92:1 placeholders. 12 sheets reviewed; Dark probed with getComputedStyle. Backup `backups/global-colors-before-sync-20261003-223002.tar.gz`.
- Follow-up (same session, user: "Update thêm trong figma" → the user had already added Figma List-Item Device=Desktop|Mobile;
  Mobile Interactive=Yes binds Margin-Comfortable in Mobile mode, 20px, fill 8px from the row edge; the user fixed the
  Selected/Mobile variant that still bound XLarge). Code: interactive padding-inline back to `--zen-margin-comfortable`
  (desktop/tablet 24px, mobile 20px; the docs cards are mobile at 390). Phone grouped blocks `radius="xl" paddingY="xs"`
  + kicker `paddingX="lg"` (bottom-sheet, layout, dialog, list-item, stepper); `.pe-list-card` and the stage/playground
  frames pad `Margin-Comfortable − Padding/Small` with radius `Base + that` (concentric on every device);
  color-selector Team calendars is a default-spacing Card (heading = card padding = row padding). Backup
  `backups/zen-ds-before-listitem-device-mobile-20261003-230452.tar.gz`.

## Order summary redesign + Accordion `contentWidth` (session 2dd655b9, tier S + small API)

- User: the Accordion example "Mobile order summary" had a poor layout. Measured: content 16px from the box's left edge
  but 52px from its right (the content column stops before the chevron column), total shown 3× (title, Total row,
  button), item names as small grey terms under bolder prices, no Subtotal, items and adjustments in one rhythm, item
  options dropped. Research: Shopify checkout (total in the folded bar, rows with thumbnails + options), Baymard (users
  verify items and options in the summary).
- User picked option B: new prop `Accordion contentWidth="title" | "full"` (`data-content-width`, two CSS rules;
  exported `accordionContentWidths`, `AccordionContentWidth`; guideline row + Do in `guidelines.source.mjs`).
- Example (`examples/pages/accordion.tsx`): `OrderSummary` component, controlled: the total is in the title only while
  folded; open = List of the cart rows (Dock Icon Emoji medium, options as caption, Body/Base/Medium price) → Divider →
  DescriptionList Subtotal / points (tone positive) / Total (emphasis). `lineName` drops "× 1".
- Gate: `npm run qa` PASS (Vitest 27/27, audit 0 errors). New ⚠ [rhythm] accordion@390 "corner 16 vs trigger 8 +
  inset 5" = the phone is scaled at 390 (8px inset measures ~5); unscaled it is 16 = 8 + 8.
- Figma (user asked): section "Example · Mobile order summary (code, 2026-10-03)" `14843:60` on ❖ Accordion — expanded
  box `14843:61` (composed: Accordion/Text has no Content Width property; same tokens), collapsed `14843:68`, Checkout
  390 screen `14843:2218` (Top-Navigation Compact, List-Item ×5, Dock Icon, Divider Default/High, Button/Main Large).
- Backup `backups/zen-ds-before-order-summary-redesign-20261003-231851.tar.gz`.
- Follow-up (user: "có" → add Content Width in Figma): `.Primitives/Accordion/Content` (239:18764) and `Accordion/Text`
  (239:16847) got `Content Width=Title|Full` (default Title; existing variants renamed, so instances keep Title). Primitive
  Full (14846:270–299): Title-Row = Title + Chevron-Space (padding 3XSmall/2XSmall, Icon-Size bound to Element-Size/Popular
  Base/Medium/Large) with Gap/Medium, the Contents slot full width (clones turn SLOT into FRAME: re-bound to
  `Contents#4035:8`). Accordion/Text Full (14846:78729–78869, grid rows 6–11): primitive Full + Wrapper absolute top-right.
  Checked: title and slot content survive Full↔Title and Expanded No↔Yes; slot 611 vs 575 wide (Medium Box, 643). The
  example's open box is now a real instance (`14847:78810`, phone `14847:78851`); descriptions updated.
- 2026-10-04 (same session, user requests):
  - Kickers → Light ("chỉnh thành Light đi", after comparing Apple: iOS section headers secondaryLabel 3.29:1 on
    #F2F2F7; Apple's table allows 3:1 for bold text). 80 Body/Small/Bold Heading kickers + hrDemo GroupLabel; harness
    `heading/title-not-light` exempts Body/Small/Bold; quality-checks kicker check flips to Light; docs (usage rules §7
    table, example-patterns, brief, guidelines). Backup `backups/zen-ds-before-kicker-light-20261003-235711.tar.gz`.
  - Studio ToneControl (PropField.tsx + inspector.css `.studio-tone-*`): swatch via currentColor + per-tone token
    classes; verified in ?ui=studio (Playwright with webdriver hidden). Backup `backups/zen-ds-before-tone-swatch-20261004-000520.tar.gz`.
  - "Bug alignment" (Studio Direction Segmented): Segmented rendered an empty label span for `label: ""`; fixed in
    Segmented.tsx (icon offset now 0). Backup `backups/zen-ds-before-segmented-icon-only-20261004-002023.tar.gz`.
  - "UI bị thụt vào" (badge › Invoice status): card.css sub-action reserve limited to the first row (Figma Content slot
    has no reserve). Handed card.css to session "Card structure Figma mismatch". Backup
    `backups/zen-ds-before-card-subaction-20261004-002502.tar.gz`.
  - DescriptionList alignment ("thụt ra thụt vào"): any row action pushed every value 48px in. CSS: action gap
    Gap/XSmall, flat icon actions overhang (size − icon)/2 per size token; examples: all bank rows copyable, discount
    remove → removable Badge in the term. Backup `backups/zen-ds-before-dl-action-align-20261004-010307.tar.gz`.
  - Input help text icon on the first line (align-items flex-start + icon box 1lh). Backup
    `backups/zen-ds-before-help-icon-top-20261004-005231.tar.gz`.
  - Figma (user: "Build ngược lại Component Description List vào figma, đủ variant"): new page ❖ Description List
    14857:3 (after Date Picker) with _Cover, Display/3 intro, `Description List` 14859:79180 (4 variants, Items SLOT),
    `.Primitives/Description-List/Item` 14859:78890 (8 variants, Term/Value TEXT, Action BOOLEAN, Action Button
    INSTANCE_SWAP default Button/Icon-Flat Small + icon-copy-line, exposed), rules = Divider instances, Examples row
    (Order summary, Pay by bank transfer in Border Cards). Binding audit: 0 unbound fills/strokes/gaps/paddings.
  - "Làm hết" (Code Connect + flaky test): scale.test.tsx renders in `pointer-events: none` (Rating hover preview from a
    stale test pointer); full `npm test` 3× green. Code Connect blocked by the Figma plan/seat (Backlog P3 with the
    property → prop mapping). Backup `backups/zen-ds-before-scale-test-flake-20261004-022700.tar.gz`.

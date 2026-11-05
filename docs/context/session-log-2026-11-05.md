# Session log 2026-11-05

## Export draws the tab bar's More sheet (session "More tab", tier S; branch claude/export-more-sheet-20261105)

Follow-up of PR #382 (merged as 03973a05): the user confirmed here "Có, làm tiếp" (relayed first by Giám sát).

- `tools/studio/compile.mjs` `withMoreSheet`: a Screen's tab bar whose More leads nowhere of its own
  (`responsive-header.mjs playMoreSheet`, the same test as Play) gets `onValueChange` = More opens `moreOpen`, the other
  tabs run the bar's own handler (`const tabs: (choice: string) => void = …`); its sheet (the action BottomSheet of the
  Sidebar rows past the fourth, `onSelect` the per-item navigate) goes at the page's root with `open={moreOpen}
  onOpenChange={setMoreOpen}`, one per distinct sheet, shown on the screens whose bar opens it. Both the AppShell form
  (phone parts on the master layout) and the plain phone form.
- §17 row and CHANGELOG say the export writes it; the derived note says "opens in Play and in the export".
- Tests: compile selftest 98 (sheet state, wrapper, one shared sheet, rows, a More with its own target unchanged; the
  output passes usage-guard consumer mode and tsc with noUnusedLocals).

## Studio project language (session "Add a language setting to Studio projects", tier S; branch claude/festive-sammet-f1186c)

Approved 2026-11-05 (Giám sát picked BACKLOG-user-and-later P3 "A language setting for Studio projects", user
2026-10-25 "Để đợt sau"). Closes that line.

- Spec: project setting `locale` in project.json (`project-theme.mjs` `PROJECT_LOCALES` en-US · vi-VN, `normalizeLocale`;
  none / unknown → en-US, so old projects and Drafts render as before). UI: Project settings › Language, a section of
  its own under Project (as Primary: a one-line note + info, then a SelectField, names in their own language; first
  placed under Name, the note then sat above Name — moved after the screenshot); the Page panel's project button became
  "Project settings" (icon settings, `${name} settings`; the page title "· Settings"). No E2E used the old labels (grep).
  Not asked of the user: the brief fixed the placement (a project setting) and the default (en-US).
- Canvas / Play: `project/projectLocale.tsx` `LocaleScope` (ZenContext locale + `resolveZenLabels`, no element; none for
  en-US) around the world's children and Play's page, `lang` on the world, the preview portal and Play's page. Not
  around a root ZenProvider: the Studio has no outer provider, so ExampleCard's would lose its toast queue and
  breakpoint "auto" — Present passes `locale` to ExampleCard's ZenProvider instead. ChromeScope sets en-US so a bar in a
  played page stays English. `useCanvasPreview` / `previewForPage` return `locale`; `pageLocale(id, text?)` outside React.
- Phone: the share carries `locale` (device-share.mjs, BCP 47 tag only), DevicePlay's ZenProvider takes it.
- Figma: figmaExport passes the page's locale to `figmaPackage` (it already took one for Date-Cells, but nobody passed
  it, and frames after the first and project components dropped it: fixed). Built-in words from `resolveZenLabels`
  (Pagination range and page size, DatePickerSheet's default title, the subAction note); the pull treats each
  language's default sheet title as the default; CLIs take `--locale=`. Export's kept base pulls with the same locale.
- Export: `compileReact({ locale })` names it in the code's second line (en-US: nothing); handoff.md's ZenProvider line
  gets `locale="vi-VN"`; HTML screens `<html lang>` and their ZenProvider in it.
- Play: `LocaleScope` in `Player()` around its ToastProvider, so the toasts' built-in words follow too.
- Tests: project-theme +4, device-share +1, figma-push +4 (vi title + round trip, vi pagination, every frame of a
  package), compile +1; E2E S-12 (id from Giám sát) in matrix.baseline.json.
- Gate (slot GO 13:11 → 13:55): `npm run qa --isolated --files=<18 src files>` static/tsc/selftests ✓, Studio E2E 457
  works · 0 broken; "Page mapping" ✗ (PlatformShowcases.tsx maps to no page) → `--only=button,table` PASS (audit,
  dark, behaviour; contact sheets unchanged). After the Language-section move: `qa:quick` PASS (75 E2E rows), S-12
  works. `npm run build` exit 0.

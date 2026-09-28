# Session log 2026-09-27: vibe-ready, Phase 1 (fork session)

This work followed the vibe-coding readiness assessment (score ~6/10).
- The fork session "Đánh giá Zen DS hiện tại (fork)" does Phases 1–2 directly in this folder, with **no commits** (the user's choice).
- The original session does Phases 3–4 afterwards: see `~/.claude/plans/zen-vibe-ready-phase3-4.md`.
- Restore point before the work: a tar of the working tree in that session's scratchpad (`backup/zen-ds-m0-*.tgz`).
- Baseline screenshots (button, popover, sidebar, chat, table, toast, dialog, empty-state; 1512 + 390) are kept there too.

## Package (`npm run build:lib`, `pack:local`, `verify:package`)

- **Build config**
  - `vite.lib.config.ts`: lib mode, ESM, `preserveModules` (root `src`), React external, `"use client"` banner on `components/*`, sourcemaps, no minify.
  - File names come from the source path: the default `[name]` collided on case-insensitive disks (`Button.tsx` vs `button.css` produced `Button2.js`).
  - The platform build moved to `dist-platform/`.
  - `src/index.ts` no longer re-exports `PlatformApp`, and now exports `typographyStyles`.
- **`scripts/build-lib-css.mjs`** builds `dist/styles.css` from: Inter `@font-face` with `./fonts/` urls (font files copied), tokens, text styles, effects, a `box-sizing` baseline, and the component CSS.
  - `dist/reset.css` is a separate, optional file.
  - The build fails on inlined fonts, a platform `@font-face`, platform classes, or broken `url()`.
  - Fonts are handled here because Vite lib mode would inline them as base64.
- **`scripts/build-lib-types.mjs`**: `tsc -p tsconfig.build.json` (TS 7 native, `emitDeclarationOnly`) produces 178 declaration files (~430 KB).
  - It strips the `import "./x.css"` lines that declaration emit keeps.
- **`package.json`** is now 0.3.0 and stays `private`.
  - `exports`: `.`, `./styles.css`, `./reset.css`, `./icons/all`, `./icons/names`, `./tokens`, `./package.json`.
  - Also added: `types`, `files` (dist + AI docs), `sideEffects`, `peerDependencies` react/react-dom ^19.
  - React, Vite and plugin-react moved to devDependencies; `react-docgen@8.0.4` and `playwright@1.63.0` pinned; `latest` specs pinned.
  - The lockfile was synced with `npm install --package-lock-only --prefer-offline`; `node_modules` was untouched.
- **`scripts/verify-package.mjs`** and `examples/consumer-smoke/`:
  1. `npm pack` (548 files).
  2. Offline install into a temp app.
  3. Check that exports resolve and no `.d.ts` references CSS.
  4. `tsc` with `skipLibCheck:false`, then `vite build`.
  5. `renderToString` of ZenProvider + Button + a lazy Icon.
  6. Budgets: a Button-only app is 68.5 KB gz of JS including React (budget 90); CSS is 59.2 KB gz (budget 110). No font data and no platform code.
  - `--registry` adds a real install plus publint/attw (needs network).

## Icons

`scripts/build-icons.mjs` now generates:
- `names.ts`: the `IconName` union + `iconNames`.
- `core.ts`: the 96 icons that components use as literals.
- 64 hash buckets + `loaders.ts`.
- `all.ts`.
- `iconData.ts` is gone.

Runtime, in `src/components/Icon/registry.ts`:
- registry `Map`; `registerIcons` and `preloadIcons`;
- `Suspense` + `use(loadIconBucket)` with a same-size empty `svg` as fallback;
- a dev warning with the 3 closest names for an unknown icon.

The platform, Storybook and the figma-contract harness import `src/icons/all` so screenshots never flash an empty icon. Consumers get `@zen/design-system/icons/all` and `/icons/names`.

## ZenProvider (`src/components/Provider`)

- **Props:** `theme` (light/dark/system), `componentTheme`, `density`, `radius`, `emphasis`, `breakpoint`, `typography`, `brand`, `locale`, `paint`, `syncDocument`, `portal`, `as`, plus rest props.
  - `breakpoint` defaults to `auto` on the root (< 744 mobile, < 1024 tablet) and is inherited when nested.
  - `locale` is reserved for GĐ3 and sets `lang`.
- **Behaviour:** paints Canvas, text and font; has its own portal root (`display: contents`); `useZen()` returns the resolved modes.
  - The outermost painting provider mirrors the modes onto `<html>` (restored on unmount).
- **Guideline** slug `provider`. The Canvas paint carries `zen-allow-canvas-layer` because the provider is the page.
- **Dogfood:** `ExampleCard` is now `<ZenProvider as="article" portal={false} paint={false} breakpoint="desktop">`. Screenshots are byte-identical.

## Props API (`scripts/build-api.mjs`, react-docgen)

- 128 components and 990 props. `(typeof x)[number]` and small literal aliases are expanded; big unions map back to `IconName`.
- `@deprecated` is split into `deprecated`; the `extends` clause is recorded; referenced object types come with their declarations (`TabOption`, `TableColumn`…).
- `build-guidelines.mjs` writes (and `--check` verifies):
  - `docs/api/<slug>.json` (46 slugs);
  - a Props + Types section in every guideline `.md`;
  - compact prop lines for the main tags in `docs/guidelines/index.json` (now ~144 KB), plus `purpose` and `apiFile`;
  - `src/platform/api.generated.json`, rendered as the Props section on every component page (the table scrolls sideways under 680px);
  - `llms.txt`.
- New `tagsFor` entries: `provider` (ZenProvider, ZenPortalProvider), ToastStack, and the Chat sub-parts. Every public component now has a slug.

## Entry docs

- **New:** `AGENTS.md` (repo), `CLAUDE.md` (`@AGENTS.md`), `AGENTS.consumer.md` (shipped: setup, 12 rules, API facts, icons, styling, checks), `docs/getting-started.md` (entry points, mode axes table, dark mode, mobile, icons, fonts, troubleshooting).
- **Rewritten:** `README.md`.
- **Platform Installation page:** real steps (pack, install, styles + ZenProvider, AI agent note).
- **Fixed:**
  - `component-usage-rules.md` (harness scope and app paths);
  - `docs/context/README.md`;
  - `button-main.md` (`level` instead of `variant`);
  - 6 platform code samples that imported from `@zen/design-system/icons`, which doesn't exist.

## Defaults fixed (the user chose "Sửa")

- **IconButton:** default level is `tertiary` for main and `primary` for flat (was accent; overlay unchanged). The 15 code samples without `level` now match their previews.
- **Popover:** `open` defaults to `false`.
  - The open state is pinned in the figma-contract cases (popover, search, manual-add-new ×2).
  - New rule `popover/explicit-open` (error; fixture added; one Do line) → 112 rules.
- **Sidebar:**
  - `aria-label` prop (default "Main navigation" / "Workspace navigation"; previously a hard-coded "Zen Design System navigation").
  - No default product branding; new header slots `logo` / `logoCollapsed` / `productName` keep the collapse control.
  - Logo sizing follows the artwork height.
  - The platform passes `figmaSidebarBrand` (`src/platform/PlatformSidebarBrand.tsx`).

## Verification

- **Gates:** `tsc`, `usage:selftest` (112), `usage:check`, `guidelines:check` (50), tokens/styles/icons checks, `npm run build` (lib + platform) and `figma-contract run-all` (19/19, 25 interactions) are all exit 0.
- **Screenshots** vs baseline: button, popover and sidebar are byte-identical at 1512 and 390. Chat 390 differs because of a peer's `chat.css` change at 17:08.
- **Audit** (installation, button, popover, sidebar, chat; 1512/390, `--smoke`, `--dark`): one error, a pre-existing clipped workspace popover in `sidebar@390` "Workspace + members". Its root cause is `overflow: hidden` on `.pe-shell` / `.zen-sidebar__workspace-main`, not these changes; it was reported to the popover owner. The rest are pre-existing warnings.

## Notes for GĐ3–4

- **Left for later:**
  - the Workspace rail's default mark is still `icon-zen`;
  - `data-theme` is still overloaded by component variants;
  - the harness is not shipped in the package (GĐ4 `zen-usage`).
- **ExampleCard dogfooding:** it uses ZenProvider with `portal={false}` so overlays keep the platform portal root, which audit hooks rely on. Preview rows still set `data-typography` directly.
- **Consumer harness path:** `node <Zen-DS>/tools/usage-guard/check-usage.mjs "$PWD/src"`. Relative paths resolve inside the repo.

## Phase 1 re-score: blind trial on the packed tarball

A fresh agent built the "Team members" admin page using only the `.tgz` and the docs shipped inside it.

- **Score: 7.5/10** (was 5).
- **Discovery:** 2 files read before the first correct component (was ~14): `package.json`, then `AGENTS.consumer.md`.
- **Markup:** 87 lines of custom CSS; 11 raw HTML elements against 51 DS elements (~82% DS).
- **Checks:** 0 type errors; the harness raised 1 false positive (`button/filter-is-chip` on `aria-haspopup="listbox"`, for Phase 4).
- **Probe:** MUI-style API guesses still fail 14/15 (API normalisation is Phase 3).
- **Bundle:** 118 KB gzip JS for the whole admin page.
  - 11 non-core icons pulled 10 of the 64 buckets, about 80 KB gzip.
  - Buckets are now 256 (2–4 KB each), so the same 11 icons cost roughly a third of that.

Fixed right after:
- `AGENTS.consumer.md`:
  - native `onChange` on fields and Search, and the change callbacks of the other fields;
  - Pagination `pageCount` vs `total`/`pageSize`;
  - the canonical multi-select filter Chip;
  - layout / text / page-frame rows;
  - page-margin tokens;
  - prefer Heading/Text over raw `h1` + class (browser margins).
- `docs/api`: `extends` is now detected for type-alias props (InputField, SelectField, TextAreaField list their HTML attributes).
- `index.json`: ModalForm compact props.
- README: no hard-coded rule count; points consumers at `AGENTS.consumer.md`.

Still open:
- The Sidebar `footer` ignores the collapsed rail (Sidebar owner).
- Inter ships as `.woff` rather than `.woff2` (needs a converter).

# Phase 2 (GĐ2): the app-composition layer

## Built

| Group | Components | Owner |
| --- | --- | --- |
| Foundation | `_shared/scale.ts` (`normalizeScale`, `ZenGap`/`ZenPadding`/`ZenCornerRadius`), `Text`/`Heading`/`plural`, `Stack`/`Grid`/`Box`/`Container`, `ToastProvider` + `useToast` (hosted by the outermost `ZenProvider`) | lead |
| Page frame | `AppShell` (sidebar, sticky top bar with `header`/`headerActions`, drawer below 1024px, skip link), `PageHeader` (back, breadcrumbs, eyebrow, meta, actions, tabs) | lead |
| Navigation | `Link` (`external`, `underline`, `tone`, `as`), `Menu`/`MenuItem`/`MenuSeparator`/`MenuGroup` (APG menu button), Sidebar `href`/`selectedId`/`linkAs`, PopoverItem `itemRole` | agent |
| Forms | `useFormState` (`field`/`selectField`/`checkboxField`/… bindings), `Form` (focus first invalid, live region), `FormField`, `FormFieldset`, `FormActions` | agent |
| Content | `VisuallyHidden`, `DescriptionList`/`DescriptionItem`, `ActionBar`, `Image`/`Thumbnail` | agent |

- Every component has stories, a platform page (playground + ≥ 4 examples), a guideline entry, harness rules with fixtures and visual Do/Don't pairs. Harness 112 → 132 rules; guidelines 50 → 61 slugs; every public component has a slug (no `unassigned` warning).
- **Templates** (`src/templates`, shipped as source, import `@zen/design-system` through `paths` + a Vite alias): AdminList, Detail (invoice), Dashboard, SettingsForm, SignIn, MobileList, MobileDetail (order), EmptyError. The platform "Templates" page renders each one and shows its file through `?raw`.
- **Dogfood:** the codemod moved `PlatformShowcases.tsx` to the public `Text` (`style=` → `textStyle=`) and `Stack`; ExampleCard is a `ZenProvider` (`paint={false}`, `portal={false}`). 413/416 example cards are pixel-identical before/after; the other 3 are nondeterministic media/shimmer.

## Late changes (integration)

- `Grid` `columns` also takes a CSS track list (`{ mobile: 1, desktop: "2fr 1fr" }`) for a main column + aside; the CSS vars now hold whole track lists (counts are written as `repeat(n, minmax(0, 1fr))`, so existing grids are unchanged).
- The hand-made sr-only helpers are gone: Table, Stepper, Chart (agent), Form's live region and AppShell's skip link (lead) use `VisuallyHidden`; `.zen-table__sr` is deleted after swapping the two platform examples. `audit.mjs` `visible()` skips `.zen-visually-hidden:not(:focus-within)` instead of the dead `.zen-chart__sr`.
- Templates page: mobile templates render their own `ZenProvider` inside the phone (portal on) and the phone gets `contain: layout`, so Bottom Sheets open inside the phone instead of over the page; the phone no longer pads for the status bar / home indicator when the template's TopNavigation / ActionBar already do.

## Deviations from the plan

- `DescriptionList` `stackBelow` defaults to 280 (not ~360): phone receipts in sheets/cards are 300–350px wide and must stay inline.
- `ActionBar` has `primaryAction`/`secondaryAction` objects, a `summary` slot and an in-flow spacer for `position="fixed"` besides `children`; sticky/fixed z-index 3 so an open field popover (4) paints over it.
- `Menu` positions itself with a local hook: `useAnchoredPosition` ignores the scroll offset of portalled layers.
- Templates: 8 as planned; the mobile detail uses inline SVG sample pictures so it runs offline.

## Open for GĐ3–4 (found on the way)

- `DatePicker` `open` defaults to `true` (another wrong default, like Popover had).
- Input family doesn't forward `aria-describedby`; `SelectField` `onBlur` never fires (FormField/useFormState work around it).
- `audit.mjs` swallows navigation errors (a crashed page can look clean).
- The Workspace rail's default mark is still `icon-zen`; `data-theme` is still overloaded by component variants.
- Inter ships as `.woff`, not `.woff2`; the Sidebar `footer` ignores the collapsed rail.
- PageHeader actions wrap in DOM order on phones (Primary is not moved first).

## Phase 2 verification

- **Gates:** `tsc`, `usage:selftest` (134 rules), `usage:check` (173 files), `guidelines:check` (61), tokens/styles/icons checks, `npm run build`, `figma-contract run-all` (19 suites + 25 interactions) and `verify:package` all exit 0.
  - Package: Button-only app JS is 68.5 KB gz; CSS is 62.8 KB gz.
- **Audit:** `platform:audit:full` (147 runs) and `--dark` (98 runs) have no error-level findings. Only the old contrast and target warnings remain, in avatar, bottom-navigation, top-navigation, chip, chat and input.
- **Audit gap found:** `allPages()` only read `componentNavigation`, so the 12 app-layer pages were never in a full run. It now also reads `appLayerPageIds`. Those pages and every page touched after the trial were audited separately (below).

## Phase 2 re-score: final blind trial

A fresh agent had only the `.tgz` and the docs inside it, with `src/templates` closed until the end. It built both original screens: the desktop "Team members" admin page and the 390px "Order detail".

| Metric | Baseline | After GĐ1 | After GĐ2 |
| --- | --- | --- | --- |
| Custom CSS lines | ~220 | 87 | **0** (both screens) |
| Raw HTML elements | ~40 | 11 | **0** (51 + 27 DS elements) |
| Files read before first correct usage | ~14 | 2 | 6 (`AGENTS.consumer.md` was the 3rd and would have sufficed) |
| Type errors | many | 0 | 3, one cause: an `interface` passed to `useFormState` |
| Harness on the screens | n/a | 1 false positive | 0 errors, 0 warnings |
| MUI-style probe failures | 15/15 | 14/15 | 13/15 (API normalisation is GĐ3) |
| Score (agent) | 5 | 7.5 (one screen) | **7.5** (two screens) |

- **Bundle:** Team members is 127 KB gz JS (~58 KB without React); Order detail is 105 KB gz. Icons ship as 256 lazy chunks, none preloaded. CSS is one 64.6 KB gz file.
- **Templates verdict:** copying AdminList and MobileDetail would have been much faster than 25 doc reads. However, they drifted from the guidelines.

Fixed right after the trial:
- **Templates:**
  - AdminList: the name cell is now `TableMedia`; badges sit in `TableBadges` at Medium; the toolbar is a `Grid` with `"minmax(0, 320px) 1fr"`; the row ⋯ is Flat Primary under a hidden "Actions" header.
  - Everyday toasts are Neutral, with details in `children` so titles stay ≤ 60 characters.
  - "Clear filters" and "Clear search" moved to `secondaryAction` (Tertiary).
  - Detail: line items use `TableText caption`.
  - MobileDetail: the icon-only Back is labelled "Back".
- **Harness:** `empty-state/way-out-tertiary` and `table/actions-flat` (warn). The first caught one platform example, which is now fixed.
- **Guidelines:**
  - Toast: Neutral vs Positive, and the example.
  - PageHeader Back vs TopNavigation Back.
  - EmptyState way out.
  - Search in a toolbar.
  - List inset inside a padded Stack or Box.
  - Table row actions.
- **Consumer docs:**
  - `AGENTS.consumer.md`:
    - how to query `index.json` (~180 KB) or scan `llms.txt`;
    - the toolbar Grid, page padding and toast type;
    - `useFormState` typing, EmptyState actions and List inset;
    - the Flat row-action trigger.
  - `getting-started` toast example.
  - README marks the repo-only sections.

Estimate after these fixes: ~8/10 for "an AI builds production-ish screens from the package". It has not been re-measured. What remains is mostly GĐ3/GĐ4 work: the prop vocabulary, icon-name discoverability, per-component CSS, and a documented visual check without a dev server.

## Final checks (after the trial fixes)

- **App-layer and touched pages:** 12 app-layer pages plus chip, table, empty-state, search and list-item, at 1512/1024/390 with `--smoke`, and dark at 1512/390.
  - The first run gave 9 + 5 error findings, all on `templates` at 1024/390: "layer zen-toast … paints over the open popover". One read "layer svg": the toast's icon.
  - A toast left by an earlier smoke click (Export, the bell) overlapped a popover opened later near the bottom of the viewport.
  - This is by design, not a bug: the toast stack is the top notification layer (z-index 1100, above Menu 1000 and Dialog 1000), as in MUI and Atlassian.
  - The audit's overlap probe now skips `.zen-toast-stack`, like tooltips. Re-run: templates are clean at 1024/390 and at 390 dark. The rest were already clean apart from the old list-item contrast and chip target warnings.
- **Gates:** `npm run build` and `verify:package` pass, as do tokens, styles, icons, guidelines (61), `usage:selftest` (134) and `usage:check` (173 files).

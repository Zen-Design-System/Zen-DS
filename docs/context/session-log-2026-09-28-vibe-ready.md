# Session log 2026-09-27 → 09-28: vibe-ready, Phases 3–4 (original session)

This session is "Đánh giá Zen DS hiện tại". Phases 1–2 are in `session-log-2026-09-27-vibe-ready.md` (fork session).
The plan is in `~/.claude/plans/zen-vibe-ready-phase3-4.md`.

## How the work was set up

- Everything is in the git worktree `../Zen-DS-vibe` on branch `feat/vibe-ready`.
- Commits are local only: nothing is pushed or published, and the branch is not merged into main.
- The shared folder is brought in as snapshots:
  - Snapshots go on branch `snapshot/2026-09-27`. They are written with a temporary `GIT_INDEX_FILE`, so the shared HEAD, index and files stay untouched.
  - Each snapshot is then merged into the branch.
  - There were three merges. The last one (2026-09-28) brought in the peers' CHANGELOG, HANDOFF, style-guard, `npm run qa` and the platform behaviour/quality audits.
- The worktree dev server is the launch config `zen-vibe-worktree` (port 5175). The shared tree keeps port 5173.

## Commits (first parent)

| Commit | What |
| --- | --- |
| `e255f13` | Vitest browser mode (Chromium, reduced motion): smoke tests for every component in light and dark, an axe baseline that only shrinks, and `tools/platform-audit/visual-diff.mjs` |
| `058612b` | Harness split: `engine.mjs` (consumer mode sees only `@zen/design-system` imports), `cli.mjs` (bin `zen-usage`), `eslint.mjs`, `api.mjs` |
| `53d5dc6` | `zen-ds-mcp` with 9 tools; size rules read both spellings |
| `142bf55` | `npx zen-ds init / doctor / check` |
| `bab0615` | CI workflow (`.github/workflows/ci.yml`) |
| `4629c7b` | Both size spellings through `scaleKey()`; i18n foundation (`labels.ts`, en/vi); `icon/unknown-name` |
| `f460f3c` | One `ZenContext` for modes, locale and labels |
| `1632e63` | MCP `map_figma_component`; AI docs for the new API |
| `769d69c` | `onValueChange` / `onCheckedChange` / `selected`, icon names in icon props, localized labels, a11y fixes |
| `0fac748` | Component variants use `data-tone` (it was `data-theme`, the token mode attribute); Sidebar uses `data-sidebar-density` |
| `0ca46ed` | Stories for the 15 components that had none |
| `bccc6ab` | Compat aliases, the last 43 label sites, icon plain names, harness rules |
| `4170817` | Merge of the shared tree (conflicts listed below) |

## Compat aliases (`bccc6ab`)

A probe of 15 newcomer guesses was written without the docs. Before this work 6 type-checked; now 13 do.

- **Overlays: Dialog, ModalForm, SidePanel, BottomSheet**
  - `_shared/overlay.ts` (`useOverlayOpen`) accepts `isOpen` (deprecated) and `onClose`.
  - `open` is optional: an overlay mounted without it is shown, so `{show && <Dialog …/>}` works.
  - Bug found on the way: `useModal` had `onOpenChange` in its effect dependencies. With an inline handler, every parent render re-ran the focus trap and moved focus back to the first field. `useOverlayOpen` returns one stable setter.
  - `tests/interaction/aliases.test.tsx` fails with an unstable setter and passes now.
- **Other props**
  - Button `leftIcon` / `rightIcon`.
  - Badge `color`: it used to type-check as the HTML attribute and do nothing.
  - Toast / AlertBanner / InlineMessage `status`, mapped by `_shared/status.ts`.
  - Table `data`, optional `rows`, optional `getRowId` (default: the row's `id`, else `row-<position>`).
  - Field `errorMessage`.
- **Icons**
  - Only four icon families lack a plain name: `icon-search-line`, `icon-x-line`, `icon-chevron-left-line` and `icon-chevron-right-line`.
  - `build-icons.mjs` generates `aliases.ts` for them (plain name → Medium cut), adds them to `IconName`, and records them in the manifest.
  - `registry.ts` resolves the aliases, and `icons:check` validates them.
  - The harness accepts the aliases and suggests names through synonyms (close → x, gear → settings).
- **`useFormState`:** the checkbox, toggle and radio bindings pass `checked` / `onCheckedChange`. They used deprecated props that the harness cannot see through a spread.
- **Left out on purpose**
  - SelectField `onChange(value)`: it would change what the native event means.
  - Card `padding="lg"`: Figma has only two paddings (the `spacing` prop).

## i18n

- A helper agent localised the last 43 `TODO(labels)` sites with 67 keys in en and vi. English output is unchanged.
- Nested records (`opinion`, `richText`, `holdActions`) merge in `ZenProvider`.
- These stay in English on purpose, each with a comment at the site:
  - the emoji names (they are search keys);
  - the reaction ids;
  - the DateField `MM/DD/YYYY` placeholder (it is the only format the parser reads);
  - Figma's "Content label" placeholder.

## Merge of 2026-09-28: conflicts

| File | Resolution |
| --- | --- |
| `CHANGELOG.md` | The team's format is kept. `[0.4.0] — Unreleased` is on top. The part-1 package items moved into `[0.3.0]`. |
| `AGENTS.md` | Both sets of tool rows are kept. |
| `package.json` | Both script sets are kept. |
| Chart, Chat, ChatReply | The localized labels are combined with the peers' token icon sizes. |
| `inline-message.css` | `data-tone` is combined with the token size. |

- `tools/style-guard/baseline.json`: one key followed the `data-tone` rename.

## Verification (2026-09-28)

| Gate | Result |
| --- | --- |
| `tsc` | 0 errors |
| Vitest | 216 passed, 6 skipped, 7 files |
| `usage:selftest` | 140 rules |
| `usage:check` | 0 errors; 27 warnings, all `icon-button/needs-action` on platform demo buttons |
| `guidelines:check` | passes |
| `tokens:check`, `styles:check`, `style:check`, `icons:check` | pass (`icons:check` validates the 4 aliases) |
| `mcp:selftest` | 9 tools |
| `build` | passes |
| `verify:package` | passes: Button-only 73.3 KB gz, CSS 63.0 KB gz |

- The consumer smoke app now uses `Heading`, Tabs `onValueChange` and an `IconButton` with an action.
- **Figma parity** (`figma-contract/run-all`): every suite matches, and 25 of 25 interaction checks pass.
- **Visual diff, shared tree (5173) vs worktree (5175), 686 panels:**
  - 676 are identical.
  - 7 Pagination/Table panels differ by 22–37 px in the range text. The text is the same; the range is now one text node.
  - 3 templates at 390 differ on purpose: on phones the PageHeader Primary comes first (`769d69c`).
- **Behaviour audit** (`platform:behaviour`, 11 pages at 1512) gives the same findings on both trees, so the branch adds none.
  - One finding was a real bug: `[apg] dialog › Invite teammates` kept focus outside the dialog. `useModal` focused a primary action that was still disabled.
  - It is fixed in `93c343c`: a disabled target falls back to the first focusable control. A test covers it.
  - Still open: NumberField stepper buttons are not in the Tab order. That follows the APG spinbutton pattern, and the audit owner was told.

## Final blind trial (packed tarball, 2026-09-28)

A fresh agent built "Team members" (desktop) and "Order detail" (390) using only the installed package and the MCP
server through a helper.

- **Result:** 8.5/10. The previous final trial scored 7.5.
- **What it wrote:**
  - 0 custom CSS lines (`.css` or `style`), 0 `className`, 0 raw elements.
  - 0 type errors on every run. Probe: 13/15.
  - `zen-usage` found nothing in its files, and `zen-ds doctor` passed after `init`.
  - Templates gave about 85% of each screen.
- **Bundle (gzip):**
  - team-members JS about 116 KB, order-detail about 93 KB, plus 65 KB of CSS.
  - The shared chunk is 86 KB.
  - Icons load as 256 lazy buckets.
- **Caveat:** the agent's context also carried the user's saved Zen notes. It read nothing outside the package.
- **Fixed right after the trial (`75ae11f`):**
  - The MCP server now validates arguments. A misspelt `check_usage` argument used to answer "No Zen imports found".
  - Template drift: Sidebar `selectedId`, Search `onValueChange`, two-letter initials, and an h1 on the mobile detail screen.
  - Two doc contradictions: the `locale` row, and ToastStack vs `useToast`.
- **Its three blockers:**
  1. No consumer command to check a rendered page (headless render, axe, light/dark/390 screenshots).
  2. Template drift spreads because agents copy templates.
  3. Weight: every page ships the full CSS and the shared chunk, and the fonts are `.woff`, not woff2.

## Open items

- **From the trial:**
  - The compact TopNavigation title is not a heading. Making it an h1 affects every platform example, so it needs a coordinated change.
  - The AdminListTemplate Pagination never shows with 5 sample rows.
  - There is no theme setter in `useZen()`.
  - `preloadIcons` accepts any string.
  - `zen-usage` has no `--help` and no exclude option.
  - Sidebar section labels render as `role="presentation"`.
  - During SSR, icons suspend.

- `src/platform` still passes deprecated props in about 160 places: DatePicker and AutocompleteField `onChange`, Chip `select`, and others. They work, and the harness only warns in apps. This is a platform-owner cleanup.
- 27 platform demo IconButtons have no action (`icon-button/needs-action`).
- The version bump happens at release, following the team's CHANGELOG rule. `package.json` still says 0.3.0.
- Code Connect is blocked by the Figma plan: it needs Organization or Enterprise. MCP `map_figma_component` stands in for it.

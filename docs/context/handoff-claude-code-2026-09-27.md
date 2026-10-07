# Handoff → Claude Code (2026-09-27)

Continue the "review every built component against Figma" pass. Everything below is already in this repo; no Figma re-read is needed for the sets listed as extracted.

## Where things stand

Verified 100% against Figma data (run `node tools/figma-contract/run-all.mjs`):
Checkbox (Text, Mark, Content), Radio (Button, Mark, Content), Chip (Normal, Advanced, Number-Only, Trailing),
Popover (Default, Item, Item/Content, Search, Manual-Add-New, Bunk-Action), plus 25 interaction checks.
Button: all six sets at every size × Level × State, 3 modes incl. Smooth radius (47,394 checks), and Input/Heading
(21 variants, 432 checks) — done by Claude Code on 2026-09-27, see `session-log-2026-09-27.md` "Button + Input/Heading".
Avatar/Badge/Badge-Counter colour themes verified earlier (66/66, light mode).

Figma data already extracted (Plugin API, bindings included) in `docs/figma-contracts/`:

| File | Sets (id) |
|---|---|
| `button-text.json` | Button/Main 1026:8312 (225), Button/Flat 1070:18754 (50), Button/Overlay 1026:8747 (100) |
| `button-icon.json` | Button/Icon-Main 205:21062 (270), Icon-Flat 234:43906 (125), Icon-Overlay 291:41855 (120) |
| `segmented-toggle-badge-avatarstack.json` | Segmented/Item 1204:11690, Segmented 1238:892, Toggle 1526:5703, Toggle-Button 1523:104, Toggle/Content 1526:5945, Badge 260:4825, Badge-Counter 9535:33812, Avatar/Stack 364:92561, Avatar/Status 217:7418 |
| `avatar-single.json` | Avatar/Single 223:9050 — Neutral + Photo themes only (48; other themes' colours already verified) |
| `input-search.json` | Search/Default 846:37624, Input Text/Select/Date/Heading/Autocomplete/Number(L,C)/Text-Area fields, Help-Text, Condition-Item, Input-Conditions, Leading-Trailing, Label, Cursor, Text-Area primitive, Control-Bar/Select-Item |
| `input-search-primitives.json` | Field-Only 374:103464, Search/Popover 1604:27401, Input-Content 373:102481, Divider 460:38361 |
| `datepicker-sidebar.json` | 12 Date-Picker sets (455:33517 Item, 895:31954 Single-Calendar, 9923:3576 Mobile, …), 6 Sidebar sets (1536:27473 Menu-Item/Master, 4081:15234 Basic, 4218:9166 Workspace, 5974:20590 Small-Density, 6044:81281 Section-Title, 4081:14937 LOGO) |

## Next steps (in order)

1. ~~Button~~ **Done (2026-09-27).** Six suites green. Code fixes: Focus-Ring radius per size (was Focus-Medium for all),
   icon-only Container = Corner-Radius/Rounded with a circular ring (user decision), Icon-Flat Secondary/Danger/Positive
   content colours. Figma inconsistencies are recorded as `figmaExceptions` in each suite.
2. ~~Input/Heading~~ **Done (2026-09-27).** The described bug was not in the current code (HeadingField already applied
   Heading/1–3 since v0.2.0). The new `input-heading.mjs` suite found and fixed a different one: the input's −8px pad
   collapsed through the root (root 56/52/48 instead of 40/36/32) → `display: flow-root`. Open gap: Figma
   Inputted-Multi-Line wraps the heading, which a native `<input>` cannot do (needs an auto-growing textarea).
3. Segmented, Toggle (+ Toggle-Button set has "existing errors" in Figma — `variantProperties` throws; names parsed from layer names), Badge/Badge-Counter geometry, Avatar geometry + Stack (gap −4 Small / −8 Medium, first on top) + Status (sizes 4/8/12/16, outside stroke 1/2/2/3, Disabled uses Solid-Disabled-Alt for XS/S).
4. Search/Default, then the Input family (Field-Only radius per size: Input/Small 8, Medium 12, Large 16, XLarge 16; Hover stroke 2px; Focused stroke Focus/Neutral/Solid; Read-Only has no Effect/Input).
5. DatePicker, then Sidebar (Menu-Item nests `Primitives/Notification-Dot`; Sidebar blur 80 → CSS 40px).
6. Gaps to report, not silently fill: Figma icon sets `Flag` (260), `icon-social` (138), `icon-media-file` (10) are not in the icon pipeline; Figma has two components both named `icon-building-03-line` (code exported the second as `-1`). Autocomplete nests `Tag` (not built).

## How to work (lessons that saved the most time)

- **Figma without the connector**: Figma desktop → Cmd+Opt+I → Console; the `figma` Plugin API global works. Paste `tools/figma-contract/figma-console-extract.js`, run `await __RUN(['<set id>', …])`, then `copy(__C(i))` for `i < __N()`. `copy()` does not work inside a statement that uses `await` — run it as its own line. Clipboard reads cap at ~256 kB, hence 230 kB padded chunks.
- **Blur**: CSS `blur()` = Figma radius ÷ 2 (checked with `node.getCSSAsync()`). Use `--zen-style-*-backdrop-filter`, never literals.
- **Shadows**: CSS order = reverse of Figma's effect list; colours use their bound variables.
- **Strokes**: INSIDE → border (border-box) or `::after`; OUTSIDE → `outline` or `box-shadow 0 0 0 Npx`; never a border that changes layout.
- **Instance overrides matter**: e.g. Popover's Search overrides Field-Only radius to Input/Medium and removes the focus stroke. Read the nested instance, not only the main component.
- **Text widths** differ ±1–4px between Figma's Inter and Inter 4.001 → never assert text-hugging widths; assert heights, offsets, paints, bindings.
- **Path names with `/`** (e.g. `Avatar/Single`): write checker paths with ` > ` separators.
- Disable transitions in measurements (the harness does) or colours are read mid-transition.
- Record real Figma inconsistencies in the suite's `figmaExceptions` instead of copying them.

## Environment notes

- Build tools: node_modules are macOS binaries; Linux shells can't run `tsc`/`vite` from them and npm registry egress was blocked in Cowork. On the Mac: `npm run build`, or double-click `Build and check.command`.
- Contract checker needs Playwright + esbuild (repo node_modules or global).

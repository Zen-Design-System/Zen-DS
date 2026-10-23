# Studio Variables v2 — spec card (G4, BACKLOG "P2 · Studio Variables v2")

Session B, 2026-10-23. Tier L. The user approved G4 in the morning queue (relayed by Giám sát). The questions in
"Decisions" go to the user before any code. Base: v1 (#116, `docs/research/studio-figma-native-parity-2026-10-17.md`
§5b, §10) and E5 Apply / Detach variable (#151).

## What v1 has (on main)

- **Window:** a Variables window with 11 collections from `tokens/source/figma/*.json`, groups by `/`, a column per
  mode, value cells and alias chips.
- **Editing:** edit, alias and detach; create, rename, duplicate and delete. Rename and delete are refused while code or
  another variable reads the variable.
- **Save:** edits are drafts with ⌘Z, and the dev server serves tokens.css from the drafts. ⌘S builds and checks the
  tokens. Copy for Figma writes `zen-studio-variables` v1 for the plugin (create / rename / set / delete).
- **Where a mode switch lives today:**
  - The canvas preview modes (toolbar Modes) are global and last for the session only.
  - A frame's Light / Dark is a `frameOverrides` entry in sessionStorage (`StudioFrame` `data-theme`); it is not in the
    page.
- **Fixed lists:**
  - The mode lists are hard-coded in three places: `ZenProvider.tsx` (`zenThemes`, `zenComponentThemes`,
    `zenDensities` …, `zenBrands = ["zen"]`), `studio/shell/modes.ts`, and the CSS selector table in
    `scripts/token-outputs.mjs` (`modeSelector`: one data attribute per collection).
  - The 11 collections are fixed by that same selector table.
- **Variable fields:** a variable has only `name`, `type` and `valuesByMode`. The Figma export carries no description,
  scopes or code syntax (2,234 variables checked).

## What v2 covers (BACKLOG)

1. **Per-frame modes (Figma E6, Change variable mode):** a frame, Section or Screen keeps a mode per collection, saved
   in the page, drawn by the canvas, Play and export, pushed and pulled to Figma (`setExplicitVariableModeForCollection`).
2. **Modes:** add, rename, duplicate and delete a collection's mode.
3. **Rename a variable that code reads.**
4. **New collections.**
5. **Description, scoping and code syntax** per variable.

## Defaults I propose (no question needed)

- **Description and scopes:**
  - They are optional fields on the variable in its collection JSON.
  - The Figma → repo sync keeps them (the sync script merges by name).
  - The plugin writes `description` and `scopes`.
- **Code syntax:**
  - Read-only in Studio: WEB = `var(--zen-…)`, generated from the name.
  - The plugin writes it with `setVariableCodeSyntax("WEB", …)`, so Figma Dev Mode shows the Zen CSS name.
- **New collections:** single-mode only (`:root`) in v2. A collection with modes needs a new data attribute and a
  ZenProvider axis, which is a public API change; it waits.
- **One ⌘Z per action, as v1:** drafts of the files it touches. A mode add touches the collection JSON and the
  generated lists.

## Decisions (the user, 2026-10-23, in session B)

- Q1 → (A) "Prop modes trên frame": `modes={{ … }}` on Screen, Section, Stack, Grid, Box.
- Q2 → (A) "Mọi collection có mode": the mode lists are generated from the tokens.
- Q3 → (A) "Đổi tên + giữ tên cũ làm alias": the old CSS name stays as a deprecated alias.

The questions as asked:

**Q1. How a frame keeps its mode in the code (E6).**
- (A) One `modes` prop on Screen, Section, Stack, Grid and Box: `modes={{ theme: "dark", density: "comfortable" }}`.
  - The keys are ZenProvider's axis names.
  - It renders the data attributes on that element. ZenProvider's scoping rules already make a nested `data-theme` work.
  - Push and pull map it to Figma's explicit modes.
- (B) Wrap the frame's content in `<ZenProvider theme="dark">`. That uses an existing API but adds a layer, and
  ZenProvider also mounts toasts and the portal (heavy per frame).
- (C) Leave E6 out of v2.

**Q2. Adding a mode.**
- (A) Any collection that has modes.
  - The mode lists become generated from the tokens: ZenProvider's arrays, the Studio Modes list, and the CSS
    selectors keep their attribute.
  - A new mode is reachable as soon as tokens:build runs.
  - Delete or rename is refused while a page or code uses that mode, as v1 does for variables.
- (B) Only Component Theme. Brand colours already live in the project themes (`data-brand="p-<id>"`), and the other
  axes are design decisions with code (Density, Typography).
- (C) No mode editing in v2.

**Q3. Renaming a variable that code reads.**
- (A) Rename it and keep the old CSS name as a deprecated alias (`--zen-old: var(--zen-new)`, written by tokens:build).
  - Nothing breaks.
  - The harness warns on the old name, as renamed props stay as `@deprecated` aliases.
  - Figma gets the rename.
- (B) Rename and rewrite every reader (CSS and TSX under `src/`) in the same change. Studio shows the file list first.
- (C) Keep v1's refusal.

## Chunks (one PR each, after the answers)

| PR | Content | Tier |
| --- | --- | --- |
| 1 | Description + scopes + code syntax (window fields, JSON, sync merge, plugin) | M |
| 2 | Q3 rename of code-read variables | M |
| 3 | Q2 modes (generated lists + window: add / rename / duplicate / delete a column) | L |
| 4 | Q1 per-frame modes (prop or wrapper, Design panel › Appearance "Apply variable mode", canvas, Play, export, push / pull, plugin) | L |
| 5 | New single-mode collections | S |

**Checks for each PR:**
- `variables.selftest`, `variablesModel.selftest`, `tokens:build` + `tokens:check`;
- E2E group `variables` (VA-05…) and FW-212…219 for the Design panel parts;
- plugin `npm test` and a live import into the Zen file (QA page, removed after);
- the scoped gate.

## Status (2026-10-23, branch zen/feat/studio-variables-v2-20261023)

- Chunks 1–4 are built, one PR: Edit variable, rename with an alias, modes, per-frame modes.
  - Plugin commits: 217d5c6, 09849d4, 1d3f0e3.
  - Every Figma write was checked live on throwaway nodes.
  - E2E: VA-05…07 and FW-212/213.
- Chunk 1 needed fixes after review: a create checked no name while `except` was undefined, and the old-name rename
  needed the build's alias resolution (byName) too. Both are fixed and in the selftests.
- Chunk 5 (new collections) first moved to BACKLOG. It was my own default, not one of the user's three answers, and it
  is wider than the S it was given: the build's fixed list of 11 sources, dev-server drafts of a file that does not exist
  yet, and the native token generator.
  - The user then approved it, and it was built on 2026-10-23 on its own branch
    (zen/feat/studio-variables-collections-20261023): `docs/research/studio-variables-collections-spec-2026-10-23.md`.


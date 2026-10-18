# Zen Studio projects and their themes (2026-10-17)

User request: Studio is separate from the docs (Document | Studio), so making a new file works differently. Make
**projects like Figma**. When a project is created, set its theme on a theme page: custom Primary, Neutral, chart
sectors, corner radius, component theme, component size and so on. The page shows Zen components so the changes can be
seen, as other "custom theme" pages do (later: "sinh động như trang tailwind color app" and "chart nên chia nhiều sector").
It must **not overwrite the codebase**: only one extra mode per project. The theme can be changed later in Project
settings.

Decisions (the user, same day):
- Pages that belong to no project go to **Drafts**, which keeps the shipped Zen theme.
- Corner radius uses the **four existing modes** (Rounded, Smooth, Standard, Luxury). There is no custom radius scale.
- Build phase 1 now.

## Model

| Piece | Where |
| --- | --- |
| Project (name + theme, the source) | `.zen-studio/projects/<id>/project.json` (gitignored with the pages) |
| Its mode as CSS, written on every save | `.zen-studio/projects/<id>/theme.css` |
| Page membership | the page header `"project":"<id>"`. No key = Drafts. An unknown id also counts as Drafts. |
| Folders | `StudioFolder.project` (IndexedDB); the Pages panel shows the open project's folders |
| Browser working copy | IndexedDB settings key `projects`. The dev folder wins; a project that exists only in the browser is written to it. |

A theme is one extra mode of the **Base Colors (Project)** collection: `[data-brand="p-<id>"]`. That collection already
had a `data-brand` attribute and only one mode (`zen`). The mode declares:

- Brand and Neutral: 12 solid + 12 alpha steps, Light and Dark.
  - A shipped ramp is an alias (`var(--zen-light-indigo-9)` …), as the Zen mode aliases Zen and Gray, so high contrast
    still applies.
  - A custom colour writes values.
- The four status roles (Positive, Negative, Warning, Info): aliases to the chosen ramp.
- On-Brand Default / Hover / Pressed, Light and Dark.
- Chart sectors 3–7 (`--zen-chart-sector-tertiary … -septenary` and `-subtle`).

Component theme, size, radius, typography and emphasis are the shipped modes. A project chooses them and creates no new
values.

Custom ramps come from `tools/studio/zen-ramp.generated.mjs`, a copy of the Zen Figma plugin's `generateExpectedPalette`
(made by `tools/studio/zen-ramp-extract.mjs` from `~/Documents/zen-ds-figma-plugin-main/src/ui/main.js`).
`project-theme.selftest.mjs` proves the copy: it rebuilds every step of the 20 shipped ramps (960 values) and Zen's
On-Brand values. Generation order: Neutral first, because its Dark step 1 is the dark canvas every other dark ramp is
generated against; then Primary.

## CSS gotchas

- Semantic tokens resolve where `[data-theme]` is declared. A project's `data-brand` must therefore sit on the same
  element as `data-theme`, or on an ancestor of it. Every canvas root that Studio sets up does this (`previewAttributes`,
  `canvasModes`).
- `:where([data-contrast])` re-declares the Zen base aliases. The project block is repeated on
  `[data-brand=…] [data-contrast]:not([data-brand])`.
- The chart sectors read semantic Support tokens, so they are declared on `[data-brand=…] [data-theme]:not([data-brand])`.
  This way a dark frame on a light canvas gets the dark colours.
- Studio chrome inside a project (`data-brand="zen"`) keeps Zen.
- Swatches drawn inside Studio chrome show Neutral-S7: tokens.css re-resolves the component theme for every
  `[data-theme]` under a `[data-component-theme]` ancestor. The theme page therefore reads its component-theme and
  sector swatches from probes on the preview side (`DraftProbes`).

## Surfaces (phase 1)

- **Studio home**:
  - The projects grid shows Drafts, then each project with a thumbnail in its own mode, then New project.
  - A project's home offers New page and Project settings.
  - URL: `?space=studio&project=<id|drafts>`.
- **Pages panel**:
  - On the grid: the projects list, plus New project and New page (a page made there goes to Drafts).
  - Inside a project: back, the project's name and menu (Project settings…, Delete project…), then its folders and pages.
- **Theme page** (`project/ProjectSetup.tsx`): a full-window layer, like Present.
  - Left: the settings.
  - Right: a gallery in the draft mode `[data-brand="studio-draft"]`, in Light, Dark or Both. Its tabs are Cards (Pale
    and Solid cards in the Primary, photos, Display headings, marks in Support/Brand steps), Charts (all seven sectors:
    Donut, stacked bars, stacked areas, radial, grouped bars, heatmap), Dashboard, Website and Components.
  - Changing a chart sector opens Charts.
  - ⌘Z / ⇧⌘Z step through the page's changes. Cancel and Escape discard them.
- **Canvas**: the world, the overlay layer, Present, Play, the insert previews and the HTML export render in the
  project's mode (`useCanvasPreview`, `previewForPage`). Light / Dark stays the Studio's own switch.
- **Inspector** with nothing selected:
  - A Project row: moves the page, and its palette button opens the theme.
  - Preview modes show the project's modes.
- **New pages** go to the open project: New page, templates, Import (when the file names no project) and MCP
  `create_page`.
- **Library**:
  - The only change: Chart sectors 3–7 read the project variables, with today's colours as fallbacks.
  - Sector 7 is back to Green Soft.

## Next phases (not built)

- Phase 2:
  - High contrast for a custom Primary or Neutral, generated with `generateHighContrastRamp` under
    `[data-brand=…][data-contrast="high"]`.
  - Present and Play start from the project's modes, Modes panel included.
  - MCP `list_projects` / `create_project` / `set_project_theme`.
  - ~~The Variables window shows the project's mode as a read-only column of Base Colors (Project).~~ Done
    2026-10-18 (project/projectVariables.ts).
    The same day (user: "chỉ hiện của project đó, không cho hiện project khác hoặc mặc định (mode Zen)") it became
    the collection's only mode: no Zen column, no other project. Drafts shows Zen. Inside a project the collection's
    rows are fixed (rename, new, duplicate and delete would change the Zen source), and a value opens Project settings.
- Phase 3:
  - **Export to code**: `theme.css` + `<ZenProvider brand="p-<id>" …>`. This needs `brand` to accept project ids in
    the public type.
  - **Export to Figma**: the plugin adds the project as a Base Colors (Project) mode (custom ramps as Global Colors
    ramps), and Studio → Figma binds the project's chart sectors.

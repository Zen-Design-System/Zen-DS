# Zen Studio Libraries (Figma's Libraries dialog, ⌥⌘O) — spec card, 2026-10-22

Session C, the third of the user's picks (Slice → Comment → Libraries). The user's decision (2026-10-22): three kinds
of library, each turned on or off — **Zen** (the main one), **the project's own components** and **the project's
theme**.

## Figma's behaviour this follows (help.figma.com "Libraries")
- **⌥⌘O** (or Assets › the book icon) opens Libraries: "This file" first (its local components and styles, Publish),
  then the libraries the file may use, each with a switch; a library turned off leaves the Assets panel and Quick
  insert, while the instances already placed stay as they are.
- A file's pages share its components: a main on one page is used on every other page of the file at once, no publish.

## Studio's mapping
- A **project** is Studio's Figma file (user, 2026-10-17), so the switches belong to the project (`project.json`
  `libraries: { zen, components, theme }`, all on by default). Drafts have no project: Zen only, its switch fixed on.
- **Zen**: off → Zen's components and icons leave Assets, Quick insert (⇧I) and the ⌘K insert commands for the
  project's pages; Zen stays the runtime (pages keep rendering), as Figma keeps the instances.
- **The project's theme**: off → the project's pages draw in Zen's shipped theme (no `data-brand="p-<id>"`, no project
  modes); on → as today. The Project settings page keeps editing it either way.
- **The project's components**: on → the mains (⌥⌘K) of every page of the project are in Assets ("Project
  components", grouped by page) and Quick insert; off → only the open page's own (Local components) are.

## The gap: an instance of another page's main
Today `<Use of="id">` draws a main of the same page only (`renderPage.tsx` `instanceOf` reads the page's own
`LocalComponents`; AssetsPanel refuses others). Project components need one more piece, two ways to build it:
- **A. Live, as pages of one Figma file (recommended):** `<Use of="card-1" page="page-id" />`; the page's
  `LocalComponents` map also holds the project's other mains (namespaced by page), so the instance draws from the main
  where it is; a change to the main shows on every page at once; Go to main component opens that page; detach writes
  the main's layers in place; push to Figma sends the main's page first, so the instance points at it.
- **B. Publish and update, as a Figma team library:** the source page publishes; a page using it keeps a copy of the
  main, shows "Updates available" when the source changes and takes them on Accept.

## Phases
1. The dialog (⌥⌘O, Assets' header, ⌘K "Libraries"), the three switches stored in `project.json`, Zen and theme
   switches working end to end.
2. Project components with the model the user picks (A or B): Assets / Quick insert listing, the instance, Go to
   main, detach, push.
E2E rows FW-197…199 (the progress session's allocation).

## Not in this step
Libraries outside the project (another project's components), styles / variables libraries beyond the theme,
publishing to Figma as a team library.

---
name: zen-figma-design
description: Design or edit screens in a Figma file built on the Zen Design System (a file that uses the Zen library, or a copy of the Zen file) through the Figma MCP server's use_figma. Only Zen components, variables and text styles; Zen's screen rules; the Zen audit after every screen. Use for vibe design, mockups, new screens or flows, and fixes in a Zen Figma file.
---

# Zen Figma design

The goal is a screen a Zen designer accepts without fixing it: built only from Zen components and tokens, laid out by
Zen's rules, with real content, and checked by the audit before the next screen starts.

Files in this skill:

| File | Read it |
| --- | --- |
| `references/screen-rules.md` | before the first screen: layout, surfaces, spacing ladder, component choice |
| `references/figma-components.md` | to find a component set and its exact property names and values |
| `references/figma-tokens.md` | to pick a colour, spacing, radius variable or a text/effect style |
| `references/figma-gotchas.md` | before writing `use_figma` code that touches instances |
| `references/guidelines/<component>.md` | for each component you place: "Use it for", "Use something else for", Do/Don't (the Props part is the React API) |
| `references/component-usage-rules.md` | the full Zen rules the screen rules summarise |
| `harness/zen-figma-audit.js` | after every screen: run it with `use_figma` (§4) |
| `references/audit-rules.md` | how to fix each audit finding |

## 1. Before the first change

1. **Load Figma's own skills.** `figma-use` before every `use_figma` call, and `figma-generate-design` before a visible
   change (with the Figma plugin: `/figma-use`; without it, the MCP resource `skill://figma/figma-use/SKILL.md`). This
   skill adds Zen's rules on top of them; where they differ, this skill wins for Zen files.
2. **Pin the target.** The file key from the URL (`figma.com/design/<fileKey>/…`), the page, and the frame ids
   (`node-id=12-34` → `12:34`). Never guess a node id.
3. **Read the file (read-only).** Pages; local variable collections (a Zen file has Mode Colors (Semantic), Spacing,
   Corner Radius, Breakpoint & Grids, Component Size, Component Theme, Typography Configuration); text and effect
   styles; and where the Zen components live:
   - a copy of the Zen file: local sets on the `❖ …` pages, patterns on `◇ Master-Layout`, templates on `◆ …`;
   - a file that uses the Zen library: `get_libraries` lists it ("ZEN Kaiz (Official-Sep2026)" is the official one).
     Scope `search_design_system` with `includeLibraryKeys: [<that key>]`: other libraries reuse Zen's names (forks),
     and an unscoped search mixes them.
   In the Zen file every component set, variable and style carries a description written from Zen's rules (what it
   is, when to use it, what to use instead, its properties): read it before you place or bind something. The
   🔤 Typography page's Content-Hierarchy section is the heading and text-style ladder.
4. **Read the brief into a screen list.** For each screen: who uses it, the one main action, the data it shows, the
   states it needs (empty, loading, error, an open menu or dialog). Reference the source app's features, not its look.

## 2. Hard rules (an audit error or a designer's rejection when broken)

- **Only Zen components.** Every control, card, list, table, header and navigation is an instance of a Zen set. A
  visual Zen does not have (a timeline, a custom chart) is a local component with auto layout built from variables,
  never loose rectangles. Never detach an instance.
- **Change instances only through their properties** (`setProperties`, variant values from figma-components.md) and
  their slots. Never paint, resize or restyle a layer inside an instance; size the instance itself. Never set an
  INSTANCE_SWAP property to the value it already has (the icon loses the variant's colour).
- **Everything you author is bound:** fills and strokes to Mode Colors (Semantic) variables, gaps and paddings to
  `Spacing/Gap/*`, `Spacing/Padding/*` or the Breakpoint margins, radii to `Corner-Radius/*`, text to a Zen text style,
  shadows to a Zen effect style. No raw hex, px or font settings; no primitive ramps (`Light/Neutral/3`, `dm-16`).
- **Auto layout everywhere** something stacks or sits side by side. Absolute positioning only for overlays that float
  (a popover on a state frame, a floating action).
- **No shadow is ever cut.** Frames made with `createFrame()` / `createAutoLayout()` clip their content by default, so
  set `clipsContent = false` on every frame you add (rows, sections, toolbars, wrappers) unless it must hide something;
  a Shadow card's shadow reaches past the card (about 8px below, 4px aside). Check every screen with the audit's
  `bounds/shadow-clipped`; `absoluteRenderBounds` cannot show it (it is already cut by the clip).
- **Real states, not look-alikes.** A field that shows a value is `State=Inputted` (Default and Focused are the empty
  placeholder look); a menu's open trigger is `State=Pressed` (Chip/Advanced: `Press`), not Focused; a disabled control
  is `State=Disabled` with a reason in its help text. Pick nested states before calling something a library gap.
- **Real content.** Copy in the brief's language, real names, numbers, dates and statuses; no lorem ipsum, no "Title",
  "Label" or default component text left on screen.
- **Keep Zen's layer names** (`Actions`, `Primary`, `Icon-Wrapper`, `Leading`…). Name the frames you add by what they
  are (`Filters`, `Orders table`, `Summary`), never "Frame 12".

## 3. Build a screen

1. **Start from Zen's frame.**
   - Desktop: an instance of `Patterns/Pages/Density-Medium` (1512 × 982; booleans Sidebar, Side-Panel,
     Floating-Actions; your content goes in its `Content` slot). The sidebar is `Patterns/Sidebar/Density-Medium`
     (or `Side-Bar/Master/*`), and every page shows its own row selected.
   - The page header is `Header/Dashboard` with `Primitives/Dashboard/Header` rows in its `Sections` slot:
     `Type=Main` (Heading/1 title + page actions), `Type=Control-Bar` (search, filters, period, view switch),
     `Type=Navigation` (breadcrumbs, notifications, the account).
   - Phone: a 390-wide frame in the Mobile mode of Breakpoint & Grids and the Comfortable mode of Component Size, with
     `Top-Navigation/Mobile` and, for top-level screens, `Bottom-Navigation/Mobile/*`.
   - Before a screen like one of Zen's templates (`◆ HR-Platform`, `◆ Finance`, `◆ Social`, `◆ Logistic`,
     `◆ Ecommerce`), read that template's frame and copy its structure, not only its parts.
2. **Lay out the content** in the Content slot by screen-rules.md: one surface pairing, the spacing ladder, tables on
   the canvas, grouped lists in List-Box, one Primary button per area.
3. **Fill it** with real content and pick every component's variant and state on purpose.
4. **Add the states** the brief needs as separate frames next to the screen (a copy of the page-pattern instance with
   the state applied: open menu, dialog, empty, error, loading with Skeleton).
5. **Audit** (§4) until it reports 0 errors, then take one screenshot and review it against the checklist in
   screen-rules.md. Fix, re-audit, and only then start the next screen. Audit every frame you touched, not only the
   new one (a sidebar or header change reaches the others).

Write in retry-safe batches (a section or a screen per `use_figma` call), return the ids you create, and keep one
screenshot after composition and one after a fix (figma-use rule 5).

## 4. The audit (harness)

`harness/zen-figma-audit.js` is a read-only Plugin API script. Run it with `use_figma`: send the whole file as `code`,
after setting `ROOT_IDS` to the screens to check (or leave it empty to check the current selection). It returns JSON:

```json
{ "checked": ["Orders (12:34)"], "errors": 3, "warnings": 2, "counts": { "spacing/unbound": 2, "…": 1 },
  "findings": [{ "rule": "spacing/unbound", "severity": "error", "id": "12:40", "name": "Filters",
                 "path": "Orders › Content", "detail": "itemSpacing 12" }] }
```

- Fix every `error`. For each `warning`, fix it or tell the user why it stays (a deliberate exception).
- `references/audit-rules.md` says how to fix each rule. Re-run until `errors` is 0; it shows at most 25 findings per
  rule, so a long list shrinks as you fix.
- The audit cannot judge taste. After it passes, check the screenshot for hierarchy, alignment, rhythm and copy.

## 5. Report

Tell the user, per screen: the frame name and id, the audit result (errors 0, warnings left and why), the
components used, anything the library lacked (and what you built locally instead), and open questions for the
designer. Do not call a screen done while the audit reports errors.

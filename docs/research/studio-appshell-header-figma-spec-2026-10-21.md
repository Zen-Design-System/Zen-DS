# Spec card · AppShellHeader to and from Figma as Header/AppShell (theme, density, its three slots)

Session B, 2026-10-21. The user picked "AppShellHeader theme/density sang Figma" (BACKLOG P3 from #184). Since #179 the
header takes `theme` and `density` (Figma Header/AppShell 16783:71068). The push still drew an AppShell's header as
Dashboard header rows in the master layout's Header/Dashboard, so both looks were lost, and a standalone AppShellHeader
dropped its content ("holds layers with no Figma slot"). Tier M: figma-push, figma-pull, plugin unchanged (its nested
swap and slots `within` already do this), live test in the Zen file.

## Figma (read live 2026-10-21)

- Header/AppShell 16783:71068 has these variants: Theme=Default × Density=Medium (16243:290461) and Density=Small
  (16823:76454); Border & Divider × Small (16783:72140); Borderless × Small (16939:78270).
- Its booleans: Collapse Button (the Wrapper with Button/Icon-Flat), Top-Header (the top row), and Main (Main-Element).
- Its slots:
  - Top-Elements holds Leading-Slots (Fill, Spacing/Gap/Medium), Center-Slots (400 fixed, hidden by default) and
    Trailing-Slots (Fill, right-aligned, Spacing/Gap/Small).
  - Main-Element is the PageHeader row.
  - Sections holds the rows under the header.
- The paddings are the variant's own (Main 24·24·12·24 Default/Medium; Border & Divider's top row 12·24 with a bottom
  rule).
- ◇ Patterns/Pages/Density-Medium Level=Master still holds Header/Dashboard (4122:35269). AppShell's session (Figma
  patterns owner) confirmed no master rebuild is planned, so the push swaps it per instance.

## Push

- A standalone `<AppShellHeader>` becomes an INSTANCE of Header/AppShell:
  - Theme and Density come from the map.
  - `main` goes to Main-Element and `sections` to Sections: each row filled, padded Padding/Small ·
    Margin-Comfortable as app-shell.css pads them.
  - leading · center · actions go to Top-Elements as Figma lays them out.
  - Top-Header shows while the top row holds layers. Collapse Button is off, because the AppShell draws its toggle.
- Nearest variant, as sidebarPatternProps does: the theme comes first. A Border & Divider or Borderless header at Density
  Medium is pushed at Density Small, with a note.
- Inside an AppShell:
  - The header is that same instance. On the master, the nested Header/Dashboard is swapped to Header/AppShell
    (`nested: { path: "Header/Dashboard", set: Header/AppShell, name: "Header/AppShell", props }`), and its slots are
    filled `within: ["Header/AppShell"]`.
  - Collapse Button is on when the AppShell draws the toggle (collapse="header", a Sidebar that is not the workspace
    rail, a top row).
  - The frames fallback (an aside that is no Side-Panel) puts the same instance at the column's top.
  - The Dashboard header rows and TOP_BAR_PADDING go, because the variant pads itself.
- A header with no layers keeps hiding the master's Header/Dashboard (unchanged).

## Pull

- A Header/AppShell instance, standalone or the swapped one in the master (the read's composition frame, or the push's
  `nested` + `slots` shape), becomes `<AppShellHeader>`:
  - theme and density come from the map;
  - leading, center and actions come from Top-Elements' three frames. The account is an Avatar named after a person at
    the end of the actions, as before;
  - main comes from Main-Element, and sections from Sections;
  - a Collapse Button that is off gives the AppShell collapse="none".
- Header/Dashboard rows, from frames pushed before this change, still read as before.

## Found in the live test (fixed in this change)

- Sections is a slot with no switch and two sample rows: a header with no sections sends it empty.
- Primitives/Dashboard/Header has no Child-Heading any more; Header-Text is a slot, and neither switch reaches its Child
  or SubHeading. The push shows them with `edits` (visible) and the pull reads the texts that show. The contracts still
  list Child-Heading (BACKLOG P3).
- The master centres its row on the cross axis, so a short page sat mid-height. Figma refuses min-size on a layer inside
  an instance but takes the instance root's alignment: plugin `studio-import` bf300bc adds `edits.counter` (an empty path
  is the instance) and the push sends `{ layer: [], counter: "MIN" }`.
- Side-Bar/Master has its own Collapse Button (on by default), so the toggle showed twice. The push sets it from
  onCollapsedChange or collapse="sidebar", and no longer adds an IconButton to Header-Content. The pull reads
  collapse="sidebar" from it when the header's is off.
- A placed master reads as compositions, Header/AppShell included: the pull takes the composition frame too (its slots
  found in its layers), so a real read comes back as `<AppShell>`. The reader keeps a nested instance set to another
  variant (a crumb's Item at Level Master), which Figma lists no override for.
- The centre's layers fill its 400px, as `.zen-dashboard-header__center > *` does; Figma's Center-Slots ends-aligns them.

## Checks

- Push selftest:
  - a standalone header with its three slots, and the variant fallback;
  - an AppShell master with the swap, its slots and Collapse Button;
  - the frames fallback;
  - a round trip back to the same AppShellHeader.
- Pull selftest: the live read of the pushed AppShell (fixtures/figma-appshell-header.json), and collapse="sidebar".
- Live Zen file:
  - import an AppShell with a Border & Divider / Small header (leading Breadcrumbs, main PageHeader, actions);
  - import a standalone Default / Medium header;
  - read them back, take a screenshot, then remove them.
- Gate scoped to the changed files; the figma E2E group.

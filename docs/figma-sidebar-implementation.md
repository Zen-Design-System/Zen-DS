# Sidebar implementation mapping

Reference: Figma file `9nZv4uW2LT21yuHabMTCh1`, section `6849:33453`.

## Implemented patterns

| Figma node | Pattern | Code API |
| --- | --- | --- |
| `4081:14593` / `4081:15233` | Basic expanded / collapsed | `<Sidebar variant="basic" collapsed={false|true} />` |
| `5974:20591` / `5974:20628` | Small-Density expanded / collapsed (52px rail) | `<Sidebar variant="small-density" collapsed onCollapsedChange search={...} />` |
| `4233:5938` | Workspace rail + child panel | `<Sidebar variant="workspace" workspaceItems={...} />` |
| `1536:27474` + variant matrix | Menu item primitive | `SidebarItem` state/theme/selection props |

## Token and geometry contract

- Basic outer inset: `Spacing/Padding/XSmall` (8px), surface radius `Corner Radius/XLarge` (20px), width `Sidebar/Default-Width` (260px).
- Basic collapsed width: 84px including the outer inset.
- Medium menu item: 44px high, 12px padding, 12px content gap, 20px icon.
- Small-Density menu item: 36px high, 8px padding, 8px inner gap, 20px icon.
- Small-Density search: 32px high; its input shadow stays inset (`Input/Shadow/Base` + `Input/Shadow/Strong`). Figma shows a `⌘K` shortcut in the trailing slot (examples pass it via `Search trailing`).
- Small-Density header (5974:20593): 12px padding, 44px high; the logo instance is the Basic logo scaled 5/6 (Union 65.75×20, Kaiz badge 16.67px, Body/Small 10/13.33). Collapsed: 20px logo, 24px gap to the collapse wrapper, Search as a 32px Button/Icon-Main Tertiary inside 8px padding, items 36px inside 12/8px body padding.
- Side-Bar/Sub flyout: Center-Container 12px padding (Small-Density, Workspace), Density=Medium items (44px, 12px padding) even beside a Small-Density master. `SidebarSubMenu` takes `items` and/or titled `sections`.
- The collapse control only renders when `onCollapsedChange` is provided; Workspace has no Expand axis, so it never shows one.
- Small-Density search is `<Search size="small" shortcut="K" />`: the `⌘K` hint (Leading-Trailing label + command icon, Content/Neutral/Light, 2px gap, 4px right padding) and ⌘/Ctrl+K focus.
- Workspace rail (4233:5945): 40px avatar tiles 12px apart, 1px Border/Inverse, Corner-Radius/Base; the selected workspace shows the Focus-Ring (3px Border/Active/Accent/Solid, −4px, Corner-Radius/Large) instead of a fill. `workspaceAction` renders the trailing Button/Icon-Main (Add workspace).
- Workspace Child-Header (4233:5950): active workspace name (Heading/4, max 148px) + chevron opens a Popover to switch workspace; `headerAction` holds the settings Button/Icon-Flat.
- Focus state: 3px neutral or accent focus token; disabled content uses `Color/Content/Disabled`.
- Selected state: neutral or accent active background token; icon and label inherit the selected content color.
- Footer follows the same menu-item contract after a 1px pale-neutral divider.

The platform navigation is now composed from this same `Sidebar` component. Storybook is intentionally left stopped; the working verification surface is the platform at `http://127.0.0.1:5173/`.

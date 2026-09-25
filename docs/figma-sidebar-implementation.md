# Sidebar implementation mapping

Reference: Figma file `9nZv4uW2LT21yuHabMTCh1`, section `6849:33453`.

## Implemented patterns

| Figma node | Pattern | Code API |
| --- | --- | --- |
| `4081:14593` / `4081:15233` | Basic expanded / collapsed | `<Sidebar variant="basic" collapsed={false|true} />` |
| `5974:20591` | Small-Density expanded | `<Sidebar variant="small-density" search={...} />` |
| `4233:5938` | Workspace rail + child panel | `<Sidebar variant="workspace" workspaceItems={...} />` |
| `1536:27474` + variant matrix | Menu item primitive | `SidebarItem` state/theme/selection props |

## Token and geometry contract

- Basic outer inset: `Spacing/Padding/XSmall` (8px), surface radius `Corner Radius/XLarge` (20px), width `Sidebar/Default-Width` (260px).
- Basic collapsed width: 84px including the outer inset.
- Medium menu item: 44px high, 12px padding, 12px content gap, 20px icon.
- Small-Density menu item: 36px high, 8px padding, 8px inner gap, 20px icon.
- Small-Density search: 32px high; its input shadow stays inset (`Input/Shadow/Base` + `Input/Shadow/Strong`).
- Focus state: 3px neutral or accent focus token; disabled content uses `Color/Content/Disabled`.
- Selected state: neutral or accent active background token; icon and label inherit the selected content color.
- Footer follows the same menu-item contract after a 1px pale-neutral divider.

The platform navigation is now composed from this same `Sidebar` component. Storybook is intentionally left stopped; the working verification surface is the platform at `http://127.0.0.1:5173/`.

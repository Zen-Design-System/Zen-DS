# Codebase Platform template lock

Reference: Figma file `9nZv4uW2LT21yuHabMTCh1`, canvas `14240:26923` and the `Overviews` frame `14243:64878`.

This is the shell contract for every platform page. New pages may change the content inside the main column, but must not replace or reinterpret the shell.

## Locked shell geometry

- The navigation rail is fixed at `260px` wide (`Sidebar/Default-Width`). It is not fluid and must not become `width: 100%` at a breakpoint.
- The reusable Sidebar primitive still supports a collapsed `84px` variant for component documentation, but the Codebase Platform shell is intentionally always expanded; it does not render a collapse control.
- The platform starts in `Compact` component density; this is the default token mode for every page unless a user explicitly changes the density control.
- The rail is `flex: 0 0` its token width and remains visible on narrow viewports; the main column may scroll horizontally instead of forcing the rail to shrink.
- The main platform column keeps a `1000px` minimum working width so the locked topbar/hero geometry remains intact when the viewport is narrower; horizontal overflow belongs to the main shell, not to the sidebar.
- The sidebar surface uses `Color/Background/Surface/Alt` and has no extra platform shadow.
- The sidebar outer inset is `Spacing/Padding/XSmall` (`8px`); its surface radius is `Corner Radius/XLarge` (`20px`).

## Locked header and navigation pattern

- Header content is `20px` from the left, `24px` from the right, `24px` from the top and `8px` from the bottom; the topbar is exactly `72px` high.
- Brand is the `icon-zen` mark at `28px` plus the `Zen DS` label using the `Body/Extra` text metrics (16/24, Semi-Bold, body-extra letter spacing).
- The platform brand contains only the `icon-zen` mark at `28px` plus the `Zen DS` label. `icon-layout-left-line` is not rendered in the platform shell.
- The topbar breadcrumb uses `Body/Base/Regular` (14/20, `-0.14px`), 8px horizontal and 4px vertical padding, 8px radius, and a 2px separator gap.
- On Component frames, the topbar trailing controls are the supplied five `Chip/Advanced` instances followed by the two-item Segmented instance. Each chip is hug-content, 40px high, with 10px horizontal custom padding, 12px vertical padding, 8px icon/text gap, 20px leading/trailing slots and rounded 1000px radius. The labels in the Button frame are `Compact`, `Neutral-S1`, `Dashboard`, `Rounded`, `Medium`; selecting one updates the corresponding root token mode. Foundation/token and Overview frames omit these chips and keep the Segmented instance only. Segmented keeps 4px container padding, no gap between items, 32px item height, 6px horizontal/vertical item padding, 20px icons (`icon-sun-solid` and `icon-moon-01-solid`), carved background and the selected surface item shadow. The shared `Search` component remains the contract for the Search page and input-derived filters; it is not inserted into this Figma topbar.
- Medium navigation items are 44px high with 12px padding, 12px content gap and 20px icons.
- Section groups use an 8px inter-group gap; label-to-item spacing remains 2px.
- Footer uses the same item contract after the 1px neutral-pale divider.
- Component navigation items in the platform rail share the `icon-cube-line` glyph so the component index has one consistent visual language.
- The platform root has no page-level corner radius; only Figma-authored inner surfaces such as the hero and cards retain their own radius tokens.

## Figma frame evidence

The reusable page frame was measured from the current Codebase Platform canvas (`14240:26923`) with Figma MCP metadata and design context:

- `Overviews` (`14243:64878`) keeps the overview cover exception at `492px` high. Its main content is `x=24px`, `width=1204px` inside the `1252px` main column.
- `Global Colors` (`14257:56624`), `Global Dimensions` (`14257:58579`), `Base Colors` (`14257:60681`) and `Component` (`14260:96953`) share the foundation/component frame: `Header/Dashboard` is `496px` high, `Body` starts at `y=496px`, and body content is `x=24px`, `width=1204px`.
- Foundation/component cover instances are `400px` high, `24px` radius, `Color/Background/Neutral/Pale/Default`, with 40px inset logo/metadata, TASA Explorer Black at 120px with `-2.4px` tracking, and a divider from 40px to 100px above the bottom. The Global Colors instance explicitly breaks the hero title as `Global` / `Colors`; the generic Component frame keeps `CoMPONENT NAME` on one line.
- Intro text blocks are `800px` wide and centered. The Dashboard mode render uses Display/3 at `40/48/-1.2px`, Body/Extra/Medium at `16/24/-0.16px`, and a 48px gap before the large Button/Main action where present.
- Component frames use a flat breadcrumb for the top-level component page (`Button` in `14260:96956`); token detail frames use the parent/current pair (`Design Tokens > Global Colors` in `14257:56627`).
- The generated Dashboard token is `--zen-typography-letter-spacing-display-3: -1.2000000476837158px`. A separate `get_variable_defs` response exposed `-1.6px` for Display/3; that is recorded as a mode/composite discrepancy, not used as an override.

## Change control

When adding a platform page, use `PlatformApp` for the shell and `PlatformComponentPage` for page content. Do not add page-specific sidebar markup, alternate brand treatments, responsive width overrides, or ad-hoc spacing values. If the Figma template changes, update this contract and the shell once before adapting individual pages.

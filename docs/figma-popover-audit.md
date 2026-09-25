# Popover audit — Figma → React

Source reviewed: `Popover-Components.zip`, `Popover_Default.json`, `Primitives_Popover_Item_Content.json`, and the Figma Chip/Pill page metadata for file `9nZv4uW2LT21yuHabMTCh1`.

## Figma contract

| Figma layer/property | Contract | React implementation |
| --- | --- | --- |
| `Popover/Default` | 240px fixed width, height hugs content | `.zen-popover` uses a 240px intrinsic surface and content-driven height |
| `Container` | 4px padding, 4px item gap, `Corner-Radius/Large` (16px) | `--zen-spacing-padding-2-xsmall`, `--zen-spacing-gap-2-xsmall`, `--zen-corner-radius-large` |
| Fill/stroke | `Popover/Background`, `Popover/Border` | `--zen-popover-background`, `--zen-popover-border` |
| `Effect/Popover` | shadow light `0 12 32 -16`, shadow base `0 8 24 -12`, background blur 40 | two token-backed shadows plus `backdrop-filter: blur(40px)` |
| `Popover/Default` properties | `Item-List` slot, `Search`, `Label`, `Scroll-Bar` | `items`/`children`, `search`, `label`, `scrollBar` |
| `Popover/Item` container | 8px padding, 8px outer gap, Base (12px) radius | item wrapper uses `Padding/XSmall`, `Gap/XSmall`, `Corner-Radius/Base` |
| `Popover/Item/Content` icon/photo | horizontal gap 12px | leading slot adds the 4px delta on top of the 8px item gap |
| `Popover/Item/Content` text-only | horizontal padding 4px | text-only content adds `Padding/2XSmall` inside the item container |
| `Popover/Item/Content` caption | `Caption/Regular`, label + caption, content gap 2px | caption uses `Caption/Regular` and the content stack remains 2px |
| `.Primitives/Popover/Label` | `Body/Small/Medium`, 8px padding, 10px component gap | label uses the medium small-body style and Figma padding |
| `Popover/Item` single-selected | Active Accent Subtle fill and 12px right padding | `.is-selected` binds `Color/Background/Active/Accent/Subtle` and `Padding/Small` |
| `.Primitives/Popover/Search` | 10px internal gap | search row uses the Figma 10px gap |

## Chip/Pill behavior

Figma Advanced chip instances are content-sized (for example, the metadata widths are 71/87/91px at Small and 85/107/113px at Medium for text, icon and photo themes). The implementation therefore sets the chip and its dropdown wrapper to `width: max-content` and prevents grid/flex parents from stretching it.

When `popoverItems` is supplied, `Chip` composes the shared `Popover` primitive. The trigger supports controlled or uncontrolled open state, `aria-haspopup="listbox"`, `aria-expanded`, Enter/Space toggle, Escape close, item selection close, search and selected/disabled item states. The `DropdownPlayground` story is the regression surface for this contract.

## Remaining integration notes

- Placement is intentionally local (`top: 100% + Gap/2XSmall`, left aligned) so a field or toolbar can own collision/portal behavior later without changing the primitive contract.
- The Popover story exposes default, search and scrollable states. Complex menus should pass Figma-mapped `PopoverItemData` rather than recreating item CSS at call sites.

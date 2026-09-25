# Figma component manifest — 2026-09-23

Nguồn live: `9nZv4uW2LT21yuHabMTCh1`. Nguồn export: các ZIP Button, Chip, Input, Search, Sidebar do người dùng cung cấp. Mode triển khai platform: Zen-Platform/Compact.

## Page manifest và trạng thái owner

| Page | Component set / primitive | Axes chính | Code owner | Trạng thái |
| --- | --- | --- | --- | --- |
| Chip/Pill | `.Chip/Trailing` (4) | Select Type: Multiple/Single; Size: Default/Small | `Chip` + `BadgeCounter` nested | cần sửa size/hover |
| Chip/Pill | Normal (108), Advanced (48), Number-Only (24) | xem JSON export | `Chip` | covered, cần regression |
| Segmented | Item (16), Container (2) | Size M/S; Level P/S; State D/H/F; Select; Icon/Label/Badge | `Segmented`, `SegmentedItem` | đang sửa |
| Toggle | Toggle (24), Toggle-Button (12), Content (4) | Size S/M/L; State D/Disabled; Select; Theme | `Toggle` mới | đang sửa |
| Button | Main 225; Overlay 100; Flat 50; Icon-Main 270; Icon-Overlay 120; Icon-Flat 125 | Size, Level, State, icon slots | `Button`, `IconButton` | đang bổ sung 6 set |
| Input | 19 set/primitive trong ZIP | 4 size; 9 field state; label/help/leading/trailing/clear; textarea/number/heading/autocomplete/richtext | `Input` family | cần bổ sung demo/props |
| Search | Default 60; Popover 30 | Size; Theme; State; Icon-Search | `Search` → `InputField` | đang sửa trailing |
| Sidebar | Menu Item 48; Basic 2; Workspace 3; Small-Density 2; Section Title 4 | density/level/theme/state/select + slots | `Sidebar` | đang dựng template demo |
| Checkbox | Mark 16; Text 16; Content 2 | type/state/select/side/caption/bold | `Checkbox` | đang sửa exact state |
| Radio Button | Mark 8; Radio 16; Content 4 | state/select/side/caption/bold | `RadioButton` | đang sửa exact state |
| Avatar | Single 528; Stack 20; status primitive 16 | size/theme/background/shape/status/focus/more/number | `Avatar`, `AvatarStack` | đang sửa layer/stack |
| Overview | Header/Dashboard `14243:64881`, `_Cover` `14263:98619` | 1204×492, p32, r24, accent, 2 vectors | `PlatformOverview` | đang sửa |

## Nested-owner manifest quan trọng

| Consumer | Nested owner thật | Override Figma | Mapping |
| --- | --- | --- | --- |
| Chip Advanced trailing single | `.Chip/Trailing` | Single/Default = icon 20; Single/Small = icon 16 | icon-x-circle-solid |
| Chip Advanced trailing multiple | `.Chip/Trailing` → `Badge-Counter` | Default → Badge Small 20; Small → Badge XSmall 16 | `BadgeCounter` size small/xsmall |
| Search Filter-Icon | `.Primitives/Input/Leading-Trailing` | Active Yes, Icon Yes; settings icon | `Search` trailing icon |
| Search Filter-Dropdown | `.Primitives/Input/Leading-Trailing` | Label Yes + Dropdown Yes; text `All`; chevron 20 | `Search` trailing label + icon |
| Search Inputted clear | `.Primitives/Input/Field-Only/Clear` | icon-x-circle-solid 20/16 | clear button |
| Segmented badge | Badge primitive | XSmall nested badge | `Badge`/`BadgeCounter` |

## Evidence đã chốt trong lượt này

- Segmented container: padding 4, no item gap, blur 50px; only Small/Medium.
- Toggle: dot S/M/L = 12/16/20; bar = 28×16 / 36×20 / 44×24; padding 2; unselected background has two fills; selected solid; default dot has 0.5px border and Action/Basic shadow.
- Checkbox/Radio mark: 16px; hover halo inset -8; focus ring inset -4 with 2px accent; icon/dot 12px; text/mark gap 8.
- Avatar single: outer surface + 1px inverse border, inner themed layer with 50px backdrop blur; Stack uses first item on top (`z` decreases left-to-right), overlap 8px.
- Overview cover: 1204×492, padding 32, radius 24, accent solid background, TASA Explorer Black 120/120 and -4.8px tracking, metadata 32px from bottom.

# Figma ↔ code differences — open list (2026-10-05)

Collected from `docs/context/BACKLOG.md` (Open items, the Figma-parity and template follow-ups) and the
`figmaExceptions` in `tools/figma-contract/suites/`. Source of truth: the live Figma file `9nZv4uW2LT21yuHabMTCh1`.
"Code" says what the library does today; each row ends with the question to answer. Until answered, code keeps its
current behaviour.

## Needs a decision (affects what people see)

| # | Component | Figma | Code | Question |
|---|---|---|---|---|
| 1 | Checkbox / Radio | Unchecked border `Checkbox/Border/Default` = black 11% (≈1.3:1 on white) | Same token | Raise it to ≈42% (≈3:1, WCAG 1.4.11), or keep the light look? |
| 2 | Table | Selection column 64px with a drag handle on row hover | 48px, no handle, no row reordering | Follow Figma (64px + drag-to-reorder), or keep 48px? |
| 3 | Table (Actions cell) | Button/Icon-Flat **Medium** 40px | Platform example uses Small 32px | Follow Figma (40px)? |
| 4 | Table (Progress cell) | Theme Neutral with its label | Example uses Accent, no label | Follow Figma? |
| 5 | Table cells | Badge/Tag cells do not wrap; two-line and action cells exceed Table/Cell/Size 52 | Cells wrap; rows grow to 63–64px | Fix Figma, or keep code? |
| 6 | Chip S3 | Selected Secondary keeps a Subtle border on a faint tint (≈1.15–1.3:1) | Same | Switch S3 to Color/Border/Active/*? |
| 7 | Typography | Display/4 (32/36/40) is larger than the Heading/1 page title (28/32/36) | Same | Keep, or one hero value per view (Heading/2–3 in grids)? |
| 8 | App Shell rail | HR-Platform rail 80px (72 surface + 8 left inset) | Follows the master: 84px (68 + 8 each side) | Which width is right? |
| 9 | App Shell top bar / drawer | Only drawn on desktop | Narrow: top-bar content on its own row under 744px, drawer gets a Close button | Add a narrow spec? |
| 10 | Action-Item (App Shell) | No open state | Looks the same when its panel is open | Selected/pressed look when `aria-expanded`? |
| 11 | Bottom Navigation | Icon size in Figma differs from code | Code keeps its size | Confirm the size |
| 12 | Slider / Chart / phone frame | Slider thumb shadows, Chart bar corners, the phone home indicator differ | Code keeps its values | Confirm each |

## Figma file fixes (code already follows the intended design)

| # | Where | Issue |
|---|---|---|
| 13 | Text styles | Heading/2, Heading/3, Caption/* cache the old paragraphSpacing (28/24/10) though bound to Font-Size (25/22/11): re-apply the styles |
| 14 | Toggle caption | The set uses Caption/Regular 11/16, the primitive `.Primitives/Toggle/Content` says Body/Small 12/16 (code follows the set) |
| 15 | Toggle | `Seclected` typo in its variables; Toggle-Button binds Segmented tokens; an effect on an empty frame |
| 16 | Segmented | Medium Secondary Selected binds Tag/Background/Default, Small binds the Segmented token (differ in dark); unbound `*/Seclected/Hover` and Secondary Border; description lists props that don't exist; code has a Disabled state Figma lacks |
| 17 | Search / Input Disabled | Search/Default and Search/Popover have no State=Disabled (code derives it from Field-Only); Number steppers stay Default when disabled; Autocomplete and Rich-Text have no Disabled — intended? |
| 18 | Search/Popover | Description lists props that don't exist; Hover stroke weight unbound from Emphasis/Border-Weight |
| 19 | Checkbox/Text | Centres the mark on label + caption (Radio top-aligns; code top-aligns both); a dead Caption prop; Disabled caption colour unspecified |
| 20 | Chat bubbles | Text-You Social blur (40) on an opaque fill does nothing; Mobile variants carry the hover toolbar though mobile uses hold-to-react |
| 21 | Breadcrumbs | Root 3XSmall gap with one child; no current-page state; no collapse (…) item |
| 22 | DatePicker | In-Range-Hover uses Inverse/Solid and leaves `Date-Picker-Item/Background/Seclected-In-Range/Hover` unused; header radius Small at rest vs Base on hover |
| 23 | Button | Surface blur/hover, Overlay rings on Disabled, Icon-Main shadows, IconButton ring radius (`figmaExceptions`) |
| 24 | Input/Heading | H3 at 44px |
| 25 | App Shell | Sidebar pattern Shadow=No (6040:67524) has no code `background`; Floating-Actions uses a local effect, not an Effect style |
| 26 | HR templates (data) | Metric-Trend Medium badge as an override (add a Size?); Remaining Budget "Bar-Quota" built from raw frames (make it a ProgressBar, needs Violet?); Leave Types header "Type" twice; Pending $229.00 vs rows $112.50; "$5.4k" vs "$5.4K"; "Hight" typo; flag names ("Uzbekista N", "andorra", "Marshall Island", "Sao Tome and Prince") |

Closed by the user on 2026-10-05: Avatar solid colours (keep), Sidebar selected child (follow Figma: neutral — done),
Metric Title-Highlight (exists).

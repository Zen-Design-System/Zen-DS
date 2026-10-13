# Audit rules and their fixes

What `harness/zen-figma-audit.js` reports, why it matters, and the fix. Errors block "done"; a warning is fixed or
explained to the user. The audit checks what you authored (frames, text and shapes you made, and what you put in an
instance's slot); a Zen instance's own internals are the library's, so inside an instance it checks only overrides
and text that is crushed or sticks out.

| Rule | Severity | Means | Fix |
| --- | --- | --- | --- |
| `paint/unbound` | error | a solid fill, stroke or text colour with no variable and no style | bind it to a Mode Colors (Semantic) variable by its layer (screen-rules §1): `figma.variables.setBoundVariableForPaint(paint, "color", variable)` and assign the returned paint |
| `paint/gradient-no-style` | warning | a gradient with no style | use a Zen colour style (figma-tokens.md) or a flat token; gradients are rare in Zen |
| `instance/paint-override` | error | a raw colour painted on a layer inside a Zen instance | remove the override: pick the variant that has the colour, or re-create the instance (figma-gotchas.md) |
| `instance/colour-changed` | warning | a layer inside an instance is bound to another variable than the component's own, typically an icon that lost its variant colour after an icon swap | re-create the instance and set the swap from the default (figma-gotchas.md); keep it only if the designer asked for that colour |
| `text/no-style` | error | text with no Zen text style, or a run inside it with none | apply a style from figma-tokens.md (`textStyleId` / `setRangeTextStyleIdAsync`); never set font, size or line height by hand |
| `spacing/unbound` | error | an auto-layout gap or padding with no variable | bind `itemSpacing`, `padding*` and `counterAxisSpacing` with `setBoundVariable` to `Spacing/Gap/*`, `Spacing/Padding/*` or the Breakpoint margins (screen-rules §2) |
| `radius/unbound` | error | a corner radius with no variable | bind all four corners to a `Corner-Radius/*` variable; a box usually takes its component's radius (Card, List-Box) instead |
| `effect/no-style` | error | a shadow or blur with no effect style (also an instance whose effects were overridden) | apply a Zen effect style (`effectStyleId`), or remove the effect (no shadow on Subtle, Pale or Surface-Alt fills) |
| `layout/absolute` | warning | a frame with 2+ children and no auto layout | make it an auto-layout frame; keep absolute only for floating overlays on a state frame |
| `shape/loose` | warning | a rectangle, ellipse, vector or line outside any component | use the Zen component it imitates (Divider, Avatar, Dock-Icon, Progress, Skeleton); a custom visual becomes a local component made from variables |
| `component/detached` | warning | a frame named like a Zen component (`Button/Main`…) that is not an instance | replace it with a real instance of that set |
| `bounds/overflow` | error | a layer sticks out of its parent frame (also when the parent does not clip); a Zen bleed is allowed: one button instance centred in a non-clipping icon-size wrapper, spilling evenly on all sides (Sidebar Collapse, AppShell toggle) | let the parent hug or fill, shorten the content, or wrap it; never hide it behind a clip, and never turn a bleed wrapper into Hug (it moves the icon) |
| `bounds/clipped` | error | a clipping parent cuts a layer off | as above; give the parent room or turn off the clip only if nothing should be hidden |
| `bounds/shadow-clipped` | error | a drop shadow (also one inside an instance, like a Shadow card's) is cut by a clipping frame of the screen: a frame you made (`createFrame` / `createAutoLayout` clip by default) or slot content; measured from the effects, since `absoluteRenderBounds` is already clipped | turn that frame's Clip content off (`clipsContent = false`), or give the shadow room with padding (by token) |
| `bounds/shadow-clipped-in-component` | warning | the same, but the clipping frame belongs to a Zen component | report it to the designer (a library issue); do not paint or resize inside the instance |
| `text/overflow` | error | text taller than its fixed box, or glyphs past their instance's edge | let the text hug its height (`textAutoResize = "HEIGHT"`), widen the instance, or shorten the copy; truncate (`textTruncation = "ENDING"`) only where Zen truncates |
| `text/crushed` | error | text squeezed into a box narrower than a few characters, or wrapping a word per line | give it a fill width or hug; check the parent's sizing first |
| `text/shifted` | error | left-aligned text with a fixed width sits in a vertical auto layout that centres or end-aligns its children, and the column is wider, so the text starts in from the edge and no longer lines up (a slot's default text, like List-Box's Heading, kept after the box was resized) | set the text to Fill (`layoutSizingHorizontal = "FILL"`, which makes it hug its height); never nudge it with padding |
| `copy/placeholder` | warning | lorem ipsum, or a bare default label ("Title", "Label") in your own text | write the real copy |
| `theme/box-on-canvas` | error | a box (Card, List-Box, Metric-Card / Chart-Card through their Card, a standalone chart) draws a fill that does not belong to the page's Canvas, read from the paint actually drawn | screen-rules §1: Canvas/Default → Surface/Default (Flat, Shadow, Border); Canvas/Alt → Pale, Border on Surface/Default, or Surface=Alt; Canvas/Flat → Pale, or Border with Surface=Flat. No gradient box (Semi-Pale, Gradient): one box per row may stand out with Solid or a Support/<Hue>/Subtle fill. Set Theme / Surface / Color on the instance |
| `theme/navigation-surface` | error | a header, Sidebar, top or bottom bar does not match the canvas | no fill, or the Surface of the canvas's colour (Default ↔ Surface/Alt, Alt ↔ Surface/Default, Flat ↔ Surface/Flat); only on Canvas/Default may the Sidebar or bottom bar be a Surface/Default panel |
| `theme/mixed-elevation` | error | a shadow on a Canvas/Alt or Canvas/Flat screen, or on Canvas/Default some surfaces cast one and others do not | remove every shadow (Sidebar `Shadow=No`, the bottom bar's built-in shadow, box Theme without Shadow), or give all of them one (Sidebar `Shadow=Yes`, Theme=Shadow, Shadow/Bottom/Level-1 on standalone charts, Shadow/Top/Level-1 on the bottom bar) |
| `theme/mixed-boxes` | warning | one screen mixes box families (Flat, Border, Pale) | keep one family; vary the Color inside Pale instead |
| `theme/mode-override` | error | a layer inside the screen (a component, a card, a frame) sets its own Light/Dark colour mode | remove the mode (Appearance → back to the inherited one): only the screen frame sets Light or Dark. A dark widget is Card `Theme=Solid, Color=Neutral` with Inverse content; a library component that sets a mode is fixed in the library |

Run it again after every fix batch. It shows at most `MAX_PER_RULE` (25) findings per rule; `counts` has the totals.

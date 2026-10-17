# use_figma gotchas in Zen files

Plugin API behaviours that broke Zen screens built by AI agents, and what works instead. Figma's own `figma-use`
skill covers the general API rules (fonts, pages, auto-layout sizing); these are the Zen-specific ones.

## Clipping

- **New frames clip.** `figma.createFrame()` and `figma.createAutoLayout()` start with `clipsContent = true`. A row of
  Shadow cards inside one loses the shadows' edges. Set `clipsContent = false` right after creating a layout frame.
- **`absoluteRenderBounds` is already clipped.** It returns what is drawn after the parents' clips, so comparing it
  with a clipping parent never finds a cut shadow. Compute the shadow's reach from `effects` (offset, radius, spread),
  as the audit does, and compare it with every clipping frame above the layer, including frames inside instances.
- **The screenshot hides it too.** `node.screenshot()` of a card row crops at the row's edge; look at the whole screen.
- **An inside stroke moves the clip.** A clipping frame with an INSIDE stroke clips its children 1px inside its edge
  but keeps the outer radius, so a child that fills it leaves a hairline gap at each corner (a colour swatch at zoom).
  Put the fill on the stroked layer itself, or draw the border as a top `Border` layer with the same radius.

## Instances

- **INSTANCE_SWAP re-set = lost colour.** Setting an icon swap property (`Leading-Icon-Src`, `Icon-Src`…) to the value
  it already has re-creates the nested icon: the layer is renamed after the icon and its vector falls back to the
  icon's own colour (`Color/Content/Neutral/Strongest`), so a Primary button shows a dark icon. In helper code, skip
  every property whose current value already equals the target. Swapping to a different icon keeps the colour.
- **Repairing a lost colour.** `resetOverrides()` on the icon does not always help. What always works: create a fresh
  instance of the same variant (`main.createInstance()`), `setProperties({ <swap prop>: target })` from the default,
  `insertChild` it at the old index, copy `layoutSizingHorizontal/Vertical` and `componentPropertyReferences`, then
  remove the old instance. The audit's `instance/colour-changed` finds these.
- **Never paint inside an instance.** No fills or strokes on nested layers; change the variant instead. To drop an
  override left on an instance root (a hand stroke), swap in a fresh instance.
- **`resize()` on a layer inside an instance is silently ignored**, and hiding it can drop it from `findOne`. Size the
  instance root (or a page-owned wrapper) instead, and read back the measured width after every write.
- **Hidden children are skipped by default** (`figma.skipInvisibleInstanceChildren` is true). Set it to false before
  checking a hidden row or a hidden button's icon, or they look missing.
- **Read property names first.** `instance.componentProperties` gives the exact keys (with their `#123:45` suffix) and
  the current values; set them with those keys.

## Slots and clones

- **Slots hold your content.** A page pattern's `Content`, a header's `Sections`, a panel's `Header-Contents` are
  SLOT layers: append your frames there. What sits in a slot is authored content and follows every token rule.
- **`frame.clone()` drops slot content** of the instances inside it; `instance.clone()` keeps it. To make a state
  frame, create a new frame holding a clone of the page-pattern instance, then edit the clone.
- **Moving slot children between instances** that sit inside another instance's slot can corrupt nested instances (a
  Badge-Counter became inaccessible and its text was renamed). Rebuild small content (titles, counters) fresh instead
  of moving it, and afterwards scan for layers whose `name` or `visible` throws.
- **Accordion content survives `Expanded` No → Yes**: fill every item's content, even the collapsed ones.

## Reading large frames

- A `use_figma` answer is capped near 20 KB, and one with many non-ASCII characters (Vietnamese, emoji) is cut short
  well below that. Escape the answer to ASCII
  (`JSON.stringify(x).replace(/[\u0080-￿]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0"))`) and
  page it: return `"PART i/n\n" + json.slice(i * 12000, (i + 1) * 12000)`, one call per part.
- Read compactly: names, types, ids and the few properties you need, not every instance's full tree.
- Pages load on demand: switch with `await figma.setCurrentPageAsync(page)`, once per call.

## Library files

- `search_design_system` sees every library the account can use, including forks of Zen with the same component
  names. Scope it with `includeLibraryKeys` (the key `get_libraries` returns for the file's Zen library).
- Import a set by key (`figma.importComponentSetByKeyAsync`) and pick the variant with `setProperties`, not by
  importing the variant's own component.

## Modes (Component Size, Typography)

The domain picks the Component Size and Typography modes, so a screen must hold up in each (user 2026-10-17). After
you pick or change a mode on a screen, recheck it:
- **Dock-Icon `Theme=Emoji`** keeps its emoji's font size while the tile grows (Large: 48 → 56 in Comfortable), so
  the emoji looks small. Set the emoji text to about 82% of the tile (46 in a 56 tile) and keep its Icon frame
  inside the tile.
- Text that grows can overflow fixed boxes. Let it wrap (`textAutoResize = "HEIGHT"`, Fill width) or truncate it
  (`textTruncation = "ENDING"`, `maxLines`). Split a value from its unit ("6.2" + "kWh today"). Stack a name above
  its price instead of beside it.
- A Body that grows past the screen scrolls: set the screen to Overflow Vertical with its bars fixed. A Chip row that
  grows past the width scrolls horizontally. Never trim content to fit one mode.

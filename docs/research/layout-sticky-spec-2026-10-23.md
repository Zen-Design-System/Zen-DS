# `sticky` on Stack / Grid / Box / Shape — spec card (PR 3 of examples className round 2)

Session B, 2026-10-23. Tier M. Decision 2 of `examples-classnames-round2-spec-2026-10-23.md`, approved by the user:
"Thêm prop sticky cho Box (Recommended)". The Figma mapping is the user's too: "Bottom = Fixed, Top = Sticky".

## What Figma has

Figma calls it "Fix position when scrolling" (Prototype → Scroll behavior: Scroll with parent · Fixed · Sticky).

- **Help centre:** a Fixed layer in an auto layout frame must be absolute. Sticky scrolls until its top reaches the
  frame's top, then stays; it fits any layer of a vertically scrolling frame, auto layout included.
- **use_figma in the Zen file, 2026-10-23** (QA page 15872:3, throwaway frames deleted):
  - `numberOfFixedChildren` works on a frame without auto layout.
  - In an auto layout frame it works only when the fixed layers are absolute. An in-flow child is refused silently:
    the value reads back 0.
  - Fixed layers are the frame's last N children (topmost).
  - `scrollBehavior` is not in the Plugin API, so Sticky cannot be set there. A 2024 forum answer reads it through
    `exportAsync({ format: "JSON_REST_V1" })`.
- **Figma's clipboard (kiwi schema v106):**
  - `NodeChange.scrollBehavior` takes SCROLLS · FIXED_WHEN_CHILD_OF_SCROLLING_FRAME · STICKY_SCROLLS;
  - there is also a `fixedChildrenDivider` field.
  - So a native paste can carry both.

## API

`sticky?: "top" | "bottom"` on Stack, Grid, Box and Shape, in `LayoutPositionProps` beside `position`. Unset means it
scrolls with its parent and renders nothing.

- It renders `data-sticky`.
- position.css: `position: sticky; z-index: 3` with `top: 0` or `bottom: 0`. It stays in flow, so the auto layout keeps
  its room.
- With `position="absolute"`, absolute wins. The JSDoc says so; there is no harness rule (a new rule needs approval).
- The JSDoc also says:
  - it sticks to the nearest scrolling ancestor;
  - put `sticky="bottom"` last and `"top"` first;
  - in an AppShell Body it takes the page margin (below).

## AppShell Body

The AppShell session agreed and handed the rule to B.

- **Bottom padding:** every Body bottom padding rule goes through `--zen-app-shell-body-pad-end`, so a dock and the
  floating row cannot drift apart. The three rules are desktop Margin-Comfortable, `:has(floating)` +56 +8, and mobile
  Padding/Large.
- **Bottom dock:** a `[data-sticky="bottom"]` anywhere in the Body takes the Body's bottom margin inside itself
  (−margin and +padding of that variable).
  - This covers a dock nested in its conversation section or TabPanel (the chat page) as well as a direct child.
  - It does not apply inside a `scroll` Stack or Box, nor with `position="absolute"`.
  - Its footprint in the flow is unchanged; its own bottom padding gives way to the page margin.
- **`surface="canvas"`** paints `var(--zen-app-shell-canvas, canvas-default)`, so on a `canvas="alt"` shell a dock
  follows the shell. Outside a shell nothing changes.

## The examples

| Page | Before | After |
| --- | --- | --- |
| chat (3 desktop screens) | `.px-chat-dock` (sticky, −24 margin, canvas background) | `<Box sticky="bottom" surface="canvas">` |
| ai-chat | `.px-ai-chat-dock` (same) | `<Box sticky="bottom" surface="canvas">` |
| ai-ui | `.px-ai-ui-dock` (sticky, −24 margin, no fill: bubbles pass under the glass) | `<Box sticky="bottom">` |

- The code samples (chat, ai-chat) show the same.
- The phone docks sit in AppShell `actionBar` and keep their classes (the AppShell session asked for that).

## Studio

- **Field:** Prototype tab → **Scroll behavior** section, a Position row, where Figma has it. Options:
  - Scroll with parent
  - Stick to top
  - Stick to bottom

  It shows for a selected Stack, Grid, Box or Shape. The Design tab lists no sticky row.
- **Canvas:** the layer is drawn in place (`.studio-world … [data-sticky] { position: relative }`), as the Screen bars
  are. It sticks only in Play, Present and the export.
- **E2E:**
  - FW-210: the field writes `sticky="bottom"`, the Design tab lists no sticky row, the canvas keeps it relative, and
    ⌘Z takes it back.
  - FW-211: in Present it is sticky and sits on the screen's bottom edge at the top of a page taller than the screen.

## Figma

**Push (figma-push):**

- `sticky="bottom"` → `scrollBehavior: "FIXED"` and `absolute`:
  - pinned to the bottom (MAX), stretched across (left-right) unless the layer sets its own width;
  - its insets are the frame's padding, where CSS sticky leaves a last child;
  - it moves to the frame's end (Figma's fixed layers are its topmost).
- `sticky="top"` → `scrollBehavior: "STICKY_SCROLLS"`, in flow.

**Native paste (figma-native):** writes `NodeChange.scrollBehavior` (FIXED_WHEN_CHILD_OF_SCROLLING_FRAME or
STICKY_SCROLLS); the absolute part is already there.

**Plugin (`studio-import.js`, 397fc74 on `studio-import`):**

- The fixed run at the end of a frame goes on top and `numberOfFixedChildren` counts it. It goes back to 0 when every
  fixed layer was the page's own and the page has none any more.
- Sticky cannot be set through the Plugin API. The layer stays in flow and the import notes name it ("set Prototype >
  Scroll behavior > Sticky by hand").

**Pull (figma-pull):**

- The reader marks a frame's last `numberOfFixedChildren` children FIXED.
- Where something scrolls, it reads Sticky from the frame's `JSON_REST_V1` export.
- `pageFromFigma`:
  - a Fixed Zen frame (Stack, Grid, Box, Shape) → `sticky` by its vertical constraint (MAX → bottom, else top), in
    flow, with no `position`;
  - Sticky → `sticky="top"`;
  - other fixed layers (instances) keep their absolute place, as before.

**Measured:**

- Selftests: push (round trip included), pull, native and plugin `npm test`.
- The plugin's API sequence ran live in the Zen file: absolute + STRETCH/MAX + moved on top +
  `numberOfFixedChildren = 1` read back, then 0. The frame was deleted.

**Not run:**

- A live native paste (scripted pastes are unreliable and risk the user's clipboard and front page; memory
  paste-into-figma-myself).
- Whether Figma also needs `fixedChildrenDivider` for a pasted Fixed layer.

Both are in BACKLOG P3 next to the native gradient paste.

## Checks

- static gates, push / pull / native selftests, plugin `npm test`;
- visual diff before / after on chat, ai-chat, ai-ui and app-shell (1512 / 390): at rest the docks sit where they did;
- Studio E2E FW-210/211;
- scoped `npm run qa` with the app-shell page (A1–A4 floating rows: bottom padding unchanged) and
  `tests/interaction/app-shell-grid.test.tsx`.

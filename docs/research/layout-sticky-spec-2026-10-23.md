# `sticky` on Box / Stack / Grid — spec card (PR 3 of examples className round 2)

Session B, 2026-10-23. Tier M. Decision 2 of `examples-classnames-round2-spec-2026-10-23.md`, approved by the user:
"Thêm prop sticky cho Box (Recommended)".

## What Figma has

- Figma calls it "Fix position when scrolling" (Prototype → Scroll behavior: Scroll with parent · Fixed · Sticky).
- Measured with use_figma in the Zen file on 2026-10-23 (QA page 15872:3; the throwaway frames were deleted):
  - `numberOfFixedChildren` works on a frame without auto layout.
  - In an auto layout frame it works only when the fixed child is **absolute** (`layoutPositioning = "ABSOLUTE"`). An
    in-flow child is refused silently (the value reads back 0).
  - Fixed children are the last N children (topmost in the layer list).
  - `scrollBehavior` (`STICKY_SCROLLS`) does not exist in the use_figma runtime. Check it in the real plugin runtime
    (`studio-import.js`) before the plugin uses it.

## API

`sticky?: "top" | "bottom"` on Stack, Grid and Box (the layout primitives, beside `position`). Unset means it scrolls
with its parent, and renders nothing.

- `data-sticky="top|bottom"`.
- layout.css: `position: sticky; inset-block-start: 0` (or `-end`), and `z-index: 3`, the docks' current value. It
  stays in flow, so it keeps its place in the auto layout: CSS sticky is Figma's Sticky, and at the end of the content
  it is also Figma's Fixed.
- `sticky` together with `position="absolute"`: absolute wins. The harness warns (`layout/sticky-absolute`, approval
  needed: see Open).
- JSDoc and props docs say:
  - it sticks to the nearest scrolling ancestor (an AppShell Body, a pane, a scroll box);
  - put `sticky="bottom"` last and `sticky="top"` first.

## AppShell Body (owner: the AppShell session; one CSS rule, coordinate first)

The page margin below a bottom dock belongs to the shell, not to each example:

```css
/* A last child that sticks to the bottom takes the Body's bottom margin inside itself, so the content scrolls under it
   and the field keeps the page margin below it. */
.zen-app-shell__body > [data-sticky="bottom"]:last-child { margin-block-end: calc(-1 * <body padding-end>); padding-block-end: <body padding-end>; }
```

- `<body padding-end>` is the Body's own token for each layout: desktop Margin-Comfortable, mobile Padding/Large.
- A `--zen-app-shell-body-pad-end` custom property set next to the existing padding rules keeps the two in step.

`surface="canvas"` inside an AppShell paints the shell's canvas: `var(--zen-app-shell-canvas, canvas-default)`. Today it
is always Canvas/Default, so on a `canvas="alt"` shell a dock painted with it would show the wrong colour.

## The examples

| Page | Now | After |
| --- | --- | --- |
| chat | `.px-chat-dock` (sticky, -24 margin, canvas background) | `<Box sticky="bottom" surface="canvas">` |
| ai-chat | `.px-ai-chat-dock` (same) | `<Box sticky="bottom" surface="canvas">` |
| ai-ui | `.px-ai-ui-dock` (sticky, -24 margin, no fill: the bubbles pass under the glass) | `<Box sticky="bottom">` |

- The phone docks (`px-ai-chat-phone-dock`, `px-ai-ui-phone-dock`) already sit in AppShell `actionBar`. Their padding
  (Padding/Small, the page margin at the sides, the safe area) is the Bottom Actions strip's own padding, so it moves
  into AppShell's `actionBar` wrapper only if the AppShell session agrees. Otherwise they stay (see Open).
- `table.css` / `platform.css` sticky headers are a table head and the docs chrome, not this prop. They stay.

## Studio

- **Field:** "Scroll behavior" in Figma's place:
  - the Prototype panel when the layer is selected there;
  - otherwise a Position row (Design panel, under Position).
  - Options: Scroll with parent · Sticky top · Sticky bottom (Figma words: "Scroll with parent"; "Sticky"/"Fixed"
    become top/bottom because CSS needs an edge).
- **Canvas:** relative, as all sticky in builder CSS (memory: frames clip, `.studio-viewport` is the scroller). It
  sticks only in Play, Present and the HTML export. Test with a short viewport (DV-03 sets 560 px).
- **E2E:** FW-210…: set it in the panel, the code gets `sticky="bottom"`, and in Play it stays at the frame's foot
  while the content scrolls. Undo works too.

## Figma push / pull / native / plugin

- **Push:**
  - `sticky="bottom"`: the layer goes absolute, constraint bottom and left-right, with the parent's padding as insets.
    It moves to the end of the children and counts in the parent's `numberOfFixedChildren`.
  - `sticky="top"`: the same at the top. Use `scrollBehavior = "STICKY_SCROLLS"` instead if the plugin runtime has it,
    since that keeps the layer in flow.
- **Pull:**
  - a fixed child (or `STICKY_SCROLLS`) → `sticky`, by its vertical constraint (MAX → bottom, else top);
  - absolute + fixed → `sticky` only (no `position`);
  - a fixed child of a frame without auto layout keeps its free X/Y and gets `sticky`.
- **Native (kiwi):** find the field that matches `numberOfFixedChildren` / `scrollBehavior` from a paste of a real fixed
  layer. If there is none, the native path leaves sticky out and says so.
- **Plugin:**
  - same mapping in `studio-import.js` (async APIs only);
  - selftests in push / pull / native / plugin;
  - one live import into the Zen file (QA page, removed after).

## Checks

- static gates, `npm run usage:selftest` (if a rule is approved), push / pull / native selftests, plugin `npm test`;
- visual diff before / after on chat, ai-chat, ai-ui (1512 / 390): 0 changed panels expected at rest, and a scrolled
  shot by hand (the dock covers the bubbles, the margin under the field is unchanged);
- Studio E2E FW-210…; scoped `npm run qa`.

## Open (not blocking; default in brackets)

1. The harness rule `layout/sticky-absolute` is a new harness rule, so it needs the user's approval [JSDoc only, no
   rule].
2. The phone dock padding moving into AppShell `actionBar` is the AppShell session's area [leave the two phone classes].

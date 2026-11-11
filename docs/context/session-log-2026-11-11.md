# Session log — 2026-11-11

## Frames take any background colour (tier L; session Bug; branch zen/feat/frame-any-background-20261111)

User: "Frame trong studio bị giới hạn màu nền. Lẽ ra các màu background đều được phép đổ", then "nếu nó là Screen thì
mới giới hạn". Asked which frames: "Cả hai" — frames drawn on the board and the Box / Stack / Grid frames inside a page.

**Library (`src/components/Layout/appearance.ts`, `layout.css`):**
- `surface?: FrameFill` = `BoxSurface | ShapeFill`.
- The background layers draw by `data-surface` as before; the effect rules read them.
- Any other Color/Background token (Shape's path names, `shapeFills`) draws as `data-surface="fill"` with
  `--zen-layout-fill` (`frameFillPaint`). `neutral-subtle` and `neutral-pale` are the layers `subtle` and `pale`.
- JSDoc and the Layout and background-layers guidelines say when to use it: a deliberate band, tile or hero, with its
  text in the content colour that reads on it.
- No harness rule added or changed. The effect rules keep "shadow only on surface", and blur only on subtle or pale.

**Studio:**
- `palettes.ts surfacePalette` lists None, Background layers, then Neutral … Support (`frameFillOptions`). The aliases
  resolve, so nothing is listed twice.
- `propSchema.editorFor` expands `BoxSurface | ShapeFill`.
- `FramePanel`: a drawn frame (`<Screen frame>`) shows Fill (SwatchControl, writes `surface`) instead of Canvas. A
  device Screen keeps Canvas.
- `runtime.tsx Screen` paints `surface` over the Canvas.
- `dialect.mjs`: `surface` is a token path, only on `<Screen frame>`.
- `compile.mjs` notes the fill in the Screen's comment.

**Figma:**
- `figma-steps FRAME_FILL` / `FRAME_FILL_OF` come from Shape's `shapeFillTokens`. A background layer's own name wins on
  the way back (`subtle`, not `neutral-subtle`), so existing round trips stay the same.
- Push writes any frame fill, and a drawn frame's own fill on its page frame. Pull reads any Color/Background variable
  as `surface`; an unbound fill is still noted.
- Known limit: a drawn frame comes back a Screen, because `frame` doesn't travel to Figma (#387). Its fill comes back on
  its content, so the page looks the same.

**QA:**
- Self-tests: figma-push 528 (new: fills, round trip), figma-pull 173 (new: any Background variable; the "Odd" frame
  now uses an unbound fill to keep the note check), figma-diff 40, compile 99, dialect 71, builder 83. tsc ✓;
  guidelines in sync.
- E2E FW-265 (Box: + Surface, the list has Pale, Support/Blue/Pale and Inverse/Solid, Accent/Solid painted) and FW-266
  (drawn frame: Fill not Canvas, Support/Teal/Pale painted; a device Screen keeps Canvas): both work.
- Pick color into a frame used its own list of five layers (`pickColor.ts SURFACE_OPTIONS`); it now uses
  `frameFillOptions`. FW-184 now expects an Info/Solid Shape to give `surface="info-solid"` exactly (it used to give the
  nearest layer).
- `--only=figma` found 4 rows broken on main too (FW-80, 101, 181, 183). They also break rows run after them
  (FW-130, 182, 184, 186 pass alone, on main and on this branch). Logged P1 in BACKLOG.md: they are outside this change
  (Shape image and gradient painting, the pick tag), and the group isn't in the gate.

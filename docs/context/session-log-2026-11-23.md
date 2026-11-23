# Session log 2026-11-23

## Drag a main component out of its frame (tier S, Bug session)

User: "vẫn chưa kéo component gốc ra khỏi frame được". Branch `zen/fix/studio-move-main-component-20261123`.
Three causes:

- **Engine (`tools/studio/arrange.mjs`).**
  - `moveTo` moved the main's root alone, which left `<Component>` empty: "holds exactly one layer" refused the write.
  - Now `mainOfRoot` moves the `<Component>` instead (not a variant in its set, not a ⌥ copy). The focus stays on the
    root (`focusOn`), since the canvas draws the main as its root.
  - `placedOf`: `looseLayers` and `floatAt` read and write the place on the main's root, so position and insets go,
    or move, with it.
- **Click (`select/clickTarget.ts`).**
  - The "body column" rule (a Screen's one layout child stands for the frame) took a floating main's root Stack for the
    frame's content, so a click selected a layer inside the main, and a drag moved only that.
  - `ownLayer` (a main, an instance, or a floating layer) stops that rule and the content-root rule.
  - `folded` keeps a main or instance root with one child.
- **Layers (`select/LayersPanel.tsx`).**
  - `simplify` folded a main whose root held one child into that child's row.
  - A main or instance keeps its row now.
- **Tests.**
  - builder selftest: 100, including 5 new main-component cases (to the canvas, into a free frame, ⌥ copy, a variant
    stays).
  - Studio E2E: FW-292 (new: drag a main out onto the canvas, root selected, ⌘Z); FW-270…279 work.
- **Gate (`qa --isolated`): PASS.** Studio E2E: 462 works, 0 broken.
- **Opt-in figma group** (the gate skips it), three shards: 224 works, 1 broken.
  - FW-185 timed out twice; run alone, it works.
  - The other retries were timeouts on a loaded machine.
- `npm run build` ✓.

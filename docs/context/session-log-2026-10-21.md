# Session log · 2026-10-21

## Session B · Instance menu, instance Appearance, Frame / Group heading (user, 2026-10-21: three of A's re-measure gaps)

A's re-measure on main e99c5408: §2 keys 65 ✅ · 7 🟡 · 4 ❌ (2026-10-18: 36 · 14 · 26); §6.3 14/14 in 44 steps against
Figma's 39. The user picked three of the four gaps in B's area: "Menu chuột phải instance", "Appearance cho Button" and
"Tên Group/Frame ở header" (not "Bỏ mục Content"). Branch `zen/feat/studio-instance-menu-appearance-20261021`. Tier M.
Spec card `docs/research/studio-instance-panel-parity-spec-2026-10-21.md`. Plugin `studio-import` 8248c59.

- Layer menu (K-70), in `inspector/instanceActions.ts` and `shell/CanvasMenu.tsx`:
  - A Zen instance gets Go to main component: its Studio page opens on the Main component frame, selected and zoomed.
    It skips the old page's frame while the board changes.
  - It also gets Reset all changes. The Design panel publishes its header reset for the layer it shows; the menu
    subscribes, since the same click selects the layer, and runs it: one request, one ⌘Z. It is disabled with "No
    changes" when nothing is written.
  - A page's own `<Use>` gains Go to main component (`goToMain`).
- Instance Appearance (K-74):
  - A page has no `style` (dialect), so the look is written as on a frame: `opacity={40}` and `blendMode="multiply"`.
  - `tools/studio/instance-look.mjs` takes them off the component's props: renderPage and compile.mjs put them on its
    `style`, figma-push on the INSTANCE (0–1, the enum), and figma-pull reads them back.
  - The plugin sets the instance's opacity and blend, else 1 and Pass through.
  - Only the components whose `style` reaches their root take it. A probe over every public component found 69 (59
    instances plus primitives); about 100 drop `style`. The conformance test now pins that list.
  - Studio: DesignPanel shows the frames' AppearanceSection on such an instance, on pages made in the Studio.
- Heading: `panelTitle` (select/layerNames.ts) reads Frame for Box / Stack / Grid and Group for a group. Only the
  Design panel heading changes; its title attribute keeps the code name. Eight E2E heading checks follow (builder,
  library, build-check, dnd, draw, figma).
- Live Zen file: the real importer placed a Button at 0.4 MULTIPLY, a plain Button (1, PASS_THROUGH) and a Badge at
  0.6, with no notes. The screenshot matched, and the QA frame was removed.
- Checks:
  - Selftests: push 345, compile 77, the new layerNames selftest 7; studio:selftest passes and tsc is clean.
  - Conformance 180/180; the plugin's full `npm test` passes.
  - New E2E rows FW-99, FW-100 and FW-101 (figma group).

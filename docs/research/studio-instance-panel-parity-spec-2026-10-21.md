# Spec card · Instance menu, instance Appearance, Frame / Group heading (re-measure gaps in B's area)

Session B, 2026-10-21. A's re-measure of the parity plan's Figma walks (main e99c5408: §2 65 ✅ · 7 🟡 · 4 ❌; §6.3 14/14 in
44 steps against Figma's 39) found these gaps in B's area. The user picked three of the four (AskUserQuestion: "Menu
chuột phải instance", "Appearance cho Button", "Tên Group/Frame ở header"; not "Bỏ mục Content"). Tier M (Studio panel and
menu, Figma push / pull, the Zen plugin; no library API change).

## 1. The instance's layer menu (K-70)

Figma's right-click on an instance lists Go to main component, Push changes to main component (a local one) and Reset
all changes.

| Instance | Go to main component | Reset all changes |
| --- | --- | --- |
| A page's own `<Use of>` | `goToMain` (localComponents.ts): selects the main's root layer and shows it. New in the menu; the panel's Component section already had it | Already in the menu (resetInstance) |
| A Zen component (Button, Card…) whose docs page is in the Studio | Opens that component's page and selects its Main component frame (`main-component`), zoomed to it. Figma opens the main in the library file | The Design panel's header reset (resetAll.ts: design props written as fixed values back to their defaults, nested instances too; the content stays): one request, one ⌘Z. The panel publishes it for its selection (inspector/instanceActions.ts), and the menu runs the same function. When nothing is changed, the item is disabled and its caption says "No changes" |

## 2. Appearance on a Zen instance (K-74)

Figma shows an instance's layer opacity, blend and visibility in Appearance. Button has no Appearance in the Studio;
Card and text show Fill only.

- Scope: opacity, layer blend and Show / Hide. No Fill, Stroke or Effects: a Zen component's colours come from its
  variants and tokens (user's choice, 2026-10-21).
- Code: a page has no `style` (dialect.mjs: "style is not part of a page"), so it writes the look as a frame does,
  `opacity={40}` (percent) and `blendMode="multiply"`, on the instance (tools/studio/instance-look.mjs).
  - The canvas (renderPage) and the exported code (compile.mjs) put the look on the component's own `style`:
    `style={{ opacity: 0.4, mixBlendMode: "multiply" }}`. Opacity 100 % and Pass through write nothing.
  - No library API change. It applies to the Zen components whose `style` reaches their root: STYLE_ON_ROOT, 59
    instances, kept exact by tests/smoke/conformance.test.tsx. About 100 others drop `style` and get no Appearance.
  - Only on pages made in the Studio, as the eye: example code keeps its own TSX.
- Studio: the frames' AppearanceSection on such an instance, in Figma's order after Layout: opacity %, the ◐ blend
  (a frame's list: an instance is frame-like, its default Pass through), the eye.
- Figma:
  - Push: an INSTANCE spec carries `opacity` (0–1) and `blendMode` (the enum) from those props, defaults left out.
  - Plugin: a placed instance sets them, else 1 and PASS_THROUGH.
  - Pull: the reader reads an INSTANCE's opacity and blendMode; the converter writes the props back.
  - Native ⌘C→⌘V is Session C's (figma-native.mjs).

## 3. The Design panel's heading names the layer as Figma does (K-74/75 heading)

Figma UI3's panel heads a frame "Frame" and a group "Group". The Studio's reads the code name (Box / Stack / Grid).

- `panelTitle(name, props)` (select/layerNames.ts): Box `group` → "Group"; Box, Stack, Grid → "Frame"; every other
  layer as `layerName`.
- Only the Design panel's heading changes. The Layers rows, the canvas labels and the export file names keep
  `layerName` (the Zen layer naming principle: code names stay unless the user asks).
- The E2E checks that read the heading follow.

## 4. Checks

- `panelTitle` and the instance look helpers: select/layerNames.selftest.mjs; export: compile.selftest; the style
  list: tests/smoke/conformance.test.tsx.
- Push / pull selftests: an instance with opacity 40 % and Multiply round-trips; the defaults are left out.
- Plugin mock test: instance opacity / blend set, defaults restored.
- E2E (figma group):
  - FW-99: a Button's menu has Go to main component, which opens the Button page's Main component, and Reset all
    changes, one ⌘Z.
  - FW-100: a Button's Appearance opacity 40 % + Multiply writes `opacity={40} blendMode="multiply"`; its root draws
    them; the eye is there; 100 % and Pass through remove them.
  - FW-101: a frame's panel heading reads Frame, and a group's reads Group.
- Live Zen file: import a Button at 40 % Multiply, read it back, remove the QA frame.
- Gate scoped to the changed files.

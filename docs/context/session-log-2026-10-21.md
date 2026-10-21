# Session log 2026-10-21

## Session "Bug" · PageHeader description tone (tier XS; user: "trong Figma dòng subtext dưới header là tone Light chứ không phải base")

- Read live (use_figma): Primitives/Dashboard/Header Type=Main 4122:33399 SubHeading = Body/Base/Regular,
  Color/Content/Neutral/Light; Type=Control-Bar Subheading (the result count) = Strongest (code already matches).
- PageHeader `description` Text tone base → light (DashboardHeader type="main" renders PageHeader, so its subheading
  follows). JSDoc cites the node; guidelines + api docs rebuilt.

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
  - New E2E rows FW-99, FW-141 and FW-142 (figma group).

## Figma walks re-measured (Session A, worktree `../Zen-DS-f9b`, branch `zen/docs/figma-walk-remeasure-20261020`)

User (2026-10-20, relayed by the progress session): "Giao Blend mode (Appearance) cho phiên B, rồi đo lại 14 tác vụ Figma."
The run was on `main` e99c5408 (after B's Blend mode #171), in A's slot after C (02:00–02:16), on a private Studio E2E
server with Chromium. The scripts are in A's scratchpad (`walk/`), built on the E2E helpers. They write tables to
`docs/research/studio-figma-design-parity-2026-10-18.md`: §2a, the §5 status line and §6.3.
- **§2, 76 Figma actions:** 65 ✅ · 7 🟡 · 4 ❌. On 2026-10-18 it was 36 · 14 · 26.
  - ❌: K, S, C, ⌥⌘A. The status line says these are not built yet.
  - 🟡: Detach on a Button (the user's rule), three menus (no Flip, no Go to main / Reset, no Paste on the canvas), and
    a Content section on instance and text panels.
  - Six first grades were the script's fault, re-run after fixing it: ⌘A counted the wrong element, Home does not move
    a macOS caret, a right-click landed on the panel, two expected values were wrong (tidy up rows, distribute 140), and
    the Line had to be reached by keys.
- **§6.3, 14 tasks:** 14 / 14 done in 44 steps, against Figma's 39, with 0 refusals.
  - +3: ⇧-click did not add a layer in a frame (it took ⇧⌘-click).
  - +1: a click on a grouped layer selected the layer, not its group.
  - +1: the left panel stays on Pages after a new page.
  - The ⇧-click and group cases need a probe: the ⌘D copy overlapped the original, and `keepSelected` prefers the
    selected layer under the pointer.
- **Bug fixed at its owner:** a Line or an Arrow (0 px high) could not be clicked on the canvas; a ⌘-click selected its
  frame. Now `select/select.css` gives it a band 4 screen px either side (an `::after`, divided by `--studio-zoom`).
  E2E FW-132 covers it (to run in A's next slot).
- **To the user, not built (scope lock):**
  - The group / frame panel heading reads "Box" / "Stack". It comes from `layerName`, which also feeds export file
    names and 7 E2E heading checks.
  - The menus' missing items.
  - The Content section.
  - Instance panels without Appearance / Fill / Stroke / Effects.
- **The user's three fixes** (relayed 2026-10-21: "⇧-click thêm layer trong frame, click vào layer trong group thì chọn
  group, và mở Layers sau khi tạo trang"):
  - Layers after a new page was real. `openLocalPage(id, { made: true })` from New page, a template or frame page and
    MCP create_page; E2E FW-133.
  - The other two were the script's. It passed `modifiers` to `page.mouse.click`, which Playwright ignores, and it
    pressed Esc after each task. The probe on layers that do not overlap showed that Studio already does both as Figma.
  - Re-run on `main` 1bd55975 with the script fixed (keys held, the ⌘D copy moved aside, the page made with New page):
    14 / 14 in 40 steps, the same as Figma's 40, with 0 refusals.
  - FW-132 / FW-133: 2 / 2.

## AppShell session · Token Color/Background/Carved (tier XS; user: "Update token background-carved")

- Read live (use_figma, Mode Colors (Semantic), VariableID:12082:86877): Light {Light/Neutral-Alpha/2} (the repo had
  /3); Dark {Dark/Carved} #0505058C in the Zen, Chat, VT and Ecom-Demo modes, unchanged.
- tokens/source/figma/mode-colors-semantic.json, then `tokens:build`: web, Swift and Flutter. tokens:check,
  tokens:native:check and high contrast (0 failures) all pass.
- No component CSS and no Figma contract binds Carved: it reaches apps, the Design Tokens page and Studio's Variables.

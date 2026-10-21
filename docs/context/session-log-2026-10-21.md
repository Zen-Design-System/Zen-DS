# Session log 2026-10-21

## Simulator Android (tier S; user: "Ừ, thêm máy Android vào simulator đi"), worktree `../Zen-DS-android`, branch `zen/feat/studio-android-devices-20261021`
- `tools/studio/screen-devices.mjs`: Android phone 412 × 917 (Figma Android Compact), Android tablet 1280 × 800 / 800 × 1280
  (Figma Android Expanded, turned), `os: "android"`, `deviceOs()`. Radii 39 / 20 are estimates (Google publishes none;
  the phone's from the Pixel 8's reported 102 px at 2.625), noted in the file.
- `deviceOfScreen(…, os)`: the device of a Screen's size among the page OS's (the Duo whatever the OS), else the OS's own.
  So a 390 × 844 Screen on an Android page plays on the Android phone, and a 412 × 917 one on an iOS page on the iPhone.
- Bars: the page's OS on the canvas, the simulated device's in Present and Play (runtime Screen, Play's overlay safe areas).
- Bug fixed at its owner: Present renders a frame outside BuilderBoard's PageOsContext, so an Android page's Screen showed
  iOS bars in Present. BuilderBoard now wraps each frame's render in the page's OS.
- New page on an Android device writes header `os: "android"`; Screen › Device switch resizes to the page OS's device.
- E2E PT-16 (Android page: Auto on the Android phone, tablet landscape → Rotate, iPhone draws iOS bars). tsc ✓,
  studio:selftest ✓.

## Open on phone (tier M; user: "có thể làm trong Studio được không?" → A, "Tương tác (Play)"), branch `zen/feat/studio-phone-preview-20261021` (stacked on the Android branch)
- Correction given to the user first: Export HTML is static markup, so the phone runs Play's own runtime instead.
- Server: `tools/studio/device-share.mjs` (POST /device/share with the token, any role; GET /device/page by share token;
  a proxy on a free port of every address, only for a browser holding a live share's cookie, GET/HEAD of device.html,
  /src, tools/studio/*.mjs, /node_modules, /@vite, /@id, /@fs and the share route, loopback Host; closes with no share).
  The dev server stays on localhost. Selftest `device-share.selftest.mjs` (38) in studio:selftest.
- Client: `builder/proto/playFlow.tsx` (the flow taken out of Player: history, overlay, actions, After delay, drawing),
  `device/OpenOnPhone.tsx` (Play bar QR button, dialog, uqr loaded on demand), `device/DevicePlay.tsx` + `device.html`
  (no AuthGate: the share token is the key), `RealDeviceContext` (no simulated bars, env() safe areas, 100dvh),
  `rememberUploads` (photos travel as base64, 6 MB).
- Escape in Play closes the dialog first (it sits in the chrome portal, outside the layer).
- New dev dependency `uqr@0.1.3` (MIT, no dependencies). Shared checkouts need `npm install` after the merge; until then
  the dialog shows the link without a QR code.
- Probe (private Vite on :5297, own cache and pages dir): LAN link → phone 390 × 844 plays screen-1, no bars, Next →
  screen-2, 0 errors; Studio dialog QR + link; Escape keeps Play. First run found tools/studio modules refused by the
  proxy (fixed, test added). E2E PT-17.

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
- Gate (15:16–15:52, main 51dffc2b): static checks, TypeScript and browser tests (76/76) pass. Studio E2E is
  332 / 336: MC-02…05 fail as on main. The cause is LayersPanel watching a stale canvas world, and A fixes it
  (53e87642). FW-99/141/142 pass alone, and every changed heading check passes. FW-100/101 were renumbered to
  FW-141/142 because they collided with F10's rows.
- BACKLOG P3 (waits for the user): AppShellHeader `theme` / `density` (#179) are not pushed to Figma yet.

## AppShell session · Figma sync: Grid, Header Theme/Density, Sidebar Theme, Sub-Header (tier M, branch `zen/feat/appshell-figma-sync-20261021`)

The user updated Pattern Sidebar, AppShell and Header/AppShell in Figma, pointed to the Rule section 16823:85229, and
added Primitives/Sub-Header-Sidebar 16823:88101 with its example 16823:89311.

Approved:
- the Header theme: "Duyệt, làm PR riêng sau";
- the Grid API: `pattern="grid"`;
- the rule: guideline + skill, not the harness.

Evidence (use_figma, read live):

| Figma | Value | Code |
| --- | --- | --- |
| Header/AppShell set 16783:71068 | Theme Default · Border & Divider (Border dropped); Density Medium · Small | `theme` default · border-divider, `density` medium · small |
| Default/Medium (16243:290461) Main | 24·24·12·24, gap **Gap/Large 24** | gap 16 → 24 |
| Default/Small (16823:76454) Main | top Margin-Compact 20 | `[data-density=small]` padding-top |
| Border & Divider/Small (16783:72140) | Main 0/0; Top-Header 12·24·12·24 + 1px Border/Neutral/Pale bottom (65); Main-Element 16·24 (72) | `[data-theme=border-divider]` rows |
| Patterns/Sidebar 6040:67524 Theme=Border | root padding 0; Placeholder no fill, radius 0, no shadow; 1px Pale right stroke inside; expanded body 4·8; rail 64 | `theme="border"` |
| Patterns/Sidebar Density=Small (Basic) | header Padding/Medium 16 (64 high); rows 36 (pad 8); footer rows 44; rail 72 (8 + 64) | `[data-variant=basic][data-sidebar-density=small]` |
| Pattern/AppShell/Desktop Layout=Grid, Collapse=Header | Sidebar Border/Small/No shadow + Header Border & Divider/Small; Body 24 / gap 8 | `pattern="grid"`: context defaults, explicit props win |
| Primitives/Sub-Header-Sidebar | Button/Icon-Main Small Tertiary (chevron-left) over Heading/4 (truncate); Medium 4·12·8·12 gap 16, Small 4·8·8·8 gap 12 | `SidebarSubHeader` via `subHeader` |

Other changes:
- Examples: G1 · Grid (16817:58511, Team performance) and G2 · Grid, a level inside the app (16823:89311, Time off). Every box is Flat, as Figma draws it.
- Test: `tests/interaction/app-shell-grid.test.tsx`.
- Docs: guideline rows, the Grid do line, and the skill texts (screen-rules, design-principles).
- Regenerated: compile-api, library keywords, part props.

The Medium rail: code had 84 / 88 (an 8px right inset, header gap 16), while the Pattern draws 80 (no right inset, gap
24). The user said "Sửa rail Medium theo Figma luôn", so now:
- sidebar.css: min-width 80, no right inset, Gap/Large;
- app-shell.css: the shell's -8px rail offset is gone;
- figma-push SIDEBAR_RAIL_WIDTH.basic is 80, with its selftest (B's file; B to be told);
- test: `Sidebar rail, Density=Medium`.
Studio's Theme/Density mapping waits for this merge (Bug session).

## Session "Bug" · Header/AppShell to Studio (tier M; user: "Update Header/AppShell component từ Figma lên studio")

- Live read: Header/AppShell became a set 16783:71068 (Theme Default 16243:290461 · Border 16783:71137 · Border &
  Divider 16783:72140) while the work ran; props Collapse Button, Top-Elements, Main-Element, Top-Header, Main,
  Sections. Contract (◇ Master-Layout) and library-keys (set key 1081dfd3…) hold the set.
- Map AppShellHeader: Main / Sections switches (slot), leading · center · actions as the Slots rows (propSchema
  names), Collapse Button / Top-Header / Top-Elements / Main-Element skipped with reasons, Theme skipped until
  AppShell ships `theme` (approved by the user, its own PR). Main component: MAIN_SAMPLES.AppShellHeader (Figma's
  default content), FIXED_WIDTHS 1272, an AppShellChromeContext preview (toggle "collapse") so the Collapse button draws.
- Native pack: C added `--merge` / `probe-code --ids` (#176). First capture copied the user's selection (C now checks
  the copied node); second capture of the set merged 1 set + 3 symbols, clipboard put back 4/4, probe frame removed.
  Drift found and handed over: header bottom padding 12 (Figma) vs 8 (code) → AppShell; the push's top bar → B.
- Next (agreed with AppShell, user: "Studio vẽ đủ các variant" of Patterns/Sidebar): after #179 and AppShell's
  patterns-sidebar branch, map Header Theme/Density; Sidebar.sets gains "Patterns/Sidebar": "basic" (6040:67524,
  16 variants, wraps Side-Bar/Master/Basic) with Theme/Density/Shadow rows and Expand as `main` collapsed (inverted);
  one desktop capture refreshes Header/AppShell + Patterns/Sidebar + 19 chart sets (drop then `--merge`).
- Built (worktree `../Zen-DS-header-sidebar`, branch `zen/feat/studio-header-sidebar-20261021` on AppShell's
  426a569a): Header Theme {Default, Border & Divider → border-divider} / Density; Sidebar Theme · Density · Shadow
  rows, Expand `main` (Yes → false, No → true). Found by figma-push.selftest (crash at the AppShell master): the push's
  entryFor() picks a set by `setValue`, and a second "basic" set took Side-Bar/Master/Basic's place (the first set is
  re-registered without its setProp). Fix at the owner of the SET row, figma-props-build.mjs: a set that repeats a
  value adds its props and Main component variants, not a choice (first wins), and a boolean's `when` counts values,
  not sets. Push selftest 342 ✓ again; Sidebar is the only map entry with a repeated value.
- Native pack refresh (user: Patterns/Sidebar final, clipboard OK): a drop script took 20 sets out of the pack (19 chart
  sets incl. .Primitives/Chart/Sector, Trend, Hatch, Legend-Item, Stack-Bar Single/Value-Sector, and Patterns/Sidebar's
  4 old variants) with their 149 symbols and 0 slot contents; probe 16897:29494 (164 instances: charts 145, Patterns/
  Sidebar 16, Header/AppShell 3) captured with `--merge --keep`: 21 sets + 164 symbols added, the 211 sets kept stay,
  clipboard put back 6/6, probe removed. check 177/177, figma-native selftest 130 ✓, studio:selftest exit 0.
- Probe (private server): Header/AppShell draws its 4 Theme × Density cells; Patterns/Sidebar switches all 5 themes
  through the variant panel, Medium rail 80, expanded 240; the Small rails measured 60 / 52 (Figma 72 / 64) without a
  logo → AppShell fixed sidebar.css at its owner (e94c0f3c, min-width 72 / 64), stacked under this branch.
- Stack gate (one run for AppShell's #181 + this branch, Supervisor's plan; report .qa/reports/2026-10-21T07-13-11-
  92715053.md): static ✓, Vitest 76/76, behaviour 0 errors, runtime 0 errors + 4 new [rhythm] warnings on AppShell's
  G1 · Grid (10 text styles, already on main), Studio E2E 329 works / 7 broken. B-28 passes on a rerun (flaky under
  load); MC-02…07 fail on main as well (shared checkout at 51dffc2b, and b454389b / 3c77ff96 / e94c0f3c without this
  branch's commits): the click selects the variant but the Layers row never shows selected. Last worked 12:09 today
  (Zen-DS-appshell); handed to B (mainComponent / Layers) and the Supervisor.

## Session "Bug" · Chart responsive in Figma (Figma library only; user: "kiểm tra lại responsive tất cả các chart trong figma", "tất cả các chiều", "Sửa hết")

- Audit: temporary instances of every chart variant on the QA page 15872:3 at 280/343/600/1200 wide (and 0.8×/1.6×
  height for fixed-height ones), clip-aware, shapes by render bounds; flags x/y overflow > 1.5px and a gap > 24px below.
- Fixes: .Primitives/Chart/Sector 4388:8677 last grid row → HUG (labels hung 12px under Line/Multi-Line), Trend
  4401:7782 Sector overrides too; the selected sector (tooltip) moved to the middle in 4 Line Trend + 8 Stack-Bar
  variants (instance constraints cannot be overridden); Radial/Donut Chart frame HUG + minWidth per Size (ring
  120/168/240/320, +124 Start/End legend; Radial End 286–486); Bar Vertical 12-sector minWidth 324, Horizontal minHeight
  290/370/410/610 (4 Secondary made FIXED 290 like Primary); Funnel minHeight 318, Bullet 294.
- Re-audit: 580 instances, 0 issues. The native pack still holds the old chart skeletons (merge keeps what it holds):
  refresh them with the Header/AppShell capture after AppShell's #179 lands.

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

## AppShell session · Breakpoint & Grids tokens (tier XS, branch `zen/fix/tokens-breakpoint-bento-20261021`; user: "Kiểm tra update thêm token trong Breakpoints từ Figma")

- Read live (use_figma, the Breakpoint & Grids collection: Desktop · Tablet · Mobile, 16 variables). The repo's 12
  tokens match Figma value for value, aliases included.
- New in Figma, the same in every mode:
  - Margin-Bento-Grid {Spacing/Padding/XSmall};
  - Margin-Bento-Layout {Spacing/Padding/Medium};
  - Gutter-Bento-Grid {Spacing/Gap/XSmall};
  - Modal-Padding-Bento {Spacing/Padding/XSmall}.
- Added to tokens/source/figma/breakpoint-grids.json, then `tokens:build` for web, Swift and Flutter (2234 tokens,
  830 vectors). Checks pass: tokens:check, tokens:native:check, style, tsc, studio:selftest, ai-kit, guidelines and
  usage.
- No component uses them yet. They reach apps, the Design Tokens page and Studio's Variables.
- Gate (2026-10-21 18:13, main b0c48b29 merged in) **PASS**:
  - The token scope saw no diff against HEAD, so it checked the representative set (button, card, dialog, popover,
    list-item, chat, templates).
  - Static checks green.
  - Platform audit 1512 + 390 + 320: 0 errors, 0 new warnings. Dark: 0 errors.
  - Behaviour: 0 errors.
  - I looked at the dialog 390 sheet: unchanged, as expected for unused tokens.

## AppShell session · Token Color/Background/Carved (tier XS; user: "Update token background-carved")

- Read live (use_figma, Mode Colors (Semantic), VariableID:12082:86877): Light {Light/Neutral-Alpha/2} (the repo had
  /3); Dark {Dark/Carved} #0505058C in the Zen, Chat, VT and Ecom-Demo modes, unchanged.
- tokens/source/figma/mode-colors-semantic.json, then `tokens:build`: web, Swift and Flutter. tokens:check,
  tokens:native:check and high contrast (0 failures) all pass.
- No component CSS and no Figma contract binds Carved: it reaches apps, the Design Tokens page and Studio's Variables.

## AppShell session · Chart/Metric text follows Chart/Line-Chart (tier M, branch `zen/fix/chart-metric-text-20261021`)

The user asked:
- "Kiểm tra lại đồng bộ cách sắp vị trí và spacing giữa description và value … theo cách sắp của Chart/Line-Chart"
- "value luôn nằm dưới segmented"
- "Chart/Bar-List còn xót"
- "Vừa update lại text style của các metric widget và chart card", with the scope "Chỉ Chart và Metric".

Figma, done with use_figma once the user added the permission:
- Bar, Area, Combo, Gauge, Funnel, Bullet, Bar-List, Donut, Radial and Heatmap now each have a Metric frame below the
  Segmented, as Line-Chart has: Padding/Small above, Gap/3XSmall between, Description Body/Small/Regular over Value
  Display/4. Combo's Value was Heading/2.
- The Metric frame shows with Show Value, as on Line-Chart; on Radial and Heatmap it shows with Show Description.
- Funnel and Bullet variants are fixed at 318 / 294. They were HUG with a Fill body, which overflowed.
- Checked: same Metric signature in all 10 sets, and no overlaps.

Code:
- ChartCard: header, then the Segmented, then the Metric; title Body/Extra/Medium.
- MetricWidget: the Title-Highlight and comparison titles are Body/Extra/Medium; Tile number Display/4; Hero number
  Display/1, unless the card sets a size.
- Guidelines and JSDoc updated. New test: `tests/interaction/chart-card-metric.test.tsx`.
- Card, ListBox and table-in-card titles keep Heading/Subheading. The harness rule is unchanged.
- A1–A4 drift (reported by the Bug session, which re-read 15904:1616 / 2813 / 6185 / 8996 for the user):
  - In Figma, Patterns/Sidebar and Header/AppShell are both Density=Small. Canvas, Shadow (A1 only) and
    Collapse=Sidebar already matched.
  - `a-compositions.tsx` now sets `density="small"` on the Sidebar and the AppShellHeader, in the render and in
    codeFor. Bug's Card/List-Box rename covers the cards' "flat" → "default".
  - It needs #181 (bce44e61) in main: before that, `density="small"` alone picks the old Small-Density variant. Merge
    main after #181 lands, before this branch's gate.
- Header/AppShell re-read live (Session B asked about the push):
  - Theme=Border & Divider's Main-Element now pads 20 (Padding/Large) above and 16 below; the code had 16 above.
    Fixed in app-shell.css, the JSDoc and the app-shell-grid test.
  - Figma also has a new Theme=Borderless at Density=Small: the Border & Divider rows without the 1px line. The user
    said "Thêm theme=\"borderless\"". Added: the AppShellHeader theme value, the CSS shared with border-divider
    (the line on border-divider only), JSDoc, guideline, contract option, Studio map, figmaProps, and a test (top 12 ·
    24 with no line, 64 high; Main 20 · 24 · 16).
- G1 · Grid's rhythm warnings ("10 text styles" at 1512 / 390 / 320 and dark, found by Bug's stack gate): G1 is
  Figma's 16817:58511, and the user chose "Baseline, giữ như Figma". Baseline G1's warnings with the count this
  branch's gate measures; ChartCard's Display/4 and Body/Extra/Medium may change the 10.
- Gate (2026-10-21 18:21, main b0c48b29 merged in; `ZEN_QA_SHARDS=4 --isolated --pages=chart,metric,widgets,app-shell,templates`) **PASS**:
  - Static checks green; Vitest 78/78.
  - Platform audit: 0 errors. Dark: 0 errors. Behaviour: 0 errors.
  - Studio E2E 336 works · 0 broken (full run, no shards).
  - 31 new warnings, all caused by the ChartCard text styles: rhythm on A1–A4, F6, G1, Widgets and HR Home / My leaves
    / Expense overview, and outline-siblings on the Finance dashboard and the Dashboard template (a ChartCard title in
    Body/Extra/Medium beside a Card title in Heading/Subheading).
  - The user answered "Baseline, giữ như Figma" (rhythm) and "Giữ khác nhau, baseline" (card titles). Baselined
    with `audit.mjs --baseline-update=rhythm,outline-siblings` for chart, app-shell, widgets and templates (light at
    1512 / 390 / 320, dark at 1512): 159 keys.
  - Contact sheets reviewed: chart 1512 shows header · Segmented · description · Display/4 value on every card.

## AppShell session · Patterns/Sidebar → Studio, Sidebar themes (tier M, branch `zen/feat/studio-patterns-sidebar-20261021`, stacked on #179)

The user asked: "Update cả Patterns/Sidebar từ figma lên Studio", "Cập nhật boolean cho footer của sidebar từ figma lên
studio", and (through the Bug session) "bổ sung variant của Patterns/Sidebar". They approved Carved and
Carved-Floating: "Có, cùng đợt Studio". Borderless appeared in Figma while I worked.

Live Patterns/Sidebar 6040:67524, renamed from "…/Density-Medium":
- Theme = Default | Border | Borderless | Carved | Carved-Floating; Density = Medium | Small; plus Shadow and Expand.
- The flush themes (Border, Borderless, Carved): inset 0, rail 64, header gap 24, body padding 4·8.
- Carved-Floating: inset 8·0·8·8, panel in Background/Carved, radius 20, no shadow.

Code:
- `sidebarThemes` has all five values, with CSS for each.
- New test in app-shell-grid.test.tsx.
- Guideline row updated.

Studio:
- Contract: the ❖ Sidebar page re-read (Basic and Small-Density gained Collapse Button and Footer, Workspace gained
  Footer) and Patterns/Sidebar added under ◇ Master-Layout.
- Map: Footer → { toggle: "footer", on: "slot" }; Collapse Button → skip.
- figmaProps regenerated (48 toggles).
- MASTER_SIDEBAR_PATTERN, library-keys and the push selftest use the new name.
- `studio:selftest` exit 0.

The Bug session wires Patterns/Sidebar into Properties and the Main component, and captures the native pack together
with Header/AppShell.

### Standalone Sidebar → Patterns/Sidebar (same branch; user: "Có, sửa push Sidebar đứng riêng luôn")

- Live set read (use_figma, read-only): 16 variants. Border, Borderless, Carved and Carved-Floating exist only at
  Density=Small, and their Shadow is fixed (No when open, Yes on the flush rails). The Side-Bar inside is named
  Patterns/Density/Comfortable/Sidebar/Yes|No.
- Push (`figma-push.mjs`):
  - `sidebarPatternProps(look)` picks the nearest variant: Theme and Expand first, then Density, then Shadow.
  - `sidebarPatternNode` wraps a Basic Side-Bar on its own: its props go to nested "Patterns", its slots and edits move
    inside the Sidebar/Yes|No layer, and that layer fills the pattern's height. Workspace and Small-Density stay as
    they are.
  - The AppShell master writes the same variant (`pattern="grid"` gives Border · Small). Its frames fallback wraps too.
  - Rail widths follow the look: 80 · 72 (Small) · 64 (flush).
- Pull (`figma-pull.mjs`):
  - The composition read keeps its variant (`compositionProps`), and `sidebarPattern` reads a placed pattern or the
    push's instance.
  - `sidebarLookProps` gives back theme, density and shadow. Shadow=No is read on Default only.
  - `instanceIn` and the master frame carry the look, so it survives the AppShell read too.
- Checks:
  - Push selftest 347 (5 new: variant choice, a carved small rail, the grid master, two round trips). `studio:selftest`
    exit 0. library-keys check: all 176 sets keyed.
  - Live-shaped reads of three placed patterns (16783:66571 Border·Small, 16272:135322, 16256:1944) give
    `theme="border" density="small"`, `density="small"` and `collapsed density="small"`.
- BACKLOG P2 "A standalone Sidebar pushes without its theme" removed.
- Real Figma: the plugin's importer was run on "Studio exports — QA" (unused paths stubbed, one use_figma call) with
  three Sidebars: carved small, a border rail, and default with shadow={false}.
  - Each became Patterns/Sidebar with its exact variant: 240 / 64 / 240 wide, the Side-Bar filling 982, rows and
    selection right.
  - The screenshot matches: a flush Carved column, the rail with its line, the inset panel without a shadow.
  - The frame was removed afterwards.
  - The bed's notes about Footer-Container and Divider are use_figma skipping hidden layers. The Footer boolean already
    hides them, and the plugin finds hidden layers.
- Fix from Bug's gate on 3af0dfb9 (Studio Main component probe). Collapsed without a 32px logo, the Density=Small rail
  hugged its content: 60 for default/carved-floating, 52 for the flush themes. Figma's rails are a fixed 72 and 64.
  sidebar.css now gives the small rail min-width 72 and the flush rails 64, as Medium has 80. The new test in
  app-shell-grid.test.tsx runs in Bug's re-run; I ran no browser test, so as not to overlap Bug's gate.

## Copy a Section with its frames (Session C) — tier S, branch `zen/feat/studio-section-duplicate-20261021`
The user picked it (2026-10-21) from the BACKLOG P1 "Studio design page = Figma" leftovers (F4, C's area). ⌥-drag, ⌘D
and ⌘C ⌘V of a Section copy it with the frames and Sections it holds (board/sections.ts, any depth), all moved by the
same amount, in one edit and one ⌘Z; the copy is selected. `frameEdit.ts` `copySection`: one `insertChild` `paste` of
the Section copies first (they draw behind the frames) then the frame copies, after the original Section; each copy a
new id (`freeFrameId` per kind); links stay as written (Figma's copies on a page keep pointing at the originals:
forum reports). `copyFrame` hands a Section to it, so ⌥-drag (`frameMove.ts`, the Section no longer refuses ⌥), ⌘D
and paste all take it; a Section's ⌘C clip carries what it holds (`frameClip` `held`). Fix met on the way: ⌘D on a
Section copied only the Section, under a Screen's id (`freeFrameId("screen")`). Checked in Node: the paste edit on a
builder page puts Section 2 after Section 1, then its Screen. E2E FW-106 (⌘D beside, ⌥-drag where it ends, the
original stays, one ⌘Z each) waits for a gate slot.
- Gate (13:05–13:36, main 3c77ff96 merged in): static ✓; Studio E2E 335 / 336, B-28 timed out (AppShellHeader
  selection) and passed alone (52 s): load flake. The matrix leaves the Figma walk out, so `--only=figma` ran apart:
  FW-106 ✓ with FW-44/45/46. FW-66 (F6 text Resizing, mine) failed there and on main 3c77ff96 too: its steps take
  under 1 s, but `restoring`'s `undoTo` waited 4 s after each of the first four of five ⌘Z (until the page equals the
  start) and passed the row's 20 s. Fixed at its owner, the shared helper: each ⌘Z waits for its own step (the page
  changes). FW-66 + FW-106 ✓ in 12 s. The whole Figma walk again: 125 / 126, FW-02 (⌘F) timed out once and passed
  alone (8 s; it passed in the first walk run).

## Layers missed the Main component's variant cells (Session A, branch `zen/fix/layers-variant-cells-20261021`)

B and Bug found MC-02 flaky alone: "its Layers row selected" timed out, and the set row in Layers had no children.
LayersPanel's MutationObserver took the canvas world once, when its effect ran. A world the canvas mounted later (a
page opened directly) was never watched, so the async variant cells never rebuilt the tree. Now the observer is
re-pointed whenever `attachCanvas` notifies (`canvasApi.onChange`), and a rebuild is scheduled each time it starts
watching a world.

## A list that closes a phone page is an open section — tier M, branch `zen/feat/list-section-rule-20261021`
User (2026-10-21): "Thêm rule và hardness là nếu list-box (hoặc danh sách các list item) nằm cuối trang ở mobile thì
không bỏ vào list box mà đưa thành 1 danh sách nối thành 1 section giống trong example Finance trong Figma", then
"cuối trang nghĩa là bên dưới nó không nằm trong grid của các widget, mà là 1 danh sách độc lập liệt kê như task,
transaction". Read from Figma ◆ Finance (4595:17267, "Transactions" I16342:3863;…;16342:4266): a Heading frame
(Heading/4 + See All, Margin-Comfortable sideways, Padding/Medium above and below), then a frame of List-Item
(Interactive=Yes) padded Margin-Comfortable, gap 0, straight on Canvas/Default; the List-Box set has no open variant.
- Rule: usage rules §19, ListItem guideline Do/Don't, Figma skill (screen-rules table + §4, audit-rules row, SKILL.md).
- Code harness `listbox/closing-list-on-phone` (error, allow `closing-list`): a ListBox in a PlatformPhone or Studio
  `<Screen device="phone">` with nothing after it up to the phone, outside Grid / row Stack / box, the only ListBox of
  a Canvas/Default screen and not a §15 group (a kicker over it and an earlier kicker over a Card or ListBox). A ListBox
  at a component's root is judged where it is used. Fixtures: 4 bad, 6 good.
- Fixes met: `openRepeat` missed `(…).map(` receivers (a cast: layout's task groups read as one list); `tagClose` read
  the apostrophe in `hero={<Text>I'm …</Text>}` as a string and ended AppShell's tag in its children (D3 was missed;
  the new apostrophe fixture fails without the fix). Neither changed another rule's findings on the repo.
- Opened 13 lists on phones: Button (Also off), Chart (Budget left, Entries, Six-week totals), VisuallyHidden (Inbox),
  AppShell C1, C2, C7, D3, D4, F10, F11, F12 (render and code samples). Toggle and ColorPicker settings screens stay
  boxed (§15 groups).
- Figma audit `list-box/closing-list-on-phone`: checked by id (instance sublayers are new objects, indexOf = -1). Run on
  ◆ Finance: 0; on ◇ Master-Layout · Example: C1, C2, C7, D3, D4 (15921:7245, 15921:8204, 15942:120713, 15950:9324,
  15950:9696) still box their closing list. Not changed in Figma: waits for the user (BACKLOG).
- Static: usage selftest + check, tsc, guidelines build/check, ai-kit check, mcp selftest, style check ✓.
- Figma (user: "Sửa luôn 5 màn C1, C2, C7, D3, D4 trong Figma"): each closing List-Box became an open section (the
  Header-Slot Title-Row cloned, a `List` frame Gap/3XSmall of the same List-Items via `instance.clone()`), old box hidden,
  checked next call, then removed. Clones rendered at the components page's mode (Avatar 40, rows 70) until a Component
  Size mode was set and cleared on the new frame (rows 72). C1's See all was a Button/Flat: now the underlined text link.
- Then (user: section spacing 32 on phone and desktop; a widget grid keeps its gap; related content in one section;
  never a title apart from its list): C1 Progress (Card + Stats), C2 Balance (Card + Quick-Actions, as Finance "Main"),
  C7 Today (date line + Card + Stats) grouped (clones verified against the hidden originals), Content slot gap →
  Layout-Mobile/Section-Gap (was 24 / 16 / 16). Code C1, C2, C7 match (groups in `<Stack gap="md">`, sections straight
  in the AppShell body). Usage rules §13, screen-rules, audit-rules updated; audit `spacing/section-gap` extended to
  AppShell Content slots and desktop (XLarge), skips panes with a FILL child and Dividers; new `section/title-apart`.
- Full audit on the 5 screens: 0 findings from these rules; 4 older ones left (Liquid/Floating-Glass bars read as
  Gradient by `theme/navigation-surface` ×3, D3's streak Badge "3" `badge/count-uses-counter`). Page scan: B3, B5, C4,
  C5, C6, D2, D5, E4, E7 still break the section rules (BACKLOG, asked the user).

## Section rules on 9 more Master-Layout screens — tier M, branch `zen/feat/section-rules-9-screens-20261021` (on #188)
Task from the "List-box mobile layout rule" session (BACKLOG P2): B3, B5, C4, C5, C6, D2, D5, E4, E7 of Figma
◇ Master-Layout · Example (15902:109717). Method as C1–D4: `instance.clone()` into a new auto-layout frame (fills none,
no clip), originals hidden, Component Size Compact → Comfortable → cleared on the frame, texts/sizes/nested mains
compared with the hidden originals in the next call (all identical), then removed.
- B3: Row-1 and Row-2 rebuilt inside one `Widgets` section (Gap/Medium); slot gap → Gap/XLarge. Code: `<Stack gap="md">`.
- B5: the React 19 Inline-Message moved into step 1 (its install note); slot gap → Gap/XLarge, so the intro and steps are
  32 apart. Code: article `gap="xl"`, the note inside the first DocSection, sample rewritten to match.
- C5: Summary stays a section; Segmented + Customer + Items cards → `Details` (Gap/Medium). Code: the total, then a
  `<Stack gap="md">` with the Segmented and its groups, straight in the AppShell body.
- D5: open closing list: `Live quizzes` = Title-Row (the old Section-Header) over a `List` frame (Gap/3XSmall), as C1.
  Code: section `gap="md"` over `<List>` (was a `ul` Stack at sm).
- C4 (`Tour`), C6 (`Identity`, Gap/Large), D2 (`Sign-in`, Gap/Small), E4 (`Get started`), E7 (`Daily updates`): one
  section each, same rhythm; the code already was one Stack. All nine slots bound to Section-Gap / XLarge.
- Audit fixes met (false positives): `section/title-apart` read B5's "2. Wrap your app" (Heading/3 + its paragraph) as a
  lone title: a text after the first past 60 characters or wrapping is copy, not a title. `theme/navigation-surface` read
  the Liquid-Overlay top bar (C4) and Floating bottom bar (D5) scrims as painted gradients: a bar's own, unoverridden
  gradient passes. `bounds/overflow` flagged B3's Large Indicator Tab-Bar (64) spilling 12/12 out of the 40 header row:
  deliberate (tabs.css: the indicator sits on the header's bottom border), now skipped.
- Minified audit on the 9 screens: 0 errors, 0 section findings (43 warnings, all older: canvas overrides, chart shapes,
  sparkline absolutes, docs "Yes").
- Met while taking the after shots: C6's Checkbox/Text was fixed at 141, so "Matches my ID" wrapped onto two lines in
  some renders. Its Container, Content and Label now hug (143 wide, one line), checked on a fresh screenshot.

## Calendar in code + Studio (session "Calendar", tier L; user: "Đã duyệt, làm Calendar trước")

Branch `zen/feat/calendar-20261021`, worktree `../Zen-DS-calendar` (from main e99c5408). Spec card, page manifest and
API: `docs/research/calendar-2026-10-21.md` (read from Figma ❖ Calendar 16121:3 with read-only use_figma dumps).

- Library `src/components/Calendar/`: views CalendarToolbar, CalendarWeekStrip, CalendarMonth, CalendarTimeGrid,
  CalendarAgenda; primitives CalendarEvent, CalendarEventBlock, CalendarDate, CalendarNowLine, CalendarDayCell,
  CalendarAgendaItem, CalendarDayTile (Slot = the time grid's rows). Reuses DatePickerItem (Week-Strip Dot, mobile
  Month), Button / IconButton, Segmented, AvatarStack, EmptyState. `calendarDates.ts`: Monday-first weeks, lanes for
  overlapping events, Intl formats, `shiftPeriod`, `calendarTitle`, `toDate` (ISO strings in local time).
- Figma choices kept: event hues Support/<Hue>, Brand text Content/Accent; hover steps one ramp step (Subtle → Soft,
  Solid → Rich; Figma draws none); Day-Tile Selected keeps its Pale border (zen-allow, Figma 16142:3915).
- Found and fixed while building: `font: inherit` on calendar buttons overrode "+N more"'s Caption style; the phone
  toolbar title clipped ("Septemb…": Heading/3 is 26px in the Mobile typography) → short default title on mobile
  ("Sep 2026") + BACKLOG P2 question for the designer; the phone example offers three views (a fourth label clips at
  Comfortable). Studio's page dialect drops `new Date(…)` props → every date prop also takes an ISO string.
- Platform page `calendar` (playground + 6 examples incl. PlatformPhone and keyboard), Do/Don't visuals, guideline +
  keyboard map, harness rules (3, fixtures), smoke fixtures, axe baseline (colour-contrast only: Neutral/Light text,
  white on Zen/9 and Support Orange/Pink Solid — token level, as DatePicker), tests/interaction/calendar.test.tsx (9).
- Studio: component-properties.json page ❖ Calendar (5 public sets), figma-props.map entries, generated props / variant
  sets, 5 Assets items (ISO dates), library keys (5), native pack: a probe frame of the 5 sets on the QA page, copied
  from Figma desktop with the clipboard saved and restored through files (6 types back), merged into the pack (13 sets,
  88 symbols, 32 contents added; nothing replaced), probe removed. studio:selftest green.
- Figma: the 13 Calendar descriptions' "Draft 2026-10-17, not yet in code." → "In code since 2026-10-21: <Component>".
- Gate (run at once on the user's word, isolated, `ZEN_QA_SHARDS=4 --pages=app-shell --files=<4 tsx>`): PASS, static ✓,
  audit 1512/390/320 + smoke/quality/density 0 errors (33 baseline), dark 0 (9 baseline), behaviour 0; B3, B5, C5, D5
  shots match Figma (B3's ChartCard now has #189's metric under the Segmented). PR #192.

## A Grid in a Grid cell stretches in Figma (Session C) — tier S, branch `zen/fix/figma-grid-in-grid-20261021`
The user picked BACKLOG P3 "Export › Figma: a Grid inside a Grid cell does not stretch to its row" (Dashboard: the
second metric pair at 168 where CSS gives all four cards 248). Measured in Figma with use_figma on the QA page (every
test node removed in the same call), with raw frames and then real Card instances:
- the push hugged a frame cell, so the inner Grid kept its own height and its cards theirs (63 / 198 reproduced);
- a Grid with Flex rows keeps whatever height it has, Hug or not (100, 400, 10 as left); with Hug rows it hugs;
- what works: the inner Grid measured with Hug rows, given that minimum and Fill, then its Flex rows back: four
  cards at the row's tallest (138), stable when settled again.
Changes: `figma-push.mjs` gives a Grid in a stretching grid cell `fillH` and Flex rows (another frame cell still hugs);
the Zen plugin's `settleGridRows` settles such a Grid as it settles a card, with Hug rows while measuring (plugin
7a996a8 on studio-import, its test, full `npm test`; `dist/` rebuilt, the old one in
`backups/dist-before-grid-in-grid-20261021.tgz`). The direct paste cannot measure, and a pasted Grid with Flex rows
would stay at its estimated 100: `figma-native` keeps it hugging with Hug rows, as before (selftest). Pull reads no
cell height or row sizes, so the page round-trips unchanged. Selftests: push 343, native 131, pull 114.

## Search Rounded in the Figma library (session "Search shape variant rounded", tier S; user: "có")
- Answer to the 2026-10-17 question (mobile library searches default to Rounded). Code already did it (1a89304b:
  SearchShapeContext in TopNavigation's control bar and BottomSheet, so the Input phone sheet too); this is the Figma side.
- Scan of every component on the mobile, Master-Layout, Input, Calendar/Schedule/Timeline, Chat, AI-Chat, Side Panel and
  Sidebar pages for a Search/Default held directly: Bottom-Sheet (4059:14161, Type=Action Flex + Max-Fixed: Search
  4435:20701, 9818:7099) → `setProperties({ Shape: "Rounded" })`, size and text kept, no placed instances of those
  variants. Top-Navigation/Mobile's Control-Bar is an empty SLOT (Control-Slot, 24 variants): nothing to set.
  Dashboard Header Control-Bar and Side-Bar Small-Density are desktop: Default kept.
- Templates: no Search in phone frames on ◆ Social/Finance/Logistic/HR/Ecommerce; ◇ Master-Layout · Example has three
  in Pattern/AppShell/Mobile slot content (E1 · Delivery home, E2 · Shop home, E6 · Discover) → Rounded (texts and
  trailing scan/mic kept, screenshots checked).
- Then the user: "AppShell mobile cũng mặc định Rounded", "nhưng cho phép đổi". AppShell.tsx gives SearchShapeContext
  `rounded` to its frame, stacked/modal side panel and drawer when `layout === "mobile"` or the phone drawer
  (`chrome.phone`, under TABLET_MIN_WIDTH); `shape="default"` still wins. So the E1/E2/E6 code twins need no prop.
  Studio's push draws no mobile AppShell yet (Sidebar pattern only), so it needs no Shape rule. Test
  search-shape-on-phones +1 (mobile rounded, explicit default, desktop default); app-shell tests 61/61.
- Docs: Figma skill screen-rules row, CHANGELOG, BACKLOG (P2 → archive; new P3: native-pack's Bottom-Sheet still
  draws Search/Popover from its 2026-10-18 read, re-probe incremental).
- Gate (user: "chạy gate luôn đi, đừng chờ"): PASS, report .qa/reports/2026-10-21T14-53-08-c9cbf549.md (isolated,
  ZEN_QA_SHARDS=4, app-shell/search/templates/sidebar + representative set; Vitest 78/78, all Figma suites, audits 0
  new); CI job-1 steps run locally (build, verify:package …). PR #194; GitHub auto-merge is off for the repo, so Giám sát
  merges it on green.
- Native pack (user: "chụp lại native pack Bottom-Sheet luôn đi"), branch zen/fix/native-pack-bottom-sheet-20261021 on
  top of #194: probe frame of the 4 Bottom-Sheet variants on the QA page (17022:4), copied from Figma desktop (the
  clipboard was empty and was put back empty), set 4059:14161 and its 4 variant symbols REPLACED (the add-only merge
  keeps stale entries), 1 missing nested symbol added (16327:6722 Style=Black Overlay); the Action variants' Search now
  points at Search/Default Size=Small, Shape=Rounded. Probe removed; native-pack check + figma-native selftest 130 ✓.
  BACKLOG P3 archived.

## BadgeStatus (session "Inline input component types", worktree ../Zen-DS-badge-status, tier L)

- Figma first (user rule "Figma trước, duyệt rồi qua Studio"): Badge-Status 16932:195 promoted from ◆ HR-Platform's
  `.HR/Workbend/Task/Status- old` (deleted with its local Icon-Progress after its 32 placements + 16 row icons moved);
  6 statuses × Medium|Small, `.Primitives/Badge/Progress-Icon` 16943:171 is one component whose value is its Progress arc
  (drawn in Comfortable at 24, 2px ring, bound to Element-Size/Popular/Base). User approved: "duyệt, làm code BadgeStatus".
- Code: `src/components/BadgeStatus` (SVG ring on the same 24 grid, so 1.67px in Compact; Blocked/Cancelled use
  icon-slash-circle-01-line / icon-x-circle-line), `export *` in src/index.ts, labels statusToDo…statusCancelled +
  statusPercent (en/vi), Badge guideline extended (+ tagsFor), harness `badge/workflow-status-uses-badge-status` with
  bad/good fixtures, usage rules §19, figma-docs cards for Badge-Status and Progress-Icon, ai-ui catalog rebuilt.
- Platform: Badge page playground panel + examples (Task status and Status on a phone moved to BadgeStatus; new Release
  checklist, Project progress, Board columns), a Do/Don't pair. The new rule found a hand-themed "Done" Badge on the
  Empty State page: fixed there (both task-status Badges on that page are BadgeStatus now).
- Checks: tsc, usage:selftest/check, guidelines:check, ai-ui/ai-kit/icons/styles/tokens checks, style:check on the
  edited files, smoke + conformance for BadgeStatus; shots of the Badge page at 1512, 390 and dark looked right.
- Not done here (proposed as follow-ups): other platform pages and the HR templates still show task statuses as
  `Badge theme={taskStatusTheme[…]}` (dynamic text, not caught by the rule); Studio support (Main board, push/pull);
  Input/Property-Field code.

## PropertyField (same session, stacked branch zen/feat/property-field-20261021 on badge-status)

- Started while BadgeStatus waits in the gate queue (Giám sát: 7th). User approval: "duyệt, làm code BadgeStatus
  trước" (both Figma drafts approved; BadgeStatus first).
- API: composition, one-to-one with Figma — `PropertyField` (row: label, icon, action) + one value cell (`PropertyText`,
  `PropertySelect`, `PropertyStatus`, `PropertyDate`, `PropertyPeople`, `PropertyTags`), each value/defaultValue/
  onValueChange, placeholder ("Empty"/"Trống"), readOnly, state (Figma State, docs only). A union prop on one component was
  dropped: react-docgen would not document it.
- People and Tags always show the + (the keyboard path to add; a Tag with onClick around a Remove button would nest
  interactives). The label column scales with Component Size (6.4 × Element-Size/Popular/Base: 128 Compact, 154
  Comfortable) after "Assignee" was cut beside the + on a phone; Figma's column stays 128 (Compact).
- Docs live with the Input fields (as Inline-Field): input guideline + tagsFor, harness property-field/one-value, usage
  rules §20, figma-docs cards, four Input-page examples, a Do/Don't pair; smoke fixtures + tests/interaction/property-field
  (6 tests: names, text Enter/Escape, status pick, people remove/add, create label, readOnly).

## Studio for BadgeStatus + PropertyField (same session, same branch zen/feat/property-field-20261021)

- User: "làm tiếp Studio trong lúc chờ gate". studio:selftest required it anyway (palette "every library component
  folder is offered" failed for the two new folders), so Studio lands in the same PR.
- Map: BadgeStatus ↔ Badge-Status (Status, Size); PropertyField ↔ Input/Property-Field (Label, Icon/Icon-Src toggle,
  Action toggle → `{ label: "Add" }`). One Figma set maps to one code component, so the six cells are not mapped: push
  draws a cell as the nested Value (.Primitives/Input/Property-Value Type/State + Badge-Status / texts / Tag / Badges via
  `nested`), pull rebuilds the cell from `nested`/`texts` (tools/studio/figma-property.mjs). Gotchas: figmaFromPage has a
  local PROPERTY_TYPE (import aliased); the row's child must not also go to a Content slot; pull drops a TEXT equal to
  Figma's default, so PropertyField's required label is put back.
- Contract (component-properties.json, one line), library-keys (append, order kept), native pack: probe 16977:125164
  (37 instances) captured with clipboard save/restore (8/8 types back), merged additively (+3 sets, +44 symbols), probe
  removed; copy kept in this session's scratchpad pack/probe-badge-property.html for re-merges.
- PropertyDate takes ISO strings (Studio dialect drops Date objects); PropertyField action.onClick optional.
- Checks: studio:selftest ✓ (2447+), figma-push 356 ✓, figma-pull 114 ✓, tsc, usage, guidelines, ai-ui, tests ✓.
  studio:e2e (BL-01/02 etc.) runs in the gate.
- Gate (merged main 73e88b15): conformance asked for BadgeStatus/PropertyField in STYLE_ON_ROOT (instance-look.mjs);
  density @320 Comfortable: a person chip had 54px beside the 154px label (remove button 5.6px out) → a value under
  5 × Element-Size wraps below its label (row gap 0); APG: Escape from the + left focus on the first chip → the picker
  returns focus to its opener, and a second press on the + closes the list (it counted as outside, then reopened).
- Contact sheets: badge@390 Release checklist pushed Status off the phone (Owner 160px) → on a phone the owner joins
  the caption, as in Task status. Gate 3 (badge + input, files after run 2): PASS; run 2 Studio E2E 338 works · 0 broken.


## Schedule in code + Studio (session "Calendar", tier L; user: "xong gate thì làm tiếp Schedule")

Branch `zen/feat/schedule-20261021` (worktree `../Zen-DS-schedule`, on top of the Calendar branch). Spec card:
`docs/research/schedule-2026-10-21.md` (read from ❖ Schedule 16121:6 with read-only use_figma dumps).

- `src/components/Schedule/`: ScheduleResourceGrid, ScheduleItinerary, ScheduleSlotPicker, ScheduleDayPlanner and the
  primitives; dates through Calendar's `toDate` (ISO strings for Studio pages). Reuses Event-Block, Now-Line, Week-Strip,
  Avatar / AvatarStack, Dock-Icon, Badge, Divider, IconButton.
- Choices: Slot heights from Select-Item Medium / Small (Comfortable 40 / 32 on phones; Figma's text says 44); Past stop
  titles Neutral/Base (zen-allow, Figma 16133:1131); the Slot label keeps Corner-Radius/Action/Small (it is the radio's
  box); Event-Card meta wraps on a narrow card; bars and the now line are placed through CSS variables.
- Platform page `schedule` (playground + 6 examples incl. PlatformPhone booking), Do/Don't visuals, guideline + keyboard
  map, harness rules (2, fixtures), smoke fixtures, axe baseline (colour-contrast only: Neutral/Light text), 4 interaction
  tests. Studio: component-properties page ❖ Schedule (4 public sets), figma-props map, 4 Assets items, library keys.
- Native pack (user: "Làm luôn"): probe of the 4 sets on the QA page, one Figma desktop copy (the clipboard was empty and
  stays empty), merged additively (9 sets, 34 symbols), no picture layers, probe removed; native-pack check green.

## Timeline in code + Studio (session "Calendar", tier L; approved with the three pages)

Branch `zen/feat/timeline-20261021` (worktree `../Zen-DS-timeline`, on top of Schedule). Spec card:
`docs/research/timeline-2026-10-21.md`.

- `src/components/Timeline/`: TimelineActivity, TimelineMilestones, TimelineGantt and the primitives TimelineItem,
  TimelineMarker, TimelineMilestone, TimelineGanttBar, TimelineGanttLabel; dates through Calendar's `toDate`.
- The Gantt splits its own width into weeks, so (as Resource-Grid) its scroll box takes `contain: inline-size` and a
  sizer gives Figma's width (1120 / 358) where the parent hugs; the phone Gantt and Resource-Grid re-align to today / now
  once their columns are measured (they opened half a column early).
- Platform page `timeline` (playground + 6 examples incl. PlatformPhone), Do/Don't visuals, guideline + keyboard map,
  harness rule (1, fixtures), smoke fixtures, axe baseline (colour-contrast only), 3 interaction tests; Studio
  contract page ❖ Timeline (4 public sets), figma-props map, 3 Assets items, library keys.
- Native pack (user: "Làm luôn"): probe of the 4 Timeline sets, one Figma desktop copy (clipboard empty before and after),
  merged additively (8 sets, 36 symbols), no picture layers, probe removed. Figma descriptions of the 8 sets updated.


# Changelog

All notable changes to Zen DS. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[SemVer](https://semver.org/) (0.x: minor bumps may break).

How to maintain it:

- Add a line under **Unreleased** whenever a change touches the public API (`src/index.ts`), a component's look or
  behaviour, a house rule, a harness rule or a QA gate.
- Keep lines short and user-facing. The details (causes, measurements, test names) belong in
  `docs/context/session-log-<date>.md`.
- On release, rename **Unreleased** to the version and date, bump `package.json`, and start a new empty Unreleased
  section.

## [0.4.0] — Unreleased

Vibe-code readiness, part 2: one API vocabulary, localised labels and tooling for AI agents (branch
`feat/vibe-ready`). Renamed props stay as deprecated aliases that keep working (the harness warns); no component API was
removed (four unused colour ramps were, see Removed).
- Zen Studio's smart guides while resizing (the last item of F2 of the parity plan): resizing a floating layer in a
  free frame snaps its moving edges to the frame's and its other layers' edges and centres, with Figma's red guides
  while dragging; ⌘ held turns snapping off; ⌥ (from the centre) and ⇧ (keep the ratio) snap too. Still one write and
  one ⌘Z per drag.
- Box `mask` (Figma's mask): the box's first layer is the mask and draws nothing; the layers after it show only
  inside its outline, turned and flipped as drawn. Zen Studio's Use as mask (⌃⌘M, the canvas menu, Quick actions)
  makes a Mask group of two or more floating layers, the bottom one the mask, and on a mask group removes it.
  Figma push / pull carry it as the group's bottom layer with isMask (Zen plugin updated).
- Zen Studio's Copy as PNG (⇧⌘C) and Copy as SVG, as Figma's (the rest of F3 of the parity plan): the selected layer
  or frame as a picture on the clipboard at 2x (or at its first export setting's scale), or as SVG markup; in the
  layer menu's Copy as list, the frame menu and Quick actions. ⇧⌘C no longer says "not in Zen Studio yet".
- Zen Studio's View and Find like Figma (F10 of the parity plan): zoom from 2 % to 25 600 % (zoom to fit still stops
  at 400 %), the pixel grid from 400 % (⌘'), Outlines (⌘Y), rulers (⇧R) with guides dragged onto a frame or the canvas
  (back onto the ruler deletes one), layout guides on a frame (right panel › Layout guide: Columns, Rows or Grid; margin
  and gutter from Breakpoint & Grids; ⌃G shows or hides them), a page's canvas Background (Zen background tokens), and
  Find and replace (⌘F: step through the matching text layers, Replace all in one edit). Guides, layout guides and the
  background are the page's (its header); the view options are this browser's.
- Figma push / pull, tested in the live Zen file: a free frame keeps its px width and height (it used to hug its layers);
  Pull reads vectors, groups and boolean groups again (it stopped on the first property a node type lacks), brings a
  mirrored shape back flipped at its own place, and keeps a group's size and px X / Y when it sits outside an auto
  layout. The Zen plugin places groups, boolean groups and vectors where the Studio draws them.
- Text keeps line breaks written in its words (`{"First line\nSecond line"}`): they show as lines, and with
  `wrap={false}` each line stays whole (Figma's Enter in a text).
- Image fills (Figma's Image paint) on Shape and on frames (Box, Stack, Grid): `image`, `imageFit` (fill · fit · crop ·
  tile), `imageCrop`, `imageScale`. In Zen Studio (F8a, pages you made) ⇧⌘K opens the file dialog and a click places the
  picture as a Rectangle with the image fill (its own size, fitted to the frame; a drag sets the width, the ratio kept);
  picture files dropped on a frame or pasted go in at once; Fill › Image picks, uploads, replaces or removes the picture
  and sets how it fills. Studio → Figma gives the layer an Image paint, and pulling brings it back. Crop on the canvas
  (F8b): with Image fit Crop the whole picture shows faint around the layer; drag it to move what shows, drag a corner
  to scale it (Esc or Enter ends the crop).
- Studio → Figma direct paste (⌘C on a frame, ⌘V on the Zen file's canvas, no plugin) brings pictures too (F8c): a
  Shape's or frame's image fill lands as Figma's Image paint (Fill, Fit, Crop, Tile), PNG, JPEG and GIF as they are, a
  WebP as PNG; an Avatar's photo and a table's Avatar or Photo cell show their picture. A Shape rectangle or ellipse now
  lands as Figma's own layer; other Shape kinds are named in the paste's notes (Import from Studio places them).
- The direct paste places every Studio Shape as Figma's own layer: lines and arrows, polygons, stars, Pen paths (curves
  and even-odd holes as drawn) and boolean groups (Union, Subtract, Intersect, Exclude) with their shapes.
- A Studio arrow lands in Figma with one head, at its end, as Figma's own arrow (⇧L) draws it (it had a head at both
  ends); pulling Figma's arrows brings them back as Shape arrows.
- The direct paste places a page's own components (`<Component>`, `<ComponentSet>`) as Figma components with their
  variants and text / boolean properties, the layers bound to them. Figma links a pasted instance only to a component
  already in the file, so a `<Use>` lands as a frame showing its variant with its values (Import from Studio places
  linked instances; the paste says so in a note).
- `TextRun`: words of a Text or Heading with a style of their own (bold, italic, underline, strikethrough, a tone,
  another text style), Figma's mixed styles (`<Text>Renews on <TextRun bold>Nov 2</TextRun></Text>`). In Zen Studio
  (F6b) ⌘B / ⌘I / ⌘U / ⇧⌘X style the selected words of a text being edited and write TextRuns; the text stays one layer
  named by all its words. Studio → Figma (plugin import and ⌘C → ⌘V) gives the words their styles, and pulling from
  Figma writes a styled range back as a TextRun.
- Zen Studio's Text tool as Figma's (F6a of the parity plan, pages you made): T and a click makes an Auto width text at
  the click, T and a drag a text box of that width, and the typing goes into it at once; Enter is a new line, Esc leaves;
  a new text left untouched, or any text layer emptied, is deleted; T on the words of a text puts the caret there.
  Typography › Resizing has Figma's Auto width · Auto height · Fixed size.
- Boolean groups, Flatten and Outline stroke (F9b of the same plan): Shape `type="boolean"` (`operation` union /
  subtract / intersect / exclude, its shapes as children, its result `d`); Zen Studio ⌥⇧U / ⌥⇧S / ⌥⇧I / ⌥⇧E make a
  live boolean group of the selected shapes (its result follows every edit of its shapes in the same ⌘Z), ⌘E flattens
  shapes into one vector, ⌥⌘O turns a stroke into a filled vector; Layers names groups by operation. Computed with
  Skia's PathOps (`pathkit-wasm`, loaded on first use). Figma push / pull carry BOOLEAN_OPERATION nodes.
- Groups, flips and rotation as in Figma (F2 / F3 of the same plan): Box `group` (Figma's Group: holds its layers at
  their X / Y, sized to them, no look of its own; harness `box/group-no-look`); Zen Studio ⌘G groups the selection
  (floating layers where they are, layers in auto layout as one group in the flow) and keeps it hugging its layers as
  they move or resize (same ⌘Z), Layers names it "Group N", ⇧⌘G /
  Ungroup puts them back; Figma push / pull carry groups as GROUP nodes. ⇧H / ⇧V flip the selection (several floating
  layers also swap places across their box); a rotate handle just outside each corner turns a frame or shape (⇧ 15°).
  Shape gains `flip`.
- Shape `type="vector"` (F9a of the same plan): a vector's path `d` (absolute M / L / C / Q / Z) in its `viewBox`,
  stretched to the shape's size as Figma scales a vector, `fillRule`; stroked and unfilled by default, its stroke
  centred. Harness `shape/vector-path`. Zen Studio: the Pen (P: clicks for corners, drags for curves, ⇧ 45°, ⌥ breaks
  handles, a click on the first point closes, Enter ends) and the Pencil (⇧P, smoothed into curves) draw vectors into a
  frame; Enter or a double-click on a vector edits its points and handles (Delete removes a point). Layers names them
  "Vector N". Figma push / pull carry them as VECTOR nodes with their vectorPaths (Zen plugin updated).
- Studio → Figma: a free frame (a Box of a px size whose layers float at their X / Y, or an empty frame from the Frame
  tool) is Figma's frame without auto layout, and comes back from Figma as the same Box with its layers where they were.
- Zen Studio frames, presets and sections like Figma (F4 of the parity plan): with the Frame tool (F / A) the right
  panel lists Figma's frame presets (Phone, Tablet, Desktop, Presentation, Watch, Paper, Social media; Zen's devices
  first) and a preset makes an empty frame of that size beside the frames; a click on the canvas makes a 100 × 100 frame
  at once (no menu). A selected frame of a page you made resizes by its handles (⇧ ratio, ⌥ from the center, snapping)
  and by the right panel's X / Y / W / H, written in the page. Sections ⇧S (`<Section>` on the Board: a named area; the
  frames inside it move with it, Delete takes them, ⌘⌫ keeps them, right-click › Wrap in new section, rename by
  double-clicking its name), N / ⇧N zoom to the next / previous frame, and the Pages list keeps the order you drag pages
  into, with dividers (Add divider).
- Zen Studio with Sections (F3 with F4): Layers lists the frames of a Section under its row (icon, one level in), as
  Figma does; Delete with several frames selected deletes them all in one edit, and Wrap in new section wraps them all.
- Zen Studio structure and clipboard as in Figma (F3 of the same plan): Delete leaves nothing selected (⌘Z selects the
  layer again); Copy / Paste properties carry fill, stroke, effects, radius, opacity and text style only, never X / Y /
  W / H; ⌘V with nothing (or a frame) selected pastes into the frame in view at the layer's place; Paste here (layer
  and frame menus) pastes at the pointer; ⌘D on a moved copy repeats its offset. Frame selection on floating layers
  frames them where they are (it collapsed them into an empty Box before); ⇧⌘G / Remove frame puts a frame's layers in
  its place, each kept where it was. ⌥⌘K on several layers makes one component of them, Create multiple components
  (menu, Actions) one each. Copy as › code / CSS in the layer menu.
- Zen Studio, several layers as in Figma (F2a of the same plan): one box around a multi-selection; floating layers
  (a frame without auto layout) move together by the px when dragged (snapping to their frame and its other layers, ⌘
  no snapping, ⇧ one axis) and nudge together with the arrows; ⌥A ⌥D ⌥W ⌥S ⌥H ⌥V align several layers to the box
  around them; ⌃⌥H / ⌃⌥V distribute spacing, ⌃⌥T tidies up; the multi-selection panel has Figma's alignment row. One
  edit, one ⌘Z each. Resizing: ⌥ grows from the centre, ⇧ on an edge keeps the ratio (it snapped to 8 px before), and a
  Shape's dragged edge moves its X / Y as a frame's does. Moving snaps to equal spacing with pink marks and their px.
  Several frames: ⌘A with no layer selected selects every frame, a marquee from the empty canvas selects the frames it
  touches, ⇧-click on a frame's name or row adds or takes it out.
- Zen Studio Layers like Figma (F1 of the same plan): on a page you made the front-most layer is on top, layers are
  named as Figma names them (Frame 1, Rectangle 2, a text by its words, an instance by its component) with Figma's
  icons, and the Screen is the frame's own row. Rename by double-click, ⌘R (Tab goes to the next name), ⌘R on several
  layers (Rename layers: $&, $n / $N, Match), or a frame's name on the canvas; names are `data-name` in the page, kept
  in exported code and in Figma push / pull (frames, shapes, text). Lock with ⇧⌘L, the row's padlock or the menu
  (`data-locked`, never exported): the canvas skips locked layers (click, hover, marquee, ⌘-click, handles, arrows).
  Right-click a row for the canvas menu, ⌥-click a chevron for everything inside, ⌥L (Actions › Collapse layers).
- Stack and Grid take Box's look, so a Figma auto layout frame with a fill is one element (2026-10-19, plan decision 2):
  `surface`, `border`, `radius` and the per-corner radii, `effectStyle`. Box, Stack and Grid also take Figma's
  `opacity` (percent), `rotation`, `flip`, and stroke `borderWeight`, `borderSides` (one side) and `borderStyle="dashed"`
  (Subtle only). Harness: the Box look rules cover Stack and Grid; new `layout/opacity-percent` and
  `box/dashed-is-subtle`. Figma push / pull and the Zen plugin's import carry every one.
- Zen Studio right panel in Figma's order (F5a): an instance's properties under its header, then Position (with
  Rotate 90°, Flip horizontal, Flip vertical), Layout, Appearance (opacity, corner radius), Fill, Stroke (weight, sides,
  dash), Effects on every frame. Add auto layout (⇧A) on a filled frame makes one Stack that keeps the fill.
- Zen Studio typed values (F5b, decision 1): a number typed into a gap, padding or corner field snaps to the nearest
  variable, which the field shows as Figma's variable pill; W / H take Figma's arithmetic ("120+24", "*2") and a
  Constrain proportions lock; in a frame without auto layout an offset has Detach variable (px) and Apply variable; a
  hex typed into a colour list offers the nearest colour variables and Create variable… (Local variables).
- Zen Studio right panel, the rest of F5 (F5c): Export on every layer and frame (scale × format: PNG, JPG, SVG; files
  named as Figma names them), a text's colour as its Fill and its text style's details read-only, several frames'
  Appearance / Fill / Stroke / Effects at once, Selection colors, and Local styles (text, color, effect) with nothing
  selected.
- Zen Studio component sets and properties as in Figma (F7a): Combine as variants (right-click or ⌘K) wraps main
  components in a `<ComponentSet>` (Property 1 = Default, Variant2…), Add variant copies the last one; a set or a lone
  main defines text, boolean, instance swap and slot properties with defaults, and a layer of a main binds to one
  (Apply component property, or Create … property… in one step); an instance switches its variant and property values
  in the panel (Reset all changes). Description and link on mains and sets. React export writes one function per set
  with typed props; Figma push makes a COMPONENT_SET with its properties and bound layers (Zen plugin), and pull reads
  them back.
- Studio E2E: a retried row starts from the drafts and pages the row found (the runner puts them back), and a row that
  fails twice reports its first error; the Studio's right panel keeps every field on its grid (shared Inline-Field), with
  an E2E fit check.
- Zen Studio's React export turns an instance override that no component property carries into a prop of the
  component's function (the user's choice, 2026-10-20). The prop defaults to the main's own value, and the instance
  passes its value: `<Card text="Hello" showIcon={false} chipSize="Large" />`. The prop can be a text's words, a
  layer's visibility, one of its props, or a nested instance's variant or value. An override deeper than the main's
  own layers stays a comment in the tag.
- Zen Studio instance overrides as in Figma (F7b): ⌘-click into an instance of a page's own component and change a
  layer's words, visibility, a nested instance's variant and properties or a nested component's properties for that
  instance only (`<Use overrides>`); Reset changes / Reset all changes; Push changes to main component; an instance's
  slot content (`<Use slots>`); Assets › Local components shows a set as one tile with its description. The React export
  passes bound overrides and slots as props; the Figma push carries overrides and slot content (Zen plugin).
- Zen Studio's Figma pull brings an instance's overrides and slot content back: a layer's words, visibility and
  colour, a nested instance switched to another variant or given other values, and what it puts in its main's slots
  (`<Use overrides>`, `<Use slots>`). A page with its own components now imports `Component`, `ComponentSet` and
  `Use` from `@zen-ds/react/builder` when the Studio prints it; before, a pulled page with them failed the dialect check.
- Zen Studio's Figma push and pull carry an override inside a nested instance of a page's own component (the text in
  a Chip inside a Toolbar: `overrides={{ "Chip/Text": { children: "Done" } }}`), in the variant that instance shows. A
  layer inside a nested instance switched to another variant now opens in that variant in the panel.
- Zen Studio's Figma push and pull carry an instance's overrides of a Zen component in its main: its props and label
  (`overrides={{ Button: { level: "secondary", children: "Buy" } }}`) and its own nested layers by their names
  (`"Pagination/Next": { level: "secondary" }`). An override path may go inside a Zen component that has content of
  its own (`Card/Sub-Action`). A prop with no Figma property is noted instead of dropped silently.
- EmptyState `size="sm"` draws a 200 illustration with a 36 icon (Popular/XLarge), up from 120 / 24 (2026-10-18, user:
  "120 thì bé quá … 200"), as Figma Empty-State Size=Small; the circles and the icon sit on Figma's centre (149, 130) and
  the icon takes Content/Placeholder. Studio's Properties panel and Figma push/pull carry Empty-State's Size.
- BottomNavigation `floating` and `floating-glass` (phone and tablet, user 2026-10-18: "min 64 max 88"): every tab,
  the selected one too, is 64–88 wide. The capsule fills the bar while its tabs fit at 88 or less, then hugs them at 88.
- Zen Studio, Figma's frame workflow (user 2026-10-18):
  - A click with the Frame tool asks for a Screen (iPhone, iPad portrait or landscape, iPhone Duo, Desktop: an empty
    Screen of that size) or a plain Frame (100 × 100).
  - Screen › Size switches between the same presets in one edit.
  - New page starts as an empty page.
  - Present and Play simulate the device a Screen is drawn for: Viewport › Device takes the Screen's type, layout and
    system bars, with Rotate, Fold / Unfold on the Duo and a Device frame toggle.
- Zen Studio speaks Figma (F0 of docs/research/studio-figma-design-parity-2026-10-18.md): ⌘K opens Actions, ⌘F finds
  a layer, ⇧⌘K is Place image/video, Enter selects all children, P is no longer Play (Present is ⌥⌘↵ and the Present
  button), and Figma keys Studio lacks (⌘R, ⌘G, ⇧⌘L, ⌘E, ⌘Y, ⇧⌘C, K, S, P, C, I, N…) say "isn't in Zen Studio yet"
  instead of reloading or browsing the tab; on a page you made Interact is in ⌘K › Interact (I is Pick color). Menus, tooltips ("Name ⇧A"), the Inspector (Layers, Alignment, Typography,
  Reset all changes, Layer size), the status line ("Gap → 2XLarge", "Unsaved", "Deleted") and Layers use Figma's words
  and US spelling; Show/Hide UI comes back on reload. A lint in `words.selftest` fails on retired terms and code words.
- Zen Studio: inside a project, Local variables shows only that project's mode of Base Colors (Project) — no Zen
  column and no other project; Drafts shows Zen. The collection's rows are fixed there: Project settings changes them.
- Dark ramps lifted (2026-10-18, the Zen plugin's "Dark lift", user: "chốt +0,020"): in all 20 Global Colors ramps,
  Dark Accent steps 2–8 and Dark Neutral steps 2–7 sit +0.020 OKLCH L above the contrast ramp, and Dark alpha follows
  (278 Dark values; step 1, brand step 9, steps 10–12 and every Light value unchanged). Dark surfaces, subtle fills
  and borders read a little lighter. Zen-High-Contrast is recomputed from them. Studio's ramp copy
  (tools/studio/zen-ramp.generated.mjs) follows the plugin, so a project's custom ramps get the lift too.
- Popover: an item with only a leading icon (no label) centres the icon; the first-line alignment is for labelled items
  only (2026-10-20, user: "icon trong popover bị lệch tâm", Studio's Recent / Related icon tiles).
- Zen Studio Appearance as Figma's (2026-10-20, user: "Appearance 2 ô nhập lại nằm 2 hàng khác nhau, figma đang để cùng 1
  hàng"): Opacity and Corner radius on one row, two equal fields with their labels above, the corners glyph inside the
  radius field and Independent corners beside it; the four corners show two by two (frames, rectangles, images).
- Zen Studio Properties: a ProgressBar has Figma's Progress select (None 0, Low 20, Medium 40, Good 80, Done 100; another
  number shows as itself) above its Value slider (2026-10-19, user: "thêm ô chọn Progress cho ProgressBar"). Number
  props with a known range get their slider in Figma-grouped Properties too (Rating, Slider, ProgressCircle).
- ProgressCircle's ring has no fill (2026-10-19, user: "Nền nó đang là trong suốt, trên studio là nền xám"): Figma's
  Progress-Circle/Icon Base is the 2px Support/Subtle ring only, so the grey Neutral/Subtle disc inside is gone.
- BottomNavigation follows Figma (2026-10-19, user: "Update bottom navigation từ Figma lên Studio"): a Floating bar's
  action is Primary by default (Figma's Floating Action Theme=Primary; Floating-Glass keeps its Glass action). Studio:
  the Figma CTA boolean is the action (on by default), the bars draw at Figma's 390 in the Main component with four
  tabs, the selected one solid; Figma booleans that write an object (actions, saved colours) now draw in the Main
  component too.
- Zen Studio Main component draws every component (2026-10-19, user: "làm tiếp phần còn thiếu của main component"):
  Dialog, Modal Form, Side Panel, Bottom Sheet and the date sheet open in a screen of their own per variant; Popover,
  Toast, the calendar, the chat parts, Uploader rows, Control-Bar items, Badge-Counter, Toggle-Button, Heading field,
  Skeleton shapes and the Opinion scale from Main component samples; List-Item Default/Selected, the conversation's call
  rows, one cell for sets without an axis; Dashboard header rows at Figma's 1232 width, stacked. E2E BL-02 fails a
  component with Figma sets that is not drawn (1202 variants on 42 pages).
- Overlays: an internal OverlayPreviewContext lets a static preview (Studio's Main component) draw an open Dialog, Modal
  Form, Side Panel or Bottom Sheet without the modal behaviour (focus, Tab trap, Escape, scroll lock); apps are unchanged.
- Counts are BadgeCounters (2026-10-19, user: "Luôn ghi vào harness và rule là các badge dùng số đếm luôn dùng badge
  counter"): harness `badge/count-uses-counter` is an error and `badge/count-text-uses-counter` (a count shown as text
  beside a label) is new; component-usage-rules §18; the Figma audit flags a Badge holding a number. Studio's folder,
  Assets, Variables and Code properties counts are BadgeCounters now.
- Zen Studio Inspector: Code properties of a frame, text or shape line up with the other sections (12 in, rows 8 apart);
  user 2026-10-19 "Bug UI của studio".
- Segmented follows the live Figma (2026-10-18, user: "Update tokens Component Size của segmented … từ Figma lên Studio"):
  Medium segments pad 8 in Compact (was 10; Comfortable stays 10) and Small ones 8 in Comfortable (was 6; Compact stays
  6). `level="primary"` now sits on the same Neutral/Subtle track as Secondary, without the 2px ring, as Figma's Primary
  track does; its selected segment stays Inverse/Solid.
- Zen Studio component pages (2026-10-18, user: "Sắp xếp layout của các trang component trên canvas lại cho gọn gàng và
  chuyên nghiệp hơn"): the board stacks Title → **Component** (Playground beside the Main component) → **Examples** →
  **Docs** (Docs, Guidelines and one Props frame per component in 880 columns), one left edge and width, 128 apart; the
  Docs column no longer runs 8–27 000px tall. A section tab without a count pads both ends alike. E2E group `board`
  (BL-01 layout, BL-02 Main component cells) checks every component page.
- Zen Studio Main component (2026-10-18, user: "Update lại Progress component từ Figma lên Studio", "Kiểm tra lại hết các
  main component"): Progress-Bar draws its Progress steps (None 0 · Low 20 · Medium 40 · Good 80 · Done 100, Figma's
  fills), ProgressCircle its Progress-Circle/Icon grid (Theme × Done) and a Theme property; Rating its stars, Skeleton
  text its line counts. A variant that fills its container (Divider, NPS scale, a Dashboard header row) takes its Figma
  width instead of an empty cell. Assets gains "Progress circle".
- Zen Studio: **Zen Agent V1a** (2026-10-18, plan §9): pick the model (Opus 5.5 · Sonnet 5.5 · Haiku 5.5) in the panel;
  "Undo turn" takes back all of the agent's last turn; the agent asks with 2–4 answers when a request is ambiguous or
  breaks a Zen rule; paste or attach reference pictures; the reply shows text, steps (what each change did) and the
  harness in order. The layers any AI client changes now flash on the canvas (Claude Code included).
- Zen Studio: **Zen Agent** (2026-10-18, V0 of `docs/research/studio-vibe-agent-2026-10-18.md`): a chat panel beside
  Pages | Layers (⌘J, or the stars button in the bottom toolbar) that designs on the open page live, through the Studio
  MCP's tools in the tab (one ⌘Z step per change, the AI chip's Stop), reads the zen-ds rules, and runs the Zen usage
  harness after each turn that changed the page, fixing what it caused. Needs `ANTHROPIC_API_KEY` or `ant auth login` on
  the dev server; Claude Opus 5.5 by default; each turn shows its cost. Checks: `agent.selftest`, Studio E2E AG-01…06.
- Card `theme="subtle"` (2026-10-17, Figma Card Theme=Subtle, user: "nếu nền canvas là default thì Card không dùng
  pale mà dùng subtle"): Support/<Color>/Subtle in the nine hues, the colour box on the grey Canvas/Default where a
  Pale tint fades; Pale stays for white pages and imagery. New harness rule `card/pale-on-canvas-default` (error: a
  Pale Card, MetricCard or ChartCard right on an AppShell, PlatformPhone or ZenProvider whose canvas is Default), the
  Figma audit's `theme/box-on-canvas` asks for Subtle there, and Studio pushes and pulls the new theme.
- Zen Studio drag and drop as in Figma (2026-10-17, user: "test hết mọi case kéo thả, kéo component vào mà không có
  box(frame) hoặc stack. Kéo top navigation vào rồi đặt lên top…", "kéo thả có smart guide"): a component dropped on a
  Screen with no Stack lands in it (the drop did nothing), and on a new page's Screen it goes into the page body; a Top or
  Bottom Navigation dropped or clicked onto a phone Screen becomes its top or bottom bar (replacing the one there); a
  layer drags from one Screen to another; a drop into a Frame without auto layout lands where it is dropped, snapped with
  red smart guides (⌘ drops without snapping); outside every frame the drag says "Drop it into a frame"; a drop against
  the host's rules says "Not recommended" as a click does; an App shell goes only on an empty Screen (the drag says so);
  a Layers row dropped on a Screen's row goes into that Screen. A click and the MCP now refuse what a drag refuses:
  children in a component that has none (Top Navigation, Shape, charts), a block in text, an App shell inside a layer or
  beside content, a Top / Bottom Navigation in a Screen's content. Checked by `npm run studio:dnd` (19,286 engine cases)
  and the opt-in E2E group `dnd` (real drags of every Assets item, `npm run studio:e2e -- --only=dnd`).
- Zen Studio Variables (2026-10-17, user: "Cách sắp xếp nên theo nhóm chứ?", "Các chip chứa variable padding hơi kì"):
  the table lists group by group as the groups tree reads, one header per group (a file that interleaves Brand/1,
  Brand-Alpha/1, Brand/2 showed "Light / Brand" twice); an alias chip's swatch sits as far from its top, bottom and left
  (4px), whatever the density.
- Zen Studio Add / Remove auto layout (2026-10-17, user: "test luôn phần add auto layout và detach auto layout"):
  an Action bar keeps its own `position` (static / sticky / fixed) when its Frame takes auto layout (it was removed as if
  it were an X / Y); a painted Frame with nothing in it now gets its auto layout (a Stack inside, it stayed a plain
  Box); the alignment read from the layers is the line they share best (start, centre or end), whatever their order in
  the code; Remove auto layout works on a Stack holding an Icon, Flag or File icon (it said "holds a list or code"), and a
  layer the auto layout stretched keeps its size once it floats (it shrank and moved). Checked by `npm run studio:dnd`
  (12,564 more cases) and the `dnd` E2E rows DND-07 / DND-08.
- Zen Studio speaks Figma (2026-10-17, user: "Còn dùng ngôn ngữ dev nhiều quá", "Convert được Box(Frame) to Stack(auto
  layout)"): a Frame's Inspector has Figma's Auto layout "+" (⇧A adds auto layout to the Frame in place, ⌥⇧A or "−"
  removes it), the canvas menu and Quick actions say Add auto layout / Remove auto layout / Frame selection; a layer reads
  Frame, Auto layout, Text, Instance or Shape; property selects offer only the values Figma's component has, and spacing
  and radius steps read Figma's names (Medium, XLarge, Base, Margin-Comfortable). Props Figma has no property for (HTML
  element, Scroll, Html for…) wait in a closed "Code properties" section.
- Padding takes the page margins (2026-10-17, user: "User vẫn chưa chọn được margin token cho padding khi thiết kế"):
  `padding` / `paddingX` / `paddingY` (and Form `inset`, layout insets) accept `margin-comfortable` (24, 20 on a phone) and
  `margin-compact` (20, 16 on a phone), Figma's Breakpoint & Grids margins, which follow the breakpoint (`ZenMargin`).
  Zen Studio lists them after the padding ladder under their Figma names (↑/↓ and the canvas snaps keep the ladder); the
  Figma push binds a frame's padding to Margin-Comfortable / Margin-Compact and the pull reads them back (the live
  Overviews body now comes back as `padding="margin-comfortable"`, as designed).
- Zen Studio: a phone Screen's Top and Bottom Navigation stay at its top and foot on the canvas (2026-10-17, user: "Khi
  tạo trang mới thì lỗi bottom nhảy lên trên"). They were sticky to the Studio window, so in a window shorter than the
  Screen the bottom bar climbed up to the Screen's top; Play, Present and the exported page keep them sticky.
- A phone's built-in search is Rounded by default (2026-10-17, user: "mặc định nhưng cho sửa"): a Search in a
  TopNavigation control bar or a BottomSheet (so also the Input family's phone sheet) takes `shape="rounded"` unless it
  sets its own `shape`; elsewhere Search keeps the default shape. Zen Studio pushes a control-bar Search as
  Shape=Rounded and pulls it back without the prop.
- AppShell collapses a customised Sidebar (2026-10-18, user: "lỗi sidebar lúc expand và collapse khi dùng template"):
  the Sidebar now tells the shell what it is wherever it sits, so one wrapped in an app component, a Stack or a Studio
  component gets the top-bar toggle, starts from its own `collapsed`, and a Sidebar with its own `onCollapsedChange`
  keeps one control that `useAppShell().toggleSidebar()` also drives. The HR templates' footer Apps is a
  `SidebarMenuItem`, so the rail (and Studio's copy of a template) shows its icon alone.
- Card spacing by count is a phone rule (2026-10-17, user: "rule đó chỉ áp dụng cho mobile"): `card/spacing-by-count`
  now judges cards inside a PlatformPhone frame or a BottomSheet only; desktop cards keep Medium whatever their number,
  so the desktop rows #110 had set to Small (Card quarter widgets, Dock Icon project types, Text milestones) are Medium
  again. MetricCard counts too and takes `spacing` (user: "MetricCard có nhận prop spacing không? Có"): Medium by
  default, Small for `type="tile"`; Studio reads and writes the Metric-Card's Card Spacing. The phone "Metric types"
  example stacks its three cards at Small.
- Zen Studio toward native Figma (2026-10-17, user: "Đưa về sát native với Figma nhất … vì chúng ta cần convert
  người dùng từ Figma"). Research and plan: `docs/research/studio-figma-native-parity-2026-10-17.md` (five audits,
  ~80 Figma behaviours graded). First phase:
  - New `Shape` primitive (src/components/Shape), the code of a drawn object as Box is a frame's — never a component in
    Studio: no component icon or colour, Swap / Detach instance or Assets entry; a component is made only by the person
    (⌥⌘K). Figma's Rectangle, Ellipse with its arc (`arcStart` °, `arcSweep` %,
    `arcRatio` %), Line, Arrow, Polygon and Star; `fill` from Color/Background and `stroke` from Color/Border (token
    paths only), `strokeWeight`, `strokeAlign`, `radius`, `pointCount`, `starRatio`, `rotation`, `opacity`. Harness:
    `shape/token-paint`, `shape/px-offset-in-auto-layout`, `shape/line-no-height`.
  - Layout position insets take px (`insetLeft={40}`): Figma's X / Y for a layer in a free frame (a Box or a Screen
    without auto layout). Gap, padding and radius stay tokens.
  - Studio draws as Figma does: Rectangle R, Ellipse O, Line L, Arrow ⇧L, Polygon and Star (toolbar shape menu), A = Frame;
    a click places 100 × 100, a drag draws with ⇧ (equal sides, 45° lines), ⌥ (from the centre), Space (moves it),
    smart guides and a live size; the layer goes into the frame under the pointer (free frame: at X / Y; auto layout:
    into the flow). Frame (F) inside a Screen draws a nested frame. An empty Screen now takes layers.
  - Ellipse arc handles on the canvas (Sweep, Start, Ratio, with live values); Inspector shape panel (Arc, Count,
    Opacity, Fill, Stroke with token swatches, X / Y in px, Rotation); number fields scrub, step ±1 / ⇧ ±10 and take
    math ("+8", "100/3"); a free frame's layers move by px with red smart guides and nudge 1 / ⇧ 10 px; ⇧ on a corner
    keeps the ratio; Layers name shapes Ellipse / Line… with Figma's icons.
  - Figma export and import: shapes become RECTANGLE / ELLIPSE (arcData) / LINE (arrow cap) / POLYGON / STAR with
    colour and corner variables, and come back as `<Shape>` (the Zen plugin's Import from Studio draws them).
  - Zen Studio menu holds Switch to Studio / Document; the floating Document | Studio Segmented is gone (user).
  - Variables like Figma (user: Studio may write token values): Page panel › Local variables (and Quick actions) opens
    Figma's Local variables window on the 11 token collections — groups, a column per mode, search, type filter; a value
    cell edits a colour (picker + opacity), number or text, or aliases another variable (Variables tab; Detach alias);
    rows rename (`/` makes groups), duplicate and delete (refused while code or another variable reads it, naming them);
    Create variable. Each change is a draft of `tokens/source/figma/*.json` with ⌘Z; while drafted the dev server serves
    tokens.css built from the drafts, so the canvas changes at once; ⌘S writes it and runs tokens:build + tokens:check;
    Global Colors' Zen-High-Contrast follows the Zen values by the high-contrast algorithm. Copy for Figma hands the saved
    changes to the Zen plugin (Import from Studio writes the local variables). `scripts/token-outputs.mjs` is the token
    build as a pure function (the build's output is unchanged).
  - Components like Figma on a page you made: ⌥⌘K makes the selected layer a main component where it is
    (`<Component id name>`), ⌘D / ⌥-drag of a main and Assets › Local components add instances (`<Use of>`) that
    follow it, ⌥⌘B detaches one; the Inspector names the component (rename, Create instance, Select instances, Swap,
    Go to main); violet outline and ◇ in Layers; Export writes one React function per component; Figma push makes a
    COMPONENT and its INSTANCEs.
- Zen Studio projects (2026-10-17, user: "tạo dự án như Figma … set theme cho Dự án"): the Studio home is a projects
  grid (Drafts + projects); New project and Project settings open a theme page — Primary and Neutral (a Zen ramp or any
  colour, ramps made by the Zen Figma plugin's own generator), status colours, chart sectors 3–7, corner radius,
  component theme, size, typography, emphasis — with a live gallery (Cards, Charts, Dashboard, Website, Components) in
  Light, Dark or both. A project's theme is one extra Base Colors (Project) mode, `data-brand="p-<id>"`, kept in
  `.zen-studio/projects/<id>/`; tokens/source and tokens.css do not change. Its pages (header `project`) draw in it.
- Chart sectors 3–7 read `--zen-chart-sector-tertiary … -septenary` (and `-subtle` for fades) before today's colours,
  so a Studio project can recolour them; without them nothing changes. The 7th sector is Support/Green/Soft again (it
  had gone back to Red Soft; the Figma style "Color Chart Sector/Septenary" is Green Soft).
- Search `shape` (2026-10-17, Figma Search/Default `Shape` = Default · Rounded): `shape="rounded"` is a pill
  (Corner-Radius/Rounded on the field, its focus ring and the filter affordance). Recommended, not required, for
  searches on phone screens; the platform's phone examples use it.
- Content follows its Solid fill (2026-10-17, user: "Inverse là nằm trên nền neutral solid, content phải dùng inverse
  tokens"):
  - A Solid Card's text reads the fill's own family: Content/Inverse on Neutral, Content/On-Colors (white) on Brand,
    Cyan and Orange, Content/On-Brights on Yellow, Content/On-Accent on Accent. Hue solids used to keep neutral text.
    White measures about 3:1 on Brand, Cyan, Orange and Accent; the user accepted that.
  - Card `color="accent"` is new (Background/Accent/Solid, Solid only). A Pale accent renders as Pale Neutral, and the
    harness `card/solid-color` flags it.
  - `MetricTrend content` (default · inverse · on-color) mirrors Figma's new Metric-Trend Content. Inside a Solid card
    it follows the card, so the Hero on Solid Neutral now shows an Inverse badge.
- MetricCard `type="tile"` (Figma Metric-Card Type=Tile, Metric-Tile 16104:4826) is a phone stat tile: the title,
  number and trend over the Dock-Icon, in a Small card.
  - Sizes: medium (two-up, Display/3) and small (three-up, Heading/3).
  - On a Solid card its Dock-Icon and trend turn Inverse (Neutral) or On-Color (Accent and the hues).
  - Zen Studio has it as the "Stat tile" widget, and pushes and pulls it as Figma's Metric-Card Tile.
- Figma: Metric-Tile Content is now Default · Inverse · On-Accent · On-Color · On-Bright. Inverse tiles use Inverse
  Dock-Icon and Badge chips. Metric-Trend got a Content axis and hugs its badge (it was fixed at 126 under a 131 badge).
  Audit `theme/on-solid-content` checks content against its Solid fill.
- Text on Zen brand solids follows the live Figma again (2026-10-17, user: "Đồng bộ On-Brand theo Figma"): Base
  Colors On-Brand-Default and On-Brand-Hover are white (were black 86% since 2026-10-13), so
  `--zen-color-content-on-accent-*` on Zen pink is white. White on Zen/9 `#F755C9` is 2.96:1 (black 86% was 6.22:1).
- Metric Title-Highlight follows the live Figma set (7523:507049, 2026-10-17). `hint` now also shows at Small/XSmall
  (12px, after the Caption label) and in Studio's Properties at every size. The XLarge–Medium title row no longer draws
  the Metric-Color dot, which Figma doesn't have there. Label-Icon sits 8px (Spacing/Gap/XSmall) from the title. The
  dot is 2XSmall except on Icon-Highlight XLarge/Large.
- Zen Figma skill, control gap (2026-10-17, user on Schedule/Day-Planner: "chữ và button sát quá"): a button sits at
  least `Spacing/Gap/XSmall` (8) from the heading, label or button beside it; `Gap/2XSmall` joins only one inline item.
  The audit adds `spacing/control-gap` (error).
- Zen Figma skill, card actions (2026-10-17, user on Schedule/Event-Card: "các dạng action này trong card nên dùng
  flat"): an icon action inside a card is `Button/Icon-Flat` (the ⋮ menu = Card Sub-Action: Small, Secondary) in a 20px
  Wrapper bound to `Element-Size/Popular/Base`. The audit adds `button/in-card-flat` (error) and
  `button/in-card-wrapper` (warning).
- Zen Figma skill, grids of rows (2026-10-17, user on Schedule/Resource-Grid: "Cẩn thận các lỗi này"): the audit adds
  `layout/row-drift` (side-by-side columns of equal rows that end a row at different heights). customize-without-detach
  §5 now says a row header column and its track rows share one row height, grid rules sit outside the layout
  (`strokesIncludedInLayout = false`), and a bar on a time scale keeps its real dates instead of being squeezed to the
  visible range.
- Zen Figma skill: every slip the user catches becomes a rule. Prompted on 2026-10-17 by "Dùng icon không đồng bộ",
  "từ đây về sau bổ sung nguyên tắc. Luôn làm đúng không lại sai" and "Bạn cần học cách tôi làm".
  - The audit adds `navigation/icon-style`: in a Bottom-Navigation the selected item is solid, the others line.
  - figma-gotchas gets a "Modes" section: emoji Dock-Icons, text growth and scroll after a Component Size or
    Typography change.
  - screen-rules §4 gets "Learned from the designer's own edits": section = one frame, overlays in padded wrappers,
    Medium cards, Toggle-Button power, Small steppers, a White-Overlay Segmented on colour, Solid shortcut rows.
- AppShellAction's unread count follows Figma Primitives/Notification-Dot Style=Number (2026-10-17, user: "Update lại
  luôn dot notification cho Studio từ Figma … cập nhật từ component Primitives/Notification-Dot"): a 16px badge
  (Badge/Size/XSmall, was 12) in Caption/Regular (was Label/Small/Medium) at Figma's (26, −2) on a Tertiary action and
  (10, −6) on a Flat one. Dot and Number are now one shared primitive (`_shared/notification-dot`, `value` = Number);
  Studio shows it through the code components.
- Harness `card/spacing-by-count` (warn, 2026-10-17, user: "nếu từ 3 card trở nên thì dùng card/box variant spacing
  Small. Còn mặc định là dùng Medium"): three or more cards side by side take `spacing="small"`, one or two keep Medium,
  the default; a card around a Voice frame (which pads itself) stays Small. It counts mapped literal arrays and
  components whose root is a Card. Platform examples follow it.
- Toggle and ToggleButton take `size="xl"` (`xlarge`, 2026-10-17, user: "thêm 1 bảng toggle size XLarge cao 48px …
  có thêm icon bên trong toggle dot"): a 48px switch (dot 44, `Toggle/Item/Size/XLarge`; Comfortable 52) with `icon`
  in its dot, Light while off and Strongest while on (new Component Theme tokens `Toggle/Dot/Content/Unselected` and
  `/Selected`, readable on the white and the Inverse dot in both modes). Figma Toggle-Button and Toggle have
  Size=XLarge (Icon + Icon-Src on Toggle-Button); Studio maps Icon/Icon-Src to `icon`. The harness's
  mobile/full-size-controls accepts xl on phones.
- Segmented Medium segments pad 10 at the sides (was 8, Spacing/Padding/XSmall), as the live Figma file's
  Component Size › `Segmented/Spacing/Medium/Horizontal-Padding` (2026-10-17, user: "Update token component size của
  segmented"); Compact and Comfortable alike, the repo-only Studio mode stays 6. The other 13 Segmented size tokens
  already matched Figma.
- The Zen colour ramp (Global Colors › Light/Dark Zen and Zen-Alpha 1–12) follows the live Figma file again
  (2026-10-17, user: "Update lại token màu của Zen trong global (chỉ dãy màu Zen)"): 45 of 48 values change, e.g.
  Zen/9 `#FF6BD5` → `#F755C9` in both themes (Brand/Accent and its focus ring), Light/Zen/10 `#F663CE` → `#DC39B2`
  (High-Contrast `#CB25A3`), Dark/Zen/10 `#FFA7E2` → `#FF7BD6`. No token was added, removed or renamed; the
  SwiftUI and Flutter token packages are regenerated.
- Chip and Segmented take two overlay levels (2026-10-17, user: "Bổ sung Chip, Segmented cho case overlay … đảm bảo
  work trên dark và light mode", then "2 option nền tối chữ sáng mặc định và nền sáng chữ sáng trên nền màu solid"):
  `black-overlay` (also `level="overlay"`, the default overlay: Background/Black-Overlay, light text) and
  `white-overlay` (on a solid colour: Background/White-Overlay, light text). Selected = White/Solid with dark text; the
  focus ring takes the label colour. Static tokens, so a Brand/Accent band looks the same in light and dark mode. Every
  Chip variant, ChipGroup too. Figma has the same `Level=Black-Overlay | White-Overlay` on Chip/Normal, Chip/Advanced,
  Chip/Number-Only, Segmented and Primitives/Segmented/Item; Studio push/pull maps them.
- Token `--zen-layout-mobile-section-gap` (Figma Component Size `Layout-Mobile/Section-Gap`): Compact 24 (Gap/Large),
  Comfortable 32 (Gap/XLarge). It is the gap between the sections of a phone screen, never less (2026-10-17, user:
  "spacing giữa các section trong mobile … comfortable luôn là 32px. Compact là 24px. tạo token").
  - Usage rules §13, the skill and the Figma audit (`spacing/section-gap`) require it.
  - The audit no longer reports scroll content as clipped: a Body or Chip row running past a frame set to scroll.
    The domain picks Component Size and Typography, so screens must hold up in either mode.
- Touch targets on phones and tablets (usage rules §13, 2026-10-17, user: "Đang làm cho mobile nên có rule về vùng chạm
  tối thiểu để làm spacing cho an toàn").
  - Every control keeps a 44 × 44 hit area. Between two neighbours the gap is at least what each lacks of 44 (two Small
    Chip rows or buttons → 12).
  - A control row (Chips, Segmented, Tabs, Search) sits `md` 16 above the content it controls.
  - The Figma audit checks both: `touch/target-spacing` (error) and `spacing/controls-to-content` (warning).
- Figma audit `button/*` rules and a QA checklist in the `zen-figma-design` skill (2026-10-17, user: "Luôn luôn kiểm
  tra để không bị sai rule dùng button role", "bổ sung skill dùng figma luôn check các rule khi dùng component … QA lại
  trước khi done"). The audit now checks the Figma side of the code harness's Button rules:
  - `button/one-primary`: two Primaries side by side, or more than one on a screen;
  - `button/secondary-justified`: Secondary only for a toggle that stays on;
  - `button/accent-is-promoted`;
  - `button/small-full-width`;
  - `button/overlay-on-imagery`;
  - `button/vague-label`.

  The skill now makes each component's guideline a hard rule (Button roles, Segmented for views, Chip for scope,
  Brand/Accent as the main colour). A screen is done only after the audit and the QA checklist pass.
- Tabs `size="lg"` (`large`), the desktop top-navigation tab (2026-10-17, user: "Thêm size tab large giữ nguyên font
  size tăng size lên 64"): 64px items (72 in Comfortable density) with Medium's label and icon, tokens
  `Tab-Item/Size|Spacing/Large/*` (Figma Tab-Item `Size=Large`, 24 variants). The hover/selected fill is 40px high and
  bleeds 16px past the label; a Large Indicator list draws no baseline of its own (the bar's Divider is it). Small and
  Medium are unchanged.
- Figma charts `Color = Primary | Secondary` (2026-10-17, user: "thêm variant để đổi lại dùng secondary trước, hover là
  primary"): Secondary draws the marks in Color Chart Sector/Secondary and the active bar (or second series) in Primary.
  Bar, Stack-Bar, Area, Grouped-Bar, Combo, Donut, Radial; Gauge, Funnel and Bullet became sets (same component keys).
  Existing instances stay Primary. Code and Studio follow after review.
- Figma audit `navigation/back-chevron` (2026-10-17, user: "chúng ta có chốt rule về button back. nhưng lúc này build
  trong figma lại sai … đảm bảo không bị lại lỗi này"): `skills/zen-figma-design` now fails a phone or tablet screen
  whose Back (Top-Navigation, Nav-Action, Button) is a left arrow; Back is `icon-chevron-left-line-medium`, the same
  rule as the code harness.
- Segmented `size="sm"` follows the live Figma (2026-10-17, user: "Update token của component size Segmented"):
  Segmented/Spacing/Small/Horizontal-Padding is 6 in Compact too (was 4), so each Small segment is 4px wider; Medium,
  Comfortable and the Studio mode are unchanged.
- Harness rule `content/on-white-solid` + Figma audit `theme/on-white-solid` (2026-10-17, user: "nền màu white solid thì
  chữ phải luôn là on white overlay"): text and icons on Background/White/Solid (white in light and dark) take
  Content/On-White-Overlay/*. Fixed what it found: the white-overlay Tooltip used Neutral/Strongest (white on white in
  dark mode), Button/Overlay, Icon-Overlay and Nav-Action `White` used the raw Black (Figma + `button.css`, contracts).
- Figma Top-Navigation/Mobile `Type=Transparent` (no fill, standard content, for Pale/Subtle colour bands) and
  `Type=Transparent-On-Color` (no fill, On-Black-Overlay content, for Solid bands and photos), both margins; the Capline of
  every overlay type now uses On-Black-Overlay/Base (it was dark). Code `TopNavigation` types follow later.
- Button / IconButton `appearance="overlay"` level `inverse-subtle` (2026-10-17, user: "Thêm 1 button inverse subtle
  cho các button Overlay"): Figma Button/Overlay and Button/Icon-Overlay get `Level=Inverse Subtle` (55 variants), a
  translucent Background/Inverse/Subtle fill with Content/Inverse/Strongest and the Overlay blur. Studio's Properties
  panel and Main component frame list it.
- RadialChart / DonutChart with the legend at the start or end (2026-10-17, chart audit): the ring box starts at the
  ring's size, so the legend sits Gap/Large beside the ring on one line instead of being squeezed and wrapped by a
  300px box (the SVG's default width), as in Figma.
- Studio → Figma direct paste (2026-10-17, user: "paste trực tiếp vào figma không qua plugin"): ⌘C on a frame of a
  page you made, ⌘V on the Zen file's canvas places real layers without the plugin, bound to the file's components,
  variables and styles (`tools/studio/figma-native.mjs`, Figma's own clipboard format; component skeletons in
  `docs/figma-contracts/native-pack.json`, rebuilt with `node tools/studio/native-pack.mjs`). The Expenses page pastes
  layer for layer like the plugin's import. Other files still paste through the Zen plugin.
  Stack-Bar columns round their corners and clip their segments in both the paste and the plugin's import (the bar is
  its own frame, Corner-Radius/Small; the slot's corners sat on the empty space above the bar, user: "cột vẫn vuông").
  Icons a page swaps (a table's Dock-Icon, a badge's or button's icon) keep their colour, size and layer name, and list
  titles are no longer white, and a layer the page appends to a card (Goal-Progress's hint) stays last (user: "Copy
  paste vẫn lỗi mà", "vẫn sai vị trí của các element trong slot"): the paste writes overrides as Figma's own copy does,
  checked with `node tools/studio/native-diff.mjs` against Figma's copy of the plugin's import.
- Studio → Figma checked on 438 pages (2026-10-18, user: "phần copy paste trực tiếp và import cần test kiểm tra nhiều
  hơn"): every example frame and template went through the push and the direct paste, and a 78-frame board was
  compared with Figma's copy of the plugin's import. Both paths now give the Screen frame its Canvas fill and its
  900 / 844 minimum height. PageHeader eyebrows, chat time stamps and plain texts get the code's text styles. A
  workspace Sidebar keeps its menu, the Hero MetricCard keeps its button words, and a Tile keeps its content when its
  Card changes theme. A frame of a set width keeps it in the plugin. The direct-paste definitions were recaptured,
  adding the Chip and Segmented Overlay levels and Toggle XLarge.
- AppShell goes to Figma as the Zen file's Master-Layout (2026-10-18, user: "app shell và master layout không khớp với
  nhau thành component master layout trong figma"): the plugin's import and the direct paste place one
  Patterns/Pages/Density-Medium (Level=Master) instance instead of frames. The Sidebar sits in its Sidebar pattern
  (Expand by the collapsed state). The top bar and sections go in Header/Dashboard's Sections, padded like the master's
  own rows. The page goes in Body's Content, the floating action in Floating-Item and the aside in Side-Panel. The page
  grows the master (982 is its minimum), and the Sidebar is as tall. A MetricCard writes its action and custom content
  only where Figma's set has them (Icon-Highlight has neither).
- Studio → Figma import matches the page (2026-10-17, user: "Bản import ở figma và bản studio còn chưa chính xác"): a
  Metric-Card draws the page's sparkline, spark bars, goal and footer instead of Figma's sample; a ProgressBar fills its
  exact value (the Figma Progress-Bar's fill is now a two-column grid; the step is the nearest look) and shows its
  `valueLabel`; a sidebar row shows its counter; the top bar's Search fills up to 400px; Pagination writes its range and
  page size; cards in a grid row stay as tall as the tallest (none clipped). Pagination Inline / Manually: the range
  fills the row and ends at the arrows, as in Figma. Charts: a Stack-Bar draws the page's columns, segments, Y axis,
  tooltip and legend (the Sector set by column count); a Donut draws its slices, percent pills, centre total and legend
  (Start, Bottom or End) at its size. Line, Bar, Area, Grouped and Combo still draw Figma's sample.
- EmptyState `size` (2026-10-16, user): `md` (default, 240 illustration) when the Empty State fills a page, `sm` (120,
  the same art at half scale, 1px / 2px lines kept, Popular/Medium icon) in a widget, card, table, list, tab panel,
  sidebar, panel, sheet or dialog; ChartCard makes it `sm` for you. `EmptyStateIllustration` takes `size` too. New
  harness rules `empty-state/keep-illustration` (warn on `illustration={false}`: use `size="sm"`) and
  `empty-state/small-in-box` (a Medium Empty State in a Card, ChartCard, MetricCard, ListBox, Sidebar, Popover, Dialog,
  Modal Form, Side Panel or Bottom Sheet). Every example, template and the Studio palette now keep the illustration.
  The harness's box finder no longer loses a closing `</Card>` after text or an apostrophe in a comment between props.
  Figma has no Size=Small yet (BACKLOG).
- Build-QA gate (2026-10-16, user: "thêm cả 4 kiểm tra luôn"): the platform audit also runs at 320px (a small phone;
  today's findings there are baselined, BACKLOG P1); two new audit kinds, `card-gap` (a MetricCard or ChartCard stretched
  by its row leaving an empty band at its foot) and `legend-column` (a chart legend stacked one item per line under its
  chart with room for a row); Studio E2E PT-11 plays an AppShell page and checks the Sidebar sticks while the page scrolls.

### Changed
- Studio → Figma: copy a frame straight into Figma (2026-10-16, user: "copy trực tiếp frame vào figma … tự bind lại
  component, style và variables"): ⌘C on a frame (or its Screen layer; menu Copy for Figma) also carries the frame's
  Figma export, which ⌘V in the Zen plugin places on the page you have open. Exports carry the library's keys
  (`docs/figma-contracts/library-keys.json`, `tools/studio/library-keys.mjs`), so the plugin binds sets, icons, text
  styles and variables in any file that uses the published Zen library, not only in the Zen file; what the library
  lacks becomes a placeholder, and the plugin's Re-bind to Zen binds it once the library has it. Push: a DockIcon,
  Avatar, Icon… in a stretching column hugs (was FILL, a 520px Dock-Icon), and a plain Stack around wrapping text fills
  its column (a centred tagline collapsed to 175px).
- Zen Studio Present (2026-10-16, user: "Mobile khi bấm present nên fix size", "tương tự ipad", "Giao diện không đồng bộ
  với studio"): a phone or tablet Screen opens at its device's size (Phone 390 × 844, Tablet), scaled down to fit, and
  the bar names it; a viewport picked in the bar wins. A large title folds as the screen scrolls (the scroll link
  follows the stage that scrolls, not the page around it). The Modes panel draws the Inspector's rows (Inline-Field,
  the mode's name inside). On a page you made, Delete removes the selected Screen or Overlay (also from its name on the
  canvas or its row in Layers), one ⌘Z brings it back (E2E B-44).
- DashboardHeader control-bar result count (2026-10-16, user: "hơi bự, nên đưa về body"): "86 expenses" is Body/Base/Regular
  (was Heading/Subheading), in code and in Figma Primitives/Dashboard/Header Type=Control-Bar (its description says so);
  harness `dashboard-header/count-body` (error) flags a Heading or a heading/display text style passed as the count.
- DonutChart and RadialChart take a named `size` (2026-10-16, user: "Có nên cho chọn các cỡ pie chart không?", "thêm
  XLarge 320px"): `small` 120 · `medium` 168 (the new default, was 200) · `large` 240 · `xlarge` 320, in either spelling;
  a number still sets px, and the harness warns (`chart/ring-size-named`). Small shows the centre figure alone
  (Body/Base/Bold), XLarge in Heading/3, and a Small Radial draws 6px rings 4px apart so four still fit. Figma:
  Chart/Donut-Chart (12 variants) and Chart/Radial-Chart (8) have a Size variant drawn like code (4px slice gaps, fixed
  ring widths); Studio's push / pull maps it.
- ListBox footer actions (2026-10-16, user): a footer action ("Open calendar", "Go to Inbox") is a Tertiary Button,
  never plain text or a Link: harness `listbox/footer-action-tertiary` (error; AI UI specs and `check_usage` too), the
  Figma audit `list-box/footer-text-action`. A Button in the footer fills the box on desktop and tablet and hugs its
  label on mobile; the Figma List-Box's default footer is a Button/Main Tertiary (Fill) instead of a "Footer" text. A
  `<Stack align="start">` around the Button (it hugged on every device) is flagged by the same rule, and the Figma audit
  `list-box/footer-action-hug` flags a footer Button set to Hug on a screen wider than 600px; the ListItem, Image and
  Skeleton examples' footers (Invite people, Show all files, Upload photo, Show older activity) now fill on desktop.
- Line and stack charts keep their X labels right under the baseline when they grow (2026-10-16, user: "ghim nhãn dưới
  baseline cả code và figma"): their lanes are a seventh of the chart's own height, at most 40px, so a stretched card
  or a larger `height` gives the plot all the extra. A Donut or Radial beside its legend now grows with a stretched card
  too (user: "Chart nên scale ra"), up to the width its legend leaves it; once the width stops it, the chart sits at the
  card's foot so a row's charts end together. Figma: the X labels of the Trend set
  (Line, Multi-Line, Chart-Card) and Stack-Bar-Chart are top-aligned at today's offset.
- AppShell on phones (2026-10-16, user: "làm tiếp P3 + P4"): new props `topNavigation` and `bottomNavigation`; under
  744px the shell draws them instead of its top bar and `sections` (the Sidebar still opens as the drawer through
  `useAppShell().openNav()`); `layout` takes `"phone"`, the context's layout too. Example AppShell › Desktop and phone.
  Harness `app-shell/page-header-in-sections` (a PageHeader in the content beside a phone bar: two h1s) and
  `app-shell/top-navigation-title` (the bar and the page header say the same words).
- Zen Studio draws a Screen's phone header from its desktop AppShell (component-usage-rules §17): the PageHeader title
  as the large title (or Back and the bar title on a child screen), the account in leading, Search, the Primary as +,
  notifications, then More (three places); the Sidebar's rows as the Bottom Navigation (4 + More past five). The parts
  stay linked to the desktop (`phoneLinked`): a desktop edit redraws them in the same ⌘Z, an edit on the phone makes
  that part your own, Screen › Reset to desktop links it again. Pages link as they open (new, template and older pages
  whose phone parts were still the starting ones). The export writes one AppShell with the phone parts as its
  `topNavigation` / `bottomNavigation`.
- MetricCard comparison (2026-10-16, user): the columns' figures are Heading/1 (were Heading/4), in code and in the
  Figma Metric-Card Type=Comparison; the columns stack at a width that follows the Heading/1 size, so three figures never
  overflow side by side in any typography. The Widgets page's KPI card is Title-Highlight, Large, like the widgets
  beside it (the Studio palette's KPI card too).
- MetricCard KPI (2026-10-16, user): `type="kpi"` (the default) now draws a Title-Highlight Metric, Large: the title
  on top, the number and trend at its foot, the Dock-Icon in the bottom-right corner, laid out like the typed cards.
  `variant="icon-highlight"` keeps the old look (XLarge by default). Figma: Metric-Card Type=KPI holds a Title-Highlight
  Large, and Title-Highlight's Contents fills a stretched metric (title on top, number at the foot) in every size.
- GroupedBarChart and ComboChart bars grow with the room they have (2026-10-16, user: "Các cột ốm quá. Khi không gian
  còn khá nhiều"): Figma's 12px / 20px at Figma's size, then a grouped bar's group takes up to 70% of its period's
  column (each bar up to 32px) and a combo bar half its column (up to 40px, as a bar chart's bar).
- Zen Studio headers edit as Figma's slots (2026-10-16, user: "Các header là Slot nên có thể tự do thêm bớt element"): a
  slot prop holds several layers for real (`<>…</>` on a page you made), so a top bar, its actions or a page header's
  actions take a second layer (⌘D, paste, Assets) instead of refusing, and a template's header actions copy in as
  separate layers (no wrapping row Stack). Hide and show any layer as Figma's eye (⇧⌘H, the eye in Layers, the layer
  menu), also on one layout only (Hide on mobile / Hide on desktop): the canvas, the export and the Figma push leave it
  out, Layers lists it dimmed. Slot switches (the Inspector's booleans, the Screen section's parts) hide a slot and keep
  its layers (`hiddenSlots`), so switching back on brings the same content. New slots: DashboardHeader Leading-Slots
  and Custom, AppShell Banner; the Screen section adds Banner and Top bar center; AppShell and PageHeader switches use
  Figma's names (Nav-Trailing-Block, Nav-Center-Block, Subheading…).
- Zen Studio New page › Empty page (2026-10-16, user: "cho phép tạo trang frame trống hoàn toàn"): one Screen with
  nothing in it; a frame drawn with the Frame tool (F) is empty too, as Figma's.
- Rules: `docs/component-usage-rules.md` §17 "One page, two layouts" maps the desktop header (Sidebar, Breadcrumbs,
  PageHeader, top bar search and actions, account) to the phone's TopNavigation and BottomNavigation (three trailing
  places, nothing dropped, one h1); new skill `skills/zen-responsive-screens` (code, Studio, Figma) with worked examples;
  the Figma AI kit and `AGENTS.consumer.md` point to it.
- Zen Studio Present and Play (2026-10-16, user: "thanh … giống của trình duyệt để view load bên trong khung"): the
  floating bottom pill is now a browser-style bar across the top (navigation, the screen's name in an address pill,
  light/dark, Viewport, Modes, Exit), and the screen loads in the frame below it, so the bar never covers it; a
  full-screen page, its Dialogs and AppShell's sticky columns fill that frame. Viewport and Modes drop down below their
  button.
- Zen Studio Layers has no Refresh button (2026-10-15, user): the tree already rebuilds on page, source and DOM changes,
  and now also when a text changes on the canvas (a text layer is named by its words), as Figma's layers follow the
  canvas.
- Zen Studio canvas, free frames on a page you made (2026-10-15, user: "canvas tự do hơn, giống Figma"): drag a frame by
  its name (or a selected frame anywhere) to move it, with red snap guides to the other frames (⌘ off, ⇧ one axis, Esc
  back); ⌥-drag drops a copy; ⌘D, ⌘C / ⌘V copy a frame (also onto another page); the arrow keys nudge it. The toolbar's
  Screen tool is now Frame (F, as in Figma): drag a box for a Screen of that size, or click for one on the page's device.
  Present the selected frame moved from F to ⌥⌘↵ (Figma's). Places are written in the page (`x` / `y` on Screen and
  Overlay, `width` / `height` on a drawn Screen); one ⌘Z per gesture.
- Component Size spacing tokens (padding and gap of Button, Input, Text-Area, Chip, Badge, Tag, Checkbox, Radio,
  Segmented, Tab-Item, Navigation) alias `Spacing/Padding/*` and `Spacing/Gap/*` instead of the `dm-#` dimensions
  (2026-10-15, user, Figma and repo, the Studio mode too); same pixels. Segmented Medium in Compact takes 8px padding
  (was 6), as in Figma.
- Zen Studio: a Screen's desktop frame is its master layout (2026-10-15, user: "Khung Screen = Master-Layout đầy đủ"):
  one AppShell at the Screen's root, as Figma's ◇ Master-Layout. Screen › Sidebar, Top bar, Top bar actions, Page header,
  Side panel, Floating action and Footer each switch one of its parts (Page header also reads the one a template keeps in
  its content), so a page from a template no longer shows a second Sidebar or Page header. Pages made before open with
  the Screen's Sidebar and Page header moved into it (a duplicate dropped); a phone keeps its Top and Bottom navigation
  and shows the page without the AppShell.
- Zen Studio's HTML export keeps VisuallyHidden's rule, so an AppShell's "Skip to content" link no longer shows on the
  exported page.
- Zen Studio's prototype works like Figma's prototype mode (2026-10-15, user: "Nâng cấp Usability của tính năng
  Prototype"): with the Prototype tab open, a selected layer shows a ⊕ — drag it onto a screen or overlay to connect;
  click an arrow to select its layer, drag an arrow's end to another frame or off to remove it (⌘Z undoes it). A tab bar,
  Tabs, Segmented or Sidebar leads each item to its own screen (`proto.navigate({ home: "screen-1", … })`; one ⊕ per
  item, one row per item in the tab; Play, Interact and the React export follow the chosen item). The tab speaks design
  words (On click / On tap, On change), removes an interaction with −, adds another trigger with +, and lists the flow
  (Start, overlays by their dialog's title; a row selects its frame, ▷ plays from it). Play flashes the hotspots after a
  press on nothing clickable and names a screen once. Round 2 (user: "ok"): each connection picks Figma's Animation
  (Instant · Dissolve · Move in · Push · Slide in, which way it moves, Fast · Base · Slow from the Motion tokens; Back
  plays it backwards); a Screen takes After delay (ms) and a layer While hovering (its overlay shows while the pointer
  stays); Add overlay holds a Dialog, Bottom sheet, Side panel or a Card you place (Position, Close on outside press, Dim
  the screen behind; an empty Overlay takes a layer from Assets). The React export writes After delay as an effect and
  While hovering as pointer handlers; arrows follow a frame while it is dragged.
- Zen Studio looks like Figma UI3's floating panels (2026-10-15, user): the canvas fills the window and Pages | Layers
  and the Inspector float over it; the toolbar row is gone (brand menu and Document | Studio head the left panel, role,
  undo/redo and drafts the Inspector, the zoom sits on its tab row, light/dark moved to the brand menu). Inspector rows
  draw Figma's Input/Inline-Field (the label inside the field: text, number with − +, select, colour token, icon, a
  read-only value), numbers with a known range use Slider/Field, and the chrome uses Emphasis Light. Fit, zoom and
  keep-in-view aim at the canvas the panels leave visible.
- Zen Studio Inspector polish (2026-10-15, user): a row's hint reads as its field's Help-Text (Caption/Regular,
  Content/Neutral/Light, 4px under the field); no-effect warnings are Zen Inline-Messages (Warning, their fix as the
  Action) ending at the fields' edge, not hand-drawn pills; Frame › Theme puts its label above the Segmented, as a Screen's Canvas
  (beside the label "Page · Light · Dark" was cut). Field-grid rows without a label above (Screen's Top / Bottom navigation
  switches) centre their control, so they keep the panel's 8px rhythm. Document | Studio floats at the top centre of the canvas (it was cut to
  "Docu…" in the left header), with "Zen Studio" back beside the menu mark; document pages start under the floating bars.
  The alignment box takes the input fill and Figma's vertical insets. An enum prop with no known default shows "Default"
  as its chosen value (Stack Scroll had nothing selected). Modes move into their controls instead of the icon column: Wrap is Flow's third
  segment (↓ → ↵, Figma UI3) and a Grid's separate/one gap commands sit in its gap lists. The
  Inspector header no longer pushes Save all out of a narrow panel (the role button keeps its avatar there) and the role
  button has no chevron and shows the signed-in person's photo, else their initial on their own hue.
- Zen Figma library: Input/Inline-Field has Type=Number (the number and − + steppers, `<NumberField layout="inline">`);
  `.Primitives/Input/Number/Trailing`'s − button is bound to Button-Tertiary/Content again, as the + is.
- Segmented spacing follows the live Figma (2026-10-15, user): the label pads 8px on each side (was 4) and the icon
  sits next to it with no gap (was 4, Small 2), so a segment with text is 4–6px wider; `Segmented/Spacing/XSmall/*` is
  removed (Figma deleted it, nothing read it). Contract re-captured.
- Zen Figma library: the six property-panel sets (Input/Inline-Field, Input/Color-Field, Color-Picker,
  .Primitives/Input/Color-Swatch, Slider/Field, Chart/Curve-Preview) carry Zen descriptions with their code component
  (`tools/figma-docs`), no longer "Draft, not yet in code".
- Segmented follows the live Figma (2026-10-14): items are 4px taller (`Segmented/Size` Medium 36 / 44, Small 28 / 36)
  in a track padded by Spacing/Padding/3XSmall (2px), so the control keeps its outer height; `level="primary"` has an
  outlined track (no fill, 2px Border/Neutral/Subtle ring). `Segmented/Size/XSmall` is removed (Figma deleted it, nothing
  read it). Component Theme `Segmented-Item-*` tokens are unchanged.
- Every component takes `ref` as a plain React 19 prop and puts it on its root (overlays: the panel; fields: the native
  control, as before). `forwardRef` is gone; component names are unchanged. Tooltip and Menu wrap their trigger, which
  keeps its own ref.
  ToggleButton's `ref` now reaches the `role="switch"` element people focus (it used to land on the hidden input).
- Tabs and Segmented no longer call `onValueChange` / `onChange` when the selected item is clicked again (value controls
  now share one controlled/uncontrolled hook and report real changes only). Switching a control between controlled and
  uncontrolled warns in development.
- Accordion Medium: Title → Contents is 12 (Gap/Small, as Large), was 8, in Figma and code, so a list of fields (rows
  8 apart) reads as the item's content; Box keeps its outer padding (inset 16 − 12). Accordion Divider: the rule under
  each item is Border/Neutral/Pale, as in Figma (code drew Subtle). Spacing rule: rows of one group live in their own
  stack so every divider has equal space above and below (`docs/component-usage-rules.md` §13, Figma `screen-rules.md`
  §2, which also states concentric nested corners).
- Registry access is per seat: developers sign in with their Zen account through `npm login` (browser, Google
  sign-in only) and need a seat on the licence (owner + team members, up to its seat count); CI signs in with the
  licence key, up to 3 CI tokens per licence (a fourth retires the oldest). Tokens from the old shared-key sign-in stop
  working: run `npm login` again. The registry counts usage per licence (developers, CI tokens, IPs, installs).
- Figma: the Zen file's layers now carry Zen's names (186 layers, names only): `Action`, `Actions`, `Send`, `Attach` /
  `Dictate` / `Submit`, `Previous` / `Next` / `Page-Size`, `Close`, `Primary` / `Secondary`, `Icon-Wrapper` and `Icon`
  for glyph-named icons; Inline-Message's Custom slot property is `Leading`. The nested layer-name gate checks them now
  (20 exceptions gone); the record and undo map are `docs/figma-contracts/layer-renames-2026-10-12.json`.
- Zen Studio: Update from Figma on a page you exported to Figma now lists only what the designer changed there, and
  applying it keeps everything Figma cannot hold (a Container, a list's title lines, aria, ids, data). How it works:
  - Export › Figma keeps the pull of the frame it writes, under the export's version.
  - The Zen plugin stores the page and that version on the frame.
  - A pull of the frame comes back with the page's own element ids.
  - A spot changed in the Studio since the export is flagged as a conflict.
  - A layer the designer duplicated comes in as new.
- Zen Studio's icon picker leads with tiles you can click without typing: **Recent** (your last picks) and **Related**
  (the icon's own family and the icons that mean the same as it and as the words beside it: a Revenue card's coins →
  wallet, bank, card, currency, receipt). A nested icon's picker (a Metric card's dock icon) lists the icons the page
  uses again, under "Used in this file".
- Zen Studio, round 3: ⌘-click lands on every text as Figma's deep select (a Button's, Badge's or Chip's label too; a
  picture's initials stay the picture), ⇧Enter / Esc go up one layer inside an instance; Layers shows an instance's own
  layers by their Figma names and texts by their words, with no "Parts" folder, no empty slots and no slot row that
  only repeats its layer's name. Edits on a page you made reach the canvas in 35–60 ms (was 160–260 before these
  rounds): its elements are marked by their stable document ids, so an added line no longer redraws the page below it,
  and the Studio's own panels redraw after the canvas has painted.
- Zen Studio, Figma parity round 2: Layers lists what the canvas selects (no Container, a card's content Stack, a list's
  `<ul>` or Parts row under a Stack / Grid); ⌘-click goes into an instance to its text or nested instance (a KPI value,
  a list title, a table cell's name, an icon, a Badge), a text layer edits in the Inspector (Text) or with Enter in
  place; a nested boolean switched back off removes its override; Metric's Trend is a boolean; a button added to a page
  header's actions joins its row; a Sidebar item or a trend label renames in place on a page you made.
- Zen Studio edits reach the canvas about twice as fast (45–120 ms, was 160–260 on a template page): the page is parsed
  in the render that brings it, unchanged parts are not rendered again, parses and hashes are reused, and size probes
  wait until the canvas has painted.
- Zen Studio clicks like Figma on pages made from templates: layout wrappers that draw nothing (a Stack, Grid or
  Container around one layer, a card's content column, a list's `<ul>`) are passed through, and AppShell and the page's
  body count as the frame, so a KPI card is three double-clicks away instead of seven (5.6 → 2.5 on average over six
  templates). Right-click › **Select layer ›** lists every layer under the pointer.
- Zen Studio booleans that did nothing now work or hide: Metric's Counter shows on Icon-Highlight only, Hint and
  Label-Icon on Title-Highlight XLarge–Medium; Metric / Metric card **Custom** and DashboardHeader's Search, Controls,
  Actions, Center and Trailing open their slot (they had no slot, and a page from a template never opened the picker);
  an Advanced Chip's Dropdown switched off writes `dropdown={false}`; switches that cannot draw in the current state
  (Line chart legend without a comparison, an action's dot under a count, the workspace bar) say why.
- Badge: `leadingIcon={false}` hides a custom `leading` icon too, as Figma's Leading-Icon boolean hides the layer.
- Zen Studio: the insert picker says "N not available here" in one line (the reasons in its tooltip, in design words);
  a card's Effects row is one Figma style row — the effect's swatch and name, which picks the theme that draws it.
- Charts take their card from Card (2026-10-14, user, live Figma): Bar, Donut, Radial and Heatmap no longer paint their
  own surface; like every chart they sit in Chart-Card's Content slot, so Theme, Surface and Color work on them. The
  AI kit for Figma no longer treats a standalone chart as a box (`theme/box-on-canvas`, `theme/mixed-elevation`).
- Chart card value (2026-10-14, live Figma): the header's Value text is Heading/2 (25/32) on every chart; Line,
  Stack-Bar, Donut, Radial and Multi-Line were still Heading/3 (22/28). In code the `ChartCard` value and the
  `DonutChart` total beside the ring (`totalPosition="start"`) are Heading/2 too (were Heading/3).
- No gradient surfaces (2026-10-14, user): Card `theme="semi-pale"` is deprecated and renders as `pale` (it stays in
  the type, off the theme list). Figma dropped the Card Gradient and Semi-Pale themes and their styles, so
  `--zen-style-semi-pale-fill` and `.zen-fill-semi-pale` are gone from `style-effects.css`.
- Chat reply, synced from Figma (2026-10-13, user): a quote that leads with a photo, a file or an icon starts 8px in
  (text-only quotes keep 12), and the composer's Replying-to bar shows a file as a Small Dock Icon at 2/3 (21px, was 16),
  as the designer set Chat/Reply/Quote and Chat/Composer-Reply.
- Voice motion (2026-10-13, user): `VoiceRecorder` without `levels` scrolls its sample take while recording (7 bars a
  second, so it keeps pace with the 8-second window; a new take enters at the right edge; Paused holds still) and its
  Recording dot glows; `AiVoiceConversation` bars move like speech (yours irregular, the assistant's steadier) with a
  halo that swells with the voice; `ChatVoice` bars fade in as playback reaches them. Reduced motion keeps Figma's
  still frames. Muted while listening, the signal rests, the guidance and note say the microphone is muted (labels
  `voiceMutedGuidance`, `voiceMutedNote`) and Mute shows its Pressed look. Review: `docs/research/voice-usability-review-2026-10-13.md`.
- Chart sectors (2026-10-13, repo + live Figma): `Chart/Sector/Primary` is Support/Brand/Solid and
  `Chart/Sector/Secondary` Support/Neutral/Deep in every Component Theme mode, as Brand - S1 (the Neutral modes had them
  the other way round), so a chart's first series is the brand colour everywhere. LineChart's `compare` line is
  Border/Neutral/Solid at 40% (Figma Multi-Line Compare), a neutral reference that no longer turns brand with it.
- Chart sector style (2026-10-13, live Figma): "Color Chart Sector/Septenary" now references Support/Green/Soft (was
  Red/Soft); `--zen-style-color-chart-sector-septenary-fill` and `.zen-fill-color-chart-sector-septenary` follow.
  `chartPalette` now walks the seven styles in order: a 6th series is Support/Orange/Solid (was Green/Solid) and a 7th
  Support/Green/Soft (was Orange/Solid).
- Focus rings (2026-10-13, live Figma): four new tokens, `--zen-color-focus-positive-solid|subtle` and
  `--zen-color-focus-negative-solid|subtle` (Color/Focus/Positive|Negative/*, the same steps as the Accent pair). Button
  (Main, Flat, Icon-Main, Icon-Flat) now draws its 3px ring in Focus/Accent/Solid (was Accent/Subtle); Danger levels use
  Focus/Negative/Solid and Positive levels Focus/Positive/Solid. Input's Inputted-Error / Blank-Error border reads
  Focus/Negative/Solid (same colour as before). Top Navigation actions keep a 3px clear gap to their ring (was 2px).
  The 3px field ring of Input (Focused/Typing, and the code-only error-focus and read-only-focus rings) is
  Focus/Neutral/Subtle, a step lighter than Border/Active/Neutral/Subtle; AiChatField and the Chat composer, which take
  the Input ring, follow. Stepper: Focused ring Focus/Neutral/Subtle, Error ring Focus/Negative/Subtle. New harness rule
  `focus/ring-token` (error): a focus ring's colour comes from `--zen-color-focus-*`.
- Text on a Zen accent solid (2026-10-13, live Figma): Base Colors On-Brand-Default (Light, Dark) and Light/On-Brand-Hover
  are black 86% instead of white, so `--zen-color-content-on-accent-*` passes contrast on Zen pink (white was 2.5:1).
- Table rows (2026-10-13, user rule, Figma Table/Cell/Default FIXED): every body row is exactly Table/Cell/Size and the
  header Table/Header/Size in every density (rows were 1px taller, and long text wrapped onto more lines). Cells hold
  one line: long text ends in an ellipsis, right-aligned values stay whole, Badge/Tag items no longer wrap (Figma
  NO_WRAP). Long, multi-line content is not Table's job; a sheet-style component will cover it.
- Typography (2026-10-13, Figma re-sync, mode Dashboard): headings and display text track tighter and Body/Small
  gains -0.12px — Letter-Spacing Display-1…4, Heading-1…4 and Body-Small re-synced (e.g. Heading-1 -0.56 → -0.84px);
  the Studio mode follows. Every text style and component reads the variables, so nothing else changes.
- Card and List Box `theme="on-container"` (2026-10-12, user): Surface/Flat, for a Card or ListBox inside a Modal
  (Dialog, ModalForm), a SidePanel or a BottomSheet, on their Container fill — no border, no shadow; a selected card
  keeps it. Usage rules §16 and both guidelines say so (a card in a card or in a ListBox keeps the Pale border); the
  harness warns on a Card or ListBox right inside one of them with another theme (`card/on-container-in-overlay`,
  `listbox/on-container-in-overlay`, allow `overlay-theme`). Figma Card and Component/List-Box have the same
  Theme=On-Container; stories `OnContainer`.
- List Box `theme` is in Figma too (2026-10-12): Component/List-Box (14922:75297) has a Theme variant property,
  Flat (default) · Shadow · Pale · Border · On-Container, with the tokens of Card's Theme (Border's stroke stays out of
  the layout, like Card's). Zen Studio shows it in the Properties panel, and Export › Figma writes it
  (`figma-props.map.mjs`).
- Side Panel synced with Figma's Side-Panel (1573:3128): the header, contents and actions each keep Modal-Padding on
  every side (contents start 24px lower, the actions 12px lower); the back and close buttons sit in the title row.
  `icon` is deprecated: Figma no longer draws the Modal heading icon (it still renders for now).
- Progress-Circle: the ring has its Neutral/Subtle fill again, and Done is a plain solid disc (no ring over it), as in
  Figma's Progress-Circle/Icon.
- HeatmapChart's five levels are Support/Brand Pale · Soft · Solid · Rich · Deep, as Figma's Heatmap-Chart now draws
  them: the new Rich step replaces Subtle, so the steps are evenly spaced (Subtle was barely apart from Pale, and Solid
  jumped straight to Deep).
- LineChart's area is a flat Accent fill at 16% (`fill="area"`, the default), as Figma's charts now draw it (no
  gradients, 2026-10-14). `fill="gradient"` is deprecated and draws the same area.
- LineChart and StackBarChart follow Figma's new chart grid (the 14-row Trend grid). The Tooltip lane and the X-label lane
  are each a seventh of the chart's height (they were fixed at 36px and 28px). The Y labels sit in a 32px column,
  left-aligned. The line and its area start at the plot's left edge. BarChart keeps its 36px and 28px lanes.
- LineChart `compare` is a neutral reference line, as in Figma Chart/Multi-Line-Chart: Border/Neutral/Solid at 40%,
  dashed 4 / 5, with a Neutral legend dot and active dot. It no longer uses chart-palette colour 1. In Figma,
  Multi-Line-Chart is now a set with a `Sector` property (4, 6, 7 or 12), so its comparison line lines up with every
  period count.
- Zen Studio ↔ Figma keeps more of a page through a push and a pull. This was tested by placing the examples in the
  real Zen file and reading them back. Fixes:
  - A Checkbox, Toggle or Radio keeps its label and caption (Figma moved them into the Content primitive).
  - An emoji Dock-Icon keeps its emoji.
  - Fields keep their label, value and help text.
  - List rows keep their title, caption, leading and trailing.
  - Text keeps its tone.
  - Headings keep their level.
  - A Type=Main header comes back as a PageHeader.
  - A Sidebar's logo replaces Figma's sample logo, and its collapse button is no longer pulled in as content.
  - Breadcrumbs keep `master`.
  - A DescriptionList keeps its terms and values.
  - A swapped-in file icon is read back.
  - Figma cannot resize an icon nested inside a List-Item, so the push says so instead of failing silently.
- A Badge keeps its width in a row (it shrank to its 28px minimum beside long text, so examples had to pin it), and a
  Text or Heading that takes focus after an action (tabIndex -1) draws the focus ring with room around its words.
- The examples lost 107 of their last 219 classNames: their frames (an app window, a page on the Canvas, a desktop
  chat window) are platform components now (`src/platform/PlatformFrames.tsx`), the rest Zen props. Pages look the
  same (visual diff, 760 panels).
- Small avatars show one letter: a ChatMessage's author avatar (XSmall) now shows the name's initial, as every XSmall
  and 2XSmall Avatar does (it showed two letters); the push to Figma writes small avatars' initials the same way.
- Zen Studio → Figma now places the Figma components it drew as frames or left out: TopNavigation as
  Top-Navigation/Mobile (its Type, the parts the page shows, the titles, the leading action, each row's actions as
  Nav-Slot/Action in the Button its Type draws, the control bar), ColorSelector as Color-Selector swatches bound to the
  colour variables, Tabs written with TabItem children (and tab badges), InputConditions as Input-Conditions (the items'
  labels), UploaderFileItem as File-Item (state, name, size, caption, error, progress), DatePickerSheet as
  Date-Picker/Mobile, and chat: ChatThread as Chat/Section/Conversation runs, a ChatMessage's author, reactions pill and
  read list, FileIcon as icon-media-file and Flag as Flag, and an Icon's size (its Element-Size/Popular variable; every
  icon was 20px). Each comes back from Figma the same (pull), and a phone Screen's top and bottom navigation come back
  as its chrome. Fixed on the way: a Segmented's selected item and fullWidth, a Tab-Item read as "True", a
  Condition-Item's label, a Metric's label, value, trend and default icon (Figma hid it), MetricCard read back as a Card,
  and a chat message's text read from the avatar.
- Stack and Grid take `clip` (Figma's Clip content), as Box does: children are clipped to the frame's padding box.
  In Zen Studio the Auto layout section shows Clip content (under Padding) on every frame, the push to Figma writes it
  as the frame's Clip content and a pull reads it back (a frame that clips; the page frame is the screen). Imported
  frames no longer clip by default, so a card's shadow shows past its frame's edge as in the Studio.
- AppShell is built from the Zen components Figma's ◇ Master-Layout uses: its top bar is a DashboardHeader
  type="navigation" (Figma's Dashboard header Type=Navigation, its Leading-, Center- and Trailing-Slots), next to the
  Sidebar, the `sections` rows, the account's Avatar and the docked SidePanel. API unchanged; the swap alone left 93 of
  94 example panels identical (the other is the fix below). The Studio's slots follow the new markup.
- Zen Studio ↔ Figma: an app frame comes back from Figma as an AppShell — Figma's Master-Layout (the Sidebar pattern
  beside Main-Container › Header/Dashboard › Sections, Body, Floating-Actions) and the frames the Studio pushes — with
  its header, center, actions (the account as AppShellAccount), sections, page, footer and floating action; a Studio
  Screen's own Sidebar and Page header come back as the Screen's.
- Table: inside a surface (Card, ChartCard, MetricCard, Accordion, SidePanel, Dialog/ModalForm, BottomSheet, Popover,
  ListBox, a Box with a surface or border) the last row has no bottom rule — the surface edge closes it. Page tables
  on the canvas keep it. Table guideline updated (in Figma: 0 bottom stroke weight on the last row's cells); the
  Studio's Export › Figma does the same (`strokeBottom`, applied by the Zen plugin's importer).
- Nested layer names follow Figma's layers (the `overrides` paths a Studio page writes): Tabs `Tab` → `Tab-Item`,
  Uploader `File` → `File-Item`. Zen's own names stay where Figma differs: `Send`, `Action`
  (its own component and tokens; an inline component's own buttons are its Action too), `Actions` (the action row), a
  button named by its level (`Primary`, `Secondary`) and `Leading`, the wrapper that holds an icon or any other
  visual. The gate
  `nested-paths` now checks 44 components (was 15) against `docs/figma-contracts/nested-layers.json`, a read of every
  set's layer names, hidden layers included (re-read with `node tools/figma-contract/nested-layers-read.mjs`).
- Zen Studio speaks design words on example and template pages too (the user, 2026-10-12): the Inspector header reads
  "Show code" and the canvas tag shows no file:line on every page; a status line keeps the file's name without its
  line ("Draft · uploader.tsx · ⌘S to save"). A Date field's `Leading` layer matches Figma (its `Leading-Icon` is the
  calendar inside Trailing): no Figma rename is needed.
- **The package is now `@zen-ds/react`** (was `@zen/design-system`): imports become `@zen-ds/react`,
  `@zen-ds/react/styles.css`, `@zen-ds/react/icons/all`, `@zen-ds/react/eslint`, …; the docs, templates, MCP server and
  usage harness follow. It is published to the licensed registry `npm.dizai.studio` (`publishConfig`), by the new
  `Release` workflow on a `v*` tag.
- **Licence:** Zen DS is commercial software under `LICENSE.md` (Dizai Studio; per-company subscription, apps but not
  competing kits; draft pending legal review). `package.json` `license` points to it.
- **Install from the Zen registry:** `docs/getting-started.md`, the README, `AGENTS.consumer.md` and the platform's
  Installation page now cover the `.npmrc` scope line, the one-time `npm login` with the licence key, CI tokens and
  the install errors. `npx zen-ds init` adds `@zen-ds:registry=https://npm.dizai.studio/` to `.npmrc`; `npx zen-ds
  doctor` requires it and fails on a registry token written into the project's `.npmrc`.
- ModalForm and Dialog (2026-10-16): a TextAreaField or InputField placed straight in the form fills its width again,
  whatever order the CSS loads in (in Zen Studio it hugged its content).
- MetricCard and ChartCard in a grid row (2026-10-16, user): a card stretched by its row no longer leaves an empty band
  under the shorter one. A Chart Card scales its chart to the free height (plots grow taller, rings larger up to the
  card's width, bar lists, bullets, funnels and horizontal bars spread their rows, heatmap cells grow); a Metric Card
  keeps its title at the top and its Spark-Bars, goal bar, comparison columns or stacked KPI number at the foot. The Zen
  Figma library does the same (Chart-Card, every `Chart/*` set, Metric-Card; placed instances on Chart, Performance and
  HR-Platform updated), with spacing that never drops under the design's gap (8px at least).
- Donut and Radial charts (2026-10-16, user): a legend beside the ring that wraps under it in a narrow box becomes a
  centred row that wraps (Figma auto layout Wrap) instead of a tall column; in a plot under 280px the X label pills
  take Padding/2XSmall, so six months no longer overlap on a 320px phone.
- Zen Studio Play and Present (2026-10-16, user): an AppShell's Sidebar sticks while the page scrolls, at the viewport's
  height, and its items scroll inside it (it scrolled away with the page).

### Fixed
- Charts (2026-10-17, user: the Tooltip sat off the hover line in Zen Studio): the Tooltip of LineChart, BarChart,
  StackBarChart, GroupedBarChart and ComboChart is centred on the active period's rule, as in Figma, and the
  HeatmapChart cell Tooltip on its cell; it moves only by what it would cross the chart's edge (it used to slide by the
  period's place along the plot, so every period but the middle one sat off its line).
- Zen Studio Present (2026-10-17, user: "Sidebar vẫn bị lỗi scroll trong present"): a page made in the Studio runs as in
  Play, the AppShell Sidebar and docked aside sticking to the top at the window's height (or a typed viewport's) with
  their rows scrolling inside; they scrolled away with the page. Studio E2E PT-14.
- Zen Studio (2026-10-18, user: Flat items used the wrong hover colour): rows and targets with no fill at rest (Variables
  groups, cells and alias options, inspector items, the alignment box) hover and press with Neutral/Flat/Hover and
  Flat/Pressed; Subtle/Hover was darker than the selected row, so a hovered row read as selected. New style-guard rule
  `color/flat-state` keeps it that way.
- Zen Studio Present and Play (2026-10-16, user: "Có"): a phone Screen's Top Navigation with a large title folds under
  its bar as the page scrolls, as on iOS (TopNavigation `scrollRef`, unless the page sets `scrollRef` or `collapsed`),
  and the status bar and home indicator stay at the window's edges instead of scrolling away. The canvas is unchanged.
  Studio E2E PT-12 (Play) and PT-13 (Present) scroll a phone Screen and check the fold and the bars.
- ProgressBar Inline shows its bar in a box that sizes to its content (2026-10-16, user: Zen Studio's Main component
  frame drew only the label): the track prefers 112px (Figma's Inline track is 119 of 163px) and still grows and shrinks
  to fill a sized row as before.
- 320px phones (2026-10-16, user: "sửa"): no docs page scrolls sideways any more (the section grids took their widest
  unbreakable child as their width; the Form and Input pages also ran 11px wide at 390), and under 375px the docs chrome
  gives an example 248px instead of 208px (page gutter 16, stage 8 + 12). ListItem: a caption word longer than the row
  ends in an ellipsis instead of running under the trailing slot (the caption still wraps). Toast: a long run such as an
  email address breaks instead of spilling. Stepper: the caption breaks like the title. Popover and Tooltip examples wrap
  their header and toolbar at Comfortable on a 320px phone.
- Zen Studio: a page made in the Studio changed outside the tab (an AI's file tools, an editor) now shows on the canvas at
  once instead of after a reload (user, 2026-10-16: "claude chạy xong phải refresh lại mới thấy"): the dev server watches
  the pages folder and the open tabs sync with it.
- Design Tokens › Global Colors (2026-10-15, user): the page lists its 960 colours again (it showed "No tokens match" and
  Zen / Zen-High-Contrast instead of Light / Dark Colors: a sync note had been pasted into the collection's slug).
  Component Theme picks its 9 modes in a SelectField instead of a Segmented that ran off the page; a Segmented stays for
  2–5 modes. The platform audit now visits every token collection page and fails a rendered Segmented with more than 5
  (or fewer than 2) items (kind `counts`), which the static `segmented/option-count` cannot count when options are computed.
- Zen Studio toolbar (2026-10-15, user): with Stack, Text or Image on, a click on another tool switches to it again;
  before, the floating toolbar sat over the canvas, the placement took the click, and only the shortcut keys worked.
- Zen Studio Interact, zoomed in or out (2026-10-15, user): an example's overlays stay in its frame and zoom with it. A
  Dialog, Side Panel or Menu opens inside the frame (the frame grows to a laptop screen's height while a modal is open),
  and Popover, Tooltip and the toast stack render in the frame's own layer; before, they opened at 100% over the whole
  canvas.
- Zen Studio frames clip their content, as Figma's Clip content (2026-10-15, user): nothing an example opens spills out
  of its frame. An open Popover, Menu, Date or Colour Picker grows its example frame to 720px, as a modal does, and
  flips or moves to open whole inside it; icon tooltips stay inside the frame too.
- Tooltip (above or below its trigger) stays whole near the edge of the window or of a frame that clips it, such as a
  phone preview: it moves along instead of being cut off ("A tip on a phone" lost its first words).
- Popover placement (useAnchoredPosition), Tooltip, the Sidebar rail tooltip and the Table editor's error bubble now
  sit on their anchor inside a transform-scaled container (a scaled phone preview, a zoomed canvas): positions are
  converted from viewport px to the container's own px (`_shared/layer-space.ts`, as Menu already did). Unscaled pages
  are unchanged.
- Zen Studio: on a builder page, the Inspector's frame Width and Theme now follow the frame (2026-10-15, user): a width
  dragged on the frame's edge shows in Width, and a Width or Theme picked there reaches the frame (the Inspector kept
  them under the platform page instead of the builder page).
- Zen Studio: a page made from a template no longer locks a control with the state it was captured in (a DateField's
  `value=""` that ignored picked days, a Chip's `popoverOpen={false}`): it is written as the `default…` twin. Pushing such
  a page to Figma keeps Select=Yes for `defaultChecked` / `defaultSelected`.
- Security: RichTextField sanitises the HTML it receives as `value` / `defaultValue` (scripts, event handlers and
  `javascript:` URLs are dropped); Link adds `rel="noopener noreferrer"` to any `target="_blank"`, not only `external`.
- A press inside a popup opened from another popup (a Select or Menu inside a Popover, a DatePicker in a Chip filter) no
  longer closes the outer one.
- Open modals (Dialog, ModalForm, modal SidePanel, BottomSheet) make the rest of the page `inert`, so screen readers and
  pointers can't reach the background; the scroll lock keeps the scrollbar's width (no layout jump) and works with
  stacked modals; focus returns to the opener only if it is still on the page. The isolation stops at a device frame or
  at an element marked `data-zen-isolation-root`: Zen Studio marks its preview overlay layer, so a Dialog previewed on
  the canvas no longer makes the canvas and the Studio chrome inert (Move could not be picked and a click on the Dialog
  did not select it).
- Zen plugin, Import from Studio: an imported page now takes every property it sets (variants, booleans, icons, sizes:
  Avatars at their size, Dashboard Header rows, button sizes, badge colours), swaps its icons, and importing it again
  updates the same layers. Before, the plugin set none of them in Figma. Import the page again into the same frame to
  repair it. On a re-import, a Grid of three rows or more stays a grid (it fell back to one column), a Grid that lost
  rows drops them, and a layer an earlier import hid shows again once the page no longer hides it.
- Zen Studio, Export › Figma: a Table photo cell without a picture draws its square Avatar with initials (Figma's
  Avatar-Cell), not Figma's sample photo; a MetricCard's `custom` content fills Metric-Inline's Custom-Slot.
- Getting started, CI: the registry token now goes into the CI job's own `~/.npmrc`, not the project's `.npmrc` (a
  `${ZEN_DS_NPM_TOKEN}` line there overrode every developer's `npm login` and failed with `E401`); `npx zen-ds doctor`
  flags any token line in the project's `.npmrc`. Added notes on the password spinner, Yarn 2+ and Docker builds.
- `zen-ds-mcp`: a client that sends its requests and then closes stdin now gets every reply (the server used to exit
  before the async `tools/call` answers were written).
- `zen-usage --json` and `check-usage.mjs --list`: large output piped to another program is no longer cut off at 8 KB.
- Charts whose data arrives after the first render (loading) now pick their default item when it lands: before, Line,
  Bar, Stack bar and the new charts showed no Tooltip and announced "No data" until hovered.
- Chart values under 1,000 read at most one decimal by default ("Avg 306.7", was "Avg 306.6666666666667").
- `LineChart compare`: the legend is start-aligned, as Figma's Multi-Line chart.
- Guidelines: a "when to use" line with two "→" lost everything after the second arrow on the platform page (Input,
  App Shell and Chart lost their second advice); each advice is its own line now, and the page keeps the full text.
- Charts follow the live Figma again (2026-10-14, user: "update lại chart, widget từ Figma"): the line chart's area and
  the area chart's bands fade from their colour to its Subtle at 30% (they were flat), and only the active period of a
  line chart draws its sector rule (Figma hides the idle ones).

### Added
- Zen Studio MCP M1 (2026-10-16, user: "làm M1 đi"): an AI client builds and edits the open page live, by layer id —
  `insert` (JSX in the page dialect), `replace`, `move`, `duplicate`, `delete`, `wrap` / `unwrap`, `batch` (several
  changes, one ⌘Z; refused part-way = nothing changed), `create_page`, `add_frame`, `select`, `focus`, `open_page`, and
  the reads `list_pages`, `get_node`, `get_code` beside M0's. E2E rows AI-01…06.
- Zen Studio MCP, first step (M0, 2026-10-15, user: "kết nối mcp vào studio để Claude hoặc AI khác … design trực tiếp
  trên canvas"): Claude Code (or another MCP client) connects to the dev server at `/__zen-studio/mcp` and reads and
  changes the page made in the Studio that is open in the browser, live: `get_studio_state`, `get_tree` (layers by id),
  `update` (props and text), `get_screenshot`. Each change is one ⌘Z step; an AI chip bottom-left of the canvas shows
  the client and holds Stop / Resume. `npm run studio:mcp` prints the `claude mcp add` command with this checkout's
  token. Spec: `docs/research/studio-mcp-canvas-2026-10-15.md`.
- Zen Studio Present and Play: a **Viewport** button on the bar (2026-10-15, user) — Auto (as before), Desktop
  1440 × 900, Tablet 768 × 1024, Phone 390 × 844, or any W × H typed in px (an empty H fills the window). The screen
  renders in a box of that size (its dialogs and menus open inside it) and scales down to fit the window, never up; the
  choice holds while ‹ › step and Restart, and resets when Present or Play ends. The box's right edge, bottom edge and
  corner drag to a free size (Shift snaps to 8, Esc puts it back, a double-click returns to Auto).
- Components keep their own state where a parent used to (2026-10-15, user: so a page made from a template in Zen
  Studio works as the template does): an Advanced Chip with `popoverItems` and no `onPopoverSelect` keeps the choice
  itself (the picked value as its label, the count for multiple, × and Delete clear it); Chip `defaultSelected` (Normal
  chips toggle themselves) and `defaultPopoverOpen`; Pagination `defaultPage` and `defaultPageSize` (`page` is now
  optional); Stepper `defaultCurrent` (a Passed step takes you back); SelectField `defaultPopoverOpen`.
- **AI UI runtime** (`@zen-ds/react/ai-ui`, 2026-10-14, branch `zen/feat/ai-ui-runtime-20261014`): the layer for UI a
  model composes at run time (docs/ai-ui/README.md). A generated catalog (`docs/ai-ui/catalog.json`, 133 public
  components: props as a JSON-Schema subset, controlled-pair bindings, required actions, stable / verified / experimental
  status, page chrome flagged; `npm run ai-ui:build` / `ai-ui:check`), a spec format (nodes with `$ref`, `$state`,
  `$action`, `$map`, `pending`), `validateSpec` (coded errors with hints), `toJsx` + `lintSpec` (the usage harness on a
  spec, `@zen-ds/react/ai-ui/lint`), `<AiUi>` (renders with the real components, binds pairs to shared state, emits
  actions, Skeletons while loading), `applyOps` (edits by node id) and `markdownToSpec`. Tests: `npm run ai-ui:selftest`,
  `tests/ai-ui`.
- Platform page **Patterns › AI UI** (`?page=ai-ui`, 2026-10-15): the runtime at work inside Zen AI with a deterministic
  composer standing in for the model: a booking form, the invoices table (Skeleton first, rows after), revenue by month, a
  confirmation Dialog and a prose answer, each validated against the catalog and rendered in the AI bubble; what Alex picks
  shows in a "shared state" panel, follow-ups edit the UI in place, a rejected spec shows its errors; a phone example and a
  playground whose code is the React the renderer runs (`toJsx`).
- **Compose loop and MCP tools** (`@zen-ds/react/ai-ui/compose`, 2026-10-15): `composeUi` (pick components from tier 1,
  compose with their tier 2, parse → validate → lint → send the problems back until the spec is clean) and `composeEdit`
  (a follow-up as ops, a state change or a new spec), provider-agnostic through the app's `model` function;
  `zen-ds-mcp` gains `get_catalog` and `check_spec`.
- **Where the model connects + composing while typing** (2026-10-15): `@zen-ds/react/ai-ui/server` (a framework-free
  request handler with `/status`, `/catalog`, `/compose`, `/edit`, `/check`; `node:http` listener; standalone
  `node tools/ai-ui/server.mjs`), `@zen-ds/react/ai-ui/adapters/anthropic` (the model function on the Claude API through
  the official SDK, key server-side only), the platform's dev server mounts it at `/ai-ui/*` when `ANTHROPIC_API_KEY`
  is set, and `createLiveComposer` / `keywordClassifier` compose while the person types (debounce, on-device classifier,
  Skeleton first, stale answers dropped, no flicker). `AiChatField` takes `value` / `onValueChange`. Patterns › AI UI
  gains "Composed while typing" and uses the model for typed prompts when the server has one.
- **AI UI eval** (`npm run ai-ui:eval`, `@zen-ds/react/ai-ui/eval`, 2026-10-15): runs a prompt set (20 cases, English
  and Vietnamese, with follow-ups) through the compose loop on a real model and reports the handoff's metrics: valid-spec
  rate (first attempt, within the retry loop, per spec attempt), wrong UI against what each case expects, time to first
  UI, tokens, follow-up edits, and the keyword classifier's intent accuracy on 25–100 % of each prompt; `--dry` and
  `--classifier-only` run without a key. Reports in `.qa/ai-ui-eval/`.
- **Compose while typing, part 2** (2026-10-15, user, after the ShapeShift UI reference): `extractSlots` reads title,
  date, time, people and place from the sentence on the device (English and Vietnamese); `keywordClassifier` takes a
  default slot extractor and a template per intent built from the slots, so the first UI is the real form pre-filled;
  the live composer gains Tab (`accept()`: the guessed intent stays while the sentence goes on; focus moves on as
  usual), and `primaryActionOf` /
  `resolveArgs` let Enter run the UI's primary action. `AiChatField` gains `onAccept` (Tab) and `onClear` (Escape),
  active only while passed. Patterns › AI UI's "Composed while typing" shows the pre-filled form and the key hints.
- Patterns › AI UI with a model behind `/ai-ui` (2026-10-15): when the model call fails (a bad key, no credit, the
  network) the answer says why, with the server's reason, before the demo composer's fallback, and the dev server logs
  the failed call in its terminal; before, the page fell back in silence.
- `anthropicModel` sends `anthropic-workspace-id` (option `workspaceId`, default `ANTHROPIC_WORKSPACE_ID`) for a
  personal or service-account key with Organization scope (2026-10-15); a key scoped to one workspace needs nothing.
  The AI UI README says which key to create and what a 401 means.
- Patterns › AI UI (2026-10-15, user: "các form nên bỏ vô card cho dễ nhìn"): a composed UI with bound controls (a
  form, chips, a table) renders on a flat Card inside the answer, so it reads as one object; prose, a chart or a lone
  button stay in the flow. The host frames it, the model never adds the Card. Study of the live composer's layout and
  interaction against the ShapeShift reference: `docs/research/ai-ui-live-composer-ux-2026-10-15.md`.
- Patterns › AI UI "Composed while typing" is the composer card (2026-10-15, the study's P1-b/c): the field, then a flat
  Card that holds the guess (type row with the intent, the title heard, the slots as chips: "10/16/2026", "16:00",
  "+ Add people"), the form once the intent is sure or a chip is opened, and a footer with the key hints and Cancel /
  Schedule; Enter and the button run the form's primary action. No status line, no sentence above a guess.
- **Zen AI chat screen on Patterns › AI UI** (2026-10-15): the demo screen reads as the product. A bar (title, a Tag naming
  who answers: the model behind `/ai-ui` or the demo composer), the conversation scrolling under a docked
  `AiChatField fieldStyle="liquid-glass"` (desktop and phone), suggested prompts after the last answer, new bubbles and
  answers fading in from the motion tokens, and the shared state / events
  panel ("What Zen AI sees", a `DescriptionList` and the event list) opened from the bar over the screen's edge instead of
  a JSON column. The conversation scrolls to its end once an answer's UI renders, on the phone too. While the AI works,
  a frosted glass sphere (after the Dribbble shot "Sphere AI Assistant": a pink pool, a lavender haze and an aurora
  band of cyan drifting inside, from the Support tokens) sits in the bubble that waits for the answer and on the
  composer card's type row; reduced motion keeps it still. A new example, "Composed while typing, on a phone": the
  card rises above the docked field (a keyboard would cover nothing, the preview pushes the greeting up, the screen
  follows the field), with a "Keep as …" button in place of the keys. The composer listens in real time: from the
  first character the card shows "Zen AI · listening" with the sphere beating on each keystroke; a sentence the keyword
  classifier does not know still goes to the composer as it is once a few words are in (the model when one is
  configured; the demo composer says what it can build), and the slot chips stop being buttons once the form is shown.
- Accordion `size="sm"` (Figma Accordion/Text and .Primitives/Accordion/Content Size=Small, added 2026-10-15, user):
  for dense panels and cards — title Body/Base/Bold, content Body/Small/Regular, Padding/Small and Gap/Small, the 20px
  chevron on the title's line, Box Corner-Radius/Base. Example: Accordion › Layer settings.
- Widget patterns, batch 1 (2026-10-14, user): a **Widgets** page on the platform and a **Widgets** group in Zen
  Studio's palette with 20 dashboard widgets — seven metric cards (KPI, sparkline, spark bars, goal progress, period
  comparison, category split, hero) and thirteen chart cards — one source for both, carried by Export › Figma and
  Import from Figma.
- `MetricCard type` (Figma Metric-Card Type): `kpi` (default, unchanged) · `sparkline` · `spark-bars` ·
  `goal-progress` · `comparison` · `category-bar` · `hero`, with `series`, `goal`, `comparison`, `categories`,
  `footer`. The sparkline's area fades like the line chart's, its top edge on the line. A `comparison` card's title is a heading
  (`headingLevel`, default 3, as ChartCard's). In Zen Studio a MetricCard keeps the switches of the Metric it holds
  (Trend, Hint, Label-Icon, Custom…) beside its Type and Card.
- `Card theme="solid"` and `color` (Figma Card Theme=Solid and Color): Pale in nine colours, Solid in Neutral (the dark
  widget), Brand, Cyan, Yellow and Orange; `surface="flat"` for Border cards on a Canvas/Flat page. A Solid card keeps
  the page's mode and points its content, borders, tracks and chart marks at the Inverse / On-Color tokens, as Figma's
  dark Hero. `MetricCard` and `ChartCard` take `color`. Harness: `card/color-ignored`, `card/solid-color`,
  `card/surface-ignored`, `metric/type-data`, `metric/category-count`. Zen Studio maps Card Theme, Color and Surface
  and Metric-Card Type both ways and shows them in the inspector.
- `docs/qa/component-review-checklist.md`: the review checklist (Figma, a11y, security, React, code, tests).
- `tests/smoke/conformance.test.tsx`: every public component renders under StrictMode, forwards `ref`, keeps
  `className` and leaves nothing behind after unmount.
- Popover `width` (2026-10-14, user): unset keeps Figma's Fixed 240; `"fill"` takes the anchor's width (suggestions
  under a long search bar), `"hug"` grows to the longest row and is never narrower than the anchor (long domains, file
  paths), a number is a Fixed width; `maxWidth` caps it. All keep Figma's 240 min width and stay inside the window.
  SelectField passes it as `popoverWidth`. Examples: Popover › Search results (fill), Pick a domain (hug).
  Fixed with it: a SelectField value longer than the field ends in "…" (it spilled out and was cut off).
- `ColorField`, `ColorPicker` and `ColorSwatch` (2026-10-14, user, from the Zen Figma file): pick or type any colour.
  ColorField is the Input field (a swatch and the hex) that opens ColorPicker (saturation × brightness area, the hue on
  Slider, a Format select Hex · RGB · HSL · HSB with its channels, saved colours on ColorSelector); values are hex.
  `layout="inline"` on InputField, SelectField and ColorField (Figma Input/Inline-Field): the label inside the field
  for dense property panels. Harness `color-picker/hex-value`; Studio palette (Colour field, Colour picker, Colour
  swatch, Inline field) and Figma property rows; platform page Color Picker.
- `SliderField` (2026-10-14, user, Figma Slider/Field 15662:108207): a number that is also a slider for property
  panels. The whole field is the track (Input tokens, the value as a Background/Subtle fill); drag scrubs, a click or
  Enter types an exact number, arrows step. Harness `slider-field/value-in-range`; Studio palette (Slider field) and
  Figma property rows; platform page Slider Field.
- `CurvePreview` (2026-10-14, user, Figma Chart/Curve-Preview 15663:110887): a picture of a motion curve (spring,
  bounce, ease-out, ease-in-out) for the motion settings it sits above; `bounce` (0–1) follows the panel's Bounce
  row. Input surface, Pale grid, dashed target; the curves match Figma's to 0.05px. Harness
  `curve-preview/bounce-range`; Studio palette (Curve preview, Charts) and the Figma Type row; platform page Curve
  Preview.
- Customize without forking or detaching: `skills/zen-component-usage/references/customize-in-code.md` and
  `skills/zen-figma-design/references/customize-without-detach.md`; Figma audit rule `bounds/stroke-clip-gap`.
- Seven charts from the Zen Figma file (2026-10-14, user), in the chart family's language (dashed grid, Tooltip lane,
  legend, `chartPalette`, draw-in with a reduced-motion fade, keyboard and a live summary): `AreaChart` (one area, or
  `type="stacked"` bands), `GroupedBarChart` (2–3 series side by side), `ComboChart` (bars and a line on two axes),
  `GaugeChart` (a half-ring meter with a target tick), `FunnelChart` (stages as shares of the first), `BarList` (a
  ranking with the names in the bars) and `BulletChart` (goals: actual bar, target tick). Each sits in a `ChartCard`,
  has examples on the Chart page, Do/Don't pairs and harness rules (`chart/series-need-legend`,
  `chart/area-series-count`, `chart/grouped-series-count`, `chart/combo-needs-labels`, `chart/gauge-in-range`,
  `chart/funnel-stages`, `chart/bar-list-rows`, `chart/bar-list-ranked`, `chart/bullet-rows`). The new legends use
  Figma's wider spacing (`ChartLegend gap="small"`).
- Zen Studio: the Charts palette offers the seven (Area and Stacked area apart), and Export › Figma / Import from
  Figma map every chart to its Figma set (15 kinds, Multi-Line by its number of periods), the ChartCard header and
  theme included; a chart without a ChartCard goes to Figma with its heading hidden. Figma draws its own sample data:
  a pulled chart takes the palette's sample.
- Support background Rich (2026-10-14, user): every Support background set (the 18 colours, Brand and Neutral) gains
  `Color/Background/Support/<colour>/Rich` = ramp step 11, between Solid (9) and Deep (12), as
  `--zen-color-background-support-<colour>-rich` in Light and Dark; created in the live Figma file too. The foundations
  page lists each set as Deep, Rich, Solid, Soft, Subtle, Pale.
- Chat reply in Figma (2026-10-13, user, live file): page ❖ Chat › "Chat Reply" now holds `Chat/Reply/Quote` (Side ×
  Kind: Text · Photo · File · Call · Voice · Deleted), `Chat/Conversation/Reply` (the reply bubble tucked 12px over its
  quote, Avatar / Sent / bubble swap as Chat/Conversation/Bubble) and `Chat/Composer-Reply` (the Replying-to bar above
  Chat-Control), built from `ChatReply` with its tokens and measurements.
- ListItem `value` · `valueCaption` · `valueTone` (2026-10-13, user): a row that ends in an amount (a transaction, a
  total) mirrors the title stack on the right — Body/Base/Bold over Body/Small/Regular Light, right-aligned, tabular
  figures, never cut (the title truncates first); `valueTone` takes a Content tone (`positive-light` for money in).
  Code-only (Figma: a text stack in the Trailing slot). New example "Transactions on a phone" on List Item.
- House rule (2026-10-13, user): a See all / Show all at a section head is underlined text, not a button (it takes
  no more room than its words): `<Link tone="inherit">` in a Body/Base/Medium Text, `href` when it opens the full list,
  `as="button"` + `aria-expanded` when it expands the list in place. Link and List Item guidelines; Dashboard template
  "Recent activity" and the Transactions example follow it.
- Figma descriptions (2026-10-13, user): the live library now describes all 168 public component sets (when to use,
  what instead, properties, rules), 592 variables (semantic colours by layer and role, the spacing ladder, radii,
  breakpoints, emphasis, dimensions) and every text, effect and paint style, written from the guidelines, usage rules
  and harness by `tools/figma-docs/build.mjs` (rerun it after a rule changes). The 🔤 Typography page has a new
  Content-Hierarchy section: the heading/text-style ladder for desktop, phone and overlays plus the outline rules.
- AI kit for Figma (2026-10-13, user): Installation › AI kit for Figma downloads `zen-figma-ai-kit.zip` (built in the
  browser from the repo) so Claude or ChatGPT/Codex can design in a Zen Figma file through Figma's MCP server: the skill
  `skills/zen-figma-design` (setup, hard rules, build steps, screen rules, Plugin API gotchas), the read-only audit
  harness `harness/zen-figma-audit.js` (24 rules: unbound colours/spacing/radii, text and effect styles, paint overrides
  and lost icon colours inside instances, overflow (Zen's bleed, one button centred in a smaller non-clipping wrapper
  like Sidebar Collapse, is allowed), clipping, a drop shadow cut by a clipping frame (measured from the effect; an
  error on the screen's own frames), crushed or shifted text, placeholder copy, and theme pairing: boxes and navigation
  surfaces that clash with the Canvas, one elevation and one colour mode per screen, no gradient boxes), the generated
  Figma component-property and variable/style references, the usage rules and every guideline. `npm run ai-kit:build`
  writes the same zip to dist-pack/, `npm run ai-kit:check` verifies it.
- Side Panel: `top` (Figma Top-Customize, above the header), `headerContent` (Figma Header-Contents, under the caption)
  and `onBack` / `backLabel` (Figma Back-Container: a back button before the title).
- ProgressBar `layout="stacked"` (Figma Layout=Stacked): the label and the value on a row above the bar; `valueLabel`
  replaces the percentage ("3 of 5 steps"). The stacked label is Body/Base/Bold, the value Body/Base/Regular (Figma
  re-read 2026-10-13).
- **Chart family in one style, with motion** (the user, 2026-10-12; spec `docs/research/chart-family-spec-2026-10-12.md`):
  new `BarChart` (vertical or `orientation="horizontal"`, `projected` bars hatched, a `target` track), `DonutChart`
  (% pills, the total in the centre), `RadialChart` (ring gauges over dotted tracks) and `HeatmapChart` (row × column on
  five Support/Brand steps, 2D keys). `LineChart` takes `compare` (the line chart plus one dashed comparison line and a
  legend, Figma Chart/Multi-Line-Chart); `ChartCard` takes `icon`, `description` and `value`. Every chart shares the grid, labels, Tooltip, legend
  and keyboard, and draws itself in on mount and on new data (bars rise, lines wipe, rings sweep, cells pop; reduced
  motion fades; `animate={false}`). `showAverage` on LineChart, BarChart and StackBarChart draws a dotted rule at the mean (plain dots, no ring) with an
  "Avg" tag (Figma Show Average). Horizontal bars end each row with its value instead of a Tooltip over the bars. DonutChart slices are parted by even, straight 4px gaps and have 4px round corners, and
  `totalPosition="start"` puts the total beside the ring above the legend. Stacked columns now take Corner-Radius/Small
  on every corner, like the bars; projected bars and target tracks take the Figma hatch (Support/Neutral/Pale under
  Border/Neutral/Pale stripes). Zen
  Studio's Charts palette gains Bar, Horizontal bar, Line with comparison, Donut, Radial and Heatmap. Harness:
  `chart/needs-name`, `chart/shares-need-legend`, `chart/heatmap-needs-scale`.
- Grid `stackBelow={640}`: one column while the Grid itself is narrower than 640px (a side column in a narrow card or
  window), whatever the breakpoint. Stack and Box `scroll="y" | "x"`: Figma's Overflow scrolling (it clips, and the
  scroll stays inside). Box `surface="canvas"` for a whole screen drawn inside something else. Text and Heading
  `wrap={false}` (one line, Figma Auto width) and `tabularNumbers` (Figma Numbers: Tabular). Unset, each renders nothing
  new. Zen Studio → Figma pushes and pulls them (a Box's surface as its Color/Background fill, scroll as Overflow
  scrolling, maxHeight as Max height; Numbers: Tabular is read back, the plugin API cannot set it).
- Card and ListBox take `width`, `minWidth`, `maxWidth` and `alignSelf`, as Stack does (Figma's Fill container, Min
  and Max width on the instance): a card can fill its column up to a readable width and centre itself without a
  className. Unset, they render nothing new. The push to Figma writes them on the instance and a pull reads them back.
- Figma → tokens by pull request: the Zen Figma plugin's Export › **Push to GitHub** opens a draft on
  `zen/tokens/figma-sync-*` with the merged `tokens/source` files, and the new **Figma token sync** workflow commits the
  generated sources to it and starts CI (`ci.yml` now also runs on `workflow_dispatch`).
- Zen Studio → Figma (core rebuild Q4): Export › **Figma** downloads a page as `<page>.figma.json`; in the Zen Figma
  plugin, Import › **Import from Studio** places it on the page "Studio exports" as a frame of library instances
  (variants, nested overrides, slot content, auto layout bound to the Spacing variables, text styles), and importing it
  again updates that frame in place — data slots (Sidebar sections, Breadcrumbs, Segmented), the Dashboard header's
  rows and texts, Tables as Figma's Data-Rows and cells, absolute layers and pictures included. CLI:
  `node tools/studio/figma-push-cli.mjs <page.zen.tsx>`.
- Zen Studio ↔ Figma bindings (core rebuild Q5): after a Figma re-capture, Main component › **Check Figma bindings**
  lists the stylesheet changes that follow Figma's re-bound variables and applies the chosen ones as drafts
  (`node tools/studio/binding-diff.mjs`); saving a token edit of a component offers **Download for Figma**, a re-binding
  the Zen plugin applies to the component masters (Import from Studio, licensed).
- Table: `content: "actions"` with the column's `actions` (`TableRowAction`: icon, label, size, level, onClick) draws
  Figma's Actions-Cell — flat icon buttons named with their row ("Open, row 3"; label key `rowAction`, en/vi) — without
  a `cell` function; each button is the row's nested layer `Button`. The Studio offers Actions as a cell Content, and a
  Figma table pulled into the Studio keeps its Actions column (a row's own icon becomes that row's override).
- `AiChatBubble` takes `overrides`: its action buttons are nested layers (`Button`, `Button[1]`…), so the Studio edits
  them like Figma's nested instances; the tooltip under each button stays.
- Zen Studio speaks design words on pages made in the Studio (core-rebuild criterion 7): the status line, the canvas
  tag, the Inspector header (now "Show code"), notes and tooltips name no file:line and no code (`{…}`, `<Tag>`, prop,
  children); the Code tab keeps the line. Example and template pages keep the developer wording.

- `DashboardHeader`: one row of a dashboard page's header, as Figma's Primitives/Dashboard/Header draws it —
  `type="control-bar"` (Search, filter Chips, the result count, the page's actions), `navigation` (Breadcrumbs, then
  notifications and the account), `main` (the page title row: it renders a PageHeader) and `custom`. Inside an AppShell
  the rows go in `sections`. Harness: `dashboard-header/props-of-type`, `one-primary`, `main-needs-title`,
  `filters-are-chips`. A Figma Dashboard/Header pulled into Zen Studio becomes this component.
- `PageHeader` `childTitle`: a second title after the title in Content/Neutral/Light (Figma Child-Heading).
- Figma instance overrides in the library: 64 components that draw other Zen components inside themselves (Card,
  Button, Badge, Table, Sidebar, AppShell, Dialog, Menu, Popover, Tabs, Segmented, MetricCard, ChartCard, the Input
  fields' Label / Help-Text / Leading / Trailing, DatePicker, Search, Form, Chat, AiChat, Voice…) take
  `overrides`, the props of any nested layer by its Figma layer path, at any depth and row by row
  (`{ "Sub-Action": { level: "danger" } }`, `"Row[alex]/status/Badge"`, `"Item[team]/Item[members]/Badge-Counter"`). No
  DOM change and nothing changes without it. Zen Studio writes it; new harness rule `api/overrides-studio-only` reports it
  in hand-written code (pages Zen Studio made, `// @zen-page`, are exempt).
- Zen Studio: nested instances like Figma on pages you made — ⌘-click into a component reaches its nested instances at
  any depth (a Card's Sub-Action, the icon inside it, one Table row's Badge), and the Inspector shows that instance's
  Figma properties; an edit changes this instance only (one undo step), with Reset all overrides per layer. A Table cell's
  component gets a "this row" section above the column's settings.
- Zen Studio, pages you made: the selection stays on its layer through edits, undo and redo, also when layers above it
  come and go or it moves (each layer keeps an id beside the page); a double-click goes one nested instance deeper at a
  time, as in Figma (Card › Sub-Action › Icon; a Table row's Badge), and Layers names nested instances by their Figma
  layer name.
- Zen Studio, pages you made: one row of a list is edited on its own, like one instance in Figma — a layer a list draws
  shows "Changes go to · Row N · All rows"; a change goes to that row (the rows get a field, the layer reads it), "All
  rows" changes every row. A photo picked or dropped on one row's Avatar goes to that row too.
- Zen Studio export: a page with nested overrides and a row's own values exports as React that passes the usage
  harness and TypeScript in an app (`api/overrides-studio-only` treats an exported page as Studio code; a row's value
  of a fixed-choice prop is typed as that prop), and draws what the canvas draws (new browser test).
- Zen Studio: `tools/studio/figma-pull.mjs` turns a Figma frame made with the Zen library (read with use_figma) into a
  page you made — components with the properties that differ from their defaults, overridden nested instances as
  `overrides`, auto layout as Stack, text as Text; what has no Zen component is listed. Run on the live file: a slot's
  layers become the component's content, data (Sidebar sections, Breadcrumbs and Segmented items, the selected item) or
  a node prop (Sidebar brand and footer); Fill container, grid placement, text alignment and absolute layers carry over,
  and icon-only buttons get an aria-label.
- Zen Studio: importing a later pull of a Figma frame you already pulled opens Update from Figma — what changed in Figma
  since the last pull, one checkbox each, with the spots you also edited in the Studio left unticked — and Apply updates
  the page in one step (one ⌘Z), keeping your own edits and layers.
- Zen Studio: a Figma table (its Data-Row instances) pulled into a page becomes a Table — its columns with their
  headers, sorting, widths, bold and cell content, its rows, and each row's badge colours and emoji icons as in Figma; a
  later pull updates its rows too. A column of action buttons is left out and noted. A Search keeps its text as its
  placeholder.
- Zen Studio, a design copy (New page from this frame): a photo goes on one avatar of an AvatarStack (that layer's
  override), and a Table column whose cells draw a person's photo keeps it as an Avatar column; the avatar test passes
  on the avatar, card, App Shell, table and sidebar pages.
- QA: the Build-QA gate checks nested layer names against Figma ("Nested layer names (code ↔ Figma)",
  `tools/figma-contract/nested-paths.mjs`): every layer a component's `overrides` reaches is a nested instance of its
  Figma sets. DatePicker's footer button and time picker take Figma's names: `overrides` paths `Actions/Submit` (was
  `Actions/Apply`) and `Time-Picker` (was `Time`).
- QA: `studio:build-check` engine budget 160 KB gzip (was 140; the user's choice over splitting the engine), and the
  check matches today's Studio again (it had hung for hours).
- Zen Studio: replace a picture like Figma, everywhere — Avatar, Image, Thumbnail and the App Shell account take a photo from
  Assets › Photos (click with the layer selected, or drag the photo onto the layer) and from the Inspector's Picture
  picker, in example and template code as well as on pages you made. A picture bound to a row's data (a Table cell, a
  `.map` row, a person in `examples/data.ts`, through a factory's `{ …extra }`) changes that row only; one bound to the
  shared `platformMedia` library becomes the layer's own; a repo file takes the picture as
  `new URL("<file>", import.meta.url).href` (dev and build), a page you made keeps `zen-media:`. ⌘-click selects the
  innermost written layer under the pointer even when a row's data passes it in (an Avatar in a ListItem's leading).
- Table: `defaultSelectedIds` keeps a selection without app state; `editable` (whole table) and `column.edit: "text" | "number" | "select" | "tags" | true`
  put cells in Figma's State=Edit without an editor object (the Table keeps the edit, or `onCellCommit` gets it). Zen Studio: a Data-Row's
  State Default · Selected, Checkbox and Editable, a Cell's State Default · Edit · Selected, written to the page. Harness
  `table/interaction-needs-handler` warns only for `selectable` + `selectedIds` without `onSelectionChange`.
- **Zen Studio: Main component frame, M1 (2026-10-09, spec `docs/research/studio-main-component-spec-2026-10-09.md`):**
  beside the Playground, every Figma component set of the page's components is drawn as Figma lays it out (Button: Main,
  Flat, Overlay, Icon-Main, Icon-Flat, Icon-Overlay — 178 variants; overlay sets on a photo). A click selects a variant,
  a double-click goes one layer in, ⌘-click selects the deepest layer; Layers lists sets, variants and their layers. The
  Inspector shows the variant's Figma properties (switching Size or Level selects that variant) and, for each style the
  library's CSS sets, the token it reads, the custom properties in between and the variants its rule covers ("Size = xs
  · every Level, State").
- **Zen Studio: Main component, M2 — change a token (2026-10-09):** each style row whose rule reads a token has a token
  select (its family first — button-size-*, spacing-gap-*, corner-radius-* — then every token of its kind, with the value
  each stands for; searchable). The pick rewrites that one declaration of the component's CSS (src/components/…/*.css)
  as a draft: every variant the rule covers updates at once, ⌘Z / ⇧⌘Z work, and the panel saves or discards the
  stylesheet's draft. Only existing tokens are accepted (a raw value is refused).
- **Zen Studio: iOS or Android bars on a page you make (2026-10-10):** Page › Mobile OS picks iOS (default) or Android
  for the page; its phone and tablet Screens draw that OS's status bar and bottom bar (iOS: island and home indicator as
  Figma's Status-bar/IOS; Android, Material 3: 24px status bar with a punch-hole and the gesture handle), with dummy
  status icons, on the canvas, in Play and in the design-file export. Content and a Top / Bottom Navigation pad by the
  bars (`--zen-safe-area-top/-bottom`, as the docs' phone frames do).
- **Zen Studio: Main component, M3 — the Figma check on save (2026-10-10):** saving a component's stylesheet runs its
  Figma contract suites in the background (Button: 7 suites, about 10–90 s); the status line says it is checking, then
  that it matches. When the code no longer matches Figma, a dialog lists where (suite, variant, layer, property, Figma vs
  code) with **Keep and log for Figma** (one P2 line under Open items in docs/context/BACKLOG.md) or **Undo the save**
  (the stylesheet's text before the save comes back, unless the file changed since).
- **Sidebar slots like Figma (2026-10-09, ❖ Sidebar 6849:33453):** `<SidebarMenuItem>` (Figma Menu-Item 1536:27473)
  and `<SidebarMenuSection label>` fill the Body-Content slot as `<Sidebar>` children (after `sections`, nested rows as
  item children), the Footer-Content slot (`footer`) and a `SidebarSubMenu`; slot rows share `selectedId`, the rail and
  `onItemClick`. `sections` / `items` arrays keep working. The Sidebar examples use them (footer Settings / Help,
  Handbook body).
- **Zen Studio: slots edit content written as code (2026-10-09):** Move up / down and drag move a child written as
  `{open && <X />}`, `{a ? <X /> : <Y />}` or `{rows.map(…)}` as one block (the canvas, Layers and the Slots section),
  where it was refused before; a slot that shows a same-file `const name = <JSX>` (HR's `footer={appsButton}`,
  `brand={workspaceBrand}`) takes inserts, duplicates, removals and moves where the const is written, so every place
  that shows it changes (the Slots section says so); a prop that holds code (`footer={open ? <A /> : null}`) takes an
  insert as `<>{code}<New /></>`. One row of a `.map` is its data: Remove, Duplicate (⌘D) and Move up / down on a row
  edit the list where it is written (inline, a const, examples/data.ts, a `useState` start value), the other rows stay,
  a copy gets a key no row has (`ava-copy`) and the copy or moved row stays selected. `tools/studio/slot-audit.mjs`
  (`--ops`) runs every slot op in memory over the examples and templates: 616 refused moves, 58 refused const edits,
  103 refused row removals and copies and 89 refused inserts are now done.
- **Zen Studio: a nested part edits what its owner passes on (2026-10-09):** like Figma's exposed nested instances, a
  deep-selected part (⌘-click: the ModalActions of a Dialog or ModalForm) lists the props its owner passes on unchanged
  under Properties and writes them to the owner: Direction → `actionsDirection` (Figma Modal › Buttons › Direction).
  Read from the component sources for every component (`tools/studio/part-props-build.mjs`, 74 owners), through the
  components in between; the rest of a part stays read-only.
- **Zen Studio: Sidebar and Page Header slots (2026-10-09):** a selected Sidebar shows Figma's Header-Content
  (`brand`), Body-Content (children) and Footer-Content (`footer`); a Page Header its Action-Slots (`actions`) and
  Trailing-Slots (`trailing`): outlined on the canvas with a "+", listed in the Slots section. The insert picker offers
  Menu item / Menu section (not recommended outside a Sidebar). A new page's Sidebar writes its rows as
  `<SidebarMenuItem>` children, so each row is a layer. Screen › Sidebar / Page header (and the phone bars) are Toggles.
- **Voice (2026-10-09, Figma ❖ Voice 15081:1294):** `VoiceRecorder` (State Ready · Recording · Paused: the take's time,
  an 80px waveform and its timeline, Discard · Record / Pause / Resume · Finish, the input and format) and
  `AiVoiceConversation` (Ready · Listening · Responding: the voice signal, the status, the transcript card, Mute · Start
  talking / Done speaking / Interrupt · End; its status is a real heading, `headingLevel` 3 by default). A main action
  without its handler is off (leave out `onResume` once a take reaches its limit). New page Components › Voice; harness
  `voice/actions-wired`; new labels (en / vi).
- **ChatVoice (2026-10-09, Figma Chat/Bubble/Voice 15084:80205):** a voice message bubble — play / pause, a waveform
  whose played share is full strength, a 1× · 1.5× · 2× speed button; Business adds the length, Ready to play / Playing
  and the time. Held like a file (Reply · Forward · Pin · Delete).
- **AiChatField `listening` and `onVoiceMode` (2026-10-09, Figma State=Voice):** dictation — the prompt reads
  Listening… and the microphone becomes Stop (`onStopListening`); `onVoiceMode` gives the empty field's Voice action its
  own handler (voice mode, e.g. an AiVoiceConversation), apart from the microphone's dictation (`onVoice`, its default).
- **PageHeader: title and description 4px apart (2026-10-09, Figma Header-Text, Spacing/Gap/2XSmall):** was 8px; the
  header's other parts keep Gap/XSmall.
- **Table columns pick their cell content, as Figma's Table/Cell/Default › Content (2026-10-10):** a column without a
  `cell` function draws `content` from the row's `field` (default its id): text, avatar, photo, icon, dock-icon (with
  `captionField` Subtext, `mediaField` picture or icon, `bold`), badge or tag (one per value), trend (by the value's
  sign), progress (0–100), checkbox or toggle (a boolean). `cell` is now optional. Zen Studio's Inspector offers Content
  for every column, a page made in the Studio can hold it, and Assets › Table inserts columns of each kind (its
  preview, empty before, now draws).
- **Zen Studio: Table rows and cells as in Figma (2026-10-10):** a double-click goes Table → Data-Row → Cell → its
  content → its text, Escape back out, and with a row or a cell selected a click picks the one under the pointer;
  Layers lists Table › Header, Data-Row › Cell. A Cell's Inspector is Figma's Table/Cell/Default: Content (Text, Avatar,
  Photo, Icon, Dock Icon, Badge, Tag, Trend, Progress, Checkbox, Toggle), Align, then the content's Bold and Subtext and
  the row's value — written on the column (a `cell` column's element is swapped; a column without `cell` gets its
  `content`, `bold`, `captionField`, `mediaField`). A cell's text and a Data-Row's fields edit that row's data in
  templates and examples too: the row is found by its key (or its fields) in the data the Table reads, through sorts,
  filters, useMemo, useState and factory calls, and lookups such as `people[row.id].name` write the entry they read.
  A component nested in a cell (an Avatar, a Badge) edits its own props: a fixed value on the cell's JSX (every row), a
  prop bound to the row (`theme={row.theme}`, `theme={statusTheme[row.status]}`) in that row's data, and a prop a
  component of the file passes on (`<PersonAvatar size="sm">`'s Avatar) where that component is used. A row written in
  place takes a field it lacks (a picture for a row without one), and on a page you made an Avatar or Photo cell's
  Picture is the photo picker (a Table row's `zen-media:` picture is drawn).
- **Zen Studio: App Shell, Top Navigation and Sidebar row slots (2026-10-10):** a selected App Shell shows Figma's
  Sidebar, Leading-Slots, Center-Slots (Search, Segmented, Tabs), Trailing-Slots, Sections, Side-Panel, Floating-Item
  and Footer as slots (outlined, "+", the Slots section); a Top Navigation's title leading takes an Avatar, a Sidebar
  row's Trailing-Slot an Icon, Badge or Text and a section its Action. Any component prop that is a registered slot is
  a switch that puts the real component in (it was a text field), and a double-click on text inside a padding area
  reaches the text instead of stopping at the spacing handle.
- **Table: an Icon cell without `mediaField` draws Figma's default icon (2026-10-10):** `icon-face-smile-line`, where an
  unknown icon name drew nothing.
- **Liquid Glass, as Figma draws it (2026-10-10, GLASS effects Liquid-Glass/Normal · Glass-Floating):** AI Chat-Field
  Style=Liquid Glass, the Top Navigation's glass actions (Nav-Action/Liquid-Glass, Liquid Glass and overlay types) and
  the Bottom Navigation Floating-Glass bar, its CTA and its selected item now bend the picture behind them at the rim
  (refraction over the effect's depth), split its colours there (dispersion), frost it and light the bevel from Figma's
  light angle, with the effect style's own values (`src/styles/generated/glass-styles.ts`, from the Figma styles).
  Chromium draws the bend (an SVG backdrop filter); other browsers and `prefers-reduced-transparency` keep the frost.
- **Zen Studio Quick insert / Swap (2026-10-10):** the preview sits in the middle of its pane, by what the item paints
  (a row of buttons justified to the end is centred, not pushed right), with Padding/XLarge around it; the line under the
  search ("Swap … for the chosen component", where an item lands) lines up with the search's icon, Padding/XSmall above,
  and is no longer cut; a heading is centred by its words, and every item is placed again when the focus moves.
- **Zen Studio: sections are easy to select on the canvas (2026-10-10):** double-clicks go Sidebar → section → row →
  its text, as in Figma; with a section selected, a click on another section selects that one, and Escape climbs back
  one level (row's label → row → section → Sidebar). A double-click on a row's or a section title's text that the canvas
  cannot edit in place puts the cursor in its Label field (E2E SP-11).
- **Zen Studio: ⇧A and + everywhere (2026-10-10):** ⇧A on Sidebar rows written as children puts them in a Menu
  section (`SidebarMenuSection`), on several TopNavigation actions puts them in one pill; a list that cannot group (Tabs,
  Breadcrumbs…) says so. "+ Add Action" (and any list item whose action shows a toast) now adds on a page you make,
  as a `proto.toast` action.
- **Zen Studio: several list items at once (2026-10-10):** with a Sidebar row (or any list item) selected, ⌘-click adds
  another and ⇧-click a range, on the canvas and in Layers; the Inspector says how many are selected, ⇧A (or Group into
  a section) puts them in a new section of their own and Delete removes them, each one undo step. Items read as Figma
  names them on the canvas (Menu-Item in Body-Content).
- **Zen Studio Delete key (2026-10-10):** Delete / Backspace removes a focused row in the Slots section (a layer, a list
  item, a section title, a separator) as its trash button does; on the Pages list it moves a page to the Trash and asks
  before deleting a folder.
- **Zen Studio: slots as free as Figma's (2026-10-10):** a Sidebar's Body-Content is one slot, as in Figma: its section
  titles and rows in one list (then any row components), where every row moves anywhere (across titles too), goes, or
  is added at the end or inside a section (its own +); a title removed lets its rows join the section above, and
  Remove all empties it. On the canvas and in Layers a section, its Section-Title and its rows are selected, renamed,
  added to and deleted (Delete key). A Menu's Item-List works the same with items, separators and section titles,
  and a Menu group's items edit in the Menu's Properties. On a page you make a slot's last child goes too, even where
  the component type asks for children.
- **Zen Studio: Sidebar rows and every library component editable on pages you make (2026-10-10):** a Sidebar's
  `sections` rows are Figma's Body-Content Menu-Items: a double-click (or ⌘-click) selects one, its Label, Icon,
  Counter, Notification dot, Theme, State… edit that row, and it duplicates, moves within its section and is removed
  like any slot item. A double-click on a selected Breadcrumbs, Tabs or Sidebar reaches the item under the pointer
  before its text. Pagination, Image, Calendar, NPS scale, Colour selector, File upload, Bottom navigation, Chat thread
  and Chat composer now insert on a page you make (static versions); a chart's per-series values and a list of numbers
  edit field by field; an element written in a prop (a Menu's trigger) says to select it instead of "change it in the
  code". The Pages list renames a page or folder in place on a double-click (Rename in the ⋯ menu too).
- **Sidebar collapsed rail (2026-10-10):** the divider before a later group of rows sits Spacing/Gap/XSmall above its
  first row too (Figma draws 2px), so a selected row's fill no longer touches it.
- **Breadcrumbs per crumb (2026-10-10):** each item takes Figma's Item-List instance properties on its own: `level`
  (Master / Sub), `emphasis`, `state` (Hover, for mockups) and `dash` (the chevron after it). Unset fields keep the old
  trail (the first crumb Master while `master` is on, Breadcrumbs' `emphasis`, a chevron after all but the last); a
  BreadcrumbItem child's own `level` / `emphasis` / `state` now count too. New example "Next level". In Zen Studio a
  selected crumb shows these rows, with the values the canvas draws when they are unset.
- **Zen Studio photo picker (2026-10-10):** an Avatar's, account's or Image's Src on a page you made picks a picture
  (your uploads, people photos, the library) instead of a text field, and a photo clicked in Assets with an Avatar
  selected becomes its picture instead of a new Image.
- **Zen Studio nested items (2026-10-10):** a crumb, tab, segment, step, Description List item, Bottom Navigation item
  or Bottom Sheet action ⌘-clicked on the canvas is selected as that item, with its own fields, move / duplicate /
  remove and the props its owner passes to every item (a crumb's Emphasis, a tab's Variant, a segment's Level), where
  only Breadcrumbs and Top Navigation items were found before and the rest were read-only.
- **Zen Studio Pages list (2026-10-10):** a long page or folder name ends in "…" before its actions, instead of being cut
  at the panel's edge.
- **Progressive blur grows linearly (2026-10-10):** the Top Navigation's blurring types and the Floating Bottom
  Navigation now ramp the blur evenly from 0 to the Figma radius (six stacked blurs whose σ² add up), where the five
  equal layers reached most of the blur within the first fifth.
- **SelectField options take Figma's Popover Item content (2026-10-09, .Primitives/Popover/Item/Content):** `theme`
  (icon · text-only · photo-small · photo-big · avatar-small · avatar-big · dock-icon · badge), `leading`, `caption`
  (Subtext), `photoSrc` / `photoAlt`, `badgeTheme` — drawn in the open list (and a phone's sheet); the field still shows
  the label. Zen Studio's Options editor offers them.
- **AppShell follows its Sidebar's `collapsed` (2026-10-09):** an uncontrolled shell starts from it as before and now
  also moves the rail when the prop changes (edited code, Zen Studio's Collapsed toggle on a page made from a template).
- **List slots as children (2026-10-09, Figma Item-List / Nav-Items):** Tabs takes `<TabItem value label />`,
  Breadcrumbs `<BreadcrumbItem item />`, Stepper `<StepperStep id title caption />` and BottomNavigation
  `<BottomNavigationItem id label icon />` children instead of their array (`items` / `steps` stay and win when given);
  the parent keeps selection, keyboard and ids, and renders the same markup either way. StepperStep and
  BottomNavigationItem render nothing on their own. Shared helper `_shared/slots.ts` (Sidebar's slots use it too).
- **AppShell `headerCenter` and `sections`; PageHeader `trailing` (2026-10-09, Figma slots):** the top bar's
  Center-Slots (up to 400px, centred — a Search), Header/Dashboard's Sections (rows under the top bar, each padded as a
  header row) and the Main row's Trailing-Slots (icon actions after the page's buttons).
- **Table `bulkActions` (2026-10-08):** a selectable Table shows a Popover/Bulk-Action bar under the table while rows are
  selected — Clear selection, "N selected" and your actions (`TableBulkAction[]`: id, icon, label, onClick, disabled,
  group; or a function of the selected ids) — held at the bottom of the window on a long table. Actions that don't fit
  the width (phones) move into a More menu instead of wrapping. Escape clears the selection; Select all rows takes the focus when the bar leaves.
  New labels `rowsSelected`, `selectedRowActions`, `clearSelection` (en/vi). The Table playground and "Act on selected
  rows" example use it.
- **Metric-Inline props from Figma (2026-10-08):** `metricColor` (Metric-Color: a dot before the label, Accent/Solid
  or a chart series colour), `counter` (a Small Neutral Subtle Badge after the label), and on Title-Highlight `labelIcon`
  (24px before the title) and `hint` (an info icon whose Tooltip explains the number).
- **DatePickerSheet: dates on a phone (2026-10-07, Figma Date-Picker/Mobile 9923:3576):** a Bottom Sheet picker.
  `selectionMode="single"` shows one month with Cancel / OK; `"range"` stacks the months under one pinned weekday row
  and ends in Footer-Actions (your `summary`, e.g. the price for the nights, beside OK). Picks are a draft until OK.
  DateField opens it by itself at the mobile breakpoint instead of the desktop popover. New: DatePicker
  `calendar="stacked"` + `monthCount`, BottomSheet `footer` (your own Footer content), label key `ok` (en "OK", vi
  "Xong"). DatePicker's month header is a `div` (a `<header>` per month made duplicate banner landmarks).
- **Sidebar on a phone (2026-10-07):** the Sidebar page shows it as the AppShell drawer in a phone. AppShell's drawer now
  keeps clear of a phone's status bar and home indicator (safe areas; nothing changes on desktop or tablet).
- **Metric Title-Highlight `custom` (2026-10-07, Figma Custom-Slot):** your own content under the number (a
  ProgressBar, a sparkline), the corner Dock-Icon staying beside the number. Metric page: "Budget with progress".
- **Tooltip `closable` (2026-10-07, Figma Close=Yes added the same day):** a dismiss X after the label for a tooltip open
  from the start — `defaultOpen`, or `open` + the new `onOpenChange` — such as a tip on a phone, where touch never opens
  a tooltip. It stays until its X or Escape closes it and is a `note`. The Tooltip page has a phone example.
- **ToggleListItem and ChipGroup (2026-10-07, backlog batch 6):** `<ToggleListItem>` is a settings row whose whole
  surface flips its switch (title names it, caption describes it); `<ChipGroup>` is a single-choice radio group of
  Normal chips (one Tab stop, arrow keys move the choice). Both are composed from the existing Figma primitives (no
  Figma master yet). Sidebar takes `searchCollapsed`, what the collapsed rail shows in place of `search`. Harness:
  `list-item/switch-row`, `chip/radio-is-chip-group`.
- Docs platform and Zen Studio: required sign-in with Google through PocketBase (`src/platform/auth/`); Log out in the
  platform topbar's account menu and in the Studio brand menu. Automated browsers (QA gate, E2E) skip the sign-in screen.
- **Zen-High-Contrast (2026-10-05, prototype):** `<ZenProvider contrast="high">` (or `"system"`, which follows the OS
  Increase Contrast setting, `prefers-contrast: more`) switches the Global Colors to a high-contrast mode. Subtle borders
  (Checkbox, Radio, Subtle controls) reach 3:1, the placeholder and Light text 4.5:1, a colour's Light text 4.5:1 and its
  Base text 4.5:1 on its own Subtle background. Step 9 of every colour, the backgrounds and the text on Solid fills keep
  their values (user rule), so no token is added. The Zen Plugin writes the mode into Figma with the same algorithm
  after every Global Colors write (and on Color Scales › Create Variables › Sync High Contrast); since the 2026-10-05
  evening export the repo takes it from Figma (all 960 values equal `scripts/high-contrast.mjs`, which stays the
  fallback), and `tokens:check` verifies the rules either way. Docs: a Contrast control in the classic top bar and the Studio Modes menu, `?contrast=high`, and
  `shoot.mjs --contrast=high`. axe on 14 pages, Light: about 880 failing text nodes → about 40, the rest being white
  initials on step-9 Avatars and the docs code view.
- **Sky, Mint, Bronze and Golden themes (2026-10-05, from the live Figma sets):** Avatar, Badge and BadgeCounter take
  `theme="sky" | "mint" | "bronze" | "golden"`, and DockIcon takes `"sky" | "mint" | "bronze"` (it already had Golden).
  Solid fills use Support/<colour>/Solid. Text on Sky and Mint is On-Brights (dark), on Bronze and Golden On-Colors
  (white); DockIcon icons are On-Colors for all four, as in Figma. Subtle fills use Support/<colour>/Subtle with
  Strongest text and Light icons. New tokens: the Support Sky and Mint sets (Content, Background and Border, 20 in all),
  and Text/Heading/Icon `tone` takes `support-sky-*` and `support-mint-*` (Lights group: no Light text).
- **`npx zen-ds audit <url…>` (2026-10-05):** checks an app's pages as rendered, in Chromium: the page scrolling
  sideways, broken images, controls without a name, nested controls, Surface boxes on a Canvas/Alt page without a border,
  duplicate ids, phone targets under 24px, text under 3:1, the heading outline, Zen text styles / tokens / hierarchy /
  rhythm / spacing ladder, text wider than its box, and axe-core when installed (its 4.5:1 contrast rule with
  `--wcag-contrast`). Screenshots at 1440 and 390 (and dark with `--dark`), `.zen-audit/report.md` + `report.json`; exit 1
  on an error, `--strict` on warnings too. Needs Playwright in the app.
- **TopNavigation trailing groups never apply to Flat actions (2026-10-05):** the compact types draw Nav-Action/Flat, which
  never pairs (Figma's Icon-Flat has no trailing icon; the component already ignored `group` there). Now the Studio
  follows: on a compact TopNavigation, dragging an action onto another only reorders, the Slots rows and the action's
  panel offer no Group / Take out of group, and a written `group` stays with a note ("draws no pill here") so it comes
  back with the other types; Properties warns under the actions. The playground hides Grouped trailing on the compact
  types. Data slots take `groups` as a test of the owner's props (`slotGroups`, `slotGroupsAt`, `groupsOffNote`).
- **One full-screen bar for the docs and the Studio; Present steps between examples (2026-10-05):** the classic docs'
  full screen (cards flagged `screen`, the App Shell playground) now uses the same bottom-centre bar as the Studio's
  Present (`FullScreenBar` in `PlatformFullScreen.tsx`, replacing `FullScreenExitButton`): the screen's name and Exit with
  its Esc hint, fading out while the pointer rests and staying while a keyboard user is on it. Present adds ‹ 3 / 7 › to
  step through the page's examples (← / → when the focus is not inside the example; the button keeps the focus) and no
  longer loses a desktop screen's full-window layout when a hot update remounts the card (ExampleCard `presented`).
- **Zen Studio: one light/dark, and Present gets its own controls (2026-10-05):** the toolbar sun/moon (now "Dark mode" /
  "Light mode"), Modes › Mode and Quick actions switch the Studio and the canvas together, so examples and playgrounds
  follow the interface instead of staying light on a dark Studio; a frame's own theme (frame toolbar, Frame panel) still
  wins. Present replaces the small "Exit full screen" pill at the top with a floating bar at the bottom centre in the
  canvas pills' style: the example's name, light/dark, Modes (component theme, size, typography, corner radius,
  emphasis in a panel above the bar) and Exit with its Esc hint. The bar fades out 2.5 s after the pointer stops and comes
  back on movement, hover or keyboard focus (Tab reaches it first); Escape closes an open panel before it leaves Present.
- **Text / Heading: `height`, `verticalAlign` and `align="justify"` (2026-10-05):** Figma's text box options.
  `height` (hug · fill · px, with `minHeight` / `maxHeight`) works as on Stack, Grid and Box (Figma's Fixed size text
  box). `verticalAlign` is `"top"` · `"middle"` · `"bottom"` (Figma's Align top / middle / bottom); it shows only when
  the box is taller than its text (CSS `align-content`; a clamped text packs its lines). `align` also takes `"justify"`
  (Figma's Justified), meant for long paragraphs in a wide column. New types: `TextAlign`, `TextVerticalAlign`.
- **Zen Studio: text alignment as in Figma (2026-10-05):** in the Text section of a selected Text or Heading, `align` is
  now Figma's Typography › Alignment, placed right under Style: icon-only Align left / Align center / Align right /
  Justified, each named by a tooltip after 1 s, and a "Vertical" row below it (Align top / middle / bottom) whose note
  says when the box has no room for it yet. A host text element (`<p>`, `<span>` with a text-style class) gets the same
  two rows, written as its inline style (`textAlign`, `alignContent`; the reset removes the key, or the whole `style`
  when it was the only one). Text and Heading resize on the canvas on both axes now, and Layout › Size shows H. Unset, it shows the alignment the text renders with (Center when a parent centres it);
  picking that one writes nothing, another writes `align`, and the row's reset removes it. `truncate` follows Figma's
  Truncate text + Max lines: the switch on writes `truncate` and shows Max lines (whole number ≥ 1; 1 writes `truncate`,
  N writes `truncate={N}`, a stepper writes at once), off removes it. `truncate={2}` in the code now reads as on · 2
  (before, the switch showed off and locked). A playground's boolean state keeps Max lines at 1, with the reason shown.
- **Every resting Color/Content token as a `tone` (2026-10-05):** Text, Heading and the new Icon `tone` take any resting
  content colour, spelled as its token path (`Content/Support/Blue/Light` → `tone="support-blue-light"`; Neutral keeps
  `strongest` · `base` · `light`; `hyperlink`, `on-accent`, `on-brights`, overlays, Inverse Base/Light…): 81 tones instead
  of 12. Old names stay as aliases (`secondary`, `accent` = `accent-base`, `inverse` = `inverse-strongest`); Icon without a
  tone keeps its parent's colour. Zen Studio's Tone picker lists them all, grouped by family with search. The harness rule
  `content/lights-no-light-text` now also checks a written `tone` (Light text stays allowed, sparingly, for help or error
  text and conditions in every family outside the Lights group). Shared source
  `src/components/_shared/contentTone.ts` + `content-tone.css`; test `tests/content-tone.test.tsx`.
- **Zen Studio E2E harness (2026-10-05):** `npm run studio:e2e` drives the Studio UI in Chromium on its own dev server
  (port 5190+, its own drafts) and writes a feature matrix of 65 rows (shell, selection, Inspector, keyboard, structural
  edits, data, overlays, drafts, read-only gate). Baseline: 42 work, 23 are broken; those 23 are the GĐ1 work list in
  `docs/research/studio-builder-plan-2026-10-05.md`. `npm run studio:selftest` runs the Studio self-tests. `npm run qa`
  now runs both whenever Studio files change, and no longer fails Studio files on "Page mapping".
- **Zen Studio fixes, GĐ1 (2026-10-05):** 18 E2E rows now work.
  - Menus and popovers in the chrome open on screen (the zoom menu no longer opens below the window).
  - ⇧1 fits every frame.
  - The toolbar fits a phone: Undo, Redo, theme and role move into the Zen Studio menu, and Modes becomes an icon.
  - Layers search with no match says so.
  - Delete works after using an Inspector control.
  - ⌘D in a text field no longer opens the bookmark dialog.
  - ⌘C works right after a canvas click.
  - Quick actions Duplicate and Remove act on every selected layer.
  - Right-click gives a canvas menu on the empty canvas, a frame menu on a frame, and Copy, Cut, Duplicate, Remove and
    Wrap for several layers. The layer menu shows all its items, moved up to fit the window.
  - "Detach instance" is labelled as in Figma.
  - Mixed properties work in shared component files.
  - Removing a layer also removes the `useState` only it read, and react's import when no `useState` is left.
  - Menu Move up / down keeps the layer selected.
  - Structural actions that cannot run show disabled with the reason instead of disappearing.
  - A toolbar "Read-only" chip says why the Studio cannot edit (built site, Viewer, non-localhost address, no dev
    server) and offers the fix (Switch to Admin, Open on 127.0.0.1, Reset Studio settings).
  - Studio focus rings use Focus/Neutral (3:1 on the light canvas).
- **Zen Studio: data at its source and overlays as layers (2026-10-05, GĐ1 WP-C server + WP-F):**
  - The dev server says where each expression prop and child gets its value (`dataSource` on GET /element, from the new
    `tools/studio/data-source.mjs`): a `.map` row of a literal list, a const, an import such as `examples/data.ts`, or
    a factory call like `person(…)`.
  - New op `setDataField` writes a value where the data holds it, as a draft of that file (undo follows it).
  - Double-clicking text that comes from a `.map` row edits that row's data.
  - The Inspector edits those values too: a prop fed by a list row or by `examples/data.ts` shows an editable field
    with what it renders and a note naming the data ("From people.bao.role in data.ts"), and the edit goes to the data
    (the binding stays). A binding that reads no state (a condition on a const, a helper's value) offers "Set fixed
    value", which writes what it renders now; Restore puts the binding back. State-bound values never get a fixed
    value: they edit their starting state instead.
  - In Select mode an open Dialog, Side Panel or Bottom Sheet is a layer: a click selects and outlines it, and its
    buttons stay inert until Interact. Layers lists overlay owners even while they are closed.
- **Zen Studio: Properties follow Figma for 53 components (2026-10-05, GĐ1 WP-E):** the Studio read every public
  Figma component set's properties (`docs/figma-contracts/component-properties.json`, 143 sets) and maps them to the
  code props (`tools/studio/figma-props.map.mjs`).
  - The Inspector lists the variants first, then the Figma booleans (Leading-Icon, Caption, Help-Text…), then the
    instance swaps and texts, all under their Figma names.
  - A boolean writes the prop it stands for. An instance-swap row (Leading-Icon-Src) shows only while its boolean is on.
  - `node tools/studio/figma-props-build.mjs --check` (in `studio:selftest`) fails when Figma or the code drifts:
    an unmapped property, a renamed prop, an option with no code value.
- **Zen Studio: Appearance and Effects sections for Box (2026-10-05, GĐ1 WP-D, Figma UI3):**
  - Appearance: Fill, Border, Corner radius, Clip content. Image gets Corner radius only.
    - Corner radius shows its px and has "Independent corners": four corner fields written in the canonical form
      (`radius` plus only the corners that differ; Mixed shows the px range).
    - The corner fields stay off the Properties list.
  - Effects: one Figma effect style per Box.
    - "+" adds the elevation that fits the fill (a Top shadow when pinned to the bottom).
    - The picker lists the 9 Box styles with their use, and greys out the ones the fill can't take.
    - The eye hides an effect for the session; − removes it.
    - Warnings come with their fix: no shadow on a tinted fill, a shadow needs the Surface fill, a shadowed surface
      takes no border, blur needs a translucent fill.
- **Zen Studio builder, M1: make your own pages (2026-10-06, GĐ2):** Pages › My pages › + opens "New page" (a title
  and Phone, Tablet or Desktop). The page opens on the canvas as a Screen frame and is saved in this browser as you edit
  (IndexedDB; reload and it is still there). Everything the Studio does on example code works on it: select, the
  Inspector, Layout, Assets, slots, drag, undo/redo. Actions from Assets become prototype actions (`proto.toast(…)`);
  items that keep state wait for the prototype milestone and say so. A page is a real TSX file in a small dialect
  (`*.zen.tsx`: Zen components, literal props, `mock` data lists, `proto.*` actions), run by the same edit engine as the
  dev server, now loadable in the browser (no Node imports). The toolbar reads "My pages › <title>".
- **Zen Studio builder, M2: manage your pages (2026-10-06, GĐ2):**
  - Each page under My pages has a menu: Rename…, Duplicate, Export file (`<id>.zen.tsx`, byte for byte), Version
    history… (the last 50 versions; one is kept before each burst of edits, a rename, a restore or an import) and
    Move to Trash.
  - The section's menu: Import pages… (one or more `.zen.tsx` files; an invalid file is refused with its line), Trash
    (Restore, Delete forever; pages are deleted for good after 30 days), Sync with the folder, Link folder….
  - On the dev server the pages are also kept in the repo's gitignored `.zen-studio/pages/` (the source of truth; a
    page moved to the Trash goes to `.zen-studio/trash/`, nothing is deleted on disk). A change made in the folder
    reaches the Studio on the next sync; when both changed, the folder wins and the browser's text stays in Version
    history.
  - On a build without the dev server, Link folder… keeps a copy in a folder you pick (Chromium); after a reload,
    Reconnect gives the browser access again.
  - Under My pages a line says where the pages are kept.
- **Zen Studio builder, M3: prototype and Play (2026-10-06, GĐ2):**
  - On a builder page the Inspector has a Prototype tab. Flow lists the page's Screens and Overlays, with Add screen,
    Add overlay (an Overlay holding a Dialog whose buttons close it) and Play.
  - Interactions: select a button (or anything with onClick, onSelect…) and pick an action: Navigate to a Screen, Open
    overlay, Close overlay, Back, Show toast (a title) or Open link (a URL). It is written as code
    (`onClick={proto.navigate("screen-2")}`), so ⌘Z undoes it.
  - While the Prototype tab is open, arrows on the canvas join each action to its Screen or Overlay.
  - Play (P, the Play button, or `?play=<screen>` in the address) runs the page full screen from the selected or first
    Screen: navigate, overlays (opened inside the device), toasts, links, Back, R to restart, Esc to leave. The
    Interact tool (I) runs the actions on the canvas too: navigate and open zoom to their frame.
  - An Overlay frame on the canvas now keeps its Dialog's scrim inside the frame (it covered the whole board).
- **Zen Studio builder, M4: checked on a production build (2026-10-06, GĐ2):**
  - The deployed docs (no dev server) make, edit, reload, prototype and play builder pages, and Link folder… keeps them
    in a folder. `npm run studio:build-check` builds the platform, serves it with `vite preview` and drives that whole
    flow in Chromium.
  - The edit engine loads only when a builder page opens: a component page never requests it. Its lazy chunk went from
    150 to 135 KB gzip: builder pages have no Detach, so the browser engine leaves the detach recipes out. The helpers
    the edit ops share moved to `tools/studio/source-helpers.mjs`, and `detach.mjs` registers op "detach" when it
    loads. Its budget is 140 KB gzip (the spec's 130 guessed the parser at 100 KB; it is 77); the check fails above it.
- **Zen Studio library, GĐ3 M1: search that understands you, and adding with nothing selected (2026-10-06):**
  - The Assets search lists the best match first and knows what people call things, in English and Vietnamese:
    "modal", "popup", "hộp thoại" or "hop thoai" find Dialog; "dropdown" finds Select; "switch" or "công tắc" finds
    Toggle; "nút" finds Button; "bảng" finds Table. One typo is forgiven ("buton", "tabel"). Words from each component's
    guideline count too ("confirm" → Dialog).
  - With nothing selected, a click on an Assets item adds it into the frame most in view (its first layout); with a
    frame selected, into that frame. On a builder page, Dialog and the other overlays point to Prototype › Add overlay.
- **Zen Studio library, GĐ3 M2: Quick insert (⇧I) (2026-10-07):** ⇧I on the canvas opens a search over the library,
  as Figma's Quick insert does. ↑/↓ pick a result and Enter adds it. A line under the field says where it will go ("Into
  Stack · Checkout", "After Button"); with nothing selected it goes into the frame in view. Esc or a click outside
  closes it. The focused item is drawn for real beside the list, in the canvas's modes, with its overlays kept closed.
  The Shortcuts dialog lists ⇧I and P (Play).
- **Zen Studio library, GĐ3 M3: icons and photos (2026-10-07):**
  - The Assets tab has Components · Icons · Photos. Icons lists every glyph of the set once (Line or Solid), with a
    search that knows English and Vietnamese ("xoá" or "delete" → trash, "nhà" → home, "đóng" → x) and one typo. A
    click adds an `<Icon>`; with an Icon selected it swaps that Icon's glyph instead (⌘Z puts it back). Photos are the
    platform's sample photos.
  - On a page you made a photo is written `src="zen-media:<name>"`, the same text in every build; the canvas, Play and
    the previews show this build's file. Example code keeps `platformMedia`, with its import.
  - Quick insert (⇧I) lists Components, Icons and Photos in groups, and previews an icon or a photo as itself.
- **Zen Studio instance panel, GĐ4 M1: like Figma's (2026-10-07):**
  - A variant select lists Figma's options first, in Figma's order and by Figma's names ("Medium (Base)", "Danger
    Subtle"); options only the code has come last. The file still gets the code value (`size="md"`). Selecting several
    layers of one component shows the same names.
  - 70 components follow their Figma set (54 before): NumberField, TextAreaField, DatePicker, Stepper, Metric,
    MetricCard, EmptyState, the chat bubbles and more. NumberField and TextAreaField now list the field props they take
    from InputField (Label, Help text, Size, State), and AvatarStack and BadgeCounter their Theme and Background.
  - A field's Label and Help-Text are groups, as Figma's nested layers: the text with Optional, Tooltip-Icon and Action,
    or with Theme, Icon and Character limit, shown while the Label or Help-Text switch is on.
  - Switches for layers held as objects: EmptyState CTA, AlertBanner and InlineMessage Action write `{ label: "Action" }`,
    then its fields; off removes it. An icon that can be hidden (Dialog and Toast icon, AlertBanner Leading, Metric's
    dock icon) is a switch plus the icon picker in one row.
  - **Reset all overrides** (↺ in the Inspector header): the variants, switches and icons written on a Zen instance go
    back to their defaults in one step, and one ⌘Z brings them all back. The text, handlers, data, value and open state
    stay.
- **Zen Studio instance panel, GĐ4 M2: swaps (2026-10-07):**
  - The icon picker leads with the icon swap's default in Figma ("Default in Figma"), then the icons the file already
    uses ("Used in this file"), then every icon. Figma's own preferred lists hold the whole icon set, so they add nothing.
  - A layer switch that shows an icon (Button Leading-Icon, Trailing-Icon) starts from Figma's default icon
    (`icon-plus-line`), not a fixed one. Slider's Icon is its icon row's switch.
  - **Swap a component in a slot:** a ListItem's Leading (Avatar ↔ Dock icon) or Actions (Badge, Icon button, Button) has a
    ⇄ menu on its layer row: the other component takes its place, imports follow, one ⌘Z.
  - **Swap instance:** ⇄ in the Inspector header or the canvas menu's "Swap instance…" opens Quick insert in its Swap
    mode. Enter puts the chosen component in the selected layer's place (a child, a prop's value or a list row; a `key`
    stays), selects it, and one ⌘Z brings the old layer back. Works on pages made in the Studio too.
- **Zen Studio instance panel, GĐ4 M3: nested instances (2026-10-07):**
  - A Zen component inside another one's props (the Avatar in a ListItem's Leading, a Button in a Card's sub-action) now
    shows all of its properties under its owner, as Figma's nested instances do: its variants by Figma's names, the
    switches that show a layer, icon swaps and texts. Before, only its on/off switches showed. An edit writes the nested
    layer where it is written.
  - Reset all overrides on an instance resets its nested instances too, in one ⌘Z ("3 properties back to default (1 in
    nested instances)"). A nested instance written elsewhere (a const, a helper, another file) is shared code and stays.
- **Zen Studio starters, GĐ3b M1: a new page from any example or template (2026-10-07):**
  - **New page from this frame** (right-click a frame on the canvas, or the frame's Inspector): the Studio copies what
    the example or template shows into a new page of your own, kept in this browser. Every prop is a plain value you
    can edit; the state it showed is kept (the open tab, what was typed, the list as filtered), its logic is not
    (handlers, forms' wiring: add links in the Prototype tab).
  - Works on the deployed docs too (no dev server). The status line lists what could not be kept.
- **Zen Studio starters, GĐ3b M2: an example's own HTML becomes layout (2026-10-07):**
  - An example's `div` rows and grids become Stack and Grid (direction, gap, alignment, wrap, columns, padding), a
    tinted or bordered box a Box (Surface, Border, Radius), headings Heading, paragraphs Text (their text style and
    tone), links Link, images Image, rules Divider. Spacing takes the nearest token.
  - A Stack, Grid, Box or Text styled by an example's own class gets what that class renders as props (gap, padding,
    alignment, text style).
  - The docs' card around an example is not copied; the room it leaves around the content is (a padded Stack).
  - Measured on every example and template: 323 of 323 frames become a valid page.
- **Zen Studio starters, GĐ3b M3: Start from a template; overlays as Overlay frames (2026-10-07):**
  - **New page › Start from:** Blank page or one of the 15 page templates (the title defaults to the template's; a phone
    template makes a phone page). Works without a dev server.
  - A Dialog, ModalForm, SidePanel or BottomSheet in what you copy becomes an Overlay frame of the page, drawn open; its
    own buttons close it (`proto.close()`). Link the button that opens it in the Prototype tab (Open overlay).
- **Zen Studio export, GĐ5 M1: a page as React code (2026-10-07):**
  - **Export…** (a page's Inspector panel, or its menu in My pages): the page as one React component for an app that
    uses `@zen/design-system` (Copy code, or Download `<Name>Page.tsx`), or as its design file (`.zen.tsx`). No dev
    server needed.
  - Each screen is a branch (Back works through its history), a state variant shows while the `state` prop names it,
    overlays open and close from their own state, the sample data becomes `export const mock` with its type (the
    `data` prop replaces it). Prototype links become code (navigate, open / close an overlay, back, a toast, a link),
    library photos imports from `./assets`. A TODO(dev) block lists what to wire.
  - What a component requires but a design cannot hold (a chat field's `onSubmit`, a Table column's `cell`, an action's
    `onClick`) gets a stand-in, listed in the TODO block. On the canvas a Table column without a cell now shows its
    rows' field named by its id; before, a page made from a template with a Table (Admin list, Dashboard, the HR lists)
    stopped the canvas.
  - Fields a component's object type does not have (an option's own `at`) are left out of the code. In New page from
    this frame, a date given to a prop (DateField `today`, a DatePicker range) is left out instead of becoming text the
    component cannot read, and a router link (`as={RouterLink} to="/x"`) becomes a plain link (`href="/x"`).
  - The React of every template and example frame passes TypeScript and the usage harness.
- **Zen Studio export, GĐ5 M2: a page as static HTML (2026-10-07):**
  - Export › **HTML**: each screen, state variant and overlay as an HTML file (`screens/<id>.html`, an overlay drawn
    open), with `styles.css`: the Zen rules those screens use (tokens and their modes, the components' rules, the fonts
    and animations they name), read from the styles the Studio has loaded. **Download `<page>-html.zip`** holds them, an
    `index.html` that lists the screens, the library photos and the font files; open `index.html` in a browser.
  - The markup is what the canvas draws, without the Studio's attributes; form fields keep what they show. Measured on a
    page with a list, a photo, a form, a state variant and a Dialog: each file matches its frame on the canvas at 100%.
  - Static markup: menus, dialogs, tabs and fields do not open or change; the React code has them.
- **Zen Studio export, GĐ5 M3: the handoff package (2026-10-07):**
  - Export › **Handoff** shows the page's `handoff.md`; **Download `<page>-handoff.zip`** packs everything a developer
    needs: the React component, the design file (`.zen.tsx`), the photos the code imports, a picture of each screen and
    overlay (`screens/*.png`, 2×, drawn in the browser as the canvas shows it), the HTML export (`html/`) and
    `handoff.md`.
  - `handoff.md` is written from the page, never by hand: setup (the library version, `styles.css`, the ZenProvider
    props of the Studio's modes, the mobile modes of phone screens), the components with their purpose and the paths of
    their guideline and API docs, the text styles and token names the design writes, the prototype flow (each frame,
    each interaction and what it does in the code, what to wire), the data contract (the sample data's type) and
    accessibility (each frame's focus order with roles and names, and the guidelines' keyboard and accessibility notes).
  - The pictures match the canvas: measured on screens, a state variant and a Dialog overlay, under 0.1% of pixels
    differ. What a picture cannot draw (a video, a canvas) is listed in `handoff.md`.
- **Zen Studio photos, GĐ5 M4: upload your own (2026-10-07):**
  - Assets › Photos › **Upload** (or drop files on the panel): PNG, JPEG, WebP, GIF or SVG up to 5 MB each. Your photos
    are listed above the library's; click one to add it to a page you made, or drag it there. They stay in this
    browser and, when a folder is linked, in its `assets/` beside the pages. The same file uploaded twice is one photo.
  - With an Image of a page selected, a photo (yours or the library's) replaces its picture in one step.
  - The exports carry them: the React code imports them from `./assets`, the HTML and the pictures show them, the
    handoff zip holds the files. Import pages… now takes a handoff zip too: the page comes back with its photos.
  - A page whose photo this browser lacks (imported alone, from another browser) shows "Missing photo" in its place
    and names it in the status line: select the Image and pick another photo.
- **Zen Studio export, GĐ5 M5: Promote a page into the repo (2026-10-07):**
  - On the dev server, an admin's Export panel has **Promote to the repo**: the page becomes
    `src/templates/studio/<Name>Template.tsx` (one React component, `<Name>Template`), its photos beside it in
    `src/templates/studio/assets/` (library photos copied, uploaded ones sent from the browser). TypeScript and the usage
    and style harness run on it; the panel says what they found. No pull request is opened: `npm run ship` does that.
  - A template that exists and differs (edited in the repo) is replaced only on a second, explicit click (Replace
    `<Name>Template.tsx`). A build of the Studio (no dev server) does not offer Promote.
- **Zen Studio instance panel, GĐ4 M4: size and Detach (2026-10-07):**
  - **W / H for an instance** (Inspector › Layout › Size): Hug, Fill or a Fixed px, as in Figma. A component with its
    own size prop or `fullWidth` uses it; any other is wrapped in a Stack that it fills (`<Stack direction="row"
    fillChildren width="fill">`), as a drag of its handles on the canvas does. The instance stays selected, later
    sizes edit that Stack, Hug takes the Stack away again; one ⌘Z each.
  - That Stack follows its instance: the Layers show only the instance's row, and Remove, Duplicate, Move up / down
    and a drag take the Stack along.
  - **Detach on pages made in the Studio:** Badge, Tag, Card, ListItem, MetricCard, Metric and InlineMessage become Zen
    primitives there too (the recipes load the first time a page asks about Detach). EmptyState and DescriptionList are
    refused on a page, saying why: their layout needs an inline style, which pages do not take.
  - Fixed: the E2E row I-15 (Gap ⌫) no longer flakes.
- **Zen Studio: shared demo code can be restructured, after a question (2026-10-06, GĐ1 WP-B2):**
  - Removing, duplicating, moving, inserting, pasting, dragging or wrapping layers whose code lives in shared demo files
    (PlatformDemoActions.tsx, chatDemo.tsx, PlatformChat…) used to be greyed out ("shared beyond this example").
  - Now the Studio asks "Change shared code?", naming the files that use it, like Figma's "Edit main component".
    Cancel writes nothing; "Change everywhere" goes ahead, and later edits to that file don't ask again until the page
    reloads. Playground files stay out of reach.
  - Fixed: a quick second click right after an edit landed (Show effect, then Remove) could do nothing; the Inspector
    now plans it again from a fresh read.
- **Zen Studio: the Layout section works like Figma UI3 (2026-10-06, GĐ1 WP-D):** one control per idea, each change
  one undo step.
  - Direction is one switch: Vertical · Horizontal · Wrap (Wrap writes `direction="row"` and `wrap` together).
  - The alignment box draws the items as bars (a ghost on hover, the effective default when nothing is written). Auto
    (space between) turns it into three lanes; a stretched cross axis into three main-axis lanes. Keys: arrows, W/A/S/D
    to an edge, X for Auto, B for Text baseline, ⌫ to reset (never the layer).
  - Gap sits beside the box with an "Auto" choice; Cross axis is Position · Stretch · Text baseline.
  - Padding is one field for all sides, or Horizontal + Vertical (the square button switches); going back to all
    sides from different values shows "Mixed" and writes `padding` while removing the two axes.
  - Grid: Align cells, one gap or separate row and column gaps, Columns as Auto-fit · Count · Tracks (with a preview of
    the tracks), and per breakpoint for `columns={{ mobile, desktop }}`: only the chosen breakpoint's value changes.
  - A prop that does nothing where it is written (wrap in a vertical stack, a min column width next to Columns, …) shows
    a warning with Remove.
- **Zen Studio: spacing and radius fields read "md · 16" (2026-10-05, GĐ1 WP-D, ScaleField):** Gap, row and column
  gap, padding (all, horizontal, vertical) and corner radius name each token with what it measures where the layer
  renders, the same wording as the canvas spacing pills. An unset field shows what renders now in the placeholder tone
  (Horizontal padding follows Padding). ↑/↓ step the ladder and write once when the key is released, so holding a key
  is one undo step; ⌫ resets a written value instead of deleting the layer.
- **Zen Studio: constraint lines on the canvas (2026-10-05, GĐ1 WP-D, Figma constraints):** select a floating
  Stack, Grid or Box (`position="absolute"`) and the canvas shows dashed lines from the parent's padding edge to each
  pinned edge, with a pill beside each line ("right · sm · 12"). A centred axis gets a tick on the parent's centre
  line and a "center" pill, and the parent gets the dashed owner outline. Pills step aside for the name tag and the
  size pill.
- **TopNavigation: grouped trailing actions, any of them (2026-10-05):** each action takes `group?: string`; actions
  next to each other with the same group share one pill (Figma's Nav-Action with Trailing-Icon, iOS's paired bar
  buttons), drawn in the bar's action style: Tertiary, Liquid Glass on `liquid-glass`, Liquid Glass Black Overlay on the
  overlay types; the compact types keep their Flat actions apart (Figma's Icon-Flat has no trailing icon). A pill is one
  of the bar's three places (harness `top-navigation/max-three-trailing` counts places). `trailingGroup` (the first two)
  is deprecated; the chat header and examples use `group: "call"`. The playground gets a Grouped trailing toggle.
- **Zen Studio: drag trailing actions to reorder or group them (2026-10-05):** on the canvas (drag an action of the
  selected TopNavigation, or a selected action) and in the Slots list: onto another action's edge it moves there
  (joining the group it lands inside, leaving one it is dragged out of), onto its middle the two share one pill. The
  item panel and the Slots rows also group with the action before/after or take one out of its group (link buttons),
  and the item's Group field edits the name. New item ops `groupItem` / `ungroupItem`, `moveItem` `regroup`; a group
  left with one action loses its field. Restart the dev server to load them.
- **Zen Studio: Properties grouped like Figma (2026-10-05):** a component with Figma groups (TopNavigation first) shows
  its own properties and Figma's booleans (Top-Leading, Top-Heading-Text, Top-Trailing, Expand-Heading,
  Expand-Trailing, Control-Bar), then one group per nested layer (Top-Leading, Top-Heading-Text, Top-Trailing,
  Main-Heading-Text, Header-Trailing, Control-Bar) with its props, list items and nested instances (the Avatar in
  `leading` sits under Top-Leading). A layer whose boolean is off shows no group, and props that do nothing in the
  current state (Title label without a click handler) hide; Trailing group stays and warns instead. Switching a boolean on
  writes a starting value (a title, an action with a working handler, the Control-Slot picker); off removes it.
- **Zen Studio: data slots, TopNavigation Top-Trailing like Figma (2026-10-04):** Figma's Trailing-Slot holds Action
  instances, while the code takes `trailing={[{ icon, label, onClick }]}`. The Slots section now lists Top-Trailing,
  Header-Trailing (`largeTitleAction`) and Control-Slot (`controlBar`); actions are added (with a working toast
  handler), removed, duplicated and moved there. Selecting an action on the canvas shows it as Figma's nested instance
  in a slot: its icon, label, dot and disabled fields, Move up/down, Duplicate (⌘D) and Remove (⌫). Any other list prop
  written in place (Tabs/Segmented options, ActionBar actions…) gets Move up/down, Remove and "Add item" (a copy of the
  last, with a fresh id/value) in Properties. Example and template content only, like other slot edits.
- **Zen Studio: smaller value text (2026-10-04):** inspector fields and selects show their value in Body/Small/Medium (12px) instead of Body/Base/Medium; the fields keep the Small height.
- **Zen Studio: object and array props editable (2026-10-04):** props written as an object or a list of objects
  (TopNavigation `leading` / `trailing`, EmptyState and Dialog actions, Tabs/Segmented options, DescriptionList items…)
  no longer read "Bound to {…}": the Properties section shows one group per object (per list item, named by its label)
  with its booleans (dot, disabled), text, icon picker and enums from the prop's TypeScript type. Edits change only that
  field (new op `setField`). `node tools/studio/editability-audit.mjs` lists what the inspector still cannot edit.
- **Zen Studio: Ignore auto layout (2026-10-04):** the Design tab has a Position section (Figma UI3, above Layout):
  Align (6 buttons), measured X / Y and an Ignore auto layout toggle for any layer inside a layout. A Stack, Grid or Box
  floats on its own props (`position="absolute"`, `constraintX/Y`, `inset*`); any other layer or component floats in a
  Box around it, and turning it off takes that Box away again (new server op `unwrap`), so the code is what it was. On
  turning it on the layer keeps its place where the tokens allow: it spans → Left and right, centred → Center, else the
  nearer edge at the snapped Spacing/Padding offset (past 4xl it clamps and says so). Floating layers get Figma's
  constraint diagram (Shift+click for both edges), Horizontal / Vertical selects (Scale listed, disabled) and an offset
  row per pinned edge; dead constraints, ignored offsets and "pinned to an outer layer" show as notes. One write and
  one undo step per gesture.
- **Description List in Figma (2026-10-04):** the code-only DescriptionList now has a Figma component on the new page
  ❖ Description List (14857:3): `Description List` (14859:79180, Layout Inline/Stacked × Divider No/Yes, an Items slot)
  built from `.Primitives/Description-List/Item` (14859:78890, Layout × Emphasis × Divider = 8 variants; Term, Value, Action
  and Action Button props). Every gap, rule and text binds the same tokens as the code (Gap/XSmall 8px, Gap/Medium 16px,
  Padding/Small 12px, Divider Default/High, Body/Small/Regular, Body/Base/Medium, Body/Base/Bold); the copy action is a
  Button/Icon-Flat Small in a 20px wrapper so its icon meets the row's end edge.
- **DatePicker mobile primitives (2026-10-04):** `device="desktop" | "mobile"` on DatePicker, DatePickerItem and
  DatePickerHeader (Figma `.Primitives/Mobile-Date-Picker/Item` 9921:3283, Date-Picker/Mobile 9923:3576): days fill the
  width as squares (50×50 on a 390px phone) in Body/Base/Medium, the month and year in Heading/Subheading at the start
  with Back / Next at the end, Spacing/Gap/XLarge to the table (the dual calendar stacks its months Gap/Medium apart,
  Gap/XSmall under each header). Unset, an inline calendar follows the breakpoint (nearest `data-breakpoint`, else
  ZenProvider); a popover stays desktop. Playground: Device control.
- **Accordion `contentWidth` (2026-10-03):** `title` (default, Figma: the content stops before the chevron column) or
  `full` (the content also runs under the chevron, to the box padding / row end), for rows with end-aligned values such
  as a receipt. Figma Accordion/Text got the matching `Content Width=Title|Full` property the same day; the Accordion example "Mobile order summary" is rebuilt on it: folded, the total sits
  in the title; open, the cart rows (with their options), Subtotal, the points (positive) and Total, prices on one edge.
- **Zen Studio: marquee and several layers at once (2026-10-03):** dragging on empty canvas, a frame's background or
  the background of a layout that is not selected draws a marquee (Figma; pan with Space, the Hand tool or scrolling):
  it selects the layers it touches one level inside the deepest layer that holds it, ⌘ the deepest layers fully inside,
  ⇧ adds. With several layers selected, Delete and ⌘D remove / duplicate them all, ⌘C / ⌘X / ⌘V copy and paste them
  together, and layers of one component show their shared properties ("Mixed" where they differ) — each one edit and
  one undo step. Server op `many`; `pasteCode` takes several elements.
- **Zen Studio: Quick actions ⌘/ (2026-10-03):** search every Studio action by name (tools, edit, clipboard, wrap,
  detach, selection, zoom, panels, theme, pages) and run it with Enter; an action that cannot run now says why. The
  Keyboard shortcuts sheet lists the new keys (Tab/⇧Tab, ⇧Enter, ⌥ measure, text edit, arrows, drag, clipboard, ⌘/).
- **Zen Studio: Assets tab (2026-10-03):** the left panel's third tab lists the Zen components the Studio can add
  (the slot palette, by group, with search). Drag one onto the canvas: the insertion line shows where it lands, a
  playground or docs frame says why not; a click (or Enter) adds it into the selected layout, else right after the
  selected layer. Imports and an action's `useToast()` are added; one undo step; the new layer gets selected.
- **Zen Studio: drag and drop in Layers (2026-10-03):** drag a layer row: a line between rows shows where it lands
  (at that row's depth), the middle of a layout row puts it inside; ⌥ copies, Esc cancels, the list scrolls at its
  edges. Same rules and one undo step as dragging on the canvas.
- **Zen Studio: Tab / ⇧Enter navigation and ⌥ measure (2026-10-03):** Tab and ⇧Tab select the next / previous
  sibling layer (round its parent), ⇧Enter the parent (Figma). Hold ⌥ with a layer selected and point at another:
  red lines give the distances (inside edges when it holds the selection, else the gaps), with the Spacing token when
  the distance is that padding or gap ("8 · xs").
- **Zen Studio: copy, cut, paste (2026-10-03):** ⌘C copies the selected layer (its exact JSX, also as text for an
  editor), ⌘X cuts it, ⌘V pastes into the selected layout (Stack, Grid, Box, Card, Form parts) or right after the
  selected layer, ⇧⌘R pastes to replace it, ⌥⌘C / ⌥⌘V copy and paste its look (literal props the target takes). Code
  or plain text from elsewhere pastes too (text becomes a `<Text>`); Zen components join the imports; names that do not
  exist where it lands are refused. Same items at the top of the canvas menu. One undo step each; the pasted layer gets
  selected. Server: `GET /element` answers `range`, ops `moveTo { copy, replace }` and `pasteCode`.
- **Zen Studio: reorder by dragging and arrow keys (2026-10-03):** drag a layer: it follows the pointer, a blue line
  shows where it lands among the siblings of the container under the pointer (that container is outlined), drop moves
  it, ⌥ drops a copy, Esc cancels, the canvas pans at its edges. In the middle of a sibling layout (Stack, Grid, Box,
  Card, Form parts) it goes inside it. A press inside the selected layer drags that layer; a click still selects what
  is under the pointer. ←/↑ and →/↓ move the selected layer one place earlier or later. Layers move within their
  example; `.map` rows, condition branches, cloned children (Tooltip, FormField) and names that would not exist where
  it lands are refused with the reason. One undo step each. Server op `moveTo` (`tools/studio/arrange.mjs`).
- **Zen Studio: edit text on the canvas (2026-10-03):** double-click text (or Enter on a selected text layer) edits it in
  place, Figma-like: same font, size and colour over the text, the frame reflows as you type, Enter/Esc/click outside
  keep it, ⌘Z undoes it in one step, IME input (Vietnamese Telex) is safe. Works for a text child
  (`<Button>Save</Button>`) and a string prop (`<Checkbox label="…">`, `<ListItem title="…">`); text from data or
  playground state says where it comes from. Plan for the other phases:
  `docs/research/studio-figma-editing-plan-2026-10-03.md`.
- **Zen Studio: select several layers and wrap them in a new container (2026-10-03):** Shift+click on the canvas, or
  Shift/⌘+click in Layers, selects several layers; the Inspector then shows "N layers" with Wrap in container. ⇧A puts
  them in a Stack laid out as they render (Figma's Add auto layout: direction, a Spacing/Gap token, align), ⌥⌘G in a
  plain Box (Frame selection); both also work on one layer, from the canvas menu too. Layers of one parent only (others
  are told why); layers that are not next to each other move up into the container. One undo step, which selects the
  layers again. Example and template content only. Server op `wrap` + `with` (tools/studio/README.md).
- **Zen Studio slots (2026-10-03):** a component's Figma content slots (Card Content, Dialog Custom, ModalForm
  Main-Contents / Side-Content / Top, SidePanel, BottomSheet, Accordion, TabPanel, ChartCard, ListItem leading/trailing)
  are shown as slots: dashed outlines and a "+" on the canvas, a "slot" row in Layers, and a Slots section in the
  Inspector. In examples and templates, slot content can be added from an insert picker (preferred items first), removed
  (⌫), duplicated (⌘D), moved, reset to the saved file (Figma "Reset slot", with a Modified tag) or cleared ("Clear
  contents"); the main component is never touched and playground slots stay empty. Spec
  `docs/research/studio-slots-spec-2026-10-03.md`.
- **Figma position, effects and corners on the layout primitives (2026-10-03):** Stack, Grid and Box take
  `position="absolute"` (Figma "Ignore auto layout") with `constraintX` / `constraintY` and `insetTop/Right/Bottom/Left`
  on the padding tokens; Box takes `effectStyle` (the nine Figma Effect styles, drop shadows only on `surface="surface"`),
  `clip` (Clip content) and per-corner radius (`radiusTopLeft`…); Image takes the corner props. Token-only; unset props
  render nothing. Ten new usage rules plus `radius/full-mixed`, a style-guard raw-inset warning for examples and
  templates, runtime audits (shadow on Canvas/Alt, one elevation level per screen, per-corner concentric radius) and
  `npm run layout:selftest` in the gate. Spec `docs/research/studio-position-effects-radius-spec-2026-10-03.md`.
- **Figma-like sizing on the layout primitives (2026-10-03):** Stack, Grid and Box take `width` / `height` = `"hug"` · `"fill"` · a number (Fixed px), `minWidth` / `maxWidth` / `minHeight` / `maxHeight` and `alignSelf` (the child's alignment in its Stack or Grid); Stack takes `fillChildren`; Text and Heading take `width`, `minWidth`, `maxWidth` and `alignSelf`. Fill grows along the parent Stack's direction and stretches across it. Unset props render nothing, so existing pages are unchanged.
- **Zen Studio, the docs platform as a canvas tool (2026-10-02):** the default UI of the docs platform is now a
  FigJam-like canvas built with Zen (Neutral-S7 · Compact · Dashboard): Pages/Layers on the left, zoomable canvas with
  Playground, Examples and Docs frames at their real widths (desktop screens 1440px, no more squeezed playgrounds),
  Inspector on the right (Overviews, Installation and the Foundation pages stay normal scrolling pages). Admins click any element of a playground or example and edit its props (variants, spacing,
  alignment, text style, text) in the Inspector; the change is written to the source file at once (dev server only),
  the example's hand-written snippet follows, and ⌘Z/⇧⌘Z undo and redo. Playground properties move into the Inspector;
  the Code tab shows the real source git-style (line numbers, syntax colours, changed lines). ⌘/Ctrl-click selects a
  component's nested parts (SidebarItem, InputLabel…) read-only, with their props, text style, layout and colour tokens.
  Text style is editable on any text element (the typographyStyles import is added when missing), and the gap and
  padding of a selected Stack/Grid/Box/Form… are edited on the canvas: hover shows "gap · md · 16", click picks a step.
  Detach component (⌥⌘B, like Figma): a presentational instance (Card, ListItem, MetricCard, Metric, EmptyState,
  DescriptionList, InlineMessage, Badge, Tag) becomes Box/Stack/Text… in the source, marked `zen-detached`; in a list only
  the selected row; ⌘Z restores the component.
  Present (F) shows desktop examples full screen. Viewer role is read-only. `?ui=classic` opens the old docs (also what Playwright and the QA gate
  see); `tools/studio/` holds the dev-server plugin (`node tools/studio/selftest.mjs`).
- **Zen Studio drafts and Save (2026-10-03):** admin edits on the canvas are drafts on the dev server (every browser on
  it sees them, they survive a restart) until an admin saves: nothing reaches the disk before. Each frame with unsaved
  changes shows "● N changes · Discard · Save" in its frame toolbar and a dot on its name, and saves or discards only
  its own changes (with the imports they need; the other frames keep theirs). The toolbar has "Unsaved · N files" (the
  list, Discard per file, Discard all) and **Save all** (⌘S). Save writes atomically, merges a disk that changed
  meanwhile (a collision stays a draft) and runs style-guard + usage-guard on the saved files; a disk change made
  elsewhere now shows on top of a draft instead of being hidden by it. `npm run qa` warns when its browser checks
  render unsaved drafts.
- **Zen Studio: nested booleans work on elements that spread props (2026-10-04, user: "Các boolean trong nested vẫn không hoạt động"):** most example Avatars are written `<Avatar size="md" {...avatarOf(person)} />`, and Studio locked every prop not written out, so Status/Focus were greyed out in Nested instances and in Properties. A prop the spread does not feed (not among the props the element renders with) is now editable, booleans and every other kind (Avatar Background and Shape, a ListItem's Title lines). The new attribute is written in front of the first spread (`status {...avatarOf(person)}`), so a spread that feeds it still wins: Theme and Src under `{...avatarOf(person)}` and a playground's `Selected` stay read-only.
- **Zen Studio: editing a component playground no longer reloads the whole page (2026-10-04):** `PlatformExamples.tsx` exported an unused helper (`isPlatformComponentPage`), so it was no Fast Refresh boundary and every Studio edit there made Vite reload the page; the inspector jumped to the top after each toggle. The helper is removed and the playground now updates in place in about 0.5 s.
- **Zen Studio nested booleans, Figma-style (2026-10-03, user: "Các boolean của nested không hiển thị để sử dụng được trong studio"):**
  - A selected component lists **Nested instances** under Properties: each Zen component written in its props (the Avatar in a ListItem's leading, the Icon in a Button's startIcon) with its boolean props as toggles, written to that nested element's own line; the name selects it.
  - Double-click on a selected component goes into the nested instance under the cursor (editable), then into its read-only parts; a click on the selected nested instance keeps it even where the row's click target covers it.
  - Properties show the boolean HTML attributes a component inherits: Disabled (Button, IconButton, Chip, Tabs/Segmented/Pagination items…), Disabled · Required · Read-only (InputField, TextAreaField, Search), Disabled · Required (SelectField, Toggle).
- **Zen Studio Design tab, part 1 (2026-10-03):**
  - The header is a set of labelled rows:
    - Type: Zen component, Layout primitive, Local component or HTML element.
    - Docs: a link to the component's page.
    - Used in: file:line, which opens the Code tab, plus a copy button.
    - Repeats: "N× — edits apply to all N".
    - Detach instance: shown only for types the dev server can detach. A blocked Detach gives its reason in visible text.
  - Layout sits above Properties. Stack/Grid/Box/Text/Heading get a Size group (W/H Hug · Fill · Fixed, min/max, Align in parent, Children). Then come Properties and Slots/Children (add, remove, move). Remove sits under Detach.
  - align/justify show once, in the alignment grid plus Distribution and Cross axis.
  - Props get sentence-case labels; the prop name is in the tooltip.
  - Pages and Layers rows use Zen's list-row states: Neutral/Flat hover and pressed, Active/Neutral/Subtle selected with neutral text.
- **Zen Studio resize like Figma (2026-10-03):** a selected Box/Stack/Grid gets 8 handles (Text/Heading: width), a
  live size pill and Shift for 8 px steps; a drag writes Fixed, a double-click on a handle writes Hug, Escape cancels.
  A Zen component without a size prop is wrapped in a Stack it fills (later drags edit that Stack; undo of the wrap
  reselects the component); its own `width`/`height`/`fullWidth` props are used when it has them. Handles never go
  below what the component can render (a Button's label, a Badge's text), and are hidden with a reason where a resize
  would not show (an InputField's height) or would break the component (a Menu trigger, a Tooltip's child, FormActions
  Buttons, ChatMessage bodies, an AppShell sidebar: `src/platform/studio/cloning.json`). Dragging a frame's right edge
  sets a free preview width. The Inspector's Layout section has a Size group (W/H Hug · Fill · Fixed, min/max, Align
  in parent, Children: Own size | Fill equally). Layout CSS: a fillChildren Stack with `align="stretch"` fills its
  children across too, a column without its own height keeps children at their content height, and absolute layers
  are left out of flow sizing.
- **Zen Studio board keeps frames in place (2026-10-03):** like Figma, a frame never moves sideways or to another
  column when content changes or another frame is resized: a taller or shorter frame moves only the frames below it in
  its column, by exactly that much; a width override (preset or edge drag) moves nothing else (the frame may overlap
  its neighbour). The board opens exactly as before and keeps that opening across page switches and reloads. A
  selection that a relayout pushes off screen is brought back with the smallest pan.
- **Component Theme Neutral-S5, S6, S7 (2026-10-02, Figma export):** `componentTheme="neutral-s5"` fills inputs with
  Neutral/Subtle (no border or shadow; focused Neutral/Flat); `neutral-s6` is Neutral-S4 (outlined inputs) with filled
  Tertiary buttons and Secondary chips (Neutral/Subtle, no border or shadow); `neutral-s7` is S5 with a Neutral/Pale
  focused field. In ZenProvider, Storybook, the docs Component Theme chip and the native token packages.
- **Motion tokens (2026-10-01):** `--zen-motion-duration-xfast/fast/base/slow` (80/120/200/280ms), `--zen-motion-ease-
  standard/emphasized/exit/linear` and `--zen-motion-movement` now ship in `tokens.css` from a code-owned source,
  `tokens/source/motion.json` (Figma variables cannot hold easing curves; the Figma file mirrors the durations in a
  Motion collection). `motionTokens` and `motionRules` are exported from `src/tokens/generated.ts`, and Design Tokens has
  a Motion section. Rules: exit is one step shorter than enter; animate transform, opacity and colours, not layout.
- **EmptyState `compactTitle` (2026-10-01):** in a Card you title yourself, the title uses Body/Extra/Bold like inside a
  ChartCard, so it never outsizes the card title (also when the card title is an h2 in Subheading).
- Tooling: `tools/figma-kit/` finds changed Figma sets by hash through `use_figma`, fetches only changed variants and patches `docs/figma-contracts/` (`node tools/figma-kit/selftest.mjs`).
- **Language:** `<ZenProvider locale="vi">` translates every built-in label of every component (close/dismiss,
  pagination, search and pickers, rich-text toolbar, chat, uploads, screen-reader names) and date formats; built in:
  `en`, `vi`. `labels={{ … }}` overrides single strings; `useZenLabels()`, `useZenLocale()`, `zenLabels`.
- **One API vocabulary** (the names agents guess from Radix/MUI), with the old names kept as deprecated aliases:
  - `size` on every component takes the short scale (`xs sm md lg xl`) or the Figma spelling (`xsmall small medium
    large xlarge`); both render identically.
  - value controls: `value` / `defaultValue` / `onValueChange` (Tabs, Segmented, Rating, OpinionScale, NpsScale,
    Slider, ColorSelector; InputField, TextAreaField, SelectField and Search add `onValueChange(value)`).
  - boolean controls: `checked` / `defaultChecked` / `onCheckedChange` (Checkbox, RadioButton, Toggle).
  - selection: `selected` (Chip, Card).
  - icon props take an icon name (`icon="icon-plus-line"`) or a node (IconButton, Button, Tabs, Breadcrumbs, Sidebar,
    EmptyState, Stepper, SidePanel…).
  - `headingLevel` on EmptyState, Dialog/ModalForm and SidePanel; `EmptyStateAction.level`; SelectField
    `placeholder`; DatePicker `onOpenChange`; HTML attribute and `ref` pass-through on Table, Badge, Card, List,
    ListItem, EmptyState, Stepper.
- **Spellings from other libraries** are accepted (deprecated aliases unless noted; the harness warns apps):
  - overlays (Dialog, ModalForm, SidePanel, BottomSheet): `isOpen`, and `onClose` (not deprecated), called with every
    close request next to `onOpenChange(false)`. `open` is optional: a mounted overlay without it is shown, so
    `{show && <Dialog … />}` works.
  - Button `leftIcon` / `rightIcon`; Badge `color`; Toast, AlertBanner and InlineMessage
    `status="success | error | warning | info"` (→ positive, negative, warning, info).
  - icons that only come in sizes take their plain name too: `icon-search-line`, `icon-x-line`,
    `icon-chevron-left-line`, `icon-chevron-right-line` draw the Medium cut (valid `IconName`s; generated from the
    icon set, so new sized icons get one automatically).
- **Tooling for AI agents and editors:**
  - `npx zen-usage` — the usage harness for apps (checks only components imported from the package; `--json`).
  - `@zen/design-system/eslint` — the same rules in ESLint (`zen/usage`, `zen/usage-warn`; `configs.recommended`,
    `configs.standalone`).
  - `@zen/design-system/usage` — `checkSource()` for tools.
  - `zen-ds-mcp` — MCP server: setup, component docs, icon/token search, templates, `check_usage`,
    `map_figma_component` (Figma instance → Zen JSX).
  - `npx zen-ds init | doctor | check`.
- **Harness rules:** `icon/unknown-name` (suggests the closest real names, and knows other sets' words: close → x,
  gear → settings), `icon-button/needs-action`, `api/deprecated-prop`, `layout/use-stack` and `text/use-text` (the
  last three in apps only), `empty-state/way-out-tertiary`, `table/actions-flat`, `heading/h1-is-heading-1`; size
  rules read both spellings; in apps, raw elements next to Zen imports are checked too.
- **HeadingField `multiline`:** long titles wrap and the field grows with them (Figma Inputted-Multi-Line); Enter adds
  no line break and pasted line breaks become spaces. One line stays the default, for short names. HeadingField also
  reports `onValueChange(value)`.
- **Token modes from the 2026-09-28 Figma variables:** Component Theme `neutral-s4` (`componentTheme="neutral-s4"`) is
  Neutral-S1 with outlined inputs (Surface fill, Subtle border, no inner shadow), plus the token
  `Input/Border/Disabled` for a disabled field's border. Emphasis `light` (`emphasis="light"`)
  uses lighter weights (400–500) and 1px active strokes. Both are in the docs platform topbar and Storybook.
- **Docs platform:** Segmented has a phone example, "Period switch on a phone". Its four periods (This week · This
  month · This quarter · This year) are wider than the 390px screen, so the default Secondary Segmented keeps its full
  labels and scrolls sideways; an empty week shows an EmptyState. The page now has 4 examples, with states and mobile.
- **App Shell, the Figma HR-Platform pattern (◇ Master-Layout):**
  - Collapse to the icon rail from a toggle at the start of the top bar. It shows whenever the shell has a top bar
    (`sidebarToggle={false}` hides it); `sidebarCollapsed` / `defaultSidebarCollapsed` / `onSidebarCollapsedChange`
    hold the state. A Sidebar with its own `onCollapsedChange` keeps its header control instead.
  - `AppShellAction`: a top-bar icon action with an unread dot or count (99+), read out as “Notifications, 12 new”.
    `AppShellAccount`: the avatar button that opens the account Menu.
  - New slots:
    - `banner`: a full-width AlertBanner that stays in view.
    - `aside`: a docked SidePanel. It docks only while the page keeps at least 744px beside it; otherwise it opens as
      the modal panel.
    - `floatingAction`: one floating button bottom-right. The end of the page keeps room for it, so it never covers
      the last row.
  - `useAppShell()` gives your own controls the layout, the rail state and the drawer.
- **Docs platform:** the App Shell page has a new playground and 7 examples: HR workspace, Admin app, Collapsed rail,
  Drawer in a narrow shell, Banner, Flat canvas and Phone app. The four desktop templates use the new top bar:
  Breadcrumbs or a Search, notifications and the account menu.

### Fixed
- **Zen Studio: ⌘V pastes into a component's slot (2026-10-12):** with a layer of a slot selected (PageHeader ›
  Actions holds Export), the copy goes right after it in that slot; with the slot's row selected in Layers (the row
  now shows selected), at the slot's end. Both were refused ("PageHeader can't hold layers", "Stack has no layer inside
  here"). ⇧⌘R on a slot's layer swaps it. A paste beside a layer that an example's local wrapper (`Page`) lays out goes
  into that wrapper's JSX instead of failing. A paste now warns as the insert picker does ("Not recommended: The card is
  one click target…", "A card never goes inside a card"), into a slot or a layout, and goes in all the same.
- Figma List-Box (2026-10-14, user): a heading no longer starts in from the edge when the box is wider than 311px.
  Header-Slot and Footer-Slot align their content left and the default Heading / Footer texts fill the slot (they were
  fixed at 263px in a centred slot), as `.zen-list-box__header` lays it out; the 30 List-Boxes on ◆ Performance were
  fixed too. Publish the library so files that use it get the change. The AI kit's Figma audit reports the pattern as
  `text/shifted` (fixed-width left-aligned text pushed in by a centred column).
- Docs phone previews (2026-10-13): a bar's blur no longer smears the black bezel into the screen's corners (Bottom
  Navigation Floating). The screen is the backdrop root of its blurs and the bezel is drawn as its own layer.
- Zen Studio: a page made from a template or example frame (New page from this frame) keeps its Table cells as the
  Table draws them from row fields: a TableMedia cell becomes an avatar / photo / icon / Dock Icon column (label,
  caption, bold, the picture or icon, each row's colour as its override), TableBadges / TableTags a badge / tag column
  (each badge's colour and dot), TableActions an actions column; a page's own initials are kept where the Table's
  would differ, and screen-reader text is not a cell's words. Before, only a photo was kept and everything else
  became its text ("An Mai · an.mai@dizai.studio"), so the page and its Figma export lost the initials, colours,
  badges and row menus.
- AppShell's top bar is 72px on desktop again, as Figma's Navigation row: Margin-Comfortable above and at the sides,
  Spacing/Padding/XSmall below (it was 64px, 12px above and below, since 2026-10-09). The user's call: follow Figma.
- AppShell: on a narrow top bar a centred Search (`headerCenter`) no longer runs under the actions; it stops a
  Spacing/Gap/Medium before them.
- Zen Studio: an AppShell on a Screen fills the Screen and its Sidebar spans the whole page, as in Figma; it was as
  tall as the browser window (the app's sticky 100dvh), shorter than the page.
- Zen Studio → Figma: an app page no longer imports as an empty frame. A component with no Figma set is drawn with
  what it holds instead of being left out with everything inside it: AppShell as its Sidebar and a top bar of Figma's
  Dashboard header Type=Navigation (collapse toggle, header, actions, the account's Avatar), the Screen's own Sidebar
  and Page header, PageHeader as the Dashboard header Type=Main, Heading as text in its level's style, a Menu as its
  trigger, List / Container / Form… as frames of their layers. A Sidebar's rows go in Body-Content with the selected
  one marked, a Dashboard header turns on the blocks whose slots hold content, and Export › Figma says why when nothing
  on a page can go to Figma rather than downloading an empty frame.
- SidePanel: content in the body no longer shrinks when the body overflows; it scrolls. A Segmented or code block
  was squeezed instead (Studio Export's tabs at 25px, labels cut off).
- Zen Studio → Figma: the Dashboard imports as it looks in the Studio (tried in the live Zen file). A Grid whose
  columns fit the width is an even Figma grid of as many columns as fit the page (a wrapping row where the width is not
  known), a Grid of N columns is Figma's grid with rows that hug; MetricCard is a
  Card around Figma's metric with its label, value, trend, icon and action; ChartCard a Card around Figma's line or
  stacked-bar chart with its title and ranges; ListItem keeps its title, caption and leading Avatar or Dock Icon;
  ListBox its header row; a Sidebar without a footer loses Figma's sample rows; the page is Canvas; Text takes its
  default style and its tone; Search its placeholder; Chip its leading icon; plain icon names their Figma cut. The Zen
  plugin (Import from Studio) no longer clips the frame's height, never moves a slot's content to another slot,
  binds row gaps, minimum widths and colours, and takes on/off for a Yes/No variant.
- Zen Studio → Figma: the other templates import as they look too (Invoice, HR Home, Admin list, Settings, Sign in,
  the mobile pages, tried in the live Zen file). Fit-grid columns split evenly (the Dashboard's bottom row came out
  592 / 544, now 568 / 568) and read back as `minColumnWidth`; Breadcrumbs draw their chevrons; InlineMessage shows its
  close button only with `onClose`; a collapsed Sidebar is Figma's rail (Expand=No, icon-only rows, its mark in the
  header, a divider between groups) and reads back collapsed with its labels; a ListBox is as tall as its rows instead
  of clipping them at Figma's sample height; a full-width Segmented splits its row (its items overlapped). The Zen
  plugin hugs a slot or a named layer and fills a slot when the page asks.
- Zen Studio → Figma, compared with the Studio sheets: a selectable Table has its checkbox column and the sorted column
  its arrow; a table's avatar cells draw their Avatar (initials or photo, each row's colour); the account Avatar is
  Subtle; an IconButton without a level takes the level the code draws; `minmax(0, Npx)` tracks are a fixed width;
  Form keeps its gap; AiChatBlock is Figma's AI/Chat-Block/Pale with its greeting and suggestions. All read back.
- `SidebarMenuItem` is in the props docs (docs/api, the Sidebar page and its guideline): react-docgen did not see it as a
  component. Every `SidebarItem` field now has a description; `indent` had no effect and is deprecated.
- SidePanel (modal) inside a device frame (`[data-zen-overlay-root]`, a phone preview or a Zen Studio frame) opens in
  that frame, as Dialog does, instead of covering the whole page.
- AvatarStack puts its own attributes (`data-*`, `aria-*`, `id`, `className`, `style`, `title`) on the stack instead
  of on every avatar it draws (a `data-testid` was repeated on each avatar and `className` was lost).
- Form and ModalForm: a blocked submit focuses the first invalid field even when the handler's errors render a frame or
  two after it returns (they looked once, one frame later, and could miss them; seen as a flaky CI test).
- Zen Studio: on a page you made, a component's state shows at once — a Data-Row's State → Selected, a Checkbox's
  default, a Tab's default value, any `defaultX`/`initialX` (also inside `overrides`) — instead of after a page reload.
- Usage harness: `zen-usage --list` (and `check-usage.mjs`) no longer cuts its JSON off at 64 KB when piped; the process
  exited before stdout was written out.
- Zen Studio: the canvas opens in the default modes (Neutral-S1, Standard contrast, Compact…) again; only light/dark is remembered. Modes saved before Present and Play took their own (2026-10-09) stuck on the canvas with no control left to change them.
- Zen Studio: ⌘D (Duplicate) works on pages made in the Studio — the renderer's React key was mistaken for a written `key` and every copy was refused.
- **Zen Studio: a click no longer writes an old field value (2026-10-10):** a text or number field in the Inspector
  could write its previous value back when the selection changed right after the field had been updated (a Sidebar
  section's title went empty, then came back, on a double-click); fields now write only what was typed.
- **Zen Studio: a Screen with its app frame exports laid out (2026-10-10):** Export › HTML kept the sidebar, header,
  top and bottom navigation wrappers under Studio class names without their layout rules, so a page with a Sidebar or a
  Page header stacked its parts; the wrappers are now `.screen__side`, `.screen__main`, `.screen__header`… and
  styles.css carries their rules (E2E HO-08: the exported page matches the canvas, 0.00%).
- **SidebarMenuItem and SidebarMenuSection outside a Sidebar (2026-10-10):** a row placed on its own (a page's Stack,
  a flyout) lost its padding and the gap between icon and label, because both came from variables only the Sidebar
  defines; they fall back to the Sidebar's own values (Padding/Small, Gap/Small), so the row draws Figma's Menu-Item
  anywhere.
- **Zen Studio: Discard right after an edit could keep the old canvas (2026-10-09):** the edit's in-flight compile landed
  in Vite's cache after the discard and was served from then on (Vite's HMR invalidation does not stop that); the Studio
  now invalidates the file plainly before its hot reload. The E2E rows that failed only in full runs (ST-12, D-01, D-02,
  D-06) pass again.
- **Zen Studio: the canvas menu stays whole (2026-10-09):** a right-click menu taller than the room above and below the
  pointer opens downwards from a raised point inside the window; it used to open upwards, its top items cut off by the
  window's top. Disabled items show their label only (no reason line under them).
- **Zen Studio: an instance's W / H choice right after a size change (2026-10-09):** picking Fill, Hug or a width in
  the Inspector while the canvas is still showing the previous change is now written once it has caught up; it was
  dropped without a word.
- **Zen Studio: Reset slot after a duplicate (2026-10-08):** duplicate a slot item, then Clear the original: Reset
  slot now gives the original its saved content back (it was refused as "new since the last save") and the copy stays
  the new one.
- **Zen Studio: section surface and stale reads (2026-10-08):** a frame widened past the Examples section's edge stays
  on the section's tinted surface (nothing moves, the Docs frame included); right after a slot Clear, Reset or their
  undo the canvas's spacing and resize layers read the element where the write put it (no more GET /element 404s), and
  the selection follows an element whose own line changed while other lines changed too.
- **Zen Studio: copying several layers (2026-10-08):** ⌘C on a multi-selection carries the useState values and DOM
  refs the dev server reads from the AST (as one layer's copy does), the text scan only as a fallback.
- **Studio E2E harness (2026-10-08):** a row past its 20 s limit no longer keeps driving the page and the server under
  the next rows (its calls are refused, the next row gets a fresh page); a stuck step fails at 10 s with its own
  message; LB-13 / LB-14 open the Components library (LB-12 left Assets on Photos and they timed out every run).
- **Fill height in a column without a height (2026-10-08):** a column Stack with `height="fill"` whose parent gives it
  no height no longer collapses its Fill or `fillChildren` children to 0; they keep their content height, and a column
  with a height still shares it equally (a 0% flex basis).
- **Tooltip around a wrapper (2026-10-08):** a Button inside a Box or Stack that a Tooltip wraps now gets the
  tooltip's aria-describedby when it takes focus, and `tooltip/focusable-trigger` accepts such a wrapper.
- **AiChatBlock heading level (2026-10-08):** new `headingLevel` (1–3, default 2) for the greeting, so a screen whose
  greeting is its title (HR Home) has one visible h1 instead of a hidden one. The AI chat header on phone screens uses
  the Alt bar like the other phone screens.
- **Harness false positives (2026-10-08):** usage rules no longer treat a template string inside a prop expression as an
  opaque spread; the platform audit skips selected cards in §16, counts a ListBox as a card for outline siblings and
  measures corners at the phone frame's scale.
- **Design Tokens page in dark mode (2026-10-08):** the Token links buttons used the browser's black button text on the
  dark surface (1.38:1); they take Content/Neutral/Strongest now. The QA gate no longer fails in the cloud container on
  emoji glyph widths or TabItem's machine-dependent axe result.
- **Phone screens: the top bar matches the canvas (2026-10-08, user rule):** every docs phone on Canvas/Default now
  uses the Alt bar (`alt`, `compact-alt`, `alt-blurring`), the same colour as the screen; only white Surface screens keep
  `default` / `compact`. The TopNavigation guideline says so.
- **BottomSheet in a device frame (2026-10-07):** like Dialog and Menu, a BottomSheet inside a `[data-zen-overlay-root]`
  frame (PlatformPhone, an app's device preview) now opens in that frame instead of over the whole page; `inline` is
  only needed elsewhere. DatePicker's stacked month titles are `<h3>` headings under the sheet's title.
- **MCP `get_component` is brief by default (2026-10-07):** the props of the component you name, Do/Don't, keyboard,
  accessibility and the rule ids, without the Figma mapping, node ids or the rule table (under half the size);
  `detail: "full"` returns the whole guideline. CI's Package step works again: `verify:package` found npm's JSON
  inside prepack's coloured build output.
- **Table in a narrow box (2026-10-07):** a table without fixed column widths no longer crushes a text column to one word
  per line: left-aligned text cells keep a readable minimum (`--zen-table-text-min-width`, 120px) and the table scrolls
  sideways instead.
- **Props docs (2026-10-07):** NumberField and TextAreaField now list the label, help-text and state props they take
  from the field (docs/api, guidelines, MCP); `scripts/build-api.mjs` reads an `Omit<…>` base declared in the same file.
- **Backlog batch A, App Shell (2026-10-07):** a Sidebar inside AppShell follows the shell's rail and drawer even when it
  is wrapped in a component of your own (no `useAppShell()` by hand), and the rail's Search button expands it. The
  collapsed rail separates groups with a Divider (Figma HR Sidebar-List) and shows a hidden counter as the
  Notification-Dot ("Approvals, 3" stays in the name). Every Notification-Dot is Figma's 8px dot with a 2px ring outside
  (the Sidebar's drew its ring inside, leaving 4px of red). An AppShell aside that opens as the modal SidePanel stays
  inside a preview frame, like the drawer. The harness flags an AppShellAction or AppShellAccount that does nothing.
- **Backlog batch A, components (2026-10-07):** a tap on a clickable ListItem's trailing Badge, value or chevron now
  opens the row (buttons in the slot keep their own action). A docked SidePanel closes on Escape from the page beside it
  (not from a text field) as well as from inside, and returns focus to what opened it; in docs full screen Escape closes
  the panel before leaving. AiChatField draws +, the microphone and Voice only with `onAttach` / `onVoice` (the empty
  field shows a disabled Send otherwise). DateField calls `onDateChange` for a typed MM/DD/YYYY too (null when it is
  emptied or stops being a real day). `plural(n, one, many, locale)` takes a locale: Vietnamese keeps the noun ("3 tệp");
  `copy/plural-count` reads whole Unicode words and skips Vietnamese ones.
- **Zen Studio small fixes (2026-10-07, backlog batch 5b):** Escape on several layers selects their common parent;
  a layer switch flips at once (optimistic) and a bound switch shows no control until the live props arrive; Assets
  "No components match" has Clear search; ⌘Z after a paste or an Assets insert returns to the layout it went into;
  hovering a selected nested instance under a row's click target no longer outlines the row; a Hug double-click on
  the only item of a px Grid column writes that column as `auto`; resize handles and spacing areas read the live props
  (a spread that does not set the prop leaves it editable); the tone picker captions what the harness would flag
  (Lights-group Light on text, Light titles, colour Light body copy); Detach says where a bare handler comes from and
  works on namespace JSX; the "applies to all N rows" note is a .map's only; Save all leaves the toolbar below 1024px
  (the drafts panel has it); the frame chrome lays out on the next frame after a size change.
- **Zen Studio decisions and multi-select (2026-10-07, backlog batch 5c):** a column with a minHeight sizes its Fill
  children into it; a dropdown Chip keeps its width handle; the Pages panel drops the description the board shows; a
  click on the Docs frame below 100% opens it at 100%, top-aligned; ⌘-click lands on a TopNavigation action, not its
  icon. The arrow keys move several selected layers of one parent together (they stay selected); ⇧-click in Layers
  selects the range of rows; Mixed properties edit text props on several layers.
- **Uploader error text in Light (2026-10-07):** the field's error help text and a file item's error line (icon and text) use Content/Negative/Light like every help text but Warning (Input already did); they were Negative/Strongest.
- **QA gate sees the example pages again (2026-10-07):** since the examples moved to `src/platform/examples/pages/<page>.tsx`, `npm run qa` mapped an edit there to no page and its example-coverage step (④) read no example list, so both passed without checking. Each page file (and its stylesheet) now scopes to its page, and step ④ reads the page's `examples` array.
- **Zen Studio quick fixes (2026-10-07, backlog batch 2):** the Inspector's Frames list names the open builder page's
  Screens after switching pages (two pages both have `screen-1`); the first view zooms down to 50% so the Playground
  clears the Inspector at 1024–1280 px; setting a prop after an attribute with a trailing `// comment` keeps the comment
  on its line; the Size row of Stack/Grid/Box is "Child size" (the Slots section keeps "Children"); public exports the
  props docs do not list (ZenPortal, PopoverBulkAction…) read as Zen components; truncated layer names in the Inspector
  header show the full name on hover; List `inset` loses its "Row inset" label (it is deprecated); the palette's
  second Metric is "Metric card"; switching a Figma list boolean off (Top-Trailing with two or more actions) removes the
  `useToast()` line those actions brought; moving an item past an identical one says the code stays the same instead of
  "No change"; a slot's + chip no longer covers the selection's size pill. The Studio selftest no longer breaks a
  parallel `tsc` (its samples are excluded) and runs the detach-type selftest.
- **Zen Studio: frames and examples keep up with edits (2026-10-07, backlog batch 5a):** a frame's Save and Discard
  take the edits to code it reads outside its JSX (sample data, a column const, a helper, a Zen component that keeps
  its source line off the DOM, a portalled overlay); an edit to an example page no longer restarts its examples (an
  opened chat thread stays open: example pages export their list through `keepOnHotUpdate`); a data edit still restarts
  its frame so new initial data shows. Effects gains Effect settings (the style's layers, read-only) and Card,
  MetricCard and ChartCard show the effect their theme draws. An unset object prop (EmptyState `secondaryAction`) gets
  a "+" that writes a starting object, a prop held by a same-file const (`options={views}`) edits that const field by
  field, and Toast's Figma Actions boolean is a switch.
- **Docs example fixes (2026-10-07, backlog batch 4):** the Visually Hidden playground shows the invoice table's Archive
  column (its stage widens for the table); AI Chat › "Assistant on a phone" names the screen with its bar title (h1);
  HR · Public holidays' "Holidays in …" is Heading/4 like the other HR sections; the Table playground's Progress column is
  Neutral with its % label (Figma Progress-Cell); the chat phones' thread header follows the scroll (its Pale rule once
  messages run under it); the Accordion playground has a Content width control (Title / Full).
- **Task priority flags use the Light icon colour (2026-10-06):** the HR Tasks flags (list, board, panel) take their
  family's Content Light (Urgent Negative, High Warning, Medium Info, Low Neutral) through Icon `tone`, instead of the
  Base text colour; Light is the icon level.
- **Zen Studio: resizing an item in a Grid column moves its neighbours (2026-10-06):** dragging the width of the only
  item of a Grid column the source sizes in px (`columns={{ desktop: "minmax(0, 320px) 1fr" }}`, `columns="320px 1fr"`)
  now resizes that column (one edit on the Grid, one ⌘Z) instead of wrapping the item in a fixed Stack, so the next
  column follows and the gap stays the gap. A Grid's canvas gaps are measured between its tracks (they used to span
  the free part of a cell and still read "gap · 12"); a px column wider than its only item shows that space as
  "column 1 · 80 free", and a click offers **Fit column to content**.
- **Emoji in secondary text keep full colour (2026-10-06):** colour emoji take the alpha of `color`, so an emoji inside
  Content/Neutral/Base or Light text (alpha) looked faded. HR Home's leave rows ("🤒 Sick leave · Sep 29 – Sep 30") and
  the HR phone app's Leave balance terms now put the emoji in its own `Text` span with tone `strongest` (opaque); the
  words keep their Base colour.
- **Sidebar rail keeps its mark centred (2026-10-06):** a collapsed Sidebar with a custom `brand` now shows
  `logoCollapsed` in its place; without it the rail keeps the brand's first element, centred, and hides the name
  visually (it used to sit 2–12px right of the items, the name bleeding in). HR module rails pass the workspace logo,
  so they match Home's 88px rail. HR Home's rail, opened from the top bar, shows the workspace header and a labelled
  Apps instead of an empty header and an icon-only footer.
- **Input label tooltip target (2026-10-05):** the info button beside a field label keeps its 12px icon but gets the
  invisible 24×24 hit area its label action already had (WCAG 2.5.8).
- **Table action cells are Medium (2026-10-05):** the docs' Table examples use 40px IconButtons in the Actions column, as
  Figma's Actions-Cell (Button/Icon-Flat Medium); the 48px selection column stays (user decision).
- **Backlog decisions of 2026-10-05:** Sidebar rows default to the Neutral theme at every level (Figma's default; a
  selected child is grey, `theme: "accent"` keeps the pink). QA: `npm run qa -- --isolated` runs the browser steps on a
  private dev server (no HMR from other sessions, no Studio drafts; also used when the shared server is down), and the
  post-edit hook warns when you edit a file another session touched in the last 30 minutes. Closed as already done:
  docs phones on Mobile tokens, Metric Title-Highlight, the dark alphas and Neutral Dark step 1 (in the 2026-10-03
  token sync); closed by decision: Motion, Avatar solid colours.
- **Backlog batch 6 (2026-10-05):** Chip takes `popoverPortal` (its menu opens in the overlay layer, anchored to the chip,
  so a sideways-scrolling row no longer clips it); PageHeader on a phone shows the description under the title and the
  actions after it; the docs platform has no import cycle left (PlatformExamples ↔ PlatformMobilePlaygrounds made hot
  updates reload the page). Checked, nothing to change in code: the Checkbox/Radio unchecked border is Figma's
  `Checkbox/Border/Default`; the Button page dialogs move and return focus correctly.
- **Backlog batches 4–5 (2026-10-05):** SelectField's trigger is named by its label and value ("Role, Editor"); a DateField
  calendar opens on the month of the date in the field, and with `datePickerActions` a pick waits for Submit (Cancel and
  Escape keep the old date); the DatePicker's time fields are Medium on a phone; a Menu that fits on neither side of its
  trigger shifts into the window (it ran off a 390px phone); a keyboard-opened Popover no longer scrolls the page (Sidebar
  › Switch workspace jumped); `DialogAction` takes `type="submit"` + `form`, so a SidePanel's Save submits the form in its
  body (Enter too); the docs' Inter has system fallbacks (no serif flash). Regression tests in
  `tests/interaction/input-popups.test.tsx`.
- **Backlog batches 1–3 (2026-10-05):** App Shell › Narrow window opens its navigation drawer again (three Studio-written
  props locked it closed); Sidebar is a `<nav>` landmark (was `<aside>`); a clickable ListItem says `aria-current="true"`
  when selected instead of `aria-pressed` on every row; the Zen wordmark in the Sidebar examples follows the theme (it was
  black on the dark Sidebar); docs list every DockIcon / Metric `iconTheme` hue (`scripts/build-api.mjs` now resolves
  spreads in `as const` arrays); AGENTS.consumer.md and the Bottom Sheet / Chip guidelines no longer contradict the house
  rules (fields have `disabled` again; a single choice in a sheet is List + ListItem).
- **Zen Studio: nested booleans work in real use (2026-10-05, user: "Các nested boolean vẫn k hoạt động"):**
  - A quick second toggle no longer snaps back: an edit refused because the Studio's own earlier write changed the file
    is moved onto that write and sent again; a queued click is planned from the element as the file holds it then.
  - The Nested instances list stays put after a write and follows its elements when a write adds a line; switching a
    boolean back (off, or on when its default is on) leaves the file as saved, with no leftover draft.
  - Nested instances are found from what the selection renders: JSX in a const, a helper, a local component, another file
    or a Table column's cell is listed (675 booleans were missing), with "Written in <file>:<line>" when it lives there.
  - A boolean bound to data (`status={one.online}`) has a switch showing what it renders; switching writes a fixed value
    (through `defaultX` for state props), and Restore puts the binding back. Bindings to state stay read-only.
  - TopNavigation's Figma group switches restore what the saved file had (an Avatar leading, the call actions) instead of
    a placeholder, and adding an item keeps the TopNavigation selected.
  - Editing a template or the App Shell page no longer reloads the whole Studio, and an example edit no longer re-runs
    the Studio panels (Fast Refresh boundaries; `appLayer/playgroundParts.tsx`).
- **Text / Heading `align="start"` (2026-10-05):** it now sets `text-align: start`. Before, it only wrote
  `data-align="start"`, which had no CSS, so a text inside a parent that centres its text stayed centred.
- **TopNavigation: notification dot placed as in Figma (2026-10-05, user report):** the action's Noti dot now sits 10px
  from the top and the end of the 44px button, on the icon's top-right corner (Figma Nav-Slot/Action 6085:44062, every
  style). Before, it was 6px in (Default, Glass) and 8px in (Flat). It uses the Navigation-Action icon padding tokens.
- **Toast stack motion and phone alignment (2026-10-04, user report):** a closing toast now fades in place first and
  only then its row closes (it was sliced by a clip that also cropped its shadow, and left an 8px jump); a new toast
  rises from the screen edge without covering its neighbours (top placements overlapped); each toast counts down from
  when it appears, so they leave one by one (every new or closed toast restarted all timers, so they vanished
  together). Every toast fills the stack width (Figma 648px; short ones hugged their text, so a stack had ragged edges
  and phones mixed widths); the layer keeps Margin/Comfortable and the safe area from the edges (was 16px sides, 20px
  bottom, and 12/20px for right placements on a phone). Stacks of sibling ZenProviders (each docs example card) share
  one layer per placement instead of overlapping.
- **AppShell in a zoomed preview (2026-10-04):** the shell measured its rendered size, which a CSS transform (the Zen
  Studio canvas below about 70% zoom) shrinks, so a 1440px frame switched to the drawer (menu button, no Sidebar) while
  Present showed the Sidebar. It now reads its layout size (also for the Sidebar, banner, floating action and docked
  panel offsets, and the top bar's fit check), so the canvas and Present match at every zoom.
- **DatePicker hover halos (2026-10-04, user report):** the view viewport clips only while days ⇄ Select-Month-Year
  switches (`data-switching`, ~280ms), so at rest the All day Checkbox's 8px hover halo and focus rings are no longer cut
  at its 4px inset.
- **Card Sub-Action = Figma (2026-10-04):** the Content slot keeps the full width and the Sub-Action is an absolute
  layer over the top-right corner that takes no room (Figma 6664:21686; the 28px reserve beside / above the content is
  gone). The default button is Button/Icon-Flat Small **Secondary** (Content/Neutral/Light) with ⋮
  `icon-dots-vertical-line` (Figma 1460:13), was Primary ⋯.
- **Card (2026-10-03):** `theme="shadow"` with `surface="alt"` no longer casts an outer shadow on Surface-Alt (renders
  as Figma Theme=Flat on Alt).
- **Chat (2026-10-03, user request):** `Bubble-Chat-Others-Business/Background/Default` now aliases Background/Surface/Default
  (was Popover/Default) in all nine Component Theme modes: Business "others" bubbles and cards are opaque white in Light
  and Dark/Gray/2 in Dark. Repo only; the live Figma file still has Popover.
- **Phone examples are centred (2026-10-03):** the device in a mobile example sat at the left of its stage at desktop widths (73 of 77 phones in the docs, 70 of 74 in Zen Studio); `.platform-phone-fit` now centres itself with auto inline margins in example stages, playgrounds, Studio frames and full screen.
- **Table pages span the page width (2026-10-03, user rule):** a page whose content is a non-widget Table now uses
  `<Container maxWidth="full">` instead of the default lg 1280 cap: 8 templates (Admin list, Empty and error states, HR
  My expenses, My leaves, Leave types, Public holidays, All tasks, Expense overview), the App Shell playground and 16
  example screens. At 1920/2560 the tables went from 1280 to 1612/2252 px. Widget tables (Dashboard, Detail) keep
  their card. Recorded in component-usage-rules §14, the Table guideline and Container's `maxWidth` doc.
- **Docs full screen no longer scrolls sideways** when a preview's root is a Container (its gutters overflowed by 48px).
- **Popover icons line up with their label on phones (2026-10-02, user report):** Icon and Photo-Small items keep the
  leading at the top, as Figma does, and now centre it on the label's first line. In the Mobile and Marketing type
  scales the Body/Base line is 24px around a 20px icon, so icons sat 2px above the text (the Chat hold menu, Menu,
  Select). The offset is computed from the tokens, `--zen-typography-line-height-body-base` and
  `--zen-element-size-popular-base`, so it is 2px at Compact and 0 at Comfortable; Dashboard is unchanged.
- **AiChatField and ChatComposer draw Figma's field stroke (2026-10-02):** the AI Chat-Field (Style=Default) and the
  Chat-Control message field now carry Input/Border/Default as a 1px inside stroke, so Component Theme S4 shows their
  Subtle border like Figma (clear in S1–S3); the AI field also takes Effect/Input's background blur. Focus is unchanged.
- **Gate: no more false "paints over the open popover" on chat (2026-10-02):** the smoke layer check sampled a popover
  position read before the pointer moved; chat demo timers re-pin threads mid-check and the popover rightly moves with
  its anchor. It now samples the popover where it is, so the chat and templates@390 HR · Home flakes stop; genuinely
  covered popovers still fail (`tools/platform-audit/audit.mjs`).
- **Popovers that fit on neither side of their anchor stay on screen (2026-10-02):** they shift into the viewport
  (8px margin) instead of running off it; the 310px chat Reaction-Bar was cut off on a 390px phone. Menus, Selects,
  Date Pickers and every other anchored surface that fits are placed exactly as before, and so is everything inside a
  transform-scaled frame (docs phone previews, the Studio canvas).
- **Chat threads keep the reader's place (2026-10-02):** a click, tap or Tab on an older message unpins the thread, so a
  new message or a call card changing no longer snaps it (and an open message menu) to the bottom. The hover
  Reaction-Bar focuses an emoji once when it opens instead of pulling focus back on every render. Sending your own
  message brings the thread back to it; older history loading, a removed message or an Undo keep your place.
- **Docs:** the page no longer jumps when a demo phone's chat re-pins (`.platform-phone` is out of scroll anchoring).
- **Gate smoke step:** the pointer stays inside the viewport, partly visible popovers are sampled on screen, chat
  hover toolbars open their menus reliably (with a bounded wait, so a full pass is as fast as before), a leftover Toast no
  longer hides a covered popover from the check, and `report.smokeStats` says how many popovers were sampled or skipped.
- **Docs topbar settings chips work again below 1024px (2026-10-01):** the chips sat in a horizontal scroll box, which
  clipped their menus, so Typography, Component Size, Theme, Radius and Emphasis could not be changed in narrow windows.
  The chips now get their own row and wrap; the light/dark toggle stays on the breadcrumb row.
- **Docs topbar stays one row on phones and tablets (2026-10-02, user approval):** below 1024px the settings chips sit
  in a row under the topbar that scrolls with the page; the sticky bar keeps only the menu, breadcrumbs and light/dark
  toggle (72px; the wrapped chips made it 216px at 390 and covered popovers). Full screen works again on screen
  examples whose card has focus.
- **Liquid Glass blurs again in the docs' phone frames (2026-10-01):** the frame clipped its header and footer with
  `clip-path`, which made them backdrop roots, so every `backdrop-filter` inside (glass pills and buttons, the progressive
  blur) saw only the bar and nothing behind it. The blur layers round their own corners instead. Apps: never put
  `clip-path`, `mask`, `filter` or `opacity` on an ancestor of a glass element inside the bar.
- **Popover and Menu stop jumping while the page scrolls (2026-09-30):** an open surface keeps the side it opened on
  (below or above the trigger) until that side would cut it off, instead of flipping back as soon as the other side
  fits, and it follows its trigger in the same frame (no lag inside a scrolling panel). Applies to Popover, Select,
  Chip, Date Picker, Table cell pickers, Chat reactors and Menu. SelectField gains optional `popoverOpen` /
  `onPopoverOpenChange` (as on Chip); a list opened from outside leaves focus where it is. The Popover playground
  opens by itself once its trigger is in view and stays open while you change its controls.
- **Screens name themselves with one h1 (2026-09-30):** the Empty & error states template has a page title (PageHeader
  "Projects", h1) with its Empty States one level below (h2, still Heading/4), and its not-found state reads "Project
  not found". Bottom Navigation "Floating + action" shows a compact TopNavigation with the tab name; "Glass over media"
  names its full-bleed screen with a visually hidden h1.
- Overlays (Dialog, ModalForm, SidePanel, BottomSheet) no longer move focus back to their first field when the parent
  re-renders with an inline `onOpenChange` handler: the focus trap re-ran on every render, so typing in a second
  field of a controlled form jumped to the first one.
- A Dialog whose primary action starts disabled (Send, waiting for a valid email) now moves focus inside, to the first
  control that can take it; focus used to stay on the opener.
- `zen-ds-mcp` rejects unknown, missing or mistyped arguments; a misspelt `check_usage` argument used to come back as
  an empty, clean-looking answer.
- Templates follow their guidelines: Sidebar `selectedId`, Search `onValueChange`, two-letter avatar initials, and an
  h1 on the mobile detail screen. Docs: `locale` really switches the built-in labels; ToastStack is only for hosts
  outside a ZenProvider.
- Toggle exposed its hidden checkbox next to the switch (axe nested-interactive); Popover and ChatReactorsPanel
  lists without accessible names; the rich-text ⌘K shortcut no longer depends on the English label; SelectField
  `onBlur` fires; a consumer `aria-describedby` on fields is merged, not overwritten; `useFormState` accepts
  `interface` value types.
- Button and IconButton match Figma at every size, including the Smooth/Standard/Luxury Corner Radius modes: the focus
  ring follows each size's Action/Focus radius (every size used Medium's); IconButton is a circle with a circular
  ring in every radius mode; Flat IconButton Secondary rests on Neutral/Light, and Danger/Positive stay Light on hover
  and turn Base when pressed.
- HeadingField reports its real height again (40/36/32 for H1–H3): the input's pad collapsed through the root and
  made the field report 16px taller.
- Docs platform: every icon-only button in the examples does something (27 had no action). Sidebar "+" actions create
  the team, teamspace, project or workspace and open it; Workspace settings opens its page (a menu in the playground);
  Share copies the link; toolbar Align left toggles and Insert link confirms; Duplicate confirms in its tooltip. The
  code samples show the same handlers.
- Keyboard focus stays visible. Popover options (Select, Menu, Chip lists) show the 3px Focus/Accent ring inside the
  row: on the selected option focus changed nothing, because Selected, Flat/Hover and Flat/Pressed are the same
  alpha. An invalid field keeps its Negative border and adds the 3px focus ring; it used to look exactly like its
  resting error state (WCAG 2.4.7).
- Chat (desktop): Escape in a React or More menu returns focus to the button that opened it. After one keyboard
  opening from the message, every later menu sent focus to the message. More opened with Enter on its button now
  takes focus, and Escape on the button of an open menu closes it.
- Docs platform examples no longer lock interactions: SidePanel "Docked inspector" Width steps with ↑/↓ and +/−;
  DatePicker "Birthday" pages through months; Button "Confirm a destructive action" Cancel closes the dialog (focus
  goes to "Delete project…"); Toast "Inline confirmations" Dismiss hides the toast ("Show message again") and Upgrade
  confirms.
- Docs platform: the 22 locked interactions that `interaction/no-noop-handler` and
  `interaction/controlled-needs-handler` listed now work (`usage:check`: 0 warnings). The code samples show the same
  handlers.
  - Button "Mobile footer CTA": the Deliver to, Arrives and Pay with rows open Action sheets that change the address,
    speed (and the total) or the card. "Save for later" confirms on its button.
  - Table "Invoices with pagination": the page-size Chip picks 5, 10 or 20 rows.
  - Chart "Budget allocation": the range regroups the budget by department, category or project.
  - Chart Card chevrons open a report Side Panel.
  - AI Chat "Long prompt" sends and answers (Stop works).
  - "Quick create": the bottom bar switches tabs.
  - List rows in the Sidebar, Search, mobile and playground examples select.
- Docs platform: actions passed with no handler at all now do something visible (96 found by the harness changes
  below; code samples show the handlers).
  - Phone Back buttons go up to a parent screen whose row comes back (focus moves to the new screen); Top Navigation
    New message, Upload, Share, Notifications and Settings open sheets; Like toggles; Close viewer goes to the album.
  - Share, Invite, New project, New task, Compose and Continue with email open a one-field dialog that confirms;
    Export and Duplicate confirm with a toast; Publish toggles; Sidebar footer items open their pages.
  - KPI ⋯ and "View failed payments" open the numbers in a report Side Panel; Table Edit changes a member's role;
    AI answers' Copy confirms in place; truncated names and annotation pins pin their tooltip on click.
  - Templates: Dashboard Export, New project and Notifications work; the Admin list and Detail sidebars select.
  - Playground actions show which handler ran under the preview.
- Top Navigation: a trailing action whose label changes (a count clearing, Like → Unlike) keeps keyboard focus; the
  actions were keyed by label, so the button was remounted.
- Figma details found while moving component CSS to tokens:
  - Rating emoji: Heading/4 in its 32px slot (was 24px).
  - Slider: the Medium thumb shadow is Shadow/Neutral/Strong (was Base).
  - Chat: the status line (time · Seen) is Gap/2XSmall (was 6px).
  - Avatar: focus rings take each size's radius, so they are right in the Luxury mode.
  - Color Selector swatches and the Dialog and SidePanel header icons grow in Comfortable, as in Figma.
  - DatePicker: range ends follow the radius mode.
  - Docs platform: the topbar chips use the Shadow/Action/Tertiary effect with its backdrop blur, and example gaps and
    paddings that were off the scale (6, 10 and 20px) snap to the nearest Gap or Padding token.
- Segmented no longer squeezes its labels into each other when its options are wider than the container. On a phone,
  Templates › "Empty & error states" read "404 No resultsFirst useLoad failed". It now scrolls sideways like Tabs:
  there is no scrollbar, the segments keep their width, and the selected segment scrolls into view. `fullWidth` still
  splits the width equally.
- Segmented now scrolls the selected segment fully into view inside a scaled container too, such as the docs
  platform's phone preview. The scroll used to stop short by the scale, so the last segment stayed a few pixels clipped.
- No more dead clicks in components: a Number-only Chip without `onClick` or `selected` is a static count; with
  `showActions`, DatePicker picks are a draft that Submit applies through the new `onApply(value, range)` and Cancel
  drops (`onCancel`; new `range` / `defaultRange`, harness `date-picker/actions-need-apply`); RichTextField keeps its
  own undo history, so Undo / Redo are disabled with nothing to undo or redo and never undo another field; the quote
  of a deleted Chat message is plain text.
- **AppShell:**
  - Clicking a Sidebar section title or its "+" no longer closes the navigation drawer; picking a page does, and
    focus moves to the page instead of back to the menu button.
  - The drawer always shows the whole Sidebar, never its rail or collapse control. It gains a Close button, the page
    behind it is inert, and it animates out.
  - The skip link no longer changes the URL, so hash routers keep working.
  - The sticky top bar no longer paints over the host page's own sticky header (the docs topbar showed it).
  - In a narrow frame the examples no longer squeeze the page to a few pixels next to the Sidebar.
- **DatePicker and Breadcrumbs re-read from the live Figma** (2026-09-29):
  - DatePicker days follow the Corner Radius mode: a selected day and the range ends use Corner-Radius/Action/Small, a
    rounded square in Smooth, Standard and Luxury (they were always circles). The In-Range strip rounds at
    Corner-Radius/XSmall where a week starts or ends, and hovering an in-range day lifts it on Inverse/Solid/Default.
  - `DatePickerItem size="sm"` renders Figma's 24px Small item on Corner-Radius/Action/XSmall (it stayed 32px).
  - The DatePicker month button turns Corner-Radius/Base on hover and focus and has no side padding; the month and
    year wheels have no corner radius and fade 1 / 0.25 / 0.1 (Figma changed this from 1 / 0.4 / 0.2).
  - Breadcrumbs are 20px tall, as in Figma (28px before: the list padded 4px above and below for the hover plate,
    which still bleeds outside the trail).

### Changed
- Chip's `overrides` layer names follow the Figma layers (the user's choice, 2026-10-11): the Advanced count is
  `Badge` (was `Counter`) and the multi-select count is `Badge-Counter` (was `Multi-Count`). Unreleased API.
- **Zen Studio: slot props are switches, the Page header and the Screen header take real content (2026-10-10):** a
  component's prop that is a content slot shows in Properties as a switch (Figma's boolean), never as a text field, so
  PageHeader › Breadcrumbs on puts a real `<Breadcrumbs>` (its Item-List adds items) instead of a text label; a slot that
  takes one component gets it at once, others open the picker. PageHeader's Breadcrumbs, Meta and Tabs are slots beside
  Action- and Trailing-Slots, and a builder Screen's Header is a free slot (Figma Header Type=Custom) for any header a
  page needs. Assets: a Tab bar item (Tabs without panels); every Menu item gets its own id (three "invoices" rows were
  one row to the Sidebar); Breadcrumbs go on builder pages (a static trail).
- **Zen Studio: clicks on the canvas work like Figma (2026-10-09):** a click selects the outermost layer under the
  pointer in the current context (a frame's top level, or the selected layer's siblings; a click inside the selected
  layer keeps it), a double-click goes one level in (onto a text layer it edits the text), ⌘ / Ctrl-click selects the
  deepest element (again on it: its parts). So a Stack, Grid or List its children fill is one click away: on HR · Home
  46 of 99 layers could not be clicked before. Hover outlines what a press would select; ⇧ adds that layer, ⇧⌘ the
  deepest.
- **AppShell top bar spacing from Figma Header/Dashboard (2026-10-09):** Spacing/Padding/Small above and below (was
  Margin-Comfortable above, Padding/XSmall below), Margin-Comfortable at the sides: a 64px bar on desktop (was 72). The
  templates start their PageHeader 12px under it (paddingY sm), as Header/Dashboard's Main row.
- **Zen Studio: Auto layout in Figma's words and grid (2026-10-09, step 1 of the Figma-language inspector):** the Layout
  section of a Stack, Grid or FormFieldset is titled "Auto layout" and reads like Figma UI3's: labels above the fields, two
  field columns and an icon column, so every field lines up. Flow (Vertical · Horizontal, the Wrap toggle beside),
  Resizing (W / H; Auto shows no number; the W / H menu is Figma's — "Fixed width (240)", "Hug contents", "Fill
  container" one line each with its glyph, then "Add min width…" / "Remove min width" in the same menu instead of a
  separate min/max button), Alignment beside Gap (the cross axis — Position, Stretch, Text baseline — in the
  icon beside Gap), Padding as Horizontal | Vertical fields (equal values write one `padding`; the "Same padding on all
  sides" toggle is gone) and Clip content under Padding (moved from Appearance). Every token select (gap, padding,
  radius, position offsets, a multi-selection's spacing) reads token + value on one line, as the canvas spacing menu:
  "md … 16px" in the list, "md 16" in the field; the code keeps the token. A value set in code keeps its own row, with
  Figma's word, in the same place. The whole Design tab shares one grid — label and control in the two field columns,
  the icon column always kept — so fields, selects and toggles line up across sections; the alignment box's marks sit
  on their dots. Spec: `docs/research/studio-inspector-figma-spec-2026-10-09.md`.
- **Zen Studio toolbar, Figma UI3's tools (2026-10-09):** the canvas toolbar reads Move (V) · Hand (H) | Screen | Stack
  (A) · Text (T) · Image · Assets (⇧I) | Interact (I). Stack, Text and Image are placed with the pointer: the insertion
  line of a drag shows where they land (or why nothing there can take them), a click places them (one edit, the new
  layer selected) and the tool goes back to Move; Escape puts it away. Screen (on a page you made) adds a Screen on the
  page's device with a click on the canvas. Renaming a page renames its Screen still named after it.
- **Zen Studio: a page you make comes with its app frame (2026-10-09):** a blank page's Screen holds a Sidebar and a
  Page Header (desktop) and a Top and a Bottom Navigation (phone), each a real layer you edit and switch off or on in
  Screen (checkboxes). A tablet is laid out as mobile or as desktop (Screen › Layout). The Screen keeps both sets, so a
  device change keeps your edits; renaming the page renames the header's title; Export writes an AppShell (desktop) or
  the bars around the page (phone). Screen › Canvas paints it Canvas/Default, Alt (white) or Flat.
- **Zen Studio fixes (2026-10-09):** a right-click on a selected Stack's gap or padding opens that Stack's menu; ⇧A on
  one layer of a page you made selects the new Stack; Assets › Sidebar and App shell go onto a page you made (their
  selected item fixed, a page keeps no state), and their thumbnails no longer throw; Assets gains Voice recorder; a
  dialog's buttons sit 8px apart (Gap/XSmall) in the Studio sizes, as the chrome's other button groups.
- **Zen Studio Assets in Figma's way (2026-10-09):** one search over every library at the top ("Search all assets":
  the best components, icons and photos, each with See all); with no search, the libraries — Components (Zen DS),
  Icons, Photos — as rows with their counts. A library opens in place (← back) with its own search; components sit in
  groups that fold, as a grid of real thumbnails (drawn by the engine when they scroll into view; one that cannot draw
  shows its group icon instead of breaking the panel) or a list (Grid · List, remembered); Icons has Line · Solid in its
  header. Quick insert's preview no longer takes the Studio down when an item cannot render.
- **Zen Studio New page (2026-10-09):** pick a start (Blank or a template) and Create — no title or device to fill in: a
  blank page is "Untitled page" on a desktop Screen. Rename it with nothing selected (Page › Name) and change a Screen's
  device from its frame panel (Screen › Device: Phone · Tablet · Desktop with the Zen Mobile, Tablet and Monitor icons).
  The cards are Zen Cards (Border theme: a Pale frame; the picked one takes the Card's Active stroke) and Create /
  Cancel stay at the bottom of the modal while the templates scroll. The Grid columns' Mobile breakpoint and the
  Prototype panel's screens use the Mobile icon (was the telephone).
- **Destructive actions read Content/Negative/Light (2026-10-09):** Menu's danger items and Bottom Sheet's destructive
  items (text and icon) now use Negative/Light, as Button's danger levels already did: a coloured action reads in its
  Light step (Base only when a Button is pressed).
- **SelectField option `meta` (2026-10-09):** `SelectFieldOption` takes an optional `meta`, short text at the end of the
  option's row on the same line (Body/Small/Regular, Neutral/Base; before the check), e.g. a token's value
  (`{ label: "md", meta: "16px" }`); in the mobile sheet it sits before the check too. The field shows only the label.
- **Zen Studio inspector: inputs read the same everywhere (2026-10-09):** no per-field "Reset … to default" button
  (properties, Layout direction and alignment, Align in parent, Position offsets, text alignment, text style); a field
  goes back to its default from inside it ("None", "Default", "none · 0", Backspace) or with Reset all overrides. A row
  keeps a trailing slot only when it has a real action (Remove effect, Restore a binding, Relink gaps, Min and max), so
  every other control fills to the edge. The Studio's list rows (Pages, Layers, Assets, Quick insert, inspector lists)
  take Corner-Radius/Base, as the Zen Sidebar item does — the same corner as an input. The other Studio corners follow
  their Zen role: notes as Inline Message (Large), value chips as Tag (pill), control boxes (alignment, constraints) as
  inputs, the code block Base, New page cards XLarge (concentric around their Base thumbnails), row highlights and drop
  targets as the row; Pages / Layers tabs use the Zen Tabs corner. The storage line under Folders is an info tooltip
  (it stays a line only to ask for Reconnect or Retry).
- **Token modes "Studio" for the Zen Studio chrome (2026-10-09):** Component Size, Typography Configuration and Corner
  Radius each gain a mode Studio (`data-density` / `data-typography` / `data-radius="studio"`; ZenProvider accepts
  `density`, `typography` and `radius` "studio"): Figma UI3-like controls (Button / Input / Chip / Tab xs 24 · sm 28 ·
  md 32), Body/Base 13/20 with Caption 11 · Small 12 · Subheading 15 · Heading/4 18, and Rounded's corner ladder on a
  Base of 8 (Small 6 · Base 8 · Large 12 · XLarge 16 …, +4 a step so a 4px inset stays concentric; inputs 8 · 8 · 12 ·
  12; buttons stay pills). Every other value is Compact, Dashboard or Rounded. The Studio chrome uses them (ChromeScope);
  examples keep their own modes. Repo-only: the Figma file does not have these modes yet.
- **Zen Studio: Document | Studio spaces, folders, visual New page, modes only in Play/Present (2026-10-09):** the
  toolbar's breadcrumb is a Document | Studio switch. Document lists the docs pages; Studio holds the pages you make in
  folders (New folder, New page in a folder, Rename, Delete → Trash, Move to on each page; pages with no folder under "Not
  in a folder"), and with no page open the canvas shows the Studio home. New page shows the templates as a grid of
  scaled-down thumbnails with Blank page as a placeholder card, and the device as three cards drawn in their proportions.
  The toolbar keeps only light/dark: preview modes change in Present and now in Play, each in its bar's Modes panel,
  which opens with the Popover motion (zen-motion-pop-in; a fade with reduced motion). Play and Present change the
  example only — light/dark included — while the Studio's own UI (the bar, the panel) keeps the chrome modes.
- **DockIcon re-synced from Figma (2026-10-09):** sizes follow the live Dock-Icon set — `large` is now 48 (was 56) with
  a 24px icon (Element-Size/Popular/Medium),
  `xlarge` 56 (was 80) and the new `2xlarge` (`2xl`) is 80; Accent Solid draws its icon in Content/On-Colors (was
  On-Accent). Docs examples that relied on 56 / 80 moved to `xl` / `2xl`; MetricWidget's Large Dock-Icon is 48, as in
  its Figma instance. Apps using `size="lg"` / `"xl"` get the smaller step: use `xl` / `2xl` to keep 56 / 80.
- **SelectField opens a Bottom Sheet on mobile (2026-10-08):** when the nearest `data-breakpoint` (or ZenProvider's
  breakpoint) is `mobile`, the options open in a Bottom Sheet (title = `popoverLabel` or the label; `popoverSearch` →
  the sheet's Search) as a List whose picked row is selected with a check; a pick closes the sheet and the focus goes
  back to the field. Desktop and tablet keep the Popover. The trigger says `aria-haspopup="dialog"` on mobile.
- **BottomSheet opens inside a device frame (2026-10-08):** like Dialog and Menu, a sheet opened inside
  `[data-zen-overlay-root]` (a phone preview) renders in that frame and rises from the bottom of that screen, without
  `inline`; elsewhere it still goes to the page portal.
- **Flat hover backgrounds on step 2 (2026-10-08):** `Color/Background/Accent/Flat/Hover` and `…/Neutral/Flat/Hover`
  move from Alpha step 3 to step 2 (Light and Dark), like the other Flat/Hover tokens; Pressed stays on step 3, so hover
  and pressed now differ. Affects flat Buttons/IconButtons, Tabs, Segmented, Date Picker items and other Neutral flat
  hovers. Figma updated to match.
- **Classic docs code view and playground properties match Zen Studio (2026-10-08):** code samples use the Studio's
  code view (React · TSX badge, line numbers, Wrap and Copy; the "Coming soon" language select is gone), and the
  playground's property column reads like the Studio inspector ("Playground properties", Body/Small label + control rows).
- **Zen Studio: move several layers (2026-10-08):** dragging a row of a multi-selection in the Layers panel moves every
  selected layer (one edit, they stay selected; E2E ST-25), and Quick actions › Move earlier / later and the canvas
  menu's Move up / down act on all selected layers, as the arrow keys and a canvas drag already did.
- **Docs platform: old app-layer examples removed (2026-10-08):** the examples in `src/platform/appLayer/*` for pages
  that have a rebuilt `examples/pages/<page>.tsx` were never shown; they, `shellScreens.tsx` and their CSS are gone
  (about 4,000 lines). The playgrounds and the Templates page keep theirs.
- **Docs platform examples (2026-10-07, backlog batch 6b):** phone screens and playground stages paint Canvas/Default
  (§16; `PlatformPhone canvas="surface"` keeps a white screen); one-item Sidebar groups lose their title; HR · Home is
  full width like the other HR pages, and side content on full-width pages stops at 1440px; the phone templates sit
  two per row; the Badge and Button task tables fold the assignee into the task caption on a phone.
- **Component decisions of backlog batch 8 (2026-10-07, batch 6):** `TableMedia` defaults to `bold={false}` like every
  Figma media cell — **behaviour change**: pass `bold` to keep a bold label. PageHeader `headingLevel={2}` renders
  Heading/4 (the house ladder's h2). AiChatField (all styles) and the chat composer take the standard Input focus ring.
  On phones a BottomSheet pads 20px at the sides, a Medium Card takes radius XLarge, and AppShell's `floatingAction`
  hides while the page scrolls down. A Sidebar with a custom `brand` keeps its collapse control. A flat Secondary
  IconButton no longer trips `button/secondary-justified` (the Card Sub-Action ⋮ in the examples uses it). Text
  guideline: wrap a colour emoji in an opaque span inside light text.
- **Zen Studio toolbar without dividers (2026-10-06):** the vertical rules between the toolbar groups (brand · tools,
  theme · undo/redo, before Drafts) are gone; groups are told apart by space instead (4px inside a group, 8px between).
- **Zen Studio canvas chrome placed as in Figma (2026-10-06):** the Select · Hand · Interact tools left the top toolbar
  for a floating pill at the bottom centre of the canvas; the zoom pill moved to the top-right corner and keeps only
  the percentage and its menu (zoom in/out and fit are in the menu and on their keys); the mode hint became one "?" icon bottom-right whose tooltip gives the current tool's hint (a
  click opens Keyboard shortcuts). The pills sit above the overlays an example opens, so an open Dialog never covers
  the Select tool.
- **Sidebar groups never sit apart without a title (2026-10-06, user):** the Dashboard, Detail and Empty & error
  templates had Settings alone in an untitled second group, which read as an empty gap; it now ends the main list. HR ·
  Home's rail titles its second group "Modules", seen when the phone drawer shows it expanded.
- **Zen Studio: the Design panel reads like Figma / Lunagraph (2026-10-06, user):** one text size (Body/Small, 12px) for
  every line of the Inspector; every control shows at once — a value bound to code shows what it renders in its control,
  with a ƒ after the label (the tooltip names the expression), and an edit sets a fixed value (↺ restores the binding) or
  edits its data, while a state-bound value stays read-only in a field's frame; no more "Bound to {…}" + "Set fixed value"
  + caption lines. Properties without Figma groups split into Appearance · Content · Icon · State · Actions sections with
  a divider between them (an object prop such as Trend gets its own); the header is one row (name, ×N, Detach and Remove
  icons) plus the kind, Docs and the file. The Design · Code and Pages · Layers · Assets tabs are Figma-style text tabs on
  a quiet fill. Controls keep their 32px height. Spec: `docs/research/studio-design-panel-ui3-2026-10-06.md`.
- **Sidebar/Default-Width 240 / 260 (2026-10-06, user):** the token is 240px in Compact and 260px in Comfortable (was
  260 / 280), set in `tokens/source/figma/component-size.json`; Sidebar's fallbacks follow. The docs platform no longer
  pins its own 260px rail (classic `.official-platform` and the Studio board), so the docs nav and every Sidebar in the
  playgrounds, examples, templates and Present take the token as the density mode resolves it. The live Figma file still
  has 260 / 280: update the variable there, or a future variables sync brings the old values back.
- **One mood for every example: Canvas/Default + flat Surface/Default (2026-10-06, user rule, usage rules §16):** the
  example stage (desktop `screen` cards too) paints Canvas/Default instead of a Neutral/Pale tint, and boxes on it are
  Surface/Default with no border and no shadow: Card and MetricCard `theme="flat"`, ChartCard without
  `theme="border"`, ListBox, the Search split view without its Pale border, the Segmented file box (was Pale); the typography hierarchy's outline and
  page cards follow. 81 render and `code` lines changed in 27 example pages, so the code people and AI copy matches
  what the example shows; the list Cards on menu, text and visually-hidden screens became ListBoxes. Kept on purpose
  (a condition picks them): cards in phones, in AppShells, clickable and choice cards, the selected card; the two
  clickable cards that rendered Flat (Card › Browse projects, Dock Icon › Choose a project type) are Border again, as
  their code showed, since Flat has no hover state. The rule is
  in the usage rules, the example brief, `example-patterns.md`, the `zen-component-usage` skill, `AGENTS.consumer.md`
  and the Card / Background layers guidelines.
- **DescriptionList row actions take room only in their own row (2026-10-06, user: "lúc có icon copy lúc không… layout
  lệch", researched against iOS):** a row without an action now keeps its value on the list's end edge; a row with one
  puts it Gap/XSmall (8px) after its own value, its icon on the same edge. Before, one action gave every row an empty
  action column, so Type and Host in "Verify a domain" stopped short of the edge, under an empty gap. This is how an iOS value cell
  lays out an accessory (the content shrinks only in that row) and how Figma's Item (Content · Action) already did; lists
  where every row has the same action (Copy payment details) look the same as before. Guideline updated: mixing rows
  with and without an action is fine, except amounts that add up to a total.
- **Phone examples always in the phone modes; Present changes modes on its own (2026-10-06, user rule):** every phone
  frame (`PlatformPhone`: mobile examples, phone playgrounds) renders at Component size Comfortable as well as Typography
  Mobile, what a phone app sets (`<ZenProvider typography="mobile" density="comfortable">`), whatever the docs chips or the
  Studio canvas modes say (Button/Small 32 → 40, Avatar/Medium 40 → 48 inside the phone). In Zen Studio's Present, the
  Modes panel now sets the presented screen's own modes ("this presentation only"): a phone screen opens in Comfortable +
  Mobile, a desktop one in the canvas modes; picks hold while ‹ › step between examples, end with Present and never
  change the canvas. Light/dark stays the Studio's.
- **List Box `theme` (2026-10-06, user):** `<ListBox theme="flat" | "shadow" | "pale" | "border">`, the elevation of
  Card's Figma Theme (same tokens; no Semi-Pale), default `flat`. Examples and templates pick it by usage rules §16:
  flat on Canvas/Default and on Surface-Alt phone screens, shadow beside a default Sidebar (elevation follows the
  Sidebar), border on a white page or phone and inside another Surface. Exported `listBoxThemes` / `ListBoxTheme`;
  stories in `ListBox.stories.tsx`. Figma's Component/List-Box had no Theme property then (added 2026-10-12).
- **List Box only for List-Item rows (2026-10-06, user rule):** in the examples, templates and the List Item
  playground, a container whose content is a list of List-Item rows (with an optional title, search or filters above
  and buttons or pagination below) is now a `<ListBox header footer>` instead of a Card; everything else (Description
  List, toggles, forms, Tabs, Stepper, tables) stays in a Card. The phone Details and settings blocks that held a
  Description List or Toggles in a ListBox went back to `Card theme="flat"`.
- **List Box, a new component (2026-10-06, Figma Component/List-Box 14922:75297):** `<ListBox header footer>` is the
  white box of rows, the same on every device — only the tokens change by mode: Surface/Default, Corner-Radius/2XLarge,
  Header-Slot · Body-Slot · Footer-Slot padded Card-padding-medium sideways (24px desktop, 20px tablet and mobile); the
  header pads it on top and 8px below, the footer on every side, the body List-Container-Vertical-Padding above and below
  (12px desktop, 8px tablet and mobile) with rows Gap/3XSmall (2px) apart. Grouped lists and boxes of rows in the examples
  use it instead of a Box padded by hand. Zen Studio knows its three slots (Header/Footer toggles as in Figma) and the List
  Item's Contents slot; the insert palette offers "List box".
- **List Item follows the latest Figma (2026-10-06, List-Item 4080:11700):** one set for every device (no Device
  variant). Every row, with or without `onClick`/`href`, pads Padding/Small (12px) above and below and nothing at the
  sides (clickable rows padded 12px × Margin-Comfortable since 2026-10-03); the container insets the List sideways. A
  clickable row's hover/pressed/selected fill covers the row's height and hangs 12px past it sideways, with corners
  `Interactive-List-Item-Radius` (Corner-Radius/Base 12px desktop, Large 16px tablet and mobile). A List spaces every row
  Gap/3XSmall (2px), static and clickable alike; title and caption sit Gap/3XSmall apart (Info-Content).
  `--zen-list-bleed` is gone; `List inset` stays deprecated. Phone lists sit in the screen margin (`Box paddingX="lg"
  paddingY="xs"`); Zen Studio Detach gives a row `paddingY sm`. (Two intermediate syncs on 2026-10-05/06 were replaced.)
- **Breakpoint & Grids tokens:** `Interactive-List-Item-Radius` and `List-Container-Vertical-Padding` added from the
  live file (2,201 variables).
- **List Item examples in Figma (2026-10-06):** the ❖ List-Item page has an Examples section (five platform examples
  rebuilt from List-Item, List-Box, Card, Avatar, Dock-Icon, Badge, Button, Search, Chip, Description List and
  Top-Navigation instances, with variables and text styles; the phone screen uses Breakpoint & Grids › Mobile).
- **Mint ramp re-synced (2026-10-05 evening export):** 46 Mint and Mint-Alpha values, Light and Dark (Mint/9 #04CDA1 →
  #40E7AD in both, Light/Mint/11 #006C55 → #007455, Dark/Mint/11 #00CDA3 → #3CE7AF), matching the live file. Before
  this sync no component used Mint, so only the new Sky/Mint themes show it.
- **Placeholder text one step stronger (2026-10-05):** Color/Content/Placeholder now uses Neutral-Alpha/9 in Light and
  Dark (was step 8, the same as Disabled), as in the live Figma file. On Surface: Light 1.92 → 3.32:1, Dark 3.39 →
  5.48:1, so Dark field placeholders pass 4.5:1 (AiChatField and InputContent leave the Dark axe baseline). The overlay
  placeholders follow (On-White-Overlay → Light/Neutral-Alpha/9, On-Black-Overlay → Dark/Neutral-Alpha/9, both modes;
  user, the same day); Disabled stays at step 8.
- **Global Colors re-synced (2026-10-05 Figma export):** 235 values in six ramps and their Alpha twins, Light and Dark:
  Cyan, Grass, Blue and Bronze (steps 2–12), Orange and Zen (most steps); no token added, removed or renamed. Step 9
  moves in all six (Blue/9 #0F73FF, Cyan/9 #12A2CE, Grass/9 #3A9C4C, Orange/9 #E37A02, Bronze/9 #D76F37, Zen/9
  #FF6BD5), so Accent (Zen), Positive (Grass), Info (Blue) and the Support fills of these ramps shift; Zen hover
  (step 10) sits closer to the solid.
- **Chat composer radius (2026-10-05):** the message field uses Corner-Radius/2XLarge (24px in Rounded) instead of a raw
  20px and follows the radius mode; one line stays a pill, a multi-line field gets 24px corners.
- **Zen Studio: variant and boolean edits keep the component's behaviour (2026-10-05):** a prop bound to state
  (`checked={agree}` with `useState(false)` in the component) now shows that initial state and edits the useState
  literal (server op `setStateInit`, the example snippet follows) instead of reading "Bound to {agree}"; the component
  keeps toggling. A state prop with a `defaultX` twin (Checkbox/Toggle checked, Tabs/Segmented/Slider value, Accordion
  expanded, Menu open … 20 in all) that the source does not control writes the twin, and a locking literal `checked`
  moves to `defaultChecked`; the twin has no row of its own. A boolean switched off is removed unless its default is
  true (`collapsed={false}` used to stop TopNavigation's scroll-linked fold). The frame remounts once the hot update
  lands, so an initial-state edit shows on the canvas (`studio/inspector/writePlan.ts`, `studio/board/remount.ts`).
- **TopNavigation: up to three actions per Trailing-Slot, like Figma (2026-10-05):** Figma's Trailing-Slot
  (`.Primitives/Mobile/Top-Navigation/Trailling` 12013:39571) takes 3 in Top-Trailing and Header-Trailing. The bar now
  draws three `trailing` actions (two before), and `largeTitleAction` takes one action or a list of up to three; a
  folded root draws three in all. `trailingGroup` keeps its two-half pill. The bar's sides never shrink below their
  actions, so a long title ellipsizes instead of running under three Tertiary actions (centred as before while both
  sides fit). Harness `top-navigation/max-two-trailing` → `top-navigation/max-three-trailing` (same allow key
  `nav-trailing`; also warns past three large-title actions). Rule R9 and the guideline say three.
- **Zen Studio: TopNavigation slots re-read from Figma (2026-10-05):** the three Figma slots (Control-Slot,
  Top-Trailing, Header-Trailing) were already in the Studio; Top-Trailing and Header-Trailing now take three actions,
  Header-Trailing as a list (adding beside one `largeTitleAction={{ … }}` turns it into an array; data-slot form
  `list`, server op flag `list`). The empty Control-Slot's ghost sits just below the header, with its tag under it,
  instead of covering the large title. Figma: Trailing-Slot's preferred instances now point at Nav-Slot/Action
  (6340:42675); the seven old ones pointed outside the file.
- **Zen Studio code view names its language (2026-10-04):** every code view header (Snippet, Source, wide view) shows a
  language Badge (xs, neutral subtle): "React · TSX" for TSX, then TypeScript, CSS, JSON, Shell. It used to be a grey
  "TSX" caption that read like a title.
- **Zen Studio empty states show the illustration (2026-10-04):** the Code tab with nothing selected, Layers on a page
  without layers, and the Pages and Assets searches with no match use the Empty-State placeholder illustration (Figma
  6085:25816, 240px) with their own centre icon (code, layers, search) instead of `illustration={false}`.
- **DescriptionList actions keep one end edge (2026-10-04):** a row action sits Gap/XSmall (8px) after its value and a
  Flat icon action lines its icon, not its 32px box, up with the list's end edge (it overhangs by its own padding).
  Examples: Copy payment details gives every row its Copy action; Invoice total shows the discount as a removable Badge
  beside its term, so every amount, the total and Send invoice share one edge. Input help text keeps its icon on the
  first line when the message wraps.
- **Zen Studio: slots take every component, rules warn instead of hiding (2026-10-04, user):** the insert picker and the
  Assets tab offer every DS component (73 items in 11 groups: Navigation, Charts, Overlays, Page and Chat are new).
  Overlays come with the Button that opens them, controlled components with their state: the server adds
  `const [x, setX] = useState(…)` under a fresh name and imports useState. An item that goes against the host's rules
  (a control inside a clickable card, a card in a card…) is listed under "Not recommended here" with its reason and
  still inserts; the usage harness reports it at Save.
- **Zen Studio: the add-to-slot "+" is Accent (2026-10-04, user):** the canvas chip is Button/Icon-Main XSmall
  Accent and the Inspector Slots add button Icon-Flat XSmall Accent, so adding to a slot stands out.
- **Chip levels follow the selection mode (2026-10-04, user rule):** a multi-select group of Normal chips is Secondary
  for every chip (Selected = 2px dark outline), a single-select group Primary for every chip (Selected = dark fill); no
  example switches a chip's level on selection any more (Chip, Empty State, Avatar, Rating = Secondary; Segmented, Badge,
  Mobile list, HR Home, app-layer single filters = Primary). Chip › Weekly digest keeps its chips in their own Stack at
  Spacing/Gap/XSmall (8px) instead of the fieldset's gap.
- **List group headers (kickers) take the Light tone (2026-10-04, user decision):** Body/Small/Bold group headers move
  from Content/Neutral/Base to Content/Neutral/Light (3.7:1 on Surface and Surface-Alt, above Apple's 3:1 for bold
  text; about 7:1 in dark mode). 80 kickers in examples, templates and the app layer follow; `heading/title-not-light`
  lets a Body/Small/Bold heading take Light and the audit's kicker check now expects Light.
- **Card Sub-Action no longer insets the whole content (2026-10-04):** as in Figma (6643:51021) the Content slot keeps
  the full width; only the first row (the content's first child, or the first child of a Stack wrapping it) keeps clear
  of the action, so a DescriptionList or footer button under it reaches the card padding.
- **Segmented icon-only segments centre their icon (2026-10-04):** a segment with `label: ""` rendered an empty label
  box that pushed its icon off centre (Zen Studio's Direction control); an empty label now renders nothing, like `null`.
- **Zen Studio tone control shows the colour (2026-10-04):** a `tone` prop (Text, Heading, Link) is a select whose
  trigger and options lead with a swatch of the tone's Color/Content colour and name the token
  (Content/Neutral/Base…); the primary/secondary/tertiary aliases are listed only when the source uses one.
- **List Item follows Figma Interactive=Yes/No (2026-10-03, List-Item 4080:11700, List-Item-Example 14730:76349):**
  a row with `onClick` or `href` is Interactive=Yes: padding Spacing/Padding/Small (12px) × Margin-Comfortable, which
  follows Figma's Device variant (Device=Desktop Spacing/Padding/XLarge 24px, Device=Mobile Margin-Comfortable in Mobile
  mode 20px; in code by data-breakpoint, tablet 24px), and the hover/pressed/selected fill 12px outside the row content
  (12px from the row edge on desktop, 8px on phones) with Corner-Radius/Base (12px; was Large 16px). A row without either is Interactive=No: padding 0, no states; the container insets it.
  `List` spaces interactive rows Gap/3XSmall (2px) and static rows Gap/Medium (16px); a static row in a list of interactive rows takes
  their box. Containers no longer zero the row padding: a list of interactive rows inside a Card, Modal, Side Panel,
  Bottom Sheet, padded Stack/Box or Container gutter runs to the container's edge (`--zen-list-bleed`), so the rows' own
  padding lines them up with the Card/Modal padding (24px desktop · 20px mobile). `List inset` is deprecated (still works). Every example, template and app-layer list was
  refactored to the component's own spacing and the right case; grouped blocks of interactive rows on phones are
  `Box radius="xl" paddingY="xs"` (20px radius, 8px padding; kicker `paddingX="lg"` 20px), list cards pad
  Margin-Comfortable − Padding/Small above and below with a radius of Base + that gap (concentric on every device). The List Item playground has an Interactive toggle.
- **Zen Studio Detach of a List Item follows Interactive=No (2026-10-03):** a detached static row gets no `paddingX`/
  `paddingY` (it was always Padding/Small × the list inset), except next to clickable rows in its List, where it keeps
  their 12 × 24 box (or the deprecated `inset`, inherited from an outer List too). Cards and padded containers no longer
  zero the inset, and padding the Studio measured as none is left out instead of written as `"none"`. When the file cannot
  show whether the List has clickable rows, the measured padding decides and the approximations say so.
- **Input and Search focus borders from Component Theme (2026-10-03, Component Theme.json):** two new tokens.
  `Input/Border/Focus` (`--zen-input-border-focus`) is the Focused/Typing border of every field (Text, Select, Date, Number,
  Text-Area, Rich-Text, Search): Color/Focus/Neutral/Solid as before, Focus/Neutral/Subtle in Neutral-S7.
  `Input/Border/Popover-Search` (`--zen-input-border-popover-search`) is the Focused/Typing border of Search `variant="popover"`
  (the search row of Popover, SelectField `popoverSearch` and AutocompleteField): transparent, Focus/Neutral/Subtle in Neutral-S7 (Neutral-S4/S6 lose the Subtle border while focused). Search/Popover Hover now
  uses Field-Only's 2px Input/Border/Hover (was 1px), as in the live Figma file. Component Theme has 115 variables, the repo 2,179.
- **Neutral-S7 field focus is Solid (2026-10-03 evening, Component Theme.json, mode Neutral - S7):** `Input/Border/Focus`
  now aliases Color/Focus/Neutral/Solid in Neutral-S7 too (was Focus/Neutral/Subtle), so a focused Text, Select, Date,
  Number, Text-Area, Rich-Text or Search field shows the same solid border in all nine Component Themes. Search
  `variant="popover"` keeps Input/Border/Popover-Search (Subtle in Neutral-S7). Search re-checked against the live file:
  no other change.
- **Zen Studio code view names its language (2026-10-03, user: "Bổ sung tên cho ngôn ngữ ở code view"):** a code view
  with a file title (the Code tab's Source) now shows the language ("TSX", "TypeScript", "CSS", "JSON", "Shell") after the
  path and line range, in Caption/Medium Content/Neutral/Base, also while the file loads; untitled views keep the language as
  their title.
- **AI Chat field radius follows density (2026-10-02, Component Size.json):** new token `AI-Chat/Field/Corner-Radius`
  (`--zen-ai-chat-field-corner-radius`: Compact = Corner-Radius/Giant, Comfortable = Corner-Radius/XGiant). `.zen-ai-field`
  uses it instead of the fixed Giant, so the field stays concentric with its 40/48px buttons (Rounded: 32 → 36px in
  Comfortable). Component Size has 195 variables, the repo 2,177.
- **App-layer examples rebuilt (2026-10-02, user: "làm luôn"):** action-bar, app-shell, description-list, form,
  image, layout, link, menu, page-header, side-panel, text and visually-hidden now have their own example files
  (`src/platform/examples/pages/<page>.tsx`, 4–7 examples each).
  - They are built to the example brief, in the same Đìzai Studio world as the 43 component pages.
  - They follow the spacing ladder, one style per job, the phone rules and §15 grouped lists.
  - Every control works, and focus never drops to the page after an action.
  - Process: 4 builders of 3 pages each, an independent UX review per batch (2 P1, 25 P2, 33 P3), two fix rounds and
    a verify pass.
  - Shared or component findings went to the BACKLOG, for example the platform's Full screen rule and PageHeader on
    phones.
- **App layer, templates and playgrounds follow the spacing ladder (2026-10-02, user request):** every gap a page picks
  is one of 2xs · xs · sm · md · lg · xl (usage rules §13).
  - Two lines of one item (name + meta, count + total, file + size) are `2xs`; a section or card heading with its
    description is `xs`. Both were `3xs` (2px) in 18 places.
  - HR Home's page stack is `xl` with `sm` block padding like the other HR pages (it was `3xl`).
  - Playground property rows are `md` apart, the step for stacked fields (they were 4px).
- **Every component and mobile example rebuilt (2026-09-30 → 10-02):** all 43 component and mobile pages have new
  examples (one file per page, `src/platform/examples/pages/<page>.tsx`, found by `examples/registry.ts`) set in one
  believable world (Đìzai Studio, shared data and formatters in `examples/data.ts`), built from a brief
  (`docs/research/example-rebuild-brief-2026-09-30.md`), reviewed, polished and given a final six-criteria check
  (aesthetics, layer elevation, one style, one behaviour, clear context, complete interaction). New house rules from
  the user: one spacing ladder by relationship (usage rules §13), a Table that is not a widget has no container (§14),
  page-like desktop examples take a whole row, Medium sizes by default (Chip now defaults to Medium), phone screens
  follow the Top Navigation rules (scroll-linked large titles, long-enough lists). App-layer pages come next.
- **Grouped lists read as groups (2026-10-02, user report on the Toggle settings phone):** settings, profile and
  checkout groups on a phone are inset grouped: a Surface-Alt screen, one white block per group, the kicker above the
  block aligned with its rows (usage rules §15). Applied to the phone examples of Toggle, Avatar, Bottom Navigation,
  Chart, Date Picker, Dialog, Inline Message, Input, List Item and Stepper.
- **Docs phones preview real phone tokens:** `PlatformPhone` sets `data-breakpoint="mobile"` (margins 20/16 inside
  phones); examples keep the default insets.
- **Approved backlog fixes (2026-10-02):**
  - Toast: an action (Undo, View…) dismisses its toast after running (`keepOpen: true` opts out).
  - Search: the clear button returns focus to the field; `filterHasPopup` / `filterExpanded` describe a filter that
    opens a panel; the filter icon has a 24×24 hit area. Chip: a count is named "Filters, 2 applied", not "Filters2".
    Segmented: icon-only options show their name tooltip.
  - Avatar: an initials Avatar with `alt` is named; harness `avatar/solid-initials-contrast` warns about white initials
    on solid green, teal, orange or cyan. Badge `removeLabel`; a pressed Tag looks selected; Link `as="button"` looks
    like a link.
  - Dialog/ModalForm/BottomSheet: initial focus lands on a SelectField or the checked radio; ModalForm is noValidate
    and announces "N fields need attention"; the mobile Dialog keeps 20px side margins and clears the safe area; a
    form sheet focuses its first field or Search.
  - DateField is an APG date-picker combobox (`role="combobox"`, `aria-haspopup="dialog"`, `aria-expanded`) whose
    calendar opens on user focus only, and ArrowDown opens it with focus on the selected day (else today); an inline DatePicker is a group with `aria-current="date"` on today; AutocompleteField and Uploader
    move focus to the next item after a removal; Popover's Escape no longer reaches a parent overlay.
  - Breadcrumbs "…" keeps focus on the first revealed crumb; collapsed Sidebar footer buttons keep a name and tooltip;
    a vertical Stepper starts at its first marker; ListItem `titleLines={2}`; Bottom Navigation idle labels are
    Content/Neutral/Light on Default and Floating (user decision).
  - Chat: Reply focuses the composer, initials avatars show two letters, threads pin after web fonts load, call and
    file cards hug their text; Accordion Divider rows are fully clickable; OpinionScale labels never wrap to three
    lines; NpsScale falls back below 264px.
  - Example cards follow the docs breakpoint (they no longer force desktop), so examples reflow on a phone.
- **Component fixes approved with the examples pass (2026-10-01):**
  - Escape closes only the innermost popup: an open Select list, date picker, picker, Menu or Popover inside a Dialog,
    ModalForm, Side Panel or Bottom Sheet closes first, the next Escape closes the modal; with stacked modals only the
    top one answers.
  - ModalForm: a blocked submit focuses the first invalid field (`onSubmit` may return a promise). Dialog and ModalForm
    open inside the nearest device frame (`[data-zen-overlay-root]`, e.g. a phone preview).
  - RichTextField: the insert-link box is no longer a nested `<form>`, so the field works inside any Form.
  - Input: read-only fields show the focus ring; AutocompleteField shows no Create row for a value that is already a
    Tag; Form focus lands on the first Error tag of an invalid AutocompleteField.
  - DatePicker: `today` prop; days are named with their full date; an inline calendar has no popover surface.
    DateField forwards `minDate`, `maxDate`, `today`.
  - Bottom Navigation idle labels are Content/Neutral/Light (user decision; icons stay Placeholder as in Figma); Pagination `size="sm"` sizes the
    arrows and the range reads “1–10 of 1,284 results”; Badge remove is named “Remove <label>”; Chat labels are in
    sentence case, the composer shows a focus ring and an action-less call card keeps its bottom padding.
  - Accordion Box: the whole box header is the toggle; BottomSheet: `onSubmit` makes it a form; NpsScale and
    OpinionScale stay on one row on narrow cards.
- **Reduced motion keeps fades (2026-10-01):** under `prefers-reduced-motion` the movement factor is 0 instead of every
  duration: dialogs, sheets, side panels, the drawer, toasts and menus crossfade instead of sliding, colour and hover
  changes still fade, and the Toggle thumb, Accordion, Progress and the Sidebar width jump. WCAG 2.3.3 covers movement,
  not fades.
- **Popover, Menu and tooltip motion (2026-10-01):** every floating Popover surface (Menu, the Select dropdown, Chip
  filters, Table editors, the Sidebar flyout) fades in with a 4px slide from its anchor at Base Emphasized and fades out
  at Fast; tooltips fade out at XFast (Escape still hides them at once). Durations and curves across 22 components now
  come from the motion tokens: Dialog exits in 200ms (was 160), the standard SidePanel in 120ms.
- **Liquid Glass and Top Navigation gradients matched to Figma (2026-10-01):** glass follows the two Figma effect
  styles. Liquid-Glass/Normal (TopNavigation glass actions, AiChatField Liquid Glass) blurs 2px and Glass-Floating (Bottom
  Navigation floating-glass pill and action) 4px: Figma frost ÷ 2, where they were 12, 24 and 8px with an extra saturate.
  A light rim stands for the GLASS light (−45°), and the dark glass actions get their Liquid-Glass shadow. The gradient
  Top Navigation types (Bluring, Liquid Glass, Overlays) paint at 80% like Figma: the overlays are black 40% (was 50%) and
  Compact-Overlay 48% (was 60%).
- **AiChatField: the whole field is the hit area (2026-10-01):** a click or tap anywhere outside its buttons puts the caret
  in the prompt. The model switch is a 36px pill as in the live Figma (Button/Spacing/Small padding 8, Corner-Radius/
  Action/Small, Neutral/Flat fill with hover and pressed), so a press next to its label opens the model menu; it was the
  bare label. Liquid Glass keeps its glass shadow when focused.
- **Inputs and Search have Disabled again (2026-09-30, from Figma):** Text, Select, Date, Number and Text-Area take
  `disabled` as Figma Field-Only State=Disabled (same fill, Input/Border/Disabled, label, value and slot icons in
  Content/Disabled, Leading/Trailing Active=No and locked, Number steppers disabled); `disabled` alone now also sets
  the field's look and its label, not just the native element. `Search` takes `disabled` again (Search/Default is a
  Field-Only instance): the clear button and ⌘K hint hide and the filter locks. Autocomplete and Rich-Text keep
  Read-only only (Figma has no Disabled there), so `input/no-disabled` now covers just those two. Read-only stays the
  choice for a value people need to read or copy. The Input and Search playgrounds have a Disabled toggle.
- **Review batch 3–4 (2026-09-30):**
  - Date Picker gains the Figma Time-Picker: `timePicker` adds a Divider and From / To times (hh:mm + AM/PM picker) with
    All day, stacked on the single calendar and side by side on the dual one; `time` / `defaultTime` / `onTimeChange`,
    times join the Submit draft (`onApply`'s third argument); new `DatePickerTimePicker`, labels in en/vi.
  - Single choices in a Bottom Sheet (Chip › Mobile filter row, Button › Mobile footer CTA) are List + ListItem rows
    (Selected + check) instead of the accent-subtle sheet item.
  - Metric Widget examples fill their width: KPI, sales, team and goal rows share it equally (four KPI cards), the
    department budget is one even row, Service health and Inline metrics are equal cells split by Pale rules that stack
    in a narrow card; no empty tracks or orphan items.
  - Playgrounds show content slots empty (Card, Dialog Custom / Main-Contents / Side-Content, Side Panel, Bottom Sheet,
    Accordion); examples keep the real content.
  - Layout page rebuilt (researched against Material 3 canonical layouts, Polaris, Primer PageLayout, Every Layout,
    Atlassian): 9 examples — main column + aside, list-detail, annotated settings, toolbar + auto-fill gallery, readable
    width, equal-height cards, wrapping cluster, centred in a panel, mobile screen — whose columns really change on a
    phone; the playground gains Stack align/justify, Grid track lists / min width / one column on phones, Box padding and
    radius, Container width and margin.
  - Page Header examples take a full row each. The phone period switch is a single-choice Chip row (moved to Chip;
    Segmented guideline: no sliding Segmented on phones). Sidebar shells use PageHeader (h1, Heading/1) with h2 sections.
- **Table `onRowClick` (2026-09-30):** read-only rows that open a record are clickable as a whole: pointer, hover
  tint, a Tab stop per row, Enter/Space, a Focus/Accent/Solid ring; buttons, links, checkboxes and fields inside the row
  keep their own clicks. The column `onOpen` hover button stays for editable tables (guideline updated).
- **Table, Dock Icon and Chart Card match Figma (2026-09-30, found auditing the HR templates):**
  - Table: a px column `width` is now a fixed width (Figma FIXED) — a narrow container scrolls the table sideways
    instead of squeezing the column and wrapping dates; the column without a width fills (Figma FILL). Rows keep the
    fixed Table/Cell/Size (52): a 32–40px Avatar, Dock Icon or icon button (`TableMedia`, `TableActions`) and a label +
    Subtext cell spill into the padding instead of growing the row to 56–64. Labels next to media stay on one line.
  - Table `onRowClick` ignores clicks that bubble from a portal (a Menu, Popover or Dialog opened from the row).
  - Dock Icon Theme=Emoji: Medium draws a 28px glyph (Heading/1), Large a 36px glyph (Display/3) in a 48px tile.
  - Chart Card: `theme` (Flat default, Shadow next to Shadow metric cards) and `rangesFullWidth` (the range Segmented
    fills with equal items by default, `false` hugs); the legend is centred and the chart Tooltip is Medium (Figma).
  - Sidebar (Basic, collapsed): the panel hugs its logo like Figma 4081:15233 — 84px with the 28px logo, 88px (72px
    panel) with a 32px Avatar logo such as the HR rail, so the page starts at 80 as in Figma; a custom `brand` never
    widens the rail.
  - AI Chat Block: a suggestion longer than the block (a phone at Comfortable) ellipsizes instead of overflowing.
- **Medium is the default size for Tabs, Segmented and Chip (2026-10-01, user rule):** on desktop and phones; small only
  inside a genuinely narrow component space. Chip's default changed from small to medium (a filter row now lines up
  with Search and Buttons at 40px); Tabs and Segmented already defaulted to medium. Guidelines and the Do/Don't visuals
  follow it.
- **Mobile playgrounds: every control acts (2026-10-01):**
  - Top Navigation: the control-bar Search filters the project list. When nothing matches, an Empty State offers Clear
    search, which puts focus back in the field. The folded Search action scrolls back up (or expands a pinned-collapsed
    bar) and then focuses the field.
  - Bottom Sheet: Sort projects really orders the list (Most recent, Name, Most pages), and the sheet's Search narrows
    its options. The backdrop is now a Projects root whose large title folds with the scroll, and the modal sheet is
    "New project".
  - Bottom Navigation: each tab is a root, with its label as the large title, folding with the scroll. Tapping the
    current tab again scrolls back to the top.
  - Chart: only the line chart shows a range switch, because the budget stack is always by quarter.
  - The project rows line up with the bar's 20px margin.
- **Top Navigation keeps folding after a screen swap (2026-10-01, P1 G1):** a scroll-linked bar shared by a list and its
  detail screen stopped folding after root → child → root, because only the first fold element was measured. The fold is
  now measured again whenever it mounts. The interaction test in `tests/interaction/navigation.test.tsx` fails on the old
  code.
- **Focus never hides under a phone's overlaid header (2026-10-01, G2, WCAG 2.2 SC 2.4.11):** PlatformPhone gives the
  screen a `scroll-padding-top` equal to the part of the header that stays. A row reached by keyboard now scrolls clear of
  the bar instead of sitting under it. The Top Navigation guideline tells apps to do the same on their scroller.
- **Top Navigation: roots as in Figma, a pinned status banner (2026-10-02, user decisions G4 · G5 · G6):**
  - A root (a large title and no leading) hides the empty navigator-bar row while the large title shows, as Figma's root
    screens do (Top-bar=false). Its actions sit at the right of the large-title row. When the title folds, the bar title
    shows in that same row, so the header keeps its height (114px instead of 178).
  - `topBar` maps Figma's Top-bar boolean: `true` keeps the row above the large title (iOS layout).
  - `largeTitleAction` now sits in the trailing slot on such roots, so it stays in reach after the title folds.
  - New `banner` takes a Small AlertBanner pinned under the bar and the control bar, edge to edge, for a status that
    must stay in view (offline, syncing). It never scrolls away.
  - The guideline, props docs and interaction tests cover all three. The Top Navigation playground gains Back and
    Banner toggles.
- **Sidebar workspace switcher opens with the arrow keys (2026-10-02, P2):** Down and Up open the workspace list as Enter
  does (APG listbox button). The interaction test is in `tests/interaction/app-shell.test.tsx`.
- **Phone examples follow the Top Navigation rules (2026-10-01):** research and an audit of all 77 phones are in
  `docs/research/top-navigation-mobile-rules-2026-10-01.md`. It has a decision table, rules R1–R18, and a list-length rule:
  a list screen is at least 1.5× the phone's height, about 14 rows.
  - Typography › Master screen: folds with the screen's scroll (`scrollRef`), replacing a hand-made 24px trigger.
  - Typography › Child screen and App layer › Text › Mobile typography: open on order #1042. Back goes up to a real
    Orders root (14 orders, folding large title), and every order opens its own screen. The child bar is Compact.
  - Dates and times follow the house format: "Sep 12", "9:41 am".
  - Docs phones preview real phone tokens (`data-breakpoint="mobile"`). Lists keep their default inset, so rows,
    kicker headers and the large title share the bar's 20px margin.
- **Templates and App layer: UX interaction pass (2026-10-01):**
  - Toasts close after Undo and View.
  - An opened row stays selected while its panel is open.
  - Phone filters open Bottom Sheets instead of popovers. Phone tables with row menus or toggles become Lists.
  - Focus lands on a sensible control after dialogs, clears and empty states.
  - Negative dialogs focus Cancel first.
  - Dead "+" and microphone buttons in the Zen AI field now attach a file and fill the prompt (Home and every HR module).
  - Mobile list shows 10 orders, so its large title and Search fold. Mobile detail's bar shows its line once content
    runs under it.
  - App Shell examples follow the window's breakpoint, so at 390 the HR pages inside take their phone layouts. A status
    Badge no longer gets cut ("Appro…").
  - The docs stage no longer wraps Lists inside a phone, a full-bleed screen or a painted Box in a second bordered card.
- **Elevation follows the Sidebar, widget titles are Subheading (2026-10-01, user rules):** a screen keeps one
  elevation, set by its Sidebar — the grey Canvas with the default Sidebar (Surface + shadow) takes Shadow cards with
  no border; a white Canvas takes a Surface-alt or Flat Sidebar and bordered cards (never a shadowed Sidebar on white).
  Templates and App Shell examples follow it, and the App Shell playground couples Canvas, Sidebar style and card
  elevation. Sidebar gains `divider` (a full-height Pale line inside the Sidebar, for Alt/Flat Sidebars on white).
  AppShell lifts the Sidebar above the sticky top bar, so its shadow no longer stops halfway like a divider. Every
  widget title (Card, ChartCard, panel) is Heading/Subheading; harness `table/title-heading-4` now expects Subheading
  for a table inside a Card and Heading/4 for a bare table section. Metric (Icon-Highlight Medium–XSmall) top-aligns
  its Dock Icon with the label, as in Figma 595:55188.
- **Templates rebuilt as real product screens (2026-10-01, user request):** every page template was redesigned from
  Zen's own components, text styles and tokens and the UI-patterns research, with the Figma HR-Platform as a moodboard
  only (brief: `docs/research/template-rebuild-brief-2026-09-30.md`). The HR set lives in one product world (Đìzai
  Studio, Alex Duong, today Sep 30, 2026) backed by a shared typed module, `src/templates/hr/data.ts`: people and
  teams, leave kinds and balances, requests, real 2026 public holidays for five countries, expense claims and budgets,
  tasks, and the formatters the research asks for (month-name dates and ranges, the relative-time ladder, money,
  working days without holidays). Every visible control works: filters, sort, row detail panels, create and edit
  forms with validation, approve / decline / cancel with Undo, board drag, and phone layouts (lists, Bottom Sheets).
  Template titles are sentence case (`HR · My leaves`, `Detail page · Invoice`…). Lists inside templates no longer
  pick up the docs' loose-list card styling.
- **Desktop-screen examples bleed to the card (2026-09-30, user request):** templates, app shells, Sidebar shells, desktop
  chat, docked Side Panels and page layouts (every example flagged `screen`) fill the example card edge to edge — no grey
  stage, no inset, no frame border of their own — in the card and in full screen; page layouts keep Margin-Comfortable.
- **Full screen looks like the real web app (2026-09-30, user request):** a desktop screen in full screen is the page
  alone — no docs header, description, Code button or code panel — filling the viewport, with one floating "Exit full
  screen" pill at the top centre (Escape too). The App Shell playground gains Full screen with its current settings.
- **Flag and Metric Title-Highlight (2026-09-30):** `Flag` renders the 260 Figma country flags (7063:63834) by name,
  lazily loaded (Iconography › Flags; harness `flag/unknown-name`, `flag/no-emoji-flag`). `MetricCard`/`Metric`
  `variant="title-highlight"` is the Figma Metric-Inline/Title-Highlight primitive (title on top, value at the bottom,
  Dock Icon at the bottom-right) with an `action` slot.
- **HR templates rebuilt from Figma data (2026-09-30):** Home, Expense Overviews, My Leaves, My Expenses, Leave Types,
  Public Holiday and All Tasks were re-read node by node (component, variant, sizing, text style) and rebuilt with the
  same components and primitives, the Figma copy and sample data; invented views, rows and dialogs were removed. The
  HR sidebar follows Figma: neutral child selection, collapsed Configurations chevron, Space marks (Accent/Purple
  Avatar) and the Space section's add action.
- **Examples and templates use components as designed (2026-09-30):** HR templates show MetricCard / Metric instead of
  hand-built number cards; read-only tables and task lists open from the whole row (My Leaves, My Expenses, Leave Types,
  All Tasks list · Gantt · Kanban cards; Side Panel "Employee profile"); rows that mix people and things lead with
  same-size visuals (Avatar Medium beside a Dock Icon Medium); item icons in lists are Dock Icons (Side Panel, App Shell,
  HR Inbox, Search results, Detail template activity). Dialog examples (Form · Basic, 1-3, Half-Half, Big with steps,
  Invite teammates, Destructive confirmation) open from a members list, a profile card, a workspace switcher, an import
  history, a shared project and a project list.
- **Review batch 5 (2026-09-30):**
  - HR-Platform templates built from the live Figma file (Templates page, `src/templates/hr/`): Home, Expense
    Overviews, My Expenses, My Leaves, Leave Types, Public Holiday and All Tasks (List / Kanban / Calendar / Gantt, task
    dialog), all on one `HrShell` (Home icon rail, module Sidebar with workspace, Back and App Store, top bar with Pro,
    Settings, Inbox count and account). `HrRouterContext` links the pages into one app.
  - App Shell examples are HR-Platform screens: HR workspace (the templates linked, navigable), People admin (Search in
    the top bar), Home on the rail, Time Off in a drawer, Billing with a banner, Workbench on a flat canvas, the HR app
    on a phone.
  - Side Panel examples are full screens: employee profile from a table row (Tabs: details, leave balances,
    documents), filters for an approval queue (live result count), a docked inspector beside a page builder,
    notifications from the bell, a Submit leave form. Dialog's Unsaved changes, Success and Vertical actions examples
    open from a real page editor, site card and members card.
  - Visually Hidden: the icon-only table header no longer shows an icon; the status example drops its "screen readers
    hear" line; new "Unread counts on a phone" example.
- **Top Navigation follows the scroll like iOS (2026-09-30):** new `scrollRef` (the scrolling element, or "window").
  The large title and a folding Search slide under the bar with the content 1:1 (no jump), the bar title fades in once
  the large title is covered, a scroll that stops half-way settles open or closed, the folded Search becomes the
  top-right Search action, and the opaque types show a Border/Neutral/Pale rule only while content runs under the bar;
  covered parts are inert. `collapsed` still pins it by hand. The playground has Collapse: On scroll · Expanded ·
  Collapsed; the "Collapse on scroll" example drops its 24px onScroll threshold. Guideline: large titles only on
  top-level screens. `PlatformPhone` takes `screenRef`.
- **Examples and playgrounds carry no instructions (2026-09-30, user rule):** a component that needs a "click here /
  press Tab / try X" line has a UX problem, so the hint lines are gone (≈ 25: Badge, Popover, Date Picker, Breadcrumbs,
  Table, Rating, Color Selector, Toast, Link, Menu, Action Bar, Dialog, Chat). Status lines stay but start empty and
  report only what happened; empty panels show real copy ("Add dates", "5 files"), toasts carry real messages.
- **Action Bar on phones can be horizontal (2026-09-30):** a horizontal bar under 480px (a phone) shows two Large
  buttons side by side, Tertiary · Primary (the Bottom-Sheet dual footer), instead of Medium ones; the playground picks
  the device and the direction separately, and a "Filters on a phone" example shows Clear all · Show 6 prints. The
  guideline now chooses the phone direction by the actions: vertical when one main action leads, horizontal for a pair.
- **Sizes on phones (2026-09-30, user rule):** components keep their full size on mobile. Toggle guideline: phones use
  `size="large"`; Input guideline: phones use medium or larger. The smaller sizes are for dense desktop rows, tables,
  toolbars and panels. Harness `mobile/full-size-controls` (error) checks Toggle/ToggleButton and inputs inside a
  Bottom Sheet or a platform phone frame; Bottom Sheet › "Full-height settings sheet" now uses a Large ToggleButton.
- **Content hierarchy (2026-09-29, researched against 15+ design systems and WCAG):** every page and phone screen keeps
  exactly one h1 (a compact TopNavigation bar title is the h1 in its bar style, also while collapsing);
  `<Heading level>` defaults follow the ladder (2 → Heading/4, 3 → Subheading, 4 → Body/Extra/Bold); Accordion takes
  `headingLevel` (its triggers sit inside headings); an EmptyState inside a ChartCard steps below the card title; group
  labels in Menu, Popover and Select are labels, not headings; phone examples render in the Mobile typography mode. The
  hierarchy checks accept list-group kickers and h1/h2 overlay titles and no longer flag the TopNavigation bar h1.
- **Typography and colour from the 2026-09-28 Figma variables:** Dashboard and Mobile text styles have new sizes, line
  heights and tracking (Dashboard: Heading/1 28/36, Heading/3 22/28, Display/1 45/52, Caption 11/16, Label/Small 9;
  button labels are no longer tracked tighter); Popular is unchanged. In Light mode `Color/Content/Neutral/Base` text
  and the Neutral Solid hover fills are darker (Gray/11).
- HeadingField keeps its Figma height (Input/Size/Heading-H1–H3: 40/36/32, Comfortable 44/40/36) and centres the
  heading text in it; it used to take the text's line box, which is now smaller.
- Component variant attributes are `data-tone` (was `data-theme`), and Sidebar density is `data-sidebar-density`
  (was `data-density`): those names are the token mode attributes, and every variant element used to re-declare the
  component-theme variables. Styling hooks that targeted `[data-theme=…]` on a component must switch to `[data-tone=…]`.
- Inter ships as WOFF2 instead of WOFF: 771 KB instead of 960 KB for both files (normal 367 KB, italic 405 KB). The
  font tables are unchanged, so text renders pixel-identically.
- **Tokens from the 2026-09-29 Figma exports:** in component theme Neutral - S4, a selected Secondary chip now looks
  like Neutral - S1: a Surface fill with its shadow, and the solid active border at the Primary active weight (it was a
  Subtle fill with a thin Subtle border, no shadow). Small input fields match Medium ones: `Corner-Radius/Input/Small`
  is 12 / 12 / 8 / 2 px in Rounded / Smooth / Standard / Luxury (was 8 / 8 / 4 / 2).
- **Global Colors from the Zen Plugin's Dark-contrast revision (2026-10-04 Figma export):** 420 values moved (210 solid,
  210 Alpha); no token added, removed or renamed. Dark shades now sit further from the canvas than their Light twins:
  steps 2–8 are lighter (Gray/2 #1C1C1C, Gray/3 #262626, Gray/8 #696969), so Dark surfaces, subtle fills and borders
  read stronger, and Dark Neutral step 9 is darker (Gray/9 #8D8D8D) so its hover stands out. Accent hover (step 10)
  moves further from the solid in both modes, and Dark accent Base text (step 11) is darker and more saturated
  (Blue/11 #86BCFF, was #CAE2FF); bright solids (Sky, Mint, Yellow) darken on hover in Dark. One-step rounding at Light
  step 2.
- **Global Colors from the Zen Plugin's new ramp algorithm (2026-10-03 Figma export):** 258 values moved (109 solid,
  149 Alpha); no token added, removed or renamed. Light Neutral steps 4–6 are spread evenly between steps 3 and 7
  (Gray/4 #E5E5E5, Gray/5 #DEDEDE, Gray/6 #D7D7D7), so the Neutral Subtle border, hover and pressed fills and the
  disabled solid read slightly stronger. In Dark, step 2 is a little lighter (Surface and Canvas/Alt #1A1A1A, was
  #191919), Neutral steps 4–5 are spread evenly (Gray/4 #2A2A2A) and the accent steps 4–7 a little darker (Support
  Soft fills, Subtle borders). One-step rounding changes on Light Gray/10 and 12, Orange/8, Brown/7 and Dark Gray/6–10.
- **Global Colors step 3 (2026-09-29 Figma export):** step 3 of every colour ramp and its Alpha twin moved (79 values;
  no token added, removed or renamed). It is a little darker in Light and a little lighter in Dark, so the Subtle
  fills, Pale borders, pressed states and disabled borders built on it read slightly stronger.
- **Dark Gray step 9 (2026-09-29 Figma export):** Dark/Gray/9 is #929292 (was #656565) and Dark/Gray-Alpha/9 is
  #FFFFFF8B (was #FFFFFF5C), from the Zen Plugin's Dark Neutral step 9. In Dark mode the Neutral solid (e.g. the
  neutral Progress circle's done ring) and `Color/Content/On-Black-Overlay/Light` are lighter; Light is unchanged.
- **Dark Alpha steps (2026-09-29 Figma export):** 69 Dark Alpha values at steps 1–9 are now bright hues at low alpha
  (most were near-opaque dark colours), e.g. Dark/Teal-Alpha/5 #003F37F5 → #00FFDB2F; step 3 moved in Orange, Yellow,
  Golden and Mint. In Dark mode the Subtle fills and borders built on them (Warning InlineMessage and Badge; orange,
  yellow and golden Avatar, Badge and DockIcon; the orange and yellow Progress ring) let the surface under them show
  through: on the canvas they look almost the same, on a lighter surface slightly lighter. Gray and Light are unchanged.
- **Dark ramps (2026-09-29, fourth Figma export):** steps 1–8 of the Dark colour ramps are a touch lighter (at most
  4/255 per channel), with small matching Alpha adjustments; Light is unchanged. In Dark mode the canvas is #121212
  (was #0F0F0F) and Surface/Default #191919 (was #1B1B1B), so surfaces stand out from the canvas a little less and
  rely more on their border; Neutral text is slightly brighter (Gray/12 #FDFDFD, Gray/11 #D5D5D5).
- **Matched to the live Figma file (2026-09-29):**
  - Checkbox, Radio Button, Toggle and Table cell captions use Caption/Regular 11/16 (was Body/Small/Regular 12/16).
  - Toggle tracks size from the dot plus Spacing/Padding/3XSmall on each side.
  - Chat text bubbles keep Spacing/Gap/3XSmall between the message and its time, and cap the text at 220 / 516px
    (Mobile / Desktop).
  - Search in a popover (`variant="popover"`) keeps a 1px Input/Border stroke in every state (Input/Border/Hover on
    hover, 1px instead of 2px) and draws no focus ring. The stroke is transparent in every theme except Neutral - S4.
  - Table trend badges use the trend-up-01 / trend-down-01 / minus icons. The in-place editor pads 12 × 16, keeps
    XSmall between its tags and the input, and draws its underline inside the cell.
  - Segmented Medium badges get Spacing/Padding/3XSmall on each side.
  - Breadcrumbs: 4px between an item and its chevron, 8px between items (was 0 and 2).
- **AppShell:**
  - The top bar follows Figma Header Type=Navigation: 72px on desktop (Margin-Comfortable above, Spacing/Padding/XSmall
    below), 8px between the toggle and the Breadcrumbs, and 12px between actions. It was 64px, centred.
  - The header content (Breadcrumbs, Search) takes a row of its own when it does not fit beside the toggle and the
    actions. A top-bar Search stops at 400px (Figma Center-Slots).
  - A collapsed rail keeps the same 24px gutter to the page as the expanded Sidebar.
  - `layout="auto"` follows the shell's own width instead of the viewport, so a shell in a split view, iframe or preview
    frame gets the drawer when it is narrower than 1024px.
  - The drawer renders next to the shell instead of in the portal: fixed to the viewport in an app, or to a preview
    frame that sets `contain: layout`.
  - A shell inside a scrolling frame can fill it by setting `--zen-app-shell-height`.
  - Templates Detail and Settings put Breadcrumbs in the top bar; the Detail page drops its PageHeader Back.

### Removed
- **Colour ramps VT, Chat, Brand-Ananas and Neutral-Ananas (2026-09-29):** 192 Global Colors primitives are gone, in
  Light and Dark and with their Alpha twins, e.g. `--zen-light-vt-9` and `--zen-dark-chat-3`. No Zen token or component
  used them. Global Colors now has 960 variables and the library 2,176.

### Quality
- **Target check follows WCAG 2.5.8's spacing exception (2026-10-05):** the platform audit and `zen-ds audit` flag a
  phone target under 24×24 only when a 24px circle centred on it meets another target (or another small target's
  circle), so a lone text link in a list row no longer counts. A 390 pass of all 61 pages had found two cases: the
  Input label tooltip (fixed above) and the lone links on the Tooltip page (exempt).
- **Spacing ladder check (2026-10-02):** `audit.mjs --quality` (so `npm run qa`) warns `ladder` when a rendered
  gap is not one of the ladder's six steps, or when peer groups laid out alike are wider apart inside than between
  each other. It reads Stack, Grid and example markup; components keep their own gaps. All 61 pages pass it at 1512
  and 390 (0 findings).
- **Audit tools read phones and dialogs right (2026-10-02):** target and edge checks measure controls in a scaled docs
  phone at their app size (no false positives at 390). The density snapshot skips inert content such as a collapsed
  Accordion panel. The dialog check presses Escape a second time when the first one only closed a popup inside the
  dialog (a DateField calendar). `shoot.mjs` takes `--timeout=` and `--wait-until=` for a busy machine.
  The combobox check knows the APG Date Picker Combobox (`aria-haspopup="dialog"` or `"grid"`). It expects a calendar
  dialog, focus inside it, and focus back on the field after Escape, not a listbox.
- **Motion rules (2026-10-01):** `motion/token-only` (raw durations or curves; endless loops exempt),
  `motion/no-layout-animation` (width, height, top/left, margin, flex-basis) and `motion/reduced-motion`, which now also
  covers transitions that move and accepts `--zen-motion-movement` or fade-only keyframes as the fallback. The platform
  audit, the behaviour probes and the browser tests (`tests/setup.ts`) freeze animations, since reduced motion no longer
  zeroes them (axe sampled a fading Popover); the interaction harness waits for the Select list's exit fade.
- **Outline warnings on by default (2026-09-30):** `audit.mjs --quality` now reports outline-h1, outline-start,
  outline-card and outline-siblings (`--no-outline` turns them off); the baseline holds the screens that still lack an h1
  (Chat desktop, Sidebar shells, Side Panel "Docked inspector"), and `rhythm` was re-seeded after its messages changed.
  The gate maps edits in `PlatformPhone.tsx` (every page with a phone frame), `PlatformTypographyHierarchy.tsx`
  (Typography) and helpers in `PlatformMobileShowcases.tsx` (through the examples that use them) to their pages.
- **Gate: parallel contract suites (2026-09-30):** every contract run builds its harness in its own folder
  (`tools/figma-contract/.out/<suite>-<pid>`); a shared one let concurrent suites load each other's cases, and 18 of 23
  failed on a token change. The gate runs 4 suites at a time (`ZEN_QA_SUITES`, one by one under `--serial`), and a
  token sync takes the fast path by itself: `tokens.css` written by `npm run tokens:build` no longer needs `--files`.
- **Proportional process (2026-09-29):** a tier table (XS/S/M/L) in AGENTS.md decides how much planning, QA and
  logging a change gets. `npm run qa` now checks only what changed since the session's last pass (token edits → the
  pages that use them), with `--only=` and `--keep-going`; static gates run only for what you edited and stop the run
  early on a ✗; the Stop hook asks for at most 12 new contact sheets and lets a turn end while a run is still going.
  `figma-console-extract.js` works in `use_figma` as is and adds `__HASHES(ids)`. A token-only change takes a fast
  path (tokens:check, the consumers' Figma suites, contrast and fit on the consumer pages; no behaviour, smoke or
  TypeScript): 7 pages in 138 s instead of 256 s. New label keys check only the components that read them, and
  `--all` is reserved for changes every page renders.
- Browser tests (Vitest, Chromium): every component renders in light and dark with an axe baseline that only
  shrinks; size spellings render identically; interaction tests for Menu, Dialog, Tooltip, useToast, Table,
  Pagination, Accordion, Form and ZenProvider. CI workflow for every gate. Pixel-level visual diff tool for the
  docs platform.
- **Build-QA gate** (`npm run qa`; skill `skills/zen-build-qa`; `docs/qa/build-qa-process.md`): one command after
  every component, playground or example change, scoped to the files the session edited. It runs the static gates,
  the new **style guard** (`npm run style:check`: 15 rules for spacing, radius, typography, colour roles, shadows and
  slot sizes in CSS and inline styles), runtime checks for text styles, content hierarchy, token scale, concentric
  corners and Comfortable density (`platform:audit --quality --density`), dark mode, **behaviour probes**
  (`npm run platform:behaviour`: focus ring, keyboard reach, APG keys, dead clicks, hover), example coverage and
  1512/390 screenshots. Claude Code hooks lint every edit at once and hold a turn until the gate passed and its
  screenshots were opened. Pre-existing findings are baselined; only new ones fail.
- Figma contract suites for all six Button sets (every size × level × state) and Input/Heading. The checker also
  verifies radius bindings in a second Corner Radius mode, gradient strokes, and exceptions pinned to the value code
  renders.
- Harness rules from the behaviour probes: `interaction/no-noop-handler` (a no-op handler on any Zen component,
  action objects included), `interaction/controlled-needs-handler` (a controlled prop without its change handler,
  e.g. `month` without `onMonthChange`), and for CSS `focus/state-parity` (a focus selector in the same rule as its
  resting state) and `focus/selected-fill-only` (focus drawn only as a fill on an item whose selected state is a
  fill). Interaction tests for the focus fixes: `tests/interaction/focus.test.tsx`.
- Harness rule `interaction/action-without-handler` (repo examples, playgrounds and templates; apps are not judged):
  a Button or `<button>` without `onClick` / `href` / `type="submit"`, an action object (`leading`, `trailing`,
  `action`, `primaryAction`, `subAction`, `actions`, `suggestions`…) without `onClick`, and pressable `items` whose
  list has no `onSelect` / `onNavigate` / `onItemClick` / `onValueChange`. Documented defaults pass (Dialog, ModalForm,
  SidePanel and BottomSheet actions close the overlay; a Menu opens from its trigger). `icon-button/needs-action` now
  also checks IconButtons whose label is a template literal, and the usage scanner no longer reads a glob such as
  `accept="image/*"` as the start of a comment (it hid the code after it from every rule).
- Style-guard debt is paid off: `tools/style-guard/baseline.json` went from 376 findings in 32 files to 0.
  - Component CSS binds the token that the live Figma node binds.
  - Platform CSS and example inline styles use the Spacing, Corner-Radius, typography and shadow tokens.
  - Deliberate exceptions carry a `zen-allow-<rule>` reason that cites the Figma node.
  - With an empty baseline, every finding is new, so the gate reports it.
- Runtime check `fit` (`platform:audit --quality`, so `npm run qa`): text wider than its own box with no ellipsis and
  no scroll, which runs into its neighbours or is cut off. It also looks inside `overflow: hidden` ancestors, which the
  `overflow` check skips, so the Segmented that read "404 No resultsFirst use" on 2026-09-28 is now caught. With
  `--density` it also runs at Comfortable. The 24 findings already on the platform are baselined. `audit.mjs` also
  gains `--baseline-update=<kinds>` (seed one kind without touching the others) and `--css=<file>` (re-create a fixed
  bug to prove that a check catches it).
- App Shell harness rules:
  - `app-shell/primary-in-top-bar`: a Primary or Accent Button in `header` / `headerActions`.
  - `app-shell/nested`: an AppShell inside another.
  - `app-shell/breadcrumbs-once`: Breadcrumbs both in the top bar and in the PageHeader.
  - `app-shell/forced-layout`: apps only, `layout="sidebar" | "drawer"`.
  - Interaction tests in `tests/interaction/app-shell.test.tsx` (11) cover the rail toggle, the drawer (focus, Tab,
    Escape, Close, section title, choosing a page), the shell width, the skip link, the count in the accessible name
    (en/vi), the account Menu and `useAppShell`.

## [0.3.0] — Unreleased

This covers the uncommitted working tree on top of commit `eafb0de` ("Udated", 2026-09-26). `package.json` already says
0.3.0. Details are in `docs/context/session-log-2026-09-26.md` (09-26 → 09-28) and `session-log-2026-09-27.md`.

### Added — components

- **Layout and content:**
  - Divider
  - InlineMessage
  - EmptyState
  - Stepper
  - Slider
  - Card
  - DockIcon
  - List + ListItem
  - Table: sort, select, in-place editor with text/number/select/tags cells
  - DescriptionList
  - ActionBar
  - Image
  - VisuallyHidden
- **Input and feedback:**
  - Rating, RatingDisplay, OpinionScale, NpsScale
  - ColorSelector
  - Metric, MetricTrend, MetricCard
  - Uploader: FileUpload and UploaderFileItem
  - SidePanel: Standard and Modal
  - ToastStack
  - FileIcon: 10 formats from Figma `icon-media-file`
- **Mobile and conversation:**
  - TopNavigation
  - BottomNavigation
  - BottomSheet
  - Chat kit: thread, bubbles, file/call/photo cards, reactions, hold-to-react, reply, composer, conversation list,
    hover actions, avatar group, emoji picker
  - AiChat, with a thinking indicator
- **Chart:** Line, Stack bar, Card.
- **Motion:** motion tokens (`--zen-motion-duration-*`, `--zen-motion-ease-*`), shared keyframes, `usePresence`.
  SidePanel, Dialog, ModalForm and Toast animate in and out, with a reduced-motion fallback.
- **RichTextField:** rebuilt on Figma Input/Richtext. `RichTextEditorBar`, `RichTextCommand`, `RichTextBlockType` and
  `richTextBlockTypes` are exported.

### Added — props and API

- **Chat:**
  - `ChatThread device` ("mobile" | "desktop"): text max 220 or 516.
  - `ChatMessage`: `holdActions`, `onHoldAction`, `reaction`, `onReact`, `onMoreReactions`.
  - `ChatReactionPicker onMore`. Without it, "+" opens the built-in emoji picker. `ChatReactionKind` accepts any emoji.
  - `AiChatBubble`: `thinking`, `thinkingLabel`.
- **Mobile navigation:**
  - `BottomNavigation backdrop`: "surface" (default) or "none" for glass over media.
  - TopNavigation Search control bar folds into a trailing Search action.
- **Controls:**
  - `Segmented fullWidth`.
  - `Chip`: `onPopoverCreate` and `popoverCreateLabel` (Manual-Add-New).
  - `AutocompleteField`: `onCreate` and `createLabel`.
  - `PopoverItem control="checkbox"` (multi-select).
- **Metric:** `iconTheme`, `iconBackground`, `iconEmoji`.
- **Uploader:** `extended` prop and single-file mode.
- **Sidebar:** `SidebarSubMenu` flyout, `onSubMenuClose`.
- **Input:** `InputLabel labelId`. The label info tooltip is now a real `<button>`.
- **Density:** Component Size mode (`data-density` compact/comfortable) applies to every token-sized component.

### Added — package and composition layer (vibe-code readiness, part 1)

- Installable library: ESM with preserved modules, `.d.ts`, one `styles.css` (+ optional `reset.css`), `exports` map,
  React 19 peer dependency; the docs platform is no longer part of the package.
- Icons: 96 core icons render synchronously, the rest load from 256 lazy buckets; `icons/all`, `icons/names`,
  `registerIcons`, `preloadIcons`.
- `ZenProvider` (token modes, Canvas, portal root, toasts via `useToast()`).
- Props API generated from the TypeScript sources (`docs/api`, compact props in `docs/guidelines/index.json`),
  `AGENTS.md`, `AGENTS.consumer.md`, `llms.txt`, `docs/getting-started.md`.
- Composition layer: Stack, Grid, Box, Container, Text, Heading, Link, Menu, AppShell, PageHeader, Form +
  useFormState, VisuallyHidden, DescriptionList, ActionBar, Image/Thumbnail; eight page templates in `src/templates`.
- Defaults: IconButton `tertiary`, Popover closed, Sidebar without product branding and with an `aria-label` prop.

### Changed

- **Segmented:**
  - The default level is `secondary`.
  - The selected item has no hover.
- **Chip:**
  - A Chip owns a Popover only with `popoverItems` or `onPopoverCreate`. `dropdown` alone is just the chevron.
  - The caller's `aria-haspopup` and `aria-expanded` are kept.
- **Popover Item:** synced to Figma 829:20006.
  - Selected uses Active/Neutral/Subtle.
  - Avatar Small is always 32px.
  - Label and Subtext truncate to one line (a deliberate deviation from Figma).
- **Table:**
  - The `caption` is Heading/4.
  - An edit that ends refocuses the cell without a ring.
- **Figma parity passes** (size and spacing) on Chat, AiChat, TopNavigation, BottomNavigation, BottomSheet, Uploader,
  Breadcrumbs, SidePanel close and Input Read-only. Read-only fields draw a real 2/2 dashed stroke.
- **Close and dismiss buttons** are Flat Primary everywhere.
- **Shadows:**
  - Popover, Tooltip, DatePicker and the Sidebar flyout use the `-shadow-unclipped` effect (spread 0, as Figma renders
    them).
  - Subtle, Pale and Surface-Alt fills lose their outer drop shadow (house rule §9, theme-aware `-shadow-off` tokens).
- **Theme scope:** component themes follow nested `[data-theme]` scopes (build-tokens selectors).
- **Icons:** named icon sizes (`--zen-icon-size-*`) and Popover rows now follow density.

### Fixed

- **Modals:**
  - The modal Tab trap (Dialog, ModalForm, SidePanel, BottomSheet) let focus escape past roving-tabindex items.
  - Opening a Dialog whose Primary is disabled left focus outside it; Dialog now focuses its first field.
  - The AppShell drawer did not trap Tab.
- **Chat:**
  - Popup triggers announce the popup they open (listbox or dialog).
  - React and More return focus when they close.
- **Popover:** a selected item had no visible keyboard focus.
- **Pagination:** on phones it stays on one line in Comfortable density.
- **AI Chat:** answer actions wrap instead of overflowing.

- Chat File and Call text crop.
- Mobile filter row: Sort opened a stray empty Popover.
- Search example padding.
- SidePanel stretched fixed-size visuals (the Row details avatar).
- Bottom-nav blur bleeding over the device bezel.
- Reactions tab emoji rendered faded.
- ModalForm still animated under reduced motion.
- Card and Popover context menus opened far from their button.
- The Table tags cell couldn't remove a tag.
- Input Leading/Trailing slots clipped wide content.
- Sidebar workspace avatars were not square.
- Slider was not flush at 0.
- Scrims faded the panel inside them.

### Harness, QA and docs

- **Usage harness** (`tools/usage-guard`): 24 → **135 rules**.
  - Now scans CSS and `src/components/**/*.tsx`.
  - Every rule has bad/good fixtures.
- **House rules** in `docs/component-usage-rules.md` §1–§12, including:
  - §6 borders
  - §7 content colours
  - §8 background layers
  - §9 no shadow on tinted fills
  - §10 back chevron
  - §11 Surface on Canvas/Alt needs a border
  - §12 icon tooltip after 1s
- **Platform audit** (`npm run platform:audit`): `surfaces`, `edges` and `sizes` checks at error level. With
  `--smoke` they also run after every example click.
- **Guidelines:** generated for all 49 slugs, with Do/Don't visual pairs and Keyboard and API tables.

### Platform (docs site only, not part of the package)

- **Navigation and layout:**
  - Page history and deep links.
  - Responsive drawer.
  - Nav search (⌘K).
  - Sticky "On this page" pill rail with ↑/↓ section jumps.
- **Examples:**
  - At least 4 per component.
  - Example cards are equal height (subgrid) with Heading/4 titles.
  - Desktop chat examples.
  - Paginated examples carry real data.
  - Examples that are a whole desktop screen (`screen: true`) have a **Full screen** button. This covers the Sidebar
    shells, desktop chat, the docked SidePanel, desktop typography pages, App Shell and the desktop templates. Overlays
    keep working in full screen, and Escape leaves it.
- **Device simulator:** iPhone 15, iPhone 15 Pro Max and iPad, with status bar, safe areas and bezel.
- **Media:** real photos and video in `src/assets/media`; credits are in `CREDITS.md`.
- **Typography:** platform typography from `Typography Configuration.json` (platform only, not in the Zen docs).

## [0.2.0] — 2026-09-26

- Components aligned with the live Figma file `9nZv4uW2LT21yuHabMTCh1`: commit "Zen DS v0.2.0: align components with
  live Figma".
- Checkbox hover on selected and disabled boxes.
- Accordion, AlertBanner, Pagination, Skeleton and Toast, with platform pages and stories (commit `eafb0de`).
- History up to here is in `docs/context/session-log-2026-09-24.md` and `-09-25.md`.

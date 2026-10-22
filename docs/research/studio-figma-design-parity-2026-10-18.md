# Zen Studio design page → every Figma design feature, in Figma's words (audit + plan, 2026-10-18)

User, 2026-10-18: "Đánh giá và kiểm tra lại tính năng của Studio (chưa sửa code). Tôi muốn mọi tính năng chỉnh sửa, và
thiết kế mà Figma đang có theo đúng ngôn ngữ Figma cho trang thiết kế của studio. Làm plan để làm giống vậy" — then
"kiểm tra cả ngôn ngữ UX writing trên UI element của studio".

**Scope.** The design page: a page made in the Studio (`local:<id>.zen.tsx`: Board › Screens / Overlays). Figma Design
mode, UI3 (2025–2026). Prototype mode, Dev Mode, comments and multiplayer are out of scope except where a design-mode
key collides with them. Baseline: `main` 16c7f968 (after #119 phone bars + margins, #121 Figma words + drag and drop +
auto layout fixes, #123 agent, #126 project variables). Earlier plan: `studio-figma-native-parity-2026-10-17.md` (P1–P5).

**The bar** (unchanged, `studio-converts-figma-users`): a Figma user works on muscle memory — same key, same gesture,
same default, same result, same words. A feature that exists but differs costs more than a missing one. Zen's token
rule (colour, spacing, radius, type are variables / styles) is the only allowed difference, and then the Figma control
still works and lands on a token.

**Method.** Four read-only code audits of `main` (A canvas / tools / selection / transform / keys / menus; B right
panel per selection kind; C left panel, components, text, images, vectors, sections, frames; D UX writing of every UI
string), each grading Figma's features ✅ same · 🟡 different · ❌ missing with the owning file; then a hands-on walk
(Playwright on a private Studio server, a phone page with a Button, a Card, a free Frame with two Shapes): every Figma
key and menu tried from a fresh page, recording what changed in the page, the selection, the tool and the status line.

## 1. Scorecard

| Area | ✅ same | 🟡 different | ❌ missing | Worst for a Figma user |
| --- | --- | --- | --- | --- |
| A1 Tools | Move, Hand, R / L / ⇧L / O, Polygon, Star | Frame (A/F, no presets), Text (no typing, no drag width), Image (stock photo, no ⇧⌘K), ⌘K | Scale K, Section ⇧S, Slice S, **Pen P (P plays the prototype)**, Pencil ⇧P, Comment C | P / I / ⌘K mean something else |
| A2 Selection | click in context, double-click, ⌘-click, Esc / ⇧Enter / `\`, Tab / ⇧Tab, ⇧-click, Layers click, ⇧⌘H | Enter (first child only), ⌘A (siblings only), marquee (never top-level frames) | ⌥⌘A select matching, select same fill/font…, **Lock ⇧⌘L**, **Rename ⌘R (reloads the tab)** | rename, lock |
| A3 Transform | drag, ⇧ axis, ⌥ copy, ⌘ no snap, ⌥ measure | nudge (one floating layer only), resize (⇧ edge snaps 8px, no ⌥ centre, no guides), X/Y/W/H (no math on W/H, no ratio lock), smart guides (no distance numbers), align keys (one layer to its parent), opacity keys (shapes only) | **multi-layer move by px**, rotate handle, flip ⇧H/⇧V, equal-spacing guides, tidy up, distribute, Scale tool | several layers can't be moved, aligned or distributed |
| A4 Structure | ⌥⌘G, ⇧A / ⌥⇧A, ⌘] ⌘[ ⌥⌘] ⌥⌘[, ⇧⌘R, ⌥⌘C / ⌥⌘V, ⌘Z, ⌥⌘K, ⌥⌘B | ⌘D (no offset repeat), ⌘C (copies JSX), ⌘V (needs a selection), Delete ("Remove") | **⌘G group, ⇧⌘G ungroup / remove frame**, mask, boolean, flatten, outline stroke, paste here, copy as PNG / SVG / CSS | group / ungroup |
| A5 View | zoom keys, ⇧0/1/2, ⌘\ | zoom 2–400%, pages = files | N / ⇧N, pixel grid, **layout guides ⌃G**, **rulers ⇧R + guides**, outline ⌘Y, canvas colour | rulers, guides |
| A6 Menus | Select layer › | words (Remove, Move up/down, Hide layer) | Bring forward…, Group, Create component, Lock, Flip, Rename, Paste here, Copy as; a frame's menu has no copy / delete / rename; empty canvas has no Paste | menus are a third of Figma's |
| B Right panel | auto layout +/−, flow, alignment box, clip content, min/max, text style, alignment, local instance Go to main | header (code names, docs link), W/H menu (Auto, Reset to auto), gap / padding / radius (token lists, no typing), constraints (only after floating), Box fill / border (code values), effects (one style), instance props placed after Layout | **Fill / Stroke / Radius / Effects / Opacity on auto layout frames**, gradients / image fills, stroke sides / dash, blend, corner smoothing, rotation (non-shapes), font / size / weight / line height / letter spacing, paragraph / list / case, **Apply / Detach variable**, change variable mode, **per-layer Export**, **Layout guide**, Local styles, selection colours, multi-select common props, page background | a filled auto layout card needs two layers; no Export |
| C1 Pages | duplicate, rename | sorted by last edit, folders, Trash | reorder, dividers | list reshuffles |
| C2 Layers | tree, reorder by drag, eye, multi-select, jump | icons (cube, `</>`), order reversed (Figma: top = front), search also matches file:line | **names** ("Box", "Stack", no "Frame 1", text not by content), **rename**, **lock**, row right-click, ⌥-click expand, ⌥L | code names, no rename |
| C3 Assets | search, drag / click, swap, grid / list, icons, photos | Zen items are snippets, variants chosen after insert | Libraries modal, component sets with properties | — |
| C4 Components | ⌥⌘K (one layer), main edits reach instances, ⌥⌘B, Go to main, instances list | create only by key | **variants / properties for local components**, overrides inside a local instance, nested local instances (not drawn), create multiple, push changes / restore, description | local components are flat |
| C5 Text | double-click edit, text styles, truncate / max lines | T drops "Text" in the flow at the insertion line, no typing; Enter / Tab leave; empty text refused; paste needs a selection | **T click / drag at the pointer**, **rich text**, Auto width / Auto height / Fixed buttons | the Text tool |
| C6 Images | replace via Photos / Inspector | fit cover / contain | **⇧⌘K place, drop / paste a file on the canvas**, image fill on frames / shapes, crop / tile, adjustments, export | can't bring in your own picture on the canvas |
| C7 Vectors | shapes + arc handles | shapes draw only inside a Screen | pen, pencil, vertex edit, boolean, flatten, mask, outline stroke, convert to vector | no pen |
| C8 Sections / frames | frame label, drag by label, nested frame, clip content | presets after the fact (Screen › Device), a clicked frame comes with app chrome, edge resize is a view setting | **Sections ⇧S**, frame rename (double-click label zooms), **frame W / H / X / Y fields**, real resize | frames can't be resized or renamed |
| C9 Undo / find | one ⌘Z per edit | page actions outside ⌘Z, frame placement = 2 steps | ⌘F find / replace | — |
| D UX writing | see §3 | | | developer words in ~120 places |

**Reading.** About a third of Figma's design-mode features match, a third exist with other keys, words or results, a
third are missing. Auto layout, drawing shapes, drag and drop (2026-10-17 campaign) and Variables are the closest. The
largest gaps by muscle memory: rename / lock / group, several layers moved / aligned / distributed, the Text tool,
frames (presets, resize, rename, sections), fills / strokes / effects on any frame, typing a value, Export, and words.

## 2. Hands-on walk (Figma keys on a fresh page, 2026-10-18)

76 Figma actions, each from a freshly loaded phone page (Text, Button, Card, a free Frame holding a Rectangle and an
Ellipse), recording the page code, the selection, the tool and the status line. ✅ as Figma · 🟡 works, differs ·
❌ nothing happens (in a real browser some of these run the browser's own command: ⌘R reloads, ⌘G finds, ⌘Y opens
History, ⇧⌘C opens DevTools).

| Group | Action → what happened |
| --- | --- |
| Tools | ✅ V, H, F / A (Frame tool), R, L, ⇧L, O, T (Text tool), ⌘\ (panels hide), ⇧0, ⌘=. ❌ K, ⇧S, S, ⇧P, C, ⇧⌘K, ⌘K, ⌘F, ⇧R, ⌃G, ⌘Y, N. 🟡 **P opens Play** (Figma: Pen). 🟡 ⌘/ opens "Quick actions" (Figma: Actions, also ⌘K). |
| Selection | ✅ ⇧Enter and `\` → parent, Tab / ⇧Tab → next / previous sibling, ⇧⌘-click adds ("2 layers"). 🟡 **Enter selects the first child only** (Figma: all children). ❌ ⌘A with nothing selected, ⌥⌘A select matching. |
| Transform | ✅ → / ⇧→ nudge 1 / 10 px, ⌥A align left, ⌥H centre (to the parent frame), 5 = 50% opacity, ⌘] / ⌥⌘] order, ↓ in auto layout reorders. ❌ ⇧H / ⇧V flip, ⌃⌥T tidy up, ⌃⌥H distribute (2 layers selected: nothing). |
| Structure | ✅ ⌥⌘G frame selection (status "Wrapped 2 layers in a Box"), ⇧A (frame → auto layout, status "gap 2xl, padding lg" in code keys), ⌥⇧A, ⌥⌘K create component, ⇧⌘H hide, ⌘D, ⌘C ⌘V. 🟡 **Delete selects the parent frame** and says "Removed Shape" (Figma: nothing selected, no word). 🟡 **⌥⌘C ⌥⌘V paste position and size** (the Ellipse moved to the Rectangle's X / Y / W / H; Figma pastes fill, stroke, effects, radius, opacity only). 🟡 ⌥⌘B on a Button: "Button can't be detached. Detach works on Card, ListItem, …" (Figma detaches any instance). ❌ ⌘G, ⇧⌘G, ⌃⌘M, ⌘E, ⇧⌘O / ⌥⌘O, ⇧⌘L, ⌘R, ⇧⌘C. |
| Text | ✅ double-click edits in place, typing goes at the caret, Esc commits. |
| Menus (right-click) | Shape: Select layer › · Copy · Cut · Paste · Paste to replace · Copy / Paste properties · **Add to Children…** · **Reset slot** · Duplicate · **Move up / Move down** · Add / Remove auto layout · Frame selection · **Hide layer** · Hide on mobile / desktop · **Remove**. Button: + Swap instance…, Detach instance. Board: Zoom to fit · Zoom to 100% · **Hide or show UI** (no Paste). |
| Right panel by kind | Frame (Box): Position · Auto layout (+) · Layout · Appearance · Effects · **Children**. Auto layout (Stack): Position · Auto layout · **Children** (no Fill / Stroke / Effects). Button: Position · Layout · **Properties after Layout** · Text · **Content**. Card: Position · Layout · Effects · Properties · **Slots**. Text: Position · Layout · **Text** · **Content**. Header of every kind: "Frame · Layout docs", "Show code". |
| Layers | Frame row, then **Screen, TopNavigation, Stack, Text, Button, Card, Box, BottomNavigation** (code names, front at the bottom), and the status bar's "9:41 Text" listed as a layer. |

Also seen: the Show/Hide UI state survived a page reload in a new session, so the walk started with both panels
hidden and no hint how to bring them back (Figma shows them again on reload).

### 2a. The walk again (2026-10-21, `main` e99c5408: F0–F10, Copy as PNG, mask, Blend mode)

The same 76 actions, each from a freshly loaded walk page on a private Studio server (Playwright, Chromium). The walk
page is the old one with a Line added (distribute and tidy up get three layers, and Outline stroke gets a stroke without a
fill) and the Ellipse at X 120. Grades follow Figma's result. A key Zen Studio still lacks counts ❌, even though it says
so on the status line.

| Group | 2026-10-18 ✅ / 🟡 / ❌ | 2026-10-21 ✅ / 🟡 / ❌ | Still 🟡 / ❌ now |
| --- | --- | --- | --- |
| Tools (26) | 12 / 2 / 12 | 23 / 0 / 3 | ❌ K (Scale); ❌ S (Slice); ❌ C (Comment) |
| Selection (8) | 5 / 1 / 2 | 7 / 0 / 1 | ❌ ⌥⌘A (Select matching layers) |
| Transform (12) | 8 / 0 / 4 | 12 / 0 / 0 | — |
| Structure (19) | 8 / 3 / 8 | 18 / 1 / 0 | 🟡 ⌥⌘B (Detach instance) on a Button |
| Text (3) | 3 / 0 / 0 | 3 / 0 / 0 | — |
| Menus (3) | 0 / 3 / 0 | 0 / 3 / 0 | 🟡 Right-click a shape; 🟡 Right-click a Button (instance); 🟡 Right-click the empty canvas |
| Right panel (5) | 0 / 5 / 0 | 2 / 3 / 0 | 🟡 A Button (instance); 🟡 A Card (instance); 🟡 A text |
| **All (76)** | **36 / 14 / 26** | **65 / 7 / 4** | |

Up since 2026-10-18 (29): ⇧S (Section) (❌ → ✅) · ⇧P (Pencil) (❌ → ✅) · ⇧⌘K (Place image/video) (❌ → ✅) · ⌘K (Actions) (❌ → ✅) · ⌘F (Find and replace) (❌ → ✅) · ⇧R (Rulers) (❌ → ✅) · ⌃G (Show layout guides) (❌ → ✅) · ⌘Y (Outlines) (❌ → ✅) · N (Next frame) (❌ → ✅) · P (Pen) (🟡 → ✅) · ⌘/ (Actions) (🟡 → ✅) · Enter (Select children) (🟡 → ✅) · ⌘A with nothing selected (Select all) (❌ → ✅) · ⇧H (Flip horizontal) (❌ → ✅) · ⇧V (Flip vertical) (❌ → ✅) · ⌃⌥T (Tidy up) (❌ → ✅) · ⌃⌥H (Distribute horizontal spacing) (❌ → ✅) · Delete (nothing selected after) (🟡 → ✅) · ⌥⌘C ⌥⌘V (Copy / Paste properties) (🟡 → ✅) · ⌘G (Group selection) (❌ → ✅) · ⇧⌘G (Ungroup / Remove frame) (❌ → ✅) · ⌃⌘M (Use as mask) (❌ → ✅) · ⌘E (Flatten) (❌ → ✅) · ⌥⌘O (Outline stroke) on a Line (❌ → ✅) · ⇧⌘L (Lock) (❌ → ✅) · ⌘R (Rename) (❌ → ✅) · ⇧⌘C (Copy as PNG) (❌ → ✅) · A frame (free Box) (🟡 → ✅) · An auto layout frame (Stack) (🟡 → ✅).

What is still not Figma's:
- **The four keys still missing on 2026-10-21 are built** (only I, Pick color, still says "not yet"):
  ⌥⌘A (Select matching layers) on 2026-10-22, with Select all with same ›. It matches as Figma does, minus Studio's
  page-wide name numbers (`edit/matchModel.ts`, E2E FW-175…179).
  K (Scale) since 2026-10-21 (Session C, the user's pick): K, the toolbar's Scale, the right panel's factor and anchor,
  corner drags; px values scale, Zen token steps stay and the status line names them (user's choice, not Figma's: a
  text keeps its style).
  S (Slice) since 2026-10-22 (Session C, the user's pick): the Frame menu's Slice and S draw an export area over the
  board; its panel exports the area under it (Figma's 1x PNG first); Layers lists it; not pushed to Figma yet.
  C (Comment) since 2026-10-22 (Session C, the user's pick): pins on the canvas (on a frame or the board), the thread
  popover (reply, Resolve, Delete), the right panel's list with Show resolved; kept beside the page file
  (`<page>.comments.json`), name typed once per browser, Viewers comment, the author or an Admin deletes; no Figma sync.
- **Detach instance on a Button:** kept on purpose (user, 2026-10-03: an interactive component stops working when
  detached).
- **Menus:**
  - ~~The layer menu has no Flip horizontal / Flip vertical (the keys work).~~ Built 2026-10-21: after Lock, ⇧H / ⇧V,
    on frames and shapes (the layers that turn; a component's menu has none) (E2E FW-150…152).
  - A Zen instance's menu has no Go to main component and no Reset all changes (Reset shows in its panel).
  - ~~The empty canvas menu is Zoom to fit, Zoom to 100% and Show/Hide UI, with no Paste (Paste here works inside a frame).~~
    Built 2026-10-21: Paste here first on a page you made, dimmed with nothing to paste; a copied frame lands as a frame,
    copied layers in a new frame of their size, corner at the pointer, one ⌘Z (E2E FW-153, FW-154).
- **Right panel:**
  - A Button, a Card and a text have a **Content** section that edits their words in the panel. Figma edits words on the
    canvas, or through an instance's text property.
  - A Button's panel has no Appearance, Fill, Stroke or Effects, so its look comes from its variants only.

Found on the way (not graded rows):
- **A Line could not be clicked on the canvas.** A horizontal line's box is 0 px high, so ⌘-clicking its middle selected
  the frame around it (Figma clicks a line within a few px), and the walk reached it by Tab or by Enter on its frame.
  Fixed in the same change: a band 4 screen px either side takes the click (`select/select.css`, E2E FW-132).
- **The group's panel heading reads "Box".** Layers says "Group 1", and Figma's header says "Group".

### 2b. The walk a third time (2026-10-22, 5b027db1 = `main` 6f894b5e + Scale, Slice, Comment, Libraries #206–#209)

The same 76 actions, the same walk page and server. One change to the walk: ⌥⌘A (K-34) matches layers in *other*
frames, so its setup first copies the frame (its title, ⌘D) and then picks the Rectangle, as a person would. The row
reads the status line ("Selected 2 matching layers") as well as the selection.

| Group | 2026-10-18 ✅ / 🟡 / ❌ | 2026-10-21 ✅ / 🟡 / ❌ | 2026-10-22 ✅ / 🟡 / ❌ | Still 🟡 now |
| --- | --- | --- | --- | --- |
| Tools (26) | 12 / 2 / 12 | 23 / 0 / 3 | 26 / 0 / 0 | — |
| Selection (8) | 5 / 1 / 2 | 7 / 0 / 1 | 8 / 0 / 0 | — |
| Transform (12) | 8 / 0 / 4 | 12 / 0 / 0 | 12 / 0 / 0 | — |
| Structure (19) | 8 / 3 / 8 | 18 / 1 / 0 | 18 / 1 / 0 | 🟡 ⌥⌘B (Detach instance) on a Button |
| Text (3) | 3 / 0 / 0 | 3 / 0 / 0 | 3 / 0 / 0 | — |
| Menus (3) | 0 / 3 / 0 | 0 / 3 / 0 | 3 / 0 / 0 | — |
| Right panel (5) | 0 / 5 / 0 | 2 / 3 / 0 | 2 / 3 / 0 | 🟡 A Button (instance); 🟡 A Card (instance); 🟡 A text |
| **All (76)** | **36 / 14 / 26** | **65 / 7 / 4** | **72 / 4 / 0** | |

Up since 2026-10-21 (7): K (Scale) (❌ → ✅, #206) · S (Slice) (❌ → ✅, #207) · C (Comment) (❌ → ✅, #208) ·
⌥⌘A (Select matching layers) (❌ → ✅, #205) · Right-click a shape (🟡 → ✅: Flip horizontal / vertical, #204) ·
Right-click a Button (instance) (🟡 → ✅: Go to main component, Reset all changes) · Right-click the empty canvas
(🟡 → ✅: Paste here, #204).

What is still not Figma's (4):
- **Detach instance on a Button:** kept on purpose (user, 2026-10-03: an interactive component stops working when
  detached).
- **Right panel, Content:** a Button, a Card and a text edit their words in a **Content** section. The user's decision
  (2026-10-22): those rows move into the instance's properties, as Figma's text properties, and the Content section
  goes; session B builds it (`docs/research/studio-instance-panel-parity-spec-2026-10-21.md`).

## 3. UX writing (every UI string of the design page)

**Harvest** (294 files: `src/platform/studio/**` + the 13 engine files whose messages reach the UI; selftests, e2e,
generated files, sample design content and AI-only text left out): ≈ 1,975 strings — 423 engine refusals, 341 menu /
option labels, 300 aria-labels, 241 status / toast lines, 132 titles, 124 JSX texts, 117 labels, 106 reasons, 56
captions, 42 tooltips, 20 placeholders.

| Shape of the messages | Count | > 60 chars | With code words | With `<Tag>` | Median length |
| --- | --- | --- | --- | --- | --- |
| UI status lines, notes, reasons | 318 | 56 (18%) | 55 | — | 37 |
| Engine refusals shown to the person | 392 | 130 (33%) | 192 | 56 | 51 |

Most repeated: "View only — switch to Admin to edit" (20), "Restart the dev server…" (10), "…nothing was written"
(15), "in (the) code" (122), "is no longer there" (18).

### 3a. Glossary — Studio word now → Figma's (checked on help.figma.com where marked ✓)

| Studio now | Figma | Where |
| --- | --- | --- |
| Tool "Stack" | none — Frame (F) then **Add auto layout ⇧A**; noun "auto layout frame" | CanvasTools.tsx:36, CanvasStatus.tsx:23, resize pills |
| Box ("Floats in a Box around it", "Select Box", "Wrap … in a Box (frame)") | **Frame**, **Frame selection ⌥⌘G** | PositionSection.tsx:357, ShortcutsDialog.tsx:17 |
| Screen (section, "Add screen", hints) | **Frame** | FramePanel.tsx:140, PrototypePanel.tsx:86 |
| Board | **Canvas** | PagePanel.tsx:151 |
| Select / Select tool / "Esc for Move" | **Move** (V) | commands.ts:47, ShortcutsDialog.tsx:14 |
| Interact (I) | none in design mode; I = **Pick color** | CanvasTools.tsx:37 |
| Image (tool, no key) | **Place image/video ⇧⌘K** ✓ | CanvasTools.tsx:36 |
| Quick insert / Library / Assets | **Assets** | QuickInsert.tsx:127,150 |
| Quick actions ⌘/; ⌘K = Search pages | **Actions ⌘K** (⌘/ also) ✓ | QuickActions.tsx, commands.ts:89 |
| Remove (a layer) | **Delete** ⌫ (Remove stays for effects, auto layout) | CanvasMenu.tsx:143, menu.ts:146, commands.ts:58 |
| Move up / Move down; Move earlier / Move later | **Bring forward ⌘] / Send backward ⌘[** | CanvasMenu.tsx:136, menu.ts:129, commands.ts:59 |
| Hide layer / Show layer | **Hide / Show ⇧⌘H** | visibility.ts:114 |
| Hide or show UI (+3 other names) | **Show/Hide UI ⌘\** ✓ | CanvasMenu.tsx:161, commands.ts:81, PanelHeaders.tsx:74 |
| Zoom to frame; "Zoom to frame (⌥⌘↵)" | **Zoom to selection ⇧2** | CanvasMenu.tsx:148, FrameChrome.tsx:505 |
| Present the frame / Present full screen | **Present** | commands.ts:80, FrameChrome.tsx:505 |
| Select first child | **Select children** (Enter) ✓ | commands.ts:71 |
| Detach (button); "becomes Box/Stack/Text" | **Detach instance ⌥⌘B** | ComponentSection.tsx:83, DetachAction.tsx:50 |
| Reset all overrides | **Reset all changes** (More actions › Reset) ✓ | DesignPanel.tsx:836 |
| Section "Text" | **Typography** ✓ | DesignPanel.tsx:213 |
| Align (Position row) | **Alignment** | PositionSection.tsx:316 |
| Flow | **Flow** — keep (Figma renamed Direction to Flow) ✓ | LayoutSection.tsx:206 |
| Children (section); Child elements; Child size | **Layers** | SlotsSection.tsx:404, DesignPanel.tsx:989 |
| Props / Attributes / Other attributes / Code properties | **Properties** (code-only ones on the Code tab) | PartPanel.tsx:261, DesignPanel.tsx:1006 |
| Colours (part panel) | **Selection colors** | PartPanel.tsx:302 |
| Snippet / Source | **Code** | CodePanel.tsx:61-75 |
| Admin / Viewer | **can edit / can view** | RoleMenu.tsx:14 |
| Drafts (unsaved edits) | **Unsaved changes** (Figma's Drafts = files outside a project) | commands.ts:69, Inspector.tsx:59 |
| Reset to auto | none — **Hug contents** | SizingSection.tsx:598 |
| colour / centre / centred / cancelled | **color / center / centered / canceled** (Figma is US) | variablesModel.ts:13, PositionSection.tsx:185, ResizeLayer.tsx:1090 … |
| Layer names "Box", "Stack", "Grid", component names | **Frame N**, **Rectangle N**, a text by its words, an instance by its component | layerNames.ts:19 |

Already Figma's and kept: Add / Remove auto layout, Frame selection, Paste to replace, Copy / Paste properties, Swap
instance, Ignore auto layout, Absolute position, Go to main component, Fixed width / height, Hug contents, Fill
container, Add min width…, Clip content, Constraints, Independent corners, Corner radius, Effects, Drop shadow, Inner
shadow, Stroke, Opacity, Local variables, Create variable, Max lines, Zoom to fit / 50 / 100 / 200%, Main component,
Variant, Local components, Libraries, the prototype words.

### 3b. Problem classes (detail in the audit; examples)

- **Developer language** in the Design tab: field tooltips `Stack direction · wrap`, `Grid columnGap · rowGap`, `Screen
  device`, `alignSelf · …`, every label's `${label} · ${prop}`; raw option values ("2xs", "surface-alt", "pale",
  "inside"); "Show code", "Layout docs", "Reading the source…", "Code properties" rows (HTML element, Html for, Tabular
  numbers), "Other attributes", the undo line `Undid “gap → md”`, "left md · 16 (was 18)", Layers tooltips with CSS
  class names, "Change shared code?", engine refusals with `<Tag>` (56) and code words (192).
- **`designWords` (words.ts) has holes:** the gate list misses attribute, markup, render, source, HTML, state,
  import, dev server, Stack / Box / Grid; it writes "an group", "an value"; its `src` rule turns `data-zen-src` into
  "data-zen-picture"; section titles, field tooltips, Detach / Remove tooltips, Quick insert, canvas-menu captions,
  Layers, Assets, Pages and the board never pass through it.
- **Casing and notation:** Title Case in Quick actions ("Show Pages"); empty states with and without periods; five
  tooltip shapes for shortcuts ("Move (V)", "Add auto layout · ⇧A", "Add auto layout (⇧A)", "Close · Esc", "… · ⌘Z
  to undo") → one: "Name ⇧A"; "⇧Ctrl+Z" next to "Ctrl+Shift+R" on Windows; two keys for one action (Zoom to 100%:
  ⇧0 and ⌘0; Zoom to frame: ⇧2 and ⌥⌘↵); Esc described two ways.
- **Message shape:** status lines up to 176 characters and two sentences; explanations of code instead of the next
  step ("This list renders in several places…; edit the data in code"); passive system lines ("…moved before the
  change was saved; nothing was written" → "Couldn't save. Try again"); lines with no next step ("Not saved").
- **One thing, several names:** Assets / Quick insert / Library; Screen / Frame; board / canvas; Drafts (two meanings);
  Trash / trash; Move / Select; ⌘\ (4 names); Present (4 names); Children / Child elements / layers inside; dev server
  (3 names); Properties / Props / Attributes / Code properties / Playground properties; Your photos / Your uploads.
- **Verbs:** Remove vs Delete vs Move to Trash; Add / Create / New / Insert; Detach vs Detach instance; Clear contents
  vs Clear slot contents.

### 3c. Top string fixes (most-seen surfaces first)

Toolbar: "Stack" tool out (F + ⇧A), "Interact" off the design page, one name "Assets", tool hints "Move V", "Frame F"…,
one tooltip shape "Name ⇧A", Zoom to 100% = ⇧0, Zoom to selection = ⇧2. Context menu: Delete, Bring forward / Send
backward (+ to front / to back), Show/Hide UI, Zoom to selection, Show / Hide, Detach instance. Quick actions → Actions
(⌘K), sentence case. Inspector: Frame (not Screen), Properties, Selection colors, Layers (not Children), Alignment,
Typography, no code tooltips on the Design tab, label-only tooltips, "Select frame", "Only in auto layout", Code tab
"Code" / "Select a layer to see its code", "Edit effect styles in Figma", US spelling. Layers: design-word tooltips and
empty state. Status line: no code in the undo line, "View only", "Couldn't … Try again" with the reason in a tooltip.
`designWords`: complete the gate list, fix a / an, protect identifiers, run on every surface; a lint test over the
harvested strings fails on code words and on glossary terms.

## 4. Decisions to take first (they shape the code)

These follow from Zen being code. **User, 2026-10-18: "Đồng ý theo đề xuất, làm F0 trước"** — every recommendation
below is approved; F0 starts first.

1. **Typed values vs tokens.** Figma lets you type 13 px or #F2F2F2. Zen writes variables. *Recommendation:* every
   Figma field accepts typing as in Figma; a number snaps to the nearest token and shows it as Figma's variable pill
   (hexagon + name), with **Apply variable** / **Detach variable** as in Figma; Detach keeps the token's px value only
   where Zen allows px (X / Y in free frames, W / H, stroke weight, rotation, opacity). Colours: the field opens the
   colour variables list (as Figma's "Libraries" tab of the colour picker); a raw hex opens Local variables to make one.
2. **A frame with a fill and auto layout is one layer.** Figma's auto layout frame has fills, strokes, radius,
   effects, opacity. Zen writes Box > Stack. *Recommendation:* give Stack and Grid Box's appearance props (surface,
   border, radius, effectStyle, opacity) — a library API addition (tier L, both primitives, Figma push / pull, harness)
   — so one Figma frame is one element in code.
3. **Groups.** Figma's Group has no layout or style and hugs its children. *Recommendation:* ⌘G writes a Box marked as
   a group (`group` prop: no fill, no padding, bounds hug its floating children; Layers icon and name "Group N");
   ⇧⌘G removes a group or a frame (children keep their place). Alternative: refuse groups and offer Frame selection.
4. **Layer names.** Figma names are design data. *Recommendation:* a `name` attribute every element may carry
   (`data-name` in exported code), auto names as Figma ("Frame 1", "Rectangle 2", a text by its words, an instance by
   its component), rename by double-click / ⌘R / batch rename; Figma push / pull keep them.
5. **Top-level frames.** Studio says "Screen". *Recommendation:* the UI says **Frame** (device presets name the
   size: iPhone 16, Desktop…); the code keeps `<Screen>`. A frame's W / H / X / Y are written in the page.
6. **Vectors.** *Recommendation:* a `Shape type="vector"` holding an SVG path (`d`) with token fill / stroke; the Pen
   writes it; boolean / flatten / outline stroke compute paths (a vetted path-ops library); masks as a Box `mask`.
   Largest engineering piece; can come last.
7. **Rich text.** *Recommendation:* inline runs inside `<Text>` (bold, italic, underline, link, colour token, text
   style per run) as Figma's mixed styles; the editor stops being plain text.
8. **Images.** *Recommendation:* image fills on Box / Shape / frames (`image` + fit Fill / Fit / Crop / Tile), ⇧⌘K and
   file drop / paste on the canvas upload into the page's assets (exists for Assets › Photos).
9. **Keys that collide.** *Recommendation:* P = Pen (Present / Play move to Figma's ⌥⌘↵ and the Present button),
   ⌘K = Actions (Search pages moves into Actions; ⌘/ stays an alias, as in Figma), I = Pick color; "Interact" leaves the builder page (it serves
   example pages).
10. **Spelling.** Figma's UI is American ("Color", "centers"). *Recommendation:* UI strings in Figma's spelling;
    code and docs keep the repo's.

## 5. Plan (phases by what a Figma user hits first; each: spec card → build → selftests → E2E → walk → gate)

Every phase ends with the **Figma walk** E2E group (§6) rerun: the number of Figma actions that behave and read as in
Figma is the scoreboard.

**F0 · Words and keys (tier M, first).** The glossary (§3a) applied everywhere: toolbar, menus, Quick actions,
Shortcuts, Inspector headers / sections / tooltips, Layers, status line, refusals, engine messages that reach the UI.
Keys: P / I / ⌘K / ⌘R / ⌘G / ⇧⌘G / ⌘E / ⌘Y / ⇧⌘C / ⌘F stop falling through to the browser (a Figma action, or a
short "Not in Zen Studio yet" status) — never a tab reload or browser panel. `words.ts` checks every panel, not only
the Inspector; a lint test fails on code words in UI strings. Status lines name tokens by their Figma names ("Gap
2XLarge", not "gap 2xl"). Show/Hide UI comes back on reload (walk §2). Menus: Figma's items and order (Bring to front / Bring
forward / Send backward / Send to back, Show / Hide, Lock / Unlock, Group selection, Frame selection, Ungroup, Create
component, Rename, Paste here, Copy as ›), and a frame's and the empty canvas's menus.

**Status (2026-10-18):** F0 shipped (PR #135); F1 built on `zen/feat/studio-f1-layers-20261018` — the Figma walk
(`npm run studio:e2e -- --only=figma`) reads 18 / 18 for the F0 and F1 rows (FW-01…18). Left from both: BACKLOG P1.

**Status (2026-10-21):** every phase is shipped:

| Phase | PRs |
| --- | --- |
| F0 | #135 |
| F1 | #139 |
| F2 | #140 |
| F3 | #142, #145 |
| F4 | #143 |
| F5 | #144, #151 |
| F6 + F8 | #147, #154 |
| F7 | #152 |
| F9 | #146, #148 |
| F10 | #150 |
| Since | Copy as PNG #156, Use as mask #161, Blend mode #171 |

The hands-on walk (§2a) reads 65 ✅ · 7 🟡 · 4 ❌ of 76; on 2026-10-18 it was 36 · 14 · 26. The first-ten-minutes walk
(§6) finishes 14 / 14 tasks in Figma's 40 steps, with no refusal. What is left is listed in §2a and §6 and
in BACKLOG P1.

**Status (2026-10-22):** with Select matching layers (#205), the menus (#204) and Scale, Slice, Comment and Libraries
(#206–#209), the hands-on walk (§2b) reads 72 ✅ · 4 🟡 · 0 ❌ of 76. Every Figma key and menu of the walk works; the
four 🟡 are Detach on a Button (kept on purpose) and the panel's Content section (moving into the instance's properties,
session B). The first-ten-minutes walk is unchanged: 14 / 14 tasks in Figma's 40 steps, no refusal.

**F1 · Layers like Figma (M).** Names (decision 4) with Figma's auto names and icons (Frame #, auto layout icons,
Group, Component ◇ purple, Instance ◇, Text T, Image, Section); top of the list = front; rename (double-click,
⌘R, batch); Lock ⇧⌘L (canvas skips locked layers, Layers padlock on hover); row right-click = the canvas menu;
⌥-click expand all, ⌥L collapse all; frame rename by its label and Layers; the 500-row cap and "Parts" behind
"Show all layers" only.

**F2 · Selection and transform (L).** Several layers move by px together in free frames and as one block in auto
layout; nudge several; align / distribute / tidy up for a multi-selection (Inspector align row + ⌥A… + ⌃⌥T / ⌃⌥H /
⌃⌥V); Enter = all children (today the first only), ⌘A = all layers of the frame or all frames, marquee picks frames; rotate
handles (⇧ 15°) and rotation for every layer, flip ⇧H / ⇧V; resize ⌥ from centre, ⇧ ratio on edges, snapping and
guides while resizing; W / H math and a ratio lock; distance numbers and pink equal-spacing guides while moving.

**F3 · Structure and clipboard (M).** Group / ungroup / remove frame (decision 3); ⌘V with nothing selected pastes
into the frame in view at its place; Paste here; ⌘D repeats the last offset; Copy as PNG (⇧⌘C) / SVG / CSS / code;
Copy / Paste properties carry Figma's visual properties only (fill, stroke, effects, radius, opacity — never X / Y /
W / H, walk §2); Delete leaves nothing selected; Detach instance on every Zen instance (it refuses a Button today);
Create component and Create multiple components in the menu and Actions.

**F4 · Frames, presets, sections (M).** F / A shows Figma's frame presets in the right panel (Phone, Tablet,
Desktop… with sizes) and a click makes a 100 × 100 frame on the board (empty, no app chrome; chrome stays one switch
in the frame's panel); frames resize by handles and W / H fields, X / Y on the board; Sections ⇧S (named board areas
that hold frames, resize around them); N / ⇧N next / previous frame; page list order by drag, dividers.

**F5 · Right panel parity (L).** Figma's order: header (name, type, Go to main component, Detach, Reset all changes,
Swap), instance properties under it, Position, Auto layout / Layout, Appearance (opacity, radius, independent corners,
blend, visibility), Fill, Stroke, Effects, Layout guide, Export. Fill / Stroke / Effects / Radius / Opacity on every
frame kind (decision 2); typed values with variable pills (decision 1); stroke sides / dash; effects as layers of
Drop shadow / Inner shadow / Layer blur / Background blur made of effect variables or styles; Typography within text
styles (style picker + the style's font / size / line height shown read-only as Figma's style details, Paragraph,
Case, Decoration within tokens); multi-selection with common props and Selection colors; nothing selected: page
background, Local variables, Local styles, Export; per-layer Export (PNG / JPG / SVG / PDF, scale, suffix) via the
existing screenshot / handoff code; Layout guide (columns / rows / grid from Breakpoint & Grids variables).

**F6 · Text (M).** T: click = auto width at the pointer, drag = fixed width, typing starts at once; Enter = new line,
Esc commits; Auto width / Auto height / Fixed size buttons; an emptied text is removed; paste text with nothing
selected makes a text layer; rich text (decision 7).

**F7 · Components (L).** Local component sets and variants (Combine as variants), properties (variant, boolean,
text, instance swap, slot) with defaults and preferred values; overrides inside a local instance; nested local
instances drawn and exposed; Create multiple components; Push changes to main / Restore main; description and link;
Assets › Local shows sets with their properties.

**F8 · Images (M).** Decision 8: ⇧⌘K place image (file picker → upload → a frame with an image fill at the pointer),
drop / paste a file on the canvas, image fills on frames and shapes with Fill / Fit / Crop / Tile, replace image.

**F9 · Vectors (L, last).** Decision 6: Pen / Pencil, Enter edits vertices, boolean groups (Union / Subtract /
Intersect / Exclude), Flatten ⌘E, Outline stroke ⌥⌘O, Use as mask ⌃⌘M; Figma push / pull of VECTOR and
BOOLEAN_OPERATION.

**F10 · View and find (S–M).** Rulers ⇧R with draggable guides, layout guides ⌃G, pixel grid, outline mode ⌘Y,
zoom range to Figma's, canvas background colour, ⌘F find and replace text.

**Order.** F0 → F1 → F2 → F3 → F4 → F5 → F6 → F8 → F7 → F10 → F9. F0–F1 change what a Figma user sees in the first
minute (words, names, rename, lock, keys); F2–F4 what they do in the first ten; F5–F8 what a full design needs;
F7 / F9 are the longest. Parallel agents only for F2, F5, F7, F9 (tier L), one agent per area, one reviewer.

## 6. How progress is measured

1. **Figma walk (new E2E group `figma`, opt-in):** one row per Figma action of §1 (≈ 150), each the Figma user's
   gesture on a fresh page with the Figma result asserted (page code, selection, Layers, Inspector words). The
   scoreboard is the share that passes; each phase moves named rows from ❌ / 🟡 to ✅.
2. **Words lint:** every UI string harvested (as §3a) and checked against the glossary and the code-word list; zero
   new code words; the Shortcuts sheet and menus diffed against Figma's list.
3. **First-ten-minutes task walk** (the click-depth metric): 14 tasks a Figma user does first (make a frame from a
   preset, draw, type text, group, rename, auto layout, fill, align three layers, make a component, export), counting
   steps and refusals against Figma's.

   **2026-10-21** (`main` 1bd55975, private Studio server):
   - Tasks: the ten above, plus duplicate (moving the copy aside, as Figma's copy lands on the original), frame W 400,
     place an image (⇧⌘K) and a text style.
   - Setup: one sitting on a page made with New page › Create page.
   - Counting: a click, a double-click, a key, a drag, a typed string and a picked option are one step each. Figma's
     steps are UI3's, counted the same way.

| Task | Studio steps | Figma steps | Refusals | Studio: what the person did | Figma |
| --- | --- | --- | --- | --- | --- |
| T-01 Make a frame from a preset (iPhone 16) | 2 | 2 | 0 | F · click iPhone 16 | F · click iPhone 16 in the right panel |
| T-02 Draw a rectangle in it | 2 | 2 | 0 | R · drag in the frame | R · drag in the frame |
| T-03 Type a text | 4 | 4 | 0 | T · click in the frame · type Hello · Esc | T · click in the frame · type · Esc |
| T-04 Rename the rectangle | 3 | 3 | 0 | double-click its name in Layers · type Hero · Enter | double-click the layer's name · type · Enter |
| T-05 Fill the rectangle with a colour | 3 | 3 | 0 | click · click the fill colour · pick Accent | click the shape · click its fill colour · pick a colour (library variable) |
| T-06 Duplicate the rectangle and move the copy aside | 3 | 3 | 0 | click · ⌘D · drag the copy down | click the shape · ⌘D · drag the copy aside (Figma's copy lands on the original) |
| T-07 Align three layers left | 4 | 4 | 0 | click · ⇧-click · ⇧-click · ⌥A | click · ⇧-click · ⇧-click · ⌥A |
| T-08 Group two layers | 3 | 3 | 0 | click · ⇧-click · ⌘G | click · ⇧-click · ⌘G |
| T-09 Make the group a component | 2 | 2 | 0 | click · ⌥⌘K | click the group · ⌥⌘K |
| T-10 Resize the frame to W 400 | 3 | 3 | 0 | click the frame's name · click W · type 400 ↵ | click the frame's name · click W · type 400 ↵ |
| T-11 Add auto layout to the frame | 2 | 2 | 0 | click the frame's name · ⇧A | click the frame's name · ⇧A |
| T-12 Place an image | 3 | 3 | 0 | ⇧⌘K · pick the file · click in the frame | ⇧⌘K · pick the file · click in the frame |
| T-13 Give the text a text style | 3 | 3 | 0 | click Hello in Layers · open the text style list · pick a Heading style | click the text · open the text style list · pick a style |
| T-14 Export the frame as PNG | 3 | 3 | 0 | click the frame's name · Export + · Export | click the frame's name · Export + · Export |
| **14 / 14 done** | **40** | **40** | **0** | | |

   The first run (44 steps against 39) had 5 extra steps:
   - **Layers after a new page (+1), real:** the left panel stayed on Pages after a new page. Fixed: a page just made
     opens on Layers (`openLocalPage(id, { made: true })`, E2E FW-133).
   - **⇧-click (+3), the script's:** it passed `modifiers` to Playwright's `page.mouse.click`, which ignores them, so its
     ⇧-clicks were plain clicks. Studio's ⇧-click adds a layer, as the hands-on walk's K-31 shows.
   - **Click on a group (+1), the script's:** its own Esc after each task selected the parent. A click on a grouped
     layer selects the group and a double-click goes in, as in Figma.

   **2026-10-22** (5b027db1, with Scale, Slice, Comment and Libraries): the same 14 tasks again read 14 / 14 in 40
   steps (Figma 40), with no refusal.

4. Engine matrices (`npm run studio:dnd`) extended per phase (group / ungroup, multi-move, text runs, vector paths).

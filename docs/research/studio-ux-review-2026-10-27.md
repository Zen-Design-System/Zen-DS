# Zen Studio — comprehensive UI/UX review (2026-10-27)

The user's brief: "Làm đánh giá toàn diện lại UI và UX của Zen studio". Read-only: nothing in `src/` was changed.
Findings go to the user for approval (scope lock); the proposed work is in §7.

**Method.** Five scripted hands-on walks through the real Studio UI (Playwright on a private E2E-style server, port
5198, with copies of the user's own pages: `quan-ly-task`, `hr-expense-overview-2`, `v-1-sales-overview-2`), each
step a click, double-click, ⌘-click, drag, key or Inspector control, with a screenshot, the status line and the
Inspector heading read after it; the Figma-key walk of the E2E harness (`npm run studio:e2e -- --only=figma`, §3);
axe-core plus contrast, text-size, focus and Tab-order measurements of the chrome (§5); a UX-writing audit of every
UI string in `src/platform/studio` and the engine (§6). Viewports 1512×982, 1280×800, 1024×768, 390×844; light and
dark chrome. Scripts and all 120 screenshots: the session's scratchpad (`walk1…3.mjs`, `probe4…5.mjs`, `a11y.mjs`,
`ux/*/log.json`); the 15 that carry a finding are in [`studio-ux-review-2026-10-27/`](studio-ux-review-2026-10-27/).

**Not covered:** the Google sign-in flow, touch gestures, screen-reader output, performance under load, Figma push /
pull, the Variables window and the Zen Agent in depth (each has its own E2E group), the production build.

## 0. Tóm tắt (tiếng Việt)

**Kết luận.** So với lần đánh giá 2026-10-10, Studio đã đi một quãng dài: bảng điều khiển, menu chuột phải, ⌘K,
phím tắt, vẽ hình, ảnh avatar 2 bước, ⌘D/Delete/⌘Z, chế độ tối, Play — tất cả đều có mặt và phần lớn hoạt động giống
Figma. Thang Figma-key của harness: xem §3. Chrome đạt a11y cơ bản (0 control không tên, 0 chữ < 11px, viền focus
trung tính, chrome tối sạch tương phản).

Cái còn làm người dùng Figma "vấp" không phải thiếu tính năng mà là **4 thói quen Figma bị gãy**:

1. **Double-click / Enter rơi vào "part" DOM** (`div · part of MetricCard`, `span · part of Tabs`, `Card · part of
   MetricCard`) với bảng thuộc tính CSS (`Display flex`, `Padding 24px --zen-spacing-…`, `className`,
   `#121212 --zen-color-content-…`) ngay trên tab Design. Đây là thao tác cơ bản nhất của Figma (double-click vào
   instance → chọn chữ bên trong → double-click nữa → sửa chữ). ⌘-click thì đúng Figma (Text → Metric → MetricCard).
   Ảnh 03, 05, 14.
2. **Sau khi rơi vào part, ⌘A bôi đen toàn bộ chữ của giao diện Studio** (không chọn layer), rồi ⌘D và Delete chết
   cho tới khi focus quay lại canvas. ⌘A khi đang chọn một instance cũng không chọn các layer anh em. Ảnh 04.
3. **Mở trang lần đầu rơi vào vùng overlay ở 100%**, Screen chính nằm ngoài màn hình (ảnh 01). Figma mở ở
   zoom-to-fit hoặc đúng chỗ lần trước.
4. **Chèn component từ Assets = xếp chồng toàn chiều rộng, không gap**: 3 Metric card + Chart + Table thành 5 khối
   1512px chồng lên nhau; phải ⇧A + Flow + Gap mới ra dashboard (ảnh 02). Figma chèn đúng kích thước component tại
   điểm thả.

Tiếp theo là **chữ nói ngôn ngữ code** vẫn còn ở ~40 chỗ (đường dẫn file ngay trên canvas và trong mục Page,
`Selected ids`, `Current row id`, `Accessible name`, `Action-Slots`, `Nav-Trailing-Block`, `harness`, `dev server`,
`src/`, `const`, `useState`… — bảng đầy đủ §6) và **ghi chú dài nhiều dòng trong panel** (Avatar-in-Table có 3 ghi
chú, "Changes on Desktop: Nothing: Desktop is the Screen…", "Shows when the box is taller…").

Lỗi UI cụ thể: cột phải của danh sách Flow (tab Prototype) bị cắt ở 320px (ảnh 06); ở 390px thanh công cụ dưới
tràn ra ngoài màn hình (ảnh 07); chữ của canvas lộ ra ở khe 8px hai bên panel nổi; tiêu đề Play lặp
"Quản lý task · Quản lý task · Danh sách"; chế độ tối của giao diện cũng đổi theme của thiết kế (ảnh 11); Text mới
vẽ báo X 0 / Y 0 (ảnh 10).

**Đề xuất làm theo thứ tự (cần anh/chị duyệt, §7):** P0 cử chỉ chọn layer không bao giờ rơi vào part + khoá focus
⌘A/⌘D/Delete (L + S) → P1 mở trang đúng chỗ, chèn như Figma, danh sách Flow, thanh công cụ phone (S/M) → P2 chữ và
ghi chú (S) + bảng thuộc tính instance gọn hơn (M) → P3 các điểm nhỏ. Hai câu hỏi cho anh/chị: chèn component theo
kích thước tự nhiên (A) hay vào Grid 12 cột của dashboard (B); Dark mode đổi cả thiết kế (giữ) hay chỉ giao diện
(như Figma).

## 1. Scorecard against the earlier audits

| Finding then | Source | Now (2026-10-27) |
| --- | --- | --- |
| Zoom menu opens off-screen | 10-04 #01 | **Fixed**: the zoom control sits in the right panel's header, its menu opens down (w1-21) |
| Toolbar does not fit a phone | 10-04 #02 | **Half**: the headers float and fit; the bottom tool rail is 463px in a 390 viewport, 7 tools off-screen (ảnh 07) |
| First view clips the Playground / 100% at the origin | 10-04 #03 | **Open, worse on Studio pages**: a page opens at 100% on its overlay frames, the Screen is off-screen (ảnh 01) |
| Fit-all does not fit all | 10-04 #04 | **Fixed**: ⇧1 fits every frame (w1-06, w2-10) |
| Quick actions see-through | 10-04 #06 | **Mostly fixed**: a blur is on; cards still faintly show through the first rows (w1-19) |
| Layers search dead end | 10-04 #07 | **Fixed**: EmptyState + Clear search (w3-17); the "186 layers" count above it does not change |
| Studio focus ring pink, 2.4:1 | 10-04 A1 | **Fixed**: 2px neutral outline on frame labels, shadow ring on tools (§5) |
| Tab labels 3.79:1 | 10-04 A2 | **Open** (library Tabs tone; also Segmented's inactive label): §5 |
| Size badge carries rule notes | 10-04 N3 | **Open**: "1152 × 452 · Height comes from the Table itself" (w1-08) |
| Page name three times | 10-04 N2 | **Open in another form**: the Design tab shows two "Page" sections, the Play bar "Quản lý task · Quản lý task · Danh sách" |
| Modes popover lists 3 of 6 | 10-04 N7 | **Changed**: "Preview modes" is a plain seven-word text line in the Page section; no control |
| Picture on any avatar in 2 steps | 10-10 P0 | **Met**: ⌘-click the avatar, click a photo in Assets › Photos → "Avatar in Table shows …" (ảnh 08) |
| One click = the layer under the pointer | 10-10 P1 | **Partly**: a plain click selects the enclosing Frame / Grid / PageHeader; ⌘-click reaches the text (w4-9); double-click does not (§2.1) |
| No code words in front of a designer | 10-10 P2 | **Partly**: `designWords` rewrites the status line; ~40 raw strings remain, and every DOM part panel is a CSS inspector (§2.1, §6) |
| ⌘D dead on builder pages | 10-10 | **Fixed** (w4-10…12), except after a part selection (§2.2) |
| Dashboard from blank: 19 operations | 10-10 §2 | **Works**, but every insert is full-width in the page flow (§2.4) |
| Panels in dark chrome and at 280px | BACKLOG P3 | **Checked**: dark chrome clean (ảnh 11); at 280px no field juts out on the Table, MetricCard and Frame panels (probe 5) — the line can close |

## 2. Findings, ranked

Each finding: **you do → what happens**, the evidence (walk-step or screenshot), and where it lives.

### 2.1 · P0 · Double-click and Enter land on DOM parts, shown as a CSS inspector on the Design tab

- Select a MetricCard (Layers) → **double-click its label** → heading `</> div · part of MetricCard`, "Read-only —
  set by MetricCard", Attributes `className "zen-card zen-m…"`, `data-tone "shadow"`, `children [2 items of eleme…`,
  Text style "Text in span.zen-metric__title", Layout `Display flex · Direction column · Gap 0px · Padding 24px
  --zen-spacing-paddi…`, Size `178 × 156.05` (ảnh 03; w2-17).
- MetricCard selected → **Enter** → `Card · part of MetricCard` → Enter → `div · part of MetricCard` → Enter → the
  same `div` (ảnh 05; w5-10). Figma's Enter selects the first child layer.
- A Tab selected → Enter ×3 → `button · part of Tabs` → `span · part of Tabs` → `Text · part of Tabs` (w4-8).
- ⌘-click the "Tạo task" button → `Text · part of Button`: Layout `Display block`, `Padding H 4px
  --zen-spacing-paddi…`, Size `65 × 19.99`, Selection colors `#FDFDFD --zen-color-content-…` (ảnh 14; w2-33).
- On the walk page, **double-click a MetricCard's title with nothing selected** → Screen, then three more
  double-clicks → Screen, Screen, Screen; typing changes nothing (w5-9). On the user's page: plain click → Frame,
  double-click → MetricCard, then it stays on MetricCard (w4-13). Figma: double-click goes into the instance to the
  text, the next double-click edits it.

Why it matters: this is Figma's most-used gesture, and the panel it lands on breaks the house rule "nothing a
designer reads speaks code" (`words.ts`). ⌘-click already does it right (`Text · part of MetricCard` → ⇧Enter →
`Metric · part of MetricCard` → MetricCard, w4-9), so the fix is to route double-click and Enter through the same
`select/parts.ts deepLayerAt` path and to fold HTML parts (div, span, button) out of the Design tab (they stay on the
Code tab). Owner: `select/clickTarget.ts`, `select/parts.ts`, the part panel in `inspector/`.

### 2.2 · P0 · After a part selection, ⌘A selects the Studio's own text; ⌘D and Delete go dead

- After the double-click above, **⌘A** → every panel's text turns blue (the browser's select-all over the UI), no
  layer is selected (ảnh 04; w2-18). ⌘D then does nothing, Delete does nothing, ⌘Z undoes the step before (w2-19…20),
  until a Layers click returns the focus.
- With a MetricCard selected (no part), ⌘A selects 9 characters of UI text and still one layer (w4-14). With the
  Screen selected, ⌘A selects all 17 frames, as Figma (w3-11).

Fix: ⌘A always selects layers (the selection's siblings, else every top-level frame) and the canvas keeps the
keyboard focus after any gesture; a focused part must not leave the document selection active. Owner:
`canvas/viewKeys.ts`, `select/` focus handling.

### 2.3 · P1 · A page opens at 100% on its overlay frames; the Screen is off-screen

- Open `quan-ly-task` → zoom 100%, in view: `overlay:create-task-error` (x −105) and `overlay:create-task-filled`
  (x 715); the "Quản lý task · Danh sách" Screen is to the left, under the Pages panel (ảnh 01; w5-1, w1-05). The same
  at 1024 (w3-vp-1024/01). `hr-expense-overview-2` opens with its six overlays at x 1864…5944.
- Figma opens a file at the last viewport, a new file zoomed to fit. Fix: on open, zoom to the first Screen (or
  fit all when there is one row), and keep the viewport per page in `sessionStorage` as the zoom already is.
  Owner: `canvas/viewport.ts`, `StudioApp.tsx` page open.

### 2.4 · P1 · Insert from Assets stacks every component at full width, no gap

- New page (Empty page) → Assets › Components › "Metric card" ×3, "Chart card", "Table" → five blocks, each
  `1512 × 156`, one under the other, gap 0 (ảnh 02; w2-05…10). To get a dashboard row: shift-click three rows in
  Layers → ⇧A → Flow horizontal → Gap (w2-11…13).
- Figma inserts a component at its own size at the pointer. The user's dashboard rule (`dashboard-layout-principles`:
  one grid, hero 8·4 or 12, rows fill) is the better target for a desktop Screen.
- Decision for the user: **A** — an inserted component keeps its own width and lands beside the selection with the
  page gap (Figma's result); **B** — on a desktop Screen the first insert makes a 12-column Grid and later inserts
  fill it 4·4·4 (the dashboard rule). Owner: `slots/palette.ts`, `builder/` insert.

### 2.5 · P1 · Prototype tab: the Flow list's trailing column is clipped at 320px

- Prototype tab with nothing selected → the rows' trailing text ("Start", "created", "O…") runs past the panel's
  right edge; 17 text nodes clipped (ảnh 06; w3-16, measured). Owner: `builder/proto/PrototypePanel.tsx` row grid.

### 2.6 · P1 · Phone width: the tool rail overflows

- 390×844 → the bottom tool rail is 463px wide; Text, Image, Pen, Zen Agent and the help button are off-screen or
  overlap (ảnh 07). The floating headers fit. Fix: below ~600px keep Move · Hand · Frame · Shape · Text and put the
  rest under one "More" menu. Owner: `canvas/CanvasTools.tsx`.

### 2.7 · P2 · Code words still on screen (summary; the full table is §6)

- The page's **file path on the canvas** as the board's kicker: "My page · kept in .qa/studio-e2e/.pages-5198/pages"
  (w2-03), and in the Page section: "A page you made, saved in this browser and in .qa/… as you edit." On the user's
  machine this reads ".zen-studio/pages" — still a path.
- Design-tab rows: `Selected ids`, `Current row id`, `Accessible name`, `Heading level`, `Bulk actions`, `Empty`
  (Table, ảnh 09); `Series`, `Series label`, `Comparison`, `Categories`, `Currency`, `Span`, `Animate` (MetricCard,
  ảnh 15); slot names `Action-Slots`, `Trailing-Slots`, `Nav-Trailing-Block`, `Child-Heading`, `Main-Element`
  (PageHeader, AppShellHeader; also the context menu's five "Add to …" items).
- Status and chrome: "harness clean / failed", "Restart the dev server to …", "View only — the dev server can't write
  src/", "Run `npm run dev`…", "${id}.zen.tsx stays in the Trash", `const`, `useState lines`, "line N" — §6 rows
  1–17, 32–36.
- Notes that run to two or three lines in a panel (rule: one short line, the rest in a tooltip): the Avatar-in-Table
  panel has three ("Changes row 2 only; the column's Content, Align and Bold below change every row.", "A column shows
  one kind of data…", "Editable is on for the whole Table: turn it off on the Data-Row", "Its click is code: the
  column's on open"; ảnh 08); "Changes on Desktop — Nothing: Desktop is the Screen as designed. View it on Tablet or
  Mobile to see what changes."; Typography › Vertical "Shows when the box is taller than its text (Height Fixed or
  Fill)"; Photos "Upload or drop PNG, JPEG, WebP, GIF or SVG files, up to 5 MB each. They stay in this browser and go
  with the page's exports."; the size badge's rule notes (N3).

### 2.8 · P2 · Instance properties are one long flat form

- Table selected → Properties: Accessible name, Caption, Selectable, Selected ids, Editable, Bulk actions, Sort,
  Empty, Current row id, then **Columns · 1 Task** with Header, Align, Width, Sortable, Icon, Content, Field… per
  column (ảnh 09). MetricCard → 18 rows, five of them empty fields (ảnh 15). Figma shows an instance's variant,
  boolean, text and swap properties only, in the order the component defines.
- Proposal: group each component's props as **Content · Look · Behaviour · Advanced** (from the API JSON's JSDoc
  groups), show Content and Look open, Behaviour and Advanced folded, and never an empty field without a value
  placeholder. Owner: `inspector/propSchema.ts`, `PropField.tsx`.

### 2.9 · P2 · Dark mode switches the design's theme with the UI

- `chromeTheme: dark` (Zen Studio menu › Dark mode) → the panels go dark **and** the frames render in the Dark theme;
  "Preview modes: Dark · Neutral - S1 …" (ảnh 11). Figma's theme setting changes the UI only. Question for the user:
  keep (one switch for both) or split (UI theme in the menu, the design's theme in Preview modes, as Figma).

### 2.10 · P3 · Smaller things seen on the walks

- Canvas text shows through the 8px gutters beside the floating panels: letters "X", "t", "b", "ô" at x ≈ 2 and
  coloured slivers at x ≈ 1500 (w1-09, w1-31). Paint the gutters, or widen the panels' margin to the canvas edge.
- The Design tab with nothing selected shows **two "Page" sections** (name + note + Export…, then Name / Mobile OS /
  Background / Project); "Local styles · Edit styles in Figma" is a heading with nothing to click; "Preview modes" is
  a text list (N7).
- Play's bar: "Quản lý task · Quản lý task · Danh sách" (page name + frame name share the prefix) (w1-24).
- A text drawn with T shows **X 0 / Y 0** with "Floats in a frame around it: its constraints are on that frame ·
  Select frame" (ảnh 10): the designer wanted the text's position, not its wrapper's.
- Fill names differ by layer: a shape says "Support / Neutral / Soft", a text says "strongest" (w2-21, w2-23).
- `studio.html` lands on the docs "Overviews" page in the Document space; the Studio home (Projects) is two clicks
  away through the Zen Studio menu › Switch to Studio (ảnh 12). A design tool's first screen should be its files.
- The Projects home card for Drafts is a pink ramp with a "Get started" button and a "New" badge — a placeholder
  thumbnail, not the page's picture (w1-03).
- The Layers count "186 layers in 17 frames" does not change on a search (w3-17).
- The Fill token list opens over the Constraints rows and is cut on the right ("Color/Background/Support/Neutr…")
  (w2-26).
- Prototype tab draws every connection on the canvas at once; with 17 frames the pink lines cross the whole board
  (ảnh 13). Figma does the same, but fades the lines of unselected frames.

## 3. The Figma-key walk (E2E `--only=figma`)

<!-- filled from the run's report -->
_Run in progress at the time of writing; the result is appended below when the run ends._

## 4. The walks, in "you do → what happens" form

| You do | What happens | Figma? | Ref |
| --- | --- | --- | --- |
| Open `studio.html` | The docs "Overviews" page, Document space | — | w1-01 |
| Zen Studio menu › Switch to Studio | Projects grid: Drafts (5 pages · Zen theme), New project | ≈ | w1-03 |
| Open `quan-ly-task` | 100% at the overlay frames; Screen off-screen | ✗ | ảnh 01 |
| ⇧1 | Fits all 17 frames at 10% | ✓ | w1-06 |
| Plain click on the table | "Frame" (the body Grid/Stack), 1152 × 508 | ✗ (Figma: the Table) | w1-07 |
| ⌘-click the same point | Table, "1152 × 452 · Height comes from the Table itself" | ✓ (badge note ✗) | w1-08 |
| Right-click a layer | Figma's menu: Select matching layers, Copy/Paste/Paste to replace, Swap instance, Copy properties, Add to Breadcrumbs… ×5, Duplicate, Bring to front…, Add auto layout | ✓ | w1-18 |
| ⌘K | Actions palette: Move V, Hand H, Frame F, Section ⇧S, Slice S, Comment C, Pick color I, Interact, Edit text ⏎ | ✓ | w1-19 |
| ? | Shortcuts dialog, two columns, Close | ✓ | w1-20 |
| Zoom %, Role, Zen Studio menu | Zoom in/out/fit/selection/50/100/200; Can edit / Can view; Switch to Document, Dark mode, Keyboard shortcuts, Show/Hide UI, Open classic docs | ✓ | w1-21…28 |
| ⌥⌘⏎ | Play: the desktop app full screen, bar with Viewport · Modes · Exit | ✓ | w1-24 |
| New page | Dialog "Start from": Empty page, Page with AppShell, 20 templates; Create page | ✓ | w2-02 |
| Assets › search "Metric card" › click | MetricCard inserted, 1512 × 156, selected; "Saved · ⌘Z to undo" (1.9 s) | ✗ full width | w2-05 |
| ×4 more inserts | Five full-width blocks, gap 0 | ✗ | ảnh 02 |
| Shift-click 3 rows in Layers, ⇧A, Flow → | "Wrapped 3 layers in an auto layout frame"; a row of three cards, gap 0 | ✓ | w2-12…13 |
| Double-click a card's label | `div · part of MetricCard`, CSS attributes | ✗ | ảnh 03 |
| ⌘A, type, ⏎ | The whole UI's text selected; nothing typed anywhere | ✗ | ảnh 04 |
| ⌘D, Delete (after the above) | Nothing; ⌘Z undoes the Flow change | ✗ | w2-19…20 |
| R drag, O drag, T click + type | Rectangle 1 (Position, Constraints, Fill token, Stroke), Ellipse 1, Text with Typography | ✓ | w2-21…23 |
| Drag a corner handle | 374 × 225 → 486 × 281 | ✓ | w2-25 |
| Fill row | Token list with search: Support / Neutral / Solid · Rich · Deep · Soft | ✓ (tokens) | w2-26 |
| ⌘-click a table avatar, Assets › Photos › click | "Avatar in Table shows Gothic college building…", row 2 only | ✓ 2 steps | ảnh 08 |
| ⌘-click "Tạo task" | `Text · part of Button`, Display block, Padding H 4px --zen-… | ✗ | ảnh 14 |
| Prototype tab › Add interaction | While hovering (On click exists: Open overlay Tạo task) | ✓ | w2-35 |
| ⌘-click "Tổng task", ⇧⏎, ⇧⏎ | Text · part of MetricCard → Metric · part of MetricCard → MetricCard | ✓ | w4-9 |
| ⌘D, Delete, ⌘Z (MetricCard) | Duplicated MetricCard (3 cards) → Removed (2) → back | ✓ | w4-10…12 |
| Plain click, double-click ×3 on "Tổng task" | Frame → MetricCard → MetricCard → MetricCard | ✗ (Figma: → text) | w4-13 |
| ⌘A with a MetricCard | 9 characters of UI text, one layer | ✗ | w4-14 |
| ⌘A with the Screen | All 17 frames selected | ✓ | w3-11 |
| Enter on a Text layer, type, Esc | Editor opens with the text selected; typing replaces; Esc commits | ✓ | w5-7 |
| Enter ×3 on a MetricCard | Card · part → div · part → div · part | ✗ | ảnh 05 |
| Layers search "zzqq" | "No layers found · Nothing on this page matches "zzqq" · Clear search" | ✓ | w3-17 |
| Inspector at 280px (Table, MetricCard, Frame) | No field juts out, no text cut | ✓ | probe 5 |
| Dark mode | Panels dark; the design renders Dark too | ? | ảnh 11 |
| 1280 / 1024 | Panels fit; at 1024 the left panel is a drawer | ✓ | w3-vp |
| 390 | Headers fit; tool rail 463px overflows | ✗ | ảnh 07 |

## 5. Accessibility and visual measurements (chrome only)

axe-core 4.13 on the Studio chrome (the canvas content excluded) on `quan-ly-task`, light and dark:

| Check | Light | Dark |
| --- | --- | --- |
| Unnamed buttons (left, right, tool rail) | 0 | 0 |
| Chrome text under 11px | 0 | 0 |
| Chrome text under 4.5:1 | 5: tab labels "Pages / Assets / Code / Prototype" 12px 450 rgba(0,0,0,.486) on white = **3.79:1**; Segmented "Android" 3.79:1 | 0 |
| Focus rings | Frame-label buttons: 2px #121212 outline; tool buttons: a shadow ring; the Close button in dialogs: pink ring (accent) | 2px #FDFDFD |
| Tab order (first 16 stops) | the 14 frame labels, then Move, Hand… — the Pages panel's search comes later | same |
| axe `color-contrast` | 5 (the same labels) | 0 |
| axe `aria-valid-attr-value` (critical) | 2: the page's Tabs `aria-controls="zen-tabs-…-panel-all"` points at a panel that is not rendered — **library Tabs** (apps too) | 2 |
| axe landmarks | the Studio's `main` holds the AppShell's `main` (duplicate main, nested landmarks, 3 unlabeled Sidebar landmarks); `aside role="dialog"` ×9 (the overlays drawn open) | same |
| axe `heading-order` | 1 (a MetricCard title level in the page) | 1 |

Reading: the chrome itself is clean apart from the 12px tab tone (a library decision, 10-04 A2) and the pink Close
ring; the landmark and ARIA findings come from the rendered pages and belong to the library (Tabs `aria-controls`) and
to the canvas wrapper (`role="application"` on the canvas, `region` for the panels would keep one `main`).

## 6. UX writing: strings that still speak code (audit of ~49,000 literals, 681 JSX text nodes, 14 surfaces)

Method: every string literal and JSX text in 399 Studio files and 88 engine files, read in context; a string is
listed only when it reaches the screen and `designWords` (`words.ts`) leaves code behind, breaks grammar, or the
text runs long. Ranked by surface: status line → Design tab → left panels / board → dialogs and chrome.

| # | file:line | string (trimmed) | rule broken | rewrite |
| --- | --- | --- | --- | --- |
| 1 | src/platform/studio/gate.ts:38 | "View only — the dev server can't write src/" | `src/` survives speak | "View only — the Studio server can't save on this computer" |
| 2 | tools/studio/doc.mjs:316 | "Not written: the page would break (line ${line}: ${message})" | line number | "Not written: this change would break the page — ${message}" |
| 3 | src/platform/studio/builder/localApi.ts:226,259 | "${request.file} is not a page in this browser" | speak strips the file, leaving no subject | "This page is no longer in this browser" |
| 4 | src/platform/studio/builder/frameMove.ts:433 | "View only — switch to Admin to edit" | the menu says "Can edit" | "View only — switch to Can edit to make changes" |
| 5 | src/platform/studio/edit/ignoreAutoLayout.ts:89 | "${name} floats in a Box around it: toggle it on its own (several layers float by their own props…)" | 120 chars; "props" | "${name} sits in a frame of its own — select that frame to change it" |
| 6 | src/platform/studio/inspector/detach.ts:500 | "${name} is already plain markup — only Zen components detach." | "plain layers" after speak | "${name} is not an instance — only Zen components detach" |
| 7 | src/platform/studio/builder/boardPaste.ts:73 | "The clipboard is not JSX elements" | "is not layers" after speak | "Nothing to paste: the clipboard holds no layers" |
| 8 | src/platform/studio/edit/assets/assets.ts:53,55 | "${label} keeps state or code, which a builder page has none of…" | "state", "builder page" | "${label} needs interactions: on a page you made, add them in the Prototype tab" |
| 9 | tools/studio/data-source.mjs:1002 | "${name} is a parameter; its value comes from where the component is used" | speak → "is an inputs" (words.ts:103) | "${name} comes from where the component is used — edit it there" |
| 10 | tools/studio/slots.mjs:1557 (+ family) | "an item with state is not copied into the example snippet (its useState lines are not in it); update it by hand (<Card>)" | "state", "useState", asks a designer to edit code | "The example's code is not updated for this item — the Code tab shows it" |
| 11 | tools/studio/vite-plugin-zen-studio.mjs:256 | "${target.rel} is not an editable example source" | repo path | "This example can't be edited here" |
| 12 | tools/studio/jsx-source.mjs:2128, detach.mjs:1576 | "It is docs chrome (zen-studio-chrome); edit it in the code." | identifier | "This is part of the docs page, not of the example" |
| 13 | tools/studio/detach.mjs:1569,1571 | "Bad loc "${loc}" (expected "<line>:<column>")." / "The file does not parse." | speak → "expected "layer":"layer"" | "Select the layer again" / "The page's code has an error — see the Code tab" |
| 14 | src/platform/studio/table/TableCellPanel.tsx:292 | "This row has no key (getRowId)" | "key", a function name | "This row has no id, so it can't be selected on its own" |
| 15 | src/platform/studio/slots/dataItems.ts:365 | "Its items are written in const ${via}: edit their fields below; add or remove them in the code" | `const` | "Its items are shared data: edit their fields below; add or remove them in the Code tab" |
| 16 | src/platform/studio/sourceDrafts.ts:168 | "harness clean" / "harness failed" / "${n} harness findings" | tool name in the status line | "checks passed" / "checks failed" / "${n} check findings" |
| 17 | select/wrapSelection.ts:296,303 · select/ResizeLayer.tsx:1036,1066 · slots/actions.ts:712 · edit/multi.ts:233 · edit/clipboard.ts:166 · inspector/DesignPanel.tsx:517 · position/float.ts:48 · api.ts:200 | "Restart the dev server to wrap layers" (family) | a developer action asked of a designer | one shared string: "This needs a newer Studio — ask whoever runs it to restart it" |
| 18 | inspector/ObjectProperties.tsx:180,190 · DataItemPanel.tsx:204 · DesignPanel.tsx:651 | undo labels "Sidebar items[1].label → "Home"", "${name} ${prop} → {${saved.value}}" | raw prop paths / braces in "Undid “…”" | "Sidebar › Item 2 › Label → Home" |
| 19 | src/platform/studio/edit/assets/picture.ts:234 | "This picture is shared by ${n} rows (it comes from the code, not from each row's data), so one row cannot take its own. Change…" | 170 chars, two sentences | "This picture is shared by ${n} rows: change it in the data, or in the Code tab" |
| 20 | src/platform/studio/inspector/SelectionActions.tsx:58 | "Add auto layout keeps how the layers sit now (direction, gap, alignment); Frame selection puts them in a frame." | 113-char panel note | each half in its button's tooltip |
| 21 | src/platform/studio/inspector/BreakpointSection.tsx:42 | "${bp} version of ${title}: a copy, so edits here stay here. Parts made into components (⌥⌘K) stay shared." | two-sentence note | "A ${bp} copy of ${title}: edits stay here" |
| 22 | src/platform/studio/inspector/breakpointBehaviours.ts:131-159 | "AppShell: phone pattern" / "…Stack, Grid and Box props…" | code names, no `say` | "App shell: phone layout" / "auto layout, grid and frame properties" |
| 23 | src/platform/studio/inspector/propSchema.ts:129-133, slots/registry.ts:299,149 | "Main-Element", "Pane-Content", "Child-Heading", "Nav-Trailing-Block", "Leading-Slots", "Action-Slots", "Top-Custom-Slot" | Figma layer names as Design-tab labels (deliberate per a 2026-10-16 comment — confirm) | "Main element", "Pane content", "Child heading", "Trailing", "Leading" |
| 24 | src/platform/studio/table/TableCellPanel.tsx:329 | title "Primitives/Table/Data-Row", note "State is this row's; Checkbox and Editable are the Table's (every row)." | Figma path as a title; 73-char note | title "Row"; note "Checkbox and Editable apply to every row" |
| 25 | src/platform/studio/table/TableCellPanel.tsx:522 | "Open-Button" · "Its click is code: the column's onOpen" | prop name | "Open button" · "Its click is set in code" |
| 26 | src/platform/studio/table/cellInstance.ts:41 | "This column's cells are code (cell): put the component in its cell function" | "cell function" | "This column's cells are set in code" |
| 27 | src/platform/studio/inspector/PropField.tsx:1077 | "Bound to the on/off state {${editor.state}}: one line when on" | braces, "state" | "Follows ${state}: one line while it is on" |
| 28 | src/platform/studio/select/SpacingLayer.tsx:538,584-589 | "${owner} ${kebab(prop)} is bound to <code>{expr}</code>" + "Change it in the source…" / "Card · padding-x" | raw braces on a canvas note, "source", kebab names | "${owner} padding is set in code — change it in the Code tab" / "Card · Horizontal padding" |
| 29 | src/platform/studio/inspector/propSchema.ts:117 | "Accessible name" | a11y jargon on the Design tab | "Name (screen readers)" |
| 30 | src/platform/studio/slots/palette.ts:1407 | "It needs live state; pages you make get interactions from the Prototype tab" | "live state" | "It needs interactions: add them in the Prototype tab" |
| 31 | src/platform/studio/inspector/frames.ts:25, board/StudioBoard.tsx:369 | "Props · ${Component}" | "Props" as a frame label | "Properties · ${Component}" |
| 32 | src/platform/studio/builder/BuilderBoard.tsx:213 | "${id}.zen.tsx stays in the Trash for 30 days." | file name | "“${title}” stays in the Trash for 30 days." |
| 33 | src/platform/studio/builder/MyPages.tsx:97,223,297 | "${days} days left · ${page.id}.zen.tsx" / caption "${item.id}.zen.tsx" / "(no .zen.tsx in it)" | file names in the Pages list and Export | "${days} days left" / "Download" / "(no Zen page inside)" |
| 34 | src/platform/studio/gate.ts:33-38 (raw in shell/ReadOnlyChip.tsx:67,76-77) | "The dev server cannot write src/" · "Run `npm run dev` in Zen-DS…" · "(the dev server keeps its write token there)" | dev server, src/, npm, port, token | "Changes can't be saved here — open the Studio on the computer that runs it" |
| 35 | src/platform/studio/shell/DraftsControls.tsx:148 | "Everyone on this dev server sees them until you save or discard. A frame saves … runs the harness (⌘S)." | 190 chars, "dev server", "harness" | "Unsaved until you save or discard; Save all saves every file (⌘S)" |
| 36 | src/platform/studio/agent/AgentPanel.tsx:239, agent/agentStore.ts:84 | "No Studio dev server" / "Zen Agent runs on the Studio dev server (npm run dev)." | raw | "Zen Agent is offline" / "Zen Agent needs the Studio server — start it first" |
| 37 | src/platform/studio/builder/NewPageDialog.tsx:101,112,118 | "One empty Screen, no AppShell" / "Page with AppShell" / "Add an AppShell from the Screen section…" | code name; elsewhere "App shell" | "App shell" everywhere |
| 38 | src/platform/studio/device/share.ts:37, OpenOnPhone.tsx:56,66 | "The Zen Studio dev server did not answer" / "If macOS asks, allow node to accept connections." | "dev server", "node" | "The Studio server did not answer" / "…allow the Studio server to accept connections" |
| 39 | src/platform/studio/inspector/DetachAction.tsx:36 | tooltip "Connecting to the dev server…" | raw (its status twin is rewritten) | "Connecting to the Studio server…" |
| 40 | slots/palette.ts:856,1048,1052,1069,1076 · slots/dataSlots.ts:97 · mainComponent/samples.ts:22 · builder/starters/hostLayout.ts:187 | "Brand colour", "Highlight colour", "Project colour", "data centre", "Favourite" | British spelling in inserted sample content (rule: Figma's US spelling) | "color", "center", "Favorite" |

Inconsistent terms (one example each):

- Screen vs Frame: `builder/proto/addFrame.ts:148` names a drawn frame "Frame N" or "Screen N"; "Add screen"
  (`PrototypePanel.tsx:94`) vs "Make a separate Screen" (`board/ScreenViewSwitch.tsx:40`).
- Main component vs Component set vs Component: `MainComponentFrame.tsx:190`, `frames.ts:39`, `StudioBoard.tsx:350`.
- Can edit / Can view (`RoleMenu.tsx:15`) vs Admin (`frameMove.ts:433`).
- Present (`FrameChrome.tsx:584`) vs Preview modes (`PresentBar.tsx:122`) vs the Interact tool (`CanvasTools.tsx:60`).
- "Studio dev server" / "Zen Studio dev server" / "dev server" vs "Studio server" (`LayersPanel.tsx:1184`).
- "a page you made" / "builder page" / "My page" / "pages you make" (`commands.ts:75`, `assets.ts:53`,
  `BuilderBoard.tsx:69`, `palette.ts:1407`).
- "Component theme / size" (`shell/modes.ts:19`) vs "Component Theme / Size" (`appearance/VariableModes.tsx:19`).
- "Example code not updated" (`Inspector.tsx:69`) vs "Snippet not updated" (`inspector/detach.ts:463`).
- "Switch to Document" (`PanelHeaders.tsx:72`) vs "Docs" / "Document" frames (`inspector/frames.ts:22-26`).

## 7. Proposed work, in order (needs the user's approval; tiers per AGENTS.md §C)

1. **P0 · Gestures reach layers, never parts (L).** Double-click and Enter take the ⌘-click path
   (`deepLayerAt`): into an instance to its text or nested instance, the next double-click edits the text; HTML
   parts (div / span / button) are folded out of the Design tab everywhere (the Code tab keeps them); a part's
   panel, where one still shows, is the owning layer's Figma panel (Typography for a text, Instance for a nested
   instance), never CSS. E2E: the Figma walk rows for double-click / Enter on an instance; SP-14's ≤ 3 double-clicks
   kept.
2. **P0 · Keyboard focus guard (S).** ⌘A selects layers (siblings, else all top-level frames) and never the UI's
   text; the canvas keeps focus after any gesture; ⌘D / Delete / ⌘Z work in every selection state. E2E row for
   "part selection → ⌘A → ⌘D".
3. **P1 · Open at the first Screen (S).** Zoom to the first Screen on open (fit when the page has one row); remember
   the viewport per page.
4. **P1 · Insert like Figma (M; decision A or B in §2.4).**
5. **P1 · Prototype Flow list at 320 and 280 (S); the phone tool rail (S).**
6. **P2 · Words and notes (S).** The 40 strings of §6, the file path off the canvas and the Page section, the size
   badge's rule notes into the Inspector, every panel note to one line with the rest in a tooltip, one term each for
   Screen / Frame, Can edit, Present, Studio server, "a page you made".
7. **P2 · Instance properties grouped (M).** Content · Look · Behaviour · Advanced from the API JSON; empty rows get
   a placeholder.
8. **P2 · Dark mode (S; decision in §2.9).**
9. **P3 · The small things of §2.10 (S each).**
10. **Library:** Tabs `aria-controls` on a missing panel (S); the 12px tab tone 3.79:1 (decision).

Without 1–2 the Figma user's first minute still ends in a CSS panel and a dead keyboard; 3–5 are what they hit in
the first five minutes; 6–8 are what they read.

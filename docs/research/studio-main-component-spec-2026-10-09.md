# Zen Studio — Main component: sửa style của component như Figma (spec, 2026-10-09)

Yêu cầu (user, 2026-10-09): "Playground ở mỗi component trong Studio đang chỉ để play. Tôi muốn nó là nơi quản lý các
primitives và component của nó như Figma, để vào Studio như một admin có thể chỉnh sửa trực tiếp."

Spec GĐ4 (`studio-builder-instance-spec-2026-10-07.md` §4) để việc sửa main component ra ngoài Studio. Spec này mở phần
đó, trong giới hạn user đã chốt.

## 1. Quyết định của user (2026-10-09)

| Câu hỏi | Chọn |
| --- | --- |
| Admin sửa được gì | **Style theo variant**: chọn một variant và một lớp (primitive) trong nó, đổi token (padding, gap, radius, kích thước, màu). Ghi vào CSS của component (`src/components/<Name>/<name>.css`), không đụng TSX. |
| Code lệch Figma | **Cảnh báo, vẫn cho lưu**: Save chạy kiểm tra Figma parity của component; lệch thì chỉ rõ chỗ lệch, hỏi xác nhận, ghi một dòng backlog "cập nhật Figma". |
| Nằm ở đâu | **Frame mới "Main component" cạnh Playground**. Playground, Docs, Examples giữ nguyên. |

## 2. Người dùng thấy gì

- Trang mỗi component trong Studio có frame **Main component** cạnh Playground: lưới mọi variant như component set
  của Figma. Prop kiểu SET (Button: Main / Flat / Overlay) chia thành từng khối; trong khối, hàng = trục VARIANT thứ hai
  (Level), cột = trục thứ nhất (Size). Các trục còn lại (State, các boolean như Leading-Icon) là bộ lọc trong panel của
  frame, mặc định theo giá trị mặc định của Figma.
- Chỉ những tổ hợp Figma có mới được vẽ (đọc từ file Figma, xem §3.2).
- **Layers** của frame: Component set → khối → từng variant (`Size=XS, Level=Primary`) → các lớp bên trong (root,
  `__icon`, `__label`…), như Figma.
- Click một ô chọn variant (lớp root); double-click hoặc ⌘-click vào trong chọn lớp con. Có outline như mọi selection.
- **Inspector** của lớp đã chọn: các nhóm Layout (chiều cao, padding, gap), Appearance (radius, nền, viền, bóng), Text
  (màu chữ; text style chỉ đọc vì TSX đặt nó). Mỗi hàng cho thấy token đang dùng, chuỗi alias tới giá trị cuối (px /
  màu), và **phạm vi** của rule CSS: "Size = XS · mọi Level, State" — đổi hàng này đổi cho đúng phạm vi đó.
- Admin chọn token khác cùng họ (spacing, radius, size, màu cùng vai trò). Thay đổi là **bản nháp**: mọi ô của lưới, mọi
  trang đang mở cập nhật ngay (CSS hot update); ⌘Z / ⇧⌘Z hoàn tác. Viewer chỉ xem.
- **Save** ghi file CSS rồi chạy style-guard và Figma parity của component. Lệch Figma: hộp thoại liệt kê (variant,
  lớp, thuộc tính, Figma = X, code = Y) với **Giữ thay đổi** (ghi dòng backlog) hoặc **Hoàn tác lần lưu**. Component chưa
  có bộ kiểm tra Figma: báo "chưa kiểm tra được với Figma".

## 3. Thiết kế kỹ thuật

### 3.1 Frame

- `board/StudioBoard.tsx`: thêm `<StudioFrame id="main-component" kind="main-component">` sau Playground (thứ tự DOM là
  thứ tự trong danh sách frame). `board.css`: lưới thành `"title title title" "playground main docs" "examples examples docs"`.
- `types.ts` `StudioFrameKind` + `inspector/frames.ts` (tên, icon) + `frameLayout.ts` (độ rộng theo số cột).
- Nội dung frame do code Studio vẽ (không annotate): render component thật với props của từng tổ hợp, nên CSS sống.

### 3.2 Dữ liệu variant

- Trục và tên Figma ↔ prop code: `inspector/figmaProps.generated.ts` (`FIGMA_PROPS`, từ `figma-props.map.mjs`).
- Tổ hợp có thật: option VARIANT **của từng set** trong `docs/figma-contracts/component-properties.json` (Button/Flat có
  2 level, Button/Main 9). Đọc Figma (use_figma, chỉ đọc, 2026-10-09): cả 6 set của Button là lưới đủ (Size × Level ×
  State = số variant: 225, 50, 100, 270, 125, 120), nên không cần lưu danh sách variant riêng. Sinh ra
  `mainComponent/variantSets.generated.ts` bằng `tools/studio/variant-sets-build.mjs` (`--check` trong `studio:selftest`):
  58 component, 71 set.
- Mỗi ô vẽ từ code mẫu của Assets (`slots/palette.ts`, parse như preview của Assets), props của variant đè lên: item có
  `root` là component, không có thì node đầu tiên của component đó trong item dùng nó (Tabs trong item "tabs"). Overlay
  (Dialog, ModalForm, SidePanel, BottomSheet, Toast) chưa vẽ: mở ra sẽ phủ canvas. Chưa có item nào dùng (M1, 12):
  BadgeCounter, HeadingField, OpinionScale, SkeletonShape, ToggleButton, ChatAvatarGroup, ChatBubble, ChatCall, ChatFile,
  ChatConversationItem, InputConditionItem, ControlBarSelectItem. Set Overlay vẽ trên ảnh (platformMedia.mountainRoad).

### 3.3 Selection

- Kiểu mới `{ kind: "variant-part", frameId, component, variant: Record<prop, value>, path: number[], name }` trong
  `types.ts`; `select/SelectionLayer.tsx` (pick, ⌘/double-click, outline trong `measure`), `remap.ts`
  (`sameSelectedElement`), `LayersPanel.tsx` (cây của frame từ DOM: phần tử có class `zen-*`), `inspector/Inspector.tsx`
  (định tuyến tới panel mới).

### 3.4 Đọc style (trình duyệt)

- Vite dev nạp CSS component thành `<style data-vite-dev-id="…/button.css">`: CSSOM cho rule nào khớp phần tử
  (`element.matches`), specificity, thứ tự. Với mỗi thuộc tính: rule thắng, giá trị khai báo, chuỗi `var()` (custom
  property tra qua `getComputedStyle`), giá trị cuối, và phạm vi từ các `[data-*]` trong selector.
- Text style và mọi thứ TSX đặt: chỉ đọc, ghi "đặt trong Button.tsx".

### 3.5 Ghi (server)

- Route mới `POST /css-edit {file, selector, media?, prop, value, hash}` trong `tools/studio/vite-plugin-zen-studio.mjs`:
  postcss (8.5, khai báo vào devDependencies) tìm rule theo selector (+ `@media` cha) và khai báo theo `prop`, thay giá
  trị, giữ định dạng. Chặn: file phải là `src/components/<Dir>/<name>.css`; giá trị phải là `var(--zen-…)` của token có
  thật (tokens.css hoặc custom property của chính component) — không bao giờ tạo token mới; rule và khai báo phải có sẵn.
- Ghi vào draft (`setDraft`), trả về dạng EditResponse (`before/after/hash`) để undo / redo / lịch sử dùng lại nguyên.
  Nới điều kiện ghi của `/write` và `draftable` cho đúng các file CSS đó (undo đi qua `/write`).
- Frame toolbar (Save / Discard của frame) đếm và lưu draft CSS của component trong frame.

### 3.6 Save và Figma parity

- Sau khi ghi đĩa: `runHarness` đã chạy style-guard trên file đã lưu. Thêm: bộ kiểm tra Figma của component
  (`tools/figma-contract/check.mjs <suite> --json`, suite theo `contractSuites()` trong `tools/qa/lib.mjs`), chạy nền,
  kết quả về client.
- Lệch: hộp thoại như §2. Giữ → dòng `P2 · Figma cập nhật: <Component> <variant> <thuộc tính> đổi trong Studio
  (figma=X, code=Y) — <ngày>` vào `docs/context/BACKLOG.md`. Hoàn tác → ghi lại text trước khi lưu.

## 4. Không làm (theo quyết định)

- Sửa cấu trúc TSX của component (thêm / bớt lớp), thêm prop hay giá trị variant, tạo token mới.
- Thêm rule mới để chỉ một tổ hợp variant khác đi (đổi luôn theo phạm vi rule có sẵn; mốc sau nếu user cần).

## 5. Thứ tự giao (mỗi mốc: `npm run qa`, hàng E2E mới, CHANGELOG, báo user)

Trạng thái 2026-10-10: M1, M2, M3 xong (M1–M2 commit 4d65285). M3 không có hàng E2E: Save ghi file thư viện dùng chung;
đã thử trọn luồng trong một git worktree riêng.

| Mốc | Nội dung | Cỡ | Người dùng thấy |
| --- | --- | --- | --- |
| M1 | Frame Main component, lưới variant (tổ hợp từ Figma), Layers, chọn variant / lớp, Inspector chỉ đọc (token, chuỗi alias, phạm vi rule) | L | Xem component như component set Figma, biết mỗi giá trị đến từ token nào |
| M2 | Sửa token: route `/css-edit`, bộ chọn token theo họ, draft + hot update, undo / redo, Save / Discard của frame | L | Đổi padding, gap, radius, màu… của một variant, thấy ngay mọi nơi |
| M3 | Save chạy Figma parity + style-guard, hộp thoại lệch Figma, dòng backlog, hoàn tác lần lưu | M | Biết ngay thay đổi có lệch Figma không |

Thử trước trên Button (+ IconButton), rồi Badge, Checkbox, Tabs, Input (43 lớp) trước khi mở cho mọi component.

## 6. Rủi ro

- Các phiên khác đang sửa Studio (`select/*`, `builder/*`): báo vùng file trước khi sửa, sửa có mục tiêu.
- Selector phức tạp (`:is()`, `:not(:disabled)`, `@media`): phạm vi ghi gần đúng ("một số trạng thái"); vẫn chỉ sửa
  đúng khai báo đã chọn.
- CSS nạp qua `@import` sẽ không thấy draft (hiện không component nào làm vậy).
- Figma parity đọc file trên đĩa nên chỉ chạy được sau khi lưu; một suite có thể mất vài chục giây.

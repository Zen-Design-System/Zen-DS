# Studio Builder GĐ3: thư viện, tìm và chèn (spec, 2026-10-06)

**Trạng thái: chờ user duyệt.** GĐ3 của `docs/research/studio-builder-plan-2026-10-05.md`. GĐ2 đã xong (M1–M4,
`docs/research/studio-builder-pages-spec-2026-10-06.md`). Spec này chốt phạm vi GĐ3 mà plan mới phác, dựa trên đo đạc
code hiện tại (§2), và nêu 4 câu hỏi cho user (§8).

## 1. Mục tiêu và tiêu chí xong

Người dùng mở thư viện (tab Assets, hoặc **⇧I** ở bất cứ đâu trên canvas), gõ theo cách mình nghĩ ("modal",
"dropdown", "nút", "buton"), thấy đúng component, icon hoặc ảnh, rồi:
1. bấm hoặc Enter để chèn vào chỗ hợp lý: slot đang chọn, layout đang chọn, ngay sau layer đang chọn, hoặc **vào frame
   đang xem khi chưa chọn gì** (dòng E2E ST-02, đang hỏng);
2. kéo thả lên canvas (đã có cho component; thêm cho icon và ảnh);
3. đang chọn một `<Icon>` thì chọn icon khác là **đổi icon** (swap), không chèn thêm.

Áp dụng cho cả trang example (dev server) lẫn trang tự tạo (builder, kể cả bản build không có dev server). Xong khi
ST-02 và các dòng E2E nhóm `library` (LB-xx) đều works, và `npm run studio:build-check` chèn được Icon và ảnh trên
bản build.

## 2. Hiện trạng (đo ngày 2026-10-06)

- **Assets** (`edit/assets/*`): 60 mục của palette (`slots/palette.ts`, 11 nhóm). Tìm bằng chuỗi con trên tên, nhóm,
  chú thích và tên component; không có từ đồng nghĩa: "modal" không ra Dialog, "switch" không ra Toggle, "dropdown"
  không ra Select, "nút" không ra gì, gõ sai một chữ ("buton") là trống.
- **Chưa chọn gì** thì bấm một mục chỉ báo "Select a layer in an example first" (ST-02 broken).
- **Icon**: 1.595 tên (`src/icons/generated/names.ts`, gồm bản line và solid), không có thẻ từ khoá. Thư viện chỉ chèn
  được một Icon cố định (`icon-mobile-line`).
- **Ảnh**: mục Image ghi `src={platformMedia.site[5].src}` (biến). Trên trang builder, dialect chỉ nhận literal, nên chèn
  Image bị từ chối. Ảnh mẫu là file trong repo (`src/assets/media/*.webp`), khi build sẽ có tên kèm hash.
- **Nguồn từ khoá có sẵn**: `docs/guidelines/index.json` có `purpose`, `use`, `avoid` cho 62 component; các dòng `avoid`
  viết dạng "Chọn bộ lọc… → Chip", tức là đã có ánh xạ ý định → component.

## 3. Thiết kế

### 3a. Catalog (thuần, `builder/library/catalog.ts`)

Một danh sách entry chung cho mọi nguồn: `{ kind: "component" | "icon" | "photo", id, label, group, keywords, root,
code(target) → string | null }`.
- **component**: từ PALETTE, giữ nguyên code và quy tắc hiện có (trang builder: `builderCode`, item có state bị từ chối
  kèm lý do như hôm nay).
- **icon**: mỗi glyph một entry (gộp line/solid thành biến thể); từ khoá lấy từ tách tên (`icon-arrow-narrow-up-line` →
  arrow, narrow, up).
- **photo**: 16 ảnh của `platformMedia` với khoá ổn định (`site-cafe`, `feed-desert`…) và `alt` có sẵn.

### 3b. Tìm kiếm (thuần, `builder/library/search.ts` + selftest)

- Xếp hạng: trùng tên > tên bắt đầu bằng từ gõ > một từ trong tên bắt đầu bằng từ gõ > từ đồng nghĩa / từ khoá > gõ sai
  một chữ (khoảng cách sửa ≤ 1, từ dài từ 4 ký tự).
- Từ khoá: `purpose` và `use` của guideline, các dòng `avoid "→ X"`, và một bảng đồng nghĩa viết tay
  (`builder/library/synonyms.ts`), cả tiếng Anh lẫn tiếng Việt (câu hỏi Q4). Ví dụ: modal, popup, hộp thoại → Dialog;
  dropdown, chọn → Select, Menu; switch, công tắc → Toggle; nút → Button; ô nhập, textbox → InputField; bảng → Table;
  biểu đồ → Chart; thông báo → Toast, InlineMessage.
- So khớp không phân biệt hoa thường và bỏ dấu tiếng Việt (đ → d), nên "hop thoai" cũng ra Dialog.

### 3c. Quick insert (⇧I, `builder/library/QuickInsert.tsx`)

- Hộp nhỏ ở đầu canvas, như Quick insert của Figma: ô tìm; kết quả chia nhóm Components, Icons, Photos; ↑/↓, Enter, Esc.
- Một dòng ghi đích chèn ("Vào Stack · Checkout", "Sau Button", "Vào frame Checkout") để biết trước mục sẽ vào đâu.
- Xem trước mục đang focus (câu hỏi Q1).
- Tab Assets dùng chung catalog và tìm kiếm. Thêm bộ lọc Segmented Components · Icons · Photos; icon và ảnh hiện
  dạng lưới (glyph thật, ảnh thu nhỏ thật).

### 3d. Chèn vào đâu (`builder/library/target.ts`)

Theo thứ tự:
1. slot đang chọn (`insertTargetFor` của `slots/registry.ts`);
2. layout đang chọn: chèn vào trong;
3. layer đang chọn: chèn ngay sau;
4. **chưa chọn gì: frame gần tâm viewport nhất**. Với frame example là phần tử gốc của frame; với trang builder là
   layout đầu tiên của Screen, không có thì chính Screen;
5. không có frame nào: báo lý do.

Sau khi chèn, layer mới được chọn, và một lần ⌘Z gỡ nó, như Assets hôm nay.

### 3e. Icon

- Chèn `<Icon name="icon-…" title="…" />`. `title` lấy từ tên glyph, người dùng sửa được trong Inspector.
- Đang chọn một `<Icon>` thì chọn icon khác ghi `setProp name`, tức là đổi icon. Icon nằm trong prop của component khác
  (Button `startIcon`, ListItem `leading`…) để GĐ4 (instance swap).

### 3f. Ảnh trên trang builder: `zen-media:<khoá>`

- Trang builder ghi `<Image src="zen-media:site-cafe" alt="Café table with a coffee" ratio="4:3" />`. Đây là chuỗi
  literal nên dialect hợp lệ, file trang giống nhau giữa các bản build, và Export / Import giữ nguyên.
- Renderer đổi `zen-media:` sang URL thật của bản build đang chạy. Export ở GĐ5 đổi sang file ảnh.
- Trang example vẫn ghi `platformMedia…` như hôm nay.

## 4. Không làm ở GĐ3

- Đổi icon hoặc component nằm trong prop của component khác (instance swap): GĐ4.
- **Starters** (tạo trang từ example hoặc template có sẵn): cần một bộ chuyển example → dialect, vì example dùng hook,
  dữ liệu import và helper. Đề xuất làm thành GĐ3b riêng (câu hỏi Q3).
- **Ảnh tải lên từ máy**: câu hỏi Q2.

## 5. Thứ tự giao (mỗi mốc chạy `npm run qa`, build-check khi đụng builder, cập nhật HANDOFF/CHANGELOG, báo user)

| Mốc | Nội dung | Cỡ | Người dùng thấy |
| --- | --- | --- | --- |
| M1 | Catalog + tìm kiếm (đồng nghĩa, bỏ dấu, gõ sai) + đích chèn khi chưa chọn gì | M | "modal" ra Dialog; bấm khi chưa chọn gì vẫn chèn (ST-02) |
| M2 | Quick insert ⇧I + xem trước (Q1) | M | ⇧I ở bất cứ đâu, Enter chèn |
| M3 | Icons + Photos trong thư viện, đổi icon, `zen-media:` | M | Lưới icon và ảnh; ảnh chèn được vào trang builder |
| M4 | (nếu Q2 = b) ảnh tải lên: IndexedDB + thư mục mirror | M | Kéo ảnh từ máy vào trang |

## 6. File

- **Mới:** `src/platform/studio/builder/library/{catalog.ts, search.ts, synonyms.ts, target.ts, QuickInsert.tsx,
  LibraryGrid.tsx, library.css}` và `search.selftest.mjs`; nhóm E2E `tools/studio/e2e/scenarios/library.mjs` (LB-01…).
- **Sửa phạm vi nhỏ:**
  - `edit/assets/{AssetsPanel.tsx, assets.ts}`: dùng catalog và đích chèn mới;
  - `StudioApp.tsx`: phím ⇧I;
  - `builder/render/renderPage.tsx`: `zen-media:`;
  - `slots/palette.ts`: Image cho trang builder;
  - `tools/studio/e2e/build-check.mjs`: chèn Icon và ảnh trên bản build.

## 7. Kiểm chứng

- **Selftest tìm kiếm** (≥ 40 ca):
  - từ đồng nghĩa EN và VI, bỏ dấu, gõ sai một chữ;
  - thứ tự xếp hạng ("button" ra Button trước Button row);
  - tách tên icon;
  - không có kết quả thừa (ví dụ "tab" không ra Table trước Tabs).
- **E2E nhóm `library`:**
  - ST-02 chuyển sang works;
  - "modal" ra Dialog;
  - ⇧I rồi Enter chèn vào layout đang chọn;
  - chưa chọn gì thì chèn vào frame đang xem;
  - đổi icon trên một Icon đang chọn;
  - ảnh `zen-media:` trên trang builder hiển thị, reload vẫn còn.
- **`npm run studio:build-check`**: thêm bước chèn Icon và ảnh trên bản build. Chunk engine vẫn ≤ 140 KB, vì catalog
  và tìm kiếm nằm ở phía Studio, không nằm trong engine.

## 8. Câu hỏi cho user

1. **Xem trước trong Quick insert:**
   - (a) chỉ mục đang focus, dựng thật bằng engine, tải khi mở Quick insert (đề xuất);
   - (b) ảnh thu nhỏ cho mọi dòng: cần thêm một bước chụp ảnh khi build, nặng;
   - (c) không xem trước.
2. **Ảnh tải lên từ máy:**
   - (a) để sau, làm cùng GĐ5 Export vì phải đóng gói file ảnh (đề xuất);
   - (b) làm luôn ở GĐ3, thêm mốc M4.
3. **Starters** (trang mới từ example hoặc template):
   - (a) GĐ3b riêng, sau GĐ3 (đề xuất);
   - (b) gộp vào GĐ3.
4. **Từ khoá tiếng Việt trong tìm kiếm:**
   - (a) có (đề xuất);
   - (b) chỉ tiếng Anh.

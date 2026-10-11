# Zen Studio → Figma: đẩy thiết kế lên (Q4) và tự động hoá component (Q5) — spec, 2026-10-12

**Trạng thái:** duyệt. User duyệt Q4 và Q5 (2026-10-12: "Q4: ok, Q5 OK") và chốt §6 cùng ngày: kênh ghi là plugin Zen,
Import from Studio tự do / rebind theo licence, thư mục plugin vào git local trước khi sửa.
Nguồn: kế hoạch đổi lõi `studio-doc-engine-plan-2026-10-10.md` §4.6, §8 (Q4, Q5); khảo sát 2026-10-12 (plugin, contracts,
figma-pull).

## 1. Mục tiêu (đo được)

- **Q4 — đẩy trang lên Figma.** Một trang Studio (hoặc bản thiết kế mở từ trang code, M8) thành một frame trong file Figma
  Zen: instance thư viện thật (đúng variant, property, override lồng), auto layout gắn variable Spacing, chữ theo text
  style. Đẩy lại lần sau **cập nhật đúng frame đó** (theo ID đã lưu), không tạo bản thứ hai.
  - Đo: kéo frame vừa đẩy về (`figma-pull`) ra đúng trang ban đầu (so cấu trúc: `doc.mjs`), trên 5 trang mẫu (dashboard,
    bảng Figma, Overviews, một trang có override lồng, một trang có Actions column).
- **Q5(1) — Figma đổi binding → đề xuất diff CSS.** Khi một biến thể trong Figma đổi variable (padding, gap, height, bo
  góc, màu), Studio liệt kê thay đổi theo component › variant › layer › thuộc tính, mỗi dòng kèm khai báo CSS sẽ đổi
  (`var(--zen-old)` → `var(--zen-new)`); chọn rồi Apply ghi qua `css-edit` như Main component. Không tự ghi.
  - Đo: trên các component có suite (25 file suite), đổi giả lập một binding trong contract → đề xuất đúng khai báo; Apply
    xong, `check.mjs` của suite đó xanh.
- **Q5(2) — Save Main component → đẩy lên Figma.** Khi Save một sửa token trong frame Main component, Studio tạo gói
  "rebind" (set › variant › layer › field → variable) và plugin áp vào component master trong Figma.
  - Đo: sửa một token Button trong Studio, áp gói trong plugin, `figma-kit status` thấy đúng các variant đó đổi hash và
    `check.mjs` Button xanh trên contract chụp lại.

## 2. Những gì đã có

| Mảnh | Ở đâu |
| --- | --- |
| Đọc frame Figma → JSON → trang | `tools/studio/figma-pull.mjs` (`figmaReadCode`, `pageFromFigma`), `figma-diff.mjs`, Update from Figma |
| ID Figma trên node của trang | `figmaDocId`, header `figma {file,node}` |
| Map property Figma ↔ prop code | `figma-props.map.mjs`, `figmaProps.generated.ts`, `variantSets.generated.ts` |
| Ghi vào Figma (component master, variable) | Plugin Zen `~/Documents/zen-ds-figma-plugin-main` (`jsonToNode`, `import-components-json`, `import-variables-json`) |
| Binding theo layer trong contract | `docs/figma-contracts/*` (`bv`, paint `v`), `tools/figma-kit` (hash đổi khi đổi binding) |
| Tên variable ↔ biến CSS | `tools/figma-contract/check.mjs cssVar`, `scripts/build-tokens.mjs cssName` |
| Layer Figma ↔ phần tử DOM | map của các suite (`tools/figma-contract/suites/*`) |
| Sửa một khai báo CSS an toàn | `tools/studio/css-edit.mjs editDeclaration` |

## 3. Kiến trúc

### 3.1 Một định dạng cho hai chiều

Gói đẩy lên dùng **đúng JSON mà `figmaReadCode` trả** (FRAME / INSTANCE / TEXT / TABLE, layout, `nested`, `slots`), thêm
`id` Figma khi node đã có trong file. Mã mới `tools/studio/figma-push.mjs`:

- `figmaFromPage(text)` — nghịch đảo của `pageFromFigma`: element → INSTANCE (set id + property Figma qua bảng map ngược),
  `overrides` → `nested` theo đường dẫn layer, Stack → FRAME auto layout (gap / padding theo **tên variable**), Text →
  TEXT + text style, Table → TABLE (Data-Row), id tài liệu `f14243-64878` → id Figma.
- Selftest vòng tròn: `pageFromFigma(figmaFromPage(page))` ≡ `page` trên fixture Overviews, Table và các trang mẫu.

### 3.2 Kênh ghi: plugin Zen (đề xuất)

Luật hiện hành: `use_figma` chỉ đọc (HANDOFF, skills). Kế hoạch đã chọn đẩy qua plugin Zen (Q4: "nếu làm thì qua plugin
Zen"). Plugin thêm:

- Lệnh **Import from Studio** (tab Components): chọn file `.figma.json` mà Studio xuất ra (Studio: Export › For Figma).
  Không cần mạng: plugin hôm nay chỉ nhận file, không gọi được localhost.
- Message `place-studio-frame` trong `code.js`: dựng / cập nhật frame từ JSON — `importComponentByKeyAsync` hoặc tìm master
  theo set id và tên variant, `setProperties`, override lồng theo đường dẫn layer, `setBoundVariable` cho gap / padding,
  text style theo tên. Node đã có (id trong JSON) thì cập nhật tại chỗ; node mới thì tạo; node không còn trong JSON thì
  xoá (hỏi trước trong UI plugin). Trả về bảng id mới → Studio ghi vào trang (lần đẩy sau cập nhật đúng chỗ).
- Message `rebind-variants` cho Q5(2): `{ set, variants[], layer path, field, variable name }[]` → `setBoundVariable` trên
  master. Dùng lại phần rebind sẵn có trong importer, tách thành hàm riêng.

Kết quả của plugin (id mới, chỗ không map được) quay về Studio qua file `.figma-result.json` (Import trong Studio) hoặc
dán vào hộp "Paste result" (một bước, không cần mạng).

### 3.3 Q5(1): binding đổi → đề xuất CSS

`tools/studio/binding-diff.mjs` (Node):

1. `figma-kit status` → biến thể đổi hash; `code fetch` → contract mới (đã có).
2. So `bv` và paint `v` cũ / mới theo layer → danh sách `{set, variant, layer, field, from, to}`.
3. Layer → selector qua map của suite; field → thuộc tính CSS (`itemSpacing` → `gap`, `padding*`, `height`, `*Radius` →
   `border-radius`, fill → `background-color` / `color`); variant → scope (`[data-size="xlarge"]` qua `VARIANT_SETS`).
4. Tìm khai báo trong `src/components/<Name>/<name>.css` (postcss + so scope; bản Node của `cssResolve`).
5. Đề xuất `{file, selector, prop, from: var(--zen-a), to: var(--zen-b)}`; tên variable → biến CSS qua `cssName`.

Studio: hộp "Figma changed N bindings" trong frame Main component (danh sách tick, Apply = một sửa đổi, ⌘Z), cùng nơi
với ParityDialog. CLI: `node tools/studio/binding-diff.mjs --apply` cho phiên không giao diện.

Phạm vi: component có suite. Component chưa có suite báo "chưa có map layer" (cùng danh sách với gate `nested-paths`).

### 3.4 Q5(2): Save Main component → gói rebind

Lúc Save (đã có: harness, parity), Studio ghi thêm `rebind` cho mỗi khai báo đổi token: scope CSS → variant (ngược
`VARIANT_SETS`), selector → layer (ngược map của suite), biến CSS → tên variable Figma (bảng tra dựng từ
`tokens/source`, không đoán từ kebab-case). Gói hiện trong ParityDialog thành nút "Export for Figma"; plugin áp bằng
`rebind-variants`. Khai báo không map được thì ghi BACKLOG như hôm nay.

## 4. Lộ trình

| Mốc | Nội dung | Xong khi |
| --- | --- | --- |
| P0 | `figma-push.mjs figmaFromPage` + selftest vòng tròn (repo, không đụng Figma) | 5 trang mẫu đi vòng tròn đúng |
| P1 | Plugin: sao lưu, đưa vào git (§6 C), `place-studio-frame` + Import from Studio; Studio: Export › For Figma, Paste result | Đẩy trang Overviews vào file nháp (trang "Studio exports"), kéo về khớp; đẩy lại cập nhật tại chỗ |
| P2 | Override lồng, Table, Actions column, slot, ảnh | 5/5 trang mẫu đẩy lên rồi kéo về khớp |
| P3 | Q5(1) `binding-diff.mjs` + hộp trong Main component | Binding giả lập đổi → đề xuất đúng → Apply → suite xanh |
| P4 | Q5(2) gói rebind + `rebind-variants` trong plugin | Sửa token Button → áp trong plugin → `figma-kit status` + `check.mjs` khớp |

Mỗi mốc: selftest + E2E (nhóm mới `push`, PU-xx), `npm run qa`, CHANGELOG, session log, báo user.

## 5. An toàn

- Plugin chỉ ghi khi người dùng bấm trong plugin; frame đẩy lên nằm ở trang riêng "Studio exports" cho tới khi người dùng
  kéo nó đi. Component master chỉ đổi qua `rebind-variants`, sau khi xem trước danh sách.
- Plugin không có git: trước mỗi lần sửa, tarball vào `backups/` (thói quen hiện có) và commit (§6 C).
- `use_figma` vẫn chỉ đọc trong repo; kiểm tra tự động (E2E, selftest) không ghi vào Figma. Một lần thử thật mỗi mốc,
  trên file nháp hoặc trang "Studio exports", do user bấm trong plugin.

## 6. Câu hỏi cho user

| # | Câu hỏi | Đề xuất |
| --- | --- | --- |
| A | Kênh ghi: plugin Zen (designer tự làm, cần sửa plugin) hay `use_figma` (nhanh, chỉ chạy qua Claude, bỏ luật chỉ đọc) | Plugin Zen |
| B | Lệnh mới trong plugin có cần licence (như cập nhật component) không | Không cần licence cho Import from Studio; rebind theo licence như cập nhật component |
| C | Đưa thư mục plugin vào git (repo local, không push) trước khi sửa | Có |

**User chốt 2026-10-12:** A plugin Zen · B Import from Studio tự do, rebind theo licence · C git local.

## 7. Tiến độ

### P0 (2026-10-12, nhánh `zen/feat/figma-push`)

- `tools/studio/figma-push.mjs` `figmaFromPage` (isomorphic): Stack / Grid → FRAME auto layout (gap, padding theo tên
  variable `Spacing/Gap/…`, `Spacing/Padding/…`; căn, justify, wrap, Fill), Text → TEXT + text style, component → INSTANCE
  (set theo `appearance` khi có nhiều set, mọi property map được theo tên Figma: variant, boolean, text, icon swap kèm
  toggle; nhãn; con vào slot đầu của set; tên layer = aria-label), `overrides` → `nested` (component của từng layer:
  `inspector/nestedLayers.generated.ts`, sinh bởi `tools/studio/nested-layers-build.mjs` từ các lời gọi `nest()`), Icon →
  instance của icon. ID tài liệu `f…` → ID Figma (`figmaIdOf`). Phần P2 (data slot, node slot, Table, layer tuyệt đối)
  được ghi chú, không bỏ im lặng.
- `tools/studio/figma-steps.mjs`: bước Spacing và `sameValue` dùng chung hai chiều; `figmaMapping` giữ id, tên và slot
  của set.
- CLI `tools/studio/figma-push-cli.mjs <page.zen.tsx> --out=<page.figma.json>` (gói `{ format: "zen-studio-figma",
  version: 1, frame }`).
- Kiểm tra: `figma-push.selftest.mjs` 18 (vòng tròn Team kéo → đẩy → kéo giống hệt chữ; trang tự viết giống cấu trúc;
  set, property, variable, nested, Grid, slot, id). Trang Overviews thật: đẩy được, ghi chú Sidebar sections/brand/footer,
  DashboardHeader slots và 2 layer tuyệt đối (P2).

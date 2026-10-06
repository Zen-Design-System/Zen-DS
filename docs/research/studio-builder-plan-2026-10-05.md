# Zen Studio → Builder tool: plan

## Context

User (2026-10-05) muốn Studio trở thành một builder tool thực sự, trong đó mọi tính năng hoạt động đúng; hiện nhiều
tính năng không chạy. Về sau user muốn tạo trang mới (lưu local), tìm component và asset trong library, và tuỳ chỉnh
component chính xác như instance trong Figma.

Phần khảo sát gồm 5 agent, chạy thật `?ui=studio` và chạy `node tools/studio/editability-audit.mjs`. Kết quả cho thấy
4 nguyên nhân gốc:

1. **Studio sửa code React viết tay có dữ liệu động.**
   - Có 17.628 props được viết trên component Zen; chỉ 66% là literal, tức là sửa được.
   - Số props bị khoá: bound vào biến/state 1.854; dữ liệu import/tính toán 1.195; `.map` 897; spread 351; điều kiện
     336; const 86.
   - Inspector hiện "Bound to {…}" cho các props này.
2. **Các cổng chặn hoạt động im lặng.** Chỉ sửa được khi có đủ: dev server, localhost, role Admin và file
   example/template.
   - Role được lưu trong localStorage: đã chuyển sang Viewer một lần thì lần sau mở lại vẫn read-only.
   - Thêm/xoá/kéo/wrap/Assets bị ẩn hoặc bị từ chối trong playground và trong code dùng chung (55/107 example import
     helper).
   - Bản production không có `data-zen-src`.
3. **Tính năng xây dở qua nhiều session.**
   - Chưa có: Layout phase 2–7, Effects, CornerRadius, ConstraintLayer.
   - Property groups và data slots mới có cho TopNavigation; slots có 13 component; Detach có 9 type.
4. **Không có test E2E cho UI Studio.** QA chạy UI classic (`navigator.webdriver`), selftest chỉ test hàm thuần. Vì
   vậy lỗi UI không ai phát hiện.

Lỗi thật đã xác nhận trong code:
- **Hiển thị và bàn phím:**
  - Zoom menu mở ra ngoài màn hình: `.studio-chrome-portal` là hộp 0×0, `studio.css:53`.
  - Delete không chạy khi focus đang ở Inspector: `StudioApp.tsx:338`.
  - ⌘D trong ô text mở hộp thoại bookmark của trình duyệt.
- **Lệnh và menu:**
  - Mixed properties bị server từ chối ngoài file example.
  - "Detach component" hiện cho mọi component rồi tự disable.
  - Context menu không mở trên frame hoặc canvas trống; khi chọn nhiều layer chỉ còn Wrap.
  - Quick actions Duplicate/Remove bỏ qua multi-select.
  - Move up/down làm mất selection.
- **Dữ liệu và canvas:**
  - Xoá item stateful để lại `useState` thừa.
  - Frame reflow làm mất selection.
  - Tìm trong Layers không có kết quả thì panel trắng.
  - Không chọn được Dialog/SidePanel.
  - Không double-click sửa được text đến từ `.map`.

## Quyết định của user (2026-10-05)

- Builder chạy ở **cả hai nơi**: máy có repo (dev server) và bản docs đã deploy (không có server).
- Props bị khoá: **sửa tại nguồn dữ liệu + "Đặt giá trị cố định"**, kèm cảnh báo, không bao giờ chặn.
- **Sửa Studio trước** (GĐ0–1), sau đó mới làm Builder (GĐ2–5).
- Có **prototype ngay từ bản đầu**.

Các quyết định tôi tự chốt theo quy tắc sẵn có (user có thể đổi khi duyệt):
- **Phím mũi tên làm như Figma:** layer trong auto layout thì đổi thứ tự; layer floating thì nudge inset theo token.
- **Code helper dùng chung** (PlatformExamples): cho sửa, kèm cảnh báo "dùng ở N chỗ" và xác nhận, giống "Edit main
  component" của Figma. Dựa trên quy tắc "sửa tự do, rule chỉ cảnh báo".

## Kiến trúc Builder

**Một định dạng, nhiều nơi lưu.**
- Trang của người dùng là text `*.zen.tsx` viết theo **builder dialect**:
  - một default export trả về JSX tĩnh, chỉ dùng component Zen cùng `Board`/`Screen`/`Overlay`;
  - props chỉ là literal/token;
  - không có hook, `.map`, điều kiện, spread, `style` hay thẻ HTML thường;
  - prototype viết dạng `onClick={proto.navigate("pay")}`, `proto.open("confirm")`, `proto.toast({…})`,
    `proto.run(…)`.
- Nhờ vậy 100% props sửa được ngay từ cấu trúc, và file chính là code thật.

**Edit engine isomorphic.** Các op hiện có (`tools/studio/jsx-source.mjs`, `slots.mjs`, `arrange.mjs`, `items.mjs`,
`detach.mjs`) chạy được cả trên dev server lẫn trong trình duyệt, chỉ cần tách các phụ thuộc Node:
- `sha1` → `tools/studio/sha1.mjs`;
- `node:path` → `posix.mjs`;
- `fs` trong `componentModulesFrom` → `component-modules.mjs` (chỉ chạy trên Node);
- `annotate`/MagicString → `annotate.mjs`.

**Renderer không dùng eval.**
- Parse dialect bằng cùng `parseSource`, rồi `createElement` qua registry export của `@zen/design-system`.
- Gắn `data-zen-src="local:<id>.zen.tsx:L:C"` và `data-zen-name`. Cần `data-zen-name` vì bản production minify tên
  component, nên `applyOps` sẽ báo "Expected <X>", xem `jsx-source.mjs:1206`.
- Nhờ đó picker, Layers, overlay và Inspector dùng lại nguyên vẹn.

**`api.ts` định tuyến theo scheme.**
- `local:` → `builder/localApi.ts`: engine chạy trong trình duyệt cùng PageStore.
- `src/` → dev server như hiện nay.
- `history.ts` (undo bằng text patch) giữ nguyên.

**PageStore.**
- IndexedDB luôn là bản làm việc.
- Bản mirror tuỳ chọn: thư mục chọn qua File System Access (Chromium), hoặc `.zen-studio/pages/` qua dev server
  (gitignored, nằm ngoài `src/` nên tsc/QA/HMR không thấy).
- Có Export/Import `.zen.tsx`, revisions và Trash 30 ngày.

## Giai đoạn và gói việc

### GĐ0 · Lưới an toàn: Studio E2E harness (M)

- **Thư mục:** `tools/studio/e2e/`, gồm `run.mjs`, `lib/{server,studio,source,matrix}.mjs`, `scenarios/*.mjs`,
  `matrix.baseline.json`, và fixture `src/platform/examples/e2e/StudioSaveFixture.tsx`.
- **Server riêng:** tự chạy Vite qua API trên port 5190–5199, với `vite.studio.config.ts`, `studio.html` và cacheDir
  riêng. File drafts tách riêng nên "Save all" của các session khác không động tới.
- **Fixture:**
  - Nội dung test được nạp vào một example page bằng `POST /write` dạng draft, và page này không bao giờ được Save.
  - Chỉ riêng việc test Save mới ghi file fixture.
  - Trước khi chạy chụp hash; sau khi chạy khôi phục và kiểm tra lại hash.
- **Cách điều khiển:** click thật vào `[data-e2e]`; tìm control của Inspector qua `[data-prop]` và role/name. Kiểm tra
  kết quả bằng `GET /source` cùng `describeElement`, và kiểm tra DOM.
- **Báo cáo:** `.qa/studio-e2e/<stamp>.{json,md}` (ma trận works/broken). Một dòng đang works mà thành broken là
  regression, thoát với exit 1.
- **Lệnh:** `npm run studio:e2e` (dưới 3 phút) và `npm run studio:selftest`.
- **Nối vào QA:** `tools/qa/lib.mjs` nhận diện "studio"; `tools/qa/run.mjs` chạy hai bước Studio khi file Studio thay
  đổi, và bỏ lỗi "Page mapping" cho file Studio.

### GĐ1 · Studio hiện tại hoạt động đúng

**Gate · Giải thích vì sao read-only (S/M).**
- File mới: `studio/gate.ts` với `editGate()`, trả về một trong các lý do: production, no-server, not-loopback,
  viewer, fs-readonly, token.
- Mọi nơi đang kiểm tra `canEdit && writable` chuyển sang dùng `editGate()`.
- File mới: `shell/ReadOnlyChip.tsx` trên Toolbar. Chip này nêu lý do và cách sửa: Switch to Admin, link sang
  `127.0.0.1`, "Run npm run dev", hoặc Reset Studio settings.

**WP-A · Shell, canvas, bàn phím (M).** File: `StudioApp.tsx`, `studio.css`, `ZoomControls.tsx`, `LayersPanel.tsx`,
`boardLayout.ts`, `quick/commands.ts`, `Toolbar.tsx`.
- **Popover và menu:** sửa `.studio-chrome-portal` thành `position: fixed; inset: 0`. Thay đổi này sửa zoom menu và mọi
  menu/popover khác.
- **Bàn phím:**
  - Delete chạy khi focus ở control không phải ô text.
  - Chặn ⌘D trong ô text.
  - Phím mũi tên làm theo Figma.
- **Lệnh và panel:**
  - Quick actions Duplicate/Remove chạy cho multi-select qua `edit/multi.ts`.
  - Tìm trong Layers không có kết quả thì hiện EmptyState và nút Clear.
  - Frame giữ nguyên vị trí khi nội dung đổi chiều cao.
- **Lỗi từ UX audit:**
  - Focus ring đổi sang Focus/Neutral.
  - Fit-to-screen lần đầu và fit-all phải bao trọn mọi frame.
  - Toolbar ở 390px.
  - Quick actions dùng nền đục.

**WP-B · Cổng thao tác cấu trúc, Mixed properties, context menu.**
- **B1 (làm được ngay):**
  - Op `many/setProps` đổi sang chỉ cần `isAnnotatedFile`: `arrange.mjs` thêm `manySetProps`, `edit/multi.ts` cập nhật
    theo.
  - `CanvasMenu.tsx` nhận `target`:
    - node;
    - frame: zoom, chọn tất cả, Save/Discard frame;
    - canvas: paste, fit;
    - multi: Copy/Duplicate/Remove/Wrap.
  - Detach dùng `isDetachableType`, ghi chú rõ các type được hỗ trợ.
- **B2 (sau session "Add slot không hiển thị UI"):**
  - `slots/menu.ts`: hiện action ở trạng thái disabled kèm lý do, thay vì ẩn.
  - `runMove`: gọi `expectRender` như `edit/arrange.ts:43`.
  - `slots.mjs`: thêm `unusedHookRemovals` để dọn `useState` thừa.
  - Helper dùng chung: cho sửa, kèm xác nhận "dùng ở N chỗ".

**WP-C · Props bị khoá: sửa tại nguồn hoặc đặt giá trị cố định (L, làm phần server trước).**
- **File mới `tools/studio/data-source.mjs`:**
  - `propOrigin()`: chuyển từ `editability-audit.mjs:146-191`, sau đó audit import lại.
  - `mapRows()`: tận dụng `mapContext` (`detach.mjs:1531`). Hàm lần ra mảng nguồn, có thể là literal, const cùng file,
    giá trị khởi tạo của `useState`, hoặc import từ `examples/data.ts`/templates. Nếu nguồn đi qua `filter`/`sort`/call
    thì từ chối và nêu lý do.
  - `objectFieldEdits()`: tách ra từ `setFieldEdits` (`jsx-source.mjs:569`).
- **Op mới `setDataField`:**
  - Có thể ghi sang file khác; plugin tạo draft cho chính file đó.
  - `resolveFile` chấp nhận thêm `isDataFile`.
  - Undo hoạt động qua `result.file`.
- **"Đặt giá trị cố định":** dùng `setProp` hiện có, và trả thêm `unbound {from, nowUnused}`.
- **Cập nhật 2026-10-05 (quy tắc "giữ behavior", memory `zen-studio-edits-keep-behavior`):** prop gắn với state
  (`checked={on}`, `value={tab}`…) **không** bao giờ bị thay bằng literal, vì làm vậy khoá component. Thay vào đó sửa
  giá trị khởi tạo: `defaultX` nếu uncontrolled, hoặc initializer của `useState` cùng component. Phần này thuộc session
  "Nested boolean không hoạt động"; WP-C dùng lại, không làm lại. "Đặt giá trị cố định" chỉ áp dụng cho binding không
  phải state (tham số helper, giá trị tính toán, điều kiện không phụ thuộc state).
- **Phía client:**
  - `SourceAttr.origin`.
  - `PropField.tsx:451` `BoundValue` có hai dạng: một editor inline với nhãn "Từ people[2].name · data.ts · dùng ở
    N trang", hoặc nút "Đặt giá trị cố định" kèm cảnh báo.
- **C2 (sau session "Mở lại port preview"):** const dạng mảng (86 props) đi qua `items.mjs`/ObjectProperties.

**WP-D · Hoàn thiện Inspector (L, chia M theo từng phase).**
- Các phase còn thiếu theo `docs/research/studio-inspector-redesign-2026-10-03.md`:
  - ScaleField: `inspector/controls/ScaleField.tsx`;
  - `layoutModel.ts` cùng Flow/Padding qua `FieldApi.apply`;
  - Alignment v2;
  - Grid columns;
  - Appearance.
- Các phần theo `studio-position-effects-radius-spec`: `effects/EffectsSection.tsx`, `radius/CornerRadiusField.tsx`,
  và ConstraintLayer.
- Code để trong file mới; `DesignPanel.tsx` chỉ thêm dòng mount.

**WP-E · Metadata Figma cho mọi component (L, sau "Mở lại port preview").**
- `tools/figma-kit/figma-call.mjs code props`: đọc `componentPropertyDefinitions`, nested instances và slots từ file
  `9nZv4uW2LT21yuHabMTCh1`, chỉ đọc. Kết quả ghi vào `docs/figma-contracts/component-properties.json`.
- `tools/studio/figma-props-build.mjs` ghép kết quả đó với `figma-props.map.json`, rồi validate với
  `api.generated.json`. Đầu ra: `inspector/figmaProps.generated.json`.
- `propGroups.ts`, `dataSlots.ts`, `slots/registry.ts` đọc từ file generated; TopNavigation giữ vai trò override.

**WP-F · Overlay và text từ `.map` (L, sau phần server của WP-C).**
- `picker.ts` chọn được phần tử trong `.studio-portal-root`, đi ngược `HOST_PORTAL` để tìm owner.
- `SelectionLayer.tsx` vẽ outline overlay theo toạ độ màn hình.
- `LayersPanel.tsx` đặt overlay dưới owner của nó.
- `textEdit.ts:258`: double-click text từ `.map` sẽ gửi `setDataField{child}`; nếu không lần được nguồn thì đề xuất
  "Đặt text cố định".

**Thứ tự trong GĐ1:**
1. GĐ0. Baseline ghi lại các dòng đang hỏng.
2. Gate, WP-A, WP-B1 và phần server của WP-C.
3. Phần client của WP-C, rồi WP-F.
4. WP-D.
5. WP-B2, C2 và WP-E, sau khi các session đang làm Studio xong. Đó là "Add slot không hiển thị UI", "Nested boolean
   không hoạt động" và "Mở lại port preview"; tôi không đụng file của họ trước đó.

**Tiêu chí xong GĐ1:** mọi dòng trong ma trận E2E đều works. Phần còn bị khoá thì hiện lý do và có cách gỡ.

### GĐ2 · Builder pages (L). Bắt đầu sau GĐ1; viết spec ngắn rồi hỏi user trước khi làm.

**2a · Engine isomorphic.**
- File mới: `tools/studio/{posix,sha1,component-modules,annotate,engine,dialect,dialectize}.mjs` và `engine.d.mts`.
- `isSlotFile` chấp nhận `local:`.
- `packageStyle` và `typographyImportEdit` buộc dùng import `@zen/design-system` cho file local.
- `prepareCode` và `items.mjs:93` hiểu `dialect:"builder"`.
- `applyOps` từ chối edit làm hỏng dialect.
- Thêm `optimizeDeps.include: ["@babel/parser"]` vào cả hai config Vite.

**2b · PageStore** (`src/platform/studio/builder/store/`).
- Gồm `idb.ts`, `pageStore.ts` (compare-and-swap, BroadcastChannel), `revisions.ts`, `format.ts` (header
  `@zen-page {"format":1}` và chuỗi migration), `exportImport.ts`, `fsaFolder.ts`, `devFolder.ts`.
- Plugin thêm route `/pages*` với resolver riêng cho `.zen-studio/pages/`:
  - kiểm tra id bằng regex;
  - không chấp nhận symlink;
  - giới hạn 2 MB;
  - chạy `validateDialect` trước khi ghi.
- Cập nhật `.gitignore` và `server.fs.deny`.

**2c · Routing và gate.**
- `api.ts` thêm `isLocal()` và trỏ sang `builder/localApi.ts`. Một transaction có thể gồm nhiều op nhưng chỉ tạo một
  bước undo.
- `store.ts`: `canEdit = admin && (DEV || localPage)`; helper `currentPageKey()` thay khoảng 24 lời gọi `pageKey(...)`.
- `navigation.ts` đọc `?page=local:<id>`.
- `PagesPanel.tsx` có mục "My pages": New blank/starter, Duplicate, Rename, Trash, Export/Import, Link folder, hiển
  thị quota.

**2d · Renderer và board.**
- `builder/render/{registry,evalValue,jsxText,renderPage}.ts(x)`. `jsxText` làm sạch text JSX đúng cách Babel làm;
  không dùng `collapseJsxText`.
- `builder/BuilderBoard.tsx`: mỗi `<Screen>` là một frame, và overlay mở trong frame riêng với `ZenPortalProvider`.
- `types.ts` thêm frame kind `screen | overlay`.
- `picker.ts` đọc `data-zen-name` trước, và coi Board/Screen là trong suốt.

**2e · Prototype.**
- `builder/proto/runtime.tsx`: Board, Screen, Overlay và `proto`, cùng các stack cho screen và overlay.
- `Player.tsx`: chế độ Play với `?play=`, R để restart, Esc để thoát.
- `ProtoLinksLayer.tsx`: vẽ mũi tên nối.
- `inspector/PrototypePanel.tsx`: trigger lấy từ các prop `on[A-Z]`, action ghi bằng `setProp`.
- Overlay hỗ trợ: Dialog, ModalForm, SidePanel, BottomSheet. Menu dùng `trigger` có sẵn của nó. Popover cần anchor
  nên chưa hỗ trợ.

### GĐ3 · Library search và insert (M/L)

- `builder/assets/catalog.ts` lập chỉ mục:
  - component, lấy từ `api.generated.json` và PALETTE qua `toDialect`;
  - icon: `src/icons/generated/names.ts` và `aliases.ts`;
  - `platformMedia`;
  - ảnh của user, lưu blob trong IndexedDB qua `zenAsset`;
  - starters.
- `search.ts`: tìm theo prefix, trigram và alias. Alias lấy từ guidelines kèm bảng từ đồng nghĩa, ví dụ modal →
  Dialog.
- `QuickInsert.tsx` mở bằng **⇧I**; ⌘K và ⌘/ đã có chủ.
- Thumbnail render thật và lazy.
- Kéo thả vào canvas dùng `dropTargetAt` (`drag.ts`) và `insertTargetFor` (`slots/ops.ts`). Nếu đang chọn slot thì
  chèn vào slot trước.
- `scripts/build-builder-starters.mjs` làm phẳng các example thành starter.

### GĐ4 · Tuỳ chỉnh instance như Figma (L)

- `scripts/build-figma-props.mjs`: đầu vào là dữ liệu WP-E, tận dụng `figma-console-extract.js:54`.
- `figmaPropMap.ts` ánh xạ property Figma sang prop trong code.
- `propSchema.ts` `editorFor` theo đúng thứ tự và nhãn của Figma: VARIANT, BOOLEAN, TEXT, INSTANCE_SWAP (có preferred
  values).
- Nested props hiển thị inline.
- Slot có min/max/preferred.
- Sizing hug/fill/fixed theo quy tắc của Figma.
- Auto layout, Appearance và Effects chỉ dùng token.
- Reset overrides gói trong một transaction.
- Detach.

### GĐ5 · Export và handoff (M)

- `tools/studio/compile.mjs` chuyển dialect thành TSX: overlay thành `useState`, toast thành `useToast`, navigation
  thành `onNavigate`.
- Các cách xuất: Copy code, Download `.zen.tsx` (chạy với runtime) hoặc `.tsx` (đã compile).
- Route `POST /promote` ghi thành example/template trong repo, có chạy harness và tsc.
- Xuất PNG: trên dev server dùng Playwright; trên bản deploy dùng `foreignObject` (best effort).

## Cách làm và phối hợp

- **Phạm vi duyệt:** duyệt plan này nghĩa là duyệt GĐ0 và GĐ1. Mỗi GĐ2–5 sẽ có spec ngắn trong
  `docs/research/studio-builder-*-2026-10-xx.md` và hỏi lại trước khi làm (scope lock).
- **Lưu plan:** chép plan đã duyệt vào `docs/research/studio-builder-plan-2026-10-05.md`, vì các fork có thể ghi đè
  file plan chung.
- **Mỗi gói việc:**
  1. Backup file sẽ sửa vào `backups/studio-<wp>-<stamp>.tar.gz` trước lần sửa đầu tiên.
  2. Báo cho session sở hữu bằng SendMessage nếu file nằm trong vùng chung.
  3. Sửa trực tiếp vào chỗ cần sửa, không ghi đè cả file.
- **Lỗi phát hiện ngoài phạm vi** ghi vào `docs/context/BACKLOG.md`, không tự sửa và không mở session mới.
- **Khi hoàn thành mỗi gói:** cập nhật `HANDOFF.md`, `CHANGELOG.md` và session log. Studio vẫn chưa commit; chỉ commit
  thành một batch khi user yêu cầu.

## Kiểm chứng

- **Mỗi gói việc:**
  - `npm run studio:selftest`, `npm run studio:e2e` (ma trận không có regression, các dòng của gói chuyển sang works);
  - `npx tsc --noEmit -p .`;
  - `npm run qa`;
  - xem tận mắt trong `?ui=studio` ở 1512 và 390, chụp màn hình gửi user.
- **GĐ2:** chạy Playwright trên production preview không có dev server:
  - tạo trang, chèn Button, đổi level;
  - undo/redo, reload và trang vẫn còn;
  - Play: navigate/open/close/back/toast;
  - export rồi import phải giống hệt từng byte;
  - `data-zen-src` của renderer khớp `annotate()`;
  - chunk của engine không tải trên trang component; ngân sách khoảng 130 KB gzip.
- **GĐ5:** code compile ra phải qua usage-guard và tsc; example được promote phải render được trong docs classic.

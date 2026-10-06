# Studio Builder GĐ2: trang do người dùng tạo (spec, 2026-10-06)

**Trạng thái: user duyệt 2026-10-06** (Q1 thư mục riêng gitignored · Q2 `mock.items.map` · Q3 trang trắng + device ·
Q4 giao theo mốc M1→M4). **Tiến độ:** M1 xong 2026-10-06; M2 xong 2026-10-06 (E2E B-07…B-13); M3 xong 2026-10-06 (E2E B-14…B-18); M4 xong 2026-10-06 (`npm run studio:build-check` 12/12; chunk engine 135 KB gzip,
quá ngân sách 130 KB: parser thật là 77 KB chứ không phải ~100 KB, còn code engine là ~58 KB sau khi bỏ detach; chờ user
quyết ngân sách). **GĐ2 xong.** GĐ2 của `docs/research/studio-builder-plan-2026-10-05.md`. GĐ0–GĐ1 đã xong
(E2E 80/81; dòng còn hỏng ST-02 thuộc GĐ3). Spec này chốt những gì plan để ngỏ, và cú pháp mà hai spec đi cùng
(`studio-builder-export-2026-10-05.md` §3, `studio-agent-spec-2026-10-05.md` A2/A5) chờ GĐ2 quyết.

## 1. Mục tiêu và tiêu chí xong

Người dùng mở Studio (máy có repo **hoặc** bản docs build sẵn, không cần dev server), bấm **New page**, rồi:
1. thêm component Zen, sửa props, layout, text, kéo thả, undo/redo y như sửa example hôm nay;
2. đặt nhiều màn hình (Screen) cạnh nhau, nối nút sang màn khác hoặc mở Dialog, bấm **Play** để chạy thử;
3. đóng trình duyệt, mở lại thì trang vẫn còn; Export ra file `.zen.tsx`, Import lại giống hệt từng byte.

Xong khi các dòng E2E nhóm `builder` (§7) đều works, trên cả dev server lẫn bản build production.

## 2. Định dạng trang: dialect `*.zen.tsx`

Trang là một file TSX thật, chạy được với React, nhưng chỉ dùng một tập con để **mọi prop đều sửa được**:

```tsx
// @zen-page {"format":1,"title":"Checkout"}
import { Board, Overlay, Screen, proto } from "@zen/design-system/builder";
import { Button, Dialog, ListItem, List, Stack, Text } from "@zen/design-system";

export const mock = {
  items: [
    { name: "Linen shirt", price: "$48" },
    { name: "Canvas tote", price: "$22" },
  ],
};

export default function Page() {
  return (
    <Board>
      <Screen id="cart" title="Cart" device="phone">
        <Stack gap="md" padding="lg">
          <Text textStyle="Heading/3">Cart</Text>
          <List>
            {mock.items.map((item) => <ListItem key={item.name} title={item.name} trailing={item.price} />)}
          </List>
          <Button level="primary" onClick={proto.open("confirm")}>Pay</Button>
        </Stack>
      </Screen>
      <Screen id="cart" state="empty" title="Cart · empty" device="phone">…</Screen>
      <Overlay id="confirm">
        <Dialog title="Pay $70?" primaryAction={{ label: "Pay", onClick: proto.navigate("done") }} />
      </Overlay>
    </Board>
  );
}
```

Quy tắc (`tools/studio/dialect.mjs` → `validateDialect(text)` trả về danh sách lỗi có dòng/cột):
- Một `export default function`, trả về một `<Board>`; con của Board chỉ là `<Screen>` và `<Overlay>`.
- Phần tử: component export từ `@zen/design-system` và `Board/Screen/Overlay` từ `@zen/design-system/builder`. Không có
  thẻ HTML thường, `style`, `className`, spread, hook, điều kiện, biểu thức tính toán.
- Giá trị prop: literal (chuỗi, số, boolean, object/array literal), `proto.*(...)`, và trường của `mock`.
- **Danh sách:** đúng một dạng `{mock.<key>.map((item) => <X … />)}` (không filter/sort). Đây là React thật, và WP-C
  đã sửa được hàng của nó tại nguồn (`setDataField`); export map ra `v-for`/`ForEach`… như spec export §3 đề xuất.
- **Trạng thái màn hình:** nhiều `<Screen>` cùng `id`, khác `state` (`empty`, `loading`, `error`; không ghi = default);
  mỗi cái là một frame. `proto.navigate("cart")` mở state default.
- Header `// @zen-page {"format":1,…}` cho chuỗi migration sau này (`format.ts`).
- `@zen/design-system/builder` ở GĐ2 là tên mà renderer tự phân giải (runtime `builder/proto/runtime.tsx`); gói con
  thật cho app bên ngoài đi cùng export ở GĐ5.

## 3. Kiến trúc

```
Pages panel ─ My pages ─▶ PageStore ──(text)──▶ renderPage ──▶ BuilderBoard (mỗi Screen/Overlay = 1 frame)
     │                      │  IndexedDB (luôn có)                     │ data-zen-src="local:<id>.zen.tsx:L:C"
     │                      │  + thư mục dev server / thư mục đã link  │ data-zen-name="Button"
     ▼                      ▼                                          ▼
 api.ts: file "local:*" ──▶ builder/localApi.ts ──▶ engine (tools/studio/*.mjs chạy trong trình duyệt) ──▶ text mới
 file "src/*"  ──────────▶ dev server như hôm nay
```

**2a · Engine chạy trong trình duyệt.** Các op hiện có (`jsx-source`, `slots`, `arrange`, `items`, `detach`,
`data-source`, khoảng 8.600 dòng) đã gần như thuần; chỉ tách phần chỉ chạy được trên Node:
- `node:crypto` sha1 → `tools/studio/sha1.mjs` (thuần JS, cùng kết quả; selftest so với node:crypto);
- `node:path` → `tools/studio/posix.mjs` (dirname/join/normalize/relative);
- `fs` trong `componentModulesFrom` (slots.mjs) → `component-modules.mjs` chỉ cho Node; trình duyệt dùng bảng sinh sẵn
  `builder/componentModules.generated.json` (thêm vào bước build, có `--check`);
- `annotate` + `magic-string` → `annotate.mjs` chỉ cho Node.
- `@babel/parser` thành devDependency trực tiếp (hiện chỉ có qua Vite). Engine nằm trong một chunk lazy, chỉ tải khi mở
  trang local; ngân sách ≤ 130 KB gzip (riêng parser ~100 KB).
- File local: `isSlotFile` nhận `local:`; import mới luôn trỏ `@zen/design-system`; sau mỗi op chạy `validateDialect`,
  op làm hỏng dialect bị từ chối kèm lý do.

**2b · Renderer + board.** `builder/render/renderPage.tsx` parse text bằng cùng `parseSource`, tạo element qua bảng
export của `src/index.ts`, **không eval**. Mỗi element nhận `data-zen-src` và `data-zen-name` (tên component bị minify
ở bản build, picker đọc `data-zen-name` trước). Nhờ vậy Select, Layers, Inspector, Slots, Assets, kéo thả và mọi E2E của
GĐ1 dùng lại nguyên. `BuilderBoard` đăng ký mỗi Screen/Overlay là một frame (`screen:<id>[:state]`, `overlay:<id>`),
rộng theo `device` (phone 390 · tablet 768 · desktop 1440; phone luôn Comfortable + Mobile như PlatformPhone).

**2c · PageStore + "My pages".** `builder/store/`: `idb.ts`, `pageStore.ts` (compare-and-swap theo hash,
BroadcastChannel giữa các tab), `revisions.ts` (50 bản gần nhất/trang), Trash 30 ngày, `exportImport.ts`,
`navigator.storage.persist()`. Nơi lưu thứ hai:
- trên dev server: thư mục trong repo (xem câu hỏi Q1), qua route mới `/__zen-studio/pages*` (token như `/write`,
  kiểm id bằng regex, không symlink, ≤ 2 MB, `validateDialect` trước khi ghi);
- trên bản build: **Link folder…** (File System Access, Chromium) hoặc chỉ Export/Import.
Pages panel có mục **My pages** đầu danh sách: New page (chọn device), Duplicate, Rename, Move to Trash, Export, Import,
dung lượng đã dùng. URL `?page=local:<id>`. Cổng sửa: `canEdit = Admin && (dev server || trang local)`; ReadOnlyChip
giải thích như hôm nay.

**2d · Prototype + Play.** `proto.navigate(id)`, `proto.open(id)`, `proto.close()`, `proto.back()`,
`proto.toast({…})`, `proto.link(url)`. Inspector có tab **Prototype**: với element đang chọn, liệt kê trigger `on*`
của nó (onClick, onSelect…), chọn hành động + đích (danh sách Screen/Overlay), ghi bằng `setProp` expression. Canvas vẽ
mũi tên từ element tới frame đích khi tab Prototype mở (`ProtoLinksLayer`). **Play** (phím P, `?play=<id>`): toàn
màn hình, chạy màn đầu tiên, chuyển màn bằng fade (tắt khi reduced motion), Esc thoát, R chạy lại. Ở chế độ Select các
handler không chạy (như hôm nay); công cụ Interact chạy chúng ngay trên canvas.

## 4. Không làm ở GĐ2 (để sau, đã có chỗ trong plan)

- Tìm và chèn từ library có thumbnail, starters từ templates (GĐ3; GĐ2 dùng Assets và slot picker hiện có).
- Instance panel kiểu Figma đầy đủ (GĐ4); export code đa ngôn ngữ, Promote vào repo, xuất PNG (GĐ5).
- Zen Agent tạo trang (A2) — GĐ2 chỉ chừa sẵn `pageStore.create(id, text)` có `validateDialect` cho nó.
- Sửa cùng lúc nhiều người (realtime). Mỗi máy/trình duyệt có bản riêng; chia sẻ bằng Export/Import hoặc thư mục repo.

## 5. Thứ tự giao (mỗi mốc chạy `npm run qa` + E2E, cập nhật HANDOFF/CHANGELOG, báo user)

| Mốc | Nội dung | Cỡ | Người dùng thấy |
| --- | --- | --- | --- |
| M1 | 2a engine + 2b renderer/board, store tạm IndexedDB | L | New page → thêm/sửa/kéo thả/undo trên trang local |
| M2 | 2c PageStore đầy đủ + My pages + thư mục dev server / Link folder | M | Danh sách trang, Trash, Export/Import, thư mục |
| M3 | 2d Prototype + Play | L | Nối màn, Dialog, Play |
| M4 | Kiểm bản build production (không dev server) + ngân sách chunk | S | Studio trên bản build sửa được trang local |

## 6. File và quyền sở hữu

Mới: `tools/studio/{sha1,posix,component-modules,annotate,dialect}.mjs` (+ selftest), `src/platform/studio/builder/**`.
Sửa có phạm vi nhỏ (báo session khác trước): `jsx-source.mjs`/`slots.mjs` (import shim, `local:`), `api.ts` (định tuyến),
`store.ts`/`gate.ts` (cổng local), `select/picker.ts` (`data-zen-name`, Board/Screen trong suốt), `shell/PagesPanel.tsx`,
`shell/navigation.ts`, `inspector/Inspector.tsx` (tab Prototype), `StudioApp.tsx` (mount), `vite-plugin-zen-studio.mjs`
(route `/pages*`), `.gitignore` nếu chọn thư mục riêng tư.

## 7. Kiểm chứng

- Selftest: sha1 = node:crypto; cùng op chạy engine bản trình duyệt và bản Node cho text giống hệt (bộ ca của
  `tools/studio/selftest.mjs`); `validateDialect` (ca đúng/sai); renderer: `data-zen-src` khớp `annotate()` trên cùng text.
- E2E nhóm `builder` trên server E2E: tạo trang, chèn Button, đổi level, undo/redo, reload vẫn còn, thêm Screen, nối
  `proto.navigate`, Play qua 2 màn và mở/đóng Dialog, Export → Import giống từng byte, Trash → khôi phục.
- Playwright trên `vite build` + preview (không plugin, không dev server): cùng luồng tạo/sửa/reload/Play; chunk engine
  không tải trên trang component; ngân sách gzip.

## 8. Rủi ro

- **Parser trong trình duyệt nặng** (~100 KB gzip): chỉ tải khi mở trang local.
- **Dialect quá chặt** khiến designer bí: danh sách + state (§2) đã gỡ hai chỗ hay gặp nhất; GĐ5 Promote ra code thật.
- **IndexedDB bị trình duyệt xoá** khi thiếu dung lượng: `storage.persist()`, nhắc Export, thư mục mirror.
- **Hai nơi lưu lệch nhau** (IndexedDB và thư mục): trên dev server thư mục là bản gốc, IndexedDB chỉ là cache; bản build
  không có thư mục trừ khi Link folder (khi đó thư mục là bản gốc).

## 9. Câu hỏi cho user

1. **Trang trên dev server lưu ở đâu?** (a) `.zen-studio/pages/` gitignored — riêng từng máy (đề xuất); (b) thư mục
   commit vào repo, ví dụ `src/pages/` — chia sẻ qua git, nhưng phải qua QA như code.
2. **Cú pháp danh sách:** `{mock.items.map((item) => …)}` — React thật, sửa hàng đã chạy (đề xuất); hay một component
   `<Repeat data="items">` riêng.
3. **Trang mới bắt đầu từ:** chỉ trang trắng chọn device (đề xuất cho GĐ2; starters từ template ở GĐ3); hay thêm luôn
   "Copy example thành trang" (cần bộ chuyển example → dialect, thêm cỡ M).
4. **Giao theo mốc** M1 → M2 → M3 → M4, báo sau mỗi mốc (đề xuất); hay làm hết rồi giao một lần.

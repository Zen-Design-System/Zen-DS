# Zen Studio MCP: AI thiết kế trực tiếp trên canvas (nghiên cứu, 2026-10-15)

**Trạng thái: M0 đã merge (#72, 2026-10-15); M1 đã làm (2026-10-16, user: "làm M1 đi", nhánh
`zen/feat/studio-mcp-m1-20261016`), xem §9.** Các mốc sau cần user duyệt riêng (Scope lock, `AGENTS.md`). Tài liệu này
cập nhật mục A4 ("MCP bridge") của `docs/research/studio-agent-spec-2026-10-05.md`: spec đó viết trước khi trang tự tạo
chuyển vào trình duyệt (GĐ2) và có ID cố định (lõi tài liệu M2/M3), nên cách nối ở đó không còn tới được canvas.

Yêu cầu (user, 2026-10-15): "Nghiên cứu trước tính năng kết nối MCP vào Studio để Claude hoặc AI khác connect vào design
trực tiếp trên canvas. Nghiên cứu chứ chưa làm ngay."

## 0. Tóm tắt

- **Ý tưởng:** Studio tự là một MCP server. Claude Code, Claude Desktop, Cursor, Codex, Gemini CLI… thêm một dòng cấu
  hình là đọc được canvas (trang, frame, layer đang chọn, ảnh chụp) và sửa nó. Người xem thay đổi hiện ra ngay, ⌘Z một
  bước cho mỗi lệnh của AI, Save vẫn là việc của người.
- **Điểm mấu chốt:** lệnh của AI phải **chạy trong tab Studio đang mở**, không chạy trên server. Trang tự tạo sống trong
  trình duyệt (IndexedDB, ID layer, lịch sử undo, engine sửa); server chỉ có bản mirror, không có ID và không báo lại cho
  tab. Đây là cách Figma (plugin), Penpot và "Talk to Figma" làm (§2).
- **Đường nối đề xuất:** MCP Streamable HTTP gắn vào dev server Vite (`/__zen-studio/mcp`), chuyển lệnh tới tab qua
  WebSocket HMR mà Vite đã mở sẵn tới mọi tab (`server.ws` ↔ `import.meta.hot`). Không thêm cổng, không thêm dependency
  (`@modelcontextprotocol/sdk` 1.30.1 đã là devDependency). Tab gọi `applyEdit` như khi người sửa trong Inspector.
- **Bộ tool (§5):** 6 tool đọc (trạng thái, cây layer gọn, một node, ảnh, code, danh sách trang), 11 tool ghi (thêm JSX
  theo phương ngữ trang, sửa props, thay, di chuyển, nhân bản, xoá, bọc/bỏ auto layout, lô nhiều lệnh = một bước undo,
  tạo trang/frame), 3 tool view (chọn, zoom tới, mở trang). Kèm 4 tool tri thức của MCP `zen-ds` (component, icon,
  token, `check_usage`) để một kết nối là đủ.
- **Giao thức:** bản MCP hiện hành 2026-07-28 đã stateless (bỏ session); `tab` đi như một handle trong tham số tool, hợp
  với thiết kế. Endpoint trả lời cả bản 2025-11-25 mà nhiều client còn dùng.
- **Lộ trình:** M0 spike 1–2 ngày (4 tool, Claude Code đổi một Button trên trang tự tạo, ⌘Z đúng một bước) → M1 bộ ghi
  đầy đủ + E2E không gọi API → M2 trang code (example/template, vào draft) + nút "Connect AI" → M3 bản deploy (relay
  cục bộ hoặc remote MCP), spec riêng.
- Zen Agent nhúng (spec 2026-10-05, A0–A3) về sau chỉ là **một client nữa** của cùng MCP này, nên làm MCP trước là lời.

## 1. Studio hôm nay: MCP phải nối vào đâu

| Phần | Sự thật trong code | Hệ quả cho MCP |
| --- | --- | --- |
| Hai loại trang | Trang tự tạo `local:<id>.zen.tsx` sửa bằng engine trong trình duyệt (`builder/localApi.ts`, `builder/engine.ts` → `tools/studio/browser-engine.mjs`). Trang code (example, template, playground) sửa qua dev server `POST /__zen-studio/edit` vào draft (`tools/studio/README.md` §2, §4) | Một tool phải phục vụ được cả hai; `api.ts` đã chọn đường theo tên file, nên đi qua `api.ts` là đủ |
| Nơi lưu trang tự tạo | IndexedDB là bản làm việc; trên dev server `.zen-studio/pages/` là nguồn chuẩn (`tools/studio/pages-folder.mjs`); bản build: chỉ trình duyệt hoặc thư mục liên kết qua File System Access (`builder/store/mirrors.ts`) | Server ghi thẳng file thì tab **không biết**: `syncMirror` chỉ chạy khi kết nối và khi bấm "Sync with the folder" (`pageStore.ts`), không có watcher |
| ID layer | Trang tự tạo có ID cố định cho mỗi element (`tools/studio/doc.mjs`, `data-zen-id`, canvas đánh dấu `file:@<id>`, `select/srcIds.ts`). Tài liệu có ID nằm cạnh text trong IndexedDB (`PageRecord.doc`), mất khi trang sang trình duyệt khác | AI nên trỏ layer bằng ID, không bằng `file:line:col` (dòng dịch sau mỗi lần sửa). ID chỉ có trong tab |
| Một cửa sửa | `api.ts applyEdit(request, label)`: hàng đợi `enqueue`, lịch sử undo (`studioStore.undo`, một bản ghi = một patch của một file), `emitWrite` (selection theo element), thanh trạng thái | Lệnh AI đi qua đây là có ngay ⌘Z, selection không mất, hàng đợi chung với người (không ghi chồng) |
| Bộ lệnh | `setProp`, `removeProp`, `setField`, `setText`, `setTextStyle`, `wrap`/`unwrap`, `insertChild`, `moveTo`, `removeElement`, `duplicateElement`, `replaceElement`, `pasteCode`, `many`, `insertItem`…, `detach`, `setDataField`; frame: `addFrame` (`builder/proto/addFrame.ts`), `x`/`y`/`width`/`height` (`builder/frameEdit.ts`) | Tool MCP chỉ bọc lệnh có sẵn; mọi câu từ chối (cloning.json, phương ngữ, docs chrome) đã có lý do bằng chữ |
| Kiểm tra trang | `validateDialect` (`tools/studio/dialect.mjs`) trước mỗi lần ghi trang tự tạo; Save của trang code chạy style-guard + usage-guard | AI không phá được trang: lệnh sai bị từ chối kèm lý do |
| Ảnh chụp | `builder/export/screenshot.ts drawPng`: vẽ frame thành PNG ngay trong trình duyệt (foreignObject) | Tool `get_screenshot` không cần Playwright |
| Quyền | `gate.ts editGate`: trang tự tạo chỉ cần vai Admin, ở mọi host kể cả bản build; trang code cần dev server, loopback, Admin, token của `/ping` | Tool ghi tôn trọng đúng gate này; Viewer chỉ đọc |
| Kênh tới tab | Plugin Vite chưa dùng `server.ws`. Vite 8.3.0 có `server.ws` (gửi sự kiện custom tới từng client) và `import.meta.hot.send/on` phía tab | Kênh relay có sẵn, không cần WebSocket riêng trong dev |
| MCP có sẵn | `mcp/server.mjs` (`zen-ds`): stdio, không dependency, protocol tới `2025-11-25`; tool tri thức: `get_setup`, `list_components`, `get_component`, `search_icons`, `get_tokens`, `list_templates`, `get_template`, `map_figma_component`, `check_usage` | Dùng lại hàm của nó cho phần tri thức; Studio MCP là server mới cho phần canvas |

## 2. Các công cụ khác làm thế nào

Tra cứu ngày 2026-10-15 (nguồn ở §12, [n]). "Chưa kiểm" = không tìm được nguồn chính thức.

| Công cụ | Server ở đâu, tới canvas bằng gì | Kiểu tool | Ghi chú đáng học |
| --- | --- | --- | --- |
| Figma desktop | HTTP trong app desktop, `127.0.0.1:3845/mcp` [1] | Chỉ đọc: `get_design_context`, `get_metadata`, `get_screenshot`, `get_variable_defs` | Trỏ nội dung bằng selection hiện tại hoặc link [1] |
| Figma remote | `mcp.figma.com/mcp`, OAuth; `use_figma` chạy JS của Plugin API trên file (≤ 50 000 ký tự) [2][4] | **Một tool chạy code** + skill bắt buộc `/figma-use` | Agent tự chụp để sửa lỗi; trả lời tối đa 20 KB; khuyên đọc trước, đi từng bước nhỏ [2][3]. Repo này đã gặp: `use_figma` không phải runtime của plugin (memory "use_figma ≠ plugin runtime") |
| Talk to Figma | MCP stdio ↔ relay WebSocket `:3055` ↔ plugin Figma, hai bên `join_channel` [6] | ~44 tool nhỏ (`get_selection`, `set_fill_color`…) | Không có xác thực; hướng dẫn WSL bảo bind `0.0.0.0` [6]: ví dụ cần tránh |
| **Penpot** (chính thức) | Streamable HTTP `localhost:4401/mcp`; plugin trong tab trình duyệt nối ngược qua WebSocket `:4402`; lệnh hết hạn sau 120 s [7] | 5 tool: `execute_code` (JS Plugin API), `high_level_overview`, `penpot_api_info`, `export_shape`, `import_image` [8] | Gần nhất với Zen: **tab là runtime**. Chỉ một tab là tab MCP; tab ngủ thì mất kết nối; Chromium Private Network Access có thể chặn trang tới localhost [7][8] |
| Pencil | Server cục bộ đi kèm app/extension [9] (có trong phiên này) | `get_editor_state` (file, selection), `batch_get`, `batch_design` (mini-script insert/copy/update/replace/move/delete, ≤ 25 lệnh một lần), `get_screenshot`, `snapshot_layout` [9] | **Lô lệnh có cấu trúc**, chụp sau mỗi bước |
| tldraw agent kit | Agent chạy trong app [11] | Action schema (zod) có `_type` | Gửi model: ảnh + shape rút gọn + selection + thao tác gần đây của người; áp lệnh trong lúc stream; **làm sạch lệnh vì canvas đã đổi kể từ lúc model nhìn** [11] |
| tldraw / Excalidraw MCP App | Server trả về **cả canvas tương tác** dạng MCP App trong khung chat [10][12] | 3 tool tạo/sửa/xoá (tldraw) | Canvas sống trong chat, không cần mở app |
| Excalidraw (cộng đồng) | MCP stdio + server canvas Express/WebSocket `127.0.0.1:3000` [13] | 26 tool, có `batch_create_elements`, `describe_scene` | Chụp headless; snapshot có tên [13] |
| Webflow | Remote + OAuth; tool Designer cần "MCP Bridge App" mở trong Designer, giữ kết nối với phiên thiết kế [14] | `get_selected_element`, `select_element`, `get_element_snapshot` | Cùng mẫu "tab/extension là runtime" |
| Paper | App desktop; `paper mcp` qua stdio; endpoint cũ `127.0.0.1:29979/mcp` khi một file đang mở [15] | Chưa kiểm | Chọn frame trước khi ra lệnh [15] |
| Canva, Miro, Builder Fusion | Remote, OAuth [17][18][19] | Ít tool, thô (`read_design`/`edit_design`; Miro DSL `diagram_create`) | Không sửa canvas đang mở |

Ba mẫu lặp lại:

1. **MCP cục bộ + WebSocket vào tab/plugin đang mở** (Penpot, Talk to Figma, Webflow, Excalidraw cộng đồng). Đây là
   mẫu §3 B. Zen có lợi thế: dev server Vite đã có sẵn WebSocket tới tab, nên không cần cổng thứ hai như Penpot.
2. **Server có runtime riêng**, không cần tab (Figma `use_figma`, Canva, Miro). Zen không có runtime như vậy cho trang
   tự tạo (nó nằm trong trình duyệt), nên không theo được.
3. **MCP App là chính canvas** (tldraw, Excalidraw). Ý tưởng cho sau này (§9 M3).

Kiểu tool: chạy code (`use_figma`, `execute_code`), lô lệnh có cấu trúc (`batch_design`), hoặc vài tool thô. Zen chọn
giữa: **JSX theo phương ngữ trang** (thứ model viết giỏi nhất, giống code nhưng là dữ liệu được kiểm, không chạy JS) cho
phần dựng mới, và **lệnh có cấu trúc** cho chỉnh sửa nhỏ. Mọi công cụ trên đều có tool chụp ảnh.

## 3. Ba cách đặt MCP

| | A. Server tự sửa (A4 cũ) | **B. Tab sửa, server chuyển lệnh** (đề xuất) | C. Ghi file, tab theo dõi |
| --- | --- | --- | --- |
| Cách chạy | Tool gọi hàm của plugin (`/edit`, `pages-folder`) | MCP endpoint trong dev server; lệnh chuyển tới tab qua WebSocket HMR; tab chạy `applyEdit` và trả kết quả | AI sửa `.zen-studio/pages/*.zen.tsx` bằng Edit/Write; tab nghe thay đổi và nạp lại |
| Thấy ngay trên canvas | Trang code: có (HMR). Trang tự tạo: không (không watcher) | Có, như người sửa | Có, sau khi thêm watcher |
| ⌘Z một bước, selection giữ | Không (lịch sử undo ở tab) | Có | Một bước "đổi từ ngoài" cho cả file; ID có thể mất |
| ID layer cố định | Không | Có | Không (text không mang ID) |
| Biết đang chọn gì, chụp ảnh | Cần tab đẩy lên; ảnh cần Playwright | Có (tab trả lời) | Không |
| Chạy khi không mở tab | Có | Không: tool trả lỗi "mở Studio" | Có |
| Bản deploy (không repo) | Không | Được, khi thay kênh HMR bằng relay (§9 M3) | Không |
| Rủi ro | Hai bản sự thật (IndexedDB và file) giẫm nhau | Tab reload giữa chừng; nhiều tab | AI viết JSX tự do, lách hết bộ kiểm tra cấu trúc |

C vẫn có ích như **đường phụ** cho Claude Code đang làm việc trong repo (sửa file trang hàng loạt), nhưng chỉ cần một
watcher nhỏ báo tab đồng bộ lại, không phải tính năng MCP. B là đường chính.

## 4. Kiến trúc đề xuất (B)

```
AI client (Claude Code, Desktop, Cursor…)      Dev server (Vite plugin, Node)                    Tab Studio (trình duyệt)
  │ MCP Streamable HTTP + Bearer token          │                                                  │
  ├─ POST /__zen-studio/mcp ───────────────────▶│ McpServer (@modelcontextprotocol/sdk)            │
  │   tools/call set_props {id, props}          │  ├ tool tri thức: gọi thẳng (dùng lại zen-ds)    │
  │                                             │  └ tool canvas: relay ── server.ws "zen-mcp:call" ▶│ mcp/runtime.ts
  │                                             │                                                  │  ├ gate (Admin? AI được phép?)
  │                                             │                                                  │  ├ ID → loc (srcIds / locsOf)
  │                                             │                                                  │  ├ applyEdit(request, "AI · …")
  │                                             │◀───────── import.meta.hot.send "zen-mcp:result" ─┤  └ kết quả + node đã đổi
  │◀── kết quả (JSON gọn, ảnh PNG khi xin) ─────┤                                                  │
  │                                             │◀── "zen-mcp:hello/state" (trang, selection, focus)┤
```

### 4.1 Server: `tools/studio/mcp/` (Node, chỉ dev)

| File | Việc |
| --- | --- |
| `tools.mjs` | Định nghĩa tool một lần (tên, mô tả, input schema, annotations `readOnlyHint`/`destructiveHint`), không phụ thuộc kênh. Zen Agent (A0) dùng lại |
| `server.mjs` | Endpoint Streamable HTTP, mount trong `configureServer` của plugin, sau các guard sẵn có. Chọn SDK ở M0: v1 `@modelcontextprotocol/sdk` (đã có 1.30.1; `StreamableHTTPServerTransport.handleRequest(req, res, body)`, chế độ stateless `sessionIdGenerator: undefined`, bản 2025-11-25 mọi client nói được) hoặc v2 `@modelcontextprotocol/server` + `/node` (2026-07-28, `createMcpHandler` + `toNodeHandler`, có sẵn `localhostHostValidation`/`localhostOriginValidation`) [37][38]. Đề xuất v1 cho M0, chuyển v2 khi client đã sang |
| `relay.mjs` | Bảng tab (`hello`, `state`, `bye`), chọn tab đích, gửi `zen-mcp:call { id, tool, args }` tới đúng client (`server.ws.on(event, (data, client) => …)` cho `client.send`), chờ `zen-mcp:result` với hạn (mặc định 20 s), huỷ khi tab đóng |
| `token.mjs` | Token MCP bền theo repo (`node_modules/.cache/zen-studio/mcp-token`), khác token của `/ping` (đổi mỗi lần khởi động) để cấu hình client không phải sửa lại |
| `mcp.selftest.mjs` | Không mạng: client của SDK nói chuyện với server, một tab giả trả lời; guard; hạn chờ; nhiều tab |

### 4.2 Tab: `src/platform/studio/mcp/`

| File | Việc |
| --- | --- |
| `runtime.ts` | Nhận `zen-mcp:call`, chạy tool, trả `zen-mcp:result`. Chỉ nạp khi `import.meta.hot` có (dev) |
| `tree.ts` | Cây layer gọn của một frame/node: `id`, tên layer, component, props đã viết, text, số con; cắt theo `depth` và giới hạn ký tự (như `MAX_TEXT` của `zen-ds`) |
| `AiChip.tsx` | Chip trong chrome: "AI connected · Claude Code", "Stop" / "Resume" (từ chối mọi lệnh đang chờ và lệnh sau); hiện câu lệnh kết nối để copy |
| `highlight.ts` | Nháy viền layer AI vừa đổi (token motion, tắt khi reduced motion) và ghi "AI · <tóm tắt>" lên thanh trạng thái |

Sửa nhỏ ở file dùng chung (báo session sở hữu trước): plugin mount route + relay; `StudioApp.tsx` nạp `runtime.ts`;
`history.ts`/`api.ts` thêm gộp nhiều lệnh trên **một file** thành một bản ghi undo (lô của AI; hiện mỗi bản ghi là một
patch).

### 4.3 Giao thức tab ↔ server (sự kiện HMR custom)

| Sự kiện | Hướng | Nội dung |
| --- | --- | --- |
| `zen-mcp:hello` | tab → server | `{ tab, page, localPage, role, stopped, focused, studioVersion }` khi mở và sau reload |
| `zen-mcp:state` | tab → server | Cùng các trường + `selection` (ID, tên), mỗi khi đổi trang, chọn, focus (gộp 200 ms) |
| `zen-mcp:call` | server → một tab | `{ id, tool, args }` |
| `zen-mcp:result` | tab → server | `{ id, ok, content }` hoặc `{ id, ok: false, code, error }` (nguyên văn câu từ chối của engine) |
| `zen-mcp:bye` | tab → server | Khi đóng tab (`pagehide`); server cũng bỏ tab khi socket đóng |

Tab đích: tab được `focused` gần nhất chưa bấm Stop; tool nhận thêm `tab` khi người mở nhiều tab. Không có tab: lỗi có
hướng dẫn ("Open the Studio at http://127.0.0.1:5180/studio.html").

## 5. Bộ tool `zen-studio`

Nguyên tắc (xem §2 và tài liệu viết tool cho agent ở §12): ít tool mà rộng; trỏ layer bằng ID; câu trả lời gọn và có
nghĩa (tên layer, component, không phải AST); lỗi nói lý do và cách khác; mặc định không trả ảnh (tốn token), có tool
riêng để xin.

**Đọc** (`readOnlyHint: true`):

| Tool | Trả về |
| --- | --- |
| `get_studio_state` | Trang đang mở, danh sách frame (ID, tên, thiết bị, x/y), selection, preview modes, gate (sửa được không, vì sao), các tab |
| `get_tree { node?, depth? }` | Cây layer gọn của frame/node (mặc định: frame chứa selection) |
| `get_node { id }` | Props đang viết, property Figma theo nhóm (`componentGroupsOf`), slot, override lồng, lệnh nào được (wrap ok?) |
| `get_screenshot { node?, scale? }` | PNG (image content) của frame/node qua `drawPng` |
| `get_code { node? }` | TSX của trang/frame (`printPage` / `elementText`), cho bàn giao |
| `list_pages` | Trang tự tạo (ID, tên, thư mục) và trang component/example |

**Ghi** (mỗi lời gọi = một bước undo "AI · …"; trả node đã đổi và ID mới):

| Tool | Lệnh engine |
| --- | --- |
| `insert { parent, index?, jsx }` | `insertChild` / `pasteCode`: một đoạn JSX theo phương ngữ trang (component Zen, Layout, token), import tự thêm, `validateDialect` trước |
| `update { id, props?, text?, textStyle?, overrides? }` | `setProp`, `removeProp` (giá trị `null`), `setField`, `setText`, `setTextStyle`, override lồng như Inspector ghi |
| `replace { id, jsx }` | `replaceElement` |
| `move { id, parent, index? }` · `duplicate { id }` · `delete { id }` | `moveTo` · `duplicateElement` · `removeElement` |
| `wrap { ids, layout? }` · `unwrap { id }` | `wrap` (`with` khi nhiều layer) · `unwrap` |
| `batch { ops: [...] }` | Nhiều lệnh trên cùng trang, **một** bước undo; dừng ở lệnh đầu tiên bị từ chối và hoàn lại cả lô |
| `create_page { title, device?, jsx? }` | `newPageText` + PageStore (`putPage`) |
| `add_frame { kind, device?, title?, x?, y?, width?, height?, jsx? }` | `addFrame` + `frameEdit` |

**View** (không đổi tài liệu): `select { ids }`, `focus { id }` (zoom tới, `zoomToSelection`), `open_page { id }`.

**Tri thức** (chạy trên server, không cần tab): `get_component`, `search_icons`, `get_tokens`, `check_usage` lấy từ
`mcp/server.mjs` (tách hàm ra module dùng chung), để AI tra component/token trước khi viết JSX mà không cần thêm MCP thứ hai.

**Không có:** `save`, `discard`, `publish`, đẩy lên Figma, ghi file ngoài trang. Trang code vẫn vào draft; Save là người.

**Prompt MCP** (tuỳ chọn, M2): `design-screen` (luật Zen ngắn: component trước, token, Content Hierarchy, mobile) để
client có lệnh `/zen-studio:design-screen`.

**Resource** (tuỳ chọn): `studio://selection` báo khi selection đổi. Cách báo khác nhau giữa hai bản giao thức
(`resources/subscribe` ở 2025-11-25, `subscriptions/listen` ở 2026-07-28 [20]) và client hỗ trợ không đều, nên đường
chính vẫn là tool `get_studio_state`.

**Mô tả tool cho model** (bài học từ [41] và tldraw [11]): mỗi tool ghi trả về cây gọn của phần vừa đổi, để model không
phải đọc lại cả trang; lỗi nói lý do và việc nên làm ("layer n3f… không còn: gọi get_tree"); `get_tree` có
`format: "concise" | "detailed"`; số đo làm tròn; thứ tự tool cố định (cache prompt [20]).

## 6. An toàn và quyền

- **Chỉ loopback, kiểm Origin và Host:** endpoint MCP chỉ nhận Host loopback (chống DNS rebinding) và từ chối mọi request
  có `Origin` (client MCP không gửi Origin; một trang web lạ trong trình duyệt thì có). Đặc tả bắt buộc server kiểm
  `Origin` và trả 403, nên bind 127.0.0.1 và xác thực mọi kết nối [22][40]. SDK v1 trước 1.24.0 không bật chống DNS
  rebinding mặc định (CVE-2025-66414) [39]; repo đang ở 1.30.1. WebSocket HMR của Vite đòi token từ 6.0.9 (`legacy.skipWebSocketTokenCheck`
  tắt mặc định, repo không bật; `node_modules/vite/dist/node/index.d.ts`), nên trang lạ không nối được vào kênh tab.
- **Token Bearer bền** (`token.mjs`): hiện trong chip "Connect AI" kèm câu lệnh copy; "Đổi token" thu hồi mọi client.
- **Người cầm công tắc** (quyết định 4, §11: AI sửa thẳng, không duyệt từng lệnh): cấu hình client bằng token là lần
  đồng ý; từ đó lệnh ghi chạy ngay, mỗi lệnh một bước ⌘Z. Chip "AI connected" có **Stop** (từ chối lệnh đang chờ và
  các lệnh sau cho tới khi bật lại), áp cho cả tab. Viewer không bao giờ nhận lệnh ghi. Ai muốn duyệt thì phía client vẫn
  làm được: Claude Code hỏi trước mỗi tool trừ khi người cho phép hẳn [28]; annotation (`destructiveHint`) chỉ là gợi ý,
  client không bắt buộc tin [23].
- **Phạm vi nhỏ:** tool chỉ sửa canvas, qua lệnh có kiểm tra; không đọc/ghi file tuỳ ý, không shell. Nội dung trang trả
  cho AI có thể chứa chữ do người khác viết (prompt injection): rủi ro giới hạn ở canvas, và mọi thứ có ⌘Z, draft, Save.
- **Người và AI cùng sửa:** chung hàng đợi `enqueue` của `api.ts`; trỏ bằng ID nên lệnh của người xen giữa không làm
  lệch; ID không còn → lỗi `not-found` để AI đọc lại cây.
- **Giới hạn:** câu trả lời ≤ 40 000 ký tự (như `zen-ds`), ảnh tối đa 2× và kích thước frame, hạn chờ 20 s mỗi lệnh,
  log mỗi lời gọi vào `node_modules/.cache/zen-studio/mcp-<port>.log` (giờ, client, tool, ok).

## 7. Client kết nối thế nào

| Client | Nối vào dev server cục bộ | Ảnh trong kết quả | MCP App | Ghi chú |
| --- | --- | --- | --- | --- |
| **Claude Code** [28] | `claude mcp add --transport http zen-studio http://127.0.0.1:5180/__zen-studio/mcp --header "Authorization: Bearer <token>"` (cũng có `headersHelper`) | Có (PNG/JPEG/GIF/WebP) | Không | Trần 25k token mỗi kết quả; `_meta` `anthropic/requiresUserInteraction` bắt duyệt mỗi lần gọi, `anthropic/maxResultSizeChars` nới trần cho một tool. Nói được 2026-07-28 và lùi về bản cũ |
| Cursor [31] | HTTP + header trong `mcp.json` | Có | Có | |
| Codex CLI [32] | HTTP, `http_headers` hoặc `bearer_token_env_var` | Chưa kiểm | Chưa kiểm | |
| Gemini CLI [34] | `httpUrl` + header | Có | — | Google đã thay bằng Antigravity CLI cho tài khoản miễn phí từ 2026-06-18 [34] |
| VS Code Copilot [35] | HTTP + header (có `inputs` để hỏi token) | Chưa kiểm | Có (cờ thử nghiệm) | |
| Windsurf / Devin Desktop [36] | HTTP + header | Chưa kiểm | Chưa kiểm | Tối đa 100 tool |
| **Claude Desktop** [29][44] | Connector remote đi qua cloud của Anthropic, **không tới được localhost**; local chỉ qua stdio (config hoặc `.mcpb`) | Chưa kiểm | Có | Cần một shim stdio → HTTP nhỏ (§9 M2) |
| claude.ai web, ChatGPT [29][30][33] | Chỉ HTTPS công khai + OAuth; MCP tunnel của Claude chỉ Enterprise và không tới localhost [30] | — | Có | Chỉ làm được ở M3 (relay công khai) |

Hệ quả: M0–M1 nhắm Claude Code (đường HTTP + header, không cần gì thêm); Cursor, Codex, Gemini, VS Code cùng cấu hình
đó. Claude Desktop cần shim stdio; claude.ai web cần hạ tầng công khai.

Phiên bản giao thức: bản hiện hành **2026-07-28** bỏ handshake `initialize` và `Mcp-Session-Id`, mọi request tự mang
phiên bản trong `_meta`, trạng thái giữa các lời gọi đi bằng "handle" do server cấp trong tham số tool [20][23]. Hợp với
thiết kế này: `tab` là một handle như vậy. Nhiều client có thể vẫn nói 2025-11-25 (chưa kiểm từng client), nên server
phải trả lời cả hai (§10).

## 8. Quan hệ với spec Zen Agent (2026-10-05)

| Spec cũ | Sau nghiên cứu này |
| --- | --- |
| A4 gọi hàm của plugin trên server | Lệnh chạy trong tab (§3 B); server chỉ chuyển lệnh và phục vụ tri thức |
| Tool trỏ `file` + `loc` + `hash` | Trỏ bằng ID layer (trang tự tạo); trang code dùng `file:line:col` + hash như cũ, `runtime.ts` đổi ra |
| `studio_context` cần `POST /agent/context` | Tab đẩy `zen-mcp:state` qua HMR |
| Câu hỏi 7.4: A4 trước hay sau A1? | Đề xuất **trước**: Agent SDK nối được vào MCP HTTP, nên AgentPanel sau này dùng chính endpoint này |
| A5 bản deploy | Như M3 ở đây: cùng `runtime.ts`, thay kênh HMR bằng relay |
| A0–A3 (chat nhúng) | User vẫn muốn (§11). Làm sau M1: AgentPanel dùng `AiChatThread`/`AiChatField`, Agent SDK chạy trong dev server và nối vào chính endpoint MCP này, nên mọi tool, Stop và ⌘Z giống hệt khi Claude Code nối từ ngoài |

## 9. Lộ trình (mỗi mốc user duyệt riêng)

### M0 · Spike (S–M, 1–2 ngày, worktree riêng)

- Server: `server.mjs`, `relay.mjs`, `token.mjs` tối thiểu; tool `get_studio_state`, `get_tree`, `update`,
  `get_screenshot`. Tab: `runtime.ts` + chip tối thiểu.
- Xong khi (trên 5180, một trang tự tạo, Claude Code `claude mcp add --transport http …`):
  1. "Đổi nút chính sang secondary và thêm icon check" → canvas đổi ngay, ⌘Z hoàn tác đúng một bước.
  2. "Nút đang chọn là gì?" → AI đọc đúng selection.
  3. AI tự chụp frame và mô tả đúng.
  4. Bấm Stop → lệnh ghi bị từ chối có lý do; Resume → chạy lại; đóng tab → lỗi "mở Studio".
  5. Một request có `Origin` lạ hoặc thiếu token → 403.
- Checks: `node tools/studio/mcp/mcp.selftest.mjs`, `npm run studio:selftest`, `npm run studio:e2e` (không regression),
  `npx tsc --noEmit -p .`.

**Đã làm (2026-10-15):**

- Server `tools/studio/mcp/`: `tools.mjs` (4 tool), `server.mjs` (SDK v1 1.30.1, stateless, JSON; guard Host loopback,
  không Origin, Bearer), `relay.mjs`, `token.mjs`, `connect.mjs` (`npm run studio:mcp`). Plugin chỉ thêm import và một
  middleware. Tab `src/platform/studio/mcp/`: `runtime.ts`, `tools.ts`, `tree.ts`, `AiChip.tsx` + `mcp.css`;
  `StudioApp.tsx` thêm hai dòng. `htmlExport.tsx`: phần vẽ PNG của handoff tách thành `drawFrame`, thêm `framePicture`
  cho `get_screenshot` (handoff vẽ như cũ).
- Đo trên tab thật (Playwright + client SDK thật, server riêng của worktree): 14/14 — trạng thái, cây layer, selection
  đúng layer vừa click, `update` đổi canvas ngay (5–90 ms), một bước undo "AI · Button level, startIcon", ⌘Z hoàn tác,
  ảnh 1440×900 (34 KB, ~450 ms), Stop từ chối / Resume chạy lại, ID sai và tab đóng có lỗi rõ; không lỗi console.
  `mcp.selftest.mjs` 13/13 (guard 403/405/400, tool error, cắt chữ, chỉ cho text + PNG).
- Chưa thử với Claude Code thật (cần user chạy `claude mcp add`, §7).

### M1 · Bộ ghi đầy đủ (M–L, 3–4 ngày)

- Mọi tool ở §5 trừ trang code; `batch` một bước undo; highlight; log.
- E2E không gọi API: client SDK trong `tools/studio/e2e` phát kịch bản tool call cố định (fixture JSON) vào tab thật;
  thêm dòng `AI-*` vào ma trận `studio:e2e` (`MC-*` đã là nhóm Main component).
- Bài thử thật: Claude Code dựng một dashboard trên trang trống chỉ bằng tool (đếm lệnh bị từ chối, số bước, thời gian),
  so với bài dashboard 27 bước của người (`studio-doc-engine-plan-2026-10-10.md` "Phần còn lại").

**Đã làm (2026-10-16):**

- **Lỗi user gặp sau M0** ("claude chạy xong phải refresh lại mới thấy"): log MCP cho thấy Claude chỉ đọc qua MCP rồi sửa
  thẳng `.zen-studio/pages/*.zen.tsx` bằng file tool (M0 chưa có tool dựng trang), mà tab chỉ đồng bộ thư mục khi kết
  nối hoặc bấm "Sync with the folder". Sửa ở chủ: plugin `fs.watch` thư mục trang → sự kiện HMR
  `zen-studio:pages-changed` → `builder/store/mirrors.ts` đồng bộ ngay (≈ 200–300 ms, không reload) và dựng lại ID layer
  cho trang đang mở. Server instructions dặn AI không sửa file trang.
- **Tool:** 20 tool (§5): thêm `list_pages`, `get_node`, `get_code`, `insert`, `replace`, `move`, `duplicate`, `delete`,
  `wrap`, `unwrap`, `batch` (`as` / `"$tên"`, một bước undo, lỗi giữa chừng thì hoàn tác cả lô), `create_page`,
  `add_frame`, `select`, `focus`, `open_page`. `api.ts`: `squashEdits` (gộp N bản ghi liên tiếp của một file),
  `revertEdits`. Hạn chờ relay 60 s.
- **Chưa làm trong M1:** highlight layer AI vừa đổi; bài dashboard thật bằng Claude Code (cần user chạy).
- **Kiểm:** `mcp.selftest` 13/13; E2E nhóm `mcp` AI-01…06 (đọc, update + ⌘Z, insert + từ chối thẻ HTML, batch + hoàn tác,
  sửa file realtime, Stop) 6/6 ba lần, đã vào baseline; bài thử trên tab thật 22/22.

### M2 · Trang code + kết nối dễ (M, 2–3 ngày)

- Tool ghi trên trang example/template (vào draft, như Inspector); tool tri thức dùng chung với `zen-ds`.
- Hộp "Connect AI": câu lệnh copy sẵn cho từng client (§7); prompt `design-screen`.
- Shim stdio → HTTP nhỏ, không dependency, trong `mcp/` (cùng kiểu `mcp/server.mjs`) cho Claude Desktop, vì connector
  remote của Desktop không tới được localhost [29]. Shim này cũng là nền của M3 (a).
- Tài liệu: `tools/studio/README.md` mục MCP; một dòng `AGENTS.consumer.md`.

### M3 · Bản deploy, không repo (spec riêng)

- Cùng `runtime.ts`; kênh khác: (a) `npx zen-studio-mcp` chạy cục bộ (stdio cho AI, WebSocket localhost cho tab), như
  Talk to Figma / Penpot. Trang deploy (HTTPS công khai) gọi tới localhost sẽ vướng Private/Local Network Access của
  Chromium (Penpot gặp đúng chỗ này [7]): cần lời nhắc cấp quyền trong trình duyệt, phải thử trước. (b) Remote MCP có
  OAuth (CIMD [24]) qua một relay công khai nhỏ, cho claude.ai web và ChatGPT. (c) Ý tưởng: **Zen Studio dạng MCP App**
  (`ui://`, như tldraw/Excalidraw [10][12][26]): một frame xem trước sống ngay trong khung chat của Claude Desktop,
  claude.ai, Cursor, VS Code; Claude Code không hiện MCP App [27][28]. Viết spec khi tới.

## 10. Rủi ro

- **Tab reload giữa lệnh** (HMR reload sau khi trang code đổi): kết quả trả trước khi file đổi trên đĩa (draft), nên
  thường không mất; nếu mất, server trả `retryable` và tab gửi lại `hello`.
- **Nhiều session Claude cùng sửa repo** (thực tế ở đây): relay gắn theo cổng dev server; mỗi worktree có server và token
  riêng.
- **Tốn token:** cây layer của dashboard có thể lớn → `depth`, cắt chữ, chỉ props đã viết; ảnh chỉ khi xin.
- **AI viết JSX không hợp phương ngữ:** `validateDialect` từ chối với dòng lỗi; mô tả tool nêu phương ngữ và trỏ tới
  `get_component`.
- **Giao thức đang chuyển:** 2026-07-28 bỏ session và handshake, đổi cách báo thay đổi, bỏ nối lại SSE (stream đứt thì
  client gửi lại request mới) [20]. Endpoint phải trả lời cả 2025-11-25 và 2026-07-28; lệnh ghi nên **idempotent theo
  `requestId`** (tab nhớ kết quả vài phút) để một lần gửi lại không thêm layer hai lần.
- **Tab ngủ hoặc bị đóng băng** (Penpot gặp [8]): tab nền vẫn nhận tin WebSocket, nhưng Chromium có thể đóng băng tab
  ẩn lâu. Lỗi nói rõ "tab Studio đang ẩn"; chip nhắc giữ tab mở.
- **SDK MCP đổi nhanh:** v1 mới nhất 1.32.1, v2 tách gói (`@modelcontextprotocol/server` 2.3.1) [37]; ghim phiên bản,
  kiểm lại tên API khi làm.

## 11. Quyết định của user (2026-10-15)

1. Client đầu tiên: **Claude Code**.
2. **Chỉ dev server trên máy** trước; bản deploy để M3.
3. M0–M1 **chỉ trang tự tạo**; trang example/template ở M2.
4. **AI sửa thẳng**: thấy ngay trên canvas, ⌘Z, nút Stop; không duyệt từng lệnh trong Studio.
5. **Vẫn muốn Zen Agent nhúng** (chat trong Studio): làm sau M1, dùng chính MCP này (§8).

Chưa duyệt bắt đầu M0: user nói "nghiên cứu chứ chưa làm ngay"; M0 bắt đầu khi user bảo.

Câu hỏi còn mở cho Zen Agent (hỏi khi tới A0, từ `studio-agent-spec-2026-10-05.md` §7): agent đặt ở đâu (tab Inspector,
cột riêng, panel nổi); model mặc định, trần chi phí và key của ai (Agent SDK cần `ANTHROPIC_API_KEY`, không dùng đăng nhập
claude.ai được); Code mode có giữ Stop gate `npm run qa` không. Câu 7.3 (chụp frame) đã có lời giải: `drawPng` trong
trình duyệt; câu 7.4 (A4 trước hay sau A1) đã chốt: MCP trước.

## 12. Nguồn

Tra cứu 2026-10-15. Đã tự đọc lại [20] (bản 2026-07-28: bỏ session, handshake, nối lại SSE). Các nguồn khác do agent tra
cứu đọc; mục ghi "chưa kiểm" ở trên là chỗ không có nguồn chính thức.

- [1] https://developers.figma.com/docs/figma-mcp-server/local-server-installation
- [2] https://developers.figma.com/docs/figma-mcp-server/write-to-canvas
- [3] https://www.figma.com/blog/the-figma-canvas-is-now-open-to-agents/ (2026-03-24)
- [4] Schema tool `use_figma` do mcp.figma.com trả về (đọc 2026-10-15)
- [6] https://github.com/grab/cursor-talk-to-figma-mcp
- [7] https://github.com/penpot/penpot/tree/develop/mcp
- [8] https://help.penpot.app/mcp/
- [9] https://docs.pencil.dev/for-developers/pencil-cli; mô tả tool của MCP `pencil` trong phiên này
- [10] https://tldraw.dev/blog/tldraw-mcp-app
- [11] https://tldraw.dev/starter-kits/agent; https://tldraw.dev/docs/ai
- [12] https://github.com/excalidraw/excalidraw-mcp
- [13] https://github.com/yctimlin/mcp_excalidraw
- [14] https://developers.webflow.com/mcp/tools/designer-tools.md; https://developers.webflow.com/mcp/reference/how-it-works
- [15] https://paper.design/docs/mcp
- [17] https://www.builder.io/c/docs/fusion-mcp-server
- [18] https://developers.miro.com/docs/miro-mcp-prompts
- [19] https://www.canva.com/en/help/mcp-agent-setup/
- [20] https://modelcontextprotocol.io/specification/latest/changelog (bản 2026-07-28)
- [22] https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http
- [23] https://modelcontextprotocol.io/specification/2026-07-28/server/tools
- [24] https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization
- [26] https://modelcontextprotocol.io/docs/extensions/apps
- [27] https://modelcontextprotocol.io/extensions/client-matrix
- [28] https://code.claude.com/docs/en/mcp
- [29] https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp
- [30] https://www.claude.com/docs/connectors/mcp-tunnels/overview
- [31] https://cursor.com/docs/context/mcp
- [32] https://learn.chatgpt.com/docs/extend/mcp?surface=cli
- [33] https://developers.openai.com/apps-sdk/deploy/connect-chatgpt
- [34] https://geminicli.com/docs/tools/mcp-server/
- [35] https://code.visualstudio.com/docs/copilot/customization/mcp-servers
- [36] https://docs.devin.ai/desktop/cascade/mcp
- [37] npm registry (`npm view`), 2026-10-15
- [38] https://ts.sdk.modelcontextprotocol.io/v2/
- [39] https://github.com/modelcontextprotocol/typescript-sdk/security/advisories/GHSA-w48q-cv73-mx4w
- [40] https://modelcontextprotocol.io/specification/2026-07-28/basic/security_best_practices
- [41] https://www.anthropic.com/engineering/writing-tools-for-agents
- [42] https://www.anthropic.com/engineering/code-execution-with-mcp
- [44] https://claude.com/docs/connectors/building/mcpb

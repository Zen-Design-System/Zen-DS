# Zen Agent trong Studio: vibe design bằng chat nhúng (plan, 2026-10-18)

**Trạng thái: V-1 xong (§7); V0 đã làm 2026-10-18 (user: "làm V0 đi", §8), nhánh `zen/feat/studio-agent-v0-20261018`; V1 trở đi chưa làm.** Mỗi mốc V0–V4 cần user duyệt riêng
(Scope lock, `AGENTS.md`). Plan này thay phần kiến trúc của `studio-agent-spec-2026-10-05.md` (Agent SDK) và là bước
"Zen Agent nhúng" của `studio-mcp-canvas-2026-10-15.md` §8, §11.5.

Yêu cầu (user, 2026-10-18): "Plan trước cho mình việc mình muốn studio có agent vào chạy để vibe. Plan chứ khoan làm."

## 1. Quyết định của user (2026-10-18)

1. **Key và tiền:** cần panel nhúng; chạy bằng API key hoặc `ant auth login`, tính tiền theo token. (Agent nhúng không
   được dùng đăng nhập claude.ai; vibe bằng gói đăng ký vẫn đi qua Claude Code bên ngoài + Studio MCP như hiện nay.)
2. **Model:** mặc định `claude-opus-5-5`; có chọn model rẻ hơn (`claude-sonnet-5-5`, `claude-haiku-5-5`) cho sửa nhỏ.
3. **Chỗ đặt:** chỉ **panel nổi bên trái canvas** (cạnh Pages | Layers); không làm tab trong Inspector.
4. **Hoàn tác:** giữ ⌘Z từng bước, thêm **"Hoàn tác cả lượt"** trên mỗi lượt của agent.
5. **Kiến trúc:** Tool Runner (`@anthropic-ai/sdk`) + relay trong tiến trình, thay Agent SDK của spec cũ.
6. (Từ 2026-10-15, vẫn giữ) AI sửa thẳng, thấy ngay, Stop; không duyệt từng lệnh. Trước tiên chỉ trang tự tạo.

## 2. Dùng lại cái đã có

| Có sẵn | Dùng cho |
| --- | --- |
| Studio MCP M0+M1: `tools/studio/mcp/tools.mjs` `TOOLS` (20 tool, JSON schema), `relay.mjs` `createRelay`, tab `src/platform/studio/mcp/runtime.ts` | Bộ tool của agent, chạy trong tab như lệnh Inspector: một bước ⌘Z mỗi lệnh, `batch` một bước, từ chối có lý do |
| `api.ts` `squashEdits` / `revertEdits` | "Hoàn tác cả lượt" |
| `AiChip.tsx` (`setAiStopped`, `useAiActivity`) | Trạng thái "đang sửa" và Stop dùng chung với client ngoài |
| `src/components/AiChat` (`AiChatThread`, `AiChatBubble` streaming/thinking, `AiChatField` busy/onStop/onAttach) | UI panel |
| `tools/ai-ui/adapters/anthropic.mjs` (workspace id, fallbacks, usage) | Cách gọi SDK, đọc `anthropic-workspace-id` |
| `mcp/server.mjs` (zen-ds: `get_component`, `search_icons`, `get_tokens`, `get_template`, `check_usage`) | Tool tri thức, gọi hàm trực tiếp (không spawn stdio) |

## 3. Trải nghiệm "vibe"

1. **Panel Agent nổi bên trái canvas**, mở bằng phím tắt (chốt ở V0, không đụng phím có sẵn) hoặc bấm chip AI. Chrome
   Studio (ChromeScope, Neutral-S7, compact); chữ ngắn một dòng, lý do vào tooltip.
2. **Chip ngữ cảnh** tự gắn: layer/frame đang chọn, trang, theme của project; bấm để bỏ.
3. **Sửa thẳng, thấy ngay:** layer AI vừa đổi nháy sáng (nợ của M1); ⌘Z từng bước; "Hoàn tác cả lượt" trên mỗi lượt.
4. **Ảnh:** dán ảnh tham khảo ("làm giống thế này bằng Zen"); agent tự `get_screenshot` để soát.
5. **Biến thể (V2):** "cho 3 phương án" → 3 frame cạnh nhau; giữ một, phần còn lại xoá.
6. **Tự kiểm sau mỗi lượt:** `check_usage` + luật Zen (Brand/Accent dẫn màn hình, nội dung theo nền Solid, thang gap
   control, Card Subtle trên Canvas/Default…).
7. **Model picker** trong field (Opus 5.5 · Sonnet 5.5 · Haiku 5.5) và **chi phí mỗi lượt**; Stop dừng ngay.

## 4. Kiến trúc

```
Panel (tab Studio) ──POST /__zen-studio/agent/send {text, context, images, model}──▶ Dev server (plugin Vite, Node)
                   ◀──GET /__zen-studio/agent/events (NDJSON)───────────────────────  AgentSession
                   ──POST /agent/stop · /agent/reset──────────────────────────────▶   └ toolRunner (@anthropic-ai/sdk)
                                                                                         ├ tool canvas → relay.call(tabId, …)
Tab runtime (mcp/runtime.ts) ◀──zen-mcp:call / result (HMR)──────────────────────────────┘   (đúng tab đã gửi prompt)
                                                                                         └ tool tri thức → hàm zen-ds
```

- **Server `tools/studio/agent/`** (chỉ dev): `session.mjs` (một phiên cho mỗi tab × trang; hàng đợi, abort, lịch sử
  append-only), `models.mjs` (bảng model, effort, fallbacks), `context.mjs` (khối `<studio-context>` = dữ liệu, không phải
  lệnh), `routes.mjs` (guard như `/edit`: Host loopback, Origin = Host, token của `/ping`, vai Admin), `prompt.md`
  (system prompt Design), `agent.selftest.mjs` (không mạng, model giả). `/ping` thêm `agent: { available, reason }`.
- **Không đi qua endpoint `/__zen-studio/mcp`:** endpoint đó chặn mọi request có `Origin`. Vòng lặp gọi relay trong cùng
  tiến trình, nên agent nhúng và Claude Code bên ngoài dùng chung một bộ tool, Stop, ⌘Z. MCP connector của API không
  dùng được (gọi từ máy chủ Anthropic, không tới localhost).
- **Client `src/platform/studio/agent/`:** `AgentPanel.tsx`, `agentApi.ts`, `ContextChip.tsx`, `TurnActions.tsx`
  (hoàn tác cả lượt, chi phí), `QuestionCard.tsx` (V1). StudioApp chỉ thêm chỗ gắn panel.
- **Xác thực:** SDK tự tìm `ANTHROPIC_API_KEY` → `ANTHROPIC_AUTH_TOKEN` → profile `ant auth login`. Key không bao giờ
  tới trình duyệt, log hay audit log. Không có credential → panel nêu lý do và cách gỡ, phần còn lại của Studio chạy bình
  thường.
- **Model:** mặc định `claude-opus-5-5` (effort đặt rõ, mặc định của model là `medium`); `claude-sonnet-5-5`,
  `claude-haiku-5-5` để sửa nhỏ. Opus/Sonnet bật fallback phía server khi bị từ chối (`fallbacks: "default"`); Haiku
  không có. Đổi model giữa chat được: lịch sử giữ, cache bắt đầu lại, thinking của model cũ bị bỏ (báo bằng tooltip).
- **Cache:** `tools` + system cố định (thứ tự tool cố định, không timestamp) có `cache_control`; ngữ cảnh thay đổi đi
  trong user message sau breakpoint. Kiểm `cache_read_input_tokens` ở V0.
- **Ảnh:** kết quả `get_screenshot` thành image block trong `tool_result`; ảnh người dán thành image block của message.
- **Stop:** abort request đang chạy + từ chối lệnh kế (như `setAiStopped`); lượt dừng giữa chừng vẫn "Hoàn tác cả
  lượt" được.
- **Hoàn tác cả lượt:** tab ghi số bản ghi undo của lượt; `revertEdits` gộp và lùi. Nếu người sửa xen giữa lượt thì
  nút báo không lùi được phần đó (chốt cách xử lý ở V1).

## 5. Lộ trình (mỗi mốc user duyệt riêng)

| Mốc | Làm gì | Xong khi |
| --- | --- | --- |
| **V-1 · Đo nền** (½ ngày) | Claude Code + MCP zen-studio dựng một dashboard trên trang trống, chỉ bằng tool | Số liệu: lệnh bị từ chối, số bước, thời gian, luật Zen vi phạm, tool còn thiếu (§7) |
| **V0 · Spike** (1–2 ngày, worktree) | Server tối thiểu (session, routes, Opus 5.5, tool canvas qua relay), panel nổi tối thiểu (thread, field, stream, Stop, chip selection), `ping.agent` | (1) chọn Button → "secondary + icon check" → canvas đổi, ⌘Z đúng một bước; (2) "nút đang chọn là gì?" đúng; (3) agent tự chụp và mô tả đúng; (4) Stop dừng giữa lượt; (5) không credential → lý do rõ; `agent.selftest`, `studio:selftest`, `studio:e2e` không regression, `tsc` |
| **V1 · Vibe loop** (3–4 ngày) | Ngữ cảnh đủ (trang + project), dán ảnh, nháy layer, hoàn tác cả lượt, model picker + chi phí, QuestionCard, lịch sử chat theo trang, cache + catalog gọn, system prompt có luật Zen, `update` nhận object/array, `lint_draft` theo phương ngữ (§7) | E2E model giả (fixture → dòng `AG-*`), eval ~15 prompt (như `ai-ui:eval`: lệnh hợp lệ, luật vi phạm, thời gian, chi phí) |
| **V2 · Prompt → màn hình** (3–4 ngày) | Từ trang trống bằng template, 2–3 biến thể cạnh nhau, tự soát bằng ảnh + `check_usage` + luật Zen | Một dashboard từ một câu, audit sạch |
| **V3 · Trang code** (sau) | Cần MCP M2 (example/template vào draft); Code mode (Agent SDK) nếu user muốn | Spec riêng |
| **V4 · Bản deploy** (sau) | Cùng vòng lặp trên backend nhỏ giữ key | Spec riêng |

## 6. Chi phí (ước lượng, V0 đo thật)

Opus 5.5 $4 / $20 mỗi 1M token (cache đọc $0.20): sửa nhỏ ~$0.03–0.10, dựng cả màn hình ~$0.3–1. Sonnet 5.5 $2 / $10;
Haiku 5.5 $0.10 / $0.50 (prompt ≤ 100K).

## 7. Đo nền V-1 (2026-10-18, Claude Code + MCP zen-studio trên :5173, tab của user)

Bài: "dashboard doanh số" trên trang trống: PageHeader, 4 MetricCard, ChartCard LineChart + ChartCard BarList (2fr 1fr),
mục "Recent orders" (Heading/4 h2 + Table 5 dòng, badge trạng thái có màu).

| Đo | Kết quả |
| --- | --- |
| Lệnh Studio MCP | 13 (đọc 6, ghi 4, view 3); **ghi cả dashboard = 2 bước undo** (một `batch` 6 op + một `replace`) |
| Bị từ chối | 2, đều do ngữ cảnh chứ không do JSX: id của `create_page` hết hạn vì người đổi trang/project giữa chừng; `open_page` không thấy trang ở project khác |
| Lệnh tri thức zen-ds | 12 (`list_components` 1, `get_component` 6, `search_icons` 4, `check_usage` 1), chiếm phần lớn token: mỗi `get_component` 5–8K, LineChart và ChartCard trả cùng cả họ Chart (lặp ~6K) |
| Thời gian | ~66 s từ trang trống tới bản cuối (lần ghi 60–160 ms, ảnh ~430 ms); thêm ~1 phút vì phải hỏi user về tab |
| Lỗi JSX / phương ngữ | 0 |
| `check_usage` | 1 cảnh báo, của trang khởi đầu Studio (BottomNavigation `value` không handler, phương ngữ không viết được handler), không của agent |
| Soát bằng mắt | Thiếu "$" trên trục/tooltip/BarList ("128.4K"): `format` là hàm, phương ngữ không viết được. Badge trạng thái xám tới khi thêm `overrides` theo dòng. BarList giãn dòng rất thưa trong card cao bằng nhau (Grid stretch). Agent không nâng gap giữa các mục trang lên xl (thang Master-Layout) |

Hệ quả cho V0/V1 (làm trong mốc tương ứng, không phải backlog):

1. **Ngữ cảnh trước mỗi lượt:** agent nhúng gửi kèm trang/project đang mở; lỗi "No layer" nên nói "trang đang mở đã đổi
   sang X" khi id thuộc trang khác. Thêm project vào `get_studio_state` và cho `list_pages` / `open_page` thấy project.
2. **`update` nhận giá trị object/array** (`overrides`, `trend`, `data`, `columns`, `rows`): hiện phải `replace` cả layer
   (gửi lại cả bảng chỉ để tô badge).
3. **Tri thức gọn và cache:** catalog gọn (`docs/ai-ui/catalog.json` dạng compact) trong khối system có cache;
   `get_component` chỉ khi cần, trả đúng một thành viên của họ.
4. **Lint theo phương ngữ Studio** (`lint_draft`): `check_usage` + luật Studio, bỏ qua cảnh báo handler mà phương ngữ
   không viết được; thêm kiểm thang gap (mục trang xl) và status badge không màu.
5. Thiếu "$" trên chart và BarList giãn dòng: câu hỏi cho user/designer, ghi BACKLOG.

## 8. V0 đã làm (2026-10-18)

- **Server `tools/studio/agent/`** (README §6): `session.mjs` (phiên theo tab, Tool Runner `client.beta.messages.toolRunner`
  stream, tool canvas = `TOOLS` của MCP chạy qua `relay.call` đúng tab, tool tri thức zen-ds qua stdio, `check_page`),
  `harness.mjs`, `routes.mjs` (`GET /agent/session`, `POST /agent/send|stop|reset`, guard như `/edit`), `credentials.mjs`,
  `models.mjs`, `prompt.mjs`, `transcript.mjs`, `script.mjs`. Plugin: thêm import, tạo agent cạnh relay, dispatch `/agent/*`.
- **Tab `src/platform/studio/agent/`:** `AgentPanel.tsx` (panel nổi trái, ⌘J, chip selection bỏ được, gợi ý, các bước tool,
  dòng "Zen rules pass", chi phí · thời gian, Stop của AiChatField), `agentStore.ts` (sự kiện HMR `zen-agent:event`,
  khôi phục transcript khi mở/reload), `agent.css`. Nút ✦ cuối thanh công cụ dưới; ⌘J trong Shortcuts; chip AI ghi "Zen Agent".
- **Harness tự chạy (user hỏi "có dùng rule, harness lúc vibe không"):** sau mỗi lượt có ghi, `checkSource` chạy trên code
  trang; finding mới do lượt gây ra (so với trước lượt, bỏ qua số dòng) quay lại model tối đa 2 vòng; còn lại hiện "N Zen rule
  findings left". Hai luật nối dây (`interaction/action-without-handler`, `interaction/controlled-needs-handler`) không bắt
  sửa trên trang thiết kế (nút nối ở tab Prototype khi người muốn), `check_page` vẫn liệt kê.
- **Khác plan:** trạng thái key ở `GET /agent/session` thay vì `/ping.agent` (không đụng route chung); E2E với model giả
  (`ZEN_AGENT_SCRIPT`, SSE như API, `"$selection"` lấy id từ ngữ cảnh) làm luôn ở V0 vì 5 tiêu chí xong chạy được tự động;
  picker model để V1 (route đã nhận `model`). Effort `medium`, fallback phía server `"default"` cho Opus/Sonnet.
- **Harness bắt luật thật:** "đổi nút sang secondary" bị `button/secondary-justified` (Zen chỉ dùng Secondary khi có lý do):
  agent sẽ báo cho người thay vì lặng lẽ để vi phạm; gợi ý trong panel đổi sang "Add an icon to the selected button".
- **Kiểm:** `agent.selftest` 17/17; Studio E2E AG-01…06 6/6 ba lần (baseline thêm 6 dòng); `studio:selftest` toàn bộ;
  `tsc`; style-guard + usage-guard trên file mới; ảnh 1512 / 390 / dark, transcript về lại sau reload. Gate
  `npm run qa -- --isolated --files=…` PASS (Studio E2E 324 works · 0 broken). Gặp trên đường: D-01 hỏng cả trên main vì
  commit 4ff67077 (Card) mang theo fixture E2E dở (`save-a` level="primary"); trả về `tertiary` trong nhánh này.
- **Để V1:** ảnh chụp cũ nằm lại trong lịch sử và được gửi lại mỗi request (rẻ nhờ cache, nhưng nên dọn bằng context
  editing); thứ tự bước / chữ trong một lượt chỉ là "bước trên, chữ dưới"; chi tiết bước nằm trong tooltip.
- **Chưa thử với key thật:** cần user đặt `ANTHROPIC_API_KEY` (hoặc `ant auth login`) rồi chạy server worktree; lần đầu đo
  chi phí và thời gian thật, `cache_read_input_tokens` > 0 từ request thứ hai.

## 9. Rủi ro

- **Prompt injection** từ nội dung trang hay ảnh: Design mode không có Bash/Web/file; mọi ghi qua op có kiểm tra.
- **Agent và người cùng sửa:** chung hàng đợi `enqueue` của `api.ts`; "Hoàn tác cả lượt" phải biết bản ghi nào của AI.
- **Cây layer lớn tốn token:** `get_tree` có `depth`; ảnh chỉ khi cần.
- **Tab ẩn / reload giữa lượt:** relay trả lỗi rõ, lượt dừng, không ghi chồng.
- **Nhiều session sửa `src/platform/studio/**`:** V0 chủ yếu thêm file mới; chạm `StudioApp.tsx` và plugin bằng sửa nhỏ,
  báo session sở hữu trước.
- **SDK đổi nhanh:** ghim phiên bản `@anthropic-ai/sdk`, kiểm lại tên API Tool Runner khi làm.

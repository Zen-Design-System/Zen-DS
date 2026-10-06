# Zen Agent: Claude trong Zen Studio (spec, 2026-10-05)

**Trạng thái: spec, chưa làm gì.** Mỗi giai đoạn A0–A5 cần user duyệt riêng (Scope lock, `AGENTS.md`). Spec đi cùng
`docs/research/studio-builder-export-2026-10-05.md`; cả hai không đổi phạm vi đã duyệt của
`docs/research/studio-builder-plan-2026-10-05.md`.

## 0. Bối cảnh

User (2026-10-05) muốn nhúng một khung chat kiểu Claude Code vào Zen Studio để vibe design/vibe code. Buổi đầu chỉ
brainstorm; tài liệu này chốt hướng để chuyển giao.

Vì sao làm được với chi phí thấp: Studio đã có sẵn những phần khó nhất.

- **DOM → source**: `data-zen-src="<file>:<line>:<col>"` trên mọi JSX annotated (`tools/studio/vite-plugin-zen-studio.mjs`).
- **Engine op có cấu trúc trên AST**: `tools/studio/jsx-source.mjs` (setProp, setText, setTextStyle, wrap, unwrap…),
  `slots.mjs` (insertChild, removeElement, duplicateElement…), `arrange.mjs` (moveTo, pasteCode, many), `items.mjs`
  (insertItem…), `detach.mjs`, `data-source.mjs` (setDataField).
- **Draft + Save có harness**: `drafts.mjs`; `POST /save` chạy style-guard + usage-guard; `POST /discard`.
- **MCP `zen-ds`** (`mcp/server.mjs`): `get_setup`, `list_components`, `get_component`, `search_icons`, `get_tokens`,
  `list_templates`, `get_template`, `map_figma_component`, `check_usage`.
- **UI chat của chính Zen** (`src/components/AiChat`): `AiChatThread`, `AiChatBubble` (`streaming`, `thinking`),
  `AiChatField` (`busy`, `onStop`, `onAttach`).
- Builder plan: GĐ0 xong (`npm run studio:e2e`, ma trận 71/72 works theo HANDOFF), GĐ1 phần lớn xong.

Hệ quả: AI làm việc qua **op có cấu trúc** thay vì sửa text tự do. Mỗi thay đổi là một bước undo, op bị từ chối có lý
do rõ ràng (cloning.json, HTML nesting, docs chrome…), và không có gì xuống đĩa trước khi người bấm Save.

## 1. Quyết định đề xuất (user xác nhận khi duyệt A0)

1. **Đường tích hợp:** Claude Agent SDK TypeScript (`@anthropic-ai/claude-agent-sdk`), chạy trong process Node của dev
   server (plugin Vite). Không chạy trong trình duyệt.
2. **Tên hiển thị:** "Zen Agent · Powered by Claude". Không gọi là "Claude Code", không dùng hình ảnh giống Claude Code
   (quy định branding của Agent SDK).
3. **Xác thực:** API key (`ANTHROPIC_API_KEY`), chỉ nằm ở server. Không dùng đăng nhập claude.ai: tài liệu SDK không cho
   sản phẩm xây trên SDK dùng claude.ai login, trừ khi Anthropic duyệt trước. Bedrock/Vertex là phương án thay thế.
4. **Draft là bất biến:** mọi thay đổi của agent lên file annotated đi vào draft. Save/Discard chỉ người bấm; agent
   không có tool save/discard.
5. **Một lớp tool, hai cổng:** tool định nghĩa một lần (`tools/studio/agent/tools.mjs`); dùng in-process cho Agent SDK,
   và ở A4 qua MCP HTTP cho Claude Code/Cowork bên ngoài.

## 2. Kiến trúc

```
Trình duyệt (Studio)                     Dev server (Vite plugin, Node)                    Anthropic API
AgentPanel ──POST /agent/send─────────▶  AgentSession: query({ prompt: AsyncIterable }) ──▶ Claude
           ◀─GET /agent/events (NDJSON)─ │  options theo mode (policy.mjs)
Approval/QuestionCard ─POST /agent/answer▶│  canUseTool chờ câu trả lời ở đây
           ─POST /agent/interrupt──────▶ │
                                         ├─ MCP in-process "zen-studio" (tools.mjs)
                                         │    └─ gọi thẳng hàm của plugin (edit/write/đọc source/describe)
                                         │       trong cùng hàng đợi exclusive() → draft
                                         └─ MCP stdio "zen-ds" (node mcp/server.mjs)
```

### 2.1 Server: `tools/studio/agent/` (chỉ Node, dev-only)

| File | Việc |
| --- | --- |
| `session.mjs` | Một `AgentSession` cho mỗi `sessionKey` (tab trình duyệt × page). Hàng đợi user message làm `AsyncIterable<SDKUserMessage>` cho `query({ prompt })` (streaming input: hỗ trợ ảnh, xếp hàng, ngắt). Phát sự kiện ra stream; `resume` theo sessionId; interrupt; đổi mode. |
| `policy.mjs` | Hàm thuần: mode → options (`tools`, `allowedTools`, `disallowedTools`, `permissionMode`, `settingSources`, `hooks`, `systemPrompt`, `maxTurns`, `model`, `includePartialMessages`). Có selftest. |
| `tools.mjs` | Tool `zen-studio` (schema zod + handler) gọi vào `ctx` của plugin. Xuất `createStudioMcp(ctx)` (dùng `createSdkMcpServer` + `tool`); A4 dùng lại định nghĩa cho MCP HTTP. |
| `context.mjs` | Dựng khối ngữ cảnh cho mỗi message từ dữ liệu client gửi (page, frame, preview modes, selection) cộng `describeElement` phía server. |
| `routes.mjs` | Handler `/agent/*`; plugin mount sau các guard sẵn có. |
| `prompt-design.md` | System prompt Design mode (§5). |
| `README.md`, `agent.selftest.mjs` | Như `tools/studio/README.md`. Selftest chạy không cần mạng: policy, schema tool, routes với một `query` giả. |

Thay đổi trong `vite-plugin-zen-studio.mjs` (sửa nhỏ, có báo session sở hữu):

- Mount `routes.mjs` bằng `import()` động, chỉ khi import được SDK và có `ANTHROPIC_API_KEY`.
- Truyền `ctx` gồm các hàm mà `/edit`, `/write`, `/source`, `/element`, `/drafts` đang dùng, cùng `exclusive` và `root`
  (tên trong `ctx` do người làm A0 chốt). Tool gọi thẳng các hàm này, **không** gọi lại qua HTTP.
- `GET /ping` thêm `agent: { available: boolean, reason?: "no-sdk" | "no-key" | "disabled" }`.
- Không đổi hành vi của route nào đang có.

Phụ thuộc và key:

- `@anthropic-ai/claude-agent-sdk` là devDependency, chỉ plugin import (không vào bundle thư viện). Ghim phiên bản.
- `zod` hiện có trong `node_modules` qua dependency khác; khai báo trực tiếp nếu `tools.mjs` import nó.
- Key đọc từ env của shell chạy dev server. Nếu dùng `.env.local`, thêm `.env*.local` vào `.gitignore` trước (hiện
  `.gitignore` chưa có mục `.env`). Key không bao giờ tới trình duyệt, log hay audit log.

### 2.2 Giao thức `/__zen-studio/agent/*`

Guard giống `/edit`: Host loopback, `x-zen-studio-role: admin`, `x-zen-studio-token` (từ `/ping`), Origin = Host,
`content-type: application/json`.

| Request | Answer |
| --- | --- |
| `POST /agent/send` `{ sessionKey, text, context, images?: [{ mediaType, data }] }` | `{ ok, turnId }`; message vào hàng đợi |
| `GET /agent/events?sessionKey=` | Stream NDJSON. Client đọc bằng `fetch` + `ReadableStream` (`EventSource` không gửi được header token). Sự kiện: `text-delta`, `thinking`, `tool-start { name, summary }`, `tool-end { ok, summary, write?: { file, kind } }`, `approval { id, tool, input }`, `question { id, questions }`, `result { usage, cost }`, `error { code, message }`. |
| `POST /agent/answer` `{ sessionKey, id, decision: "allow" \| "deny", updatedInput?, message?, answers? }` | Trả lời approval hoặc AskUserQuestion đang chờ |
| `POST /agent/interrupt` `{ sessionKey }` | Dừng lượt hiện tại |
| `POST /agent/reset` `{ sessionKey }` | Bỏ session, bắt đầu chat mới |
| `POST /agent/context` `{ sessionKey?, page, frame, selection }` (A4) | Client đẩy selection mỗi khi đổi, để tool `studio_context` của client ngoài đọc được |

Session giữ trong bộ nhớ server. Map `sessionKey → sessionId` ghi vào
`node_modules/.cache/zen-studio/agent-<port>.json` (cùng cách drafts lưu theo port) để `resume` sau khi server khởi
động lại.

### 2.3 Client: `src/platform/studio/agent/`

- `AgentPanel.tsx`: tab thứ ba **Agent** trong Inspector (`inspector/Inspector.tsx`, mảng `tabs`), xem câu hỏi §7.1.
  - Dựng bằng `AiChatThread`, `AiChatBubble`, `AiChatField` (`onStop` → interrupt, `onAttach` → đính ảnh frame).
  - Chrome theo quy tắc Studio: Neutral-S7, compact, typography dashboard; CSS chỉ token, class `studio-`.
- `agentApi.ts`: send / answer / interrupt / reset + đọc stream; tự ping lại khi token cũ (như `api.ts`).
- `ContextChip.tsx`: phần tử đang chọn sẽ gửi kèm ("Button · button.tsx:84"); bấm để bỏ.
- `QuestionCard.tsx` (A1): AskUserQuestion, 1–4 câu, 2–4 lựa chọn, thêm ô "Khác".
- `ApprovalCard.tsx` (A3): tool + input; Edit hiện diff bằng `code/CodeView.tsx`; Allow / Deny / Allow có sửa.
- **Gate:** chỉ cho gửi khi `editGate()` (`gate.ts`) cho phép sửa **và** `ping.agent.available`. Nếu không, hiện lý do
  và cách gỡ giống `shell/ReadOnlyChip.tsx`.
- **Undo:** mỗi tool ghi = một bước undo của Studio, nhãn "Agent: <tóm tắt>". Client nhận `tool-end.write`, lấy
  before/after và đưa vào lịch sử hiện có (`api.ts` `emitWrite`, `history.ts` `makePatch`). Cách nối chính xác do
  người làm A0 chốt sau khi đọc `applyEdit` / `undoEdit` trong `api.ts`.
- **Selection** sau khi agent sửa: remap như khi người sửa (`rebaseLoc`).

## 3. Chế độ (policy)

| | **Design** (mặc định) | **Code** (A3) |
| --- | --- | --- |
| Built-in tools | A0: `tools: []`. Từ A1: `tools: ["AskUserQuestion"]` | Read, Glob, Grep, Edit, Write, Bash, AskUserQuestion. Không WebFetch/WebSearch mặc định |
| MCP | `zen-studio`, `zen-ds` | `zen-studio`, `zen-ds` |
| Phê duyệt | A0: `permissionMode: "dontAsk"` + `allowedTools: ["mcp__zen-studio__*", "mcp__zen-ds__*"]`. Từ A1: `"default"` + cùng `allowedTools` + `canUseTool` (chỉ AskUserQuestion tới đó; còn lại từ chối) | `"default"`, `canUseTool` → ApprovalCard |
| Ghi | Chỉ op Studio → draft | Op Studio → draft. Edit/Write file ngoài tập annotated: cần duyệt. Edit/Write file annotated: hook chặn, chỉ sang `source_edit` (draft) |
| Settings | `settingSources: []` + system prompt riêng (§5) | `settingSources: ["project"]` (CLAUDE.md → AGENTS.md, `.claude/`); không nạp `"user"` |
| Giới hạn | `maxTurns` thấp (≈ 20) | `maxTurns` cao hơn; luôn hiện chi phí lượt |

Lưu ý khi chọn mode:

- `dontAsk` từ chối cả tool cần tương tác người dùng (AskUserQuestion), nên từ A1 Design mode chuyển sang `default`.
  Vì built-in chỉ còn AskUserQuestion và MCP đã nằm trong `allowedTools`, không có prompt nào khác xuất hiện.
- Glob allow chỉ hợp lệ sau tiền tố `mcp__<server>__` cụ thể (`mcp__zen-studio__*` được; `mcp__*` bị bỏ qua).
- `settingSources` mặc định nạp mọi nguồn, nên luôn truyền rõ.

Hooks `PreToolUse` (cả hai mode):

- **Draft guard:** Edit/Write/NotebookEdit vào file mà `isAnnotatedFile` (`jsx-source.mjs`) nhận →
  `permissionDecision: "deny"`, lý do "Use mcp__zen-studio__source_edit: canvas files change as drafts".
- **Read guard:** Read một file đang có draft → deny, lý do "This file has an unsaved Studio draft; read it with
  mcp__zen-studio__read_source". Read built-in đọc đĩa nên sẽ lệch draft.
- **Audit log:** mọi tool call ghi một dòng vào `node_modules/.cache/zen-studio/agent-<port>.log` (giờ, mode, tool,
  file, ok).

`Zen-CodeBase/.claude/settings.json` có hook PostToolUse (lint mỗi lần sửa) và **Stop gate** (chặn kết thúc lượt cho
tới khi `npm run qa` qua). Design mode không được nạp chúng. Ở Code mode: cwd của agent là `Zen-DS`; đọc message `init`
để biết setting/hook nào thật sự được nạp, rồi hỏi user có giữ Stop gate không (§7.5).

## 4. Tool `zen-studio`

Tên đầy đủ `mcp__zen-studio__<tool>`. Server đặt `alwaysLoad: true` (bộ tool nhỏ, cần schema ngay, không qua tool
search). Tool ghi nhận `file`, `loc`, `name`, `hash` (lấy từ `get_element` hoặc `read_source`), chạy trong
`exclusive()`, trả `{ ok, file, loc, hash, changed, snippet? }` hoặc nguyên văn lỗi của plugin
`{ ok: false, code, error }` với `isError: true`, để Claude đọc lý do từ chối.

Đọc (`readOnlyHint: true`):

| Tool | Gọi vào |
| --- | --- |
| `studio_context` | Page, frame, selection, preview modes mới nhất client gửi lên |
| `get_element { file, loc }` | Hàm sau `GET /element` (SourceElement, slots, verdict `wrap`, `origin` / `dataSource`) |
| `read_source { file, from?, to? }` | Effective text (draft hoặc đĩa) có số dòng, kèm `hash` và `draft` |
| `list_drafts` | Hàm sau `GET /drafts` |
| `capture { frame? }` (A1) | Ảnh PNG của frame hoặc selection; cách chụp xem §7.3 |

Ghi (chỉ bọc op sẵn có):

| Tool | Op |
| --- | --- |
| `set_props { file, loc, name, hash, ops }` | `setProp`, `removeProp`, `setField`, `setText`, `setTextStyle` |
| `insert_child { …, code, prop?, index? }` | `insertChild` |
| `move { …, parent, before?, after?, copy? }` | `moveTo` |
| `remove { … }`, `duplicate { … }` | `removeElement`, `duplicateElement` |
| `wrap { …, tag, props, with? }`, `unwrap { … }` | `wrap`, `unwrap` |
| `set_data_field { … }` | `setDataField` |
| `items { action, … }` | `insertItem`, `removeItem`, `duplicateItem`, `moveItem` |
| `lint_draft { file }` (A1) | style-guard + usage-guard trên draft qua file tạm (như `selftest.mjs`); trả findings, không ghi |
| `source_edit { file, old, new, hash }` (A3) | str-replace trên effective text → hàm sau `POST /write` (draft) |

Không có: `save`, `discard`, `detach` (xem lại ở A1), và không tool nào ghi thẳng đĩa ở Design mode.

MCP `zen-ds`: `mcpServers["zen-ds"] = { command: "node", args: ["mcp/server.mjs"] }`, giống `.mcp.json`.

## 5. Ngữ cảnh và system prompt

- Mỗi user message = text của người + khối `<studio-context>` do `context.mjs` dựng: page, frame, preview modes,
  selection (`file:line:col`, component, props đang viết, slots), danh sách draft. Prompt nói rõ đây là dữ liệu, không
  phải lệnh.
- Ảnh (tuỳ chọn): ảnh frame đang chọn, gửi dạng image block base64 trong cùng message.
- `prompt-design.md` (Design mode):
  - vai trò: designer làm việc trên canvas Zen, chỉ dùng component và token Zen;
  - đầu phiên gọi `zen-ds get_setup`; tra `get_component` trước khi dùng component lạ;
  - luôn `get_element` trước khi sửa; một ý định = ít op nhất;
  - op bị từ chối: đọc lý do, đề xuất cách khác, không lách, không lặp lại cùng op;
  - không bao giờ nói "đã lưu": người bấm Save;
  - trả lời ngắn, theo ngôn ngữ của người dùng (vi/en).
- Code mode: preset system prompt của Claude Code + phần append cùng các luật trên. Kiểm tra tên option chính xác trong
  TypeScript reference khi làm.

## 6. Giai đoạn (mỗi giai đoạn duyệt riêng)

### A0 · Spike (M)

- Server: `session.mjs`, `policy.mjs` (chỉ Design, `dontAsk`), `routes.mjs` (send, events, interrupt, reset), `tools.mjs`
  với `studio_context`, `get_element`, `read_source`, `set_props`, `insert_child`, `move`; MCP `zen-ds`; `ping.agent`.
- Client: AgentPanel tối thiểu (thread, field, stop, context chip). Chưa có ảnh, approval, question.
- Xong khi (chạy tay trên 5180, `studio.html?page=button` và một example page):
  1. Chọn một Button → "đổi sang secondary, thêm icon check" → draft đổi, canvas cập nhật, ⌘Z hoàn tác đúng một bước.
  2. Chọn một Stack trong example → "thêm Badge 'New' ở đầu" → chèn đúng chỗ, import tự thêm.
  3. "Đưa nút Cancel lên trước Save" → `moveTo` đúng.
  4. Yêu cầu bị từ chối (wrap con của Tooltip) → agent nêu lý do của server, không lặp vô hạn.
  5. Save chạy harness như cũ; trước Save không file nào trên đĩa đổi (so hash).
  6. Không có key → panel hiện lý do; phần còn lại của Studio chạy bình thường.
- Checks: `node tools/studio/agent/agent.selftest.mjs`, `npm run studio:selftest`, `npm run studio:e2e` (không
  regression), `npx tsc --noEmit -p .`.

### A1 · Design mode đầy đủ (L)

- Mọi tool ghi ở §4, `capture`, `lint_draft`.
- Chuyển Design sang `default` + `canUseTool`; QuestionCard. Tuỳ chọn `toolConfig.askUserQuestion.previewFormat:
  "html"` để agent đưa bản xem trước layout trong câu hỏi.
- Undo đầy đủ; resume session theo page; hiện usage/chi phí từ result message; audit log.
- **E2E không gọi API:** một `query` giả phát lại kịch bản tool call cố định (fixture JSON) qua cùng `tools.mjs` và
  routes. Thêm các dòng `AG-*` vào ma trận `studio:e2e`.

### A2 · Prompt → trang (L; cần builder GĐ2)

- Tool `create_page { id, code }` ghi dialect `.zen.tsx` qua PageStore, chạy `validateDialect` trước.
- Biến thể: agent tạo 2–3 trang/frame đặt cạnh nhau; người chọn một, phần còn lại vào Trash.
- Tự kiểm sau mỗi lượt ghi: `lint_draft` + `zen-ds check_usage`. Tuỳ chọn subagent review dựa trên
  `Zen-CodeBase/.claude/agents/zen-ux-reviewer.md`.

### A3 · Code mode (L)

- Policy Code, `canUseTool` + ApprovalCard (diff), `source_edit`, draft guard + read guard, quyết định Stop gate.
- Xong khi: agent sửa một component trong `src/components/` với duyệt từng bước; file annotated chỉ đổi qua draft;
  `npm run qa` vẫn chạy như quy trình hiện tại.

### A4 · MCP bridge cho Claude Code / Cowork bên ngoài (M; có thể làm trước A1)

- Route `/__zen-studio/mcp` (MCP Streamable HTTP; `@modelcontextprotocol/sdk` đã là devDependency) dùng lại định nghĩa
  trong `tools.mjs`; header token như `/edit`.
- Đăng ký trong Claude Code bằng `claude mcp add` kiểu HTTP có header token (kiểm tra cú pháp khi làm). Dùng gói đăng
  ký Claude hiện có, không cần API key.
- `studio_context` đọc selection mà client đẩy qua `POST /agent/context`.

### A5 · Bản deploy, không có repo (để sau; cần engine isomorphic GĐ2)

Agent SDK cần Node và filesystem nên không chạy trong trình duyệt. Hai hướng: backend nhỏ giữ key, gọi Messages API với
tool = op dialect chạy ở trình duyệt; hoặc Claude Managed Agents (đang beta). Viết spec riêng khi tới.

## 7. Câu hỏi cho user (trả lời khi duyệt A0)

1. Agent đặt ở đâu: tab thứ ba trong Inspector (đề xuất cho A0), cột riêng bên phải, hay panel nổi?
2. Model mặc định, và trần chi phí mỗi ngày (key của ai)?
3. Chụp frame cho agent: client chụp DOM (thêm dependency) hay server dùng Playwright (đã có, chậm hơn, dùng chung với
   xuất PNG của GĐ5)?
4. Làm A4 (MCP bridge, dùng subscription hiện có) trước hay sau A1?
5. Code mode có giữ Stop gate `npm run qa` của `Zen-CodeBase/.claude/settings.json` không?

## 8. Rủi ro

- **Chi phí** theo token; ảnh làm tăng nhanh. Ảnh là tuỳ chọn; có `maxTurns`; luôn hiện chi phí.
- **Prompt injection** từ nội dung file hoặc MCP: Design mode không có Bash/Web; mọi ghi qua op có kiểm tra; Save là
  người.
- **Agent và người sửa cùng file:** chung hàng đợi `exclusive()` + hash → 409 `stale`; tool trả lỗi để agent đọc lại.
- **Nhiều session khác đang sửa `src/platform/studio/**`:** A0 chủ yếu thêm file mới; chỉ chạm `Inspector.tsx` (thêm
  tab) và plugin (mount routes, `ping`) bằng sửa nhỏ, báo session sở hữu trước (AGENTS.md "Working alongside other
  sessions"). Backup trước lần sửa đầu như builder plan.
- **SDK đổi nhanh:** ghim phiên bản; tên option trong spec đã đối chiếu tài liệu ngày 2026-10-05 (§9), kiểm lại khi làm.

## 9. Tài liệu đã đối chiếu (2026-10-05)

- Agent SDK overview (auth, branding): https://code.claude.com/docs/en/agent-sdk/overview
- TypeScript reference (`query`, `settingSources` mặc định nạp mọi nguồn, `includePartialMessages`,
  `createSdkMcpServer`, `tool`): https://code.claude.com/docs/en/agent-sdk/typescript
- Permissions (thứ tự đánh giá; mode `default`, `dontAsk`, `acceptEdits`, `bypassPermissions`, `plan`, `auto`):
  https://code.claude.com/docs/en/agent-sdk/permissions
- Hooks (`PreToolUse`: `permissionDecision` allow/deny/ask/defer, `updatedInput`):
  https://code.claude.com/docs/en/agent-sdk/hooks
- `canUseTool` (`{ behavior: "allow", updatedInput }` / `{ behavior: "deny", message }`) và AskUserQuestion:
  https://code.claude.com/docs/en/agent-sdk/user-input
- Streaming input và ảnh: https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode
- Custom tools (`mcp__<server>__<tool>`, `tools: []`, `alwaysLoad`, `isError`):
  https://code.claude.com/docs/en/agent-sdk/custom-tools

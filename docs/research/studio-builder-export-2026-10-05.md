# Studio Builder: xuất code đa ngôn ngữ và handoff (spec, 2026-10-05)

**Trạng thái: spec, chưa làm gì.** Đây là phần bổ sung cho GĐ5 của `docs/research/studio-builder-plan-2026-10-05.md`
và gộp với `docs/research/code-languages-plan-2026-10-03.md`. Mỗi giai đoạn E0–E5 cần user duyệt riêng (Scope lock).
Đi cùng `docs/research/studio-agent-spec-2026-10-05.md`.

## 0. Bối cảnh

User (2026-10-05): Studio thành builder; design trực tiếp trên React/Vue/bất kỳ ngôn ngữ nào; sửa và kéo thả component,
dùng token và style từ library, rồi xuất code hoặc handoff code đó cho dev.

Đã có hai plan mô tả cùng một thứ từ hai phía:

- **Builder plan:** GĐ2 định nghĩa builder dialect `*.zen.tsx` (JSX tĩnh, chỉ component Zen + `Board`/`Screen`/`Overlay`,
  props literal/token, prototype `proto.*`); GĐ5 compile dialect → TSX (`tools/studio/compile.mjs`), Copy/Download,
  `POST /promote`, xuất PNG.
- **Code-languages plan:** parse snippet React → neutral tree → một emitter cho mỗi ngôn ngữ (Vue, Svelte, Swift, Dart);
  HTML lấy từ DOM render; port Vue/Svelte trên cùng CSS + DOM parity gate; native ports; P1–P9; quyết định §8 còn mở.

Neutral tree của code-languages chính là kết quả parse dialect của builder. Spec này gộp hai đường thành một.

## 1. Diễn giải (user xác nhận ở E0)

"Design trên bất kỳ ngôn ngữ nào" = **design một lần trên canvas, xuất ra nhiều ngôn ngữ.**

- Canvas luôn render React. Đây là bản tham chiếu ("React stays the reference", code-languages §2).
- File design là dialect `*.zen.tsx`.
- Mỗi ngôn ngữ là một emitter đọc manifest của port tương ứng.

Không làm: sửa trực tiếp source Vue/Svelte/Swift/Dart trên canvas. Mỗi ngôn ngữ sẽ cần riêng một engine annotate + AST
op cỡ `tools/studio/jsx-source.mjs` (≈ 2.300 dòng) cộng `slots.mjs`, `arrange.mjs`…, trong khi chưa có port nào.

Vì sao canvas React đáng tin cho Vue/Svelte/HTML: các port render cùng markup và `styles.css`, và chỉ được coi là
"ready" khi qua DOM parity gate (code-languages §3C). Cái thấy trên canvas là cái port render ra.

## 2. Ranh giới builder ↔ dev

| Builder sở hữu | Dev sở hữu |
| --- | --- |
| Layout, component + props, token/mode, text style | Data thật, state nghiệp vụ, API |
| Nội dung và data mock | Routing thật, validation, quyền |
| Prototype (`proto.navigate/open/toast/run`) | Nối handler vào logic thật |

Số liệu (code-languages §4): chỉ 11/310 snippet example là JSX thuần, 84% có event handler. Builder không cố sửa code
app; nó xuất **UI skeleton sạch** với điểm nối có tên để dev nối vào.

## 3. Bổ sung đề xuất cho dialect (chốt cú pháp trong spec GĐ2)

Dialect GĐ2 cấm `.map`, điều kiện và hook để 100% props sửa được. Để code xuất ra dùng được mà vẫn giữ tính chất đó:

- **Danh sách từ data mock:** một khối data literal trong file trang (ví dụ `export const mock = { people: [...] }`) và
  một phần tử lặp khai báo (ví dụ `<Repeat data="people">…</Repeat>`). Hàng sửa bằng item ops (`items.mjs`). Compile ra
  `.map` (React), `v-for` (Vue), `{#each}` (Svelte), `ForEach` (SwiftUI), `for` (Flutter), đúng bảng portable subset
  ở code-languages §4.
- **Trạng thái màn hình:** empty / loading / error / default là các frame biến thể của cùng một Screen; compile ra
  điều kiện theo một prop `state` có tên.
- **Prototype → handler:** `proto.navigate("pay")` → prop `onNavigate("pay")`; `proto.run("submit")` → `onSubmit`;
  `proto.open("confirm")` → `useState` cho overlay (như GĐ5 đã ghi). Mỗi handler có comment TODO cho dev.
- **Data contract:** data mock sinh ra một `interface` TypeScript (và kiểu tương ứng ở ngôn ngữ khác) kèm dữ liệu mẫu.

## 4. Kiến trúc export

```
*.zen.tsx ─parse (GĐ2a)─▶ neutral tree ─┬▶ emit/react  → .tsx            gate: tsc + usage-guard
                                       ├▶ emit/html   → HTML + styles.css gate: visual-diff với React (P2)
                                       ├▶ emit/vue    → .vue            gate: vue-tsc        (khi port ready)
                                       ├▶ emit/svelte → .svelte         gate: svelte-check
                                       ├▶ emit/swift  → SwiftUI         gate: swift build    (phone set)
                                       └▶ emit/dart   → Flutter         gate: flutter analyze
        code-languages.generated.json (trạng thái component × ngôn ngữ) ─┘
```

- **Một neutral tree** dùng chung cho Code view của docs (code-languages P1) và export của builder. Đề xuất: emitter
  isomorphic đặt cạnh engine (`tools/studio/emit/*.mjs`, không phụ thuộc Node), docs import lazy. Code-languages plan
  đặt parser ở `src/platform/code/`; người làm P1 hoặc E1 chốt một vị trí, không làm hai bản.
- `compile.mjs` của GĐ5 chính là `emit/react`.
- **Không bao giờ xuất nửa vời:** trang dùng component chưa port ở ngôn ngữ X thì X báo "Vue: thiếu DatePicker, Table"
  và tắt Copy/Download cho X.
- Mọi output qua gate của ngôn ngữ đó trước khi cho tải.
- Snippet React của trang luôn sinh từ dialect, nên không thể lệch khỏi cái render (khác snippet viết tay hiện nay).

## 5. Export dialog (Studio)

- Mở từ Toolbar hoặc menu của trang.
- Chọn ngôn ngữ, mỗi ngôn ngữ hiện trạng thái theo manifest: ready · markup only · not yet. Dùng chung picker với Code
  view (code-languages §3E).
- Xem trước bằng `code/CodeView.tsx`; `code/tokenize.ts` thêm scanner theo code-languages §3E.
- **Copy** / **Download** từng file.
- **Download gói handoff** `<page>-handoff.zip`: code đã compile, `<page>.zen.tsx` (nguồn design), `handoff.md` (§6),
  data mock ở ngôn ngữ đích, PNG từng screen (GĐ5).
- **Promote** (chỉ dev server, admin): `POST /promote` ghi trang thành template/example trong repo, chạy tsc + harness,
  rồi `npm run ship` đẩy branch và mở PR. Merge vẫn là người.

## 6. `handoff.md` tự sinh

| Mục | Nguồn |
| --- | --- |
| Setup: version `@zen/design-system`, import `styles.css`, props `ZenProvider` theo preview modes của trang (theme, componentTheme, density, typography, radius, emphasis) | `package.json`, store preview |
| Component dùng, mỗi cái link `docs/guidelines/<slug>.md` và `docs/api/<slug>.json` | dialect + `docs/guidelines/index.json` |
| Token và text style dùng (tên, không giá trị raw) | dialect + `src/tokens` |
| Prototype flow: danh sách screen/overlay; mỗi action → handler cần viết | `proto.*` |
| Data contract: interface + dữ liệu mẫu | data mock |
| A11y: tên accessible, thứ tự focus, keyboard theo guideline; cảnh báo usage-guard còn lại | guidelines + `check-usage.mjs` |
| Câu hỏi mở cho dev | ghi chú trên canvas (nếu có) |

Skill `design:design-handoff` có thể dùng làm khung nội dung; dữ liệu luôn lấy từ nguồn ở cột phải, không viết tay.

## 7. Một chiều

- `*.zen.tsx` là nguồn sự thật của design. Code compile ra là **một chiều**: Studio không đọc ngược code đã sửa tay.
- Khi design đổi: export lại; dev merge diff.
- File compile mở đầu bằng: `// Generated by Zen Studio from <page>.zen.tsx (rev <n>). Edit the design, then re-export.`

## 8. Giai đoạn

| # | Nội dung | Phụ thuộc | Tier | Xong khi |
| --- | --- | --- | --- | --- |
| E0 | User chốt §1 và §9 | — | — | Quyết định ghi vào spec này |
| E1 | React export + `handoff.md` + zip + Promote/PR | GĐ2 (dialect, PageStore), GĐ5 compile | M/L | TSX qua tsc + usage-guard; trang Promote render được trong docs classic; zip mở được; `handoff.md` đủ mục §6 trên 3 trang mẫu |
| E2 | HTML + CSS export cho trang builder | code-languages P1 + P2 | M | HTML dán vào trang trắng với `styles.css`: 0 panel khác (visual-diff) với component stateless |
| E3 | `Repeat` / trạng thái màn hình trong dialect + emitter React | GĐ2 | M | Export có `.map` / điều kiện; sửa trên canvas vẫn 100% (audit editability) |
| E4 | Vue, rồi Svelte | code-languages P3–P5 | L | `vue-tsc` / `svelte-check` qua; DOM parity với React |
| E5 | SwiftUI / Flutter cho phone set | code-languages P6–P8 | L | `swift build` / `flutter analyze` qua |

E1–E3 dùng được ngay mà không cần port nào.

## 9. Quyết định cho user

1. Xác nhận diễn giải §1 (design một lần, xuất nhiều ngôn ngữ; không sửa trực tiếp source Vue/Swift).
2. Chiến lược web (code-languages §8.1): **A** port native Vue/Svelte trên CSS chung + DOM parity (đề xuất) · **B** Web
   Components bọc React · **C** chỉ HTML.
3. Thứ tự ngôn ngữ sau React. Đề xuất: HTML → Vue → native phone set → Svelte; tuỳ khách hàng thực sự dùng gì.
4. Promote ghi vào đâu: `src/templates/<name>/` trong repo docs, hay chỉ xuất zip cho app bên ngoài?
5. Cú pháp `Repeat` và trạng thái màn hình: chốt trong spec GĐ2.

## 10. Rủi ro

- **Bảo trì nhân theo số ngôn ngữ** (code-languages §5): mỗi thay đổi component phải vào mọi port. Chỉ làm ngôn ngữ có
  người dùng thật.
- **Dialect quá chặt** làm designer bí khi cần list hoặc trạng thái: giải bằng §3.
- **HTML biến markup thành public API** (CSS contract, code-languages §3B).
- **File dùng chung:** `code/tokenize.ts`, `inspector/CodePanel.tsx`, `code/CodeView.tsx` thuộc vùng Studio; báo session
  sở hữu trước khi sửa (AGENTS.md "Working alongside other sessions").

# Quy trình Build → QA → Deliver

Mục tiêu: mọi component, playground, example và template đều chuẩn ở sáu trục — **spacing** (padding, gap),
**corner radius**, **token đúng rule và đúng role**, **style** (layer, border, effect), **typography và content
hierarchy**, **chức năng và UX** — và **luôn được QA sau khi build, trước khi deliver**.

Quy trình có ba lớp. Máy đo những gì đo được; người build lập kế hoạch và nhìn ảnh.

| Lúc nào | Chạy gì | Ai kích hoạt |
| --- | --- | --- |
| Sau **mỗi lần** sửa một file UI | style-guard + usage-guard trên đúng file đó; lỗi mới trả về ngay cho Claude | hook PostToolUse (tự động) |
| Trong lúc lặp | `npm run qa:quick` — cổng tĩnh + audit 1512 | người build |
| Trước khi deliver | `npm run qa` — tĩnh, runtime, dark, Comfortable, hành vi, độ phủ example, ảnh chụp | người build |
| Khi Claude định kết thúc lượt | chặn nếu còn file UI chưa qua QA đầy đủ, hoặc chưa mở xem ảnh của lần pass | hook Stop (tự động) |

Skill cho agent: [`skills/zen-build-qa/SKILL.md`](../../skills/zen-build-qa/SKILL.md). QA toàn bộ platform (audit
định kỳ) vẫn theo [platform-audit](platform-audit.md); viết example theo
[example-patterns](../guides/example-patterns.md).

## 1. Trước khi build: spec card

Trước khi viết code cho component mới, example mới hay một thay đổi nhìn thấy được, chốt các điểm sau. Phần lớn kết
quả "chưa chuẩn" đến từ việc bỏ qua bước này.

1. Node Figma chính xác (file `9nZv4uW2LT21yuHabMTCh1`) và mode.
2. Bảng anatomy, mỗi phần tử một dòng: token padding/gap, token radius, text style + tone, role màu
   (background/border/content), effect, các state.
3. Kế hoạch hierarchy theo loại trang (master/child, desktop/phone, overlay): chữ nào là h1/h2/h3, body, meta, value.
4. Kế hoạch tương tác: pattern WAI-ARIA APG, bản đồ phím, thứ tự focus, focus đi đâu khi mở/đóng.
5. Danh sách state: default, hover, pressed, focus-visible, selected, disabled/read-only, error, loading, empty,
   success — ghi "có" hoặc "không áp dụng vì…".
6. Responsive và mode: 1512 / 1024 / 390, Compact ↔ Comfortable, radius mode, dark.
7. Ma trận example: use case chính, state, kết hợp, edge case, mobile trong `PlatformPhone`, bàn phím/a11y.

<a id="spacing"></a>
### Spacing

- Padding (inset) dùng `--zen-spacing-padding-*` (2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48). Khoảng cách giữa các
  phần tử dùng `--zen-spacing-gap-*` (2 · 4 · 8 · 12 · 16 · 24 · 32 · 40 · 48 · 64 · 88 · 144). Figma tách hai nhóm này,
  nên padding không dùng token gap và ngược lại.
- Không dùng px thô, **kể cả khi con số trùng**: token đổi theo Component Size (Compact/Comfortable). Bù viền ±1px thì được.
- Padding card/modal lấy từ `--zen-card-padding-*` / `--zen-modal-padding` (đổi theo breakpoint).
- Hàng List lấy inset từ `<List inset>`. Không pad hai lần (padding container + padding hàng).

<a id="radius"></a>
### Corner radius

- Container dùng `--zen-corner-radius-{2-xsmall … xgiant}`; control dùng `--zen-corner-radius-action-<size>`; field
  dùng `--zen-corner-radius-input-<size>`; hình tròn dùng `--zen-corner-radius-rounded`.
- Radius mode (Rounded, Smooth, Standard, Luxury) chỉ hoạt động qua token.
- **Góc đồng tâm:** radius ngoài = radius trong + khoảng inset (ví dụ list card: Padding/2XSmall + Corner-Radius/XLarge
  bao quanh hàng Large).

### Token đúng role (màu, layer, border, effect)

- Chữ và icon dùng `Color/Content/*`: neutral Strongest / Base / Light = primary / secondary / tertiary. Họ màu dùng
  Strongest/Base cho chữ trên nền Subtle của chính nó, Light chỉ để nhấn. Nhóm Lights (Accent, Warning,
  Support/Yellow) không bao giờ dùng Light cho chữ. Chữ trên nền Solid dùng On-Colors.
- Nền dùng `Color/Background/*` theo layer: Canvas (chỉ trang) → Surface (card) → màu component → Container (modal,
  sheet) → Popover (nổi).
- Viền khép kín: Pale khi tĩnh, Subtle khi thao tác được, nét đứt luôn Subtle.
- Shadow chỉ lấy từ `--zen-style-*-shadow`; không đổ bóng ngoài lên nền Subtle, Pale hay Surface-Alt; Surface/Default
  trên trang Canvas/Alt cần viền; tint hover trong suốt phải đặt trên Surface đục khi đè lên nội dung khác.

<a id="typography"></a>
### Typography và content hierarchy

- Luôn là một text style Figma: `<Text textStyle>` / `<Heading level textStyle>` hoặc `.zen-type-*`, hoặc **đủ bộ**
  token của một style (size + line height + tracking cùng một style, weight từ `--zen-emphasis-font-weight-*`). Không
  set font-size thô, không lấy nửa style, không `calc()` từ token chữ.
- h1 = Heading/1 = tiêu đề trang, chỉ một lần. Section desktop: h2 Heading/4. Tiêu đề card/widget: h3
  Heading/Subheading. Tiêu đề hàng: Body/Base/Medium. Meta: Body/Small hoặc Caption, tone nhạt hơn. Con số (Display/4,
  Heading/2) không phải heading. Tiêu đề overlay là h2, không bao giờ Heading/1.
- Tiêu đề dùng Strongest. Nhấn mạnh bằng weight hoặc tone, **không đổi cỡ chữ**. Cấp heading chọn theo outline.
- Tiêu đề và mô tả ngay dưới không được trông giống nhau. Một example nên có 3–5 text style.

<a id="density"></a>
### Density

Slot chứa phần tử có size theo token (icon, avatar, thumbnail, dấu checkbox) phải lấy cùng token hoặc `calc()` từ
token đó; nếu không, ở Comfortable nội dung sẽ tràn khỏi slot.

### Chức năng và UX

- Mọi tương tác component hỗ trợ đều chạy được trong **mọi** example (không có `() => undefined`).
- Bàn phím theo APG; focus luôn nhìn thấy; hover/pressed có phản hồi; hành động không hoàn tác dùng Danger.
- Copy nói kết quả, số đếm dùng `plural()`; mobile theo example-patterns §2.
- Dùng component DS cho đúng pattern (List/ListItem, Card, Table, Divider, DockIcon, EmptyState, InlineMessage, Chip
  advanced cho filter, BadgeCounter cho số đếm) thay vì tự dựng markup `pe-*`.

## 2. Trong lúc build: kiểm tức thì

Hook PostToolUse chạy sau mỗi Edit/Write (và mỗi lệnh Bash có sửa file mà lệnh đó nêu tên). Với file UI nó:

1. ghi file vào sổ theo dõi của session (`.qa/sessions/<session>.json`) kèm các trang platform mà đoạn sửa hiển thị;
2. chạy **style-guard** và **usage-guard** trên đúng file đó (khoảng 0,1 giây). Lỗi mới chặn ngay với gợi ý token thay
   thế; cảnh báo và nợ cũ đi kèm dưới dạng ngữ cảnh.

style-guard (`npm run style:check`, danh sách rule: `npm run style:check -- --list`):

| Rule | Mức | Bắt lỗi |
| --- | --- | --- |
| `spacing/token` | lỗi | padding / margin / gap bằng px thô (cả custom property tên `-gap`, `-padding`) |
| `spacing/role` | cảnh báo | padding dùng token Gap, gap dùng token Padding |
| `radius/token` | lỗi | border-radius px thô (kể cả 1000px thay cho token) |
| `radius/role` | cảnh báo | token Input ngoài field, token Action ngoài control |
| `type/token` | lỗi | font-size, line-height, letter-spacing, weight, family thô |
| `type/mixed-style` | lỗi | một rule trộn size của style này với line height của style khác |
| `type/token-role` | lỗi | token line-height đặt vào font-size… |
| `type/derived` | cảnh báo | `calc()` từ token chữ ra cỡ mới |
| `type/visual-heading` | cảnh báo | `<Text textStyle="Heading/…">` là tiêu đề nhưng không phải heading |
| `type/raw-heading` | cảnh báo | `<h1>`–`<h6>` trần trong example/template |
| `color/token` | lỗi | màu thô trong CSS platform và inline style (CSS component do usage-guard kiểm) |
| `color/role` | lỗi | màu chữ lấy từ token background/border |
| `color/role-fill` | cảnh báo | nền hoặc viền lấy từ token content (trừ chấm, vạch, icon mask) |
| `shadow/token` | lỗi | box-shadow tự viết (ring `0 0 0 Npx` và vạch 1px được phép) |
| `size/slot-token` | cảnh báo | slot icon/avatar/thumbnail có kích thước px |

Inline style (`style={{ padding: 12 }}`) trong TSX, kể cả trong code sample, được kiểm như CSS.

Khi Figma thật sự dùng một giá trị ngoài scale: ưu tiên gắn vào token component. Không được thì đặt
`/* zen-allow-<allow>: <lý do, dẫn node Figma> */` ngay trên dòng đó. Không bao giờ tắt rule chỉ để qua cổng.

`npm run qa:quick` cho phản hồi runtime nhanh (cổng tĩnh + audit 1512 có check chất lượng) trong lúc lặp.

## 3. Cổng QA: `npm run qa`

```bash
npm run qa                        # phạm vi = các file session này đã sửa (lấy từ sổ theo dõi của hook)
npm run qa -- --pages=card,chip   # thêm trang khi ánh xạ không tự đoán được (lệnh sẽ báo)
npm run qa -- --files=src/a.css   # thêm file (ví dụ khi sửa ngoài Claude)
npm run qa -- --all               # mọi trang — bắt buộc trước khi deliver thay đổi ở component lõi, token, shell
```

Các bước:

1. **Tĩnh:** tsc · style-guard · usage-guard · self-test của hai harness · guidelines đồng bộ · figma-contract (khi sửa
   component) · tokens/styles check (khi sửa style).
2. **Runtime** (`audit.mjs --quality --density --smoke` ở 1512 + 390, rồi `--dark` ở 1512). Ngoài các check cũ (edges,
   sizes, surfaces, overflow, typography, outline…) có thêm:

   | Check | Mức | Ý nghĩa |
   | --- | --- | --- |
   | `scale` | lỗi | chữ không khớp text style Zen nào (size/line height/tracking/weight/family), ở bất kỳ đâu trong preview; markup example có padding, gap, radius hoặc màu ngoài token của mode hiện tại |
   | `roles` | cảnh báo | markup example dùng token sai role (token background làm màu chữ…) |
   | `hierarchy` | lỗi | h1 không phải Heading/1; heading nhỏ hơn body bên dưới; tiêu đề overlay không phải h2 hoặc là Heading/1 |
   | `rhythm` | cảnh báo | tiêu đề và mô tả giống hệt nhau; tiêu đề không Strongest; dòng mang style Heading mà không phải heading (và không phải con số); quá 7 text style trong một example; góc lồng nhau không đồng tâm; hàng list bị inset hai lần |
   | `density` | lỗi | phần tử Zen bị nội dung tràn ra khi chuyển Comfortable, và lỗi overflow/size/edge mới ở Comfortable |

3. **Hành vi** (`npm run platform:behaviour`): focus ring nhìn thấy khi Tab, mọi control tới được bằng bàn phím, không
   có phần tử chỉ bấm được bằng chuột, phím APG (tabs, menu button, dialog: focus trap + Escape + trả focus, slider,
   disclosure, combobox…), nút bấm không có tác dụng (dead click), không có phản hồi hover.
4. **Độ phủ example:** mỗi trang đủ state, edge case, mobile, bàn phím/a11y, kết hợp — thiếu thì thêm example hoặc
   nêu lý do.
5. **Ảnh chụp:** contact sheet 1512 và 390 cho từng trang.

Kết quả ghi vào `.qa/reports/<thời điểm>.md` (kèm `.json`), có khối **"Tóm tắt để báo cáo"** để dán khi deliver.
Exit 0 = pass, 1 = còn lỗi, 2 = không chạy được (dev server tắt…). Chỉ lần chạy **đầy đủ** (không `--quick`, có dev
server) mới được tính là pass.

### Nợ cũ (baseline)

Lỗi có từ trước nằm trong `tools/style-guard/baseline.json`, `tools/platform-audit/quality-baseline.json` và
`tools/platform-audit/behaviour-baseline.json`. Chúng được liệt kê riêng và không làm hỏng cổng; lỗi **mới** thì có.
Khi chạm vào dòng hoặc example còn nợ, sửa luôn rồi cập nhật baseline (`npm run style:check -- --baseline-update`,
`node tools/platform-audit/audit.mjs --pages=<trang> --quality --density --baseline-update`). Nợ chỉ được giảm.

## 4. Nhìn ảnh: UX rubric

Mở từng contact sheet (1512 và 390) và đi qua từng card:

1. **Hierarchy:** một điểm vào rõ ràng; tiêu đề > body > meta nhìn là thấy; không gì tranh với hành động chính.
2. **Nhịp khoảng cách:** thứ liên quan gần nhau hơn thứ không liên quan; khoảng cách trong nhóm đồng đều; không chật,
   không inset đôi.
3. **Căn hàng:** mép trái chung, CTA thẳng hàng giữa các card, icon canh giữa dòng chữ.
4. **Bề mặt:** layer đúng (trang, card, overlay), viền và bóng đúng rule, góc đồng tâm.
5. **State:** empty, error, loading, disabled/read-only, success trông có chủ đích và có bước tiếp theo.
6. **Copy:** dữ liệu thật, nhãn bắt đầu bằng động từ, số nhiều đúng, không chữ bị cắt.
7. **Affordance:** thứ bấm được trông bấm được; hành động phá huỷ trông nguy hiểm; trạng thái chọn rõ ràng.
8. **Mobile 390:** hành động chính trong tầm ngón cái, CTA footer `lg` full width, safe area, Back là chevron, vùng chạm ≥ 24px.
9. **Comfortable và dark:** không bị cắt, không chồng lấn, không có hộp trắng trên nền trắng.

State không có trong contact sheet (dialog, menu, sheet đang mở): chụp bằng
`npm run platform:shoot -- <trang> --title="…" --click="…"` (thêm `--width=390`). Với component mới hoặc một bộ example
mới, gọi thêm agent **`zen-ux-reviewer`** (`.claude/agents/zen-ux-reviewer.md` ở Zen-CodeBase) để có một góc nhìn độc
lập, rồi sửa theo.

## 5. Deliver

Chỉ deliver sau một lần `npm run qa` pass đầy đủ và đã xem hết ảnh. Câu trả lời (tiếng Việt) gồm: thay đổi gì và vì
sao; khối "Tóm tắt để báo cáo"; các ảnh đã xem; mọi cảnh báo được giữ lại kèm lý do; lỗi phía Figma; phần chưa kiểm
chứng được. Sau đó ghi `docs/context/session-log-<ngày>.md`, một dòng CHANGELOG (Unreleased) và cập nhật HANDOFF.md khi
bức tranh chung thay đổi.

Hook Stop chặn việc kết thúc lượt khi còn file UI chưa qua QA đầy đủ sau lần sửa cuối, hoặc khi ảnh của lần pass chưa
được mở. Nếu Claude dừng lần nữa mà không có gì thay đổi, lượt vẫn kết thúc (không lặp vô hạn) và người dùng nhận một
cảnh báo.

## 6. Hook: cài đặt, tắt, xử lý sự cố

- Cấu hình nằm ở `Zen-CodeBase/.claude/settings.json` (thư mục mọi session Zen được mở). Hai hook gọi
  `Zen-DS/tools/qa/hooks/post-edit.mjs` (PostToolUse) và `stop-gate.mjs` (Stop). Session nào không sửa file UI thì
  không bao giờ bị ảnh hưởng. Session đang chạy từ trước khi thêm hook cần mở lại (hoặc mở `/hooks` một lần trong
  terminal `claude`) để nạp.
- Clone Zen-DS ở nơi khác (repo là thư mục gốc của project): chép nội dung
  [`tools/qa/hooks/claude-settings.example.json`](../../tools/qa/hooks/claude-settings.example.json) vào
  `.claude/settings.json` của project đó; lệnh tự tìm `tools/qa/hooks` ở gốc repo hoặc trong `Zen-DS/`.
- Tắt tạm thời: xoá hai mục hook trong settings.json, hoặc đặt `"disableAllHooks": true` trong
  `.claude/settings.local.json`.
- Sổ theo dõi và báo cáo nằm trong `Zen-DS/.qa/` (đã gitignore). Xoá `.qa/sessions/<session>.json` để làm lại từ đầu.
- Hook không bao giờ làm hỏng tool call: lỗi nội bộ thì im lặng thoát 0.

## 7. Làm cho lỗi không lặp lại

Một loại lỗi có thể lặp lại phải thành rule: token → style-guard (`tools/style-guard/check-styles.mjs` + fixture
`bad.*`/`good.*`, `npm run style:selftest`); cách dùng component → usage-guard; thứ chỉ thấy khi render →
`tools/platform-audit/quality-checks.mjs` hoặc `behaviour.mjs`. Kèm một dòng Do/Don't trong guideline. Xem thêm
[`skills/zen-platform-qa`](../../skills/zen-platform-qa/SKILL.md) bước 7.

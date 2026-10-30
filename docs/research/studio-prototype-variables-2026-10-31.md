# Zen Studio: biến cho prototype (W-52 phase B) — design doc, 2026-10-31

**Trạng thái:** chờ bạn duyệt. Chưa có dòng code nào. Duyệt xong mới build, theo các phase ở §6.
**Nguồn:** walk 2026-10-29 ([studio-prototype-walk-2026-10-29.md](studio-prototype-walk-2026-10-29.md) §4 mục 8),
bạn duyệt ngày 2026-10-30 là "A trước, B sau". A đã merge (#363, spec
[studio-play-live-controls-2026-10-30.md](studio-play-live-controls-2026-10-30.md)). Doc này là B: biến của trang,
hành động Set variable, và prop gắn với biến, theo mô hình của Figma.

**Lưu ý lịch sử.** Option C (2026-10-23) ghi "links between components are prototype actions, no variables". Việc bạn
duyệt B ngày 2026-10-30 thay quyết định đó, nhưng chỉ cho biến của prototype. Filter table và Change step vẫn giữ nguyên.

## 0. Tóm tắt

- Trang khai báo biến bằng `export const vars = { dateRange: "Any time" }`, đặt cạnh `export const mock`. Kiểu của biến
  là text, number hoặc boolean, lấy theo giá trị đầu. Biến có phạm vi cả trang và không có mode.
- Hành động có ba dạng:
  - `proto.set("dateRange", "Last 3 months")`;
  - `proto.if(điều kiện, rồi, ngược lại)`;
  - `proto.run(a, b, …)` chạy nhiều hành động theo thứ tự. Đây là phần đầu của W-58, và B cần nó: một dòng trong sheet
    vừa phải đặt biến vừa phải đóng sheet.
- Prop đọc biến bằng `{vars.dateRange}`, `{!vars.signedIn}` hoặc `{vars.dateRange === "Last 3 months"}`.
- Biến sống trong Play từ lúc bắt đầu đến khi Restart. Navigate to và Back giữ giá trị của biến, giống Figma. Canvas và
  file luôn vẽ giá trị đầu.
- **Nối với A.** Một control có prop giá trị gắn biến (`checked={vars.wifi}`) thì ghi ngược vào biến (hai chiều). Control
  không gắn biến vẫn theo cơ chế của A: trạng thái riêng của mỗi lần vào màn.
- **Tên gọi.** Studio đã có cửa sổ "Local variables" cho token Zen. Biến của prototype có tên khác trong code (`vars`),
  nằm ở chỗ khác (tab Prototype, mục "Variables" của trang) và có biểu tượng khác. Không biến nào lẫn vào token (§2.6).
- **Push sang Figma.** Biến thành variable thật, và hành động thành reaction thật (SET_VARIABLE, CONDITIONAL, nhiều
  action trong một reaction). Hai thứ bị mất: prop gắn với một phép so sánh, và control hai chiều. Push ghi giá trị đầu
  của chúng kèm ghi chú (§4).

## 1. Figma làm gì (ngắn)

| Phần | Figma |
| --- | --- |
| **Local variables** | Nằm trong collection, mỗi collection có một hoặc nhiều mode. Có 4 kiểu: Color, Number, String, Boolean. Prototype dùng chung các biến này với design token, không có loại biến riêng cho prototype. |
| **Set variable** | Một action trong interaction: chọn biến, rồi nhập giá trị hoặc **expression**. Expression gồm `+ - * /` cho số, `+` để nối chuỗi, `== != < > <= >=`, `and` `or` `not`, và tên biến khác. |
| **Set variable mode** | Đổi mode của một collection cho cả prototype (ví dụ Light/Dark, ngôn ngữ). |
| **Conditional** | Action dạng `if <expression> → các action`, có thêm `else if` và `else`. |
| **Nhiều action** | Một interaction có thể chứa nhiều action, chạy theo thứ tự (từ 2023). |
| **Gắn biến** | Các chỗ gắn được: nội dung text (String), Visible (Boolean), thuộc tính của instance (text, boolean, variant), một số trường số (kích thước, gap, radius) và màu. Mỗi chỗ chỉ gắn được **vào một biến**, không gắn được vào một expression. |
| **Reset** | Biến về giá trị đầu khi Restart prototype hoặc mở lại prototype. Navigate không reset biến. Giá trị đổi trong lúc chạy không ghi vào file. |
| **Change to** | Cách thứ hai: interactive component đổi variant trên chính instance. A đã thay phần này cho các control của Zen. |

## 2. Trong code của trang (quyết định quan trọng nhất)

### 2.1 Khai báo

```tsx
export const mock = { ranges: ["Any time", "Last 7 days", "Last 3 months"] };
export const vars = { dateRange: "Any time", cartCount: 0, signedIn: false };
```

- Dùng tên **`vars`**, không dùng `variables`. Đọc và khai báo cùng một chữ, giống `mock`. Như vậy biến cũng không trùng
  với chữ "Variables" của token.
- Mỗi giá trị là một literal: string → **Text**, number → **Number**, boolean → **Boolean**. Không có màu, list hay object.
  Màu thuộc về token. List thuộc về `mock`.
- Tên biến là một identifier camelCase. Kiểu của biến cố định theo giá trị đầu. Muốn đổi kiểu thì đổi trong UI, và UI
  viết lại giá trị.
- `dialect.mjs` nhận thêm câu `export const vars` (thông báo lỗi: "`export const vars` holds text, numbers and
  booleans"). `parsePage` trả thêm `vars`. `ref` nhận thêm gốc `"vars"`, bên cạnh `"mock"` và tên của item trong `.map`.
- File vẫn là TSX thật. Khi export, `vars.x` đọc giá trị đầu, giống cách export làm với `proto.*` hiện nay.

### 2.2 Đặt biến, điều kiện, chuỗi hành động

```tsx
<ListItem title="Last 3 months" onClick={proto.run(proto.set("dateRange", "Last 3 months"), proto.close())} />
<Button onClick={proto.set("cartCount", vars.cartCount + 1)}>Add to cart</Button>
<Toggle label="Signed in" onCheckedChange={proto.set("signedIn", !vars.signedIn)} />
<Button onClick={proto.if(vars.signedIn, proto.navigate("home"), proto.navigate("login"))}>Continue</Button>
```

- **`proto.set(tên, giá trị)`**. Giá trị là một literal hoặc một expression. Không thêm `proto.toggle`: chỉ có một cách
  viết, và Figma cũng chỉ có Set variable. UI có nút "Flip", nút này viết `!vars.x`.
- **`proto.if(điều kiện, rồi, ngược lại?)`**. Mỗi nhánh là một hành động hoặc một `proto.run(…)`. Muốn có else-if thì
  đặt một `proto.if` khác vào nhánh ngược lại.
- **`proto.run(a, b, …)`**. Chạy các hành động theo thứ tự. Một trigger vẫn giữ **một** giá trị, nên
  `triggerValue`/`protoOf` không phải đổi cách đọc. Không dùng mảng `[a, b]` vì mảng không phải handler, nên TSX export
  sẽ sai kiểu.
- **Expression** dùng tập của Figma, viết bằng cú pháp JS:
  - literal và `vars.x`;
  - `+ - * /`;
  - `=== !== < <= > >=`;
  - `&& || !`;
  - ngoặc.

  Không có lời gọi hàm, không có toán tử `? :`, không có biến ngoài `vars`. Trong cây trang, expression là một Value mới
  `{ kind: "expr", op, args }`. Các hàm thuần trong `protoVars.ts` (mới, có selftest) đọc, viết và tính nó.
- `PROTO_ACTIONS` có thêm `set`, `if` và `run`. `ACTIONS` (protoModel) có thêm hai mục **Set variable** và
  **Conditional**. `proto.run` không phải một mục riêng: UI vẽ nó thành danh sách hành động (§3.2).

### 2.3 Prop đọc biến

```tsx
<Chip selected={vars.dateRange !== "Any time"}>{vars.dateRange}</Chip>
<ListItem title="Last 3 months" selected={vars.dateRange === "Last 3 months"} />
{mock.ranges.map((range) => <ListItem title={range} selected={vars.dateRange === range} />)}
<BadgeCounter value={vars.cartCount} />
<AlertBanner title="Welcome back" hidden={!vars.signedIn} />
```

Một prop hoặc một child text gắn biến theo một trong ba dạng:

- `vars.x`;
- `!vars.x`;
- `vars.x === <literal hoặc item.field>`, hoặc `!==`.

Ngoài ba dạng này thì vẫn báo "no code, conditions or functions". Không cho nối chuỗi và không cho tính toán trong prop:
mục đích là giữ prop sửa được trong Inspector, và giữ gần cách Figma "gắn vào một biến". Dạng so sánh là phần Studio
**thêm** so với Figma. Nó cần cho dấu ✓ của từng dòng; khi push thì phần này mất (§4).

### 2.4 Trong Play (nối với A, không làm lại A)

| Phần | Chỗ |
| --- | --- |
| Giá trị biến | `playFlow.tsx`: một state cấp **lần chạy**, cạnh `history`, **không** nằm trong `Live` (state của mỗi lần vào màn). `restart()` trả biến về `vars` của trang. Navigate to, Back, mở và đóng overlay đều giữ biến. |
| Hành động | `ProtoActions` có thêm `set(name, value)` và `vars()` (đọc giá trị hiện tại). `protoHandler` tự xử lý `run` (lần lượt) và `if` (tính điều kiện bằng `vars()`), nên `ProtoActions` chỉ thêm hai mục trên. |
| Vẽ | `renderPage` thêm gốc `vars` vào `scope`, với giá trị sống trong Play và giá trị đầu ở mọi chỗ khác. Cache của node (`scope.mock === ctx.mock`) phải tính cả `ctx.vars`: các node đọc biến được vẽ lại khi biến đổi. |
| Control gắn biến (hai chiều) | Toggle `checked`, Checkbox, Segmented/Tabs `value`, InputField/TextAreaField/Search `value`. Khi gắn `vars.x`, lối `onControl` của A ghi vào biến chứ không ghi vào `controls`. Không cần thêm Set variable. Figma không có dạng này. |
| Nhóm chọn của A | Nếu một dòng trong nhóm có `selected` gắn biến, nhóm đó thuộc B: `choicesOf` bỏ qua nó. Chip mở overlay mà nhãn hoặc `selected` gắn biến thì không nhận nhãn tự động của A. Prop gắn biến luôn được ưu tiên. |
| Open on phone | Dùng chung flow, nên chạy giống Play. Biến không được lưu giữa các lần mở. |

Kết quả: A vẫn là cách "không cần cài đặt gì". B dùng khi người làm muốn nhiều màn **dùng chung** một giá trị, ví dụ chip
ở màn danh sách và tiêu đề ở màn chi tiết cùng đọc `dateRange`, hoặc một luồng rẽ nhánh theo đăng nhập.

### 2.5 Phạm vi

Biến có phạm vi **một trang**: mọi Screen và Overlay của trang dùng chung. Navigate chưa sang được trang khác (W-49),
nên một trang chính là một flow. Biến không có mode (xem câu hỏi 6).

### 2.6 Không lẫn với token Variables

| | Token (đã có) | Biến prototype (mới) |
| --- | --- | --- |
| Trong code | `var(--zen-…)`, collection của token | `vars.x` trong file trang |
| Lưu ở | gói token (`tokens/`), dùng cho mọi trang | file `.zen.tsx` của trang |
| Mở ở | cửa sổ **Local variables** | tab Prototype › mục **Variables** (trang) |
| Biểu tượng | lục giác (`icon-hexagon-01-line`) | biểu tượng khác (chọn lúc build, ví dụ `{x}`) |
| Kiểu | màu, số, chuỗi, có mode | Text, Number, Boolean, không mode |
| Bộ chọn | ô màu và trường token chỉ hiện token | nút Bind chỉ hiện biến của trang |

Đề xuất: cửa sổ Local variables có thêm một dòng cuối, tách riêng, "Prototype · this page". Bấm vào thì mở mục Variables
ở tab Prototype. Người quen Figma tìm biến ở Local variables vẫn tìm thấy, và không ai tạo nhầm một collection token
(collection token được đóng gói và publish). Xem câu hỏi 2.

## 3. Giao diện

### 3.1 Tạo biến: tab Prototype, khi không chọn gì

Mục mới **Variables** nằm ngay dưới mục Flow:

```
Variables                         This page   [+]
  {x} dateRange     [Any time        ]    ⋯
  #   cartCount     [0               ]    ⋯
  ◐   signedIn      [ Off | On ]          ⋯
```

- Nút **+** mở menu Text / Number / Boolean. Studio thêm một dòng mới tên `text1`, ô tên đang được focus.
- Bấm vào tên để đổi tên. Studio viết lại mọi `vars.x` và mọi `proto.set("x", …)` trong một lần undo.
- Ô giá trị là **giá trị đầu**: canvas vẽ theo nó, và Restart trả biến về nó.
- Menu ⋯ có ba mục: Rename, Change type, Delete. Nếu biến đang được dùng, Delete hỏi trước: "Used by 3 layers. Delete
  anyway?". Khi xoá, các chỗ đọc biến nhận lại giá trị đầu dưới dạng literal, còn `proto.set` của biến đó bị bỏ.
- Khi trang chưa có biến: mục chỉ có nút + và dòng "Variables change in Play".

### 3.2 Tab Prototype: Set variable, Conditional, nhiều hành động

```
Interactions                                         [+]
On tap
  1  [Set variable ▾]  [dateRange ▾]  [Last 3 months  ]   ⋯
  2  [Close overlay ▾]                                    ⋯
     + Add action
```

- **Set variable**: chọn biến (cuối danh sách có "Create variable…"). Ô giá trị đổi theo kiểu:
  - Text: ô chữ;
  - Number: ô số, kèm nút **fx** để gõ expression như `cartCount + 1`. Trong ô này không cần viết `vars.`. Gõ sai thì ô
    báo "Not an expression";
  - Boolean: Segmented Off | On | Flip.
- **Conditional**:

  ```
  If  [signedIn ▾] [is ▾] [On]          + and/or
      1 [Navigate to ▾] [Home]          + Add action
  Else
      1 [Navigate to ▾] [Login]         + Add action
  ```

  Các phép so sánh hiện bằng chữ: is, is not, <, >, ≤, ≥, is empty. "+ and/or" thêm một vế. Menu ⋯ có mục "Edit as
  expression" cho trường hợp phức tạp.
- **+ Add action** biến giá trị của trigger thành `proto.run(…)`. Khi còn một hành động thì Studio gỡ lại `run`. Kéo để
  đổi thứ tự. Mỗi hành động giữ animation và tuỳ chọn của nó như hiện nay.

### 3.3 Gắn prop vào biến: Inspector, tab Design

```
Label     [Date              ]  {x}        ← rê chuột: nút Bind
Label     [{x} dateRange    ✕]             ← đã gắn
Selected  [{x} dateRange is "Last 3 months"  ✕]
```

- Mỗi dòng prop kiểu text, number, boolean hoặc chọn-một-chuỗi có nút **Bind** (aria "Bind to variable"), hiện khi rê
  chuột, giống nút gắn variable của Figma.
- Bấm nút thì mở popover liệt kê biến của trang **cùng kiểu**, và cuối danh sách có "Create variable…".
- Với prop boolean, popover có thêm mục "When … is …". Mục này viết `vars.x === "…"` và cho chọn biến Text cùng giá trị
  so sánh (trong một `.map` thì so được với một trường của item).
- Khi đã gắn, ô hiện một pill tên biến. Bấm ✕ để gỡ gắn: prop nhận lại giá trị đầu dưới dạng literal.
- Nội dung text (Text, nhãn Button) gắn ở dòng Content. Visible gắn ở công tắc hiện/ẩn của mục Appearance và viết
  `hidden={!vars.x}`.
- Trong Layers, layer có prop gắn biến hiện một dấu `{x}` nhỏ. Canvas vẽ theo giá trị đầu.

## 4. Push sang Figma

Plugin hiện tạo reaction bằng `setReactionsAsync` (`figma-proto.mjs`, `studio-import.js applyReactions`). B cần thêm các
phần sau:

| Studio | Figma | Còn hay mất |
| --- | --- | --- |
| `vars` | một collection local "Prototype · <tên trang>", một mode, mỗi biến là STRING/FLOAT/BOOLEAN với giá trị đầu (`createVariableCollection`, `createVariable`, `setValueForMode`). Push lần sau dùng lại theo tên (merge dần, như native pack). | còn |
| `proto.set` | action `SET_VARIABLE` (`variableId`, `variableValue` là expression) | còn: expression của Figma có đủ các toán tử ở §2.2 |
| `proto.if` | action `CONDITIONAL` (`conditionalBlocks`; else-if là block tiếp theo) | còn |
| `proto.run` | `reaction.actions` có nhiều phần tử | còn |
| `{vars.x}` ở text | `setBoundVariable("characters")` | còn |
| `hidden={!vars.x}` | `setBoundVariable("visible")`. Figma gắn Visible với biến, không gắn với `not` biến: push đảo **giá trị** sẽ sai, nên ghi giá trị đầu kèm ghi chú | mất một phần (chỉ còn khi viết `hidden={vars.x}`, xem câu hỏi 4) |
| prop của instance gắn `vars.x` | `setProperties({ prop: VariableAlias })` cho thuộc tính text, boolean, variant | còn |
| `vars.x === "…"` ở prop | Figma chỉ gắn vào một biến | **mất**: ghi giá trị đầu, ghi chú "bound to a condition". Đây chính là dấu ✓ của W-52. |
| control hai chiều | Figma không có ô nhập hay công tắc sống | **mất**: giá trị đầu, ghi chú |
| Show toast, Filter table, Change step | như hiện nay | mất (đã có ghi chú) |

Phải thử trên **Figma thật** trước khi coi là xong ([[test-in-real-figma]]). Plugin API có `SET_VARIABLE`, `CONDITIONAL`
và `actions[]`, nhưng chưa ai trong repo dùng tới. Pull (Figma → Studio) đọc ngược các phần trên. Pull để phase sau,
không bắt buộc.

## 5. Các phát hiện liên quan (bạn chưa quyết)

**W-58 · chuỗi hành động và ô bắt buộc.**

- *Chuỗi hành động* ("rồi hiện toast", "rồi chuyển màn"): **đề xuất làm trong B1** dưới dạng `proto.run`. Ca W-52 cần
  nó: dòng trong sheet phải đặt biến rồi đóng sheet. Trong Figma đây cũng là "nhiều action".
- *Ô bắt buộc* ("Send invites" đóng modal khi email còn trống): **đề xuất không thêm hành động mới**. Gắn
  `value={vars.email}` (hai chiều), rồi viết
  `proto.if(vars.email === "", proto.set("emailError", "Enter an email"), proto.run(proto.close(), proto.toast({ title: "Invites sent" })))`,
  với `error={vars.emailError}` trên InputField.

  Có hai việc nhỏ:
  - vế "is empty" trong Conditional;
  - một mẫu sẵn trong Assets: "Form · required field".

  Có một cách khác, làm sau nếu cần: tick "Required" trên InputField và Play tự chặn. Cách này nhanh hơn cho người dùng,
  nhưng Figma không có, và nó là một cơ chế thứ hai song song.

**W-51 · Smart animate và easing.** Đề xuất **tách khỏi B**, làm sau B1:

- *Easing*, tier S. Tuỳ chọn mới `easing` trong `ProtoOptions`, chọn một trong 4 token
  `Motion/Ease/Standard · Emphasized · Exit · Linear`. Mặc định giữ Emphasized như Play hiện nay. Push sang Figma gửi
  đường cong tương ứng (`figma-proto.mjs` hiện cố định `EASING`).
- *Smart animate*, tier M. Play ghép layer của màn đi và màn đến theo đường tên layer, giống Figma. Play chỉ tạo chuyển
  động transform và opacity (FLIP, đúng harness `motion/no-layout-animation`). Khi reduced motion thì đổi thành fade.
  Push sang Figma là `SMART_ANIMATE`, Figma hỗ trợ sẵn. Phần này không phụ thuộc biến, nên làm song song được với B2.

## 6. Các phase, tier và dòng E2E

Dòng E2E tiếp nối PT-51 trong `tools/studio/e2e/scenarios/prototype.mjs`.

| Phase | Tier | Nội dung | Kiểm tra |
| --- | --- | --- | --- |
| **B1 · Code + Play** | M | `dialect.mjs` (`vars`, `expr`, `proto.set/if/run`, prop đọc biến). `protoVars.ts`. `protoModel` (ACTIONS, đọc và viết code). `runtime.tsx` (`protoHandler`, `ProtoActions.set/vars`). `playFlow.tsx` (state cấp lần chạy, Restart). `renderPage` (scope và cache). Phần nối với A (§2.4). Cập nhật spec dialect và tài liệu của Zen Agent/MCP. Chưa có UI mới: biến viết được bằng Code panel và MCP. | `dialect.selftest` và `protoVars.selftest` (parse, tính, viết lại). **PT-52**: W-52 bằng biến (chọn dòng thì ✓ và chip theo `dateRange`, Restart trả "Date"). **PT-53**: `cartCount + 1` giữ giá trị qua Navigate và Back. **PT-54**: Conditional theo `signedIn`. **PT-55**: Toggle hai chiều làm hiện một layer. |
| **B2 · Giao diện** | M | Mục Variables (§3.1), danh sách hành động và hai mục Set variable, Conditional (§3.2), nút Bind (§3.3), dòng "Prototype · this page" trong Local variables, dấu `{x}` trong Layers. Chữ ngắn tiếng Anh, theo design words. | **PT-56**: tạo, đổi tên (viết lại mọi chỗ dùng) và xoá biến đang dùng. **PT-57**: dựng lại ca W-52 chỉ bằng UI rồi Play. **PT-58**: Conditional dựng bằng UI. **PT-59**: undo từng bước, và Inspector label không phá locator ([[inspector-labels-break-e2e-locators]]). |
| **B3 · Push sang Figma** | M | `figma-proto.mjs` và `figma-push.mjs` (collection, reaction, binding, ghi chú phần mất), plugin `applyReactions`. | `figma-proto.selftest` và `figma-push.selftest`. Thử trên Figma thật (paste) một trang có 3 biến, Set, Conditional và binding. |
| B4 · Pull (tuỳ chọn) | S–M | `figma-pull.mjs` đọc SET_VARIABLE, CONDITIONAL và binding về `vars`. | `figma-pull.selftest` |
| W-51a · Easing | S | §5 | một dòng PT cho easing được ghi vào code và tới Play |
| W-51b · Smart animate | M | §5 | PT: layer cùng tên di chuyển, reduced motion thì fade |

Mỗi phase là một PR riêng, gate có scope (`npm run qa`), không cần `--all`. B1 phải xong trước B2 và B3. B2 và B3 chạy
song song được (khác file).

## 7. Câu hỏi mở (kèm đề xuất)

1. **Tên trong code:** `vars` hay `variables`? → **`vars`**: ngắn, cùng chữ khi khai báo và khi đọc, không trùng với
   token "Variables".
2. **Tạo biến ở đâu?** → **Tab Prototype › Variables**, kèm lối vào "Prototype · this page" trong Local variables. Không
   tạo collection prototype nằm lẫn với token.
3. **Phạm vi:** một trang hay cả project? → **Một trang**, vì Navigate chưa sang được trang khác.
4. **Prop gắn với phép so sánh** (`vars.x === "…"`, `!vars.x`), vượt ngoài Figma? → **Có**, chỉ ba dạng ở §2.3. Không
   có nó thì dấu ✓ của từng dòng cần một biến boolean riêng cho mỗi dòng. Push ghi giá trị đầu kèm ghi chú. Nút Bind cho
   Visible viết `hidden={!vars.x}` (dễ đọc hơn), và chấp nhận mất khi push.
5. **Control hai chiều** (Toggle, ô nhập gắn biến tự ghi vào biến)? → **Có**. Thiếu nó thì ô bắt buộc (W-58) không làm
   được.
6. **Mode và Set variable mode?** → **Không làm trong B.** Nếu cần (Light/Dark, ngôn ngữ trong Play) thì làm thành một
   hành động "Set mode" trên token mode, ở một đề xuất riêng.
7. **Nối chuỗi và tính toán trong prop** (`"Cart (" + vars.cartCount + ")"`)? → **Không làm trong B.** Figma cũng chỉ
   gắn một biến. BadgeCounter đọc trực tiếp số.
8. **Chuỗi hành động (`proto.run`) vào B1?** → **Có**: đây là phần đầu của W-58 và ca W-52 cần nó.
9. **Ô bắt buộc (W-58)?** → Làm bằng Conditional, vế "is empty" và một mẫu trong Assets. **Không** thêm cơ chế
   "Required" riêng.
10. **Smart animate và easing (W-51)?** → Làm sau B1 và tách khỏi B: easing là S, smart animate là M.
11. **Biến có giữ lại giữa các lần Play?** → **Không.** Mỗi lần Play và mỗi Restart đều bắt đầu từ giá trị đầu, giống
    Figma.
12. **Có làm Change to (interactive component) không?** → **Không.** A đã lo phần này cho các control của Zen. Component
    local (`<Use>`) để sau, nếu walk tiếp theo cần.

# Quy trình QA toàn bộ component trên Codebase Platform

Mục tiêu: mỗi lần "audit và QA lại hết component" đều chạy cùng một quy trình, có bằng chứng, và mỗi lỗi hệ thống tìm được sẽ thành một rule harness hoặc một dòng guideline để không lặp lại. Quy trình này dùng cùng skill [`zen-platform-qa`](../../skills/zen-platform-qa/SKILL.md). Hướng dẫn viết example nằm ở [example-patterns](../guides/example-patterns.md). So Figma theo [figma-to-platform-workflow](../figma-to-platform-workflow.md).

## 0. Chuẩn bị

- Kiểm tra dev server: `curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/`. Nếu server đã chạy thì dùng lại, không mở thêm server trên cổng khác.
- Nếu có nhiều session cùng sửa Zen-DS, báo trước session đang giữ `tools/usage-guard/*` (xem memory *Peer session coordination*). Trước mỗi lần ghi phải đọc lại file, chỉ sửa bằng thay thế nhỏ hoặc nối thêm, và không ghi đè cả file.
- Figma file `9nZv4uW2LT21yuHabMTCh1` chỉ đọc; không bao giờ sửa file Figma.

## 1. Cổng tĩnh (nhanh, chạy trước)

```bash
npx tsc --noEmit -p .
npm run usage:check          # rule dùng component: JSX của src/platform và src/components (trừ stories) + CSS
npm run usage:selftest       # mỗi rule có case trong fixtures/bad.* và good.* sạch
npm run guidelines:check     # docs/guidelines đồng bộ với guidelines.source.mjs
node tools/figma-contract/run-all.mjs   # hợp đồng Figma ↔ component
```

## 2. Audit runtime (Playwright)

```bash
npm run platform:audit                      # mọi trang, 1512 + 390, quét cả playground
npm run platform:audit:full                 # 1512 + 1024 + 390 và smoke-click mọi nút trong example
node tools/platform-audit/audit.mjs --dark  # dark mode
node tools/platform-audit/audit.mjs --pages=chat,bottom-sheet --smoke   # chỉ các trang vừa sửa
```

| Loại | Mức | Ý nghĩa và cách xử lý |
| --- | --- | --- |
| errors | lỗi | Console error hoặc exception, kể cả do smoke-click. Sửa trong component hoặc example. |
| overflow | lỗi | Trang bị cuộn ngang, hoặc phần tử tràn khỏi stage/preview. Sửa layout responsive; stage có `overflow-x:auto` có chủ đích thì được bỏ qua. |
| images | lỗi | `<img>` hỏng. |
| names | lỗi | Control không có accessible name, ví dụ Segmented icon-only hoặc field không label. |
| nesting | lỗi | Phần tử tương tác lồng trong button hoặc link. |
| playground | lỗi | Đổi một control của playground làm vỡ trang. |
| edges | lỗi | Chữ cách mép trong của khung chứa nó (phần tử có màu nền khác nền phía sau, hoặc có viền) dưới 8px ở hai bên, hoặc dưới 4px trên/dưới. Đây là lỗi thiếu padding, ví dụ `List inset="none"` trên nền trắng, hay một dòng chữ trong popover không có padding item. Sửa bằng inset hoặc padding theo token; không tắt check. Trường hợp cố ý thì đánh dấu `data-audit-skip-edges` kèm lý do. |
| surfaces | lỗi | Box nền Surface/Default nằm trên trang Canvas/Alt (cùng màu) mà không có viền khép kín (§11). |
| sizes | lỗi | Avatar, Dock Icon hoặc Icon hiển thị sai kích thước khai báo hoặc không vuông. Nguyên nhân thường là một rule layout ép `width: 100%` cho mọi phần tử con (ví dụ `.zen-side-panel__body > *` từng kéo Avatar thành 376×56). |
| typography | lỗi | Chữ trong preview hoặc trong overlay được portal ra `.official-portal-root` (Dialog, Side Panel, Toast, Tooltip, Popover…) lại dùng typography Zen-Platform của khung platform (Heading font TASA Explorer, letter-spacing giãn), thay vì `data-typography` của preview (mặc định Dashboard, theo chip Typography). Sửa ở container: portal root và mọi vùng preview phải mang `data-typography`; không đặt font riêng cho từng example. |
| device | lỗi | Phần chat không khớp khung: ChatThread/ChatComposer desktop trong điện thoại, bản mobile trong cửa sổ desktop (`.pe-chat-desktop`), example chat (kể cả dòng Conversation-List) không nằm trong khung thiết bị nào, hoặc message desktop còn dùng nhấn giữ của mobile. |
| outline | lỗi | Outline heading trong mỗi example hoặc preview playground: hơn một `h1`, nhảy cấp khi đi xuống (`h1` → `h3`), hoặc heading to hơn heading chứa nó. Rule nằm ở mục Typography › Content hierarchy. Sửa bằng cấp heading (level, `headingLevel`), không đổi cỡ chữ. |

Với `--smoke`, `sizes`, `edges`, `typography` và `device` còn chạy lại sau mỗi cú bấm vào example, nên kiểm được cả dialog, side panel, sheet và popover chỉ xuất hiện khi mở.
| ids | cảnh báo | Id trùng. Trong example dùng `useId()` để không trùng khi render hai lần. |
| targets | cảnh báo | Trên mobile, hit area nhỏ hơn 24×24 (WCAG 2.5.8). Thêm lớp `::after` vô hình tối thiểu 24px. |
| contrast | cảnh báo | Chữ dưới 3:1. Nếu do palette Figma thì ghi vào mục "Chấp nhận" bên dưới; không tự đổi màu so với Figma. |

Lệnh trả exit code 1 khi còn lỗi. Chỉ chuyển sang bước sau khi không còn lỗi nào.

## 3. Kiểm tra bằng mắt (bắt buộc)

Audit DOM không thấy được một nút bị bẹp, icon phóng to hay CTA lệch hàng. Phải chụp và xem từng card:

```bash
npm run platform:shoot -- <page>                          # mọi card + contact sheet → .platform-shots/<page>-1512.png
npm run platform:shoot -- <page> --width=390              # mobile
npm run platform:shoot -- <page> --title="Long content" --click="Read the terms" --width=390   # trạng thái sau thao tác
npm run platform:shoot -- --compose=out.png "Figma=figma.png" "Platform=.platform-shots/x.png" # đặt cạnh nhau
```

Khi xem ảnh, dò theo danh sách lỗi đã từng gặp:

- **Nút nhỏ bị kéo giãn** (2xs–sm full width) → harness `button/small-full-width`.
- **Nút trong cột flex bị bẹp**: `flex: 1` có basis 0 trong `flex-direction: column` (lỗi footer dọc của Bottom Sheet) → dùng `flex: 0 0 auto`.
- **Icon phóng to** do `size` không phải token (`"small"`) → harness `icon/size-token`.
- **Field co lại theo nội dung** trong một container flex-column: `.zen-input-field` có `align-self: start` (dành cho grid), nên trong flex column nó thành "hug". Container phải đặt `> .zen-input-field { align-self: stretch }` như ModalForm và Bottom Sheet.
- **Thread chat mất tin cũ** do `justify-content: flex-end` → dùng `margin-top: auto` (harness `layout/scroll-anchor-flex-end`).
- **Thêm `white-space: nowrap` làm tràn layout**: text nowrap nằm trong một grid/flex item có `min-width: auto` sẽ đẩy container rộng ra thay vì hiện "…". Khi thêm nowrap, mọi tổ tiên là flex/grid item (ví dụ `.zen-list`) phải có `min-width: 0`. Chạy lại `platform:audit` ở 390px sau mọi thay đổi về nowrap hoặc truncate.
- **Class `pe-*` trùng tên**: `.pe-summary` cũ đặt `width: min(240px, 100%)` làm hỏng bảng tổng tiền. Grep `platform.css` trước khi đặt tên class mới.
- **CTA lệch hàng giữa các card**: content phải `flex: 1` và CTA ghim ở đáy.
- **Tooltip hoặc popover đè header**, tiêu đề bị cắt, trạng thái rỗng không có hành động.
- **Status bar của `PlatformPhone` đè lên Top Navigation**: khung máy vẽ status bar và home indicator phía trên app. Top Navigation, Bottom Navigation, Bottom Sheet và composer phải pad theo `--zen-safe-area-top/-bottom`. Lỗi này không gây overflow nên chỉ ảnh chụp mới thấy.
- **Chữ không khớp số lượng** ("2 address", "1 items") → harness `copy/plural-count`.
- **Màu trạng thái sai ngữ nghĩa**: storage 92% vẫn xanh → `scale="quota"`.

Bắt buộc xem ở 390px cho mọi component mobile (Top/Bottom Navigation, Bottom Sheet, Chat, AI Chat, Chart) và mọi example có `PlatformPhone`.

## 4. Đối chiếu Figma

1. Tìm node cụ thể trong Figma (xem memory *Zen DS project map* để có node id), rồi `get_screenshot` node đó.
2. Chụp example hoặc playground tương ứng bằng `platform:shoot`, rồi dùng `--compose` đặt hai ảnh cạnh nhau.
3. So sánh: kích thước (avatar, icon, hit area), typography style, màu token, trạng thái (selected, unread, failed), khoảng cách, bóng.
4. Nếu một hợp đồng trong `docs/figma-contracts/*.json` lỗi thời (Figma đã đổi), đọc lại variant bằng `use_figma`: chạy `tools/figma-contract/figma-console-extract.js`, thay `window.` bằng `globalThis.`. Output giới hạn khoảng 20KB, nên chỉ trích đúng variant cần. Sau đó vá JSON và chạy lại `run-all.mjs`.
5. Chỗ nào chủ ý khác Figma thì ghi rõ lý do, ví dụ quyết định của người dùng: nhãn Popover chỉ một dòng, cắt bằng "…". Lỗi nằm ở phía Figma thì ghi vào mục "Vấn đề phía Figma" để báo người dùng; không tự sửa.

## 5. Vòng sửa

| Lỗi ở đâu | Sửa ở đâu |
| --- | --- |
| Component (CSS/TSX) | `src/components/<X>`; cập nhật story nếu API đổi |
| Example hoặc playground | `src/platform/Platform*Showcases.tsx`, `PlatformExamples.tsx`, `PlatformMobile*.tsx` |
| Lỗi có thể lặp lại | Thêm rule vào `check-usage.mjs`, case `expect:` trong `fixtures/bad.*`, case sạch trong `good.*`, và một dòng Do/Don't trong `guidelines.source.mjs` |
| Thiếu kịch bản | Thêm example theo ma trận trong [example-patterns](../guides/example-patterns.md) |

Sau mỗi đợt sửa, chạy lại bước 1, bước 2 (trên các trang đã sửa, kèm `--smoke`) và bước 3 cho các card đã sửa.

## 6. Kết thúc

- Chạy toàn bộ bước 1, `platform:audit:full` và `--dark`.
- Thêm một mục vào `docs/context/session-log-<ngày>.md`: đã sửa gì, rule mới, phần còn lệch.
- Báo các session đang chạy song song về những thay đổi chạm vào phần họ phụ trách.
- Báo cáo cho người dùng: lỗi đã sửa, example mới, rule mới, và danh sách "Chấp nhận" / "Vấn đề phía Figma".

## Chấp nhận (cảnh báo đã biết, theo palette Figma)

- Chữ trắng trên nền Solid Accent/Positive/Support (dưới 4.5:1 với một số hue).
- Chữ viết tắt (initials) trên Avatar màu đặc, ví dụ "BN" 2.93:1, "CT" 2.73:1.
- Nhãn khi không được chọn của Bottom Navigation Default dùng Content/Placeholder (1.92:1), đúng như Figma.

## Vấn đề phía Figma (báo người dùng, không tự sửa)

Hiện không còn vấn đề nào.

Lỗi FileIcon `Format=Photo` từng là bản sao của PDF. Designer đã sửa trong Figma, và code được đồng bộ lại ngày 2026-09-27.

Khi Figma sửa một lỗi đã báo, đồng bộ lại như sau:
1. Xuất SVG từng biến thể bằng `use_figma` (`exportAsync({ format: "SVG_STRING" })`).
2. So hash của từng path với dữ liệu trong code, để chỉ cập nhật đúng biến thể đã đổi.
3. Kiểm tra lại hash sau khi ghi.
4. Chụp ảnh đặt cạnh Figma bằng `platform:shoot -- --compose`.

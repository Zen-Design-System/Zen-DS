# Biểu đồ: Figma ↔ code (2026-10-17)

User: "Kiểm tra lại component chart của Figma và Studio đã đồng bộ chưa. Tôi thấy pie chart Figma không có bo góc", rồi
"có, so tiếp các biểu đồ còn lại". So 13 bộ trong file Zen `9nZv4uW2LT21yuHabMTCh1` với `src/components/Chart/*` và ảnh
chụp trang Chart của platform (1512). Năm nhánh đọc song song (chỉ đọc), mỗi nhánh tối đa 3 biểu đồ; lỗi chắc chắn đã
sửa trong phiên này. Ảnh chụp ở scratchpad của phiên (`chart-audit/`).

## 1. Đã sửa

| Bộ | Lệch | Sửa |
| --- | --- | --- |
| Donut 15324:80365 (32 variant) | lát cắt không bo góc (code bo 4px) | 160 vector `cornerRadius` 0 → 4 |
| Bar-Chart dọc (8 variant) | Average rule `strokeCap` NONE: nét chấm 0.01/6 không hiện | ROUND |
| Bullet 15968:130554 | khung Goal (40) và Rows cắt nội dung: vạch mục tiêu cụt 4px dưới | tắt cắt nội dung (6 Goal, 2 Rows) |
| Bar-List 15487:2473 | thanh dẫn đầu 78% track (user 2026-10-14: theo tỷ lệ giá trị) | Fill = track × giá trị / giá trị lớn nhất |
| Radial, Donut (code) | legend start/end: hộp vòng lấy bề rộng SVG (300px), legend bị ép, chữ xuống dòng | `chart.css`: hộp vòng bắt đầu ở cỡ vòng (`flex: 0 1 var(--zen-chart-size)`) |
| Plugin import | lát cắt Donut mất nối tròn (vectorPaths đặt lại mitre) | plugin 275faae |
| Dán thẳng | khung có bo góc ra vuông; cột Stack-Bar vuông (nội dung slot thiếu bo góc, clip của slot) | `figma-native.mjs`, `native-pack.mjs` |
| Xuất Stack-Bar (dán thẳng và plugin) | cột vẫn vuông: góc bo của slot nằm trên hàng trống phía trên cột | `figma-charts.mjs`: cột là khung `Stack` riêng, bo Corner-Radius/Small, cắt nội dung |

## 2. Cần designer / user quyết

1. **Nhãn X đang chọn** (Line, Multi-Line, Stack-Bar, Bar): code là pill 20px ôm chữ, Label/Small/Medium; Figma là pill
   rộng cả sector, cao 16, Label/Small/Bold (`.Primitives/Chart/Sector` Select=Selected). Spec family §2 ghi "20px pill".
2. **Cột/nhóm không chọn mờ 88%** (Stack-Bar, Grouped, Combo trong code); Figma để 100%.
3. **Bar-Chart 12 cột**: code ẩn một nửa nhãn X khi > 8 cột trong ≤ 400px vì pill có padding 8; Figma dùng padding 4 nên
   hiện đủ 12. Đổi padding nhãn của Bar về 4 thì bỏ được việc ẩn nhãn.
4. **Vị trí Tooltip**: code neo theo vị trí điểm trong vùng vẽ (lệch về phía trong ở hai đầu), Figma căn giữa cột
   (Line, Bar, Stack-Bar, Heatmap); Tooltip của Line/Stack nằm ở top 2px (code) hay y −8 (Figma).
5. **Lane trục** (36/28 code, 38/26 hoặc 6 Figma) và chiều cao mặc định (Stack 236 vs 192/212; Area/Grouped/Combo 280 vs 220).
6. **Heatmap**: chữ ô cao 24 cố định (code) hay theo token mật độ Element-Size/Popular/Medium (Figma); khoảng lưới → thang
   8 (Figma) hay 16 (code, đã có trong BACKLOG).
7. **Funnel/Chart Card**: mô tả → giá trị cách 8 (code, margin 4) hay 4 (Figma).
8. **Color = Primary | Secondary** có trong mọi bộ Figma, chưa có trong code (BACKLOG P1, chờ duyệt).

## 3. Việc Figma còn thiếu (dựng thêm, chưa làm)

- Line, Multi-Line: chấm điểm đang chọn (code 10px, nền Surface, viền 2px) không có trong Figma; Multi-Line chỉ có chấm
  của đường so sánh.
- Area Type=Stacked: không có trạng thái chọn (rule, chấm mỗi đường, Tooltip tổng, pill X).
- Grouped, Combo: không có khung trạng thái chọn.
- Radial: variant mặc định là Small (Figma lấy variant đầu); code mặc định Medium.
- Bar-List: chữ tên dài không cắt ba chấm (code có ellipsis).

## 4. Việc code nhỏ (chưa làm)

- Nét lưới: CSS `dashed` (Chrome vẽ 3/2) so với 4/4 của Figma, cả họ biểu đồ.
- JSDoc còn id cũ: Chart.tsx (Stack 6643:73471 → set 15930:4271), BarChart.tsx, GroupedBarChart.tsx (15485:2457 → 15933:120083),
  ComboChart.tsx (15485:2519 → 15934:7580), GaugeChart.tsx (15486:2467 → set 15968:130382).
- Line: nắp và nối nét (code tròn, Figma NONE/MITER); đường cong (code Bézier ngang, Figma polyline bo 30).

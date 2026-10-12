# UI Foundations — curriculum outline (approved 2026-10-12)

The content source for the deck in Figma and for the HTML slides later. 4 parts, 15 lessons, 100 pages; page 1 is the
cover, page 2 the contents. Headlines are the English slide titles; "Ý chính · Minh hoạ" is the key point and the
illustration (Zen DS components and tokens). Written in Vietnamese, as agreed with the user.

**Quy ước chung:**
- **Khung và bố cục:** slide ngang 16:9. Trang nội dung theo bố cục A (Editorial split).
- **Chữ:** headline trên slide viết tiếng Anh. Keynote tiếng Việt nằm cạnh mỗi trang.
- **Nhịp mỗi bài:** trang mở bài (mục tiêu và phần việc dự án), 3–6 trang tóm ý, rồi trang bài tập. Mỗi bài tập là một mảnh của dự án cuối khoá.
- **Minh hoạ:** dựng từ component và token Zen DS.
- **Chuẩn bị chuyển HTML:** auto layout toàn bộ.

## Phần 1 · Introduction (tr. 3–9)
Trang 3 là trang mở Phần 1.

**Lesson 01 · The UI craft** (tr. 4–9). Mục tiêu: phân biệt UI/UX và các vai trò, hiểu stakeholder, biết mô hình công ty. Dự án: chọn đề tài và viết brief.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 4 | Drawing screens or solving problems? | Mở bài · dải component Button, Toggle, Badge, Chip |
| 5 | UI is the tip, UX is the iceberg | 5 tầng Garrett (2002), UI giữ 2 tầng trên · sơ đồ 5 tầng |
| 6 | Who does what in a product team? | 6 vai trò, mỗi vai một câu hỏi · thẻ vai trò (Badge) |
| 7 | The people at your table | PO/PM, BA, Dev, QA, Marketing/BOD/khách · sơ đồ quan hệ (Avatar) |
| 8 | Where will you work? | Agency, in-house, outsource, startup, freelance, remote · thẻ mô hình |
| 9 | Exercise: Pick your project | Brief 3 câu + 3 sản phẩm tham khảo · form Text Field + Button |

## Phần 2 · Foundations (tr. 10–61)
Trang 10 là trang mở Phần 2.

**Lesson 02 · Figma essentials** (tr. 11–17). Mục tiêu: dùng thành thạo UI3, Frame, Auto layout, Constraints, cộng tác. Dự án: tạo file dự án và moodboard.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 11 | Your shared workshop | Mở bài · sơ đồ cửa sổ Figma |
| 12 | UI3 in one minute | Toolbar dưới, panel trái/phải, canvas · sơ đồ UI3 có chú thích |
| 13 | Frame, group, section | Vùng chứa có layout, gom tạm, tổ chức canvas · 3 hộp so sánh |
| 14 | Auto layout: screens that stretch | Direction, gap, padding, hug/fill/fixed · Button Zen đo padding, gap |
| 15 | Constraints & resizing | Pin trái/phải/giữa/scale · khung trước và sau khi kéo giãn |
| 16 | Work together, live | Comment, version history, branching, Dev Mode · Avatar stack + Tooltip |
| 17 | Exercise: Build a card with auto layout only | Card co giãn đúng ở 3 độ rộng |

**Lesson 03 · Design process** (tr. 18–23). Mục tiêu: nắm Design Thinking, Double Diamond, đầu ra từng bước. Dự án: persona và user flow.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 18 | From problem to product | Mở bài |
| 19 | Design thinking in five steps | Empathize → Define → Ideate → Prototype → Test, lặp lại · vòng 5 bước |
| 20 | The double diamond | Discover, Define, Develop, Deliver (UK Design Council, 2005) · hai hình thoi |
| 21 | Every step has an output | Research → persona, IA → sitemap, wireframe, UI, prototype, handoff · Stepper Zen |
| 22 | Wireframe → mockup → prototype | 3 mức độ trung thực · 3 màn hình lo/mid/hi-fi |
| 23 | Exercise: One persona, one flow | Persona 1 trang + flow luồng chính |

**Lesson 04 · Visual principles** (bài mới, tr. 24–30). Mục tiêu: nắm hierarchy, Gestalt, căn lề, khoảng trắng, điểm nhấn. Dự án: phân tích 3 màn tham khảo.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 24 | How eyes read a screen | Mở bài |
| 25 | Hierarchy decides reading order | Cỡ, độ đậm, màu, vị trí, khoảng cách · card đánh số thứ tự đọc |
| 26 | Gestalt: the brain groups for you | Proximity, similarity, common region, closure, figure-ground · chấm tròn |
| 27 | Align everything to something | Đường căn, nhịp lặp, mẫu đọc F/Z · layout có đường căn |
| 28 | White space is content | Khoảng trong ≤ khoảng ngoài · card chật so với card thoáng |
| 29 | One loud thing per screen | Một CTA chính · Button Primary so với Flat |
| 30 | Exercise: Annotate three screens | Vẽ thứ tự đọc, nhóm và đường căn |

**Lesson 05 · Grid, layout & spacing** (tr. 31–36). Mục tiêu: dùng column grid, thang 4/8, breakpoint, radius. Dự án: grid và spacing scale.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 31 | The skeleton under every screen | Mở bài |
| 32 | Columns, gutters, margins | 12 / 8 / 4 cột · lưới phủ trang |
| 33 | A spacing scale of 4 and 8 | 4–64, token Zen Spacing · thang thanh ngang |
| 34 | Breakpoints & responsive | Window classes của Material 3 (600 / 840 / 1200 / 1600) · 3 thiết bị |
| 35 | Corners that nest | Bo ngoài = bo trong + padding · token Corner-Radius |
| 36 | Exercise: Set up your grid | Grid desktop + mobile, áp dụng vào 1 màn |

**Lesson 06 · Typography** (tr. 37–42). Mục tiêu: phân biệt typeface/font, nắm 4 thông số, type scale, đặt tên text style. Dự án: bộ text style.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 37 | Type is most of the interface | Mở bài, trích “Web design is 95% typography” (Reichenstein, 2006) |
| 38 | Typeface vs font | Serif, sans, mono, kiểm tra dấu tiếng Việt · mẫu chữ |
| 39 | Four numbers that matter | Cỡ chữ, line-height 1.4–1.6, tracking, 45–75 ký tự/dòng · đoạn văn có chú thích |
| 40 | Type scales | 1.125 / 1.2 / 1.25 / 1.333 · thang chữ Zen |
| 41 | Name styles by role, not size | Display, Heading, Body, Label, Caption · danh sách style Zen |
| 42 | Exercise: Your type system | Chọn font, thang chữ, 8–10 text style |

**Lesson 07 · Color & accessibility** (tr. 43–49). Mục tiêu: hiểu nhóm màu, dựng thang màu, contrast theo WCAG 2.2, light/dark. Dự án: palette và màu semantic.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 43 | Color carries feeling and function | Mở bài |
| 44 | The color groups of a UI | Brand, neutral, accent, semantic · swatch biến Zen |
| 45 | Build colors as scales | 10–12 bậc, HSB/OKLCH · thang Brand-Ananas 1–12 |
| 46 | Contrast by the numbers | AA 4.5:1, chữ lớn và UI 3:1, AAA 7:1, APCA · cặp màu kèm tỉ lệ |
| 47 | Never color alone | Kèm icon/chữ, ~8% nam giới mù màu đỏ–lục · Inline Message, Toast |
| 48 | Light and dark | Đổi mode qua semantic token · card light và dark |
| 49 | Exercise: Your palette | Palette + semantic + kiểm tra contrast |

**Lesson 08 · Icons, imagery, elevation & motion** (tr. 50–55). Mục tiêu: icon nhất quán, ảnh, độ nổi, chuyển động. Dự án: bộ icon và elevation.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 50 | Details that bring a UI to life | Mở bài |
| 51 | One icon set, one style | Line và solid, lưới 24px, có nhãn · cặp icon Zen |
| 52 | Images and aspect ratios | 1:1, 4:3, 16:9, alt text · khung Aspect-Ratio |
| 53 | Elevation means something | Level 1 card → level 4 dialog · Shadow Level 1–4 của Zen |
| 54 | Motion: fast and purposeful | 100–300 ms, easing, reduced motion · đường easing |
| 55 | Exercise: Polish one screen | Icon + elevation + 1 chuyển động |

**Lesson 09 · Platform guidelines** (bài mới, tr. 56–61). Mục tiêu: dựa vào Material 3, Apple HIG, quy ước web. Dự án: chọn nền tảng và rà lại thiết kế.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 56 | Don’t reinvent the wheel | Mở bài |
| 57 | Material 3 and Apple HIG | So sánh, Liquid Glass từ iOS 26 · 2 cột |
| 58 | Minimum touch targets | 44pt (Apple), 48dp (Material), tối thiểu 24px (WCAG 2.2) · ô vùng chạm |
| 59 | Familiar navigation | Tab bar 3–5 mục, sidebar, top bar · Tab Bar, Top Navigation Zen |
| 60 | Jakob’s law | Người dùng quen sản phẩm khác, giữ quy ước |
| 61 | Exercise: Platform check | Rà vùng chạm và điều hướng |

## Phần 3 · Systems (tr. 62–94)
Trang 62 là trang mở Phần 3.

**Lesson 10 · Atomic design** (tr. 63–67). Dự án: phân rã 1 màn theo 5 cấp.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 63 | Build interfaces like LEGO | Mở bài |
| 64 | Brad Frost’s five levels | Atoms → Pages (blog 2013, sách 2016) · sơ đồ lồng nhau |
| 65 | Atomic, the Zen way | Icon/Badge → Text Field → Dialog, Top Nav · component Zen theo cấp |
| 66 | A mental model, not a pipeline | Đi qua lại giữa các cấp · vòng lặp |
| 67 | Exercise: Break a screen down | Tách 1 màn hình thành 5 cấp |

**Lesson 11 · Figma for systems** (bài mới, tr. 68–73). Dự án: 5 component đầu tiên.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 68 | Components, variants, variables | Mở bài |
| 69 | One main, many instances | Sửa một nơi, cập nhật mọi nơi · main → instance |
| 70 | Variants and properties | Size, state, level, boolean, text, swap · lưới biến thể Button Zen |
| 71 | Variables and modes | Light/dark, brand, density · bảng biến |
| 72 | Publish a library | Publish, update, Dev Mode, Code Connect · sơ đồ |
| 73 | Exercise: Your first five components | Button, Input, Checkbox, Badge, Card |

**Lesson 12 · UI elements & patterns** (tr. 74–80). Dự án: ≥10 component và 3 pattern.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 74 | From buttons to patterns | Mở bài |
| 75 | Four families of components | Input, navigation, information, container · lưới component Zen |
| 76 | Every component has states | Default → error/loading · các state của Button, Text Field |
| 77 | Pattern: forms | Label trên field, lỗi dưới field, một cột · form Zen |
| 78 | Pattern: empty, error, loading | Empty State, Skeleton, Inline Message |
| 79 | Pattern: feedback | Toast, inline, dialog: khi nào dùng cái nào |
| 80 | Exercise: Library + three patterns | |

**Lesson 13 · Design tokens** (tr. 81–86). Dự án: token màu, spacing, radius.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 81 | One language for design and code | Mở bài |
| 82 | What is a token? | Giá trị mang tên, chuẩn W3C DTCG · hex → token → Button |
| 83 | Four tiers | Primitive → Base (brand) → Semantic (mode) → Component (theme) · chuỗi token Zen |
| 84 | Name it like a sentence | category-property-role-variant-state · giải phẫu tên token |
| 85 | From Figma to code | Variables → JSON → CSS `--zen-*`, SwiftUI, Flutter · pipeline |
| 86 | Exercise: Tokenise your foundations | |

**Lesson 14 · Design systems** (tr. 87–94). Dự án: lắp ráp một design system mini.

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 87 | A product that serves products | Mở bài |
| 88 | Style guide, UI kit, pattern library, design system | Vòng lồng nhau |
| 89 | Anatomy of a design system file | Primitives → Foundations → Library |
| 90 | Retrofit or greenfield? Build or borrow? | MUI/Ant, Headless, tự xây · thẻ ưu/nhược |
| 91 | Six steps to build one | Audit → … → Maintain · Stepper |
| 92 | Docs and governance | Do/don't, props, a11y, changelog · trang tài liệu mẫu |
| 93 | Learn from the best | Material 3, Fluent 2, Carbon, Polaris, Atlassian, Zen DS |
| 94 | Exercise: Assemble your mini system | |

## Phần 4 · Project (tr. 95–100)
Trang 95 là trang mở Phần 4.

**Lesson 15 · Project & showcase**

| Tr. | Headline | Ý chính · Minh hoạ |
|---|---|---|
| 96 | Your product, your system | Mở bài |
| 97 | The road so far | Mỗi bài tập là một mảnh của dự án · timeline |
| 98 | What to hand in | Foundations, ≥10 component có state, 5–8 màn, prototype, case study · checklist |
| 99 | How you’ll be graded | 4 tiêu chí, mỗi tiêu chí 25% |
| 100 | Showcase day | Trình bày 10 phút + trang kết |

So với giáo án cũ, sườn này thêm 3 bài: **Visual principles**, **Platform guidelines**, **Figma for systems**. Phần token (Lesson 13) là nơi duy nhất định nghĩa tầng token; Lesson 14 chỉ dẫn lại.

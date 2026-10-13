# UI Foundations deck — handoff (2026-10-12)

From the session "UI Foundations Figma review" (branch `claude/eloquent-ptolemy-lhe433`), whose context ran full. The
user (Đìzai Studio, writes Vietnamese) asked to hand the work over: "bàn giao qua session kia".

## The task

Rebuild the whole UI Foundations curriculum ("giáo án") as slides, from the user's material + Zen DS. 116 pages, the
approved outline is [`outline.md`](outline.md). The user's latest words: "bắt đầu làm lại slide giáo án theo concept
này" and "tăng letter spacing lên 1 tí cho title" (done in the mock: `-0.005em` → `0.02em`; carry it into Figma).
Nothing of the new concept is built in Figma yet.

## Approved direction

- **Concept** — old typewritten printed documents ("giống các tài liệu in đánh máy xưa"). Approved mock ("OK"):
  [`concept/typed-doc.html`](concept/typed-doc.html), render [`concept/typed-doc.jpg`](concept/typed-doc.jpg).
- **Frame** — 16:9, 1920×1080, layout "A · Editorial split": left column 820 px (handwritten margin note, big stacked
  title, deck sentence, typed `- - -` rule, 2–3 numbered points `(1)`); right: illustration on a pinned photo card
  (paper clip, slight rotation) + caption `Fig. N — …`. Typed header (course file + `Ref. No.: UIF-LL/PP` left, place
  and date + lesson right) over a typed `= = =` rule; footer `Đìzai® Studio · Zen DS` / `— NN —`; an ink stamp
  (`LESSON 01 / UI FOUNDATIONS · 2026`) on some slides. Paper `#efe8d8` with light noise and vignette; ink `#1b1a17`,
  soft ink `#4a463e`.
- **Copy** — slide text in English; a detailed keynote in Vietnamese beside each slide. Slides summarise; the keynote
  carries the detail.
- **Colour** — text stays monochrome; colour only inside illustrations, built from vectors + Zen components and
  variables (library ZEN Kaiz Official-Sep2026).
- **Type** — titles SG85 Chi Son 2 (line-height 0.8, letter-spacing 0.02em, unicase); script accent SG85 Saigon 1985
  for a few spots only ("phốt kèm": margin notes, names; it has no em dash glyph); body Fz Bohemian Typewriter.
- **Pipeline** — Figma is the source, converted to HTML slides later ("Figma làm nguồn, convert sau"): auto layout,
  local components, named layers, Zen variables.

## Fonts

- SG85: `src/assets/fonts/SG85/` (TTF for desktop, WOFF2 + `sg85.css` for HTML, `LICENSE.md`). Both cover Vietnamese.
- Fz Bohemian Typewriter is **not in git**: the repo is public and the font says "Free for non-commercial use only"
  (FontZin's Vietnamese version). The user said the HTML will not be published. Ask the user to upload
  `Fz-Bohemian-Typewriter.zip` again in your session, extract it in an empty scratch directory, keep it out of git.
- The Figma MCP cannot load SG85 or Bohemian. It runs on Figma's servers (Google Fonts + team shared fonts), the
  team plan is Pro (no shared fonts), and an SVG text with the real family falls back to Inter. Verified 2026-10-12.
- Decision (user, "cách 1"): build in Figma with stand-ins behind role text styles `Typed/*`; the user swaps the three
  families in Figma desktop (fonts installed) once a batch is final. After the swap the MCP can no longer edit those
  texts, so swap per finished batch, or swap back to the stand-in before asking for MCP edits.
  - Paytone One Regular → SG85-CHI SON 2 (user asked for a rounded stand-in; wider than Chi Son, so the swap only
    narrows text). Styles: Title Display 180, Title 112, Title S 48, Title XS 30, Stamp 34; line-height 80–100 %,
    letter-spacing 2 %, uppercase, leading trim to cap height.
  - Kalam Bold → SG85-Saigon 1985 (Script 54, Script S 34; closest width, 889 vs 860 at 100 px).
  - Courier Prime Regular → Fz Bohemian Typewriter (Deck 28, Body 26, Header, Rule, Caption 20, Label, Footer 18,
    Small 16, Keynote Head 22, Keynote 20). ~9 % wider than Bohemian. No bold anywhere: Bohemian has one style.
  - Each style's description names the real font. Widths at 100 px, "UI IS THE TIP,": Chi Son 483, Paytone 623.

## Figma state (file `WxivIlv1HgC9NEMwtw9MOS`, UI-Foundations)

- Page `10. Design System (Merged)` (710:61): done earlier (34 slides), plus typo fixes on pages 1–10.
- Page `UI Foundations · Giáo án 2026` (727:2), new concept, built 2026-10-12 (session "Figma requests auto-allow"):
  - `_Template · Typed` (749:433): `Typed/Paper` 749:434 (paper fill, NOISE + inner-shadow vignette), `Typed/Rule`
    749:439 (Style=Double 749:435 / Single 749:437), `Typed/Header` 749:440 (Left#749:0, Right#749:1), `Typed/Footer`
    749:446 (Left#749:2, Page#749:3), `Typed/Note` 749:449 (Note#749:4), `Typed/Point` 749:451 (Number#749:5,
    Text#749:6), `Typed/Stamp` 749:454 (Title#749:7, Sub#749:8; rotate the instance 9°), `Typed/Clip` 749:459,
    `Typed/TOC row` 749:460 (Number#749:9, Title#749:10, Page#749:11). Effect style `Typed/Photo shadow`.
  - Variables: collection `UIF Deck` (747:433, mode Paper): Paper/Base, Ink/Default, Ink/Soft, Photo/Surface,
    Photo/Edge, Clip/Metal, Note/Surface, Note/Edge (code syntax `var(--uif-*)`).
  - `00 · Opening` (751:435): 001 Cover 751:436, 002 Contents 751:597 (5 parts · 17 lessons · 116 pages).
  - `Lesson 01 · The UI craft` (754:669): 003 Part 1 754:670, 004 754:708, 005 754:775, 006 757:731, 007 757:818,
    008 757:923, 009 757:1010. Illustrations are the old Zen illustrations cloned into the pinned photo; their Anton /
    Libre Caslon labels were moved to `Typed/*` styles.
  - Slide anatomy (auto layout, ready for HTML): frame 1920×1080, padding 44/84/40/84 → Paper (absolute) · Header ·
    Main (Text column 820, gap 28: Note, Title, Deck, Rule, Points; Figure: Photo 846×640 rotated −1.2° + Clip + Caption)
    · Footer · Stamp (absolute). Keep points ≤ 45 characters and captions under a stamp ≤ 45 characters.
  - The superseded newspaper sections are gone from the file (removed by the user, 2026-10-13); the `Báo/*` text
    styles remain unused.
- Placement: one section per lesson, rows 2600 apart (`y = row × 2600`; 00 · Opening row 0, Lesson 01 row 1), slides
  at `x = 80 + i × 3200`, `y = 140`; section size = content + 80 right / 140 bottom.
- Keynote (user, 2026-10-13: "note nội dung giảng nên chi tiết hơn"): a GROUP (card rectangle + texts, not a frame, so
  it never becomes a presentation frame), 1040 wide, 60 right of its slide, height by content (≥ 1080, ~1100–1500).
  Head `Keynote · NNN · Name`, `Thời lượng: …`, typed rule, then sections (heading in `Typed/Keynote Head`, text in
  `Typed/Keynote`): Mục tiêu trang · Lời giảng (a speakable script with one running example) · Minh hoạ / Ví dụ ·
  Lỗi hay gặp · Hỏi lớp / Hoạt động (with minutes) · Chuyển ý (one line into the next page). Exercise pages: Hướng dẫn
  (timed steps), Tiêu chí, Lỗi hay gặp, Nộp bài, Review buổi sau.

## Zen keys (ZEN Kaiz Official-Sep2026)

Variables (import with `importVariableByKeyAsync`): ink `405d6d45bf73d56595d2c4f5fd31e174329af48e` · base
`f58749d8214b555b4238cee532402f3bf81e0412` · Canvas/Alt `8788dacce4375c9239df92233f62b12b4376eddd` · canvas
`945384780ce2571182cca64d13509a3ce5c2d783` · subtle `13bc78461511f25591a28abaaea22c25da6bb04f` · accent
`7741cf6bc49113198871974200e1bf151d34fe2c` · accentText `7402c914f4c8f169b1a048b1fe2fd05c8bfd71fc` · accentSoft
`14875126bb3f44deab957a19a4cbc5afa432ef3b` · yellow `69986b4e3de6af11ba65c9551efdd0b8a3fa7560` · pink
`5fca0e90998d3cd4ec95a15e566478c8a674bc8a` · blue `87929d27b3bd990a7bbb58ba4b8f6f21bc9fea6b` · green
`7a1eaa3e6b995dc6a62f0c305b1de76b8204cd60` · orange `5e9d7890c69c8996198d6fc640b56eae89bae648` · red
`b136c075d9de2ee272cb8bcd2bf85057b6991b87`.

Component sets (`importComponentSetByKeyAsync`): button `d47c79f66db5221b0e0ed5ed092be99c415ec2a6` (Text#1026:804) ·
textField `e98b29a6380d63ec5dbc74df9f6c4fb3d12b22f8` · toggle `9685499bb16e5adde62b70f3f09ede154e4768d9` · chip
`429d0424ba78d07ed3c210dcd6596a3855929ab4` · badge `e04184cde218771d3e734046e3aa3d9565c421f0` (Text#1537:0) · avatar
`b265695291520a35b77abf3e1c6b356a484cdb5e` · avatarStack `2ebaab32253aee4d20c12aa6511387c939109d49` · progress
`5fa68b850c2fa9279d8fe59dafcc695c8fbaaa90` · topNav `78a6be5df5f6d27f7a8f0f614828f8a0b8232a4d` · toast
`0d7a99c3e639cd9e6c8dd16b27dc38bdb289eb38` · inline `0268229da5d742f5d5ab9090b1e8ecfeeb077d25` · dialog
`a0f4c619c2215361db64cd5d96688bd898c0edf9` · stepper `a7bc2869d2cc60cbdd9147f5289bbca0b24f0939` · tabBar
`011887f6c65a545c3930917b1b0eb50aa8e73219` · checkbox `8c2ccea77198f44cd83b340cc1fc06dd9ffaba91` · skeleton
`a5f13a26db3b706c864325e3d948b39d78056c8a`; component empty `35c3a8e5538c71cadf44df322a6788d3ddf88a56`.

## Figma MCP gotchas met

- Answers over 20 KB fail: budget by UTF-8 bytes, split calls.
- `clone()` needs every font on the source loaded first.
- `findAllWithCriteria` skips instance sublayers (`I…` ids); use `findAll` for those.
- `hasMissingFont` is wrong unless that page is current.
- `.claude/settings.json` on this branch allows `mcp__Figma` (asks for `generate_image`); main does not have it yet.

## Next steps

1. Get the user's review of pages 1–9 (stand-in fonts) and apply their changes.
2. Lessons 02–17 by the outline, one section per lesson (DesignOps and AI workflow added 2026-10-12), Part dividers
   at pages 10, 62, 95 and 111. Illustrations from Zen components and variables (keys below).
3. When a batch is final: the user swaps the three families in the `Typed/*` styles in Figma desktop.
4. Later: HTML slides from the Figma source with the real fonts (`sg85.css` + the Bohemian TTF kept out of git).

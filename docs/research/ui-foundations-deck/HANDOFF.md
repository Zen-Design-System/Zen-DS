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
- The Figma MCP cannot load SG85 or Bohemian (`listAvailableFontsAsync` = Google Fonts + Figma defaults). Plan: local
  text styles named by role (title, script, body, header, caption, stamp, keynote) set to stand-ins of similar width,
  so the user swaps the family once per style in Figma desktop with the fonts installed. Stand-ins available in Figma:
  typewriter — Special Elite, Courier Prime, Cutive Mono; title — League Gothic, Bebas Neue, Anton, Staatliches,
  Fjalla One; script — Homemade Apple, Yesteryear, Dancing Script, Caveat. Widths not compared yet.

## Figma state (file `WxivIlv1HgC9NEMwtw9MOS`, UI-Foundations)

- Page `10. Design System (Merged)` (710:61): done earlier (34 slides), plus typo fixes on pages 1–10.
- Page `UI Foundations · Giáo án 2026` (727:2) holds the **superseded** newspaper concept: section `_Template`
  (727:108: components `Báo/Masthead` 727:109, `Báo/Footer` 727:119), `00 · Opening` (729:508: cover, contents),
  `Lesson 01 · The UI craft` (729:821: 7 English slides with notes beside them; the copy is reusable), local text styles
  `Báo/*` (Anton, UnifrakturMaguntia, Inter, Libre Caslon). Replace them with the new concept.
- Placement used: one section per lesson (`y = row × 1500`), slides at `x = 80 + i × 2800`, `y = 140`; the keynote is
  a GROUP (not a frame, so it never becomes a presentation frame) 720 wide to the right of its slide.

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

1. Pick the stand-in fonts by width; create the role text styles and local components (header, footer, rules, margin
   note, photo card + clip, stamp, keynote) in `_Template`.
2. Rebuild cover, contents, the Part 1 divider and Lesson 01 (pages 3–9) in the new concept; screenshot; get the
   user's review before going on.
3. Lessons 02–17 by the outline, one section per lesson (DesignOps and AI workflow added 2026-10-12).
4. Session log in `docs/context/session-log-<date>.md`.

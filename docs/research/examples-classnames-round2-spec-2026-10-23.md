# Example className, round 2 — spec card (2026-10-23, session B)

The 2026-10-12 coverage plan (`studio-figma-push-spec-2026-10-12.md` §8) merged its P3 and P4/P5 on 2026-10-13:
className in the examples went 219 → 112. Examples added since bring 177 className and 74 raw tags back. The user
asked for "the way that is better in the long run and most accurate" and approved three decisions in session B.

## Rule

A class whose CSS is a concept Figma has becomes the Zen prop for it, so the example round-trips to Figma and teaches the
API. A class Figma cannot express either stays as the example's own CSS:
- ch / rem widths (they follow the typography and density modes);
- a component's insides;
- motion;
- video, img and button media;
- a demo's focus ring;
- container queries Grid `stackBelow` does not cover.

Where Figma has the concept and Zen lacks it, a new prop is proposed (decisions below).

## Decisions (user, 2026-10-23)

1. **Card / ListBox content is an auto layout column** ("Content-Slot là cột auto layout").
   - Figma's Content-Slot is a vertical auto layout, so a child can Fill it.
   - In code the content area becomes a column whose `height="fill"` children take the card's height.
   - About 8 classes go: px-card-plan, px-layout-template, px-layout-cover and their bodies.
   - Library change (tier L): visual diff of every page with a Card or ListBox.
2. **`sticky` on Box / Stack** ("Thêm prop sticky cho Box").
   - Figma's Fix position when scrolling: `sticky="bottom"` (and "top").
   - It comes with the Studio field and Figma push / pull.
   - On the Studio canvas it is relative: it sticks only in Play, Present and export (memory: canvas sticky sticks to the window).
   - The 6 composer docks (Chat, AI Chat, AI UI) drop their sticky CSS and negative margins: each dock sits where it belongs in the layout.
3. **Fill + min width in wrapping rows** ("Đổi theo Figma").
   - A growing block in a wrapping row (`flex: 1 1 auto; min-width: 0`) becomes `width="fill"` with `minWidth` set to its natural width.
   - The wrap point may move by a few px.

## Chunks (one PR each)

| PR | Content | Tier |
| --- | --- | --- |
| 1 | Direct props: Card `maxWidth={420}` (calendar planner), Stack `maxWidth={420}` (schedule planner), Box `width="fill" maxWidth={360}` (colour picker panel); Fill + min width: date picker split, list-item search, search toolbar, toast title block | S |
| 2 | Card / ListBox content column (decision 1) | L |
| 3 | `sticky` prop + Studio + push / pull + plugin; the 6 docks (decision 2) | M |

Checks for each PR:
- static gates;
- `node tools/platform-audit/visual-diff.mjs` before / after on the pages touched (PR 1 and 3) or every page with a Card (PR 2): changed panels only where the wrap point moved, each looked at;
- for PR 3, push / pull selftests and a live Zen-file import.

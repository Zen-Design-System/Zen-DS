// Figma .Primitives/Input/Input-Content/Default 373:102481 (docs/figma-contracts/input-search-primitives.json): Size
// Small · Medium · Large × Default · Focused · Typing · Inputted · Disabled → InputContent. The text style and colour
// (Body/Small/Medium · Body/Base/Medium · Heading/4; Placeholder · Strongest · Disabled), the row's height and the
// 1.5 × 20 Cursor (Background/Active/Neutral/Solid): before the text after the 2px Spacing/Padding/3XSmall in Focused,
// after it in Typing. The root's width is Figma's fixed frame or the copy's, so it is not asserted.
import { child } from "./_chart-shared.mjs";

export default {
  contract: "docs/figma-contracts/input-search-primitives.json",
  setId: "373:102481",
  kind: "inputFieldsContent",
  root: ".zen-input-content",
  cases: (vp, { spec }) => ({ size: vp.Size.toLowerCase(), state: vp.State.toLowerCase(), text: child(spec, "Text").txt, cursor: true }),
  map: [
    { figma: "", dom: ":root", check: ["h"] },
    { figma: "Text", dom: ":root", check: ["text"] },
    { figma: "Cursor", dom: ".zen-input-content__cursor", check: ["size", "y", "fill"], when: (vp) => vp.State === "Focused" || vp.State === "Typing" },
    { figma: "Cursor", dom: ".zen-input-content__cursor", check: ["x"], when: (vp) => vp.State === "Focused" },
  ],
};

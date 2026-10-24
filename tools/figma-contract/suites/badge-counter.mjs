// Figma Badge-Counter (9535:33812): Size × Theme × Background, 126 variants (Inverse and On-Color are Solid only), from
// docs/figma-contracts/segmented-toggle-badge-avatarstack.json. Checks the container (height, fill, pill radius, no
// stroke) and the count: Text-Wrapper height and offset, the number's text style and colour, both centred (cxr, % of the
// badge's width). The count's width differs a pixel or two between macOS and CI's Linux and decides the badge's width
// above its min-width, so no width or x is asserted.
// Not measurable here: Medium Subtle binds Badge/Spacing/Medium/Horizontal-Padding (8) where Medium Solid binds
// Spacing/Padding/2XSmall (4), as code does for every Medium counter; with a one-digit count both stay at the 28px
// min-width, so only a longer count would show it (ask the designer). XSmall Orange/Solid alone pads its Text-Wrapper 2px.
import { at, textOf } from "./_chart-shared.mjs";

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "9535:33812",
  kind: "avatarBadgeCounter",
  cases: (vp, variant) => ({ size: vp.Size.toLowerCase(), theme: vp.Theme.toLowerCase(), background: vp.Background.toLowerCase(), value: textOf(at(variant.spec, "Text-Wrapper > Label")) }),
  map: [
    { figma: "", dom: ":root", check: ["h", "fill", "radius", "stroke"] },
    { figma: "Text-Wrapper", dom: ".zen-badge__text", check: ["h", "y", "cxr"] },
    { figma: "Text-Wrapper/Label", dom: ".zen-badge__text > span", check: ["cxr", "text"] },
  ],
};

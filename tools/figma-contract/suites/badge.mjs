// Figma Badge (260:4825): Size × Theme × Background, 126 variants (Inverse and On-Color are Solid only), from
// docs/figma-contracts/segmented-toggle-badge-avatarstack.json. Checks the container (height, fill, pill radius, no
// stroke), the Leading dot (size, padding offset, Light / On-* colour; XSmall has no Leading layer and code hides it), the
// Text-Wrapper (offset, height) and the Label's start (Text-Wrapper padding), text style and colour. Each variant renders
// twice: Remove off (hidden in Figma) and on (the Remove boolean: size, centred y, icon colour).
// The badge hugs its label, whose width differs a pixel or two between macOS and CI's Linux, so no width is asserted (nor
// the Remove's x, placed after the label).
import { at, textOf } from "./_chart-shared.mjs";

const lead = (vp) => vp.Size !== "XSmall";
const removed = (vp, props) => Boolean(props.remove);

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "260:4825",
  kind: "avatarBadgeBadge",
  cases: (vp, variant) => {
    const props = { size: vp.Size.toLowerCase(), theme: vp.Theme.toLowerCase(), background: vp.Background.toLowerCase(), label: textOf(at(variant.spec, "Text-Wrapper > Label")) };
    return [props, { ...props, remove: true }];
  },
  figmaExceptions: [
    ...["Sky", "Mint"].map((Theme) => ({ vp: { Theme, Background: "Solid" }, layer: "Remove/Vector", prop: "fill", code: "rgba(0, 0, 0, 0.86)",
      note: "Sky/Mint Solid Remove binds On-Colors (white) while their label and leading bind On-Brights, like Yellow Solid's Remove; code keeps On-Brights. Ask the designer" })),
    { vp: { Theme: "On-Color", Background: "Solid" }, layer: "Remove/Vector", prop: "fill", code: "rgba(0, 0, 0, 0.93)",
      note: "On-Color Remove binds Content/Neutral/Strongest (white in dark mode, on the white badge) while its label and leading bind On-White-Overlay/Strongest; code keeps the label colour. Ask the designer" },
  ],
  map: [
    { figma: "", dom: ":root", check: ["h", "fill", "radius", "stroke"] },
    { figma: "Leading", dom: ".zen-badge__leading", check: ["size", "x", "y"], when: lead },
    { figma: "Leading/Vector", dom: ".zen-badge__leading > .zen-icon", check: ["fill"], fillVia: "color", when: lead },
    { figma: "Text-Wrapper", dom: ".zen-badge__text", check: ["h", "x", "y"] },
    { figma: "Text-Wrapper/Label", dom: ".zen-figma-case-label", check: ["x", "text"] },
    { figma: "Remove", dom: ".zen-badge__remove", check: ["size"], when: (vp, props) => !props.remove },
    { figma: "Remove", dom: ".zen-badge__remove", check: ["size"], forceVisible: true, when: removed },
    // XSmall's hidden Remove keeps a stale y (4 in a 16px row); Small/Medium centre it as their auto layout does.
    { figma: "Remove", dom: ".zen-badge__remove", check: ["y"], forceVisible: true, when: (vp, props) => removed(vp, props) && vp.Size !== "XSmall" },
    { figma: "Remove/Vector", dom: ".zen-badge__remove > .zen-icon", check: ["fill"], fillVia: "color", when: removed },
  ],
};

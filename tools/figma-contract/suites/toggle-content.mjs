// Figma .Primitives/Toggle/Content 1526:5945 (docs/figma-contracts/segmented-toggle-badge-avatarstack.json): State ×
// Bold, the Label over the Subtext (Spacing/Gap/3XSmall). Code has no component of its own for it: it is Toggle's
// `.zen-toggle__content`, so each variant renders a Toggle (`bold`, `state`, the Subtext as `caption`, texts read from
// the variant) and is measured from the content. The primitive FILLs a 263px frame, code's the Toggle row, so widths
// are not asserted; heights, offsets, text styles and colours are.
import { child } from "./_chart-shared.mjs";

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "1526:5945",
  kind: "stbToggle",
  root: ".zen-toggle__content",
  cases: (vp, { spec }) => ({
    label: child(spec, "Label")?.txt,
    caption: child(spec, "Subtext")?.hidden ? undefined : child(spec, "Subtext")?.txt,
    bold: vp.Bold === "Yes",
    state: vp.State === "Disabled" ? "disabled" : undefined,
  }),
  // Open question (docs/context/QUESTIONS.md "Toggle caption", ask the designer): every Toggle (1526:5703) variant
  // overrides this Subtext to Caption/Regular 11/16, while the primitive says Body/Small/Regular 12/16. Code follows
  // the set (as Checkbox, Radio and the Table cells do).
  figmaExceptions: ["Default", "Disabled"].map((State) => ({
    vp: { State }, layer: "Subtext", prop: "text", code: "Inter 400 11px/16px ls=normal none",
    note: "Toggle overrides Subtext to Caption/Regular in all its variants; code follows the set, not the primitive's Body/Small/Regular (QUESTIONS.md, Toggle caption).",
  })),
  map: [
    { figma: "", dom: ":root", check: ["h"] },
    { figma: "Label", dom: ".zen-toggle__label", check: ["h", "x", "y", "text"] },
    { figma: "Subtext", dom: ".zen-toggle__caption", check: ["h", "x", "y", "text"] },
  ],
};

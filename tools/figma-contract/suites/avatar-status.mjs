// Figma .Primitives/Avatar/Status/XSmall/Disabled (217:7418): Size × Status, 16 variants, from
// docs/figma-contracts/segmented-toggle-badge-avatarstack.json. Code: `<AvatarStatus size status>` (an Avatar's `status`
// draws the same dot, sized by the avatar; avatar-single.mjs checks its place). Each variant renders the dot on its own:
// size, fill, OUTSIDE Border/Inverse ring (a spread shadow), radius.
const size = { XSmall: "xsmall", Small: "small", Medium: "medium", Large: "large" };

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "217:7418",
  kind: "avatarBadgeStatus",
  root: ".zen-avatar-status",
  cases: (vp) => ({ size: size[vp.Size], status: vp.Status.toLowerCase() }),
  // Figma-side slip: XSmall and Small Disabled bind Color/Background/Solid-Disabled-Alt (VariableID:7286:1241, Light/
  // Neutral/4), a variable deleted from Mode Colors (Semantic) — no longer listed, so not in tokens/source. Medium and
  // Large bind Color/Background/Solid-Disabled, which code uses at every size (QUESTIONS.md, designer batch 2026-10-24).
  figmaExceptions: ["XSmall", "Small"].flatMap((Size) => ["rgb(215, 215, 215)", "rgb(70, 70, 70)"].map((code) => ({
    vp: { Size, Status: "Disabled" }, layer: "(root)", prop: "fill", code,
    note: "binds the deleted variable Solid-Disabled-Alt (Neutral/4); code uses Solid-Disabled (Neutral/6) as Medium and Large do",
  }))),
  map: [
    { figma: "", dom: ":root", check: ["size", "fill", "radius"] },
    { figma: "", dom: ":root", check: ["stroke"], strokeVia: "shadow" },
  ],
};

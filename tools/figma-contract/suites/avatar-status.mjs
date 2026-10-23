// Figma .Primitives/Avatar/Status/XSmall/Disabled (217:7418): Size × Status, 16 variants, from
// docs/figma-contracts/segmented-toggle-badge-avatarstack.json. Code draws this dot only as an Avatar's `status` (the
// online dot, `.zen-avatar__status`), sized by the avatar: Small (8px, 2px ring) on 2XSmall–Large avatars, Medium (12/2)
// on XLarge, Large (16/3) on 2XLarge/3XLarge (Avatar/Single's Status instances). So each case renders an Avatar of a size
// that uses the variant's dot and measures from the dot: size, fill, OUTSIDE Border/Inverse ring, radius.
// Not rendered (cases → null): Status=Disabled/Pending/Inactive (code's `status` is a boolean, Active only; no API for the
// other three) and Size=XSmall (a 4px dot no Avatar size uses).
const avatarSize = { Small: "medium", Medium: "xlarge", Large: "2xlarge" };

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "217:7418",
  kind: "avatarBadgeAvatar",
  root: ".zen-avatar__status",
  cases: (vp) => (vp.Status === "Active" && avatarSize[vp.Size] ? { size: avatarSize[vp.Size], theme: "neutral", background: "solid", label: "A", status: true } : null),
  map: [
    { figma: "", dom: ":root", check: ["size", "fill", "radius"] },
    { figma: "", dom: ":root", check: ["stroke"], strokeVia: "shadow" },
  ],
};

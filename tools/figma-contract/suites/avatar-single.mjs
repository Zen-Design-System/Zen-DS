// Figma Avatar/Single (223:9050): Shape × Size × Theme × Background, 656 variants (Photo exists only with Subtle), from
// docs/figma-contracts/avatar-single.json. Checks the root (size, Surface fill for Subtle/Photo, the OUTSIDE Border/Inverse
// ring, radius per size), the initials' Text frame (theme fill, Effect/Overlay blur) and Label (text style per size,
// colour, centred), the photo's Image frame (INSIDE Border/Neutral/Subtle stroke) and, in a second case per variant with
// the Focus and Status booleans on, the Focus-Ring (OUTSIDE 3px, radius one step above the square's) and the Status dot.
// Figma's Label is one letter ("A") at every size, which XSmall/2XSmall keep in code too (one initial, user 2026-10-13).
import { at, textOf } from "./_chart-shared.mjs";

const plain = (vp, props) => !props.focus;
const on = (vp, props) => Boolean(props.focus);
const photo = (vp) => vp.Theme === "Photo";

export default {
  contract: "docs/figma-contracts/avatar-single.json",
  setId: "223:9050",
  kind: "avatarBadgeAvatar",
  cases: (vp, variant) => {
    const props = {
      size: vp.Size.toLowerCase(),
      shape: vp.Shape.toLowerCase(),
      theme: vp.Theme.toLowerCase(),
      background: vp.Background.toLowerCase(),
      label: textOf(at(variant.spec, "Text > Label")),
    };
    return [props, { ...props, focus: true, status: true }];
  },
  figmaExceptions: [
    // Large/XLarge Circle Yellow/Subtle and Large/XLarge Square Accent/Subtle have no Focus-Ring layer: their Focus
    // boolean drives nothing. Code draws the ring every other variant has.
    ...[["Circle", "Yellow"], ["Square", "Accent"]].flatMap(([Shape, Theme]) => ["Large", "XLarge"].map((Size) => ({
      vp: { Shape, Size, Theme, Background: "Subtle" }, layer: "Focus-Ring", prop: "exists",
      note: "no Focus-Ring layer in this variant (every other one has it); ask the designer",
    }))),
    { vp: { Shape: "Square", Size: "Medium", Theme: "Violet", Background: "Solid" }, layer: "Focus-Ring", prop: "r", code: "16px",
      note: "only this Medium square ring binds Corner-Radius/Rounded; the other 40 bind Large (one step above Base)" },
    { vp: { Shape: "Square", Size: "Large", Background: "Solid" }, layer: "(root)", prop: "r", code: "12px",
      note: "Large Square Solid roots bind Corner-Radius/Large while their Text fill and every Subtle root bind Base; code keeps Base, concentric with the fill" },
    // Photo squares have no Status layer (Photo circles do).
    { vp: { Shape: "Square", Theme: "Photo" }, layer: "Status", prop: "exists", note: "Photo squares have no Status layer (every other variant has it); code draws the dot" },
    // Square Status instances bind the square's own corner radius (Small/Large/Base/3XLarge), which at 8–16px is still a
    // full circle; code keeps Rounded.
    { vp: { Shape: "Square" }, layer: "Status", prop: "r", code: "1000px", note: "the square's corner token on an 8–16px dot is still a circle; code binds Rounded" },
    // Medium squares: Subtle insets the dot 1px like a circle, Solid uses the 12px Medium dot in the corner; every other
    // square size puts the 8/12/16px dot of its circle in the corner (inset 0), as code does.
    ...["x", "y"].map((prop) => ({ vp: { Shape: "Square", Size: "Medium", Background: "Subtle" }, layer: "Status", prop, code: 32, note: "Medium Subtle squares inset the dot 1px; the other square sizes inset 0" })),
    ...["w", "h"].map((prop) => ({ vp: { Shape: "Square", Size: "Medium", Background: "Solid" }, layer: "Status", prop, code: 8, note: "Medium Solid squares use the 12px dot; Medium circles and Subtle squares the 8px one" })),
    ...["x", "y"].map((prop) => ({ vp: { Shape: "Square", Size: "Medium", Background: "Solid" }, layer: "Status", prop, code: 32, note: "the 8px dot in the corner (Figma places its 12px dot there)" })),
  ],
  map: [
    { figma: "", dom: ":root", check: ["size", "fill", "radius"], when: plain },
    { figma: "", dom: ":root", check: ["stroke"], strokeVia: "shadow", when: plain },
    // Initials: Text frame + Label; the photo's Image layer is hidden.
    { figma: "Text", dom: ".zen-avatar__inner", check: ["size", "x", "y", "fill", "radius", "fx"], fxBackdrop: true, when: (vp, p) => plain(vp, p) && !photo(vp) },
    { figma: "Text/Label", dom: ".zen-avatar__initials", check: ["h", "cx", "cy", "text"], when: (vp, p) => plain(vp, p) && !photo(vp) },
    { figma: "Image", dom: ".zen-avatar__inner img", check: ["size"], when: (vp, p) => plain(vp, p) && !photo(vp) },
    // Photo: the Image frame (picture + INSIDE stroke drawn by ::after); the initials' Text layer is hidden.
    { figma: "Text", dom: ".zen-avatar__initials", check: ["size"], when: (vp, p) => plain(vp, p) && photo(vp) },
    { figma: "Image", dom: ".zen-avatar__inner", check: ["size", "x", "y", "radius", "fx"], fxBackdrop: true, when: (vp, p) => plain(vp, p) && photo(vp) },
    { figma: "Image", dom: ".zen-avatar__inner img", check: ["size", "radius"], when: (vp, p) => plain(vp, p) && photo(vp) },
    // The photo: Figma's IMAGE fill is the <img>.
    { figma: "Image", dom: ".zen-avatar__inner", check: ["image"], when: (vp, p) => plain(vp, p) && photo(vp) },
    { figma: "Image", dom: ".zen-avatar__inner::after", check: ["size", "stroke", "radius"], when: (vp, p) => plain(vp, p) && photo(vp) },
    // Focus and Status default to off: hidden in Figma, not drawn in code.
    { figma: "Focus-Ring", dom: ".zen-avatar::before", check: ["size"], when: plain },
    { figma: "Status", dom: ".zen-avatar__status", check: ["size"], when: plain },
    // Focus and Status on (focus, status props).
    { figma: "Focus-Ring", dom: ".zen-avatar::before", check: ["size", "x", "y", "stroke", "radius"], strokeVia: "outline", forceVisible: true, when: on },
    { figma: "Status", dom: ".zen-avatar__status", check: ["size", "x", "y", "fill", "stroke", "radius"], strokeVia: "shadow", forceVisible: true, when: on },
  ],
};

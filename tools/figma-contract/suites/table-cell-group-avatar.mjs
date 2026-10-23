// Figma Primitives/Table/Cell/Group-Avatar-Cell 1603:14300 (docs/figma-contracts/table-cells.json, no variants): a column's
// `cell` drawing AvatarStack Small · Subtle (three avatars and the "+2" More chip; the Table has no stack content). The
// Avatar/Stack (HUG, Spacing/Gap/2XSmall overlap, −4) is centred in a FIXED 182×60 frame: each 32px avatar (Image-Size/
// Small, Rounded) on its Surface fill with the 1px OUTSIDE Border/Inverse ring, 28px after the one before; the initials'
// frame takes the avatar's theme (Accent · Blue · Brown Subtle, More Neutral Subtle) and the initials Body/Base/Medium in
// the theme's Strongest. The stack's insides are measured from the stack (figmaRoot).
import { cellCase } from "./_table-shared.mjs";

const STACK = "Avatar/Stack";
const inStack = { figmaRoot: STACK, root: ".zen-avatar-stack" };
// Ask the designer (QUESTIONS.md "Table cells" lists the other cells that do not fit Table/Cell/Size): the frame is FIXED 60 tall, taller
// than a row's 28px Content slot (Table/Cell/Size 52 − 2 × Spacing/Padding/Small). Code keeps the row at Table/Cell/Size
// and centres the 32px stack in the slot, so it sits 2px above the slot's top instead of 14px below the frame's.
const fixed = "Group-Avatar-Cell is a FIXED 60px frame; code's Content slot is 28 (the row stays Table/Cell/Size 52) with the stack centred in it (ask the designer).";
const avatar = (figma, nth) => [
  { figma: `${STACK} > ${figma}`, dom: `.zen-avatar-stack > .zen-avatar:nth-child(${nth})`, check: ["size", "x", "y", "fill", "radius"], ...inStack },
  { figma: `${STACK} > ${figma}`, dom: `.zen-avatar-stack > .zen-avatar:nth-child(${nth})`, check: ["stroke"], strokeVia: "shadow", ...inStack },
  { figma: `${STACK} > ${figma} > Text`, dom: `.zen-avatar-stack > .zen-avatar:nth-child(${nth}) .zen-avatar__inner`, check: ["size", "fill", "radius"], ...inStack },
  { figma: `${STACK} > ${figma} > Text > Label`, dom: `.zen-avatar-stack > .zen-avatar:nth-child(${nth}) .zen-avatar__initials`, check: ["text"], ...inStack },
];
export default {
  contract: "docs/figma-contracts/table-cells.json",
  setId: "1603:14300",
  kind: "tableCell",
  root: ".zen-table__content",
  cases: (vp, { spec }) => cellCase(spec, {}, {}, { cell: "avatarStack" }),
  figmaExceptions: [
    { vp: {}, layer: "(root)", prop: "h", code: "28", note: fixed },
    { vp: {}, layer: STACK, prop: "y", code: "-2", note: fixed },
  ],
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: STACK, dom: ".zen-avatar-stack", check: ["size", "x", "y"] },
    ...avatar("Avatar/Single#0", 1),
    ...avatar("Avatar/Single#1", 2),
    ...avatar("Avatar/Single#2", 3),
    ...avatar("More", 4),
  ],
};

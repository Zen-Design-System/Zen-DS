// Figma .Primitives/Input/Text-Area 421:9077 (docs/figma-contracts/input-search.json): Size Small · Medium · Large × 9
// states → the box of TextAreaField (no label or help text; Input/Text-Area 450:7027 nests this primitive). The root is
// the field's control (size, Corner-Radius/Input, the Focused/Typing outside ring), the Container its fill + Effect/Input
// (::before), its INSIDE stroke (::after; Read-Only: the [2,2] dashed SVG rect) and padding (the text's offset), the
// text style and colour (::placeholder where Figma shows the placeholder) and the caret colour in Focused/Typing.
// Not compared: Sympol, the 8px resize grip, which code leaves to the browser's native textarea handle.
const typed = (vp) => ["Typing", "Inputted", "Read-Only", "Disabled", "Inputted-Error"].includes(vp.State);
const content = "Container > .Primitives/Input/Input-Content/Default";
const text = `${content} > Text`;
const pinRing = { light: "3px rgba(0, 0, 0, 0.1)", dark: "3px rgba(254, 254, 254, 0.15)" };
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "421:9077",
  kind: "ipsTextArea",
  root: ".zen-input__control",
  cases: (vp) => ({ size: vp.Size.toLowerCase(), state: vp.State.toLowerCase(), value: typed(vp) ? "Placeholder" : "" }),
  figmaExceptions: [
    // Figma's static Cursor is Element-Size/Popular/Base (20) tall, so in Small it makes the content row 20px and drops
    // the 16px text 2px below the padding; a native caret is as tall as the line, and the text starts at the padding.
    ...["Focused", "Typing"].map((State) => ({ vp: { Size: "Small", State }, layer: text, prop: "y", code: 6, note: "Small: Figma's 20px Cursor makes the 16px content row 20 tall (text 2px lower); code's native caret follows the line." })),
    // Known open designer question (BACKLOG P3, 2026-10-03): this primitive's Focused/Typing ring is 2px (Emphasis/
    // Border-Weight/Active/Primary) while Field-Only (Text-Field, Select, Search…) draws 3px OUTSIDE; code keeps 3px for all.
    ...["Focused", "Typing"].flatMap((State) => Object.values(pinRing).map((code) => ({ vp: { State }, layer: "(root)", prop: "stroke", code, note: "Open question (BACKLOG P3): Text-Area's Focused ring is 2px (Emphasis/Border-Weight/Active/Primary), Field-Only's 3px, which code keeps for all fields." }))),
    // Figma inconsistency: Read-Only keeps Effect/Input here but Field-Only Read-Only has no effect style; code drops it
    // on every read-only field (input.css).
    { vp: { State: "Read-Only" }, layer: "Container", prop: "fx", code: "none", note: "Read-Only keeps Effect/Input on Text-Area but not on Field-Only (374:103464); code follows Field-Only." },
  ],
  map: [
    { figma: "", dom: ":root", check: ["size", "radius"] },
    // Inputted-/Blank-Error keep a 0px OUTSIDE stroke (draws nothing; code: no ring), which the checker reads as a stroke.
    { figma: "", dom: ":root", check: ["stroke"], strokeVia: "shadow", when: (vp) => !/Error/.test(vp.State) },
    { figma: "Container", dom: ":root", check: ["size", "x", "y", "radius"] },
    { figma: "Container", dom: ".zen-input__control::before", check: ["fill", "fx"] },
    { figma: "Container", dom: ".zen-input__control", check: ["stroke"], strokeVia: "after", when: (vp) => vp.State !== "Read-Only" },
    { figma: "Container", dom: ".zen-input__dash rect", check: ["stroke"], strokeVia: "svg", strokeScale: 0.5, when: (vp) => vp.State === "Read-Only" },
    { figma: text, dom: "textarea", check: ["y"] },
    // Focused draws the Cursor before the placeholder (the text 1.5px later); code's caret sits where the text starts.
    { figma: text, dom: "textarea", check: ["x"], when: (vp) => vp.State !== "Focused" },
    { figma: `${content} > Cursor`, dom: "textarea", check: ["x"], when: (vp) => vp.State === "Focused" },
    { figma: text, dom: "textarea", check: ["text"], when: typed },
    { figma: text, dom: "textarea::placeholder", check: ["text"], when: (vp) => !typed(vp) },
    { figma: `${content} > Cursor`, dom: "textarea", check: ["fill"], fillVia: "caret", when: (vp) => vp.State === "Focused" || vp.State === "Typing" },
  ],
};

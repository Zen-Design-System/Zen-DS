// Figma Input/Heading 694:13062 (docs/figma-contracts/input-search.json): Size H1–H3 × 7 statuses.
// The root keeps the heading's line box (Input/Size/Heading-H*); the Container is the native input, which sits 8px
// (Spacing/Padding/XSmall) outside it on every side except in Inputted-Multi-Line. Default/Hover/Focus show the
// placeholder, so their text style and colour are read from ::placeholder; Focus/Typing check the caret (Cursor).
const typed = (vp) => /^(Typing|Inputted)/.test(vp.Status);
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "694:13062",
  kind: "headingField",
  root: ".zen-heading-field",
  // Inputted-Multi-Line renders the `multiline` variant (auto-growing textarea); every other status the single-line input.
  cases: (vp) => ({ headingSize: vp.Size.toLowerCase(), status: vp.Status.toLowerCase(), value: typed(vp) ? "Heading" : "", multiline: vp.Status === "Inputted-Multi-Line" || undefined }),
  figmaExceptions: [
    // Figma-side inconsistency (reported): H3's padding binds Spacing/Padding/XSmall (8) like H1/H2 and H3 Default,
    // but five H3 statuses fix the Container at 44px (−6). Code keeps Input/Size/Heading-H3 + 2 × 8.
    ...["Hover", "Focus", "Typing", "Inputted-Single-Line", "Inputted-Hover"].flatMap((Status) => [
      { vp: { Size: "H3", Status }, layer: "Container", prop: "h", code: "48", note: "H3 non-Default statuses fix the Container at 44px (−6) although its padding binds Spacing/Padding/XSmall (8) as in H3 Default and every H1/H2 status; code keeps Input/Size/Heading-H3 (32) + 2 × 8." },
      { vp: { Size: "H3", Status }, layer: "Container", prop: "y", code: "-8", note: "Same 44px H3 Container (see h)." },
    ]),
    // Browser, not Figma: Chrome forces `line-height: initial !important` on input::placeholder (author !important cannot
    // override it). Measured: the placeholder glyphs sit on the same pixel rows as typed text, so only the reported value differs.
    // Pinned to the Dashboard Heading/1–3 size and tracking (variables export 2026-09-28).
    ...[["H1", "28px", "-0.56px"], ["H2", "25px", "-0.5px"], ["H3", "22px", "-0.44px"]].map(([Size, size, ls]) => ({
      vp: { Size }, layer: "Container/Heading", prop: "text", code: `Inter 600 ${size}/normal ls=${ls} none`,
      note: "Chrome forces line-height: initial on input::placeholder; placeholder glyphs render on the same rows as typed text.",
    })),
  ],
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Container", dom: ".zen-heading-field__native", check: ["size", "x", "y", "fill", "radius"] },
    { figma: "Container/Heading", dom: ".zen-heading-field__native", check: ["text"], when: typed },
    { figma: "Container/Heading", dom: ".zen-heading-field__native::placeholder", check: ["text"], when: (vp) => !typed(vp) },
    { figma: "Container/Cursor", dom: ".zen-heading-field__native", check: ["fill"], fillVia: "caret", when: (vp) => vp.Status === "Focus" || vp.Status === "Typing" },
  ],
};

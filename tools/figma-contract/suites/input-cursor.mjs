// Figma .Primitives/Input/Cursor 373:102260 (docs/figma-contracts/input-search.json): Visible × Theme. The Default
// cursor is InputContent's caret (State=Focused): 1.5 × Element-Size/Popular/Base in Background/Active/Neutral/Solid.
// No captured Figma set places the Accent cursor; in code it is the Chat composer's native caret (caret-color
// Background/Active/Accent/Solid), whose colour is all the browser lets the checker read.
// Visible=No is the caret's blink-off frame (a 1px frame with its fill hidden): code draws no such element (a static
// field shows the caret, a native one blinks by itself), so those two variants have no case.
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "373:102260",
  kind: "ipsCursor",
  cases: (vp) => (vp.Visible === "No" ? null : { theme: vp.Theme.toLowerCase() }),
  map: [
    { figma: "", dom: ".zen-input-content__cursor", check: ["size", "fill"], when: (vp) => vp.Theme === "Default" },
    { figma: "", dom: ".zen-chat-composer__field textarea", check: ["fill"], fillVia: "caret", when: (vp) => vp.Theme === "Accent" },
  ],
};

// Figma Toggle-Button 1523:104 (docs/figma-contracts/segmented-toggle-badge-avatarstack.json): Size Small · Medium ·
// Large · XLarge × State Default · Default-Hover · Disabled × Select. The bar (its size, fill, radius) and the dot (its
// size and place, Unselected left / Selected right, fill, radius, 0.5px OUTSIDE Border/Neutral/Pale stroke) and, on
// XLarge, the dot's icon (Element-Size/Popular/Medium, Toggle/Dot/Content). The icon is read from the variant.
// Not mapped: Blank, the empty frame Figma lays the dot's other place with (it draws nothing; code moves the dot by
// translateX). The dot's Shadow/Action/Basic is compared only where Figma has none (Disabled): code draws the 0.5px
// stroke as a spread ring in the same box-shadow list (checked by `stroke`), so `fx` cannot single the shadow out.
import { at, child } from "./_chart-shared.mjs";

const state = (vp) => ({ Default: "default", "Default-Hover": "hover", Disabled: "disabled" })[vp.State];
const xl = (vp) => vp.Size === "XLarge";

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "1523:104",
  kind: "stbToggleButton",
  root: ".zen-toggle-button",
  cases: (vp, { spec }) => ({
    size: vp.Size.toLowerCase(),
    state: state(vp),
    checked: vp.Select === "Yes",
    icon: at(spec, "Toggle-Dot > Icon")?.main,
  }),
  map: [
    { figma: "", dom: ".zen-toggle-button__track", check: ["size", "fill", "radius"] },
    { figma: "Toggle-Dot", dom: ".zen-toggle-button__dot", check: ["size", "x", "y", "fill", "radius", "stroke"], strokeVia: "shadow" },
    { figma: "Toggle-Dot", dom: ".zen-toggle-button__dot", check: ["fx"], when: (vp) => vp.State === "Disabled" },
    { figma: "Toggle-Dot/Icon", dom: ".zen-toggle-button__dot > .zen-icon", check: ["size", "x", "y"], when: xl },
    { figma: "Toggle-Dot/Icon/Vector", dom: ".zen-toggle-button__dot > .zen-icon", check: ["fill"], fillVia: "color", when: xl },
  ],
};

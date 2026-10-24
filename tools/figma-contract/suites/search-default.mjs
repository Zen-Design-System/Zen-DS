// Figma Search/Default 846:37624 (docs/figma-contracts/input-search.json): Size Small · Medium × Shape Default · Rounded ×
// Theme Default · Filter-Icon · Filter-Dropdown × State × Icon-Search (120) → Search in a 249.6px frame. Field size,
// Corner-Radius (Input/<size> or Rounded), fill, INSIDE stroke, Effect/Input and the Focused/Typing ring per state; the
// slots' places, icon colours and text styles (suites/_search-shared.mjs).
import { placeholderLineHeight, searchCase, searchMap } from "./_search-shared.mjs";

export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "846:37624",
  kind: "ipsSearch",
  root: ".zen-search",
  cases: (vp, variant) => searchCase(vp, variant, { size: vp.Size.toLowerCase(), shape: vp.Shape.toLowerCase() }),
  figmaExceptions: ["Default", "Hover", "Focused"].map((State) => placeholderLineHeight({ State })),
  map: searchMap,
};

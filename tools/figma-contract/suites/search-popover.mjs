// Figma Search/Popover 1604:27401 (docs/figma-contracts/input-search-primitives.json): Theme × State × Icon-Search (30)
// → Search variant="popover" in a 241.6px frame: Field-Only Small on Corner-Radius/Input/Medium with no focus ring;
// Focused/Typing take Input/Border/Popover-Search. Same map as Search/Default (suites/_search-shared.mjs). Besides the
// default modes it runs in Neutral-S4, an outlined Component Theme where Input/Border/Default is a visible stroke
// (BACKLOG: suites/popover-search.mjs checks the .Primitives/Popover/Search part in the default modes only).
import { placeholderLineHeight, searchCase, searchMap } from "./_search-shared.mjs";

export default {
  contract: "docs/figma-contracts/input-search-primitives.json",
  setId: "1604:27401",
  kind: "ipsSearch",
  root: ".zen-search",
  modes: [
    { theme: "light", componentTheme: "neutral-s1" },
    { theme: "dark", componentTheme: "brand-s1" },
    { theme: "light", componentTheme: "neutral-s4" },
  ],
  cases: (vp, variant) => searchCase(vp, variant, { variant: "popover" }),
  figmaExceptions: ["Default", "Hover", "Focused"].map((State) => placeholderLineHeight({ State })),
  map: searchMap,
};

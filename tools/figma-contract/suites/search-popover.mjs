// Figma Search/Popover 1604:27401 (docs/figma-contracts/input-search-primitives.json): Theme × State × Icon-Search (30)
// → Search variant="popover" in a 241.6px frame: Field-Only Small on Corner-Radius/Input/Medium with no focus ring in Figma;
// Focused/Typing take Input/Border/Popover-Search. Same map as Search/Default (suites/_search-shared.mjs). Besides the
// default modes it runs in Neutral-S4, an outlined Component Theme where Input/Border/Default is a visible stroke
// (BACKLOG: suites/popover-search.mjs checks the .Primitives/Popover/Search part in the default modes only).
// Focused/Typing deliberately add Search/Default's 3px outside ring (Color/Focus/Neutral/Subtle): Figma's transparent
// Popover-Search border left the caret as the only sign of focus (user 2026-11-02).
import { placeholderLineHeight, searchCase, searchMap } from "./_search-shared.mjs";

const focusRing = ["Focused", "Typing"].flatMap((State) => ["3px rgba(0, 0, 0, 0.1)", "3px rgba(254, 254, 254, 0.15)"].map((code) => ({
  vp: { State }, layer: "Search/Default|Search/Filter-Icon|Search/Filter-Dropdown", prop: "stroke", code,
  note: "code adds the 3px Color/Focus/Neutral/Subtle focus ring Figma's Popover search leaves out (WCAG 2.4.7, user 2026-11-02).",
})));

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
  figmaExceptions: [...["Default", "Hover", "Focused"].map((State) => placeholderLineHeight({ State })), ...focusRing],
  map: searchMap,
};

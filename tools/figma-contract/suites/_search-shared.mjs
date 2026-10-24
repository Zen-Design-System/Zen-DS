// Shared pieces of the Search suites (search-default.mjs, search-popover.mjs; docs/figma-contracts/input-search*.json).
// Both sets wrap one .Primitives/Input/Field-Only instance, named after the Theme (Search/Default · Search/Filter-Icon ·
// Search/Filter-Dropdown), whose Container holds Leading (the search icon) · Content (text, Cursor) · Clear · Trailing
// (the filter: a settings icon, or the "All" label + chevron). Code: Search → InputField (.zen-input__control, its
// ::before fill + Effect/Input, ::after INSIDE stroke), the affordance slots, the clear button and InputLeadingTrailing.
// The filter is a button whose box grows by its hover padding (negative margins keep its place), so its icon or
// Elements are measured instead. Widths and x after a text-hugging part (the "All" label) are not asserted.

const FO = "Search/Default|Search/Filter-Icon|Search/Filter-Dropdown";
const C = `${FO} > Container`;
const typed = (vp) => vp.State === "Typing" || vp.State === "Inputted";
const yes = (vp) => vp["Icon-Search"] === "Yes";
const theme = (vp) => vp.Theme.toLowerCase();

/** The variant's texts: the placeholder or query, and the Filter-Dropdown label. */
const texts = (spec) => {
  const container = spec.c[0].c.find((node) => node.n === "Container");
  const content = container.c.find((node) => node.n === "Content");
  const label = container.c.find((node) => node.n === "Trailing")?.c?.[0]?.c?.find((node) => node.n === "Label");
  return { text: content.c.find((node) => node.n === "Text").txt, filterLabel: label?.txt };
};

/** Search props for a variant of either set. */
export function searchCase(vp, variant, extra) {
  const { text, filterLabel } = texts(variant.spec);
  return {
    width: variant.spec.w,
    theme: theme(vp),
    state: vp.State.toLowerCase(),
    iconSearch: yes(vp),
    placeholder: text,
    value: typed(vp) ? text : "",
    ...(filterLabel ? { filterLabel } : null),
    ...extra,
  };
}

/** Chrome forces `line-height: initial !important` on input::placeholder (an author !important cannot override it):
 * the placeholder's glyphs sit on the same rows as typed text, only the reported line height differs. */
export const placeholderLineHeight = (vp) => ({
  vp, layer: `${C} > Content > Text`, prop: "text", code: "Inter 500 14px/normal ls=-0.14px none",
  note: "Chrome forces line-height: initial on input::placeholder; the placeholder renders on the same rows as typed text.",
});

export const searchMap = [
  { figma: "", dom: ":root", check: ["size"] },
  // The Field-Only instance: Corner-Radius (Input/<size>, Input/Medium in Popover, Rounded) and the 3px OUTSIDE focus ring.
  { figma: FO, dom: ".zen-input__control", check: ["size", "radius", "stroke"], strokeVia: "shadow" },
  { figma: C, dom: ".zen-input__control", check: ["size", "x", "y", "radius"] },
  { figma: C, dom: ".zen-input__control::before", check: ["fill", "fx"] },
  { figma: C, dom: ".zen-input__control", check: ["stroke"], strokeVia: "after" },
  { figma: `${C} > Leading`, dom: ".zen-input__affordance--leading", check: ["size", "x", "y"] },
  { figma: `${C} > Leading > Icon|Leading-Icon`, dom: ".zen-input__affordance--leading > .zen-icon", check: ["size", "x", "y"], when: yes },
  { figma: `${C} > Leading > Icon|Leading-Icon > Vector`, dom: ".zen-input__affordance--leading > .zen-icon", check: ["fill"], fillVia: "color", when: yes },
  // Content's padding (Spacing/Padding/3XSmall) is the input's inline-start margin, so the text starts where the input does.
  { figma: `${C} > Content`, dom: "input", check: ["right"], when: (vp) => vp.Theme !== "Filter-Dropdown" },
  { figma: `${C} > Content > Text`, dom: "input", check: ["h", "y"] },
  // Focused draws the Cursor before the placeholder (the text 1.5px later); code's caret sits where the text starts.
  { figma: `${C} > Content > Text`, dom: "input", check: ["x"], when: (vp) => vp.State !== "Focused" },
  { figma: `${C} > Content > Cursor`, dom: "input", check: ["x"], when: (vp) => vp.State === "Focused" },
  { figma: `${C} > Content > Cursor`, dom: "input", check: ["fill"], fillVia: "caret", when: (vp) => vp.State === "Focused" || vp.State === "Typing" },
  { figma: `${C} > Content > Text`, dom: "input", check: ["text"], when: typed },
  { figma: `${C} > Content > Text`, dom: "input::placeholder", check: ["text"], when: (vp) => !typed(vp) },
  // Clear (Typing / Inputted): its x follows the filter, which hugs its label in Filter-Dropdown.
  { figma: `${C} > Clear`, dom: ".zen-search__clear", check: ["size", "y"], when: typed },
  { figma: `${C} > Clear`, dom: ".zen-search__clear", check: ["x"], when: (vp) => typed(vp) && vp.Theme !== "Filter-Dropdown" },
  { figma: `${C} > Clear > Vector`, dom: ".zen-search__clear > .zen-icon", check: ["fill"], fillVia: "color", when: typed },
  // Trailing: hidden in Theme=Default (code renders no filter); the settings icon (Filter-Icon); label + chevron (Filter-Dropdown).
  { figma: `${C} > Trailing`, dom: ".zen-input-leading-trailing", check: ["size"], when: (vp) => vp.Theme === "Default" },
  { figma: `${C} > Trailing`, dom: ".zen-input-leading-trailing > .zen-icon", check: ["size", "x", "y"], when: (vp) => vp.Theme === "Filter-Icon" },
  { figma: `${C} > Trailing > Icon|Leading-Icon > Vector`, dom: ".zen-input-leading-trailing > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Theme === "Filter-Icon" },
  { figma: `${C} > Trailing`, dom: ".zen-input-leading-trailing__elements", check: ["h", "y", "right"], when: (vp) => vp.Theme === "Filter-Dropdown" },
  { figma: `${C} > Trailing > Elements > Label`, dom: ".zen-input-leading-trailing__label", check: ["text", "h", "y"], when: (vp) => vp.Theme === "Filter-Dropdown" },
  { figma: `${C} > Trailing > Elements > Dropdown`, dom: ".zen-input-leading-trailing__dropdown", check: ["size", "y"], when: (vp) => vp.Theme === "Filter-Dropdown" },
  { figma: `${C} > Trailing > Elements > Dropdown > Vector`, dom: ".zen-input-leading-trailing__dropdown > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => vp.Theme === "Filter-Dropdown" },
];

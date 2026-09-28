// Shared mapping for the six Figma Button sets: Button/Main 1026:8312, Flat 1070:18754 and Overlay 1026:8747
// (docs/figma-contracts/button-text.json), Icon-Main 205:21062, Icon-Flat 234:43906 and Icon-Overlay 291:41855
// (button-icon.json). Every Size × Level × State.
// - The stroke is an inset ring inside the box-shadow list (button.css), so `fx` compares only the outer shadow
//   (fxIgnoreInset) and `fxBackdrop` checks the effect style's background blur (Shadow/Action/Tertiary, Effect/Overlay).
//   White/Black Overlay's 1px gradient ring is a masked ::after instead (strokeVia "mask").
// - Focus-Ring is a root-level sibling of Container that exists only on State=Focused; code draws it as `::before`.
// - Text widths depend on the Inter build Figma renders with, so text buttons assert heights and offsets, not widths.
//   XLarge is the exception: its 96px min width is wider than "Button", so the width is asserted and the centred
//   label's x (text-dependent) is not.
// - Leading/Trailing-Icon are hidden by default in the text sets and keep stale x/y from older icon sizes, so the
//   `withIcons` case asserts only their size (Button/Icon-Size/<Size>) and colour.
// - The third mode switches Corner Radius to Smooth, where Action/<Size>, Action/Focus-<Size> and Rounded resolve to
//   different values, so the radius bindings are verified and not only the 1000px pill.
const sizes = { XLarge: "xl", Large: "lg", "Medium (Base)": "md", Medium: "md", Small: "sm", XSmall: "xs", "2XSmall": "2xs" };
const kebab = (value) => value.toLowerCase().replace(/\s+/g, "-");
const withIcons = (vp, props) => Boolean(props.withIcons);
const gradientRing = (vp) => vp.Level === "White Overlay" || vp.Level === "Black Overlay";

// Icon sets: Container binds Corner-Radius/Rounded (a circle in every Corner Radius mode) but Focus-Ring binds
// Action/Focus-<Size> (= Action/<Size> + 6), so in Smooth/Standard/Luxury Figma draws a rounded-square ring around a circle.
// Code keeps the ring concentric with the circle (user decision 2026-09-27); `code` pins the value so a drift still fails.
export const iconRingExceptions = [{
  vp: {},
  layer: "Focus-Ring",
  prop: "r",
  code: "1000px",
  note: "Icon sets bind the ring to Action/Focus-<Size> but the Container to Corner-Radius/Rounded; code draws a Rounded (circle) ring, concentric with the button.",
}];

export const buttonSuite = ({ setId, contract, appearance, iconOnly, figmaExceptions = [] }) => ({
  contract: `docs/figma-contracts/${contract}`,
  setId,
  kind: iconOnly ? "iconButton" : "button",
  root: ".zen-button",
  modes: [
    { theme: "light", componentTheme: "neutral-s1" },
    { theme: "dark", componentTheme: "brand-s1" },
    { theme: "light", componentTheme: "neutral-s1", radius: "smooth" },
  ],
  cases: (vp) => {
    const props = { appearance, size: sizes[vp.Size], level: kebab(vp.Level), state: kebab(vp.State) };
    return iconOnly ? props : [props, { ...props, withIcons: true }];
  },
  figmaExceptions,
  map: [
    { figma: "Container", dom: ":root", check: [iconOnly ? "size" : "h", "fill", "radius", "fx"], fxIgnoreInset: true, fxBackdrop: true },
    { figma: "Container", dom: ":root", check: ["stroke"], strokeVia: "shadow", when: (vp) => !gradientRing(vp) },
    { figma: "Container", dom: ":root", check: ["stroke"], strokeVia: "mask", when: gradientRing },
    { figma: "Focus-Ring", dom: ".zen-button::before", check: [iconOnly ? "size" : "h", "x", "y", "stroke", "radius"], strokeVia: "before", when: (vp) => vp.State === "Focused" },
    ...(iconOnly
      ? [
        { figma: "Container/Leading-Icon", dom: ".zen-button__icon", check: ["size", "x", "y"] },
        { figma: "Container/Leading-Icon/Vector", dom: ".zen-button__icon", check: ["fill"], fillVia: "color" },
      ]
      : [
        { figma: "Container", dom: ":root", check: ["w"], when: (vp, props) => vp.Size === "XLarge" && !props.withIcons },
        { figma: "Container/Label-Wrapper", dom: ".zen-button__label", check: ["h", "y"], when: (vp, props) => !props.withIcons },
        { figma: "Container/Label-Wrapper", dom: ".zen-button__label", check: ["x"], when: (vp, props) => vp.Size !== "XLarge" && !props.withIcons },
        { figma: "Container/Label-Wrapper/Label", dom: ".zen-button__label", check: ["text"], when: (vp, props) => !props.withIcons },
        { figma: "Container/Leading-Icon", dom: ".zen-button__icon:first-child", check: ["size"], forceVisible: true, when: withIcons },
        { figma: "Container/Leading-Icon/Vector", dom: ".zen-button__icon:first-child", check: ["fill"], fillVia: "color", when: withIcons },
        { figma: "Container/Trailing-Icon", dom: ".zen-button__icon:last-child", check: ["size"], forceVisible: true, when: withIcons },
      ]),
  ],
});

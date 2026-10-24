// Figma .Primitives/Input/Help-Text 373:97364 (docs/figma-contracts/input-search.json): Theme Neutral · Negative ·
// Warning · Positive → InputHelpText. Each variant renders twice: as Figma's default (Character-Limitation off, the
// Character-Limit layer hidden) and with the limit text on, whose style, colour and row place are checked from the
// hidden layer (a hidden layer keeps a stale x and its FIXED 30px width; code hugs the text at the end of the row).
const icon = "Content > icon-info-circle-line|icon-alert-octagon-line|icon-alert-triangle-line|icon-check-line";
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "373:97364",
  kind: "ipsHelpText",
  root: ".zen-input-help",
  cases: (vp) => [false, true].map((limit) => ({ theme: vp.Theme.toLowerCase(), limit })),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Content", dom: ".zen-input-help__content", check: ["size", "x", "y"], when: (vp, props) => !props.limit },
    { figma: icon, dom: ".zen-input-help__icon > .zen-icon", check: ["size", "x", "y"] },
    { figma: `${icon} > Vector`, dom: ".zen-input-help__icon > .zen-icon", check: ["fill"], fillVia: "color" },
    { figma: "Content > Message", dom: ".zen-input-help__content > span:last-child", check: ["text", "h", "x", "y"] },
    { figma: "Character-Limit", dom: ".zen-input-help__limit", check: ["h"], when: (vp, props) => !props.limit },
    { figma: "Character-Limit", dom: ".zen-input-help__limit", check: ["text", "h", "y"], forceVisible: true, when: (vp, props) => props.limit },
  ],
};

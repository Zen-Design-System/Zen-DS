// Figma Input-Conditions 373:97663 (docs/figma-contracts/input-search.json): the Item-List slot stacking five
// Condition-Items (State=Default) Gap/XSmall apart → InputConditions. Each item's place, icon and text style; the item
// texts are read from the variant. The item itself is checked state by state in input-condition-item.
const items = (spec) => spec.c[0].c.map((item) => item.c[0].c.find((node) => node.n === "Text").txt);
const COUNT = 5;
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "373:97663",
  kind: "ipsConditions",
  root: ".zen-input-conditions",
  cases: (vp, variant) => ({ items: items(variant.spec) }),
  map: [
    { figma: "", dom: ":root", check: ["size"] },
    { figma: "Item-List", dom: ":root", check: ["size", "x", "y"] },
    ...Array.from({ length: COUNT }, (_, i) => {
      const item = `Item-List > Item#${i}`;
      const li = `.zen-input-condition:nth-child(${i + 1})`;
      return [
        { figma: item, dom: li, check: ["size", "x", "y"] },
        { figma: `${item} > Content > icon-minus-line`, dom: `${li} > .zen-icon`, check: ["size", "x", "y"] },
        { figma: `${item} > Content > icon-minus-line > Vector`, dom: `${li} > .zen-icon`, check: ["fill"], fillVia: "color" },
        { figma: `${item} > Content > Text`, dom: `${li} > .zen-input-condition__text`, check: ["text", "h", "x", "y"] },
      ];
    }).flat(),
  ],
};

// Figma Input/Autocomplete-Field 1241:5616 (docs/figma-contracts/input-search.json): 7 States of a 451px FIXED field →
// AutocompleteField. Label; the wrapping Tag list (Spacing/Gap/2XSmall, Padding/2XSmall top and bottom: each Tag's
// height and fill, error tags on Negative, each row's place); the Add slot (Padding/2XSmall) with the "Add Item"
// Button/Main XSmall Secondary; Popover/Default over the Add slot (Focused); the error Help-Text. Tag, Button and Popover
// insides are their own suites'. The list covers the Add slot (Popover placement="cover", 2026-10-24), as Figma draws it. Tag widths hug the copy, so x is asserted only for a row's first tag, and where Figma's
// row breaks with less than 8px to spare (Inputted*: 3 × 110px tags in 451, a 4th misses by 1px) the copy decides the
// rows, so the rows' y and everything below them are not asserted there.
// Harness limitation: one popover is open per page (useExclusivePopover closes the others), so only Focused opens it;
// Inputted-Focused renders as Inputted with its list closed.
import { at, child, findAll, textOf } from "./_chart-shared.mjs";

const tag = (k) => `.zen-autocomplete__tags > [role="listitem"]:nth-child(${k + 1}) > .zen-tag`;
const stable = (vp, props) => !props.fragileWrap;
const error = (vp) => /Error/.test(vp.State);
const listed = (vp) => vp.State !== "View-Only";
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "1241:5616",
  kind: "inputFieldsAutocomplete",
  root: ".zen-autocomplete",
  cases: (vp, { spec }) => {
    const tags = (child(spec, "Container")?.c ?? []).filter((node) => node.n === "Tag" && !node.hidden);
    const items = findAll(spec, (node) => node.n === "Primitives/Popover/Item" && !node.hidden).map((item) => textOf(item));
    const help = child(spec, "Help-Text");
    // The room left on a row when Figma wrapped the next tag (≤ 0 → the tag did not fit); under 8px the copy decides.
    const slack = tags.slice(1).flatMap((node, k) => (node.x === 0 ? [tags[k].x + tags[k].w + 4 + node.w - spec.w] : []));
    return {
      width: spec.w,
      label: at(spec, "Label > Content > Label").txt,
      options: [...tags.map((node, k) => ({ id: `t${k}`, label: textOf(node) })), ...(items.length ? items : ["Popover Item 1"]).map((label, k) => ({ id: `o${k}`, label }))],
      defaultValue: tags.map((node, k) => `t${k}`),
      invalidValues: tags.flatMap((node, k) => (/Negative/.test(node.fill?.[0]?.v ?? "") ? [`t${k}`] : [])),
      readOnly: vp.State === "View-Only" || undefined,
      error: help && !help.hidden ? at(help, "Content > Message").txt : undefined,
      open: vp.State === "Focused" || undefined,
      rowStarts: tags.flatMap((node, k) => (node.x === 0 ? [k] : [])),
      fragileWrap: slack.some((room) => room < 8),
    };
  },
  map: [
    { figma: "", dom: ":root", check: ["w"] },
    { figma: "", dom: ":root", check: ["h"], when: stable },
    { figma: "Label", dom: ".zen-input-label", check: ["size", "x", "y"] },
    { figma: "Label > Content > Label", dom: ".zen-input-label__text", check: ["text", "h", "x", "y"] },
    { figma: "Container", dom: ".zen-autocomplete__tags", check: ["w", "x", "y"], when: (vp, props) => props.defaultValue.length > 0 },
    { figma: "Container", dom: ".zen-autocomplete__tags", check: ["h"], when: (vp, props) => props.defaultValue.length > 0 && stable(vp, props) },
    ...[0, 1, 2, 3, 4, 5].flatMap((k) => [
      { figma: `Container > Tag#${k}`, dom: tag(k), check: ["h", "fill"], when: (vp, props) => props.defaultValue.length > k },
      { figma: `Container > Tag#${k}`, dom: tag(k), check: ["y"], when: (vp, props) => props.defaultValue.length > k && (k === 0 || stable(vp, props)) },
      { figma: `Container > Tag#${k}`, dom: tag(k), check: ["x"], when: (vp, props) => props.rowStarts.includes(k) && (k === 0 || stable(vp, props)) },
    ]),
    { figma: "Add", dom: ".zen-autocomplete__add", check: ["h", "x"], when: listed },
    { figma: "Add", dom: ".zen-autocomplete__add", check: ["y"], when: (vp, props) => listed(vp) && stable(vp, props) },
    { figma: "Add > Button/Main", dom: ".zen-autocomplete__add > .zen-button", check: ["h", "x"], when: listed },
    { figma: "Add > Button/Main", dom: ".zen-autocomplete__add > .zen-button", check: ["y"], when: (vp, props) => listed(vp) && stable(vp, props) },
    { figma: "Add > Button/Main > Container", dom: ".zen-autocomplete__add > .zen-button", check: ["fill", "radius"], when: listed },
    { figma: "Add > Popover/Default", dom: ".zen-autocomplete__add > .zen-popover", check: ["size", "x", "y"], when: (vp, props) => Boolean(props.open) },
    { figma: "Help-Text", dom: ".zen-input-help", check: ["size", "x"], when: error },
    { figma: "Help-Text", dom: ".zen-input-help", check: ["y"], when: (vp, props) => error(vp) && stable(vp, props) },
    { figma: "Help-Text > Content > icon-alert-octagon-line", dom: ".zen-input-help__icon > .zen-icon", check: ["size", "x"], when: error },
    { figma: "Help-Text > Content > icon-alert-octagon-line > Vector", dom: ".zen-input-help__icon > .zen-icon", check: ["fill"], fillVia: "color", when: error },
    { figma: "Help-Text > Content > Message", dom: ".zen-input-help__content > span:last-child", check: ["text", "h", "x"], when: error },
  ],
};

// Figma Avatar/Stack (364:92561): Size × Background × Number, 20 variants, from
// docs/figma-contracts/segmented-toggle-badge-avatarstack.json. Each case's items (theme, initials) are read from the
// variant's visible Avatar/Single instances, so every face compares: its place in the overlap (−8 Medium, −4 Small), size,
// fill, OUTSIDE ring, Text fill and Label style. The More (+N) instance is hidden in every variant (More boolean off), as
// code's `showMore` defaults to false; a second case shows it. Faces are addressed by index (`*#i`): Number=2/3 Medium
// Subtle name their hidden More layer "Avatar/Single".
import { at } from "./_chart-shared.mjs";

const faces = (spec) => (spec.c ?? []).filter((layer) => layer.n === "Avatar/Single" && !layer.hidden);
const face = (i) => `.zen-avatar-stack > .zen-avatar:nth-child(${i + 1})`;
const shown = (i) => (vp) => i < Number(vp.Number);

export default {
  contract: "docs/figma-contracts/segmented-toggle-badge-avatarstack.json",
  setId: "364:92561",
  kind: "avatarBadgeStack",
  // A second case per variant with a More layer turns `showMore` on over two extra people (Figma's "+2"), so the More
  // face is measured too (forceVisible).
  cases: (vp, variant) => {
    const items = faces(variant.spec).map((layer) => ({ theme: layer.props.Theme.toLowerCase(), children: at(layer, "Text > Label").txt }));
    // `more` is harness only (the kind drops it): the variant has a hidden More layer after its faces (Number=1 has none).
    const more = Boolean(variant.spec.c?.[items.length]?.hidden);
    const props = { size: vp.Size.toLowerCase(), background: vp.Background.toLowerCase(), items, more };
    return more ? [props, { ...props, items: [...items, { children: "Y" }, { children: "Z" }], max: items.length, showMore: true }] : [props];
  },
  map: [
    // The root hugs the faces (a hidden More takes no room).
    { figma: "", dom: ":root", check: ["size", "fill"], when: (vp, props) => !props.showMore },
    { figma: "", dom: ":root", check: ["h"], when: (vp, props) => Boolean(props.showMore) },
    ...[0, 1, 2, 3, 4].flatMap((i) => [
      { figma: `*#${i}`, dom: face(i), check: ["size", "x", "y", "fill", "radius"], when: shown(i) },
      { figma: `*#${i}`, dom: face(i), check: ["stroke"], strokeVia: "shadow", when: shown(i) },
      { figma: `*#${i} > Text`, dom: `${face(i)} .zen-avatar__inner`, check: ["size", "x", "y", "fill", "radius"], when: shown(i) },
      { figma: `*#${i} > Text > Label`, dom: `${face(i)} .zen-avatar__initials`, check: ["h", "cx", "cy", "text"], when: shown(i) },
    ]),
    // The More (+N) layer after the faces: hidden in Figma, not drawn by code unless `showMore`.
    ...[1, 2, 3, 4].map((n) => ({ figma: `*#${n}`, dom: face(n), check: ["size"], when: (vp, props) => props.more && !props.showMore && Number(vp.Number) === n })),
    ...[1, 2, 3, 4].flatMap((n) => {
      const when = (vp, props) => Boolean(props.showMore) && Number(vp.Number) === n;
      return [
        { figma: `*#${n}`, dom: face(n), check: ["size", "x", "y", "fill", "radius"], forceVisible: true, when },
        { figma: `*#${n}`, dom: face(n), check: ["stroke"], strokeVia: "shadow", forceVisible: true, when },
        { figma: `*#${n} > Text`, dom: `${face(n)} .zen-avatar__inner`, check: ["size", "fill", "radius"], when },
        { figma: `*#${n} > Text > Label`, dom: `${face(n)} .zen-avatar__initials`, check: ["h", "cx", "cy", "text"], when },
      ];
    }),
  ],
};

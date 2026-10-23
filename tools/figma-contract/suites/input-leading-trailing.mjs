// Figma .Primitives/Input/Leading-Trailing 373:101815 (docs/figma-contracts/input-search.json): Size × Active × Icon ×
// Flag × Label × Dropdown (60) → InputLeadingTrailing as a decorative slot: icon-user-circle-line or the Vietnam Flag,
// the "VN" label, the chevron. Sizes, gaps (offsets), icon/label colours (Active=No: Content/Disabled), the flag's 50%
// opacity and the label's text style. The label hugs its text (Inter's advances differ between macOS and CI's Linux),
// so widths and x after it are asserted only where no label decides them.
const yes = (value) => value === "Yes";
export default {
  contract: "docs/figma-contracts/input-search.json",
  setId: "373:101815",
  kind: "ipsLeadingTrailing",
  root: ".zen-input-leading-trailing",
  cases: (vp) => ({
    size: vp.Size.toLowerCase(),
    active: yes(vp.Active),
    icon: yes(vp.Icon),
    flag: yes(vp.Flag),
    label: yes(vp.Label),
    showDropdown: yes(vp.Dropdown),
  }),
  figmaExceptions: [
    // Figma inconsistency (ask the designer): Medium icon/flag + chevron without a label binds the root gap to
    // Spacing/Gap/2XSmall (4) while Medium with a label and every Large variant bind Spacing/Gap/XSmall (8); code keeps XSmall.
    ...["Icon", "Flag"].flatMap((media) => [["(root)", "w", 48], ["Elements", "x", 28], ["Elements > Dropdown", "x", 28]].map(([layer, prop, code]) => ({
      vp: { Size: "Medium", Label: "No", Dropdown: "Yes", [media]: "Yes" }, layer, prop, code,
      note: "Medium icon/flag + chevron (no label) binds the root gap to Gap/2XSmall; Medium with a label and Large bind Gap/XSmall. Code keeps XSmall: ask the designer.",
    }))),
  ],
  map: [
    { figma: "", dom: ":root", check: ["h"] },
    { figma: "", dom: ":root", check: ["w"], when: (vp) => !yes(vp.Label) },
    { figma: "Icon", dom: ".zen-input-leading-trailing > .zen-icon", check: ["size", "x", "y"], when: (vp) => yes(vp.Icon) },
    { figma: "Icon > Vector", dom: ".zen-input-leading-trailing > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => yes(vp.Icon) },
    { figma: "Flag", dom: ".zen-input-leading-trailing > .zen-flag", check: ["size", "x", "y", "opacity"], when: (vp) => yes(vp.Flag) },
    { figma: "Elements", dom: ".zen-input-leading-trailing__elements", check: ["h", "x", "y"], when: (vp) => yes(vp.Label) || yes(vp.Dropdown) },
    { figma: "Elements", dom: ".zen-input-leading-trailing__elements", check: ["w"], when: (vp) => !yes(vp.Label) && yes(vp.Dropdown) },
    { figma: "Elements > Label", dom: ".zen-input-leading-trailing__label", check: ["text", "h", "x", "y"], when: (vp) => yes(vp.Label) },
    { figma: "Elements > Dropdown", dom: ".zen-input-leading-trailing__dropdown", check: ["size", "y"], when: (vp) => yes(vp.Dropdown) },
    { figma: "Elements > Dropdown", dom: ".zen-input-leading-trailing__dropdown", check: ["x"], when: (vp) => yes(vp.Dropdown) && !yes(vp.Label) },
    { figma: "Elements > Dropdown > Vector", dom: ".zen-input-leading-trailing__dropdown > .zen-icon", check: ["fill"], fillVia: "color", when: (vp) => yes(vp.Dropdown) },
  ],
};

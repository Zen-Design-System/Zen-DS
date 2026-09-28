import { buttonSuite, iconRingExceptions } from "./_button-shared.mjs";
// Figma Button/Icon-Overlay 291:41855. Inverse/White carry Shadow/Action/Basic (no blur) except when Disabled.
// Figma-side inconsistencies (reported; code keeps one consistent rule instead of copying them).
export default buttonSuite({
  setId: "291:41855",
  contract: "button-icon.json",
  appearance: "overlay",
  iconOnly: true,
  figmaExceptions: [
    ...iconRingExceptions,
    {
      vp: { Level: "Black Overlay", State: "Disabled" },
      layer: "Container",
      prop: "stroke",
      note: "Icon-Overlay Black Overlay Disabled drops the 1px gradient ring that Button/Overlay Black Overlay Disabled keeps (White Overlay Disabled is the other way round); code keeps the ring on every White/Black Overlay state.",
    },
  ],
});

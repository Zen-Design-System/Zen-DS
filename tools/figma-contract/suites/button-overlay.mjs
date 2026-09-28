import { buttonSuite } from "./_button-shared.mjs";
// Figma Button/Overlay 1026:8747. Figma-side inconsistencies (reported; code keeps one consistent rule instead of copying them).
export default buttonSuite({
  setId: "1026:8747",
  contract: "button-text.json",
  appearance: "overlay",
  iconOnly: false,
  figmaExceptions: [
    {
      vp: { Level: "White Overlay", State: "Disabled" },
      layer: "Container",
      prop: "stroke",
      note: "Button/Overlay White Overlay Disabled drops the 1px gradient ring that Icon-Overlay White Overlay Disabled keeps (Black Overlay Disabled is the other way round); code keeps the ring on every White/Black Overlay state.",
    },
    ...["Default", "Disabled"].map((State) => ({
      vp: { Size: "XSmall", Level: "Black Overlay", State },
      layer: "Container",
      prop: "stroke",
      note: "Only XSmall Black Overlay Default/Disabled lack the gradient ring (XSmall Hover/Pressed/Focused and every other size have it); code keeps it.",
    })),
  ],
});

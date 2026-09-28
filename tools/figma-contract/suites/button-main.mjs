import { buttonSuite } from "./_button-shared.mjs";
// Figma Button/Main 1026:8312. Figma-side inconsistencies (reported; code keeps one consistent rule instead of copying them).
export default buttonSuite({
  setId: "1026:8312",
  contract: "button-text.json",
  appearance: "main",
  iconOnly: false,
  figmaExceptions: [
    ...["Default", "Hover", "Focused"].map((State) => ({
      vp: { Level: "Surface", State },
      layer: "Container",
      prop: "blur",
      note: "Main Surface binds Effect/Overlay (blur) only on Pressed/Disabled and Icon-Main Surface never does; code keeps the Effect/Overlay blur on every Surface state.",
    })),
    {
      vp: { Level: "Surface", State: "Hover" },
      layer: "Container",
      prop: "fill",
      note: "Main Surface Hover binds Color/Background/Surface/Pressed; Icon-Main Surface Hover binds Surface/Hover — code uses Surface/Hover for both.",
    },
  ],
});

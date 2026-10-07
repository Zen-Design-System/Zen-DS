import { buttonSuite, iconRingExceptions } from "./_button-shared.mjs";
// Figma Button/Icon-Main 205:21062. Unlike Button/Main, Icon-Main keeps Shadow/Action/Basic on Pressed for the solid levels.
// Figma-side inconsistencies (reported; code keeps one consistent rule instead of copying them).
export default buttonSuite({
  setId: "205:21062",
  contract: "button-icon.json",
  appearance: "main",
  iconOnly: true,
  figmaExceptions: [
    ...iconRingExceptions,
    ...["Default", "Hover", "Pressed", "Focused", "Disabled"].map((State) => ({
      vp: { Level: "Surface", State },
      layer: "Container",
      prop: "blur",
      note: "Icon-Main Surface has no background blur while Main Surface binds Effect/Overlay on Pressed/Disabled; code keeps the Effect/Overlay blur on every Surface button.",
    })),
    {
      vp: { Level: "Danger", State: "Disabled" },
      layer: "Container",
      prop: "fx",
      note: "Primary/Accent/Positive Disabled keep Shadow/Action/Basic but Danger Disabled drops it; code keeps it on all four solid levels.",
    },
    {
      vp: { Size: "2XSmall", Level: "Tertiary", State: "Disabled" },
      layer: "Container",
      prop: "fx",
      note: "Only 2XSmall Tertiary Disabled binds Shadow/Action/Basic; the other five sizes and Button/Main Tertiary Disabled have no effect.",
    },
    {
      vp: { Level: "Positive Secondary", State: "Pressed" },
      layer: "Container",
      prop: "fill",
      note: "Binds Color/Background/Positive/Flat/Pressed (same value as Subtle/Default, lighter than Hover); Danger Secondary Pressed binds Negative/Subtle/Pressed — code uses Positive/Subtle/Pressed.",
    },
    {
      vp: { Level: "Primary", State: "Pressed" },
      layer: "Container/Leading-Icon/Vector",
      prop: "fill",
      note: "Icon-Main Primary Pressed keeps Button-Primary/Content/Default while Button/Main Primary Pressed binds Content/Pressed (differs in dark mode only); code follows Button/Main.",
    },
  ],
});

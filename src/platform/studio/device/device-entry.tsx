import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DevicePlay } from "./DevicePlay";
// The phone's page of Open on phone (device.html): the same global styles as src/main.tsx, no platform shell and no
// sign-in (the share token in the link is the key; tools/studio/device-share.mjs).
import "../../../icons/all";
import "../../../styles/fonts.css";
import "../../../styles/reset.css";
import "../../../styles/tokens.css";
import "../../../styles/typography.css";
import "../../../styles/style-effects.css";
import "../builder/builder.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DevicePlay />
  </StrictMode>,
);

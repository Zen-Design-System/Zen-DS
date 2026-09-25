import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PlatformApp } from "./platform/PlatformApp";
import "./styles/fonts.css";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/style-effects.css";
import "./styles/foundations.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PlatformApp />
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { StudioApp } from "./StudioApp";
// Same global styles as src/main.tsx. This entry (studio.html) serves the Studio alone on the studio dev server
// (vite.studio.config.ts, port 5180) while it is built; src/main.tsx picks the Studio or the classic platform.
import "../../icons/all";
import "../../styles/fonts.css";
import "../../styles/reset.css";
import "../../styles/tokens.css";
import "../../styles/typography.css";
import "../../styles/style-effects.css";
import "../../styles/foundations.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StudioApp />
  </StrictMode>,
);

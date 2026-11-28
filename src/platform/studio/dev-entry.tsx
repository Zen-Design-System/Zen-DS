import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AuthGate } from "../auth/AuthGate";
import { StudioApp } from "./StudioApp";
import { SeatGate } from "./collab/SeatGate";
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
    <AuthGate>
      {/* The hosted Studio opens for seat holders only (collab/SeatGate.tsx); a local one has no door. */}
      <SeatGate>
        <StudioApp />
      </SeatGate>
    </AuthGate>
  </StrictMode>,
);

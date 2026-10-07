import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { PlatformApp } from "./platform/PlatformApp";
import { AuthGate } from "./platform/auth/AuthGate";
// The docs platform shows every icon (gallery, examples): register the whole set so nothing waits for a lazy bucket.
import "./icons/all";
import "./styles/fonts.css";
import "./styles/reset.css";
import "./styles/tokens.css";
import "./styles/typography.css";
import "./styles/style-effects.css";
import "./styles/foundations.css";

const StudioApp = lazy(() => import("./platform/studio/StudioApp").then((module) => ({ default: module.StudioApp })));

/**
 * Zen Studio (the canvas tool, src/platform/studio) is the default UI. `?ui=classic` opens the classic docs, and so does
 * an automated browser (navigator.webdriver: the QA gate's Playwright audits the classic DOM); `?ui=studio` forces the
 * Studio there.
 */
function pickUi(): "studio" | "classic" {
  const ui = new URLSearchParams(window.location.search).get("ui");
  if (ui === "studio" || ui === "classic") return ui;
  return navigator.webdriver ? "classic" : "studio";
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthGate>
      {pickUi() === "studio" ? <Suspense fallback={null}><StudioApp /></Suspense> : <PlatformApp />}
    </AuthGate>
  </StrictMode>,
);

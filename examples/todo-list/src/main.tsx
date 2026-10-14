import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@zen-ds/react/styles.css";
import "@zen-ds/react/reset.css";
import { ZenProvider } from "@zen-ds/react";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ZenProvider theme="system">
      <App />
    </ZenProvider>
  </StrictMode>,
);

// button-only.tsx with per-component CSS: the style entry loads the base and the CSS a Button needs, not styles.css.
// verify-package.mjs compares the CSS this page loads with button-only.html's.
import { createRoot } from "react-dom/client";
import "@zen-ds/react/styles/Button";
import { Button } from "@zen-ds/react";

createRoot(document.getElementById("root")!).render(<Button level="primary">Save changes</Button>);

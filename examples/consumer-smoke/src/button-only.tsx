// The smallest real Zen app: the stylesheet + one Button. verify-package.mjs holds its JS to the budget.
import { createRoot } from "react-dom/client";
import "@zen-ds/react/styles.css";
import { Button } from "@zen-ds/react";

createRoot(document.getElementById("root")!).render(<Button level="primary">Save changes</Button>);

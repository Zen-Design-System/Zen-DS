// The smallest real Zen app: the stylesheet + one Button. verify-package.mjs holds its JS to the budget.
import { createRoot } from "react-dom/client";
import "@zen/design-system/styles.css";
import { Button } from "@zen/design-system";

createRoot(document.getElementById("root")!).render(<Button level="primary">Save changes</Button>);

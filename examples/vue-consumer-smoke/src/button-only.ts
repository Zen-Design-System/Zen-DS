// The smallest real Zen app in Vue: the stylesheet + one Button (a render function, so no SFC plugin is needed to build
// it). vue-verify-package.mjs holds its JS to the budget.
import { createApp, h } from "vue";
import "@zen-ds/vue/styles.css";
import { Button } from "@zen-ds/vue";

createApp({ render: () => h(Button, { level: "primary", startIcon: "icon-plus-line" }, () => "Save changes") }).mount("#app");

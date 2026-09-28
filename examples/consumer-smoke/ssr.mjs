// Server render with the packed package in plain Node (no bundler): the JS must not import CSS or touch the DOM at load.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import * as Zen from "@zen/design-system";

const { Button, Icon, ZenProvider } = Zen;
const html = renderToString(
  createElement(ZenProvider, { theme: "dark", typography: "mobile" },
    createElement(Button, { level: "primary" }, "Save changes"),
    createElement(Icon, { name: "icon-rocket-line", title: "Launch" }),
  ),
);
if (!html.includes('data-theme="dark"') || !html.includes("zen-provider")) {
  console.error(`✗ SSR output has no ZenProvider modes: ${html}`);
  process.exit(1);
}
if (!html.includes("zen-button")) {
  console.error(`✗ SSR output has no .zen-button: ${html}`);
  process.exit(1);
}
console.log(`✓ renderToString (${Object.keys(Zen).length} exports, ${html.length} chars of HTML)`);

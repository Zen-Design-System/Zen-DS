// Server render with the packed package in plain Node (no bundler): the JS must not import CSS or touch the DOM at load.
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import * as Zen from "@zen-ds/react";

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

// The AI UI runtime in plain Node: the catalog ships, a spec validates against it and renders to HTML with real components.
import { createRequire } from "node:module";
import { renderSpec, validateSpec } from "@zen-ds/react/ai-ui";

const catalog = createRequire(import.meta.url)("@zen-ds/react/ai-ui/catalog.json");
const spec = { version: 1, root: { type: "Stack", id: "root", children: [{ type: "Button", id: "save", props: { level: "primary", onClick: { $action: "save" } }, children: ["Save"] }] } };
const checked = validateSpec(spec, catalog);
if (!checked.ok) {
  console.error(`✗ the AI UI spec does not validate against the shipped catalog: ${JSON.stringify(checked.errors)}`);
  process.exit(1);
}
const aiHtml = renderToString(createElement(ZenProvider, null, renderSpec(spec, { catalog })));
if (!aiHtml.includes('data-ai-ui-id="save"') || !aiHtml.includes("zen-button")) {
  console.error(`✗ AI UI SSR output has no rendered Button: ${aiHtml}`);
  process.exit(1);
}
console.log("✓ AI UI spec validated and rendered in Node");

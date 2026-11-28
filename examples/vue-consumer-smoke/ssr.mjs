// Server render with the packed package in plain Node (no bundler): the JS must not import CSS or touch the DOM at load.
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import * as Zen from "@zen-ds/vue";

const { Button, Icon, Stack } = Zen;
const app = createSSRApp({
  render: () => h(Stack, { gap: "md" }, () => [
    h(Button, { level: "primary" }, () => "Save changes"),
    h(Icon, { name: "icon-rocket-line", title: "Launch" }),
  ]),
});
const html = await renderToString(app);
if (!html.includes("zen-button") || !html.includes("zen-stack")) {
  console.error(`✗ SSR output has no .zen-button in a .zen-stack: ${html}`);
  process.exit(1);
}
if (!html.includes("<svg")) {
  console.error(`✗ SSR output has no icon (core icons are registered on import): ${html}`);
  process.exit(1);
}
console.log(`✓ renderToString (${Object.keys(Zen).length} exports, ${html.length} chars of HTML)`);

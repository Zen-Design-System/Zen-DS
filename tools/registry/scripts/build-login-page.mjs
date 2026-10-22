#!/usr/bin/env node
// Builds the registry's sign-in page from Zen DS itself: the real components (ZenProvider, Card, Heading, Text,
// InlineMessage, Button) rendered to static HTML with react-dom/server, plus the part of dist/styles.css those
// elements use and the Inter font. Output: plugins/verdaccio-zen-license/login/ (committed; the registry image
// copies it, so the server needs no build).
//
//   npm run build:lib            # in the repo root, once (dist/)
//   node tools/registry/scripts/build-login-page.mjs
//
// login-page.js fills in the PocketBase URL and the page script; the markup here has no behaviour of its own.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../..");
const out = path.resolve(here, "../plugins/verdaccio-zen-license/login");
const require = createRequire(path.join(root, "package.json"));
const { createElement: h } = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const postcss = require("postcss");

const dist = path.join(root, "dist");
if (!fs.existsSync(path.join(dist, "index.js"))) throw new Error("dist/ is missing: run `npm run build:lib` in the repo root");
const Z = await import(pathToFileURL(path.join(dist, "index.js")).href);
await Z.preloadIcons(["icon-alert-octagon-solid", "icon-check-circle-solid", "icon-alert-triangle-solid"]);

// Google's "G" mark (brand colours, as Google's sign-in guidelines ask); Zen has no Google logo icon.
const googleMark = h("svg", { viewBox: "0 0 48 48", width: 20, height: 20, "aria-hidden": true, focusable: "false" },
  h("path", { fill: "#EA4335", d: "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" }),
  h("path", { fill: "#4285F4", d: "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" }),
  h("path", { fill: "#FBBC05", d: "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" }),
  h("path", { fill: "#34A853", d: "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" }),
);

const bold = (text) => h(Z.Text, { as: "span", textStyle: "Body/Base/Bold" }, text);

/** The page frame of Zen's SignInTemplate: a flat Card centred on the Canvas, a caption under it. */
function frame(card, footer) {
  return h(Z.ZenProvider, { theme: "light" },
    h(Z.Container, { maxWidth: "sm" },
      h(Z.Stack, { gap: "lg", justify: "center", paddingY: "xl", style: { minHeight: "100vh", boxSizing: "border-box" } },
        h(Z.Card, { theme: "default" },
          h(Z.Stack, { justify: "center", width: "fill", direction: "row" },
            h(Z.Box, { padding: "xl", paddingX: "none", width: "fill", maxWidth: 400 }, card))),
        footer)));
}

const signIn = frame(
  h(Z.Stack, { gap: "xl" },
    h(Z.Stack, { gap: "xs" },
      h(Z.Heading, { level: 1, align: "center" }, "Sign in to the Zen DS registry"),
      h(Z.Text, { tone: "base", align: "center" },
        "Your terminal ran ", bold("npm login"), ". Continue with the Google account of your Zen account; your licence needs a free seat for you.")),
    h("div", { id: "zen-error", hidden: true },
      h(Z.InlineMessage, { theme: "negative", title: "Couldn't sign you in" }, h("span", { id: "zen-error-text" }))),
    h("div", { id: "zen-done", hidden: true },
      h(Z.InlineMessage, { theme: "positive", title: "Signed in" },
        h("span", { id: "zen-done-text" }, "You can close this tab and go back to your terminal."))),
    // A plain wrapper toggles visibility: a Stack's display: flex would win over the hidden attribute.
    h("div", { id: "zen-actions" },
      h(Z.Stack, { align: "stretch" },
        h(Z.Button, { id: "zen-google", level: "primary", size: "lg", startIcon: googleMark }, "Continue with Google")))),
  h(Z.Text, { textStyle: "Caption/Regular", tone: "light", align: "center" },
    "Only continue if you started this sign-in in your terminal. Questions: zen.tool@dizai.studio"),
);

const expired = frame(
  h(Z.Stack, { gap: "xl" },
    h(Z.Stack, { gap: "xs" },
      h(Z.Heading, { level: 1, align: "center" }, "Sign-in link expired"),
      h(Z.Text, { tone: "base", align: "center" },
        "This link was already used or is more than 10 minutes old. Run ", bold("npm login"), " again in your terminal."))),
  null,
);

const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title}</title>
<link rel="stylesheet" href="/-/zen/static/zen.css">
</head>
<body>
${body}
<!--ZEN_SCRIPT-->
</body>
</html>
`;
const pages = {
  "signin.html": page("Zen DS registry sign-in", renderToStaticMarkup(signIn)),
  "expired.html": page("Zen DS registry sign-in", renderToStaticMarkup(expired)),
};

// Keep the rules the pages can match: tokens and base rules (no class), and class rules whose classes all appear.
const used = new Set(Object.values(pages).flatMap((html) => [...html.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/))));
const classesOf = (selector) => [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
const css = postcss.parse(fs.readFileSync(path.join(dist, "styles.css"), "utf8"));
css.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes/i.test(rule.parent.name)) return;
  const kept = rule.selectors.filter((sel) => classesOf(sel).every((c) => used.has(c)));
  if (!kept.length) rule.remove();
  else rule.selectors = kept;
});
// Custom properties: keep only those the kept rules (and inline styles) reach, following var() chains.
const refs = (value) => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
const defs = new Map();
css.walkDecls(/^--/, (decl) => defs.set(decl.prop, [...(defs.get(decl.prop) || []), ...refs(decl.value)]));
const reached = new Set();
const queue = [...Object.values(pages).flatMap((html) => refs(html.replaceAll("&quot;", '"')))];
css.walkDecls((decl) => { if (!decl.prop.startsWith("--")) queue.push(...refs(decl.value)); });
while (queue.length) {
  const name = queue.pop();
  if (reached.has(name)) continue;
  reached.add(name);
  queue.push(...(defs.get(name) || []));
}
css.walkDecls(/^--/, (decl) => { if (!reached.has(decl.prop)) decl.remove(); });
css.walkRules((rule) => { if (!rule.nodes.length) rule.remove(); });
const prune = () => {
  let removed = 0;
  css.walkAtRules((at) => {
    if (/^(media|supports|layer|container)$/i.test(at.name) && at.nodes && !at.nodes.length) { at.remove(); removed += 1; }
  });
  return removed;
};
while (prune());
css.walkDecls((decl) => {
  if (decl.value.includes("./fonts/")) decl.value = decl.value.replaceAll("./fonts/", "/-/zen/static/");
});
// The page itself: no margin, the Canvas fills the window.
const output = `${css.toString()}\nbody { margin: 0; }\n`;

fs.mkdirSync(out, { recursive: true });
for (const [name, html] of Object.entries(pages)) fs.writeFileSync(path.join(out, name), html);
fs.writeFileSync(path.join(out, "zen.css"), output);
fs.copyFileSync(path.join(dist, "fonts", "InterVariable.woff2"), path.join(out, "InterVariable.woff2"));
fs.copyFileSync(path.join(dist, "fonts", "LICENSE.md"), path.join(out, "Inter-LICENSE.md"));
console.log(`wrote ${path.relative(root, out)}: ${Object.keys(pages).join(", ")}, zen.css (${(output.length / 1024).toFixed(0)} KB), InterVariable.woff2`);

// Selftest of the Studio project theme (tools/studio/project-theme.mjs) and its ramp generator copy
// (zen-ramp.generated.mjs): node tools/studio/project-theme.selftest.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateExpectedPalette } from "./zen-ramp.generated.mjs";
import { RAMPS, SECTOR_NAMES, SUPPORT_FAMILIES, defaultProjectTheme, projectBaseValues, normalizeProject, projectIdFor, projectModes, projectPalettes, projectThemeCss, tintedNeutralAnchor } from "./project-theme.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const collection = (file) => Object.values(JSON.parse(fs.readFileSync(path.join(root, "tokens/source/figma", file), "utf8")))[0];
const valueOf = (data) => { const values = new Map(data.tokens.map((token) => [token.name, Object.values(token.valuesByMode)[0]])); return (name) => values.get(name); };
const global = valueOf(collection("global-colors.json"));
const baseColors = valueOf(collection("base-colors-project.json"));
const tokensCss = fs.readFileSync(path.join(root, "src/styles/tokens.css"), "utf8");
const styleEffects = fs.readFileSync(path.join(root, "src/styles/style-effects.css"), "utf8");
let checks = 0;
const ok = (fn, label) => { fn(); checks += 1; if (process.env.VERBOSE) console.log(`  ✓ ${label}`); };

// 1. The anchors are the shipped Light step 9, and the generator reproduces every shipped step (the plugin made them).
const grayDark = generateExpectedPalette(RAMPS.Gray, true).darkBackground;
for (const [name, anchor] of Object.entries(RAMPS)) {
  ok(() => assert.equal(anchor.toLowerCase(), String(global(`Light/${name}/9`)).toLowerCase(), `${name} anchor`), `${name} anchor`);
  const palette = generateExpectedPalette(anchor, name === "Gray", grayDark);
  for (const [key, side, alpha] of [["lightSolid", "Light", ""], ["darkSolid", "Dark", ""], ["lightAlpha", "Light", "-Alpha"], ["darkAlpha", "Dark", "-Alpha"]]) {
    palette[key].forEach((hex, index) => {
      const shipped = String(global(`${side}/${name}${alpha}/${index + 1}`)).toLowerCase();
      const made = hex.toLowerCase();
      ok(() => assert.ok(made === shipped || (shipped.length === 7 && made === `${shipped}ff`), `${side}/${name}${alpha}/${index + 1}: generated ${made}, shipped ${shipped}`), `${name} ${key} ${index + 1}`);
    });
  }
}

// 2. The default theme's On-Brand equals the Zen mode's (Base Colors (Project) / Zen).
const palettes = projectPalettes(defaultProjectTheme());
for (const side of ["Light", "Dark"]) for (const state of ["Default", "Hover", "Pressed"]) {
  ok(() => assert.equal(palettes.onBrand[side.toLowerCase()][state.toLowerCase()].toLowerCase(), String(baseColors(`${side}/On-Brand-${state}`)).toLowerCase(), `${side} On-Brand-${state}`), `on-brand ${side} ${state}`);
}

// 3. The CSS declares only variables tokens.css knows, in both blocks, and reads Support tokens that exist.
const css = projectThemeCss("acme", defaultProjectTheme(), { name: "Acme" });
const declared = [...css.matchAll(/^\s+(--zen-[a-z0-9-]+):/gm)].map((match) => match[1]);
const baseNames = declared.filter((name) => !name.startsWith("--zen-chart-sector-"));
ok(() => assert.equal(baseNames.length, 48 * 6 + 6), "48 per role (Brand, Neutral, 4 status) + 6 On-Brand");
for (const name of baseNames) ok(() => assert.ok(tokensCss.includes(`${name}:`), `${name} is not a Zen token`), name);
for (const match of css.matchAll(/var\((--zen-[a-z0-9-]+)\)/g)) ok(() => assert.ok(tokensCss.includes(`${match[1]}:`), `${match[1]} is not a Zen token`), match[1]);
for (const family of SUPPORT_FAMILIES) for (const tone of ["solid", "soft", "subtle"]) ok(() => assert.ok(tokensCss.includes(`--zen-color-background-support-${family}-${tone}:`), `${family}-${tone}`), `support ${family} ${tone}`);
ok(() => assert.match(css, /^\[data-brand="p-acme"\],\n\[data-brand="p-acme"\] \[data-contrast\]:not\(\[data-brand\]\) \{/m), "base block selector");
ok(() => assert.match(css, /^\[data-brand="p-acme"\],\n\[data-brand="p-acme"\] \[data-theme\]:not\(\[data-brand\]\) \{/m), "chart block selector");
ok(() => assert.match(css, /--zen-light-brand-9: var\(--zen-light-zen-9\);/), "a shipped ramp is an alias");

// 4. The default chart sectors are the Figma styles "Color Chart Sector/Tertiary … Septenary".
defaultProjectTheme().chart.forEach((slot, index) => {
  const sector = SECTOR_NAMES[index + 2];
  ok(() => assert.match(styleEffects, new RegExp(`--zen-style-color-chart-sector-${sector}-fill: var\\(--zen-color-background-support-${slot.family}-${slot.tone},`), `Figma style ${sector}`), `sector ${sector}`);
});

// 5. A custom colour writes values: step 9 is the colour, Light and Dark, solid and alpha.
const custom = { ...defaultProjectTheme(), primary: { hex: "#4F46E5" }, neutral: { tint: "primary" } };
const customCss = projectThemeCss("acme", custom);
ok(() => assert.ok(customCss.includes("--zen-light-brand-9: #4F46E5;")), "custom step 9 is the picked colour");
ok(() => assert.ok(/--zen-dark-brand-alpha-12: #[0-9A-F]{8};/.test(customCss)), "custom dark alpha");
ok(() => assert.ok(!customCss.includes("--zen-light-neutral-1: var(")), "a tinted neutral writes values");
ok(() => { const tint = tintedNeutralAnchor("#4F46E5"); assert.match(tint, /^#[0-9A-F]{6}$/); assert.notEqual(tint, RAMPS.Gray); }, "tinted neutral anchor");
ok(() => assert.equal(projectPalettes({ ...defaultProjectTheme(), primary: { ramp: "Yellow" } }).onBrand.light.default, "#000000db"), "a light Primary takes dark text");

// 6. normalizeProject: bad id / name are fatal, bad values fall back with a reason.
ok(() => assert.equal(normalizeProject({ id: "Bad Id", name: "x" }).project, null), "bad id");
ok(() => assert.equal(normalizeProject({ id: "acme", name: "  " }).project, null), "empty name");
{
  const { project, errors } = normalizeProject({ id: "acme", name: "Acme", theme: { primary: { hex: "red" }, modes: { radius: "studio", density: "comfortable" }, chart: [{ family: "violet", tone: "soft" }] } });
  ok(() => assert.deepEqual(project.theme.primary, { ramp: "Zen" }), "bad hex → Zen");
  ok(() => assert.equal(project.theme.modes.radius, "rounded"), "Studio's chrome radius is not a project mode");
  ok(() => assert.equal(project.theme.modes.density, "comfortable"), "known value kept");
  ok(() => assert.deepEqual(project.theme.chart[0], { family: "violet", tone: "soft" }), "chart slot kept");
  ok(() => assert.equal(project.theme.chart.length, 5), "five chart slots");
  ok(() => assert.equal(errors.length, 2), `two replaced values (${errors.join("; ")})`);
}
ok(() => assert.deepEqual(projectModes(defaultProjectTheme()), { componentTheme: "brand-s1", density: "compact", radius: "rounded", typography: "dashboard", emphasis: "medium" }), "modes");

// 6b. The project's Figma values: the default theme gives exactly the Zen mode's Base Colors (Project) values.
{
  const values = projectBaseValues(defaultProjectTheme());
  ok(() => assert.equal(Object.keys(values).length, 48 * 6 + 6), "Figma values: 6 roles + On-Brand");
  for (const [name, value] of Object.entries(values)) ok(() => assert.equal(String(value).toUpperCase(), String(baseColors(name)).toUpperCase(), `${name}: ${value} vs Zen ${baseColors(name)}`), `figma ${name}`);
  const custom = projectBaseValues({ ...defaultProjectTheme(), primary: { hex: "#4F46E5" } });
  ok(() => assert.equal(custom["Light/Brand/9"], "#4F46E5"), "custom Brand 9 is the colour");
  ok(() => assert.match(custom["Dark/Brand-Alpha/3"], /^#[0-9A-F]{8}$/), "custom alpha is #RRGGBBAA");
}

// 7. Ids from names, Vietnamese included.
ok(() => assert.equal(projectIdFor("Dự án Đìzai Studio"), "du-an-dizai-studio"), "vi id");
ok(() => assert.equal(projectIdFor("Acme", new Set(["acme", "acme-2"])), "acme-3"), "free id");
ok(() => assert.equal(projectIdFor("!!!"), "project"), "empty id");

console.log(`project-theme selftest: ${checks} checks passed`);

// Selftest of the Studio project theme (tools/studio/project-theme.mjs) and its ramp generator copy
// (zen-ramp.generated.mjs): node tools/studio/project-theme.selftest.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateExpectedPalette } from "./zen-ramp.generated.mjs";
import { DEFAULT_LOCALE, FONT_FAMILIES, MAX_FONT_FAMILIES, PROJECT_LOCALES, RAMPS, SECTOR_NAMES, SUPPORT_FAMILIES, defaultLibraries, defaultProjectTheme, normalizeLibraries, projectBaseValues, normalizeProject, projectIdFor, projectModes, projectPalettes, projectFontsUrl, projectFontStack, projectThemeCss, projectTypeScale, suggestedChart, chartFollowsPrimary, tintedNeutralAnchor, uploadedFontName } from "./project-theme.mjs";

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
// 6a. Libraries: on unless project.json says false; an old project (none written) uses all three.
ok(() => assert.deepEqual(normalizeProject({ id: "acme", name: "Acme" }).project.libraries, defaultLibraries()), "an old project uses every library");
ok(() => assert.deepEqual(normalizeLibraries({ zen: false, theme: "no", extra: false }), { zen: false, components: true, theme: true }), "only false turns one off");
ok(() => assert.deepEqual(normalizeLibraries(null), { zen: true, components: true, theme: true }), "no value: all on");
// 6c. Language: an old project (none written) is US English; Vietnamese kept; anything else falls back with a reason.
ok(() => assert.equal(normalizeProject({ id: "acme", name: "Acme" }).project.locale, DEFAULT_LOCALE), "an old project is en-US");
ok(() => assert.equal(normalizeProject({ id: "acme", name: "Acme", locale: "vi-VN" }).project.locale, "vi-VN"), "vi-VN kept");
ok(() => { const { project, errors } = normalizeProject({ id: "acme", name: "Acme", locale: "fr-FR" }); assert.equal(project.locale, "en-US"); assert.match(errors.join(";"), /locale/); }, "an unknown language → en-US with a reason");
ok(() => assert.deepEqual(Object.keys(PROJECT_LOCALES), ["en-US", "vi-VN"]), "the languages labels.ts ships");
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

// 6d. Typography (the Zen Figma plugin's Typeface + Type Scale): Inter and no scale write nothing; fonts and a scale
//     write only Typography Configuration variables tokens.css knows, on every [data-typography] of the project.
ok(() => assert.ok(!css.includes("typography") && !css.includes("@import")), "the default theme leaves typography to the mode");
ok(() => assert.equal(normalizeProject({ id: "acme", name: "Acme" }).project.theme.type.scale, null), "an old project has no scale");
{
  const typed = { ...defaultProjectTheme(), type: { fonts: { sans: "Be Vietnam Pro", heading: "Fraunces", display: "Fraunces", button: "Inter" }, scale: { base: 16, ratio: 1.2 } } };
  const typedCss = projectThemeCss("acme", typed);
  const names = [...typedCss.matchAll(/^\s+(--zen-typography-[a-z0-9-]+):/gm)].map((match) => match[1]);
  ok(() => assert.equal(names.length, 3 + 17 * 3), "3 fonts + 17 sizes × size, line height, letter spacing");
  for (const name of names) ok(() => assert.ok(tokensCss.includes(`${name}:`), `${name} is not a Zen token`), name);
  ok(() => assert.ok(typedCss.startsWith('@import url("https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=Fraunces:wght@400;500;600;700&display=swap");\n')), "fonts load first in the sheet");
  ok(() => assert.match(typedCss, /^\[data-brand="p-acme"\]\[data-typography\],\n\[data-brand="p-acme"\] \[data-typography\]:not\(\[data-brand\]\) \{/m), "type block selector");
  ok(() => assert.equal(projectFontsUrl(defaultProjectTheme()), null), "Inter is bundled: no font request");
  ok(() => assert.ok(FONT_FAMILIES.includes("Inter") && FONT_FAMILIES.includes("Be Vietnam Pro")), "fonts");
  // The plugin's curated values at 14 / 1.14, and its formula elsewhere.
  ok(() => assert.deepEqual(projectTypeScale({ base: 14, ratio: 1.14 })["heading-1"], { size: 32, lineHeight: 40, letterSpacing: -0.76 }), "plugin preset");
  ok(() => assert.deepEqual(projectTypeScale({ base: 16, ratio: 1.2 })["body-base"], { size: 16, lineHeight: 24, letterSpacing: 0 }), "the base is Body/Base");
  ok(() => { const { project, errors } = normalizeProject({ id: "acme", name: "Acme", theme: { type: { fonts: { sans: "Comic Sans" }, scale: { base: 40, ratio: 3 } } } }); assert.equal(project.theme.type.fonts.sans, "Inter"); assert.equal(project.theme.type.scale, null); assert.equal(errors.length, 2); }, "unknown font / scale out of range fall back with reasons");
}

// 6e. Uploaded fonts (user 2026-11-10): one @font-face per file under the family's project-scoped name, the role on that
//     name then Inter; no Google request for it; names the list has, bad files and a role naming an unknown font fall back.
{
  const acme = { family: "Acme Sans", faces: [{ file: "acme-sans-regular-1a2b3c4d.woff2", weight: 400, style: "normal" }, { file: "acme-sans-var-0a0b0c0d.ttf", weight: [100, 900], style: "italic", vietnamese: false }] };
  const { project, errors } = normalizeProject({ id: "acme", name: "Acme", theme: { type: { fonts: { sans: "Acme Sans", heading: "Fraunces", button: "Acme Sans" }, uploads: [acme] } } });
  ok(() => assert.deepEqual(errors, []), "a valid upload has no errors");
  ok(() => assert.deepEqual(project.theme.type.uploads[0].faces.map((face) => [face.weight, face.style, face.vietnamese]), [[400, "normal", true], [[100, 900], "italic", false]]), "faces keep weight, style, Vietnamese");
  const fontCss = projectThemeCss("acme", project.theme);
  ok(() => assert.ok(fontCss.includes('@font-face { font-family: "Acme Sans (acme)"; src: url("fonts/acme-sans-regular-1a2b3c4d.woff2") format("woff2"); font-weight: 400; font-style: normal; font-display: swap; }')), "a face per file, beside theme.css");
  ok(() => assert.ok(fontCss.includes('src: url("fonts/acme-sans-var-0a0b0c0d.ttf") format("truetype"); font-weight: 100 900; font-style: italic;')), "a variable font takes its weight range");
  ok(() => assert.ok(fontCss.includes('--zen-typography-font-family-sans: "Acme Sans (acme)", "Inter", sans-serif;')), "the role names the project's font");
  ok(() => assert.ok(fontCss.startsWith('@import url("https://fonts.googleapis.com/css2?family=Fraunces:wght@400;500;600;700&display=swap");\n')), "only the list's fonts load from Google");
  ok(() => assert.ok(fontCss.indexOf("@font-face") > fontCss.indexOf("@import")), "@import stays first");
  ok(() => assert.ok(!projectThemeCss("acme", project.theme, { fontUrl: (file) => (file.endsWith(".ttf") ? null : `blob:x/${file}`) }).includes(".ttf")), "a file without a URL is left out");
  ok(() => assert.equal(uploadedFontName("draft", "Acme Sans"), "Acme Sans (draft)"), "the draft's name");
  ok(() => assert.equal(projectFontStack("acme", project.theme, "Fraunces"), '"Fraunces", "Inter", sans-serif'), "a listed font keeps its name");
  const bad = normalizeProject({ id: "acme", name: "Acme", theme: { type: { fonts: { sans: "Ghost" }, uploads: [
    { family: "Roboto", faces: acme.faces }, { family: 'Evil"; }', faces: acme.faces }, { family: "Bare", faces: [{ file: "../x.woff2", weight: 400 }, { file: "bare-1a2b3c4d.woff", weight: 450 }] }, acme, { ...acme },
  ] } } });
  ok(() => assert.deepEqual(bad.project.theme.type.uploads.map((font) => font.family), ["Acme Sans"]), "a listed name, quotes, bad files, a second Acme Sans are dropped");
  ok(() => assert.equal(bad.project.theme.type.fonts.sans, "Inter"), "a role naming no font falls back");
  ok(() => assert.equal(bad.errors.length, 7), "each with a reason");
  const many = normalizeProject({ id: "acme", name: "Acme", theme: { type: { uploads: Array.from({ length: MAX_FONT_FAMILIES + 2 }, (_, n) => ({ family: `Font ${n}`, faces: acme.faces })) } } });
  ok(() => assert.equal(many.project.theme.type.uploads.length, MAX_FONT_FAMILIES), "at most 8 fonts");
  ok(() => assert.deepEqual(normalizeProject({ id: "acme", name: "Acme" }).project.theme.type.uploads, []), "an old project has none");
}

// 7. Ids from names, Vietnamese included.
ok(() => assert.equal(projectIdFor("Dự án Đìzai Studio"), "du-an-dizai-studio"), "vi id");
ok(() => assert.equal(projectIdFor("Acme", new Set(["acme", "acme-2"])), "acme-3"), "free id");
ok(() => assert.equal(projectIdFor("!!!"), "project"), "empty id");

// Chart sectors suggested from the Primary: Zen gives Zen's palette back; every ramp gets five different, distinct families.
ok(() => assert.deepEqual(suggestedChart(RAMPS.Zen), defaultProjectTheme().chart), "chart suggestion for Zen = Zen palette");
for (const ramp of Object.keys(RAMPS).filter((name) => name !== "Gray")) {
  const chart = suggestedChart(RAMPS[ramp]);
  ok(() => assert.equal(new Set(chart.map((slot) => slot.family)).size, 5), `chart suggestion for ${ramp}: five families`);
  ok(() => assert.ok(chart.every((slot) => SUPPORT_FAMILIES.includes(slot.family) && !["brand", "neutral", "brown"].includes(slot.family))), `chart suggestion for ${ramp}: support families`);
}
ok(() => assert.deepEqual(suggestedChart("#0F73FF"), suggestedChart(RAMPS.Blue)), "chart suggestion from a hex");
ok(() => assert.equal(chartFollowsPrimary(defaultProjectTheme()), true), "Zen palette follows");
ok(() => assert.equal(chartFollowsPrimary({ ...defaultProjectTheme(), primary: { ramp: "Blue" }, chart: suggestedChart(RAMPS.Blue) }), true), "suggestion follows");
ok(() => assert.equal(chartFollowsPrimary({ ...defaultProjectTheme(), primary: { ramp: "Blue" } }), true), "untouched Zen palette follows any Primary");
ok(() => assert.equal(chartFollowsPrimary({ ...defaultProjectTheme(), chart: [{ family: "red", tone: "soft" }, ...defaultProjectTheme().chart.slice(1)] }), false), "a picked sector stops following");

console.log(`project-theme selftest: ${checks} checks passed`);

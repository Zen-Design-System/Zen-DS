import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(root, "styles/source/figma/text-styles.json");
const catalogPath = path.join(root, "src/tokens/catalog.generated.json");
const cssPath = path.join(root, "src/styles/typography.css");
const tsPath = path.join(root, "src/tokens/typography.generated.ts");
const manifestPath = path.join(root, "src/styles/generated/text-style-manifest.json");

const toKebab = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
const cssName = (name) => `--zen-${toKebab(name)}`;
const cssReference = (name) => `var(${cssName(name)})`;

const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
// Authoritative Figma Plugin API extraction (bound variables per text style property).
const fullSourcePath = path.join(root, "styles/source/figma/figma-styles.full.json");
const figmaBindings = fs.existsSync(fullSourcePath)
  ? new Map(JSON.parse(fs.readFileSync(fullSourcePath, "utf8")).text.map((style) => [style.name, style]))
  : new Map();
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
if (!Array.isArray(source.textStyles)) throw new Error("textStyles must be an array");

const tokenByName = new Map(catalog.tokens.map((token) => [token.name, token]));
const names = source.textStyles.map((style) => style.name);
const duplicateNames = names.filter((name, index) => names.indexOf(name) !== index);
if (duplicateNames.length) {
  throw new Error(`Duplicate text style names: ${[...new Set(duplicateNames)].join(", ")}`);
}

const styleSuffix = (name) => {
  const [category, scale, weight] = name.split("/");
  if (category === "Display-Extra") return `Display-Extra-${scale}`;
  if (category === "Display") return `Display-${scale}`;
  if (category === "Heading") return scale === "Subheading" ? "Subheading" : `Heading-${scale}`;
  if (category === "Body" && scale === "Code") return "Body-Small";
  if (category === "Body") return `Body-${scale}`;
  if (category === "Caption") return "Caption";
  if (category === "Label") return `Label-${scale}`;
  if (category === "Button-Label") return `Button-Label-${scale}`;
  if (category === "All-Caps") return `ALL-CAPS-${scale.split("-")[0]}`;
  throw new Error(`No typography token mapping for ${name} (${weight ?? ""})`);
};

const familySuffix = (name) => {
  if (name.startsWith("Display")) return "Display";
  if (name.startsWith("Heading")) return "Heading";
  if (name.startsWith("Button-Label")) return "Button";
  if (name.startsWith("Body/Code")) return "Dev";
  return "Sans";
};

const weightSuffix = (style) => {
  const semanticWeight = style.name.split("/").at(-1);
  const sourceWeight = ["Regular", "Medium", "Bold"].includes(semanticWeight)
    ? semanticWeight
    : style.fontWeight;
  const mapping = {
    Regular: "Regular",
    Medium: "Medium",
    "Semi Bold": "Semi-Bold",
    Semibold: "Semi-Bold",
    Bold: "Bold",
  };
  const suffix = mapping[sourceWeight];
  if (!suffix) throw new Error(`${style.name}: unsupported fontWeight ${sourceWeight}`);
  return suffix;
};

const requireToken = (name, styleName) => {
  const token = tokenByName.get(name);
  if (!token) throw new Error(`${styleName}: missing token ${name}`);
  return token;
};

const closeEnough = (left, right) => Math.abs(Number(left) - Number(right)) < 0.0001;
const definitions = source.textStyles.map((style) => {
  if (!style.name || !style.fontFamily || !style.fontWeight || typeof style.fontSize !== "number") {
    throw new Error(`Invalid text style: ${JSON.stringify(style)}`);
  }
  if (!style.letterSpacing || !["PIXELS", "PERCENT"].includes(style.letterSpacing.unit)) {
    throw new Error(`${style.name}: letterSpacing must include PIXELS or PERCENT unit`);
  }

  const suffix = styleSuffix(style.name);
  const letterSpacingSuffix = style.name.startsWith("Body/Code") ? "Body-Code" : suffix;
  const derived = {
    family: `Typography/Font-Family/${familySuffix(style.name)}`,
    size: `Typography/Font-Size/${suffix}`,
    weight: `Emphasis/Font-Weight/${weightSuffix(style)}`,
    lineHeight: `Typography/Line-Height/${suffix}`,
    letterSpacing: `Typography/Letter-Spacing/${letterSpacingSuffix}`,
  };
  // Figma binding wins over the name-derived guess (e.g. Display/Heading/Button bind Emphasis/Font-Weight/Bold).
  const bound = figmaBindings.get(style.name)?.bound ?? {};
  const tokens = {
    family: bound.fontFamily ?? derived.family,
    size: bound.fontSize ?? derived.size,
    weight: bound.fontWeight ?? derived.weight,
    lineHeight: bound.lineHeight ?? derived.lineHeight,
    letterSpacing: bound.letterSpacing ?? derived.letterSpacing,
    ...(bound.paragraphSpacing ? { paragraphSpacing: bound.paragraphSpacing } : {}),
  };
  const tokenRecords = Object.fromEntries(
    Object.entries(tokens).map(([key, tokenName]) => [key, requireToken(tokenName, style.name)]),
  );
  const dashboardSize = tokenRecords.size.valuesByMode.Dashboard;
  const dashboardFamily = tokenRecords.family.valuesByMode.Dashboard;
  const dashboardTracking = tokenRecords.letterSpacing.valuesByMode.Dashboard;
  if (dashboardFamily !== style.fontFamily || !closeEnough(dashboardSize, style.fontSize)) {
    throw new Error(`${style.name}: source font values do not match Dashboard typography variables`);
  }
  if (style.letterSpacing.unit === "PIXELS" && !closeEnough(dashboardTracking, style.letterSpacing.value)) {
    throw new Error(`${style.name}: source letterSpacing does not match Dashboard variable`);
  }

  return {
    name: style.name,
    className: `zen-type-${toKebab(style.name)}`,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    fontSize: style.fontSize,
    letterSpacing: style.letterSpacing,
    letterSpacingPercent: Number(((style.letterSpacing.value / style.fontSize) * 100).toFixed(2)),
    textCase: style.textCase ?? "ORIGINAL",
    tokens,
  };
});

const typographyCss = [
  "/* Generated from styles/source/figma/text-styles.json + figma-styles.full.json bindings. Do not edit directly. */",
  ...definitions.flatMap((style) => {
    const letterSpacing = style.letterSpacing.unit === "PERCENT"
      ? `${Number((style.letterSpacing.value / 100).toFixed(6))}em`
      : cssReference(style.tokens.letterSpacing);
    return [
      `.${style.className} {`,
      `  font-family: ${cssReference(style.tokens.family)};`,
      `  font-size: ${cssReference(style.tokens.size)};`,
      `  font-weight: ${cssReference(style.tokens.weight)};`,
      `  line-height: ${cssReference(style.tokens.lineHeight)};`,
      `  letter-spacing: ${letterSpacing};`,
      `  text-transform: ${style.textCase === "UPPER" ? "uppercase" : "none"};`,
      ...(style.tokens.paragraphSpacing ? [`  --zen-type-paragraph-spacing: ${cssReference(style.tokens.paragraphSpacing)};`] : []),
      "}",
      "",
    ];
  }),
].join("\n");

const typographyTs = [
  "/* Generated from styles/source/figma/text-styles.json + figma-styles.full.json bindings. Do not edit directly. */",
  `export const typographyStyles = ${JSON.stringify(
    Object.fromEntries(definitions.map(({ name, className }) => [name, className])),
    null,
    2,
  )} as const;`,
  "",
  `export const textStyleDefinitions = ${JSON.stringify(definitions, null, 2)} as const;`,
  "",
  "export type TypographyStyleName = keyof typeof typographyStyles;",
  "",
].join("\n");

fs.mkdirSync(path.dirname(cssPath), { recursive: true });
fs.mkdirSync(path.dirname(tsPath), { recursive: true });
fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
fs.writeFileSync(cssPath, typographyCss);
fs.writeFileSync(tsPath, typographyTs);
fs.writeFileSync(
  manifestPath,
  `${JSON.stringify(
    {
      fileName: source.fileName,
      count: definitions.length,
      units: Object.fromEntries(
        [...new Set(definitions.map((style) => style.letterSpacing.unit))].map((unit) => [
          unit,
          definitions.filter((style) => style.letterSpacing.unit === unit).length,
        ]),
      ),
      styles: definitions,
    },
    null,
    2,
  )}\n`,
);

console.log(`Generated ${definitions.length} text styles from ${source.fileName}.`);

import catalog from "../tokens/catalog.generated.json";
import { textStyleDefinitions } from "../tokens/typography.generated";

export type TokenValue = string | number | boolean;

export type ResolvedToken = {
  name: string;
  type: "COLOR" | "FLOAT" | "STRING" | "BOOLEAN" | "TEXT_STYLE";
  valuesByMode: Record<string, TokenValue>;
  modes: string[];
  collectionSlug: string;
  kind: "color" | "dimension" | "font-family" | "font-style" | "other";
  cssVariable: string | null;
};

export const toKebab = (value: string) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

const classifyKind = (
  name: string,
  type: ResolvedToken["type"],
): ResolvedToken["kind"] => {
  if (type === "COLOR") return "color";
  if (type === "TEXT_STYLE") return "font-style";
  if (name.includes("Font-Family")) return "font-family";
  if (type === "FLOAT") return "dimension";
  return "other";
};

const variableTokens: ResolvedToken[] = catalog.tokens.map((token) => ({
  name: token.name,
  type: token.type as ResolvedToken["type"],
  valuesByMode: token.valuesByMode,
  modes: token.modes,
  collectionSlug: token.collectionSlug,
  kind: classifyKind(token.name, token.type as ResolvedToken["type"]),
  cssVariable: `--zen-${toKebab(token.name)}`,
}));

const letterSpacingUnit = (unit: string) => (unit === "PERCENT" ? "%" : "px");

const textStyles: ResolvedToken[] = textStyleDefinitions.map((style) => ({
    name: style.name,
    type: "TEXT_STYLE",
    valuesByMode: {
      Figma: `${style.fontFamily} ${style.fontWeight}, ${style.fontSize}px, ${style.letterSpacing.value}${letterSpacingUnit(style.letterSpacing.unit)}`,
    },
    modes: ["Figma"],
    collectionSlug: "typography-configuration",
    kind: "font-style",
    cssVariable: null,
  }));

export const resolvedTokens = [...variableTokens, ...textStyles].sort((left, right) =>
  left.name.localeCompare(right.name),
);

export const tokensForCollection = (collectionSlug: string) =>
  resolvedTokens.filter((token) => token.collectionSlug === collectionSlug);

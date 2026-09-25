import source from "../../tokens/source/figma.collections.json";
import catalog from "../tokens/catalog.generated.json";

export type VariableType = "COLOR" | "FLOAT" | "STRING" | "BOOLEAN";

export type CollectionDefinition = {
  slug: string;
  name: string;
  layer: "primitive" | "semantic" | "component" | "layout";
  variableCount: number;
  modes: string[];
  types: Partial<Record<VariableType, number>>;
  hiddenVariableCount: number;
  purpose: string;
  codeAxis: string | null;
};

export const collections = source.collections as CollectionDefinition[];

export const totals = {
  collections: collections.length,
  variables: collections.reduce((total, collection) => total + collection.variableCount, 0),
  hiddenVariables: collections.reduce(
    (total, collection) => total + collection.hiddenVariableCount,
    0,
  ),
  resolvedVariables: catalog.tokens.length,
};

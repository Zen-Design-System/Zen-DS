/**
 * `@zen-ds/react/ai-ui` — render, validate, print and edit a Zen UI spec: the JSON a model composes from the catalog
 * (docs/ai-ui/catalog.json) at run time. See docs/ai-ui/README.md. Linting with the usage harness is Node-side:
 * `@zen-ds/react/ai-ui/lint`.
 */
export * from "./spec.mjs";
export * from "./validate.mjs";
export * from "./print.mjs";
export * from "./ops.mjs";
export * from "./markdown.mjs";
export * from "./render";
export type { Catalog, CatalogComponent, CatalogGuideline, PropSchema, Binding } from "./catalog";

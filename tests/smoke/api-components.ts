/**
 * Every public component as docs/api documents it (react-docgen output), and props synthesised from their types: shared
 * by the smoke test and the conformance test.
 */
import { createElement, createRef } from "react";

export type ApiProp = { name: string; type: string; required: boolean };
export type ApiComponent = { name: string; props: ApiProp[] };
type ApiFile = { slug: string; components: ApiComponent[] };

const apiFiles = import.meta.glob<ApiFile>("../../docs/api/*.json", { eager: true, import: "default" });
export const components = Object.values(apiFiles)
  .flatMap((file) => file.components.map((component) => ({ ...component, slug: file.slug })))
  .sort((a, b) => a.name.localeCompare(b.name))
  // The same component can be documented by two slugs (DateField: input + date-picker); test it once.
  .filter((component, index, all) => all.findIndex((other) => other.name === component.name) === index);

export const noop = () => undefined;

/** A value that satisfies a react-docgen type string, or `undefined` when a fixture is needed. */
export function synthesise(prop: ApiProp): unknown {
  const type = prop.type.trim();
  if (type.includes("=>")) return noop;
  const literal = type.match(/^"([^"]*)"/);
  if (literal) return literal[1];
  if (/^(string|string \| undefined)$/.test(type)) return prop.name.toLowerCase().includes("label") ? "Label" : "Sample text";
  if (/^number\b/.test(type)) return 1;
  if (/^boolean\b/.test(type)) return false;
  if (/^(ReactNode|ReactNode \| .*)$/.test(type)) return "Sample content";
  if (/^ReactElement\b/.test(type)) return createElement("button", { type: "button" }, "Trigger");
  if (/^IconName\b/.test(type)) return "icon-check-line";
  if (/^Date\b/.test(type)) return new Date(2026, 8, 27);
  if (/^RefObject</.test(type)) return createRef();
  return undefined;
}


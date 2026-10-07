// Stand-ins for what a component requires but a builder page cannot write (Studio builder GĐ5 M1, spec
// docs/research/studio-builder-handoff-spec-2026-10-07.md §3a). A page holds literals and proto.* only, so a required
// function (AiChatField `onSubmit`, a Table column's `cell`, TopNavigation `searchAction.onClick`) is missing: the page
// renderer passes a stand-in so the component renders, and the exported React (compile.mjs) writes one with a TODO(dev).
// Isomorphic, no imports beyond the generated list (compile-api-build.mjs).
import { REQUIRED_FUNCTIONS } from "./compile-api.generated.mjs";

export { REQUIRED_FUNCTIONS };

/** The return type of an arrow signature (after its top-level `=>`). */
function returnType(signature) {
  let depth = 0;
  for (let index = 0; index < signature.length; index++) {
    const char = signature[index];
    if ("(<[{".includes(char)) depth++;
    else if (")]}".includes(char) || (char === ">" && signature[index - 1] !== "=")) depth--;
    else if (depth === 0 && signature.startsWith("=>", index)) return signature.slice(index + 2).trim();
  }
  return "";
}

/**
 * What a stand-in for a function of `signature` returns: "void" (it does nothing), "null" (it draws nothing), "string"
 * (an empty one); null when none fits (the component keeps the gap, as before).
 */
export function standInKind(signature) {
  const result = returnType(signature);
  if (/^(void|Promise<void>)$/.test(result)) return "void";
  if (/\bReact(Node|Element)\b|JSX\.Element/.test(result)) return "null";
  if (result === "string") return "string";
  return null;
}

/** The required functions of `component` (props, and per prop the fields of each object it takes); null for none. */
export const requiredFunctions = (component) => REQUIRED_FUNCTIONS[component] ?? null;

/**
 * A Table column without a `cell` shows its row's field named by the column's id (`{ id: "status" }` → row.status), when
 * that field holds text or a number: the page's rows are its data, and a page cannot write a cell function.
 */
export const isColumnCell = (component, prop, field) => component === "Table" && prop === "columns" && field === "cell";

/** A row field a column shows as is: text or a number. */
export const showsAsText = (value) => typeof value === "string" || typeof value === "number";

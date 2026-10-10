// Stand-ins for what a component requires but a builder page cannot write (Studio builder GĐ5 M1, spec
// docs/research/studio-builder-handoff-spec-2026-10-07.md §3a). A page holds literals and proto.* only, so a required
// function (AiChatField `onSubmit`, TopNavigation `searchAction.onClick`) is missing: the page
// renderer passes a stand-in so the component renders, and the exported React (compile.mjs) writes one with a TODO(dev).
// Isomorphic, no imports beyond the generated list (compile-api-build.mjs).
import { OBJECT_FIELDS, REQUIRED_FUNCTIONS } from "./compile-api.generated.mjs";

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

/** Per prop of `component` whose type is closed objects: the fields those objects may have; null for none. */
export const objectFields = (component) => OBJECT_FIELDS[component] ?? null;


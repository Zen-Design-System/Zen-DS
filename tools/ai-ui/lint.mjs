// Lints a Zen UI spec with the usage harness (tools/usage-guard): the spec is printed as the React it renders
// (src/ai-ui/print.mjs) and checked in app mode, as `zen-usage` checks an app. Node only (the rule registry reads the
// icon list and the layout classes from disk); run it where the model composes, before the spec is rendered.
//
//   import { lintSpec, checkSpec } from "@zen-ds/react/ai-ui/lint";
//   lintSpec(spec, catalog) → [{ rule, severity, message, guideline, tag, line, id }]
//   checkSpec(spec, catalog, options) → { ok, validation, lint, code }   (validateSpec + lintSpec in one call)
import { checkSource } from "../usage-guard/api.mjs";
import { toJsx } from "../../src/ai-ui/print.mjs";
import { validateSpec } from "../../src/ai-ui/validate.mjs";

export function lintSpec(spec, catalog, { consumer = true, file = "generated-ui.tsx" } = {}) {
  const { code, lines } = toJsx(spec, { catalog });
  return checkSource(code, file, { consumer }).map(({ rule, severity, message, guideline, tag, line }) => ({ rule, severity, message, guideline, tag, line, id: lines[line] ?? null }));
}

/** Validation first (a spec the catalog rejects is not worth linting), then the harness; `ok` when neither finds an error. */
export function checkSpec(spec, catalog, options = {}) {
  const validation = validateSpec(spec, catalog, options);
  if (!validation.ok) return { ok: false, validation, lint: [], code: null };
  const { code } = toJsx(spec, { catalog });
  const lint = lintSpec(spec, catalog, options);
  return { ok: !lint.some((finding) => finding.severity === "error"), validation, lint, code };
}

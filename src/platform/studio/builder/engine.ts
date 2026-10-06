import api from "../../api.generated.json";
import * as Zen from "../../../index";

/*
 * The edit engine in the browser (Studio builder GĐ2): tools/studio/browser-engine.mjs, loaded on first use so the
 * parser (~100 KB gzip) never loads on a component page. `engineOptions` is what the dev server passes to applyOps for
 * slot ops: which names are Zen components (here, the library's exports) and what each requires (api.generated.json).
 */

type Engine = typeof import("../../../../tools/studio/browser-engine.mjs");
let loading: Promise<Engine> | null = null;
export const loadEngine = (): Promise<Engine> => (loading ??= import("../../../../tools/studio/browser-engine.mjs"));

/** The Zen components a page may use: the library's exports whose name starts upper-case and that render. */
export const zenComponents: ReadonlySet<string> = new Set(
  Object.entries(Zen).filter(([name, value]) => /^[A-Z]/.test(name) && (typeof value === "function" || (typeof value === "object" && value !== null && "$$typeof" in value))).map(([name]) => name),
);

let options: Record<string, unknown> | null = null;
/** applyOps options for a page: component modules (all from the package) and required children / props. */
export async function engineOptions(): Promise<Record<string, unknown>> {
  if (options) return options;
  const engine = await loadEngine();
  options = { componentModules: new Map([...zenComponents].map((name) => [name, name])), ...engine.requiredFromApi(api) };
  return options;
}

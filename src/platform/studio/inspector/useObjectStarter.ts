import { useEffect, useState } from "react";
import { namedTypeBody, objectStarter } from "./objectStarter";

/** Every component's named types (docs/api/<slug>.json `types`), loaded once on first need. */
const typeFiles = import.meta.glob<Record<string, string>>("/docs/api/*.json", { import: "types" });
let allTypes: Promise<Record<string, string>> | null = null;
const apiTypes = () => {
  allTypes ??= Promise.all(Object.values(typeFiles).map((load) => load().catch(() => ({})))).then((list) => Object.assign({}, ...list));
  return allTypes;
};

/**
 * The object a "+" writes for an unset object prop (objectStarter.ts), or null. A named type (`EmptyStateAction`) is
 * read from the API docs first.
 */
export function useObjectStarter(name: string, type: string, enabled: boolean): string | null {
  const direct = enabled ? objectStarter(name, type) : null;
  const named = enabled && !direct && /^[A-Z][\w$]*$/.test(type.trim()) ? type.trim() : null;
  const [resolved, setResolved] = useState<{ type: string; starter: string | null } | null>(null);
  useEffect(() => {
    if (!named) return undefined;
    let alive = true;
    void apiTypes().then((types) => {
      const body = namedTypeBody(named, types);
      if (alive) setResolved({ type: named, starter: body ? objectStarter(name, body) : null });
    });
    return () => { alive = false; };
  }, [named, name]);
  return direct ?? (named && resolved?.type === named ? resolved.starter : null);
}

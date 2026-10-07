import { useEffect, useState } from "react";
import { loadEngine, zenComponents } from "./engine";
import type { PageTree } from "./render/renderPage";

/** A page's text parsed by the engine (dialect.mjs parsePage): null until the engine has loaded. */
export function usePageTree(text: string | undefined): PageTree | null {
  const [tree, setTree] = useState<PageTree | null>(null);
  useEffect(() => {
    if (text === undefined) return undefined;
    let alive = true;
    void loadEngine().then((engine) => { if (alive) setTree(engine.parsePage(text, { components: new Set(zenComponents) }) as unknown as PageTree); });
    return () => { alive = false; };
  }, [text]);
  return tree;
}

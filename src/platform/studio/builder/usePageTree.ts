import { useEffect, useMemo, useState } from "react";
import { engineNow, loadEngine, zenComponents } from "./engine";
import type { PageTree } from "./render/renderPage";

const parse = (engine: NonNullable<ReturnType<typeof engineNow>>, text: string) => engine.parsePage(text, { components: new Set(zenComponents) }) as unknown as PageTree;

/**
 * A page's text parsed by the engine (dialect.mjs parsePage): null until the engine has loaded. Once it has, the text is
 * parsed in the render that brings it, so an edit reaches the canvas in one render, not two with a turn between
 * (user, 2026-10-13: "Độ trễ khoảng 200 ms mỗi lần sửa").
 */
export function usePageTree(text: string | undefined): PageTree | null {
  const [, setLoaded] = useState(0);
  const engine = engineNow();
  useEffect(() => {
    if (engine || text === undefined) return undefined;
    let alive = true;
    void loadEngine().then(() => { if (alive) setLoaded((value) => value + 1); });
    return () => { alive = false; };
  }, [engine, text]);
  return useMemo(() => (engine && text !== undefined ? parse(engine, text) : null), [engine, text]);
}

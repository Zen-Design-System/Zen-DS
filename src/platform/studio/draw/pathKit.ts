/*
 * Skia's PathOps in the browser (pathkit-wasm, the user's pick 2026-10-19; plan F9b): loaded once, on the first boolean
 * group, Flatten or Outline stroke (its wasm is ~320 KB, never in the Studio's first load). tools/studio/path-ops.mjs
 * takes the instance.
 */

let loading: Promise<unknown> | null = null;

/** The PathKit instance (loads it the first time). */
export function loadPathKit(): Promise<unknown> {
  loading ??= (async () => {
    const [{ default: init }, { default: wasmUrl }] = await Promise.all([import("pathkit-wasm/bin/pathkit.js"), import("pathkit-wasm/bin/pathkit.wasm?url")]);
    const wasmBinary = await (await fetch(wasmUrl)).arrayBuffer();
    return (init as (options: { wasmBinary: ArrayBuffer }) => Promise<unknown>)({ wasmBinary });
  })();
  loading.catch(() => { loading = null; });
  return loading;
}

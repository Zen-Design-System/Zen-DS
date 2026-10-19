/** pathkit-wasm ships no types: the Studio only hands the instance to tools/studio/path-ops.mjs. */
declare module "pathkit-wasm/bin/pathkit.js" {
  const init: (options: { wasmBinary: ArrayBuffer }) => Promise<unknown>;
  export default init;
}

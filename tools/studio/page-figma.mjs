// A page's Figma bases (figma round trip P6b, leftover 2026-10-23): what Update from Figma compares a pull with, kept
// beside the page file (`<page>.figma.json`) as well as in the browser, so another browser on the dev server, or one
// with the same linked folder, compares three ways too. Pure functions the browser and the dev server share.
//
//   { format: 1, exports: [{ version, at, base, synced }], pull?: { base, synced?, version?, at } }
//     exports  the latest exports to Figma, newest first (FIGMA_EXPORTS at most): each the pull of the frame it placed
//              (`base`) and the page it came from (`synced`), by the export's `version`
//     pull     the last pull of the page's frame (an import or an Update from Figma), with the page it left
//
//   emptyFigma() → { format: 1, exports: [] }
//   validateFigma(doc) → [message…]   (the shape; [] when it is fine)
//   joinFigma(a, b) → the two copies joined: exports by version (the later one winning), the later pull
//   fitFigma(doc, maxBytes) → the newest exports that fit in maxBytes as compact JSON (the pull always stays)
//
// Every function returns a new document. The documents (`base`, `synced`) are page documents (tools/studio/doc.mjs) and
// are not checked here beyond being objects. The file is compact JSON (documents are large; nobody reads it by hand).
// No imports.

export const FIGMA_FORMAT = 1;
export const FIGMA_EXPORTS = 5;

export const emptyFigma = () => ({ format: FIGMA_FORMAT, exports: [] });

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const isDoc = (value) => isObject(value) && isObject(value.board);

/** The problems with `doc` as a page's Figma bases; [] when it is fine. */
export function validateFigma(doc) {
  if (!isObject(doc) || doc.format !== FIGMA_FORMAT || !Array.isArray(doc.exports)) return ["Figma bases are { format: 1, exports: [] }"];
  const errors = [];
  if (doc.exports.length > FIGMA_EXPORTS) errors.push(`At most ${FIGMA_EXPORTS} exports`);
  const versions = new Set();
  doc.exports.forEach((entry, index) => {
    const where = `Export ${index + 1}`;
    if (!isObject(entry) || typeof entry.version !== "string" || !/^[0-9a-z]{1,64}$/i.test(entry.version)) { errors.push(`${where} needs its version`); return; }
    if (versions.has(entry.version)) errors.push(`${where}: the version ${entry.version} is kept twice`);
    versions.add(entry.version);
    if (!finite(entry.at)) errors.push(`${where} needs its time`);
    if (!isDoc(entry.base) || !isDoc(entry.synced)) errors.push(`${where} needs the frame's pull (base) and the page it came from (synced)`);
  });
  const pull = doc.pull;
  if (pull !== undefined) {
    if (!isObject(pull) || !isDoc(pull.base) || !finite(pull.at)) errors.push("The last pull needs its document (base) and its time");
    else if ((pull.synced !== undefined && !isDoc(pull.synced)) || (pull.version !== undefined && typeof pull.version !== "string")) errors.push("The last pull's page (synced) is a document and its version a string");
  }
  return errors;
}

/** Two copies of a page's Figma bases joined: every export by version (the later `at` winning), newest first, and the later pull. */
export function joinFigma(a, b) {
  const byVersion = new Map();
  for (const entry of [...(a?.exports ?? []), ...(b?.exports ?? [])]) {
    const kept = byVersion.get(entry.version);
    if (!kept || entry.at > kept.at) byVersion.set(entry.version, entry);
  }
  const exports = [...byVersion.values()].sort((x, y) => y.at - x.at).slice(0, FIGMA_EXPORTS);
  const pulls = [a?.pull, b?.pull].filter(Boolean).sort((x, y) => y.at - x.at);
  return { format: FIGMA_FORMAT, exports, ...(pulls.length ? { pull: pulls[0] } : {}) };
}

/** The newest exports that keep `doc` within `maxBytes` as compact JSON; the pull always stays. */
export function fitFigma(doc, maxBytes) {
  const size = (value) => new TextEncoder().encode(JSON.stringify(value)).length + 1;
  let exports = doc.exports;
  while (exports.length && size({ ...doc, exports }) > maxBytes) exports = exports.slice(0, -1);
  return { ...doc, exports };
}

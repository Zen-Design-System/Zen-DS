// figma-kiwi: the schema decodes, a message round-trips through Figma's clipboard html, strict mode refuses unknown
// fields and bad enum values.
import { decodeSchema, encodeMessage, decodeMessage, figmaClipboardHtml, readFigmaClipboard, inflateRaw, bytesOf } from "./figma-kiwi.mjs";
import { FIGMA_CLIPBOARD_SCHEMA } from "./figma-clipboard-schema.generated.mjs";

let checks = 0;
const failures = [];
const check = (ok, message) => { checks++; if (!ok) failures.push(message); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const deflated = bytesOf(FIGMA_CLIPBOARD_SCHEMA.deflated);
const schema = decodeSchema(await inflateRaw(deflated));
check(schema.defs.length > 600, `schema has ${schema.defs.length} definitions`);
for (const name of ["Message", "NodeChange", "SymbolData", "ComponentPropAssignment", "VariableData", "TextData"]) check(!!schema.byName[name], `schema has ${name}`);
check(["isSlotContent", "componentPropRefs", "parameterConsumptionMap", "styleIdForText"].every((f) => schema.byName.NodeChange.byName[f]), "NodeChange has the fields the paste writes");

const g = (s, l) => ({ sessionID: s, localID: l });
const IDENTITY = { m00: 1, m01: 0, m02: 12.5, m10: 0, m11: 1, m12: -3 };
const message = {
  type: "NODE_CHANGES", sessionID: 0, ackID: 0, pasteID: 42, pasteFileKey: "file", isCut: false, pasteEditorType: "DESIGN", blobs: [], publishedAssetGuids: [], pasteAssetType: "UNKNOWN",
  clipboardSelectionRegions: [{ parent: g(15872, 3), nodes: [g(1, 2)], pasteIsPartiallyOutsideEnclosingFrame: false, focusType: "NONE" }],
  nodeChanges: [
    { guid: g(0, 0), phase: "CREATED", type: "DOCUMENT", name: "Document", visible: true, opacity: 1, transform: IDENTITY },
    { guid: g(1, 2), phase: "CREATED", parentIndex: { guid: g(0, 1), position: "!" }, type: "TEXT", name: "Xin chào — Zen", visible: true, opacity: 0.5, size: { x: 100.25, y: 20 }, transform: IDENTITY,
      textData: { characters: "Xin chào — Zen ✓", lines: [{ lineType: "PLAIN", styleId: 0, indentationLevel: 0, sourceDirectionality: "AUTO", listStartOffset: 0, isFirstLineOfList: false }] },
      styleIdForText: { guid: g(101, 49937) }, stackMode: "VERTICAL" },
  ],
};
const decoded = decodeMessage(schema, encodeMessage(schema, message, { strict: true }));
check(same(decoded.nodeChanges[1].textData.characters, "Xin chào — Zen ✓"), "non-ASCII text round-trips");
check(decoded.nodeChanges[1].opacity === 0.5 && decoded.nodeChanges[1].size.x === 100.25 && decoded.nodeChanges[1].transform.m12 === -3, "floats round-trip");
check(decoded.nodeChanges[1].type === "TEXT" && decoded.nodeChanges[1].stackMode === "VERTICAL", "enums round-trip by name");
check(same(decoded.clipboardSelectionRegions, message.clipboardSelectionRegions), "selection round-trips");

let refused = "";
try { encodeMessage(schema, { ...message, nodeChanges: [{ ...message.nodeChanges[0], fillz: [] }] }, { strict: true }); } catch (e) { refused = e.message; }
check(/no field "fillz"/.test(refused), `strict mode names an unknown field (${refused})`);
refused = "";
try { encodeMessage(schema, { ...message, nodeChanges: [{ ...message.nodeChanges[0], type: "BLOB" }] }); } catch (e) { refused = e.message; }
check(/no value BLOB/.test(refused), `an unknown enum value is refused (${refused})`);

const html = await figmaClipboardHtml({ version: FIGMA_CLIPBOARD_SCHEMA.version, schemaDeflated: deflated, schema, message, meta: { fileKey: "file", pasteID: 42, selectedNodeData: "1:2|4|0|0" } });
check(/^<meta charset="utf-8"><span data-metadata="<!--\(figmeta\)/.test(html) && html.includes("(/figma)-->\"></span>"), "html has Figma's two spans");
const back = await readFigmaClipboard(html);
check(back && back.version === FIGMA_CLIPBOARD_SCHEMA.version, "buffer version");
check(back && back.meta.fileKey === "file" && back.meta.dataType === "scene" && back.meta.selectedNodeData === "1:2|4|0|0", "meta round-trips with Figma's defaults");
check(back && same(back.message.nodeChanges[1].name, "Xin chào — Zen"), "message round-trips through the html");
check((await readFigmaClipboard("<span>plain</span>")) === null, "html without a Figma buffer reads as null");

if (failures.length) { console.error(`✗ figma-kiwi selftest: ${failures.length}/${checks} failed\n  ${failures.join("\n  ")}`); process.exit(1); }
console.log(`✓ figma-kiwi selftest: ${checks} checks pass.`);

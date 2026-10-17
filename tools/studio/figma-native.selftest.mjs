// figma-native: a Studio export as Figma's own clipboard. Written cases with the pack's real ids (variants, props,
// bound layers, slot contents, icons, grids, vectors), then the Expenses page (fixtures/figma-expenses.json, the export
// the QA paste was checked against: 474 frames, 613 instances, 277 texts, 190 vectors like the plugin's import).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nativeMessage, figmaPasteHtml, parsePath, pathBounds, vectorNetwork } from "./figma-native.mjs";
import { readFigmaClipboard } from "./figma-kiwi.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pack = JSON.parse(fs.readFileSync(path.join(root, "docs/figma-contracts/native-pack.json"), "utf8"));
let checks = 0;
const failures = [];
const check = (ok, message) => { checks++; if (!ok) failures.push(message); };
const id = (g) => (g ? `${g.sessionID}:${g.localID}` : "");
const exportOf = (children) => ({ format: "zen-studio-figma", version: 1, page: { id: "t", title: "T" }, frame: { type: "FRAME", name: "T", width: 800, layout: { mode: "VERTICAL", gap: 8 }, children } });
const run = (children) => nativeMessage(exportOf(children), pack);
/** The instances placed directly in the pasted root frame (slot contents and copies come before them in the message). */
const instances = (message) => { const rootFrame = message.clipboardSelectionRegions[0].nodes[0]; return message.nodeChanges.filter((n) => n.type === "INSTANCE" && n.parentIndex && id(n.parentIndex.guid) === id(rootFrame)); };
const overrides = (node) => node.symbolData?.symbolOverrides ?? [];
const variantNamed = (setId, name) => pack.sets[setId].variants.find((v) => pack.symbols[v].name === name);

// --- paths and vector networks ----------------------------------------------------------------------------------
{
  const [sub] = parsePath("M 0 0 C 0 -10 10 -10 10 0 L 10 5 Z");
  check(sub.closed && sub.segments.length === 2 && sub.segments[0].c1 && !sub.segments[1].c1, "a path parses M, C, L, Z");
  const bounds = pathBounds([sub]);
  check(Math.abs(bounds.minY + 7.5) < 1e-6 && bounds.maxX === 10 && bounds.maxY === 5, `a cubic's bounds reach its extreme, not its control points (${JSON.stringify(bounds)})`);
  const blob = vectorNetwork([sub], bounds.minX, bounds.minY);
  const view = new DataView(blob.buffer);
  check(view.getUint32(0, true) === 3 && view.getUint32(4, true) === 3 && view.getUint32(8, true) === 1, "the network has 3 vertices, 3 segments (closing line added), 1 region");
  check(view.getFloat32(16, true) === 0 && view.getFloat32(20, true) === 7.5, "vertices start at the shape's origin");
  check(view.getUint32(blob.length - 24, true) === 1 && view.getUint32(blob.length - 20, true) === 1 && view.getUint32(blob.length - 16, true) === 3, "the region is NONZERO with one loop of the 3 segments");
}

// --- an instance: variant by props, own property ids, an icon, a bound label ----------------------------------------
{
  const button = { type: "INSTANCE", name: "Save", set: { id: "1026:8312", name: "Button/Main" }, props: { Size: "Small", Level: "Secondary", Text: "Save draft", "Leading-Icon": true }, swapIcon: "icon-plus-line" };
  const { message, notes } = run([button]);
  const [node] = instances(message);
  const variant = variantNamed("1026:8312", "Size=Small, Level=Secondary, State=Default");
  check(notes.length === 0, `no notes (${notes.join("; ")})`);
  check(id(node.symbolData.symbolID) === variant, "VARIANT props pick the variant");
  const own = pack.symbols[variant].defs;
  const text = (node.componentPropAssignments ?? []).find((a) => id(a.defID) === own["1026:804"]);
  check(text?.value.textValue.characters === "Save draft" && text.varValue.dataType === "TEXT_DATA", "TEXT props assign with the variant's own id");
  check((node.componentPropAssignments ?? []).some((a) => id(a.defID) === own["1026:0"] && a.value.boolValue === true), "BOOLEAN props assign with the variant's own id");
  const icon = Object.entries(pack.symbols).find(([, s]) => !s.set && s.name === "icon-plus-line")[0];
  check((node.componentPropAssignments ?? []).some((a) => id(a.defID) === own["1493:67"] && a.value.guidValue && id(a.value.guidValue) === icon && a.varValue.dataType === "SYMBOL_ID"), "swapIcon on a layer bound to an INSTANCE_SWAP prop assigns that prop");
  check(message.nodeChanges.some((n) => n.type === "SYMBOL" && id(n.guid) === variant) && message.nodeChanges.some((n) => n.isStateGroup && id(n.guid) === "1026:8312"), "the variant's skeleton and its set ride along");
  const symbols = new Set(message.nodeChanges.filter((n) => n.type === "SYMBOL").map((n) => id(n.guid)));
  const used = message.nodeChanges.flatMap((n) => [n.symbolData?.symbolID, ...overrides(n).map((o) => o.overriddenSymbolID), ...(n.componentPropAssignments ?? []).map((a) => a.value?.guidValue)]).filter(Boolean).map(id);
  check(used.every((s) => symbols.has(s)), `every symbol an instance shows has its skeleton (${used.filter((s) => !symbols.has(s)).join(", ")})`);
}

// --- a nested instance's text bound to its property becomes that property's assignment (as Figma keeps it) ---------
{
  const item = { type: "INSTANCE", name: "Approvals", set: { id: "1536:27473" }, props: { Counter: true }, text: "Approvals", nested: [{ path: "Counter", props: { Text: "7" } }] };
  const { message, notes } = run([item]);
  const [node] = instances(message);
  check(notes.length === 0, `menu item: no notes (${notes.join("; ")})`);
  const counter = overrides(node).find((o) => o.guidPath.guids.length === 1 && o.componentPropAssignments?.some((a) => a.value.textValue?.characters === "7"));
  check(!!counter, "a nested instance's TEXT prop is an assignment on its override");
}

// --- a component's own slot content: an edit inside it copies the content and assigns the copy ---------------------
{
  const metric = { type: "INSTANCE", name: "Total spend", set: { id: "6643:64008", name: "Metric-Card" }, props: { Type: "Sparkline" }, texts: { Label: "Total spend", "Metric-Number": "$26,480" } };
  const { message, notes } = run([metric]);
  const [node] = instances(message);
  check(notes.length === 0, `metric card: no notes (${notes.join("; ")})`);
  const slot = overrides(node).flatMap((o) => o.componentPropAssignments ?? []).find((a) => a.varValue?.dataType === "SLOT_CONTENT_ID");
  const copy = slot && message.nodeChanges.find((n) => id(n.guid) === id(slot.varValue.value.slotContentIdValue.guid));
  check(copy?.isSlotContent === true && id(copy.parentIndex.guid) === "20015894:2", "the edited slot content is copied to the internal canvas and assigned by an override");
  const under = (rootId) => { const out = []; const walk = (k) => { for (const n of message.nodeChanges) if (n.parentIndex && id(n.parentIndex.guid) === k) { out.push(n); walk(id(n.guid)); } }; walk(rootId); return out; };
  const texts = copy ? under(id(copy.guid)).flatMap((n) => [n.textData?.characters, ...overrides(n).map((o) => o.textData?.characters)]) : [];
  check(texts.includes("Total spend") && texts.includes("$26,480"), `the copy carries the new texts (${texts.filter(Boolean).join(", ")})`);
}

// --- frames: grid tracks and cells, variables by id, a slot filled with the export's own layers -----------------------
{
  const grid = { type: "FRAME", name: "Grid", fillW: true, layout: { mode: "GRID", gap: 16, gapVar: "Spacing/Gap/Small", grid: { columns: 2, rows: 1, sizes: [{ type: "FLEX", value: 1 }, { type: "FLEX", value: 1 }] } },
    children: [{ type: "INSTANCE", name: "Card", set: { id: "6643:51021", name: "Card" }, fillW: true, cell: { row: 0, col: 1 }, slots: [{ name: "Content", children: [{ type: "TEXT", characters: "Hello", textStyle: "Body/Base/Bold" }] }] }] };
  const { message, notes } = run([grid]);
  check(notes.length === 0, `grid + card: no notes (${notes.join("; ")})`);
  const frame = message.nodeChanges.find((n) => n.name === "Grid");
  check(frame.stackMode === "GRID" && frame.gridColumns.entries.length === 2 && frame.gridColumnsSizing.entries.every((e) => e.trackSize.minSizing.type === "FLEX"), "a grid frame has its own tracks");
  check(frame.parameterConsumptionMap.entries.some((e) => e.variableField === "GRID_COLUMN_GAP" && id(e.variableData.value.alias.guid) === pack.variables["Spacing/Gap/Small"][0]), "a gap binds its variable by id");
  const card = message.nodeChanges.find((n) => n.type === "INSTANCE" && n.name === "Card");
  check(id(card.gridColumnAnchor) === id(frame.gridColumns.entries[1].id) && card.stackChildPrimaryGrow === 1, "a cell anchors to its track and fills it");
  const slot = (card.componentPropAssignments ?? []).find((a) => a.varValue?.dataType === "SLOT_CONTENT_ID");
  const content = slot && message.nodeChanges.find((n) => id(n.guid) === id(slot.varValue.value.slotContentIdValue.guid));
  const hello = content && message.nodeChanges.find((n) => n.type === "TEXT" && n.parentIndex && id(n.parentIndex.guid) === id(content.guid));
  check(content?.isSlotContent && hello?.textData.characters === "Hello", "the slot takes a content frame with the export's layers");
  check(id(hello?.styleIdForText.guid) === pack.styles["Body/Base/Bold"][0] && hello?.fontSize === pack.styles["Body/Base/Bold"][2].fontSize, "a text binds its style by id and repeats its font");
}

// --- a vector in a free-form parent ------------------------------------------------------------------------------
{
  const { message } = run([{ type: "FRAME", name: "Free", children: [{ type: "VECTOR", name: "Slice", d: "M 50 0 L 100 50 L 50 100 Z", box: { w: 100, h: 100 }, place: { x: 0, y: 0, w: 1, h: 1 }, fillStyle: "Color Chart Sector/Primary" }] }]);
  const slice = message.nodeChanges.find((n) => n.name === "Slice");
  check(slice.type === "VECTOR" && typeof slice.vectorData.vectorNetworkBlob === "number" && message.blobs[slice.vectorData.vectorNetworkBlob]?.bytes.length > 12, "a vector carries its network as a blob");
  check(id(slice.styleIdForFill.guid) === pack.styles["Color Chart Sector/Primary"][0] && slice.fillPaints.length === 1, "a vector binds its paint style and shows its paints");
}

// --- the Expenses page, end to end ---------------------------------------------------------------------------------
{
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "tools/studio/fixtures/figma-expenses.json"), "utf8"));
  const { message, notes } = nativeMessage(pkg, pack);
  check(notes.length === 0, `Expenses: no notes (${notes.slice(0, 5).join("; ")})`);
  // The paste's own nodes (the frame tree, slot contents and copies): the rest are the components' skeletons.
  const written = message.nodeChanges.filter((n) => n.guid.sessionID === 2147480000);
  const count = (type) => written.filter((n) => n.type === type).length;
  check(count("INSTANCE") > 150 && count("TEXT") > 15 && count("VECTOR") === 6 + 4, `Expenses writes its instances, texts and vectors (${count("INSTANCE")}, ${count("TEXT")}, ${count("VECTOR")})`);
  const html = (await figmaPasteHtml(pkg, pack)).html;
  const back = await readFigmaClipboard(html);
  check(back?.message.nodeChanges.length === message.nodeChanges.length, "the paste html reads back with every node");
  check(back?.meta.fileKey === pack.file, "the paste names the Zen file");
}

if (failures.length) { console.error(`✗ figma-native selftest: ${failures.length}/${checks} failed\n  ${failures.join("\n  ")}`); process.exit(1); }
console.log(`✓ figma-native selftest: ${checks} checks pass.`);

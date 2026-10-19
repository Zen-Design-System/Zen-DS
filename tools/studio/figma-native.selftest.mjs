// figma-native: a Studio export as Figma's own clipboard. Written cases with the pack's real ids (variants, props,
// bound layers, slot contents, icons, grids, vectors), then the Expenses page (fixtures/figma-expenses.json, the export
// the QA paste was checked against: 474 frames, 613 instances, 277 texts, 190 vectors like the plugin's import).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { nativeMessage, nativePictures, pictureKind, figmaPasteHtml, parsePath, pathBounds, vectorNetwork } from "./figma-native.mjs";
import { readFigmaClipboard } from "./figma-kiwi.mjs";
import { diffMessages } from "./native-diff.mjs";

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

// --- corner radii and a slot Figma links only through a PROP_REF (Title-Highlight's Custom-Slot) ---------------------
{
  const pill = { type: "FRAME", name: "Pill", radius: 1000, radiusVar: "Corner-Radius/Rounded", layout: { mode: "HORIZONTAL", padding: [2, 4, 2, 4] }, children: [{ type: "TEXT", characters: "34%" }] };
  const metric = { type: "INSTANCE", name: "Highlight", set: { id: "7523:507049", name: "Primitives/Metric/Metric-Inline/Title-Highlight" }, props: { Custom: true }, slots: [{ name: "Custom-Slot", children: [{ type: "TEXT", characters: "Custom" }] }] };
  const { message, notes } = run([pill, metric]);
  check(notes.length === 0, `radius + PROP_REF slot: no notes (${notes.join("; ")})`);
  const frame = message.nodeChanges.find((n) => n.name === "Pill");
  check(frame.rectangleCornerRadiiIndependent === true && frame.rectangleTopLeftCornerRadius === 1000 && frame.rectangleBottomRightCornerRadius === 1000, "a radius sets the four corners, independent (Figma reads cornerRadius otherwise)");
  check(frame.parameterConsumptionMap.entries.filter((e) => /CORNER_RADIUS$/.test(e.variableField)).length === 4, "the four corners bind the radius variable");
  const [instance] = instances(message).filter((n) => n.name === "Highlight");
  check((instance.componentPropAssignments ?? []).some((a) => a.varValue?.dataType === "SLOT_CONTENT_ID"), "a slot linked only by PROP_REF takes the export's content");
}

// --- a vector in a free-form parent ------------------------------------------------------------------------------
{
  const { message } = run([{ type: "FRAME", name: "Free", children: [{ type: "VECTOR", name: "Slice", d: "M 50 0 L 100 50 L 50 100 Z", box: { w: 100, h: 100 }, place: { x: 0, y: 0, w: 1, h: 1 }, fillStyle: "Color Chart Sector/Primary" }] }]);
  const slice = message.nodeChanges.find((n) => n.name === "Slice");
  check(slice.type === "VECTOR" && typeof slice.vectorData.vectorNetworkBlob === "number" && message.blobs[slice.vectorData.vectorNetworkBlob]?.bytes.length > 12, "a vector carries its network as a blob");
  check(id(slice.styleIdForFill.guid) === pack.styles["Color Chart Sector/Primary"][0] && slice.fillPaints.length === 1, "a vector binds its paint style and shows its paints");
}

// --- swaps as Figma's own copy writes them (native-diff against the plugin's import; paste rounds 2–9, 2026-10-17) ------
{
  const cell = { type: "INSTANCE", name: "Vietnam Airlines", set: { id: "1603:5099", name: "Primitives/Table/Cell/Dock-Icon-Cell" }, props: { Bold: "Yes", Subtext: "Yes" },
    nested: [{ path: "Text-Cell", props: { Caption: true }, textList: ["Vietnam Airlines", "Travel"] }, { path: "Dock-Icon", set: { id: "308:45902", name: "Dock-Icon" }, props: { Size: "XSmall", Theme: "Blue", Background: "Subtle", "Icon-Src": "icon-plane-line" } }] };
  const plus = { type: "INSTANCE", name: "New", set: { id: "1026:8312", name: "Button/Main" }, props: { Size: "Medium (Base)", Level: "Primary", "Leading-Icon": true, "Leading-Icon-Src": "icon-plus-line" }, text: "New" };
  const between = { type: "FRAME", name: "Row", layout: { mode: "HORIZONTAL", gap: 8, primary: "SPACE_BETWEEN" }, children: [] };
  const { message, notes } = run([cell, plus, between]);
  check(notes.length === 0, `swaps: no notes (${notes.join("; ")})`);
  const [cellNode, plusNode] = instances(message);
  const blue = variantNamed("308:45902", "Size=XSmall, Theme=Blue, Background=Subtle");
  const dockRow = pack.symbols[id(cellNode.symbolData.symbolID)].nodes.find((r) => r[3] === "Dock-Icon")[0];
  const swap = overrides(cellNode).find((o) => o.guidPath.guids.length === 1 && id(o.guidPath.guids[0]) === dockRow && o.overriddenSymbolID);
  check(id(swap?.overriddenSymbolID) === blue, "the nested Dock-Icon switches to the Blue variant");
  check(swap?.componentPropAssignments?.length === 1 && swap.componentPropAssignments[0].varValue.dataType === "SYMBOL_ID", "its override lists only the assignment the paste changes (Icon-Src), not the component's others");
  const iconRow = pack.symbols[blue].nodes.find((r) => r[2] === "INSTANCE");
  const kept = overrides(cellNode).filter((o) => o.overrideLevel === 2);
  const keptIcon = kept.find((o) => o.guidPath.guids.length === 2 && id(o.guidPath.guids[1]) === iconRow[0]);
  check(keptIcon?.name === "Icon", "what the swap keeps is its own entry: the renamed layer's name, at the swapped layer's depth");
  const keptFill = kept.find((o) => o.guidPath.guids.length === 3 && o.fillPaints);
  check(id(keptFill?.fillPaints[0].colorVar.value.alias.guid) === pack.variables["Color/Content/Support/Blue/Light"][0], "and the variant's icon colour, on the new icon's Vector, by variable id");
  const skeleton = message.nodeChanges.find((n) => id(n.guid) === iconRow[0]);
  check((skeleton?.symbolData.symbolOverrides ?? []).some((o) => o.fillPaints), "the variant's skeleton carries its own overrides on the nested icon (Figma reads what a swap keeps from it)");
  check((skeleton?.parameterConsumptionMap?.entries ?? []).some((e) => e.variableField === "OVERRIDDEN_SYMBOL_ID" && e.variableData.dataType === "PROP_REF") && id(skeleton?.overrideKey) === iconRow[0], "and the PROP_REF linking its swap to Icon-Src, with its override key");
  check(message.nodeChanges.filter((n) => n.type === "SYMBOL").every((n) => !n.componentKey), "no component keys on skeletons (not needed by Figma; the pack stays smaller)");
  check(message.nodeChanges.filter((n) => n.type === "INSTANCE" && n.guid.sessionID === 2147480000).every((n) => n.strokeWeight === undefined && n.strokeAlign === undefined), "instances carry no stroke fields (they would override their component's)");
  const plusIcon = (plusNode.componentPropAssignments ?? []).find((a) => a.varValue?.dataType === "SYMBOL_ID");
  check(!plusIcon, "an icon the component already shows is not assigned again (a re-set swap drops its colour)");
  const row = message.nodeChanges.find((n) => n.type === "FRAME" && n.name === "Row");
  check(row?.stackPrimaryAlignItems === "SPACE_EVENLY", "space between is SPACE_EVENLY in Figma's data");
  const copies = JSON.stringify(message, (k, v) => (typeof v === "bigint" ? Number(v) : v)).match(/"sessionID":15052,/g);
  check(!copies, "no ref to a library copy of a variable (15052:…)");
}

// --- AppShell as the master layout (Figma's own copy of a master that grows with its page, 2026-10-17) -------------
{
  const inner = ["Patterns/Sidebar/Density-Medium", "Patterns/Density/Comfortable/Sidebar/Yes"];
  const pads = ["Margin-Comfortable", "Margin-Comfortable", "Spacing/Padding/XSmall", "Margin-Comfortable"];
  const shell = {
    type: "INSTANCE", name: "AppShell", set: { id: "4122:41886", name: "Patterns/Pages/Density-Medium" }, props: { Level: "Master", Sidebar: true, "Side-Panel": false, "Floating-Actions": false }, fillW: true, minH: 982,
    nested: [{ path: "Patterns", props: { Expand: "Yes" } }],
    slots: [
      { name: "Sections", within: ["Header/Dashboard"], children: [{ type: "INSTANCE", name: "Top bar", set: { id: "4122:33402", name: "Primitives/Dashboard/Header" }, props: { Type: "Navigation" }, fillW: true, padding: [24, 24, 8, 24], paddingVars: pads }] },
      { name: "Content", within: ["Body"], hugH: true, children: [{ type: "FRAME", name: "Page", layout: { mode: "VERTICAL", gap: 0 }, children: [{ type: "TEXT", characters: "Members" }] }] },
    ],
    edits: [{ layer: inner, fillH: true }, { layer: ["Main-Container"], hugH: true }, { layer: ["Body"], padding: [0, 0, 0, 0], hugH: true }],
  };
  const { message, notes } = run([shell]);
  check(notes.length === 0, `master layout: no notes (${notes.join("; ")})`);
  const [node] = instances(message);
  check(id(node?.symbolData.symbolID) === "4122:41885" && node.minSize?.value.y === 982, "master layout: the Level=Master variant, at least the viewport's 982 tall");
  const names = new Map(Object.values(pack.symbols).flatMap((symbol) => symbol.nodes.map((row) => [row[0], row[3]])));
  const at = (path) => overrides(node).find((o) => o.guidPath.guids.map((g) => names.get(id(g))).join(" › ") === path) ?? {};
  const pick = (o, fields) => fields.map((field) => o[field]);
  check(JSON.stringify(pick(at("Main-Container"), ["stackPrimarySizing", "stackChildAlignSelf"])) === JSON.stringify(["RESIZE_TO_FIT_WITH_IMPLICIT_SIZE", "AUTO"]), "master layout: Main-Container hugs its column (its own height, no stretch in the row), as Figma's copy");
  const body = at("Body");
  check(JSON.stringify(pick(body, ["stackPrimarySizing", "stackChildPrimaryGrow", "stackVerticalPadding", "stackPaddingRight", "stackPaddingBottom", "stackHorizontalPadding"])) === JSON.stringify(["RESIZE_TO_FIT_WITH_IMPLICIT_SIZE", 0, 0, 0, 0, 0]), "master layout: Body hugs (no grow) and is unpadded");
  const unbound = (map) => (map?.entries ?? []).filter((entry) => /^STACK_PADDING_/.test(entry.variableField) && !entry.variableData).length;
  check(unbound(body.parameterConsumptionMap) === 4 && unbound(body.variableConsumptionMap) === 4, "master layout: Body's four padding bindings let go (entries without variableData in both maps, as Figma's copy)");
  check(JSON.stringify(pick(at("Content"), ["stackPrimarySizing", "stackChildPrimaryGrow"])) === JSON.stringify(["RESIZE_TO_FIT_WITH_IMPLICIT_SIZE", 0]), "master layout: the Content slot hugs (its own override, as the plugin's SLOT sizing)");
  const content = message.nodeChanges.find((n) => n.isSlotContent && n.name === "Content");
  check(content?.stackPrimarySizing === "RESIZE_TO_FIT_WITH_IMPLICIT_SIZE", "master layout: the Content slot's content frame hugs with it");
  check(at(inner.join(" › ")).stackChildAlignSelf === "STRETCH", "master layout: the Side-Bar stretches across its pattern (as tall as the master)");
  // The row's own padding is its self override (guidPath: its own component), as Figma's copy of the master's rows: on
  // the node alone, the pasted row came out unpadded (2026-10-17).
  const bar = message.nodeChanges.find((n) => n.type === "INSTANCE" && n.name === "Top bar");
  const barSelf = overrides(bar ?? {}).find((o) => o.guidPath.guids.length === 1 && id(o.guidPath.guids[0]) === id(bar.symbolData.symbolID)) ?? {};
  const barVars = ["STACK_PADDING_TOP", "STACK_PADDING_RIGHT", "STACK_PADDING_BOTTOM", "STACK_PADDING_LEFT"].map((field) => id(barSelf.parameterConsumptionMap?.entries.find((entry) => entry.variableField === field)?.variableData?.value?.alias?.guid));
  check(JSON.stringify(pick(barSelf, ["stackVerticalPadding", "stackPaddingRight", "stackPaddingBottom", "stackHorizontalPadding"])) === JSON.stringify([24, 24, 8, 24]) && JSON.stringify(barVars) === JSON.stringify(pads.map((name) => pack.variables[name][0])), `master layout: the top bar's own padding in its self override, each side bound (Figma's copy of the master's rows) (${barVars})`);
  // Filling the frame's width lets the master's Viewport-Width binding go (Figma's own Fill): kept, Figma sized the
  // pasted master back to 1512 (2026-10-17). Its height stays bound: the master hugs its page with it.
  const self = overrides(node).find((o) => o.guidPath.guids.length === 1 && id(o.guidPath.guids[0]) === "4122:41885") ?? {};
  const loose = (map) => (map?.entries ?? []).filter((entry) => !entry.variableData).map((entry) => entry.variableField);
  check(JSON.stringify([loose(self.parameterConsumptionMap), loose(self.variableConsumptionMap)]) === JSON.stringify([["WIDTH"], ["WIDTH"]]), `master layout: its width binding let go in both maps, its height kept (${JSON.stringify([loose(self.parameterConsumptionMap), loose(self.variableConsumptionMap)])})`);
}

// --- mixed styles (TextRun → figma-push segments): Figma's per-character style ids and their override table ---------
{
  const text = { type: "TEXT", characters: "Due Nov 2, unpaid", textStyle: "Body/Base/Regular", segments: [{ start: 4, end: 9, textStyle: "Body/Base/Bold" }, { start: 11, end: 17, italic: true, decoration: "UNDERLINE", fill: "Content/Negative/Base" }] };
  const { message, notes } = run([text]);
  check(notes.length === 0, `mixed styles: no notes (${notes.join("; ")})`);
  const node = message.nodeChanges.find((n) => n.type === "TEXT" && n.textData?.characters === text.characters);
  const ids = node?.textData.characterStyleIDs ?? [];
  check(ids.join("") === "00001111100222222", `a style id per character (${ids.join("")})`);
  const [bold, unpaid] = node?.textData.styleOverrideTable ?? [];
  check(id(bold?.styleIdForText.guid) === pack.styles["Body/Base/Bold"][0] && bold?.fontName.style === pack.styles["Body/Base/Bold"][2].fontName.style, "a run in a text style binds it and takes its font");
  check(unpaid?.fontName.style === "Italic" && unpaid?.fontName.postscript === "Inter-Italic" && unpaid?.textDecoration === "UNDERLINE" && id(unpaid?.fillPaints[0].colorVar.value.alias.guid) === pack.variables["Color/Content/Negative/Base"]?.[0], "italic font, underline and the tone's variable");
  const html = (await figmaPasteHtml(exportOf([text]), pack)).html;
  const back = await readFigmaClipboard(html);
  const read = back?.message.nodeChanges.find((n) => n.type === "TEXT" && n.textData?.characters === text.characters);
  check(read?.textData.styleOverrideTable?.length === 2 && read.textData.characterStyleIDs.length === text.characters.length, "the runs survive Figma's clipboard encoding");
}

// --- pictures (image fills, F8): Figma's IMAGE paint by SHA-1, the bytes as a data: URL in the meta ----------------
{
  const logoBytes = fs.readFileSync(path.join(root, "src/templates/hr/assets/workspace-logo.png"));
  const photoBytes = fs.readFileSync(path.join(root, "src/templates/hr/assets/account-photo.jpg"));
  const kindOf = (bytes) => pictureKind(new Uint8Array(bytes));
  check(JSON.stringify(kindOf(logoBytes)) === JSON.stringify({ mime: "image/png", width: 369, height: 369 }), "a PNG's type and size from its header");
  check(JSON.stringify(kindOf(photoBytes)) === JSON.stringify({ mime: "image/jpeg", width: 480, height: 480 }), "a JPEG's size from its start-of-frame segment");
  // Header and logical screen descriptor (13 bytes): width, height, flags, background, aspect.
  const gif = Uint8Array.from([..."GIF89a"].map((c) => c.charCodeAt(0)).concat([200, 0, 120, 0, 0, 0, 0]));
  check(kindOf(gif)?.width === 200 && kindOf(gif)?.height === 120, "a GIF's width and height (little-endian)");
  // A lossless WebP of 200 × 120: 14 bits each of width − 1 and height − 1 after the VP8L signature.
  const webp = new Uint8Array(30);
  webp.set([..."RIFF"].map((c) => c.charCodeAt(0)), 0); webp.set([..."WEBPVP8L"].map((c) => c.charCodeAt(0)), 8); webp.set([0x2f, 0xc7, 0xc0, 0x1d, 0x00], 20);
  check(kindOf(webp)?.mime === "image/webp" && kindOf(webp)?.width === 200 && kindOf(webp)?.height === 120, `a WebP's size (${JSON.stringify(kindOf(webp))})`);
  check(kindOf(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")) === null, "an SVG is no picture Figma's paint takes");

  const logo = "/uploads/workspace-logo.png", photo = "/uploads/account%20photo.jpg";
  const images = { [logo]: logoBytes.toString("base64"), [photo]: photoBytes.toString("base64"), "/uploads/mark.svg": Buffer.from("<svg/>").toString("base64"), "/uploads/later.png": null };
  const pictures = await nativePictures(images);
  const sha = crypto.createHash("sha1").update(logoBytes).digest("hex");
  const shown = pictures.get(logo);
  check(shown?.hex === sha && shown.hash.length === 20 && shown.name === "workspace-logo" && Buffer.from(shown.bytes).equals(logoBytes), "a picture's hash is the SHA-1 of its bytes, its name the file's");
  check(pictures.get(photo)?.name === "account photo" && pictures.get("/uploads/mark.svg")?.reason && !pictures.has("/uploads/later.png"), "names decoded; an SVG has a reason; a picture without bytes is left out");
  // Figma's paste takes PNG, JPEG and GIF bytes but not a WebP (its paint came out empty, 2026-10-19): the Studio's
  // canvas turns a WebP into PNG; without one it has a reason. A GIF goes as it is.
  const formats = { "/a.gif": Buffer.from(gif).toString("base64"), "/b.webp": Buffer.from(webp).toString("base64") };
  const converted = await nativePictures(formats, { toPng: async () => new Uint8Array(logoBytes) });
  check(Buffer.from(converted.get("/a.gif")?.bytes ?? []).equals(Buffer.from(gif)) && converted.get("/b.webp")?.hex === sha && converted.get("/b.webp").width === 369, "a GIF goes as it is, a WebP as the canvas's PNG (its hash and size)");
  const unconverted = await nativePictures(formats, { toPng: async () => { throw new Error("no canvas"); } });
  check(unconverted.get("/a.gif")?.hash && /a WebP \(Figma's paste takes PNG, JPEG and GIF/.test(unconverted.get("/b.webp")?.reason ?? ""), "without a canvas a WebP has a reason");

  const rectangle = { type: "RECTANGLE", shape: true, name: "Rectangle", fill: "Color/Background/Neutral/Subtle/Default", imageFill: { src: logo, scaleMode: "FILL" }, radius: 12, radiusVar: "Corner-Radius/Base", rotation: 90, opacity: 0.5, fixedWidth: 200, fixedHeight: 100 };
  const ellipse = { type: "ELLIPSE", shape: true, name: "Ellipse", stroke: "Color/Border/Accent/Solid/Default", strokeWeight: 2, strokeAlign: "OUTSIDE", arc: { start: 0, end: Math.PI, inner: 0 }, imageFill: { src: photo, scaleMode: "CROP", crop: { x: 0.1, y: 0.2, width: 0.5, height: 0.4 } }, fixedWidth: 80, fixedHeight: 80 };
  const tiled = { type: "FRAME", name: "Tiled", layout: { mode: "VERTICAL" }, fixedWidth: 300, imageFill: { src: logo, scaleMode: "TILE", scale: 0.5 }, children: [] };
  const lost = { type: "RECTANGLE", shape: true, name: "Lost", imageFill: { src: "/uploads/gone.png", scaleMode: "FILL" }, fixedWidth: 40, fixedHeight: 40 };
  const vector = { type: "RECTANGLE", shape: true, name: "Mark", imageFill: { src: "/uploads/mark.svg", scaleMode: "FIT" }, fixedWidth: 40, fixedHeight: 40 };
  const { message, notes } = nativeMessage(exportOf([rectangle, ellipse, tiled, lost, vector]), pack, pictures);
  const named = (name) => message.nodeChanges.find((n) => n.name === name);
  const rect = named("Rectangle");
  const [solid, picture] = rect?.fillPaints ?? [];
  check(rect?.type === "ROUNDED_RECTANGLE" && rect.size.x === 200 && rect.size.y === 100 && rect.opacity === 0.5, "a Shape rectangle is Figma's ROUNDED_RECTANGLE at its px size and opacity");
  check(id(solid?.colorVar?.value.alias.guid) === pack.variables["Color/Background/Neutral/Subtle/Default"][0] && picture?.type === "IMAGE", "its colour variable under its picture");
  check(picture?.imageScaleMode === "FILL" && picture.image.hash.join() === shown.hash.join() && picture.imageThumbnail.hash.join() === shown.hash.join() && picture.originalImageWidth === 369, "the IMAGE paint names the picture by hash, with its size");
  check(rect?.pluginData?.some((entry) => entry.pluginID === "" && entry.key === "zenstudio-image" && entry.value === logo), "the Studio src rides as the importer's shared plugin data");
  check(rect?.rectangleTopLeftCornerRadius === 12 && rect.parameterConsumptionMap?.entries.length === 4 && rect.parameterConsumptionMap.entries.every((entry) => id(entry.variableData.value.alias.guid) === pack.variables["Corner-Radius/Base"][0]), "corners on the Corner-Radius variable");
  // Turned 90° about its centre: a 200 × 100 layer's centre (100, 50) stays where it was.
  const t = rect?.transform ?? {};
  const centre = [t.m00 * 100 + t.m01 * 50 + t.m02, t.m10 * 100 + t.m11 * 50 + t.m12];
  check(Math.abs(t.m01 - 1) < 1e-9 && Math.abs(t.m10 + 1) < 1e-9 && Math.abs(centre[0] - 100) < 1e-9 && Math.abs(centre[1] - 50) < 1e-9, `rotation turns it about its centre (${centre.join(", ")})`);
  const oval = named("Ellipse");
  const cropped = oval?.fillPaints?.[0];
  check(oval?.type === "ELLIPSE" && oval.arcData?.endingAngle === Math.PI && oval.strokeWeight === 2 && oval.strokeAlign === "OUTSIDE" && id(oval.strokePaints[0]?.colorVar.value.alias.guid) === pack.variables["Color/Border/Accent/Solid/Default"][0], "a Shape ellipse: its arc and its border variable");
  check(oval?.fillPaints.length === 1 && cropped?.imageScaleMode === "STRETCH" && cropped.transform.m00 === 0.5 && cropped.transform.m02 === 0.1 && cropped.transform.m11 === 0.4 && cropped.transform.m12 === 0.2, "a crop is Figma's STRETCH with the shown part as its transform (no colour: none given)");
  const tile = named("Tiled")?.fillPaints?.find((paint) => paint.type === "IMAGE");
  check(tile?.imageScaleMode === "TILE" && tile.scale === 0.5, "a frame's tiled picture keeps its scale");
  // The bytes ride in the message's blobs (Figma desktop placed fresh pictures sent so, never one named only by a URL in
  // the meta): one blob per picture, which its paints' image and thumbnail name.
  const blobOf = (paint) => message.blobs[paint?.image.dataBlob];
  check(message.blobs.length === 2 && Buffer.from(blobOf(picture)?.bytes ?? []).equals(logoBytes) && picture.imageThumbnail.dataBlob === picture.image.dataBlob && tile?.image.dataBlob === picture.image.dataBlob && Buffer.from(blobOf(cropped)?.bytes ?? []).equals(photoBytes), `each picture's bytes in one blob (${message.blobs.length})`);
  check(named("Lost")?.fillPaints.length === 0 && notes.some((note) => note.includes("Lost") && note.includes("not in the export")) && notes.some((note) => note.includes("Mark") && note.includes("PNG, JPEG, GIF or WebP")), `a picture without bytes or of another kind is named in a note (${notes.join("; ")})`);
  check(notes.length === 2, `pictures: no other notes (${notes.join("; ")})`);

  // The html: the picture's blob, its paint and the plugin data survive Figma's encoding.
  const pkg = { ...exportOf([rectangle]), images: { [logo]: images[logo] } };
  const back = await readFigmaClipboard((await figmaPasteHtml(pkg, pack)).html);
  const read = back?.message.nodeChanges.find((n) => n.name === "Rectangle");
  const readBlob = back?.message.blobs?.[read?.fillPaints?.[1]?.image.dataBlob];
  check(read?.fillPaints?.[1]?.image.hash.length === 20 && Buffer.from(readBlob?.bytes ?? []).equals(logoBytes) && read.pluginData?.[0]?.key === "zenstudio-image", "the picture's bytes and its src survive the paste html");
}

// --- Shapes as Figma's own layers (its copy of the importer's layers, 2026-10-20) -----------------------------------
{
  const border = "Color/Border/Accent/Solid/Default", fill = "Color/Background/Neutral/Subtle/Default";
  const abs = (left, top) => ({ cx: "MIN", cy: "MIN", left, top, right: 0, bottom: 0 });
  const specs = [
    { type: "LINE", shape: true, name: "Line", stroke: border, strokeWeight: 2, strokeAlign: "CENTER", fixedWidth: 120, fixedHeight: 0, rotation: 90, absolute: abs(20, 40) },
    { type: "LINE", shape: true, name: "Arrow", stroke: border, strokeWeight: 2, strokeAlign: "CENTER", endCap: "ARROW_LINES", fixedWidth: 120, fixedHeight: 0, absolute: abs(20, 100) },
    { type: "POLYGON", shape: true, name: "Polygon", fill, pointCount: 5, fixedWidth: 100, fixedHeight: 100, absolute: abs(170, 20) },
    { type: "STAR", shape: true, name: "Star", fill, stroke: border, strokeWeight: 1, strokeAlign: "INSIDE", pointCount: 6, innerRadius: 0.38, fixedWidth: 100, fixedHeight: 100, absolute: abs(300, 20) },
    // Figma's probe path: a quadratic top and a square hole, even-odd (its copy: 8 vertices, 8 segments, 1 region of 2 loops).
    { type: "VECTOR", shape: true, name: "Vector", fill, vectorPaths: [{ windingRule: "EVENODD", data: "M 0 50 Q 50 0 100 50 L 100 100 L 0 100 Z M 30 60 L 70 60 L 70 90 L 30 90 Z" }], fixedWidth: 100, fixedHeight: 100, absolute: abs(430, 20) },
    { type: "BOOLEAN_OPERATION", shape: true, name: "Subtract", booleanOperation: "SUBTRACT", fill, fixedWidth: 100, fixedHeight: 100, absolute: abs(560, 20), children: [
      { type: "RECTANGLE", shape: true, name: "Rectangle", fill, fixedWidth: 100, fixedHeight: 100, absolute: abs(0, 0) },
      { type: "ELLIPSE", shape: true, name: "Ellipse", fill, fixedWidth: 60, fixedHeight: 60, absolute: abs(40, 40) },
    ] },
    { type: "BOOLEAN_OPERATION", shape: true, name: "Exclude", booleanOperation: "EXCLUDE", fixedWidth: 10, fixedHeight: 10, absolute: abs(700, 20), children: [] },
  ];
  const free = { type: "FRAME", name: "Shapes", fixedWidth: 900, fixedHeight: 200, layout: { mode: "NONE" }, children: specs };
  const { message, notes } = nativeMessage(exportOf([free]), pack);
  check(notes.length === 0, `shapes: no notes (${notes.join("; ")})`);
  const named = (name) => message.nodeChanges.find((n) => n.name === name);
  const varOf = (paints) => id(paints?.[0]?.colorVar?.value.alias.guid);
  const lineNode = named("Line"), arrow = named("Arrow");
  // A 120 px line from (20, 40) turned 90° (counter-clockwise) about its centre (80, 40): it runs from (80, 100) up to (80, -20).
  const t = lineNode?.transform ?? {};
  check(lineNode?.type === "LINE" && lineNode.size.x === 120 && lineNode.size.y === 0 && lineNode.strokeAlign === "CENTER" && lineNode.strokeWeight === 2 && varOf(lineNode.strokePaints) === pack.variables[border][0] && !lineNode.strokeCap, "a line: Figma's LINE, its length, a centred border stroke");
  check(Math.abs(t.m02 - 80) < 1e-9 && Math.abs(t.m12 - 100) < 1e-9 && Math.abs(t.m01 - 1) < 1e-9, `a line turns about its centre (${t.m02}, ${t.m12})`);
  check(arrow?.strokeCap === "ARROW_LINES", "an arrow is a LINE with Figma's ARROW_LINES cap");
  const polygon = named("Polygon"), star = named("Star");
  check(polygon?.type === "REGULAR_POLYGON" && polygon.count === 5 && varOf(polygon.fillPaints) === pack.variables[fill][0] && polygon.strokePaints.length === 0, "a polygon: REGULAR_POLYGON with its count");
  check(star?.type === "STAR" && star.count === 6 && star.starInnerScale === 0.38 && varOf(star.strokePaints) === pack.variables[border][0] && star.strokeAlign === "INSIDE", "a star: its count, inner scale and border");
  const vector = named("Vector");
  const blob = message.blobs[vector?.vectorData?.vectorNetworkBlob];
  const view = blob ? new DataView(Uint8Array.from(blob.bytes).buffer) : null;
  // The quadratic's cubic tangent from its start (0, 25 in the layer): Figma's own (33.33, -33.33).
  check(vector?.type === "VECTOR" && vector.size.x === 100 && vector.size.y === 75 && vector.transform.m02 === 430 && vector.transform.m12 === 45 && vector.strokeAlign === "CENTER", `a path sits at its curve's bounds in the Studio box (${vector?.size.x} × ${vector?.size.y} at ${vector?.transform.m02}, ${vector?.transform.m12})`);
  check(view && view.getUint32(0, true) === 8 && view.getUint32(4, true) === 8 && view.getUint32(8, true) === 1 && Math.abs(view.getFloat32(12 + 8 * 12 + 8, true) - 100 / 3) < 1e-4 && Math.abs(view.getFloat32(12 + 8 * 12 + 12, true) + 100 / 3) < 1e-4, "its network as Figma's: 8 vertices, 8 segments, the quadratic as a cubic");
  const region = view ? 12 + 8 * 12 + 8 * 28 : 0;
  check(view && view.getUint32(region, true) === 0 && view.getUint32(region + 4, true) === 2, "even-odd: one region of two loops, style 0 (Figma's)");
  const subtract = named("Subtract");
  const parts = message.nodeChanges.filter((n) => n.parentIndex && id(n.parentIndex.guid) === id(subtract?.guid));
  check(subtract?.type === "BOOLEAN_OPERATION" && subtract.booleanOperation === "SUBTRACT" && subtract.vectorOperationVersion === 1 && varOf(subtract.fillPaints) === pack.variables[fill][0], "a boolean group: Figma's operation and its fill");
  check(parts.length === 2 && parts[0].type === "ROUNDED_RECTANGLE" && parts[1].type === "ELLIPSE" && parts[1].transform.m02 === 40 && parts[1].transform.m12 === 40 && parts[0].parentIndex.position < parts[1].parentIndex.position, "its shapes inside it, in order, at their X / Y");
  check(named("Exclude")?.booleanOperation === "XOR", "Exclude is Figma's XOR");
  const back = await readFigmaClipboard((await figmaPasteHtml(exportOf([free]), pack)).html);
  check(back?.message.nodeChanges.filter((n) => ["LINE", "REGULAR_POLYGON", "STAR", "VECTOR", "BOOLEAN_OPERATION"].includes(n.type)).length === 7, "the shapes survive Figma's clipboard encoding");
}

// --- the page's own components (figma-push COMPONENT_SET / COMPONENT / local INSTANCE; Figma's copy of a probe) -------
{
  const text = (characters, extra = {}) => ({ type: "TEXT", characters, ...extra });
  const row = (children) => ({ type: "FRAME", name: "Stack", layout: { mode: "HORIZONTAL", gap: 4 }, children });
  const set = { type: "COMPONENT_SET", local: "chip", name: "Chip", properties: [{ name: "Label", type: "TEXT", default: "Filter" }, { name: "Show icon", type: "BOOLEAN", default: true }, { name: "Content", type: "SLOT" }], layout: { mode: "HORIZONTAL", gap: 24 }, hugW: true, hugH: true, children: [
    { type: "COMPONENT", local: "chip-small", name: "Size=Small", variant: { Size: "Small" }, layout: { mode: "VERTICAL" }, hugW: true, hugH: true, children: [row([{ type: "ELLIPSE", shape: true, name: "Dot", fixedWidth: 6, fixedHeight: 6, propRefs: { visible: "Show icon" } }, text("Filter", { propRefs: { characters: "Label" } })])] },
    { type: "COMPONENT", local: "chip-large", name: "Size=Large", variant: { Size: "Large" }, layout: { mode: "VERTICAL" }, hugW: true, hugH: true, children: [row([{ type: "ELLIPSE", shape: true, name: "Dot", fixedWidth: 8, fixedHeight: 8, propRefs: { visible: "Show icon" } }, text("Filter", { propRefs: { characters: "Label" } })])] },
  ] };
  const note = { type: "COMPONENT", local: "note", name: "Note", properties: [{ name: "Title", type: "TEXT", default: "Title" }], layout: { mode: "VERTICAL" }, hugW: true, hugH: true, children: [{ type: "FRAME", name: "Stack", layout: { mode: "VERTICAL" }, children: [text("Title", { propRefs: { characters: "Title" } }), text("Body")] }] };
  const uses = [
    { type: "INSTANCE", local: "chip", name: "Done", variant: { Size: "Large" }, props: { Label: "Done", "Show icon": false } },
    { type: "INSTANCE", local: "note", name: "Card note", props: { Title: "Hello" }, layerOverrides: [{ at: [0, 1], characters: "Changed body", fill: "Color/Content/Accent/Base" }] },
    { type: "INSTANCE", local: "elsewhere", name: "Lost" },
  ];
  const { message, notes } = nativeMessage(exportOf([set, note, ...uses]), pack);
  const nodes = message.nodeChanges;
  const named = (name, type) => nodes.find((n) => n.name === name && (!type || n.type === type));
  const children = (node) => nodes.filter((n) => n.parentIndex && id(n.parentIndex.guid) === id(node?.guid));
  const group = named("Chip", "FRAME");
  const defs = Object.fromEntries((group?.componentPropDefs ?? []).map((def) => [def.name, def]));
  check(group?.isStateGroup === true && JSON.stringify(group.stateGroupPropertyValueOrders) === JSON.stringify([{ property: "Size", values: ["Small", "Large"] }]), "a set: Figma's state group with its variant value order");
  check(defs.Label?.type === "TEXT" && defs.Label.initialValue.textValue.characters === "Filter" && defs.Label.varValue.dataType === "TEXT_DATA" && defs["Show icon"]?.type === "BOOL" && defs["Show icon"].initialValue.boolValue === true && defs.Size?.type === "VARIANT" && !defs.Content, "its definitions as Figma's copy writes them (a slot property waits)");
  const [small, large] = children(group);
  check(small?.type === "SYMBOL" && small.name === "Size=Small" && large?.type === "SYMBOL" && small.variantPropSpecs?.[0]?.value === "Small" && id(small.variantPropSpecs[0].propDefId) === id(defs.Size.id), "its variants: symbols named by their values, with variantPropSpecs");
  const own = Object.fromEntries((large?.componentPropDefs ?? []).map((def) => [id(def.parentPropDefId), id(def.id)]));
  check(own[id(defs.Label.id)] && own[id(defs["Show icon"].id)] && own[id(defs.Label.id)] !== id(defs.Label.id), "a variant's own definitions point at the set's (parentPropDefId)");
  const largeDot = children(children(large)[0]).find((n) => n.name === "Dot");
  const largeText = children(children(large)[0]).find((n) => n.type === "TEXT");
  check(id(largeDot?.componentPropRefs?.[0]?.defID) === own[id(defs["Show icon"].id)] && largeDot.componentPropRefs[0].componentPropNodeField === "VISIBLE" && largeDot.parameterConsumptionMap?.entries?.[0]?.variableData.dataType === "PROP_REF", "a bound layer names its variant's own definition, with its PROP_REF link");
  check(largeText?.componentPropRefs?.[0]?.componentPropNodeField === "TEXT_DATA", "a bound text: TEXT_DATA");
  const noteMain = named("Note", "SYMBOL");
  check(noteMain?.componentPropDefs?.[0]?.name === "Title" && !noteMain.variantPropSpecs, "a lone main: a symbol with its own definitions");
  // A <Use>: a frame that copies its variant's layers with its values (Figma links no pasted instance to a pasted main).
  const done = named("Done", "FRAME");
  const doneLayers = children(children(done)[0]);
  check(done && !nodes.some((n) => n.type === "INSTANCE" && n.name === "Done") && doneLayers.find((n) => n.name === "Dot")?.visible === false && doneLayers.find((n) => n.type === "TEXT")?.textData.characters === "Done" && !doneLayers.some((n) => n.componentPropRefs), "a Use is a frame copy of its variant: its values shown, nothing bound");
  const cardTexts = children(children(named("Card note", "FRAME"))[0]).filter((n) => n.type === "TEXT");
  check(cardTexts[0]?.textData.characters === "Hello" && cardTexts[1]?.textData.characters === "Changed body" && id(cardTexts[1].fillPaints?.[0]?.colorVar?.value.alias.guid) === pack.variables["Color/Content/Accent/Base"]?.[0], "its overrides of its main's layers (characters, fill)");
  check(notes.some((n) => n.includes("Lost") && n.includes("not in this paste")) && notes.some((n) => /^2 instances of the page's own components came as frames/.test(n)) && notes.some((n) => n.includes("slot property Content")), `notes: a missing main, the frame copies, the slot property (${notes.join("; ")})`);
  const back = await readFigmaClipboard((await figmaPasteHtml(exportOf([set, note]), pack)).html);
  check(back?.message.nodeChanges.filter((n) => n.type === "SYMBOL" && id(n.guid).startsWith("2147480000")).length === 3 && back.message.nodeChanges.some((n) => n.isStateGroup), "the components survive Figma's clipboard encoding");
}

// --- a component's own picture (an Avatar's photo, a table cell's): the first layer that shows one (pack `img`) ------
{
  const logoBytes = fs.readFileSync(path.join(root, "src/templates/hr/assets/workspace-logo.png"));
  const sha = crypto.createHash("sha1").update(logoBytes).digest("hex");
  const pictures = await nativePictures({ "/u/ann.png": logoBytes.toString("base64") });
  const avatar = { type: "INSTANCE", name: "Ann", set: { id: "223:9050", name: "Avatar/Single" }, props: { Shape: "Circle", Size: "Large", Theme: "Photo", Background: "Subtle" }, image: "/u/ann.png" };
  const avatarCell = { type: "INSTANCE", name: "Owner", set: { id: "1603:2869", name: "Primitives/Table/Cell/Avatar-Cell" }, props: { Bold: "No", Subtext: "No" }, nested: [{ path: "Avatar", props: { Shape: "Square", Size: "Small", Theme: "Photo", Background: "Subtle" } }], image: "/u/ann.png" };
  const photoCell = { type: "INSTANCE", name: "Cover", set: { id: "1603:4668", name: "Primitives/Table/Cell/Photo-Cell" }, props: { Bold: "No", Subtext: "No" }, image: "/u/ann.png" };
  const lost = { ...avatar, name: "Lost", image: "/u/gone.png" };
  const { message, notes } = nativeMessage(exportOf([avatar, avatarCell, photoCell, lost]), pack, pictures);
  const [ann, owner, cover, missing] = instances(message);
  const pictureAt = (node, guids) => overrides(node).find((entry) => entry.guidPath.guids.map(id).join("/") === guids.join("/"))?.fillPaints?.[0];
  const imageRow = (symbolId) => pack.symbols[symbolId]?.nodes.find((row) => row[11]?.img)?.[0];
  const shows = (paint) => paint?.type === "IMAGE" && Buffer.from(paint.image.hash).toString("hex") === sha && Buffer.from(message.blobs[paint.image.dataBlob]?.bytes ?? []).equals(logoBytes) && paint.imageScaleMode === "FILL";
  const annRow = imageRow(id(ann?.symbolData.symbolID));
  check(annRow && shows(pictureAt(ann, [annRow])), `an Avatar's photo fills its Image layer (${annRow})`);
  // The Avatar-Cell's Avatar shows the variant its nested props choose: the picture goes to that variant's Image.
  const swap = overrides(owner).find((entry) => entry.guidPath.guids.map(id).join("/") === "1603:2873" && entry.overriddenSymbolID);
  const shown = swap ? id(swap.overriddenSymbolID) : pack.symbols["1603:2870"].nodes.find((row) => row[0] === "1603:2873")[9];
  check(pack.symbols[shown]?.name.includes("Shape=Square") && shows(pictureAt(owner, ["1603:2873", imageRow(shown)])), `an Avatar-Cell's picture fills its nested Avatar's Image, in the variant shown (${pack.symbols[shown]?.name})`);
  check(shows(pictureAt(cover, ["1603:4720"])), "a Photo-Cell's picture fills its Photo");
  check(missing && !overrides(missing).some((entry) => entry.fillPaints) && notes.length === 1 && notes[0].includes("Lost") && notes[0].includes("not in the export"), `a picture without bytes is named in a note (${notes.join("; ")})`);
  check(message.blobs.filter((blob) => Buffer.from(blob.bytes).equals(logoBytes)).length === 1, "one blob for a picture used three times");
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
  // Siblings never share a position: a layer appended to a copied slot content goes after the copy's own children
  // (a Goal-Progress card's hint took the first child's "!" and Figma drew it on top, user 2026-10-17).
  const byParent = new Map();
  for (const n of message.nodeChanges) if (n.parentIndex) { const k = id(n.parentIndex.guid); if (!byParent.has(k)) byParent.set(k, []); byParent.get(k).push(n.parentIndex.position); }
  const shared = [...byParent.values()].filter((list) => new Set(list).size !== list.length).length;
  check(shared === 0, `no two siblings share a position (${shared} parents do)`);
  // native-diff (the comparison with Figma's own copy of the plugin's import) finds nothing between a paste and itself.
  const same = diffMessages(pack, message, message.clipboardSelectionRegions[0].nodes[0], message);
  check(same.kinds.length === 0 && same.counts.INSTANCE > 150, `native-diff: a paste equals itself (${same.kinds.slice(0, 3).map((k) => k.kind).join("; ")})`);
}

if (failures.length) { console.error(`✗ figma-native selftest: ${failures.length}/${checks} failed\n  ${failures.join("\n  ")}`); process.exit(1); }
console.log(`✓ figma-native selftest: ${checks} checks pass.`);

// Read-only use_figma script for docs/figma-contracts/component-properties.json (file 9nZv4uW2LT21yuHabMTCh1).
// Run it once per ❖ component page (PAGE_ID = the page's node id; list pages with
// `return figma.root.children.map((p) => p.id + " " + p.name)`), in parallel calls, then put each result's `sets`
// into that page's entry of component-properties.json (V/B/T/I → VARIANT/BOOLEAN/TEXT/INSTANCE_SWAP; options split
// on "|"; an I row's third and fourth fields are its default component's name and how many preferred values it lists,
// stored as `default` and `preferred`) and run `node tools/studio/figma-props-build.mjs`: it names every new, renamed or
// removed property. A page with many swaps may need its sets split over several calls (use_figma stops at 60 s).
const page = await figma.getNodeByIdAsync("PAGE_ID");
await figma.setCurrentPageAsync(page);
const owners = page.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] }).filter((n) => (n.type === "COMPONENT_SET" || n.parent?.type !== "COMPONENT_SET") && !/^[._]/.test(n.name));
const out = [];
for (const n of owners) {
  let defs; try { defs = n.componentPropertyDefinitions; } catch { continue; }
  const p = [];
  for (const [k, d] of Object.entries(defs)) {
    const name = k.replace(/#[^#]*$/, "");
    if (d.type === "INSTANCE_SWAP") { const main = await figma.getNodeByIdAsync(d.defaultValue); p.push([name, "I", main ? main.name : null, (d.preferredValues || []).length]); continue; }
    p.push(d.type === "VARIANT" ? [name, "V", d.defaultValue, d.variantOptions.join("|")] : d.type === "BOOLEAN" ? [name, "B", d.defaultValue] : d.type === "TEXT" ? [name, "T", String(d.defaultValue).slice(0, 24)] : [name, d.type]);
  }
  if (p.length) out.push([n.name, n.id, p]);
}
return { page: page.name, sets: out };

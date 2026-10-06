// Read-only use_figma script for docs/figma-contracts/component-properties.json (file 9nZv4uW2LT21yuHabMTCh1).
// Run it once per ❖ component page (PAGE_ID = the page's node id; list pages with
// `return figma.root.children.map((p) => p.id + " " + p.name)`), in parallel calls, then put each result's `sets`
// into that page's entry of component-properties.json (V/B/T/I → VARIANT/BOOLEAN/TEXT/INSTANCE_SWAP; options split
// on "|") and run `node tools/studio/figma-props-build.mjs`: it names every new, renamed or removed property.
const page = await figma.getNodeByIdAsync("PAGE_ID");
await figma.setCurrentPageAsync(page);
const owners = page.findAllWithCriteria({ types: ["COMPONENT_SET", "COMPONENT"] }).filter((n) => (n.type === "COMPONENT_SET" || n.parent?.type !== "COMPONENT_SET") && !/^[._]/.test(n.name));
const out = [];
for (const n of owners) {
  let defs; try { defs = n.componentPropertyDefinitions; } catch { continue; }
  const p = Object.entries(defs).map(([k, d]) => { const name = k.replace(/#[^#]*$/, ""); return d.type === "VARIANT" ? [name, "V", d.defaultValue, d.variantOptions.join("|")] : d.type === "BOOLEAN" ? [name, "B", d.defaultValue] : d.type === "TEXT" ? [name, "T", String(d.defaultValue).slice(0, 24)] : d.type === "INSTANCE_SWAP" ? [name, "I"] : [name, d.type]; });
  if (p.length) out.push([n.name, n.id, p]);
}
return { page: page.name, sets: out };

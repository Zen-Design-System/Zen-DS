// The Figma ↔ code component mapping both directions of the Figma bridge read (figma-pull.mjs, figma-push.mjs), built
// from data the repo ships: in Node by figma-pull's repoMapping, in the browser by the Studio's Figma export. Isomorphic.

/**
 * The Figma → code mapping from the repo's data: `figmaProps` (inspector/figmaProps.generated.ts FIGMA_PROPS), `contract`
 * (docs/figma-contracts/component-properties.json: each set's id, name and property defaults) and `apiProps` (component
 * → Map of its code props to their code default, from docs/api). Sets are found by id and by name. `dataSlots` (slots/dataSlots.ts
 * DATA_SLOTS): the Figma slots whose items the code takes as data (Sidebar sections, Breadcrumbs items).
 */
export function figmaMapping({ figmaProps, contract, apiProps = {}, textStyles = null, iconNames = null, dataSlots = {} }) {
  const contractSets = new Map();
  for (const page of contract.pages ?? []) for (const set of page.sets ?? []) { contractSets.set(set.id, set); contractSets.set(set.name, set); }
  const sets = new Map();
  // Each entry keeps its set's id, name and slots: figma-push.mjs writes an instance of it.
  const register = (set, entry) => {
    if (!set) return;
    const full = { id: set.id, name: set.name, slots: (set.props ?? []).filter((prop) => prop.type === "SLOT").map((prop) => prop.name), ...entry };
    sets.set(set.id, full);
    sets.set(set.name, full);
  };
  const defaultsOf = (set) => Object.fromEntries((set?.props ?? []).map((prop) => [prop.name, prop.default]));
  for (const [code, props] of Object.entries(figmaProps)) {
    const own = props.own.filter((item) => item.type !== "SET");
    const choice = props.own.find((item) => item.type === "SET");
    if (choice) {
      const first = Object.values(choice.options ?? {})[0];
      for (const [name, value] of Object.entries(choice.options ?? {})) {
        const set = contractSets.get(name);
        register(set ?? { id: name, name }, { code, own, toggles: props.toggles, defaults: defaultsOf(set), setProp: choice.prop, setValue: value, setDefault: first });
      }
    }
    const set = contractSets.get(props.figma);
    register(set ?? { id: props.figma, name: props.figma }, { code, own, toggles: props.toggles, defaults: defaultsOf(set) });
  }
  // A set whose only property is its data slot (Breadcrumbs: Item-List, a one-option Size) has no FIGMA_PROPS entry.
  for (const [code, slots] of Object.entries(dataSlots)) {
    for (const slot of slots) {
      const set = slot.figma && contractSets.get(slot.figma.node);
      if (set && !sets.has(set.id)) register(set, { code, own: [], toggles: [], defaults: defaultsOf(set) });
    }
  }
  return { sets, apiProps, textStyles: textStyles ? new Set(textStyles) : null, iconNames: iconNames ? new Set(iconNames) : null, dataSlots };
}

/** docs/api components (`{ name, props: [{ name, default }] }`, default as JSON text) → component → Map of prop → code default. */
export function apiPropsOf(components) {
  const out = {};
  for (const component of components) {
    out[component.name] = new Map((component.props ?? []).map((prop) => {
      let value;
      try { value = prop.default === null || prop.default === undefined ? undefined : JSON.parse(prop.default); } catch { value = undefined; }
      return [prop.name, value];
    }));
  }
  return out;
}

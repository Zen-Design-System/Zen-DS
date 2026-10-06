import { Icon } from "../../../components/Icon";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { SourceElement, StudioNodeRef } from "../types";
import type { FieldApi } from "./fieldApi";
import { selectNested, useNestedInstances, type Nested, type NestedInstances } from "./nestedInstances";
import { PropField } from "./PropField";
import { propLabel } from "./propSchema";
import { fileName } from "./status";
import { InspectorItem, InspectorSection } from "./Section";
import "./nested.css";

/*
 * Figma's nested instance properties (nestedInstances.ts reads them): a nested instance's header and its booleans, and
 * the "Nested instances" section of components whose Properties are not grouped (propGroups.ts groups them in place).
 */

type NodeSelection = { kind: "node" } & StudioNodeRef;

/** One nested instance (Figma's nested instance header and its booleans); the header selects it on the canvas. */
export function NestedInstanceGroup({ item, nested, element, api }: { item: Nested; nested: NestedInstances; element: SourceElement; api: FieldApi }) {
  // Two of the same component in one prop (two IconButtons in trailing) are told apart by their order.
  const twins = nested.items.filter((other) => other.name === item.name && other.prop === item.prop);
  const where = `${propLabel(item.prop, element.name)}${twins.length > 1 ? ` · ${twins.indexOf(item) + 1}` : ""}`;
  // JSX written outside the owner (a const, a helper, a local component, another file): an edit changes it there, for
  // every element it renders.
  const shared = item.elsewhere ? `${fileName(item.file)}:${item.loc.split(":")[0]}${item.count > 1 ? ` · ${item.count} on canvas` : ""}` : null;
  return (
    <div role="group" aria-label={`${item.name} in ${where}`} className="studio-nested__group">
      <ul className="studio-inspector__items">
        <InspectorItem
          icon={<Icon name="icon-cube-line" size={16} />}
          component
          name={item.name}
          meta={where}
          onClick={() => selectNested(item)}
        />
      </ul>
      {shared ? <p className={`studio-nested__where ${typographyStyles["Body/Small/Regular"]}`} title="Edits write where this element is written and change every element it renders">Written in {shared}</p> : null}
      {item.specs.map((spec) => (
        <PropField
          key={spec.name}
          spec={spec}
          label={propLabel(spec.name, item.name)}
          value={nested.valueFor(item, spec.name)}
          disabled={api.disabled}
          boundHint={api.boundHint}
          onSet={(value) => { void nested.write(item, spec, value); }}
          onReset={() => { void nested.write(item, spec, null); }}
          restore={nested.restoreFor(item, spec)}
          repeats={item.count}
        />
      ))}
    </div>
  );
}

/** The nested instance groups (Figma "nested instances"): mounted by the Design panel between Properties and Slots. */
export function NestedProperties({ selection, element, api }: { selection: NodeSelection; element: SourceElement; api: FieldApi }) {
  const nested = useNestedInstances(selection, element, api);
  if (!nested.items.length) return null;
  return (
    <InspectorSection title="Nested instances">
      <div className="studio-nested">
        {nested.items.map((item) => <NestedInstanceGroup key={item.src} item={item} nested={nested} element={element} api={api} />)}
      </div>
    </InspectorSection>
  );
}

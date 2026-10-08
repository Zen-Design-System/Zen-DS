import { Icon } from "../../../components/Icon";
import { typographyStyles } from "../../../tokens/typography.generated";
import type { SourceElement } from "../types";
import type { FieldApi } from "./fieldApi";
import { selectNested, type Nested, type NestedInstances } from "./nestedInstances";
import { PropField } from "./PropField";
import { holds, isSetValue } from "./propGroups";
import { propLabel } from "./propSchema";
import { InspectorSrcContext } from "./controls/hostContext";
import { fileName } from "./status";
import { InspectorItem, InspectorSection } from "./Section";
import "./nested.css";

/*
 * Figma's nested instance properties (nestedInstances.ts reads them): a nested instance's header and its properties
 * (Figma's variants, booleans, swaps and texts; GĐ4 M3), and the "Nested instances" section of components whose
 * Properties are not grouped (propGroups.ts groups them in place).
 */

/** One nested instance (Figma's nested instance header and its properties); the header selects it on the canvas. */
export function NestedInstanceGroup({ item, nested, element, api }: { item: Nested; nested: NestedInstances; element: SourceElement; api: FieldApi }) {
  // Two of the same component in one prop (two IconButtons in trailing) are told apart by their order.
  const twins = nested.items.filter((other) => other.name === item.name && other.prop === item.prop);
  const where = `${propLabel(item.prop, element.name)}${twins.length > 1 ? ` · ${twins.indexOf(item) + 1}` : ""}`;
  // JSX written outside the owner (a const, a helper, a local component, another file): an edit changes it there, for
  // every element it renders.
  const shared = item.elsewhere ? `${fileName(item.file)}:${item.loc.split(":")[0]}${item.count > 1 ? ` · ${item.count} on canvas` : ""}` : null;
  return (
    // Its scale fields name this instance on the spacing hover bus (not the selection that lists it).
    <InspectorSrcContext value={item.src}>
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
      {item.rows.filter((row) => holds(row.when, item.hit.props)).map((row) => (row.kind === "toggle" ? (
        // A Figma boolean that shows a layer: on writes its starting value (Figma's default icon), off removes the prop.
        <PropField
          key={`toggle:${row.label}`}
          spec={{ name: row.spec.name, type: "boolean", description: `Figma boolean ${row.label}: shows the ${row.label} layer (${row.spec.name} set).`, defaultValue: false, editor: { kind: "boolean" } }}
          label={row.label}
          value={{ state: "literal", value: isSetValue(item.hit.props[row.spec.name]), raw: "" }}
          disabled={api.disabled}
          resettable={false}
          onSet={(on) => { void nested.write(item, row.spec, on === true ? row.on : null); }}
          onReset={() => undefined}
        />
      ) : (
        <PropField
          key={row.spec.name}
          spec={row.spec}
          label={row.label}
          optionLabels={row.optionLabels}
          defaultIcon={row.defaultIcon}
          value={nested.valueFor(item, row.spec.name)}
          disabled={api.disabled}
          boundHint={api.boundHint}
          onSet={(value) => { void nested.write(item, row.spec, value); }}
          onReset={() => { void nested.write(item, row.spec, null); }}
          restore={nested.restoreFor(item, row.spec)}
          repeats={item.count}
        />
      )))}
    </div>
    </InspectorSrcContext>
  );
}

/** The nested instance groups (Figma "nested instances"): mounted by the Design panel between Properties and Slots. */
export function NestedProperties({ element, api, nested }: { element: SourceElement; api: FieldApi; nested: NestedInstances }) {
  if (!nested.items.length) return null;
  return (
    <InspectorSection title="Nested instances">
      <div className="studio-nested">
        {nested.items.map((item) => <NestedInstanceGroup key={item.src} item={item} nested={nested} element={element} api={api} />)}
      </div>
    </InspectorSection>
  );
}

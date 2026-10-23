// Harness case kinds for the segmented-toggle-breadcrumbs suites (tools/figma-contract/suites). cases.tsx merges every group's kinds.
import type { ReactNode } from "react";
import { Segmented } from "../../../src/components/Segmented";
import { Toggle, ToggleButton } from "../../../src/components/Toggle";
import { BreadcrumbItem, Breadcrumbs } from "../../../src/components/Breadcrumbs";

type Props = Record<string, any>;
export const cases: Record<string, (props: Props) => ReactNode> = {
  // One Primitives/Segmented/Item inside a Segmented: the item's colours follow the group's level and size
  // (segmented.css), so it never renders alone. `selected` picks it; otherwise the group's value matches no option.
  stbSegmentedItem: ({ size, level, state, selected, leading, label }) => (
    <Segmented size={size} level={level} value={selected ? "item" : "none"} options={[{ id: "item", label, leading, state }]} />
  ),
  // Figma Segmented: the Item-List slot's items, the selected one by id.
  stbSegmented: ({ level, options, value }) => <Segmented level={level} value={value} options={options} />,
  stbToggleButton: (p) => <ToggleButton aria-label="Toggle" {...p} />,
  stbToggle: (p) => <Toggle label="Toggle Label" {...p} />,
  stbBreadcrumbs: (p) => <Breadcrumbs items={[]} {...p} />,
  stbBreadcrumbItem: ({ label, ...p }) => <BreadcrumbItem item={{ id: "item", label }} {...p} />,
};

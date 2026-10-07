import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../Icon";
import type { PopoverItemData } from "../Popover";

const storyPhoto = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#d9c7b8"/><circle cx="16" cy="13" r="6" fill="#8f735f"/></svg>');
import { Chip, chipLevels, chipSizes, chipStates, chipThemes, chipVariants } from "./Chip";

const leadingOptions = {
  none: undefined,
  search: <Icon name="icon-search-medium-line" size="sm" decorative />,
  grid: <Icon name="icon-grid-01-line" size="sm" decorative />,
  marker: <Icon name="icon-marker-pin-01-line" size="sm" decorative />,
} as const;

const trailingOptions = {
  none: undefined,
  chevron: <Icon name="icon-chevron-down-line" size="2xs" decorative />,
  close: <Icon name="icon-x-circle-solid" size="xs" decorative />,
} as const;

const meta = {
  title: "Components/Chip/Pill",
  component: Chip,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Chip/Pill is a compact action or filter primitive. Use Playground for one composition, then use the matrices to compare Figma variants, states, sizes, and icon contracts.",
      },
    },
  },
  args: { children: "Filter", variant: "advanced", size: "small", level: "secondary", state: "default", select: false, theme: "leading-icon", leading: "search", trailing: "chevron", dropdown: false },
  argTypes: {
    variant: { control: "inline-radio", options: chipVariants },
    size: { control: "inline-radio", options: chipSizes },
    level: { control: "inline-radio", options: chipLevels },
    theme: { control: "select", options: chipThemes },
    state: { control: "select", options: chipStates },
    select: { control: "boolean" },
    dropdown: { control: "boolean" },
    leading: { control: "select", options: Object.keys(leadingOptions), mapping: leadingOptions },
    trailing: { control: "select", options: Object.keys(trailingOptions), mapping: trailingOptions },
    counter: { control: "text" },
    value: { control: "text" },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  parameters: {
    docs: {
      description: { story: "Change one property at a time. The preview and Code panel are driven by the same args." },
      source: { type: "dynamic" },
    },
  },
};

const advancedFilterItems: PopoverItemData[] = [
  { id: "all", label: "All components", leading: <Icon name="icon-grid-01-line" size="sm" decorative /> },
  { id: "foundations", label: "Foundations", caption: "Tokens and styles", leading: <Icon name="icon-colors-line" size="sm" decorative /> },
  { id: "components", label: "Components", caption: "Reusable UI", leading: <Icon name="icon-layout-grid-01-line" size="sm" decorative /> },
  { id: "patterns", label: "Patterns", leading: <Icon name="icon-layout-grid-02-line" size="sm" decorative />, disabled: true },
];

function ChipDropdownPlayground() {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("all");
  const [search, setSearch] = useState("");
  const selectedItem = advancedFilterItems.find((item) => item.id === selectedId) ?? advancedFilterItems[0];
  const visibleItems = advancedFilterItems
    .filter((item) => String(item.label).toLowerCase().includes(search.trim().toLowerCase()))
    .map((item) => ({ ...item, selected: item.id === selectedId }));

  return (
    <div style={{ display: "grid", gap: 16, minHeight: 260, alignContent: "start" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Chip
          variant="advanced"
          size="small"
          theme="leading-icon"
          leading={<Icon name="icon-filter-lines-line" size="sm" decorative />}
          dropdown
          popoverOpen={open}
          onPopoverOpenChange={setOpen}
          popoverItems={visibleItems}
          onPopoverSelect={(item) => { setSelectedId(item.id); }}
          popoverLabel="Filter by type"
          popoverSearch
          popoverSearchValue={search}
          onPopoverSearchChange={setSearch}
          popoverSearchPlaceholder="Search components"
        >
          {selectedItem.label}
        </Chip>
        <span style={{ alignSelf: "center", color: "var(--zen-color-content-neutral-light, #666)" }}>
          Selected: {selectedItem.label}
        </span>
      </div>
      <small>Click, press Enter/Space, or press Escape while focused. The menu uses the shared Popover/Default primitive and the chip hugs its content.</small>
    </div>
  );
}

export const DropdownPlayground: Story = {
  render: () => <ChipDropdownPlayground />,
  parameters: {
    docs: {
      description: { story: "Interactive Advanced chip: intrinsic-width trigger, controlled open state, keyboard behavior, search, selection and the shared Popover item contract." },
    },
  },
};

export const Toolbar: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <Chip size="medium" leading={<Icon name="icon-sun-small-solid" size="sm" />} trailing={<Icon name="icon-chevron-down-line" size="2xs" />}>Light</Chip>
      <Chip size="medium" leading={<Icon name="icon-ruler-solid" size="sm" />} trailing={<Icon name="icon-chevron-down-line" size="2xs" />}>Comfortable</Chip>
      <Chip size="medium" leading={<Icon name="icon-colors-solid" size="sm" />} trailing={<Icon name="icon-chevron-down-line" size="2xs" />}>Neutral-S1</Chip>
      <Chip size="medium" leading={<Icon name="icon-monitor-02-solid" size="sm" />} trailing={<Icon name="icon-chevron-down-line" size="2xs" />}>Dashboard</Chip>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        {chipStates.map((state) => <Chip key={state} variant="advanced" state={state}>{state}</Chip>)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <Chip variant="advanced" selected counter={3}>Selected + counter</Chip>
        <Chip variant="advanced" theme="leading-icon" leading={<Icon name="icon-grid-01-line" size="sm" />} trailing={<Icon name="icon-x-small-line" size="2xs" />}>Leading + trailing</Chip>
        <Chip variant="normal" level="primary" selected>Normal selected</Chip>
        <Chip variant="number-only" value={12} state="focused" />
      </div>
    </div>
  ),
};

export const NormalMatrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      {(["secondary", "primary"] as const).map((level) => (
        <div key={level} style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <strong style={{ width: 72 }}>{level}</strong>
          <Chip variant="normal" level={level} size="xsmall">XSmall</Chip>
          <Chip variant="normal" level={level} size="small">Small</Chip>
          <Chip variant="normal" level={level} size="medium">Medium</Chip>
          <Chip variant="normal" level={level} size="small" selected>Selected</Chip>
          <Chip variant="normal" level={level} size="small" state="focused">Focused</Chip>
          <Chip variant="normal" level={level} size="small" theme="leading-icon" leading={<Icon name="icon-grid-01-line" size="sm" />}>Icon</Chip>
        </div>
      ))}
    </div>
  ),
};

export const AdvancedMatrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      {(["default", "hover", "press", "focused", "placeholder", "disabled"] as const).map((state) => <Chip key={state} variant="advanced" state={state}>{state}</Chip>)}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <Chip variant="advanced" theme="leading-icon" leading={<Icon name="icon-marker-pin-01-line" size="sm" />}>Leading icon</Chip>
        <Chip variant="advanced" photoSrc={storyPhoto}>Leading photo</Chip>
        <Chip variant="advanced" selected>Select</Chip>
        <Chip variant="advanced" state="focused">Focused</Chip>
        <Chip variant="advanced" state="disabled">Disabled</Chip>
      </div>
    </div>
  ),
};

export const NumberOnly: Story = {
  render: () => <div style={{ display: "flex", gap: 8 }}><Chip variant="number-only" size="small" value={1} /><Chip variant="number-only" size="medium" value={12} level="primary" /><Chip variant="number-only" size="small" value={99} state="focused" /></div>,
};

/** Regression surface for the JSON side-padding matrix; Icon intentionally omits Theme. */
export const PaddingMatrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {(["advanced", "normal"] as const).flatMap((variant) =>
        (variant === "advanced" ? ["small", "medium"] as const : ["xsmall", "small", "medium"] as const).map((size) => (
          <div key={`${variant}-${size}`} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ width: 130 }}>{variant} / {size}</span>
            <Chip variant={variant} size={size}>Label</Chip>
            <Chip variant={variant} size={size} leading={<Icon name="icon-grid-01-line" />}>Label</Chip>
            <Chip variant={variant} size={size} photoSrc={storyPhoto}>Label</Chip>
          </div>
        )),
      )}
    </div>
  ),
};

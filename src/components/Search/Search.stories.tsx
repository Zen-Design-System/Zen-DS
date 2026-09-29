import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../Icon";
import { Search, searchSizes, searchStates, searchThemes, searchVariants } from "./Search";

const meta = {
  title: "Components/Search",
  component: Search,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: "Search is a composition of Input/Text-Field. Its state, focus ring, inset shadow, typography and density come from Input; only search-specific affordances are added.",
      },
    },
  },
  args: { placeholder: "Search components", variant: "default", size: "medium", theme: "default", state: "default", iconSearch: true },
  argTypes: {
    variant: { control: "inline-radio", options: searchVariants },
    size: { control: "inline-radio", options: searchSizes },
    theme: { control: "inline-radio", options: searchThemes },
    state: { control: "select", options: searchStates },
    iconSearch: { control: "boolean" },
    leading: { control: false },
    trailing: { control: false },
  },
} satisfies Meta<typeof Search>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  parameters: {
    docs: {
      description: { story: "Use the controls to change the Search composition while retaining the shared Input visual contract." },
      source: { type: "dynamic" },
    },
  },
};

export const Themes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      {searchThemes.map((theme) => <Search key={theme} theme={theme} placeholder={theme === "default" ? "Search components" : "Filter by type"} />)}
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(180px, 1fr))", gap: 16, maxWidth: 560 }}>
      {searchStates.map((state) => <Search key={state} state={state} placeholder={state === "inputted" ? "Button" : "Search"} defaultValue={state === "inputted" ? "Button" : undefined} />)}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "State matrix verifies Search against Input's default, hover, focus, typing and inputted contracts." },
    },
  },
};

export const IconLayouts: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
      <Search placeholder="Leading search icon" />
      <Search iconSearch={false} leading={<Icon name="icon-filter-lines-line" size="sm" decorative />} placeholder="Custom leading" />
      <Search theme="filter-dropdown" placeholder="Trailing dropdown" />
    </div>
  ),
};

export const PopoverVariant: Story = {
  name: "Search/Popover",
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 232px)", gap: 16 }}>
      {searchStates.map((state) => <Search key={state} variant="popover" state={state} iconSearch={false} placeholder="Search" defaultValue={state === "typing" || state === "inputted" ? "Search" : undefined} />)}
      {searchThemes.map((theme) => <Search key={theme} variant="popover" theme={theme} placeholder="Search" />)}
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "Figma Search/Popover: always Small with Corner-Radius/Input/Medium; every state keeps a 1px Input/Border stroke (Hover: Input/Border/Hover) and Focused/Typing add no ring; the border is visible only in Neutral S4. Popover uses it with Icon-Search=No." },
    },
  },
};

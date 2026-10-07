import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Icon } from "../Icon";
import { Search } from "../Search";
import { Sidebar, SidebarSubMenu } from "./Sidebar";

const meta = {
  title: "Components/Sidebar",
  component: Sidebar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: "Sidebar is a navigation pattern with independent Header, Body, nested tree, Divider and Footer contracts. Playground is the expanded platform pattern; Collapsed verifies the density/collapse state.",
      },
    },
  },
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Desktop: Story = {
  args: { brand: null, sections: [] },
  render: () => (
    <div style={{ display: "flex", height: "720px", background: "var(--zen-color-background-canvas-default, #f7f7f7)" }}>
      <Sidebar
        brand={<><span style={{ display: "inline-flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", border: "1px solid var(--zen-color-border-neutral-pale-default)", borderRadius: "var(--zen-corner-radius-small)", background: "var(--zen-color-background-surface-default)" }}><Icon name="icon-zen" size="sm" /></span><strong style={{ flex: 1 }}>Zen DS</strong><button aria-label="Collapse"><Icon name="icon-layout-left-line" size="sm" /></button></>}
        sections={[
          { items: [
            { id: "overviews", label: "Overviews", active: true, icon: <Icon name="icon-home-03-line" size="sm" /> },
            { id: "installation", label: "Installation", icon: <Icon name="icon-disc-line" size="sm" /> },
          ] },
          { label: "Foundation", items: [
            { id: "tokens", label: "Design Tokens", dropdown: true, active: true, icon: <Icon name="icon-beaker-01-line" size="sm" />, children: [{ id: "global-colors", label: "Global Colors" }, { id: "spacing", label: "Spacing", active: true }] },
            { id: "typography", label: "Typography", icon: <Icon name="icon-type-01-line" size="sm" /> },
            { id: "iconography", label: "Iconography", icon: <Icon name="icon-bezier-curve-02-line" size="sm" /> },
          ] },
          { label: "Components", items: [
            { id: "avatar", label: "Avatar" },
            { id: "component-iconography", label: "Iconography" },
          ] },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "Expanded navigation pattern from the Codebase Platform template." },
      source: {
        code: `<Sidebar\n  density="medium"\n  brand={<SidebarBrand />}\n  sections={sections}\n  footer={<SidebarFooter />}\n/>`,
      },
    },
  },
};

/** Alias the expanded pattern as the canonical Playground entry. */
export const Playground: Story = Desktop;

export const Collapsed: Story = {
  args: { brand: null, sections: [] },
  render: () => (
    <div style={{ display: "flex", height: "720px", background: "var(--zen-color-background-canvas-default, #f7f7f7)" }}>
      <Sidebar
        collapsed
        brand={<><span style={{ display: "inline-flex", width: 32, height: 32, alignItems: "center", justifyContent: "center", border: "1px solid var(--zen-color-border-neutral-pale-default)", borderRadius: "var(--zen-corner-radius-small)", background: "var(--zen-color-background-surface-default)" }}><Icon name="icon-zen" size="sm" /></span><strong>Zen DS</strong></>}
        sections={[
          { items: [
            { id: "overviews", label: "Overviews", active: true, icon: <Icon name="icon-home-03-line" size="sm" /> },
            { id: "installation", label: "Installation", icon: <Icon name="icon-disc-line" size="sm" /> },
          ] },
          { label: "Foundation", items: [
            { id: "tokens", label: "Design Tokens", dropdown: true, icon: <Icon name="icon-beaker-01-line" size="sm" /> },
            { id: "typography", label: "Typography", icon: <Icon name="icon-type-01-line" size="sm" /> },
          ] },
        ]}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: { story: "Collapsed state keeps the 20px icon contract and removes labels, section labels and nested tree content." },
    },
  },
};

function SubMenuDemo() {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState("tokens");
  return (
    <div style={{ height: 640, padding: 16 }}>
      <Sidebar
        variant="basic"
        logo={<Icon name="icon-zen" size={24} title="Zen" />}
        productName="Kaiz"
        sections={[{ items: [
          { id: "home", label: "Home", icon: <Icon name="icon-home-03-line" size="base" /> },
          { id: "projects", label: "Projects", selected: open, icon: <Icon name="icon-cube-line" size="base" /> },
        ] }]}
        onItemClick={(item) => { if (item.id === "projects") setOpen((on) => !on); }}
        subMenu={open ? (
          <SidebarSubMenu
            search={<Search variant="popover" placeholder="Search projects" aria-label="Search projects" />}
            items={["components", "tokens", "patterns"].map((id) => ({ id, label: id[0].toUpperCase() + id.slice(1), selected: selected === id, icon: <Icon name="icon-folder-line" size="base" /> }))}
            onItemClick={(item) => setSelected(item.id)}
          />
        ) : undefined}
        subMenuLabel="Projects"
        onSubMenuClose={() => setOpen(false)}
      />
    </div>
  );
}

export const SubMenu: Story = {
  render: () => <SubMenuDemo />,
  parameters: {
    docs: {
      description: { story: "Figma Side-Bar/Sub: a 260px flyout opened beside the sidebar (8px outside its edge) with Search/Popover and a Master item list. Escape or a press outside calls onSubMenuClose." },
    },
  },
};

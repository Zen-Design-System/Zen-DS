import { useState, type ReactNode } from "react";
import { HeadingField, SelectField } from "../../src/components/Input";
import { Checkbox } from "../../src/components/Checkbox";
import { RadioButton } from "../../src/components/RadioButton";
import { Chip } from "../../src/components/Chip";
import { Icon } from "../../src/components/Icon";
import { Popover, PopoverItem, PopoverManualAddNew, PopoverBunkAction, PopoverBunkActionGroup, PopoverBunkActionDivider } from "../../src/components/Popover";
import { Avatar } from "../../src/components/Avatar";
import { Badge } from "../../src/components/Badge";
import { Button, IconButton } from "../../src/components/Button";
import { AppShellAction } from "../../src/components/AppShell";
import { Breadcrumbs } from "../../src/components/Breadcrumbs";
import { DashboardHeader } from "../../src/components/DashboardHeader";
import { Search } from "../../src/components/Search";

type Props = Record<string, any>;
const photo = "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#c8a"/></svg>');

export const cases: Record<string, (props: Props) => ReactNode> = {
  checkbox: (p) => <Checkbox {...p} />,
  radio: (p) => <RadioButton {...p} />,
  chip: ({ leadingKind, label = "Chip", ...p }) => (
    <Chip
      {...p}
      leading={leadingKind === "icon" ? <Icon name="icon-marker-pin-01-solid" decorative /> : undefined}
      photoSrc={leadingKind === "photo" ? photo : undefined}
    >
      {label}
    </Chip>
  ),
  popoverItem: ({ leadingKind, ...p }) => (
    <div style={{ width: 240 }}>
      <PopoverItem
        {...p}
        leading={leadingKind === "icon" ? <Icon name="icon-star-01-line" decorative /> : undefined}
      />
    </div>
  ),
  popover: ({ items = 1, ...p }) => (
    <div style={{ position: "relative", width: 240, height: 10 }}>
      <Popover
        open
        {...p}
        style={{ position: "static" }}
        items={Array.from({ length: items }, (_, index) => ({ id: String(index), label: "Popover Item", leading: <Icon name="icon-star-01-line" decorative /> }))}
      />
    </div>
  ),
  manualAddNew: (p) => (
    <div style={{ position: "relative", width: 240 }}>
      <PopoverManualAddNew open {...p} style={{ position: "static" }} />
    </div>
  ),
  bunkAction: () => {
    const action = (name: string) => <IconButton appearance="flat" level="primary" size="md" aria-label={name} icon={<Icon name={name as never} />} />;
    return (
      <PopoverBunkAction>
        <PopoverBunkActionGroup>{action("icon-flip-backward-line")}{action("icon-flip-forward-line")}</PopoverBunkActionGroup>
        <PopoverBunkActionDivider />
        <PopoverBunkActionGroup>{action("icon-edit-02-line")}{action("icon-copy-line")}{action("icon-share-01-line")}</PopoverBunkActionGroup>
        <PopoverBunkActionDivider />
        <PopoverBunkActionGroup>{action("icon-trash-line")}</PopoverBunkActionGroup>
      </PopoverBunkAction>
    );
  },
  itemContent: ({ theme, caption }) => {
    const leading = theme === "icon" ? <Icon name="icon-star-01-line" decorative />
      : theme === "avatar-small" ? <Avatar size="2xsmall" theme="photo" background="subtle" src={photo} />
      : theme === "avatar-big" ? <Avatar size="medium" theme="photo" background="subtle" src={photo} />
      : theme === "photo-small" || theme === "photo-big" ? <img src={photo} alt="" />
      : undefined;
    return <div style={{ width: 240 }}><PopoverItem label="Popover Item" caption={caption} theme={theme} leading={leading} /></div>;
  },
  badge: (p) => <Badge {...p} />,
  // Figma Input/Heading fills a 389.33px frame.
  headingField: (p) => <div style={{ width: 389.33 }}><HeadingField aria-label="Heading" onChange={() => {}} {...p} /></div>,
  // Figma's Leading/Trailing-Icon default to hidden; `withIcons` renders both to measure the icon slots.
  button: ({ label = "Button", withIcons, ...p }) => (
    <Button {...p} startIcon={withIcons ? <Icon name="icon-plus-line" decorative /> : undefined} endIcon={withIcons ? <Icon name="icon-plus-line" decorative /> : undefined}>{label}</Button>
  ),
  iconButton: (p) => <IconButton {...p} aria-label="Add" tooltip={false} icon={<Icon name="icon-plus-line" decorative />} />,
  // Figma Primitives/Dashboard/Header fills a 1232px frame with each Type's default content: Control-Bar Search + a
  // Filter Chip/Advanced + Tertiary and Primary "Button"; Navigation Breadcrumbs "Master" + Action-Item + Avatar; Main
  // "Heading Text" + the two buttons + Action-Item + Avatar; Custom empty.
  dashboardHeader: ({ type }) => {
    const buttons = <><Button level="tertiary">Button</Button><Button level="primary">Button</Button></>;
    const trailing = <><AppShellAction icon="icon-bell-01-solid" aria-label="Notifications" dot tooltip={false} /><Avatar size="md" theme="photo" background="subtle" src={photo} alt="" /></>;
    return (
      <div style={{ width: 1232 }}>
        {type === "control-bar" ? <DashboardHeader search={<Search size="md" placeholder="Search" />} controls={<Chip variant="advanced" dropdown>Filter</Chip>} actions={buttons} />
          : type === "navigation" ? <DashboardHeader type="navigation" leading={<Breadcrumbs items={[{ id: "master", label: "Master" }]} />} trailing={trailing} />
          : type === "main" ? <DashboardHeader type="main" title="Heading Text" actions={buttons} trailing={trailing} />
          : <DashboardHeader type="custom" />}
      </div>
    );
  },
  // Stateful demos used by interactions.mjs (behaviour, not visuals).
  interactive: () => <InteractiveDemo />,
};

function InteractiveDemo() {
  const [picked, setPicked] = useState<string | undefined>();
  const [normal, setNormal] = useState(false);
  const [created, setCreated] = useState("");
  const [fruit, setFruit] = useState("b");
  const items = [{ id: "a", label: "Apple" }, { id: "b", label: "Banana" }, { id: "c", label: "Cherry", disabled: true }, { id: "d", label: "Durian" }];
  return (
    <div style={{ display: "grid", gap: 24, width: 520 }}>
      <Checkbox label="Accept" data-testid="cb" />
      <div role="radiogroup" aria-label="Size" style={{ display: "flex", gap: 16 }}>
        <RadioButton name="size" value="s" label="S" defaultChecked />
        <RadioButton name="size" value="m" label="M" />
        <RadioButton name="size" value="l" label="L" />
      </div>
      <Chip id="normal" variant="normal" select={normal} onClick={() => setNormal((v) => !v)}>Normal</Chip>
      <div>
        <Chip id="adv" variant="advanced" select={Boolean(picked)} popoverItems={items.map((item) => ({ ...item, selected: item.id === picked }))} onPopoverSelect={(item) => setPicked(item.id)} onClearSelection={() => setPicked(undefined)}>
          {picked ? items.find((item) => item.id === picked)?.label : "Fruit"}
        </Chip>
      </div>
      <div style={{ position: "relative", height: 10 }}><Popover open id="search-pop" style={{ position: "static" }} search items={items} /></div>
      <div style={{ position: "relative" }}><PopoverManualAddNew open id="manual" style={{ position: "static" }} items={items} onCreate={setCreated} /></div>
      <output id="created">{created}</output>
      <SelectField id="fruit" label="Fruit" value={fruit} onChange={(event) => setFruit(event.target.value)} options={[{ label: "Apple", value: "a" }, { label: "Banana", value: "b" }, { label: "Durian", value: "d" }]} />
      <output id="fruit-value">{fruit}</output>
    </div>
  );
}

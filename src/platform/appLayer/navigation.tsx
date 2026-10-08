import { useState } from "react";
import { Button, IconButton } from "../../components/Button";
import { FileIcon } from "../../components/FileIcon";
import { Icon } from "../../components/Icon";
import { Box, Stack } from "../../components/Layout";
import { Link, type LinkTone, type LinkUnderline } from "../../components/Link";
import { Menu, type MenuEntry, type MenuItemData } from "../../components/Menu";
import { Text } from "../../components/Text";
import type { TypographyStyleName } from "../../tokens/typography.generated";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, keepOnHotUpdate, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./navigation.css";

const GITHUB_ACTIONS_DOCS = "https://docs.github.com/en/actions";

/* ───────────── Link: playground ───────────── */

const linkTextStyles: TypographyStyleName[] = ["Body/Base/Regular", "Body/Small/Regular", "Body/Extra/Regular", "Caption/Regular"];

function LinkPlayground() {
  const [underline, setUnderline] = useState<LinkUnderline>("hover");
  const [tone, setTone] = useState<LinkTone>("hyperlink");
  const [textStyle, setTextStyle] = useState<TypographyStyleName>("Body/Base/Regular");
  const [external, setExternal] = useState(false);
  const [visited, setVisited] = useState(false);
  const [opened, setOpened] = useState<string>();
  const label = external ? "the GitHub Actions docs" : "deploy settings";
  const props = [
    external ? `href="${GITHUB_ACTIONS_DOCS}"` : `href="/settings/deploys"`,
    external ? "external" : "",
    underline !== (tone === "inherit" ? "always" : "hover") ? `underline="${underline}"` : "",
    tone !== "hyperlink" ? `tone="${tone}"` : "",
    visited && tone === "hyperlink" ? "visited" : "",
  ].filter(Boolean).join(" ");
  return (
    <Panel
      title="Link"
      controls={<>
        <PlaygroundFilterChip label="Underline" value={underline} onChange={(value) => setUnderline((String(value) || "hover") as LinkUnderline)} options={[option("hover", "Hover (default)"), option("always", "Always"), option("none", "None")]} />
        <PlaygroundFilterChip label="Tone" value={tone} onChange={(value) => { const next = (String(value) || "hyperlink") as LinkTone; setTone(next); setUnderline(next === "inherit" ? "always" : "hover"); }} options={[option("hyperlink", "Hyperlink"), option("inherit", "Inherit")]} />
        <PlaygroundFilterChip label="Text style" value={textStyle} onChange={(value) => setTextStyle((String(value) || "Body/Base/Regular") as TypographyStyleName)} options={linkTextStyles.map((id) => option(id))} />
        <PlaygroundToggle label="External" selected={external} onChange={(on) => { setExternal(on); setOpened(undefined); }} />
        <PlaygroundToggle label="Visited" selected={visited} onChange={setVisited} />
      </>}
      code={`import { Link, Text } from "@zen/design-system";

<Text${textStyle === "Body/Base/Regular" ? "" : ` textStyle="${textStyle}"`} tone="base">
  Deploys run on every push to main. To change the branch, open{" "}
  <Link ${props}>${label}</Link>.
</Text>`}
    >
      <Stack gap="xs" className="pan-stage">
        <Text textStyle={textStyle} tone="base">
          Deploys run on every push to main. To change the branch, open{" "}
          {external
            ? <Link href={GITHUB_ACTIONS_DOCS} external underline={underline} tone={tone} visited={visited} onClick={() => setOpened(GITHUB_ACTIONS_DOCS)}>{label}</Link>
            : <Link href="/settings/deploys" underline={underline} tone={tone} visited={visited} onClick={(event) => { event.preventDefault(); setOpened("/settings/deploys"); }}>{label}</Link>}
          .
        </Text>
        <Text textStyle="Body/Small/Regular" tone="light" role="status">
          {opened ? (external ? `Opened ${opened} in a new tab.` : `Navigated to ${opened} (in-app).`) : ""}
        </Text>
      </Stack>
    </Panel>
  );
}

/* ───────────── Menu: playground ───────────── */

type PlaygroundItemKey = "rename" | "duplicate" | "move" | "download" | "share" | "delete";
const playgroundItems: Record<PlaygroundItemKey, { label: string; icon: MenuItemData["icon"] & string; shortcut: string }> = {
  rename: { label: "Rename", icon: "icon-edit-02-line", shortcut: "F2" },
  duplicate: { label: "Duplicate", icon: "icon-duplicate-line", shortcut: "⌘D" },
  move: { label: "Move to…", icon: "icon-folder-line", shortcut: "⇧⌘M" },
  download: { label: "Download", icon: "icon-download-01-line", shortcut: "⇧⌘S" },
  share: { label: "Share", icon: "icon-share-01-line", shortcut: "⇧⌘L" },
  delete: { label: "Delete", icon: "icon-trash-line", shortcut: "⌫" },
};

function MenuPlayground() {
  const [trigger, setTrigger] = useState("icon");
  const [align, setAlign] = useState<"start" | "end">("end");
  const [icons, setIcons] = useState(true);
  const [shortcuts, setShortcuts] = useState(false);
  const [groups, setGroups] = useState(false);
  const [danger, setDanger] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [last, setLast] = useState<string>();
  const item = (key: PlaygroundItemKey): MenuItemData => ({
    id: key,
    label: playgroundItems[key].label,
    ...(icons ? { icon: playgroundItems[key].icon } : {}),
    ...(shortcuts ? { shortcut: playgroundItems[key].shortcut } : {}),
    ...(key === "share" && disabled ? { disabled: true, caption: "Only owners can share" } : {}),
    ...(key === "delete" ? { danger: true } : {}),
  });
  const tail: MenuEntry[] = danger ? [{ type: "separator" }, item("delete")] : [];
  const entries: MenuEntry[] = groups
    ? [{ type: "group", label: "Edit", items: [item("rename"), item("duplicate"), item("move")] }, { type: "group", label: "Share", items: [item("download"), item("share")] }, ...tail]
    : [item("rename"), item("duplicate"), item("move"), { type: "separator" }, item("download"), item("share"), ...tail];
  const itemCode = (entry: MenuItemData) => `{ ${[`id: "${entry.id}"`, `label: "${entry.label}"`, entry.icon ? `icon: "${String(entry.icon)}"` : "", entry.shortcut ? `shortcut: "${entry.shortcut}"` : "", entry.caption ? `caption: "${String(entry.caption)}"` : "", entry.disabled ? "disabled: true" : "", entry.danger ? "danger: true" : ""].filter(Boolean).join(", ")} }`;
  const entryCode = (entry: MenuEntry, indent: string): string => entry.type === "separator" ? `${indent}{ type: "separator" },`
    : entry.type === "group" ? `${indent}{ type: "group", label: "${entry.label}", items: [\n${entry.items.map((child) => entryCode(child, `${indent}  `)).join("\n")}\n${indent}] },`
      : `${indent}${itemCode(entry)},`;
  const triggerCode = trigger === "icon"
    // zen-allow-no-action: the Menu trigger in the generated code; <Menu trigger> wires its click, keys and ARIA.
    ? `<IconButton appearance="flat" level="primary" aria-label="Actions for Q4 roadmap.pdf" icon={<Icon name="icon-dots-horizontal-line" />} />`
    : `<Button level="tertiary" size="sm" endIcon={<Icon name="icon-chevron-down-line" />}>Actions</Button>`;
  return (
    <Panel
      title="Menu"
      controls={<>
        <PlaygroundFilterChip label="Trigger" value={trigger} onChange={(value) => setTrigger(String(value) || "icon")} options={[option("icon", "Icon button"), option("button", "Button")]} />
        <PlaygroundFilterChip label="Align" value={align} onChange={(value) => setAlign((String(value) || "end") as "start" | "end")} options={[option("start", "Start"), option("end", "End")]} />
        <PlaygroundToggle label="Icons" selected={icons} onChange={setIcons} />
        <PlaygroundToggle label="Shortcuts" selected={shortcuts} onChange={setShortcuts} />
        <PlaygroundToggle label="Groups" selected={groups} onChange={setGroups} />
        <PlaygroundToggle label="Danger item" selected={danger} onChange={setDanger} />
        <PlaygroundToggle label="Disabled item" selected={disabled} onChange={setDisabled} />
      </>}
      code={`import { Button, Icon, IconButton, Menu } from "@zen/design-system";

<Menu${align === "end" ? ` align="end"` : ""}
  trigger={${triggerCode}}
  items={[
${entries.map((entry) => entryCode(entry, "    ")).join("\n")}
  ]}
  onSelect={(item) => run(item.id)}
/>`}
    >
      <Stack gap="xs" className="pan-file-row">
        <Box surface="surface" border="pale" radius="lg" padding="sm">
          <Stack direction="row" gap="sm" align="center">
            <FileIcon format="pdf" size={32} />
            <Stack gap="2xs" style={{ flex: 1, minWidth: 0 }}>
              <Text textStyle="Body/Base/Medium" truncate>Q4 roadmap.pdf</Text>
              <Text textStyle="Body/Small/Regular" tone="light">2.4 MB · Edited 2 hours ago</Text>
            </Stack>
            <Menu
              align={align}
              trigger={trigger === "icon"
                // zen-allow-no-action: a Menu trigger chosen by the playground; <Menu trigger> wires its click, keys and ARIA.
                ? <IconButton appearance="flat" level="primary" aria-label="Actions for Q4 roadmap.pdf" icon={<Icon name="icon-dots-horizontal-line" />} />
                : <Button level="tertiary" size="sm" endIcon={<Icon name="icon-chevron-down-line" />}>Actions</Button>}
              items={entries}
              onSelect={(chosen) => setLast(chosen.label)}
            />
          </Stack>
        </Box>
        <Text textStyle="Body/Small/Regular" tone="light" role="status">{last ? `Chose “${last}”.` : ""}</Text>
      </Stack>
    </Panel>
  );
}

/* ───────────── Pages ───────────── */

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = keepOnHotUpdate(import.meta.hot, "pages", {
  link: {
    label: "Link",
    eyebrow: "Components / Link",
    title: "Link",
    description: "An inline link in the Content/Hyperlink colours. It takes the font of the text around it, opens other sites in a new tab and says so (external), and renders your router's link with as.",
    playground: LinkPlayground,
  },
  menu: {
    label: "Menu",
    eyebrow: "Components / Menu",
    title: "Menu",
    description: "An action menu: a button opens a list of actions on the Popover surface. It follows the WAI-ARIA menu button pattern and floats above tables and cards that clip their overflow. To pick a value, use Select Field or a Chip instead.",
    playground: MenuPlayground,
  },
});

// The examples of these pages live in src/platform/examples/pages/<page>.tsx (examples/registry.ts).
export const examples: ExampleMap = {};

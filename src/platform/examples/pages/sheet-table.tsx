/* Sheet Table examples (Figma Table/Sheet, doc frame 17100:7996). The Zen docs themselves, read by Alex Duong on
   Wednesday Sep 30, 2026: each example is a reference whose rows run long — a props reference with long type unions, the
   keyboard shortcuts of a selectable card, the colour tokens of a theme, the same shortcuts on a phone, and a component
   with no props of its own yet. Every line is read in full; nothing ends in an ellipsis. */
import { useId } from "react";
import { Box, Stack } from "../../../components/Layout";
import { SheetCode, SheetKeys, SheetTable } from "../../../components/SheetTable";
import { TableText } from "../../../components/Table";
import { Heading, Text } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "sheet-table";

type Prop = { name: string; type: string; fallback: string | null; description: string };
const cardProps: Prop[] = [
  { name: "theme", type: '"shadow" | "default" | "pale" | "border" | "flat-border" | "on-container" | "solid" | "subtle"', fallback: '"shadow"', description: "Figma Theme, picked by where the card sits: Default on Canvas/Default, Shadow beside a shadowed Sidebar, Border on a white page, Flat-Border on Canvas/Flat; colour Subtle on Canvas/Default, Pale on a white page; Solid for the one widget that stands out." },
  { name: "color", type: '"neutral" | "brand" | "cyan" | "violet" | "green" | "yellow" | "orange" | "blue" | "purple" | "accent"', fallback: '"neutral"', description: "Figma Color, for theme=\"pale\", \"subtle\" and \"solid\"; the other themes ignore it." },
  { name: "surface?", type: '"default" | "alt"', fallback: null, description: "Figma Surface on Default and Border: alt on a white Canvas/Alt page, where Surface/Default is the canvas itself." },
  { name: "onClick?", type: "(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void", fallback: null, description: "Makes the whole card one action (role=button, Enter and Space). Keep other controls out of a clickable card." },
];

type Shortcut = { keys: string; action: string };
const cardKeys: Shortcut[] = [
  { keys: "Tab / Shift + Tab", action: "Moves focus to the next or the previous card that is one action." },
  { keys: "Enter / Space", action: "Activates the focused card, as a click does." },
  { keys: "→ / ←", action: "Moves between the options of a group of selectable cards; the focused option is selected." },
  { keys: "Esc", action: "Closes the card's More menu and returns focus to its button." },
];

type Token = { name: string; light: string; dark: string; use: string };
const tokens: Token[] = [
  { name: "--zen-color-background-canvas-default", light: "#f7f7f7", dark: "#121212", use: "The page itself on most screens. Boxes on it are Default, Shadow or Border; colour on a box is Subtle." },
  { name: "--zen-color-background-canvas-alt", light: "#ffffff", dark: "#1c1c1c", use: "A white page. Its boxes are Border, Pale, or Default on Surface/Alt, and nothing on it casts a shadow." },
  { name: "--zen-color-background-surface-alt", light: "#f7f7f7", dark: "#121212", use: "A box or a bar on a white page; the same colour as Canvas/Default in both modes, so it vanishes on the grey page." },
];

function PropsReference() {
  const titleId = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={titleId}>
      <Heading level={2} id={titleId} textStyle="Heading/4">Card props</Heading>
      {/* Four columns of code: narrower than 680px, the sheet scrolls sideways instead of breaking every word. */}
      <SheetTable aria-labelledby={titleId} rows={cardProps} getRowId={(row) => row.name} minWidth="680px"
        columns={[
          { id: "prop", header: "Prop", width: "18%", cell: (row) => <SheetCode>{row.name}</SheetCode> },
          { id: "type", header: "Type", width: "34%", cell: (row) => <SheetCode>{row.type}</SheetCode> },
          { id: "default", header: "Default", width: "12%", cell: (row) => (row.fallback ? <SheetCode>{row.fallback}</SheetCode> : <TableText>—</TableText>) },
          { id: "description", header: "Description", cell: (row) => <TableText>{row.description}</TableText> },
        ]} />
    </Stack>
  );
}

function KeyboardReference() {
  const titleId = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={titleId}>
      <Heading level={2} id={titleId} textStyle="Heading/4">Keyboard</Heading>
      <SheetTable aria-labelledby={titleId} rows={cardKeys} getRowId={(row) => row.keys}
        columns={[
          { id: "keys", header: "Key", width: "32%", cell: (row) => <SheetKeys value={row.keys} /> },
          { id: "action", header: "Action", cell: (row) => <TableText>{row.action}</TableText> },
        ]} />
    </Stack>
  );
}

function TokenReference() {
  return (
    <SheetTable caption="Canvas and surface colours" rows={tokens} getRowId={(row) => row.name} minWidth="640px"
      columns={[
        { id: "name", header: "Token", width: "34%", cell: (row) => <SheetCode>{row.name}</SheetCode> },
        { id: "light", header: "Light", width: "96px", cell: (row) => <SheetCode>{row.light}</SheetCode> },
        { id: "dark", header: "Dark", width: "96px", cell: (row) => <SheetCode>{row.dark}</SheetCode> },
        { id: "use", header: "When to use", cell: (row) => <TableText>{row.use}</TableText> },
      ]} />
  );
}

function PhoneShortcuts() {
  const titleId = useId();
  return (
    <PlatformPhone label="Card shortcuts" header={<TopNavigation type="alt" title="Card" />}>
      <Box paddingX="lg" paddingY="xs">
        <Stack as="section" gap="xs" aria-labelledby={titleId}>
          <Heading level={2} id={titleId} textStyle="Heading/Subheading">Keyboard</Heading>
          {/* Two columns fit a phone: no minWidth, the actions wrap under their keys' row height. */}
          <SheetTable aria-labelledby={titleId} rows={cardKeys} getRowId={(row) => row.keys}
            columns={[
              { id: "keys", header: "Key", width: "42%", cell: (row) => <SheetKeys value={row.keys} /> },
              { id: "action", header: "Action", cell: (row) => <TableText>{row.action}</TableText> },
            ]} />
        </Stack>
      </Box>
    </PlatformPhone>
  );
}

function NoProps() {
  const titleId = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={titleId}>
      <Heading level={2} id={titleId} textStyle="Heading/4">VisuallyHidden props</Heading>
      <SheetTable aria-labelledby={titleId} rows={[] as Prop[]} getRowId={(row) => row.name}
        empty={<Text textStyle="Body/Base/Regular" tone="base">VisuallyHidden has no props of its own: it takes its children and the attributes of a span.</Text>}
        columns={[
          { id: "prop", header: "Prop", width: "18%", cell: (row) => <SheetCode>{row.name}</SheetCode> },
          { id: "description", header: "Description", cell: (row) => <TableText>{row.description}</TableText> },
        ]} />
    </Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Props reference",
    wide: true,
    description: "A component's props, each with its type, its default and what it does. Long type unions and descriptions wrap and the row grows with them: a Table would cut them with an ellipsis. The sheet is named by its section heading, and below 680px it scrolls sideways instead of breaking every word.",
    render: () => <PropsReference />,
    code: `<Stack as="section" gap="md" aria-labelledby="card-props">
  <Heading level={2} id="card-props" textStyle="Heading/4">Card props</Heading>
  <SheetTable aria-labelledby="card-props" rows={props} getRowId={(row) => row.name} minWidth="680px"
    columns={[
      { id: "prop", header: "Prop", width: "18%", cell: (row) => <SheetCode>{row.name}</SheetCode> },
      { id: "type", header: "Type", width: "34%", cell: (row) => <SheetCode>{row.type}</SheetCode> },
      { id: "default", header: "Default", width: "12%", cell: (row) => (row.fallback ? <SheetCode>{row.fallback}</SheetCode> : <TableText>—</TableText>) },
      { id: "description", header: "Description", cell: (row) => <TableText>{row.description}</TableText> },
    ]} />
</Stack>`,
  },
  {
    title: "Keyboard shortcuts",
    description: "The keys a component answers to, written as text (\"Tab / Shift + Tab\") and drawn by SheetKeys as key chips: + joins keys pressed together, / separates alternatives. Screen readers read each kbd and the separators between them.",
    render: () => <KeyboardReference />,
    code: `<SheetTable aria-labelledby="keyboard" rows={shortcuts} getRowId={(row) => row.keys}
  columns={[
    { id: "keys", header: "Key", width: "32%", cell: (row) => <SheetKeys value={row.keys} /> },
    { id: "action", header: "Action", cell: (row) => <TableText>{row.action}</TableText> },
  ]} />`,
  },
  {
    title: "Token reference",
    wide: true,
    description: "Long token names and their values are code; when to use each one is a sentence or two. A visible caption names the sheet (Heading/4), so it needs no aria-label.",
    render: () => <TokenReference />,
    code: `<SheetTable caption="Canvas and surface colours" rows={tokens} getRowId={(row) => row.name} minWidth="640px"
  columns={[
    { id: "name", header: "Token", width: "34%", cell: (row) => <SheetCode>{row.name}</SheetCode> },
    { id: "light", header: "Light", width: "96px", cell: (row) => <SheetCode>{row.light}</SheetCode> },
    { id: "dark", header: "Dark", width: "96px", cell: (row) => <SheetCode>{row.dark}</SheetCode> },
    { id: "use", header: "When to use", cell: (row) => <TableText>{row.use}</TableText> },
  ]} />`,
  },
  {
    title: "Shortcuts on a phone",
    description: "Two columns fit a phone without a minWidth: the keys keep their chips together and each action wraps onto as many lines as it needs, the row growing to match. The sheet sits on the page at the page margin, no box around it.",
    render: () => <PhoneShortcuts />,
    code: `<Box paddingX="lg" paddingY="xs">
  <Stack as="section" gap="xs" aria-labelledby="keyboard">
    <Heading level={2} id="keyboard" textStyle="Heading/Subheading">Keyboard</Heading>
    <SheetTable aria-labelledby="keyboard" rows={shortcuts} getRowId={(row) => row.keys}
      columns={[
        { id: "keys", header: "Key", width: "42%", cell: (row) => <SheetKeys value={row.keys} /> },
        { id: "action", header: "Action", cell: (row) => <TableText>{row.action}</TableText> },
      ]} />
  </Stack>
</Box>`,
  },
  {
    title: "No props of its own",
    description: "An empty reference keeps its header and says why there are no rows, in one full-width row, instead of an empty sheet or a missing section.",
    render: () => <NoProps />,
    code: `<SheetTable aria-labelledby="hidden-props" rows={[]}
  empty={<Text textStyle="Body/Base/Regular" tone="base">VisuallyHidden has no props of its own: it takes its children and the attributes of a span.</Text>}
  columns={[
    { id: "prop", header: "Prop", width: "18%", cell: (row) => <SheetCode>{row.name}</SheetCode> },
    { id: "description", header: "Description", cell: (row) => <TableText>{row.description}</TableText> },
  ]} />`,
  },
]);

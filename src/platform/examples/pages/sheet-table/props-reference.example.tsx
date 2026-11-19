import { useId } from "react";
import { Heading, SheetCode, SheetTable, Stack, TableText } from "@zen-ds/react";

/* Card's props, each with its type, its default and what it does. */
type Prop = { name: string; type: string; fallback: string | null; description: string };
const cardProps: Prop[] = [
  { name: "theme", type: '"shadow" | "default" | "pale" | "border" | "flat-border" | "on-container" | "solid" | "subtle"', fallback: '"shadow"', description: "Figma Theme, picked by where the card sits: Default on Canvas/Default, Shadow beside a shadowed Sidebar, Border on a white page, Flat-Border on Canvas/Flat; colour Subtle on Canvas/Default, Pale on a white page; Solid for the one widget that stands out." },
  { name: "color", type: '"neutral" | "brand" | "cyan" | "violet" | "green" | "yellow" | "orange" | "blue" | "purple" | "accent"', fallback: '"neutral"', description: "Figma Color, for theme=\"pale\", \"subtle\" and \"solid\"; the other themes ignore it." },
  { name: "surface?", type: '"default" | "alt"', fallback: null, description: "Figma Surface on Default and Border: alt on a white Canvas/Alt page, where Surface/Default is the canvas itself." },
  { name: "onClick?", type: "(event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void", fallback: null, description: "Makes the whole card one action (role=button, Enter and Space). Keep other controls out of a clickable card." },
];

export default function PropsReference() {
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

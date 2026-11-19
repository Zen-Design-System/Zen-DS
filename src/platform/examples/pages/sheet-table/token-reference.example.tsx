import { SheetCode, SheetTable, TableText } from "@zen-ds/react";

/* The colour tokens of a theme: long names and values are code, when to use each one is a sentence or two. */
type Token = { name: string; light: string; dark: string; use: string };
const tokens: Token[] = [
  { name: "--zen-color-background-canvas-default", light: "#f7f7f7", dark: "#121212", use: "The page itself on most screens. Boxes on it are Default, Shadow or Border; colour on a box is Subtle." },
  { name: "--zen-color-background-canvas-alt", light: "#ffffff", dark: "#1c1c1c", use: "A white page. Its boxes are Border, Pale, or Default on Surface/Alt, and nothing on it casts a shadow." },
  { name: "--zen-color-background-surface-alt", light: "#f7f7f7", dark: "#121212", use: "A box or a bar on a white page; the same colour as Canvas/Default in both modes, so it vanishes on the grey page." },
];

export default function TokenReference() {
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

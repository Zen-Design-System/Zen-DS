import { useId } from "react";
import { Heading, SheetKeys, SheetTable, Stack, TableText } from "@zen-ds/react";

/* The keys a selectable card answers to. */
type Shortcut = { keys: string; action: string };
const cardKeys: Shortcut[] = [
  { keys: "Tab / Shift + Tab", action: "Moves focus to the next or the previous card that is one action." },
  { keys: "Enter / Space", action: "Activates the focused card, as a click does." },
  { keys: "→ / ←", action: "Moves between the options of a group of selectable cards; the focused option is selected." },
  { keys: "Esc", action: "Closes the card's More menu and returns focus to its button." },
];

export default function KeyboardReference() {
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

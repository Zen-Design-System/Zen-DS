import { useId, type RefObject } from "react";
import { AppShell, Heading, SheetKeys, SheetTable, Stack, TableText, TopNavigation } from "@zen-ds/react";

/* The keys a selectable card answers to, on a phone. */
type Shortcut = { keys: string; action: string };
const cardKeys: Shortcut[] = [
  { keys: "Tab / Shift + Tab", action: "Moves focus to the next or the previous card that is one action." },
  { keys: "Enter / Space", action: "Activates the focused card, as a click does." },
  { keys: "→ / ←", action: "Moves between the options of a group of selectable cards; the focused option is selected." },
  { keys: "Esc", action: "Closes the card's More menu and returns focus to its button." },
];

// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function PhoneShortcuts({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const titleId = useId();
  return (
    // The sheet sits on the page at the margin the Body pads, no box around it.
    <AppShell topNavigation={<TopNavigation type="alt" title="Card" scrollRef={scrollRef} />}>
      <Stack as="section" gap="xs" aria-labelledby={titleId}>
        <Heading level={2} id={titleId} textStyle="Heading/Subheading">Keyboard</Heading>
        {/* Two columns fit a phone: no minWidth, the actions wrap under their keys' row height. */}
        <SheetTable aria-labelledby={titleId} rows={cardKeys} getRowId={(row) => row.keys}
          columns={[
            { id: "keys", header: "Key", width: "42%", cell: (row) => <SheetKeys value={row.keys} /> },
            { id: "action", header: "Action", cell: (row) => <TableText>{row.action}</TableText> },
          ]} />
      </Stack>
    </AppShell>
  );
}

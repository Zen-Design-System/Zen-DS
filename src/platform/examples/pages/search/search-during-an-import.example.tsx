import { useId, useRef, useState, type CSSProperties } from "react";
import { Avatar, Box, Button, EmptyState, Heading, InlineMessage, List, ListBox, ListItem, ProgressBar, Search, Stack, Text, plural, useToast, type AvatarTheme } from "@zen-ds/react";
import { initials } from "../../data";

/** True when the query is empty or any field contains it (case-insensitive). */
const matches = (query: string, ...fields: string[]) => {
  const q = query.trim().toLowerCase();
  return !q || fields.some((field) => field.toLowerCase().includes(q));
};

type Contact = { id: string; name: string; role: string; company: string; theme: Exclude<AvatarTheme, "photo" | "accent"> };
const savedContacts: Contact[] = [
  { id: "c1", name: "Tran Minh Thu", role: "Head of Marketing", company: "Phin & Co", theme: "pink" },
  { id: "c2", name: "Nguyen Hoang Long", role: "Product Owner", company: "Lumen Bank", theme: "blue" },
  { id: "c3", name: "Vu Thanh Mai", role: "Programme Lead", company: "Hanoi Book Fair", theme: "purple" },
  { id: "c4", name: "Le Thi Hoa", role: "Operations Director", company: "Mekong Freight", theme: "violet" },
];
const incomingContacts: Contact[] = [
  { id: "m1", name: "Do Van Hung", role: "Customs Manager", company: "Mekong Freight", theme: "indigo" },
  { id: "m2", name: "Hoang Thi Lan", role: "Logistics Analyst", company: "Mekong Freight", theme: "plum" },
  { id: "m3", name: "Bui Minh Quan", role: "IT Manager", company: "Mekong Freight", theme: "brown" },
  { id: "m4", name: "Ngo Thanh Truc", role: "Customer Service Lead", company: "Mekong Freight", theme: "crimson" },
  { id: "m5", name: "Dang Quoc Viet", role: "Warehouse Supervisor", company: "Mekong Freight", theme: "blue" },
  { id: "m6", name: "Ly Ngoc Anh", role: "Finance Controller", company: "Mekong Freight", theme: "red" },
];
/** A long result list scrolls inside its ListBox: five whole rows, framed by Pale rules that run to the box edge (the
 *  scroller spans the body's side padding and pads it back); the bottom rule clears the box's rounded corners. */
const resultsScroller: CSSProperties = {
  boxSizing: "content-box",
  maxHeight: "calc(5 * (var(--zen-image-size-medium, 40px) + 2 * var(--zen-spacing-padding-small, 12px)) + 4 * var(--zen-spacing-gap-3-xsmall, 2px))",
  marginInline: "calc(-1 * var(--zen-card-padding-medium, 24px))",
  marginBlockEnd: "calc(var(--zen-corner-radius-2-xlarge, 24px) - var(--zen-list-container-vertical-padding, 12px))",
  paddingInline: "var(--zen-card-padding-medium, 24px)",
  borderBlock: "1px solid var(--zen-color-border-neutral-pale-default)",
};

/** Search is disabled only while the import runs: results would be incomplete. Import contacts starts it again. */
export default function ContactImport() {
  const { toast } = useToast();
  const headingId = useId();
  const [imported, setImported] = useState(incomingContacts.length);
  const [importing, setImporting] = useState(false);
  const [query, setQuery] = useState("");
  /** The import's next step, so Cancel import can stop it. */
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout>>();
  // Cancel import and Import contacts each remove their own button: focus moves to the search (enabled again) or to the
  // import message, not to the page.
  const searchRef = useRef<HTMLInputElement>(null);
  const importingRef = useRef<HTMLSpanElement>(null);
  // One contact arrives every 1.5 seconds; when the last one is in, search comes back and a toast confirms.
  const arrive = (count: number) => {
    setTimer(setTimeout(() => {
      const next = count + 1;
      setImported(next);
      if (next < incomingContacts.length) { arrive(next); return; }
      setImporting(false);
      setTimer(undefined);
      toast({ type: "positive", title: "Contacts imported", children: `${plural(incomingContacts.length, "contact")} from Mekong Freight` });
    }, 1500));
  };
  const cancel = () => {
    clearTimeout(timer);
    setTimer(undefined);
    setImporting(false);
    toast({ title: "Import cancelled", children: imported ? `${plural(imported, "contact")} kept` : undefined });
    setTimeout(() => searchRef.current?.focus());
  };
  const restart = () => {
    setQuery("");
    setImported(0);
    setImporting(true);
    arrive(0);
    setTimeout(() => importingRef.current?.focus());
  };
  const contacts = [...incomingContacts.slice(0, imported).reverse(), ...savedContacts];
  const rows = contacts.filter((contact) => matches(query, contact.name, contact.role, contact.company));
  return (
    // A ListBox: the title and Import contacts, the search, the import status and the count in its Header-Slot; the
    // contacts (or the Empty State) in its Body-Slot.
    <Stack><ListBox as="section" aria-labelledby={headingId} width="fill" maxWidth={440} alignSelf="center"
      header={<>
        <Stack direction="row" gap="sm" align="center" justify="between">
          <Heading level={4} id={headingId} textStyle="Heading/Subheading">Client contacts</Heading>
          {importing ? null : <Button level="tertiary" onClick={restart}>Import contacts</Button>}
        </Stack>
        <Search ref={searchRef} placeholder="Search contacts" value={query} onValueChange={setQuery} disabled={importing} />
        {importing ? (
          <Stack gap="sm">
            {/* The reason sits right under the disabled field. */}
            <InlineMessage theme="info" title={<span ref={importingRef} tabIndex={-1}>Importing from Mekong Freight</span>} action={{ label: "Cancel import", onClick: cancel }}>
              Search is available when the import finishes.
            </InlineMessage>
            <ProgressBar value={Math.round((imported / incomingContacts.length) * 100)} label={`${imported} of ${plural(incomingContacts.length, "contact")}`} aria-label="Import progress" />
          </Stack>
        ) : null}
        <Text role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "contact")}</Text>
      </>}>
      {rows.length ? (
        <Box scroll="y" style={resultsScroller} role="region" aria-label="Contacts" tabIndex={0}>
          <List aria-label="Contacts">
            {rows.map((contact) => (
              <ListItem key={contact.id} title={contact.name} caption={`${contact.role} · ${contact.company}`}
                leading={<Avatar size="md" theme={contact.theme} alt="">{initials(contact.name)}</Avatar>} />
            ))}
          </List>
        </Box>
      ) : (
        <EmptyState size="sm" headingLevel={5} icon="icon-search-medium-line" title={`No contacts match “${query.trim()}”`}
          secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
          Search by name, role or company.
        </EmptyState>
      )}
    </ListBox></Stack>
  );
}

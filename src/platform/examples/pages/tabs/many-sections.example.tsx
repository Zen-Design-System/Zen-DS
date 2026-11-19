import { useId, useState, type ReactNode } from "react";
import {
  Avatar, Badge, Card, DescriptionList, DockIcon, FileIcon, Heading, List, ListItem, Stack, TabPanel, Tabs, Text, fileIconFormatOf,
  type IconName,
} from "@zen-ds/react";
import {
  daysFromToday, files, formatBytes, formatDate, formatMoney, formatRelative, initials, invoiceStatusTheme, people, projectById,
  type InvoiceStatus, type StudioFile,
} from "../../data";

const lumen = projectById("lumen-banking");
const lumenFiles: StudioFile[] = [
  { id: "lf1", name: "Lumen Bank SOW v3.pdf", bytes: 412_000, owner: "hana", project: lumen.id, updated: daysFromToday(0, 9, 12) },
  files.find((f) => f.id === "f2")!,
];
const lumenInvoices = [
  { id: "li1", number: "INV-2026-0141", amount: 40500, status: "Paid" as InvoiceStatus, paid: daysFromToday(-8) },
  { id: "li2", number: "INV-2026-0127", amount: 38000, status: "Paid" as InvoiceStatus, paid: daysFromToday(-54) },
];
const lumenContacts = [
  { id: "c1", name: "Thu Nguyen", role: "Head of Digital", theme: "blue" as const },
  { id: "c2", name: "Kenji Mori", role: "Product Owner, Payments", theme: "teal" as const },
];
const lumenNotes = [
  { id: "n1", title: "Wants passkeys in the first release", caption: `${people.hana.name} · ${formatRelative(daysFromToday(-2, 15, 30))}` },
  { id: "n2", title: "Budget review moved to November", caption: `${people.hana.name} · ${formatRelative(daysFromToday(-9, 10, 0))}` },
];

export default function ClientSections() {
  // One idPrefix per rendered example, so tab and panel ids stay unique when the page shows it twice.
  const prefix = `client-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [tab, setTab] = useState("overview");
  const panel = (id: string, content: ReactNode) => <TabPanel idPrefix={prefix} id={id} hidden={tab !== id}>{content}</TabPanel>;
  const icon = (name: IconName) => <DockIcon icon={name} theme="neutral" background="subtle" size="medium" />;

  return (
    <Stack><Card theme="default" width="fill" maxWidth={340} alignSelf="center">
      <Stack gap="md">
        <Stack direction="row" gap="sm" align="center">
          <Avatar size="medium" shape="square" theme="blue" alt="">LB</Avatar>
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">Lumen Bank</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`Client since Mar 2024 · ${people.hana.name}`}</Text>
          </Stack>
        </Stack>
        {/* Six sections in a 360px column: the bar scrolls sideways; labels never shrink or abbreviate. */}
        <Tabs idPrefix={prefix} aria-label="Client sections" value={tab} onValueChange={setTab} items={[
          { id: "overview", label: "Overview" },
          { id: "projects", label: "Projects" },
          { id: "invoices", label: "Invoices" },
          { id: "contacts", label: "Contacts" },
          { id: "files", label: "Files" },
          { id: "notes", label: "Notes" },
        ]} />
        {panel("overview", <DescriptionList items={[
          { term: "Account director", description: people.hana.name },
          { term: "Active projects", description: "1" },
          { term: "Billed in 2026", description: formatMoney(78500, true) },
        ]} />)}
        {panel("projects", <List aria-label="Projects"><ListItem title={lumen.name} caption={`Due ${formatDate(lumen.due)}`} leading={<DockIcon icon={lumen.icon} theme={lumen.theme} background="subtle" size="medium" />} /></List>)}
        {panel("invoices", <List aria-label="Invoices">{lumenInvoices.map((i) => <ListItem key={i.id} title={i.number} caption={`${formatMoney(i.amount, true)} · Paid ${formatDate(i.paid)}`} leading={icon("icon-receipt-line")} trailing={<Badge theme={invoiceStatusTheme[i.status]} background="subtle">{i.status}</Badge>} />)}</List>)}
        {panel("contacts", <List aria-label="Contacts">{lumenContacts.map((c) => <ListItem key={c.id} title={c.name} caption={c.role} leading={<Avatar size="medium" theme={c.theme} alt="">{initials(c.name)}</Avatar>} />)}</List>)}
        {panel("files", <List aria-label="Files">{lumenFiles.map((f) => <ListItem key={f.id} title={f.name} caption={formatBytes(f.bytes)} leading={<FileIcon format={fileIconFormatOf(f.name)} size="xl" />} />)}</List>)}
        {panel("notes", <List aria-label="Notes">{lumenNotes.map((n) => <ListItem key={n.id} title={n.title} caption={n.caption} leading={icon("icon-file-doc-line")} />)}</List>)}
      </Stack>
    </Card></Stack>
  );
}

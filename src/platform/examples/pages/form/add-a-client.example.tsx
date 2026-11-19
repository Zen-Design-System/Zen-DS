import { useId, useRef, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Box, Breadcrumbs, Button, Card, Dialog, EmptyState, Form, FormActions, FormFieldset, Grid, Heading, InputField,
  Menu, PageHeader, RadioButton, Search, SelectField, Sidebar, SidebarMenuItem, Stack, Table, TableText, Text, Thumbnail, plural, useFormState, useToast,
  type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import { activity, formatRelative, me, people, studio } from "../../data";

/** A network round trip in the demo. */
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Terms = "net15" | "net30" | "net45";
const termsOptions: { value: Terms; label: string }[] = [{ value: "net15", label: "Net 15" }, { value: "net30", label: "Net 30" }, { value: "net45", label: "Net 45" }];
const countryOptions = [
  { value: "Vietnam", label: "Vietnam" }, { value: "Singapore", label: "Singapore" }, { value: "Thailand", label: "Thailand" },
  { value: "Australia", label: "Australia" }, { value: "United States", label: "United States" },
];
type ClientValues = { name: string; taxId: string; website: string; country: string; contact: string; email: string; terms: Terms };
type Client = ClientValues & { id: string };
const studioClients: Client[] = [
  { id: "phin", name: "Phin & Co", taxId: "0316482915", website: "phinco.vn", country: "Vietnam", contact: "Trang Le", email: "trang.le@phinco.vn", terms: "net30" },
  { id: "lumen", name: "Lumen Bank", taxId: "", website: "lumenbank.sg", country: "Singapore", contact: "Daniel Tan", email: "ap@lumenbank.sg", terms: "net45" },
  { id: "mekong", name: "Mekong Freight", taxId: "0309571442", website: "mekongfreight.vn", country: "Vietnam", contact: "Huy Dang", email: "huy.dang@mekongfreight.vn", terms: "net30" },
  { id: "bookfair", name: "Hanoi Book Fair", taxId: "0108836104", website: "", country: "Vietnam", contact: "Lan Nguyen", email: "lan@hanoibookfair.vn", terms: "net15" },
  { id: "saola", name: "Saola Outdoor", taxId: "0317204588", website: "saolaoutdoor.vn", country: "Vietnam", contact: "Mia Tran", email: "finance@saolaoutdoor.vn", terms: "net30" },
];
const blankClient: ClientValues = { name: "", taxId: "", website: "", country: "Vietnam", contact: "", email: "", terms: "net30" };
const termsLabel = (terms: Terms) => termsOptions.find((option) => option.value === terms)!.label;

const clientColumns: TableColumn<Client>[] = [
  { id: "name", header: "Client", cell: (client) => <TableText bold caption={client.website || client.country}>{client.name}</TableText> },
  { id: "contact", header: "Billing contact", width: "280px", cell: (client) => <TableText caption={client.email}>{client.contact}</TableText> },
  { id: "country", header: "Country", width: "160px", cell: (client) => <TableText>{client.country}</TableText> },
  { id: "terms", header: "Payment terms", width: "150px", cell: (client) => <TableText>{termsLabel(client.terms)}</TableText> },
];

// ——— The studio app's chrome ——————————————————————————————————————————————————————————————————————————
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];
const unreadActivity = activity.filter((item) => item.unread);

/** The studio's Sidebar on the page it shows; the other places toast that they are not drawn here. */
function StudioSidebar({ selectedId }: { selectedId: string }) {
  const { toast } = useToast();
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the form." });
  return (
    <Sidebar
      logo={(
        <Stack direction="row" gap="xs" align="center">
          <Thumbnail src={studio.logo} alt="" size="2xs" />
          <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
        </Stack>
      )}
      logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
      sections={studioPlaces} selectedId={selectedId} onItemClick={(item) => { if (item.id !== selectedId) notHere(item.label); }}
      footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
  );
}

/** The top row's utilities: notifications (the unread count clears once read) and the account menu, last. */
function StudioActions() {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const latest = unreadActivity[0];
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
        setUnread(0);
        toast({ title: unread ? plural(unread, "new notification") : "You're all caught up", children: `${people[latest.actor].name} ${latest.verb} ${latest.object} · ${formatRelative(latest.at)}` });
      }} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
        { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "Settings", children: "Workspace, notifications and billing." }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
      ]} />
    </>
  );
}

/** A group of the form: its title and what it is for on the left, its fields on a Shadow card on the right (one column
 *  on a narrow window). */
function FormGroup({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <Grid as="section" aria-labelledby={id} columns={{ mobile: 1, tablet: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} rowGap="md" columnGap="xl" align="start">
      <Stack gap="2xs">
        <Heading level={2} id={id} textStyle="Heading/4">{title}</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{description}</Text>
      </Stack>
      <Card theme="shadow"><Stack gap="md">{children}</Stack></Card>
    </Grid>
  );
}

export default function NewClient() {
  const { toast } = useToast();
  const [clients, setClients] = useState(studioClients);
  const [screen, setScreen] = useState<"new" | "list">("new");
  const [query, setQuery] = useState("");
  const [confirming, setConfirming] = useState(false);
  const companyId = useId();
  const billingId = useId();
  // Each screen change puts focus where the next step starts: the first field, or New client on the list.
  const nameRef = useRef<HTMLInputElement>(null);
  const newButton = useRef<HTMLButtonElement>(null);
  const show = (next: "new" | "list") => {
    setScreen(next);
    setTimeout(() => (next === "list" ? newButton : nameRef).current?.focus());
  };
  const form = useFormState<ClientValues>({
    initialValues: blankClient,
    // Each message names the fix. Errors show when a field is left with a bad value, and all of them on submit.
    validate: (values) => {
      const name = values.name.trim();
      const site = values.website.trim().replace(/^https?:\/\//, "");
      return {
        name: !name ? "Enter the company name"
          : clients.some((client) => client.name.toLowerCase() === name.toLowerCase()) ? `${name} is already a client` : undefined,
        website: site && !/^([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(site) ? "Enter a web address, like company.vn" : undefined,
        contact: values.contact.trim() ? undefined : "Enter who receives the invoices",
        email: !values.email.trim() ? "Enter the billing email" : emailPattern.test(values.email.trim()) ? undefined : "Enter an email like finance@company.com",
      };
    },
    onSubmit: async (values, { reset }) => {
      await wait(800);
      setClients((list) => [{ ...values, id: `new-${list.length}`, name: values.name.trim(), website: values.website.trim().replace(/^https?:\/\//, ""), email: values.email.trim() }, ...list]);
      reset();
      show("list");
      toast({ type: "positive", title: "Client added" });
    },
  });
  // Cancel asks only when something was typed.
  const cancel = () => (form.isDirty ? setConfirming(true) : show("list"));
  const discard = () => { setConfirming(false); form.reset(); show("list"); };

  const q = query.trim().toLowerCase();
  const shown = clients.filter((client) => !q || `${client.name} ${client.contact} ${client.email} ${client.country}`.toLowerCase().includes(q));
  const list = screen === "list";

  return (
    // A page of the studio app: one AppShell (pattern sidebar) with the studio's Sidebar on Clients. The header's top row
    // holds the trail (or the list's Search) and the utilities; the page's title and its one Primary sit in the Main row.
    // The Body pads the page, so neither screen needs a Container for the margins.
    <AppShell
      sidebar={<StudioSidebar selectedId="clients" />}
      header={(
        <AppShellHeader
          // The list: a Search narrows the clients. New client: the trail, Clients first (it cancels, as Cancel does).
          leading={list ? (
            <Box width={320}><Search placeholder="Search clients" aria-label="Search clients" value={query} onValueChange={setQuery} clearable /></Box>
          ) : (
            <Breadcrumbs master={false} items={[{ id: "clients", label: "Clients" }, { id: "new", label: "New client" }]}
              onNavigate={(item, event) => { event.preventDefault(); if (item.id === "clients") cancel(); }} />
          )}
          actions={<StudioActions />}
          main={list ? (
            <PageHeader title="Clients" description={`${plural(clients.length, "company", "companies")} the studio invoices.`}
              actions={<Button ref={newButton} level="primary" startIcon="icon-plus-line" onClick={() => show("new")}>New client</Button>} />
          ) : (
            <PageHeader title="New client" description="Invoices go to the billing contact. You can change these details later." />
          )}
        />
      )}
    >
      {list ? (
        // The table is the page's content: it lies on the page, no Card.
        shown.length ? <Table aria-label="Clients" columns={clientColumns} rows={shown} /> : (
          <EmptyState headingLevel={2} icon="icon-search-medium-line" title="No clients match" secondaryAction={{ label: "Clear search", onClick: () => setQuery("") }}>
            No company, contact or email has “{query.trim()}” in it.
          </EmptyState>
        )
      ) : (
        // Two groups, each its title and why it matters beside its fields on a Shadow card (the Sidebar's elevation).
        // Fields inside a group are md apart. Enter in any field submits.
        <Form form={form} gap="xl">
          <FormGroup id={companyId} title="Company" description="The client as it appears on invoices and contracts.">
            <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
              <InputField ref={nameRef} label="Company name" autoComplete="organization" {...form.field("name")} />
              <SelectField label="Country" options={countryOptions} {...form.selectField("country")} />
              <InputField label="Website" labelOptional inputMode="url" placeholder="company.vn" {...form.field("website")} />
              <InputField label="Tax ID" labelOptional inputMode="numeric" helpText="Printed on every invoice" {...form.field("taxId")} />
            </Grid>
          </FormGroup>
          <FormGroup id={billingId} title="Billing" description="Who receives the invoices, and how long they have to pay.">
            <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="lg">
              <InputField label="Billing contact" autoComplete="name" {...form.field("contact")} />
              <InputField label="Billing email" type="email" autoComplete="email" placeholder="finance@company.com" {...form.field("email")} />
            </Grid>
            <FormFieldset kind="radio" legend="Payment terms" direction="row" helpText="Days the client has to pay each invoice">
              {termsOptions.map((option) => <RadioButton key={option.value} label={option.label} {...form.radioField("terms", option.value)} />)}
            </FormFieldset>
          </FormGroup>
          <FormActions>
            <Button level="tertiary" disabled={form.isSubmitting} onClick={cancel}>Cancel</Button>
            <Button level="primary" type="submit">{form.isSubmitting ? "Adding…" : "Add client"}</Button>
          </FormActions>
        </Form>
      )}
      <Dialog open={confirming} onOpenChange={setConfirming} theme="warning" title="Discard this client?"
        description="The details you entered are lost."
        primaryAction={{ label: "Discard client", level: "danger", onClick: discard }}
        secondaryAction={{ label: "Keep editing", autoFocus: true }} />
    </AppShell>
  );
}

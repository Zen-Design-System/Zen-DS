import { useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Avatar, Badge, Button, EmptyState, InputField, Menu, ModalForm, NumberField, PageHeader, Sidebar,
  SidebarMenuItem, Stack, Table, TableText, Text, Thumbnail, plural, useFormState, useToast, useZen,
  type SidebarItem, type SidebarSection, type TableColumn,
} from "@zen-ds/react";
import { TODAY, activity, formatDate, formatDay, formatMoney, me, people, studio } from "../../data";

// ——— The app around the page ————————————————————————————————————————————————————————————————————————
/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected. */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
    { id: "time-off", label: "Time off", icon: "icon-calendar-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "claims", label: "Expense claims", icon: "icon-wallet-02-line" },
  ] },
];
const unreadActivity = activity.filter((item) => item.unread);
const firstUnread = unreadActivity[0];

/**
 * One page of the studio's app: the AppShell (Layout=Sidebar, the toggle at the start of the header's top row) with the
 * Sidebar on the current page, the top row's utilities (an optional Search at its start, Notifications, the account
 * last) and the page's PageHeader as the header's Main row. The Body pads the page margins itself. `onNavigate` takes the
 * Sidebar rows the example can show (true when it did); any other row says it is not part of this example.
 */
function StudioApp({ here, onNavigate, leading, main, children }: {
  here: string; onNavigate?: (id: string) => boolean; leading?: ReactNode; main: ReactNode; children: ReactNode;
}) {
  const { toast } = useToast();
  const [unread, setUnread] = useState(unreadActivity.length);
  const goTo = (id: string, label: string) => {
    if (onNavigate?.(id) || id === here) return;
    toast({ title: `${label} isn’t part of this example`, children: "Each example on this page is one page of the studio’s app." });
  };
  const readAll = () => {
    toast(unread
      ? { title: plural(unread, "new notification"), children: `${people[firstUnread.actor].name} ${firstUnread.verb} “${firstUnread.object}”${unread > 1 ? `, and ${unread - 1} more` : ""}.` }
      : { title: "No new notifications", children: "You’re all caught up." });
    setUnread(0);
  };
  return (
    <AppShell
      sidebar={(
        // The logo slot is 24px tall: the mark is a 2xs Thumbnail that fits it at every density.
        <Sidebar logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Avatar size="xsmall" shape="square" theme="photo" src={studio.logo} alt={studio.name} />}
          sections={studioNav} selectedId={here} onItemClick={(item: SidebarItem) => goTo(item.id, item.label)}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader
          // The top row: utilities only (the page's actions are in its PageHeader).
          leading={leading}
          actions={<>
            <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={readAll} />
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => goTo("settings", "Settings") },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
            ]} />
          </>}
          // The Main row: the page's own header, its h1.
          main={main}
        />
      )}
    >
      {children}
    </AppShell>
  );
}

// ——— First use: the empty state carries the first action ——————————————————————————————————————————————
type Claim = { id: string; title: string; amount: number; submitted: Date };

export default function ExpenseClaims() {
  const { toast } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [creating, setCreating] = useState(false);
  // A phone-width page folds the Sent column into the claim's caption.
  const narrow = useZen()?.breakpoint === "mobile";
  const form = useFormState<{ title: string; amount: number | null }>({
    initialValues: { title: "", amount: null },
    validate: (values) => ({
      title: values.title.trim() ? undefined : "Say what it was for",
      amount: values.amount && values.amount > 0 ? undefined : "Enter an amount",
    }),
    onSubmit: (values, { reset }) => {
      const claim = { id: `c${claims.length + 1}`, title: values.title.trim(), amount: values.amount ?? 0, submitted: TODAY };
      setClaims((list) => [claim, ...list]);
      setCreating(false);
      reset();
      toast({ title: "Claim sent", children: `${formatMoney(claim.amount, true)} · ${claim.title}`, action: { label: "Undo", onClick: () => setClaims((list) => list.filter((item) => item.id !== claim.id)) } });
    },
  });
  const columns: TableColumn<Claim>[] = [
    { id: "claim", header: "Claim", cell: (row) => <TableText bold caption={narrow ? formatDay(row.submitted) : undefined}>{row.title}</TableText> },
    ...(narrow ? [] : [{ id: "sent", header: "Sent", width: "152px", cell: (row: Claim) => <TableText>{formatDate(row.submitted)}</TableText> }]),
    { id: "status", header: "Status", width: narrow ? undefined : "128px", cell: () => <Badge theme="yellow" background="subtle">Pending</Badge> },
    { id: "amount", header: "Amount", align: "right", width: narrow ? undefined : "120px", cell: (row) => <TableText>{formatMoney(row.amount, true)}</TableText> },
  ];
  return (
    <StudioApp here="claims"
      // While the page is empty the empty state holds the one Primary; with a claim it moves up to the header.
      main={<PageHeader title="Expense claims" description={`Claims you send go to ${people.mai.name} in Finance.`}
        actions={claims.length ? <Button level="primary" onClick={() => setCreating(true)}>New claim</Button> : undefined} />}
    >
      <Stack gap="xl">
        {claims.length ? <Table aria-label="Expense claims" rows={claims} columns={columns} /> : (
          <EmptyState headingLevel={2} icon="icon-receipt-line" title="No expense claims yet" primaryAction={{ label: "New claim", onClick: () => setCreating(true) }}>
            Claim anything you paid for the studio, like a taxi to a client meeting.
          </EmptyState>
        )}
      </Stack>
      <ModalForm open={creating} onOpenChange={(open) => { setCreating(open); if (!open) form.reset(); }} title="New claim"
        onSubmit={form.handleSubmit} primaryAction={{ label: "Send claim" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="What was it for?" placeholder="Taxi to Lumen Bank" data-autofocus="" {...form.field("title")} />
        <NumberField label="Amount (USD)" min={0.01} step={1} {...form.numberField("amount")} />
      </ModalForm>
    </StudioApp>
  );
}

import { useId, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellHeader, Breadcrumbs, Button, Card, DockIcon, FormFieldset, Grid, Heading, List, ListBox, ListItem, Menu, PageHeader, Sidebar,
  SidebarMenuItem, Stack, Text, Thumbnail, Toggle, useToast, type SidebarItem, type SidebarSection,
} from "@zen-ds/react";
import { TODAY, formatTime, me, studio } from "../../data";

type NotificationKey = "mentions" | "reviews" | "summary" | "assigned" | "due" | "clients";
const notificationGroups: Array<{ id: string; title: string; rows: Array<{ key: NotificationKey; label: string; caption: string }> }> = [
  { id: "email", title: "Email", rows: [
    { key: "mentions", label: "Mentions and replies", caption: "When someone @mentions you or replies to your comment" },
    { key: "reviews", label: "Review requests", caption: "When a design or a task waits for your approval" },
    { key: "summary", label: "Weekly summary", caption: "Progress on your projects, every Monday at 9:00 am" },
  ] },
  { id: "push", title: "Push on your phone", rows: [
    { key: "assigned", label: "Task assignments", caption: "When someone gives you a task" },
    { key: "due", label: "Due date reminders", caption: "At 9:00 am on the day before a task is due" },
    { key: "clients", label: "Client comments", caption: "When a guest from Phin & Co, Lumen Bank or another client comments" },
  ] },
];

/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected (Settings sits in its footer). */
const studioNav: SidebarSection[] = [
  { items: [
    { id: "home", label: "Home", icon: "icon-home-03-line" },
    { id: "projects", label: "Projects", icon: "icon-folder-line" },
    { id: "clients", label: "Clients", icon: "icon-briefcase-line" },
    { id: "people", label: "People", icon: "icon-users-line" },
  ] },
  { label: "Finance", items: [
    { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
    { id: "expenses", label: "Expenses", icon: "icon-wallet-02-line" },
  ] },
];

export default function NotificationSettings() {
  const { toast } = useToast();
  const headingId = useId();
  const devicesId = useId();
  const [paused, setPaused] = useState(false);
  const [prefs, setPrefs] = useState<Record<NotificationKey, boolean>>({ mentions: true, reviews: true, summary: false, assigned: true, due: true, clients: false });
  /** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Toggle." });
  // A switch applies at once. Pausing everything is a big change, so it confirms in a Toast; Undo restores and closes it.
  const pause = (next: boolean) => {
    setPaused(next);
    if (!next) return;
    toast({ title: "Notifications paused", action: { label: "Undo", onClick: () => setPaused(false) } });
  };
  const sendTest = () => toast(paused
    ? { title: "Nothing was sent", children: "Notifications are paused. Turn Pause off to send a test." }
    : { title: "Test notification sent", children: `To ${me.email} and your iPhone 15` });
  return (
    // The studio's app on its Settings page: the trail in the header's top row, the PageHeader (the h1) in its Main
    // row. The Body pads the page; beside the Sidebar every box takes its elevation (Shadow).
    <AppShell
      sidebar={(
        <Sidebar
          logo={(
            <Stack direction="row" gap="xs" align="center">
              <Thumbnail src={studio.logo} alt="" size="2xs" />
              <Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text>
            </Stack>
          )}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          sections={studioNav} selectedId="settings" onItemClick={(item: SidebarItem) => { if (item.id !== "settings") notHere(item.label); }}
          footer={<>
            <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
            <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
          </>} />
      )}
      header={(
        <AppShellHeader
          leading={<Breadcrumbs master={false} items={[{ id: "settings", label: "Settings" }, { id: "notifications", label: "Notifications" }]}
            onNavigate={(item, event) => { event.preventDefault(); notHere(String(item.label)); }} />}
          actions={(
            <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
              { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
              { type: "separator" },
              { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
            ]} />
          )}
          main={<PageHeader title="Notifications" description="Choose what Zen tells you about and where. Changes save as you make them." />}
        />
      )}
    >
      {/* The settings in a reading column beside where they are delivered; under 800px the second column moves under. */}
      <Grid columns="minmax(0, 1fr) minmax(0, 320px)" stackBelow={800} gap="xl" align="start" maxWidth={1200}>
        <Stack gap="xl">
          {/* Alone in its Card, the switch fills the row, so it lines up with the switches below. */}
          <Card theme="shadow">
            <Toggle size="md" bold={false} label="Pause all notifications"
              caption={paused ? `Paused at ${formatTime(TODAY)}. Nothing reaches you until you turn this off.` : "Mute email and push for a while, for example during a client workshop."}
              checked={paused} onCheckedChange={pause} />
          </Card>
          {notificationGroups.map((group) => (
            <Stack as="section" key={group.id} gap="md" aria-labelledby={`${headingId}-${group.id}`}>
              <Heading level={2} id={`${headingId}-${group.id}`} textStyle="Heading/4">{group.title}</Heading>
              <Card theme="shadow">
                <FormFieldset kind="toggle" legend={group.title} hideLegend gap="md">
                  {group.rows.map((row) => (
                    <Toggle key={row.key} size="md" label={row.label} caption={row.caption} disabled={paused}
                      checked={prefs[row.key]} onCheckedChange={(on) => setPrefs((current) => ({ ...current, [row.key]: on }))} bold={false} />
                  ))}
                </FormFieldset>
              </Card>
            </Stack>
          ))}
        </Stack>
        <ListBox theme="shadow" as="section" aria-labelledby={devicesId}
          header={<Stack gap="2xs">
            <Heading level={2} id={devicesId} textStyle="Heading/Subheading">Delivered to</Heading>
            <Text role="status" textStyle="Body/Small/Regular" tone="base">{paused ? "Paused: nothing is delivered" : "Where your notifications go"}</Text>
          </Stack>}
          footer={<Stack direction="row"><Button level="tertiary" size="sm" startIcon="icon-send-01-line" onClick={sendTest}>Send a test notification</Button></Stack>}>
          <List aria-labelledby={devicesId}>
            <ListItem title="Email" caption={me.email} leading={<DockIcon icon="icon-mail-01-line" theme="blue" background="subtle" size="medium" />} />
            <ListItem title="iPhone 15" caption="Push · active 2 minutes ago" leading={<DockIcon icon="icon-mobile-line" theme="green" background="subtle" size="medium" />} />
            <ListItem title="MacBook Pro" caption="Desktop app · active now" leading={<DockIcon icon="icon-laptop-line" theme="purple" background="subtle" size="medium" />} />
          </List>
        </ListBox>
      </Grid>
    </AppShell>
  );
}

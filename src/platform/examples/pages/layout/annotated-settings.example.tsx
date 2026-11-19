import { useId, useState, type ReactNode } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Box, Breadcrumbs, Button, Card, Checkbox, Form, FormActions, FormFieldset, Grid, Heading, InputField,
  Menu, PageHeader, SelectField, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useFormState, useToast, type SidebarSection,
} from "@zen-ds/react";
import { activity, formatRelative, me, people, studio, tasks } from "../../data";

// "Annotated settings" is a page of the Đìzai Studio app: one AppShell (pattern sidebar) with the studio's Sidebar, the
// header's top row (the trail, notifications, the account) and the page's PageHeader in its Main row. The Body pads the
// page (Margin-Comfortable), so the layout starts at the page margin without a Container.
const myOpenTasks = tasks.filter((task) => task.assignee === me.id && task.status !== "Done").length;
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", counter: myOpenTasks },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];
const unreadActivity = activity.filter((item) => item.unread);

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

type WorkspaceSettings = { name: string; timeZone: string; weekStart: string; digest: boolean; reminders: boolean; leave: boolean };
const firstSettings: WorkspaceSettings = { name: studio.name, timeZone: "hcm", weekStart: "mon", digest: true, reminders: true, leave: false };
const timeZones = [
  { value: "hcm", label: "Ho Chi Minh City (GMT+7)" },
  { value: "sg", label: "Singapore (GMT+8)" },
  { value: "london", label: "London (GMT+1)" },
];
const weekStarts = [{ value: "mon", label: "Monday" }, { value: "sun", label: "Sunday" }, { value: "sat", label: "Saturday" }];

/** One annotated section: the title and its one-line description on the left, the controls in a Card on the right.
 *  Columns lg apart; in a narrow window the description sits md above its card. */
function SettingsSection({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return (
    <Grid as="section" columns={{ mobile: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} columnGap="lg" rowGap="md" align="start" aria-labelledby={id}>
      <Stack gap="xs">
        <Heading level={2} id={id} textStyle="Heading/4">{title}</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">{description}</Text>
      </Stack>
      {/* The Sidebar's elevation: Shadow/Bottom/Level-1, no border. */}
      <Card theme="shadow">
        <Stack gap="md">{children}</Stack>
      </Card>
    </Grid>
  );
}

export default function AnnotatedSettings() {
  const { toast } = useToast();
  const workspaceId = useId();
  const weekId = useId();
  const emailId = useId();
  /** A place this example does not draw: the toast says so, and the Sidebar keeps the current page. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the layout." });
  const form = useFormState<WorkspaceSettings>({
    initialValues: firstSettings,
    validate: (values) => ({ name: values.name.trim() ? undefined : "Enter a workspace name" }),
    // Saved values become the new starting point, so Cancel goes back to them.
    onSubmit: (values, { reset }) => { reset(values); toast({ type: "positive", title: "Settings saved" }); },
  });
  return (
    <AppShell
      sidebar={(
        <Sidebar
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          sections={studioPlaces} selectedId="settings" onItemClick={(item) => { if (item.id !== "settings") notHere(item.label); }}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          leading={<Breadcrumbs master={false} items={[{ id: "settings", label: "Settings" }, { id: "workspace", label: "Workspace" }]}
            onNavigate={(_, event) => { event.preventDefault(); notHere("Settings"); }} />}
          actions={<StudioActions />}
          main={<PageHeader title="Workspace settings" description={`How the ${studio.name} workspace looks and works for everyone in it.`} />}
        />
      )}
    >
      {/* A form reads best at a readable width: the Body already pads the page, so the form only stops at md (960)
          and starts at the page margin, in line with the title above it. */}
      <Box maxWidth={960}>
        <Form form={form} gap="xl" aria-label="Workspace settings">
          <SettingsSection id={workspaceId} title="Workspace" description="The name people see when they sign in and in every email Zen sends.">
            <InputField label="Workspace name" {...form.field("name")} />
            <InputField label="Studio domain" defaultValue={studio.domain} readOnly helpText="Only the studio owner can change the domain." />
          </SettingsSection>
          <SettingsSection id={weekId} title="Working week" description="Due dates, timesheets and the team calendar follow these.">
            <SelectField label="Time zone" options={timeZones} {...form.selectField("timeZone")} />
            <SelectField label="Week starts on" options={weekStarts} {...form.selectField("weekStart")} />
          </SettingsSection>
          <SettingsSection id={emailId} title="Email" description="What Zen emails the studio about. Each person can turn these off for themselves.">
            {/* Saved with the form, so these are Checkboxes (a Toggle would apply at once). */}
            <FormFieldset legend="Email the studio about" hideLegend kind="checkbox">
              <Checkbox label="Weekly studio digest" caption="Every Monday at 8:00 am" {...form.checkboxField("digest")} />
              <Checkbox label="Invoice reminders" caption="3 days before an invoice is due" {...form.checkboxField("reminders")} />
              <Checkbox label="Leave requests" caption="When someone on your team asks for time off" {...form.checkboxField("leave")} />
            </FormFieldset>
          </SettingsSection>
          <FormActions>
            <Button level="tertiary" disabled={!form.isDirty} onClick={() => form.reset()}>Cancel</Button>
            <Button level="primary" type="submit">Save changes</Button>
          </FormActions>
        </Form>
      </Box>
    </AppShell>
  );
}

import { useId, useRef, useState, type ReactNode } from "react";
import {
  ActionBar, AppShell, AppShellAccount, AppShellAction, AppShellHeader, Breadcrumbs, Card, DateField, Form, FormFieldset, Grid, Heading, InputField, Menu, NumberField,
  PageHeader, RadioButton, SelectField, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useFormState, useToast, type SidebarSection,
} from "@zen-ds/react";
import { TODAY, activity, formatMoney, formatRelative, me, people, projectById, studio, tasks, type PersonId } from "../../data";

type SettingsValues = { name: string; lead: string; start: string; due: string; budget: number | null; billingEmail: string; terms: string };
const loyalty = projectById("phin-loyalty");
const asDay = (date: Date) => `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${date.getFullYear()}`;
/** "11/02/2026" (the DateField's typed format) → a Date, or null while it is incomplete or not a real day. */
const parseDay = (text: string) => {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  const date = m ? new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2])) : null;
  return date && date.getDate() === Number(m?.[2]) ? date : null;
};
const savedSettings: SettingsValues = {
  name: loyalty.name, lead: loyalty.lead, start: asDay(loyalty.start), due: asDay(loyalty.due), budget: loyalty.budget,
  billingEmail: "trang.le@phinco.vn", terms: "Net 30",
};
const leadOptions = (["chi", "alex", "duy", "gia"] as PersonId[]).map((id) => ({ value: id, label: people[id].name }));
const termsOptions = ["Net 15", "Net 30", "Net 45"];
const wait = (ms: number) => new Promise<void>((resolve) => { setTimeout(resolve, ms); });

// The studio app's chrome: one AppShell (pattern sidebar) with the studio's Sidebar, the header's top row (the trail,
// notifications, the account) and the page's PageHeader in its Main row. The Body pads the page (Margin-Comfortable).
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", counter: tasks.filter((task) => task.assignee === me.id && task.status !== "Done").length },
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

/** A settings group: its title and what it covers on the left, its fields on a Shadow card on the right (one column on
 *  a narrow window). The cards take the Sidebar's elevation. */
function SettingsGroup({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
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

/** A desktop edit page whose Undo changes · Save changes sit in a sticky Action bar with the unsaved count. */
export default function UnsavedChanges() {
  const { toast } = useToast();
  const generalId = useId();
  const scheduleId = useId();
  const billingId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(savedSettings);
  // With nothing left to save, both buttons wait (disabled), so focus goes back to the first field instead of the page.
  const refocus = () => setTimeout(() => nameRef.current?.focus());
  const form = useFormState<SettingsValues>({
    initialValues: savedSettings,
    validate: (values) => {
      const start = parseDay(values.start), due = parseDay(values.due);
      return {
        name: values.name.trim() ? undefined : "Name the project",
        start: start ? undefined : "Enter the start date, like 07/22/2026",
        due: !due ? "Enter the due date, like 11/02/2026" : start && due <= start ? "The due date is before the start date" : undefined,
        budget: values.budget && values.budget > 0 ? undefined : "Enter the budget",
        billingEmail: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.billingEmail.trim()) ? undefined : "Enter an email like finance@company.com",
      };
    },
    onSubmit: async (values, { reset }) => {
      await wait(800);
      setSaved(values);
      reset(values);
      toast({ type: "positive", title: "Settings saved" });
      refocus();
    },
  });
  // The summary names what the actions act on; with nothing changed it says why they wait.
  const changes = (Object.keys(saved) as (keyof SettingsValues)[]).filter((key) => form.values[key] !== saved[key]).length;
  const undo = () => { form.reset(); toast({ title: "Changes undone" }); refocus(); };
  /** A place this example does not draw: the toast says so, and the page stays. */
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the Action Bar." });
  return (
    <AppShell
      sidebar={(
        <Sidebar
          logo={<Stack direction="row" gap="xs" align="center"><Thumbnail src={studio.logo} alt="" size="2xs" /><Text as="span" textStyle="Body/Base/Bold">{studio.name}</Text></Stack>}
          logoCollapsed={<Thumbnail src={studio.logo} alt={studio.name} size="2xs" />}
          sections={studioPlaces} selectedId="projects" onItemClick={(item) => { if (item.id !== "projects") notHere(item.label); }}
          footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
      )}
      header={(
        <AppShellHeader
          // The trail starts at a Sub level beside the collapse toggle (no Master crumb next to it).
          leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: loyalty.id, label: saved.name }, { id: "settings", label: "Settings" }]}
            onNavigate={(item, event) => { event.preventDefault(); if (item.id !== "settings") notHere(String(item.label)); }} />}
          actions={<StudioActions />}
          main={<PageHeader title="Project settings" description={`${saved.name} for ${loyalty.client}. Changes reach the whole team when you save them.`} />}
        />
      )}
    >
      {/* The Body pads the page and scrolls under the header. The bar is the form's last child, so it sticks to the
          bottom of the window while the form is in view, and its Save submits the form. */}
      <Form form={form} gap="xl" aria-label="Project settings">
        <SettingsGroup id={generalId} title="General" description="The name the team and the client see, and who leads the work.">
          <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="sm">
            <InputField ref={nameRef} label="Project name" maxLength={60} {...form.field("name")} />
            <SelectField label="Project lead" options={leadOptions} {...form.selectField("lead")} />
          </Grid>
        </SettingsGroup>
        <SettingsGroup id={scheduleId} title="Schedule" description="When the work starts and the day the client expects it.">
          <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="sm">
            <DateField label="Start date" today={TODAY} {...form.dateField("start")} />
            <DateField label="Due date" today={TODAY} {...form.dateField("due")} />
          </Grid>
        </SettingsGroup>
        <SettingsGroup id={billingId} title="Billing" description={`What ${loyalty.client} is invoiced, and how long they have to pay.`}>
          <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="sm">
            <NumberField label="Budget (USD)" min={0} step={1000} helpText={form.values.budget ? formatMoney(form.values.budget) : undefined} {...form.numberField("budget")} />
            <InputField label="Billing email" type="email" {...form.field("billingEmail")} />
          </Grid>
          {/* Three short choices: a radio row, as on the Form page's Add a client. */}
          <FormFieldset kind="radio" legend="Payment terms" direction="row" helpText="Days the client has to pay each invoice">
            {termsOptions.map((terms) => <RadioButton key={terms} label={terms} {...form.radioField("terms", terms)} />)}
          </FormFieldset>
        </SettingsGroup>
        {/* The bar runs the width of the main column at the bottom of the window: it takes back the Body's margins at
            the sides and below (Margin-Comfortable), so it reaches the window's edges while it sticks, and its own
            padding lines its content up with the page margin. */}
        <ActionBar direction="horizontal" aria-label="Project settings actions"
          style={{ width: "auto", margin: "0 calc(-1 * var(--zen-margin-comfortable, 24px)) calc(-1 * var(--zen-margin-comfortable, 24px))" }}
          summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{changes ? plural(changes, "unsaved change") : "No changes to save yet"}</Text>}
          secondaryAction={{ label: "Undo changes", onClick: undo, disabled: !changes || form.isSubmitting }}
          primaryAction={{ label: form.isSubmitting ? "Saving…" : "Save changes", type: "submit", disabled: !changes || form.isSubmitting }} />
      </Form>
    </AppShell>
  );
}

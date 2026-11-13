import { useRef, useState } from "react";
import {
  AppShell, AppShellAccount, AppShellAction, AppShellHeader, Box, Breadcrumbs, Button, Checkbox, Divider, Form, FormActions, FormFieldset, Grid, Heading,
  InputField, Menu, PageHeader, SelectField, Sidebar, SidebarMenuItem, Stack, Text, Thumbnail, plural, useToast, type SidebarSection,
} from "@zen-ds/react";
import { activity, formatRelative, me, people, studio } from "../../data";

type Settings = { name: string; website: string; timeZone: string; reminders: boolean; lockTimesheets: boolean; rounding: string; terms: string; prefix: string };
const initialSettings: Settings = { name: studio.name, website: studio.domain, timeZone: "hcmc", reminders: true, lockTimesheets: false, rounding: "15", terms: "30", prefix: "INV-2026-" };
const timeZones = [{ value: "hcmc", label: "Ho Chi Minh City (GMT+7)" }, { value: "sg", label: "Singapore (GMT+8)" }];
const roundings = [{ value: "0", label: "Don't round" }, { value: "5", label: "5 minutes" }, { value: "15", label: "15 minutes" }, { value: "30", label: "30 minutes" }];
const paymentTerms = [{ value: "15", label: "Due in 15 days" }, { value: "30", label: "Due in 30 days" }, { value: "45", label: "Due in 45 days" }];

/** Each settings section: its heading beside the fields on a desktop, above them on a phone. */
const sectionColumns = { mobile: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" } as const;

// "Settings sections" is a page of the Đìzai Studio app: one AppShell (pattern sidebar) with the studio's Sidebar
// (Settings selected), the header's top row (the trail, notifications, the account) and the PageHeader in its Main row.
// The Body pads the page, so the form starts at the page margin without a Container.
const studioPlaces: SidebarSection[] = [{ items: [
  { id: "home", label: "Home", icon: "icon-home-03-line" },
  { id: "projects", label: "Projects", icon: "icon-folder-line" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line" },
  { id: "invoices", label: "Invoices", icon: "icon-receipt-line" },
  { id: "people", label: "People", icon: "icon-users-line" },
] }];
const unread = activity.filter((item) => item.unread);

/** Section intro in the left column of an annotated settings layout. */
function SectionIntro({ title, children }: { title: string; children: string }) {
  return (
    <Stack gap="xs">
      <Heading level={2}>{title}</Heading>
      <Text textStyle="Body/Small/Regular" tone="base">{children}</Text>
    </Stack>
  );
}

/** The top row's utilities: notifications (the count clears once read) and the account menu, last. */
function StudioActions() {
  const { toast } = useToast();
  const [count, setCount] = useState(unread.length);
  const latest = unread[0];
  return (
    <>
      <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={count} onClick={() => {
        setCount(0);
        toast({ title: count ? plural(count, "new notification") : "You're all caught up", children: `${people[latest.actor].name} ${latest.verb} ${latest.object} · ${formatRelative(latest.at)}` });
      }} />
      <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
        { id: "profile", label: "Your profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.location}` }) },
        { id: "settings", label: "Settings", icon: "icon-settings-01-line", onSelect: () => toast({ title: "You're in Settings", children: "Studio settings apply to everyone." }) },
        { type: "separator" },
        { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: `Signed out of ${studio.name}` }) },
      ]} />
    </>
  );
}

/** Default dividers between the sections of a settings page; save at the bottom, not in the header. */
export default function StudioSettings() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(initialSettings);
  const [draft, setDraft] = useState(initialSettings);
  const [nameError, setNameError] = useState<string>();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the studio settings." });
  // Save and Cancel go quiet once nothing is left to save, so focus moves back to the top of the form, not to <body>.
  const backToTop = () => setTimeout(() => firstFieldRef.current?.focus());
  const save = () => {
    if (!draft.name.trim()) { setNameError("Enter the studio name"); return; }
    setNameError(undefined);
    setSaved(draft);
    toast({ type: "positive", title: "Settings saved", children: `Everyone in the ${studio.workspace} sees them now.` });
    backToTop();
  };
  const discard = () => { setDraft(saved); setNameError(undefined); backToTop(); };
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
          // A Sub-level trail beside the collapse toggle (no Master crumb next to it).
          leading={<Breadcrumbs master={false} items={[{ id: "settings", label: "Settings" }, { id: "studio", label: "Studio" }]}
            onNavigate={(_, event) => { event.preventDefault(); notHere("Settings"); }} />}
          actions={<StudioActions />}
          main={<PageHeader title="Studio settings" description={`These apply to everyone in the ${studio.workspace}.`} />}
        />
      )}
    >
      {/* A form reads best at a readable width: the Body already pads the page, so the form only stops at 960 and
          starts at the page margin, in line with the title above it. */}
      <Box maxWidth={960}>
        <Form onSubmit={save} gap="xl" aria-label="Studio settings">
          <Grid columns={sectionColumns} gap="lg" align="start" stackBelow={640}>
            <SectionIntro title="Studio profile">How the studio appears on invoices and in the client portal.</SectionIntro>
            <Stack gap="md">
              <InputField ref={firstFieldRef} label="Studio name" value={draft.name} onValueChange={(value) => set("name", value)} error={nameError} />
              <InputField label="Website" value={draft.website} onValueChange={(value) => set("website", value)} />
              <SelectField label="Time zone" options={timeZones} value={draft.timeZone} onValueChange={(value) => set("timeZone", value)} />
            </Stack>
          </Grid>
          <Divider />
          <Grid columns={sectionColumns} gap="lg" align="start" stackBelow={640}>
            <SectionIntro title="Time tracking">Timesheets feed the weekly client reports.</SectionIntro>
            <Stack gap="md">
              <FormFieldset legend="Timesheets">
                <Checkbox label="Remind people to log time on Friday afternoon" checked={draft.reminders} onCheckedChange={(value) => set("reminders", value)} />
                <Checkbox label="Lock timesheets once the client report is sent" checked={draft.lockTimesheets} onCheckedChange={(value) => set("lockTimesheets", value)} />
              </FormFieldset>
              <SelectField label="Round entries to" options={roundings} value={draft.rounding} onValueChange={(value) => set("rounding", value)} />
            </Stack>
          </Grid>
          <Divider />
          <Grid columns={sectionColumns} gap="lg" align="start" stackBelow={640}>
            <SectionIntro title="Invoices">Defaults for every new invoice. You can change them per invoice.</SectionIntro>
            <Stack gap="md">
              <SelectField label="Payment terms" options={paymentTerms} value={draft.terms} onValueChange={(value) => set("terms", value)} />
              <InputField label="Invoice number prefix" value={draft.prefix} onValueChange={(value) => set("prefix", value)} helpText={`Next invoice: ${draft.prefix}0144`} />
            </Stack>
          </Grid>
          <Divider />
          <FormActions>
            <Button level="tertiary" disabled={!dirty} onClick={discard}>Cancel</Button>
            <Button level="primary" type="submit" disabled={!dirty}>Save changes</Button>
          </FormActions>
        </Form>
      </Box>
    </AppShell>
  );
}

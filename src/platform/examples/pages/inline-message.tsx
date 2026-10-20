/* Inline Message examples: messages that sit inside the content they describe, in Đìzai Studio's Zen workspace (brief:
   docs/research/example-rebuild-brief-2026-09-30.md). A page- or app-wide condition is an Alert Banner, the result of
   one quick action is a Toast, and one bad field is that field's error text. The two screens (the sent invoice, the
   phone timesheet) sit in the new AppShell (2026-10-19). */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog } from "../../../components/Dialog";
import { DockIcon } from "../../../components/DockIcon";
import { Form, FormActions, useFormState } from "../../../components/Form";
import { Image, Thumbnail } from "../../../components/Image";
import { InlineMessage } from "../../../components/InlineMessage";
import { InputField, SelectField, TextAreaField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { PageHeader } from "../../../components/PageHeader";
import { Sidebar, SidebarMenuItem, type SidebarItem, type SidebarSection } from "../../../components/Sidebar";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { platformMedia } from "../../PlatformMedia";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import {
  TODAY, daysFromToday, formatDate, formatDay, formatMoney, formatRange, formatRelative, initials, invoiceStatusTheme, invoices, leaveBalance, me,
  people, projectById, studio, taskStatusTheme, type PersonId, type TaskStatus,
} from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import { keepOnHotUpdate } from "../../hotData";

export const page: PlatformPage = "inline-message";

/* ───────────── The studio's desktop app ───────────── */

/** A place this example does not draw: the toast says so, and the navigation keeps the current page. */
function useNotHere() {
  const { toast } = useToast();
  return (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Inline Message." });
}

/* Đìzai Studio's navigation: the same Sidebar on every page, its current page selected. */
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

/**
 * One page of the studio's app: AppShell Layout=Sidebar in a desktop window, the trail and the utilities in the header's
 * top row and the page's PageHeader, its h1, as the Main row. The Body pads the page margins itself.
 */
function StudioApp({ here, leading, main, children }: { here: string; leading?: ReactNode; main: ReactNode; children: ReactNode }) {
  const { toast } = useToast();
  const notHere = useNotHere();
  const [unread, setUnread] = useState(1);
  return (
    <PreviewAppFrame height={{ min: 640, max: 820 }}>
      <AppShell
        sidebar={(
          <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<StudioMark src={studio.logo} name={studio.name} />}
            sections={studioNav} selectedId={here} onItemClick={(item: SidebarItem) => { if (item.id !== here) notHere(item.label); }}
            footer={<>
              <SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />
              <SidebarMenuItem id="help" label="Help" icon="icon-help-circle-line" />
            </>} />
        )}
        header={(
          <AppShellHeader leading={leading}
            actions={<>
              <AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={unread} onClick={() => {
                toast(unread ? { title: "Trang Le commented on INV-2026-0142", children: "“Could you add our PO number before Friday?”" } : { title: "No new notifications", children: "You’re all caught up." });
                setUnread(0);
              }} />
              <Menu align="end" trigger={<AppShellAccount name={me.name} src={me.photo} />} items={[
                { id: "profile", label: "Profile", icon: "icon-user-circle-line", onSelect: () => toast({ title: me.name, children: `${me.role} · ${me.email}` }) },
                { type: "separator" },
                { id: "sign-out", label: "Sign out", icon: "icon-log-out-01-line", onSelect: () => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` }) },
              ]} />
            </>}
            main={main}
          />
        )}
      >
        {children}
      </AppShell>
    </PreviewAppFrame>
  );
}

/* ───────────── 1. Editing a sent invoice (context above a form) ───────────── */

const sentInvoice = invoices.find((invoice) => invoice.number === "INV-2026-0142")!;
const terms = [
  { value: "net15", label: `Net 15 · due ${formatDate(daysFromToday(10))}` },
  { value: "net30", label: `Net 30 · due ${formatDate(sentInvoice.due)}` },
  { value: "net45", label: `Net 45 · due ${formatDate(daysFromToday(40))}` },
];
type InvoiceEdit = { terms: string; po: string; note: string };
/** What the invoice bills: the September work on the Loyalty app, $120 an hour. */
const lineItems = [
  { id: "design", title: "Points history and rewards screens", caption: "Design · 96 h at $120", amount: 11520 },
  { id: "api", title: "Rewards API in checkout", caption: "Engineering · 64 h at $120", amount: 7680 },
  { id: "research", title: "Usability round with store staff", caption: "Research · fixed fee", amount: 1800 },
];
type HistoryEntry = { id: string; who: PersonId | "trang"; text: string; at: Date };
const firstHistory: HistoryEntry[] = [
  { id: "asked", who: "trang", text: "Asked for the purchase order number on it", at: daysFromToday(-1, 16, 40) },
  { id: "viewed", who: "trang", text: "Opened the invoice", at: daysFromToday(-4, 14, 12) },
  { id: "sent", who: "mai", text: "Sent it to Trang Le at Phin & Co", at: daysFromToday(-5, 9, 30) },
];
/** Trang Le, Phin & Co's product owner, is a client guest: initials on a steady theme. */
const historyAvatar = (who: HistoryEntry["who"]) => who === "trang"
  ? <Avatar size="md" theme="blue" alt="">TL</Avatar>
  : people[who].photo ? <Avatar size="md" theme="photo" src={people[who].photo} alt="" /> : <Avatar size="md" theme={people[who].theme} alt="">{initials(people[who].name)}</Avatar>;
const historyName = (who: HistoryEntry["who"]) => (who === "trang" ? "Trang Le" : people[who].name);

function SentInvoiceExample() {
  const { toast } = useToast();
  const notHere = useNotHere();
  const itemsId = useId();
  const historyId = useId();
  const [history, setHistory] = useState(firstHistory);
  const form = useFormState<InvoiceEdit>({
    initialValues: { terms: "net30", po: "", note: "" },
    validate: ({ note }) => ({ note: note.trim() ? undefined : "Tell Phin & Co what changed" }),
    // The saved values become the new baseline for the next edit; the invoice's history records the new copy.
    onSubmit: (values, { reset }) => {
      reset(values);
      setHistory((list) => [{ id: `resent-${list.length}`, who: "alex", text: "Sent the updated copy to Trang Le", at: TODAY }, ...list]);
      toast({ title: "Updated invoice sent", children: "Phin & Co got the new copy by email" });
    },
  });
  return (
    <StudioApp here="invoices"
      leading={<Breadcrumbs master={false} items={[{ id: "invoices", label: "Invoices" }, { id: sentInvoice.id, label: sentInvoice.number }]}
        onNavigate={(item, event) => { event.preventDefault(); notHere(String(item.label)); }} />}
      main={<PageHeader title={`Edit ${sentInvoice.number}`}
        meta={<Badge theme={invoiceStatusTheme[sentInvoice.status]} background="subtle">{sentInvoice.status}</Badge>}
        description={`${sentInvoice.client} · ${projectById(sentInvoice.project).name} · Issued ${formatDate(sentInvoice.issued)}`} />}>
      {/* The form beside what it bills and what happened to it; under 880px the summary moves under the form. Beside the
          Sidebar every box takes its elevation (Shadow). */}
      <Grid columns="minmax(0, 1fr) minmax(0, 320px)" stackBelow={880} gap="md" align="start" maxWidth={1200}>
        <Card theme="shadow" as="section" aria-label="Invoice details">
          <Form form={form}>
            {/* Context for the whole form, above its first field. Essential, so it has no close button. */}
            <InlineMessage theme="warning" title="Phin & Co already has this invoice">
              Saving emails them the updated copy with your note about what changed.
            </InlineMessage>
            <Stack gap="md">
              <SelectField label="Payment terms" options={terms} {...form.selectField("terms")} />
              <InputField label="Purchase order" labelOptional helpText="Trang Le asked for PHIN-PO-0915 on Sep 29" {...form.field("po")} />
              <TextAreaField label="Note to Phin & Co" helpText="Shown at the top of the email" rows={3} {...form.field("note")} />
            </Stack>
            <FormActions>
              {/* Back to what Phin & Co already has. */}
              {form.isDirty ? <Button level="tertiary" onClick={() => form.reset()}>Undo changes</Button> : null}
              <Button level="primary" type="submit">Save and send</Button>
            </FormActions>
          </Form>
        </Card>
        <Stack gap="md">
          <Card theme="shadow" as="section" aria-labelledby={itemsId}>
            <Stack gap="md">
              <Heading level={2} id={itemsId} textStyle="Heading/Subheading">Line items</Heading>
              <List aria-labelledby={itemsId}>
                {lineItems.map((item) => (
                  <ListItem key={item.id} title={item.title} titleLines={2} caption={item.caption} value={formatMoney(item.amount)} />
                ))}
              </List>
              <DescriptionList items={[
                { term: "Total", description: formatMoney(sentInvoice.amount, true), emphasis: true },
              ]} />
            </Stack>
          </Card>
          <ListBox theme="shadow" as="section" aria-labelledby={historyId}
            header={<Heading level={2} id={historyId} textStyle="Heading/Subheading">History</Heading>}>
            <List aria-labelledby={historyId}>
              {history.map((entry) => (
                <ListItem key={entry.id} title={historyName(entry.who)} caption={`${entry.text} · ${formatRelative(entry.at)}`} leading={historyAvatar(entry.who)} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </Grid>
    </StudioApp>
  );
}

/* ───────────── 2. Form error summary ───────────── */

type NewClient = { company: string; contact: string; email: string };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ErrorSummaryExample() {
  const { toast } = useToast();
  const titleId = useId();
  const form = useFormState<NewClient>({
    initialValues: { company: "", contact: "", email: "" },
    validate: ({ company, contact, email }) => ({
      company: company.trim() ? undefined : "Enter the company name",
      contact: contact.trim() ? undefined : "Enter who receives the invoices",
      email: !email.trim() ? "Enter a billing email" : emailPattern.test(email.trim()) ? undefined : "Enter an email like name@company.com",
    }),
    onSubmit: ({ company }, { reset }) => { reset(); toast({ title: "Client added", children: company.trim() }); },
  });
  const count = Object.keys(form.errors).length;
  return (
    <Card theme="flat" width="fill" maxWidth={480}>
      {/* Form moves focus to the first invalid field after a failed submit; the summary counts what is left. */}
      <Form form={form} gap="md" aria-labelledby={titleId}>
        <Heading level={4} id={titleId} textStyle="Heading/Subheading">New client</Heading>
        {form.submitCount > 0 && count > 0 ? (
          <InlineMessage theme="negative" title={`Fix ${plural(count, "field")} to add the client`}>
            Each field below says what’s missing.
          </InlineMessage>
        ) : null}
        <InputField label="Company name" autoComplete="organization" {...form.field("company")} />
        <InputField label="Billing contact" autoComplete="name" {...form.field("contact")} />
        <InputField label="Billing email" type="email" autoComplete="email" {...form.field("email")} />
        <FormActions>
          <Button level="primary" type="submit">Add client</Button>
        </FormActions>
      </Form>
    </Card>
  );
}

/* ───────────── 3. Verify a domain (the result where it happened) ───────────── */

type Check = "idle" | "checking" | "failed" | "verified";
const txtValue = "zen-verify=dz-4f9c2a71";

function VerifyDomainExample() {
  const { toast } = useToast();
  const titleId = useId();
  const [check, setCheck] = useState<Check>("idle");
  const [attempts, setAttempts] = useState(0);
  const timer = useRef<number>(0);
  const root = useRef<HTMLElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef(false);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  // The button that started a check goes away with it: focus waits on the heading, then lands on the result's action
  // (Check again, Remove domain, or Verify domain again after a removal).
  useEffect(() => {
    if (!moveFocus.current) return;
    // The result arrives a moment later: move focus only if it is still in this example (or nowhere), never pull it
    // away from what the person went on to do.
    const active = document.activeElement;
    if (active && active !== document.body && !root.current?.contains(active)) { moveFocus.current = false; return; }
    const target = check === "checking" ? root.current?.querySelector<HTMLElement>("h4")
      : check === "failed" ? root.current?.querySelector<HTMLElement>(".zen-inline-message__action") : action.current;
    target?.focus();
    if (check !== "checking") moveFocus.current = false;
  }, [check]);
  // The first check fails (the record hasn't reached the DNS yet); checking again finds it.
  const verify = () => {
    moveFocus.current = true;
    setCheck("checking");
    timer.current = window.setTimeout(() => { setCheck(attempts === 0 ? "failed" : "verified"); setAttempts(attempts + 1); }, 1200);
  };
  // Removing can be undone, so it acts at once and the Toast offers Undo.
  const remove = () => {
    moveFocus.current = true;
    setCheck("idle");
    // Undo's toast closes as it runs, so focus goes back to Remove domain once it renders.
    toast({ title: "Domain removed", action: { label: "Undo", onClick: () => { setCheck("verified"); requestAnimationFrame(() => action.current?.focus()); } } });
  };
  const copy = () => { void navigator.clipboard?.writeText(txtValue).catch(() => undefined); toast({ id: "dns-copied", title: "Value copied" }); };
  return (
    <Card theme="flat" width="fill" maxWidth={480}>
      <Stack ref={root} as="section" gap="xl" aria-labelledby={titleId}>
        <Stack gap="xs">
          <Heading level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Email domain</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Send invoices from billing@dizai.studio. Add this record at your DNS provider, then verify.</Text>
        </Stack>
        <DescriptionList items={[
          { term: "Type", description: "TXT" },
          { term: "Host", description: "@" },
          { term: "Value", description: txtValue, action: <IconButton appearance="flat" level="primary" size="sm" icon="icon-copy-line" aria-label="Copy value" onClick={copy} /> },
        ]} divider />
        {/* One message slot next to the records: its theme follows the check. */}
        {check === "checking" ? (
          <InlineMessage theme="info" title="Checking dizai.studio…">This takes a few seconds.</InlineMessage>
        ) : check === "failed" ? (
          <InlineMessage theme="negative" title="No TXT record found yet" action={{ label: "Check again", onClick: verify }}>
            New records can take up to an hour to show up. Check the value, then try again.
          </InlineMessage>
        ) : check === "verified" ? (
          <InlineMessage theme="positive" title="dizai.studio is verified">
            Invoices and client emails now go out from billing@dizai.studio.
          </InlineMessage>
        ) : null}
        {/* The card's one action sits at its bottom-right edge, like a form's. */}
        {check === "idle" || check === "verified" ? (
          <Stack direction="row" justify="end">
            {check === "idle"
              ? <Button ref={action} level="primary" onClick={verify}>Verify domain</Button>
              : <Button ref={action} level="danger-subtle" onClick={remove}>Remove domain</Button>}
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

/* ───────────── 4. Moodboard to review (Custom with a thumbnail) ───────────── */

const moodboard = [platformMedia.feed[1], platformMedia.feed[3], platformMedia.feed[4], platformMedia.feed[7]];
type BrandTask = { id: string; key: string; title: string; assignee: PersonId; status: TaskStatus };
const brandTasks: BrandTask[] = [
  { id: "s1", key: "SAO-004", title: "Moodboard for the outdoor range", assignee: "gia", status: "In review" },
  { id: "s2", key: "SAO-006", title: "Sketch three logo directions", assignee: "emi", status: "In progress" },
  { id: "s3", key: "SAO-007", title: "Draft the tone-of-voice guide", assignee: "linh", status: "To do" },
];

function MoodboardExample() {
  const { toast } = useToast();
  const titleId = useId();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [approved, setApproved] = useState(false);
  const root = useRef<HTMLElement>(null);
  const moveFocus = useRef<"again" | "message" | "heading" | null>(null);
  // Focus follows what changed: Show message again, the message's Review action, or the ListBox title once the message
  // is gone (approved). It runs a frame later, after the Dialog has handed focus back.
  useEffect(() => {
    const target = moveFocus.current;
    if (!target) return undefined;
    const frame = requestAnimationFrame(() => {
      moveFocus.current = null;
      if (target === "again") root.current?.querySelector<HTMLElement>("[data-again]")?.focus();
      if (target === "message") root.current?.querySelector<HTMLElement>(".zen-inline-message__action")?.focus();
      if (target === "heading") document.getElementById(titleId)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [hidden, open, approved, titleId]);
  const approve = () => {
    moveFocus.current = "heading";
    setApproved(true);
    // Undo's toast closes as it runs, so focus moves to the message's Review again.
    toast({ title: "Moodboard approved", action: { label: "Undo", onClick: () => { moveFocus.current = "message"; setApproved(false); } } });
  };
  const hide = () => { moveFocus.current = "again"; setHidden(true); };
  const showAgain = () => { moveFocus.current = "message"; setHidden(false); };
  const rows = brandTasks.map((task) => task.id === "s1" && approved ? { ...task, status: "Done" as const } : task);
  return (
    <>
      {/* A ListBox: the title and the message about its rows in the Header-Slot (16px apart), the tasks in the Body-Slot. */}
      <ListBox ref={root} as="section" aria-labelledby={titleId} width="fill" maxWidth={480}
        header={<>
          <Stack gap="2xs">
            <Heading level={4} id={titleId} tabIndex={-1} textStyle="Heading/Subheading">Brand refresh</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Saola Outdoor · Kickoff {formatDate(daysFromToday(12))}</Text>
          </Stack>
          {approved ? null : hidden ? (
            <Stack align="start"><Button level="tertiary" data-again="" onClick={showAgain}>Show message again</Button></Stack>
          ) : (
            <InlineMessage theme="custom" icon={<Thumbnail src={moodboard[0].src} alt="" size="md" />}
              title="Gia’s moodboard is ready for review" action={{ label: "Review", onClick: () => setOpen(true) }} onClose={hide}>
              Saola Outdoor sees it on Friday, so leave your notes before then.
            </InlineMessage>
          )}
        </>}>
        <List aria-labelledby={titleId}>
          {rows.map((task) => (
            <ListItem key={task.id} title={task.title} titleLines={2} caption={`${task.key} · ${people[task.assignee].name}`}
              trailing={<Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge>} />
          ))}
        </List>
      </ListBox>
      <Dialog open={open} onOpenChange={(next) => { if (!next && !moveFocus.current) moveFocus.current = "message"; setOpen(next); }} title="Moodboard for the outdoor range"
        description={`Gia Pham · ${plural(moodboard.length, "photo")} · updated ${formatRelative(daysFromToday(0, 10, 17)).toLowerCase()}`}
        primaryAction={{ label: "Approve moodboard", onClick: () => { setOpen(false); approve(); } }} secondaryAction={{ label: "Close" }}>
        <Grid columns={2} gap="xs">
          {moodboard.map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} ratio="4:3" radius="md" />)}
        </Grid>
      </Dialog>
    </>
  );
}

/* ───────────── 5. Timesheet on a phone ───────────── */

type Day = { id: string; day: string; minutes: number; projects: string };
const weekday = (offset: number) => { const d = daysFromToday(offset); return `${d.toLocaleString("en-US", { weekday: "long" })}, ${formatDay(d)}`; };
const hours = (minutes: number) => `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`;
const totalOf = (days: Day[]) => days.reduce((sum, day) => sum + day.minutes, 0);
/** Alex's weeks, newest first. Last week (Sep 21 – Sep 25) is the one to submit, and its Tuesday has no hours. */
const thisWeek: Day[] = [
  { id: "sep28", day: weekday(-2), minutes: 480, projects: "Online banking redesign · Zen design system" },
  { id: "sep29", day: weekday(-1), minutes: 450, projects: "Online banking redesign" },
  { id: "sep30", day: weekday(0), minutes: 120, projects: "Zen design system" },
];
const lastWeek: Day[] = [
  { id: "sep21", day: weekday(-9), minutes: 480, projects: "Online banking redesign · Zen design system" },
  { id: "sep22", day: weekday(-8), minutes: 0, projects: "No hours logged" },
  { id: "sep23", day: weekday(-7), minutes: 450, projects: "Online banking redesign" },
  { id: "sep24", day: weekday(-6), minutes: 510, projects: "Online banking redesign · Loyalty app" },
  { id: "sep25", day: weekday(-5), minutes: 420, projects: "Zen design system" },
];
const approvedWeek: Day[] = [
  { id: "sep14", day: weekday(-16), minutes: 510, projects: "Online banking redesign · Zen design system" },
  { id: "sep15", day: weekday(-15), minutes: 480, projects: "Zen design system" },
  { id: "sep16", day: weekday(-14), minutes: 450, projects: "Online banking redesign · Loyalty app" },
  { id: "sep17", day: weekday(-13), minutes: 480, projects: "Online banking redesign" },
  { id: "sep18", day: weekday(-12), minutes: 390, projects: "Brand refresh pitch" },
];
type Sheet = "draft" | "blocked" | "submitted";

/** One week of a grouped list: a kicker with its total, then its days in a white block on the Surface-Alt screen. */
function WeekSection({ title, days, children }: { title: string; days: Day[]; children?: ReactNode }) {
  const id = useId();
  return (
    <Stack as="section" gap="md" aria-labelledby={id}>
      {children}
      <Stack gap="xs">
        {/* The kicker lines up with the row text inside the block (lg, the block's 20px). */}
        <Box paddingX="lg">
          <Stack direction="row" justify="between" align="baseline" gap="md">
            <Heading level={2} id={id} textStyle="Body/Small/Bold" tone="light">{title}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{hours(totalOf(days))}</Text>
          </Stack>
        </Box>
        {/* The days only show their hours (Interactive=No rows, no side padding of their own): the ListBox pads them. */}
        <ListBox>
          <List aria-labelledby={id}>
            {days.map((day) => (
              <ListItem key={day.id} title={day.day} caption={day.projects}
                trailing={<Text as="span" textStyle="Body/Base/Medium" tone={day.minutes ? "strongest" : "light"}>{hours(day.minutes)}</Text>} />
            ))}
          </List>
        </ListBox>
      </Stack>
    </Stack>
  );
}

/** The roots of the studio's phone app, in its bottom bar: a selected root shows its solid icon. */
const phoneRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const sheetBadge: Record<Sheet, { theme: "yellow" | "green"; label: string }> = {
  draft: { theme: "yellow", label: "To submit" },
  blocked: { theme: "yellow", label: "To submit" },
  submitted: { theme: "green", label: "Submitted" },
};

function TimesheetPhoneExample() {
  const { toast } = useToast();
  const notHere = useNotHere();
  const screen = usePhoneScreen();
  const workId = useId();
  const accountId = useId();
  const screenRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(true);
  const [days, setDays] = useState(lastWeek);
  const [sheet, setSheet] = useState<Sheet>("draft");
  const focusNext = useRef<string | null>(null);
  useEffect(() => {
    const selector = focusNext.current;
    focusNext.current = null;
    if (selector) screenRef.current?.closest(".platform-phone")?.querySelector<HTMLElement>(selector)?.focus();
  });
  const missing = days.filter((day) => day.minutes === 0);
  // Submitting with a gap escalates the same message (Warning → Negative) instead of adding a second one.
  const submit = () => {
    if (missing.length) { focusNext.current = ".zen-inline-message__action"; setSheet("blocked"); return; }
    focusNext.current = ".zen-action-bar button";
    setSheet("submitted");
    toast({ type: "positive", title: "Timesheet submitted", children: `Last week · ${hours(totalOf(days))}` });
  };
  const logHours = () => {
    focusNext.current = ".zen-action-bar button";
    setDays((list) => list.map((day) => day.minutes === 0 ? { ...day, minutes: 450, projects: "Loyalty app" } : day));
    setSheet("draft");
  };
  const recall = () => { focusNext.current = ".zen-action-bar button"; setSheet("draft"); };
  const badge = sheetBadge[sheet];

  if (!open) {
    return (
      // The Me root: the large title, Alex's profile, then his work and his account in white blocks under their kickers,
      // the app's roots in the bottom bar. The bar casts a shadow, so every block takes the same Shadow elevation.
      <PlatformPhone key="me" label="Zen app" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation title="Me" largeTitle="Me" largeTitleSubheading={`${me.role} · ${studio.name}`} scrollRef={screenRef} />}
          bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="me"
            onValueChange={(id) => { if (id !== "me") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
        >
          {screen.anchor}
          {/* Alex's profile first: the whole row opens it. */}
          <ListBox theme="shadow">
            <List aria-label="Profile">
              <ListItem title={me.name} caption={`${me.email} · ${me.location}`}
                leading={<Avatar size="lg" theme="photo" src={me.photo} alt="" />} onClick={() => notHere("Profile")} />
            </List>
          </ListBox>
          <Stack as="section" gap="xs" aria-labelledby={workId}>
            <Box paddingX="lg"><Heading level={2} id={workId} textStyle="Body/Small/Bold" tone="light">Work</Heading></Box>
            <ListBox theme="shadow">
              <List aria-labelledby={workId}>
                <ListItem data-row="timesheet" title="Timesheet" caption={`Last week · ${hours(totalOf(days))}`}
                  leading={<DockIcon icon="icon-clock-line" theme="blue" background="subtle" size="medium" />}
                  trailing={<Badge theme={badge.theme} background="subtle">{badge.label}</Badge>}
                  onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpen(true))} />
                <ListItem title="Time off" caption={`${leaveBalance["Annual leave"]?.left ?? 0} days of annual leave left`}
                  leading={<DockIcon icon="icon-calendar-heart-line" theme="green" background="subtle" size="medium" />} onClick={() => notHere("Time off")} />
                <ListItem title="Expenses" caption="Nothing waiting for approval"
                  leading={<DockIcon icon="icon-wallet-02-line" theme="orange" background="subtle" size="medium" />} onClick={() => notHere("Expenses")} />
              </List>
            </ListBox>
          </Stack>
          <Stack as="section" gap="xs" aria-labelledby={accountId}>
            <Box paddingX="lg"><Heading level={2} id={accountId} textStyle="Body/Small/Bold" tone="light">Account</Heading></Box>
            <ListBox theme="shadow">
              <List aria-labelledby={accountId}>
                <ListItem title="Notifications" caption="Email and push on this phone"
                  leading={<DockIcon icon="icon-bell-01-line" theme="purple" background="subtle" size="medium" />} onClick={() => notHere("Notifications")} />
                <ListItem title="Sign out" caption={`Signed in as ${me.email}`}
                  leading={<DockIcon icon="icon-log-out-01-line" theme="neutral" background="subtle" size="medium" />}
                  onClick={() => toast({ title: "Signed out", children: `See you soon, ${me.name.split(" ")[0]}.` })} />
              </List>
            </ListBox>
          </Stack>
        </AppShell>
      </PlatformPhone>
    );
  }

  return (
    // A pushed screen, a grouped list: each week is a white block under its kicker on the grey Canvas (no frame). Last
    // week's one action sits in the Action bar (Figma Bottom=Actions), so the screen has no bottom bar.
    <PlatformPhone key="timesheet" label="Zen app" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title="Timesheet" scrollRef={screenRef}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go('[data-row="timesheet"] .zen-list-item__wrapper', () => setOpen(false)) }} />}
        actionBar={(
          <ActionBar
            summary={<Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{`Last week · ${hours(totalOf(days))}`}</Text>}
            {...(sheet === "submitted"
              ? { secondaryAction: { label: "Recall timesheet", onClick: recall } }
              : { primaryAction: { label: "Submit timesheet", onClick: submit } })} />
        )}
      >
        {screen.anchor}
        <WeekSection title="This week" days={thisWeek} />
        {/* The message sits right above the week it is about, as wide as its block. */}
        <WeekSection title="Last week" days={days}>
          {sheet === "submitted" ? (
            <InlineMessage theme="positive" title="Timesheet submitted">Duy Le approves it by Friday, Oct 2.</InlineMessage>
          ) : missing.length ? (
            <InlineMessage theme={sheet === "blocked" ? "negative" : "warning"} title="Tuesday has no hours"
              action={{ label: "Log hours", onClick: logHours }}>
              {sheet === "blocked" ? "Log them, then submit again." : "Log them before you submit last week."}
            </InlineMessage>
          ) : null}
        </WeekSection>
        <WeekSection title={formatRange(daysFromToday(-16), daysFromToday(-12))} days={approvedWeek} />
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Editing a sent invoice",
    description: "Alex edits an invoice Phin & Co already has, in the studio's app. A Warning at the top of the form says what saving will do before anyone types; it is essential context, so it has no close button and stays while the form is open. Beside the form, the line items and the history (Trang Le asked for the PO number) say why the edit happens, and saving adds the new copy to it.",
    wide: true,
    screen: true,
    render: () => <SentInvoiceExample />,
    code: `const form = useFormState({
  initialValues: { terms: "net30", po: "", note: "" },
  validate: ({ note }) => ({ note: note.trim() ? undefined : "Tell Phin & Co what changed" }),
  onSubmit: (values, { reset }) => {
    reset(values);
    toast({ title: "Updated invoice sent", children: "Phin & Co got the new copy by email" });
  },
});

<AppShell
  sidebar={<Sidebar logo={logo} sections={studioNav} selectedId="invoices" onItemClick={navigate} />}
  header={
    <AppShellHeader
      leading={<Breadcrumbs master={false} items={[{ id: "invoices", label: "Invoices" }, { id: "i1", label: "INV-2026-0142" }]} onNavigate={go} />}
      actions={<>{notifications}{account}</>}
      main={<PageHeader title="Edit INV-2026-0142" meta={<Badge theme="blue" background="subtle">Sent</Badge>}
        description="Phin & Co · Loyalty app · Issued Sep 25, 2026" />}
    />
  }
>
  <Grid columns="minmax(0, 1fr) minmax(0, 320px)" stackBelow={880} gap="md" align="start">
    <Card theme="shadow">
      <Form form={form}>
        <InlineMessage theme="warning" title="Phin & Co already has this invoice">
          Saving emails them the updated copy with your note about what changed.
        </InlineMessage>
        <SelectField label="Payment terms" options={terms} {...form.selectField("terms")} />
        <InputField label="Purchase order" labelOptional helpText="Trang Le asked for PHIN-PO-0915 on Sep 29" {...form.field("po")} />
        <TextAreaField label="Note to Phin & Co" helpText="Shown at the top of the email" {...form.field("note")} />
        <FormActions>
          <Button level="primary" type="submit">Save and send</Button>
        </FormActions>
      </Form>
    </Card>
    {/* Line items (Card) and History (ListBox), Shadow like every box beside the Sidebar */}
  </Grid>
</AppShell>`,
  },
  {
    title: "Form error summary",
    description: "After a failed submit, a Negative summary above the fields counts what is left to fix while each field keeps its own error, and focus moves to the first one. The count drops as fields are fixed and the summary leaves with the last error.",
    render: () => <ErrorSummaryExample />,
    code: `const form = useFormState({ initialValues: { company: "", contact: "", email: "" }, validate, onSubmit: addClient });
const count = Object.keys(form.errors).length;

<Form form={form} gap="md">
  {form.submitCount > 0 && count > 0 ? (
    <InlineMessage theme="negative" title={\`Fix \${plural(count, "field")} to add the client\`}>
      Each field below says what’s missing.
    </InlineMessage>
  ) : null}
  <InputField label="Company name" {...form.field("company")} />
  <InputField label="Billing contact" {...form.field("contact")} />
  <InputField label="Billing email" type="email" {...form.field("email")} />
  <FormActions><Button level="primary" type="submit">Add client</Button></FormActions>
</Form>`,
  },
  {
    title: "Verify a domain",
    description: "The check's result stays next to the records it is about, in one slot whose theme follows the check: Info while it runs, Negative with Check again when the record is missing, Positive once it is found.",
    render: () => <VerifyDomainExample />,
    code: `{check === "checking" ? (
  <InlineMessage theme="info" title="Checking dizai.studio…">This takes a few seconds.</InlineMessage>
) : check === "failed" ? (
  <InlineMessage theme="negative" title="No TXT record found yet" action={{ label: "Check again", onClick: verify }}>
    New records can take up to an hour to show up. Check the value, then try again.
  </InlineMessage>
) : check === "verified" ? (
  <InlineMessage theme="positive" title="dizai.studio is verified">
    Invoices and client emails now go out from billing@dizai.studio.
  </InlineMessage>
) : null}
{check === "idle" ? (
  <Stack direction="row" justify="end">
    <Button level="primary" onClick={verify}>Verify domain</Button>
  </Stack>
) : null}`,
  },
  {
    title: "Moodboard to review",
    description: "Theme Custom takes your own visual, here a thumbnail of the moodboard it announces. Review opens it; approving resolves the message, and closing it leaves Show message again in its place.",
    render: () => <MoodboardExample />,
    code: `{hidden ? (
  <Button level="tertiary" onClick={() => setHidden(false)}>Show message again</Button>
) : (
  <InlineMessage
    theme="custom"
    icon={<Thumbnail src={moodboardCover} alt="" size="md" />}
    title="Gia’s moodboard is ready for review"
    action={{ label: "Review", onClick: () => setOpen(true) }}
    onClose={() => setHidden(true)}
  >
    Saola Outdoor sees it on Friday, so leave your notes before then.
  </InlineMessage>
)}
<Dialog open={open} onOpenChange={setOpen} title="Moodboard for the outdoor range"
  primaryAction={{ label: "Approve moodboard", onClick: approve }} secondaryAction={{ label: "Close" }}>
  <Grid columns={2} gap="xs">{photos.map((photo) => <Image key={photo.src} {...photo} ratio="4:3" />)}</Grid>
</Dialog>`,
  },
  {
    title: "Timesheet on a phone",
    description: "In the studio's phone app Alex opens last week's timesheet from Me. The message sits in the page flow, right above the week it is about; each week is a white block under its kicker on the grey Canvas, and Submit waits in the Action bar. Submitting with a gap turns the same Warning Negative and focuses Log hours, rather than stacking a second message; Back shows the Me row with the new status.",
    render: () => <TimesheetPhoneExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="timesheet" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="compact-alt" title="Timesheet" scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToMe }} />}
    actionBar={<ActionBar summary={\`Last week · \${hours(total)}\`}
      primaryAction={{ label: "Submit timesheet", onClick: submit }} />}
  >
    {/* The Body pads the screen and spaces the weeks Layout-Mobile/Section-Gap apart */}
    <WeekSection title="This week" days={thisWeek} />
    <Stack as="section" gap="md" aria-labelledby="last-week">
      {missing.length ? (
        <InlineMessage theme={blocked ? "negative" : "warning"} title="Tuesday has no hours"
          action={{ label: "Log hours", onClick: logHours }}>
          {blocked ? "Log them, then submit again." : "Log them before you submit last week."}
        </InlineMessage>
      ) : null}
      <Stack gap="xs">
        {/* The kicker lines up with the row text inside the block */}
        <Box paddingX="lg">
          <Heading level={2} id="last-week" textStyle="Body/Small/Bold" tone="light">Last week</Heading>
        </Box>
        {/* One white block per week on the grey Canvas */}
        <ListBox>
          <List aria-labelledby="last-week">
            {days.map((day) => <ListItem key={day.id} title={day.day} caption={day.projects} trailing={hours(day.minutes)} />)}
          </List>
        </ListBox>
      </Stack>
    </Stack>
    <WeekSection title="Sep 14 – Sep 18, 2026" days={approvedWeek} />
  </AppShell>
</PlatformPhone>`,
  },
]);

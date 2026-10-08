import { useId, useRef, useState, type KeyboardEvent } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Checkbox } from "../../../components/Checkbox";
import { DescriptionList } from "../../../components/DescriptionList";
import { Divider } from "../../../components/Divider";
import { DockIcon } from "../../../components/DockIcon";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import { InputField, SelectField } from "../../../components/Input";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { PageHeader } from "../../../components/PageHeader";
import { Heading, Text } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { files, formatBytes, formatMoney, formatRelative, formatTime, daysFromToday, people, projects, studio } from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./divider.css";

export const page: PlatformPage = "divider";

// ——— Data ————————————————————————————————————————————————————————————————————————————————————

type StudioSettings = { name: string; website: string; timeZone: string; reminders: boolean; lockTimesheets: boolean; rounding: string; terms: string; prefix: string };
const initialSettings: StudioSettings = { name: studio.name, website: studio.domain, timeZone: "hcmc", reminders: true, lockTimesheets: false, rounding: "15", terms: "30", prefix: "INV-2026-" };
const timeZones = [{ value: "hcmc", label: "Ho Chi Minh City (GMT+7)" }, { value: "sg", label: "Singapore (GMT+8)" }];
const roundings = [{ value: "0", label: "Don't round" }, { value: "5", label: "5 minutes" }, { value: "15", label: "15 minutes" }, { value: "30", label: "30 minutes" }];
const paymentTerms = [{ value: "15", label: "Due in 15 days" }, { value: "30", label: "Due in 30 days" }, { value: "45", label: "Due in 45 days" }];

const chi = people.chi;
const chiProjects = projects.filter((project) => project.members.includes("chi")).slice(0, 2);

/** Ava's usability plan, one line per page, for the file viewer. */
const plan = files.find((file) => file.id === "f2")!;
const planPages = [
  "Why we are testing: transfers are the most-used task in Lumen Bank's app and the one people abandon most.",
  "Who we will talk to: five customers who sent money in the last month, two of them over 60.",
  "Tasks: send money to a saved recipient, add a new recipient, and change a daily limit.",
  "Script for the first transfer: start on the home screen and think aloud while you send $50.",
  "Script for saved recipients: find your landlord and send this month's rent.",
  "Script for transfer limits: raise your daily limit for a one-off payment.",
  "What we will measure: task success, time on task and every moment of hesitation.",
  "Schedule: sessions on Oct 6 and Oct 7, 45 minutes each, in the Hanoi studio.",
  "Consent and recording: participants sign the consent form before the camera starts.",
  "Roles on the day: Ava moderates, Alex takes notes, Hana looks after the client team.",
  "Reporting: findings in Zen by Oct 9, with clips for the three biggest issues.",
  "Appendix: the screener and the consent form.",
];
const zoomLevels = [75, 100, 125, 150];

/** Alex's Phin & Co orders in the loyalty app the studio builds, newest first (orders are numbered A-248, A-249…). */
const menu = {
  phin: { name: "Phin sữa đá", price: 2.6 }, bacxiu: { name: "Bạc xỉu", price: 2.8 }, banhmi: { name: "Bánh mì chả cá", price: 2.4 },
  coconut: { name: "Cà phê dừa", price: 3.1 }, coldbrew: { name: "Cold brew", price: 3.2 }, salt: { name: "Cà phê muối", price: 3 },
  peach: { name: "Trà đào cam sả", price: 3.2 }, cake: { name: "Bánh bông lan trứng muối", price: 2.5 },
};
type MenuId = keyof typeof menu;
type PhinOrder = { id: string; store: string; at: Date; items: MenuId[] };
const phinOrders: PhinOrder[] = [
  { id: "A-247", store: "Phin & Co Nguyen Hue", at: daysFromToday(0, 10, 12), items: ["phin", "bacxiu", "banhmi"] },
  { id: "A-231", store: "Phin & Co Nguyen Hue", at: daysFromToday(-1, 8, 5), items: ["phin"] },
  { id: "A-219", store: "Phin & Co Thao Dien", at: daysFromToday(-3, 15, 40), items: ["coldbrew", "cake"] },
  { id: "A-204", store: "Phin & Co Nguyen Hue", at: daysFromToday(-5, 7, 52), items: ["salt"] },
  { id: "A-196", store: "Phin & Co Ben Thanh", at: daysFromToday(-6, 12, 20), items: ["peach", "banhmi"] },
  { id: "A-183", store: "Phin & Co Nguyen Hue", at: daysFromToday(-8, 8, 10), items: ["phin", "banhmi"] },
  { id: "A-170", store: "Phin & Co Thao Dien", at: daysFromToday(-10, 16, 15), items: ["coconut"] },
  { id: "A-158", store: "Phin & Co Nguyen Hue", at: daysFromToday(-12, 8, 2), items: ["bacxiu"] },
  { id: "A-141", store: "Phin & Co Ben Thanh", at: daysFromToday(-14, 13, 5), items: ["coldbrew", "phin", "cake"] },
  { id: "A-127", store: "Phin & Co Nguyen Hue", at: daysFromToday(-15, 7, 48), items: ["phin"] },
  { id: "A-112", store: "Phin & Co Thao Dien", at: daysFromToday(-17, 15, 30), items: ["salt", "banhmi"] },
  { id: "A-098", store: "Phin & Co Nguyen Hue", at: daysFromToday(-19, 8, 15), items: ["bacxiu", "banhmi"] },
  { id: "A-085", store: "Phin & Co Ben Thanh", at: daysFromToday(-22, 11, 40), items: ["peach"] },
  { id: "A-071", store: "Phin & Co Nguyen Hue", at: daysFromToday(-24, 8, 20), items: ["phin", "coconut"] },
];
/** Members get 10% off and earn 10 points per $1 paid. */
const totalsOf = (order: PhinOrder) => {
  const subtotal = order.items.reduce((sum, id) => sum + menu[id].price, 0);
  const discount = Math.round(subtotal * 10) / 100;
  return { subtotal, discount, paid: subtotal - discount, points: Math.round((subtotal - discount) * 10) };
};
/** The points balance after an order: today's 1,240 points minus what the later orders earned. */
const balanceAfter = (order: PhinOrder) => 1240 - phinOrders.slice(0, phinOrders.indexOf(order)).reduce((sum, later) => sum + totalsOf(later).points, 0);

// ——— Examples ————————————————————————————————————————————————————————————————————————————————

/** Section intro in the left column of an annotated settings layout. */
function SectionIntro({ title, children }: { title: string; children: string }) {
  return (
    <Stack gap="xs">
      <Heading level={2}>{title}</Heading>
      <Text textStyle="Body/Small/Regular" tone="base">{children}</Text>
    </Stack>
  );
}

/** Each settings section: its heading beside the fields on a desktop, above them on a phone. */
const sectionColumns = { mobile: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" } as const;

/** Default dividers between the sections of a settings page; save at the bottom, not in the header. */
function StudioSettingsExample() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(initialSettings);
  const [draft, setDraft] = useState(initialSettings);
  const [nameError, setNameError] = useState<string>();
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <K extends keyof StudioSettings>(key: K, value: StudioSettings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  // Save and Cancel go quiet once nothing is left to save, so focus moves back to the top of the form, not to <body>.
  const backToTop = () => window.requestAnimationFrame(() => firstFieldRef.current?.focus());
  const save = () => {
    if (!draft.name.trim()) { setNameError("Enter the studio name"); return; }
    setNameError(undefined);
    setSaved(draft);
    toast({ type: "positive", title: "Settings saved" });
    backToTop();
  };
  const discard = () => { setDraft(saved); setNameError(undefined); backToTop(); };
  return (
    <Container maxWidth="md" className="px-divider-settings">
      <Stack paddingY="xl" gap="xl">
        <PageHeader title="Studio settings" description={`These apply to everyone in the ${studio.workspace}.`} />
        <Form onSubmit={save} gap="xl" aria-label="Studio settings">
          <Grid className="px-divider-section" columns={sectionColumns} gap="lg" align="start">
            <SectionIntro title="Studio profile">How the studio appears on invoices and in the client portal.</SectionIntro>
            <Stack gap="md">
              <InputField ref={firstFieldRef} label="Studio name" value={draft.name} onValueChange={(value) => set("name", value)} error={nameError} />
              <InputField label="Website" value={draft.website} onValueChange={(value) => set("website", value)} />
              <SelectField label="Time zone" options={timeZones} value={draft.timeZone} onValueChange={(value) => set("timeZone", value)} />
            </Stack>
          </Grid>
          <Divider />
          <Grid className="px-divider-section" columns={sectionColumns} gap="lg" align="start">
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
          <Grid className="px-divider-section" columns={sectionColumns} gap="lg" align="start">
            <SectionIntro title="Invoices">Defaults for every new invoice. You can change them per invoice.</SectionIntro>
            <Stack gap="md">
              <SelectField label="Payment terms" options={paymentTerms} value={draft.terms} onValueChange={(value) => set("terms", value)} />
              <InputField label="Invoice number prefix" value={draft.prefix} onValueChange={(value) => set("prefix", value)} helpText={`Next invoice: ${draft.prefix}0144`} />
            </Stack>
          </Grid>
          <FormActions>
            <Button level="tertiary" disabled={!dirty} onClick={discard}>Cancel</Button>
            <Button level="primary" type="submit" disabled={!dirty}>Save changes</Button>
          </FormActions>
        </Form>
      </Stack>
    </Container>
  );
}

/** Inside a card, spacing groups most things; a divider only where two groups would blur, never at the card's edges. */
function ProfileCardExample() {
  const { toast } = useToast();
  const titleId = useId();
  const copyEmail = () => {
    void navigator.clipboard?.writeText(chi.email).catch(() => undefined);
    toast({ title: "Email copied", children: chi.email });
  };
  return (
    <Card theme="flat" as="article" aria-labelledby={titleId}>
      {/* The person, their details and their projects are groups of one surface (lg); the avatar keeps the gap a List
          row keeps between its leading visual and its text (md). */}
      <Stack gap="lg">
        <Stack direction="row" gap="md">
          <Avatar size="large" theme="photo" src={chi.photo} alt="" />
          <Stack gap="xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{chi.name}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`${chi.role} · ${chi.team}`}</Text>
          </Stack>
        </Stack>
        <Divider />
        <DescriptionList items={[
          { id: "email", term: "Email", description: chi.email, action: <IconButton appearance="flat" level="primary" size="sm" icon="icon-copy-line" aria-label="Copy email" onClick={copyEmail} /> },
          { id: "location", term: "Location", description: chi.location },
          { id: "time", term: "Local time", description: formatTime(daysFromToday(0)) },
        ]} divider />
        <Divider />
        <Stack gap="xs">
          <Heading level={5} textStyle="Body/Small/Bold" tone="light">Projects</Heading>
          <List aria-label={`${chi.name}'s projects`}>
            {chiProjects.map((project) => (
              <ListItem key={project.id} leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" size="medium" />} title={project.name}
                caption={`${project.client} · ${project.lead === chi.id ? "Lead" : "Member"}`} />
            ))}
          </List>
        </Stack>
      </Stack>
    </Card>
  );
}

/** Vertical, decorative dividers between labelled toolbar groups; arrow keys move along the toolbar. */
function FileToolbarExample() {
  const { toast } = useToast();
  const [zoom, setZoom] = useState(100);
  const [pageNo, setPageNo] = useState(3);
  const [sharing, setSharing] = useState(false);
  const step = (delta: number) => setZoom((current) => zoomLevels[Math.min(zoomLevels.length - 1, Math.max(0, zoomLevels.indexOf(current) + delta))]);
  // APG toolbar: ← → move between the buttons, Home / End jump to the first and last.
  const arrows = (event: KeyboardEvent<HTMLElement>) => {
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")];
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: buttons.length - 1 }[event.key];
    if (next === undefined || index < 0) return;
    event.preventDefault();
    buttons[(next + buttons.length) % buttons.length]?.focus();
  };
  return (
    <Card theme="flat" spacing="sm">
      <Stack gap="md" className="px-divider-file">
        {/* On a narrow screen the zoom group and its divider step aside (people pinch to zoom there), so a divider never
            wraps onto the end of a line. */}
        <Stack direction="row" gap="xs" role="toolbar" aria-label={plan.name} onKeyDown={arrows} paddingY="2xs" className="px-divider-toolbar">
          <Stack direction="row" gap="2xs" role="group" aria-label="Zoom" className="px-divider-zoom">
            <IconButton size="sm" icon="icon-zoom-out-line" aria-label="Zoom out" disabled={zoom === zoomLevels[0]} onClick={() => step(-1)} />
            <Text as="span" textStyle="Body/Small/Medium" className="px-divider-readout" aria-live="polite">{`${zoom}%`}</Text>
            <IconButton size="sm" icon="icon-zoom-in-line" aria-label="Zoom in" disabled={zoom === zoomLevels[zoomLevels.length - 1]} onClick={() => step(1)} />
          </Stack>
          <Divider orientation="vertical" decorative className="px-divider-zoom" />
          <Stack direction="row" gap="2xs" role="group" aria-label="Pages">
            <IconButton size="sm" icon="icon-chevron-left-line" aria-label="Previous page" disabled={pageNo === 1} onClick={() => setPageNo(pageNo - 1)} />
            <Text as="span" textStyle="Body/Small/Medium" className="px-divider-readout" aria-live="polite">{`${pageNo} of ${planPages.length}`}</Text>
            <IconButton size="sm" icon="icon-chevron-right-line" aria-label="Next page" disabled={pageNo === planPages.length} onClick={() => setPageNo(pageNo + 1)} />
          </Stack>
          <Divider orientation="vertical" decorative />
          <Stack direction="row" gap="2xs" role="group" aria-label="File">
            <IconButton size="sm" icon="icon-download-01-line" aria-label="Download" onClick={() => toast({ title: "Download started", children: `${plan.name} · ${formatBytes(plan.bytes)}` })} />
            <IconButton size="sm" icon="icon-share-01-line" aria-label="Share" onClick={() => setSharing(true)} />
          </Stack>
        </Stack>
        <Divider />
        {/* The page scales with the zoom; its text re-wraps to the card, so it never scrolls sideways. */}
        <Box className="px-divider-sheet" data-zoom={zoom}>
          <Stack gap="xs">
            <Text textStyle="Caption/Regular" tone="light">{`Usability plan · page ${pageNo}`}</Text>
            <Text>{planPages[pageNo - 1]}</Text>
          </Stack>
        </Box>
      </Stack>
      <DemoFieldDialog open={sharing} onOpenChange={setSharing} title={`Share “${plan.name}”`} description="They can view and comment on the file."
        field={{ kind: "email", label: "Email address", placeholder: "name@company.com" }} submitLabel="Share" confirm={(email) => `Shared with ${email}`} />
    </Card>
  );
}

/** A labelled separator: the word sits between two decorative lines. */
function SignInExample() {
  const { toast } = useToast();
  const titleId = useId();
  const againRef = useRef<HTMLButtonElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState("");
  const submit = () => {
    const value = email.trim();
    // Form moves focus to the field once the error renders.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) { setError("Enter an email address like name@company.com"); return; }
    setError(undefined);
    setSentTo(value);
    window.requestAnimationFrame(() => againRef.current?.focus());
  };
  return (
    <Card theme="flat">
      {sentTo ? (
        // The sent state replaces the form: what happened, then the one way back.
        <Stack gap="md">
          <Stack gap="xs" role="status">
            <Heading level={4} textStyle="Heading/Subheading">Check your inbox</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{`We sent a sign-in link to ${sentTo}. It works for 15 minutes.`}</Text>
          </Stack>
          {/* The form comes back in its place, so focus goes to its empty field, not to <body>. */}
          <Button ref={againRef} level="tertiary" onClick={() => { setSentTo(""); setEmail(""); window.requestAnimationFrame(() => emailRef.current?.focus()); }}>Use another email</Button>
        </Stack>
      ) : (
        <Form onSubmit={submit} gap="md" aria-labelledby={titleId}>
          <Stack gap="xs">
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{`Sign in to ${studio.name}`}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Studio staff use SSO; clients sign in with the email we invited.</Text>
          </Stack>
          {/* SSO spans the card like the stacked email action under the field. */}
          <Stack align="stretch">
            <Button level="tertiary" size="lg" startIcon="icon-key-line" onClick={() => toast({ title: "SSO window opened", children: "Finish signing in with your studio account." })}>Continue with SSO</Button>
          </Stack>
          <Stack direction="row" gap="xs">
            <Divider decorative />
            <Text as="span" textStyle="Body/Small/Regular" tone="base">or</Text>
            <Divider decorative />
          </Stack>
          <InputField ref={emailRef} label="Email" type="email" autoComplete="email" value={email} onValueChange={setEmail} error={error} />
          {/* In a card narrower than 480px FormActions stacks its button full width, Large. */}
          <FormActions><Button level="primary" type="submit">Continue with email</Button></FormActions>
        </Form>
      )}
    </Card>
  );
}

/** Phone receipt, pushed from the order history: Default dividers between its blocks, a dashed tear line before the
    loyalty stub. */
function MobileReceiptExample() {
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [openId, setOpenId] = useState<string | null>(phinOrders[0].id);
  const [emailing, setEmailing] = useState(false);
  const order = phinOrders.find((candidate) => candidate.id === openId);

  // Each screen is its own PlatformPhone (key): it opens at the top and its bar measures the fold again.
  if (!order) {
    return (
      <PlatformPhone key="orders" label="Phin & Co orders" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="Orders" largeTitle="Orders" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* Rows pad 0 at the sides: the screen's margin (lg) insets them, and sm above and below keeps the first and last fills clear. */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Orders">
            {phinOrders.map((row) => (
              <ListItem key={row.id} data-order={row.id} leading={<DockIcon icon="icon-coffee-cup-line" theme="orange" background="subtle" size="medium" />}
                title={row.store} caption={`${formatRelative(row.at)} · Order ${row.id}`}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(totalsOf(row).paid, true)}</Text>}
                onClick={() => screen.go('.zen-top-nav__action[aria-label="Back"]', () => setOpenId(row.id))} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }

  const { subtotal, discount, paid, points } = totalsOf(order);
  return (
    <PlatformPhone key={order.id} label="Phin & Co receipt" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title="Receipt" scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => screen.go(`[data-order="${order.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}
      footer={<ActionBar position="static" primaryAction={{ label: "Email receipt", onClick: () => setEmailing(true) }} />}>
      {screen.anchor}
      {/* Body padding lg (20) = the bar's margin; the store, the items and the stub are sections of the screen (lg). */}
      <Stack paddingX="lg" paddingY="lg" gap="lg">
        {/* The store is a List row with no side padding of its own, so the screen's lg puts it level with the items. */}
        <List aria-label="Store">
          {/* zen-detached: ListItem · Zen Studio */}
          <Stack as="li" direction="column" align="center" gap="md" paddingY="sm" justify="start">
            <DockIcon icon="icon-coffee-cup-line" theme="orange" background="subtle" size="2xl" />
            <Stack gap="2xs" style={{ flex: 1 }}>
              <Heading level={2} textStyle="Heading/2" truncate align="center">{order.store}</Heading>
              <Text as="span" textStyle="Body/Small/Regular" tone="light" align="center">
                {`${formatRelative(order.at)} · Order ${order.id}`}
              </Text>
            </Stack>
          </Stack>
        </List>
        <Divider />
        <DescriptionList items={[
          // A no-break space keeps "× 1" with its item when a long name wraps.
          ...order.items.map((id) => ({ id, term: `${menu[id].name}\u00a0×\u00a01`, description: formatMoney(menu[id].price, true) })),
          { id: "subtotal", term: "Subtotal", description: formatMoney(subtotal, true) },
          { id: "discount", term: "Member discount (10%)", description: `−${formatMoney(discount, true)}` },
          { id: "total", term: "Paid with Phin wallet", description: formatMoney(paid, true), emphasis: true },
        ]} />
        <Divider dashed decorative />
        <Stack gap="xs">
          <Text textStyle="Body/Base/Bold">{`You earned ${points} points`}</Text>
          <Text textStyle="Body/Small/Regular" tone="base">{`Balance after this order: ${balanceAfter(order).toLocaleString("en-US")} points`}</Text>
        </Stack>
      </Stack>
      <DemoFieldDialog open={emailing} onOpenChange={setEmailing} title="Email receipt" description={`Order ${order.id} at ${order.store}.`}
        field={{ kind: "email", label: "Email address", placeholder: "name@company.com" }} submitLabel="Send receipt" confirm={(email) => `Receipt sent to ${email}`} />
    </PlatformPhone>
  );
}

// ——— Page ————————————————————————————————————————————————————————————————————————————————————

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Settings sections",
    wide: true,
    screen: true,
    description: "Default dividers split a long settings page into its sections, each with a heading and a one-line purpose on the left. Cancel and Save changes sit under the last divider and wake up once something changes.",
    render: () => <StudioSettingsExample />,
    code: `<PageHeader title="Studio settings" description="These apply to everyone in the Đìzai Studio workspace." />
<Form onSubmit={save} gap="xl">
  {/* Heading beside the fields; stacked on a phone. */}
  <Grid columns={{ mobile: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} gap="lg" align="start">
    <SectionIntro title="Studio profile">How the studio appears on invoices and in the client portal.</SectionIntro>
    <Stack gap="md">
      <InputField label="Studio name" value={draft.name} onValueChange={(value) => set("name", value)} />
      <SelectField label="Time zone" options={timeZones} value={draft.timeZone} onValueChange={(value) => set("timeZone", value)} />
    </Stack>
  </Grid>
  <Divider />
  <Grid …>{/* Time tracking */}</Grid>
  <Divider />
  <Grid …>{/* Invoices */}</Grid>
  <Divider />
  <FormActions>
    <Button level="tertiary" disabled={!dirty} onClick={discard}>Cancel</Button>
    <Button level="primary" type="submit" disabled={!dirty}>Save changes</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Toolbar groups",
    description: "Vertical dividers split the zoom, page and file groups of a viewer toolbar, and a horizontal one sets the toolbar off from the page. The vertical ones are decorative because each group already has a name; ← and → move along the toolbar.",
    render: () => <FileToolbarExample />,
    code: `<Stack direction="row" gap="xs" role="toolbar" aria-label="Usability plan – transfers.pdf" onKeyDown={arrows}>
  <Stack direction="row" gap="2xs" role="group" aria-label="Zoom">
    <IconButton size="sm" icon="icon-zoom-out-line" aria-label="Zoom out" onClick={zoomOut} />
    <Text as="span" textStyle="Body/Small/Medium" aria-live="polite">{zoom}%</Text>
    <IconButton size="sm" icon="icon-zoom-in-line" aria-label="Zoom in" onClick={zoomIn} />
  </Stack>
  <Divider orientation="vertical" decorative />
  <Stack direction="row" gap="2xs" role="group" aria-label="Pages">…</Stack>
  <Divider orientation="vertical" decorative />
  <Stack direction="row" gap="2xs" role="group" aria-label="File">…</Stack>
</Stack>
<Divider />
<Box className="page" data-zoom={zoom}>{/* the page text */}</Box>`,
  },
  {
    title: "Labelled separator",
    description: "“or” sits between two decorative dividers that share the leftover width, so the word is read once and the lines are skipped.",
    render: () => <SignInExample />,
    code: `<Form onSubmit={submit} gap="md">
  <Heading level={4} textStyle="Heading/Subheading">Sign in to Đìzai Studio</Heading>
  <Button level="tertiary" size="lg" startIcon="icon-key-line" onClick={openSso}>Continue with SSO</Button>
  <Stack direction="row" gap="xs">
    <Divider decorative />
    <Text as="span" textStyle="Body/Small/Regular" tone="base">or</Text>
    <Divider decorative />
  </Stack>
  <InputField label="Email" type="email" value={email} onValueChange={setEmail} error={error} />
  <FormActions><Button level="primary" type="submit">Continue with email</Button></FormActions>
</Form>`,
  },
  {
    title: "Groups in a card",
    description: "Spacing does most of the grouping; a Default divider goes only between the person, their details and their projects, never at the top or bottom of the card.",
    render: () => <ProfileCardExample />,
    code: `<Card theme="flat">
  <Stack gap="lg">
    <Stack direction="row" gap="md">
      <Avatar size="large" theme="photo" src={chi.photo} alt="" />
      <Heading level={4} textStyle="Heading/Subheading">Chi Tran</Heading>
    </Stack>
    <Divider />
    <DescriptionList items={[{ term: "Email", description: "chi@dizai.studio", action: copyButton }, …]} />
    <Divider />
    <Stack gap="xs">
      <Heading level={5} textStyle="Body/Small/Bold" tone="light">Projects</Heading>
      <List aria-label="Chi Tran's projects">…</List>
    </Stack>
  </Stack>
</Card>`,
  },
  {
    title: "Mobile receipt",
    description: "A receipt pushed from the order history, with Back to the list. Default dividers separate the store, the items and the loyalty stub; the stub hangs under a dashed tear line, which steps up to Subtle by itself. The total's High rule comes from the Description List.",
    render: () => <MobileReceiptExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// The Orders root's clickable rows sit in the screen margin: <Box paddingX="lg" paddingY="xs"><List>…</List></Box>.
<PlatformPhone key={order.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="Receipt" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToOrders }} />}
  footer={<ActionBar position="static" primaryAction={{ label: "Email receipt", onClick: openEmail }} />}>
  <Stack paddingX="lg" paddingY="lg" gap="lg">
    <List aria-label="Store">
      <ListItem leading={storeIcon} title="Phin & Co Nguyen Hue" caption="18 minutes ago · Order A-247" />
    </List>
    <Divider />
    <DescriptionList items={[…items, { term: "Paid with Phin wallet", description: "$7.02", emphasis: true }]} />
    <Divider dashed decorative />
    <Text textStyle="Body/Base/Bold">You earned 70 points</Text>
  </Stack>
</PlatformPhone>`,
  },
]);

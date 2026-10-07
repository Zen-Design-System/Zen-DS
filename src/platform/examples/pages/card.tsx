/* Card examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Card decision: a clickable card opens one thing, header
   actions live in the Sub-Action, a card keeps its frame while its body loads, Active marks the current plan, a Border
   card frames a group of settings, and selectable cards on a phone. */
import { useEffect, useId, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar, AvatarStack } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button, IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { Dialog, ModalForm } from "../../../components/Dialog";
import { Divider } from "../../../components/Divider";
import { DockIcon } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { FormFieldset } from "../../../components/Form";
import { Icon, type IconName } from "../../../components/Icon";
import { NumberField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { ProgressBar } from "../../../components/Progress";
import { Segmented } from "../../../components/Segmented";
import { SidePanel } from "../../../components/SidePanel";
import { SkeletonShape, SkeletonText } from "../../../components/Skeleton";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { Toggle } from "../../../components/Toggle";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { DemoFieldDialog } from "../../PlatformDemoActions";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  daysFromToday, formatDate, formatDue, formatMoney, formatRange, formatRelative, initials, invoiceStatusTheme, people, plans, projectById, projects,
  projectStatusTheme, tasks, workspacePlan, type InvoiceStatus, type PersonId, type Plan, type PlanId, type Project, type ProjectStatus,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./card.css";

export const page: PlatformPage = "card";

/** Photo when the person has one, else initials on their steady theme. */
const stackItem = (id: PersonId) => {
  const person = people[id];
  return person.photo ? { src: person.photo, alt: person.name, theme: "photo" as const } : { alt: person.name, theme: person.theme };
};
const rowAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};

// ——— 1. Browse projects: the whole card opens the project ————————————————————————————————————
const statuses: ProjectStatus[] = ["Planning", "Active", "On hold", "Completed"];
const leads = [...new Set(projects.map((project) => project.lead))];
/** The fact that matters for each status: when it starts, when it is due, or when it finished. */
const timing = (project: Project) =>
  project.status === "Planning" ? `Starts ${formatDate(project.start)}`
    : project.status === "Completed" ? `Finished ${formatDate(project.due)}`
      : formatDue(project.due);

function BrowseProjects() {
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [lead, setLead] = useState<PersonId | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = projects.filter((project) => (!status || project.status === status) && (!lead || project.lead === lead));
  const opened = projects.find((project) => project.id === openId);
  const clear = () => { setStatus(null); setLead(null); };
  return (
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status"
          popoverItems={statuses.map((option) => ({ id: option, label: option, selected: option === status }))}
          onPopoverSelect={(item) => setStatus(item.id === status ? null : (item.id as ProjectStatus))}
          onClearSelection={() => setStatus(null)}>
          {status ?? "Status"}
        </Chip>
        <Chip variant="advanced" dropdown selected={lead !== null} popoverLabel="Lead"
          popoverItems={leads.map((id) => ({ id, label: people[id].name, selected: id === lead }))}
          onPopoverSelect={(item) => setLead(item.id === lead ? null : (item.id as PersonId))}
          onClearSelection={() => setLead(null)}>
          {lead ? people[lead].name : "Lead"}
        </Chip>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "project")}</Text>
      </Stack>
      {rows.length ? (
        <Grid minColumnWidth={260}>
          {rows.map((project) => (
            <Card key={project.id} theme="border" onClick={() => setOpenId(project.id)}
              aria-label={`${project.name}, ${project.client}, ${project.status}`}>
              <Stack gap="md">
                <Stack direction="row" justify="between" align="start">
                  <DockIcon icon={project.icon} theme={project.theme} background="solid" />
                  <Badge theme={projectStatusTheme[project.status]} background="subtle">{project.status}</Badge>
                </Stack>
                <Stack gap="xs">
                  <Heading level={4} textStyle="Heading/Subheading" truncate={2}>{project.name}</Heading>
                  <Text as="span" textStyle="Body/Small/Regular" tone="base" truncate>{`${project.client} · ${timing(project)}`}</Text>
                </Stack>
                <ProgressBar value={project.progress} label aria-label={`${project.name} progress`} />
                <AvatarStack size="sm" items={project.members.map(stackItem)} />
              </Stack>
            </Card>
          ))}
        </Grid>
      ) : (
        <EmptyState illustration={false} headingLevel={4} title="No projects match"
          secondaryAction={{ label: "Clear filters", onClick: clear }}>
          Try another status or lead.
        </EmptyState>
      )}
      <SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(open) => { if (!open) setOpenId(null); }}
        title={opened?.name ?? ""} description={opened?.client}>
        {opened ? (
          <Stack gap="lg">
            <DescriptionList divider items={[
              { term: "Status", description: <Badge theme={projectStatusTheme[opened.status]} background="subtle">{opened.status}</Badge> },
              { term: "Lead", description: people[opened.lead].name },
              { term: "Dates", description: formatRange(opened.start, opened.due) },
              { term: "Progress", description: `${opened.progress}%` },
              ...(opened.budget ? [{ term: "Budget", description: `${formatMoney(opened.spent)} of ${formatMoney(opened.budget)}` }] : []),
            ]} />
            <List aria-label={`${opened.name} team`}>
              {opened.members.map((id) => <ListItem key={id} leading={rowAvatar(id)} title={people[id].name} caption={people[id].role} />)}
            </List>
          </Stack>
        ) : null}
      </SidePanel>
    </Stack>
  );
}

// ——— 2. Header actions: one action is the Sub-Action, several go in its ⋯ menu ————————————————————
function InvoiceSide() {
  const { toast } = useToast();
  const [email, setEmail] = useState("trang.le@phinco.vn");
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<InvoiceStatus>("Sent");
  const clientId = useId();
  const invoiceId = useId();
  const invoiceCard = useRef<HTMLElement>(null);
  const markPaidButton = useRef<HTMLButtonElement>(null);
  // Mark as paid leaves with the Sent status, so focus moves to the invoice's ⋯ menu instead of falling to <body>.
  useEffect(() => {
    if (status === "Paid" && document.activeElement === document.body) invoiceCard.current?.querySelector<HTMLElement>('[aria-label="Invoice actions"]')?.focus();
  }, [status]);
  const markPaid = () => {
    setStatus("Paid");
    // Undo closes its toast as it runs, so focus goes back to Mark as paid once it is there again.
    toast({ type: "positive", title: "Invoice marked as paid", action: { label: "Undo", onClick: () => { setStatus("Sent"); requestAnimationFrame(() => markPaidButton.current?.focus()); } } });
  };
  return (
    <Stack gap="md">
      <Card as="section" theme="flat" aria-labelledby={clientId}
        subAction={{ label: "Edit billing contact", icon: "icon-edit-02-line", onClick: () => setEditing(true) }}>
        <Stack gap="md">
          <Heading level={4} id={clientId} textStyle="Heading/Subheading">Client</Heading>
          <DescriptionList layout="stacked" items={[
            { term: "Company", description: "Phin & Co" },
            { term: "Billing contact", description: "Trang Le" },
            { term: "Email", description: email },
            { term: "Address", description: "42 Nguyen Hue, District 1, Ho Chi Minh City" },
          ]} />
        </Stack>
      </Card>
      <Card ref={invoiceCard} as="section" theme="flat" aria-labelledby={invoiceId}
        subAction={
          <Menu align="end"
            trigger={<IconButton appearance="flat" level="primary" size="sm" icon="icon-dots-horizontal-line" aria-label="Invoice actions" />}
            items={[
              { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", disabled: status === "Paid", onSelect: () => toast({ title: "Reminder sent", children: `To ${email}` }) },
              { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: () => toast({ title: "PDF downloaded", children: "INV-2026-0142.pdf" }) },
            ]} />
        }>
        <Stack gap="md">
          <Stack gap="xs">
            <Heading level={4} id={invoiceId} textStyle="Heading/Subheading">INV-2026-0142</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">Loyalty app · Milestone 2</Text>
          </Stack>
          <DescriptionList items={[
            { term: "Status", description: <Badge theme={invoiceStatusTheme[status]} background="subtle">{status}</Badge> },
            { term: "Amount", description: formatMoney(21000, true) },
            { term: "Due", description: formatDate(daysFromToday(25)) },
          ]} />
          {status === "Sent" ? <Button ref={markPaidButton} level="tertiary" startIcon="icon-check-line" onClick={markPaid}>Mark as paid</Button> : null}
        </Stack>
      </Card>
      <DemoFieldDialog open={editing} onOpenChange={setEditing} title="Edit billing contact"
        description="Invoices for Phin & Co go to this address."
        field={{ kind: "email", label: "Billing email", placeholder: "name@phinco.vn" }} submitLabel="Save email"
        confirm={() => "Billing contact updated"} onSubmit={setEmail} />
    </Stack>
  );
}

// ——— 3. Loading: the card keeps its title while the body loads ————————————————————————————————
const dueThisWeek = tasks
  .filter((task) => task.status !== "Done" && task.due >= daysFromToday(0, 0, 0) && task.due <= daysFromToday(7, 23, 59))
  .sort((a, b) => a.due.getTime() - b.due.getTime())
  .slice(0, 4);

function DueThisWeek() {
  const [rows, setRows] = useState(dueThisWeek);
  const [loading, setLoading] = useState(false);
  const [updated, setUpdated] = useState(daysFromToday(0, 10, 12));
  const timer = useRef<number | undefined>(undefined);
  const titleId = useId();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const refresh = () => {
    setLoading(true);
    window.clearTimeout(timer.current);
    // Bao's review finished in the meantime: the refreshed list no longer has his task.
    timer.current = window.setTimeout(() => {
      setRows((list) => list.filter((task) => task.key !== "PHIN-219"));
      setUpdated(new Date(daysFromToday(0).getTime() - 20_000));
      setLoading(false);
    }, 1200);
  };
  return (
    <Card as="section" theme="flat" aria-labelledby={titleId} aria-busy={loading || undefined}
      subAction={{ label: "Refresh", icon: "icon-refresh-cw-01-line", onClick: refresh }}>
      <Stack gap="md">
        <Stack gap="xs">
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">Due this week</Heading>
          <Text as="span" role="status" textStyle="Caption/Regular" tone="light">{loading ? "Updating…" : `Updated ${formatRelative(updated).toLowerCase()}`}</Text>
        </Stack>
        {loading ? (
          // Each placeholder row has a static list row's rhythm: no padding, a 40px mark, rows Gap/Medium apart.
          <Stack gap="md">
            <VisuallyHidden>Loading tasks</VisuallyHidden>
            {rows.map((task) => (
              <Stack key={task.id} direction="row" gap="md" align="center">
                <SkeletonShape shape="round" size="md" />
                <SkeletonText lines={2} className="px-card-grow" />
              </Stack>
            ))}
          </Stack>
        ) : (
          <List aria-labelledby={titleId}>
            {rows.map((task) => {
              const project = projectById(task.project);
              return (
                <ListItem key={task.id} title={task.title} titleLines={2} caption={`${project.name} · ${formatDue(task.due)}`}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />} />
              );
            })}
          </List>
        )}
      </Stack>
    </Card>
  );
}

// ——— 4. Workspace plan: Active marks the current plan ————————————————————————————————————————
// The shared price list (data.ts): Starter free · Team $12 · Business $24 per seat a month, 20% off yearly. The studio is
// on Business with 48 seats. Team stops at 20 members, so Business is the plan that fits a team of 48: the recommended one.
const planDetails: Record<PlanId, { features: string[]; seatLimit?: number }> = {
  starter: { features: ["Up to 3 members", "3 active projects", "5 GB of files"], seatLimit: 3 },
  team: { features: ["Up to 20 members", "Unlimited projects", "Client guests", "100 GB of files"], seatLimit: 20 },
  business: { features: ["Unlimited members", "Invoices and time off", "Single sign-on", "1 TB of files"] },
};
const teamSize = workspacePlan.seats;
/** The cheapest plan whose member limit holds the whole team. */
const recommended = plans.find((plan) => (planDetails[plan.id].seatLimit ?? Infinity) >= teamSize)!.id;
const nextInvoice = formatDate(daysFromToday(30));

function WorkspacePlan() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<"monthly" | "yearly">(workspacePlan.billing);
  const [current, setCurrent] = useState<PlanId>(workspacePlan.plan);
  const [seats, setSeats] = useState(workspacePlan.seats);
  const [draftSeats, setDraftSeats] = useState<number | null>(workspacePlan.seats);
  const [seatError, setSeatError] = useState<string>();
  const [switching, setSwitching] = useState<Plan | null>(null);
  const [managing, setManaging] = useState(false);
  const price = (plan: Plan) => (period === "monthly" ? plan.seatMonthly : plan.seatYearly);
  const per = period === "monthly" ? "a month" : "a year";
  const currentPlan = plans.find((plan) => plan.id === current)!;
  const limitOf = (plan: Plan) => planDetails[plan.id].seatLimit;
  const lostSeats = switching && limitOf(switching) ? Math.max(0, seats - limitOf(switching)!) : 0;
  const baseId = useId();
  const manage = () => { setDraftSeats(seats); setSeatError(undefined); setManaging(true); };
  // A blocked submit keeps the form open with the error on the field; ModalForm moves focus to it.
  const updateSeats = () => {
    const limit = limitOf(currentPlan);
    const problem = !draftSeats ? "Enter at least 1 seat." : limit && draftSeats > limit ? `${currentPlan.name} includes up to ${plural(limit, "member")}.` : undefined;
    if (problem) { setSeatError(problem); return; }
    const before = seats;
    setSeats(draftSeats!);
    setManaging(false);
    toast({ title: "Seats updated", children: `${plural(draftSeats!, "seat")} from ${nextInvoice}`, action: { label: "Undo", onClick: () => setSeats(before) } });
  };
  const switchPlan = () => {
    if (!switching) return;
    setCurrent(switching.id);
    if (lostSeats) setSeats(limitOf(switching)!);
    setSwitching(null);
    toast({ type: "positive", title: `Plan changed to ${switching.name}` });
  };
  const cta = (plan: Plan) => {
    if (plan.id === current) return <Button level="tertiary" onClick={manage}>Manage plan</Button>;
    const upgrade = price(plan) > price(currentPlan);
    return (
      <Button level={plan.id === recommended ? "primary" : "tertiary"} onClick={() => setSwitching(plan)}>
        {upgrade ? `Upgrade to ${plan.name}` : `Switch to ${plan.name}`}
      </Button>
    );
  };
  return (
    <Stack gap="md" className="px-card-scope">
      <Stack direction="row" gap="xs" align="center" wrap>
        <Segmented aria-label="Billing period" value={period} onValueChange={(value) => setPeriod(value as "monthly" | "yearly")}
          options={[{ id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly" }]} />
        <Text as="span" textStyle="Body/Small/Regular" tone="base">Yearly billing saves 20%</Text>
      </Stack>
      <Grid columns={{ mobile: 1, desktop: 3 }} className="px-card-stack">
        {plans.map((plan) => {
          const titleId = `${baseId}-${plan.id}`;
          return (
            <Card key={plan.id} as="section" theme="flat" selected={plan.id === current} aria-labelledby={titleId} className="px-card-plan">
              <Stack gap="md" className="px-card-grow">
                <Stack gap="xs">
                  {/* Every title row keeps the Badge's height, so the prices line up across the row of cards. */}
                  <Stack direction="row" gap="2xs" align="center" className="px-card-plan__title">
                    <Heading level={4} id={titleId} textStyle="Heading/Subheading">{plan.name}</Heading>
                    {plan.id === recommended ? <Badge theme="accent" background="subtle">Recommended</Badge> : null}
                  </Stack>
                  <Text textStyle="Body/Small/Regular" tone="base">{plan.summary}</Text>
                </Stack>
                <Stack gap="xs">
                  <Stack direction="row" gap="2xs" align="baseline">
                    <Text as="span" textStyle="Heading/2">{price(plan) ? formatMoney(price(plan)) : "Free"}</Text>
                    {price(plan) ? <Text as="span" textStyle="Body/Small/Regular" tone="base">{`per seat ${per}`}</Text> : null}
                  </Stack>
                  <Text as="span" textStyle="Caption/Regular" tone="light">
                    {plan.id === current ? `Your plan · ${plural(seats, "seat")}` : !price(plan) ? "No card needed" : `Billed ${period}`}
                  </Text>
                </Stack>
                <Stack as="ul" gap="xs" aria-label={`${plan.name} includes`}>
                  {planDetails[plan.id].features.map((feature) => (
                    <Stack as="li" key={feature} direction="row" gap="2xs">
                      <Icon name="icon-check-line" size="sm" decorative />
                      <Text as="span" textStyle="Body/Small/Regular">{feature}</Text>
                    </Stack>
                  ))}
                </Stack>
                <Stack className="px-card-plan__cta">{cta(plan)}</Stack>
              </Stack>
            </Card>
          );
        })}
      </Grid>
      {/* Members lose access on a smaller plan, so the switch asks first and says who is affected. */}
      <Dialog open={Boolean(switching)} onOpenChange={(open) => { if (!open) setSwitching(null); }}
        theme={lostSeats ? "warning" : "default"} icon={lostSeats ? true : false}
        title={switching ? (price(switching) > price(currentPlan) ? `Upgrade to ${switching.name}?` : `Switch to ${switching.name}?`) : ""}
        description={switching ? (lostSeats
          ? `${switching.name} includes up to ${plural(limitOf(switching)!, "member")}. ${plural(lostSeats, "member")} lose access on ${nextInvoice}.`
          : `${plural(seats, "seat")} at ${formatMoney(price(switching), true)} a seat: ${formatMoney(price(switching) * seats, true)} ${per} from ${nextInvoice}.`) : undefined}
        primaryAction={{ label: switching && price(switching) > price(currentPlan) ? "Upgrade plan" : "Switch plan", onClick: switchPlan }}
        secondaryAction={{ label: "Cancel" }} />
      <ModalForm open={managing} onOpenChange={setManaging} title={`Manage ${currentPlan.name} plan`}
        description={`Your next invoice is on ${nextInvoice}.`} onSubmit={updateSeats}
        primaryAction={{ label: "Update seats" }} secondaryAction={{ label: "Cancel" }}>
        <NumberField label="Seats" min={1} value={draftSeats} error={seatError}
          onValueChange={(value) => { setDraftSeats(value); setSeatError(undefined); }}
          helpText={draftSeats && price(currentPlan) ? `${formatMoney(price(currentPlan) * draftSeats, true)} ${per}` : undefined} />
      </ModalForm>
    </Stack>
  );
}

// ——— 5. Settings section: a Border card frames a group of toggles —————————————————————————————
type Setting = { id: string; label: string; caption: string };
const settingGroups: { id: string; title: string; summary: string; settings: Setting[] }[] = [
  {
    id: "email", title: "Email", summary: "Sent to alex@dizai.studio.", settings: [
      { id: "digest", label: "Daily digest", caption: "One email at 8:00 am with what changed yesterday" },
      { id: "mentions", label: "Mentions and replies", caption: "When someone mentions you or answers your comment" },
      { id: "invoices", label: "Paid invoices", caption: "When a client pays an invoice you sent" },
    ],
  },
  {
    id: "push", title: "Mobile push", summary: "On the Zen app for iOS and Android.", settings: [
      { id: "assigned", label: "Tasks assigned to me", caption: "Right away, during your working hours" },
      { id: "reviews", label: "Review requests", caption: "When a file or task waits for your review" },
      { id: "leave", label: "Time off requests", caption: "When someone on the Design team asks for leave" },
    ],
  },
];

function NotificationSettings() {
  const { toast } = useToast();
  const [on, setOn] = useState<Record<string, boolean>>({ digest: true, mentions: true, invoices: false, assigned: true, reviews: true, leave: false });
  const flip = (setting: Setting, checked: boolean) => {
    setOn((state) => ({ ...state, [setting.id]: checked }));
    toast({ title: `${setting.label} turned ${checked ? "on" : "off"}`, action: { label: "Undo", onClick: () => setOn((state) => ({ ...state, [setting.id]: !checked })) } });
  };
  const baseId = useId();
  return (
    <Stack gap="xl" className="px-card-scope">
      {settingGroups.map((group, index) => {
        const titleId = `${baseId}-${group.id}`;
        return (
          <Stack key={group.id} gap="xl">
            {index > 0 ? <Divider /> : null}
            <Grid as="section" aria-labelledby={titleId} columns={{ mobile: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} gap="lg" align="start" className="px-card-stack">
              <Stack gap="xs">
                <Heading level={4} id={titleId} textStyle="Heading/4">{group.title}</Heading>
                <Text textStyle="Body/Small/Regular" tone="base">{group.summary}</Text>
              </Stack>
              <Card theme="flat">
                {/* A toggle group: each switch lines up on the card's right edge. */}
                <FormFieldset kind="toggle" legend={group.title} hideLegend>
                  {group.settings.map((setting) => (
                    <Toggle key={setting.id} size="md" label={setting.label} caption={setting.caption}
                      checked={on[setting.id]} onCheckedChange={(checked) => flip(setting, checked)} />
                  ))}
                </FormFieldset>
              </Card>
            </Grid>
          </Stack>
        );
      })}
    </Stack>
  );
}

// ——— 6. On a phone: selectable cards for one choice ——————————————————————————————————————————
type OrderType = { id: "pickup" | "delivery"; name: string; detail: string; icon: IconName; fee: number };
const orderTypes: OrderType[] = [
  { id: "pickup", name: "Pick up", detail: "Phin Nguyen Hue · ready in about 10 minutes", icon: "icon-shopping-bag-01-line", fee: 0 },
  { id: "delivery", name: "Delivery", detail: "To 18 Ly Tu Trong, District 1 · 25–35 minutes", icon: "icon-truck-line", fee: 1.5 },
];
type CartLine = { id: string; name: string; detail: string; quantity: number; price: number; icon: IconName };
const cart: CartLine[] = [
  { id: "c1", name: "Phin sữa đá", detail: "Medium · less sugar", quantity: 2, price: 5.2, icon: "icon-coffee-cup-line" },
  { id: "c2", name: "Bánh mì chả cá", detail: "No chili", quantity: 1, price: 2.4, icon: "icon-bread-line" },
];
const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
const back = "icon-chevron-left-line-medium" as const;

function PhoneOrderType() {
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  // The example opens on checkout (the screen it teaches); Back leads to the cart, Place order to the confirmation.
  const [step, setStep] = useState<"cart" | "checkout" | "placed">("checkout");
  const [type, setType] = useState<OrderType["id"]>("pickup");
  const kickerId = useId();
  const orderId = useId();
  const chosen = orderTypes.find((option) => option.id === type)!;
  const total = subtotal + chosen.fee;
  const go = (next: typeof step, focus: string) => screen.go(focus, () => setStep(next));
  const summary = (
    <DescriptionList items={[
      ...cart.map((item) => ({ id: item.id, term: `${item.name} × ${item.quantity}`, description: formatMoney(item.price, true) })),
      { id: "fee", term: "Delivery fee", description: chosen.fee ? formatMoney(chosen.fee, true) : "Free" },
      { id: "total", term: "Total", description: formatMoney(total, true), emphasis: true },
    ]} />
  );

  if (step === "cart") {
    return (
      // One key per screen: each screen opens at its top and its Top Navigation measures its own fold.
      <PlatformPhone key="cart" label="Cart" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Cart" largeTitle="Cart" scrollRef={screenRef} />}
        footer={<ActionBar position="static"
          summary={<Text as="span" textStyle="Body/Base/Medium">{`Subtotal ${formatMoney(subtotal, true)}`}</Text>}
          primaryAction={{ label: "Go to checkout", onClick: () => go("checkout", '.zen-top-nav__action[aria-label="Back"]') }} />}>
        {screen.anchor}
        {/* Static rows pad 0 at the sides: the screen margin (lg, as the bar) insets them. */}
        <Box paddingX="lg" paddingY="xs">
          <List aria-label="Cart">
            {cart.map((item) => (
              <ListItem key={item.id} title={`${item.name} × ${item.quantity}`} caption={item.detail}
                leading={<DockIcon icon={item.icon} theme="brown" background="subtle" size="md" />}
                trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(item.price, true)}</Text>} />
            ))}
          </List>
        </Box>
      </PlatformPhone>
    );
  }

  if (step === "placed") {
    // An end state keeps a way out: Done starts again from the cart.
    return (
      <PlatformPhone key="placed" label="Order placed" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="compact" title="Order placed" scrollRef={screenRef} />}
        footer={<ActionBar position="static" primaryAction={{ label: "Done", onClick: () => go("cart", ".zen-action-bar button") }} />}>
        {screen.anchor}
        <Stack gap="lg" padding="lg">
          <Stack gap="xs" role="status">
            <Heading level={2}>{`Order A-251 · ${chosen.name}`}</Heading>
            <Text tone="base">{type === "pickup" ? "Pick it up at Phin Nguyen Hue in about 10 minutes." : "It reaches 18 Ly Tu Trong in 25–35 minutes."}</Text>
          </Stack>
          {summary}
        </Stack>
      </PlatformPhone>
    );
  }

  return (
    <PlatformPhone key="checkout" label="Checkout" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title="Checkout" scrollRef={screenRef}
        leading={{ icon: back, label: "Back", onClick: () => go("cart", ".zen-action-bar button") }} />}
      footer={<ActionBar position="static"
        summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{`Total ${formatMoney(total, true)}`}</Text>}
        primaryAction={{ label: "Place order", onClick: () => go("placed", ".zen-action-bar button") }} />}>
      {screen.anchor}
      <Stack gap="lg" padding="lg">
        <Stack as="section" gap="xs" aria-labelledby={kickerId}>
          <Heading level={2} id={kickerId} textStyle="Body/Small/Bold" tone="light">Order type</Heading>
          {/* The choices are one group (sm); the whole card is the target. */}
          <Stack gap="sm">
            {orderTypes.map((option) => (
              <Card key={option.id} theme="border" spacing="small" selected={type === option.id} aria-pressed={type === option.id}
                onClick={() => setType(option.id)}>
                <Stack direction="row" gap="md" align="center">
                  <DockIcon icon={option.icon} theme="neutral" background="subtle" />
                  <Stack gap="2xs" className="px-card-grow">
                    <Text as="span" textStyle="Body/Base/Bold">{option.name}</Text>
                    <Text as="span" textStyle="Body/Small/Regular" tone="base">{option.detail}</Text>
                  </Stack>
                  <Text as="span" textStyle="Body/Base/Medium">{option.fee ? formatMoney(option.fee, true) : "Free"}</Text>
                </Stack>
              </Card>
            ))}
          </Stack>
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={orderId}>
          <Heading level={2} id={orderId} textStyle="Body/Small/Bold" tone="light">Your order</Heading>
          {summary}
        </Stack>
      </Stack>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Browse projects",
    wide: true,
    description: "Each project is one clickable Border card: the whole card opens the project in a Side Panel, so it holds no buttons of its own. Status and lead filter the grid, and an empty result offers Clear filters.",
    render: () => <BrowseProjects />,
    code: `<Chip variant="advanced" dropdown selected={status !== null} popoverLabel="Status"
  popoverItems={statuses.map((s) => ({ id: s, label: s, selected: s === status }))}
  onPopoverSelect={(item) => setStatus(item.id === status ? null : item.id)}
  onClearSelection={() => setStatus(null)}>{status ?? "Status"}</Chip>

<Grid minColumnWidth={260}>
  {rows.map((project) => (
    <Card key={project.id} theme="border" onClick={() => setOpenId(project.id)}
      aria-label={\`\${project.name}, \${project.client}, \${project.status}\`}>
      <Stack direction="row" justify="between" align="start">
        <DockIcon icon={project.icon} theme={project.theme} background="solid" />
        <Badge theme={statusTheme[project.status]} background="subtle">{project.status}</Badge>
      </Stack>
      <Heading level={4} textStyle="Heading/Subheading" truncate={2}>{project.name}</Heading>
      <Text as="span" textStyle="Body/Small/Regular" tone="base" truncate>{\`\${project.client} · \${formatDue(project.due)}\`}</Text>
      <ProgressBar value={project.progress} label aria-label={\`\${project.name} progress\`} />
      <AvatarStack size="sm" items={members} />
    </Card>
  ))}
</Grid>

<SidePanel type="modal" size="small" open={Boolean(opened)} onOpenChange={(open) => !open && setOpenId(null)}
  title={opened?.name} description={opened?.client}>…</SidePanel>`,
  },
  {
    title: "Card header actions",
    description: "A card's header action is its Sub-Action: one flat icon button with a tooltip, or a ⋯ Menu when there are several. The action that moves the task on, Mark as paid, sits at the bottom of the card, not in the header.",
    render: () => <InvoiceSide />,
    code: `<Card as="section" theme="flat" aria-labelledby={clientId}
  subAction={{ label: "Edit billing contact", icon: "icon-edit-02-line", onClick: () => setEditing(true) }}>
  <Heading level={4} id={clientId} textStyle="Heading/Subheading">Client</Heading>
  <DescriptionList layout="stacked" items={client} />
</Card>

<Card as="section" theme="flat" aria-labelledby={invoiceId}
  subAction={<Menu align="end"
    trigger={<IconButton appearance="flat" level="primary" size="sm" icon="icon-dots-horizontal-line" aria-label="Invoice actions" />}
    items={[
      { id: "remind", label: "Send reminder", icon: "icon-mail-01-line", onSelect: sendReminder },
      { id: "pdf", label: "Download PDF", icon: "icon-download-01-line", onSelect: downloadPdf },
    ]} />}>
  <Heading level={4} id={invoiceId} textStyle="Heading/Subheading">INV-2026-0142</Heading>
  <DescriptionList items={invoice} />
  <Button level="tertiary" startIcon="icon-check-line" onClick={markPaid}>Mark as paid</Button>
</Card>`,
  },
  {
    title: "Choose on a phone",
    description: "At checkout in the Phin & Co app, each order type is a selectable card: the whole card is the target, Active and aria-pressed mark the choice, and the footer total follows it. Back returns to the cart; Place order opens the confirmation.",
    render: () => <PhoneOrderType />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="checkout" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="Checkout" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => setStep("cart") }} />}
  footer={<ActionBar position="static" summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{\`Total \${formatMoney(total, true)}\`}</Text>}
    primaryAction={{ label: "Place order", onClick: () => setStep("placed") }} />}>
  <Heading level={2} id={kickerId} textStyle="Body/Small/Bold" tone="light">Order type</Heading>
  <Stack gap="sm">
    {orderTypes.map((option) => (
      <Card key={option.id} theme="border" spacing="small" selected={type === option.id} aria-pressed={type === option.id}
        onClick={() => setType(option.id)}>
        <Stack direction="row" gap="md" align="center">
          <DockIcon icon={option.icon} theme="neutral" background="subtle" />
          <Stack gap="2xs">
            <Text as="span" textStyle="Body/Base/Bold">{option.name}</Text>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{option.detail}</Text>
          </Stack>
          <Text as="span" textStyle="Body/Base/Medium">{option.fee ? formatMoney(option.fee, true) : "Free"}</Text>
        </Stack>
      </Card>
    ))}
  </Stack>
</PlatformPhone>`,
  },
  {
    title: "Workspace plan",
    wide: true,
    description: "Plans are flat cards side by side on the canvas: Active marks the plan you are on and an Accent Badge the one that fits your team. Each card ends with one CTA that says what happens; a smaller plan asks first, because members lose access.",
    render: () => <WorkspacePlan />,
    code: `// plans: Starter free · Team $12 · Business $24 per seat a month, 20% off yearly; the workspace is on Business.

<Segmented aria-label="Billing period" value={period} onValueChange={setPeriod}
  options={[{ id: "monthly", label: "Monthly" }, { id: "yearly", label: "Yearly" }]} />

<Grid columns={{ mobile: 1, desktop: 3 }}>
  {plans.map((plan) => (
    <Card key={plan.id} as="section" theme="flat" selected={plan.id === current} aria-labelledby={plan.id}>
      <Heading level={4} id={plan.id} textStyle="Heading/Subheading">{plan.name}</Heading>
      {plan.id === recommended ? <Badge theme="accent" background="subtle">Recommended</Badge> : null}
      <Text as="span" textStyle="Heading/2">{price(plan) ? formatMoney(price(plan)) : "Free"}</Text>
      <Text as="span" textStyle="Body/Small/Regular" tone="base">{\`per seat \${per}\`}</Text>
      {/* margin-top: auto keeps the CTA on the card's bottom edge */}
      {plan.id === current
        ? <Button level="tertiary" onClick={manage}>Manage plan</Button>
        : <Button level={plan.id === recommended ? "primary" : "tertiary"} onClick={() => setSwitching(plan)}>
            {price(plan) > price(currentPlan) ? \`Upgrade to \${plan.name}\` : \`Switch to \${plan.name}\`}
          </Button>}
    </Card>
  ))}
</Grid>

<ModalForm open={managing} onOpenChange={setManaging} title="Manage Business plan" onSubmit={updateSeats}
  primaryAction={{ label: "Update seats" }} secondaryAction={{ label: "Cancel" }}>
  <NumberField label="Seats" min={1} value={draftSeats} onValueChange={setDraftSeats} error={seatError} />
</ModalForm>`,
  },
  {
    title: "Settings section",
    wide: true,
    description: "A settings page puts the section title and one line about it on the left and a flat card of related toggles on the right; on a phone they stack. Toggles apply at once, and the toast can undo the change.",
    render: () => <NotificationSettings />,
    code: `<Grid as="section" aria-labelledby="email" columns={{ mobile: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} gap="lg" align="start">
  <Stack gap="xs">
    <Heading level={4} id="email" textStyle="Heading/4">Email</Heading>
    <Text textStyle="Body/Small/Regular" tone="base">Sent to alex@dizai.studio.</Text>
  </Stack>
  <Card theme="flat">
    <FormFieldset kind="toggle" legend="Email" hideLegend>
      {settings.map((setting) => (
        <Toggle key={setting.id} size="md" label={setting.label} caption={setting.caption}
          checked={on[setting.id]} onCheckedChange={(checked) => flip(setting, checked)} />
      ))}
    </FormFieldset>
  </Card>
</Grid>`,
  },
  {
    title: "Refresh a card",
    description: "Refresh is the card's Sub-Action. While the list reloads, the card keeps its title and size and shows Skeleton rows in place of the tasks; the status line then says when it was updated.",
    render: () => <DueThisWeek />,
    code: `<Card as="section" theme="flat" aria-labelledby={titleId} aria-busy={loading || undefined}
  subAction={{ label: "Refresh", icon: "icon-refresh-cw-01-line", onClick: refresh }}>
  <Heading level={4} id={titleId} textStyle="Heading/Subheading">Due this week</Heading>
  <Text as="span" role="status" textStyle="Caption/Regular" tone="light">
    {loading ? "Updating…" : \`Updated \${formatRelative(updated).toLowerCase()}\`}
  </Text>
  {loading
    ? rows.map((task) => (
        <Stack key={task.id} direction="row" gap="md" align="center">
          <SkeletonShape shape="round" size="md" />
          <SkeletonText lines={2} />
        </Stack>
      ))
    : <List aria-labelledby={titleId}>
        {rows.map((task) => (
          <ListItem key={task.id} title={task.title} titleLines={2} caption={\`\${project.name} · \${formatDue(task.due)}\`}
            leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />} />
        ))}
      </List>}
</Card>`,
  },
]);

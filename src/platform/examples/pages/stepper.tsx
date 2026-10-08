/* Stepper examples (docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio sets up projects, imports
   timesheets, approves invoices and onboards new hires in Zen; the phone example is the Phin & Co app the studio
   builds. */
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DockIcon } from "../../../components/DockIcon";
import { Checkbox } from "../../../components/Checkbox";
import { DescriptionList } from "../../../components/DescriptionList";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { InputField, InputLeadingTrailing, SelectField, TextAreaField } from "../../../components/Input";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Stepper, type StepperStep } from "../../../components/Stepper";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { TODAY, daysFromToday, formatDate, formatDay, formatMoney, formatRelative, formatTime, initials, invoiceStatusTheme, invoices, people, projects, type PersonId } from "../data";
import type { ExampleDef } from "../types";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import "./stepper.css";

export const page: PlatformPage = "stepper";

/* ───────────── Orientation by width ───────────── */

/** Below this width per step the titles would squeeze, so the stepper turns vertical. */
const MIN_STEP_WIDTH = 104;

/** The width of a container, kept up to date with a ResizeObserver. */
function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    setWidth(node.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Horizontal while every step gets MIN_STEP_WIDTH, vertical in a narrower container (a card on a phone). */
function useStepperOrientation<T extends HTMLElement>(stepCount: number) {
  const [ref, width] = useContainerWidth<T>();
  return [ref, width >= stepCount * MIN_STEP_WIDTH ? "horizontal" : "vertical"] as const;
}

/* ───────────── New project ───────────── */

const clientOptions = [...new Set(projects.map((project) => project.client))]
  .filter((client) => client !== "Đìzai Studio")
  .map((client) => ({ label: client, value: client }));
const serviceOptions = ["Brand identity", "Product design", "Website", "Design system"].map((service) => ({ label: service, value: service }));
const teamOptions: PersonId[] = ["gia", "emi", "linh", "chi", "bao"];

const projectSteps: StepperStep[] = [
  { id: "client", title: "Client" },
  { id: "scope", title: "Scope" },
  { id: "team", title: "Team", caption: "Optional" },
  { id: "review", title: "Review" },
];
const stepHeadings = ["Who is the project for?", "What will the studio deliver?", "Who is on the team?", "Review the project"];

type ProjectDraft = { client: string; name: string; service: string; budget: string; team: PersonId[] };
const emptyDraft: ProjectDraft = { client: "Saola Outdoor", name: "", service: "Brand identity", budget: "", team: [] };
const budgetOf = (text: string) => Number(text.replace(/[$,\s]/g, ""));

function NewProjectExample() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const [current, setCurrent] = useState(0);
  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState<{ name?: string; budget?: string }>({});
  const created = current === projectSteps.length;
  const [contentRef, orientation] = useStepperOrientation<HTMLElement>(projectSteps.length);

  // A new step puts focus on its heading, so keyboard and screen-reader users start at the top of it; the current
  // step's own button does the same without a change.
  useEffect(() => { if (moved.current) headingRef.current?.focus(); }, [current]);
  const go = (index: number) => { moved.current = true; if (index === current) headingRef.current?.focus(); else setCurrent(index); };
  const edit = <K extends keyof ProjectDraft>(key: K, value: ProjectDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  // Continue checks only the fields of this step; Form then focuses the first field with an error.
  const next = () => {
    const found = current === 0 && !draft.name.trim() ? { name: "Enter a project name" }
      : current === 1 && !(budgetOf(draft.budget) > 0) ? { budget: "Enter the budget in US dollars" } : {};
    setErrors(found);
    if (!found.name && !found.budget) go(current + 1);
  };
  const startAgain = () => { setDraft(emptyDraft); setErrors({}); go(0); };
  const teamNames = draft.team.map((id) => people[id].name).join(", ");

  return (
    <Card theme="flat" as="section" aria-label="New project">
      <Stack ref={contentRef} gap="lg">
        {/* Passed steps are buttons that go back to edit; steps ahead stay inert. */}
        <Stepper aria-label="New project" orientation={orientation} steps={projectSteps} current={current}
          onStepClick={created ? undefined : (_, index) => { if (index <= current) go(index); }} />
        {/* The step content keeps a readable column under the full-width stepper. */}
        <Container maxWidth="sm" gutter={false} className="px-stepper-column">
          {created ? (
            <Stack gap="md">
              <Stack gap="xs">
                <Heading ref={headingRef} tabIndex={-1} className="px-stepper-focus-target" level={4} textStyle="Heading/Subheading">Project created</Heading>
                <Text textStyle="Body/Base/Regular" tone="base">{`${draft.name} for ${draft.client} is now in Projects, with a ${formatMoney(budgetOf(draft.budget))} budget.`}</Text>
              </Stack>
              {/* A lone card action that is not a form sits on the right, like FormActions. */}
              <Stack direction="row" justify="end">
                <Button level="tertiary" startIcon="icon-plus-line" onClick={startAgain}>New project</Button>
              </Stack>
            </Stack>
          ) : (
            <Form onSubmit={next}>
              <Stack gap="md">
                <Heading ref={headingRef} tabIndex={-1} className="px-stepper-focus-target" level={4} textStyle="Heading/Subheading">{stepHeadings[current]}</Heading>
                {current === 0 ? (
                  <Grid minColumnWidth={240} columnGap="lg" rowGap="md">
                    <SelectField label="Client" options={clientOptions} value={draft.client} onValueChange={(value) => edit("client", value)} />
                    <InputField label="Project name" placeholder="Brand refresh" value={draft.name} error={errors.name} onValueChange={(value) => edit("name", value)} />
                  </Grid>
                ) : current === 1 ? (
                  <Grid minColumnWidth={240} columnGap="lg" rowGap="md">
                    <SelectField label="Service" options={serviceOptions} value={draft.service} onValueChange={(value) => edit("service", value)} />
                    <InputField label="Budget" leading={<InputLeadingTrailing label="$" interactive={false} />} inputMode="numeric" placeholder="36,000" helpText="Fixed fee in US dollars"
                      value={draft.budget} error={errors.budget} onValueChange={(value) => edit("budget", value)} />
                  </Grid>
                ) : current === 2 ? (
                  <FormFieldset legend="Team" hideLegend kind="checkbox">
                    {teamOptions.map((id) => (
                      <Checkbox key={id} label={people[id].name} caption={people[id].role} checked={draft.team.includes(id)}
                        onCheckedChange={(checked) => edit("team", checked ? [...draft.team, id] : draft.team.filter((x) => x !== id))} />
                    ))}
                  </FormFieldset>
                ) : (
                  <DescriptionList divider items={[
                    { term: "Client", description: draft.client },
                    { term: "Project name", description: draft.name },
                    { term: "Service", description: draft.service },
                    { term: "Budget", description: formatMoney(budgetOf(draft.budget)) },
                    { term: "Team", description: teamNames || "Add people later" },
                  ]} />
                )}
              </Stack>
              {/* Tertiary then Primary together on the right; stacked full width under 480px. */}
              <FormActions>
                {current ? <Button level="tertiary" onClick={() => go(current - 1)}>Back</Button> : null}
                <Button level="primary" type="submit">{current === projectSteps.length - 1 ? "Create project" : "Continue"}</Button>
              </FormActions>
            </Form>
          )}
        </Container>
      </Stack>
    </Card>
  );
}

/* ───────────── Failed check ───────────── */

const IMPORT_FILE = "timesheet-sep-2026.csv";
const IMPORT_ROWS = 214;

function FailedCheckExample() {
  const { toast } = useToast();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const importRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [fixed, setFixed] = useState(false);
  const [phase, setPhase] = useState<"check" | "importing" | "done">("check");
  // Undo takes the entries out again: back to the checked file, focus on Import entries.
  const undoImport = () => { setPhase("check"); window.requestAnimationFrame(() => importRef.current?.focus()); };
  const current = phase === "check" ? 2 : phase === "importing" ? 3 : 4;
  const steps: StepperStep[] = [
    { id: "upload", title: "Upload", caption: plural(IMPORT_ROWS, "row") },
    { id: "columns", title: "Columns", caption: "6 of 6 matched" },
    { id: "check", title: "Check", caption: fixed ? "All rows valid" : "3 rows to fix", error: !fixed },
    { id: "import", title: "Import" },
  ];
  const [contentRef, orientation] = useStepperOrientation<HTMLElement>(steps.length);

  // A demo import: a second and a half, then the entries are in and a toast offers Undo.
  useEffect(() => {
    if (phase !== "importing") return undefined;
    const timer = window.setTimeout(() => {
      setPhase("done");
      toast({ type: "positive", title: "Time entries imported", children: `${plural(IMPORT_ROWS, "entry", "entries")} · Loyalty app`,
        action: { label: "Undo", onClick: undoImport } });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const fix = () => { setFixed(true); window.requestAnimationFrame(() => importRef.current?.focus()); };
  // The status line takes focus, so it is read out now and again when the import is done.
  const start = () => { setPhase("importing"); window.requestAnimationFrame(() => statusRef.current?.focus()); };
  const reset = () => { setFixed(false); setPhase("check"); titleRef.current?.focus(); };

  return (
    <Card theme="flat" as="section" aria-label="Import time entries">
      <Stack ref={contentRef} gap="md">
        <Stack gap="xs">
          <Heading ref={titleRef} tabIndex={-1} className="px-stepper-focus-target" level={4} textStyle="Heading/Subheading">Import time entries</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{IMPORT_FILE}</Text>
        </Stack>
        <Stepper aria-label="Timesheet import" orientation={orientation} steps={steps} current={current} />
        {/* Blocks of one surface, md apart: the message or status, then the card's one action on the right. */}
        {phase === "check" ? (
          fixed ? (
            <InlineMessage theme="positive" title={`All ${IMPORT_ROWS} rows are ready`}>The 3 rows now log time to Loyalty app for Phin & Co.</InlineMessage>
          ) : (
            <InlineMessage theme="negative" title="3 rows have no project" action={{ label: "Use Loyalty app", onClick: fix }}>
              Rows 18, 57 and 140 say “Phin loyalty”, which isn’t a project in Zen.
            </InlineMessage>
          )
        ) : (
          <Text ref={statusRef} tabIndex={-1} className="px-stepper-focus-target" role="status" textStyle="Body/Base/Regular" tone="base">
            {phase === "importing" ? `Importing ${plural(IMPORT_ROWS, "entry", "entries")}…` : `${plural(IMPORT_ROWS, "entry", "entries")} added to Loyalty app.`}
          </Text>
        )}
        {phase === "check" && fixed ? (
          <Stack direction="row" justify="end">
            <Button ref={importRef} level="primary" onClick={start}>Import entries</Button>
          </Stack>
        ) : phase === "done" ? (
          <Stack direction="row" justify="end">
            <Button level="tertiary" startIcon="icon-upload-01-line" onClick={reset}>Import another file</Button>
          </Stack>
        ) : null}
      </Stack>
    </Card>
  );
}

/* ───────────── Invoice approval ───────────── */

const approvalInvoice = invoices.find((invoice) => invoice.status === "Draft")!;

function InvoiceApprovalExample() {
  const { toast } = useToast();
  const titleId = useId();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const approveRef = useRef<HTMLButtonElement>(null);
  const [approved, setApproved] = useState(false);
  const steps: StepperStep[] = [
    { id: "draft", title: "Draft", caption: `${people.linh.name} · 9:12 am` },
    { id: "lead", title: "Design lead", caption: approved ? "You · Approved at 10:30 am" : "You · Waiting since 9:12 am" },
    { id: "finance", title: "Finance", caption: approved ? `${people.mai.name} · Waiting since 10:30 am` : people.mai.name },
    { id: "client", title: "Client", caption: `Sent to ${approvalInvoice.client}` },
  ];
  const undo = () => { setApproved(false); window.requestAnimationFrame(() => approveRef.current?.focus()); };
  const approve = () => {
    setApproved(true);
    window.requestAnimationFrame(() => statusRef.current?.focus());
    toast({ title: "Invoice approved", children: approvalInvoice.number, action: { label: "Undo", onClick: undo } });
  };

  return (
    <Card theme="flat" as="section" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Stack direction="row" gap="2xs" align="center" wrap>
            <Heading level={4} id={titleId} textStyle="Heading/Subheading">{approvalInvoice.number}</Heading>
            <Badge background="subtle" theme={invoiceStatusTheme[approvalInvoice.status]}>{approvalInvoice.status}</Badge>
          </Stack>
          <Text textStyle="Body/Small/Regular" tone="base">{`${approvalInvoice.client} · ${formatMoney(approvalInvoice.amount, true)} · Due ${formatDate(approvalInvoice.due)}`}</Text>
        </Stack>
        {/* A read-only tracker: no onStepClick, the captions say who acts and since when. */}
        <Stepper aria-label="Invoice approval" orientation="vertical" steps={steps} current={approved ? 2 : 1} />
        {/* The card's one action sits on the right, like FormActions. */}
        {approved
          ? <Text ref={statusRef} tabIndex={-1} className="px-stepper-focus-target" role="status" textStyle="Body/Base/Regular" tone="base">{`Waiting for ${people.mai.name} in Finance.`}</Text>
          : <Stack direction="row" justify="end"><Button ref={approveRef} level="primary" onClick={approve}>Approve invoice</Button></Stack>}
      </Stack>
    </Card>
  );
}

/* ───────────── Mobile: pickup order ───────────── */

// Alex's orders in Phin & Co's app (the loyalty app the studio builds). A-248 is being made now; the past pick-ups are
// the same ones the Rating page asks Alex to rate.
const phinStores: Record<string, string> = {
  "Phin Nguyễn Huệ": "42 Nguyen Hue, District 1",
  "Phin Lê Lợi": "86 Le Loi, District 1",
  "Phin Thảo Điền": "21 Thao Dien, Thu Duc",
  "Phin Đa Kao": "15 Dinh Tien Hoang, District 1",
  "Phin Bến Thành": "3 Phan Chu Trinh, District 1",
  "Phin Phú Mỹ Hưng": "102 Ton Dat Tien, District 7",
};
const menu = {
  phin: { name: "Phin sữa đá", price: 2.6 },
  bacxiu: { name: "Bạc xỉu", price: 2.8 },
  muoi: { name: "Cà phê muối", price: 3.2 },
  sen: { name: "Trà sen vàng", price: 3 },
  banhmi: { name: "Bánh mì chả cá", price: 2.4 },
  croissant: { name: "Croissant", price: 2.2 },
};
type MenuId = keyof typeof menu;
type OrderStage = 1 | 2 | 4; // 1 Preparing · 2 Ready for pickup · 4 Picked up (every step passed)
type PickupOrder = { id: string; store: string; placed: Date; lines: Array<[MenuId, number]>; stage: OrderStage; pickedAt?: Date };
const minutesAfter = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60_000);
// An order is ready about 8 minutes after it is placed; past orders were picked up then (the times the Rating page shows).
const order = (id: string, store: string, placed: Date, lines: Array<[MenuId, number]>, stage: OrderStage = 4): PickupOrder =>
  ({ id, store, placed, lines, stage, pickedAt: stage === 4 ? minutesAfter(placed, 8) : undefined });
const pickupOrders: PickupOrder[] = [
  order("A-248", "Phin Nguyễn Huệ", daysFromToday(0, 10, 26), [["phin", 2], ["banhmi", 1]], 1),
  order("A-247", "Phin Nguyễn Huệ", daysFromToday(0, 7, 57), [["phin", 1], ["croissant", 1]]),
  order("A-239", "Phin Lê Lợi", daysFromToday(-1, 8, 4), [["bacxiu", 1]]),
  order("A-236", "Phin Thảo Điền", daysFromToday(-2, 15, 32), [["muoi", 2], ["sen", 1]]),
  order("A-231", "Phin Nguyễn Huệ", daysFromToday(-4, 9, 12), [["phin", 1], ["banhmi", 1]]),
  order("A-228", "Phin Đa Kao", daysFromToday(-5, 7, 54), [["phin", 1]]),
  order("A-224", "Phin Lê Lợi", daysFromToday(-6, 12, 37), [["sen", 2], ["muoi", 1], ["croissant", 1]]),
  order("A-219", "Phin Nguyễn Huệ", daysFromToday(-8, 8, 2), [["bacxiu", 1]]),
  order("A-215", "Phin Bến Thành", daysFromToday(-9, 17, 22), [["muoi", 1], ["banhmi", 1]]),
  order("A-209", "Phin Thảo Điền", daysFromToday(-11, 8, 52), [["phin", 2]]),
  order("A-204", "Phin Nguyễn Huệ", daysFromToday(-12, 8, 7), [["phin", 1]]),
  order("A-198", "Phin Phú Mỹ Hưng", daysFromToday(-15, 13, 57), [["sen", 1], ["bacxiu", 1], ["croissant", 1]]),
  order("A-193", "Phin Lê Lợi", daysFromToday(-16, 8, 12), [["muoi", 1]]),
  order("A-187", "Phin Nguyễn Huệ", daysFromToday(-19, 7, 52), [["phin", 1], ["banhmi", 1]]),
  order("A-182", "Phin Đa Kao", daysFromToday(-20, 10, 32), [["bacxiu", 1]]),
];
const itemCount = (o: PickupOrder) => o.lines.reduce((sum, [, qty]) => sum + qty, 0);
const totalOf = (o: PickupOrder) => o.lines.reduce((sum, [id, qty]) => sum + menu[id].price * qty, 0);
/** "Picked up at 8:09 am" · "Picked up yesterday at 8:16 am" · "Picked up Monday at 3:43 pm" · "Picked up just now". */
const pickedLine = (d: Date) => {
  const when = formatRelative(d);
  return /^\d/.test(when) ? `Picked up at ${when}` : `Picked up ${/^(Just|Yesterday)/.test(when) ? when[0].toLowerCase() + when.slice(1) : when}`;
};
const stageBadge: Record<1 | 2, { label: string; theme: "orange" | "green" }> = { 1: { label: "Preparing", theme: "orange" }, 2: { label: "Ready", theme: "green" } };

function PickupOrderExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const activeId = useId();
  const pastId = useId();
  const linesId = useId();
  // One scroller per screen; the PlatformPhone is keyed per screen, so each opens at the top and folds on its own.
  const screenRef = useRef<HTMLDivElement>(null);
  const [orders, setOrders] = useState(pickupOrders);
  const [openId, setOpenId] = useState<string | null>("A-248");
  const opened = orders.find((item) => item.id === openId);
  const confirmPickup = (id: string) => setOrders((list) => list.map((item) => (item.id === id ? { ...item, stage: 4, pickedAt: TODAY } : item)));
  // The store marks an order ready after a while (5 seconds in this demo).
  const preparing = orders.filter((item) => item.stage === 1).map((item) => item.id).join();
  useEffect(() => {
    if (!preparing) return undefined;
    const timer = window.setTimeout(() => setOrders((list) => list.map((item) => (item.stage === 1 ? { ...item, stage: 2 } : item))), 5000);
    return () => window.clearTimeout(timer);
  }, [preparing]);
  const backButton = '.zen-top-nav__action[aria-label="Back"]';
  const open = (id: string) => screen.go(backButton, () => setOpenId(id));
  const back = () => { if (openId) screen.go(`[data-order="${openId}"] .zen-list-item__wrapper`, () => setOpenId(null)); };
  const orderAgain = (from: PickupOrder) => {
    const id = `A-${Math.max(...orders.map((item) => Number(item.id.slice(2)))) + 1}`;
    screen.go(backButton, () => { setOrders((list) => [order(id, from.store, TODAY, from.lines, 1), ...list]); setOpenId(id); });
    toast({ title: `Order ${id} placed`, children: from.store });
  };

  if (!opened) {
    const active = orders.filter((item) => item.stage !== 4);
    const past = orders.filter((item) => item.stage === 4);
    const row = (item: PickupOrder) => (
      <ListItem key={item.id} data-order={item.id} title={item.store} onClick={() => open(item.id)}
        leading={<DockIcon icon="icon-coffee-cup-line" theme="orange" background="subtle" />}
        caption={`${item.id} · ${plural(itemCount(item), "item")} · ${formatRelative(item.placed)}`}
        trailing={item.stage === 4 ? <Text as="span" textStyle="Body/Small/Regular" tone="base">{formatMoney(totalOf(item), true)}</Text>
          : <Badge theme={stageBadge[item.stage].theme} background="subtle">{stageBadge[item.stage].label}</Badge>} />
    );
    return (
      // Grouped list: the screen is Surface-Alt and each group a ListBox under its kicker, which lines up with the row
      // content (paddingX lg, 20px). Rows have no side padding of their own: the ListBox pads 20px on a phone, so their hover
      // (12px outside the row) sits 8px from every edge (2XLarge 24px = the fill's Large 16px + 8px).
      <PlatformPhone key="root" label="Phin & Co orders" canvas="alt" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="Orders" largeTitle="Orders" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* Body padding lg (20px, the phone margin); groups lg apart. */}
        <Stack gap="lg" padding="lg">
          {active.length ? (
            <Stack as="section" gap="xs" aria-labelledby={activeId}>
              <Box paddingX="lg"><Heading level={2} id={activeId} textStyle="Body/Small/Bold" tone="light">In progress</Heading></Box>
              <ListBox>
                <List aria-labelledby={activeId}>{active.map(row)}</List>
              </ListBox>
            </Stack>
          ) : null}
          <Stack as="section" gap="xs" aria-labelledby={pastId}>
            <Box paddingX="lg"><Heading level={2} id={pastId} textStyle="Body/Small/Bold" tone="light">Past orders</Heading></Box>
            <ListBox>
              <List aria-labelledby={pastId}>{past.map(row)}</List>
            </ListBox>
          </Stack>
        </Stack>
      </PlatformPhone>
    );
  }

  const readyAt = minutesAfter(opened.placed, 8);
  // Style=Icon: each step shows its own icon until it is passed (check).
  const steps: StepperStep[] = [
    { id: "placed", title: "Order placed", caption: formatTime(opened.placed), icon: "icon-receipt-line" },
    { id: "preparing", title: "Preparing", caption: plural(itemCount(opened), "item"), icon: "icon-coffee-cup-line" },
    { id: "ready", title: "Ready for pickup", caption: "Counter 2", icon: "icon-shopping-bag-01-line" },
    { id: "picked", title: "Picked up", caption: opened.pickedAt ? formatRelative(opened.pickedAt) : undefined, icon: "icon-package-check-line" },
  ];
  const status = opened.stage === 1 ? `Ready at about ${formatTime(readyAt)}` : opened.stage === 2 ? "Your order is ready at counter 2" : pickedLine(opened.pickedAt ?? TODAY);
  return (
    <PlatformPhone key={opened.id} label="Phin & Co order" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title={`Order ${opened.id}`} scrollRef={screenRef}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
      // The footer holds the one next step: confirm the pickup once it is ready, then order the same again.
      footer={opened.stage === 2 ? <ActionBar position="static" primaryAction={{ label: "Confirm pickup", onClick: () => confirmPickup(opened.id) }} />
        : opened.stage === 4 ? <ActionBar position="static" primaryAction={{ label: "Order again", startIcon: "icon-refresh-cw-01-line", onClick: () => orderAgain(opened) }} />
        : undefined}>
      {screen.anchor}
      <Stack gap="lg" padding="lg">
        <Stack gap="xs">
          <Text role="status" textStyle="Body/Extra/Bold">{status}</Text>
          <Text textStyle="Body/Small/Regular" tone="base">{`${opened.store} · ${phinStores[opened.store]}`}</Text>
        </Stack>
        <Stepper aria-label="Order status" orientation="vertical" steps={steps} current={opened.stage} />
        <Stack as="section" gap="xs" aria-labelledby={linesId}>
          <Heading level={2} id={linesId} textStyle="Body/Small/Bold" tone="light">Your order</Heading>
          <List aria-labelledby={linesId}>
            {opened.lines.map(([id, qty]) => (
              <ListItem key={id} title={`${menu[id].name} × ${qty}`} trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(menu[id].price * qty, true)}</Text>} />
            ))}
          </List>
        </Stack>
      </Stack>
    </PlatformPhone>
  );
}

/* ───────────── New hire onboarding ───────────── */

// Tam Dang joins Alex's design team on Monday. People Ops finished the first two steps; the design lead does the rest.
const newHire = { name: "Tam Dang", role: "Product Designer", email: "tam@dizai.studio", start: daysFromToday(5, 9, 0) };
const startsAt = `${formatDay(newHire.start)} at ${formatTime(newHire.start)}`;
const accountOptions = [
  { id: "zen", label: "Zen workspace", caption: "Projects, tasks and time tracking" },
  { id: "figma", label: "Figma", caption: "Editor seat on the Đìzai Studio team" },
  { id: "slack", label: "Slack", caption: "#design and #studio-hcmc" },
  { id: "google", label: "Google Workspace", caption: newHire.email },
];
const buddyIds: PersonId[] = ["chi", "ava", "emi", "gia"];
const buddyOptions = buddyIds.map((id) => ({ label: people[id].name, value: id }));
const welcomeDraft = "Welcome to the design team, Tam. We start at 9:00 am at the Ho Chi Minh City office, and the whole team has lunch together at noon.";
const onboardingCopy = [
  `${people.minhAnh.name} in People Ops finished this step on Sep 24.`,
  "People Ops ordered it, and it arrives at the office before the first day.",
  `Each account sends an invite to ${newHire.email}.`,
  "A teammate who has lunch with Tam on day one and answers questions in the first month.",
  `Tam gets it on ${startsAt}, from you.`,
];

function NewHireOnboardingExample() {
  const { toast } = useToast();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const [current, setCurrent] = useState(2);
  const [accounts, setAccounts] = useState(["zen", "google"]);
  const [buddy, setBuddy] = useState("");
  const [message, setMessage] = useState(welcomeDraft);
  const [error, setError] = useState<string>();
  // Steps beside the content while the card has room for both columns; on a narrow card they stack.
  const [cardRef, width] = useContainerWidth<HTMLElement>();
  const split = width >= 640;
  // Long titles with captions sit beside the content, vertical. The captions carry the answers, so the stepper
  // doubles as a summary of what has been set up.
  const steps: StepperStep[] = [
    { id: "contract", title: "Contract and paperwork", caption: "Signed Sep 21" },
    { id: "equipment", title: "Laptop and equipment", caption: "Arrives Oct 2" },
    { id: "accounts", title: "Accounts and access", caption: plural(accounts.length, "account") },
    { id: "buddy", title: "Onboarding buddy", caption: buddy ? people[buddy as PersonId].name : "Optional" },
    { id: "welcome", title: "Welcome message", caption: `Sends ${startsAt}` },
  ];
  const scheduled = current === steps.length;

  useEffect(() => { if (moved.current) headingRef.current?.focus(); }, [current]);
  const go = (index: number) => { moved.current = true; if (index === current) headingRef.current?.focus(); else setCurrent(index); };
  const next = () => {
    if (current === 2 && !accounts.length) { setError("Choose at least one account"); return; }
    if (current === steps.length - 1) {
      toast({ title: "Welcome message scheduled", children: `${newHire.name} gets it on ${startsAt}`,
        action: { label: "Undo", onClick: () => setCurrent(steps.length - 1) } });
    }
    go(current + 1);
  };
  const toggleAccount = (id: string, checked: boolean) => {
    setError(undefined);
    setAccounts((list) => (checked ? [...list, id] : list.filter((x) => x !== id)));
  };

  return (
    <Card theme="flat" as="section" aria-label={`Onboarding for ${newHire.name}`}>
      <Grid ref={cardRef} columns={split ? "minmax(0, 16rem) minmax(0, 40rem)" : 1} gap="lg" align="start">
        <Stack gap="md">
          <List aria-label="New hire">
            <ListItem leading={<Avatar theme="crimson" alt="">{initials(newHire.name)}</Avatar>} title={newHire.name} caption={`${newHire.role} · Starts ${formatDay(newHire.start)}`} />
          </List>
          <Stepper aria-label="Onboarding" orientation="vertical" steps={steps} current={current}
            onStepClick={scheduled ? undefined : (_, index) => go(index)} />
        </Stack>
        {scheduled ? (
          <Stack gap="md">
            <Stack gap="xs">
              <Heading ref={headingRef} tabIndex={-1} className="px-stepper-focus-target" level={4} textStyle="Heading/Subheading">Tam is ready for Monday</Heading>
              <Text textStyle="Body/Base/Regular" tone="base">
                {`${plural(accounts.length, "invite")} sent${buddy ? `, ${people[buddy as PersonId].name} is the buddy,` : ""} and the welcome message goes out on ${startsAt}.`}
              </Text>
            </Stack>
            <Stack direction="row" justify="end">
              <Button level="tertiary" startIcon="icon-edit-01-line" onClick={() => go(steps.length - 1)}>Edit message</Button>
            </Stack>
          </Stack>
        ) : (
          <Form onSubmit={next}>
            <Stack gap="md">
              <Stack gap="xs">
                <Heading ref={headingRef} tabIndex={-1} className="px-stepper-focus-target" level={4} textStyle="Heading/Subheading">{steps[current].title}</Heading>
                <Text textStyle="Body/Base/Regular" tone="base">{onboardingCopy[current]}</Text>
              </Stack>
              {current === 0 ? (
                <DescriptionList divider items={[
                  { term: "Contract", description: "Signed Sep 21, 2026" },
                  { term: "Tax and bank forms", description: "Received Sep 24, 2026" },
                  { term: "Start date", description: formatDate(newHire.start) },
                ]} />
              ) : current === 1 ? (
                <DescriptionList divider items={[
                  { term: "Laptop", description: "MacBook Pro 14-inch" },
                  { term: "Display", description: "Dell 27-inch monitor" },
                  { term: "Delivery", description: "Oct 2, 2026 to the Ho Chi Minh City office" },
                ]} />
              ) : current === 2 ? (
                <FormFieldset legend="Accounts" hideLegend kind="checkbox" error={error}>
                  {accountOptions.map((account) => (
                    <Checkbox key={account.id} label={account.label} caption={account.caption} checked={accounts.includes(account.id)}
                      onCheckedChange={(checked) => toggleAccount(account.id, checked)} />
                  ))}
                </FormFieldset>
              ) : current === 3 ? (
                <SelectField label="Buddy" labelOptional placeholder="Choose a teammate" options={buddyOptions} value={buddy} onValueChange={setBuddy} />
              ) : (
                <TextAreaField label="Message" value={message} onValueChange={setMessage} />
              )}
            </Stack>
            <FormActions>
              {current ? <Button level="tertiary" onClick={() => go(current - 1)}>Back</Button> : null}
              <Button level="primary" type="submit">{current === steps.length - 1 ? "Schedule message" : "Continue"}</Button>
            </FormActions>
          </Form>
        )}
      </Grid>
    </Card>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "New project",
    wide: true,
    description: "A horizontal stepper over a four-step form: Continue checks only this step's fields, passed steps are buttons that go back to edit, and each new step moves focus to its heading. When a step would get less than 104px, as on a phone, the stepper turns vertical instead of squeezing its titles.",
    render: () => <NewProjectExample />,
    code: `const steps = [
  { id: "client", title: "Client" },
  { id: "scope", title: "Scope" },
  { id: "team", title: "Team", caption: "Optional" },
  { id: "review", title: "Review" },
];
const [current, setCurrent] = useState(0);

// Horizontal while every step gets 104px, vertical in a narrower container.
const ref = useRef<HTMLDivElement>(null);
const [width, setWidth] = useState(0);
useLayoutEffect(() => {
  const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
  observer.observe(ref.current!);
  return () => observer.disconnect();
}, []);
const orientation = width >= steps.length * 104 ? "horizontal" : "vertical";

// A new step moves focus to its heading.
useEffect(() => headingRef.current?.focus(), [current]);

<Stack ref={ref} gap="lg">
  {/* Passed steps go back to edit; the current step's own button moves focus to its heading. */}
  <Stepper aria-label="New project" steps={steps} current={current} orientation={orientation}
    onStepClick={(step, index) => (index === current ? headingRef.current?.focus() : setCurrent(index))} />
  <Form onSubmit={next}> {/* next(): check this step's fields, then setCurrent(current + 1) */}
    <Heading ref={headingRef} tabIndex={-1} level={4} textStyle="Heading/Subheading">{headings[current]}</Heading>
    <InputField label="Project name" value={name} error={errors.name} onValueChange={setName} />
    <FormActions>{/* Tertiary then Primary on the right */}
      <Button level="tertiary" onClick={() => setCurrent(current - 1)}>Back</Button>
      <Button level="primary" type="submit">{current === steps.length - 1 ? "Create project" : "Continue"}</Button>
    </FormActions>
  </Form>
</Stack>`,
  },
  {
    title: "Failed check",
    description: "When a step fails, error marks it in the stepper and a Negative Inline Message under it says what is wrong and offers the fix. Once fixed the step turns valid, and the import ends with a toast that can undo it.",
    render: () => <FailedCheckExample />,
    code: `<Stepper aria-label="Timesheet import" current={2} orientation={orientation} steps={[
  { id: "upload", title: "Upload", caption: "214 rows" },
  { id: "columns", title: "Columns", caption: "6 of 6 matched" },
  { id: "check", title: "Check", caption: fixed ? "All rows valid" : "3 rows to fix", error: !fixed },
  { id: "import", title: "Import" },
]} />
{fixed ? (
  <>
    <InlineMessage theme="positive" title="All 214 rows are ready">The 3 rows now log time to Loyalty app for Phin & Co.</InlineMessage>
    <Stack direction="row" justify="end">
      <Button level="primary" onClick={start}>Import entries</Button>
    </Stack>
  </>
) : (
  <InlineMessage theme="negative" title="3 rows have no project" action={{ label: "Use Loyalty app", onClick: fix }}>
    Rows 18, 57 and 140 say “Phin loyalty”, which isn’t a project in Zen.
  </InlineMessage>
)}`,
  },
  {
    title: "Invoice approval",
    description: "A vertical stepper without onStepClick tracks who has to act: no step is a button, and the captions name the person and since when. Approving moves the invoice on to Finance, and the toast can undo it.",
    render: () => <InvoiceApprovalExample />,
    code: `<Stepper aria-label="Invoice approval" orientation="vertical" current={approved ? 2 : 1} steps={[
  { id: "draft", title: "Draft", caption: "Linh Vo · 9:12 am" },
  { id: "lead", title: "Design lead", caption: approved ? "You · Approved at 10:30 am" : "You · Waiting since 9:12 am" },
  { id: "finance", title: "Finance", caption: approved ? "Mai Ho · Waiting since 10:30 am" : "Mai Ho" },
  { id: "client", title: "Client", caption: "Sent to Saola Outdoor" },
]} />
{approved
  ? <Text role="status" textStyle="Body/Base/Regular" tone="base">Waiting for Mai Ho in Finance.</Text>
  : <Stack direction="row" justify="end"><Button level="primary" onClick={approve}>Approve invoice</Button></Stack>}

// approve(): setApproved(true), then a Toast whose Undo puts the step back and closes it
toast({ title: "Invoice approved", children: "INV-2026-0143",
  action: { label: "Undo", onClick: () => setApproved(false) } });`,
  },
  {
    title: "New hire onboarding",
    wide: true,
    description: "Longer step titles sit in a vertical stepper beside the step, and each caption shows the answer given there, so the stepper doubles as a summary. People Ops finished the first two steps; they stay reachable to check, and steps ahead stay inert.",
    render: () => <NewHireOnboardingExample />,
    code: `const steps = [
  { id: "contract", title: "Contract and paperwork", caption: "Signed Sep 21" },
  { id: "equipment", title: "Laptop and equipment", caption: "Arrives Oct 2" },
  { id: "accounts", title: "Accounts and access", caption: plural(accounts.length, "account") },
  { id: "buddy", title: "Onboarding buddy", caption: buddy ? people[buddy].name : "Optional" },
  { id: "welcome", title: "Welcome message", caption: "Sends Oct 5 at 9:00 am" },
];

<Card theme="flat" as="section" aria-label="Onboarding for Tam Dang">
  {/* Two columns while the card is at least 640px wide, stacked below that */}
  <Grid ref={ref} columns={width >= 640 ? "minmax(0, 16rem) minmax(0, 40rem)" : 1} gap="lg" align="start">
    <Stack gap="md">
      <List aria-label="New hire">
        <ListItem leading={<Avatar theme="crimson" alt="">TD</Avatar>} title="Tam Dang" caption="Product Designer · Starts Oct 5" />
      </List>
      <Stepper aria-label="Onboarding" orientation="vertical" steps={steps} current={current}
        onStepClick={(step, index) => setCurrent(index)} />
    </Stack>
    <Form onSubmit={next}>
      <Heading ref={headingRef} tabIndex={-1} level={4} textStyle="Heading/Subheading">{steps[current].title}</Heading>
      <FormFieldset legend="Accounts" hideLegend kind="checkbox" error={error}>
        {accountOptions.map((account) => (
          <Checkbox key={account.id} label={account.label} caption={account.caption}
            checked={accounts.includes(account.id)} onCheckedChange={(checked) => toggleAccount(account.id, checked)} />
        ))}
      </FormFieldset>
      <FormActions>
        <Button level="tertiary" onClick={() => setCurrent(current - 1)}>Back</Button>
        <Button level="primary" type="submit">Continue</Button>
      </FormActions>
    </Form>
  </Grid>
</Card>`,
  },
  {
    title: "Pickup order",
    description: "On a phone, a vertical stepper with icons (Style=Icon) tracks an order the customer can't change. The order opens from the Orders list (Back returns to it); it moves on by itself when the order is ready, and the ActionBar then offers Confirm pickup, and after that Order again.",
    render: () => <PickupOrderExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

// The Orders root is a grouped list on Surface-Alt (In progress, Past orders: a kicker over a white block each).
// The order is its child: compact bar, Back, one key per screen.
<PlatformPhone key={order.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="Order A-248" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
  footer={order.stage === 2
    ? <ActionBar position="static" primaryAction={{ label: "Confirm pickup", onClick: confirmPickup }} />
    : undefined}>
  <Stack gap="lg" padding="lg">
    <Text role="status" textStyle="Body/Extra/Bold">{status}</Text>
    <Stepper aria-label="Order status" orientation="vertical" current={order.stage} steps={[
      { id: "placed", title: "Order placed", caption: "10:26 am", icon: "icon-receipt-line" },
      { id: "preparing", title: "Preparing", caption: "3 items", icon: "icon-coffee-cup-line" },
      { id: "ready", title: "Ready for pickup", caption: "Counter 2", icon: "icon-shopping-bag-01-line" },
      { id: "picked", title: "Picked up", icon: "icon-package-check-line" },
    ]} />
    <Stack as="section" gap="xs" aria-labelledby="lines">
      <Heading level={2} id="lines" textStyle="Body/Small/Bold" tone="light">Your order</Heading>
      <List aria-labelledby="lines">
        {order.lines.map(([id, qty]) => (
          <ListItem key={id} title={\`\${menu[id].name} × \${qty}\`}
            trailing={<Text as="span" textStyle="Body/Base/Medium">{formatMoney(menu[id].price * qty, true)}</Text>} />
        ))}
      </List>
    </Stack>
  </Stack>
</PlatformPhone>`,
  },
]);

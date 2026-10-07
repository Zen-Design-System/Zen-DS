/* Action Bar examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Each example teaches one Action Bar
   decision: on a phone one main action leads (vertical, Primary on top) and says why it waits; a pair people choose
   between sits side by side (horizontal); a desktop edit page keeps Undo changes · Save changes in a sticky bar with
   the unsaved count; and a running total rides in the summary, on the screen's own surface. The phones are apps the
   studio builds: the Phin & Co loyalty app and Đìzai Studio's own Zen app (signed in as Alex Duong, Design Lead,
   Wednesday Sep 30, 2026, 10:30 am). */
import { useEffect, useId, useRef, useState } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { IconButton } from "../../../components/Button";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormFieldset, useFormState } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { InlineMessage } from "../../../components/InlineMessage";
import { DateField, InputField, NumberField, SelectField } from "../../../components/Input";
import { Box, Container, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Metric } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { RadioButton } from "../../../components/RadioButton";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, formatDate, formatMoney, formatRange, formatRelative, daysFromToday, initials, leaveStatusTheme, people, projectById,
  type LeaveKind, type LeaveStatus, type Person, type PersonId,
} from "../data";
import type { ExampleDef } from "../types";
import { keepOnHotUpdate } from "../../hotData";
import "./action-bar.css";

export const page: PlatformPage = "action-bar";

const wait = (ms: number) => new Promise<void>((resolve) => { window.setTimeout(resolve, ms); });
/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const back = "icon-chevron-left-line-medium" as const;

// ——— 1. Redeem a reward: one main action leads, and says why it waits ——————————————————————————————————————
type Reward = { id: string; name: string; points: number; where: string; about: string; icon: IconName; theme: DockIconTheme };
const rewards: Reward[] = ([
  ["sua-da", "Phin sữa đá", 120, "Any store", "Our robusta, slow-dripped over condensed milk and ice. Any size.", "icon-coffee-cup-line", "brown"],
  ["bac-xiu", "Bạc xỉu", 120, "Any store", "More milk than coffee, the way Saigon drinks it in the afternoon. Any size.", "icon-coffee-cup-line", "brown"],
  ["cold-brew", "Orange cold brew", 150, "Any store", "Cold brew steeped for 18 hours, with orange and lemongrass.", "icon-coffee-cup-line", "brown"],
  ["lotus-tea", "Golden lotus tea", 130, "Any store", "Oolong scented with West Lake lotus, hot or iced.", "icon-salad-leaf-line", "green"],
  ["banh-mi", "Bánh mì chả cá", 90, "Stores with a kitchen", "Fish cake, pickles and herbs in a baguette baked each morning.", "icon-bread-line", "orange"],
  ["upsize", "Free upsize", 40, "Any store", "Make any drink one size larger.", "icon-arrow-up-line", "blue"],
  ["affogato", "Affogato", 160, "Any store", "Coconut ice cream under a shot of phin coffee.", "icon-ice-cream-line", "pink"],
  ["off-20", "20% off an order", 200, "App orders", "Twenty percent off one app order, up to $10.", "icon-percent-01-line", "purple"],
  ["delivery", "Free delivery", 60, "App orders", "No delivery fee on one app order within 5 km.", "icon-truck-line", "teal"],
  ["tote", "Phin canvas tote", 400, "Nguyen Hue store", "A heavy cotton tote, printed in District 1.", "icon-shopping-bag-01-line", "indigo"],
  ["beans", "Robusta beans, 250 g", 480, "Any store", "Whole beans from our farm in Đắk Lắk, roasted this week.", "icon-package-line", "brown"],
  ["filter", "Phin filter set", 650, "Any store", "A stainless steel phin with two cups, to brew at home.", "icon-gift-01-line", "red"],
  ["cupping", "Weekend cupping class", 900, "Thu Duc roastery", "Two hours with our roasters, tasting this season's lots.", "icon-ticket-01-line", "violet"],
  ["gift-card", "$10 gift card", 1000, "Any store", "A card to give, loaded with $10.", "icon-gift-02-line", "golden"],
] as const).map(([id, name, points, where, about, icon, theme]) => ({ id, name, points, where, about, icon, theme }));
const pointsLabel = (n: number) => plural(n, "point");

function PhoneRewardsExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [balance, setBalance] = useState(340);
  const [saved, setSaved] = useState<string[]>([]);
  const [codes, setCodes] = useState<Record<string, string>>({});
  // The example opens on a reward, the screen it teaches; Back leads to the list.
  const [openId, setOpenId] = useState<string | null>("sua-da");
  const reward = rewards.find((item) => item.id === openId);
  const backToList = (id: string) => screen.go(`[data-reward="${id}"] .zen-list-item__wrapper`, () => setOpenId(null));

  if (!reward) {
    return (
      <PlatformPhone key="root" label="Rewards" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Rewards" largeTitle="Rewards" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* Rows pad 12px above and below: the screen margin (lg) insets them sideways. */}
        <Stack gap="md" paddingX="lg" paddingY="sm">
          <Metric size="md" label="Your points" value={balance.toLocaleString("en-US")} icon="icon-star-01-solid" iconTheme="accent" />
          <List aria-label="Rewards">
            {rewards.map((item) => (
              <ListItem key={item.id} data-reward={item.id} title={item.name} caption={`${pointsLabel(item.points)} · ${item.where}`}
                leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />}
                trailing={codes[item.id] ? <Badge theme="green" background="subtle">Redeemed</Badge> : saved.includes(item.id) ? <Badge theme="neutral" background="subtle">Saved</Badge> : undefined}
                onClick={() => screen.go(`.zen-top-nav__action[aria-label="Back"]`, () => setOpenId(item.id))} />
            ))}
          </List>
        </Stack>
      </PlatformPhone>
    );
  }

  const code = codes[reward.id];
  const short = reward.points - balance;
  const isSaved = saved.includes(reward.id);
  const redeem = () => {
    setBalance((points) => points - reward.points);
    setCodes((all) => ({ ...all, [reward.id]: `PHIN-${4821 + Object.keys(all).length}` }));
    toast({ type: "positive", title: "Reward redeemed" });
  };
  const toggleSave = () => {
    setSaved((ids) => (isSaved ? ids.filter((id) => id !== reward.id) : [...ids, reward.id]));
    toast({ title: isSaved ? "Removed from saved" : "Reward saved" });
  };
  return (
    <PlatformPhone key={reward.id} label={reward.name} headerOverlay screenRef={screenRef}
      header={<TopNavigation title={reward.name} scrollRef={screenRef}
        leading={{ icon: back, label: "Back", onClick: () => backToList(reward.id) }}
        type="compact"
        />}
      // Vertical: one main action leads, full width on top; the alternative sits below it. The summary says what the
      // action depends on, and why it waits when it is disabled.
      footer={<ActionBar position="static"
        summary={<Text as="span" role="status" textStyle="Body/Base/Medium">
          {code ? `Show code ${code} at the counter` : short > 0 ? `You need ${plural(short, "more point")}` : `You have ${pointsLabel(balance)}`}
        </Text>}
        primaryAction={code ? { label: "Done", onClick: () => backToList(reward.id) } : { label: `Redeem for ${pointsLabel(reward.points)}`, disabled: short > 0, onClick: redeem }}
        secondaryAction={code ? undefined : { label: isSaved ? "Remove from saved" : "Save for later", onClick: toggleSave }} />}>
      {screen.anchor}
      {/* The compact bar names the reward (the screen's h1); the price is a value of the reward, so it is a row below. */}
      <Stack padding="lg" gap="lg">
        <Stack gap="md" align="center" justify="center">
          <DockIcon icon={reward.icon} theme={reward.theme} background="subtle" size="xl" />
          <Text tone="base" align="center">{reward.about}</Text>
        </Stack>
        <DescriptionList divider items={[
          { id: "cost", term: "Cost", description: pointsLabel(reward.points) },
          { id: "where", term: "Use it at", description: reward.where },
          { id: "expires", term: "Expires", description: formatDate(daysFromToday(90)) },
          { id: "limit", term: "Limit", description: "One per visit" },
        ]} layout="inline" />
      </Stack>
    </PlatformPhone>
  );
}

// ——— 2. Approve on a phone: a pair people choose between, side by side ————————————————————————————————————
type Approval = { id: string; person: PersonId; kind: LeaveKind; from: Date; to: Date; days: number; status: LeaveStatus; note?: string; requested: Date };
const d = (month: number, date: number) => new Date(2026, month - 1, date);
/** Annual leave left this year for the Design team Alex approves. */
const annualLeft: Partial<Record<PersonId, number>> = { chi: 9, emi: 6, gia: 11, ava: 8 };
const approvals: Approval[] = ([
  ["chi", "Annual leave", d(10, 19), d(10, 21), 3, "Pending", "Wedding in Hải Phòng", daysFromToday(-3, 16, 45)],
  ["emi", "Annual leave", d(10, 26), d(10, 27), 2, "Pending", undefined, daysFromToday(-1, 11, 10)],
  ["gia", "Annual leave", d(11, 16), d(11, 20), 5, "Pending", "Hiking in Sa Pa", daysFromToday(0, 9, 12)],
  ["ava", "Sick leave", d(9, 22), d(9, 23), 2, "Approved", undefined, d(9, 22)],
  ["gia", "Unpaid leave", d(11, 2), d(11, 6), 5, "Declined", "Overlaps the Saola kickoff", d(9, 24)],
  ["chi", "Sick leave", d(9, 8), d(9, 8), 1, "Approved", undefined, d(9, 8)],
  ["emi", "Annual leave", d(8, 24), d(8, 28), 5, "Approved", "Visiting family in Osaka", d(8, 3)],
  ["ava", "Annual leave", d(8, 10), d(8, 14), 5, "Approved", undefined, d(7, 20)],
  ["gia", "Sick leave", d(7, 20), d(7, 20), 1, "Approved", undefined, d(7, 20)],
  ["chi", "Annual leave", d(7, 6), d(7, 10), 5, "Approved", "Summer trip to Phú Quốc", d(6, 15)],
  ["emi", "Sick leave", d(6, 15), d(6, 15), 1, "Approved", undefined, d(6, 15)],
  ["ava", "Annual leave", d(5, 25), d(5, 26), 2, "Cancelled", undefined, d(5, 2)],
  ["gia", "Annual leave", d(5, 4), d(5, 8), 5, "Approved", undefined, d(4, 14)],
  ["chi", "Annual leave", d(4, 27), d(4, 29), 3, "Approved", undefined, d(4, 1)],
] as const).map(([person, kind, from, to, days, status, note, requested], index) => ({ id: `a${index}`, person, kind, from, to, days, status, note, requested }));
const datesOf = (item: Pick<Approval, "from" | "to">) => (item.from.getTime() === item.to.getTime() ? formatDate(item.from) : formatRange(item.from, item.to));

function PhoneApprovalsExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const [list, setList] = useState(approvals);
  const [openId, setOpenId] = useState<string | null>("a0");
  const item = list.find((approval) => approval.id === openId);
  const setStatus = (id: string, status: LeaveStatus) => setList((rows) => rows.map((row) => (row.id === id ? { ...row, status } : row)));
  // The footer leaves once the request is answered, so focus moves to Back instead of falling to the page.
  const focusBack = () => requestAnimationFrame(() => screenRef.current?.closest(".platform-phone")?.querySelector<HTMLElement>('.zen-top-nav__action[aria-label="Back"]')?.focus());
  const decide = (approval: Approval, status: "Approved" | "Declined") => {
    setStatus(approval.id, status);
    toast({ title: status === "Approved" ? "Leave approved" : "Leave declined", action: { label: "Undo", onClick: () => setStatus(approval.id, "Pending") } });
    focusBack();
  };

  if (!item) {
    const waiting = list.filter((approval) => approval.status === "Pending").length;
    return (
      <PlatformPhone key="root" label="Approvals" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Approvals" largeTitle="Approvals" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* Rows pad 12px above and below: the screen margin (lg) insets them sideways; the count sits xs above them. */}
        <Stack gap="xs" paddingX="lg" paddingY="sm">
          <Text role="status" textStyle="Body/Small/Regular" tone="base">{waiting ? `${plural(waiting, "request")} waiting for you` : "Nothing waiting for you"}</Text>
          <List aria-label="Leave requests from the Design team">
            {list.map((approval) => (
              <ListItem key={approval.id} data-approval={approval.id} title={people[approval.person].name} caption={`${approval.kind} · ${datesOf(approval)}`}
                leading={<Avatar size="md" {...avatarOf(people[approval.person])} />}
                trailing={<Badge theme={leaveStatusTheme[approval.status]} background="subtle">{approval.status}</Badge>}
                onClick={() => screen.go(`.zen-top-nav__action[aria-label="Back"]`, () => setOpenId(approval.id))} />
            ))}
          </List>
        </Stack>
      </PlatformPhone>
    );
  }

  const person = people[item.person];
  const left = item.kind === "Annual leave" ? annualLeft[item.person] : undefined;
  const pending = item.status === "Pending";
  return (
    <PlatformPhone key={item.id} label="Leave request" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title="Leave request" scrollRef={screenRef}
        leading={{ icon: back, label: "Back", onClick: () => screen.go(`[data-approval="${item.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}
      // Horizontal: two peer answers side by side as Large buttons, Primary at the end; the summary takes its own row.
      footer={pending ? (
        <ActionBar position="static" direction="horizontal"
          summary={<Text as="span" textStyle="Body/Base/Medium">{left === undefined ? plural(item.days, "working day") : `${plural(item.days, "working day")} · ${plural(left - item.days, "day")} left after`}</Text>}
          secondaryAction={{ label: "Decline", onClick: () => decide(item, "Declined") }}
          primaryAction={{ label: "Approve", onClick: () => decide(item, "Approved") }} />
      ) : undefined}>
      {screen.anchor}
      <Stack padding="lg" gap="lg">
        <Stack direction="column" gap="md" align="center">
          <Avatar size="3xl" {...avatarOf(person)} />
          <Stack gap="2xs" className="px-action-bar-grow" width="fill">
            <Heading level={2} textStyle="Heading/2" align="center" width="fill">{person.name}</Heading>
            <Text textStyle="Body/Small/Regular" tone="light" align="center">{person.role}</Text>
          </Stack>
        </Stack>
        {/* The status is a value of the request: a Badge in its own row, never squeezed beside the name. */}
        <DescriptionList divider items={[
          { id: "status", term: "Status", description: <Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge> },
          { id: "kind", term: "Type", description: item.kind },
          { id: "dates", term: "Dates", description: datesOf(item) },
          { id: "length", term: "Length", description: plural(item.days, "working day") },
          ...(left === undefined ? [] : [{ id: "left", term: "Annual leave left", description: plural(left, "day") }]),
          ...(item.note ? [{ id: "note", term: "Note", description: item.note }] : []),
          { id: "requested", term: "Requested", description: formatRelative(item.requested) },
        ]} />
      </Stack>
    </PlatformPhone>
  );
}

// ——— 3. Unsaved changes: a sticky bar on a desktop edit page ————————————————————————————————————————————————
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

function UnsavedChangesExample() {
  const { toast } = useToast();
  const generalId = useId();
  const scheduleId = useId();
  const billingId = useId();
  const [saved, setSaved] = useState(savedSettings);
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
  const formRef = useRef<HTMLFormElement>(null);
  // With nothing left to save, both buttons wait (disabled), so focus goes back to the first field instead of the page.
  const refocus = () => requestAnimationFrame(() => {
    const active = document.activeElement as HTMLButtonElement | null;
    if (!active || active === document.body || active.disabled) formRef.current?.querySelector<HTMLElement>("input")?.focus();
  });
  const undo = () => { form.reset(); toast({ title: "Changes undone" }); refocus(); };
  return (
    <div className="px-action-bar-frame">
      {/* The page scrolls; the bar is the form's last child, so it sticks to the bottom and its Save submits the form. */}
      <Form ref={formRef} form={form} gap="none" className="px-action-bar-frame__scroll" aria-label="Project settings">
        {/* The form keeps a readable width (as the create form on the Form page); the bar spans the window. The Box is
            the flex child that stretches, so the Container's auto margins centre it at up to 960px instead of shrinking
            it to its fields. */}
        <Box><Container gutter={false}><Stack paddingY="xl" gap="xl" paddingX="xl">
          <PageHeader eyebrow="Loyalty app · Phin & Co" title="Project settings" description="Changes reach the whole team when you save them." />
          <Stack as="section" gap="md" aria-labelledby={generalId}>
            <Heading level={2} id={generalId} textStyle="Heading/4">General</Heading>
            <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="sm">
              <InputField label="Project name" maxLength={60} {...form.field("name")} />
              <SelectField label="Project lead" options={leadOptions} {...form.selectField("lead")} />
            </Grid>
          </Stack>
          <Stack as="section" gap="md" aria-labelledby={scheduleId}>
            <Heading level={2} id={scheduleId} textStyle="Heading/4">Schedule</Heading>
            <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="sm">
              <DateField label="Start date" today={TODAY} {...form.dateField("start")} />
              <DateField label="Due date" today={TODAY} {...form.dateField("due")} />
            </Grid>
          </Stack>
          <Stack as="section" gap="md" aria-labelledby={billingId}>
            <Heading level={2} id={billingId} textStyle="Heading/4">Billing</Heading>
            <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="sm">
              <NumberField label="Budget (USD)" min={0} step={1000} helpText={form.values.budget ? formatMoney(form.values.budget) : undefined} {...form.numberField("budget")} />
              <InputField label="Billing email" type="email" {...form.field("billingEmail")} />
            </Grid>
            {/* Three short choices: a radio row, as on the Form page's Add a client. */}
            <FormFieldset kind="radio" legend="Payment terms" direction="row" helpText="Days the client has to pay each invoice">
              {termsOptions.map((terms) => <RadioButton key={terms} label={terms} {...form.radioField("terms", terms)} />)}
            </FormFieldset>
          </Stack>
        </Stack></Container></Box>
        <ActionBar direction="horizontal" aria-label="Project settings actions"
          summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{changes ? plural(changes, "unsaved change") : "No changes to save yet"}</Text>}
          secondaryAction={{ label: "Undo changes", onClick: undo, disabled: !changes || form.isSubmitting }}
          primaryAction={{ label: form.isSubmitting ? "Saving…" : "Save changes", type: "submit", disabled: !changes || form.isSubmitting }}
          position="fixed" />
      </Form>
    </div>
  );
}

// ——— 4. A running total: the summary follows the order, on the screen's own surface ——————————————————————————
type Line = { id: string; name: string; detail: string; price: number; qty: number; icon: IconName; theme: DockIconTheme };
const usualOrder: Line[] = [
  { id: "l1", name: "Phin sữa đá", detail: "Medium · less sugar", price: 2.6, qty: 2, icon: "icon-coffee-cup-line", theme: "brown" },
  { id: "l2", name: "Golden lotus tea", detail: "Large · less ice", price: 3.2, qty: 1, icon: "icon-salad-leaf-line", theme: "green" },
  { id: "l3", name: "Bánh mì chả cá", detail: "No chili", price: 2.4, qty: 1, icon: "icon-bread-line", theme: "orange" },
];

function PhoneOrderExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const itemsId = useId();
  const pickupId = useId();
  const [lines, setLines] = useState(usualOrder);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const change = (line: Line, by: number) => {
    if (line.qty + by > 0) { setLines((all) => all.map((item) => (item.id === line.id ? { ...item, qty: item.qty + by } : item))); return; }
    // The last one out removes the line; the toast can bring it back where it was. Its buttons go with it, so focus
    // moves to Place order (or to the empty state once nothing is left).
    const before = lines;
    screen.go(lines.length > 1 ? ".platform-phone__footer button" : ".zen-empty-state button", () => setLines((all) => all.filter((item) => item.id !== line.id)));
    toast({ title: `${line.name} removed`, action: { label: "Undo", onClick: () => setLines(before) } });
  };
  const place = () => {
    setPlacing(true);
    timer.current = window.setTimeout(() => {
      // The confirmation is a new screen: focus moves to its one action. The screen's Inline Message confirms the
      // order, so no toast repeats it; the status region outside the phone tells screen readers.
      screen.go(".zen-action-bar button", () => { setPlacing(false); setPlaced("A-252"); setLines([]); });
    }, 900);
  };
  const startAgain = () => screen.go(".zen-action-bar button", () => { setPlaced(null); setLines(usualOrder); });
  const kicker = (id: string, text: string) => <Box paddingX="lg"><Heading id={id} textStyle="Body/Small/Bold" tone="light" truncate={false}>{text}</Heading></Box>;

  return (
    <>
    {/* Outlives the screen change, so the confirmation is announced. */}
    <VisuallyHidden role="status">{placed ? `Order ${placed} placed. Pick it up at Phin Nguyen Hue in about 10 minutes.` : ""}</VisuallyHidden>
    {/* A grouped screen on Surface-Alt: the bar takes the same surface (surface="alt"), with its Pale top rule. */}
    <PlatformPhone key={placed ? "placed" : "order"} label="Order" canvas="alt" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="alt" title="Order" largeTitle="Order" scrollRef={screenRef} />}
      footer={placed ? (
        <ActionBar position="static" surface="alt" primaryAction={{ label: "Start a new order", onClick: startAgain }} />
      ) : lines.length ? (
        <ActionBar position="static" surface="alt"
          summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{`${plural(count, "item")} · ${formatMoney(total, true)}`}</Text>}
          primaryAction={{ label: placing ? "Placing order…" : "Place order", disabled: placing, onClick: place }} />
      ) : undefined}>
      {screen.anchor}
      {placed ? (
        <Stack padding="lg">
          <InlineMessage theme="positive" title={`Order ${placed} is being made`}>Pick it up at Phin Nguyen Hue in about 10 minutes.</InlineMessage>
        </Stack>
      ) : lines.length ? (
        <Stack gap="lg" padding="lg">
          <Stack as="section" gap="xs" aria-labelledby={itemsId}>
            {kicker(itemsId, "Drinks and food")}
            <ListBox>
              <List aria-labelledby={itemsId}>
                {lines.map((line) => (
                  // The caption stays one line beside the stepper; the summary carries the money.
                  <ListItem key={line.id} title={line.name} caption={line.detail}
                    leading={<DockIcon icon={line.icon} theme={line.theme} background="subtle" />}
                    trailing={(
                      <Stack direction="row" gap="2xs" align="center" role="group" aria-label={`${line.name} quantity`}>
                        <IconButton level="tertiary" size="xs" icon="icon-minus-line" aria-label={`Remove one ${line.name}`} onClick={() => change(line, -1)} />
                        <Text as="span" textStyle="Body/Base/Medium" className="px-action-bar-qty" width="hug">{line.qty}</Text>
                        <IconButton level="tertiary" size="xs" icon="icon-plus-line" aria-label={`Add one ${line.name}`} onClick={() => change(line, 1)} />
                      </Stack>
                    )} />
                ))}
              </List>
            </ListBox>
          </Stack>
          <Stack as="section" gap="xs" aria-labelledby={pickupId}>
            {kicker(pickupId, "Pick up at")}
            <ListBox>
              <List aria-labelledby={pickupId}>
                <ListItem title="Phin Nguyen Hue" caption="42 Nguyen Hue, District 1 · ready in about 10 minutes"
                  leading={<DockIcon icon="icon-marker-pin-01-line" theme="neutral" background="subtle" />}
                  selected={false}
                  as="li"
                  titleLines={1} />
              </List>
            </ListBox>
          </Stack>
        </Stack>
      ) : (
        // With nothing to order there is nothing to place: the bar goes with the last line.
        <Stack padding="lg">
          <EmptyState illustration={false} headingLevel={2} title="Your order is empty" primaryAction={{ label: "Add your usual", onClick: () => screen.go(".platform-phone__footer button", () => setLines(usualOrder)) }}>
            Your usual is two Phin sữa đá, a lotus tea and a bánh mì.
          </EmptyState>
        </Stack>
      )}
    </PlatformPhone>
    </>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————————
export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Footer on a phone",
    description: "In the Phin & Co app a reward's main action leads the footer: Large, full width, Primary on top, Save for later below. The summary says what Redeem depends on, and why it waits when it is disabled; Back returns to the rewards.",
    render: () => <PhoneRewardsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key={reward.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title={reward.name} scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToList }} />}
  footer={<ActionBar position="static"
    summary={<Text as="span" role="status" textStyle="Body/Base/Medium">
      {short > 0 ? \`You need \${plural(short, "more point")}\` : \`You have \${plural(balance, "point")}\`}
    </Text>}
    primaryAction={{ label: \`Redeem for \${plural(reward.points, "point")}\`, disabled: short > 0, onClick: redeem }}
    secondaryAction={{ label: "Save for later", onClick: save }} />}>
  …
</PlatformPhone>`,
  },
  {
    title: "Two choices on a phone",
    description: "Approve and Decline are peers, so the bar is horizontal: two Large buttons side by side with Approve at the end, and the summary on its own row. Either answer can be undone from the toast; once answered, the bar goes away.",
    render: () => <PhoneApprovalsExample />,
    code: `<PlatformPhone key={request.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="Leave request" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToList }} />}
  footer={request.status === "Pending" ? (
    <ActionBar position="static" direction="horizontal"
      summary={<Text as="span" textStyle="Body/Base/Medium">3 working days · 6 days left after</Text>}
      secondaryAction={{ label: "Decline", onClick: () => decide("Declined") }}
      primaryAction={{ label: "Approve", onClick: () => decide("Approved") }} />
  ) : undefined}>
  …
</PlatformPhone>

const decide = (status) => {
  setStatus(request.id, status);
  toast({ title: status === "Approved" ? "Leave approved" : "Leave declined", action: { label: "Undo", onClick: () => setStatus(request.id, "Pending") } });
};`,
  },
  {
    title: "Unsaved changes",
    description: "A desktop edit page keeps its actions in a sticky bar at the bottom of the scrolling page: the unsaved count at the start, Undo changes · Save changes at the end. With nothing changed both wait and the summary says why; under 480px the buttons split a row of their own.",
    wide: true,
    screen: true,
    render: () => <UnsavedChangesExample />,
    code: `const changes = Object.keys(saved).filter((key) => form.values[key] !== saved[key]).length;

<Form form={form} gap="none" className="page-scroll"> {/* the scrolling area; the bar is its last child */}
  <Box><Container gutter={false}><Stack paddingY="xl" gap="xl" paddingX="xl"> {/* Box stretches; the Container centres in it */}
    <PageHeader eyebrow="Loyalty app · Phin & Co" title="Project settings" />
    <Stack as="section" gap="md" aria-labelledby="general">…</Stack>
    <Stack as="section" gap="md" aria-labelledby="schedule">…</Stack>
    <Stack as="section" gap="md" aria-labelledby="billing">…</Stack>
  </Stack></Container></Box>
  <ActionBar direction="horizontal" aria-label="Project settings actions"
    summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{changes ? plural(changes, "unsaved change") : "No changes to save yet"}</Text>}
    secondaryAction={{ label: "Undo changes", onClick: () => form.reset(), disabled: !changes }}
    primaryAction={{ label: form.isSubmitting ? "Saving…" : "Save changes", type: "submit", disabled: !changes }} />
</Form>`,
  },
  {
    title: "Running total",
    description: "The order's total rides in the summary and follows every + and −, so the Place order label stays short. On a Surface-Alt screen the bar takes surface=\"alt\"; when the last item goes, so does the bar, and the empty state brings the order back.",
    render: () => <PhoneOrderExample />,
    code: `<PlatformPhone key={placed ? "placed" : "order"} canvas="alt" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Order" largeTitle="Order" scrollRef={screenRef} />}
  footer={lines.length ? (
    <ActionBar position="static" surface="alt"
      summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{\`\${plural(count, "item")} · \${formatMoney(total, true)}\`}</Text>}
      primaryAction={{ label: "Place order", onClick: place }} />
  ) : undefined}>
  <ListBox>
    <List aria-labelledby="items">
      {lines.map((line) => (
        <ListItem key={line.id} title={line.name} caption={line.detail}
          leading={<DockIcon icon={line.icon} theme={line.theme} background="subtle" />}
          trailing={<>
            <IconButton level="tertiary" size="xs" icon="icon-minus-line" aria-label={\`Remove one \${line.name}\`} onClick={() => change(line, -1)} />
            <Text as="span" textStyle="Body/Base/Medium">{line.qty}</Text>
            <IconButton level="tertiary" size="xs" icon="icon-plus-line" aria-label={\`Add one \${line.name}\`} onClick={() => change(line, 1)} />
          </>} />
      ))}
    </List>
  </ListBox>
</PlatformPhone>`,
  },
]);

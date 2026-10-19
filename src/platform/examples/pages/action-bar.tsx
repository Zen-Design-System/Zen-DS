/* Action Bar examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Each example teaches one Action Bar
   decision: on a phone one main action leads (vertical, Primary on top) and says why it waits; a pair people choose
   between sits side by side (horizontal); a desktop edit page keeps Undo changes · Save changes in a sticky bar with
   the unsaved count; and a running total rides in the summary, on the screen's own surface. The phones are apps the
   studio builds: the Phin & Co loyalty app and Đìzai Studio's own Zen app (signed in as Alex Duong, Design Lead,
   Wednesday Sep 30, 2026, 10:30 am). */
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { AppShell, AppShellAccount, AppShellAction, AppShellHeader } from "../../../components/AppShell";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../components/BottomNavigation";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { IconButton } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, FormFieldset, useFormState } from "../../../components/Form";
import type { IconName } from "../../../components/Icon";
import { InlineMessage } from "../../../components/InlineMessage";
import { DateField, InputField, NumberField, SelectField } from "../../../components/Input";
import { Box, Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Menu } from "../../../components/Menu";
import { MetricCard } from "../../../components/MetricWidget";
import { PageHeader } from "../../../components/PageHeader";
import { RadioButton } from "../../../components/RadioButton";
import { Sidebar, SidebarMenuItem, type SidebarSection } from "../../../components/Sidebar";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { VisuallyHidden } from "../../../components/VisuallyHidden";
import { PreviewAppFrame, StudioLogo, StudioMark } from "../../PlatformFrames";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  TODAY, activity, formatDate, formatMoney, formatRange, formatRelative, formatTime, daysFromToday, initials, leaveStatusTheme, me, people, projectById, studio, tasks,
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

/** A place this example does not draw: the toast says so, and the navigation keeps the current screen. */
function useNotHere() {
  const { toast } = useToast();
  return (label: string) => toast({ title: `${label} isn't part of this example`, children: "This screen shows the Action Bar." });
}

/** A phone app's tab bar on its root screens: the other roots are not drawn here, so a toast says so and the bar keeps
 *  this root (a selected tab shows its solid icon). */
function PhoneRoots({ label, items, value }: { label: string; items: BottomNavigationItem[]; value: string }) {
  const notHere = useNotHere();
  return (
    <BottomNavigation aria-label={label} showLabels items={items} value={value}
      onValueChange={(id) => { if (id !== value) notHere(items.find((item) => item.id === id)?.label ?? id); }} />
  );
}
/** A list's group title on a phone: Body/Small/Bold Light, lined up with the row text inside its ListBox. */
const kickerOf = (id: string, text: ReactNode) => <Box paddingX="lg"><Heading level={2} id={id} textStyle="Body/Small/Bold" tone="light" truncate={false}>{text}</Heading></Box>;

// ——— 1. Redeem a reward: one main action leads, and says why it waits ——————————————————————————————————————
/** The Phin & Co app's roots. */
const phinRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "order", label: "Order", icon: "icon-coffee-cup-line", selectedIcon: "icon-coffee-cup-solid" },
  { id: "rewards", label: "Rewards", icon: "icon-gift-01-line", selectedIcon: "icon-gift-01-solid" },
  { id: "account", label: "Account", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
/** Gold, the next member tier, starts at 500 points. */
const GOLD_POINTS = 500;
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
  const nowId = useId();
  const laterId = useId();

  if (!reward) {
    // What the points buy today first, then what they are saving up for; both lists follow the balance.
    const groups = [
      { id: nowId, title: "Redeem now", rows: rewards.filter((item) => item.points <= balance) },
      { id: laterId, title: "Keep collecting", rows: rewards.filter((item) => item.points > balance) },
    ].filter((group) => group.rows.length);
    return (
      // A tab root of the Phin & Co app: the large title folds as the rewards scroll under the bar, and the tab bar holds
      // the app's roots. The tab bar casts a shadow, so the points card and the lists take the same Shadow elevation.
      <PlatformPhone key="root" label="Rewards" canvas="default" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation title="Rewards" largeTitle="Rewards" largeTitleSubheading="Phin & Co member · Silver" scrollRef={screenRef} />}
          bottomNavigation={<PhoneRoots label="Phin & Co" items={phinRoots} value="rewards" />}
        >
          {screen.anchor}
          <MetricCard theme="shadow" type="goal-progress" label="Your points" value={pointsLabel(balance)} icon="icon-star-01-solid" iconTheme="accent"
            format={(points) => points.toLocaleString("en-US")}
            goal={{ value: balance, target: GOLD_POINTS, label: `of ${GOLD_POINTS} for Gold`, valueLabel: balance >= GOLD_POINTS ? "Gold" : `${plural(GOLD_POINTS - balance, "point")} to go` }} />
          {groups.map((group) => (
            <Stack key={group.id} as="section" gap="xs" aria-labelledby={group.id}>
              {kickerOf(group.id, group.title)}
              <ListBox theme="shadow">
                <List aria-labelledby={group.id}>
                  {group.rows.map((item) => (
                    <ListItem key={item.id} data-reward={item.id} title={item.name} caption={`${pointsLabel(item.points)} · ${item.where}`}
                      leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" />}
                      trailing={codes[item.id] ? <Badge theme="green" background="subtle">Redeemed</Badge> : saved.includes(item.id) ? <Badge theme="neutral" background="subtle">Saved</Badge> : undefined}
                      onClick={() => screen.go(`.zen-top-nav__action[aria-label="Back"]`, () => setOpenId(item.id))} />
                  ))}
                </List>
              </ListBox>
            </Stack>
          ))}
        </AppShell>
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
    // A pushed screen: the compact bar with Back and the reward's name (the screen's h1), the reward's actions pinned in
    // the Action bar (Figma Bottom=Actions), no tab bar.
    <PlatformPhone key={reward.id} label={reward.name} canvas="default" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="compact-alt" title={reward.name} scrollRef={screenRef}
          leading={{ icon: back, label: "Back", onClick: () => backToList(reward.id) }} />}
        // Vertical: one main action leads, full width on top; the alternative sits below it. The summary says what the
        // action depends on, and why it waits when it is disabled.
        actionBar={<ActionBar
          summary={<Text as="span" role="status" textStyle="Body/Base/Medium">
            {code ? `Show code ${code} at the counter` : short > 0 ? `You need ${plural(short, "more point")}` : `You have ${pointsLabel(balance)}`}
          </Text>}
          primaryAction={code ? { label: "Done", onClick: () => backToList(reward.id) } : { label: `Redeem for ${pointsLabel(reward.points)}`, disabled: short > 0, onClick: redeem }}
          secondaryAction={code ? undefined : { label: isSaved ? "Remove from saved" : "Save for later", onClick: toggleSave }} />}
      >
        {screen.anchor}
        {/* The price is a value of the reward, so it is a row of its facts; once redeemed, the code leads them. */}
        <Stack gap="md" align="center" justify="center" paddingY="md">
          <DockIcon icon={reward.icon} theme={reward.theme} background="subtle" size="2xl" />
          <Text tone="base" align="center">{reward.about}</Text>
        </Stack>
        <Card theme="flat">
          <DescriptionList divider layout="inline" items={[
            ...(code ? [{ id: "code", term: "Your code", description: code }] : []),
            { id: "cost", term: "Cost", description: pointsLabel(reward.points) },
            { id: "where", term: "Use it at", description: reward.where },
            { id: "expires", term: "Expires", description: formatDate(daysFromToday(90)) },
            { id: "limit", term: "Limit", description: "One per visit" },
          ]} />
        </Card>
      </AppShell>
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
/** Đìzai Studio's Zen app, the roots of its tab bar. */
const zenRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "tasks", label: "Tasks", icon: "icon-check-square-line", selectedIcon: "icon-check-square-solid" },
  { id: "approvals", label: "Approvals", icon: "icon-clipboard-check-line", selectedIcon: "icon-clipboard-check-solid" },
  { id: "me", label: "Me", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];

function PhoneApprovalsExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const waitingId = useId();
  const answeredId = useId();
  const [list, setList] = useState(approvals);
  const [openId, setOpenId] = useState<string | null>("a0");
  const item = list.find((approval) => approval.id === openId);
  const setStatus = (id: string, status: LeaveStatus) => setList((rows) => rows.map((row) => (row.id === id ? { ...row, status } : row)));
  // The Action bar leaves once the request is answered, so focus moves to Back instead of falling to the page.
  const focusBack = () => requestAnimationFrame(() => screenRef.current?.closest(".platform-phone")?.querySelector<HTMLElement>('.zen-top-nav__action[aria-label="Back"]')?.focus());
  const decide = (approval: Approval, status: "Approved" | "Declined") => {
    setStatus(approval.id, status);
    toast({ title: status === "Approved" ? "Leave approved" : "Leave declined", action: { label: "Undo", onClick: () => setStatus(approval.id, "Pending") } });
    focusBack();
  };

  if (!item) {
    const waiting = list.filter((approval) => approval.status === "Pending");
    const answered = list.filter((approval) => approval.status !== "Pending");
    const groups = [
      { id: waitingId, title: "Waiting for you", rows: waiting },
      { id: answeredId, title: "Answered", rows: answered },
    ].filter((group) => group.rows.length);
    return (
      // A tab root of Đìzai Studio's Zen app: the requests Alex approves for the Design team, the ones waiting first. The
      // tab bar casts a shadow, so the lists take the same Shadow elevation; its Approvals tab shows a dot while any wait.
      <PlatformPhone key="root" label="Approvals" canvas="default" screenRef={screenRef}>
        <AppShell
          topNavigation={<TopNavigation title="Approvals" largeTitle="Approvals" scrollRef={screenRef}
            largeTitleSubheading={<span role="status">{waiting.length ? `${plural(waiting.length, "request")} waiting for you` : "Nothing waiting for you"}</span>} />}
          bottomNavigation={<PhoneRoots label={studio.name} value="approvals" items={zenRoots.map((root) => (root.id === "approvals" ? { ...root, dot: waiting.length > 0 } : root))} />}
        >
          {screen.anchor}
          {groups.map((group) => (
            <Stack key={group.id} as="section" gap="xs" aria-labelledby={group.id}>
              {kickerOf(group.id, group.title)}
              <ListBox theme="shadow">
                <List aria-labelledby={group.id}>
                  {group.rows.map((approval) => (
                    <ListItem key={approval.id} data-approval={approval.id} title={people[approval.person].name} caption={`${approval.kind} · ${datesOf(approval)}`}
                      leading={<Avatar size="md" {...avatarOf(people[approval.person])} />}
                      trailing={<Badge theme={leaveStatusTheme[approval.status]} background="subtle">{approval.status}</Badge>}
                      onClick={() => screen.go(`.zen-top-nav__action[aria-label="Back"]`, () => setOpenId(approval.id))} />
                  ))}
                </List>
              </ListBox>
            </Stack>
          ))}
        </AppShell>
      </PlatformPhone>
    );
  }

  const person = people[item.person];
  const left = item.kind === "Annual leave" ? annualLeft[item.person] : undefined;
  const pending = item.status === "Pending";
  return (
    // A request is a person asking: Band-Sheet, the person rising over the brand band (Figma Top=Band-Sheet) and the
    // request's facts on the sheet. Horizontal Action bar: two peer answers side by side as Large buttons, Primary at
    // the end, the summary on its own row; once answered it goes, and the sheet runs to the home indicator.
    <PlatformPhone key={item.id} label="Leave request" canvas="surface" screenRef={screenRef}>
      <AppShell mobileTop="band-sheet"
        topNavigation={<TopNavigation title="Leave request" scrollRef={screenRef}
          leading={{ icon: back, label: "Back", onClick: () => screen.go(`[data-approval="${item.id}"] .zen-list-item__wrapper`, () => setOpenId(null)) }} />}
        hero={(
          <Stack gap="sm" align="center">
            <Avatar size="3xl" {...avatarOf(person)} />
            <Stack gap="2xs" width="fill">
              <Heading level={2} textStyle="Heading/2" align="center" width="fill">{person.name}</Heading>
              <Text textStyle="Body/Small/Regular" tone="base" align="center">{`${person.role} · ${person.location}`}</Text>
            </Stack>
          </Stack>
        )}
        actionBar={pending ? (
          <ActionBar direction="horizontal"
            summary={<Text as="span" textStyle="Body/Base/Medium">{left === undefined ? plural(item.days, "working day") : `${plural(item.days, "working day")} · ${plural(left - item.days, "day")} left after`}</Text>}
            secondaryAction={{ label: "Decline", onClick: () => decide(item, "Declined") }}
            primaryAction={{ label: "Approve", onClick: () => decide(item, "Approved") }} />
        ) : undefined}
      >
        {screen.anchor}
        {/* The status is a value of the request: a Badge in its own row, never squeezed beside the name. The sheet is the
            only surface, so the facts sit on it without a card. */}
        <DescriptionList divider items={[
          { id: "status", term: "Status", description: <Badge theme={leaveStatusTheme[item.status]} background="subtle">{item.status}</Badge> },
          { id: "kind", term: "Type", description: item.kind },
          { id: "dates", term: "Dates", description: datesOf(item) },
          { id: "length", term: "Length", description: plural(item.days, "working day") },
          ...(left === undefined ? [] : [{ id: "left", term: "Annual leave left", description: plural(left, "day") }]),
          ...(item.note ? [{ id: "note", term: "Note", description: item.note }] : []),
          { id: "requested", term: "Requested", description: formatRelative(item.requested) },
        ]} />
      </AppShell>
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

/** The studio's Sidebar on the page it shows; the other places toast that they are not drawn here. */
function StudioSidebar({ selectedId }: { selectedId: string }) {
  const notHere = useNotHere();
  return (
    <Sidebar logo={<StudioLogo src={studio.logo} name={studio.name} />} logoCollapsed={<StudioMark src={studio.logo} name={studio.name} />}
      sections={studioPlaces} selectedId={selectedId} onItemClick={(item) => { if (item.id !== selectedId) notHere(item.label); }}
      footer={<SidebarMenuItem id="settings" label="Settings" icon="icon-settings-01-line" />} />
  );
}

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
  const notHere = useNotHere();
  return (
    <PreviewAppFrame height={{ min: 560, max: 720 }}>
      <AppShell
        sidebar={<StudioSidebar selectedId="projects" />}
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
        <Form ref={formRef} form={form} gap="xl" aria-label="Project settings">
          <SettingsGroup id={generalId} title="General" description="The name the team and the client see, and who leads the work.">
            <Grid columns={{ mobile: 1, desktop: 2 }} rowGap="md" columnGap="sm">
              <InputField label="Project name" maxLength={60} {...form.field("name")} />
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
          {/* The bar runs the width of the main column at the bottom of the window (it takes back the Body's margins at the
              sides and below); its own padding lines its content up with the page margin. */}
          <ActionBar direction="horizontal" aria-label="Project settings actions" className="px-action-bar-dock"
            summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{changes ? plural(changes, "unsaved change") : "No changes to save yet"}</Text>}
            secondaryAction={{ label: "Undo changes", onClick: undo, disabled: !changes || form.isSubmitting }}
            primaryAction={{ label: form.isSubmitting ? "Saving…" : "Save changes", type: "submit", disabled: !changes || form.isSubmitting }} />
        </Form>
      </AppShell>
    </PreviewAppFrame>
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
  const receiptId = useId();
  const payId = useId();
  const [lines, setLines] = useState(usualOrder);
  const [placing, setPlacing] = useState(false);
  /** The placed order: its number and what was in it (the confirmation lists it). */
  const [placed, setPlaced] = useState<{ code: string; lines: Line[]; total: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const count = lines.reduce((sum, line) => sum + line.qty, 0);
  const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
  const change = (line: Line, by: number) => {
    if (line.qty + by > 0) { setLines((all) => all.map((item) => (item.id === line.id ? { ...item, qty: item.qty + by } : item))); return; }
    // The last one out removes the line; the toast can bring it back where it was. Its buttons go with it, so focus
    // moves to Place order (or to the empty state once nothing is left).
    const before = lines;
    screen.go(lines.length > 1 ? ".zen-action-bar button" : ".zen-empty-state button", () => setLines((all) => all.filter((item) => item.id !== line.id)));
    toast({ title: `${line.name} removed`, action: { label: "Undo", onClick: () => setLines(before) } });
  };
  const place = () => {
    setPlacing(true);
    timer.current = window.setTimeout(() => {
      // The confirmation is a new screen: focus moves to its one action. The screen's Inline Message confirms the
      // order, so no toast repeats it; the status region outside the phone tells screen readers.
      screen.go(".zen-action-bar button", () => { setPlacing(false); setPlaced({ code: "A-252", lines, total }); setLines([]); });
    }, 900);
  };
  const startAgain = () => screen.go(".zen-action-bar button", () => { setPlaced(null); setLines(usualOrder); });
  const kicker = (id: string, text: string) => <Box paddingX="lg"><Heading id={id} textStyle="Body/Small/Bold" tone="light" truncate={false}>{text}</Heading></Box>;
  const lineIcon = (line: Line) => <DockIcon icon={line.icon} theme={line.theme} background="subtle" />;

  return (
    <>
    {/* Outlives the screen change, so the confirmation is announced. */}
    <VisuallyHidden role="status">{placed ? `Order ${placed.code} placed. Pick it up at Phin Nguyen Hue in about 10 minutes.` : ""}</VisuallyHidden>
    {/* A checkout screen of the Phin & Co app, pushed from the menu: the compact bar with Back, the grouped order on
        Surface-Alt, and the bar on the same surface (surface="alt") with its Pale top rule. A task, so no tab bar. */}
    <PlatformPhone key={placed ? "placed" : "order"} label="Order" canvas="alt" screenRef={screenRef}>
      <AppShell
        topNavigation={<TopNavigation type="alt" title={placed ? `Order ${placed.code}` : "Your order"} scrollRef={screenRef}
          leading={{ icon: back, label: "Back", onClick: () => toast({ title: "Back to the menu", children: placed ? "Your order is being made." : "Your order is kept until you place it." }) }} />}
        actionBar={placed ? (
          <ActionBar surface="alt" primaryAction={{ label: "Start a new order", onClick: startAgain }} />
        ) : lines.length ? (
          <ActionBar surface="alt"
            summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{`${plural(count, "item")} · ${formatMoney(total, true)}`}</Text>}
            primaryAction={{ label: placing ? "Placing order…" : "Place order", disabled: placing, onClick: place }} />
        ) : undefined}
      >
      {screen.anchor}
      {placed ? (
        <>
          <InlineMessage theme="positive" title={`Order ${placed.code} is being made`}>Pick it up at Phin Nguyen Hue in about 10 minutes.</InlineMessage>
          <Stack as="section" gap="xs" aria-labelledby={receiptId}>
            {kicker(receiptId, "What you ordered")}
            <ListBox>
              <List aria-labelledby={receiptId}>
                {placed.lines.map((line) => (
                  <ListItem key={line.id} as="li" title={`${line.qty} × ${line.name}`} caption={line.detail} leading={lineIcon(line)}
                    value={formatMoney(line.qty * line.price, true)} />
                ))}
              </List>
            </ListBox>
          </Stack>
          <Card theme="flat">
            <DescriptionList divider layout="inline" items={[
              { id: "total", term: "Total", description: formatMoney(placed.total, true) },
              { id: "paid", term: "Paid with", description: "Phin card" },
              { id: "where", term: "Pick up at", description: "Phin Nguyen Hue" },
              { id: "ready", term: "Ready at", description: formatTime(daysFromToday(0, 10, 40)) },
            ]} />
          </Card>
        </>
      ) : lines.length ? (
        <>
          <Stack as="section" gap="xs" aria-labelledby={itemsId}>
            {kicker(itemsId, "Drinks and food")}
            <ListBox>
              <List aria-labelledby={itemsId}>
                {lines.map((line) => (
                  // The summary carries the money. Two title lines: beside the stepper a name would otherwise end in an ellipsis.
                  <ListItem key={line.id} title={line.name} titleLines={2} caption={line.detail}
                    leading={<DockIcon icon={line.icon} theme={line.theme} background="subtle" />}
                    trailing={(
                      <Stack direction="row" gap="2xs" align="center" role="group" aria-label={`${line.name} quantity`}>
                        <IconButton level="tertiary" size="md" icon="icon-minus-line" aria-label={`Remove one ${line.name}`} onClick={() => change(line, -1)} />
                        <Text as="span" textStyle="Body/Base/Medium" width="hug" align="center" tabularNumbers className="px-action-bar-qty">{line.qty}</Text>
                        <IconButton level="tertiary" size="md" icon="icon-plus-line" aria-label={`Add one ${line.name}`} onClick={() => change(line, 1)} />
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
                  as="li"
                  titleLines={1} />
              </List>
            </ListBox>
          </Stack>
          <Stack as="section" gap="xs" aria-labelledby={payId}>
            {kicker(payId, "Pay with")}
            <ListBox>
              <List aria-labelledby={payId}>
                {/* The points the order earns follow the total, as the summary does. */}
                <ListItem as="li" title="Phin card" caption={`Balance $24.60 · earns ${pointsLabel(Math.round(total * 10))}`}
                  leading={<DockIcon icon="icon-credit-card-line" theme="neutral" background="subtle" />} />
              </List>
            </ListBox>
          </Stack>
        </>
      ) : (
        // With nothing to order there is nothing to place: the bar goes with the last line.
        <EmptyState headingLevel={2} icon="icon-shopping-bag-01-line" title="Your order is empty" primaryAction={{ label: "Add your usual", onClick: () => screen.go(".zen-action-bar button", () => setLines(usualOrder)) }}>
          Your usual is two Phin sữa đá, a lotus tea and a bánh mì.
        </EmptyState>
      )}
      </AppShell>
    </PlatformPhone>
    </>
  );
}

// ——— Examples ———————————————————————————————————————————————————————————————————————————————————————
export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Footer on a phone",
    description: "In the Phin & Co app a reward's main action leads the Action bar the shell pins to the bottom (actionBar): Large, full width, Primary on top, Save for later below. The summary says what Redeem depends on, and why it waits when it is disabled. Back returns to the rewards, a tab root with the points card, the rewards grouped by what the points buy now, and the app's tab bar.",
    render: () => <PhoneRewardsExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key={reward.id} screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="compact-alt" title={reward.name} scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToList }} />}
    actionBar={<ActionBar
      summary={<Text as="span" role="status" textStyle="Body/Base/Medium">
        {short > 0 ? \`You need \${plural(short, "more point")}\` : \`You have \${plural(balance, "point")}\`}
      </Text>}
      primaryAction={{ label: \`Redeem for \${plural(reward.points, "point")}\`, disabled: short > 0, onClick: redeem }}
      secondaryAction={{ label: "Save for later", onClick: save }} />}
  >
    <Stack gap="md" align="center" paddingY="md">
      <DockIcon icon={reward.icon} theme={reward.theme} background="subtle" size="2xl" />
      <Text tone="base" align="center">{reward.about}</Text>
    </Stack>
    <Card theme="flat">
      <DescriptionList divider layout="inline" items={[{ term: "Cost", description: "120 points" }, …]} />
    </Card>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "Two choices on a phone",
    description: "Approve and Decline are peers, so the bar is horizontal: two Large buttons side by side with Approve at the end, and the summary on its own row. The request opens as a Band-Sheet, the person over the brand band and the facts on the sheet. Either answer can be undone from the toast; once answered, the bar goes away, and the Approvals root sorts the request under Answered.",
    render: () => <PhoneApprovalsExample />,
    code: `<PlatformPhone key={request.id} canvas="surface" screenRef={screenRef}>
  <AppShell mobileTop="band-sheet"
    topNavigation={<TopNavigation title="Leave request" scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToList }} />}
    hero={<Stack gap="sm" align="center"><Avatar size="3xl" theme="photo" src={chi.photo} alt="" /><Heading level={2} textStyle="Heading/2" align="center">Chi Tran</Heading>…</Stack>}
    actionBar={request.status === "Pending" ? (
      <ActionBar direction="horizontal"
        summary={<Text as="span" textStyle="Body/Base/Medium">3 working days · 6 days left after</Text>}
        secondaryAction={{ label: "Decline", onClick: () => decide("Declined") }}
        primaryAction={{ label: "Approve", onClick: () => decide("Approved") }} />
    ) : undefined}
  >
    <DescriptionList divider items={[{ term: "Status", description: <Badge theme="yellow" background="subtle">Pending</Badge> }, …]} />
  </AppShell>
</PlatformPhone>

const decide = (status) => {
  setStatus(request.id, status);
  toast({ title: status === "Approved" ? "Leave approved" : "Leave declined", action: { label: "Undo", onClick: () => setStatus(request.id, "Pending") } });
};`,
  },
  {
    title: "Unsaved changes",
    description: "A desktop edit page in the studio app keeps its actions in a sticky bar at the end of the page: the unsaved count at the start, Undo changes · Save changes at the end. The bar is the form's last child in the shell's Body, so it stays at the bottom of the window while the form scrolls. With nothing changed both wait and the summary says why; under 480px the buttons split a row of their own.",
    wide: true,
    screen: true,
    render: () => <UnsavedChangesExample />,
    code: `const changes = Object.keys(saved).filter((key) => form.values[key] !== saved[key]).length;

<AppShell
  sidebar={<Sidebar logo={studioLogo} sections={studioPlaces} selectedId="projects" />}
  header={<AppShellHeader
    leading={<Breadcrumbs master={false} items={[{ id: "projects", label: "Projects" }, { id: "phin-loyalty", label: "Loyalty app" }, { id: "settings", label: "Settings" }]} onNavigate={navigate} />}
    actions={<><AppShellAction icon="icon-bell-01-line" aria-label="Notifications" count={3} onClick={openNotifications} /><Menu trigger={<AppShellAccount name="Alex Duong" src={alex.photo} />} items={accountItems} /></>}
    main={<PageHeader title="Project settings" description="Loyalty app for Phin & Co. Changes reach the whole team when you save them." />} />}
>
  {/* The Body pads the page; the bar is the form's last child, so it sticks to the bottom while the form is in view,
      across the main column (margin-inline and margin-bottom: −Margin-Comfortable). */}
  <Form form={form} gap="xl" aria-label="Project settings">
    <SettingsGroup title="General" description="The name the team and the client see, and who leads the work.">…</SettingsGroup>
    <SettingsGroup title="Schedule" description="When the work starts and the day the client expects it.">…</SettingsGroup>
    <SettingsGroup title="Billing" description="What Phin & Co is invoiced, and how long they have to pay.">…</SettingsGroup>
    <ActionBar direction="horizontal" aria-label="Project settings actions"
      summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{changes ? plural(changes, "unsaved change") : "No changes to save yet"}</Text>}
      secondaryAction={{ label: "Undo changes", onClick: () => form.reset(), disabled: !changes }}
      primaryAction={{ label: form.isSubmitting ? "Saving…" : "Save changes", type: "submit", disabled: !changes }} />
  </Form>
</AppShell>

// SettingsGroup: the title and what it covers on the left, the fields on a Shadow card on the right.
<Grid as="section" aria-labelledby={id} columns={{ mobile: 1, tablet: 1, desktop: "minmax(0, 1fr) minmax(0, 2fr)" }} rowGap="md" columnGap="xl" align="start">
  <Stack gap="2xs"><Heading level={2} id={id} textStyle="Heading/4">{title}</Heading><Text textStyle="Body/Small/Regular" tone="base">{description}</Text></Stack>
  <Card theme="shadow"><Stack gap="md">{fields}</Stack></Card>
</Grid>`,
  },
  {
    title: "Running total",
    description: "The order's total rides in the summary and follows every + and −, so the Place order label stays short. On a Surface-Alt screen the bar takes surface=\"alt\"; when the last item goes, so does the bar, and the empty state brings the order back. Place order opens the confirmation with what was ordered and when it is ready.",
    render: () => <PhoneOrderExample />,
    code: `<PlatformPhone key={placed ? "placed" : "order"} canvas="alt" screenRef={screenRef}>
  <AppShell
    topNavigation={<TopNavigation type="alt" title="Your order" scrollRef={screenRef}
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: backToMenu }} />}
    actionBar={lines.length ? (
      <ActionBar surface="alt"
        summary={<Text as="span" role="status" textStyle="Body/Base/Medium">{\`\${plural(count, "item")} · \${formatMoney(total, true)}\`}</Text>}
        primaryAction={{ label: "Place order", onClick: place }} />
    ) : undefined}
  >
    <ListBox>
      <List aria-labelledby="items">
        {lines.map((line) => (
          <ListItem key={line.id} title={line.name} caption={line.detail}
            leading={<DockIcon icon={line.icon} theme={line.theme} background="subtle" />}
            trailing={<>
              <IconButton level="tertiary" size="md" icon="icon-minus-line" aria-label={\`Remove one \${line.name}\`} onClick={() => change(line, -1)} />
              <Text as="span" textStyle="Body/Base/Medium">{line.qty}</Text>
              <IconButton level="tertiary" size="md" icon="icon-plus-line" aria-label={\`Add one \${line.name}\`} onClick={() => change(line, 1)} />
            </>} />
        ))}
      </List>
    </ListBox>
  </AppShell>
</PlatformPhone>`,
  },
]);

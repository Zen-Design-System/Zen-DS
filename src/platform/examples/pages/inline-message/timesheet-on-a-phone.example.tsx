import { useId, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  ActionBar, AppShell, Avatar, Badge, BottomNavigation, Box, Button, DockIcon, Heading, InlineMessage, List, ListBox, ListItem, Stack, Text, TopNavigation,
  useToast, type BottomNavigationItem,
} from "@zen-ds/react";
import { daysFromToday, formatDay, formatRange, leaveBalance, me, studio } from "../../data";

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

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function TimesheetPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const workId = useId();
  const accountId = useId();
  const [open, setOpen] = useState(true);
  const [days, setDays] = useState(lastWeek);
  const [sheet, setSheet] = useState<Sheet>("draft");
  // Focus follows the screen: the pushed Timesheet focuses its title, Back returns to the Work list it was opened from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const workRef = useRef<HTMLHeadingElement>(null);
  const barButtonRef = useRef<HTMLButtonElement>(null);
  // A place this example does not draw: the toast says so, and the navigation keeps the current page.
  const notHere = (label: string) => toast({ title: `${label} isn't part of this example`, children: "This page shows the Inline Message." });
  const missing = days.filter((day) => day.minutes === 0);
  // Submitting with a gap escalates the same message (Warning → Negative) instead of adding a second one.
  const submit = () => {
    if (missing.length) { setSheet("blocked"); return; }
    setSheet("submitted");
    toast({ type: "positive", title: "Timesheet submitted", children: `Last week · ${hours(totalOf(days))}` });
  };
  // Log hours leaves with the message: focus moves to Submit timesheet in the Action bar.
  const logHours = () => {
    setDays((list) => list.map((day) => day.minutes === 0 ? { ...day, minutes: 450, projects: "Loyalty app" } : day));
    setSheet("draft");
    setTimeout(() => barButtonRef.current?.focus());
  };
  const recall = () => setSheet("draft");
  const badge = sheetBadge[sheet];

  if (!open) {
    return (
      // The Me root: the large title, Alex's profile, then his work and his account in white blocks under their kickers,
      // the app's roots in the bottom bar. The bar casts a shadow, so every block takes the same Shadow elevation.
      <AppShell key="me"
        topNavigation={<TopNavigation scrollRef={scrollRef} title="Me" largeTitle="Me" largeTitleSubheading={`${me.role} · ${studio.name}`} />}
        bottomNavigation={<BottomNavigation aria-label={studio.name} showLabels items={phoneRoots} value="me"
          onValueChange={(id) => { if (id !== "me") notHere(phoneRoots.find((item) => item.id === id)?.label ?? id); }} />}
      >
        {/* Alex's profile first: the whole row opens it. */}
        <ListBox theme="shadow">
          <List aria-label="Profile">
            <ListItem title={me.name} caption={`${me.email} · ${me.location}`}
              leading={<Avatar size="lg" theme="photo" src={me.photo} alt="" />} onClick={() => notHere("Profile")} />
          </List>
        </ListBox>
        <Stack as="section" gap="xs" aria-labelledby={workId}>
          <Box paddingX="lg"><Heading ref={workRef} level={2} id={workId} tabIndex={-1} textStyle="Body/Small/Bold" tone="light">Work</Heading></Box>
          <ListBox theme="shadow">
            <List aria-labelledby={workId}>
              <ListItem title="Timesheet" caption={`Last week · ${hours(totalOf(days))}`}
                leading={<DockIcon icon="icon-clock-line" theme="blue" background="subtle" size="medium" />}
                trailing={<Badge theme={badge.theme} background="subtle">{badge.label}</Badge>}
                onClick={() => { setOpen(true); setTimeout(() => titleRef.current?.focus()); }} />
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
    );
  }

  const submitted = sheet === "submitted";
  return (
    // A pushed screen, a grouped list: each week is a white block under its kicker on the grey Canvas (no frame). Last
    // week's one action sits in the Action bar (Figma Bottom=Actions), so the screen has no bottom bar.
    <AppShell key="timesheet"
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>Timesheet</span>}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => { setOpen(false); setTimeout(() => workRef.current?.focus()); } }} />}
      actionBar={(
        <ActionBar summary={<Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{`Last week · ${hours(totalOf(days))}`}</Text>}>
          {/* One button that turns from Submit into Recall: it keeps focus as it changes, and Log hours can focus it. */}
          <Button ref={barButtonRef} appearance="main" level={submitted ? "tertiary" : "primary"} size="lg" onClick={submitted ? recall : submit}>
            {submitted ? "Recall timesheet" : "Submit timesheet"}
          </Button>
        </ActionBar>
      )}
    >
      <WeekSection title="This week" days={thisWeek} />
      {/* The message sits right above the week it is about, as wide as its block. */}
      <WeekSection title="Last week" days={days}>
        {submitted ? (
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
  );
}

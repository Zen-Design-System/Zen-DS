/* Link examples (brief: docs/research/example-rebuild-brief-2026-09-30.md). Đìzai Studio, signed in as Alex Duong,
   Wednesday Sep 30, 2026, 10:30 am. Each example teaches one Link decision: links inside a sentence are underlined and
   go through the app's router, other sites open a new tab with external, a widget's View all is a standalone link,
   visited marks articles in a reading list people scan again, and on a phone links navigate while buttons act. */
import { createContext, forwardRef, useContext, useId, useRef, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar } from "../../../components/Avatar";
import { Badge } from "../../../components/Badge";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DescriptionList } from "../../../components/DescriptionList";
import { DockIcon, type DockIconTheme } from "../../../components/DockIcon";
import { EmptyState } from "../../../components/EmptyState";
import { Form, useFormState } from "../../../components/Form";
import { type IconName } from "../../../components/Icon";
import { InputField } from "../../../components/Input";
import { Box, Stack } from "../../../components/Layout";
import { Link } from "../../../components/Link";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Search } from "../../../components/Search";
import { Heading, Text, plural } from "../../../components/Text";
import { TopNavigation } from "../../../components/TopNavigation";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import {
  activity, daysFromToday, formatDue, formatRange, formatRelative, initials, leaveRequests, leaveStatusTheme, people, priorityTheme, projectById,
  taskStatusTheme, tasks, type PersonId, type Task,
} from "../data";
import type { ExampleDef } from "../types";
import "./link.css";

export const page: PlatformPage = "link";

// ——— The app's router, in miniature ————————————————————————————————————————————————————————————
const NavigateContext = createContext<(to: string) => void>(() => undefined);

/** Stand-in for your router's link (React Router's `<Link to>`): a real `<a href>` that navigates in place on a plain
 *  click, while Cmd/Ctrl-click and Copy link address keep working. Pass it to Link as `as={RouterLink}`. */
const RouterLink = forwardRef<HTMLAnchorElement, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string }>(function RouterLink({ to, onClick, ...rest }, ref) {
  const navigate = useContext(NavigateContext);
  return (
    <a {...rest} ref={ref} href={to} onClick={(event) => {
      onClick?.(event);
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      navigate(to);
    }} />
  );
});

/** A route change inside a card: render the new view, then move focus to its heading, as an app does on navigation
 *  (or to `focus`, such as the row a person came back to). */
function useRoute(start: string) {
  const [path, setPath] = useState(start);
  const ref = useRef<HTMLElement>(null);
  const go = (to: string, focus = "[data-route-title]") => { setPath(to); requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>(focus)?.focus()); };
  return { path, go, ref };
}

/** A row's own href, followed the way RouterLink does: a plain click opens it in place, modified clicks stay with the browser. */
const inApp = (event: MouseEvent<HTMLElement>, open: () => void) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  open();
};

const personAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};

// ——— 1. Links in running text: underlined, through the router ——————————————————————————————————————
const octoberLeave = leaveRequests.filter((request) => people[request.person].team === "Design" && request.from.getMonth() === 9);

function LeaveHelp() {
  const { path, go, ref } = useRoute("/time-off");
  const titleId = useId();
  const title = (text: string) => <Heading level={4} id={titleId} textStyle="Heading/Subheading" tabIndex={-1} data-route-title="">{text}</Heading>;
  const backLink = <Text textStyle="Body/Base/Medium"><Link as={RouterLink} to="/time-off">Back to annual leave</Link></Text>;
  let view: ReactNode;
  if (path === "/handbook/time-off") {
    view = (
      <Stack gap="md">
        <Stack gap="xs">
          {title("Time off policy")}
          <Text as="span" textStyle="Body/Small/Regular" tone="base">Studio handbook · Updated Jan 5, 2026</Text>
        </Stack>
        <Text tone="base">Everyone gets 18 days of annual leave and 12 days of sick leave a year, on top of public holidays.</Text>
        <Text tone="base">Ask at least 2 weeks ahead for more than 3 days in a row. Days you don't use carry over until Mar 31, 2027.</Text>
        {backLink}
      </Stack>
    );
  } else if (path === "/calendar/design") {
    view = (
      <Stack gap="md">
        <Stack gap="xs">
          {title("Design team calendar")}
          <Text as="span" textStyle="Body/Small/Regular" tone="base">October 2026</Text>
        </Stack>
        <List aria-labelledby={titleId}>
          {octoberLeave.map((request) => (
            <ListItem key={request.id} title={people[request.person].name} caption={`${formatRange(request.from, request.to)} · ${request.kind}`}
              leading={personAvatar(request.person)}
              trailing={<Badge theme={leaveStatusTheme[request.status]} background="subtle">{request.status}</Badge>} />
          ))}
        </List>
        {backLink}
      </Stack>
    );
  } else {
    view = (
      <Stack gap="md">
        <Stack gap="xs">
          {title("Annual leave")}
          <Text as="span" textStyle="Body/Small/Regular" tone="base">7 of 18 days left this year</Text>
        </Stack>
        {/* Inside a sentence the underline is always on, so the links never rely on colour alone. */}
        <Text tone="base">
          Requests longer than 3 days go to Minh Anh Vo for approval, so read the{" "}
          <Link as={RouterLink} to="/handbook/time-off" underline="always">time off policy</Link> before you book around Tết.
          The days your team already has off are on the{" "}
          <Link as={RouterLink} to="/calendar/design" underline="always">Design team calendar</Link>.
        </Text>
      </Stack>
    );
  }
  return (
    <NavigateContext.Provider value={go}>
      <Card as="section" ref={ref} theme="flat" aria-labelledby={titleId}>{view}</Card>
    </NavigateContext.Provider>
  );
}

// ——— 2. Another site: external opens a new tab and says so ————————————————————————————————————————
const auditTask = tasks.find((task) => task.id === "t5")!;

function ExternalLinks() {
  const titleId = useId();
  return (
    <Card as="section" theme="flat" aria-labelledby={titleId}>
      <Stack gap="md">
        <Stack gap="xs">
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${auditTask.key} · ${projectById(auditTask.project).name}`}</Text>
          <Heading level={4} id={titleId} textStyle="Heading/Subheading">{auditTask.title}</Heading>
        </Stack>
        {/* Other sites open in a new tab: external adds the icon, rel="noopener noreferrer" and a hidden "(opens in a new tab)". */}
        <Text tone="base">
          Check each screen of the account overview against the{" "}
          <Link href="https://www.w3.org/WAI/WCAG22/quickref/" external underline="always">WCAG 2.2 quick reference</Link> and log
          what fails as a subtask. Lumen Bank's customers bank on small phones, so start with{" "}
          <Link href="https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html" external underline="always">Target Size (Minimum)</Link>.
        </Text>
        <DescriptionList items={[
          { term: "Assignee", description: people[auditTask.assignee].name },
          { term: "Due", description: formatDue(auditTask.due) },
          { term: "Priority", description: <Badge theme={priorityTheme[auditTask.priority]} background="subtle">{auditTask.priority}</Badge> },
        ]} />
      </Stack>
    </Card>
  );
}

// ——— 3. View all: a standalone link under a short list ——————————————————————————————————————————
const dueThisWeek = tasks
  .filter((task) => task.status !== "Done" && task.due <= daysFromToday(7, 23, 59))
  .sort((a, b) => a.due.getTime() - b.due.getTime());
const SHOWN = 4;
/** A whole row that opens the task is the row's own link (ListItem href), not a Link inside it. */
const taskRow = (task: Task, open: (task: Task) => void) => {
  const project = projectById(task.project);
  return (
    <ListItem key={task.id} data-task={task.id} title={task.title} titleLines={2} caption={`${project.name} · ${formatDue(task.due)}`}
      leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
      href={`/tasks/${task.id}`} onClick={(event) => inApp(event, () => open(task))} />
  );
};
const taskDetails = (task: Task) => [
  { term: "Assignee", description: people[task.assignee].name },
  { term: "Due", description: formatDue(task.due) },
  { term: "Status", description: <Badge theme={taskStatusTheme[task.status]} background="subtle">{task.status}</Badge> },
  { term: "Priority", description: <Badge theme={priorityTheme[task.priority]} background="subtle">{task.priority}</Badge> },
];

function DueThisWeek() {
  const { path, go, ref } = useRoute("/home");
  const [from, setFrom] = useState("/home");
  const titleId = useId();
  const task = dueThisWeek.find((item) => path === `/tasks/${item.id}`);
  const all = path === "/tasks";
  // Opening a task remembers the list it came from; its Back link returns there and focuses the task's row.
  const navigate = (to: string) => (task ? go(to, `[data-task="${task.id}"] .zen-list-item__wrapper`) : go(to));
  const open = (item: Task) => { setFrom(path); go(`/tasks/${item.id}`); };
  return (
    <NavigateContext.Provider value={navigate}>
      <Card as="section" ref={ref} theme="flat" aria-labelledby={titleId}>
        {task ? (
          <Stack gap="md">
            <Stack gap="xs">
              <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${task.key} · ${projectById(task.project).name}`}</Text>
              <Heading level={4} id={titleId} textStyle="Heading/Subheading" tabIndex={-1} data-route-title="">{task.title}</Heading>
            </Stack>
            <DescriptionList items={taskDetails(task)} />
            <Text textStyle="Body/Base/Medium">
              <Link as={RouterLink} to={from}>{from === "/tasks" ? "Back to all tasks" : "Back to home"}</Link>
            </Text>
          </Stack>
        ) : (
          <Stack gap="md">
            <Stack gap="xs">
              <Heading level={4} id={titleId} textStyle="Heading/Subheading" tabIndex={-1} data-route-title="">{all ? "Tasks due this week" : "Due this week"}</Heading>
              <Text as="span" textStyle="Body/Small/Regular" tone="base">
                {all ? `${plural(dueThisWeek.length, "task")} · Sep 30 – Oct 7, 2026` : `${SHOWN} of ${dueThisWeek.length}, soonest first`}
              </Text>
            </Stack>
            <List aria-labelledby={titleId}>{(all ? dueThisWeek : dueThisWeek.slice(0, SHOWN)).map((item) => taskRow(item, open))}</List>
            {/* A standalone link: the underline shows on hover and focus. Opening the full list is navigation, so it is a Link. */}
            <Text textStyle="Body/Base/Medium">
              {all
                ? <Link as={RouterLink} to="/home">Back to home</Link>
                : <Link as={RouterLink} to="/tasks">{`View all ${plural(dueThisWeek.length, "task")}`}</Link>}
            </Text>
          </Stack>
        )}
      </Card>
    </NavigateContext.Provider>
  );
}

// ——— 4. Visited: a reading list people come back to ———————————————————————————————————————————
type Topic = "Accessibility" | "Navigation" | "Forms";
type Article = { id: string; title: string; url: string; source: string; topic: Topic; addedBy: PersonId; added: Date; note: string };
const topicLook: Record<Topic, { icon: IconName; theme: DockIconTheme }> = {
  Accessibility: { icon: "icon-eye-line", theme: "violet" },
  Navigation: { icon: "icon-compass-line", theme: "blue" },
  Forms: { icon: "icon-layout-alt-01-line", theme: "teal" },
};
const articles: Article[] = [
  { id: "target-size", title: "Understanding Success Criterion 2.5.8: Target Size (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html", source: "w3.org", topic: "Accessibility", addedBy: "ava", added: daysFromToday(-2, 15, 10), note: "Why every tap target in the Lumen Bank app needs 24 × 24 px" },
  { id: "invisible", title: "Invisible content just for screen reader users", url: "https://webaim.org/techniques/css/invisiblecontent/", source: "webaim.org", topic: "Accessibility", addedBy: "bao", added: daysFromToday(-9, 11, 0), note: "The clipping technique behind our VisuallyHidden component" },
  { id: "menu-button", title: "Menu Button Pattern", url: "https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/", source: "w3.org", topic: "Navigation", addedBy: "finn", added: daysFromToday(-14, 10, 20), note: "The keyboard model every ⋯ menu in Zen follows" },
  { id: "new-tabs", title: "Opening Links in New Browser Windows and Tabs", url: "https://www.nngroup.com/articles/new-browser-windows-and-tabs/", source: "nngroup.com", topic: "Navigation", addedBy: "ava", added: daysFromToday(-21, 16, 30), note: "When a new tab helps, and why we say so in the link" },
  { id: "menus", title: "Inclusive Components: Menus & Menu Buttons", url: "https://inclusive-components.design/menus-menu-buttons/", source: "inclusive-components.design", topic: "Navigation", addedBy: "chi", added: daysFromToday(-30, 9, 45), note: "Navigation lists versus action menus, with code" },
  { id: "forms", title: "Website Forms Usability: Top 10 Recommendations", url: "https://www.nngroup.com/articles/web-form-design/", source: "nngroup.com", topic: "Forms", addedBy: "gia", added: daysFromToday(-40, 14, 0), note: "Our checklist before a form goes to client review" },
  { id: "confirm", title: "Confirmation Dialogs Can Prevent User Errors (If Not Overused)", url: "https://www.nngroup.com/articles/confirmation-dialog/", source: "nngroup.com", topic: "Forms", addedBy: "alex", added: daysFromToday(-55, 10, 30), note: "When to ask first and when Undo is kinder" },
];
const topics: Topic[] = ["Accessibility", "Navigation", "Forms"];

function ReadingList() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  const q = query.trim().toLowerCase();
  const rows = articles.filter((article) => (!topic || article.topic === topic) && (!q || `${article.title} ${article.source} ${article.note}`.toLowerCase().includes(q)));
  // Clear filters leaves with the empty state, so focus moves to the search field, which stays.
  const clear = () => { setQuery(""); setTopic(null); requestAnimationFrame(() => sectionRef.current?.querySelector<HTMLElement>("input")?.focus()); };
  return (
    <Stack as="section" ref={sectionRef} gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Research library</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Articles the design team keeps coming back to. Each opens on its own site, in a new tab.</Text>
      </Stack>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Box className="px-link-search"><Search placeholder="Search articles" aria-label="Search articles" value={query} onValueChange={setQuery} /></Box>
        <Chip variant="advanced" dropdown selected={topic !== null} popoverLabel="Topic"
          popoverItems={topics.map((option) => ({ id: option, label: option, selected: option === topic }))}
          onPopoverSelect={(item) => setTopic(item.id === topic ? null : (item.id as Topic))} onClearSelection={() => setTopic(null)}>
          {topic ?? "Topic"}
        </Chip>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "article")}</Text>
      </Stack>
      {/* A static list on the stage: a ListBox that stays in place when a filter empties it. Its Body-Slot insets the
          rows (they have none of their own) and the empty state alike. */}
      <ListBox>
        {rows.length ? (
          <List aria-labelledby={headingId}>
            {rows.map((article) => (
              // The title is the link (visited: articles you've opened turn Visited) and wraps in full, so the row composes
              // its own lines: the title, the note, then where it is from and who added it. The row itself is not clickable.
              <ListItem key={article.id} title={article.title}
                leading={<DockIcon icon={topicLook[article.topic].icon} theme={topicLook[article.topic].theme} background="subtle" />}>
                <Text as="span" textStyle="Body/Base/Bold"><Link href={article.url} external visited>{article.title}</Link></Text>
                <Text as="span" textStyle="Body/Small/Regular" tone="base">{article.note}</Text>
                <Text as="span" textStyle="Body/Small/Regular" tone="light">{`${article.source} · ${people[article.addedBy].name}, ${formatRelative(article.added)}`}</Text>
              </ListItem>
            ))}
          </List>
        ) : (
          <EmptyState illustration={false} headingLevel={5} title="No articles match" secondaryAction={{ label: "Clear filters", onClick: clear }}>
            Try another word or topic.
          </EmptyState>
        )}
      </ListBox>
    </Stack>
  );
}

// ——— 5. On a phone: links navigate, the button acts ————————————————————————————————————————————
type Screen = "sign-in" | "reset" | "terms" | "privacy" | "home" | "task";
const back = "icon-chevron-left-line-medium" as const;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const legal: Record<"terms" | "privacy", { title: string; paragraphs: string[] }> = {
  terms: { title: "Terms of service", paragraphs: [
    "Zen is the workspace Đìzai Studio uses for projects, files, invoices and time off. Your account belongs to the studio, and the studio decides who can join.",
    "Keep client work inside the projects it belongs to. Files you upload stay the property of the studio or its client, as each contract says.",
    "We may pause an account that shares client files outside the studio. We tell you first, unless the law says we can't.",
  ] },
  privacy: { title: "Privacy policy", paragraphs: [
    "We keep your name, work email, photo and the work you do in Zen. People in the studio can see your profile; client guests see only the projects they are invited to.",
    "Time off notes are visible to you, your team lead and People Ops. We never sell your data or use it for ads.",
    "Ask Minh Anh Vo at people@dizai.studio for a copy of your data or to delete it.",
  ] },
};
const homeTasks = dueThisWeek;
const homeActivity = activity;

function PhoneSignIn() {
  const screen = usePhoneScreen();
  const screenRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const resetId = useId();
  const dueId = useId();
  const activityId = useId();
  const [view, setView] = useState<Screen>("sign-in");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const signIn = useFormState<{ email: string; password: string }>({
    initialValues: { email: "alex@dizai.studio", password: "" },
    validate: ({ email, password }) => ({
      email: !email.trim() ? "Enter your work email" : !emailPattern.test(email.trim()) ? "Enter an email like name@dizai.studio" : undefined,
      password: password ? undefined : "Enter your password",
    }),
    onSubmit: () => screen.go('.zen-top-nav__action[aria-label="Sign out"]', () => setView("home")),
  });
  const reset = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => ({ email: !email.trim() ? "Enter your work email" : !emailPattern.test(email.trim()) ? "Enter an email like name@dizai.studio" : undefined }),
    onSubmit: () => setResetSent(true),
  });
  // Links push a screen; Back returns to the link the person came from.
  const navigate = (to: string) => {
    const next = to.slice(1) as Screen;
    if (next === "reset") { reset.reset({ email: signIn.values.email }); setResetSent(false); }
    screen.go('.zen-top-nav__action[aria-label="Back"]', () => setView(next));
  };
  const backTo = (selector: string) => screen.go(selector, () => setView("sign-in"));

  if (view === "terms" || view === "privacy") {
    const doc = legal[view];
    return (
      <PlatformPhone key={view} label="Zen app" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="compact" title={doc.title} scrollRef={screenRef}
          leading={{ icon: back, label: "Back", onClick: () => backTo(`[href="/${view}"]`) }} />}>
        {screen.anchor}
        <Stack gap="md" padding="lg">
          {doc.paragraphs.map((text) => <Text key={text} tone="base">{text}</Text>)}
          <Text as="span" textStyle="Caption/Regular" tone="light">Last updated Jan 5, 2026</Text>
        </Stack>
      </PlatformPhone>
    );
  }

  if (view === "reset") {
    return (
      <PlatformPhone key="reset" label="Zen app" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="compact" title="Reset password" scrollRef={screenRef}
          leading={{ icon: back, label: "Back", onClick: () => backTo('[href="/reset"]') }} />}
        footer={resetSent ? undefined : <ActionBar position="static" primaryAction={{ label: "Send reset link", type: "submit", form: resetId }} />}>
        {screen.anchor}
        <NavigateContext.Provider value={() => backTo('[href="/reset"]')}>
          <Stack gap="lg" padding="lg">
            {resetSent ? (
              <Stack gap="xs" role="status">
                <Heading level={2} textStyle="Heading/Subheading">Check your email</Heading>
                <Text tone="base">{`We sent a reset link to ${reset.values.email.trim()}. It works for 30 minutes.`}</Text>
              </Stack>
            ) : (
              <>
                <Text tone="base">Enter your work email and we'll send a link to choose a new password.</Text>
                <Form id={resetId} form={reset} gap="md">
                  <InputField size="lg" label="Work email" type="email" autoComplete="email" {...reset.field("email")} />
                </Form>
              </>
            )}
            <Text textStyle="Body/Base/Medium"><Link as={RouterLink} to="/sign-in">Back to sign in</Link></Text>
          </Stack>
        </NavigateContext.Provider>
      </PlatformPhone>
    );
  }

  const openedTask = view === "task" ? homeTasks.find((task) => task.id === taskId) : undefined;
  if (openedTask) {
    return (
      // A task row pushes the task's own screen; Back returns to Home and to the row it came from.
      <PlatformPhone key={`task-${openedTask.id}`} label="Zen app" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="compact" title={openedTask.key} scrollRef={screenRef}
          leading={{ icon: back, label: "Back", onClick: () => screen.go(`[data-task="${openedTask.id}"] .zen-list-item__wrapper`, () => setView("home")) }} />}>
        {screen.anchor}
        <Stack gap="lg" padding="lg">
          <Stack gap="xs">
            <Heading level={2} textStyle="Heading/Subheading">{openedTask.title}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{projectById(openedTask.project).name}</Text>
          </Stack>
          <DescriptionList divider items={taskDetails(openedTask)} />
        </Stack>
      </PlatformPhone>
    );
  }

  if (view === "home") {
    const openTask = (task: Task) => screen.go('.zen-top-nav__action[aria-label="Back"]', () => { setTaskId(task.id); setView("task"); });
    return (
      // A tab root: the large title folds into the bar as the lists scroll under it.
      <PlatformPhone key="home" label="Zen app" headerOverlay screenRef={screenRef}
        header={<TopNavigation title="Home" largeTitle="Home" scrollRef={screenRef}
          trailing={[{ icon: "icon-log-out-01-line", label: "Sign out", onClick: () => screen.go(`[id="${formId}"] input[type="password"]`, () => { signIn.reset({ email: signIn.values.email, password: "" }); setView("sign-in"); }) }]} />}>
        {screen.anchor}
        <Stack gap="lg" paddingY="xs">
          {/* The tasks open (clickable rows, 12px above and below, none at the sides): the page margin (lg) insets them
              and the kicker sits xs above them. */}
          <Stack as="section" gap="xs" aria-labelledby={dueId}>
            <Box paddingX="lg"><Heading level={2} id={dueId} textStyle="Body/Small/Bold" tone="light">Due this week</Heading></Box>
            <Box paddingX="lg">
              <List aria-labelledby={dueId}>{homeTasks.map((task) => taskRow(task, openTask))}</List>
            </Box>
          </Stack>
          <Stack as="section" gap="xs" aria-labelledby={activityId}>
            <Box paddingX="lg"><Heading level={2} id={activityId} textStyle="Body/Small/Bold" tone="light">Activity</Heading></Box>
            {/* A feed only shows what happened (Interactive=No rows, no side padding of their own): the page margin (lg)
                insets the List, so their text lines up with the kicker. */}
            <Box paddingX="lg">
              <List aria-labelledby={activityId}>
                {homeActivity.map((event) => (
                  <ListItem key={event.id} title={people[event.actor].name} caption={`${event.verb[0].toUpperCase()}${event.verb.slice(1)} ${event.object} · ${formatRelative(event.at)}`}
                    leading={personAvatar(event.actor)} />
                ))}
              </List>
            </Box>
          </Stack>
        </Stack>
      </PlatformPhone>
    );
  }

  return (
    // The first step of signing in: a form screen with no way back, and the Primary in the footer.
    <PlatformPhone key="sign-in" label="Zen app" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact" title="Sign in" scrollRef={screenRef} topBar={false} headingLevel="h1" collapsed={false} />}
      footer={<ActionBar position="static" primaryAction={{ label: "Sign in", type: "submit", form: formId }} />}>
      {screen.anchor}
      <NavigateContext.Provider value={navigate}>
        <Stack gap="lg" padding="lg">
          <Text tone="base">Sign in to the Đìzai Studio workspace with your work email.</Text>
          <Form id={formId} form={signIn} gap="md">
            <InputField size="lg" label="Work email" type="email" autoComplete="email" {...signIn.field("email")} />
            {/* The link belongs to the field above it: label → its link is xs. */}
            <Stack gap="xs">
              <InputField size="lg" label="Password" type="password" autoComplete="current-password" {...signIn.field("password")} />
              <Text textStyle="Body/Base/Medium"><Link as={RouterLink} to="/reset">Forgot password?</Link></Text>
            </Stack>
          </Form>
          {/* Legal copy: the links take the caption's colour (tone="inherit") and keep their underline. */}
          <Text textStyle="Caption/Regular" tone="light">
            By signing in, you agree to the <Link as={RouterLink} to="/terms" tone="inherit">Terms of service</Link> and
            the <Link as={RouterLink} to="/privacy" tone="inherit">Privacy policy</Link>.
          </Text>
        </Stack>
      </NavigateContext.Provider>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "Links in running text",
    description: "Inside a sentence, links are underlined (underline=\"always\") so they never rely on colour alone, and they take the paragraph's font. as={RouterLink} renders the app's own router link, so the policy and the calendar open in place.",
    render: () => <LeaveHelp />,
    code: `import { Link as RouterLink } from "react-router-dom";

<Text tone="base">
  Requests longer than 3 days go to Minh Anh Vo for approval, so read the{" "}
  <Link as={RouterLink} to="/handbook/time-off" underline="always">time off policy</Link> before you book around Tết.
  The days your team already has off are on the{" "}
  <Link as={RouterLink} to="/calendar/design" underline="always">Design team calendar</Link>.
</Text>`,
  },
  {
    title: "Open another site",
    description: "Links to other sites use external: they open a new tab with rel=\"noopener noreferrer\", show the external-link icon and add a hidden “(opens in a new tab)”, so the change of context is seen and heard. The icon stays on the line of the last word.",
    render: () => <ExternalLinks />,
    code: `<Text tone="base">
  Check each screen of the account overview against the{" "}
  <Link href="https://www.w3.org/WAI/WCAG22/quickref/" external underline="always">WCAG 2.2 quick reference</Link> and log
  what fails as a subtask. Lumen Bank's customers bank on small phones, so start with{" "}
  <Link href="https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html" external underline="always">Target Size (Minimum)</Link>.
</Text>`,
  },
  {
    title: "View all",
    description: "A card that shows part of a list says so in its title and ends with a standalone link to the rest: Hyperlink colour, underlined on hover and focus, in the text style around it. Each row opens its task through the row's own href, and the task and the full list link back.",
    render: () => <DueThisWeek />,
    code: `// A whole row that opens something is ListItem href, not a Link inside the row. A plain click routes in place.
const taskRow = (task) => {
  const project = projectById(task.project);
  return (
    <ListItem key={task.id} title={task.title} titleLines={2} caption={\`\${project.name} · \${formatDue(task.due)}\`}
      leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
      href={\`/tasks/\${task.id}\`} onClick={(event) => { event.preventDefault(); navigate(\`/tasks/\${task.id}\`); }} />
  );
};

<Card as="section" theme="flat" aria-labelledby={titleId}>
  <Stack gap="md">
    <Stack gap="xs">
      <Heading level={4} id={titleId} textStyle="Heading/Subheading">Due this week</Heading>
      <Text as="span" textStyle="Body/Small/Regular" tone="base">{\`4 of \${tasks.length}, soonest first\`}</Text>
    </Stack>
    <List aria-labelledby={titleId}>{tasks.slice(0, 4).map(taskRow)}</List>
    <Text textStyle="Body/Base/Medium">
      <Link as={RouterLink} to="/tasks">{\`View all \${plural(tasks.length, "task")}\`}</Link>
    </Text>
  </Stack>
</Card>`,
  },
  {
    title: "Reading list",
    wide: true,
    description: "A list people scan again and again turns on visited: once someone opens an article, its title turns the Visited colour, so they can see what they have read. Each title is the link and wraps in full on a narrow screen; the row around it isn't clickable. Search and Topic filter the list, and an empty result offers Clear filters.",
    render: () => <ReadingList />,
    code: `<ListBox>
  <List aria-labelledby={headingId}>
    {rows.map((article) => (
      <ListItem key={article.id} title={article.title}
        leading={<DockIcon icon={topicLook[article.topic].icon} theme={topicLook[article.topic].theme} background="subtle" />}>
        {/* The title line is the link, in the row's title style; it wraps instead of being cut. */}
        <Text as="span" textStyle="Body/Base/Bold"><Link href={article.url} external visited>{article.title}</Link></Text>
        <Text as="span" textStyle="Body/Small/Regular" tone="base">{article.note}</Text>
        <Text as="span" textStyle="Body/Small/Regular" tone="light">{\`\${article.source} · \${addedBy.name}, \${formatRelative(article.added)}\`}</Text>
      </ListItem>
    ))}
  </List>
</ListBox>`,
  },
  {
    title: "Sign in on a phone",
    description: "Links go somewhere (Forgot password?, the terms and the privacy policy) and push a screen with Back; the button acts, so Sign in is the footer's Primary. The legal line's links take the caption colour with tone=\"inherit\" and stay underlined. On Home, each task row opens its task.",
    render: () => <PhoneSignIn />,
    code: `const screenRef = useRef<HTMLDivElement>(null);

<PlatformPhone key="sign-in" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact" title="Sign in" scrollRef={screenRef} topBar={false} headingLevel="h1" collapsed={false} />}
  footer={<ActionBar position="static" primaryAction={{ label: "Sign in", type: "submit", form: formId }} />}>
  <Stack gap="lg" padding="lg">
    <Form id={formId} form={form} gap="md">
      <InputField size="lg" label="Work email" type="email" {...form.field("email")} />
      <Stack gap="xs">
        <InputField size="lg" label="Password" type="password" {...form.field("password")} />
        <Text textStyle="Body/Base/Medium"><Link as={RouterLink} to="/reset">Forgot password?</Link></Text>
      </Stack>
    </Form>
    <Text textStyle="Caption/Regular" tone="light">
      By signing in, you agree to the <Link as={RouterLink} to="/terms" tone="inherit">Terms of service</Link> and
      the <Link as={RouterLink} to="/privacy" tone="inherit">Privacy policy</Link>.
    </Text>
  </Stack>
</PlatformPhone>`,
  },
];

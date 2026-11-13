import { useId, useRef, useState, type MouseEvent } from "react";
import {
  ActionBar, AppShell, Avatar, Badge, BadgeStatus, DescriptionList, DockIcon, Form, Heading, InputField, Link, List, ListItem, Stack, Text, TopNavigation,
  useFormState,
} from "@zen-ds/react";
import { activity, daysFromToday, formatDue, formatRelative, initials, people, priorityTheme, projectById, taskStep, tasks, type PersonId, type Task } from "../../data";

type Screen = "sign-in" | "reset" | "terms" | "privacy" | "home" | "task";
type Focusable = { current: HTMLElement | null };

const back = "icon-chevron-left-line-medium" as const;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const checkEmail = (email: string) => (!email.trim() ? "Enter your work email" : !emailPattern.test(email.trim()) ? "Enter an email like name@dizai.studio" : undefined);
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
const dueThisWeek = tasks
  .filter((task) => task.status !== "Done" && task.due <= daysFromToday(7, 23, 59))
  .sort((a, b) => a.due.getTime() - b.due.getTime());

const personAvatar = (id: PersonId) => {
  const person = people[id];
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
};

/** What your router's link does: a plain click opens the screen in place; Cmd/Ctrl-click and Copy link address keep the href. */
const inApp = (event: MouseEvent<HTMLElement>, open: () => void) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  open();
};

export default function PhoneSignIn() {
  const formId = useId();
  const resetId = useId();
  const dueId = useId();
  const activityId = useId();
  const [view, setView] = useState<Screen>("sign-in");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  // Focus follows the screen: a pushed screen focuses its title, Back returns to the link or list it came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const dueRef = useRef<HTMLHeadingElement>(null);
  const resetLinkRef = useRef<HTMLAnchorElement>(null);
  const termsLinkRef = useRef<HTMLAnchorElement>(null);
  const privacyLinkRef = useRef<HTMLAnchorElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const show = (next: Screen, focus: Focusable = titleRef) => {
    setView(next);
    setTimeout(() => focus.current?.focus());
  };
  const title = (text: string) => <span ref={titleRef} tabIndex={-1}>{text}</span>;

  const signIn = useFormState<{ email: string; password: string }>({
    initialValues: { email: "alex@dizai.studio", password: "" },
    validate: ({ email, password }) => ({ email: checkEmail(email), password: password ? undefined : "Enter your password" }),
    onSubmit: () => show("home", dueRef),
  });
  const reset = useFormState<{ email: string }>({
    initialValues: { email: "" },
    validate: ({ email }) => ({ email: checkEmail(email) }),
    onSubmit: () => setResetSent(true),
  });
  const openReset = () => {
    reset.reset({ email: signIn.values.email });
    setResetSent(false);
    show("reset");
  };

  if (view === "terms" || view === "privacy") {
    const doc = legal[view];
    const from = view === "terms" ? termsLinkRef : privacyLinkRef;
    return (
      <AppShell key={view}
        topNavigation={<TopNavigation type="compact-alt" title={title(doc.title)} leading={{ icon: back, label: "Back", onClick: () => show("sign-in", from) }} />}>
        <Stack gap="md">
          {doc.paragraphs.map((text) => <Text key={text} tone="base">{text}</Text>)}
          <Text as="span" textStyle="Caption/Regular" tone="light">Last updated Jan 5, 2026</Text>
        </Stack>
      </AppShell>
    );
  }

  if (view === "reset") {
    return (
      <AppShell key="reset"
        topNavigation={<TopNavigation type="compact-alt" title={title("Reset password")} leading={{ icon: back, label: "Back", onClick: () => show("sign-in", resetLinkRef) }} />}
        actionBar={resetSent ? undefined : <ActionBar primaryAction={{ label: "Send reset link", type: "submit", form: resetId }} />}>
        <Stack gap="lg">
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
          <Text textStyle="Body/Base/Medium"><Link href="/sign-in" onClick={(event) => inApp(event, () => show("sign-in", resetLinkRef))}>Back to sign in</Link></Text>
        </Stack>
      </AppShell>
    );
  }

  const openedTask = view === "task" ? dueThisWeek.find((task) => task.id === taskId) : undefined;
  if (openedTask) {
    return (
      // A task row pushes the task's own screen; Back returns to Home.
      <AppShell key={`task-${openedTask.id}`}
        topNavigation={<TopNavigation type="compact-alt" title={title(openedTask.key)} leading={{ icon: back, label: "Back", onClick: () => show("home", dueRef) }} />}>
        <Stack gap="lg">
          <Stack gap="xs">
            <Heading level={2} textStyle="Heading/Subheading">{openedTask.title}</Heading>
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{projectById(openedTask.project).name}</Text>
          </Stack>
          <DescriptionList divider items={[
            { term: "Assignee", description: people[openedTask.assignee].name },
            { term: "Due", description: formatDue(openedTask.due) },
            { term: "Status", description: <BadgeStatus status={taskStep[openedTask.status]}>{openedTask.status}</BadgeStatus> },
            { term: "Priority", description: <Badge theme={priorityTheme[openedTask.priority]} background="subtle">{openedTask.priority}</Badge> },
          ]} />
        </Stack>
      </AppShell>
    );
  }

  if (view === "home") {
    const openTask = (task: Task) => {
      setTaskId(task.id);
      show("task");
    };
    const signOut = () => {
      signIn.reset({ email: signIn.values.email, password: "" });
      show("sign-in", passwordRef);
    };
    return (
      // A tab root: the large title folds into the bar as the lists scroll under it.
      <AppShell key="home"
        topNavigation={<TopNavigation type="alt" title="Home" largeTitle="Home" trailing={[{ icon: "icon-log-out-01-line", label: "Sign out", onClick: signOut }]} />}>
        <Stack as="section" gap="xs" aria-labelledby={dueId}>
          <Heading ref={dueRef} level={2} id={dueId} textStyle="Body/Small/Bold" tone="light" tabIndex={-1}>Due this week</Heading>
          <List aria-labelledby={dueId}>
            {dueThisWeek.map((task) => {
              const project = projectById(task.project);
              return (
                <ListItem key={task.id} title={task.title} titleLines={2} caption={`${project.name} · ${formatDue(task.due)}`}
                  leading={<DockIcon icon={project.icon} theme={project.theme} background="subtle" />}
                  href={`/tasks/${task.id}`} onClick={(event) => inApp(event, () => openTask(task))} />
              );
            })}
          </List>
        </Stack>
        <Stack as="section" gap="xs" aria-labelledby={activityId}>
          <Heading level={2} id={activityId} textStyle="Body/Small/Bold" tone="light">Activity</Heading>
          {/* A feed only shows what happened (Interactive=No rows, no side padding of their own). */}
          <List aria-labelledby={activityId}>
            {activity.map((event) => (
              <ListItem key={event.id} title={people[event.actor].name} caption={`${event.verb[0].toUpperCase()}${event.verb.slice(1)} ${event.object} · ${formatRelative(event.at)}`}
                leading={personAvatar(event.actor)} />
            ))}
          </List>
        </Stack>
      </AppShell>
    );
  }

  return (
    // The first step of signing in: a form screen with no way back, and the Primary in the footer.
    <AppShell key="sign-in"
      topNavigation={<TopNavigation type="compact-alt" title={title("Sign in")} topBar={false} headingLevel="h1" collapsed={false} />}
      actionBar={<ActionBar primaryAction={{ label: "Sign in", type: "submit", form: formId }} />}>
      <Stack gap="lg">
        <Text tone="base">Sign in to the Đìzai Studio workspace with your work email.</Text>
        <Form id={formId} form={signIn} gap="md">
          <InputField size="lg" label="Work email" type="email" autoComplete="email" {...signIn.field("email")} />
          {/* The link belongs to the field above it: label → its link is xs. */}
          <Stack gap="xs">
            <InputField ref={passwordRef} size="lg" label="Password" type="password" autoComplete="current-password" {...signIn.field("password")} />
            <Text textStyle="Body/Base/Medium"><Link ref={resetLinkRef} href="/reset" onClick={(event) => inApp(event, openReset)}>Forgot password?</Link></Text>
          </Stack>
        </Form>
        {/* Legal copy: the links take the caption's colour (tone="inherit") and keep their underline. */}
        <Text textStyle="Caption/Regular" tone="light">
          By signing in, you agree to the <Link ref={termsLinkRef} href="/terms" tone="inherit" onClick={(event) => inApp(event, () => show("terms"))}>Terms of service</Link> and
          the <Link ref={privacyLinkRef} href="/privacy" tone="inherit" onClick={(event) => inApp(event, () => show("privacy"))}>Privacy policy</Link>.
        </Text>
      </Stack>
    </AppShell>
  );
}

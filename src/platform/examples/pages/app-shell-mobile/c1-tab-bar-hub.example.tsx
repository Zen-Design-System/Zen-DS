import { useId, useState, type RefObject } from "react";
import {
  AppShell, Avatar, BottomNavigation, Button, Card, DockIcon, Heading, Icon, Link, List, ListItem, ProgressBar, Stack, Text, TopNavigation,
  useToast, type AvatarProps, type BottomNavigationItem, type DockIconTheme, type IconName,
} from "@zen-ds/react";

type AvatarTheme = NonNullable<AvatarProps["theme"]>;

const learningRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "explore", label: "Explore", icon: "icon-compass-line", selectedIcon: "icon-compass-solid" },
  { id: "courses", label: "Courses", icon: "icon-book-closed-line", selectedIcon: "icon-book-closed-solid" },
  { id: "messages", label: "Messages", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const learningStats: { id: string; icon: IconName; theme: DockIconTheme; value: string; label: string }[] = [
  { id: "streak", icon: "icon-trophy-01-line", theme: "orange", value: "12 days", label: "Learning streak" },
  { id: "week", icon: "icon-clock-line", theme: "blue", value: "3h 40m", label: "This week" },
];
const courses: { id: string; initials: string; theme: AvatarTheme; title: string; progress: string }[] = [
  { id: "ux-writing", initials: "UX", theme: "violet", title: "UX writing basics", progress: "8 of 12 lessons" },
  { id: "javascript", initials: "JS", theme: "yellow", title: "Modern JavaScript", progress: "3 of 20 lessons" },
];

/** C1 · Tab-bar Hub (Figma ◇ Master-Layout · Example, 15921:7245): AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function LearningHubPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const coursesId = useId();
  return (
    // Bar + Tab-Bar: the large title with its one action, then Shadow boxes on the grey Canvas (the bottom bar casts a
    // shadow, so every box floats too). The five destinations live in the bottom bar, which plays the Sidebar.
    <AppShell
      topNavigation={<TopNavigation title="Today" largeTitle="Today" scrollRef={scrollRef}
        trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: () => toast({ title: "You're all caught up", children: "New lessons and replies show here." }) }]} />}
      bottomNavigation={<BottomNavigation aria-label="Learning app" value={root} onValueChange={setRoot} showLabels items={learningRoots} />}
    >
      {/* One section per group of content (a section gap apart, from the AppShell body); the widgets inside keep md. */}
      <Stack gap="md">
        <Card theme="shadow">
          <Stack gap="md" align="stretch">
            <Text textStyle="All-Caps/S" tone="light">Continue learning</Text>
            <Stack gap="2xs">
              <Heading level={2} textStyle="Heading/4">Design systems in practice</Heading>
              <Text textStyle="Body/Small/Regular" tone="light">Module 4 · Tokens and modes · 12 min left</Text>
            </Stack>
            <ProgressBar value={62} aria-label="Design systems in practice" />
            <Button level="primary" startIcon="icon-play-line" onClick={() => toast({ title: "Resuming Module 4", children: "Tokens and modes · 12 min left" })}>Resume lesson</Button>
          </Stack>
        </Card>
        <Stack direction="row" gap="sm" fillChildren>
          {learningStats.map((stat) => (
            <Card key={stat.id} theme="shadow" spacing="sm">
              <Stack gap="xs">
                <DockIcon size="sm" icon={stat.icon} theme={stat.theme} background="subtle" />
                <Stack gap="3xs">
                  <Text as="p" textStyle="Heading/3">{stat.value}</Text>
                  <Text textStyle="Body/Small/Regular" tone="light">{stat.label}</Text>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
      <Stack as="section" gap="md" aria-labelledby={coursesId}>
        <Stack direction="row" justify="between" align="center" gap="xs">
          <Heading level={2} id={coursesId} textStyle="Heading/4">Your courses</Heading>
          {/* A section head's See all is underlined text, not a button (Zen rule); it opens the Courses tab. */}
          <Text as="span" textStyle="Body/Base/Bold">
            <Link as="button" tone="inherit" onClick={() => setRoot("courses")}>See all</Link>
          </Text>
        </Stack>
        <List aria-labelledby={coursesId}>
          {courses.map((course) => (
            <ListItem key={course.id} title={course.title} caption={course.progress}
              leading={<Avatar size="md" shape="square" theme={course.theme} background="subtle" alt="">{course.initials}</Avatar>}
              trailing={<Icon name="icon-chevron-right-line-medium" decorative />}
              onClick={() => toast({ title: course.title, children: `${course.progress} done` })} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}

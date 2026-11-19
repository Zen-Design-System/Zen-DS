import { useId, useState } from "react";
import {
  AppShell, Badge, BottomNavigation, Card, DockIcon, Flag, Heading, Icon, List, ListBox, ListItem, ProgressBar, Segmented, Stack, Text, TopNavigation,
  useToast, type BottomNavigationItem, type DockIconTheme, type IconName,
} from "@zen-ds/react";

const frenchRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "lessons", label: "Lessons", icon: "icon-book-closed-line", selectedIcon: "icon-book-closed-solid" },
  { id: "practice", label: "Practice", icon: "icon-play-line", selectedIcon: "icon-play-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const frenchLessons: { id: string; title: string; meta: string; done: number; icon: IconName; theme: DockIconTheme }[] = [
  { id: "greetings", title: "Greetings", meta: "Lesson 4 · 12 min", done: 40, icon: "icon-message-chat-circle-line", theme: "accent" },
  { id: "cafe", title: "At the café", meta: "Lesson 5 · 15 min", done: 20, icon: "icon-graduation-hat-line", theme: "cyan" },
];

/** D1 · Display Hero (Figma ◇ Master-Layout · Example, 15948:9468): AppShell/Mobile · Phone · Top=Band · Bottom=Tab-Bar,
 *  Shadow cards on Canvas/Default. The band scrolls away with the page (it is not pinned), so its bar takes no
 *  scrollRef. */
export default function DisplayHeroPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [view, setView] = useState("grid");
  const lessonsId = useId();
  const openLesson = (lesson: (typeof frenchLessons)[number]) => toast({ title: `${lesson.title} · ${lesson.meta.split(" · ")[0]}`, children: `${lesson.done}% done · ${lesson.meta.split(" · ")[1]}` });
  return (
    // Band + Tab-Bar: the headline is the hero. The Support/Brand/Subtle band runs from the top edge with the Transparent
    // bar (menu, course flag), the greeting, the Display/1 call to action and two badges; the next lessons follow as
    // Shadow cards on the grey Canvas (the Tab-Bar casts one too).
    <AppShell mobileTop="band"
      topNavigation={<TopNavigation aria-label="French course"
        leading={{ icon: "icon-menu-02-line", label: "Menu", onClick: () => toast({ title: "Menu", children: "Courses, reminders and settings." }) }}
        trailing={[{ icon: <Flag name="France" />, label: "Course language: French", onClick: () => toast({ title: "Learning French", children: "Add Spanish, Italian or German from Courses." }) }]} />}
      hero={(
        <>
          <Text textStyle="Body/Extra/Regular" tone="base">Hello Alan,</Text>
          <Heading level={1} textStyle="Display/1">Continue French!</Heading>
          <Stack direction="row" gap="2xs" wrap>
            <Badge theme="accent" leading="icon-zap-line">12-day streak</Badge>
            <Badge theme="neutral" leadingIcon={false}>A2 · Elementary</Badge>
          </Stack>
        </>
      )}
      bottomNavigation={<BottomNavigation aria-label="French course" value={root} onValueChange={setRoot} showLabels items={frenchRoots} />}
    >
      <Stack gap="xl">
        <Stack as="section" gap="xl" aria-labelledby={lessonsId}>
          <Stack direction="row" justify="between" align="center" gap="xs">
            <Heading level={2} id={lessonsId} textStyle="Heading/4">Your lessons</Heading>
            <Segmented size="sm" aria-label="Lesson layout" value={view} onValueChange={setView} options={[
              { id: "grid", label: null, "aria-label": "Grid view", leading: <Icon name="icon-grid-01-line" decorative /> },
              { id: "list", label: null, "aria-label": "List view", leading: <Icon name="icon-menu-01-line" decorative /> },
            ]} />
          </Stack>
          {view === "grid" ? (
            <Stack direction="row" gap="sm" fillChildren>
              {frenchLessons.map((lesson) => (
                <Card key={lesson.id} onClick={() => openLesson(lesson)}>
                  <Stack gap="sm">
                    <DockIcon size="lg" icon={lesson.icon} theme={lesson.theme} background="subtle" />
                    <Stack gap="3xs">
                      <Text textStyle="Body/Base/Bold">{lesson.title}</Text>
                      <Text textStyle="Body/Small/Regular" tone="light">{lesson.meta}</Text>
                    </Stack>
                    <ProgressBar value={lesson.done} aria-label={`${lesson.title}: ${lesson.done}% done`} />
                  </Stack>
                </Card>
              ))}
            </Stack>
          ) : (
            <ListBox theme="shadow" aria-labelledby={lessonsId}>
              <List aria-labelledby={lessonsId}>
                {frenchLessons.map((lesson) => (
                  <ListItem key={lesson.id} title={lesson.title} caption={lesson.meta} onClick={() => openLesson(lesson)}
                    leading={<DockIcon size="lg" icon={lesson.icon} theme={lesson.theme} background="subtle" />}
                    trailing={<Text as="span" textStyle="Body/Small/Medium" tone="base" tabularNumbers>{`${lesson.done}%`}</Text>} />
                ))}
              </List>
            </ListBox>
          )}
        </Stack>
        <Card as="section" aria-label="Daily goal">
          <Stack gap="sm">
            <Stack direction="row" gap="sm" align="center">
              <DockIcon size="lg" icon="icon-target-01-line" theme="orange" background="subtle" />
              <Stack gap="3xs" width="fill">
                <Text textStyle="Body/Base/Bold">Daily goal</Text>
                <Text textStyle="Body/Small/Regular" tone="light">15 of 20 minutes · 5 to go</Text>
              </Stack>
            </Stack>
            <ProgressBar value={75} aria-label="Daily goal: 15 of 20 minutes" />
          </Stack>
        </Card>
      </Stack>
    </AppShell>
  );
}

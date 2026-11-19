import { useId, useState, type RefObject } from "react";
import {
  AppShell, Avatar, AvatarStack, BottomNavigation, Button, Card, DockIcon, Heading, Icon, Link, List, ListItem, Stack, Text, TopNavigation,
  useToast, type IconName,
} from "@zen-ds/react";
import { me } from "../../data";

const todos = [
  { id: "power", initials: "EB", theme: "orange" as const, title: "Pay electricity bill", caption: "Due today · ₫850,000" },
  { id: "parcel", initials: "PK", theme: "violet" as const, title: "Pick up parcel", caption: "Locker 12 · until 18:00" },
];
const stats: { id: string; icon: IconName; theme: "green" | "blue"; value: string; label: string }[] = [
  { id: "steps", icon: "icon-activity-line", theme: "green", value: "6,240", label: "Steps today" },
  { id: "spent", icon: "icon-wallet-01-line", theme: "blue", value: "₫320k", label: "Spent today" },
];

/** C7 · Greeting Home (Figma ◇ Master-Layout · Example, 15942:120713): AppShell/Mobile · Phone · Top=Bar (Liquid Glass) ·
 *  Bottom=Floating (Glass), flat on Canvas/Default. */
// scrollRef: what scrolls the screen, so the large greeting folds into the bar as it scrolls. "window" in your app.
export default function GreetingHomePhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [unseen, setUnseen] = useState(true);
  const todoId = useId();
  return (
    // A home that opens on the person: the account avatar leading, the bell with its dot trailing, no bar title and a
    // large greeting. The day in short sits flat on the grey Canvas, under the Liquid-Glass header, with the
    // Floating-Glass bar riding over it.
    <AppShell
      topNavigation={<TopNavigation type="liquid-glass" largeTitle="Morning Alex!" scrollRef={scrollRef}
        leading={<Avatar size="md" theme="photo" src={me.photo} alt={me.name} />}
        trailing={[{ icon: "icon-bell-01-line", label: unseen ? "Notifications, 2 new" : "Notifications", dot: unseen, onClick: () => { setUnseen(false); toast({ title: "2 notifications", children: "Your parcel arrived and the standup moved to 09:30." }); } }]} />}
      bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Personal app" value={root} onValueChange={setRoot}
        action={{ icon: "icon-plus-line", label: "Quick add", onClick: () => toast({ title: "Quick add", children: "A task, an expense or an event." }) }}
        items={[
          { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
          { id: "calendar", label: "Calendar", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
          { id: "wallet", label: "Wallet", icon: "icon-wallet-01-line", selectedIcon: "icon-wallet-01-solid" },
          { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
        ]} />}
    >
      {/* One section per group of content (a section gap apart, from the AppShell body); the widgets inside keep md. */}
      <Stack gap="md">
        <Text as="p" tone="light">Thursday, Oct 16 · 3 things need you today</Text>
        <Card theme="default" as="section" aria-label="Up next">
          <Stack gap="sm">
            <Text textStyle="All-Caps/S" tone="light">Up next · 09:30</Text>
            <Stack gap="2xs">
              <Heading level={2} textStyle="Heading/4">Design standup</Heading>
              <Text textStyle="Body/Small/Regular" tone="light">Zoom · 15 min · 6 people</Text>
            </Stack>
            <Stack direction="row" gap="xs" align="center" justify="between">
              <AvatarStack size="sm" background="subtle" items={[
                { theme: "accent", children: "A", alt: "Ava Chen" },
                { theme: "blue", children: "B", alt: "Bao Nguyen" },
                { theme: "brown", children: "C", alt: "Chi Tran" },
              ]} />
              <Button size="sm" level="primary" startIcon="icon-video-line" onClick={() => toast({ title: "Joining Design standup…", children: "Camera off, mic muted." })}>Join</Button>
            </Stack>
          </Stack>
        </Card>
        <Stack direction="row" gap="sm" fillChildren>
          {stats.map((stat) => (
            <Card key={stat.id} theme="default" spacing="sm">
              <Stack gap="xs">
                <DockIcon icon={stat.icon} theme={stat.theme} background="subtle" size="sm" />
                <Stack gap="3xs">
                  <Text as="p" textStyle="Heading/3" tabularNumbers>{stat.value}</Text>
                  <Text textStyle="Body/Small/Regular" tone="light">{stat.label}</Text>
                </Stack>
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
      <Stack as="section" gap="md" aria-labelledby={todoId}>
        <Stack direction="row" gap="xs" align="center" justify="between">
          <Heading level={2} id={todoId} textStyle="Heading/4">To do today</Heading>
          <Text as="span" textStyle="Body/Base/Bold">
            <Link as="button" tone="inherit" onClick={() => toast({ title: "All to-dos", children: "3 today · 5 this week" })}>See All</Link>
          </Text>
        </Stack>
        <List aria-labelledby={todoId}>
          {todos.map((todo) => (
            <ListItem key={todo.id} title={todo.title} caption={todo.caption} onClick={() => toast({ title: todo.title, children: todo.caption })}
              leading={<Avatar size="md" shape="square" theme={todo.theme} background="subtle" alt="">{todo.initials}</Avatar>}
              trailing={<Icon name="icon-chevron-right-line-medium" size="lg" decorative />} />
          ))}
        </List>
      </Stack>
    </AppShell>
  );
}

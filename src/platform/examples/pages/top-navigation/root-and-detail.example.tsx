import { useId, useRef, useState, type RefObject } from "react";
import { AppShell, Avatar, BadgeStatus, DescriptionList, DockIcon, Heading, List, ListItem, Stack, TopNavigation, useToast } from "@zen-ds/react";
import {
  daysFromToday, formatDate, initials, people, projectProgress, projectStep, projects,
  type Person, type PersonId, type Project, type ProjectStatus,
} from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const back = "icon-chevron-left-line-medium" as const;

// The studio's other projects, so the root list runs past the screen like the real one.
const project = (id: string, name: string, client: string, icon: Project["icon"], theme: Project["theme"], status: ProjectStatus, lead: PersonId,
  members: PersonId[], progress: number, start: number, due: number, budget: number, spent: number): Project =>
  ({ id, name, client, icon, theme, status, lead, members, progress, start: daysFromToday(start), due: daysFromToday(due), budget, spent });
const moreProjects: Project[] = [
  project("phin-gift-cards", "Gift cards", "Phin & Co", "icon-gift-01-line", "orange", "On hold", "chi", ["chi", "bao"], 30, -50, 60, 22000, 6400),
  project("phin-store-locator", "Store locator", "Phin & Co", "icon-map-line", "orange", "Completed", "duy", ["duy", "chi", "khoa"], 100, -160, -60, 18000, 17650),
  project("lumen-card-controls", "Card controls", "Lumen Bank", "icon-credit-card-lock-line", "blue", "Active", "finn", ["finn", "bao", "ava"], 52, -40, 48, 46000, 22100),
  project("lumen-investor-report", "Investor report site", "Lumen Bank", "icon-bar-chart-01-line", "blue", "Completed", "hana", ["hana", "mai", "ava"], 100, -130, -40, 31000, 30200),
  project("mekong-driver-app", "Driver app", "Mekong Freight", "icon-route-line", "teal", "Planning", "duy", ["duy", "khoa", "em"], 0, 20, 140, 72000, 0),
  project("bookfair-kiosk", "Ticketing kiosk", "Hanoi Book Fair", "icon-ticket-01-line", "purple", "Completed", "linh", ["linh", "gia", "em"], 100, -200, -90, 14000, 13800),
  project("saola-trail-guide", "Trail guide app", "Saola Outdoor", "icon-compass-line", "green", "Planning", "ava", ["ava", "gia", "finn"], 0, 30, 150, 64000, 0),
  project("dizai-onboarding", "Onboarding handbook", "Đìzai Studio", "icon-graduation-hat-line", "indigo", "Active", "minhAnh", ["minhAnh", "linh"], 45, -20, 25, 0, 0),
];
const statusOrder: ProjectStatus[] = ["Active", "Planning", "On hold", "Completed"];
/** The Projects tab sorts by status, then by name. */
const studioProjects = [...projects, ...moreProjects]
  .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || a.name.localeCompare(b.name));

/** A tab root with a large title, and the dense detail screen each project pushes. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function RootAndDetail({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const teamId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const [fromId, setFromId] = useState<string | null>(null);
  // Focus follows the screen: a pushed screen focuses its title, Back returns to the row you came from.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const open = (id: string) => {
    setOpenId(id);
    setFromId(id);
    setTimeout(() => titleRef.current?.focus());
  };
  const goBack = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };

  const opened = studioProjects.find((item) => item.id === openId);
  if (!opened) {
    return (
      // Root screen: the large title is the h1 (Heading/1) and folds under the bar as the list scrolls. One key per
      // screen, so the bar measures its fold again.
      <AppShell key="root" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Projects" largeTitle="Projects" />}>
        {/* The rows sit in the screen margin (Margin/Comfortable, 20px), so their fill stays 8px off the screen edge. */}
        <List aria-label="Projects">
          {studioProjects.map((item) => (
            <ListItem key={item.id} ref={item.id === fromId ? rowRef : undefined} tabIndex={item.id === fromId ? -1 : undefined}
              title={item.name} caption={item.client}
              leading={<DockIcon icon={item.icon} theme={item.theme} background="subtle" size="md" />}
              // Small status: a phone row is a narrow space, and the project name must not truncate beside it.
              trailing={<BadgeStatus status={projectStep[item.status]} size="sm" progress={projectProgress(item)}>{item.status}</BadgeStatus>}
              onClick={() => open(item.id)} />
          ))}
        </List>
      </AppShell>
    );
  }

  const copyLink = () => {
    navigator.clipboard?.writeText(`https://zen.dizai.studio/projects/${opened.id}`).catch(() => undefined);
    toast({ title: "Link copied" });
  };
  return (
    // A pushed, dense detail screen: Compact type (Flat actions); the bar title is its h1 and Back returns to the row.
    <AppShell key={opened.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{opened.name}</span>}
        leading={{ icon: back, label: "Back", onClick: goBack }}
        trailing={[{ icon: "icon-link-01-line", label: "Copy link", onClick: copyLink }]} />}>
      <Stack gap="lg">
        <DescriptionList items={[
          { term: "Client", description: opened.client },
          { term: "Status", description: <BadgeStatus status={projectStep[opened.status]} progress={projectProgress(opened)}>{opened.status}</BadgeStatus> },
          { term: "Lead", description: people[opened.lead].name },
          { term: opened.status === "Completed" ? "Handed over" : "Due", description: formatDate(opened.due) },
          { term: "Progress", description: `${opened.progress}%` },
        ]} />
        <Stack as="section" gap="xs" aria-labelledby={teamId}>
          <Heading level={2} id={teamId} textStyle="Body/Small/Bold" tone="light">Team</Heading>
          <List aria-labelledby={teamId}>
            {opened.members.map((id) => (
              <ListItem key={id} title={people[id].name} caption={people[id].role} leading={<Avatar size="md" {...avatarOf(people[id])} />} />
            ))}
          </List>
        </Stack>
      </Stack>
    </AppShell>
  );
}

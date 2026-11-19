import { useRef, useState, type RefObject } from "react";
import { AppShell, ColorSelector, DockIcon, FormFieldset, List, ListItem, Stack, Text, TopNavigation, plural, type ColorOption, type DockIconTheme } from "@zen-ds/react";
import { projects, type Project } from "../../data";

/* Swatches are Support/Solid tokens, so they follow light and dark mode; the value maps back to a hue id. Ordered by hue. */
type Hue = "red" | "orange" | "yellow" | "green" | "teal" | "cyan" | "blue" | "indigo" | "purple" | "pink";
const hueNames: Record<Hue, string> = { red: "Red", orange: "Orange", yellow: "Yellow", green: "Green", teal: "Teal", cyan: "Cyan", blue: "Blue", indigo: "Indigo", purple: "Purple", pink: "Pink" };
const swatch = (hue: Hue): ColorOption => ({ value: `var(--zen-color-background-support-${hue}-solid)`, label: hueNames[hue], contrast: hue === "yellow" ? "dark" : undefined });
const hueOf = (value: string) => (Object.keys(hueNames) as Hue[]).find((hue) => swatch(hue).value === value)!;

const projectHues: Hue[] = ["orange", "yellow", "green", "teal", "blue", "indigo", "purple", "pink"];
type PhoneProject = Pick<Project, "id" | "name" | "client" | "icon"> & { theme: Hue; members: number };
// Every studio project, the shared six and eight smaller ones, by name.
const phoneProjects: PhoneProject[] = ([
  ...projects.map((project): PhoneProject => ({ id: project.id, name: project.name, client: project.client, icon: project.icon, theme: project.theme as Hue, members: project.members.length })),
  { id: "lumen-account-opening", name: "Account opening", client: "Lumen Bank", icon: "icon-briefcase-line", theme: "teal", members: 3 },
  { id: "lumen-card-controls", name: "Card controls", client: "Lumen Bank", icon: "icon-shield-line", theme: "indigo", members: 4 },
  { id: "mekong-driver-app", name: "Driver app", client: "Mekong Freight", icon: "icon-car-01-line", theme: "orange", members: 4 },
  { id: "phin-gift-cards", name: "Gift cards", client: "Phin & Co", icon: "icon-gift-01-line", theme: "pink", members: 2 },
  { id: "saola-online-shop", name: "Online shop", client: "Saola Outdoor", icon: "icon-shopping-cart-line", theme: "purple", members: 5 },
  { id: "phin-store-locator", name: "Store locator", client: "Phin & Co", icon: "icon-map-line", theme: "yellow", members: 3 },
  { id: "studio-website", name: "Studio website", client: "Đìzai Studio", icon: "icon-globe-01-line", theme: "blue", members: 3 },
  { id: "bookfair-ticketing", name: "Ticket sales", client: "Hanoi Book Fair", icon: "icon-shopping-bag-01-line", theme: "green", members: 2 },
] satisfies PhoneProject[]).sort((a, b) => a.name.localeCompare(b.name));

/** On a phone: a project's colour from its settings screen. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneProjectColour({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [themes, setThemes] = useState<Record<string, Hue>>(() => Object.fromEntries(phoneProjects.map((project) => [project.id, project.theme])));
  const [openId, setOpenId] = useState<string | null>("saola-brand");
  const [fromId, setFromId] = useState("saola-brand");
  // Focus follows the screen: a project's screen focuses its title, Back returns to the row of the project that was open.
  const titleRef = useRef<HTMLSpanElement>(null);
  const rowRef = useRef<HTMLElement>(null);
  const opened = phoneProjects.find((project) => project.id === openId);
  const openProject = (project: PhoneProject) => {
    setOpenId(project.id);
    setFromId(project.id);
    setTimeout(() => titleRef.current?.focus());
  };
  // Back lands on the row of the project that was open, so the reader sees its new icon.
  const back = () => {
    setOpenId(null);
    setTimeout(() => rowRef.current?.focus());
  };

  if (!opened) {
    return (
      // One key per screen: each screen opens at the top and the large title folds again.
      // The screen margin insets the rows; their fill (12px outside the content) stays 8px inside the screen.
      <AppShell key="root" topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Projects" largeTitle="Projects" />}>
        <List aria-label="Projects">
          {phoneProjects.map((project) => (
            <ListItem key={project.id} ref={project.id === fromId ? rowRef : undefined} tabIndex={project.id === fromId ? -1 : undefined}
              title={project.name} caption={project.client} onClick={() => openProject(project)}
              leading={<DockIcon icon={project.icon} theme={themes[project.id] as DockIconTheme} background="subtle" />} />
          ))}
        </List>
      </AppShell>
    );
  }
  const hue = themes[opened.id];
  return (
    <AppShell key={opened.id}
      topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={<span ref={titleRef} tabIndex={-1}>{opened.name}</span>}
        leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}>
      <Stack gap="lg">
        <Stack gap="xs" align="center">
          <DockIcon size="2xl" icon={opened.icon} theme={hue as DockIconTheme} background="subtle" />
          <Text tone="base" align="center">{`${opened.client} · ${plural(opened.members, "member")}`}</Text>
        </Stack>
        {/* A phone setting applies at once, so there is no Save and Back has nothing to lose. */}
        <FormFieldset legend="Colour" helpText="Shows on the project's icon, its timeline bar and its calendar events.">
          <ColorSelector aria-label={`${opened.name} colour`} colors={projectHues.map(swatch)} value={swatch(hue).value}
            onValueChange={(value) => setThemes({ ...themes, [opened.id]: hueOf(value) })} />
        </FormFieldset>
      </Stack>
    </AppShell>
  );
}

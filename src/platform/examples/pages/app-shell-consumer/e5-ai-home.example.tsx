import { useId, useState, type RefObject } from "react";
import {
  AppShell, Avatar, BottomNavigation, Button, Card, Divider, DockIcon, Grid, Heading, Link, Stack, Text, TopNavigation, useToast,
  type BottomNavigationItem,
} from "@zen-ds/react";
import { people } from "../../data";

/* Figma ◇ Master-Layout · Example › E · Consumer apps › E5 · AI home (15991:9899): one Pattern/AppShell/Mobile,
   Top=Bar, Transparent · Bottom=Floating; Shadow boxes on Canvas/Default. The copy, numbers and variants are the Figma
   screen's. E5 and E6 are two roots of one family-history app (the same people, the same bottom bar). */

/** The relatives' small Avatars: the demo people's photos stand in, one per relative. */
const faces = { maiAnh: people.emi.photo, bao: people.bao.photo, hoa: people.ava.photo, khoi: people.duy.photo, ha: people.chi.photo };
const familyRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
  { id: "tree", label: "Tree", icon: "icon-git-branch-01-line", selectedIcon: "icon-git-branch-01-solid" },
  { id: "records", label: "Records", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  { id: "explore", label: "Explore", icon: "icon-marker-pin-01-line", selectedIcon: "icon-marker-pin-01-solid" },
];

type Relative = { id: string; name: string; years: string; records: number; photo?: string };
/** Two couples, each the parents of the next: Bảo + Hoa → Khôi + Hà → Mai Anh. */
const elders: Relative[] = [
  { id: "bao", name: "Bảo Nguyễn", years: "1940 – 2010", records: 8, photo: faces.bao },
  { id: "hoa", name: "Hoa Trần", years: "1945 – 2018", records: 6, photo: faces.hoa },
  { id: "khoi", name: "Khôi Nguyễn", years: "1964 –", records: 5, photo: faces.khoi },
  { id: "ha", name: "Hà Lê", years: "1972 –", records: 4, photo: faces.ha },
];
const you: Relative = { id: "mai-anh", name: "Mai Anh (you)", years: "1996 –", records: 12, photo: faces.maiAnh };

/** Figma Card Theme=Shadow, Spacing=Small: one person of the tree; the selected person is the Card's Active state. */
function RelativeCard({ person, selected, onSelect, width }: { person: Relative; selected: boolean; onSelect: (person: Relative) => void; width?: number }) {
  return (
    <Card theme="shadow" spacing="sm" width={width} selected={selected} aria-pressed={selected} onClick={() => onSelect(person)}>
      <Stack gap="xs">
        <Stack direction="row" gap="xs" align="center">
          <Avatar size="sm" theme="photo" src={person.photo} alt="" />
          <Stack gap="none" width="fill">
            <Text textStyle="Body/Small/Bold" truncate>{person.name}</Text>
            <Text textStyle="Caption/Regular" tone="light">{person.years}</Text>
          </Stack>
        </Stack>
        <Text textStyle="Caption/Medium" tone={selected ? "accent-base" : "light"}>{person.records} records</Text>
      </Stack>
    </Card>
  );
}

/** A family-history app's home: the AI insight first, then the tree as small person cards on one connecting line. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function AiHome({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [unseen, setUnseen] = useState(true);
  const [selectedId, setSelectedId] = useState(you.id);
  const insightId = useId();
  const treeId = useId();
  const select = (person: Relative) => {
    setSelectedId(person.id);
    toast({ title: person.name, children: `${person.years} · ${person.records} records` });
  };
  return (
    // Bar + Floating on Canvas/Default: the person's photo leading, the bell and scan trailing, the greeting as the
    // large title's capline over the name. The AI insight leads in a Shadow card (Accent Solid sparkle, Tertiary +
    // Primary), then the tree as small Shadow person cards on one connecting line; the floating bar casts the screen's
    // one shadow level.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent"
        leading={<Avatar size="md" theme="photo" src={faces.maiAnh} alt="Mai Anh" />}
        trailing={[
          { icon: "icon-bell-01-line", label: unseen ? "Notifications, 3 new" : "Notifications", dot: unseen, onClick: () => { setUnseen(false); toast({ title: "3 new matches", children: "Khôi Nguyễn appears in a 1968 record from Hội An." }); } },
          { icon: "icon-scan-line", label: "Scan a photo or document", onClick: () => toast({ title: "Scan a photo or document", children: "Point the camera at an old photo, a letter or a certificate." }) },
        ]}
        largeTitle="Mai Anh 👋" largeTitleCapline="Good morning," />}
      bottomNavigation={<BottomNavigation type="floating" aria-label="Family history" value={root} onValueChange={setRoot} showLabels items={familyRoots}
        action={{ icon: "icon-plus-line", label: "Add a relative", theme: "primary", onClick: () => toast({ title: "Add a relative", children: "A parent, a child, a partner or a sibling of Mai Anh." }) }} />}
    >
      <Stack gap="xl">
        <Card theme="shadow" as="section" aria-labelledby={insightId}>
          <Stack gap="md">
            <Stack direction="row" gap="sm" align="center">
              <DockIcon icon="icon-stars-01-line" theme="accent" background="solid" />
              <Stack gap="none" width="fill">
                <Heading level={2} id={insightId} textStyle="Heading/4">AI insight</Heading>
                <Text textStyle="Body/Small/Regular" tone="base">From your family details I found 24 possible historical records.</Text>
              </Stack>
            </Stack>
            <Stack direction="row" gap="sm" fillChildren>
              <Button level="tertiary" onClick={() => toast({ title: "Ask about your family", children: "Try “Where did Bảo Nguyễn live in 1960?”" })}>Ask AI</Button>
              <Button level="primary" onClick={() => { setRoot("records"); toast({ title: "24 possible records", children: "Birth, marriage and land records from Nam Định, Huế and Hội An." }); }}>View records</Button>
            </Stack>
          </Stack>
        </Card>
        <Stack as="section" gap="md" aria-labelledby={treeId}>
          <Stack direction="row" justify="between" align="center" gap="xs">
            <Heading level={2} id={treeId} textStyle="Heading/4">Family tree</Heading>
            {/* A section head's View all is underlined text, not a button (Zen rule); it opens the Tree tab. */}
            <Text as="span" textStyle="Body/Base/Bold">
              <Link as="button" tone="inherit" onClick={() => setRoot("tree")}>View all</Link>
            </Text>
          </Stack>
          {/* Figma Tree: the couples two by two, the child centred under them, joined by one Divider line that runs
              from the first couple down to the child (it paints behind the cards, so only the gaps show it). */}
          <Stack gap="sm">
            <Stack direction="row" align="stretch" gap="none" position="absolute" constraintX="center" constraintY="top-bottom" insetTop="4xl" insetBottom="4xl">
              <Divider orientation="vertical" decorative />
            </Stack>
            <Grid columns={2} gap="md" rowGap="sm">
              {elders.map((person) => <RelativeCard key={person.id} person={person} selected={selectedId === person.id} onSelect={select} />)}
            </Grid>
            <Stack align="center">
              <RelativeCard person={you} selected={selectedId === you.id} onSelect={select} width={200} />
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </AppShell>
  );
}

/* App Shell examples · e-consumer-2: built from Figma ◇ Master-Layout · Example (15902:109717), section
   "E · Consumer apps" (15991:9672): E5 · AI home (15991:9899), E6 · Discover (15991:9955) and E7 · Big number
   (15991:10011). Each phone is one Pattern/AppShell/Mobile instance; the copy, numbers and component variants are the
   ones the Figma screens hold. E5 and E6 are two roots of one family-history app (the same people, the same bottom bar). */
import { useId, useState, type CSSProperties } from "react";
import { AppShell } from "../../../../components/AppShell";
import { Avatar } from "../../../../components/Avatar";
import { Badge, type BadgeTheme } from "../../../../components/Badge";
import { BottomNavigation, type BottomNavigationItem } from "../../../../components/BottomNavigation";
import { Button, IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { ChipGroup } from "../../../../components/ChipGroup";
import { Divider } from "../../../../components/Divider";
import { DockIcon } from "../../../../components/DockIcon";
import { Icon, type IconName } from "../../../../components/Icon";
import { Image } from "../../../../components/Image";
import { InputLeadingTrailing } from "../../../../components/Input";
import { Box, Grid, Stack } from "../../../../components/Layout";
import { Link } from "../../../../components/Link";
import { Menu } from "../../../../components/Menu";
import { MetricCard } from "../../../../components/MetricWidget";
import { ProgressBar } from "../../../../components/Progress";
import { Search } from "../../../../components/Search";
import { Segmented } from "../../../../components/Segmented";
import { Heading, Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { TopNavigation } from "../../../../components/TopNavigation";
import { platformMedia } from "../../../PlatformMedia";
import { PlatformPhone } from "../../../PlatformPhone";
import { people } from "../../data";
import type { ExampleDef } from "../../types";

// ——— The family-history app of E5 and E6 ————————————————————————————————————————————————————————————————————————
/** The people's small Avatars: the platform's people photos (src/assets/media), one per relative. */
const photos = { maiAnh: people.emi.photo, bao: people.bao.photo, hoa: people.ava.photo, khoi: people.duy.photo, ha: people.chi.photo, minh: people.finn.photo };
const familyRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
  { id: "tree", label: "Tree", icon: "icon-git-branch-01-line", selectedIcon: "icon-git-branch-01-solid" },
  { id: "records", label: "Records", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  { id: "explore", label: "Explore", icon: "icon-marker-pin-01-line", selectedIcon: "icon-marker-pin-01-solid" },
];

// ——— E5 · AI home (Top=Bar, Transparent · Bottom=Floating; Shadow boxes on Canvas/Default) ———————————————————————
type Relative = { id: string; name: string; years: string; records: number; photo?: string };
/** Two couples, each the parents of the next: Bảo + Hoa → Khôi + Hà → Mai Anh. */
const elders: Relative[] = [
  { id: "bao", name: "Bảo Nguyễn", years: "1940 – 2010", records: 8, photo: photos.bao },
  { id: "hoa", name: "Hoa Trần", years: "1945 – 2018", records: 6, photo: photos.hoa },
  { id: "khoi", name: "Khôi Nguyễn", years: "1964 –", records: 5, photo: photos.khoi },
  { id: "ha", name: "Hà Lê", years: "1972 –", records: 4, photo: photos.ha },
];
const you: Relative = { id: "mai-anh", name: "Mai Anh (you)", years: "1996 –", records: 12, photo: photos.maiAnh };

/** Figma Card Theme=Shadow, Spacing=Small: one person of the tree; the selected person is the Card's Active state. */
function RelativeCard({ person, selected, onSelect, width }: { person: Relative; selected: boolean; onSelect: (person: Relative) => void; width?: number }) {
  return (
    <Card theme="shadow" spacing="sm" width={width} selected={selected} aria-pressed={selected} onClick={() => onSelect(person)}>
      <Stack gap="xs">
        <Stack direction="row" gap="xs" align="center">
          <Avatar size="sm" theme="photo" src={person.photo} alt="" />
          <Stack gap="none" width="fill">
            <Text textStyle="Body/Small/Bold" truncate>{person.name}</Text>
            <Text textStyle="Caption/Regular" tone="base">{person.years}</Text>
          </Stack>
        </Stack>
        <Text textStyle="Caption/Medium" tone={selected ? "accent-base" : "base"}>{person.records} records</Text>
      </Stack>
    </Card>
  );
}

function AiHomePhone() {
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
    <PlatformPhone label="Family history app" canvas="default">
      {/* Bar + Floating on Canvas/Default: the person's photo leading, the bell and scan trailing, the greeting as the
          large title's capline over the name. The AI insight leads in a Shadow card (Accent Solid sparkle, Tertiary + Primary), then the tree as
          small Shadow person cards on one connecting line; the floating bar casts the screen's one shadow level. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent"
          leading={<Avatar size="md" theme="photo" src={photos.maiAnh} alt="Mai Anh" />}
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
    </PlatformPhone>
  );
}

// ——— E6 · Discover (Top=Bar, Transparent with a large title · Bottom=Floating with the AI action) ———————————————————
/** Figma breaks each label over two lines (the tiles are 81 wide); `lines` keeps those breaks. */
type Intent = { id: string; icon: IconName; lines: [string, string] };
const intents: Intent[] = [
  { id: "ancestors", icon: "icon-users-check-line", lines: ["Find", "ancestors"] },
  { id: "dna", icon: "icon-git-branch-01-line", lines: ["Explain", "my DNA"] },
  { id: "records", icon: "icon-file-search-line", lines: ["Find", "records"] },
  { id: "story", icon: "icon-book-open-line", lines: ["Family", "story"] },
];
type DiscoveryKind = "records" | "dna" | "photos" | "stories";
const kinds: { value: DiscoveryKind; label: string }[] = [
  { value: "records", label: "Records" },
  { value: "dna", label: "DNA" },
  { value: "photos", label: "Photos" },
  { value: "stories", label: "Stories" },
];
type Discovery = { id: string; kind: DiscoveryKind; name: string; place: string; match: string; photo?: string };
const discoveries: Discovery[] = [
  /* Figma E6's three records, with the 72 photos the Figma results hold. */
  { id: "khoi-1968", kind: "records", name: "Khôi Nguyễn", place: "Hội An, Quảng Nam", match: "Matched to Khôi Nguyễn", photo: platformMedia.portraits.smile.src },
  { id: "hoa-1951", kind: "records", name: "Hoa Trần", place: "Huế, Thừa Thiên", match: "Matched to Hoa Trần", photo: platformMedia.portraits.window.src },
  { id: "bao-1959", kind: "records", name: "Bảo Nguyễn", place: "Nam Định", match: "Matched to Bảo Nguyễn", photo: platformMedia.portraits.blazer.src },
  { id: "minh-dna", kind: "dna", name: "Minh Trần", place: "Đà Nẵng · 212 cM shared", match: "Matched to Hoa Trần", photo: photos.minh },
  { id: "old-town", kind: "photos", name: "Hội An old town, 1968", place: "Hội An, Quảng Nam", match: "Matched to Khôi Nguyễn", photo: platformMedia.site[2].src },
  { id: "cafe", kind: "stories", name: "The family café", place: "Huế, Thừa Thiên", match: "Matched to Hoa Trần", photo: platformMedia.site[5].src },
];

/** One AI result: the photo, the place, the matched-to line in Accent and the Add to tree Badge; ⋮ holds its actions. */
function DiscoveryRow({ item, added, onAdd, onHide }: { item: Discovery; added: boolean; onAdd: () => void; onHide: () => void }) {
  const { toast } = useToast();
  return (
    <Stack as="li" direction="row" gap="sm" align="start">
      <Box width={72}>
        <Image src={item.photo} alt="" ratio={1} radius="lg" />
      </Box>
      <Stack gap="2xs" width="fill">
        <Text textStyle="Body/Base/Bold">{item.name}</Text>
        <Text textStyle="Body/Small/Regular" tone="base">{item.place}</Text>
        <Text textStyle="Caption/Medium" tone="accent-base">{item.match}</Text>
        <Badge size="sm" theme={added ? "teal" : "accent"} background="subtle">{added ? "In your tree" : "Add to tree"}</Badge>
      </Stack>
      {/* Figma Wrapper (Element-Size/Popular/Base 24): the Small Icon-Flat bleeds out of it, as Figma draws it. */}
      <Stack width={24} height={24} align="center" justify="center">
        <Menu align="end" trigger={<IconButton appearance="flat" level="secondary" size="sm" icon="icon-dots-vertical-line" aria-label={`More for ${item.name}`} />}
          items={[
            { id: "add", label: added ? "Open in tree" : "Add to tree", icon: added ? "icon-git-branch-01-line" : "icon-plus-circle-line", onSelect: added ? () => toast({ title: `${item.name} is in your tree`, children: item.match }) : onAdd },
            { id: "record", label: "Open record", icon: "icon-file-search-line", onSelect: () => toast({ title: item.name, children: `${item.place} · ${item.match}` }) },
            { id: "hide", label: "Not a match", icon: "icon-eye-off-line", onSelect: onHide },
          ]} />
      </Stack>
    </Stack>
  );
}

function DiscoverPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("explore");
  const [intent, setIntent] = useState("ancestors");
  const [kind, setKind] = useState<DiscoveryKind>("records");
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const intentsId = useId();
  const resultsId = useId();
  const needle = query.trim().toLowerCase();
  const shown = discoveries.filter((item) => item.kind === kind && !hidden.includes(item.id)
    && (!needle || `${item.name} ${item.place}`.toLowerCase().includes(needle)));
  return (
    <PlatformPhone label="Family history app" canvas="default">
      {/* Bar + Floating on Canvas/Default: a Heading/1 large title with History beside it, a Surface search with voice,
          four intent tiles (the chosen one Brand Subtle: Pale fades into the grey Canvas), then the AI results under single-choice Chips in one Shadow card.
          The floating bar's action is the AI. */}
      <AppShell
        topNavigation={<TopNavigation type="transparent" largeTitle="Discover"
          trailing={[{ icon: "icon-clock-rewind-line", label: "Search history", onClick: () => toast({ title: "Recent searches", children: "Khôi Nguyễn · Hội An 1968 · Nam Định land records" }) }]} />}
        bottomNavigation={<BottomNavigation type="floating" aria-label="Family history" value={root} onValueChange={setRoot} showLabels items={familyRoots}
          action={{ icon: "icon-stars-01-line", label: "Ask AI", onClick: () => toast({ title: "Ask AI", children: "Ask about a person, a place or a record." }) }} />}
      >
        <Stack gap="xl">
          <Search shape="rounded" aria-label="Search ancestors or places" placeholder="Search ancestors or places" value={query} onValueChange={setQuery}
            trailing={<InputLeadingTrailing icon="icon-microphone-line" aria-label="Search by voice" onClick={() => toast({ title: "Listening…", children: "Say a name or a place." })} />} />
          <Stack as="section" gap="sm" aria-labelledby={intentsId}>
            <Heading level={2} id={intentsId} textStyle="Heading/4">What to explore?</Heading>
            {/* Figma's Intent tiles: four in the row, 8px inside (Card Spacing=XSmall, the user 2026-10-20). */}
            <Grid columns={4} gap="xs" align="stretch" role="group" aria-labelledby={intentsId}>
              {intents.map((item) => {
                const chosen = intent === item.id;
                return (
                  <Card key={item.id} theme={chosen ? "subtle" : "flat"} color={chosen ? "brand" : "neutral"} spacing="xs" aria-pressed={chosen} onClick={() => setIntent(item.id)}>
                    <Stack gap="xs" align="center">
                      <Icon name={item.icon} tone={chosen ? "accent-base" : "base"} decorative />
                      <Text textStyle="Caption/Medium" tone={chosen ? "accent-base" : "strongest"} align="center" wrap={false}>{item.lines[0]}<br />{item.lines[1]}</Text>
                    </Stack>
                  </Card>
                );
              })}
            </Grid>
          </Stack>
          <Stack as="section" gap="md" aria-labelledby={resultsId}>
            <Stack direction="row" justify="between" align="center" gap="xs">
              <Heading level={2} id={resultsId} textStyle="Heading/4">AI discoveries</Heading>
              <Text as="span" textStyle="Body/Base/Bold">
                <Link as="button" tone="inherit" onClick={() => toast({ title: "24 AI discoveries", children: "Records, DNA matches, photos and stories." })}>View all</Link>
              </Text>
            </Stack>
            <ChipGroup aria-label="Kind of discovery" value={kind} onValueChange={(value) => setKind(value as DiscoveryKind)} options={kinds} />
            <Card theme="shadow">
              {shown.length ? (
                <Stack as="ul" gap="md" aria-labelledby={resultsId}>
                  {shown.map((item) => (
                    <DiscoveryRow key={item.id} item={item} added={added.includes(item.id)}
                      onAdd={() => { setAdded((list) => [...list, item.id]); toast({ title: `${item.name} added to your tree`, children: item.match }); }}
                      onHide={() => { setHidden((list) => [...list, item.id]); toast({ title: "Hidden from discoveries", children: `${item.name} · ${item.place}`, action: { label: "Undo", onClick: () => setHidden((list) => list.filter((id) => id !== item.id)) } }); }} />
                  ))}
                </Stack>
              ) : (
                <Text tone="base">{needle ? `No discoveries match “${query.trim()}”.` : "Nothing new here yet. The AI checks new records every night."}</Text>
              )}
            </Card>
          </Stack>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— E7 · Big number (Top=Band-Sheet on Background/Accent/Solid · Bottom=Floating, Glass) ————————————————————————
const week = [
  { day: "Mon", date: 14 },
  { day: "Tue", date: 15 },
  { day: "Wed", date: 16, today: true },
  { day: "Thu", date: 17 },
  { day: "Fri", date: 18 },
];
type HeroView = "nutrition" | "activity";
const heroViews: Record<HeroView, { value: string; label: string; tiles: { id: string; label: string; value: string }[] }> = {
  nutrition: { value: "1,644", label: "Calories eaten today", tiles: [{ id: "protein", label: "Protein", value: "32%" }, { id: "carbs", label: "Carbs", value: "44%" }, { id: "fat", label: "Fat", value: "28%" }] },
  activity: { value: "6,240", label: "Steps today", tiles: [{ id: "distance", label: "Distance", value: "4.1 km" }, { id: "active", label: "Active", value: "48 min" }, { id: "burned", label: "Burned", value: "312 kcal" }] },
};
type Update = "meals" | "advice" | "water";
type Measurement = { title: string; caption: string; value: string; progress: number; min: string; max: string; footer: string; status: { label: string; theme: BadgeTheme } };
const updates: Record<Update, Measurement> = {
  meals: { title: "Lunch: bún chả", caption: "Logged at 12:40 pm", value: "620 kcal", progress: 28, min: "0", max: "2,200 kcal", footer: "3 meals logged today", status: { label: "On track", theme: "teal" } },
  advice: { title: "Improve melatonin", caption: "Sleep hormone", value: "3 pg/ml", progress: 20, min: "0", max: "200 pg/ml", footer: "Last measured today at 7:30 pm", status: { label: "Normal", theme: "teal" } },
  water: { title: "Water", caption: "Goal 2 L a day", value: "1.2 L", progress: 60, min: "0", max: "2 L", footer: "Last glass at 3:10 pm", status: { label: "Drink more", theme: "orange" } },
};
/** Figma's Hero pads 24 · 48 where AppShell's hero pads 8 · 24, so the Stack adds Padding/Medium and this Box Padding/XSmall below. */
const heroEnd: CSSProperties = { paddingBottom: "var(--zen-spacing-padding-xsmall)" };

function BigNumberPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [view, setView] = useState<HeroView>("nutrition");
  const [update, setUpdate] = useState<Update>("advice");
  const hero = heroViews[view];
  const card = updates[update];
  const updatesId = useId();
  return (
    <PlatformPhone label="Nutrition app" canvas="surface" statusBar="light" homeIndicator="dark">
      {/* Band-Sheet on Accent/Solid: the week with today on White, a White-Overlay Segmented for the view (Figma E7; since
          2026-10-20 its labels are On-White-Overlay/Light at rest, Strongest when selected, hovered or focused), one
          Display-Extra number and three tiles on the band; the Surface sheet carries the day's updates (a Segmented and
          one Pale measurement card). The glass bar floats over the sheet. */}
      <AppShell mobileTop="band-sheet" band="accent"
        topNavigation={<TopNavigation topBar={false} title="Today, Wednesday 16" />}
        hero={(
          <Box style={heroEnd}>
            <Stack gap="lg" paddingY="md" align="center">
              <Stack as="ol" direction="row" justify="between" gap="none" width="fill" aria-label="This week">
                {week.map((day) => (
                  <Box as="li" key={day.day} width={56} paddingY="xs" radius="md" surface={day.today ? "surface" : "none"} aria-current={day.today ? "date" : undefined}>
                    <Stack gap="none" align="center">
                      <Text as="span" textStyle="Caption/Medium" tone={day.today ? "base" : "on-accent"}>{day.day}</Text>
                      <Text as="span" textStyle="Heading/4" tone={day.today ? "strongest" : "on-accent"}>{day.date}</Text>
                    </Stack>
                  </Box>
                ))}
              </Stack>
              <Segmented level="white-overlay" aria-label="View" value={view} onValueChange={(value) => setView(value as HeroView)}
                options={[{ id: "nutrition", label: "Nutrition" }, { id: "activity", label: "Activity" }]} />
              <Stack gap="2xs" align="center">
                <Text textStyle="Display-Extra/1" tone="on-accent" tabularNumbers>{hero.value}</Text>
                <Text textStyle="Body/Base/Medium" tone="on-accent">{hero.label}</Text>
              </Stack>
              <Stack direction="row" gap="sm" fillChildren width="fill">
                {hero.tiles.map((tile) => (
                  <MetricCard key={tile.id} type="tile" theme="flat" size="sm" icon={false} label={tile.label} value={tile.value} />
                ))}
              </Stack>
            </Stack>
          </Box>
        )}
        bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Nutrition" value={root} onValueChange={setRoot} showLabels
          action={{ icon: "icon-plus-line", label: "Log a meal", onClick: () => toast({ title: "Log a meal", children: "Snap a photo or search 2 million foods." }) }}
          items={[
            { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
            { id: "log", label: "Log", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
            { id: "alerts", label: "Alerts", icon: "icon-bell-01-line", selectedIcon: "icon-bell-01-solid" },
            { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
          ]} />}
      >
        <Stack as="section" gap="md" aria-labelledby={updatesId}>
          <Heading level={2} id={updatesId} textStyle="Heading/4">Daily updates</Heading>
          <Segmented fullWidth aria-label="Daily updates" value={update} onValueChange={(value) => setUpdate(value as Update)}
            options={[{ id: "meals", label: "Meals" }, { id: "advice", label: "Advice" }, { id: "water", label: "Water" }]} />
          <Card theme="pale">
            <Stack gap="sm">
              <Stack direction="row" justify="between" align="center" gap="sm">
                <Stack gap="none" width="fill">
                  <Heading level={3} textStyle="Body/Base/Bold">{card.title}</Heading>
                  <Text textStyle="Body/Small/Regular" tone="base">{card.caption}</Text>
                </Stack>
                <Text textStyle="Heading/2" wrap={false} tabularNumbers>{card.value}</Text>
              </Stack>
              <ProgressBar theme="accent" value={card.progress} aria-label={`${card.title}: ${card.value} of ${card.max}`} />
              <Stack direction="row" justify="between" gap="sm">
                <Text as="span" textStyle="Caption/Regular" tone="base">{card.min}</Text>
                <Text as="span" textStyle="Caption/Regular" tone="base">{card.max}</Text>
              </Stack>
              <Stack direction="row" justify="between" align="center" gap="sm">
                <Text textStyle="Caption/Regular" tone="base">{card.footer}</Text>
                <Badge size="sm" theme={card.status.theme} background="subtle">{card.status.label}</Badge>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "E5 · AI home",
    description: "The insight first, then your tree: a greeting with the person's photo in Top-Leading, bell and scan in the bar. An AI insight card leads (Accent Solid sparkle, one Primary and one Tertiary action), then the family tree as small Shadow person cards joined by Dividers; the selected person is the Card's Active state. Floating nav with the AI action. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: AI assistant, Genealogy, Knowledge, Health records.",
    render: () => <AiHomePhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    topNavigation={<TopNavigation type="transparent"
      leading={<Avatar size="md" theme="photo" src={maiAnh.photo} alt="Mai Anh" />}
      trailing={[
        { icon: "icon-bell-01-line", label: "Notifications, 3 new", dot: true, onClick: openNotifications },
        { icon: "icon-scan-line", label: "Scan a photo or document", onClick: scan },
      ]}
      largeTitle="Mai Anh 👋" largeTitleCapline="Good morning," />}
    bottomNavigation={<BottomNavigation type="floating" aria-label="Family history" value={root} onValueChange={setRoot} showLabels items={[
      { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
      { id: "tree", label: "Tree", icon: "icon-git-branch-01-line", selectedIcon: "icon-git-branch-01-solid" },
      …Records · Explore
    ]} action={{ icon: "icon-plus-line", label: "Add a relative", theme: "primary", onClick: addRelative }} />}
  >
    <Stack gap="xl">
      <Card theme="shadow" as="section" aria-labelledby="insight">
        <Stack gap="md">
          <Stack direction="row" gap="sm" align="center">
            <DockIcon icon="icon-stars-01-line" theme="accent" background="solid" />
            <Stack gap="none" width="fill">
              <Heading level={2} id="insight" textStyle="Heading/4">AI insight</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">From your family details I found 24 possible historical records.</Text>
            </Stack>
          </Stack>
          <Stack direction="row" gap="sm" fillChildren>
            <Button level="tertiary" onClick={askAi}>Ask AI</Button>
            <Button level="primary" onClick={viewRecords}>View records</Button>
          </Stack>
        </Stack>
      </Card>
      <Stack as="section" gap="md" aria-labelledby="tree">
        …Family tree · <Link as="button" tone="inherit" onClick={openTree}>View all</Link>
        <Stack gap="sm">
          <Stack direction="row" align="stretch" gap="none" position="absolute" constraintX="center" constraintY="top-bottom" insetTop="4xl" insetBottom="4xl">
            <Divider orientation="vertical" decorative />
          </Stack>
          <Grid columns={2} gap="md" rowGap="sm">
            <Card theme="shadow" spacing="sm" selected={false} aria-pressed={false} onClick={select}>
              <Stack gap="xs">
                <Stack direction="row" gap="xs" align="center">
                  <Avatar size="sm" theme="photo" src={bao.photo} alt="" />
                  <Stack gap="none" width="fill">
                    <Text textStyle="Body/Small/Bold" truncate>Bảo Nguyễn</Text>
                    <Text textStyle="Caption/Regular" tone="base">1940 – 2010</Text>
                  </Stack>
                </Stack>
                <Text textStyle="Caption/Medium" tone="base">8 records</Text>
              </Stack>
            </Card>
            …Hoa Trần · Khôi Nguyễn · Hà Lê
          </Grid>
          <Stack align="center">
            <Card theme="shadow" spacing="sm" width={200} selected aria-pressed onClick={select}>…Mai Anh (you) · 12 records (tone="accent-base")</Card>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "E6 · Discover",
    description: "Large title, intents, AI results: a Heading/1 title with history, a Surface search with voice, four intent tiles (the chosen one Brand Subtle, as Pale fades into the grey canvas), then AI results with Chips in a Shadow card: photo, place, a matched-to line in Accent and an Add to tree Badge. Floating nav with the AI action. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: AI search, Research, Travel, Library.",
    render: () => <DiscoverPhone />,
    code: `<AppShell
  topNavigation={<TopNavigation type="transparent" largeTitle="Discover"
    trailing={[{ icon: "icon-clock-rewind-line", label: "Search history", onClick: openHistory }]} />}
  bottomNavigation={<BottomNavigation type="floating" aria-label="Family history" value="explore" onValueChange={setRoot} showLabels items={roots}
    action={{ icon: "icon-stars-01-line", label: "Ask AI", onClick: askAi }} />}
>
  <Stack gap="xl">
    <Search shape="rounded" aria-label="Search ancestors or places" placeholder="Search ancestors or places" value={query} onValueChange={setQuery}
      trailing={<InputLeadingTrailing icon="icon-microphone-line" aria-label="Search by voice" onClick={listen} />} />
    <Stack as="section" gap="sm" aria-labelledby="intents">
      <Heading level={2} id="intents" textStyle="Heading/4">What to explore?</Heading>
      <Grid columns={4} gap="xs" align="stretch" role="group" aria-labelledby="intents">
        <Card theme="subtle" color="brand" spacing="xs" aria-pressed onClick={pick}>
          <Stack gap="xs" align="center">
            <Icon name="icon-users-check-line" tone="accent-base" decorative />
            <Text textStyle="Caption/Medium" tone="accent-base" align="center" wrap={false}>Find<br />ancestors</Text>
          </Stack>
        </Card>
        <Card theme="flat" spacing="xs" aria-pressed={false} onClick={pick}>…Explain<br />my DNA</Card>
        …Find records · Family story
      </Grid>
    </Stack>
    <Stack as="section" gap="md" aria-labelledby="results">
      …AI discoveries · <Link as="button" tone="inherit" onClick={viewAll}>View all</Link>
      <ChipGroup aria-label="Kind of discovery" value={kind} onValueChange={setKind} options={[
        { value: "records", label: "Records" }, { value: "dna", label: "DNA" }, { value: "photos", label: "Photos" }, { value: "stories", label: "Stories" },
      ]} />
      <Card theme="shadow">
        <Stack as="ul" gap="md" aria-labelledby="results">
          <Stack as="li" direction="row" gap="sm" align="start">
            <Box width={72}><Image src={khoiRecord.photo} alt="" ratio={1} radius="lg" /></Box>
            <Stack gap="2xs" width="fill">
              <Text textStyle="Body/Base/Bold">Khôi Nguyễn</Text>
              <Text textStyle="Body/Small/Regular" tone="base">Hội An, Quảng Nam</Text>
              <Text textStyle="Caption/Medium" tone="accent-base">Matched to Khôi Nguyễn</Text>
              <Badge size="sm" theme="accent" background="subtle">Add to tree</Badge>
            </Stack>
            <Stack width={24} height={24} align="center" justify="center">
              <Menu align="end" trigger={<IconButton appearance="flat" level="secondary" size="sm" icon="icon-dots-vertical-line" aria-label="More for Khôi Nguyễn" />}
                items={[{ id: "add", label: "Add to tree", icon: "icon-plus-circle-line", onSelect: add }, { id: "record", label: "Open record", … }, { id: "hide", label: "Not a match", … }]} />
            </Stack>
          </Stack>
          …Hoa Trần · Bảo Nguyễn
        </Stack>
      </Card>
    </Stack>
  </Stack>
</AppShell>`,
  },
  {
    title: "E7 · Big number",
    description: "One huge value on a Solid band: a Background/Accent/Solid band from the top edge with a week strip (today on White), a White-Overlay Segmented for the view (dark labels on a light track, as Figma draws it), one Display-Extra number and three tiles. A Surface sheet carries the day's updates: a Segmented and a Pale measurement card with range, last reading and status. Shell: AppShell/Mobile · Phone · Top=Band-Sheet · Bottom=Floating. Fits: Health / Nutrition, Fitness, Energy, Budget.",
    render: () => <BigNumberPhone />,
    code: `<PlatformPhone canvas="surface" statusBar="light" homeIndicator="dark">
  <AppShell
    mobileTop="band-sheet"
    band="accent"
    // Figma Top-bar=false: only the status-bar inset; the title is the screen's h1 for screen readers.
    topNavigation={<TopNavigation topBar={false} title="Today, Wednesday 16" />}
    hero={(
      <Box style={{ paddingBottom: "var(--zen-spacing-padding-xsmall)" }}>
        <Stack gap="lg" paddingY="md" align="center">
          <Stack as="ol" direction="row" justify="between" gap="none" width="fill" aria-label="This week">
            <Box as="li" width={56} paddingY="xs" radius="md">
              <Stack gap="none" align="center">
                <Text as="span" textStyle="Caption/Medium" tone="on-accent">Mon</Text>
                <Text as="span" textStyle="Heading/4" tone="on-accent">14</Text>
              </Stack>
            </Box>
            …Tue 15
            <Box as="li" width={56} paddingY="xs" radius="md" surface="surface" aria-current="date">
              …Wed (tone="base") · 16 (tone="strongest")
            </Box>
            …Thu 17 · Fri 18
          </Stack>
          <Segmented level="white-overlay" aria-label="View" value={view} onValueChange={setView}
            options={[{ id: "nutrition", label: "Nutrition" }, { id: "activity", label: "Activity" }]} />
          <Stack gap="2xs" align="center">
            <Text textStyle="Display-Extra/1" tone="on-accent" tabularNumbers>1,644</Text>
            <Text textStyle="Body/Base/Medium" tone="on-accent">Calories eaten today</Text>
          </Stack>
          <Stack direction="row" gap="sm" fillChildren width="fill">
            <MetricCard type="tile" theme="flat" size="sm" icon={false} label="Protein" value="32%" />
            <MetricCard type="tile" theme="flat" size="sm" icon={false} label="Carbs" value="44%" />
            <MetricCard type="tile" theme="flat" size="sm" icon={false} label="Fat" value="28%" />
          </Stack>
        </Stack>
      </Box>
    )}
    bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Nutrition" value={root} onValueChange={setRoot} showLabels items={[
      { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
      …Log · Alerts · Profile
    ]} action={{ icon: "icon-plus-line", label: "Log a meal", onClick: logMeal }} />}
  >
    <Stack as="section" gap="md" aria-labelledby="updates">
      <Heading level={2} id="updates" textStyle="Heading/4">Daily updates</Heading>
      <Segmented fullWidth aria-label="Daily updates" value={update} onValueChange={setUpdate}
        options={[{ id: "meals", label: "Meals" }, { id: "advice", label: "Advice" }, { id: "water", label: "Water" }]} />
      <Card theme="pale">
        <Stack gap="sm">
          <Stack direction="row" justify="between" align="center" gap="sm">
            <Stack gap="none" width="fill">
              <Heading level={3} textStyle="Body/Base/Bold">Improve melatonin</Heading>
              <Text textStyle="Body/Small/Regular" tone="base">Sleep hormone</Text>
            </Stack>
            <Text textStyle="Heading/2" wrap={false} tabularNumbers>3 pg/ml</Text>
          </Stack>
          <ProgressBar theme="accent" value={20} aria-label="Improve melatonin: 3 pg/ml of 200 pg/ml" />
          <Stack direction="row" justify="between" gap="sm">…0 · 200 pg/ml (Caption/Regular)</Stack>
          <Stack direction="row" justify="between" align="center" gap="sm">
            <Text textStyle="Caption/Regular" tone="base">Last measured today at 7:30 pm</Text>
            <Badge size="sm" theme="teal" background="subtle">Normal</Badge>
          </Stack>
        </Stack>
      </Card>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
];

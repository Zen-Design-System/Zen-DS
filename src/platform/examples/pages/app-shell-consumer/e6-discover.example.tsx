import { useId, useRef, useState, type RefObject } from "react";
import {
  AppShell, Badge, BottomNavigation, Box, Card, ChipGroup, Grid, Heading, Icon, IconButton, Image, InputLeadingTrailing, Link, Menu,
  Search, Stack, Text, TopNavigation, useToast, type BottomNavigationItem, type IconName,
} from "@zen-ds/react";
import { people, photos } from "../../data";

/* Figma ◇ Master-Layout · Example › E · Consumer apps › E6 · Discover (15991:9955): one Pattern/AppShell/Mobile,
   Top=Bar, Transparent with a large title · Bottom=Floating with the AI action. The copy and variants are the Figma
   screen's. E5 and E6 are two roots of one family-history app (the same people, the same bottom bar). */

const familyRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-02-line", selectedIcon: "icon-home-02-solid" },
  { id: "tree", label: "Tree", icon: "icon-git-branch-01-line", selectedIcon: "icon-git-branch-01-solid" },
  { id: "records", label: "Records", icon: "icon-folder-line", selectedIcon: "icon-folder-solid" },
  { id: "explore", label: "Explore", icon: "icon-marker-pin-01-line", selectedIcon: "icon-marker-pin-01-solid" },
];
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
const { smile, window: byTheWindow, blazer } = photos.portraits;
const discoveries: Discovery[] = [
  /* Figma E6's three records, with the 72 photos the Figma results hold. */
  { id: "khoi-1968", kind: "records", name: "Khôi Nguyễn", place: "Hội An, Quảng Nam", match: "Matched to Khôi Nguyễn", photo: smile.src },
  { id: "hoa-1951", kind: "records", name: "Hoa Trần", place: "Huế, Thừa Thiên", match: "Matched to Hoa Trần", photo: byTheWindow.src },
  { id: "bao-1959", kind: "records", name: "Bảo Nguyễn", place: "Nam Định", match: "Matched to Bảo Nguyễn", photo: blazer.src },
  { id: "minh-dna", kind: "dna", name: "Minh Trần", place: "Đà Nẵng · 212 cM shared", match: "Matched to Hoa Trần", photo: people.finn.photo },
  { id: "old-town", kind: "photos", name: "Hội An old town, 1968", place: "Hội An, Quảng Nam", match: "Matched to Khôi Nguyễn", photo: photos.site[2].src },
  { id: "cafe", kind: "stories", name: "The family café", place: "Huế, Thừa Thiên", match: "Matched to Hoa Trần", photo: photos.site[5].src },
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

/** A family-history app's Discover root: search, four intents, then the AI's discoveries by kind. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function Discover({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("explore");
  const [intent, setIntent] = useState("ancestors");
  const [kind, setKind] = useState<DiscoveryKind>("records");
  const [query, setQuery] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const intentsId = useId();
  const resultsId = useId();
  // A row hidden with “Not a match” takes its ⋮ button with it: focus moves to the list's heading instead of the page.
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const needle = query.trim().toLowerCase();
  const shown = discoveries.filter((item) => item.kind === kind && !hidden.includes(item.id)
    && (!needle || `${item.name} ${item.place}`.toLowerCase().includes(needle)));
  return (
    // Bar + Floating on Canvas/Default: a Heading/1 large title with History beside it, a Surface search with voice,
    // four intent tiles (the chosen one Brand Subtle: Pale fades into the grey Canvas), then the AI results under
    // single-choice Chips in one Shadow card. The floating bar's action is the AI.
    <AppShell
      topNavigation={<TopNavigation scrollRef={scrollRef} type="transparent" largeTitle="Discover"
        trailing={[{ icon: "icon-clock-rewind-line", label: "Search history", onClick: () => toast({ title: "Recent searches", children: "Khôi Nguyễn · Hội An 1968 · Nam Định land records" }) }]} />}
      bottomNavigation={<BottomNavigation type="floating" aria-label="Family history" value={root} onValueChange={setRoot} showLabels items={familyRoots}
        action={{ icon: "icon-stars-01-line", label: "Ask AI", onClick: () => toast({ title: "Ask AI", children: "Ask about a person, a place or a record." }) }} />}
    >
      <Stack gap="xl">
        <Search aria-label="Search ancestors or places" placeholder="Search ancestors or places" value={query} onValueChange={setQuery}
          trailing={<InputLeadingTrailing icon="icon-microphone-line" aria-label="Search by voice" onClick={() => toast({ title: "Listening…", children: "Say a name or a place." })} />} />
        <Stack as="section" gap="sm" aria-labelledby={intentsId}>
          <Heading level={2} id={intentsId} textStyle="Heading/4">What to explore?</Heading>
          {/* Figma's Intent tiles: four in the row, 8px inside (Card Spacing=XSmall). */}
          <Grid columns={4} gap="xs" align="stretch" role="group" aria-labelledby={intentsId}>
            {intents.map((item) => {
              const chosen = intent === item.id;
              return (
                <Card key={item.id} theme={chosen ? "subtle" : "default"} color={chosen ? "brand" : "neutral"} spacing="xs" aria-pressed={chosen} onClick={() => setIntent(item.id)}>
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
            <Heading ref={resultsRef} tabIndex={-1} level={2} id={resultsId} textStyle="Heading/4">AI discoveries</Heading>
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
                    onHide={() => { setHidden((list) => [...list, item.id]); setTimeout(() => resultsRef.current?.focus()); toast({ title: "Hidden from discoveries", children: `${item.name} · ${item.place}`, action: { label: "Undo", onClick: () => setHidden((list) => list.filter((id) => id !== item.id)) } }); }} />
                ))}
              </Stack>
            ) : (
              <Text tone="base">{needle ? `No discoveries match “${query.trim()}”.` : "Nothing new here yet. The AI checks new records every night."}</Text>
            )}
          </Card>
        </Stack>
      </Stack>
    </AppShell>
  );
}

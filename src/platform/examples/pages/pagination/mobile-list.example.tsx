import { useRef, useState, type RefObject } from "react";
import {
  AppShell, BottomNavigation, DockIcon, List, ListItem, Pagination, Stack, Text, TopNavigation, plural, useToast,
  type BottomNavigationItem, type DockIconTheme,
} from "@zen-ds/react";

const pageOf = <T,>(items: T[], pageNo: number, size: number) => items.slice((pageNo - 1) * size, pageNo * size);

/** Hanoi Book Fair 2026 exhibitors as the fair's app lists them: A–Z, 14 a page (a phone list longer than its screen). */
type Genre = "fiction" | "kids" | "comics" | "nonfiction" | "education";
const genres: Record<Genre, { label: string; theme: DockIconTheme }> = {
  fiction: { label: "Fiction", theme: "purple" }, kids: { label: "Children's books", theme: "yellow" }, comics: { label: "Comics", theme: "red" },
  nonfiction: { label: "Non-fiction", theme: "blue" }, education: { label: "Education", theme: "green" },
};
const exhibitorList: Array<[string, Genre]> = [
  ["An Nhiên Books", "fiction"], ["Bamboo Press", "nonfiction"], ["Blue Lantern Comics", "comics"], ["Bông Sen Kids", "kids"],
  ["Cloud Nine Readers", "kids"], ["Cỏ May Editions", "nonfiction"], ["Dragonfly Picture Books", "kids"], ["Firefly Classics", "fiction"],
  ["Gió Mùa Publishing", "education"], ["Green Tea Comics", "comics"], ["Hạt Dẻ Kids", "kids"], ["Harbour Lights Press", "nonfiction"],
  ["Hồ Tây Editions", "fiction"], ["Ink & Rain", "fiction"], ["Jade River Books", "fiction"], ["Kite String Kids", "kids"],
  ["Lá Xanh Readers", "kids"], ["Lotus Garden Press", "nonfiction"], ["Mây Trắng Publishing", "education"], ["Mekong Delta Books", "fiction"],
  ["Moonrise Comics", "comics"], ["Night Market Press", "nonfiction"], ["Northwind Editions", "nonfiction"], ["Ốc Nhỏ Kids", "kids"],
  ["Paper Crane Books", "fiction"], ["Phố Cổ Press", "nonfiction"], ["Pine Hill Publishing", "education"], ["Quill & Lamp", "fiction"],
  ["Rice Paper Editions", "nonfiction"], ["Riverbend Readers", "kids"], ["Sao Mai Books", "fiction"], ["Sông Hồng Publishing", "education"],
  ["Starfruit Comics", "comics"], ["Sương Sớm Press", "nonfiction"], ["Tea House Books", "fiction"], ["Tổ Chim Kids", "kids"],
  ["Tre Xanh Editions", "nonfiction"], ["Turtle Tower Press", "nonfiction"], ["Umbrella Readers", "kids"], ["Vàng Son Publishing", "education"],
  ["Velvet Moth Books", "fiction"], ["Violet Hour Press", "nonfiction"], ["Wandering Heron", "fiction"], ["Whale Song Kids", "kids"],
  ["Xanh Lơ Comics", "comics"], ["Yellow Door Books", "fiction"], ["Yên Bình Readers", "kids"], ["Zephyr Editions", "nonfiction"],
];
const exhibitors = exhibitorList.sort(([a], [b]) => a.localeCompare(b, "vi"))
  .map(([name, genre], index) => ({ id: `exhibitor-${index}`, name, genre: genres[genre], hall: "ABC"[index % 3], stand: (index * 7) % 40 + 1 }));
const EXHIBITORS_PER_PAGE = 14;

/** The fair app's roots, in its bottom bar: a selected root shows its solid icon. */
const fairRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-03-line", selectedIcon: "icon-home-03-solid" },
  { id: "exhibitors", label: "Exhibitors", icon: "icon-book-open-line", selectedIcon: "icon-book-open-solid" },
  { id: "schedule", label: "Schedule", icon: "icon-calendar-line", selectedIcon: "icon-calendar-solid" },
  { id: "tickets", label: "Tickets", icon: "icon-ticket-01-line", selectedIcon: "icon-ticket-01-solid" },
];

/** Phone: numbered pages at the end of a list longer than the screen; a page change scrolls back to the top, so the
    large title opens again over the first row, and focus goes up with it to the count line. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function MobileExhibitors({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [pageNo, setPageNo] = useState(1);
  const shellRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLParagraphElement>(null);
  const pageCount = Math.ceil(exhibitors.length / EXHIBITORS_PER_PAGE);
  const first = (pageNo - 1) * EXHIBITORS_PER_PAGE + 1;
  const last = Math.min(exhibitors.length, pageNo * EXHIBITORS_PER_PAGE);
  const turn = (next: number) => {
    setPageNo(next);
    // Back to the top of the screen: its scroller, or the page in your app ("window").
    if (scrollRef === "window") shellRef.current?.scrollIntoView();
    else scrollRef.current?.scrollTo({ top: 0 });
    // The pages scrolled out of view: focus goes up with the screen, so a screen reader reads on into the new rows.
    countRef.current?.focus({ preventScroll: true });
  };
  return (
    // The Exhibitors root of the fair's app: the large title, the list and its pages, and the app's roots in the bottom
    // bar. The Body pads the screen, so the rows (no side padding of their own) line up with the count.
    <AppShell ref={shellRef}
      topNavigation={<TopNavigation title="Exhibitors" largeTitle="Exhibitors" largeTitleSubheading="Hanoi Book Fair 2026 · Halls A–C" scrollRef={scrollRef} />}
      bottomNavigation={<BottomNavigation aria-label="Hanoi Book Fair" showLabels items={fairRoots} value="exhibitors"
        onValueChange={(id) => { if (id !== "exhibitors") toast({ title: `${fairRoots.find((item) => item.id === id)?.label ?? id} isn't part of this example`, children: "This screen shows the pages." }); }} />}
    >
      <Stack gap="xs">
        <Text ref={countRef} tabIndex={-1} role="status" textStyle="Body/Small/Regular" tone="base">{`${first}–${last} of ${plural(exhibitors.length, "exhibitor")}`}</Text>
        <List aria-label="Exhibitors">
          {pageOf(exhibitors, pageNo, EXHIBITORS_PER_PAGE).map((exhibitor) => (
            <ListItem key={exhibitor.id} leading={<DockIcon icon="icon-book-open-line" theme={exhibitor.genre.theme} background="subtle" size="md" />}
              title={exhibitor.name} caption={`Hall ${exhibitor.hall} · Stand ${exhibitor.hall}${exhibitor.stand} · ${exhibitor.genre.label}`}
              onClick={() => toast({ title: exhibitor.name, children: `Hall ${exhibitor.hall}, stand ${exhibitor.hall}${exhibitor.stand} · ${exhibitor.genre.label}` })} />
          ))}
        </List>
      </Stack>
      <Stack direction="row" justify="center">
        <Pagination size="sm" aria-label="Exhibitor pages" page={pageNo} onPageChange={turn} pageCount={pageCount} />
      </Stack>
    </AppShell>
  );
}

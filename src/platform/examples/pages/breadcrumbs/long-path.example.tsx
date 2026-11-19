import { useState } from "react";
import { BreadcrumbItem, Breadcrumbs, Card, DockIcon, Heading, List, ListItem, Stack, Text, useZen } from "@zen-ds/react";
import { daysFromToday, formatRelative, people, type PersonId } from "../../data";

type Doc = { id: string; title: string; parent: string | null; updated: Date; owner: PersonId };
const handbook: Doc[] = [
  { id: "handbook", title: "Handbook", parent: null, updated: daysFromToday(-1), owner: "minhAnh" },
  { id: "how-we-work", title: "How we work", parent: "handbook", updated: daysFromToday(-1), owner: "alex" },
  { id: "people-ops", title: "People", parent: "handbook", updated: daysFromToday(-2), owner: "minhAnh" },
  { id: "design", title: "Design", parent: "how-we-work", updated: daysFromToday(-1), owner: "alex" },
  { id: "engineering", title: "Engineering", parent: "how-we-work", updated: daysFromToday(-9), owner: "finn" },
  { id: "reviews", title: "Reviews", parent: "design", updated: daysFromToday(-1), owner: "alex" },
  { id: "file-naming", title: "File naming", parent: "design", updated: daysFromToday(-40), owner: "chi" },
  { id: "y2026", title: "2026", parent: "reviews", updated: daysFromToday(-1), owner: "alex" },
  { id: "y2025", title: "2025", parent: "reviews", updated: daysFromToday(-240), owner: "alex" },
  { id: "q3", title: "Q3 critique", parent: "y2026", updated: daysFromToday(-1, 17, 20), owner: "alex" },
  { id: "q2", title: "Q2 critique", parent: "y2026", updated: daysFromToday(-92), owner: "chi" },
];
// What the Q3 critique page says: findings from the studio’s own projects, each with an owner.
const q3Findings = "Three findings came out of the Q3 critiques. Lumen Bank's transfer flow needs a review step before people confirm (Ava Chen). The Phin & Co points history reads better grouped by month (Chi Tran). The Saola Outdoor moodboard leans on product photos rather than illustration (Gia Pham).";
/** "Yesterday at 5:20 pm" reads "updated yesterday at 5:20 pm" mid-sentence; dates and weekdays keep their capital. */
const lower = (text: string) => (/^(Yesterday|Just now)/.test(text) ? `${text[0].toLowerCase()}${text.slice(1)}` : text);
const docPath = (id: string): Doc[] => { const d = handbook.find((x) => x.id === id); return d ? [...(d.parent ? docPath(d.parent) : []), d] : []; };

export default function LongPath() {
  const [docId, setDocId] = useState("q3");
  const phone = useZen()?.breakpoint === "mobile";
  const path = docPath(docId);
  const doc = path[path.length - 1];
  const children = handbook.filter((d) => d.parent === docId);

  return (
    <Stack><Card theme="default" spacing="md" width="fill" maxWidth={480} alignSelf="center">
      <Stack gap="md">
        {/* Six levels: the first and the last two stay, "…" opens the rest (phone: the first and the current page). */}
        {/* The trail as BreadcrumbItem children (Figma’s Item-List slot); an items array works the same. */}
        <Breadcrumbs key={docId} maxItems={phone ? 2 : 3} onNavigate={(item, event) => { event.preventDefault(); setDocId(item.id); }}>
          {path.map((d) => <BreadcrumbItem key={d.id} item={{ id: d.id, label: d.title, href: `/handbook/${d.id}`, icon: d.parent === null ? "icon-book-open-line" : undefined }} />)}
        </Breadcrumbs>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">{doc.title}</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">{`Updated ${lower(formatRelative(doc.updated))} by ${people[doc.owner].name}`}</Text>
        </Stack>
        {children.length ? (
          <List aria-label={`Pages in ${doc.title}`}>
            {children.map((d) => (
              <ListItem key={d.id} title={d.title} caption={`Updated ${lower(formatRelative(d.updated))}`}
                leading={<DockIcon icon="icon-file-doc-line" theme="neutral" background="subtle" size="medium" />} onClick={() => setDocId(d.id)} />
            ))}
          </List>
        ) : (
          <Text>{q3Findings}</Text>
        )}
      </Stack>
    </Card></Stack>
  );
}

import { useId, useState } from "react";
import { Avatar, Heading, List, ListBox, ListItem, Pagination, SkeletonShape, SkeletonText } from "@zen-ds/react";
import { TODAY, formatRelative, initials, people, type Person, type PersonId } from "../../data";

const pageOf = <T,>(items: T[], pageNo: number, size: number) => items.slice((pageNo - 1) * size, pageNo * size);
/** The page that holds row `index` (0-based) at `size` rows a page: a new page size keeps the reader's place. */
const pageHolding = (index: number, size: number) => Math.floor(index / size) + 1;

function PersonAvatar({ person }: { person: Person }) {
  return person.photo
    ? <Avatar size="md" theme="photo" src={person.photo} alt="" />
    : <Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>;
}

/** The workspace activity log: one event every 43 minutes, newest first. */
type LogEvent = { id: string; person: PersonId; action: string; at: Date };
const logPeople: PersonId[] = ["alex", "bao", "chi", "duy", "mai", "minhAnh", "finn", "hana", "gia", "khoa"];
const logActions = [
  "Signed in on a new device", "Exported the Q3 report", "Invited 2 people", "Set up two-step sign-in", "Marked an invoice paid",
  "Archived a project", "Changed the billing email", "Shared a client file", "Removed a guest", "Downloaded 12 files",
  "Created Brand refresh", "Updated the leave policy", "Changed a member's role", "Reset their password", "Renamed a project",
];
const activityLog: LogEvent[] = Array.from({ length: 486 }, (_, i) => ({
  id: `event-${i}`, person: logPeople[(i * 3) % logPeople.length], action: logActions[(i * 7 + 2) % logActions.length],
  at: new Date(TODAY.getTime() - (i * 43 + 4) * 60 * 1000),
}));

/** Manually theme: the reader types a page size; each page loads from the server, so rows show Skeletons meanwhile. */
export default function ActivityLog() {
  const titleId = useId();
  const [pageNo, setPageNo] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  // Requests still out: the rows stay Skeletons until the last page asked for has loaded.
  const [requests, setRequests] = useState(0);
  const loading = requests > 0;
  const load = () => {
    setRequests((count) => count + 1);
    setTimeout(() => setRequests((count) => count - 1), 600);
  };
  const turn = (next: number) => { setPageNo(next); load(); };
  // Keep the first event on screen when the size changes; cap it at 100 rows a page.
  const resize = (size: number) => { const next = Math.min(size, 100); setPageNo(pageHolding((pageNo - 1) * pageSize, next)); setPageSize(next); load(); };
  const events = pageOf(activityLog, pageNo, pageSize);
  return (
    // A ListBox: the title in its Header-Slot, the events in its Body-Slot, the pages in its Footer-Slot.
    <ListBox as="section" aria-labelledby={titleId}
      header={<Heading level={4} id={titleId} textStyle="Heading/Subheading">Workspace activity</Heading>}
      footer={<Pagination theme="manually" aria-label="Activity pages" page={pageNo} onPageChange={turn}
        total={activityLog.length} pageSize={pageSize} onPageSizeChange={resize} />}>
      <List aria-label="Activity" aria-busy={loading}>
        {loading
          ? events.map((event) => <ListItem key={event.id} leading={<SkeletonShape shape="round" size="md" />} title={<SkeletonText lines={1} />} caption={<SkeletonText lines={1} />} />)
          : events.map((event) => (
            <ListItem key={event.id} leading={<PersonAvatar person={people[event.person]} />} title={event.action}
              caption={`${people[event.person].name} · ${formatRelative(event.at)}`} />
          ))}
      </List>
    </ListBox>
  );
}

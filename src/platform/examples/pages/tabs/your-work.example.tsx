import { useId, useRef, useState, type ReactNode } from "react";
import { Avatar, Card, DockIcon, EmptyState, Heading, IconButton, List, ListItem, Stack, TabItem, TabPanel, Tabs, useToast } from "@zen-ds/react";
import { daysFromToday, formatDue, initials, people, projectById, type PersonId, type Project } from "../../data";

// Short work-item names keep one line even in a narrow card; people rows put the message in the caption.
type WorkItem = { id: string; title: string; project: string; caption: string; person?: PersonId };
const assigned: WorkItem[] = [
  { id: "w1", title: "Accessibility audit", project: "lumen-banking", caption: `LUM-091 · ${formatDue(daysFromToday(0))}` },
  { id: "w2", title: "Rewards icon set", project: "phin-loyalty", caption: `PHIN-226 · ${formatDue(daysFromToday(1))}` },
  { id: "w3", title: "Kickoff deck", project: "saola-brand", caption: `SAO-006 · ${formatDue(daysFromToday(4))}` },
];
const reviewRequests: WorkItem[] = [
  { id: "r1", title: "Points history", project: "phin-loyalty", caption: "Chi Tran · 13 minutes ago", person: "chi" },
  { id: "r2", title: "Metric card guide", project: "zen-ds", caption: "Chi Tran · Yesterday at 5:20 pm", person: "chi" },
];
const mentions: WorkItem[] = [
  { id: "m1", title: "Finn Walsh", project: "lumen-banking", caption: "Can we reuse the transfer stepper? · 9:40 am", person: "finn" },
];
const projectIcon = (id: string) => { const p: Project = projectById(id); return <DockIcon icon={p.icon} theme={p.theme} background="subtle" size="medium" />; };
const avatar = (id: PersonId) => {
  const p = people[id];
  return p.photo ? <Avatar size="medium" theme="photo" src={p.photo} alt="" /> : <Avatar size="medium" theme={p.theme} alt="">{initials(p.name)}</Avatar>;
};

export default function YourWork() {
  // One idPrefix per rendered example, so tab and panel ids stay unique when the page shows it twice.
  const prefix = `work-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const { toast } = useToast();
  const [tab, setTab] = useState("reviews");
  const [reviews, setReviews] = useState(reviewRequests);
  // Where focus goes once a review leaves: the next review's Approve, or the panel itself.
  const panelRef = useRef<HTMLDivElement>(null);
  const approveRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const approve = (item: WorkItem) => {
    const before = reviews;
    const index = reviews.indexOf(item);
    const rest = reviews.filter((r) => r.id !== item.id);
    setReviews((list) => list.filter((r) => r.id !== item.id));
    toast({ title: "Review approved", action: { label: "Undo", onClick: () => setReviews(before) } });
    // The row leaves with its button: focus moves to the next review's Approve, or to the panel once it is empty.
    const next = rest[Math.min(index, rest.length - 1)];
    setTimeout(() => (next ? approveRefs.current[next.id] : panelRef.current)?.focus());
  };
  const rows = (items: WorkItem[], label: string, trailing?: (item: WorkItem) => ReactNode) => (
    <List aria-label={label}>
      {items.map((item) => <ListItem key={item.id} title={item.title} caption={item.caption} leading={item.person && !trailing ? avatar(item.person) : projectIcon(item.project)} trailing={trailing?.(item)} />)}
    </List>
  );

  return (
    <Stack><Card theme="default" width="fill" maxWidth={480} alignSelf="center">
      <Stack gap="md">
        <Heading level={4} textStyle="Heading/Subheading">Your work</Heading>
        {/* The tabs as TabItem children (Figma's Item-List slot); an items array works the same. */}
        <Tabs idPrefix={prefix} variant="subtle" aria-label="Your work" value={tab} onValueChange={setTab}>
          <TabItem value="assigned" label="Assigned" badge={assigned.length} />
          {/* The counter leaves with the last review instead of showing 0. */}
          <TabItem value="reviews" label="Reviews" badge={reviews.length || undefined} />
          <TabItem value="mentions" label="Mentions" badge={mentions.length} />
        </Tabs>
        <TabPanel idPrefix={prefix} id="assigned" hidden={tab !== "assigned"}>{rows(assigned, "Assigned to you")}</TabPanel>
        <TabPanel ref={panelRef} idPrefix={prefix} id="reviews" hidden={tab !== "reviews"}>
          {reviews.length
            ? rows(reviews, "Reviews waiting for you", (item) => (
              <IconButton ref={(button) => { approveRefs.current[item.id] = button; }} level="tertiary" icon="icon-check-line" aria-label={`Approve ${item.title}`} onClick={() => approve(item)} />
            ))
            : <EmptyState headingLevel={5} size="sm" icon="icon-check-done-line" title="No reviews waiting">Review requests from your team show up here.</EmptyState>}
        </TabPanel>
        <TabPanel idPrefix={prefix} id="mentions" hidden={tab !== "mentions"}>{rows(mentions, "Mentions")}</TabPanel>
      </Stack>
    </Card></Stack>
  );
}

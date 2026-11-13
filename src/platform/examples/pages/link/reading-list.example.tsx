import { useId, useRef, useState } from "react";
import { Box, Chip, DockIcon, EmptyState, Heading, Link, List, ListBox, ListItem, Search, Stack, Text, plural, type DockIconTheme, type IconName } from "@zen-ds/react";
import { daysFromToday, formatRelative, people, type PersonId } from "../../data";

type Topic = "Accessibility" | "Navigation" | "Forms";
type Article = { id: string; title: string; url: string; source: string; topic: Topic; addedBy: PersonId; added: Date; note: string };

const topics: Topic[] = ["Accessibility", "Navigation", "Forms"];
const topicLook: Record<Topic, { icon: IconName; theme: DockIconTheme }> = {
  Accessibility: { icon: "icon-eye-line", theme: "violet" },
  Navigation: { icon: "icon-compass-line", theme: "blue" },
  Forms: { icon: "icon-layout-alt-01-line", theme: "teal" },
};
const articles: Article[] = [
  { id: "target-size", title: "Understanding Success Criterion 2.5.8: Target Size (Minimum)", url: "https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html", source: "w3.org", topic: "Accessibility", addedBy: "ava", added: daysFromToday(-2, 15, 10), note: "Why every tap target in the Lumen Bank app needs 24 × 24 px" },
  { id: "invisible", title: "Invisible content just for screen reader users", url: "https://webaim.org/techniques/css/invisiblecontent/", source: "webaim.org", topic: "Accessibility", addedBy: "bao", added: daysFromToday(-9, 11, 0), note: "The clipping technique behind our VisuallyHidden component" },
  { id: "menu-button", title: "Menu Button Pattern", url: "https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/", source: "w3.org", topic: "Navigation", addedBy: "finn", added: daysFromToday(-14, 10, 20), note: "The keyboard model every ⋯ menu in Zen follows" },
  { id: "new-tabs", title: "Opening Links in New Browser Windows and Tabs", url: "https://www.nngroup.com/articles/new-browser-windows-and-tabs/", source: "nngroup.com", topic: "Navigation", addedBy: "ava", added: daysFromToday(-21, 16, 30), note: "When a new tab helps, and why we say so in the link" },
  { id: "menus", title: "Inclusive Components: Menus & Menu Buttons", url: "https://inclusive-components.design/menus-menu-buttons/", source: "inclusive-components.design", topic: "Navigation", addedBy: "chi", added: daysFromToday(-30, 9, 45), note: "Navigation lists versus action menus, with code" },
  { id: "forms", title: "Website Forms Usability: Top 10 Recommendations", url: "https://www.nngroup.com/articles/web-form-design/", source: "nngroup.com", topic: "Forms", addedBy: "gia", added: daysFromToday(-40, 14, 0), note: "Our checklist before a form goes to client review" },
  { id: "confirm", title: "Confirmation Dialogs Can Prevent User Errors (If Not Overused)", url: "https://www.nngroup.com/articles/confirmation-dialog/", source: "nngroup.com", topic: "Forms", addedBy: "alex", added: daysFromToday(-55, 10, 30), note: "When to ask first and when Undo is kinder" },
];

export default function ReadingList() {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const headingId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const q = query.trim().toLowerCase();
  const rows = articles.filter((article) => (!topic || article.topic === topic) && (!q || `${article.title} ${article.source} ${article.note}`.toLowerCase().includes(q)));
  // Clear filters leaves with the empty state, so focus moves to the search field, which stays.
  const clear = () => {
    setQuery("");
    setTopic(null);
    setTimeout(() => searchRef.current?.focus());
  };
  return (
    <Stack as="section" gap="md" aria-labelledby={headingId}>
      <Stack gap="xs">
        <Heading level={4} id={headingId} textStyle="Heading/4">Research library</Heading>
        <Text textStyle="Body/Small/Regular" tone="base">Articles the design team keeps coming back to. Each opens on its own site, in a new tab.</Text>
      </Stack>
      <Stack direction="row" gap="xs" align="center" wrap>
        <Box width="fill" minWidth={220} maxWidth={240}><Search ref={searchRef} placeholder="Search articles" aria-label="Search articles" value={query} onValueChange={setQuery} /></Box>
        <Chip variant="advanced" dropdown selected={topic !== null} popoverLabel="Topic"
          popoverItems={topics.map((option) => ({ id: option, label: option, selected: option === topic }))}
          onPopoverSelect={(item) => setTopic(item.id === topic ? null : (item.id as Topic))} onClearSelection={() => setTopic(null)}>
          {topic ?? "Topic"}
        </Chip>
        <Text as="span" role="status" textStyle="Body/Small/Regular" tone="base">{plural(rows.length, "article")}</Text>
      </Stack>
      {/* A static list on the stage: a ListBox that stays in place when a filter empties it. Its Body-Slot insets the
          rows (they have none of their own) and the empty state alike. */}
      <ListBox>
        {rows.length ? (
          <List aria-labelledby={headingId}>
            {rows.map((article) => (
              // The title is the link (visited: articles you've opened turn Visited) and wraps in full, so the row composes
              // its own lines: the title, the note, then where it is from and who added it. The row itself is not clickable.
              <ListItem key={article.id} title={article.title}
                leading={<DockIcon icon={topicLook[article.topic].icon} theme={topicLook[article.topic].theme} background="subtle" />}>
                <Text as="span" textStyle="Body/Base/Bold"><Link href={article.url} external visited>{article.title}</Link></Text>
                <Text as="span" textStyle="Body/Small/Regular" tone="base">{article.note}</Text>
                <Text as="span" textStyle="Body/Small/Regular" tone="light">{`${article.source} · ${people[article.addedBy].name}, ${formatRelative(article.added)}`}</Text>
              </ListItem>
            ))}
          </List>
        ) : (
          <EmptyState size="sm" headingLevel={5} icon="icon-search-medium-line" title="No articles match" secondaryAction={{ label: "Clear filters", onClick: clear }}>
            Try another word or topic.
          </EmptyState>
        )}
      </ListBox>
    </Stack>
  );
}

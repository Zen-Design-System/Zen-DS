import { useRef, useState } from "react";
import { Accordion, EmptyState, Search, Stack, Text, plural } from "@zen-ds/react";
import { people } from "../../data";

/** The studio's internal help center. */
const helpArticles = [
  { id: "time", title: "How do I log time on a project?", body: "Open the project, choose Log time and pick the task. Time logged before Friday at 6:00 pm shows on that week's client report." },
  { id: "leave", title: "How do I request leave?", body: "Go to Time off, choose Request leave and pick your dates. Your team lead gets the request and usually answers within 2 working days." },
  { id: "assets", title: "Where are the studio's brand assets?", body: "Logos, fonts and slide templates live in Files › Studio brand. Design can edit them; everyone else can download." },
  { id: "share", title: "How do I share a file with a client?", body: "Open the file, choose Share and add the client's email. Clients can view and comment, but never see internal notes." },
  { id: "expenses", title: "Who approves my expenses?", body: `Your team lead approves claims up to $500 and ${people.mai.name} in Finance approves anything above. Approved claims are paid with your next salary.` },
  { id: "freelancer", title: "How do I invite a freelancer?", body: "Project leads invite freelancers from the project's People tab. Freelancers only see the projects they are invited to." },
  { id: "archive", title: "How do I archive a finished project?", body: "Once the last invoice is paid, the project lead chooses Archive in the project settings. Archived projects stay searchable for 7 years." },
  { id: "quiet", title: "How do I mute notifications after work?", body: "Turn on Quiet hours in Settings › Notifications. Zen holds everything except mentions from your own team until 8:00 am." },
];
/** The articles that hold every word of the query, in the title or the body. */
const matches = (query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return helpArticles.filter((article) => words.every((word) => `${article.title} ${article.body}`.toLowerCase().includes(word)));
};

/** Divider theme under a Search: one article open at a time, and the best match opens as you type. */
export default function HelpSearch() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState("");
  const results = matches(query);
  const search = (next: string) => {
    setQuery(next);
    setOpen(next.trim() ? (matches(next)[0]?.id ?? "") : "");
  };
  // Clear search leaves with the empty state, so focus goes back to the field, not to <body>.
  const clear = () => { search(""); searchRef.current?.focus(); };
  const count = plural(results.length, "article");
  return (
    <Stack gap="md">
      <Search ref={searchRef} placeholder="Search help articles" value={query} onValueChange={search} clearable />
      {/* The count labels the results under it: xs inside, md from the Search. */}
      <Stack gap="xs">
        <Text role="status" textStyle="Body/Small/Regular" tone="base">{query.trim() ? `${count} for “${query.trim()}”` : count}</Text>
        {results.length ? (
          <Stack gap="none">
            {results.map((article) => (
              <Accordion key={article.id} headingLevel={4} title={article.title}
                expanded={open === article.id} onExpandedChange={(next) => setOpen(next ? article.id : "")}>
                {article.body}
              </Accordion>
            ))}
          </Stack>
        ) : (
          <EmptyState size="sm" headingLevel={4} icon="icon-search-medium-line" title="No articles match"
            secondaryAction={{ label: "Clear search", onClick: clear }}>
            Try another word, or ask People Ops in the studio chat.
          </EmptyState>
        )}
      </Stack>
    </Stack>
  );
}

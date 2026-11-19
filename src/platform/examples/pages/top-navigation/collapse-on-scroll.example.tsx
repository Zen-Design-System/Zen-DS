import { useRef, useState, type RefObject } from "react";
import { AppShell, Avatar, Badge, BottomSheet, EmptyState, InputField, List, ListItem, Search, TopNavigation, useFormState } from "@zen-ds/react";
import { initials, peopleList, type Person } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. The row title already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const directory = [...peopleList].sort((a, b) => a.name.localeCompare(b.name));

/** The studio's People tab: the large title and the Search fold under the bar as the list scrolls. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function CollapseOnScroll({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState<string[]>([]);
  // Back to the top of the screen: the scroller passed as scrollRef, or the page itself in your app.
  const scrollToTop = () => {
    if (scrollRef === "window") shellRef.current?.scrollIntoView({ behavior: "smooth" });
    else scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };
  // The sheet is a form: Enter or Send invite submits, and a bad address keeps focus on the field with its error.
  const inviteForm = useFormState({
    initialValues: { email: "" },
    validate: (v) => ({ email: emailPattern.test(v.email.trim()) ? undefined : "Enter an email address, like name@dizai.studio" }),
    onSubmit: (v) => {
      setInvited((list) => [v.email.trim().toLowerCase(), ...list]);
      setInviting(false);
      scrollToTop();
    },
  });
  const openInvite = () => { inviteForm.reset({ email: "" }); setInviting(true); };
  const q = query.trim().toLowerCase();
  const shown = directory.filter((person) => `${person.name} ${person.role} ${person.team}`.toLowerCase().includes(q));
  const pending = invited.filter((address) => address.includes(q));

  return (
    <>
      {/* While folded, the Search waits as a top-right action: without an onClick of its own it scrolls back up and
          focuses the field as soon as the Search bar is back (no longer inert under the bar). */}
      <AppShell ref={shellRef}
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="People" largeTitle="People"
          trailing={[{ icon: "icon-user-plus-line", label: "Invite people", onClick: openInvite }]}
          controlBar={<Search ref={searchRef} shape="rounded" placeholder="Search people" aria-label="Search people" value={query} onValueChange={setQuery} />}
          searchAction={{ label: "Search people" }} />}>
        {shown.length || pending.length ? (
          // Static rows (nothing opens a person here) sit in the screen margin.
          <List aria-label="People">
            {pending.map((address) => (
              <ListItem key={address} title={address} caption="Invite sent" leading={<Avatar size="md" theme="neutral" background="subtle" alt="">{address[0].toUpperCase()}</Avatar>}
                trailing={<Badge theme="neutral" background="subtle">Invited</Badge>} />
            ))}
            {shown.map((person) => (
              <ListItem key={person.id} title={person.name} caption={`${person.role} · ${person.location}`} leading={<Avatar size="md" status={person.online} {...avatarOf(person)} />} />
            ))}
          </List>
        ) : (
          <EmptyState headingLevel={2} icon="icon-search-medium-line" title="No people match" secondaryAction={{ label: "Clear search", onClick: () => { setQuery(""); searchRef.current?.focus(); } }}>
            {`No name, role or team contains “${query.trim()}”.`}
          </EmptyState>
        )}
      </AppShell>
      <BottomSheet inline open={inviting} onOpenChange={setInviting} title="Invite people" onSubmit={inviteForm.handleSubmit}
        primaryAction={{ label: "Send invite" }} secondaryAction={{ label: "Cancel" }}>
        <InputField label="Email" type="email" size="lg" autoComplete="off" placeholder="name@dizai.studio" data-autofocus="" {...inviteForm.field("email")} />
      </BottomSheet>
    </>
  );
}

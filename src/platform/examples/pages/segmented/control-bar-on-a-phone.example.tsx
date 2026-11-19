import { useState, type RefObject } from "react";
import { AppShell, Avatar, DockIcon, List, ListItem, Segmented, TopNavigation, plural, type DockIconTheme, type IconName } from "@zen-ds/react";
import { initials, peopleList, type Person, type Team } from "../../data";

/** A person as Avatar props: their photo, or initials on their steady theme. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, children: initials(person.name) };
const teams: { name: Team; icon: IconName; theme: DockIconTheme }[] = [
  { name: "Design", icon: "icon-palette-line", theme: "pink" },
  { name: "Engineering", icon: "icon-code-02-line", theme: "blue" },
  { name: "Delivery", icon: "icon-rocket-line", theme: "orange" },
  { name: "Client Services", icon: "icon-briefcase-line", theme: "teal" },
  { name: "Operations", icon: "icon-settings-01-line", theme: "violet" },
];

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function ControlBarOnAPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const [view, setView] = useState("people");
  return (
    // The control bar stays pinned and moves up with the large title as the list scrolls under it.
    <AppShell topNavigation={
      <TopNavigation scrollRef={scrollRef} type="alt" title="Team" largeTitle="Team"
        controlBar={<Segmented fullWidth aria-label="Team view" value={view} onValueChange={setView} options={[
          { id: "people", label: "People" },
          { id: "teams", label: "Teams" },
        ]} />} />
    }>
      {/* Rows pad 0 at the sides: the screen margin lines their text up with the control bar. */}
      {view === "people" ? (
        <List aria-label="People">
          {peopleList.map((person) => (
            <ListItem key={person.id} title={person.name} caption={`${person.role} · ${person.location}`} leading={<Avatar size="md" {...avatarOf(person)} />} />
          ))}
        </List>
      ) : (
        <List aria-label="Teams">
          {teams.map((team) => {
            const members = peopleList.filter((person) => person.team === team.name);
            return (
              <ListItem key={team.name} title={team.name} caption={`${plural(members.length, "person", "people")} · ${members.map((person) => person.name.split(" ")[0]).join(", ")}`}
                leading={<DockIcon icon={team.icon} theme={team.theme} background="subtle" size="md" />} />
            );
          })}
        </List>
      )}
    </AppShell>
  );
}

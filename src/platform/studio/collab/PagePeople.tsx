import { AvatarStack } from "../../../components/Avatar";
import { hueOf } from "../shell/RoleMenu";
import { personName } from "./presenceModel";
import { usePresence } from "./presence";
import "./collab.css";

/**
 * The others on the open page of a shared project (GĐ 3, presence.ts), in the top bar beside the role as Figma shows its
 * collaborators: each person's initial in their own colour (RoleMenu hueOf), who edits named first. Nothing on a page
 * nobody else has open.
 */
export function PagePeople() {
  const { others } = usePresence();
  if (!others.length) return null;
  const people = [...others].sort((a, b) => Number(b.editing) - Number(a.editing));
  const said = people.map((person) => `${personName(person)} (${person.editing ? "editing" : "viewing"})`).join(", ");
  return (
    <span className="studio-page-people" role="group" aria-label={`On this page: ${said}`} title={said}>
      <AvatarStack size="xs" max={4} showMore items={people.map((person) => ({ theme: hueOf(person.email), alt: personName(person), children: personName(person) }))} />
    </span>
  );
}

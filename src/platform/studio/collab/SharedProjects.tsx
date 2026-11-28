import { useEffect, useRef } from "react";
import { Badge } from "../../../components/Badge";
import { Card } from "../../../components/Card";
import { Heading, Text } from "../../../components/Text";
import { openProjectHome } from "../project/activeProject";
import { ACCESS_LABELS } from "./collabModel";
import { useCollab } from "./collabStore";
import "./collab.css";

/*
 * The Studio home's "Shared with you" (GĐ 1): the projects others shared with the signed-in person, with their role and
 * who shared them. A share link (`?shared=<cloud id>`, collabModel.ts shareLink) opens the home on this list and marks
 * that project. Their pages open in this Studio once cloud saving is on (GĐ 2, the cloud PageMirror).
 */

const sharedParam = () => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("shared"));

/** A share link opens the Studio home on the projects (StudioApp, once). */
export function useSharedLink() {
  useEffect(() => { if (sharedParam()) openProjectHome(null); }, []);
}

export function SharedProjects() {
  const { status, projects } = useCollab();
  const shared = projects.filter((project) => project.access !== "owner");
  const linked = sharedParam();
  const linkedRef = useRef<HTMLLIElement>(null);
  useEffect(() => { linkedRef.current?.scrollIntoView({ block: "nearest" }); }, [shared.length]);
  // Nothing to say on a Studio that is not signed in or has no sharing server, unless a share link brought them here.
  const note = status === "no-seat" ? "Your account has no Zen Studio seat, so projects shared with you don't open here. Ask your team's admin for one."
    : status === "signed-out" && linked ? "Sign in with Google to see the project shared with you."
    : status === "unavailable" && linked ? "Sharing isn't set up on this server yet."
    : linked && status === "ready" && !shared.some((project) => project.id === linked) ? "This project isn't shared with your account. Ask its owner to invite the email you signed in with."
    : null;
  if (!shared.length && !note) return null;
  return (
    <section className="studio-projects__shared" aria-labelledby="studio-shared-title">
      <header className="studio-projects__head">
        <Heading level={2} textStyle="Heading/4" id="studio-shared-title">Shared with you</Heading>
      </header>
      {note ? <Text as="p" textStyle="Body/Small/Regular" tone="base">{note}</Text> : (
        <Text as="p" textStyle="Body/Small/Regular" tone="light">Their pages open here once cloud saving is on.</Text>
      )}
      {shared.length ? (
        <ul className="studio-projects__grid" aria-label="Shared with you">
          {shared.map((project) => (
            <li key={project.id} ref={project.id === linked ? linkedRef : undefined} data-linked={project.id === linked ? "" : undefined}>
              <Card theme="border" spacing="sm" className="studio-projects__card">
                <div className="studio-projects__text">
                  <Text as="span" textStyle="Body/Small/Bold" truncate>{project.name}</Text>
                  <Text as="span" textStyle="Caption/Regular" tone="light" truncate>Shared by {project.ownerEmail}</Text>
                </div>
                <Badge size="sm" theme={project.access === "editor" ? "accent" : "neutral"} background="subtle" leadingIcon={false}>{ACCESS_LABELS[project.access]}</Badge>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

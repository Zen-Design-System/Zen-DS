import { TimelineMilestones, type TimelineMilestoneData } from "@zen-ds/react";

// Đìzai Studio on Wednesday 30 September 2026.
const TODAY = "2026-09-30";

const milestones: TimelineMilestoneData[] = [
  { id: "kickoff", date: "2026-08-03", title: "Kickoff" },
  { id: "research", date: "2026-08-28", title: "Research wrap-up" },
  { id: "signoff", date: "2026-09-25", title: "Design sign-off" },
  { id: "beta", date: "2026-10-23", title: "Beta launch", description: "Invite 40 studio clients" },
  { id: "launch", date: "2026-11-16", title: "Public launch" },
  { id: "retro", date: "2026-12-04", title: "Retrospective" },
];

export default function ProjectPhases() {
  return <TimelineMilestones milestones={milestones} today={TODAY} />;
}

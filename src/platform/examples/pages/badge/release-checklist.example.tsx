import { BadgeStatus, Table, TableBadges, TableText, useZen, type BadgeStatusValue, type TableColumn } from "@zen-ds/react";
import { people, type PersonId } from "../../data";

type ReleaseStep = { id: string; title: string; owner: PersonId; status: BadgeStatusValue; progress?: number; note?: string };

const releaseSteps: ReleaseStep[] = [
  { id: "r1", title: "Freeze the 0.5 component API", owner: "alex", status: "done" },
  { id: "r2", title: "Move the HR template to Badge-Status", owner: "chi", status: "done" },
  { id: "r3", title: "Translate the status labels", owner: "bao", status: "in-review" },
  { id: "r4", title: "Ship the Studio importer", owner: "finn", status: "in-progress", progress: 60 },
  { id: "r5", title: "Publish the Figma library", owner: "gia", status: "blocked", note: "Waits for the design review" },
  { id: "r6", title: "Write the migration guide", owner: "emi", status: "to-do" },
  { id: "r7", title: "Keep the old Status pill", owner: "alex", status: "cancelled", note: "Replaced by Badge-Status" },
];

export default function ReleaseChecklist() {
  // On a phone the owner joins the step's caption and only Status stays beside it.
  const phone = useZen()?.breakpoint === "mobile";
  const columns: TableColumn<ReleaseStep>[] = phone ? [
    { id: "step", header: "Step", cell: (step) => <TableText caption={[people[step.owner].name, step.note].filter(Boolean).join(" · ")}>{step.title}</TableText> },
    { id: "status", header: "Status", cell: (step) => <TableBadges><BadgeStatus status={step.status} progress={step.progress} /></TableBadges> },
  ] : [
    { id: "step", header: "Step", cell: (step) => <TableText caption={step.note}>{step.title}</TableText> },
    { id: "owner", header: "Owner", width: "160px", cell: (step) => <TableText>{people[step.owner].name}</TableText> },
    { id: "status", header: "Status", width: "160px", cell: (step) => <TableBadges><BadgeStatus status={step.status} progress={step.progress} /></TableBadges> },
  ];
  return <Table aria-label="Release 0.5 checklist" columns={columns} rows={releaseSteps} />;
}

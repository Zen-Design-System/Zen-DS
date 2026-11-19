import { TimelineActivity, type TimelineEntryData } from "@zen-ds/react";
import { people } from "../../data";

// Đìzai Studio on Wednesday 30 September 2026.
const TODAY = "2026-09-30";

// The tone is the status: Warning while a step is pending, Negative when it failed, Positive once it succeeded.
const billing: TimelineEntryData[] = [
  { id: "retry", at: "2026-09-30T11:20", actor: "Finance", title: "retried the payment", description: "Paid · $12,000.00 to Saola Outdoor", marker: { kind: "icon", tone: "positive" } },
  { id: "failed", at: "2026-09-30T09:05", actor: "Finance", title: "payment failed for INV-2026-0143", description: "The bank declined the transfer; retry after 11:00", marker: { kind: "icon", tone: "negative" } },
  { id: "pending", at: "2026-09-29T16:40", actor: "Legal", title: "contract review is pending", description: "Due Oct 2 · Lan Vu signs off", marker: { kind: "icon", tone: "warning" } },
  { id: "sent", at: "2026-09-29T10:15", actor: "Alex Duong", title: "sent the contract for review", marker: { kind: "avatar", avatarName: "Alex Duong", avatarSrc: people.alex.photo } },
];

export default function PendingAndFailed() {
  return <TimelineActivity entries={billing} today={TODAY} />;
}

import type { ReactNode } from "react";
import { Avatar, type AvatarTheme } from "../../components/Avatar";
import { DockIcon, type DockIconTheme } from "../../components/DockIcon";
import type { IconName } from "../../components/Icon";
import type { BadgeTheme } from "../../components/Badge";
import { Text } from "../../components/Text";

/*
 * Shared HR-Platform demo data for the platform examples (Side Panel, App Shell): one company (Đìzai Studio), the same
 * people and leave requests everywhere, so the screens read as one product.
 */

export type Status = "active" | "leave" | "onboarding";
export type Person = { id: string; name: string; initials: string; theme: AvatarTheme; role: string; department: string; status: Status; start: string; email: string; phone: string; manager: string; location: string; annual: number; sick: number };

export const statusBadge: Record<Status, { label: string; theme: BadgeTheme }> = {
  active: { label: "Active", theme: "green" },
  leave: { label: "On leave", theme: "orange" },
  onboarding: { label: "Onboarding", theme: "blue" },
};

export const staff: Person[] = [
  { id: "EMP-0142", name: "Ava Chen", initials: "AC", theme: "blue", role: "Product Designer", department: "Design", status: "active", start: "Mar 4, 2024", email: "ava.chen@dizai.studio", phone: "+84 90 812 4471", manager: "Duy Le", location: "Ho Chi Minh City", annual: 6, sick: 1 },
  { id: "EMP-0156", name: "Bao Nguyen", initials: "BN", theme: "green", role: "Frontend Engineer", department: "Engineering", status: "leave", start: "Jul 15, 2023", email: "bao.nguyen@dizai.studio", phone: "+84 93 205 1188", manager: "Hai Do", location: "Da Nang", annual: 11, sick: 3 },
  { id: "EMP-0171", name: "Chi Tran", initials: "CT", theme: "purple", role: "Design Ops", department: "Design", status: "active", start: "Jan 8, 2025", email: "chi.tran@dizai.studio", phone: "+84 91 440 7302", manager: "Duy Le", location: "Ho Chi Minh City", annual: 2, sick: 0 },
  { id: "EMP-0188", name: "Duy Le", initials: "DL", theme: "red", role: "Head of Product", department: "Product", status: "active", start: "Sep 1, 2022", email: "duy.le@dizai.studio", phone: "+84 90 118 9920", manager: "Linh Vo", location: "Ha Noi", annual: 9, sick: 2 },
  { id: "EMP-0203", name: "Em Pham", initials: "EP", theme: "teal", role: "QA Engineer", department: "Engineering", status: "onboarding", start: "Sep 22, 2026", email: "em.pham@dizai.studio", phone: "+84 94 336 5017", manager: "Hai Do", location: "Da Nang", annual: 0, sick: 0 },
];
export const allowance = { annual: 15, sick: 12 };

export function PersonAvatar({ person, size = "small" }: { person: Person; size?: "small" | "medium" | "xlarge" }) {
  return <Avatar size={size} theme={person.theme} background="subtle" alt="">{person.initials}</Avatar>;
}

/** A kicker label (Body/Small/Bold) that names a group of rows or checkboxes. */
export function GroupLabel({ id, children }: { id?: string; children: ReactNode }) {
  return <Text as="span" id={id} textStyle="Body/Small/Bold" tone="light">{children}</Text>;
}

export type LeaveKind = "annual" | "sick" | "unpaid" | "remote";
export type RequestStatus = "pending" | "approved" | "rejected";
export type LeaveRequest = { id: string; person: Person; kind: LeaveKind; dates: string; days: number; status: RequestStatus };

export const kindLabel: Record<LeaveKind, string> = { annual: "Annual leave", sick: "Sick leave", unpaid: "Unpaid leave", remote: "Remote work" };
export const requestBadge: Record<RequestStatus, { label: string; theme: BadgeTheme }> = {
  pending: { label: "Pending", theme: "orange" },
  approved: { label: "Approved", theme: "green" },
  rejected: { label: "Rejected", theme: "red" },
};
export const requestsInitial: LeaveRequest[] = [
  { id: "LR-311", person: staff[1], kind: "annual", dates: "Oct 6 – Oct 10", days: 5, status: "pending" },
  { id: "LR-312", person: staff[0], kind: "remote", dates: "Oct 2", days: 1, status: "pending" },
  { id: "LR-313", person: staff[2], kind: "sick", dates: "Sep 29 – Sep 30", days: 2, status: "approved" },
  { id: "LR-314", person: staff[4], kind: "unpaid", dates: "Oct 20 – Oct 24", days: 5, status: "pending" },
  { id: "LR-315", person: staff[3], kind: "annual", dates: "Nov 3 – Nov 7", days: 5, status: "pending" },
  { id: "LR-316", person: staff[0], kind: "annual", dates: "Dec 22 – Dec 31", days: 6, status: "rejected" },
  { id: "LR-317", person: staff[1], kind: "sick", dates: "Sep 15", days: 1, status: "approved" },
];

/** The signed-in person in the demos. */
export const me: Person = { id: "EMP-0101", name: "Alex Duong", initials: "AD", theme: "blue", role: "HR Manager", department: "People & Ops", status: "active", start: "Feb 1, 2021", email: "alex@dizai.studio", phone: "+84 90 555 0101", manager: "Linh Vo", location: "Ho Chi Minh City", annual: 4, sick: 1 };

/** Each leave type's emoji (the same as the HR templates' balances). */
export const kindEmoji: Record<LeaveKind, string> = { annual: "🏝️", sick: "🤒", unpaid: "🥵", remote: "🏠" };

/** A leave request's leading mark: the type's emoji Dock Icon, Medium like the people rows around it. */
export function KindMark({ kind, size = "md" }: { kind: LeaveKind; size?: "sm" | "md" }) {
  return <DockIcon theme="emoji" emoji={kindEmoji[kind]} size={size} />;
}

/** A thing's leading mark in a list of people and things: a Subtle Dock Icon at the Avatar's size. */
export function ThingMark({ icon, theme = "neutral", size = "md" }: { icon: IconName; theme?: DockIconTheme; size?: "sm" | "md" }) {
  return <DockIcon icon={icon} theme={theme} background="subtle" size={size} />;
}

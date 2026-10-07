/* The shared world of the platform examples (brief: docs/research/example-rebuild-brief-2026-09-30.md §1).
   Đìzai Studio is a 48-person product studio in Ho Chi Minh City and Hanoi, the same company the HR templates show.
   Today is Wednesday, Sep 30, 2026, 10:30 am. Examples copy what they need into local state so their demos work;
   this module is read-only. A page that needs another domain (a shop checkout, a bank) keeps that data in its own file. */
import type { AvatarTheme } from "../../components/Avatar";
import type { BadgeTheme } from "../../components/Badge";
import type { DockIconTheme } from "../../components/DockIcon";
import type { IconName } from "../../components/Icon";
import photoAlex from "../../templates/hr/assets/account-photo.jpg";
import workspaceLogo from "../../templates/hr/assets/workspace-logo.png";
import photoAva from "../../assets/media/avatar-ava.webp";
import photoBao from "../../assets/media/avatar-bao.webp";
import photoChi from "../../assets/media/avatar-chi.webp";
import photoDuy from "../../assets/media/avatar-duy.webp";
import photoEmi from "../../assets/media/avatar-emi.webp";
import photoFinn from "../../assets/media/avatar-finn.webp";

/** Wednesday, Sep 30, 2026, 10:30 am: every date in the examples is relative to it. */
export const TODAY = new Date(2026, 8, 30, 10, 30);
const day = 24 * 60 * 60 * 1000;
/** A date `days` from today (negative = past) at an optional hour and minute. */
export const daysFromToday = (days: number, hour = 10, minute = 30) => { const d = new Date(TODAY.getTime() + days * day); d.setHours(hour, minute, 0, 0); return d; };
const minutesAgo = (m: number) => new Date(TODAY.getTime() - m * 60 * 1000);

export const studio = { name: "Đìzai Studio", domain: "dizai.studio", logo: workspaceLogo, workspace: "Đìzai Studio workspace" };

// ——— People ———————————————————————————————————————————————————————————————————————————————————
export type Team = "Design" | "Engineering" | "Delivery" | "Client Services" | "Operations";
export type Person = {
  id: string;
  name: string;
  role: string;
  team: Team;
  email: string;
  /** Avatar theme for the initials case, steady per person. People without a photo use themes whose white initials
   *  reach 3:1 on the solid fill (green, cyan, teal, orange and yellow do not). */
  theme: Exclude<AvatarTheme, "photo" | "accent">;
  /** Only some people have a photo; everyone else is an initials Avatar. */
  photo?: string;
  location: "Ho Chi Minh City" | "Hanoi" | "Singapore" | "Remote";
  /** Presence for chat-like rows. */
  online?: boolean;
};

const person = (id: string, name: string, role: string, team: Team, theme: Person["theme"], location: Person["location"], extra: Partial<Person> = {}): Person =>
  ({ id, name, role, team, theme, location, email: `${name.split(" ")[0].toLowerCase()}@dizai.studio`, ...extra });

/** Alex Duong is the signed-in user (Design Lead, approver for the Design team). */
export const people = {
  alex: person("alex", "Alex Duong", "Design Lead", "Design", "indigo", "Ho Chi Minh City", { photo: photoAlex, online: true }),
  bao: person("bao", "Bao Nguyen", "Frontend Engineer", "Engineering", "teal", "Ho Chi Minh City", { photo: photoBao, online: true }),
  chi: person("chi", "Chi Tran", "Product Designer", "Design", "pink", "Hanoi", { photo: photoChi }),
  duy: person("duy", "Duy Le", "Project Manager", "Delivery", "orange", "Ho Chi Minh City", { photo: photoDuy, online: true }),
  ava: person("ava", "Ava Chen", "UX Researcher", "Design", "violet", "Singapore", { photo: photoAva }),
  emi: person("emi", "Emi Sato", "Motion Designer", "Design", "plum", "Remote", { photo: photoEmi }),
  finn: person("finn", "Finn Walsh", "Tech Lead", "Engineering", "blue", "Remote", { photo: photoFinn }),
  em: person("em", "Em Pham", "QA Engineer", "Engineering", "violet", "Hanoi"),
  gia: person("gia", "Gia Pham", "Brand Designer", "Design", "plum", "Ho Chi Minh City"),
  hana: person("hana", "Hana Kim", "Account Director", "Client Services", "crimson", "Singapore"),
  minhAnh: person("minhAnh", "Minh Anh Vo", "People Ops Manager", "Operations", "indigo", "Ho Chi Minh City"),
  linh: person("linh", "Linh Vo", "Content Strategist", "Client Services", "purple", "Hanoi"),
  khoa: person("khoa", "Khoa Bui", "Backend Engineer", "Engineering", "brown", "Hanoi"),
  mai: person("mai", "Mai Ho", "Finance Manager", "Operations", "red", "Ho Chi Minh City"),
} satisfies Record<string, Person>;
export type PersonId = keyof typeof people;
export const peopleList: Person[] = Object.values(people);
export const me = people.alex;
/** First and last name: "Bao Nguyen" → "BN", "Minh Anh Vo" → "MV" (the rule the Avatar page teaches). */
export const initials = (name: string) => { const w = name.split(/\s+/).filter(Boolean); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : (w[0] ?? "").slice(0, 2)).toUpperCase(); };

// ——— Clients and projects ————————————————————————————————————————————————————————————————————
export type ProjectStatus = "Planning" | "Active" | "On hold" | "Completed";
export type Project = {
  id: string;
  name: string;
  client: string;
  /** Dock Icon for the project (item icons are Dock Icons). */
  icon: IconName;
  theme: DockIconTheme;
  status: ProjectStatus;
  lead: PersonId;
  members: PersonId[];
  /** 0–100 */
  progress: number;
  start: Date;
  due: Date;
  budget: number;
  spent: number;
};

export const projects: Project[] = [
  { id: "phin-loyalty", name: "Loyalty app", client: "Phin & Co", icon: "icon-mobile-line", theme: "orange", status: "Active", lead: "chi", members: ["chi", "bao", "em", "duy"], progress: 64, start: daysFromToday(-70), due: daysFromToday(33), budget: 84000, spent: 51240 },
  { id: "lumen-banking", name: "Online banking redesign", client: "Lumen Bank", icon: "icon-bank-line", theme: "blue", status: "Active", lead: "alex", members: ["alex", "ava", "finn", "khoa", "hana"], progress: 38, start: daysFromToday(-45), due: daysFromToday(76), budget: 162000, spent: 58310 },
  { id: "mekong-tracking", name: "Shipment tracking", client: "Mekong Freight", icon: "icon-truck-line", theme: "teal", status: "On hold", lead: "duy", members: ["duy", "bao", "khoa"], progress: 22, start: daysFromToday(-30), due: daysFromToday(95), budget: 56000, spent: 12880 },
  { id: "bookfair-site", name: "Book Fair 2026 website", client: "Hanoi Book Fair", icon: "icon-book-open-line", theme: "purple", status: "Completed", lead: "gia", members: ["gia", "linh", "em"], progress: 100, start: daysFromToday(-120), due: daysFromToday(-12), budget: 28000, spent: 27420 },
  { id: "zen-ds", name: "Zen design system", client: "Đìzai Studio", icon: "icon-grid-01-line", theme: "indigo", status: "Active", lead: "alex", members: ["alex", "chi", "bao", "emi", "finn"], progress: 81, start: daysFromToday(-200), due: daysFromToday(14), budget: 0, spent: 0 },
  { id: "saola-brand", name: "Brand refresh", client: "Saola Outdoor", icon: "icon-palette-line", theme: "green", status: "Planning", lead: "gia", members: ["gia", "emi", "linh"], progress: 5, start: daysFromToday(12), due: daysFromToday(110), budget: 36000, spent: 0 },
];

// ——— Tasks ——————————————————————————————————————————————————————————————————————————————————
export type TaskStatus = "To do" | "In progress" | "In review" | "Done";
export type Priority = "Low" | "Medium" | "High" | "Urgent";
export type Task = { id: string; key: string; title: string; project: string; assignee: PersonId; status: TaskStatus; priority: Priority; due: Date; comments: number };

export const tasks: Task[] = [
  { id: "t1", key: "PHIN-214", title: "Design the points history screen", project: "phin-loyalty", assignee: "chi", status: "In progress", priority: "High", due: daysFromToday(2), comments: 6 },
  { id: "t2", key: "PHIN-219", title: "Connect the rewards API to checkout", project: "phin-loyalty", assignee: "bao", status: "In review", priority: "Medium", due: daysFromToday(1), comments: 3 },
  { id: "t3", key: "PHIN-223", title: "Regression test for the Android build", project: "phin-loyalty", assignee: "em", status: "To do", priority: "Medium", due: daysFromToday(5), comments: 0 },
  { id: "t4", key: "LUM-088", title: "Run five usability sessions on transfers", project: "lumen-banking", assignee: "ava", status: "In progress", priority: "High", due: daysFromToday(3), comments: 9 },
  { id: "t5", key: "LUM-091", title: "Audit the account overview for WCAG 2.2", project: "lumen-banking", assignee: "alex", status: "To do", priority: "Urgent", due: daysFromToday(0), comments: 2 },
  { id: "t6", key: "LUM-095", title: "Spike: passkey sign-in on iOS", project: "lumen-banking", assignee: "finn", status: "Done", priority: "Low", due: daysFromToday(-2), comments: 4 },
  { id: "t7", key: "ZEN-402", title: "Add Disabled back to Input and Search", project: "zen-ds", assignee: "bao", status: "Done", priority: "Medium", due: daysFromToday(0), comments: 1 },
  { id: "t8", key: "ZEN-405", title: "Write guidelines for the Metric card", project: "zen-ds", assignee: "chi", status: "In review", priority: "Low", due: daysFromToday(6), comments: 5 },
  { id: "t9", key: "MEK-031", title: "Map the customs hold states", project: "mekong-tracking", assignee: "duy", status: "To do", priority: "Medium", due: daysFromToday(9), comments: 0 },
  { id: "t10", key: "SAO-004", title: "Moodboard for the outdoor range", project: "saola-brand", assignee: "gia", status: "In progress", priority: "Medium", due: daysFromToday(7), comments: 2 },
];

// ——— Files ——————————————————————————————————————————————————————————————————————————————————
export type StudioFile = { id: string; name: string; bytes: number; owner: PersonId; project: string; updated: Date };
export const files: StudioFile[] = [
  { id: "f1", name: "Loyalty app – points history.fig", bytes: 18_400_000, owner: "chi", project: "phin-loyalty", updated: minutesAgo(13) },
  { id: "f2", name: "Usability plan – transfers.pdf", bytes: 1_240_000, owner: "ava", project: "lumen-banking", updated: daysFromToday(-1, 16, 5) },
  { id: "f3", name: "Rewards API contract.json", bytes: 86_000, owner: "bao", project: "phin-loyalty", updated: daysFromToday(-2, 9, 40) },
  { id: "f4", name: "Q3 studio report.xlsx", bytes: 2_310_000, owner: "mai", project: "zen-ds", updated: daysFromToday(-5, 14, 20) },
  { id: "f5", name: "Brand refresh kickoff.key", bytes: 42_700_000, owner: "gia", project: "saola-brand", updated: daysFromToday(-16, 11, 0) },
  { id: "f6", name: "Book Fair launch video.mp4", bytes: 214_000_000, owner: "emi", project: "bookfair-site", updated: daysFromToday(-20, 17, 45) },
];

// ——— Invoices ———————————————————————————————————————————————————————————————————————————————
export type InvoiceStatus = "Draft" | "Sent" | "Paid" | "Overdue";
export type Invoice = { id: string; number: string; client: string; project: string; amount: number; status: InvoiceStatus; issued: Date; due: Date };
export const invoices: Invoice[] = [
  { id: "i1", number: "INV-2026-0142", client: "Phin & Co", project: "phin-loyalty", amount: 21000, status: "Sent", issued: daysFromToday(-5), due: daysFromToday(25) },
  { id: "i2", number: "INV-2026-0141", client: "Lumen Bank", project: "lumen-banking", amount: 40500, status: "Paid", issued: daysFromToday(-18), due: daysFromToday(12) },
  { id: "i3", number: "INV-2026-0139", client: "Mekong Freight", project: "mekong-tracking", amount: 12880, status: "Overdue", issued: daysFromToday(-44), due: daysFromToday(-14) },
  { id: "i4", number: "INV-2026-0138", client: "Hanoi Book Fair", project: "bookfair-site", amount: 9140.5, status: "Paid", issued: daysFromToday(-50), due: daysFromToday(-20) },
  { id: "i5", number: "INV-2026-0143", client: "Saola Outdoor", project: "saola-brand", amount: 12000, status: "Draft", issued: TODAY, due: daysFromToday(30) },
];

// ——— Activity ——————————————————————————————————————————————————————————————————————————————
export type Activity = { id: string; actor: PersonId; verb: string; object: string; at: Date; unread?: boolean };
export const activity: Activity[] = [
  { id: "a1", actor: "chi", verb: "commented on", object: "Design the points history screen", at: minutesAgo(0.5), unread: true },
  { id: "a2", actor: "bao", verb: "asked you to review", object: "Connect the rewards API to checkout", at: minutesAgo(13), unread: true },
  { id: "a3", actor: "hana", verb: "shared", object: "Lumen Bank SOW v3", at: daysFromToday(0, 9, 12), unread: true },
  { id: "a4", actor: "duy", verb: "moved Shipment tracking to", object: "On hold", at: daysFromToday(-1, 16, 40) },
  { id: "a5", actor: "minhAnh", verb: "approved your leave for", object: "Oct 12 – Oct 14, 2026", at: daysFromToday(-2, 11, 5) },
  { id: "a6", actor: "mai", verb: "marked as paid", object: "INV-2026-0141", at: daysFromToday(-8, 15, 30) },
];

// ——— Status → Badge theme (one vocabulary per domain, always a Badge) ——————————————————————
export const taskStatusTheme: Record<TaskStatus, BadgeTheme> = { "To do": "neutral", "In progress": "blue", "In review": "purple", Done: "green" };
export const projectStatusTheme: Record<ProjectStatus, BadgeTheme> = { Planning: "neutral", Active: "blue", "On hold": "orange", Completed: "green" };
export const invoiceStatusTheme: Record<InvoiceStatus, BadgeTheme> = { Draft: "neutral", Sent: "blue", Paid: "green", Overdue: "red" };
export const priorityTheme: Record<Priority, BadgeTheme> = { Low: "neutral", Medium: "yellow", High: "orange", Urgent: "red" };

// ——— Formatters (brief §3: month names, the timestamp ladder, full amounts in tables) ————————
const month = (d: Date) => d.toLocaleString("en-US", { month: "short" });
/** "Oct 12, 2026" */
export const formatDate = (d: Date) => `${month(d)} ${d.getDate()}, ${d.getFullYear()}`;
/** "Oct 12" (this year only; use formatDate across years). */
export const formatDay = (d: Date) => `${month(d)} ${d.getDate()}`;
/** "Oct 12 – Oct 14, 2026" · across years "Dec 30, 2026 – Jan 2, 2027". */
export const formatRange = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() ? `${formatDay(a)} – ${formatDate(b)}` : `${formatDate(a)} – ${formatDate(b)}`;
/** "10:30 am" */
export const formatTime = (d: Date) => { const h = d.getHours(); return `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`; };
/** The timestamp ladder: Just now · 13 minutes ago · 10:30 am · Yesterday at 10:30 am · Friday at 10:30 am · Sep 14 at 10:30 am · Sep 14, 2025. */
export function formatRelative(d: Date, now = TODAY) {
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / day);
  if (days === 0) return formatTime(d);
  if (days === 1) return `Yesterday at ${formatTime(d)}`;
  if (days < 7) return `${d.toLocaleString("en-US", { weekday: "long" })} at ${formatTime(d)}`;
  if (d.getFullYear() === now.getFullYear()) return `${formatDay(d)} at ${formatTime(d)}`;
  return formatDate(d);
}
/** "Due today" · "Due tomorrow" · "Due in 5 days" · "2 days overdue". */
export function formatDue(d: Date, now = TODAY) {
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(d) - startOf(now)) / day);
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 1) return `Due in ${days} days`;
  return `${-days} ${days === -1 ? "day" : "days"} overdue`;
}
/** "$1,280.40" · whole amounts keep no decimals unless `cents` ("$12,000" / "$12,000.00"). Tables never abbreviate. */
export const formatMoney = (n: number, cents = !Number.isInteger(n)) => n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
/** "$20.5K" — charts and KPI tiles only. */
export const formatCompactMoney = (n: number) => `$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`;
/** "4.2 MB" · "86 KB" · "214 MB" */
export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes, i = 0;
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")} ${units[i]}`;
}
export const projectById = (id: string) => projects.find((p) => p.id === id)!;

// ——— Studio months (one series for the Metric and Chart pages) ——————————————————————————————————
export type StudioMonth = { id: string; label: string; month: string; invoiced: number; collected: number };
/** What the studio invoiced and collected, Oct 2025 – Sep 2026 (Q2 $262,500 · Q3 $296,800, +13%; September +9%). */
export const studioMonths: StudioMonth[] = ([
  ["oct", "Oct", "October 2025", 71200, 69800], ["nov", "Nov", "November 2025", 76500, 72400], ["dec", "Dec", "December 2025", 68900, 70100],
  ["jan", "Jan", "January 2026", 74300, 66900], ["feb", "Feb", "February 2026", 79600, 77200], ["mar", "Mar", "March 2026", 85100, 81300],
  ["apr", "Apr", "April 2026", 82300, 79500], ["may", "May", "May 2026", 91800, 90100], ["jun", "Jun", "June 2026", 88400, 86000],
  ["jul", "Jul", "July 2026", 94100, 91700], ["aug", "Aug", "August 2026", 97000, 95800], ["sep", "Sep", "September 2026", 105700, 88300],
] as const).map(([id, label, month, invoiced, collected]) => ({ id, label, month, invoiced, collected }));
/** Billable hours per team, Apr – Sep 2026; a month's teams add up to the studio total (Jul 6,490 · Aug 5,670 · Sep 5,900 h). */
export const studioTeamHours: { label: string; design: number; engineering: number; delivery: number; clientServices: number }[] = [
  { label: "Apr", design: 2500, engineering: 1880, delivery: 700, clientServices: 480 },
  { label: "May", design: 2510, engineering: 1880, delivery: 700, clientServices: 480 },
  { label: "Jun", design: 2720, engineering: 2040, delivery: 770, clientServices: 520 },
  { label: "Jul", design: 2920, engineering: 2190, delivery: 820, clientServices: 560 },
  { label: "Aug", design: 2550, engineering: 1910, delivery: 720, clientServices: 490 },
  { label: "Sep", design: 2650, engineering: 1990, delivery: 750, clientServices: 510 },
];

// ——— Zen workspace plans (one price list for every billing example) ——————————————————————————————
export type PlanId = "starter" | "team" | "business";
export type Plan = { id: PlanId; name: string; seatMonthly: number; seatYearly: number; summary: string };
/** Per seat: monthly, or yearly at 20% off. Đìzai Studio is on Business with 48 seats ($1,152 a month). */
export const plans: Plan[] = [
  { id: "starter", name: "Starter", seatMonthly: 0, seatYearly: 0, summary: "For personal projects" },
  { id: "team", name: "Team", seatMonthly: 12, seatYearly: 115.2, summary: "For growing teams" },
  { id: "business", name: "Business", seatMonthly: 24, seatYearly: 230.4, summary: "For studios and agencies" },
];
export const workspacePlan = { plan: "business" as PlanId, seats: 48, billing: "monthly" as "monthly" | "yearly" };

// ——— Leave (one set of requests for approvals, calendars and activity) ———————————————————————————
export type LeaveKind = "Annual leave" | "Sick leave" | "Unpaid leave";
export type LeaveStatus = "Pending" | "Approved" | "Declined" | "Cancelled";
export type LeaveRequest = { id: string; person: PersonId; kind: LeaveKind; from: Date; to: Date; days: number; status: LeaveStatus; note?: string; requested: Date };
export const leaveRequests: LeaveRequest[] = [
  { id: "l1", person: "alex", kind: "Annual leave", from: new Date(2026, 9, 12), to: new Date(2026, 9, 14), days: 3, status: "Approved", note: "Family trip to Đà Lạt", requested: daysFromToday(-9, 9, 20) },
  { id: "l2", person: "chi", kind: "Annual leave", from: new Date(2026, 9, 19), to: new Date(2026, 9, 21), days: 3, status: "Pending", note: "Wedding in Hải Phòng", requested: daysFromToday(-3, 16, 45) },
  { id: "l3", person: "emi", kind: "Annual leave", from: new Date(2026, 9, 26), to: new Date(2026, 9, 27), days: 2, status: "Pending", requested: daysFromToday(-1, 11, 10) },
  { id: "l4", person: "bao", kind: "Sick leave", from: daysFromToday(-2), to: daysFromToday(-2), days: 1, status: "Approved", requested: daysFromToday(-2, 8, 5) },
  { id: "l5", person: "gia", kind: "Unpaid leave", from: new Date(2026, 10, 2), to: new Date(2026, 10, 6), days: 5, status: "Declined", note: "Overlaps the Saola kickoff", requested: daysFromToday(-6, 14, 30) },
];
/** Alex's allowance this year and what is left after the approved requests (one set for every page). */
export const leaveBalance: Record<LeaveKind, { perYear: number; left: number } | null> = {
  "Annual leave": { perYear: 18, left: 7 },
  "Sick leave": { perYear: 12, left: 10 },
  "Unpaid leave": null,
};
export const leaveStatusTheme: Record<LeaveStatus, BadgeTheme> = { Pending: "yellow", Approved: "green", Declined: "red", Cancelled: "neutral" };

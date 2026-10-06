import { type AvatarTheme } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { type PopoverItemData } from "../components/Popover";

/* Popover content sets, shared with the Popover playground (PlatformExamples). Data only, kept out of the example
   card module (PlatformShowcases) so that module exports components only and an example edit stays a Fast Refresh. */

const photo = (bg: string, fg: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><circle cx="16" cy="13" r="6" fill="${fg}"/><rect x="6" y="21" width="20" height="14" rx="7" fill="${fg}"/></svg>`);
const people = [
  { id: "ava", name: "Ava Chen", role: "Product Designer", initials: "AC", theme: "blue" as AvatarTheme, photo: photo("#d9c7b8", "#8f735f"), online: true },
  { id: "bao", name: "Bao Nguyen", role: "Frontend Engineer", initials: "BN", theme: "green" as AvatarTheme, photo: photo("#c8d6c2", "#5f7a58"), online: true },
  { id: "chi", name: "Chi Tran", role: "Design Ops", initials: "CT", theme: "purple" as AvatarTheme, photo: photo("#d4cbe3", "#6d5b92"), online: false },
  { id: "duy", name: "Duy Le", role: "Product Manager", initials: "DL", theme: "red" as AvatarTheme, photo: photo("#e6c8c4", "#9a5a52"), online: false },
  { id: "em", name: "Em Pham", role: "QA Engineer", initials: "EP", theme: "teal" as AvatarTheme, photo: photo("#c4dfdc", "#4f8a84"), online: true },
];

const thumb = (bg: string, fg: string, shape: "doc" | "product") => "data:image/svg+xml;utf8," + encodeURIComponent(shape === "doc"
  ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><rect x="7" y="8" width="18" height="3" rx="1.5" fill="${fg}"/><rect x="7" y="14" width="14" height="3" rx="1.5" fill="${fg}" opacity=".6"/><rect x="7" y="20" width="10" height="3" rx="1.5" fill="${fg}" opacity=".4"/></svg>`
  : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><circle cx="16" cy="15" r="8" fill="${fg}"/><rect x="10" y="24" width="12" height="3" rx="1.5" fill="${fg}" opacity=".5"/></svg>`);

export const popoverContentKinds = ["icon", "text-only", "avatar-small", "avatar-big", "photo-small", "photo-big", "dock-icon", "badge"] as const;
export type PopoverContentKind = (typeof popoverContentKinds)[number];
export type PopoverContentSet = { title: string; items: PopoverItemData[]; code: string };

/** One realistic data set per Figma .Primitives/Popover/Item/Content theme. */
export function popoverContentSet(kind: PopoverContentKind, caption: boolean): PopoverContentSet {
  const c = (text: string) => (caption ? text : undefined);
  switch (kind) {
    case "icon": return { title: "Sort by", code: `{ id: "updated", label: "Last updated", caption: "Newest first", leading: <Icon name="icon-clock-line" /> }`, items: [
      { id: "updated", label: "Last updated", caption: c("Newest first"), leading: <Icon name="icon-clock-line" decorative /> },
      { id: "name", label: "Name", caption: c("A → Z"), leading: <Icon name="icon-type-01-line" decorative /> },
      { id: "size", label: "File size", caption: c("Largest first"), leading: <Icon name="icon-ruler-line" decorative /> },
      { id: "status", label: "Status", caption: c("Grouped by state"), leading: <Icon name="icon-check-circle-line" decorative /> },
    ] };
    case "text-only": return { title: "Language", code: `{ id: "vi", label: "Tiếng Việt", caption: "Vietnamese" }`, items: [
      { id: "en", label: "English", caption: c("Default") },
      { id: "vi", label: "Tiếng Việt", caption: c("Vietnamese") },
      { id: "ja", label: "日本語", caption: c("Japanese") },
      { id: "fr", label: "Français", caption: c("French") },
    ] };
    case "avatar-small": return { title: "Assignee", code: `{ id: user.id, label: user.name, caption: user.role, theme: "avatar-small", photoSrc: user.photo }`, items:
      people.slice(0, 4).map((person) => ({ id: person.id, label: person.name, caption: c(person.role), theme: "avatar-small", photoSrc: person.photo })) };
    case "avatar-big": return { title: "Switch account", code: `{ id: account.id, label: account.name, caption: account.email, theme: "avatar-big", photoSrc: account.photo }`, items:
      people.slice(0, 3).map((person) => ({ id: person.id, label: person.name, caption: c(`${person.name.split(" ")[0].toLowerCase()}@dizai.studio`), theme: "avatar-big", photoSrc: person.photo })) };
    case "photo-small": return { title: "Recent files", code: `{ id: file.id, label: file.name, caption: "Edited 2h ago", theme: "photo-small", photoSrc: file.thumbnail }`, items: [
      { id: "brief", label: "Q4 brief.doc", caption: c("Edited 2h ago"), theme: "photo-small", photoSrc: thumb("#dbe7ff", "#4c6ef5", "doc") },
      { id: "budget", label: "Budget 2026.xls", caption: c("Edited yesterday"), theme: "photo-small", photoSrc: thumb("#d3f9d8", "#2f9e44", "doc") },
      { id: "notes", label: "Research notes", caption: c("Edited Mon"), theme: "photo-small", photoSrc: thumb("#fff3bf", "#e67700", "doc") },
    ] };
    case "photo-big": return { title: "Products", code: `{ id: product.id, label: product.name, caption: "$129 · In stock", theme: "photo-big", photoSrc: product.image }`, items: [
      { id: "lamp", label: "Arc desk lamp", caption: c("$129 · In stock"), theme: "photo-big", photoSrc: thumb("#f1e4d6", "#b07d4f", "product") },
      { id: "chair", label: "Ergo chair", caption: c("$349 · 3 left"), theme: "photo-big", photoSrc: thumb("#dde5ec", "#4a6078", "product") },
      { id: "mug", label: "Stoneware mug", caption: c("$24 · Pre-order"), theme: "photo-big", photoSrc: thumb("#e8e0f0", "#7a5a9e", "product") },
    ] };
    case "dock-icon": return { title: "Integrations", code: `{ id: "figma", label: "Figma", caption: "Design files", theme: "dock-icon", leading: <Icon name="ic-figma-line" /> }`, items: [
      { id: "figma", label: "Figma", caption: c("Design files"), theme: "dock-icon", leading: <Icon name="ic-figma-line" decorative /> },
      { id: "chat", label: "Team chat", caption: c("Messages & threads"), theme: "dock-icon", leading: <Icon name="icon-message-chat-circle-line" decorative /> },
      { id: "calendar", label: "Calendar", caption: c("Events & reminders"), theme: "dock-icon", leading: <Icon name="icon-calendar-line" decorative /> },
      { id: "storage", label: "Cloud storage", caption: c("Files & backups"), theme: "dock-icon", leading: <Icon name="icon-cloud-line" decorative /> },
    ] };
    case "badge": return { title: "Status", code: `{ id: "active", label: "Active", theme: "badge", badgeTheme: "green" }`, items: [
      { id: "active", label: "Active", theme: "badge", badgeTheme: "green" },
      { id: "paused", label: "Paused", theme: "badge", badgeTheme: "yellow" },
      { id: "blocked", label: "Blocked", theme: "badge", badgeTheme: "red" },
      { id: "archived", label: "Archived", theme: "badge", badgeTheme: "neutral" },
    ] };
  }
}

import type { BottomNavigationItem } from "../components/BottomNavigation";
import type { ChatPerson } from "../components/Chat";
import avatarAva from "../assets/media/avatar-ava.webp";
import avatarBao from "../assets/media/avatar-bao.webp";
import avatarChi from "../assets/media/avatar-chi.webp";
import avatarDuy from "../assets/media/avatar-duy.webp";
import avatarEmi from "../assets/media/avatar-emi.webp";
import avatarFinn from "../assets/media/avatar-finn.webp";

/* Shared sample data for the mobile / chat / chart playgrounds and examples (kept apart to avoid an import cycle). */

const photo = (bg: string, fg: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${bg}"/><circle cx="16" cy="13" r="6" fill="${fg}"/><path d="M4 32c1.5-7 6.5-10 12-10s10.5 3 12 10z" fill="${fg}"/></svg>`);
/* Chat/people avatars mix both Avatar cases: real photos (Unsplash, see assets/media/CREDITS.md) and initials on a
   theme colour — never the generic silhouette placeholder. */
export const mobilePeople: Record<"ava" | "bao" | "chi" | "duy" | "emi" | "finn" | "gia" | "hana", ChatPerson> = {
  ava: { name: "Ava Chen", src: avatarAva },
  bao: { name: "Bao Nguyen", src: avatarBao },
  chi: { name: "Chi Tran", src: avatarChi },
  duy: { name: "Duy Le", src: avatarDuy },
  emi: { name: "Emi Sato", src: avatarEmi },
  finn: { name: "Finn Walsh", src: avatarFinn },
  gia: { name: "Gia Pham", theme: "teal" },
  hana: { name: "Hana Kim", theme: "purple" },
};

/** Spread onto an Avatar for a sample person: their photo, or initials on their theme colour. */
export const avatarOf = (person: ChatPerson) => person.src
  ? { theme: "photo" as const, src: person.src }
  : { theme: person.theme ?? ("neutral" as const), children: person.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() };

/* Long sample lists so phone examples scroll (collapsing headers, floating bars and sheet bodies need content under them). */
const people = Object.values(mobilePeople);
const previews = ["Did you get the brand files?", "Merged the token PR", "Standup moved to 10:30", "Thanks!", "Can you review the icons?", "Lunch at 12?", "Shipped 🎉", "The build is green again", "Sent you the invoice", "Let's sync after the demo", "Photos from the site visit", "Can we push to Friday?"];
export const mobileConversations = Array.from({ length: 22 }, (_, i) => ({
  id: `c${i}`,
  person: people[i % people.length],
  preview: previews[i % previews.length],
  time: i === 0 ? "now" : i < 10 ? `${i * 6}m` : i < 16 ? `${i - 8}h` : ["Mon", "Sun", "Sat", "Fri", "Thu", "Wed"][i - 16],
  unread: i < 3,
  online: i % 4 === 0,
}));

export const mobileProjects = ["Zen website", "Brand refresh", "Mobile app", "Docs platform", "Design tokens", "Icon library", "Onboarding flow", "Billing redesign", "Help center", "Analytics dashboard", "Email templates", "Partner portal", "Release notes", "Accessibility audit"].map((title, i) => ({
  title,
  caption: `${Math.max(2, 16 - i)} pages · updated ${i + 1}d ago`,
  theme: (["brown", "indigo", "green", "orange", "teal", "purple"] as const)[i % 6],
}));

export const mobileFiles = ["Brand guidelines.pdf", "Q3 report.pdf", "Tokens.json", "Logo pack.zip", "Onboarding.fig", "Pricing sheet.xlsx", "Roadmap 2027.pdf", "Interview notes.docx", "Icon set.svg", "Launch plan.pdf", "Colour audit.xlsx", "Research deck.pdf", "Release checklist.docx", "Screenshots.zip", "Contract draft.pdf", "Style tile.png"].map((name, i) => ({
  name,
  caption: i % 3 === 0 ? `Shared with ${(i % 5) + 2} people` : `Edited ${i + 1}d ago`,
  shared: i % 3 === 0,
  starred: i % 4 === 1,
}));

export const mobileTasks = ["Review the icon PR", "Write release notes", "Prepare the Q3 demo", "Update the pricing page", "Reply to the partner email", "Book the design review room", "Audit colour contrast", "Clean up old branches", "Draft the onboarding survey", "Record the walkthrough video", "Check the invoice totals", "Plan the offsite agenda", "Refresh the roadmap slides", "Send the weekly update"].map((title, i) => ({
  id: `t${i}`,
  title,
  due: i < 3 ? "Today" : i < 7 ? "Tomorrow" : `In ${i - 5} days`,
}));

export const mobileInbox = Array.from({ length: 20 }, (_, i) => ({
  id: `m${i}`,
  person: people[(i * 3) % people.length],
  subject: ["Design review notes", "@you Can you check the spacing?", "Weekly metrics", "Invoice #2041", "@you Please approve the copy", "Team offsite", "New comment on Tokens.json", "Build failed on main", "@you Mentioned in Roadmap", "Lunch & learn"][i % 10],
  unread: i % 3 !== 2,
  mention: i % 10 === 1 || i % 10 === 4 || i % 10 === 8,
  time: i < 8 ? `${i + 1}h` : `${i - 6}d`,
}));

export const mobileSettings = [
  { title: "Notifications", caption: "Push, email and in-app" }, { title: "Sound & haptics" }, { title: "Appearance", caption: "System" }, { title: "Language", caption: "English" },
  { title: "Storage", caption: "12.4 GB of 64 GB" }, { title: "Downloads", caption: "Wi-Fi only" }, { title: "Privacy" }, { title: "Security", caption: "Face ID on" },
  { title: "Connected apps", caption: "4 apps" }, { title: "Backups", caption: "Last: today 08:12" }, { title: "Accessibility" }, { title: "Keyboard" },
  { title: "Date & time", caption: "Automatic" }, { title: "Help & feedback" }, { title: "Terms & privacy policy" }, { title: "About", caption: "Version 4.2.0" },
];

export const bottomNavItems: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-smile-line", selectedIcon: "icon-home-smile-solid" },
  { id: "search", label: "Search", icon: "icon-search-medium-line" },
  { id: "inbox", label: "Inbox", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid", dot: true },
  { id: "profile", label: "Profile", icon: "icon-user-circle-line", selectedIcon: "icon-user-circle-solid" },
];

export const budgetSeries = [{ id: "dev", label: "Development" }, { id: "research", label: "Research" }, { id: "marketing", label: "Marketing" }, { id: "finance", label: "Finance" }, { id: "hr", label: "HR" }];

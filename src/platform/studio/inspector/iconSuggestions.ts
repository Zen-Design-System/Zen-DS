/*
 * What the icon picker lists before the whole set (Studio builder GĐ4 M2; user 2026-10-07: Figma's preferred values hold
 * the whole icon set, so the picker leads with the swap's default in Figma, then the icons this file already uses).
 * User 2026-10-14 ("OK … làm ngay"): the icons picked lately ("Recent") and the icons that mean the same as the one shown
 * ("Related": its family, its topic, the topic of the words beside it) come first, so most swaps need no typing.
 *
 * Pure (no imports): iconSuggestions.selftest.mjs imports it directly.
 */

/** At most this many "Used in this file" icons. */
export const MAX_FILE_ICONS = 12;
/** At most this many "Recent" icons (one row of tiles). */
export const MAX_RECENT_ICONS = 6;
/** At most this many "Related" icons (two rows of tiles). */
export const MAX_RELATED_ICONS = 12;
/** At most this many of the shown icon's own family (coins → coins-hand, coins-swap…) before its topic's icons. */
const MAX_FAMILY = 4;
/** The words beside an icon count for at most this many topics (a long text names many things). */
const MAX_WORD_TOPICS = 2;

/** The icon names a source text writes (`"icon-heart-line"`, `'icon-x-close'`, `icon="…"`), in order, each once; only
 *  names in `known` (the icon set) count. */
export function iconsIn(text: string, known: ReadonlySet<string>): string[] {
  const seen: string[] = [];
  for (const match of text.matchAll(/["'`](icon-[a-z0-9-]+)["'`]/g)) {
    const name = match[1];
    if (known.has(name) && !seen.includes(name)) seen.push(name);
  }
  return seen;
}

/** `recent` and `related` are drawn as tiles (icon only, the name in the tooltip); the others as rows. */
export type IconGroup = { id: "default" | "recent" | "related" | "file" | "all"; title: string; names: string[] };

/** What the picker knows besides the icon set: the swap's Figma default, the file's icons, the recent picks, the related
 *  icons (relatedIcons), and the icon shown now (left out of the suggestions: picking it changes nothing). */
export type IconSuggestions = { defaultIcon?: string; fileIcons?: readonly string[]; recent?: readonly string[]; related?: readonly string[]; current?: string };

/**
 * The picker's groups with no search: the swap's Figma default ("Default in Figma"), the icons picked lately ("Recent",
 * at most MAX_RECENT_ICONS), the related ones ("Related", at most MAX_RELATED_ICONS), the file's icons ("Used in this
 * file", at most MAX_FILE_ICONS), then every icon (`all`, the caller's slice). Each suggestion shows once, in the first
 * group that has it, and never the icon shown now; an empty group is left out.
 */
export function iconGroups(all: readonly string[], { defaultIcon, fileIcons = [], recent = [], related = [], current }: IconSuggestions = {}): IconGroup[] {
  const groups: IconGroup[] = [];
  const shown = new Set<string>(current ? [current] : []);
  const take = (names: readonly string[], max: number) => {
    const out: string[] = [];
    for (const name of names) {
      if (out.length >= max) break;
      if (shown.has(name)) continue;
      shown.add(name);
      out.push(name);
    }
    return out;
  };
  if (defaultIcon) {
    groups.push({ id: "default", title: "Default in Figma", names: [defaultIcon] });
    shown.add(defaultIcon);
  }
  const lately = take(recent, MAX_RECENT_ICONS);
  if (lately.length) groups.push({ id: "recent", title: "Recent", names: lately });
  const alike = take(related, MAX_RELATED_ICONS);
  if (alike.length) groups.push({ id: "related", title: "Related", names: alike });
  const used = take(fileIcons, MAX_FILE_ICONS);
  if (used.length) groups.push({ id: "file", title: "Used in this file", names: used });
  groups.push({ id: "all", title: "All icons", names: [...all] });
  return groups;
}

/** The recent picks after picking `name`: it first, each once, at most `max` (stored in the browser by the picker). */
export function withRecent(recent: readonly string[], name: string, max = MAX_RECENT_ICONS * 2): string[] {
  return [name, ...recent.filter((other) => other !== name)].slice(0, max);
}

/* ── Related ───────────────────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Icons that mean the same kind of thing, and the words a label uses for it. `icons`: stems (the name without `icon-`,
 * its style and its number), best first; a stem also covers the stems it starts (`credit-card` → `credit-card-check`).
 * `words`: lower-case words of a label or a value beside the icon ("Revenue", "Active projects").
 */
export const ICON_TOPICS: readonly { id: string; icons: readonly string[]; words: readonly string[] }[] = [
  { id: "money", icons: ["coins", "coin", "wallet", "bank-note", "bank", "credit-card", "currency-dollar-circle", "currency-dollar", "currency-euro-circle", "receipt", "piggy-bank", "safe", "shield-dollar", "calculator", "sale", "percent", "scales"],
    words: ["revenue", "sales", "income", "margin", "margins", "cost", "costs", "spend", "spending", "budget", "budgets", "price", "prices", "pricing", "payment", "payments", "pay", "paid", "payout", "payouts", "invoice", "invoices", "balance", "profit", "money", "earnings", "expense", "expenses", "billing", "refund", "refunds", "mrr", "arr", "fee", "fees", "tax", "discount", "finance", "wallet", "bank", "cash", "salary", "funds", "funding"] },
  { id: "chart", icons: ["bar-chart", "line-chart-up", "pie-chart", "trend-up", "presentation-chart", "bar-chart-square", "horizontal-bar-chart", "activity", "line-chart-down", "trend-down", "chart-breakout-circle", "speedometer", "target", "file-chart"],
    words: ["growth", "rate", "conversion", "conversions", "traffic", "views", "pageviews", "sessions", "visits", "analytics", "performance", "stats", "statistics", "trend", "trends", "metrics", "report", "reports", "chart", "score", "average", "usage", "engagement", "retention", "churn", "bounce", "forecast", "kpi", "kpis"] },
  { id: "people", icons: ["users", "user", "user-circle", "user-check", "user-plus", "users-plus", "user-square", "face-smile", "image-user", "heart-hand"],
    words: ["users", "user", "customers", "customer", "members", "member", "team", "teams", "people", "visitors", "clients", "client", "employees", "staff", "contacts", "contact", "followers", "subscribers", "signups", "accounts", "account", "audience", "attendees", "guests", "students", "patients", "leads", "profile", "profiles", "owner", "owners", "assignee"] },
  { id: "time", icons: ["clock", "calendar", "alarm-clock", "hourglass", "clock-stopwatch", "clock-refresh", "calendar-check", "watch-circle", "clock-fast-forward"],
    words: ["time", "hours", "hour", "minutes", "duration", "schedule", "schedules", "deadline", "deadlines", "date", "dates", "due", "days", "uptime", "wait", "waiting", "events", "event", "meetings", "meeting", "appointments", "appointment", "booking", "bookings", "calendar", "overdue", "today", "week", "month", "timeline", "history", "recent", "utilization", "utilisation", "workload", "capacity"] },
  { id: "work", icons: ["folder", "briefcase", "file-check", "clipboard", "archive", "book-open", "bookmark", "kanban-chart-square", "layers-three", "file-new", "folder-check", "clipboard-check"],
    words: ["projects", "project", "tasks", "task", "files", "file", "documents", "document", "docs", "work", "portfolio", "notes", "note", "assignments", "backlog", "boards", "board", "workspace", "workspaces", "folders", "folder", "templates", "drafts", "archive"] },
  { id: "messages", icons: ["message-chat-circle", "mail", "message-circle", "message-text-circle", "send", "annotation", "phone", "bell", "at-sign", "mail-read", "message-dots-circle"],
    words: ["messages", "message", "emails", "email", "mail", "inbox", "chats", "chat", "conversations", "replies", "comments", "comment", "tickets", "ticket", "support", "calls", "call", "notifications", "notification", "feedback", "mentions", "invites", "invitations"] },
  { id: "shop", icons: ["shopping-cart", "shopping-bag", "shop-store", "package", "truck", "gift", "tag", "ticket", "package-check", "order"],
    words: ["orders", "order", "products", "product", "cart", "checkout", "shipping", "shipments", "deliveries", "delivery", "inventory", "stock", "items", "store", "stores", "shop", "purchases", "purchase", "returns", "sold", "catalog", "catalogue"] },
  { id: "security", icons: ["lock", "shield-tick", "shield", "key", "passcode-lock", "fingerprint", "face-id", "lock-unlocked", "lock-keyhole-circle", "check-verified"],
    words: ["security", "secure", "password", "passwords", "access", "login", "logins", "privacy", "permissions", "permission", "auth", "verified", "verification", "risk", "risks", "threats", "compliance", "roles"] },
  { id: "system", icons: ["server", "database", "cpu-chip", "hard-drive", "cloud", "code", "terminal", "dataflow", "git-branch", "zap", "monitor", "wifi"],
    words: ["server", "servers", "api", "requests", "deployments", "deploys", "deploy", "builds", "build", "storage", "database", "cpu", "memory", "bandwidth", "incidents", "latency", "code", "commits", "integrations", "integration", "webhooks", "logs", "jobs", "queue", "cloud"] },
  { id: "places", icons: ["globe", "marker-pin", "map", "building", "home", "compass", "navigation-pointer", "plane", "route", "hotel"],
    words: ["locations", "location", "countries", "country", "regions", "region", "cities", "city", "places", "place", "travel", "trips", "trip", "flights", "office", "offices", "address", "addresses", "distance", "world", "global", "home"] },
  { id: "goals", icons: ["award", "trophy", "star", "target", "flag", "certificate", "rocket", "thumbs-up", "heart", "check-circle", "stars"],
    words: ["goals", "goal", "achievements", "achievement", "rewards", "reward", "rating", "ratings", "reviews", "review", "favourites", "favorites", "likes", "wins", "milestones", "milestone", "satisfaction", "nps", "csat", "launches", "launch", "badges", "points", "level"] },
  { id: "settings", icons: ["settings", "sliders", "tool", "filter-lines", "filter-funnel", "toggle-right", "adjust"],
    words: ["settings", "preferences", "configuration", "config", "filters", "filter", "tools", "options", "controls", "setup"] },
  { id: "media", icons: ["image", "camera", "video", "film", "play-circle", "music-note", "microphone", "headphones", "clapperboard", "image-plus"],
    words: ["photos", "photo", "images", "image", "videos", "video", "media", "music", "podcasts", "podcast", "streams", "recordings", "gallery", "uploads", "camera", "audio"] },
  { id: "status", icons: ["alert-circle", "alert-triangle", "info-circle", "check-circle", "x-circle", "help-circle", "bell", "annotation-alert"],
    words: ["alerts", "alert", "errors", "error", "warnings", "warning", "issues", "issue", "failures", "failed", "status", "health", "pending", "blocked", "resolved"] },
];

/** `icon-coins-stacked-01-solid` → `coins-stacked`: the name without `icon-`, its style and its number. */
export function iconStem(name: string): string {
  return name.replace(/^icon-/, "").replace(/-(line|solid)(-[a-z]+)?$/, "").replace(/(-\d+)+$/, "");
}

/** `line` / `solid`, or "" for a name without one. */
export function iconStyle(name: string): string {
  return name.match(/-(line|solid)(-[a-z]+)?$/)?.[1] ?? "";
}

const startsStem = (stem: string, prefix: string) => stem === prefix || stem.startsWith(`${prefix}-`);
const topicsOfStem = (stem: string) => ICON_TOPICS.filter((topic) => topic.icons.some((prefix) => startsStem(stem, prefix)));

/** The topics the words of `text` name, in the order they come (at most MAX_WORD_TOPICS). */
export function topicsOfWords(text: string): string[] {
  const out: string[] = [];
  for (const word of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    for (const topic of ICON_TOPICS) {
      if (out.length < MAX_WORD_TOPICS && !out.includes(topic.id) && topic.words.includes(word)) out.push(topic.id);
    }
  }
  return out;
}

/**
 * The icons "Related" lists for the icon shown now (`current`, may be none) and the words beside it (`words`: the
 * selection's label or value, "Revenue $48,200"): first the icon's own family (the stems that start with its first word,
 * at most MAX_FAMILY), then the topics of those words, then the icon's own topics (a fair share of the tiles left each,
 * best first). One
 * icon per stem (coins-stacked-02 and -03 look alike), in the style of the icon shown (line / solid); `all` is the icon
 * set, whose order breaks ties.
 */
export function relatedIcons(current: string | undefined, all: readonly string[], words = "", max = MAX_RELATED_ICONS): string[] {
  const style = current ? iconStyle(current) : "";
  const stem = current ? iconStem(current) : "";
  // Each stem's first icon in the set, in the style of the icon shown when it has one.
  const byStem = new Map<string, string>();
  for (const name of all) {
    if (!name.startsWith("icon-") || name === current || (style && iconStyle(name) !== style)) continue;
    const key = iconStem(name);
    if (!byStem.has(key)) byStem.set(key, name);
  }
  const out: string[] = [];
  // A topic's stem, or the first stem it starts when the set has no plain one (`file` → `file-attachment`).
  const add = (key: string) => {
    const name = byStem.get(key) ?? byStem.get([...byStem.keys()].find((other) => startsStem(other, key)) ?? "");
    if (name && !out.includes(name) && out.length < max) out.push(name);
  };
  if (stem) {
    // Its family: coins → coins-hand, coins-swap, coin (a stem's own first word; "coin" and "coins" are one family).
    const first = stem.split("-")[0];
    const root = first.replace(/s$/, "");
    const family = [...byStem.keys()].filter((key) => key !== stem && [first, root, `${root}s`].includes(key.split("-")[0]));
    add(stem);
    for (const key of family) if (out.length < MAX_FAMILY) add(key);
  }
  const topics = [...new Set([...topicsOfWords(words), ...(stem ? topicsOfStem(stem).map((topic) => topic.id) : [])])];
  topics.forEach((id, index) => {
    // A fair share of the tiles left, so the words' topic ("Profit margin": money) leaves room for the icon's own (chart).
    const stop = out.length + Math.ceil((max - out.length) / (topics.length - index));
    for (const prefix of ICON_TOPICS.find((entry) => entry.id === id)?.icons ?? []) if (out.length < stop) add(prefix);
  });
  return out;
}

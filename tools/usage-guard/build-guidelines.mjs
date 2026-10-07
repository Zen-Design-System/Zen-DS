#!/usr/bin/env node
// Builds docs/guidelines/*.md (+ index.json for agents) from guidelines.source.mjs and the harness rule registry.
//   node tools/usage-guard/build-guidelines.mjs          write files
//   node tools/usage-guard/build-guidelines.mjs --check  fail if any generated file is stale
import fs from "node:fs";
import path from "node:path";
import { guidelines, keyboard } from "./guidelines.source.mjs";
import { rules, setDeprecatedProps } from "./check-usage.mjs";
import { buildApi, compactProps } from "../../scripts/build-api.mjs";
import { checkUnions } from "./check-unions.mjs";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const outDir = path.join(root, "docs/guidelines");
// Wrap bare JSX/HTML tag names (<button>, <Avatar>) in code spans so Markdown never renders them as HTML.
const safe = (text) => text.replace(/(^|[^`])(<\/?[A-Za-z][\w.-]*>)/g, "$1`$2`");
const list = (items) => items.map((item) => `- ${safe(item)}`).join("\n");

// JSX tags each guideline covers: a page lists every rule that checks its components,
// not only the rules whose primary guideline is this file (e.g. Toggle shows choice/needs-label).
const tagsFor = {
  button: ["Button", "IconButton"], chip: ["Chip", "ChipGroup"], input: ["InputField", "SelectField", "DateField", "NumberField", "TextAreaField", "AutocompleteField", "RichTextField"],
  search: ["Search"], segmented: ["Segmented"], toggle: ["Toggle"], checkbox: ["Checkbox"], "radio-button": ["RadioButton"], badge: ["Badge", "BadgeCounter"], tag: ["Tag"],
  avatar: ["Avatar", "AvatarStack"], popover: ["Popover"], sidebar: ["Sidebar"], "date-picker": ["DatePicker", "DateField"], tooltip: ["Tooltip"], tabs: ["Tabs"],
  breadcrumbs: ["Breadcrumbs"], progress: ["ProgressBar", "ProgressCircle"], dialog: ["Dialog", "ModalForm"], icon: ["Icon"],
  toast: ["Toast", "ToastStack", "ToastProvider"], "alert-banner": ["AlertBanner"], accordion: ["Accordion"], pagination: ["Pagination"], skeleton: ["SkeletonText", "SkeletonHeading", "SkeletonShape"],
  divider: ["Divider"], "inline-message": ["InlineMessage"], "empty-state": ["EmptyState"], stepper: ["Stepper"], slider: ["Slider"],
  card: ["Card"], "dock-icon": ["DockIcon"], "list-item": ["List", "ListItem", "ListBox", "ToggleListItem"], table: ["Table"],
  rating: ["Rating", "RatingDisplay", "OpinionScale", "NpsScale"], "color-selector": ["ColorSelector"], metric: ["Metric", "MetricCard", "MetricTrend"], uploader: ["FileUpload", "UploaderFileItem"], "side-panel": ["SidePanel"], "top-navigation": ["TopNavigation"], "bottom-navigation": ["BottomNavigation"], "bottom-sheet": ["BottomSheet"], chat: ["ChatMessage", "ChatComposer", "ChatThread", "ChatConversationItem", "ChatComposerReply", "ChatReplyQuote", "ChatEmojiPicker", "ChatReactorsPanel"], "ai-chat": ["AiChatBubble", "AiChatField", "AiChatBlock"], chart: ["LineChart", "StackBarChart", "ChartCard"], "file-icon": ["FileIcon"], flag: ["Flag"], provider: ["ZenProvider", "ZenPortalProvider"], layout: ["Stack", "Grid", "Box", "Container"], text: ["Text", "Heading"], "app-shell": ["AppShell", "AppShellAction", "AppShellAccount"], "page-header": ["PageHeader"], link: ["Link"], menu: ["Menu", "MenuItem", "MenuSeparator", "MenuGroup"], form: ["Form", "FormField", "FormFieldset", "FormActions"], "description-list": ["DescriptionList", "DescriptionItem"], "action-bar": ["ActionBar"], image: ["Image", "Thumbnail"], "visually-hidden": ["VisuallyHidden"],
};
// Props API from the TSX source (react-docgen): docs/api/<slug>.json, a Props table per page, compact lines in index.json.
const api = buildApi(tagsFor);
// api/deprecated-prop lists the components with deprecated props: take them from this build, not from the docs on disk.
setDeprecatedProps([...api.bySlug.values()]);
const cell = (text) => String(text ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").trim();
const propsSection = (slug) => {
  const entry = api.bySlug.get(slug);
  if (!entry) return [];
  return [
    "## Props",
    `Generated from the TypeScript source; full JSON in \`docs/api/${slug}.json\`.`,
    "",
    ...entry.components.flatMap((component) => [
      `### ${component.name}`,
      ...(component.description ? [safe(component.description.replace(/\s+/g, " ")), ""] : []),
      ...(component.extends ? [`Also accepts \`${component.extends}\`.`, ""] : []),
      "| Prop | Type | Default | Description |",
      "| --- | --- | --- | --- |",
      ...component.props.map((prop) => `| \`${prop.name}\`${prop.required ? " (required)" : ""} | ${prop.type === "unknown" ? "_HTML attribute_" : `\`${cell(prop.type)}\``} | ${prop.default === null ? "—" : `\`${cell(prop.default)}\``} | ${prop.deprecated ? `**Deprecated:** ${cell(prop.deprecated)} ` : ""}${cell(safe(prop.description))} |`),
      "",
    ]),
    ...(Object.keys(entry.types ?? {}).length ? ["### Types", "Object shapes the props above refer to.", "", "```ts", ...Object.values(entry.types), "```", ""] : []),
  ];
};
const rulesFor = (g) => rules.filter((r) => r.guideline === `docs/guidelines/${g.slug}.md` || r.components.some((c) => (tagsFor[g.slug] ?? []).includes(c)));
const files = new Map();
for (const g of guidelines) {
  const file = `docs/guidelines/${g.slug}.md`;
  const harness = rulesFor(g);
  const md = [
    `<!-- Generated by tools/usage-guard/build-guidelines.mjs from guidelines.source.mjs — edit the source, not this file. -->`,
    `# ${g.title}`,
    "",
    `**Figma:** ${g.figma}  `,
    `**Import:** \`${g.import}\``,
    "",
    g.purpose,
    "",
    "## Use it for",
    list(g.use),
    "",
    "## Use something else for",
    list(g.avoid),
    "",
    "## Figma → React",
    "| Figma | Prop | Values / notes |",
    "| --- | --- | --- |",
    ...g.api.map(([figma, prop, values]) => `| ${figma} | \`${prop}\` | ${values} |`),
    "",
    ...propsSection(g.slug),
    ...((keyboard[g.slug] ?? []).length ? ["## Keyboard", "| Keys | Action |", "| --- | --- |", ...keyboard[g.slug].map(([keys, action]) => `| ${keys} | ${action} |`), ""] : []),
    "## ✅ Do",
    list(g.do),
    "",
    "## ❌ Don't",
    list(g.dont),
    "",
    "## Accessibility",
    list(g.a11y),
    ...(g.content.length ? ["", "## Content", list(g.content)] : []),
    "",
    "## Harness (`npm run usage:check`)",
    harness.length
      ? ["| Rule | Severity | Checks | Suppress with |", "| --- | --- | --- | --- |", ...harness.map((r) => `| \`${r.id}\` | ${r.severity} | ${r.summary} | \`zen-allow-${r.allow}: <reason>\` |`)].join("\n")
      : "_No machine-checkable rules yet. Follow the Do/Don't lists above._",
    "",
    "## References",
    list(g.refs.map(([name, url]) => `[${name}](${url})`)),
    "",
  ].join("\n");
  files.set(path.join(outDir, `${g.slug}.md`), md);
}

const index = {
  $comment: "Generated. Zen DS component guidelines for AI agents: pick a component by use/avoid, then read its markdown (Do/Don't + Props) or docs/api/<slug>.json; run `npm run usage:check` to enforce the harness rules.",
  components: guidelines.map((g) => {
    const entry = api.bySlug.get(g.slug);
    return {
      slug: g.slug, title: g.title, file: `docs/guidelines/${g.slug}.md`, ...(entry ? { apiFile: `docs/api/${g.slug}.json` } : {}),
      figma: g.figma, import: entry?.import ?? g.import, purpose: g.purpose, use: g.use, avoid: g.avoid,
      // Compact props for the main tags only; sub-parts, keyboard and a11y live in the markdown and docs/api.
      ...(entry ? { props: Object.fromEntries(entry.components.filter((component) => (tagsFor[g.slug] ?? []).includes(component.name)).map((component) => [component.name, compactProps(component)])) } : {}),
      do: g.do, dont: g.dont,
      rules: rulesFor(g).map((r) => r.id),
    };
  }),
};
for (const [slug, entry] of api.bySlug) files.set(path.join(root, "docs/api", `${slug}.json`), JSON.stringify(entry, null, 2) + "\n");
files.set(path.join(root, "src/platform/api.generated.json"), JSON.stringify(Object.fromEntries([...api.bySlug].map(([slug, entry]) => [slug, entry.components.map(({ name, extends: base, props }) => ({ name, extends: base, props }))])), null, 2) + "\n");
files.set(path.join(outDir, "index.json"), JSON.stringify(index, null, 2) + "\n");
// Platform copy: the component pages render Do/Don't from this file (same source, no drift).
files.set(path.join(root, "src/platform/guidelines.generated.json"), JSON.stringify(Object.fromEntries(guidelines.map((g) => [g.slug, {
  title: g.title, purpose: g.purpose, use: g.use, avoid: g.avoid, api: g.api, keyboard: keyboard[g.slug] ?? [], do: g.do, dont: g.dont, a11y: g.a11y, content: g.content, refs: g.refs,
  file: `docs/guidelines/${g.slug}.md`,
  rules: rulesFor(g).map(({ id, severity, summary, allow }) => ({ id, severity, summary, allow })),
}])), null, 2) + "\n");
files.set(path.join(outDir, "README.md"), [
  "<!-- Generated by tools/usage-guard/build-guidelines.mjs -->",
  "# Zen DS component guidelines",
  "",
  "Every component ships with usage guidelines (Do / Don't) **and** harness rules. A component is not done until both exist (see the definition of done in `docs/component-usage-rules.md`).",
  "",
  "- Humans: open a component file below.",
  "- AI agents: read `index.json` (use/avoid, compact props, Do/Don't), open `<slug>.md` or `../api/<slug>.json` for the full props, then run `npm run usage:check`. `npm run usage:rules` prints the rule registry as JSON.",
  "",
  "| Component | Rules |",
  "| --- | --- |",
  ...guidelines.map((g) => `| [${g.title}](${g.slug}.md) | ${rulesFor(g).map((r) => `\`${r.id}\``).join(", ") || "—"} |`),
  "",
].join("\n"));

// llms.txt (llmstxt.org): the index an AI loads first; ships in the package next to AGENTS.consumer.md.
files.set(path.join(root, "llms.txt"), [
  "# Zen Design System",
  "",
  "> React 19 components, design tokens and icons generated from the Zen Figma library. Import \"@zen/design-system/styles.css\" once, wrap the app in <ZenProvider>, and pick components from docs/guidelines/index.json by purpose / use / avoid.",
  "",
  "## Start here",
  "",
  "- [AGENTS.consumer.md](AGENTS.consumer.md): setup, the rules that go wrong most often, API facts, icons, styling",
  "- [docs/getting-started.md](docs/getting-started.md): install, entry points, ZenProvider modes, dark mode, mobile, icons, fonts",
  "- [docs/guidelines/index.json](docs/guidelines/index.json): every component with purpose, use/avoid, compact props, Do/Don't and harness rules",
  "",
  "## Components",
  "",
  ...guidelines.map((g) => `- [${g.title}](docs/guidelines/${g.slug}.md): ${g.purpose.replace(/\s+/g, " ")}${api.bySlug.has(g.slug) ? ` Props: docs/api/${g.slug}.json` : ""}`),
  "",
  "## Optional",
  "",
  "- [AGENTS.md](AGENTS.md): working inside the Zen DS repo (definition of done, commands, layout); repo only",
  "- [docs/component-usage-rules.md](docs/component-usage-rules.md): cross-component rules (buttons, borders, content colours, background layers); repo only",
  "",
].join("\n"));

// Every rule must point at an existing guideline.
const orphans = rules.filter((r) => !files.has(path.join(root, r.guideline)));
if (orphans.length) { console.error(`✗ Rules without a guideline file: ${orphans.map((r) => `${r.id} → ${r.guideline}`).join(", ")}`); process.exit(1); }

if (process.argv.includes("--check")) {
  const stale = [...files].filter(([file, content]) => !fs.existsSync(file) || fs.readFileSync(file, "utf8") !== content).map(([file]) => path.relative(root, file));
  if (stale.length) { console.error(`✗ Guidelines are stale: ${stale.join(", ")}. Run npm run guidelines:build.`); process.exit(1); }
  // Documented unions must list exactly the TS type's members (check-unions.mjs, backlog batch 9).
  const types = Object.assign({}, ...[...api.bySlug.values()].map((entry) => entry.types ?? {}));
  const unions = checkUnions(api.components, types, root);
  if (unions.mismatches.length) { console.error(`✗ Documented unions differ from the TypeScript source:\n  ${unions.mismatches.join("\n  ")}\nFix scripts/build-api.mjs (or the type), then npm run guidelines:build.`); process.exit(1); }
  console.log(`✓ Guidelines up to date (${guidelines.length} components; ${unions.checked} documented unions match the source, ${unions.skipped} not resolvable).`);
} else {
  fs.mkdirSync(outDir, { recursive: true });
  for (const [file, content] of files) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); }
  console.log(`✓ Wrote ${files.size} files (docs/guidelines, docs/api, platform JSON) (${guidelines.length} guidelines, ${api.components.size} components, ${rules.length} rules).`);
  if (api.unassigned.length) console.warn(`! Public components without a guideline slug (add them to tagsFor): ${api.unassigned.join(", ")}`);
}

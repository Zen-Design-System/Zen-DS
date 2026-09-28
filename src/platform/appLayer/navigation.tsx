import { createContext, forwardRef, useContext, useRef, useState, type AnchorHTMLAttributes, type KeyboardEvent } from "react";
import { Avatar } from "../../components/Avatar";
import { Badge, type BadgeTheme } from "../../components/Badge";
import { Button, IconButton } from "../../components/Button";
import { Card } from "../../components/Card";
import { Dialog } from "../../components/Dialog";
import { FileIcon, fileIconFormatOf } from "../../components/FileIcon";
import { Icon } from "../../components/Icon";
import { InlineMessage } from "../../components/InlineMessage";
import { InputField } from "../../components/Input";
import { Box, Grid, Stack } from "../../components/Layout";
import { Link, type LinkTone, type LinkUnderline } from "../../components/Link";
import { List, ListItem } from "../../components/ListItem";
import { Menu, MenuItem, type MenuEntry, type MenuItemData } from "../../components/Menu";
import { Sidebar, type SidebarSection } from "../../components/Sidebar";
import { Table, TableActions, TableText } from "../../components/Table";
import { Heading, Text, plural } from "../../components/Text";
import { TopNavigation } from "../../components/TopNavigation";
import { VisuallyHidden } from "../../components/VisuallyHidden";
import type { TypographyStyleName } from "../../tokens/typography.generated";
import { PlatformPhone } from "../PlatformPhone";
import { avatarOf, mobilePeople } from "../PlatformMobileData";
import { figmaSidebarBrand } from "../PlatformSidebarBrand";
import { Panel, PlaygroundFilterChip, PlaygroundToggle, option } from "./shared";
import type { AppLayerPage, AppLayerPageMeta, ExampleMap } from "./types";
import "./navigation.css";

/* App-layer group "navigation": Link and Menu pages (playground + examples) and a Sidebar links example. */

/* ───────────── Demo routing ───────────── */

/** The examples navigate inside their card instead of leaving the docs, like an app's client-side router would. */
const DemoNavigate = createContext<(path: string) => void>(() => undefined);

type DemoRouterLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  /** Destination, React Router style (`<Link as={RouterLink} to="/x">`). */
  to?: string;
  /** Destination as an href (Next.js style, and what Sidebar `linkAs` passes). */
  href?: string;
};

/** Stand-in for a router's link: a real `<a href>` (focusable, announced as a link) that navigates in-page. */
const DemoRouterLink = forwardRef<HTMLAnchorElement, DemoRouterLinkProps>(function DemoRouterLink({ to, href, onClick, ...rest }, ref) {
  const navigate = useContext(DemoNavigate);
  const path = to ?? href ?? "/";
  return (
    <a
      {...rest}
      ref={ref}
      href={`#${path}`}
      onClick={(event) => {
        onClick?.(event);
        // Modified clicks keep the browser's own behaviour (open in a new tab…), like a real router link.
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        navigate(path);
      }}
    />
  );
});

const GITHUB_ACTIONS_DOCS = "https://docs.github.com/en/actions";
const MDN_AUTHORIZATION = "https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Authorization";

/* ───────────── Link: playground ───────────── */

const linkTextStyles: TypographyStyleName[] = ["Body/Base/Regular", "Body/Small/Regular", "Body/Extra/Regular", "Caption/Regular"];

function LinkPlayground() {
  const [underline, setUnderline] = useState<LinkUnderline>("hover");
  const [tone, setTone] = useState<LinkTone>("hyperlink");
  const [textStyle, setTextStyle] = useState<TypographyStyleName>("Body/Base/Regular");
  const [external, setExternal] = useState(false);
  const [visited, setVisited] = useState(false);
  const [opened, setOpened] = useState<string>();
  const label = external ? "the GitHub Actions docs" : "deploy settings";
  const props = [
    external ? `href="${GITHUB_ACTIONS_DOCS}"` : `href="/settings/deploys"`,
    external ? "external" : "",
    underline !== (tone === "inherit" ? "always" : "hover") ? `underline="${underline}"` : "",
    tone !== "hyperlink" ? `tone="${tone}"` : "",
    visited && tone === "hyperlink" ? "visited" : "",
  ].filter(Boolean).join(" ");
  return (
    <Panel
      title="Link"
      controls={<>
        <PlaygroundFilterChip label="Underline" value={underline} onChange={(value) => setUnderline((String(value) || "hover") as LinkUnderline)} options={[option("hover", "Hover (default)"), option("always", "Always"), option("none", "None")]} />
        <PlaygroundFilterChip label="Tone" value={tone} onChange={(value) => { const next = (String(value) || "hyperlink") as LinkTone; setTone(next); setUnderline(next === "inherit" ? "always" : "hover"); }} options={[option("hyperlink", "Hyperlink"), option("inherit", "Inherit")]} />
        <PlaygroundFilterChip label="Text style" value={textStyle} onChange={(value) => setTextStyle((String(value) || "Body/Base/Regular") as TypographyStyleName)} options={linkTextStyles.map((id) => option(id))} />
        <PlaygroundToggle label="External" selected={external} onChange={(on) => { setExternal(on); setOpened(undefined); }} />
        <PlaygroundToggle label="Visited" selected={visited} onChange={setVisited} />
      </>}
      code={`import { Link, Text } from "@zen/design-system";

<Text${textStyle === "Body/Base/Regular" ? "" : ` textStyle="${textStyle}"`} tone="base">
  Deploys run on every push to main. To change the branch, open{" "}
  <Link ${props}>${label}</Link>.
</Text>`}
    >
      <Stack gap="xs" className="pan-stage">
        <Text textStyle={textStyle} tone="base">
          Deploys run on every push to main. To change the branch, open{" "}
          {external
            ? <Link href={GITHUB_ACTIONS_DOCS} external underline={underline} tone={tone} visited={visited} onClick={() => setOpened(GITHUB_ACTIONS_DOCS)}>{label}</Link>
            : <Link href="/settings/deploys" underline={underline} tone={tone} visited={visited} onClick={(event) => { event.preventDefault(); setOpened("/settings/deploys"); }}>{label}</Link>}
          .
        </Text>
        <Text textStyle="Body/Small/Regular" tone="light" role="status">
          {opened ? (external ? `Opened ${opened} in a new tab.` : `Navigated to ${opened} (in-app).`) : "Tab to the link and press Enter, or click it."}
        </Text>
      </Stack>
    </Panel>
  );
}

/* ───────────── Link: examples ───────────── */

function RunningTextExample() {
  const [path, setPath] = useState<string>();
  return (
    <DemoNavigate value={setPath}>
      <Card theme="shadow">
        <Stack gap="sm">
          <Heading level={3} textStyle="Body/Extra/Medium">Two-factor authentication</Heading>
          <Text tone="base">
            Sign-in now asks for a code from your authenticator app. If you lose your phone, sign in with one of your{" "}
            <Link as={DemoRouterLink} to="/settings/security/recovery-codes" underline="always">recovery codes</Link> or ask a{" "}
            <Link as={DemoRouterLink} to="/settings/members?role=admin" underline="always">workspace admin</Link> to reset it.
          </Text>
          <Text textStyle="Body/Small/Regular" tone="light" role="status">{path ? `Navigated to ${path}` : "Links in a paragraph are always underlined."}</Text>
        </Stack>
      </Card>
    </DemoNavigate>
  );
}

function ExternalLinkExample() {
  const [opened, setOpened] = useState(false);
  return (
    <Stack gap="sm">
      <InlineMessage theme="info" title="Send the key as a Bearer token">
        Put it in the Authorization header of every request.{" "}
        <Link href={MDN_AUTHORIZATION} external underline="always" onClick={() => setOpened(true)}>Authorization header on MDN</Link>
      </InlineMessage>
      <Text textStyle="Body/Small/Regular" tone="light" role="status">
        {opened ? "MDN opened in a new tab; this page kept its place." : "The icon and a hidden “(opens in a new tab)” say it leaves the app."}
      </Text>
    </Stack>
  );
}

const activity = [
  { id: "a1", person: mobilePeople.ava, verb: "commented on", title: "Checkout button misaligned on Safari", path: "/issues/1042", time: "2 min ago" },
  { id: "a2", person: mobilePeople.bao, verb: "closed", title: "Token rename: Surface/Alt", path: "/issues/1038", time: "40 min ago" },
  { id: "a3", person: mobilePeople.chi, verb: "assigned you", title: "Sidebar flyout focus order", path: "/issues/1031", time: "Yesterday" },
];

function RouterLinksExample() {
  const [path, setPath] = useState("/activity");
  const open = activity.find((item) => item.path === path);
  return (
    <DemoNavigate value={setPath}>
      <Card theme="shadow" spacing="small">
        {open ? (
          <Stack gap="sm" padding="xs">
            <Text textStyle="Body/Small/Regular" tone="light"><Link as={DemoRouterLink} to="/activity">Activity</Link> / {open.path}</Text>
            <Heading level={3} textStyle="Heading/4">{open.title}</Heading>
            <Text tone="base">{open.person.name} {open.verb} this issue {open.time.toLowerCase()}.</Text>
          </Stack>
        ) : (
          <List aria-label="Activity">
            {activity.map((item) => (
              <ListItem key={item.id} title={item.title} leading={<Avatar size="medium" alt="" {...avatarOf(item.person)} />}>
                <Stack gap="3xs">
                  <Text as="span">{item.person.name} {item.verb} <Link as={DemoRouterLink} to={item.path}>{item.title}</Link></Text>
                  <Text as="span" textStyle="Body/Small/Regular" tone="light">{item.time}</Text>
                </Stack>
              </ListItem>
            ))}
          </List>
        )}
      </Card>
    </DemoNavigate>
  );
}

function LegalLinksExample() {
  const [path, setPath] = useState<string>();
  return (
    <DemoNavigate value={setPath}>
      <Stack gap="md">
        <Text textStyle="Body/Small/Regular" tone="light">
          By creating an account you agree to the <Link as={DemoRouterLink} to="/legal/terms" tone="inherit">Terms of service</Link> and
          confirm you have read the <Link as={DemoRouterLink} to="/legal/privacy" tone="inherit">Privacy policy</Link>.
        </Text>
        <Stack as="nav" aria-label="Footer" direction="row" gap="md" wrap>
          <Text as="span" textStyle="Body/Small/Regular" tone="light">© 2026 Zen Studio</Text>
          <Text as="span" textStyle="Body/Small/Regular"><Link as={DemoRouterLink} to="/status">Status</Link></Text>
          <Text as="span" textStyle="Body/Small/Regular"><Link as={DemoRouterLink} to="/changelog">Changelog</Link></Text>
        </Stack>
        <Text textStyle="Body/Small/Regular" tone="base" role="status">{path ? `Navigated to ${path}` : "Inside the sentence the links take its colour and stay underlined."}</Text>
      </Stack>
    </DemoNavigate>
  );
}

function MobileSignInExample() {
  const [screen, setScreen] = useState<"sign-in" | "reset" | "sign-up">("sign-in");
  const [email, setEmail] = useState("ava.chen@zen.studio");
  const [sent, setSent] = useState(false);
  const back = () => { setScreen("sign-in"); setSent(false); };
  const title = screen === "reset" ? "Reset password" : screen === "sign-up" ? "Create account" : "Sign in";
  return (
    <DemoNavigate value={(path) => setScreen(path === "/reset-password" ? "reset" : "sign-up")}>
      <PlatformPhone label="Sign in"
        header={<TopNavigation type="compact" title={title} leading={screen === "sign-in" ? undefined : { icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
        footer={screen === "sign-in" ? (
          <div className="pe-phone-cta">
            <Button level="primary" size="lg" onClick={() => setSent(true)}>Sign in</Button>
            <Text textStyle="Body/Small/Regular" tone="light" align="center">
              New to Zen? <Link as={DemoRouterLink} to="/sign-up" underline="always">Create an account</Link>
            </Text>
          </div>
        ) : undefined}>
        <Stack gap="md" padding="lg">
          {screen === "sign-in" ? <>
            <InputField label="Work email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <InputField label="Password" type="password" defaultValue="correct horse battery" />
            <Text textStyle="Body/Small/Regular"><Link as={DemoRouterLink} to="/reset-password">Forgot password?</Link></Text>
            {sent ? <Text textStyle="Body/Small/Regular" tone="positive" role="status">Signed in as {email}.</Text> : null}
          </> : screen === "reset" ? <>
            <Text tone="base">We'll email a reset link to {email}. It works for 30 minutes.</Text>
            <Stack align="stretch"><Button level="primary" size="lg" onClick={() => setSent(true)}>Send reset link</Button></Stack>
            {sent ? <Text textStyle="Body/Small/Regular" tone="positive" role="status">Reset link sent to {email}.</Text> : null}
          </> : <>
            <Text tone="base">Create a workspace for your team. You can invite people later.</Text>
            <InputField label="Work email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Stack align="stretch"><Button level="primary" size="lg" onClick={() => setSent(true)}>Continue</Button></Stack>
            {sent ? <Text textStyle="Body/Small/Regular" tone="positive" role="status">We sent a confirmation email to {email}.</Text> : null}
          </>}
        </Stack>
      </PlatformPhone>
    </DemoNavigate>
  );
}

/* ───────────── Menu: playground ───────────── */

type PlaygroundItemKey = "rename" | "duplicate" | "move" | "download" | "share" | "delete";
const playgroundItems: Record<PlaygroundItemKey, { label: string; icon: MenuItemData["icon"] & string; shortcut: string }> = {
  rename: { label: "Rename", icon: "icon-edit-02-line", shortcut: "F2" },
  duplicate: { label: "Duplicate", icon: "icon-duplicate-line", shortcut: "⌘D" },
  move: { label: "Move to…", icon: "icon-folder-line", shortcut: "⇧⌘M" },
  download: { label: "Download", icon: "icon-download-01-line", shortcut: "⇧⌘S" },
  share: { label: "Share", icon: "icon-share-01-line", shortcut: "⇧⌘L" },
  delete: { label: "Delete", icon: "icon-trash-line", shortcut: "⌫" },
};

function MenuPlayground() {
  const [trigger, setTrigger] = useState("icon");
  const [align, setAlign] = useState<"start" | "end">("end");
  const [icons, setIcons] = useState(true);
  const [shortcuts, setShortcuts] = useState(false);
  const [groups, setGroups] = useState(false);
  const [danger, setDanger] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [last, setLast] = useState<string>();
  const item = (key: PlaygroundItemKey): MenuItemData => ({
    id: key,
    label: playgroundItems[key].label,
    ...(icons ? { icon: playgroundItems[key].icon } : {}),
    ...(shortcuts ? { shortcut: playgroundItems[key].shortcut } : {}),
    ...(key === "share" && disabled ? { disabled: true, caption: "Only owners can share" } : {}),
    ...(key === "delete" ? { danger: true } : {}),
  });
  const tail: MenuEntry[] = danger ? [{ type: "separator" }, item("delete")] : [];
  const entries: MenuEntry[] = groups
    ? [{ type: "group", label: "Edit", items: [item("rename"), item("duplicate"), item("move")] }, { type: "group", label: "Share", items: [item("download"), item("share")] }, ...tail]
    : [item("rename"), item("duplicate"), item("move"), { type: "separator" }, item("download"), item("share"), ...tail];
  const itemCode = (entry: MenuItemData) => `{ ${[`id: "${entry.id}"`, `label: "${entry.label}"`, entry.icon ? `icon: "${String(entry.icon)}"` : "", entry.shortcut ? `shortcut: "${entry.shortcut}"` : "", entry.caption ? `caption: "${String(entry.caption)}"` : "", entry.disabled ? "disabled: true" : "", entry.danger ? "danger: true" : ""].filter(Boolean).join(", ")} }`;
  const entryCode = (entry: MenuEntry, indent: string): string => entry.type === "separator" ? `${indent}{ type: "separator" },`
    : entry.type === "group" ? `${indent}{ type: "group", label: "${entry.label}", items: [\n${entry.items.map((child) => entryCode(child, `${indent}  `)).join("\n")}\n${indent}] },`
      : `${indent}${itemCode(entry)},`;
  const triggerCode = trigger === "icon"
    // zen-allow-no-action: the Menu trigger in the generated code; <Menu trigger> wires its click, keys and ARIA.
    ? `<IconButton appearance="flat" level="primary" aria-label="Actions for Q4 roadmap.pdf" icon={<Icon name="icon-dots-horizontal-line" />} />`
    : `<Button level="tertiary" size="sm" endIcon={<Icon name="icon-chevron-down-line" />}>Actions</Button>`;
  return (
    <Panel
      title="Menu"
      controls={<>
        <PlaygroundFilterChip label="Trigger" value={trigger} onChange={(value) => setTrigger(String(value) || "icon")} options={[option("icon", "Icon button"), option("button", "Button")]} />
        <PlaygroundFilterChip label="Align" value={align} onChange={(value) => setAlign((String(value) || "end") as "start" | "end")} options={[option("start", "Start"), option("end", "End")]} />
        <PlaygroundToggle label="Icons" selected={icons} onChange={setIcons} />
        <PlaygroundToggle label="Shortcuts" selected={shortcuts} onChange={setShortcuts} />
        <PlaygroundToggle label="Groups" selected={groups} onChange={setGroups} />
        <PlaygroundToggle label="Danger item" selected={danger} onChange={setDanger} />
        <PlaygroundToggle label="Disabled item" selected={disabled} onChange={setDisabled} />
      </>}
      code={`import { Button, Icon, IconButton, Menu } from "@zen/design-system";

<Menu${align === "end" ? ` align="end"` : ""}
  trigger={${triggerCode}}
  items={[
${entries.map((entry) => entryCode(entry, "    ")).join("\n")}
  ]}
  onSelect={(item) => run(item.id)}
/>`}
    >
      <Stack gap="xs" className="pan-file-row">
        <Box surface="surface" border="pale" radius="lg" padding="sm">
          <Stack direction="row" gap="sm" align="center">
            <FileIcon format="pdf" size={32} />
            <Stack gap="3xs" style={{ flex: 1, minWidth: 0 }}>
              <Text textStyle="Body/Base/Medium" truncate>Q4 roadmap.pdf</Text>
              <Text textStyle="Body/Small/Regular" tone="light">2.4 MB · Edited 2 hours ago</Text>
            </Stack>
            <Menu
              align={align}
              trigger={trigger === "icon"
                // zen-allow-no-action: a Menu trigger chosen by the playground; <Menu trigger> wires its click, keys and ARIA.
                ? <IconButton appearance="flat" level="primary" aria-label="Actions for Q4 roadmap.pdf" icon={<Icon name="icon-dots-horizontal-line" />} />
                : <Button level="tertiary" size="sm" endIcon={<Icon name="icon-chevron-down-line" />}>Actions</Button>}
              items={entries}
              onSelect={(chosen) => setLast(chosen.label)}
            />
          </Stack>
        </Box>
        <Text textStyle="Body/Small/Regular" tone="light" role="status">{last ? `Chose “${last}”.` : "Open the menu with a click, Enter, Space or ↓."}</Text>
      </Stack>
    </Panel>
  );
}

/* ───────────── Menu: examples ───────────── */

type Invoice = { id: string; number: string; customer: string; amount: number; due: string; status: "paid" | "open" | "overdue" };
const invoiceSeed: Invoice[] = [
  { id: "1042", number: "INV-1042", customer: "Northwind Traders", amount: 1280, due: "12 Oct 2026", status: "open" },
  { id: "1041", number: "INV-1041", customer: "Contoso Ltd.", amount: 4950.5, due: "3 Oct 2026", status: "overdue" },
  { id: "1040", number: "INV-1040", customer: "Fabrikam Studio", amount: 760, due: "28 Sep 2026", status: "paid" },
  { id: "1039", number: "INV-1039", customer: "Tailspin Toys", amount: 2310, due: "20 Sep 2026", status: "paid" },
];
const money = (value: number) => value.toLocaleString("en-US", { style: "currency", currency: "USD" });
const invoiceStatus: Record<Invoice["status"], { label: string; theme: BadgeTheme }> = { paid: { label: "Paid", theme: "green" }, open: { label: "Open", theme: "blue" }, overdue: { label: "Overdue", theme: "red" } };

function TableRowMenuExample() {
  const [rows, setRows] = useState(invoiceSeed);
  const [note, setNote] = useState<string>();
  const [pending, setPending] = useState<Invoice | null>(null);
  const run = (invoice: Invoice, action: string) => {
    if (action === "view") setNote(`Opened ${invoice.number}.`);
    else if (action === "download") setNote(`Downloading ${invoice.number}.pdf…`);
    else if (action === "duplicate") {
      const next = Math.max(...rows.map((row) => Number(row.id))) + 1;
      setRows((current) => [{ ...invoice, id: String(next), number: `INV-${next}`, status: "open", due: "27 Oct 2026" }, ...current]);
      setNote(`Created INV-${next} from ${invoice.number}.`);
    } else if (action === "paid") {
      setRows((current) => current.map((row) => (row.id === invoice.id ? { ...row, status: "paid" } : row)));
      setNote(`${invoice.number} marked as paid.`);
    } else if (action === "delete") setPending(invoice);
  };
  return (
    <Stack gap="sm">
      <Table
        aria-label="Invoices"
        rows={rows}
        getRowId={(row) => row.id}
        columns={[
          { id: "number", header: "Invoice", cell: (row) => <TableText bold caption={<span className="pan-nowrap">Due {row.due}</span>}><span className="pan-nowrap">{row.number}</span></TableText> },
          { id: "customer", header: "Customer", cell: (row) => <TableText>{row.customer}</TableText> },
          { id: "amount", header: "Amount", align: "right", cell: (row) => <TableText>{money(row.amount)}</TableText> },
          { id: "status", header: "Status", cell: (row) => <Badge size="medium" theme={invoiceStatus[row.status].theme} background="subtle">{invoiceStatus[row.status].label}</Badge> },
          {
            id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "64px",
            cell: (row) => (
              <TableActions>
                <Menu
                  align="end"
                  trigger={<IconButton appearance="flat" level="primary" size="md" aria-label={`Actions for ${row.number}`} icon={<Icon name="icon-dots-horizontal-line" />} />}
                  items={[
                    { id: "view", label: "View invoice", icon: "icon-eye-line" },
                    { id: "download", label: "Download PDF", icon: "icon-download-01-line" },
                    { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line" },
                    { id: "paid", label: "Mark as paid", icon: "icon-check-circle-line", disabled: row.status === "paid" },
                    { type: "separator" },
                    { id: "delete", label: "Delete invoice", icon: "icon-trash-line", danger: true },
                  ]}
                  onSelect={(item) => run(row, item.id)}
                />
              </TableActions>
            ),
          },
        ]}
      />
      <Text textStyle="Body/Small/Regular" tone="light" role="status">{note ?? "Each row has its own menu; it opens above the table's scroll box."}</Text>
      <Dialog
        open={pending !== null}
        onOpenChange={(next) => { if (!next) setPending(null); }}
        theme="negative"
        title={`Delete ${pending?.number ?? "invoice"}?`}
        description="The invoice and its payment history are removed for everyone. This can't be undone."
        primaryAction={{ label: "Delete invoice", level: "danger", onClick: () => { if (pending) { setRows((current) => current.filter((row) => row.id !== pending.id)); setNote(`Deleted ${pending.number}.`); } setPending(null); } }}
        secondaryAction={{ label: "Cancel", onClick: () => setPending(null) }}
      />
    </Stack>
  );
}

type Doc = { id: string; title: string; meta: string; pinned: boolean };
const docSeed: Doc[] = [
  { id: "roadmap", title: "Q4 roadmap", meta: "Edited by Duy Le · 40 min ago", pinned: true },
  { id: "critique", title: "Design critique notes", meta: "Edited by Chi Tran · Wednesday", pinned: false },
  { id: "hiring", title: "Hiring plan 2027", meta: "Edited by Ava Chen · 3 days ago", pinned: false },
];

function CardMenuExample() {
  const [docs, setDocs] = useState(docSeed);
  const [removed, setRemoved] = useState<Doc | null>(null);
  const [note, setNote] = useState<string>();
  const act = (doc: Doc, id: string) => {
    if (id === "pin") { setDocs((current) => current.map((item) => (item.id === doc.id ? { ...item, pinned: !item.pinned } : item))); setNote(doc.pinned ? `Unpinned “${doc.title}”.` : `Pinned “${doc.title}” to the top.`); }
    else if (id === "copy") { void navigator.clipboard?.writeText(`https://zen.studio/docs/${doc.id}`).catch(() => undefined); setNote(`Copied the link to “${doc.title}”.`); }
    else if (id === "duplicate") { setDocs((current) => [...current, { ...doc, id: `${doc.id}-copy-${current.length}`, title: `${doc.title} (copy)`, meta: "Edited by you · just now", pinned: false }]); setNote(`Duplicated “${doc.title}”.`); }
    else if (id === "delete") { setDocs((current) => current.filter((item) => item.id !== doc.id)); setRemoved(doc); setNote(`Deleted “${doc.title}”.`); }
  };
  const sorted = [...docs].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  return (
    <Stack gap="sm">
      <Grid minColumnWidth={200} gap="sm">
        {sorted.map((doc) => (
          <Card key={doc.id} as="article" theme="shadow" spacing="small"
            subAction={<Menu align="end"
              trigger={<IconButton appearance="flat" level="primary" size="sm" aria-label={`More actions for ${doc.title}`} icon={<Icon name="icon-dots-horizontal-line" />} />}
              items={[
                { id: "pin", label: doc.pinned ? "Unpin" : "Pin to top", icon: "icon-pin-01-line" },
                { id: "copy", label: "Copy link", icon: "icon-link-01-line" },
                { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line" },
                { type: "separator" },
                { id: "delete", label: "Delete", icon: "icon-trash-line", danger: true },
              ]}
              onSelect={(item) => act(doc, item.id)} />}>
            <Stack gap="xs">
              <Heading level={3} textStyle="Body/Base/Bold" className="pan-card-title" truncate>{doc.title}</Heading>
              <Text textStyle="Body/Small/Regular" tone="light">{doc.meta}</Text>
              {doc.pinned ? <Badge size="small" theme="accent" background="subtle" leadingIcon={false}>Pinned</Badge> : null}
            </Stack>
          </Card>
        ))}
      </Grid>
      <Stack direction="row" gap="sm" align="center">
        <Text textStyle="Body/Small/Regular" tone="light" role="status">{note ?? `${plural(docs.length, "doc")} · open ⋯ on a card.`}</Text>
        {removed ? <Button level="tertiary" size="sm" onClick={() => { setDocs((current) => [...current, removed]); setNote(`Restored “${removed.title}”.`); setRemoved(null); }}>Undo</Button> : null}
      </Stack>
    </Stack>
  );
}

function StatesMenuExample() {
  const [clipboard, setClipboard] = useState<string>();
  const [note, setNote] = useState<string>();
  const layer = "Hero banner";
  const run = (item: MenuItemData) => {
    if (item.id === "cut" || item.id === "copy") setClipboard(layer);
    setNote(item.id === "paste" ? `Pasted “${clipboard}”.` : `${item.label.replace("…", "")}: “${layer}”.`);
  };
  return (
    <Stack gap="sm" align="start">
      <Stack direction="row" gap="sm" align="center">
        <Menu
          trigger={<Button level="tertiary" size="sm" endIcon={<Icon name="icon-chevron-down-line" />}>Edit</Button>}
          items={[
            { type: "group", label: "Clipboard", items: [
              { id: "cut", label: "Cut", icon: "icon-scissors-line", shortcut: "⌘X" },
              { id: "copy", label: "Copy", icon: "icon-copy-line", shortcut: "⌘C" },
              { id: "paste", label: "Paste", icon: "icon-clipboard-line", shortcut: "⌘V", disabled: !clipboard, caption: clipboard ? undefined : "Copy a layer first" },
            ] },
            { type: "group", label: "Arrange", items: [
              { id: "front", label: "Bring to front", icon: "icon-arrow-up-line", shortcut: "⇧⌘]" },
              { id: "back", label: "Send to back", icon: "icon-arrow-down-line", shortcut: "⇧⌘[" },
            ] },
            { type: "separator" },
            { id: "move", label: "Move to another workspace and keep the comments…", icon: "icon-folder-line" },
            { id: "delete", label: "Delete layer", icon: "icon-trash-line", shortcut: "⌫", danger: true },
          ]}
          onSelect={run}
        />
        <Text as="span" textStyle="Body/Small/Regular" tone="light">Selected: {layer}</Text>
      </Stack>
      <Text textStyle="Body/Small/Regular" tone="light" role="status">{note ?? "Paste stays disabled until something is copied."}</Text>
    </Stack>
  );
}

const keyNames: Record<string, string> = { ArrowDown: "↓", ArrowUp: "↑", Home: "Home", End: "End", Enter: "Enter", " ": "Space", Escape: "Escape", Tab: "Tab" };

function KeyboardMenuExample() {
  const [log, setLog] = useState<string[]>([]);
  const add = (entry: string) => setLog((current) => [...current, entry].slice(-5));
  const onKeyDownCapture = (event: KeyboardEvent<HTMLDivElement>) => {
    const name = keyNames[event.key] ?? (event.key.length === 1 ? `“${event.key}”` : undefined);
    if (name) add(`Key ${name}`);
  };
  return (
    <Stack gap="sm" align="start" onKeyDownCapture={onKeyDownCapture}
      onFocusCapture={(event) => { const target = event.target as HTMLElement; const name = target.getAttribute("aria-label") ?? target.querySelector(".zen-popover__item-label")?.textContent ?? target.getAttribute("role"); if (name) add(`Focus → ${name}`); }}>
      <Menu
        trigger={<Button level="tertiary" size="sm" endIcon={<Icon name="icon-chevron-down-line" />}>Share</Button>}
        onOpenChange={(open) => add(open ? "Menu opened" : "Menu closed")}
        onSelect={(item) => add(`Chose ${item.label}`)}
        items={[
          { id: "copy", label: "Copy link", icon: "icon-link-01-line" },
          { id: "email", label: "Email", icon: "icon-mail-01-line" },
          { id: "embed", label: "Embed", icon: "icon-globe-01-line" },
          { id: "export", label: "Export as PDF", icon: "icon-download-01-line" },
        ]}
      />
      <Stack as="ol" gap="3xs" className="pan-log" aria-label="Keyboard log" aria-live="polite">
        {log.length ? log.map((entry, index) => <Text as="li" key={`${index}-${entry}`} textStyle="Body/Small/Regular" tone={index === log.length - 1 ? "strongest" : "light"}>{entry}</Text>)
          : <Text as="li" textStyle="Body/Small/Regular" tone="light">Tab to Share, then press ↓ or Enter.</Text>}
      </Stack>
    </Stack>
  );
}

type NewFile = { id: string; name: string };

function ComposedMenuExample() {
  const [files, setFiles] = useState<NewFile[]>([{ id: "f0", name: "Launch plan.docx" }]);
  const count = useRef(1);
  const create = (kind: string, extension: string) => {
    count.current += 1;
    setFiles((current) => [{ id: `f${count.current}`, name: `Untitled ${kind}.${extension}` }, ...current]);
  };
  return (
    <Stack gap="sm">
      <Stack direction="row" gap="sm" align="center" justify="between">
        <Heading level={3} textStyle="Body/Base/Bold">My files</Heading>
        <Menu trigger={<Button level="primary" size="sm" startIcon={<Icon name="icon-plus-line" />}>New</Button>} align="end">
          <MenuItem id="doc" label="Document" caption="Blank page" icon={<FileIcon format="doc" />} onSelect={() => create("document", "docx")} />
          <MenuItem id="sheet" label="Spreadsheet" caption="Rows and formulas" icon={<FileIcon format="sheet" />} onSelect={() => create("spreadsheet", "xlsx")} />
          <MenuItem id="design" label="Design file" caption="Figma canvas" icon={<FileIcon format="figma" />} onSelect={() => create("design", "fig")} />
        </Menu>
      </Stack>
      <Card theme="shadow" spacing="small">
        <List aria-label="My files">
          {files.map((file) => <ListItem key={file.id} title={file.name} caption={file.id === "f0" ? "Edited yesterday" : "Created just now"} leading={<FileIcon format={fileIconFormatOf(file.name)} size={32} />} />)}
        </List>
      </Card>
    </Stack>
  );
}

type PhoneFile = { id: string; name: string; size: string; edited: string; offline: boolean };
const phoneFileSeed: PhoneFile[] = [
  { id: "p1", name: "Q3 report.pdf", size: "2.4 MB", edited: "2h ago", offline: false },
  { id: "p2", name: "Brand guidelines.pdf", size: "18 MB", edited: "yesterday", offline: true },
  { id: "p3", name: "Pricing sheet.xlsx", size: "320 KB", edited: "3d ago", offline: false },
  { id: "p4", name: "Interview notes.docx", size: "96 KB", edited: "last week", offline: false },
];

function MobileMenuExample() {
  const [files, setFiles] = useState(phoneFileSeed);
  const [note, setNote] = useState<string>();
  const act = (file: PhoneFile, id: string) => {
    if (id === "offline") { setFiles((current) => current.map((item) => (item.id === file.id ? { ...item, offline: !item.offline } : item))); setNote(file.offline ? `${file.name} removed from this phone.` : `${file.name} is available offline.`); }
    else if (id === "delete") { setFiles((current) => current.filter((item) => item.id !== file.id)); setNote(`Deleted ${file.name}.`); }
    else setNote(`${id === "share" ? "Sharing" : "Renaming"} ${file.name}…`);
  };
  return (
    <PlatformPhone label="Files" header={<TopNavigation type="compact" title="Files" />}>
      <List aria-label="Files">
        {files.map((file) => (
          <ListItem key={file.id} title={file.name} caption={`${file.size} · ${file.offline ? "Available offline" : `Edited ${file.edited}`}`}
            leading={<FileIcon format={fileIconFormatOf(file.name)} size={36} />}
            trailing={<Menu align="end"
              trigger={<IconButton appearance="flat" level="primary" size="md" aria-label={`More actions for ${file.name}`} icon={<Icon name="icon-dots-horizontal-line" />} />}
              items={[
                { id: "share", label: "Share", icon: "icon-share-01-line" },
                { id: "rename", label: "Rename", icon: "icon-edit-02-line" },
                { id: "offline", label: file.offline ? "Remove offline copy" : "Make available offline", icon: file.offline ? "icon-cloud-off-line" : "icon-download-cloud-01-line" },
                { type: "separator" },
                { id: "delete", label: "Delete", icon: "icon-trash-line", danger: true },
              ]}
              onSelect={(item) => act(file, item.id)} />} />
        ))}
      </List>
      <Box paddingX="lg" paddingY="sm"><Text textStyle="Body/Small/Regular" tone="light" role="status">{note ?? `${plural(files.length, "file")} · tap ⋯ for actions`}</Text></Box>
    </PlatformPhone>
  );
}

/* ───────────── Sidebar: links + selectedId ───────────── */

const shellPages: Record<string, { title: string; description: string }> = {
  "/": { title: "Home", description: "What changed since you were last here." },
  "/inbox": { title: "Inbox", description: "3 unread · 1 mention." },
  "/projects": { title: "Projects", description: "2 active projects." },
  "/projects/website": { title: "Website redesign", description: "Launch on 14 November · 12 open tasks." },
  "/projects/mobile": { title: "Mobile app", description: "Beta in review · 4 open tasks." },
  "/reports": { title: "Reports", description: "Weekly snapshot from the tracker." },
  "/settings": { title: "Settings", description: "Workspace, members and billing." },
};
const idOfPath = (path: string) => (path === "/" ? "home" : path.split("/").pop() ?? "home");
const navIcon = (name: "icon-home-03-line" | "ic-inbox-01-line" | "icon-folder-line" | "icon-bar-chart-01-line" | "icon-settings-01-line") => <Icon name={name} size="base" decorative />;

function SidebarLinksExample() {
  const [path, setPath] = useState("/projects/website");
  const sections: SidebarSection[] = [
    { items: [
      { id: "home", label: "Home", href: "/", icon: navIcon("icon-home-03-line") },
      { id: "inbox", label: "Inbox", href: "/inbox", icon: navIcon("ic-inbox-01-line"), counter: 3 },
      { id: "projects", label: "Projects", href: "/projects", icon: navIcon("icon-folder-line"), children: [
        { id: "website", label: "Website redesign", href: "/projects/website" },
        { id: "mobile", label: "Mobile app", href: "/projects/mobile" },
      ] },
      { id: "reports", label: "Reports", href: "/reports", icon: navIcon("icon-bar-chart-01-line") },
    ] },
    { label: "Workspace", items: [{ id: "settings", label: "Settings", href: "/settings", icon: navIcon("icon-settings-01-line") }] },
  ];
  const page = shellPages[path] ?? shellPages["/"];
  return (
    <DemoNavigate value={setPath}>
      <div className="pe-shell" data-canvas="default">
        <Sidebar variant="basic" background="default" {...figmaSidebarBrand} sections={sections} selectedId={idOfPath(path)} linkAs={DemoRouterLink} />
        <div className="pan-shell-page">
          <Stack gap="2xs">
            <Text textStyle="Body/Small/Regular" tone="light">{path}</Text>
            <Heading level={1}>{page.title}</Heading>
            <Text tone="base">{page.description}</Text>
          </Stack>
          <Text tone="base">
            Jump to <Link as={DemoRouterLink} to="/projects/mobile" underline="always">Mobile app</Link> or{" "}
            <Link as={DemoRouterLink} to="/inbox" underline="always">Inbox</Link>: the sidebar follows the route, and the Projects group opens for its child.
          </Text>
        </div>
      </div>
    </DemoNavigate>
  );
}

/* ───────────── Pages ───────────── */

export const pages: Partial<Record<AppLayerPage, AppLayerPageMeta>> = {
  link: {
    label: "Link",
    eyebrow: "Components / Link",
    title: "Link",
    description: "An inline link in the Content/Hyperlink colours. It takes the font of the text around it, opens other sites in a new tab and says so (external), and renders your router's link with as.",
    playground: LinkPlayground,
  },
  menu: {
    label: "Menu",
    eyebrow: "Components / Menu",
    title: "Menu",
    description: "An action menu: a button opens a list of actions on the Popover surface. It follows the WAI-ARIA menu button pattern and floats above tables and cards that clip their overflow. To pick a value, use Select Field or a Chip instead.",
    playground: MenuPlayground,
  },
};

export const examples: ExampleMap = {
  link: [
    { title: "Links in running text", description: "Inside a paragraph, links are underlined (underline=\"always\") so they never rely on colour alone. They take the paragraph's font; the router link keeps navigation in the app.", render: () => <RunningTextExample />, code: `import { Link as RouterLink } from "react-router-dom";

<Text tone="base">
  Sign-in now asks for a code from your authenticator app. If you lose your phone, sign in with one of your{" "}
  <Link as={RouterLink} to="/settings/security/recovery-codes" underline="always">recovery codes</Link> or ask a{" "}
  <Link as={RouterLink} to="/settings/members?role=admin" underline="always">workspace admin</Link> to reset it.
</Text>` },
    { title: "External link", description: "With external, the link opens a new tab with rel=\"noopener noreferrer\", shows the external-link icon and adds a hidden “(opens in a new tab)”, so the change of context is seen and heard.", render: () => <ExternalLinkExample />, code: `<InlineMessage theme="info" title="Send the key as a Bearer token">
  Put it in the Authorization header of every request.{" "}
  <Link href="${MDN_AUTHORIZATION}" external underline="always">
    Authorization header on MDN
  </Link>
</InlineMessage>` },
    { title: "Router links in a list", description: "With as={RouterLink}, Link renders your router's link and forwards its props (to). Each activity row links to its issue; the issue page links back.", render: () => <RouterLinksExample />, code: `import { Link as RouterLink } from "react-router-dom";

<List aria-label="Activity">
  <ListItem title={title} leading={<Avatar size="medium" src={ava.src} alt="" />}>
    <Text as="span">
      Ava Chen commented on <Link as={RouterLink} to="/issues/1042">{title}</Link>
    </Text>
    <Text as="span" textStyle="Body/Small/Regular" tone="light">2 min ago</Text>
  </ListItem>
</List>` },
    { title: "Legal and footer links", description: "Links inside legal copy take its colour with tone=\"inherit\" and stay underlined (the default for inherit). Standalone footer links keep the Hyperlink colour and underline on hover.", render: () => <LegalLinksExample />, code: `<Text textStyle="Body/Small/Regular" tone="light">
  By creating an account you agree to the <Link href="/legal/terms" tone="inherit">Terms of service</Link> and
  confirm you have read the <Link href="/legal/privacy" tone="inherit">Privacy policy</Link>.
</Text>
<Stack as="nav" aria-label="Footer" direction="row" gap="md" wrap>
  <Text as="span" textStyle="Body/Small/Regular" tone="light">© 2026 Zen Studio</Text>
  <Text as="span" textStyle="Body/Small/Regular"><Link href="/status">Status</Link></Text>
</Stack>` },
    { title: "Mobile sign-in", description: "On a phone, links navigate (Forgot password?, Create an account) and buttons act (Sign in). Tap a link to open its screen; the Back chevron returns.", render: () => <MobileSignInExample />, code: `<PlatformPhone header={<TopNavigation type="compact" title="Sign in" />}
  footer={<div className="pe-phone-cta">{/* display: grid; gap: 12px; padding: 12px 20px + safe area */}
    <Button level="primary" size="lg" onClick={signIn}>Sign in</Button>
    <Text textStyle="Body/Small/Regular" tone="light" align="center">
      New to Zen? <Link as={RouterLink} to="/sign-up" underline="always">Create an account</Link>
    </Text>
  </div>}>
  <InputField label="Work email" type="email" value={email} onChange={…} />
  <InputField label="Password" type="password" />
  <Text textStyle="Body/Small/Regular"><Link as={RouterLink} to="/reset-password">Forgot password?</Link></Text>
</PlatformPhone>` },
  ],
  menu: [
    { title: "Row actions in a table", description: "Each row's ⋯ (Button/Icon-Flat Medium in TableActions) opens its own menu, named after the row. The menu renders in the overlay layer, so the table's scroll box never clips it. Delete asks first in a negative Dialog; focus returns to the row's button.", wide: true, render: () => <TableRowMenuExample />, code: `{ id: "actions", header: <VisuallyHidden>Actions</VisuallyHidden>, align: "right", width: "64px",
  cell: (row) => (
    <TableActions>
      <Menu align="end"
        trigger={<IconButton appearance="flat" level="primary" size="md" aria-label={\`Actions for \${row.number}\`} icon={<Icon name="icon-dots-horizontal-line" />} />}
        items={[
          { id: "view", label: "View invoice", icon: "icon-eye-line" },
          { id: "download", label: "Download PDF", icon: "icon-download-01-line" },
          { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line" },
          { id: "paid", label: "Mark as paid", icon: "icon-check-circle-line", disabled: row.status === "paid" },
          { type: "separator" },
          { id: "delete", label: "Delete invoice", icon: "icon-trash-line", danger: true },
        ]}
        onSelect={(item) => run(row, item.id)} />
    </TableActions>
  ) }` },
    { title: "Card menu", description: "The Card's Sub-Action slot takes a Menu: a Small Flat ⋯ pinned to the top-right corner. Pin reorders the cards, Copy link writes to the clipboard, Delete offers Undo.", render: () => <CardMenuExample />, code: `<Card as="article" theme="shadow" spacing="small"
  subAction={<Menu align="end"
    trigger={<IconButton appearance="flat" level="primary" size="sm" aria-label={\`More actions for \${doc.title}\`} icon={<Icon name="icon-dots-horizontal-line" />} />}
    items={[
      { id: "pin", label: doc.pinned ? "Unpin" : "Pin to top", icon: "icon-pin-01-line" },
      { id: "copy", label: "Copy link", icon: "icon-link-01-line" },
      { id: "duplicate", label: "Duplicate", icon: "icon-duplicate-line" },
      { type: "separator" },
      { id: "delete", label: "Delete", icon: "icon-trash-line", danger: true },
    ]}
    onSelect={(item) => act(doc, item.id)} />}>
  <Heading level={3} textStyle="Body/Base/Bold">{doc.title}</Heading>
  <Text textStyle="Body/Small/Regular" tone="light">{doc.meta}</Text>
</Card>` },
    { title: "Groups, shortcuts and disabled items", description: "Group headings and a separator structure a longer menu; shortcuts sit on the right. Paste stays disabled, with a caption saying why, until something is copied. A long label ends in “…”; Delete is last, in Negative.", render: () => <StatesMenuExample />, code: `<Menu trigger={<Button level="tertiary" size="sm" endIcon={<Icon name="icon-chevron-down-line" />}>Edit</Button>}
  items={[
    { type: "group", label: "Clipboard", items: [
      { id: "cut", label: "Cut", icon: "icon-scissors-line", shortcut: "⌘X" },
      { id: "copy", label: "Copy", icon: "icon-copy-line", shortcut: "⌘C" },
      { id: "paste", label: "Paste", icon: "icon-clipboard-line", shortcut: "⌘V", disabled: !clipboard, caption: "Copy a layer first" },
    ] },
    { type: "group", label: "Arrange", items: [
      { id: "front", label: "Bring to front", icon: "icon-arrow-up-line", shortcut: "⇧⌘]" },
      { id: "back", label: "Send to back", icon: "icon-arrow-down-line", shortcut: "⇧⌘[" },
    ] },
    { type: "separator" },
    { id: "move", label: "Move to another workspace and keep the comments…", icon: "icon-folder-line" },
    { id: "delete", label: "Delete layer", icon: "icon-trash-line", shortcut: "⌫", danger: true },
  ]}
  onSelect={run} />` },
    { title: "Keyboard", description: "Press ↓, Enter or Space to open on the first item, ↑ to open on the last. ↑/↓/Home/End move, a letter jumps to the next item that starts with it, Enter chooses, Escape closes and returns focus to Share, Tab closes and moves on. The log lists each step.", render: () => <KeyboardMenuExample />, code: `<Menu trigger={<Button level="tertiary" size="sm" endIcon={<Icon name="icon-chevron-down-line" />}>Share</Button>}
  onOpenChange={(open) => log(open ? "Menu opened" : "Menu closed")}
  onSelect={(item) => log(\`Chose \${item.label}\`)}
  items={[
    { id: "copy", label: "Copy link", icon: "icon-link-01-line" },
    { id: "email", label: "Email", icon: "icon-mail-01-line" },
    { id: "embed", label: "Embed", icon: "icon-globe-01-line" },
    { id: "export", label: "Export as PDF", icon: "icon-download-01-line" },
  ]} />` },
    { title: "Composed items", description: "Without items, compose MenuItem children: any element works as the icon (a FileIcon here), and each item runs its own onSelect. New is the page's one Primary action.", render: () => <ComposedMenuExample />, code: `<Menu trigger={<Button level="primary" size="sm" startIcon={<Icon name="icon-plus-line" />}>New</Button>} align="end">
  <MenuItem label="Document" caption="Blank page" icon={<FileIcon format="doc" />} onSelect={() => create("document")} />
  <MenuItem label="Spreadsheet" caption="Rows and formulas" icon={<FileIcon format="sheet" />} onSelect={() => create("spreadsheet")} />
  <MenuItem label="Design file" caption="Figma canvas" icon={<FileIcon format="figma" />} onSelect={() => create("design")} />
</Menu>` },
    { title: "Mobile row menu", description: "In a phone frame the menu opens inside the device, lined up with the row's ⋯ and kept clear of the status bar. Keep phone menus short; a long list, or one that needs a title, is an Action Bottom Sheet.", render: () => <MobileMenuExample />, code: `<ListItem title={file.name} caption={caption} leading={<FileIcon format={fileIconFormatOf(file.name)} size={36} />}
  trailing={<Menu align="end"
    trigger={<IconButton appearance="flat" level="primary" size="md" aria-label={\`More actions for \${file.name}\`} icon={<Icon name="icon-dots-horizontal-line" />} />}
    items={[
      { id: "share", label: "Share", icon: "icon-share-01-line" },
      { id: "rename", label: "Rename", icon: "icon-edit-02-line" },
      { id: "offline", label: "Make available offline", icon: "icon-download-cloud-01-line" },
      { type: "separator" },
      { id: "delete", label: "Delete", icon: "icon-trash-line", danger: true },
    ]}
    onSelect={(item) => act(file, item.id)} />} />` },
  ],
  sidebar: [
    { title: "Links and selectedId", description: "Items with href render as links (linkAs={RouterLink} for client-side routing) and selectedId marks the current route, so the app never remaps selected in sections. Navigating from the page to Mobile app opens the Projects group.", wide: true, render: () => <SidebarLinksExample />, code: `// React Router's Link takes \`to\`: adapt it once for the sidebar, which passes \`href\`.
const SidebarLink = forwardRef(({ href, ...rest }, ref) => <RouterLink ref={ref} to={href} {...rest} />);

<Sidebar variant="basic" sections={[
    { items: [
      { id: "home", label: "Home", href: "/", icon: <Icon name="icon-home-03-line" /> },
      { id: "inbox", label: "Inbox", href: "/inbox", icon: <Icon name="ic-inbox-01-line" />, counter: 3 },
      { id: "projects", label: "Projects", href: "/projects", icon: <Icon name="icon-folder-line" />, children: [
        { id: "website", label: "Website redesign", href: "/projects/website" },
        { id: "mobile", label: "Mobile app", href: "/projects/mobile" },
      ] },
    ] },
  ]}
  selectedId={routeId}   // e.g. "website" for /projects/website
  linkAs={SidebarLink} />` },
  ],
};

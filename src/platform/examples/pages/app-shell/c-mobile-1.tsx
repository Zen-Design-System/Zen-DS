/* App Shell examples · c-mobile-1: built from Figma ◇ Master-Layout · Example (15902:109717), section "C · Mobile
   structures by domain" (15921:7244): C1 · Tab-bar Hub (15921:7245), C2 · Hero Wallet (15921:8204), C3 · Feed
   (15922:7729), C4 · Media + Bottom sheet (15922:8287). Each phone is one Pattern/AppShell/Mobile instance; the copy,
   numbers and component variants are the ones the Figma screens hold. */
import { Fragment, useId, useState } from "react";
import { ActionBar } from "../../../../components/ActionBar";
import { AppShell } from "../../../../components/AppShell";
import { Avatar, type AvatarProps } from "../../../../components/Avatar";
import { BottomNavigation, type BottomNavigationItem } from "../../../../components/BottomNavigation";
import { Button, IconButton } from "../../../../components/Button";
import { Card } from "../../../../components/Card";
import { Chip } from "../../../../components/Chip";
import { DescriptionList } from "../../../../components/DescriptionList";
import { Divider } from "../../../../components/Divider";
import { DockIcon, type DockIconTheme } from "../../../../components/DockIcon";
import { Icon, type IconName } from "../../../../components/Icon";
import { Image } from "../../../../components/Image";
import { Stack } from "../../../../components/Layout";
import { Link } from "../../../../components/Link";
import { List, ListBox, ListItem } from "../../../../components/ListItem";
import { ProgressBar } from "../../../../components/Progress";
import { TabPanel, Tabs } from "../../../../components/Tabs";
import { Heading, Text } from "../../../../components/Text";
import { useToast } from "../../../../components/Toast";
import { TopNavigation } from "../../../../components/TopNavigation";
import { platformMedia } from "../../../PlatformMedia";
import { PlatformPhone } from "../../../PlatformPhone";
import type { ExampleDef } from "../../types";

type AvatarTheme = NonNullable<AvatarProps["theme"]>;

// ——— C1 · Tab-bar Hub (Top=Bar · Bottom=Tab-Bar) ———————————————————————————————————————————————————————————————
const learningRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "explore", label: "Explore", icon: "icon-compass-line", selectedIcon: "icon-compass-solid" },
  { id: "courses", label: "Courses", icon: "icon-book-closed-line", selectedIcon: "icon-book-closed-solid" },
  { id: "messages", label: "Messages", icon: "icon-message-chat-circle-line", selectedIcon: "icon-message-chat-circle-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const learningStats: { id: string; icon: IconName; theme: DockIconTheme; value: string; label: string }[] = [
  { id: "streak", icon: "icon-trophy-01-line", theme: "orange", value: "12 days", label: "Learning streak" },
  { id: "week", icon: "icon-clock-line", theme: "blue", value: "3h 40m", label: "This week" },
];
const courses: { id: string; initials: string; theme: AvatarTheme; title: string; progress: string }[] = [
  { id: "ux-writing", initials: "UX", theme: "violet", title: "UX writing basics", progress: "8 of 12 lessons" },
  { id: "javascript", initials: "JS", theme: "yellow", title: "Modern JavaScript", progress: "3 of 20 lessons" },
];

function LearningHubPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const coursesId = useId();
  return (
    <PlatformPhone label="Learning app" canvas="default">
      {/* Bar + Tab-Bar: the large title with its one action, then Shadow boxes on the grey Canvas (the bottom bar casts
          a shadow, so every box floats too). The five destinations live in the bottom bar, which plays the Sidebar. */}
      <AppShell
        topNavigation={<TopNavigation title="Today" largeTitle="Today"
          trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: () => toast({ title: "You're all caught up", children: "New lessons and replies show here." }) }]} />}
        bottomNavigation={<BottomNavigation aria-label="Learning app" value={root} onValueChange={setRoot} showLabels items={learningRoots} />}
      >
        <Stack gap="lg">
          <Card theme="shadow">
            <Stack gap="md" align="stretch">
              <Text textStyle="All-Caps/S" tone="light">Continue learning</Text>
              <Stack gap="2xs">
                <Heading level={2} textStyle="Heading/4">Design systems in practice</Heading>
                <Text textStyle="Body/Small/Regular" tone="light">Module 4 · Tokens and modes · 12 min left</Text>
              </Stack>
              <ProgressBar value={62} aria-label="Design systems in practice" />
              <Button level="primary" startIcon="icon-play-line" onClick={() => toast({ title: "Resuming Module 4", children: "Tokens and modes · 12 min left" })}>Resume lesson</Button>
            </Stack>
          </Card>
          <Stack direction="row" gap="sm" fillChildren>
            {learningStats.map((stat) => (
              <Card key={stat.id} theme="shadow" spacing="sm">
                <Stack gap="xs">
                  <DockIcon size="sm" icon={stat.icon} theme={stat.theme} background="subtle" />
                  <Stack gap="3xs">
                    <Text as="p" textStyle="Heading/3">{stat.value}</Text>
                    <Text textStyle="Body/Small/Regular" tone="light">{stat.label}</Text>
                  </Stack>
                </Stack>
              </Card>
            ))}
          </Stack>
          <ListBox as="section" theme="shadow" aria-labelledby={coursesId} header={(
            <Stack direction="row" justify="between" align="center" gap="xs">
              <Heading level={2} id={coursesId} textStyle="Heading/4">Your courses</Heading>
              {/* A section head's See all is underlined text, not a button (Zen rule); it opens the Courses tab. */}
              <Text as="span" textStyle="Body/Base/Bold">
                <Link as="button" tone="inherit" onClick={() => setRoot("courses")}>See all</Link>
              </Text>
            </Stack>
          )}>
            <List aria-labelledby={coursesId}>
              {courses.map((course) => (
                <ListItem key={course.id} title={course.title} caption={course.progress}
                  leading={<Avatar size="md" shape="square" theme={course.theme} background="subtle" alt="">{course.initials}</Avatar>}
                  trailing={<Icon name="icon-chevron-right-line-medium" decorative />}
                  onClick={() => toast({ title: course.title, children: `${course.progress} done` })} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— C2 · Hero Wallet (Top=Bar · Bottom=Floating) ——————————————————————————————————————————————————————————————
const walletRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "cards", label: "Cards", icon: "icon-credit-card-line", selectedIcon: "icon-credit-card-solid" },
  { id: "insights", label: "Insights", icon: "icon-pie-chart-01-line", selectedIcon: "icon-pie-chart-01-solid" },
  { id: "account", label: "Account", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const quickActions: { id: string; icon: IconName; label: string }[] = [
  { id: "bills", icon: "icon-receipt-line", label: "Pay bills" },
  { id: "scan", icon: "icon-scan-line", label: "Scan" },
  { id: "savings", icon: "icon-piggy-bank-line", label: "Savings" },
  { id: "more", icon: "icon-dots-grid-line", label: "More" },
];
const walletTransactions: { id: string; initials: string; theme: AvatarTheme; title: string; caption: string; amount: string }[] = [
  { id: "sea", initials: "SG", theme: "blue", title: "From Sea Group", caption: "Received · Today", amount: "+40,000,000" },
  { id: "highlands", initials: "HC", theme: "orange", title: "Highlands Coffee", caption: "Card · Today", amount: "−65,000" },
  { id: "grab", initials: "GR", theme: "green", title: "Grab ride", caption: "Wallet · Yesterday", amount: "−48,000" },
];

function HeroWalletPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const transactionsId = useId();
  return (
    <PlatformPhone label="Wallet app" canvas="default">
      {/* Bar + Floating: the number the user opens the app for sits in the one Solid Neutral hero (Inverse content and
          buttons); the quick actions follow as Surface icon buttons, then a Flat list. The floating bar keeps the
          central scan / pay action beside the destinations. */}
      <AppShell
        topNavigation={<TopNavigation title="Hi, Maya" subtitle="Personal account"
          leading={<Avatar size="md" theme="accent" alt="Maya">M</Avatar>}
          trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: () => toast({ title: "+40,000,000 from Sea Group", children: "Received today" }) }]} />}
        bottomNavigation={<BottomNavigation type="floating" aria-label="Wallet" value={root} onValueChange={setRoot} items={walletRoots}
          action={{ icon: "icon-plus-line", label: "Scan or pay", theme: "primary", onClick: () => toast({ title: "Scan a QR code to pay", children: "Or pick a contact to send money." }) }} />}
      >
        <Stack gap="md">
          <Card theme="solid" color="neutral">
            <Stack gap="md">
              <Stack gap="2xs">
                <Text textStyle="Body/Small/Regular" tone="light">Total balance</Text>
                <Text as="p" textStyle="Display/4">₫20,089,680</Text>
                <Text textStyle="Body/Small/Medium" tone="base">+850,000 this week · 850 USD</Text>
              </Stack>
              <Stack direction="row" gap="xs" fillChildren>
                <Button appearance="overlay" level="inverse" startIcon="icon-plus-line" onClick={() => toast({ title: "Top up", children: "From a linked bank account or card." })}>Top up</Button>
                <Button appearance="overlay" level="inverse-subtle" startIcon="icon-arrow-up-line" onClick={() => toast({ title: "Transfer", children: "Send to a contact, a bank account or a phone number." })}>Transfer</Button>
              </Stack>
            </Stack>
          </Card>
          <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-label="Quick actions">
            {quickActions.map((item) => (
              <Stack as="li" key={item.id} gap="xs" align="center">
                {/* zen-allow-no-tooltip: the action's visible label sits right under the button (Figma Quick-Actions). */}
                <IconButton size="lg" level="surface" icon={item.icon} aria-label={item.label} tooltip={false} onClick={() => toast({ title: item.label })} />
                <Text as="span" textStyle="Caption/Medium" tone="base" aria-hidden="true">{item.label}</Text>
              </Stack>
            ))}
          </Stack>
          <ListBox as="section" aria-labelledby={transactionsId} header={(
            <Stack direction="row" justify="between" align="center" gap="xs">
              <Heading level={2} id={transactionsId} textStyle="Heading/4">Transactions</Heading>
              <Text as="span" textStyle="Body/Base/Bold">
                <Link as="button" tone="inherit" onClick={() => setRoot("insights")}>See All</Link>
              </Text>
            </Stack>
          )}>
            <List aria-labelledby={transactionsId}>
              {walletTransactions.map((entry) => (
                <ListItem key={entry.id} title={entry.title} caption={entry.caption} value={entry.amount}
                  leading={<Avatar size="md" theme={entry.theme} background="subtle" alt="">{entry.initials}</Avatar>}
                  onClick={() => toast({ title: entry.title, children: `${entry.amount} · ${entry.caption}` })} />
              ))}
            </List>
          </ListBox>
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

// ——— C3 · Feed (Top=Bar · Bottom=Floating, Glass) —————————————————————————————————————————————————————————————
const kicksRoots: BottomNavigationItem[] = [
  { id: "home", label: "Home", icon: "icon-home-01-line", selectedIcon: "icon-home-01-solid" },
  { id: "search", label: "Search", icon: "icon-search-medium-line" },
  { id: "watch", label: "Watch", icon: "icon-play-line", selectedIcon: "icon-play-solid" },
  { id: "profile", label: "Profile", icon: "icon-user-line", selectedIcon: "icon-user-solid" },
];
const feedTabs = [
  { id: "for-you", label: "For you" },
  { id: "following", label: "Following" },
  { id: "drops", label: "Drops" },
  { id: "nearby", label: "Nearby" },
];
type Post = { id: string; author: string; initials: string; theme: AvatarTheme; meta: string; text: string; photo?: { src: string; alt: string }; likes: string; comments: string; tabs: string[] };
const posts: Post[] = [
  {
    id: "track-6", author: "Maya Thompson", initials: "MT", theme: "pink", meta: "2h · Public",
    text: "First wear of the Track 6 in olive. Gum sole is softer than it looks. Sizing runs half a size big.",
    photo: platformMedia.products.olive, likes: "1.2k", comments: "86", tabs: ["for-you", "following", "drops"],
  },
  {
    id: "meet-up", author: "Đìzai Studio", initials: "DS", theme: "blue", meta: "5h · Public",
    text: "Saturday meet-up at the Hanoi store: trade, swap and clean your pairs. Free coffee for the first 50.",
    likes: "342", comments: "41", tabs: ["for-you", "nearby"],
  },
];

function FeedPost({ post }: { post: Post }) {
  const { toast } = useToast();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const authorId = useId();
  return (
    // A post: Spacing/Padding/Medium above and below, Gap/Small inside; hairlines between posts instead of cards.
    <Stack as="article" gap="sm" paddingY="md" aria-labelledby={authorId}>
      <Stack direction="row" gap="xs" align="center">
        <Avatar size="sm" theme={post.theme} background="subtle" alt="">{post.initials}</Avatar>
        <Stack gap="3xs" width="fill">
          <Heading level={2} id={authorId} textStyle="Body/Base/Bold">{post.author}</Heading>
          <Text textStyle="Caption/Regular" tone="light">{post.meta}</Text>
        </Stack>
        <IconButton appearance="flat" level="secondary" size="sm" icon="icon-dots-horizontal-line" aria-label={`More for ${post.author}'s post`}
          onClick={() => toast({ title: "Post options", children: "Mute, report or copy the link." })} />
      </Stack>
      <Text>{post.text}</Text>
      {post.photo ? <Image src={post.photo.src} alt={post.photo.alt} ratio={350 / 240} radius="lg" /> : null}
      <Stack direction="row" justify="between" align="center" gap="md">
        <Stack direction="row" gap="md" align="center">
          <Stack direction="row" gap="xs" align="center">
            <IconButton appearance="flat" level="primary" size="sm" icon={liked ? "icon-heart-solid" : "icon-heart-line"} aria-label="Like" aria-pressed={liked} onClick={() => setLiked((value) => !value)} />
            <Text as="span" textStyle="Body/Small/Medium" tone="base">{post.likes}</Text>
          </Stack>
          <Stack direction="row" gap="xs" align="center">
            <IconButton appearance="flat" level="primary" size="sm" icon="icon-message-circle-line" aria-label="Comments" onClick={() => toast({ title: `${post.comments} comments`, children: `Replies to ${post.author}` })} />
            <Text as="span" textStyle="Body/Small/Medium" tone="base">{post.comments}</Text>
          </Stack>
          <IconButton appearance="flat" level="primary" size="sm" icon="icon-share-01-line" aria-label="Share" onClick={() => toast({ title: "Link copied" })} />
        </Stack>
        <IconButton appearance="flat" level="primary" size="sm" icon={saved ? "icon-bookmark-solid" : "icon-bookmark-line"} aria-label="Save" aria-pressed={saved} onClick={() => setSaved((value) => !value)} />
      </Stack>
    </Stack>
  );
}

function FeedPhone() {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [tab, setTab] = useState("for-you");
  const tabsId = useId();
  return (
    <PlatformPhone label="Kicks app" canvas="surface">
      {/* Bar + Floating-Glass on Canvas/Alt: content first, chrome last. A compact Default bar with the feed filters in
          its Control-Bar, posts separated by hairlines, full-width media, and the glass bar the feed scrolls under. */}
      <AppShell canvas="alt"
        topNavigation={<TopNavigation type="default" title="Kicks"
          leading={{ icon: "icon-search-medium-line", label: "Search", onClick: () => setRoot("search") }}
          trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: () => toast({ title: "Maya Thompson liked your pair", children: "2h ago" }) }]}
          controlBar={<Tabs aria-label="Feed" idPrefix={tabsId} value={tab} onValueChange={setTab} items={feedTabs} />} />}
        bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Kicks" value={root} onValueChange={setRoot} items={kicksRoots}
          action={{ icon: "icon-plus-line", label: "New post", onClick: () => toast({ title: "New post", children: "Share a pair, a fit or a meet-up." }) }} />}
      >
        {feedTabs.map((item) => (
          <TabPanel key={item.id} idPrefix={tabsId} id={item.id} hidden={tab !== item.id}>
            <Stack gap="none">
              <Divider />
              {posts.filter((post) => post.tabs.includes(item.id)).map((post) => (
                <Fragment key={post.id}>
                  <FeedPost post={post} />
                  <Divider />
                </Fragment>
              ))}
            </Stack>
          </TabPanel>
        ))}
      </AppShell>
    </PlatformPhone>
  );
}

// ——— C4 · Media + Bottom sheet (Top=Media · Bottom=Actions) ————————————————————————————————————————————————————
const highlights = [
  { label: "Small group", detail: "Up to 10 guests with one photographer guide." },
  { label: "3 hours", detail: "08:30 – 11:30, including the walk in." },
  { label: "Photo stops", detail: "The guide times each stop for the light beams." },
  { label: "Free cancellation", detail: "Cancel up to 24 hours before for a full refund." },
];

function MediaSheetPhone() {
  const { toast } = useToast();
  const [saved, setSaved] = useState(false);
  return (
    <PlatformPhone label="Tours app" canvas="surface" statusBar="light">
      {/* Media + Actions: the photo is the backdrop, the Liquid-Glass actions float on it, and one Surface sheet rises
          over it with the title, highlights and facts (no cards inside it); the booking actions sit in the Action bar. */}
      <AppShell mobileTop="media"
        backdrop={<Image src={platformMedia.antelopeCanyon.src} alt={platformMedia.antelopeCanyon.alt} radius="none" loading="eager" />}
        topNavigation={<TopNavigation aria-label="Antelope Canyon photo tour" topBar
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: () => toast({ title: "Back to Page, Arizona" }) }}
          trailing={[{ icon: saved ? "icon-heart-solid" : "icon-heart-line", label: saved ? "Saved" : "Save tour", onClick: () => setSaved((value) => !value) }]} />}
        actionBar={<ActionBar direction="horizontal"
          secondaryAction={{ label: "Message host", onClick: () => toast({ title: "Message host", children: "Hosts reply within an hour." }) }}
          primaryAction={{ label: "Reserve · $120", onClick: () => toast({ title: "Reserved for Sat, Oct 18", children: "08:30 – 11:30 · 2 adults" }) }} />}
      >
        <Stack gap="md">
          <Stack direction="row" gap="xs" align="start">
            <Stack gap="3xs" width="fill">
              {/* zen-allow-h1-style: the bar over the photo has no title, so the sheet's Heading-Text H3 (Figma) names the screen. */}
              <Heading level={1} textStyle="Heading/3">Antelope Canyon photo tour</Heading>
              <Text tone="light">Page, Arizona · ★ 4.9 (1,284)</Text>
            </Stack>
            <IconButton level="tertiary" icon="icon-share-01-line" aria-label="Share tour" onClick={() => toast({ title: "Tour link copied" })} />
          </Stack>
          <Stack direction="row" gap="xs" wrap>
            {highlights.map((item) => (
              <Chip key={item.label} variant="normal" size="sm" onClick={() => toast({ title: item.label, children: item.detail })}>{item.label}</Chip>
            ))}
          </Stack>
          <DescriptionList divider items={[
            { term: "Date", description: "Sat, Oct 18" },
            { term: "Time", description: "08:30 – 11:30" },
            { term: "Guests", description: "2 adults" },
          ]} />
        </Stack>
      </AppShell>
    </PlatformPhone>
  );
}

export const examples: ExampleDef[] = [
  {
    title: "C1 · Tab-bar hub",
    description: "A home for daily return visits: large title, a \"continue\" card and short lists, with 4–5 destinations in the bottom bar (the bottom bar plays the Sidebar). The bottom bar casts a shadow, so every box floats too (Shadow cards on the grey canvas). Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Tab-Bar. Fits: Learning, Health, Consumer apps, Travel.",
    render: () => <LearningHubPhone />,
    code: `<PlatformPhone canvas="default">
  <AppShell
    topNavigation={<TopNavigation title="Today" largeTitle="Today" trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: openNotifications }]} />}
    bottomNavigation={<BottomNavigation aria-label="Learning app" value={root} onValueChange={setRoot} showLabels items={roots} />}
  >
    <Stack gap="lg">
      <Card theme="shadow">
        <Stack gap="md" align="stretch">
          <Text textStyle="All-Caps/S" tone="light">Continue learning</Text>
          <Stack gap="2xs">
            <Heading level={2} textStyle="Heading/4">Design systems in practice</Heading>
            <Text textStyle="Body/Small/Regular" tone="light">Module 4 · Tokens and modes · 12 min left</Text>
          </Stack>
          <ProgressBar value={62} aria-label="Design systems in practice" />
          <Button level="primary" startIcon="icon-play-line" onClick={resume}>Resume lesson</Button>
        </Stack>
      </Card>
      <Stack direction="row" gap="sm" fillChildren>
        <Card theme="shadow" spacing="sm">
          <Stack gap="xs">
            <DockIcon size="sm" icon="icon-trophy-01-line" theme="orange" background="subtle" />
            <Stack gap="3xs">
              <Text as="p" textStyle="Heading/3">12 days</Text>
              <Text textStyle="Body/Small/Regular" tone="light">Learning streak</Text>
            </Stack>
          </Stack>
        </Card>
        …
      </Stack>
      <ListBox as="section" theme="shadow" aria-labelledby={coursesId} header={…Your courses · See all…}>
        <List aria-labelledby={coursesId}>
          <ListItem title="UX writing basics" caption="8 of 12 lessons" onClick={open}
            leading={<Avatar size="md" shape="square" theme="violet" background="subtle" alt="">UX</Avatar>}
            trailing={<Icon name="icon-chevron-right-line-medium" decorative />} />
          …
        </List>
      </ListBox>
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
  {
    title: "C2 · Hero wallet",
    description: "The number the user opens the app for sits in a Solid Neutral hero (Inverse content, Inverse buttons); quick actions follow as Surface icon buttons, then a flat list. A floating bottom bar keeps a central CTA (scan / pay). Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: Fintech / Wallet, Loyalty, Logistics, Telco.",
    render: () => <HeroWalletPhone />,
    code: `<AppShell
  topNavigation={<TopNavigation title="Hi, Maya" subtitle="Personal account" leading={<Avatar size="md" theme="accent" alt="Maya">M</Avatar>}
    trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: openNotifications }]} />}
  bottomNavigation={<BottomNavigation type="floating" aria-label="Wallet" value={root} onValueChange={setRoot} items={roots}
    action={{ icon: "icon-plus-line", label: "Scan or pay", theme: "primary", onClick: scanToPay }} />}
>
  <Stack gap="md">
    <Card theme="solid" color="neutral">
      <Stack gap="md">
        <Stack gap="2xs">
          <Text textStyle="Body/Small/Regular" tone="light">Total balance</Text>
          <Text as="p" textStyle="Display/4">₫20,089,680</Text>
          <Text textStyle="Body/Small/Medium" tone="base">+850,000 this week · 850 USD</Text>
        </Stack>
        <Stack direction="row" gap="xs" fillChildren>
          <Button appearance="overlay" level="inverse" startIcon="icon-plus-line" onClick={topUp}>Top up</Button>
          <Button appearance="overlay" level="inverse-subtle" startIcon="icon-arrow-up-line" onClick={transfer}>Transfer</Button>
        </Stack>
      </Stack>
    </Card>
    <Stack as="ul" direction="row" justify="between" align="start" gap="none" aria-label="Quick actions">
      <Stack as="li" gap="xs" align="center">
        {/* zen-allow-no-tooltip: the visible label sits right under the button. */}
        <IconButton size="lg" level="surface" icon="icon-receipt-line" aria-label="Pay bills" tooltip={false} onClick={payBills} />
        <Text as="span" textStyle="Caption/Medium" tone="base" aria-hidden="true">Pay bills</Text>
      </Stack>
      …Scan · Savings · More
    </Stack>
    <ListBox as="section" aria-labelledby={transactionsId} header={…Transactions · See All…}>
      <List aria-labelledby={transactionsId}>
        <ListItem title="From Sea Group" caption="Received · Today" value="+40,000,000" onClick={open}
          leading={<Avatar size="md" theme="blue" background="subtle" alt="">SG</Avatar>} />
        …
      </List>
    </ListBox>
  </Stack>
</AppShell>`,
  },
  {
    title: "C3 · Feed",
    description: "Content first, chrome last: a compact top bar with Tab-Bar filters in its Control-Bar, posts separated by hairlines instead of cards, full-width media, and a Floating-Glass bottom bar that lets the feed scroll beneath it. Shell: AppShell/Mobile · Phone · Top=Bar · Bottom=Floating. Fits: Social / Community, News / Media, Marketplace, Video / Music.",
    render: () => <FeedPhone />,
    code: `<AppShell
  canvas="alt"
  topNavigation={<TopNavigation type="default" title="Kicks"
    leading={{ icon: "icon-search-medium-line", label: "Search", onClick: openSearch }}
    trailing={[{ icon: "icon-bell-01-line", label: "Notifications", onClick: openNotifications }]}
    controlBar={<Tabs aria-label="Feed" idPrefix="feed" value={tab} onValueChange={setTab} items={[
      { id: "for-you", label: "For you" }, { id: "following", label: "Following" }, { id: "drops", label: "Drops" }, { id: "nearby", label: "Nearby" },
    ]} />} />}
  bottomNavigation={<BottomNavigation type="floating-glass" aria-label="Kicks" value={root} onValueChange={setRoot} items={roots}
    action={{ icon: "icon-plus-line", label: "New post", onClick: newPost }} />}
>
  <TabPanel idPrefix="feed" id="for-you" hidden={tab !== "for-you"}>
    <Divider />
    <Stack as="article" gap="sm" paddingY="md" aria-labelledby="post-track-6">
      <Stack direction="row" gap="xs" align="center">
        <Avatar size="sm" theme="pink" background="subtle" alt="">MT</Avatar>
        <Stack gap="3xs" width="fill">
          <Heading level={2} id="post-track-6" textStyle="Body/Base/Bold">Maya Thompson</Heading>
          <Text textStyle="Caption/Regular" tone="light">2h · Public</Text>
        </Stack>
        <IconButton appearance="flat" level="secondary" size="sm" icon="icon-dots-horizontal-line" aria-label="More for Maya Thompson's post" onClick={openMenu} />
      </Stack>
      <Text>First wear of the Track 6 in olive. Gum sole is softer than it looks. Sizing runs half a size big.</Text>
      <Image src={photo.src} alt={photo.alt} ratio={350 / 240} radius="lg" />
      <Stack direction="row" justify="between" align="center" gap="md">
        …Like 1.2k · Comments 86 · Share · Save (IconButton appearance="flat" size="sm")
      </Stack>
    </Stack>
    <Divider />
    …
  </TabPanel>
</AppShell>`,
  },
  {
    title: "C4 · Media + bottom sheet",
    description: "The place is the content: a full-bleed photo (or a live map) is the backdrop, Liquid-Glass actions float on it, and a Surface sheet rises over it with the title, highlights and facts; the booking actions sit in the Action-Bar below. The sheet is the only surface; no cards inside it. Shell: AppShell/Mobile · Phone · Top=Media · Bottom=Actions. Fits: Travel / Booking, Real estate, Delivery tracking, Ride / Maps.",
    render: () => <MediaSheetPhone />,
    code: `<PlatformPhone canvas="surface" statusBar="light">
  <AppShell
    mobileTop="media"
    backdrop={<Image src={tour.photo} alt="Sky seen through the curved red walls of Antelope Canyon" radius="none" loading="eager" />}
    topNavigation={<TopNavigation aria-label="Antelope Canyon photo tour" topBar
      leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }}
      trailing={[{ icon: "icon-heart-line", label: "Save tour", onClick: save }]} />}
    actionBar={<ActionBar direction="horizontal"
      secondaryAction={{ label: "Message host", onClick: messageHost }}
      primaryAction={{ label: "Reserve · $120", onClick: reserve }} />}
  >
    <Stack gap="md">
      <Stack direction="row" gap="xs" align="start">
        <Stack gap="3xs" width="fill">
          {/* zen-allow-h1-style: the bar over the photo has no title, so the sheet's title names the screen. */}
          <Heading level={1} textStyle="Heading/3">Antelope Canyon photo tour</Heading>
          <Text tone="light">Page, Arizona · ★ 4.9 (1,284)</Text>
        </Stack>
        <IconButton level="tertiary" icon="icon-share-01-line" aria-label="Share tour" onClick={share} />
      </Stack>
      <Stack direction="row" gap="xs" wrap>
        <Chip variant="normal" size="sm" onClick={explain}>Small group</Chip>
        <Chip variant="normal" size="sm" onClick={explain}>3 hours</Chip>
        <Chip variant="normal" size="sm" onClick={explain}>Photo stops</Chip>
        <Chip variant="normal" size="sm" onClick={explain}>Free cancellation</Chip>
      </Stack>
      <DescriptionList divider items={[
        { term: "Date", description: "Sat, Oct 18" },
        { term: "Time", description: "08:30 – 11:30" },
        { term: "Guests", description: "2 adults" },
      ]} />
    </Stack>
  </AppShell>
</PlatformPhone>`,
  },
];

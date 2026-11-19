import { Fragment, useId, useState, type RefObject } from "react";
import {
  AppShell, Avatar, BottomNavigation, Divider, Heading, IconButton, Image, Stack, TabPanel, Tabs, Text, TopNavigation,
  useToast, type AvatarProps, type BottomNavigationItem,
} from "@zen-ds/react";
import { photos, type Photo } from "../../data";

type AvatarTheme = NonNullable<AvatarProps["theme"]>;

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
type Post = { id: string; author: string; initials: string; theme: AvatarTheme; meta: string; text: string; photo?: Photo; likes: string; comments: string; tabs: string[] };
const posts: Post[] = [
  {
    id: "track-6", author: "Maya Thompson", initials: "MT", theme: "pink", meta: "2h · Public",
    text: "First wear of the Track 6 in olive. Gum sole is softer than it looks. Sizing runs half a size big.",
    photo: photos.products.olive, likes: "1.2k", comments: "86", tabs: ["for-you", "following", "drops"],
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

/** C3 · Feed (Figma ◇ Master-Layout · Example, 15922:7729): AppShell/Mobile · Phone · Top=Bar · Bottom=Floating (Glass). */
// scrollRef: what scrolls the screen, so the bar follows the scroll. "window" in your app.
export default function FeedPhone({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const [root, setRoot] = useState("home");
  const [tab, setTab] = useState("for-you");
  const tabsId = useId();
  return (
    // Bar + Floating-Glass on Canvas/Alt: content first, chrome last. A compact Default bar with the feed filters in its
    // Control-Bar, posts separated by hairlines, full-width media, and the glass bar the feed scrolls under.
    <AppShell canvas="alt"
      topNavigation={<TopNavigation type="default" title="Kicks" scrollRef={scrollRef}
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
  );
}

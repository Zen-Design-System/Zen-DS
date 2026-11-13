import { useId, useRef, useState, type RefObject } from "react";
import { AppShell, Avatar, Button, Divider, Grid, IconButton, Image, Stack, Text, TopNavigation, plural } from "@zen-ds/react";
import { TODAY, daysFromToday, formatRelative, initials, people, photos, projectById, type Person, type PersonId, type Photo } from "../../data";

/** Bytes that are not a picture: the browser fails to decode them without a network request, so a demo can fail on cue. */
const unreadable = "data:image/png;base64,AAAA";
const minutesAgo = (minutes: number) => new Date(TODAY.getTime() - minutes * 60_000);
/** A person as Avatar props: their photo, or initials on their steady theme. The text beside it already names them. */
const avatarOf = (person: Person) => person.photo
  ? { theme: "photo" as const, src: person.photo, alt: "" }
  : { theme: person.theme, alt: "", children: initials(person.name) };

type Post = { id: string; author: PersonId; at: Date; project: string; text: string; photos: Photo[]; likes: number; unreadable?: boolean };
const posts: Post[] = [
  { id: "p1", author: "gia", at: minutesAgo(13), project: "saola-brand", text: "The shortlist for the outdoor range is in: wet stone and deep greens, nothing too polished.", photos: [photos.feed[1], photos.feed[7]], likes: 12 },
  { id: "p2", author: "emi", at: daysFromToday(0, 9, 5), project: "bookfair-site", text: "Venue walk-through for the Book Fair recap. The courtyard gets the best light before 10.", photos: [photos.site[0]], likes: 8 },
  { id: "p3", author: "chi", at: daysFromToday(-1, 16, 40), project: "phin-loyalty", text: "Counter visit at Phin Nguyen Hue: most people pay before they think about a reward.", photos: [photos.site[5]], likes: 15 },
  { id: "p4", author: "gia", at: daysFromToday(-1, 11, 20), project: "saola-brand", text: "Coast road at golden hour, a candidate for the launch hero.", photos: [photos.feed[6]], likes: 21, unreadable: true },
  { id: "p5", author: "ava", at: daysFromToday(-2, 14, 30), project: "lumen-banking", text: "Bridge shots for the transfers onboarding. Calm, not corporate.", photos: [photos.site[4]], likes: 6 },
  { id: "p6", author: "emi", at: daysFromToday(-5, 10, 0), project: "saola-brand", text: "Two more for the winter shell line.", photos: [photos.feed[4], photos.feed[5]], likes: 9 },
  { id: "p7", author: "linh", at: daysFromToday(-7, 15, 45), project: "bookfair-site", text: "The Old Quarter from the hill, for the About page.", photos: [photos.site[2], photos.site[1]], likes: 4 },
  { id: "p8", author: "gia", at: daysFromToday(-9, 9, 15), project: "saola-brand", text: "First pass at the moodboard. More to come after the kickoff.", photos: [photos.feed[0]], likes: 17 },
];

function FeedPost({ post }: { post: Post }) {
  const author = people[post.author];
  const nameId = useId();
  const [liked, setLiked] = useState(false);
  // One post's file can't be read the first time; Reload photo fetches it again (Skeleton, then the picture).
  const [src, setSrc] = useState<string | undefined>(post.unreadable ? unreadable : undefined);
  const [failed, setFailed] = useState(false);
  const nameRef = useRef<HTMLSpanElement>(null);
  const reload = () => {
    // Reload photo goes away while the picture loads again, so focus moves to the line that names the post (tabIndex
    // -1), which stays. Not to Like: its name tooltip opens on focus and would spill past the phone's screen. The feed
    // scrolls only as far as it must to show the name (focus alone would centre it).
    nameRef.current?.focus({ preventScroll: true });
    nameRef.current?.scrollIntoView({ block: "nearest" });
    setFailed(false);
    setSrc(undefined);
    setTimeout(() => setSrc(post.photos[0].src), 1000);
  };
  const photoSrc = (photo: Photo) => (post.unreadable ? src : photo.src);
  return (
    <Stack as="article" gap="md" aria-labelledby={nameId}>
      <Stack direction="row" gap="sm" align="center">
        <Avatar size="md" {...avatarOf(author)} />
        {/* Start-aligned, so the name's focus ring hugs the name. */}
        <Stack gap="2xs" align="start">
          <Text ref={nameRef} as="span" id={nameId} tabIndex={-1} textStyle="Body/Base/Bold">{author.name}</Text>
          <Text as="span" textStyle="Body/Small/Regular" tone="base">{`${projectById(post.project).name} · ${formatRelative(post.at)}`}</Text>
        </Stack>
      </Stack>
      <Text>{post.text}</Text>
      {/* Pictures further down load lazily (the default) as the feed scrolls; each frame keeps its ratio meanwhile. */}
      {post.photos.length > 1 ? (
        <Grid columns={2} gap="2xs">
          {post.photos.map((photo) => <Image key={photo.src} src={photo.src} alt={photo.alt} ratio="1:1" radius="lg" />)}
        </Grid>
      ) : (
        <Image src={photoSrc(post.photos[0])} alt={post.photos[0].alt} ratio="4:3" radius="lg" onError={() => setFailed(true)} />
      )}
      {failed ? <Stack align="start"><Button level="tertiary" startIcon="icon-refresh-cw-01-line" onClick={reload}>Reload photo</Button></Stack> : null}
      <Stack direction="row" gap="2xs" align="center">
        {/* The whole 40px target stays inside the post (nothing overhangs the screen margin), so the heart sits its own inset in. */}
        <IconButton appearance="flat" level="primary" size="md" icon={liked ? "icon-heart-solid" : "icon-heart-line"}
          aria-label={`Like ${author.name.split(" ")[0]}’s post`} aria-pressed={liked} onClick={() => setLiked(!liked)} />
        <Text as="span" textStyle="Body/Small/Medium" tone="base">{plural(post.likes + (liked ? 1 : 0), "like")}</Text>
      </Stack>
    </Stack>
  );
}

/** The studio's Updates feed on a phone: lazy pictures under a large title that folds as the posts scroll. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function PhoneFeed({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  return (
    <AppShell topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Updates" largeTitle="Updates" />}>
      <Stack gap="lg">
        {posts.map((post, index) => (
          <Stack key={post.id} gap="lg">
            {index > 0 ? <Divider /> : null}
            <FeedPost post={post} />
          </Stack>
        ))}
      </Stack>
    </AppShell>
  );
}

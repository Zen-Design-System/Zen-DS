import { useId, useRef, useState } from "react";
import type { PlatformPage } from "../../PlatformExamples";
import type { ExampleDef } from "../types";
import { PlatformPhone, usePhoneScreen } from "../../PlatformPhone";
import { ActionBar } from "../../../components/ActionBar";
import { Avatar, type AvatarSize } from "../../../components/Avatar";
import { Button } from "../../../components/Button";
import { Card } from "../../../components/Card";
import { Chip } from "../../../components/Chip";
import { DockIcon } from "../../../components/DockIcon";
import { Form, FormActions, FormFieldset } from "../../../components/Form";
import { InlineMessage } from "../../../components/InlineMessage";
import { TextAreaField } from "../../../components/Input";
import { Grid, Stack } from "../../../components/Layout";
import { List, ListBox, ListItem } from "../../../components/ListItem";
import { Metric } from "../../../components/MetricWidget";
import { ProgressBar } from "../../../components/Progress";
import { NpsScale, OpinionScale, Rating, RatingDisplay, type OpinionEmotion } from "../../../components/Rating";
import { Heading, Text, plural } from "../../../components/Text";
import { useToast } from "../../../components/Toast";
import { TopNavigation } from "../../../components/TopNavigation";
import { daysFromToday, formatRelative, initials, people, type Person } from "../data";
import { keepOnHotUpdate } from "../../hotData";
import "./rating.css";

export const page: PlatformPage = "rating";

/** People are Avatars: a photo when there is one, otherwise solid initials on the person's steady theme (one look on every page). */
function PersonAvatar({ person, size }: { person: Pick<Person, "name" | "theme" | "photo">; size: AvatarSize }) {
  return person.photo
    ? <Avatar size={size} theme="photo" src={person.photo} alt="" />
    : <Avatar size={size} theme={person.theme} alt="">{initials(person.name)}</Avatar>;
}

/* ───────────── 1. Review summary: an average always travels with its sample size ───────────── */

// Phin Rewards, the loyalty app the studio builds for Phin & Co, as the App Store reports it.
const appRatings = {
  all: { label: "All versions", average: 4.6, count: 1284, trend: "+0.2 vs. August", shares: [68, 19, 7, 3, 3] },
  latest: { label: "Version 2.4", average: 4.8, count: 212, trend: "+0.3 vs. version 2.3", shares: [81, 13, 3, 1, 2] },
} as const;
type RatingScope = keyof typeof appRatings;

function ReviewSummaryExample() {
  const [scope, setScope] = useState<RatingScope>("all");
  const data = appRatings[scope];
  return (
    <Card theme="flat" className="px-rating-card">
      <Stack gap="md">
        <Stack direction="row" justify="between" align="start" gap="sm" wrap>
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">Phin Rewards on the App Store</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">Loyalty app · Phin & Co</Text>
          </Stack>
          <Chip variant="advanced" popoverLabel="Version"
            popoverItems={(Object.keys(appRatings) as RatingScope[]).map((id) => ({ id, label: appRatings[id].label, selected: id === scope }))}
            onPopoverSelect={(item) => setScope(item.id as RatingScope)}>
            {data.label}
          </Chip>
        </Stack>
        {/* One value treatment: the Metric gives the number and its trend, the stars under it carry the sample size. */}
        <Stack gap="xs">
          <Metric size="md" icon={false} label="Average rating" value={data.average.toFixed(1)}
            trend={{ direction: "positive", label: data.trend }} />
          <Stack direction="row" gap="xs" align="center">
            <RatingDisplay value={data.average} size="md" />
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{plural(data.count, "rating")}</Text>
          </Stack>
        </Stack>
        {/* One bar per star value, 5 → 1, each with its share of the ratings: a two-column grid, so the bars line up. */}
        <Grid columns="auto minmax(0, 1fr)" columnGap="sm" rowGap="xs" align="center">
          {data.shares.map((share, index) => [
            <Text key={`label-${index}`} as="span" textStyle="Body/Small/Regular" tone="base">{plural(5 - index, "star")}</Text>,
            <ProgressBar key={`bar-${index}`} className="px-rating-bar" value={share} label aria-label={`${plural(5 - index, "star")}: ${share}% of ratings`} />,
          ])}
        </Grid>
      </Stack>
    </Card>
  );
}

/* ───────────── 2. Interview scorecard: star inputs in a form, each with its meaning ───────────── */

const skills = [
  { id: "craft", label: "Visual craft" },
  { id: "interaction", label: "Interaction design" },
  { id: "communication", label: "Communication" },
  { id: "collaboration", label: "Collaboration" },
];
// Each star value has a word, so "4" reads the same to every interviewer.
const bar = ["", "Weak", "Below the bar", "Meets the bar", "Strong", "Exceptional"];
const candidate = { name: "Lan Hoang", theme: "indigo" as const, role: "Senior Product Designer" };

function ScorecardExample() {
  const [scores, setScores] = useState<Record<string, number>>({ craft: 4, interaction: 5, communication: 0, collaboration: 0 });
  const [tried, setTried] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  // A failed submit marks each unrated skill; Form then focuses the first one and announces how many are left.
  const submit = () => {
    setTried(true);
    if (skills.every((skill) => scores[skill.id])) setSubmitted(true);
  };
  // The whole card is the form: header, skills and actions take the Form's gap.
  return (
    <Card theme="flat" className="px-rating-card">
      <Form onSubmit={submit}>
        <Stack direction="row" gap="sm" align="center">
          <PersonAvatar person={candidate} size="md" />
          <Stack gap="xs">
            <Heading level={4} textStyle="Heading/Subheading">{candidate.name}</Heading>
            <Text textStyle="Body/Small/Regular" tone="base">{candidate.role} · Portfolio review</Text>
          </Stack>
        </Stack>
        {submitted ? (
          <InlineMessage theme="positive" title="Scorecard submitted" action={{ label: "Edit scorecard", onClick: () => setSubmitted(false) }}>
            {people.minhAnh.name} shares the panel's scores on Friday.
          </InlineMessage>
        ) : (
          <>
            {/* Skills are stacked fields (md); each row wraps its stars under the name on a narrow card. */}
            <FormFieldset legend="Skills" gap="md">
              {skills.map((skill) => (
                // One fieldset per skill carries its own error; the visible name is its (hidden) legend's twin.
                <FormFieldset key={skill.id} legend={skill.label} hideLegend error={tried && !scores[skill.id] ? "Choose from 1 to 5 stars" : undefined}>
                  <Stack direction="row" justify="between" align="center" gap="sm" wrap>
                    <Text as="span" aria-hidden="true">{skill.label}</Text>
                    <Stack direction="row" gap="xs" align="center">
                      <Rating aria-label={skill.label} value={scores[skill.id]} onValueChange={(value) => setScores({ ...scores, [skill.id]: value })} />
                      {/* The word keeps one width, so the stars line up row to row. */}
                      <Text as="span" textStyle="Body/Small/Regular" tone="base" className="px-rating-word">{bar[scores[skill.id]]}</Text>
                    </Stack>
                  </Stack>
                </FormFieldset>
              ))}
            </FormFieldset>
            <FormActions>
              <Button level="primary" type="submit">Submit scorecard</Button>
            </FormActions>
          </>
        )}
      </Form>
    </Card>
  );
}

/* ───────────── 3. Rate your order: a phone rating that asks what went wrong ───────────── */

// Phin & Co's loyalty app: Alex's pick-ups, newest first. This morning's order waits for a rating, as does one from
// last Saturday; the rest already have one.
type Review = { stars: number; problems: string[]; note: string };
type PhinOrder = { id: string; store: string; picked: Date; items: number };
const phinOrders: PhinOrder[] = [
  { id: "A-247", store: "Phin Nguyễn Huệ", picked: daysFromToday(0, 8, 5), items: 2 },
  { id: "A-239", store: "Phin Lê Lợi", picked: daysFromToday(-1, 8, 12), items: 1 },
  { id: "A-236", store: "Phin Thảo Điền", picked: daysFromToday(-2, 15, 40), items: 3 },
  { id: "A-231", store: "Phin Nguyễn Huệ", picked: daysFromToday(-4, 9, 20), items: 2 },
  { id: "A-228", store: "Phin Đa Kao", picked: daysFromToday(-5, 8, 2), items: 1 },
  { id: "A-224", store: "Phin Lê Lợi", picked: daysFromToday(-6, 12, 45), items: 4 },
  { id: "A-219", store: "Phin Nguyễn Huệ", picked: daysFromToday(-8, 8, 10), items: 1 },
  { id: "A-215", store: "Phin Bến Thành", picked: daysFromToday(-9, 17, 30), items: 2 },
  { id: "A-209", store: "Phin Thảo Điền", picked: daysFromToday(-11, 9, 0), items: 2 },
  { id: "A-204", store: "Phin Nguyễn Huệ", picked: daysFromToday(-12, 8, 15), items: 1 },
  { id: "A-198", store: "Phin Phú Mỹ Hưng", picked: daysFromToday(-15, 14, 5), items: 3 },
  { id: "A-193", store: "Phin Lê Lợi", picked: daysFromToday(-16, 8, 20), items: 1 },
  { id: "A-187", store: "Phin Nguyễn Huệ", picked: daysFromToday(-19, 8, 0), items: 2 },
  { id: "A-182", store: "Phin Đa Kao", picked: daysFromToday(-20, 10, 40), items: 1 },
  { id: "A-176", store: "Phin Nguyễn Huệ", picked: daysFromToday(-22, 8, 25), items: 2 },
];
const sentReviews: Record<string, Review> = Object.fromEntries(
  ([["A-239", 5], ["A-236", 4], ["A-228", 5], ["A-224", 3], ["A-219", 5], ["A-215", 4], ["A-209", 5], ["A-204", 5], ["A-198", 2], ["A-193", 5], ["A-187", 4], ["A-182", 5], ["A-176", 4]] as const)
    .map(([id, stars]) => [id, { stars, problems: stars <= 3 ? ["Long wait"] : [], note: "" }]),
);
const orderWords = ["", "Poor", "Not great", "Okay", "Good", "Great"];
const problems = ["Drink was cold", "Wrong item", "Long wait", "Missing item", "Spilled in the bag"];

function PhoneOrderExample() {
  const { toast } = useToast();
  const screen = usePhoneScreen();
  const formId = useId();
  // One scroller per screen; the PlatformPhone is keyed per screen, so each opens at the top and folds on its own.
  const screenRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);
  const [sent, setSent] = useState(sentReviews);
  // Unsent answers stay as a draft per order, so Back never throws them away.
  const [drafts, setDrafts] = useState<Record<string, Review>>({});
  const [openId, setOpenId] = useState<string | null>("A-247");
  const [error, setError] = useState(false);
  const order = phinOrders.find((item) => item.id === openId);
  const review = openId ? drafts[openId] ?? sent[openId] ?? { stars: 0, problems: [], note: "" } : null;
  const edit = (patch: Partial<Review>) => { if (openId && review) setDrafts({ ...drafts, [openId]: { ...review, ...patch } }); };
  const open = (id: string) => screen.go('.zen-top-nav__action[aria-label="Back"]', () => { setOpenId(id); setError(false); });
  const back = () => { if (openId) screen.go(`[data-order="${openId}"] .zen-list-item__wrapper`, () => setOpenId(null)); };
  const send = () => {
    if (!openId || !review) return;
    // Send without a star: the line under the stars says so, and focus goes to the first star.
    if (!review.stars) { setError(true); starsRef.current?.querySelector("input")?.focus(); return; }
    setSent({ ...sent, [openId]: review });
    setDrafts(Object.fromEntries(Object.entries(drafts).filter(([id]) => id !== openId)));
    toast({ title: "Rating sent" });
    back();
  };

  if (!order || !review) {
    return (
      <PlatformPhone key="root" label="Orders" headerOverlay screenRef={screenRef}
        header={<TopNavigation type="alt" title="Orders" largeTitle="Orders" scrollRef={screenRef} />}>
        {screen.anchor}
        {/* Margin-Compact body (padding lg, 20). Rows pad 12px above and below only, so their content sits at the margin
            and the interactive fill (12px past the row sideways) stays 8px inside the screen. */}
        <Stack padding="lg">
          <List aria-label="Orders">
            {phinOrders.map((item) => (
              <ListItem key={item.id} data-order={item.id} title={item.store} onClick={() => open(item.id)}
                leading={<DockIcon icon="icon-coffee-cup-line" theme="orange" background="subtle" />}
                caption={`${item.id} · ${drafts[item.id] ? "Rating not sent" : formatRelative(item.picked)}`}
                trailing={sent[item.id] ? <RatingDisplay value={sent[item.id].stars} size="sm" label={`You rated ${plural(sent[item.id].stars, "star")}`} />
                  : <Text as="span" textStyle="Body/Small/Regular" tone="base">Not rated</Text>} />
            ))}
          </List>
        </Stack>
      </PlatformPhone>
    );
  }
  const low = review.stars > 0 && review.stars <= 3;
  const toggle = (problem: string) => edit({ problems: review.problems.includes(problem) ? review.problems.filter((item) => item !== problem) : [...review.problems, problem] });
  return (
    <PlatformPhone key={order.id} label="Rate your order" headerOverlay screenRef={screenRef}
      header={<TopNavigation type="compact-alt" title="Rate your order" scrollRef={screenRef} leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
      footer={<ActionBar position="static" primaryAction={{ label: "Send rating", type: "submit", form: formId }} />}>
      {screen.anchor}
      <Stack padding="lg">
        <Form id={formId} onSubmit={send}>
          <List aria-label="Order">
            <ListItem leading={<DockIcon icon="icon-coffee-cup-line" theme="orange" background="subtle" />}
              title={`${order.id} · ${order.store}`} caption={`${plural(order.items, "item")} · ${formatRelative(order.picked)}`} />
          </List>
          <Stack ref={starsRef} gap="xs" align="center">
            <Heading level={2} textStyle="Heading/Subheading" align="center">How was your order?</Heading>
            <Rating aria-label="How was your order?" size="xl" value={review.stars} onValueChange={(stars) => { edit({ stars }); setError(false); }} />
            <Text role="status" tone={error ? "negative" : "base"} align="center">{error ? "Choose from 1 to 5 stars" : orderWords[review.stars]}</Text>
          </Stack>
          {/* A low score asks what went wrong; both answers stay optional. */}
          {low ? (
            <>
              <FormFieldset legend="What went wrong?" optional>
                <Stack direction="row" gap="xs" wrap>
                  {problems.map((problem) => (
                    <Chip key={problem} variant="normal" level="secondary"
                      selected={review.problems.includes(problem)} onClick={() => toggle(problem)}>
                      {problem}
                    </Chip>
                  ))}
                </Stack>
              </FormFieldset>
              <TextAreaField size="lg" label="Anything else" labelOptional rows={3} value={review.note} onValueChange={(note) => edit({ note })} placeholder="Tell the store team" />
            </>
          ) : null}
        </Form>
      </Stack>
    </PlatformPhone>
  );
}

/* ───────────── 4. Team pulse: an emoji opinion with a follow-up for bad weeks ───────────── */

function PulseExample() {
  const [mood, setMood] = useState<OpinionEmotion | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const low = mood === "disappointed";
  // Survey cards are compact (spacing small), as in NPS survey; on a narrow card the faces keep one row and drop their labels.
  return (
    <Card theme="flat" spacing="small" className="px-rating-card">
      <Form onSubmit={() => setSent(true)}>
        <Stack gap="xs">
          <Heading level={4} textStyle="Heading/Subheading">How was this week's design critique?</Heading>
          <Text textStyle="Body/Small/Regular" tone="base">Answers are anonymous. {people.minhAnh.name} reads them on Friday.</Text>
        </Stack>
        {sent ? (
          <InlineMessage theme="positive" title="Answer sent" action={{ label: "Change answer", onClick: () => setSent(false) }}>
            Thanks. Next week's critique is on Tuesday at 2:00 pm.
          </InlineMessage>
        ) : (
          <>
            <OpinionScale scale={3} aria-label="How was this week's design critique?" value={mood} onValueChange={setMood} />
            {low ? <TextAreaField label="What would make it better" labelOptional rows={2} value={note} onValueChange={setNote} /> : null}
            {mood ? (
              <FormActions>
                <Button level="primary" type="submit">Send answer</Button>
              </FormActions>
            ) : null}
          </>
        )}
      </Form>
    </Card>
  );
}

/* ───────────── 5. NPS survey: the follow-up question follows the score ───────────── */

const followUp = (score: number) =>
  score <= 6 ? "What should we fix first" : score <= 8 ? "What would make Zen a 10" : "What do you like most about Zen";

function NpsExample() {
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);
  // A survey card is small (spacing small), which leaves the 0–10 scale the most room on a narrow card.
  return (
    <Card theme="flat" spacing="small" className="px-rating-card">
      <Form onSubmit={() => setSent(true)}>
        <Heading level={4} textStyle="Heading/Subheading">How likely are you to recommend Zen?</Heading>
        {sent && score !== null ? (
          <InlineMessage theme="positive" title={`You answered ${score} out of 10`} action={{ label: "Change answer", onClick: () => setSent(false) }}>
            The product team reads every answer.
          </InlineMessage>
        ) : (
          <>
            <NpsScale scale={10} aria-label="How likely are you to recommend Zen?" lowLabel="Not likely" highLabel="Very likely"
              value={score} onValueChange={setScore} />
            {score !== null ? (
              <>
                <TextAreaField label={followUp(score)} labelOptional rows={2} value={reason} onValueChange={setReason} />
                <FormActions>
                  <Button level="primary" type="submit">Send feedback</Button>
                </FormActions>
              </>
            ) : null}
          </>
        )}
      </Form>
    </Card>
  );
}

/* ───────────── 6. Ratings in a list: stars with their count, or no stars at all ───────────── */

type Freelancer = { id: string; name: string; theme: Person["theme"]; rate: number; average: number; reviews: number };
const freelancers: Freelancer[] = [
  { id: "nam", name: "Nam Trinh", theme: "blue", rate: 45, average: 4.9, reviews: 38 },
  { id: "thu", name: "Thu Dang", theme: "pink", rate: 40, average: 4.6, reviews: 112 },
  { id: "kai", name: "Kai Yamada", theme: "violet", rate: 60, average: 4.2, reviews: 9 },
  { id: "vy", name: "Vy Lam", theme: "crimson", rate: 35, average: 0, reviews: 0 },
];
const sorts = {
  rating: { label: "Highest rated", compare: (a: Freelancer, b: Freelancer) => b.average - a.average },
  reviews: { label: "Most reviews", compare: (a: Freelancer, b: Freelancer) => b.reviews - a.reviews },
  price: { label: "Lowest rate", compare: (a: Freelancer, b: Freelancer) => a.rate - b.rate },
};
type SortId = keyof typeof sorts;

function FreelancerListExample() {
  const [sortId, setSortId] = useState<SortId>("rating");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const rows = [...freelancers].sort(sorts[sortId].compare);
  const toggle = (id: string) => setShortlist((list) => list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  return (
    <Stack gap="md" className="px-rating-card">
      <Stack direction="row" justify="between" align="center" gap="sm">
        <Heading level={4} textStyle="Heading/4">Freelance illustrators</Heading>
        <Chip variant="advanced" popoverLabel="Sort by"
          popoverItems={(Object.keys(sorts) as SortId[]).map((id) => ({ id, label: sorts[id].label, selected: id === sortId }))}
          onPopoverSelect={(item) => setSortId(item.id as SortId)}>
          {sorts[sortId].label}
        </Chip>
      </Stack>
      {/* A box made only of List-Items is a ListBox. Its Body-Slot padding keeps the row fill (12px past the row sideways)
          inside the edge. */}
      <ListBox>
        <List aria-label="Freelance illustrators">
          {rows.map((person) => (
            <ListItem key={person.id} selected={shortlist.includes(person.id)} onClick={() => toggle(person.id)}
              leading={<PersonAvatar person={person} size="md" />} title={person.name}
              caption={person.reviews ? (
                <span className="px-rating-caption">
                  <RatingDisplay value={person.average} size="xs" />
                  {`${person.average.toFixed(1)} · ${plural(person.reviews, "review")}`}
                </span>
              ) : "No reviews yet"}
              trailing={<Text as="span" textStyle="Body/Small/Regular" tone="base">{`$${person.rate}/h`}</Text>} />
          ))}
        </List>
      </ListBox>
      <Text role="status" textStyle="Body/Small/Regular" tone="base">{shortlist.length ? `${plural(shortlist.length, "person", "people")} on your shortlist` : ""}</Text>
    </Stack>
  );
}

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Review summary",
    description: "The Metric states the average and its trend once; the read-only RatingDisplay under it shows the same value as stars, fractions allowed, always next to how many ratings it comes from. The bars show how the stars split, and the Version chip switches the whole summary.",
    render: () => <ReviewSummaryExample />,
    code: `<Stack gap="xs">
  <Metric size="md" icon={false} label="Average rating" value="4.6"
    trend={{ direction: "positive", label: "+0.2 vs. August" }} />
  <Stack direction="row" gap="xs" align="center">
    <RatingDisplay value={4.6} size="md" />
    <Text as="span" textStyle="Body/Small/Regular" tone="base">{plural(1284, "rating")}</Text>
  </Stack>
</Stack>
<Grid columns="auto minmax(0, 1fr)" columnGap="sm" rowGap="xs" align="center">
  {shares.map((share, i) => [
    <Text key={\`label-\${i}\`} as="span" textStyle="Body/Small/Regular" tone="base">{plural(5 - i, "star")}</Text>,
    <ProgressBar key={\`bar-\${i}\`} value={share} label aria-label={\`\${plural(5 - i, "star")}: \${share}% of ratings\`} />,
  ])}
</Grid>`,
  },
  {
    title: "Interview scorecard",
    description: "One star input per skill, each named by its skill and followed by the word its value stands for. Tab moves between skills and the arrow keys change the stars; submitting with a skill unrated marks it and moves focus to its first star.",
    render: () => <ScorecardExample />,
    code: `const bar = ["", "Weak", "Below the bar", "Meets the bar", "Strong", "Exceptional"];

<Form onSubmit={submit}>
  <FormFieldset legend="Skills" gap="md">
    {skills.map((skill) => (
      <FormFieldset key={skill.id} legend={skill.label} hideLegend
        error={tried && !scores[skill.id] ? "Choose from 1 to 5 stars" : undefined}>
        <Stack direction="row" justify="between" align="center" gap="sm" wrap>
          <Text as="span" aria-hidden="true">{skill.label}</Text>
          <Stack direction="row" gap="xs" align="center">
            <Rating aria-label={skill.label} value={scores[skill.id]} onValueChange={(value) => rate(skill.id, value)} />
            {/* the word keeps one width (6.5rem), so the stars line up row to row */}
            <Text as="span" textStyle="Body/Small/Regular" tone="base">{bar[scores[skill.id]]}</Text>
          </Stack>
        </Stack>
      </FormFieldset>
    ))}
  </FormFieldset>
  <FormActions>
    <Button level="primary" type="submit">Submit scorecard</Button>
  </FormActions>
</Form>`,
  },
  {
    title: "Rate your order",
    description: "On a phone the stars are XLarge and the question is also the group's name. Three stars or fewer asks what went wrong, both answers optional; Send without a star says so under the stars, and Back to the Orders list keeps the answers as a draft.",
    render: () => <PhoneOrderExample />,
    code: `const screenRef = useRef<HTMLDivElement>(null);
const starsRef = useRef<HTMLDivElement>(null);
// Send without a star says so under the stars and moves focus to the first star.
const send = () => {
  if (!review.stars) { setError(true); starsRef.current?.querySelector("input")?.focus(); return; }
  sendRating(order.id, review);
  back();
};

// Orders root: large title that folds as the 15 orders scroll
<PlatformPhone key="root" headerOverlay screenRef={screenRef}
  header={<TopNavigation type="alt" title="Orders" largeTitle="Orders" scrollRef={screenRef} />}>…</PlatformPhone>

// The order's rating screen: a child, compact with Back
<PlatformPhone key={order.id} headerOverlay screenRef={screenRef}
  header={<TopNavigation type="compact-alt" title="Rate your order" scrollRef={screenRef}
    leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
  footer={<ActionBar position="static" primaryAction={{ label: "Send rating", type: "submit", form: formId }} />}>
  <Stack padding="lg">
    <Form id={formId} onSubmit={send}>
      <Stack ref={starsRef} gap="xs" align="center">
        <Heading level={2} textStyle="Heading/Subheading" align="center">How was your order?</Heading>
        <Rating aria-label="How was your order?" size="xl" value={review.stars} onValueChange={(stars) => edit({ stars })} />
        <Text role="status" tone={error ? "negative" : "base"} align="center">
          {error ? "Choose from 1 to 5 stars" : words[review.stars]}
        </Text>
      </Stack>
      {review.stars > 0 && review.stars <= 3 ? (
        <FormFieldset legend="What went wrong?" optional>
          {problems.map((problem) => (
            <Chip key={problem} variant="normal" level="secondary"
              selected={review.problems.includes(problem)} onClick={() => toggle(problem)}>{problem}</Chip>
          ))}
        </FormFieldset>
      ) : null}
    </Form>
  </Stack>
</PlatformPhone>`,
  },
  {
    title: "Team pulse",
    description: "An OpinionScale asks how something felt, not how good it was, and three faces are enough for a weekly pulse. Send appears once there is an answer; the unhappy face adds an optional question about what would help.",
    render: () => <PulseExample />,
    code: `const [mood, setMood] = useState<OpinionEmotion | null>(null);
const low = mood === "disappointed";

{/* spacing small: a compact survey card */}
<Card theme="flat" spacing="small">
  <Form onSubmit={send}>
    <Heading level={4} textStyle="Heading/Subheading">How was this week's design critique?</Heading>
    <OpinionScale scale={3} aria-label="How was this week's design critique?" value={mood} onValueChange={setMood} />
    {low ? <TextAreaField label="What would make it better" labelOptional rows={2} value={note} onValueChange={setNote} /> : null}
    {mood ? <FormActions><Button level="primary" type="submit">Send answer</Button></FormActions> : null}
  </Form>
</Card>`,
  },
  {
    title: "NPS survey",
    description: "The 0–10 scale names both ends in words. The follow-up question changes with the score: what to fix for a low one, what would make it a 10 for a middle one, what works for a high one.",
    render: () => <NpsExample />,
    code: `const followUp = (score) => score <= 6 ? "What should we fix first" : score <= 8 ? "What would make Zen a 10" : "What do you like most about Zen";

<Card theme="flat" spacing="small">
  <Form onSubmit={send}>
    <Heading level={4} textStyle="Heading/Subheading">How likely are you to recommend Zen?</Heading>
    <NpsScale scale={10} aria-label="How likely are you to recommend Zen?"
      lowLabel="Not likely" highLabel="Very likely" value={score} onValueChange={setScore} />
    {score !== null ? (
      <>
        <TextAreaField label={followUp(score)} labelOptional rows={2} value={reason} onValueChange={setReason} />
        <FormActions><Button level="primary" type="submit">Send feedback</Button></FormActions>
      </>
    ) : null}
  </Form>
</Card>`,
  },
  {
    title: "Ratings in a list",
    description: "In a row the RatingDisplay sits in the caption, XSmall, with the average and the number of reviews beside it. Someone without reviews says so in words, never as five empty stars. The Sort chip reorders the list, and a row click adds the person to a shortlist.",
    render: () => <FreelancerListExample />,
    code: `<ListBox>
  <List aria-label="Freelance illustrators">
    <ListItem title={person.name} selected={shortlist.includes(person.id)} onClick={() => toggle(person.id)}
      leading={<Avatar size="md" theme={person.theme} alt="">{initials(person.name)}</Avatar>}
      caption={person.reviews ? (
        <span className="rating-caption">{/* inline-flex; align-items: center; gap: 4px */}
          <RatingDisplay value={person.average} size="xs" />
          {\`\${person.average.toFixed(1)} · \${plural(person.reviews, "review")}\`}
        </span>
      ) : "No reviews yet"}
      trailing={<Text as="span" textStyle="Body/Small/Regular" tone="base">{\`$\${person.rate}/h\`}</Text>} />
  </List>
</ListBox>`,
  },
]);

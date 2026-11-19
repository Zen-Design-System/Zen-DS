import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, BottomSheet, Box, DatePicker, DockIcon, Form, Heading, InputField, List, ListBox, ListItem, SelectField, Stack, Text, TopNavigation,
  useToast, type DatePickerTime,
} from "@zen-ds/react";
import { TODAY, daysFromToday, formatDay, projectById, projects } from "../../data";

const weekday = (date: Date, style: "long" | "short" = "long") => date.toLocaleString("en-US", { weekday: style });
/** "14:30" (DatePickerTime, 24-hour) → "2:30 pm". */
const clock = (value: string, period = true) => { const [h, m] = value.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")}${period ? (h < 12 ? " am" : " pm") : ""}`; };
const half = (value: string) => (Number(value.split(":")[0]) < 12 ? "am" : "pm");
/** "2:00 – 2:30 pm" · "11:30 am – 12:30 pm" · "All day". */
function timeText(time: DatePickerTime) {
  if (time.fromAllDay) return "All day";
  if (!time.from) return "No time set";
  if (!time.to || time.toAllDay) return clock(time.from);
  return `${clock(time.from, half(time.from) !== half(time.to))} – ${clock(time.to)}`;
}

type Review = { id: string; name: string; project: string; date: Date; time: DatePickerTime };
const at = (from: string, to: string): DatePickerTime => ({ from, to });
// The studio's design reviews for the next three weeks, soonest first.
const firstReviews: Review[] = [
  { id: "r1", name: "Points history screen", project: "phin-loyalty", date: daysFromToday(1), time: at("14:00", "14:30") },
  { id: "r2", name: "Transfer flow findings", project: "lumen-banking", date: daysFromToday(2), time: at("10:00", "11:00") },
  { id: "r3", name: "Rewards at checkout", project: "phin-loyalty", date: daysFromToday(5), time: at("11:00", "11:30") },
  { id: "r4", name: "Metric card guidelines", project: "zen-ds", date: daysFromToday(6), time: at("15:00", "15:30") },
  { id: "r5", name: "Account overview audit", project: "lumen-banking", date: daysFromToday(7), time: at("09:30", "10:30") },
  { id: "r6", name: "Outdoor range moodboard", project: "saola-brand", date: daysFromToday(8), time: at("14:00", "15:00") },
  { id: "r7", name: "Passkey sign-in on iOS", project: "lumen-banking", date: daysFromToday(9), time: at("16:00", "16:30") },
  { id: "r8", name: "Stamp card animation", project: "phin-loyalty", date: daysFromToday(12), time: at("10:00", "10:30") },
  { id: "r9", name: "Input and Search states", project: "zen-ds", date: daysFromToday(13), time: at("14:00", "14:30") },
  { id: "r10", name: "Brand kickoff deck", project: "saola-brand", date: daysFromToday(14), time: at("09:00", "10:00") },
  { id: "r11", name: "Saved payees list", project: "lumen-banking", date: daysFromToday(15), time: at("11:00", "11:30") },
  { id: "r12", name: "Android build polish", project: "phin-loyalty", date: daysFromToday(16), time: at("15:30", "16:00") },
  { id: "r13", name: "Top navigation on phones", project: "zen-ds", date: daysFromToday(19), time: at("10:00", "11:00") },
  { id: "r14", name: "Logo directions", project: "saola-brand", date: daysFromToday(20), time: at("14:00", "15:00") },
  { id: "r15", name: "Release notes screen", project: "phin-loyalty", date: daysFromToday(22), time: at("16:00", "16:30") },
];
// Today is Wednesday: this week ends on Sunday (+4), next week a week later.
const reviewWeeks = [
  { label: "This week", before: daysFromToday(5, 0, 0) },
  { label: "Next week", before: daysFromToday(12, 0, 0) },
  { label: "Later", before: null },
];
const reviewProjects = projects.filter((project) => project.status === "Active" || project.status === "Planning");
const when = (date: Date, time: DatePickerTime) => `${weekday(date, "short")}, ${formatDay(date)} · ${timeText(time)}`;
/** Today is the 30th: the calendar opens on the month of the first day that can still be booked. */
const firstFreeMonth = () => { const tomorrow = daysFromToday(1); return new Date(tomorrow.getFullYear(), tomorrow.getMonth(), 1); };

// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function ReviewSchedule({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const formId = useId();
  const groupId = useId();
  const [atList, setAtList] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [reviews, setReviews] = useState(firstReviews);
  const [project, setProject] = useState(reviewProjects[0].id);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string>();
  const [date, setDate] = useState<Date | null>(null);
  const [month, setMonth] = useState(firstFreeMonth);
  const [time, setTime] = useState<DatePickerTime>({ from: "14:00", to: "14:30" });
  // Focus follows the screen: each screen focuses its title once it shows.
  const titleRef = useRef<HTMLSpanElement>(null);
  const title = (text: string) => <span ref={titleRef} tabIndex={-1}>{text}</span>;
  const toList = () => {
    setDiscarding(false);
    setAtList(true);
    setTimeout(() => titleRef.current?.focus());
  };
  // Back drops the draft only after asking, unless nothing was filled in.
  const back = () => (name.trim() || date ? setDiscarding(true) : toList());
  const openNew = () => {
    setName(""); setNameError(undefined); setDate(null); setMonth(firstFreeMonth());
    setAtList(false);
    setTimeout(() => titleRef.current?.focus());
  };
  const schedule = () => {
    // A failed submit: Form moves focus to the name field and announces it.
    if (!name.trim()) { setNameError("Name the review"); return; }
    if (!date) return;
    setReviews([...reviews, { id: `r${reviews.length + 1}`, name: name.trim(), project, date, time }].sort((a, b) => a.date.getTime() - b.date.getTime()));
    toList();
    toast({ type: "positive", title: "Review scheduled", children: `${name.trim()} · ${when(date, time)}` });
  };

  if (atList) {
    let from = 0;
    const groups = reviewWeeks.map((week) => {
      const until = week.before ? reviews.findIndex((review) => review.date >= week.before!) : -1;
      const rows = reviews.slice(from, until === -1 ? reviews.length : until);
      from += rows.length;
      return { ...week, rows };
    }).filter((group) => group.rows.length);
    return (
      // One key per screen: each screen opens at the top and the large title folds again.
      // The reviews are grouped by week: a grouped list, so the screen is the Canvas with the Alt bar and each week a white
      // ListBox under its kicker. The rows only show a review (Interactive=No) and have no side padding of their own, so the
      // ListBox pads them (20px on a phone) and the kicker lines up with their text (lg, 20px).
      <AppShell key="list"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Reviews" largeTitle={title("Reviews")}
          trailing={[{ icon: "icon-plus-line", label: "New review", onClick: openNew }]} />}>
        <Stack gap="lg">
          {groups.map((group, index) => (
            <Stack key={group.label} as="section" gap="xs" aria-labelledby={`${groupId}-${index}`}>
              <Box paddingX="lg"><Heading level={2} id={`${groupId}-${index}`} textStyle="Body/Small/Bold" tone="light">{group.label}</Heading></Box>
              <ListBox>
                <List aria-labelledby={`${groupId}-${index}`}>
                  {group.rows.map((review) => {
                    const reviewProject = projectById(review.project);
                    return (
                      <ListItem key={review.id} title={review.name} caption={when(review.date, review.time)}
                        leading={<DockIcon icon={reviewProject.icon} theme={reviewProject.theme} background="subtle" label={reviewProject.name} />} />
                    );
                  })}
                </List>
              </ListBox>
            </Stack>
          ))}
        </Stack>
      </AppShell>
    );
  }
  return (
    <>
      {/* A child screen: compact bar with Back; the footer shows the picked slot beside Schedule review. */}
      <AppShell key="new"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title={title("New review")}
          leading={{ icon: "icon-chevron-left-line-medium", label: "Back", onClick: back }} />}
        actionBar={<ActionBar
          summary={<Text as="span" textStyle="Body/Base/Medium" tone={date ? "strongest" : "base"}>{date ? when(date, time) : "No date yet"}</Text>}
          primaryAction={{ label: "Schedule review", type: "submit", form: formId, disabled: !date }} />}>
        <Form id={formId} onSubmit={schedule} gap="md">
          <SelectField size="lg" label="Project" value={project} onValueChange={setProject}
            options={reviewProjects.map((option) => ({ label: option.name, value: option.id }))} />
          <InputField size="lg" label="Review" placeholder="e.g. Points history screen" value={name} error={nameError}
            onValueChange={(next) => { setName(next); setNameError(undefined); }} />
          <Stack gap="xs">
            <Heading level={2} textStyle="Body/Small/Bold" tone="light">Date and time</Heading>
            {/* The calendar keeps its Figma width (Items stay 32px), centred in the phone column. A dot marks a day that
                already has reviews (one per review), so a free day is easy to spot. */}
            <Stack align="center">
              <DatePicker today={TODAY} minDate={TODAY} value={date} onValueChange={setDate} month={month} onMonthChange={setMonth}
                events={reviews.map((review) => review.date)} timePicker time={time} onTimeChange={setTime} />
            </Stack>
          </Stack>
        </Form>
      </AppShell>
      <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this review?"
        primaryAction={{ label: "Discard review", level: "danger", onClick: toList }} secondaryAction={{ label: "Keep editing" }}>
        <Text tone="base">The name and the slot you picked won't be saved.</Text>
      </BottomSheet>
    </>
  );
}

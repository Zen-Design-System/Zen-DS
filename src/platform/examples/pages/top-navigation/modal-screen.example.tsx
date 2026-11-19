import { useId, useRef, useState, type RefObject } from "react";
import {
  ActionBar, AppShell, BottomSheet, DockIcon, Form, InputField, List, ListItem, SelectField, Text, TextAreaField, TopNavigation, useFormState, useToast,
} from "@zen-ds/react";
import { daysFromToday, formatDay, formatTime, me, peopleList, people, projectById, projects, type PersonId } from "../../data";

type Review = { id: string; title: string; project: string; reviewer: PersonId; at: Date };
// Design reviews Alex has booked, soonest first.
const review = (id: string, title: string, projectId: string, reviewer: PersonId, days: number, hour: number, minute = 0): Review =>
  ({ id, title, project: projectId, reviewer, at: daysFromToday(days, hour, minute) });
const bookedReviews: Review[] = [
  review("r1", "Points history flows", "phin-loyalty", "chi", 1, 14),
  review("r2", "Transfer confirmation screen", "lumen-banking", "ava", 1, 15, 30),
  review("r3", "Metric card guidelines", "zen-ds", "chi", 2, 10),
  review("r4", "Rewards API error states", "phin-loyalty", "bao", 2, 16),
  review("r5", "Account overview contrast", "lumen-banking", "finn", 5, 11),
  review("r6", "Outdoor range moodboard", "saola-brand", "gia", 5, 14, 30),
  review("r7", "Customs hold states", "mekong-tracking", "duy", 6, 10, 30),
  review("r8", "Android checkout build", "phin-loyalty", "em", 6, 15),
  review("r9", "Passkey sign-in flow", "lumen-banking", "khoa", 7, 11, 30),
  review("r10", "Logo directions", "saola-brand", "emi", 8, 9, 30),
  review("r11", "Onboarding copy", "lumen-banking", "linh", 8, 14),
  review("r12", "Icon set for Zen 0.5", "zen-ds", "emi", 9, 10),
  review("r13", "Book Fair recap page", "bookfair-site", "linh", 9, 16),
  review("r14", "Driver app sketches", "mekong-tracking", "duy", 15, 10, 30),
];
const reviewSlots = [
  { value: "r-1-16", label: "Thursday, Oct 1 at 4:00 pm", at: daysFromToday(1, 16, 0) },
  { value: "r-2-11", label: "Friday, Oct 2 at 11:00 am", at: daysFromToday(2, 11, 0) },
  { value: "r-5-14", label: "Monday, Oct 5 at 2:00 pm", at: daysFromToday(5, 14, 0) },
  { value: "r-6-10", label: "Tuesday, Oct 6 at 10:00 am", at: daysFromToday(6, 10, 0) },
];
const projectOptions = projects.filter((item) => item.status === "Active" || item.status === "Planning").map((item) => ({ value: item.id, label: item.name }));
const reviewerOptions = [...peopleList].sort((a, b) => a.name.localeCompare(b.name)).filter((person) => person.id !== me.id).map((person) => ({ value: person.id, label: person.name }));
type ReviewDraft = { title: string; project: string; reviewer: string; slot: string; notes: string };
const blankReview: ReviewDraft = { title: "", project: "", reviewer: "", slot: "", notes: "" };

/** Booked design reviews, and the New review screen that opens as a modal over them. */
// scrollRef: what scrolls the screen, so the large title folds into the bar as it scrolls. "window" in your app.
export default function ModalScreen({ scrollRef = "window" }: { scrollRef?: RefObject<HTMLElement | null> | "window" }) {
  const { toast } = useToast();
  const formId = useId();
  const [reviews, setReviews] = useState(bookedReviews);
  const [view, setView] = useState<"reviews" | "new">("new");
  const [discarding, setDiscarding] = useState(false);
  // Focus follows the screen: New review focuses its first field; back on Reviews, focus lands on its title.
  const titleRef = useRef<HTMLSpanElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const form = useFormState<ReviewDraft>({
    // A draft Alex has started: Close has something to lose, so it asks first.
    initialValues: { ...blankReview, title: "Transfer limits screen", project: "lumen-banking" },
    validate: (v) => ({
      title: v.title.trim() ? undefined : "Name what to review",
      project: v.project ? undefined : "Choose a project",
      reviewer: v.reviewer ? undefined : "Choose a reviewer",
      slot: v.slot ? undefined : "Choose a review slot",
    }),
    onSubmit: (v) => {
      const slot = reviewSlots.find((item) => item.value === v.slot)!;
      setReviews((list) => [...list, { id: `r${list.length + 1}`, title: v.title.trim(), project: v.project, reviewer: v.reviewer as PersonId, at: slot.at }]
        .sort((a, b) => a.at.getTime() - b.at.getTime()));
      toReviews();
      toast({ type: "positive", title: "Review booked", children: `${people[v.reviewer as PersonId].name} · ${slot.label}` });
    },
  });
  const hasDraft = Object.values(form.values).some((value) => value.trim());
  // Back to the list: the draft is cleared.
  function toReviews() {
    form.reset(blankReview);
    setDiscarding(false);
    setView("reviews");
    setTimeout(() => titleRef.current?.focus());
  }
  const newReview = () => {
    setView("new");
    setTimeout(() => firstFieldRef.current?.focus());
  };
  // Close drops the draft only after asking, unless there is nothing to lose.
  const close = () => (hasDraft ? setDiscarding(true) : toReviews());

  if (view === "reviews") {
    return (
      <AppShell key="reviews"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="alt" title="Reviews" largeTitle={<span ref={titleRef} tabIndex={-1}>Reviews</span>}
          trailing={[{ icon: "icon-plus-line", label: "New review", onClick: newReview }]} />}>
        {/* Static rows (nothing opens a booked review here) sit in the screen margin, like the New review form. */}
        <List aria-label="Booked reviews">
          {reviews.map((item) => {
            const reviewed = projectById(item.project);
            return (
              <ListItem key={item.id} title={item.title} caption={`${people[item.reviewer].name} · ${formatDay(item.at)} at ${formatTime(item.at)}`}
                leading={<DockIcon icon={reviewed.icon} theme={reviewed.theme} background="subtle" size="md" />} />
            );
          })}
        </List>
      </AppShell>
    );
  }
  return (
    <>
      {/* A create screen opens as a modal: Close on the leading edge, the main action in the footer, never in the bar. */}
      <AppShell key="new"
        topNavigation={<TopNavigation scrollRef={scrollRef} type="compact-alt" title="New review"
          leading={{ icon: "icon-x-medium-line", label: "Close", onClick: close }} />}
        actionBar={<ActionBar primaryAction={{ label: "Book review", type: "submit", form: formId }} />}>
        <Form id={formId} form={form} gap="md">
          <InputField ref={firstFieldRef} size="lg" label="What to review" {...form.field("title")} />
          <SelectField size="lg" label="Project" placeholder="Choose a project" options={projectOptions} {...form.selectField("project")} />
          <SelectField size="lg" label="Reviewer" placeholder="Choose a reviewer" options={reviewerOptions} {...form.selectField("reviewer")} />
          <SelectField size="lg" label="Review slot" placeholder="Choose a slot" options={reviewSlots} {...form.selectField("slot")} />
          <TextAreaField size="lg" label="Notes for the reviewer" labelOptional rows={3} {...form.field("notes")} />
        </Form>
      </AppShell>
      <BottomSheet inline open={discarding} onOpenChange={setDiscarding} title="Discard this review?"
        primaryAction={{ label: "Discard review", level: "danger", onClick: toReviews }}
        secondaryAction={{ label: "Keep editing" }}>
        <Text tone="base">What you entered for this review will be lost.</Text>
      </BottomSheet>
    </>
  );
}

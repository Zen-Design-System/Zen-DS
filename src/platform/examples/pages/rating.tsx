/* Rating examples: an average always travels with its sample size, star inputs say what each value means, a phone
   rating asks what went wrong, an emoji opinion and an NPS survey follow up on the answer, and a list shows stars with
   their count or none at all. Each example is its own file in rating/ (P2b, plan
   docs/research/code-languages-plan-2026-10-03.md §11): the card renders its default export and shows its text as the
   snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import ReviewSummary from "./rating/review-summary.example";
import reviewSummaryRaw from "./rating/review-summary.example.tsx?raw";
import InterviewScorecard from "./rating/interview-scorecard.example";
import interviewScorecardRaw from "./rating/interview-scorecard.example.tsx?raw";
import RateYourOrder from "./rating/rate-your-order.example";
import rateYourOrderRaw from "./rating/rate-your-order.example.tsx?raw";
import TeamPulse from "./rating/team-pulse.example";
import teamPulseRaw from "./rating/team-pulse.example.tsx?raw";
import NpsSurvey from "./rating/nps-survey.example";
import npsSurveyRaw from "./rating/nps-survey.example.tsx?raw";
import FreelancerList from "./rating/ratings-in-a-list.example";
import freelancerListRaw from "./rating/ratings-in-a-list.example.tsx?raw";

export const page: PlatformPage = "rating";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Review summary",
    description: "The Metric states the average and its trend once; the read-only RatingDisplay under it shows the same value as stars, fractions allowed, always next to how many ratings it comes from. The bars show how the stars split, and the Version chip switches the whole summary.",
    render: () => <ReviewSummary />,
    code: exampleCode(reviewSummaryRaw),
  },
  {
    title: "Interview scorecard",
    description: "One star input per skill, each named by its skill and followed by the word its value stands for. Tab moves between skills and the arrow keys change the stars; submitting with a skill unrated marks it and moves focus to its first star.",
    render: () => <InterviewScorecard />,
    code: exampleCode(interviewScorecardRaw),
  },
  {
    title: "Rate your order",
    description: "On a phone the stars are XLarge and the question is also the group's name. Three stars or fewer asks what went wrong, both answers optional; Send without a star says so under the stars, and Back to the Orders list keeps the answers as a draft.",
    render: () => <PlatformPhoneApp label="Orders" app={RateYourOrder} />,
    code: exampleCode(rateYourOrderRaw),
  },
  {
    title: "Team pulse",
    description: "An OpinionScale asks how something felt, not how good it was, and three faces are enough for a weekly pulse. Send appears once there is an answer; the unhappy face adds an optional question about what would help.",
    render: () => <TeamPulse />,
    code: exampleCode(teamPulseRaw),
  },
  {
    title: "NPS survey",
    description: "The 0–10 scale names both ends in words. The follow-up question changes with the score: what to fix for a low one, what would make it a 10 for a middle one, what works for a high one.",
    render: () => <NpsSurvey />,
    code: exampleCode(npsSurveyRaw),
  },
  {
    title: "Ratings in a list",
    description: "In a row the RatingDisplay sits in the caption, XSmall, with the average and the number of reviews beside it. Someone without reviews says so in words, never as five empty stars. The Sort chip reorders the list, and a row click adds the person to a shortlist.",
    render: () => <FreelancerList />,
    code: exampleCode(freelancerListRaw),
  },
]);

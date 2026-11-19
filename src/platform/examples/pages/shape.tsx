/* Shapes as a Zen Studio designer draws them with R, O, L, ⇧L, Polygon, Star, the Pen and the Pencil: decoration and marks in a free frame
   (a Box with a size: each Shape at its X / Y, px insets), coloured with tokens only. Data stays in the components that
   carry values (charts, progress, rating).
   Each example is its own file in shape/ (P2b, plan docs/research/code-languages-plan-2026-10-03.md §11): the card
   renders its default export and shows its text as the snippet. */
import { PlatformPhoneApp } from "../../PlatformPhone";
import type { PlatformPage } from "../../PlatformExamples";
import { keepOnHotUpdate } from "../../hotData";
import { exampleCode } from "../exampleCode";
import type { ExampleDef } from "../types";
import WelcomeCard from "./shape/welcome-card-art.example";
import welcomeCard from "./shape/welcome-card-art.example.tsx?raw";
import SplashMark from "./shape/a-splash-mark-from-arcs.example";
import splashMark from "./shape/a-splash-mark-from-arcs.example.tsx?raw";
import RoomBookingPlan from "./shape/room-booking-plan.example";
import roomBookingPlan from "./shape/room-booking-plan.example.tsx?raw";
import TourTip from "./shape/arrow-callout-in-a-product-tour.example";
import tourTip from "./shape/arrow-callout-in-a-product-tour.example.tsx?raw";
import PromoStar from "./shape/promo-star-on-a-menu-item.example";
import promoStar from "./shape/promo-star-on-a-menu-item.example.tsx?raw";
import HandDrawnUnderline from "./shape/hand-drawn-underline-pencil.example";
import handDrawnUnderline from "./shape/hand-drawn-underline-pencil.example.tsx?raw";
import TicketStub from "./shape/a-ticket-stub-subtract.example";
import ticketStub from "./shape/a-ticket-stub-subtract.example.tsx?raw";
import PenLogoMark from "./shape/a-logo-mark-drawn-with-the-pen.example";
import penLogoMark from "./shape/a-logo-mark-drawn-with-the-pen.example.tsx?raw";
import TripPhotoInStar from "./shape/a-trip-photo-in-a-star-use-as-mask.example";
import tripPhotoInStar from "./shape/a-trip-photo-in-a-star-use-as-mask.example.tsx?raw";
import SeatPicker from "./shape/a-seat-map-with-labelled-marks.example";
import seatPicker from "./shape/a-seat-map-with-labelled-marks.example.tsx?raw";
import ShapeLimits from "./shape/arc-and-star-at-the-edge-of-their-range.example";
import shapeLimits from "./shape/arc-and-star-at-the-edge-of-their-range.example.tsx?raw";
import OnboardingPhone from "./shape/onboarding-art-on-a-phone.example";
import onboardingPhone from "./shape/onboarding-art-on-a-phone.example.tsx?raw";

export const page: PlatformPage = "shape";

export const examples: ExampleDef[] = keepOnHotUpdate(import.meta.hot, "examples", [
  {
    title: "Welcome card art",
    description: "Decoration drawn in a free frame beside the copy: a ring, a half pie and a star at their X / Y, in Accent and Support colours. They are decorative, so they carry no label.",
    code: exampleCode(welcomeCard),
    render: () => <WelcomeCard />,
  },
  {
    title: "A splash mark from arcs",
    description: "Two ring segments (an ellipse arc each: Start, Sweep, Ratio) turned around a full circle make the Phin & Co loyalty app's splash mark. Drag the arc handles in Zen Studio to shape them.",
    code: exampleCode(splashMark),
    render: () => <SplashMark />,
  },
  {
    title: "Room booking plan",
    description: "The Hanoi studio's rooms as rectangles at their place on the plan, filled by status (Positive free, Negative booked); each room is labelled for assistive tech and named on the plan.",
    code: exampleCode(roomBookingPlan),
    render: () => <RoomBookingPlan />,
  },
  {
    title: "Arrow callout in a product tour",
    description: "An Arrow (⇧L) drawn from the tip text to the button it explains; its angle is its rotation and its length its width, as Figma stores a line.",
    code: exampleCode(tourTip),
    render: () => <TourTip />,
  },
  {
    title: "Promo star on a menu item",
    description: "A Star behind the discount on the Phin & Co menu: decoration on a Subtle fill under Strongest text, so the price stays readable and the star carries no meaning on its own.",
    code: exampleCode(promoStar),
    render: () => <PromoStar />,
  },
  {
    title: "Hand-drawn underline (Pencil)",
    description: "A Pencil (⇧P) stroke under a headline: a vector whose path is drawn in its own box (viewBox) and stretched to its width, stroked with a token and no fill, as Figma's Pencil draws it.",
    code: exampleCode(handDrawnUnderline),
    render: () => <HandDrawnUnderline />,
  },
  {
    title: "A ticket stub (Subtract)",
    description: "A boolean group (⌥⇧S): a rounded rectangle minus two circles at its edges. The shapes stay editable inside it; Zen Studio writes their combined outline as its d, which the page draws. The text sits beside it in the frame.",
    code: exampleCode(ticketStub),
    render: () => <TicketStub />,
  },
  {
    title: "A logo mark drawn with the Pen",
    description: "A closed Pen path with a hole (fillRule evenodd): a filled vector at its X / Y in a free frame, beside the studio's name.",
    code: exampleCode(penLogoMark),
    render: () => <PenLogoMark />,
  },
  {
    title: "A trip photo in a star (Use as mask)",
    description: "A mask group (⌃⌘M): the Star is the mask and the photo above it shows only inside the star; the star itself draws nothing. The price sits beside it in the frame.",
    code: exampleCode(tripPhotoInStar),
    render: () => <TripPhotoInStar />,
  },
  {
    title: "A seat map with labelled marks",
    description: "Each seat is a Shape with a label (role img: \"Seat 1, your seat\"), so a screen reader hears the map; the number on it is hidden as a duplicate. Seats are picked with Segmented buttons (Tab, then Enter or Space); taken seats are disabled there and drawn as outlines, so the state shows in form and words, not colour alone. The status line announces the choice.",
    code: exampleCode(seatPicker),
    render: () => <SeatPicker />,
  },
  {
    title: "Arc and star at the edge of their range",
    description: "What the handles draw at their limits, each in its 72 × 72 box (outlined): Sweep 0 % draws nothing but keeps its box, so the layout holds; Ratio 96 % leaves a hairline ring; a 16-tip Star at Ratio 10 % is a thin burst, and at Ratio 0 % its fill has no area left, so only a centred stroke shows the spikes.",
    code: exampleCode(shapeLimits),
    render: () => <ShapeLimits />,
  },
  {
    title: "Onboarding art on a phone",
    description: "Three onboarding screens of the Phin & Co app, each with its own art drawn as shapes in a 240 × 200 free frame (Accent leads, a Support colour beside it). Tap Next or Skip in the footer, Back in the bar; Start collecting welcomes you and starts over. The art is decorative, so the words carry the screen.",
    code: exampleCode(onboardingPhone),
    render: () => <PlatformPhoneApp label="Phin & Co onboarding" app={OnboardingPhone} />,
  },
]);
